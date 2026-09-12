"use client";

import { Layers, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Table } from "@/components/ui/Table";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatCount } from "@/lib/reports/utils";
import type { PlatformCoverage } from "@/lib/reports/types";

interface PlatformCoverageTableProps {
  platforms: PlatformCoverage[];
}

export function PlatformCoverageTable({ platforms }: PlatformCoverageTableProps) {
  const { locale } = useAuth();
  const isEn = locale === "en";

  if (!platforms || platforms.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
        <Layers size={28} className="text-slate-400 mb-2" />
        <p>{isEn ? "No platform coverage data available" : "لا تتوفر بيانات منصات حالياً"}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
      {/* Decorative Geometric Corner Watermark */}
      <svg
        className="pointer-events-none absolute top-0 right-0 h-28 w-28 text-slate-900/[0.02] dark:text-white/[0.02]"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="80" cy="20" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
      </svg>

      <div className="relative z-10 flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isEn ? "Platform Account & Rider Coverage" : "تغطية المنصات وحسابات المناديب"}
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {isEn
                ? "Active rider assignments across operating platforms"
                : "إسناد المناديب النشطين على الحسابات في كل منصة"}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[var(--muted)] rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 border border-[var(--border)]">
          {platforms.length} {isEn ? "Platforms" : "منصات"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <thead className="bg-[var(--subtle-bg)] text-xs font-bold text-[var(--muted)] border-b border-[var(--border)]">
            <tr>
              <th className="px-5 py-3.5 text-start">{isEn ? "Platform" : "المنصة"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Code" : "الرمز"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Operational Accounts" : "الحسابات التشغيلية"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Assigned Accounts" : "الحسابات المعينة"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Riders with Account" : "مناديب لديهم حساب"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Riders without Account" : "مناديب بدون حساب"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Status" : "الحالة"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-sm">
            {platforms.map((p) => {
              const displayName = isEn
                ? p.platformNameEn || p.platformNameAr
                : p.platformNameAr || p.platformNameEn || p.platformCode;

              const hasCoverageGap = p.activeRidersWithoutAccount > 0;

              return (
                <tr
                  key={p.platformId}
                  className="transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-2 rounded-full transition-transform duration-300 group-hover:scale-125 ${
                          hasCoverageGap ? "bg-amber-500" : "bg-slate-400 dark:bg-slate-500"
                        }`}
                      />
                      <span>{displayName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-[var(--border)] bg-slate-100/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {p.platformCode}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {formatCount(p.operationalAccountCount, locale)}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-semibold text-slate-900 dark:text-white">
                    {formatCount(p.assignedAccountCount, locale)}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                    {formatCount(p.activeRidersWithAccount, locale)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {hasCoverageGap ? (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-full text-xs border border-rose-200 dark:border-rose-900/60">
                        <AlertTriangle size={11} />
                        {formatCount(p.activeRidersWithoutAccount, locale)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-400 text-xs">
                        <CheckCircle2 size={13} />
                        0
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {hasCoverageGap ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        {isEn ? "Coverage Gap" : "فجوة تغطية"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {isEn ? "Covered" : "مغطى"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
