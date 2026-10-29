// src/components/shared/MonthlyUsageBadge.tsx
"use client";

import React from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";

interface MonthlyUsageBadgeProps {
  monthlyUsageStatus?: "Used" | "Unused" | string | null;
  usageMonth?: string | null;
  isEn?: boolean;
  size?: "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

export function MonthlyUsageBadge({
  monthlyUsageStatus,
  usageMonth,
  isEn = false,
  size = "sm",
  className = "",
  showIcon = true,
}: MonthlyUsageBadgeProps) {
  if (!monthlyUsageStatus) return null;

  const isUsed = monthlyUsageStatus === "Used";
  const monthText = usageMonth?.trim() || "";

  const sizeClasses =
    size === "md"
      ? "text-xs px-2.5 py-1 gap-1.5"
      : "text-[11px] px-2 py-0.5 gap-1";

  const colorClasses = isUsed
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60"
    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800";

  const label = isUsed
    ? isEn
      ? `Used (${monthText})`
      : `مستخدم (${monthText})`
    : isEn
    ? `Unused (${monthText})`
    : `غير مستخدم (${monthText})`;

  const tooltip = isEn
    ? `Monthly usage status for ${monthText}: ${isUsed ? "Account has active/historical assignment overlapping this month" : "No assignments overlapping this month"}`
    : `حالة الاستخدام لشهر ${monthText}: ${isUsed ? "الحساب مسند أو ارتبط بعهدة فعلية متداخلة مع الشهر الحالي" : "لم يتم استخدام الحساب في هذا الشهر"}`;

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center font-bold rounded-lg border whitespace-nowrap shadow-xs transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {showIcon &&
        (isUsed ? (
          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CircleDashed className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
        ))}
      <span>{label}</span>
    </span>
  );
}
