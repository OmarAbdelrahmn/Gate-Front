// src/lib/ninja/evaluation-client.ts
// Authoritative transport-injected API client, URL query helpers, and domain formatting utilities
// for Ninja performance evaluation and suggested earnings.

import { authFetch, authDownload } from "../auth/api";
import type {
  Guid,
  BusinessDate,
  PricingType,
  EligibilityStatus,
  NinjaEvaluationQuery,
  NinjaEvaluationReport,
  NinjaEvaluationDayDetail,
  NinjaEvaluationDay,
  NinjaEvaluationRow,
  NinjaEvaluationPolicyResponse,
  NinjaEvaluationContextRequest,
  NinjaEvaluationContextResponse,
  NinjaResponsibilityRequest,
  NinjaResponsibilityResponse,
  NinjaSnapshotRequest,
  NinjaSnapshotResponse,
  NinjaPerformanceImportOptions,
  NinjaPerformancePreviewResponse,
  NinjaPerformanceConfirmation,
} from "./evaluation-contracts";

// Inject the application's authenticated transport. It must reject non-success HTTP responses.
export interface NinjaTransport {
  json<T>(path: string, init?: RequestInit): Promise<T>;
  blob(path: string, init?: RequestInit): Promise<Blob>;
}

const root = "/api/ninja";

export function queryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

const body = (method: string, value: object): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(value),
});

export function createNinjaEvaluationClient(http: NinjaTransport) {
  return {
    evaluate: (query: NinjaEvaluationQuery) =>
      http.json<NinjaEvaluationReport>(`${root}/evaluation?${queryString(query)}`),
    day: (id: Guid, date: BusinessDate) =>
      http.json<NinjaEvaluationDayDetail>(
        `${root}/evaluation/accounts/${encodeURIComponent(id)}/days/${encodeURIComponent(date)}`
      ),
    policy: () => http.json<NinjaEvaluationPolicyResponse>(`${root}/evaluation/policy`),
    context: (id: Guid) =>
      http.json<NinjaEvaluationContextResponse>(
        `${root}/evaluation/accounts/${encodeURIComponent(id)}/context`
      ),
    setContext: (id: Guid, request: NinjaEvaluationContextRequest) =>
      http.json<NinjaEvaluationContextResponse>(
        `${root}/evaluation/accounts/${encodeURIComponent(id)}/context`,
        body("PUT", request)
      ),
    responsibility: (id: Guid, year: number, month: number) =>
      http.json<NinjaResponsibilityResponse>(
        `${root}/evaluation/accounts/${encodeURIComponent(id)}/responsibility?${queryString({
          year,
          month,
        })}`
      ),
    setResponsibility: (id: Guid, request: NinjaResponsibilityRequest) =>
      http.json<NinjaResponsibilityResponse>(
        `${root}/evaluation/accounts/${encodeURIComponent(id)}/responsibility`,
        body("PUT", request)
      ),
    export: (query: NinjaEvaluationQuery) =>
      http.blob(`${root}/evaluation/export?${queryString(query)}`),
    snapshot: (request: NinjaSnapshotRequest) =>
      http.json<NinjaSnapshotResponse>(
        `${root}/evaluation/snapshots`,
        body("POST", request)
      ),
    getSnapshot: (id: Guid) =>
      http.json<NinjaSnapshotResponse>(
        `${root}/evaluation/snapshots/${encodeURIComponent(id)}`
      ),
    template: (mode: "Daily" | "MultiDay" = "Daily") =>
      http.blob(`${root}/performance/imports/template?mode=${mode}`),
    preview: (file: File, options: NinjaPerformanceImportOptions) => {
      const form = new FormData();
      form.append("file", file);
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && value !== null && value !== "") {
          form.append(key, String(value));
        }
      }
      return http.json<NinjaPerformancePreviewResponse>(
        `${root}/performance/imports/preview`,
        { method: "POST", body: form }
      );
    },
    confirm: (previewId: Guid, sameFile: File) => {
      const form = new FormData();
      form.append("file", sameFile);
      return http.json<NinjaPerformanceConfirmation>(
        `${root}/performance/imports/${encodeURIComponent(previewId)}/confirm`,
        { method: "POST", body: form }
      );
    },
  };
}

