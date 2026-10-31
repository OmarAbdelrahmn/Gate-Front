// src/app/admin/jahez/statistics/page.tsx
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getJahezStatistics,
  getJahezAdministrativeDebts,
  getAllJahezAdministrativeDebts,
  getJahezImports,
  getJahezImportPreview,
  commitJahezImport,
  uploadJahezImport,
  downloadJahezImportFile,
  getRiyadhTodayDate,
} from "@/lib/jahez/api";
import {
  ImportKind,
  type Statistics,
  type AdministrativeDebt,
  type ImportBatch,
  type ImportPreview,
} from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  Building2,
  Users,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  TrendingUp,
  Check,
  Eye,
  Info,
  Coins,
  X,
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  RotateCcw,
} from "lucide-react";
import { JahezProfitReportTab } from "@/components/jahez/JahezProfitReportTab";

export default function JahezStatisticsAndReportsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [activeTab, setActiveTab] = useState<"sponsors" | "adminDebts" | "imports" | "profit">(
    "sponsors",
  );

  // Data states
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [adminDebts, setAdminDebts] = useState<AdministrativeDebt[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadKind, setUploadKind] = useState<ImportKind>(ImportKind.DailyOrders);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replacesBatchId, setReplacesBatchId] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<ImportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitSubmitting, setCommitSubmitting] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [debtSortOrder, setDebtSortOrder] = useState<"none" | "desc" | "asc">("none");
  const [debtTypeFilter, setDebtTypeFilter] = useState<"ALL" | "POSITIVE" | "ZERO" | "NEGATIVE">("ALL");
  const [isDebtFilterMenuOpen, setIsDebtFilterMenuOpen] = useState(false);
  const debtFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (debtFilterRef.current && !debtFilterRef.current.contains(e.target as Node)) {
        setIsDebtFilterMenuOpen(false);
      }
    }
    if (isDebtFilterMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDebtFilterMenuOpen]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statRes, debtRes, impRes] = await Promise.allSettled([
        getJahezStatistics(),
        getAllJahezAdministrativeDebts(100),
        getJahezImports(1, 50),
      ]);

      if (statRes.status === "fulfilled") setStatistics(statRes.value);
      if (debtRes.status === "fulfilled") {
        const rawItems = debtRes.value.items || [];
        const adjustedItems = rawItems.map((d) => {
          const val = Number(d.platformDebt) || 0;
          const inverted = val === 0 ? 0 : -val;
          return {
            ...d,
            platformDebt: Object.is(inverted, -0) || inverted === 0 ? 0 : inverted,
          };
        });
        setAdminDebts(adjustedItems);
      }
      if (impRes.status === "fulfilled") setImportBatches(impRes.value.items || []);
    } catch {
      toast.error("خطأ", "تعذر جلب التقارير والإحصائيات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Upload handler
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning("تنبيه", "يرجى اختيار ملف إكسل واحد على الأقل");
      return;
    }
    setUploadSubmitting(true);
    try {
      const preview = await uploadJahezImport(
        uploadKind,
        selectedFiles,
        replacesBatchId.trim() || undefined,
        correctionReason.trim() || undefined,
      );
      toast.success("تم الرفع", `تم رفع الدفعة #${preview.batchId.slice(0, 8)} بنجاح`);
      setIsUploadOpen(false);
      setSelectedFiles([]);
      loadAll();

      // Open preview right away
      setSelectedPreview(preview);
      setIsPreviewOpen(true);
    } catch (err: unknown) {
      toast.error("فشل الرفع", err instanceof Error ? err.message : "خطأ أثناء رفع الملفات");
    } finally {
      setUploadSubmitting(false);
    }
  };

  // Preview details handler
  const openBatchPreview = async (batchId: string) => {
    setPreviewLoading(true);
    setIsPreviewOpen(true);
    try {
      const p = await getJahezImportPreview(batchId);
      setSelectedPreview(p);
    } catch (err: unknown) {
      toast.error("خطأ", "تعذر جلب تفاصيل المعاينة");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Commit handler
  const handleCommit = async (batchId: string) => {
    setCommitSubmitting(true);
    try {
      await commitJahezImport(batchId, {
        allocations: selectedPreview?.resolvedAllocations ?? [],
      });
      toast.success("تم الاعتماد", "تم اعتماد وتحديث بيانات الدفعة في النظام بنجاح");
      setIsPreviewOpen(false);
      loadAll();
    } catch (err: unknown) {
      toast.error("فشل الاعتماد", err instanceof Error ? err.message : "تعذر اعتماد الاستيراد");
    } finally {
      setCommitSubmitting(false);
    }
  };

  // File download handler
  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const res = await downloadJahezImportFile(fileId);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName || fileName || "jahez-file.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error("خطأ", "تعذر تحميل الملف الأصلي");
    }
  };

  // Filtered lists
  const filteredSponsors = (statistics?.sponsors || []).filter((s) => {
    if (!search.trim()) return true;
    return s.nameAr?.toLowerCase().includes(search.trim().toLowerCase());
  });

  const filteredAdminDebts = useMemo(() => {
    let list = adminDebts.filter((d) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesSearch =
          Boolean(d.externalAccountId && String(d.externalAccountId).toLowerCase().includes(q)) ||
          Boolean(d.riderNameAr && String(d.riderNameAr).toLowerCase().includes(q)) ||
          Boolean(d.riderProfileId && String(d.riderProfileId).toLowerCase().includes(q)) ||
          Boolean(d.handoverId && String(d.handoverId).toLowerCase().includes(q)) ||
          Boolean(d.accountId && String(d.accountId).toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      const debt = Number(d.platformDebt) || 0;
      if (debtTypeFilter === "POSITIVE" && debt <= 0) return false;
      if (debtTypeFilter === "ZERO" && debt !== 0) return false;
      if (debtTypeFilter === "NEGATIVE" && debt >= 0) return false;

      return true;
    });

    if (debtSortOrder === "desc") {
      list = [...list].sort((a, b) => (Number(b.platformDebt) || 0) - (Number(a.platformDebt) || 0));
    } else if (debtSortOrder === "asc") {
      list = [...list].sort((a, b) => (Number(a.platformDebt) || 0) - (Number(b.platformDebt) || 0));
    }

    return list;
  }, [adminDebts, search, debtSortOrder, debtTypeFilter]);


  const totalAdminDebt = useMemo(() => {
    return adminDebts.reduce((sum, d) => sum + (Number(d.platformDebt) || 0), 0);
  }, [adminDebts]);

  const filteredAdminDebtTotal = useMemo(() => {
    return filteredAdminDebts.reduce((sum, d) => sum + (Number(d.platformDebt) || 0), 0);
  }, [filteredAdminDebts]);

  const uniqueRidersCount = useMemo(() => {
    return new Set(adminDebts.map((d) => d.riderProfileId || d.riderNameAr).filter(Boolean)).size;
  }, [adminDebts]);

  const handleExportAdminDebts = async () => {
    if (filteredAdminDebts.length === 0) {
      toast.warning("تنبيه", "لا توجد بيانات لتصديرها");
      return;
    }
    try {
      await exportToExcel({
        filename: `jahez-admin-debts-${getRiyadhTodayDate()}`,
        sheetName: "المديونية الإدارية",
        data: filteredAdminDebts,
        columns: [
          { header: "رقم الحساب", accessor: (d) => d.externalAccountId || "-", isText: true },
          { header: "المندوب الفعلي", accessor: (d) => d.riderNameAr || "-", isText: true },
          { header: "معرف المندوب", accessor: (d) => d.riderProfileId || "-", isText: true },
          { header: "معرف فترة التسليم", accessor: (d) => d.handoverId || "-", isText: true },
          { header: "مديونية المنصة (ر.س)", accessor: (d) => Number(d.platformDebt) || 0 },
        ],
      });
      toast.success("تم التصدير", `تم تصدير ${filteredAdminDebts.length} سجل بنجاح`);
    } catch {
      toast.error("خطأ", "تعذر تصدير ملف الإكسل");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              الإحصائيات والتقارير والاستيراد
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              إحصائيات الكفلاء، المديونية الإدارية للرقابة، ورفع ومعاينة ملفات الاستيراد
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
          >
            <Upload className="h-4 w-4" />
            رفع ملفات XLSX
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => {
            setActiveTab("sponsors");
            setSearch("");
          }}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "sponsors"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
          }`}
        >
          إحصائيات الكفلاء ({statistics?.sponsors?.length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab("adminDebts");
            setSearch("");
          }}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "adminDebts"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
          }`}
        >
          المديونية الإدارية للمتابعة ({adminDebts.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("imports");
            setSearch("");
          }}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "imports"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
          }`}
        >
          سجل استيراد الملفات ({importBatches.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("profit");
            setSearch("");
          }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === "profit"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          تقرير أرباح جاهز
        </button>
      </div>

      {/* Tab 1: Sponsors Breakdown Table */}
      {activeTab === "sponsors" && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الكفيل..."
              className="pr-9 pl-8 text-xs h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                title="مسح البحث"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3">اسم الكفيل</th>
                    <th className="py-3 px-3 text-center">إجمالي الحسابات</th>
                    <th className="py-3 px-3 text-center">الحسابات المسندة</th>
                    <th className="py-3 px-3 text-center">المناديب الفعليون</th>
                    <th className="py-3 px-3 text-center">المناديب المكفولون</th>
                    <th className="py-3 px-3 text-center">
                      مكفولون بحسابات كفلاء آخرين
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-purple-500 mb-2" />
                        جارٍ تحميل إحصائيات الكفلاء...
                      </td>
                    </tr>
                  ) : filteredSponsors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        لا توجد بيانات كفلاء مسجلة
                      </td>
                    </tr>
                  ) : (
                    filteredSponsors.map((s) => (
                      <tr key={s.sponsorId} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="py-3 px-3 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          <span>{s.nameAr || "بدون اسم"}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">{s.accounts}</td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-700">
                          {s.assignedAccounts}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-700">
                          {s.actualRiders}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-700">
                          {s.sponsoredRiders}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-700">
                          {s.sponsoredRidersUsingOtherSponsorsAccounts}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Administrative Debts */}
      {activeTab === "adminDebts" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
            <div>
              <span className="font-bold">قاعدة تشغيلية صارمة:</span> المديونية الإدارية للمتابعة
              والرقابة فقط. لا تدخل هذه القيمة في معادلة التصفية المالية اليومية، ولا تنتج بلوكاً
              تلقائياً على المندوب.
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  إجمالي سجلات المديونية الإدارية
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">
                    {adminDebts.length.toLocaleString()}
                  </span>
                  {(search.trim() || debtTypeFilter !== "ALL" || debtSortOrder !== "none") && (
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      (المطابق: {filteredAdminDebts.length})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                <FileCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  إجمالي مبالغ المديونية
                </p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  <span dir="ltr" className="inline-block">
                    {totalAdminDebt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>{" "}
                  <span className="text-xs font-normal text-gray-500">ر.س</span>
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <Coins className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  عدد المناديب المتأثرين
                </p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {uniqueRidersCount.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-gray-500">مندوب</span>
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الحساب أو اسم المندوب..."
                className="pr-9 pl-8 text-xs h-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                  title="مسح البحث"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Debt Sort Quick Controls */}
              <div className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium px-1.5 hidden md:inline">
                  ترتيب المديونية:
                </span>
                <button
                  type="button"
                  onClick={() => setDebtSortOrder("desc")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    debtSortOrder === "desc"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  title="ترتيب تنازلي: من الأكبر إلى الأصغر"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span>الأكبر للأصغر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDebtSortOrder("asc")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    debtSortOrder === "asc"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  title="ترتيب تصاعدي: من الأصغر للأكبر"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>الأصغر للأكبر</span>
                </button>
                {debtSortOrder !== "none" && (
                  <button
                    type="button"
                    onClick={() => setDebtSortOrder("none")}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="إلغاء الترتيب"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportAdminDebts}
                disabled={filteredAdminDebts.length === 0}
                className="gap-1.5 h-9 text-xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <FileSpreadsheet className="h-4 w-4" />
                تصدير إكسل ({filteredAdminDebts.length})
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3">رقم الحساب</th>
                    <th className="py-3 px-3">المندوب الفعلي</th>
                    <th className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="relative inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDebtSortOrder((prev) => (prev === "desc" ? "asc" : prev === "asc" ? "none" : "desc"));
                            }}
                            className="inline-flex items-center justify-center gap-1.5 font-bold hover:text-purple-600 dark:hover:text-purple-400 transition-colors group cursor-pointer"
                            title="انقر للترتيب: من الأكبر إلى الأصغر / من الأصغر إلى الأكبر"
                          >
                            <span>مديونية المنصة (Platform Debt)</span>
                            {debtSortOrder === "desc" ? (
                              <span className="flex items-center text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 p-0.5 rounded shadow-2xs">
                                <ArrowDown className="h-3.5 w-3.5" />
                              </span>
                            ) : debtSortOrder === "asc" ? (
                              <span className="flex items-center text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 p-0.5 rounded shadow-2xs">
                                <ArrowUp className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                            )}
                          </button>

                          {/* Filter Dropdown Trigger */}
                          <div className="relative" ref={debtFilterRef}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDebtFilterMenuOpen((prev) => !prev);
                              }}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                debtSortOrder !== "none" || debtTypeFilter !== "ALL"
                                  ? "bg-purple-600 text-white"
                                  : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                              title="خيارات الفرز والفلترة لمديونية المنصة"
                              aria-label="خيارات الفرز والفلترة"
                            >
                              <Filter className="h-3.5 w-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {isDebtFilterMenuOpen && (
                              <div
                                className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800 z-50 text-right text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-2 py-1.5 font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 mb-1 flex items-center justify-between">
                                  <span>خيارات الترتيب والفلترة</span>
                                  {(debtSortOrder !== "none" || debtTypeFilter !== "ALL") && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDebtSortOrder("none");
                                        setDebtTypeFilter("ALL");
                                      }}
                                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                                    >
                                      إعادة تعيين
                                    </button>
                                  )}
                                </div>

                                {/* Sort options */}
                                <div className="py-1">
                                  <p className="px-2 py-1 text-[11px] font-semibold text-gray-400">الترتيب:</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDebtSortOrder("desc");
                                      setIsDebtFilterMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                      debtSortOrder === "desc"
                                        ? "bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/50 dark:text-purple-300"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <ArrowDown className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                      <span>من الأكبر إلى الأصغر</span>
                                    </div>
                                    {debtSortOrder === "desc" && <Check className="h-3.5 w-3.5 text-purple-600" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDebtSortOrder("asc");
                                      setIsDebtFilterMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                      debtSortOrder === "asc"
                                        ? "bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/50 dark:text-purple-300"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <ArrowUp className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                      <span>من الأصغر إلى الأكبر</span>
                                    </div>
                                    {debtSortOrder === "asc" && <Check className="h-3.5 w-3.5 text-purple-600" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDebtSortOrder("none");
                                      setIsDebtFilterMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                      debtSortOrder === "none"
                                        ? "bg-gray-100 text-gray-800 font-bold dark:bg-gray-700 dark:text-gray-200"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                                      <span>الترتيب الافتراضي</span>
                                    </div>
                                    {debtSortOrder === "none" && <Check className="h-3.5 w-3.5 text-gray-500" />}
                                  </button>
                                </div>

                                {/* Type/Value filter */}
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                                  <p className="px-2 py-1 text-[11px] font-semibold text-gray-400">تصفية القيمة:</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDebtTypeFilter("ALL");
                                      setIsDebtFilterMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                      debtTypeFilter === "ALL"
                                        ? "bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/50 dark:text-purple-300"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    }`}
                                  >
                                    <span>جميع السجلات</span>
                                    {debtTypeFilter === "ALL" && <Check className="h-3.5 w-3.5 text-purple-600" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDebtTypeFilter("POSITIVE");
                                      setIsDebtFilterMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                      debtTypeFilter === "POSITIVE"
                                        ? "bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/50 dark:text-purple-300"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    }`}
                                  >
                                    <span>مديونية موجبة (&gt; 0 ر.س)</span>
                                    {debtTypeFilter === "POSITIVE" && <Check className="h-3.5 w-3.5 text-purple-600" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDebtTypeFilter("ZERO");
                                      setIsDebtFilterMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                      debtTypeFilter === "ZERO"
                                        ? "bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/50 dark:text-purple-300"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    }`}
                                  >
                                    <span>أرصدة صفرية (= 0 ر.س)</span>
                                    {debtTypeFilter === "ZERO" && <Check className="h-3.5 w-3.5 text-purple-600" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDebtTypeFilter("NEGATIVE");
                                      setIsDebtFilterMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                      debtTypeFilter === "NEGATIVE"
                                        ? "bg-purple-50 text-purple-700 font-bold dark:bg-purple-950/50 dark:text-purple-300"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    }`}
                                  >
                                    <span>أرصدة دائنة (&lt; 0 ر.س)</span>
                                    {debtTypeFilter === "NEGATIVE" && <Check className="h-3.5 w-3.5 text-purple-600" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Header quick filter pill buttons */}
                        <div className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs text-[11px] font-normal">
                          <button
                            type="button"
                            onClick={() => setDebtSortOrder("desc")}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              debtSortOrder === "desc"
                                ? "bg-purple-600 text-white font-bold shadow-2xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                            title="ترتيب تنازلي: من الأكبر إلى الأصغر"
                          >
                            <ArrowDown className="h-3 w-3" />
                            <span>الأكبر</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDebtSortOrder("asc")}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                              debtSortOrder === "asc"
                                ? "bg-purple-600 text-white font-bold shadow-2xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                            title="ترتيب تصاعدي: من الأصغر إلى الأكبر"
                          >
                            <ArrowUp className="h-3 w-3" />
                            <span>الأصغر</span>
                          </button>

                          {debtSortOrder !== "none" && (
                            <button
                              type="button"
                              onClick={() => setDebtSortOrder("none")}
                              className="p-1 rounded-md text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="إلغاء الترتيب"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-purple-500 mb-2" />
                        جارٍ تحميل كافة سجلات المديونية الإدارية...
                      </td>
                    </tr>
                  ) : filteredAdminDebts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-500">
                        {search.trim() ? "لا توجد نتائج مطابقة للبحث" : "لا توجد مديونيات إدارية مسجلة"}
                      </td>
                    </tr>
                  ) : (
                    filteredAdminDebts.map((d, idx) => (
                      <tr
                        key={`${d.handoverId || d.accountId}_${idx}`}
                        className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="py-3 px-3 text-gray-400 font-mono text-[11px] text-center">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-gray-100">
                          {d.externalAccountId || "-"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-900 dark:text-gray-100">
                          {d.riderNameAr || "مندوب"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                          <span dir="ltr" className="inline-block">
                            {Number(d.platformDebt || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>{" "}
                          ر.س
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredAdminDebts.length > 0 && (
                  <tfoot className="border-t bg-gray-50/90 dark:bg-gray-800/60 font-bold text-gray-700 dark:text-gray-300">
                    <tr>
                      <td colSpan={3} className="py-3 px-3">
                        إجمالي السجلات المعروضة ({filteredAdminDebts.length} من أصل {adminDebts.length})
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-sm text-rose-700 dark:text-rose-300">
                        <span dir="ltr" className="inline-block">
                          {filteredAdminDebtTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>{" "}
                        ر.س
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Import Batches */}
      {activeTab === "imports" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3">رقم الدفعة</th>
                    <th className="py-3 px-3">النوع</th>
                    <th className="py-3 px-3 text-center">حالة الاعتماد</th>
                    <th className="py-3 px-3">تاريخ الرفع</th>
                    <th className="py-3 px-3">وقت الاعتماد</th>
                    <th className="py-3 px-3">الدفعة المستبدلة</th>
                    <th className="py-3 px-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-purple-500 mb-2" />
                        جارٍ تحميل دفعات الاستيراد...
                      </td>
                    </tr>
                  ) : importBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        لا توجد دفعات استيراد مرفوعة بعد
                      </td>
                    </tr>
                  ) : (
                    importBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="py-3 px-3 font-mono font-bold">#{b.id.slice(0, 8)}</td>
                        <td className="py-3 px-3 font-semibold">
                          {b.kind === ImportKind.DailyOrders ? "طلبات يومية" : "معاملات منصة"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {b.committedAtUtc ? (
                            <Badge tone="green">معتمدة</Badge>
                          ) : (
                            <Badge tone="orange">قيد المعاينة</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-400">
                          {b.createdAtUtc?.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-3 px-3 text-gray-400">
                          {b.committedAtUtc ? b.committedAtUtc.slice(0, 16).replace("T", " ") : "-"}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-500">
                          {b.replacesBatchId ? `#${b.replacesBatchId.slice(0, 8)}` : "-"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openBatchPreview(b.id)}
                            className="h-7 text-xs font-bold gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            معاينة الدفعة
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Jahez Profit Report */}
      {activeTab === "profit" && <JahezProfitReportTab />}

      {/* ================================================================= */}
      {/* Upload Modal                                                       */}
      {/* ================================================================= */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="رفع ملفات إكسل جديدة (XLSX) — جاهز V2"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              نوع الملفات المرفوعة *
            </label>
            <select
              value={uploadKind}
              onChange={(e) => setUploadKind(Number(e.target.value) as ImportKind)}
              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800"
            >
              <option value={ImportKind.DailyOrders}>2. تقرير الطلبات اليومية (DailyOrders)</option>
              <option value={ImportKind.Transactions}>1. تقرير المعاملات (Transactions)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              اختر ملفات XLSX (من 1 إلى 10 ملفات بحد أقصى 10MB لكل ملف) *
            </label>
            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              onChange={(e) => {
                if (e.target.files) {
                  setSelectedFiles(Array.from(e.target.files));
                }
              }}
              className="w-full rounded-xl border border-gray-300 p-2 text-xs"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-1 text-[11px] text-gray-500">
                تم اختيار {selectedFiles.length} ملف:{" "}
                {selectedFiles.map((f) => f.name).join(", ")}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                معرف الدفعة السابقة (في حال التصحيح)
              </label>
              <Input
                value={replacesBatchId}
                onChange={(e) => setReplacesBatchId(e.target.value)}
                placeholder="replacesBatchId..."
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                سبب التصحيح والاستبدال
              </label>
              <Input
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="تصحيح بيانات دفعة سابقة..."
                disabled={!replacesBatchId.trim()}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsUploadOpen(false)}
              disabled={uploadSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadSubmitting || selectedFiles.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {uploadSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "بدء الرفع"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* Preview Modal                                                      */}
      {/* ================================================================= */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="معاينة دفعة الاستيراد"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {previewLoading ? (
            <div className="py-12 text-center text-gray-500">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-purple-500 mb-2" />
              جارٍ تحميل تفاصيل المعاينة...
            </div>
          ) : selectedPreview ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                <div>
                  <span className="font-bold text-sm">
                    الدفعة #{selectedPreview.batchId.slice(0, 8)}
                  </span>
                  <div className="text-gray-500">
                    النوع:{" "}
                    {selectedPreview.kind === ImportKind.DailyOrders
                      ? "طلبات يومية"
                      : "معاملات منصة"}
                  </div>
                </div>
                <Badge tone={selectedPreview.committed ? "green" : "orange"}>
                  {selectedPreview.committed ? "معتمدة" : "غير معتمدة بعد"}
                </Badge>
              </div>

              {/* الملفات المرفقة */}
              {selectedPreview.files && selectedPreview.files.length > 0 && (
                <div>
                  <div className="font-bold mb-1">الملفات الأصلية:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPreview.files.map((f) => (
                      <Button
                        key={f.id}
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadFile(f.id, f.fileName)}
                        className="gap-1.5 h-7 text-xs"
                      >
                        <Download className="h-3 w-3" />
                        {f.fileName}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* المشاكل أو الأخطاء إن وجدت */}
              {selectedPreview.issues && selectedPreview.issues.length > 0 && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 dark:bg-rose-950/30">
                  <div className="font-bold text-rose-800 dark:text-rose-200 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    تنبيهات وأخطاء المعاينة ({selectedPreview.issues.length}):
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-rose-700 dark:text-rose-300 text-[11px]">
                    {selectedPreview.issues.map((issue, idx) => (
                      <div key={idx}>
                        الملف: {issue.fileName} • صف {issue.rowNumber}: {issue.description} (
                        {issue.code})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ملخص الحسابات إن وجد */}
              {selectedPreview.accounts && selectedPreview.accounts.length > 0 && (
                <div>
                  <div className="font-bold mb-1">ملخص الحسابات في الدفعة:</div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-gray-50 border-b font-bold">
                        <tr>
                          <th className="py-1.5 px-2">معرف السائق</th>
                          <th className="py-1.5 px-2 text-center">الصفوف الصالحة</th>
                          <th className="py-1.5 px-2 text-center">الصافي / الطلبات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedPreview.accounts.map((acc, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-2 font-mono">{acc.driverId}</td>
                            <td className="py-1.5 px-2 text-center">{acc.validRowCount}</td>
                            <td className="py-1.5 px-2 text-center font-bold">
                              {acc.netAmount ? `${acc.netAmount} ر.س` : `${acc.dispatches} طلب`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* التوزيع التلقائي للحسابات المشتركة */}
              {selectedPreview.resolvedAllocations && selectedPreview.resolvedAllocations.length > 0 && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 dark:border-purple-900/50 dark:bg-purple-950/30">
                  <div className="font-bold text-purple-900 dark:text-purple-200 mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>التوزيع التلقائي للحسابات المشتركة ({selectedPreview.resolvedAllocations.length} توزيع):</span>
                    </div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300">
                      سيتم تثبيتها تلقائياً عند الاعتماد
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-purple-800 dark:text-purple-300 text-[11px]">
                    {selectedPreview.resolvedAllocations.map((alloc, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/40 py-1">
                        <span className="font-mono">الصف: <strong title={alloc.rowId}>{alloc.rowId}</strong> • محضر التسليم: <strong title={alloc.handoverId}>{alloc.handoverId}</strong></span>
                        <span>السبب: {alloc.reason || "توزيع تلقائي لليوم المشترك"}</span>
                        <span className="font-bold font-mono">العدد: {alloc.count} طلب</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t">
                <Button variant="secondary" onClick={() => setIsPreviewOpen(false)}>
                  إغلاق
                </Button>
                {!selectedPreview.committed && (
                  <Button
                    onClick={() => handleCommit(selectedPreview.batchId)}
                    disabled={commitSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                  >
                    {commitSubmitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    اعتماد بيانات الدفعة (Commit)
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
