import { authFetch } from "../auth/api";

export type VehicleDailyDistanceItem = {
  id: string | null;
  vehicleId: string;
  workDate: string;
  assetNumber: string;
  plateNumberAr: string | null;
  plateNumberEn: string | null;
  currentOdometer: number;
  vehicleTrackedDistanceKm: number;
  gpsDistanceKm: number | null;
  manualOdometerReading: number | null;
  manualBaselineOdometerReading: number | null;
  manualDistanceKm: number | null;
  appliedDistanceKm: number | null;
  appliedSource: "None" | "Manual" | "Gps" | 0 | 1 | 2 | string;
  effectiveOdometerAfterKm?: number | null;
  operatingCity?: string | null;
  operatingCityId?: string | null;
  operatingCityNameAr?: string | null;
  operatingCityNameEn?: string | null;
  city?: string | null;
  gpsImportedAtUtc: string | null;
  lastGpsImportId?: string | null;
  gpsImportedByUserId?: string | null;
  manualEnteredAtUtc: string | null;
  manualEnteredByUserId?: string | null;
  manualNotes: string | null;
  rowVersion: string | null;
};

export type VehicleDailyDistancesResponse = {
  items: VehicleDailyDistanceItem[];
  workDate: string;
  page: number;
  pageSize: number;
  totalCount: number;
  gpsCount: number;
  manualFallbackCount: number;
  missingCount: number;
  appliedTotalKm: number;
};

export type SaveManualOdometerRequest = {
  odometerReading: number;
  baselineOdometerReading?: number | null;
  notes?: string | null;
  rowVersion?: string | null;
};

export type GpsImportErrorItem = {
  rowNumber?: number;
  plateNumber?: string;
  errorCode: string;
  message: string;
};

export type GpsImportResponse = {
  matchedRows: number;
  unmatchedRows: number;
  invalidRows: number;
  errors: GpsImportErrorItem[];
};

export type GpsImportLogItem = {
  id: string;
  fileName: string;
  sha256Hash?: string;
  workDate: string;
  matchedRows: number;
  unmatchedRows: number;
  invalidRows: number;
  importedByUserId?: string;
  importedByUserName?: string;
  importedAtUtc: string;
};

/**
 * Fetch daily distance records for a given date with optional search & filter
 */
export async function getVehicleDailyDistances(params: {
  workDate: string;
  search?: string;
  source?: "gps" | "manual" | "missing" | "";
  page?: number;
  pageSize?: number;
}): Promise<VehicleDailyDistancesResponse> {
  const query = new URLSearchParams();
  query.set("workDate", params.workDate);
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.source) query.set("source", params.source);
  query.set("page", (params.page || 1).toString());
  query.set("pageSize", (params.pageSize || 100).toString());

  return await authFetch<VehicleDailyDistancesResponse>(`/api/vehicle-daily-distances?${query.toString()}`);
}

/**
 * Enter or update manual odometer reading for a vehicle on a specific date
 */
