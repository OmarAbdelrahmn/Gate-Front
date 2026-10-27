// src/components/ninja/evaluation/NinjaPerformanceImportModal.tsx
"use client";

import { localizeDigits } from "./localizeDigits";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { toast } from "@/components/ui/Toast";
import {
  ninjaEvaluationClient,
  downloadNinjaImportTemplate,
  formatNullableMetric,
  formatHoursAsDuration,
  formatRiyadhDateTime,
  getPreviewRowStatusMeta,
  isAfterRiyadhToday,
  type NinjaPerformanceImportOptions,
  type NinjaPerformancePreviewResponse,
  type NinjaPerformancePreviewRow,
  type NinjaPerformanceConfirmation,
} from "@/lib/ninja/api";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRightLeft,
  Clock,
  ShieldCheck,
  Info,
  ExternalLink,
} from "lucide-react";

interface NinjaPerformanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReportDate: string;
  canImport: boolean;
  onImportConfirmed?: (receipt: NinjaPerformanceConfirmation) => void;
  onOpenSharedDayUsage?: (
    accountId: string,
    captainId: string | null,
    date: string
  ) => void;
  locale: "ar" | "en";
}

type PreviewStatusFilter =
  | "ALL"
  | "BLOCKING"
  | "New"
  | "Identical"
  | "Conflict"
  | "UnknownAccount"
  | "UnresolvedAllocation"
  | "Invalid";

