"use client";

import { Building2 } from "lucide-react";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatCount } from "@/lib/reports/utils";
import type { SponsorHeadcount } from "@/lib/reports/types";

interface SponsorHeadcountTableProps {
  sponsors: SponsorHeadcount[];
}

export function SponsorHeadcountTable({ sponsors }: SponsorHeadcountTableProps) {
  const { locale } = useAuth();
  const isEn = locale === "en";

  if (!sponsors || sponsors.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
        <Building2 size={28} className="text-slate-400 mb-2" />
        <p>{isEn ? "No sponsor data available" : "لا تتوفر بيانات كفلاء حالياً"}</p>
      </div>
    );
  }

  const getStatusBadge = (status: SponsorHeadcount["status"]) => {
    switch (status) {
      case "Active":
        return <Badge tone="green">{isEn ? "Active" : "نشط"}</Badge>;
      case "Disabled":
        return <Badge tone="orange">{isEn ? "Disabled" : "معطل"}</Badge>;
      case "Archived":
        return <Badge tone="blue">{isEn ? "Archived" : "مؤرشف"}</Badge>;
      default:
        return <Badge tone="blue">{status}</Badge>;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400">
            <Building2 size={17} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            {isEn ? "Headcount Breakdown by Sponsor" : "توزيع القوى العاملة حسب الكفلاء"}
          </h3>
        </div>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {sponsors.length} {isEn ? "Sponsors" : "كفيل"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <thead className="bg-[var(--subtle-bg)] text-xs font-bold text-[var(--muted)] border-b border-[var(--border)]">
            <tr>
              <th className="px-5 py-3.5 text-start">{isEn ? "Sponsor Name" : "اسم الكفيل"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Status" : "الحالة"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Total People" : "إجمالي الأفراد"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Employees" : "الإداريون"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Riders" : "المناديب"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Active People" : "النشطون"}</th>
              <th className="px-5 py-3.5 text-center">{isEn ? "Active Riders" : "المناديب النشطون"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] text-sm">
            {sponsors.map((s) => {
              // Display Arabic by default; fallback to English
              const displayName = isEn
                ? s.sponsorNameEn || s.sponsorNameAr
                : s.sponsorNameAr || s.sponsorNameEn || "-";

              return (
                <tr key={s.sponsorId} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-[#1167c9]" />
                      <span>{displayName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">{getStatusBadge(s.status)}</td>
                  <td className="px-5 py-3.5 text-center font-bold">{formatCount(s.totalPeople, locale)}</td>
                  <td className="px-5 py-3.5 text-center text-[var(--muted)]">{formatCount(s.employees, locale)}</td>
                  <td className="px-5 py-3.5 text-center text-[var(--muted)]">{formatCount(s.riders, locale)}</td>
                  <td className="px-5 py-3.5 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCount(s.activePeople, locale)}
                  </td>
                  <td className="px-5 py-3.5 text-center font-semibold text-blue-600 dark:text-blue-400">
                    {formatCount(s.activeRiders, locale)}
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
