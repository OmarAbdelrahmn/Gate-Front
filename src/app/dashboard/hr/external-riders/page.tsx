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
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { translate } from "../../../../lib/i18n";
import { getNationalityOptions } from "../../../../lib/constants/nationalities";
import {
  listExternalRiders,
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

export default function ExternalRidersPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [riders, setRiders] = useState<ExternalRider[]>([]);
  const [cities, setCities] = useState<OperatingCityCatalogItem[]>([]);
  const [workTypes, setWorkTypes] = useState<OperationalWorkTypeCatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const filteredRiders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return riders;
    return riders.filter(
      (r) =>
        r.fullNameAr?.toLowerCase().includes(query) ||
        r.iqamaNo?.includes(query) ||
        r.primaryPhone?.includes(query) ||
        r.nationality?.toLowerCase().includes(query) ||
        r.iban?.toLowerCase().includes(query) ||
        r.employeeId?.toLowerCase().includes(query) ||
        r.riderProfileId?.toLowerCase().includes(query)
    );
  }, [riders, search]);

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
    const errors: { iqamaNo?: string; fullNameAr?: string } = {};

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
        nationality: formData.nationality.trim(),
        iban: formData.iban.trim(),
        address: getAddressPayload(),
        rowVersion: editingRider.rowVersion,
      });
      toast.success(
        locale === "en" ? "External Rider Updated" : "تم تحديث المندوب الخارجي",
        locale === "en"
          ? "External rider details updated successfully."
          : "تم تحديث بيانات المندوب الخارجي بنجاح."
      );
      setRiders((prev) =>
        prev.map((r) => (r.employeeId === updated.employeeId ? { ...r, ...updated } : r))
      );
      handleCloseModals();
    } catch (err: any) {
      let message =
        locale === "en"
          ? "Failed to update external rider."
          : "تعذر تحديث بيانات المندوب الخارجي.";
      if (err?.status === 409) {
        message =
          locale === "en"
            ? "Duplicate Iqama number or outdated record version. Please refresh and try again."
            : "رقم الإقامة مستخدم أو أن نسق البيانات قديم. يرجى التحديث والمحاولة مجدداً.";
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
        {canCreate && (
          <Button onClick={handleOpenCreate}>
            <Plus size={17} />
            {locale === "en" ? "Add External Rider" : "إضافة مندوب خارجي"}
          </Button>
        )}
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
            <p className="mt-1 text-2xl font-black">{riders.length}</p>
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
          <div className="relative w-full max-w-xl">
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
        </div>

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
                    {locale === "en" ? "External Rider Name" : "اسم المندوب الخارجي"}
                  </th>
                  <th className="px-5 py-4">
                    {locale === "en" ? "Iqama / Phone" : "رقم الإقامة / الهاتف"}
                  </th>
                  <th className="px-5 py-4">
                    {locale === "en" ? "City & Role" : "المدينة والدور التشغيلي"}
                  </th>
                  <th className="px-5 py-4">
                    {locale === "en" ? "Status" : "الحالة"}
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
                        <div className="font-black text-slate-900">
                          {rider.fullNameAr}
                        </div>
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
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-700">
                          {rider.status === "Active"
                            ? locale === "en"
                              ? "Active"
                              : "نشط"
                            : rider.status}
                        </span>
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
                          <Link href={`/dashboard/employees/${rider.employeeId}`}>
                            <Button variant="secondary" className="h-8 px-2.5 text-xs">
                              <Eye size={14} />
                              {locale === "en" ? "Profile" : "الملف"}
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

