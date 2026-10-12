// src/components/jahez/dialogs/ConfirmPaidModal.tsx
"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { confirmJahezPaid, generateIdempotencyKey } from "@/lib/jahez/api";
import { JahezDebtStatus } from "@/lib/jahez/constants";
import type { JahezBalance, JahezHandover } from "@/lib/jahez/types";
import { CheckCircle2, AlertTriangle, ShieldCheck, Lock, Info } from "lucide-react";

interface ConfirmPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  handover: JahezHandover | null;
  balance: JahezBalance | null;
  onSuccess?: (updatedBalance: JahezBalance) => void;
  locale?: "ar" | "en";
  wasPrecededByCollection?: boolean;
}

export function ConfirmPaidModal({
  isOpen,
  onClose,
  handover,
  balance,
  onSuccess,
  locale = "ar",
  wasPrecededByCollection = false,
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

  const rawDebtStatus = balance?.debtStatus ?? handover?.debtStatus;
  const isFrozen =
    rawDebtStatus === JahezDebtStatus.Frozen ||
    Boolean(balance?.isAccountFrozen);
  const outstanding = balance?.outstandingAmount ?? 0;
  const isCommissionIncomplete = balance && !balance.commissionComplete;

  const fees = balance?.fees ?? 0;
  const platformDebt = balance?.platformDebt ?? 0;
  const commission = Number(((balance?.postedCommission ?? 0) + (balance?.unpostedCommission ?? 0)).toFixed(2));

  const isActive = rawDebtStatus === JahezDebtStatus.Active;
  const hasOutstandingToCollect = outstanding > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    if (isActive) {
      toast.error(
        "خطأ",
        isEn
          ? "Confirm Paid is not available for active accounts. Active accounts continue calculating commission after settling current dues."
          : "لا يمكن تأكيد السداد لحساب نشط (Active = 1)؛ الحساب النشط يستمر في احتساب العمولة بعد سداد مستحقاته الحالية.",
      );
      return;
    }

    if (hasOutstandingToCollect) {
      toast.error(
        "خطأ",
        isEn
          ? `Cannot confirm paid while collectible outstanding exists (${outstanding} SAR). Collect all receivables first.`
          : `لا يمكن تأكيد السداد وتوجد مبالغ مستحقة للتحصيل (${outstanding} ر.س). يجب تحصيل المستحقات أولاً.`,
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
          ? "تم تسجيل تأكيد السداد وتحرير الحساب المجمد ليصبح متاحًا بنجاح"
          : "تم تسجيل تأكيد اكتمال السداد في السجل المالي للمندوب بنجاح",
      );

      setIdempotencyKey(generateIdempotencyKey("cpd"));
      onSuccess?.(res);
      onClose();
    } catch (err: unknown) {
      if (wasPrecededByCollection) {
        toast.error(
          "تنبيه",
          isEn
            ? "Collection recorded; confirm paid has not completed yet."
            : "تم تسجيل التحصيل؛ لم يكتمل تأكيد السداد بعد.",
        );
      } else {
        const msg = err instanceof Error ? err.message : "تعذر تأكيد اكتمال السداد";
        toast.error("خطأ في العملية", msg);
      }
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
        {wasPrecededByCollection && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold block">
                {isEn ? "Collection Recorded Successfully" : "تم تسجيل التحصيل بنجاح"}
              </span>
              <p className="text-[11px] mt-0.5">
                {isEn
                  ? "The collection is recorded on the server. You can now complete the paid confirmation step separately. If this step fails, retry confirmation only without repeating the collection."
                  : "تم تسجيل التحصيل في الخادم بنجاح. يمكنك الآن إتمام خطوة تأكيد السداد كإجراء منفصل. في حال تعثر هذا الإجراء، أعد محاولة التأكيد فقط دون إعادة إرسال التحصيل."}
              </p>
            </div>
          </div>
        )}

        {/* Banner based on Frozen vs Released */}
        {isFrozen ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50/90 p-4 dark:border-teal-900/60 dark:bg-teal-950/20 text-sm text-teal-900 dark:text-teal-200 space-y-1">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-bold block">
                  {isEn
                    ? "Confirming payment records confirmation and releases the frozen account."
                    : "تأكيد السداد يسجل التأكيد ويحرر الحساب المجمد ليصبح متاحًا للإسناد؛ ولا يسجل قبضًا جديدًا."}
                </span>
                <p className="text-xs text-teal-800/90 dark:text-teal-300/90 leading-relaxed">
                  {isEn
                    ? "Does not create a new cash collection. It releases the frozen account while documenting rider clearance."
                    : "العملية توثق براءة ذمة المندوب وترفع التجميد عن الحساب دون إدخال مبالغ نقدية إلى الصندوق."}
                </p>
              </div>
            </div>
          </div>
        ) : isActive ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-900/60 dark:bg-amber-950/20 text-sm text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-bold block">
                  {isEn
                    ? "Account is Active: Confirm Paid is not applicable."
                    : "الحساب نشط (Active = 1): لا ينطبق إجراء تأكيد السداد."}
                </span>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  {isEn
                    ? "Active accounts continue calculating commission even after settling current obligations."
                    : "الحساب النشط يستمر في احتساب العمولة اليومية بعد سداد مستحقاته الحالية، ويقتصر تأكيد السداد على الحسابات غير النشطة."}
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
                    : "سيُسجل تأكيد سداد هذه الفترة في سجل المندوب المالي (توثيق حالة دون قبض جديد)."}
                </span>
                <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  {isEn
                    ? "Creates a status event verifying zero collectible balance. Does not deposit cash in cashbox."
                    : "يُنشئ قيد حالة لتأكيد خلو الطرف عند عدم وجود مبالغ مستحقة للتحصيل، دون التأثير على الصندوق."}
                </p>
              </div>
            </div>
          </div>
        )}

        {hasOutstandingToCollect && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold block">
                {isEn ? "Action Blocked: Outstanding balance to collect exists" : "لا يمكن التأكيد: توجد مبالغ مستحقة للتحصيل"}
              </span>
              <p className="text-[11px] mt-0.5 text-red-700 dark:text-red-300">
                {isEn
                  ? `Outstanding amount is ${outstanding} SAR. All collectible obligations must be settled first.`
                  : `المبلغ المطلوب تحصيله هو ${outstanding} ر.س. يجب تحصيل وسداد كافة المستحقات الإيجابية أولاً (لا توجد مبالغ مستحقة للتحصيل).`}
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
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300 block">
                {isEn ? "Outstanding to Collect:" : "المبالغ المستحقة للتحصيل:"}
              </span>
              {outstanding === 0 && (
                <span className="text-[11px] text-emerald-600 font-medium block">
                  {isEn
                    ? "✓ No collectible amounts due (negative items represent credit balance)"
                    : "✓ لا توجد مبالغ مستحقة للتحصيل (البنود السالبة تمثل رصيداً دائنًا للمندوب)"}
                </span>
              )}
            </div>
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
            disabled={isSubmitting || hasOutstandingToCollect || isCommissionIncomplete || !reason.trim()}
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
