"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Download,
  RefreshCw,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  Filter,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Gauge,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  getAllVehiclesDailyDistanceReport,
  fetchEntireFleetDailyDistanceReport,
  getAppliedSourceInfo,
  getDailyDistanceErrorMessage,
  type AllVehiclesDailyDistanceReportResponse,
  type VehicleDailyDistanceReportResponse,
  type VehicleDailyReportDay,
} from "@/lib/fleet/daily-distances-api";
import { formatVehicleType, formatVehicleOperationalStatus } from "@/lib/fleet/formatters";
import {
  getRiyadhTodayDate,
  getRiyadhFirstDayOfMonth,
  formatRiyadhDateTime,
} from "@/lib/reports/utils";

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

function FleetDailyDistanceReportContent() {
  const { can } = useAuth();
  const searchParams = useSearchParams();

  const paramFromDate = searchParams.get("fromDate") || "";
  const paramToDate = searchParams.get("toDate") || "";
  const paramPage = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
  const paramPageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : 20;

  // Date range states
  const [fromDate, setFromDate] = useState<string>(
    paramFromDate || getRiyadhFirstDayOfMonth()
  );
  const [toDate, setToDate] = useState<string>(
    paramToDate || getRiyadhTodayDate()
  );

  // Pagination states (backend max pageSize is 100)
  const [page, setPage] = useState<number>(paramPage > 0 ? paramPage : 1);
  const [pageSize, setPageSize] = useState<number>(
    paramPageSize > 0 && paramPageSize <= 100 ? paramPageSize : 20
  );

  // Filter & Search states
  const [search, setSearch] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Expanded vehicle items (for detailed days table in cards mode)
  const [expandedVehicleIds, setExpandedVehicleIds] = useState<Record<string, boolean>>({});

  // Data states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<AllVehiclesDailyDistanceReportResponse | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  // Validate date range (maximum 366 days as per backend specification)
  const validateDateRange = useCallback((from: string, to: string): boolean => {
    if (!from || !to) return false;
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();

    if (fromTime > toTime) {
      toast.error("خطأ في الفترة", "تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية");
      return false;
    }

    const diffDays = Math.ceil((toTime - fromTime) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 366) {
      toast.error("تجاوز الحد الأقصى", "الحد الأقصى للنطاق الزمني هو 366 يوماً (سنة كاملة)");
      return false;
    }

    return true;
  }, []);

  // Fetch Report Data from API across all vehicles in the fleet
  const fetchReport = useCallback(async () => {
    if (!validateDateRange(fromDate, toDate)) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchEntireFleetDailyDistanceReport({
        fromDate,
        toDate,
      });
      setReportData(res);
    } catch (err: any) {
      console.error("Fetch fleet daily distances report error:", err);
      const errorCode = err?.details?.errorCode || err?.code || err?.errorCode;
      const detailMsg =
        err?.details?.detail || err?.details?.message || err?.message || "تعذر تحميل تقرير مسافات الأسطول";
      const errInfo = getDailyDistanceErrorMessage(errorCode, detailMsg);
      setError(`${errInfo.title}: ${errInfo.description}`);
      toast.error(errInfo.title, errInfo.description);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, validateDateRange]);

  // Load report on mount or when fromDate/toDate change
  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate, fetchReport]);

  // Handle Search submit
  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchReport();
  };

  // Quick Range Setters
  const applyQuickRange = (range: { fromDate: string; toDate: string }) => {
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setPage(1);
  };

  // Toggle vehicle card expansion
  const toggleVehicleExpand = (vehicleId: string) => {
    setExpandedVehicleIds((prev) => ({
      ...prev,
      [vehicleId]: !prev[vehicleId],
    }));
  };

  // Expand / Collapse all on current page
  const toggleAllExpanded = (expand: boolean) => {
    const newState: Record<string, boolean> = {};
    if (expand) {
      displayedItems.forEach((item) => {
        newState[item.vehicle.vehicleId] = true;
      });
    }
    setExpandedVehicleIds(newState);
  };

  // Unique cities list for filtering
  const availableCities = useMemo(() => {
    if (!reportData?.items) return [];
    const set = new Set<string>();
    reportData.items.forEach((item) => {
      if (item.vehicle.operatingCity) set.add(item.vehicle.operatingCity);
    });
    return Array.from(set).sort();
  }, [reportData]);

  // Client filtered items (by search text, city, vehicle type) across ALL fleet vehicles
  const filteredItems = useMemo(() => {
    if (!reportData?.items) return [];
    return reportData.items.filter((item) => {
      const v = item.vehicle;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const assetMatch = v.assetNumber?.toLowerCase().includes(q);
        const plateMatch =
          v.plateNumberAr?.toLowerCase().includes(q) || v.plateNumberEn?.toLowerCase().includes(q);
        const serialMatch = v.serialNumber?.toLowerCase().includes(q);
        const cityMatch = v.operatingCity?.toLowerCase().includes(q);
        if (!assetMatch && !plateMatch && !serialMatch && !cityMatch) return false;
      }
      if (cityFilter && v.operatingCity !== cityFilter) return false;
      if (typeFilter && String(v.vehicleType) !== typeFilter) return false;
      return true;
    });
  }, [reportData, search, cityFilter, typeFilter]);

  // Reset to first page whenever search or filter criteria change
  useEffect(() => {
    setPage(1);
  }, [search, cityFilter, typeFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  // Items sliced for the active page
  const displayedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, page, pageSize]);

  // Aggregate KPIs for all matching vehicles in the fleet
  const currentBatchSummary = useMemo(() => {
    if (!filteredItems.length) {
      return {
        vehiclesCount: 0,
        totalAppliedKm: 0,
        totalGpsKm: 0,
        totalManualKm: 0,
        recordedDays: 0,
        missingDays: 0,
        totalDaysCount: 0,
      };
    }
    return filteredItems.reduce(
      (acc, it) => {
        acc.vehiclesCount += 1;
        acc.totalAppliedKm += it.appliedTotalKm || 0;
        acc.totalGpsKm += it.gpsTotalKm || 0;
        acc.totalManualKm += it.manualTotalKm || 0;
        acc.recordedDays += it.recordedDays || 0;
        acc.missingDays += it.missingDays || 0;
        acc.totalDaysCount += it.totalDays || 0;
        return acc;
      },
      {
        vehiclesCount: 0,
        totalAppliedKm: 0,
        totalGpsKm: 0,
        totalManualKm: 0,
        recordedDays: 0,
        missingDays: 0,
        totalDaysCount: 0,
      }
    );
  }, [filteredItems]);

  // Export to Excel
  const handleExportExcel = async () => {
    if (!filteredItems.length) {
      toast.error("لا توجد بيانات", "لا توجد سجلات لتصديرها في الصفحة الحالية");
      return;
    }

    setExporting(true);
    try {
      // 1. Vehicle Summary Rows
      const summaryRows = filteredItems.map((item, idx) => ({
        "م": idx + 1,
        "رقم الأصل": item.vehicle.assetNumber,
        "اللوحة": item.vehicle.plateNumberAr || item.vehicle.plateNumberEn || "—",
        "الرقم التسلسلي": item.vehicle.serialNumber || "—",
        "نوع المركبة": formatVehicleType(item.vehicle.vehicleType),
        "حالة التشغيل": formatVehicleOperationalStatus(item.vehicle.currentOperationalStatus),
        "مدينة التشغيل": item.vehicle.operatingCity || "—",
        "إجمالي الأيام": item.totalDays,
        "أيام مسجلة": item.recordedDays,
        "أيام GPS": item.gpsDays,
        "أيام يدوي": item.manualDays,
        "أيام بديلة": item.manualFallbackDays,
        "أيام مفقودة": item.missingDays,
        "إجمالي GPS كم": Number((item.gpsTotalKm || 0).toFixed(2)),
        "إجمالي يدوي كم": Number((item.manualTotalKm || 0).toFixed(2)),
        "إجمالي المسافة المعتمدة كم": Number((item.appliedTotalKm || 0).toFixed(2)),
      }));

      // 2. All Detailed Daily Rows for each vehicle
      const detailedRows: any[] = [];
      filteredItems.forEach((item) => {
        (item.days || []).forEach((day) => {
          const source = getAppliedSourceInfo(day.appliedSource);
          detailedRows.push({
            "رقم الأصل": item.vehicle.assetNumber,
            "اللوحة": item.vehicle.plateNumberAr || item.vehicle.plateNumberEn || "—",
            "الرقم التسلسلي": item.vehicle.serialNumber || "—",
            "مدينة التشغيل": item.vehicle.operatingCity || "—",
            "تاريخ العمل": day.workDate,
            "حالة السجل": day.hasRecord ? "يوجد سجل" : "مفقود",
            "مسافة GPS كم": day.gpsDistanceKm != null ? Number(day.gpsDistanceKm.toFixed(2)) : "—",
            "قراءة العداد": day.manualOdometerReading != null ? day.manualOdometerReading : "—",
            "أساس العداد": day.manualBaselineOdometerReading != null ? day.manualBaselineOdometerReading : "—",
            "المسافة اليدوية كم": day.manualDistanceKm != null ? Number(day.manualDistanceKm.toFixed(2)) : "—",
            "المسافة المعتمدة كم": Number((day.appliedDistanceKm || 0).toFixed(2)),
            "مصدر المسافة": source.labelAr,
            "العداد التراكمي بعد اليوم": day.effectiveOdometerAfterKm != null ? day.effectiveOdometerAfterKm : "—",
            "نوع القراءة": day.isOdometerCorrection ? "تصحيح عداد" : "قراءة عادية",
          });
        });
      });

      const fileName = `fleet-daily-distances-${fromDate}-to-${toDate}-p${page}.xlsx`;
      await exportToExcel(
        [
          { sheetName: "ملخص مسافات المركبات", data: summaryRows },
          { sheetName: "تفاصيل أيام الأسطول", data: detailedRows },
        ],
        fileName
      );

      toast.success("تم التصدير بنجاح", `تم تنزيل ملف الإكسل: ${fileName}`);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("فشل التصدير", "حدث خطأ أثناء إعداد ملف الإكسل");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/admin/fleet/vehicles" className="hover:underline">
              الأسطول
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/admin/fleet/daily-distances" className="hover:underline">
              المسافات اليومية للأسطول
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-800 dark:text-slate-200 font-bold">
              تقرير مسافات الأسطول (جميع المركبات)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/fleet/daily-distances"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="العودة لصفحة المسافات اليومية"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <span>تقرير مسافات الأسطول الشامل (جميع المركبات)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                تقرير دوري لجميع مركبات الأسطول التي تحتوي على قراءات GPS أو قراءات يدوية مع تفصيل سجلات كل يوم لكل مركبة.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Navigation links */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/fleet/daily-distances">
            <Button variant="secondary" className="gap-2 text-xs font-bold">
              <CalendarDays className="h-4 w-4 text-[#1167c9]" />
              اليومية
            </Button>
          </Link>

          <Link href="/admin/fleet/daily-distances/vehicle-report">
            <Button variant="secondary" className="gap-2 text-xs font-bold hover:text-[#1167c9]">
              <Gauge className="h-4 w-4 text-[#1167c9]" />
              تقرير مركبة محددة
            </Button>
          </Link>

          <Link href="/admin/fleet/daily-distances/missing-records">
            <Button variant="secondary" className="gap-2 text-xs font-bold hover:text-amber-600">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              السجلات المفقودة
            </Button>
          </Link>

          <Button
            onClick={handleExportExcel}
            disabled={loading || exporting || !filteredItems.length}
            variant="secondary"
            className="gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-bold"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {exporting ? "جارِ التصدير..." : "تصدير الإكسل الشامل"}
          </Button>

          <Button
            onClick={() => fetchReport(page, pageSize)}
            disabled={loading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Date Filter & Quick Range Card */}
      <Card className="p-4 space-y-4 shadow-sm border-slate-200 dark:border-slate-800">
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-end gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
              من تاريخ (From):
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs font-mono h-9"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
              إلى تاريخ (To):
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs font-mono h-9"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            تطبيق الفترة
          </Button>

          {/* Quick Select Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 mr-auto">
            <span className="text-[11px] text-slate-500 font-semibold ml-1">فترات سريعة:</span>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                applyQuickRange({
                  fromDate: getRiyadhFirstDayOfMonth(),
                  toDate: getRiyadhTodayDate(),
                })
              }
              className="h-8 px-2.5 text-[11px] font-bold"
            >
              هذا الشهر
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyQuickRange(getLastMonthRange())}
              className="h-8 px-2.5 text-[11px] font-bold"
            >
              الشهر السابق
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyQuickRange(getLastNDaysRange(7))}
              className="h-8 px-2.5 text-[11px] font-bold"
            >
              آخر 7 أيام
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyQuickRange(getLastNDaysRange(30))}
              className="h-8 px-2.5 text-[11px] font-bold"
            >
              آخر 30 يوم
            </Button>
          </div>
        </form>

        {/* Search & In-Page Filters */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="بحث برقم الأصل، اللوحة، التسلسلي، أو المدينة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-8 text-xs h-8.5"
              />
            </div>

            {/* City Filter */}
            {availableCities.length > 0 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-8.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="">جميع المدن ({availableCities.length})</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Vehicle Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="">جميع أنواع المركبات</option>
              <option value="1">دراجة نارية (Motorcycle)</option>
              <option value="2">سيدان (Sedan)</option>
              <option value="3">فان / نقل خفيف (Van)</option>
              <option value="4">شاحنة (Truck)</option>
            </select>

            {(search || cityFilter || typeFilter) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setCityFilter("");
                  setTypeFilter("");
                }}
                className="h-8.5 px-2 text-[11px] text-slate-500 hover:text-red-600"
              >
                مسح التصفية
              </Button>
            )}
          </div>

          {/* View Mode & Expand All controls */}
          <div className="flex items-center gap-2">
            {viewMode === "cards" && (
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  onClick={() => toggleAllExpanded(true)}
                  className="h-8 text-[11px] px-2 font-bold"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  توسيع الكل
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => toggleAllExpanded(false)}
                  className="h-8 text-[11px] px-2 font-bold"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  طي الكل
                </Button>
              </div>
            )}

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="عرض بطاقات تفصيلية"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                بطاقات مفصلة
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="عرض جدول ملخص الأسطول"
              >
                <List className="h-3.5 w-3.5" />
                جدول الملخص
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">إجمالي المركبات</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">
            {reportData?.totalCount != null ? reportData.totalCount.toLocaleString() : "—"}
          </div>
          <span className="text-[10px] text-slate-400">مركبة مسجلة بالفترة</span>
        </Card>

        <Card className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">المسافة المعتمدة</span>
          <div className="text-xl font-black text-[#1167c9] dark:text-blue-400 mt-0.5 font-mono">
            {currentBatchSummary.totalAppliedKm.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{" "}
            <span className="text-xs">كم</span>
          </div>
          <span className="text-[10px] text-blue-600 dark:text-blue-400">في الصفحة الحالية</span>
        </Card>

        <Card className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">مسافات GPS</span>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
            {currentBatchSummary.totalGpsKm.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{" "}
            <span className="text-xs">كم</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">من ملفات التتبع</span>
        </Card>

        <Card className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase block">مسافات اليدوي</span>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
            {currentBatchSummary.totalManualKm.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{" "}
            <span className="text-xs">كم</span>
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">قراءات العداد البديلة</span>
        </Card>

        <Card className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60">
          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block">أيام مسجلة</span>
          <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-0.5 font-mono">
            {currentBatchSummary.recordedDays.toLocaleString()}
          </div>
          <span className="text-[10px] text-purple-600 dark:text-purple-400">
            من أصل {currentBatchSummary.totalDaysCount.toLocaleString()} يوم
          </span>
        </Card>

        <Card className="p-3 bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/60">
          <span className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase block">أيام مفقودة</span>
          <div className="text-xl font-black text-red-700 dark:text-red-400 mt-0.5 font-mono">
            {currentBatchSummary.missingDays.toLocaleString()}
          </div>
          <span className="text-[10px] text-red-600 dark:text-red-400">بدون قراءات بالصفحة</span>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900/50 text-red-800 dark:text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" onClick={() => fetchReport(page, pageSize)} className="text-xs h-7">
            إعادة المحاولة
          </Button>
        </Card>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
          <span>جارِ تحميل تقرير مسافات جميع المركبات وحساب الأيام ومسافات العداد...</span>
        </div>
      )}

      {/* Main Content Area */}
      {!loading && (
        <>
          {filteredItems.length === 0 ? (
            <Card className="p-12 text-center text-slate-500 text-xs space-y-3">
              <Layers className="h-10 w-10 text-slate-400 mx-auto" />
              <div className="font-bold text-base text-slate-700 dark:text-slate-300">
                لا توجد مركبات مسجلة في هذه الفترة
              </div>
              <p className="max-w-md mx-auto text-slate-400">
                لم يتم العثور على أي مركبات تحتوي على قراءات GPS أو قراءات يدوية بين {fromDate} و {toDate}. يمكنك تجربة نطاق زمني مختلف أو مسح عوامل التصفية.
              </p>
            </Card>
          ) : viewMode === "cards" ? (
            /* Mode 1: Detailed Expandable Cards */
            <div className="space-y-4">
              {displayedItems.map((item) => {
                const v = item.vehicle;
                const isExpanded = Boolean(expandedVehicleIds[v.vehicleId]);

                return (
                  <Card
                    key={v.vehicleId}
                    className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 transition-all shadow-sm"
                  >
                    {/* Vehicle Header Bar */}
                    <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          <Car className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                              {v.assetNumber}
                            </span>
                            <Badge className="bg-blue-50 text-[#1167c9] border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-mono">
                              {v.plateNumberAr || v.plateNumberEn || "بدون لوحة"}
                            </Badge>
                            {v.serialNumber && (
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded">
                                SN: {v.serialNumber}
                              </span>
                            )}
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {formatVehicleType(v.vehicleType)}
                            </span>
                            {v.operatingCity && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {v.operatingCity}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            الفترة: <strong className="font-mono">{item.fromDate}</strong> إلى{" "}
                            <strong className="font-mono">{item.toDate}</strong> ({item.totalDays} يوماً)
                          </div>
                        </div>
                      </div>

                      {/* Summary Metrics & Expand Trigger */}
                      <div className="flex items-center gap-3">
                        {/* 4 Mini KPIs */}
                        <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
                          <div className="text-center">
                            <span className="text-[10px] text-slate-500 block">المسافة</span>
                            <span className="font-bold text-base text-[#1167c9] dark:text-blue-400">
                              {item.appliedTotalKm != null ? item.appliedTotalKm.toFixed(2) : "0.00"} كم
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-emerald-600 block">GPS</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {item.gpsTotalKm != null ? item.gpsTotalKm.toFixed(2) : "0.00"} كم
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-purple-600 block">أيام مسجلة</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.recordedDays} / {item.totalDays}
                            </span>
                          </div>
                          {item.missingDays > 0 && (
                            <div className="text-center">
                              <span className="text-[10px] text-red-600 block">أيام مفقودة</span>
                              <span className="font-bold text-red-600 dark:text-red-400">
                                {item.missingDays}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Link to single vehicle report */}
                        <Link
                          href={`/admin/fleet/daily-distances/vehicle-report?vehicleId=${encodeURIComponent(
                            v.vehicleId
                          )}&fromDate=${encodeURIComponent(item.fromDate)}&toDate=${encodeURIComponent(item.toDate)}`}
                        >
                          <Button
                            variant="secondary"
                            className="text-xs h-8 px-2.5 gap-1 hover:text-[#1167c9]"
                            title="عرض التقرير الفردي المستقل للمركبة"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">التقرير الفردي</span>
                          </Button>
                        </Link>

                        {/* Expand / Collapse Button */}
                        <Button
                          variant="secondary"
                          onClick={() => toggleVehicleExpand(v.vehicleId)}
                          className="text-xs h-8 px-3 gap-1.5 font-bold"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              <span>إخفاء الأيام ({item.days?.length || 0})</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              <span>عرض الأيام ({item.days?.length || 0})</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible Daily Days Table */}
                    {isExpanded && (
                      <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
                        <table className="w-full text-xs text-right border-collapse">
                          <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                            <tr>
                              <th className="px-3 py-2 text-center">#</th>
                              <th className="px-3 py-2">التاريخ (Work Date)</th>
                              <th className="px-3 py-2 text-center">حالة السجل</th>
                              <th className="px-3 py-2 text-center">مسافة GPS</th>
                              <th className="px-3 py-2 text-center">قراءة العداد</th>
                              <th className="px-3 py-2 text-center">أساس العداد</th>
                              <th className="px-3 py-2 text-center">المسافة اليدوية</th>
                              <th className="px-3 py-2 text-center bg-blue-50/70 dark:bg-blue-950/30">
                                المسافة المعتمدة
                              </th>
                              <th className="px-3 py-2 text-center">المصدر</th>
                              <th className="px-3 py-2 text-center">العداد التراكمي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                            {item.days && item.days.length > 0 ? (
                              item.days.map((day, dIdx) => {
                                const source = getAppliedSourceInfo(day.appliedSource);
                                return (
                                  <tr
                                    key={day.workDate}
                                    className={`transition-colors ${
                                      !day.hasRecord
                                        ? "bg-red-50/40 dark:bg-red-950/15"
                                        : dIdx % 2 === 0
                                        ? "bg-white dark:bg-slate-900"
                                        : "bg-slate-50/50 dark:bg-slate-900/40"
                                    }`}
                                  >
                                    <td className="px-3 py-2 text-center text-slate-400">{dIdx + 1}</td>
                                    <td className="px-3 py-2 font-bold whitespace-nowrap">
                                      {day.workDate}
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                      {day.hasRecord ? (
                                        <Badge tone="green" className="text-[10px] px-1.5 py-0">
                                          مسجل
                                        </Badge>
                                      ) : (
                                        <Badge tone="red" className="text-[10px] px-1.5 py-0">
                                          مفقود
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                      {day.gpsDistanceKm != null ? (
                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                          {day.gpsDistanceKm.toFixed(2)} كم
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                      {day.manualOdometerReading != null ? (
                                        <div className="flex flex-col items-center">
                                          <span className="font-bold text-slate-800 dark:text-slate-200">
                                            {day.manualOdometerReading.toLocaleString()}
                                          </span>
                                          {day.isOdometerCorrection && (
                                            <span className="inline-flex items-center gap-0.5 text-[9px] text-purple-600 dark:text-purple-400 font-bold">
                                              <Sparkles className="h-2.5 w-2.5" />
                                              تصحيح عداد
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                      {day.manualBaselineOdometerReading != null ? (
                                        <span className="text-slate-600 dark:text-slate-400">
                                          {day.manualBaselineOdometerReading.toLocaleString()}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                      {day.manualDistanceKm != null ? (
                                        <span className="font-bold text-amber-700 dark:text-amber-400">
                                          {day.manualDistanceKm.toFixed(2)} كم
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap bg-blue-50/50 dark:bg-blue-950/20">
                                      <span className="font-bold text-[#1167c9] dark:text-blue-400 text-xs">
                                        {day.appliedDistanceKm != null ? day.appliedDistanceKm.toFixed(2) : "0.00"}{" "}
                                        كم
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${source.colorClass}`}
                                      >
                                        {source.labelAr}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700 dark:text-slate-300">
                                      {day.effectiveOdometerAfterKm != null
                                        ? `${day.effectiveOdometerAfterKm.toLocaleString()} كم`
                                        : "—"}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={10} className="p-4 text-center text-slate-400">
                                  لا توجد تفاصيل أيام مسجلة لهذه المركبة.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Mode 2: Compact Summary Table */
            <Card className="p-0 overflow-hidden shadow-sm border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="px-3 py-2.5 text-center">#</th>
                      <th className="px-3 py-2.5">رقم الأصل</th>
                      <th className="px-3 py-2.5">اللوحة</th>
                      <th className="px-3 py-2.5">الرقم التسلسلي</th>
                      <th className="px-3 py-2.5">المدينة</th>
                      <th className="px-3 py-2.5">النوع</th>
                      <th className="px-3 py-2.5 text-center">الأيام</th>
                      <th className="px-3 py-2.5 text-center">مسجلة</th>
                      <th className="px-3 py-2.5 text-center">GPS</th>
                      <th className="px-3 py-2.5 text-center">يدوي</th>
                      <th className="px-3 py-2.5 text-center">مفقودة</th>
                      <th className="px-3 py-2.5 text-center">GPS كم</th>
                      <th className="px-3 py-2.5 text-center">يدوي كم</th>
                      <th className="px-3 py-2.5 text-center bg-blue-50 dark:bg-blue-950/30">
                        المعتمدة كم
                      </th>
                      <th className="px-3 py-2.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {displayedItems.map((item, idx) => {
                      const v = item.vehicle;
                      return (
                        <tr
                          key={v.vehicleId}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/40 dark:bg-slate-900/40"
                          }`}
                        >
                          <td className="px-3 py-2 text-center text-slate-400">
                            {(page - 1) * pageSize + idx + 1}
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {v.assetNumber}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {v.plateNumberAr || v.plateNumberEn || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                            {v.serialNumber || "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {v.operatingCity || "—"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400 font-sans">
                            {formatVehicleType(v.vehicleType)}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500">{item.totalDays}</td>
                          <td className="px-3 py-2 text-center font-bold text-purple-700 dark:text-purple-400">
                            {item.recordedDays}
                          </td>
                          <td className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-400">
                            {item.gpsDays}
                          </td>
                          <td className="px-3 py-2 text-center text-amber-700 dark:text-amber-400">
                            {item.manualDays}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {item.missingDays > 0 ? (
                              <span className="font-bold text-red-600 dark:text-red-400">
                                {item.missingDays}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">
                            {item.gpsTotalKm != null ? item.gpsTotalKm.toFixed(2) : "0.00"}
                          </td>
                          <td className="px-3 py-2 text-center text-amber-700 dark:text-amber-400 font-bold whitespace-nowrap">
                            {item.manualTotalKm != null ? item.manualTotalKm.toFixed(2) : "0.00"}
                          </td>
                          <td className="px-3 py-2 text-center font-black text-sm text-[#1167c9] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 whitespace-nowrap">
                            {item.appliedTotalKm != null ? item.appliedTotalKm.toFixed(2) : "0.00"} كم
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/admin/fleet/daily-distances/vehicle-report?vehicleId=${encodeURIComponent(
                                  v.vehicleId
                                )}&fromDate=${encodeURIComponent(item.fromDate)}&toDate=${encodeURIComponent(
                                  item.toDate
                                )}`}
                              >
                                <Button
                                  variant="secondary"
                                  className="text-[11px] h-7 px-2 font-bold text-[#1167c9]"
                                  title="عرض تقرير المركبة المنفصل"
                                >
                                  التقرير
                                </Button>
                              </Link>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setViewMode("cards");
                                  setExpandedVehicleIds({ [v.vehicleId]: true });
                                }}
                                className="text-[11px] h-7 px-2 font-bold text-slate-600"
                                title="عرض جدول الأيام"
                              >
                                الأيام
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-slate-500 font-medium">
                عرض{" "}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min((page - 1) * pageSize + 1, filteredItems.length)}
                </strong>{" "}
                إلى{" "}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min(page * pageSize, filteredItems.length)}
                </strong>{" "}
                من أصل{" "}
                <strong className="text-slate-900 dark:text-white">
                  {filteredItems.length.toLocaleString()}
                </strong>{" "}
                مركبة مطابقة
                {reportData && filteredItems.length !== reportData.items.length && (
                  <span className="text-[11px] text-slate-400 mr-1.5">
                    (من إجمالي {reportData.items.length.toLocaleString()} مركبة بالأسطول)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-slate-500 mr-2">
                  <span>عدد المركبات بالصفحة:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setPageSize(newSize);
                      setPage(1);
                    }}
                    className="h-8 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-mono"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100 (الكل)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1 || loading}
                    className="h-8 px-2.5 text-xs font-bold"
                  >
                    <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                    السابق
                  </Button>

                  <span className="font-mono px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    صفحة {page} من {totalPages || 1}
                  </span>

                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages || loading}
                    className="h-8 px-2.5 text-xs font-bold"
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FleetDailyDistanceReportPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
          <span>جارِ تحميل صفحة تقرير مسافات الأسطول...</span>
        </div>
      }
    >
      <FleetDailyDistanceReportContent />
    </Suspense>
  );
}
