// src/lib/jahez/treasury/api.ts
// Treasury V3 API Client for Jahez Platform

import { authFetch, authDownload, type CustomRequestInit } from "../../auth/api";
import { readAuth } from "../../auth/token-store";
import type {
  Page,
  TreasuryAccount,
  TreasuryAccountCreate,
  TreasuryAccountUpdate,
  TreasuryBalance,
  TreasuryPosting,
  TreasuryJournalRow,
  TreasuryFilter,
  TreasuryTransferCreate,
  TreasuryCashEntryCreate,
  TreasuryReversalCreate,
  TreasuryHandoverPreview,
  TreasuryHandover,
  TreasuryHandoverDetail,
  TreasuryHandoverCreate,
  TreasuryHandoverConfirm,
  TreasuryHandoverCancel,
  PetroEvidence,
  PetroEvidenceCreate,
  TreasuryReport,
  TreasuryReportType,
  TreasuryReadiness,
  TreasuryAttributionReview,
  TreasuryOwnershipDecision,
  TreasuryVerificationCreate,
  TreasuryVerification,
  TreasuryActivateRequest,
  TreasuryState,
} from "./types";

export * from "./types";

const ROOT = "/api/jahez/v3/treasury";

/**
 * Generate a unique idempotency key for safe mutating requests.
 */
