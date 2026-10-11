// src/components/jahez/dialogs/TransferDebtModal.tsx
"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { transferJahezDebt, generateIdempotencyKey } from "@/lib/jahez/api";
import type { JahezBalance, JahezHandover } from "@/lib/jahez/types";
import { ArrowRightLeft, AlertTriangle, ShieldCheck, User } from "lucide-react";

interface TransferDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  handover: JahezHandover | null;
  balance: JahezBalance | null;
  onSuccess?: (updatedHandover: JahezHandover) => void;
  locale?: "ar" | "en";
}

export function TransferDebtModal({
  isOpen,
  onClose,
  handover,
  balance,
  onSuccess,
  locale = "ar",
}: TransferDebtModalProps) {
  const isEn = locale === "en";

  const [effectiveAt, setEffectiveAt] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [externalClearanceReference, setExternalClearanceReference] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey("trf"));

  const targetId = balance?.handoverId || handover?.id;
  const accCode = balance?.account?.code || handover?.account?.code || handover?.externalAccountId || "-";
  const riderName =
    balance?.actualRiderNameAr ||
    balance?.actualRiderNameEn ||
    handover?.actualRiderNameAr ||
    handover?.actualRiderNameEn ||
    "-";

  const fees = balance?.fees ?? 0;
  const platformDebt = balance?.platformDebt ?? 0;
  const commission = Number(((balance?.postedCommission ?? 0) + (balance?.unpostedCommission ?? 0)).toFixed(2));
  const outstanding = balance?.outstandingAmount ?? (Math.max(0, fees) + Math.max(0, platformDebt) + Math.max(0, commission));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    const trimmedRef = externalClearanceReference.trim();
    if (!trimmedRef) {
      toast.error(
        "خطأ",
        isEn
          ? "External clearance reference with Jahez is required"
          : "يرجى إدخال مرجع تصفية الحساب مع جاهز",
      );
      return;
    }
    if (trimmedRef.length > 500) {
      toast.error(
        "خطأ",
        isEn ? "Reference cannot exceed 500 characters" : "لا يمكن أن يتجاوز المرجع 500 حرف",
      );
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("خطأ", isEn ? "Reason is required" : "يرجى كتابة سبب نقل المديونية");
      return;
    }
    if (trimmedReason.length > 2000) {
      toast.error(
        "خطأ",
        isEn ? "Reason cannot exceed 2000 characters" : "لا يمكن أن يتجاوز السبب 2,000 حرف",
      );
      return;
    }

    if (!effectiveAt) {
      toast.error("خطأ", isEn ? "Effective date/time is required" : "يرجى تحديد وقت السريان");
      return;
    }

    const isoString = new Date(effectiveAt).toISOString();

    setIsSubmitting(true);
    try {
      const res = await transferJahezDebt(
        targetId,
        {
          effectiveAtUtc: isoString,
          reason: trimmedReason,
          externalClearanceReference: trimmedRef,
        },
        idempotencyKey,
      );

      toast.success(
        "تم نقل المديونية بنجاح",
        isEn
          ? "Debt transferred to rider and account released successfully"
          : "تم نقل المديونية لذمة المندوب وتحرير الحساب بنجاح",
      );

      setIdempotencyKey(generateIdempotencyKey("trf"));
      onSuccess?.(res);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر نقل المديونية";
      toast.error("خطأ في العملية", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Transfer Debt to Rider & Release Account" : "نقل المديونية للمندوب وتحرير الحساب"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning and Guidance */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/90 p-4 dark:border-purple-900/60 dark:bg-purple-950/20 text-sm text-purple-900 dark:text-purple-200 space-y-2">
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-bold block">
                {isEn
                  ? `The account will be released for another rider; liabilities remain on [${riderName}].`
                  : `سيُحرر الحساب لإسناده لمندوب آخر، وتبقى مستحقات هذه الفترة على [${riderName}].`}
              </span>
              <p className="text-xs text-purple-800/90 dark:text-purple-300/90 leading-relaxed">
                {isEn
                  ? "This action does NOT record a cash collection. It separates the account from the rider's financial obligation."
                  : "لا تسجل هذه العملية تحصيلًا نقديًا، بل تثبت المديونية في سجل المندوب وتتيح إعادة استخدام الحساب."}
              </p>
            </div>
          </div>
        </div>

        {/* Identity & 3 Buckets Preview */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-850 text-xs space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700">
            <User className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[11px] text-gray-500 block">{isEn ? "Original Liable Rider:" : "المندوب المستحق عليه بذمته:"}</span>
              <span className="font-bold text-sm text-gray-900 dark:text-white">{riderName}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-gray-500 block">{isEn ? "Account:" : "الحساب:"}</span>
              <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{accCode}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700">
              <span className="text-[10px] text-gray-500 block">{isEn ? "Fees" : "الرسوم"}</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {fees.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
              </span>
            </div>

            <div className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700">
              <span className="text-[10px] text-gray-500 block">{isEn ? "Platform Debt" : "مديونية جاهز"}</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {platformDebt.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
              </span>
            </div>

            <div className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700">
              <span className="text-[10px] text-gray-500 block">{isEn ? "Commission" : "العمولة"}</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {commission.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {isEn ? "Total Collectible from Rider:" : "إجمالي المطلوب تحصيله من المندوب:"}
            </span>
            <span className="font-bold text-purple-700 dark:text-purple-300 font-mono text-sm">
              {outstanding.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
            </span>
          </div>
        </div>

        {/* Form Inputs */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {isEn ? "External Clearance Reference (Jahez)" : "مرجع تصفية الحساب مع جاهز"}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <Input
            type="text"
            value={externalClearanceReference}
            onChange={(e) => setExternalClearanceReference(e.target.value)}
            placeholder={
              isEn
                ? "e.g. Clearance ticket/reference ID from Jahez portal..."
                : "مثال: رقم تذكرة أو خطاب التصفية مع إدارة جاهز..."
            }
            maxLength={500}
            required
            className="w-full text-sm font-mono"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            {isEn
              ? "Official clearance document/ticket reference from Jahez."
              : "المرجع الرسمي لإثبات مخالصة الحساب مع منصة جاهز (حتى 500 حرف)."}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {isEn ? "Effective Date & Time" : "وقت وتاريخ السريان"}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <Input
            type="datetime-local"
            value={effectiveAt}
            onChange={(e) => setEffectiveAt(e.target.value)}
            required
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {isEn ? "Reason" : "سبب نقل المديونية"}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isEn
                ? "State the reason for debt transfer (e.g. rider exited company, handing over account...)"
                : "اكتب سبب نقل المديونية (مثل: انتهاء خدمة المندوب مع إثبات المديونية بذمته المالية...)"
            }
            maxLength={2000}
            rows={3}
            required
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
            variant="primary"
            disabled={
              isSubmitting ||
              !externalClearanceReference.trim() ||
              !reason.trim() ||
              !effectiveAt
            }
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {isSubmitting
              ? isEn
                ? "Transferring..."
                : "جارٍ نقل المديونية..."
              : isEn
              ? "Confirm Transfer & Release"
              : "تأكيد نقل المديونية وتحرير الحساب"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
