// src/lib/chefz/api.ts
import { authFetch } from "../auth/api";
import { getPlatforms, type PlatformResponse } from "../platforms/api";
import { registerRiderIqama } from "@/lib/fleet/rider-iqama-cache";
import type {
  ChefzAccount,
  ChefzAccountCounts,
  ChefzAccountDetailsRequest,
  ChefzAccountReminder,
  ChefzAccountsResponse,
  ChefzAccountStatusRequest,
  ChefzImportResult,
  ChefzManagementReport,
  ChefzOrderSettlementImportResponse,
  ChefzPage,
  ChefzPasswordRequest,
  ChefzPerformance,
  ChefzRiderReport,
  ChefzAllRidersReport,
  ChefzAllRidersReportQuery,
  ChefzSettlement,
  ChefzSettlementRequest,
  ChefzSettingsRequest,
  ChefzSettingsResponse,
  ChefzSponsorAccountCounts,
  ChefzStatisticsRequest,
  ChefzStatisticsResponse,
  UpdateChefzAssignmentStartDateRequest,
  UpdateChefzAssignmentStartDateResponse,
} from "./types";
import {
  chefzPaths,
  uploadOrderSettlements,
} from "./chefz-new-endpoints-contracts";

export { chefzPaths, uploadOrderSettlements };
export type {
  UpdateChefzAssignmentStartDateRequest,
  UpdateChefzAssignmentStartDateResponse,
};


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
}): Promise<ChefzAccountsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();
  return authFetch<ChefzAccountsResponse>(
    `/api/chefz/accounts${queryString ? `?${queryString}` : ""}`
  );
}

/**
 * Fetch all configured Chefz accounts across all pages alongside live summary and sponsor breakdown.
 */
