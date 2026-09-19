"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileQuestion,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import {
  getComplianceExpiries,
  type ExpiryComplianceItem,
  type ExpiryComplianceResponse,
  type ExpiryComplianceSummary,
} from "../../../../lib/workforce/compliance-api";
import {
  getDocumentTypes,
  type DocumentType,
} from "../../../../lib/workforce/documents-api";
import {
  listSponsors,
  listEmployees,
  listRiders,
  type Sponsor,
} from "../../../../lib/workforce/api";
import type { Employee, Rider } from "../../../../lib/workforce/types";
import { hrCatalogApi, type HrRow } from "../../../../lib/hr/api";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { translate } from "../../../../lib/i18n";
import { SearchableSelect } from "../../../../components/ui/SearchableSelect";
import { toast } from "../../../../components/ui/Toast";

function isGeneralDocument(item: { categoryNameAr?: string; categoryNameEn?: string; categoryCode?: string }) {
  const ar = (item.categoryNameAr || "").trim().toLowerCase();
  const en = (item.categoryNameEn || "").trim().toLowerCase();
  const code = (item.categoryCode || "").trim().toLowerCase();

  return (
    ar === "standers" ||
    ar === "standard" ||
    ar === "standards" ||
    ar.includes("وثيقة عامة") ||
    ar.includes("وثيقة عامه") ||
    en === "standers" ||
    en === "standard" ||
    en === "standards" ||
    en.includes("standard document") ||
    code === "standers" ||
    code === "standard" ||
    code === "standards" ||
    code === "general_document" ||
    code === "general"
  );
}

function formatCategoryName(nameAr: string, nameEn: string, locale: string, documentTypes?: DocumentType[]) {
  const ar = (nameAr || "").trim();
  const en = (nameEn || "").trim();
  const lowerAr = ar.toLowerCase();
  const lowerEn = en.toLowerCase();

  if (lowerAr === "standers" || lowerAr === "standard" || lowerAr === "standards" || lowerEn === "standers") {
    return locale === "en" ? "Standard Document" : "وثيقة عامة";
  }

  if (locale === "en") {
    if (en) return en;
    if (documentTypes) {
      const match = documentTypes.find((d) => d.nameAr?.trim() === ar);
      if (match?.nameEn) return match.nameEn;
    }
    return ar || en;
  }

  if (ar) return ar;
  if (documentTypes) {
    const match = documentTypes.find((d) => d.nameEn?.trim().toLowerCase() === lowerEn);
    if (match?.nameAr) return match.nameAr;
  }
  return ar || en;
}

