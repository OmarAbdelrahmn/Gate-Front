"use client";

import { use, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Building,
  Users,
  UserCheck,
  Plus,
  Calendar,
  AlertCircle,
  X,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
  Archive,
  Clock,
  Filter,
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { authFetch } from "../../../../lib/auth/api";
import {
  getHousing,
  listHousing,
  listResidents,
  listSupervisors,
  assignResident,
  closeResidence,
  assignSupervisor,
  closeSupervisor,
  archiveHousing,
  type Housing,
  type HousingPeriod,
  type AssignResidentPayload,
  type AssignSupervisorPayload,
} from "../../../../lib/housing/api";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { SearchableSelect, type SelectOption } from "../../../../components/ui/SearchableSelect";
import { toast } from "../../../../components/ui/Toast";
import { translate } from "../../../../lib/i18n";

type Employee = { id: string; fullNameAr: string; fullNameEn?: string; iqamaNo?: string };

export default function HousingDetails({
  params,
}: {
  params: Promise<{ housingId: string }>;
}) {
  const { housingId } = use(params);
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";
  const manage = can("housing.manage");

  const [housing, setHousing] = useState<Housing | null>(null);
  const [residents, setResidents] = useState<HousingPeriod[]>([]);
  const [supervisors, setSupervisors] = useState<HousingPeriod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [residentsCurrentOnly, setResidentsCurrentOnly] = useState(true);
  const [supervisorsCurrentOnly, setSupervisorsCurrentOnly] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Assign Resident Modal
  const [openResidentModal, setOpenResidentModal] = useState(false);
  const [resEmpId, setResEmpId] = useState("");
  const [resFromDate, setResFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [resMoveReason, setResMoveReason] = useState("");
  const [resSourceRef, setResSourceRef] = useState("");
  const [resOverrideUsed, setResOverrideUsed] = useState(false);
  const [resOverrideReason, setResOverrideReason] = useState("");
  const [resBusy, setResBusy] = useState(false);
  const [resError, setResError] = useState("");

  // Close Resident Period Modal
  const [closeResPeriod, setCloseResPeriod] = useState<HousingPeriod | null>(null);
  const [closeResToDate, setCloseResToDate] = useState(new Date().toISOString().split("T")[0]);
  const [closeResReason, setCloseResReason] = useState("");
  const [closeResBusy, setCloseResBusy] = useState(false);
  const [closeResError, setCloseResError] = useState("");

  // Assign Supervisor Modal
  const [openSupervisorModal, setOpenSupervisorModal] = useState(false);
  const [supEmpId, setSupEmpId] = useState("");
  const [supFromDate, setSupFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [supReason, setSupReason] = useState("");
  const [supBusy, setSupBusy] = useState(false);
  const [supError, setSupError] = useState("");

  // Close Supervisor Period Modal
  const [closeSupPeriod, setCloseSupPeriod] = useState<HousingPeriod | null>(null);
  const [closeSupToDate, setCloseSupToDate] = useState(new Date().toISOString().split("T")[0]);
  const [closeSupReason, setCloseSupReason] = useState("");
  const [closeSupBusy, setCloseSupBusy] = useState(false);
  const [closeSupError, setCloseSupError] = useState("");

  // Archive Modal
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  const [housedEmployeeIds, setHousedEmployeeIds] = useState<Set<string>>(new Set());

  async function loadAllData() {
    try {
      setError("");
      const [h, r, s, e, allHousings] = await Promise.all([
        getHousing(housingId),
        listResidents(housingId, residentsCurrentOnly),
        listSupervisors(housingId, supervisorsCurrentOnly),
        authFetch<Employee[]>("/api/employees"),
        listHousing().catch(() => []),
      ]);
      setHousing(h);
      setResidents(r || []);
      setSupervisors(s || []);
      setEmployees(e || []);

      const housedSet = new Set<string>();
      if (allHousings && allHousings.length > 0) {
        const activeResLists = await Promise.all(
          allHousings.map((unit) => listResidents(unit.id, true).catch(() => []))
        );
        activeResLists.flat().forEach((period) => {
          if (!period.effectiveTo && period.employeeId) {
            housedSet.add(period.employeeId);
          }
        });
      } else if (r) {
        r.forEach((period) => {
          if (!period.effectiveTo && period.employeeId) {
            housedSet.add(period.employeeId);
          }
        });
      }
      setHousedEmployeeIds(housedSet);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : (isEn ? "Failed to load housing details" : "تعذر تحميل تفاصيل السكن")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAllData();
  }, [housingId, residentsCurrentOnly, supervisorsCurrentOnly]);

  const employeeOptions: SelectOption[] = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: isEn ? e.fullNameEn || e.fullNameAr : e.fullNameAr,
        sublabel: e.iqamaNo ? `${isEn ? "Iqama" : "إقامة"}: ${e.iqamaNo}` : undefined,
        keywords: `${e.fullNameAr} ${e.fullNameEn || ""} ${e.iqamaNo || ""}`,
      })),
    [employees, isEn]
  );

  const residentEmployeeOptions: SelectOption[] = useMemo(
    () =>
      employees
        .filter((e) => !housedEmployeeIds.has(e.id) || e.id === resEmpId)
        .map((e) => ({
          value: e.id,
          label: isEn ? e.fullNameEn || e.fullNameAr : e.fullNameAr,
          sublabel: e.iqamaNo ? `${isEn ? "Iqama" : "إقامة"}: ${e.iqamaNo}` : undefined,
          keywords: `${e.fullNameAr} ${e.fullNameEn || ""} ${e.iqamaNo || ""}`,
        })),
    [employees, housedEmployeeIds, resEmpId, isEn]
  );

  // Assign Resident Handler
  async function handleAssignResident(e: FormEvent) {
    e.preventDefault();
    if (!resEmpId) {
      setResError(isEn ? "Please select an employee" : "يرجى اختيار الموظف");
      return;
    }
    if (!resFromDate) {
      setResError(isEn ? "Effective date is required" : "تاريخ البداية مطلوب");
      return;
    }

    if (resOverrideUsed && !resOverrideReason.trim()) {
      setResError(isEn ? "Override reason is required when capacity override is used" : "سبب التجاوز مطلوب عند استخدام تجاوز السعة");
      return;
    }

    setResError("");
    setResBusy(true);

    try {
      const payload: AssignResidentPayload = {
        employeeId: resEmpId,
        effectiveFrom: resFromDate,
        moveInReason: resMoveReason.trim() || null,
        sourceReference: resSourceRef.trim() || null,
        capacityOverrideUsed: resOverrideUsed,
        capacityOverrideReason: resOverrideUsed ? resOverrideReason.trim() : null,
      };

      await assignResident(housingId, payload);
      toast.success(
        isEn ? "Resident Assigned" : "تم تسكين الموظف",
        isEn ? "Employee assigned to housing unit successfully." : "تم تسكين الموظف في وحدة السكن بنجاح."
      );
      setOpenResidentModal(false);
      setResEmpId("");
      setResMoveReason("");
      setResSourceRef("");
      setResOverrideUsed(false);
      setResOverrideReason("");
      await loadAllData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : (isEn ? "Failed to assign resident" : "تعذر إسناد الساكن");
      if (msg.includes("capacity_exceeded") || msg.toLowerCase().includes("capacity")) {
        setResOverrideUsed(true);
      }
      setResError(msg);
    } finally {
      setResBusy(false);
    }
  }

  // Close Resident Handler
  async function handleCloseResident(e: FormEvent) {
    e.preventDefault();
    if (!closeResPeriod) return;
    if (!closeResToDate) {
      setCloseResError(isEn ? "End date is required" : "تاريخ الانتهاء مطلوب");
      return;
    }
    if (!closeResReason.trim()) {
      setCloseResError(isEn ? "Closing reason is required" : "سبب الإنهاء مطلوب");
      return;
    }

    if (new Date(closeResToDate) < new Date(closeResPeriod.effectiveFrom)) {
      setCloseResError(
        isEn
          ? "Closing date cannot be before effective start date"
          : "تاريخ الإنهاء لا يمكن أن يكون قبل تاريخ بداية التسكين"
      );
      return;
    }

    setCloseResError("");
    setCloseResBusy(true);

    try {
      await closeResidence(closeResPeriod.id, closeResToDate, closeResReason.trim());
      toast.success(
        isEn ? "Period Closed" : "تم إنهاء الفترة",
        isEn ? "Residence period has been closed successfully." : "تم إنهاء فترة التسكين بنجاح."
      );
      setCloseResPeriod(null);
      setCloseResReason("");
      await loadAllData();
    } catch (err) {
      setCloseResError(err instanceof Error ? err.message : (isEn ? "Failed to close period" : "تعذر إنهاء الفترة"));
    } finally {
      setCloseResBusy(false);
    }
  }

  // Assign Supervisor Handler
  async function handleAssignSupervisor(e: FormEvent) {
    e.preventDefault();
    if (!supEmpId) {
      setSupError(isEn ? "Please select an employee" : "يرجى اختيار الموظف");
      return;
    }
    if (!supFromDate) {
      setSupError(isEn ? "Effective date is required" : "تاريخ البداية مطلوب");
      return;
    }

    setSupError("");
    setSupBusy(true);

    try {
      const payload: AssignSupervisorPayload = {
        employeeId: supEmpId,
        effectiveFrom: supFromDate,
        assignmentReason: supReason.trim() || null,
      };

      await assignSupervisor(housingId, payload);
      toast.success(
        isEn ? "Supervisor Assigned" : "تم تعيين المشرف",
        isEn ? "Housing supervisor assigned successfully." : "تم تعيين مشرف السكن بنجاح."
      );
      setOpenSupervisorModal(false);
      setSupEmpId("");
      setSupReason("");
      await loadAllData();
    } catch (err) {
      setSupError(err instanceof Error ? err.message : (isEn ? "Failed to assign supervisor" : "تعذر تعيين المشرف"));
    } finally {
      setSupBusy(false);
    }
  }

  // Close Supervisor Handler
  async function handleCloseSupervisor(e: FormEvent) {
    e.preventDefault();
    if (!closeSupPeriod) return;
    if (!closeSupToDate) {
      setCloseSupError(isEn ? "End date is required" : "تاريخ الانتهاء مطلوب");
      return;
    }
    if (!closeSupReason.trim()) {
      setCloseSupError(isEn ? "Reason is required" : "سبب الإعفاء/الإنهاء مطلوب");
      return;
    }

    if (new Date(closeSupToDate) < new Date(closeSupPeriod.effectiveFrom)) {
      setCloseSupError(
        isEn
          ? "Closing date cannot be before effective start date"
          : "تاريخ الإنهاء لا يمكن أن يكون قبل تاريخ بداية التكليف"
      );
      return;
    }

    setCloseSupError("");
    setCloseSupBusy(true);

    try {
      await closeSupervisor(closeSupPeriod.id, closeSupToDate, closeSupReason.trim());
      toast.success(
        isEn ? "Supervisor Period Closed" : "تم إنهاء التكليف",
        isEn ? "Supervisor period has been closed successfully." : "تم إنهاء تكليف المشرف بنجاح."
      );
      setCloseSupPeriod(null);
      setCloseSupReason("");
      await loadAllData();
    } catch (err) {
      setCloseSupError(err instanceof Error ? err.message : (isEn ? "Failed to close supervisor period" : "تعذر إنهاء التكليف"));
    } finally {
      setCloseSupBusy(false);
    }
  }

  // Archive Confirm Handler
  async function handleArchiveHousing(e: FormEvent) {
    e.preventDefault();
    if (!housing) return;
    if (!archiveReason.trim()) {
      setArchiveError(isEn ? "Archive reason is required" : "سبب الأرشفة مطلوب");
      return;
    }

    setArchiveError("");
    setArchiveBusy(true);

    try {
      await archiveHousing(housing.id, archiveReason.trim(), housing.rowVersion);
      toast.success(
        isEn ? "Housing Archived" : "تمت أرشفة السكن",
        isEn ? "Housing unit has been archived." : "تمت أرشفة السكن بنجاح."
      );
      setArchiveOpen(false);
      await loadAllData();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : (isEn ? "Failed to archive" : "تعذر أرشفة السكن"));
    } finally {
      setArchiveBusy(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition-all focus:border-[#1167c9] outline-none";

  if (loading) {
    return (
      <div className="p-12 text-center text-[var(--muted)] font-medium">
        {isEn ? "Loading housing details..." : "جاري تحميل تفاصيل السكن..."}
      </div>
    );
  }

  if (error || !housing) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700 max-w-lg mx-auto border border-rose-200">
          {error || (isEn ? "Housing record not found" : "وحدة السكن غير موجودة")}
        </p>
        <Link
          href="/dashboard/housing"
          className="inline-flex items-center gap-2 font-bold text-[#1167c9] hover:underline"
        >
          {isEn ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
          {isEn ? "Back to Housing List" : "العودة إلى إدارة السكن"}
        </Link>
      </div>
    );
  }

  const isArchived = housing.status === "Archived" || housing.isDeleted;
  const occupancyPct = housing.totalCapacity
    ? Math.min(100, Math.round((housing.currentResidents / housing.totalCapacity) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation Back Link */}
      <Link
        href="/dashboard/housing"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#1167c9] hover:underline"
      >
        {isEn ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        {isEn ? "Back to Housing Directory" : "العودة إلى قائمة المساكن"}
      </Link>

      {/* Main Header / Info Card */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#1167c9]">
                <Building size={26} />
              </span>
              <div>
                <h1 className="text-2xl font-black">{isEn ? housing.nameEn || housing.nameAr : housing.nameAr}</h1>
                <p className="text-xs font-mono font-semibold text-[var(--muted)] mt-0.5 dir-ltr">
                  {housing.code} · {housing.cityAr || (isEn ? "City" : "المدينة")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                isArchived
                  ? "bg-slate-200 text-slate-700"
                  : housing.status === "Inactive"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {isArchived ? (
                <>
                  <Archive size={14} />
                  {isEn ? "Archived" : "مؤرشف"}
                </>
              ) : housing.status === "Inactive" ? (
                <>
                  <Clock size={14} />
                  {isEn ? "Inactive" : "غير نشط"}
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  {isEn ? "Active" : "نشط"}
                </>
              )}
            </span>

            {manage && !isArchived && (
              <Button
                variant="secondary"
                onClick={() => {
                  setArchiveReason("");
                  setArchiveError("");
                  setArchiveOpen(true);
                }}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Archive size={16} />
                {isEn ? "Archive Unit" : "أرشفة السكن"}
              </Button>
            )}
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t pt-5">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Total Capacity" : "السعة الإجمالية"}</p>
            <p className="text-xl font-black mt-1">{housing.totalCapacity} {isEn ? "beds" : "سرير"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Current Occupants" : "السكان الحاليون"}</p>
            <p className="text-xl font-black text-[#1167c9] mt-1">{housing.currentResidents} {isEn ? "residents" : "ساكن"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Available Beds" : "الأسرّة الشاغرة"}</p>
            <p className="text-xl font-black text-emerald-700 mt-1">{housing.availableCapacity} {isEn ? "available" : "شاغر"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Occupancy Rate" : "نسبة الإشغال"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-black">{occupancyPct}%</span>
              <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full ${occupancyPct >= 100 ? "bg-rose-500" : "bg-[#1167c9]"}`}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address & Meta Info */}
        <div className="mt-4 grid gap-3 text-xs text-[var(--muted)] font-medium border-t pt-4 sm:grid-cols-2 md:grid-cols-3">
          {housing.address && (
            <p className="flex items-center gap-1.5">
              <MapPin size={15} className="shrink-0 text-slate-400" />
              <span>
                {[
                  housing.address.buildingNumber && `${isEn ? "Bldg" : "مبنى"} ${housing.address.buildingNumber}`,
                  housing.address.street,
                  housing.address.district,
                  housing.address.city || housing.cityAr,
                  housing.address.postalCode && `${isEn ? "Zip" : "رمز"}: ${housing.address.postalCode}`,
                ]
                  .filter(Boolean)
                  .join("، ")}
              </span>
            </p>
          )}

          {housing.contactPhone && (
            <p className="flex items-center gap-1.5 dir-ltr">
              <Phone size={15} className="shrink-0 text-slate-400" />
              <span>{housing.contactPhone}</span>
            </p>
          )}

          {(housing.latitude !== null && housing.latitude !== undefined) && (
            <p className="flex items-center gap-1.5 font-mono">
              <MapPin size={15} className="shrink-0 text-slate-400" />
              <span>Lat: {housing.latitude}, Lng: {housing.longitude}</span>
            </p>
          )}
        </div>

        {housing.notes && (
          <p className="mt-3 text-xs text-[var(--muted)] bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-700">{isEn ? "Notes: " : "ملاحظات: "}</span>
            {housing.notes}
          </p>
        )}
      </Card>

      {/* Two Column Grid for Residents & Supervisors */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Residents Section */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
                <Users size={18} />
              </span>
              <div>
                <h2 className="text-lg font-black">{isEn ? "Residents" : "السكان المعينون"}</h2>
                <p className="text-xs text-[var(--muted)] font-medium">
                  {residents.length} {isEn ? "records" : "سجلات مسجلة"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setResidentsCurrentOnly(!residentsCurrentOnly)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all border ${
                  residentsCurrentOnly
                    ? "bg-blue-50 border-blue-200 text-[#1167c9]"
                    : "bg-slate-50 border-slate-200 text-[var(--muted)]"
                }`}
              >
                {residentsCurrentOnly ? (isEn ? "Current Only" : "الحاليون فقط") : (isEn ? "All History" : "السجل الكامل")}
              </button>

              {manage && !isArchived && (
                <Button
                  onClick={() => {
                    setResEmpId("");
                    setResMoveReason("");
                    setResSourceRef("");
                    setResOverrideUsed(housing.availableCapacity <= 0);
                    setResOverrideReason("");
                    setResError("");
                    setOpenResidentModal(true);
                  }}
                  className="h-9 px-3 text-xs"
                >
                  <Plus size={14} />
                  {isEn ? "Assign Resident" : "تسكين موظف"}
                </Button>
              )}
            </div>
          </div>

          {/* Residents List */}
          <div className="mt-4 space-y-3">
            {residents.map((p) => {
              const isActive = !p.effectiveTo;
              return (
                <div
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-all ${
                    isActive ? "bg-[var(--surface)] border-[var(--border)] shadow-sm" : "bg-slate-50/60 border-slate-200 opacity-75"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-[var(--foreground)]">{p.employeeNameAr}</p>
                      {p.iqamaNo && (
                        <span className="text-[11px] font-mono text-[var(--muted)] font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                          {p.iqamaNo}
                        </span>
                      )}
                      {p.capacityOverrideUsed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full" title={p.capacityOverrideReason || ""}>
                          <ShieldCheck size={11} />
                          {isEn ? "Override Used" : "تجاوز السعة"}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
                      <Calendar size={13} className="shrink-0 text-slate-400" />
                      <span>
                        {isEn ? "From " : "من "} {p.effectiveFrom}
                        {p.effectiveTo ? ` ${isEn ? "to" : "إلى"} ${p.effectiveTo}` : ` · ${isEn ? "Active Resident" : "حالي"}`}
                      </span>
                    </p>

                    {p.startReason && (
                      <p className="text-[11px] text-[var(--muted)]">
                        <span className="font-semibold">{isEn ? "Move-in Reason:" : "سبب التسكين:"}</span> {p.startReason}
                      </p>
                    )}

                    {p.endReason && (
                      <p className="text-[11px] text-rose-700 font-medium">
                        <span className="font-semibold">{isEn ? "Close Reason:" : "سبب المغادرة:"}</span> {p.endReason}
                      </p>
                    )}
                  </div>

                  {isActive && manage && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCloseResPeriod(p);
                        setCloseResToDate(new Date().toISOString().split("T")[0]);
                        setCloseResReason("");
                        setCloseResError("");
                      }}
                      className="h-8 px-3 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      {isEn ? "Close Residence" : "إنهاء التسكين"}
                    </Button>
                  )}
                </div>
              );
            })}

            {residents.length === 0 && (
              <p className="py-8 text-center text-xs text-[var(--muted)] font-medium">
                {isEn ? "No resident records found for this unit." : "لا يوجد سكان مسجلون في هذه الفترة."}
              </p>
            )}
          </div>
        </Card>

        {/* Supervisors Section */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <UserCheck size={18} />
              </span>
              <div>
                <h2 className="text-lg font-black">{isEn ? "Supervisors" : "المشرفون المعينون"}</h2>
                <p className="text-xs text-[var(--muted)] font-medium">
                  {supervisors.length} {isEn ? "records" : "سجلات مسجلة"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSupervisorsCurrentOnly(!supervisorsCurrentOnly)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all border ${
                  supervisorsCurrentOnly
                    ? "bg-purple-50 border-purple-200 text-purple-700"
                    : "bg-slate-50 border-slate-200 text-[var(--muted)]"
                }`}
              >
                {supervisorsCurrentOnly ? (isEn ? "Current Only" : "الحاليون فقط") : (isEn ? "All History" : "السجل الكامل")}
              </button>

              {manage && !isArchived && (
                <Button
                  onClick={() => {
                    setSupEmpId("");
                    setSupReason("");
                    setSupError("");
                    setOpenSupervisorModal(true);
                  }}
                  className="h-9 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus size={14} />
                  {isEn ? "Assign Supervisor" : "تعيين مشرف"}
                </Button>
              )}
            </div>
          </div>

          {/* Supervisors List */}
          <div className="mt-4 space-y-3">
            {supervisors.map((p) => {
              const isActive = !p.effectiveTo;
              return (
                <div
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-all ${
                    isActive ? "bg-[var(--surface)] border-[var(--border)] shadow-sm" : "bg-slate-50/60 border-slate-200 opacity-75"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-[var(--foreground)]">{p.employeeNameAr}</p>
                      {p.iqamaNo && (
                        <span className="text-[11px] font-mono text-[var(--muted)] font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                          {p.iqamaNo}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
                      <Calendar size={13} className="shrink-0 text-slate-400" />
                      <span>
                        {isEn ? "From " : "من "} {p.effectiveFrom}
                        {p.effectiveTo ? ` ${isEn ? "to" : "إلى"} ${p.effectiveTo}` : ` · ${isEn ? "Active Supervisor" : "مشرف حالي"}`}
                      </span>
                    </p>

                    {p.startReason && (
                      <p className="text-[11px] text-[var(--muted)]">
                        <span className="font-semibold">{isEn ? "Assignment Reason:" : "سبب التكليف:"}</span> {p.startReason}
                      </p>
                    )}

                    {p.endReason && (
                      <p className="text-[11px] text-rose-700 font-medium">
                        <span className="font-semibold">{isEn ? "End Reason:" : "سبب الإعفاء:"}</span> {p.endReason}
                      </p>
                    )}
                  </div>

                  {isActive && manage && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCloseSupPeriod(p);
                        setCloseSupToDate(new Date().toISOString().split("T")[0]);
                        setCloseSupReason("");
                        setCloseSupError("");
                      }}
                      className="h-8 px-3 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      {isEn ? "End Assignment" : "إنهاء التكليف"}
                    </Button>
                  )}
                </div>
              );
            })}

            {supervisors.length === 0 && (
              <p className="py-8 text-center text-xs text-[var(--muted)] font-medium">
                {isEn ? "No supervisor records found." : "لا يوجد مشرفون معينون في هذه الفترة."}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Assign Resident Modal */}
      {openResidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-black">{isEn ? "Assign Resident to Housing" : "تسكين موظف جديد في السكن"}</h2>
              <button
                onClick={() => setOpenResidentModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {resError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                {resError}
              </div>
            )}

            <form onSubmit={handleAssignResident} className="mt-4 space-y-4">
              <div className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Select Employee" : "اختيار الموظف"} <span className="text-rose-500">*</span>
                </span>
                <SearchableSelect
                  value={resEmpId}
                  onChange={setResEmpId}
                  options={residentEmployeeOptions}
                  placeholder={isEn ? "Search and select employee..." : "بحث واختيار الموظف..."}
                  searchPlaceholder={isEn ? "Type name or Iqama..." : "اكتب الاسم أو رقم الإقامة..."}
                  required
                />
              </div>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Effective Start Date" : "تاريخ بداية التسكين"} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  required
                  value={resFromDate}
                  onChange={(e) => setResFromDate(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>{isEn ? "Move-in Reason" : "سبب التسكين"}</span>
                <input
                  value={resMoveReason}
                  onChange={(e) => setResMoveReason(e.target.value)}
                  placeholder={isEn ? "e.g. New employee accommodation" : "مثال: تسكين موظف جديد"}
                  className={inputCls}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>{isEn ? "Source Reference" : "المرجع الإداري / الطلب"}</span>
                <input
                  value={resSourceRef}
                  onChange={(e) => setResSourceRef(e.target.value)}
                  placeholder="e.g. HR-REQ-1001"
                  className={inputCls}
                />
              </label>

              {/* Capacity Override Option */}
              <div className="rounded-xl border p-3 bg-slate-50 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resOverrideUsed}
                    onChange={(e) => setResOverrideUsed(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                  />
                  <span>{isEn ? "Use Capacity Override (Approved Override)" : "تفعيل استثناء/تجاوز السعة الاستيعابية"}</span>
                </label>

                {resOverrideUsed && (
                  <label className="grid gap-1 text-xs font-bold pt-1">
                    <span>
                      {isEn ? "Override Reason" : "سبب تجاوز السعة الاستيعابية"} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      required={resOverrideUsed}
                      value={resOverrideReason}
                      onChange={(e) => setResOverrideReason(e.target.value)}
                      placeholder={isEn ? "e.g. Approved by HR Manager" : "مثال: موافقة مدير الموارد البشرية"}
                      className={inputCls}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpenResidentModal(false)}
                  disabled={resBusy}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={resBusy}>
                  {isEn ? "Assign Resident" : "تأكيد التسكين"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Close Resident Modal */}
      {closeResPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-black">{isEn ? "Close Residence Period" : "إغلاق فترة التسكين"}</h2>
              <button
                onClick={() => setCloseResPeriod(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-[var(--muted)] font-medium">
              {isEn
                ? `Ending accommodation for ${closeResPeriod.employeeNameAr}`
                : `إنهاء فترة تسكين الموظف ${closeResPeriod.employeeNameAr}`}
            </p>

            {closeResError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                {closeResError}
              </div>
            )}

            <form onSubmit={handleCloseResident} className="mt-4 space-y-4">
              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Closing Effective Date" : "تاريخ نهاية التسكين"} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  required
                  value={closeResToDate}
                  onChange={(e) => setCloseResToDate(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Closing Reason" : "سبب المغادرة/الإنهاء"} <span className="text-rose-500">*</span>
                </span>
                <input
                  required
                  value={closeResReason}
                  onChange={(e) => setCloseResReason(e.target.value)}
                  placeholder={isEn ? "e.g. Employee transferred" : "مثال: انتقال إلى سكن آخر"}
                  className={inputCls}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCloseResPeriod(null)}
                  disabled={closeResBusy}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={closeResBusy} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {isEn ? "Confirm Close" : "تأكيد الإنهاء"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Assign Supervisor Modal */}
      {openSupervisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-black">{isEn ? "Assign Housing Supervisor" : "تعيين مشرف للسكن"}</h2>
              <button
                onClick={() => setOpenSupervisorModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {supError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                {supError}
              </div>
            )}

            <form onSubmit={handleAssignSupervisor} className="mt-4 space-y-4">
              <div className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Select Employee" : "اختيار الموظف المشرف"} <span className="text-rose-500">*</span>
                </span>
                <SearchableSelect
                  value={supEmpId}
                  onChange={setSupEmpId}
                  options={employeeOptions}
                  placeholder={isEn ? "Search and select employee..." : "بحث واختيار الموظف..."}
                  searchPlaceholder={isEn ? "Type name or Iqama..." : "اكتب الاسم أو رقم الإقامة..."}
                  required
                />
              </div>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Effective Start Date" : "تاريخ بداية التكليف"} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  required
                  value={supFromDate}
                  onChange={(e) => setSupFromDate(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>{isEn ? "Assignment Reason" : "سبب التكليف"}</span>
                <input
                  value={supReason}
                  onChange={(e) => setSupReason(e.target.value)}
                  placeholder={isEn ? "e.g. New supervisor assignment" : "مثال: تعيين كمشرف على السكن"}
                  className={inputCls}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpenSupervisorModal(false)}
                  disabled={supBusy}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={supBusy} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isEn ? "Confirm Supervisor" : "تأكيد التكليف"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Close Supervisor Modal */}
      {closeSupPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-black">{isEn ? "Close Supervisor Assignment" : "إنهاء تكليف المشرف"}</h2>
              <button
                onClick={() => setCloseSupPeriod(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-xs text-[var(--muted)] font-medium">
              {isEn
                ? `Ending supervisor assignment for ${closeSupPeriod.employeeNameAr}`
                : `إنهاء تكليف المشرف ${closeSupPeriod.employeeNameAr}`}
            </p>

            {closeSupError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                {closeSupError}
              </div>
            )}

            <form onSubmit={handleCloseSupervisor} className="mt-4 space-y-4">
              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Closing Effective Date" : "تاريخ نهاية التكليف"} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  required
                  value={closeSupToDate}
                  onChange={(e) => setCloseSupToDate(e.target.value)}
                  className={inputCls}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Reason" : "سبب الإعفاء/الإنهاء"} <span className="text-rose-500">*</span>
                </span>
                <input
                  required
                  value={closeSupReason}
                  onChange={(e) => setCloseSupReason(e.target.value)}
                  placeholder={isEn ? "e.g. Replaced by another supervisor" : "مثال: تغيير المشرف"}
                  className={inputCls}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCloseSupPeriod(null)}
                  disabled={closeSupBusy}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={closeSupBusy} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {isEn ? "Confirm End" : "تأكيد إنهاء التكليف"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Archive Modal */}
      {archiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 text-rose-600">
                <Archive size={20} />
                <h2 className="text-lg font-black">{isEn ? "Archive Housing Unit" : "أرشفة السكن"}</h2>
              </div>
              <button
                onClick={() => setArchiveOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {archiveError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                {archiveError}
              </div>
            )}

            <form onSubmit={handleArchiveHousing} className="mt-4 space-y-4">
              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Reason for archiving" : "سبب الأرشفة"} <span className="text-rose-500">*</span>
                </span>
                <input
                  required
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder={isEn ? "e.g. Building permanently closed" : "مثال: إغلاق المبنى نهائياً"}
                  className={inputCls}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setArchiveOpen(false)}
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
