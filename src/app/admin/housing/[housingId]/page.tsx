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
  Bed,
  Layers,
  Search,
  Bike,
  Briefcase,
  Package,
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { authFetch } from "../../../../lib/auth/api";
import {
  getHousing,
  listHousing,
  listResidents,
  listSupervisors,
  listRooms,
  assignSupervisor,
  closeSupervisor,
  archiveHousing,
  type Housing,
  type HousingPeriod,
  type Room,
  type CurrentOccupant,
  type AssignSupervisorPayload,
} from "../../../../lib/housing/api";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { SearchableSelect, type SelectOption } from "../../../../components/ui/SearchableSelect";
import { toast } from "../../../../components/ui/Toast";
import { translate } from "../../../../lib/i18n";
import { RoomCard } from "../../../../components/housing/RoomCard";
import {
  CreateRoomModal,
  EditRoomModal,
  ArchiveRoomModal,
  AssignOccupantModal,
  MoveOccupantModal,
  RemoveOccupantModal,
} from "../../../../components/housing/RoomModals";
import { WarehouseTab } from "../../../../components/housing/WarehouseTab";

type Employee = { id: string; fullNameAr: string; fullNameEn?: string; iqamaNo?: string };

type TabType = "rooms" | "history" | "supervisors" | "warehouse";

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

  const [activeTab, setActiveTab] = useState<TabType>("rooms");

  const [housing, setHousing] = useState<Housing | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allHousings, setAllHousings] = useState<Housing[]>([]);
  const [residents, setResidents] = useState<HousingPeriod[]>([]);
  const [supervisors, setSupervisors] = useState<HousingPeriod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [residentsCurrentOnly, setResidentsCurrentOnly] = useState(true);
  const [supervisorsCurrentOnly, setSupervisorsCurrentOnly] = useState(true);

  // Filters for rooms
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState<"ALL" | "AVAILABLE" | "FULL">("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Room Modals State
  const [openCreateRoom, setOpenCreateRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [archivingRoom, setArchivingRoom] = useState<Room | null>(null);

  // Occupant Modals State
  const [assignRoomId, setAssignRoomId] = useState<string | undefined>(undefined);
  const [openAssignModal, setOpenAssignModal] = useState(false);

  const [movingOccupant, setMovingOccupant] = useState<{
    room: Room;
    occupant: CurrentOccupant;
  } | null>(null);

  const [removingOccupant, setRemovingOccupant] = useState<{
    room: Room;
    occupant: CurrentOccupant;
  } | null>(null);

  // Supervisor Modals State
  const [openSupervisorModal, setOpenSupervisorModal] = useState(false);
  const [supEmpId, setSupEmpId] = useState("");
  const [supFromDate, setSupFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [supReason, setSupReason] = useState("");
  const [supBusy, setSupBusy] = useState(false);
  const [supError, setSupError] = useState("");

  const [closeSupPeriod, setCloseSupPeriod] = useState<HousingPeriod | null>(null);
  const [closeSupToDate, setCloseSupToDate] = useState(new Date().toISOString().split("T")[0]);
  const [closeSupReason, setCloseSupReason] = useState("");
  const [closeSupBusy, setCloseSupBusy] = useState(false);
  const [closeSupError, setCloseSupError] = useState("");

  // Archive Housing Modal State
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  async function loadAllData() {
    try {
      setError("");
      const [hRes, rRes, resHistoryRes, supRes, empRes, housingsRes] = await Promise.all([
        getHousing(housingId),
        listRooms(housingId).catch(() => []),
        listResidents(housingId, residentsCurrentOnly).catch(() => []),
        listSupervisors(housingId, supervisorsCurrentOnly).catch(() => []),
        authFetch<Employee[]>("/api/employees").catch(() => []),
        listHousing().catch(() => []),
      ]);

      setHousing(hRes);
      // Prefer room array from listRooms or details
      setRooms(rRes && rRes.length > 0 ? rRes : hRes.rooms || []);
      setResidents(resHistoryRes || []);
      setSupervisors(supRes || []);
      setEmployees(empRes || []);
      setAllHousings(housingsRes || []);
    } catch (err: any) {
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

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = roomSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.occupants?.some(
          (occ) =>
            occ.employeeNameAr?.toLowerCase().includes(q) ||
            occ.employeeNameEn?.toLowerCase().includes(q) ||
            occ.iqamaNo?.includes(q)
        );

      const matchesStatus =
        roomFilter === "ALL" ||
        (roomFilter === "AVAILABLE" && r.availableCapacity > 0) ||
        (roomFilter === "FULL" && r.availableCapacity <= 0);

      return matchesSearch && matchesStatus;
    });
  }, [rooms, roomSearch, roomFilter]);

  // Aggregate room stats
  const roomStats = useMemo(() => {
    const totalRooms = rooms.length;
    const totalCap = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const totalOccupied = rooms.reduce((acc, r) => acc + (r.currentOccupancy || 0), 0);
    const totalAvailable = rooms.reduce((acc, r) => acc + (r.availableCapacity || 0), 0);
    return { totalRooms, totalCap, totalOccupied, totalAvailable };
  }, [rooms]);

  // Supervisor Assign Handler
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
    } catch (err: any) {
      setSupError(err?.message || (isEn ? "Failed to assign supervisor" : "تعذر تعيين المشرف"));
    } finally {
      setSupBusy(false);
    }
  }

  // Supervisor Close Handler
  async function handleCloseSupervisor(e: FormEvent) {
    e.preventDefault();
    if (!closeSupPeriod) return;
    if (!closeSupToDate) {
      setCloseSupError(isEn ? "End date is required" : "تاريخ الانتهاء مطلوب");
      return;
    }
    if (!closeSupReason.trim()) {
      setCloseSupError(isEn ? "Reason is required" : "سبب الإعفاء مطلوب");
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
        isEn ? "Assignment Ended" : "تم إنهاء التكليف",
        isEn ? "Supervisor assignment ended successfully." : "تم إنهاء تكليف المشرف بنجاح."
      );
      setCloseSupPeriod(null);
      setCloseSupReason("");
      await loadAllData();
    } catch (err: any) {
      setCloseSupError(err?.message || (isEn ? "Failed to close supervisor period" : "تعذر إنهاء التكليف"));
    } finally {
      setCloseSupBusy(false);
    }
  }

  // Archive Housing Handler
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
    } catch (err: any) {
      setArchiveError(err?.message || (isEn ? "Failed to archive" : "تعذر أرشفة السكن"));
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
          href="/admin/housing"
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
        href="/admin/housing"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#1167c9] hover:underline"
      >
        {isEn ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        {isEn ? "Back to Housing Directory" : "العودة إلى قائمة المساكن"}
      </Link>

      {/* Main Facility Overview Card */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#1167c9] dark:bg-blue-950/60 dark:text-blue-300">
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
                  ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  : housing.status === "Inactive"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
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
                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40"
              >
                <Archive size={16} />
                {isEn ? "Archive Unit" : "أرشفة السكن"}
              </Button>
            )}
          </div>
        </div>

        {/* Facility Capacity Metrics Row */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-[var(--border)] pt-5">
          <div className="rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "Total Rooms" : "إجمالي الغرف"}</span>
              <Bed size={15} className="text-blue-500" />
            </div>
            <p className="text-xl font-black mt-1">{roomStats.totalRooms} {isEn ? "rooms" : "غرفة"}</p>
          </div>

          <div className="rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "Total Capacity" : "السعة الإجمالية"}</span>
              <Layers size={15} className="text-purple-500" />
            </div>
            <p className="text-xl font-black mt-1">
              {housing.totalCapacity || roomStats.totalCap} {isEn ? "beds" : "سرير"}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "Current Occupants" : "السكان الحاليون"}</span>
              <Users size={15} className="text-amber-500" />
            </div>
            <p className="text-xl font-black text-[#1167c9] mt-1">
              {housing.currentResidents || roomStats.totalOccupied} {isEn ? "residents" : "ساكن"}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "Available Beds" : "الأسرّة الشاغرة"}</span>
              <CheckCircle2 size={15} className="text-emerald-500" />
            </div>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {housing.availableCapacity ?? roomStats.totalAvailable} {isEn ? "vacant" : "شاغر"}
            </p>
          </div>
        </div>

        {/* Address & Meta Info */}
        <div className="mt-4 grid gap-3 text-xs text-[var(--muted)] font-medium border-t border-[var(--border)] pt-4 sm:grid-cols-2 md:grid-cols-3">
          {housing.address && (
            <p className="flex items-center gap-1.5 truncate">
              <MapPin size={15} className="shrink-0 text-slate-400" />
              <span className="truncate">
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

          {housing.latitude !== null && housing.latitude !== undefined && (
            <p className="flex items-center gap-1.5 font-mono">
              <MapPin size={15} className="shrink-0 text-slate-400" />
              <span>Lat: {housing.latitude}, Lng: {housing.longitude}</span>
            </p>
          )}
        </div>

        {housing.notes && (
          <p className="mt-3 text-xs text-[var(--muted)] bg-[var(--subtle-bg)] p-3 rounded-xl border border-[var(--border)]">
            <span className="font-bold text-[var(--foreground)]">{isEn ? "Notes: " : "ملاحظات: "}</span>
            {housing.notes}
          </p>
        )}
      </Card>

      {/* Tabs Navigation Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-1">
        <button
          onClick={() => setActiveTab("rooms")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "rooms"
              ? "border-[#1167c9] text-[#1167c9]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Bed size={17} />
          <span>{isEn ? "Rooms & Occupancy" : "الغرف والتسكين"}</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-[#1167c9] dark:bg-blue-950/60 dark:text-blue-300">
            {rooms.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "history"
              ? "border-[#1167c9] text-[#1167c9]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Users size={17} />
          <span>{isEn ? "Residence History" : "سجل التسكين"}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-[var(--muted)] dark:bg-slate-800">
            {residents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("supervisors")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "supervisors"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <UserCheck size={17} />
          <span>{isEn ? "Supervisors" : "المشرفون"}</span>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            {supervisors.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("warehouse")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "warehouse"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <Package size={17} />
          <span>{isEn ? "Warehouse" : "المستودع"}</span>
        </button>
      </div>

      {/* TAB 1: ROOMS & OCCUPANCY */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          {/* Rooms Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Room Search */}
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search
                  size={16}
                  className={`absolute top-3 text-[var(--muted)] ${isEn ? "left-3" : "right-3"}`}
                />
                <input
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder={isEn ? "Search room or occupant..." : "ابحث برقم الغرفة أو اسم الساكن..."}
                  className={`h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-medium ${
                    isEn ? "pl-9 pr-3" : "pr-9 pl-3"
                  } outline-none focus:border-[#1167c9]`}
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 rounded-xl bg-[var(--subtle-bg)] border border-[var(--border)] p-1">
                {[
                  { id: "ALL", label: isEn ? "All Rooms" : "جميع الغرف" },
                  { id: "AVAILABLE", label: isEn ? "Has Vacancy" : "بها شواغر" },
                  { id: "FULL", label: isEn ? "Fully Occupied" : "مكتملة" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRoomFilter(f.id as any)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      roomFilter === f.id
                        ? "bg-[#1167c9] text-white shadow-xs"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Management Actions */}
            {manage && !isArchived && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setAssignRoomId(undefined);
                    setOpenAssignModal(true);
                  }}
                  variant="secondary"
                  disabled={housing.availableCapacity <= 0 && rooms.every((r) => r.availableCapacity <= 0)}
                  className="h-10 px-3 text-xs"
                >
                  <Plus size={15} />
                  {isEn ? "Assign Person" : "تسكين فرد"}
                </Button>

                <Button onClick={() => setOpenCreateRoom(true)} className="h-10 px-3 text-xs">
                  <Plus size={15} />
                  {isEn ? "Add Room" : "إضافة غرفة"}
                </Button>
              </div>
            )}
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
              <Bed className="mx-auto mb-3 opacity-30" size={48} />
              <h3 className="font-bold text-base text-[var(--foreground)]">
                {rooms.length === 0
                  ? isEn ? "No rooms created yet" : "لا توجد غرف مسجلة في هذا السكن"
                  : isEn ? "No matching rooms found" : "لا توجد غرف مطابقة للبحث"}
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] max-w-md mx-auto">
                {rooms.length === 0
                  ? isEn
                    ? "Housing capacity is calculated from its rooms. Add the first room to start allocating beds."
                    : "تُحسب السعة الاستيعابية الإجمالية من الغرف. أضف الغرفة الأولى لبدء تسكين الأفراد."
                  : isEn
                  ? "Try adjusting your search criteria."
                  : "جرب تغيير كلمات البحث أو المرشح."}
              </p>
              {rooms.length === 0 && manage && !isArchived && (
                <Button onClick={() => setOpenCreateRoom(true)} className="mt-4 text-xs">
                  <Plus size={14} />
                  {isEn ? "Add First Room" : "إضافة الغرفة الأولى"}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRooms.map((r) => (
                <RoomCard
                  key={r.id}
                  room={r}
                  isEn={isEn}
                  canManage={Boolean(manage && !isArchived)}
                  onAssignToRoom={(targetRoom) => {
                    setAssignRoomId(targetRoom.id);
                    setOpenAssignModal(true);
                  }}
                  onEditRoom={(targetRoom) => setEditingRoom(targetRoom)}
                  onArchiveRoom={(targetRoom) => setArchivingRoom(targetRoom)}
                  onMoveOccupant={(sourceRoom, occ) => setMovingOccupant({ room: sourceRoom, occupant: occ })}
                  onRemoveOccupant={(sourceRoom, occ) => setRemovingOccupant({ room: sourceRoom, occupant: occ })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESIDENCE HISTORY */}
      {activeTab === "history" && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
            <div>
              <h2 className="text-lg font-black">{isEn ? "Residence History" : "سجل تسكين الأفراد"}</h2>
              <p className="text-xs text-[var(--muted)] font-medium">
                {residents.length} {isEn ? "recorded stays in this facility" : "سجلات مسجلة في هذا السكن"}
              </p>
            </div>

            <button
              onClick={() => setResidentsCurrentOnly(!residentsCurrentOnly)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border ${
                residentsCurrentOnly
                  ? "bg-blue-50 border-blue-200 text-[#1167c9] dark:bg-blue-950/50 dark:border-blue-800"
                  : "bg-slate-50 border-slate-200 text-[var(--muted)] dark:bg-slate-800 dark:border-slate-700"
              }`}
            >
              {residentsCurrentOnly ? (isEn ? "Current Residents Only" : "الحاليون فقط") : (isEn ? "Full Historical Log" : "السجل الكامل")}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {residents.map((p) => {
              const isActive = !p.effectiveTo;
              const isRider = p.personType === "Rider" || Boolean(p.riderProfileId);

              return (
                <div
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-all ${
                    isActive
                      ? "bg-[var(--surface)] border-[var(--border)] shadow-xs"
                      : "bg-slate-50/60 border-slate-200 opacity-75 dark:bg-slate-800/40 dark:border-slate-800"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-sm text-[var(--foreground)]">{p.employeeNameAr}</p>

                      {p.iqamaNo && (
                        <span className="text-[11px] font-mono text-[var(--muted)] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {p.iqamaNo}
                        </span>
                      )}

                      {/* Person Type Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                          isRider
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                        }`}
                      >
                        {isRider ? <Bike size={11} /> : <Briefcase size={11} />}
                        {isRider ? (isEn ? "Rider" : "سائق") : (isEn ? "Staff" : "موظف")}
                      </span>

                      {/* Room Badge */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-[var(--border)]">
                        <Bed size={12} className="text-blue-600" />
                        <span>{p.roomName ? (isEn ? `Room ${p.roomName}` : `غرفة ${p.roomName}`) : (isEn ? "Unspecified Room" : "غرفة غير محددة")}</span>
                      </span>

                      {/* Legacy Override Note if present */}
                      {p.capacityOverrideUsed && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full"
                          title={p.capacityOverrideReason || ""}
                        >
                          <ShieldCheck size={11} />
                          {isEn ? "Migrated Override" : "استثناء مرحل"}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
                      <Calendar size={13} className="shrink-0 text-slate-400" />
                      <span>
                        {isEn ? "From " : "من "} {p.effectiveFrom}
                        {p.effectiveTo ? ` ${isEn ? "to" : "إلى"} ${p.effectiveTo}` : ` · ${isEn ? "Active Resident" : "ساكن حالي"}`}
                      </span>
                    </p>

                    {p.startReason && (
                      <p className="text-[11px] text-[var(--muted)]">
                        <span className="font-semibold">{isEn ? "Move-in Reason:" : "سبب التسكين:"}</span> {p.startReason}
                      </p>
                    )}

                    {p.endReason && (
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                        <span className="font-semibold">{isEn ? "Departure Reason:" : "سبب المغادرة:"}</span> {p.endReason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {residents.length === 0 && (
              <p className="py-8 text-center text-xs text-[var(--muted)] font-medium">
                {isEn ? "No residence history records found." : "لا توجد سجلات تسكين مسجلة."}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: SUPERVISORS */}
      {activeTab === "supervisors" && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
                <UserCheck size={18} />
              </span>
              <div>
                <h2 className="text-lg font-black">{isEn ? "Housing Supervisors" : "المشرفون المعينون"}</h2>
                <p className="text-xs text-[var(--muted)] font-medium">
                  {isEn
                    ? "Supervisors oversee operations and do not consume room bed capacity."
                    : "المشرفون يديرون السكن ولا يستهلكون من السعة الاستيعابية للغرف."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSupervisorsCurrentOnly(!supervisorsCurrentOnly)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all border ${
                  supervisorsCurrentOnly
                    ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-300"
                    : "bg-slate-50 border-slate-200 text-[var(--muted)] dark:bg-slate-800 dark:border-slate-700"
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

          <div className="mt-4 space-y-3">
            {supervisors.map((p) => {
              const isActive = !p.effectiveTo;
              return (
                <div
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-all ${
                    isActive
                      ? "bg-[var(--surface)] border-[var(--border)] shadow-xs"
                      : "bg-slate-50/60 border-slate-200 opacity-75 dark:bg-slate-800/40 dark:border-slate-800"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-[var(--foreground)]">{p.employeeNameAr}</p>
                      {p.iqamaNo && (
                        <span className="text-[11px] font-mono text-[var(--muted)] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {p.iqamaNo}
                        </span>
                      )}
                      <span className="rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 text-[10px] font-black">
                        {isActive ? (isEn ? "Active Supervisor" : "مشرف نشط") : (isEn ? "Former" : "سابق")}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--muted)] font-medium flex items-center gap-1">
                      <Calendar size={13} className="shrink-0 text-slate-400" />
                      <span>
                        {isEn ? "From " : "من "} {p.effectiveFrom}
                        {p.effectiveTo ? ` ${isEn ? "to" : "إلى"} ${p.effectiveTo}` : ` · ${isEn ? "Current" : "مستمر"}`}
                      </span>
                    </p>

                    {p.startReason && (
                      <p className="text-[11px] text-[var(--muted)]">
                        <span className="font-semibold">{isEn ? "Assignment Reason:" : "سبب التكليف:"}</span> {p.startReason}
                      </p>
                    )}

                    {p.endReason && (
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
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
                      className="h-8 px-3 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40"
                    >
                      {isEn ? "End Assignment" : "إنهاء التكليف"}
                    </Button>
                  )}
                </div>
              );
            })}

            {supervisors.length === 0 && (
              <p className="py-8 text-center text-xs text-[var(--muted)] font-medium">
                {isEn ? "No supervisor records found." : "لا يوجد مشرفون مسجلون في هذه الفترة."}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* TAB 4: WAREHOUSE */}
      {activeTab === "warehouse" && (
        <WarehouseTab housingId={housingId} isArchived={Boolean(isArchived)} />
      )}

      {/* ==================== MODALS ==================== */}

      {/* 1. Create Room Modal */}
      <CreateRoomModal
        isOpen={openCreateRoom}
        onClose={() => setOpenCreateRoom(false)}
        housingId={housingId}
        onSuccess={loadAllData}
        isEn={isEn}
      />

      {/* 2. Edit Room Modal */}
      <EditRoomModal
        isOpen={Boolean(editingRoom)}
        onClose={() => setEditingRoom(null)}
        room={editingRoom}
        onSuccess={loadAllData}
        isEn={isEn}
      />

      {/* 3. Archive Room Modal */}
      <ArchiveRoomModal
        isOpen={Boolean(archivingRoom)}
        onClose={() => setArchivingRoom(null)}
        room={archivingRoom}
        onSuccess={loadAllData}
        isEn={isEn}
      />

      {/* 4. Assign Occupant Modal */}
      <AssignOccupantModal
        isOpen={openAssignModal}
        onClose={() => {
          setOpenAssignModal(false);
          setAssignRoomId(undefined);
        }}
        housingId={housingId}
        initialRoomId={assignRoomId}
        rooms={rooms}
        onSuccess={loadAllData}
        isEn={isEn}
      />

      {/* 5. Move Occupant Modal */}
      <MoveOccupantModal
        isOpen={Boolean(movingOccupant)}
        onClose={() => setMovingOccupant(null)}
        sourceRoom={movingOccupant?.room || null}
        occupant={movingOccupant?.occupant || null}
        currentHousingId={housingId}
        housings={allHousings}
        currentRooms={rooms}
        onSuccess={loadAllData}
        isEn={isEn}
      />

      {/* 6. Remove Occupant Modal */}
      <RemoveOccupantModal
        isOpen={Boolean(removingOccupant)}
        onClose={() => setRemovingOccupant(null)}
        sourceRoom={removingOccupant?.room || null}
        occupant={removingOccupant?.occupant || null}
        onSuccess={loadAllData}
        isEn={isEn}
      />

      {/* 7. Assign Supervisor Modal */}
      {openSupervisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
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
                  placeholder={isEn ? "e.g. Regional supervision" : "مثال: إشراف إقليمي على السكن"}
                  className={inputCls}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpenSupervisorModal(false)}
                  disabled={supBusy}
                >
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
                <Button type="submit" loading={supBusy} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {isEn ? "Confirm Supervisor" : "تأكيد التكليف"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 8. Close Supervisor Modal */}
      {closeSupPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
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
                  placeholder={isEn ? "e.g. Assignment ended" : "مثال: انتهاء فترة الإشراف"}
                  className={inputCls}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCloseSupPeriod(null)}
                  disabled={closeSupBusy}
                >
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
                <Button type="submit" loading={closeSupBusy} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {isEn ? "Confirm End" : "تأكيد إنهاء التكليف"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 9. Archive Housing Modal */}
      {archiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
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

            <p className="mt-3 text-xs text-[var(--muted)] font-medium leading-relaxed">
              {isEn
                ? `Are you sure you want to archive "${housing.nameEn || housing.nameAr}"? The housing unit must not have active residents in any room.`
                : `هل أنت متأكد من أرشفة "${housing.nameAr}"؟ يجب ألا يحتوي السكن على سكان حاليين في أي من غرفه.`}
            </p>

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
                  placeholder={isEn ? "e.g. Building permanently closed" : "مثال: إغلاق الموقع نهائياً"}
                  className={inputCls}
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setArchiveOpen(false)}
                  disabled={archiveBusy}
                >
                  {isEn ? "Cancel" : "إلغاء"}
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
