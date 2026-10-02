"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarDays,
  Download,
  RefreshCw,
  Car,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  ChevronDown,
  Info,
  Filter,
  Gauge,
  Navigation,
  FileText,
  Building2,
  Calendar,
  X,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  getVehicleDailyDistanceReport,
  getAppliedSourceInfo,
  getDailyDistanceErrorMessage,
  type VehicleDailyDistanceReportResponse,
  type VehicleDailyReportDay,
  type VehicleReportIdentity,
} from "@/lib/fleet/daily-distances-api";
import { getAllVehicles } from "@/lib/fleet/api";
import { formatVehicleType, formatVehicleOperationalStatus } from "@/lib/fleet/formatters";
import {
  getRiyadhTodayDate,
  getRiyadhFirstDayOfMonth,
  formatRiyadhDateTime,
} from "@/lib/reports/utils";
import type { VehicleSummaryResponse } from "@/lib/fleet/types";

export interface VehicleDailyDistanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVehicleId?: string | null;
  initialFromDate?: string;
  initialToDate?: string;
  initialVehicleInfo?: {
    assetNumber?: string | null;
    plateNumberAr?: string | null;
    plateNumberEn?: string | null;
    operatingCity?: string | null;
  };
}

function getLastMonthRange(): { fromDate: string; toDate: string } {
  const today = getRiyadhTodayDate();
  const [y, m] = today.split("-").map(Number);
  const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
  const prevYear = prevMonthDate.getUTCFullYear();
  const prevMonth = String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0");
  const lastDayDate = new Date(Date.UTC(y, m - 1, 0));
  const lastDay = String(lastDayDate.getUTCDate()).padStart(2, "0");
  return {
    fromDate: `${prevYear}-${prevMonth}-01`,
    toDate: `${prevYear}-${prevMonth}-${lastDay}`,
  };
}

