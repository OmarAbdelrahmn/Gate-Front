"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Wrench,
  Package,
  Building2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpLeft,
  ArrowUpRight,
  PackageCheck,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getMaintenanceInventoryDashboardReport } from "@/lib/reports/api";
import type { MaintenanceInventoryDashboardReport } from "@/lib/reports/types";
import { formatCount, formatInventoryValue } from "@/lib/reports/utils";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportMetricCard } from "@/components/reports/ReportMetricCard";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ReportErrorState } from "@/components/reports/ReportErrorState";

export default function MaintenanceInventoryDashboardPage() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  const [data, setData] = useState<MaintenanceInventoryDashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message?: string } | null>(null);

  const fetchReport = useCallback(async () => {
    if (!can("reports.read")) {
      setError({
        status: 403,
        message: isEn
          ? "You do not hold the required 'reports.read' permission to view the maintenance and inventory dashboard."
          : "عفواً، يتطلب عرض لوحة مؤشرات الصيانة والمخزون توفر صلاحية (reports.read).",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getMaintenanceInventoryDashboardReport();
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch maintenance inventory dashboard report:", err);
      setError({
        status: err?.status,
        message: err?.message || (isEn ? "Failed to load maintenance dashboard" : "تعذر تحميل لوحة الصيانة والمخزون"),
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

  const hasLowStock = Boolean(data?.lowStockItems && data.lowStockItems > 0);
  const hasPendingSupplies = Boolean(data?.pendingSupplyRequests && data.pendingSupplyRequests > 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <ReportHeader
        title={isEn ? "Maintenance & Inventory Dashboard" : "لوحة مؤشرات الصيانة والمخزون والورش"}
        subtitle={
          isEn
            ? "Real-time parts inventory valuation, stock records, workshop orders progress, and warehouse supply fulfillment."
            : "تقييم مخزون قطع الغيار والمواد، أوامر العمل في الورش، وطلبات الصرف من المستودعات في الوقت الفعلي."
        }
        icon={Wrench}
        badgeText={isEn ? "Maintenance & Inventory" : "الصيانة والمخزون"}
        generatedAtUtc={data?.generatedAtUtc}
        loading={loading}
        onRefresh={fetchReport}
      >
        <Link href="/admin/maintenance/work-orders/orders">
          <Button variant="primary" className="text-xs h-9 gap-1.5 active:scale-95 transition-all">
            <PlusCircle size={15} />
            <span>{isEn ? "New Work Order" : "أمر صيانة جديد"}</span>
          </Button>
        </Link>
      </ReportHeader>

      {/* Hero Financial Valuation Card - Sleek Slate/Dark Neutral with Geometric Shapes & Float Movement */}
      <Card className="relative overflow-hidden p-6 sm:p-8 border-slate-200 dark:border-slate-800 bg-[var(--surface)] shadow-xs">
        {/* Subtle Ambient Shapes */}
        <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full border border-slate-900/[0.04] dark:border-white/[0.04] animate-float-slow" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 size-36 rounded-full border border-slate-900/[0.03] dark:border-white/[0.03]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200">
              <TrendingUp size={13} className="text-[#1167c9]" />
              <span>{isEn ? "Assets Valuation" : "تقييم الأصول المخزنية"}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isEn ? "Total Spare Parts & Materials Inventory Value" : "إجمالي القيمة التقديرية لمخزون المستودعات والورش"}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              {isEn
                ? "Calculated from current stock balance (quantityOnHand × reportingAverageUnitCost) in Saudi Riyals."
                : "تم احتساب القيمة بناءً على (الكمية المتوفرة × متوسط سعر التكلفة المعتمد) بالريال السعودي."}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end justify-center rounded-2xl border border-[var(--border)] bg-[var(--subtle-bg)] p-5 shadow-xs transition-transform duration-300 hover:scale-[1.02]">
            <span className="text-xs font-bold text-[var(--muted)] mb-1">
              {isEn ? "Valuation in SAR" : "القيمة التقديرية (ر.س)"}
            </span>
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {formatInventoryValue(data?.inventoryValue, locale)}
            </span>
            <span className="text-[11px] font-semibold text-[var(--muted)] mt-1">
              {formatCount(data?.stockBalanceRecords, locale)} {isEn ? "stock balance records" : "سجل رصيد في المستودعات"}
            </span>
          </div>
        </div>
      </Card>

      {/* Warning banner if low stock or pending requests */}
      {(hasLowStock || hasPendingSupplies) && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-amber-50/30 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {isEn ? "Inventory & Workshop Alerts" : "تنبيهات إدارة المخزون والصيانة"}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {isEn
                  ? `There are ${data?.lowStockItems || 0} items at or below reorder threshold and ${data?.pendingSupplyRequests || 0} supply requests awaiting warehouse issue.`
                  : `يوجد ${data?.lowStockItems || 0} صنف عند حد إعادة الطلب أو أقل، و ${data?.pendingSupplyRequests || 0} طلب صرف معلق بالمستودع.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Work Orders Operations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Wrench size={16} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Workshop Operations & Work Orders" : "عمليات الورش وأوامر الصيانة"}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {isEn ? "Open, scheduled, and active orders" : "أوامر العمل المفتوحة والجارية"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/maintenance/work-orders/orders"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "All Work Orders" : "جميع أوامر العمل"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReportMetricCard
            title={isEn ? "Open Work Orders" : "أوامر صيانة مفتوحة"}
            value={formatCount(data?.openWorkOrders, locale)}
            subtitle={isEn ? "Awaiting workshop intake / diagnostic" : "بانتظار الفحص وبدء العمل"}
            icon={Wrench}
            tone="brand"
            href="/admin/maintenance/work-orders/orders"
          />
          <ReportMetricCard
            title={isEn ? "In-Progress Work Orders" : "أوامر صيانة قيد التنفيذ"}
            value={formatCount(data?.inProgressWorkOrders, locale)}
            subtitle={isEn ? "Currently being serviced" : "العمل جارٍ عليها في الورشة حالياً"}
            icon={Wrench}
            href="/admin/maintenance/work-orders/orders"
          />
          <ReportMetricCard
            title={isEn ? "Active Maintenance Locations" : "مواقع وورش الصيانة النشطة"}
            value={formatCount(data?.activeMaintenanceLocations, locale)}
            subtitle={isEn ? "Workshops & main warehouses" : "ورش ومستودعات صيانة معتمدة"}
            icon={Building2}
            href="/admin/maintenance/setup/locations"
          />
        </div>
      </section>

      {/* SECTION 2: Parts Inventory & Supply Requests */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? "Warehouse Inventory & Supply Requests" : "مخزون المستودعات وطلبات الصرف"}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {isEn ? "Item catalog, stock balances, and supply issuances" : "كتالوج الأصناف، الأرصدة المتوفرة، وطلبات التزويد"}
              </p>
            </div>
          </div>
          <Link
            href="/admin/maintenance/inventory/balances"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? "Inventory Balances" : "أرصدة المخزون"}</span>
            {isEn ? <ArrowUpRight size={13} /> : <ArrowUpLeft size={13} />}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReportMetricCard
            title={isEn ? "Active Catalog Items" : "أصناف الكتالوج النشطة"}
            value={formatCount(data?.activeInventoryItems, locale)}
            subtitle={isEn ? "Registered spare parts & consumables" : "قطع غيار وزيوت ومستلزمات مسجلة"}
            icon={Package}
            tone="brand"
            href="/admin/maintenance/setup/items"
          />
          <ReportMetricCard
            title={isEn ? "Stock Balance Records" : "سجلات أرصدة المستودعات"}
            value={formatCount(data?.stockBalanceRecords, locale)}
            subtitle={isEn ? "Tracked warehouse stock lines" : "سجلات أرصدة المخازن الموثقة"}
            icon={FileSpreadsheet}
            href="/admin/maintenance/inventory/balances"
          />
          <ReportMetricCard
            title={isEn ? "Low Stock Items" : "أصناف منخفضة المخزون"}
            value={formatCount(data?.lowStockItems, locale)}
            subtitle={isEn ? "At or below reorder threshold" : "تتطلب إعادة الشراء والتوريد"}
            icon={AlertTriangle}
            alert={hasLowStock}
            alertBadgeText={isEn ? "Reorder" : "إعادة طلب"}
            href="/admin/maintenance/inventory/balances"
          />
          <ReportMetricCard
            title={isEn ? "Pending Supply Requests" : "طلبات صرف معلقة"}
            value={formatCount(data?.pendingSupplyRequests, locale)}
            subtitle={isEn ? "Awaiting warehouse dispatch" : "بانتظار الصرف من المستودع"}
            icon={PackageCheck}
            alert={hasPendingSupplies}
            alertBadgeText={isEn ? "Pending" : "معلق"}
            href="/admin/maintenance/inventory/supply-requests"
          />
        </div>
      </section>
    </div>
  );
}