export async function getAllChefzAccountsWithSummary(pageSize = 100): Promise<{
  accounts: ChefzAccount[];
  totalCount: number;
  summary: ChefzAccountCounts | null;
  sponsors: ChefzSponsorAccountCounts[];
}> {
  const all: ChefzAccount[] = [];
  let page = 1;
  const maxPages = 50; // Safety guard against runaway fetches
  let summary: ChefzAccountCounts | null = null;
  let sponsors: ChefzSponsorAccountCounts[] = [];
  let totalCount = 0;

  while (page <= maxPages) {
    const res = await getChefzAccounts({ page, pageSize });
    const items = res?.items || [];
    if (page === 1) {
      summary = res?.summary || null;
      sponsors = res?.sponsors || [];
      totalCount = res?.totalCount ?? items.length;
    }
    if (items.length === 0) break;

    items.forEach((item) => {
      if (item.accountId && item.riderIqamaNo) {
        registerRiderIqama({
          accountId: item.accountId,
          iqamaNo: item.riderIqamaNo,
        });
      }
    });

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

  return { accounts: all, totalCount, summary, sponsors };
}

/**
 * Fetch all configured Chefz accounts across all pages.
 */
export async function getAllChefzAccounts(pageSize = 100): Promise<ChefzAccount[]> {
  const res = await getAllChefzAccountsWithSummary(pageSize);
  return res.accounts;
}

export async function getChefzAccount(accountId: string): Promise<ChefzAccount | null> {
  try {
    const acc = await authFetch<ChefzAccount>(`/api/chefz/accounts/${encodeURIComponent(accountId)}`);
    if (acc?.accountId && acc.riderIqamaNo) {
      registerRiderIqama({
        accountId: acc.accountId,
        iqamaNo: acc.riderIqamaNo,
      });
    }
    return acc;
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

/**
 * Change lifecycle status: Suspended, Retired, Archived, or Active (to restore automatic status).
 * Sends latest accountRowVersion as rowVersion in the request body.
 */
export async function updateChefzAccountStatus(
  accountId: string,
  data: ChefzAccountStatusRequest
): Promise<ChefzAccount> {
  return authFetch<ChefzAccount>(`/api/chefz/accounts/${encodeURIComponent(accountId)}/status`, {
    method: "PUT",
    body: JSON.stringify(data),
    notifySuccess: "تم تحديث حالة حساب شيفز بنجاح",
  });
}

/**
 * Update the assignment start date (effectiveFrom).
 * PUT /api/chefz/assignments/{assignmentId}/start-date
 * Request: { effectiveFrom: "YYYY-MM-DD", rowVersion: "<assignment rowVersion>" }
 * Concurrency token MUST be the assignment's rowVersion from assignment history.
 * Returns the updated date and row version.
 */
export async function updateChefzAssignmentStartDate(
  assignmentId: string,
  data: UpdateChefzAssignmentStartDateRequest
): Promise<UpdateChefzAssignmentStartDateResponse> {
  return authFetch<UpdateChefzAssignmentStartDateResponse>(
    chefzPaths.assignmentStartDate(assignmentId),
    {
      method: "PUT",
      body: JSON.stringify(data),
      notifySuccess: "تم تحديث تاريخ بدء التكليف بنجاح",
    }
  );
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

/**
 * Fetch all Chefz settlements across all pages.
 */
export async function getAllChefzSettlements(params?: {
  accountId?: string;
  riderId?: string;
  pageSize?: number;
}): Promise<ChefzSettlement[]> {
  const pageSize = params?.pageSize || 100;
  const firstPage = await getChefzSettlements({
    accountId: params?.accountId,
    riderId: params?.riderId,
    page: 1,
    pageSize,
  });
  const items = firstPage?.items || [];
  const totalCount = firstPage?.totalCount;

  if (items.length === 0 || items.length < pageSize) {
    return items;
  }

  if (typeof totalCount === "number" && items.length >= totalCount) {
    return items;
  }

  const all = [...items];
  const seenIds = new Set(items.map((x) => x.id).filter(Boolean));

  if (typeof totalCount === "number" && totalCount > pageSize) {
    const totalPages = Math.min(Math.ceil(totalCount / pageSize), 50);
    const pagePromises: Promise<ChefzPage<ChefzSettlement>>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        getChefzSettlements({
          accountId: params?.accountId,
          riderId: params?.riderId,
          page: p,
          pageSize,
        })
      );
    }
    const otherPages = await Promise.allSettled(pagePromises);
    for (const res of otherPages) {
      if (res.status === "fulfilled" && res.value?.items) {
        for (const item of res.value.items) {
          if (!item?.id || !seenIds.has(item.id)) {
            if (item?.id) seenIds.add(item.id);
            all.push(item);
          }
        }
      }
    }
    return all;
  }

  // Fallback sequential
  let page = 2;
  const maxPages = 50;
  while (page <= maxPages) {
    try {
      const pageRes = await getChefzSettlements({
        accountId: params?.accountId,
        riderId: params?.riderId,
        page,
        pageSize,
      });
      const pageItems = pageRes?.items || [];
      if (pageItems.length === 0) break;

      let newCount = 0;
      for (const item of pageItems) {
        if (!item?.id || !seenIds.has(item.id)) {
          if (item?.id) seenIds.add(item.id);
          all.push(item);
          newCount++;
        }
      }

      if (newCount === 0 || pageItems.length < pageSize) break;
      page++;
    } catch {
      break;
    }
  }

  return all;
}

/**
 * Preview bulk order settlements from an Excel file (.xlsx).
 * Uses multipart FormData without extra JSON headers.
 */
export async function previewChefzOrderSettlements(
  file: File,
  signal?: AbortSignal
): Promise<ChefzOrderSettlementImportResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  return authFetch<ChefzOrderSettlementImportResponse>(chefzPaths.orderSettlementPreview, {
    method: "POST",
    body: form,
    signal,
    suppressErrorToast: true,
  });
}

/**
 * Atomically save bulk order settlements from an Excel file (.xlsx).
 * Uses multipart FormData without extra JSON headers.
 */
export async function importChefzOrderSettlements(
  file: File,
  signal?: AbortSignal
): Promise<ChefzOrderSettlementImportResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  return authFetch<ChefzOrderSettlementImportResponse>(chefzPaths.orderSettlementImport, {
    method: "POST",
    body: form,
    signal,
    suppressErrorToast: true,
  });
}

/**
 * Reopen a saved order settlement batch by its importId.
 */
export async function getChefzOrderSettlementImport(
  importId: string,
  signal?: AbortSignal
): Promise<ChefzOrderSettlementImportResponse> {
  return authFetch<ChefzOrderSettlementImportResponse>(
    chefzPaths.orderSettlementGetImport(importId),
    {
      method: "GET",
      signal,
    }
  );
}


// -------------------------------------------------------------
// 4. Chefz Daily Performance & Import
// -------------------------------------------------------------

