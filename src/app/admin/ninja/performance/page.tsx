// src/app/admin/ninja/performance/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getNinjaPerformance,
  getAllNinjaPerformance,
  getNinjaPerformanceReport,
  getNinjaDailyReport,
  getAllNinjaDailyReport,
  getNinjaRiderReport,
  getAllNinjaRiderReport,
  importNinjaPerformance,
  getAllNinjaAccounts,
  getRiyadhTodayDate,
  getRiyadhFirstDayOfMonth,
  type NinjaPerformanceResponse,
  type NinjaPerformanceReport,
  type NinjaDailyReport,
  type NinjaDailySponsorReport,
  type NinjaRiderReport,
  type NinjaAccountResponse,
  type NinjaImportResponse,
  type NinjaImportIssue,
  type NinjaReportQuery,
} from "@/lib/ninja/api";
import { listRiders } from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateInput } from "@/components/ui/DateInput";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  BarChart3,
  Upload,
  RefreshCw,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Info,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Users,
  Wallet,
  Receipt,
  Building2,
} from "lucide-react";

type PerformanceTab = "summary" | "riders" | "daily" | "records";

export default function NinjaPerformancePage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const canRead = can("ninja.read") || can("ninja.performance.import");
  // Strictly require ninja.performance.import — never infer import access from ninja.read!
  const canImport = can("ninja.performance.import");

  const todayRiyadh = useMemo(() => getRiyadhTodayDate(), []);
  const defaultFrom = useMemo(() => getRiyadhFirstDayOfMonth(), []);

  // Filter States
  const [filterFrom, setFilterFrom] = useState(defaultFrom);
  const [filterTo, setFilterTo] = useState(todayRiyadh);
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterRiderId, setFilterRiderId] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<PerformanceTab>("summary");

  // Lookups
  const [accounts, setAccounts] = useState<NinjaAccountResponse[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);

  // 1. Range Summary Report State
  const [summaryReport, setSummaryReport] = useState<NinjaPerformanceReport | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // 2. Rider Performance Report State (Loads all riders in period)
  const [riderReportItems, setRiderReportItems] = useState<NinjaRiderReport[]>([]);
  const [riderLoading, setRiderLoading] = useState(false);
  const [riderSearch, setRiderSearch] = useState("");

  // 3. Daily Trend Report State (Loads all days in period)
  const [dailyReportItems, setDailyReportItems] = useState<NinjaDailyReport[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const toggleDayExpand = (dateStr: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  const toggleAllDays = () => {
    if (expandedDays.size === dailyReportItems.length) {
      setExpandedDays(new Set());
    } else {
      setExpandedDays(new Set(dailyReportItems.map((d) => d.date)));
    }
  };

  // 4. Raw Records State (Loads all records in period with optional view-all)
  const [records, setRecords] = useState<NinjaPerformanceResponse[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsSearch, setRecordsSearch] = useState("");
  const [recordsPageSize, setRecordsPageSize] = useState<number | "all">("all");
  const [recordsPage, setRecordsPage] = useState(1);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadDate, setUploadDate] = useState(todayRiyadh);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<NinjaImportResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [accList, riderList] = await Promise.all([
          getAllNinjaAccounts(100).catch(() => []),
          listRiders().catch(() => []),
        ]);
        setAccounts(accList);
        setRiders(riderList);
      } catch (e) {
        console.warn("Could not load lookups", e);
      }
    };
    loadLookups();
  }, []);

  const baseQuery = useMemo<NinjaReportQuery>(() => {
    const q: NinjaReportQuery = {
      from: filterFrom,
      to: filterTo,
    };
    if (filterAccountId) q.accountId = filterAccountId;
    if (filterRiderId) q.riderId = filterRiderId;
    return q;
  }, [filterFrom, filterTo, filterAccountId, filterRiderId]);

  // Load Summary
  const loadSummary = async () => {
    if (!canRead || !filterFrom || !filterTo) return;
    setSummaryLoading(true);
    try {
      const res = await getNinjaPerformanceReport(baseQuery);
      setSummaryReport(res);
    } catch (err: any) {
      console.warn("Could not load summary report", err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Load Rider Report (fetches all riders for the period)
  const loadRiderReport = async () => {
    if (!canRead || !filterFrom || !filterTo) return;
    setRiderLoading(true);
    try {
      const items = await getAllNinjaRiderReport(baseQuery);
      setRiderReportItems(items);
    } catch (err: any) {
      console.warn("Could not load rider report", err);
      setRiderReportItems([]);
    } finally {
      setRiderLoading(false);
    }
  };

  // Load Daily Trend (fetches all days for the period)
  const loadDailyReport = async () => {
    if (!canRead || !filterFrom || !filterTo) return;
    setDailyLoading(true);
    try {
      const items = await getAllNinjaDailyReport(baseQuery);
      setDailyReportItems(items);
    } catch (err: any) {
      console.warn("Could not load daily report", err);
      setDailyReportItems([]);
    } finally {
      setDailyLoading(false);
    }
  };

  // Load Raw Records (fetches all performance records for the period)
  const loadRawRecords = async () => {
    if (!canRead || !filterFrom || !filterTo) return;
    setRecordsLoading(true);
    try {
      const items = await getAllNinjaPerformance(baseQuery);
      setRecords(items);
      setRecordsPage(1);
    } catch (err: any) {
      console.warn("Could not load raw performance records", err);
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Refetch when filters change
  useEffect(() => {
    loadSummary();
    if (activeTab === "riders") loadRiderReport();
    if (activeTab === "daily") loadDailyReport();
    if (activeTab === "records") loadRawRecords();
  }, [filterFrom, filterTo, filterAccountId, filterRiderId]);

  useEffect(() => {
    if (activeTab === "summary") loadSummary();
    else if (activeTab === "riders") loadRiderReport();
    else if (activeTab === "daily") loadDailyReport();
    else if (activeTab === "records") loadRawRecords();
  }, [activeTab]);

  // Handle Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("تنبيه", "يرجى اختيار ملف التقرير (.xlsx).");
      return;
    }
    if (!uploadDate) {
      toast.error("تنبيه", "يرجى تحديد تاريخ التقرير.");
      return;
    }
    if (uploadDate > todayRiyadh) {
      toast.error("تنبيه", "لا يمكن لتاريخ التقرير أن يتجاوز تاريخ اليوم بتوقيت الرياض.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const outcome = await importNinjaPerformance(uploadDate, uploadFile);
      setUploadResult(outcome);

      if (outcome.issues && outcome.issues.length > 0) {
        toast.error("تنبيه الاستيراد", `تم رفض الملف بالكامل لوجود ${outcome.issues.length} مشكلة.`);
      } else if (outcome.importedRows === 0 && outcome.skippedRows > 0) {
        toast.info("بيانات مكررة", "تم استيراد كافة صفوف هذا اليوم سابقاً (تطابق تام).");
        loadSummary();
      } else {
        toast.success(
          "تم الاستيراد بنجاح",
          `تم استيراد ${outcome.importedRows} صف وتخطي ${outcome.skippedRows} صف مكرر.`
        );
        loadSummary();
        if (activeTab === "daily") loadDailyReport();
        if (activeTab === "records") loadRawRecords();
        if (activeTab === "riders") loadRiderReport();
      }
    } catch (err: any) {
      console.error("Upload error", err);
      const msg = err?.message || "حدث خطأ أثناء رفع ملف الأداء اليومي.";
      setUploadError(msg);
      toast.error("خطأ في الرفع", msg);
    } finally {
      setUploading(false);
    }
  };

  // Filtered riders for search
  const filteredRiders = useMemo(() => {
    if (!riderSearch.trim()) return riderReportItems;
    const q = riderSearch.trim().toLowerCase();
    return riderReportItems.filter((item) => {
      const nameAr = (item.rider?.nameAr || "").toLowerCase();
      const nameEn = (item.rider?.nameEn || "").toLowerCase();
      const iqama = (item.rider?.iqamaNo || "").toLowerCase();
      const phone = (item.rider?.phoneNumber || "").toLowerCase();
      return nameAr.includes(q) || nameEn.includes(q) || iqama.includes(q) || phone.includes(q);
    });
  }, [riderReportItems, riderSearch]);

  // Exports
  const exportRiders = () => {
    exportToExcel({
      filename: `ninja-riders-performance-${filterFrom}-to-${filterTo}`,
      sheetName: "أداء المناديب",
      data: filteredRiders,
      columns: [
        { header: "اسم المندوب", accessor: (r) => r.rider?.nameAr || r.rider?.nameEn || "—" },
        { header: "رقم الهوية", accessor: (r) => r.rider?.iqamaNo || "—", isText: true },
        { header: "رقم الهاتف", accessor: (r) => r.rider?.phoneNumber || "—", isText: true },
        { header: "عدد الحسابات", accessor: (r) => r.accountsWithData },
        { header: "أيام الأداء", accessor: (r) => r.daysWithPerformance },
        { header: "إجمالي الطلبات", accessor: (r) => r.metrics?.totalOrders || 0 },
        { header: "ساعات العمل", accessor: (r) => Number((r.metrics?.totalWorkingHours || 0).toFixed(2)) },
        {
          header: "الإنتاجية (طلب/ساعة)",
          accessor: (r) =>
            r.metrics?.ordersPerWorkingHour !== null && r.metrics?.ordersPerWorkingHour !== undefined
              ? Number(r.metrics.ordersPerWorkingHour.toFixed(2))
              : "—",
        },
        { header: "المبالغ المحصلة", accessor: (r) => r.metrics?.totalCollectedAmountAtDelivery || 0 },
        { header: "الخصومات", accessor: (r) => r.metrics?.totalDeductions || 0 },
      ],
    });
  };

  const exportDaily = () => {
    const rows: Array<{
      date: string;
      sponsor: string;
      perfRecords: number;
      dedRecords: number;
      orders: number;
      hours: number;
      prod: number | string;
      collected: number;
      deductions: number;
    }> = [];

    dailyReportItems.forEach((day) => {
      rows.push({
        date: day.date,
        sponsor: day.sponsors && day.sponsors.length > 0 ? "إجمالي اليوم" : "—",
        perfRecords: day.metrics?.performanceRecords || 0,
        dedRecords: day.metrics?.deductionRecords || 0,
        orders: day.metrics?.totalOrders || 0,
        hours: Number((day.metrics?.totalWorkingHours || 0).toFixed(2)),
        prod:
          day.metrics?.ordersPerWorkingHour !== null && day.metrics?.ordersPerWorkingHour !== undefined
            ? Number(day.metrics.ordersPerWorkingHour.toFixed(2))
            : "—",
        collected: day.metrics?.totalCollectedAmountAtDelivery || 0,
        deductions: day.metrics?.totalDeductions || 0,
      });

      if (day.sponsors && day.sponsors.length > 0) {
        day.sponsors.forEach((sp) => {
          rows.push({
            date: day.date,
            sponsor: sp.sponsorNameAr || sp.sponsorNameEn || "كفيل غير محدد",
            perfRecords: sp.metrics?.performanceRecords || 0,
            dedRecords: sp.metrics?.deductionRecords || 0,
            orders: sp.metrics?.totalOrders || 0,
            hours: Number((sp.metrics?.totalWorkingHours || 0).toFixed(2)),
            prod:
              sp.metrics?.ordersPerWorkingHour !== null && sp.metrics?.ordersPerWorkingHour !== undefined
                ? Number(sp.metrics.ordersPerWorkingHour.toFixed(2))
                : "—",
            collected: sp.metrics?.totalCollectedAmountAtDelivery || 0,
            deductions: sp.metrics?.totalDeductions || 0,
          });
        });
      }
    });

    exportToExcel({
      filename: `ninja-daily-trend-${filterFrom}-to-${filterTo}`,
      sheetName: "تقرير الأيام والكفلاء",
      data: rows,
      columns: [
        { header: "التاريخ", accessor: (r) => r.date, isText: true },
        { header: "الكفيل / البيان", accessor: (r) => r.sponsor, isText: true },
        { header: "سجلات الأداء", accessor: (r) => r.perfRecords },
        { header: "سجلات الخصومات", accessor: (r) => r.dedRecords },
        { header: "إجمالي الطلبات", accessor: (r) => r.orders },
        { header: "ساعات العمل", accessor: (r) => r.hours },
        { header: "الإنتاجية (طلب/ساعة)", accessor: (r) => r.prod },
        { header: "المبالغ المحصلة", accessor: (r) => r.collected },
        { header: "الخصومات", accessor: (r) => r.deductions },
      ],
    });
  };

  // Filtered and paged records for Raw Records tab
  const filteredRecords = useMemo(() => {
    if (!recordsSearch.trim()) return records;
    const q = recordsSearch.trim().toLowerCase();
    return records.filter((r) => {
      const capId = (r.captainId || "").toLowerCase();
      const rider = riders.find((rd) => rd.id === r.riderProfileId);
      const riderName = (rider?.fullNameAr || rider?.fullNameEn || "").toLowerCase();
      return capId.includes(q) || riderName.includes(q);
    });
  }, [records, recordsSearch, riders]);

  const totalRecordPages = useMemo(() => {
    if (recordsPageSize === "all" || recordsPageSize <= 0) return 1;
    return Math.max(1, Math.ceil(filteredRecords.length / recordsPageSize));
  }, [filteredRecords.length, recordsPageSize]);

  const pagedRecords = useMemo(() => {
    if (recordsPageSize === "all") return filteredRecords;
    const start = (recordsPage - 1) * recordsPageSize;
    return filteredRecords.slice(start, start + recordsPageSize);
  }, [filteredRecords, recordsPage, recordsPageSize]);

  const exportRecords = () => {
    exportToExcel({
      filename: `ninja-raw-records-${filterFrom}-to-${filterTo}`,
      sheetName: "السجلات الخام",
      data: filteredRecords,
      columns: [
        { header: "التاريخ", accessor: (r) => r.reportDate, isText: true },
        { header: "كابتن ID", accessor: (r) => r.captainId, isText: true },
        {
          header: "المندوب الفعلي المنسوب",
          accessor: (r) => {
            const rd = riders.find((x) => x.id === r.riderProfileId);
            return rd?.fullNameAr || rd?.fullNameEn || "—";
          },
        },
        { header: "إجمالي الطلبات", accessor: (r) => r.totalOrders },
        { header: "ساعات العمل", accessor: (r) => Number(Number(r.totalWorkingHours).toFixed(2)) },
      ],
    });
  };

  if (!canRead) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center" dir={isEn ? "ltr" : "rtl"}>
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {t("common.error") || "غير مصرح"}
        </h2>
        <p className="text-slate-500 max-w-md">
          {isEn
            ? "You do not have permission to view Ninja performance reports (ninja.read)."
            : "ليس لديك الصلاحية الكافية لعرض تقارير أداء نينجا (ninja.read)."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isEn ? "ltr" : "rtl"}>
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <Link href="/admin" className="hover:text-[var(--foreground)]">
              {t("nav.dashboard") || "لوحة التحكم"}
            </Link>
            <span>/</span>
            <span className="font-semibold text-[var(--foreground)]">إدارة نينجا</span>
            <span>/</span>
            <span>الأداء والتقارير</span>
          </div>

          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                الأداء والتقارير التجميعية لمنصة نينجا
              </h1>
              <p className="text-xs text-[var(--muted)]">
                متابعة أداء المناديب الفعليين، اتجاهات الأيام، معدلات الإنتاجية، ورفع شيتات الأداء اليومية.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/ninja/evaluation">
            <Button variant="secondary" className="gap-2 border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 text-xs font-bold">
              <Award className="h-4 w-4 text-blue-600" />
              {isEn ? "Evaluation & Suggested Earnings" : "تقييم الأداء والمبالغ المقترحة"}
            </Button>
          </Link>

          <Link href="/admin/ninja/accounts">
            <Button variant="secondary" className="gap-2 text-xs">
              <Zap className="h-4 w-4 text-purple-600" />
              حسابات نينجا
            </Button>
          </Link>

          <Button
            variant="secondary"
            onClick={() => {
              loadSummary();
              if (activeTab === "riders") loadRiderReport();
              if (activeTab === "daily") loadDailyReport();
              if (activeTab === "records") loadRawRecords();
            }}
            disabled={summaryLoading || riderLoading || dailyLoading || recordsLoading}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${summaryLoading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          {canImport && (
            <Button
              variant="primary"
              onClick={() => {
                setIsUploadOpen(true);
                setUploadResult(null);
                setUploadError(null);
                setUploadFile(null);
              }}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
            >
              <Upload className="h-4 w-4" />
              رفع شيت أداء يومي
            </Button>
          )}
        </div>
      </div>

      {/* Date Range & Global Filters */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--muted)]">الفترة:</span>
              <DateInput
                value={filterFrom}
                onChange={setFilterFrom}
                max={filterTo || todayRiyadh}
                className="w-36 text-xs"
              />
              <span className="text-xs text-[var(--muted)]">إلى</span>
              <DateInput
                value={filterTo}
                onChange={setFilterTo}
                max={todayRiyadh}
                min={filterFrom}
                className="w-36 text-xs"
              />
            </div>

            <div className="w-48">
              <SearchableSelect
                options={[
                  { value: "", label: "جميع الكباتن / الحسابات" },
                  ...accounts.map((a) => ({
                    value: a.accountId || a.id || "",
                    label: `${a.captainId} (${a.code || "NINJA"})`,
                  })),
                ]}
                value={filterAccountId}
                onChange={setFilterAccountId}
                placeholder="تصفية بالحساب..."
              />
            </div>

            <div className="w-56">
              <SearchableSelect
                options={[
                  { value: "", label: "جميع المناديب الفعليين" },
                  ...riders.map((r) => ({
                    value: r.id,
                    label: `${r.fullNameAr || r.fullNameEn} (${r.iqamaNo || r.employeeId})`,
                  })),
                ]}
                value={filterRiderId}
                onChange={setFilterRiderId}
                placeholder="تصفية بالمندوب الفعلي..."
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
          {[
            { id: "summary", label: "مؤشرات الأداء العامة (KPIs)", icon: TrendingUp },
            { id: "riders", label: "تقرير أداء المناديب", icon: Award },
            { id: "daily", label: "تقرير الأيام والاتجاهات", icon: Calendar },
            { id: "records", label: "السجلات اليومية الخام", icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PerformanceTab)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  active
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "bg-[var(--subtle-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: Performance Summary KPIs                                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {summaryLoading ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mb-2" />
              <p className="text-xs text-[var(--muted)]">جارٍ حساب مؤشرات الفترة المحددة...</p>
            </div>
          ) : !summaryReport ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
              لا توجد بيانات متاحة لهذه الفترة.
            </div>
          ) : (
            <>
              {/* Top Stats Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {/* Total Orders */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
                    <span>إجمالي الطلبات</span>
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-[var(--foreground)]">
                    {summaryReport.metrics?.totalOrders || 0}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">خلال الفترة المحددة</div>
                </div>

                {/* Total Working Hours */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
                    <span>ساعات العمل الكلية</span>
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-[var(--foreground)]">
                    {Number((summaryReport.metrics?.totalWorkingHours || 0).toFixed(2))}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">ساعة مسجلة</div>
                </div>

                {/* Productivity (Orders / Hour) */}
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                    <span>معدل الإنتاجية</span>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {summaryReport.metrics?.ordersPerWorkingHour !== null &&
                    summaryReport.metrics?.ordersPerWorkingHour !== undefined
                      ? Number(summaryReport.metrics.ordersPerWorkingHour.toFixed(2))
                      : "—"}
                  </div>
                  <div className="text-[10px] text-emerald-600/80">طلب / ساعة عمل</div>
                </div>

                {/* Total Collected Amount */}
                <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 p-4 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center justify-between">
                    <span>المبالغ المحصلة</span>
                    <Wallet className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
                    {summaryReport.metrics?.totalCollectedAmountAtDelivery || 0}
                  </div>
                  <div className="text-[10px] text-blue-600/80">ريال سعودي</div>
                </div>

                {/* Total Deductions (Signed) */}
                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 p-4 shadow-sm space-y-1">
                  <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center justify-between">
                    <span>صافي الخصومات</span>
                    <Receipt className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-700 dark:text-rose-300">
                    {summaryReport.metrics?.totalDeductions || 0}
                  </div>
                  <div className="text-[10px] text-rose-600/80">ريال (تحتفظ بالإشارة)</div>
                </div>
              </div>

              {/* Coverage and Activity Details */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  تغطية النشاط والسجلات المرفوعة بالفترة
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 text-center">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3">
                    <div className="text-xs text-[var(--muted)]">أيام بها أداء</div>
                    <div className="text-lg font-black text-[var(--foreground)]">
                      {summaryReport.daysWithPerformance || 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3">
                    <div className="text-xs text-[var(--muted)]">أيام بها خصومات</div>
                    <div className="text-lg font-black text-[var(--foreground)]">
                      {summaryReport.daysWithDeductions || 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3">
                    <div className="text-xs text-[var(--muted)]">الحسابات النشطة</div>
                    <div className="text-lg font-black text-[var(--foreground)]">
                      {summaryReport.accountsWithData || 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3">
                    <div className="text-xs text-[var(--muted)]">المناديب النشطين</div>
                    <div className="text-lg font-black text-[var(--foreground)]">
                      {summaryReport.ridersWithData || 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3">
                    <div className="text-xs text-[var(--muted)]">سجلات الأداء</div>
                    <div className="text-lg font-black text-[var(--foreground)]">
                      {summaryReport.metrics?.performanceRecords || 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3">
                    <div className="text-xs text-[var(--muted)]">سجلات الخصم</div>
                    <div className="text-lg font-black text-[var(--foreground)]">
                      {summaryReport.metrics?.deductionRecords || 0}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    تعتمد هذه الإحصائيات على بيانات الأداء والخصومات المرفوعة مسبقاً وتنسب تاريخياً للمندوب الفعلي المشغل للحساب في يوم التقرير،
                    ولا تتأثر بإرجاع أو إعادة تعيين الحساب لاحقاً.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: Rider Performance Report                                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "riders" && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--foreground)]">تقرير أداء المناديب</span>
              <Badge tone="purple" className="text-xs">
                {filteredRiders.length} مندوب
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px]">
                <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-[var(--muted)] rtl:right-3 ltr:left-3" />
                <Input
                  placeholder="بحث باسم المندوب، الهوية أو الهاتف..."
                  value={riderSearch}
                  onChange={(e) => setRiderSearch(e.target.value)}
                  className="h-8.5 text-xs pr-8 rtl:pr-8 ltr:pl-8"
                />
              </div>

              <Button variant="secondary" size="sm" onClick={exportRiders} className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                تصدير المناديب (Excel)
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-[var(--subtle-bg)] text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 font-bold">المندوب الفعلي</th>
                  <th className="px-4 py-3 font-bold">رقم الهوية</th>
                  <th className="px-4 py-3 font-bold">رقم الهاتف</th>
                  <th className="px-4 py-3 font-bold text-center">الحسابات</th>
                  <th className="px-4 py-3 font-bold text-center">أيام الأداء</th>
                  <th className="px-4 py-3 font-bold text-center">إجمالي الطلبات</th>
                  <th className="px-4 py-3 font-bold text-center">ساعات العمل</th>
                  <th className="px-4 py-3 font-bold text-center">الإنتاجية (طلب/ساعة)</th>
                  <th className="px-4 py-3 font-bold text-center">المبالغ المحصلة</th>
                  <th className="px-4 py-3 font-bold text-center">الخصومات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {riderLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <RefreshCw className="h-7 w-7 animate-spin text-purple-600 mx-auto mb-2" />
                      <p className="text-xs text-[var(--muted)]">جارٍ جلب تقرير المناديب...</p>
                    </td>
                  </tr>
                ) : filteredRiders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                      لا توجد بيانات مناديب مسجلة في هذه الفترة.
                    </td>
                  </tr>
                ) : (
                  filteredRiders.map((item, idx) => {
                    const rider = item.rider;
                    const orders = item.metrics?.totalOrders || 0;
                    const hours = Number((item.metrics?.totalWorkingHours || 0).toFixed(2));
                    const prod = item.metrics?.ordersPerWorkingHour;

                    return (
                      <tr key={idx} className="hover:bg-[var(--subtle-bg)]/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-[var(--foreground)]">
                          {rider?.nameAr || rider?.nameEn || "مندوب غير محدد"}
                        </td>
                        <td className="px-4 py-3 font-mono" dir="ltr">
                          {rider?.iqamaNo || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono" dir="ltr">
                          {rider?.phoneNumber || "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {item.accountsWithData}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {item.daysWithPerformance}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-purple-700 dark:text-purple-300 text-sm">
                          {orders}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {hours}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {prod !== null && prod !== undefined ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {Number(prod.toFixed(2))}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {item.metrics?.totalCollectedAmountAtDelivery || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-rose-600">
                          {item.metrics?.totalDeductions || 0}
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

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: Daily Trend Report                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "daily" && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--foreground)]">
                تقرير الاتجاهات اليومية بالأيام المسجلة
              </span>
              <Badge tone="purple" className="text-xs">
                {dailyReportItems.length} يوم
              </Badge>
              {dailyReportItems.length > 0 && (
                <span className="text-[11px] text-[var(--muted)] hidden sm:inline">
                  (اضغط على اليوم لعرض تفاصيل الكفلاء)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dailyReportItems.some((d) => d.sponsors && d.sponsors.length > 0) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleAllDays}
                  className="gap-1.5 text-xs"
                >
                  {expandedDays.size === dailyReportItems.length ? "طي الكل" : "توسيع الكل"}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={exportDaily} className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                تصدير الأيام والكفلاء (Excel)
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-[var(--subtle-bg)] text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 font-bold">التاريخ / الكفيل</th>
                  <th className="px-4 py-3 font-bold text-center">سجلات الأداء</th>
                  <th className="px-4 py-3 font-bold text-center">سجلات الخصم</th>
                  <th className="px-4 py-3 font-bold text-center">إجمالي الطلبات</th>
                  <th className="px-4 py-3 font-bold text-center">ساعات العمل</th>
                  <th className="px-4 py-3 font-bold text-center">الإنتاجية</th>
                  <th className="px-4 py-3 font-bold text-center">المبالغ المحصلة</th>
                  <th className="px-4 py-3 font-bold text-center">الخصومات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {dailyLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <RefreshCw className="h-7 w-7 animate-spin text-purple-600 mx-auto mb-2" />
                      <p className="text-xs text-[var(--muted)]">جارٍ جلب تقرير الأيام...</p>
                    </td>
                  </tr>
                ) : dailyReportItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                      لا توجد أيام مسجلة في هذه الفترة.
                    </td>
                  </tr>
                ) : (
                  dailyReportItems.map((day, idx) => {
                    const isExpanded = expandedDays.has(day.date);
                    const hasSponsors = !!(day.sponsors && day.sponsors.length > 0);
                    const prod = day.metrics?.ordersPerWorkingHour;

                    return (
                      <React.Fragment key={day.date || idx}>
                        <tr
                          onClick={() => toggleDayExpand(day.date)}
                          className={`cursor-pointer transition-colors select-none ${
                            isExpanded
                              ? "bg-purple-50/70 dark:bg-purple-950/30"
                              : "hover:bg-[var(--subtle-bg)]/50"
                          }`}
                          title="اضغط لعرض أو إخفاء تفاصيل الكفلاء"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-sm text-[var(--foreground)]">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={isExpanded ? "طي" : "توسيع"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDayExpand(day.date);
                                }}
                                className={`h-5 w-5 flex items-center justify-center rounded transition-transform ${
                                  hasSponsors ? "text-purple-600 dark:text-purple-400" : "text-[var(--muted)] opacity-40"
                                }`}
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform duration-200 ${
                                    isExpanded ? "rotate-0" : "-rotate-90 rtl:rotate-90"
                                  }`}
                                />
                              </button>
                              <span dir="ltr">{day.date}</span>
                              {hasSponsors && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                  <Building2 className="h-3 w-3" />
                                  {day.sponsors!.length} كفيل
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{day.metrics?.performanceRecords || 0}</td>
                          <td className="px-4 py-3 text-center">{day.metrics?.deductionRecords || 0}</td>
                          <td className="px-4 py-3 text-center font-black text-purple-700 dark:text-purple-300">
                            {day.metrics?.totalOrders || 0}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {Number((day.metrics?.totalWorkingHours || 0).toFixed(2))}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">
                            {prod !== null && prod !== undefined ? Number(prod.toFixed(2)) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {day.metrics?.totalCollectedAmountAtDelivery || 0}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-rose-600">
                            {day.metrics?.totalDeductions || 0}
                          </td>
                        </tr>

                        {/* Expanded Sponsors Rows */}
                        {isExpanded && (
                          <>
                            {hasSponsors ? (
                              day.sponsors!.map((sp, spIdx) => {
                                const spProd = sp.metrics?.ordersPerWorkingHour;
                                return (
                                  <tr
                                    key={`${day.date}-sponsor-${sp.sponsorId || spIdx}`}
                                    className="bg-purple-50/25 dark:bg-purple-950/15 hover:bg-purple-50/50 dark:hover:bg-purple-950/25 transition-colors border-t border-dashed border-[var(--border)]"
                                  >
                                    <td className="px-4 py-2.5 ps-11 text-[var(--foreground)]">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[var(--muted)] font-mono text-[11px]">↳</span>
                                        <Building2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                        <span className="font-semibold text-xs text-[var(--foreground)]">
                                          {sp.sponsorNameAr || sp.sponsorNameEn || "كفيل غير محدد"}
                                        </span>
                                        <span className="text-[10px] text-[var(--muted)] bg-[var(--card)] px-1.5 py-0.2 rounded border border-[var(--border)]">
                                          كفيل
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-xs text-[var(--muted)]">
                                      {sp.metrics?.performanceRecords || 0}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-xs text-[var(--muted)]">
                                      {sp.metrics?.deductionRecords || 0}
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-bold text-xs text-purple-600 dark:text-purple-400">
                                      {sp.metrics?.totalOrders || 0}
                                    </td>
                                    <td className="px-4 py-2.5 text-center text-xs">
                                      {Number((sp.metrics?.totalWorkingHours || 0).toFixed(2))}
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-semibold text-xs text-emerald-600">
                                      {spProd !== null && spProd !== undefined ? Number(spProd.toFixed(2)) : "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-mono text-xs">
                                      {sp.metrics?.totalCollectedAmountAtDelivery || 0}
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-mono font-semibold text-xs text-rose-600">
                                      {sp.metrics?.totalDeductions || 0}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr className="bg-[var(--subtle-bg)]/20 border-t border-dashed border-[var(--border)]">
                                <td colSpan={8} className="py-3 ps-11 text-xs text-[var(--muted)]">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--muted)] font-mono text-[11px]">↳</span>
                                    <span>لا توجد بيانات تفصيلية للكفلاء لهذا اليوم.</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: Raw Daily Records                                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "records" && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--foreground)]">سجلات الأداء اليومية الخام</span>
              <Badge tone="purple" className="text-xs">
                {filteredRecords.length} سجل
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-[var(--muted)] rtl:right-3 ltr:left-3" />
                <Input
                  placeholder="بحث بكابتن ID أو اسم المندوب..."
                  value={recordsSearch}
                  onChange={(e) => {
                    setRecordsSearch(e.target.value);
                    setRecordsPage(1);
                  }}
                  className="h-8.5 text-xs pr-8 rtl:pr-8 ltr:pl-8"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)]">
                <span>عرض:</span>
                <select
                  value={recordsPageSize}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRecordsPageSize(val === "all" ? "all" : Number(val));
                    setRecordsPage(1);
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs font-bold text-[var(--foreground)]"
                >
                  <option value="all">عرض الكل ({filteredRecords.length})</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                </select>
              </div>

              <Button variant="secondary" size="sm" onClick={exportRecords} className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                تصدير السجلات (Excel)
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-[var(--subtle-bg)] text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 font-bold">التاريخ</th>
                  <th className="px-4 py-3 font-bold">كابتن ID</th>
                  <th className="px-4 py-3 font-bold">المندوب الفعلي المنسوب</th>
                  <th className="px-4 py-3 font-bold text-center">إجمالي الطلبات</th>
                  <th className="px-4 py-3 font-bold text-center">ساعات العمل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recordsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <RefreshCw className="h-7 w-7 animate-spin text-purple-600 mx-auto mb-2" />
                      <p className="text-xs text-[var(--muted)]">جارٍ جلب السجلات الخام...</p>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--muted)]">
                      لا توجد سجلات أداء مطابقة.
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((r) => {
                    const rider = riders.find((rd) => rd.id === r.riderProfileId);
                    return (
                      <tr key={r.id} className="hover:bg-[var(--subtle-bg)]/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold" dir="ltr">
                          {r.reportDate}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-[var(--foreground)]" dir="ltr">
                          {r.captainId}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-[var(--foreground)]">
                            {rider?.fullNameAr || rider?.fullNameEn || "المندوب المنسوب"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-purple-700 dark:text-purple-300">
                          {r.totalOrders}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {Number(Number(r.totalWorkingHours).toFixed(2))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {recordsPageSize !== "all" && totalRecordPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 bg-[var(--subtle-bg)]/40 text-xs">
              <div className="text-[var(--muted)]">
                صفحة {recordsPage} من {totalRecordPages} (إجمالي {filteredRecords.length} سجل)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={recordsPage <= 1 || recordsLoading}
                  onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                >
                  السابق
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={recordsPage >= totalRecordPages || recordsLoading}
                  onClick={() => setRecordsPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Upload Daily Performance Modal                                */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => !uploading && setIsUploadOpen(false)}
        title="رفع شيت الأداء اليومي لمنصة نينجا"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs" dir="rtl">
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-purple-600" />
              قواعد رفع شيت الأداء (Daily Performance)
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              الأعمدة المطلوبة في الصف الأول: Captain ID, Total Orders, Total Working Hours.
              يتم ربط كل صف بالمندوب الفعلي المعين في تاريخ التقرير المحدد ولا يمكن تعديل السجلات المسجلة مسبقاً.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[var(--foreground)] mb-1">
              تاريخ التقرير (Report Date) *
            </label>
            <DateInput
              value={uploadDate}
              onChange={setUploadDate}
              max={todayRiyadh}
              required
              className="w-full text-xs"
            />
            <p className="text-[10px] text-[var(--muted)] mt-1">
              لا يمكن أن يكون التاريخ بعد اليوم بتوقيت الرياض ({todayRiyadh}).
            </p>
          </div>

          <div>
            <label className="block font-bold text-[var(--foreground)] mb-1">
              ملف إكسل للأداء (.xlsx) *
            </label>
            <input
              type="file"
              accept=".xlsx"
              required
              disabled={uploading}
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-[var(--foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
          </div>

          {uploadError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 font-bold">
              {uploadError}
            </div>
          )}

          {uploadResult && uploadResult.issues && uploadResult.issues.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 space-y-2">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                تم رفض الملف لوجود ملاحظات وأخطاء:
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]">
                {uploadResult.issues.map((iss, i) => (
                  <div key={i}>
                    • [صف {iss.rowNumber}{iss.captainId ? ` - كابتن ${iss.captainId}` : ""}]: {iss.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={() => setIsUploadOpen(false)} disabled={uploading}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || !uploadFile}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
            >
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              رفع وفحص الملف
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