function getSourceTypeMeta(sourceType: unknown) {
  const val = String(sourceType ?? "").toLowerCase();
  if (val === "0" || val === "employeedocument") {
    return { ar: "وثيقة موظف", en: "Employee Document", badge: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (val === "1" || val === "driverlicense") {
    return { ar: "رخصة قيادة", en: "Driver License", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  }
  if (val === "2" || val === "ridercard") {
    return { ar: "بطاقة مندوب", en: "Rider Card", badge: "bg-purple-50 text-purple-700 border-purple-200" };
  }
  if (val === "3" || val === "healthcard") {
    return { ar: "شهادة صحية", en: "Health Card", badge: "bg-teal-50 text-teal-700 border-teal-200" };
  }
  if (val === "4" || val === "medicalinsurance") {
    return { ar: "تأمين طبي", en: "Medical Insurance", badge: "bg-cyan-50 text-cyan-700 border-cyan-200" };
  }
  return { ar: "وثيقة", en: "Document", badge: "bg-slate-100 text-slate-700 border-slate-200" };
}

function getDueStatusMeta(dueStatus: unknown, daysRemaining: number | null) {
  let code: 0 | 1 | 2 | 3 | 4;

  if (daysRemaining === null) {
    code = 4; // Missing
  } else if (daysRemaining < 0) {
    code = 3; // Expired
  } else if (daysRemaining === 0) {
    code = 2; // Due Today
  } else if (daysRemaining >= 1 && daysRemaining <= 30) {
    code = 1; // Upcoming
  } else if (daysRemaining > 30) {
    code = 0; // Valid
  } else {
    const val = String(dueStatus ?? "").toLowerCase();
    if (val === "0" || val === "valid") code = 0;
    else if (val === "1" || val === "upcoming") code = 1;
    else if (val === "2" || val === "duetoday") code = 2;
    else if (val === "3" || val === "expired") code = 3;
    else if (val === "4" || val === "missing") code = 4;
    else code = 0;
  }

  switch (code) {
    case 0:
      return { ar: "ساري", en: "Valid", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2 };
    case 1:
      return { ar: "قريب الانتهاء", en: "Upcoming", color: "bg-amber-100 text-amber-800 border-amber-300", icon: Clock };
    case 2:
      return { ar: "ينتهي اليوم", en: "Due Today", color: "bg-orange-100 text-orange-800 border-orange-300", icon: AlertTriangle };
    case 3:
      return { ar: "منتهي", en: "Expired", color: "bg-red-100 text-red-800 border-red-300", icon: AlertCircle };
    case 4:
      return { ar: "غير مضاف", en: "Missing", color: "bg-slate-100 text-slate-700 border-slate-300", icon: FileQuestion };
  }
}

function getEmployeeStatusMeta(status: unknown) {
  const s = String(status ?? "").trim();
  const map: Record<string, { ar: string; en: string; badge: string }> = {
    Active: {
      ar: "نشط",
      en: "Active",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    },
    Terminated: {
      ar: "منتهي الخدمة",
      en: "Terminated",
      badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    },
    Suspended: {
      ar: "موقوف",
      en: "Suspended",
      badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    },
    OnLeave: {
      ar: "في إجازة",
      en: "On Leave",
      badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    },
    Probationary: {
      ar: "تحت التجربة",
      en: "Probationary",
      badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    },
    Inactive: {
      ar: "غير نشط",
      en: "Inactive",
      badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    },
    Draft: {
      ar: "مسودة",
      en: "Draft",
      badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    },
    Onboarding: {
      ar: "قيد التهيئة",
      en: "Onboarding",
      badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    },
    Archived: {
      ar: "مؤرشف",
      en: "Archived",
      badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    },
    Fleeing: {
      ar: "هروب / انقطاع",
      en: "Fleeing",
      badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    },
    Accident: {
      ar: "حادث",
      en: "Accident",
      badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    },
    Sick: {
      ar: "إجازة مرضية",
      en: "Sick",
      badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    },
  };

  return (
    map[s] || {
      ar: s || "غير محدد",
      en: s || "Unspecified",
      badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    }
  );
}

export default function ExpiryCompliancePage() {
  const { locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const getTodayRiyadh = () => {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const riyadh = new Date(utc + 3 * 3600000);
    return riyadh.toISOString().slice(0, 10);
  };

  const HR_COMPLIANCE_FILTERS_SESSION_KEY = "admin_hr_compliance_expiries_filters_session";
  const [isRestored, setIsRestored] = useState(false);

  const [checkDate, setCheckDate] = useState(getTodayRiyadh);
  const [search, setSearch] = useState("");
  const [sourceType, setSourceType] = useState("all");
  const [dueStatus, setDueStatus] = useState("all");
  const [employeeStatus, setEmployeeStatus] = useState("all");
  const [operatingCityId, setOperatingCityId] = useState("all");
  const [sponsorId, setSponsorId] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ExpiryComplianceResponse | null>(null);

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [cities, setCities] = useState<HrRow[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [exporting, setExporting] = useState(false);

  // Restore filters on mount for the current session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(HR_COMPLIANCE_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.search === "string") setSearch(parsed.search);
        if (typeof parsed.sourceType === "string") setSourceType(parsed.sourceType);
        if (typeof parsed.dueStatus === "string") setDueStatus(parsed.dueStatus);
        if (typeof parsed.employeeStatus === "string") setEmployeeStatus(parsed.employeeStatus);
        if (typeof parsed.operatingCityId === "string") setOperatingCityId(parsed.operatingCityId);
        if (typeof parsed.sponsorId === "string") setSponsorId(parsed.sponsorId);
        if (typeof parsed.checkDate === "string" && parsed.checkDate) setCheckDate(parsed.checkDate);
        if (typeof parsed.page === "number" && parsed.page >= 1) setPage(parsed.page);
        if (typeof parsed.pageSize === "number" && [25, 50, 100].includes(parsed.pageSize)) setPageSize(parsed.pageSize);
      }
    } catch {
      // ignore JSON parse or sessionStorage errors
    } finally {
      setIsRestored(true);
    }
  }, []);

  // Save filters to sessionStorage whenever filters change (only after initial restoration)
  useEffect(() => {
    if (!isRestored) return;
    try {
      const isDefault =
        !search &&
        sourceType === "all" &&
        dueStatus === "all" &&
        employeeStatus === "all" &&
        operatingCityId === "all" &&
        sponsorId === "all" &&
        checkDate === getTodayRiyadh() &&
        page === 1 &&
        pageSize === 50;

      if (!isDefault) {
        sessionStorage.setItem(
          HR_COMPLIANCE_FILTERS_SESSION_KEY,
          JSON.stringify({
            search,
            sourceType,
            dueStatus,
            employeeStatus,
            operatingCityId,
            sponsorId,
            checkDate,
            page,
            pageSize,
          })
        );
      } else {
        sessionStorage.removeItem(HR_COMPLIANCE_FILTERS_SESSION_KEY);
      }
    } catch {
      // ignore sessionStorage errors
    }
  }, [isRestored, search, sourceType, dueStatus, employeeStatus, operatingCityId, sponsorId, checkDate, page, pageSize]);

  useEffect(() => {
    void listSponsors().then(setSponsors).catch(() => { });
    void hrCatalogApi.list("operating-cities").then(setCities).catch(() => { });
    void getDocumentTypes()
      .then((res) => setDocumentTypes(res || []))
      .catch(() => { });
    void listEmployees().then((res) => setEmployees(res || [])).catch(() => { });
    void listRiders().then((res) => setRiders(res || [])).catch(() => { });
  }, []);

  const employeeMap = useMemo(() => {
    const map = new Map<string, { iqamaNo?: string | null; employeeNumber?: string | null; name?: string }>();
    for (const emp of employees) {
      map.set(emp.id, { iqamaNo: emp.iqamaNo, employeeNumber: emp.employeeNumber, name: emp.fullNameAr });
    }
    return map;
  }, [employees]);

  const riderMap = useMemo(() => {
    const map = new Map<string, { iqamaNo?: string | null }>();
    for (const r of riders) {
      if (r.id) map.set(r.id, { iqamaNo: r.iqamaNo });
      if (r.employeeId) map.set(r.employeeId, { iqamaNo: r.iqamaNo });
    }
    return map;
  }, [riders]);

  const getIqamaNumber = (item: ExpiryComplianceItem): string => {
    const direct = item.iqamaNo || item.iqamaNumber || item.employeeIqamaNo || item.nationalId;
    if (direct && String(direct).trim()) return String(direct).trim();

    if (item.employeeId) {
      const emp = employeeMap.get(item.employeeId);
      if (emp?.iqamaNo && emp.iqamaNo.trim()) return emp.iqamaNo.trim();
    }

    if (item.riderProfileId) {
      const rider = riderMap.get(item.riderProfileId);
      if (rider?.iqamaNo && rider.iqamaNo.trim()) return rider.iqamaNo.trim();
    }
    if (item.employeeId) {
      const rider = riderMap.get(item.employeeId);
      if (rider?.iqamaNo && rider.iqamaNo.trim()) return rider.iqamaNo.trim();
    }

    const catCode = (item.categoryCode || "").toLowerCase();
    const catAr = item.categoryNameAr || "";
    if (
      (catCode === "residencypermit" || catCode === "iqama" || catAr.includes("إقامة") || catAr.includes("اقامة")) &&
      item.referenceMasked
    ) {
      return item.referenceMasked;
    }

    return "";
  };

  const documentTypeOptions = useMemo(() => {
    const opts: { value: string; label: string; sublabel?: string }[] = [
      { value: "all", label: locale === "en" ? "All Document Types" : "جميع أنواع الوثائق" },
    ];

    const seenValues = new Set<string>();

    // 1. Add all document types from backend catalog (/api/hr-catalogs/document-types)
    for (const dt of documentTypes) {
      if (dt.status === "Disabled" || dt.status === "Archived") continue;
      const key = (dt.code || dt.id || "").trim();
      if (!key || seenValues.has(key.toLowerCase())) continue;
      seenValues.add(key.toLowerCase());

      const label = locale === "en" ? dt.nameEn || dt.nameAr : dt.nameAr || dt.nameEn;
      opts.push({
        value: dt.code || dt.id,
        label,
        sublabel: dt.code || undefined,
      });
    }

    // 2. Also dynamically include any categories present in current compliance data items
    // (e.g. Driver License, Medical Insurance, etc., so they are available dynamically if returned by backend)
    if (data?.items) {
      for (const item of data.items) {
        if (isGeneralDocument(item)) continue;
        const catCode = (item.categoryCode || "").trim();
        const catNameAr = (item.categoryNameAr || "").trim();
        const catNameEn = (item.categoryNameEn || "").trim();
        const label = formatCategoryName(catNameAr, catNameEn, locale, documentTypes);

        const matchFound = documentTypes.some((dt) => {
          const dtCode = (dt.code || "").trim().toLowerCase();
          const dtNameAr = (dt.nameAr || "").trim().toLowerCase();
          const dtNameEn = (dt.nameEn || "").trim().toLowerCase();
          return (
            (catCode && dtCode === catCode.toLowerCase()) ||
            (catNameAr && dtNameAr === catNameAr.toLowerCase()) ||
            (catNameEn && dtNameEn === catNameEn.toLowerCase())
          );
        });

        const key = catCode || catNameAr;
        if (!matchFound && key && !seenValues.has(key.toLowerCase()) && !seenValues.has(label.toLowerCase())) {
          seenValues.add(key.toLowerCase());
          seenValues.add(label.toLowerCase());
          opts.push({
            value: key,
            label,
            sublabel: catCode || undefined,
          });
        }
      }
    }

    return opts;
  }, [documentTypes, data?.items, locale]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const isKnownSourceType = ["EmployeeDocument", "DriverLicense", "RiderCard", "HealthCard", "MedicalInsurance"].includes(sourceType);

      const res = await getComplianceExpiries({
        checkDate,
        sourceType: isKnownSourceType ? sourceType : undefined,
        categoryCode: !isKnownSourceType && sourceType !== "all" ? sourceType : undefined,
        dueStatus,
        employeeStatus,
        operatingCityId,
        sponsorId,
        page,
        pageSize,
      });
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Failed to load compliance expiries data."
            : "تعذر تحميل بيانات امتثال الصلاحيات.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isRestored) return;
    void loadData();
  }, [isRestored, checkDate, sourceType, dueStatus, employeeStatus, operatingCityId, sponsorId, page, pageSize]);

  const items = useMemo(() => {
    if (!data?.items) return [];
    let filtered = data.items.filter((x) => !isGeneralDocument(x));

    // Filter by selected document type / category
    if (sourceType && sourceType !== "all") {
      const target = sourceType.trim().toLowerCase();
      const matchedDocType = documentTypes.find(
        (dt) =>
          (dt.code && dt.code.toLowerCase() === target) ||
          (dt.id && dt.id.toLowerCase() === target) ||
          (dt.nameAr && dt.nameAr.toLowerCase() === target) ||
          (dt.nameEn && dt.nameEn.toLowerCase() === target)
      );

      filtered = filtered.filter((x) => {
        const itemCode = (x.categoryCode || "").trim().toLowerCase();
        const itemNameAr = (x.categoryNameAr || "").trim().toLowerCase();
        const itemNameEn = (x.categoryNameEn || "").trim().toLowerCase();
        const itemSourceTypeStr = String(x.sourceType ?? "").trim().toLowerCase();

        if (itemCode === target || itemNameAr === target || itemNameEn === target) return true;
        if (itemSourceTypeStr === target) return true;

        if (matchedDocType) {
          if (matchedDocType.code && itemCode === matchedDocType.code.toLowerCase()) return true;
          if (matchedDocType.nameAr && itemNameAr === matchedDocType.nameAr.toLowerCase()) return true;
          if (matchedDocType.nameEn && itemNameEn === matchedDocType.nameEn.toLowerCase()) return true;
        }

        return false;
      });
    }

    if (!search.trim()) return filtered;
    const q = search.toLowerCase().trim();
    return filtered.filter((x) => {
      const empStatus = getEmployeeStatusMeta(x.employeeStatus);
      const catFormatted = formatCategoryName(x.categoryNameAr, x.categoryNameEn, locale, documentTypes).toLowerCase();
      const iqama = getIqamaNumber(x).toLowerCase();
      return (
        x.employeeNameAr.toLowerCase().includes(q) ||
        iqama.includes(q) ||
        x.categoryNameAr.toLowerCase().includes(q) ||
        (x.categoryNameEn && x.categoryNameEn.toLowerCase().includes(q)) ||
        catFormatted.includes(q) ||
        (x.referenceMasked && x.referenceMasked.toLowerCase().includes(q)) ||
        (x.employeeStatus && x.employeeStatus.toLowerCase().includes(q)) ||
        empStatus.ar.toLowerCase().includes(q) ||
        empStatus.en.toLowerCase().includes(q)
      );
    });
  }, [data, search, sourceType, documentTypes, locale, employeeMap, riderMap]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const isKnownSourceType = ["EmployeeDocument", "DriverLicense", "RiderCard", "HealthCard", "MedicalInsurance"].includes(sourceType);

      // Fetch all records with current filters
      const res = await getComplianceExpiries({
        checkDate,
        sourceType: isKnownSourceType ? sourceType : undefined,
        categoryCode: !isKnownSourceType && sourceType !== "all" ? sourceType : undefined,
        dueStatus,
        employeeStatus,
        operatingCityId,
        sponsorId,
        page: 1,
        pageSize: 10000,
      });

      let exportItems = (res.items || []).filter((x) => !isGeneralDocument(x));

      // Filter by document type / category if custom
      if (sourceType && sourceType !== "all") {
        const target = sourceType.trim().toLowerCase();
        const matchedDocType = documentTypes.find(
          (dt) =>
            (dt.code && dt.code.toLowerCase() === target) ||
            (dt.id && dt.id.toLowerCase() === target) ||
            (dt.nameAr && dt.nameAr.toLowerCase() === target) ||
            (dt.nameEn && dt.nameEn.toLowerCase() === target)
        );

        exportItems = exportItems.filter((x) => {
          const itemCode = (x.categoryCode || "").trim().toLowerCase();
          const itemNameAr = (x.categoryNameAr || "").trim().toLowerCase();
          const itemNameEn = (x.categoryNameEn || "").trim().toLowerCase();
          const itemSourceTypeStr = String(x.sourceType ?? "").trim().toLowerCase();

          if (itemCode === target || itemNameAr === target || itemNameEn === target) return true;
          if (itemSourceTypeStr === target) return true;

          if (matchedDocType) {
            if (matchedDocType.code && itemCode === matchedDocType.code.toLowerCase()) return true;
            if (matchedDocType.nameAr && itemNameAr === matchedDocType.nameAr.toLowerCase()) return true;
            if (matchedDocType.nameEn && itemNameEn === matchedDocType.nameEn.toLowerCase()) return true;
          }

          return false;
        });
      }

      // Apply search filter if user searched
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        exportItems = exportItems.filter((x) => {
          const empStatus = getEmployeeStatusMeta(x.employeeStatus);
          const catFormatted = formatCategoryName(x.categoryNameAr, x.categoryNameEn, locale, documentTypes).toLowerCase();
          const iqama = getIqamaNumber(x).toLowerCase();
          return (
            x.employeeNameAr.toLowerCase().includes(q) ||
            iqama.includes(q) ||
            x.categoryNameAr.toLowerCase().includes(q) ||
            (x.categoryNameEn && x.categoryNameEn.toLowerCase().includes(q)) ||
            catFormatted.includes(q) ||
            (x.referenceMasked && x.referenceMasked.toLowerCase().includes(q)) ||
            (x.employeeStatus && x.employeeStatus.toLowerCase().includes(q)) ||
            empStatus.ar.toLowerCase().includes(q) ||
            empStatus.en.toLowerCase().includes(q)
          );
        });
      }

      if (exportItems.length === 0) {
        toast.show(
          "warning",
          locale === "en" ? "No records to export" : "لا توجد سجلات لتصديرها",
          locale === "en" ? "Please adjust your filters." : "يرجى تعديل الفلاتر المحددة."
        );
        return;
      }

      // Dynamically import xlsx
      const XLSX = await import("xlsx");

      const rows = exportItems.map((item, idx) => {
        const statusMeta = getDueStatusMeta(item.dueStatus, item.daysRemaining);
        const empStatusMeta = getEmployeeStatusMeta(item.employeeStatus);
        const docTypeMeta = getSourceTypeMeta(item.sourceType);
        const iqama = getIqamaNumber(item);

        if (locale === "en") {
          return {
            "#": idx + 1,
            "Employee / Rider": item.employeeNameAr,
            "Iqama / ID No": iqama || "—",
            "Document Type": formatCategoryName(item.categoryNameAr, item.categoryNameEn, "en", documentTypes),
            "Expiry Date": item.expiryDate || "—",
            "Days Remaining": item.daysRemaining !== null ? item.daysRemaining : "—",
            "Due Status": statusMeta.en,
            "Employee Status": empStatusMeta.en,
            "Source Category": docTypeMeta.en,
            "Reference": item.referenceMasked || "—",
          };
        }

        return {
          "م": idx + 1,
          "الموظف / المندوب": item.employeeNameAr,
          "رقم الإقامة / الهوية": iqama || "—",
          "نوع الوثيقة": formatCategoryName(item.categoryNameAr, item.categoryNameEn, "ar", documentTypes),
          "تاريخ الانتهاء": item.expiryDate || "—",
          "الأيام المتبقية": item.daysRemaining !== null ? item.daysRemaining : "—",
          "حالة الامتثال": statusMeta.ar,
          "حالة الموظف": empStatusMeta.ar,
          "تصنيف المصدر": docTypeMeta.ar,
          "الرقم المرجعي": item.referenceMasked || "—",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 6 },  // #
        { wch: 32 }, // Employee Name
        { wch: 22 }, // Iqama No
        { wch: 28 }, // Document Type
        { wch: 16 }, // Expiry Date
        { wch: 16 }, // Days Remaining
        { wch: 18 }, // Due Status
        { wch: 16 }, // Employee Status
        { wch: 20 }, // Source Category
        { wch: 20 }, // Reference
      ];

      // Ensure Iqama / ID number column is treated strictly as text string
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:J1");
      const iqamaColIndex = 2; // Column C (0-indexed 2)
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: iqamaColIndex });
        const cell = worksheet[cellAddress];
        if (cell) {
          cell.t = "s"; // string type
          cell.z = "@"; // text format in Excel
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        locale === "en" ? "Compliance Expiries" : "تنبيهات الوثائق"
      );

      const fileName = `compliance-expiries-${checkDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.show(
        "success",
        locale === "en" ? "Excel Exported Successfully" : "تم تصدير ملف الإكسل بنجاح",
        locale === "en"
          ? `Exported ${exportItems.length} records.`
          : `تم تصدير ${exportItems.length} سجل بنجاح.`
      );
    } catch (err: any) {
      console.error("Export error:", err);
      toast.show(
        "error",
        locale === "en" ? "Export Failed" : "فشل التصدير",
        err?.message || (locale === "en" ? "An error occurred while exporting." : "حدث خطأ أثناء تصدير البيانات.")
      );
    } finally {
      setExporting(false);
    }
  };

  const summary: ExpiryComplianceSummary = useMemo(() => {
    const rawSummary = data?.summary ?? {
      valid: 0,
      upcoming: 0,
      dueToday: 0,
      expired: 0,
      missing: 0,
    };
    if (!data?.items) return rawSummary;

    // If a specific document type is selected, compute summary dynamically from filtered items
    if (sourceType && sourceType !== "all") {
      const s = { valid: 0, upcoming: 0, dueToday: 0, expired: 0, missing: 0 };
      for (const item of items) {
        const meta = getDueStatusMeta(item.dueStatus, item.daysRemaining);
        if (meta.en === "Valid") s.valid++;
        else if (meta.en === "Upcoming") s.upcoming++;
        else if (meta.en === "Due Today") s.dueToday++;
        else if (meta.en === "Expired") s.expired++;
        else if (meta.en === "Missing") s.missing++;
      }
      return s;
    }

    const ignoredByStatus = { valid: 0, upcoming: 0, dueToday: 0, expired: 0, missing: 0 };
    for (const item of data.items) {
      if (isGeneralDocument(item)) {
        const meta = getDueStatusMeta(item.dueStatus, item.daysRemaining);
        if (meta.en === "Valid") ignoredByStatus.valid++;
        else if (meta.en === "Upcoming") ignoredByStatus.upcoming++;
        else if (meta.en === "Due Today") ignoredByStatus.dueToday++;
        else if (meta.en === "Expired") ignoredByStatus.expired++;
        else if (meta.en === "Missing") ignoredByStatus.missing++;
      }
    }

    return {
      valid: Math.max(0, rawSummary.valid - ignoredByStatus.valid),
      upcoming: Math.max(0, rawSummary.upcoming - ignoredByStatus.upcoming),
      dueToday: Math.max(0, rawSummary.dueToday - ignoredByStatus.dueToday),
      expired: Math.max(0, rawSummary.expired - ignoredByStatus.expired),
      missing: Math.max(0, rawSummary.missing - ignoredByStatus.missing),
    };
  }, [data, items, sourceType]);

  const ignoredInCurrentPage = useMemo(() => {
    if (!data?.items) return 0;
    return data.items.filter(isGeneralDocument).length;
  }, [data]);

  const totalCount =
    sourceType !== "all"
      ? items.length
      : Math.max(0, (data?.totalCount ?? 0) - ignoredInCurrentPage);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const resetFilters = () => {
    setSearch("");
    setSourceType("all");
    setDueStatus("all");
    setEmployeeStatus("all");
    setOperatingCityId("all");
    setSponsorId("all");
    setCheckDate(getTodayRiyadh());
    setPage(1);
    try {
      sessionStorage.removeItem(HR_COMPLIANCE_FILTERS_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-[#1167c9]">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1167c9]">
              {locale === "en" ? "HR Management" : "إدارة الموارد البشرية"}
            </p>
            <h1 className="text-3xl font-black">
              {locale === "en"
                ? "Document Expiry Alerts"
                : "تنبيهات الوثائق"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {locale === "en"
                ? "Monitor residency permits, driver licenses, rider cards, health cards, and medical insurance."
                : "متابعة وتقييم صلاحيات الإقامات ورخص القيادة وبطاقة السائق والتأمين الطبي."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-bold shadow-sm">
            <Calendar size={16} className="text-[#1167c9]" />
            <span className="text-xs text-[var(--muted)]">
              {locale === "en" ? "Check Date:" : "تاريخ الفحص:"}
            </span>
            <input
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className="bg-transparent text-sm font-bold outline-none"
            />
          </label>

          <Button variant="secondary" onClick={() => void loadData()} className="inline-flex items-center gap-2">
            <RefreshCw size={16} />
            {t("common.refresh")}
          </Button>

          <Button
            variant="primary"
            onClick={handleExportExcel}
            loading={exporting}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
          >
            <FileSpreadsheet size={16} />
            {locale === "en" ? "Export Excel" : "تصدير إكسل"}
          </Button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <button
          type="button"
          onClick={() => {
            setDueStatus("Valid");
            setPage(1);
          }}
          className={`flex flex-col rounded-2xl border p-4 text-start transition-all ${dueStatus === "Valid"
              ? "border-emerald-500 bg-emerald-50/80 shadow-md ring-2 ring-emerald-400"
              : "border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">
              {locale === "en" ? "Valid" : "ساري"}
            </span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-900">{summary.valid}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {locale === "en" ? "> 30 days remaining" : "متبقي أكثر من 30 يوماً"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setDueStatus("Upcoming");
            setPage(1);
          }}
          className={`flex flex-col rounded-2xl border p-4 text-start transition-all ${dueStatus === "Upcoming"
              ? "border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400"
              : "border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">
              {locale === "en" ? "Upcoming" : "قريب الانتهاء"}
            </span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-900">{summary.upcoming}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {locale === "en" ? "1 to 30 days remaining" : "متبقي 1 إلى 30 يوماً"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setDueStatus("DueToday");
            setPage(1);
          }}
          className={`flex flex-col rounded-2xl border p-4 text-start transition-all ${dueStatus === "DueToday"
              ? "border-orange-500 bg-orange-50/80 shadow-md ring-2 ring-orange-400"
              : "border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-700">
              {locale === "en" ? "Due Today" : "ينتهي اليوم"}
            </span>
            <AlertTriangle size={18} className="text-orange-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-orange-900">{summary.dueToday}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {locale === "en" ? "Expires on check date" : "ينتهي بتاريخ الفحص المحدد"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setDueStatus("Expired");
            setPage(1);
          }}
          className={`flex flex-col rounded-2xl border p-4 text-start transition-all ${dueStatus === "Expired"
              ? "border-red-500 bg-red-50/80 shadow-md ring-2 ring-red-400"
              : "border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700">
              {locale === "en" ? "Expired" : "منتهي"}
            </span>
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-red-900">{summary.expired}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {locale === "en" ? "Passed expiry date" : "تجاوز تاريخ الانتهاء"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setDueStatus("Missing");
            setPage(1);
          }}
          className={`flex flex-col rounded-2xl border p-4 text-start transition-all ${dueStatus === "Missing"
              ? "border-slate-500 bg-slate-100 shadow-md ring-2 ring-slate-400"
              : "border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {locale === "en" ? "Missing" : "غير مضاف"}
            </span>
            <FileQuestion size={18} className="text-slate-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900">{summary.missing}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {locale === "en" ? "Missing required date" : "وثيقة بلا تاريخ انتهاء محدد"}
          </p>
        </button>
      </div>

      {/* Main Content Card */}
      <Card className="overflow-hidden">
        {/* Filters Bar */}
        <div className="flex flex-col gap-4 border-b border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="relative min-w-[280px] flex-1">
              <Search
                className={`pointer-events-none absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"}`}
                size={18}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  locale === "en"
                    ? "Search employee or document category..."
                    : "ابحث باسم الموظف أو نوع الوثيقة..."
                }
                className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
              />
            </label>

            <Button variant="secondary" onClick={resetFilters} className="inline-flex items-center gap-1.5 text-xs font-bold">
              <X size={15} />
              {locale === "en" ? "Reset Filters" : "إعادة ضبط الفلاتر"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Due Status Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {locale === "en" ? "Compliance Status" : "حالة الامتثال"}
              </label>
              <SearchableSelect
                value={dueStatus}
                onChange={(v) => {
                  setDueStatus(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: locale === "en" ? "All Statuses" : "جميع الحالات" },
                  { value: "Valid", label: locale === "en" ? "Valid (>30 days)" : "ساري (>30 يوماً)" },
                  { value: "Upcoming", label: locale === "en" ? "Upcoming (1-30 days)" : "قريب الانتهاء (1-30 يوماً)" },
                  { value: "DueToday", label: locale === "en" ? "Due Today" : "ينتهي اليوم" },
                  { value: "Expired", label: locale === "en" ? "Expired" : "منتهي" },
                  { value: "Missing", label: locale === "en" ? "Missing Date" : "غير مضاف" },
                ]}
                placeholder={locale === "en" ? "All Statuses" : "جميع الحالات"}
              />
            </div>

            {/* Document Type Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {locale === "en" ? "Document Type" : "نوع الوثيقة"}
              </label>
              <SearchableSelect
                value={sourceType}
                onChange={(v) => {
                  setSourceType(v);
                  setPage(1);
                }}
                options={documentTypeOptions}
                placeholder={locale === "en" ? "All Document Types" : "جميع أنواع الوثائق"}
              />
            </div>

            {/* Employee Status Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {locale === "en" ? "Employee Status" : "حالة الموظف"}
              </label>
              <SearchableSelect
                value={employeeStatus}
                onChange={(v) => {
                  setEmployeeStatus(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: locale === "en" ? "All Employee Statuses" : "جميع حالات الموظفين" },
                  { value: "Active", label: locale === "en" ? "Active" : "نشط" },
                  { value: "Terminated", label: locale === "en" ? "Terminated" : "منتهي الخدمة" },
                  { value: "Suspended", label: locale === "en" ? "Suspended" : "موقوف" },
                  { value: "OnLeave", label: locale === "en" ? "On Leave" : "في إجازة" },
                  { value: "Probationary", label: locale === "en" ? "Probationary" : "تحت التجربة" },
                  { value: "Onboarding", label: locale === "en" ? "Onboarding" : "قيد التهيئة" },
                  { value: "Inactive", label: locale === "en" ? "Inactive" : "غير نشط" },
                  { value: "Fleeing", label: locale === "en" ? "Fleeing" : "هروب / انقطاع" },
                  { value: "Archived", label: locale === "en" ? "Archived" : "مؤرشف" },
                  { value: "Draft", label: locale === "en" ? "Draft" : "مسودة" },
                ]}
                placeholder={locale === "en" ? "All Employee Statuses" : "جميع حالات الموظفين"}
              />
            </div>

            {/* Operating City Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {locale === "en" ? "Operating City" : "مدينة التشغيل"}
              </label>
              <SearchableSelect
                value={operatingCityId}
                onChange={(v) => {
                  setOperatingCityId(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: locale === "en" ? "All Cities" : "جميع المدن" },
                  ...cities.map((c) => ({
                    value: c.id,
                    label: String(locale === "en" ? c.nameEn || c.nameAr : c.nameAr),
                  })),
                ]}
                placeholder={locale === "en" ? "All Cities" : "جميع المدن"}
              />
            </div>

            {/* Sponsor Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {locale === "en" ? "Sponsor" : "الكفيل"}
              </label>
              <SearchableSelect
                value={sponsorId}
                onChange={(v) => {
                  setSponsorId(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: locale === "en" ? "All Sponsors" : "جميع الكفلاء" },
                  ...sponsors.map((s) => ({
                    value: s.id,
                    label: locale === "en" ? s.registryNameEn || s.registryNameAr : s.registryNameAr,
                  })),
                ]}
                placeholder={locale === "en" ? "All Sponsors" : "جميع الكفلاء"}
              />
            </div>
          </div>
        </div>

        {/* Error or Loading */}
        {error ? (
          <p role="alert" className="p-6 text-red-700 font-bold">
            {error}
          </p>
        ) : loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] table-fixed text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3.5 text-start w-[240px]">
                    {locale === "en" ? "Employee / Rider" : "الموظف / المندوب"}
                  </th>
                  <th className="px-4 py-3.5 text-start w-[160px]">
                    {locale === "en" ? "Iqama / ID No" : "رقم الإقامة / الهوية"}
                  </th>
                  <th className="px-4 py-3.5 text-start w-[210px]">
                    {locale === "en" ? "Document / Category" : "نوع الوثيقة"}
                  </th>
                  <th className="px-4 py-3.5 text-start w-[130px]">
                    {locale === "en" ? "Expiry Date" : "تاريخ الانتهاء"}
                  </th>
                  <th className="px-4 py-3.5 text-start w-[140px]">
                    {locale === "en" ? "Days Remaining" : "الأيام المتبقية"}
                  </th>
                  <th className="px-4 py-3.5 text-start w-[130px]">
                    {locale === "en" ? "Due Status" : "حالة الامتثال"}
                  </th>
                  <th className="px-4 py-3.5 text-start w-[80px]">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((item) => {
                  const statusMeta = getDueStatusMeta(item.dueStatus, item.daysRemaining);
                  const StatusIcon = statusMeta.icon;
                  const empStatusMeta = getEmployeeStatusMeta(item.employeeStatus);
                  const iqamaNo = getIqamaNumber(item);

                  return (
                    <tr key={`${item.sourceId}-${item.categoryCode}`} className="hover:bg-slate-50/60">
                      {/* Employee Name */}
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/employees/${item.employeeId}`}
                          className="group flex items-center gap-2.5 font-bold hover:text-[#1167c9]"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[var(--muted)] group-hover:bg-blue-50 group-hover:text-[#1167c9]">
                            <User size={15} />
                          </div>
                          <div>
                            <span className="block truncate">{item.employeeNameAr}</span>
                            <span
                              className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${empStatusMeta.badge}`}
                            >
                              {locale === "en" ? empStatusMeta.en : empStatusMeta.ar}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Iqama / ID No */}
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {iqamaNo ? (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 border border-slate-200 dark:border-slate-700">
                            {iqamaNo}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)] font-normal">—</span>
                        )}
                      </td>

                      {/* Document Type / Category */}
                      <td className="px-4 py-3.5 font-bold text-[var(--foreground)]">
                        {formatCategoryName(item.categoryNameAr, item.categoryNameEn, locale, documentTypes)}
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3.5 font-mono font-bold">
                        {item.expiryDate ? item.expiryDate : <span className="text-[var(--muted)] font-normal">—</span>}
                      </td>

                      {/* Days Remaining */}
                      <td className="px-4 py-3.5">
                        {item.daysRemaining !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${item.daysRemaining < 0
                                ? "text-red-700"
                                : item.daysRemaining === 0
                                  ? "text-orange-700"
                                  : item.daysRemaining <= 30
                                    ? "text-amber-700"
                                    : "text-emerald-700"
                              }`}
                          >
                            {item.daysRemaining > 0
                              ? `${item.daysRemaining} ${locale === "en" ? "days" : "يوم"}`
                              : item.daysRemaining === 0
                                ? locale === "en"
                                  ? "Due Today (0)"
                                  : "ينتهي اليوم (0)"
                                : `${item.daysRemaining} ${locale === "en" ? "days (Expired)" : "يوم (منتهي)"}`}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            {locale === "en" ? "Missing date" : "غير محدد"}
                          </span>
                        )}
                      </td>

                      {/* Due Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.color}`}
                        >
                          <StatusIcon size={14} />
                          {locale === "en" ? statusMeta.en : statusMeta.ar}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/employees/${item.employeeId}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-slate-100 hover:text-[#1167c9]"
                          title={locale === "en" ? "View Employee Details" : "عرض ملف الموظف"}
                        >
                          <Eye size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {!items.length && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-sm text-[var(--muted)]">
                      {locale === "en"
                        ? "No compliance expiry records matching criteria."
                        : "لا توجد سجلات تنبيهات وثائق مطابقة للشروط."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        <div className="flex flex-col gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[var(--muted)]">
            {locale === "en"
              ? `Showing page ${page} of ${totalPages} (${totalCount} total records)`
              : `عرض الصفحة ${page} من أصل ${totalPages} (إجمالي ${totalCount} سجل)`}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
              <span>{locale === "en" ? "Per page:" : "لكل صفحة:"}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-9 px-3 text-xs"
              >
                {t("common.previous")}
              </Button>

              <span className="text-xs font-bold">
                {page} / {totalPages}
              </span>

              <Button
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 px-3 text-xs"
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
