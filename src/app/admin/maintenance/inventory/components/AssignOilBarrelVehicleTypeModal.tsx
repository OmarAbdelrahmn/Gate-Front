"use client";

import React, { useState } from "react";
import { ShieldAlert, Car, Bike, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { assignOilBarrelVehicleType } from "@/lib/maintenance/api";
import type { OilBarrel } from "@/lib/maintenance/types";

interface AssignOilBarrelVehicleTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  barrel: OilBarrel | null;
  itemName?: string;
  locationName?: string;
  onSuccess: (updatedBarrel: OilBarrel) => void;
}

export function AssignOilBarrelVehicleTypeModal({
  isOpen,
  onClose,
  barrel,
  itemName,
  locationName,
  onSuccess,
}: AssignOilBarrelVehicleTypeModalProps) {
  // Required choice with NO default selection: "motorcycles" | "cars" | "both"
  const [selectedScope, setSelectedScope] = useState<"motorcycles" | "cars" | "both" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!barrel) return null;

  const handleClose = () => {
    if (submitting) return;
    setSelectedScope(null);
    setErrorMsg(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedScope) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await assignOilBarrelVehicleType(barrel.id, {
        allowedVehicleType:
          selectedScope === "motorcycles"
            ? 1
            : selectedScope === "cars"
              ? 2
              : null,
        allowBothVehicleTypes: selectedScope === "both",
        rowVersion: barrel.rowVersion,
      });

      setSelectedScope(null);
      onSuccess(res);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "تعذر تعيين نوع المركبة للبرميل. يرجى المحاولة مرة أخرى.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="تحديد نطاق المركبات / Assign Vehicle Scope"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Barrel Info Summary */}
        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">رقم البرميل المفتوح:</span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
              {barrel.barrelNumber}
            </span>
          </div>
          {itemName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">صنف الزيت:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {itemName}
              </span>
            </div>
          )}
          {locationName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">الموقع / المستودع:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {locationName}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
            <span className="text-slate-500 font-medium">الكمية المتبقية للاستهلاك:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {barrel.remainingLiters} / {barrel.nominalCapacityLiters} لتر
            </span>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="leading-relaxed space-y-1">
            <p className="font-bold">إجراء توافقي لبرميل مفتوح سابقاً:</p>
            <p>
              هذا البرميل فُتح قبل تطبيق قيود نوع المركبات. البراميل المفتوحة غير المحددة لا يمكنها تزويد عمليات تغيير زيت جديدة حتى يتم تحديد نوعها.
              اختيارك سيقفل البرميل حصراً للنطاق المختار، دون تعديل الاستهلاك التاريخي السابق.
            </p>
          </div>
        </div>

        {/* Selection Cards (Required, No Default) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            حدد نطاق المركبات المسموح به لهذا البرميل المفتوح <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Motorcycles Option (1) */}
            <button
              type="button"
              onClick={() => setSelectedScope("motorcycles")}
              className={`relative flex flex-col p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                selectedScope === "motorcycles"
                  ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-xs"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-slate-400 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`grid size-9 place-items-center rounded-lg ${
                    selectedScope === "motorcycles"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Bike size={20} />
                </div>
                {selectedScope === "motorcycles" && (
                  <CheckCircle2 size={18} className="text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                دراجات نارية فقط
              </div>
              <div className="text-[10px] text-slate-400 font-mono">Motorcycles only</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                دراجات نارية فقط (نوع 1).
              </p>
            </button>

            {/* Cars Option (2) */}
            <button
              type="button"
              onClick={() => setSelectedScope("cars")}
              className={`relative flex flex-col p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                selectedScope === "cars"
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30 shadow-xs"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-slate-400 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`grid size-9 place-items-center rounded-lg ${
                    selectedScope === "cars"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Car size={20} />
                </div>
                {selectedScope === "cars" && (
                  <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                سيارات فقط
              </div>
              <div className="text-[10px] text-slate-400 font-mono">Cars only</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                سيارات فقط (نوع 2).
              </p>
            </button>

            {/* Both Option (null, true) */}
            <button
              type="button"
              onClick={() => setSelectedScope("both")}
              className={`relative flex flex-col p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                selectedScope === "both"
                  ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30 shadow-xs"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-slate-400 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`flex items-center justify-center gap-1 size-9 rounded-lg ${
                    selectedScope === "both"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Car size={13} />
                  <Bike size={13} />
                </div>
                {selectedScope === "both" && (
                  <CheckCircle2 size={18} className="text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                سيارات ودراجات نارية
              </div>
              <div className="text-[10px] text-slate-400 font-mono">Both (Shared)</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                برميل مشترك يغذي النوعين تلقائياً.
              </p>
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={submitting}
            className="text-xs"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            loading={submitting}
            disabled={!selectedScope || submitting}
            className="text-xs font-bold px-4"
          >
            تأكيد نطاق المركبات
          </Button>
        </div>
      </div>
    </Modal>
  );
}