/**
 * Default authenticated transport bound to the ERP frontend's authFetch / authDownload.
 */
export const defaultNinjaTransport: NinjaTransport = {
  json: <T>(path: string, init?: RequestInit) =>
    authFetch<T>(path, { ...init, suppressErrorToast: true }),
  blob: async (path: string) => {
    const res = await authDownload(path);
    return res.blob;
  },
};

export const ninjaEvaluationClient = createNinjaEvaluationClient(defaultNinjaTransport);

/** Load the complete filtered result using the API's supported 100-row pages. */
export async function loadAllNinjaEvaluation(
  query: NinjaEvaluationQuery,
  evaluate = ninjaEvaluationClient.evaluate,
): Promise<NinjaEvaluationReport> {
  const first = await evaluate({ ...query, page: 1, pageSize: 100 });
  const pageSize = first.pageSize;
  if (pageSize < 1) throw new Error("Invalid evaluation page size.");
  const totalPages = Math.ceil(first.summary.totalRows / pageSize);
  const items = [...first.items];
  // Limit concurrency so large filtered reports do not flood the API.
  for (let page = 2; page <= totalPages; page += 3) {
    const pages = await Promise.all(
      Array.from({ length: Math.min(3, totalPages - page + 1) }, (_, offset) =>
        evaluate({ ...query, page: page + offset, pageSize }),
      ),
    );
    for (const result of pages) {
      if (result.summary.totalRows !== first.summary.totalRows) {
        throw new Error("The evaluation results changed while loading. Please refresh. / تغيرت النتائج أثناء التحميل، يرجى التحديث.");
      }
      items.push(...result.items);
    }
  }
  if (items.length !== first.summary.totalRows || new Set(items.map(item => item.key)).size !== items.length) {
    throw new Error("The complete evaluation could not be loaded. Please refresh. / تعذر تحميل جميع النتائج، يرجى التحديث.");
  }
  return { ...first, items, page: 1, pageSize: Math.max(1, items.length) };
}

/**
 * Helper to download the export XLSX with both blob and server filename when available.
 */
export async function downloadNinjaEvaluationExport(
  query: NinjaEvaluationQuery
): Promise<{ blob: Blob; fileName: string }> {
  const exportQuery: NinjaEvaluationQuery = { ...query };
  const qs = queryString(exportQuery);
  const res = await authDownload(`${root}/evaluation/export?${qs}`);
  const fallbackName = `ninja-evaluation-${query.year}-${String(query.month).padStart(
    2,
    "0"
  )}-${query.view || "riders"}.xlsx`;
  const fileName =
    res.fileName && res.fileName !== "document"
      ? res.fileName.endsWith(".xlsx")
        ? res.fileName
        : `${res.fileName}.xlsx`
      : fallbackName;
  return { blob: res.blob, fileName };
}

/**
 * Helper to download the performance import XLSX template with a sensible filename.
 */
export async function downloadNinjaImportTemplate(
  mode: "Daily" | "MultiDay" = "Daily"
): Promise<{ blob: Blob; fileName: string }> {
  const res = await authDownload(`${root}/performance/imports/template?mode=${mode}`);
  const fallbackName =
    mode === "MultiDay"
      ? "ninja-performance-template-multiday.xlsx"
      : "ninja-performance-template-daily.xlsx";
  const fileName =
    res.fileName && res.fileName !== "document"
      ? res.fileName.endsWith(".xlsx")
        ? res.fileName
        : `${res.fileName}.xlsx`
      : fallbackName;
  return { blob: res.blob, fileName };
}

