"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building,
  Edit3,
  Plus,
  Search,
  Archive,
  Phone,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  X,
  Layers,
} from "lucide-react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { authFetch } from "../../../lib/auth/api";
import {
  createHousing,
  listHousing,
  updateHousing,
  archiveHousing,
  type Housing,
  type HousingStatus,
  type CreateHousingPayload,
  type UpdateHousingPayload,
} from "../../../lib/housing/api";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { SearchableSelect, type SelectOption } from "../../../components/ui/SearchableSelect";
import { toast } from "../../../components/ui/Toast";
import { translate } from "../../../lib/i18n";

type City = {
  id: string;
  globalCityId?: string;
  nameAr?: string;
  nameEn?: string;
  globalCityAr?: string;
  globalCityEn?: string;
  code?: string;
};

interface HousingFormState {
  code: string;
  nameAr: string;
  nameEn: string;
  cityId: string;
  totalCapacity: string;
  contactPhone: string;
  buildingNumber: string;
  street: string;
  district: string;
  addressCity: string;
  postalCode: string;
  additionalNumber: string;
  latitude: string;
  longitude: string;
  openedDate: string;
  closedDate: string;
  status: HousingStatus | string;
  statusReason: string;
  notes: string;
}

const initialFormState: HousingFormState = {
  code: "",
  nameAr: "",
  nameEn: "",
  cityId: "",
  totalCapacity: "50",
  contactPhone: "",
  buildingNumber: "",
  street: "",
  district: "",
  addressCity: "",
  postalCode: "",
  additionalNumber: "",
  latitude: "",
  longitude: "",
  openedDate: new Date().toISOString().split("T")[0],
  closedDate: "",
  status: "Active",
  statusReason: "",
  notes: "",
};

