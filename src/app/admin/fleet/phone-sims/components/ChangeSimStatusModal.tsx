"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { changePhoneSimStatus, PhoneSim, PhoneSimStatus } from "@/lib/fleet/phone-sims-api";

interface ChangeSimStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
  onSuccess: (sim: PhoneSim) => void;
}

const ALLOWED_MANUAL_STATUSES: { value: PhoneSimStatus; label: string; desc: string }[] = [
  { value: "Available", label: "متاحة (Available)", desc: "الشريحة مجهزة وجاهزة للتعيين والتسليم للمناديب" },
  { value: "Suspended", label: "معلقة مؤقتاً (Suspended)", desc: "تم إيقاف الخدمة مؤقتاً من قبل شركة الاتصالات" },
  { value: "Lost", label: "مفقودة / مفقودات (Lost)", desc: "تم فقدان الشريحة ويجري متابعة استخراج بدل فاقد" },
  { value: "Deactivated", label: "ملغاة / غير نشطة (Deactivated)", desc: "تم إغلاق الخط بصفة نهائية لدى المزود" },
];

export function ChangeSimStatusModal({
  isOpen,
  onClose,
  sim,
  onSuccess,
}: ChangeSimStatusModalProps) {
  const [status, setStatus] = useState<PhoneSimStatus>("Available");
  const [reason, setReason] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && sim) {
      // Default to current status if allowed, else Available
      const isCurrentAllowed = ALLOWED_MANUAL_STATUSES.some(s => s.value === sim.status);
      setStatus(isCurrentAllowed ? sim.status : "Available");
      setReason("");
      setErrors({});
    }
  }, [isOpen, sim]);

  if (!sim) return null;

  const isAssignmentOpen = Boolean(sim.currentRider);

  function validate() {
    const errs: Record<string, string> = {};
    if (isAssignmentOpen) {
      errs.status = "لا يمكن تغيير حالة الشريحة يدوياً وهي معينة حالياً لمندوب. يرجى إرجاع الشريحة أولاً.";
    }
    if (!status) {
      errs.status = "يرجى اختيار الحالة الجديدة";
    }
    if (!reason.trim()) {
      errs.reason = "سبب تغيير الحالة مطلوب";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sim || !validate()) return;

    if (status === "Assigned") {
      setErrors({ status: "لا يمكن اختيار حالة 'معين' يدوياً. استخدم مسار التعيين لمندوب." });
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedSim = await changePhoneSimStatus(sim.id, {
        status: status as "Available" | "Suspended" | "Lost" | "Deactivated",
        reason: reason.trim(),
        rowVersion: sim.rowVersion,
      });
      onSuccess(updatedSim);
      onClose();
    } catch (err: any) {
      console.error("Error changing SIM status:", err);
      if (err?.details?.errorCode === "phone_sim.active_assignment_conflict") {
        setErrors((prev) => ({
          ...prev,
          status: "تعذر تغيير الحالة لوجود تعيين نشط للمندوب",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تغيير حالة الشريحة">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isAssignmentOpen && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-medium">
            <p className="font-bold">تنبيه حظر الإجراء:</p>
            <p className="mt-1">
              الشريحة معينة حالياً للمندوب ({sim.currentRider?.fullNameAr}). يجب إنهاء وإرجاع التعيين أولاً قبل تغيير الحالة يدوياً.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-2">
            اختر الحالة الجديدة <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {ALLOWED_MANUAL_STATUSES.map((item) => (
              <label
                key={item.value}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  status === item.value
                    ? "border-[#1167c9] bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200"
                    : "border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800/50"
                } ${isAssignmentOpen ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="radio"
                  name="simStatus"
                  value={item.value}
                  checked={status === item.value}
                  onChange={() => setStatus(item.value)}
                  disabled={isAssignmentOpen}
                  className="mt-0.5 text-[#1167c9]"
                />
                <div>
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[11px] text-[var(--muted)] font-normal mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
          {errors.status && (
            <p className="text-xs text-red-500 font-semibold mt-1.5">{errors.status}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            سبب تغيير الحالة <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isAssignmentOpen}
            rows={3}
            placeholder="أدخل السبب الإداري لتغيير الحالة..."
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
            variant="primary"
            disabled={isSubmitting || isAssignmentOpen}
          >
            {isSubmitting ? "جاري التحديث..." : "تغيير الحالة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
