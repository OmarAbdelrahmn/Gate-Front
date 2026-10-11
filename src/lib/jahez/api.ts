// src/lib/jahez/api.ts
export * from "./constants";
import { authDownload, authFetch, type CustomRequestInit } from "../auth/api";
import { JahezDebtStatus } from "./constants";
import type {
  AccountantConfirmRequest,
  ApprovalCancelRequest,
  ApprovalCreateRequest,
  ApprovalDecisionRequest,
  CashboxCreateRequest,
  CashboxDecisionRequest,
  ClearAccountRequest,
  CloseJahezHandoverRequest,
  ConfirmPaidRequest,
  CreateJahezHandoverRequest,
  EarningsRequest,
  FreezeHandoverRequest,
  ImportCommitRequest,
  JahezApprovalRequest,
  JahezApprovalResponse,
  JahezBalance,
  JahezCashboxBalance,
  JahezCashboxEntry,
  JahezCashboxHandover,
  JahezCommissionPolicy,
  JahezDispatch,
  JahezEarnings,
  JahezFee,
  JahezHandover,
  JahezImportBatch,
  JahezImportPreview,
  JahezLedgerEntry,
  JahezPage,
  JahezRiderDebtSummary,
  JahezSettlement,
  LedgerAdjustmentRequest,
  LegacyAdoptionRequest,
  PaymentRequest,
  TransferDebtRequest,
} from "./types";

export function generateIdempotencyKey(prefix = "jhz"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`.slice(0, 150);
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.slice(0, 150);
}

function buildQuery(params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function jahezPostFetch<T>(
  path: string,
  body: unknown,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<T> {
  const key = idempotencyKey?.trim() || generateIdempotencyKey();
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  const isFormData = body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return authFetch<T>(path, {
    ...init,
    method: "POST",
    headers,
    body: isFormData ? (body as FormData) : JSON.stringify(body),
  });
}

// -------------------------------------------------------------
// 1. Handovers, Balances, & History
// -------------------------------------------------------------

export async function createJahezHandover(
  data: CreateJahezHandoverRequest,
  idempotencyKey?: string,
): Promise<JahezHandover> {
  return jahezPostFetch<JahezHandover>("/api/jahez/handovers", data, idempotencyKey, {
    notifySuccess: "تم تسليم الحساب للمندوب بنجاح",
  });
}

export async function createLegacyAdoption(
  data: LegacyAdoptionRequest,
  idempotencyKey?: string,
): Promise<JahezHandover> {
  return jahezPostFetch<JahezHandover>("/api/jahez/legacy-adoptions", data, idempotencyKey, {
    notifySuccess: "تم اعتماد الحساب السابق (Legacy) بنجاح",
  });
}

export async function closeJahezHandover(
  handoverId: string,
  data: CloseJahezHandoverRequest,
  idempotencyKey?: string,
): Promise<JahezHandover> {
  return jahezPostFetch<JahezHandover>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/close`,
    data,
    idempotencyKey,
    { notifySuccess: "تم إنهاء فترة استخدام الحساب بنجاح" },
  );
}

export async function freezeJahezHandover(
  handoverId: string,
  data: FreezeHandoverRequest,
  idempotencyKey?: string,
): Promise<JahezBalance> {
  return jahezPostFetch<JahezBalance>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/freeze`,
    data,
    idempotencyKey,
    { notifySuccess: "تم تجميد حساب جاهز وحجز العهدة بنجاح" },
  );
}

export async function transferJahezDebt(
  handoverId: string,
  data: TransferDebtRequest,
  idempotencyKey?: string,
): Promise<JahezHandover> {
  return jahezPostFetch<JahezHandover>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/transfer-debt`,
    data,
    idempotencyKey,
    { notifySuccess: "تم نقل المديونية للمندوب وتحرير الحساب بنجاح" },
  );
}

