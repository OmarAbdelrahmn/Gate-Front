"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { updatePhoneSim, PhoneSim, KNOWN_CARRIERS } from "@/lib/fleet/phone-sims-api";

interface EditSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
  onSuccess: (sim: PhoneSim) => void;
}

export function EditSimModal({
  isOpen,
  onClose,
  sim,
  onSuccess,
}: EditSimModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [iccid, setIccid] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [customCarrier, setCustomCarrier] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && sim) {
      setPhoneNumber(sim.phoneNumber || "");
      setIccid(sim.iccid || "");
      
      const existing = sim.carrierName || "";
      const isKnown = KNOWN_CARRIERS.some((c) => c.value === existing);
      if (isKnown) {
        setSelectedCarrier(existing);
        setCustomCarrier("");
      } else if (existing) {
        setSelectedCarrier("Other");
        setCustomCarrier(existing);
      } else {
        setSelectedCarrier("");
        setCustomCarrier("");
      }

      setNotes(sim.notes || "");
      setErrors({});
    }
  }, [isOpen, sim]);

  if (!sim) return null;

  function validate() {
    const errs: Record<string, string> = {};
    if (!phoneNumber.trim()) {
      errs.phoneNumber = "رقم الهاتف مطلوب";
    }
    if (iccid.trim()) {
      const cleanIccid = iccid.trim();
      if (!/^\d{18,22}$/.test(cleanIccid) || !cleanIccid.startsWith("89")) {
        errs.iccid = "رمز ICCID يجب أن يتكون من 18 إلى 22 رقماً ويبدأ بـ 89";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sim || !validate()) return;

    setIsSubmitting(true);
    try {
      const carrierValue = selectedCarrier === "Other" ? customCarrier.trim() : selectedCarrier.trim();
      const updatedSim = await updatePhoneSim(sim.id, {
        phoneNumber: phoneNumber.trim(),
        iccid: iccid.trim() || null,
        carrierName: carrierValue || null,
        notes: notes.trim() || null,
        rowVersion: sim.rowVersion,
      });
      onSuccess(updatedSim);
      onClose();
    } catch (err: any) {
      console.error("Error updating SIM:", err);
      if (err?.details?.errorCode === "phone_sim.duplicate_phone_number") {
        setErrors((prev) => ({ ...prev, phoneNumber: "رقم الهاتف مسجل بالفعل" }));
      } else if (err?.details?.errorCode === "phone_sim.duplicate_iccid") {
        setErrors((prev) => ({ ...prev, iccid: "رمز ICCID مسجل بالفعل" }));
      } else if (err?.details?.errorCode === "phone_sim.invalid_iccid") {
        setErrors((prev) => ({ ...prev, iccid: "رمز ICCID غير صالح" }));
      } else if (err?.details?.errorCode === "phone_sim.invalid_phone_number") {
        setErrors((prev) => ({ ...prev, phoneNumber: "رقم الهاتف غير صالح" }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تعديل بيانات الشريحة">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            رقم الهاتف <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="مثال: +966555123456"
            className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            dir="ltr"
          />
          {errors.phoneNumber && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.phoneNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              شركة الاتصالات / المشغل
            </label>
            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
            >
              <option value="">-- اختر شركة الاتصالات --</option>
              {KNOWN_CARRIERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
              <option value="Other">أخرى (إدخال مشغل آخر)</option>
            </select>
            {selectedCarrier === "Other" && (
              <input
                type="text"
                value={customCarrier}
                onChange={(e) => setCustomCarrier(e.target.value)}
                placeholder="أدخل اسم شركة الاتصالات..."
                className="w-full h-10 px-3 mt-2 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              رمز ICCID (اختياري)
            </label>
            <input
              type="text"
              value={iccid}
              onChange={(e) => setIccid(e.target.value)}
              placeholder="يبدأ بـ 89 ويتكون من 18-22 رقماً"
              className="w-full h-10 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              dir="ltr"
            />
            {errors.iccid && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.iccid}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800">
          <p className="font-bold">ملاحظة تنظيمية:</p>
          <p className="mt-0.5">
            تغيير الموظف المسؤول أو حالة الشريحة يتم عبر الخيارات المخصصة في قائمة الإجراءات
            ولا يُعدل من هذه الشاشة.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            ملاحظات إضافية
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="أدخل أي ملاحظات حول الشريحة..."
            className="w-full p-3 text-sm font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "جاري التحديث..." : "حفظ التعديلات"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
