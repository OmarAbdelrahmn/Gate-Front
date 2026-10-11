// src/components/jahez/dialogs/FreezeAccountModal.tsx
"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { freezeJahezHandover, generateIdempotencyKey } from "@/lib/jahez/api";
import type { JahezBalance, JahezHandover } from "@/lib/jahez/types";
import { AlertTriangle, Lock, ShieldAlert, Calendar } from "lucide-react";

interface FreezeAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  handover: JahezHandover | null;
  balance: JahezBalance | null;
  onSuccess?: (updatedBalance: JahezBalance) => void;
  locale?: "ar" | "en";
}

export function FreezeAccountModal({
  isOpen,
  onClose,
  handover,
  balance,
  onSuccess,
  locale = "ar",
}: FreezeAccountModalProps) {
  const isEn = locale === "en";

  // Form states
  const [effectiveAt, setEffectiveAt] = useState(() => {
    const now = new Date();
    // Format YYYY-MM-DDTHH:mm for datetime-local
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey("frz"));

  const targetId = balance?.handoverId || handover?.id;
  const accCode = balance?.account?.code || handover?.account?.code || handover?.externalAccountId || "-";
  const riderName =
    balance?.actualRiderNameAr ||
    balance?.actualRiderNameEn ||
    handover?.actualRiderNameAr ||
    handover?.actualRiderNameEn ||
    "-";

  const outstanding = balance?.outstandingAmount ?? balance?.totalReceivable ?? 0;
  const isCommissionIncomplete = balance && !balance.commissionComplete;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("خطأ", isEn ? "Reason is required" : "يرجى كتابة سبب التجميد");
      return;
    }
    if (trimmedReason.length > 2000) {
      toast.error(
        "خطأ",
        isEn
          ? "Reason cannot exceed 2000 characters"
          : "لا يمكن أن يتجاوز السبب 2,000 حرف",
      );
      return;
    }

    if (!effectiveAt) {
      toast.error("خطأ", isEn ? "Freeze date/time is required" : "يرجى تحديد وقت التجميد");
      return;
    }

    // Convert local datetime input to full ISO string with timezone offset
    const isoString = new Date(effectiveAt).toISOString();

    setIsSubmitting(true);
    try {
      const res = await freezeJahezHandover(
        targetId,
        {
          effectiveAtUtc: isoString,
          reason: trimmedReason,
        },
        idempotencyKey,
      );

      toast.success(
        "تم التجميد بنجاح",
        isEn
          ? "Account frozen and reserved for rider successfully"
          : "تم تجميد حساب جاهز وحجز العهدة للمندوب بنجاح",
      );

      // Reset key for future action
      setIdempotencyKey(generateIdempotencyKey("frz"));
      onSuccess?.(res);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تجميد الحساب";
      toast.error("خطأ في العملية", msg);
      // Keep idempotency key on network/recoverable error so retry is idempotent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Freeze Jahez Account" : "تجميد حساب جاهز"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning & Rules Box */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 dark:border-rose-900/60 dark:bg-rose-950/20 text-sm text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-bold block">
                {isEn
                  ? "Account will remain reserved for the rider and cannot be assigned to another rider."
                  : "سيظل الحساب محجوزًا للمندوب، ولن يمكن إسناده لمندوب آخر."}
              </span>
              <p className="text-xs text-rose-800/90 dark:text-rose-300/90 leading-relaxed">
                {isEn
                  ? "Commission is calculated up to and including the chosen Riyadh freeze day. Outstanding debt remains payable."
                  : "تُحسب العمولة حتى يوم التجميد شاملًا هذا اليوم بتوقيت الرياض، وتبقى المديونية مستحقة."}
              </p>
            </div>
          </div>
        </div>

        {isCommissionIncomplete && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold block">
                {isEn
                  ? "Incomplete earnings data on period"
                  : "بيانات أرباح الفترة غير مكتملة"}
              </span>
              <p className="text-[11px] mt-0.5">
                {isEn
                  ? "Freezing stops further accrual. However, earnings must be completed before clearance or paid confirmation."
                  : "التجميد متاح لإيقاف تراكم العمولة، لكن سيلزم إدخال كشوف الأرباح المعتمدة قبل تصفية الحساب أو تأكيد اكتمال السداد."}
              </p>
            </div>
          </div>
        )}

        {/* Identity & Financial Context Preview */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-850 text-xs space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">{isEn ? "Account Code / Driver ID:" : "الحساب / رمز جاهز:"}</span>
            <span className="font-bold text-gray-900 dark:text-white font-mono">{accCode}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">{isEn ? "Current Rider:" : "المندوب المسند له:"}</span>
            <span className="font-bold text-gray-900 dark:text-white">{riderName}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500">{isEn ? "Current Outstanding Debt:" : "المستحق المطلوب حاليًا:"}</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm">
              {outstanding.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
            </span>
          </div>
        </div>

        {/* Fields */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {isEn ? "Freeze Date & Time (Riyadh Cutoff)" : "وقت التجميد (شاملًا هذا اليوم)"}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <Input
            type="datetime-local"
            value={effectiveAt}
            onChange={(e) => setEffectiveAt(e.target.value)}
            required
            className="w-full text-sm"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            {isEn
              ? "Inclusive freeze day: commission stops accruing after this Riyadh business day."
              : "يُحسب يوم التجميد كاملاً ضمن عمولة التشغيل، وتتوقف العمولة في اليوم التالي."}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {isEn ? "Reason for Freeze" : "سبب التجميد"}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isEn
                ? "State the reason for freezing (e.g. rider stopped working, debt exceeded limit...)"
                : "اكتب سبب التجميد (مثل: انقطاع المندوب عن العمل، تراكم المستحقات لحين المراجعة...)"
            }
            maxLength={2000}
            rows={3}
            required
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-rose-500 focus:ring-rose-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>{isEn ? "Required, up to 2,000 characters." : "مطلوب، حتى 2000 حرف."}</span>
            <span>{reason.length} / 2000</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {isEn ? "Cancel" : "إلغاء"}
          </Button>

          <Button
            type="submit"
            variant="danger"
            disabled={isSubmitting || !reason.trim() || !effectiveAt}
            className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Lock className="w-4 h-4" />
            {isSubmitting
              ? isEn
                ? "Freezing Account..."
                : "جارٍ تجميد الحساب..."
              : isEn
              ? "Confirm Freeze"
              : "تأكيد تجميد الحساب"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