export async function saveManualOdometer(
  vehicleId: string,
  workDate: string,
  data: SaveManualOdometerRequest
): Promise<VehicleDailyDistanceItem> {
  return await authFetch<VehicleDailyDistanceItem>(`/api/vehicle-daily-distances/${vehicleId}/${workDate}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * Upload GPS Excel report (.xls / .xlsx / .htm / .html / .zip) for daily distances
 */
export async function importGpsFile(
  file: File,
  expectedWorkDate?: string
): Promise<GpsImportResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (expectedWorkDate) {
    formData.append("expectedWorkDate", expectedWorkDate);
  }

  return await authFetch<GpsImportResponse>(`/api/vehicle-daily-distances/gps-import`, {
    method: "POST",
    body: formData,
  });
}

/**
 * Get recent GPS import history logs
 */
export async function getGpsImportLogs(workDate?: string): Promise<GpsImportLogItem[]> {
  const query = workDate ? `?workDate=${encodeURIComponent(workDate)}` : "";
  return await authFetch<GpsImportLogItem[]>(`/api/vehicle-daily-distances/gps-imports${query}`);
}

/**
 * Helper to normalize appliedSource enum/string to standard representation
 */
export function getAppliedSourceInfo(source: string | number | null | undefined): {
  code: "Gps" | "Manual" | "None";
  labelAr: string;
  labelEn: string;
  colorClass: string;
  badgeTone: "emerald" | "amber" | "slate";
} {
  if (source === 2 || source === "2" || source === "Gps" || source === "GPS" || source === "gps") {
    return {
      code: "Gps",
      labelAr: "GPS (معتمد)",
      labelEn: "GPS (Applied)",
      colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200",
      badgeTone: "emerald",
    };
  }
  if (source === 1 || source === "1" || source === "Manual" || source === "manual") {
    return {
      code: "Manual",
      labelAr: "يدوي (بديل)",
      labelEn: "Manual (Fallback)",
      colorClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200",
      badgeTone: "amber",
    };
  }
  return {
    code: "None",
    labelAr: "بدون مسافة",
    labelEn: "No Distance",
    colorClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
    badgeTone: "slate",
  };
}

/**
 * Translate and describe API error codes for daily distances operations
 */
export function getDailyDistanceErrorMessage(errorCode?: string, defaultMessage?: string): {
  title: string;
  description: string;
} {
  switch (errorCode) {
    case "fleet.daily_distance.invalid_gps_file":
      return {
        title: "بنية الملف غير صالحة",
        description: "تعذر قراءة ملف تقرير GPS. تأكد من أن الملف هو تقرير سليم بصيغة Excel أو HTML.",
      };
    case "fleet.daily_distance.gps_frameset_missing_sheet":
      return {
        title: "صفحة أوراق العمل مفقودة",
        description:
          "ملف XLS المرفوع هو صفحة إطارات (Frameset) وتوجد البيانات في مجلد المرافق (.files). يُرجى رفع ملف sheet001.htm مباشرة، أو ضغط ملف XLS مع مجلده في ملف ZIP ورفعه، أو إعادة حفظ التقرير بصيغة XLSX.",
      };
    case "fleet.daily_distance.gps_date_mismatch":
      return {
        title: "عدم تطابق تاريخ التقرير",
        description: "تاريخ العمل داخل تقرير GPS المرفوع لا يطابق تاريخ العمل المستهدف المحدد في الشاشة.",
      };
    case "fleet.daily_distance.duplicate_gps_import":
      return {
        title: "تقرير مكرر",
        description: "تم رفع هذا التقرير مسبقاً لنفس تاريخ العمل.",
      };
    case "fleet.daily_distance.invalid_manual_odometer":
      return {
        title: "قراءة عداد غير صالحة",
        description:
          "القراءة اليدوية المدخلة أقل من العداد الفعلي التشغيلي الناتج عن الأيام السابقة أو تكسر تسلسل القراءات. يرجى إدخال قراءة صحيحة أو إجراء تصحيح إداري.",
      };
    case "fleet.daily_distance.manual_baseline_required":
      return {
        title: "قراءة الأساس مطلوبة",
        description: "لا توجد قراءة سابقة مسجلة تلقائياً لهذه المركبة؛ يجب إدخال قراءة العداد السابقة (الأساس) لبدء الاحتساب.",
      };
    case "fleet.concurrency_conflict":
      return {
        title: "تعارض في التحديث",
        description: "تم تعديل السجل بواسطة مستخدم آخر أثناء التعديل؛ تم تحديث البيانات تلقائياً، يرجى المحاولة مجدداً.",
      };
    default:
      return {
        title: "حدث خطأ",
        description: defaultMessage || "حدث خطأ غير متوقع أثناء تنفيذ العملية.",
      };
  }
}

/**
 * Translate GPS row-level error codes
 */
export function getGpsRowErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "vehicle_not_found":
      return "لا توجد مركبة مطابقة لرقم اللوحة في النظام.";
    case "ambiguous_plate":
      return "رقم اللوحة يطابق أكثر من مركبة في النظام.";
    case "duplicate_plate":
      return "رقم اللوحة مكرر داخل نفس التقرير المرفوع.";
    case "invalid_distance":
      return "قيمة المسافة غير قابلة للقراءة أو بصيغة رقمية غير صالحة.";
    default:
      return errorCode;
  }
}
