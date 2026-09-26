"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  RefreshCw,
  Car,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { exportToExcel } from "@/lib/export-excel";
import { getRiderAssignmentsPeriodReport } from "@/lib/reports/api";
import type {
  RiderAssignmentsPeriodReport,
  RiderAssignmentsPeriodRow,
  VehicleRiderPeriodAssignment,
} from "@/lib/reports/types";

interface RiderAssignmentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  riderProfileId?: string | null;
  riderIqamaNo?: string | null;
  riderName?: string | null;
  employeeId?: string | null;
}

// Riyadh calendar date utilities (UTC+03:00)
function getRiyadhDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function getDefaultMonthRange(): { fromDate: string; toDate: string } {
  const today = getRiyadhDate(new Date());
  const [year, month] = today.split("-");
  return { fromDate: `${year}-${month}-01`, toDate: today };
}

function formatRiyadhDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function RiderAssignmentReportModal({
  isOpen,
  onClose,
  riderProfileId,
  riderIqamaNo,
  riderName,
  employeeId,
}: RiderAssignmentReportModalProps) {
  const initialRange = useMemo(() => getDefaultMonthRange(), []);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RiderAssignmentsPeriodReport | null>(null);

  // View mode: focused on this rider or showing all fleet riders
  const [viewScope, setViewScope] = useState<"current" | "all">("current");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [expandedRiderKey, setExpandedRiderKey] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("يرجى تحديد تاريخ البداية وتاريخ النهاية.");
      return;
    }
    if (toDate < fromDate) {
      setError("تاريخ النهاية يجب أن يكون مساوياً أو بعد تاريخ البداية.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getRiderAssignmentsPeriodReport(fromDate, toDate);
      setReport(data);
    } catch (err: unknown) {
      console.error("Failed to load rider assignments report:", err);
      const res = err as { status?: number; data?: { detail?: string; title?: string }; message?: string };
      if (res?.status === 403) {
        setError("لا تملك الصلاحية الكافية لعرض التقرير. يتطلب صلاحيات التقارير وإدارة المركبات والمناديب والتعيينات.");
      } else if (res?.data?.detail) {
        setError(res.data.detail);
      } else if (res?.message) {
        setError(res.message);
      } else {
        setError("تعذر جلب تقرير فترات تعيين المناديب. يرجى التحقق من الاتصال والمحاولة لاحقاً.");
      }
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, fetchReport]);

  // Match current rider in report.riders
  const currentRiderRow: RiderAssignmentsPeriodRow | undefined = useMemo(() => {
    if (!report?.riders || report.riders.length === 0) return undefined;

    const cleanIqama = riderIqamaNo?.trim();
    const cleanProfileId = riderProfileId?.trim().toLowerCase();
    const cleanEmpId = employeeId?.trim().toLowerCase();
    const cleanName = riderName?.trim().toLowerCase();

    return report.riders.find((r) => {
      // 1. By Iqama
      if (cleanIqama) {
        if (r.riderIqamaNo === cleanIqama) return true;
        if (r.riderKey.toLowerCase() === `iqama:${cleanIqama.toLowerCase()}`) return true;
        if (r.assignments?.some((a) => a.actualRiderIqamaNo === cleanIqama || a.assignedRiderIqamaNo === cleanIqama)) {
          return true;
        }
      }

      // 2. By riderProfileId
      if (cleanProfileId) {
        if (r.riderProfileId && r.riderProfileId.toLowerCase() === cleanProfileId) return true;
        const normalizedKey = cleanProfileId.replace(/-/g, "");
        if (r.riderKey.toLowerCase() === `profile:${normalizedKey}`) return true;
        if (
          r.assignments?.some(
            (a) =>
              a.actualRiderId?.toLowerCase() === cleanProfileId ||
              a.assignedRiderProfileId?.toLowerCase() === cleanProfileId
          )
        ) {
          return true;
        }
      }

      // 3. By employeeId
      if (cleanEmpId) {
        if (r.assignments?.some((a) => a.assignedEmployeeId?.toLowerCase() === cleanEmpId)) {
          return true;
        }
      }

      // 4. By name exact/partial match as fallback
      if (cleanName && r.riderName) {
        const rName = r.riderName.trim().toLowerCase();
        if (rName === cleanName) return true;
      }

      return false;
    });
  }, [report, riderIqamaNo, riderProfileId, employeeId, riderName]);

  const currentRiderAssignments = currentRiderRow?.assignments || [];

  // Filtered assignments for display
  const displayedAssignments = useMemo(() => {
    if (!search.trim()) return currentRiderAssignments;
    const q = search.trim().toLowerCase();
    return currentRiderAssignments.filter(
      (a) =>
        a.assetNumber?.toLowerCase().includes(q) ||
        a.plateNumberAr?.toLowerCase().includes(q) ||
        a.serialNumber?.toLowerCase().includes(q) ||
        a.assignedRiderName?.toLowerCase().includes(q) ||
        a.assignedRiderIqamaNo?.includes(q) ||
        a.relationshipToAssignedRider?.toLowerCase().includes(q)
    );
  }, [currentRiderAssignments, search]);

  // Filtered all-riders list for fleet view
  const displayedAllRiders = useMemo(() => {
    if (!report?.riders) return [];
    if (!search.trim()) return report.riders;
    const q = search.trim().toLowerCase();
    return report.riders.filter(
      (r) =>
        r.riderName?.toLowerCase().includes(q) ||
        r.riderIqamaNo?.includes(q) ||
        r.riderKey.toLowerCase().includes(q) ||
        r.assignments.some(
          (a) =>
            a.assetNumber?.toLowerCase().includes(q) ||
            a.plateNumberAr?.toLowerCase().includes(q) ||
            a.assignedRiderName?.toLowerCase().includes(q)
        )
    );
  }, [report, search]);

  // Quick Presets
  const applyPreset = (preset: "thisMonth" | "lastMonth" | "last30" | "last90") => {
    const todayStr = getRiyadhDate(new Date());
    const [y, m, d] = todayStr.split("-").map(Number);

    if (preset === "thisMonth") {
      const [yearStr, monthStr] = todayStr.split("-");
      setFromDate(`${yearStr}-${monthStr}-01`);
      setToDate(todayStr);
    } else if (preset === "lastMonth") {
      const prevMonth = m === 1 ? 12 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;
      const lastDay = new Date(prevYear, prevMonth, 0).getDate();
      const pMonthStr = String(prevMonth).padStart(2, "0");
      setFromDate(`${prevYear}-${pMonthStr}-01`);
      setToDate(`${prevYear}-${pMonthStr}-${String(lastDay).padStart(2, "0")}`);
    } else if (preset === "last30") {
      const dPast = new Date();
      dPast.setDate(dPast.getDate() - 30);
      setFromDate(getRiyadhDate(dPast));
      setToDate(todayStr);
    } else if (preset === "last90") {
      const dPast = new Date();
      dPast.setDate(dPast.getDate() - 90);
      setFromDate(getRiyadhDate(dPast));
      setToDate(todayStr);
    }
  };

  const handleExportExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const isScopeCurrent = viewScope === "current";
      const exportList: VehicleRiderPeriodAssignment[] = isScopeCurrent
        ? currentRiderAssignments
        : report.riders.flatMap((r) => r.assignments);

      await exportToExcel({
        filename: `rider-assignments-report-${fromDate}-to-${toDate}`,
        sheetName: "فترات تعيين المناديب",
        data: exportList,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: "السائق الفعلي", accessor: (item) => item.actualRiderName || (item.isRealRider ? item.assignedRiderName : "غير محدد"), width: 24 },
          { header: "هوية السائق الفعلي", accessor: (item) => item.actualRiderIqamaNo || "—", width: 18, isText: true },
          { header: "صفة السائق", accessor: (item) => (item.isRealRider ? "نفس المندوب الأصلي" : "سائق بديل"), width: 18 },
          { header: "المندوب المسجل للنظام", accessor: (item) => item.assignedRiderName || "—", width: 24 },
          { header: "هوية المندوب المسجل", accessor: (item) => item.assignedRiderIqamaNo || "—", width: 18, isText: true },
          { header: "صلة القرابة / العلاقة", accessor: (item) => item.relationshipToAssignedRider || "—", width: 20 },
          { header: "رقم الأصل للمركبة", accessor: (item) => item.assetNumber, width: 14, isText: true },
          { header: "اللوحة", accessor: (item) => item.plateNumberAr || "—", width: 14 },
          { header: "الرقم التسلسلي", accessor: (item) => item.serialNumber || "—", width: 16, isText: true },
          { header: "بداية التعيين المسجلة", accessor: (item) => formatRiyadhDateTime(item.startedAtUtc), width: 22 },
          { header: "نهاية التعيين المسجلة", accessor: (item) => (item.endedAtUtc ? formatRiyadhDateTime(item.endedAtUtc) : "مستمر (حالي)"), width: 22 },
          { header: "بداية الفترة المحتسبة", accessor: (item) => formatRiyadhDateTime(item.periodStartedAtUtc), width: 22 },
          { header: "نهاية الفترة المحتسبة", accessor: (item) => formatRiyadhDateTime(item.periodEndedAtUtc), width: 22 },
          { header: "الأيام المحتسبة بالفترة", accessor: (item) => Number(item.daysInPeriod.toFixed(2)), width: 18 },
          { header: "إجمالي أيام التعيين", accessor: (item) => Number(item.totalAssignmentDays.toFixed(2)), width: 18 },
        ],
      });
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تقرير فترات قيادة وتعيين المندوب (Rider Assignment Period Report)"
      maxWidth="max-w-5xl"
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Header Rider Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
              <User className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 dark:text-slate-100">
                  {riderName || currentRiderRow?.riderName || "المندوب"}
                </span>
                {(riderIqamaNo || currentRiderRow?.riderIqamaNo) && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-mono font-bold">
                    هوية: {riderIqamaNo || currentRiderRow?.riderIqamaNo}
                  </Badge>
                )}
                {currentRiderRow?.riderKey && (
                  <span className="text-[11px] text-[var(--muted)] font-mono">
                    المفتاح: {currentRiderRow.riderKey}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                سجل فترات استلام وقيادة المركبات الفعلية للمندوب في نطاق التقرير المحدد
              </p>
            </div>
          </div>

          {report?.asOfUtc && (
            <div className="text-left text-[11px] text-[var(--muted)]">
              <span className="block font-medium">محدّث حتى (As Of):</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {formatRiyadhDateTime(report.asOfUtc)}
              </span>
            </div>
          )}
        </div>

        {/* Date Filter & Control Toolbar */}
        <Card className="p-4 border-[var(--border)] bg-[var(--surface)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  فترة التقرير (بتوقيت الرياض شامل البداية والنهاية):
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset("thisMonth")}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  هذا الشهر
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("lastMonth")}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  الشهر الماضي
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("last30")}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  آخر 30 يوم
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("last90")}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                >
                  آخر 90 يوم
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--muted)]">من:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--muted)]">إلى:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold outline-none focus:border-emerald-600"
                />
              </div>

              <Button
                variant="primary"
                onClick={fetchReport}
                loading={loading}
                disabled={loading}
                className="gap-2 h-9 text-xs font-bold px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>تحديث التقرير</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleExportExcel}
                loading={exporting}
                disabled={exporting || loading || !report}
                className="gap-2 h-9 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 mr-auto"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>تصدير إكسل</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs font-bold">{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="font-bold text-sm">جارٍ جلب فترات تعيين المناديب عبر التقرير الشامل...</p>
          </div>
        )}

        {/* Results Body */}
        {!loading && report && (
          <div className="space-y-4">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                  أيام القيادة المحتسبة بالفترة
                </span>
                <span className="text-xl font-black text-emerald-950 dark:text-emerald-100 font-mono mt-1 block">
                  {currentRiderRow ? currentRiderRow.totalDaysWithVehiclesInPeriod.toFixed(2) : "0.00"}{" "}
                  <span className="text-xs font-normal">يوم</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">
                  عدد فترات التعيين
                </span>
                <span className="text-xl font-black text-blue-950 dark:text-blue-100 font-mono mt-1 block">
                  {currentRiderAssignments.length}{" "}
                  <span className="text-xs font-normal">فترة</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">
                  المركبات التي قادها
                </span>
                <span className="text-xl font-black text-purple-950 dark:text-purple-100 font-mono mt-1 block">
                  {new Set(currentRiderAssignments.map((a) => a.vehicleId)).size}{" "}
                  <span className="text-xs font-normal">مركبة</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-[var(--border)]">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  نطاق التقرير
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono mt-1.5 block">
                  {fromDate} إلى {toDate}
                </span>
              </div>
            </div>

            {/* Scope Switcher & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[var(--border)] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewScope("current")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewScope === "current"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  تعيينات هذا المندوب ({currentRiderAssignments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewScope === "all"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  كافة مناديب الأسطول النشطين بالفترة ({report.riders.length})
                </button>
              </div>

              {((viewScope === "current" && currentRiderAssignments.length > 0) || viewScope === "all") && (
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      viewScope === "current"
                        ? "بحث في أرقام المركبات أو اللوحات..."
                        : "بحث في أسماء أو هويات المناديب أو المركبات..."
                    }
                    className="w-full h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs outline-none focus:border-emerald-600"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Assignments View - Focus on Current Rider */}
            {viewScope === "current" ? (
              displayedAssignments.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 text-[var(--muted)] space-y-2">
                  <Clock className="h-8 w-8 mx-auto text-slate-400 opacity-60" />
                  <p className="font-bold text-sm">
                    {search
                      ? "لا توجد نتائج مطابقة لبحثك في تعيينات هذا المندوب."
                      : "لم يتم تسجيل أي فترات قيادة أو تعيين مركبات لهذا المندوب خلال الفترة المحددة."}
                  </p>
                  <p className="text-xs">
                    الفترة المحددة: {fromDate} إلى {toDate} (إجمالي الأيام: {currentRiderRow?.totalDaysWithVehiclesInPeriod || 0} يوم).
                  </p>
                  {report.riders.length > 0 && !currentRiderRow && (
                    <div className="pt-2">
                      <Button
                        variant="secondary"
                        onClick={() => setViewScope("all")}
                        className="text-xs gap-1.5"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>عرض كافة المناديب الذين قادوا مركبات بالفترة ({report.riders.length})</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-[var(--border)] font-bold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-3.5 py-3 text-start">#</th>
                          <th className="px-3.5 py-3 text-start">المركبة</th>
                          <th className="px-3.5 py-3 text-start">صفة السائق والتعيين</th>
                          <th className="px-3.5 py-3 text-start">الفترة المسجلة (الكلية)</th>
                          <th className="px-3.5 py-3 text-start">الفترة المحتسبة بالتقرير</th>
                          <th className="px-3.5 py-3 text-start">الأيام بالفترة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                        {displayedAssignments.map((assignment, idx) => {
                          const isOpenAssignment = !assignment.endedAtUtc;
                          return (
                            <tr
                              key={assignment.assignmentId || idx}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="px-3.5 py-3 font-mono text-[var(--muted)] font-medium">
                                {idx + 1}
                              </td>

                              {/* Vehicle */}
                              <td className="px-3.5 py-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/admin/fleet/vehicles/${assignment.vehicleId}`}
                                      className="font-bold text-[#1167c9] hover:underline flex items-center gap-1"
                                      target="_blank"
                                    >
                                      <span>{assignment.plateNumberAr || assignment.assetNumber}</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-mono">
                                      {assignment.assetNumber}
                                    </Badge>
                                  </div>
                                  {assignment.serialNumber && (
                                    <span className="text-[10px] text-[var(--muted)] font-mono block">
                                      SN: {assignment.serialNumber}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Driver Role & Actual Driver */}
                              <td className="px-3.5 py-3">
                                {assignment.isRealRider ? (
                                  <div className="space-y-0.5">
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                      <CheckCircle2 className="h-3 w-3 me-1 inline" />
                                      المندوب الأصلي (سائق فعلي)
                                    </Badge>
                                    {assignment.assignedRiderName && (
                                      <span className="text-[11px] text-[var(--muted)] block">
                                        مسجل باسم: {assignment.assignedRiderName}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                        سائق بديل
                                      </Badge>
                                      {assignment.relationshipToAssignedRider && (
                                        <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                                          العلاقة: {assignment.relationshipToAssignedRider}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-[var(--muted)] pt-0.5">
                                      <span>المندوب المسجل: </span>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {assignment.assignedRiderName || "غير محدد"}
                                      </span>
                                      {assignment.assignedRiderIqamaNo && (
                                        <span className="font-mono text-[10px] ms-1">
                                          ({assignment.assignedRiderIqamaNo})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Original Full Period */}
                              <td className="px-3.5 py-3">
                                <div className="space-y-0.5 text-[11px]">
                                  <div>
                                    <span className="text-[var(--muted)]">من: </span>
                                    <span className="font-mono">{formatRiyadhDateTime(assignment.startedAtUtc)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[var(--muted)]">إلى: </span>
                                    {isOpenAssignment ? (
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        مستمر (جارٍ)
                                      </span>
                                    ) : (
                                      <span className="font-mono">{formatRiyadhDateTime(assignment.endedAtUtc)}</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-[var(--muted)] block font-mono">
                                    إجمالي التعيين: {assignment.totalAssignmentDays.toFixed(2)} يوم
                                  </span>
                                </div>
                              </td>

                              {/* Clipped Period in Range */}
                              <td className="px-3.5 py-3">
                                <div className="space-y-0.5 text-[11px]">
                                  <div>
                                    <span className="text-[var(--muted)]">بداية: </span>
                                    <span className="font-mono font-medium">
                                      {formatRiyadhDateTime(assignment.periodStartedAtUtc)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[var(--muted)]">نهاية: </span>
                                    <span className="font-mono font-medium">
                                      {formatRiyadhDateTime(assignment.periodEndedAtUtc)}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Days in Period */}
                              <td className="px-3.5 py-3">
                                <div className="space-y-1">
                                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 font-mono font-bold text-xs">
                                    {assignment.daysInPeriod.toFixed(2)} يوم
                                  </Badge>
                                  {isOpenAssignment && (
                                    <span className="text-[10px] font-bold text-emerald-600 block">
                                      تعيين مفتوح حالياً
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : (
              /* Scope === "all": All Riders Across Fleet */
              <div className="space-y-3">
                <div className="text-xs text-[var(--muted)] flex items-center justify-between">
                  <span>
                    تم العثور على <strong>{displayedAllRiders.length}</strong> مندوب قادوا مركبات خلال الفترة.
                  </span>
                  <span className="text-[11px]">انقر على المندوب لعرض تفاصيل تعيينات مركباته.</span>
                </div>

                <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-xs divide-y divide-[var(--border)]">
                  {displayedAllRiders.length === 0 ? (
                    <div className="p-8 text-center text-[var(--muted)]">
                      لا يوجد مناديب مسجلين أو قادوا مركبات خلال هذه الفترة.
                    </div>
                  ) : (
                    displayedAllRiders.map((riderRow) => {
                      const isExpanded = expandedRiderKey === riderRow.riderKey;
                      const isTargetRider =
                        (riderIqamaNo && riderRow.riderIqamaNo === riderIqamaNo) ||
                        (riderProfileId && riderRow.riderProfileId === riderProfileId);

                      return (
                        <div
                          key={riderRow.riderKey}
                          className={`transition-colors ${
                            isTargetRider
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500"
                              : "bg-[var(--surface)] hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                          }`}
                        >
                          <div
                            onClick={() =>
                              setExpandedRiderKey(isExpanded ? null : riderRow.riderKey)
                            }
                            className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  isTargetRider
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-slate-100">
                                    {riderRow.riderName || "مندوب غير محدد"}
                                  </span>
                                  {isTargetRider && (
                                    <Badge className="bg-emerald-600 text-white text-[10px]">
                                      المندوب الحالي
                                    </Badge>
                                  )}
                                  {riderRow.riderIqamaNo && (
                                    <span className="text-xs font-mono text-[var(--muted)]">
                                      هوية: {riderRow.riderIqamaNo}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[var(--muted)] font-mono">
                                  المفتاح: {riderRow.riderKey}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-start">
                                <span className="text-[10px] text-[var(--muted)] block">المركبات</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {new Set(riderRow.assignments.map((a) => a.vehicleId)).size} مركبة
                                </span>
                              </div>

                              <div className="text-start">
                                <span className="text-[10px] text-[var(--muted)] block">الأيام المحتسبة</span>
                                <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                                  {riderRow.totalDaysWithVehiclesInPeriod.toFixed(2)} يوم
                                </span>
                              </div>

                              <div className="text-slate-400">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded assignments for this rider */}
                          {isExpanded && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border-t border-[var(--border)]">
                              <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                                <table className="w-full text-xs text-start">
                                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-[var(--border)]">
                                    <tr>
                                      <th className="px-3 py-2 text-start">#</th>
                                      <th className="px-3 py-2 text-start">المركبة</th>
                                      <th className="px-3 py-2 text-start">صفة السائق</th>
                                      <th className="px-3 py-2 text-start">المندوب المسجل</th>
                                      <th className="px-3 py-2 text-start">الفترة المحتسبة بالتقرير</th>
                                      <th className="px-3 py-2 text-start">الأيام بالفترة</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--border)]">
                                    {riderRow.assignments.map((assignment, aIdx) => (
                                      <tr key={assignment.assignmentId || aIdx}>
                                        <td className="px-3 py-2 font-mono text-[var(--muted)]">
                                          {aIdx + 1}
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="flex items-center gap-1.5 font-bold">
                                            <span>{assignment.plateNumberAr || assignment.assetNumber}</span>
                                            <Badge className="bg-slate-100 text-slate-700 text-[10px] font-mono">
                                              {assignment.assetNumber}
                                            </Badge>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2">
                                          {assignment.isRealRider ? (
                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                              سائق أصلي
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                              بديل {assignment.relationshipToAssignedRider ? `(${assignment.relationshipToAssignedRider})` : ""}
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="space-y-0.5">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                              {assignment.assignedRiderName || "—"}
                                            </span>
                                            {assignment.assignedRiderIqamaNo && (
                                              <span className="text-[10px] font-mono text-[var(--muted)]">
                                                هوية: {assignment.assignedRiderIqamaNo}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-[11px]">
                                          <div>{formatRiyadhDateTime(assignment.periodStartedAtUtc)}</div>
                                          <div>إلى: {formatRiyadhDateTime(assignment.periodEndedAtUtc)}</div>
                                        </td>
                                        <td className="px-3 py-2">
                                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono font-bold">
                                            {assignment.daysInPeriod.toFixed(2)} يوم
                                          </Badge>
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
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer info note */}
        <div className="pt-2 text-[11px] text-[var(--muted)] flex items-center justify-between border-t border-[var(--border)]">
          <span>
            * يتم احتساب الأيام بناءً على التواريخ بتوقيت الرياض (UTC+03:00) وتشمل البداية والنهاية. التعيينات المفتوحة تحسب حتى لحظة استخراج التقرير.
          </span>
          <Button variant="secondary" onClick={onClose} className="h-8 text-xs font-bold px-4">
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