// ---------------------------------------------------------------------------
// Permission Evaluation Helpers (Strict — Never infer import/manage/export from read)
// ---------------------------------------------------------------------------

export interface NinjaEvaluationPermissions {
  canRead: boolean;
  canImport: boolean;
  canManage: boolean;
  canExport: boolean;
}

export function resolveNinjaEvaluationPermissions(
  can: (permission: string) => boolean
): NinjaEvaluationPermissions {
  const canRead = Boolean(can("ninja.read"));
  const canImport = Boolean(can("ninja.performance.import"));
  const canManage = Boolean(can("ninja.evaluation.manage"));
  // Export requires BOTH ninja.read AND ninja.evaluation.export
  const canExport = Boolean(canRead && can("ninja.evaluation.export"));
  return { canRead, canImport, canManage, canExport };
}

// ---------------------------------------------------------------------------
// URL SearchParams Serialization & Parsing (Combines all filters with AND)
// ---------------------------------------------------------------------------

export function parseEvaluationQueryFromSearchParams(
  searchParams: { get(name: string): string | null },
  defaults: { year: number; month: number }
): NinjaEvaluationQuery {
  const rawYear = Number(searchParams.get("year"));
  const rawMonth = Number(searchParams.get("month"));
  const year =
    Number.isInteger(rawYear) && rawYear >= 2020 && rawYear <= 2100
      ? rawYear
      : defaults.year;
  const month =
    Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth
      : defaults.month;

  const query: NinjaEvaluationQuery = {
    year,
    month,
  };

  const asOf = searchParams.get("asOf")?.trim();
  if (asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    query.asOf = asOf;
  }

  const view = searchParams.get("view")?.trim();
  query.view = view === "accounts" ? "accounts" : "riders";

  const accountId = searchParams.get("accountId")?.trim();
  if (accountId) query.accountId = accountId;

  const riderId = searchParams.get("riderId")?.trim();
  if (riderId) query.riderId = riderId;

  const cityId = searchParams.get("cityId")?.trim();
  if (cityId) query.cityId = cityId;

  const sponsorId = searchParams.get("sponsorId")?.trim();
  if (sponsorId) query.sponsorId = sponsorId;

  const pricingType = searchParams.get("pricingType")?.trim();
  if (pricingType === "BIKE" || pricingType === "CAR") {
    query.pricingType = pricingType;
  }

  const status = searchParams.get("status")?.trim();
  if (
    status === "TargetAchieved" ||
    status === "BelowTarget" ||
    status === "Unknown"
  ) {
    query.status = status;
  }

  const search = searchParams.get("search")?.trim();
  if (search) {
    query.search = search.slice(0, 200);
  }

  const rawPage = Number(searchParams.get("page"));
  query.page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 100000 ? rawPage : 1;

  const rawPageSize = Number(searchParams.get("pageSize"));
  query.pageSize =
    Number.isInteger(rawPageSize) && rawPageSize >= 1 && rawPageSize <= 100
      ? rawPageSize
      : 50;

  return query;
}

export function buildEvaluationUrlSearchParams(
  query: NinjaEvaluationQuery
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("year", String(query.year));
  params.set("month", String(query.month));
  if (query.asOf) params.set("asOf", query.asOf);
  if (query.view) params.set("view", query.view);
  if (query.accountId) params.set("accountId", query.accountId);
  if (query.riderId) params.set("riderId", query.riderId);
  if (query.cityId) params.set("cityId", query.cityId);
  if (query.sponsorId) params.set("sponsorId", query.sponsorId);
  if (query.pricingType) params.set("pricingType", query.pricingType);
  if (query.status) params.set("status", query.status);
  if (query.search && query.search.trim()) {
    params.set("search", query.search.trim().slice(0, 200));
  }
  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize && query.pageSize !== 50) {
    params.set("pageSize", String(query.pageSize));
  }
  return params;
}

