"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getVehicleComplianceDue,
  getVehicles,
  downloadVehicleFile,
  uploadVehicleFile,
} from "@/lib/fleet/api";
import { authPreviewBlob } from "@/lib/auth/api";
import {
  VehicleComplianceDueStatus,
  VehicleRegistrationType,
  type VehicleComplianceDueResponse,
  type VehicleSummaryResponse,
} from "@/lib/fleet/types";
import {
  formatVehicleRegistrationType,
  formatVehicleComplianceDueStatus,
  getVehicleComplianceFileLabel,
  getVehicleComplianceDateLabel,
  getVehicleComplianceCombinedLabel,
  formatDate,
} from "@/lib/fleet/formatters";
import { TableHeaderColumnFilter, type FilterOption } from "@/app/admin/fleet/vehicles/components/TableHeaderFilter";
import { AddComplianceModal, type ComplianceTabType } from "@/app/admin/fleet/vehicles/components/AddComplianceModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Filter,
  Search,
  X,
  FileText,
  UploadCloud,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Clock,
  Info,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
} from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import Link from "next/link";


function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getComplianceFileKind(type: string): { kindNumber: 1 | 2; kindName: "Istimara" | "OperationCard" } | null {
  if (type === "Registration" || type === "Istimara") {
    return { kindNumber: 1, kindName: "Istimara" };
  }
  if (type === "OperationCard") {
    return { kindNumber: 2, kindName: "OperationCard" };
  }
  return null;
}

function getComplianceTabType(type: string): ComplianceTabType {
  switch (type) {
    case "Registration":
    case "Istimara":
      return "Registration";
    case "InsurancePolicy":
    case "Insurance":
      return "InsurancePolicy";
    case "Inspection":
    case "Fahs":
      return "Inspection";
    case "OperationCard":
      return "OperationCard";
    default:
      return "InsurancePolicy";
  }
}