export async function uploadChefzPerformance(
  file: File,
  reportDate: string,
  signal?: AbortSignal
): Promise<ChefzImportResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("reportDate", reportDate);

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
  query.set("fromDate", params.from);
  query.set("toDate", params.to);
  query.set("startDate", params.from);
  query.set("endDate", params.to);
  query.set("dateFrom", params.from);
  query.set("dateTo", params.to);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.riderId) query.set("riderId", params.riderId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();
  return authFetch<ChefzPage<ChefzPerformance>>(
    `/api/chefz/performance?${queryString}`
  );
}

/**
 * Fetch all Chefz daily performance records across all pages.
 */
export async function getAllChefzPerformance(params: {
  from: string;
  to: string;
  accountId?: string;
  riderId?: string;
  pageSize?: number;
}): Promise<ChefzPerformance[]> {
  const filterByDateBounds = (list: ChefzPerformance[]) => {
    return list.filter((item) => {
      if (params.from && item.reportDate && item.reportDate < params.from) return false;
      if (params.to && item.reportDate && item.reportDate > params.to) return false;
      return true;
    });
  };

  const pageSize = params?.pageSize || 100;
  const firstPage = await getChefzPerformance({
    ...params,
    page: 1,
    pageSize,
  });
  const items = firstPage?.items || [];
  const totalCount = firstPage?.totalCount;

  if (items.length === 0 || items.length < pageSize) {
    return filterByDateBounds(items);
  }

  if (typeof totalCount === "number" && items.length >= totalCount) {
    return filterByDateBounds(items);
  }

  const all = [...items];
  const seenIds = new Set(items.map((x) => x.id).filter(Boolean));

  if (typeof totalCount === "number" && totalCount > pageSize) {
    const totalPages = Math.min(Math.ceil(totalCount / pageSize), 100);
    const pagePromises: Promise<ChefzPage<ChefzPerformance>>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        getChefzPerformance({
          ...params,
          page: p,
          pageSize,
        })
      );
    }
    const otherPages = await Promise.allSettled(pagePromises);
    for (const res of otherPages) {
      if (res.status === "fulfilled" && res.value?.items) {
        for (const item of res.value.items) {
          if (!item?.id || !seenIds.has(item.id)) {
            if (item?.id) seenIds.add(item.id);
            all.push(item);
          }
        }
      }
    }
    return filterByDateBounds(all);
  }

  // Fallback sequential
  let page = 2;
  const maxPages = 50;
  while (page <= maxPages) {
    try {
      const pageRes = await getChefzPerformance({
        ...params,
        page,
        pageSize,
      });
      const newItems = pageRes?.items || [];
      if (newItems.length === 0) break;
      for (const item of newItems) {
        if (!item?.id || !seenIds.has(item.id)) {
          if (item?.id) seenIds.add(item.id);
          all.push(item);
        }
      }
      if (newItems.length < pageSize) break;
      page++;
    } catch {
      break;
    }
  }

  return filterByDateBounds(all);
}

// -------------------------------------------------------------
// 5. Performance Settings
// -------------------------------------------------------------

export async function getChefzPerformanceSettings(): Promise<ChefzSettingsResponse> {
  return authFetch<ChefzSettingsResponse>("/api/chefz/settings/performance", {
    method: "GET",
  });
}

export async function updateChefzPerformanceSettings(
  data: ChefzSettingsRequest
): Promise<ChefzSettingsResponse> {
  return authFetch<ChefzSettingsResponse>("/api/chefz/settings/performance", {
    method: "PUT",
    body: JSON.stringify(data),
    notifySuccess: "تم حفظ إعدادات الأداء بنجاح",
  });
}

// -------------------------------------------------------------
// 6. Rider / Account Performance Report
// -------------------------------------------------------------

export async function getChefzRiderReport(params: {
  accountId?: string;
  riderId?: string;
  year: number;
  month: number;
  half: number;
  halves: number;
}): Promise<ChefzRiderReport> {
  const query = new URLSearchParams();
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.riderId) query.set("riderId", params.riderId);
  query.set("year", String(params.year));
  query.set("month", String(params.month));
  query.set("half", String(params.half));
  query.set("halves", String(params.halves));

  return authFetch<ChefzRiderReport>(`/api/chefz/reports/riders?${query.toString()}`, {
    method: "GET",
  });
}

/**
 * GET /api/chefz/reports/riders/all?year=...&month=...&half=...&halves=...
 * Chefz all-riders performance report. Returns all matching riders in one request without pagination.
 */
