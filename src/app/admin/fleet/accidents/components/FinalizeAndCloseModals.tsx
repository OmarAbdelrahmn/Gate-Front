"use client";

import React, { useState, useTransition } from "react";
import { finalizeAccidentReport, closeAccident } from "@/lib/fleet/api";
import {
  VehicleAccidentStatus,
  VehicleAccidentWorkflowStage,
  VehicleAccidentRefundStatus,
  VehicleAccidentWorkflowDetailResponse,
  VehicleAccidentDetailResponse,
} from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { ShieldCheck, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface FinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accidentId: string;
  accidentSummaryRowVersion: string;
  onSuccess: () => void;
}

export function FinalizeAccidentModal({
  isOpen,
  onClose,
  accidentId,
  accidentSummaryRowVersion,
  onSuccess,
}: FinalizeModalProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("سبب الاعتماد مطلوب", "يرجى كتابة سبب أو ملاحظات اعتماد التقرير.");
      return;
    }

    startTransition(async () => {
      try {
        await finalizeAccidentReport(accidentId, {
          reason: reason.trim(),
          rowVersion: accidentSummaryRowVersion,
        });
        toast.success("تم الاعتماد", "تم اعتماد وإقفال تقرير الحادث الرسمي وتوليد النسخة المعتمدة.");
        onSuccess();
        onClose();
        setReason("");
      } catch (err: any) {
        toast.error("فشل الاعتماد", err?.message || "حدث خطأ أثناء اعتماد تقرير الحادث");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="اعتماد تقرير الحادث الرسمي" maxWidth="max-w-md">
      <form onSubmit={handleFinalize} className="space-y-4 pt-3" dir="rtl">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 flex items-start gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <span>
            اعتماد التقرير يقوم بتثبيت بيانات الحادث الأساسية وإصدار تقرير PDF رسمي معتمد برقم نسخة جديد.
            ملاحظة: اعتماد التقرير لا ينهي دورة المطالبة المالية للمركبة.
          </span>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            سبب / ملاحظات الاعتماد <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: تم تدقيق تقرير نجم ومطابقة أضرار المركبة والمستندات..."
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isPending ? "جارٍ الاعتماد..." : "تأكيد اعتماد التقرير"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface CloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  accidentId: string;
  accidentSummaryRowVersion: string;
  accidentDetail: VehicleAccidentDetailResponse | null;
  workflowDetail: VehicleAccidentWorkflowDetailResponse | null;
  onSuccess: () => void;
}

export function CloseAccidentModal({
  isOpen,
  onClose,
  accidentId,
  accidentSummaryRowVersion,
  accidentDetail,
  workflowDetail,
  onSuccess,
}: CloseModalProps) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const isReportFinalized =
    accidentDetail?.summary?.status === VehicleAccidentStatus.Finalized ||
    accidentDetail?.summary?.status === VehicleAccidentStatus.Closed;

  const isWorkflowCompleted =
    workflowDetail?.stage === VehicleAccidentWorkflowStage.Completed;

  const refundStatus = workflowDetail?.refund?.status;
  const isRefundSettled =
    refundStatus === VehicleAccidentRefundStatus.Received ||
    refundStatus === VehicleAccidentRefundStatus.Rejected ||
    refundStatus === VehicleAccidentRefundStatus.NotApplicable;

  const canClose = isReportFinalized && isWorkflowCompleted && isRefundSettled;

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canClose) {
      toast.error("الشروط غير مكتملة", "لا يمكن إغلاق ملف الحادث قبل استيفاء كافة الشروط النظامية.");
      return;
    }
    if (!reason.trim()) {
      toast.error("سبب الإغلاق مطلوب", "يرجى كتابة سبب إغلاق الملف.");
      return;
    }

    startTransition(async () => {
      try {
        await closeAccident(accidentId, {
          reason: reason.trim(),
          rowVersion: accidentSummaryRowVersion,
        });
        toast.success("تم الإغلاق بنجاح", "تم إنهاء وإغلاق ملف الحادث والمطالبة بالكامل.");
        onSuccess();
        onClose();
        setReason("");
      } catch (err: any) {
        toast.error("فشل الإغلاق", err?.message || "حدث خطأ أثناء إغلاق ملف الحادث");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إغلاق ملف الحادث والمطالبة نهائياً" maxWidth="max-w-lg">
      <form onSubmit={handleClose} className="space-y-4 pt-3" dir="rtl">
        {/* Checklist of Prerequisites */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            شروط ومتطلبات إغلاق الحادث النظامية:
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              {isReportFinalized ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={isReportFinalized ? "text-emerald-700 font-semibold" : "text-red-600"}>
                تقرير الحادث معتمد (Finalized)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isWorkflowCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={isWorkflowCompleted ? "text-emerald-700 font-semibold" : "text-red-600"}>
                دورة العمل في مرحلة مكتملة (Completed = 18)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isRefundSettled ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={isRefundSettled ? "text-emerald-700 font-semibold" : "text-red-600"}>
                حسم ملف استرداد الأقساط (استلام أو رفض أو إثبات عدم وجود أقساط)
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            سبب / مذكرة إغلاق الملف <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: تم اكتمال كافة التسويات المالية وإصلاح المركبة واسترداد الأقساط ولا توجد أي مطالبات معلقة..."
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-red-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={!canClose || isPending}
            className="bg-slate-900 hover:bg-slate-950 text-white font-bold dark:bg-white dark:text-slate-900"
          >
            {isPending ? "جارٍ الإغلاق..." : "تأكيد إغلاق الملف نهائياً"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
