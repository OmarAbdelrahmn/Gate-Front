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
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  getMissingDailyRecordsReport,
  getDailyDistanceErrorMessage,
  type MissingDailyRecordsReportResponse,
  type MissingDailyRecordVehicleItem,
  type VehicleReportIdentity,
} from "@/lib/fleet/daily-distances-api";
import { getOperatingCitiesCatalog, type OperatingCityOption } from "@/lib/fleet/fuel-cards-api";
import { formatVehicleType, formatVehicleOperationalStatus } from "@/lib/fleet/formatters";
import { getAllVehicles } from "@/lib/fleet/api";
import {
  getRiyadhTodayDate,
  getRiyadhFirstDayOfMonth,
} from "@/lib/reports/utils";
import { VehicleType, type VehicleSummaryResponse } from "@/lib/fleet/types";

export interface MissingDailyRecordsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFromDate?: string;
  initialToDate?: string;
  onOpenVehicleReport?: (
    vehicleId: string,
    fromDate: string,
    toDate: string,
    vehicleInfo?: VehicleReportIdentity
  ) => void;
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

export function MissingDailyRecordsReportModal({
  isOpen,
  onClose,
  initialFromDate,
  initialToDate,
  onOpenVehicleReport,
}: MissingDailyRecordsReportModalProps) {
  // Date range filters
  const defaultFrom = initialFromDate || getRiyadhFirstDayOfMonth();
  const defaultTo = initialToDate || getRiyadhTodayDate();

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);

  // Search & Select Filters
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [operatingCityId, setOperatingCityId] = useState<string>("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<number>(0);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Data states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MissingDailyRecordsReportResponse | null>(null);
  const [cities, setCities] = useState<OperatingCityOption[]>([]);
  const [vehiclesList, setVehiclesList] = useState<VehicleSummaryResponse[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  // Expanded dates modal / popover state for vehicle with many missing dates
  const [expandedVehicle, setExpandedVehicle] = useState<MissingDailyRecordVehicleItem | null>(null);

  // Sync initial dates
  useEffect(() => {
    if (isOpen) {
      if (initialFromDate) setFromDate(initialFromDate);
      if (initialToDate) setToDate(initialToDate);
    }
  }, [isOpen, initialFromDate, initialToDate]);

  // Load operating cities & vehicles list (to map serial numbers)
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    Promise.all([
      getOperatingCitiesCatalog().catch(() => [] as OperatingCityOption[]),
      getAllVehicles().catch(() => [] as VehicleSummaryResponse[]),
    ]).then(([citiesData, vehiclesData]) => {
      if (isMounted) {
        setCities(citiesData || []);
        setVehiclesList(vehiclesData || []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Map of vehicleId -> VehicleSummaryResponse (to resolve serialNumber)
  const vehiclesMap = useMemo(() => {
    const map = new Map<string, VehicleSummaryResponse>();
    vehiclesList.forEach((v) => {
      if (v.id) map.set(v.id, v);
    });
    return map;
  }, [vehiclesList]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch report
  const fetchReport = useCallback(
    async (
      overridePage = page,
      overridePageSize = pageSize,
      overrideFrom = fromDate,
      overrideTo = toDate,
      overrideSearch = debouncedSearch,
      overrideCity = operatingCityId,
      overrideType = vehicleTypeFilter
    ) => {
      if (!overrideFrom || !overrideTo) {
        setError("يرجى تحديد تاريخ بداية ونهاية التقرير.");
        return;
      }
      if (overrideFrom > overrideTo) {
        setError("تاريخ النهاية يجب أن يكون لاحقاً أو مساوياً لتاريخ البداية.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getMissingDailyRecordsReport({
          fromDate: overrideFrom,
          toDate: overrideTo,
          search: overrideSearch,
          operatingCityId: overrideCity || undefined,
          vehicleType: overrideType > 0 ? overrideType : undefined,
          page: overridePage,
          pageSize: overridePageSize,
        });
        setReport(data);
      } catch (err: any) {
        console.error("Failed to fetch missing daily records report:", err);
        const code = err?.code || err?.message;
        const mapped = getDailyDistanceErrorMessage(code, err?.message);
        setError(`${mapped.title}: ${mapped.description}`);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, fromDate, toDate, debouncedSearch, operatingCityId, vehicleTypeFilter]
  );

  // Trigger fetch on open or filter changes
  useEffect(() => {
    if (isOpen) {
      fetchReport(1, pageSize, fromDate, toDate, debouncedSearch, operatingCityId, vehicleTypeFilter);
    }
  }, [isOpen, debouncedSearch, operatingCityId, vehicleTypeFilter, pageSize]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchReport(newPage, pageSize, fromDate, toDate, debouncedSearch, operatingCityId, vehicleTypeFilter);
  };

  // Date Presets
  const handleApplyPreset = (type: "thisMonth" | "lastMonth" | "last7" | "last14" | "last30") => {
    let range: { fromDate: string; toDate: string };
    if (type === "thisMonth") {
      range = { fromDate: getRiyadhFirstDayOfMonth(), toDate: getRiyadhTodayDate() };
    } else if (type === "lastMonth") {
      range = getLastMonthRange();
    } else if (type === "last7") {
      range = getLastNDaysRange(7);
    } else if (type === "last14") {
      range = getLastNDaysRange(14);
    } else {
      range = getLastNDaysRange(30);
    }
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setPage(1);
    fetchReport(1, pageSize, range.fromDate, range.toDate, debouncedSearch, operatingCityId, vehicleTypeFilter);
  };

  // Total pages
  const totalPages = useMemo(() => {
    if (!report || report.totalCount === 0) return 1;
    return Math.ceil(report.totalCount / report.pageSize);
  }, [report]);

  // Export to Excel (All pages)
  const handleExportAllExcel = async () => {
    if (!report || report.totalCount === 0) {
      toast.warning("لا توجد سجلات مفقودة للتصدير");
      return;
    }

    try {
      setExporting(true);
      setExportProgress("جاري تحميل كافة السجلات للتصدير...");

      let allItems: MissingDailyRecordVehicleItem[] = [...(report.items || [])];

      // If there are more pages, fetch all remaining pages in loop
      if (report.totalCount > allItems.length) {
        const total = report.totalCount;
        const fetchPageSize = 100;
        const totalPagesToFetch = Math.ceil(total / fetchPageSize);
        allItems = [];

        for (let p = 1; p <= totalPagesToFetch; p++) {
          setExportProgress(`جاري تحميل الصفحة ${p} من ${totalPagesToFetch}...`);
          const res = await getMissingDailyRecordsReport({
            fromDate,
            toDate,
            search: debouncedSearch,
            operatingCityId: operatingCityId || undefined,
            vehicleType: vehicleTypeFilter > 0 ? vehicleTypeFilter : undefined,
            page: p,
            pageSize: fetchPageSize,
          });
          if (res.items && res.items.length) {
            allItems.push(...res.items);
          }
        }
      }

      setExportProgress("جاري إنشاء ملف Excel...");

      const filename = `تقرير_سجلات_المسافات_المفقودة_${fromDate}_${toDate}.xlsx`;

      await exportToExcel({
        filename,
        sheetName: "المركبات ذات الأيام المفقودة",
        data: allItems,
        columns: [
          {
            header: "رقم اللوحة (عربي)",
            accessor: (item) => item.vehicle.plateNumberAr || "—",
            isText: true,
            width: 16,
          },
          {
            header: "رقم اللوحة (إنجليزي)",
            accessor: (item) => item.vehicle.plateNumberEn || "—",
            isText: true,
            width: 16,
          },
          {
            header: "الرقم التسلسلي",
            accessor: (item) => vehiclesMap.get(item.vehicle.vehicleId)?.serialNumber || "—",
            isText: true,
            width: 18,
          },
          {
            header: "نوع المركبة",
            accessor: (item) => formatVehicleType(item.vehicle.vehicleType),
            width: 16,
          },
          {
            header: "المدينة التشغيلية",
            accessor: (item) => item.vehicle.operatingCity || "—",
            width: 18,
          },
          {
            header: "عدد الأيام المغطاة",
            accessor: (item) => item.recordedDays,
            width: 16,
          },
          {
            header: "عدد الأيام المفقودة",
            accessor: (item) => item.missingDays,
            width: 16,
          },
          {
            header: "التواريخ المفقودة",
            accessor: (item) => (item.missingDates ? item.missingDates.join(" ، ") : "—"),
            isText: true,
            width: 40,
          },
        ],
      });

      toast.success("تم تصدير تقرير السجلات المفقودة بنجاح");
    } catch (err) {
      console.error("Missing records Excel export failed:", err);
      toast.error("حدث خطأ أثناء تصدير ملف Excel");
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="تقرير السجلات المفقودة للمركبات العاملة"
        maxWidth="max-w-7xl"
      >
        <div className="space-y-5" dir="rtl">
          {/* Controls Bar */}
          <Card className="p-4 bg-[var(--surface)] border-[var(--border)] shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>
                  فحص دقيق للمركبات العاملة المعينة حالياً لحصر أيام العمل الخالية من سجلات GPS واليدوي
                </span>
              </div>

              {/* Date Presets */}
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
                  onClick={() => handleApplyPreset("last14")}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  آخر 14 يوماً
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

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
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

              {/* Search by Plate or Serial Number Only */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  بحث باللوحة أو الرقم التسلسلي
                </label>
                <div className="relative">
                  <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[var(--muted)]" />
                  <Input
                    type="text"
                    placeholder="رقم اللوحة، الرقم التسلسلي..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="text-xs pr-8 py-1.5 h-9"
                  />
                </div>
              </div>

              {/* City Filter */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  المدينة التشغيلية
                </label>
                <select
                  value={operatingCityId}
                  onChange={(e) => setOperatingCityId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs px-2.5 text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[#1167c9]"
                >
                  <option value="">جميع المدن</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Type Filter */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                  النوع
                </label>
                <select
                  value={vehicleTypeFilter}
                  onChange={(e) => setVehicleTypeFilter(Number(e.target.value))}
                  className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs px-2 text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[#1167c9]"
                >
                  <option value={0}>الكل</option>
                  <option value={VehicleType.Motorcycle}>دراجة</option>
                  <option value={VehicleType.Car}>سيارة</option>
                  <option value={VehicleType.Van}>فان</option>
                  <option value={VehicleType.Truck}>شاحنة</option>
                  <option value={VehicleType.Other}>أخرى</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 flex items-center gap-2">
                <Button
                  onClick={() => {
                    setPage(1);
                    fetchReport(1, pageSize, fromDate, toDate, debouncedSearch, operatingCityId, vehicleTypeFilter);
                  }}
                  disabled={loading}
                  className="flex-1 bg-[#1167c9] hover:bg-blue-700 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>تطبيق</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleExportAllExcel}
                  disabled={exporting || !report?.totalCount}
                  className="gap-1.5 text-xs font-bold h-9"
                  title="تصدير كافة السجلات إلى Excel"
                >
                  <Download className="h-3.5 w-3.5 text-[#1167c9]" />
                  <span className="hidden sm:inline">Excel</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Export Progress Notification */}
          {exportProgress && (
            <Card className="p-3 bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2.5">
              <RefreshCw className="h-4 w-4 animate-spin text-[#1167c9]" />
              <span>{exportProgress}</span>
            </Card>
          )}

          {/* Error Alert */}
          {error && (
            <Card className="p-4 bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">{error}</p>
                <p className="text-[11px] text-red-700 dark:text-red-300">
                  يرجى التحقق من صحة نطاق التواريخ المحددة (ألا يتجاوز 366 يوماً).
                </p>
              </div>
            </Card>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-12 text-center text-xs text-[var(--muted)] space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-[#1167c9] mx-auto" />
              <p className="font-bold text-sm text-[var(--foreground)]">جاري فحص وحصر السجلات المفقودة...</p>
              <p className="text-xs">يتم فحص المركبات المعينة حالياً واكتشاف الأيام التي تفتقر لسجل مسافة</p>
            </div>
          )}

          {/* Report Data */}
          {!loading && report && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Working Vehicles Count */}
                <Card className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center justify-between">
                    <span>المركبات العاملة (المطابقة)</span>
                    <Car className="h-4 w-4 text-[#1167c9]" />
                  </span>
                  <p className="text-2xl font-black font-mono text-blue-700 dark:text-blue-300">
                    {report.workingVehicleCount.toLocaleString()}
                    <span className="text-xs font-normal text-blue-600/70 mr-1">مركبة</span>
                  </p>
                  <span className="text-[10px] text-blue-800/80 dark:text-blue-400">
                    الأسطول النشط المعين حالياً
                  </span>
                </Card>

                {/* Vehicles with Gaps */}
                <Card className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <span>مركبات بها فجوات مفقودة</span>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </span>
                  <p className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300">
                    {report.totalCount.toLocaleString()}
                    <span className="text-xs font-normal text-amber-600/70 mr-1">مركبة</span>
                  </p>
                  <span className="text-[10px] text-amber-800/80 dark:text-amber-400">
                    ينقصها يوم مسافة واحد أو أكثر
                  </span>
                </Card>

                {/* Total Missing Vehicle-Days */}
                <Card className="p-3.5 bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 flex items-center justify-between">
                    <span>إجمالي أيام الفجوات</span>
                    <CalendarDays className="h-4 w-4 text-rose-600" />
                  </span>
                  <p className="text-2xl font-black font-mono text-rose-700 dark:text-rose-300">
                    {report.totalMissingDays.toLocaleString()}
                    <span className="text-xs font-normal text-rose-600/70 mr-1">يوم/مركبة</span>
                  </p>
                  <span className="text-[10px] text-rose-800/80 dark:text-rose-400">
                    مجموع أيام الغياب عبر كافة المركبات
                  </span>
                </Card>

                {/* Fleet Full Coverage Rate */}
                <Card className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>مركبات مكتملة التغطية</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </span>
                  <p className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                    {Math.max(0, report.workingVehicleCount - report.totalCount).toLocaleString()}
                    <span className="text-xs font-normal text-emerald-600/70 mr-1">
                      (
                      {report.workingVehicleCount > 0
                        ? (
                            ((report.workingVehicleCount - report.totalCount) /
                              report.workingVehicleCount) *
                            100
                          ).toFixed(1)
                        : 100}
                      %)
                    </span>
                  </p>
                  <span className="text-[10px] text-emerald-800/80 dark:text-emerald-400">
                    تغطية كاملة طوال فترة التقرير ({report.totalDays} يوم)
                  </span>
                </Card>
              </div>

              {/* Table Card */}
              <Card className="border-[var(--border)] overflow-hidden">
                <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="font-bold text-[var(--foreground)]">
                    قائمة المركبات ذات السجلات المفقودة ({report.totalCount} مركبة)
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    عرض الصفحة {report.page} من {totalPages} (إجمالي السجلات: {report.totalCount})
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-[var(--border)] text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="p-3 whitespace-nowrap">رقم اللوحة</th>
                        <th className="p-3 whitespace-nowrap">الرقم التسلسلي</th>
                        <th className="p-3 whitespace-nowrap">النوع</th>
                        <th className="p-3 whitespace-nowrap">المدينة التشغيلية</th>
                        <th className="p-3 whitespace-nowrap">الأيام المسجلة</th>
                        <th className="p-3 whitespace-nowrap text-rose-600">الأيام المفقودة</th>
                        <th className="p-3 min-w-[280px]">التواريخ المفقودة</th>
                        <th className="p-3 text-center whitespace-nowrap">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {report.items.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-xs text-[var(--muted)]">
                            <div className="space-y-2">
                              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                              <p className="font-bold text-sm text-[var(--foreground)]">
                                لا توجد مركبات بها سجلات مفقودة في هذه الفترة!
                              </p>
                              <p className="text-xs">
                                جميع المركبات العاملة المطابقة تمتلك تغطية يومية لمسافات GPS أو القراءات اليدوية.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        report.items.map((item) => {
                          const dates = item.missingDates || [];
                          const displayedDates = dates.slice(0, 4);
                          const remainingDatesCount = dates.length - displayedDates.length;
                          const serial = vehiclesMap.get(item.vehicle.vehicleId)?.serialNumber;

                          return (
                            <tr
                              key={item.vehicle.vehicleId}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                            >
                              {/* Plate Badges */}
                              <td className="p-3 whitespace-nowrap">
                                <div className="space-y-0.5">
                                  {item.vehicle.plateNumberAr && (
                                    <span className="font-mono font-bold block text-slate-800 dark:text-slate-200">
                                      {item.vehicle.plateNumberAr}
                                    </span>
                                  )}
                                  {item.vehicle.plateNumberEn && (
                                    <span className="font-mono text-[10px] text-[var(--muted)] block">
                                      {item.vehicle.plateNumberEn}
                                    </span>
                                  )}
                                  {!item.vehicle.plateNumberAr && !item.vehicle.plateNumberEn && (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </div>
                              </td>

                              {/* Serial Number */}
                              <td className="p-3 whitespace-nowrap font-mono text-xs">
                                {serial ? (
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {serial}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Vehicle Type */}
                              <td className="p-3 whitespace-nowrap">
                                <Badge tone="gray" className="text-[11px]">
                                  {formatVehicleType(item.vehicle.vehicleType)}
                                </Badge>
                              </td>

                              {/* Operating City */}
                              <td className="p-3 whitespace-nowrap">
                                {item.vehicle.operatingCity ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                    <MapPin className="h-3 w-3 text-red-500" />
                                    {item.vehicle.operatingCity}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Recorded Days */}
                              <td className="p-3 whitespace-nowrap font-mono">
                                <span className="font-bold text-teal-700 dark:text-teal-400">
                                  {item.recordedDays}
                                </span>
                                <span className="text-[10px] text-[var(--muted)] mr-1">/ {report.totalDays}</span>
                              </td>

                              {/* Missing Days */}
                              <td className="p-3 whitespace-nowrap font-mono">
                                <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border border-rose-300">
                                  {item.missingDays} يوم
                                </span>
                              </td>

                              {/* Missing Dates List */}
                              <td className="p-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {displayedDates.map((dateStr) => (
                                    <span
                                      key={dateStr}
                                      className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                    >
                                      {dateStr}
                                    </span>
                                  ))}
                                  {remainingDatesCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedVehicle(item)}
                                      className="text-[11px] text-[#1167c9] dark:text-blue-400 hover:underline font-bold px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                                      title="عرض كافة التواريخ المفقودة لهذه المركبة"
                                    >
                                      +{remainingDatesCount} إضافية...
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Action Link to Vehicle Details Report */}
                              <td className="p-3 text-center whitespace-nowrap">
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    if (onOpenVehicleReport) {
                                      onOpenVehicleReport(
                                        item.vehicle.vehicleId,
                                        fromDate,
                                        toDate,
                                        item.vehicle
                                      );
                                    }
                                  }}
                                  className="text-[11px] py-1 px-2.5 gap-1.5 font-bold hover:border-[#1167c9] hover:text-[#1167c9]"
                                  title="عرض التقرير اليومي المفصل لهذه المركبة بنفس الفترة"
                                >
                                  <Eye className="h-3.5 w-3.5 text-[#1167c9]" />
                                  <span>تفاصيل المركبة</span>
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {report.totalCount > 0 && (
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--muted)]">سجلات لكل صفحة:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          const newSize = Number(e.target.value);
                          setPageSize(newSize);
                          setPage(1);
                        }}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        disabled={page <= 1 || loading}
                        onClick={() => handlePageChange(page - 1)}
                        className="text-xs py-1 px-2 gap-1 h-8 font-bold"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span>السابق</span>
                      </Button>
                      <span className="font-mono text-xs px-2 text-[var(--foreground)]">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="secondary"
                        disabled={page >= totalPages || loading}
                        onClick={() => handlePageChange(page + 1)}
                        className="text-xs py-1 px-2 gap-1 h-8 font-bold"
                      >
                        <span>التالي</span>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </Modal>

      {/* Nested Modal: View All Missing Dates for a Vehicle */}
      {expandedVehicle && (
        <Modal
          isOpen={Boolean(expandedVehicle)}
          onClose={() => setExpandedVehicle(null)}
          title={`كافة التواريخ المفقودة للمركبة: ${expandedVehicle.vehicle.plateNumberAr || expandedVehicle.vehicle.plateNumberEn || "مركبة"}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs" dir="rtl">
            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border-[var(--border)] space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>اللوحة: <strong className="font-mono text-sm text-[#1167c9]">{expandedVehicle.vehicle.plateNumberAr || expandedVehicle.vehicle.plateNumberEn || "—"}</strong></span>
                {vehiclesMap.get(expandedVehicle.vehicle.vehicleId)?.serialNumber && (
                  <span>الرقم التسلسلي: <strong className="font-mono">{vehiclesMap.get(expandedVehicle.vehicle.vehicleId)?.serialNumber}</strong></span>
                )}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                المدينة: {expandedVehicle.vehicle.operatingCity || "—"} | إجمالي الأيام المفقودة: <strong className="text-rose-600">{expandedVehicle.missingDays}</strong> يوم
              </div>
            </Card>

            <div className="max-h-80 overflow-y-auto p-2 border border-[var(--border)] rounded-xl bg-[var(--surface)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {expandedVehicle.missingDates.map((d, idx) => (
                  <div
                    key={d}
                    className="p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center font-mono font-bold text-rose-800 dark:text-rose-200 text-xs"
                  >
                    <span className="text-[10px] text-slate-400 block mb-0.5">#{idx + 1}</span>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                onClick={() => setExpandedVehicle(null)}
                className="text-xs"
              >
                إغلاق
              </Button>

              <Button
                onClick={() => {
                  const v = expandedVehicle;
                  setExpandedVehicle(null);
                  if (onOpenVehicleReport) {
                    onOpenVehicleReport(v.vehicle.vehicleId, fromDate, toDate, v.vehicle);
                  }
                }}
                className="bg-[#1167c9] hover:bg-blue-700 text-white text-xs font-bold gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>فتح تقرير مسافات المركبة</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
