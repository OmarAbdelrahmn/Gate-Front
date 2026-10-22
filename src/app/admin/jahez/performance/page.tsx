// src/app/admin/jahez/performance/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getJahezStatistics,
  getJahezImports,
  getJahezImportPreview,
  commitJahezImport,
  uploadJahezImport,
  downloadJahezImportFile,
  getRiyadhTodayDate,
  getAllJahezAccounts,
} from "@/lib/jahez/api";
import {
  ImportKind,
  type Statistics,
  type ImportBatch,
  type ImportPreview,
  type Account,
} from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  BarChart3,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Building2,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Check,
  Eye,
  UserCheck,
  User,
  MapPin,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
} from "lucide-react";

export default function JahezOrderPerformancePage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Data states
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Performance Filters & View State
  const [activeTab, setActiveTab] = useState<"orders" | "batches">("orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "WITH_ORDERS" | "ZERO_ORDERS" | "ASSIGNED" | "UNASSIGNED"
  >("ALL");
  const [sponsorFilter, setSponsorFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"orders_desc" | "orders_asc" | "code_asc">("orders_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replacesBatchId, setReplacesBatchId] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<ImportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitSubmitting, setCommitSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statRes, impRes, accRes] = await Promise.allSettled([
        getJahezStatistics(),
        getJahezImports(1, 50),
        getAllJahezAccounts(100),
      ]);

      if (statRes.status === "fulfilled") setStatistics(statRes.value);
      if (impRes.status === "fulfilled") setImportBatches(impRes.value.items || []);
      if (accRes.status === "fulfilled") setAccounts(accRes.value.items || []);
    } catch {
      toast.error("خطأ", "تعذر جلب بيانات أداء الطلبات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Performance KPIs & Calculations
  const accountsWithOrders = useMemo(
    () => accounts.filter((a) => (a.yesterdayOrders ?? 0) > 0),
    [accounts],
  );

  const totalYesterdayOrdersCalculated = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.yesterdayOrders ?? 0), 0),
    [accounts],
  );

  const displayYesterdayOrders =
    statistics?.yesterdayOrders ?? totalYesterdayOrdersCalculated;

  const displayAccountsWithOrders =
    statistics?.accountsWithYesterdayData ?? accountsWithOrders.length;

  const activeAccountsCount = useMemo(
    () => accounts.filter((a) => a.status === "Available" || a.isAssigned).length,
    [accounts],
  );

  const avgOrders = useMemo(() => {
    if (displayAccountsWithOrders === 0) return "0";
    return (displayYesterdayOrders / displayAccountsWithOrders).toFixed(1);
  }, [displayYesterdayOrders, displayAccountsWithOrders]);

  const topPerformer = useMemo(() => {
    if (accounts.length === 0) return null;
    let top: Account | null = null;
    let maxOrders = 0;
    for (const a of accounts) {
      const orders = a.yesterdayOrders ?? 0;
      if (orders > maxOrders) {
        maxOrders = orders;
        top = a;
      }
    }
    return top;
  }, [accounts]);

  // Unique filter dropdown values
  const uniqueSponsors = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) {
      if (a.sponsorId && a.sponsorNameAr) {
        map.set(a.sponsorId, a.sponsorNameAr);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [accounts]);

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    for (const a of accounts) {
      if (a.cityNameAr) set.add(a.cityNameAr);
    }
    return Array.from(set).sort();
  }, [accounts]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((a) => {
        if (statusFilter === "WITH_ORDERS" && (a.yesterdayOrders ?? 0) <= 0) return false;
        if (statusFilter === "ZERO_ORDERS" && ((a.yesterdayOrders ?? 0) > 0 || !a.isAssigned))
          return false;
        if (statusFilter === "ASSIGNED" && !a.isAssigned) return false;
        if (statusFilter === "UNASSIGNED" && a.isAssigned) return false;

        if (sponsorFilter && a.sponsorId !== sponsorFilter && a.sponsorNameAr !== sponsorFilter)
          return false;

        if (cityFilter && a.cityNameAr !== cityFilter && a.operatingCityId !== cityFilter)
          return false;

        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          a.code?.toLowerCase().includes(q) ||
          a.externalAccountId?.toLowerCase().includes(q) ||
          a.userName?.toLowerCase().includes(q) ||
          a.cityNameAr?.toLowerCase().includes(q) ||
          a.sponsorNameAr?.toLowerCase().includes(q) ||
          a.actualRider?.nameAr?.toLowerCase().includes(q) ||
          a.actualRider?.nameEn?.toLowerCase().includes(q) ||
          a.actualRider?.iqamaNo?.includes(q) ||
          a.actualRider?.mobile?.includes(q) ||
          a.owner?.nameAr?.toLowerCase().includes(q) ||
          a.owner?.iqamaNo?.includes(q)
        );
      })
      .sort((a, b) => {
        if (sortOrder === "orders_desc") return (b.yesterdayOrders ?? 0) - (a.yesterdayOrders ?? 0);
        if (sortOrder === "orders_asc") return (a.yesterdayOrders ?? 0) - (b.yesterdayOrders ?? 0);
        if (sortOrder === "code_asc") return a.code.localeCompare(b.code);
        return 0;
      });
  }, [accounts, statusFilter, sponsorFilter, cityFilter, search, sortOrder]);

  const paginatedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page, pageSize]);

  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;

  // Daily orders batches
  const dailyOrdersBatches = useMemo(() => {
    return importBatches.filter((b) => b.kind === ImportKind.DailyOrders);
  }, [importBatches]);

  // Export to Excel
  const handleExportPerformance = () => {
    const data = filteredAccounts.map((a) => ({
      "رقم الحساب": a.code,
      "معرف السائق (Driver ID)": a.externalAccountId,
      "اسم المستخدم": a.userName || "-",
      "المندوب الفعلي": a.actualRider?.nameAr || a.actualRider?.nameEn || "غير مسند",
      "إقامة المندوب الفعلي": a.actualRider?.iqamaNo || "-",
      "جوال المندوب الفعلي": a.actualRider?.mobile || "-",
      "صاحب الحساب الرسمي (المالك)": a.owner?.nameAr || "-",
      "إقامة المالك": a.owner?.iqamaNo || "-",
      "الكفيل": a.sponsorNameAr || "-",
      "المدينة": a.cityNameAr || "-",
      "حالة الحساب":
        a.status === "Available"
          ? "متاح"
          : a.status === "Assigned"
          ? "مسند"
          : a.status === "Suspended"
          ? "بلوك"
          : a.status === "Retired"
          ? "متقاعد"
          : a.status === "Archived"
          ? "خارج الكفالة"
          : a.status,
      "مسند": a.isAssigned ? "نعم" : "لا",
      "طلبات الأمس": a.yesterdayOrders ?? 0,
      "تاريخ الأمس": statistics?.yesterday || "-",
      "تاريخ آخر طلب مسجل": a.lastOrderDate || "-",
      "عدد طلبات آخر تاريخ": a.lastOrderCount ?? "-",
    }));
    exportToExcel(data, `تقرير_أداء_الطلبات_جاهز_${statistics?.yesterday || getRiyadhTodayDate()}`);
  };

  // Upload handler
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning("تنبيه", "يرجى اختيار ملف إكسل واحد على الأقل");
      return;
    }
    setUploadSubmitting(true);
    try {
      const preview = await uploadJahezImport(
        ImportKind.DailyOrders,
        selectedFiles,
        replacesBatchId.trim() || undefined,
        correctionReason.trim() || undefined,
      );
      toast.success("تم الرفع", `تم رفع دفعة الطلبات #${preview.batchId.slice(0, 8)} بنجاح`);
      setIsUploadOpen(false);
      setSelectedFiles([]);
      loadAll();

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
      toast.success("تم الاعتماد", "تم اعتماد وتحديث بيانات أداء الطلبات بنجاح");
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
      a.download = res.fileName || fileName || "jahez-daily-orders.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("خطأ", "تعذر تحميل الملف الأصلي");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              أداء الطلبات — جاهز
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              متابعة أداء الطلبات اليومية للمناديب والحسابات، مؤشرات الإنجاز، ورفع شيتات الطلبات اليومية
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
            variant="secondary"
            size="sm"
            onClick={handleExportPerformance}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير أداء الطلبات
          </Button>

          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
          >
            <Upload className="h-4 w-4" />
            رفع شيت طلبات يومية (XLSX)
          </Button>
        </div>
      </div>

      {/* Performance KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* إجمالي طلبات الأمس */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-xs dark:border-purple-950 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              إجمالي طلبات الأمس
            </span>
            <Badge tone="blue">{statistics?.yesterday || "أمس"}</Badge>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-900 dark:text-purple-100 font-mono">
            {displayYesterdayOrders.toLocaleString()} <span className="text-sm font-normal text-purple-600">طلب</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            عبر {accounts.length} حساب مسجل
          </div>
        </div>

        {/* الحسابات المحققة للطلبات */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              حسابات سجلت طلبات
            </span>
            <Badge tone="green">
              {activeAccountsCount > 0
                ? `${((displayAccountsWithOrders / activeAccountsCount) * 100).toFixed(0)}% نشاط`
                : "-"}
            </Badge>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-100 font-mono">
            {displayAccountsWithOrders} <span className="text-sm font-normal text-emerald-600">من {activeAccountsCount}</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            حسابات نشطة حققت طلبات أمس
          </div>
        </div>

        {/* متوسط الإنتاجية لكل حساب نشط */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs dark:border-blue-950 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-600" />
              متوسط الطلبات / حساب
            </span>
            <Badge tone="blue">معدل الإنجاز</Badge>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-100 font-mono">
            {avgOrders} <span className="text-sm font-normal text-blue-600">طلب / حساب</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            للحسابات المسجلة للطلبات أمس
          </div>
        </div>

        {/* حسابات نشطة بلا طلبات */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs dark:border-amber-950 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              حسابات بلا طلبات
            </span>
            <Badge tone="orange">تحتاج متابعة</Badge>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-100 font-mono">
            {Math.max(0, activeAccountsCount - displayAccountsWithOrders)} <span className="text-sm font-normal text-amber-600">حساب</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            حسابات نشطة/مسندة بدون إنتاجية أمس
          </div>
        </div>

        {/* أعلى أداء حساب أمس */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs dark:border-indigo-950 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-indigo-600" />
              الأعلى إنجازاً أمس
            </span>
            <Badge tone="blue">الأعلى أداءً</Badge>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-900 dark:text-indigo-100 font-mono">
            {topPerformer?.yesterdayOrders ?? 0} <span className="text-sm font-normal text-indigo-600">طلب</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 truncate font-semibold">
            {topPerformer?.actualRider?.nameAr || topPerformer?.code || "-"}
          </div>
        </div>
      </div>

      {/* Tabs Selector: Orders Table vs Daily Orders Batches */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 text-xs font-bold">
        <button
          onClick={() => {
            setActiveTab("orders");
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "orders"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          جدول أداء طلبات الحسابات والمناديب ({filteredAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab("batches")}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === "batches"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          شيتات الطلبات اليومية المرفوعة ({dailyOrdersBatches.length})
        </button>
      </div>

      {/* Tab 1: Orders Performance Table */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="ابحث برقم الحساب، اسم المندوب الفعلي، رقم الإقامة، الجوال، المالك، الكفيل أو المدينة..."
                className="pr-10 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="WITH_ORDERS">حققت طلبات (&gt; 0)</option>
                <option value="ZERO_ORDERS">بدون طلبات (0)</option>
                <option value="ASSIGNED">المسندة فقط</option>
                <option value="UNASSIGNED">غير مسندة</option>
              </select>

              {uniqueSponsors.length > 0 && (
                <select
                  value={sponsorFilter}
                  onChange={(e) => {
                    setSponsorFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium dark:border-gray-700 dark:bg-gray-800 max-w-[150px] truncate"
                >
                  <option value="">جميع الكفلاء</option>
                  {uniqueSponsors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              {uniqueCities.length > 0 && (
                <select
                  value={cityFilter}
                  onChange={(e) => {
                    setCityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">جميع المدن</option>
                  {uniqueCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="orders_desc">الأعلى طلبات أولاً</option>
                <option value="orders_asc">الأقل طلبات أولاً</option>
                <option value="code_asc">ترتيب بكود الحساب</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3">رقم الحساب</th>
                    <th className="py-3 px-3">المندوب الفعلي (المستخدم)</th>
                    <th className="py-3 px-3">صاحب الحساب (المالك)</th>
                    <th className="py-3 px-3">الكفيل والمدينة</th>
                    <th className="py-3 px-3 text-center">الحالة والإسناد</th>
                    <th className="py-3 px-3 text-center">طلبات الأمس</th>
                    <th className="py-3 px-3 text-center">آخر نشاط مسجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-purple-500 mb-2" />
                        جارٍ تحميل بيانات أداء الطلبات...
                      </td>
                    </tr>
                  ) : paginatedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        لا توجد حسابات مطابقة لمعايير البحث والفلترة
                      </td>
                    </tr>
                  ) : (
                    paginatedAccounts.map((a) => {
                      const orders = a.yesterdayOrders ?? 0;
                      return (
                        <tr
                          key={a.accountId}
                          className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                        >
                          {/* رقم الحساب والمعرف */}
                          <td className="py-3 px-3 font-mono">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {a.code}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {a.externalAccountId}
                              {a.userName && ` • ${a.userName}`}
                            </div>
                          </td>

                          {/* المندوب الفعلي */}
                          <td className="py-3 px-3">
                            {a.actualRider ? (
                              <div>
                                <div className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                  <UserCheck className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    {a.actualRider.nameAr || a.actualRider.nameEn || "-"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  إقامة: {a.actualRider.iqamaNo || "-"}
                                  {a.actualRider.mobile && ` • ${a.actualRider.mobile}`}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                غير مسند
                              </span>
                            )}
                          </td>

                          {/* صاحب الحساب (المالك) */}
                          <td className="py-3 px-3">
                            {a.owner ? (
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                  <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  <span>{a.owner.nameAr || a.owner.nameEn || "-"}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  إقامة: {a.owner.iqamaNo || "-"}
                                  {a.owner.mobile && ` • ${a.owner.mobile}`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          {/* الكفيل والمدينة */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                              <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                              <span className="truncate max-w-[120px]">
                                {a.sponsorNameAr || "بدون كفيل"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <MapPin className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                              <span>{a.cityNameAr || "-"}</span>
                            </div>
                          </td>

                          {/* الحالة والإسناد */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                tone={
                                  a.status === "Available"
                                    ? "green"
                                    : a.status === "Suspended"
                                    ? "red"
                                    : a.status === "Archived"
                                    ? "orange"
                                    : "gray"
                                }
                              >
                                {a.status === "Available"
                                  ? "متاح/نشط"
                                  : a.status === "Suspended"
                                  ? "بلوك"
                                  : a.status === "Archived"
                                  ? "خارج الكفالة"
                                  : a.status}
                              </Badge>
                              {a.isAssigned && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  مسند حالياً
                                </span>
                              )}
                            </div>
                          </td>

                          {/* طلبات الأمس */}
                          <td className="py-3 px-3 text-center">
                            <div
                              className={`inline-flex items-center justify-center min-w-[50px] px-2.5 py-1 rounded-xl font-mono font-black text-sm ${
                                orders >= 20
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                                  : orders >= 10
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200"
                                  : orders > 0
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                              }`}
                            >
                              {orders}
                            </div>
                          </td>

                          {/* آخر نشاط مسجل */}
                          <td className="py-3 px-3 text-center">
                            {a.lastOrderDate ? (
                              <div>
                                <div className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                                  {a.lastOrderCount ?? 0} طلب
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  {a.lastOrderDate}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 font-mono text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-3">
                <div className="text-xs text-gray-500">
                  عرض {(page - 1) * pageSize + 1} إلى{" "}
                  {Math.min(page * pageSize, filteredAccounts.length)} من إجمالي{" "}
                  {filteredAccounts.length} حساب
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-bold px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Daily Orders Import Batches */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3">رقم الدفعة</th>
                    <th className="py-3 px-3 text-center">حالة الاعتماد</th>
                    <th className="py-3 px-3">تاريخ الرفع</th>
                    <th className="py-3 px-3">وقت الاعتماد</th>
                    <th className="py-3 px-3">الدفعة المستبدلة</th>
                    <th className="py-3 px-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dailyOrdersBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        لا توجد دفعات استيراد طلبات يومية مسجلة بعد
                      </td>
                    </tr>
                  ) : (
                    dailyOrdersBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="py-3 px-3 font-mono font-bold">#{b.id.slice(0, 8)}</td>
                        <td className="py-3 px-3 text-center">
                          {b.committedAtUtc ? (
                            <Badge tone="green">معتمدة ومسجلة</Badge>
                          ) : (
                            <Badge tone="orange">قيد المعاينة والتدقيق</Badge>
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
                            معاينة الشيت
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

      {/* ================================================================= */}
      {/* Upload Modal (Strictly Daily Orders XLSX)                         */}
      {/* ================================================================= */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="رفع شيت طلبات يومية جديد (Daily Orders XLSX) — جاهز V2"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              اختر ملفات إكسل الطلبات اليومية (XLSX) *
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
        title="معاينة شيت الطلبات اليومية"
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
                    النوع: طلبات يومية (Daily Orders)
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

              {/* ملخص الحسابات في الدفعة */}
              {selectedPreview.accounts && selectedPreview.accounts.length > 0 && (
                <div>
                  <div className="font-bold mb-1">ملخص الحسابات والطلبات في الشيت:</div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-gray-50 border-b font-bold">
                        <tr>
                          <th className="py-1.5 px-2">معرف السائق</th>
                          <th className="py-1.5 px-2 text-center">الصفوف الصالحة</th>
                          <th className="py-1.5 px-2 text-center">الطلبات المسجلة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedPreview.accounts.map((acc, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-2 font-mono">{acc.driverId}</td>
                            <td className="py-1.5 px-2 text-center">{acc.validRowCount}</td>
                            <td className="py-1.5 px-2 text-center font-bold">
                              {acc.dispatches ?? 0} طلب
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
                      <div key={idx} className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/40 py-1">
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
                    اعتماد بيانات الطلبات (Commit)
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
