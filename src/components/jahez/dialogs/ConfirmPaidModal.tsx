// src/components/jahez/dialogs/ConfirmPaidModal.tsx
"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { confirmJahezPaid, generateIdempotencyKey } from "@/lib/jahez/api";
import { JahezDebtStatus, type JahezBalance, type JahezHandover } from "@/lib/jahez/types";
import { CheckCircle2, AlertTriangle, ShieldCheck, Lock, Info } from "lucide-react";

interface ConfirmPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  handover: JahezHandover | null;
  balance: JahezBalance | null;
  onSuccess?: (updatedBalance: JahezBalance) => void;
  locale?: "ar" | "en";
}

export function ConfirmPaidModal({
  isOpen,
  onClose,
  handover,
  balance,
  onSuccess,
  locale = "ar",
}: ConfirmPaidModalProps) {
  const isEn = locale === "en";

  const [reason, setReason] = useState("تأكيد اكتمال سداد المندوب لكافة مستحقات الفترة المالية");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey("cpd"));

  const targetId = balance?.handoverId || handover?.id;
  const accCode = balance?.account?.code || handover?.account?.code || handover?.externalAccountId || "-";
  const riderName =
    balance?.actualRiderNameAr ||
    balance?.actualRiderNameEn ||
    handover?.actualRiderNameAr ||
    handover?.actualRiderNameEn ||
    "-";

  const isFrozen = (balance?.debtStatus ?? handover?.debtStatus) === JahezDebtStatus.Frozen;
  const outstanding = balance?.outstandingAmount ?? 0;
  const isCommissionIncomplete = balance && !balance.commissionComplete;

  const fees = balance?.fees ?? 0;
  const platformDebt = balance?.platformDebt ?? 0;
  const commission = Number(((balance?.postedCommission ?? 0) + (balance?.unpostedCommission ?? 0)).toFixed(2));

  const hasPositiveDebt = outstanding > 0 || fees > 0 || platformDebt > 0 || commission > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    if (hasPositiveDebt) {
      toast.error(
        "خطأ",
        isEn
          ? `Cannot confirm paid while outstanding balance exists (${outstanding} SAR). Settle all positive buckets first.`
          : `لا يمكن تأكيد السداد ويوجد رصيد مستحق (${outstanding} ر.س). يجب تحصيل وسداد كافة السلات أولاً.`,
      );
      return;
    }

    if (isCommissionIncomplete) {
      toast.error(
        "خطأ",
        isEn
          ? "Cannot confirm paid because commission calculation is incomplete."
          : "لا يمكن تأكيد السداد لأن احتساب العمولة غير مكتمل لهذه الفترة.",
      );
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("خطأ", isEn ? "Reason is required" : "يرجى كتابة سبب أو بيان تأكيد السداد");
      return;
    }
    if (trimmedReason.length > 2000) {
      toast.error(
        "خطأ",
        isEn ? "Reason cannot exceed 2000 characters" : "لا يمكن أن يتجاوز السبب 2,000 حرف",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmJahezPaid(
        targetId,
        {
          reason: trimmedReason,
        },
        idempotencyKey,
      );

      toast.success(
        "تم تأكيد السداد بنجاح",
        isEn
          ? "Full payment confirmed and recorded in rider history successfully"
          : isFrozen
          ? "تم تأكيد السداد وإلغاء تجميد الفترة ليصبح الحساب متاحًا بنجاح"
          : "تم تسجيل تأكيد اكتمال السداد في السجل المالي للمندوب بنجاح",
      );

      setIdempotencyKey(generateIdempotencyKey("cpd"));
      onSuccess?.(res);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تأكيد اكتمال السداد";
      toast.error("خطأ في العملية", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Confirm Full Rider Payment" : "تأكيد اكتمال سداد المندوب"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner based on Frozen vs Released */}
        {isFrozen ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50/90 p-4 dark:border-teal-900/60 dark:bg-teal-950/20 text-sm text-teal-900 dark:text-teal-200 space-y-1">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-bold block">
                  {isEn
                    ? "All liabilities are cleared. Frozen period will be released and account becomes available."
                    : "تم تسجيل جميع المستحقات بالكامل. سيُغلق تجميد هذه الفترة ويصبح الحساب متاحًا للإسناد."}
                </span>
                <p className="text-xs text-teal-800/90 dark:text-teal-300/90 leading-relaxed">
                  {isEn
                    ? "Confirming payment releases the operational account hold while keeping the rider's financial record."
                    : "يؤدي تأكيد السداد إلى رفع حجز الحساب وتوثيق براءة ذمة المندوب المالية لهذه الفترة."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 text-sm text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-bold block">
                  {isEn
                    ? "Paid confirmation will be recorded in the rider's financial history."
                    : "سيُسجل تأكيد سداد هذه الفترة في سجل المندوب المالي."}
                </span>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  {isEn
                    ? "Creates a status event verifying zero outstanding debt without affecting current account assignments."
                    : "يُنشئ قيد حالة لتأكيد خلو الطرف دون التأثير على إسناد الحساب الحالي في حال استخدامه من مندوب آخر."}
                </p>
              </div>
            </div>
          </div>
        )}

        {hasPositiveDebt && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold block">
                {isEn ? "Action Blocked: Outstanding balance is greater than zero" : "لا يمكن التأكيد: يوجد رصيد مستحق أكبر من صفر"}
              </span>
              <p className="text-[11px] mt-0.5 text-red-700 dark:text-red-300">
                {isEn
                  ? `Outstanding amount is ${outstanding} SAR. All positive buckets must be fully settled first.`
                  : `المبلغ المطلوب هو ${outstanding} ر.س. يجب تسوية كافة المستحقات الإيجابية قبل تأكيد السداد.`}
              </p>
            </div>
          </div>
        )}

        {isCommissionIncomplete && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold block">
                {isEn ? "Incomplete commission calculation" : "احتساب العمولة غير مكتمل"}
              </span>
              <p className="text-[11px] mt-0.5">
                {isEn
                  ? "Approved earnings statements must cover all days before confirming full payment."
                  : "يجب استكمال كشوف الأرباح المعتمدة لتغطية كافة الأيام قبل تأكيد اكتمال السداد."}
              </p>
            </div>
          </div>
        )}

        {/* Financial Verification Card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-850 text-xs space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">{isEn ? "Account & Rider:" : "الحساب والمندوب:"}</span>
            <span className="font-bold text-gray-900 dark:text-white">
              [{accCode}] {riderName}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
            <div className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700">
              <span className="text-[10px] text-gray-500 block">{isEn ? "Remaining Fees" : "رسوم الحساب"}</span>
              <span className={`font-bold ${fees > 0 ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>
                {fees.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
              </span>
            </div>

            <div className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700">
              <span className="text-[10px] text-gray-500 block">{isEn ? "Platform Debt" : "مديونية جاهز"}</span>
              <span className={`font-bold ${platformDebt > 0 ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>
                {platformDebt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
              </span>
            </div>

            <div className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700">
              <span className="text-[10px] text-gray-500 block">{isEn ? "Commission" : "العمولة"}</span>
              <span className={`font-bold ${commission > 0 ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>
                {commission.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {isEn ? "Outstanding Amount to Confirm:" : "المبلغ المتبقي المطلوب تأكيده:"}
            </span>
            <span className={`font-bold font-mono text-sm ${outstanding === 0 ? "text-emerald-600" : "text-red-600"}`}>
              {outstanding.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
            </span>
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {isEn ? "Confirmation Reason / Notes" : "سبب / بيان تأكيد اكتمال السداد"}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isEn
                ? "State confirmation reason (e.g. all settlements collected, receipts verified)..."
                : "اكتب بيان تأكيد السداد (مثل: تم استلام كافة المستحقات ومطابقة القيود المالية وإخلاء الطرف)..."
            }
            maxLength={2000}
            rows={3}
            required
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>{isEn ? "Required, up to 2,000 characters. Creates a status event (not a cash receipt)." : "مطلوب، حتى 2000 حرف. يوثق قيد حالة ولا يضيف مبالغ للصندوق."}</span>
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
            variant="primary"
            disabled={isSubmitting || hasPositiveDebt || isCommissionIncomplete || !reason.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting
              ? isEn
                ? "Confirming Payment..."
                : "جارٍ تأكيد السداد..."
              : isEn
              ? "Confirm Fully Paid"
              : "تأكيد اكتمال السداد"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
