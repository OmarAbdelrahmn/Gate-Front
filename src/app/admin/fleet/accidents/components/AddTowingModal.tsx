"use client";

import React, { useState, useTransition } from "react";
import { uploadWorkflowAttachment } from "@/lib/fleet/api";
import { VehicleAccidentEvidenceType } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { Truck, Upload, AlertCircle } from "lucide-react";

interface AddTowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  accidentId: string;
  onSuccess: () => void;
}

export function AddTowingModal({
  isOpen,
  onClose,
  accidentId,
  onSuccess,
}: AddTowingModalProps) {
  const [isPending, startTransition] = useTransition();

  const [description, setDescription] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [transportedAtUtc, setTransportedAtUtc] = useState(
    new Date().toISOString().substring(0, 16)
  );
  const [amount, setAmount] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("مستند مطلوب", "يرجى إرفاق صورة أو PDF إيصال السطحة.");
      return;
    }
    if (!description || !fromLocation || !toLocation || amount === "") {
      toast.error("بيانات غير مكتملة", "كافة حقول السطحة مطلوبة نظاماً.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("evidenceType", String(VehicleAccidentEvidenceType.TowingReceipt));
        formData.append("description", description);
        formData.append("fromLocation", fromLocation);
        formData.append("toLocation", toLocation);
        formData.append("transportedAtUtc", new Date(transportedAtUtc).toISOString());
        formData.append("amount", String(amount));

        await uploadWorkflowAttachment(accidentId, formData);
        onSuccess();
        onClose();
        // Reset form
        setDescription("");
        setFromLocation("");
        setToLocation("");
        setAmount("");
        setFile(null);
      } catch (err: any) {
        toast.error("فشل الحفظ", err?.message || "حدث خطأ أثناء رفع إيصال السطحة");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة إيصال سطحة ونقل" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 pt-3" dir="rtl">
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-2">
          <Truck className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            يتم توثيق السطحة كإيصال رسمي (TowingReceipt = 19) مع كافة تفاصيل الرحلة والتكلفة بالريال السعودي.
          </span>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            وصف الرحلة وسبب النقل <span className="text-red-500">*</span>
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: نقل المركبة من موقع الحادث إلى مركز الفحص / ورشة الإصلاح"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              نقطة الانطلاق (من) <span className="text-red-500">*</span>
            </label>
            <Input
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              placeholder="مثال: طريق الملك فهد - موقع الحادث"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              نقطة الوصول (إلى) <span className="text-red-500">*</span>
            </label>
            <Input
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              placeholder="مثال: مستودع الشركة / ورشة الصيانة"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              تاريخ ووقت النقل <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              value={transportedAtUtc}
              onChange={(e) => setTransportedAtUtc(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              تكلفة النقل (ريال سعودي) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="مثال: 150"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            ملف الإيصال (PDF أو صورة) <span className="text-red-500">*</span>
          </label>
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 text-center hover:border-amber-500 transition-colors dark:border-slate-700">
            <input
              type="file"
              accept=".pdf,image/*"
              id="towing-file-input"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }}
            />
            <label
              htmlFor="towing-file-input"
              className="cursor-pointer flex flex-col items-center gap-1.5"
            >
              <Upload className="h-6 w-6 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {file ? file.name : "اضغط لاختيار ملف إيصال السطحة (PDF أو صورة)"}
              </span>
              <span className="text-[10px] text-slate-400">بحد أقصى 10 ميجابايت</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            {isPending ? "جارٍ الحفظ والرفع..." : "حفظ إيصال السطحة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
