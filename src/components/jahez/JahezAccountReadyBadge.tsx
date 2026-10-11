// src/components/jahez/JahezAccountReadyBadge.tsx
"use client";

import React from "react";
import { CheckCircle2, UserCheck, AlertOctagon, Archive, HelpCircle } from "lucide-react";

interface JahezAccountReadyBadgeProps {
  status?: string | null;
  isAccountReady?: boolean | null;
  isAccountFrozen?: boolean | null;
  locale?: "ar" | "en";
  className?: string;
  showIcon?: boolean;
}

export function JahezAccountReadyBadge({
  status,
  isAccountReady,
  isAccountFrozen,
  locale = "ar",
  className = "",
  showIcon = true,
}: JahezAccountReadyBadgeProps) {
  const isEn = locale === "en";

  // Normalize status string
  const normStatus = (status || "").toLowerCase().trim();

  if (isAccountFrozen || normStatus === "suspended" || normStatus === "frozen") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 ${className}`}
        title={
          isEn
            ? "Account is suspended/frozen. Assignment is blocked until clearance or payment confirmation."
            : "الحساب موقوف/مجمد؛ الإسناد محظور حتى التصفية أو تأكيد السداد"
        }
      >
        {showIcon && <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
        <span>{isEn ? "Suspended / Frozen" : "موقوف (مجمد)"}</span>
      </span>
    );
  }

  if (normStatus === "available" || (isAccountReady === true && normStatus !== "assigned")) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
      >
        {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
        <span>{isEn ? "Available for Assignment" : "متاح للإسناد"}</span>
      </span>
    );
  }

  if (normStatus === "assigned" || isAccountReady === false) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 ${className}`}
      >
        {showIcon && <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
        <span>{isEn ? "Assigned to Rider" : "مسند لمندوب"}</span>
      </span>
    );
  }

  if (normStatus === "retired" || normStatus === "archived") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 ${className}`}
      >
        {showIcon && <Archive className="w-3.5 h-3.5 text-gray-500" />}
        <span>{isEn ? "Retired / Archived" : "متقاعد / مؤرشف"}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 ${className}`}
    >
      {showIcon && <HelpCircle className="w-3 h-3 text-gray-400" />}
      <span>{status || (isEn ? "Operational Status" : "حالة التشغيل")}</span>
    </span>
  );
}
