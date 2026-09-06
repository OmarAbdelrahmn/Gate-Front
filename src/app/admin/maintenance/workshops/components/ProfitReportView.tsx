"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Building2,
  Calendar,
  Calculator,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { getExternalProfitReport } from "@/lib/maintenance/api";
import type {
  ExternalProfitReport,
  MaintenanceLocation,
} from "@/lib/maintenance/types";
import {
  formatCurrency,
  externalPaymentStatusConfig,
} from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ProfitReportViewProps {
  locations: MaintenanceLocation[];
}

export function ProfitReportView({ locations }: ProfitReportViewProps) {
  const { can } = useAuth();
  const canView = can("maintenance.profit_reports.read");

  const workshopLocations = locations.filter(
    (l) => l.allowsPaidExternalRepairs || l.allowsExternalVehicles,
  );

  const [locationId, setLocationId] = useState(workshopLocations[0]?.id || "");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10),
  );

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ExternalProfitReport | null>(null);

  const loadReport = async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const data = await getExternalProfitReport(locationId, startDate, endDate);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locationId) {
      loadReport();
    }
  }, [locationId]);

  if (!canView) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        عفواً، لا تملك صلاحية عرض تقارير أرباح الورشة (`maintenance.profit_reports.read`).
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              الورشة المستهدفة
            </label>
            <SearchableSelect
              value={locationId}
              onChange={(val) => setLocationId(val)}
              options={workshopLocations.map((l) => ({
                value: l.id,
                label: `${l.nameAr} (${l.code})`,
              }))}
              placeholder="اختر الورشة..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              من تاريخ
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              إلى تاريخ
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        <Button
          variant="primary"
          onClick={loadReport}
          loading={loading}
          className="h-10 text-xs shrink-0 self-end"
        >
          <RefreshCw size={14} />
          تحديث واحتساب التقرير
        </Button>
      </div>

      {/* Accounting Formula Banner */}
      <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-black text-sm">
          <Calculator size={18} className="text-[#1167c9]" />
          <span>المعادلة المحاسبية المعتمدة للربح التشغيلي الحقيقي للورشة (قبل الضريبة):</span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-center tracking-wide">
          صافي الربح قبل الضريبة = (مبيعات قطع الغيار + أجور يد العميل + إيرادات أخرى) − (تكلفة مخزون FIFO + أجور ومستحقات الفنيين + مصروفات أخرى)
        </div>
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>
            • <strong>المبالغ المحصلة (Cash Collected)</strong> تُعبر عن السيولة النقدية المستلمة ولا تُعد ربحاً بحد ذاتها.
          </span>
          <span>
            • <strong>ضريبة القيمة المضافة المحصلة</strong> تُعرض وتُحسب بمعزل عن صافي الربح التشغيلي.
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Total Revenue */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/30 dark:bg-blue-950/20 p-4">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 block">
              إجمالي الإيرادات قبل الضريبة
            </span>
            <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
              {formatCurrency(report.totalIncomeBeforeTax)}
            </span>
          </div>

          {/* Total Expenses */}
          <div className="rounded-2xl border border-red-200 bg-red-50/30 dark:bg-red-950/20 p-4">
            <span className="text-[11px] font-bold text-red-700 dark:text-red-400 block">
              إجمالي المصروفات والتكاليف
            </span>
            <span className="text-xl font-black font-mono text-red-600 dark:text-red-400 mt-1 block">
              {formatCurrency(report.totalExpense)}
            </span>
          </div>

          {/* Net Profit Before Tax */}
          <div className="rounded-2xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
            <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 block">
              صافي الربح قبل الضريبة
            </span>
            <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1 block">
              {formatCurrency(report.netProfitBeforeTax)}
            </span>
          </div>

          {/* Cash Collected */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/30 dark:bg-purple-950/20 p-4">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 block">
              المبالغ المحصلة فعلياً
            </span>
            <span className="text-xl font-black font-mono text-purple-700 dark:text-purple-300 mt-1 block">
              {formatCurrency(report.amountPaid)}
            </span>
          </div>

          {/* Tax Collected */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 p-4">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
              الضريبة المحصلة (VAT)
            </span>
            <span className="text-xl font-black font-mono text-slate-700 dark:text-slate-300 mt-1 block">
              {formatCurrency(report.taxCollected)}
            </span>
          </div>
        </div>
      )}

      {/* Detailed Orders Breakdown Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="p-4 border-b border-[var(--border)] font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>تفاصيل العمليات وأرباح أوامر الصيانة المنفذة ({report?.workOrders?.length || 0} أمر)</span>
        </div>

        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رقم الأمر</th>
              <th className="p-3">مرجع المركبة</th>
              <th className="p-3 text-left font-mono">إيراد القطع</th>
              <th className="p-3 text-left font-mono">أجور يد العميل</th>
              <th className="p-3 text-left font-mono text-red-600">تكلفة FIFO للمخزون</th>
              <th className="p-3 text-left font-mono text-red-600">أجرة الفني</th>
              <th className="p-3 text-left font-mono font-bold text-emerald-700">صافي الربح قبل الضريبة</th>
              <th className="p-3 text-left font-mono">المحصل</th>
              <th className="p-3 text-left font-mono text-amber-600">المتبقي</th>
              <th className="p-3 text-center">حالة السداد</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  جارٍ احتساب أرباح الورشة...
                </td>
              </tr>
            ) : !report || report.workOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  لا توجد عمليات مسجلة خلال الفترة المحددة.
                </td>
              </tr>
            ) : (
              report.workOrders.map((wo) => {
                const statusCfg = externalPaymentStatusConfig[wo.paymentStatus];

                return (
                  <tr key={wo.maintenanceWorkOrderId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 font-mono font-bold text-[#1167c9] dark:text-blue-400">
                      {wo.workOrderNumber}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {wo.externalVehicleReference}
                    </td>
                    <td className="p-3 text-left font-mono">
                      {formatCurrency(wo.partsRevenueBeforeTax)}
                    </td>
                    <td className="p-3 text-left font-mono">
                      {formatCurrency(wo.customerLaborRevenueBeforeTax)}
                    </td>
                    <td className="p-3 text-left font-mono text-red-600 dark:text-red-400">
                      {formatCurrency(wo.fifoInventoryCost)}
                    </td>
                    <td className="p-3 text-left font-mono text-red-600 dark:text-red-400">
                      {formatCurrency(wo.mechanicLaborCost)}
                    </td>
                    <td className="p-3 text-left font-mono font-black text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(wo.netProfitBeforeTax)}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-purple-700 dark:text-purple-300">
                      {formatCurrency(wo.amountPaid)}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-amber-700 dark:text-amber-400">
                      {formatCurrency(wo.outstandingAmount)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                      >
                        {statusCfg?.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
