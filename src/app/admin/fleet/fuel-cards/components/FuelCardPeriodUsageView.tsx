"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  getFuelCardPeriodUsage,
  getAllFuelCardPeriodUsage,
  FuelCardPeriodUsage,
  FuelCardPeriodUsagePage,
  FuelCardPeriodRider,
  FuelProvider,
  fuelProviderLabels,
  getRiyadhTodayDateString,
} from "@/lib/fleet/fuel-cards-api";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Droplet,
  Coins,
  FileSpreadsheet,
  CreditCard,
  CalendarRange,
  Users,
  Calendar,
  AlertCircle,
  Info,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";

function isInsideMonth(fromDateStr: string, toDateStr: string): boolean {
  if (!fromDateStr || !toDateStr) return false;
  const fromParts = fromDateStr.split("-");
  if (fromParts.length === 3 && fromParts[2] !== "01") {
    return true;
  }
  const toParts = toDateStr.split("-");
  if (toParts.length === 3) {
    const y = parseInt(toParts[0], 10);
    const m = parseInt(toParts[1], 10);
    const d = parseInt(toParts[2], 10);
    const lastDayOfMonth = new Date(y, m, 0).getDate();
    if (d !== lastDayOfMonth) {
      return true;
    }
  }
  return false;
}

interface FuelCardPeriodUsageViewProps {
  key?: React.Key;
  onOpenDetail?: (cardId: string) => void;
}

