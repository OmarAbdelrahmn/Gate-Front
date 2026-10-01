"use client";

import React, { useState } from "react";
import { Unlock, Car, Bike, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { openOilBarrel } from "@/lib/maintenance/api";
import type { OilBarrel, OpenBarrelResponse } from "@/lib/maintenance/types";

interface OpenOilBarrelModalProps {
  isOpen: boolean;
  onClose: () => void;
  barrel: OilBarrel | null;
  itemName?: string;
  locationName?: string;
  onSuccess: (result: OpenBarrelResponse) => void;
}

export function OpenOilBarrelModal({
  isOpen,
  onClose,
  barrel,
  itemName,
  locationName,
  onSuccess,
}: OpenOilBarrelModalProps) {
  // Required choice with NO default selection
  const [selectedType, setSelectedType] = useState<1 | 2 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!barrel) return null;

  const handleClose = () => {
    if (submitting) return;
    setSelectedType(null);
    setErrorMsg(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedType) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await openOilBarrel(barrel.id, {
        openedAtUtc: new Date().toISOString(),
        rowVersion: barrel.rowVersion,
        allowedVehicleType: selectedType,
      });

      setSelectedType(null);
      onSuccess(res);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "تعذر فتح البرميل. يرجى المحاولة مرة أخرى.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="فتح البرميل للاستهلاك / Open Barrel"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Barrel Info Summary */}
        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">رقم البرميل:</span>
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
            <span className="text-slate-500 font-medium">السعة الاسمية / الرصيد:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {barrel.remainingLiters} / {barrel.nominalCapacityLiters} لتر
            </span>
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200">
          <Info size={16} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <p className="leading-relaxed">
            يجب تحديد نوع المركبة المسموح لها باستهلاك هذا البرميل. <strong>التخصيص يُقفل بشكل دائم بعد الفتح</strong>.
            يمكن فتح برميل للسيارات وآخر للدراجات النارية بالتوازي في نفس المستودع.
          </p>
        </div>

        {/* Selection Cards (Required, No Default) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            اختر نوع المركبة المسموح بها <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Motorcycles Option (1) */}
            <button
              type="button"
              onClick={() => setSelectedType(1)}
              className={`relative flex flex-col p-4 rounded-xl border text-right transition-all cursor-pointer ${
                selectedType === 1
                  ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-xs"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-slate-400 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`grid size-9 place-items-center rounded-lg ${
                    selectedType === 1
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Bike size={20} />
                </div>
                {selectedType === 1 && (
                  <CheckCircle2 size={18} className="text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                دراجات نارية / Motorcycles
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                دراجات نارية فقط (نوع 1). يُستهلك حصراً في صيانة الدراجات.
              </p>
            </button>

            {/* Cars Option (2) */}
            <button
              type="button"
              onClick={() => setSelectedType(2)}
              className={`relative flex flex-col p-4 rounded-xl border text-right transition-all cursor-pointer ${
                selectedType === 2
                  ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30 shadow-xs"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-slate-400 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`grid size-9 place-items-center rounded-lg ${
                    selectedType === 2
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Car size={20} />
                </div>
                {selectedType === 2 && (
                  <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                سيارات / Cars
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                سيارات فقط (نوع 2). يُستهلك حصراً في صيانة السيارات.
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
            disabled={!selectedType || submitting}
            className="text-xs font-bold px-4"
          >
            <Unlock size={14} />
            تأكيد فتح البرميل
          </Button>
        </div>
      </div>
    </Modal>
  );
}
