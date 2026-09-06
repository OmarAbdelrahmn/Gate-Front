"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { closePhoneSimAssignment, getPhoneSim, PhoneSim } from "@/lib/fleet/phone-sims-api";

interface ReturnSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
  onSuccess: (sim: PhoneSim) => void;
}

export function ReturnSimModal({
  isOpen,
  onClose,
  sim,
  onSuccess,
}: ReturnSimModalProps) {
  const [effectiveTo, setEffectiveTo] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && sim) {
      setEffectiveTo(new Date().toISOString().split("T")[0]);
      setReason("");
      setErrors({});
    }
  }, [isOpen, sim]);

  if (!sim || !sim.currentRider) return null;

  const currentRider = sim.currentRider;

  function validate() {
    const errs: Record<string, string> = {};
    if (!effectiveTo) {
      errs.effectiveTo = "تاريخ ارجاع الشريحة مطلوب";
    } else {
      const today = new Date().toISOString().split("T")[0];
      if (effectiveTo > today) {
        errs.effectiveTo = "تاريخ الإرجاع لا يمكن أن يكون في المستقبل";
      }
      if (currentRider.effectiveFrom && effectiveTo < currentRider.effectiveFrom) {
        errs.effectiveTo = `تاريخ الإرجاع لا يمكن أن يكون قبل تاريخ بداية التعيين (${currentRider.effectiveFrom})`;
      }
    }

    if (!reason.trim()) {
      errs.reason = "سبب إرجاع الشريحة مطلوب";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sim || !currentRider || !validate()) return;

    setIsSubmitting(true);
    try {
      await closePhoneSimAssignment(sim.id, currentRider.assignmentId, {
        effectiveTo,
        reason: reason.trim(),
        rowVersion: currentRider.rowVersion,
      });

      // Refresh SIM details to get updated state (status becomes Available, currentRider null)
      const updatedSim = await getPhoneSim(sim.id);
      onSuccess(updatedSim);
      onClose();
    } catch (err: any) {
      console.error("Error returning SIM from rider:", err);
      if (err?.details?.errorCode === "phone_sim.invalid_date_range") {
        setErrors((prev) => ({
          ...prev,
          effectiveTo: "نطاق تاريخ الإرجاع غير صالح بالنسبة لتاريخ البدء",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="استلام / إرجاع الشريحة من المندوب">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950 space-y-1">
          <p className="font-bold">المندوب الحالي الممسك بالشريحة:</p>
          <p className="text-sm font-black text-emerald-950">
            {currentRider.fullNameAr || currentRider.fullNameEn}
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-emerald-800 pt-1">
            <span>تاريخ التسليم: {currentRider.effectiveFrom}</span>
            <span className="font-mono dir-ltr">{sim.phoneNumber}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            تاريخ الإرجاع / الاستلام <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={effectiveTo}
            min={currentRider.effectiveFrom}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setEffectiveTo(e.target.value)}
            className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
          />
          {errors.effectiveTo && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.effectiveTo}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            سبب الإرجاع / الاستلام <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="مثال: انتهاء فترة عمل المندوب وإعادة الشريحة إلى العهدة..."
            className="w-full p-3 text-sm font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
          />
          {errors.reason && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.reason}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "جاري الإرجاع..." : "تأكيد إرجاع الشريحة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
