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
} from "lucide-react";
import type { Room, CurrentOccupant } from "../../lib/housing/api";
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
}: RoomCardProps) {
  const isFull = room.availableCapacity <= 0;
  const occupancyPct = room.capacity > 0
    ? Math.min(100, Math.round((room.currentOccupancy / room.capacity) * 100))
    : 0;

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
                {room.currentOccupancy} / {room.capacity} {isEn ? "Beds occupied" : "أسرّة مشغولة"}
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

        {/* Room Occupants Roster */}
        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
            {isEn ? "Current Occupants" : "السكان الحاليون"} ({room.occupants?.length || 0})
          </p>

          {room.occupants && room.occupants.length > 0 ? (
            <div className="space-y-2">
              {room.occupants.map((occ) => {
                const isRider = occ.personType === "Rider" || Boolean(occ.riderProfileId);
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
                            {isRider ? (isEn ? "Rider" : "سائق") : (isEn ? "Staff" : "موظف")}
                          </span>
                        </div>

                        {occ.iqamaNo && (
                          <p className="text-[11px] font-mono text-[var(--muted)] font-semibold">
                            {isEn ? "Iqama" : "الإقامة"}: {occ.iqamaNo}
                          </p>
                        )}
                      </div>

                      {/* Action buttons for occupant */}
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
          ) : (
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
              ? isEn ? "Room is Full" : "الغرفة مكتملة"
              : isEn ? "Assign Person to Room" : "تسكين ساكن في الغرفة"}
          </Button>
        </div>
      )}
    </div>
  );
}
