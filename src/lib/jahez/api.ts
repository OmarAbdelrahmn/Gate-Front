// src/lib/jahez/api.ts
// Comprehensive Jahez V2 Client API implementation

import { authFetch, authDownload, type CustomRequestInit } from "../auth/api";
import { readAuth } from "../auth/token-store";
import type {
  Account,
  AccountDetails,
  AccountsPage,
  AccountStatusUpdate,
  AdministrativeDebt,
  Approval,
  ApprovalRequest,
  DecisionRequest,
  EarningsRequest,
  EarningsStatement,
  FeeReceipt,
  FundBalance,
  Handover,
  HandoverCreate,
  ImportBatch,
  ImportCommit,
  ImportKind,
  ImportPreview,
  MoneyRecord,
  Movement,
  MoneyMovement,
  MoneyMovementsResponse,
  Operation,
  OperationCreate,
  OperationUpdate,
  OperationPaymentMethodUpdate,
  Page,
  Preview,
  RequestCreate,
  Statistics,
  TransferredDebt,
  CashboxHandover,
  CashboxHandoverCreate,
  CashboxHandoverConfirm,
  CashboxHandoverCancel,
} from "./types";

export * from "./constants";
export * from "./types";

/**
 * Generate a unique idempotency key for safe mutating requests.
 */
