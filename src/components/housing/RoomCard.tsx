"use client";

import React from "react";
import {
  Bed,
  Users,
  User,
  ArrowRightLeft,
  LogOut,
  Edit3,
  Archive,
  Plus,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Bike,
  Briefcase,
  Wrench,
  Trash2,
  UserCheck,
  HelpCircle,
  FileText,
} from "lucide-react";
import type {
  Room,
  CurrentOccupant,
  ExternalOccupant,
  PendingOccupant,
  EquipmentItem,
} from "../../lib/housing/api";
import { Button } from "../ui/Button";

interface RoomCardProps {
  room: Room;
  isEn: boolean;
  canManage: boolean;
  onAssignToRoom: (room: Room) => void;
  onEditRoom: (room: Room) => void;
  onArchiveRoom: (room: Room) => void;
  onMoveOccupant: (room: Room, occupant: CurrentOccupant) => void;
  onRemoveOccupant: (room: Room, occupant: CurrentOccupant) => void;
  onEditExternalOccupant?: (room: Room, occupant: ExternalOccupant) => void;
  onRemoveExternalOccupant?: (room: Room, occupant: ExternalOccupant) => void;
  onResolvePendingOccupant?: (room: Room, occupant: PendingOccupant) => void;
  onRemovePendingOccupant?: (room: Room, occupant: PendingOccupant) => void;
  onAddRoomEquipment?: (room: Room) => void;
  onEditRoomEquipment?: (room: Room, item: EquipmentItem) => void;
  onDeleteRoomEquipment?: (room: Room, item: EquipmentItem) => void;
}

