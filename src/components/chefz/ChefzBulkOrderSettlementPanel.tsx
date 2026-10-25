// src/components/chefz/ChefzBulkOrderSettlementPanel.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  previewChefzOrderSettlements,
  importChefzOrderSettlements,
  getChefzOrderSettlementImport,
} from "@/lib/chefz/api";
import type {
  ChefzOrderSettlementImportResponse,
  ChefzRiderCycleSettlement,
  ChefzOrderSettlementResponse,
  ChefzImportIssue,
  ChefzProblemDetails,
} from "@/lib/chefz/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { getRiderIqama, ensureRiderIqamaLoaded } from "@/lib/fleet/rider-iqama-cache";
import {
  ArrowRight,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  Calendar,
  CreditCard,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

interface ChefzBulkOrderSettlementPanelProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
  viewImportId?: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function ChefzBulkOrderSettlementPanel({
  onBack,
  onSaveSuccess,
  viewImportId,
}: ChefzBulkOrderSettlementPanelProps) {
  const { can } = useAuth();
  const canSavePermission = can("chefz.settlements.create");
  const canReadPermission = can("chefz.read");

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Response & workflow state
  const [response, setResponse] = useState<ChefzOrderSettlementImportResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local UI filters
  const [selectedCycleKey, setSelectedCycleKey] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRiderKeys, setExpandedRiderKeys] = useState<Set<string>>(new Set());

  // Active in-flight abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void ensureRiderIqamaLoaded().catch(() => {});
  }, []);

  const resolveRiderIqama = (
    riderProfileId?: string | null,
    directIqama?: string | null,
    riderName?: string | null,
    accountId?: string | null
  ): string => {
    const direct = directIqama?.trim();
    if (direct && direct !== "—" && direct !== "-" && direct !== "null" && direct !== "undefined") {
      return direct;
    }
    const cached = getRiderIqama({
      riderProfileId,
      accountId,
      riderNameAr: riderName,
    });
    if (cached && cached !== "—" && cached !== "-") {
      return cached;
    }
    return "—";
  };

  // -----------------------------------------------------------------
  // Load saved batch if viewImportId is provided
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!viewImportId) return;

    let isMounted = true;
    setInitialLoading(true);
    setErrorMessage(null);

    getChefzOrderSettlementImport(viewImportId)
      .then((res) => {
        if (!isMounted) return;
        setResponse(res);
        setSavedSuccess(true);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const e = err as { details?: ChefzProblemDetails; message?: string };
        const msg =
          e?.details?.detail ||
          e?.details?.title ||
          e?.message ||
          "تعذر تحميل بيانات التصفية المحفوظة.";
        setErrorMessage(msg);
      })
      .finally(() => {
        if (isMounted) setInitialLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [viewImportId]);

  // -----------------------------------------------------------------
  // Validate File
  // -----------------------------------------------------------------
  const validateAndSetFile = (newFile: File | null) => {
    // Abort any in-flight requests immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Invalidate old preview/save state immediately
    setResponse(null);
    setErrorMessage(null);
    setSavedSuccess(false);
    setSelectedCycleKey("all");
    setSearchQuery("");
    setExpandedRiderKeys(new Set());

    if (!newFile) {
      setFile(null);
      setFileError(null);
      return;
    }

    const name = newFile.name.toLowerCase();
    if (!name.endsWith(".xlsx")) {
      setFile(null);
      setFileError("يجب أن يكون الملف بصيغة Excel (.xlsx) فقط.");
      return;
    }

    if (newFile.size === 0) {
      setFile(null);
      setFileError("الملف فارغ (الحجم 0 بايت).");
      return;
    }

    if (newFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError("حجم الملف يتجاوز الحد الأقصى المسموح (10 ميجابايت).");
      return;
    }

    setFileError(null);
    setFile(newFile);
  };

  // -----------------------------------------------------------------
  // Preview Action
  // -----------------------------------------------------------------
  const handlePreview = async () => {
    if (!file) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPreviewLoading(true);
    setErrorMessage(null);
    setResponse(null);
    setSavedSuccess(false);

    try {
      const res = await previewChefzOrderSettlements(file, controller.signal);
      setResponse(res);
      setSelectedCycleKey("all");
      setSearchQuery("");
      setExpandedRiderKeys(new Set());
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const e = err as {
        status?: number;
        details?: ChefzProblemDetails;
        problem?: ChefzProblemDetails;
        message?: string;
      };
      const problem = e.details || e.problem;
      const msg =
        problem?.detail ||
        problem?.title ||
        e.message ||
        "تعذر إجراء معاينة التصفية. يرجى التأكد من صحة الملف وإعادة المحاولة.";
      setErrorMessage(msg);
      setResponse(null);
    } finally {
      if (abortControllerRef.current === controller) {
        setPreviewLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  // -----------------------------------------------------------------
  // Save Action
  // -----------------------------------------------------------------
  const handleSave = async () => {
    if (!file || !response || !response.canSave || response.issues.length > 0) return;
    if (!canSavePermission) {
      toast.error("تنبيه", "ليس لديك صلاحية حفظ التصفيات (chefz.settlements.create).");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSaveLoading(true);
    setErrorMessage(null);

    try {
      const res = await importChefzOrderSettlements(file, controller.signal);

      // Check authoritative response: success requires non-null importId, empty issues, and isPreview: false
      // (or alreadyImported: true when identical bytes were committed)
      const isSuccess =
        Boolean(res.importId) &&
        res.issues.length === 0 &&
        (!res.isPreview || res.alreadyImported);

      if (isSuccess) {
        setResponse(res);
        setSavedSuccess(true);
        toast.success("تم بنجاح", "تم حفظ وتوثيق تصفيات الطلبات بنجاح!");
        onSaveSuccess?.();
      } else {
        setResponse(res);
        if (res.issues.length > 0) {
          setErrorMessage(
            "لم يتم حفظ التصفية لوجود ملاحظات أو تعارضات مانعة في الملف."
          );
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const e = err as {
        status?: number;
        details?: ChefzProblemDetails;
        problem?: ChefzProblemDetails;
        message?: string;
      };
      const problem = e.details || e.problem;
      const msg =
        problem?.detail ||
        problem?.title ||
        e.message ||
        "تعذر حفظ التصفية. قد يكون هناك تعارض في البيانات أو تم استيراد دورة متداخلة مسبقاً.";
      setErrorMessage(msg);
    } finally {
      if (abortControllerRef.current === controller) {
        setSaveLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  // -----------------------------------------------------------------
  // Cycles & Calculations
  // -----------------------------------------------------------------
  const cycles = useMemo(() => {
    if (!response?.riders) return [];
    const map = new Map<string, { periodFrom: string; periodTo: string; count: number }>();

    for (const r of response.riders) {
      const key = `${r.periodFrom}_${r.periodTo}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { periodFrom: r.periodFrom, periodTo: r.periodTo, count: 1 });
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({ key, ...val }));
  }, [response?.riders]);

  // Distinct rider count across all returned records
  const distinctRiderCount = useMemo(() => {
    if (!response?.riders) return 0;
    const ids = new Set(response.riders.map((r) => r.riderProfileId));
    return ids.size;
  }, [response?.riders]);

  // Filter riders by cycle tab and search query
  const filteredRiders = useMemo(() => {
    if (!response?.riders) return [];

    let list = response.riders;

    if (selectedCycleKey !== "all") {
      list = list.filter((r) => `${r.periodFrom}_${r.periodTo}` === selectedCycleKey);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const nameMatch = r.riderName.toLowerCase().includes(q);
        const iqamaMatch = (r.riderIqamaNo || "").toLowerCase().includes(q);
        const driverIdMatch = r.accounts.some(
          (a) =>
            a.driverId.toLowerCase().includes(q) ||
            (a.riderIqamaNo || "").toLowerCase().includes(q)
        );
        return nameMatch || iqamaMatch || driverIdMatch;
      });
    }

    return list;
  }, [response?.riders, selectedCycleKey, searchQuery]);

  // Export order settlements to Excel
  const handleExportExcel = () => {
    if (!response?.riders || filteredRiders.length === 0) {
      toast.warning("لا توجد بيانات متاحة للتصدير");
      return;
    }

    const rows: Array<{
      riderName: string;
      riderIqamaNo: string;
      riderIban: string;
      riderProfileId: string;
      period: string;
      driverId: string;
      accountType: string;
      chargedPeriod: string;
      assignedDays: number;
      sourceRows: number;
      deliveryFees: number;
      vatAmount: number;
      deliveryFeesAfterVat: number;
      tips: number;
      compensation: number;
      bonuses: number;
      deductions: number;
      netEarnings: number;
      companyAmount: number;
      riderAmount: number;
    }> = [];

    for (const r of filteredRiders) {
      for (const a of r.accounts) {
        const iqama = resolveRiderIqama(
          r.riderProfileId || a.riderProfileId,
          a.riderIqamaNo || r.riderIqamaNo,
          r.riderName || a.riderName,
          a.accountId
        );
        const iban = (a as any).riderIban || (r as any).riderIban || "—";

        rows.push({
          riderName: r.riderName,
          riderIqamaNo: iqama,
          riderIban: iban,
          riderProfileId: r.riderProfileId,
          period: `${r.periodFrom} -> ${r.periodTo}`,
          driverId: a.driverId,
          accountType: a.accountType === "Freelancer" ? "فريلانسر" : "دوام كامل",
          chargedPeriod: `${a.chargedFrom} -> ${a.chargedTo}`,
          assignedDays: a.assignedDays,
          sourceRows: a.sourceRows,
          deliveryFees: a.deliveryFees,
          vatAmount: a.vatAmount,
          deliveryFeesAfterVat: a.deliveryFeesAfterVat,
          tips: a.tips,
          compensation: a.compensation,
          bonuses: a.bonuses,
          deductions: a.deductions,
          netEarnings: a.netEarnings,
          companyAmount: a.companyAmount,
          riderAmount: a.riderAmount,
        });
      }
    }

    exportToExcel({
      filename: `تصفية-طلبات-شيفز-${new Date().toISOString().split("T")[0]}`,
      sheetName: "Order Settlements",
      data: rows,
      columns: [
        { header: "المندوب الفعلي", accessor: (d) => d.riderName, isText: true },
        { header: "رقم الإقامة", accessor: (d) => d.riderIqamaNo, isText: true },
        { header: "آيبان المندوب", accessor: (d) => d.riderIban, isText: true },
        { header: "معرف المندوب", accessor: (d) => d.riderProfileId, isText: true },
        { header: "دورة التصفية", accessor: (d) => d.period, isText: true },
        { header: "رقم الحساب في التقرير", accessor: (d) => d.driverId, isText: true },
        { header: "نوع الحساب", accessor: (d) => d.accountType, isText: true },
        { header: "فترة التكليف", accessor: (d) => d.chargedPeriod, isText: true },
        { header: "أيام التكليف", accessor: (d) => d.assignedDays },
        { header: "صفوف التقرير", accessor: (d) => d.sourceRows },
        { header: "رسوم التوصيل", accessor: (d) => d.deliveryFees },
        { header: "خصم الضريبة", accessor: (d) => d.vatAmount },
        { header: "التوصيل بعد الضريبة", accessor: (d) => d.deliveryFeesAfterVat },
        { header: "الإكراميات", accessor: (d) => d.tips },
        { header: "التعويض", accessor: (d) => d.compensation },
        { header: "البونص", accessor: (d) => d.bonuses },
        { header: "الخصومات", accessor: (d) => d.deductions },
        { header: "صافي الدخل", accessor: (d) => d.netEarnings },
        { header: "حصة الشركة", accessor: (d) => d.companyAmount },
        { header: "حصة المندوب", accessor: (d) => d.riderAmount },
      ],
    });
    toast.success("تم استخراج ملف إكسل بنجاح");
  };

  // Filtered cycle subtotal (for local view only, keeping whole batch total distinct)
  const cycleSubtotals = useMemo(() => {
    if (selectedCycleKey === "all" || !response?.riders) return null;
    const cycleRiders = response.riders.filter(
      (r) => `${r.periodFrom}_${r.periodTo}` === selectedCycleKey
    );

    return {
      count: cycleRiders.length,
      sourceRows: cycleRiders.reduce((acc, r) => acc + r.sourceRows, 0),
      netEarnings: cycleRiders.reduce((acc, r) => acc + r.netEarnings, 0),
      riderAmount: cycleRiders.reduce((acc, r) => acc + r.riderAmount, 0),
      companyAmount: cycleRiders.reduce((acc, r) => acc + r.companyAmount, 0),
    };
  }, [response?.riders, selectedCycleKey]);

  // Toggle rider accordion
  const toggleRiderExpand = (key: string) => {
    setExpandedRiderKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    const keys = new Set(filteredRiders.map((r) => `${r.riderProfileId}_${r.periodFrom}`));
    setExpandedRiderKeys(keys);
  };

  const collapseAll = () => {
    setExpandedRiderKeys(new Set());
  };

  // Helper formatting for currency
  const formatMoney = (val: number | undefined | null) => {
    if (typeof val !== "number" || isNaN(val)) return "0.00";
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!canReadPermission) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <ShieldAlert className="mx-auto mb-3 text-red-500" size={32} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">لا توجد صلاحية للوصول</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            ليس لديك الصلاحية الكافية لعرض أو استيراد تصفيات شيفز (chefz.read).
          </p>
          <Button variant="secondary" onClick={onBack} className="mt-4">
            العودة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ------------------------------------------------------------- */}
      {/* 1. Top Navigation & Header                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={onBack}
            className="group mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] hover:text-[var(--brand)] transition-colors"
          >
            <ArrowRight className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>العودة إلى سجل التصفيات</span>
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {viewImportId ? "عرض التصفية المحفوظة من ملف الطلبات" : "تصفية شيفز من ملف الطلبات"}
            </h1>
            {response?.importId && (
              <Badge tone="green" className="text-xs">
                {savedSuccess ? "دفعة محفوظة" : "لقطة محفوظة"}
              </Badge>
            )}
            {response?.isPreview && !response.alreadyImported && (
              <Badge tone="blue" className="text-xs">
                معاينة تدقيق
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)] max-w-3xl leading-relaxed">
            تُحدد الفترة من تاريخ كل طلب: من 1 إلى 15، ومن 16 إلى نهاية الشهر. تُحسب المبالغ للمندوب المكلّف بالحساب بتاريخ الطلب.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {response && response.riders && response.riders.length > 0 && (
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              className="gap-2 text-xs font-semibold"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              تصدير إكسل
            </Button>
          )}

          {viewImportId && (
            <Button
              variant="secondary"
              onClick={() => {
                // Switch back to empty uploader mode
                validateAndSetFile(null);
                onBack();
              }}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              رفع ملف تصفية جديد
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Instructions & Completeness Callout Banner                  */}
      {/* ------------------------------------------------------------- */}
      {!viewImportId && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/30 p-4 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-blue-950 dark:text-blue-100">
                ارفع التقرير الكامل للفترة قبل حفظ التصفيات.
              </p>
              <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                يقوم النظام بالتعرف التلقائي على دورات الشهر ونصفه، مطابقة كل رقم حساب (Driver ID) مع المندوب المكلّف به في تاريخ الطلب، واحتساب مستحقات الفريلانسر (15% خصم ضريبة على رسوم التوصيل، 15% عمولة الشركة من صافي الدخل) والدوام الكامل (25 ر.س عن كل يوم تكليف بالدورة).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Initial Loading (when fetching saved batch) */}
      {initialLoading && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-[var(--brand)]" />
          <h3 className="font-bold text-base text-[var(--foreground)]">جارٍ تحميل التصفية المحفوظة...</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">يتم استرجاع تفاصيل المناديب والحسابات والمبالغ المحفوظة</p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Upload & File Selection Area (Hidden in pure view mode)     */}
      {/* ------------------------------------------------------------- */}
      {!viewImportId && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-[var(--foreground)]">اختيار ملف تقرير الطلبات (.xlsx)</h2>
            </div>
            {file && (
              <span className="text-xs text-[var(--muted)] font-mono" dir="ltr">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) validateAndSetFile(dropped);
            }}
            className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              isDragOver
                ? "border-[var(--brand)] bg-blue-50/50 dark:bg-blue-950/30"
                : "border-[var(--border)] hover:border-[var(--brand)] bg-[var(--subtle-bg)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                const picked = e.target.files?.[0] || null;
                validateAndSetFile(picked);
                // Reset value so picking the same file again triggers change if needed
                e.target.value = "";
              }}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              disabled={previewLoading || saveLoading}
            />

            <FileSpreadsheet className="mx-auto h-12 w-12 text-[var(--muted)]" />

            {file ? (
              <div className="mt-3 space-y-1">
                <p className="font-bold text-sm text-[var(--foreground)]" dir="ltr">
                  {file.name}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  تم اختيار الملف بنجاح — جاهز للمعاينة والتدقيق
                </p>
                <div className="pt-2">
                  <span className="inline-block rounded-lg bg-[var(--card-bg)] px-3 py-1 text-xs font-semibold text-[var(--brand)] border border-[var(--border)] shadow-xs">
                    تغيير الملف
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                <p className="font-bold text-sm text-[var(--foreground)]">
                  اضغط لاختيار ملف Excel أو اسحبه وأفلته هنا
                </p>
                <p>الملفات المدعومة: .xlsx فقط (حد أقصى 10 ميجابايت، حتى 50,000 صف)</p>
                <p className="text-[11px] text-[var(--muted)]">
                  يجب أن يحتوي الملف على الأعمدة: Date, Driver ID, Driver Delivery Fees, Driver Tip, Driver Compensate, Deduction Amount
                </p>
              </div>
            )}
          </div>

          {/* File Error Notice */}
          {fileError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-[var(--muted)]">
              {file ? (
                <span>الملف المحدد: <strong className="text-[var(--foreground)]">{file.name}</strong></span>
              ) : (
                <span>لم يتم اختيار أي ملف حتى الآن.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {file && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => validateAndSetFile(null)}
                  disabled={previewLoading || saveLoading}
                  className="text-xs"
                >
                  إلغاء الملف
                </Button>
              )}

              <Button
                type="button"
                onClick={handlePreview}
                disabled={!file || previewLoading || saveLoading}
                className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 min-w-[140px]"
              >
                <RefreshCw className={`h-4 w-4 ${previewLoading ? "animate-spin" : ""}`} />
                {previewLoading ? "جارٍ المعاينة..." : "معاينة التصفية"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. Global Error Alert                                          */}
      {/* ------------------------------------------------------------- */}
      {errorMessage && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 shadow-sm">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">تعذر إكمال العملية</h4>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. Already Imported Banner                                     */}
      {/* ------------------------------------------------------------- */}
      {response?.alreadyImported && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">تم حفظ هذا الملف سابقاً</h4>
              <p className="leading-relaxed">
                تم استيراد وحفظ هذا الملف مسبقاً بنفس البيانات والمحتوى. النتائج والمبالغ المعروضة أدناه هي لقطة البيانات المحفوظة والمعتمدة في النظام (Batch ID:{" "}
                <span className="font-mono font-bold" dir="ltr">
                  {response.importId}
                </span>
                ). لا يمكن إعادة حفظ هذا الملف مرة أخرى تجنباً لتكرار العمليات المالية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. Saved Success Banner                                        */}
      {/* ------------------------------------------------------------- */}
      {savedSuccess && !response?.alreadyImported && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">تم حفظ التصفيات بنجاح!</h4>
              <p className="leading-relaxed">
                تم اعتماد وتوثيق كافة تصفيات المناديب والحسابات الواردة في الملف بنجاح. معرف الدفعة المحفوظة:{" "}
                <span className="font-mono font-bold" dir="ltr">
                  {response?.importId}
                </span>
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Button variant="secondary" onClick={onBack} className="text-xs">
                  العودة إلى جدول التصفيات
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. Issues List (Validation & Save Blockers)                    */}
      {/* ------------------------------------------------------------- */}
      {response && response.issues.length > 0 && (
        <div className="rounded-2xl border border-red-300 bg-red-50/80 p-5 space-y-3 dark:border-red-900/60 dark:bg-red-950/40 shadow-sm">
          <div className="flex items-center justify-between border-b border-red-200 dark:border-red-900/40 pb-3">
            <div className="flex items-center gap-2 text-red-900 dark:text-red-200">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <span className="font-bold text-sm">
                توجد ملاحظات تمنع حفظ التصفية ({response.issues.length} ملاحظة)
              </span>
            </div>
            <Badge tone="red">حفظ التصفية معطل</Badge>
          </div>

          <p className="text-xs text-red-800 dark:text-red-300">
            تم فحص الملف واكتشاف الملاحظات التالية. يرجى مراجعة وتصحيح هذه الملاحظات في ملف Excel أو في إعدادات الحسابات والتكليفات، ثم إعادة رفع الملف مجدداً:
          </p>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-red-200 bg-white dark:bg-slate-900 text-xs shadow-inner">
            <table className="w-full text-right">
              <thead className="bg-red-100/70 dark:bg-slate-800 font-bold border-b border-red-200 dark:border-slate-700 text-red-950 dark:text-red-300 sticky top-0">
                <tr>
                  <th className="p-3 w-28">الصف</th>
                  <th className="p-3 w-48">رقم الحساب في التقرير</th>
                  <th className="p-3">سبب التعذر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-slate-800">
                {response.issues.map((issue, idx) => (
                  <tr key={idx} className="hover:bg-red-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {issue.rowNumber === 0 ? (
                        <span className="rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-[11px] font-bold">
                          عام
                        </span>
                      ) : (
                        `صف ${issue.rowNumber}`
                      )}
                    </td>
                    <td className="p-3 font-mono text-[var(--foreground)]" dir="ltr">
                      {issue.idNumber ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span>{issue.idNumber}</span>
                          <Link
                            href="/admin/chefz/accounts"
                            target="_blank"
                            title="الانتقال إلى إعدادات حسابات شيفز"
                            className="text-[var(--brand)] hover:opacity-80"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="p-3 text-red-800 dark:text-red-300 font-medium">
                      {issue.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. Results Presentation (When response exists)                 */}
      {/* ------------------------------------------------------------- */}
      {response && (
        <div className="space-y-6">
          {/* Summary Metric Cards (All-File Totals) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Source Rows */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
              <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
                عدد صفوف التقرير
              </span>
              <div className="text-xl font-extrabold text-[var(--foreground)] font-mono" dir="ltr">
                {response.sourceRows.toLocaleString()}
              </div>
              <span className="text-[10px] text-[var(--muted)]">صفوف البيانات المعالجة</span>
            </div>

            {/* Cycles Count */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
              <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
                فترات التصفية
              </span>
              <div className="text-xl font-extrabold text-[var(--foreground)] font-mono" dir="ltr">
                {cycles.length}
              </div>
              <span className="text-[10px] text-[var(--muted)]">دورة نصف شهرية مستقلة</span>
            </div>

            {/* Distinct Riders */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
              <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
                المناديب الفعليين
              </span>
              <div className="text-xl font-extrabold text-[var(--foreground)] font-mono" dir="ltr">
                {distinctRiderCount}
              </div>
              <span className="text-[10px] text-[var(--muted)]">مندوب مستحق بالتكليف</span>
            </div>

            {/* Net Earnings */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
              <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
                صافي الدخل الإجمالي
              </span>
              <div className="text-xl font-extrabold text-[var(--foreground)] font-mono" dir="ltr">
                {formatMoney(response.netEarnings)} <span className="text-xs font-normal">ر.س</span>
              </div>
              <span className="text-[10px] text-[var(--muted)]">بعد خصم الضريبة والبدلات</span>
            </div>

            {/* Company Share */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 shadow-sm">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block mb-1">
                إجمالي حصة الشركة
              </span>
              <div className="text-xl font-extrabold text-blue-700 dark:text-blue-300 font-mono" dir="ltr">
                {formatMoney(response.companyAmount)} <span className="text-xs font-normal">ر.س</span>
              </div>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">عمولة فريلانسر + رسوم دوام</span>
            </div>

            {/* Rider Amount */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block mb-1">
                إجمالي المبالغ للمندوبين
              </span>
              <div
                className={`text-xl font-extrabold font-mono ${
                  response.riderAmount >= 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-red-600 dark:text-red-400"
                }`}
                dir="ltr"
              >
                {formatMoney(response.riderAmount)} <span className="text-xs font-normal">ر.س</span>
              </div>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                {response.riderAmount >= 0 ? "صافي مستحق للمناديب" : "رصيد مستحق على المناديب"}
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* Cycle Switcher & Filtering Toolbar                             */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--brand)]" />
                <span className="text-xs font-bold text-[var(--foreground)]">
                  تصفية العرض حسب دورة التصفية ({cycles.length} فترات):
                </span>
              </div>

              {/* Expand / Collapse All */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-[var(--brand)] hover:underline font-semibold"
                >
                  توسيع جميع التفاصيل
                </button>
                <span className="text-[var(--border)]">|</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-[var(--muted)] hover:underline"
                >
                  طي التفاصيل
                </button>
              </div>
            </div>

            {/* Cycle Tabs */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedCycleKey("all")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  selectedCycleKey === "all"
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "border border-[var(--border)] bg-[var(--subtle-bg)] text-[var(--foreground)] hover:bg-[var(--table-row-hover)]"
                }`}
              >
                جميع الفترات ({response.riders.length})
              </button>

              {cycles.map((c) => {
                const isSelected = selectedCycleKey === c.key;
                const isFirstHalf = c.periodFrom.slice(8, 10) === "01";
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelectedCycleKey(c.key)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "border border-[var(--border)] bg-[var(--subtle-bg)] text-[var(--foreground)] hover:bg-[var(--table-row-hover)]"
                    }`}
                  >
                    <span dir="ltr">
                      {c.periodFrom} → {c.periodTo}
                    </span>
                    <span className="opacity-80 text-[11px]">
                      ({isFirstHalf ? "النصف الأول" : "النصف الثاني"} - {c.count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cycle filter notice & Subtotal */}
            {selectedCycleKey !== "all" && cycleSubtotals && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-3 text-xs text-blue-900 dark:text-blue-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    <strong>تنبيه:</strong> التصفية أعلاه للمعاينة المحلية فقط. حفظ التصفيات سيحفظ جميع الفترات الموجودة في الملف ({cycles.length} دورات).
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-semibold text-xs border-t md:border-t-0 md:border-r border-blue-200 dark:border-blue-800 pt-2 md:pt-0 md:pr-3">
                  <span>المناديب بالدورة: <strong>{cycleSubtotals.count}</strong></span>
                  <span>صفوف الدورة: <strong>{cycleSubtotals.sourceRows}</strong></span>
                  <span>المستحق للمناديب: <strong className="text-emerald-700 dark:text-emerald-400 font-mono" dir="ltr">{formatMoney(cycleSubtotals.riderAmount)} ر.س</strong></span>
                  <span>حصة الشركة: <strong className="text-blue-700 dark:text-blue-400 font-mono" dir="ltr">{formatMoney(cycleSubtotals.companyAmount)} ر.س</strong></span>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="relative pt-1">
              <Search className="absolute right-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المندوب أو رقم الحساب في التقرير..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 pr-9 pl-3 text-xs text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 9. Rider Settlement Rows Table & Cards                         */}
          {/* ------------------------------------------------------------- */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] font-bold text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3.5 w-10"></th>
                    <th className="px-4 py-3.5">المندوب الفعلي</th>
                    <th className="px-4 py-3.5">فترة التصفية</th>
                    <th className="px-4 py-3.5 text-center">عدد صفوف التقرير</th>
                    <th className="px-4 py-3.5 text-center">الحسابات المشمولة</th>
                    <th className="px-4 py-3.5 text-left">صافي الدخل</th>
                    <th className="px-4 py-3.5 text-left">للشركة</th>
                    <th className="px-4 py-3.5 text-left">للمندوب</th>
                    <th className="px-4 py-3.5 text-center w-28">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredRiders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-sm text-[var(--muted)]">
                        لا توجد نتائج مطابقة لبحثك أو للفترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredRiders.map((rider) => {
                      // Stable composite React key: (riderProfileId, periodFrom)
                      const compositeKey = `${rider.riderProfileId}_${rider.periodFrom}`;
                      const isExpanded = expandedRiderKeys.has(compositeKey);

                      return (
                        <React.Fragment key={compositeKey}>
                          <tr
                            onClick={() => toggleRiderExpand(compositeKey)}
                            className="cursor-pointer transition-colors hover:bg-[var(--table-row-hover)]"
                          >
                            {/* Expand Icon */}
                            <td className="px-4 py-3 text-center text-[var(--muted)]">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 mx-auto" />
                              ) : (
                                <ChevronDown className="h-4 w-4 mx-auto" />
                              )}
                            </td>

                            {/* Actual Rider Name */}
                            <td className="px-4 py-3">
                              <div className="font-bold text-[var(--foreground)]">
                                {rider.riderName}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[11px] text-[var(--foreground)] font-semibold">
                                  رقم الإقامة: {resolveRiderIqama(rider.riderProfileId, rider.riderIqamaNo, rider.riderName)}
                                </span>
                                <span className="font-mono text-[10px] text-[var(--muted)]" dir="ltr">
                                  ({rider.riderProfileId.slice(0, 8)}...)
                                </span>
                              </div>
                            </td>

                            {/* Cycle Period */}
                            <td className="px-4 py-3">
                              <div className="font-semibold font-mono text-[var(--foreground)]" dir="ltr">
                                {rider.periodFrom} → {rider.periodTo}
                              </div>
                              <div className="text-[10px] text-[var(--muted)]">
                                {rider.periodFrom.slice(8, 10) === "01" ? "النصف الأول" : "النصف الثاني"}
                              </div>
                            </td>

                            {/* Source Rows */}
                            <td className="px-4 py-3 text-center font-mono font-bold text-[var(--foreground)]">
                              {rider.sourceRows}
                            </td>

                            {/* Accounts Count */}
                            <td className="px-4 py-3 text-center">
                              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {rider.accounts.length} حساب
                              </span>
                            </td>

                            {/* Net Earnings */}
                            <td className="px-4 py-3 font-mono font-bold text-left" dir="ltr">
                              {formatMoney(rider.netEarnings)} ر.س
                            </td>

                            {/* Company Share */}
                            <td className="px-4 py-3 font-mono font-bold text-left text-blue-600 dark:text-blue-400" dir="ltr">
                              {formatMoney(rider.companyAmount)} ر.س
                            </td>

                            {/* Rider Share */}
                            <td className="px-4 py-3 font-mono font-bold text-left" dir="ltr">
                              {rider.riderAmount >= 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  +{formatMoney(rider.riderAmount)} ر.س
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">
                                  {formatMoney(rider.riderAmount)} ر.س (مستحق عليه)
                                </span>
                              )}
                            </td>

                            {/* Action toggle button */}
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRiderExpand(compositeKey);
                                }}
                                className="text-[var(--brand)] font-semibold hover:underline"
                              >
                                {isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Financial Breakdown & Accounts View */}
                          {isExpanded && (
                            <tr className="bg-blue-50/20 dark:bg-slate-800/40">
                              <td colSpan={9} className="p-4 space-y-4">
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-4 shadow-inner">
                                  {/* Detailed Earnings Metrics for this Rider in this Cycle */}
                                  <div>
                                    <h4 className="font-bold text-xs text-[var(--foreground)] mb-2 flex items-center gap-1.5">
                                      <DollarSign className="h-3.5 w-3.5 text-[var(--brand)]" />
                                      تفصيل بنود الدخل والخصومات للمندوب ({rider.riderName}):
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
                                      <div className="rounded-lg bg-[var(--subtle-bg)] p-2 border border-[var(--border)]">
                                        <span className="text-[10px] text-[var(--muted)] block">رسوم التوصيل</span>
                                        <span className="font-mono font-bold" dir="ltr">{formatMoney(rider.deliveryFees)}</span>
                                      </div>
                                      <div className="rounded-lg bg-[var(--subtle-bg)] p-2 border border-[var(--border)]">
                                        <span className="text-[10px] text-red-600 dark:text-red-400 block">خصم الضريبة (15%)</span>
                                        <span className="font-mono font-bold text-red-600 dark:text-red-400" dir="ltr">-{formatMoney(rider.vatAmount)}</span>
                                      </div>
                                      <div className="rounded-lg bg-[var(--subtle-bg)] p-2 border border-[var(--border)]">
                                        <span className="text-[10px] text-[var(--muted)] block">التوصيل بعد الضريبة</span>
                                        <span className="font-mono font-bold" dir="ltr">{formatMoney(rider.deliveryFeesAfterVat)}</span>
                                      </div>
                                      <div className="rounded-lg bg-[var(--subtle-bg)] p-2 border border-[var(--border)]">
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">الإكراميات</span>
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">+{formatMoney(rider.tips)}</span>
                                      </div>
                                      <div className="rounded-lg bg-[var(--subtle-bg)] p-2 border border-[var(--border)]">
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">التعويض</span>
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">+{formatMoney(rider.compensation)}</span>
                                      </div>
                                      <div className="rounded-lg bg-[var(--subtle-bg)] p-2 border border-[var(--border)]">
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">البونص</span>
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">+{formatMoney(rider.bonuses)}</span>
                                      </div>
                                      <div className="rounded-lg bg-[var(--subtle-bg)] p-2 border border-[var(--border)]">
                                        <span className="text-[10px] text-red-600 dark:text-red-400 block">الخصومات</span>
                                        <span className="font-mono font-bold text-red-600 dark:text-red-400" dir="ltr">-{formatMoney(rider.deductions)}</span>
                                      </div>
                                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-2 border border-blue-200 dark:border-blue-900">
                                        <span className="text-[10px] text-blue-700 dark:text-blue-300 block font-bold">صافي الدخل</span>
                                        <span className="font-mono font-extrabold text-blue-700 dark:text-blue-300" dir="ltr">{formatMoney(rider.netEarnings)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Nested Accounts List */}
                                  <div>
                                    <h4 className="font-bold text-xs text-[var(--foreground)] mb-2 flex items-center gap-1.5">
                                      <CreditCard className="h-3.5 w-3.5 text-[var(--brand)]" />
                                      الحسابات والتكليفات المشمولة لهذا المندوب في هذه الدورة ({rider.accounts.length} تكليف):
                                    </h4>

                                    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                                      <table className="w-full text-right text-[11px]">
                                        <thead className="bg-[var(--subtle-bg)] font-bold text-[var(--muted)] border-b border-[var(--border)]">
                                          <tr>
                                            <th className="p-2.5">رقم الحساب في التقرير</th>
                                            <th className="p-2.5">رقم الإقامة</th>
                                            <th className="p-2.5">نوع الحساب</th>
                                            <th className="p-2.5">فترة التكليف المحتسبة</th>
                                            <th className="p-2.5 text-center">أيام التكليف</th>
                                            <th className="p-2.5 text-center">صفوف التقرير</th>
                                            <th className="p-2.5 text-left">صافي الدخل</th>
                                            <th className="p-2.5 text-left">حصة الشركة</th>
                                            <th className="p-2.5 text-left">حصة المندوب</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                          {rider.accounts.map((acc, aIdx) => {
                                            // Nested key: (assignmentId, periodFrom) with index fallback
                                            const accKey = `${acc.assignmentId}_${acc.periodFrom}_${aIdx}`;
                                            return (
                                              <tr key={accKey} className="hover:bg-[var(--table-row-hover)]">
                                                {/* Driver ID */}
                                                <td className="p-2.5 font-mono font-bold text-[var(--foreground)]" dir="ltr">
                                                  {acc.driverId}
                                                </td>

                                                {/* Rider Iqama */}
                                                <td className="p-2.5 font-mono font-semibold text-[var(--foreground)]" dir="ltr">
                                                  {resolveRiderIqama(rider.riderProfileId, acc.riderIqamaNo || rider.riderIqamaNo, rider.riderName, acc.accountId)}
                                                </td>

                                                {/* Account Type */}
                                                <td className="p-2.5">
                                                  <Badge tone={acc.accountType === "Freelancer" ? "blue" : "orange"}>
                                                    {acc.accountType === "Freelancer"
                                                      ? "فريلانسر (15% عمولة)"
                                                      : "دوام كامل (25 ر.س/يوم)"}
                                                  </Badge>
                                                </td>

                                                {/* Charged Period */}
                                                <td className="p-2.5 font-mono text-[var(--muted)]" dir="ltr">
                                                  {acc.chargedFrom} → {acc.chargedTo}
                                                </td>

                                                {/* Assigned Days */}
                                                <td className="p-2.5 text-center font-bold" dir="ltr">
                                                  {acc.assignedDays} يوم
                                                </td>

                                                {/* Source Rows */}
                                                <td className="p-2.5 text-center font-mono">
                                                  {acc.sourceRows}
                                                </td>

                                                {/* Net Earnings */}
                                                <td className="p-2.5 font-mono text-left font-bold" dir="ltr">
                                                  {formatMoney(acc.netEarnings)} ر.س
                                                </td>

                                                {/* Company Share */}
                                                <td className="p-2.5 font-mono text-left font-bold text-blue-600 dark:text-blue-400" dir="ltr">
                                                  {formatMoney(acc.companyAmount)} ر.س
                                                </td>

                                                {/* Rider Share */}
                                                <td className="p-2.5 font-mono text-left font-bold" dir="ltr">
                                                  {acc.riderAmount >= 0 ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400">
                                                      +{formatMoney(acc.riderAmount)} ر.س
                                                    </span>
                                                  ) : (
                                                    <span className="text-red-600 dark:text-red-400">
                                                      {formatMoney(acc.riderAmount)} ر.س
                                                    </span>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 10. Sticky Save Footer (Only for valid unsaved preview)        */}
          {/* ------------------------------------------------------------- */}
          {!viewImportId && !savedSuccess && !response.alreadyImported && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-10 backdrop-blur-md bg-opacity-95">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--foreground)]">جاهزية حفظ التصفيات:</span>
                  {response.canSave && response.issues.length === 0 ? (
                    <Badge tone="green" className="gap-1">
                      <Check className="h-3 w-3" />
                      مؤهل للحفظ النهائي
                    </Badge>
                  ) : (
                    <Badge tone="red" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      غير مؤهل للحفظ ({response.issues.length} ملاحظة)
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  عند الحفظ سيتم اعتماد وحفظ جميع دورات الملف ({cycles.length} دورات) وتوثيق استحقاقات {distinctRiderCount} مندوب دفعة واحدة.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onBack}
                  disabled={saveLoading}
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    !canSavePermission ||
                    !response.canSave ||
                    response.issues.length > 0 ||
                    saveLoading ||
                    !file
                  }
                  className="bg-[var(--brand)] text-white hover:opacity-90 min-w-[160px] gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${saveLoading ? "animate-spin" : ""}`} />
                  {saveLoading ? "جارٍ حفظ وتوثيق التصفية..." : "حفظ التصفيات"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
