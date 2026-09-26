"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Users,
  UserCheck,
  Pencil,
  Eye,
  ShieldAlert,
  MapPin,
  Briefcase,
  Phone,
  Globe,
  CreditCard,
  FileText,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { TableHeaderColumnFilter, TableHeaderDualFilter, type FilterOption } from "@/components/ui/TableHeaderFilter";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { translate } from "../../../../lib/i18n";
import { exportToExcel } from "../../../../lib/export-excel";
import { getNationalityOptions } from "../../../../lib/constants/nationalities";
import {
  listExternalRiders,
  getExternalRider,
  createExternalRider,
  updateExternalRider,
  getOperatingCities,
  getOperationalWorkTypes,
  type ExternalRider,
  type OperatingCityCatalogItem,
  type OperationalWorkTypeCatalogItem,
} from "../../../../lib/workforce/external-riders-api";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Input } from "../../../../components/ui/Input";
import { SearchableSelect, SelectOption } from "../../../../components/ui/SearchableSelect";
import { toast } from "../../../../components/ui/Toast";
import { ExternalRiderStatusBadge } from "../../../../components/hr/ExternalRiderStatusBadge";

export default function ExternalRidersPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [riders, setRiders] = useState<ExternalRider[]>([]);
  const [cities, setCities] = useState<OperatingCityCatalogItem[]>([]);
  const [workTypes, setWorkTypes] = useState<OperationalWorkTypeCatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [headerCityFilter, setHeaderCityFilter] = useState<string[]>([]);
  const [headerWorkTypeFilter, setHeaderWorkTypeFilter] = useState<string[]>([]);
  const [headerStatusFilter, setHeaderStatusFilter] = useState<string[]>([]);
  const [headerNationalityFilter, setHeaderNationalityFilter] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const EXTERNAL_RIDERS_FILTERS_SESSION_KEY = "admin_external_riders_filters_session";
  const isRestoredRef = useState({ current: false })[0];

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(EXTERNAL_RIDERS_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.search === "string") setSearch(parsed.search);
        if (Array.isArray(parsed.headerCityFilter)) setHeaderCityFilter(parsed.headerCityFilter);
        if (Array.isArray(parsed.headerWorkTypeFilter)) setHeaderWorkTypeFilter(parsed.headerWorkTypeFilter);
        if (Array.isArray(parsed.headerStatusFilter)) setHeaderStatusFilter(parsed.headerStatusFilter);
        if (Array.isArray(parsed.headerNationalityFilter)) setHeaderNationalityFilter(parsed.headerNationalityFilter);
      }
    } catch {
      // ignore parse errors
    } finally {
      isRestoredRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isRestoredRef.current) return;
    try {
      sessionStorage.setItem(
        EXTERNAL_RIDERS_FILTERS_SESSION_KEY,
        JSON.stringify({
          search,
          headerCityFilter,
          headerWorkTypeFilter,
          headerStatusFilter,
          headerNationalityFilter,
        })
      );
    } catch {
      // ignore
    }
  }, [search, headerCityFilter, headerWorkTypeFilter, headerStatusFilter, headerNationalityFilter]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRider, setEditingRider] = useState<ExternalRider | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    iqamaNo: "",
    fullNameAr: "",
    nationality: "",
    iban: "",
    primaryPhone: "",
    operatingCityId: "",
    operationalWorkTypeId: "",
    buildingNumber: "",
    street: "",
    district: "",
    city: "",
    postalCode: "",
    additionalNumber: "",
  });
  const [formErrors, setFormErrors] = useState<{
    iqamaNo?: string;
    fullNameAr?: string;
    primaryPhone?: string;
    operatingCityId?: string;
    operationalWorkTypeId?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const canCreate = can("employees.create");
  const canUpdate = can("employees.update");
  const canRead = can("riders.read");
  const canReadCities = can("operating_cities.read");
  const canReadWorkTypes = can("employees.read");

  const loadData = async () => {
    setLoading(true);
    setError("");

    const promises: Promise<any>[] = [
      canRead ? listExternalRiders().catch(() => []) : Promise.resolve([]),
      canReadCities ? getOperatingCities().catch(() => []) : Promise.resolve([]),
      canReadWorkTypes ? getOperationalWorkTypes().catch(() => []) : Promise.resolve([]),
    ];

    try {
      const [ridersRes, citiesRes, workTypesRes] = await Promise.all(promises);
      setRiders(ridersRes);
      setCities(citiesRes);
      setWorkTypes(workTypesRes);
    } catch (err: any) {
      const msg =
        err?.status === 403
          ? locale === "en"
            ? "You do not have permission to view external riders."
            : "ليس لديك صلاحية لعرض المناديب الخارجيين."
          : locale === "en"
            ? "Unable to load external riders data."
            : "تعذر تحميل بيانات المناديب الخارجيين.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) {
      loadData();
    } else {
      setLoading(false);
      setError(
        locale === "en"
          ? "You do not have permission to view external riders."
          : "ليس لديك صلاحية لعرض المناديب الخارجيين."
      );
    }
  }, [canRead, locale]);

  // Create maps for lookup
  const cityMap = useMemo(() => {
    const map = new Map<string, OperatingCityCatalogItem>();
    cities.forEach((c) => map.set(c.id, c));
    return map;
  }, [cities]);

  const workTypeMap = useMemo(() => {
    const map = new Map<string, OperationalWorkTypeCatalogItem>();
    workTypes.forEach((w) => map.set(w.id, w));
    return map;
  }, [workTypes]);

  // City options for SearchableSelect
  const cityOptions = useMemo<SelectOption[]>(() => {
    return cities
      .filter((c) => c.status === "Active")
      .map((c) => ({
        value: c.id,
        label: locale === "en" ? (c.nameEn || c.nameAr || c.code) : (c.nameAr || c.nameEn || c.code),
        sublabel: c.code,
      }));
  }, [cities, locale]);

  // Work type options for SearchableSelect
  const workTypeOptions = useMemo<SelectOption[]>(() => {
    return workTypes
      .filter((w) => w.status === "Active")
      .map((w) => ({
        value: w.id,
        label: locale === "en" ? (w.nameEn || w.nameAr || w.code) : (w.nameAr || w.nameEn || w.code),
        sublabel: w.code,
      }));
  }, [workTypes, locale]);

  // Filter options for TableHeaderColumnFilter
  const cityFilterOptions: FilterOption[] = useMemo(() => {
    return cities.map((c) => ({
      value: c.id,
      label: locale === "en" ? (c.nameEn || c.nameAr || c.code) : (c.nameAr || c.nameEn || c.code),
    }));
  }, [cities, locale]);

  const workTypeFilterOptions: FilterOption[] = useMemo(() => {
    return workTypes.map((w) => ({
      value: w.id,
      label: locale === "en" ? (w.nameEn || w.nameAr || w.code) : (w.nameAr || w.nameEn || w.code),
    }));
  }, [workTypes, locale]);

  const statusFilterOptions: FilterOption[] = useMemo(() => {
    const statuses = ["Active", "Suspended", "Inactive", "Draft", "Onboarding"];
    const statusLabels: Record<string, { ar: string; en: string }> = {
      Active: { ar: "نشط", en: "Active" },
      Suspended: { ar: "موقوف", en: "Suspended" },
      Inactive: { ar: "غير نشط", en: "Inactive" },
      Draft: { ar: "مسودة", en: "Draft" },
      Onboarding: { ar: "قيد التهيئة", en: "Onboarding" },
    };
    return statuses.map((st) => ({
      value: st,
      label: locale === "en" ? statusLabels[st]?.en || st : statusLabels[st]?.ar || st,
    }));
  }, [locale]);

  const nationalityFilterOptions: FilterOption[] = useMemo(() => {
    const set = new Set<string>();
    riders.forEach((r) => {
      if (r.nationality && r.nationality.trim()) set.add(r.nationality.trim());
    });
    return Array.from(set).sort().map((nat) => ({
      value: nat,
      label: nat,
    }));
  }, [riders]);

  const filteredRiders = useMemo(() => {
    // Terminated riders are separated to the dedicated Terminated Staff section
    const nonTerminated = riders.filter((r) => r.status !== "Terminated");
    return nonTerminated.filter((r) => {
      if (headerCityFilter.length > 0) {
        if (!r.operatingCityId || !headerCityFilter.includes(r.operatingCityId)) return false;
      }

      if (headerWorkTypeFilter.length > 0) {
        if (!r.operationalWorkTypeId || !headerWorkTypeFilter.includes(r.operationalWorkTypeId)) return false;
      }

      if (headerStatusFilter.length > 0) {
        if (!r.status || !headerStatusFilter.includes(r.status)) return false;
      }

      if (headerNationalityFilter.length > 0) {
        if (!r.nationality || !headerNationalityFilter.includes(r.nationality)) return false;
      }

      const query = search.trim().toLowerCase();
      if (!query) return true;

      return Boolean(
        r.fullNameAr?.toLowerCase().includes(query) ||
        r.iqamaNo?.includes(query) ||
        r.primaryPhone?.includes(query) ||
        r.nationality?.toLowerCase().includes(query) ||
        r.iban?.toLowerCase().includes(query) ||
        r.employeeId?.toLowerCase().includes(query) ||
        r.riderProfileId?.toLowerCase().includes(query)
      );
    });
  }, [riders, search, headerCityFilter, headerWorkTypeFilter, headerStatusFilter, headerNationalityFilter]);

  const nonTerminatedCount = useMemo(
    () => riders.filter((r) => r.status !== "Terminated").length,
    [riders]
  );

  const activeRidersCount = useMemo(
    () => riders.filter((r) => r.status === "Active").length,
    [riders]
  );

  const validateCreateForm = (): boolean => {
    const errors: {
      iqamaNo?: string;
      fullNameAr?: string;
      primaryPhone?: string;
      operatingCityId?: string;
      operationalWorkTypeId?: string;
    } = {};

    const cleanIqama = formData.iqamaNo.trim();
    if (!cleanIqama) {
      errors.iqamaNo =
        locale === "en"
          ? "Iqama / National ID is required."
          : "رقم الإقامة مطلوب.";
    } else if (!/^\d{10}$/.test(cleanIqama)) {
      errors.iqamaNo =
        locale === "en"
          ? "Iqama number must contain exactly 10 digits."
          : "يجب أن يتكون رقم الإقامة من 10 أرقام بالضبط.";
    }

    const cleanName = formData.fullNameAr.trim();
    if (!cleanName) {
      errors.fullNameAr =
        locale === "en"
          ? "Arabic full name is required."
          : "الاسم الكامل بالعربية مطلوب.";
    } else if (cleanName.length > 200) {
      errors.fullNameAr =
        locale === "en"
          ? "Arabic full name cannot exceed 200 characters."
          : "الاسم بالعربية لا يمكن أن يتجاوز 200 حرف.";
    }

    const cleanPhone = formData.primaryPhone.trim();
    if (!cleanPhone) {
      errors.primaryPhone =
        locale === "en"
          ? "Primary phone number is required."
          : "رقم الهاتف الرئيسي مطلوب.";
    }

    if (!formData.operatingCityId) {
      errors.operatingCityId =
        locale === "en"
          ? "Operating city selection is required."
          : "اختيار المدينة التشغيلية مطلوب.";
    }

    if (!formData.operationalWorkTypeId) {
      errors.operationalWorkTypeId =
        locale === "en"
          ? "Operational role selection is required."
          : "اختيار الدور التشغيلي مطلوب.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateUpdateForm = (): boolean => {
    const errors: {
      iqamaNo?: string;
      fullNameAr?: string;
      primaryPhone?: string;
      operationalWorkTypeId?: string;
    } = {};

    const cleanIqama = formData.iqamaNo.trim();
    if (!cleanIqama) {
      errors.iqamaNo =
        locale === "en"
          ? "Iqama / National ID is required."
          : "رقم الإقامة مطلوب.";
    } else if (!/^\d{10}$/.test(cleanIqama)) {
      errors.iqamaNo =
        locale === "en"
          ? "Iqama number must contain exactly 10 digits."
          : "يجب أن يتكون رقم الإقامة من 10 أرقام بالضبط.";
    }

    const cleanName = formData.fullNameAr.trim();
    if (!cleanName) {
      errors.fullNameAr =
        locale === "en"
          ? "Arabic full name is required."
          : "الاسم الكامل بالعربية مطلوب.";
    } else if (cleanName.length > 200) {
      errors.fullNameAr =
        locale === "en"
          ? "Arabic full name cannot exceed 200 characters."
          : "الاسم بالعربية لا يمكن أن يتجاوز 200 حرف.";
    }

    const cleanPhone = formData.primaryPhone.trim();
    if (!cleanPhone) {
      errors.primaryPhone =
        locale === "en"
          ? "Primary phone number is required."
          : "رقم الهاتف الرئيسي مطلوب.";
    } else if (cleanPhone.length > 32) {
      errors.primaryPhone =
        locale === "en"
          ? "Primary phone number cannot exceed 32 characters."
          : "رقم الهاتف الرئيسي لا يمكن أن يتجاوز 32 حرفاً.";
    }

    const cleanWorkType = formData.operationalWorkTypeId.trim();
    if (!cleanWorkType) {
      errors.operationalWorkTypeId =
        locale === "en"
          ? "Operational role (work type) is required."
          : "اختيار الدور التشغيلي (نوع العمل) مطلوب.";
    } else if (workTypes.length > 0 && !workTypes.some((w) => w.id === cleanWorkType)) {
      errors.operationalWorkTypeId =
        locale === "en"
          ? "Selected operational work type is invalid."
          : "الدور التشغيلي المحدد غير صالح.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreate = () => {
    setFormData({
      iqamaNo: "",
      fullNameAr: "",
      nationality: "",
      iban: "",
      primaryPhone: "",
      operatingCityId: "",
      operationalWorkTypeId: "",
      buildingNumber: "",
      street: "",
      district: "",
      city: "",
      postalCode: "",
      additionalNumber: "",
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEdit = (rider: ExternalRider) => {
    setEditingRider(rider);
    setFormData({
      iqamaNo: rider.iqamaNo || "",
      fullNameAr: rider.fullNameAr || "",
      nationality: rider.nationality || "",
      iban: rider.iban || "",
      primaryPhone: rider.primaryPhone || "",
      operatingCityId: rider.operatingCityId || "",
      operationalWorkTypeId: rider.operationalWorkTypeId || "",
      buildingNumber: rider.address?.buildingNumber || "",
      street: rider.address?.street || "",
      district: rider.address?.district || "",
      city: rider.address?.city || "",
      postalCode: rider.address?.postalCode || "",
      additionalNumber: rider.address?.additionalNumber || "",
    });
    setFormErrors({});
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setEditingRider(null);
    setFormData({
      iqamaNo: "",
      fullNameAr: "",
      nationality: "",
      iban: "",
      primaryPhone: "",
      operatingCityId: "",
      operationalWorkTypeId: "",
      buildingNumber: "",
      street: "",
      district: "",
      city: "",
      postalCode: "",
      additionalNumber: "",
    });
    setFormErrors({});
  };

  const getAddressPayload = () => {
    const b = formData.buildingNumber.trim();
    const s = formData.street.trim();
    const d = formData.district.trim();
    const c = formData.city.trim();
    const p = formData.postalCode.trim();
    const a = formData.additionalNumber.trim();
    const hasAddr = b || s || d || c || p || a;
    return hasAddr
      ? {
        buildingNumber: b || null,
        street: s || null,
        district: d || null,
        city: c || null,
        postalCode: p || null,
        additionalNumber: a || null,
      }
      : null;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setSubmitting(true);
    try {
      await createExternalRider({
        iqamaNo: formData.iqamaNo.trim(),
        fullNameAr: formData.fullNameAr.trim(),
        nationality: formData.nationality.trim() || null,
        iban: formData.iban.trim() || null,
        address: getAddressPayload(),
        primaryPhone: formData.primaryPhone.trim(),
        operatingCityId: formData.operatingCityId,
        operationalWorkTypeId: formData.operationalWorkTypeId,
      });
      toast.success(
        locale === "en" ? "External Rider Created" : "تم إنشاء المندوب الخارجي",
        locale === "en"
          ? "External rider profile created successfully."
          : "تم تسجيل المندوب الخارجي بنجاح."
      );
      handleCloseModals();
      loadData();
    } catch (err: any) {
      let message =
        locale === "en"
          ? "Failed to create external rider."
          : "تعذر إنشاء المندوب الخارجي.";
      if (err?.status === 409) {
        message =
          locale === "en"
            ? "The Iqama number already exists."
            : "رقم الإقامة مستخدم بالفعل لموظف آخر.";
      } else if (err?.status === 403) {
        message =
          locale === "en"
            ? "You lack permission to create employees."
            : "ليس لديك صلاحية إضافة موظف.";
      } else if (err?.status === 400 && err?.message) {
        message = err.message;
      }
      toast.error(
        locale === "en" ? "Creation Failed" : "فشل الإنشاء",
        message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRider) return;
    if (!validateUpdateForm()) return;

    setSubmitting(true);
    try {
      const updated = await updateExternalRider(editingRider.employeeId, {
        iqamaNo: formData.iqamaNo.trim(),
        fullNameAr: formData.fullNameAr.trim(),
        nationality: formData.nationality.trim() || null,
        iban: formData.iban.trim() || null,
        primaryPhone: formData.primaryPhone.trim(),
        operationalWorkTypeId: formData.operationalWorkTypeId.trim(),
        address: getAddressPayload(),
        rowVersion: editingRider.rowVersion,
      });
      toast.success(
        locale === "en" ? "External Rider Updated" : "تم تحديث المندوب الخارجي",
        locale === "en"
          ? "External rider details updated successfully."
          : "تم تحديث بيانات المندوب الخارجي بنجاح."
      );
      // Refresh the rider after a successful update because the response contains a new rowVersion
      setRiders((prev) =>
        prev.map((r) => (r.employeeId === updated.employeeId ? { ...r, ...updated } : r))
      );
      handleCloseModals();
      loadData();
    } catch (err: any) {
      let message =
        locale === "en"
          ? "Failed to update external rider."
          : "تعذر تحديث بيانات المندوب الخارجي.";
      if (err?.status === 409) {
        message =
          locale === "en"
            ? "Conflict detected (outdated version or duplicate data). Latest rider data was reloaded. Please review and retry."
            : "حدث تعارض في البيانات (نسخة قديمة أو تكرار). تمت إعادة تحميل أحدث بيانات للمندوب. يرجى المراجعة والمحاولة مجدداً.";
        // Handle 409 Conflict by reloading the rider and asking the user to retry
        try {
          const latestRider = await getExternalRider(editingRider.employeeId);
          setEditingRider(latestRider);
          setFormData((prev) => ({
            ...prev,
            iqamaNo: latestRider.iqamaNo || "",
            fullNameAr: latestRider.fullNameAr || "",
            nationality: latestRider.nationality || "",
            iban: latestRider.iban || "",
            primaryPhone: latestRider.primaryPhone || "",
            operatingCityId: latestRider.operatingCityId || "",
            operationalWorkTypeId: latestRider.operationalWorkTypeId || "",
            buildingNumber: latestRider.address?.buildingNumber || "",
            street: latestRider.address?.street || "",
            district: latestRider.address?.district || "",
            city: latestRider.address?.city || "",
            postalCode: latestRider.address?.postalCode || "",
            additionalNumber: latestRider.address?.additionalNumber || "",
          }));
          setRiders((prev) =>
            prev.map((r) => (r.employeeId === latestRider.employeeId ? { ...r, ...latestRider } : r))
          );
        } catch {
          loadData();
        }
      } else if (err?.status === 404) {
        message =
          locale === "en"
            ? "External rider not found."
            : "المندوب الخارجي غير موجود.";
      } else if (err?.status === 403) {
        message =
          locale === "en"
            ? "You lack permission to update employees."
            : "ليس لديك صلاحية تعديل بيانات الموظف.";
      } else if (err?.status === 400 && err?.message) {
        message = err.message;
      }
      toast.error(
        locale === "en" ? "Update Failed" : "فشل التحديث",
        message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredRiders.length === 0) {
      toast.error(
        locale === "en" ? "No Data" : "لا توجد بيانات",
        locale === "en" ? "No external riders match the current search." : "لا يوجد مناديب خارجيين يطابقون خيارات البحث."
      );
      return;
    }
    setExporting(true);
    try {
      await exportToExcel({
        filename: `external-riders-${new Date().toISOString().split("T")[0]}`,
        sheetName: locale === "en" ? "External Riders" : "المناديب الخارجيين",
        data: filteredRiders,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: locale === "en" ? "Full Name" : "الاسم الكامل", accessor: (r) => r.fullNameAr, width: 28 },
          { header: locale === "en" ? "Iqama / ID No" : "رقم الإقامة", accessor: (r) => r.iqamaNo, width: 18, isText: true },
          { header: locale === "en" ? "Primary Phone" : "رقم الجوال", accessor: (r) => r.primaryPhone, width: 18, isText: true },
          { header: locale === "en" ? "Nationality" : "الجنسية", accessor: (r) => r.nationality || "—", width: 16 },
          {
            header: locale === "en" ? "Operating City" : "المدينة التشغيلية",
            accessor: (r) => {
              const cityObj = r.operatingCityId ? cityMap.get(r.operatingCityId) : undefined;
              return cityObj ? (locale === "en" ? (cityObj.nameEn || cityObj.nameAr) : (cityObj.nameAr || cityObj.nameEn)) : (r.operatingCityId || "—");
            },
            width: 20,
          },
          {
            header: locale === "en" ? "Operational Role" : "الدور التشغيلي",
            accessor: (r) => {
              const wt = r.operationalWorkTypeId ? workTypeMap.get(r.operationalWorkTypeId) : undefined;
              return wt ? (locale === "en" ? (wt.nameEn || wt.nameAr) : (wt.nameAr || wt.nameEn)) : (r.operationalWorkTypeId || "—");
            },
            width: 22,
          },
          { header: locale === "en" ? "IBAN" : "الآيبان البنكي", accessor: (r) => r.iban || "—", width: 26, isText: true },
          {
            header: locale === "en" ? "Status" : "الحالة",
            accessor: (r) => r.status === "Terminated" ? (locale === "en" ? "Terminated" : "منتهي الخدمة") : (locale === "en" ? "Active" : "نشط"),
            width: 16,
          },
        ],
      });
      toast.success(
        locale === "en" ? "Exported" : "تم التصدير",
        locale === "en" ? "External riders list exported to Excel successfully." : "تم تنزيل قائمة المناديب الخارجيين بصيغة إكسل بنجاح."
      );
    } catch (err) {
      console.error("Export error:", err);
      toast.error(
        locale === "en" ? "Export Failed" : "فشل التصدير",
        locale === "en" ? "Failed to export data to Excel." : "حدث خطأ أثناء تصدير ملف الإكسل."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">{t("nav.hr")}</p>
          <h1 className="mt-1 text-3xl font-black">
            {locale === "en" ? "External Riders" : "المناديب الخارجيين"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {locale === "en"
              ? "Manage outside riders, Iqama records, operational roles, and city assignments."
              : "إدارة وتسجيل بيانات المناديب الخارجيين والأدوار التشغيلية والمدن."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            loading={exporting}
            disabled={exporting || loading || filteredRiders.length === 0}
            className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
          >
            <FileSpreadsheet size={16} />
            {locale === "en" ? "Export Excel" : "تصدير إكسل"}
          </Button>
          {canCreate && (
            <Button onClick={handleOpenCreate}>
              <Plus size={17} />
              {locale === "en" ? "Add External Rider" : "إضافة مندوب خارجي"}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-[#1167c9]">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              {locale === "en" ? "Total External Riders" : "إجمالي المناديب الخارجيين"}
            </p>
            <p className="mt-1 text-2xl font-black">{nonTerminatedCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              {locale === "en" ? "Active Riders" : "المناديب النشطون"}
            </p>
            <p className="mt-1 text-2xl font-black">{activeRidersCount}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="grid size-12 place-items-center rounded-2xl bg-purple-50 text-purple-600">
            <Search size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              {locale === "en" ? "Filtered Results" : "نتائج البحث الحالية"}
            </p>
            <p className="mt-1 text-2xl font-black">{filteredRiders.length}</p>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1 max-w-xl">
            <div className="relative flex-1 min-w-[240px]">
              <Search
                className={`pointer-events-none absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"
                  }`}
                size={18}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  locale === "en"
                    ? "Search by name, Iqama #, phone, or ID..."
                    : "ابحث بالاسم، رقم الإقامة، الهاتف، أو المعرف..."
                }
                className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"
                  }`}
              />
            </div>

            {(search.trim() ||
              headerCityFilter.length > 0 ||
              headerWorkTypeFilter.length > 0 ||
              headerStatusFilter.length > 0 ||
              headerNationalityFilter.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setHeaderCityFilter([]);
                  setHeaderWorkTypeFilter([]);
                  setHeaderStatusFilter([]);
                  setHeaderNationalityFilter([]);
                  try {
                    sessionStorage.removeItem(EXTERNAL_RIDERS_FILTERS_SESSION_KEY);
                  } catch {}
                }}
                className="h-11 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors shrink-0"
              >
                {locale === "en" ? "Reset Filters" : "إعادة ضبط"}
              </button>
            )}
          </div>
        </div>

        {/* Active Column Filter Badges */}
        {(headerNationalityFilter.length > 0 ||
          headerCityFilter.length > 0 ||
          headerWorkTypeFilter.length > 0 ||
          headerStatusFilter.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/70">
            <span className="text-[11px] font-bold text-[var(--muted)]">
              {locale === "en" ? "Column filters:" : "فلاتر الأعمدة:"}
            </span>
            {headerNationalityFilter.map((nat) => (
              <span
                key={nat}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              >
                <span>{nat}</span>
                <button
                  type="button"
                  onClick={() => setHeaderNationalityFilter((prev) => prev.filter((x) => x !== nat))}
                  className="hover:text-red-500 rounded-full"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {headerCityFilter.map((cId) => {
              const opt = cityFilterOptions.find((o) => o.value === cId);
              return (
                <span
                  key={cId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  <span>{opt?.label || cId}</span>
                  <button
                    type="button"
                    onClick={() => setHeaderCityFilter((prev) => prev.filter((x) => x !== cId))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}
            {headerWorkTypeFilter.map((wId) => {
              const opt = workTypeFilterOptions.find((o) => o.value === wId);
              return (
                <span
                  key={wId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                >
                  <span>{opt?.label || wId}</span>
                  <button
                    type="button"
                    onClick={() => setHeaderWorkTypeFilter((prev) => prev.filter((x) => x !== wId))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}
            {headerStatusFilter.map((st) => {
              const opt = statusFilterOptions.find((o) => o.value === st);
              return (
                <span
                  key={st}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                >
                  <span>{opt?.label || st}</span>
                  <button
                    type="button"
                    onClick={() => setHeaderStatusFilter((prev) => prev.filter((x) => x !== st))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setHeaderNationalityFilter([]);
                setHeaderCityFilter([]);
                setHeaderWorkTypeFilter([]);
                setHeaderStatusFilter([]);
              }}
              className="text-[11px] text-red-600 dark:text-red-400 hover:underline ms-2 font-medium"
            >
              {locale === "en" ? "Clear column filters" : "مسح فلاتر الأعمدة"}
            </button>
          </div>
        )}

        {error ? (
          <div className="flex items-center gap-3 p-6 text-red-700">
            <ShieldAlert size={20} />
            <p className="font-bold">{error}</p>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-[var(--muted)] font-bold">
            {t("common.loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className={`min-w-[900px] w-full ${locale === "en" ? "text-left" : "text-right"
                }`}
            >
              <thead className="bg-slate-500/10 text-xs font-bold text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span>{locale === "en" ? "External Rider Name" : "اسم المندوب الخارجي"}</span>
                      <TableHeaderColumnFilter
                        label={locale === "en" ? "Nationality" : "الجنسية"}
                        value={headerNationalityFilter}
                        onChange={(val) => setHeaderNationalityFilter(val)}
                        options={nationalityFilterOptions}
                        placeholder={locale === "en" ? "Filter by nationality..." : "تصفية بالجنسية..."}
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4">
                    {locale === "en" ? "Iqama / Phone" : "رقم الإقامة / الهاتف"}
                  </th>
                  <th className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span>{locale === "en" ? "City & Role" : "المدينة والدور التشغيلي"}</span>
                      <TableHeaderDualFilter
                        label={locale === "en" ? "City & Role" : "المدينة والدور التشغيلي"}
                        tab1={{
                          id: "city",
                          label: locale === "en" ? "Operating City" : "المدينة",
                          icon: <MapPin className="h-3 w-3" />,
                          values: headerCityFilter,
                          onChange: setHeaderCityFilter,
                          options: cityFilterOptions,
                          placeholder: locale === "en" ? "Filter by city..." : "تصفية بالمدينة...",
                        }}
                        tab2={{
                          id: "workType",
                          label: locale === "en" ? "Operational Role" : "الدور التشغيلي",
                          icon: <Briefcase className="h-3 w-3" />,
                          values: headerWorkTypeFilter,
                          onChange: setHeaderWorkTypeFilter,
                          options: workTypeFilterOptions,
                          placeholder: locale === "en" ? "Filter by role..." : "تصفية بالدور...",
                        }}
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span>{locale === "en" ? "Status" : "الحالة"}</span>
                      <TableHeaderColumnFilter
                        label={locale === "en" ? "Status" : "الحالة"}
                        value={headerStatusFilter}
                        onChange={(val) => setHeaderStatusFilter(val)}
                        options={statusFilterOptions}
                        placeholder={locale === "en" ? "Filter by status..." : "تصفية بالحالة..."}
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4 text-center">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {filteredRiders.map((rider) => {
                  const cityObj = rider.operatingCityId ? cityMap.get(rider.operatingCityId) : undefined;
                  const workTypeObj = rider.operationalWorkTypeId ? workTypeMap.get(rider.operationalWorkTypeId) : undefined;

                  const cityName = cityObj
                    ? locale === "en" ? (cityObj.nameEn || cityObj.nameAr || cityObj.code) : (cityObj.nameAr || cityObj.nameEn || cityObj.code)
                    : rider.operatingCityId || "—";

                  const workTypeName = workTypeObj
                    ? locale === "en" ? (workTypeObj.nameEn || workTypeObj.nameAr || workTypeObj.code) : (workTypeObj.nameAr || workTypeObj.nameEn || workTypeObj.code)
                    : rider.operationalWorkTypeId || "—";

                  return (
                    <tr
                      key={rider.employeeId}
                      className="hover:bg-blue-500/5 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/hr/external-riders/${rider.employeeId}`}
                          className="font-black text-slate-900 hover:text-[#1167c9] transition-colors"
                        >
                          {rider.fullNameAr}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)] font-semibold">
                          <span>{locale === "en" ? "Outside Rider" : "مندوب خارجي"}</span>
                          {rider.nationality && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
                              <Globe size={11} />
                              {rider.nationality}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-slate-700">
                          {rider.iqamaNo}
                        </div>
                        {rider.primaryPhone && (
                          <div className="mt-0.5 flex items-center gap-1 font-mono text-xs text-[var(--muted)]">
                            <Phone size={12} />
                            <span>{rider.primaryPhone}</span>
                          </div>
                        )}
                        {rider.iban && (
                          <div className="mt-0.5 flex items-center gap-1 font-mono text-xs text-[#1167c9]">
                            <CreditCard size={12} className="shrink-0" />
                            <span dir="ltr">{rider.iban}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <MapPin size={13} className="text-[#1167c9]" />
                          <span>{cityName}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <Briefcase size={13} />
                          <span>{workTypeName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <ExternalRiderStatusBadge status={rider.status} locale={locale} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canUpdate && (
                            <Button
                              variant="secondary"
                              onClick={() => handleOpenEdit(rider)}
                              className="h-8 px-2.5 text-xs"
                            >
                              <Pencil size={14} />
                              {t("common.edit")}
                            </Button>
                          )}
                          <Link href={`/admin/hr/external-riders/${rider.employeeId}`}>
                            <Button variant="secondary" className="h-8 px-2.5 text-xs">
                              <Eye size={14} />
                              {locale === "en" ? "Profile" : "الملف"}
                            </Button>
                          </Link>
                          <Link href={`/admin/hr/external-riders/${rider.employeeId}?tab=documents`}>
                            <Button variant="secondary" className="h-8 px-2.5 text-xs text-[#1167c9] border-blue-200 bg-blue-50/50 hover:bg-blue-100">
                              <FileText size={14} />
                              {locale === "en" ? "Documents" : "الوثائق"}
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredRiders.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-sm font-bold text-[var(--muted)]"
                    >
                      {locale === "en"
                        ? "No matching external riders found."
                        : "لا يوجد مناديب خارجيون مطابقون للبحث."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal for Creating External Rider */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleCloseModals}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-xl font-black">
                {locale === "en" ? "Add External Rider" : "إضافة مندوب خارجي جديد"}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {locale === "en"
                  ? "Enter rider details to register an external rider."
                  : "أدخل بيانات المندوب لتسجيل مندوب خارجي جديد."}
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Current Main Fields */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#1167c9] dark:text-blue-400 border-b border-[var(--border)] pb-1.5">
                    {locale === "en" ? "Rider Details" : "البيانات الأساسية والتشغيلية"}
                  </p>

                  {/* 1. Iqama No */}
                  <div>
                    <Input
                      label={locale === "en" ? "Iqama / National ID *" : "رقم الإقامة *"}
                      value={formData.iqamaNo}
                      onChange={(e) =>
                        setFormData({ ...formData, iqamaNo: e.target.value })
                      }
                      placeholder="1234567890"
                      maxLength={10}
                      required
                    />
                    {formErrors.iqamaNo ? (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.iqamaNo}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {locale === "en"
                          ? "Must contain exactly 10 digits."
                          : "يجب أن يتكون من 10 أرقام بالضبط."}
                      </p>
                    )}
                  </div>

                  {/* 2. Full Name Arabic */}
                  <div>
                    <Input
                      label={locale === "en" ? "Arabic Full Name *" : "الاسم الكامل بالعربية *"}
                      value={formData.fullNameAr}
                      onChange={(e) =>
                        setFormData({ ...formData, fullNameAr: e.target.value })
                      }
                      placeholder={locale === "en" ? "Ahmed Mohamed" : "أحمد محمد"}
                      maxLength={200}
                      required
                    />
                    {formErrors.fullNameAr ? (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.fullNameAr}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {locale === "en"
                          ? "Required. Maximum 200 characters."
                          : "مطلوب ولا يتجاوز 200 حرف."}
                      </p>
                    )}
                  </div>

                  {/* 3. Nationality */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      {locale === "en" ? "Nationality" : "الجنسية"}
                    </label>
                    <SearchableSelect
                      value={formData.nationality}
                      onChange={(val) => setFormData({ ...formData, nationality: val })}
                      options={getNationalityOptions(locale, formData.nationality)}
                      placeholder={locale === "en" ? "Select nationality..." : "اختر الجنسية..."}
                      searchPlaceholder={locale === "en" ? "Search nationalities..." : "ابحث عن جنسية..."}
                    />
                  </div>

                  {/* 4. IBAN */}
                  <div>
                    <Input
                      label={locale === "en" ? "IBAN" : "رقم الآيبان"}
                      value={formData.iban}
                      onChange={(e) =>
                        setFormData({ ...formData, iban: e.target.value })
                      }
                      placeholder="SA0380000000608010167519"
                      dir="ltr"
                    />
                  </div>

                  {/* 5. Primary Phone */}
                  <div>
                    <Input
                      label={locale === "en" ? "Primary Phone *" : "رقم الجوال الرئيسي *"}
                      value={formData.primaryPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryPhone: e.target.value })
                      }
                      placeholder="0500000000"
                      required
                    />
                    {formErrors.primaryPhone && (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.primaryPhone}
                      </p>
                    )}
                  </div>

                  {/* 6. Operating City */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      {locale === "en" ? "Operating City *" : "المدينة التشغيلية *"}
                    </label>
                    <SearchableSelect
                      value={formData.operatingCityId}
                      onChange={(val) => setFormData({ ...formData, operatingCityId: val })}
                      options={cityOptions}
                      placeholder={locale === "en" ? "Select operating city..." : "اختر المدينة التشغيلية..."}
                      searchPlaceholder={locale === "en" ? "Search cities..." : "ابحث عن مدينة..."}
                      required
                    />
                    {formErrors.operatingCityId && (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.operatingCityId}
                      </p>
                    )}
                  </div>

                  {/* 7. Operational Role (Work Type) */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      {locale === "en" ? "Operational Role *" : "الدور التشغيلي (نوع العمل) *"}
                    </label>
                    <SearchableSelect
                      value={formData.operationalWorkTypeId}
                      onChange={(val) => setFormData({ ...formData, operationalWorkTypeId: val })}
                      options={workTypeOptions}
                      placeholder={locale === "en" ? "Select operational role..." : "اختر الدور التشغيلي..."}
                      searchPlaceholder={locale === "en" ? "Search roles..." : "ابحث عن دور تشغيلي..."}
                      required
                    />
                    {formErrors.operationalWorkTypeId && (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.operationalWorkTypeId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 2: Address */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#1167c9] dark:text-blue-400 border-b border-[var(--border)] pb-1.5">
                    {locale === "en" ? "Address (Optional)" : "العنوان (اختياري)"}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Input
                      label={locale === "en" ? "Building No." : "رقم المبنى"}
                      value={formData.buildingNumber}
                      onChange={(e) => setFormData({ ...formData, buildingNumber: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "Street" : "اسم الشارع"}
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "District" : "الحي"}
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "City" : "المدينة"}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "Postal Code" : "الرمز البريدي"}
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "Additional No." : "الرقم الإضافي"}
                      value={formData.additionalNumber}
                      onChange={(e) => setFormData({ ...formData, additionalNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModals}
                  disabled={submitting}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={submitting}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Editing External Rider */}
      {editingRider && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleCloseModals}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-xl font-black">
                {locale === "en" ? "Edit External Rider" : "تعديل بيانات المندوب الخارجي"}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {locale === "en"
                  ? "Update Iqama, name, nationality, or IBAN."
                  : "تحديث رقم الإقامة، الاسم، الجنسية، أو رقم الآيبان."}
              </p>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Current Main Fields */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#1167c9] dark:text-blue-400 border-b border-[var(--border)] pb-1.5">
                    {locale === "en" ? "Rider Details" : "البيانات الأساسية"}
                  </p>

                  <div>
                    <Input
                      label={locale === "en" ? "Iqama / National ID" : "رقم الإقامة"}
                      value={formData.iqamaNo}
                      onChange={(e) =>
                        setFormData({ ...formData, iqamaNo: e.target.value })
                      }
                      placeholder="1234567890"
                      maxLength={10}
                      required
                    />
                    {formErrors.iqamaNo ? (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.iqamaNo}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {locale === "en"
                          ? "Must contain exactly 10 digits."
                          : "يجب أن يتكون من 10 أرقام بالضبط."}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      label={locale === "en" ? "Arabic Full Name" : "الاسم الكامل بالعربية"}
                      value={formData.fullNameAr}
                      onChange={(e) =>
                        setFormData({ ...formData, fullNameAr: e.target.value })
                      }
                      placeholder={locale === "en" ? "Ahmed Mohamed" : "أحمد محمد"}
                      maxLength={200}
                      required
                    />
                    {formErrors.fullNameAr ? (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.fullNameAr}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {locale === "en"
                          ? "Required. Maximum 200 characters."
                          : "مطلوب ولا يتجاوز 200 حرف."}
                      </p>
                    )}
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      {locale === "en" ? "Nationality" : "الجنسية"}
                    </label>
                    <SearchableSelect
                      value={formData.nationality}
                      onChange={(val) => setFormData({ ...formData, nationality: val })}
                      options={getNationalityOptions(locale, formData.nationality)}
                      placeholder={locale === "en" ? "Select nationality..." : "اختر الجنسية..."}
                      searchPlaceholder={locale === "en" ? "Search nationalities..." : "ابحث عن جنسية..."}
                    />
                  </div>

                  {/* Primary Phone */}
                  <div>
                    <Input
                      label={locale === "en" ? "Primary Phone *" : "رقم الهاتف الرئيسي *"}
                      value={formData.primaryPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryPhone: e.target.value })
                      }
                      placeholder="0500000000"
                      maxLength={32}
                      required
                    />
                    {formErrors.primaryPhone ? (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.primaryPhone}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {locale === "en"
                          ? "Required. Maximum 32 characters."
                          : "مطلوب ولا يتجاوز 32 حرفاً."}
                      </p>
                    )}
                  </div>

                  {/* Operational Role (Work Type) */}
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      {locale === "en" ? "Operational Role *" : "الدور التشغيلي (نوع العمل) *"}
                    </label>
                    <SearchableSelect
                      value={formData.operationalWorkTypeId}
                      onChange={(val) => setFormData({ ...formData, operationalWorkTypeId: val })}
                      options={workTypeOptions}
                      placeholder={locale === "en" ? "Select operational role..." : "اختر الدور التشغيلي..."}
                      searchPlaceholder={locale === "en" ? "Search roles..." : "ابحث عن دور تشغيلي..."}
                      required
                    />
                    {formErrors.operationalWorkTypeId && (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        {formErrors.operationalWorkTypeId}
                      </p>
                    )}
                  </div>

                  {/* IBAN */}
                  <div>
                    <Input
                      label={locale === "en" ? "IBAN" : "رقم الآيبان"}
                      value={formData.iban}
                      onChange={(e) =>
                        setFormData({ ...formData, iban: e.target.value })
                      }
                      placeholder="SA0380000000608010167519"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Column 2: Address */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#1167c9] dark:text-blue-400 border-b border-[var(--border)] pb-1.5">
                    {locale === "en" ? "Address (Optional)" : "العنوان (اختياري)"}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Input
                      label={locale === "en" ? "Building No." : "رقم المبنى"}
                      value={formData.buildingNumber}
                      onChange={(e) => setFormData({ ...formData, buildingNumber: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "Street" : "اسم الشارع"}
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "District" : "الحي"}
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "City" : "المدينة"}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "Postal Code" : "الرمز البريدي"}
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                    <Input
                      label={locale === "en" ? "Additional No." : "الرقم الإضافي"}
                      value={formData.additionalNumber}
                      onChange={(e) => setFormData({ ...formData, additionalNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModals}
                  disabled={submitting}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={submitting}>
                  {t("common.update")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

