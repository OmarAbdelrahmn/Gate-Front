// src/lib/hunger/api.ts
// API Client & Helpers for Hungerstation (/api/hunger/* & shared /api/platform-accounts/*)

import { authFetch, authDownload, type CustomRequestInit } from "../auth/api";
import { getPlatforms, type PlatformResponse } from "../platforms/api";
import type { PlatformAssignmentLimit } from "../platforms/capacity";
import type {
  HungerAccountItem,
  HungerAccountsFilterParams,
  HungerActualVehicleCustodyStatus,
  HungerActualVehicleOwnership,
  HungerActualVehiclePeriod,
  HungerAlertKind,
  HungerAlertMetric,
  HungerAlertOperator,
  HungerAlertPeriod,
  HungerAlertRuleCode,
  HungerAlertRuleCreateRequest,
  HungerAlertRuleItem,
  HungerAlertSeverity,
  HungerCompensationModel,
  HungerDeferredReminderItem,
  HungerDispositionUpdateRequest,
  HungerFinanceConfigurationRequest,
  HungerFinanceConfigurationResponse,
  HungerFinanceEventCreateRequest,
  HungerFinanceEventItem,
  HungerFinanceEventsListResponse,
  HungerFinancialEventKind,
  HungerManualComparisonRequest,
  HungerMonthlySummaryResponse,
  HungerOperationalDisposition,
  HungerOperationsImportConfirmResponse,
  HungerOperationsImportPreviewResponse,
  HungerOperationsReportItem,
  HungerPagedResponse,
  HungerPendingCollectionsResponse,
  HungerPerformanceQuery,
  HungerPerformanceReportResponse,
  HungerPerformanceRowItem,
  HungerPersonSummary,
  HungerPotentialFineItem,
  HungerPotentialFineResolveRequest,
  HungerQualityImportPreviewResponse,
  HungerQualityImportResultResponse,
  HungerQualityReallocateRequest,
  HungerQualityReportItem,
  HungerRemittanceActionRequest,
  HungerRemittanceConfirmRequest,
  HungerRemittanceCreateRequest,
  HungerRemittanceResponse,
  HungerRemittanceSourceLineItem,
  HungerRemittanceStatus,
  HungerRiderSwapConfirmResponse,
  HungerRiderSwapReviewRequest,
  HungerRiderSwapReviewResponse,
  HungerSeedImportConfirmRequest,
  HungerSeedImportConfirmResponse,
  HungerSeedImportPreviewResponse,
  HungerSettlementDocumentCreateRequest,
  HungerSettlementDocumentItem,
  HungerSettlementDocumentKind,
  HungerSettlementReconcileRequest,
  HungerSimContext,
  HungerSimOwnership,
  HungerWalletHistoryEventItem,
  HungerWalletHistoryResponse,
  HungerWalletListItem,
  HungerWalletObservationItem,
  HungerWalletReceiptState,
  HungerWalletReviewRequest,
  HungerWalletReviewResponse,
  HungerWalletsQuery,
  HungerWithdrawalActionRequest,
  HungerWithdrawalStatus,
  PlatformAccountBusinessContextResponse,
  PlatformAccountBusinessUpdateRequest,
  PlatformAccountCredentialRevealResponse,
  SimOwnershipUpdateRequest,
} from "./types";

export * from "./types";

const BASE = "/api/hunger";

export type BadgeTone = "blue" | "green" | "orange" | "red" | "gray" | "purple";

async function downloadFileFromEndpoint(
  path: string,
  fallbackFileName: string,
): Promise<void> {
  const { blob, fileName } = await authDownload(path);
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    fileName && fileName !== "document" ? fileName : fallbackFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ---------------------------------------------------------------------------
// Helpers & Label Formatters
// ---------------------------------------------------------------------------

export function generateHungerIdempotencyKey(prefix = "hng"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`.slice(0, 140);
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getRiyadhTodayIso(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function getRiyadhCurrentMonthStartIso(): string {
  const today = getRiyadhTodayIso();
  return `${today.slice(0, 7)}-01`;
}

export function normalizeMonthStartIso(monthValue: string): string {
  const trimmed = (monthValue || "").trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed.slice(0, 7)}-01`;
  }
  return getRiyadhCurrentMonthStartIso();
}

export async function getHungerPlatform(): Promise<PlatformResponse | null> {
  try {
    const platforms = await getPlatforms();
    const list = Array.isArray(platforms) ? platforms : [];
    const match = list.find((p) => {
      const code = (p.code || "").toLowerCase();
      const nameEn = (p.nameEn || "").toLowerCase();
      const nameAr = p.nameAr || "";
      return (
        code.includes("hunger") ||
        nameEn.includes("hunger") ||
        nameAr.includes("هنقر") ||
        nameAr.includes("هنجر")
      );
    });
    return match ?? list[0] ?? null;
  } catch {
    return null;
  }
}

export const HUNGER_DISPOSITIONS: Array<{
  value: HungerOperationalDisposition;
  labelAr: string;
  labelEn: string;
  badgeTone: BadgeTone;
}> = [
  {
    value: "Normal",
    labelAr: "يعمل (نشط تشغيلياً)",
    labelEn: "Working (Normal)",
    badgeTone: "green",
  },
  {
    value: "Problem",
    labelAr: "مشكلة تشغيلية",
    labelEn: "Operational Problem",
    badgeTone: "orange",
  },
  {
    value: "AdministrativeStop",
    labelAr: "إيقاف إداري",
    labelEn: "Administrative Stop",
    badgeTone: "blue",
  },
  {
    value: "Blocked",
    labelAr: "محظور (باند)",
    labelEn: "Blocked",
    badgeTone: "red",
  },
  {
    value: "DeferredNextMonth",
    labelAr: "مؤجل للشهر القادم",
    labelEn: "Deferred to Next Month",
    badgeTone: "gray",
  },
];

export function getDispositionMeta(disposition?: string | null) {
  const normalized = (disposition || "Unknown").trim();
  if (!normalized || normalized.toLowerCase() === "unknown") {
    return {
      value: "Unknown" as const,
      labelAr: "غير مصنف (Unknown)",
      labelEn: "Unknown",
      badgeTone: "gray" as BadgeTone,
    };
  }
  const found = HUNGER_DISPOSITIONS.find(
    (d) => d.value.toLowerCase() === normalized.toLowerCase(),
  );
  return (
    found ?? {
      value: normalized as HungerOperationalDisposition,
      labelAr: normalized,
      labelEn: normalized,
      badgeTone: "gray" as BadgeTone,
    }
  );
}

export const HUNGER_COMPENSATION_MODELS: Array<{
  value: HungerCompensationModel;
  labelAr: string;
  labelEn: string;
}> = [
  { value: "Commission", labelAr: "عمولة (Commission)", labelEn: "Commission" },
  { value: "Target", labelAr: "تارجت / راتب (Target)", labelEn: "Target" },
  { value: "Unknown", labelAr: "غير محدد", labelEn: "Unknown" },
];

export function getCompensationModelLabel(
  model?: string | null,
  isEn = false,
): string {
  const found = HUNGER_COMPENSATION_MODELS.find(
    (m) => m.value.toLowerCase() === (model || "").toLowerCase(),
  );
  if (!found) return model || (isEn ? "Unspecified" : "غير محدد");
  return isEn ? found.labelEn : found.labelAr;
}

export const HUNGER_SIM_OWNERSHIPS: Array<{
  value: HungerSimOwnership;
  labelAr: string;
  labelEn: string;
}> = [
  { value: "Company", labelAr: "شريحة شركة", labelEn: "Company SIM" },
  { value: "Personal", labelAr: "شريحة شخصية (Personal)", labelEn: "Personal SIM" },
  { value: "Private", labelAr: "شريحة خاصة (Private)", labelEn: "Private SIM" },
  { value: "Rider", labelAr: "شريحة مندوب", labelEn: "Rider SIM" },
  { value: "External", labelAr: "طرف خارجي", labelEn: "External" },
  { value: "Mixed", labelAr: "متعدد (Mixed)", labelEn: "Mixed" },
  { value: "Unknown", labelAr: "غير معروف", labelEn: "Unknown" },
];

export const HUNGER_ACTUAL_VEHICLE_CUSTODY_STATUSES: Array<{
  value: HungerActualVehicleCustodyStatus;
  labelAr: string;
  labelEn: string;
  badgeTone: BadgeTone;
}> = [
  {
    value: "None",
    labelAr: "لا توجد عهدة موثقة",
    labelEn: "None",
    badgeTone: "blue",
  },
  {
    value: "Assigned",
    labelAr: "عهدة مركبة مسندة (Assigned)",
    labelEn: "Assigned",
    badgeTone: "green",
  },
  {
    value: "Mixed",
    labelAr: "متعدد",
    labelEn: "Mixed",
    badgeTone: "orange",
  },
  {
    value: "Unknown",
    labelAr: "غير معروف",
    labelEn: "Unknown",
    badgeTone: "red",
  },
];

