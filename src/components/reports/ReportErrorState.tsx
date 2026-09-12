"use client";

import { ShieldAlert, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ReportErrorStateProps {
  status?: number;
  message?: string;
  onRetry?: () => void;
}

export function ReportErrorState({
  status,
  message,
  onRetry,
}: ReportErrorStateProps) {
  const { locale } = useAuth();
  const isEn = locale === "en";
  const is403 = status === 403;

  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-xs">
      <div
        className={`grid size-14 place-items-center rounded-2xl ${
          is403
            ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
            : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
        }`}
      >
        {is403 ? <ShieldAlert size={28} /> : <AlertCircle size={28} />}
      </div>

      <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
        {is403
          ? isEn
            ? "Permission Required"
            : "صلاحية غير متوفرة"
          : isEn
          ? "Failed to load report data"
          : "تعذر تحميل بيانات التقرير"}
      </h3>

      <p className="mt-1.5 max-w-md text-sm text-[var(--muted)]">
        {message ||
          (is403
            ? isEn
              ? "You do not hold the required 'reports.read' permission to view this dashboard."
              : "عفواً، يتطلب عرض هذا التقرير امتلاك صلاحية (reports.read). يرجى مراجعة مسؤول النظام."
            : isEn
            ? "An unexpected error occurred while fetching the report. Please try again."
            : "حدث خطأ غير متوقع أثناء استرجاع بيانات التقرير. يرجى المحاولة مرة أخرى.")}
      </p>

      {onRetry && !is403 && (
        <div className="mt-5">
          <Button variant="primary" onClick={onRetry} className="gap-2">
            <RefreshCw size={15} />
            <span>{isEn ? "Try Again" : "إعادة المحاولة"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