export async function getChefzAllRidersReport(
  params: ChefzAllRidersReportQuery
): Promise<ChefzAllRidersReport> {
  const path = chefzPaths.allRidersReport(params);
  return authFetch<ChefzAllRidersReport>(path, {
    method: "GET",
  });
}

// -------------------------------------------------------------
// 7. Management Report
// -------------------------------------------------------------

export async function getChefzManagementReport(params: {
  reportDate: string;
  sponsorId?: string;
}): Promise<ChefzManagementReport[]> {
  const query = new URLSearchParams();
  query.set("reportDate", params.reportDate);
  if (params.sponsorId) query.set("sponsorId", params.sponsorId);

  return authFetch<ChefzManagementReport[]>(`/api/chefz/reports/management?${query.toString()}`, {
    method: "GET",
  });
}

// -------------------------------------------------------------
// 8. Sponsor Statistics CRUD
// -------------------------------------------------------------

export async function getChefzSponsorStatistics(params?: {
  page?: number;
  pageSize?: number;
}): Promise<ChefzPage<ChefzStatisticsResponse>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();

  return authFetch<ChefzPage<ChefzStatisticsResponse>>(
    `/api/chefz/sponsor-statistics${queryString ? `?${queryString}` : ""}`,
    { method: "GET" }
  );
}

export async function getAllChefzSponsorStatistics(pageSize = 50): Promise<ChefzStatisticsResponse[]> {
  const all: ChefzStatisticsResponse[] = [];
  let page = 1;
  const maxPages = 50;

  while (page <= maxPages) {
    const res = await getChefzSponsorStatistics({ page, pageSize });
    const items = res?.items || [];
    if (items.length === 0) break;

    all.push(...items);

    const actualPageSize = res?.pageSize || pageSize;
    if (items.length < actualPageSize) {
      break;
    }
    page++;
  }

  return all;
}

export async function getChefzSponsorStatistic(sponsorId: string): Promise<ChefzStatisticsResponse> {
  return authFetch<ChefzStatisticsResponse>(
    `/api/chefz/sponsor-statistics/${encodeURIComponent(sponsorId)}`,
    { method: "GET" }
  );
}

export async function createChefzSponsorStatistic(
  sponsorId: string,
  values: ChefzStatisticsRequest
): Promise<ChefzStatisticsResponse> {
  return authFetch<ChefzStatisticsResponse>(
    `/api/chefz/sponsor-statistics/${encodeURIComponent(sponsorId)}`,
    {
      method: "POST",
      body: JSON.stringify(values),
      notifySuccess: "تم إضافة إحصائيات الكفيل بنجاح",
    }
  );
}

export async function updateChefzSponsorStatistic(
  sponsorId: string,
  values: ChefzStatisticsRequest
): Promise<ChefzStatisticsResponse> {
  return authFetch<ChefzStatisticsResponse>(
    `/api/chefz/sponsor-statistics/${encodeURIComponent(sponsorId)}`,
    {
      method: "PUT",
      body: JSON.stringify(values),
      notifySuccess: "تم تحديث إحصائيات الكفيل بنجاح",
    }
  );
}

export async function deleteChefzSponsorStatistic(
  sponsorId: string,
  rowVersion: string
): Promise<void> {
  const query = new URLSearchParams({ rowVersion });
  return authFetch<void>(
    `/api/chefz/sponsor-statistics/${encodeURIComponent(sponsorId)}?${query.toString()}`,
    {
      method: "DELETE",
      notifySuccess: "تم حذف إحصائيات الكفيل بنجاح",
    }
  );
}

// -------------------------------------------------------------
// 9. Chefz Reminders
// -------------------------------------------------------------

export async function getChefzReminders(params?: {
  page?: number;
  pageSize?: number;
}): Promise<ChefzPage<ChefzAccountReminder>> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const queryString = query.toString();

  return authFetch<ChefzPage<ChefzAccountReminder>>(
    `/api/chefz/reminders${queryString ? `?${queryString}` : ""}`,
    { method: "GET" }
  );
}

export async function getAllChefzReminders(pageSize = 100): Promise<ChefzAccountReminder[]> {
  const all: ChefzAccountReminder[] = [];
  let page = 1;
  const maxPages = 50;

  while (page <= maxPages) {
    const res = await getChefzReminders({ page, pageSize });
    const items = res?.items || [];
    if (items.length === 0) break;

    all.push(...items);

    const actualPageSize = res?.pageSize || pageSize;
    if (items.length < actualPageSize) {
      break;
    }
    page++;
  }

  return all;
}
