"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  Car,
  Building2,
  CalendarCheck,
  AlertTriangle,
  ClipboardList,
  ArrowUpLeft,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getPeopleComplianceDashboardReport } from "@/lib/reports/api";
import type { PeopleComplianceDashboardReport } from "@/lib/reports/types";
import { formatCount } from "@/lib/reports/utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";

export default function PeopleComplianceDashboardPage() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  const [data, setData] = useState<PeopleComplianceDashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message?: string } | null>(null);

  const fetchReport = useCallback(async () => {
    if (!can("reports.read")) {
      setError({
        status: 403,
        message: isEn
          ? "You do not hold the required 'reports.read' permission to view the compliance dashboard."
          : "عفواً، يتطلب عرض لوحة مؤشرات الالتزام توفر صلاحية (reports.read).",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getPeopleComplianceDashboardReport();
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch People & Compliance dashboard report:", err);
      setError({
        status: err?.status,
        message: err?.message || (isEn ? "Failed to load compliance dashboard" : "تعذر تحميل لوحة الالتزام والامتثال"),
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

  const hasExpiredDocs = Boolean(data?.expiredEmployeeDocuments && data.expiredEmployeeDocuments > 0);
  const hasExpiredLicenses = Boolean(data?.expiredDriverLicenses && data.expiredDriverLicenses > 0);
  const hasPendingLeaves = Boolean(data?.pendingLeaveRequests && data.pendingLeaveRequests > 0);
  const hasOpenAbsenceCases = Boolean(data?.openAbsenceComplianceCases && data.openAbsenceComplianceCases > 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <ReportHeader
        title={isEn ? "People & Compliance Dashboard" : "لوحة مؤشرات الالتزام ومسارات العمل"}
        subtitle={
          isEn
            ? "Monitor employee document validities, driver licenses, social insurance enrollments, leaves, and absence compliance cases."
            : "متابعة سريان وثائق الموظفين، رخص القيادة، تسجيلات التأمينات، طلبات الإجازات وحالات الغياب التشغيلية."
        }
        icon={ShieldCheck}
        badgeText={isEn ? "Compliance" : "الالتزام"}
        generatedAtUtc={data?.generatedAtUtc}
        loading={loading}
        onRefresh={fetchReport}
      />

      {/* Critical Warnings Banner if any non-zero items */}
      {(hasExpiredDocs || hasExpiredLicenses || hasPendingLeaves || hasOpenAbsenceCases) && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-300/80 bg-rose-50/30 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                {isEn ? "Action Required: Attention Needed" : "تنبيه تشغيلي: بنود تستوجب المتابعة العاجلة"}
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1 leading-relaxed">
                {isEn
                  ? "There are expired documents or licenses, pending leave requests, or open absence cases requiring administrative resolution."
                  : "توجد وثائق أو رخص قيادة منتهية الصلاحية، أو طلبات إجازة معلقة، أو حالات غياب مفتوحة تستوجب اتخاذ الإجراءات الإدارية."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Documents & Licenses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Documents & Driving Licenses" : "وثائق الموظفين ورخص القيادة"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn ? "Expiries and active verification records" : "متابعة التراخيص والسريان النظامي"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/hr/compliance-expiries"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "Expiries Center" : "مركز تنبيهات الوثائق"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReportMetricCard
            title={isEn ? "Active Employee Documents" : "وثائق الموظفين السارية"}
            value={formatCount(data?.activeEmployeeDocuments, locale)}
            subtitle={isEn ? "Valid IDs, passports, & contracts" : "هويات وإقامات وعقود سارية"}
            icon={FileText}
            tone="brand"
            href="/admin/hr/documents"
          />
          <ReportMetricCard
            title={isEn ? "Expired Employee Documents" : "وثائق موظفين منتهية"}
            value={formatCount(data?.expiredEmployeeDocuments, locale)}
            subtitle={isEn ? "Expired identity / passport documents" : "وثائق منتهية تستلزم التجديد"}
            icon={FileText}
            alert={hasExpiredDocs}
            alertBadgeText={isEn ? "Action Required" : "منتهية"}
            href="/admin/hr/compliance-expiries"
          />
          <ReportMetricCard
            title={isEn ? "Active Driver Licenses" : "رخص القيادة السارية"}
            value={formatCount(data?.activeDriverLicenses, locale)}
            subtitle={isEn ? "Qualified active driver licenses" : "رخص قيادة نظامية سارية"}
            icon={Car}
            href="/admin/hr/catalogs"
          />
          <ReportMetricCard
            title={isEn ? "Expired Driver Licenses" : "رخص قيادة منتهية"}
            value={formatCount(data?.expiredDriverLicenses, locale)}
            subtitle={isEn ? "Driver licenses requiring renewal" : "رخص قيادة منتهية الصلاحية"}
            icon={Car}
            alert={hasExpiredLicenses}
            alertBadgeText={isEn ? "Action Required" : "منتهية"}
            href="/admin/hr/compliance-expiries"
          />
        </div>
      </section>

      {/* SECTION 2: Insurance & Payroll Enrollments */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Insurance & Payroll Compliance" : "التأمين الطبي والتأمينات الاجتماعية"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn ? "Policy coverage and GOSI/payroll registers" : "التغطيات التأمينية ومسيرات الرواتب"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReportMetricCard
            title={isEn ? "Payroll & GOSI Enrolled Employees" : "الموظفون المسجلون في التأمينات والرواتب"}
            value={formatCount(data?.payrollEmployees, locale)}
            subtitle={isEn ? "Staff and delegates with registered social insurance" : "إجمالي المسجلين في التأمينات ومسيرات الرواتب"}
            icon={Building2}
            tone="brand"
            href="/admin/hr/payroll-employees"
          />
          <ReportMetricCard
            title={isEn ? "Active Medical Insurance Policies" : "وثائق التأمين الطبي السارية"}
            value={formatCount(data?.activeMedicalInsurancePolicies, locale)}
            subtitle={isEn ? "Active health insurance coverage policies" : "بوالص التأمين الصحي السارية المفعول"}
            icon={ShieldCheck}
            href="/admin/hr/insurance"
          />
        </div>
      </section>

      {/* SECTION 3: Leaves & Absence Workflows */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <CalendarCheck size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Leaves & Absence Workflows" : "مسارات العمل والإجازات وحالات الغياب"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isEn ? "Requests awaiting approval and operational absence cases" : "الطلبات المعلقة والإجازات الميدانية الجارية"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReportMetricCard
            title={isEn ? "Pending Leave Requests" : "طلبات إجازة معلقة"}
            value={formatCount(data?.pendingLeaveRequests, locale)}
            subtitle={isEn ? "Awaiting administrative review & approval" : "بانتظار المراجعة والاعتماد الإداري"}
            icon={CalendarCheck}
            alert={hasPendingLeaves}
            alertBadgeText={isEn ? "Pending" : "معلق"}
            href="/admin/hr/leave-requests"
          />
          <ReportMetricCard
            title={isEn ? "Active Leaves" : "إجازات نشطة حالياً"}
            value={formatCount(data?.activeLeaveRequests, locale)}
            subtitle={isEn ? "Staff and riders currently on approved leave" : "مناديب وإداريون في إجازة معتمدة حالياً"}
            icon={CalendarCheck}
            href="/admin/hr/leave-requests"
          />
          <ReportMetricCard
            title={isEn ? "Open Absence Cases" : "حالات غياب مفتوحة"}
            value={formatCount(data?.openAbsenceComplianceCases, locale)}
            subtitle={isEn ? "Unresolved absence compliance investigations" : "حالات غياب قيد التحقيق والمتابعة"}
            icon={ClipboardList}
            alert={hasOpenAbsenceCases}
            alertBadgeText={isEn ? "Open Cases" : "قيد المتابعة"}
            href="/admin/hr/absence-cases"
          />
        </div>
      </section>
    </div>
  );
}