export default function CompliancePage() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleComplianceDueResponse[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, VehicleSummaryResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkDate, setCheckDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [dateStatusFilter, setDateStatusFilter] = useState<string>("");
  const [combinedStatusFilter, setCombinedStatusFilter] = useState<string>("");
  const [uploadingRowKey, setUploadingRowKey] = useState<string | null>(null);

  // Compliance Modal state
  const [complianceModal, setComplianceModal] = useState<{
    isOpen: boolean;
    vehicleId: string;
    initialType: ComplianceTabType;
    registrationType?: number | null;
  }>({
    isOpen: false,
    vehicleId: "",
    initialType: "InsurancePolicy",
  });

  // Live preview modal state
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    title: string;
    loading: boolean;
    url: string | null;
    contentType: string | null;
    error: string | null;
  }>({
    isOpen: false,
    title: "",
    loading: false,
    url: null,
    contentType: null,
    error: null,
  });

  const COMPLIANCE_FILTERS_SESSION_KEY = "admin_fleet_compliance_filters_session";
  const [isRestored, setIsRestored] = useState(false);

  // Restore filters on mount for the current session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(COMPLIANCE_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.search === "string" && parsed.search) setSearch(parsed.search);
        if (typeof parsed.modelFilter === "string" && parsed.modelFilter) setModelFilter(parsed.modelFilter);
        if (typeof parsed.registrationFilter === "string" && parsed.registrationFilter) setRegistrationFilter(parsed.registrationFilter);
        if (typeof parsed.docTypeFilter === "string" && parsed.docTypeFilter) setDocTypeFilter(parsed.docTypeFilter);
        if (typeof parsed.dateStatusFilter === "string" && parsed.dateStatusFilter) setDateStatusFilter(parsed.dateStatusFilter);
        if (typeof parsed.combinedStatusFilter === "string" && parsed.combinedStatusFilter) setCombinedStatusFilter(parsed.combinedStatusFilter);
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
      if (search || modelFilter || registrationFilter || docTypeFilter || dateStatusFilter || combinedStatusFilter) {
        sessionStorage.setItem(
          COMPLIANCE_FILTERS_SESSION_KEY,
          JSON.stringify({
            search,
            modelFilter,
            registrationFilter,
            docTypeFilter,
            dateStatusFilter,
            combinedStatusFilter,
          })
        );
      } else {
        sessionStorage.removeItem(COMPLIANCE_FILTERS_SESSION_KEY);
      }
    } catch {
      // ignore sessionStorage errors
    }
  }, [isRestored, search, modelFilter, registrationFilter, docTypeFilter, dateStatusFilter, combinedStatusFilter]);

  const clearAllFilters = () => {
    setSearch("");
    setModelFilter("");
    setRegistrationFilter("");
    setDocTypeFilter("");
    setDateStatusFilter("");
    setCombinedStatusFilter("");
    try {
      sessionStorage.removeItem(COMPLIANCE_FILTERS_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dueData, firstVehiclesRes] = await Promise.all([
        getVehicleComplianceDue(checkDate || undefined, { page: 1, pageSize: 2000 }),
        getVehicles({ page: 1, pageSize: 2000 }).catch((err) => {
          console.warn("Failed to load vehicles list:", err);
          return null;
        }),
      ]);

      if (firstVehiclesRes?.items) {
        let allVehicles: VehicleSummaryResponse[] = [...firstVehiclesRes.items];
        const totalCount = firstVehiclesRes.totalCount ?? allVehicles.length;
        const pageSize = firstVehiclesRes.pageSize || 200;

        if (totalCount > allVehicles.length) {
          const totalPages = Math.ceil(totalCount / pageSize);
          const pagePromises: Promise<any>[] = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(
              getVehicles({ page: p, pageSize }).catch((err) => {
                console.warn(`Failed to load vehicles page ${p}:`, err);
                return null;
              })
            );
          }
          const remaining = await Promise.all(pagePromises);
          for (const r of remaining) {
            if (r?.items) {
              allVehicles = allVehicles.concat(r.items);
            }
          }
        }

        const vMap: Record<string, VehicleSummaryResponse> = {};
        allVehicles.forEach((v) => {
          if (v.id) vMap[v.id] = v;
        });
        setVehiclesMap(vMap);
      }

      console.log("Compliance Due API Response:", dueData);

      let allDueItems: VehicleComplianceDueResponse[] = [];
      if (Array.isArray(dueData)) {
        allDueItems = dueData;
      } else if (dueData && Array.isArray((dueData as any).items)) {
        allDueItems = [...(dueData as any).items];
        const totalCount = (dueData as any).totalCount ?? allDueItems.length;
        const pageSize = (dueData as any).pageSize || 200;

        if (totalCount > allDueItems.length) {
          const totalPages = Math.ceil(totalCount / pageSize);
          const pagePromises: Promise<any>[] = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(
              getVehicleComplianceDue(checkDate || undefined, { page: p, pageSize }).catch((err) => {
                console.warn(`Failed to load compliance due page ${p}:`, err);
                return null;
              })
            );
          }
          const remaining = await Promise.all(pagePromises);
          for (const r of remaining) {
            const items = Array.isArray(r) ? r : (r as any)?.items;
            if (items) {
              allDueItems = allDueItems.concat(items);
            }
          }
        }
      }

      setData(allDueItems);
    } catch (e: any) {
      console.error("Failed to load compliance data:", e);
      setError(e?.message || "تعذر جلب بيانات متابعة تجديد التراخيص.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [checkDate]);

  const displayItems = useMemo(() => {
    const list: VehicleComplianceDueResponse[] = [];
    const seenPermitVehicles = new Set<string>();

    for (const item of data) {
      list.push(item);
      if (
        item.type === "Permit" ||
        item.type === "Permission" ||
        item.type === "VehiclePermit" ||
        item.type === "RiderPermit"
      ) {
        seenPermitVehicles.add(item.vehicleId);
      }
    }

    for (const item of data) {
      if (
        (item.permitEndDate || (item.permitStatus !== undefined && item.permitStatus !== null)) &&
        !seenPermitVehicles.has(item.vehicleId)
      ) {
        seenPermitVehicles.add(item.vehicleId);
        list.push({
          vehicleId: item.vehicleId,
          assetNumber: item.assetNumber,
          serialNumber: item.serialNumber,
          plateNumber: item.plateNumber,
          plateNumberAr: item.plateNumberAr,
          plateNumberEn: item.plateNumberEn,
          type: "Permit",
          recordId: null,
          effectiveFrom: null,
          expiryDate: item.permitEndDate || null,
          dateStatus: item.permitStatus ?? VehicleComplianceDueStatus.Missing,
          status: item.permitStatus ?? VehicleComplianceDueStatus.Missing,
          daysRemaining: null,
          hasUploadedFile: false,
          uploadedFile: null,
          permitEndDate: item.permitEndDate,
          permitStatus: item.permitStatus,
        });
      }
    }

    return list;
  }, [data]);

  const modelOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number; vehicleIds: Set<string> }>();

    for (const item of displayItems) {
      const v = vehiclesMap[item.vehicleId];
      if (!v) continue;
      const mfg = (v.manufacturer || "").trim();
      const mdl = (v.model || "").trim();
      const label = [mfg, mdl].filter(Boolean).join(" ").trim();
      if (!label) continue;

      const existing = counts.get(label);
      if (existing) {
        existing.count += 1;
        existing.vehicleIds.add(item.vehicleId);
      } else {
        counts.set(label, { label, count: 1, vehicleIds: new Set([item.vehicleId]) });
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [key, item] of sorted) {
      opts.push({
        value: key,
        label: item.label,
        sublabel: `${item.vehicleIds.size} مركبة (${item.count} تنبيه)`,
        count: item.count,
      });
    }

    if (modelFilter && !opts.some((o) => o.value === modelFilter)) {
      opts.push({
        value: modelFilter,
        label: modelFilter,
      });
    }

    return opts;
  }, [displayItems, vehiclesMap, modelFilter]);

  const registrationTypeOptions = useMemo(() => {
    const counts = new Map<string, { count: number; vehicleIds: Set<string> }>();

    for (const item of displayItems) {
      const v = vehiclesMap[item.vehicleId];
      if (!v || v.registrationType === undefined || v.registrationType === null) continue;
      const key = String(v.registrationType);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
        existing.vehicleIds.add(item.vehicleId);
      } else {
        counts.set(key, { count: 1, vehicleIds: new Set([item.vehicleId]) });
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];
    const sortedTypes = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [typeKey, d] of sortedTypes) {
      const num = Number(typeKey);
      const label = formatVehicleRegistrationType(num as VehicleRegistrationType);
      opts.push({
        value: typeKey,
        label,
        sublabel: `${d.vehicleIds.size} مركبة (${d.count} تنبيه)`,
      });
    }

    if (registrationFilter && !opts.some((o) => o.value === registrationFilter)) {
      const num = Number(registrationFilter);
      const label = formatVehicleRegistrationType(num as VehicleRegistrationType);
      opts.push({
        value: registrationFilter,
        label,
      });
    }

    return opts;
  }, [displayItems, vehiclesMap, registrationFilter]);

  const getDocTypeInfo = (type: string): { key: string; label: string } => {
    switch (type) {
      case "Registration":
      case "Istimara":
        return { key: "Istimara", label: "استمارة سير" };
      case "InsurancePolicy":
      case "Insurance":
        return { key: "Insurance", label: "بوليصة تأمين" };
      case "Inspection":
      case "Fahs":
        return { key: "Inspection", label: "فحص دوري" };
      case "OperationCard":
        return { key: "OperationCard", label: "كرت تشغيل" };
      case "Permit":
      case "Permission":
      case "VehiclePermit":
      case "RiderPermit":
        return { key: "Permit", label: "تصريح / تفويض" };
      default:
        return { key: type, label: type };
    }
  };

  const docTypeOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();

    for (const item of displayItems) {
      const { key, label } = getDocTypeInfo(item.type);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label, count: 1 });
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [key, d] of sorted) {
      opts.push({
        value: key,
        label: d.label,
        sublabel: `${d.count} تنبيه`,
        count: d.count,
      });
    }

    if (docTypeFilter && !opts.some((o) => o.value === docTypeFilter)) {
      const { label } = getDocTypeInfo(docTypeFilter);
      opts.push({
        value: docTypeFilter,
        label,
      });
    }

    return opts;
  }, [displayItems, docTypeFilter]);

  // Base filtered items (by text search, model, registration type, document type)
  const baseFiltered = useMemo(() => {
    return displayItems.filter((item) => {
      const v = vehiclesMap[item.vehicleId];

      if (modelFilter) {
        const mfg = (v?.manufacturer || "").trim();
        const mdl = (v?.model || "").trim();
        const label = [mfg, mdl].filter(Boolean).join(" ").trim();
        if (label !== modelFilter) return false;
      }

      if (registrationFilter) {
        if (v?.registrationType === undefined || v?.registrationType === null) return false;
        if (String(v.registrationType) !== registrationFilter) return false;
      }

      if (docTypeFilter) {
        const { key } = getDocTypeInfo(item.type);
        if (key !== docTypeFilter) return false;
      }

      if (!search) return true;
      const searchLower = search.trim().toLowerCase();
      const plateAr = item.plateNumberAr || item.plateNumber || v?.plateNumberAr || "";
      const plateEn = item.plateNumberEn || v?.plateNumberEn || "";
      const plateCombined = v?.plateLettersAr && v?.plateDigits ? `${v.plateLettersAr} ${v.plateDigits}` : "";
      const serial = item.serialNumber || v?.serialNumber || v?.chassisNumber || "";
      const asset = item.assetNumber || "";
      const mfg = v?.manufacturer || "";
      const mdl = v?.model || "";

      return (
        plateAr.toLowerCase().includes(searchLower) ||
        plateEn.toLowerCase().includes(searchLower) ||
        plateCombined.toLowerCase().includes(searchLower) ||
        serial.toLowerCase().includes(searchLower) ||
        asset.toLowerCase().includes(searchLower) ||
        mfg.toLowerCase().includes(searchLower) ||
        mdl.toLowerCase().includes(searchLower)
      );
    });
  }, [displayItems, search, vehiclesMap, modelFilter, registrationFilter, docTypeFilter]);

  // Status Counts based on baseFiltered
  const noDatesCount = useMemo(() => {
    return baseFiltered.filter((i) => {
      const hasNoDates = !i.effectiveFrom && !i.expiryDate && !i.permitEndDate;
      return hasNoDates || i.status === VehicleComplianceDueStatus.UploadedWithoutDates;
    }).length;
  }, [baseFiltered]);

  const uploadedWithoutDatesCount = useMemo(() => {
    return baseFiltered.filter(
      (i) =>
        i.status === VehicleComplianceDueStatus.UploadedWithoutDates ||
        (i.hasUploadedFile && !i.effectiveFrom && !i.expiryDate)
    ).length;
  }, [baseFiltered]);

  const missingNoDatesCount = useMemo(() => {
    return baseFiltered.filter(
      (i) =>
        !i.hasUploadedFile &&
        !i.effectiveFrom &&
        !i.expiryDate &&
        !i.permitEndDate &&
        i.status !== VehicleComplianceDueStatus.UploadedWithoutDates
    ).length;
  }, [baseFiltered]);

  const expiredCount = useMemo(() => {
    return baseFiltered.filter(
      (i) => (i.dateStatus ?? i.status) === VehicleComplianceDueStatus.Expired
    ).length;
  }, [baseFiltered]);

  const dueTodayCount = useMemo(() => {
    return baseFiltered.filter(
      (i) => (i.dateStatus ?? i.status) === VehicleComplianceDueStatus.DueToday
    ).length;
  }, [baseFiltered]);

  const upcomingCount = useMemo(() => {
    return baseFiltered.filter(
      (i) => (i.dateStatus ?? i.status) === VehicleComplianceDueStatus.Upcoming
    ).length;
  }, [baseFiltered]);

  // Options for Date Status filter in table header
  const dateStatusOptions = useMemo(() => {
    const opts: FilterOption[] = [
      { value: "", label: "الكل" },
      {
        value: "no_dates",
        label: "بدون تاريخ (الكل)",
        sublabel: `${noDatesCount} سجل`,
        count: noDatesCount,
      },
      {
        value: "uploaded_no_dates",
        label: "مرفوع بدون تواريخ",
        sublabel: `${uploadedWithoutDatesCount} سجل`,
        count: uploadedWithoutDatesCount,
      },
      {
        value: "missing_no_dates",
        label: "غير مرفوع وبدون تاريخ",
        sublabel: `${missingNoDatesCount} سجل`,
        count: missingNoDatesCount,
      },
      {
        value: "due_today",
        label: "ينتهي اليوم",
        sublabel: `${dueTodayCount} سجل`,
        count: dueTodayCount,
      },
      {
        value: "upcoming",
        label: "قريب الانتهاء",
        sublabel: `${upcomingCount} سجل`,
        count: upcomingCount,
      },
      {
        value: "expired",
        label: "منتهي",
        sublabel: `${expiredCount} سجل`,
        count: expiredCount,
      },
    ];
    return opts;
  }, [noDatesCount, uploadedWithoutDatesCount, missingNoDatesCount, dueTodayCount, upcomingCount, expiredCount]);

  // Options for Combined Status filter in table header
  const combinedStatusOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of baseFiltered) {
      const st = String(item.status ?? item.permitStatus);
      counts.set(st, (counts.get(st) || 0) + 1);
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];

    const getStatusLabel = (code: string) => {
      const num = Number(code);
      switch (num) {
        case VehicleComplianceDueStatus.UploadedWithoutDates:
          return "مرفوع — التواريخ غير مسجلة";
        case VehicleComplianceDueStatus.Expired:
          return "منتهي";
        case VehicleComplianceDueStatus.DueToday:
          return "ينتهي اليوم";
        case VehicleComplianceDueStatus.Upcoming:
          return "قريب الانتهاء";
        case VehicleComplianceDueStatus.Missing:
          return "مفقود (غير مسجل)";
        case VehicleComplianceDueStatus.Valid:
          return "ساري";
        default:
          return code;
      }
    };

    for (const [code, count] of counts.entries()) {
      opts.push({
        value: code,
        label: getStatusLabel(code),
        sublabel: `${count} سجل`,
        count,
      });
    }

    return opts;
  }, [baseFiltered]);

  // Final filtered items (including date and combined status filters)
  const filtered = useMemo(() => {
    return baseFiltered.filter((item) => {
      // Date Status Filter
      if (dateStatusFilter) {
        const hasNoDates = !item.effectiveFrom && !item.expiryDate && !item.permitEndDate;
        const isUploadedWithoutDates = item.status === VehicleComplianceDueStatus.UploadedWithoutDates;
        const dStatus = item.dateStatus ?? item.status;

        if (dateStatusFilter === "no_dates") {
          if (!hasNoDates && !isUploadedWithoutDates) return false;
        } else if (dateStatusFilter === "uploaded_no_dates") {
          if (!isUploadedWithoutDates && !(item.hasUploadedFile && hasNoDates)) return false;
        } else if (dateStatusFilter === "missing_no_dates") {
          if (item.hasUploadedFile || isUploadedWithoutDates || !hasNoDates) return false;
        } else if (dateStatusFilter === "due_today") {
          if (dStatus !== VehicleComplianceDueStatus.DueToday) return false;
        } else if (dateStatusFilter === "upcoming") {
          if (dStatus !== VehicleComplianceDueStatus.Upcoming) return false;
        } else if (dateStatusFilter === "expired") {
          if (dStatus !== VehicleComplianceDueStatus.Expired) return false;
        }
      }

      // Combined Status Filter
      if (combinedStatusFilter) {
        const st = String(item.status ?? item.permitStatus);
        if (st !== combinedStatusFilter) return false;
      }

      return true;
    });
  }, [baseFiltered, dateStatusFilter, combinedStatusFilter]);

  const handleDownloadFile = async (vehicleId: string, attachmentId: string, versionId?: string) => {
    try {
      await downloadVehicleFile(vehicleId, attachmentId, versionId);
    } catch (err: any) {
      console.error("Download failed:", err);
      toast.error("فشل التنزيل", err?.message || "تعذر تنزيل الملف.");
    }
  };

  const handleOpenPreview = async (item: VehicleComplianceDueResponse) => {
    if (!item.uploadedFile) return;
    const title = `معاينة: ${item.uploadedFile.originalFileName || getDocTypeInfo(item.type).label}`;
    setPreviewState({
      isOpen: true,
      title,
      loading: true,
      url: null,
      contentType: null,
      error: null,
    });

    try {
      const path = `/api/vehicles/${item.vehicleId}/files/${item.uploadedFile.attachmentId}/download?versionId=${item.uploadedFile.versionId}`;
      const res = await authPreviewBlob(path);
      setPreviewState({
        isOpen: true,
        title,
        loading: false,
        url: res.url,
        contentType: res.contentType,
        error: null,
      });
    } catch (err: any) {
      console.error("Preview error:", err);
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "تعذر تحميل معاينة المستند.",
      }));
    }
  };

  const handleClosePreview = () => {
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }
    setPreviewState({
      isOpen: false,
      title: "",
      loading: false,
      url: null,
      contentType: null,
      error: null,
    });
  };

  const handleDirectUpload = async (item: VehicleComplianceDueResponse, file: File) => {
    const fileKind = getComplianceFileKind(item.type);
    if (!fileKind) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("الملف كبير جداً", "الحجم الأقصى المسموح به للملف هو 10 ميجابايت.");
      return;
    }

    const rowKey = `${item.vehicleId}-${item.type}`;
    setUploadingRowKey(rowKey);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await uploadVehicleFile(item.vehicleId, fileKind.kindName, formData);
      toast.success("تم بنجاح", "تم رفع وتحديث ملف الوثيقة بنجاح.");
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error("فشل الرفع", err?.message || "حدث خطأ أثناء رفع الملف.");
    } finally {
      setUploadingRowKey(null);
    }
  };

  if (!can("fleet.compliance.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">صلاحية غير كافية</h2>
      </div>
    );
  }

  // 1. Document / File Indicator Renderer
  const renderDocumentIndicator = (item: VehicleComplianceDueResponse) => {
    const fileKind = getComplianceFileKind(item.type);
    const rowKey = `${item.vehicleId}-${item.type}`;
    const isUploading = uploadingRowKey === rowKey;

    if (!fileKind) {
      return (
        <span className="text-xs text-[var(--muted)]" title="لا يوجد ملف للمركبة لهذا النوع من الوثائق">
          —
        </span>
      );
    }

    if (item.hasUploadedFile) {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 text-[11px] font-semibold">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>تم الرفع</span>
            </Badge>
            {item.uploadedFile && (
              <span className="text-[11px] font-mono text-slate-400">
                {formatFileSize(item.uploadedFile.fileSizeBytes)}
              </span>
            )}
          </div>

          {item.uploadedFile && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px] inline-block"
                title={item.uploadedFile.originalFileName}
              >
                {item.uploadedFile.originalFileName}
              </span>
              <div className="flex items-center gap-1">
                {can("fleet.files.download") && (
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(item)}
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    title="معاينة مباشرة"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
                {can("fleet.files.download") && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadFile(
                        item.vehicleId,
                        item.uploadedFile!.attachmentId,
                        item.uploadedFile!.versionId
                      )
                    }
                    className="p-1 rounded text-slate-500 hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="تنزيل الملف"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                {can("fleet.files.upload") && (
                  <label
                    className={`p-1 rounded text-slate-500 hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      isUploading ? "opacity-50 pointer-events-none" : ""
                    }`}
                    title="استبدال الملف"
                  >
                    <UploadCloud className={`h-3.5 w-3.5 ${isUploading ? "animate-pulse text-[#1167c9]" : ""}`} />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleDirectUpload(item, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 flex items-center gap-1 text-[11px]">
          <X className="h-3 w-3 text-slate-400" />
          <span>غير مرفوع</span>
        </Badge>
        {can("fleet.files.upload") && (
          <label
            className={`cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-[#1167c9] hover:underline ${
              isUploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>{isUploading ? "جارٍ الرفع..." : "رفع"}</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleDirectUpload(item, f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    );
  };

  // 2. Date Indicator Renderer
  const renderDateIndicator = (item: VehicleComplianceDueResponse) => {
    const hasNoDates = !item.effectiveFrom && !item.expiryDate && !item.permitEndDate;

    if (hasNoDates) {
      return (
        <div className="space-y-1">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            التواريخ غير مسجلة
          </span>
          <div>
            <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] px-1.5 py-0.5">
              التواريخ مفقودة
            </Badge>
          </div>
        </div>
      );
    }

    const effectiveDate = item.effectiveFrom;
    const expiryDate = item.expiryDate || item.permitEndDate;
    const dStatus = item.dateStatus ?? item.status;

    return (
      <div className="space-y-1">
        <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200" dir="ltr">
          {formatDate(expiryDate)}
        </div>
        {effectiveDate && (
          <div className="text-[11px] text-slate-400 font-mono">
            من: <span dir="ltr">{formatDate(effectiveDate)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          {dStatus === VehicleComplianceDueStatus.Valid && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0.5">
              ساري
            </Badge>
          )}
          {dStatus === VehicleComplianceDueStatus.Upcoming && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0.5">
              قريب الانتهاء
            </Badge>
          )}
          {dStatus === VehicleComplianceDueStatus.DueToday && (
            <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0.5">
              ينتهي اليوم
            </Badge>
          )}
          {dStatus === VehicleComplianceDueStatus.Expired && (
            <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0.5">
              منتهي
            </Badge>
          )}
          {dStatus === VehicleComplianceDueStatus.Missing && (
            <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] px-1.5 py-0.5">
              التواريخ مفقودة
            </Badge>
          )}
          {item.daysRemaining !== null && item.daysRemaining !== undefined && (
            <span
              className={`text-[11px] font-semibold ${
                item.daysRemaining > 0
                  ? "text-blue-600 dark:text-blue-400"
                  : item.daysRemaining === 0
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {item.daysRemaining > 0
                ? `متبقي ${item.daysRemaining} يوم`
                : item.daysRemaining === 0
                ? "اليوم"
                : `متأخر ${Math.abs(item.daysRemaining)} يوم`}
            </span>
          )}
        </div>
      </div>
    );
  };

  // 3. Combined Compliance Badge Renderer
  const renderCombinedBadge = (item: VehicleComplianceDueResponse) => {
    const st = item.status ?? item.permitStatus;

    if (st === VehicleComplianceDueStatus.UploadedWithoutDates) {
      return (
        <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800 flex items-center gap-1 font-semibold text-xs whitespace-nowrap">
          <Info className="h-3.5 w-3.5 text-sky-600" />
          <span>مرفوع — التواريخ غير مسجلة</span>
        </Badge>
      );
    }

    switch (st) {
      case VehicleComplianceDueStatus.Valid:
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">ساري</Badge>;
      case VehicleComplianceDueStatus.Upcoming:
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">قريب الانتهاء</Badge>;
      case VehicleComplianceDueStatus.DueToday:
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap">ينتهي اليوم</Badge>;
      case VehicleComplianceDueStatus.Expired:
        return <Badge className="bg-red-50 text-red-700 border-red-200 whitespace-nowrap">منتهي</Badge>;
      case VehicleComplianceDueStatus.Missing:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300 whitespace-nowrap">مفقود (غير مسجل)</Badge>;
      default:
        return <Badge className="whitespace-nowrap">{st}</Badge>;
    }
  };

  const isAnyFilterActive = Boolean(
    search || modelFilter || registrationFilter || docTypeFilter || dateStatusFilter || combinedStatusFilter
  );

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      await exportToExcel({
        filename: `vehicle-compliance-${checkDate}`,
        sheetName: "ملاحظات التراخيص",
        data: filtered,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: "اللوحة (عربي)", accessor: (c) => c.plateNumberAr || "—", width: 16, isText: true },
          { header: "اللوحة (إنجليزي)", accessor: (c) => c.plateNumberEn || "—", width: 16, isText: true },
          { header: "رقم الأصل", accessor: (c) => c.assetNumber || "—", width: 16, isText: true },
          { header: "الرقم التسلسلي", accessor: (c) => c.serialNumber || "—", width: 16, isText: true },
          { header: "نوع الترخيص / الوثيقة", accessor: (c) => getDocTypeInfo(c.type).label, width: 20 },
          { header: "حالة الملف", accessor: (c) => c.hasUploadedFile ? "مرفوع" : "غير مرفوع", width: 14 },
          { header: "تاريخ البداية", accessor: (c) => c.effectiveFrom || "—", width: 16 },
          { header: "تاريخ الانتهاء", accessor: (c) => c.expiryDate || c.permitEndDate || "—", width: 16 },
          { header: "الأيام المتبقية", accessor: (c) => c.daysRemaining != null ? c.daysRemaining : "—", width: 14 },
          {
            header: "حالة الترخيص",
            accessor: (c) => {
              const st = Number(c.status ?? c.permitStatus);
              switch (st) {
                case VehicleComplianceDueStatus.Valid: return "ساري";
                case VehicleComplianceDueStatus.Upcoming: return "قريب الانتهاء";
                case VehicleComplianceDueStatus.DueToday: return "ينتهي اليوم";
                case VehicleComplianceDueStatus.Expired: return "منتهي";
                case VehicleComplianceDueStatus.UploadedWithoutDates: return "مرفوع — التواريخ غير مسجلة";
                case VehicleComplianceDueStatus.Missing: return "مفقود (غير مسجل)";
                default: return String(c.status ?? c.permitStatus ?? "—");
              }
            },
            width: 22,
          },
        ],
      });
      toast.success("تم التصدير", "تم تصدير ملاحظات تراخيص المركبات بنجاح بصيغة إكسل.");
    } catch (err) {
      console.error("Export compliance error:", err);
      toast.error("فشل التصدير", "حدث خطأ أثناء تصدير ملف الإكسل.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            ملاحظات التراخيص
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            متابعة حالة المستندات المرفوعة وتواريخ تجديد التراخيص للمركبات بشكل منفصل
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={handleExportExcel}
          loading={exporting}
          disabled={exporting || loading || filtered.length === 0}
          className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold self-start sm:self-auto"
        >
          <FileSpreadsheet size={16} />
          تصدير إكسل
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Filter className="h-4 w-4" /> فحص الرصيد لتاريخ:
            </div>
            <div>
              <DateInput value={checkDate} onChange={setCheckDate} className="h-10 text-xs w-36" />
            </div>
          </div>
          <div className="flex flex-1 min-w-[280px] gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم اللوحة أو الموديل أو الصانع أو الرقم التسلسلي..."
                className="pr-10"
              />
            </div>
            <Button variant="secondary" onClick={loadData} disabled={loading} className="px-3">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
            </Button>
          </div>
        </div>

        {/* Quick Filter Pills (Including No Date Records) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)]">
          <span className="text-xs font-semibold text-[var(--muted)] ml-1">تصفية سريعة:</span>
          <button
            type="button"
            onClick={() => {
              setDateStatusFilter("");
              setCombinedStatusFilter("");
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              !dateStatusFilter && !combinedStatusFilter
                ? "bg-[#1167c9] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            الكل ({baseFiltered.length})
          </button>
          <button
            type="button"
            onClick={() => setDateStatusFilter(dateStatusFilter === "no_dates" ? "" : "no_dates")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              dateStatusFilter === "no_dates"
                ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-300"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            }`}
          >
            <span>سجلات بدون تاريخ</span>
            <span className="bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded-full text-[10px]">
              {noDatesCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDateStatusFilter(dateStatusFilter === "uploaded_no_dates" ? "" : "uploaded_no_dates")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              dateStatusFilter === "uploaded_no_dates"
                ? "bg-sky-600 text-white shadow-sm ring-2 ring-sky-300"
                : "bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
            }`}
          >
            <span>مرفوع بدون تواريخ</span>
            <span className="bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded-full text-[10px]">
              {uploadedWithoutDatesCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDateStatusFilter(dateStatusFilter === "missing_no_dates" ? "" : "missing_no_dates")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              dateStatusFilter === "missing_no_dates"
                ? "bg-slate-700 text-white shadow-sm ring-2 ring-slate-400"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            }`}
          >
            <span>غير مرفوع وبدون تاريخ</span>
            <span className="bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded-full text-[10px]">
              {missingNoDatesCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDateStatusFilter(dateStatusFilter === "due_today" ? "" : "due_today")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              dateStatusFilter === "due_today"
                ? "bg-orange-600 text-white shadow-sm ring-2 ring-orange-300"
                : "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
            }`}
          >
            <span>ينتهي اليوم</span>
            <span className="bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded-full text-[10px]">
              {dueTodayCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDateStatusFilter(dateStatusFilter === "upcoming" ? "" : "upcoming")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              dateStatusFilter === "upcoming"
                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
            }`}
          >
            <span>قريب الانتهاء</span>
            <span className="bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded-full text-[10px]">
              {upcomingCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDateStatusFilter(dateStatusFilter === "expired" ? "" : "expired")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              dateStatusFilter === "expired"
                ? "bg-red-600 text-white shadow-sm ring-2 ring-red-300"
                : "bg-red-50 text-red-800 border border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
            }`}
          >
            <span>منتهي</span>
            <span className="bg-white/80 dark:bg-black/30 px-1.5 py-0.5 rounded-full text-[10px]">
              {expiredCount}
            </span>
          </button>
        </div>

        {/* Active Filters Bar */}
        {isAnyFilterActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)] text-xs">
            <span className="text-[var(--muted)] text-[11px] font-semibold ml-1">الفلاتر النشطة:</span>
            {modelFilter && (
              <Badge className="bg-blue-50 text-[#1167c9] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 gap-1 pl-1.5 font-medium">
                الموديل: {modelFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setModelFilter("")} />
              </Badge>
            )}
            {registrationFilter && (
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 gap-1 pl-1.5 font-medium">
                نوع التسجيل: {formatVehicleRegistrationType(Number(registrationFilter) as VehicleRegistrationType)}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setRegistrationFilter("")} />
              </Badge>
            )}
            {docTypeFilter && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 gap-1 pl-1.5 font-medium">
                نوع الوثيقة: {docTypeOptions.find((o) => o.value === docTypeFilter)?.label || docTypeFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setDocTypeFilter("")} />
              </Badge>
            )}
            {dateStatusFilter && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 gap-1 pl-1.5 font-medium">
                فلتر التواريخ: {dateStatusOptions.find((o) => o.value === dateStatusFilter)?.label || dateStatusFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setDateStatusFilter("")} />
              </Badge>
            )}
            {combinedStatusFilter && (
              <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 gap-1 pl-1.5 font-medium">
                الحالة: {combinedStatusOptions.find((o) => o.value === combinedStatusFilter)?.label || combinedStatusFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setCombinedStatusFilter("")} />
              </Badge>
            )}
            <Button
              variant="secondary"
              onClick={clearAllFilters}
              className="gap-1.5 text-xs h-7 min-h-0 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/30 mr-auto"
            >
              <RefreshCw className="h-3 w-3" /> مسح جميع الفلاتر
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" onClick={loadData} className="gap-1 text-xs px-3">
            <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Interactive Summary Cards (Click to Filter) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setDateStatusFilter(dateStatusFilter === "uploaded_no_dates" ? "" : "uploaded_no_dates")}
          className={`text-right rounded-xl border p-4 shadow-sm transition-all cursor-pointer ${
            dateStatusFilter === "uploaded_no_dates"
              ? "border-sky-500 bg-sky-100/70 dark:bg-sky-950/60 ring-2 ring-sky-500 shadow-md scale-[1.02]"
              : "border-sky-200 bg-sky-50/50 hover:bg-sky-100/50 dark:border-sky-900/40 dark:bg-sky-950/20 dark:hover:bg-sky-950/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-sky-800 dark:text-sky-300">مرفوع بدون تواريخ</div>
            {dateStatusFilter === "uploaded_no_dates" && (
              <Badge className="bg-sky-600 text-white text-[10px] px-1.5 py-0.5">محدد</Badge>
            )}
          </div>
          <div className="text-3xl font-bold text-sky-600 dark:text-sky-400 mt-2">{uploadedWithoutDatesCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setDateStatusFilter(dateStatusFilter === "no_dates" ? "" : "no_dates")}
          className={`text-right rounded-xl border p-4 shadow-sm transition-all cursor-pointer ${
            dateStatusFilter === "no_dates"
              ? "border-amber-500 bg-amber-100/70 dark:bg-amber-950/60 ring-2 ring-amber-500 shadow-md scale-[1.02]"
              : "border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-amber-800 dark:text-amber-300">سجلات بدون تواريخ (الكل)</div>
            {dateStatusFilter === "no_dates" && (
              <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5">محدد</Badge>
            )}
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">{noDatesCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setDateStatusFilter(dateStatusFilter === "due_today" ? "" : "due_today")}
          className={`text-right rounded-xl border p-4 shadow-sm transition-all cursor-pointer ${
            dateStatusFilter === "due_today"
              ? "border-orange-500 bg-orange-100/70 dark:bg-orange-950/60 ring-2 ring-orange-500 shadow-md scale-[1.02]"
              : "border-orange-200 bg-orange-50/50 hover:bg-orange-100/50 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:bg-orange-950/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-orange-800 dark:text-orange-300">ينتهي اليوم</div>
            {dateStatusFilter === "due_today" && (
              <Badge className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5">محدد</Badge>
            )}
          </div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{dueTodayCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setDateStatusFilter(dateStatusFilter === "upcoming" ? "" : "upcoming")}
          className={`text-right rounded-xl border p-4 shadow-sm transition-all cursor-pointer ${
            dateStatusFilter === "upcoming"
              ? "border-blue-500 bg-blue-100/70 dark:bg-blue-950/60 ring-2 ring-blue-500 shadow-md scale-[1.02]"
              : "border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-blue-800 dark:text-blue-300">قريب الانتهاء (30 يوم)</div>
            {dateStatusFilter === "upcoming" && (
              <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5">محدد</Badge>
            )}
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{upcomingCount}</div>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">
              {isAnyFilterActive
                ? "لا توجد تنبيهات مطابقة لمعايير البحث والتصفية"
                : "جميع التراخيص سارية أو لا توجد تنبيهات"}
            </p>
            {isAnyFilterActive && (
              <Button
                variant="secondary"
                className="mt-4 gap-1 text-xs px-3 py-1.5 mx-auto"
                onClick={clearAllFilters}
              >
                <RefreshCw className="h-3.5 w-3.5" /> مسح التصفية والبحث
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 whitespace-nowrap">اللوحة / الرقم التسلسلي</th>
                  <th className="px-5 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>الموديل / الصانع</span>
                      <TableHeaderColumnFilter
                        label="الموديل"
                        value={modelFilter}
                        onChange={setModelFilter}
                        options={modelOptions}
                        placeholder="تصفية بالموديل..."
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>نوع التسجيل</span>
                      <TableHeaderColumnFilter
                        label="نوع التسجيل"
                        value={registrationFilter}
                        onChange={setRegistrationFilter}
                        options={registrationTypeOptions}
                        placeholder="تصفية بنوع التسجيل..."
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>نوع الوثيقة</span>
                      <TableHeaderColumnFilter
                        label="نوع الوثيقة"
                        value={docTypeFilter}
                        onChange={setDocTypeFilter}
                        options={docTypeOptions}
                        placeholder="تصفية بنوع الوثيقة..."
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-[#1167c9]" />
                      المستند / الملف
                    </span>
                  </th>
                  <th className="px-5 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#1167c9]" />
                        بيانات وتاريخ الصلاحية
                      </span>
                      <TableHeaderColumnFilter
                        label="التواريخ والصلاحية"
                        value={dateStatusFilter}
                        onChange={setDateStatusFilter}
                        options={dateStatusOptions}
                        placeholder="تصفية بحالة التاريخ..."
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>الحالة العامة</span>
                      <TableHeaderColumnFilter
                        label="الحالة العامة"
                        value={combinedStatusFilter}
                        onChange={setCombinedStatusFilter}
                        options={combinedStatusOptions}
                        placeholder="تصفية بالحالة..."
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4 text-center whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item, idx) => (
                  <tr
                    key={`${item.vehicleId}-${item.type}-${idx}`}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {/* 1. Vehicle Plate / Serial */}
                    <td className="px-5 py-4">
                      {(() => {
                        const v = vehiclesMap[item.vehicleId];
                        const plateAr = item.plateNumberAr || item.plateNumber || v?.plateNumberAr;
                        const plateLettersDigits =
                          v?.plateLettersAr && v?.plateDigits ? `${v.plateLettersAr} ${v.plateDigits}` : null;
                        const plateDisplay = plateAr || plateLettersDigits || item.plateNumberEn || v?.plateNumberEn;
                        const plateEn = item.plateNumberEn || v?.plateNumberEn;
                        const serialDisplay = item.serialNumber || v?.serialNumber || v?.chassisNumber;

                        return (
                          <Link
                            href={`/admin/fleet/vehicles/${item.vehicleId}`}
                            className="group block space-y-1 hover:opacity-90"
                          >
                            <div>
                              {plateDisplay ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="font-bold border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-xs shadow-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 group-hover:border-[#1167c9] group-hover:text-[#1167c9] transition-colors">
                                    {plateDisplay}
                                  </span>
                                  {plateEn && plateEn !== plateDisplay && (
                                    <span className="text-[11px] text-[var(--muted)] font-mono">{plateEn}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--muted)]">بدون لوحة</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-[11px] text-[var(--muted)]">الرقم التسلسلي:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#1167c9]">
                                {serialDisplay || "—"}
                              </span>
                            </div>
                          </Link>
                        );
                      })()}
                    </td>

                    {/* 2. Model / Manufacturer */}
                    <td className="px-5 py-4">
                      {(() => {
                        const v = vehiclesMap[item.vehicleId];
                        const mfg = v?.manufacturer?.trim() || "";
                        const mdl = v?.model?.trim() || "";
                        const fullModel = [mfg, mdl].filter(Boolean).join(" ");
                        return fullModel ? (
                          <span className="font-bold text-slate-800 dark:text-slate-100">{fullModel}</span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">—</span>
                        );
                      })()}
                    </td>

                    {/* 3. Registration Type */}
                    <td className="px-5 py-4">
                      {(() => {
                        const v = vehiclesMap[item.vehicleId];
                        if (v?.registrationType === undefined || v?.registrationType === null) {
                          return <span className="text-xs text-[var(--muted)]">—</span>;
                        }
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              v.registrationType === VehicleRegistrationType.PublicTransport ||
                              Number(v.registrationType) === VehicleRegistrationType.PublicTransport
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                                : v.registrationType === VehicleRegistrationType.PrivateTransport ||
                                  Number(v.registrationType) === VehicleRegistrationType.PrivateTransport
                                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {formatVehicleRegistrationType(v.registrationType)}
                          </span>
                        );
                      })()}
                    </td>

                    {/* 4. Document Type */}
                    <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">
                      {getDocTypeInfo(item.type).label}
                    </td>

                    {/* 5. Document / File Indicator */}
                    <td className="px-5 py-4 min-w-[180px]">
                      {renderDocumentIndicator(item)}
                    </td>

                    {/* 6. Date Indicator */}
                    <td className="px-5 py-4 min-w-[180px]">
                      {renderDateIndicator(item)}
                    </td>

                    {/* 7. Combined Compliance Badge */}
                    <td className="px-5 py-4">
                      {renderCombinedBadge(item)}
                    </td>

                    {/* 8. Direct Actions */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {can("fleet.compliance.manage") && (
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1 h-auto min-h-0 text-[#1167c9] border-[#1167c9]/30 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 font-semibold"
                            onClick={() => {
                              const v = vehiclesMap[item.vehicleId];
                              setComplianceModal({
                                isOpen: true,
                                vehicleId: item.vehicleId,
                                initialType: getComplianceTabType(item.type),
                                registrationType: v?.registrationType,
                              });
                            }}
                            title="تحديث أو إدخال التواريخ"
                          >
                            <Calendar className="h-3 w-3" />
                            <span>تحديث التواريخ</span>
                          </Button>
                        )}
                        <Link
                          href={`/admin/fleet/vehicles/${item.vehicleId}`}
                          className="text-xs font-bold text-slate-500 hover:text-[#1167c9] inline-flex items-center gap-0.5 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="عرض تفاصيل المركبة"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Update Compliance Dates Modal */}
      {complianceModal.isOpen && (
        <AddComplianceModal
          isOpen={complianceModal.isOpen}
          onClose={() => setComplianceModal({ ...complianceModal, isOpen: false })}
          onSuccess={async () => {
            setComplianceModal({ ...complianceModal, isOpen: false });
            await loadData();
          }}
          vehicleId={complianceModal.vehicleId}
          initialType={complianceModal.initialType}
          registrationType={complianceModal.registrationType}
        />
      )}

      {/* Live Preview Modal */}
      {previewState.isOpen && (
        <Modal
          isOpen={previewState.isOpen}
          onClose={handleClosePreview}
          title={previewState.title}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4 pt-2">
            {previewState.loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#1167c9]" />
                <span className="text-sm font-semibold">جارٍ تحميل المعاينة المباشرة...</span>
              </div>
            ) : previewState.error ? (
              <div className="p-8 text-center text-red-600">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold">{previewState.error}</p>
              </div>
            ) : previewState.url ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-900/40 flex items-center justify-center min-h-[400px]">
                {previewState.contentType?.startsWith("image/") ? (
                  <img
                    src={previewState.url}
                    alt={previewState.title}
                    className="max-h-[70vh] object-contain rounded-lg shadow-sm"
                  />
                ) : previewState.contentType?.includes("pdf") ? (
                  <iframe
                    src={previewState.url}
                    className="w-full h-[70vh] rounded-lg border-0"
                    title={previewState.title}
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      تتوفر المعاينة للصور ومستندات PDF.
                    </p>
                    <a
                      href={previewState.url}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1167c9] text-white rounded-lg text-xs font-bold"
                    >
                      <Download className="h-4 w-4" /> تنزيل الملف
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {previewState.url && (
                <a
                  href={previewState.url}
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                >
                  <Download className="h-4 w-4" /> تنزيل الملف
                </a>
              )}
              <Button variant="secondary" onClick={handleClosePreview}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
