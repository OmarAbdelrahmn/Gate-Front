"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { X, UserPlus, AlertTriangle } from "lucide-react";
import { listRiders } from "@/lib/workforce/api";
import {
  assignFuelCardRider,
  FuelCard,
  getRiyadhTodayDateString,
} from "@/lib/fleet/fuel-cards-api";

interface AssignFuelCardRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FuelCard | null;
  onSuccess: () => void;
}

export function AssignFuelCardRiderModal({
  isOpen,
  onClose,
  card,
  onSuccess,
}: AssignFuelCardRiderModalProps) {
  const [riderProfileId, setRiderProfileId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(getRiyadhTodayDateString());
  const [reason, setReason] = useState("إسناد بطاقة وقود شهرية");
  const [notes, setNotes] = useState("");
  const [ridersOptions, setRidersOptions] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayRiyadh = getRiyadhTodayDateString();

  useEffect(() => {
    if (isOpen) {
      setEffectiveFrom(getRiyadhTodayDateString());
      setReason("إسناد بطاقة وقود شهرية");
      setNotes("");
      setRiderProfileId("");
      setError(null);

      setLoadingRiders(true);
      listRiders()
        .then((ridersList) => {
          const options = (ridersList || []).map((r) => ({
            value: r.id, // riderProfileId
            label: r.fullNameAr || r.fullNameEn || "مندوب بدون اسم",
            sublabel: `هوية: ${r.iqamaNo || r.id}`,
          }));
          setRidersOptions(options);
        })
        .catch((err) => {
          console.error("Failed to load riders list:", err);
        })
        .finally(() => {
          setLoadingRiders(false);
        });
    }
  }, [isOpen]);

  if (!isOpen || !card) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    if (!riderProfileId) {
      setError("يرجى اختيار المندوب من القائمة");
      return;
    }
    if (!effectiveFrom) {
      setError("يرجى اختيار تاريخ بداية الإسناد");
      return;
    }
    if (effectiveFrom > todayRiyadh) {
      setError("تاريخ بداية الإسناد لا يمكن أن يكون بعد تاريخ اليوم في الرياض");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await assignFuelCardRider(card.id, {
        riderProfileId,
        effectiveFrom,
        reason: reason.trim() || "Monthly fuel-card assignment",
        notes: notes.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "تعذر إسناد البطاقة للمندوب");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                إسناد بطاقة وقود لمندوب
              </h3>
              <p className="text-xs text-[var(--muted)]">
                البطاقة: <span dir="auto" className="fuel-plate font-bold text-[#1167c9]">{card.cardNumber}</span> ({card.providerNameAr})
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rider Selection */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              اختر المندوب (ملف المندوب) <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={riderProfileId}
              onChange={(val) => setRiderProfileId(val)}
              options={ridersOptions}
              placeholder={loadingRiders ? "جاري تحميل قائمة المناديب..." : "اختر المندوب..."}
              searchPlaceholder="بحث باسم المندوب أو رقم الهوية..."
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              شروط الإسناد: يجب أن يكون المندوب نشطاً، ولا يمكن إسناد البطاقة لرايدرين مختلفين في نفس الشهر.
            </p>
          </div>

          {/* Effective From */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              تاريخ بداية الإسناد <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveFrom}
              max={todayRiyadh}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full h-11 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              التاريخ بصيغة YYYY-MM-DD ويجب ألا يتجاوز تاريخ اليوم بتوقيت الرياض ({todayRiyadh}).
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              سبب الإسناد <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="سبب إسناد بطاقة الوقود..."
              className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              ملاحظات (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              className="w-full p-3 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none resize-none"
            />
          </div>

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
              className="h-10 px-6 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              {loading ? "جاري الإسناد..." : "تأكيد الإسناد"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
