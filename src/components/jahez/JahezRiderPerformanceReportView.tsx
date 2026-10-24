// src/components/jahez/JahezRiderPerformanceReportView.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { jahezClient } from "@/lib/jahez/jahez-v2-client";
import type {
  JahezRiderPerformanceResponse,
  JahezRiderPerformanceItem,
  JahezRiderPerformanceDaily,
  JahezRiderPerformanceAccountBreakdown,
  JahezRiderPerformanceParams,
} from "@/lib/jahez/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  Search,
  User,
  Users,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Eye,
  SlidersHorizontal,
  X,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Activity,
  ArrowUpDown,
  Filter,
  Layers,
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

const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

interface DayColumnInfo {
  dateStr: string;
  dayNumber: string;
  dayNameAr: string;
  shortLabel: string;
}

export function JahezRiderPerformanceReportView() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canRead = can("jahez.read") || isAdmin;

  // Date filters (Defaults: from 1st of month to today in Riyadh)
  const todayRiyadh = useMemo(() => getRiyadhToday(), []);
  const defaultStartDate = useMemo(() => getRiyadhFirstDayOfMonth(), []);

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(todayRiyadh);

  // Optional server query parameters
  const [riderIdInput, setRiderIdInput] = useState<string>("");
  const [accountIdInput, setAccountIdInput] = useState<string>("");

  // In-table search & sort
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterActivity, setFilterActivity] = useState<"ALL" | "WITH_ORDERS" | "ZERO_ORDERS" | "HAS_MISSING">("ALL");
  const [sortField, setSortField] = useState<"name" | "orders_desc" | "orders_asc" | "days_desc" | "avg_desc">("orders_desc");

  // Expanded accordion rows (Set of riderProfileIds)
  const [expandedRiders, setExpandedRiders] = useState<Set<string>>(new Set());

  // Detail Modal for a single rider
  const [detailRider, setDetailRider] = useState<JahezRiderPerformanceItem | null>(null);

  // Data & Loading states
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<JahezRiderPerformanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDocRules, setShowDocRules] = useState<boolean>(false);

  // Date validation checks
  const isDateRangeReversed = Boolean(startDate && endDate && startDate > endDate);
  const isEndDateInFuture = Boolean(endDate && endDate > todayRiyadh);

  // Calculate day difference
  const rangeDaysCount = useMemo(() => {
    if (!startDate || !endDate || isDateRangeReversed) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, isDateRangeReversed]);

  const isRangeOverLimit = rangeDaysCount > 366;

  // Fetch Report Handler (Fetches ALL riders across all pages into one single unified view)
  const fetchReport = useCallback(
    async (
      overrideStart?: string,
      overrideEnd?: string,
      overrideRiderId?: string,
      overrideAccountId?: string,
    ) => {
      const sDate = overrideStart !== undefined ? overrideStart : startDate;
      const eDate = overrideEnd !== undefined ? overrideEnd : endDate;
      const rId = overrideRiderId !== undefined ? overrideRiderId : riderIdInput;
      const aId = overrideAccountId !== undefined ? overrideAccountId : accountIdInput;

      if (!sDate || !eDate) {
        toast.error("يرجى تحديد تاريخ البداية والنهاية");
        return;
      }
      if (sDate > eDate) {
        toast.error("تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية");
        return;
      }
      if (eDate > todayRiyadh) {
        toast.error("تاريخ النهاية يجب ألا يتجاوز تاريخ اليوم بتوقيت الرياض");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params: JahezRiderPerformanceParams = {
          startDate: sDate,
          endDate: eDate,
        };
        if (rId.trim()) params.riderId = rId.trim();
        if (aId.trim()) params.accountId = aId.trim();

        // Fetch all riders across all pages automatically into one unified list
        const res = await jahezClient().allRiderPerformance(params);
        setReport(res);
      } catch (err: any) {
        console.error("Failed to fetch Jahez rider performance report:", err);
        const detail =
          err?.response?.data?.detail ||
          err?.data?.detail ||
          err?.message ||
          "تعذر جلب تقرير أداء المناديب من الخادم";
        setError(detail);
        toast.error(detail);
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, riderIdInput, accountIdInput, todayRiyadh]
  );

  // Initial fetch on mount if permissions allow
  useEffect(() => {
    if (canRead) {
      fetchReport();
    }
  }, [canRead]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract date columns from report (or calculate list of dates between start and end)
  const dateColumns: DayColumnInfo[] = useMemo(() => {
    // If we have items with daily array, take dates from first item's daily array
    if (report?.items?.[0]?.daily?.length) {
      return report.items[0].daily.map((d) => {
        const parts = d.date.split("-");
        const dt = new Date(d.date + "T00:00:00");
        const dayIdx = dt.getDay();
        return {
          dateStr: d.date,
          dayNumber: parts[2] || d.date,
          dayNameAr: ARABIC_DAYS[dayIdx] || "",
          shortLabel: `${parts[2]}/${parts[1]}`,
        };
      });
    }

    // Fallback: construct columns from startDate to endDate
    if (!startDate || !endDate || isDateRangeReversed || rangeDaysCount > 366) {
      return [];
    }

    const cols: DayColumnInfo[] = [];
    const curr = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");

    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, "0");
      const day = String(curr.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const dayIdx = curr.getDay();

      cols.push({
        dateStr,
        dayNumber: day,
        dayNameAr: ARABIC_DAYS[dayIdx] || "",
        shortLabel: `${day}/${month}`,
      });
      curr.setDate(curr.getDate() + 1);
    }
    return cols;
  }, [report, startDate, endDate, isDateRangeReversed, rangeDaysCount]);

  // Client-side search and filters over report.items
  const filteredRiders = useMemo(() => {
    if (!report?.items) return [];

    let list = [...report.items];

    // Search query: rider name, iqama, account external IDs, profile UUID
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const nameMatch = (r.riderName || "").toLowerCase().includes(q);
        const iqamaMatch = (r.riderIqamaNo || "").toLowerCase().includes(q);
        const uuidMatch = (r.riderProfileId || "").toLowerCase().includes(q);
        const accMatch = r.accounts.some(
          (a) =>
            (a.externalAccountId || "").toLowerCase().includes(q) ||
            (a.accountId || "").toLowerCase().includes(q)
        );
        return nameMatch || iqamaMatch || uuidMatch || accMatch;
      });
    }

    // Activity Filter
    if (filterActivity === "WITH_ORDERS") {
      list = list.filter((r) => r.selectedSummary.orders > 0);
    } else if (filterActivity === "ZERO_ORDERS") {
      list = list.filter((r) => r.selectedSummary.orders === 0 && r.selectedSummary.daysWithData > 0);
    } else if (filterActivity === "HAS_MISSING") {
      list = list.filter((r) => r.selectedSummary.missingDays > 0);
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortField) {
        case "orders_desc":
          return b.selectedSummary.orders - a.selectedSummary.orders;
        case "orders_asc":
          return a.selectedSummary.orders - b.selectedSummary.orders;
        case "days_desc":
          return b.selectedSummary.daysWithData - a.selectedSummary.daysWithData;
        case "avg_desc":
          return (b.selectedSummary.averageOrdersPerDayWithData ?? 0) - (a.selectedSummary.averageOrdersPerDayWithData ?? 0);
        case "name":
        default:
          return (a.riderName || "").localeCompare(b.riderName || "", "ar");
      }
    });

    return list;
  }, [report, searchQuery, filterActivity, sortField]);

  // Aggregate KPI metrics across currently filtered items
  const kpis = useMemo(() => {
    const items = filteredRiders;
    const totalRiders = report?.totalCount ?? items.length;
    const totalOrders = items.reduce((acc, r) => acc + r.selectedSummary.orders, 0);
    const totalDaysWithData = items.reduce((acc, r) => acc + r.selectedSummary.daysWithData, 0);
    const totalZeroOrderDays = items.reduce((acc, r) => acc + r.selectedSummary.zeroOrderDays, 0);
    const totalMissingDays = items.reduce((acc, r) => acc + r.selectedSummary.missingDays, 0);
    const ridersWithOrders = items.filter((r) => r.selectedSummary.orders > 0).length;

    const overallAveragePerDay =
      totalDaysWithData > 0 ? (totalOrders / totalDaysWithData).toFixed(2) : "0.00";

    return {
      totalRiders,
      shownRiders: items.length,
      totalOrders,
      totalDaysWithData,
      totalZeroOrderDays,
      totalMissingDays,
      ridersWithOrders,
      overallAveragePerDay,
    };
  }, [filteredRiders, report]);

  // Accordion toggle helper
  const toggleRiderExpand = (riderProfileId: string) => {
    setExpandedRiders((prev) => {
      const next = new Set(prev);
      if (next.has(riderProfileId)) {
        next.delete(riderProfileId);
      } else {
        next.add(riderProfileId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set(filteredRiders.map((r) => r.riderProfileId));
    setExpandedRiders(all);
  };

  const collapseAll = () => {
    setExpandedRiders(new Set());
  };

  // Preset Handlers
  const handlePresetCurrentMonth = () => {
    const from = getRiyadhFirstDayOfMonth();
    const to = getRiyadhToday();
    setStartDate(from);
    setEndDate(to);
    fetchReport(from, to);
  };

  const handlePresetLast7Days = () => {
    const from = getRiyadhDaysAgo(6);
    const to = getRiyadhToday();
    setStartDate(from);
    setEndDate(to);
    fetchReport(from, to);
  };

  const handlePresetLast14Days = () => {
    const from = getRiyadhDaysAgo(13);
    const to = getRiyadhToday();
    setStartDate(from);
    setEndDate(to);
    fetchReport(from, to);
  };

  const handlePresetLast30Days = () => {
    const from = getRiyadhDaysAgo(29);
    const to = getRiyadhToday();
    setStartDate(from);
    setEndDate(to);
    fetchReport(from, to);
  };

  const handlePresetPreviousMonth = () => {
    const { from, to } = getRiyadhPreviousMonthRange();
    setStartDate(from);
    setEndDate(to);
    fetchReport(from, to);
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!filteredRiders.length) {
      toast.error("لا توجد بيانات لتصديرها");
      return;
    }

    const excelData = filteredRiders.map((r, idx) => {
      const accountsStr = r.accounts
        .map((a) => a.externalAccountId || a.accountId)
        .join("، ");

      const row: Record<string, any> = {
        "#": idx + 1,
        "اسم المندوب": r.riderName || "غير محدد",
        "رقم الإقامة": r.riderIqamaNo || "-",
        "الحسابات المستخدمة": accountsStr,
        "إجمالي الطلبات": r.selectedSummary.orders,
        "أيام العمل بالبيانات": r.selectedSummary.daysWithData,
        "أيام تحقيق طلبات": r.selectedSummary.daysWithOrders,
        "أيام بلا طلبات (0)": r.selectedSummary.zeroOrderDays,
        "أيام فاقدة للبيانات": r.selectedSummary.missingDays,
        "متوسط الطلبات/يوم عمل": r.selectedSummary.averageOrdersPerDayWithData ?? "-",
        "أعلى يوم طلبات": r.selectedSummary.maxOrdersPerDay ?? "-",
      };

      // Add each date column to row
      dateColumns.forEach((col) => {
        const dayRecord = r.daily.find((d) => d.date === col.dateStr);
        row[`${col.dateStr} (${col.dayNameAr})`] =
          dayRecord && dayRecord.orders !== null ? dayRecord.orders : "—";
      });

      return row;
    });

    const filename = `تقرير_أداء_مناديب_جاهز_${startDate}_إلى_${endDate}`;
    exportToExcel(excelData, filename);
    toast.success("تم تصدير المصفوفة إلى ملف إكسل بنجاح");
  };

  // Permission Guard
  if (!canRead) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center" dir="rtl">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500 mb-3" />
        <h3 className="text-base font-bold text-[var(--foreground)]">لا تملك صلاحية الوصول</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          يتطلب هذا التقرير صلاحية <code className="font-mono text-purple-600">jahez.read</code> ضمن نطاق منصة جاهز.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ----------------- Top Header & Actions ----------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-[var(--foreground)]">
                  تقرير أداء المناديب بالفترة
                </h2>
                <Badge tone="purple" className="text-[10px] font-mono">
                  # Jahez rider performance by date range
                </Badge>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                مصفوفة الأداء اليومي للطلبات: الأيام كأعمدة والمناديب كصفوف، مع تفصيل الحسابات والأيام الصفرية والمفقودة.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowDocRules((prev) => !prev)}
            className="gap-1.5 text-xs font-semibold"
          >
            <HelpCircle className="h-4 w-4 text-purple-600" />
            قواعد الاحتساب والفترة
          </Button>

          <Button
            variant="secondary"
            onClick={() => fetchReport()}
            disabled={loading}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            تحديث التقرير
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={loading || filteredRiders.length === 0}
            className="gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير إكسل (المصفوفة)
          </Button>
        </div>
      </div>

      {/* ----------------- Rules & Documentation Drawer ----------------- */}
      {showDocRules && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-900/60 dark:bg-purple-950/30 text-xs text-purple-950 dark:text-purple-200 space-y-2">
          <div className="flex items-center justify-between font-bold text-sm">
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4 text-purple-600" />
              ضوابط احتساب أداء المناديب بالفترة (Jahez V2):
            </span>
            <button
              onClick={() => setShowDocRules(false)}
              className="text-purple-700 hover:text-purple-900 dark:text-purple-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="list-disc list-inside space-y-1 leading-relaxed text-[11px]">
            <li>
              <strong>النافذة الزمنية:</strong> تقبل من يوم واحد إلى 366 يوماً كحد أقصى، ويجب أن يكون تاريخ النهاية مساوياً لتاريخ اليوم أو سابقاً بتوقيت الرياض.
            </li>
            <li>
              <strong>إسناد الطلبات الفعلي:</strong> تنسب الطلبات للمندوب الذي كان مستلماً للحساب فعلياً في اليوم المعني عبر جلسات التسليم المحفوظة، ولا تُنسب للمالك الحالي أو المسجل.
            </li>
            <li>
              <strong>تعدد الحسابات:</strong> إذا استخدم المندوب أكثر من حساب خلال الفترة، تُجمع طلباته في سطر المندوب مع الاحتفاظ بتفصيل كل حساب عبر الضغط على علامة التوسيع.
            </li>
            <li>
              <strong>حالات الأيام:</strong> الرقم الإيجابي يعني تحقيق طلبات؛ <code>0</code> يؤكد عدم وجود طلبات في يوم عمل؛ <code>—</code> تعني نقص أو غياب بيانات الشيت المعتمد لهذا التاريخ.
            </li>
            <li>
              <strong>معدل الطلبات:</strong> يقسم مجموع الطلبات على عدد الأيام التي احتوت على بيانات فعلية (بما فيها الأيام الصفرية المؤكدة).
            </li>
          </ul>
        </div>
      )}

      {/* ----------------- Date Filter & Presets Card ----------------- */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-xs space-y-4">
        {/* Date Inputs & Quick Presets */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            {/* Start Date */}
            <div className="w-40 space-y-1">
              <label className="text-xs font-bold text-[var(--muted)] flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-purple-600" />
                من تاريخ (البداية) *
              </label>
              <Input
                type="date"
                value={startDate}
                max={todayRiyadh}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            {/* End Date */}
            <div className="w-40 space-y-1">
              <label className="text-xs font-bold text-[var(--muted)] flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-purple-600" />
                إلى تاريخ (النهاية) *
              </label>
              <Input
                type="date"
                value={endDate}
                max={todayRiyadh}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            {/* Submit / Apply Button */}
            <Button
              onClick={() => {
                fetchReport();
              }}
              disabled={loading || isDateRangeReversed || isEndDateInFuture || isRangeOverLimit}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs font-bold h-9 px-5 shadow-xs"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
              تطبيق الفترة
            </Button>
          </div>

          {/* Quick Presets Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-[var(--muted)] ml-1">فترات سريعة:</span>
            <button
              type="button"
              onClick={handlePresetCurrentMonth}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-2.5 py-1 text-[11px] font-medium hover:border-purple-300 hover:text-purple-700 transition-colors"
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={handlePresetLast7Days}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-2.5 py-1 text-[11px] font-medium hover:border-purple-300 hover:text-purple-700 transition-colors"
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={handlePresetLast14Days}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-2.5 py-1 text-[11px] font-medium hover:border-purple-300 hover:text-purple-700 transition-colors"
            >
              آخر 14 يوم
            </button>
            <button
              type="button"
              onClick={handlePresetLast30Days}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-2.5 py-1 text-[11px] font-medium hover:border-purple-300 hover:text-purple-700 transition-colors"
            >
              آخر 30 يوم
            </button>
            <button
              type="button"
              onClick={handlePresetPreviousMonth}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-2.5 py-1 text-[11px] font-medium hover:border-purple-300 hover:text-purple-700 transition-colors"
            >
              الشهر السابق
            </button>
          </div>
        </div>

        {/* Date Validation Error alerts */}
        {isDateRangeReversed && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>خطأ: تاريخ البداية لا يمكن أن يكون لاحقاً لتاريخ النهاية.</span>
          </div>
        )}
        {isEndDateInFuture && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>تنبيه: لا يمكن اختيار تاريخ مستقبلي. الحد الأقصى هو تاريخ اليوم بتوقيت الرياض ({todayRiyadh}).</span>
          </div>
        )}
        {isRangeOverLimit && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>تنبيه: الحد الأقصى للنافذة الزمنية هو 366 يوماً (المدة المحددة حالياً: {rangeDaysCount} يوم).</span>
          </div>
        )}

        {/* Selected Window Summary Banner */}
        <div className="flex flex-wrap items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)] gap-2">
          <div className="flex items-center gap-2 font-mono">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span>الفترة المحددة:</span>
            <strong className="text-[var(--foreground)]" dir="ltr">
              {startDate} → {endDate}
            </strong>
            <span className="rounded-md bg-purple-50 px-2 py-0.5 font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              {rangeDaysCount} يوم
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px]">
              عدد أعمدة الأيام المستخرجة: <strong className="text-[var(--foreground)] font-mono">{dateColumns.length}</strong> يوم
            </span>
            {filteredRiders.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-purple-600 hover:underline font-semibold"
                >
                  توسيع الكل
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-purple-600 hover:underline font-semibold"
                >
                  طي الكل
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- Error State ----------------- */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="space-y-1">
              <span className="font-bold block">تعذر تحميل تقرير أداء المناديب</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- KPI Summary Cards ----------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Riders */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted)]">
            <span>إجمالي المناديب</span>
            <Users className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-[var(--foreground)]">
            {kpis.totalRiders.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-[var(--muted)]">
            المعروض: {kpis.shownRiders} مندوب
          </div>
        </div>

        {/* Total Period Orders */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 shadow-xs dark:border-purple-900/50 dark:bg-purple-950/20">
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-300">
            <span>إجمالي الطلبات</span>
            <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-purple-700 dark:text-purple-300">
            {kpis.totalOrders.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-purple-600/80 dark:text-purple-400">
            في كامل الفترة المحددة
          </div>
        </div>

        {/* Working Days with Data */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <span>أيام العمل بالبيانات</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {kpis.totalDaysWithData.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-600/80 dark:text-emerald-400">
            سجلات أيام العمل المعتمدة
          </div>
        </div>

        {/* Average Orders per Day */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-xs dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
            <span>معدل الطلبات/يوم</span>
            <Activity className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-blue-700 dark:text-blue-300">
            {kpis.overallAveragePerDay}
          </div>
          <div className="mt-0.5 text-[10px] text-blue-600/80 dark:text-blue-400">
            طلب / يوم عمل مسجل
          </div>
        </div>

        {/* Zero-order Days */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300">
            <span>أيام بلا طلبات (0)</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-amber-700 dark:text-amber-300">
            {kpis.totalZeroOrderDays.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-amber-600/80 dark:text-amber-400">
            أيام عمل مؤكدة بإنتاجية صفر
          </div>
        </div>

        {/* Missing Days */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted)]">
            <span>أيام بلا بيانات (نقص)</span>
            <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <div className="mt-1 font-mono text-2xl font-black text-[var(--muted)]">
            {kpis.totalMissingDays.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-[var(--muted)]">
            أيام تفتقد لسجلات معتمدة
          </div>
        </div>
      </div>

      {/* ----------------- Filter & Search Controls Bar ----------------- */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search box */}
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المندوب، الإقامة، رقم الحساب..."
              className="pr-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Activity Filter */}
          <select
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value as any)}
            className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-500 font-medium"
          >
            <option value="ALL">جميع المناديب ({report?.items?.length || 0})</option>
            <option value="WITH_ORDERS">حققوا طلبات فقط (&gt; 0)</option>
            <option value="ZERO_ORDERS">بلا أي طلبات (0)</option>
            <option value="HAS_MISSING">لديهم أيام مفقودة</option>
          </select>

          {/* Sort Field */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-[var(--muted)]" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-2.5 py-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-500 font-medium"
            >
              <option value="orders_desc">الأعلى طلباً أولاً</option>
              <option value="orders_asc">الأقل طلباً أولاً</option>
              <option value="days_desc">أكثر أيام عمل</option>
              <option value="avg_desc">أعلى معدل يومي</option>
              <option value="name">ترتيب أبجدي (الاسم)</option>
            </select>
          </div>
        </div>

        {/* Counter - Single Page Display */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[var(--muted)]">
          <Badge tone="purple" className="text-[11px] font-mono">
            صفحة واحدة موحدة
          </Badge>
          <span className="font-mono font-bold text-[var(--foreground)]">
            عرض جميع المناديب ({filteredRiders.length} مندوب)
          </span>
        </div>
      </div>

      {/* ----------------- THE MATRIX TABLE ----------------- */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs">
        <div className="overflow-x-auto max-h-[720px]">
          <table className="w-full text-right text-xs border-collapse">
            {/* Header */}
            <thead className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)] shadow-xs">
              <tr>
                {/* 1. Index */}
                <th className="px-3 py-3 text-center w-10 sticky right-0 bg-[var(--table-header-bg)] z-30">#</th>

                {/* 2. Rider Info */}
                <th className="px-3 py-3 min-w-[200px] sticky right-10 bg-[var(--table-header-bg)] z-30">
                  المندوب
                </th>

                {/* 3. Account Badges */}
                <th className="px-3 py-3 min-w-[120px] text-center">الحسابات</th>

                {/* 4. Total Orders (Highlighted) */}
                <th className="px-3 py-3 text-center min-w-[95px] bg-purple-100/70 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-black">
                  المجموع
                </th>

                {/* 5. Days with Data */}
                <th className="px-3 py-3 text-center min-w-[80px]" title="أيام العمل التي احتوت على بيانات مسجلة">
                  أيام العمل
                </th>

                {/* 6. Zero-Order Days */}
                <th className="px-2 py-3 text-center min-w-[65px]" title="أيام العمل التي سجلت صفر طلبات">
                  أيام الصفر
                </th>

                {/* 7. Missing Days */}
                <th className="px-2 py-3 text-center min-w-[65px]" title="أيام لم يرد لها سجل في الشيت المعتمد">
                  أيام النقص
                </th>

                {/* 8. Average Orders */}
                <th className="px-3 py-3 text-center min-w-[85px]" title="متوسط الطلبات لكل يوم عمل به بيانات">
                  معدل اليوم
                </th>

                {/* 9. Max Orders */}
                <th className="px-2 py-3 text-center min-w-[70px]" title="أعلى عدد طلبات في يوم واحد">
                  أعلى يوم
                </th>

                {/* 10. Actions button */}
                <th className="px-2 py-3 text-center w-16">عرض</th>

                {/* 11. DAY COLUMNS (Days as Columns) */}
                {dateColumns.map((col) => (
                  <th
                    key={col.dateStr}
                    className="px-2 py-2 text-center min-w-[56px] border-r border-[var(--border)]/40 bg-[var(--table-header-bg)]"
                    title={`${col.dateStr} (${col.dayNameAr})`}
                  >
                    <div className="font-mono text-xs font-black text-[var(--foreground)]">
                      يوم {col.dayNumber}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] font-normal whitespace-nowrap">
                      {col.dayNameAr}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-[var(--border)]">
              {loading && !report ? (
                <tr>
                  <td
                    colSpan={10 + dateColumns.length}
                    className="py-16 text-center text-sm text-[var(--muted)]"
                  >
                    <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-purple-600" />
                    جارٍ تحميل مصفوفة أداء المناديب بالفترة من {startDate} إلى {endDate}...
                  </td>
                </tr>
              ) : filteredRiders.length === 0 ? (
                <tr>
                  <td
                    colSpan={10 + dateColumns.length}
                    className="py-16 text-center text-sm text-[var(--muted)]"
                  >
                    {report ? (
                      <div className="space-y-1">
                        <Users className="mx-auto h-8 w-8 text-gray-400 opacity-60" />
                        <p className="font-bold text-[var(--foreground)]">لا توجد بيانات أداء في الفترة المحددة</p>
                        <p className="text-xs text-[var(--muted)]">
                          لم يتم العثور على مناديب لديهم شيتات أو تكليفات في هذه الفترة، أو أن محددات البحث لم تطابق أي سجل.
                        </p>
                      </div>
                    ) : (
                      "اضغط على زر تطبيق الفترة لتحميل المصفوفة."
                    )}
                  </td>
                </tr>
              ) : (
                filteredRiders.map((rider, rIdx) => {
                  const isExpanded = expandedRiders.has(rider.riderProfileId);
                  const hasMultiAccounts = rider.accounts.length > 1;

                  return (
                    <Fragment key={rider.riderProfileId || rIdx}>
                      {/* Main Rider Row */}
                      <tr
                        className={`transition-colors hover:bg-[var(--table-row-hover)] ${
                          isExpanded ? "bg-purple-50/40 dark:bg-purple-950/20" : ""
                        }`}
                      >
                        {/* 1. Index */}
                        <td className="px-3 py-2.5 text-center font-mono text-[var(--muted)] font-semibold sticky right-0 bg-[var(--card-bg)] z-10">
                          {rIdx + 1}
                        </td>

                        {/* 2. Rider Name & Details */}
                        <td className="px-3 py-2.5 font-bold text-[var(--foreground)] sticky right-10 bg-[var(--card-bg)] z-10">
                          <div className="flex items-center gap-2">
                            {/* Accordion Expand/Collapse Button */}
                            <button
                              type="button"
                              onClick={() => toggleRiderExpand(rider.riderProfileId)}
                              className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-purple-600 transition-colors"
                              title={isExpanded ? "طي تفاصيل الحسابات" : "عرض تفاصيل الحسابات المستخدمة"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-purple-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <span
                                className="block truncate max-w-[170px] text-xs font-bold text-[var(--foreground)]"
                                title={rider.riderName}
                              >
                                {rider.riderName || "مندوب غير مسمى"}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-[var(--muted)] font-mono">
                                <span>هوية: {rider.riderIqamaNo || "-"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Account Badges */}
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {rider.accounts.map((acc, aIdx) => (
                              <span
                                key={acc.accountId || aIdx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-[var(--subtle-bg)] text-[var(--foreground)] border border-[var(--border)]"
                                dir="ltr"
                                title={`معرف الحساب الداخلي: ${acc.accountId}`}
                              >
                                <CreditCard className="h-2.5 w-2.5 text-purple-600" />
                                {acc.externalAccountId || acc.accountId.slice(0, 6)}
                              </span>
                            ))}
                            {hasMultiAccounts && (
                              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded">
                                {rider.accounts.length} حسابات
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Total Orders (Prominent) */}
                        <td className="px-3 py-2.5 text-center font-mono font-black text-sm bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                          {rider.selectedSummary.orders.toLocaleString()}
                        </td>

                        {/* 5. Days with Data */}
                        <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {rider.selectedSummary.daysWithData}
                          <span className="text-[10px] text-[var(--muted)] font-normal mr-0.5">
                            /{rider.selectedSummary.periodDays}
                          </span>
                        </td>

                        {/* 6. Zero Order Days */}
                        <td className="px-2 py-2.5 text-center font-mono text-xs">
                          {rider.selectedSummary.zeroOrderDays > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                              {rider.selectedSummary.zeroOrderDays}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">0</span>
                          )}
                        </td>

                        {/* 7. Missing Days */}
                        <td className="px-2 py-2.5 text-center font-mono text-xs text-[var(--muted)]">
                          {rider.selectedSummary.missingDays > 0 ? (
                            <span className="text-gray-500 font-semibold">
                              {rider.selectedSummary.missingDays}
                            </span>
                          ) : (
                            "0"
                          )}
                        </td>

                        {/* 8. Average Orders */}
                        <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                          {rider.selectedSummary.averageOrdersPerDayWithData !== null
                            ? rider.selectedSummary.averageOrdersPerDayWithData.toFixed(1)
                            : "-"}
                        </td>

                        {/* 9. Max Day */}
                        <td className="px-2 py-2.5 text-center font-mono text-xs text-[var(--foreground)]">
                          {rider.selectedSummary.maxOrdersPerDay !== null
                            ? rider.selectedSummary.maxOrdersPerDay
                            : "-"}
                        </td>

                        {/* 10. Actions: View Modal */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setDetailRider(rider)}
                            className="inline-flex items-center justify-center rounded-lg p-1 text-[var(--muted)] hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/50 transition-colors"
                            title="عرض تفاصيل الأداء والحسابات"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>

                        {/* 11. DAY COLUMNS: RIDER'S TOTAL ORDERS FOR EACH DAY */}
                        {dateColumns.map((col) => {
                          const dayObj = rider.daily.find((d) => d.date === col.dateStr);
                          const orders = dayObj ? dayObj.orders : null;

                          return (
                            <td
                              key={col.dateStr}
                              className="px-2 py-2 text-center font-mono border-r border-[var(--border)]/40 text-xs"
                            >
                              {orders === null ? (
                                <span className="text-[var(--muted)] opacity-50 select-none font-bold">—</span>
                              ) : orders === 0 ? (
                                <span
                                  className="inline-block min-w-[24px] rounded px-1 text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300"
                                  title={`${col.dateStr}: صفر طلبات`}
                                >
                                  0
                                </span>
                              ) : (
                                <span
                                  className="inline-block min-w-[24px] rounded px-1.5 py-0.5 text-xs font-black text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 shadow-2xs"
                                  title={`${col.dateStr}: ${orders} طلبات`}
                                >
                                  {orders}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expanded Sub-rows: Individual Account Breakdowns */}
                      {isExpanded &&
                        rider.accounts.map((acc, aIdx) => (
                          <tr
                            key={acc.accountId || aIdx}
                            className="bg-purple-50/20 dark:bg-purple-950/10 text-[11px] border-b border-purple-100 dark:border-purple-900/30"
                          >
                            {/* Empty Index */}
                            <td className="px-3 py-2 text-center font-mono text-[var(--muted)] sticky right-0 bg-purple-50/20 dark:bg-purple-950/10 z-10">
                              ↳
                            </td>

                            {/* Account Label */}
                            <td className="px-3 py-2 font-semibold text-purple-900 dark:text-purple-200 sticky right-10 bg-purple-50/20 dark:bg-purple-950/10 z-10">
                              <div className="flex items-center gap-1.5 pr-6">
                                <CreditCard className="h-3 w-3 text-purple-600" />
                                <span>حساب #{acc.externalAccountId || acc.accountId.slice(0, 8)}</span>
                              </div>
                            </td>

                            {/* Account ID */}
                            <td className="px-3 py-2 text-center font-mono text-[10px] text-[var(--muted)]" dir="ltr">
                              {acc.externalAccountId}
                            </td>

                            {/* Account Total Orders */}
                            <td className="px-3 py-2 text-center font-mono font-bold text-xs text-purple-700 dark:text-purple-300">
                              {acc.summary.orders}
                            </td>

                            {/* Account Days With Data */}
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-[var(--foreground)]">
                              {acc.summary.daysWithData}
                            </td>

                            {/* Account Zero Days */}
                            <td className="px-2 py-2 text-center font-mono text-[11px] text-[var(--muted)]">
                              {acc.summary.zeroOrderDays}
                            </td>

                            {/* Account Missing Days */}
                            <td className="px-2 py-2 text-center font-mono text-[11px] text-[var(--muted)]">
                              {acc.summary.missingDays}
                            </td>

                            {/* Account Average */}
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-[var(--muted)]">
                              {acc.summary.averageOrdersPerDayWithData !== null
                                ? acc.summary.averageOrdersPerDayWithData.toFixed(1)
                                : "-"}
                            </td>

                            {/* Account Max Day */}
                            <td className="px-2 py-2 text-center font-mono text-[11px] text-[var(--muted)]">
                              {acc.summary.maxOrdersPerDay !== null ? acc.summary.maxOrdersPerDay : "-"}
                            </td>

                            {/* Empty action */}
                            <td className="px-2 py-2 text-center"></td>

                            {/* DAY COLUMNS: ACCOUNT'S INDIVIDUAL ORDERS */}
                            {dateColumns.map((col) => {
                              const accDay = acc.daily.find((d) => d.date === col.dateStr);
                              const accOrders = accDay ? accDay.orders : null;

                              return (
                                <td
                                  key={col.dateStr}
                                  className="px-2 py-1 text-center font-mono border-r border-[var(--border)]/30 text-[10px]"
                                >
                                  {accOrders === null ? (
                                    <span className="text-[var(--muted)] opacity-30">—</span>
                                  ) : accOrders === 0 ? (
                                    <span className="text-amber-600/80 font-bold">0</span>
                                  ) : (
                                    <span className="text-purple-600 dark:text-purple-400 font-bold">
                                      {accOrders}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: All Records Summary */}
        {report && report.items.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--border)] p-3.5 text-xs text-[var(--muted)] bg-[var(--subtle-bg)]/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                تم جلب وعرض كافة المناديب بالكامل في صفحة واحدة بدون تجزئة (
                <strong className="text-[var(--foreground)] font-mono">{filteredRiders.length}</strong> مندوب
                {searchQuery ? ` مطابق للبحث من أصل ${report.totalCount}` : ""}).
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>إجمالي الطلبات: <strong className="text-purple-700 dark:text-purple-300">{kpis.totalOrders.toLocaleString()}</strong></span>
              <span>•</span>
              <span>أيام العمل: <strong className="text-emerald-700 dark:text-emerald-400">{kpis.totalDaysWithData.toLocaleString()}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- RIDER DETAIL MODAL ----------------- */}
      {detailRider && (
        <Modal
          isOpen={Boolean(detailRider)}
          onClose={() => setDetailRider(null)}
          title={`تفاصيل أداء المندوب: ${detailRider.riderName || "غير محدد"}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6 text-xs text-[var(--foreground)]" dir="rtl">
            {/* Identity Card */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--subtle-bg)] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--foreground)]">
                    {detailRider.riderName}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-0.5">
                    <span className="font-mono">رقم الإقامة: {detailRider.riderIqamaNo || "-"}</span>
                    <span className="font-mono text-[10px]" dir="ltr">
                      UUID: {detailRider.riderProfileId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge tone="purple">{detailRider.accounts.length} حسابات مستخدمة</Badge>
              </div>
            </div>

            {/* Performance Summary Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 dark:border-purple-900 dark:bg-purple-950/40">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
                  إجمالي الطلبات
                </span>
                <div className="mt-1 font-mono text-xl font-black text-purple-800 dark:text-purple-200">
                  {detailRider.selectedSummary.orders}
                </div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400">
                  في الفترة ({startDate} → {endDate})
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  أيام العمل بالبيانات
                </span>
                <div className="mt-1 font-mono text-xl font-black text-emerald-800 dark:text-emerald-200">
                  {detailRider.selectedSummary.daysWithData}{" "}
                  <span className="text-xs font-normal text-emerald-600">
                    / {detailRider.selectedSummary.periodDays}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  حققت طلبات: {detailRider.selectedSummary.daysWithOrders} يوم
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                  معدل الطلبات/يوم
                </span>
                <div className="mt-1 font-mono text-xl font-black text-blue-800 dark:text-blue-200">
                  {detailRider.selectedSummary.averageOrdersPerDayWithData ?? "-"}
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400">
                  أعلى يوم: {detailRider.selectedSummary.maxOrdersPerDay ?? "-"} طلب
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  أيام الصفر والنقص
                </span>
                <div className="mt-1 font-mono text-xl font-black text-amber-800 dark:text-amber-200">
                  {detailRider.selectedSummary.zeroOrderDays}{" "}
                  <span className="text-xs font-normal text-gray-500">
                    صفر | {detailRider.selectedSummary.missingDays} نقص
                  </span>
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                  أيام بدون إنتاجية أو مفقودة
                </div>
              </div>
            </div>

            {/* Account Allocation Breakdown */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-purple-600" />
                تفصيل الحسابات المستخدمة في الفترة:
              </h5>
              <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
                {detailRider.accounts.map((acc, aIdx) => (
                  <div
                    key={acc.accountId || aIdx}
                    className="p-3 bg-[var(--card-bg)] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                        حساب #{acc.externalAccountId || acc.accountId}
                      </span>
                      <div className="text-[10px] text-[var(--muted)] font-mono" dir="ltr">
                        UUID: {acc.accountId}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-[var(--muted)] block">الطلبات</span>
                        <strong className="text-purple-700 dark:text-purple-300 text-sm">
                          {acc.summary.orders}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--muted)] block">أيام العمل</span>
                        <strong>{acc.summary.daysWithData}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--muted)] block">المعدل اليومي</span>
                        <strong>{acc.summary.averageOrdersPerDayWithData ?? "-"}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--muted)] block">أعلى يوم</span>
                        <strong>{acc.summary.maxOrdersPerDay ?? "-"}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Daily Table for this Rider */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs text-[var(--foreground)] flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                جدول الأيام الكامل للمندوب:
              </h5>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] max-h-64">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border)] font-bold text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2">التاريخ</th>
                      <th className="px-3 py-2">اليوم</th>
                      <th className="px-3 py-2 text-center">إجمالي الطلبات</th>
                      <th className="px-3 py-2 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-mono">
                    {detailRider.daily.map((d) => {
                      const dt = new Date(d.date + "T00:00:00");
                      const dayName = ARABIC_DAYS[dt.getDay()] || "";

                      return (
                        <tr key={d.date} className="hover:bg-[var(--table-row-hover)]">
                          <td className="px-3 py-2 font-bold">{d.date}</td>
                          <td className="px-3 py-2 font-normal text-[var(--muted)]">{dayName}</td>
                          <td className="px-3 py-2 text-center font-bold">
                            {d.orders === null ? (
                              <span className="text-[var(--muted)]">—</span>
                            ) : d.orders === 0 ? (
                              <span className="text-amber-600">0</span>
                            ) : (
                              <span className="text-purple-700 dark:text-purple-300">{d.orders}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {d.orders === null ? (
                              <Badge tone="gray">لا توجد بيانات</Badge>
                            ) : d.orders === 0 ? (
                              <Badge tone="orange">يوم بلا طلبات (0)</Badge>
                            ) : (
                              <Badge tone="purple">حققت طلبات</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setDetailRider(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
