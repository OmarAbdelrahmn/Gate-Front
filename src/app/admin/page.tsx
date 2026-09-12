"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  ShieldCheck,
  Car,
  Layers,
  Wrench,
  Users,
  Building2,
  FileText,
  CalendarCheck,
  ArrowUpLeft,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getSystemDashboardReport } from "@/lib/reports/api";
import type { SystemDashboardReport } from "@/lib/reports/types";
import { formatCount, formatInventoryValue } from "@/lib/reports/utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";
import { Card } from "@/components/ui/Card";

export default function AdminLandingDashboardPage() {
  const { user, can, locale } = useAuth();
  const isEn = locale === "en";

  const [data, setData] = useState<SystemDashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message?: string } | null>(null);

  const fetchReport = useCallback(async () => {
    if (!can("reports.read")) {
      setError({
        status: 403,
        message: isEn
          ? "You do not have the 'reports.read' permission required to view this dashboard."
          : "عفواً، يتطلب عرض لوحة المؤشرات توفر صلاحية (reports.read).",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getSystemDashboardReport();
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch system dashboard report:", err);
      setError({
        status: err?.status,
        message: err?.message || (isEn ? "Failed to load dashboard data" : "تعذر تحميل بيانات اللوحة"),
      });
    } finally {
      setLoading(false);
    }
  }, [can, isEn]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const userName = isEn ? (user?.displayNameEn ?? "Manager") : (user?.displayNameAr ?? "المسؤول");

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

  const hr = data?.hr;
  const pc = data?.peopleCompliance;
  const fleet = data?.fleet;
  const ops = data?.operations;
  const mi = data?.maintenanceInventory;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <ReportHeader
        title={isEn ? "System Overview Dashboard" : "لوحة المؤشرات التشغيلية للنظام"}
        subtitle={
          isEn
            ? `Welcome back, ${userName}. Real-time aggregate operational performance across all modules.`
            : `مرحباً بك ${userName}، مؤشرات الأداء والعمليات الموحدة في الوقت الفعلي من واقع قاعدة البيانات.`
        }
        icon={LayoutDashboard}
        badgeText={isEn ? "Live Overview" : "نظرة عامة مباشرة"}
        generatedAtUtc={data?.generatedAtUtc}
        loading={loading}
        onRefresh={fetchReport}
      />

      {/* Module Navigation Cards - Clean, Restrained Palette with Shapes & Hover Elevation */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            title: isEn ? "Human Resources" : "الموارد البشرية",
            href: "/admin/hr/dashboard",
            icon: BriefcaseBusiness,
            badge: `${formatCount(hr?.activePeople, locale)} ${isEn ? "Active" : "نشط"}`,
          },
          {
            title: isEn ? "Compliance" : "الالتزام والامتثال",
            href: "/admin/people-compliance",
            icon: ShieldCheck,
            badge: `${formatCount((pc?.expiredEmployeeDocuments ?? 0) + (pc?.expiredDriverLicenses ?? 0), locale)} ${isEn ? "Expiries" : "منتهية"}`,
          },
          {
            title: isEn ? "Fleet Operations" : "إدارة الأسطول",
            href: "/admin/fleet/dashboard",
            icon: Car,
            badge: `${formatCount(fleet?.totalVehicles, locale)} ${isEn ? "Vehicles" : "مركبة"}`,
          },
          {
            title: isEn ? "Operations" : "العمليات التشغيلية",
            href: "/admin/operations/dashboard",
            icon: Layers,
            badge: `${formatCount(ops?.activePlatforms, locale)} ${isEn ? "Platforms" : "منصات"}`,
          },
          {
            title: isEn ? "Maintenance" : "الصيانة والمخزون",
            href: "/admin/maintenance/dashboard",
            icon: Wrench,
            badge: `${formatCount(mi?.openWorkOrders, locale)} ${isEn ? "Orders" : "أمر عمل"}`,
          },
        ].map((mod) => {
          const ModIcon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="group relative overflow-hidden flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md"
            >
              {/* Subtle Corner Shape Watermark */}
              <div className="pointer-events-none absolute -bottom-6 -right-6 size-20 rounded-full border border-slate-900/[0.03] dark:border-white/[0.03] transition-transform duration-500 group-hover:scale-150" />

              <div className="flex items-center justify-between">
                <div className="grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-300 group-hover:scale-110 group-hover:border-slate-400">
                  <ModIcon size={18} />
                </div>
                <span className="grid size-7 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 transition-all duration-300 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-200 dark:group-hover:bg-slate-700">
                  {isEn ? (
                    <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  ) : (
                    <ArrowUpLeft size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                  )}
                </span>
              </div>
              <div className="mt-4">
                <h2 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-[#1167c9] dark:group-hover:text-blue-400 transition-colors">
                  {mod.title}
                </h2>
                <p className="text-[11px] font-semibold text-[var(--muted)] mt-0.5">
                  {mod.badge}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* SECTION 1: Human Resources Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <BriefcaseBusiness size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Human Resources & Headcount" : "الموارد البشرية والقوى العاملة"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn
                  ? "Overall staff and riders distribution"
                  : "إجمالي أعداد الإداريين والمناديب والتوزيع التشغيلي"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/hr/dashboard"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "HR Dashboard" : "لوحة الموارد البشرية"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <ReportMetricCard
            title={isEn ? "Total People" : "إجمالي الأفراد"}
            value={formatCount(hr?.totalPeople, locale)}
            subtitle={isEn ? "Employees & Riders" : "إداريين ومناديب"}
            icon={Users}
            tone="brand"
            href="/admin/hr/dashboard"
          />
          <ReportMetricCard
            title={isEn ? "Active Employees" : "الإداريون النشطون"}
            value={formatCount(hr?.activeEmployees, locale)}
            subtitle={`${formatCount(hr?.totalEmployees, locale)} ${isEn ? "total" : "إجمالي"}`}
            icon={BriefcaseBusiness}
            href="/admin/employees"
          />
          <ReportMetricCard
            title={isEn ? "Active Riders" : "المناديب النشطون"}
            value={formatCount(hr?.activeRiders, locale)}
            subtitle={`${formatCount(hr?.totalRiders, locale)} ${isEn ? "total" : "إجمالي"}`}
            icon={Users}
            href="/admin/employees"
          />
          <ReportMetricCard
            title={isEn ? "Without Sponsor" : "أفراد بلا كفيل"}
            value={formatCount(hr?.peopleWithoutSponsor, locale)}
            subtitle={isEn ? "Unassigned sponsor" : "غير مربوطين بكفيل"}
            icon={Building2}
            alert={Boolean(hr?.peopleWithoutSponsor && hr.peopleWithoutSponsor > 0)}
            alertBadgeText={isEn ? "Action" : "يلزم ربط"}
            href="/admin/hr/dashboard"
          />
          <ReportMetricCard
            title={isEn ? "No Platform Account" : "مناديب بلا حساب منصة"}
            value={formatCount(hr?.activeRidersWithoutAnyPlatformAccount, locale)}
            subtitle={isEn ? "Active riders missing account" : "مناديب نشطون بلا حساب"}
            icon={Layers}
            alert={Boolean(
              hr?.activeRidersWithoutAnyPlatformAccount &&
                hr.activeRidersWithoutAnyPlatformAccount > 0
            )}
            alertBadgeText={isEn ? "Unassigned" : "غير مسند"}
            href="/admin/platforms/accounts"
          />
          <ReportMetricCard
            title={isEn ? "Coverage Gaps" : "فجوات التغطية"}
            value={formatCount(hr?.activeRiderPlatformCoverageGaps, locale)}
            subtitle={isEn ? "Missing rider-platform pairs" : "أزواج التغطية المفقودة"}
            icon={Layers}
            href="/admin/hr/dashboard"
          />
        </div>
      </section>

      {/* SECTION 2: People & Compliance Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "People & Compliance" : "الالتزام والامتثال ومسارات العمل"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn
                  ? "Expiries, licenses, insurance policies, and leaves"
                  : "متابعة صلاحيات الوثائق والرخص والتأمين والإجازات"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/people-compliance"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "Compliance Dashboard" : "لوحة الالتزام"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <ReportMetricCard
            title={isEn ? "Payroll Employees" : "المسجلون في التأمينات"}
            value={formatCount(pc?.payrollEmployees, locale)}
            subtitle={isEn ? "Active payroll profiles" : "سجلات الرواتب والتأمينات"}
            icon={Building2}
            href="/admin/hr/payroll-employees"
          />
          <ReportMetricCard
            title={isEn ? "Expired Documents" : "وثائق موظفين منتهية"}
            value={formatCount(pc?.expiredEmployeeDocuments, locale)}
            subtitle={`${formatCount(pc?.activeEmployeeDocuments, locale)} ${isEn ? "active" : "سارية"}`}
            icon={FileText}
            alert={Boolean(pc?.expiredEmployeeDocuments && pc.expiredEmployeeDocuments > 0)}
            alertBadgeText={isEn ? "Expired" : "منتهية"}
            href="/admin/hr/compliance-expiries"
          />
          <ReportMetricCard
            title={isEn ? "Expired Licenses" : "رخص قيادة منتهية"}
            value={formatCount(pc?.expiredDriverLicenses, locale)}
            subtitle={`${formatCount(pc?.activeDriverLicenses, locale)} ${isEn ? "active" : "سارية"}`}
            icon={Car}
            alert={Boolean(pc?.expiredDriverLicenses && pc.expiredDriverLicenses > 0)}
            alertBadgeText={isEn ? "Expired" : "منتهية"}
            href="/admin/hr/compliance-expiries"
          />
          <ReportMetricCard
            title={isEn ? "Pending Leave Requests" : "طلبات إجازة معلقة"}
            value={formatCount(pc?.pendingLeaveRequests, locale)}
            subtitle={`${formatCount(pc?.activeLeaveRequests, locale)} ${isEn ? "on leave" : "في إجازة"}`}
            icon={CalendarCheck}
            alert={Boolean(pc?.pendingLeaveRequests && pc.pendingLeaveRequests > 0)}
            alertBadgeText={isEn ? "Pending" : "معلق"}
            href="/admin/hr/leave-requests"
          />
          <ReportMetricCard
            title={isEn ? "Open Absence Cases" : "حالات غياب مفتوحة"}
            value={formatCount(pc?.openAbsenceComplianceCases, locale)}
            subtitle={isEn ? "Cases under review" : "حالات قيد المعالجة"}
            icon={ShieldCheck}
            alert={Boolean(pc?.openAbsenceComplianceCases && pc.openAbsenceComplianceCases > 0)}
            alertBadgeText={isEn ? "Open" : "مفتوح"}
            href="/admin/hr/absence-cases"
          />
        </div>
      </section>

      {/* SECTION 3: Fleet Operations Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Car size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Fleet Operations" : "عمليات الأسطول والمركبات"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn
                  ? "Vehicles availability, assignments, issues, and accidents"
                  : "جاهزية المركبات، التعيينات النشطة، والأعطال والحوادث"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/fleet/dashboard"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "Fleet Dashboard" : "لوحة الأسطول"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <ReportMetricCard
            title={isEn ? "Total Vehicles" : "إجمالي المركبات"}
            value={formatCount(fleet?.totalVehicles, locale)}
            subtitle={isEn ? "Registered fleet" : "الأسطول المسجل"}
            icon={Car}
            tone="brand"
            href="/admin/fleet/vehicles"
          />
          <ReportMetricCard
            title={isEn ? "Available Vehicles" : "مركبات متاحة"}
            value={formatCount(fleet?.availableVehicles, locale)}
            subtitle={isEn ? "Ready for assignment" : "جاهزة للتسليم"}
            icon={Car}
            href="/admin/fleet/vehicles"
          />
          <ReportMetricCard
            title={isEn ? "Assigned to Riders" : "مركبات معينة لمناديب"}
            value={formatCount(fleet?.assignedVehicles, locale)}
            subtitle={`${formatCount(fleet?.activeRiderVehicleAssignments, locale)} ${isEn ? "assignments" : "تعيين نشط"}`}
            icon={Users}
            href="/admin/fleet/assignments"
          />
          <ReportMetricCard
            title={isEn ? "Held / Out of Service" : "مركبات محجوزة/معطلة"}
            value={formatCount(fleet?.heldVehicles, locale)}
            subtitle={isEn ? "Problem, accident, stolen" : "حجز عطل، حادث، صيانة"}
            icon={Car}
            helpText={isEn ? "Excludes decommissioned" : "لا يشمل المشطوبة"}
            href="/admin/fleet/dashboard"
          />
          <ReportMetricCard
            title={isEn ? "Open Vehicle Issues" : "أعطال مفتوحة"}
            value={formatCount(fleet?.openVehicleIssues, locale)}
            subtitle={isEn ? "Awaiting maintenance" : "بانتظار الصيانة"}
            icon={Wrench}
            alert={Boolean(fleet?.openVehicleIssues && fleet.openVehicleIssues > 0)}
            alertBadgeText={isEn ? "Open" : "مفتوح"}
            href="/admin/fleet/issues"
          />
          <ReportMetricCard
            title={isEn ? "Unclosed Accidents" : "حوادث قيد المتابعة"}
            value={formatCount(fleet?.unclosedAccidents, locale)}
            subtitle={isEn ? "Active claims" : "مطالبات قيد الإجراء"}
            icon={Car}
            alert={Boolean(fleet?.unclosedAccidents && fleet.unclosedAccidents > 0)}
            alertBadgeText={isEn ? "Unclosed" : "غير مقفل"}
            href="/admin/fleet/accidents"
          />
        </div>
      </section>

      {/* SECTION 4: Operations & Maintenance Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Operations Overview Card */}
        <Card className="relative overflow-hidden p-6 space-y-5">
          {/* Subtle Geometric Background Watermark */}
          <div className="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full border border-slate-900/[0.04] dark:border-white/[0.04]" />

          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Layers size={16} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {isEn ? "Operations (Platforms, Housing, SIMs, Fuel)" : "العمليات (المنصات، السكن، الشرائح، الوقود)"}
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {isEn ? "Field logistics operational resources" : "الموارد التشغيلية الميدانية"}
                </p>
              </div>
            </div>
            <Link
              href="/admin/operations/dashboard"
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>{isEn ? "Details" : "التفاصيل"}</span>
              {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <span className="text-xs text-[var(--muted)] block">
                {isEn ? "Active Platforms" : "المنصات النشطة"}
              </span>
              <span className="mt-1 text-xl font-black text-slate-900 dark:text-white block font-mono">
                {formatCount(ops?.activePlatforms, locale)}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-1">
                {formatCount(ops?.assignedPlatformAccounts, locale)} / {formatCount(ops?.operationalPlatformAccounts, locale)} {isEn ? "accounts" : "حساب"}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <span className="text-xs text-[var(--muted)] block">
                {isEn ? "Housing Occupancy" : "سكن المناديب"}
              </span>
              <span className="mt-1 text-xl font-black text-slate-900 dark:text-white block font-mono">
                {formatCount(ops?.currentHousingResidents, locale)}
              </span>
              <span className="text-[11px] text-[var(--muted)] block mt-1">
                {isEn ? "of" : "من أصل"} {formatCount(ops?.totalActiveHousingCapacity, locale)} {isEn ? "beds" : "سرير"}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <span className="text-xs text-[var(--muted)] block">
                {isEn ? "Phone SIMs" : "شرائح الاتصال"}
              </span>
              <span className="mt-1 text-xl font-black text-slate-900 dark:text-white block font-mono">
                {formatCount(ops?.assignedPhoneSims, locale)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {formatCount(ops?.availablePhoneSims, locale)} {isEn ? "avail" : "متاحة"} ·{" "}
                <span className={ops?.phoneSimsNeedingAttention ? "text-rose-600 font-bold" : ""}>
                  {formatCount(ops?.phoneSimsNeedingAttention, locale)} {isEn ? "alert" : "تنبيه"}
                </span>
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <span className="text-xs text-[var(--muted)] block">
                {isEn ? "Fuel Cards" : "بطاقات الوقود"}
              </span>
              <span className="mt-1 text-xl font-black text-slate-900 dark:text-white block font-mono">
                {formatCount(ops?.assignedFuelCards, locale)}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-1">
                {isEn ? "of" : "من إجمالي"} {formatCount(ops?.totalFuelCards, locale)} {isEn ? "cards" : "بطاقة"}
              </span>
            </div>
          </div>
        </Card>

        {/* Maintenance & Inventory Overview Card */}
        <Card className="relative overflow-hidden p-6 space-y-5">
          {/* Subtle Geometric Background Watermark */}
          <div className="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full border border-slate-900/[0.04] dark:border-white/[0.04]" />

          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Wrench size={16} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {isEn ? "Maintenance & Warehouse Inventory" : "الصيانة ومخزون المستودعات"}
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {isEn ? "Valuation, work orders, and stock levels" : "تقييم المخزون، أوامر العمل، والطلبات"}
                </p>
              </div>
            </div>
            <Link
              href="/admin/maintenance/dashboard"
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
            >
              <span>{isEn ? "Details" : "التفاصيل"}</span>
              {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <span className="text-xs text-[var(--muted)] block">
                {isEn ? "Inventory Valuation" : "تقييم المخزون"}
              </span>
              <span className="mt-1 text-base sm:text-lg font-black text-slate-900 dark:text-white block font-mono">
                {formatInventoryValue(mi?.inventoryValue, locale)}
              </span>
              <span className="text-[11px] text-[var(--muted)] block mt-1">
                {formatCount(mi?.stockBalanceRecords, locale)} {isEn ? "records" : "سجل رصيد"}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <span className="text-xs text-[var(--muted)] block">
                {isEn ? "Work Orders" : "أوامر العمل"}
              </span>
              <span className="mt-1 text-xl font-black text-slate-900 dark:text-white block font-mono">
                {formatCount((mi?.openWorkOrders ?? 0) + (mi?.inProgressWorkOrders ?? 0), locale)}
              </span>
              <span className="text-[11px] text-[var(--muted)] block mt-1">
                {formatCount(mi?.openWorkOrders, locale)} {isEn ? "open" : "مفتوح"} · {formatCount(mi?.inProgressWorkOrders, locale)} {isEn ? "in progress" : "قيد التنفيذ"}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <span className="text-xs text-[var(--muted)] block">
                {isEn ? "Low Stock Items" : "أصناف منخفضة"}
              </span>
              <span
                className={`mt-1 text-xl font-black block font-mono ${
                  mi?.lowStockItems ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                }`}
              >
                {formatCount(mi?.lowStockItems, locale)}
              </span>
              <span className="text-[11px] text-[var(--muted)] block mt-1">
                {isEn ? "out of" : "من أصل"} {formatCount(mi?.activeInventoryItems, locale)} {isEn ? "items" : "صنف"}
              </span>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <span className="text-xs text-[var(--muted)] block">
                {isEn ? "Supply Requests" : "طلبات الصرف"}
              </span>
              <span
                className={`mt-1 text-xl font-black block font-mono ${
                  mi?.pendingSupplyRequests ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
                }`}
              >
                {formatCount(mi?.pendingSupplyRequests, locale)}
              </span>
              <span className="text-[11px] text-[var(--muted)] block mt-1">
                {mi?.pendingSupplyRequests
                  ? isEn ? "pending" : "معلقة للصرف"
                  : isEn ? "completed" : "مصروفة"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
