// src/app/admin/ninja/accounts/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getNinjaPlatform,
  ensureNinjaPlatform,
  getNinjaAccounts,
  assignNinjaAccount,
  returnNinjaAccount,
  updateNinjaCredentials,
  getRiyadhTodayDate,
  formatRiyadhDateTime,
  isCooldownActive,
  formatRemainingCooldown,
  type NinjaAccountResponse,
  type NinjaAssignRequest,
  type NinjaReturnRequest,
  type NinjaCredentialRequest,
} from "@/lib/ninja/api";
import {
  createPlatformAccount,
  type PlatformResponse,
  type AccountUpsertRequest,
} from "@/lib/platforms/api";
import {
  listOperatingCities,
  listSponsors,
  listRiders,
  type OperatingCity,
  type Sponsor,
} from "@/lib/workforce/api";
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
  Zap,
  Search,
  RefreshCw,
  UserPlus,
  UserCheck,
  UserMinus,
  KeyRound,
  AlertTriangle,
  FileSpreadsheet,
  Copy,
  Check,
  Info,
  Clock,
  Plus,
  Lock,
} from "lucide-react";

export default function NinjaAccountsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Permissions
  const canRead = can("platform_accounts.read");
  const canUpdate = can("platform_accounts.update");
  const canAssign = can("platform_assignments.create") && canUpdate;
  const canReturn = can("platform_assignments.delete") && canUpdate;
  const canRotatePassword = can("platform_credentials.rotate");
  const canCreateAccount = can("platform_accounts.create");

  // Core Data States
  const [platform, setPlatform] = useState<PlatformResponse | null>(null);
  const [accounts, setAccounts] = useState<NinjaAccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lookups
  const [cities, setCities] = useState<OperatingCity[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);

  // Pagination (no total count from server)
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCooldown, setFilterCooldown] = useState<"all" | "active" | "ready">("all");

  const todayRiyadh = useMemo(() => getRiyadhTodayDate(), []);

  // -------------------------------------------------------------
  // Modals States
  // -------------------------------------------------------------

  // 1. Assign Modal
  const [assigningAccount, setAssigningAccount] = useState<NinjaAccountResponse | null>(null);
  const [assignRiderId, setAssignRiderId] = useState("");
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(todayRiyadh);
  const [assignPhone, setAssignPhone] = useState("");
  const [assignPassword, setAssignPassword] = useState("");
  const [assignReason, setAssignReason] = useState("تعيين حساب نينجا للمندوب");
  const [assignWasBackdated, setAssignWasBackdated] = useState(false);
  const [assignBackdatedReason, setAssignBackdatedReason] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // 2. Return Modal
  const [releasingAccount, setReleasingAccount] = useState<NinjaAccountResponse | null>(null);
  const [returnEffectiveTo, setReturnEffectiveTo] = useState(todayRiyadh);
  const [returnPhone, setReturnPhone] = useState("");
  const [returnPassword, setReturnPassword] = useState("");
  const [returnReason, setReturnReason] = useState("إرجاع حساب نينجا من قِبل المندوب");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // 3. Update Credentials Modal
  const [credAccount, setCredAccount] = useState<NinjaAccountResponse | null>(null);
  const [credPhone, setCredPhone] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credReason, setCredReason] = useState("تحديث بيانات الاتصال بالحساب");
  const [credSubmitting, setCredSubmitting] = useState(false);

  // 4. Create Account Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCaptainId, setCreateCaptainId] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createCityId, setCreateCityId] = useState("");
  const [createSponsorId, setCreateSponsorId] = useState("");
  const [createOwnerRiderId, setCreateOwnerRiderId] = useState("");
  const [createPaymentModel, setCreatePaymentModel] = useState<string>("PayPerOrder");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // -------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------

  const loadLookups = async () => {
    try {
      const [plat, cityList, sponsorList, riderList] = await Promise.all([
        getNinjaPlatform().catch(() => null),
        listOperatingCities().catch(() => []),
        listSponsors().catch(() => []),
        listRiders().catch(() => []),
      ]);
      setPlatform(plat);
      setCities(cityList);
      setSponsors(sponsorList);
      setRiders(riderList);
    } catch (e) {
      console.warn("Could not load lookups", e);
    }
  };

  const loadAccounts = async (targetPage = page) => {
    if (!canRead) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getNinjaAccounts({ page: targetPage, pageSize });
      const items = res?.items || [];
      setAccounts(items);
      setHasMore(items.length >= pageSize);
    } catch (err: any) {
      console.error("Failed to load Ninja accounts", err);
      const msg =
        err?.message ||
        "تعذر جلب حسابات نينجا. يرجى التأكد من نشر الواجهة الخلفية (Backend API) وتشغيلها على الخادم.";
      setFetchError(msg);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadAccounts(page);
  }, [page, canRead]);

  // Rider map for quick lookup
  const riderMap = useMemo(() => {
    const map = new Map<string, Rider>();
    for (const r of riders) {
      map.set(r.id, r);
    }
    return map;
  }, [riders]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const captain = (acc.captainId || "").toLowerCase();
        const code = (acc.code || "").toLowerCase();
        const phone = (acc.phoneNumber || "").toLowerCase();
        const ownerNameAr = (acc.ownerRiderNameAr || "").toLowerCase();
        const actualNameAr = (acc.actualRiderNameAr || "").toLowerCase();
        const matches =
          captain.includes(q) ||
          code.includes(q) ||
          phone.includes(q) ||
          ownerNameAr.includes(q) ||
          actualNameAr.includes(q);
        if (!matches) return false;
      }

      // Status
      if (filterStatus !== "all") {
        if ((acc.status || "").toLowerCase() !== filterStatus.toLowerCase()) {
          return false;
        }
      }

      // Cooldown
      if (filterCooldown !== "all") {
        const active = isCooldownActive(acc.passwordChangeAllowedAtUtc);
        if (filterCooldown === "active" && !active) return false;
        if (filterCooldown === "ready" && active) return false;
      }

      return true;
    });
  }, [accounts, search, filterStatus, filterCooldown]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // -------------------------------------------------------------
  // Actions: Assign
  // -------------------------------------------------------------
  const openAssignModal = (account: NinjaAccountResponse) => {
    setAssigningAccount(account);
    setAssignRiderId("");
    setAssignEffectiveFrom(todayRiyadh);
    setAssignPhone(account.phoneNumber || "");
    setAssignPassword("");
    setAssignReason("تعيين حساب نينجا للمندوب");
    setAssignWasBackdated(false);
    setAssignBackdatedReason("");
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAccount) return;

    if (!assignRiderId) {
      toast.error("تنبيه", "يرجى اختيار المندوب الفعلي المراد تعيين الحساب له.");
      return;
    }
    if (assignEffectiveFrom > todayRiyadh) {
      toast.error("تنبيه", "لا يمكن لتاريخ التعيين أن يكون في المستقبل حسب توقيت الرياض.");
      return;
    }
    const isBackdated = assignEffectiveFrom < todayRiyadh;
    if (isBackdated && (!assignWasBackdated || !assignBackdatedReason.trim())) {
      toast.error("تنبيه", "التعيين بتاريخ سابق يتطلب تحديد خانة التعيين بأثر رجعي وذكر السبب.");
      return;
    }
    if (!assignPhone.trim() || assignPhone.trim().length < 7) {
      toast.error("تنبيه", "يرجى إدخال رقم هاتف صالح (7 خانات على الأقل).");
      return;
    }

    setAssignSubmitting(true);
    try {
      const payload: NinjaAssignRequest = {
        actualRiderProfileId: assignRiderId,
        effectiveFrom: assignEffectiveFrom,
        phoneNumber: assignPhone.trim(),
        newPassword: assignPassword.trim() ? assignPassword.trim() : null,
        reason: assignReason.trim() || null,
        wasBackdated: isBackdated,
        backdatedReason: isBackdated ? assignBackdatedReason.trim() : null,
      };

      const res = await assignNinjaAccount(assigningAccount.id, payload);

      // Handle notification / cooldown warning
      if (res.credentials?.notification) {
        toast.warning(
          "تم التعيين مع تنبيه",
          isEn ? res.credentials.notification.messageEn : res.credentials.notification.messageAr
        );
      } else if (res.credentials?.passwordChanged) {
        toast.success("تم بنجاح", "تم تعيين الحساب وتحديث كلمة المرور بنجاح.");
      } else {
        toast.success("تم بنجاح", "تم تعيين حساب نينجا للمندوب وتحديث الهاتف بنجاح.");
      }

      setAssigningAccount(null);
      loadAccounts(page);
    } catch (err: any) {
      console.error("Assign error", err);
      if (err?.status === 409) {
        toast.error("تعارض في السجل (409)", "تم تعديل الحساب بالتزامن. يرجى مراجعة البيانات الحالية وإعادة المحاولة.");
        loadAccounts(page);
      }
    } finally {
      setAssignSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Return
  // -------------------------------------------------------------
  const openReturnModal = (account: NinjaAccountResponse) => {
    setReleasingAccount(account);
    setReturnEffectiveTo(todayRiyadh);
    setReturnPhone(account.phoneNumber || "");
    setReturnPassword("");
    setReturnReason("إرجاع حساب نينجا من قِبل المندوب");
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingAccount) return;

    if (returnEffectiveTo > todayRiyadh) {
      toast.error("تنبيه", "لا يمكن لتاريخ الإرجاع أن يكون بعد اليوم في توقيت الرياض.");
      return;
    }
    if (releasingAccount.assignmentEffectiveFrom && returnEffectiveTo < releasingAccount.assignmentEffectiveFrom) {
      toast.error("تنبيه", "تاريخ الإرجاع لا يمكن أن يسبق تاريخ بدء التعيين.");
      return;
    }
    if (!returnPhone.trim() || returnPhone.trim().length < 7) {
      toast.error("تنبيه", "يرجى إدخال رقم الهاتف البديل المستلم بعد الإرجاع.");
      return;
    }

    const cooldownActive = isCooldownActive(releasingAccount.passwordChangeAllowedAtUtc);
    if (!cooldownActive && !returnPassword.trim()) {
      toast.error(
        "تنبيه كلمة المرور",
        "فترة الانتظار منتهية؛ يلزم إدخال كلمة مرور جديدة ومختلفة عند إرجاع الحساب."
      );
      return;
    }
    if (!releasingAccount.hasPassword && !returnPassword.trim()) {
      toast.error(
        "تنبيه كلمة المرور",
        "لم يسبق تسجيل كلمة مرور لهذا الحساب؛ يلزم إدخال كلمة مرور عند الإرجاع."
      );
      return;
    }

    const rowVersion = releasingAccount.assignmentRowVersion;
    if (!rowVersion) {
      toast.error("خطأ", "رمز إصدار التعيين (assignmentRowVersion) مفقود؛ تعذر إكمال الإرجاع.");
      return;
    }

    setReturnSubmitting(true);
    try {
      const payload: NinjaReturnRequest = {
        effectiveTo: returnEffectiveTo,
        phoneNumber: returnPhone.trim(),
        newPassword: returnPassword.trim() ? returnPassword.trim() : null,
        reason: returnReason.trim() || "إرجاع الحساب",
        rowVersion,
        status: "Ended",
      };

      const res = await returnNinjaAccount(releasingAccount.id, payload);

      if (res.credentials?.notification) {
        toast.warning(
          "تم الإرجاع مع تنبيه",
          isEn ? res.credentials.notification.messageEn : res.credentials.notification.messageAr
        );
      } else if (res.credentials?.passwordChanged) {
        toast.success("تم بنجاح", "تم إنهاء تعيين الحساب وتغيير كلمة المرور بنجاح.");
      } else {
        toast.success("تم بنجاح", "تم إنهاء تعيين حساب نينجا بنجاح.");
      }

      setReleasingAccount(null);
      loadAccounts(page);
    } catch (err: any) {
      console.error("Return error", err);
      if (err?.status === 409) {
        toast.error("تعارض في السجل (409)", "تم تعديل تعيين الحساب مسبقاً. يرجى مراجعة السجل.");
        loadAccounts(page);
      }
    } finally {
      setReturnSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Update Credentials
  // -------------------------------------------------------------
  const openCredModal = (account: NinjaAccountResponse) => {
    setCredAccount(account);
    setCredPhone(account.phoneNumber || "");
    setCredPassword("");
    setCredReason("تحديث بيانات الاتصال");
  };

  const handleCredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credAccount) return;

    const hasPhone = Boolean(credPhone.trim());
    const hasPwd = Boolean(credPassword.trim());

    if (!hasPhone && !hasPwd) {
      toast.error("تنبيه", "يجب إدخال رقم هاتف جديد أو كلمة مرور جديدة على الأقل.");
      return;
    }
    if (hasPhone && credPhone.trim().length < 7) {
      toast.error("تنبيه", "رقم الهاتف غير صالح (يجب أن يكون 7 أرقام على الأقل).");
      return;
    }
    if (!credReason.trim()) {
      toast.error("تنبيه", "سبب التحديث مطلوب.");
      return;
    }

    setCredSubmitting(true);
    try {
      const payload: NinjaCredentialRequest = {
        phoneNumber: hasPhone ? credPhone.trim() : null,
        newPassword: hasPwd ? credPassword.trim() : null,
        reason: credReason.trim(),
        rowVersion: credAccount.rowVersion,
      };

      const res = await updateNinjaCredentials(credAccount.id, payload);

      if (res.notification) {
        toast.warning(
          "تم التحديث مع تنبيه",
          isEn ? res.notification.messageEn : res.notification.messageAr
        );
      } else if (res.passwordChanged) {
        toast.success("تم بنجاح", "تم تحديث كلمة المرور ورقم الهاتف بنجاح.");
      } else {
        toast.success("تم بنجاح", "تم تحديث رقم هاتف الحساب بنجاح.");
      }

      setCredAccount(null);
      loadAccounts(page);
    } catch (err: any) {
      console.error("Cred update error", err);
      if (err?.status === 409) {
        toast.error("تعارض في السجل (409)", "تم تعديل الحساب بالتزامن. يرجى مراجعة البيانات والمحاولة مجدداً.");
        loadAccounts(page);
      }
    } finally {
      setCredSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Create Account in ERP
  // -------------------------------------------------------------
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCaptainId.trim() || !createCityId || !createSponsorId || !createOwnerRiderId) {
      toast.error("تنبيه", "يرجى تعبئة كافة الحقول الإلزامية لإنشاء الحساب.");
      return;
    }

    setCreateSubmitting(true);
    try {
      // Ensure platform NINJA exists
      const plat = await ensureNinjaPlatform();
      setPlatform(plat);

      const code = createCode.trim() || `NINJA-${createCaptainId.trim()}`;
      const payload: AccountUpsertRequest = {
        platformId: plat.id,
        operatingCityId: createCityId,
        sponsorId: createSponsorId,
        ownerRiderProfileId: createOwnerRiderId,
        code,
        externalAccountId: createCaptainId.trim(), // Captain ID from workbook
        paymentModel: createPaymentModel,
        status: "Available",
        notes: "حساب منصة نينجا جديد",
      };

      await createPlatformAccount(payload);
      toast.success("تم بنجاح", `تم إنشاء حساب نينجا برقم كابتن ${createCaptainId.trim()} بنجاح.`);

      setIsCreateOpen(false);
      setCreateCaptainId("");
      setCreateCode("");
      loadAccounts(1);
    } catch (err: any) {
      console.error("Create account error", err);
      toast.error("خطأ", err?.message || "تعذر إنشاء حساب المنصة.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Excel Export
  // -------------------------------------------------------------
  const handleExport = () => {
    exportToExcel({
      filename: "ninja-accounts-report",
      sheetName: "حسابات نينجا",
      data: filteredAccounts,
      columns: [
        { header: "كابتن ID", accessor: (a) => a.captainId, isText: true },
        { header: "كود الحساب", accessor: (a) => a.code || "—", isText: true },
        { header: "حالة الحساب", accessor: (a) => a.status },
        {
          header: "المالك المسجل",
          accessor: (a) => a.ownerRiderNameAr || a.ownerEmployeeId || "—",
        },
        {
          header: "المندوب الفعلي",
          accessor: (a) => a.actualRiderNameAr || "غير معين",
        },
        {
          header: "رقم الهاتف",
          accessor: (a) => a.phoneNumber || "لم يسجل بعد",
          isText: true,
        },
        {
          header: "كلمة المرور مسجلة",
          accessor: (a) => (a.hasPassword ? "نعم" : "لا"),
        },
        {
          header: "فترة الانتظار",
          accessor: (a) =>
            isCooldownActive(a.passwordChangeAllowedAtUtc)
              ? "نشطة (72 ساعة)"
              : "منتهية / متاحة",
        },
        {
          header: "موعد إتاحة كلمة المرور",
          accessor: (a) =>
            a.passwordChangeAllowedAtUtc
              ? formatRiyadhDateTime(a.passwordChangeAllowedAtUtc, "ar")
              : "—",
        },
      ],
    });
  };

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
            <span>الحسابات</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                حسابات منصة نينجا (Ninja Accounts)
              </h1>
              <p className="text-xs text-[var(--muted)]">
                إدارة كباتن وحسابات نينجا، ربط المناديب، متابعة فترات انتظار كلمات المرور والتوثيق الأمني.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => loadAccounts(page)}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={filteredAccounts.length === 0}
            className="gap-2 text-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            تصدير إكسل
          </Button>

          {canCreateAccount && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-purple-600 text-white hover:bg-purple-700 text-xs shadow-sm shadow-purple-600/30"
            >
              <Plus className="h-4 w-4" />
              إضافة حساب نينجا جديد
            </Button>
          )}
        </div>
      </div>

      {/* Error state alert if API fails */}
      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <span className="font-bold">تعذر الوصول إلى مسارات نينجا:</span>
            <span>{fetchError}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => loadAccounts(page)}>
              إعادة المحاولة
            </Button>
            <Link
              href="/admin/platforms/accounts"
              className="text-xs font-semibold text-red-700 underline hover:text-red-900 dark:text-red-400"
            >
              الانتقال إلى سجل حسابات المنصات العام
            </Link>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الكابتن، الاسم، الهاتف..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 pr-9 pl-3 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
            >
              <option value="all">كافة الحالات</option>
              <option value="Available">متاح (Available)</option>
              <option value="Assigned">معين (Assigned)</option>
              <option value="Suspended">موقوف (Suspended)</option>
              <option value="Retired">متقاعد / مستبعد</option>
            </select>
          </div>

          {/* Cooldown Filter */}
          <div>
            <select
              value={filterCooldown}
              onChange={(e) => setFilterCooldown(e.target.value as any)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
            >
              <option value="all">كافة فترات الانتظار (Cooldown)</option>
              <option value="active">فترة انتظار نشطة (أقل من 72 ساعة)</option>
              <option value="ready">متاح للتغيير (منتهية أو غير مسجلة)</option>
            </select>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center justify-end gap-2 text-xs text-[var(--muted)]">
            <span>إجمالي المعروض:</span>
            <span className="font-bold font-mono text-[var(--foreground)] text-sm">
              {filteredAccounts.length}
            </span>
            <span>حساب</span>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[var(--subtle-bg)] border-b border-[var(--border)] text-[var(--muted)] font-bold">
              <tr>
                <th className="px-4 py-3.5">كابتن ID (Captain ID)</th>
                <th className="px-4 py-3.5">حالة الحساب</th>
                <th className="px-4 py-3.5">المالك المسجل (Owner)</th>
                <th className="px-4 py-3.5">المندوب الفعلي (Actual Rider)</th>
                <th className="px-4 py-3.5">رقم الاتصال</th>
                <th className="px-4 py-3.5">كلمة المرور والانتظار</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-[var(--muted)]">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
                    جارٍ تحميل حسابات نينجا...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 mb-3">
                      <Zap className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-[var(--foreground)]">لا توجد حسابات نينجا مطابقة</p>
                    <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
                      لم يتم العثور على حسابات نينجا في النظام. يمكنك إضافة حساب نينجا جديد باستخدام رقم الكابتن
                      (Captain ID) المطابق لملفات العمل اليومية.
                    </p>
                    {canCreateAccount && (
                      <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="mt-4 gap-2 bg-purple-600 text-white hover:bg-purple-700 text-xs"
                      >
                        <Plus className="h-4 w-4" />
                        إضافة أول حساب نينجا
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const cooldownActive = isCooldownActive(acc.passwordChangeAllowedAtUtc);
                  const isAssigned = Boolean(acc.currentAssignmentId);
                  const isAvailable = (acc.status || "").toLowerCase() === "available" && !isAssigned;

                  return (
                    <tr key={acc.id} className="hover:bg-[var(--subtle-bg)]/50 transition-colors">
                      {/* Captain ID */}
                      <td className="px-4 py-3 font-mono font-bold text-sm text-[var(--foreground)]">
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <span>{acc.captainId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.captainId, acc.id)}
                            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)]"
                            title="نسخ رقم الكابتن"
                          >
                            {copiedId === acc.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {acc.code && acc.code !== acc.captainId && (
                          <span className="block text-[11px] font-normal text-[var(--muted)]">
                            {acc.code}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                            isAssigned
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                              : isAvailable
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAssigned
                                ? "bg-purple-600"
                                : isAvailable
                                ? "bg-emerald-600"
                                : "bg-gray-500"
                            }`}
                          />
                          {isAssigned ? "معين لمندوب" : acc.status || "متاح"}
                        </span>
                      </td>

                      {/* Registered Owner */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--foreground)]">
                          {acc.ownerRiderNameAr || acc.ownerRiderNameEn || "—"}
                        </div>
                        {acc.ownerEmployeeId && (
                          <div className="text-[11px] font-mono text-[var(--muted)]" dir="ltr">
                            Emp ID: {acc.ownerEmployeeId}
                          </div>
                        )}
                      </td>

                      {/* Actual Assigned Rider */}
                      <td className="px-4 py-3">
                        {acc.actualRiderProfileId ? (
                          <div>
                            <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 shrink-0" />
                              <span>{acc.actualRiderNameAr || acc.actualRiderNameEn || "مندوب معين"}</span>
                            </div>
                            {acc.actualEmployeeId && (
                              <span className="text-[11px] font-mono text-[var(--muted)]" dir="ltr">
                                Emp: {acc.actualEmployeeId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block rounded-md bg-gray-100 dark:bg-gray-800/60 px-2 py-0.5 text-[11px] text-[var(--muted)]">
                            غير معين
                          </span>
                        )}
                      </td>

                      {/* Phone Number */}
                      <td className="px-4 py-3 font-mono" dir="ltr">
                        {acc.phoneNumber ? (
                          <span className="font-semibold text-[var(--foreground)]">
                            {acc.phoneNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--muted)]">لم يسجل بعد</span>
                        )}
                      </td>

                      {/* Password Indicator & Cooldown Deadline */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            {acc.hasPassword ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                                <Lock className="h-3 w-3" />
                                مسجلة بالنظام
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                                <AlertTriangle className="h-3 w-3" />
                                غير مسجلة
                              </span>
                            )}
                          </div>

                          {cooldownActive ? (
                            <div
                              className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 px-2 py-0.5 text-[11px] text-rose-700 dark:text-rose-300"
                              title={formatRiyadhDateTime(acc.passwordChangeAllowedAtUtc, "ar")}
                            >
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="font-bold">
                                {formatRemainingCooldown(acc.passwordChangeAllowedAtUtc, "ar")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              متاحة للتغيير
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Assign Action */}
                          {isAvailable && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!canAssign}
                              onClick={() => openAssignModal(acc)}
                              className="gap-1 border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-purple-900 dark:hover:bg-purple-950/40 text-[11px] font-bold"
                              title="تعيين الحساب لمندوب"
                            >
                              <UserPlus className="h-3.5 w-3.5 text-purple-600" />
                              تعيين
                            </Button>
                          )}

                          {/* Return Action */}
                          {isAssigned && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!canReturn}
                              onClick={() => openReturnModal(acc)}
                              className="gap-1 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:hover:bg-rose-950/40 text-[11px] font-bold"
                              title="إرجاع الحساب وإنهاء التعيين"
                            >
                              <UserMinus className="h-3.5 w-3.5 text-rose-600" />
                              إرجاع
                            </Button>
                          )}

                          {/* Update Credentials (Phone / Password) */}
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!canUpdate}
                            onClick={() => openCredModal(acc)}
                            className="gap-1 text-[11px]"
                            title="تحديث رقم الهاتف وكلمة المرور"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                            بيانات الدخول
                          </Button>
                        </div>
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
      {/* 1. Modal: Assign Account                                      */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(assigningAccount)}
        onClose={() => setAssigningAccount(null)}
        title="تعيين حساب نينجا لمندوب"
        maxWidth="max-w-xl"
      >
        {assigningAccount && (
          <form onSubmit={handleAssignSubmit} className="space-y-4" dir="rtl">
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-xs dark:border-purple-900/50 dark:bg-purple-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[var(--muted)]">كابتن ID: </span>
                  <span className="font-bold font-mono text-purple-700 dark:text-purple-300">
                    {assigningAccount.captainId}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">المالك المسجل: </span>
                  <span className="font-bold text-[var(--foreground)]">
                    {assigningAccount.ownerRiderNameAr || assigningAccount.ownerEmployeeId || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Rider Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                المندوب الفعلي (Actual Rider) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={riders.map((r) => ({
                  value: r.id,
                  label: `${r.fullNameAr || r.fullNameEn} (${r.iqamaNo || r.employeeId})`,
                }))}
                value={assignRiderId}
                onChange={setAssignRiderId}
                placeholder="ابحث واختر المندوب الفعلي..."
              />
              <p className="text-[11px] text-[var(--muted)]">
                تطبق حدود التعيين القياسية: بحد أقصى حسابين لكل مندوب وحساب راتب واحد فقط.
              </p>
            </div>

            {/* Effective Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                تاريخ سريان التعيين <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={assignEffectiveFrom}
                onChange={(val) => {
                  setAssignEffectiveFrom(val);
                  if (val < todayRiyadh) {
                    setAssignWasBackdated(true);
                  } else {
                    setAssignWasBackdated(false);
                    setAssignBackdatedReason("");
                  }
                }}
                max={todayRiyadh}
                required
              />
              <p className="text-[11px] text-[var(--muted)]">
                لا يمكن أن يكون التاريخ بعد اليوم بتوقيت الرياض ({todayRiyadh}).
              </p>
            </div>

            {/* Backdated reason if < today */}
            {assignEffectiveFrom < todayRiyadh && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>تاريخ التعيين بأثر رجعي</span>
                </div>
                <Input
                  label="سبب التعيين بأثر رجعي *"
                  value={assignBackdatedReason}
                  onChange={(e) => setAssignBackdatedReason(e.target.value)}
                  placeholder="يرجى توضيح سبب التعيين بتاريخ سابق..."
                  required
                />
              </div>
            )}

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                رقم هاتف المندوب الجديد <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={assignPhone}
                onChange={(e) => setAssignPhone(e.target.value)}
                placeholder="مثال: 0501234567"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] font-mono outline-none focus:border-purple-600"
                dir="ltr"
              />
              <p className="text-[11px] text-[var(--muted)]">
                يتم تحديث رقم الهاتف فورياً في سجل التعيين ولا يخضع لفترة الانتظار.
              </p>
            </div>

            {/* Password (Optional, subject to cooldown) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--foreground)]">
                  كلمة المرور الجديدة (اختياري)
                </label>
                {isCooldownActive(assigningAccount.passwordChangeAllowedAtUtc) && (
                  <span className="text-[10px] font-bold text-rose-600">
                    فترة انتظار نشطة (72 ساعة)
                  </span>
                )}
              </div>

              {isCooldownActive(assigningAccount.passwordChangeAllowedAtUtc) ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 space-y-1">
                  <p>
                    الحساب تحت فترة انتظار تغيير كلمة المرور حتى:{" "}
                    <strong className="font-mono">
                      {formatRiyadhDateTime(assigningAccount.passwordChangeAllowedAtUtc, "ar")}
                    </strong>
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    سيتم تعيين الحساب وتحديث الهاتف مع الاحتفاظ بكلمة المرور المسجلة مسبقاً.
                  </p>
                </div>
              ) : (
                <>
                  <input
                    type="password"
                    value={assignPassword}
                    onChange={(e) => setAssignPassword(e.target.value)}
                    placeholder="اتركها فارغة للاحتفاظ بكلمة المرور الحالية..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] outline-none focus:border-purple-600 font-mono"
                    disabled={!canRotatePassword}
                  />
                  <p className="text-[11px] text-[var(--muted)]">
                    عند تسجيل كلمة مرور جديدة مختلفة، ستبدأ فترة انتظار جديدة مدتها 72 ساعة.
                  </p>
                </>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">ملاحظات / سبب التعيين</label>
              <textarea
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2.5 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
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
                disabled={assignSubmitting}
                className="bg-purple-600 text-white hover:bg-purple-700 min-w-[120px]"
              >
                {assignSubmitting ? "جارٍ الحفظ..." : "تأكيد تعيين الحساب"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 2. Modal: Return Account                                      */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(releasingAccount)}
        onClose={() => setReleasingAccount(null)}
        title="إنهاء التعيين وإرجاع حساب نينجا"
        maxWidth="max-w-xl"
      >
        {releasingAccount && (
          <form onSubmit={handleReturnSubmit} className="space-y-4" dir="rtl">
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs dark:border-rose-900/50 dark:bg-rose-950/30">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[var(--muted)]">كابتن ID: </span>
                  <span className="font-bold font-mono text-rose-700 dark:text-rose-300">
                    {releasingAccount.captainId}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">المندوب الفعلي الحالي: </span>
                  <span className="font-bold text-[var(--foreground)]">
                    {releasingAccount.actualRiderNameAr || releasingAccount.actualRiderNameEn || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Effective End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                تاريخ إنهاء التعيين (Effective End Date) <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={returnEffectiveTo}
                onChange={setReturnEffectiveTo}
                max={todayRiyadh}
                min={releasingAccount.assignmentEffectiveFrom || undefined}
                required
              />
              <p className="text-[11px] text-[var(--muted)]">
                التاريخ لا يمكن أن يسبق تاريخ بدء التعيين ولا يتجاوز اليوم بتوقيت الرياض.
              </p>
            </div>

            {/* Replacement Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                رقم الهاتف البديل بعد الإرجاع <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={returnPhone}
                onChange={(e) => setReturnPhone(e.target.value)}
                placeholder="مثال: 0507654321"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] font-mono outline-none focus:border-rose-600"
                dir="ltr"
              />
              <p className="text-[11px] text-[var(--muted)]">
                رقم الاتصال المعتمد للعهدة أو مشرف المنصة بعد استلام الحساب من المندوب.
              </p>
            </div>

            {/* Password Requirement on Return */}
            {(() => {
              const cooldown = isCooldownActive(releasingAccount.passwordChangeAllowedAtUtc);
              const mustProvide = !cooldown || !releasingAccount.hasPassword;

              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--foreground)]">
                      كلمة المرور الجديدة {mustProvide ? <span className="text-red-500">*</span> : "(اختياري)"}
                    </label>
                    {cooldown && (
                      <span className="text-[10px] font-bold text-amber-600">
                        فترة الانتظار نشطة (يمكن إرسال null)
                      </span>
                    )}
                  </div>

                  {cooldown ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                      فترة انتظار كلمة المرور نشطة حتى{" "}
                      <strong>
                        {formatRiyadhDateTime(releasingAccount.passwordChangeAllowedAtUtc, "ar")}
                      </strong>
                      . سيتم إرجاع الحساب مع الاحتفاظ بكلمة المرور السابقة.
                    </div>
                  ) : (
                    <>
                      <input
                        type="password"
                        value={returnPassword}
                        onChange={(e) => setReturnPassword(e.target.value)}
                        placeholder="أدخل كلمة مرور جديدة ومختلفة..."
                        required={mustProvide}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] font-mono outline-none focus:border-rose-600"
                        disabled={!canRotatePassword}
                      />
                      <p className="text-[11px] text-[var(--muted)]">
                        لأسباب أمنية، يلزم تدوير وتغيير كلمة المرور عند استلام الحساب ما لم تكن فترة الانتظار نشطة.
                      </p>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                سبب الإرجاع <span className="text-red-500">*</span>
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={2}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2.5 text-xs text-[var(--foreground)] outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReleasingAccount(null)}
                disabled={returnSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={returnSubmitting}
                className="bg-rose-600 text-white hover:bg-rose-700 min-w-[120px]"
              >
                {returnSubmitting ? "جارٍ الإرجاع..." : "تأكيد إرجاع الحساب"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 3. Modal: Update Phone & Password                             */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(credAccount)}
        onClose={() => setCredAccount(null)}
        title="تحديث بيانات الاتصال والدخول لحساب نينجا"
        maxWidth="max-w-xl"
      >
        {credAccount && (
          <form onSubmit={handleCredSubmit} className="space-y-4" dir="rtl">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[var(--muted)]">كابتن ID: </span>
                  <span className="font-bold font-mono text-[var(--foreground)]">
                    {credAccount.captainId}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted)]">الحالة: </span>
                  <span className="font-bold text-[var(--foreground)]">{credAccount.status}</span>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                رقم الهاتف (Contact Phone)
              </label>
              <input
                type="text"
                value={credPhone}
                onChange={(e) => setCredPhone(e.target.value)}
                placeholder="مثال: 0501234567"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] font-mono outline-none focus:border-amber-600"
                dir="ltr"
              />
              <p className="text-[11px] text-[var(--muted)]">
                تحديث الهاتف يطبق فورياً في النظام دون التقيد بفترة انتظار كلمة المرور.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--foreground)]">
                  كلمة المرور الجديدة
                </label>
                {isCooldownActive(credAccount.passwordChangeAllowedAtUtc) && (
                  <span className="text-[10px] font-bold text-rose-600">
                    فترة انتظار نشطة (72 ساعة)
                  </span>
                )}
              </div>

              {isCooldownActive(credAccount.passwordChangeAllowedAtUtc) ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  <p>
                    لا يمكن تغيير كلمة المرور قبل انتهاء فترة الانتظار:{" "}
                    <strong>
                      {formatRiyadhDateTime(credAccount.passwordChangeAllowedAtUtc, "ar")}
                    </strong>
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                    ({formatRemainingCooldown(credAccount.passwordChangeAllowedAtUtc, "ar")})
                  </p>
                </div>
              ) : (
                <>
                  <input
                    type="password"
                    value={credPassword}
                    onChange={(e) => setCredPassword(e.target.value)}
                    placeholder="أدخل كلمة مرور جديدة أو اتركها فارغة لتغيير الهاتف فقط..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] font-mono outline-none focus:border-amber-600"
                    disabled={!canRotatePassword}
                  />
                  <p className="text-[11px] text-[var(--muted)]">
                    عند إدخال كلمة مرور جديدة، يتم بدء فترة انتظار جديدة مدتها 72 ساعة.
                  </p>
                </>
              )}
            </div>

            {/* Important Notice */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-[11px] text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <strong>تنبيه يدوي للمشغل:</strong> هذه الشاشة تسجل وتوثق بيانات الاعتماد في نظام ERP الداخلي فقط،
                ولا تتصل بتطبيق نينجا لتغيير كلمة المرور تلقائياً لدى المزود. يجب على المشغل تحديثها يدوياً لدى نينجا.
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                سبب التحديث <span className="text-red-500">*</span>
              </label>
              <textarea
                value={credReason}
                onChange={(e) => setCredReason(e.target.value)}
                rows={2}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2.5 text-xs text-[var(--foreground)] outline-none focus:border-amber-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCredAccount(null)}
                disabled={credSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={credSubmitting}
                className="bg-amber-600 text-white hover:bg-amber-700 min-w-[120px]"
              >
                {credSubmitting ? "جارٍ الحفظ..." : "حفظ التحديث"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 4. Modal: Create Ninja Account in ERP                         */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="إضافة حساب نينجا جديد في النظام"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4" dir="rtl">
          <p className="text-xs text-[var(--muted)]">
            يقوم هذا النموذج بإنشاء حساب منصة نينجا في ERP باستخدام رقم الكابتن (Captain ID)
            المطابق لملفات العمل اليومية.
          </p>

          {/* Captain ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              رقم الكابتن (Captain ID / externalAccountId) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createCaptainId}
              onChange={(e) => setCreateCaptainId(e.target.value)}
              placeholder="مثال: 0012345 أو 98765"
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] font-mono outline-none focus:border-purple-600"
              dir="ltr"
            />
            <p className="text-[11px] text-[var(--muted)]">
              يجب الحفاظ على الأصفار في البداية إن وجدت لمطابقة ملفات إكسل اليومية.
            </p>
          </div>

          {/* Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              كود الحساب الداخلي (اختياري)
            </label>
            <input
              type="text"
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
              placeholder={`افتراضي: NINJA-${createCaptainId || "XXXX"}`}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] font-mono outline-none focus:border-purple-600"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              مدينة التشغيل <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={cities.map((c) => ({
                value: c.id,
                label: c.globalCityAr || c.code,
              }))}
              value={createCityId}
              onChange={setCreateCityId}
              placeholder="اختر مدينة التشغيل..."
            />
          </div>

          {/* Sponsor */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              الكفيل النشط <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={sponsors.map((s) => ({
                value: s.id,
                label: s.registryNameAr || s.employerIdentityNumber,
              }))}
              value={createSponsorId}
              onChange={setCreateSponsorId}
              placeholder="اختر الكفيل..."
            />
          </div>

          {/* Owner Rider */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              المندوب المالك للحساب (Owner Rider Profile) <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={riders.map((r) => ({
                value: r.id,
                label: `${r.fullNameAr || r.fullNameEn} (${r.iqamaNo || r.employeeId})`,
              }))}
              value={createOwnerRiderId}
              onChange={setCreateOwnerRiderId}
              placeholder="اختر ملف المندوب المالك للحساب..."
            />
            <p className="text-[11px] text-[var(--muted)]">
              المالك هو الهوية المسجلة للحساب. أما المندوب الفعلي المشغل فيتم اختياره عند التعيين.
            </p>
          </div>

          {/* Payment Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">نموذج الدفع المعتمد</label>
            <select
              value={createPaymentModel}
              onChange={(e) => setCreatePaymentModel(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
            >
              <option value="PayPerOrder">بالطلب (PayPerOrder)</option>
              <option value="Salary">راتب شهري (Salary)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={createSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={createSubmitting}
              className="bg-purple-600 text-white hover:bg-purple-700 min-w-[120px]"
            >
              {createSubmitting ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
