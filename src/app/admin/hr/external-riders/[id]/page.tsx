"use client";

import React, { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  FileText,
  Check,
  Copy,
  MapPin,
  Briefcase,
  Phone,
  CreditCard,
  Globe,
  Building,
  User,
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { getEmployee } from "@/lib/workforce/api";
import {
  getExternalRider,
  updateExternalRider,
  getOperatingCities,
  getOperationalWorkTypes,
  type ExternalRider,
  type OperatingCityCatalogItem,
  type OperationalWorkTypeCatalogItem,
} from "@/lib/workforce/external-riders-api";
import {
  ExternalRiderStatusBadge,
  getExternalRiderStatusInfo,
} from "@/components/hr/ExternalRiderStatusBadge";
import { EmployeeDocumentsInsurance } from "@/components/employees/EmployeeDocumentsInsurance";
import { StaffDocumentChecklistPanel } from "@/components/documents/StaffDocumentChecklistPanel";
import { getNationalityOptions } from "@/lib/constants/nationalities";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";

export type RiderProfileData = ExternalRider & {
  engagementType?: string;
  isEmployee?: boolean;
};

export default function ExternalRiderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;

  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  const [rider, setRider] = useState<RiderProfileData | null>(null);
  const [cities, setCities] = useState<OperatingCityCatalogItem[]>([]);
  const [workTypes, setWorkTypes] = useState<OperationalWorkTypeCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tabs: "overview" | "documents"
  const [activeTab, setActiveTab] = useState<"overview" | "documents">("overview");
  const [activeModalTab, setActiveModalTab] = useState<"docs" | "insurance" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("tab=documents")) {
      setActiveTab("documents");
    }
  }, []);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit modal
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    operationalWorkTypeId?: string;
  }>({});

  const canUpdate = can("employees.update");

  const loadRiderData = async () => {
    setLoading(true);
    setError("");

    try {
      const [citiesData, workTypesData] = await Promise.all([
        getOperatingCities().catch(() => []),
        getOperationalWorkTypes().catch(() => []),
      ]);
      setCities(citiesData);
      setWorkTypes(workTypesData);

      let riderData: RiderProfileData;
      try {
        const ext = await getExternalRider(employeeId);
        riderData = {
          ...ext,
          engagementType: "OutsideRider",
        };
      } catch {
        // Fallback to getEmployee (for sponsored riders)
        const empDetails = await getEmployee(employeeId);
        const emp = empDetails.employee;
        riderData = {
          employeeId: emp.id,
          riderProfileId: empDetails.rider?.id || (emp as any).riderProfileId || emp.id,
          iqamaNo: emp.iqamaNo || "",
          fullNameAr: emp.fullNameAr,
          nationality: emp.nationality,
          iban: emp.iban,
          address: emp.address,
          primaryPhone: emp.primaryPhone || "",
          operatingCityId: emp.operatingCityId || undefined,
          operationalWorkTypeId: emp.operationalWorkTypeId || undefined,
          status: emp.status,
          rowVersion: (emp as any).rowVersion || "",
          engagementType: emp.engagementType || "SponsoredInternal",
          isEmployee: emp.isEmployee,
        };
      }

      setRider(riderData);
    } catch (err: any) {
      const msg =
        err?.status === 404
          ? isEn
            ? "Rider profile not found."
            : "لم يتم العثور على ملف المندوب."
          : isEn
          ? "Failed to load rider profile."
          : "تعذر تحميل ملف المندوب.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadRiderData();
    }
  }, [employeeId]);

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

  const workTypeOptions = useMemo<SelectOption[]>(() => {
    return workTypes
      .filter((w) => w.status === "Active" || w.id === formData.operationalWorkTypeId)
      .map((w) => ({
        value: w.id,
        label: isEn ? (w.nameEn || w.nameAr || w.code) : (w.nameAr || w.nameEn || w.code),
        sublabel: w.code,
      }));
  }, [workTypes, isEn, formData.operationalWorkTypeId]);

  const cityName = useMemo(() => {
    if (!rider?.operatingCityId) return isEn ? "Not specified" : "غير محددة";
    const c = cityMap.get(rider.operatingCityId);
    if (!c) return rider.operatingCityId;
    return isEn ? c.nameEn || c.nameAr || c.code : c.nameAr || c.nameEn || c.code;
  }, [rider?.operatingCityId, cityMap, isEn]);

  const workTypeName = useMemo(() => {
    if (!rider?.operationalWorkTypeId) return isEn ? "Not specified" : "غير محدد";
    const w = workTypeMap.get(rider.operationalWorkTypeId);
    if (!w) return rider.operationalWorkTypeId;
    return isEn ? w.nameEn || w.nameAr || w.code : w.nameAr || w.nameEn || w.code;
  }, [rider?.operationalWorkTypeId, workTypeMap, isEn]);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success(
      isEn ? "Copied" : "تم النسخ",
      isEn ? "Copied to clipboard" : "تم نسخ النص إلى الحافظة"
    );
  };

  const handleOpenEdit = () => {
    if (!rider) return;
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
    setIsEditing(true);
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rider) return;

    const errors: {
      iqamaNo?: string;
      fullNameAr?: string;
      primaryPhone?: string;
      operationalWorkTypeId?: string;
    } = {};
    const cleanIqama = formData.iqamaNo.trim();
    if (!cleanIqama) {
      errors.iqamaNo = isEn ? "Iqama / National ID is required." : "رقم الإقامة مطلوب.";
    } else if (!/^\d{10}$/.test(cleanIqama)) {
      errors.iqamaNo = isEn
        ? "Iqama must contain 10 digits."
        : "يجب أن يتكون رقم الإقامة من 10 أرقام.";
    }

    const cleanName = formData.fullNameAr.trim();
    if (!cleanName) {
      errors.fullNameAr = isEn ? "Arabic name is required." : "الاسم بالعربية مطلوب.";
    } else if (cleanName.length > 200) {
      errors.fullNameAr = isEn ? "Arabic name cannot exceed 200 characters." : "الاسم بالعربية لا يمكن أن يتجاوز 200 حرف.";
    }

    const cleanPhone = formData.primaryPhone.trim();
    if (!cleanPhone) {
      errors.primaryPhone = isEn ? "Primary phone is required." : "رقم الجوال الرئيسي مطلوب.";
    } else if (cleanPhone.length > 32) {
      errors.primaryPhone = isEn ? "Primary phone cannot exceed 32 characters." : "رقم الجوال لا يمكن أن يتجاوز 32 حرفاً.";
    }

    const cleanWorkTypeId = formData.operationalWorkTypeId.trim();
    if (!cleanWorkTypeId) {
      errors.operationalWorkTypeId = isEn ? "Operational work type is required." : "الدور التشغيلي (نوع العمل) مطلوب.";
    } else if (workTypes.length > 0 && !workTypes.some((w) => w.id === cleanWorkTypeId)) {
      errors.operationalWorkTypeId = isEn ? "Selected work type does not exist in catalog." : "الدور التشغيلي المحدد غير موجود في السجل.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateExternalRider(rider.employeeId, {
        iqamaNo: cleanIqama,
        fullNameAr: cleanName,
        nationality: formData.nationality.trim() || null,
        iban: formData.iban.trim() || null,
        primaryPhone: cleanPhone,
        operationalWorkTypeId: cleanWorkTypeId,
        address: getAddressPayload(),
        rowVersion: rider.rowVersion,
      });

      // Refresh the rider after a successful update because the response contains a new rowVersion
      setRider((prev) => (prev ? { ...prev, ...updated } : updated));
      setIsEditing(false);
      toast.success(
        isEn ? "Profile Updated" : "تم التحديث",
        isEn ? "External rider details saved successfully." : "تم حفظ بيانات المندوب الخارجي بنجاح."
      );
      loadRiderData();
    } catch (err: any) {
      let message = isEn ? "Failed to save changes." : "تعذر حفظ التعديلات.";
      if (err?.status === 409) {
        message = isEn
          ? "Conflict detected (the record was modified elsewhere or outdated). Latest data reloaded, please retry."
          : "حدث تعارض في البيانات (تم تعديل السجل في مكان آخر). تم إعادة تحميل أحدث البيانات، يرجى المحاولة مجدداً.";
        // Handle 409 Conflict by reloading the rider and asking the user to retry
        loadRiderData();
      } else if (err?.message) {
        message = err.message;
      }
      toast.error(isEn ? "Update Failed" : "فشل التحديث", message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-[#1167c9] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[var(--muted)]">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !rider) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/hr/external-riders"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#1167c9] hover:underline"
        >
          <BackIcon size={16} />
          {isEn ? "Back to External Riders" : "العودة إلى المناديب الخارجيين"}
        </Link>
        <Card className="p-8 text-center space-y-4">
          <div className="size-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">
            {error || (isEn ? "Rider Not Found" : "المندوب غير موجود")}
          </h2>
          <Button onClick={loadRiderData} variant="secondary">
            {t("common.refresh")}
          </Button>
        </Card>
      </div>
    );
  }

  const statusInfo = getExternalRiderStatusInfo(rider.status, locale);
  const hasAddress =
    rider.address &&
    (rider.address.buildingNumber ||
      rider.address.street ||
      rider.address.district ||
      rider.address.city ||
      rider.address.postalCode);

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href =
                  rider.status === "Terminated"
                    ? "/admin/hr/terminated-employees"
                    : "/admin/hr/external-riders";
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#1167c9] hover:underline mb-2 transition-colors cursor-pointer"
          >
            <BackIcon size={15} />
            {isEn ? "Back" : "العودة"}
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {rider.fullNameAr}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-bold text-[#1167c9] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <User size={12} />
              {rider.engagementType === "SponsoredInternal"
                ? isEn
                  ? "Sponsored Rider"
                  : "مندوب مكفول"
                : isEn
                ? "External Rider"
                : "مندوب خارجي"}
            </span>
            <ExternalRiderStatusBadge status={rider.status} locale={locale} />
          </div>
          <p className="mt-1 text-xs text-[var(--muted)] font-mono">
            ID: {rider.employeeId}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canUpdate && (
            <Button onClick={handleOpenEdit} variant="secondary">
              <Pencil size={15} />
              {isEn ? "Edit Details" : "تعديل البيانات"}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setActiveModalTab("docs")}>
            <FileText size={15} />
            {isEn ? "Documents" : "الوثائق"}
          </Button>
          <Button variant="secondary" onClick={() => setActiveModalTab("insurance")}>
            <ShieldCheck size={15} />
            {isEn ? "Medical Insurance" : "التأمين الطبي"}
          </Button>
          <Link href={`/admin/hr/documents?riderProfileId=${rider.riderProfileId || rider.employeeId}`}>
            <Button variant="secondary" className="text-[#1167c9] border-blue-200 bg-blue-50/50 hover:bg-blue-100">
              <ExternalLink size={15} />
              {isEn ? "Full Documents Hub" : "مركز الوثائق الكامل"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Context Banner */}
      <div
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 transition-all ${
          rider.status === "Active"
            ? "bg-emerald-500/10 border-emerald-300 text-emerald-950 dark:text-emerald-200"
            : rider.status === "Terminated"
            ? "bg-rose-500/10 border-rose-300 text-rose-950 dark:text-rose-200"
            : rider.status === "Archived"
            ? "bg-slate-500/10 border-slate-300 text-slate-900 dark:text-slate-200"
            : "bg-blue-500/10 border-blue-300 text-blue-950 dark:text-blue-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
              rider.status === "Active"
                ? "bg-emerald-500 text-white"
                : rider.status === "Terminated"
                ? "bg-rose-600 text-white"
                : "bg-slate-600 text-white"
            }`}
          >
            {rider.status === "Active" ? (
              <CheckCircle2 size={20} />
            ) : rider.status === "Terminated" ? (
              <AlertTriangle size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                {isEn ? "Current Profile Status" : "حالة السجل الحالية"}
              </span>
              <span className="font-black text-sm underline underline-offset-4">
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90 font-medium">
              {statusInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[var(--border)] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-black transition-colors cursor-pointer ${
            activeTab === "overview"
              ? "border-[#1167c9] text-[#1167c9]"
              : "border-transparent text-[var(--muted)] hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <User size={16} />
          {isEn ? "Overview & Details" : "البيانات ونظرة عامة"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-black transition-colors cursor-pointer ${
            activeTab === "documents"
              ? "border-[#1167c9] text-[#1167c9]"
              : "border-transparent text-[var(--muted)] hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText size={16} />
          {isEn ? "Documents & Checklist" : "الوثائق والمستندات"}
        </button>
      </div>

      {/* Tab 1: Overview & Details */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Identity & Contact */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <div className="size-8 rounded-lg bg-blue-50 text-[#1167c9] flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isEn ? "Identity & Contact" : "بيانات الهوية والتواصل"}
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  {isEn ? "Personal identification and contact details" : "البيانات الشخصية ومعلومات الاتصال"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-1">
                <span className="text-[11px] font-bold text-[var(--muted)]">
                  {isEn ? "Iqama / National ID" : "رقم الإقامة / الهوية"}
                </span>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-sm font-black text-slate-800 dark:text-slate-200">
                    {rider.iqamaNo}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(rider.iqamaNo, "iqama")}
                    className="text-[var(--muted)] hover:text-[#1167c9] p-1 rounded transition-colors"
                    title={isEn ? "Copy Iqama" : "نسخ رقم الإقامة"}
                  >
                    {copiedKey === "iqama" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-1">
                <span className="text-[11px] font-bold text-[var(--muted)]">
                  {isEn ? "Primary Phone" : "رقم الجوال الرئيسي"}
                </span>
                <div className="flex items-center justify-between gap-1">
                  <a
                    href={`tel:${rider.primaryPhone}`}
                    className="font-mono text-sm font-black text-[#1167c9] hover:underline"
                    dir="ltr"
                  >
                    {rider.primaryPhone || "—"}
                  </a>
                  {rider.primaryPhone && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(rider.primaryPhone || "", "phone")}
                      className="text-[var(--muted)] hover:text-[#1167c9] p-1 rounded transition-colors"
                      title={isEn ? "Copy Phone" : "نسخ الجوال"}
                    >
                      {copiedKey === "phone" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-1">
                <span className="text-[11px] font-bold text-[var(--muted)]">
                  {isEn ? "Nationality" : "الجنسية"}
                </span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Globe size={14} className="text-slate-400" />
                  <span>{rider.nationality || "—"}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-1">
                <span className="text-[11px] font-bold text-[var(--muted)]">
                  {isEn ? "Employee ID" : "معرف الموظف بالنظام"}
                </span>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    {rider.employeeId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(rider.employeeId, "empId")}
                    className="text-[var(--muted)] hover:text-[#1167c9] p-1 rounded transition-colors"
                    title={isEn ? "Copy ID" : "نسخ المعرف"}
                  >
                    {copiedKey === "empId" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Operations & Deployment */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Briefcase size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isEn ? "Operations & Assignment" : "التشغيل والتكليف الميداني"}
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  {isEn ? "Operating city and role in the fleet" : "المدينة التشغيلية والدور في الأسطول"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-1">
                <span className="text-[11px] font-bold text-[var(--muted)]">
                  {isEn ? "Operating City" : "المدينة التشغيلية"}
                </span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <MapPin size={14} className="text-[#1167c9]" />
                  <span>{cityName}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-1">
                <span className="text-[11px] font-bold text-[var(--muted)]">
                  {isEn ? "Operational Work Type" : "الدور التشغيلي (نوع العمل)"}
                </span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Briefcase size={14} className="text-emerald-600" />
                  <span>{workTypeName}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-[var(--muted)]">
                  {isEn ? "Engagement Type" : "نوع العلاقة التعاقدية"}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {rider.engagementType === "SponsoredInternal"
                      ? isEn
                        ? "Company Sponsored Rider"
                        : "مندوب على كفالة الشركة"
                      : isEn
                      ? "Outside Rider (Contractor / Not Company Sponsored)"
                      : "مندوب خارجي (غير خاضع لكفالة الشركة)"}
                  </span>
                  <span className="rounded bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                    {rider.engagementType || "OutsideRider"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3: Financial & Banking */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <div className="size-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isEn ? "Banking & Payouts" : "البيانات المالية والتحويلات"}
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  {isEn ? "IBAN account for operational payouts" : "الحساب البنكي لتحويل مستحقات المندوب"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-2">
              <span className="text-[11px] font-bold text-[var(--muted)]">
                {isEn ? "IBAN Number" : "رقم الآيبان (IBAN)"}
              </span>
              {rider.iban ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-black text-[#1167c9] tracking-wider" dir="ltr">
                    {rider.iban}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(rider.iban || "", "iban")}
                    className="text-[var(--muted)] hover:text-[#1167c9] p-1.5 rounded transition-colors"
                    title={isEn ? "Copy IBAN" : "نسخ الآيبان"}
                  >
                    {copiedKey === "iban" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] italic">
                  {isEn ? "No IBAN recorded for this rider." : "لم يتم تسجيل رقم الآيبان لهذا المندوب."}
                </p>
              )}
            </div>
          </Card>

          {/* Card 4: National Address */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <div className="size-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Building size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isEn ? "National Address" : "العنوان الوطني"}
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  {isEn ? "Registered residential address in KSA" : "العنوان المسجل داخل المملكة"}
                </p>
              </div>
            </div>

            {hasAddress ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {rider.address?.buildingNumber && (
                  <div className="rounded-lg border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-2.5">
                    <span className="text-[10px] text-[var(--muted)] block">
                      {isEn ? "Building #" : "رقم المبنى"}
                    </span>
                    <span className="font-bold">{rider.address.buildingNumber}</span>
                  </div>
                )}
                {rider.address?.street && (
                  <div className="rounded-lg border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-2.5">
                    <span className="text-[10px] text-[var(--muted)] block">
                      {isEn ? "Street" : "اسم الشارع"}
                    </span>
                    <span className="font-bold">{rider.address.street}</span>
                  </div>
                )}
                {rider.address?.district && (
                  <div className="rounded-lg border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-2.5">
                    <span className="text-[10px] text-[var(--muted)] block">
                      {isEn ? "District" : "الحي"}
                    </span>
                    <span className="font-bold">{rider.address.district}</span>
                  </div>
                )}
                {rider.address?.city && (
                  <div className="rounded-lg border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-2.5">
                    <span className="text-[10px] text-[var(--muted)] block">
                      {isEn ? "City" : "المدينة"}
                    </span>
                    <span className="font-bold">{rider.address.city}</span>
                  </div>
                )}
                {rider.address?.postalCode && (
                  <div className="rounded-lg border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-2.5">
                    <span className="text-[10px] text-[var(--muted)] block">
                      {isEn ? "Postal Code" : "الرمز البريدي"}
                    </span>
                    <span className="font-mono font-bold">{rider.address.postalCode}</span>
                  </div>
                )}
                {rider.address?.additionalNumber && (
                  <div className="rounded-lg border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-2.5">
                    <span className="text-[10px] text-[var(--muted)] block">
                      {isEn ? "Additional Number" : "الرقم الإضافي"}
                    </span>
                    <span className="font-mono font-bold">{rider.address.additionalNumber}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--muted)]">
                {isEn ? "No national address recorded yet." : "لم يتم تسجيل العنوان الوطني بعد."}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Documents & Checklist */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <EmployeeDocumentsInsurance
            employeeId={rider.employeeId}
            riderProfileId={rider.riderProfileId || rider.employeeId}
            activeTab="all"
          />
          <StaffDocumentChecklistPanel
            employeeId={rider.employeeId}
            riderProfileId={rider.riderProfileId || rider.employeeId}
            staffName={rider.fullNameAr}
          />
        </div>
      )}

      {/* Edit External Rider Modal */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-lg font-black">
                  {isEn ? "Edit External Rider" : "تعديل بيانات المندوب الخارجي"}
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {rider.fullNameAr} ({rider.iqamaNo})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-bold text-[var(--muted)] hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <Input
                    label={isEn ? "Iqama / National ID *" : "رقم الإقامة *"}
                    value={formData.iqamaNo}
                    onChange={(e) => setFormData({ ...formData, iqamaNo: e.target.value })}
                    maxLength={10}
                    required
                  />
                  {formErrors.iqamaNo && (
                    <p className="mt-1 text-xs text-red-600 font-bold">{formErrors.iqamaNo}</p>
                  )}
                </div>

                <div>
                  <Input
                    label={isEn ? "Arabic Full Name *" : "الاسم الكامل بالعربية *"}
                    value={formData.fullNameAr}
                    onChange={(e) => setFormData({ ...formData, fullNameAr: e.target.value })}
                    maxLength={200}
                    required
                  />
                  {formErrors.fullNameAr && (
                    <p className="mt-1 text-xs text-red-600 font-bold">{formErrors.fullNameAr}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? "Nationality" : "الجنسية"}
                  </label>
                  <SearchableSelect
                    value={formData.nationality}
                    onChange={(val) => setFormData({ ...formData, nationality: val })}
                    options={getNationalityOptions(locale, formData.nationality)}
                    placeholder={isEn ? "Select nationality..." : "اختر الجنسية..."}
                    searchPlaceholder={isEn ? "Search nationalities..." : "ابحث عن جنسية..."}
                  />
                </div>

                <div>
                  <Input
                    label={isEn ? "Primary Phone *" : "رقم الجوال الرئيسي *"}
                    value={formData.primaryPhone}
                    onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                    placeholder="0500000000"
                    maxLength={32}
                    required
                  />
                  {formErrors.primaryPhone && (
                    <p className="mt-1 text-xs text-red-600 font-bold">{formErrors.primaryPhone}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? "Operational Role (Work Type) *" : "الدور التشغيلي (نوع العمل) *"}
                  </label>
                  <SearchableSelect
                    value={formData.operationalWorkTypeId}
                    onChange={(val) => setFormData({ ...formData, operationalWorkTypeId: val })}
                    options={workTypeOptions}
                    placeholder={isEn ? "Select operational role..." : "اختر الدور التشغيلي..."}
                    searchPlaceholder={isEn ? "Search roles..." : "ابحث عن دور تشغيلي..."}
                    required
                  />
                  {formErrors.operationalWorkTypeId && (
                    <p className="mt-1 text-xs text-red-600 font-bold">{formErrors.operationalWorkTypeId}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label={isEn ? "IBAN" : "رقم الآيبان"}
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    placeholder="SA0380000000000000000000"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-3 space-y-3">
                <p className="text-xs font-bold text-[#1167c9]">
                  {isEn ? "National Address Details" : "تفاصيل العنوان الوطني"}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Input
                    label={isEn ? "Building #" : "رقم المبنى"}
                    value={formData.buildingNumber}
                    onChange={(e) => setFormData({ ...formData, buildingNumber: e.target.value })}
                  />
                  <Input
                    label={isEn ? "Street" : "اسم الشارع"}
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                  <Input
                    label={isEn ? "District" : "الحي"}
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                  <Input
                    label={isEn ? "City" : "المدينة"}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                  <Input
                    label={isEn ? "Postal Code" : "الرمز البريدي"}
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  />
                  <Input
                    label={isEn ? "Additional #" : "الرقم الإضافي"}
                    value={formData.additionalNumber}
                    onChange={(e) => setFormData({ ...formData, additionalNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("common.loading") : t("common.save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents & Medical Insurance Modal */}
      {activeModalTab && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setActiveModalTab(null)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] w-full max-w-5xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between border-b border-[var(--border)] pb-3 gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("docs")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    activeModalTab === "docs"
                      ? "bg-[#1167c9] text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <FileText size={18} />
                  {isEn ? "Documents" : "الوثائق"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("insurance")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    activeModalTab === "insurance"
                      ? "bg-[#1167c9] text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <ShieldCheck size={18} />
                  {isEn ? "Medical Insurance" : "التأمين الطبي"}
                </button>
              </div>
              <button
                onClick={() => setActiveModalTab(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={isEn ? "Close" : "إغلاق"}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1">
              <EmployeeDocumentsInsurance
                employeeId={rider.employeeId}
                riderProfileId={rider.riderProfileId || rider.employeeId}
                activeTab={activeModalTab}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
