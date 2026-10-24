// src/components/jahez/JahezProfitReportTab.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { jahezClient } from "@/lib/jahez/jahez-v2-client";
import type { JahezProfitReport } from "@/lib/jahez/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  TrendingUp,
  Receipt,
  Percent,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Info,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  CircleDollarSign,
  PieChart,
} from "lucide-react";

// Helpers for Asia/Riyadh dates (UTC+3)
function getRiyadhToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getRiyadhFirstDayOfMonth(): string {
  const today = getRiyadhToday();
  const [year, month] = today.split("-");
  return `${year}-${month}-01`;
}

function getRiyadhPreviousMonthRange(): { from: string; to: string } {
  const today = getRiyadhToday();
  const [year, month] = today.split("-").map(Number);
  const prevDate = new Date(Date.UTC(year, month - 2, 1));
  const prevYear = prevDate.getUTCFullYear();
  const prevMonth = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
  const lastDay = new Date(Date.UTC(prevYear, prevDate.getUTCMonth() + 1, 0)).getUTCDate();
  return {
    from: `${prevYear}-${prevMonth}-01`,
    to: `${prevYear}-${prevMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getRiyadhDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatSAR(val: number | null | undefined): string {
  const num = Number(val) || 0;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function JahezProfitReportTab() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canReadProfit = can("jahez.financial-reports.read") || isAdmin;

  // Default dates: from 1st of month to today (Riyadh time)
  const defaultFrom = useMemo(() => getRiyadhFirstDayOfMonth(), []);
  const defaultTo = useMemo(() => getRiyadhToday(), []);

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [report, setReport] = useState<JahezProfitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  // Validation: fromDate must not be after toDate
  const isDateRangeReversed = Boolean(fromDate && toDate && fromDate > toDate);

  const fetchReport = useCallback(
    async (overrideFrom?: string, overrideTo?: string) => {
      if (!canReadProfit) return;

      const f = overrideFrom !== undefined ? overrideFrom : fromDate;
      const t = overrideTo !== undefined ? overrideTo : toDate;

      if (f && t && f > t) {
        setError("تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية (نطاق تاريخ معكوس).");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Required contract: use jahezClient(...).profitReport({ fromDate, toDate }) from jahez-v2-client.ts
        const result = await jahezClient().profitReport({
          fromDate: f.trim() || undefined,
          toDate: t.trim() || undefined,
        });
        setReport(result);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "تعذر تحميل تقرير الأرباح. تأكد من توفر الاتصال ونشر مسار التقرير على الخادم.";
        setError(msg);
        toast.error("خطأ في جلب تقرير الأرباح", msg);
      } finally {
        setLoading(false);
      }
    },
    [canReadProfit, fromDate, toDate],
  );

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadProfit]);

  // Preset Handlers
  const handlePresetToday = () => {
    const today = getRiyadhToday();
    setFromDate(today);
    setToDate(today);
    fetchReport(today, today);
  };

  const handlePresetCurrentMonth = () => {
    const first = getRiyadhFirstDayOfMonth();
    const today = getRiyadhToday();
    setFromDate(first);
    setToDate(today);
    fetchReport(first, today);
  };

  const handlePresetPreviousMonth = () => {
    const { from, to } = getRiyadhPreviousMonthRange();
    setFromDate(from);
    setToDate(to);
    fetchReport(from, to);
  };

  const handlePresetLast7Days = () => {
    const from = getRiyadhDaysAgo(6);
    const to = getRiyadhToday();
    setFromDate(from);
    setToDate(to);
    fetchReport(from, to);
  };

  const handlePresetLast30Days = () => {
    const from = getRiyadhDaysAgo(29);
    const to = getRiyadhToday();
    setFromDate(from);
    setToDate(to);
    fetchReport(from, to);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!report) {
      toast.warning("تنبيه", "لا توجد بيانات متاحة للتصدير");
      return;
    }

    try {
      const rows = [
        {
          item: "إجمالي رسوم فتح الحسابات المقبوضة",
          code: "accountOpeningFeesTotal",
          amount: report.accountOpeningFeesTotal,
          share:
            report.totalProfit > 0
              ? `${((report.accountOpeningFeesTotal / report.totalProfit) * 100).toFixed(1)}%`
              : "0.0%",
          note: "المقبوضات الفعلية للرسوم (تاريخ الاستحقاق occurredAtUtc) - لا تشمل المعفاة أو غير المسددة",
        },
        {
          item: "إجمالي عمولة التصفية",
          code: "settlementCommissionTotal",
          amount: report.settlementCommissionTotal,
          share:
            report.totalProfit > 0
              ? `${((report.settlementCommissionTotal / report.totalProfit) * 100).toFixed(1)}%`
              : "0.0%",
          note: "العمولة المثبتة على عمليات التصفية المنفذة (تاريخ التنفيذ executedAtUtc) شاملة الترحيل",
        },
        {
          item: "إجمالي أرباح جاهز",
          code: "totalProfit",
          amount: report.totalProfit,
          share: "100.0%",
          note: "إجمالي رسوم فتح الحسابات المقبوضة + إجمالي عمولة التصفية",
        },
      ];

      await exportToExcel({
        filename: `jahez-profit-report-${report.fromDate || fromDate}-to-${report.toDate || toDate}`,
        sheetName: "أرباح جاهز",
        data: rows,
        columns: [
          { header: "البند المالي", accessor: (r) => r.item, isText: true },
          { header: "المعرف البرمجي", accessor: (r) => r.code, isText: true },
          { header: "المبلغ (ر.س)", accessor: (r) => r.amount },
          { header: "النسبة من الإجمالي", accessor: (r) => r.share, isText: true },
          { header: "محددات الاحتساب", accessor: (r) => r.note, isText: true },
        ],
      });
      toast.success("تم التصدير", "تم تصدير تقرير أرباح جاهز إلى إكسل بنجاح");
    } catch {
      toast.error("خطأ", "تعذر تصدير ملف الإكسل");
    }
  };

  // Percentages for visual breakdown
  const feesTotal = report?.accountOpeningFeesTotal || 0;
  const commissionTotal = report?.settlementCommissionTotal || 0;
  const totalProfit = report?.totalProfit || 0;

  const feesPercentage = totalProfit > 0 ? (feesTotal / totalProfit) * 100 : 0;
  const commissionPercentage = totalProfit > 0 ? (commissionTotal / totalProfit) * 100 : 0;

  if (!canReadProfit) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold">صلاحية غير متوفرة</h3>
            <p className="text-xs">
              عفواً، يتطلب عرض هذا التقرير الحصول على صلاحية تقارير جاهز المالية (
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-900">
                jahez.financial-reports.read
              </code>
              ). يرجى مراجعة مسؤول النظام لمنحك الصلاحية اللازمة.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tab Header Banner */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-l from-emerald-50/70 via-white to-gray-50/50 p-4 shadow-xs dark:border-gray-800 dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-900/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  تقرير أرباح جاهز (Jahez Profit Report)
                </h2>
                <Badge tone="green">V2 Financial</Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                إجمالي الأرباح الصافية المحققة من رسوم فتح الحسابات المقبوضة وعمولات التصفيات
                المنفذة (بتوقيت الرياض UTC+3)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={loading || !report}
              className="gap-1.5 h-8 text-xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              تصدير إكسل
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchReport()}
              disabled={loading || isDateRangeReversed}
              className="gap-1.5 h-8 text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              تحديث
            </Button>
          </div>
        </div>
      </div>

      {/* Date Filter & Preset Controls */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3 flex-1">
            <div className="w-full sm:w-44">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                من تاريخ (توقيت الرياض)
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="w-full sm:w-44">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                إلى تاريخ (توقيت الرياض)
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <Button
              size="sm"
              onClick={() => fetchReport()}
              disabled={loading || isDateRangeReversed}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 text-xs gap-1.5"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              تطبيق الفلتر
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 lg:pt-0">
            <span className="text-[11px] font-semibold text-gray-400 ml-1">فترات سريعة:</span>
            <button
              type="button"
              onClick={handlePresetToday}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={handlePresetCurrentMonth}
              className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              الشهر الحالي
            </button>
            <button
              type="button"
              onClick={handlePresetPreviousMonth}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              الشهر السابق
            </button>
            <button
              type="button"
              onClick={handlePresetLast7Days}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={handlePresetLast30Days}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              آخر 30 يوم
            </button>
          </div>
        </div>

        {/* Validation warning */}
        {isDateRangeReversed && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              نطاق التاريخ غير صالح: تاريخ البداية (<code>{fromDate}</code>) أكبر من تاريخ النهاية (
              <code>{toDate}</code>). يرجى تصحيح التاريخ.
            </span>
          </div>
        )}

        {/* Active Range Summary */}
        {report && !isDateRangeReversed && (
          <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">الفترة المعتمدة في التقرير:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {report.fromDate || fromDate || "من البداية"}
              </span>
              <span>←</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {report.toDate || toDate || "إلى اليوم"}
              </span>
              <Badge tone="purple" className="text-[10px]">
                توقيت الرياض (UTC+3)
              </Badge>
              {report.fromDate === report.toDate && (
                <Badge tone="orange" className="text-[10px]">
                  يوم واحد
                </Badge>
              )}
            </div>

            {totalProfit === 0 && !loading && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                لا توجد عمليات أو رسوم مقبوضة مسجلة خلال هذه الفترة
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs">تعذر جلب التقرير من الخادم</div>
              <div className="text-xs mt-0.5">{error}</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchReport()}
            className="text-xs h-7 text-rose-700 border-rose-200 hover:bg-rose-100"
          >
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Loading Skeleton / State */}
      {loading && !report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 h-44"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* The 3 Core Profit Metrics Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Account Opening Fees */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-indigo-900/50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                إجمالي رسوم فتح الحسابات المقبوضة
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Receipt className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                <span dir="ltr" className="inline-block font-mono">
                  {formatSAR(feesTotal)}
                </span>{" "}
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">ر.س</span>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {feesPercentage.toFixed(1)}%
                </span>
                <span>من إجمالي الأرباح</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 leading-relaxed dark:text-gray-400">
              <p>
                <strong>المعيار:</strong> مقبوضات رسوم الحسابات الفعلية المفلترة بتاريخ القبض الفعلي (
                <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  occurredAtUtc
                </code>
                ). تشمل الدفعات المبدئية والجزئية، ولا تضاف الرسوم غير المسددة أو المعفاة.
              </p>
            </div>
          </div>

          {/* Card 2: Settlement Commission */}
          <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-sky-900/50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700 dark:text-sky-400">
                إجمالي عمولة التصفية
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                <Percent className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                <span dir="ltr" className="inline-block font-mono">
                  {formatSAR(commissionTotal)}
                </span>{" "}
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">ر.س</span>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  {commissionPercentage.toFixed(1)}%
                </span>
                <span>من إجمالي الأرباح</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 leading-relaxed dark:text-gray-400">
              <p>
                <strong>المعيار:</strong> العمولة المثبتة على عمليات التصفية المنفذة فوراً (
                <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  executedAtUtc
                </code>
                ). تشمل التصفيات المصفرة، أو المحصل منها وقود، أو المرحلة لمديونية المندوب.
              </p>
            </div>
          </div>

          {/* Card 3: Total Profit (Featured Hero Card) */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-lg shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-100">
                إجمالي أرباح جاهز
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
                <CircleDollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-3xl lg:text-4xl font-black tracking-tight text-white">
                <span dir="ltr" className="inline-block font-mono">
                  {formatSAR(totalProfit)}
                </span>{" "}
                <span className="text-base font-bold text-emerald-200">ر.س</span>
              </div>

              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-100">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>صافي الأرباح المعتمدة للفترة</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/20 text-[11px] text-emerald-100 leading-relaxed">
              <p className="font-mono font-medium">
                {formatSAR(feesTotal)} ر.س (رسوم) + {formatSAR(commissionTotal)} ر.س (عمولات)
              </p>
              <p className="text-[10px] text-emerald-200/90 mt-0.5">
                مجموع رسوم فتح الحسابات المقبوضة وعمولة التصفية المحققة
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Composition & Breakdown Bar */}
      {report && totalProfit > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                التوزيع النسبي لمصادر الأرباح
              </h3>
            </div>
            <span className="text-[11px] text-gray-500">
              إجمالي التدفق الربحي: <strong className="font-mono text-gray-800 dark:text-gray-200">{formatSAR(totalProfit)} ر.س</strong>
            </span>
          </div>

          {/* Visual Percentage Bar */}
          <div className="h-4 w-full rounded-full bg-gray-100 dark:bg-gray-800 flex overflow-hidden p-0.5 gap-0.5">
            <div
              style={{ width: `${feesPercentage}%` }}
              className="h-full rounded-r-full bg-indigo-500 transition-all duration-500"
              title={`رسوم فتح الحسابات: ${feesPercentage.toFixed(1)}%`}
            />
            <div
              style={{ width: `${commissionPercentage}%` }}
              className="h-full rounded-l-full bg-sky-500 transition-all duration-500"
              title={`عمولة التصفية: ${commissionPercentage.toFixed(1)}%`}
            />
          </div>

          {/* Legend & Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-500 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    رسوم فتح الحسابات المقبوضة
                  </span>
                  <div className="text-[10px] text-gray-500">
                    المقبوضات المحصلة فعلياً
                  </div>
                </div>
              </div>
              <div className="text-left font-mono">
                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                  {formatSAR(feesTotal)} ر.س
                </div>
                <div className="text-[10px] text-gray-500">
                  {feesPercentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-500 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    عمولات التصفية المنفذة
                  </span>
                  <div className="text-[10px] text-gray-500">
                    عمولات العمليات المعتمدة
                  </div>
                </div>
              </div>
              <div className="text-left font-mono">
                <div className="text-xs font-bold text-sky-700 dark:text-sky-400">
                  {formatSAR(commissionTotal)} ر.س
                </div>
                <div className="text-[10px] text-gray-500">
                  {commissionPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Table */}
      {report && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-emerald-600" />
              تفاصيل بنود أرباح جاهز
            </h3>
            <span className="text-[11px] text-gray-400">
              تغطي كافة السجلات المطابقة بدون تجزئة صفحات (Non-paginated)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                <tr>
                  <th className="py-3 px-4">البند المالي</th>
                  <th className="py-3 px-4">حقل الاستجابة</th>
                  <th className="py-3 px-4">تاريخ وفلتر الاعتراف المحاسبي</th>
                  <th className="py-3 px-4 text-center">المبلغ (ر.س)</th>
                  <th className="py-3 px-4 text-center">النسبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    إجمالي رسوم فتح الحسابات المقبوضة
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                    accountOpeningFeesTotal
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                    تاريخ القبض الفعلي (<code className="font-mono text-[10px]">occurredAtUtc</code>) • يشمل المبدئية والجزئية
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
                    {formatSAR(feesTotal)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-gray-600 dark:text-gray-400">
                    {feesPercentage.toFixed(1)}%
                  </td>
                </tr>

                <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    إجمالي عمولة التصفية
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                    settlementCommissionTotal
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                    تاريخ تنفيذ التصفية (<code className="font-mono text-[10px]">executedAtUtc</code>) • يشمل الترحيل والوقود
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-sky-700 dark:text-sky-400">
                    {formatSAR(commissionTotal)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-gray-600 dark:text-gray-400">
                    {commissionPercentage.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t bg-gray-50/90 dark:bg-gray-800/60 font-black text-gray-900 dark:text-white">
                <tr>
                  <td colSpan={3} className="py-3.5 px-4">
                    إجمالي أرباح جاهز للفترة المحددة (Total Profit)
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-base text-emerald-700 dark:text-emerald-400">
                    {formatSAR(totalProfit)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-emerald-700 dark:text-emerald-400">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Business Rules & Accounting Rules Collapsible Info Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setShowRules(!showRules)}
          className="flex w-full items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-emerald-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-600" />
            <span>قواعد الاحتساب المحاسبي والسياسات المالية لتقرير أرباح جاهز</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {showRules ? "إخفاء التفاصيل" : "عرض القواعد والضوابط"}
          </span>
        </button>

        {showRules && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  الاعتراف الفوري بالعمولة:
                </span>
                <p>
                  تُحتسب العمولة فور تنفيذ عملية التصفية (Executed)، بما فيها العمليات التي تسدد للمندوب، أو تصفر، أو يجمع منها وقود، أو تُرحل لمديونية المندوب. لا تُقاس العمولة فقط بالتحصيل النقدي.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                  رسوم فتح الحسابات:
                </span>
                <p>
                  تُسجل الرسوم المقبوضة فعلياً فقط المفلترة بتاريخ الاستحقاق والقبض (occurredAtUtc). الرسوم غير المسددة أو المعفاة لا تساهم في إجمالي الأرباح.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  الاستثناءات التشغيلية:
                </span>
                <p>
                  مسودات العمليات (Ready / Under Review)، والسحب المنفصل، ومبالغ المنصة الصافية، وسداد الديون المرحلة لا تُضيف أرباحاً جديدة، وسداد التصفية المرحلة لا يعيد احتساب العمولة مرة أخرى.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  ثبات السجلات التاريخية:
                </span>
                <p>
                  تسليم العهدة للمحاسب أو إغلاق الحساب أو إعادة إسناده لا يحذف المقبوضات التاريخية ولا ينقل مبالغ الأرباح إلى فترة أخرى.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
