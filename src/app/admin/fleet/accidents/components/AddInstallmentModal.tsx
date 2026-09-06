"use client";

import React, { useState, useTransition } from "react";
import { uploadWorkflowAttachment, createWorkflowInstallment } from "@/lib/fleet/api";
import { VehicleAccidentEvidenceType } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { CreditCard, Upload, AlertCircle } from "lucide-react";

interface AddInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accidentId: string;
  workflowRowVersion: string;
  incidentStartedAtUtc?: string;
  incidentEndedAtUtc?: string | null;
  onSuccess: () => void;
}

export function AddInstallmentModal({
  isOpen,
  onClose,
  accidentId,
  workflowRowVersion,
  incidentStartedAtUtc,
  incidentEndedAtUtc,
  onSuccess,
}: AddInstallmentModalProps) {
  const [isPending, startTransition] = useTransition();

  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<number | "">("");
  const [refundEligibleAmount, setRefundEligibleAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("إيصال السداد مطلوب", "يرجى إرفاق إيصال سداد القسط البنكي (PDF أو صورة).");
      return;
    }
    if (!periodFrom || !periodTo || !paidOn || amount === "" || refundEligibleAmount === "") {
      toast.error("بيانات غير مكتملة", "يرجى تعبئة كافة حقول القسط.");
      return;
    }

    if (Number(refundEligibleAmount) > Number(amount)) {
      toast.error("خطأ في المبلغ", "المبلغ المؤهل للاسترداد لا يمكن أن يتجاوز مبلغ القسط المدفوع.");
      return;
    }

    startTransition(async () => {
      try {
        // Step 1: Upload receipt attachment
        const formData = new FormData();
        formData.append("file", file);
        formData.append("evidenceType", String(VehicleAccidentEvidenceType.InstallmentReceipt));
        formData.append("description", `إيصال قسط فترة ${periodFrom} إلى ${periodTo}`);

        const attachmentRes = await uploadWorkflowAttachment(accidentId, formData);

        // Step 2: Create installment record
        await createWorkflowInstallment(accidentId, {
          rowVersion: workflowRowVersion,
          periodFrom,
          periodTo,
          paidOn,
          amount: Number(amount),
          refundEligibleAmount: Number(refundEligibleAmount),
          receiptAttachmentId: attachmentRes.id,
          notes: notes || undefined,
        });

        toast.success("تم بنجاح", "تم تسجيل بيانات القسط والمبلغ المؤهل للاسترداد.");
        onSuccess();
        onClose();
        // Reset form
        setPeriodFrom("");
        setPeriodTo("");
        setAmount("");
        setRefundEligibleAmount("");
        setNotes("");
        setFile(null);
      } catch (err: any) {
        toast.error("فشل الحفظ", err?.message || "حدث خطأ أثناء حفظ القسط");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل قسط مدفوع للمطالبة بالاسترداد" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 pt-3" dir="rtl">
        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-200 flex items-start gap-2">
          <CreditCard className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
          <span>
            يجب أن تتداخل فترة القسط مع فترة تعطل المركبة بسبب الحادث، وأن يكون تاريخ السداد داخل فترة الحادث.
            المبلغ المؤهل يحدده المسؤول بناءً على أيام التعطيل وعقد الشراء.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              بداية فترة القسط <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              نهاية فترة القسط <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              تاريخ السداد الفعلي <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              إجمالي مبلغ القسط (ريال) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="مثال: 1200"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-purple-700 dark:text-purple-300">
              المبلغ المؤهل للاسترداد (ريال) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={refundEligibleAmount}
              onChange={(e) =>
                setRefundEligibleAmount(e.target.value === "" ? "" : parseFloat(e.target.value))
              }
              placeholder="مثال: 450"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            إيصال سداد القسط البنكي (PDF أو صورة) <span className="text-red-500">*</span>
          </label>
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 text-center hover:border-purple-500 transition-colors dark:border-slate-700">
            <input
              type="file"
              accept=".pdf,image/*"
              id="installment-file-input"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }}
            />
            <label
              htmlFor="installment-file-input"
              className="cursor-pointer flex flex-col items-center gap-1.5"
            >
              <Upload className="h-6 w-6 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {file ? file.name : "اضغط لاختيار إيصال القسط"}
              </span>
              <span className="text-[10px] text-slate-400">بحد أقصى 10 ميجابايت</span>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            ملاحظات وتبرير احتساب المبلغ المؤهل
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: المبلغ المطالب به عن 12 يوماً تعطل للمركبة داخل فترة القسط"
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-purple-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {isPending ? "جارٍ الرفع والتسجيل..." : "تسجيل القسط"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
