// src/lib/chefz/api.ts
import { authFetch } from "../auth/api";
import { getPlatforms, type PlatformResponse } from "../platforms/api";
import type {
  ChefzAccount,
  ChefzAccountDetailsRequest,
  ChefzImportResult,
  ChefzPage,
  ChefzPasswordRequest,
  ChefzPerformance,
  ChefzSettlement,
  ChefzSettlementRequest,
} from "./types";

export const CHEFZ_PLATFORM_CODES = ["SHIFTZ", "CHEFZ", "THECHEFZ", "CHEFSZ"];

/**
 * Returns today's calendar date in Asia/Riyadh timezone (UTC+3) formatted as YYYY-MM-DD.
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
 * Discovers the Chefz / Shiftz platform record from /api/platforms.
 */
export async function getChefzPlatform(): Promise<PlatformResponse | null> {
  const platforms = await getPlatforms();
  const chefz = platforms.find((p) =>
    CHEFZ_PLATFORM_CODES.includes((p.code || "").toUpperCase())
  );
  return chefz || null;
}

// -------------------------------------------------------------
// 1. Chefz Accounts
// -------------------------------------------------------------

export async function getChefzAccounts(params?: {
  page?: number;
  pageSize?: number;
}): Promise<ChefzPage<ChefzAccount>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();
  return authFetch<ChefzPage<ChefzAccount>>(
    `/api/chefz/accounts${queryString ? `?${queryString}` : ""}`
  );
}

/**
 * Fetch all configured Chefz accounts across all pages.
 */
export async function getAllChefzAccounts(pageSize = 100): Promise<ChefzAccount[]> {
  const all: ChefzAccount[] = [];
  let page = 1;
  const maxPages = 50; // Safety guard against runaway fetches

  while (page <= maxPages) {
    const res = await getChefzAccounts({ page, pageSize });
    const items = res.items || [];
    all.push(...items);
    if (items.length < pageSize) {
      break;
    }
    page++;
  }

  return all;
}

export async function getChefzAccount(accountId: string): Promise<ChefzAccount | null> {
  try {
    return await authFetch<ChefzAccount>(`/api/chefz/accounts/${encodeURIComponent(accountId)}`);
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e?.status === 404) return null;
    throw err;
  }
}

export async function updateChefzAccountDetails(
  accountId: string,
  data: ChefzAccountDetailsRequest
): Promise<ChefzAccount> {
  return authFetch<ChefzAccount>(`/api/chefz/accounts/${encodeURIComponent(accountId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
    notifySuccess: "تم حفظ إعدادات حساب شيفز بنجاح",
  });
}

// -------------------------------------------------------------
// 2. Chefz Credentials
// -------------------------------------------------------------

export async function setChefzPassword(
  accountId: string,
  data: ChefzPasswordRequest
): Promise<void> {
  await authFetch<void>(`/api/chefz/accounts/${encodeURIComponent(accountId)}/password`, {
    method: "PUT",
    body: JSON.stringify(data),
    notifySuccess: "تم حفظ كلمة مرور الحساب بنجاح",
  });
}

export async function getChefzPassword(accountId: string): Promise<string> {
  return authFetch<string>(`/api/chefz/accounts/${encodeURIComponent(accountId)}/password`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

// -------------------------------------------------------------
// 3. Chefz Settlements
// -------------------------------------------------------------

export async function previewChefzSettlement(
  data: ChefzSettlementRequest
): Promise<ChefzSettlement> {
  return authFetch<ChefzSettlement>("/api/chefz/settlements/preview", {
    method: "POST",
    body: JSON.stringify(data),
    suppressErrorToast: false,
  });
}

export async function createChefzSettlement(
  data: ChefzSettlementRequest
): Promise<ChefzSettlement> {
  return authFetch<ChefzSettlement>("/api/chefz/settlements", {
    method: "POST",
    body: JSON.stringify(data),
    notifySuccess: "تم حفظ تصفية شيفز بنجاح",
  });
}

export async function getChefzSettlements(params?: {
  accountId?: string;
  riderId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ChefzPage<ChefzSettlement>> {
  const query = new URLSearchParams();
  if (params?.accountId) query.set("accountId", params.accountId);
  if (params?.riderId) query.set("riderId", params.riderId);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();
  return authFetch<ChefzPage<ChefzSettlement>>(
    `/api/chefz/settlements${queryString ? `?${queryString}` : ""}`
  );
}

// -------------------------------------------------------------
// 4. Chefz Daily Performance
// -------------------------------------------------------------

export async function uploadChefzPerformance(
  file: File,
  reportDate: string,
  signal?: AbortSignal
): Promise<ChefzImportResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("reportDate", reportDate);

  // authFetch handles FormData without overriding Content-Type
  return authFetch<ChefzImportResult>("/api/chefz/performance/import", {
    method: "POST",
    body: form,
    signal,
  });
}

export async function getChefzPerformance(params: {
  from: string;
  to: string;
  accountId?: string;
  riderId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ChefzPage<ChefzPerformance>> {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.riderId) query.set("riderId", params.riderId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();
  return authFetch<ChefzPage<ChefzPerformance>>(
    `/api/chefz/performance?${queryString}`
  );
}
