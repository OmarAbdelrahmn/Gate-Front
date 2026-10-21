// src/components/chefz/ChefzRiderReportView.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, Fragment } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getChefzAllRidersReport,
  getChefzRiderReport,
} from "@/lib/chefz/api";
import type {
  ChefzAllRidersReport,
  ChefzAllRidersItem,
  ChefzRatingCounts,
  ChefzRiderReport,
  ChefzReportHalf,
  ChefzReportDaily,
} from "@/lib/chefz/types";
import type { AccountResponse } from "@/lib/platforms/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { ChefzPerformanceSettingsModal } from "./ChefzPerformanceSettingsModal";
import {
  Users,
  TrendingUp,
  FileSpreadsheet,
  RefreshCw,
  SlidersHorizontal,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  Info,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  Award,
  Filter,
  Check,
  X,
  FileText,
  Sparkles,
  ArrowUpDown,
  CreditCard,
} from "lucide-react";

interface Props {
  accounts?: AccountResponse[];
  riders?: Rider[];
}

type RatingFilterType = "ALL" | "A" | "B" | "C" | "D" | "CHANGE" | "UNRATED";
type AccountFilterType = "ALL" | "SINGLE" | "DUAL";
type SortField = "name" | "orders_desc" | "orders_asc" | "rate_desc" | "rate_asc" | "days_desc";

