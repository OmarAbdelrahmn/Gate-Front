// src/app/admin/chefz/performance/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getChefzPlatform,
  getChefzPerformance,
  uploadChefzPerformance,
  getRiyadhTodayDate,
} from "@/lib/chefz/api";
import type {
  ChefzPerformance,
  ChefzImportResult,
  ChefzImportIssue,
} from "@/lib/chefz/types";
import {
  getPlatformAccounts,
  type AccountResponse,
  type PlatformResponse,
} from "@/lib/platforms/api";
import { listRiders } from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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
  FileText,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";

export default function ChefzPerformancePage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Data states
  const [platform, setPlatform] = useState<PlatformResponse | null>(null);
  const [performanceRecords, setPerformanceRecords] = useState<ChefzPerformance[]>([]);
  const [baseAccounts, setBaseAccounts] = useState<AccountResponse[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filters (from is required)
  const todayStr = useMemo(() => getRiyadhTodayDate(), []);
  const defaultFromStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // Last 14 days by default
    return d.toISOString().split("T")[0];
  }, []);

  const [filterFrom, setFilterFrom] = useState(defaultFromStr);
  const [filterTo, setFilterTo] = useState(todayStr);
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterRiderId, setFilterRiderId] = useState("");

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadDate, setUploadDate] = useState(todayStr);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ChefzImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load platform & filter lookups
  const loadLookups = async () => {
    try {
      const plat = await getChefzPlatform();
      setPlatform(plat);
      if (plat) {
        const [accs, riderList] = await Promise.all([
          getPlatformAccounts({ platformId: plat.id, includeArchived: false }).catch(() => []),
          listRiders().catch(() => []),
        ]);
        setBaseAccounts(accs);
        setRiders(riderList);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  // Load Performance records
  const loadPerformance = async () => {
    if (!filterFrom || !filterTo) return;
    setLoading(true);
    try {
      const res = await getChefzPerformance({
        from: filterFrom,
        to: filterTo,
        accountId: filterAccountId || undefined,
        riderId: filterRiderId || undefined,
        page,
        pageSize,
      });
      setPerformanceRecords(res.items || []);
    } catch (err: unknown) {
      toast.error("خطأ", "تعذر تحميل بيانات الأداء اليومي.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, [filterFrom, filterTo, filterAccountId, filterRiderId, page]);

  // Lookup maps
  const baseAccountMap = useMemo(() => {
    const map = new Map<string, AccountResponse>();
    for (const a of baseAccounts) map.set(a.id, a);
    return map;
  }, [baseAccounts]);

  const riderMap = useMemo(() => {
    const map = new Map<string, Rider>();
    for (const r of riders) map.set(r.id, r);
    return map;
  }, [riders]);

  // Handle Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadDate) return;

    if (uploadDate > todayStr) {
      setUploadError("تاريخ التقرير لا يمكن أن يكون في المستقبل.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError("حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت).");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = await uploadChefzPerformance(selectedFile, uploadDate);
      setUploadResult(res);

      if (res.issues && res.issues.length > 0) {
        // Validation issues - nothing saved
        // Keep dialog open, user will see issues table
      } else if (res.importedRows > 0) {
        toast.success("تم بنجاح", `تم حفظ أداء ${res.importedRows} حساباً بنجاح.`);
        // Set date filter to uploaded date and refresh
        setFilterFrom(uploadDate);
        setFilterTo(uploadDate);
        loadPerformance();
      } else if (res.skippedRows > 0) {
        // Replay / identical data
        toast.info("تنبيه", `البيانات محفوظة سابقاً؛ تم تخطي ${res.skippedRows} صفاً مكرراً.`);
      }
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string; message?: string }; message?: string };
      setUploadError(e?.details?.detail || e?.details?.message || e?.message || "تعذر استيراد ملف التقرير.");
    } finally {
      setUploading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportToExcel({
      filename: `chefz-performance-${filterFrom}-to-${filterTo}`,
      sheetName: "Daily Performance",
      data: performanceRecords,
      columns: [
        { header: "التاريخ", accessor: (p) => p.reportDate, isText: true },
        {
          header: "كود الحساب",
          accessor: (p) => baseAccountMap.get(p.accountId)?.code || p.accountId,
          isText: true,
        },
        {
          header: "المعرف الخارجي",
          accessor: (p) => baseAccountMap.get(p.accountId)?.externalAccountId || "—",
          isText: true,
        },
        {
          header: "المندوب الفعلي",
          accessor: (p) => riderMap.get(p.riderProfileId)?.fullNameAr || "مندوب سابق",
        },
        { header: "رقم الهوية بالتقرير", accessor: (p) => p.reportIdNumber, isText: true },
        { header: "إجمالي الطلبات الصالحة", accessor: (p) => p.totalValidOffers },
        { header: "الطلبات المقبولة", accessor: (p) => p.acceptedOffers },
        { header: "الطلبات المرفوضة", accessor: (p) => p.declinedOffers },
        { header: "الطلبات الفائتة", accessor: (p) => p.missedOffers },
        { header: "نسبة القبول (%)", accessor: (p) => `${p.acceptanceRate}%` },
      ],
    });
  };

  if (!can("chefz.read")) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <ShieldAlert className="mx-auto mb-3 text-red-500" size={32} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">لا توجد صلاحية للوصول</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            ليس لديك الصلاحية الكافية لعرض تقارير أداء شيفز (chefz.read).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              الأداء اليومي لمنصة شيفز
            </h1>
            <Badge tone="blue">تقارير الإكسل</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            استعراض إحصائيات الطلبات اليومية المستوردة (الصالحة، المقبولة، المرفوضة، الفائتة، ونسبة القبول) لكل حساب ومندوب.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadPerformance}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={loading || performanceRecords.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير إكسل
          </Button>

          {can("chefz.performance.import") && (
            <Button
              onClick={() => {
                setIsUploadOpen(true);
                setSelectedFile(null);
                setUploadResult(null);
                setUploadError(null);
              }}
              className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
            >
              <Upload className="h-4 w-4" />
              رفع تقرير الأداء
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* From Date */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              من تاريخ <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              إلى تاريخ <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            />
          </div>

          {/* Account Filter */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">الحساب</label>
            <SearchableSelect
              value={filterAccountId}
              onChange={setFilterAccountId}
              options={[
                { value: "", label: "جميع حسابات شيفز" },
                ...baseAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.code} ${a.externalAccountId ? `(${a.externalAccountId})` : ""}`,
                  keywords: `${a.code} ${a.externalAccountId || ""}`,
                })),
              ]}
              placeholder="اختر الحساب..."
            />
          </div>

          {/* Rider Filter */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">المندوب الفعلي</label>
            <SearchableSelect
              value={filterRiderId}
              onChange={setFilterRiderId}
              options={[
                { value: "", label: "جميع المناديب" },
                ...riders.map((r) => ({
                  value: r.id,
                  label: `${r.fullNameAr} (${r.iqamaNo || "بدون إقامة"})`,
                  keywords: `${r.fullNameAr} ${r.iqamaNo || ""}`,
                })),
              ]}
              placeholder="اختر المندوب..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--muted)] border-t border-[var(--border)] pt-3">
          <span>
            سجلات الأداء في الفترة المحددة:{" "}
            <strong className="text-[var(--foreground)]">{performanceRecords.length}</strong>
          </span>
          {(filterAccountId || filterRiderId || filterFrom !== defaultFromStr || filterTo !== todayStr) && (
            <button
              onClick={() => {
                setFilterAccountId("");
                setFilterRiderId("");
                setFilterFrom(defaultFromStr);
                setFilterTo(todayStr);
              }}
              className="text-[var(--brand)] hover:underline font-semibold"
            >
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Performance Records Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3.5">تاريخ التقرير</th>
                <th className="px-4 py-3.5">الحساب</th>
                <th className="px-4 py-3.5">المندوب الفعلي التاريخي</th>
                <th className="px-4 py-3.5">رقم الهوية بالتقرير</th>
                <th className="px-4 py-3.5 text-center">إجمالي الطلبات الصالحة</th>
                <th className="px-4 py-3.5 text-center">الطلبات المقبولة</th>
                <th className="px-4 py-3.5 text-center">الطلبات المرفوضة</th>
                <th className="px-4 py-3.5 text-center">الطلبات الفائتة</th>
                <th className="px-4 py-3.5 text-center">نسبة القبول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-[var(--muted)]">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--brand)]" />
                    جارٍ تحميل سجلات الأداء اليومي...
                  </td>
                </tr>
              ) : performanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-[var(--muted)]">
                    لا توجد بيانات أداء مستوردة في نطاق التواريخ المحدد.
                  </td>
                </tr>
              ) : (
                performanceRecords.map((p) => {
                  const acc = baseAccountMap.get(p.accountId);
                  const rider = riderMap.get(p.riderProfileId);

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-[var(--table-row-hover)]"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 font-semibold font-mono text-[var(--foreground)]" dir="ltr">
                        {p.reportDate}
                      </td>

                      {/* Account */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/chefz/accounts/${p.accountId}`}
                          className="font-bold text-[var(--brand)] hover:underline"
                        >
                          {acc?.code || p.accountId.slice(0, 8)}
                        </Link>
                        {acc?.externalAccountId && (
                          <div className="text-xs text-[var(--muted)]" dir="ltr">
                            {acc.externalAccountId}
                          </div>
                        )}
                      </td>

                      {/* Actual Rider */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--foreground)]">
                          {rider?.fullNameAr || "مندوب سابق"}
                        </div>
                      </td>

                      {/* Report Id Number */}
                      <td className="px-4 py-3 font-mono text-xs font-semibold" dir="ltr">
                        {p.reportIdNumber}
                      </td>

                      {/* Total Valid Offers */}
                      <td className="px-4 py-3 text-center font-bold" dir="ltr">
                        {p.totalValidOffers.toLocaleString()}
                      </td>

                      {/* Accepted */}
                      <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                        {p.acceptedOffers.toLocaleString()}
                      </td>

                      {/* Declined */}
                      <td className="px-4 py-3 text-center font-bold text-red-600 dark:text-red-400" dir="ltr">
                        {p.declinedOffers.toLocaleString()}
                      </td>

                      {/* Missed */}
                      <td className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400" dir="ltr">
                        {p.missedOffers.toLocaleString()}
                      </td>

                      {/* Acceptance Rate (Directly as 66.67%) */}
                      <td className="px-4 py-3 text-center font-extrabold" dir="ltr">
                        <span
                          className={`inline-block rounded-lg px-2 py-1 text-xs ${
                            p.acceptanceRate >= 80
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : p.acceptanceRate >= 60
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                          }`}
                        >
                          {p.acceptanceRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Upload Dialog                                                 */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="استيراد ورفع تقرير أداء شيفز اليومي"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleUpload} className="space-y-5" dir="rtl">
          {uploadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            </div>
          )}

          {/* Report Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              تاريخ التقرير <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={uploadDate}
              onChange={(e) => setUploadDate(e.target.value)}
              max={todayStr}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            />
            <p className="text-xs text-[var(--muted)]">
              لا يحتوي ملف شيفز على عمود للتاريخ؛ يطبق هذا التاريخ على كافة صفوف الملف.
            </p>
          </div>

          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              ملف تقرير الأداء (.xlsx) <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-2xl border-2 border-dashed border-[var(--border)] p-6 text-center hover:border-[var(--brand)] transition-colors">
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="mx-auto h-10 w-10 text-[var(--muted)]" />
              {selectedFile ? (
                <div className="mt-2 text-xs">
                  <p className="font-bold text-[var(--foreground)]">{selectedFile.name}</p>
                  <p className="text-[var(--muted)]" dir="ltr">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="mt-2 text-xs text-[var(--muted)]">
                  <span className="font-semibold text-[var(--brand)]">اضغط لاختيار ملف الإكسل</span> أو اسحبه هنا
                  <p className="mt-1 text-[11px]">الملفات المدعومة: .xlsx فقط (حد أقصى 10 ميجابايت)</p>
                </div>
              )}
            </div>
          </div>

          {/* Import Result State 1: Success */}
          {uploadResult && uploadResult.issues.length === 0 && uploadResult.importedRows > 0 && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="font-bold text-sm">
                  تم حفظ أداء {uploadResult.importedRows} حساباً بنجاح!
                </span>
              </div>
              {uploadResult.skippedRows > 0 && (
                <p className="mt-1 text-[11px]">
                  (تم تخطي {uploadResult.skippedRows} صفاً مكرراً محفوظاً مسبقاً)
                </p>
              )}
            </div>
          )}

          {/* Import Result State 2: Skipped / Replay */}
          {uploadResult &&
            uploadResult.issues.length === 0 &&
            uploadResult.importedRows === 0 &&
            uploadResult.skippedRows > 0 && (
              <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="font-bold text-sm">
                    البيانات محفوظة سابقاً؛ لا توجد صفوف جديدة.
                  </span>
                </div>
                <p className="mt-1 text-[11px]">
                  تم تخطي {uploadResult.skippedRows} صفاً لكونها مطابقة تماماً لما تم استيراده سابقاً لنفس التاريخ.
                </p>
              </div>
            )}

          {/* Import Result State 3: Issues / Blocking Validation */}
          {uploadResult && uploadResult.issues.length > 0 && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3 dark:border-red-900/50 dark:bg-red-950/40">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                <span className="font-bold text-sm">
                  لم يتم حفظ أي صف بسبب وجود ملاحظات في الملف ({uploadResult.issues.length} ملاحظة)
                </span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">
                يرجى معالجة الملاحظات الموضحة أدناه وإعادة المحاولة.
              </p>

              <div className="max-h-52 overflow-y-auto rounded-lg border border-red-200 bg-white dark:bg-slate-900 text-xs">
                <table className="w-full text-right">
                  <thead className="bg-red-50 dark:bg-slate-800 font-bold border-b border-red-200 text-red-900 dark:text-red-300">
                    <tr>
                      <th className="p-2">الصف</th>
                      <th className="p-2">رقم الهوية</th>
                      <th className="p-2">سبب التعذر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-slate-800">
                    {uploadResult.issues.map((iss, idx) => (
                      <tr key={idx} className="hover:bg-red-50/50">
                        <td className="p-2 font-mono" dir="ltr">
                          {iss.rowNumber === 0 ? "الملف" : `صف ${iss.rowNumber}`}
                        </td>
                        <td className="p-2 font-mono" dir="ltr">
                          {iss.idNumber || "—"}
                        </td>
                        <td className="p-2 text-red-700 dark:text-red-300">{iss.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUploadOpen(false)}
              disabled={uploading}
            >
              إغلاق
            </Button>
            <Button
              type="submit"
              disabled={uploading || !selectedFile}
              className="bg-[var(--brand)] text-white hover:opacity-90 min-w-[140px]"
            >
              {uploading ? "جارٍ التحقق والاستيراد..." : "رفع واستيراد التقرير"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
