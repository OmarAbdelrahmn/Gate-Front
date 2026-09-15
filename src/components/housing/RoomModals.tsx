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
} from "lucide-react";
import {
  createRoom,
  updateRoom,
  archiveRoom,
  assignEmployeeToRoom,
  assignRiderToRoom,
  moveOccupant,
  removeOccupant,
  listRooms,
  type Room,
  type CurrentOccupant,
  type Housing,
} from "../../lib/housing/api";
import { authFetch } from "../../lib/auth/api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SearchableSelect, type SelectOption } from "../ui/SearchableSelect";
import { toast } from "../ui/Toast";

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition-all focus:border-[#1167c9] outline-none";

// ==================== 1. CREATE ROOM MODAL ====================

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  housingId,
  onSuccess,
  isEn,
}: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCapacity("4");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      });
      toast.success(
        isEn ? "Room Created" : "تم إنشاء الغرفة",
        isEn ? `Room "${trimmedName}" created with ${capNum} beds.` : `تم إنشاء غرفة "${trimmedName}" بسعة ${capNum} أسرّة بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(err?.message || (isEn ? "Failed to create room" : "تعذر إنشاء الغرفة"));
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
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Room Name / Number" : "اسم أو رقم الغرفة"} <span className="text-rose-500">*</span>
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? "e.g. 101 or Room A" : "مثال: 101 أو غرفة أ"}
              className={inputCls}
            />
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
            <p className="text-[11px] text-[var(--muted)] font-medium">
              {isEn
                ? "Total number of residents this room can accommodate."
                : "العدد الأقصى من السكان الذي يمكن للغرفة استيعابهم."}
            </p>
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
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

export function EditRoomModal({
  isOpen,
  onClose,
  room,
  onSuccess,
  isEn,
}: EditRoomModalProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && room) {
      setName(room.name || "");
      setCapacity(String(room.capacity || 1));
      setError("");
    }
  }, [isOpen, room]);

  if (!isOpen || !room) return null;

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
        rowVersion: room.rowVersion,
      });
      toast.success(
        isEn ? "Room Updated" : "تم تحديث الغرفة",
        isEn ? `Room "${trimmedName}" updated successfully.` : `تم تحديث بيانات الغرفة "${trimmedName}" بنجاح.`
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(err?.message || (isEn ? "Failed to update room" : "تعذر تحديث الغرفة"));
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
      setError(err?.message || (isEn ? "Failed to archive room" : "تعذر أرشفة الغرفة"));
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

// ==================== 4. ASSIGN OCCUPANT MODAL ====================

interface AssignOccupantModalProps {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  initialRoomId?: string;
  rooms: Room[];
  onSuccess: () => Promise<void>;
  isEn: boolean;
}

type SimpleEmployee = {
  id: string;
  fullNameAr: string;
  fullNameEn?: string | null;
  iqamaNo?: string | null;
  isEmployee?: boolean;
};

type SimpleRider = {
  id: string; // riderProfileId
  employeeId: string;
  fullNameAr: string;
  fullNameEn?: string | null;
  iqamaNo?: string | null;
};

export function AssignOccupantModal({
  isOpen,
  onClose,
  housingId,
  initialRoomId,
  rooms,
  onSuccess,
  isEn,
}: AssignOccupantModalProps) {
  const [personType, setPersonType] = useState<"Rider" | "Employee">("Rider");
  const [roomId, setRoomId] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [moveInReason, setMoveInReason] = useState("");
  const [sourceReference, setSourceReference] = useState("");

  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [riders, setRiders] = useState<SimpleRider[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRoomId(initialRoomId || (rooms.find((r) => r.availableCapacity > 0)?.id || ""));
      setSelectedPersonId("");
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
        authFetch<SimpleEmployee[]>("/api/employees"),
        authFetch<SimpleRider[]>("/api/riders"),
      ]);
      if (empRes.status === "fulfilled") setEmployees(empRes.value || []);
      if (riderRes.status === "fulfilled") setRiders(riderRes.value || []);
    } finally {
      setLoadingData(false);
    }
  }

  // Room Select Options
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
          disabled: isFull,
        };
      }),
    [rooms, isEn]
  );

  // Rider Select Options
  const riderOptions: SelectOption[] = useMemo(
    () =>
      riders.map((rd) => ({
        value: rd.id, // riderProfileId
        label: isEn ? rd.fullNameEn || rd.fullNameAr : rd.fullNameAr,
        sublabel: rd.iqamaNo ? `${isEn ? "Iqama" : "إقامة"}: ${rd.iqamaNo}` : undefined,
        keywords: `${rd.fullNameAr} ${rd.fullNameEn || ""} ${rd.iqamaNo || ""}`,
      })),
    [riders, isEn]
  );

  // Employee Select Options
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
      setError(isEn ? "Please select a target room" : "يرجى اختيار الغرفة");
      return;
    }
    if (!selectedPersonId) {
      setError(
        personType === "Rider"
          ? isEn ? "Please select a rider" : "يرجى اختيار السائق"
          : isEn ? "Please select an employee" : "يرجى اختيار الموظف"
      );
      return;
    }
    if (!effectiveFrom) {
      setError(isEn ? "Effective date is required" : "تاريخ التسكين مطلوب");
      return;
    }

    const targetRoom = rooms.find((r) => r.id === roomId);
    if (targetRoom && targetRoom.availableCapacity <= 0) {
      setError(isEn ? "The selected room is full" : "الغرفة المختارة مكتملة السعة");
      return;
    }

    setError("");
    setBusy(true);

    try {
      if (personType === "Rider") {
        await assignRiderToRoom(roomId, {
          riderProfileId: selectedPersonId,
          effectiveFrom,
          moveInReason: moveInReason.trim() || null,
          sourceReference: sourceReference.trim() || null,
        });
      } else {
        await assignEmployeeToRoom(roomId, {
          employeeId: selectedPersonId,
          effectiveFrom,
          moveInReason: moveInReason.trim() || null,
          sourceReference: sourceReference.trim() || null,
        });
      }

      toast.success(
        isEn ? "Occupant Assigned" : "تم التسكين بنجاح",
        isEn ? "Resident assigned to room successfully." : "تم تسكين الساكن في الغرفة بنجاح."
      );
      onClose();
      await onSuccess();
    } catch (err: any) {
      setError(err?.message || (isEn ? "Failed to assign occupant" : "تعذر التسكين"));
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
            <h2 className="text-lg font-black">{isEn ? "Assign Resident to Room" : "تسكين فرد في غرفة"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Person Type Selector Tabs */}
        <div className="mt-4 flex rounded-xl border border-[var(--border)] p-1 bg-[var(--subtle-bg)]">
          <button
            type="button"
            onClick={() => {
              setPersonType("Rider");
              setSelectedPersonId("");
              setError("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              personType === "Rider"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Bike size={14} />
            {isEn ? "Delivery Rider" : "سائق / مندوب توصيل"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPersonType("Employee");
              setSelectedPersonId("");
              setError("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              personType === "Employee"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Briefcase size={14} />
            {isEn ? "Administrative Staff" : "موظف إداري / تشغيلي"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Room Selection */}
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

          {/* Person Selection */}
          <div className="grid gap-1.5 text-xs font-bold">
            <span>
              {personType === "Rider"
                ? isEn ? "Select Rider" : "اختر السائق"
                : isEn ? "Select Employee" : "اختر الموظف"}{" "}
              <span className="text-rose-500">*</span>
            </span>
            <SearchableSelect
              value={selectedPersonId}
              onChange={setSelectedPersonId}
              options={personType === "Rider" ? riderOptions : employeeOptions}
              placeholder={
                loadingData
                  ? isEn ? "Loading list..." : "جاري التحميل..."
                  : personType === "Rider"
                  ? isEn ? "Search and select rider..." : "ابحث واختر السائق..."
                  : isEn ? "Search and select employee..." : "ابحث واختر الموظف..."
              }
              searchPlaceholder={isEn ? "Type name or Iqama..." : "اكتب الاسم أو رقم الإقامة..."}
              required
            />
          </div>

          {/* Effective Date */}
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Effective Move-in Date" : "تاريخ بداية التسكين"} <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className={inputCls}
            />
          </label>

          {/* Reason & Reference */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold">
              <span>{isEn ? "Move-in Reason" : "سبب التسكين"}</span>
              <input
                value={moveInReason}
                onChange={(e) => setMoveInReason(e.target.value)}
                placeholder={isEn ? "e.g. New assignment" : "مثال: تسكين جديد"}
                className={inputCls}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold">
              <span>{isEn ? "Reference Number" : "رقم المرجع / الطلب"}</span>
              <input
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                placeholder="e.g. REQ-102"
                className={inputCls}
              />
            </label>
          </div>

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

// ==================== 5. MOVE OCCUPANT MODAL ====================

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
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
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

  // When housing changes, load its rooms
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
        .filter((r) => r.id !== sourceRoom?.id) // Must differ from source room
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
      setError(err?.message || (isEn ? "Failed to move resident" : "تعذر نقل الساكن"));
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

        {/* Current Info Panel */}
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
          {/* Destination Housing Selector */}
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

          {/* Destination Room Selector */}
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

          {/* Effective Date */}
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

          {/* Reason */}
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

// ==================== 6. REMOVE OCCUPANT MODAL ====================

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
  const [effectiveTo, setEffectiveTo] = useState(new Date().toISOString().split("T")[0]);
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
      setError(err?.message || (isEn ? "Failed to remove resident" : "تعذر إنهاء التسكين"));
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