export function FuelCardPeriodUsageView({ onOpenDetail }: FuelCardPeriodUsageViewProps) {
  // Default dates: 1st of previous month to today
  const defaultDates = useMemo(() => {
    const today = getRiyadhTodayDateString();
    const parts = today.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const from = `${prevY}-${String(prevM).padStart(2, "0")}-01`;
    return { from, to: today };
  }, []);

  const [from, setFrom] = useState(defaultDates.from);
  const [to, setTo] = useState(defaultDates.to);
  const [provider, setProvider] = useState<FuelProvider | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [data, setData] = useState<FuelCardPeriodUsagePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Date validation
  const dateError = useMemo(() => {
    if (!from || !to) return "يرجى تحديد تاريخ البداية وتاريخ النهاية.";
    if (from > to) return "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية.";
    return null;
  }, [from, to]);

  const fetchData = useCallback(async () => {
    if (!from || !to || from > to) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getFuelCardPeriodUsage({
        from,
        to,
        provider: provider || undefined,
        search: search.trim() || undefined,
        page,
        pageSize,
      });
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch period usage:", err);
      const msg =
        err?.message?.includes("invalid_report_period")
          ? "فترة التقرير المحددة غير صالحة. تأكد من صحة التواريخ وأن النطاق لا يتجاوز 36 شهراً."
          : err?.message?.includes("invalid_provider")
          ? "مزود الخدمة غير صالح."
          : err?.message?.includes("forbidden")
          ? "لا تملك الصلاحية الكافية لعرض استهلاك الوقود."
          : "تعذر تحميل بيانات استهلاك الفترة. يرجى المحاولة مرة أخرى.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [from, to, provider, search, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const totalLiters = data?.totalLiters ?? 0;
  const totalAmount = data?.totalAmount ?? 0;
  const usageMonthFrom = data?.usageMonthFrom || "";
  const usageMonthTo = data?.usageMonthTo || "";

  const isPartialRange = useMemo(() => isInsideMonth(from, to), [from, to]);

  const toggleExpand = (cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(items.map((i) => i.fuelCardId));
    setExpandedCards(allIds);
  };

  const collapseAll = () => {
    setExpandedCards(new Set());
  };

  // Quick date presets
  const applyPreset = (preset: "this-month" | "last-month" | "last-30" | "last-90" | "this-year") => {
    const today = getRiyadhTodayDateString();
    const parts = today.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    let newFrom = from;
    let newTo = today;

    if (preset === "this-month") {
      newFrom = `${y}-${String(m).padStart(2, "0")}-01`;
      newTo = today;
    } else if (preset === "last-month") {
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const lastDay = new Date(prevY, prevM, 0).getDate();
      newFrom = `${prevY}-${String(prevM).padStart(2, "0")}-01`;
      newTo = `${prevY}-${String(prevM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (preset === "last-30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      newFrom = d.toISOString().split("T")[0];
      newTo = today;
    } else if (preset === "last-90") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      newFrom = d.toISOString().split("T")[0];
      newTo = today;
    } else if (preset === "this-year") {
      newFrom = `${y}-01-01`;
      newTo = today;
    }

    setFrom(newFrom);
    setTo(newTo);
    setPage(1);
  };

  const handleExportExcel = async () => {
    if (totalCount === 0 || !from || !to) return;
    setExporting(true);
    try {
      const allItems = await getAllFuelCardPeriodUsage({
        from,
        to,
        provider: provider || undefined,
        search: search.trim() || undefined,
      });

      if (allItems.length === 0) return;

      // Flatten items to display card + rider records
      const exportRows: any[] = [];
      allItems.forEach((card, cardIdx) => {
        if (!card.riders || card.riders.length === 0) {
          exportRows.push({
            cardIdx: cardIdx + 1,
            provider: card.providerNameAr || fuelProviderLabels[card.provider] || card.provider,
            cardNumber: card.cardNumber,
            plateNumber: card.plateNumberText || "—",
            cardTotalLiters: card.totalLiters,
            cardTotalAmount: card.totalAmount,
            riderName: "— (بدون مناديب)",
            riderLiters: 0,
            riderAmount: 0,
            assignmentFrom: "—",
            assignmentTo: "—",
            effectiveFrom: "—",
            effectiveTo: "—",
            usageMonths: "—",
          });
        } else {
          card.riders.forEach((rider) => {
            const assignments = rider.assignments || [];
            const assignmentFrom =
              assignments.length > 0
                ? assignments.map((a) => a.from).join(" ، ")
                : "—";
            const assignmentTo =
              assignments.length > 0
                ? assignments.map((a) => a.to).join(" ، ")
                : "—";
            const effectiveFrom =
              assignments.length > 0
                ? assignments.map((a) => a.effectiveFrom).join(" ، ")
                : "—";
            const effectiveTo =
              assignments.length > 0
                ? assignments.map((a) => a.effectiveTo || "مستمر").join(" ، ")
                : "—";

            const monthsText = (rider.usageMonths || [])
              .map((m) => m.reportMonth)
              .join(" ، ");

            exportRows.push({
              cardIdx: cardIdx + 1,
              provider: card.providerNameAr || fuelProviderLabels[card.provider] || card.provider,
              cardNumber: card.cardNumber,
              plateNumber: card.plateNumberText || "—",
              cardTotalLiters: card.totalLiters,
              cardTotalAmount: card.totalAmount,
              riderName: rider.riderNameAr || rider.riderNameEn || rider.riderProfileId,
              riderLiters: rider.totalLiters,
              riderAmount: rider.totalAmount,
              assignmentFrom,
              assignmentTo,
              effectiveFrom,
              effectiveTo,
              usageMonths: monthsText || "—",
            });
          });
        }
      });

      await exportToExcel({
        filename: `fuel-period-usage-${from}-to-${to}`,
        sheetName: `استهلاك الفترة`.slice(0, 31),
        data: exportRows,
        columns: [
          { header: "#", accessor: (row) => row.cardIdx, width: 6 },
          { header: "المزود", accessor: (row) => row.provider, width: 16 },
          { header: "رقم البطاقة", accessor: (row) => row.cardNumber, width: 22, isText: true },
          { header: "رقم اللوحة", accessor: (row) => row.plateNumber, width: 16, isText: true },
          { header: "إجمالي لترات البطاقة", accessor: (row) => row.cardTotalLiters, width: 20 },
          { header: "إجمالي مبلغ البطاقة (ر.س)", accessor: (row) => row.cardTotalAmount, width: 22 },
          { header: "اسم المندوب", accessor: (row) => row.riderName, width: 24 },
          { header: "لترات المندوب", accessor: (row) => row.riderLiters, width: 16 },
          { header: "مبلغ المندوب (ر.س)", accessor: (row) => row.riderAmount, width: 18 },
          { header: "بداية الإسناد في الفترة", accessor: (row) => row.assignmentFrom, width: 20, isText: true },
          { header: "نهاية الإسناد في الفترة", accessor: (row) => row.assignmentTo, width: 20, isText: true },
          { header: "تاريخ بداية الإسناد الأصلي", accessor: (row) => row.effectiveFrom, width: 22, isText: true },
          { header: "تاريخ نهاية الإسناد الأصلي", accessor: (row) => row.effectiveTo, width: 22, isText: true },
          { header: "أشهر الاستهلاك المسجلة", accessor: (row) => row.usageMonths, width: 22, isText: true },
        ],
      });
    } catch (err) {
      console.error("Export period usage error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Date Validation Alert */}
      {dateError && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <span className="text-xs font-bold">{dateError}</span>
        </div>
      )}

      {/* API Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <span className="text-xs font-bold">{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Liters */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>إجمالي اللترات المستهلكة (للفترة كاملاً)</span>
            <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Droplet size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {totalLiters.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}{" "}
            <span className="text-xs font-normal">لتر</span>
          </p>
          {usageMonthFrom && usageMonthTo && (
            <p className="mt-1 text-[11px] text-[var(--muted)] flex items-center gap-1 font-mono">
              <Calendar size={12} />
              الأشهر: {usageMonthFrom} إلى {usageMonthTo}
            </p>
          )}
        </div>

        {/* Total Amount */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>إجمالي المبلغ الشامل للضريبة (للفترة كاملاً)</span>
            <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Coins size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalAmount.toLocaleString("ar-SA", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-xs font-normal">ر.س</span>
          </p>
          {isPartialRange && (
            <p className="mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              إجمالي شهري كامل للأشهر المشمولة
            </p>
          )}
        </div>

        {/* Cards Count */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>عدد بطاقات الوقود المطابقة</span>
            <div className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {totalCount}{" "}
            <span className="text-xs font-normal text-[var(--muted)]">بطاقة</span>
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            الصفحة {page} من {totalPages}
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap pb-3 border-b border-[var(--border)] text-xs">
          <span className="text-[11px] font-bold text-[var(--muted)] ml-2 flex items-center gap-1">
            <SlidersHorizontal size={13} />
            فترات سريعة:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("this-month")}
            className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--foreground)] transition-colors"
          >
            الشهر الحالي
          </button>
          <button
            type="button"
            onClick={() => applyPreset("last-month")}
            className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--foreground)] transition-colors"
          >
            الشهر الماضي
          </button>
          <button
            type="button"
            onClick={() => applyPreset("last-30")}
            className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--foreground)] transition-colors"
          >
            آخر 30 يوم
          </button>
          <button
            type="button"
            onClick={() => applyPreset("last-90")}
            className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--foreground)] transition-colors"
          >
            آخر 3 أشهر
          </button>
          <button
            type="button"
            onClick={() => applyPreset("this-year")}
            className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--foreground)] transition-colors"
          >
            هذا العام
          </button>
        </div>

        {/* Inputs row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
            {/* From Date */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                من تاريخ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                required
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                إلى تاريخ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                required
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                بحث في البطاقات
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="رقم البطاقة أو اللوحة..."
                  className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                />
              </div>
            </div>

            {/* Provider Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                مزود الخدمة
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value as FuelProvider | "");
                  setPage(1);
                }}
                className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
              >
                <option value="">جميع المزودين...</option>
                <option value="PetroApp">{fuelProviderLabels.PetroApp}</option>
                <option value="SayaraApp">{fuelProviderLabels.SayaraApp}</option>
              </select>
            </div>

            {/* Page Size Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                سجلات بالصفحة
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
              >
                <option value={25}>25 بطاقة</option>
                <option value={50}>50 بطاقة (افتراضي)</option>
                <option value={100}>100 بطاقة (الحد الأقصى)</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-[#1167c9]" : ""} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading || totalCount === 0}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              {exporting ? "جاري التصدير..." : "تصدير إكسل"}
            </button>
          </div>
        </div>

        {/* Accordion Expand/Collapse control bar */}
        {items.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="hover:text-[var(--foreground)] font-bold transition-colors underline"
              >
                توسيع كافة البطاقات
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-[var(--foreground)] font-bold transition-colors underline"
              >
                طي كافة البطاقات
              </button>
            </div>
            <span>
              عرض {items.length} من أصل {totalCount} بطاقة
            </span>
          </div>
        )}
      </div>

      {/* Main Table / Grid View */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] uppercase">
              <tr>
                <th className="w-10 px-3 py-3.5 text-center"></th>
                <th className="px-4 py-3.5 text-start">المزود</th>
                <th className="px-4 py-3.5 text-start">رقم البطاقة</th>
                <th className="px-4 py-3.5 text-start">رقم اللوحة</th>
                <th className="px-4 py-3.5 text-center">المناديب المسندة</th>
                <th className="px-4 py-3.5 text-end">اللترات المستهلكة</th>
                <th className="px-4 py-3.5 text-end">الإجمالي شامل الضريبة</th>
                <th className="px-4 py-3.5 text-center">تفاصيل البطاقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[var(--muted)]">
                    <RefreshCw size={26} className="mx-auto animate-spin mb-2.5 text-[#1167c9]" />
                    <p className="font-bold">جاري تحميل استهلاك بطاقات الوقود للفترة...</p>
                    <p className="text-[11px] text-[var(--muted)] mt-1">
                      نطاق التواريخ: {from} إلى {to}
                    </p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[var(--muted)]">
                    <CreditCard size={32} className="mx-auto mb-2 text-slate-400 opacity-60" />
                    <p className="font-bold text-sm text-[var(--foreground)]">لا توجد بيانات استهلاك للفترة المحددة</p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      لم يتم العثور على بطاقات وقود بها سجلات استهلاك شهرية في الأشهر التي يغطيها النطاق المحدد.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((card) => {
                  const isExpanded = expandedCards.has(card.fuelCardId);
                  const ridersCount = card.riders?.length || 0;

                  return (
                    <React.Fragment key={card.fuelCardId}>
                      {/* Main Card Row */}
                      <tr
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                          isExpanded ? "bg-blue-50/20 dark:bg-blue-950/10" : ""
                        }`}
                        onClick={() => toggleExpand(card.fuelCardId)}
                      >
                        {/* Expand / Collapse toggle */}
                        <td className="px-3 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(card.fuelCardId);
                            }}
                            className="size-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-[var(--muted)] transition-colors"
                            title={isExpanded ? "طي السجل" : "توسيع وعرض المناديب"}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-3.5">
                          <Badge tone={card.provider === "PetroApp" ? "blue" : "green"}>
                            {card.providerNameAr || fuelProviderLabels[card.provider] || card.provider}
                          </Badge>
                        </td>

                        {/* Card Number */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span dir="auto" className="font-mono font-black text-sm text-[var(--foreground)]">
                              {card.cardNumber}
                            </span>
                            {onOpenDetail && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDetail(card.fuelCardId);
                                }}
                                className="text-[var(--muted)] hover:text-[#1167c9] p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                title="عرض بطاقة الوقود"
                              >
                                <ExternalLink size={12} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Plate Number */}
                        <td className="px-4 py-3.5">
                          {card.plateNumberText ? (
                            <span dir="auto" className="font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {card.plateNumberText}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>

                        {/* Riders Count */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              ridersCount > 0
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            <Users size={12} />
                            {ridersCount} {ridersCount === 1 ? "مندوب" : "مناديب"}
                          </span>
                        </td>

                        {/* Total Liters */}
                        <td className="px-4 py-3.5 text-end font-bold text-blue-700 dark:text-blue-400 font-mono text-sm">
                          {card.totalLiters.toLocaleString("ar-SA", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="text-[10px] font-normal">لتر</span>
                        </td>

                        {/* Total Amount */}
                        <td className="px-4 py-3.5 text-end font-black text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                          {card.totalAmount.toLocaleString("ar-SA", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="text-[10px] font-normal">ر.س</span>
                        </td>

                        {/* Detail Modal Action */}
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          {onOpenDetail ? (
                            <button
                              type="button"
                              onClick={() => onOpenDetail(card.fuelCardId)}
                              className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <CreditCard size={13} />
                              عرض البطاقة
                            </button>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Section: Riders & Assignments & Monthly breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 dark:bg-slate-900/40">
                          <td colSpan={8} className="p-4 sm:p-5">
                            <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-4">
                              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                                <div className="flex items-center gap-2">
                                  <Users size={16} className="text-[#1167c9]" />
                                  <h4 className="text-xs font-black text-[var(--foreground)]">
                                    تفاصيل استهلاك المناديب وفترات الإسناد للبطاقة ({card.cardNumber})
                                  </h4>
                                </div>
                                <span className="text-[11px] text-[var(--muted)]">
                                  إجمالي المناديب: {ridersCount}
                                </span>
                              </div>

                              {ridersCount === 0 ? (
                                <div className="p-4 text-center text-xs text-[var(--muted)] bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                  لا يوجد مناديب مسندين لهذه البطاقة في الفترة المحددة، أو أن الاستهلاك قُيد على البطاقة بشكل عام.
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {card.riders.map((rider, rIdx) => {
                                    const riderDisplayName =
                                      rider.riderNameAr ||
                                      rider.riderNameEn ||
                                      rider.employeeId ||
                                      rider.riderProfileId;

                                    return (
                                      <div
                                        key={rider.riderProfileId || rIdx}
                                        className="rounded-xl border border-[var(--border)] bg-slate-50/40 dark:bg-slate-800/30 p-3.5 space-y-3"
                                      >
                                        {/* Rider Header Bar */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-900 text-[#1167c9] dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                                              {rIdx + 1}
                                            </div>
                                            <Link
                                              href={`/admin/employees/${rider.riderProfileId || rider.employeeId}`}
                                              className="text-xs font-black text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1"
                                              target="_blank"
                                              title="فتح الملف التعريفي للمندوب"
                                            >
                                              {riderDisplayName}
                                              <ExternalLink size={12} className="opacity-70" />
                                            </Link>

                                            {rider.employeeId && (
                                              <span className="text-[11px] font-mono text-[var(--muted)] bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                                                الرقم الوظيفي: {rider.employeeId}
                                              </span>
                                            )}

                                            {!rider.riderNameAr && (
                                              <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                                معرف المندوب كبديل
                                              </span>
                                            )}
                                          </div>

                                          {/* Rider Totals */}
                                          <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
                                            <div className="text-end">
                                              <span className="text-[11px] text-[var(--muted)] block">
                                                لترات المندوب
                                              </span>
                                              <span className="font-bold font-mono text-blue-700 dark:text-blue-400">
                                                {rider.totalLiters.toLocaleString("ar-SA", {
                                                  maximumFractionDigits: 2,
                                                })}{" "}
                                                لتر
                                              </span>
                                            </div>
                                            <div className="h-6 w-px bg-[var(--border)]" />
                                            <div className="text-end">
                                              <span className="text-[11px] text-[var(--muted)] block">
                                                تكلفة المندوب
                                              </span>
                                              <span className="font-black font-mono text-emerald-700 dark:text-emerald-400">
                                                {rider.totalAmount.toLocaleString("ar-SA", {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                })}{" "}
                                                ر.س
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Rider Assignments (Clipped & Full) */}
                                        <div>
                                          <div className="text-[11px] font-bold text-[var(--muted)] mb-1.5 flex items-center gap-1.5">
                                            <Calendar size={13} className="text-slate-500" />
                                            فترات الإسناد للمندوب:
                                          </div>

                                          {rider.assignments && rider.assignments.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {rider.assignments.map((assignment, aIdx) => (
                                                <div
                                                  key={assignment.assignmentId || aIdx}
                                                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] space-y-1"
                                                >
                                                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 font-bold">
                                                    <span>الفترة ضمن نطاق التقرير:</span>
                                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900">
                                                      {assignment.from} ➔ {assignment.to}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center justify-between text-[var(--muted)] text-[10px]">
                                                    <span>تاريخ الإسناد الأصلي:</span>
                                                    <span className="font-mono">
                                                      {assignment.effectiveFrom} ➔{" "}
                                                      {assignment.effectiveTo ? (
                                                        assignment.effectiveTo
                                                      ) : (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                          مستمر حالياً
                                                        </span>
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-[11px] text-[var(--muted)] italic p-2 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-dashed border-[var(--border)]">
                                              لا توجد فترات إسناد مسجلة ضمن نطاق هذا التاريخ (سجل استهلاك بدون إسناد مباشر في النطاق).
                                            </p>
                                          )}
                                        </div>

                                        {/* Rider Monthly Cost Breakdown (usageMonths) */}
                                        {rider.usageMonths && rider.usageMonths.length > 0 && (
                                          <div>
                                            <div className="text-[11px] font-bold text-[var(--muted)] mb-1.5 flex items-center gap-1.5">
                                              <Clock size={13} className="text-slate-500" />
                                              تفاصيل الاستهلاك الشهري المسجل للمندوب:
                                            </div>
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-[11px] border border-[var(--border)] rounded-lg overflow-hidden">
                                                <thead className="bg-slate-100/70 dark:bg-slate-800 text-[var(--muted)] font-bold">
                                                  <tr>
                                                    <th className="px-3 py-1.5 text-start">الشهر التقويمي</th>
                                                    <th className="px-3 py-1.5 text-end">اللترات المستهلكة</th>
                                                    <th className="px-3 py-1.5 text-end">المبلغ شامل الضريبة</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--border)] bg-white dark:bg-slate-900/60 font-mono">
                                                  {rider.usageMonths.map((m) => (
                                                    <tr key={m.reportMonth}>
                                                      <td className="px-3 py-1.5 font-bold text-[var(--foreground)]">
                                                        {m.reportMonth}
                                                      </td>
                                                      <td className="px-3 py-1.5 text-end text-blue-600 dark:text-blue-400">
                                                        {m.totalLiters.toLocaleString("ar-SA", {
                                                          maximumFractionDigits: 2,
                                                        })}{" "}
                                                        لتر
                                                      </td>
                                                      <td className="px-3 py-1.5 text-end font-bold text-emerald-600 dark:text-emerald-400">
                                                        {m.totalAmount.toLocaleString("ar-SA", {
                                                          minimumFractionDigits: 2,
                                                          maximumFractionDigits: 2,
                                                        })}{" "}
                                                        ر.س
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination */}
        {data && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] text-xs text-[var(--muted)] font-medium">
            <div>
              عرض {items.length} من إجمالي {totalCount} بطاقة (الصفحة {page} من {totalPages})
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="الصفحة السابقة"
              >
                <ChevronRight size={18} />
              </button>
              <span className="px-2 font-bold text-[var(--foreground)]">{page}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="الصفحة التالية"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
