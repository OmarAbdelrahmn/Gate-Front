// src/app/admin/chefz/accounts/page.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getChefzPlatform,
  getAllChefzAccounts,
  getChefzAccount,
  updateChefzAccountDetails,
  setChefzPassword,
  getChefzPassword,
} from "@/lib/chefz/api";
import type {
  ChefzAccount,
  ChefzAccountType,
} from "@/lib/chefz/types";
import {
  getPlatformAccounts,
  assignPlatformAccount,
  releasePlatformAccount,
  getAccountAssignmentHistory,
  getAccountCredentialHistory,
  type AccountResponse,
  type AssignmentResponse,
  type CredentialHistoryResponse,
  type PlatformResponse,
} from "@/lib/platforms/api";
import { listOperatingCities, listSponsors, listRiders, type OperatingCity, type Sponsor } from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  Server,
  Search,
  RefreshCw,
  UserPlus,
  UserMinus,
  KeyRound,
  History,
  AlertTriangle,
  ExternalLink,
  Lock,
  UserCheck,
  FileSpreadsheet,
  Settings,
  Eye,
  Copy,
  Check,
  Info,
  ShieldAlert,
} from "lucide-react";

interface JoinedAccount {
  base: AccountResponse;
  chefz: ChefzAccount | null;
}