function getLastNDaysRange(days: number): { fromDate: string; toDate: string } {
  const today = getRiyadhTodayDate();
  const todayDate = new Date(today);
  const pastDate = new Date(todayDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const from = pastDate.toISOString().slice(0, 10);
  return { fromDate: from, toDate: today };
}

export function VehicleDailyDistanceReportModal({
  isOpen,
  onClose,
  initialVehicleId,
  initialFromDate,
  initialToDate,
  initialVehicleInfo,
}: VehicleDailyDistanceReportModalProps) {
  // Date range states
  const defaultFrom = initialFromDate || getRiyadhFirstDayOfMonth();
  const defaultTo = initialToDate || getRiyadhTodayDate();

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicleId || "");

  // Vehicle lookup states
  const [vehiclesList, setVehiclesList] = useState<VehicleSummaryResponse[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Report data states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<VehicleDailyDistanceReportResponse | null>(null);
  const [exporting, setExporting] = useState(false);

  // Table filter tab state
  const [tableFilter, setTableFilter] = useState<"all" | "recorded" | "missing" | "gps" | "manual">("all");
  const [tableSearch, setTableSearch] = useState("");

  // Sync props when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      if (initialVehicleId) {
        setSelectedVehicleId(initialVehicleId);
      }
      if (initialFromDate) setFromDate(initialFromDate);
      if (initialToDate) setToDate(initialToDate);
    }
  }, [isOpen, initialVehicleId, initialFromDate, initialToDate]);

  // Load vehicles list for search dropdown
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingVehicles(true);
    getAllVehicles()
      .then((data) => {
        if (isMounted) setVehiclesList(data || []);
      })
      .catch((err) => {
        console.warn("Failed to load vehicle list for report modal:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingVehicles(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filtered vehicles for dropdown (Search by Plate and Serial Number only)
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehiclesList.slice(0, 30);
    const q = vehicleSearch.trim().toLowerCase();
    return vehiclesList
      .filter((v) => {
        const arPlate = (v.plateNumberAr || "").toLowerCase();
        const enPlate = (v.plateNumberEn || "").toLowerCase();
        const serial = (v.serialNumber || "").toLowerCase();
        return arPlate.includes(q) || enPlate.includes(q) || serial.includes(q);
      })
      .slice(0, 30);
  }, [vehiclesList, vehicleSearch]);

  // Selected vehicle metadata from vehicle list or report (Plate and Serial Number only)
  const currentVehicleMeta = useMemo(() => {
    const found = vehiclesList.find((v) => v.id === selectedVehicleId);
    if (found) {
      return {
        vehicleId: found.id,
        plateNumberAr: found.plateNumberAr,
        plateNumberEn: found.plateNumberEn,
        serialNumber: found.serialNumber || null,
        vehicleType: (found.vehicleType as number) || 2,
        currentOperationalStatus: (found.status as number) || 1,
        operatingCityId: found.operatingCityId,
        operatingCity: found.operatingCity,
      };
    }
    if (report?.vehicle) {
      const vFound = vehiclesList.find((v) => v.id === report.vehicle.vehicleId);
      return {
        vehicleId: report.vehicle.vehicleId,
        plateNumberAr: report.vehicle.plateNumberAr,
        plateNumberEn: report.vehicle.plateNumberEn,
        serialNumber: vFound?.serialNumber || null,
        vehicleType: report.vehicle.vehicleType,
        currentOperationalStatus: report.vehicle.currentOperationalStatus,
        operatingCityId: report.vehicle.operatingCityId,
        operatingCity: report.vehicle.operatingCity,
      };
    }
    if (initialVehicleInfo && selectedVehicleId) {
      return {
        vehicleId: selectedVehicleId,
        plateNumberAr: initialVehicleInfo.plateNumberAr || null,
        plateNumberEn: initialVehicleInfo.plateNumberEn || null,
        serialNumber: null,
        vehicleType: 2,
        currentOperationalStatus: 2,
        operatingCityId: null,
        operatingCity: initialVehicleInfo.operatingCity || null,
      };
    }
    return null;
  }, [report, vehiclesList, selectedVehicleId, initialVehicleInfo]);

  // Fetch report function
  const fetchReport = useCallback(
    async (vehicleIdToFetch = selectedVehicleId, from = fromDate, to = toDate) => {
      if (!vehicleIdToFetch) {
        setError("يرجى اختيار مركبة لعرض تقرير المسافات اليومية.");
        return;
      }
      if (!from || !to) {
        setError("يرجى تحديد تاريخ بداية ونهاية التقرير.");
        return;
      }
      if (from > to) {
        setError("تاريخ النهاية يجب أن يكون لاحقاً أو مساوياً لتاريخ البداية.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getVehicleDailyDistanceReport(vehicleIdToFetch, {
          fromDate: from,
          toDate: to,
        });
        setReport(data);
      } catch (err: any) {
        console.error("Failed to fetch vehicle daily distance report:", err);
        const code = err?.code || err?.message;
        const mapped = getDailyDistanceErrorMessage(code, err?.message);
        setError(`${mapped.title}: ${mapped.description}`);
      } finally {
        setLoading(false);
      }
    },
    [selectedVehicleId, fromDate, toDate]
  );

  // Auto-fetch report when modal opens if vehicleId is ready
  useEffect(() => {
    if (isOpen && selectedVehicleId && fromDate && toDate) {
      fetchReport(selectedVehicleId, fromDate, toDate);
    }
  }, [isOpen, selectedVehicleId]);

  // Preset Handlers
  const handleApplyPreset = (type: "thisMonth" | "lastMonth" | "last7" | "last30") => {
    let range: { fromDate: string; toDate: string };
    if (type === "thisMonth") {
      range = { fromDate: getRiyadhFirstDayOfMonth(), toDate: getRiyadhTodayDate() };
    } else if (type === "lastMonth") {
      range = getLastMonthRange();
    } else if (type === "last7") {
      range = getLastNDaysRange(7);
    } else {
      range = getLastNDaysRange(30);
    }
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    if (selectedVehicleId) {
      fetchReport(selectedVehicleId, range.fromDate, range.toDate);
    }
  };

  // Filtered days table
  const displayedDays = useMemo(() => {
    if (!report?.days) return [];
    return report.days.filter((day) => {
      // Tab filter
      if (tableFilter === "recorded" && !day.hasDistance) return false;
      if (tableFilter === "missing" && day.hasDistance) return false;
      if (tableFilter === "gps" && Number(day.appliedSource) !== 2) {
        return false;
      }
      if (tableFilter === "manual" && Number(day.appliedSource) !== 1) {
        return false;
      }

      // Search filter
      if (tableSearch.trim()) {
        const q = tableSearch.trim().toLowerCase();
        const dateMatch = day.workDate.includes(q);
        const notesMatch = (day.manualNotes || "").toLowerCase().includes(q);
        const plateMatch = (day.gpsPlateNumber || "").toLowerCase().includes(q);
        if (!dateMatch && !notesMatch && !plateMatch) return false;
      }

      return true;
    });
  }, [report, tableFilter, tableSearch]);

  // Export to Excel handler
  const handleExportExcel = async () => {
    if (!report || !report.days.length) {
      toast.warning("لا توجد بيانات متاحة للتصدير");
      return;
    }

    try {
      setExporting(true);
      const vehicleName = report.vehicle.assetNumber || report.vehicle.vehicleId;
      const filename = `تقرير_مسافات_المركبة_${vehicleName}_${report.fromDate}_${report.toDate}.xlsx`;

      await exportToExcel({
        filename,
        sheetName: "تفاصيل المسافات اليومية",
        data: report.days,
        columns: [
          { header: "تاريخ العمل", accessor: (item) => item.workDate, isText: true, width: 14 },
          {
            header: "حالة التغطية",
            accessor: (item) => (item.hasDistance ? "مغطى" : "بدون سجل مسافة"),
            width: 16,
          },
          {
            header: "وجود سجل",
            accessor: (item) => (item.hasRecord ? "نعم" : "لا"),
            width: 12,
          },
          {
            header: "مسافة GPS (كم)",
            accessor: (item) => (item.gpsDistanceKm != null ? item.gpsDistanceKm : "—"),
            width: 16,
          },
          {
            header: "رقم لوحة GPS",
            accessor: (item) => item.gpsPlateNumber || "—",
            isText: true,
            width: 14,
          },
          {
            header: "قراءة العداد اليدوية (كم)",
            accessor: (item) => (item.manualOdometerReading != null ? item.manualOdometerReading : "—"),
            width: 20,
          },
          {
            header: "قراءة الأساس السابقة (كم)",
            accessor: (item) => (item.manualBaselineOdometerReading != null ? item.manualBaselineOdometerReading : "—"),
            width: 20,
          },
          {
            header: "مسافة العداد المحسوبة (كم)",
            accessor: (item) => (item.manualDistanceKm != null ? item.manualDistanceKm : "—"),
            width: 20,
          },
          {
            header: "المسافة المعتمدة (كم)",
            accessor: (item) => item.appliedDistanceKm ?? 0,
            width: 18,
          },
          {
            header: "المصدر المعتمد",
            accessor: (item) => {
              const info = getAppliedSourceInfo(item.appliedSource);
              return info.labelAr;
            },
            width: 16,
          },
          {
            header: "العداد التراكمي بعد اليوم (كم)",
            accessor: (item) => (item.effectiveOdometerAfterKm != null ? item.effectiveOdometerAfterKm : "—"),
            width: 22,
          },
          {
            header: "ملاحظات الإدخال اليدوي",
            accessor: (item) => item.manualNotes || "—",
            width: 25,
          },
          {
            header: "وقت رفع GPS (توقيت الرياض)",
            accessor: (item) => formatRiyadhDateTime(item.gpsImportedAtUtc),
            width: 22,
          },
          {
            header: "وقت الإدخال اليدوي (توقيت الرياض)",
            accessor: (item) => formatRiyadhDateTime(item.manualEnteredAtUtc),
            width: 22,
          },
        ],
      });

      toast.success("تم تصدير التقرير بنجاح");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تقرير مسافات المركبة (GPS واليدوي)"
      maxWidth="max-w-7xl"
    >
      <div className="space-y-5" dir="rtl">
        {/* Controls Bar */}
        <Card className="p-4 bg-[var(--surface)] border-[var(--border)] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
              <FileSpreadsheet className="h-4 w-4 text-[#1167c9]" />
              <span>تفاصيل المسافات اليومية لمركبة محددة مع مطابقة GPS والعداد اليدوي</span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[var(--muted)] font-medium ml-1">فترات سريعة:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset("thisMonth")}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
              >
                الشهر الحالي
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("lastMonth")}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                الشهر السابق
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("last7")}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                آخر 7 أيام
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("last30")}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
              >
                آخر 30 يوماً
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Vehicle Selector */}
            <div className="md:col-span-5 relative">
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                المركبة المستهدفة <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between border border-[var(--border)] rounded-xl px-3 py-2 bg-[var(--surface)] text-xs cursor-pointer hover:border-[#1167c9] transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Car className="h-4 w-4 text-[#1167c9] shrink-0" />
                    {currentVehicleMeta ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-sm text-[var(--foreground)] font-mono">
                          {currentVehicleMeta.plateNumberAr || currentVehicleMeta.plateNumberEn || "—"}
                        </span>
                        {currentVehicleMeta.serialNumber && (
                          <span className="text-[11px] text-[var(--muted)] font-mono">
                            (تسلسلي: {currentVehicleMeta.serialNumber})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">ابحث باللوحة أو الرقم التسلسلي...</span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-[var(--muted)] shrink-0" />
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-2 max-h-72 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[var(--muted)]" />
                      <Input
                        type="text"
                        placeholder="ابحث برقم اللوحة أو الرقم التسلسلي..."
                        value={vehicleSearch}
                        onChange={(e) => setVehicleSearch(e.target.value)}
                        className="text-xs pr-8 py-1.5 h-8"
                        autoFocus
                      />
                    </div>
                    {loadingVehicles ? (
                      <div className="py-4 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#1167c9]" />
                        <span>جاري تحميل قائمة المركبات...</span>
                      </div>
                    ) : filteredVehicles.length === 0 ? (
                      <div className="py-3 text-center text-xs text-[var(--muted)]">
                        لم يتم العثور على مركبات مطابقة
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredVehicles.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => {
                              setSelectedVehicleId(v.id);
                              setIsDropdownOpen(false);
                              fetchReport(v.id, fromDate, toDate);
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                              selectedVehicleId === v.id
                                ? "bg-blue-50 dark:bg-blue-950/60 font-bold text-[#1167c9]"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--foreground)]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm">
                                {v.plateNumberAr || v.plateNumberEn || "—"}
                              </span>
                              {v.serialNumber && (
                                <span className="text-[11px] text-[var(--muted)] font-mono">
                                  تسلسلي: {v.serialNumber}
                                </span>
                              )}
                            </div>
                            {v.operatingCity && (
                              <span className="text-[11px] text-[var(--muted)] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {v.operatingCity}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* From Date */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                من تاريخ <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs py-1.5 h-9"
              />
            </div>

            {/* To Date */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                إلى تاريخ <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs py-1.5 h-9"
              />
            </div>

            {/* Actions */}
            <div className="md:col-span-3 flex items-center gap-2">
              <Button
                onClick={() => fetchReport()}
                disabled={loading || !selectedVehicleId}
                className="flex-1 bg-[#1167c9] hover:bg-blue-700 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>عرض التقرير</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleExportExcel}
                disabled={exporting || !report?.days?.length}
                className="gap-1.5 text-xs font-bold h-9"
                title="تصدير إلى Excel"
              >
                <Download className="h-3.5 w-3.5 text-[#1167c9]" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Error Alert */}
        {error && (
          <Card className="p-4 bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">{error}</p>
              <p className="text-[11px] text-red-700 dark:text-red-300">
                يرجى التأكد من اختيار مركبة موجودة وصحة نطاق التواريخ (ألا يتجاوز 366 يوماً).
              </p>
            </div>
          </Card>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="p-12 text-center text-xs text-[var(--muted)] space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-[#1167c9] mx-auto" />
            <p className="font-bold text-sm text-[var(--foreground)]">جاري جلب تقرير المسافات اليومية للمركبة...</p>
            <p className="text-xs">يتم استرجاع سجلات GPS والعداد اليدوي وحساب الفجوات للفترة المحددة</p>
          </div>
        )}

        {/* Main Content when Report is loaded */}
        {!loading && report && (
          <div className="space-y-4">
            {/* Vehicle Metadata Header Card */}
            <Card className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50/70 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900/40 border-blue-200 dark:border-blue-900/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
                    <Car className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-[var(--foreground)] font-mono">
                        {currentVehicleMeta?.plateNumberAr || currentVehicleMeta?.plateNumberEn || "—"}
                      </h3>
                      {currentVehicleMeta?.serialNumber && (
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-[#1167c9] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          الرقم التسلسلي: {currentVehicleMeta.serialNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)] mt-1">
                      <span>النوع: <strong>{formatVehicleType(report.vehicle.vehicleType)}</strong></span>
                      <span>•</span>
                      <span>الحالة: <strong>{formatVehicleOperationalStatus(report.vehicle.currentOperationalStatus)}</strong></span>
                      {report.vehicle.operatingCity && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-red-500" />
                            <strong>{report.vehicle.operatingCity}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left font-mono text-xs text-[var(--muted)] bg-white/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-[var(--border)]">
                  <div>الفترة: <strong className="text-[var(--foreground)]">{report.fromDate}</strong> إلى <strong className="text-[var(--foreground)]">{report.toDate}</strong></div>
                  <div className="text-[11px] mt-0.5">إجمالي الأيام: <strong>{report.totalDays}</strong> يوم</div>
                </div>
              </div>
            </Card>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Applied Total Km (Primary Focus) */}
              <Card className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-md space-y-1">
                <span className="text-[11px] font-bold text-blue-100 flex items-center justify-between">
                  <span>المسافة المعتمدة</span>
                  <Gauge className="h-4 w-4 text-blue-200" />
                </span>
                <p className="text-xl font-black font-mono">
                  {report.appliedTotalKm.toLocaleString()}
                  <span className="text-xs font-normal text-blue-200 mr-1">كم</span>
                </p>
                <span className="text-[10px] text-blue-200 block truncate" title="الأولوية لـ GPS دون تكرار">
                  صافي مسافة الفترة
                </span>
              </Card>

              {/* GPS Total Km */}
              <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>مسافة GPS الكلية</span>
                  <Navigation className="h-4 w-4 text-emerald-600" />
                </span>
                <p className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                  {report.gpsTotalKm.toLocaleString()}
                  <span className="text-xs font-normal text-emerald-600/70 mr-1">كم</span>
                </p>
                <span className="text-[11px] text-emerald-800/80 dark:text-emerald-400 font-semibold">
                  مغطى في <strong>{report.gpsDays}</strong> يوم
                </span>
              </Card>

              {/* Manual Total Km */}
              <Card className="p-3 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>مسافة العداد اليدوي</span>
                  <Clock className="h-4 w-4 text-amber-600" />
                </span>
                <p className="text-xl font-black font-mono text-amber-700 dark:text-amber-300">
                  {report.manualTotalKm.toLocaleString()}
                  <span className="text-xs font-normal text-amber-600/70 mr-1">كم</span>
                </p>
                <span className="text-[11px] text-amber-800/80 dark:text-amber-400 font-semibold">
                  مغطى في <strong>{report.manualDays}</strong> يوم
                </span>
              </Card>

              {/* Manual Fallback Days */}
              <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>أيام السقوط اليدوي</span>
                  <FileText className="h-4 w-4 text-slate-500" />
                </span>
                <p className="text-xl font-black font-mono text-slate-800 dark:text-slate-200">
                  {report.manualFallbackDays}
                  <span className="text-xs font-normal text-slate-500 mr-1">أيام</span>
                </p>
                <span className="text-[10px] text-slate-500 block truncate" title="تم اعتماد اليدوي لغياب GPS">
                  يدوي بديل لغياب GPS
                </span>
              </Card>

              {/* Recorded Days */}
              <Card className="p-3 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/60 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 flex items-center justify-between">
                  <span>الأيام المغطاة</span>
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                </span>
                <p className="text-xl font-black font-mono text-teal-700 dark:text-teal-300">
                  {report.recordedDays}
                  <span className="text-xs font-normal text-teal-600/70 mr-1">/ {report.totalDays}</span>
                </p>
                <span className="text-[11px] text-teal-800/80 dark:text-teal-400 font-semibold">
                  نسبة التغطية: <strong>{report.totalDays > 0 ? Math.round((report.recordedDays / report.totalDays) * 100) : 0}%</strong>
                </span>
              </Card>

              {/* Missing Days */}
              <Card
                className={`p-3 rounded-xl space-y-1 ${
                  report.missingDays > 0
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                    : "bg-slate-50 dark:bg-slate-800/50 border-[var(--border)] text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="text-[11px] font-bold flex items-center justify-between">
                  <span>الأيام المفقودة</span>
                  <AlertCircle className={`h-4 w-4 ${report.missingDays > 0 ? "text-rose-600" : "text-slate-400"}`} />
                </span>
                <p className={`text-xl font-black font-mono ${report.missingDays > 0 ? "text-rose-700 dark:text-rose-300" : ""}`}>
                  {report.missingDays}
                  <span className="text-xs font-normal mr-1">أيام</span>
                </p>
                <span className="text-[10px] block truncate">
                  {report.missingDays > 0 ? "فجوات بدون مسافة" : "تغطية كاملة"}
                </span>
              </Card>
            </div>

            {/* Daily Records Table */}
            <Card className="border-[var(--border)] overflow-hidden">
              {/* Table Toolbar */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTableFilter("all")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      tableFilter === "all"
                        ? "bg-[#1167c9] text-white shadow-sm"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--muted)]"
                    }`}
                  >
                    كل الأيام ({report.totalDays})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter("recorded")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      tableFilter === "recorded"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    مغطى ({report.recordedDays})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter("missing")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      tableFilter === "missing"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    بدون مسافة ({report.missingDays})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter("gps")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      tableFilter === "gps"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    GPS معتمد ({report.gpsDays})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter("manual")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      tableFilter === "manual"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    يدوي بديل ({report.manualFallbackDays})
                  </button>
                </div>

                {/* Table Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[var(--muted)]" />
                  <Input
                    type="text"
                    placeholder="ابحث بالتاريخ، الملاحظات..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="text-xs pr-8 py-1.5 h-8 w-full"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-[var(--border)] text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-3 whitespace-nowrap">تاريخ العمل</th>
                      <th className="p-3 whitespace-nowrap">حالة التغطية</th>
                      <th className="p-3 whitespace-nowrap">مسافة GPS (كم)</th>
                      <th className="p-3 whitespace-nowrap">عداد يدوي (Odo)</th>
                      <th className="p-3 whitespace-nowrap">الأساس السابق (Base)</th>
                      <th className="p-3 whitespace-nowrap">مسافة العداد (كم)</th>
                      <th className="p-3 whitespace-nowrap text-[#1167c9]">المسافة المعتمدة (كم)</th>
                      <th className="p-3 whitespace-nowrap">المصدر</th>
                      <th className="p-3 whitespace-nowrap">العداد التراكمي الفعلي</th>
                      <th className="p-3 whitespace-nowrap min-w-[180px]">الملاحظات وتفاصيل التدقيق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {displayedDays.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-xs text-[var(--muted)]">
                          لا توجد سجلات مطابقة لمعايير البحث
                        </td>
                      </tr>
                    ) : (
                      displayedDays.map((day) => {
                        const isMissing = !day.hasDistance;
                        const sourceInfo = getAppliedSourceInfo(day.appliedSource);

                        return (
                          <tr
                            key={day.workDate}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                              isMissing ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                            }`}
                          >
                            {/* Work Date */}
                            <td className="p-3 whitespace-nowrap font-mono font-bold text-[var(--foreground)]">
                              {day.workDate}
                            </td>

                            {/* Coverage Status Badge */}
                            <td className="p-3 whitespace-nowrap">
                              {day.hasDistance ? (
                                <Badge
                                  tone={sourceInfo.badgeTone === "emerald" ? "green" : sourceInfo.badgeTone === "amber" ? "orange" : "gray"}
                                  className="text-[11px]"
                                >
                                  {sourceInfo.labelAr}
                                </Badge>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-300">
                                  بدون سجل مسافة
                                </span>
                              )}
                              {day.hasRecord && !day.hasDistance && (
                                <span className="mr-1 text-[10px] text-slate-500 block">
                                  (سجل بدون مسافة صالحة)
                                </span>
                              )}
                            </td>

                            {/* GPS Distance */}
                            <td className="p-3 whitespace-nowrap font-mono">
                              {day.gpsDistanceKm != null ? (
                                <div className="space-y-0.5">
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                    {day.gpsDistanceKm.toLocaleString()} كم
                                  </span>
                                  {day.gpsPlateNumber && (
                                    <span className="block text-[10px] text-[var(--muted)]">
                                      لوحة: {day.gpsPlateNumber}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Manual Odometer */}
                            <td className="p-3 whitespace-nowrap font-mono">
                              {day.manualOdometerReading != null ? (
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {day.manualOdometerReading.toLocaleString()} كم
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Manual Baseline */}
                            <td className="p-3 whitespace-nowrap font-mono text-[var(--muted)]">
                              {day.manualBaselineOdometerReading != null ? (
                                <span>{day.manualBaselineOdometerReading.toLocaleString()} كم</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Manual Distance */}
                            <td className="p-3 whitespace-nowrap font-mono">
                              {day.manualDistanceKm != null ? (
                                <span className="font-bold text-amber-700 dark:text-amber-300">
                                  {day.manualDistanceKm.toLocaleString()} كم
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Applied Distance */}
                            <td className="p-3 whitespace-nowrap font-mono font-bold text-sm bg-blue-50/40 dark:bg-blue-950/20">
                              <span className="text-[#1167c9] dark:text-blue-400">
                                {day.appliedDistanceKm != null ? day.appliedDistanceKm.toLocaleString() : "0"} كم
                              </span>
                            </td>

                            {/* Applied Source */}
                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${sourceInfo.colorClass}`}>
                                {sourceInfo.labelAr}
                              </span>
                            </td>

                            {/* Effective Odometer After Km */}
                            <td className="p-3 whitespace-nowrap font-mono text-xs">
                              {day.effectiveOdometerAfterKm != null ? (
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {day.effectiveOdometerAfterKm.toLocaleString()} كم
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Notes & Audit Timestamps */}
                            <td className="p-3 text-[11px]">
                              {day.manualNotes && (
                                <p className="text-slate-700 dark:text-slate-300 mb-1 flex items-start gap-1">
                                  <span className="text-blue-500 font-bold">📝</span>
                                  <span>{day.manualNotes}</span>
                                </p>
                              )}
                              <div className="space-y-0.5 text-[10px] text-[var(--muted)] font-mono">
                                {day.gpsImportedAtUtc && (
                                  <div>GPS: {formatRiyadhDateTime(day.gpsImportedAtUtc)}</div>
                                )}
                                {day.manualEnteredAtUtc && (
                                  <div>يدوي: {formatRiyadhDateTime(day.manualEnteredAtUtc)}</div>
                                )}
                              </div>
                              {!day.manualNotes && !day.gpsImportedAtUtc && !day.manualEnteredAtUtc && (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Modal>
  );
}
