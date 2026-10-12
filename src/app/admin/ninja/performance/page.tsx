// src/app/admin/ninja/performance/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getNinjaPerformance,
  importNinjaPerformance,
  getAllNinjaAccounts,
  getRiyadhTodayDate,
  type NinjaPerformanceResponse,
  type NinjaAccountResponse,
  type NinjaImportResponse,
  type NinjaImportIssue,
} from "@/lib/ninja/api";
import { listRiders } from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
  ExternalLink,
  Zap,
} from "lucide-react";

export default function NinjaPerformancePage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const canRead = can("platform_accounts.read");
  const canImport = can("platform_accounts.update");

  const todayRiyadh = useMemo(() => getRiyadhTodayDate(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // Last 14 days default
    return d.toISOString().split("T")[0];
  }, []);

  // Filter States
  const [filterFrom, setFilterFrom] = useState(defaultFrom);
  const [filterTo, setFilterTo] = useState(todayRiyadh);
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterRiderId, setFilterRiderId] = useState("");

  // Data States
  const [records, setRecords] = useState<NinjaPerformanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Lookups
  const [accounts, setAccounts] = useState<NinjaAccountResponse[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);

  // Pagination (no totalCount from server)
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [hasMore, setHasMore] = useState(false);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadDate, setUploadDate] = useState(todayRiyadh);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<NinjaImportResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load lookups (accounts and riders)
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

  useEffect(() => {
    loadLookups();
  }, []);

  // Rider map
  const riderMap = useMemo(() => {
    const map = new Map<string, Rider>();
    for (const r of riders) {
      map.set(r.id, r);
    }
    return map;
  }, [riders]);

  // Load performance records
  const loadPerformance = async (targetPage = page) => {
    if (!canRead || !filterFrom || !filterTo) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getNinjaPerformance({
        from: filterFrom,
        to: filterTo,
        accountId: filterAccountId || undefined,
        riderId: filterRiderId || undefined,
        page: targetPage,
        pageSize,
      });

      const items = res?.items || [];
      setRecords(items);
      setHasMore(items.length >= pageSize);
    } catch (err: any) {
      console.error("Failed to load Ninja performance records", err);
      const msg = err?.message || "تعذر تحميل بيانات الأداء اليومي لمنصة نينجا.";
      setFetchError(msg);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadPerformance(1);
  }, [filterFrom, filterTo, filterAccountId, filterRiderId]);

  useEffect(() => {
    loadPerformance(page);
  }, [page]);

  // Summary Metrics on current view
  const metrics = useMemo(() => {
    let orders = 0;
    let hours = 0;
    for (const r of records) {
      orders += r.totalOrders || 0;
      hours += Number(r.totalWorkingHours) || 0;
    }
    return {
      count: records.length,
      orders,
      hours: Number(hours.toFixed(2)),
    };
  }, [records]);

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
        // All-or-nothing rejection: render issue table, do not toast success!
        toast.error("تنبيه الاستيراد", `لم يتم حفظ أي صف بسبب وجود ${outcome.issues.length} ملاحظة.`);
      } else if (outcome.importedRows === 0 && outcome.skippedRows > 0) {
        toast.info("بيانات مكررة", "تم استيراد كافة صفوف هذا اليوم سابقاً (تطابق تام).");
        // Reload if current filters cover this date
        if (filterFrom <= uploadDate && filterTo >= uploadDate) {
          loadPerformance(page);
        }
      } else {
        toast.success(
          "تم الاستيراد بنجاح",
          `تم حفظ أداء ${outcome.importedRows} كابتن بنجاح${
            outcome.skippedRows > 0 ? ` (وتخطي ${outcome.skippedRows} مكرر)` : ""
          }.`
        );
        // Automatically switch filter range to inspect the uploaded date
        setFilterFrom(uploadDate);
        setFilterTo(uploadDate);
        loadPerformance(1);
      }
    } catch (err: any) {
      console.error("Upload error", err);
      const msg = err?.message || "تعذر معالجة أو رفع ملف الأداء اليومي.";
      setUploadError(msg);
      toast.error("خطأ", msg);
    } finally {
      setUploading(false);
    }
  };

  // Export
  const handleExport = () => {
    exportToExcel({
      filename: `ninja-performance-${filterFrom}-to-${filterTo}`,
      sheetName: "الأداء اليومي نينجا",
      data: records,
      columns: [
        { header: "تاريخ التقرير", accessor: (r) => r.reportDate, isText: true },
        { header: "كابتن ID", accessor: (r) => r.captainId, isText: true },
        {
          header: "المندوب الفعلي",
          accessor: (r) => {
            const rider = riderMap.get(r.riderProfileId);
            return rider ? rider.fullNameAr || rider.fullNameEn : "—";
          },
        },
        { header: "إجمالي الطلبات", accessor: (r) => r.totalOrders },
        {
          header: "إجمالي ساعات العمل",
          accessor: (r) => Number(r.totalWorkingHours).toFixed(2),
        },
      ],
    });
  };

  return (
    <div className="space-y-6" dir={isEn ? "ltr" : "rtl"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <Link href="/admin" className="hover:text-[var(--foreground)]">
              {t("nav.dashboard") || "لوحة التحكم"}
            </Link>
            <span>/</span>
            <Link href="/admin/ninja/accounts" className="hover:text-[var(--foreground)]">
              إدارة نينجا
            </Link>
            <span>/</span>
            <span className="font-semibold text-[var(--foreground)]">الأداء اليومي</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                الأداء اليومي لكباتن نينجا (Ninja Performance)
              </h1>
              <p className="text-xs text-[var(--muted)]">
                متابعة عدد الطلبات وساعات العمل اليومية وربطها بالمندوب الفعلي لكل يوم.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => loadPerformance(page)}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={records.length === 0}
            className="gap-2 text-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            تصدير إكسل
          </Button>

          {canImport && (
            <Button
              onClick={() => {
                setUploadResult(null);
                setUploadError(null);
                setUploadFile(null);
                setIsUploadOpen(true);
              }}
              className="gap-2 bg-purple-600 text-white hover:bg-purple-700 text-xs shadow-sm shadow-purple-600/30"
            >
              <Upload className="h-4 w-4" />
              رفع ملف الأداء اليومي (.xlsx)
            </Button>
          )}
        </div>
      </div>

      {/* Upload Rules Notice */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-purple-900 dark:text-purple-200">
              شروط وأعمدة استيراد ملف أداء نينجا (Performance Import Headers)
            </p>
            <p className="text-purple-800 dark:text-purple-300">
              يجب أن يحتوي ملف الإكسل في الصف الأول على الأعمدة الإلزامية:{" "}
              <code className="font-bold font-mono">Captain ID</code> و{" "}
              <code className="font-bold font-mono">Total Orders</code> و{" "}
              <code className="font-bold font-mono">Total Working Hours</code>. يتم تجميد attribution للمندوب
              الفعلي المعين في ذلك اليوم تحديداً. لا يتم استنتاج تاريخ التقرير من اسم الملف.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>عدد السجلات في الصفحة</span>
            <User className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-[var(--foreground)]">
            {metrics.count.toLocaleString()}
          </p>
          <span className="text-[11px] text-[var(--muted)]">سجل يومي معروض</span>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>إجمالي الطلبات (الصفحة الحالية)</span>
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {metrics.orders.toLocaleString()}
          </p>
          <span className="text-[11px] text-[var(--muted)]">
            (مجموع الصفحة — لا يمثل إجمالي الفترة كاملاً حتى اكتمال كافة الصفحات)
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>إجمالي ساعات العمل (الصفحة الحالية)</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {metrics.hours.toLocaleString()} ساعة
          </p>
          <span className="text-[11px] text-[var(--muted)]">ساعات العمل التشغيلية</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              من تاريخ (شامل) <span className="text-red-500">*</span>
            </label>
            <DateInput value={filterFrom} onChange={setFilterFrom} max={todayRiyadh} required />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              إلى تاريخ (شامل) <span className="text-red-500">*</span>
            </label>
            <DateInput value={filterTo} onChange={setFilterTo} max={todayRiyadh} required />
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              حساب الكابتن (Captain ID)
            </label>
            <SearchableSelect
              options={[
                { value: "", label: "كافة الحسابات" },
                ...accounts.map((a) => ({
                  value: a.id,
                  label: `${a.captainId} ${a.actualRiderNameAr ? `(${a.actualRiderNameAr})` : ""}`,
                })),
              ]}
              value={filterAccountId}
              onChange={setFilterAccountId}
              placeholder="اختر حساب الكابتن..."
            />
          </div>

          {/* Actual Rider Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              المندوب الفعلي (المسجل باليوم)
            </label>
            <SearchableSelect
              options={[
                { value: "", label: "كافة المناديب" },
                ...riders.map((r) => ({
                  value: r.id,
                  label: `${r.fullNameAr || r.fullNameEn} (${r.iqamaNo || r.employeeId})`,
                })),
              ]}
              value={filterRiderId}
              onChange={setFilterRiderId}
              placeholder="اختر المندوب..."
            />
          </div>
        </div>
      </div>

      {/* Performance Records Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[var(--subtle-bg)] border-b border-[var(--border)] text-[var(--muted)] font-bold">
              <tr>
                <th className="px-4 py-3.5">تاريخ التقرير</th>
                <th className="px-4 py-3.5">كابتن ID</th>
                <th className="px-4 py-3.5">المندوب الفعلي (Actual Rider)</th>
                <th className="px-4 py-3.5 text-center">إجمالي الطلبات</th>
                <th className="px-4 py-3.5 text-center">ساعات العمل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-[var(--muted)]">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
                    جارٍ تحميل سجلات الأداء...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 mb-3">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-[var(--foreground)]">لا توجد بيانات أداء في الفترة المحددة</p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      يمكنك رفع ملف أداء يومي جديد بصيغة .xlsx لمطابقة كباتن نينجا مع المناديب.
                    </p>
                    {canImport && (
                      <Button
                        onClick={() => {
                          setUploadResult(null);
                          setUploadError(null);
                          setUploadFile(null);
                          setIsUploadOpen(true);
                        }}
                        className="mt-4 gap-2 bg-purple-600 text-white hover:bg-purple-700 text-xs"
                      >
                        <Upload className="h-4 w-4" />
                        رفع تقرير أداء
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const rider = riderMap.get(r.riderProfileId);

                  return (
                    <tr key={r.id} className="hover:bg-[var(--subtle-bg)]/50 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 font-mono font-medium" dir="ltr">
                        {r.reportDate}
                      </td>

                      {/* Captain ID */}
                      <td className="px-4 py-3 font-mono font-bold text-sm text-[var(--foreground)]" dir="ltr">
                        {r.captainId}
                      </td>

                      {/* Actual Rider Name */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-purple-700 dark:text-purple-300">
                          {rider ? rider.fullNameAr || rider.fullNameEn : "مندوب معين"}
                        </div>
                        {(rider?.iqamaNo || rider?.employeeId) && (
                          <div className="text-[11px] font-mono text-[var(--muted)]" dir="ltr">
                            {rider.iqamaNo ? `Iqama: ${rider.iqamaNo}` : `ID: ${rider.employeeId}`}
                          </div>
                        )}
                      </td>

                      {/* Total Orders */}
                      <td className="px-4 py-3 text-center font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400" dir="ltr">
                        {r.totalOrders.toLocaleString()}
                      </td>

                      {/* Working Hours */}
                      <td className="px-4 py-3 text-center font-bold font-mono text-sm text-blue-600 dark:text-blue-400" dir="ltr">
                        {Number(r.totalWorkingHours).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 bg-[var(--subtle-bg)]/40 text-xs">
          <div className="text-[var(--muted)]">
            صفحة <span className="font-bold text-[var(--foreground)]">{page}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs"
            >
              الصفحة السابقة
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs"
            >
              الصفحة التالية
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Upload Modal                                                  */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="استيراد ورفع تقرير أداء نينجا اليومي (.xlsx)"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleUpload} className="space-y-4" dir="rtl">
          {uploadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              تاريخ التقرير <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={uploadDate}
              onChange={setUploadDate}
              max={todayRiyadh}
              required
            />
            <p className="text-[11px] text-[var(--muted)]">
              ملفات نينجا لا تحتوي على عمود للتاريخ؛ يجب تحديد تاريخ اليوم التشغيلي بدقة (أقصاه اليوم بتوقيت الرياض).
            </p>
          </div>

          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              ملف الإكسل (.xlsx) <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-2xl border-2 border-dashed border-[var(--border)] p-6 text-center hover:border-purple-600 transition-colors">
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="mx-auto h-10 w-10 text-[var(--muted)]" />
              {uploadFile ? (
                <div className="mt-2 text-xs">
                  <p className="font-bold text-[var(--foreground)]">{uploadFile.name}</p>
                  <p className="text-[var(--muted)]" dir="ltr">
                    {(uploadFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="mt-2 text-xs text-[var(--muted)]">
                  <span className="font-semibold text-purple-600">اضغط لاختيار ملف الإكسل</span> أو اسحبه هنا
                  <p className="mt-1 text-[11px]">الأعمدة المطلوبة: Captain ID, Total Orders, Total Working Hours</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Result Feedback */}
          {uploadResult && uploadResult.issues.length === 0 && uploadResult.importedRows > 0 && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="font-bold text-sm">
                  تم حفظ أداء {uploadResult.importedRows} كابتن بنجاح!
                </span>
              </div>
              {uploadResult.skippedRows > 0 && (
                <p className="mt-1 text-[11px]">
                  (تم تخطي {uploadResult.skippedRows} صفاً مكرراً محفوظاً مسبقاً)
                </p>
              )}
            </div>
          )}

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
                  تم تخطي {uploadResult.skippedRows} صفاً لكونها مطابقة تماماً لما تم استيراده مسبقاً لنفس التاريخ.
                </p>
              </div>
            )}

          {/* All-or-nothing Issues Table */}
          {uploadResult && uploadResult.issues.length > 0 && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3 dark:border-red-900/50 dark:bg-red-950/40">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                <span className="font-bold text-sm">
                  لم يتم حفظ أي صف بسبب وجود ملاحظات في الملف ({uploadResult.issues.length} ملاحظة)
                </span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">
                الاستيراد يعمل بمبدأ الكل أو لا شيء (All-or-nothing). يرجى تصحيح الملاحظات وإعادة رفع الملف.
              </p>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-red-200 bg-white dark:bg-slate-900 text-xs">
                <table className="w-full text-right">
                  <thead className="bg-red-50 dark:bg-slate-800 font-bold border-b border-red-200 text-red-900 dark:text-red-300">
                    <tr>
                      <th className="p-2">رقم الصف</th>
                      <th className="p-2">كابتن ID</th>
                      <th className="p-2">سبب التعذر / الخطأ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-slate-800">
                    {uploadResult.issues.map((iss, idx) => (
                      <tr key={idx} className="hover:bg-red-50/50">
                        <td className="p-2 font-mono" dir="ltr">
                          {iss.rowNumber === 0 ? "الملف" : `صف ${iss.rowNumber}`}
                        </td>
                        <td className="p-2 font-mono font-bold" dir="ltr">
                          {iss.captainId || "—"}
                        </td>
                        <td className="p-2 text-red-700 dark:text-red-300 font-medium">{iss.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              disabled={uploading || !uploadFile}
              className="bg-purple-600 text-white hover:bg-purple-700 min-w-[140px]"
            >
              {uploading ? "جارٍ التحقق والاستيراد..." : "رفع واستيراد التقرير"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
