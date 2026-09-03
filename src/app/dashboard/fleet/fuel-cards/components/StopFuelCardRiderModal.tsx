"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { X, UserMinus, AlertTriangle } from "lucide-react";
import {
  stopFuelCardRider,
  FuelCard,
  getRiyadhTodayDateString,
} from "@/lib/fleet/fuel-cards-api";

interface StopFuelCardRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FuelCard | null;
  onSuccess: () => void;
}

export function StopFuelCardRiderModal({
  isOpen,
  onClose,
  card,
  onSuccess,
}: StopFuelCardRiderModalProps) {
  const [effectiveTo, setEffectiveTo] = useState(getRiyadhTodayDateString());
  const [reason, setReason] = useState("إرجاع بطاقة الوقود");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayRiyadh = getRiyadhTodayDateString();

  useEffect(() => {
    if (isOpen) {
      setEffectiveTo(getRiyadhTodayDateString());
      setReason("إرجاع بطاقة الوقود");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !card || !card.currentRider) return null;

  const currentRider = card.currentRider;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card || !card.currentRider) return;
    if (!effectiveTo) {
      setError("يرجى اختيار تاريخ إنهاء الإسناد");
      return;
    }
    if (effectiveTo < currentRider.effectiveFrom) {
      setError(`تاريخ الإرجاع (${effectiveTo}) لا يمكن أن يكون قبل تاريخ بداية التعيين (${currentRider.effectiveFrom})`);
      return;
    }
    if (effectiveTo > todayRiyadh) {
      setError("تاريخ الإرجاع لا يمكن أن يكون بعد تاريخ اليوم في الرياض");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await stopFuelCardRider(card.id, {
        effectiveTo,
        reason: reason.trim() || "Card returned",
        rowVersion: currentRider.rowVersion,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "تعذر إنهاء تعيين البطاقة للمندوب");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-amber-50/50 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <UserMinus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                إنهاء تعيين المندوب وإرجاع البطاقة
              </h3>
              <p className="text-xs text-[var(--muted)]">
                البطاقة: <span dir="auto" className="fuel-plate font-bold text-amber-700 dark:text-amber-400">{card.cardNumber}</span> ({card.providerNameAr})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--muted)] hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Rider Summary Box */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-[var(--border)] text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)] font-medium">المندوب الحالي:</span>
            <span className="font-bold text-[#1167c9] dark:text-blue-400">
              {currentRider.riderNameAr || currentRider.riderNameEn || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted)] font-medium">تاريخ بداية التعيين:</span>
            <span className="font-bold font-mono dir-ltr">{currentRider.effectiveFrom}</span>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Effective To */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              تاريخ نهاية الإسناد (الإرجاع) <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveTo}
              min={currentRider.effectiveFrom}
              max={todayRiyadh}
              onChange={(e) => setEffectiveTo(e.target.value)}
              className="w-full h-11 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              يجب أن يكون بتاريخ الإسناد أو بعده ({currentRider.effectiveFrom}) ولا يتجاوز تاريخ اليوم بتوقيت الرياض ({todayRiyadh}).
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              سبب الإرجاع / الإنهاء <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="سبب إرجاع بطاقة الوقود..."
              className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              required
            />
          </div>

          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
            ملاحظة: إيقاف المندوب لا يسمح بإسناد مندوب آخر لهذه البطاقة في التقويم الشهري نفسه.
          </p>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="h-10 px-5 rounded-xl text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="h-10 px-6 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
            >
              {loading ? "جاري الإيقاف..." : "تأكيد الإرجاع وإنهاء التعيين"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
