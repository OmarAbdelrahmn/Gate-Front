// src/components/chefz/ChefzRiderReportView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getChefzRiderReport, getRiyadhTodayDate } from "@/lib/chefz/api";
import type {
  ChefzRiderReport,
  ChefzReportHalf,
  ChefzReportDaily,
} from "@/lib/chefz/types";
import type { AccountResponse } from "@/lib/platforms/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { ChefzPerformanceSettingsModal } from "./ChefzPerformanceSettingsModal";
import {
  FileSpreadsheet,
  RefreshCw,
  SlidersHorizontal,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  User,
  ShieldAlert,
  Info,
  Layers,
} from "lucide-react";

interface Props {
  accounts: AccountResponse[];
  riders: Rider[];
}

export function ChefzRiderReportView({ accounts, riders }: Props) {
  const { can } = useAuth();
  const canRead = can("chefz.read");

  // Selection filters
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");

  // Period filters
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
  const [half, setHalf] = useState<number>(today.day <= 15 ? 1 : 2);
  const [halves, setHalves] = useState<number>(4);

  // Data states
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ChefzRiderReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active view tab inside rider report: Accounts vs Halves vs Daily
  const [subTab, setSubTab] = useState<"accounts" | "halves" | "daily">("accounts");

  // Map for quick name resolution
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

  const loadReport = async () => {
    if (!selectedAccountId && !selectedRiderId) {
      setError("يرجى تحديد حساب شيفز أو مندوب لعرض تقرير الأداء.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getChefzRiderReport({
        accountId: selectedAccountId || undefined,
        riderId: selectedRiderId || undefined,
        year,
        month,
        half,
        halves,
      });
      setReport(res);
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string; message?: string }; message?: string };
      setError(e?.details?.detail || e?.details?.message || e?.message || "تعذر تحميل تقرير أداء المندوب/الحساب.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper for rating badge tone
  const getRatingBadge = (rating: string | null) => {
    if (!rating) {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
          لا توجد بيانات
        </span>
      );
    }

    switch (rating.toUpperCase()) {
      case "A":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            A
          </span>
        );
      case "B":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            B
          </span>
        );
      case "C":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            C
          </span>
        );
      case "D":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
            D
          </span>
        );
      case "CHANGE":
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
            تحويل (CHANGE)
          </span>
        );
      default:
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {rating}
          </span>
        );
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!report) return;

    const acc = selectedAccountId ? accountMap.get(selectedAccountId) : null;
    const rdr = selectedRiderId ? riderMap.get(selectedRiderId) : null;
    const targetName = rdr?.fullNameAr || acc?.code || "chefz-rider-report";

    if (subTab === "halves") {
      exportToExcel({
        filename: `تقرير-أداء-فترات-${targetName}-${year}-${month}-H${half}`,
        sheetName: "ملخص الفترات نصف الشهرية",
        data: report.halves,
        columns: [
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
        filename: `تقرير-أداء-يومي-${targetName}-${year}-${month}-H${half}`,
        sheetName: "الأداء اليومي المفصل",
        data: report.daily,
        columns: [
          { header: "التاريخ", accessor: (d) => d.date, isText: true },
          { header: "الطلبات المقبولة", accessor: (d) => d.orders },
          { header: "إجمالي العروض الصالحة", accessor: (d) => d.validOffers },
          { header: "العروض الفائتة", accessor: (d) => d.missedOffers },
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
      {/* Top action / settings bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            تقرير أداء الحسابات والمناديب
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            تحليل وتقييم الأداء عبر الفترات نصف الشهرية المتعاقبة وحساب التقييم التلقائي (A, B, C, D, CHANGE).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Report settings button present on this tab! */}
          <Button
            variant="secondary"
            onClick={() => setIsSettingsOpen(true)}
            className="gap-2 text-xs font-semibold"
          >
            <SlidersHorizontal className="h-4 w-4 text-[var(--brand)]" />
            إعدادات التقارير
          </Button>

          {/* Extract to Excel button */}
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={!report || (subTab === "halves" ? report.halves.length === 0 : report.daily.length === 0)}
            className="gap-2 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            استخراج إكسل
          </Button>

          {/* Search / Refresh button */}
          <Button
            onClick={loadReport}
            disabled={loading || (!selectedAccountId && !selectedRiderId)}
            className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 text-xs font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            عرض التقرير
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Account Filter */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              حساب شيفز
            </label>
            <SearchableSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              options={[
                { value: "", label: "اختر حساب شيفز..." },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: `${a.code} ${a.externalAccountId ? `(${a.externalAccountId})` : ""}`,
                  keywords: `${a.code} ${a.externalAccountId || ""}`,
                })),
              ]}
              placeholder="اختر الحساب..."
            />
          </div>

          {/* Rider Filter */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              المندوب
            </label>
            <SearchableSelect
              value={selectedRiderId}
              onChange={setSelectedRiderId}
              options={[
                { value: "", label: "اختر المندوب..." },
                ...riders.map((r) => ({
                  value: r.id,
                  label: `${r.fullNameAr} (${r.iqamaNo || "بدون إقامة"})`,
                  keywords: `${r.fullNameAr} ${r.iqamaNo || ""}`,
                })),
              ]}
              placeholder="اختر المندوب..."
            />
          </div>

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
        </div>

        {/* Second row of period controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[var(--border)] pt-3 text-xs">
          {/* Ending Half */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              النصف المنتهي المطلوب
            </label>
            <select
              value={half}
              onChange={(e) => setHalf(parseInt(e.target.value) || 1)}
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
              onChange={(e) => setHalves(parseInt(e.target.value) || 4)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value={1}>فترة واحدة (1)</option>
              <option value={2}>فترتان (شهر كامل - 2)</option>
              <option value={4}>4 فترات (شهران - 4)</option>
              <option value={6}>6 فترات (3 أشهر - 6)</option>
              <option value={8}>8 فترات (4 أشهر - 8)</option>
              <option value={12}>12 فترة (6 أشهر - 12)</option>
              <option value={24}>24 فترة (سنة كاملة - 24)</option>
            </select>
          </div>

          <div className="flex items-end">
            <span className="text-[11px] text-[var(--muted)] leading-relaxed">
              * يشترط تحديد الحساب أو المندوب أو كلاهما. يتم استرجاع الفترات حتى النصف المحدد وما قبله.
            </span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Report Results */}
      {report && (
        <div className="space-y-6">
          {/* Missing periods message banners */}
          {report.messages && report.messages.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/40 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900 dark:text-amber-200">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <span>تنبيهات الفترات غير المتوفرة ({report.messages.length}):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 dark:text-amber-300">
                {report.messages.map((msg, idx) => (
                  <li key={idx} className="font-medium">
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Selected Period Summary */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-[var(--foreground)]">
                    ملخص النافذة المحددة ({report.requestedHalves} فترات مطلوبة)
                  </h3>
                </div>
                <div>{getRatingBadge(report.selectedSummary.rating)}</div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">الفترات المتاحة</span>
                  <span className="font-bold font-mono text-base text-[var(--foreground)]">
                    {report.selectedSummary.halvesWithData} من {report.requestedHalves}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">أيام البيانات الفعلية</span>
                  <span className="font-bold font-mono text-base text-[var(--foreground)]">
                    {report.selectedSummary.daysWithData} يوم
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">إجمالي الطلبات المقبولة</span>
                  <span className="font-bold font-mono text-base text-emerald-600 dark:text-emerald-400">
                    {report.selectedSummary.orders.toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">متوسط الطلبات لكل نصف</span>
                  <span className="font-bold font-mono text-base text-[var(--foreground)]">
                    {report.selectedSummary.averageOrdersPerHalf !== null
                      ? report.selectedSummary.averageOrdersPerHalf.toFixed(1)
                      : "—"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">نسبة القبول الموزونة</span>
                  <span className="font-bold font-mono text-base text-[var(--foreground)]">
                    {report.selectedSummary.acceptanceRate !== null
                      ? `${report.selectedSummary.acceptanceRate}%`
                      : "—"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">التقييم العام للفترة</span>
                  <span className="font-bold text-sm mt-0.5 block">
                    {report.selectedSummary.rating || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* All Time Summary */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-sm text-[var(--foreground)]">
                    الملخص الشامل (كافة السجلات التاريخية)
                  </h3>
                </div>
                <div>{getRatingBadge(report.allTimeSummary.rating)}</div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">إجمالي الفترات المسجلة</span>
                  <span className="font-bold font-mono text-base text-[var(--foreground)]">
                    {report.allTimeSummary.halvesWithData} نصف
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">إجمالي الأيام المسجلة</span>
                  <span className="font-bold font-mono text-base text-[var(--foreground)]">
                    {report.allTimeSummary.daysWithData} يوم
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">إجمالي الطلبات المقبولة</span>
                  <span className="font-bold font-mono text-base text-emerald-600 dark:text-emerald-400">
                    {report.allTimeSummary.orders.toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">المتوسط الشامل لكل نصف</span>
                  <span className="font-bold font-mono text-base text-[var(--foreground)]">
                    {report.allTimeSummary.averageOrdersPerHalf !== null
                      ? report.allTimeSummary.averageOrdersPerHalf.toFixed(1)
                      : "—"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">نسبة القبول الشاملة</span>
                  <span className="font-bold font-mono text-base text-[var(--foreground)]">
                    {report.allTimeSummary.acceptanceRate !== null
                      ? `${report.allTimeSummary.acceptanceRate}%`
                      : "—"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                  <span className="text-[var(--muted)] block">التقييم الشامل الدائم</span>
                  <span className="font-bold text-sm mt-0.5 block">
                    {report.allTimeSummary.rating || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-tabs: Halves breakdown vs Daily records */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-[var(--border)] pb-2 gap-2">
              <div className="flex flex-wrap gap-2">
                {report.accounts && report.accounts.length > 0 && (
                  <button
                    onClick={() => setSubTab("accounts")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      subTab === "accounts"
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--subtle-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    تفصيل حسابات المندوب ({report.accounts.length})
                  </button>
                )}
                <button
                  onClick={() => setSubTab("halves")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    subTab === "halves"
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--subtle-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  جدول الفترات نصف الشهرية ({report.halves.length})
                </button>
                <button
                  onClick={() => setSubTab("daily")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    subTab === "daily"
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--subtle-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  جدول السجلات اليومية المدمجة ({report.daily.length})
                </button>
              </div>

              <span className="text-xs text-[var(--muted)]">
                {subTab === "accounts"
                  ? "تفصيل مستقل لكل حساب ومندوب مع السجلات اليومية"
                  : subTab === "halves"
                  ? "مرتبة زمنياً من الأقدم للأحدث"
                  : "الأيام المسجلة في النافذة"}
              </span>
            </div>

            {/* Accounts Breakdown Tab */}
            {subTab === "accounts" && (
              <div className="space-y-6">
                {!report.accounts || report.accounts.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center text-xs text-[var(--muted)]">
                    لا تتوفر حسابات مسجلة أو تفصيل حسابات منفصل لهذا المندوب في الفترة المحددة.
                  </div>
                ) : (
                  report.accounts.map((accGroup, idx) => {
                    const accBase = accountMap.get(accGroup.accountId);
                    const groupKey = `${accGroup.accountId}_${accGroup.riderProfileId || idx}`;

                    return (
                      <div
                        key={groupKey}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm space-y-4"
                      >
                        {/* Header for this Account / Rider Group */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-[var(--foreground)]">
                                  حساب: {accBase?.code || accGroup.accountId.slice(0, 8)}
                                </h4>
                                {accGroup.externalAccountId && (
                                  <span className="font-mono text-xs text-[var(--muted)]" dir="ltr">
                                    ({accGroup.externalAccountId})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--muted)]">
                                المندوب: <span className="font-semibold text-[var(--foreground)]">{accGroup.riderName || riderMap.get(accGroup.riderProfileId)?.fullNameAr || "مندوب مسجل"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge tone="blue">حساب مستقل</Badge>
                            {getRatingBadge(accGroup.summary.rating)}
                          </div>
                        </div>

                        {/* Summary Metrics for this Account */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                            <span className="text-[var(--muted)] block text-[11px]">الفترات المسجلة</span>
                            <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                              {accGroup.summary.halvesWithData} فترة
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                            <span className="text-[var(--muted)] block text-[11px]">أيام العمل الفعلية</span>
                            <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                              {accGroup.summary.daysWithData} يوم
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                            <span className="text-[var(--muted)] block text-[11px]">إجمالي الطلبات المقبولة</span>
                            <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                              {accGroup.summary.orders.toLocaleString()}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                            <span className="text-[var(--muted)] block text-[11px]">معدل الطلبات/فترة</span>
                            <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                              {accGroup.summary.averageOrdersPerHalf !== null
                                ? accGroup.summary.averageOrdersPerHalf.toFixed(1)
                                : "—"}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[var(--subtle-bg)]">
                            <span className="text-[var(--muted)] block text-[11px]">نسبة القبول للحساب</span>
                            <span className="font-bold font-mono text-sm text-[var(--foreground)]">
                              {accGroup.summary.acceptanceRate !== null
                                ? `${accGroup.summary.acceptanceRate}%`
                                : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Daily Rows Table for this Account */}
                        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                              <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border)] font-bold text-[var(--muted)]">
                                <tr>
                                  <th className="px-3 py-2.5">تاريخ التقرير</th>
                                  <th className="px-3 py-2.5">رقم الهوية بالتقرير</th>
                                  <th className="px-3 py-2.5 text-center">إجمالي الطلبات الصالحة</th>
                                  <th className="px-3 py-2.5 text-center">الطلبات المقبولة</th>
                                  <th className="px-3 py-2.5 text-center">الطلبات المرفوضة</th>
                                  <th className="px-3 py-2.5 text-center">الطلبات الفائتة</th>
                                  <th className="px-3 py-2.5 text-center">نسبة القبول</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border)]">
                                {!accGroup.daily || accGroup.daily.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-6 text-center text-xs text-[var(--muted)]">
                                      لا توجد سجلات يومية مفصلة لهذا الحساب في الفترة المحددة.
                                    </td>
                                  </tr>
                                ) : (
                                  accGroup.daily.map((d, dIdx) => (
                                    <tr key={d.id || dIdx} className="hover:bg-[var(--subtle-bg)]">
                                      <td className="px-3 py-2 font-mono font-semibold" dir="ltr">
                                        {d.reportDate}
                                      </td>
                                      <td className="px-3 py-2 font-mono" dir="ltr">
                                        {d.reportIdNumber}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono font-bold" dir="ltr">
                                        {d.totalValidOffers.toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                                        {d.acceptedOffers.toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono font-bold text-red-600 dark:text-red-400" dir="ltr">
                                        {d.declinedOffers.toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                                        {d.missedOffers.toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2 text-center font-bold" dir="ltr">
                                        <span
                                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${
                                            d.acceptanceRate >= 80
                                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                              : d.acceptanceRate >= 60
                                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                              : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                                          }`}
                                        >
                                          {d.acceptanceRate}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Halves Table */}
            {subTab === "halves" && (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3.5">الفترة نصف الشهرية</th>
                        <th className="px-4 py-3.5 text-center">أيام البيانات</th>
                        <th className="px-4 py-3.5 text-center">الطلبات المقبولة</th>
                        <th className="px-4 py-3.5 text-center">نسبة القبول</th>
                        <th className="px-4 py-3.5 text-center">تقييم الفترة</th>
                        <th className="px-4 py-3.5">ملاحظات وحالة الفترة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {report.halves.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-[var(--muted)]">
                            لا توجد فترات نصف شهرية مسترجعة.
                          </td>
                        </tr>
                      ) : (
                        report.halves.map((h, idx) => {
                          const hasData = h.daysWithData > 0;
                          return (
                            <tr
                              key={idx}
                              className={`transition-colors hover:bg-[var(--table-row-hover)] ${
                                !hasData ? "opacity-75 bg-slate-50/50 dark:bg-slate-900/30" : ""
                              }`}
                            >
                              <td className="px-4 py-3 font-semibold font-mono text-xs" dir="ltr">
                                {h.from} → {h.to}
                              </td>

                              <td className="px-4 py-3 text-center font-bold text-xs">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded ${
                                    h.daysWithData === 0
                                      ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
                                      : h.daysWithData < 10
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  }`}
                                >
                                  {h.daysWithData} يوم
                                </span>
                              </td>

                              <td className="px-4 py-3 text-center font-bold font-mono text-xs" dir="ltr">
                                {hasData ? h.orders.toLocaleString() : "—"}
                              </td>

                              <td className="px-4 py-3 text-center font-extrabold text-xs" dir="ltr">
                                {h.acceptanceRate !== null ? (
                                  <span
                                    className={`inline-block rounded px-2 py-0.5 ${
                                      h.acceptanceRate >= 80
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : h.acceptanceRate >= 60
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-rose-600 dark:text-rose-400"
                                    }`}
                                  >
                                    {h.acceptanceRate}%
                                  </span>
                                ) : (
                                  <span className="text-[var(--muted)] font-normal">لا توجد بيانات</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {getRatingBadge(h.rating)}
                              </td>

                              <td className="px-4 py-3 text-xs">
                                {h.message ? (
                                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                                    {h.message}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    بيانات مكتملة
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Daily Table */}
            {subTab === "daily" && (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)]">
                      <tr>
                        <th className="px-4 py-3.5">التاريخ</th>
                        <th className="px-4 py-3.5 text-center">الطلبات المقبولة</th>
                        <th className="px-4 py-3.5 text-center">إجمالي العروض الصالحة</th>
                        <th className="px-4 py-3.5 text-center">العروض الفائتة</th>
                        <th className="px-4 py-3.5 text-center">نسبة القبول</th>
                        <th className="px-4 py-3.5 text-center">التقييم اليومي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {report.daily.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-[var(--muted)]">
                            لا توجد سجلات يومية في النافذة الزمنية المحددة.
                          </td>
                        </tr>
                      ) : (
                        report.daily.map((d, idx) => (
                          <tr key={idx} className="transition-colors hover:bg-[var(--table-row-hover)]">
                            <td className="px-4 py-3 font-semibold font-mono text-xs" dir="ltr">
                              {d.date}
                            </td>
                            <td className="px-4 py-3 text-center font-bold font-mono text-xs text-emerald-600 dark:text-emerald-400" dir="ltr">
                              {d.orders}
                            </td>
                            <td className="px-4 py-3 text-center font-bold font-mono text-xs" dir="ltr">
                              {d.validOffers}
                            </td>
                            <td className="px-4 py-3 text-center font-bold font-mono text-xs text-amber-600 dark:text-amber-400" dir="ltr">
                              {d.missedOffers}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-xs" dir="ltr">
                              {d.acceptanceRate !== null ? (
                                `${d.acceptanceRate}%`
                              ) : (
                                <span className="text-[var(--muted)] font-normal">لا توجد بيانات</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {getRatingBadge(d.rating)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <ChefzPerformanceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {
          if (selectedAccountId || selectedRiderId) loadReport();
        }}
      />
    </div>
  );
}
