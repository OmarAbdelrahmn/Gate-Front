"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { listEmployees } from "@/lib/workforce/api";
import { transferPhoneSimResponsibility, PhoneSim } from "@/lib/fleet/phone-sims-api";

interface TransferResponsibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
  onSuccess: (sim: PhoneSim) => void;
}

export function TransferResponsibilityModal({
  isOpen,
  onClose,
  sim,
  onSuccess,
}: TransferResponsibilityModalProps) {
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState("");
  const [reason, setReason] = useState("");

  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && sim) {
      setResponsibleEmployeeId("");
      setReason("");
      setErrors({});
      loadEmployees(sim.responsibleEmployeeId);
    }
  }, [isOpen, sim]);

  async function loadEmployees(currentEmpId: string) {
    setLoadingEmployees(true);
    try {
      const data = await listEmployees();
      const allEmps = data || [];
      const listToMap = allEmps.filter(
        (emp) => emp.isEmployee === true && emp.id !== currentEmpId
      );

      const options = listToMap.map((emp) => ({
        value: emp.id,
        label: emp.fullNameAr || emp.fullNameEn || "موظف بدون اسم",
        sublabel: `هوية: ${emp.iqamaNo || emp.employeeNumber || "غير محدد"}${
          emp.jobTitleAr ? ` - ${emp.jobTitleAr}` : ""
        }`,
      }));
      setEmployees(options);
    } catch (err) {
      console.error("Failed to load employees for responsibility transfer", err);
    } finally {
      setLoadingEmployees(false);
    }
  }

  if (!sim) return null;

  function validate() {
    const errs: Record<string, string> = {};
    if (!responsibleEmployeeId) {
      errs.responsibleEmployeeId = "يرجى اختيار الموظف المسؤول الجديد";
    } else if (responsibleEmployeeId === sim?.responsibleEmployeeId) {
      errs.responsibleEmployeeId = "الموظف المختار هو الموظف المسؤول الحالي نفسه";
    }

    if (!reason.trim()) {
      errs.reason = "سبب نقل المسؤولية مطلوب";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sim || !validate()) return;

    setIsSubmitting(true);
    try {
      const updatedSim = await transferPhoneSimResponsibility(sim.id, {
        responsibleEmployeeId,
        reason: reason.trim(),
        rowVersion: sim.rowVersion,
      });
      onSuccess(updatedSim);
      onClose();
    } catch (err: any) {
      console.error("Error transferring responsibility:", err);
      if (err?.details?.errorCode === "phone_sim.responsible_employee_unavailable") {
        setErrors((prev) => ({
          ...prev,
          responsibleEmployeeId: "الموظف المحدد غير متاح كمسؤول",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="نقل مسؤولية عهدة الشريحة">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
          <p className="font-bold">المسؤول الحالي عن الشريحة ({sim.phoneNumber}):</p>
          <p className="mt-1 text-sm font-black text-amber-950">
            {sim.responsibleEmployeeNameAr}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[var(--foreground)]">
              الموظف المسؤول الجديد <span className="text-red-500">*</span>
            </label>
            <a
              href="/dashboard/employees/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#1167c9] dark:text-blue-400 hover:underline"
            >
              + إضافة موظف جديد
            </a>
          </div>
          <SearchableSelect
            value={responsibleEmployeeId}
            onChange={(val) => setResponsibleEmployeeId(val)}
            options={employees}
            placeholder={loadingEmployees ? "جاري تحميل الموظفين..." : "اختر المسؤول الجديد..."}
            disabled={loadingEmployees}
          />
          {errors.responsibleEmployeeId && (
            <p className="text-xs text-red-500 font-semibold mt-1">
              {errors.responsibleEmployeeId}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            سبب نقل المسؤولية <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="مثال: نقل العهدة إلى مشرف الفترة المسائية..."
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
            {isSubmitting ? "جاري النقل..." : "تأكيد نقل العهدة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
