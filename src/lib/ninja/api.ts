// src/lib/ninja/api.ts
// Ninja Platform ERP API Client and Utility Functions
// Updated to support all 19 endpoints from 15 October 2026 documentation.

import { authFetch } from "../auth/api";
import { getPlatforms, createPlatform, type PlatformResponse } from "../platforms/api";
import {
  ninjaPaths,
  type NinjaAccountResponse,
  type NinjaAccountStatusRequest,
  type NinjaAccountComparisonResponse,
  type NinjaAssignRequest,
  type NinjaCredentialRequest,
  type NinjaCredentialResponse,
  type NinjaDeductionResponse,
  type NinjaImportResponse,
  type NinjaLifecycleResponse,
  type NinjaPage,
  type NinjaPerformanceResponse,
  type NinjaPerformanceReport,
  type NinjaDailyReport,
  type NinjaRiderReport,
  type NinjaReportQuery,
  type NinjaReturnRequest,
  type NinjaAccountUpdateUploadResponse,
  type NinjaAccountUpdatePage,
  type NinjaAccountUpdateRowResponse,
  type NinjaAccountUpdateRowQuery,
  type NinjaAccountUpdateNoteRequest,
} from "./ninja-api-contracts";

export * from "./ninja-api-contracts";

export const NINJA_PLATFORM_CODE = "NINJA";

/**
 * Returns today's date in Asia/Riyadh timezone (UTC+3) formatted as YYYY-MM-DD.
 */
export function getRiyadhTodayDate(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Validates if a date (YYYY-MM-DD) is in the future relative to Asia/Riyadh today.
 */
export function isAfterRiyadhToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = getRiyadhTodayDate();
  return dateStr > today;
}

/**
 * Formats a UTC timestamp into a localized string with explicit Riyadh timezone designation.
 */
export function formatRiyadhDateTime(
  utcDateStr?: string | null,
  locale: "ar" | "en" = "ar"
): string {
  if (!utcDateStr) return "";
  try {
    const date = new Date(utcDateStr);
    if (isNaN(date.getTime())) return utcDateStr;

    const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const tzLabel = locale === "ar" ? "(توقيت الرياض)" : "(Riyadh Time)";
    return `${formatter.format(date)} ${tzLabel}`;
  } catch {
    return utcDateStr;
  }
}

/**
 * Checks whether the 72-hour password rotation cooldown is currently active.
 */
export function isCooldownActive(passwordAllowedAtUtc?: string | null): boolean {
  if (!passwordAllowedAtUtc) return false;
  const target = new Date(passwordAllowedAtUtc).getTime();
  return !isNaN(target) && target > Date.now();
}

/**
 * Calculates remaining time in milliseconds for the password cooldown.
 */
export function getRemainingCooldownMs(passwordAllowedAtUtc?: string | null): number {
  if (!passwordAllowedAtUtc) return 0;
  const target = new Date(passwordAllowedAtUtc).getTime();
  if (isNaN(target)) return 0;
  return Math.max(0, target - Date.now());
}

/**
 * Formats remaining cooldown duration in human-readable text.
 */
export function formatRemainingCooldown(
  passwordAllowedAtUtc?: string | null,
  locale: "ar" | "en" = "ar"
): string {
  const ms = getRemainingCooldownMs(passwordAllowedAtUtc);
  if (ms <= 0) return locale === "ar" ? "منتهية" : "Expired";

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return locale === "ar"
      ? `متبقي ${hours} ساعة و ${minutes} دقيقة`
      : `${hours}h ${minutes}m remaining`;
  }
  return locale === "ar"
    ? `متبقي ${minutes} دقيقة`
    : `${minutes}m remaining`;
}

/**
 * Discovers the Ninja platform record from /api/platforms.
 */
export async function getNinjaPlatform(): Promise<PlatformResponse | null> {
  try {
    const platforms = await getPlatforms(true);
    const ninja = platforms.find(
      (p) => (p.code || "").trim().toUpperCase() === NINJA_PLATFORM_CODE
    );
    return ninja || null;
  } catch (err) {
    console.warn("Could not fetch platforms for Ninja detection", err);
    return null;
  }
}