export function generateTreasuryIdempotencyKey(prefix = "jh-tr"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`.slice(0, 150);
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.slice(0, 150);
}

/**
 * Convert filter object to query string ensuring dates are included
 */
function buildTreasuryQuery(filter: TreasuryFilter): string {
  const params = new URLSearchParams();
  if (filter.fromDate) params.append("fromDate", filter.fromDate);
  if (filter.toDate) params.append("toDate", filter.toDate);
  if (filter.subAccountId) params.append("subAccountId", filter.subAccountId);
  if (filter.sponsorId) params.append("sponsorId", filter.sponsorId);
  if (filter.purpose !== undefined && filter.purpose !== null) {
    params.append("purpose", String(filter.purpose));
  }
  if (filter.page) params.append("page", String(filter.page));
  if (filter.pageSize) params.append("pageSize", String(filter.pageSize));
  return params.toString();
}

// ----------------------------------------------------------------------
// 1. Accounts & Balances
// ----------------------------------------------------------------------

export async function getTreasuryAccounts(init?: CustomRequestInit): Promise<TreasuryAccount[]> {
  return authFetch<TreasuryAccount[]>(`${ROOT}/accounts`, {
    ...init,
    method: "GET",
  });
}

export async function createTreasuryAccount(
  data: TreasuryAccountCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryAccount> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("acc-create");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryAccount>(`${ROOT}/accounts`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم إنشاء حساب الخزينة بنجاح",
  });
}

export async function updateTreasuryAccount(
  id: string,
  data: TreasuryAccountUpdate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryAccount> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("acc-update");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryAccount>(`${ROOT}/accounts/${encodeURIComponent(id)}`, {
    ...init,
    method: "PUT",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تحديث حساب الخزينة بنجاح",
  });
}

export async function getTreasuryBalances(init?: CustomRequestInit): Promise<TreasuryBalance[]> {
  return authFetch<TreasuryBalance[]>(`${ROOT}/balances`, {
    ...init,
    method: "GET",
  });
}

// ----------------------------------------------------------------------
// 2. Journal (دفتر الحركات)
// ----------------------------------------------------------------------

export async function getTreasuryJournal(
  filter: TreasuryFilter,
  init?: CustomRequestInit,
): Promise<Page<TreasuryJournalRow>> {
  const query = buildTreasuryQuery(filter);
  return authFetch<Page<TreasuryJournalRow>>(`${ROOT}/journal?${query}`, {
    ...init,
    method: "GET",
  });
}

// ----------------------------------------------------------------------
// 3. Transfers, Cash Entries & Reversals
// ----------------------------------------------------------------------

export async function createTreasuryTransfer(
  data: TreasuryTransferCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<string> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("transfer");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<string>(`${ROOT}/transfers`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تنفيذ التحويل الداخلي بنجاح",
  });
}

export async function createTreasuryCashEntry(
  data: TreasuryCashEntryCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryPosting> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("entry");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryPosting>(`${ROOT}/cash-entries`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تسجيل القيد بنجاح",
  });
}

export async function reverseTreasuryPosting(
  data: TreasuryReversalCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<string> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("reversal");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<string>(`${ROOT}/reversals`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم عكس القيد بنجاح",
  });
}

// ----------------------------------------------------------------------
// 4. Handovers (تسليم العهدة)
// ----------------------------------------------------------------------

export async function previewTreasuryHandover(
  businessDate: string,
  init?: CustomRequestInit,
): Promise<TreasuryHandoverPreview> {
  return authFetch<TreasuryHandoverPreview>(
    `${ROOT}/handovers/preview?businessDate=${encodeURIComponent(businessDate)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function getTreasuryHandovers(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<TreasuryHandover>> {
  return authFetch<Page<TreasuryHandover>>(
    `${ROOT}/handovers?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function getTreasuryHandover(
  id: string,
  init?: CustomRequestInit,
): Promise<TreasuryHandoverDetail> {
  return authFetch<TreasuryHandoverDetail>(`${ROOT}/handovers/${encodeURIComponent(id)}`, {
    ...init,
    method: "GET",
  });
}

export async function submitTreasuryHandover(
  data: TreasuryHandoverCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryHandoverDetail> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("handover-submit");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryHandoverDetail>(`${ROOT}/handovers`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تقديم محضر تسليم العهدة بنجاح (قيد التأكيد)",
  });
}

export async function confirmTreasuryHandover(
  id: string,
  data: TreasuryHandoverConfirm,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryHandoverDetail> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("handover-confirm");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryHandoverDetail>(
    `${ROOT}/handovers/${encodeURIComponent(id)}/confirm`,
    {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم تأكيد واعتماد محضر تسليم العهدة بنجاح",
    },
  );
}

export async function cancelTreasuryHandover(
  id: string,
  data: TreasuryHandoverCancel,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryHandoverDetail> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("handover-cancel");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryHandoverDetail>(
    `${ROOT}/handovers/${encodeURIComponent(id)}/cancel`,
    {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(data),
      notifySuccess: init?.notifySuccess ?? "تم إلغاء محضر تسليم العهدة بنجاح",
    },
  );
}

// ----------------------------------------------------------------------
// 5. PetroApp Evidence
// ----------------------------------------------------------------------

export async function getPetroAppEvidence(
  filter: TreasuryFilter,
  init?: CustomRequestInit,
): Promise<Page<PetroEvidence>> {
  const params = new URLSearchParams();
  if (filter.fromDate) params.append("fromDate", filter.fromDate);
  if (filter.toDate) params.append("toDate", filter.toDate);
  if (filter.sponsorId) params.append("sponsorId", filter.sponsorId);
  if (filter.page) params.append("page", String(filter.page));
  if (filter.pageSize) params.append("pageSize", String(filter.pageSize));

  return authFetch<Page<PetroEvidence>>(`${ROOT}/petroapp/evidence?${params.toString()}`, {
    ...init,
    method: "GET",
  });
}

export async function createPetroAppEvidence(
  data: PetroEvidenceCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<PetroEvidence> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("petro-evidence");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<PetroEvidence>(`${ROOT}/petroapp/evidence`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تسجيل دليل بترو آب بنجاح",
  });
}

// ----------------------------------------------------------------------
// 6. Reports & Server Exports
// ----------------------------------------------------------------------

export async function getTreasuryReport(
  type: TreasuryReportType,
  filter: TreasuryFilter,
  handoverId?: string,
  init?: CustomRequestInit,
): Promise<TreasuryReport> {
  const params = new URLSearchParams(buildTreasuryQuery(filter));
  if (handoverId) params.append("handoverId", handoverId);

  return authFetch<TreasuryReport>(`${ROOT}/reports/${encodeURIComponent(type)}?${params.toString()}`, {
    ...init,
    method: "GET",
  });
}

export async function exportTreasuryReport(
  type: TreasuryReportType,
  format: "xlsx" | "pdf",
  filter: TreasuryFilter,
  handoverId?: string,
): Promise<{ blob: Blob; fileName: string }> {
  const params = new URLSearchParams(buildTreasuryQuery(filter));
  params.append("format", format);
  if (handoverId) params.append("handoverId", handoverId);

  return authDownload(`${ROOT}/reports/${encodeURIComponent(type)}/export?${params.toString()}`);
}

// ----------------------------------------------------------------------
// 7. Migration & Readiness (Authorized Finance Only)
// ----------------------------------------------------------------------

export async function getTreasuryReadiness(init?: CustomRequestInit): Promise<TreasuryReadiness> {
  return authFetch<TreasuryReadiness>(`${ROOT}/migration/readiness`, {
    ...init,
    method: "GET",
  });
}

export async function getTreasuryAttributionReviews(
  page = 1,
  pageSize = 50,
  init?: CustomRequestInit,
): Promise<Page<TreasuryAttributionReview>> {
  return authFetch<Page<TreasuryAttributionReview>>(
    `${ROOT}/migration/attribution-review?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function submitTreasuryAttribution(
  data: TreasuryOwnershipDecision,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryOwnershipDecision> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("mig-attrib");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryOwnershipDecision>(`${ROOT}/migration/attributions`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم اعتماد قرار ملكية الحركة بنجاح",
  });
}

export async function runTreasuryBackfill(
  reason: string,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<number> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("mig-backfill");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<number>(`${ROOT}/migration/backfill`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
    notifySuccess: init?.notifySuccess ?? "تم ترحيل دفعة الحركات بنجاح",
  });
}

export async function verifyTreasuryAccountBalance(
  data: TreasuryVerificationCreate,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryVerification> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("mig-verify");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryVerification>(`${ROOT}/migration/balance-verifications`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم إثبات الرصيد الفعلي للحساب بنجاح",
  });
}

export async function activateTreasury(
  data: TreasuryActivateRequest,
  idempotencyKey?: string,
  init?: CustomRequestInit,
): Promise<TreasuryState> {
  const key = idempotencyKey?.trim() || generateTreasuryIdempotencyKey("mig-activate");
  const headers = new Headers(init?.headers);
  headers.set("Idempotency-Key", key);

  return authFetch<TreasuryState>(`${ROOT}/migration/activate`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(data),
    notifySuccess: init?.notifySuccess ?? "تم تفعيل خزائن جاهز V3 بنجاح!",
  });
}
