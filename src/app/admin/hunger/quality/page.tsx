// src/app/admin/hunger/quality/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getAllHungerAccounts,
  getHungerQualityReport,
  exportHungerQualityReport,
  downloadHungerQualityTemplate,
  previewHungerQualityImport,
  confirmHungerQualityImport,
  reallocateHungerQuality,
  getRiyadhTodayIso,
  getRiyadhCurrentMonthStartIso,
  type BadgeTone,
  type HungerAccountItem,
  type HungerAccountsFilterParams,
  type HungerQualityReportItem,
  type HungerQualityImportPreviewResponse,
  type HungerQualityImportResultResponse,
} from "@/lib/hunger/api";
import {
  listEmployees,
  listOperatingCities,
  listRiders,
  listSponsors,
  type OperatingCity,
  type Sponsor,
} from "@/lib/workforce/api";
import type { Employee, Rider } from "@/lib/workforce/types";
import { AccountsFilterPanel } from "../components/AccountsFilterPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateInput } from "@/components/ui/DateInput";
import { toast } from "@/components/ui/Toast";
import {
  TableHeaderColumnFilter,
  type FilterOption,
} from "@/components/ui/TableHeaderFilter";
import {
  ShieldCheck,
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  RotateCcw,
  Award,
  AlertTriangle,
} from "lucide-react";

function getSegmentBadgeTone(seg?: string | null): BadgeTone {
  const code = (seg || "").trim().toUpperCase();
  if (code === "A" || code === "1") return "green";
  if (code === "B" || code === "2") return "blue";
  if (code === "C" || code === "3") return "orange";
  if (code) return "red";
  return "gray";
}

