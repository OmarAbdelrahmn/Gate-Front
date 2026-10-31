// src/lib/jahez/api.ts
// Comprehensive Jahez V2 Client API implementation

import { authFetch, authDownload, type CustomRequestInit } from "../auth/api";
import { readAuth } from "../auth/token-store";
import { Fund } from "./constants";
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
  FeeRefundDayUsage,
  FeeRefundPreviewRequest,
  FeeRefundPreviewResponse,
  FeeRefundExecutionRequest,
  AccountFeeRefund,
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
  OperationCommissionStartUpdate,
  Page,
  Preview,
  RequestCreate,
  Statistics,
  TransferredDebt,
  RiderTransferredDebtSummary,
  RiderDebtRepaymentRequest,
  RiderDebtRepaymentResponse,
  RiderPartialDebtRepaymentRequest,
  RiderPartialDebtRepaymentResponse,
  RiderDebtCommissionUpdate,
  CashboxHandover,
  CashboxHandoverCreate,
  CashboxHandoverConfirm,
  CashboxHandoverCancel,
  OperationNetUpdate,
  JahezProfitReport,
  JahezProfitReportParams,
  JahezRiderPerformanceParams,
  JahezRiderPerformanceResponse,
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
  const timeoutMs = 4000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("مهلة استرجاع بيانات التصفية انتهت")), timeoutMs),
  );

  const fetchPromise = (async () => {
    // Strategy 1: If accountId hint is provided, query account details directly
    if (hints?.accountId) {
      try {
        const details = await getJahezAccountDetails(hints.accountId, 1, 50, {
          ...init,
          suppressErrorToast: true,
        });
        const match = details?.operations?.items?.find((o) => o.id === operationId);
        if (match) return match;
      } catch {
        // Continue to next strategy
      }
    }

    // Strategy 2: Look in the global operations list (page 1)
    try {
      const page1 = await getJahezOperations(1, 50, { ...init, suppressErrorToast: true });
      const match = page1?.items?.find((o) => o.id === operationId);
      if (match) return match;
    } catch {
      // Continue to next strategy
    }

    // Strategy 3: Check matching account only if handoverId or riderProfileId is provided
    if (hints?.handoverId || hints?.riderProfileId) {
      try {
        const accs = await getJahezAccounts(1, 30, { ...init, suppressErrorToast: true });
        const matchingAccs = (accs?.items || [])
          .filter(
            (a) =>
              (hints?.handoverId && a.currentHandoverId === hints.handoverId) ||
              (hints?.riderProfileId &&
                (a.actualRider?.riderProfileId === hints.riderProfileId ||
                  a.owner?.riderProfileId === hints.riderProfileId)),
          )
          .slice(0, 2);

        for (const acc of matchingAccs) {
          try {
            const details = await getJahezAccountDetails(acc.accountId, 1, 30, {
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
    }

    throw new Error("لم يتم العثور على بيانات التصفية في العمليات أو الحسابات المسجلة.");
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
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

export async function updateJahezCommissionStart(
  operationId: string,
  data: OperationCommissionStartUpdate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Operation> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("comm-start");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Operation>(
    `${ROOT}/operations/${encodeURIComponent(operationId)}/commission-start`,
    {
      ...init,
      method: "PUT",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم تصحيح بداية احتساب عمولة التصفية بنجاح",
    },
  );
}

export const updateCommissionStart = updateJahezCommissionStart;

export async function updateJahezOperationNet(
  operationId: string,
  data: OperationNetUpdate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<Operation> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("op-net");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<Operation>(
    `${ROOT}/operations/${encodeURIComponent(operationId)}/net`,
    {
      ...init,
      method: "PUT",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم تعديل صافي المبلغ للتصفية بنجاح",
    },
  );
}

export const updateOperationNet = updateJahezOperationNet;

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

/**
 * Fetch all Jahez money movements across all pages.
 */
export async function getAllJahezMoneyMovements(
  params?: MoneyMovementsFilterParams,
  init?: CustomRequestInit,
): Promise<MoneyMovementsResponse> {
  const pageSize = 100;
  let page = 1;
  const allItems: MoneyMovement[] = [];
  const seenIds = new Set<string>();

  while (true) {
    const res = await getJahezMoneyMovements(page, pageSize, params, init);
    const items = res?.items || [];
    if (items.length === 0) break;

    for (const item of items) {
      if (item.id) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
        }
      } else {
        allItems.push(item);
      }
    }

    if (typeof (res as any)?.totalCount === "number" && allItems.length >= (res as any).totalCount) {
      break;
    }

    if (items.length < pageSize) {
      break;
    }

    page++;
    if (page > 100) break;
  }

  return {
    items: allItems,
    page: 1,
    pageSize: allItems.length,
  };
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

/**
 * Preview fee refund calculations, commissions, and 7-day deadline.
 * Route: POST /api/jahez/v2/fees/refunds/preview
 * Requires: jahez.requests.fee.approve
 */
export async function previewJahezFeeRefund(
  data: FeeRefundPreviewRequest,
  init?: CustomRequestInit,
): Promise<FeeRefundPreviewResponse> {
  return authFetch<FeeRefundPreviewResponse>(`${ROOT}/fees/refunds/preview`, {
    ...init,
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Execute immutable fee refund and completed withdrawal for the active session.
 * Route: POST /api/jahez/v2/fees/refunds
 * Requires: jahez.requests.fee.approve, jahez.withdraw, jahez.money.disburse (and jahez.requests.commission.approve if waiving)
 */
export async function executeJahezFeeRefund(
  data: FeeRefundExecutionRequest,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<AccountFeeRefund> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("fee-refund");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<AccountFeeRefund>(`${ROOT}/fees/refunds`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم استرداد رسوم فتح الحساب وسحب الحساب بنجاح",
  });
}

/**
 * Get fee refund history for a session (handover) - returns 0 or 1 item.
 * Route: GET /api/jahez/v2/handovers/{handoverId}/fee-refunds
 * Requires: jahez.read
 */
export async function getJahezHandoverFeeRefunds(
  handoverId: string,
  init?: CustomRequestInit,
): Promise<AccountFeeRefund[]> {
  return authFetch<AccountFeeRefund[]>(
    `${ROOT}/handovers/${encodeURIComponent(handoverId)}/fee-refunds`,
    {
      ...init,
      method: "GET",
    },
  );
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

export async function getAllJahezCashboxHandovers(
  init?: CustomRequestInit,
): Promise<Page<CashboxHandover>> {
  const pageSize = 100;
  let page = 1;
  const allItems: CashboxHandover[] = [];
  const seenIds = new Set<string>();

  while (true) {
    const res = await getJahezCashboxHandovers(page, pageSize, init);
    const items = res?.items || [];
    if (items.length === 0) break;

    for (const item of items) {
      if (item.id) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
        }
      } else {
        allItems.push(item);
      }
    }

    if (typeof res?.totalCount === "number" && allItems.length >= res.totalCount) {
      break;
    }

    if (items.length < pageSize) {
      break;
    }

    page++;
    if (page > 50) break;
  }

  return {
    items: allItems,
    page: 1,
    pageSize: allItems.length,
    totalCount: allItems.length,
  };
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

export async function getAllJahezTransferredDebts(
  init?: CustomRequestInit,
): Promise<Page<TransferredDebt>> {
  const pageSize = 100;
  let page = 1;
  const allItems: TransferredDebt[] = [];
  const seenIds = new Set<string>();

  while (true) {
    const res = await getJahezTransferredDebts(page, pageSize, init);
    const items = res?.items || [];
    if (items.length === 0) break;

    for (const item of items) {
      if (item.id) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
        }
      } else {
        allItems.push(item);
      }
    }

    if (typeof res?.totalCount === "number" && allItems.length >= res.totalCount) {
      break;
    }

    if (items.length < pageSize) {
      break;
    }

    page++;
    if (page > 50) break;
  }

  return {
    items: allItems,
    page: 1,
    pageSize: allItems.length,
    totalCount: allItems.length,
  };
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

/**
 * GET /riders/transferred-debts?page=1&pageSize=50
 * Actionable list: one row per rider with unpaid transferred debt
 */
export async function getJahezRidersWithTransferredDebts(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<RiderTransferredDebtSummary>> {
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  return authFetch<Page<RiderTransferredDebtSummary>>(
    `${ROOT}/riders/transferred-debts?${pageQuery(page, safePageSize)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function getAllJahezRidersWithTransferredDebts(
  init?: CustomRequestInit,
): Promise<Page<RiderTransferredDebtSummary>> {
  const pageSize = 100;
  let page = 1;
  const allItems: RiderTransferredDebtSummary[] = [];
  const seenIds = new Set<string>();

  while (true) {
    const res = await getJahezRidersWithTransferredDebts(page, pageSize, init);
    const items = res?.items || [];
    if (items.length === 0) break;

    for (const item of items) {
      if (!seenIds.has(item.riderProfileId)) {
        seenIds.add(item.riderProfileId);
        allItems.push(item);
      }
    }

    if (typeof res?.totalCount === "number" && allItems.length >= res.totalCount) {
      break;
    }

    if (items.length < pageSize) {
      break;
    }

    page++;
    if (page > 50) break;
  }

  return {
    items: allItems,
    page: 1,
    pageSize: allItems.length,
    totalCount: allItems.length,
  };
}

/**
 * Resolve one rider's authoritative summary row from
 * GET /riders/transferred-debts (no dedicated per-rider summary endpoint exists).
 * Walks pages until the rider is found or a short page ends navigation.
 * Returns null when the rider has no unpaid transferred debt.
 */
export async function getJahezRiderTransferredDebtsSummary(
  riderId: string,
  init?: CustomRequestInit,
): Promise<RiderTransferredDebtSummary | null> {
  const pageSize = 100;
  for (let page = 1; page <= 100000; page++) {
    const res = await getJahezRidersWithTransferredDebts(page, pageSize, init);
    const items = res?.items || [];
    const hit = items.find((s) => s.riderProfileId === riderId);
    if (hit) return hit;
    if (items.length < pageSize) break;
  }
  return null;
}

/**
 * GET /riders/{riderId}/transferred-debts?page=1&pageSize=50
 * That rider's unpaid debts (TransferredDebtRow)
 */
export async function getJahezRiderTransferredDebts(
  riderId: string,
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<TransferredDebt>> {
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  return authFetch<Page<TransferredDebt>>(
    `${ROOT}/riders/${encodeURIComponent(riderId)}/transferred-debts?${pageQuery(page, safePageSize)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

/**
 * POST /riders/{riderId}/transferred-debts/repayment
 * Repay all unpaid transferred debts of that rider in full
 */
export async function repayJahezRiderTransferredDebts(
  riderId: string,
  data: RiderDebtRepaymentRequest,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<RiderDebtRepaymentResponse> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("bulk-debt-repay");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<RiderDebtRepaymentResponse>(
    `${ROOT}/riders/${encodeURIComponent(riderId)}/transferred-debts/repayment`,
    {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم سداد جميع المديونيات المرحلة بقيمة المستحق بنجاح",
    },
  );
}

/**
 * POST /riders/{riderId}/transferred-debts/partial-repayment
 * Partially repay unpaid transferred debts of that rider
 */
export async function repayJahezRiderPartialTransferredDebt(
  riderId: string,
  data: RiderPartialDebtRepaymentRequest,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<RiderPartialDebtRepaymentResponse> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey("part-debt-repay");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  const payload = {
    amount: data.amount,
    expectedAmount: data.amount,
    paidAmount: data.amount,
    fund: data.fund ?? Fund.Cashbox,
    reference: data.reference,
    reason: data.reason,
  };

  return authFetch<RiderPartialDebtRepaymentResponse>(
    `${ROOT}/riders/${encodeURIComponent(riderId)}/transferred-debts/partial-repayment`,
    {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      notifySuccess: init?.notifySuccess ?? "تم تسجيل السداد الجزئي للمديونية بنجاح",
    },
  );
}

/**
 * PUT /riders/{riderId}/transferred-debts/commission
 * Update the commission amount for rider's transferred debts
 */
export async function updateJahezRiderTransferredDebtCommission(
  riderId: string,
  data: RiderDebtCommissionUpdate,
  idempotencyKey?: string | CustomRequestInit,
  init?: CustomRequestInit,
): Promise<unknown> {
  const actualInit = typeof idempotencyKey === "object" ? idempotencyKey : init;
  const actualKey =
    typeof idempotencyKey === "string" && idempotencyKey.trim()
      ? idempotencyKey.trim()
      : generateIdempotencyKey("edit-commission");

  const headers = new Headers(actualInit?.headers);
  headers.set("Idempotency-Key", actualKey);

  const payload = {
    commission: Number(data.commission),
    expectedCommission: data.expectedCommission,
    expectedAmounts: {
      dashboardDebt: data.expectedAmounts.dashboardDebt,
      commission: data.expectedAmounts.commission,
      total: data.expectedAmounts.total,
    },
    reason: data.reason.trim(),
  };

  return authFetch(
    `${ROOT}/riders/${encodeURIComponent(riderId)}/transferred-debts/commission`,
    {
      ...actualInit,
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
      notifySuccess: actualInit?.notifySuccess ?? "تم تحديث العمولة بنجاح",
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

/**
 * Fetch all Jahez administrative debts across all pages.
 */
export async function getAllJahezAdministrativeDebts(
  pageSize = 100,
  init?: CustomRequestInit,
): Promise<{ items: AdministrativeDebt[]; totalCount: number }> {
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  const firstPage = await getJahezAdministrativeDebts(1, safePageSize, init);
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
  const seenKeys = new Set(
    items.map((x) =>
      x.handoverId
        ? `${x.handoverId}_${x.accountId}_${x.riderProfileId}`
        : `${x.accountId}_${x.riderProfileId}_${x.externalAccountId}_${x.platformDebt}`,
    ),
  );

  // If totalCount is known and greater than items.length, parallel fetch remaining pages
  if (typeof serverTotalCount === "number" && serverTotalCount > safePageSize) {
    const totalPages = Math.min(Math.ceil(serverTotalCount / safePageSize), 50);
    const pagePromises: Promise<Page<AdministrativeDebt>>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(getJahezAdministrativeDebts(p, safePageSize, init));
    }

    const otherPages = await Promise.allSettled(pagePromises);
    for (const res of otherPages) {
      if (res.status === "fulfilled" && res.value?.items) {
        for (const item of res.value.items) {
          const key = item.handoverId
            ? `${item.handoverId}_${item.accountId}_${item.riderProfileId}`
            : `${item.accountId}_${item.riderProfileId}_${item.externalAccountId}_${item.platformDebt}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
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
      const pageRes = await getJahezAdministrativeDebts(currentPage, safePageSize, init);
      const pageItems = pageRes?.items || [];
      if (pageItems.length === 0) break;

      let newCount = 0;
      for (const item of pageItems) {
        const key = item.handoverId
          ? `${item.handoverId}_${item.accountId}_${item.riderProfileId}`
          : `${item.accountId}_${item.riderProfileId}_${item.externalAccountId}_${item.platformDebt}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
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

// ----------------------------------------------------------------------
// 8. Profit Report
// ----------------------------------------------------------------------

/**
 * Fetch Jahez profit report covering opening fees collected and settlement commission.
 * Route: GET /api/jahez/v2/reports/profit?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 * Requires: bearer token and jahez.financial-reports.read permission.
 */
export async function getJahezProfitReport(
  params?: JahezProfitReportParams,
  init?: CustomRequestInit,
): Promise<JahezProfitReport> {
  const query = new URLSearchParams();
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);
  const qs = query.toString();
  return authFetch<JahezProfitReport>(`${ROOT}/reports/profit${qs ? `?${qs}` : ""}`, {
    ...init,
    method: "GET",
  });
}

// ----------------------------------------------------------------------
// 9. Rider Performance by Date Range (GET /api/jahez/v2/reports/riders)
// ----------------------------------------------------------------------

/**
 * Fetch Jahez rider performance by date range.
 * Route: GET /api/jahez/v2/reports/riders?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD[&riderId=...][&accountId=...][&page=...][&pageSize=...]
 * Requires: jahez.read within Jahez client-platform scope.
 */
export async function getJahezRiderPerformance(
  params: JahezRiderPerformanceParams,
  init?: CustomRequestInit,
): Promise<JahezRiderPerformanceResponse> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.riderId) query.set("riderId", params.riderId);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return authFetch<JahezRiderPerformanceResponse>(`${ROOT}/reports/riders${qs ? `?${qs}` : ""}`, {
    ...init,
    method: "GET",
  });
}

/**
 * Fetch all Jahez rider performance records across all pages for a date range.
 * Automatically paginates through all records and merges them into one response.
 */
export async function getAllJahezRiderPerformance(
  params: JahezRiderPerformanceParams,
  init?: CustomRequestInit,
): Promise<JahezRiderPerformanceResponse> {
  const pageSize = 100;
  const firstPage = await getJahezRiderPerformance({ ...params, page: 1, pageSize }, init);
  const totalCount = firstPage.totalCount || firstPage.items.length;
  const items = [...firstPage.items];

  if (totalCount > pageSize) {
    const totalPages = Math.ceil(totalCount / pageSize);
    const promises: Promise<JahezRiderPerformanceResponse>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      promises.push(getJahezRiderPerformance({ ...params, page: p, pageSize }, init));
    }
    const results = await Promise.all(promises);
    for (const res of results) {
      if (res?.items) {
        items.push(...res.items);
      }
    }
  }

  return {
    ...firstPage,
    page: 1,
    pageSize: items.length,
    totalCount: items.length,
    items,
  };
}

/**
 * Jahez V2 client helper matching backend integration handoff contract.
 * Usage: jahezClient(...).profitReport({ fromDate, toDate })
 *        jahezClient(...).riderPerformance({ startDate, endDate, riderId, accountId, page, pageSize })
 *        jahezClient(...).allRiderPerformance({ startDate, endDate, riderId, accountId })
 */
export function jahezClient(init?: CustomRequestInit) {
  return {
    profitReport: (params?: JahezProfitReportParams) => getJahezProfitReport(params, init),
    riderPerformance: (params: JahezRiderPerformanceParams) =>
      getJahezRiderPerformance(params, init),
    allRiderPerformance: (params: JahezRiderPerformanceParams) =>
      getAllJahezRiderPerformance(params, init),
    updateNet: (
      operationId: string,
      data: OperationNetUpdate,
      key?: string,
    ) => updateJahezOperationNet(operationId, data, key, init),
    repayTransferredDebt: (
      riderId: string,
      data: RiderDebtRepaymentRequest,
      key?: string,
    ) => repayJahezRiderTransferredDebts(riderId, data, key, init),
    partialRepayTransferredDebt: (
      riderId: string,
      data: RiderPartialDebtRepaymentRequest,
      key?: string,
    ) => repayJahezRiderPartialTransferredDebt(riderId, data, key, init),
    updateTransferredDebtCommission: (
      riderId: string,
      data: RiderDebtCommissionUpdate,
      key?: string,
    ) => updateJahezRiderTransferredDebtCommission(riderId, data, key, init),
    previewFeeRefund: (data: FeeRefundPreviewRequest) =>
      previewJahezFeeRefund(data, init),
    executeFeeRefund: (data: FeeRefundExecutionRequest, key?: string) =>
      executeJahezFeeRefund(data, key, init),
    getHandoverFeeRefunds: (handoverId: string) =>
      getJahezHandoverFeeRefunds(handoverId, init),
  };
}