export async function clearJahezAccount(
  handoverId: string,
  data: ClearAccountRequest,
  idempotencyKey?: string,
): Promise<JahezHandover> {
  return jahezPostFetch<JahezHandover>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/clear-account`,
    data,
    idempotencyKey,
    { notifySuccess: "تم تأكيد تصفية الحساب مع جاهز وتحرير الحساب بنجاح" },
  );
}

export async function confirmJahezPaid(
  handoverId: string,
  data: ConfirmPaidRequest,
  idempotencyKey?: string,
): Promise<JahezBalance> {
  return jahezPostFetch<JahezBalance>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/confirm-paid`,
    data,
    idempotencyKey,
    { notifySuccess: "تم تأكيد اكتمال سداد المندوب بنجاح" },
  );
}

export async function getJahezHandovers(params?: {
  accountId?: string;
  riderId?: string;
  page?: number;
  pageSize?: number;
}): Promise<JahezPage<JahezHandover>> {
  const safeParams = {
    ...params,
    pageSize: params?.pageSize ? Math.min(Math.max(1, params.pageSize), 100) : undefined,
  };
  return authFetch<JahezPage<JahezHandover>>(`/api/jahez/handovers${buildQuery(safeParams)}`);
}

/**
 * Fetch all Jahez handovers across all pages.
 */
export async function getAllJahezHandovers(params?: {
  accountId?: string;
  riderId?: string;
}): Promise<JahezHandover[]> {
  const all: JahezHandover[] = [];
  let page = 1;
  const pageSize = 100;
  const maxPages = 50;

  while (page <= maxPages) {
    const res = await getJahezHandovers({ ...params, page, pageSize });
    const items = res?.items || [];
    if (items.length === 0) break;

    all.push(...items);

    if (typeof res?.totalCount === "number" && all.length >= res.totalCount) {
      break;
    }
    const actualPageSize = res?.pageSize || pageSize;
    if (items.length < actualPageSize) {
      break;
    }
    page++;
  }

  return all;
}

export async function getJahezHandoverBalance(
  handoverId: string,
  throughDate: string,
): Promise<JahezBalance> {
  return authFetch<JahezBalance>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/balance?through=${encodeURIComponent(throughDate)}`,
  );
}

export async function getJahezDebts(params?: {
  riderId?: string;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<JahezPage<JahezBalance>> {
  return authFetch<JahezPage<JahezBalance>>(`/api/jahez/debts${buildQuery(params)}`);
}

export async function getJahezRiderDebtSummary(riderId: string): Promise<JahezRiderDebtSummary> {
  return authFetch<JahezRiderDebtSummary>(
    `/api/jahez/riders/${encodeURIComponent(riderId)}/debt-summary`,
  );
}

export function getDebtActionGates(
  b: JahezBalance,
  can: (key: string) => boolean,
) {
  const canRead = can("jahez.read");
  const canReset = canRead && can("jahez.resets.approve");
  const canCollect = canRead && can("jahez.collections.create");
  const outstanding = b.outstandingAmount ?? 0;
  const isComplete = Boolean(b.commissionComplete);
  const status = b.debtStatus;

  return {
    freeze:
      canReset &&
      status === JahezDebtStatus.Active &&
      (outstanding > 0 || !isComplete),
    transfer:
      canReset &&
      status === JahezDebtStatus.Active &&
      isComplete,
    clear:
      canReset &&
      status === JahezDebtStatus.Frozen &&
      isComplete,
    confirmPaid:
      canCollect &&
      status !== JahezDebtStatus.Active &&
      isComplete &&
      outstanding === 0,
    collect:
      canCollect &&
      outstanding > 0,
  };
}

export async function getJahezLedger(params?: {
  riderId?: string;
  handoverId?: string;
  page?: number;
  pageSize?: number;
}): Promise<JahezPage<JahezLedgerEntry>> {
  return authFetch<JahezPage<JahezLedgerEntry>>(`/api/jahez/ledger${buildQuery(params)}`);
}

export async function getJahezHandoverFee(handoverId: string): Promise<JahezFee> {
  return authFetch<JahezFee>(`/api/jahez/handovers/${encodeURIComponent(handoverId)}/fee`);
}

export async function getJahezHandoverSettlements(
  handoverId: string,
  params?: { page?: number; pageSize?: number },
): Promise<JahezPage<JahezSettlement>> {
  return authFetch<JahezPage<JahezSettlement>>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/settlements${buildQuery(params)}`,
  );
}

