"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  RefreshCw,
  Car,
  User,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { exportToExcel } from "@/lib/export-excel";
import { getVehicleAssignmentsPeriodReport } from "@/lib/reports/api";
import type {
  VehicleAssignmentsPeriodReport,
  VehicleAssignmentsPeriodRow,
  VehicleRiderPeriodAssignment,
} from "@/lib/reports/types";

interface VehicleAssignmentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  assetNumber?: string | null;
  plateNumberAr?: string | null;
  serialNumber?: string | null;
  manufacturerModel?: string | null;
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

export function VehicleAssignmentReportModal({
  isOpen,
  onClose,
  vehicleId,
  assetNumber,
  plateNumberAr,
  serialNumber,
  manufacturerModel,
}: VehicleAssignmentReportModalProps) {
  const initialRange = useMemo(() => getDefaultMonthRange(), []);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<VehicleAssignmentsPeriodReport | null>(null);

  // View mode: focused on this vehicle or showing all vehicles
  const [viewScope, setViewScope] = useState<"current" | "all">("current");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

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
      const data = await getVehicleAssignmentsPeriodReport(fromDate, toDate);
      setReport(data);
    } catch (err: unknown) {
      console.error("Failed to load vehicle assignments report:", err);
      const res = err as { status?: number; data?: { detail?: string; title?: string }; message?: string };
      if (res?.status === 403) {
        setError("لا تملك الصلاحية الكافية لعرض التقرير. يتطلب صلاحيات التقارير وإدارة المركبات والتعيينات.");
      } else if (res?.data?.detail) {
        setError(res.data.detail);
      } else if (res?.message) {
        setError(res.message);
      } else {
        setError("تعذر جلب تقرير فترات التعيين. يرجى التحقق من الاتصال والمحاولة لاحقاً.");
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

  // Find target vehicle row in report
  const currentVehicleRow: VehicleAssignmentsPeriodRow | undefined = useMemo(() => {
    if (!report?.vehicles) return undefined;
    return report.vehicles.find(
      (v) =>
        v.vehicleId.toLowerCase() === vehicleId.toLowerCase() ||
        (assetNumber && v.assetNumber?.toLowerCase() === assetNumber.toLowerCase())
    );
  }, [report, vehicleId, assetNumber]);

  // Assignments for current vehicle
  const currentVehicleAssignments = currentVehicleRow?.assignments || [];

  // Filtered assignments for display
  const displayedAssignments = useMemo(() => {
    if (!search.trim()) return currentVehicleAssignments;
    const q = search.trim().toLowerCase();
    return currentVehicleAssignments.filter(
      (a) =>
        a.assignedRiderName?.toLowerCase().includes(q) ||
        a.assignedRiderIqamaNo?.includes(q) ||
        a.actualRiderName?.toLowerCase().includes(q) ||
        a.actualRiderIqamaNo?.includes(q) ||
        a.relationshipToAssignedRider?.toLowerCase().includes(q)
    );
  }, [currentVehicleAssignments, search]);

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
        ? currentVehicleAssignments
        : report.vehicles.flatMap((v) => v.assignments);

      await exportToExcel({
        filename: `vehicle-assignments-report-${fromDate}-to-${toDate}`,
        sheetName: "فترات تعيين المركبات",
        data: exportList,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: "رقم الأصل", accessor: (item) => item.assetNumber, width: 14, isText: true },
          { header: "اللوحة", accessor: (item) => item.plateNumberAr || "—", width: 14 },
          { header: "الرقم التسلسلي", accessor: (item) => item.serialNumber || "—", width: 16, isText: true },
          { header: "المندوب المسجل", accessor: (item) => item.assignedRiderName || "—", width: 24 },
          { header: "هوية المندوب المسجل", accessor: (item) => item.assignedRiderIqamaNo || "—", width: 18, isText: true },
          { header: "صفة السائق", accessor: (item) => item.isRealRider ? "نفس المندوب" : "سائق بديل / مختلف", width: 18 },
          { header: "السائق الفعلي", accessor: (item) => item.actualRiderName || (item.isRealRider ? item.assignedRiderName : "غير محدد"), width: 24 },
          { header: "هوية السائق الفعلي", accessor: (item) => item.actualRiderIqamaNo || "—", width: 18, isText: true },
          { header: "صلة القرابة / العلاقة", accessor: (item) => item.relationshipToAssignedRider || "—", width: 20 },
          { header: "بداية التعيين المسجلة", accessor: (item) => formatRiyadhDateTime(item.startedAtUtc), width: 22 },
          { header: "نهاية التعيين المسجلة", accessor: (item) => item.endedAtUtc ? formatRiyadhDateTime(item.endedAtUtc) : "مستمر (حالي)", width: 22 },
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
      title="تقرير فترات التعيين للمركبة (Assignment Period Report)"
      maxWidth="max-w-5xl"
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Header Vehicle Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1167c9] text-white shadow-xs">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 dark:text-slate-100">
                  {plateNumberAr || assetNumber || "مركبة"}
                </span>
                {assetNumber && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-mono font-bold">
                    {assetNumber}
                  </Badge>
                )}
                {serialNumber && (
                  <span className="text-xs text-[var(--muted)] font-mono">
                    SN: {serialNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {manufacturerModel || "سجل فترات تشغيل وعهدة المركبة مع المناديب"}
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
                <CalendarDays className="h-4 w-4 text-[#1167c9]" />
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
                  className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold outline-none focus:border-[#1167c9]"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--muted)]">إلى:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold outline-none focus:border-[#1167c9]"
                />
              </div>

              <Button
                variant="primary"
                onClick={fetchReport}
                loading={loading}
                disabled={loading}
                className="gap-2 h-9 text-xs font-bold px-4"
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
            <RefreshCw className="h-8 w-8 animate-spin text-[#1167c9]" />
            <p className="font-bold text-sm">جارٍ استخراج فترات التعيين للمركبة عبر التقرير الشامل...</p>
          </div>
        )}

        {/* Results Body */}
        {!loading && report && (
          <div className="space-y-4">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block">
                  أيام التعيين بالفترة
                </span>
                <span className="text-xl font-black text-blue-950 dark:text-blue-100 font-mono mt-1 block">
                  {currentVehicleRow ? currentVehicleRow.totalDaysAssignedInPeriod.toFixed(2) : "0.00"}{" "}
                  <span className="text-xs font-normal">يوم</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                  عدد فترات التعيين
                </span>
                <span className="text-xl font-black text-emerald-950 dark:text-emerald-100 font-mono mt-1 block">
                  {currentVehicleAssignments.length}{" "}
                  <span className="text-xs font-normal">فترة</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">
                  المناديب الفعليين
                </span>
                <span className="text-xl font-black text-purple-950 dark:text-purple-100 font-mono mt-1 block">
                  {
                    new Set(
                      currentVehicleAssignments
                        .map((a) => a.actualRiderIqamaNo || a.actualRiderName || a.assignedRiderIqamaNo)
                        .filter(Boolean)
                    ).size
                  }{" "}
                  <span className="text-xs font-normal">سائق</span>
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
                      ? "bg-white dark:bg-slate-900 text-[#1167c9] dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  تعيينات هذه المركبة ({currentVehicleAssignments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewScope("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewScope === "all"
                      ? "bg-white dark:bg-slate-900 text-[#1167c9] dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  كافة مركبات الأسطول ({report.vehicles.length})
                </button>
              </div>

              {viewScope === "current" && currentVehicleAssignments.length > 0 && (
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث في أسماء أو هويات المناديب..."
                    className="w-full h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs outline-none focus:border-[#1167c9]"
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

            {/* Assignments View - Focus on Current Vehicle */}
            {viewScope === "current" ? (
              displayedAssignments.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 text-[var(--muted)] space-y-2">
                  <Clock className="h-8 w-8 mx-auto text-slate-400 opacity-60" />
                  <p className="font-bold text-sm">
                    {search
                      ? "لا توجد نتائج مطابقة لبحثك في تعيينات هذه المركبة."
                      : "لا توجد فترات تعيين لهذه المركبة خلال الفترة المحددة."}
                  </p>
                  <p className="text-xs">
                    إجمالي الأيام المحتسبة داخل الفترة: {currentVehicleRow?.totalDaysAssignedInPeriod || 0} يوم.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-[var(--border)] font-bold text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-3.5 py-3 text-start">#</th>
                          <th className="px-3.5 py-3 text-start">المندوب المسجل (Assigned)</th>
                          <th className="px-3.5 py-3 text-start">السائق الفعلي (Actual Driver)</th>
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

                              {/* Assigned Rider */}
                              <td className="px-3.5 py-3">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                    {assignment.assignedRiderName || "مندوب مسجل"}
                                  </span>
                                  {assignment.assignedRiderIqamaNo && (
                                    <span className="text-[11px] font-mono text-[var(--muted)] block">
                                      هوية: {assignment.assignedRiderIqamaNo}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actual Driver */}
                              <td className="px-3.5 py-3">
                                {assignment.isRealRider ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <CheckCircle2 className="h-3 w-3 me-1 inline" />
                                    نفس المندوب
                                  </Badge>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-amber-900 dark:text-amber-200 block">
                                      {assignment.actualRiderName || "سائق بديل غير محدد"}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {assignment.actualRiderIqamaNo && (
                                        <span className="text-[11px] font-mono text-[var(--muted)]">
                                          هوية: {assignment.actualRiderIqamaNo}
                                        </span>
                                      )}
                                      {assignment.relationshipToAssignedRider && (
                                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0">
                                          {assignment.relationshipToAssignedRider}
                                        </Badge>
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
                              <td className="px-3.5 py-3 font-mono">
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs">
                                  {assignment.daysInPeriod.toFixed(2)} يوم
                                </Badge>
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
              /* All Fleet Vehicles List */
              <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-[var(--border)] font-bold text-slate-600 dark:text-slate-300 sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 text-start">رقم الأصل</th>
                        <th className="px-3.5 py-2.5 text-start">اللوحة</th>
                        <th className="px-3.5 py-2.5 text-start">الرقم التسلسلي</th>
                        <th className="px-3.5 py-2.5 text-start">أيام التعيين بالفترة</th>
                        <th className="px-3.5 py-2.5 text-start">فترات التعيين</th>
                        <th className="px-3.5 py-2.5 text-start"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                      {report.vehicles.map((v) => {
                        const isCurrent = v.vehicleId.toLowerCase() === vehicleId.toLowerCase();
                        return (
                          <tr
                            key={v.vehicleId}
                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                              isCurrent ? "bg-blue-50/50 dark:bg-blue-950/20 font-bold" : ""
                            }`}
                          >
                            <td className="px-3.5 py-2 font-mono">
                              {v.assetNumber}
                              {isCurrent && (
                                <span className="ms-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                                  (المركبة الحالية)
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2">{v.plateNumberAr || "—"}</td>
                            <td className="px-3.5 py-2 font-mono">{v.serialNumber || "—"}</td>
                            <td className="px-3.5 py-2 font-mono">
                              <span
                                className={
                                  v.totalDaysAssignedInPeriod > 0
                                    ? "text-blue-600 dark:text-blue-400 font-bold"
                                    : "text-[var(--muted)]"
                                }
                              >
                                {v.totalDaysAssignedInPeriod.toFixed(2)} يوم
                              </span>
                            </td>
                            <td className="px-3.5 py-2 font-mono">{v.assignments.length}</td>
                            <td className="px-3.5 py-2 text-end">
                              <Link
                                href={`/admin/fleet/vehicles/${v.vehicleId}`}
                                className="text-xs text-[#1167c9] hover:underline"
                              >
                                عرض المركبة
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