export function getActualVehicleCustodyStatusMeta(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "none") {
    return {
      value: "None" as const,
      labelAr: "لا توجد عهدة موثقة",
      labelEn: "None",
      badgeTone: "blue" as BadgeTone,
      className:
        "border border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    };
  }
  if (normalized === "assigned") {
    return {
      value: "Assigned" as const,
      labelAr: "عهدة مركبة مسندة (Assigned)",
      labelEn: "Assigned",
      badgeTone: "green" as BadgeTone,
      className:
        "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }
  if (normalized === "mixed") {
    return {
      value: "Mixed" as const,
      labelAr: "متعدد",
      labelEn: "Mixed",
      badgeTone: "orange" as BadgeTone,
      className:
        "border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }
  return {
    value: "Unknown" as const,
    labelAr: "غير معروف",
    labelEn: "Unknown",
    badgeTone: "red" as BadgeTone,
    className:
      "border border-dashed border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  };
}

export const HUNGER_ACTUAL_VEHICLE_OWNERSHIPS: Array<{
  value: HungerActualVehicleOwnership;
  labelAr: string;
  labelEn: string;
  badgeTone: BadgeTone;
}> = [
  {
    value: "Company",
    labelAr: "ملكية شركة (Company)",
    labelEn: "Company",
    badgeTone: "green",
  },
  {
    value: "Private",
    labelAr: "ملكية خاصة (Private)",
    labelEn: "Private",
    badgeTone: "purple",
  },
  {
    value: "Mixed",
    labelAr: "متعدد (Mixed)",
    labelEn: "Mixed",
    badgeTone: "orange",
  },
  {
    value: "Unknown",
    labelAr: "غير معروف",
    labelEn: "Unknown",
    badgeTone: "gray",
  },
];

export function getActualVehicleOwnershipMeta(ownership?: string | null) {
  const normalized = (ownership || "").trim().toLowerCase();
  const found = HUNGER_ACTUAL_VEHICLE_OWNERSHIPS.find(
    (o) => o.value.toLowerCase() === normalized,
  );
  return (
    found ?? {
      value: "Unknown" as const,
      labelAr: "غير معروف",
      labelEn: "Unknown",
      badgeTone: "gray" as BadgeTone,
    }
  );
}

export function getWithdrawalStatusMeta(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "pendingarrival") {
    return {
      value: "PendingArrival" as HungerWithdrawalStatus,
      labelAr: "انتظار الوصول",
      labelEn: "Pending Arrival",
      badgeTone: "orange" as BadgeTone,
    };
  }
  if (normalized === "arrived") {
    return {
      value: "Arrived" as HungerWithdrawalStatus,
      labelAr: "وصل",
      labelEn: "Arrived",
      badgeTone: "green" as BadgeTone,
    };
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return {
      value: "Cancelled" as HungerWithdrawalStatus,
      labelAr: "ملغي",
      labelEn: "Cancelled",
      badgeTone: "red" as BadgeTone,
    };
  }
  return {
    value: "PendingArrival" as HungerWithdrawalStatus,
    labelAr: status || "انتظار الوصول",
    labelEn: status || "Pending Arrival",
    badgeTone: "orange" as BadgeTone,
  };
}

export function getRemittanceStatusMeta(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "draft") {
    return {
      value: "Draft" as HungerRemittanceStatus,
      labelAr: "مسودة (Draft)",
      labelEn: "Draft",
      badgeTone: "gray" as BadgeTone,
    };
  }
  if (normalized === "submitted" || normalized === "pendingconfirmation") {
    return {
      value: "Submitted" as HungerRemittanceStatus,
      labelAr: "مُرسل للمحاسب (Submitted)",
      labelEn: "Submitted",
      badgeTone: "blue" as BadgeTone,
    };
  }
  if (normalized === "partiallyconfirmed") {
    return {
      value: "PartiallyConfirmed" as HungerRemittanceStatus,
      labelAr: "مؤكد جزئيًا (PartiallyConfirmed)",
      labelEn: "Partially Confirmed",
      badgeTone: "orange" as BadgeTone,
    };
  }
  if (normalized === "confirmed" || normalized === "posted") {
    return {
      value: "Confirmed" as HungerRemittanceStatus,
      labelAr: "مؤكد بالكامل (Confirmed)",
      labelEn: "Confirmed",
      badgeTone: "green" as BadgeTone,
    };
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return {
      value: "Cancelled" as HungerRemittanceStatus,
      labelAr: "ملغي (Cancelled)",
      labelEn: "Cancelled",
      badgeTone: "red" as BadgeTone,
    };
  }
  return {
    value: (status || "Submitted") as HungerRemittanceStatus,
    labelAr: status || "غير محدد",
    labelEn: status || "Unknown",
    badgeTone: "gray" as BadgeTone,
  };
}

export function getHungerErrorMessage(
  err: unknown,
  fallback = "تعذر تنفيذ العملية",
): string {
  const status = (err as { status?: number })?.status;
  if (status === 403) {
    return "ليس لديك صلاحية تنفيذ هذه العملية.";
  }
  if (status === 413) {
    return "حجم الطلب تجاوز الحد المسموح به (6 ميجابايت). يرجى تقليل حجم صورة إثبات المحفظة.";
  }
  const details =
    (err as { details?: Record<string, unknown> })?.details ||
    (err as Record<string, unknown>);
  const errorCode = String(
    details?.errorCode || (err as { code?: string })?.code || "",
  );
  if (errorCode === "files.invalid_file") {
    return "صورة الإثبات غير صالحة أو غير مدعومة. يرجى اختيار صورة بصيغة (JPEG, PNG, WebP, GIF, BMP) لا يتجاوز حجمها 5 ميجابايت.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export function isWalletReviewExpiredOrSuperseded(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const code = String((err as { code?: string })?.code || "").toLowerCase();
  const msg = String(
    err instanceof Error ? err.message : err || "",
  ).toLowerCase();
  const detailsStr = JSON.stringify(
    (err as { details?: unknown })?.details || {},
  ).toLowerCase();

  if (
    code.includes("expired") ||
    code.includes("superseded") ||
    code.includes("stale") ||
    msg.includes("expired") ||
    msg.includes("superseded") ||
    msg.includes("stale") ||
    msg.includes("انتهت صلاحية") ||
    msg.includes("استبدل") ||
    detailsStr.includes("expired") ||
    detailsStr.includes("superseded") ||
    status === 409
  ) {
    return true;
  }
  return false;
}

export const HUNGER_FINANCIAL_EVENT_KINDS: Array<{
  value: HungerFinancialEventKind;
  labelAr: string;
  labelEn: string;
  badgeTone: BadgeTone;
}> = [
  {
    value: "Funding",
    labelAr: "تمويل عهدة المشرف",
    labelEn: "Supervisor Custody Funding",
    badgeTone: "blue",
  },
  {
    value: "TopUpAdvance",
    labelAr: "شحن محفظة مقدمًا (سلفة)",
    labelEn: "Wallet Top-Up (Advance)",
    badgeTone: "orange",
  },
  {
    value: "TopUpCollected",
    labelAr: "شحن محفظة مقابل تحصيل",
    labelEn: "Wallet Top-Up (Collected)",
    badgeTone: "green",
  },
  {
    value: "Collection",
    labelAr: "تحصيل نقدي من المندوب",
    labelEn: "Rider Cash Collection",
    badgeTone: "green",
  },
  {
    value: "WithdrawalCompany",
    labelAr: "سحب رصيد لحساب الشركة",
    labelEn: "Withdrawal to Company",
    badgeTone: "purple",
  },
  {
    value: "WithdrawalSupervisor",
    labelAr: "سحب رصيد لعهدة المشرف",
    labelEn: "Withdrawal to Supervisor",
    badgeTone: "orange",
  },
  {
    value: "RiderPayment",
    labelAr: "صرف مستحقات للمندوب",
    labelEn: "Rider Payout / Payment",
    badgeTone: "red",
  },
];

export function getFinancialEventKindMeta(kind?: string | null) {
  const found = HUNGER_FINANCIAL_EVENT_KINDS.find(
    (k) => k.value.toLowerCase() === (kind || "").toLowerCase(),
  );
  return (
    found ?? {
      value: (kind as HungerFinancialEventKind) || "Collection",
      labelAr: kind || "حركة مالية",
      labelEn: kind || "Financial Event",
      badgeTone: "gray" as BadgeTone,
    }
  );
}

export const HUNGER_SETTLEMENT_DOCUMENT_KINDS: Array<{
  value: HungerSettlementDocumentKind;
  labelAr: string;
  labelEn: string;
}> = [
  { value: "Invoice", labelAr: "فاتورة ضريبية (Invoice)", labelEn: "Invoice" },
  {
    value: "MonthClose",
    labelAr: "إقفال شهري (Month Close)",
    labelEn: "Month Close",
  },
  {
    value: "Adjustment",
    labelAr: "تسوية / تعديل (Adjustment)",
    labelEn: "Adjustment",
  },
];

export const HUNGER_ALERT_RULE_CODES: Array<{
  value: HungerAlertRuleCode;
  labelAr: string;
  labelEn: string;
  defaultHintAr: string;
}> = [
  {
    value: "HoursCritical",
    labelAr: "تنبيه ساعات العمل الحرج (HoursCritical)",
    labelEn: "Critical Working Hours (HoursCritical)",
    defaultHintAr: "الافتراضي: أقل من 8 ساعات عمل يوميًا",
  },
  {
    value: "HoursFollowUp",
    labelAr: "تنبيه متابعة ساعات العمل (HoursFollowUp)",
    labelEn: "Follow-up Working Hours (HoursFollowUp)",
    defaultHintAr: "الافتراضي: أقل من 10 ساعات عمل يوميًا",
  },
  {
    value: "NoShowPositive",
    labelAr: "تنبيه عدم الحضور / الشفتات الفائتة (NoShowPositive)",
    labelEn: "No-Show Alert (NoShowPositive)",
    defaultHintAr: "الافتراضي: أكبر من 0 عدم حضور",
  },
];

export const HUNGER_ALERT_SEVERITIES: Array<{
  value: HungerAlertSeverity;
  labelAr: string;
  labelEn: string;
  badgeTone: BadgeTone;
}> = [
  {
    value: "High",
    labelAr: "عالية (High)",
    labelEn: "High",
    badgeTone: "red",
  },
  {
    value: "Critical",
    labelAr: "حرج (Critical)",
    labelEn: "Critical",
    badgeTone: "red",
  },
  {
    value: "Warning",
    labelAr: "تحذير (Warning)",
    labelEn: "Warning",
    badgeTone: "orange",
  },
  {
    value: "Info",
    labelAr: "معلومة / متابعة (Info)",
    labelEn: "Info",
    badgeTone: "blue",
  },
];

export const HUNGER_ALERT_METRICS: Array<{
  value: HungerAlertMetric;
  labelAr: string;
  labelEn: string;
}> = [
  { value: "WorkingHours", labelAr: "ساعات العمل (WorkingHours)", labelEn: "Working Hours" },
  { value: "CompletedOrders", labelAr: "الطلبات المكتملة (CompletedOrders)", labelEn: "Completed Orders" },
  { value: "WorkedDays", labelAr: "أيام العمل > 0 ساعة (WorkedDays)", labelEn: "Worked Days" },
  { value: "QualifiedDays", labelAr: "الأيام المؤهلة ≥ 8 ساعات (QualifiedDays)", labelEn: "Qualified Days" },
  { value: "NoShowCount", labelAr: "شفتات عدم الحضور (NoShowCount)", labelEn: "No-Show Count" },
  { value: "RejectedOrders", labelAr: "الطلبات المرفوضة (RejectedOrders)", labelEn: "Rejected Orders" },
  { value: "CancelledOrders", labelAr: "الطلبات الملغاة (CancelledOrders)", labelEn: "Cancelled Orders" },
  { value: "AcceptedOrders", labelAr: "الطلبات المقبولة (AcceptedOrders)", labelEn: "Accepted Orders" },
  { value: "StackedOrders", labelAr: "الطلبات المجمعة (StackedOrders)", labelEn: "Stacked Orders" },
];

export const HUNGER_ALERT_OPERATORS: Array<{
  value: HungerAlertOperator;
  labelAr: string;
  symbol: string;
}> = [
  { value: "LessThan", labelAr: "أقل من (<)", symbol: "<" },
  { value: "LessThanOrEqual", labelAr: "أقل من أو يساوي (≤)", symbol: "≤" },
  { value: "GreaterThan", labelAr: "أكبر من (>)", symbol: ">" },
  { value: "GreaterThanOrEqual", labelAr: "أكبر من أو يساوي (≥)", symbol: "≥" },
  { value: "Equal", labelAr: "يساوي (=)", symbol: "=" },
];

export const HUNGER_ALERT_KINDS: Array<{
  value: HungerAlertKind;
  labelAr: string;
}> = [
  { value: "Alert", labelAr: "تنبيه (Alert)" },
  { value: "Target", labelAr: "هدف / تارجت (Target)" },
];

export const HUNGER_ALERT_PERIODS: Array<{
  value: HungerAlertPeriod;
  labelAr: string;
}> = [
  { value: "Day", labelAr: "يومي (Day)" },
  { value: "Month", labelAr: "شهري (Month)" },
];

export const HUNGER_WALLET_RECEIPT_STATES: Array<{
  value: HungerWalletReceiptState;
  labelAr: string;
  badgeTone: BadgeTone;
}> = [
  { value: "None", labelAr: "لا توجد إيصالات (None)", badgeTone: "gray" },
  { value: "Pending", labelAr: "بانتظار التأكيد (Pending)", badgeTone: "orange" },
  { value: "PartiallyConfirmed", labelAr: "مؤكد جزئيًا (PartiallyConfirmed)", badgeTone: "blue" },
  { value: "Confirmed", labelAr: "مؤكد بالكامل (Confirmed)", badgeTone: "green" },
];

function normalizePaged<T>(
  raw: unknown,
  fallbackPage = 1,
  fallbackPageSize = 50,
): HungerPagedResponse<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      page: fallbackPage,
      pageSize: fallbackPageSize,
      totalCount: raw.length,
    };
  }
  const obj = (raw || {}) as Record<string, unknown>;
  const items = Array.isArray(obj.items)
    ? (obj.items as T[])
    : Array.isArray(obj.data)
      ? (obj.data as T[])
      : Array.isArray(obj.rows)
        ? (obj.rows as T[])
        : [];
  const totalCount =
    typeof obj.totalCount === "number"
      ? obj.totalCount
      : typeof obj.total === "number"
        ? obj.total
        : items.length;
  return {
    items,
    page: typeof obj.page === "number" ? obj.page : fallbackPage,
    pageSize: typeof obj.pageSize === "number" ? obj.pageSize : fallbackPageSize,
    totalCount,
  };
}

function asStr(val: unknown): string | null {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return null;
}

function asPerson(val: unknown): HungerPersonSummary | null {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as HungerPersonSummary;
  }
  return null;
}