export function NinjaPerformanceImportModal({
  isOpen,
  onClose,
  defaultReportDate,
  canImport,
  onImportConfirmed,
  onOpenSharedDayUsage,
  locale,
}: NinjaPerformanceImportModalProps) {
  const isEn = locale === "en";

  // Step 1: File & Interpretation options
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"Daily" | "MultiDay">("Daily");
  const [reportDate, setReportDate] = useState<string>(defaultReportDate);
  const [hoursUnit, setHoursUnit] = useState<
    "DecimalHours" | "Duration" | "ExcelDays"
  >("DecimalHours");
  const [dateFormat, setDateFormat] = useState<
    "yyyy-MM-dd" | "dd/MM/yyyy" | "MM/dd/yyyy"
  >("yyyy-MM-dd");
  const [encoding, setEncoding] = useState<"utf-8" | "windows-1256">("utf-8");
  const [delimiter, setDelimiter] = useState<"," | ";" | "\t">(",");

  // Step 2: Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] =
    useState<NinjaPerformancePreviewResponse | null>(null);
  const [previewOptionsSnapshot, setPreviewOptionsSnapshot] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<PreviewStatusFilter>("ALL");
  const [searchRow, setSearchRow] = useState("");

  // Step 3: Confirmation state
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<{
    message: string;
    code?: string;
    status?: number;
    needsRepreview?: boolean;
  } | null>(null);
  const [confirmationReceipt, setConfirmationReceipt] =
    useState<NinjaPerformanceConfirmation | null>(null);

  // Template downloading
  const [downloadingTemplate, setDownloadingTemplate] = useState<
    "Daily" | "MultiDay" | null
  >(null);

  const isCsvFile = useMemo(
    () => Boolean(selectedFile?.name.toLowerCase().endsWith(".csv")),
    [selectedFile]
  );

  const currentOptions = useMemo<NinjaPerformanceImportOptions>(() => {
    const opts: NinjaPerformanceImportOptions = {
      mode,
      hoursUnit,
      dateFormat,
    };
    if (mode === "Daily" && reportDate) {
      opts.reportDate = reportDate;
    }
    if (isCsvFile) {
      opts.encoding = encoding;
      opts.delimiter = delimiter;
    }
    return opts;
  }, [mode, reportDate, hoursUnit, dateFormat, isCsvFile, encoding, delimiter]);

  const currentSignature = useMemo(() => {
    if (!selectedFile) return "";
    return `${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}:${JSON.stringify(
      currentOptions
    )}`;
  }, [selectedFile, currentOptions]);

  // If the user changes the file or options after running preview, the preview is invalidated
  const isPreviewMatchingCurrentInput =
    Boolean(previewData) && previewOptionsSnapshot === currentSignature;

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setPreviewError(null);
    setConfirmError(null);
    setConfirmationReceipt(null);
    setPreviewOptionsSnapshot("");
    setStatusFilter("ALL");
    setSearchRow("");
  };

  const handleDownloadTemplate = async (tplMode: "Daily" | "MultiDay") => {
    if (!canImport) return;
    setDownloadingTemplate(tplMode);
    try {
      const { blob, fileName } = await downloadNinjaImportTemplate(tplMode);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(
        isEn ? "Template Download Failed" : "تعذر تنزيل القالب",
        e.message || (isEn ? "Could not download template." : "حدث خطأ أثناء التنزيل.")
      );
    } finally {
      setDownloadingTemplate(null);
    }
  };

  const handleRunPreview = async () => {
    if (!canImport) return;
    if (!selectedFile) {
      setPreviewError(
        isEn
          ? "Please select a CSV or XLSX file first."
          : "يرجى اختيار ملف CSV أو XLSX أولاً."
      );
      return;
    }
    // Validate 10 MiB limit
    if (selectedFile.size > 10 * 1024 * 1024) {
      setPreviewError(
        isEn
          ? "File exceeds the 10 MiB maximum size limit."
          : "حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت)."
      );
      return;
    }
    if (mode === "Daily") {
      if (!reportDate) {
        setPreviewError(
          isEn
            ? "Report date is required for Daily import files."
            : "تاريخ التقرير (reportDate) مطلوب لملفات الاستيراد اليومية."
        );
        return;
      }
      if (isAfterRiyadhToday(reportDate)) {
        setPreviewError(
          isEn
            ? "Report date cannot be in the future (Riyadh business date)."
            : "لا يمكن أن يكون تاريخ التقرير في المستقبل حسب توقيت الرياض."
        );
        return;
      }
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setConfirmError(null);
    setConfirmationReceipt(null);
    try {
      const res = await ninjaEvaluationClient.preview(selectedFile, currentOptions);
      setPreviewData(res);
      setPreviewOptionsSnapshot(currentSignature);
      if (!res.canConfirm) {
        setStatusFilter("BLOCKING");
      } else {
        setStatusFilter("ALL");
      }
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      setPreviewData(null);
      setPreviewError(
        e.message ||
          (isEn
            ? "Failed to preview performance import file."
            : "تعذر إجراء معاينة لملف استيراد الأداء.")
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (
      !canImport ||
      !selectedFile ||
      !previewData ||
      !previewData.canConfirm ||
      !isPreviewMatchingCurrentInput
    ) {
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const receipt = await ninjaEvaluationClient.confirm(
        previewData.previewId,
        selectedFile
      );
      setConfirmationReceipt(receipt);
      toast.success(
        isEn ? "Performance Import Confirmed" : "تم تأكيد واعتماد استيراد الأداء",
        isEn
          ? `Imported ${receipt.importedRows} row(s), skipped ${receipt.skippedRows} identical row(s).`
          : `تم استيراد ${receipt.importedRows} سجل وتخطي ${receipt.skippedRows} سجل مطابق.`
      );
      onImportConfirmed?.(receipt);
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        status?: number;
        code?: string;
        details?: { errorCode?: string; code?: string };
      };
      const code = e.code || e.details?.errorCode || e.details?.code;
      const needsRepreview =
        e.status === 409 ||
        code === "ninja.preview_stale" ||
        code === "ninja.preview_expired";
      setConfirmError({
        message:
          e.message ||
          (isEn
            ? "Confirmation failed. No performance records were committed."
            : "فشل تأكيد الاستيراد؛ لم يتم حفظ أي سجلات أداء (عملية ذرية بالكامل)."),
        code,
        status: e.status,
        needsRepreview,
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  // Counts by row status
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: 0,
      BLOCKING: 0,
      New: 0,
      Identical: 0,
      Conflict: 0,
      UnknownAccount: 0,
      UnresolvedAllocation: 0,
      Invalid: 0,
    };
    if (!previewData?.rows) return counts;
    for (const r of previewData.rows) {
      counts.ALL++;
      counts[r.status] = (counts[r.status] || 0) + 1;
      if (r.status !== "New" && r.status !== "Identical") {
        counts.BLOCKING++;
      }
    }
    return counts;
  }, [previewData]);

  const filteredRows = useMemo<NinjaPerformancePreviewRow[]>(() => {
    if (!previewData?.rows) return [];
    const q = searchRow.trim().toLowerCase();
    return previewData.rows.filter((r) => {
      if (statusFilter === "BLOCKING") {
        if (r.status === "New" || r.status === "Identical") return false;
      } else if (statusFilter !== "ALL") {
        if (r.status !== statusFilter) return false;
      }
      if (q) {
        const matchCaptain = r.captainId?.toLowerCase().includes(q);
        const matchDate = r.date?.toLowerCase().includes(q);
        const matchIssues = r.issues?.some((iss) =>
          iss.toLowerCase().includes(q)
        );
        return matchCaptain || matchDate || matchIssues;
      }
      return true;
    });
  }, [previewData, statusFilter, searchRow]);

  if (!canImport) {
    return null;
  }

  const mapTone = (variant: "emerald" | "blue" | "amber" | "rose" | "slate") => {
    switch (variant) {
      case "emerald":
        return "green" as const;
      case "amber":
        return "orange" as const;
      case "rose":
        return "red" as const;
      case "blue":
        return "blue" as const;
      default:
        return "gray" as const;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEn
          ? "Staged Performance Import (Preview & Atomic Confirm)"
          : "استيراد أداء نينجا بمرحلتين (معاينة وفحص ثم تأكيد ذري)"
      }
      maxWidth="max-w-5xl"
    >
      <div className="space-y-5" dir={isEn ? "ltr" : "rtl"}>
        {/* Top Instructions & Template Download Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="font-bold text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>
                {isEn
                  ? "Two-Stage Validated Workflow: 1. Preview -> 2. Resolve Issues -> 3. Confirm Same File"
                  : "مسار استيراد موثّق من مرحلتين: 1. معاينة الملف -> 2. معالجة أي تعارضات -> 3. تأكيد نفس الملف"}
              </span>
            </div>
            <p className="text-blue-900/90 dark:text-blue-200/90">
              {isEn
                ? "Required columns: Captain ID, Total Orders, Total Working Hours (plus Date for MultiDay). Do not substitute Avg Working Hours. Preview expires after 30 minutes and checks assignment/responsibility revisions."
                : "الأعمدة المطلوبة: Captain ID و Total Orders و Total Working Hours (بالإضافة إلى Date للملف متعدد الأيام). لا تستبدل Total Working Hours بعمود Avg Working Hours. تنتهي صلاحية المعاينة بعد 30 دقيقة."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              loading={downloadingTemplate === "Daily"}
              onClick={() => handleDownloadTemplate("Daily")}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isEn ? "Daily Template" : "قالب يوم واحد (Daily)"}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={downloadingTemplate === "MultiDay"}
              onClick={() => handleDownloadTemplate("MultiDay")}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isEn ? "Multi-Day Template" : "قالب متعدد الأيام (MultiDay)"}</span>
            </Button>
          </div>
        </div>

        {/* Step 1: File & Parsing Options */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>
                {isEn
                  ? "Step 1: Choose File & Interpretation Options"
                  : "الخطوة 1: اختيار الملف وخيارات تفسير التواريخ والساعات"}
              </span>
            </h3>
            {selectedFile && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                {isEn ? "Clear / Reset" : "إعادة ضبط واختيار ملف جديد"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* File Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                {isEn ? "CSV / XLSX File (Max 10 MiB)" : "ملف الأداء CSV / XLSX (بحد أقصى 10 MiB)"}
              </label>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                  setPreviewError(null);
                  setConfirmError(null);
                  setConfirmationReceipt(null);
                }}
                className="block w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs file:me-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-blue-700"
              />
              {selectedFile && (
                <div className="text-[11px] text-[var(--muted)]">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* Mode */}
            <div className="space-y-1.5">
              <label
                htmlFor="import-mode-select"
                className="block text-xs font-bold text-[var(--foreground)]"
              >
                {isEn ? "Import Mode (mode)" : "نمط الملف (mode)"}
              </label>
              <select
                id="import-mode-select"
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "Daily" | "MultiDay")
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)]"
              >
                <option value="Daily">
                  {isEn
                    ? "Daily — Single business date (requires reportDate)"
                    : "Daily — ملف ليوم عمل واحد (يتطلب تاريخ التقرير)"}
                </option>
                <option value="MultiDay">
                  {isEn
                    ? "MultiDay — Contains Date column per row"
                    : "MultiDay — ملف متعدد الأيام (يحتوي على عمود Date)"}
                </option>
              </select>
            </div>

            {/* Report Date (Only for Daily) */}
            {mode === "Daily" ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--foreground)]">
                  {isEn
                    ? "Report Business Date (reportDate)"
                    : "تاريخ التقرير ليوم العمل (reportDate)"}
                </label>
                <DateInput
                locale={locale}
                  value={reportDate}
                  max={defaultReportDate}
                  onChange={(val) => setReportDate(val)}
                />
                <span className="block text-[10px] text-[var(--muted)]">
                  {isEn
                    ? "Never inferred from filename or download time."
                    : "لا يتم استنتاجه من اسم الملف أو وقت التنزيل."}
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label
                  htmlFor="import-date-format-select"
                  className="block text-xs font-bold text-[var(--foreground)]"
                >
                  {isEn
                    ? "Text Date Format (dateFormat)"
                    : "صيغة التواريخ النصية (dateFormat)"}
                </label>
                <select
                  id="import-date-format-select"
                  value={dateFormat}
                  onChange={(e) =>
                    setDateFormat(
                      e.target.value as
                        | "yyyy-MM-dd"
                        | "dd/MM/yyyy"
                        | "MM/dd/yyyy"
                    )
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)]"
                >
                  <option value="yyyy-MM-dd">yyyy-MM-dd (ISO - Default)</option>
                  <option value="dd/MM/yyyy">dd/MM/yyyy (Day/Month/Year)</option>
                  <option value="MM/dd/yyyy">
                    MM/dd/yyyy (US Format — e.g. October workbook)
                  </option>
                </select>
              </div>
            )}

            {/* Hours Unit */}
            <div className="space-y-1.5">
              <label
                htmlFor="import-hours-unit-select"
                className="block text-xs font-bold text-[var(--foreground)]"
              >
                {isEn
                  ? "Working Hours Interpretation (hoursUnit)"
                  : "وحدة تفسير ساعات العمل (hoursUnit)"}
              </label>
              <select
                id="import-hours-unit-select"
                value={hoursUnit}
                onChange={(e) =>
                  setHoursUnit(
                    e.target.value as
                      | "DecimalHours"
                      | "Duration"
                      | "ExcelDays"
                  )
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)]"
              >
                <option value="DecimalHours">
                  {isEn
                    ? "DecimalHours — e.g. 8.5 means 8h 30m (Default)"
                    : "DecimalHours — ساعات عشرية (مثال: 8.5 تعني 8 ساعات ونصف)"}
                </option>
                <option value="Duration">
                  {isEn
                    ? "Duration — HH:mm:ss e.g. 08:30:00 -> 8.5h"
                    : "Duration — مدة زمنية HH:mm:ss (مثال: 08:30:00 تتحول إلى 8.5)"}
                </option>
                <option value="ExcelDays">
                  {isEn
                    ? "ExcelDays — Fraction of 24-hour day"
                    : "ExcelDays — كسر من يوم عمل (24 ساعة)"}
                </option>
              </select>
            </div>

            {/* Date Format when Daily is selected (still configurable if needed) */}
            {mode === "Daily" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="import-date-format-daily-select"
                  className="block text-xs font-bold text-[var(--foreground)]"
                >
                  {isEn ? "Date Format (dateFormat)" : "صيغة التاريخ (dateFormat)"}
                </label>
                <select
                  id="import-date-format-daily-select"
                  value={dateFormat}
                  onChange={(e) =>
                    setDateFormat(
                      e.target.value as
                        | "yyyy-MM-dd"
                        | "dd/MM/yyyy"
                        | "MM/dd/yyyy"
                    )
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)]"
                >
                  <option value="yyyy-MM-dd">yyyy-MM-dd (Default)</option>
                  <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                  <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                </select>
              </div>
            )}

            {/* CSV-specific options */}
            {isCsvFile && (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="import-encoding-select"
                    className="block text-xs font-bold text-[var(--foreground)]"
                  >
                    {isEn ? "CSV Encoding (encoding)" : "ترميز ملف CSV (encoding)"}
                  </label>
                  <select
                    id="import-encoding-select"
                    value={encoding}
                    onChange={(e) =>
                      setEncoding(e.target.value as "utf-8" | "windows-1256")
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)]"
                  >
                    <option value="utf-8">UTF-8 (Default)</option>
                    <option value="windows-1256">Windows-1256 (Arabic)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="import-delimiter-select"
                    className="block text-xs font-bold text-[var(--foreground)]"
                  >
                    {isEn ? "CSV Delimiter (delimiter)" : "فاصل أعمدة CSV (delimiter)"}
                  </label>
                  <select
                    id="import-delimiter-select"
                    value={delimiter}
                    onChange={(e) =>
                      setDelimiter(e.target.value as "," | ";" | "\t")
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)]"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value={"\t"}>Tab (\t)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Preview Trigger Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
            <div className="text-xs text-[var(--muted)]">
              {previewData && !isPreviewMatchingCurrentInput && (
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {isEn
                    ? "File or options changed since last preview. Please run Preview again before confirming."
                    : "تم تغيير الملف أو خيارات التفسير بعد المعاينة السابقة؛ يرجى إعادة تشغيل المعاينة قبل التأكيد."}
                </span>
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleRunPreview}
              loading={previewLoading}
              disabled={!selectedFile}
            >
              <Upload className="h-4 w-4" />
              <span>
                {previewData
                  ? isEn
                    ? "Re-run Preview (Validate Current State)"
                    : "إعادة فحص ومعاينة الملف"
                  : isEn
                  ? "Step 2: Submit Preview"
                  : "الخطوة 2: رفع للمعاينة والفحص المبدئي"}
              </span>
            </Button>
          </div>
        </div>

        {/* Preview Error Alert */}
        {previewError && (
          <div
            className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-sm">
                  {isEn
                    ? "Preview Failed — Nothing Has Been Imported"
                    : "فشلت المعاينة — لم يتم استيراد أي بيانات"}
                </div>
                <p>{previewError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview Inspection & Resolution */}
        {previewData && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-4">
            {/* Preview Metadata Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    {isEn
                      ? "Step 2: Preview Results & Validation"
                      : "الخطوة 2: نتائج المعاينة والتحقق من التكليفات التاريخية"}
                  </h3>
                  {previewData.canConfirm ? (
                    <Badge tone="green">
                      {isEn
                        ? "Ready to Confirm (canConfirm = true)"
                        : "جاهز للتأكيد (canConfirm = true)"}
                    </Badge>
                  ) : (
                    <Badge tone="red">
                      {isEn
                        ? "Cannot Confirm — Blocking Issues Found (canConfirm = false)"
                        : "لا يمكن التأكيد — توجد مشاكل مانعة (canConfirm = false)"}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
                  <span>
                    <strong>Preview ID:</strong>{" "}
                    <code className="font-mono">{previewData.previewId}</code>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-600" />
                    <strong>{isEn ? "Expires:" : "تنتهي الصلاحية:"}</strong>{" "}
                    {formatRiyadhDateTime(previewData.expiresAtUtc, locale)}
                  </span>
                  <span>
                    <strong>SHA-256:</strong>{" "}
                    <code className="font-mono">
                      {previewData.contentHash.slice(0, 16)}…
                    </code>
                  </span>
                  <span>
                    <strong>Input Revision:</strong>{" "}
                    <code className="font-mono">
                      {previewData.inputRevision.slice(0, 12)}
                    </code>
                  </span>
                </div>
              </div>
            </div>

            {/* Banner if canConfirm === false */}
            {!previewData.canConfirm && (
              <div
                className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-xs text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div className="space-y-1.5">
                    <div className="font-bold text-sm">
                      {isEn
                        ? "This preview CANNOT be confirmed yet — No rows have been imported!"
                        : "هذه المعاينة غير قابلة للاعتماد حالياً — لم يتم حفظ أو استيراد أي سجل!"}
                    </div>
                    <p>
                      {isEn
                        ? "Any invalid row, conflict, unknown account, or unresolved shared-day allocation blocks the entire batch (no silent partial acceptance). Resolve missing assignments or shared-day declarations below, then click 'Re-run Preview'."
                        : "وجود أي صف غير صالح أو تعارض أو حساب غير معروف أو يوم مشترك غير محسوم يمنع قبول الدفعة بالكامل (لا يوجد قبول جزئي صامت). يمكنك معالجة حصص اليوم المشترك أو التعيينات من الأزرار أدناه ثم الضغط على «إعادة فحص ومعاينة الملف»."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    {
                      key: "ALL",
                      label: isEn ? "All Rows" : "الكل",
                      count: statusCounts.ALL,
                    },
                    {
                      key: "BLOCKING",
                      label: isEn ? "Blocking Issues" : "المشاكل المانعة",
                      count: statusCounts.BLOCKING,
                    },
                    {
                      key: "New",
                      label: isEn ? "New" : "جديد (New)",
                      count: statusCounts.New,
                    },
                    {
                      key: "Identical",
                      label: isEn ? "Identical" : "مطابق (Identical)",
                      count: statusCounts.Identical,
                    },
                    {
                      key: "Conflict",
                      label: isEn ? "Conflict" : "تعارض (Conflict)",
                      count: statusCounts.Conflict,
                    },
                    {
                      key: "UnknownAccount",
                      label: isEn ? "Unknown Account" : "حساب غير معروف",
                      count: statusCounts.UnknownAccount,
                    },
                    {
                      key: "UnresolvedAllocation",
                      label: isEn
                        ? "Unresolved Allocation"
                        : "تعيين/توزيع غير محسوم",
                      count: statusCounts.UnresolvedAllocation,
                    },
                    {
                      key: "Invalid",
                      label: isEn ? "Invalid" : "غير صالح (Invalid)",
                      count: statusCounts.Invalid,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      statusFilter === tab.key
                        ? "bg-blue-600 text-white"
                        : "border border-[var(--border)] bg-slate-50 text-[var(--foreground)] hover:bg-slate-100 dark:bg-slate-900"
                    }`}
                  >
                    {tab.label} ({localizeDigits(tab.count, locale)})
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-60">
                <Input
                  placeholder={
                    isEn
                      ? "Filter by Captain ID, Date, Issue..."
                      : "بحث بمعرف الكابتن أو التاريخ أو المشكلة..."
                  }
                  value={searchRow}
                  onChange={(e) => setSearchRow(e.target.value)}
                />
              </div>
            </div>

            {/* Preview Rows Table */}
            <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 text-[var(--muted)] dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Row #" : "رقم الصف"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Captain ID" : "معرف الكابتن"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Business Date" : "التاريخ"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Orders" : "الطلبات"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Hours" : "الساعات"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Status" : "الحالة"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Issues & Resolution" : "الملاحظات ومعالجة التعارض"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-[var(--muted)]"
                      >
                        {isEn
                          ? "No preview rows match the current filter."
                          : "لا توجد صفوف تطابق الفلتر المحدد."}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.slice(0, 300).map((row) => {
                      const meta = getPreviewRowStatusMeta(row.status, locale);
                      return (
                        <tr
                          key={`${localizeDigits(row.rowNumber, locale)}-${row.captainId}-${row.date}`}
                          className={
                            meta.isBlocking
                              ? "bg-rose-50/40 dark:bg-rose-950/20"
                              : ""
                          }
                        >
                          <td className="px-3 py-2 font-mono font-bold">
                            #{localizeDigits(row.rowNumber, locale)}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-[var(--foreground)]">
                            {localizeDigits(row.captainId || "—", locale)}
                          </td>
                          <td className="px-3 py-2 font-mono">{localizeDigits(row.date || "—", locale)}</td>
                          <td className="px-3 py-2 font-bold">
                            {formatNullableMetric(row.orders, locale, 0)}
                          </td>
                          <td className="px-3 py-2 font-bold">
                            {formatHoursAsDuration(row.hours)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={mapTone(meta.variant)}>
                              {meta.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="space-y-1.5">
                              {row.issues && row.issues.length > 0 ? (
                                <ul className="list-inside list-disc text-rose-700 dark:text-rose-300 font-medium">
                                  {row.issues.map((iss, idx) => (
                                    <li key={idx}>{iss}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-[var(--muted)]">—</span>
                              )}

                              {/* Explicit Resolution Helpers where workflow permits */}
                              {row.status === "UnresolvedAllocation" &&
                                row.accountId &&
                                row.date &&
                                onOpenSharedDayUsage && (
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onOpenSharedDayUsage(
                                          row.accountId!,
                                          row.captainId,
                                          row.date
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-100/80 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                                    >
                                      <ArrowRightLeft className="h-3 w-3" />
                                      <span>
                                        {isEn
                                          ? "Declare Shared Day Usage"
                                          : "إدخال حصص اليوم المشترك"}
                                      </span>
                                    </button>
                                    <Link
                                      href="/admin/ninja/accounts"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      <span>
                                        {isEn
                                          ? "Manage Account Assignments"
                                          : "إدارة تعيينات الحساب"}
                                      </span>
                                    </Link>
                                  </div>
                                )}

                              {row.status === "UnknownAccount" && (
                                <div className="pt-1">
                                  <Link
                                    href="/admin/ninja/accounts"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span>
                                      {isEn
                                        ? "Register Captain Account in Ninja Accounts"
                                        : "إضافة/مراجعة حساب الكابتن في شاشة حسابات نينجا"}
                                    </span>
                                  </Link>
                                </div>
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

            {/* Confirm Error (409 Stale / Expired / Atomic Failure) */}
            {confirmError && (
              <div
                className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                role="alert"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-sm">
                        {confirmError.code === "ninja.preview_expired"
                          ? isEn
                            ? "Preview Expired (409 ninja.preview_expired)"
                            : "انتهت صلاحية المعاينة (409 ninja.preview_expired)"
                          : confirmError.code === "ninja.preview_stale"
                          ? isEn
                            ? "Stale Preview — Underlying Assignments/Responsibility Changed (409 ninja.preview_stale)"
                            : "تغيرت بيانات التعيينات أو الحصص أو المسؤولية منذ المعاينة (409 ninja.preview_stale)"
                          : isEn
                          ? "Confirmation Rejected — Atomic Rollback (No Data Imported)"
                          : "تم رفض التأكيد — تراجع ذري كامل (لم يتم استيراد أي بيانات)"}
                      </div>
                      <p>{confirmError.message}</p>
                    </div>
                  </div>
                  {confirmError.needsRepreview && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRunPreview}
                      loading={previewLoading}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>
                        {isEn
                          ? "Re-run Preview Now"
                          : "إعادة تشغيل المعاينة الآن"}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Confirm Action Footer */}
            {!confirmationReceipt && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                <div className="text-xs text-[var(--muted)]">
                  {isEn
                    ? `New rows to import: ${localizeDigits(statusCounts.New, locale)} | Identical rows to skip: ${localizeDigits(statusCounts.Identical, locale)}`
                    : `السجلات الجديدة للاستيراد: ${localizeDigits(statusCounts.New, locale)} | السجلات المطابقة التي سيتم تخطيها: ${localizeDigits(statusCounts.Identical, locale)}`}
                </div>
                <Button
                  variant="primary"
                  onClick={handleConfirmImport}
                  loading={confirmLoading}
                  disabled={
                    !previewData.canConfirm ||
                    !isPreviewMatchingCurrentInput ||
                    !selectedFile
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isEn
                      ? "Step 3: Confirm & Commit Batch Atomically"
                      : "الخطوة 3: تأكيد واعتماد الاستيراد نهائياً"}
                  </span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 Receipt: Confirmed Import Summary */}
        {confirmationReceipt && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 p-5 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                <div>
                  <h4 className="text-base font-extrabold">
                    {isEn
                      ? "Performance Import Committed Successfully"
                      : "تم اعتماد وحفظ استيراد الأداء بنجاح"}
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                    {isEn
                      ? `Artifact ID: ${confirmationReceipt.artifactId || "N/A"} | Imported Rows: ${
                          confirmationReceipt.importedRows
                        } | Skipped Identical Rows: ${localizeDigits(confirmationReceipt.skippedRows, locale)}`
                      : `معرف الأرشيف الأصلي (Artifact ID): ${
                          confirmationReceipt.artifactId || "—"
                        } | تم استيراد: ${
                          confirmationReceipt.importedRows
                        } سجل | تم تخطي المطابق: ${
                          confirmationReceipt.skippedRows
                        } سجل`}
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={onClose}>
                {isEn ? "Done & Close" : "إغلاق وعرض التقرير"}
              </Button>
            </div>

            {confirmationReceipt.days && confirmationReceipt.days.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-emerald-200 bg-white/80 dark:border-emerald-900 dark:bg-slate-900/60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-emerald-200 dark:border-emerald-900 text-start">
                      <th className="px-3 py-2 text-start font-bold">
                        {isEn ? "Report Date" : "تاريخ التقرير"}
                      </th>
                      <th className="px-3 py-2 text-start font-bold">
                        {isEn ? "Import Header ID" : "معرف الاستيراد (Import ID)"}
                      </th>
                      <th className="px-3 py-2 text-start font-bold">
                        {isEn ? "Imported Rows" : "السجلات المستوردة"}
                      </th>
                      <th className="px-3 py-2 text-start font-bold">
                        {isEn ? "Skipped Rows" : "السجلات المتخطاة"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 dark:divide-emerald-900/50">
                    {confirmationReceipt.days.map((d) => (
                      <tr key={`${localizeDigits(d.reportDate, locale)}-${d.importId}`}>
                        <td className="px-3 py-2 font-mono font-bold">
                          {localizeDigits(d.reportDate, locale)}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px]">
                          {d.importId || "—"}
                        </td>
                        <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-300">
                          {localizeDigits(d.importedRows, locale)}
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {localizeDigits(d.skippedRows, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
