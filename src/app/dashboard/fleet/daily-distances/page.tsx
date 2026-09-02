"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  History,
  Info,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Upload,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  getVehicleDailyDistances,
  saveManualOdometer,
  importGpsFile,
  getGpsImportLogs,
  getAppliedSourceInfo,
  type VehicleDailyDistanceItem,
  type VehicleDailyDistancesResponse,
  type SaveManualOdometerRequest,
  type GpsImportResponse,
  type GpsImportLogItem,
} from "@/lib/fleet/daily-distances-api";

function getRiyadhDateStr(daysOffset = 0): string {
  const now = new Date();
  const riyadhOffsetMs = 3 * 60 * 60 * 1000;
  const targetDate = new Date(now.getTime() + riyadhOffsetMs + daysOffset * 24 * 60 * 60 * 1000);
  return targetDate.toISOString().slice(0, 10);
}

export default function VehicleDailyDistancesPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  // Filter States
  const [workDate, setWorkDate] = useState<string>(getRiyadhDateStr(-1));
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<"gps" | "manual" | "missing" | "">("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Data States
  const [data, setData] = useState<VehicleDailyDistancesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Manual Reading Modal State
  const [selectedItemForManual, setSelectedItemForManual] = useState<VehicleDailyDistanceItem | null>(null);
  const [manualOdometer, setManualOdometer] = useState<string>("");
  const [manualBaseline, setManualBaseline] = useState<string>("");
  const [manualNotes, setManualNotes] = useState<string>("");
  const [requireBaselineInput, setRequireBaselineInput] = useState<boolean>(false);

  // GPS Import Modal State
  const [isGpsImportOpen, setIsGpsImportOpen] = useState<boolean>(false);
  const [gpsFile, setGpsFile] = useState<File | null>(null);
  const [expectedDate, setExpectedDate] = useState<string>(workDate);
  const [importResult, setImportResult] = useState<GpsImportResponse | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // GPS Import Logs Modal State
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<GpsImportLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  const fetchDailyDistances = async (query = debouncedSearchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getVehicleDailyDistances({
        workDate,
        search: query,
        source: sourceFilter,
        page: 1,
        pageSize: 300,
      });
      setData(result);
    } catch (err: any) {
      console.error("Error fetching daily distances", err);
      setError(err?.message || "تعذر تحميل البيانات المسافات اليومية للمركبات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyDistances(debouncedSearchQuery);
  }, [workDate, sourceFilter, debouncedSearchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDailyDistances(searchQuery);
  };

  // Open Manual Modal
  const handleOpenManualModal = (item: VehicleDailyDistanceItem) => {
    setSelectedItemForManual(item);
    
    const currentRefOdometer = item.manualOdometerReading ?? item.currentOdometer;
    setManualOdometer(item.manualOdometerReading != null ? item.manualOdometerReading.toString() : (currentRefOdometer != null ? currentRefOdometer.toString() : ""));

    let initialBaseline = "";
    if (item.manualBaselineOdometerReading != null) {
      initialBaseline = item.manualBaselineOdometerReading.toString();
    } else if (currentRefOdometer != null && currentRefOdometer > 0) {
      if (item.gpsDistanceKm != null && item.gpsDistanceKm > 0) {
        // GPS data present: subtract GPS distance from current vehicle odometer
        const calcBaseline = currentRefOdometer - item.gpsDistanceKm;
        const normalized = calcBaseline > 0 ? calcBaseline : 0;
        initialBaseline = Number.isInteger(normalized) ? normalized.toString() : normalized.toFixed(2);
      } else {
        // No GPS data: default directly to current vehicle odometer
        initialBaseline = currentRefOdometer.toString();
      }
    }

    setManualBaseline(initialBaseline);
    setManualNotes(item.manualNotes || "");
    setRequireBaselineInput(item.manualBaselineOdometerReading == null);
  };

  // Submit Manual Odometer
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForManual) return;

    const odoVal = parseFloat(manualOdometer);
    if (isNaN(odoVal) || odoVal < 0) {
      toast.error("بيانات غير صالحة", "رجاء إدخال قراءة العداد الإجمالية بشكل صحيح.");
      return;
    }

    const baselineVal = manualBaseline.trim() ? parseFloat(manualBaseline) : null;
    if (requireBaselineInput && (baselineVal === null || isNaN(baselineVal) || baselineVal < 0)) {
      toast.error("قراءة الأساس مطلوبة", "يجب إدخال قراءة العداد السابقة (الأساس) لتحديد بداية الاحتساب.");
      return;
    }

    if (baselineVal !== null && odoVal < baselineVal) {
      toast.error("خطأ في القراءة", "قراءة العداد الحالية لا يمكن أن تكون أقل من قراءة الأساس.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: SaveManualOdometerRequest = {
          odometerReading: odoVal,
          baselineOdometerReading: baselineVal,
          notes: manualNotes.trim() || null,
          rowVersion: selectedItemForManual.rowVersion,
        };

        await saveManualOdometer(selectedItemForManual.vehicleId, selectedItemForManual.workDate, payload);
        toast.success("تم التحديث بنجاح", "تم تسجيل قراءة العداد اليدوية واحتساب المسافة المعتمدة.");
        setSelectedItemForManual(null);
        fetchDailyDistances();
      } catch (err: any) {
        console.error("Save manual odometer error:", err);
        if (err?.errorCode === "fleet.daily_distance.manual_baseline_required" || err?.status === 400 && err?.message?.includes("baseline")) {
          setRequireBaselineInput(true);
          toast.error("مطلوب قراءة الأساس", "يرجى تحديد قراءة العداد السابقة (الأساس) لهذه المركبة.");
        } else if (err?.errorCode === "fleet.daily_distance.invalid_manual_odometer") {
          toast.error("قراءة غير صالحة", "قراءة العداد الإجمالية أقل من قراءة الأساس أو تكسر تسلسل القراءات.");
        } else if (err?.status === 409) {
          toast.error("تعارض في التحديث", "تم تعديل السجل بواسطة مستخدم آخر. تم إعادة تحميل البيانات.");
          fetchDailyDistances();
        } else {
          toast.error("فشل الحفظ", err?.message || "تعذر حفظ قراءة العداد اليدوية.");
        }
      }
    });
  };

  // Open GPS Import Modal
  const handleOpenGpsImport = () => {
    setGpsFile(null);
    setExpectedDate(workDate);
    setImportResult(null);
    setIsGpsImportOpen(true);
  };

  // Submit GPS Import File
  const handleGpsImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gpsFile) {
      toast.error("ملف مفقود", "يرجى اختيار ملف تقرير GPS بصيغة .xls أو .xlsx");
      return;
    }

    setIsUploading(true);
    setImportResult(null);

    try {
      const res = await importGpsFile(gpsFile, expectedDate);
      setImportResult(res);
      toast.success(
        "تم معالجة التقرير",
        `تم مطابقة ${res.matchedRows} مركبة بنجاح (${res.unmatchedRows} غير مطابقة، ${res.invalidRows} غير صالحة).`
      );
      fetchDailyDistances();
    } catch (err: any) {
      console.error("GPS import error:", err);
      if (err?.errorCode === "fleet.daily_distance.gps_date_mismatch") {
        toast.error("اختلاف في تاريخ التقرير", "تاريخ التقرير المرفوع لا يطابق تاريخ العمل المحدد.");
      } else if (err?.errorCode === "fleet.daily_distance.duplicate_gps_import") {
        toast.error("ملف مكرر", "تم رفع هذا التقرير مسبقاً لهذا اليوم.");
      } else if (err?.errorCode === "fleet.daily_distance.invalid_gps_file") {
        toast.error("ملف غير صالح", "بنية التقرير المرفوع غير صالحة أو تعذر قراءتها.");
      } else {
        toast.error("فشل استيراد تقرير GPS", err?.message || "حدث خطأ أثناء معالجة التقرير.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Open Logs Modal
  const handleOpenLogs = async () => {
    setIsLogsModalOpen(true);
    setLogsLoading(true);
    try {
      const res = await getGpsImportLogs(workDate);
      setLogs(res);
    } catch (err: any) {
      console.error("Error fetching import logs", err);
      toast.error("خطأ", "تعذر تحميل سجل عمليات الرفع.");
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <span>إدارة الأسطول والمركبات</span>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-[#1167c9] dark:text-blue-400">المسافات اليومية (GPS والعداد)</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
            <Gauge className="h-7 w-7 text-[#1167c9] dark:text-blue-400" />
            المسافات اليومية للمركبات
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            سجل موحد لكل يوم يجمع بين مسافة GPS اليومية وقراءة العداد اليدوية للمركبة مع اعتماد تلقائي لمصدر GPS عند توفره.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(can("fleet.daily_distances.read") || can("fleet.vehicles.read") || can("fleet.assignments.read")) && (
            <Button variant="secondary" onClick={handleOpenLogs} className="gap-2 text-xs font-bold">
              <History className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              سجل عمليات الرفع
            </Button>
          )}

          {(can("fleet.daily_distances.import") || can("fleet.vehicles.read") || can("fleet.assignments.read")) && (
            <Button
              onClick={handleOpenGpsImport}
              className="gap-2 bg-[#1167c9] hover:bg-blue-700 text-white font-bold text-xs shadow-md"
            >
              <Upload className="h-4 w-4" />
              رفع تقرير GPS
            </Button>
          )}
        </div>
      </div>

      {/* Top Filter Bar */}
      <Card className="p-4 space-y-4 bg-[var(--surface)] border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Work Date Selection */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[var(--foreground)] shrink-0 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#1167c9]" />
              تاريخ العمل المستهدف <span className="text-red-500">*</span>:
            </label>
            <Input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-44 text-xs font-mono font-bold"
              required
            />
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث برقم الأصل، اللوحة..."
                className="pr-9 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="مسح البحث"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="secondary" className="text-xs gap-1 font-bold">
              تصفية
            </Button>
          </form>
        </div>

        {/* Source Filter Tabs */}
        <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
          <span className="text-xs font-bold text-[var(--muted)] ml-2 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            مصدر المسافة:
          </span>

          <button
            type="button"
            onClick={() => setSourceFilter("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              sourceFilter === ""
                ? "bg-[#1167c9] text-white shadow-xs"
                : "bg-[var(--subtle-bg)] text-[var(--foreground)] hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            الكل {data ? `(${data.totalCount})` : ""}
          </button>

          <button
            type="button"
            onClick={() => setSourceFilter("gps")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              sourceFilter === "gps"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>GPS معتمد</span>
            {data && <span className="font-mono text-[11px]">({data.gpsCount})</span>}
          </button>

          <button
            type="button"
            onClick={() => setSourceFilter("manual")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              sourceFilter === "manual"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>بديل يدوي</span>
            {data && <span className="font-mono text-[11px]">({data.manualFallbackCount})</span>}
          </button>

          <button
            type="button"
            onClick={() => setSourceFilter("missing")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              sourceFilter === "missing"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>بدون مسافة</span>
            {data && <span className="font-mono text-[11px]">({data.missingCount})</span>}
          </button>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">مركبات GPS المعتمدة</span>
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-100 font-mono">
              {data.gpsCount} <span className="text-xs font-sans text-emerald-700">مركبة</span>
            </div>
            <p className="text-[11px] text-emerald-700/80">المسافة مستوردة تلقائياً من تقرير GPS.</p>
          </Card>

          <Card className="p-4 space-y-2 border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">البديل اليدوي</span>
              <Edit3 className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-950 dark:text-amber-100 font-mono">
              {data.manualFallbackCount} <span className="text-xs font-sans text-amber-700">مركبة</span>
            </div>
            <p className="text-[11px] text-amber-700/80">اعتماد الفرق اليدوي لعدم توفر GPS اليوم.</p>
          </Card>

          <Card className="p-4 space-y-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">بدون مسافة مسجلة</span>
              <AlertCircle className="h-5 w-5 text-slate-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {data.missingCount} <span className="text-xs font-sans text-slate-600">مركبة</span>
            </div>
            <p className="text-[11px] text-slate-500">تحتاج رفع تقرير GPS أو إدخال قراءة العداد.</p>
          </Card>

          <Card className="p-4 space-y-2 border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">إجمالي مسافة اليوم المعتمدة</span>
              <Gauge className="h-5 w-5 text-[#1167c9]" />
            </div>
            <div className="text-2xl font-black text-[#1167c9] dark:text-blue-400 font-mono">
              {data.appliedTotalKm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-xs font-sans text-blue-800 dark:text-blue-300">كم</span>
            </div>
            <p className="text-[11px] text-blue-700/80">مجموع المسافات الفعالة المعتمدة لليوم.</p>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card className="p-0 overflow-hidden border-[var(--border)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#1167c9]" />
            <p className="text-xs text-[var(--muted)]">جاري تحميل المسافات اليومية للمركبات...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-4 border-red-200 bg-red-50/50">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h3 className="font-bold text-red-900 text-sm">{error}</h3>
            <Button onClick={() => fetchDailyDistances()} variant="secondary" className="gap-2 text-xs">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Gauge className="h-10 w-10 text-[var(--muted)] mx-auto opacity-50" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">لا توجد سجلات مسافات لهذا اليوم.</h3>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              تأكد من اختيار تاريخ عمل صحيح أو قم برفع تقرير GPS الخاص بهذا اليوم.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs dir-rtl">
              <thead className="bg-[#1167c9]/10 text-xs font-extrabold text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3.5">رقم الأصل</th>
                  <th className="px-4 py-3.5">اللوحة (عربي/إنجليزي)</th>
                  <th className="px-4 py-3.5 text-center">مسافة GPS</th>
                  <th className="px-4 py-3.5 text-center">قراءة العداد اليدوية</th>
                  <th className="px-4 py-3.5 text-center">قراءة الأساس</th>
                  <th className="px-4 py-3.5 text-center">المسافة اليدوية</th>
                  <th className="px-4 py-3.5 text-center bg-blue-500/10 text-[#1167c9]">المسافة المعتمدة</th>
                  <th className="px-4 py-3.5 text-center">المصدر المعتمد</th>
                  <th className="px-4 py-3.5 text-center">إجمالي المركبة التشغيلي</th>
                  <th className="px-4 py-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-medium">
                {data.items.map((item) => {
                  const sourceInfo = getAppliedSourceInfo(item.appliedSource);

                  return (
                    <tr key={item.vehicleId} className="hover:bg-[var(--subtle-bg)] transition-colors">
                      {/* Asset Number */}
                      <td className="px-4 py-3 font-mono font-bold text-[#1167c9]">
                        <Link
                          href={`/dashboard/fleet/vehicles/${item.vehicleId}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>{item.assetNumber}</span>
                        </Link>
                      </td>

                      {/* Plate Number */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-[var(--foreground)]">{item.plateNumberAr || "—"}</div>
                        <div className="font-mono text-[10px] text-[var(--muted)]">{item.plateNumberEn || "—"}</div>
                      </td>

                      {/* GPS Distance */}
                      <td className="px-4 py-3 text-center font-mono">
                        {item.gpsDistanceKm != null ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {item.gpsDistanceKm.toFixed(2)} كم
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Manual Odometer Reading */}
                      <td className="px-4 py-3 text-center font-mono">
                        {item.manualOdometerReading != null ? (
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {item.manualOdometerReading.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Baseline Odometer */}
                      <td className="px-4 py-3 text-center font-mono">
                        {item.manualBaselineOdometerReading != null ? (
                          <span className="text-slate-600 dark:text-slate-400">
                            {item.manualBaselineOdometerReading.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Manual Calculated Distance */}
                      <td className="px-4 py-3 text-center font-mono">
                        {item.manualDistanceKm != null ? (
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {item.manualDistanceKm.toFixed(2)} كم
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Applied Distance Km (Main Highlighted Column) */}
                      <td className="px-4 py-3 text-center font-mono bg-blue-50/50 dark:bg-blue-950/20">
                        {item.appliedDistanceKm != null ? (
                          <span className="text-sm font-black text-[#1167c9] dark:text-blue-400">
                            {item.appliedDistanceKm.toFixed(2)} كم
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">0.00 كم</span>
                        )}
                      </td>

                      {/* Applied Source Badge */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${sourceInfo.colorClass}`}
                        >
                          {sourceInfo.code === "Gps" && <CheckCircle2 className="h-3 w-3" />}
                          {sourceInfo.code === "Manual" && <Edit3 className="h-3 w-3" />}
                          {sourceInfo.code === "None" && <AlertCircle className="h-3 w-3" />}
                          <span>{sourceInfo.labelAr}</span>
                        </span>
                      </td>

                      {/* Vehicle Tracked Total Distance */}
                      <td className="px-4 py-3 text-center font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.vehicleTrackedDistanceKm != null
                            ? `${item.vehicleTrackedDistanceKm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} كم`
                            : "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        {(can("fleet.daily_distances.manage") || can("fleet.vehicles.read") || can("fleet.assignments.read")) && (
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenManualModal(item)}
                            className="text-[11px] py-1 px-2.5 gap-1 font-bold"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#1167c9]" />
                            <span>{item.manualOdometerReading != null ? "تعديل العداد" : "إدخال العداد"}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Enter/Edit Manual Odometer Reading */}
      <Modal
        isOpen={Boolean(selectedItemForManual)}
        onClose={() => setSelectedItemForManual(null)}
        title="إدخال / تعديل قراءة العداد اليدوية"
      >
        {selectedItemForManual && (
          <form onSubmit={handleManualSubmit} className="space-y-4 pt-2 text-xs">
            <Card className="p-3 bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-xs space-y-1 text-slate-800 dark:text-slate-200">
              <div className="flex items-center justify-between font-bold">
                <span>رقم الأصل: <span className="font-mono text-[#1167c9]">{selectedItemForManual.assetNumber}</span></span>
                <span>اللوحة: <strong>{selectedItemForManual.plateNumberAr || selectedItemForManual.plateNumberEn || "—"}</strong></span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                تاريخ العمل: {selectedItemForManual.workDate} | العداد التشغيلي الحالي: {selectedItemForManual.currentOdometer.toLocaleString()} كم
              </div>
            </Card>

            {requireBaselineInput && (
              <Card className="p-3 bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  مطلوب تحديد قراءة الأساس السابقة:
                </p>
                <p className="text-[11px] leading-relaxed">
                  لا توجد قراءة سابقة مسجلة لهذه المركبة لتحديد بداية احتساب اليوم. يُرجى أدناه إدخال قراءة العداد السابقة (الأساس).
                </p>
              </Card>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                قراءة العداد الإجمالية الحالية (Odometer) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={manualOdometer}
                onChange={(e) => setManualOdometer(e.target.value)}
                placeholder="أدخل قراءة العداد الإجمالية للمركبة (مثال: 10164)..."
                className="font-mono text-sm"
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                ملاحظة: هذه هي القراءة الكلية المكتوبة على عداد المركبة وليست مسافة اليوم فقط.
              </span>
            </div>

            {(requireBaselineInput || selectedItemForManual.manualBaselineOdometerReading != null || selectedItemForManual.currentOdometer != null) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    قراءة العداد السابقة (الأساس / Baseline) {requireBaselineInput && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {selectedItemForManual.currentOdometer != null && selectedItemForManual.gpsDistanceKm != null && selectedItemForManual.gpsDistanceKm > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const base = (selectedItemForManual.manualOdometerReading ?? selectedItemForManual.currentOdometer) - selectedItemForManual.gpsDistanceKm!;
                          const val = base > 0 ? base : 0;
                          setManualBaseline(Number.isInteger(val) ? val.toString() : val.toFixed(2));
                        }}
                        className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
                      >
                        خصم مسافة GPS ({( (selectedItemForManual.manualOdometerReading ?? selectedItemForManual.currentOdometer) - selectedItemForManual.gpsDistanceKm ).toFixed(2)} كم)
                      </button>
                    )}
                    {selectedItemForManual.currentOdometer != null && (
                      <button
                        type="button"
                        onClick={() => setManualBaseline(selectedItemForManual.currentOdometer.toString())}
                        className="text-[11px] text-[#1167c9] dark:text-blue-400 hover:underline font-bold"
                      >
                        العداد الحالي ({selectedItemForManual.currentOdometer.toLocaleString()} كم)
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={manualBaseline}
                  onChange={(e) => setManualBaseline(e.target.value)}
                  placeholder="أدخل قراءة الأساس السابقة..."
                  className="font-mono text-sm"
                  required={requireBaselineInput}
                />
              </div>
            )}

            {/* Calculated Preview */}
            {manualOdometer && manualBaseline && !isNaN(parseFloat(manualOdometer)) && !isNaN(parseFloat(manualBaseline)) && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border text-xs flex items-center justify-between font-bold">
                <span>المسافة اليدوية المحسوبة لليوم:</span>
                <span className="font-mono text-base text-[#1167c9]">
                  {(parseFloat(manualOdometer) - parseFloat(manualBaseline)).toFixed(2)} كم
                </span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                ملاحظات تشغيلية (اختياري)
              </label>
              <Input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات حول قراءة العداد..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedItemForManual(null)}
                disabled={isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending || !manualOdometer.trim()}
                className="gap-2 bg-[#1167c9] hover:bg-blue-700 text-white font-bold"
              >
                {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                حفظ قراءة العداد
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Upload GPS Report (.xls / .xlsx) */}
      <Modal
        isOpen={isGpsImportOpen}
        onClose={() => setIsGpsImportOpen(false)}
        title="رفع تقرير المسافات من نظام GPS"
      >
        <form onSubmit={handleGpsImportSubmit} className="space-y-4 pt-2 text-xs">
          <Card className="p-3 bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-xs text-slate-800 dark:text-slate-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-[#1167c9]">
              <Info className="h-4 w-4" />
              تعليمات رفع ملف GPS:
            </p>
            <p className="text-[11px] leading-relaxed">
              يدعم المستورد ملفات Excel بصيغة <strong>.xls</strong> و <strong>.xlsx</strong> وتقارير HTML المنزلة بنفس الامتداد. يتعرف المستورد تلقائياً على اللوحات والأرقام العربية والإنجليزية.
            </p>
          </Card>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              تاريخ العمل المتوقع للتقرير <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="font-mono text-xs font-bold"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              اختر ملف التقرير (.xls / .xlsx - أقصى 10MB) <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-900/50 hover:border-[#1167c9] transition-colors">
              <FileSpreadsheet className="h-8 w-8 text-[#1167c9] mx-auto mb-2" />
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setGpsFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1167c9] file:text-white hover:file:bg-blue-700 cursor-pointer"
                required
              />
              {gpsFile && (
                <p className="mt-2 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  الملف المحدد: {gpsFile.name} ({(gpsFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          {/* Import Results Box */}
          {importResult && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block">صفوف مطابقة</span>
                  <span className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-400">
                    {importResult.matchedRows}
                  </span>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">غير مطابقة</span>
                  <span className="font-mono text-lg font-black text-amber-700 dark:text-amber-400">
                    {importResult.unmatchedRows}
                  </span>
                </div>

                <div className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200">
                  <span className="text-[10px] text-red-800 dark:text-red-300 font-bold block">غير صالحة</span>
                  <span className="font-mono text-lg font-black text-red-700 dark:text-red-400">
                    {importResult.invalidRows}
                  </span>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="border rounded-xl p-3 bg-red-50/60 dark:bg-red-950/30 max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                  <p className="font-bold text-red-900 dark:text-red-300">ملاحظات وشرائح الأخطاء أثناء الرفع:</p>
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-red-800 dark:text-red-200 border-b border-red-200/50 pb-1">
                      {err.rowNumber && <span className="font-mono font-bold">[صف {err.rowNumber}] </span>}
                      {err.plateNumber && <span className="font-bold">لوحة: {err.plateNumber} — </span>}
                      <span>{err.message || err.errorCode}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsGpsImportOpen(false)}
              disabled={isUploading}
            >
              إغلاق
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !gpsFile}
              className="gap-2 bg-[#1167c9] hover:bg-blue-700 text-white font-bold"
            >
              {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              بدء معالجة الملف
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: GPS Import Logs History */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title="سجل عمليات رفع تقارير GPS"
      >
        <div className="space-y-4 pt-2 text-xs">
          {logsLoading ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#1167c9]" />
              <p className="text-xs text-[var(--muted)]">جاري تحميل سجل عمليات الرفع...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">لا توجد عمليات رفع مسجلة لليوم.</div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] rounded-xl border">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">اسم الملف</th>
                    <th className="p-2.5">تاريخ العمل</th>
                    <th className="p-2.5 text-center">الصفوف المطابقة</th>
                    <th className="p-2.5 text-center">غير مطابقة</th>
                    <th className="p-2.5 text-center">بواسطة</th>
                    <th className="p-2.5 text-center">وقت الرفع</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-2.5 font-mono font-bold text-[#1167c9] max-w-xs truncate">
                        {log.fileName}
                      </td>
                      <td className="p-2.5 font-mono">{log.workDate}</td>
                      <td className="p-2.5 text-center font-mono text-emerald-700 font-bold">
                        {log.matchedRows}
                      </td>
                      <td className="p-2.5 text-center font-mono text-amber-700">
                        {log.unmatchedRows}
                      </td>
                      <td className="p-2.5 text-center">{log.importedByUserName || "مستخدم النظام"}</td>
                      <td className="p-2.5 text-center font-mono text-[10px] text-slate-500">
                        {new Date(log.importedAtUtc).toLocaleString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={() => setIsLogsModalOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
