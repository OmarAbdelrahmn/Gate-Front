"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Users,
  Building2,
  Layers,
  ShieldCheck,
  ArrowUpLeft,
  ArrowUpRight,
  UserCheck,
  UserX,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getHrDashboardReport } from "@/lib/reports/api";
import type { HrDashboardReport } from "@/lib/reports/types";
import { formatCount } from "@/lib/reports/utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { SponsorHeadcountTable } from "@/components/reports/SponsorHeadcountTable";
import { PlatformCoverageTable } from "@/components/reports/PlatformCoverageTable";

export default function HrDashboardPage() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  const [data, setData] = useState<HrDashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message?: string } | null>(null);

  const fetchReport = useCallback(async () => {
    if (!can("reports.read")) {
      setError({
        status: 403,
        message: isEn
          ? "You do not hold the required 'reports.read' permission to view the HR dashboard."
          : "عفواً، يتطلب عرض لوحة مؤشرات الموارد البشرية توفر صلاحية (reports.read).",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getHrDashboardReport();
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch HR dashboard report:", err);
      setError({
        status: err?.status,
        message: err?.message || (isEn ? "Failed to load HR dashboard" : "تعذر تحميل لوحة الموارد البشرية"),
      });
    } finally {
      setLoading(false);
    }
  }, [can, isEn]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading && !data) {
    return <ReportSkeleton cardCount={6} showTable={true} />;
  }

  if (error && !data) {
    return (
      <ReportErrorState
        status={error.status}
        message={error.message}
        onRetry={fetchReport}
      />
    );
  }

  const hc = data?.headcount;
  const sponsors = data?.sponsors || [];
  const platforms = data?.activePlatforms || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <ReportHeader
        title={isEn ? "HR & Workforce Dashboard" : "لوحة مؤشرات الموارد البشرية والقوى العاملة"}
        subtitle={
          isEn
            ? "Comprehensive headcount analytics, sponsor distributions, and active platform rider assignments."
            : "تحليلات القوى العاملة وتوزيع الكفلاء وحسابات المناديب على المنصات النشطة."
        }
        icon={BriefcaseBusiness}
        badgeText={isEn ? "Workforce" : "القوى العاملة"}
        generatedAtUtc={data?.generatedAtUtc}
        loading={loading}
        onRefresh={fetchReport}
      >
        <Link
          href="/admin/people-compliance"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#1167c9] dark:hover:text-blue-400 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all active:scale-95"
        >
          <ShieldCheck size={14} />
          <span>{isEn ? "Compliance Dashboard" : "لوحة الالتزام والامتثال"}</span>
          {isEn ? <ArrowUpRight size={12} /> : <ArrowUpLeft size={12} />}
        </Link>
      </ReportHeader>

      {/* Primary Summary Cards with Shapes & Movement */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ReportMetricCard
          title={isEn ? "Total People" : "إجمالي الأفراد"}
          value={formatCount(hc?.totalPeople, locale)}
          subtitle={isEn ? "Employees & Riders" : "إداريين ومناديب"}
          icon={Users}
          tone="brand"
          href="/admin/employees"
        />
        <ReportMetricCard
          title={isEn ? "Total Employees" : "إجمالي الإداريين"}
          value={formatCount(hc?.totalEmployees, locale)}
          subtitle={`${formatCount(hc?.activeEmployees, locale)} ${isEn ? "active" : "نشط"}`}
          icon={BriefcaseBusiness}
          href="/admin/employees"
        />
        <ReportMetricCard
          title={isEn ? "Total Riders" : "إجمالي المناديب"}
          value={formatCount(hc?.totalRiders, locale)}
          subtitle={`${formatCount(hc?.activeRiders, locale)} ${isEn ? "active riders" : "مندوب نشط"}`}
          icon={Users}
          href="/admin/employees"
        />
        <ReportMetricCard
          title={isEn ? "Active Riders" : "المناديب النشطون"}
          value={formatCount(hc?.activeRiders, locale)}
          subtitle={isEn ? "Currently operating" : "على رأس العمل التشغيلي"}
          icon={UserCheck}
          tone="brand"
          href="/admin/employees"
        />
        <ReportMetricCard
          title={isEn ? "Without Sponsor" : "أفراد بلا كفيل"}
          value={formatCount(hc?.peopleWithoutSponsor, locale)}
          subtitle={isEn ? "Needs sponsor assignment" : "يحتاجون ربطاً بكفيل"}
          icon={Building2}
          alert={Boolean(hc?.peopleWithoutSponsor && hc.peopleWithoutSponsor > 0)}
          alertBadgeText={isEn ? "Action Required" : "مطلوب ربط"}
          href="/admin/employees"
        />
        <ReportMetricCard
          title={isEn ? "Active Riders No Account" : "مناديب بلا أي حساب منصة"}
          value={formatCount(hc?.activeRidersWithoutAnyPlatformAccount, locale)}
          subtitle={isEn ? "Active riders missing any platform" : "مناديب نشطون بلا أي حساب منصة"}
          icon={UserX}
          alert={Boolean(
            hc?.activeRidersWithoutAnyPlatformAccount &&
              hc.activeRidersWithoutAnyPlatformAccount > 0
          )}
          alertBadgeText={isEn ? "Unassigned" : "غير مسند"}
          href="/admin/platforms/accounts"
        />
      </div>

      {/* Secondary Headcount Insights Banner with Subtle Geometric Backdrop */}
      <Card className="relative overflow-hidden p-6 border-slate-200 dark:border-slate-800 bg-[var(--surface)] shadow-xs">
        {/* Decorative Geometric Rings */}
        <div className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full border border-slate-900/[0.04] dark:border-white/[0.04] animate-float-slow" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 size-28 rounded-full border border-slate-900/[0.03] dark:border-white/[0.03]" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEn ? "Platform Coverage Gaps" : "إجمالي فجوات التغطية بين المناديب والمنصات"}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">
                {isEn
                  ? "Total missing rider/platform pairs across all active operational platforms."
                  : "مجموع أزواج المناديب غير المسندين إلى المنصات المستهدفة (إذا كان المندوب يفتقد منصتين فإنه يساهم بـ 2)."}
              </p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 self-start sm:self-auto rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-4 py-2.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {formatCount(hc?.activeRiderPlatformCoverageGaps, locale)}
            </span>
            <span className="text-xs font-semibold text-[var(--muted)]">
              {isEn ? "missing pairs" : "فجوة تغطية"}
            </span>
          </div>
        </div>
      </Card>

      {/* Platform Coverage Table Section */}
      <div className="space-y-4">
        <PlatformCoverageTable platforms={platforms} />
      </div>

      {/* Sponsors Table Section */}
      <div className="space-y-4">
        <SponsorHeadcountTable sponsors={sponsors} />
      </div>
    </div>
  );
}
