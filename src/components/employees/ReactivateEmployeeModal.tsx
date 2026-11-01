"use client";

import React, { useState } from "react";
import { UserCheck, Calendar, FileText, AlertTriangle, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import { reactivateEmployee } from "@/lib/workforce/api";

interface ReactivateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName?: string | null;
  iqamaNo?: string | null;
  onSuccess?: () => void;
}

export function ReactivateEmployeeModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  iqamaNo,
  onSuccess,
}: ReactivateEmployeeModalProps) {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const hasUpdatePermission = can("employees.update");

  const todayStr = new Date().toISOString().slice(0, 10);
  const [effectiveDate, setEffectiveDate] = useState(todayStr);
  const [reason, setReason] = useState("Return to work");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasUpdatePermission) {
      toast.error(
        isEn
          ? "You require 'employees.update' permission to reactivate personnel."
          : "تحتاج إلى صلاحية 'تعديل الموظفين' (employees.update) لإعادة التفعيل."
      );
      return;
    }

    if (!effectiveDate) {
      toast.error(isEn ? "Effective date is required." : "يرجى تحديد تاريخ السريان.");
      return;
    }

    setLoading(true);
    try {
      await reactivateEmployee(employeeId, {
        effectiveDate,
        reason: reason.trim() || undefined,
      });

      toast.success(
        isEn
          ? `Successfully reactivated ${employeeName}`
          : `تمت إعادة تفعيل ${employeeName} بنجاح`
      );

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEn
          ? "Failed to reactivate employee"
          : "فشل إعادة تفعيل الموظف";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={isEn ? "Reactivate Personnel" : "إعادة تفعيل الموظف / المندوب"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
        {/* Person Summary */}
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 dark:text-white truncate">
              {employeeName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {iqamaNo && iqamaNo !== "—" ? `رقم الهوية / الإقامة: ${iqamaNo}` : `المعرف: ${employeeId}`}
            </div>
          </div>
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            منتهي الخدمة
          </span>
        </div>

        {/* Informational Guidance Notice */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 leading-relaxed">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-bold mb-1">
                {isEn ? "Reactivation Details:" : "تفاصيل إجراء إعادة التفعيل:"}
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-800 dark:text-blue-300">
                <li>
                  {isEn
                    ? "Checks existing activation requirements."
                    : "التحقق من استيفاء متطلبات التفعيل المعتمدة للنظام."}
                </li>
                <li>
                  {isEn
                    ? "Sets status to Active and clears termination date & reason."
                    : "تحويل الحالة إلى 'نشط' (Active) ومسح تاريخ وسبب إنهاء الخدمة."}
                </li>
                <li>
                  {isEn
                    ? "Records the reactivation change in work history."
                    : "تسجيل حركة إعادة التفعيل في سجل العمل (Work History)."}
                </li>
                <li className="font-semibold text-amber-700 dark:text-amber-400">
                  {isEn
                    ? "Does not restore previous vehicle or housing assignments."
                    : "لا يتم استعادة التكليفات والعهد السابقة تلقائياً."}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Permission Alert if missing */}
        {!hasUpdatePermission && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {isEn
              ? "You do not have the 'employees.update' permission required to execute this action."
              : "لا تملك صلاحية 'تعديل الموظفين' (employees.update) المطلوبة لتنفيذ هذا الإجراء."}
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isEn ? "Effective Date" : "تاريخ السريان"}</span>
              <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
              disabled={loading || !hasUpdatePermission}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span>{isEn ? "Reason" : "سبب إعادة التفعيل"}</span>
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isEn ? "e.g. Return to work" : "مثال: العودة للعمل"}
              disabled={loading || !hasUpdatePermission}
              className="w-full"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {isEn ? "Cancel" : "إلغاء"}
          </Button>

          <Button
            type="submit"
            disabled={loading || !hasUpdatePermission || !effectiveDate}
            className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            <span>{loading ? (isEn ? "Reactivating..." : "جارٍ التفعيل...") : (isEn ? "Reactivate Personnel" : "تأكيد إعادة التفعيل")}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
