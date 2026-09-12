"use client";

import type { ReactNode } from "react";
import { RefreshCw, Clock, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatGeneratedAt } from "@/lib/reports/utils";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badgeText?: string;
  generatedAtUtc?: string | null;
  loading?: boolean;
  onRefresh?: () => void;
  children?: ReactNode;
}

export function ReportHeader({
  title,
  subtitle,
  icon: Icon,
  badgeText,
  generatedAtUtc,
  loading = false,
  onRefresh,
  children,
}: ReportHeaderProps) {
  const { locale } = useAuth();
  const isEn = locale === "en";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all">
      {/* Subtle Geometric Background Shapes */}
      <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-slate-200/40 dark:bg-slate-800/20 blur-2xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 size-36 rounded-full bg-blue-500/5 blur-xl" />

      {/* Decorative Geometric SVG Watermark */}
      <svg
        className="pointer-events-none absolute top-0 right-0 h-full w-48 text-slate-900/[0.02] dark:text-white/[0.02]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="150" cy="50" r="80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="150" cy="50" r="50" stroke="currentColor" strokeWidth="1" />
        <circle cx="150" cy="50" r="20" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 shadow-xs transition-transform duration-300 hover:scale-105">
                <Icon size={21} />
                {/* Live pulsing radar dot */}
                <span className="absolute -top-1 -right-1 flex size-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
                </span>
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-black tracking-tight sm:text-2xl text-slate-900 dark:text-white">
                  {title}
                </h1>
                {badgeText && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="size-1.5 rounded-full bg-[#1167c9]" />
                    {badgeText}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-1 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {generatedAtUtc && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs font-medium text-[var(--muted)] shadow-xs">
              <Clock size={13} className="text-slate-400" />
              <span>{isEn ? "Updated:" : "آخر تحديث:"}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {formatGeneratedAt(generatedAtUtc, locale)}
              </span>
            </div>
          )}

          {onRefresh && (
            <Button
              variant="secondary"
              onClick={onRefresh}
              disabled={loading}
              className="text-xs h-9 gap-1.5 transition-all duration-200 active:scale-95"
            >
              <RefreshCw
                size={13}
                className={`transition-transform duration-500 ${loading ? "animate-spin" : "group-hover:rotate-180"}`}
              />
              <span>{loading ? (isEn ? "Refreshing..." : "جارٍ التحديث...") : (isEn ? "Refresh" : "تحديث البيانات")}</span>
            </Button>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
