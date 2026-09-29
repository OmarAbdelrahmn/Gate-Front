"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Building,
  Search,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Users,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { exportToExcel, type ExcelColumn } from "../../../../lib/export-excel";
import {
  getHousingStayReport,
  type Housing,
  type StayReportItem,
  type StayReportResponse,
  type StayReportRecordType,
} from "../../../../lib/housing/api";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { SearchableSelect, type SelectOption } from "../../../../components/ui/SearchableSelect";
import { toast } from "../../../../components/ui/Toast";

interface HousingStayReportViewProps {
  housings?: Housing[];
}

export default function HousingStayReportView({ housings = [] }: HousingStayReportViewProps) {
  const { locale, refreshSession } = useAuth();
  const isEn = locale === "en";

  // Server Query Parameters
  // Default dates: start and end are NOT set (empty / none) as requested
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedHousingId, setSelectedHousingId] = useState<string>("");

  // Default page & pageSize: default 5000 rows as requested
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5000);

  // Data & States
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>("");
  const [reportData, setReportData] = useState<StayReportResponse | null>(null);

  // Problem Details / Error State
  const [errorDetails, setErrorDetails] = useState<{
    status?: number;
    title?: string;
    detail?: string;
    errorCode?: string;
    errors?: Record<string, string[]>;
    message?: string;
  } | null>(null);
  const [refreshingSession, setRefreshingSession] = useState<boolean>(false);

  // In-memory Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("ALL");
  const [occupancyFilter, setOccupancyFilter] = useState<string>("ALL");

  // Options for Housing SearchableSelect
  const housingOptions: SelectOption[] = useMemo(() => {
    const list = housings.map((h) => ({
      value: h.id,
      label: isEn ? h.nameEn || h.nameAr : h.nameAr,
      sublabel: h.code,
    }));
    return [
      {
        value: "",
        label: isEn ? "All Housing Facilities" : "جميع وحدات السكن",
      },
      ...list,
    ];
  }, [housings, isEn]);

  // Main Report Fetcher
  async function fetchReport(targetPage: number = page, targetPageSize: number = pageSize) {
    // Client-side date check
    if (fromDate && toDate && fromDate > toDate) {
      const msg = isEn
        ? "Start date cannot be after end date."
        : "تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية.";
      toast.error(isEn ? "Invalid Date Range" : "نطاق تاريخ غير صالح", msg);
      setErrorDetails({
        status: 400,
        errorCode: "housing.invalid_toDate",
        title: isEn ? "Invalid Date Range" : "نطاق تاريخ غير صالح",
        detail: msg,
      });
      return;
    }

    setLoading(true);
    setErrorDetails(null);

    try {
      const res = await getHousingStayReport({
        fromDate: fromDate.trim() || undefined,
        toDate: toDate.trim() || undefined,
        housingId: selectedHousingId.trim() || undefined,
        page: targetPage,
        pageSize: targetPageSize,
      });
      setReportData(res);
      setPage(res.page || targetPage);
    } catch (err: any) {
      console.error("Stay report load failed:", err);
      const details = err?.details || {};
      const status = err?.status || (err?.details?.status as number) || 500;
      const errorCode = details?.errorCode || details?.title || details?.code;
      const detailMsg = details?.detail || err?.message || (isEn ? "Failed to load stay report" : "تعذر تحميل تقرير فترات السكن");

      setErrorDetails({
        status,
        errorCode,
        title: details?.title || (isEn ? "Report Error" : "خطأ في التقرير"),
        detail: detailMsg,
        errors: details?.errors,
        message: err?.message,
      });
      toast.error(
        isEn ? "Failed to load report" : "تعذر جلب التقرير",
        detailMsg
      );
    } finally {
      setLoading(false);
    }
  }

  // Initial load: automatically loads on mount with pageSize=5000 and empty dates
  useEffect(() => {
    void fetchReport(1, pageSize);
  }, []);

  // Filter items in memory
  const items = reportData?.items || [];
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Text search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.nameAr?.toLowerCase().includes(q) ||
        item.nameEn?.toLowerCase().includes(q) ||
        item.iqamaNo?.toLowerCase().includes(q) ||
        item.housingCode?.toLowerCase().includes(q) ||
        item.housingNameAr?.toLowerCase().includes(q) ||
        item.housingNameEn?.toLowerCase().includes(q) ||
        item.roomName?.toLowerCase().includes(q) ||
        item.floorName?.toLowerCase().includes(q) ||
        item.sourceReference?.toLowerCase().includes(q) ||
        item.moveInReason?.toLowerCase().includes(q) ||
        item.moveOutReason?.toLowerCase().includes(q);

      // Record Type filter
      const matchesType =
        recordTypeFilter === "ALL" || item.recordType === recordTypeFilter;

      // Occupancy filter
      const matchesOccupancy =
        occupancyFilter === "ALL" ||
        (occupancyFilter === "Inside" && item.isCurrentlyInside) ||
        (occupancyFilter === "MovedOut" && !item.isCurrentlyInside);

      return matchesSearch && matchesType && matchesOccupancy;
    });
  }, [items, searchQuery, recordTypeFilter, occupancyFilter]);

  // Handle Clear Dates Filter
  function handleClearDates() {
    setFromDate("");
    setToDate("");
  }

  // Handle Full Excel Export (supporting all pages)
  async function handleExportExcel() {
    if (!reportData || reportData.totalCount === 0) {
      toast.info(
        isEn ? "No Data" : "لا توجد بيانات",
        isEn ? "There are no records to export." : "لا توجد سجلات مطابقة للتصدير إلى Excel."
      );
      return;
    }

    setIsExporting(true);
    setExportProgressText(isEn ? "Preparing export data..." : "جاري تجهيز بيانات التصدير...");

    try {
      let exportItems: StayReportItem[] = [];

      // If we already have all items loaded on current page (e.g. pageSize=5000 >= totalCount)
      if (items.length >= reportData.totalCount) {
        exportItems = items;
      } else {
        // Fetch all remaining pages sequentially
        const targetPageSize = 5000;
        const totalPages = Math.ceil(reportData.totalCount / targetPageSize);
        exportItems = [...items];

        for (let p = 1; p <= totalPages; p++) {
          if (p === reportData.page && items.length > 0) continue;
          setExportProgressText(
            isEn
              ? `Fetching page ${p} of ${totalPages}...`
              : `جاري تحميل السجلات (صفحة ${p} من ${totalPages})...`
          );
          const pageRes = await getHousingStayReport({
            fromDate: fromDate.trim() || undefined,
            toDate: toDate.trim() || undefined,
            housingId: selectedHousingId.trim() || undefined,
            page: p,
            pageSize: targetPageSize,
          });
          if (pageRes.items && pageRes.items.length > 0) {
            exportItems.push(...pageRes.items);
          }
        }
      }

      setExportProgressText(isEn ? "Generating Excel file..." : "جاري إنشاء ملف Excel...");

      const getRecordTypeLabel = (type: string) => {
        switch (type) {
          case "Rider":
            return isEn ? "Rider" : "سائق / رايدر";
          case "Employee":
            return isEn ? "Employee" : "موظف";
          case "External":
            return isEn ? "External Occupant" : "ساكن خارجي (بدون سجل موظف)";
          case "PendingMatch":
            return isEn ? "Pending Match" : "بانتظار المطابقة";
          default:
            return type || "—";
        }
      };

      const columns: ExcelColumn<StayReportItem>[] = [
        {
          header: isEn ? "Person Type" : "نوع الساكن",
          accessor: (item) => getRecordTypeLabel(item.recordType),
          width: 18,
        },
        {
          header: isEn ? "Housing Code" : "كود السكن",
          accessor: (item) => item.housingCode || "—",
          width: 16,
          isText: true,
        },
        {
          header: isEn ? "Housing Name" : "اسم السكن",
          accessor: (item) => (isEn ? item.housingNameEn || item.housingNameAr : item.housingNameAr),
          width: 24,
        },
        {
          header: isEn ? "Floor" : "الدور",
          accessor: (item) => item.floorName || "—",
          width: 12,
        },
        {
          header: isEn ? "Room" : "الغرفة",
          accessor: (item) => item.roomName || "—",
          width: 14,
          isText: true,
        },
        {
          header: isEn ? "Arabic Name" : "الاسم بالعربية",
          accessor: (item) => item.nameAr || "—",
          width: 26,
        },
        {
          header: isEn ? "English Name" : "الاسم بالإنجليزية",
          accessor: (item) => item.nameEn || "—",
          width: 24,
        },
        {
          header: isEn ? "Iqama / ID Number" : "رقم الهوية / الإقامة",
          accessor: (item) => item.iqamaNo || "—",
          width: 18,
          isText: true,
        },
        {
          header: isEn ? "Move-In Date" : "تاريخ الدخول",
          accessor: (item) => {
            if (item.moveInDate) return item.moveInDate.split("T")[0];
            if (item.recordType === "External" || item.recordType === "PendingMatch") {
              return isEn ? "Entry date unavailable" : "تاريخ الدخول غير متوفر";
            }
            return "—";
          },
          width: 20,
        },
        {
          header: isEn ? "Move-Out Date" : "تاريخ الخروج",
          accessor: (item) => {
            if (item.moveOutDate) return item.moveOutDate.split("T")[0];
            return item.isCurrentlyInside
              ? isEn ? "Still inside" : "ما زال ساكناً"
              : isEn ? "Open" : "مفتوح";
          },
          width: 18,
        },
        {
          header: isEn ? "Current Status" : "الحالة الحالية",
          accessor: (item) =>
            item.isCurrentlyInside
              ? isEn ? "Currently Inside" : "ساكن حالياً"
              : isEn ? "Moved Out" : "غادر السكن",
          width: 16,
        },
        {
          header: isEn ? "Days in Selected Period" : "الأيام في الفترة المحددة",
          accessor: (item) => (item.daysInSelectedPeriod !== null && item.daysInSelectedPeriod !== undefined ? item.daysInSelectedPeriod : "—"),
          width: 22,
        },
        {
          header: isEn ? "Total Stay Days" : "إجمالي أيام الإقامة",
          accessor: (item) => (item.totalStayDays !== null && item.totalStayDays !== undefined ? item.totalStayDays : "—"),
          width: 18,
        },
        {
          header: isEn ? "Move-In Reason" : "سبب التسكين",
          accessor: (item) => item.moveInReason || "—",
          width: 20,
        },
        {
          header: isEn ? "Move-Out Reason" : "سبب الإخلاء",
          accessor: (item) => item.moveOutReason || "—",
          width: 20,
        },
        {
          header: isEn ? "Source Reference" : "المرجع المصدر",
          accessor: (item) => item.sourceReference || "—",
          width: 24,
        },
        {
          header: isEn ? "As-Of Cutoff Date" : "تاريخ الاحتساب المرجعي",
          accessor: () => reportData.asOfDate || "—",
          width: 18,
        },
      ];

      const fileName = `housing-stay-report-${reportData.asOfDate || new Date().toISOString().split("T")[0]}`;
      await exportToExcel({
        filename: fileName,
        sheetName: isEn ? "Stay Report" : "تقرير فترات السكن",
        data: exportItems,
        columns,
      });

      toast.success(
        isEn ? "Export Complete" : "تم التصدير بنجاح",
        isEn
          ? `Successfully exported ${exportItems.length} records to Excel.`
          : `تم تصدير ${exportItems.length} سجلاً بنجاح إلى ملف Excel.`
      );
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(
        isEn ? "Export Failed" : "فشل التصدير",
        err?.message || (isEn ? "Could not generate Excel file" : "تعذر إنشاء ملف Excel")
      );
    } finally {
      setIsExporting(false);
      setExportProgressText("");
    }
  }

  // Format Helper for Record Type Badges
  const renderRecordTypeBadge = (type: string, sourceRef?: string | null) => {
    switch (type) {
      case "Rider":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
            <UserCheck size={12} />
            <span>{isEn ? "Rider" : "سائق / رايدر"}</span>
          </span>
        );
      case "Employee":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
            <Users size={12} />
            <span>{isEn ? "Employee" : "موظف"}</span>
          </span>
        );
      case "External":
        return (
          <span
            title={isEn ? "Current occupant without employee record" : "ساكن حالي بالاسم فقط بدون سجل موظف"}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50"
          >
            <UserX size={12} />
            <span>{isEn ? "External" : "خارجي"}</span>
          </span>
        );
      case "PendingMatch":
        return (
          <span
            title={sourceRef ? `${isEn ? "Source:" : "المصدر:"} ${sourceRef}` : isEn ? "Imported occupant pending employee match" : "ساكن برقم إقامة بانتظار المطابقة مع سجل موظف"}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-black text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50"
          >
            <HelpCircle size={12} />
            <span>{isEn ? "Pending Match" : "بانتظار المطابقة"}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {type}
          </span>
        );
    }
  };

  const inputCls =
    "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium transition-all focus:border-[#1167c9] focus:ring-2 focus:ring-blue-100 outline-none";

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Problem Details Diagnostic Banner */}
      {errorDetails && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="mt-0.5 text-rose-600 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                    {errorDetails.title || (isEn ? "Error Loading Report" : "خطأ أثناء استعلام التقرير")}
                  </h3>
                  {errorDetails.errorCode && (
                    <span className="font-mono text-[11px] rounded bg-rose-200/70 dark:bg-rose-900/60 px-1.5 py-0.5 text-rose-950 dark:text-rose-200 font-bold">
                      {errorDetails.errorCode}
                    </span>
                  )}
                  {errorDetails.status && (
                    <span className="font-mono text-[11px] rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-slate-800 dark:text-slate-300">
                      HTTP {errorDetails.status}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-rose-800 dark:text-rose-300 leading-relaxed max-w-4xl">
                  {errorDetails.status === 403
                    ? isEn
                      ? "Access Denied (403). Your account requires 'operations.housing.read' permission. If your roles were modified recently, refresh your session below."
                      : "تم رفض الوصول (403). يتطلب هذا التقرير صلاحية 'operations.housing.read'. إذا تم تعديل صلاحياتك مؤخراً، اضغط على زر تحديث الجلسة أدناه."
                    : errorDetails.detail || errorDetails.message}
                </p>

                {/* Validation Sub-errors */}
                {errorDetails.errors && Object.keys(errorDetails.errors).length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs text-rose-700 dark:text-rose-400 space-y-0.5">
                    {Object.entries(errorDetails.errors).map(([key, msgs]) => (
                      <li key={key}>
                        <span className="font-semibold">{key}:</span> {Array.isArray(msgs) ? msgs.join(", ") : msgs}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {errorDetails.status === 403 && (
                <Button
                  variant="secondary"
                  loading={refreshingSession}
                  className="text-xs min-h-8 px-3"
                  onClick={async () => {
                    setRefreshingSession(true);
                    try {
                      await refreshSession();
                      await fetchReport(1);
                      toast.success(
                        isEn ? "Session Refreshed" : "تم تحديث الجلسة",
                        isEn ? "Permissions re-evaluated." : "تم تحديث بيانات الجلسة بنجاح."
                      );
                    } catch (e: any) {
                      toast.error(
                        isEn ? "Refresh Failed" : "فشل تحديث الجلسة",
                        e?.message || (isEn ? "Unable to refresh session" : "تعذر تحديث الجلسة")
                      );
                    } finally {
                      setRefreshingSession(false);
                    }
                  }}
                >
                  {isEn ? "Refresh Session & Retry" : "تحديث الجلسة وإعادة المحاولة"}
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-xs min-h-8 px-3 text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                onClick={() => void fetchReport(1)}
              >
                {isEn ? "Retry" : "إعادة المحاولة"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Control & Query Bar */}
      <Card className="p-4 bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#1167c9] dark:bg-blue-950/60 dark:text-blue-300">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--foreground)]">
                {isEn ? "Stay & Occupancy Period Report" : "تقرير فترات التسكين والإقامة"}
              </h2>
              <p className="text-[11px] text-[var(--muted)] font-medium">
                {isEn
                  ? "Track linked residence periods, actual stay counts, and current occupants without date bounds by default."
                  : "تتبع فترات التسكين، أيام الإقامة المحتسبة، والسكان الحاليين؛ بدون قيود تواريخ افتراضياً."}
              </p>
            </div>
          </div>

          {/* Export to Excel Button */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportExcel}
              disabled={loading || isExporting || items.length === 0}
              loading={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs font-bold gap-1.5 h-10 px-4"
            >
              <FileSpreadsheet size={16} />
              <span>{isExporting ? exportProgressText || (isEn ? "Exporting..." : "جاري التصدير...") : (isEn ? "Export to Excel" : "تصدير إلى Excel")}</span>
            </Button>
          </div>
        </div>

        {/* Server Query Filters Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void fetchReport(1);
          }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end"
        >
          {/* From Date */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "From Date (Optional)" : "مِن تاريخ (اختياري)"}</span>
              {fromDate && (
                <button
                  type="button"
                  onClick={() => setFromDate("")}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  {isEn ? "Clear" : "مسح"}
                </button>
              )}
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={inputCls}
              placeholder="YYYY-MM-DD"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "To Date (Optional)" : "إلى تاريخ (اختياري)"}</span>
              {toDate && (
                <button
                  type="button"
                  onClick={() => setToDate("")}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  {isEn ? "Clear" : "مسح"}
                </button>
              )}
            </div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={inputCls}
              placeholder="YYYY-MM-DD"
            />
          </div>

          {/* Housing Selector */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[var(--muted)]">
              {isEn ? "Housing Facility" : "وحدة السكن"}
            </label>
            <SearchableSelect
              value={selectedHousingId}
              onChange={(val) => setSelectedHousingId(val)}
              options={housingOptions}
              placeholder={isEn ? "All Housing Facilities" : "جميع وحدات السكن"}
              searchPlaceholder={isEn ? "Search housing..." : "بحث عن وحدة سكن..."}
            />
          </div>

          {/* Action Buttons: Fetch & Reset */}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              loading={loading}
              className="flex-1 h-10 text-xs font-bold shadow-xs bg-[#1167c9] hover:bg-blue-700 text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>{isEn ? "Apply Filter" : "استعلام التقرير"}</span>
            </Button>

            {(fromDate || toDate || selectedHousingId) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setSelectedHousingId("");
                  // Trigger reload with cleared filters
                  setTimeout(() => {
                    void fetchReport(1);
                  }, 0);
                }}
                title={isEn ? "Reset all filters" : "إعادة تعيين كافة الفلاتر"}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>
      </Card>

      {/* Main Table Card with In-Memory Search & Status Pills */}
      <Card className="overflow-hidden border border-[var(--border)] shadow-xs">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--subtle-bg)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search
                className={`absolute top-3 text-[var(--muted)] ${isEn ? "left-3" : "right-3"}`}
                size={18}
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? "Search by occupant name, iqama, room, housing code..." : "ابحث باسم الساكن، رقم الإقامة، الغرفة، كود السكن..."}
                className={`h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-medium ${
                  isEn ? "pl-9 pr-3" : "pr-9 pl-3"
                } focus:border-[#1167c9] outline-none`}
              />
            </div>

            {/* Person Type Filter */}
            <div className="flex items-center gap-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1 text-xs">
              {[
                { id: "ALL", label: isEn ? "All Types" : "كافة الأنواع" },
                { id: "Rider", label: isEn ? "Riders" : "السائقون" },
                { id: "Employee", label: isEn ? "Employees" : "الموظفون" },
                { id: "External", label: isEn ? "External" : "خارجي" },
                { id: "PendingMatch", label: isEn ? "Pending" : "معلق" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setRecordTypeFilter(pill.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    recordTypeFilter === pill.id
                      ? "bg-[#1167c9] text-white shadow-xs"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Occupancy Status Pills */}
            <div className="flex items-center gap-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-1 text-xs">
              {[
                { id: "ALL", label: isEn ? "All" : "الكل" },
                { id: "Inside", label: isEn ? "Currently Inside" : "ساكن حالياً" },
                { id: "MovedOut", label: isEn ? "Moved Out" : "غادر" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setOccupancyFilter(pill.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    occupancyFilter === pill.id
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-800/40 text-[var(--muted)] font-black">
              <tr>
                <th className="py-3 px-3.5 text-start">{isEn ? "Housing" : "السكن"}</th>
                <th className="py-3 px-3 text-start">{isEn ? "Floor & Room" : "الدور والغرفة"}</th>
                <th className="py-3 px-3 text-start">{isEn ? "Person Type" : "نوع الساكن"}</th>
                <th className="py-3 px-3 text-start">{isEn ? "Occupant Name" : "اسم الساكن"}</th>
                <th className="py-3 px-3 text-start">{isEn ? "Iqama / ID" : "رقم الإقامة"}</th>
                <th className="py-3 px-3 text-start">{isEn ? "Move-In Date" : "تاريخ الدخول"}</th>
                <th className="py-3 px-3 text-start">{isEn ? "Move-Out Date" : "تاريخ الخروج"}</th>
                <th className="py-3 px-3 text-center">{isEn ? "Days in Period" : "أيام الفترة"}</th>
                <th className="py-3 px-3 text-center">{isEn ? "Total Stay" : "إجمالي الأيام"}</th>
                <th className="py-3 px-3.5 text-start">{isEn ? "Reference / Notes" : "المرجع والملاحظات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-[var(--muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-[#1167c9]" />
                      <p className="font-bold">{isEn ? "Loading stay report..." : "جاري تحميل بيانات تقرير فترات السكن..."}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-[var(--muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building size={36} className="opacity-30" />
                      <p className="font-black text-sm">
                        {isEn ? "No stay records found" : "لا توجد سجلات تسكين مطابقة"}
                      </p>
                      <p className="text-xs">
                        {isEn
                          ? "Try clearing filters or selecting another date range."
                          : "جرب تغيير كلمات البحث أو مسح تصفية التاريخ."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isExternalOrPending =
                    item.recordType === "External" || item.recordType === "PendingMatch";

                  return (
                    <tr
                      key={`${item.recordId}-${item.roomId}-${index}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Housing Facility */}
                      <td className="py-3 px-3.5">
                        <Link
                          href={`/admin/housing/${item.housingId}`}
                          className="font-bold text-[#1167c9] hover:underline flex items-center gap-1 group"
                        >
                          <Building size={14} className="shrink-0 text-slate-400 group-hover:text-[#1167c9]" />
                          <span className="truncate max-w-[150px]">
                            {isEn ? item.housingNameEn || item.housingNameAr : item.housingNameAr}
                          </span>
                        </Link>
                        <span className="font-mono text-[11px] text-[var(--muted)] font-semibold block mt-0.5">
                          {item.housingCode}
                        </span>
                      </td>

                      {/* Floor & Room */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-bold">
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                            {isEn ? "Room" : "غرفة"} {item.roomName}
                          </span>
                        </div>
                        {item.floorName ? (
                          <span className="text-[11px] text-[var(--muted)] block mt-0.5">
                            {isEn ? "Floor" : "الدور"} {item.floorName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--muted)] opacity-60 block mt-0.5">—</span>
                        )}
                      </td>

                      {/* Person Type */}
                      <td className="py-3 px-3">
                        {renderRecordTypeBadge(item.recordType, item.sourceReference)}
                      </td>

                      {/* Occupant Name */}
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900 dark:text-slate-100">
                          {item.nameAr}
                        </div>
                        {item.nameEn && (
                          <div className="text-[11px] text-[var(--muted)] font-semibold mt-0.5">
                            {item.nameEn}
                          </div>
                        )}
                      </td>

                      {/* Iqama / ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.iqamaNo ? (
                          <span>{item.iqamaNo}</span>
                        ) : (
                          <span className="text-[var(--muted)] font-normal text-[11px]">—</span>
                        )}
                      </td>

                      {/* Move-In Date */}
                      <td className="py-3 px-3">
                        {item.moveInDate ? (
                          <span className="font-mono font-semibold">
                            {item.moveInDate.split("T")[0]}
                          </span>
                        ) : isExternalOrPending ? (
                          <span
                            title={isEn ? "Dates are not tracked for external occupants" : "التواريخ غير مسجلة للسكان الخارجيين أو بانتظار المطابقة"}
                            className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          >
                            {isEn ? "Entry date unavailable" : "تاريخ الدخول غير متوفر"}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Move-Out Date or Still Inside */}
                      <td className="py-3 px-3">
                        {item.moveOutDate ? (
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.moveOutDate.split("T")[0]}
                          </span>
                        ) : item.isCurrentlyInside ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {isEn ? "Still inside" : "ما زال ساكناً"}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted)] font-semibold">
                            {isEn ? "Open" : "مفتوح"}
                          </span>
                        )}
                      </td>

                      {/* Days in Selected Period */}
                      <td className="py-3 px-3 text-center">
                        {item.daysInSelectedPeriod !== null && item.daysInSelectedPeriod !== undefined ? (
                          <span className="inline-block min-w-8 rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-black text-[#1167c9] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50">
                            {item.daysInSelectedPeriod} {isEn ? "d" : "يوم"}
                          </span>
                        ) : (
                          <span
                            title={isEn ? "Unknown / Not applicable" : "غير محدد لعدم توفر تواريخ"}
                            className="text-[var(--muted)] font-medium text-[11px]"
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Total Stay Days */}
                      <td className="py-3 px-3 text-center">
                        {item.totalStayDays !== null && item.totalStayDays !== undefined ? (
                          <span className="inline-block min-w-8 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {item.totalStayDays} {isEn ? "d" : "يوم"}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)] font-medium text-[11px]">—</span>
                        )}
                      </td>

                      {/* Reference / Reason Notes */}
                      <td className="py-3 px-3.5">
                        <div className="max-w-[220px] truncate space-y-0.5">
                          {item.sourceReference && (
                            <div className="text-[11px] font-mono text-[var(--muted)] truncate">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {isEn ? "Src:" : "المرجع:"}
                              </span>{" "}
                              {item.sourceReference}
                            </div>
                          )}
                          {item.moveInReason && (
                            <div className="text-[11px] text-[var(--muted)] truncate" title={item.moveInReason}>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {isEn ? "In:" : "دخول:"}
                              </span>{" "}
                              {item.moveInReason}
                            </div>
                          )}
                          {item.moveOutReason && (
                            <div className="text-[11px] text-rose-600 truncate" title={item.moveOutReason}>
                              <span className="font-semibold">{isEn ? "Out:" : "إخلاء:"}</span>{" "}
                              {item.moveOutReason}
                            </div>
                          )}
                          {!item.sourceReference && !item.moveInReason && !item.moveOutReason && (
                            <span className="text-[var(--muted)] text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Rows count footer */}
        {reportData && reportData.totalCount > 0 && (
          <div className="p-3.5 border-t border-[var(--border)] bg-[var(--subtle-bg)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--muted)] font-bold">
              <span>
                {isEn
                  ? `Showing ${filteredItems.length} of ${reportData.totalCount} records`
                  : `عرض ${filteredItems.length} من أصل ${reportData.totalCount} سجلاً`}
              </span>
              {reportData.totalCount > pageSize && (
                <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] text-amber-800 dark:text-amber-300 font-extrabold">
                  {isEn ? "Multi-page dataset" : "سجلات موزعة على صفحات"}
                </span>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-3">
              {/* Page Size Select */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
                <span>{isEn ? "Page Size:" : "عدد السجلات:"}</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    void fetchReport(1, newSize);
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-bold outline-none"
                >
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                  <option value={5000}>5000 ({isEn ? "Default" : "الافتراضي"})</option>
                </select>
              </div>

              {/* Page Navigator */}
              {reportData.totalCount > pageSize && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => void fetchReport(Math.max(1, page - 1))}
                    disabled={page <= 1 || loading}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40"
                    title={isEn ? "Previous Page" : "الصفحة السابقة"}
                  >
                    {isEn ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <span className="font-mono font-bold text-xs px-1">
                    {page} / {Math.ceil(reportData.totalCount / pageSize)}
                  </span>

                  <button
                    onClick={() => void fetchReport(page + 1)}
                    disabled={page * pageSize >= reportData.totalCount || loading}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40"
                    title={isEn ? "Next Page" : "الصفحة التالية"}
                  >
                    {isEn ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
