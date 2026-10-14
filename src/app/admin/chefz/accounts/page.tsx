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
  getAllChefzReminders,
} from "@/lib/chefz/api";
import type {
  ChefzAccount,
  ChefzAccountType,
  ChefzAccountReminder,
} from "@/lib/chefz/types";
import {
  getPlatformAccounts,
  getAllPlatformAccounts,
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
  TableHeaderColumnFilter,
  TableHeaderDualFilter,
  type FilterOption,
} from "@/components/ui/TableHeaderFilter";
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
  Building2,
  MapPin,
  X,
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
  const [reminders, setReminders] = useState<ChefzAccountReminder[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters (Toolbar)
  const [search, setSearch] = useState("");
  const [filterSetupStatus, setFilterSetupStatus] = useState<string>("all"); // "all" | "configured" | "not_configured"
  const [filterType, setFilterType] = useState<string>("all"); // "all" | "Freelancer" | "FullTime"
  const [filterCityId, setFilterCityId] = useState("");
  const [filterSponsorId, setFilterSponsorId] = useState("");

  // Table Header Column Filters
  const [colFilterReminders, setColFilterReminders] = useState<string[]>([]);
  const [colFilterAssignments, setColFilterAssignments] = useState<string[]>([]);
  const [colFilterCityIds, setColFilterCityIds] = useState<string[]>([]);
  const [colFilterSponsorIds, setColFilterSponsorIds] = useState<string[]>([]);
  const [colFilterTypes, setColFilterTypes] = useState<string[]>([]);
  const [colFilterSetup, setColFilterSetup] = useState<string[]>([]);
  const [colFilterPassword, setColFilterPassword] = useState<string[]>([]);

  // Modals
  // 1. Chefz Setup / Configuration Modal
  const [setupAccount, setSetupAccount] = useState<JoinedAccount | null>(null);
  const [setupAccountType, setSetupAccountType] = useState<"Freelancer" | "FullTime">("Freelancer");
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

      // 2. Parallel fetch base accounts, chefz accounts, metadata, and reminders
      const [baseAccounts, chefzAccounts, cityList, sponsorList, riderList, reminderList] = await Promise.all([
        getAllPlatformAccounts({ platformId: plat.id, includeArchived: false }),
        getAllChefzAccounts().catch(() => [] as ChefzAccount[]),
        listOperatingCities().catch(() => []),
        listSponsors().catch(() => []),
        listRiders().catch(() => []),
        getAllChefzReminders().catch(() => [] as ChefzAccountReminder[]),
      ]);

      setCities(cityList);
      setSponsors(sponsorList);
      setRiders(riderList);
      setReminders(reminderList);

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

  // Reminder lookup map (FinalExit takes precedence over OutsideSponsorship)
  const reminderMap = useMemo(() => {
    const map = new Map<string, ChefzAccountReminder>();
    for (const r of reminders) {
      const existing = map.get(r.accountId);
      if (!existing || (existing.condition !== "FinalExit" && r.condition === "FinalExit")) {
        map.set(r.accountId, r);
      }
    }
    return map;
  }, [reminders]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((item) => {
      const { base, chefz } = item;
      const isConfigured = Boolean(chefz && chefz.accountType !== "Unconfigured");

      // 1. Setup filter (Toolbar)
      if (filterSetupStatus === "configured" && !isConfigured) return false;
      if (filterSetupStatus === "not_configured" && isConfigured) return false;

      // 2. Type filter (Toolbar)
      if (filterType !== "all") {
        if (!chefz || chefz.accountType !== filterType) return false;
      }

      // 3. City filter (Toolbar)
      if (filterCityId && base.operatingCityId !== filterCityId) return false;

      // 4. Sponsor filter (Toolbar)
      if (filterSponsorId && base.sponsorId !== filterSponsorId) return false;

      // 5. Column Filter: Reminders & Block Warnings
      if (colFilterReminders.length > 0) {
        const rem = reminderMap.get(base.id);
        const condition = rem?.condition === "FinalExit" ? "FinalExit" : rem ? "NearBlock" : "Clear";
        if (!colFilterReminders.includes(condition)) return false;
      }

      // 6. Column Filter: Assignment Status & Actual Rider
      if (colFilterAssignments.length > 0) {
        const curr = base.currentAssignment;
        const isAssigned = Boolean(curr);
        const riderName = curr?.actualRiderNameAr;
        const matchesAny = colFilterAssignments.some((f) => {
          if (f === "STATUS_ASSIGNED") return isAssigned;
          if (f === "STATUS_UNASSIGNED") return !isAssigned;
          if (f.startsWith("RIDER_")) return riderName === f.replace("RIDER_", "");
          return false;
        });
        if (!matchesAny) return false;
      }

      // 7. Column Filter: City
      if (colFilterCityIds.length > 0) {
        if (!base.operatingCityId || !colFilterCityIds.includes(base.operatingCityId)) return false;
      }

      // 8. Column Filter: Sponsor
      if (colFilterSponsorIds.length > 0) {
        if (!base.sponsorId || !colFilterSponsorIds.includes(base.sponsorId)) return false;
      }

      // 9. Column Filter: Account Type
      if (colFilterTypes.length > 0) {
        const typeKey = !chefz || chefz.accountType === "Unconfigured" ? "Unconfigured" : chefz.accountType;
        if (!colFilterTypes.includes(typeKey)) return false;
      }

      // 10. Column Filter: Setup Status
      if (colFilterSetup.length > 0) {
        const statusKey = isConfigured ? "configured" : "not_configured";
        if (!colFilterSetup.includes(statusKey)) return false;
      }

      // 11. Column Filter: Password Status
      if (colFilterPassword.length > 0) {
        const passKey = chefz?.hasPassword ? "has_password" : "no_password";
        if (!colFilterPassword.includes(passKey)) return false;
      }

      // 12. Search query
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
  }, [
    accounts,
    filterSetupStatus,
    filterType,
    filterCityId,
    filterSponsorId,
    colFilterReminders,
    colFilterAssignments,
    colFilterCityIds,
    colFilterSponsorIds,
    colFilterTypes,
    colFilterSetup,
    colFilterPassword,
    search,
    reminderMap,
  ]);

  // Statistics
  const stats = useMemo(() => {
    const total = accounts.length;
    let configured = 0;
    let assigned = 0;
    let freelancer = 0;
    let fullTime = 0;
    let withPassword = 0;
    let finalExit = 0;
    let nearBlock = 0;

    for (const a of accounts) {
      if (a.chefz && a.chefz.accountType !== "Unconfigured") {
        configured++;
        if (a.chefz.accountType === "Freelancer") freelancer++;
        if (a.chefz.accountType === "FullTime") fullTime++;
      }
      if (a.base.currentAssignment) assigned++;
      if (a.chefz?.hasPassword) withPassword++;

      const rem = reminderMap.get(a.base.id);
      if (rem?.condition === "FinalExit") finalExit++;
      else if (rem) nearBlock++;
    }

    const pending = total - configured;
    const atRisk = finalExit + nearBlock;
    const unassigned = total - assigned;

    return {
      total,
      configured,
      pending,
      assigned,
      unassigned,
      freelancer,
      fullTime,
      withPassword,
      finalExit,
      nearBlock,
      atRisk,
    };
  }, [accounts, reminderMap]);

  // Sponsor Account Distribution Statistics
  const sponsorStats = useMemo(() => {
    if (accounts.length === 0) return [];

    const map = new Map<
      string,
      {
        name: string;
        total: number;
        assigned: number;
        unassigned: number;
        configured: number;
        pending: number;
      }
    >();

    for (const a of accounts) {
      const id = a.base.sponsorId || "UNKNOWN";
      const name = a.base.sponsorNameAr || (id === "UNKNOWN" ? "بدون كفيل مسجل" : "كفيل غير معرف");

      if (!map.has(id)) {
        map.set(id, {
          name,
          total: 0,
          assigned: 0,
          unassigned: 0,
          configured: 0,
          pending: 0,
        });
      }

      const s = map.get(id)!;
      s.total++;
      if (a.base.currentAssignment) {
        s.assigned++;
      } else {
        s.unassigned++;
      }
      if (a.chefz && a.chefz.accountType !== "Unconfigured") {
        s.configured++;
      } else {
        s.pending++;
      }
    }

    const totalAccounts = accounts.length || 1;
    const list = Array.from(map.entries()).map(([sponsorId, data]) => ({
      sponsorId,
      name: data.name,
      total: data.total,
      assigned: data.assigned,
      unassigned: data.unassigned,
      configured: data.configured,
      pending: data.pending,
      percentage: Math.round((data.total / totalAccounts) * 100),
    }));

    return list.sort((a, b) => b.total - a.total);
  }, [accounts]);

  // -----------------------------------------------------------------
  // Table Header Filter Options with Live Counts
  // -----------------------------------------------------------------
  const reminderFilterOptions: FilterOption[] = useMemo(() => {
    let finalExitCount = 0;
    let nearBlockCount = 0;
    let clearCount = 0;
    for (const a of accounts) {
      const rem = reminderMap.get(a.base.id);
      if (rem?.condition === "FinalExit") finalExitCount++;
      else if (rem) nearBlockCount++;
      else clearCount++;
    }
    return [
      {
        value: "FinalExit",
        label: "خروج نهائي (معرض للبلوك)",
        sublabel: "تنبيه أحمر عالي الخطورة",
        count: finalExitCount,
      },
      {
        value: "NearBlock",
        label: "اقترب من البلوك",
        sublabel: "تنبيه أصفر تحذيري",
        count: nearBlockCount,
      },
      {
        value: "Clear",
        label: "سليم (بدون تنبيهات)",
        sublabel: "لا توجد مخاطر بلوك مسجلة",
        count: clearCount,
      },
    ];
  }, [accounts, reminderMap]);

  const assignmentFilterOptions: FilterOption[] = useMemo(() => {
    let assignedCount = 0;
    let unassignedCount = 0;
    const riderCounts = new Map<string, number>();

    for (const a of accounts) {
      const curr = a.base.currentAssignment;
      if (curr) {
        assignedCount++;
        const name = curr.actualRiderNameAr || "مندوب نشط";
        riderCounts.set(name, (riderCounts.get(name) || 0) + 1);
      } else {
        unassignedCount++;
      }
    }

    const options: FilterOption[] = [
      {
        value: "STATUS_ASSIGNED",
        label: "مخصص لمناديب (الكل)",
        sublabel: "حسابات لها مندوب نشط حالياً",
        count: assignedCount,
      },
      {
        value: "STATUS_UNASSIGNED",
        label: "غير مخصص (شاغر)",
        sublabel: "حسابات بدون مندوب حالي",
        count: unassignedCount,
      },
    ];

    const sortedRiders = Array.from(riderCounts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sortedRiders) {
      options.push({
        value: `RIDER_${name}`,
        label: name,
        sublabel: "مندوب فعلي معين",
        count,
      });
    }

    return options;
  }, [accounts]);

  const cityFilterOptions: FilterOption[] = useMemo(() => {
    const cityCounts = new Map<string, number>();
    for (const a of accounts) {
      if (a.base.operatingCityId) {
        cityCounts.set(a.base.operatingCityId, (cityCounts.get(a.base.operatingCityId) || 0) + 1);
      }
    }
    return cities
      .map((c) => ({
        value: c.id,
        label: c.globalCityAr,
        count: cityCounts.get(c.id) || 0,
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [accounts, cities]);

  const sponsorFilterOptions: FilterOption[] = useMemo(() => {
    const sponsorCounts = new Map<string, number>();
    for (const a of accounts) {
      if (a.base.sponsorId) {
        sponsorCounts.set(a.base.sponsorId, (sponsorCounts.get(a.base.sponsorId) || 0) + 1);
      }
    }
    return sponsors
      .map((s) => ({
        value: s.id,
        label: s.registryNameAr,
        count: sponsorCounts.get(s.id) || 0,
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [accounts, sponsors]);

  const typeFilterOptions: FilterOption[] = useMemo(() => {
    let freelancerCount = 0;
    let fullTimeCount = 0;
    let unconfiguredCount = 0;

    for (const a of accounts) {
      if (a.chefz?.accountType === "Freelancer") freelancerCount++;
      else if (a.chefz?.accountType === "FullTime") fullTimeCount++;
      else unconfiguredCount++;
    }

    return [
      {
        value: "Freelancer",
        label: "فريلانسر (15%)",
        sublabel: "عمولة من الأرباح",
        count: freelancerCount,
      },
      {
        value: "FullTime",
        label: "دوام كامل (25 ر.س)",
        sublabel: "رسوم يومية ثابتة",
        count: fullTimeCount,
      },
      {
        value: "Unconfigured",
        label: "غير معد لشيفز",
        sublabel: "يتطلب تحديد النوع",
        count: unconfiguredCount,
      },
    ];
  }, [accounts]);

  const setupFilterOptions: FilterOption[] = useMemo(() => {
    let configuredCount = 0;
    let notConfiguredCount = 0;

    for (const a of accounts) {
      if (a.chefz && a.chefz.accountType !== "Unconfigured") {
        configuredCount++;
      } else {
        notConfiguredCount++;
      }
    }

    return [
      {
        value: "configured",
        label: "معد لشيفز",
        sublabel: "تمت تهيئة النوع والهوية",
        count: configuredCount,
      },
      {
        value: "not_configured",
        label: "بانتظار الإعداد",
        sublabel: "غير معد على المنصة",
        count: notConfiguredCount,
      },
    ];
  }, [accounts]);

  const passwordFilterOptions: FilterOption[] = useMemo(() => {
    let hasCount = 0;
    let missingCount = 0;

    for (const a of accounts) {
      if (a.chefz?.hasPassword) {
        hasCount++;
      } else {
        missingCount++;
      }
    }

    return [
      {
        value: "has_password",
        label: "كلمة مرور محفوظة",
        sublabel: "مسجلة ومحدثة في النظام",
        count: hasCount,
      },
      {
        value: "no_password",
        label: "غير محفوظة",
        sublabel: "بدون كلمة مرور مسجلة",
        count: missingCount,
      },
    ];
  }, [accounts]);

  const hasAnyFilter = Boolean(
    search.trim() ||
    filterSetupStatus !== "all" ||
    filterType !== "all" ||
    filterCityId ||
    filterSponsorId ||
    colFilterReminders.length > 0 ||
    colFilterAssignments.length > 0 ||
    colFilterCityIds.length > 0 ||
    colFilterSponsorIds.length > 0 ||
    colFilterTypes.length > 0 ||
    colFilterSetup.length > 0 ||
    colFilterPassword.length > 0
  );

  const resetAllFilters = () => {
    setSearch("");
    setFilterSetupStatus("all");
    setFilterType("all");
    setFilterCityId("");
    setFilterSponsorId("");
    setColFilterReminders([]);
    setColFilterAssignments([]);
    setColFilterCityIds([]);
    setColFilterSponsorIds([]);
    setColFilterTypes([]);
    setColFilterSetup([]);
    setColFilterPassword([]);
  };

  const resetColumnFilters = () => {
    setColFilterReminders([]);
    setColFilterAssignments([]);
    setColFilterCityIds([]);
    setColFilterSponsorIds([]);
    setColFilterTypes([]);
    setColFilterSetup([]);
    setColFilterPassword([]);
  };

  const handleToggleSponsorFilter = (sponsorId: string) => {
    if (sponsorId === "UNKNOWN") return;
    if (filterSponsorId === sponsorId || (colFilterSponsorIds.length === 1 && colFilterSponsorIds[0] === sponsorId)) {
      setFilterSponsorId("");
      setColFilterSponsorIds([]);
    } else {
      setFilterSponsorId(sponsorId);
      setColFilterSponsorIds([sponsorId]);
    }
  };

  // -----------------------------------------------------------------
  // Handlers: Setup / Update Chefz Details
  // -----------------------------------------------------------------
  const openSetupModal = (item: JoinedAccount) => {
    setSetupAccount(item);
    setSetupConflictError(null);
    if (item.chefz && item.chefz.accountType !== "Unconfigured") {
      setSetupAccountType(item.chefz.accountType as "Freelancer" | "FullTime");
      setSetupReportIdNumber(item.chefz.reportIdNumber || "");
    } else {
      setSetupAccountType("Freelancer");
      setSetupReportIdNumber(item.chefz?.reportIdNumber || "");
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
        rowVersion: setupAccount.chefz?.accountType === "Unconfigured" ? null : setupAccount.chefz?.rowVersion || null,
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

      {/* Expanded Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-[var(--muted)]">إجمالي الحسابات</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--foreground)]" dir="ltr">
            {stats.total.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">حساب مسجل بالمنصة</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">معدة لشيفز</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400" dir="ltr">
            {stats.configured.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {stats.total > 0 ? `${Math.round((stats.configured / stats.total) * 100)}% جاهزية` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">بانتظار الإعداد</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400" dir="ltr">
            {stats.pending.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">تتطلب النوع والهوية</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">مخصصة لمناديب</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-600 dark:text-blue-400" dir="ltr">
            {stats.assigned.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {stats.unassigned} حساب شاغر
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">نوع العمل</p>
          <div className="mt-2 flex items-baseline gap-1.5" dir="ltr">
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{stats.freelancer}</span>
            <span className="text-[11px] text-[var(--muted)]">حر</span>
            <span className="text-[11px] text-[var(--muted)]">/</span>
            <span className="text-xl font-extrabold text-orange-600 dark:text-orange-400">{stats.fullTime}</span>
            <span className="text-[11px] text-[var(--muted)]">كامل</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">15% أرباح / 25 ر.س يومي</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">تنبيهات البلوك</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400" dir="ltr">
            {stats.atRisk.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {stats.finalExit} خروج نهائي • {stats.nearBlock} تحذيري
          </p>
        </div>
      </div>

      {/* Sponsor Accounts Breakdown */}
      {sponsorStats.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)]/10 text-[var(--brand)]">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--foreground)]">
                  توزيع حسابات شيفز حسب الكفلاء
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  إجمالي {sponsorStats.length} كفيل لديهم حسابات — اضغط على الكفيل للتصفية السريعة في الجدول
                </p>
              </div>
            </div>

            {(filterSponsorId || (colFilterSponsorIds.length > 0)) && (
              <button
                type="button"
                onClick={() => {
                  setFilterSponsorId("");
                  setColFilterSponsorIds([]);
                }}
                className="text-xs font-semibold text-[var(--brand)] hover:underline"
              >
                إلغاء تصفية الكفيل (عرض جميع الكفلاء)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {sponsorStats.map((item) => {
              const isSelected =
                filterSponsorId === item.sponsorId ||
                colFilterSponsorIds.includes(item.sponsorId);

              return (
                <button
                  key={item.sponsorId}
                  type="button"
                  onClick={() => handleToggleSponsorFilter(item.sponsorId)}
                  className={`group relative text-right rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-[var(--brand)] bg-[var(--brand)]/10 ring-2 ring-[var(--brand)]/40 shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)]/50 hover:bg-[var(--subtle-bg)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--brand)] transition-colors">
                      {item.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isSelected
                          ? "bg-[var(--brand)] text-white"
                          : "bg-slate-500/10 text-[var(--muted)] group-hover:bg-[var(--brand)]/10 group-hover:text-[var(--brand)]"
                      }`}
                    >
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-[var(--foreground)]" dir="ltr">
                        {item.total}
                      </span>
                      <span className="text-[11px] text-[var(--muted)] me-1"> حساب</span>
                    </div>

                    <div className="text-[11px] text-[var(--muted)] space-x-1 space-x-reverse">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold" title="مخصص لمناديب">
                        {item.assigned} مخصص
                      </span>
                      <span>•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold" title="شاغر بدون مندوب">
                        {item.unassigned} شاغر
                      </span>
                    </div>
                  </div>

                  {/* Progress bar representing assignment coverage */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full transition-all rounded-full ${
                        isSelected ? "bg-[var(--brand)]" : "bg-emerald-500 dark:bg-emerald-400"
                      }`}
                      style={{
                        width: `${item.total > 0 ? (item.assigned / item.total) * 100 : 0}%`,
                      }}
                      title={`${item.assigned} من أصل ${item.total} مخصص (${Math.round((item.assigned / item.total) * 100)}%)`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          {hasAnyFilter && (
            <button
              onClick={resetAllFilters}
              className="text-[var(--brand)] hover:underline font-semibold"
            >
              إعادة تعيين جميع الفلاتر
            </button>
          )}
        </div>

        {/* Active Column Filter Badges */}
        {(colFilterReminders.length > 0 ||
          colFilterAssignments.length > 0 ||
          colFilterCityIds.length > 0 ||
          colFilterSponsorIds.length > 0 ||
          colFilterTypes.length > 0 ||
          colFilterSetup.length > 0 ||
          colFilterPassword.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[var(--border)] text-xs">
            <span className="font-bold text-[var(--muted)]">فلاتر الأعمدة المطبقة:</span>

            {/* Reminders / Alert Chips */}
            {colFilterReminders.map((val) => {
              const opt = reminderFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                >
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterReminders((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}

            {/* Assignments Chips */}
            {colFilterAssignments.map((val) => {
              const opt = assignmentFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                >
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterAssignments((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}

            {/* City Chips */}
            {colFilterCityIds.map((cityId) => {
              const opt = cityFilterOptions.find((o) => o.value === cityId);
              return (
                <span
                  key={cityId}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  <MapPin size={10} />
                  <span>{opt?.label || cityId}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterCityIds((prev) => prev.filter((x) => x !== cityId))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}

            {/* Sponsor Chips */}
            {colFilterSponsorIds.map((sponsorId) => {
              const opt = sponsorFilterOptions.find((o) => o.value === sponsorId);
              return (
                <span
                  key={sponsorId}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                >
                  <Building2 size={10} />
                  <span>{opt?.label || sponsorId}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterSponsorIds((prev) => prev.filter((x) => x !== sponsorId))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}

            {/* Type Chips */}
            {colFilterTypes.map((typeVal) => {
              const opt = typeFilterOptions.find((o) => o.value === typeVal);
              return (
                <span
                  key={typeVal}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  <span>{opt?.label || typeVal}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterTypes((prev) => prev.filter((x) => x !== typeVal))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}

            {/* Setup Chips */}
            {colFilterSetup.map((setupVal) => {
              const opt = setupFilterOptions.find((o) => o.value === setupVal);
              return (
                <span
                  key={setupVal}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                >
                  <span>{opt?.label || setupVal}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterSetup((prev) => prev.filter((x) => x !== setupVal))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}

            {/* Password Chips */}
            {colFilterPassword.map((passVal) => {
              const opt = passwordFilterOptions.find((o) => o.value === passVal);
              return (
                <span
                  key={passVal}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                >
                  <span>{opt?.label || passVal}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterPassword((prev) => prev.filter((x) => x !== passVal))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              onClick={resetColumnFilters}
              className="text-red-600 dark:text-red-400 hover:underline ms-2 font-bold text-xs"
            >
              مسح فلاتر الأعمدة
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">كود الحساب / المعرف</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>المالك المسجل</span>
                    <TableHeaderColumnFilter
                      label="التنبيهات والمخاطر"
                      value={colFilterReminders}
                      onChange={setColFilterReminders}
                      options={reminderFilterOptions}
                      placeholder="تصفية بالتنبيهات..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>المندوب الفعلي الحالي</span>
                    <TableHeaderColumnFilter
                      label="المندوب والتخصيص"
                      value={colFilterAssignments}
                      onChange={setColFilterAssignments}
                      options={assignmentFilterOptions}
                      placeholder="تصفية بالتعيين أو المندوب..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>المدينة / الكفيل</span>
                    <TableHeaderDualFilter
                      label="المدينة والكفيل"
                      align="right"
                      tab1={{
                        id: "city",
                        label: "المدينة",
                        icon: <MapPin className="h-3 w-3" />,
                        values: colFilterCityIds,
                        onChange: setColFilterCityIds,
                        options: cityFilterOptions,
                        placeholder: "تصفية بالمدينة...",
                      }}
                      tab2={{
                        id: "sponsor",
                        label: "الكفيل",
                        icon: <Building2 className="h-3 w-3" />,
                        values: colFilterSponsorIds,
                        onChange: setColFilterSponsorIds,
                        options: sponsorFilterOptions,
                        placeholder: "تصفية بالكفيل...",
                      }}
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>نوع الحساب</span>
                    <TableHeaderColumnFilter
                      label="نوع الحساب"
                      value={colFilterTypes}
                      onChange={setColFilterTypes}
                      options={typeFilterOptions}
                      placeholder="تصفية بنوع الحساب..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">عمولة الشركة</th>
                <th className="px-4 py-3.5 whitespace-nowrap">هوية تقرير شيفز</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>حالة الإعداد</span>
                    <TableHeaderColumnFilter
                      label="حالة الإعداد"
                      value={colFilterSetup}
                      onChange={setColFilterSetup}
                      options={setupFilterOptions}
                      placeholder="تصفية بحالة الإعداد..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>كلمة المرور</span>
                    <TableHeaderColumnFilter
                      label="حالة كلمة المرور"
                      value={colFilterPassword}
                      onChange={setColFilterPassword}
                      options={passwordFilterOptions}
                      placeholder="تصفية بكلمة المرور..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">الإجراءات</th>
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

                      {/* Owner Rider & Reminders */}
                      <td className="px-4 py-3">
                        <div className="text-[var(--foreground)] font-medium">
                          {base.ownerRiderNameAr || "—"}
                        </div>
                        <div className="text-xs text-[var(--muted)]">المالك المسجل</div>

                        {/* Reminder Badge */}
                        {reminderMap.get(base.id) && (
                          <div className="mt-1">
                            {reminderMap.get(base.id)?.condition === "FinalExit" ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                title={reminderMap.get(base.id)?.message}
                              >
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                خروج نهائي — معرض للبلوك
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                title={reminderMap.get(base.id)?.message}
                              >
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                اقترب من البلوك
                              </span>
                            )}
                          </div>
                        )}
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
                        {chefz && chefz.accountType !== "Unconfigured" ? (
                          chefz.accountType === "Freelancer" ? (
                            <Badge tone="blue">فريلانسر</Badge>
                          ) : (
                            <Badge tone="orange">دوام كامل</Badge>
                          )
                        ) : (
                          <Badge tone="orange">إعداد الحساب مطلوب</Badge>
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