export default function HungerQualityPage() {
  const { can, canAny, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const canRead = canAny(
    "hunger.read",
    "hunger.quality.import",
    "hunger.quality.export",
  );
  const canImportQuality = can("hunger.quality.import");
  const canExportQuality = can("hunger.quality.export") && can("hunger.read");

  // Filters
  const [monthFilter, setMonthFilter] = useState(
    getRiyadhCurrentMonthStartIso().slice(0, 7),
  );
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [qualityAccountFilters, setQualityAccountFilters] =
    useState<HungerAccountsFilterParams>({});
  const [colFilterAccount, setColFilterAccount] = useState<string[]>([]);
  const [colFilterRider, setColFilterRider] = useState<string[]>([]);
  const [colFilterSegment, setColFilterSegment] = useState<string[]>([]);

  // Data
  const [accounts, setAccounts] = useState<HungerAccountItem[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<OperatingCity[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [qualityRows, setQualityRows] = useState<HungerQualityReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Import Quality Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReportDate, setImportReportDate] =
    useState(getRiyadhTodayIso());
  const [importPreview, setImportPreview] =
    useState<HungerQualityImportPreviewResponse | null>(null);
  const [lastImportResult, setLastImportResult] =
    useState<HungerQualityImportResultResponse | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  // Reallocate Modal
  const [reallocModalOpen, setReallocModalOpen] = useState(false);
  const [reallocRow, setReallocRow] = useState<HungerQualityReportItem | null>(
    null,
  );
  const [reallocReason, setReallocReason] = useState("");
  const [reallocBusy, setReallocBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [accs, rids, emps, cits, sps] = await Promise.allSettled([
        getAllHungerAccounts(),
        listRiders(),
        listEmployees(),
        listOperatingCities(),
        listSponsors(),
      ]);
      if (accs.status === "fulfilled" && Array.isArray(accs.value)) {
        setAccounts(accs.value);
      }
      if (rids.status === "fulfilled" && Array.isArray(rids.value)) {
        setRiders(rids.value);
      }
      if (emps.status === "fulfilled" && Array.isArray(emps.value)) {
        setEmployees(emps.value);
      }
      if (cits.status === "fulfilled" && Array.isArray(cits.value)) {
        setCities(cits.value);
      }
      if (sps.status === "fulfilled" && Array.isArray(sps.value)) {
        setSponsors(sps.value);
      }
    })();
  }, []);

  const accountOptions = useMemo(
    () => [
      { value: "", label: "جميع حسابات هنقرستيشن" },
      ...accounts.map((a) => ({
        value: a.accountId || a.id || "",
        label: `${a.externalAccountId || a.accountName || "حساب"}${a.ownerNameAr ? ` — المالك: ${a.ownerNameAr}` : ""}`,
        sublabel: a.assignedRiderNameAr
          ? `المندوب المكلف: ${a.assignedRiderNameAr}`
          : "شاغر",
      })),
    ],
    [accounts],
  );

  const riderOptions = useMemo(
    () => [
      { value: "", label: "جميع المناديب" },
      ...riders.map((r) => ({
        value: r.id,
        label: `${r.fullNameAr}${r.iqamaNo ? ` — هوية: ${r.iqamaNo}` : ""}`,
      })),
    ],
    [riders],
  );

  const employeeSelectOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${e.fullNameAr}${e.iqamaNo ? ` — هوية: ${e.iqamaNo}` : ""}`,
      })),
    [employees],
  );

  const citySelectOptions = useMemo(
    () =>
      cities.map((c) => ({
        value: c.id,
        label: isEn ? c.globalCityEn || c.globalCityAr : c.globalCityAr,
      })),
    [cities, isEn],
  );

  const sponsorSelectOptions = useMemo(
    () =>
      sponsors.map((s) => ({
        value: s.id,
        label: `${s.registryNameAr}${s.employerIdentityNumber ? ` (${s.employerIdentityNumber})` : ""}`,
      })),
    [sponsors],
  );

  const loadQualityReport = useCallback(async () => {
    await Promise.resolve();
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getHungerQualityReport({
        month: `${monthFilter}-01`,
        accountId: selectedAccountId || undefined,
        riderId: selectedRiderId || undefined,
        page: 1,
        pageSize: 100,
      });
      setQualityRows(res.items);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "تعذر تحميل تقرير الجودة التراكمية",
      );
    } finally {
      setLoading(false);
    }
  }, [canRead, monthFilter, selectedAccountId, selectedRiderId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadQualityReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadQualityReport]);

  const accountColOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, { label: string; sublabel?: string; count: number }>();
    for (const r of qualityRows) {
      const key = r.externalAccountId || r.accountName || r.accountId || "";
      if (!key) continue;
      const ex = map.get(key);
      if (ex) ex.count++;
      else {
        map.set(key, {
          label: r.externalAccountId || r.accountName || "حساب",
          sublabel: r.ownerNameAr ? `المالك: ${r.ownerNameAr}` : undefined,
          count: 1,
        });
      }
    }
    return Array.from(map.entries()).map(([value, item]) => ({ value, ...item }));
  }, [qualityRows]);

  const riderColOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    let unassigned = 0;
    for (const r of qualityRows) {
      const name = r.assignedRiderNameAr || r.assignedRiderNameEn;
      if (!name) {
        unassigned++;
        continue;
      }
      map.set(name, (map.get(name) || 0) + 1);
    }
    const opts: FilterOption[] = [];
    if (unassigned > 0) {
      opts.push({ value: "UNASSIGNED", label: "غير معين", count: unassigned });
    }
    for (const [name, cnt] of map.entries()) {
      opts.push({ value: name, label: name, count: cnt });
    }
    return opts;
  }, [qualityRows]);

  const segmentColOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    for (const r of qualityRows) {
      const seg = (r.segmentCode || "غير محدد").trim();
      map.set(seg, (map.get(seg) || 0) + 1);
    }
    return Array.from(map.entries()).map(([seg, count]) => ({
      value: seg,
      label: `شريحة ${seg}`,
      count,
    }));
  }, [qualityRows]);

  const filteredQualityRows = useMemo(() => {
    return qualityRows.filter((r) => {
      if (colFilterAccount.length > 0) {
        const key = r.externalAccountId || r.accountName || r.accountId || "";
        if (!colFilterAccount.includes(key)) return false;
      }
      if (colFilterRider.length > 0) {
        const name = r.assignedRiderNameAr || r.assignedRiderNameEn || "";
        const match = colFilterRider.some((v) =>
          v === "UNASSIGNED" ? !name : v === name,
        );
        if (!match) return false;
      }
      if (colFilterSegment.length > 0) {
        const seg = (r.segmentCode || "غير محدد").trim();
        if (!colFilterSegment.includes(seg)) return false;
      }
      return true;
    });
  }, [qualityRows, colFilterAccount, colFilterRider, colFilterSegment]);

  // 6 Cumulative Counters Totals
  const totals = useMemo(() => {
    let grossOrders = 0;
    let completedOrders = 0;
    let completedOrdersInTime = 0;
    let totalVerificationRequests = 0;
    let successfulVerificationRequests = 0;
    let failedOrdersByRider = 0;

    for (const r of filteredQualityRows) {
      grossOrders += Number(r.grossOrders || 0);
      completedOrders += Number(r.completedOrders || 0);
      completedOrdersInTime += Number(r.completedOrdersInTime || 0);
      totalVerificationRequests += Number(r.totalVerificationRequests || 0);
      successfulVerificationRequests += Number(
        r.successfulVerificationRequests || 0,
      );
      failedOrdersByRider += Number(r.failedOrdersByRider || 0);
    }

    return {
      grossOrders,
      completedOrders,
      completedOrdersInTime,
      totalVerificationRequests,
      successfulVerificationRequests,
      failedOrdersByRider,
    };
  }, [filteredQualityRows]);

  const handlePreviewImport = async () => {
    if (!importFile) {
      toast.warning("يرجى اختيار ملف الجودة التراكمية أولاً");
      return;
    }
    setImportBusy(true);
    try {
      const preview = await previewHungerQualityImport(
        importFile,
        importReportDate,
      );
      setImportPreview(preview);
      toast.success(
        "تم تحليل ملف الجودة التراكمية (يدعم القبول الجزئي للصفوف الصالحة)",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "تعذر معاينة ملف الجودة التراكمية",
      );
    } finally {
      setImportBusy(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.previewId) return;
    setImportBusy(true);
    try {
      const result = await confirmHungerQualityImport(importPreview.previewId);
      setLastImportResult(result);
      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      await loadQualityReport();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "تعذر اعتماد ملف الجودة التراكمية",
      );
    } finally {
      setImportBusy(false);
    }
  };

  const openReallocModal = (row: HungerQualityReportItem) => {
    setReallocRow(row);
    setReallocReason("");
    setReallocModalOpen(true);
  };

  const handleConfirmReallocate = async () => {
    if (!reallocRow) return;
    if (!reallocReason.trim()) {
      toast.warning(
        "يرجى كتابة سبب إعادة احتساب وتوزيع الجودة (بعد تعديل التكليفات أو التتبع)",
      );
      return;
    }
    const sourceId = reallocRow.sourceId || reallocRow.id || "";
    setReallocBusy(true);
    try {
      await reallocateHungerQuality(sourceId, {
        rowVersion: reallocRow.rowVersion || "",
        reason: reallocReason.trim(),
      });
      setReallocModalOpen(false);
      await loadQualityReport();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "تعذر إعادة توزيع الجودة التراكمية",
      );
    } finally {
      setReallocBusy(false);
    }
  };

  if (!canRead) {
    return (
      <div
        className="flex h-96 flex-col items-center justify-center gap-3 text-center"
        dir={isEn ? "ltr" : "rtl"}
      >
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {t("common.error") || "غير مصرح"}
        </h2>
        <p className="max-w-md text-sm text-slate-500">
          ليس لديك الصلاحية الكافية لعرض واستيراد الجودة التراكمية لمنصة
          هنقرستيشن.
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
            <span className="font-semibold text-[var(--foreground)]">
              {t("nav.hunger") || "إدارة هنقرستيشن"}
            </span>
            <span>/</span>
            <span>الجودة التراكمية</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                الجودة التراكمية الشهرية (Cumulative Quality)
              </h1>
              <p className="text-xs text-[var(--muted)]">
                متابعة العدادات التراكمية الستة لكل حساب وشهر، لقطة الشريحة
                (A/B/C)، وإعادة توزيع الفروقات على المناديب.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canImportQuality && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void downloadHungerQualityTemplate()}
            >
              <Download className="ml-1.5 h-3.5 w-3.5" />
              تحميل القالب
            </Button>
          )}

          {canExportQuality && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void exportHungerQualityReport({
                  month: `${monthFilter}-01`,
                  accountId: selectedAccountId || undefined,
                  riderId: selectedRiderId || undefined,
                  accountFilters: qualityAccountFilters,
                })
              }
            >
              <FileSpreadsheet className="ml-1.5 h-3.5 w-3.5 text-emerald-600" />
              تصدير الجودة التراكمية
            </Button>
          )}

          {canImportQuality && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setImportFile(null);
                setImportPreview(null);
                setImportModalOpen(true);
              }}
            >
              <Upload className="ml-1.5 h-3.5 w-3.5" />
              استيراد الجودة التراكمية
            </Button>
          )}
        </div>
      </div>

      {/* 6 Cumulative Counters Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <span className="text-[11px] font-medium text-[var(--muted)]">
            1. إجمالي الطلبات (Gross)
          </span>
          <p className="mt-1.5 text-xl font-bold text-[var(--foreground)]">
            {totals.grossOrders}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            2. الطلبات المكتملة
          </span>
          <p className="mt-1.5 text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {totals.completedOrders}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
            3. المكتملة في الوقت
          </span>
          <p className="mt-1.5 text-xl font-bold text-blue-700 dark:text-blue-300">
            {totals.completedOrdersInTime}
          </p>
        </div>

        <div className="rounded-2xl border border-purple-200/70 bg-purple-50/50 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
          <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300">
            4. إجمالي طلبات التحقق
          </span>
          <p className="mt-1.5 text-xl font-bold text-purple-700 dark:text-purple-300">
            {totals.totalVerificationRequests}
          </p>
        </div>

        <div className="rounded-2xl border border-teal-200/70 bg-teal-50/50 p-4 shadow-sm dark:border-teal-900/40 dark:bg-teal-950/20">
          <span className="text-[11px] font-medium text-teal-700 dark:text-teal-300">
            5. التحقق الناجح
          </span>
          <p className="mt-1.5 text-xl font-bold text-teal-700 dark:text-teal-300">
            {totals.successfulVerificationRequests}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/50 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
            6. فاشلة بسبب المندوب
          </span>
          <p className="mt-1.5 text-xl font-bold text-rose-700 dark:text-rose-300">
            {totals.failedOrdersByRider}
          </p>
        </div>
      </div>

      {/* Last Import Result Notice */}
      {lastImportResult && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div>
            <strong>نتيجة آخر استيراد للجودة التراكمية:</strong> إجمالي الصفوف (
            {lastImportResult.totalRows ?? 0}) — نجح (
            {lastImportResult.succeededRows ?? 0}) — فشل (
            {lastImportResult.failedRows ?? 0})
          </div>
          <button
            type="button"
            onClick={() => setLastImportResult(null)}
            className="text-[11px] font-bold underline"
          >
            إخفاء
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              الشهر التراكمي *
            </label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              تصفية بالحساب
            </label>
            <SearchableSelect
              options={accountOptions}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="جميع الحسابات..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              تصفية بالمندوب
            </label>
            <SearchableSelect
              options={riderOptions}
              value={selectedRiderId}
              onChange={setSelectedRiderId}
              placeholder="جميع المناديب..."
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadQualityReport()}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <RefreshCw
                className={`ml-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              تحديث التقرير
            </Button>
          </div>
        </div>
      </div>

      <AccountsFilterPanel
        filters={qualityAccountFilters}
        onChange={setQualityAccountFilters}
        onReset={() => setQualityAccountFilters({})}
        employeeOptions={employeeSelectOptions}
        riderOptions={riderOptions.filter((r) => Boolean(r.value))}
        cityOptions={citySelectOptions}
        sponsorOptions={sponsorSelectOptions}
        hideDateRange
        labelPrefix="فلاتر الحسابات المتقدمة (للتصدير): "
      />

      {/* Quality Report Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b-2 border-slate-200 bg-slate-100/95 text-[11px] font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-start gap-1.5">
                    <span>رقم الحساب والاسم</span>
                    <TableHeaderColumnFilter
                      label="رقم الحساب والاسم"
                      value={colFilterAccount}
                      onChange={setColFilterAccount}
                      options={accountColOptions}
                      placeholder="بحث برقم الحساب أو المالك..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-start gap-1.5">
                    <span>المندوب المكلف</span>
                    <TableHeaderColumnFilter
                      label="المندوب المكلف"
                      value={colFilterRider}
                      onChange={setColFilterRider}
                      options={riderColOptions}
                      placeholder="بحث بالمندوب..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-start gap-1.5">
                    <span>الشريحة (Segment)</span>
                    <TableHeaderColumnFilter
                      label="الشريحة (Segment)"
                      value={colFilterSegment}
                      onChange={setColFilterSegment}
                      options={segmentColOptions}
                      placeholder="تصفية بالشريحة..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">إجمالي الطلبات</th>
                <th className="px-4 py-3.5 whitespace-nowrap">المكتملة</th>
                <th className="px-4 py-3.5 whitespace-nowrap">في الوقت</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  طلبات التحقق (الناجح / الكلي)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  فاشلة بسبب المندوب
                </th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-sm text-[var(--muted)]"
                  >
                    جارٍ تحميل تقرير الجودة التراكمية...
                  </td>
                </tr>
              ) : filteredQualityRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-sm text-[var(--muted)]"
                  >
                    لا توجد بيانات جودة تراكمية مسجلة لهذا الشهر.
                  </td>
                </tr>
              ) : (
                filteredQualityRows.map((row, idx) => (
                  <tr
                    key={row.sourceId || row.id || idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[var(--foreground)]">
                        {row.externalAccountId ||
                          row.accountName ||
                          "حساب هنقرستيشن"}
                      </div>
                      {row.ownerNameAr && (
                        <div className="text-[11px] text-[var(--muted)]">
                          المالك: {row.ownerNameAr}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-blue-700 dark:text-blue-400">
                      {row.assignedRiderNameAr ||
                        row.assignedRiderNameEn ||
                        "غير معين"}
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge tone={getSegmentBadgeTone(row.segmentCode)}>
                        <Award className="ml-1 inline h-3 w-3" />
                        شريحة {row.segmentCode || "—"}
                        {row.segmentRank ? ` (${row.segmentRank})` : ""}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 font-bold">
                      {row.grossOrders ?? 0}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-emerald-600">
                      {row.completedOrders ?? 0}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-blue-600">
                      {row.completedOrdersInTime ?? 0}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-bold text-teal-600">
                        {row.successfulVerificationRequests ?? 0}
                      </span>{" "}
                      /{" "}
                      <span className="text-[var(--muted)]">
                        {row.totalVerificationRequests ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`font-bold ${
                          Number(row.failedOrdersByRider || 0) > 0
                            ? "text-rose-600"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {row.failedOrdersByRider ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {canImportQuality && (
                        <button
                          type="button"
                          onClick={() => openReallocModal(row)}
                          className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 dark:text-purple-300 transition-colors shadow-xs"
                          title="إعادة احتساب وتوزيع الجودة التراكمية على المناديب حسب فترات التكليف واستخدام اليوم"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: Import Cumulative Quality
         ===================================================================== */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="استيراد ملف الجودة التراكمية الشهرية"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            <ul className="list-inside list-disc space-y-1">
              <li>
                بيانات الجودة <strong>تراكمية لكل حساب + شهر</strong> وليست
                يومية منفصلة.
              </li>
              <li>
                يتم حساب فروقات العدادات التراكمية تلقائيًا وتوزيعها على المناديب
                وفق التتبع والتكليفات، بينما تُحفظ الشريحة (A=1, B=2) كلقطة
                للحساب والشهر.
              </li>
              <li>
                يدعم الاستيراد <strong>القبول الجزئي على مستوى الصف</strong>{" "}
                بحيث تُحفظ الصفوف السليمة وتُعرض أخطاء الصفوف المرفوضة.
              </li>
            </ul>
          </div>

          <DateInput
            label="تاريخ لقطة تقرير الجودة *"
            value={importReportDate}
            onChange={setImportReportDate}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              ملف الجودة التراكمية (Excel) *
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportPreview(null);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs"
            />
          </div>

          {importPreview && (
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs">
              <div className="flex justify-between font-bold">
                <span>إجمالي الصفوف: {importPreview.totalRows ?? 0}</span>
                <span className="text-emerald-600">
                  صالحة للقبول: {importPreview.validRows ?? 0}
                </span>
                <span className="text-rose-600">
                  مرفوضة: {importPreview.failedRows ?? 0}
                </span>
              </div>
              {importPreview.errors && importPreview.errors.length > 0 && (
                <ul className="list-inside list-disc text-rose-600">
                  {importPreview.errors.slice(0, 6).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setImportModalOpen(false)}
              disabled={importBusy}
            >
              إلغاء
            </Button>
            {!importPreview ? (
              <Button
                variant="primary"
                onClick={() => void handlePreviewImport()}
                disabled={!importFile || importBusy}
              >
                {importBusy ? "جارٍ التحليل..." : "معاينة ملف الجودة"}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => void handleConfirmImport()}
                disabled={importBusy}
              >
                {importBusy
                  ? "جارٍ الاعتماد..."
                  : "تأكيد واعتماد الجودة التراكمية"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 2: Reallocate Quality
         ===================================================================== */}
      <Modal
        isOpen={reallocModalOpen}
        onClose={() => setReallocModalOpen(false)}
        title={`إعادة توزيع الجودة التراكمية — ${reallocRow?.externalAccountId || reallocRow?.accountName || ""}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)]">
            تُستخدم إعادة التوزيع عند تعديل فترات تكليف المناديب أو تحديث نسب
            استخدام اليوم المشترك بعد رفع ملف الجودة التراكمية، ليتم إعادة
            توزيع الفروقات التراكمية بدقة.
          </p>

          <Input
            label="سبب إعادة التوزيع *"
            value={reallocReason}
            onChange={(e) => setReallocReason(e.target.value)}
            placeholder="مثال: تحديث تكليف الحساب وتوزيع اليوم المشترك بين المندوبين..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setReallocModalOpen(false)}
              disabled={reallocBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleConfirmReallocate()}
              disabled={reallocBusy}
            >
              {reallocBusy ? "جارٍ إعادة التوزيع..." : "تأكيد إعادة التوزيع"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