export function RoomCard({
  room,
  isEn,
  canManage,
  onAssignToRoom,
  onEditRoom,
  onArchiveRoom,
  onMoveOccupant,
  onRemoveOccupant,
  onEditExternalOccupant,
  onRemoveExternalOccupant,
  onResolvePendingOccupant,
  onRemovePendingOccupant,
  onAddRoomEquipment,
  onEditRoomEquipment,
  onDeleteRoomEquipment,
}: RoomCardProps) {
  const isFull = room.availableCapacity <= 0;
  const occupancyPct =
    room.capacity > 0
      ? Math.min(100, Math.round((room.currentOccupancy / room.capacity) * 100))
      : 0;

  const totalOccupantsCount =
    (room.occupants?.length || 0) +
    (room.externalOccupants?.length || 0) +
    (room.pendingOccupants?.length || 0);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all hover:shadow-md">
      <div>
        {/* Room Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl font-black text-sm ${
                isFull
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                  : room.currentOccupancy > 0
                  ? "bg-blue-50 text-[#1167c9] dark:bg-blue-950/50 dark:text-blue-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              }`}
            >
              <Bed size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[var(--foreground)]">
                  {isEn ? `Room ${room.name}` : `غرفة ${room.name}`}
                </h3>
                {isFull ? (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                    {isEn ? "Full" : "مكتملة"}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {room.availableCapacity} {isEn ? "Vacant" : "شاغر"}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] font-semibold mt-0.5">
                {room.currentOccupancy} / {room.capacity}{" "}
                {isEn ? "Beds occupied" : "أسرّة مشغولة"}
              </p>
            </div>
          </div>

          {/* Quick Room Management Actions */}
          {canManage && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditRoom(room)}
                title={isEn ? "Edit Room / Capacity" : "تعديل الغرفة والسعة"}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => onArchiveRoom(room)}
                disabled={room.currentOccupancy > 0}
                title={
                  room.currentOccupancy > 0
                    ? isEn
                      ? "Cannot archive room with occupants"
                      : "لا يمكن أرشفة غرفة بها سكان حاليون"
                    : isEn
                    ? "Archive Room"
                    : "أرشفة الغرفة"
                }
                className={`grid h-8 w-8 place-items-center rounded-lg border transition-all ${
                  room.currentOccupancy > 0
                    ? "border-slate-200 text-slate-300 cursor-not-allowed opacity-40 dark:border-slate-800 dark:text-slate-600"
                    : "border-rose-100 text-rose-600 bg-rose-50/50 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40"
                }`}
              >
                <Archive size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Room Notes (if any) */}
        {room.notes && (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)] p-2 text-xs text-[var(--muted)]">
            <FileText size={13} className="shrink-0 mt-0.5 text-blue-500" />
            <span className="leading-snug">{room.notes}</span>
          </div>
        )}

        {/* Visual Bed Slot Representation */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted)]">
            <span>{isEn ? "Bed Allocation" : "توزيع الأسرّة"}</span>
            <span>{occupancyPct}%</span>
          </div>

          {/* Bed indicators pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {Array.from({ length: room.capacity }).map((_, idx) => {
              const isOccupied = idx < room.currentOccupancy;
              return (
                <div
                  key={idx}
                  title={
                    isOccupied
                      ? isEn
                        ? `Bed ${idx + 1}: Occupied`
                        : `سرير ${idx + 1}: مشغول`
                      : isEn
                      ? `Bed ${idx + 1}: Available`
                      : `سرير ${idx + 1}: متاح`
                  }
                  className={`flex h-6 flex-1 min-w-[28px] items-center justify-center rounded-md border text-[10px] font-black transition-all ${
                    isOccupied
                      ? "border-[#1167c9]/30 bg-[#1167c9] text-white shadow-xs"
                      : "border-dashed border-emerald-300 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                  }`}
                >
                  <Bed size={12} className="mr-0.5" />
                  <span>{idx + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Equipment Section */}
        <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--muted)] flex items-center gap-1">
              <Wrench size={12} className="text-slate-500" />
              {isEn ? "Room Equipment" : "تجهيزات الغرفة"}
              {room.equipment && room.equipment.length > 0 && (
                <span className="text-[10px] text-slate-400 font-semibold">
                  ({room.equipment.reduce((sum, e) => sum + e.quantity, 0)})
                </span>
              )}
            </span>
            {canManage && onAddRoomEquipment && (
              <button
                type="button"
                onClick={() => onAddRoomEquipment(room)}
                className="text-[11px] font-bold text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Plus size={11} />
                {isEn ? "Add" : "إضافة"}
              </button>
            )}
          </div>

          {room.equipment && room.equipment.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {room.equipment.map((eq) => (
                <div
                  key={eq.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold"
                >
                  <span>{eq.name}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300">
                    ×{eq.quantity}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-1 ml-0.5">
                      {onEditRoomEquipment && (
                        <button
                          type="button"
                          onClick={() => onEditRoomEquipment(room, eq)}
                          title={isEn ? "Edit" : "تعديل"}
                          className="text-slate-400 hover:text-[#1167c9]"
                        >
                          <Edit3 size={11} />
                        </button>
                      )}
                      {onDeleteRoomEquipment && (
                        <button
                          type="button"
                          onClick={() => onDeleteRoomEquipment(room, eq)}
                          title={isEn ? "Delete" : "حذف"}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--muted)] italic">
              {isEn ? "No equipment assigned to this room" : "لا توجد عهدة خاصة بالغرفة"}
            </p>
          )}
        </div>

        {/* Room Occupants Roster (3 Groups) */}
        <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
              {isEn ? "Occupants" : "السكان المسجلون"} ({totalOccupantsCount})
            </p>
            {room.pendingOccupants && room.pendingOccupants.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-[10px] font-black">
                <AlertCircle size={10} />
                {room.pendingOccupants.length} {isEn ? "Needs match" : "بانتظار مطابقة"}
              </span>
            )}
          </div>

          {/* Group 1: Pending Occupants (Unmatched from Workbook) */}
          {room.pendingOccupants && room.pendingOccupants.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {isEn ? "Pending Workbook Matches" : "سجلات بانتظار مطابقة الهوية/الموظف"}
              </p>
              {room.pendingOccupants.map((pending) => (
                <div
                  key={pending.id}
                  className="flex flex-col gap-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 p-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-amber-950 dark:text-amber-200 truncate">
                          {pending.name}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-0.5 text-[10px] font-black">
                          {isEn ? "Needs match" : "بانتظار ربط موظف"}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-amber-800 dark:text-amber-300 font-bold">
                        {isEn ? "Iqama" : "الإقامة"}: {pending.iqamaNo}
                      </p>
                      {pending.sourceRow && (
                        <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                          {isEn ? `Workbook Row #${pending.sourceRow}` : `سطر السجل #${pending.sourceRow}`}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        {onResolvePendingOccupant && (
                          <button
                            type="button"
                            onClick={() => onResolvePendingOccupant(room, pending)}
                            title={isEn ? "Resolve Match" : "مطابقة واعتماد الساكن"}
                            className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-600 text-white px-2 py-1 text-[11px] font-bold hover:bg-emerald-700 shadow-xs transition-all"
                          >
                            <UserCheck size={12} />
                            <span>{isEn ? "Resolve" : "مطابقة"}</span>
                          </button>
                        )}
                        {onRemovePendingOccupant && (
                          <button
                            type="button"
                            onClick={() => onRemovePendingOccupant(room, pending)}
                            title={isEn ? "Remove Pending" : "حذف السجل المعلق"}
                            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 px-2 py-1 text-[11px] font-bold dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Group 2: Linked Occupants (Employees / Riders) */}
          {room.occupants && room.occupants.length > 0 && (
            <div className="space-y-2">
              {room.occupants.map((occ) => {
                const isRider =
                  occ.personType === "Rider" || Boolean(occ.riderProfileId);
                const displayName = isEn
                  ? occ.employeeNameEn || occ.employeeNameAr || "Occupant"
                  : occ.employeeNameAr || occ.employeeNameEn || "ساكن";

                return (
                  <div
                    key={occ.occupancyPeriodId}
                    className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-[var(--foreground)] truncate">
                            {displayName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                              isRider
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            }`}
                          >
                            {isRider ? <Bike size={10} /> : <Briefcase size={10} />}
                            {isRider ? (isEn ? "Rider" : "سائق") : isEn ? "Staff" : "موظف"}
                          </span>
                        </div>

                        {occ.iqamaNo && (
                          <p className="text-[11px] font-mono text-[var(--muted)] font-semibold">
                            {isEn ? "Iqama" : "الإقامة"}: {occ.iqamaNo}
                          </p>
                        )}
                      </div>

                      {/* Action buttons for linked occupant */}
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onMoveOccupant(room, occ)}
                            title={isEn ? "Move to Another Room" : "نقل إلى غرفة أخرى"}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-[#1167c9] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all"
                          >
                            <ArrowRightLeft size={12} />
                            <span className="hidden sm:inline">{isEn ? "Move" : "نقل"}</span>
                          </button>
                          <button
                            onClick={() => onRemoveOccupant(room, occ)}
                            title={isEn ? "Check Out / Remove" : "إنهاء التسكين / خروج"}
                            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition-all"
                          >
                            <LogOut size={12} />
                            <span className="hidden sm:inline">{isEn ? "Check Out" : "خروج"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] font-medium pt-1 border-t border-[var(--border)]/60">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        {isEn ? "Since" : "منذ"}: {occ.effectiveFrom}
                      </span>
                      {occ.sourceReference && (
                        <span className="truncate text-slate-500" title={occ.sourceReference}>
                          {occ.sourceReference}
                        </span>
                      )}
                      {occ.moveInReason && (
                        <span className="truncate text-slate-500" title={occ.moveInReason}>
                          {occ.moveInReason}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Group 3: External Occupants (Name-only, non-employee) */}
          {room.externalOccupants && room.externalOccupants.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <User size={12} />
                {isEn ? "External Occupants (Name-only)" : "سكان خارجيون (اسم فقط)"}
              </p>
              {room.externalOccupants.map((ext) => (
                <div
                  key={ext.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 p-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-[var(--foreground)] truncate">
                          {ext.name}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                          {isEn ? "External Person" : "شخص خارجي"}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--muted)]">
                        {isEn ? "Registered by name only" : "مسجل بالاسم فقط"}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        {onEditExternalOccupant && (
                          <button
                            type="button"
                            onClick={() => onEditExternalOccupant(room, ext)}
                            title={isEn ? "Rename or Move" : "تعديل الاسم أو نقل الغرفة"}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all"
                          >
                            <ArrowRightLeft size={12} />
                            <span>{isEn ? "Move / Edit" : "نقل / تعديل"}</span>
                          </button>
                        )}
                        {onRemoveExternalOccupant && (
                          <button
                            type="button"
                            onClick={() => onRemoveExternalOccupant(room, ext)}
                            title={isEn ? "Remove External Occupant" : "حذف الساكن الخارجي"}
                            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 px-2 py-1 text-[11px] font-bold dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state if all three occupant lists are empty */}
          {totalOccupantsCount === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted)]">
              <User className="mx-auto mb-1 opacity-40" size={24} />
              <p className="font-semibold">
                {isEn ? "No occupants in this room" : "لا يوجد سكان مسجلون بهذه الغرفة حالياً"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Assign Occupant */}
      {canManage && (
        <div className="mt-5 pt-3 border-t border-[var(--border)]">
          <Button
            onClick={() => onAssignToRoom(room)}
            disabled={isFull}
            variant={isFull ? "secondary" : "primary"}
            className={`w-full justify-center text-xs h-9 font-bold ${
              isFull ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Plus size={14} />
            {isFull
              ? isEn
                ? "Room is Full"
                : "الغرفة مكتملة"
              : isEn
              ? "Assign Person / External"
              : "تسكين فرد (إقامة / خارجي)"}
          </Button>
        </div>
      )}
    </div>
  );
}