/**
 * Ensures platform NINJA exists in ERP. If not present, creates it automatically.
 */
export async function ensureNinjaPlatform(): Promise<PlatformResponse> {
  const existing = await getNinjaPlatform();
  if (existing) return existing;

  return createPlatform({
    code: NINJA_PLATFORM_CODE,
    nameAr: "منصة نينجا",
    nameEn: "Ninja Platform",
    status: "Active",
    supportedPaymentModels: ["PayPerOrder", "Salary"],
    notes: "تم الإنشاء تلقائياً لتهيئة منصة نينجا وحساباتها",
  });
}

function normalizeAccount(account: NinjaAccountResponse): NinjaAccountResponse {
  if (!account) return account;
  if (!account.accountId && account.id) account.accountId = account.id;
  if (!account.id && account.accountId) account.id = account.accountId;
  return account;
}

// -------------------------------------------------------------
// 1. Ninja Accounts Endpoints (GET /api/ninja/accounts, GET /accounts/{id})
// -------------------------------------------------------------

export async function getNinjaAccounts(params?: {
  page?: number;
  pageSize?: number;
}): Promise<NinjaPage<NinjaAccountResponse>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize !== undefined) {
    const clamped = Math.min(100, Math.max(1, params.pageSize));
    query.set("pageSize", String(clamped));
  }
  const queryString = query.toString();

  const res = await authFetch<NinjaPage<NinjaAccountResponse>>(
    `${ninjaPaths.accounts}${queryString ? `?${queryString}` : ""}`,
    { method: "GET" }
  );

  if (res?.items) {
    res.items.forEach(normalizeAccount);
  }
  return res;
}

export async function getNinjaAccount(accountId: string): Promise<NinjaAccountResponse> {
  const res = await authFetch<NinjaAccountResponse>(ninjaPaths.account(accountId), {
    method: "GET",
  });
  return normalizeAccount(res);
}

