"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeftRight,
  Car,
  Bike,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Clock,
  ShieldCheck,
  Check,
  Copy,
  Info,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { correctOilChangeVehicle } from "@/lib/maintenance/api";
import { getAllVehicles } from "@/lib/fleet/api";
import type { VehicleSummaryResponse } from "@/lib/fleet/types";
import type { CompleteOilChangeResult } from "@/lib/maintenance/types";

export interface CorrectOilChangeVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result?: CompleteOilChangeResult) => void;
  oilChangeId?: string | null;
  currentVehicleId?: string | null;
  currentVehiclePlate?: string | null;
  currentVehicleType?: number | null; // 1 = Motorcycle, 2 = Car
}

export function CorrectOilChangeVehicleModal({
  isOpen,
  onClose,
  onSuccess,
  oilChangeId,
  currentVehicleId,
  currentVehiclePlate,
  currentVehicleType,
}: CorrectOilChangeVehicleModalProps) {
  const [targetOilChangeId, setTargetOilChangeId] = useState("");
  const [vehicleType, setVehicleType] = useState<number>(currentVehicleType ?? 2);
  const [replacementVehicleId, setReplacementVehicleId] = useState("");
  const [reason, setReason] = useState("");
  const [vehicles, setVehicles] = useState<VehicleSummaryResponse[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Sync state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setTargetOilChangeId(oilChangeId || "");
      setVehicleType(currentVehicleType ?? 2);
      setReplacementVehicleId("");
      setReason("");
      setCopiedId(false);
    }
  }, [isOpen, oilChangeId, currentVehicleType]);

  // Load vehicles when modal is open
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadingVehicles(true);

    getAllVehicles()
      .then((data) => {
        if (!cancelled) {
          setVehicles(data || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load vehicles for correction:", err);
        if (!cancelled) {
          toast.error("تعذر تحميل قائمة المركبات", "يرجى إعادة المحاولة.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingVehicles(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Filter vehicles matching the required vehicle type and excluding the current vehicle
  const vehicleOptions: SelectOption[] = useMemo(() => {
    return vehicles
      .filter((v) => {
        const matchesType = Number(v.vehicleType) === Number(vehicleType);
        const isNotCurrent = currentVehicleId ? v.id !== currentVehicleId : true;
        return matchesType && isNotCurrent;
      })
      .map((v) => {
        const plate = v.plateNumberAr || v.plateNumberEn || "بدون لوحة";
        const asset = v.assetNumber ? ` • أصل #${v.assetNumber}` : "";
        const model = [v.manufacturer, v.model].filter(Boolean).join(" ");
        const odo = v.currentOdometer != null ? ` • العداد: ${Number(v.currentOdometer).toLocaleString()} كم` : "";

        return {
          value: v.id,
          label: `${plate}${asset}`,
          sublabel: `${model ? `${model}` : "مركبة"}${odo}`,
          keywords: `${v.plateNumberAr || ""} ${v.plateNumberEn || ""} ${v.assetNumber || ""} ${v.serialNumber || ""} ${model}`,
        };
      });
  }, [vehicles, vehicleType, currentVehicleId]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === replacementVehicleId) || null;
  }, [vehicles, replacementVehicleId]);

  const handleCopyId = () => {
    if (!targetOilChangeId) return;
    navigator.clipboard.writeText(targetOilChangeId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanId = targetOilChangeId.trim();
    const cleanReason = reason.trim();

    if (!cleanId) {
      toast.error("بيانات ناقصة", "يرجى إدخال أو تحديد معرّف عملية غيار الزيت.");
      return;
    }

    if (!replacementVehicleId) {
      toast.error("بيانات ناقصة", "يرجى اختيار المركبة البديلة المستهدفة.");
      return;
    }

    if (currentVehicleId && replacementVehicleId === currentVehicleId) {
      toast.error("مركبة غير صالحة", "لا يمكن استبدال المركبة بنفس المركبة الحالية.");
      return;
    }

    if (!cleanReason) {
      toast.error("سبب التصحيح مطلوب", "يرجى كتابة سبب تصحيح المركبة لتوثيقه في سجل التدقيق.");
      return;
    }

    if (cleanReason.length < 5) {
      toast.error("سبب غير كافٍ", "يرجى تقديم سبب واضح ومفصل لعملية التصحيح (5 أحرف على الأقل).");
      return;
    }

    setSubmitting(true);
    try {
      const result = await correctOilChangeVehicle(cleanId, {
        vehicleId: replacementVehicleId,
        reason: cleanReason,
      });

      toast.success(
        "تم تصحيح المركبة بنجاح",
        "تم تحديث استهلاك البراميل المرتبط وقراءة العداد وتكاليف التشغيل وتذكيرات الصيانة بنجاح.",
      );

      onSuccess?.(result);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to correct oil change vehicle:", err);
      // AuthFetch automatically toast errors using getFriendlyErrorMessage
    } finally {
      setSubmitting(false);
    }
  };

  const isCar = vehicleType === 2;
  const isFixedType = Boolean(currentVehicleType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تصحيح المركبة لعملية غيار زيت مكتملة / Correct Oil Change Vehicle"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-right" dir="rtl">
        {/* Header Informational Banner */}
        <div className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2 leading-relaxed">
          <div className="flex items-center gap-2 font-black text-amber-950 dark:text-amber-100 text-sm">
            <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>إجراء إداري دقيق — تصحيح في معاملة واحدة</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300">
            يقوم هذا الإجراء بتصحيح اختيار مركبة خاطئة على عملية غيار زيت مباشرة مكتملة. سيتم تحديث
            <strong className="mx-1">استهلاك البرميل، وقراءة العداد، والمصاريف التشغيلية، وجدول التذكيرات</strong>
            لكلا المركبتين في معاملة ذرية واحدة، وتوثيق العملية رسمياً في سجل التدقيق (Audit Log).
          </p>
        </div>

        {/* Current Vehicle Context Card (if available) */}
        {(currentVehiclePlate || currentVehicleId) && (
          <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                {isCar ? <Car size={16} /> : <Bike size={16} />}
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
                  المركبة الحالية (المراد تصحيحها):
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currentVehiclePlate || currentVehicleId}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
              خاطئة / استبدال
            </span>
          </div>
        )}

        {/* Oil Change ID */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            معرّف عملية غيار الزيت (Oil Change ID) <span className="text-rose-500">*</span>
          </label>
          {oilChangeId ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-900/60">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {targetOilChangeId}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#1167c9] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                title="نسخ المعرف"
              >
                {copiedId ? (
                  <>
                    <Check size={12} className="text-emerald-600" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <Input
              value={targetOilChangeId}
              onChange={(e) => setTargetOilChangeId(e.target.value)}
              placeholder="مثال: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              required
              className="font-mono text-xs"
            />
          )}
          <span className="text-[10px] text-slate-400 mt-1 block">
            معرّف عملية غيار الزيت المكتملة كما يظهر في سجل التدقيق أو بعد اكتمال التنفيذ.
          </span>
        </div>

        {/* Vehicle Type Rule Enforcer */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            نوع المركبة البديلة (Vehicle Type) <span className="text-rose-500">*</span>
          </label>
          {isFixedType ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-xs">
              {isCar ? <Car size={16} className="text-blue-600" /> : <Bike size={16} className="text-purple-600" />}
              <span className="font-bold text-blue-900 dark:text-blue-200">
                {isCar ? "سيارة (Car)" : "دراجة نارية (Motorcycle)"}
              </span>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 mr-auto">
                (مطابق لنوع المركبة الأصلية المحدد في العملية)
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVehicleType(2);
                  setReplacementVehicleId("");
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  isCar
                    ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                    : "border-[var(--border)] bg-[var(--surface)] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Car size={16} />
                <span>سيارة (Car)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVehicleType(1);
                  setReplacementVehicleId("");
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  !isCar
                    ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20"
                    : "border-[var(--border)] bg-[var(--surface)] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Bike size={16} />
                <span>دراجة نارية (Motorcycle)</span>
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 mt-1.5 font-medium">
            <Info size={12} className="shrink-0" />
            <span>شرط الخادم: يجب أن تكون المركبة البديلة من نفس نوع المركبة الأصلية حصراً.</span>
          </div>
        </div>

        {/* Replacement Vehicle Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            المركبة البديلة الصحيحة (Replacement Vehicle) <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            value={replacementVehicleId}
            onChange={(val) => setReplacementVehicleId(val)}
            options={vehicleOptions}
            placeholder={
              loadingVehicles
                ? "جارٍ تحميل المركبات..."
                : vehicleOptions.length === 0
                  ? "لا توجد مركبات مطابقة من هذا النوع"
                  : "اختر المركبة البديلة باللوحة أو رقم الأصل..."
            }
            searchPlaceholder="بحث برقم اللوحة أو رقم الأصل..."
            disabled={loadingVehicles || submitting}
            required
          />
          {selectedVehicle && (
            <div className="mt-2 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>
                  تم اختيار: {selectedVehicle.plateNumberAr || selectedVehicle.plateNumberEn || "بدون لوحة"}
                  {selectedVehicle.assetNumber ? ` (أصل #${selectedVehicle.assetNumber})` : ""}
                </span>
              </div>
              <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                العداد: {Number(selectedVehicle.currentOdometer ?? 0).toLocaleString()} كم
              </span>
            </div>
          )}
        </div>

        {/* Reason for Correction */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            سبب التصحيح وتوثيق التدقيق (Reason) <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="مثال: تم اختيار المركبة بالخطأ أثناء إدخال فني الصيانة في الورشة، والعملية الفعلية تمت على هذه المركبة البديلة..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed outline-none focus:border-[#1167c9] focus:ring-1 focus:ring-[#1167c9] dark:text-white"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">
            سيتم حفظ هذا السبب كاملاً في سجل التدقيق المالي والإداري للرجوع إليه مستقبلاً.
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            إلغاء
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={
              submitting ||
              loadingVehicles ||
              !targetOilChangeId.trim() ||
              !replacementVehicleId ||
              !reason.trim()
            }
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            <ArrowLeftRight size={14} />
            <span>تأكيد وتصحيح المركبة</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
