// src/components/jahez/JahezPaymentStatusBadge.tsx
"use client";

import React from "react";
import { JahezDebtStatus, JahezPaymentStatus } from "@/lib/jahez/constants";
import { AlertCircle, CheckCircle2, Lock, HelpCircle } from "lucide-react";

interface JahezPaymentStatusBadgeProps {
  status?: JahezPaymentStatus | number | null;
  debtStatus?: JahezDebtStatus | number | null;
  debtPaidAtUtc?: string | null;
  locale?: "ar" | "en";
  className?: string;
  showIcon?: boolean;
}

export function JahezPaymentStatusBadge({
  status,
  debtStatus,
  debtPaidAtUtc,
  locale = "ar",
  className = "",
  showIcon = true,
}: JahezPaymentStatusBadgeProps) {
  const isEn = locale === "en";
  const isFrozen = debtStatus === JahezDebtStatus.Frozen;

  if (status === JahezPaymentStatus.Outstanding) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 ${className}`}
      >
        {showIcon && <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
        <span>{isEn ? "Outstanding Balance" : "يوجد مستحق"}</span>
      </span>
    );
  }

  if (status === JahezPaymentStatus.Paid) {
    if (isFrozen && !debtPaidAtUtc) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 ${className}`}
          title={
            isEn
              ? "No outstanding balance currently, but the account is still frozen. Paid confirmation is required to release it."
              : "لا يوجد مستحق حاليًا — الحساب ما زال مجمدًا؛ يلزم تأكيد السداد لتحرير الحساب"
          }
        >
          {showIcon && <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
          <span>
            {isEn
              ? "Zero Balance — Still Frozen"
              : "لا يوجد مستحق حاليًا — الحساب ما زال مجمدًا"}
          </span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        title={
          debtPaidAtUtc
            ? isEn
              ? `Confirmed paid on: ${new Date(debtPaidAtUtc).toLocaleDateString()}`
              : `تم تأكيد اكتمال السداد بتاريخ: ${new Date(debtPaidAtUtc).toLocaleDateString("ar-SA")}`
            : undefined
        }
      >
        {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
        <span>{isEn ? "No Outstanding Balance" : "لا يوجد مستحق حاليًا"}</span>
        {debtPaidAtUtc && (
          <span className="text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
            ✓
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 ${className}`}
    >
      {showIcon && <HelpCircle className="w-3 h-3 text-gray-400" />}
      <span>{isEn ? "Unspecified" : "غير محدد"}</span>
    </span>
  );
}