export async function getAllNinjaAccounts(requestedPageSize = 100): Promise<NinjaAccountResponse[]> {
  const pageSize = Math.min(100, Math.max(1, requestedPageSize || 100));
  const all: NinjaAccountResponse[] = [];
  const seenIds = new Set<string>();
  let page = 1;
  const maxPages = 100;
  let serverPageSize: number | null = null;

  while (page <= maxPages) {
    const res = await getNinjaAccounts({ page, pageSize });
    const items = res?.items || [];
    if (items.length === 0) break;

    if (serverPageSize === null) {
      serverPageSize = res?.pageSize && res.pageSize > 0 ? res.pageSize : items.length;
    }

    let newCount = 0;
    for (const item of items) {
      const key = item.accountId || item.id || `${item.captainId}-${item.code}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        all.push(item);
        newCount++;
      }
    }

    if (newCount === 0) break;
    if (items.length < serverPageSize) {
      break;
    }
    page++;
  }

  return all;
}

// -------------------------------------------------------------
// 2. Status Control (PUT /api/ninja/accounts/{accountId}/status)
// -------------------------------------------------------------

export async function setNinjaAccountStatus(
  accountId: string,
  data: NinjaAccountStatusRequest
): Promise<NinjaAccountResponse> {
  const res = await authFetch<NinjaAccountResponse>(ninjaPaths.status(accountId), {
    method: "PUT",
    body: JSON.stringify(data),
    suppressErrorToast: false,
  });
  return normalizeAccount(res);
}

// -------------------------------------------------------------
// 3. Comparison (POST /api/ninja/accounts/compare)
// -------------------------------------------------------------

export async function compareNinjaAccounts(
  file: File,
  signal?: AbortSignal
): Promise<NinjaAccountComparisonResponse> {
  const form = new FormData();
  form.append("file", file, file.name);

  return authFetch<NinjaAccountComparisonResponse>(ninjaPaths.compare, {
    method: "POST",
    body: form,
    signal,
    suppressErrorToast: true, // Inspected and handled in comparison UI
  });
}

// -------------------------------------------------------------
// 4. Lifecycle: Assign, Return, and Credentials
// -------------------------------------------------------------

export async function assignNinjaAccount(
  accountId: string,
  data: NinjaAssignRequest
): Promise<NinjaLifecycleResponse> {
  return authFetch<NinjaLifecycleResponse>(ninjaPaths.assign(accountId), {
    method: "POST",
    body: JSON.stringify(data),
    suppressErrorToast: false,
  });
}

export async function returnNinjaAccount(
  accountId: string,
  data: NinjaReturnRequest
): Promise<NinjaLifecycleResponse> {
  return authFetch<NinjaLifecycleResponse>(ninjaPaths.return(accountId), {
    method: "POST",
    body: JSON.stringify(data),
    suppressErrorToast: false,
  });
}

export async function updateNinjaCredentials(
  accountId: string,
  data: NinjaCredentialRequest
): Promise<NinjaCredentialResponse> {
  return authFetch<NinjaCredentialResponse>(ninjaPaths.credentials(accountId), {
    method: "PUT",
    body: JSON.stringify(data),
    suppressErrorToast: false,
  });
}

// -------------------------------------------------------------
// 5. Daily Uploads (Performance & Deductions)
// -------------------------------------------------------------

export async function importNinjaPerformance(
  reportDate: string,
  file: File,
  signal?: AbortSignal
): Promise<NinjaImportResponse> {
  const form = new FormData();
  form.append("reportDate", reportDate);
  form.append("file", file, file.name);

  return authFetch<NinjaImportResponse>(ninjaPaths.importPerformance, {
    method: "POST",
    body: form,
    signal,
    suppressErrorToast: true, // We handle errors and issue table in the UI
  });
}

export async function importNinjaDeductions(
  reportDate: string,
  file: File,
  signal?: AbortSignal
): Promise<NinjaImportResponse> {
  const form = new FormData();
  form.append("reportDate", reportDate);
  form.append("file", file, file.name);

  return authFetch<NinjaImportResponse>(ninjaPaths.importDeductions, {
    method: "POST",
    body: form,
    signal,
    suppressErrorToast: true, // We handle errors and issue table in the UI
  });
}

// -------------------------------------------------------------
// 6. Raw Daily Records (Performance & Deductions)
// -------------------------------------------------------------

export async function getNinjaPerformance(
  params: NinjaReportQuery
): Promise<NinjaPage<NinjaPerformanceResponse>> {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.riderId) query.set("riderId", params.riderId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return authFetch<NinjaPage<NinjaPerformanceResponse>>(
    `${ninjaPaths.performance}?${query.toString()}`,
    { method: "GET" }
  );
}

export async function getAllNinjaPerformance(
  params: Omit<NinjaReportQuery, "page" | "pageSize">,
  pageSize = 100
): Promise<NinjaPerformanceResponse[]> {
  const all: NinjaPerformanceResponse[] = [];
  let page = 1;
  const maxPages = 50;

  while (page <= maxPages) {
    const res = await getNinjaPerformance({ ...params, page, pageSize });
    const items = res?.items || [];
    if (items.length === 0) break;

    all.push(...items);
    if (items.length < (res?.pageSize || pageSize)) {
      break;
    }
    page++;
  }

  return all;
}

export async function getNinjaDeductions(
  params: NinjaReportQuery
): Promise<NinjaPage<NinjaDeductionResponse>> {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.riderId) query.set("riderId", params.riderId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return authFetch<NinjaPage<NinjaDeductionResponse>>(
    `${ninjaPaths.deductions}?${query.toString()}`,
    { method: "GET" }
  );
}

export async function getAllNinjaDeductions(
  params: Omit<NinjaReportQuery, "page" | "pageSize">,
  pageSize = 100
): Promise<NinjaDeductionResponse[]> {
  const all: NinjaDeductionResponse[] = [];
  let page = 1;
  const maxPages = 50;

  while (page <= maxPages) {
    const res = await getNinjaDeductions({ ...params, page, pageSize });
    const items = res?.items || [];
    if (items.length === 0) break;

    all.push(...items);
    if (items.length < (res?.pageSize || pageSize)) {
      break;
    }
    page++;
  }

  return all;
}

// -------------------------------------------------------------
// 7. Aggregate Reports (Performance, Daily Trend, Rider Report)
// -------------------------------------------------------------

export async function getNinjaPerformanceReport(
  params: NinjaReportQuery,
  signal?: AbortSignal
): Promise<NinjaPerformanceReport> {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.riderId) query.set("riderId", params.riderId);

  return authFetch<NinjaPerformanceReport>(
    `${ninjaPaths.performanceReport}?${query.toString()}`,
    { method: "GET", signal }
  );
}

export async function getNinjaDailyReport(
  params: NinjaReportQuery,
  signal?: AbortSignal
): Promise<NinjaPage<NinjaDailyReport>> {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.riderId) query.set("riderId", params.riderId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return authFetch<NinjaPage<NinjaDailyReport>>(
    `${ninjaPaths.dailyReport}?${query.toString()}`,
    { method: "GET", signal }
  );
}

export async function getNinjaRiderReport(
  params: NinjaReportQuery,
  signal?: AbortSignal
): Promise<NinjaPage<NinjaRiderReport>> {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.riderId) query.set("riderId", params.riderId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return authFetch<NinjaPage<NinjaRiderReport>>(
    `${ninjaPaths.riderReport}?${query.toString()}`,
    { method: "GET", signal }
  );
}

// -------------------------------------------------------------
// 8. Sheet Checkup Services (Uploads, Reviews, Rows, Notes)
// -------------------------------------------------------------

export async function uploadNinjaAccountSheet(
  file: File,
  note?: string,
  signal?: AbortSignal
): Promise<NinjaAccountUpdateUploadResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  if (note !== undefined && note !== null && note.trim()) {
    form.append("note", note.trim());
  }

  return authFetch<NinjaAccountUpdateUploadResponse>(ninjaPaths.sheetUpdates, {
    method: "POST",
    body: form,
    signal,
    suppressErrorToast: true, // We inspect issues and errors in the UI
  });
}

export async function getNinjaAccountSheetUploads(
  params?: { page?: number; pageSize?: number },
  signal?: AbortSignal
): Promise<NinjaAccountUpdatePage<NinjaAccountUpdateUploadResponse>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();

  return authFetch<NinjaAccountUpdatePage<NinjaAccountUpdateUploadResponse>>(
    `${ninjaPaths.sheetUpdates}${qs ? `?${qs}` : ""}`,
    { method: "GET", signal }
  );
}

export async function getNinjaAccountSheetUpload(
  uploadId: string,
  signal?: AbortSignal
): Promise<NinjaAccountUpdateUploadResponse> {
  return authFetch<NinjaAccountUpdateUploadResponse>(
    ninjaPaths.sheetUpdate(uploadId),
    { method: "GET", signal }
  );
}

export async function getNinjaAccountSheetRows(
  uploadId: string,
  query: NinjaAccountUpdateRowQuery = {},
  signal?: AbortSignal
): Promise<NinjaAccountUpdatePage<NinjaAccountUpdateRowResponse>> {
  const params = new URLSearchParams();
  if (query.matchStatus) params.set("matchStatus", query.matchStatus);
  if (query.sheetStatus) params.set("sheetStatus", query.sheetStatus);
  if (query.problemsOnly !== undefined) params.set("problemsOnly", String(query.problemsOnly));
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();

  return authFetch<NinjaAccountUpdatePage<NinjaAccountUpdateRowResponse>>(
    `${ninjaPaths.sheetUpdateRows(uploadId)}${qs ? `?${qs}` : ""}`,
    { method: "GET", signal }
  );
}

export async function updateNinjaAccountSheetNote(
  uploadId: string,
  data: NinjaAccountUpdateNoteRequest,
  signal?: AbortSignal
): Promise<NinjaAccountUpdateUploadResponse> {
  return authFetch<NinjaAccountUpdateUploadResponse>(
    ninjaPaths.sheetUpdateNote(uploadId),
    {
      method: "PUT",
      body: JSON.stringify(data),
      signal,
      suppressErrorToast: false,
    }
  );
}
