"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { listRiders } from "@/lib/workforce/api";
import { assignPhoneSimToRider, getPhoneSim, PhoneSim } from "@/lib/fleet/phone-sims-api";

interface AssignSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
  onSuccess: (sim: PhoneSim) => void;
}

export function AssignSimModal({
  isOpen,
  onClose,
  sim,
  onSuccess,
}: AssignSimModalProps) {
  const [riderProfileId, setRiderProfileId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [riders, setRiders] = useState<SelectOption[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && sim) {
      setRiderProfileId("");
      setEffectiveFrom(new Date().toISOString().split("T")[0]);
      setReason("");
      setNotes("");
      setErrors({});
      loadRiders();
    }
  }, [isOpen, sim]);

  async function loadRiders() {
    setLoadingRiders(true);
    try {
      const data = await listRiders();
      const options = (data || [])
        .filter((r) => r.status === "Active" || r.status === "Onboarding")
        .map((r) => ({
          value: r.id, // rider profile id
          label: r.fullNameAr || r.fullNameEn || "مندوب بدون اسم",
          sublabel: `هوية: ${r.iqamaNo || "غير محدد"} | الحالة: ${
            r.status === "Active" ? "نشط" : r.status
          }`,
        }));
      setRiders(options);
    } catch (err) {
      console.error("Failed to load riders for SIM assignment selector", err);
    } finally {
      setLoadingRiders(false);
    }
  }

  if (!sim) return null;

  function validate() {
    const errs: Record<string, string> = {};
    if (!riderProfileId) {
      errs.riderProfileId = "يرجى اختيار المندوب المستلم للشريحة";
    }

    if (!effectiveFrom) {
      errs.effectiveFrom = "تاريخ التعيين مطلوب";
    } else {
      const today = new Date().toISOString().split("T")[0];
      if (effectiveFrom > today) {
        errs.effectiveFrom = "تاريخ بداية التعيين لا يمكن أن يكون في المستقبل";
      }
    }

    if (!reason.trim()) {
      errs.reason = "سبب التسليم للمندوب مطلوب";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sim || !validate()) return;

    setIsSubmitting(true);
    try {
      await assignPhoneSimToRider(sim.id, {
        riderProfileId,
        effectiveFrom,
        reason: reason.trim(),
        notes: notes.trim() || null,
        rowVersion: sim.rowVersion,
      });

      // Refresh SIM details to get updated state with currentRider
      const updatedSim = await getPhoneSim(sim.id);
      onSuccess(updatedSim);
      onClose();
    } catch (err: any) {
      console.error("Error assigning SIM to rider:", err);
      if (err?.details?.errorCode === "phone_sim.rider_not_found") {
        setErrors((prev) => ({ ...prev, riderProfileId: "المندوب غير موجود" }));
      } else if (err?.details?.errorCode === "phone_sim.rider_unavailable") {
        setErrors((prev) => ({ ...prev, riderProfileId: "المندوب غير متاح للتعيين" }));
      } else if (err?.details?.errorCode === "phone_sim.active_assignment_conflict") {
        setErrors((prev) => ({
          ...prev,
          riderProfileId: "الشريحة معينة بالفعل لمندوب آخر. أعد تحميل الصفحة.",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسليم الشريحة لمندوب">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
          <p className="font-bold">الشريحة المراد تسليمها:</p>
          <p className="mt-1 text-sm font-mono font-bold dir-ltr text-start text-blue-950">
            {sim.phoneNumber} {sim.carrierName ? `(${sim.carrierName})` : ""}
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            المندوب المستلم <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            value={riderProfileId}
            onChange={(val) => setRiderProfileId(val)}
            options={riders}
            placeholder={loadingRiders ? "جاري تحميل قائمة المناديب..." : "اختر المندوب..."}
            disabled={loadingRiders}
          />
          {errors.riderProfileId && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.riderProfileId}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            تاريخ بداية التسليم/الاستلام <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={effectiveFrom}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
          />
          {errors.effectiveFrom && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.effectiveFrom}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            سبب تسليم الشريحة <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="مثال: تسليم الشريحة لبدء العمل التشغيلي في التوصيل..."
            className="w-full p-3 text-sm font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
          />
          {errors.reason && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.reason}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            ملاحظات إضافية
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات حول باقة الجهاز أو رقم العقد..."
            className="w-full h-10 px-3 text-sm font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "جاري التسليم..." : "تأكيد تسليم الشريحة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
