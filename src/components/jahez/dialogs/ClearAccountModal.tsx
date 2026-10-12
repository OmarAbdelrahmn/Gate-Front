// src/components/jahez/dialogs/ClearAccountModal.tsx
"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { clearJahezAccount, generateIdempotencyKey } from "@/lib/jahez/api";
import type { JahezBalance, JahezHandover } from "@/lib/jahez/types";
import { ShieldCheck, AlertTriangle, Lock, User } from "lucide-react";

interface ClearAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  handover: JahezHandover | null;
  balance: JahezBalance | null;
  onSuccess?: (updatedHandover: JahezHandover) => void;
  locale?: "ar" | "en";
}

export function ClearAccountModal({
  isOpen,
  onClose,
  handover,
  balance,
  onSuccess,
  locale = "ar",
}: ClearAccountModalProps) {
  const isEn = locale === "en";

  const [externalClearanceReference, setExternalClearanceReference] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey("clr"));

  const targetId = balance?.handoverId || handover?.id;
  const accCode = balance?.account?.code || handover?.account?.code || handover?.externalAccountId || "-";
  const riderName =
    balance?.actualRiderNameAr ||
    balance?.actualRiderNameEn ||
    handover?.actualRiderNameAr ||
    handover?.actualRiderNameEn ||
    "-";

  const outstanding = balance?.outstandingAmount ?? balance?.totalReceivable ?? 0;
  const frozenDate = balance?.frozenAtUtc || handover?.frozenAtUtc;
  const isCommissionIncomplete = balance && !balance.commissionComplete;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    if (isCommissionIncomplete) {
      toast.error(
        "تنبيه",
        isEn
          ? "Cannot clear account while commission calculations are incomplete. Please complete earnings statements first."
          : "لا يمكن تأكيد التصفية وبيانات احتساب العمولة غير مكتملة لهذه الفترة. يرجى إدخال وتغطية كشوف الأرباح أولاً.",
      );
      return;
    }

    const trimmedRef = externalClearanceReference.trim();
    if (!trimmedRef) {
      toast.error(
        "خطأ",
        isEn
          ? "External clearance reference is required"
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
      toast.error("خطأ", isEn ? "Reason is required" : "يرجى كتابة سبب التصفية");
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
      const res = await clearJahezAccount(
        targetId,
        {
          externalClearanceReference: trimmedRef,
          reason: trimmedReason,
        },
        idempotencyKey,
      );

      toast.success(
        "تمت تصفية الحساب بنجاح",
        isEn
          ? "Account clearance confirmed and released for new assignment"
          : "تم تأكيد تصفية الحساب مع جاهز وتحريره لإسناد جديد بنجاح",
      );

      setIdempotencyKey(generateIdempotencyKey("clr"));
      onSuccess?.(res);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تأكيد تصفية الحساب";
      toast.error("خطأ في العملية", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Confirm Clearance with Jahez" : "تأكيد تصفية الحساب مع جاهز"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Guidance and Rules */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 text-sm text-emerald-900 dark:text-emerald-200 space-y-2">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-bold block">
                {isEn
                  ? `Account will become available for a new rider; liabilities remain on [${riderName}].`
                  : `سيصبح الحساب متاحًا لمندوب جديد، وتبقى المديونية الحالية على [${riderName}].`}
              </span>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                {isEn
                  ? "This action records an external operation and does NOT execute a clearance on the Jahez platform. Commission stops at the original freeze date. Execution time is recorded automatically by the server."
                  : "هذا الإجراء يسجل عملية خارجية ولا ينفذ تصفية على منصة جاهز. يستمر توقف عمولة هذه الفترة عند تاريخ التجميد السابق، ويُسجل وقت التصفية تلقائيًا بتوقيت الخادم."}
              </p>
            </div>
          </div>
        </div>

        {isCommissionIncomplete && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold block">
                {isEn ? "Action Blocked: Commission calculation incomplete" : "لا يمكن تنفيذ التصفية: احتساب العمولة غير مكتمل"}
              </span>
              <p className="text-[11px] mt-0.5 text-red-700 dark:text-red-300">
                {isEn
                  ? "Please navigate to the earnings tab and record approved statements covering the period before clearing."
                  : "يرجى الانتقال لتبويب الأرباح وتسجيل كشوف الأرباح المعتمدة التي تغطي أيام الفترة قبل إجراء التصفية."}
              </p>
            </div>
          </div>
        )}

        {/* Identity & Freeze Status Details */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-850 text-xs space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">{isEn ? "Account Code / Driver ID:" : "الحساب / رمز جاهز:"}</span>
            <span className="font-bold text-gray-900 dark:text-white font-mono">{accCode}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-500">{isEn ? "Original Rider:" : "المندوب الأصلي (صاحب الذمة):"}</span>
            <span className="font-bold text-gray-900 dark:text-white">{riderName}</span>
          </div>

          {frozenDate && (
            <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
              <span className="text-gray-500">{isEn ? "Commission Cutoff Day:" : "تاريخ تجميد العمولة:"}</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                {new Date(frozenDate).toLocaleDateString("ar-SA")}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500">{isEn ? "Current Outstanding Debt:" : "المستحق القائم على المندوب:"}</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
              {outstanding.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {isEn ? "External Clearance Reference (with Jahez)" : "مرجع تصفية الحساب مع جاهز"}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <Input
            type="text"
            value={externalClearanceReference}
            onChange={(e) => setExternalClearanceReference(e.target.value)}
            placeholder={
              isEn
                ? "e.g. Official clearance ref / support ticket ID..."
                : "مثال: رقم مرجع التصفية أو التذكرة من منصة جاهز..."
            }
            maxLength={500}
            required
            className="w-full text-sm font-mono"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            {isEn
              ? "The external reference proving account release by Jahez operations."
              : "المرجع الخارجي الذي يثبت تسوية الحساب مع إدارة جاهز (حتى 500 حرف)."}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {isEn ? "Reason" : "سبب التصفية"}
            <span className="text-red-500 mr-1">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isEn
                ? "State clearance reason (e.g. account handed over to company, settled with Jahez)..."
                : "اكتب سبب التصفية (مثل: استلام المخالصة من جاهز وإتاحة الحساب لمندوب جديد)..."
            }
            maxLength={2000}
            rows={3}
            required
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
              isCommissionIncomplete ||
              !externalClearanceReference.trim() ||
              !reason.trim()
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSubmitting
              ? isEn
                ? "Clearing Account..."
                : "جارٍ تصفية الحساب..."
              : isEn
              ? "Confirm Jahez Clearance"
              : "تأكيد التصفية وتحرير الحساب"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
