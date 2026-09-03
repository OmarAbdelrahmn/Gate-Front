"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, CreditCard, AlertTriangle } from "lucide-react";
import {
  createFuelCard,
  FuelCard,
  FuelProvider,
  fuelProviderLabels,
} from "@/lib/fleet/fuel-cards-api";

interface CreateFuelCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCard: FuelCard) => void;
}

export function CreateFuelCardModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateFuelCardModalProps) {
  const [provider, setProvider] = useState<FuelProvider>("PetroApp");
  const [cardNumber, setCardNumber] = useState("");
  const [plateNumberText, setPlateNumberText] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cardNumber.trim()) {
      setError("يرجى إدخال رقم البطاقة");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await createFuelCard({
        provider,
        cardNumber: cardNumber.trim(),
        plateNumberText: plateNumberText.trim() || null,
        notes: notes.trim() || null,
      });

      // Reset
      setCardNumber("");
      setPlateNumberText("");
      setNotes("");
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || "تعذر إنشاء بطاقة الوقود");
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
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                إضافة بطاقة وقود جديدة
              </h3>
              <p className="text-xs text-[var(--muted)]">
                إدخال بيانات بطاقة وقود جديدة لشركة بترو اب أو سيارة اب
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

          {/* Provider */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              مزود خدمة الوقود <span className="text-red-500">*</span>
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as FuelProvider)}
              className="w-full h-11 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
            >
              <option value="PetroApp">{fuelProviderLabels.PetroApp}</option>
              <option value="SayaraApp">{fuelProviderLabels.SayaraApp}</option>
            </select>
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              رقم البطاقة / المعرف الداخلي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              dir="auto"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="مثال: BW203 أو رقم البطاقة"
              className="w-full h-11 px-3 text-xs font-bold fuel-plate rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              البطاقات بصيغة BW متبوعة بأرقام تُصنف تلقائياً كنمرة داخلية، وما غير ذلك يُصنف كنمرة لوحة.
            </p>
          </div>

          {/* Plate Number Text */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              نص اللوحة المزود من الشركة (اختياري)
            </label>
            <input
              type="text"
              dir="auto"
              value={plateNumberText}
              onChange={(e) => setPlateNumberText(e.target.value)}
              placeholder="مثال: 1234 أ ب ج"
              className="w-full h-11 px-3 text-xs font-bold fuel-plate rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              اللوحة هنا نص تملكه بطاقة الوقود وليس له أي ارتباط بمركبة حقيقية في النظام.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات تشغيلية تخص البطاقة..."
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
              {loading ? "جاري الإضافة..." : "إضافة البطاقة"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
