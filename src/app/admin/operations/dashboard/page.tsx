"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Server,
  House,
  Smartphone,
  Fuel,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowUpLeft,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getOperationsDashboardReport } from "@/lib/reports/api";
import type { OperationsDashboardReport } from "@/lib/reports/types";
import { formatCount, formatPercentage } from "@/lib/reports/utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";

export default function OperationsDashboardPage() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  const [data, setData] = useState<OperationsDashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message?: string } | null>(null);

  const fetchReport = useCallback(async () => {
    if (!can("reports.read")) {
      setError({
        status: 403,
        message: isEn
          ? "You do not hold the required 'reports.read' permission to view the operations dashboard."
          : "عفواً، يتطلب عرض لوحة مؤشرات العمليات توفر صلاحية (reports.read).",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getOperationsDashboardReport();
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch operations dashboard report:", err);
      setError({
        status: err?.status,
        message: err?.message || (isEn ? "Failed to load operations dashboard" : "تعذر تحميل لوحة العمليات"),
      });
    } finally {
      setLoading(false);
    }
  }, [can, isEn]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading && !data) {
    return <ReportSkeleton cardCount={6} showTable={false} />;
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

  const hasSimsNeedingAttention = Boolean(
    data?.phoneSimsNeedingAttention && data.phoneSimsNeedingAttention > 0
  );

  const platformUtilization =
    data?.operationalPlatformAccounts && data.operationalPlatformAccounts > 0
      ? (data.assignedPlatformAccounts / data.operationalPlatformAccounts) * 100
      : 0;

  const housingOccupancy =
    data?.totalActiveHousingCapacity && data.totalActiveHousingCapacity > 0
      ? (data.currentHousingResidents / data.totalActiveHousingCapacity) * 100
      : 0;

  const simAssignmentRate =
    data?.totalPhoneSims && data.totalPhoneSims > 0
      ? (data.assignedPhoneSims / data.totalPhoneSims) * 100
      : 0;

  const fuelAssignmentRate =
    data?.totalFuelCards && data.totalFuelCards > 0
      ? (data.assignedFuelCards / data.totalFuelCards) * 100
      : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <ReportHeader
        title={isEn ? "Operations Dashboard" : "لوحة مؤشرات العمليات التشغيلية"}
        subtitle={
          isEn
            ? "Unified oversight of delivery platforms, housing facilities, telecom SIM cards, and fleet fuel cards."
            : "المتابعة الموحدة لمنصات التوصيل، مرافق السكن، خطوط وشرائح الاتصال، وبطاقات الوقود."
        }
        icon={Layers}
        badgeText={isEn ? "Field Operations" : "العمليات التشغيلية"}
        generatedAtUtc={data?.generatedAtUtc}
        loading={loading}
        onRefresh={fetchReport}
      />

      {/* Critical Alert Banner for Phone SIMs */}
      {hasSimsNeedingAttention && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-300/80 bg-rose-50/30 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                {isEn ? "Telecom SIM Cards Require Attention" : "تنبيه: شرائح اتصال تتطلب تدخلاً عاجلاً"}
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                {isEn
                  ? `There are ${data?.phoneSimsNeedingAttention || 0} SIM cards suspended or reported lost that need replacement or status review.`
                  : `توجد ${data?.phoneSimsNeedingAttention || 0} شريحة اتصال موقوفة أو مفقودة تستلزم الاستبدال أو تعديل الحالة.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Platform Operations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Platform Accounts & Fleet Utilization" : "حسابات المنصات والتشغيل الميداني"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn
                  ? "Operational accounts include Available and Assigned accounts only"
                  : "الحسابات التشغيلية تشمل الحسابات المتاحة والمعينة فقط"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/platforms"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "Manage Platforms" : "إدارة المنصات"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReportMetricCard
            title={isEn ? "Active Operating Platforms" : "المنصات النشطة"}
            value={formatCount(data?.activePlatforms, locale)}
            subtitle={isEn ? "Platforms configured and operational" : "منصات التوصيل النشطة والمعتمدة"}
            icon={Layers}
            tone="brand"
            href="/admin/platforms"
          />
          <ReportMetricCard
            title={isEn ? "Operational Accounts" : "الحسابات التشغيلية"}
            value={formatCount(data?.operationalPlatformAccounts, locale)}
            subtitle={isEn ? "Available and Assigned accounts" : "الحسابات المتاحة والمعينة فقط"}
            icon={Server}
            href="/admin/platforms/accounts"
          />
          <ReportMetricCard
            title={isEn ? "Assigned Platform Accounts" : "الحسابات المسندة لمناديب"}
            value={formatCount(data?.assignedPlatformAccounts, locale)}
            subtitle={`${formatPercentage(platformUtilization)} ${isEn ? "account utilization" : "نسبة إسناد الحسابات التشغيلية"}`}
            icon={Users}
            tone="brand"
            href="/admin/platforms/accounts"
          />
        </div>
      </section>

      {/* SECTION 2: Housing Operations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <House size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Housing Facilities & Rider Accommodation" : "إدارة السكن والإيواء"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn ? "Accommodations capacity and occupancy rate" : "مواقع السكن، الطاقة الاستيعابية، ونسبة الإشغال"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/housing"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "Manage Housing" : "إدارة السكن"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReportMetricCard
            title={isEn ? "Active Housing Locations" : "مواقع السكن النشطة"}
            value={formatCount(data?.activeHousingLocations, locale)}
            subtitle={isEn ? "Operational accommodation units" : "مواقع ومباني السكن المعتمدة"}
            icon={House}
            tone="brand"
            href="/admin/housing"
          />
          <ReportMetricCard
            title={isEn ? "Total Active Capacity" : "الطاقة الاستيعابية النشطة"}
            value={formatCount(data?.totalActiveHousingCapacity, locale)}
            subtitle={isEn ? "Total available beds / spaces" : "إجمالي الأسرّة والأماكن المتاحة بالسكن"}
            icon={Users}
            href="/admin/housing"
          />
          <ReportMetricCard
            title={isEn ? "Current Residents" : "نزلاء السكن الحاليون"}
            value={formatCount(data?.currentHousingResidents, locale)}
            subtitle={`${formatPercentage(housingOccupancy)} ${isEn ? "housing occupancy rate" : "نسبة إشغال السكن الحالية"}`}
            icon={Users}
            href="/admin/housing"
          />
        </div>
      </section>

      {/* SECTION 3: Telecom & SIM Operations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Smartphone size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Telecom & Phone SIMs" : "شرائح الاتصال والاتصالات"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn ? "SIM card inventory, assignments, and suspended/lost lines" : "مخزون الشرائح، العهد والتعيينات، والشرائح المعلقة والمفقودة"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/fleet/phone-sims"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "Manage SIMs" : "إدارة الشرائح"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReportMetricCard
            title={isEn ? "Total Phone SIMs" : "إجمالي شرائح الاتصال"}
            value={formatCount(data?.totalPhoneSims, locale)}
            subtitle={isEn ? "Registered telecom SIM cards" : "إجمالي الشرائح المسجلة بالعهدة"}
            icon={Smartphone}
            tone="brand"
            href="/admin/fleet/phone-sims"
          />
          <ReportMetricCard
            title={isEn ? "Available in Stock" : "شرائح متاحة في المخزون"}
            value={formatCount(data?.availablePhoneSims, locale)}
            subtitle={isEn ? "Unassigned and ready for handover" : "جاهزة لتسليمها للمناديب"}
            icon={CheckCircle2}
            href="/admin/fleet/phone-sims"
          />
          <ReportMetricCard
            title={isEn ? "Assigned SIMs" : "شرائح معينة للمناديب"}
            value={formatCount(data?.assignedPhoneSims, locale)}
            subtitle={`${formatPercentage(simAssignmentRate)} ${isEn ? "active handover rate" : "نسبة التسليم النشط"}`}
            icon={Users}
            href="/admin/fleet/phone-sims/assignments"
          />
          <ReportMetricCard
            title={isEn ? "Needing Attention" : "شرائح تتطلب تدخلاً"}
            value={formatCount(data?.phoneSimsNeedingAttention, locale)}
            subtitle={isEn ? "Suspended and lost SIMs" : "الشرائح الموقوفة والمفقودة"}
            icon={AlertTriangle}
            alert={hasSimsNeedingAttention}
            alertBadgeText={isEn ? "Suspended / Lost" : "معلقة / مفقودة"}
            href="/admin/fleet/phone-sims/archived"
          />
        </div>
      </section>

      {/* SECTION 4: Fuel Cards Operations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Fuel size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Fleet Fuel Cards" : "بطاقات الوقود والمحروقات"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn ? "Company fuel cards allocation" : "توزيع وتخصيص بطاقات التزود بالوقود"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/fleet/fuel-cards"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "Manage Fuel Cards" : "إدارة بطاقات الوقود"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReportMetricCard
            title={isEn ? "Total Fuel Cards" : "إجمالي بطاقات الوقود"}
            value={formatCount(data?.totalFuelCards, locale)}
            subtitle={isEn ? "Registered fuel cards" : "إجمالي البطاقات المسجلة"}
            icon={Fuel}
            tone="brand"
            href="/admin/fleet/fuel-cards"
          />
          <ReportMetricCard
            title={isEn ? "Assigned Fuel Cards" : "بطاقات وقود معينة"}
            value={formatCount(data?.assignedFuelCards, locale)}
            subtitle={`${formatPercentage(fuelAssignmentRate)} ${isEn ? "assigned to riders" : "مسندة لمناديب ومركبات"}`}
            icon={Fuel}
            href="/admin/fleet/fuel-cards"
          />
          <ReportMetricCard
            title={isEn ? "Spare / Unassigned" : "بطاقات احتياطية متاحة"}
            value={formatCount((data?.totalFuelCards ?? 0) - (data?.assignedFuelCards ?? 0), locale)}
            subtitle={isEn ? "Ready for allocation" : "جاهزة للصرف والتعيين"}
            icon={CheckCircle2}
            href="/admin/fleet/fuel-cards"
          />
        </div>
      </section>
    </div>
  );
}