export function generateIdempotencyKey(prefix = "jhz2"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`.slice(0, 150);
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.slice(0, 150);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Riyadh time.
 */
export function getRiyadhTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Returns current timestamp formatted as ISO string with Asia/Riyadh offset (+03:00).
 */
export function getRiyadhNowIso(): string {
  const d = new Date();
  const riyadhOffsetMs = 3 * 60 * 60 * 1000;
  const riyadhDate = new Date(d.getTime() + riyadhOffsetMs);
  const iso = riyadhDate.toISOString().replace("Z", "+03:00");
  return iso;
}

const ROOT = "/api/jahez/v2";

function pageQuery(page: number, pageSize: number): string {
  return `page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`;
}

// ----------------------------------------------------------------------
// 1. Accounts & Details & Statistics
// ----------------------------------------------------------------------

export async function getJahezAccounts(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<AccountsPage> {
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  return authFetch<AccountsPage>(`${ROOT}/accounts?${pageQuery(page, safePageSize)}`, {
    ...init,
    method: "GET",
  });
}

/**
 * Fetch all Jahez accounts across all pages.
 */
export async function getAllJahezAccounts(
  pageSize = 100,
  init?: CustomRequestInit,
): Promise<{ items: Account[]; totalCount: number }> {
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  const firstPage = await getJahezAccounts(1, safePageSize, init);
  const items = firstPage?.items || [];
  const serverTotalCount = firstPage?.totalCount;

  // If there are no items or fewer items than safePageSize, all items are here
  if (items.length === 0 || items.length < safePageSize) {
    return { items, totalCount: serverTotalCount ?? items.length };
  }

  // If totalCount is reported and already covered
  if (typeof serverTotalCount === "number" && items.length >= serverTotalCount) {
    return { items, totalCount: serverTotalCount };
  }

  const all = [...items];
  const seenIds = new Set(items.map((x) => x.accountId));

  // If totalCount is known and greater than items.length, parallel fetch remaining pages
  if (typeof serverTotalCount === "number" && serverTotalCount > safePageSize) {
    const totalPages = Math.min(Math.ceil(serverTotalCount / safePageSize), 50);
    const pagePromises: Promise<AccountsPage>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(getJahezAccounts(p, safePageSize, init));
    }

    const otherPages = await Promise.allSettled(pagePromises);
    for (const res of otherPages) {
      if (res.status === "fulfilled" && res.value?.items) {
        for (const item of res.value.items) {
          if (!seenIds.has(item.accountId)) {
            seenIds.add(item.accountId);
            all.push(item);
          }
        }
      }
    }
    return { items: all, totalCount: serverTotalCount || all.length };
  }

  // Fallback sequential paging if totalCount wasn't provided or was ambiguous
  let currentPage = 2;
  const maxPages = 50;
  while (currentPage <= maxPages) {
    try {
      const pageRes = await getJahezAccounts(currentPage, safePageSize, init);
      const pageItems = pageRes?.items || [];
      if (pageItems.length === 0) break;

      let newCount = 0;
      for (const item of pageItems) {
        if (!seenIds.has(item.accountId)) {
          seenIds.add(item.accountId);
          all.push(item);
          newCount++;
        }
      }

      if (newCount === 0 || pageItems.length < safePageSize) break;
      currentPage++;
    } catch {
      break;
    }
  }

  return { items: all, totalCount: all.length };
}

export async function getJahezAccountDetails(
  accountId: string,
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<AccountDetails> {
  return authFetch<AccountDetails>(
    `${ROOT}/accounts/${encodeURIComponent(accountId)}?${pageQuery(page, pageSize)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function getJahezStatistics(init?: CustomRequestInit): Promise<Statistics> {
  return authFetch<Statistics>(`${ROOT}/statistics`, {
    ...init,
    method: "GET",
  });
}

export async function updateJahezAccountStatus(
  accountId: string,
  data: AccountStatusUpdate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Account> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("acc-status");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Account>(`${ROOT}/accounts/${encodeURIComponent(accountId)}/status`, {
    ...init,
    method: "PUT",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تحديث حالة الحساب بنجاح",
  });
}

// ----------------------------------------------------------------------
// 2. Handovers
// ----------------------------------------------------------------------

export async function createJahezHandover(
  data: HandoverCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Handover> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("handover");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Handover>(`${ROOT}/handovers`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تسليم الحساب للمندوب بنجاح",
  });
}

// ----------------------------------------------------------------------
// 3. Operations (Preview, Draft, Update, Execute, List)
// ----------------------------------------------------------------------

export async function previewJahezOperation(
  data: OperationCreate,
  init?: CustomRequestInit,
): Promise<Preview> {
  return authFetch<Preview>(`${ROOT}/operations/preview`, {
    ...init,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createJahezOperation(
  data: OperationCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Operation> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("op-create");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Operation>(`${ROOT}/operations`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم حفظ مسودة العملية بنجاح",
  });
}

export async function updateJahezOperation(
  operationId: string,
  data: OperationUpdate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Operation> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("op-update");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Operation>(`${ROOT}/operations/${encodeURIComponent(operationId)}`, {
    ...init,
    method: "PUT",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تحديث مسودة العملية وإعادة الحساب بنجاح",
  });
}

export async function executeJahezOperation(
  operationId: string,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Operation> {
  const key = idempotencyKey?.trim() || `op-exec-${operationId}`;
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Operation>(`${ROOT}/operations/${encodeURIComponent(operationId)}/execute`, {
    ...init,
    method: "POST",
    headers,
    notifySuccess: init?.notifySuccess ?? "تم تنفيذ العملية المالية بنجاح",
  });
}

export async function getJahezOperations(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<Operation>> {
  return authFetch<Page<Operation>>(`${ROOT}/operations?${pageQuery(page, pageSize)}`, {
    ...init,
    method: "GET",
  });
}

export interface GetOperationHints {
  accountId?: string | null;
  handoverId?: string | null;
  riderProfileId?: string | null;
}

export async function getJahezOperation(
  operationId: string,
  hints?: GetOperationHints,
  init?: CustomRequestInit,
): Promise<Operation> {
  // Strategy 1: If accountId hint is provided, query account details directly
  if (hints?.accountId) {
    try {
      const details = await getJahezAccountDetails(hints.accountId, 1, 100, {
        ...init,
        suppressErrorToast: true,
      });
      const match = details?.operations?.items?.find((o) => o.id === operationId);
      if (match) return match;
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 2: Look in the global operations list (page 1 to 5)
  try {
    const page1 = await getJahezOperations(1, 100, { ...init, suppressErrorToast: true });
    const match = page1?.items?.find((o) => o.id === operationId);
    if (match) return match;

    if (page1?.items && page1.items.length >= 100) {
      for (let p = 2; p <= 5; p++) {
        const next = await getJahezOperations(p, 100, { ...init, suppressErrorToast: true });
        const found = next?.items?.find((o) => o.id === operationId);
        if (found) return found;
        if (!next?.items || next.items.length < 100) break;
      }
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Find account by handoverId or riderProfileId and check its operations
  try {
    const accs = await getJahezAccounts(1, 100, { ...init, suppressErrorToast: true });
    const items = accs?.items || [];

    // Prioritize accounts matching handoverId or riderProfileId
    const sorted = [...items].sort((a, b) => {
      const aMatch =
        (hints?.handoverId && a.currentHandoverId === hints.handoverId) ||
        (hints?.riderProfileId &&
          (a.actualRider?.riderProfileId === hints.riderProfileId ||
            a.owner?.riderProfileId === hints.riderProfileId));
      const bMatch =
        (hints?.handoverId && b.currentHandoverId === hints.handoverId) ||
        (hints?.riderProfileId &&
          (b.actualRider?.riderProfileId === hints.riderProfileId ||
            b.owner?.riderProfileId === hints.riderProfileId));
      return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
    });

    for (const acc of sorted) {
      try {
        const details = await getJahezAccountDetails(acc.accountId, 1, 100, {
          ...init,
          suppressErrorToast: true,
        });
        const match = details?.operations?.items?.find((o) => o.id === operationId);
        if (match) return match;
      } catch {
        continue;
      }
    }
  } catch {
    // Continue
  }

  throw new Error("لم يتم العثور على بيانات التصفية في العمليات أو الحسابات المسجلة.");
}

export async function updateJahezOperationPaymentMethod(
  operationId: string,
  data: OperationPaymentMethodUpdate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Operation> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("op-pay-method");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Operation>(
    `${ROOT}/operations/${encodeURIComponent(operationId)}/payment-method`,
    {
      ...init,
      method: "PUT",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم تحديث طريقة دفع التصفية بنجاح",
    },
  );
}

// ----------------------------------------------------------------------
// 4. Approval Requests & Decisions
// ----------------------------------------------------------------------

export async function getJahezRequests(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<ApprovalRequest>> {
  return authFetch<Page<ApprovalRequest>>(`${ROOT}/requests?${pageQuery(page, pageSize)}`, {
    ...init,
    method: "GET",
  });
}

export async function getJahezRequestDetails(
  requestId: string,
  init?: CustomRequestInit,
): Promise<Approval> {
  return authFetch<Approval>(`${ROOT}/requests/${encodeURIComponent(requestId)}`, {
    ...init,
    method: "GET",
  });
}

export async function createJahezRequest(
  data: RequestCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Approval> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("req-create");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Approval>(`${ROOT}/requests`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تقديم طلب الاعتماد بنجاح",
  });
}

export async function decideJahezRequest(
  requestId: string,
  data: DecisionRequest,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Approval> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("req-decide");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Approval>(`${ROOT}/requests/${encodeURIComponent(requestId)}/decision`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تسجيل قرار الطلب بنجاح",
  });
}

// ----------------------------------------------------------------------
// 5. Money, Funds & Fees & Transferred Debts
// ----------------------------------------------------------------------

export async function getJahezFunds(init?: CustomRequestInit): Promise<FundBalance[]> {
  return authFetch<FundBalance[]>(`${ROOT}/funds`, {
    ...init,
    method: "GET",
  });
}

export interface MoneyMovementsFilterParams {
  fromDate?: string;
  toDate?: string;
  sponsorId?: string;
  sponsorNameAr?: string;
}

export async function getJahezMoneyMovements(
  page = 1,
  pageSize = 50,
  params?: MoneyMovementsFilterParams,
  init?: CustomRequestInit,
): Promise<MoneyMovementsResponse> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  if (params?.sponsorId) query.set("sponsorId", params.sponsorId);
  if (params?.sponsorNameAr) query.set("sponsorNameAr", params.sponsorNameAr);

  return authFetch<MoneyMovementsResponse>(`${ROOT}/money-movements?${query.toString()}`, {
    ...init,
    method: "GET",
  });
}

export async function recordJahezFeeReceipt(
  data: FeeReceipt,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Movement> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("fee-receipt");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Movement>(`${ROOT}/fees/receipts`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تسجيل قبض رسوم فتح الحساب بنجاح",
  });
}

// ----------------------------------------------------------------------
// 8. Cashbox Accountant Handovers
// ----------------------------------------------------------------------

export async function getJahezCashboxHandovers(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<CashboxHandover>> {
  return authFetch<Page<CashboxHandover>>(
    `${ROOT}/cashbox/handovers?${pageQuery(page, pageSize)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function getJahezCashboxHandover(
  id: string,
  init?: CustomRequestInit,
): Promise<CashboxHandover> {
  return authFetch<CashboxHandover>(`${ROOT}/cashbox/handovers/${encodeURIComponent(id)}`, {
    ...init,
    method: "GET",
  });
}

export async function submitJahezCashboxHandover(
  data: CashboxHandoverCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<CashboxHandover> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("cashbox-handover-submit");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<CashboxHandover>(`${ROOT}/cashbox/handovers`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تسليم الأموال للمحاسب بنجاح (قيد التأكيد)",
  });
}

export async function confirmJahezCashboxHandover(
  id: string,
  data: CashboxHandoverConfirm,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<CashboxHandover> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("cashbox-handover-confirm");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<CashboxHandover>(
    `${ROOT}/cashbox/handovers/${encodeURIComponent(id)}/confirm`,
    {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم تأكيد ومطابقة استلام الأموال بنجاح",
    },
  );
}

export async function cancelJahezCashboxHandover(
  id: string,
  data: CashboxHandoverCancel,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<CashboxHandover> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("cashbox-handover-cancel");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<CashboxHandover>(
    `${ROOT}/cashbox/handovers/${encodeURIComponent(id)}/cancel`,
    {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم إلغاء تسليم الأموال بنجاح",
    },
  );
}

export async function getJahezTransferredDebts(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<TransferredDebt>> {
  return authFetch<Page<TransferredDebt>>(`${ROOT}/transferred-debts?${pageQuery(page, pageSize)}`, {
    ...init,
    method: "GET",
  });
}

export async function repayJahezTransferredDebt(
  debtId: string,
  data: MoneyRecord,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TransferredDebt> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("debt-repay");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TransferredDebt>(
    `${ROOT}/transferred-debts/${encodeURIComponent(debtId)}/repayment`,
    {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم سداد كامل المستحق بنجاح",
    },
  );
}

// ----------------------------------------------------------------------
// 6. Administrative Debts & Earnings Statement
// ----------------------------------------------------------------------

export async function getJahezAdministrativeDebts(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<AdministrativeDebt>> {
  return authFetch<Page<AdministrativeDebt>>(
    `${ROOT}/administrative-debts?${pageQuery(page, pageSize)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function recordJahezEarnings(
  data: EarningsRequest,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<EarningsStatement> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("earnings");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<EarningsStatement>(`${ROOT}/earnings`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تسجيل بيان الأرباح بنجاح",
  });
}

// ----------------------------------------------------------------------
// 7. Imports
// ----------------------------------------------------------------------

export async function getJahezImports(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<ImportBatch>> {
  return authFetch<Page<ImportBatch>>(`${ROOT}/imports?${pageQuery(page, pageSize)}`, {
    ...init,
    method: "GET",
  });
}

export async function getJahezImportPreview(
  batchId: string,
  init?: CustomRequestInit,
): Promise<ImportPreview> {
  return authFetch<ImportPreview>(`${ROOT}/imports/${encodeURIComponent(batchId)}`, {
    ...init,
    method: "GET",
  });
}

export async function commitJahezImport(
  batchId: string,
  data: ImportCommit,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<ImportPreview> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("import-commit");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<ImportPreview>(`${ROOT}/imports/${encodeURIComponent(batchId)}/commit`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم اعتماد بيانات الاستيراد بنجاح",
  });
}

export async function uploadJahezImport(
  kind: ImportKind,
  files: File[],
  replacesBatchId?: string,
  correctionReason?: string,
  idempotencyKey?: string,
): Promise<ImportPreview> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("import-upload");
  const form = new FormData();
  form.append("kind", String(kind));
  files.forEach((file) => form.append("files", file));
  if (replacesBatchId) form.append("replacesBatchId", replacesBatchId);
  if (correctionReason) form.append("correctionReason", correctionReason);

  const auth = readAuth();
  const token = auth?.accessToken ?? "";
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "https://gat.premiumasp.net").replace(
    /\/$/,
    "",
  );

  const response = await fetch(`${apiBase}${ROOT}/imports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": key,
    },
    body: form,
  });

  const payload = await response.json();
  if (!response.ok) {
    const errorMsg =
      payload?.detail || payload?.title || `فشل رفع الملفات (رمز ${response.status})`;
    throw new Error(errorMsg);
  }

  return payload as ImportPreview;
}

export async function downloadJahezImportFile(
  fileId: string,
): Promise<{ blob: Blob; fileName: string }> {
  return authDownload(`${ROOT}/import-files/${encodeURIComponent(fileId)}`);
}