export default function ChefzAccountsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Data states
  const [platform, setPlatform] = useState<PlatformResponse | null>(null);
  const [accounts, setAccounts] = useState<JoinedAccount[]>([]);
  const [cities, setCities] = useState<OperatingCity[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [filterSetupStatus, setFilterSetupStatus] = useState<string>("all"); // "all" | "configured" | "not_configured"
  const [filterType, setFilterType] = useState<string>("all"); // "all" | "Freelancer" | "FullTime"
  const [filterCityId, setFilterCityId] = useState("");
  const [filterSponsorId, setFilterSponsorId] = useState("");

  // Modals
  // 1. Chefz Setup / Configuration Modal
  const [setupAccount, setSetupAccount] = useState<JoinedAccount | null>(null);
  const [setupAccountType, setSetupAccountType] = useState<ChefzAccountType>("Freelancer");
  const [setupReportIdNumber, setSetupReportIdNumber] = useState("");
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [setupConflictError, setSetupConflictError] = useState<string | null>(null);

  // 2. Password Modal
  const [passwordAccount, setPasswordAccount] = useState<JoinedAccount | null>(null);
  const [passwordTab, setPasswordTab] = useState<"rotate" | "reveal" | "history">("rotate");
  const [newPassword, setNewPassword] = useState("");
  const [passwordReason, setPasswordReason] = useState("إعداد كلمة مرور الحساب");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [credentialHistory, setCredentialHistory] = useState<CredentialHistoryResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 3. Assignment Modals (Assign / Release / History)
  const [assigningAccount, setAssigningAccount] = useState<AccountResponse | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [assignReason, setAssignReason] = useState("تسليم الحساب للمندوب");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [releasingAccount, setReleasingAccount] = useState<AccountResponse | null>(null);
  const [releaseEffectiveTo, setReleaseEffectiveTo] = useState(new Date().toISOString().split("T")[0]);
  const [releaseReason, setReleaseReason] = useState("إرجاع الحساب");
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);

  const [historyAccount, setHistoryAccount] = useState<AccountResponse | null>(null);
  const [assignmentHistoryList, setAssignmentHistoryList] = useState<AssignmentResponse[]>([]);
  const [assignmentHistoryLoading, setAssignmentHistoryLoading] = useState(false);

  // Load everything
  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Discover Chefz platform
      const plat = await getChefzPlatform();
      setPlatform(plat);

      if (!plat) {
        setFetchError("لم يتم العثور على منصة شيفز (SHIFTZ) في دليل المنصات.");
        setLoading(false);
        return;
      }

      // 2. Parallel fetch base accounts, chefz configured accounts, metadata
      const [baseAccounts, chefzAccounts, cityList, sponsorList, riderList] = await Promise.all([
        getPlatformAccounts({ platformId: plat.id, includeArchived: false }),
        getAllChefzAccounts().catch(() => [] as ChefzAccount[]),
        listOperatingCities().catch(() => []),
        listSponsors().catch(() => []),
        listRiders().catch(() => []),
      ]);

      setCities(cityList);
      setSponsors(sponsorList);
      setRiders(riderList);

      // 3. Map chefz by accountId
      const chefzMap = new Map<string, ChefzAccount>();
      for (const ca of chefzAccounts) {
        chefzMap.set(ca.accountId, ca);
      }

      // 4. Join accounts
      const joined: JoinedAccount[] = baseAccounts.map((base) => ({
        base,
        chefz: chefzMap.get(base.id) || null,
      }));

      setAccounts(joined);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFetchError(e?.message || "تعذر تحميل حسابات شيفز.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((item) => {
      const { base, chefz } = item;

      // Setup filter
      if (filterSetupStatus === "configured" && !chefz) return false;
      if (filterSetupStatus === "not_configured" && chefz) return false;

      // Type filter
      if (filterType !== "all") {
        if (!chefz || chefz.accountType !== filterType) return false;
      }

      // City filter
      if (filterCityId && base.operatingCityId !== filterCityId) return false;

      // Sponsor filter
      if (filterSponsorId && base.sponsorId !== filterSponsorId) return false;

      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const code = (base.code || "").toLowerCase();
        const ext = (base.externalAccountId || "").toLowerCase();
        const reportId = (chefz?.reportIdNumber || "").toLowerCase();
        const owner = (base.ownerRiderNameAr || "").toLowerCase();
        const currentRider = (base.currentAssignment?.actualRiderNameAr || "").toLowerCase();
        if (
          !code.includes(q) &&
          !ext.includes(q) &&
          !reportId.includes(q) &&
          !owner.includes(q) &&
          !currentRider.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [accounts, filterSetupStatus, filterType, filterCityId, filterSponsorId, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = accounts.length;
    const configured = accounts.filter((a) => a.chefz !== null).length;
    const pending = total - configured;
    const assigned = accounts.filter((a) => Boolean(a.base.currentAssignment)).length;
    return { total, configured, pending, assigned };
  }, [accounts]);

  // -----------------------------------------------------------------
  // Handlers: Setup / Update Chefz Details
  // -----------------------------------------------------------------
  const openSetupModal = (item: JoinedAccount) => {
    setSetupAccount(item);
    setSetupConflictError(null);
    if (item.chefz) {
      setSetupAccountType(item.chefz.accountType);
      setSetupReportIdNumber(item.chefz.reportIdNumber || "");
    } else {
      setSetupAccountType("Freelancer");
      setSetupReportIdNumber("");
    }
  };

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupAccount) return;

    setSetupSubmitting(true);
    setSetupConflictError(null);

    try {
      const updated = await updateChefzAccountDetails(setupAccount.base.id, {
        accountType: setupAccountType,
        reportIdNumber: setupReportIdNumber.trim() || null,
        rowVersion: setupAccount.chefz?.rowVersion || null,
      });

      // Update in local state
      setAccounts((prev) =>
        prev.map((item) =>
          item.base.id === setupAccount.base.id ? { ...item, chefz: updated } : item
        )
      );

      setSetupAccount(null);
    } catch (err: unknown) {
      const e = err as { status?: number; details?: { detail?: string; message?: string } };
      if (e?.status === 409) {
        // Concurrency or duplicate conflict
        const detailMsg =
          e.details?.detail || e.details?.message || "تعارض في التحديث: قد يكون رقم الهوية مستخدماً لحساب آخر أو تغيرت بيانات السجل.";
        setSetupConflictError(detailMsg);
        // Refresh this single account detail in background
        const fresh = await getChefzAccount(setupAccount.base.id);
        if (fresh) {
          setAccounts((prev) =>
            prev.map((item) =>
              item.base.id === setupAccount.base.id ? { ...item, chefz: fresh } : item
            )
          );
          setSetupAccount((prev) => (prev ? { ...prev, chefz: fresh } : null));
        }
      }
    } finally {
      setSetupSubmitting(false);
    }
  };

  // -----------------------------------------------------------------
  // Handlers: Password Management
  // -----------------------------------------------------------------
  const openPasswordModal = (item: JoinedAccount) => {
    setPasswordAccount(item);
    setPasswordTab("rotate");
    setNewPassword("");
    setPasswordReason("إعداد كلمة مرور الحساب");
    setRevealedPassword(null);
    setCopiedPassword(false);
    setCredentialHistory([]);
  };

  const closePasswordModal = () => {
    setPasswordAccount(null);
    setRevealedPassword(null);
    setCopiedPassword(false);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordAccount || !newPassword.trim()) return;

    setPasswordSubmitting(true);
    try {
      await setChefzPassword(passwordAccount.base.id, {
        password: newPassword,
        reason: passwordReason.trim() || "تحديث كلمة المرور",
      });

      // Refetch chefz detail to update hasPassword
      const updated = await getChefzAccount(passwordAccount.base.id);
      if (updated) {
        setAccounts((prev) =>
          prev.map((item) =>
            item.base.id === passwordAccount.base.id ? { ...item, chefz: updated } : item
          )
        );
      }
      closePasswordModal();
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleRevealPassword = async () => {
    if (!passwordAccount) return;
    setRevealLoading(true);
    setCopiedPassword(false);
    try {
      const pass = await getChefzPassword(passwordAccount.base.id);
      setRevealedPassword(pass);
    } catch {
      toast.error("خطأ", "تعذر كشف كلمة المرور أو لا توجد كلمة مرور محفوظة.");
    } finally {
      setRevealLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    setCopiedPassword(true);
    toast.success("تم النسخ", "تم نسخ كلمة المرور إلى الحافظة.");
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleLoadCredentialHistory = async () => {
    if (!passwordAccount) return;
    setHistoryLoading(true);
    try {
      const list = await getAccountCredentialHistory(passwordAccount.base.id);
      setCredentialHistory(list || []);
    } catch {
      // Ignored
    } finally {
      setHistoryLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // Handlers: Assignments (Assign / Release / History)
  // -----------------------------------------------------------------
  const handleAssignRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAccount || !selectedRiderId) return;

    setAssignSubmitting(true);
    try {
      const res = await assignPlatformAccount(assigningAccount.id, {
        actualRiderProfileId: selectedRiderId,
        effectiveFrom: assignEffectiveFrom,
        reason: assignReason,
      });

      setAccounts((prev) =>
        prev.map((item) =>
          item.base.id === assigningAccount.id
            ? { ...item, base: { ...item.base, currentAssignment: res, status: "Assigned" } }
            : item
        )
      );

      setAssigningAccount(null);
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleReleaseRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingAccount || !releasingAccount.currentAssignment) return;

    setReleaseSubmitting(true);
    try {
      await releasePlatformAccount(releasingAccount.id, {
        effectiveTo: releaseEffectiveTo,
        reason: releaseReason,
        status: "Ended",
        rowVersion: releasingAccount.currentAssignment.rowVersion,
      });

      setAccounts((prev) =>
        prev.map((item) =>
          item.base.id === releasingAccount.id
            ? { ...item, base: { ...item.base, currentAssignment: null, status: "Available" } }
            : item
        )
      );

      setReleasingAccount(null);
    } finally {
      setReleaseSubmitting(false);
    }
  };

  const handleOpenAssignmentHistory = async (acc: AccountResponse) => {
    setHistoryAccount(acc);
    setAssignmentHistoryLoading(true);
    try {
      const list = await getAccountAssignmentHistory(acc.id);
      setAssignmentHistoryList(list || []);
    } catch {
      setAssignmentHistoryList([]);
    } finally {
      setAssignmentHistoryLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // Excel Export
  // -----------------------------------------------------------------
  const handleExportExcel = () => {
    exportToExcel({
      filename: `chefz-accounts-${new Date().toISOString().split("T")[0]}`,
      sheetName: "Chefz Accounts",
      data: filteredAccounts,
      columns: [
        { header: "كود الحساب", accessor: (i) => i.base.code, isText: true },
        { header: "المعرف الخارجي", accessor: (i) => i.base.externalAccountId || "—", isText: true },
        { header: "المالك المسجل", accessor: (i) => i.base.ownerRiderNameAr || "—" },
        {
          header: "المندوب الفعلي الحالي",
          accessor: (i) => i.base.currentAssignment?.actualRiderNameAr || "غير مخصص",
        },
        { header: "المدينة", accessor: (i) => i.base.operatingCityNameAr || "—" },
        { header: "الكفيل", accessor: (i) => i.base.sponsorNameAr || "—" },
        {
          header: "نوع الحساب",
          accessor: (i) =>
            i.chefz
              ? i.chefz.accountType === "Freelancer"
                ? "فريلانسر"
                : "دوام كامل"
              : "غير معد",
        },
        {
          header: "عمولة الشركة",
          accessor: (i) =>
            i.chefz
              ? i.chefz.accountType === "Freelancer"
                ? "15%"
                : "25 ر.س / يوم"
              : "—",
        },
        { header: "رقم الهوية في تقرير شيفز", accessor: (i) => i.chefz?.reportIdNumber || "—", isText: true },
        { header: "حالة الإعداد", accessor: (i) => (i.chefz ? "معد" : "غير معد") },
        {
          header: "حالة كلمة المرور",
          accessor: (i) => (i.chefz ? (i.chefz.hasPassword ? "محفوظة" : "غير محفوظة") : "—"),
        },
        { header: "الحالة العامة", accessor: (i) => i.base.status },
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
            ليس لديك الصلاحية الكافية لعرض حسابات وعمليات شيفز (chefz.read).
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
              حسابات منصة شيفز
            </h1>
            <Badge tone="blue">
              {platform?.nameAr || "شفز / Shiftz"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            تهيئة بيانات الحسابات، قواعد العمولات، كلمات المرور، وربط المناديب الفعليين بمنصة شيفز.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={loading || filteredAccounts.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير إكسل
          </Button>

          {can("chefz.settlements.create") && (
            <Link href="/admin/chefz/settlements">
              <Button className="gap-2 bg-[var(--brand)] text-white hover:opacity-90">
                إدارة التصفيات
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="font-semibold">{fetchError}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-[var(--muted)]">إجمالي حسابات المنصة</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--foreground)]" dir="ltr">
            {stats.total.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">حساب مسجل بالمنصة</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">حسابات معدة لشيفز</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400" dir="ltr">
            {stats.configured.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">تم تعيين النوع والهوية</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">بانتظار الإعداد</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400" dir="ltr">
            {stats.pending.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">تتطلب اختيار النوع والهوية</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">مخصصة لمناديب</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-600 dark:text-blue-400" dir="ltr">
            {stats.assigned.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">لها تكليف نشط حالياً</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="بحث بالكود، الهوية، المندوب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 pr-9 pl-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>

          <div>
            <select
              value={filterSetupStatus}
              onChange={(e) => setFilterSetupStatus(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="all">جميع حالات الإعداد</option>
              <option value="configured">معد لشيفز فقط</option>
              <option value="not_configured">غير معد (بانتظار الإعداد)</option>
            </select>
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="all">جميع أنواع شيفز</option>
              <option value="Freelancer">فريلانسر (15%)</option>
              <option value="FullTime">دوام كامل (25 ر.س/يوم)</option>
            </select>
          </div>

          <div>
            <select
              value={filterCityId}
              onChange={(e) => setFilterCityId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="">جميع المدن</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.globalCityAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterSponsorId}
              onChange={(e) => setFilterSponsorId(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="">جميع الكفلاء</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.registryNameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--muted)] border-t border-[var(--border)] pt-3">
          <span>
            عرض <strong className="text-[var(--foreground)]">{filteredAccounts.length}</strong> من أصل{" "}
            {accounts.length} حساب
          </span>
          {(search || filterSetupStatus !== "all" || filterType !== "all" || filterCityId || filterSponsorId) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterSetupStatus("all");
                setFilterType("all");
                setFilterCityId("");
                setFilterSponsorId("");
              }}
              className="text-[var(--brand)] hover:underline font-semibold"
            >
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3.5">كود الحساب / المعرف</th>
                <th className="px-4 py-3.5">المالك المسجل</th>
                <th className="px-4 py-3.5">المندوب الفعلي الحالي</th>
                <th className="px-4 py-3.5">المدينة / الكفيل</th>
                <th className="px-4 py-3.5">نوع الحساب</th>
                <th className="px-4 py-3.5">عمولة الشركة</th>
                <th className="px-4 py-3.5">هوية تقرير شيفز</th>
                <th className="px-4 py-3.5">حالة الإعداد</th>
                <th className="px-4 py-3.5">كلمة المرور</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-[var(--muted)]">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--brand)]" />
                    جارٍ تحميل حسابات شيفز ودمج البيانات...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-[var(--muted)]">
                    لا توجد حسابات مطابقة لمعايير البحث المحددة.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((item) => {
                  const { base, chefz } = item;
                  const isConfigured = Boolean(chefz);
                  const currentRider = base.currentAssignment;

                  return (
                    <tr
                      key={base.id}
                      className="transition-colors hover:bg-[var(--table-row-hover)]"
                    >
                      {/* Code & External ID */}
                      <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                        <div>
                          <Link
                            href={`/admin/chefz/accounts/${base.id}`}
                            className="font-bold text-[var(--brand)] hover:underline"
                          >
                            {base.code}
                          </Link>
                          {base.externalAccountId && (
                            <div className="text-xs text-[var(--muted)]" dir="ltr">
                              ID: {base.externalAccountId}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Owner Rider */}
                      <td className="px-4 py-3">
                        <div className="text-[var(--foreground)]">
                          {base.ownerRiderNameAr || "—"}
                        </div>
                        <div className="text-xs text-[var(--muted)]">المالك المسجل</div>
                      </td>

                      {/* Actual Rider */}
                      <td className="px-4 py-3">
                        {currentRider ? (
                          <div>
                            <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {currentRider.actualRiderNameAr || "مندوب نشط"}
                            </div>
                            <div className="text-xs text-[var(--muted)]" dir="ltr">
                              من {currentRider.effectiveFrom}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">غير مخصص</span>
                        )}
                      </td>

                      {/* City & Sponsor */}
                      <td className="px-4 py-3 text-xs">
                        <div className="text-[var(--foreground)]">
                          {base.operatingCityNameAr || "—"}
                        </div>
                        <div className="text-[var(--muted)]">{base.sponsorNameAr || "—"}</div>
                      </td>

                      {/* Chefz Account Type */}
                      <td className="px-4 py-3">
                        {chefz ? (
                          chefz.accountType === "Freelancer" ? (
                            <Badge tone="blue">فريلانسر</Badge>
                          ) : (
                            <Badge tone="orange">دوام كامل</Badge>
                          )
                        ) : (
                          <Badge tone="gray">غير معد</Badge>
                        )}
                      </td>

                      {/* Company Rule */}
                      <td className="px-4 py-3 text-xs font-semibold">
                        {chefz ? (
                          chefz.accountType === "Freelancer" ? (
                            <span className="text-blue-600 dark:text-blue-400">15% من الأرباح</span>
                          ) : (
                            <span className="text-orange-600 dark:text-orange-400">25 ر.س / يوم</span>
                          )
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Report ID */}
                      <td className="px-4 py-3 text-xs font-mono" dir="ltr">
                        {chefz?.reportIdNumber ? (
                          <span className="font-semibold text-[var(--foreground)]">
                            {chefz.reportIdNumber}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Setup Status */}
                      <td className="px-4 py-3">
                        {isConfigured ? (
                          <Badge tone="green">معد</Badge>
                        ) : (
                          <Badge tone="gray">غير معد</Badge>
                        )}
                      </td>

                      {/* Password Status */}
                      <td className="px-4 py-3">
                        {isConfigured && chefz ? (
                          chefz.hasPassword ? (
                            <Badge tone="green">محفوظة</Badge>
                          ) : (
                            <Badge tone="orange">غير محفوظة</Badge>
                          )
                        ) : (
                          <span className="text-xs text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Setup button */}
                          {can("chefz.accounts.update") && (
                            <button
                              onClick={() => openSetupModal(item)}
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--brand)] dark:hover:bg-slate-800"
                              title="إعداد بيانات شيفز"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          )}

                          {/* Password button */}
                          {(can("platform_credentials.rotate") || can("platform_credentials.read")) && (
                            <button
                              onClick={() => openPasswordModal(item)}
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800"
                              title="إدارة كلمة المرور"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}

                          {/* Assign / Release button */}
                          {can("platform_assignments.create") && !currentRider && (
                            <button
                              onClick={() => {
                                setAssigningAccount(base);
                                setSelectedRiderId("");
                                setAssignEffectiveFrom(new Date().toISOString().split("T")[0]);
                              }}
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                              title="تعيين مندوب للحساب"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}

                          {can("platform_assignments.delete") && currentRider && (
                            <button
                              onClick={() => {
                                setReleasingAccount(base);
                                setReleaseEffectiveTo(new Date().toISOString().split("T")[0]);
                              }}
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                              title="إنهاء تعيين المندوب"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}

                          {/* History */}
                          {can("platform_assignments.read") && (
                            <button
                              onClick={() => handleOpenAssignmentHistory(base)}
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--foreground)] dark:hover:bg-slate-800"
                              title="سجل التعيينات"
                            >
                              <History className="h-4 w-4" />
                            </button>
                          )}

                          {/* Account Page */}
                          <Link
                            href={`/admin/chefz/accounts/${base.id}`}
                            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--foreground)] dark:hover:bg-slate-800"
                            title="تفاصيل الحساب الكاملة"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
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
      {/* 1. Modal: Setup / Edit Chefz Details                           */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(setupAccount)}
        onClose={() => setSetupAccount(null)}
        title={`إعداد بيانات شيفز — ${setupAccount?.base.code || ""}`}
        maxWidth="max-w-xl"
      >
        {setupAccount && (
          <form onSubmit={handleSaveSetup} className="space-y-5" dir="rtl">
            {setupConflictError && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{setupConflictError}</span>
                </div>
              </div>
            )}

            {/* Account Context Summary */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">كود الحساب:</span>
                <span className="font-semibold text-[var(--foreground)]">{setupAccount.base.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">المعرف الخارجي:</span>
                <span className="font-mono text-[var(--foreground)]" dir="ltr">
                  {setupAccount.base.externalAccountId || "غير محدد"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">المالك المسجل:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {setupAccount.base.ownerRiderNameAr || "غير محدد"}
                </span>
              </div>
              {setupAccount.base.currentAssignment && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">المندوب الفعلي الحالي:</span>
                  <span className="font-semibold text-emerald-600">
                    {setupAccount.base.currentAssignment.actualRiderNameAr}
                  </span>
                </div>
              )}
            </div>

            {/* Account Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--foreground)]">
                نوع الحساب في شيفز <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex cursor-pointer flex-col rounded-xl border p-3 transition-all ${
                    setupAccountType === "Freelancer"
                      ? "border-[var(--brand)] bg-blue-50/50 dark:bg-blue-950/30"
                      : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="accountType"
                      value="Freelancer"
                      checked={setupAccountType === "Freelancer"}
                      onChange={() => setSetupAccountType("Freelancer")}
                      className="accent-[var(--brand)]"
                    />
                    <span className="font-bold text-sm text-[var(--foreground)]">فريلانسر (Freelancer)</span>
                  </div>
                  <span className="mt-1 text-xs text-[var(--muted)]">
                    عمولة الشركة 15% من صافي أرباح المحفظة
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer flex-col rounded-xl border p-3 transition-all ${
                    setupAccountType === "FullTime"
                      ? "border-[var(--brand)] bg-blue-50/50 dark:bg-blue-950/30"
                      : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="accountType"
                      value="FullTime"
                      checked={setupAccountType === "FullTime"}
                      onChange={() => setSetupAccountType("FullTime")}
                      className="accent-[var(--brand)]"
                    />
                    <span className="font-bold text-sm text-[var(--foreground)]">دوام كامل (FullTime)</span>
                  </div>
                  <span className="mt-1 text-xs text-[var(--muted)]">
                    عمولة الشركة 25 ر.س لكل يوم تكليف للمندوب
                  </span>
                </label>
              </div>

              <div className="flex items-start gap-1.5 text-xs text-[var(--muted)] mt-1">
                <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                <span>
                  تغيير نوع الحساب يؤثر على جميع التصفيات الجديدة للفترات غير المحفوظة، بينما تظل التصفيات المحفوظة سابقاً محتفظة بنوعها وقيمتها الأصلية.
                </span>
              </div>
            </div>

            {/* Report ID Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                رقم الهوية في تقرير شيفز (Report Id Number)
              </label>
              <input
                type="text"
                value={setupReportIdNumber}
                onChange={(e) => setSetupReportIdNumber(e.target.value)}
                placeholder="اتركه فارغاً للاعتماد على إقامة المالك المسجل"
                maxLength={100}
                dir="ltr"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-mono"
              />
              <p className="text-xs text-[var(--muted)]">
                المفتاح الدقيق لمطابقة صفوف تقرير الأداء اليومي المستورد من شيفز.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSetupAccount(null)}
                disabled={setupSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={setupSubmitting}
                className="bg-[var(--brand)] text-white hover:opacity-90 min-w-[120px]"
              >
                {setupSubmitting ? "جارٍ الحفظ..." : "حفظ بيانات شيفز"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 2. Modal: Password Management (Set / Reveal / History)        */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(passwordAccount)}
        onClose={closePasswordModal}
        title={`بيانات اعتماد الحساب — ${passwordAccount?.base.code || ""}`}
        maxWidth="max-w-lg"
      >
        {passwordAccount && (
          <div className="space-y-5" dir="rtl">
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] text-xs font-bold">
              {can("platform_credentials.rotate") && (
                <button
                  onClick={() => setPasswordTab("rotate")}
                  className={`px-4 py-2.5 border-b-2 transition-colors ${
                    passwordTab === "rotate"
                      ? "border-[var(--brand)] text-[var(--brand)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  تعيين كلمة المرور
                </button>
              )}

              {can("platform_credentials.read") && (
                <button
                  onClick={() => setPasswordTab("reveal")}
                  className={`px-4 py-2.5 border-b-2 transition-colors ${
                    passwordTab === "reveal"
                      ? "border-[var(--brand)] text-[var(--brand)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  كشف كلمة المرور
                </button>
              )}

              {can("platform_credentials.read") && (
                <button
                  onClick={() => {
                    setPasswordTab("history");
                    handleLoadCredentialHistory();
                  }}
                  className={`px-4 py-2.5 border-b-2 transition-colors ${
                    passwordTab === "history"
                      ? "border-[var(--brand)] text-[var(--brand)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  سجل التدوير
                </button>
              )}
            </div>

            {/* Tab: Rotate / Set Password */}
            {passwordTab === "rotate" && (
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--foreground)]">
                    كلمة المرور الجديدة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    maxLength={4096}
                    dir="ltr"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-mono"
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--foreground)]">
                    سبب التدوير / التعيين <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={passwordReason}
                    onChange={(e) => setPasswordReason(e.target.value)}
                    required
                    maxLength={1000}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
                    placeholder="مثال: إعداد كلمة مرور الحساب لأول مرة"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closePasswordModal}
                    disabled={passwordSubmitting}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={passwordSubmitting || !newPassword.trim()}
                    className="bg-[var(--brand)] text-white hover:opacity-90"
                  >
                    {passwordSubmitting ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
                  </Button>
                </div>
              </form>
            )}

            {/* Tab: Reveal Password */}
            {passwordTab === "reveal" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs text-[var(--muted)]">
                  يتم كشف كلمة المرور بناءً على طلبك الصريح ولا يتم حفظها في الذاكرة المؤقتة أو التخزين المحلي.
                </div>

                {revealedPassword ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                      <span className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-200 select-all" dir="ltr">
                        {revealedPassword}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCopyPassword}
                        className="gap-1.5 text-xs"
                      >
                        {copiedPassword ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            تم النسخ
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            نسخ
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Button
                      type="button"
                      onClick={handleRevealPassword}
                      disabled={revealLoading}
                      className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
                    >
                      <Eye className="h-4 w-4" />
                      {revealLoading ? "جارٍ الاستعلام..." : "كشف كلمة المرور الآن"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: History */}
            {passwordTab === "history" && (
              <div className="space-y-3">
                {historyLoading ? (
                  <div className="py-6 text-center text-xs text-[var(--muted)]">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[var(--brand)]" />
                    جارٍ تحميل سجل التدوير...
                  </div>
                ) : credentialHistory.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--muted)]">
                    لا يوجد سجل تدوير سابق لكلمات مرور هذا الحساب.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] text-xs">
                    {credentialHistory.map((item) => (
                      <div key={item.id} className="p-3 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-[var(--foreground)]">
                          <span>الإصدار: {item.version}</span>
                          <span className="text-[var(--muted)]" dir="ltr">
                            {new Date(item.rotatedAtUtc).toLocaleString("ar-SA")}
                          </span>
                        </div>
                        <p className="text-[var(--muted)]">{item.reason || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 3. Modal: Assign Rider                                        */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(assigningAccount)}
        onClose={() => setAssigningAccount(null)}
        title={`تعيين مندوب للحساب — ${assigningAccount?.code || ""}`}
        maxWidth="max-w-md"
      >
        {assigningAccount && (
          <form onSubmit={handleAssignRider} className="space-y-4" dir="rtl">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                اختر المندوب الفعلي <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={selectedRiderId}
                onChange={setSelectedRiderId}
                options={riders.map((r) => ({
                  value: r.id,
                  label: `${r.fullNameAr} (${r.iqamaNo || "بدون إقامة"})`,
                  keywords: `${r.fullNameAr} ${r.iqamaNo || ""}`,
                }))}
                placeholder="ابحث بالاسم أو رقم الإقامة..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                تاريخ بدء التكليف <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={assignEffectiveFrom}
                onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">سبب التعيين</label>
              <input
                type="text"
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAssigningAccount(null)}
                disabled={assignSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={assignSubmitting || !selectedRiderId}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {assignSubmitting ? "جارٍ التعيين..." : "تأكيد التعيين"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 4. Modal: Release Rider                                       */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(releasingAccount)}
        onClose={() => setReleasingAccount(null)}
        title={`إنهاء تكليف المندوب — ${releasingAccount?.code || ""}`}
        maxWidth="max-w-md"
      >
        {releasingAccount && releasingAccount.currentAssignment && (
          <form onSubmit={handleReleaseRider} className="space-y-4" dir="rtl">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              أنت على وشك إنهاء تكليف المندوب{" "}
              <strong>{releasingAccount.currentAssignment.actualRiderNameAr}</strong> من هذا الحساب.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                تاريخ انتهاء التكليف (شامل) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={releaseEffectiveTo}
                onChange={(e) => setReleaseEffectiveTo(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">سبب إنهاء التكليف</label>
              <input
                type="text"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReleasingAccount(null)}
                disabled={releaseSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={releaseSubmitting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {releaseSubmitting ? "جارٍ الإنهاء..." : "إنهاء التكليف الآن"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 5. Modal: Assignment History                                  */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(historyAccount)}
        onClose={() => setHistoryAccount(null)}
        title={`سجل تكليفات الحساب — ${historyAccount?.code || ""}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4" dir="rtl">
          {assignmentHistoryLoading ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--brand)]" />
              جارٍ تحميل سجل التكليفات...
            </div>
          ) : assignmentHistoryList.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--muted)]">
              لا توجد تكليفات سابقة مسجلة لهذا الحساب.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border)] font-bold text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2.5">المندوب الفعلي</th>
                    <th className="px-3 py-2.5">من تاريخ</th>
                    <th className="px-3 py-2.5">إلى تاريخ</th>
                    <th className="px-3 py-2.5">الحالة</th>
                    <th className="px-3 py-2.5">السبب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {assignmentHistoryList.map((asgn) => (
                    <tr key={asgn.id} className="hover:bg-[var(--subtle-bg)]">
                      <td className="px-3 py-2 font-semibold text-[var(--foreground)]">
                        {asgn.actualRiderNameAr || "مندوب سابق"}
                      </td>
                      <td className="px-3 py-2 font-mono" dir="ltr">
                        {asgn.effectiveFrom}
                      </td>
                      <td className="px-3 py-2 font-mono" dir="ltr">
                        {asgn.effectiveTo || "مستمر"}
                      </td>
                      <td className="px-3 py-2">
                        {asgn.status === "Active" ? (
                          <Badge tone="green">نشط</Badge>
                        ) : asgn.status === "Ended" ? (
                          <Badge tone="gray">منتهي</Badge>
                        ) : (
                          <Badge tone="red">ملغي</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">
                        {asgn.startReason || asgn.endReason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
