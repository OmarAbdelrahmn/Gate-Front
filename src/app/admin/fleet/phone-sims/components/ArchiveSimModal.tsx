"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { archivePhoneSim, PhoneSim } from "@/lib/fleet/phone-sims-api";

interface ArchiveSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
  onSuccess: () => void;
}

export function ArchiveSimModal({
  isOpen,
  onClose,
  sim,
  onSuccess,
}: ArchiveSimModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && sim) {
      setReason("");
      setErrors({});
    }
  }, [isOpen, sim]);

  if (!sim) return null;

  const isAssignmentOpen = Boolean(sim.currentRider);

  function validate() {
    const errs: Record<string, string> = {};
    if (isAssignmentOpen) {
      errs.reason = "لا يمكن أرشفة الشريحة وهي معينة حالياً لمندوب. يرجى إرجاع الشريحة أولاً.";
    }
    if (!reason.trim()) {
      errs.reason = "سبب الأرشفة مطلوب";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sim || !validate()) return;

    setIsSubmitting(true);
    try {
      await archivePhoneSim(sim.id, {
        reason: reason.trim(),
        rowVersion: sim.rowVersion,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error archiving SIM:", err);
      if (err?.details?.errorCode === "phone_sim.active_assignment_conflict") {
        setErrors((prev) => ({
          ...prev,
          reason: "تعذر الأرشفة لوجود تعيين نشط للمندوب",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="أرشفة شريحة اتصال">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 space-y-2">
          <p className="font-bold text-sm text-red-950">
            تأكيد أرشفة الشريحة ({sim.phoneNumber})
          </p>
          <p>
            سيتم استبعاد الشريحة من القائمة النشطة وأرشفتها بشكل نهائي في السجلات.
          </p>
          {isAssignmentOpen && (
            <p className="font-black text-red-700 pt-1">
              تنبيه: لا يمكن أرشفة الشريحة وهي معينة حالياً للمندوب ({sim.currentRider?.fullNameAr}).
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            سبب الأرشفة <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isAssignmentOpen}
            rows={3}
            placeholder="مثال: تم إلغاء الشريحة نهائياً وإخراجها من عهدة المخزون..."
            className="w-full p-3 text-sm font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none disabled:opacity-50"
          />
          {errors.reason && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.reason}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={isSubmitting || isAssignmentOpen}
          >
            {isSubmitting ? "جاري الأرشفة..." : "تأكيد الأرشفة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
