// src/components/jahez/JahezDebtStatusBadge.tsx
"use client";

import React from "react";
import { JahezDebtStatus } from "@/lib/jahez/constants";
import {
  Activity,
  CheckCircle,
  ArrowRightLeft,
  Lock,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

interface JahezDebtStatusBadgeProps {
  status?: JahezDebtStatus | number | null;
  locale?: "ar" | "en";
  className?: string;
  showIcon?: boolean;
}

export function JahezDebtStatusBadge({
  status,
  locale = "ar",
  className = "",
  showIcon = true,
}: JahezDebtStatusBadgeProps) {
  const isEn = locale === "en";

  switch (status) {
    case JahezDebtStatus.Active:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 ${className}`}
        >
          {showIcon && <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
          <span>{isEn ? "1 - Active Period" : "فترة مفتوحة"}</span>
        </span>
      );

    case JahezDebtStatus.Closed:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 ${className}`}
        >
          {showIcon && <CheckCircle className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />}
          <span>{isEn ? "2 - Closed Period" : "فترة مغلقة"}</span>
        </span>
      );

    case JahezDebtStatus.TransferredToRider:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 ${className}`}
        >
          {showIcon && <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
          <span>{isEn ? "3 - Transferred to Rider" : "المديونية على المندوب"}</span>
        </span>
      );

    case JahezDebtStatus.Frozen:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 ${className}`}
        >
          {showIcon && <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
          <span>{isEn ? "4 - Frozen Account" : "الحساب مجمد"}</span>
        </span>
      );

    case JahezDebtStatus.AccountCleared:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
          <span>{isEn ? "5 - Cleared with Jahez" : "تمت تصفية الحساب مع جاهز"}</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 ${className}`}
        >
          {showIcon && <HelpCircle className="w-3 h-3 text-gray-400" />}
          <span>{isEn ? "Unknown Status" : "حالة غير محددة"}</span>
        </span>
      );
  }
}