export default function HousingPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [items, setItems] = useState<Housing[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("");

  const [editing, setEditing] = useState<Housing | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<HousingFormState>(initialFormState);
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);

  // Archive modal state
  const [archiveTarget, setArchiveTarget] = useState<Housing | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  const [loading, setLoading] = useState(true);
  const manage = can("housing.manage");

  async function loadData() {
    setLoading(true);
    try {
      const [h, c] = await Promise.all([
        listHousing(),
        authFetch<City[]>("/api/hr-catalogs/operating-cities"),
      ]);
      setItems(h || []);
      setCities(c || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (isEn ? "Failed to load housing data" : "تعذر تحميل بيانات السكن");
      toast.error(isEn ? "Error" : "خطأ", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [locale]);

  const getCityName = (c?: City | null) => {
    if (!c) return "";
    return isEn
      ? c.globalCityEn || c.nameEn || c.globalCityAr || c.nameAr || ""
      : c.globalCityAr || c.nameAr || c.globalCityEn || c.nameEn || "";
  };

  // Options for city SearchableSelect
  const cityOptions: SelectOption[] = useMemo(
    () =>
      cities.map((c) => ({
        value: c.globalCityId || c.id,
        label: getCityName(c),
        sublabel: c.code,
      })),
    [cities, isEn]
  );

  const cityFilterOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: isEn ? "All Cities" : "جميع المدن" },
      ...cityOptions,
    ],
    [cityOptions, isEn]
  );

  function handleOpenCreate() {
    setEditing(null);
    setFormData(initialFormState);
    setFormError("");
    setOpenForm(true);
  }

  function handleOpenEdit(item: Housing) {
    setEditing(item);
    setFormData({
      code: item.code || "",
      nameAr: item.nameAr || "",
      nameEn: item.nameEn || "",
      cityId: item.cityId || "",
      totalCapacity: String(item.totalCapacity ?? "0"),
      contactPhone: item.contactPhone || "",
      buildingNumber: item.address?.buildingNumber || "",
      street: item.address?.street || "",
      district: item.address?.district || "",
      addressCity: item.address?.city || "",
      postalCode: item.address?.postalCode || "",
      additionalNumber: item.address?.additionalNumber || "",
      latitude: item.latitude !== null && item.latitude !== undefined ? String(item.latitude) : "",
      longitude: item.longitude !== null && item.longitude !== undefined ? String(item.longitude) : "",
      openedDate: item.openedDate ? item.openedDate.split("T")[0] : "",
      closedDate: item.closedDate ? item.closedDate.split("T")[0] : "",
      status: item.status || "Active",
      statusReason: item.statusReason || "",
      notes: item.notes || "",
    });
    setFormError("");
    setOpenForm(true);
  }

  function validateForm(): string | null {
    if (!formData.code.trim()) {
      return isEn ? "Code is required" : "رمز السكن مطلوب";
    }
    if (!formData.nameAr.trim()) {
      return isEn ? "Arabic Name is required" : "الاسم بالعربية مطلوب";
    }
    if (!formData.nameEn.trim()) {
      return isEn ? "English Name is required" : "الاسم بالإنجليزية مطلوب";
    }
    if (!formData.cityId) {
      return isEn ? "Please select a city" : "يرجى اختيار مدينة التشغيل";
    }

    const cap = Number(formData.totalCapacity);
    if (isNaN(cap) || cap <= 0) {
      return isEn ? "Total capacity must be greater than zero" : "السعة الاستيعابية يجب أن تكون أكبر من صفر";
    }

    if (formData.latitude.trim() !== "") {
      const lat = Number(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return isEn ? "Latitude must be between -90 and 90" : "خط العرض يجب أن يكون بين -90 و 90";
      }
    }

    if (formData.longitude.trim() !== "") {
      const lng = Number(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return isEn ? "Longitude must be between -180 and 180" : "خط الطول يجب أن يكون بين -180 و 180";
      }
    }

    if (formData.openedDate && formData.closedDate) {
      if (new Date(formData.closedDate) < new Date(formData.openedDate)) {
        return isEn ? "Closed date cannot be before opened date" : "تاريخ الإغلاق لا يمكن أن يكون قبل تاريخ الافتتاح";
      }
    }

    return null;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    setFormBusy(true);

    try {
      const selectedCity = cities.find((c) => (c.globalCityId || c.id) === formData.cityId);
      const hasAnyAddressField = Boolean(
        formData.buildingNumber.trim() ||
          formData.street.trim() ||
          formData.district.trim() ||
          formData.addressCity.trim() ||
          formData.postalCode.trim() ||
          formData.additionalNumber.trim()
      );

      const addressObj = hasAnyAddressField
        ? {
            buildingNumber: formData.buildingNumber.trim() || null,
            street: formData.street.trim() || null,
            district: formData.district.trim() || null,
            city: formData.addressCity.trim() || getCityName(selectedCity) || null,
            postalCode: formData.postalCode.trim() || null,
            additionalNumber: formData.additionalNumber.trim() || null,
          }
        : null;

      const payload: CreateHousingPayload = {
        code: formData.code.trim(),
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        cityId: formData.cityId,
        address: addressObj,
        latitude: formData.latitude.trim() !== "" ? Number(formData.latitude) : null,
        longitude: formData.longitude.trim() !== "" ? Number(formData.longitude) : null,
        totalCapacity: Number(formData.totalCapacity),
        contactPhone: formData.contactPhone.trim() || null,
        openedDate: formData.openedDate || new Date().toISOString().split("T")[0],
        closedDate: formData.closedDate || null,
        status: formData.status as HousingStatus,
        statusReason: formData.statusReason.trim() || null,
        notes: formData.notes.trim() || null,
        rowVersion: editing?.rowVersion || null,
      };

      if (editing) {
        await updateHousing(editing.id, {
          ...payload,
          rowVersion: editing.rowVersion,
        } as UpdateHousingPayload);
        toast.success(isEn ? "Success" : "تم بنجاح", isEn ? "Housing record updated" : "تم تحديث بيانات السكن بنجاح");
      } else {
        await createHousing(payload);
        toast.success(isEn ? "Success" : "تم بنجاح", isEn ? "Housing record created" : "تم إضافة السكن بنجاح");
      }

      setOpenForm(false);
      setEditing(null);
      await loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (isEn ? "Failed to save housing" : "تعذر حفظ بيانات السكن");
      setFormError(msg);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleArchiveConfirm(e: FormEvent) {
    e.preventDefault();
    if (!archiveTarget) return;
    if (!archiveReason.trim()) {
      setArchiveError(isEn ? "Archive reason is required" : "سبب الأرشفة مطلوب");
      return;
    }

    setArchiveError("");
    setArchiveBusy(true);

    try {
      await archiveHousing(archiveTarget.id, archiveReason.trim(), archiveTarget.rowVersion);
      toast.success(
        isEn ? "Housing Archived" : "تمت أرشفة السكن",
        isEn ? "The housing unit has been successfully archived." : "تمت أرشفة وحدة السكن بنجاح."
      );
      setArchiveTarget(null);
      setArchiveReason("");
      await loadData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (isEn ? "Failed to archive housing" : "تعذر أرشفة السكن");
      setArchiveError(msg);
    } finally {
      setArchiveBusy(false);
    }
  }

  // Filtered list calculation
  const filteredItems = useMemo(() => {
    return items.filter((x) => {
      // Text search
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        x.code?.toLowerCase().includes(q) ||
        x.nameAr?.toLowerCase().includes(q) ||
        x.nameEn?.toLowerCase().includes(q) ||
        x.cityAr?.toLowerCase().includes(q) ||
        x.address?.district?.toLowerCase().includes(q) ||
        x.address?.street?.toLowerCase().includes(q);

      // Status filter
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "Active" && x.status === "Active") ||
        (statusFilter === "Inactive" && x.status === "Inactive") ||
        (statusFilter === "Archived" && (x.status === "Archived" || x.isDeleted));

      // City filter
      const matchesCity = !cityFilter || x.cityId === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [items, search, statusFilter, cityFilter]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalUnits = items.length;
    const activeUnits = items.filter((i) => i.status === "Active").length;
    const totalCap = items.reduce((acc, curr) => acc + (curr.totalCapacity || 0), 0);
    const totalResidents = items.reduce((acc, curr) => acc + (curr.currentResidents || 0), 0);
    const availableCap = items.reduce((acc, curr) => acc + (curr.availableCapacity || 0), 0);

    return { totalUnits, activeUnits, totalCap, totalResidents, availableCap };
  }, [items]);

  const inputCls =
    "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition-all focus:border-[#1167c9] focus:ring-2 focus:ring-blue-100 outline-none";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">{t("nav.housing")}</p>
          <h1 className="text-3xl font-black">{t("housing.title")}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {isEn
              ? "Manage residential units, capacity allocations, residents, and housing supervisors."
              : "إدارة الوحدات السكنية والسعة الاستيعابية والسكان والمشرفين المعينين."}
          </p>
        </div>
        {manage && (
          <Button onClick={handleOpenCreate} className="shadow-lg shadow-blue-500/10">
            <Plus size={18} />
            {t("housing.newHousing")}
          </Button>
        )}
      </header>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-[#1167c9]">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
            <Building size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              {isEn ? "Total Housing Units" : "إجمالي وحدات السكن"}
            </p>
            <p className="text-2xl font-black mt-0.5">{stats.totalUnits}</p>
            <p className="text-[11px] font-semibold text-emerald-600">
              {stats.activeUnits} {isEn ? "Active" : "نشط"}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-50 text-purple-600">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              {isEn ? "Total Capacity" : "الإجمالي الاستيعابي"}
            </p>
            <p className="text-2xl font-black mt-0.5">{stats.totalCap}</p>
            <p className="text-[11px] text-[var(--muted)] font-medium">
              {isEn ? "beds registered" : "سرير مسجل في النظام"}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              {isEn ? "Current Residents" : "السكان الحاليون"}
            </p>
            <p className="text-2xl font-black mt-0.5">{stats.totalResidents}</p>
            <p className="text-[11px] text-[var(--muted)] font-medium">
              {stats.totalCap ? Math.round((stats.totalResidents / stats.totalCap) * 100) : 0}% {isEn ? "occupancy" : "نسبة الإشغال"}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">
              {isEn ? "Available Beds" : "الأسرّة الشاغرة"}
            </p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.availableCap}</p>
            <p className="text-[11px] font-semibold text-emerald-600">
              {isEn ? "ready for assignment" : "جاهزة للتسكين"}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b space-y-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search
                className={`absolute top-3 text-[var(--muted)] ${isEn ? "left-3" : "right-3"}`}
                size={18}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isEn ? "Search by code, name, city, district..." : "ابحث بالرمز، الاسم، المدينة، الحي..."}
                className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium ${
                  isEn ? "pl-10 pr-3" : "pr-10 pl-3"
                } focus:border-[#1167c9] outline-none`}
              />
            </div>

            {/* City Filter SearchableSelect */}
            <div className="w-64">
              <SearchableSelect
                value={cityFilter}
                onChange={setCityFilter}
                options={cityFilterOptions}
                placeholder={isEn ? "All Cities" : "جميع المدن"}
                searchPlaceholder={isEn ? "Filter city..." : "تصفية حسب المدينة..."}
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 rounded-xl bg-[var(--surface)] border p-1">
              {[
                { id: "ALL", label: isEn ? "All" : "الكل" },
                { id: "Active", label: isEn ? "Active" : "نشط" },
                { id: "Inactive", label: isEn ? "Inactive" : "غير نشط" },
                { id: "Archived", label: isEn ? "Archived" : "مؤرشف" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    statusFilter === st.id
                      ? "bg-[#1167c9] text-white shadow-sm"
                      : "text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Housing Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)] font-medium">
            {isEn ? "Loading housing records..." : "جاري تحميل سجلات السكن..."}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <Building className="mx-auto mb-3 opacity-30" size={48} />
            <p className="font-bold text-base">
              {isEn ? "No housing units found" : "لا توجد وحدات سكنية مطابقة"}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {isEn ? "Try adjusting your search criteria or add a new unit." : "جرب تغيير كلمات البحث أو إضافة سكن جديد."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((x) => {
              const occupancyPct = x.totalCapacity ? Math.min(100, Math.round((x.currentResidents / x.totalCapacity) * 100)) : 0;
              const isArchived = x.status === "Archived" || x.isDeleted;

              return (
                <article
                  key={x.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all hover:shadow-md ${
                    isArchived ? "bg-slate-50/70 border-slate-200 opacity-80" : "bg-[var(--surface)] border-[var(--border)]"
                  }`}
                >
                  <div>
                    {/* Header: Title & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/dashboard/housing/${x.id}`}
                          className="flex items-center gap-2 font-black text-base text-[#1167c9] hover:underline"
                        >
                          <Building size={19} className="shrink-0 text-[#1167c9]" />
                          <span className="truncate">{isEn ? x.nameEn || x.nameAr : x.nameAr}</span>
                        </Link>
                        <p className="mt-1 text-xs font-mono font-semibold text-[var(--muted)]">
                          {x.code} · {x.cityAr || (isEn ? "City" : "المدينة")}
                        </p>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                          isArchived
                            ? "bg-slate-200 text-slate-700"
                            : x.status === "Inactive"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isArchived ? (
                          <>
                            <Archive size={12} />
                            {isEn ? "Archived" : "مؤرشف"}
                          </>
                        ) : x.status === "Inactive" ? (
                          <>
                            <XCircle size={12} />
                            {isEn ? "Inactive" : "غير نشط"}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} />
                            {isEn ? "Active" : "نشط"}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Address & Phone Details */}
                    <div className="mt-4 space-y-1 text-xs text-[var(--muted)] font-medium">
                      {x.address && (x.address.district || x.address.street || x.address.buildingNumber) ? (
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin size={14} className="shrink-0 text-slate-400" />
                          <span className="truncate">
                            {[
                              x.address.buildingNumber && `${isEn ? "Bldg" : "مبنى"} ${x.address.buildingNumber}`,
                              x.address.street,
                              x.address.district,
                            ]
                              .filter(Boolean)
                              .join("، ")}
                          </span>
                        </p>
                      ) : null}

                      {x.contactPhone && (
                        <p className="flex items-center gap-1.5 font-mono dir-ltr">
                          <Phone size={14} className="shrink-0 text-slate-400" />
                          <span>{x.contactPhone}</span>
                        </p>
                      )}
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="mt-5 rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold mb-2">
                        <span className="text-[var(--muted)]">
                          {isEn ? "Occupancy:" : "الإشغال الحالي:"}
                        </span>
                        <span className="font-extrabold">
                          {x.currentResidents} / {x.totalCapacity}
                        </span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            occupancyPct >= 100
                              ? "bg-rose-500"
                              : occupancyPct > 80
                              ? "bg-amber-500"
                              : "bg-[#1167c9]"
                          }`}
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-emerald-700">
                          {isEn ? "Available:" : "المتاح:"} {x.availableCapacity}
                        </span>
                        <span className="text-[var(--muted)]">{occupancyPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="mt-5 pt-3 border-t flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/housing/${x.id}`}
                      className="text-xs font-extrabold text-[#1167c9] hover:underline"
                    >
                      {isEn ? "View Residents & Details →" : "عرض السكان والتفاصيل ←"}
                    </Link>

                    {manage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(x)}
                          title={isEn ? "Edit Housing" : "تعديل السكن"}
                          className="grid h-9 w-9 place-items-center rounded-lg border text-slate-700 hover:bg-slate-100 transition-all"
                        >
                          <Edit3 size={15} />
                        </button>
                        {!isArchived && (
                          <button
                            onClick={() => {
                              setArchiveTarget(x);
                              setArchiveReason("");
                              setArchiveError("");
                            }}
                            title={isEn ? "Archive Housing" : "أرشفة السكن"}
                            className="grid h-9 w-9 place-items-center rounded-lg border text-rose-600 border-rose-100 bg-rose-50/50 hover:bg-rose-100 transition-all"
                          >
                            <Archive size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create / Edit Modal Form */}
      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h2 className="text-xl font-black">
                  {editing
                    ? isEn ? "Edit Housing Unit" : "تعديل بيانات السكن"
                    : isEn ? "Create New Housing Unit" : "إضافة وحدة سكنية جديدة"}
                </h2>
                <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
                  {isEn ? "Enter unit information, address, and total capacity." : "أدخل معلومات السكن، العنوان التفصيلي، والسعة الاستيعابية."}
                </p>
              </div>
              <button
                onClick={() => setOpenForm(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border text-[var(--muted)] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700 border border-rose-200">
                <AlertCircle size={18} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-5 space-y-6">
              {/* Section 1: Basic Info */}
              <div>
                <h3 className="text-xs font-black tracking-wider text-[#1167c9] uppercase mb-3">
                  {isEn ? "1. Basic Information" : "١. المعلومات الأساسية"}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>
                      {isEn ? "Code" : "رمز السكن"} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. RIY-H-001"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>
                      {isEn ? "Arabic Name" : "الاسم بالعربية"} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      required
                      value={formData.nameAr}
                      onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                      placeholder="مثال: سكن الرياض ١"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>
                      {isEn ? "English Name" : "الاسم بالإنجليزية"} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      required
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="e.g. Riyadh Housing 1"
                      className={inputCls}
                    />
                  </label>

                  <div className="grid gap-1.5 text-xs font-bold">
                    <span>
                      {isEn ? "Operating City" : "مدينة التشغيل"} <span className="text-rose-500">*</span>
                    </span>
                    <SearchableSelect
                      value={formData.cityId}
                      onChange={(val) => setFormData({ ...formData, cityId: val })}
                      options={cityOptions}
                      placeholder={isEn ? "Select City" : "اختر المدينة"}
                      searchPlaceholder={isEn ? "Search city..." : "بحث عن مدينة..."}
                      required
                    />
                  </div>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>
                      {isEn ? "Total Capacity (Beds)" : "السعة الاستيعابية (الأسرّة)"}{" "}
                      <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.totalCapacity}
                      onChange={(e) => setFormData({ ...formData, totalCapacity: e.target.value })}
                      placeholder="100"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Contact Phone" : "رقم هاتف التواصل"}</span>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="+966500000000"
                      className={inputCls}
                    />
                  </label>
                </div>
              </div>

              {/* Section 2: Dates & Status */}
              <div>
                <h3 className="text-xs font-black tracking-wider text-[#1167c9] uppercase mb-3">
                  {isEn ? "2. Status & Operating Dates" : "٢. الحالة ومواعيد التشغيل"}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Housing Status" : "حالة السكن"}</span>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={inputCls}
                    >
                      <option value="Active">{isEn ? "Active" : "نشط"}</option>
                      <option value="Inactive">{isEn ? "Inactive" : "غير نشط"}</option>
                      <option value="Archived">{isEn ? "Archived" : "مؤرشف"}</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Status Reason" : "سبب الحالة"}</span>
                    <input
                      value={formData.statusReason}
                      onChange={(e) => setFormData({ ...formData, statusReason: e.target.value })}
                      placeholder={isEn ? "e.g. Under maintenance" : "مثال: تحت الصيانة"}
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Opening Date" : "تاريخ الافتتاح"}</span>
                    <input
                      type="date"
                      value={formData.openedDate}
                      onChange={(e) => setFormData({ ...formData, openedDate: e.target.value })}
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Closing Date" : "تاريخ الإغلاق"}</span>
                    <input
                      type="date"
                      value={formData.closedDate}
                      onChange={(e) => setFormData({ ...formData, closedDate: e.target.value })}
                      className={inputCls}
                    />
                  </label>
                </div>
              </div>

              {/* Section 3: Address & Coordinates */}
              <div>
                <h3 className="text-xs font-black tracking-wider text-[#1167c9] uppercase mb-3">
                  {isEn ? "3. Address & Geolocation" : "٣. العنوان والموقع الجغرافي"}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Building Number" : "رقم المبنى"}</span>
                    <input
                      value={formData.buildingNumber}
                      onChange={(e) => setFormData({ ...formData, buildingNumber: e.target.value })}
                      placeholder="12"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Street" : "الشارع"}</span>
                    <input
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="King Fahd Road"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "District" : "الحي"}</span>
                    <input
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="Al Olaya"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Postal Code" : "الرمز البريدي"}</span>
                    <input
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="12345"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Additional Number" : "الرقم الإضافي"}</span>
                    <input
                      value={formData.additionalNumber}
                      onChange={(e) => setFormData({ ...formData, additionalNumber: e.target.value })}
                      placeholder="6789"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Latitude (-90 to 90)" : "خط العرض (-90 إلى 90)"}</span>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="24.7136"
                      className={inputCls}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-bold">
                    <span>{isEn ? "Longitude (-180 to 180)" : "خط الطول (-180 إلى 180)"}</span>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="46.6753"
                      className={inputCls}
                    />
                  </label>
                </div>
              </div>

              {/* Section 4: Notes */}
              <div>
                <label className="grid gap-1.5 text-xs font-bold">
                  <span>{isEn ? "Notes" : "ملاحظات إضافية"}</span>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={isEn ? "Any additional notes..." : "أي ملاحظات إضافية..."}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-medium outline-none focus:border-[#1167c9]"
                  />
                </label>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpenForm(false)}
                  disabled={formBusy}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={formBusy}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Archive Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 text-rose-600">
                <Archive size={20} />
                <h2 className="text-lg font-black">{isEn ? "Archive Housing Unit" : "أرشفة السكن"}</h2>
              </div>
              <button
                onClick={() => setArchiveTarget(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-[var(--muted)] font-medium leading-relaxed">
              {isEn
                ? `Are you sure you want to archive "${archiveTarget.nameEn || archiveTarget.nameAr}"? The housing unit must not have active residents.`
                : `هل أنت تأكد من رغبتك في أرشفة "${archiveTarget.nameAr}"؟ يجب ألا يكون بالسكن سكان حاليون.`}
            </p>

            {archiveError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                {archiveError}
              </div>
            )}

            <form onSubmit={handleArchiveConfirm} className="mt-4 space-y-4">
              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Reason for archiving" : "سبب الأرشفة"} <span className="text-rose-500">*</span>
                </span>
                <input
                  required
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder={isEn ? "e.g. Building contract terminated" : "مثال: إغلاق المبنى نهائياً"}
                  className={inputCls}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setArchiveTarget(null)}
                  disabled={archiveBusy}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={archiveBusy} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {isEn ? "Confirm Archive" : "تأكيد الأرشفة"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
