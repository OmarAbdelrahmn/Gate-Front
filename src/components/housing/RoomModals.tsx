"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  X,
  AlertCircle,
  Bed,
  Building,
  User,
  Bike,
  Briefcase,
  ArrowRightLeft,
  LogOut,
  Archive,
  Calendar,
  CheckCircle2,
  Wrench,
  Trash2,
  UserCheck,
  Layers,
  FileText,
  CreditCard,
  Hash,
} from "lucide-react";
import {
  createRoom,
  updateRoom,
  archiveRoom,
  assignEmployeeToRoom,
  assignRiderToRoom,
  assignByIqama,
  addExternalOccupant,
  updateExternalOccupant,
  removeExternalOccupant,
  resolvePendingOccupant,
  removePendingOccupant,
  createFloor,
  updateFloor,
  archiveFloor,
  addFloorEquipment,
  updateFloorEquipment,
  addRoomEquipment,
  updateRoomEquipment,
  deleteEquipment,
  moveOccupant,
  removeOccupant,
  listRooms,
  type Room,
  type CurrentOccupant,
  type ExternalOccupant,
  type PendingOccupant,
  type Floor,
  type EquipmentItem,
  type Housing,
} from "../../lib/housing/api";
import { authFetch } from "../../lib/auth/api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SearchableSelect, type SelectOption } from "../ui/SearchableSelect";
import { toast } from "../ui/Toast";

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition-all focus:border-[#1167c9] outline-none";

export function formatHousingError(err: any, isEn: boolean): string {
  if (!err) return isEn ? "An unexpected error occurred" : "حدث خطأ غير متوقع";
  const msg = typeof err === "string" ? err : err?.message || String(err);
  if (
    msg.includes("housing.capacity_exceeded") ||
    msg.toLowerCase().includes("capacity exceeded")
  ) {
    return isEn
      ? "Room capacity exceeded: No vacant beds available in the selected room."
      : "تم تجاوز السعة الاستيعابية: لا توجد أسرّة شاغرة متاحة في الغرفة المختارة.";
  }
  if (msg.includes("housing.person_already_assigned")) {
    return isEn
      ? "This person is already assigned to an active room. Use the Move action to transfer them."
      : "هذا الشخص مسكن بالفعل في غرفة نشطة. استخدم خيار النقل لنقله لغرفة أخرى.";
  }
  if (msg.includes("housing.employee_not_found")) {
    return isEn
      ? "Employee not found for this Iqama number. Ensure an employee record with this Iqama exists first."
      : "لم يتم العثور على موظف برقم الإقامة هذا. يرجى التأكد من تسجيل الموظف برقم الإقامة أولاً.";
  }
  if (msg.includes("housing.room_name_duplicate")) {
    return isEn
      ? "A room with this name/number already exists on this floor."
      : "يوجد بالفعل غرفة بهذا الاسم أو الرقم في نفس هذا الدور.";
  }
  if (msg.includes("housing.room_occupied")) {
    return isEn
      ? "Cannot archive this room because it currently has occupants."
      : "لا يمكن أرشفة هذه الغرفة لأنها تحتوي على سكان حاليين.";
  }
  if (msg.includes("hr.concurrency_conflict")) {
    return isEn
      ? "Data has been modified by another operation. Please reload and try again."
      : "تم تعديل البيانات بواسطة عملية أخرى. يرجى تحديث الصفحة والمحاولة مجدداً.";
  }
  if (msg.includes("hr.duplicate")) {
    return isEn
      ? "Duplicate name detected. An item with this name already exists in this scope."
      : "اسم مكرر. يوجد بالفعل عنصر بهذا الاسم في نفس النطاق.";
  }
  if (msg.includes("housing.not_active")) {
    return isEn
      ? "The selected housing facility is not active."
      : "موقع السكن المختار غير نشط.";
  }
  return msg;
}

// ==================== 1. CREATE ROOM MODAL ====================

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  floors?: Floor[];
  initialFloorId?: string;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  housingId,
  floors,
  initialFloorId,
  onSuccess,
  isEn,
}: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [floorId, setFloorId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCapacity("4");
      setFloorId(initialFloorId || (floors && floors[0]?.id) || "");
      setNotes("");
      setError("");
    }
  }, [isOpen, initialFloorId, floors]);

  if (!isOpen) return null;

  const floorOptions: SelectOption[] = (floors || []).map((f) => ({
    value: f.id,
    label: isEn ? `Floor ${f.name}` : `الدور ${f.name}`,
    sublabel: `${f.totalCapacity} ${isEn ? "beds" : "سرير"} · ${f.rooms?.length || 0} ${isEn ? "rooms" : "غرف"}`,
  }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(isEn ? "Room name or number is required" : "اسم أو رقم الغرفة مطلوب");
      return;
    }
    if (trimmedName.length > 100) {
      setError(isEn ? "Room name cannot exceed 100 characters" : "اسم الغرفة يجب ألا يتجاوز 100 حرف");
      return;
    }
    const capNum = Number(capacity);
    if (isNaN(capNum) || capNum <= 0) {
      setError(isEn ? "Capacity must be greater than zero" : "السعة الاستيعابية يجب أن تكون أكبر من صفر");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await createRoom(housingId, {
        name: trimmedName,
        capacity: capNum,
        floorId: floorId || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(
        isEn ? "Room Created" : "تم إنشاء الغرفة",
        isEn ? `Room "${trimmedName}" created with ${capNum} beds.` : `تم إنشاء غرفة "${trimmedName}" بسعة ${capNum} أسرّة بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#1167c9]">
              <Bed size={17} />
            </span>
            <h2 className="text-lg font-black">{isEn ? "Add New Room" : "إضافة غرفة جديدة"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {floorOptions.length > 0 && (
            <div className="grid gap-1.5 text-xs font-bold">
              <span>{isEn ? "Floor" : "الدور"}</span>
              <SearchableSelect
                value={floorId}
                onChange={setFloorId}
                options={floorOptions}
                placeholder={isEn ? "Select Floor (defaults to 1st floor)" : "اختر الدور (تلقائياً الدور الأول)"}
              />
            </div>
          )}

          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Room Name / Number" : "اسم أو رقم الغرفة"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? "e.g. 101 or Room A" : "مثال: 101 أو غرفة 1"}
              className={inputCls}
            />
            <p className="text-[11px] text-[var(--muted)] font-medium">
              {isEn ? "Room numbers are unique within a floor." : "أرقام الغرف فريدة داخل كل دور."}
            </p>
          </label>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Bed Capacity" : "السعة الاستيعابية (عدد الأسرّة)"} <span className="text-rose-500">*</span>
            </span>
            <input
              type="number"
              min="1"
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="4"
              className={inputCls}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>{isEn ? "Room Notes (optional)" : "ملاحظات الغرفة (اختياري)"}</span>
            <textarea
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? "e.g. Contains 4 bunk beds with storage" : "مثال: موجود بها 4 سراير ب دورين ومكيف سبليت"}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-medium outline-none focus:border-[#1167c9]"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEn ? "Create Room" : "إضافة الغرفة"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 2. EDIT ROOM MODAL ====================

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  floors?: Floor[];
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function EditRoomModal({
  isOpen,
  onClose,
  room,
  floors,
  onSuccess,
  isEn,
}: EditRoomModalProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [floorId, setFloorId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && room) {
      setName(room.name || "");
      setCapacity(String(room.capacity || 1));
      setFloorId(room.floorId || "");
      setNotes(room.notes || "");
      setError("");
    }
  }, [isOpen, room]);

  if (!isOpen || !room) return null;

  const floorOptions: SelectOption[] = (floors || []).map((f) => ({
    value: f.id,
    label: isEn ? `Floor ${f.name}` : `الدور ${f.name}`,
    sublabel: `${f.totalCapacity} ${isEn ? "beds" : "سرير"}`,
  }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!room) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(isEn ? "Room name is required" : "اسم الغرفة مطلوب");
      return;
    }
    const capNum = Number(capacity);
    if (isNaN(capNum) || capNum <= 0) {
      setError(isEn ? "Capacity must be greater than zero" : "السعة الاستيعابية يجب أن تكون أكبر من صفر");
      return;
    }
    if (capNum < room.currentOccupancy) {
      setError(
        isEn
          ? `Capacity cannot be reduced below current occupancy (${room.currentOccupancy})`
          : `لا يمكن تقليل السعة إلى أقل من عدد السكان الحاليين (${room.currentOccupancy})`
      );
      return;
    }

    setError("");
    setBusy(true);

    try {
      await updateRoom(room.id, {
        name: trimmedName,
        capacity: capNum,
        floorId: floorId || undefined,
        notes: notes.trim() || undefined,
        rowVersion: room.rowVersion,
      });
      toast.success(
        isEn ? "Room Updated" : "تم تحديث الغرفة",
        isEn ? `Room "${trimmedName}" updated successfully.` : `تم تحديث بيانات الغرفة "${trimmedName}" بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#1167c9]">
              <Bed size={17} />
            </span>
            <h2 className="text-lg font-black">{isEn ? "Edit Room" : "تعديل بيانات الغرفة"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {floorOptions.length > 0 && (
            <div className="grid gap-1.5 text-xs font-bold">
              <span>{isEn ? "Floor" : "الدور"}</span>
              <SearchableSelect
                value={floorId}
                onChange={setFloorId}
                options={floorOptions}
                placeholder={isEn ? "Select Floor..." : "اختر الدور..."}
              />
            </div>
          )}

          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Room Name / Number" : "اسم أو رقم الغرفة"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? "e.g. 101" : "مثال: 101"}
              className={inputCls}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Bed Capacity" : "السعة الاستيعابية (الأسرّة)"} <span className="text-rose-500">*</span>
            </span>
            <input
              type="number"
              min={Math.max(1, room.currentOccupancy)}
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={inputCls}
            />
            <p className="text-[11px] text-[var(--muted)] font-medium">
              {isEn
                ? `Current occupancy: ${room.currentOccupancy} beds. Capacity cannot be less than this.`
                : `عدد السكان الحاليين: ${room.currentOccupancy}. لا يمكن تقليل السعة عن هذا الرقم.`}
            </p>
          </label>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>{isEn ? "Room Notes (optional)" : "ملاحظات الغرفة (اختياري)"}</span>
            <textarea
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? "e.g. Contains 4 bunk beds" : "مثال: موجود بها 4 سراير"}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-medium outline-none focus:border-[#1167c9]"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEn ? "Save Changes" : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 3. ARCHIVE ROOM MODAL ====================

interface ArchiveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function ArchiveRoomModal({
  isOpen,
  onClose,
  room,
  onSuccess,
  isEn,
}: ArchiveRoomModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !room) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!room) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError(isEn ? "Archive reason is required" : "سبب الأرشفة مطلوب");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await archiveRoom(room.id, trimmedReason, room.rowVersion);
      toast.success(
        isEn ? "Room Archived" : "تمت أرشفة الغرفة",
        isEn ? `Room "${room.name}" has been archived.` : `تمت أرشفة الغرفة "${room.name}" بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-rose-600">
            <Archive size={18} />
            <h2 className="text-lg font-black">{isEn ? "Archive Room" : "أرشفة الغرفة"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--muted)] font-medium leading-relaxed">
          {isEn
            ? `Are you sure you want to archive Room "${room.name}"? The room must have zero occupants.`
            : `هل أنت متأكد من أرشفة الغرفة "${room.name}"؟ يجب ألا تحتوي الغرفة على سكان حاليين.`}
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Reason for closing/archiving" : "سبب الإغلاق أو الأرشفة"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEn ? "e.g. Room under permanent conversion" : "مثال: إغلاق الغرفة للصيانة الشاملة"}
              className={inputCls}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isEn ? "Confirm Archive" : "تأكيد الأرشفة"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 4. ASSIGN OCCUPANT MODAL (IQAMA, RIDER, EMPLOYEE, EXTERNAL) ====================

interface AssignOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  initialRoomId?: string;
  rooms: Room[];
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

type AssignMode = "iqama" | "rider" | "employee" | "external";

export function AssignOccupantModal({
  isOpen,
  onClose,
  housingId,
  initialRoomId,
  rooms,
  onSuccess,
  isEn,
}: AssignOccupantModalProps) {
  const [mode, setMode] = useState<AssignMode>("iqama");
  const [roomId, setRoomId] = useState("");
  const [iqamaNo, setIqamaNo] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [externalName, setExternalName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [moveInReason, setMoveInReason] = useState("");
  const [sourceReference, setSourceReference] = useState("");

  const [employees, setEmployees] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRoomId(initialRoomId || rooms.find((r) => r.availableCapacity > 0)?.id || rooms[0]?.id || "");
      setIqamaNo("");
      setSelectedPersonId("");
      setExternalName("");
      setEffectiveFrom(new Date().toISOString().split("T")[0]);
      setMoveInReason("");
      setSourceReference("");
      setError("");
      void loadPeople();
    }
  }, [isOpen, initialRoomId, rooms]);

  async function loadPeople() {
    setLoadingData(true);
    try {
      const [empRes, riderRes] = await Promise.allSettled([
        authFetch<any[]>("/api/employees"),
        authFetch<any[]>("/api/riders"),
      ]);
      if (empRes.status === "fulfilled") setEmployees(empRes.value || []);
      if (riderRes.status === "fulfilled") setRiders(riderRes.value || []);
    } finally {
      setLoadingData(false);
    }
  }

  const roomOptions: SelectOption[] = useMemo(
    () =>
      rooms.map((r) => {
        const isFull = r.availableCapacity <= 0;
        return {
          value: r.id,
          label: isEn ? `Room ${r.name}` : `غرفة ${r.name}`,
          sublabel: isFull
            ? isEn ? "Full (0 beds vacant)" : "مكتملة (0 سرير متاح)"
            : isEn ? `${r.availableCapacity} beds available` : `${r.availableCapacity} أسرّة شاغرة`,
          disabled: isFull && mode !== "iqama", // Allow selecting full room for Iqama if converting pending in that room
        };
      }),
    [rooms, isEn, mode]
  );

  const riderOptions: SelectOption[] = useMemo(
    () =>
      riders.map((rd) => ({
        value: rd.id,
        label: isEn ? rd.fullNameEn || rd.fullNameAr : rd.fullNameAr,
        sublabel: rd.iqamaNo ? `${isEn ? "Iqama" : "إقامة"}: ${rd.iqamaNo}` : undefined,
        keywords: `${rd.fullNameAr} ${rd.fullNameEn || ""} ${rd.iqamaNo || ""}`,
      })),
    [riders, isEn]
  );

  const employeeOptions: SelectOption[] = useMemo(
    () =>
      employees
        .filter((e) => e.isEmployee !== false)
        .map((e) => ({
          value: e.id,
          label: isEn ? e.fullNameEn || e.fullNameAr : e.fullNameAr,
          sublabel: e.iqamaNo ? `${isEn ? "Iqama" : "إقامة"}: ${e.iqamaNo}` : undefined,
          keywords: `${e.fullNameAr} ${e.fullNameEn || ""} ${e.iqamaNo || ""}`,
        })),
    [employees, isEn]
  );

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!roomId) {
      setError(isEn ? "Please select a target room" : "يرجى اختيار الغرفة المستهدفة");
      return;
    }

    const targetRoom = rooms.find((r) => r.id === roomId);

    setError("");
    setBusy(true);

    try {
      if (mode === "iqama") {
        const trimmedIqama = iqamaNo.trim();
        if (!trimmedIqama) {
          setError(isEn ? "Iqama number is required" : "رقم الإقامة مطلوب");
          setBusy(false);
          return;
        }
        if (!effectiveFrom) {
          setError(isEn ? "Effective date is required" : "تاريخ التسكين مطلوب");
          setBusy(false);
          return;
        }

        await assignByIqama(roomId, {
          iqamaNo: trimmedIqama,
          effectiveFrom,
          moveInReason: moveInReason.trim() || null,
          sourceReference: sourceReference.trim() || null,
        });

        toast.success(
          isEn ? "Occupant Assigned by Iqama" : "تم التسكين برقم الإقامة",
          isEn
            ? "Resident assigned (or matched to pending record) successfully."
            : "تم تسكين الساكن (أو مطابقة السجل المعلق) بنجاح."
        );
      } else if (mode === "rider") {
        if (!selectedPersonId) {
          setError(isEn ? "Please select a rider" : "يرجى اختيار السائق");
          setBusy(false);
          return;
        }
        if (!effectiveFrom) {
          setError(isEn ? "Effective date is required" : "تاريخ التسكين مطلوب");
          setBusy(false);
          return;
        }
        if (targetRoom && targetRoom.availableCapacity <= 0) {
          setError(isEn ? "The selected room is full" : "الغرفة المختارة مكتملة السعة");
          setBusy(false);
          return;
        }

        await assignRiderToRoom(roomId, {
          riderProfileId: selectedPersonId,
          effectiveFrom,
          moveInReason: moveInReason.trim() || null,
          sourceReference: sourceReference.trim() || null,
        });
        toast.success(isEn ? "Rider Assigned" : "تم تسكين السائق بنجاح");
      } else if (mode === "employee") {
        if (!selectedPersonId) {
          setError(isEn ? "Please select an employee" : "يرجى اختيار الموظف");
          setBusy(false);
          return;
        }
        if (!effectiveFrom) {
          setError(isEn ? "Effective date is required" : "تاريخ التسكين مطلوب");
          setBusy(false);
          return;
        }
        if (targetRoom && targetRoom.availableCapacity <= 0) {
          setError(isEn ? "The selected room is full" : "الغرفة المختارة مكتملة السعة");
          setBusy(false);
          return;
        }

        await assignEmployeeToRoom(roomId, {
          employeeId: selectedPersonId,
          effectiveFrom,
          moveInReason: moveInReason.trim() || null,
          sourceReference: sourceReference.trim() || null,
        });
        toast.success(isEn ? "Employee Assigned" : "تم تسكين الموظف بنجاح");
      } else if (mode === "external") {
        const trimmedName = externalName.trim();
        if (!trimmedName) {
          setError(isEn ? "Occupant name is required" : "اسم الساكن الخارجي مطلوب");
          setBusy(false);
          return;
        }
        if (targetRoom && targetRoom.availableCapacity <= 0) {
          setError(isEn ? "The selected room is full" : "الغرفة المختارة مكتملة السعة");
          setBusy(false);
          return;
        }

        await addExternalOccupant(roomId, { name: trimmedName });
        toast.success(
          isEn ? "External Occupant Added" : "تمت إضافة الساكن الخارجي",
          isEn ? `Added "${trimmedName}" to room.` : `تمت إضافة الساكن "${trimmedName}" بنجاح.`
        );
      }

      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#1167c9]">
              <User size={18} />
            </span>
            <h2 className="text-lg font-black">{isEn ? "Assign Person to Room" : "تسكين فرد في غرفة"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4 Mode Tabs */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl border border-[var(--border)] p-1 bg-[var(--subtle-bg)]">
          <button
            type="button"
            onClick={() => {
              setMode("iqama");
              setError("");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all ${
              mode === "iqama"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Hash size={13} />
            <span>{isEn ? "By Iqama" : "برقم الإقامة"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("rider");
              setError("");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all ${
              mode === "rider"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Bike size={13} />
            <span>{isEn ? "Rider" : "سائق"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("employee");
              setError("");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all ${
              mode === "employee"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Briefcase size={13} />
            <span>{isEn ? "Employee" : "موظف"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("external");
              setError("");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all ${
              mode === "external"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <User size={13} />
            <span>{isEn ? "External" : "خارجي (اسم)"}</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Room */}
          <div className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Target Room" : "الغرفة المستهدفة"} <span className="text-rose-500">*</span>
            </span>
            <SearchableSelect
              value={roomId}
              onChange={setRoomId}
              options={roomOptions}
              placeholder={isEn ? "Select Room..." : "اختر الغرفة..."}
              searchPlaceholder={isEn ? "Search room..." : "بحث عن غرفة..."}
              required
            />
          </div>

          {/* Mode 1: Assign by Iqama */}
          {mode === "iqama" && (
            <div className="space-y-4">
              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Iqama / National ID Number" : "رقم الإقامة / الهوية الوطنية"} <span className="text-rose-500">*</span>
                </span>
                <input
                  required
                  value={iqamaNo}
                  onChange={(e) => setIqamaNo(e.target.value)}
                  placeholder="2XXXXXXXXX"
                  className={inputCls}
                />
                <p className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200 dark:border-blue-900/60 leading-relaxed font-normal">
                  {isEn
                    ? "If this Iqama matches a pending occupant in this room, it will convert them to a linked occupant without consuming an extra bed. Otherwise it creates a new assignment."
                    : "إذا كان رقم الإقامة هذا يطابق شخصاً بانتظار المطابقة في هذه الغرفة، فسيتم اعتماده كساكن نظامي دون استهلاك سرير إضافي. خلاف ذلك سيتم تسكين شخص جديد واستهلاك سرير شاغر."}
                </p>
              </label>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Effective Start Date" : "تاريخ بداية التسكين"} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  required
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className={inputCls}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold">
                  <span>{isEn ? "Move-in Reason" : "سبب التسكين"}</span>
                  <input
                    value={moveInReason}
                    onChange={(e) => setMoveInReason(e.target.value)}
                    placeholder={isEn ? "e.g. Regular assignment" : "مثال: تسكين جديد"}
                    className={inputCls}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold">
                  <span>{isEn ? "Reference" : "المرجع"}</span>
                  <input
                    value={sourceReference}
                    onChange={(e) => setSourceReference(e.target.value)}
                    placeholder="e.g. Workbook / REQ-101"
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Mode 2: Assign Rider */}
          {mode === "rider" && (
            <div className="space-y-4">
              <div className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Select Delivery Rider" : "اختر سائق التوصيل"} <span className="text-rose-500">*</span>
                </span>
                <SearchableSelect
                  value={selectedPersonId}
                  onChange={setSelectedPersonId}
                  options={riderOptions}
                  placeholder={loadingData ? (isEn ? "Loading riders..." : "جاري التحميل...") : (isEn ? "Search and select rider..." : "ابحث واختر السائق...")}
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
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className={inputCls}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold">
                  <span>{isEn ? "Move-in Reason" : "سبب التسكين"}</span>
                  <input
                    value={moveInReason}
                    onChange={(e) => setMoveInReason(e.target.value)}
                    placeholder={isEn ? "e.g. Fleet rider housing" : "مثال: تسكين أسطول"}
                    className={inputCls}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold">
                  <span>{isEn ? "Reference" : "المرجع"}</span>
                  <input
                    value={sourceReference}
                    onChange={(e) => setSourceReference(e.target.value)}
                    placeholder="e.g. FLT-202"
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Mode 3: Assign Employee */}
          {mode === "employee" && (
            <div className="space-y-4">
              <div className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Select Employee" : "اختر الموظف"} <span className="text-rose-500">*</span>
                </span>
                <SearchableSelect
                  value={selectedPersonId}
                  onChange={setSelectedPersonId}
                  options={employeeOptions}
                  placeholder={loadingData ? (isEn ? "Loading employees..." : "جاري التحميل...") : (isEn ? "Search and select employee..." : "ابحث واختر الموظف...")}
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
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className={inputCls}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold">
                  <span>{isEn ? "Move-in Reason" : "سبب التسكين"}</span>
                  <input
                    value={moveInReason}
                    onChange={(e) => setMoveInReason(e.target.value)}
                    placeholder={isEn ? "e.g. Staff assignment" : "مثال: تسكين موظف"}
                    className={inputCls}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold">
                  <span>{isEn ? "Reference" : "المرجع"}</span>
                  <input
                    value={sourceReference}
                    onChange={(e) => setSourceReference(e.target.value)}
                    placeholder="e.g. HR-101"
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Mode 4: Add Name-Only External Person */}
          {mode === "external" && (
            <div className="space-y-4">
              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Person Full Name" : "اسم الشخص الكامل (بالاسم فقط)"} <span className="text-rose-500">*</span>
                </span>
                <input
                  required
                  maxLength={200}
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  placeholder={isEn ? "e.g. Mohamed Saied" : "مثال: محمد سعيد"}
                  className={inputCls}
                />
                <p className="text-[11px] text-[var(--muted)] font-medium">
                  {isEn
                    ? "External occupants are stored with a name only and have no employee or Iqama link. They consume 1 bed in this room."
                    : "الساكن الخارجي يُسجل بالاسم فقط دون ربط موظف أو إقامة، ويستهلك سريراً واحداً في هذه الغرفة."}
                </p>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEn ? "Confirm Assignment" : "تأكيد التسكين"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 5. EDIT / MOVE EXTERNAL OCCUPANT MODAL ====================

interface EditExternalOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: Room | null;
  occupant: ExternalOccupant | null;
  rooms: Room[];
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function EditExternalOccupantModal({
  isOpen,
  onClose,
  currentRoom,
  occupant,
  rooms,
  onSuccess,
  isEn,
}: EditExternalOccupantModalProps) {
  const [name, setName] = useState("");
  const [destinationRoomId, setDestinationRoomId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && occupant && currentRoom) {
      setName(occupant.name || "");
      setDestinationRoomId(occupant.roomId || currentRoom.id);
      setError("");
    }
  }, [isOpen, occupant, currentRoom]);

  if (!isOpen || !occupant || !currentRoom) return null;

  const roomOptions: SelectOption[] = rooms.map((r) => {
    const isCurrent = r.id === currentRoom.id;
    const isFull = r.availableCapacity <= 0 && !isCurrent;
    return {
      value: r.id,
      label: isEn ? `Room ${r.name}` : `غرفة ${r.name}`,
      sublabel: isCurrent
        ? isEn ? "Current Room" : "الغرفة الحالية"
        : isFull
        ? isEn ? "Full (0 vacant)" : "مكتملة (0 متاح)"
        : isEn ? `${r.availableCapacity} beds vacant` : `${r.availableCapacity} أسرّة شاغرة`,
      disabled: isFull,
    };
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!occupant) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(isEn ? "Name is required" : "اسم الساكن مطلوب");
      return;
    }
    if (!destinationRoomId) {
      setError(isEn ? "Room is required" : "يرجى تحديد الغرفة");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await updateExternalOccupant(occupant.id, {
        name: trimmedName,
        roomId: destinationRoomId,
        rowVersion: occupant.rowVersion,
      });
      toast.success(
        isEn ? "External Occupant Updated" : "تم تحديث الساكن الخارجي",
        isEn ? "Occupant details and room location updated." : "تم تحديث بيانات الساكن وموقع الغرفة بنجاح."
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <User size={18} className="text-[#1167c9]" />
            <h2 className="text-lg font-black">{isEn ? "Edit External Occupant" : "تعديل الساكن الخارجي"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Occupant Name" : "اسم الساكن"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Room (Move if changed)" : "الغرفة (يتم النقل في حال تغييرها)"} <span className="text-rose-500">*</span>
            </span>
            <SearchableSelect
              value={destinationRoomId}
              onChange={setDestinationRoomId}
              options={roomOptions}
              placeholder={isEn ? "Select room..." : "اختر الغرفة..."}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEn ? "Save Changes" : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 6. REMOVE EXTERNAL OCCUPANT MODAL ====================

interface RemoveExternalOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  occupant: ExternalOccupant | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function RemoveExternalOccupantModal({
  isOpen,
  onClose,
  room,
  occupant,
  onSuccess,
  isEn,
}: RemoveExternalOccupantModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !occupant || !room) return null;

  async function handleConfirm() {
    if (!occupant) return;
    setError("");
    setBusy(true);

    try {
      await removeExternalOccupant(occupant.id);
      toast.success(
        isEn ? "External Occupant Removed" : "تم حذف الساكن الخارجي",
        isEn ? `Removed "${occupant.name}" and freed 1 bed.` : `تم حذف الساكن "${occupant.name}" وإخلاء السرير.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-rose-600">
            <Trash2 size={18} />
            <h2 className="text-lg font-black">{isEn ? "Remove External Occupant" : "حذف الساكن الخارجي"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--muted)] font-medium leading-relaxed">
          {isEn
            ? `Are you sure you want to remove "${occupant.name}" from Room ${room.name}? This will free up 1 bed.`
            : `هل أنت متأكد من حذف الساكن "${occupant.name}" من الغرفة ${room.name}؟ سيؤدي ذلك لإخلاء سرير واحد.`}
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {isEn ? "Cancel" : "إلغاء"}
          </Button>
          <Button type="button" loading={busy} onClick={handleConfirm} className="bg-rose-600 hover:bg-rose-700 text-white">
            {isEn ? "Confirm Removal" : "تأكيد الحذف"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ==================== 7. RESOLVE PENDING OCCUPANT MODAL ====================

interface ResolvePendingOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  occupant: PendingOccupant | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function ResolvePendingOccupantModal({
  isOpen,
  onClose,
  room,
  occupant,
  onSuccess,
  isEn,
}: ResolvePendingOccupantModalProps) {
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEffectiveFrom(new Date().toISOString().split("T")[0]);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !occupant || !room) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!occupant) return;
    if (!effectiveFrom) {
      setError(isEn ? "Effective date is required" : "تاريخ التسكين مطلوب");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await resolvePendingOccupant(occupant.id, { effectiveFrom });
      toast.success(
        isEn ? "Pending Match Resolved" : "تمت مطابقة الساكن بنجاح",
        isEn
          ? `Occupant "${occupant.name}" converted to linked employee occupant.`
          : `تم تحويل "${occupant.name}" إلى ساكن موظف معتمد بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-emerald-600">
            <UserCheck size={18} />
            <h2 className="text-lg font-black">{isEn ? "Resolve Pending Match" : "مطابقة واعتماد الساكن المعلق"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-1">
          <p className="font-extrabold text-sm">{occupant.name}</p>
          <p className="font-mono">
            {isEn ? "Iqama" : "رقم الإقامة"}: <strong>{occupant.iqamaNo}</strong>
          </p>
          {occupant.sourceRow && (
            <p className="text-[11px] opacity-80">
              {isEn ? `Source Row: #${occupant.sourceRow}` : `سطر السجل المصدر: #${occupant.sourceRow}`}
            </p>
          )}
          <p className="pt-1.5 border-t border-amber-200/80 text-[11px] leading-relaxed text-amber-900 dark:text-amber-300">
            {isEn
              ? "This action matches the workbook row with the existing employee record and converts it to a linked occupant. Room occupancy count remains unchanged."
              : "يقوم هذا الإجراء بمطابقة سطر السجل مع سجل الموظف المسجل برقم الإقامة وتحويله إلى ساكن رسمي. لا تتغير نسبة الإشغال لأن الساكن كان محسوباً بالفعل."}
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Effective Start Date" : "تاريخ بداية التسكين المعتمد"} <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isEn ? "Confirm & Resolve" : "تأكيد المطابقة"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 8. REMOVE PENDING OCCUPANT MODAL ====================

interface RemovePendingOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  occupant: PendingOccupant | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function RemovePendingOccupantModal({
  isOpen,
  onClose,
  room,
  occupant,
  onSuccess,
  isEn,
}: RemovePendingOccupantModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !occupant || !room) return null;

  async function handleConfirm() {
    if (!occupant) return;
    setError("");
    setBusy(true);

    try {
      await removePendingOccupant(occupant.id);
      toast.success(
        isEn ? "Pending Row Removed" : "تم حذف السجل المعلق",
        isEn ? `Removed unmatched record "${occupant.name}" and freed 1 bed.` : `تم حذف السجل المعلق "${occupant.name}" وإخلاء سرير واحد.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-rose-600">
            <Trash2 size={18} />
            <h2 className="text-lg font-black">{isEn ? "Remove Pending Occupant" : "حذف السجل المعلق"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--muted)] font-medium leading-relaxed">
          {isEn
            ? `Are you sure you want to remove the unmatched pending occupant "${occupant.name}" (Iqama: ${occupant.iqamaNo})? This will reduce room occupancy and free up 1 bed.`
            : `هل أنت متأكد من حذف السجل المعلق "${occupant.name}" (الإقامة: ${occupant.iqamaNo})؟ سيؤدي ذلك لإنقاص نسبة الإشغال وإتاحة سرير شاغر.`}
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {isEn ? "Cancel" : "إلغاء"}
          </Button>
          <Button type="button" loading={busy} onClick={handleConfirm} className="bg-rose-600 hover:bg-rose-700 text-white">
            {isEn ? "Confirm Removal" : "تأكيد الحذف"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ==================== 9. MOVE OCCUPANT MODAL ====================

interface MoveOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRoom: Room | null;
  occupant: CurrentOccupant | null;
  currentHousingId: string;
  housings: Housing[];
  currentRooms: Room[];
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function MoveOccupantModal({
  isOpen,
  onClose,
  sourceRoom,
  occupant,
  currentHousingId,
  housings,
  currentRooms,
  onSuccess,
  isEn,
}: MoveOccupantModalProps) {
  const [targetHousingId, setTargetHousingId] = useState(currentHousingId);
  const [destinationRoomId, setDestinationRoomId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");

  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && occupant) {
      setTargetHousingId(currentHousingId);
      setDestinationRoomId("");
      setEffectiveFrom(new Date().toISOString().split("T")[0]);
      setReason("");
      setError("");
      setAvailableRooms(currentRooms);
    }
  }, [isOpen, occupant, currentHousingId, currentRooms]);

  useEffect(() => {
    if (!isOpen || !targetHousingId) return;

    if (targetHousingId === currentHousingId) {
      setAvailableRooms(currentRooms);
      return;
    }

    let active = true;
    setLoadingRooms(true);
    listRooms(targetHousingId)
      .then((rms) => {
        if (active) setAvailableRooms(rms || []);
      })
      .catch(() => {
        if (active) setAvailableRooms([]);
      })
      .finally(() => {
        if (active) setLoadingRooms(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, targetHousingId, currentHousingId, currentRooms]);

  const housingOptions: SelectOption[] = useMemo(
    () =>
      housings.map((h) => ({
        value: h.id,
        label: isEn ? h.nameEn || h.nameAr : h.nameAr,
        sublabel: h.code,
      })),
    [housings, isEn]
  );

  const destinationRoomOptions: SelectOption[] = useMemo(
    () =>
      availableRooms
        .filter((r) => r.id !== sourceRoom?.id)
        .map((r) => {
          const isFull = r.availableCapacity <= 0;
          return {
            value: r.id,
            label: isEn ? `Room ${r.name}` : `غرفة ${r.name}`,
            sublabel: isFull
              ? isEn ? "Full (0 vacant)" : "مكتملة (0 متاح)"
              : isEn ? `${r.availableCapacity} beds available` : `${r.availableCapacity} أسرّة شاغرة`,
            disabled: isFull,
          };
        }),
    [availableRooms, sourceRoom, isEn]
  );

  if (!isOpen || !occupant || !sourceRoom) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!occupant) return;
    if (!destinationRoomId) {
      setError(isEn ? "Please select a destination room" : "يرجى اختيار الغرفة الوجهة");
      return;
    }
    if (destinationRoomId === sourceRoom?.id) {
      setError(isEn ? "Destination room must be different" : "الغرفة الوجهة يجب أن تختلف عن الغرفة الحالية");
      return;
    }
    if (!effectiveFrom) {
      setError(isEn ? "Effective date is required" : "تاريخ النقل مطلوب");
      return;
    }
    if (new Date(effectiveFrom) <= new Date(occupant.effectiveFrom)) {
      setError(
        isEn
          ? `Move date must be later than the resident's start date (${occupant.effectiveFrom})`
          : `تاريخ النقل يجب أن يكون بعد تاريخ بداية التسكين (${occupant.effectiveFrom})`
      );
      return;
    }
    if (!reason.trim()) {
      setError(isEn ? "Reason for move is required" : "سبب النقل مطلوب");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await moveOccupant(occupant.occupancyPeriodId, {
        destinationRoomId,
        effectiveFrom,
        reason: reason.trim(),
      });
      toast.success(
        isEn ? "Resident Moved" : "تم نقل الساكن",
        isEn ? "Resident transferred to destination room successfully." : "تم نقل الساكن إلى الغرفة الجديدة بنجاح."
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  const displayName = isEn
    ? occupant.employeeNameEn || occupant.employeeNameAr || "Occupant"
    : occupant.employeeNameAr || occupant.employeeNameEn || "ساكن";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-[#1167c9]">
            <ArrowRightLeft size={18} />
            <h2 className="text-lg font-black">{isEn ? "Move Resident" : "نقل الساكن لغرفة أخرى"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3.5 rounded-xl border border-blue-200/70 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30 p-3 text-xs">
          <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
            {displayName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)] font-medium">
            <span>
              {isEn ? "Current Room:" : "الغرفة الحالية:"} <strong>{sourceRoom.name}</strong>
            </span>
            <span>
              {isEn ? "Since:" : "بداية التسكين:"} <strong>{occupant.effectiveFrom}</strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-1.5 text-xs font-bold">
            <span>{isEn ? "Destination Housing Facility" : "موقع السكن الوجهة"}</span>
            <SearchableSelect
              value={targetHousingId}
              onChange={(val) => {
                setTargetHousingId(val);
                setDestinationRoomId("");
              }}
              options={housingOptions}
              placeholder={isEn ? "Select Housing..." : "اختر السكن..."}
            />
          </div>

          <div className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Destination Room" : "الغرفة الوجهة"} <span className="text-rose-500">*</span>
            </span>
            <SearchableSelect
              value={destinationRoomId}
              onChange={setDestinationRoomId}
              options={destinationRoomOptions}
              placeholder={
                loadingRooms
                  ? isEn ? "Loading rooms..." : "جاري تحميل الغرف..."
                  : isEn ? "Select Destination Room..." : "اختر الغرفة الوجهة..."
              }
              required
            />
          </div>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Effective Move Date" : "تاريخ النقل الفعلي"} <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className={inputCls}
            />
            <p className="text-[11px] text-[var(--muted)] font-medium">
              {isEn
                ? "Destination bed is reserved; source bed is released automatically on the previous day."
                : "يتم حجز السرير في الغرفة الجديدة وإخلاء السرير القديم تلقائياً باليوم السابق."}
            </p>
          </label>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Reason for Transfer" : "سبب النقل"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEn ? "e.g. Relocated to another floor" : "مثال: تغيير الغرفة لترتيب السعة"}
              className={inputCls}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEn ? "Confirm Move" : "تأكيد النقل"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 10. REMOVE OCCUPANT MODAL ====================

interface RemoveOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRoom: Room | null;
  occupant: CurrentOccupant | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function RemoveOccupantModal({
  isOpen,
  onClose,
  sourceRoom,
  occupant,
  onSuccess,
  isEn,
}: RemoveOccupantModalProps) {
  const [effectiveTo, setEffectiveTo] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && occupant) {
      setEffectiveTo(new Date().toISOString().split("T")[0]);
      setReason("");
      setError("");
    }
  }, [isOpen, occupant]);

  if (!isOpen || !occupant || !sourceRoom) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!occupant) return;
    if (!effectiveTo) {
      setError(isEn ? "Checkout date is required" : "تاريخ الخروج مطلوب");
      return;
    }
    if (new Date(effectiveTo) < new Date(occupant.effectiveFrom)) {
      setError(
        isEn
          ? `End date cannot be earlier than start date (${occupant.effectiveFrom})`
          : `تاريخ الخروج لا يمكن أن يكون قبل تاريخ بداية التسكين (${occupant.effectiveFrom})`
      );
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError(isEn ? "Reason is required" : "سبب الخروج مطلوب");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await removeOccupant(occupant.occupancyPeriodId, {
        effectiveTo,
        reason: trimmedReason,
      });
      toast.success(
        isEn ? "Occupant Checked Out" : "تم إنهاء التسكين",
        isEn ? "Resident removed and room bed released." : "تم إنهاء التسكين وإخلاء السرير بنجاح."
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  const displayName = isEn
    ? occupant.employeeNameEn || occupant.employeeNameAr || "Occupant"
    : occupant.employeeNameAr || occupant.employeeNameEn || "ساكن";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-rose-600">
            <LogOut size={18} />
            <h2 className="text-lg font-black">{isEn ? "Resident Check-Out" : "إنهاء تسكين الساكن"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
          <p className="font-extrabold text-sm">{displayName}</p>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">
            {isEn ? `Room ${sourceRoom.name} · Since ${occupant.effectiveFrom}` : `غرفة ${sourceRoom.name} · منذ ${occupant.effectiveFrom}`}
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Check-Out Date" : "تاريخ المغادرة / الخروج"} <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              required
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              className={inputCls}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Reason for Departure" : "سبب الخروج / المغادرة"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEn ? "e.g. Resignation or moved to external housing" : "مثال: انتهاء الخدمة أو السكن خارجياً"}
              className={inputCls}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isEn ? "Confirm Check-Out" : "تأكيد الخروج"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 11. CREATE / RENAME FLOOR MODAL ====================

interface FloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  floor: Floor | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function FloorModal({
  isOpen,
  onClose,
  housingId,
  floor,
  onSuccess,
  isEn,
}: FloorModalProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(floor);

  useEffect(() => {
    if (isOpen) {
      setName(floor?.name || "");
      setError("");
    }
  }, [isOpen, floor]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(isEn ? "Floor name is required" : "اسم أو رقم الدور مطلوب");
      return;
    }
    if (trimmed.length > 100) {
      setError(isEn ? "Floor name cannot exceed 100 characters" : "اسم الدور يجب ألا يتجاوز 100 حرف");
      return;
    }

    setError("");
    setBusy(true);

    try {
      if (isEditing && floor) {
        await updateFloor(housingId, floor.id, {
          name: trimmed,
          rowVersion: floor.rowVersion,
        });
        toast.success(
          isEn ? "Floor Renamed" : "تم تعديل اسم الدور",
          isEn ? `Floor renamed to "${trimmed}".` : `تم تعديل اسم الدور إلى "${trimmed}".`
        );
      } else {
        await createFloor(housingId, {
          name: trimmed,
          rowVersion: null,
        });
        toast.success(
          isEn ? "Floor Created" : "تمت إضافة الدور",
          isEn ? `Floor "${trimmed}" created.` : `تمت إضافة الدور "${trimmed}" بنجاح.`
        );
      }
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#1167c9]">
              <Layers size={18} />
            </span>
            <h2 className="text-lg font-black">
              {isEditing
                ? isEn ? "Rename Floor" : "تعديل اسم الدور"
                : isEn ? "Add New Floor" : "إضافة دور جديد"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Floor Name / Number" : "اسم أو رقم الدور"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? "e.g. 1 or Ground Floor" : "مثال: 1 أو الدور الأرضي"}
              className={inputCls}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEditing ? (isEn ? "Save Changes" : "حفظ التعديل") : (isEn ? "Create Floor" : "إضافة الدور")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 12. ARCHIVE FLOOR MODAL ====================

interface ArchiveFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  floor: Floor | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function ArchiveFloorModal({
  isOpen,
  onClose,
  floor,
  onSuccess,
  isEn,
}: ArchiveFloorModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !floor) return null;

  const hasRooms = (floor.rooms && floor.rooms.length > 0) || false;
  const hasEquipment = (floor.equipment && floor.equipment.length > 0) || false;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!floor) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(isEn ? "Archive reason is required" : "سبب الأرشفة مطلوب");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await archiveFloor(floor.id, trimmed, floor.rowVersion);
      toast.success(
        isEn ? "Floor Archived" : "تمت أرشفة الدور",
        isEn ? `Floor "${floor.name}" has been archived.` : `تمت أرشفة الدور "${floor.name}" بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-rose-600">
            <Archive size={18} />
            <h2 className="text-lg font-black">{isEn ? "Archive Floor" : "أرشفة الدور"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--muted)] font-medium leading-relaxed">
          {isEn
            ? `Are you sure you want to archive Floor "${floor.name}"? Active rooms or floor equipment must be removed or moved first.`
            : `هل أنت متأكد من أرشفة الدور "${floor.name}"؟ يجب أرشفة الغرف وحذف عهد الدور أولاً.`}
        </p>

        {(hasRooms || hasEquipment) && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800 border border-amber-200">
            {hasRooms && (
              <p>
                • {isEn ? `Floor contains ${floor.rooms?.length} active room(s).` : `يحتوي الدور على ${floor.rooms?.length} غرفة نشطة.`}
              </p>
            )}
            {hasEquipment && (
              <p>
                • {isEn ? `Floor contains ${floor.equipment?.length} equipment item(s).` : `يحتوي الدور على ${floor.equipment?.length} صنف عهدة.`}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Archive Reason" : "سبب الأرشفة"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEn ? "e.g. Floor under renovation" : "مثال: إغلاق الدور للصيانة"}
              className={inputCls}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isEn ? "Confirm Archive" : "تأكيد الأرشفة"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 13. ADD / EDIT EQUIPMENT MODAL (FLOOR OR ROOM) ====================

export type EquipmentModalTarget =
  | { type: "floor"; floorId: string; floorName: string }
  | { type: "room"; roomId: string; roomName: string };

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: EquipmentModalTarget | null;
  initialItem: EquipmentItem | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function EquipmentModal({
  isOpen,
  onClose,
  target,
  initialItem,
  onSuccess,
  isEn,
}: EquipmentModalProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(initialItem);

  useEffect(() => {
    if (isOpen) {
      setName(initialItem?.name || "");
      setQuantity(String(initialItem?.quantity ?? 1));
      setError("");
    }
  }, [isOpen, initialItem]);

  if (!isOpen || !target) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(isEn ? "Equipment name is required" : "اسم العهدة مطلوب");
      return;
    }
    if (trimmed.length > 100) {
      setError(isEn ? "Name cannot exceed 100 characters" : "الاسم يجب ألا يتجاوز 100 حرف");
      return;
    }
    const qNum = parseInt(quantity, 10);
    if (isNaN(qNum) || qNum < 0) {
      setError(isEn ? "Quantity must be an integer ≥ 0" : "الكمية يجب أن تكون عدداً صحيحاً أكبر من أو يساوي صفر");
      return;
    }

    setError("");
    setBusy(true);

    try {
      if (target.type === "floor") {
        if (isEditing && initialItem) {
          await updateFloorEquipment(target.floorId, initialItem.id, {
            name: trimmed,
            quantity: qNum,
            rowVersion: initialItem.rowVersion,
          });
        } else {
          await addFloorEquipment(target.floorId, {
            name: trimmed,
            quantity: qNum,
            rowVersion: null,
          });
        }
      } else {
        if (isEditing && initialItem) {
          await updateRoomEquipment(target.roomId, initialItem.id, {
            name: trimmed,
            quantity: qNum,
            rowVersion: initialItem.rowVersion,
          });
        } else {
          await addRoomEquipment(target.roomId, {
            name: trimmed,
            quantity: qNum,
            rowVersion: null,
          });
        }
      }

      toast.success(
        isEditing
          ? isEn ? "Equipment Updated" : "تم تحديث العهدة"
          : isEn ? "Equipment Added" : "تمت إضافة العهدة",
        isEn ? `"${trimmed}" (${qNum}) saved.` : `تم حفظ "${trimmed}" (عدد: ${qNum}) بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  const targetLabel =
    target.type === "floor"
      ? isEn ? `Floor ${target.floorName}` : `الدور ${target.floorName}`
      : isEn ? `Room ${target.roomName}` : `غرفة ${target.roomName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#1167c9]">
              <Wrench size={18} />
            </span>
            <h2 className="text-lg font-black">
              {isEditing
                ? isEn ? "Edit Equipment" : "تعديل بيانات العهدة"
                : isEn ? "Add Equipment" : "إضافة عهدة"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-2 text-xs text-[var(--muted)] font-medium">
          {isEn ? `Target: ${targetLabel}` : `الموقع: ${targetLabel}`}
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Equipment Item Name" : "اسم صنف العهدة"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? "e.g. Washing machine, Mattress, AC" : "مثال: غسالة، مرتبة، مكيف، سرير"}
              className={inputCls}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Quantity" : "الكمية"} <span className="text-rose-500">*</span>
            </span>
            <input
              type="number"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEditing ? (isEn ? "Save Changes" : "حفظ التعديلات") : (isEn ? "Add Item" : "إضافة العهدة")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ==================== 14. DELETE EQUIPMENT MODAL ====================

interface DeleteEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EquipmentItem | null;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function DeleteEquipmentModal({
  isOpen,
  onClose,
  item,
  onSuccess,
  isEn,
}: DeleteEquipmentModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !item) return null;

  async function handleConfirm() {
    if (!item) return;
    setError("");
    setBusy(true);

    try {
      await deleteEquipment(item.id);
      toast.success(
        isEn ? "Equipment Deleted" : "تم حذف العهدة",
        isEn ? `Deleted "${item.name}".` : `تم حذف صنف العهدة "${item.name}" بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(formatHousingError(err, isEn));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-rose-600">
            <Trash2 size={18} />
            <h2 className="text-lg font-black">{isEn ? "Delete Equipment" : "حذف العهدة"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--muted)] font-medium leading-relaxed">
          {isEn
            ? `Are you sure you want to delete "${item.name}" (Quantity: ${item.quantity})?`
            : `هل أنت متأكد من حذف عهدة "${item.name}" (الكمية: ${item.quantity})؟`}
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {isEn ? "Cancel" : "إلغاء"}
          </Button>
          <Button type="button" loading={busy} onClick={handleConfirm} className="bg-rose-600 hover:bg-rose-700 text-white">
            {isEn ? "Confirm Delete" : "تأكيد الحذف"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
