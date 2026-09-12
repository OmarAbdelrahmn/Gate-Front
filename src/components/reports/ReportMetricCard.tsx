"use client";

import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, AlertTriangle, AlertCircle, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ReportMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "neutral" | "brand" | "blue" | "green" | "emerald" | "amber" | "orange" | "red" | "purple";
  alert?: boolean;
  alertBadgeText?: string;
  href?: string;
  trendText?: string;
  helpText?: string;
  className?: string;
}

export function ReportMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "neutral",
  alert = false,
  alertBadgeText,
  href,
  trendText,
  helpText,
  className = "",
}: ReportMetricCardProps) {
  const { locale } = useAuth();
  const isEn = locale === "en";

  // Less colors: coalesce non-alert into either a refined brand accent or sleek monochrome slate
  const isBrand = tone === "brand" && !alert;

  const cardContent = (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ease-out ${
        alert
          ? "border-rose-300/80 bg-rose-50/25 dark:border-rose-900/60 dark:bg-rose-950/15"
          : isBrand
          ? "border-slate-300/90 dark:border-slate-700 bg-[var(--surface)] hover:border-slate-400 dark:hover:border-slate-600"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-slate-300 dark:hover:border-slate-700"
      } p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] ${
        href
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)]"
          : ""
      } ${className}`}
    >
      {/* Interactive Shimmer Movement Effect on Hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 ease-out group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/[0.04] to-transparent" />

      {/* Decorative Geometric Shapes in Card Corner */}
      <svg
        className="pointer-events-none absolute -bottom-2 -right-2 size-24 text-slate-900/[0.025] dark:text-white/[0.025] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
        viewBox="0 0 100 100"
        fill="none"
      >
        <rect x="20" y="20" width="60" height="60" rx="16" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* Subtle Top Accent Line for Shapes & Structure */}
      <div
        className={`absolute top-0 inset-x-0 h-0.5 transition-all duration-300 ${
          alert
            ? "bg-rose-500"
            : isBrand
            ? "bg-[#1167c9] opacity-70 group-hover:opacity-100"
            : "bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-700"
        }`}
      />

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-semibold text-[var(--muted)] leading-snug">
              {title}
            </span>
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${
                alert
                  ? "border-rose-200 dark:border-rose-900/60 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                  : isBrand
                  ? "border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/40 text-[#1167c9] dark:text-blue-400"
                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
              }`}
            >
              {alert ? <AlertTriangle size={18} /> : <Icon size={18} />}
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                alert
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {value}
            </span>
            {alert && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                <AlertCircle size={10} />
                {alertBadgeText || (isEn ? "Attention" : "تنبيه")}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
              {subtitle}
            </p>
          )}

          {trendText && (
            <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              {trendText}
            </p>
          )}
        </div>

        {(helpText || href) && (
          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
            {helpText ? (
              <span className="text-[11px] text-[var(--muted)]">{helpText}</span>
            ) : (
              <span />
            )}

            {href && (
              <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover:text-[#1167c9] dark:group-hover:text-blue-400 inline-flex items-center gap-1 transition-colors">
                <span>{isEn ? "Details" : "التفاصيل"}</span>
                {isEn ? (
                  <ArrowUpRight
                    size={13}
                    className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                ) : (
                  <ArrowUpLeft
                    size={13}
                    className="transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
