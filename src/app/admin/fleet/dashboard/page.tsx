"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Car,
  CheckCircle2,
  Key,
  AlertTriangle,
  Wrench,
  Users,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFleetDashboardReport } from "@/lib/reports/api";
import type { FleetDashboardReport } from "@/lib/reports/types";
import { formatCount, formatPercentage } from "@/lib/reports/utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";

export default function FleetDashboardPage() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  const [data, setData] = useState<FleetDashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message?: string } | null>(null);

  const fetchReport = useCallback(async () => {
    if (!can("reports.read")) {
      setError({
        status: 403,
        message: isEn
          ? "You do not hold the required 'reports.read' permission to view the fleet dashboard."
          : "عفواً، يتطلب عرض لوحة مؤشرات الأسطول توفر صلاحية (reports.read).",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getFleetDashboardReport();
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch fleet dashboard report:", err);
      setError({
        status: err?.status,
        message: err?.message || (isEn ? "Failed to load fleet dashboard" : "تعذر تحميل لوحة الأسطول"),
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

  const hasIssues = Boolean(data?.openVehicleIssues && data.openVehicleIssues > 0);
  const hasAccidents = Boolean(data?.unclosedAccidents && data.unclosedAccidents > 0);

  const totalVehicles = data?.totalVehicles || 0;
  const availableVehicles = data?.availableVehicles || 0;
  const assignedVehicles = data?.assignedVehicles || 0;
  const heldVehicles = data?.heldVehicles || 0;
  const decommissionedVehicles = data?.decommissionedVehicles || 0;

  const utilizationRate = totalVehicles > 0 ? (assignedVehicles / totalVehicles) * 100 : 0;
  const availableRate = totalVehicles > 0 ? (availableVehicles / totalVehicles) * 100 : 0;
  const heldRate = totalVehicles > 0 ? (heldVehicles / totalVehicles) * 100 : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <ReportHeader
        title={isEn ? "Fleet Operations Dashboard" : "لوحة مؤشرات الأسطول والمركبات"}
        subtitle={
          isEn
            ? "Real-time vehicle availability, rider handovers, operational hold states, maintenance issues, and accident claims."
            : "متابعة جاهزية الأسطول في الوقت الفعلي، تعيينات المناديب، حالات الحجز، الأعطال والمطالبات."
        }
        icon={Car}
        badgeText={isEn ? "Fleet Operations" : "عمليات الأسطول"}
        generatedAtUtc={data?.generatedAtUtc}
        loading={loading}
        onRefresh={fetchReport}
      />

      {/* Critical Alerts Banner (Issues & Accidents) */}
      {(hasIssues || hasAccidents) && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-300/80 bg-rose-50/30 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                {isEn ? "Critical Fleet Operational Alerts" : "تنبيهات تشغيلية حرجة في الأسطول"}
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                {isEn
                  ? `There are ${data?.openVehicleIssues || 0} open maintenance issues and ${data?.unclosedAccidents || 0} unclosed accident claims requiring administrative closure.`
                  : `توجد ${data?.openVehicleIssues || 0} أعطال مفتوحة و ${data?.unclosedAccidents || 0} حوادث قيد المتابعة تتطلب الإجراءات التأمينية والإصلاح.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportMetricCard
          title={isEn ? "Total Registered Vehicles" : "إجمالي المركبات المسجلة"}
          value={formatCount(totalVehicles, locale)}
          subtitle={isEn ? "All company and leased vehicles" : "كافة مركبات الشركة والكفلاء"}
          icon={Car}
          tone="brand"
          href="/admin/fleet/vehicles"
        />
        <ReportMetricCard
          title={isEn ? "Available Vehicles" : "مركبات متاحة للتعيين"}
          value={formatCount(availableVehicles, locale)}
          subtitle={`${formatPercentage(availableRate)} ${isEn ? "ready for handover" : "جاهزة للتسليم"}`}
          icon={CheckCircle2}
          tone="brand"
          href="/admin/fleet/vehicles"
        />
        <ReportMetricCard
          title={isEn ? "Assigned Vehicles" : "مركبات معينة لمناديب"}
          value={formatCount(assignedVehicles, locale)}
          subtitle={`${formatPercentage(utilizationRate)} ${isEn ? "fleet utilization" : "نسبة تشغيل الأسطول"}`}
          icon={Key}
          href="/admin/fleet/assignments"
        />
        <ReportMetricCard
          title={isEn ? "Held / Out of Service" : "مركبات محجوزة/معطلة"}
          value={formatCount(heldVehicles, locale)}
          subtitle={isEn ? "Problem, accident, stolen, out of service" : "حجز عطل، حادث، مسروقة، صيانة"}
          icon={AlertTriangle}
          alert={heldVehicles > 0}
          alertBadgeText={isEn ? "Held" : "محجوزة"}
          helpText={isEn ? "Excludes decommissioned" : "لا يشمل المشطوبة"}
          href="/admin/fleet/vehicles"
        />
      </div>

      {/* Fleet Composition & Status Distribution Bar with Geometric Shapes */}
      <Card className="relative overflow-hidden p-6 space-y-4 border-slate-200 dark:border-slate-800 bg-[var(--surface)] shadow-xs">
        {/* Decorative Geometric Rings */}
        <div className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full border border-slate-900/[0.04] dark:border-white/[0.04] animate-float-slow" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEn ? "Fleet Status Breakdown & Allocation" : "توزيع وتصنيف حالات الأسطول"}
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {isEn
                ? "Operational status breakdown across active, held, and decommissioned assets"
                : "توزيع المركبات بين الجاهزة، المسندة، المحجوزة، والمشطوبة"}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 border border-[var(--border)]">
            {totalVehicles} {isEn ? "Total Units" : "مركبة"}
          </span>
        </div>

        {/* Visual Progress Bar with Subtle Motion Transition */}
        <div className="relative z-10 h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 flex shadow-inner">
          <div
            style={{ width: `${utilizationRate}%` }}
            className="bg-slate-800 dark:bg-slate-200 transition-all duration-700 ease-out"
            title={`${isEn ? "Assigned" : "معينة"}: ${assignedVehicles}`}
          />
          <div
            style={{ width: `${availableRate}%` }}
            className="bg-[#1167c9] dark:bg-blue-500 transition-all duration-700 ease-out"
            title={`${isEn ? "Available" : "متاحة"}: ${availableVehicles}`}
          />
          <div
            style={{ width: `${heldRate}%` }}
            className="bg-amber-500 transition-all duration-700 ease-out"
            title={`${isEn ? "Held / Out of Service" : "محجوزة"}: ${heldVehicles}`}
          />
          <div
            style={{ width: `${totalVehicles > 0 ? (decommissionedVehicles / totalVehicles) * 100 : 0}%` }}
            className="bg-slate-400 dark:bg-slate-600 transition-all duration-700 ease-out"
            title={`${isEn ? "Decommissioned" : "مشطوبة"}: ${decommissionedVehicles}`}
          />
        </div>

        {/* Legend */}
        <div className="relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-slate-800 dark:bg-slate-200" />
            <span className="text-[var(--muted)]">{isEn ? "Assigned:" : "معينة:"}</span>
            <strong className="font-bold text-slate-900 dark:text-white font-mono">{assignedVehicles}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#1167c9] dark:bg-blue-500" />
            <span className="text-[var(--muted)]">{isEn ? "Available:" : "متاحة:"}</span>
            <strong className="font-bold text-slate-900 dark:text-white font-mono">{availableVehicles}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <span className="text-[var(--muted)]">{isEn ? "Held / Attention:" : "محجوزة / معطلة:"}</span>
            <strong className="font-bold text-slate-900 dark:text-white font-mono">{heldVehicles}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
            <span className="text-[var(--muted)]">{isEn ? "Decommissioned:" : "مشطوبة:"}</span>
            <strong className="font-bold text-slate-900 dark:text-white font-mono">{decommissionedVehicles}</strong>
          </div>
        </div>
      </Card>

      {/* Operational Issues & Assignments Secondary Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReportMetricCard
          title={isEn ? "Active Rider-Vehicle Assignments" : "التعيينات النشطة للمناديب"}
          value={formatCount(data?.activeRiderVehicleAssignments, locale)}
          subtitle={isEn ? "Active physical vehicle handovers" : "تسليمات المركبات الجارية حالياً للمناديب"}
          icon={Users}
          tone="brand"
          href="/admin/fleet/assignments"
        />
        <ReportMetricCard
          title={isEn ? "Open Vehicle Issues" : "أعطال ومشاكل المركبات المفتوحة"}
          value={formatCount(data?.openVehicleIssues, locale)}
          subtitle={isEn ? "Reported issues awaiting workshop action" : "أعطال مسجلة تتطلب صيانة فورية"}
          icon={Wrench}
          alert={hasIssues}
          alertBadgeText={isEn ? "Requires Action" : "عطل مفتوح"}
          href="/admin/fleet/issues"
        />
        <ReportMetricCard
          title={isEn ? "Unclosed Accident Reports" : "حوادث قيد المتابعة والتأمين"}
          value={formatCount(data?.unclosedAccidents, locale)}
          subtitle={isEn ? "Accident records under insurance/repair process" : "معاملات حوادث لم يتم إقفالها نهائياً"}
          icon={AlertTriangle}
          alert={hasAccidents}
          alertBadgeText={isEn ? "Unclosed" : "حادث مفتوح"}
          href="/admin/fleet/accidents"
        />
      </div>
    </div>
  );
}
