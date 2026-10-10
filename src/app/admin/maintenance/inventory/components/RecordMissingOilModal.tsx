"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Droplets,
  HelpCircle,
  Info,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { recordOilBarrelMissing } from "@/lib/maintenance/api";
import {
  OilBarrelStatus,
  type OilBarrel,
  type RecordOilBarrelMissingResponse,
} from "@/lib/maintenance/types";
import {
  oilBarrelMissingReasonConfig,
  formatCurrency,
} from "@/lib/maintenance/constants";

interface RecordMissingOilModalProps {
  isOpen: boolean;
  onClose: () => void;
  barrel: OilBarrel | null;
  locationName?: string;
  itemName?: string;
  onSuccess: (res: RecordOilBarrelMissingResponse) => void;
}

export function RecordMissingOilModal({
  isOpen,
  onClose,
  barrel,
  locationName,
  itemName,
  onSuccess,
}: RecordMissingOilModalProps) {
  const [occurredAtLocal, setOccurredAtLocal] = useState<string>("");
  const [quantityLiters, setQuantityLiters] = useState<string>("");
  const [missingReason, setMissingReason] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState<string>("");

  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Default occurrence date to current local datetime format YYYY-MM-DDTHH:mm
      const now = new Date();
      const offsetMs = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
      setOccurredAtLocal(localISOTime);
      setQuantityLiters("");
      setMissingReason(1);
      setReason("");
      setIsConfirming(false);
      setErrorMsg(null);
    }
  }, [isOpen, barrel?.id]);

  if (!barrel) return null;

  const remainingLiters = barrel.remainingLiters;
  const parsedQty = parseFloat(quantityLiters);
  const isValidNumber = !isNaN(parsedQty) && parsedQty > 0;
  // Maximum 3 decimal places validation
  const hasValidPrecision = /^\d+(\.\d{1,3})?$/.test(quantityLiters.trim());
  const isWithinRemaining = isValidNumber && parsedQty <= remainingLiters;
  const isQtyValid = isValidNumber && hasValidPrecision && isWithinRemaining;

  const estimatedCost = isQtyValid
    ? Number((parsedQty * barrel.unitCostPerLiter).toFixed(2))
    : 0;
  const remainingAfterAction = isQtyValid
    ? Math.max(0, Number((remainingLiters - parsedQty).toFixed(3)))
    : remainingLiters;
  const willDepleteBarrel = isQtyValid && remainingAfterAction <= 0.0001;

  const handleFillAllRemaining = () => {
    if (barrel) {
      setQuantityLiters(barrel.remainingLiters.toString());
      setErrorMsg(null);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setIsConfirming(false);
    setErrorMsg(null);
    onClose();
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isQtyValid) {
      if (!hasValidPrecision) {
        setErrorMsg("يجب ألا تزيد كمية الزيت عن 3 منازل عشرية.");
      } else if (!isWithinRemaining) {
        setErrorMsg(`الكمية المدخلة (${parsedQty} لتر) تتجاوز الكمية المتبقية في البرميل (${remainingLiters} لتر).`);
      } else {
        setErrorMsg("يرجى إدخال كمية صالحة وموجبة.");
      }
      return;
    }

    if (!reason.trim()) {
      setErrorMsg("يرجى إدخال سبب وتفاصيل شطب الزيت.");
      return;
    }

    if (reason.trim().length > 1000) {
      setErrorMsg("يجب ألا يتجاوز الشرح 1000 حرف.");
      return;
    }

    setIsConfirming(true);
  };

  const handleExecuteWriteOff = async () => {
    if (submitting || !barrel || !isQtyValid) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const occurrenceDate = occurredAtLocal
        ? new Date(occurredAtLocal).toISOString()
        : new Date().toISOString();

      const res = await recordOilBarrelMissing(barrel.id, {
        occurredAtUtc: occurrenceDate,
        quantityLiters: Number(parsedQty.toFixed(3)),
        missingReason,
        reason: reason.trim(),
        rowVersion: barrel.rowVersion,
      });

      setIsConfirming(false);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error("Record missing oil write-off error:", err);
      const code = err?.details?.errorCode || err?.details?.title || err?.errorCode;
      if (code === "maintenance.concurrency_conflict") {
        setErrorMsg(
          "حدث تعارض: تم تعديل مخزون البرميل بواسطة عملية أخرى. يرجى إغلاق النافذة وتحديث البيانات والمراجعة قبل إعادة المحاولة.",
        );
      } else if (code === "maintenance.invalid_oil_barrel") {
        setErrorMsg("بيانات البرميل غير صالحة؛ قد لا يكون البرميل مفتوحاً أو نفدت الكمية. يرجى التحديث.");
      } else if (code === "maintenance.insufficient_stock") {
        setErrorMsg("رصيد المستودع أو طبقة التكلفة غير كافية لتغطية كمية الشطب.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "فشل تسجيل الزيت المفقود/التالف.");
      }
      setIsConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="تسجيل زيت مفقود أو تالف / Record Missing Oil"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Barrel & Warehouse Context Header */}
        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">رقم البرميل:</span>
              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                {barrel.barrelNumber}
              </span>
            </div>
            {/* Responsible Location Badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <Building2 size={12} />
              مسؤولية المستودع / Warehouse Responsible
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--border)]">
            <div>
              <span className="text-slate-500 block text-[11px]">المستودع المسؤول:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {locationName || barrel.inventoryLocationId}
              </span>
            </div>
            {itemName && (
              <div>
                <span className="text-slate-500 block text-[11px]">صنف الزيت:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {itemName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-[11px]">
            <span className="text-slate-500">الرصيد المتبقي الحالي:</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
              {barrel.remainingLiters.toFixed(3)} لتر
            </span>
          </div>
        </div>

        {/* Accountability & Policy Callout */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <Info size={16} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-bold mb-0.5">شطب مخزني تحت مسؤولية المستودع:</p>
            <p className="text-[11px] text-blue-800 dark:text-blue-300">
              هذا الإجراء يسجل فقداناً أو تلفاً أو سرقة تحت مسؤولية وتكلفة المستودع ومستقل تماماً عن نسبة الفاقد الطبيعية (2%).
              يتم شطب الكمية والتكلفة المخزنية فوراً، ولا يُنشئ مديونية أو استقطاعاً على السائقين أو الموظفين.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {!isConfirming ? (
          /* Form Step */
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            {/* Reason Category Selection Cards */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                تصنيف الفقدان / السبب الرئيسي <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 1 as const, title: "مفقود", sub: "Missing", color: "amber" },
                  { id: 2 as const, title: "تالف أو مسكوب", sub: "Wasted/Spilled", color: "rose" },
                  { id: 3 as const, title: "مسروق", sub: "Theft", color: "red" },
                ].map((item) => {
                  const isSelected = missingReason === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMissingReason(item.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 text-amber-900 dark:text-amber-200"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-slate-400 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="font-bold text-xs">{item.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Input with Convenience Action */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  الكمية المشطوبة (باللتر) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleFillAllRemaining}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-1"
                >
                  <Droplets size={12} />
                  كامل الكمية المتبقية ({barrel.remainingLiters.toFixed(3)} لتر)
                </button>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={barrel.remainingLiters}
                  value={quantityLiters}
                  onChange={(e) => setQuantityLiters(e.target.value)}
                  placeholder={`أدخل الكمية بحد أقصى ${barrel.remainingLiters} لتر (3 أرقام عشرية)`}
                  required
                  className="text-xs font-mono pl-12"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  لتر
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>يقبل أرقاماً حتى 3 منازل عشرية كحد أقصى.</span>
                {isQtyValid && (
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    التكلفة التقديرية: <strong>{formatCurrency(estimatedCost)}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Occurrence Date/Time */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                تاريخ ووقت حدوث الواقعة / الجرد <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={occurredAtLocal}
                onChange={(e) => setOccurredAtLocal(e.target.value)}
                required
                className="text-xs font-mono"
              />
            </div>

            {/* Explanation / Reason */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  سبب وتفاصيل الشطب <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {reason.trim().length} / 1000 حرف
                </span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="أدخل توضيحاً تفصيلياً (مثال: جرد فعلي: كامل الزيت المتبقي مفقود / انسكاب البرميل بالكامل أثناء النقل الداخلي)..."
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
                type="submit"
                variant="primary"
                disabled={!isQtyValid || !reason.trim() || submitting}
                className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-4"
              >
                متابعة وتأكيد الشطب
              </Button>
            </div>
          </form>
        ) : (
          /* Confirmation Step */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-500/10 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <span>يرجى تأكيد بيانات الشطب قبل الاعتماد النهائي</span>
              </div>

              <div className="space-y-2 text-xs pt-1 border-t border-amber-200 dark:border-amber-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">الكمية المراد شطبها:</span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                    {parsedQty.toFixed(3)} لتر
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">التكلفة التقديرية (FIFO):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(estimatedCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">الكمية المتبقية بعد الشطب:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {remainingAfterAction.toFixed(3)} لتر
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">فئة السبب:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {oilBarrelMissingReasonConfig[missingReason]?.labelAr}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 pt-1 border-t border-amber-200/50">
                  <span className="text-slate-600 dark:text-slate-300 shrink-0">التوضيح والسبب:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium text-left break-all">
                    {reason.trim()}
                  </span>
                </div>
              </div>

              {willDepleteBarrel && (
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-[11px] text-rose-900 dark:text-rose-200 font-bold">
                  تنبيه: سيؤدي هذا الإجراء إلى تصفير رصيد البرميل بالكامل وتحويل حالته تلقائياً إلى مستهلك (Depleted).
                </div>
              )}
            </div>

            {/* Actions for Confirmation Step */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsConfirming(false)}
                disabled={submitting}
                className="text-xs"
              >
                رجوع للتعديل
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleExecuteWriteOff}
                loading={submitting}
                disabled={submitting}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-5"
              >
                تأكيد وتسجيل الشطب نهائياً
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