// ---------------------------------------------------------------------------
// Required Labels, Formatting & Domain Logic Helpers
// ---------------------------------------------------------------------------

export const NINJA_EVALUATION_REQUIRED_LABELS = {
  ar: {
    suggestedThroughCutoff: "المبلغ المقترح حتى حد البيانات",
    projectedAmountIfPaceContinues: "المبلغ المتوقع إذا استمر المعدل الحالي",
    orderAmountBeforeAttendance: "الاقتراح حسب الطلبات قبل تعديل الحضور",
    attendanceReduction15: "تخفيض تقديري للحضور 15%",
    invoicePending: "بانتظار فاتورة نينجا الشهرية",
    basedOnOrdersAndHoursOnly: "تقديري — مبني على الطلبات والساعات فقط",
    unavailableData: "غير متاح / غير محسوم",
    noTimeRemaining: "لا وقت متبقٍ",
    unreliableContinuationTitle:
      "سيناريو استمراري غير موثوق (يوجد فجوة في تغطية البيانات)",
  },
  en: {
    suggestedThroughCutoff: (asOf?: string) =>
      asOf ? `Suggested amount through ${asOf}` : "Suggested amount through cutoff",
    projectedAmountIfPaceContinues: "Projected amount if current pace continues",
    orderAmountBeforeAttendance: "Suggested order amount before attendance adjustment",
    attendanceReduction15: "Estimated 15% attendance reduction",
    invoicePending: "Awaiting Ninja’s monthly invoice",
    basedOnOrdersAndHoursOnly: "Based on orders and hours only",
    unavailableData: "Unavailable / unresolved",
    noTimeRemaining: "No time remaining",
    unreliableContinuationTitle:
      "Unreliable continuation scenario (coverage gap present)",
  },
} as const;

/**
 * Formats a nullable money value. Never turns null/undefined into 0!
 */
export function formatSuggestedCurrency(
  amount: number | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return locale === "ar"
      ? NINJA_EVALUATION_REQUIRED_LABELS.ar.unavailableData
      : NINJA_EVALUATION_REQUIRED_LABELS.en.unavailableData;
  }
  const raw = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const formatted = raw.replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)));
  return locale === "ar" ? `${formatted} ر.س` : `${formatted} SAR`;
}

/**
 * Formats a nullable number (orders, hours, target, gap, rate) without turning null into 0.
 */
export function formatNullableMetric(
  value: number | null | undefined,
  locale: "ar" | "en" = "ar",
  decimals = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return locale === "ar" ? "غير متاح" : "Unavailable";
  }
  const isInteger = Number.isInteger(value);
  const raw = value.toLocaleString("en-US", {
    minimumFractionDigits: isInteger ? 0 : 0,
    maximumFractionDigits: isInteger ? 0 : decimals,
  });
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return raw.replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)));
}

/**
 * Formats a decimal hours value into hours and minutes duration format H:MM (e.g. 8.8 -> "8:48", 8.75 -> "8:45").
 * Always outputs English digits.
 */