function asSim(val: unknown): HungerSimContext | null {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as HungerSimContext;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. Accounts & Seed Endpoints
// ---------------------------------------------------------------------------

export function normalizeHungerAccountItem(
  raw: Record<string, unknown>,
): HungerAccountItem {
  const owner = asPerson(raw.owner);
  const actualRider = asPerson(raw.actualRider);
  const sourceActualRider = asPerson(raw.sourceActualRider);
  const sim = asSim(raw.sim);
  const simHolder = asPerson(raw.simHolder);
  const simResponsibleEmployee = asPerson(raw.simResponsibleEmployee);

  const accountId = String(raw.accountId ?? raw.id ?? "");
  const externalAccountId =
    asStr(raw.externalAccountId) ??
    asStr(raw.accountCode) ??
    asStr(raw.code) ??
    null;
  const accountCode =
    asStr(raw.accountCode) ??
    asStr(raw.code) ??
    asStr(raw.externalAccountId) ??
    null;

  const currentAssignmentId =
    asStr(raw.currentAssignmentId) ?? asStr(raw.activeAssignmentId) ?? null;
  const assignmentFrom =
    asStr(raw.assignmentFrom) ?? asStr(raw.assignmentEffectiveFrom) ?? null;
  const assignmentRowVersion =
    asStr(raw.assignmentRowVersion) ??
    asStr(raw.activeAssignmentRowVersion) ??
    null;

  const rawAssignmentStatus = asStr(raw.assignmentStatus);
  const assignmentStatus: "Assigned" | "Unassigned" =
    rawAssignmentStatus === "Assigned" || rawAssignmentStatus === "Unassigned"
      ? (rawAssignmentStatus as "Assigned" | "Unassigned")
      : actualRider?.riderProfileId || actualRider?.nameAr || currentAssignmentId
        ? "Assigned"
        : "Unassigned";

  const reportedAssignmentStatus: "Assigned" | "Unassigned" =
    asStr(raw.reportedAssignmentStatus) === "Assigned" ||
    asStr(raw.reportedAssignmentStatus) === "Unassigned"
      ? (asStr(raw.reportedAssignmentStatus) as "Assigned" | "Unassigned")
      : assignmentStatus;

  const reportedCurrentRider =
    asPerson(raw.reportedCurrentRider) ?? actualRider;

  const currentRiderSource: "Assignment" | "None" =
    asStr(raw.currentRiderSource) === "Assignment" ||
    asStr(raw.currentRiderSource) === "None"
      ? (asStr(raw.currentRiderSource) as "Assignment" | "None")
      : assignmentStatus === "Assigned" || actualRider
        ? "Assignment"
        : "None";

  const rawMonthlyStatus = asStr(raw.monthlyUsageStatus);
  const monthlyUsageStatus: "Used" | "Unknown" =
    rawMonthlyStatus === "Used" ? "Used" : "Unknown";

  const rawMonthlySource = asStr(raw.monthlyUsageSource);
  const monthlyUsageSource: "ObservedWorkingHours" | "None" =
    rawMonthlySource === "ObservedWorkingHours" || rawMonthlySource === "None"
      ? (rawMonthlySource as "ObservedWorkingHours" | "None")
      : monthlyUsageStatus === "Used"
        ? "ObservedWorkingHours"
        : "None";

  const disposition =
    asStr(raw.disposition) ?? asStr(raw.operationalDisposition) ?? "Unknown";

  const registeredVehiclePlate = asStr(raw.registeredVehiclePlate);
  const registeredVehicleSerial = asStr(raw.registeredVehicleSerial);

  return {
    ...(raw as Partial<HungerAccountItem>),
    id: asStr(raw.id) ?? accountId,
    accountId,
    externalAccountId,
    accountCode,
    accountName:
      asStr(raw.accountName) ?? asStr(raw.nameAr) ?? asStr(raw.nameEn) ?? null,
    disposition,
    operationalDisposition: asStr(raw.operationalDisposition) ?? disposition,
    dispositionReason:
      asStr(raw.dispositionReason) ?? asStr(raw.statusReason) ?? null,
    assignmentStatus,
    reportedAssignmentStatus,

    owner,
    actualRider,
    sourceActualRider,
    reportedCurrentRider,
    currentRiderSource,

    // Owner flat fields
    ownerEmployeeId: owner?.employeeId ?? asStr(raw.ownerEmployeeId) ?? null,
    ownerRiderProfileId:
      owner?.riderProfileId ?? asStr(raw.ownerRiderProfileId) ?? null,
    ownerNameAr: owner?.nameAr ?? asStr(raw.ownerNameAr) ?? null,
    ownerNameEn: owner?.nameEn ?? asStr(raw.ownerNameEn) ?? null,
    ownerNationalId:
      owner?.iqamaNo ??
      asStr(raw.ownerNationalId) ??
      asStr(raw.ownerIqamaNo) ??
      null,
    ownerPhoneNumber: owner?.phoneNumber ?? asStr(raw.ownerPhoneNumber) ?? null,
    ownerNationality: owner?.nationality ?? asStr(raw.ownerNationality) ?? null,
    ownerEmployeeStatus:
      owner?.employeeStatus ?? asStr(raw.ownerEmployeeStatus) ?? null,
    ownerRelationshipType:
      owner?.relationshipType ?? asStr(raw.ownerRelationshipType) ?? null,

    // Source Actual Rider flat fields
    sourceEmployeeId:
      sourceActualRider?.employeeId ?? asStr(raw.sourceEmployeeId) ?? null,
    sourceRiderProfileId:
      sourceActualRider?.riderProfileId ??
      asStr(raw.sourceRiderProfileId) ??
      null,
    sourceUserNameAr:
      sourceActualRider?.nameAr ??
      asStr(raw.sourceUserNameAr) ??
      asStr(raw.sourceRiderNameAr) ??
      null,
    sourceUserNameEn:
      sourceActualRider?.nameEn ??
      asStr(raw.sourceUserNameEn) ??
      asStr(raw.sourceRiderNameEn) ??
      null,
    sourceNationalId:
      sourceActualRider?.iqamaNo ??
      asStr(raw.sourceNationalId) ??
      asStr(raw.sourceIqamaNo) ??
      null,
    sourcePhone:
      sourceActualRider?.phoneNumber ??
      asStr(raw.sourcePhone) ??
      asStr(raw.sourcePhoneNumber) ??
      null,
    sourceAssignmentFrom: asStr(raw.sourceAssignmentFrom) ?? null,
    sourceVehicleDescription: asStr(raw.sourceVehicleDescription) ?? null,

    // Actual Assigned Rider flat fields
    assignedEmployeeId:
      actualRider?.employeeId ?? asStr(raw.assignedEmployeeId) ?? null,
    assignedRiderProfileId:
      actualRider?.riderProfileId ?? asStr(raw.assignedRiderProfileId) ?? null,
    assignedRiderNameAr:
      actualRider?.nameAr ?? asStr(raw.assignedRiderNameAr) ?? null,
    assignedRiderNameEn:
      actualRider?.nameEn ?? asStr(raw.assignedRiderNameEn) ?? null,
    assignedNationalId:
      actualRider?.iqamaNo ??
      asStr(raw.assignedNationalId) ??
      asStr(raw.assignedIqamaNo) ??
      null,
    assignedPhoneNumber:
      actualRider?.phoneNumber ?? asStr(raw.assignedPhoneNumber) ?? null,

    currentAssignmentId,
    activeAssignmentId: currentAssignmentId,
    assignmentFrom,
    assignmentEffectiveFrom: assignmentFrom,
    assignmentRowVersion,
    activeAssignmentRowVersion: assignmentRowVersion,
    lastAssignmentEvent: asStr(raw.lastAssignmentEvent) ?? null,
    lastAssignmentEventAtUtc: asStr(raw.lastAssignmentEventAtUtc) ?? null,

    // Vehicles & SIM
    accountPhoneNumber:
      asStr(raw.accountPhoneNumber) ??
      asStr(raw.phoneNumber) ??
      sim?.phoneNumber ??
      null,
    phoneNumber:
      asStr(raw.phoneNumber) ?? asStr(raw.accountPhoneNumber) ?? null,
    phoneSimCardId: asStr(raw.phoneSimCardId) ?? sim?.simId ?? null,
    simPhoneNumber:
      asStr(raw.simPhoneNumber) ??
      sim?.phoneNumber ??
      asStr(raw.accountPhoneNumber) ??
      null,
    simOwnership: asStr(raw.simOwnership) ?? sim?.ownership ?? null,
    sourceSimOwnership: asStr(raw.sourceSimOwnership) ?? null,
    sim,
    simHolder,
    simResponsibleEmployee,
    registeredVehicleType: asStr(raw.registeredVehicleType) ?? null,
    registeredVehiclePlate,
    registeredVehicleSerial,
    registeredVehicleLabel:
      asStr(raw.registeredVehicleLabel) ??
      (registeredVehiclePlate
        ? `${registeredVehiclePlate}${registeredVehicleSerial ? ` (${registeredVehicleSerial})` : ""}`
        : null),
    actualVehicleType: asStr(raw.actualVehicleType) ?? null,
    actualVehiclePlate: asStr(raw.actualVehiclePlate) ?? null,
    actualVehicleOwnership: asStr(raw.actualVehicleOwnership) ?? null,
    actualVehicleCustodyStatus: asStr(raw.actualVehicleCustodyStatus) ?? null,
    actualVehiclePeriods: Array.isArray(raw.actualVehiclePeriods)
      ? (raw.actualVehiclePeriods as HungerActualVehiclePeriod[])
      : undefined,
    contextVerifiedAtUtc: asStr(raw.contextVerifiedAtUtc) ?? null,

    // Monthly Usage, Quality Snapshot & Password Flag
    monthlyUsageStatus,
    monthlyUsageSource,
    usageMonth: asStr(raw.usageMonth) ?? null,
    latestQualitySegment: asStr(raw.latestQualitySegment) ?? null,
    latestQualityRank:
      typeof raw.latestQualityRank === "number" ? raw.latestQualityRank : null,
    latestQualityScore:
      typeof raw.latestQualityScore === "number"
        ? raw.latestQualityScore
        : null,
    latestQualityReportDate: asStr(raw.latestQualityReportDate) ?? null,
    hasPassword:
      typeof raw.hasPassword === "boolean" ? raw.hasPassword : null,
  };
}

const ACCOUNT_FILTER_KEYS: Array<keyof HungerAccountsFilterParams> = [
  "externalAccountId",
  "accountCode",
  "ownerEmployeeId",
  "ownerName",
  "ownerNameEn",
  "ownerIqama",
  "ownerPhone",
  "ownerNationality",
  "ownerEmployeeStatus",
  "ownerRelationshipType",
  "phoneNumber",
  "operatingCityId",
  "operatingCityNameAr",
  "registryIdentifier",
  "settlementModel",
  "registeredVehicleType",
  "registeredVehiclePlate",
  "registeredVehicleSerial",
  "actualVehicleType",
  "actualVehiclePlate",
  "actualVehicleOwnership",
  "actualVehicleCustodyStatus",
  "simOwnership",
  "sourceSimOwnership",
  "simResponsibleEmployeeId",
  "simHolderRiderProfileId",
  "simResponsibleName",
  "simResponsibleIqama",
  "simResponsiblePhone",
  "simHolderName",
  "simHolderIqama",
  "simHolderPhone",
  "operationalDisposition",
  "assignmentStatus",
  // Section 7 additions
  "actualRiderId",
  "actualRiderProfileId",
  "actualRiderName",
  "actualRiderIqama",
  "actualRiderPhone",
  "sourceRiderName",
  "sourceRiderIqama",
  "sponsorId",
  "sponsorName",
  "paymentModel",
  "compensationModel",
  "sourceStatus",
  "usageStatus",
  "monthlyUsageStatus",
  "latestQualitySegment",
  "qualityRankFrom",
  "qualityRankThrough",
  "qualityScoreFrom",
  "qualityScoreThrough",
  "qualityScoreEqual",
  "deferredFrom",
  "deferredThrough",
];

export function appendAccountsFilterParams(
  qs: URLSearchParams,
  params?: HungerAccountsFilterParams,
  prefix = "",
): void {
  if (!params) return;
  if (!prefix) {
    if (params.from && params.from.trim()) {
      qs.set("from", params.from.trim());
    }
    if (params.through && params.through.trim()) {
      qs.set("through", params.through.trim());
    }
  }
  if (params.disposition && params.disposition !== "all") {
    qs.set(`${prefix}disposition`, params.disposition);
  }
  for (const key of ACCOUNT_FILTER_KEYS) {
    const val = params[key];
    if (typeof val === "string" && val.trim() && val.trim() !== "all") {
      qs.set(`${prefix}${key}`, val.trim());
    }
  }
  // Ensure aliases for actualRiderId / actualRiderProfileId & usageStatus / monthlyUsageStatus
  const riderProfileId = params.actualRiderProfileId?.trim();
  const riderId = params.actualRiderId?.trim();
  if (riderProfileId && !riderId) {
    qs.set(`${prefix}actualRiderId`, riderProfileId);
  } else if (riderId && !riderProfileId) {
    qs.set(`${prefix}actualRiderProfileId`, riderId);
  }
  const monthlyUsage = params.monthlyUsageStatus?.trim();
  const usage = params.usageStatus?.trim();
  if (monthlyUsage && monthlyUsage !== "all" && !usage) {
    qs.set(`${prefix}usageStatus`, monthlyUsage);
  }
}

export function appendPrefixedAccountFilters(
  qs: URLSearchParams,
  accountFilters?: HungerAccountsFilterParams,
): void {
  appendAccountsFilterParams(qs, accountFilters, "accounts.");
}

export async function getHungerAccounts(
  params: HungerAccountsFilterParams = {},
  init?: CustomRequestInit,
): Promise<HungerPagedResponse<HungerAccountItem>> {
  const qs = new URLSearchParams();
  appendAccountsFilterParams(qs, params);

  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(`${BASE}/accounts?${qs.toString()}`, {
    ...init,
    method: "GET",
  });
  const paged = normalizePaged<Record<string, unknown>>(raw, page, pageSize);
  return {
    ...paged,
    items: paged.items.map(normalizeHungerAccountItem),
  };
}

export async function getAllHungerAccounts(
  dispositionOrParams?: string | HungerAccountsFilterParams,
  init?: CustomRequestInit,
): Promise<HungerAccountItem[]> {
  const baseParams: HungerAccountsFilterParams =
    typeof dispositionOrParams === "string"
      ? { disposition: dispositionOrParams }
      : { ...(dispositionOrParams || {}) };

  const first = await getHungerAccounts(
    {
      ...baseParams,
      page: 1,
      pageSize: 100,
    },
    init,
  );
  let all = [...first.items];
  const totalPages = Math.ceil(first.totalCount / (first.pageSize || 100));
  if (totalPages <= 1) {
    return all;
  }

  // Fetch remaining pages in parallel batches of up to 6 requests
  const maxPages = Math.min(totalPages, 100);
  const remainingPages: number[] = [];
  for (let p = 2; p <= maxPages; p++) {
    remainingPages.push(p);
  }

  const batchSize = 6;
  for (let i = 0; i < remainingPages.length; i += batchSize) {
    const batch = remainingPages.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((p) =>
        getHungerAccounts(
          {
            ...baseParams,
            page: p,
            pageSize: 100,
          },
          init,
        ),
      ),
    );
    for (const res of results) {
      if (res.status === "fulfilled" && Array.isArray(res.value?.items)) {
        all = all.concat(res.value.items);
      }
    }
  }

  // Deduplicate by unique account identifier
  const seenIds = new Set<string>();
  const deduplicated: HungerAccountItem[] = [];
  for (const item of all) {
    const key =
      item.accountId ||
      item.id ||
      item.externalAccountId ||
      `${deduplicated.length}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

export async function downloadHungerAccountsTemplate(): Promise<void> {
  await downloadFileFromEndpoint(
    `${BASE}/accounts/template`,
    "hunger-accounts-seed-template.xlsx",
  );
}

export async function previewHungerAccountsSeedImport(
  file: File,
  init?: CustomRequestInit,
): Promise<HungerSeedImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return authFetch<HungerSeedImportPreviewResponse>(
    `${BASE}/accounts/imports/preview`,
    {
      ...init,
      method: "POST",
      body: formData,
    },
  );
}

export async function confirmHungerAccountsSeedImport(
  previewId: string,
  payload?: HungerSeedImportConfirmRequest,
  init?: CustomRequestInit,
): Promise<HungerSeedImportConfirmResponse> {
  return authFetch<HungerSeedImportConfirmResponse>(
    `${BASE}/accounts/imports/${encodeURIComponent(previewId)}/confirm`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload ?? { resolutions: [] }),
      notifySuccess:
        init?.notifySuccess ?? "تم اعتماد ملف تأسيس حسابات هنقرستيشن بنجاح",
    },
  );
}

export async function getHungerDeferredReminders(
  dueThrough?: string,
  init?: CustomRequestInit,
): Promise<HungerDeferredReminderItem[]> {
  const qs = new URLSearchParams();
  if (dueThrough && dueThrough.trim()) {
    qs.set("dueThrough", dueThrough.trim());
  }
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const raw = await authFetch<unknown>(
    `${BASE}/accounts/deferred-reminders${query}`,
    {
      ...init,
      method: "GET",
    },
  );
  if (Array.isArray(raw)) return raw as HungerDeferredReminderItem[];
  const obj = (raw || {}) as Record<string, unknown>;
  if (Array.isArray(obj.items)) return obj.items as HungerDeferredReminderItem[];
  if (Array.isArray(obj.data)) return obj.data as HungerDeferredReminderItem[];
  return [];
}

export async function exportHungerAccounts(
  params: HungerAccountsFilterParams & { format: "xlsx" | "csv" },
): Promise<void> {
  const qs = new URLSearchParams();
  appendAccountsFilterParams(qs, params);
  qs.set("format", params.format);
  await downloadFileFromEndpoint(
    `${BASE}/accounts/export?${qs.toString()}`,
    `hunger-accounts.${params.format}`,
  );
}

export async function updateHungerAccountDisposition(
  accountId: string,
  payload: HungerDispositionUpdateRequest,
  init?: CustomRequestInit,
): Promise<HungerAccountItem> {
  const raw = await authFetch<Record<string, unknown>>(
    `${BASE}/accounts/${encodeURIComponent(accountId)}/disposition`,
    {
      ...init,
      method: "PUT",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم تحديث الحالة التشغيلية للحساب بنجاح",
    },
  );
  return normalizeHungerAccountItem(raw || { accountId, ...payload });
}

// ---------------------------------------------------------------------------
// 2. Cumulative Quality Endpoints
// ---------------------------------------------------------------------------

export async function downloadHungerQualityTemplate(): Promise<void> {
  await downloadFileFromEndpoint(
    `${BASE}/quality/template`,
    "hunger-quality-template.xlsx",
  );
}

export async function previewHungerQualityImport(
  file: File,
  reportDate: string,
  init?: CustomRequestInit,
): Promise<HungerQualityImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("reportDate", reportDate);
  return authFetch<HungerQualityImportPreviewResponse>(
    `${BASE}/quality/imports/preview`,
    {
      ...init,
      method: "POST",
      body: formData,
    },
  );
}

export async function confirmHungerQualityImport(
  previewId: string,
  init?: CustomRequestInit,
): Promise<HungerQualityImportResultResponse> {
  return authFetch<HungerQualityImportResultResponse>(
    `${BASE}/quality/imports/${encodeURIComponent(previewId)}/confirm`,
    {
      ...init,
      method: "POST",
      notifySuccess:
        init?.notifySuccess ?? "تم اعتماد استيراد الجودة التراكمية بنجاح",
    },
  );
}

export async function getHungerQualityImportResult(
  importId: string,
  init?: CustomRequestInit,
): Promise<HungerQualityImportResultResponse> {
  return authFetch<HungerQualityImportResultResponse>(
    `${BASE}/quality/imports/${encodeURIComponent(importId)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function reallocateHungerQuality(
  sourceId: string,
  payload: HungerQualityReallocateRequest,
  init?: CustomRequestInit,
): Promise<void> {
  await authFetch<unknown>(
    `${BASE}/quality/${encodeURIComponent(sourceId)}/reallocate`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ??
        "تم إعادة احتساب وتوزيع الجودة التراكمية على المناديب بنجاح",
    },
  );
}

export async function getHungerQualityReport(
  params: {
    month: string;
    accountId?: string;
    riderId?: string;
    page?: number;
    pageSize?: number;
  },
  init?: CustomRequestInit,
): Promise<HungerPagedResponse<HungerQualityReportItem>> {
  const qs = new URLSearchParams();
  qs.set("month", normalizeMonthStartIso(params.month));
  if (params.accountId) qs.set("accountId", params.accountId);
  if (params.riderId) qs.set("riderId", params.riderId);
  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(
    `${BASE}/reports/quality?${qs.toString()}`,
    {
      ...init,
      method: "GET",
    },
  );
  return normalizePaged<HungerQualityReportItem>(raw, page, pageSize);
}

export async function exportHungerQualityReport(params: {
  month: string;
  accountId?: string;
  riderId?: string;
  accountFilters?: HungerAccountsFilterParams;
}): Promise<void> {
  const monthIso = normalizeMonthStartIso(params.month);
  const qs = new URLSearchParams();
  qs.set("month", monthIso);
  if (params.accountId) qs.set("accountId", params.accountId);
  if (params.riderId) qs.set("riderId", params.riderId);
  appendPrefixedAccountFilters(qs, params.accountFilters);
  await downloadFileFromEndpoint(
    `${BASE}/reports/quality/export?${qs.toString()}`,
    `hunger-quality-${monthIso.slice(0, 7)}.xlsx`,
  );
}

// ---------------------------------------------------------------------------
// 3. Daily Operations, Summary, Alert Rules, Performance & Potential Fines
// ---------------------------------------------------------------------------

export async function downloadHungerOperationsTemplate(): Promise<void> {
  await downloadFileFromEndpoint(
    `${BASE}/operations/template`,
    "hunger-daily-operations-template.xlsx",
  );
}

export async function previewHungerOperationsImport(
  file: File,
  reportDate: string,
  init?: CustomRequestInit,
): Promise<HungerOperationsImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("reportDate", reportDate);
  const raw = await authFetch<HungerOperationsImportPreviewResponse>(
    `${BASE}/operations/imports/preview`,
    {
      ...init,
      method: "POST",
      body: formData,
    },
  );

  const rawRows = Array.isArray(raw.rows) ? raw.rows : [];
  const rows = rawRows.map((r, idx) => {
    const counters = r.dailyCounters;
    const accountId = r.accountId || r.externalAccountId || null;
    const error = r.error || r.errorMessage || null;
    return {
      ...r,
      rowNumber: r.rowNumber ?? idx + 1,
      accountId,
      externalAccountId: r.externalAccountId || accountId,
      error,
      errorMessage: r.errorMessage || error,
      status: r.status || (error ? "Rejected" : "New"),
      orders: r.orders ?? counters?.orders ?? null,
      completedOrders: r.completedOrders ?? counters?.completedOrders ?? null,
      acceptedOrders: r.acceptedOrders ?? counters?.acceptedOrders ?? null,
      stackedOrders: r.stackedOrders ?? counters?.stackedOrders ?? null,
      rejectedOrders: r.rejectedOrders ?? counters?.rejectedOrders ?? null,
      cancelledOrders: r.cancelledOrders ?? counters?.cancelledOrders ?? null,
      workingHours: r.workingHours ?? counters?.workingHours ?? null,
      hours: r.hours ?? counters?.hours ?? counters?.workingHours ?? null,
      hoursUnit: r.hoursUnit || counters?.hoursUnit || raw.hoursUnit || null,
      captainClassification:
        r.captainClassification || counters?.captainClassification || null,
      noShowCount: r.noShowCount ?? counters?.noShowCount ?? null,
      noShow: r.noShow ?? counters?.noShow ?? counters?.noShowCount ?? null,
      lateLoginMinutes: r.lateLoginMinutes ?? counters?.lateLoginMinutes ?? null,
      acceptanceRate: r.acceptanceRate ?? counters?.acceptanceRate ?? null,
    };
  });

  const totalRows = raw.totalRows ?? rows.length;
  const invalidRows =
    raw.invalidRows ??
    rows.filter(
      (r) =>
        r.status?.toLowerCase() === "rejected" ||
        r.status?.toLowerCase() === "invalid" ||
        Boolean(r.error),
    ).length;
  const validRows = raw.validRows ?? Math.max(0, totalRows - invalidRows);

  const errors = Array.isArray(raw.errors) ? [...raw.errors] : [];
  if (errors.length === 0) {
    rows.forEach((r) => {
      if (r.error) {
        errors.push(
          `صف ${r.rowNumber ?? "?"} (حساب ${r.accountId || "غير معروف"}): ${r.error}`,
        );
      }
    });
  }

  return {
    ...raw,
    totalRows,
    validRows,
    invalidRows,
    rows,
    errors,
    canConfirm: raw.canConfirm ?? (invalidRows === 0),
  };
}

export async function confirmHungerOperationsImport(
  previewId: string,
  init?: CustomRequestInit,
): Promise<HungerOperationsImportConfirmResponse> {
  return authFetch<HungerOperationsImportConfirmResponse>(
    `${BASE}/operations/imports/${encodeURIComponent(previewId)}/confirm`,
    {
      ...init,
      method: "POST",
      notifySuccess:
        init?.notifySuccess ?? "تم اعتماد استيراد التشغيل اليومي بنجاح",
    },
  );
}

export async function getHungerOperationsReport(
  params: {
    from: string;
    through: string;
    accountId?: string;
    riderId?: string;
    captainClassification?: string;
    page?: number;
    pageSize?: number;
  },
  init?: CustomRequestInit,
): Promise<HungerPagedResponse<HungerOperationsReportItem>> {
  const qs = new URLSearchParams();
  qs.set("from", params.from);
  qs.set("through", params.through);
  if (params.accountId) qs.set("accountId", params.accountId);
  if (params.riderId) qs.set("riderId", params.riderId);
  if (params.captainClassification) {
    qs.set("captainClassification", params.captainClassification);
  }
  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(
    `${BASE}/reports/operations?${qs.toString()}`,
    {
      ...init,
      method: "GET",
    },
  );
  return normalizePaged<HungerOperationsReportItem>(raw, page, pageSize);
}

export async function exportHungerOperationsReport(params: {
  from: string;
  through: string;
  accountId?: string;
  riderId?: string;
  captainClassification?: string;
  accountFilters?: HungerAccountsFilterParams;
}): Promise<void> {
  const qs = new URLSearchParams();
  qs.set("from", params.from);
  qs.set("through", params.through);
  if (params.accountId) qs.set("accountId", params.accountId);
  if (params.riderId) qs.set("riderId", params.riderId);
  if (params.captainClassification) {
    qs.set("captainClassification", params.captainClassification);
  }
  appendPrefixedAccountFilters(qs, params.accountFilters);
  await downloadFileFromEndpoint(
    `${BASE}/reports/operations/export?${qs.toString()}`,
    `hunger-operations-${params.from}-to-${params.through}.xlsx`,
  );
}

export async function updateHungerManualOperationsComparison(
  sourceId: string,
  payload: HungerManualComparisonRequest,
  init?: CustomRequestInit,
): Promise<HungerOperationsReportItem> {
  return authFetch<HungerOperationsReportItem>(
    `${BASE}/operations/${encodeURIComponent(sourceId)}/manual`,
    {
      ...init,
      method: "PUT",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم حفظ بيانات المقارنة اليدوية بنجاح",
    },
  );
}

export async function getHungerMonthlySummary(
  month: string,
  init?: CustomRequestInit,
): Promise<HungerMonthlySummaryResponse> {
  const monthIso = normalizeMonthStartIso(month);
  return authFetch<HungerMonthlySummaryResponse>(
    `${BASE}/reports/summary?month=${encodeURIComponent(monthIso)}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function getHungerAlertRules(
  init?: CustomRequestInit,
): Promise<HungerAlertRuleItem[]> {
  const raw = await authFetch<unknown>(`${BASE}/alert-rules`, {
    ...init,
    method: "GET",
  });
  if (Array.isArray(raw)) return raw as HungerAlertRuleItem[];
  const obj = (raw || {}) as Record<string, unknown>;
  if (Array.isArray(obj.items)) return obj.items as HungerAlertRuleItem[];
  return [];
}

export async function createHungerAlertRule(
  payload: HungerAlertRuleCreateRequest,
  init?: CustomRequestInit,
): Promise<HungerAlertRuleItem> {
  return authFetch<HungerAlertRuleItem>(`${BASE}/alert-rules`, {
    ...init,
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess:
      init?.notifySuccess ?? "تم إضافة قاعدة التنبيه المؤرخة بنجاح",
  });
}

function appendPerformanceQueryParams(
  qs: URLSearchParams,
  query: HungerPerformanceQuery,
): void {
  qs.set("from", query.from);
  qs.set("through", query.through);
  qs.set("groupBy", query.groupBy);
  qs.set("period", query.period);
  qs.set("layout", query.layout);
  if (query.accountId) qs.set("accountId", query.accountId);
  if (query.riderId) qs.set("riderId", query.riderId);
  if (query.cityId) qs.set("cityId", query.cityId);
  if (query.sponsorId) qs.set("sponsorId", query.sponsorId);
  if (query.actualVehicle && query.actualVehicle !== "all") {
    qs.set("actualVehicle", query.actualVehicle);
  }
  if (query.actualVehicleType && query.actualVehicleType.trim()) {
    qs.set("actualVehicleType", query.actualVehicleType.trim());
  }
  if (query.targetAchieved && query.targetAchieved !== "all") {
    qs.set("targetAchieved", query.targetAchieved);
  }
  appendPrefixedAccountFilters(qs, query.accountFilters);
}

export async function getHungerPerformanceReport(
  query: HungerPerformanceQuery,
  init?: CustomRequestInit,
): Promise<HungerPerformanceReportResponse> {
  const qs = new URLSearchParams();
  appendPerformanceQueryParams(qs, query);
  const page = query.page ?? 1;
  const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(
    `${BASE}/reports/performance?${qs.toString()}`,
    {
      ...init,
      method: "GET",
    },
  );
  const obj = (raw || {}) as Record<string, unknown>;
  const rawItems = Array.isArray(obj.items)
    ? (obj.items as HungerPerformanceRowItem[])
    : Array.isArray(raw)
      ? (raw as HungerPerformanceRowItem[])
      : [];
  const totalRecords =
    typeof obj.totalRecords === "number"
      ? obj.totalRecords
      : typeof obj.totalCount === "number"
        ? (obj.totalCount as number)
        : rawItems.length;

  const completedOrders =
    typeof obj.completedOrders === "number" ? obj.completedOrders : 0;
  const workingHours =
    typeof obj.workingHours === "number" ? obj.workingHours : 0;
  const distinctAccounts =
    typeof obj.distinctAccounts === "number"
      ? obj.distinctAccounts
      : typeof obj.distinctAccountsCount === "number"
        ? (obj.distinctAccountsCount as number)
        : 0;
  const distinctRiders =
    typeof obj.distinctRiders === "number"
      ? obj.distinctRiders
      : typeof obj.distinctRidersCount === "number"
        ? (obj.distinctRidersCount as number)
        : 0;

  const groupBy =
    typeof obj.groupBy === "string" ? obj.groupBy : (query.groupBy ?? "account");
  const period =
    typeof obj.period === "string" ? obj.period : (query.period ?? "day");
  const layout =
    typeof obj.layout === "string" ? obj.layout : (query.layout ?? "vertical");

  return {
    items: rawItems,
    page: typeof obj.page === "number" ? obj.page : page,
    pageSize: typeof obj.pageSize === "number" ? obj.pageSize : pageSize,
    totalRecords,
    completedOrders,
    workingHours,
    distinctAccounts,
    distinctRiders,
    groupBy,
    period,
    layout,
    totals: {
      completedOrders,
      workingHours,
    },
  };
}

export async function exportHungerPerformanceReport(
  query: HungerPerformanceQuery & { format?: "xlsx" | "csv" },
): Promise<void> {
  const qs = new URLSearchParams();
  appendPerformanceQueryParams(qs, query);
  const format = query.format ?? "xlsx";
  qs.set("format", format);
  await downloadFileFromEndpoint(
    `${BASE}/reports/performance/export?${qs.toString()}`,
    `hunger-performance-${query.from}-to-${query.through}.${format}`,
  );
}

export async function getHungerPotentialFines(
  params: {
    from: string;
    through: string;
    page?: number;
    pageSize?: number;
  },
  init?: CustomRequestInit,
): Promise<HungerPagedResponse<HungerPotentialFineItem>> {
  const qs = new URLSearchParams();
  qs.set("from", params.from);
  qs.set("through", params.through);
  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(
    `${BASE}/potential-fines?${qs.toString()}`,
    {
      ...init,
      method: "GET",
    },
  );
  return normalizePaged<HungerPotentialFineItem>(raw, page, pageSize);
}

export async function resolveHungerPotentialFine(
  id: string,
  payload: HungerPotentialFineResolveRequest,
  init?: CustomRequestInit,
): Promise<HungerPotentialFineItem> {
  return authFetch<HungerPotentialFineItem>(
    `${BASE}/potential-fines/${encodeURIComponent(id)}/resolve`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ??
        (payload.status === "Invoiced"
          ? "تم ربط الغرامة المحتملة بالفاتورة بنجاح"
          : "تم تسجيل الإعفاء من الغرامة المحتملة بنجاح"),
    },
  );
}

// ---------------------------------------------------------------------------
// 4. Wallets, Remittances & Settlement Documents Endpoints
// ---------------------------------------------------------------------------

export async function saveHungerFinanceConfiguration(
  payload: HungerFinanceConfigurationRequest,
  init?: CustomRequestInit,
): Promise<HungerFinanceConfigurationResponse> {
  return authFetch<HungerFinanceConfigurationResponse>(
    `${BASE}/finance/configuration`,
    {
      ...init,
      method: "PUT",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم حفظ واعتماد تهيئة حسابات المشرف بنجاح",
    },
  );
}

export async function createHungerFinanceEvent(
  payload: HungerFinanceEventCreateRequest,
  init?: CustomRequestInit,
): Promise<unknown> {
  return authFetch<unknown>(`${BASE}/finance/events`, {
    ...init,
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: init?.notifySuccess ?? "تم تسجيل الحركة المالية بنجاح",
  });
}

export async function createHungerFinanceRequest(
  payload: HungerFinanceEventCreateRequest,
  init?: CustomRequestInit,
): Promise<HungerFinanceEventItem> {
  return authFetch<HungerFinanceEventItem>(`${BASE}/finance/requests`, {
    ...init,
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess:
      init?.notifySuccess ?? "تم حفظ طلب التمويل / الشحن بانتظار التنفيذ",
  });
}

export async function executeHungerFinanceRequest(
  requestId: string,
  init?: CustomRequestInit,
): Promise<unknown> {
  return authFetch<unknown>(
    `${BASE}/finance/requests/${encodeURIComponent(requestId)}/execute`,
    {
      ...init,
      method: "POST",
      notifySuccess:
        init?.notifySuccess ?? "تم تنفيذ الطلب وترحيل الحركة المالية بنجاح",
    },
  );
}

export async function confirmHungerWithdrawalArrival(
  withdrawalId: string,
  payload: HungerWithdrawalActionRequest,
  init?: CustomRequestInit,
): Promise<unknown> {
  return authFetch<unknown>(
    `${BASE}/finance/withdrawals/${encodeURIComponent(withdrawalId)}/confirm-arrival`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم تأكيد وصول مبلغ السحب وترحيله للوجهة بنجاح",
    },
  );
}

export async function cancelHungerWithdrawal(
  withdrawalId: string,
  payload: HungerWithdrawalActionRequest,
  init?: CustomRequestInit,
): Promise<unknown> {
  return authFetch<unknown>(
    `${BASE}/finance/withdrawals/${encodeURIComponent(withdrawalId)}/cancel`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم إلغاء السحب المعلق وإلغاء الحجوزات بنجاح",
    },
  );
}

export async function getHungerFinanceEvents(
  params: {
    platformId: string;
    supervisorEmployeeId: string;
    page?: number;
    pageSize?: number;
  },
  init?: CustomRequestInit,
): Promise<HungerFinanceEventsListResponse> {
  const qs = new URLSearchParams();
  qs.set("platformId", params.platformId);
  qs.set("supervisorEmployeeId", params.supervisorEmployeeId);
  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(
    `${BASE}/finance/events?${qs.toString()}`,
    {
      ...init,
      method: "GET",
    },
  );
  if (Array.isArray(raw)) {
    return {
      items: raw as HungerFinanceEventsListResponse["items"],
      page,
      pageSize,
      totalCount: raw.length,
    };
  }
  const obj = (raw || {}) as Record<string, unknown>;
  const paged = normalizePaged<HungerFinanceEventsListResponse["items"][number]>(
    raw,
    page,
    pageSize,
  );
  const requests = Array.isArray(obj.requests)
    ? (obj.requests as HungerFinanceEventItem[])
    : undefined;
  return {
    custodyBalance:
      typeof obj.custodyBalance === "number" ? obj.custodyBalance : undefined,
    pendingBalance:
      typeof obj.pendingBalance === "number" ? obj.pendingBalance : undefined,
    pendingRemittanceBalance:
      typeof obj.pendingRemittanceBalance === "number"
        ? obj.pendingRemittanceBalance
        : undefined,
    totalCollections:
      typeof obj.totalCollections === "number"
        ? obj.totalCollections
        : undefined,
    items: paged.items,
    requests,
    page: paged.page,
    pageSize: paged.pageSize,
    totalCount: paged.totalCount,
  };
}

export async function createHungerRemittanceDraft(
  payload: HungerRemittanceCreateRequest,
  init?: CustomRequestInit,
): Promise<HungerRemittanceResponse> {
  return authFetch<HungerRemittanceResponse>(
    `${BASE}/finance/remittances/drafts`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم حفظ مسودة دفعة التوريد وحجز المصادر بنجاح",
    },
  );
}

export async function submitHungerRemittance(
  remittanceId: string,
  payload: HungerRemittanceActionRequest,
  init?: CustomRequestInit,
): Promise<HungerRemittanceResponse> {
  return authFetch<HungerRemittanceResponse>(
    `${BASE}/finance/remittances/${encodeURIComponent(remittanceId)}/submit`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم إرسال دفعة التوريد للمحاسب بنجاح",
    },
  );
}

export async function createHungerRemittance(
  payload: HungerRemittanceCreateRequest,
  init?: CustomRequestInit,
): Promise<HungerRemittanceResponse> {
  return authFetch<HungerRemittanceResponse>(`${BASE}/finance/remittances`, {
    ...init,
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess:
      init?.notifySuccess ??
      "تم إنشاء وإرسال سند التوريد وربطه بمصادر التحصيل بنجاح",
  });
}

export async function confirmHungerRemittance(
  remittanceId: string,
  payload: HungerRemittanceConfirmRequest,
  init?: CustomRequestInit,
): Promise<HungerRemittanceResponse> {
  return authFetch<HungerRemittanceResponse>(
    `${BASE}/finance/remittances/${encodeURIComponent(remittanceId)}/confirm`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم تأكيد استلام التوريد من قِبل المحاسب بنجاح",
    },
  );
}

export async function cancelHungerRemittance(
  remittanceId: string,
  payload: HungerRemittanceActionRequest,
  init?: CustomRequestInit,
): Promise<HungerRemittanceResponse> {
  return authFetch<HungerRemittanceResponse>(
    `${BASE}/finance/remittances/${encodeURIComponent(remittanceId)}/cancel`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم إلغاء دفعة التوريد وتحرير المصادر بنجاح",
    },
  );
}

export async function reverseHungerReceiptConfirmation(
  confirmationId: string,
  payload: HungerRemittanceActionRequest,
  init?: CustomRequestInit,
): Promise<unknown> {
  return authFetch<unknown>(
    `${BASE}/finance/receipt-confirmations/${encodeURIComponent(confirmationId)}/reverse`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم عكس تأكيد الاستلام واستعادة المتبقي بنجاح",
    },
  );
}

export async function getHungerPendingCollections(
  params: {
    platformId: string;
    supervisorEmployeeId: string;
    page?: number;
    pageSize?: number;
  },
  init?: CustomRequestInit,
): Promise<HungerPendingCollectionsResponse> {
  const qs = new URLSearchParams();
  qs.set("platformId", params.platformId);
  qs.set("supervisorEmployeeId", params.supervisorEmployeeId);
  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(
    `${BASE}/finance/pending-collections?${qs.toString()}`,
    {
      ...init,
      method: "GET",
    },
  );
  const obj = (raw || {}) as Record<string, unknown>;

  const rawBatches = obj.batches ?? obj.remittances ?? [];
  const rawSources = obj.sources ?? obj.collections ?? [];

  const batches = normalizePaged<HungerRemittanceResponse>(
    rawBatches,
    page,
    pageSize,
  );
  if (
    typeof obj.batchesTotalCount === "number" &&
    batches.totalCount === batches.items.length
  ) {
    batches.totalCount = obj.batchesTotalCount;
  }

  const sources = normalizePaged<HungerRemittanceSourceLineItem>(
    rawSources,
    page,
    pageSize,
  );
  if (
    typeof obj.sourcesTotalCount === "number" &&
    sources.totalCount === sources.items.length
  ) {
    sources.totalCount = obj.sourcesTotalCount;
  }

  return {
    batches: {
      ...batches,
      items: batches.items.map((b) => ({
        ...b,
        remittanceId: String(b.remittanceId ?? b.id ?? ""),
        totalAmount: b.totalAmount ?? b.amount ?? 0,
        confirmedAmount: b.confirmedAmount ?? 0,
        remainingAmount:
          b.remainingAmount ??
          Math.max(0, (b.totalAmount ?? b.amount ?? 0) - (b.confirmedAmount ?? 0)),
      })),
    },
    sources: {
      ...sources,
      items: sources.items.map((s) => ({
        ...s,
        sourceEventId: String(s.sourceEventId ?? s.eventId ?? s.id ?? ""),
        amount: s.amount ?? s.totalAmount ?? 0,
        confirmedAmount: s.confirmedAmount ?? 0,
        remainingAmount:
          s.remainingAmount ??
          s.remainingRemittableAmount ??
          Math.max(
            0,
            (s.amount ?? s.totalAmount ?? 0) - (s.confirmedAmount ?? 0),
          ),
      })),
    },
  };
}

export function resolveHungerEvidenceUrl(
  path?: string | null,
): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL || "https://gat.premiumasp.net"
    ).replace(/\/$/, "");
    return `${apiBase}${trimmed}`;
  }
  return null;
}

export function buildHungerWalletReviewFormData(
  payload: HungerWalletReviewRequest,
): FormData {
  const form = new FormData();

  const append = (
    key: string,
    value: string | number | boolean | null | undefined,
  ) => {
    if (value !== null && value !== undefined) {
      form.append(key, String(value));
    }
  };

  append("action", payload.action);
  append("riderProfileId", payload.riderProfileId);
  append("supervisorEmployeeId", payload.supervisorEmployeeId);
  append("businessDate", payload.businessDate);
  append("mobileBalance", payload.mobileBalance);

  // Send 0 for a confirmed first-period account; omit when unknown (null/undefined)
  if (payload.closingBalance !== null && payload.closingBalance !== undefined) {
    append("closingBalance", payload.closingBalance);
  }

  // Send 0 when there are no adjustments
  append("provenAdjustments", payload.provenAdjustments ?? 0);

  if (payload.closingEvidence && payload.closingEvidence.trim()) {
    append("closingEvidence", payload.closingEvidence.trim());
  }

  if (payload.adjustmentEvidence && payload.adjustmentEvidence.trim()) {
    append("adjustmentEvidence", payload.adjustmentEvidence.trim());
  }

  // walletEvidence: optional file. Omit the part when no image is selected.
  // Do not append null, undefined, or a text reference as the walletEvidence part. It accepts a file only.
  if (payload.walletEvidence instanceof File) {
    form.append("walletEvidence", payload.walletEvidence);
  }

  if (payload.action === "Deliver" && payload.assignment) {
    const asg = payload.assignment;
    append(
      "assignment.actualRiderProfileId",
      asg.actualRiderProfileId || payload.riderProfileId,
    );
    append("assignment.effectiveFrom", asg.effectiveFrom);
    if (asg.reason && asg.reason.trim()) {
      append("assignment.reason", asg.reason.trim());
    }
    append("assignment.wasBackdated", asg.wasBackdated ? "true" : "false");
    if (asg.backdatedReason && asg.backdatedReason.trim()) {
      append("assignment.backdatedReason", asg.backdatedReason.trim());
    }
    if (asg.compensationModel) {
      append("assignment.compensationModel", asg.compensationModel);
    }
    if (asg.paymentModel) {
      append("assignment.paymentModel", asg.paymentModel);
    }

    if (
      Array.isArray(asg.previousDayUsages) &&
      asg.previousDayUsages.length > 0
    ) {
      asg.previousDayUsages.forEach((usage, idx) => {
        const prefix = `assignment.previousDayUsages[${idx}]`;
        if (Array.isArray(usage.assignmentIds)) {
          usage.assignmentIds.forEach((id, idIdx) => {
            append(`${prefix}.assignmentIds[${idIdx}]`, id);
          });
        }
        if (usage.rowVersion) {
          append(`${prefix}.rowVersion`, usage.rowVersion);
        }
        if (
          usage.usageRowVersions &&
          typeof usage.usageRowVersions === "object"
        ) {
          for (const [rKey, rVal] of Object.entries(usage.usageRowVersions)) {
            if (rVal) append(`${prefix}.usageRowVersions.${rKey}`, rVal);
          }
        }
        if (usage.figures && typeof usage.figures === "object") {
          for (const [figKey, figVal] of Object.entries(usage.figures)) {
            if (figVal !== null && figVal !== undefined) {
              append(`${prefix}.figures.${figKey}`, figVal as string | number);
            }
          }
        }
      });
    }
  } else if (payload.action === "Return" && payload.return) {
    const ret = payload.return;
    append("return.effectiveTo", ret.effectiveTo);
    append("return.status", "Ended");
    append("return.reason", ret.reason);
    append("return.rowVersion", ret.rowVersion);

    if (ret.dayUsage && typeof ret.dayUsage === "object") {
      for (const [dKey, dVal] of Object.entries(ret.dayUsage)) {
        if (dVal !== null && dVal !== undefined) {
          append(`return.dayUsage.${dKey}`, dVal as string | number);
        }
      }
    }
  }

  return form;
}

export async function createHungerWalletReview(
  accountId: string,
  payload: HungerWalletReviewRequest,
  init?: CustomRequestInit,
): Promise<HungerWalletReviewResponse> {
  const form = buildHungerWalletReviewFormData(payload);
  return authFetch<HungerWalletReviewResponse>(
    `${BASE}/accounts/${encodeURIComponent(accountId)}/wallet-review`,
    {
      ...init,
      method: "POST",
      body: form,
    },
  );
}

export async function confirmHungerWalletReview(
  reviewId: string,
  init?: CustomRequestInit,
): Promise<unknown> {
  return authFetch<unknown>(
    `${BASE}/wallet-reviews/${encodeURIComponent(reviewId)}/confirm`,
    {
      ...init,
      method: "POST",
      notifySuccess:
        init?.notifySuccess ??
        "تم اعتماد مراجعة المحفظة وتنفيذ العملية المالية بنجاح",
    },
  );
}

export function formatRiderAccountLimitError(
  limit?: PlatformAssignmentLimit | null,
  fallbackDetail?: string,
): string {
  if (!limit) {
    return (
      fallbackDetail ||
      "وصل المندوب إلى الحد الأقصى للحسابات النشطة المسموح بها في المنصة. يجب إنهاء تكليفه الحالي أو تعديل الحد المسموح عبر المسار المعتمد قبل تسليم حساب آخر."
    );
  }

  const max = limit.maximumActiveAccounts ?? 1;
  let msg = `وصل المندوب إلى الحد الأقصى للحسابات النشطة (${max}).`;

  if (Array.isArray(limit.activeAccounts) && limit.activeAccounts.length > 0) {
    if (limit.activeAccounts.length === 1) {
      const acc = limit.activeAccounts[0];
      const plat =
        acc.platformNameAr ||
        (acc.platformCode &&
        acc.platformCode.toUpperCase().includes("HUNGER")
          ? "هنقرستيشن"
          : acc.platformCode) ||
        "هنقرستيشن";
      const num = acc.externalAccountId || acc.accountId || "";
      msg += ` لديه حاليًا حساب ${plat}${num ? ` رقم ${num}` : ""}.`;
    } else {
      const accList = limit.activeAccounts
        .map((acc) => {
          const plat =
            acc.platformNameAr ||
            (acc.platformCode &&
            acc.platformCode.toUpperCase().includes("HUNGER")
              ? "هنقرستيشن"
              : acc.platformCode) ||
            "منصة";
          const num = acc.externalAccountId || acc.accountId || "";
          return `حساب ${plat}${num ? ` رقم ${num}` : ""}`;
        })
        .join("، ");
      msg += ` لديه حاليًا: [${accList}].`;
    }
  }

  msg +=
    " يجب إنهاء تكليفه الحالي أو تعديل الحد المسموح عبر المسار المعتمد قبل تسليم حساب آخر.";

  if (
    Array.isArray(limit.allowedPaymentModels) &&
    limit.allowedPaymentModels.length > 0
  ) {
    msg += ` (يمكن تعديل نموذج الدفع إلى أحد النماذج المتاحة: ${limit.allowedPaymentModels.join("، ")}).`;
  }

  return msg;
}

export interface ParsedAssignmentLimitError {
  isLimitReached: boolean;
  field?: string;
  limit?: PlatformAssignmentLimit;
  message: string;
}

export function parseRiderAccountLimitError(
  err: unknown,
): ParsedAssignmentLimitError | null {
  if (!err || typeof err !== "object") return null;

  const anyErr = err as Record<string, unknown>;
  const details =
    anyErr.details && typeof anyErr.details === "object"
      ? (anyErr.details as Record<string, unknown>)
      : anyErr.problem && typeof anyErr.problem === "object"
        ? (anyErr.problem as Record<string, unknown>)
        : anyErr;

  const errorCode = String(
    details.errorCode ?? anyErr.errorCode ?? anyErr.code ?? details.code ?? "",
  );
  const field =
    typeof details.field === "string"
      ? details.field
      : typeof anyErr.field === "string"
        ? (anyErr.field as string)
        : undefined;

  const assignmentLimit = (details.assignmentLimit ||
    anyErr.assignmentLimit) as PlatformAssignmentLimit | undefined;

  if (
    errorCode === "platform.rider_account_limit_reached" ||
    Boolean(assignmentLimit) ||
    (anyErr.status === 409 &&
      (field === "actualRiderProfileId" ||
        String(details.detail || anyErr.message || "").includes(
          "الحد الأقصى للحسابات النشطة",
        )))
  ) {
    const detail =
      typeof details.detail === "string"
        ? details.detail
        : typeof anyErr.message === "string"
          ? anyErr.message
          : undefined;
    return {
      isLimitReached: true,
      field: field || "actualRiderProfileId",
      limit: assignmentLimit,
      message: formatRiderAccountLimitError(assignmentLimit, detail),
    };
  }

  return null;
}

export async function checkAccountWalletPeriodStatus(
  accountId: string,
  account?: HungerAccountItem | null,
  init?: CustomRequestInit,
): Promise<{
  hasNoHistory: boolean;
  isDefinite: boolean;
  missingContract: boolean;
  reason: string;
}> {
  if (account) {
    const raw = account as unknown as Record<string, unknown>;
    if (
      raw.hasPreviousWalletPeriod === false ||
      raw.hasWalletHistory === false
    ) {
      return {
        hasNoHistory: true,
        isDefinite: true,
        missingContract: false,
        reason: "تم التأكيد من بيانات الحساب بعدم وجود فترات محفظة سابقة.",
      };
    }
    if (
      raw.hasPreviousWalletPeriod === true ||
      raw.hasWalletHistory === true
    ) {
      return {
        hasNoHistory: false,
        isDefinite: true,
        missingContract: false,
        reason: "الحساب لديه فترات محفظة سابقة موثقة.",
      };
    }
  }

  try {
    const history = await getHungerAccountWalletHistory(
      accountId,
      {
        pageSize: 1,
        eventsPageSize: 1,
        observationsPageSize: 1,
      },
      init,
    );

    const totalEvents = history.totalEvents ?? history.events?.length ?? 0;
    const totalObservations =
      history.totalObservations ?? history.observations?.length ?? 0;

    if (totalEvents === 0 && totalObservations === 0) {
      const hasUsage = account?.monthlyUsageStatus === "Used";
      const hasRecordedClose =
        account?.lastClosingBalance !== null &&
        account?.lastClosingBalance !== undefined;

      if (!hasUsage && !hasRecordedClose) {
        return {
          hasNoHistory: true,
          isDefinite: true,
          missingContract: false,
          reason:
            "أكدت واجهة سجل المحفظة (GET /wallet-history) عدم وجود أي فترات أو إقفالات سابقة للحساب.",
        };
      }
    }

    return {
      hasNoHistory: false,
      isDefinite: true,
      missingContract: false,
      reason: `الحساب لديه سجل محفظة سابق (${totalObservations} إقفالات وملاحظات، و${totalEvents} حركات مالية).`,
    };
  } catch {
    return {
      hasNoHistory: false,
      isDefinite: false,
      missingContract: true,
      reason:
        "تعذر استدعاء واجهة سجل المحفظة (GET /wallet-history) للتحقق بشكل قاطع من وجود فترات سابقة.",
    };
  }
}

export async function createHungerRiderSwapReview(
  accountId: string,
  payload: HungerRiderSwapReviewRequest,
  init?: CustomRequestInit,
): Promise<HungerRiderSwapReviewResponse> {
  return authFetch<HungerRiderSwapReviewResponse>(
    `${BASE}/accounts/${encodeURIComponent(accountId)}/rider-swap/review`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function confirmHungerRiderSwap(
  swapId: string,
  init?: CustomRequestInit,
): Promise<HungerRiderSwapConfirmResponse> {
  return authFetch<HungerRiderSwapConfirmResponse>(
    `${BASE}/rider-swaps/${encodeURIComponent(swapId)}/confirm`,
    {
      ...init,
      method: "POST",
      notifySuccess:
        init?.notifySuccess ??
        "تم اعتماد تبديل المندوب وتنفيذ الإخلاء والتسليم ذريًا بنجاح",
    },
  );
}

export async function createHungerSettlementDocument(
  payload: HungerSettlementDocumentCreateRequest,
  init?: CustomRequestInit,
): Promise<HungerSettlementDocumentItem> {
  return authFetch<HungerSettlementDocumentItem>(
    `${BASE}/finance/settlement-documents`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم تسجيل مستند التسوية بنجاح",
    },
  );
}

export async function reconcileHungerSettlementDocument(
  documentId: string,
  payload: HungerSettlementReconcileRequest,
  init?: CustomRequestInit,
): Promise<HungerSettlementDocumentItem> {
  return authFetch<HungerSettlementDocumentItem>(
    `${BASE}/finance/settlement-documents/${encodeURIComponent(documentId)}/reconcile`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ??
        "تمت مطابقة مستند التسوية مع الإقفال الشهري بنجاح",
    },
  );
}

export async function getHungerSettlementDocuments(
  params: {
    platformId: string;
    month: string;
    accountId?: string;
    page?: number;
    pageSize?: number;
  },
  init?: CustomRequestInit,
): Promise<HungerPagedResponse<HungerSettlementDocumentItem>> {
  const qs = new URLSearchParams();
  qs.set("platformId", params.platformId);
  qs.set("month", normalizeMonthStartIso(params.month));
  if (params.accountId) qs.set("accountId", params.accountId);
  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(
    `${BASE}/finance/settlement-documents?${qs.toString()}`,
    {
      ...init,
      method: "GET",
    },
  );
  return normalizePaged<HungerSettlementDocumentItem>(raw, page, pageSize);
}

function appendWalletsQueryParams(
  qs: URLSearchParams,
  query: HungerWalletsQuery,
): void {
  if (query.balanceFrom && query.balanceFrom.trim()) {
    qs.set("balanceFrom", query.balanceFrom.trim());
  }
  if (query.balanceThrough && query.balanceThrough.trim()) {
    qs.set("balanceThrough", query.balanceThrough.trim());
  }
  if (query.balanceEqual && query.balanceEqual.trim()) {
    qs.set("balanceEqual", query.balanceEqual.trim());
  }
  if (query.receiptState && query.receiptState !== "all") {
    qs.set("receiptState", query.receiptState);
  }
  appendPrefixedAccountFilters(qs, query.accountFilters);
}

export async function getHungerWallets(
  query: HungerWalletsQuery = {},
  init?: CustomRequestInit,
): Promise<HungerPagedResponse<HungerWalletListItem>> {
  const qs = new URLSearchParams();
  appendWalletsQueryParams(qs, query);
  const page = query.page ?? 1;
  const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  const raw = await authFetch<unknown>(`${BASE}/wallets?${qs.toString()}`, {
    ...init,
    method: "GET",
  });
  return normalizePaged<HungerWalletListItem>(raw, page, pageSize);
}

export async function exportHungerWallets(
  query: HungerWalletsQuery & { format: "csv" | "xlsx" },
): Promise<void> {
  const qs = new URLSearchParams();
  appendWalletsQueryParams(qs, query);
  qs.set("format", query.format);
  await downloadFileFromEndpoint(
    `${BASE}/wallets/export?${qs.toString()}`,
    `hunger-wallets.${query.format}`,
  );
}

export async function getHungerAccountWalletHistory(
  accountId: string,
  params: {
    page?: number;
    pageSize?: number;
    eventsPage?: number;
    observationsPage?: number;
    eventsPageSize?: number;
    observationsPageSize?: number;
  } = {},
  init?: CustomRequestInit,
): Promise<HungerWalletHistoryResponse> {
  const qs = new URLSearchParams();
  const page = params.page ?? 1;
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  if (params.eventsPage !== undefined) {
    qs.set("eventsPage", String(params.eventsPage));
  }
  if (params.observationsPage !== undefined) {
    qs.set("observationsPage", String(params.observationsPage));
  }
  if (params.eventsPageSize !== undefined) {
    qs.set("eventsPageSize", String(params.eventsPageSize));
  }
  if (params.observationsPageSize !== undefined) {
    qs.set("observationsPageSize", String(params.observationsPageSize));
  }

  const raw = await authFetch<unknown>(
    `${BASE}/accounts/${encodeURIComponent(accountId)}/wallet-history?${qs.toString()}`,
    {
      ...init,
      method: "GET",
    },
  );
  const obj = (raw || {}) as Record<string, unknown>;
  const rawEvents = Array.isArray(obj.events)
    ? (obj.events as HungerWalletHistoryEventItem[])
    : Array.isArray((obj.events as Record<string, unknown>)?.items)
      ? ((obj.events as Record<string, unknown>).items as HungerWalletHistoryEventItem[])
      : Array.isArray(obj.financialEvents)
        ? (obj.financialEvents as HungerWalletHistoryEventItem[])
        : [];
  const rawObservations = Array.isArray(obj.observations)
    ? (obj.observations as HungerWalletObservationItem[])
    : Array.isArray((obj.observations as Record<string, unknown>)?.items)
      ? ((obj.observations as Record<string, unknown>).items as HungerWalletObservationItem[])
      : Array.isArray(obj.walletObservations)
        ? (obj.walletObservations as HungerWalletObservationItem[])
        : [];

  const totalEvents =
    typeof obj.totalEvents === "number"
      ? obj.totalEvents
      : typeof (obj.events as Record<string, unknown>)?.totalCount === "number"
        ? ((obj.events as Record<string, unknown>).totalCount as number)
        : rawEvents.length;

  const totalObservations =
    typeof obj.totalObservations === "number"
      ? obj.totalObservations
      : typeof (obj.observations as Record<string, unknown>)?.totalCount === "number"
        ? ((obj.observations as Record<string, unknown>).totalCount as number)
        : rawObservations.length;

  return {
    events: rawEvents,
    observations: rawObservations,
    totalEvents,
    totalObservations,
    page: typeof obj.page === "number" ? obj.page : page,
    pageSize: typeof obj.pageSize === "number" ? obj.pageSize : pageSize,
  };
}

// ---------------------------------------------------------------------------
// 5. Shared Platform Account Business Context & Credentials Endpoints
// ---------------------------------------------------------------------------

export async function getPlatformAccountBusinessContext(
  accountId: string,
  params?: { from?: string; through?: string },
  init?: CustomRequestInit,
): Promise<PlatformAccountBusinessContextResponse> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.through) qs.set("through", params.through);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return authFetch<PlatformAccountBusinessContextResponse>(
    `/api/platform-accounts/${encodeURIComponent(accountId)}/business-context${query}`,
    {
      ...init,
      method: "GET",
    },
  );
}

export async function updatePlatformAccountBusiness(
  accountId: string,
  payload: PlatformAccountBusinessUpdateRequest,
  init?: CustomRequestInit,
): Promise<PlatformAccountBusinessContextResponse> {
  return authFetch<PlatformAccountBusinessContextResponse>(
    `/api/platform-accounts/${encodeURIComponent(accountId)}/business`,
    {
      ...init,
      method: "PUT",
      body: JSON.stringify(payload),
      notifySuccess:
        init?.notifySuccess ?? "تم تحديث البيانات التجارية والتشغيلية للحساب بنجاح",
    },
  );
}

export async function revealPlatformAccountCredentials(
  accountId: string,
  reason: string,
  init?: CustomRequestInit,
): Promise<PlatformAccountCredentialRevealResponse> {
  return authFetch<PlatformAccountCredentialRevealResponse>(
    `/api/platform-accounts/${encodeURIComponent(accountId)}/credentials/reveal`,
    {
      ...init,
      method: "POST",
      cache: "no-store",
      body: JSON.stringify({ reason }),
    },
  );
}

export async function updateSimCardOwnership(
  simId: string,
  payload: SimOwnershipUpdateRequest,
  init?: CustomRequestInit,
): Promise<unknown> {
  return authFetch<unknown>(
    `/api/platform-accounts/sim-cards/${encodeURIComponent(simId)}/ownership`,
    {
      ...init,
      method: "PUT",
      body: JSON.stringify(payload),
      notifySuccess: init?.notifySuccess ?? "تم تحديث ملكية شريحة الاتصال بنجاح",
    },
  );
}
