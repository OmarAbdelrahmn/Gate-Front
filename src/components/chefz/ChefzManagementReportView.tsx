// src/components/chefz/ChefzManagementReportView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getChefzManagementReport,
  getRiyadhTodayDate,
} from "@/lib/chefz/api";
import type { ChefzManagementReport } from "@/lib/chefz/types";
import type { Sponsor } from "@/lib/workforce/api";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { ChefzPerformanceSettingsModal } from "./ChefzPerformanceSettingsModal";
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Info,
  UtensilsCrossed,
} from "lucide-react";

interface Props {
  sponsors: Sponsor[];
}

export function ChefzManagementReportView({ sponsors }: Props) {
  const { can } = useAuth();
  const canRead = can("chefz.read");

  const todayStr = useMemo(() => getRiyadhTodayDate(), []);

  // Filter states
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>("");

  // Data states
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ChefzManagementReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // View mode: cards vs table
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const loadReport = async () => {
    if (!reportDate) return;
    if (reportDate > todayStr) {
      setError("تاريخ التقرير لا يمكن أن يكون في المستقبل.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getChefzManagementReport({
        reportDate,
        sponsorId: selectedSponsorId || undefined,
      });
      setReports(res || []);
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string; message?: string }; message?: string };
      setError(e?.details?.detail || e?.details?.message || e?.message || "تعذر تحميل التقرير الإداري.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportDate, selectedSponsorId]);

  // Aggregate totals across returned sponsors
  const aggregates = useMemo(() => {
    return reports.reduce(
      (acc, curr) => ({
        cycleOrders: acc.cycleOrders + (curr.cycleOrders || 0),
        accountsBelowThree: acc.accountsBelowThree + (curr.accountsBelowThreeOrdersInCycle || 0),
        activeYesterday: acc.activeYesterday + (curr.ridersWithOrdersYesterday || 0),
        threeOrFewerYesterday: acc.threeOrFewerYesterday + (curr.ridersWithThreeOrFewerOrdersYesterday || 0),
        moreThanThreeYesterday: acc.moreThanThreeYesterday + (curr.ridersWithMoreThanThreeOrdersYesterday || 0),
      }),
      {
        cycleOrders: 0,
        accountsBelowThree: 0,
        activeYesterday: 0,
        threeOrFewerYesterday: 0,
        moreThanThreeYesterday: 0,
      }
    );
  }, [reports]);

  // Dates metadata from first record (if any)
  const meta = useMemo(() => {
    if (reports.length > 0) {
      return {
        performanceDate: reports[0].performanceDate,
        cycleFrom: reports[0].cycleFrom,
      };
    }
    // Calculate fallback yesterday in Riyadh
    const d = new Date(reportDate);
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split("T")[0];
    return {
      performanceDate: yesterday,
      cycleFrom: "—",
    };
  }, [reports, reportDate]);

  // Excel export
  const handleExportExcel = () => {
    if (reports.length === 0) return;

    exportToExcel({
      filename: `تقرير-شيفز-الإداري-${reportDate}`,
      sheetName: "التقرير الإداري للتشغيل",
      data: reports,
      columns: [
        { header: "اسم الشركة / الكفيل", accessor: (r) => r.sponsorNameAr },
        { header: "التطبيق", accessor: (r) => r.application || "ذا شفز" },
        { header: "تاريخ التقرير", accessor: (r) => r.reportDate, isText: true },
        { header: "تاريخ الأداء (الأمس)", accessor: (r) => r.performanceDate, isText: true },
        { header: "بداية الدورة", accessor: (r) => r.cycleFrom, isText: true },
        { header: "إجمالي طلبات الدورة", accessor: (r) => r.cycleOrders },
        { header: "حسابات بأقل من 3 طلبات بالدورة", accessor: (r) => r.accountsBelowThreeOrdersInCycle },
        { header: "مناديب نفذوا طلبات بالأمس", accessor: (r) => r.ridersWithOrdersYesterday },
        { header: "مناديب بـ 3 طلبات أو أقل بالأمس", accessor: (r) => r.ridersWithThreeOrFewerOrdersYesterday },
        { header: "مناديب بأكثر من 3 طلبات بالأمس", accessor: (r) => r.ridersWithMoreThanThreeOrdersYesterday },
      ],
    });
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
      {/* Top Header Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              التقرير الإداري للتشغيل والكفلاء
            </h2>
            <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              ذا شفز
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            متابعة إجمالي طلبات الدورة، الحسابات المنخفضة، وأداء المناديب في اليوم السابق مصنفة حسب الكفيل.
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
            disabled={reports.length === 0}
            className="gap-2 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            استخراج إكسل
          </Button>

          {/* Refresh button */}
          <Button
            variant="secondary"
            onClick={loadReport}
            disabled={loading}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Report Date */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              تاريخ التقرير <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              max={todayStr}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-mono"
            />
          </div>

          {/* Sponsor Filter */}
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              الكفيل / الشركة
            </label>
            <SearchableSelect
              value={selectedSponsorId}
              onChange={setSelectedSponsorId}
              options={[
                { value: "", label: "جميع الكفلاء والشركات" },
                ...sponsors.map((s) => ({
                  value: s.id,
                  label: s.registryNameAr || s.registryNameEn || "كفيل غير مسمى",
                  keywords: `${s.registryNameAr || ""} ${s.registryNameEn || ""}`,
                })),
              ]}
              placeholder="اختر الكفيل..."
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-end">
            <div className="flex rounded-xl bg-[var(--subtle-bg)] p-1 border border-[var(--border)] w-full">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  viewMode === "cards"
                    ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-xs"
                    : "text-[var(--muted)]"
                }`}
              >
                بطاقات تفصيلية
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-xs"
                    : "text-[var(--muted)]"
                }`}
              >
                جدول مقارن
              </button>
            </div>
          </div>
        </div>

        {/* Informational banner about performance date & cycle */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              تاريخ الأداء المحسوب (اليوم السابق):{" "}
              <strong className="text-[var(--foreground)] font-mono" dir="ltr">
                {meta.performanceDate}
              </strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              بداية الدورة نصف الشهرية:{" "}
              <strong className="text-[var(--foreground)] font-mono" dir="ltr">
                {meta.cycleFrom}
              </strong>
            </span>
          </div>

          <span className="text-[11px] text-[var(--muted)]">
            * في يوم 1 أو 16 بالشهر، تغطي الدورة النصف السابق المنتهي بالأمس.
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* KPI Overview summary across all loaded sponsors */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Cycle Orders */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <span className="text-xs text-[var(--muted)] font-medium block">
              إجمالي طلبات الدورة
            </span>
            <span className="font-black font-mono text-2xl text-[var(--foreground)] mt-1 block">
              {aggregates.cycleOrders.toLocaleString()}
            </span>
            <span className="text-[11px] text-[var(--muted)] mt-1 block">
              حتى تاريخ {meta.performanceDate}
            </span>
          </div>

          {/* Accounts < 3 orders in cycle */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <span className="text-xs text-[var(--muted)] font-medium block">
              حسابات بأقل من 3 طلبات
            </span>
            <span className="font-black font-mono text-2xl text-rose-600 dark:text-rose-400 mt-1 block">
              {aggregates.accountsBelowThree.toLocaleString()}
            </span>
            <span className="text-[11px] text-[var(--muted)] mt-1 block">
              خلال دورة التشغيل الحالية
            </span>
          </div>

          {/* Active Riders Yesterday */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <span className="text-xs text-[var(--muted)] font-medium block">
              مناديب نفذوا طلبات بالأمس
            </span>
            <span className="font-black font-mono text-2xl text-emerald-600 dark:text-emerald-400 mt-1 block">
              {aggregates.activeYesterday.toLocaleString()}
            </span>
            <span className="text-[11px] text-[var(--muted)] mt-1 block">
              في تاريخ {meta.performanceDate}
            </span>
          </div>

          {/* Riders <= 3 orders yesterday */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <span className="text-xs text-[var(--muted)] font-medium block">
              مناديب بـ 3 طلبات أو أقل
            </span>
            <span className="font-black font-mono text-2xl text-amber-600 dark:text-amber-400 mt-1 block">
              {aggregates.threeOrFewerYesterday.toLocaleString()}
            </span>
            <span className="text-[11px] text-[var(--muted)] mt-1 block">
              أداء يوم أمس
            </span>
          </div>

          {/* Riders > 3 orders yesterday */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <span className="text-xs text-[var(--muted)] font-medium block">
              مناديب بأكثر من 3 طلبات
            </span>
            <span className="font-black font-mono text-2xl text-blue-600 dark:text-blue-400 mt-1 block">
              {aggregates.moreThanThreeYesterday.toLocaleString()}
            </span>
            <span className="text-[11px] text-[var(--muted)] mt-1 block">
              أداء مرتفع يوم أمس
            </span>
          </div>
        </div>
      )}

      {/* Reports Display: Cards View */}
      {viewMode === "cards" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--muted)]">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--brand)]" />
              جارٍ استخراج بيانات التقرير الإداري...
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center text-sm text-[var(--muted)]">
              لا توجد بيانات تقرير إداري للتاريخ أو الكفيل المحدد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((rep) => (
                <div
                  key={rep.sponsorId}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm space-y-4 hover:border-[var(--brand)] transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-indigo-600 shrink-0" />
                        <h3 className="font-bold text-base text-[var(--foreground)]">
                          {rep.sponsorNameAr}
                        </h3>
                      </div>
                      <span className="text-xs text-[var(--muted)] mt-0.5 block">
                        التطبيق: {rep.application || "ذا شفز"}
                      </span>
                    </div>

                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--subtle-bg)] text-[var(--muted)]" dir="ltr">
                      دورة: {rep.cycleFrom}
                    </span>
                  </div>

                  {/* Metrics grid */}
                  <div className="space-y-2.5 text-xs">
                    {/* Cycle Orders */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--subtle-bg)]">
                      <span className="text-[var(--muted)]">إجمالي طلبات الدورة</span>
                      <span className="font-extrabold font-mono text-sm text-indigo-600 dark:text-indigo-400">
                        {rep.cycleOrders.toLocaleString()}
                      </span>
                    </div>

                    {/* Below 3 orders in cycle */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--subtle-bg)]">
                      <span className="text-[var(--muted)]">حسابات بأقل من 3 طلبات بالدورة</span>
                      <span className="font-bold font-mono text-sm text-rose-600 dark:text-rose-400">
                        {rep.accountsBelowThreeOrdersInCycle.toLocaleString()}
                      </span>
                    </div>

                    {/* Riders with orders yesterday */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--subtle-bg)]">
                      <span className="text-[var(--muted)]">مناديب نفذوا طلبات بالأمس</span>
                      <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        {rep.ridersWithOrdersYesterday.toLocaleString()}
                      </span>
                    </div>

                    {/* Riders <= 3 orders yesterday */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--subtle-bg)]">
                      <span className="text-[var(--muted)]">مناديب بـ 3 طلبات أو أقل بالأمس</span>
                      <span className="font-bold font-mono text-sm text-amber-600 dark:text-amber-400">
                        {rep.ridersWithThreeOrFewerOrdersYesterday.toLocaleString()}
                      </span>
                    </div>

                    {/* Riders > 3 orders yesterday */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--subtle-bg)]">
                      <span className="text-[var(--muted)]">مناديب بأكثر من 3 طلبات بالأمس</span>
                      <span className="font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
                        {rep.ridersWithMoreThanThreeOrdersYesterday.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: dates */}
                  <div className="border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)] flex items-center justify-between">
                    <span>تاريخ التقرير: {rep.reportDate}</span>
                    <span>الأداء: {rep.performanceDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Display: Comparison Table View */}
      {viewMode === "table" && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3.5">اسم الشركة / الكفيل</th>
                  <th className="px-4 py-3.5 text-center">بداية الدورة</th>
                  <th className="px-4 py-3.5 text-center">طلبات الدورة</th>
                  <th className="px-4 py-3.5 text-center">حسابات &lt; 3 بالدورة</th>
                  <th className="px-4 py-3.5 text-center">مناديب نشطين بالأمس</th>
                  <th className="px-4 py-3.5 text-center">مناديب ≤ 3 طلبات بالأمس</th>
                  <th className="px-4 py-3.5 text-center">مناديب &gt; 3 طلبات بالأمس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[var(--muted)]">
                      <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--brand)]" />
                      جارٍ تحميل التقرير الإداري...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[var(--muted)]">
                      لا توجد بيانات متاحة للتاريخ المحدد.
                    </td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr key={rep.sponsorId} className="transition-colors hover:bg-[var(--table-row-hover)]">
                      <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                        {rep.sponsorNameAr}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs text-[var(--muted)]" dir="ltr">
                        {rep.cycleFrom}
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400" dir="ltr">
                        {rep.cycleOrders.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-rose-600 dark:text-rose-400" dir="ltr">
                        {rep.accountsBelowThreeOrdersInCycle.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                        {rep.ridersWithOrdersYesterday.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-amber-600 dark:text-amber-400" dir="ltr">
                        {rep.ridersWithThreeOrFewerOrdersYesterday.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-blue-600 dark:text-blue-400" dir="ltr">
                        {rep.ridersWithMoreThanThreeOrdersYesterday.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <ChefzPerformanceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {
          loadReport();
        }}
      />
    </div>
  );
}