export function ChefzRiderReportView({ accounts = [], riders = [] }: Props) {
  const { can } = useAuth();
  const canRead = can("chefz.read");

  // Date and period filters
  const today = useMemo(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    };
  }, []);

  const [year, setYear] = useState<number>(today.year);
  const [month, setMonth] = useState<number>(today.month);
  const [half, setHalf] = useState<1 | 2>(today.day <= 15 ? 1 : 2);
  const [halves, setHalves] = useState<number>(1);

  // Bulk all-riders data states
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<ChefzAllRidersReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // In-table search, filters & sort
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilterType>("ALL");
  const [accountFilter, setAccountFilter] = useState<AccountFilterType>("ALL");
  const [sortField, setSortField] = useState<SortField>("name");

  // Accordion expanded row state (tracks expanded rider IDs)
  const [expandedRiderIds, setExpandedRiderIds] = useState<Set<string>>(new Set());

  // Individual rider detailed modal states
  const [detailModalRider, setDetailModalRider] = useState<ChefzAllRidersItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [riderDetailReport, setRiderDetailReport] = useState<ChefzRiderReport | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<"daily" | "accounts" | "halves">("daily");

  // Helper maps for quick lookups
  const accountMap = useMemo(() => {
    const m = new Map<string, AccountResponse>();
    for (const a of accounts) m.set(a.id, a);
    return m;
  }, [accounts]);

  const riderMap = useMemo(() => {
    const m = new Map<string, Rider>();
    for (const r of riders) m.set(r.id, r);
    return m;
  }, [riders]);

  // Load bulk all-riders report
  const loadAllReport = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getChefzAllRidersReport({
        year,
        month,
        half,
        halves,
      });
      setReport(res);
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string; message?: string }; message?: string; status?: number };
      const detailMsg = e?.details?.detail || e?.details?.message || e?.message || "تعذر تحميل تقرير أداء كافة المناديب.";
      
      if (e?.status === 404 || detailMsg.includes("404") || detailMsg.includes("Not Found")) {
        setError(
          "نقطة النهاية الجديدة (GET /api/chefz/reports/riders/all) غير متوفرة بعد على الخادم المستضيف. يتطلب تفعيل هذا التقرير نشر التحديث البرمجي الجديد للخادم."
        );
      } else {
        setError(detailMsg);
      }
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [canRead, year, month, half, halves]);

  // Auto-fetch on component mount or period change
  useEffect(() => {
    loadAllReport();
  }, [loadAllReport]);

  // Load individual rider details for modal
  const openRiderDetailsModal = async (riderItem: ChefzAllRidersItem) => {
    setDetailModalRider(riderItem);
    setLoadingDetail(true);
    setDetailError(null);
    setRiderDetailReport(null);
    setDetailSubTab("daily");

    try {
      const res = await getChefzRiderReport({
        riderId: riderItem.riderProfileId,
        year,
        month,
        half,
        halves,
      });
      setRiderDetailReport(res);
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string; message?: string }; message?: string };
      setDetailError(e?.details?.detail || e?.details?.message || e?.message || "تعذر تحميل السجل اليومي والتاريخي للمندوب.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Toggle accordion expansion for inline accounts/halves preview
  const toggleRowExpansion = (riderProfileId: string) => {
    setExpandedRiderIds((prev) => {
      const next = new Set(prev);
      if (next.has(riderProfileId)) {
        next.delete(riderProfileId);
      } else {
        next.add(riderProfileId);
      }
      return next;
    });
  };

  // Rating badge styler
  const renderRatingBadge = (rating: string | null, size: "sm" | "md" = "sm") => {
    const pad = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
    if (!rating) {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 ${pad}`}
        >
          غير مقيم
        </span>
      );
    }

    switch (rating.toUpperCase()) {
      case "A":
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-sm ${pad}`}
          >
            <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            A
          </span>
        );
      case "B":
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full font-black bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-sm ${pad}`}
          >
            B
          </span>
        );
      case "C":
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-sm ${pad}`}
          >
            C
          </span>
        );
      case "D":
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-sm ${pad}`}
          >
            D
          </span>
        );
      case "CHANGE":
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full font-black bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-sm ${pad}`}
          >
            تحويل (CHANGE)
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 ${pad}`}
          >
            {rating}
          </span>
        );
    }
  };

  // Filter & sort riders
  const filteredRiders = useMemo(() => {
    if (!report || !report.riders) return [];

    return report.riders
      .filter((r) => {
        // Search query filter (rider name, profile ID, or external account IDs)
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchesName = (r.riderName || "").toLowerCase().includes(q);
          const matchesIqama = (r.riderIqamaNo || "").toLowerCase().includes(q);
          const matchesId = (r.riderProfileId || "").toLowerCase().includes(q);
          const matchesAccounts = (r.accounts || []).some(
            (acc) =>
              (acc.externalAccountId || "").toLowerCase().includes(q) ||
              (acc.accountId || "").toLowerCase().includes(q)
          );
          if (!matchesName && !matchesIqama && !matchesId && !matchesAccounts) return false;
        }

        // Rating filter
        if (ratingFilter !== "ALL") {
          const rRating = (r.selectedSummary.rating || "").toUpperCase();
          if (ratingFilter === "UNRATED") {
            if (r.selectedSummary.rating !== null && rRating !== "") return false;
          } else {
            if (rRating !== ratingFilter) return false;
          }
        }

        // Account count filter
        if (accountFilter === "SINGLE" && r.accounts.length !== 1) return false;
        if (accountFilter === "DUAL" && r.accounts.length < 2) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortField) {
          case "orders_desc":
            return (b.selectedSummary.orders || 0) - (a.selectedSummary.orders || 0);
          case "orders_asc":
            return (a.selectedSummary.orders || 0) - (b.selectedSummary.orders || 0);
          case "rate_desc":
            return (b.selectedSummary.acceptanceRate ?? -1) - (a.selectedSummary.acceptanceRate ?? -1);
          case "rate_asc":
            return (a.selectedSummary.acceptanceRate ?? 999) - (b.selectedSummary.acceptanceRate ?? 999);
          case "days_desc":
            return (b.selectedSummary.daysWithData || 0) - (a.selectedSummary.daysWithData || 0);
          case "name":
          default:
            return (a.riderName || "").localeCompare(b.riderName || "", "ar");
        }
      });
  }, [report, searchQuery, ratingFilter, accountFilter, sortField]);

  // Export all riders to Excel
  const handleExportAllRidersExcel = () => {
    if (!report || filteredRiders.length === 0) {
      toast.warning("لا توجد بيانات متاحة للتصدير");
      return;
    }

    const data = filteredRiders.map((r, idx) => ({
      index: idx + 1,
      name: r.riderName || "مندوب مسجل",
      iqamaNo: r.riderIqamaNo ?? "—",
      profileId: r.riderProfileId,
      accountsCount: r.accounts.length,
      accountsList: r.accounts.map((a) => a.externalAccountId || a.accountId).join(", "),
      halvesWithData: `${r.selectedSummary.halvesWithData} من ${report.requestedHalves}`,
      daysWithData: r.selectedSummary.daysWithData,
      orders: r.selectedSummary.orders,
      averageOrdersPerHalf:
        r.selectedSummary.averageOrdersPerHalf !== null
          ? r.selectedSummary.averageOrdersPerHalf.toFixed(1)
          : "—",
      acceptanceRate:
        r.selectedSummary.acceptanceRate !== null
          ? `${r.selectedSummary.acceptanceRate}%`
          : "—",
      rating: r.selectedSummary.rating || "غير مقيم",
      from: report.from,
      to: report.to,
    }));

    exportToExcel({
      filename: `تقرير-أداء-كافة-مناديب-شيفز-${report.from}-إلى-${report.to}`,
      sheetName: "أداء كافة المناديب",
      data,
      columns: [
        { header: "#", accessor: (d) => d.index },
        { header: "اسم المندوب", accessor: (d) => d.name, isText: true },
        { header: "رقم الإقامة", accessor: (d) => d.iqamaNo, isText: true },
        { header: "معرف المندوب", accessor: (d) => d.profileId, isText: true },
        { header: "عدد الحسابات", accessor: (d) => d.accountsCount },
        { header: "أرقام الحسابات المرتبطة", accessor: (d) => d.accountsList, isText: true },
        { header: "فترات البيانات", accessor: (d) => d.halvesWithData, isText: true },
        { header: "أيام العمل المسجلة", accessor: (d) => d.daysWithData },
        { header: "إجمالي الطلبات المقبولة", accessor: (d) => d.orders },
        { header: "متوسط الطلبات لكل نصف", accessor: (d) => d.averageOrdersPerHalf },
        { header: "نسبة القبول (%)", accessor: (d) => d.acceptanceRate, isText: true },
        { header: "التقييم العام للفترة", accessor: (d) => d.rating, isText: true },
        { header: "بداية الفترة", accessor: (d) => d.from, isText: true },
        { header: "نهاية الفترة", accessor: (d) => d.to, isText: true },
      ],
    });
    toast.success("تم استخراج ملف إكسل بنجاح");
  };

  // Export single rider details to Excel
  const handleExportSingleRiderExcel = () => {
    if (!riderDetailReport || !detailModalRider) return;

    const riderName = riderDetailReport.riderName || detailModalRider.riderName;
    const riderIqama = riderDetailReport.riderIqamaNo ?? detailModalRider.riderIqamaNo ?? "—";

    if (detailSubTab === "halves") {
      exportToExcel({
        filename: `تقرير-أداء-فترات-${riderName}-${year}-${month}-H${half}`,
        sheetName: "ملخص الفترات نصف الشهرية",
        data: riderDetailReport.halves,
        columns: [
          { header: "اسم المندوب", accessor: () => riderName, isText: true },
          { header: "رقم الإقامة", accessor: () => riderIqama, isText: true },
          { header: "من تاريخ", accessor: (h) => h.from, isText: true },
          { header: "إلى تاريخ", accessor: (h) => h.to, isText: true },
          { header: "أيام البيانات المسجلة", accessor: (h) => h.daysWithData },
          { header: "عدد الطلبات (المقبولة)", accessor: (h) => h.orders },
          {
            header: "نسبة القبول (%)",
            accessor: (h) => (h.acceptanceRate !== null ? `${h.acceptanceRate}%` : "لا توجد بيانات"),
          },
          { header: "التقييم", accessor: (h) => h.rating || "لا توجد بيانات" },
          { header: "ملاحظات", accessor: (h) => h.message || "—" },
        ],
      });
    } else {
      exportToExcel({
        filename: `تقرير-أداء-يومي-${riderName}-${year}-${month}-H${half}`,
        sheetName: "الأداء اليومي المفصل",
        data: riderDetailReport.daily,
        columns: [
          { header: "التاريخ", accessor: (d) => d.date, isText: true },
          { header: "اسم المندوب", accessor: () => riderName, isText: true },
          { header: "رقم الإقامة", accessor: (d) => d.riderIqamaNo ?? riderIqama, isText: true },
          { header: "الطلبات المقبولة", accessor: (d) => d.orders },
          { header: "إجمالي الطلبات الصالحة (Valid Orders)", accessor: (d) => d.validOffers },
          { header: "الطلبات الفائتة (Missed Orders)", accessor: (d) => d.missedOffers },
          {
            header: "نسبة القبول (%)",
            accessor: (d) => (d.acceptanceRate !== null ? `${d.acceptanceRate}%` : "لا توجد بيانات"),
          },
          { header: "التقييم اليومي", accessor: (d) => d.rating || "لا توجد بيانات" },
        ],
      });
    }
  };

  if (!canRead) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <ShieldAlert className="mx-auto mb-3 text-red-500" size={32} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">لا توجد صلاحية للوصول</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            ليس لديك صلاحية لعرض تقارير شيفز (chefz.read).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              تقرير أداء كافة مناديب شيفز
            </h2>
            <Badge tone="blue">شامل للكل</Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            استعراض وتقييم أداء جميع المناديب والحسابات النشطة في طلب واحد مجمّع للفترة المحددة مع إحصاء فئات التصنيف.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Report Settings Button */}
          <Button
            variant="secondary"
            onClick={() => setIsSettingsOpen(true)}
            className="gap-2 text-xs font-semibold"
          >
            <SlidersHorizontal className="h-4 w-4 text-[var(--brand)]" />
            معايير التصنيف
          </Button>

          {/* Export All Riders to Excel */}
          <Button
            variant="secondary"
            onClick={handleExportAllRidersExcel}
            disabled={!report || filteredRiders.length === 0}
            className="gap-2 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            استخراج إكسل ({filteredRiders.length})
          </Button>

          {/* Fetch / Refresh Report */}
          <Button
            onClick={loadAllReport}
            disabled={loading}
            className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 text-xs font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث التقرير
          </Button>
        </div>
      </div>

      {/* Period Selectors Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Year */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">السنة</label>
            <input
              type="number"
              min="2020"
              max="2035"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || today.year)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
          </div>

          {/* Month */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">الشهر</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  شهر {m}
                </option>
              ))}
            </select>
          </div>

          {/* Ending Half */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              النصف المنتهي المطلوب
            </label>
            <select
              value={half}
              onChange={(e) => setHalf((parseInt(e.target.value) as 1 | 2) || 1)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value={1}>النصف الأول (1 إلى 15)</option>
              <option value={2}>النصف الثاني (16 إلى نهاية الشهر)</option>
            </select>
          </div>

          {/* Halves Count */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              عدد الفترات المتتالية (Halves)
            </label>
            <select
              value={halves}
              onChange={(e) => setHalves(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value={1}>فترة واحدة (1 - نصف شهر)</option>
              <option value={2}>فترتان (2 - شهر كامل)</option>
              <option value={4}>4 فترات (4 - شهران)</option>
              <option value={6}>6 فترات (6 - 3 أشهر)</option>
              <option value={8}>8 فترات (8 - 4 أشهر)</option>
              <option value={12}>12 فترة (12 - 6 أشهر)</option>
              <option value={24}>24 فترة (24 - سنة كاملة)</option>
            </select>
          </div>
        </div>

        {/* Selected Window Info Banner */}
        <div className="flex flex-wrap items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)] gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--brand)] shrink-0" />
            <span>
              النافذة المحددة:{" "}
              <strong className="text-[var(--foreground)] font-mono" dir="ltr">
                {report ? `${report.from} → ${report.to}` : `سنة ${year} / شهر ${month} / نصف ${half}`}
              </strong>
            </span>
            {report && (
              <span className="text-[11px] bg-[var(--subtle-bg)] px-2 py-0.5 rounded-md font-mono">
                {report.requestedHalves} {report.requestedHalves === 1 ? "فترة" : "فترات"}
              </span>
            )}
          </div>

          <span className="text-[11px] text-[var(--muted)]">
            * يجلب التقرير جميع المناديب الذين يملكون تكليفاً فعالاً أو منتهياً متداخلاً مع الفترة، أو أداءً مسجلاً.
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="space-y-1">
              <span className="font-bold block">تعذر استرجاع التقرير</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Counters: Total Riders & Rating Breakdown (Clickable Filters!) */}
      {report && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[var(--brand)]" />
              توزيع تقييمات المناديب في النافذة ({report.totalRiders} مندوب):
            </span>
            {ratingFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setRatingFilter("ALL")}
                className="text-[var(--brand)] hover:underline flex items-center gap-1 text-[11px]"
              >
                <X className="h-3 w-3" />
                إلغاء تصفية الفئة
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* Total Riders */}
            <div
              onClick={() => setRatingFilter("ALL")}
              className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                ratingFilter === "ALL"
                  ? "border-[var(--brand)] bg-[var(--brand)]/10 ring-2 ring-[var(--brand)]/20"
                  : "border-[var(--border)] bg-[var(--card-bg)] hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-medium">
                <span>إجمالي المناديب</span>
                <Users className="h-3.5 w-3.5 text-[var(--brand)]" />
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-[var(--foreground)]">
                {report.totalRiders.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-[var(--muted)]">الكل بالتقرير</div>
            </div>

            {/* A Rating */}
            <div
              onClick={() => setRatingFilter(ratingFilter === "A" ? "ALL" : "A")}
              className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                ratingFilter === "A"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30"
                  : "border-[var(--border)] bg-[var(--card-bg)] hover:border-emerald-300 dark:hover:border-emerald-800"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                <span>فئة A (متميز)</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-1 font-mono text-xl font-black text-emerald-700 dark:text-emerald-400">
                {report.ratingCounts.a.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-500">
                {report.totalRiders > 0
                  ? `${((report.ratingCounts.a / report.totalRiders) * 100).toFixed(0)}% من الكل`
                  : "0%"}
              </div>
            </div>

            {/* B Rating */}
            <div
              onClick={() => setRatingFilter(ratingFilter === "B" ? "ALL" : "B")}
              className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                ratingFilter === "B"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500/30"
                  : "border-[var(--border)] bg-[var(--card-bg)] hover:border-blue-300 dark:hover:border-blue-800"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-800 dark:text-blue-300">
                <span>فئة B (جيد جداً)</span>
                <span className="flex h-2 w-2 rounded-full bg-blue-500" />
              </div>
              <div className="mt-1 font-mono text-xl font-black text-blue-700 dark:text-blue-400">
                {report.ratingCounts.b.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-blue-600 dark:text-blue-500">
                {report.totalRiders > 0
                  ? `${((report.ratingCounts.b / report.totalRiders) * 100).toFixed(0)}% من الكل`
                  : "0%"}
              </div>
            </div>

            {/* C Rating */}
            <div
              onClick={() => setRatingFilter(ratingFilter === "C" ? "ALL" : "C")}
              className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                ratingFilter === "C"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500/30"
                  : "border-[var(--border)] bg-[var(--card-bg)] hover:border-amber-300 dark:hover:border-amber-800"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
                <span>فئة C (متوسط)</span>
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <div className="mt-1 font-mono text-xl font-black text-amber-700 dark:text-amber-400">
                {report.ratingCounts.c.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-500">
                {report.totalRiders > 0
                  ? `${((report.ratingCounts.c / report.totalRiders) * 100).toFixed(0)}% من الكل`
                  : "0%"}
              </div>
            </div>

            {/* D Rating */}
            <div
              onClick={() => setRatingFilter(ratingFilter === "D" ? "ALL" : "D")}
              className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                ratingFilter === "D"
                  ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500/30"
                  : "border-[var(--border)] bg-[var(--card-bg)] hover:border-rose-300 dark:hover:border-rose-800"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-800 dark:text-rose-300">
                <span>فئة D (ضعيف)</span>
                <span className="flex h-2 w-2 rounded-full bg-rose-500" />
              </div>
              <div className="mt-1 font-mono text-xl font-black text-rose-700 dark:text-rose-400">
                {report.ratingCounts.d.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-rose-600 dark:text-rose-500">
                {report.totalRiders > 0
                  ? `${((report.ratingCounts.d / report.totalRiders) * 100).toFixed(0)}% من الكل`
                  : "0%"}
              </div>
            </div>

            {/* CHANGE Rating */}
            <div
              onClick={() => setRatingFilter(ratingFilter === "CHANGE" ? "ALL" : "CHANGE")}
              className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                ratingFilter === "CHANGE"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-500/30"
                  : "border-[var(--border)] bg-[var(--card-bg)] hover:border-purple-300 dark:hover:border-purple-800"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 dark:text-purple-300">
                <span>تحويل CHANGE</span>
                <span className="flex h-2 w-2 rounded-full bg-purple-500" />
              </div>
              <div className="mt-1 font-mono text-xl font-black text-purple-700 dark:text-purple-400">
                {report.ratingCounts.change.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-purple-600 dark:text-purple-500">
                انقطاع/سلسلة أصفار
              </div>
            </div>

            {/* UNRATED */}
            <div
              onClick={() => setRatingFilter(ratingFilter === "UNRATED" ? "ALL" : "UNRATED")}
              className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                ratingFilter === "UNRATED"
                  ? "border-slate-500 bg-slate-100 dark:bg-slate-800/80 ring-2 ring-slate-500/30"
                  : "border-[var(--border)] bg-[var(--card-bg)] hover:border-slate-400 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span>غير مقيم</span>
                <span className="flex h-2 w-2 rounded-full bg-slate-400" />
              </div>
              <div className="mt-1 font-mono text-xl font-black text-slate-700 dark:text-slate-300">
                {report.ratingCounts.unrated.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                بدون بيانات مسجلة
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Roster Section */}
      <div className="space-y-4">
        {/* Table Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="ابحث باسم المندوب أو رقم الحساب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 pr-9 pl-8 text-xs text-[var(--foreground)] placeholder-[var(--muted)] outline-none focus:border-[var(--brand)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-2.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rating Dropdown Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as RatingFilterType)}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-semibold"
            >
              <option value="ALL">كافة التقييمات</option>
              <option value="A">فئة A فقط</option>
              <option value="B">فئة B فقط</option>
              <option value="C">فئة C فقط</option>
              <option value="D">فئة D فقط</option>
              <option value="CHANGE">تحويل (CHANGE) فقط</option>
              <option value="UNRATED">غير المقيمين فقط</option>
            </select>

            {/* Account Count Filter */}
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value as AccountFilterType)}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="ALL">جميع الحسابات</option>
              <option value="SINGLE">حساب واحد فقط</option>
              <option value="DUAL">حسابين للمندوب</option>
            </select>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[var(--muted)]">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-2.5 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-medium"
              >
                <option value="name">ترتيب أبجدي (الاسم)</option>
                <option value="orders_desc">الأعلى طلباً أولاً</option>
                <option value="orders_asc">الأقل طلباً أولاً</option>
                <option value="rate_desc">أعلى نسبة قبول</option>
                <option value="rate_asc">أقل نسبة قبول</option>
                <option value="days_desc">أكثر أيام عمل</option>
              </select>
            </div>

            <span className="font-semibold text-[var(--foreground)] font-mono whitespace-nowrap">
              {filteredRiders.length} من {report?.totalRiders || 0}
            </span>
          </div>
        </div>

        {/* Riders Table */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] font-bold text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3">المندوب</th>
                  <th className="px-3 py-3">الحسابات المرتبطة</th>
                  <th className="px-3 py-3 text-center">فترات البيانات</th>
                  <th className="px-3 py-3 text-center">الأيام المسجلة</th>
                  <th className="px-3 py-3 text-center">إجمالي الطلبات</th>
                  <th className="px-3 py-3 text-center">معدل الطلبات/نصف</th>
                  <th className="px-3 py-3 text-center">نسبة القبول</th>
                  <th className="px-3 py-3 text-center">التقييم العام</th>
                  <th className="px-4 py-3 text-center w-36">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading && !report ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="inline-flex flex-col items-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-[var(--brand)]" />
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          جاري تحميل تقرير أداء كافة المناديب والحسابات...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRiders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-[var(--muted)]">
                      {report ? (
                        <div className="space-y-1">
                          <Users className="mx-auto h-8 w-8 text-[var(--muted)] opacity-50" />
                          <p className="font-bold text-[var(--foreground)]">لا توجد سجلات مناديب مطابقة للتصفية</p>
                          <p className="text-[11px]">
                            لم يتم العثور على مناديب متطابقين مع محددات البحث أو الفئة المختارة في هذه الفترة.
                          </p>
                        </div>
                      ) : (
                        "اضغط على زر عرض التقرير لجلب أداء كافة المناديب."
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRiders.map((rider, idx) => {
                    const isExpanded = expandedRiderIds.has(rider.riderProfileId);
                    const hasTwoAccounts = rider.accounts.length >= 2;

                    return (
                      <Fragment key={rider.riderProfileId || idx}>
                        <tr
                          className={`transition-colors hover:bg-[var(--table-row-hover)] ${
                            isExpanded ? "bg-[var(--brand)]/5" : ""
                          }`}
                        >
                          {/* Index */}
                          <td className="px-3 py-3 text-center font-mono text-[var(--muted)] font-semibold">
                            {idx + 1}
                          </td>

                          {/* Rider Info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] font-bold text-xs">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-bold text-sm text-[var(--foreground)] block">
                                  {rider.riderName || "مندوب مسجل"}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[11px] text-[var(--foreground)] font-semibold">
                                    الإقامة: {rider.riderIqamaNo ?? "—"}
                                  </span>
                                  <span
                                    className="font-mono text-[10px] text-[var(--muted)]"
                                    dir="ltr"
                                    title={rider.riderProfileId}
                                  >
                                    ({rider.riderProfileId.slice(0, 8)}...)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Linked Accounts */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex flex-wrap items-center gap-1">
                                {rider.accounts.map((acc, aIdx) => (
                                  <span
                                    key={acc.accountId || aIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] bg-[var(--subtle-bg)] text-[var(--foreground)] border border-[var(--border)]"
                                    dir="ltr"
                                  >
                                    <CreditCard className="h-2.5 w-2.5 text-[var(--muted)]" />
                                    {acc.externalAccountId || acc.accountId.slice(0, 8)}
                                  </span>
                                ))}
                              </div>
                              {hasTwoAccounts && (
                                <span className="inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                  حسابين للمندوب
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Halves with data */}
                          <td className="px-3 py-3 text-center font-mono">
                            <span className="font-semibold text-[var(--foreground)]">
                              {rider.selectedSummary.halvesWithData}
                            </span>
                            <span className="text-[var(--muted)] text-[11px]">
                              {" "}من {report?.requestedHalves || 1}
                            </span>
                          </td>

                          {/* Days with data */}
                          <td className="px-3 py-3 text-center font-mono">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                                rider.selectedSummary.daysWithData === 0
                                  ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
                                  : rider.selectedSummary.daysWithData < 5
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {rider.selectedSummary.daysWithData} يوم
                            </span>
                          </td>

                          {/* Orders */}
                          <td className="px-3 py-3 text-center font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {rider.selectedSummary.orders.toLocaleString()}
                          </td>

                          {/* Average orders per half */}
                          <td className="px-3 py-3 text-center font-mono font-semibold text-xs text-[var(--foreground)]">
                            {rider.selectedSummary.averageOrdersPerHalf !== null
                              ? rider.selectedSummary.averageOrdersPerHalf.toFixed(1)
                              : "—"}
                          </td>

                          {/* Acceptance Rate */}
                          <td className="px-3 py-3 text-center font-mono font-black text-xs">
                            {rider.selectedSummary.acceptanceRate !== null ? (
                              <span
                                className={`inline-block rounded px-2 py-0.5 ${
                                  rider.selectedSummary.acceptanceRate >= 80
                                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                                    : rider.selectedSummary.acceptanceRate >= 60
                                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                                    : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                                }`}
                              >
                                {rider.selectedSummary.acceptanceRate}%
                              </span>
                            ) : (
                              <span className="text-[var(--muted)] font-normal text-[11px]">—</span>
                            )}
                          </td>

                          {/* Rating Badge */}
                          <td className="px-3 py-3 text-center">
                            {renderRatingBadge(rider.selectedSummary.rating)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Inline Expand Button */}
                              <button
                                type="button"
                                onClick={() => toggleRowExpansion(rider.riderProfileId)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)]"
                                title={isExpanded ? "طي التفاصيل" : "عرض ملخص الحسابات والفترات"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>

                              {/* Detailed History Modal Button */}
                              <button
                                type="button"
                                onClick={() => openRiderDetailsModal(rider)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--brand)] text-white hover:opacity-90 font-bold text-[11px]"
                                title="فتح السجل اليومي والتاريخي الكامل"
                              >
                                <Eye className="h-3 w-3" />
                                <span>السجل اليومي</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Accordion Detail: Accounts & Halves Overview */}
                        {isExpanded && (
                          <tr className="bg-[var(--subtle-bg)]/60">
                            <td colSpan={10} className="px-6 py-4">
                              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[var(--brand)]" />
                                    <h4 className="font-bold text-xs text-[var(--foreground)]">
                                      تفصيل حسابات وفترات المندوب: {rider.riderName}
                                    </h4>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openRiderDetailsModal(rider)}
                                    className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    فتح السجل اليومي الكامل والتاريخي لهذا المندوب
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Accounts Breakdown */}
                                  <div className="space-y-2">
                                    <span className="font-bold text-[11px] text-[var(--muted)] block">
                                      الحسابات المسجلة ({rider.accounts.length}):
                                    </span>
                                    <div className="space-y-2">
                                      {rider.accounts.map((acc, aIdx) => (
                                        <div
                                          key={acc.accountId || aIdx}
                                          className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] space-y-2"
                                        >
                                          <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 font-mono font-bold" dir="ltr">
                                              <CreditCard className="h-3.5 w-3.5 text-[var(--brand)]" />
                                              <span>{acc.externalAccountId || acc.accountId}</span>
                                            </div>
                                            <div>{renderRatingBadge(acc.summary.rating)}</div>
                                          </div>
                                          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                                            <div>
                                              <span className="text-[var(--muted)] block text-[10px]">الطلبات</span>
                                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {acc.summary.orders}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-[var(--muted)] block text-[10px]">نسبة القبول</span>
                                              <span className="font-bold">
                                                {acc.summary.acceptanceRate !== null ? `${acc.summary.acceptanceRate}%` : "—"}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-[var(--muted)] block text-[10px]">أيام العمل</span>
                                              <span className="font-bold">{acc.summary.daysWithData} يوم</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Halves Breakdown */}
                                  <div className="space-y-2">
                                    <span className="font-bold text-[11px] text-[var(--muted)] block">
                                      الفترات نصف الشهرية ({rider.halves.length}):
                                    </span>
                                    <div className="space-y-2">
                                      {rider.halves.map((h, hIdx) => (
                                        <div
                                          key={hIdx}
                                          className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-between text-xs"
                                        >
                                          <div>
                                            <span className="font-mono font-semibold block text-[11px]" dir="ltr">
                                              {h.from} → {h.to}
                                            </span>
                                            {h.message && (
                                              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                                                {h.message}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-left font-mono text-[11px]">
                                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {h.orders} طلب
                                              </span>
                                              <span className="text-[var(--muted)] text-[10px] block">
                                                {h.daysWithData} يوم | {h.acceptanceRate !== null ? `${h.acceptanceRate}%` : "—"}
                                              </span>
                                            </div>
                                            <div>{renderRatingBadge(h.rating)}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Rider Detailed History Modal */}
      {detailModalRider && (
        <Modal
          isOpen={!!detailModalRider}
          onClose={() => setDetailModalRider(null)}
          title={`تقرير أداء المندوب: ${detailModalRider.riderName || "مندوب مسجل"}`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-5" dir="rtl">
            {/* Modal Header Bar with period info & Export */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-[var(--foreground)]">
                    {riderDetailReport?.riderName || detailModalRider.riderName}
                  </span>
                  <span className="rounded-lg bg-[var(--subtle-bg)] px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--foreground)] border border-[var(--border)]">
                    رقم الإقامة: {riderDetailReport?.riderIqamaNo ?? detailModalRider.riderIqamaNo ?? "—"}
                  </span>
                  <span className="font-mono text-xs text-[var(--muted)]" dir="ltr">
                    ({detailModalRider.riderProfileId})
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  النافذة: <span className="font-mono font-semibold" dir="ltr">{report?.from} → {report?.to}</span> (نصف شهر {half} من {year}/{month})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleExportSingleRiderExcel}
                  disabled={!riderDetailReport}
                  className="gap-2 text-xs font-semibold"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  استخراج تفاصيل المندوب
                </Button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[var(--brand)]" />
                <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
                  جاري جلب السجل اليومي والتاريخي الكامل للمندوب...
                </p>
              </div>
            ) : detailError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{detailError}</span>
                </div>
              </div>
            ) : riderDetailReport ? (
              <div className="space-y-5">
                {/* Warnings / Messages */}
                {riderDetailReport.messages && riderDetailReport.messages.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/40 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <Info className="h-3.5 w-3.5 text-amber-600" />
                      <span>تنبيهات الفترات غير المتوفرة ({riderDetailReport.messages.length}):</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-300">
                      {riderDetailReport.messages.map((m, mIdx) => (
                        <li key={mIdx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary Cards: Selected Period vs All-Time History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selected Period Summary */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <h4 className="font-bold text-xs text-[var(--foreground)]">
                          ملخص النافذة المحددة ({riderDetailReport.requestedHalves} فترات)
                        </h4>
                      </div>
                      <div>{renderRatingBadge(riderDetailReport.selectedSummary.rating, "md")}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">الفترات المتاحة</span>
                        <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {riderDetailReport.selectedSummary.halvesWithData} من {riderDetailReport.requestedHalves}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">أيام البيانات</span>
                        <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {riderDetailReport.selectedSummary.daysWithData} يوم
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">إجمالي الطلبات</span>
                        <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                          {riderDetailReport.selectedSummary.orders}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">متوسط الطلبات/فترة</span>
                        <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {riderDetailReport.selectedSummary.averageOrdersPerHalf !== null
                            ? riderDetailReport.selectedSummary.averageOrdersPerHalf.toFixed(1)
                            : "—"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">نسبة القبول</span>
                        <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {riderDetailReport.selectedSummary.acceptanceRate !== null
                            ? `${riderDetailReport.selectedSummary.acceptanceRate}%`
                            : "—"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">تقييم الفترة</span>
                        <span className="font-bold text-xs mt-0.5 block">
                          {riderDetailReport.selectedSummary.rating || "غير مقيم"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* All-Time Historical Summary */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-bold text-xs text-[var(--foreground)]">
                          السجل التاريخي الشامل (كافة الأوقات)
                        </h4>
                      </div>
                      <div>{renderRatingBadge(riderDetailReport.allTimeSummary.rating, "md")}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">الفترات المسجلة</span>
                        <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {riderDetailReport.allTimeSummary.halvesWithData} نصف
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">إجمالي الأيام</span>
                        <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {riderDetailReport.allTimeSummary.daysWithData} يوم
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">إجمالي الطلبات</span>
                        <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                          {riderDetailReport.allTimeSummary.orders.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">المتوسط الشامل/فترة</span>
                        <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {riderDetailReport.allTimeSummary.averageOrdersPerHalf !== null
                            ? riderDetailReport.allTimeSummary.averageOrdersPerHalf.toFixed(1)
                            : "—"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">نسبة القبول الدائمة</span>
                        <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                          {riderDetailReport.allTimeSummary.acceptanceRate !== null
                            ? `${riderDetailReport.allTimeSummary.acceptanceRate}%`
                            : "—"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--subtle-bg)]">
                        <span className="text-[var(--muted)] text-[10px] block">التقييم الدائم</span>
                        <span className="font-bold text-xs mt-0.5 block">
                          {riderDetailReport.allTimeSummary.rating || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs: Daily vs Accounts vs Halves */}
                <div className="space-y-3">
                  <div className="flex border-b border-[var(--border)] gap-2 pb-px text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDetailSubTab("daily")}
                      className={`px-4 py-2 border-b-2 transition-colors ${
                        detailSubTab === "daily"
                          ? "border-[var(--brand)] text-[var(--brand)]"
                          : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      السجلات اليومية المفصلة ({riderDetailReport.daily.length})
                    </button>
                    {riderDetailReport.accounts && riderDetailReport.accounts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDetailSubTab("accounts")}
                        className={`px-4 py-2 border-b-2 transition-colors ${
                          detailSubTab === "accounts"
                            ? "border-[var(--brand)] text-[var(--brand)]"
                            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        تفصيل الحسابات ({riderDetailReport.accounts.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetailSubTab("halves")}
                      className={`px-4 py-2 border-b-2 transition-colors ${
                        detailSubTab === "halves"
                          ? "border-[var(--brand)] text-[var(--brand)]"
                          : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      الفترات نصف الشهرية ({riderDetailReport.halves.length})
                    </button>
                  </div>

                  {/* Daily Tab Content */}
                  {detailSubTab === "daily" && (
                    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      <div className="overflow-x-auto max-h-72">
                        <table className="w-full text-right text-xs">
                          <thead className="sticky top-0 bg-[var(--table-header-bg)] border-b border-[var(--border)] font-bold text-[var(--muted)]">
                            <tr>
                              <th className="px-3 py-2.5">التاريخ</th>
                              <th className="px-3 py-2.5 text-center">الطلبات المقبولة</th>
                              <th className="px-3 py-2.5 text-center">الطلبات الصالحة</th>
                              <th className="px-3 py-2.5 text-center">الطلبات الفائتة</th>
                              <th className="px-3 py-2.5 text-center">نسبة القبول</th>
                              <th className="px-3 py-2.5 text-center">التقييم اليومي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] font-mono">
                            {riderDetailReport.daily.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-6 text-center text-xs text-[var(--muted)] font-sans">
                                  لا توجد سجلات يومية في هذه الفترة.
                                </td>
                              </tr>
                            ) : (
                              riderDetailReport.daily.map((d, dIdx) => (
                                <tr key={dIdx} className="hover:bg-[var(--subtle-bg)]">
                                  <td className="px-3 py-2 font-semibold" dir="ltr">
                                    {d.date}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                    {d.orders}
                                  </td>
                                  <td className="px-3 py-2 text-center">{d.validOffers}</td>
                                  <td className="px-3 py-2 text-center text-amber-600 dark:text-amber-400">
                                    {d.missedOffers}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold">
                                    {d.acceptanceRate !== null ? `${d.acceptanceRate}%` : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-center font-sans">
                                    {renderRatingBadge(d.rating)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Accounts Tab Content */}
                  {detailSubTab === "accounts" && (
                    <div className="space-y-4">
                      {riderDetailReport.accounts?.map((acc, aIdx) => (
                        <div
                          key={acc.accountId || aIdx}
                          className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[var(--foreground)]">
                                حساب شيفز: {acc.externalAccountId || acc.accountId}
                              </span>
                              <span className="font-mono text-[11px] text-[var(--muted)]">
                                (رقم الإقامة: <strong className="text-[var(--foreground)]">{acc.riderIqamaNo ?? riderDetailReport.riderIqamaNo ?? detailModalRider.riderIqamaNo ?? "—"}</strong>)
                              </span>
                            </div>
                            <div>{renderRatingBadge(acc.summary.rating)}</div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                            <div className="p-2 rounded bg-[var(--subtle-bg)]">
                              <span className="text-[10px] text-[var(--muted)] font-sans block">الطلبات</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {acc.summary.orders}
                              </span>
                            </div>
                            <div className="p-2 rounded bg-[var(--subtle-bg)]">
                              <span className="text-[10px] text-[var(--muted)] font-sans block">نسبة القبول</span>
                              <span className="font-bold">
                                {acc.summary.acceptanceRate !== null ? `${acc.summary.acceptanceRate}%` : "—"}
                              </span>
                            </div>
                            <div className="p-2 rounded bg-[var(--subtle-bg)]">
                              <span className="text-[10px] text-[var(--muted)] font-sans block">أيام العمل</span>
                              <span className="font-bold">{acc.summary.daysWithData} يوم</span>
                            </div>
                            <div className="p-2 rounded bg-[var(--subtle-bg)]">
                              <span className="text-[10px] text-[var(--muted)] font-sans block">الفترات</span>
                              <span className="font-bold">{acc.summary.halvesWithData}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Halves Tab Content */}
                  {detailSubTab === "halves" && (
                    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border)] font-bold text-[var(--muted)]">
                          <tr>
                            <th className="px-3 py-2.5">الفترة نصف الشهرية</th>
                            <th className="px-3 py-2.5 text-center">الأيام المسجلة</th>
                            <th className="px-3 py-2.5 text-center">الطلبات المقبولة</th>
                            <th className="px-3 py-2.5 text-center">نسبة القبول</th>
                            <th className="px-3 py-2.5 text-center">التقييم</th>
                            <th className="px-3 py-2.5">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {riderDetailReport.halves.map((h, hIdx) => (
                            <tr key={hIdx} className="hover:bg-[var(--subtle-bg)]">
                              <td className="px-3 py-2 font-mono font-semibold" dir="ltr">
                                {h.from} → {h.to}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">{h.daysWithData} يوم</td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {h.orders}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold">
                                {h.acceptanceRate !== null ? `${h.acceptanceRate}%` : "—"}
                              </td>
                              <td className="px-3 py-2 text-center">{renderRatingBadge(h.rating)}</td>
                              <td className="px-3 py-2 text-[11px] text-[var(--muted)]">
                                {h.message || "بيانات مكتملة"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Settings Modal */}
      <ChefzPerformanceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {
          loadAllReport();
        }}
      />
    </div>
  );
}