export async function getJahezHandoverEarnings(
  handoverId: string,
  params?: { page?: number; pageSize?: number },
): Promise<JahezPage<JahezEarnings>> {
  return authFetch<JahezPage<JahezEarnings>>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/earnings${buildQuery(params)}`,
  );
}

export async function getJahezHandoverCommissionPolicies(
  handoverId: string,
  params?: { page?: number; pageSize?: number },
): Promise<JahezPage<JahezCommissionPolicy>> {
  return authFetch<JahezPage<JahezCommissionPolicy>>(
    `/api/jahez/handovers/${encodeURIComponent(handoverId)}/commission-policies${buildQuery(params)}`,
  );
}

// -------------------------------------------------------------
// 2. Approval Requests & Decisions
// -------------------------------------------------------------

export async function createApprovalRequest(
  data: ApprovalCreateRequest,
  idempotencyKey?: string,
): Promise<JahezApprovalResponse> {
  return jahezPostFetch<JahezApprovalResponse>("/api/jahez/requests", data, idempotencyKey, {
    notifySuccess: "تم إنشاء طلب الاعتماد بنجاح",
  });
}

export async function getApprovalRequests(params?: {
  status?: number;
  page?: number;
  pageSize?: number;
}): Promise<JahezPage<JahezApprovalRequest>> {
  return authFetch<JahezPage<JahezApprovalRequest>>(`/api/jahez/requests${buildQuery(params)}`);
}

export async function getApprovalRequest(requestId: string): Promise<JahezApprovalResponse> {
  return authFetch<JahezApprovalResponse>(`/api/jahez/requests/${encodeURIComponent(requestId)}`);
}

export async function decideApprovalRequest(
  requestId: string,
  data: ApprovalDecisionRequest,
  idempotencyKey?: string,
): Promise<JahezApprovalResponse> {
  return jahezPostFetch<JahezApprovalResponse>(
    `/api/jahez/requests/${encodeURIComponent(requestId)}/decision`,
    data,
    idempotencyKey,
    {
      notifySuccess: data.approve ? "تم اعتماد الطلب بنجاح" : "تم رفض الطلب بنجاح",
    },
  );
}

export async function cancelApprovalRequest(
  requestId: string,
  data: ApprovalCancelRequest,
  idempotencyKey?: string,
): Promise<JahezApprovalResponse> {
  return jahezPostFetch<JahezApprovalResponse>(
    `/api/jahez/requests/${encodeURIComponent(requestId)}/cancel`,
    data,
    idempotencyKey,
    { notifySuccess: "تم إلغاء الطلب بنجاح" },
  );
}

// -------------------------------------------------------------
// 3. Earnings, Rider Collections, & Adjustments
// -------------------------------------------------------------

export async function createEarnings(
  data: EarningsRequest,
  idempotencyKey?: string,
): Promise<JahezEarnings> {
  return jahezPostFetch<JahezEarnings>("/api/jahez/earnings", data, idempotencyKey, {
    notifySuccess: "تم حفظ بيان الأرباح واحتساب العمولة بنجاح",
  });
}

export async function createSettlement(
  data: PaymentRequest,
  idempotencyKey?: string,
): Promise<JahezSettlement> {
  return jahezPostFetch<JahezSettlement>("/api/jahez/settlements", data, idempotencyKey, {
    notifySuccess: "تم تسجيل التحصيل المالي والتسوية بنجاح",
  });
}

export async function createAdjustment(
  data: LedgerAdjustmentRequest,
  idempotencyKey?: string,
): Promise<JahezLedgerEntry> {
  return jahezPostFetch<JahezLedgerEntry>("/api/jahez/adjustments", data, idempotencyKey, {
    notifySuccess: "تم تسجيل قيد التسوية في السجل المالي بنجاح",
  });
}

// -------------------------------------------------------------
// 4. Imports & Dispatches
// -------------------------------------------------------------

export async function uploadImportBatch(
  kind: number,
  files: File[],
  options?: { replacesBatchId?: string; correctionReason?: string; idempotencyKey?: string },
): Promise<JahezImportPreview> {
  const formData = new FormData();
  formData.append("kind", String(kind));
  for (const file of files) {
    formData.append("files", file);
  }
  if (options?.replacesBatchId) {
    formData.append("replacesBatchId", options.replacesBatchId);
  }
  if (options?.correctionReason) {
    formData.append("correctionReason", options.correctionReason);
  }

  return jahezPostFetch<JahezImportPreview>(
    "/api/jahez/imports",
    formData,
    options?.idempotencyKey,
    {
      notifySuccess: "تم رفع الملفات وإعداد المعاينة بنجاح",
    },
  );
}

export async function getImportBatches(params?: {
  page?: number;
  pageSize?: number;
}): Promise<JahezPage<JahezImportBatch>> {
  return authFetch<JahezPage<JahezImportBatch>>(`/api/jahez/imports${buildQuery(params)}`);
}

export async function getImportPreview(batchId: string): Promise<JahezImportPreview> {
  return authFetch<JahezImportPreview>(`/api/jahez/imports/${encodeURIComponent(batchId)}`);
}

export async function commitImportBatch(
  batchId: string,
  data: ImportCommitRequest = {},
  idempotencyKey?: string,
): Promise<JahezImportPreview> {
  return jahezPostFetch<JahezImportPreview>(
    `/api/jahez/imports/${encodeURIComponent(batchId)}/commit`,
    data,
    idempotencyKey,
    { notifySuccess: "تم ترحيل واعتماد دفعة الاستيراد بنجاح" },
  );
}

export async function downloadImportFile(fileId: string): Promise<{ blob: Blob; fileName: string }> {
  return authDownload(`/api/jahez/import-files/${encodeURIComponent(fileId)}`);
}

export async function getJahezDispatches(params: {
  from: string;
  to: string;
  riderId?: string;
  page?: number;
  pageSize?: number;
}): Promise<JahezPage<JahezDispatch>> {
  return authFetch<JahezPage<JahezDispatch>>(`/api/jahez/dispatches${buildQuery(params)}`);
}

// -------------------------------------------------------------
// 5. Cashbox & Accountant Handoffs
// -------------------------------------------------------------

export async function getCashboxBalance(): Promise<JahezCashboxBalance> {
  return authFetch<JahezCashboxBalance>("/api/jahez/cashbox");
}

export async function getCashboxEntries(params?: {
  cashboxHandoverId?: string;
  page?: number;
  pageSize?: number;
}): Promise<JahezPage<JahezCashboxEntry>> {
  return authFetch<JahezPage<JahezCashboxEntry>>(`/api/jahez/cashbox/entries${buildQuery(params)}`);
}

export async function getCashboxHandovers(params?: {
  page?: number;
  pageSize?: number;
}): Promise<JahezPage<JahezCashboxHandover>> {
  return authFetch<JahezPage<JahezCashboxHandover>>(`/api/jahez/cashbox/handovers${buildQuery(params)}`);
}

export async function createCashboxHandover(
  data: CashboxCreateRequest,
  idempotencyKey?: string,
): Promise<JahezCashboxHandover> {
  return jahezPostFetch<JahezCashboxHandover>("/api/jahez/cashbox/handovers", data, idempotencyKey, {
    notifySuccess: "تم بدء تسليم الصندوق للمحاسب وحجز المبالغ بنجاح",
  });
}

export async function confirmCashboxHandover(
  handoffId: string,
  data: AccountantConfirmRequest,
  idempotencyKey?: string,
): Promise<JahezCashboxHandover> {
  return jahezPostFetch<JahezCashboxHandover>(
    `/api/jahez/cashbox/handovers/${encodeURIComponent(handoffId)}/confirm`,
    data,
    idempotencyKey,
    { notifySuccess: "تم تأكيد استلام ومطابقة الصندوق بواسطة المحاسب بنجاح" },
  );
}

export async function decideCashboxHandover(
  handoffId: string,
  data: CashboxDecisionRequest,
  idempotencyKey?: string,
): Promise<JahezCashboxHandover> {
  return jahezPostFetch<JahezCashboxHandover>(
    `/api/jahez/cashbox/handovers/${encodeURIComponent(handoffId)}/decision`,
    data,
    idempotencyKey,
    {
      notifySuccess: data.approve
        ? "تم الاعتماد النهائي لتسليم الصندوق بنجاح"
        : "تم رفض تسليم الصندوق وإعادة المبالغ للحالة المتاحة",
    },
  );
}
