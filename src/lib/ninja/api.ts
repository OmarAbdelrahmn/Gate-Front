// src/lib/ninja/api.ts
// Ninja Platform ERP API Client and Utility Functions

import { authFetch } from "../auth/api";
import { getPlatforms, createPlatform, type PlatformResponse } from "../platforms/api";
import {
  ninjaPaths,
  type NinjaAccountResponse,
  type NinjaAssignRequest,
  type NinjaCredentialRequest,
  type NinjaCredentialResponse,
  type NinjaDeductionResponse,
  type NinjaImportResponse,
  type NinjaLifecycleResponse,
  type NinjaPage,
  type NinjaPerformanceResponse,
  type NinjaReportFilterParams,
  type NinjaReturnRequest,
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

// -------------------------------------------------------------
// 1. Ninja Accounts Endpoints
// -------------------------------------------------------------

export async function getNinjaAccounts(params?: {
  page?: number;
  pageSize?: number;
}): Promise<NinjaPage<NinjaAccountResponse>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();

  return authFetch<NinjaPage<NinjaAccountResponse>>(
    `${ninjaPaths.accounts}${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );
}

/**
 * Fetches all Ninja accounts across pages (defaults page=1, pageSize=50 up to 100).
 */
export async function getAllNinjaAccounts(pageSize = 100): Promise<NinjaAccountResponse[]> {
  const all: NinjaAccountResponse[] = [];
  let page = 1;
  const maxPages = 50; // Safety guard

  while (page <= maxPages) {
    const res = await getNinjaAccounts({ page, pageSize });
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
// 2. Lifecycle: Assign, Return, and Credentials
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
// 3. Daily Uploads (Performance & Deductions)
// -------------------------------------------------------------

/**
 * Upload daily performance report .xlsx file.
 * Multi-part FormData with reportDate and file.
 */
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

/**
 * Upload daily deductions report .xlsx file.
 * Multi-part FormData with reportDate and file.
 */
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
// 4. Daily Reports (Performance & Deductions)
// -------------------------------------------------------------

export async function getNinjaPerformance(
  params: NinjaReportFilterParams
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
    {
      method: "GET",
    }
  );
}

export async function getAllNinjaPerformance(
  params: Omit<NinjaReportFilterParams, "page" | "pageSize">,
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
  params: NinjaReportFilterParams
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
    {
      method: "GET",
    }
  );
}

export async function getAllNinjaDeductions(
  params: Omit<NinjaReportFilterParams, "page" | "pageSize">,
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