export function formatHoursAsDuration(
  hours: number | null | undefined,
  fallback = "—"
): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return fallback;
  }
  const isNegative = hours < 0;
  const abs = Math.abs(hours);
  let h = Math.floor(abs);
  let m = Math.round((abs - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return `${isNegative ? "-" : ""}${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Formats requiredDailyRate, returning "لا وقت متبقٍ" when assignment ended (null) with unmet target.
 */
export function formatRequiredDailyRate(
  requiredDailyRate: number | null | undefined,
  remainingOrders: number | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  if (requiredDailyRate === null || requiredDailyRate === undefined) {
    if ((remainingOrders ?? 0) > 0) {
      return locale === "ar"
        ? "لا وقت متبقٍ (No time remaining)"
        : "No time remaining (لا وقت متبقٍ)";
    }
    return locale === "ar" ? "الهدف محقق / الفترة منتهية" : "Target met / Period ended";
  }
  const formatted = formatNullableMetric(requiredDailyRate, locale, 2);
  return locale === "ar" ? `${formatted} طلب/يوم` : `${formatted} orders/day`;
}

/**
 * Generates consecutive calendar dates (YYYY-MM-DD) for a given year and month.
 */
export function getMonthCalendarDates(year: number, month: number): BusinessDate[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const dates: BusinessDate[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${ym}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}

/**
 * Groups a row's daily cells into subrows by accountId + assignmentId + captainId when a rider
 * worked across multiple accounts or multiple responsibility periods.
 */
export interface NinjaRowBreakdownSubrow {
  subrowKey: string;
  accountId: Guid;
  captainId: string;
  assignmentId: Guid | null;
  pricingTypes: PricingType[];
  fromDate: BusinessDate;
  toDate: BusinessDate;
  daysByDate: Record<BusinessDate, NinjaEvaluationDay>;
  totalOrders: number;
  totalHours: number;
  totalResponsibility: number;
  totalTarget: number | null;
  hasMissingCoverage: boolean;
}

export function buildRowBreakdownSubrows(
  row: NinjaEvaluationRow
): NinjaRowBreakdownSubrow[] {
  if (!row.days || row.days.length === 0) return [];

  const groups = new Map<string, NinjaEvaluationDay[]>();
  for (const day of row.days) {
    // Only group active/scheduled/recorded cells or group by accountId + assignmentId
    const key = `${day.accountId}::${day.captainId || ""}::${day.assignmentId || "account"}`;
    const list = groups.get(key) || [];
    list.push(day);
    groups.set(key, list);
  }

  const subrows: NinjaRowBreakdownSubrow[] = [];
  for (const [key, days] of groups.entries()) {
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const activeDays = sorted.filter(
      (d) =>
        d.hoursStatus !== "NotScheduled" ||
        (d.orders !== null && d.orders > 0) ||
        (d.hours !== null && d.hours > 0) ||
        (d.responsibility !== null && d.responsibility > 0)
    );
    const refDays = activeDays.length > 0 ? activeDays : sorted;
    const first = refDays[0];
    const last = refDays[refDays.length - 1];
    const pricingSet = new Set<PricingType>();
    const daysByDate: Record<BusinessDate, NinjaEvaluationDay> = {};
    let totalOrders = 0;
    let totalHours = 0;
    let totalResponsibility = 0;
    let totalTarget = 0;
    let hasAnyTarget = false;
    let hasMissingCoverage = false;

    for (const d of sorted) {
      daysByDate[d.date] = d;
      if (d.pricingType) pricingSet.add(d.pricingType);
      if (d.orders !== null && d.orders !== undefined) totalOrders += d.orders;
      if (d.hours !== null && d.hours !== undefined) totalHours += d.hours;
      if (d.responsibility !== null && d.responsibility !== undefined) {
        totalResponsibility += d.responsibility;
      }
      if (d.target !== null && d.target !== undefined) {
        totalTarget += d.target;
        hasAnyTarget = true;
      }
      if (d.coverage !== "Complete" && d.hoursStatus !== "NotScheduled") {
        hasMissingCoverage = true;
      }
    }

    subrows.push({
      subrowKey: key,
      accountId: first.accountId,
      captainId: first.captainId,
      assignmentId: first.assignmentId,
      pricingTypes: Array.from(pricingSet),
      fromDate: first.date,
      toDate: last.date,
      daysByDate,
      totalOrders,
      totalHours,
      totalResponsibility,
      totalTarget: hasAnyTarget ? totalTarget : null,
      hasMissingCoverage,
    });
  }

  return subrows.sort((a, b) => a.fromDate.localeCompare(b.fromDate));
}

export function getHoursStatusLabel(
  status: NinjaEvaluationDay["hoursStatus"],
  locale: "ar" | "en" = "ar"
): { label: string; shortLabel: string; variant: "emerald" | "amber" | "rose" | "slate" | "blue" } {
  switch (status) {
    case "Qualified":
      return {
        label: locale === "ar" ? "ساعات مكتملة (≥8س)" : "Qualified (≥8h)",
        shortLabel: locale === "ar" ? "مؤهل" : "Qual",
        variant: "emerald",
      };
    case "ShortHours":
      return {
        label: locale === "ar" ? "ساعات ناقصة (<8س)" : "Short Hours (<8h)",
        shortLabel: locale === "ar" ? "ناقص" : "Short",
        variant: "amber",
      };
    case "PartialShiftUnknown":
      return {
        label:
          locale === "ar"
            ? "يوم مقسوم غير محسوم الأهلية"
            : "Partial Shift Unknown",
        shortLabel: locale === "ar" ? "مقسوم؟" : "Split?",
        variant: "blue",
      };
    case "NotScheduled":
      return {
        label: locale === "ar" ? "غير مجدول" : "Not Scheduled",
        shortLabel: locale === "ar" ? "غير مجدول" : "Off",
        variant: "slate",
      };
    case "Unknown":
    default:
      return {
        label: locale === "ar" ? "غير متاح / غير محسوم" : "Unknown",
        shortLabel: locale === "ar" ? "غير متاح" : "Unk",
        variant: "rose",
      };
  }
}

export function getCoverageStatusLabel(
  coverage: NinjaEvaluationDay["coverage"],
  locale: "ar" | "en" = "ar"
): { label: string; shortLabel: string; variant: "emerald" | "amber" | "rose" } {
  switch (coverage) {
    case "Complete":
      return {
        label: locale === "ar" ? "تغطية مكتملة" : "Complete Coverage",
        shortLabel: locale === "ar" ? "مكتمل" : "OK",
        variant: "emerald",
      };
    case "AllocationMismatch":
      return {
        label:
          locale === "ar"
            ? "عدم تطابق الحصص مع المصدر"
            : "Allocation Mismatch",
        shortLabel: locale === "ar" ? "تعارض حصص" : "Mismatch",
        variant: "rose",
      };
    case "Missing":
    default:
      return {
        label: locale === "ar" ? "بيانات أداء غير واردة" : "Missing Performance",
        shortLabel: locale === "ar" ? "مفقود" : "Missing",
        variant: "amber",
      };
  }
}

export function getAllocationOriginLabel(
  origin: NinjaEvaluationDay["allocationOrigin"],
  locale: "ar" | "en" = "ar"
): string {
  switch (origin) {
    case "Reported":
      return locale === "ar" ? "مُبلّغ مباشرة من الشيت (Reported)" : "Reported from sheet";
    case "Declared":
      return locale === "ar" ? "حصة مصرح بها يدوياً (Declared)" : "Declared handover share";
    case "Remainder":
      return locale === "ar" ? "المتبقي للمندوب الأخير (Remainder)" : "Remainder to last holder";
    case "LegacyUnknown":
    default:
      return locale === "ar" ? "سجل قديم غير محدد المنشأ (LegacyUnknown)" : "Legacy unknown origin";
  }
}

export function getOrderBandLabel(
  band: "AboveTarget" | "TargetAchieved" | "Shortage10" | "Shortage20" | "Shortage30" | "PerOrderFallback",
  locale: "ar" | "en" = "ar"
): string {
  switch (band) {
    case "AboveTarget":
      return locale === "ar" ? "فوق الهدف (مكافأة طلبات إضافية)" : "Above Target (Bonus)";
    case "TargetAchieved":
      return locale === "ar" ? "تحقيق الهدف الكامل" : "Target Achieved";
    case "Shortage10":
      return locale === "ar" ? "عجز ≤ 10% (الشريحة الأولى)" : "Shortage ≤ 10% (Band 1)";
    case "Shortage20":
      return locale === "ar" ? "عجز > 10% إلى 20% (الشريحة الثانية)" : "Shortage 10%–20% (Band 2)";
    case "Shortage30":
      return locale === "ar" ? "عجز > 20% إلى 30% (الشريحة الثالثة)" : "Shortage 20%–30% (Band 3)";
    case "PerOrderFallback":
      return locale === "ar" ? "عجز > 30% (حساب بالطلب المكتمل)" : "Shortage > 30% (Per-Order Fallback)";
  }
}

export function getForecastAssumptionLabel(
  assumption: "PeriodEnded" | "ContinueCurrentAssignment" | "ThroughKnownAssignmentEnd",
  locale: "ar" | "en" = "ar"
): string {
  switch (assumption) {
    case "PeriodEnded":
      return locale === "ar"
        ? "انتهت فترة التكليف / الشهر (PeriodEnded)"
        : "Assignment or month period ended (PeriodEnded)";
    case "ContinueCurrentAssignment":
      return locale === "ar"
        ? "افتراض استمرار التكليف الحالي لنهاية الشهر (ليس وعداً بإسناد مستقبلي)"
        : "Assumes current open assignment continues through month-end (ContinueCurrentAssignment)";
    case "ThroughKnownAssignmentEnd":
      return locale === "ar"
        ? "حتى تاريخ نهاية التكليف المعروف (ThroughKnownAssignmentEnd)"
        : "Projected through known assignment end date (ThroughKnownAssignmentEnd)";
  }
}

export function getEligibilityStatusLabel(
  status: EligibilityStatus,
  locale: "ar" | "en" = "ar"
): { label: string; variant: "emerald" | "rose" | "amber" } {
  switch (status) {
    case "Pass":
      return {
        label: locale === "ar" ? "مستوفٍ (≥85%)" : "Pass (≥85%)",
        variant: "emerald",
      };
    case "Fail":
      return {
        label: locale === "ar" ? "غير مستوفٍ (<85%)" : "Fail (<85%)",
        variant: "rose",
      };
    case "Unknown":
    default:
      return {
        label: locale === "ar" ? "غير محسوم (Unknown)" : "Unknown",
        variant: "amber",
      };
  }
}

export function getPreviewRowStatusMeta(
  status:
    | "New"
    | "Identical"
    | "Conflict"
    | "UnknownAccount"
    | "UnresolvedAllocation"
    | "Invalid",
  locale: "ar" | "en" = "ar"
): { label: string; variant: "emerald" | "blue" | "amber" | "rose" | "slate"; isBlocking: boolean } {
  switch (status) {
    case "New":
      return {
        label: locale === "ar" ? "سجل جديد (New)" : "New",
        variant: "emerald",
        isBlocking: false,
      };
    case "Identical":
      return {
        label: locale === "ar" ? "مطابق للمحفوظ (Identical - يُتخطى)" : "Identical (Skipped)",
        variant: "slate",
        isBlocking: false,
      };
    case "Conflict":
      return {
        label: locale === "ar" ? "تعارض مع بيانات محفوظة (Conflict)" : "Conflict",
        variant: "rose",
        isBlocking: true,
      };
    case "UnknownAccount":
      return {
        label: locale === "ar" ? "حساب كابتن غير معروف (UnknownAccount)" : "Unknown Account",
        variant: "rose",
        isBlocking: true,
      };
    case "UnresolvedAllocation":
      return {
        label:
          locale === "ar"
            ? "تعيين أو توزيع يوم مشترك غير محسوم (UnresolvedAllocation)"
            : "Unresolved Allocation / Missing Assignment",
        variant: "amber",
        isBlocking: true,
      };
    case "Invalid":
    default:
      return {
        label: locale === "ar" ? "بيانات غير صالحة (Invalid)" : "Invalid Row",
        variant: "rose",
        isBlocking: true,
      };
  }
}
