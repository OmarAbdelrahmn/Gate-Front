// src/app/admin/chefz/accounts/page.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getChefzPlatform,
  getAllChefzAccountsWithSummary,
  getChefzAccount,
  updateChefzAccountDetails,
  updateChefzAccountStatus,
  updateChefzAssignmentStartDate,
  setChefzPassword,
  getChefzPassword,
  getAllChefzReminders,
} from "@/lib/chefz/api";
import type {
  ChefzAccount,
  ChefzAccountType,
  ChefzAccountReminder,
  ChefzAccountCounts,
  ChefzSponsorAccountCounts,
  ChefzAccountStatus,
  PlatformAssignmentLimit,
  ChefzOperationProblem,
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
import {
  listOperatingCities,
  listSponsors,
  listRiders,
  listEmployees,
  ensureEmployeeVehicleProfile,
  type OperatingCity,
  type Sponsor,
} from "@/lib/workforce/api";
import type { Rider, Employee } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
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
  Calendar,
  AlertTriangle,
  ExternalLink,
  Lock,
  UserCheck,
  FileSpreadsheet,
  Settings,
  SlidersHorizontal,
  Eye,
  Copy,
  Check,
  CheckCircle2,
  Info,
  ShieldAlert,
  Building2,
  MapPin,
  Save,
  X,
} from "lucide-react";

interface JoinedAccount {
  base: AccountResponse;
  chefz: ChefzAccount | null;
}

function translateStatusReason(reason?: string | null): string {
  if (!reason) return "";
  const trimmed = reason.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes("block by chefz")) {
    return "حظر من منصة شيفز (Block By CHEFZ)";
  }
  if (lower.includes("supervisor")) {
    return "إيقاف من قِبل المشرف (The supervisor suspended)";
  }
  if (lower === "active") {
    return "نشط";
  }
  return trimmed;
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reminders, setReminders] = useState<ChefzAccountReminder[]>([]);
  const [chefzSummary, setChefzSummary] = useState<ChefzAccountCounts | null>(null);
  const [chefzSponsors, setChefzSponsors] = useState<ChefzSponsorAccountCounts[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters (Toolbar)
  const [search, setSearch] = useState("");
  const [filterSetupStatus, setFilterSetupStatus] = useState<string>("all"); // "all" | "configured" | "not_configured"
  const [filterType, setFilterType] = useState<string>("all"); // "all" | "Freelancer" | "FullTime"
  const [filterCityId, setFilterCityId] = useState("");
  const [filterSponsorId, setFilterSponsorId] = useState("");
  const [filterLifecycleStatus, setFilterLifecycleStatus] = useState<string>("all"); // "all" | "Available" | "Assigned" | "Suspended" | "Retired" | "Archived"

  // Table Header Column Filters
  const [colFilterReminders, setColFilterReminders] = useState<string[]>([]);
  const [colFilterAssignments, setColFilterAssignments] = useState<string[]>([]);
  const [colFilterCityIds, setColFilterCityIds] = useState<string[]>([]);
  const [colFilterSponsorIds, setColFilterSponsorIds] = useState<string[]>([]);
  const [colFilterTypes, setColFilterTypes] = useState<string[]>([]);
  const [colFilterSetup, setColFilterSetup] = useState<string[]>([]);
  const [colFilterPassword, setColFilterPassword] = useState<string[]>([]);
  const [colFilterStatus, setColFilterStatus] = useState<string[]>([]);

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
  const [selectedPersonKey, setSelectedPersonKey] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [isEnsuringProfile, setIsEnsuringProfile] = useState(false);
  const [profileEnsureError, setProfileEnsureError] = useState<string | null>(null);
  const [profileEnsureSuccess, setProfileEnsureSuccess] = useState(false);
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [assignReason, setAssignReason] = useState("تسليم الحساب للمندوب");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignLimitDetails, setAssignLimitDetails] = useState<PlatformAssignmentLimit | null>(null);
  const [selectedRiderActiveAccounts, setSelectedRiderActiveAccounts] = useState<AccountResponse[]>([]);
  const [checkingRiderAccounts, setCheckingRiderAccounts] = useState(false);

  // 4. Status Control Modal
  const [statusAccount, setStatusAccount] = useState<JoinedAccount | null>(null);
  const [statusChoice, setStatusChoice] = useState<"Active" | "Suspended" | "Retired" | "Archived">("Suspended");
  const [statusReason, setStatusReason] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [releasingAccount, setReleasingAccount] = useState<AccountResponse | null>(null);
  const [releaseEffectiveTo, setReleaseEffectiveTo] = useState(new Date().toISOString().split("T")[0]);
  const [releaseReason, setReleaseReason] = useState("إرجاع الحساب");
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);

  const [historyAccount, setHistoryAccount] = useState<AccountResponse | null>(null);
  const [assignmentHistoryList, setAssignmentHistoryList] = useState<AssignmentResponse[]>([]);
  const [assignmentHistoryLoading, setAssignmentHistoryLoading] = useState(false);

  // Edit Assignment Start Date Modal / State
  const [editingAssignment, setEditingAssignment] = useState<AssignmentResponse | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [isSavingStartDate, setIsSavingStartDate] = useState(false);
  const [startDateError, setStartDateError] = useState<string | null>(null);

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

      // 2. Parallel fetch base accounts, chefz accounts with summary, metadata, and reminders
      const [baseAccounts, chefzData, cityList, sponsorList, riderList, employeeList, reminderList] = await Promise.all([
        getAllPlatformAccounts({ platformId: plat.id, includeArchived: false }),
        getAllChefzAccountsWithSummary().catch(() => ({
          accounts: [] as ChefzAccount[],
          totalCount: 0,
          summary: null,
          sponsors: [],
        })),
        listOperatingCities().catch(() => []),
        listSponsors().catch(() => []),
        listRiders().catch(() => []),
        listEmployees().catch(() => []),
        getAllChefzReminders().catch(() => [] as ChefzAccountReminder[]),
      ]);

      setCities(cityList);
      setSponsors(sponsorList);
      setRiders(riderList);
      setEmployees(employeeList);
      setReminders(reminderList);
      setChefzSummary(chefzData.summary);
      setChefzSponsors(chefzData.sponsors || []);

      // 3. Map chefz by accountId
      const chefzMap = new Map<string, ChefzAccount>();
      for (const ca of chefzData.accounts) {
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
      if (filterSponsorId) {
        if (filterSponsorId === "NONE") {
          if (base.sponsorId) return false;
        } else if (base.sponsorId !== filterSponsorId) {
          return false;
        }
      }

      // 4b. Lifecycle Status filter (Toolbar & Column)
      const currentLifecycleStatus = chefz?.status || base.status;
      if (filterLifecycleStatus !== "all" && currentLifecycleStatus !== filterLifecycleStatus) return false;
      if (colFilterStatus.length > 0 && !colFilterStatus.includes(currentLifecycleStatus)) return false;

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
        const match = colFilterSponsorIds.some((id) => {
          if (id === "NONE") return !base.sponsorId;
          return base.sponsorId === id;
        });
        if (!match) return false;
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
    filterLifecycleStatus,
    colFilterReminders,
    colFilterAssignments,
    colFilterCityIds,
    colFilterSponsorIds,
    colFilterTypes,
    colFilterSetup,
    colFilterPassword,
    colFilterStatus,
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
    if (chefzSponsors && chefzSponsors.length > 0) {
      const totalGlobal = chefzSummary?.total || chefzSponsors.reduce((sum, s) => sum + s.counts.total, 0) || 1;
      return chefzSponsors.map((s) => {
        const key = s.sponsorId ?? "NONE";
        const name = s.sponsorNameAr || (s.sponsorId ? "كفيل غير متاح" : "خارج الكفالة");
        return {
          sponsorId: key,
          name,
          total: s.counts.total,
          assigned: s.counts.taken,
          unassigned: s.counts.notTaken,
          configured: s.counts.available + s.counts.assigned,
          pending: s.counts.suspended + s.counts.retired + s.counts.archived,
          percentage: Math.round((s.counts.total / totalGlobal) * 100),
          counts: s.counts,
        };
      });
    }

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
      const id = a.base.sponsorId || "NONE";
      const name = a.base.sponsorNameAr || (id === "NONE" ? "خارج الكفالة" : "كفيل غير متاح");

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
  }, [chefzSponsors, chefzSummary, accounts]);

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
    if (chefzSponsors && chefzSponsors.length > 0) {
      return chefzSponsors
        .map((s) => ({
          value: s.sponsorId ?? "NONE",
          label: s.sponsorNameAr || (s.sponsorId ? "كفيل غير متاح" : "خارج الكفالة"),
          count: s.counts.total,
        }))
        .sort((a, b) => (b.count || 0) - (a.count || 0));
    }

    const sponsorCounts = new Map<string, number>();
    let noSponsorCount = 0;
    for (const a of accounts) {
      if (a.base.sponsorId) {
        sponsorCounts.set(a.base.sponsorId, (sponsorCounts.get(a.base.sponsorId) || 0) + 1);
      } else {
        noSponsorCount++;
      }
    }
    const list: FilterOption[] = sponsors
      .map((s) => ({
        value: s.id,
        label: s.registryNameAr,
        count: sponsorCounts.get(s.id) || 0,
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));

    if (noSponsorCount > 0) {
      list.push({
        value: "NONE",
        label: "خارج الكفالة",
        count: noSponsorCount,
      });
    }

    return list;
  }, [accounts, sponsors, chefzSponsors]);

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

  const statusFilterOptions: FilterOption[] = useMemo(() => {
    let availableCount = 0;
    let assignedCount = 0;
    let suspendedCount = 0;
    let retiredCount = 0;
    let archivedCount = 0;

    for (const a of accounts) {
      const s = a.chefz?.status || a.base.status;
      if (s === "Available") availableCount++;
      else if (s === "Assigned") assignedCount++;
      else if (s === "Suspended") suspendedCount++;
      else if (s === "Retired") retiredCount++;
      else if (s === "Archived") archivedCount++;
    }

    return [
      {
        value: "Available",
        label: "متاح",
        sublabel: "جاهز للتعيين تلقائياً",
        count: chefzSummary ? chefzSummary.available : availableCount,
      },
      {
        value: "Assigned",
        label: "معيّن",
        sublabel: "مرتبط بمندوب نشط",
        count: chefzSummary ? chefzSummary.assigned : assignedCount,
      },
      {
        value: "Suspended",
        label: "موقوف",
        sublabel: "إيقاف إداري يدوي",
        count: chefzSummary ? chefzSummary.suspended : suspendedCount,
      },
      {
        value: "Retired",
        label: "مستبعد",
        sublabel: "استبعاد يدوي من التشغيل",
        count: chefzSummary ? chefzSummary.retired : retiredCount,
      },
      {
        value: "Archived",
        label: "مؤرشف",
        sublabel: "أرشفة الحسابات",
        count: chefzSummary ? chefzSummary.archived : archivedCount,
      },
    ];
  }, [accounts, chefzSummary]);

  const hasAnyFilter = Boolean(
    search.trim() ||
    filterSetupStatus !== "all" ||
    filterType !== "all" ||
    filterCityId ||
    filterSponsorId ||
    filterLifecycleStatus !== "all" ||
    colFilterReminders.length > 0 ||
    colFilterAssignments.length > 0 ||
    colFilterCityIds.length > 0 ||
    colFilterSponsorIds.length > 0 ||
    colFilterTypes.length > 0 ||
    colFilterSetup.length > 0 ||
    colFilterPassword.length > 0 ||
    colFilterStatus.length > 0
  );

  const resetAllFilters = () => {
    setSearch("");
    setFilterSetupStatus("all");
    setFilterType("all");
    setFilterCityId("");
    setFilterSponsorId("");
    setFilterLifecycleStatus("all");
    setColFilterReminders([]);
    setColFilterAssignments([]);
    setColFilterCityIds([]);
    setColFilterSponsorIds([]);
    setColFilterTypes([]);
    setColFilterSetup([]);
    setColFilterPassword([]);
    setColFilterStatus([]);
  };

  const resetColumnFilters = () => {
    setColFilterReminders([]);
    setColFilterAssignments([]);
    setColFilterCityIds([]);
    setColFilterSponsorIds([]);
    setColFilterTypes([]);
    setColFilterSetup([]);
    setColFilterPassword([]);
    setColFilterStatus([]);
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
  // Count active Chefz accounts per rider for dropdown options decoration
  const riderAccountsSummaryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of accounts) {
      const asgn = item.base.currentAssignment;
      if (asgn && asgn.actualRiderProfileId && asgn.status === "Active") {
        map.set(asgn.actualRiderProfileId, (map.get(asgn.actualRiderProfileId) || 0) + 1);
      }
    }
    return map;
  }, [accounts]);

  // Combined Persons (Employees + Riders) for Account Assignment
  interface AssignPersonOption {
    key: string;
    riderProfileId: string | null;
    employeeId: string | null;
    name: string;
    iqamaNo: string | null;
    isEmployee: boolean;
    typeLabel: string;
    hasActiveAccountsCount: number;
  }

  const { assignPersonOptions, personMetaMap } = useMemo(() => {
    const options: { value: string; label: string; sublabel?: string; keywords?: string }[] = [];
    const metaMap = new Map<string, AssignPersonOption>();

    const seenRiderProfileIds = new Set<string>();
    const seenEmployeeIds = new Set<string>();
    const seenIqamaNos = new Set<string>();

    const isPersonSeen = (riderId?: string | null, empId?: string | null, iqama?: string | null) => {
      if (riderId && seenRiderProfileIds.has(riderId)) return true;
      if (empId && seenEmployeeIds.has(empId)) return true;
      const cleanIqama = iqama?.trim();
      if (cleanIqama && seenIqamaNos.has(cleanIqama)) return true;
      return false;
    };

    const markPersonSeen = (riderId?: string | null, empId?: string | null, iqama?: string | null) => {
      if (riderId) seenRiderProfileIds.add(riderId);
      if (empId) seenEmployeeIds.add(empId);
      const cleanIqama = iqama?.trim();
      if (cleanIqama) seenIqamaNos.add(cleanIqama);
    };

    const formatStatus = (s?: string | null) => {
      if (!s) return "";
      const lower = s.toLowerCase();
      if (lower === "active") return "نشط";
      if (lower === "inactive") return "غير نشط";
      if (lower === "suspended") return "موقوف";
      if (lower === "terminated") return "منتهي الخدمة";
      return s;
    };

    // 1. Operational Riders (from listRiders)
    (riders || []).forEach((r) => {
      if (!r.id) return;
      if (isPersonSeen(r.id, r.employeeId, r.iqamaNo)) return;

      const key = `rider_${r.id}`;
      const count = riderAccountsSummaryMap.get(r.id) || 0;
      let countBadge = "";
      if (count === 1) {
        countBadge = " [لديه حساب نشط ⚠️]";
      } else if (count >= 2) {
        countBadge = ` [لديه ${count} حسابات نشطة ⛔ مكتمل]`;
      }

      const name = r.fullNameAr || "مندوب";
      const iqamaStr = r.iqamaNo ? ` (${r.iqamaNo})` : "";
      const statusLabel = formatStatus(r.status);
      const statusSuffix = statusLabel && statusLabel !== "نشط" ? ` • ${statusLabel}` : "";

      options.push({
        value: key,
        label: `${name}${iqamaStr} — مندوب${countBadge}`,
        sublabel: `مندوب ميداني${r.iqamaNo ? ` • هوية: ${r.iqamaNo}` : ""}${statusSuffix}`,
        keywords: `${name} ${r.iqamaNo || ""} مندوب ${count >= 2 ? "مكتمل ممتلئ ممنوع" : count === 1 ? "حساب واحد تنبيه" : "متاح"}`,
      });

      metaMap.set(key, {
        key,
        riderProfileId: r.id,
        employeeId: r.employeeId || null,
        name,
        iqamaNo: r.iqamaNo || null,
        isEmployee: false,
        typeLabel: "مندوب",
        hasActiveAccountsCount: count,
      });

      markPersonSeen(r.id, r.employeeId, r.iqamaNo);
    });

    // 2. Employees (from listEmployees)
    (employees || []).forEach((e) => {
      if (!e.id) return;

      const existingRiderId = (e as any).riderProfileId || e.rider?.id || null;
      if (isPersonSeen(existingRiderId, e.id, e.iqamaNo)) return;

      const key = `emp_${e.id}`;
      const isAdministrative = e.isEmployee !== false;
      const typeTag = isAdministrative ? "موظف إداري" : "موظف";
      const count = existingRiderId ? riderAccountsSummaryMap.get(existingRiderId) || 0 : 0;

      let countBadge = "";
      if (count === 1) {
        countBadge = " [لديه حساب نشط ⚠️]";
      } else if (count >= 2) {
        countBadge = ` [لديه ${count} حسابات نشطة ⛔ مكتمل]`;
      } else if (!existingRiderId) {
        countBadge = " [سيتم إنشاء ملف مندوب]";
      }

      const name = e.fullNameAr || e.fullNameEn || "موظف";
      const iqamaStr = e.iqamaNo ? ` (${e.iqamaNo})` : "";
      const statusLabel = formatStatus(e.status);
      const statusSuffix = statusLabel && statusLabel !== "نشط" ? ` • ${statusLabel}` : "";

      options.push({
        value: key,
        label: `${name}${iqamaStr} — ${typeTag}${countBadge}`,
        sublabel: `${typeTag}${e.iqamaNo ? ` • هوية: ${e.iqamaNo}` : ""}${existingRiderId ? "" : " • إنشاء ملف تلقائي"}${statusSuffix}`,
        keywords: `${name} ${e.fullNameEn || ""} ${e.iqamaNo || ""} ${typeTag} موظف ${existingRiderId ? "" : "جديد ملف"}`,
      });

      metaMap.set(key, {
        key,
        riderProfileId: existingRiderId,
        employeeId: e.id,
        name,
        iqamaNo: e.iqamaNo || null,
        isEmployee: true,
        typeLabel: typeTag,
        hasActiveAccountsCount: count,
      });

      markPersonSeen(existingRiderId, e.id, e.iqamaNo);
    });

    return { assignPersonOptions: options, personMetaMap: metaMap };
  }, [riders, employees, riderAccountsSummaryMap]);

  // Track active accounts for the selected rider in the assign modal
  useEffect(() => {
    if (!selectedRiderId) {
      setSelectedRiderActiveAccounts([]);
      setCheckingRiderAccounts(false);
      return;
    }

    // 1. Immediately find local active Chefz accounts for this rider (0ms)
    const localAccounts = accounts
      .filter(
        (a) =>
          a.base.currentAssignment &&
          a.base.currentAssignment.actualRiderProfileId === selectedRiderId &&
          a.base.currentAssignment.status === "Active" &&
          a.base.id !== assigningAccount?.id
      )
      .map((a) => a.base);

    setSelectedRiderActiveAccounts(localAccounts);

    // 2. Query across platforms to catch any active accounts in other platforms
    let isMounted = true;
    setCheckingRiderAccounts(true);
    getPlatformAccounts({ actualRiderProfileId: selectedRiderId, currentOnly: true })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : [];
        const active = list.filter(
          (acc) =>
            acc.currentAssignment &&
            acc.currentAssignment.actualRiderProfileId === selectedRiderId &&
            acc.currentAssignment.status === "Active" &&
            acc.id !== assigningAccount?.id
        );
        setSelectedRiderActiveAccounts(active);
      })
      .catch((err) => {
        console.warn("Could not query platform accounts for rider:", err);
      })
      .finally(() => {
        if (isMounted) setCheckingRiderAccounts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRiderId, accounts, assigningAccount?.id]);

  const openAssignModal = (base: AccountResponse) => {
    setAssigningAccount(base);
    setSelectedPersonKey("");
    setSelectedRiderId("");
    setIsEnsuringProfile(false);
    setProfileEnsureError(null);
    setProfileEnsureSuccess(false);
    setSelectedRiderActiveAccounts([]);
    setCheckingRiderAccounts(false);
    setAssignEffectiveFrom(new Date().toISOString().split("T")[0]);
    setAssignReason("تسليم الحساب للمندوب");
    setAssignError(null);
    setAssignLimitDetails(null);
  };

  const handlePersonChange = async (key: string) => {
    setSelectedPersonKey(key);
    setAssignError(null);
    setAssignLimitDetails(null);
    setProfileEnsureError(null);
    setProfileEnsureSuccess(false);

    if (!key) {
      setSelectedRiderId("");
      setIsEnsuringProfile(false);
      return;
    }

    const person = personMetaMap.get(key);
    if (!person) {
      setSelectedRiderId("");
      setIsEnsuringProfile(false);
      return;
    }

    // 1. If person already has an operational rider profile
    if (person.riderProfileId) {
      setSelectedRiderId(person.riderProfileId);
      setIsEnsuringProfile(false);
      return;
    }

    // 2. If person is an employee without a rider profile -> create minimal rider profile!
    if (person.employeeId) {
      setSelectedRiderId("");
      setIsEnsuringProfile(true);
      try {
        const res = await ensureEmployeeVehicleProfile(person.employeeId);
        if (res?.riderProfileId) {
          const newRiderProfileId = res.riderProfileId;
          person.riderProfileId = newRiderProfileId;
          // Update in local state so subsequent selections remember it
          setEmployees((prev) =>
            prev.map((emp) =>
              emp.id === person.employeeId ? { ...emp, riderProfileId: newRiderProfileId } : emp
            )
          );
          setSelectedRiderId(newRiderProfileId);
          setProfileEnsureSuccess(true);
          toast.success(
            "تم إنشاء ملف المندوب",
            `تم إنشاء ملف المندوب بالحد الأدنى للموظف (${person.name}) بنجاح. يمكنك الآن تعيين الحساب.`
          );
        } else {
          setProfileEnsureError("لم يُرجع النظام معرّف ملف المندوب (Rider Profile ID).");
          toast.error("خطأ", "تعذر استلام معرف ملف المندوب للموظف.");
        }
      } catch (err: unknown) {
        const e = err as { details?: { detail?: string; message?: string }; message?: string };
        const msg =
          e?.details?.detail || e?.details?.message || e?.message || "فشل إنشاء ملف المندوب للموظف بالحد الأدنى من البيانات.";
        setProfileEnsureError(msg);
        toast.error("فشل إنشاء ملف المندوب", msg);
      } finally {
        setIsEnsuringProfile(false);
      }
    }
  };

  const handleAssignRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAccount || !selectedPersonKey) return;

    if (isEnsuringProfile) {
      toast.error("يرجى الانتظار", "جارٍ إنشاء ملف المندوب للموظف بالحد الأدنى من البيانات...");
      return;
    }

    const person = personMetaMap.get(selectedPersonKey);
    let targetRiderProfileId = selectedRiderId || person?.riderProfileId;

    // Safety fallback: if riderProfileId is still missing for an employee, attempt creation now
    if (!targetRiderProfileId && person?.employeeId) {
      setIsEnsuringProfile(true);
      setProfileEnsureError(null);
      try {
        const res = await ensureEmployeeVehicleProfile(person.employeeId);
        if (res?.riderProfileId) {
          targetRiderProfileId = res.riderProfileId;
          person.riderProfileId = targetRiderProfileId;
          setEmployees((prev) =>
            prev.map((emp) =>
              emp.id === person.employeeId ? { ...emp, riderProfileId: res.riderProfileId } : emp
            )
          );
          setSelectedRiderId(targetRiderProfileId);
        } else {
          setProfileEnsureError("تعذر إنشاء ملف المندوب للموظف.");
          setIsEnsuringProfile(false);
          return;
        }
      } catch (err: unknown) {
        const e = err as { details?: { detail?: string }; message?: string };
        setProfileEnsureError(e?.details?.detail || e?.message || "فشل إنشاء ملف المندوب للموظف.");
        setIsEnsuringProfile(false);
        return;
      } finally {
        setIsEnsuringProfile(false);
      }
    }

    if (!targetRiderProfileId) {
      toast.error("تنبيه", "يجب توفر ملف مندوب صالح لإتمام تعيين الحساب.");
      return;
    }

    // Hard stop if rider already has 2 active accounts
    if (selectedRiderActiveAccounts.length >= 2) {
      setAssignError(
        `تم إيقاف العملية: المندوب يمتلك بالفعل ${selectedRiderActiveAccounts.length} حسابات نشطة (الحد الأقصى المسموح به حسابان فقط). يجب إنهاء تعيين أحد حساباته أولاً.`
      );
      toast.error("إيقاف العملية", "المندوب يمتلك بالفعل حسابين نشطين، لا يمكن تعيين حساب ثالث له.");
      return;
    }

    setAssignSubmitting(true);
    setAssignError(null);
    setAssignLimitDetails(null);
    try {
      await assignPlatformAccount(assigningAccount.id, {
        actualRiderProfileId: targetRiderProfileId,
        effectiveFrom: assignEffectiveFrom,
        reason: assignReason.trim() || null,
      });

      await loadData();
      toast.success("تم التعيين", "تم تعيين الحساب للمندوب بنجاح.");
      setAssigningAccount(null);
    } catch (err: unknown) {
      const e = err as {
        status?: number;
        problem?: ChefzOperationProblem;
        details?: { detail?: string; message?: string; errorCode?: string; assignmentLimit?: PlatformAssignmentLimit };
        message?: string;
      };

      const problem = e.problem || e.details;
      const errorCode = problem?.errorCode;
      const limit = problem?.assignmentLimit;

      if (limit) {
        setAssignLimitDetails(limit);
      }

      if (errorCode === "platform.rider_account_limit_reached" || limit) {
        setAssignError(
          problem?.detail ||
          `تم الوصول للحد الأقصى لعدد الحسابات المسموح بها للمندوب (${limit?.maximumActiveAccounts ?? 2} حسابات). يرجى إرجاع أحد حساباته أولاً.`
        );
      } else if (errorCode === "platform.rider_salary_account_limit_reached") {
        setAssignError(
          problem?.detail ||
          "لا يمكن تعيين هذا الحساب لأن المندوب يمتلك بالفعل حساب راتب (Salary). يسمح بحساب راتب واحد فقط كحد أقصى."
        );
      } else if (errorCode === "rider.jahez_debt_block") {
        setAssignError(
          problem?.detail ||
          "المندوب محظور تشغيلياً بسبب مديونية سابقة ولا يمكن تعيينه حتى تسوية المديونية."
        );
      } else {
        setAssignError(problem?.detail || e.message || "تعذر تعيين الحساب للمندوب.");
      }
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
        reason: releaseReason.trim() || "إرجاع الحساب",
        status: "Ended",
        rowVersion: releasingAccount.currentAssignment.rowVersion,
      });

      await loadData();
      toast.success("تم إنهاء التعيين", "تم إنهاء تعيين المندوب وتحرير الحساب بنجاح.");
      setReleasingAccount(null);
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string }; message?: string };
      toast.error("خطأ", e.details?.detail || e.message || "تعذر إنهاء التعيين.");
    } finally {
      setReleaseSubmitting(false);
    }
  };

  // -----------------------------------------------------------------
  // Handlers: Lifecycle Status Change
  // -----------------------------------------------------------------
  const openStatusModal = (item: JoinedAccount) => {
    setStatusAccount(item);
    const current = item.chefz?.status || item.base.status;
    if (current === "Suspended" || current === "Retired" || current === "Archived") {
      setStatusChoice(current);
    } else {
      setStatusChoice("Suspended");
    }
    setStatusReason(item.chefz?.statusReason || "");
    setStatusError(null);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusAccount) return;

    setStatusSubmitting(true);
    setStatusError(null);
    try {
      const token = statusAccount.chefz?.accountRowVersion || statusAccount.base.rowVersion;
      await updateChefzAccountStatus(statusAccount.base.id, {
        status: statusChoice,
        rowVersion: token,
        reason: statusReason.trim() || null,
      });

      toast.success("تم تحديث الحالة", "تم تحديث حالة حساب شيفز بنجاح.");
      setStatusAccount(null);
      await loadData();
    } catch (err: unknown) {
      const e = err as { status?: number; details?: { detail?: string; message?: string }; message?: string };
      if (e?.status === 409) {
        setStatusError("تعارض في إصدار السجل (409 Conflict). تغيرت بيانات الحساب من قبل مستخدم آخر، يرجى إعادة المحاولة.");
        const fresh = await getChefzAccount(statusAccount.base.id);
        if (fresh) {
          setAccounts((prev) =>
            prev.map((item) =>
              item.base.id === statusAccount.base.id ? { ...item, chefz: fresh } : item
            )
          );
          setStatusAccount((prev) => (prev ? { ...prev, chefz: fresh } : null));
        }
      } else {
        setStatusError(e?.details?.detail || e?.details?.message || e?.message || "تعذر تحديث حالة الحساب.");
      }
    } finally {
      setStatusSubmitting(false);
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

  const openEditStartDateModal = (asgn: AssignmentResponse) => {
    setEditingAssignment(asgn);
    setEditStartDate(asgn.effectiveFrom ? asgn.effectiveFrom.slice(0, 10) : "");
    setStartDateError(null);
  };

  const handleSaveStartDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !editStartDate.trim()) return;

    if (!editingAssignment.rowVersion) {
      setStartDateError("رمز التزامن (rowVersion) الخاص بالتكليف غير متوفر.");
      return;
    }

    setIsSavingStartDate(true);
    setStartDateError(null);

    try {
      const res = await updateChefzAssignmentStartDate(editingAssignment.id, {
        effectiveFrom: editStartDate.trim(),
        rowVersion: editingAssignment.rowVersion,
      });

      const updatedEffectiveFrom = res?.effectiveFrom || editStartDate.trim();
      const updatedRowVersion = res?.rowVersion || editingAssignment.rowVersion;

      setAssignmentHistoryList((prev) =>
        prev.map((a) =>
          a.id === editingAssignment.id
            ? { ...a, effectiveFrom: updatedEffectiveFrom, rowVersion: updatedRowVersion }
            : a
        )
      );

      toast.success("تم بنجاح", `تم تعديل تاريخ بدء التكليف إلى ${updatedEffectiveFrom}`);
      setEditingAssignment(null);

      // Reload accounts table data in background
      loadData();
    } catch (err: unknown) {
      const e = err as {
        status?: number;
        details?: { detail?: string; message?: string; errors?: Record<string, string[]> };
        message?: string;
      };

      if (e?.status === 409) {
        setStartDateError(
          "تعارض في التحديث بالتزامن (Concurrency Conflict): تم تعديل هذا التكليف مسبقاً أو تغير رمز التزامن. تم تحديث سجل التكليفات تلقائياً، يرجى إعادة المحاولة."
        );
        if (historyAccount) {
          getAccountAssignmentHistory(historyAccount.id)
            .then((fresh) => {
              if (fresh) {
                setAssignmentHistoryList(fresh);
                const freshItem = fresh.find((a) => a.id === editingAssignment.id);
                if (freshItem) {
                  setEditingAssignment(freshItem);
                }
              }
            })
            .catch(() => {});
        }
      } else {
        const errorDetail =
          e?.details?.detail ||
          e?.details?.message ||
          (e?.details?.errors ? Object.values(e.details.errors).flat().join(", ") : null) ||
          e?.message ||
          "فشل تعديل تاريخ بدء التكليف.";
        setStartDateError(errorDetail);
      }
    } finally {
      setIsSavingStartDate(false);
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
          header: "نوع الحساب والعمولة",
          accessor: (i) =>
            i.chefz && i.chefz.accountType !== "Unconfigured"
              ? i.chefz.accountType === "Freelancer"
                ? "فريلانسر (عمولة: 15% من الأرباح)"
                : "دوام كامل (عمولة: 25 ر.س / يوم)"
              : "إعداد الحساب مطلوب",
        },
        { header: "رقم الهوية في تقرير شيفز", accessor: (i) => i.chefz?.reportIdNumber || "—", isText: true },
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

      {/* Live Global Summary Count Cards */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--foreground)]">الإحصائيات الحية الشاملة لمنصة شيفز</h2>
            <Badge tone="blue">إحصاءات شاملة مستقلة عن الفلاتر</Badge>
          </div>
          <span className="text-xs text-[var(--muted)]">
            محتسبة بشكل لحظي من قاعدة البيانات وتشمل كافة حسابات شيفز غير المحذوفة
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {/* Total */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-[var(--muted)] block">إجمالي الحسابات</span>
            <div className="mt-1 text-2xl font-black text-[var(--foreground)] font-mono" dir="ltr">
              {(chefzSummary?.total ?? stats.total).toLocaleString()}
            </div>
            <span className="text-[10px] text-[var(--muted)]">كافة الحسابات</span>
          </div>

          {/* Taken */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block">مرتبطة بمندوب (مأخوذة)</span>
            <div className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-300 font-mono" dir="ltr">
              {(chefzSummary?.taken ?? stats.assigned).toLocaleString()}
            </div>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">ارتباط نشط بمندوب</span>
          </div>

          {/* Not Taken */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-[var(--muted)] block">غير مأخوذة</span>
            <div className="mt-1 text-2xl font-black text-[var(--foreground)] font-mono" dir="ltr">
              {(chefzSummary?.notTaken ?? stats.unassigned).toLocaleString()}
            </div>
            <span className="text-[10px] text-[var(--muted)]">لا يوجد مندوب مرتبط</span>
          </div>

          {/* Available */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">متاح</span>
            <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono" dir="ltr">
              {(chefzSummary?.available ?? 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">جاهز للتعيين تلقائياً</span>
          </div>

          {/* Assigned */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/20 p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block">معيّن (Assigned)</span>
            <div className="mt-1 text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono" dir="ltr">
              {(chefzSummary?.assigned ?? stats.assigned).toLocaleString()}
            </div>
            <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">حالة تشغيلية تلقائية</span>
          </div>

          {/* Suspended */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 block">موقوف</span>
            <div className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300 font-mono" dir="ltr">
              {(chefzSummary?.suspended ?? 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">إيقاف إداري يدوي</span>
          </div>

          {/* Retired */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 block">مستبعد</span>
            <div className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300 font-mono" dir="ltr">
              {(chefzSummary?.retired ?? 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80">استبعاد من التشغيل</span>
          </div>

          {/* Archived */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 p-3.5 shadow-sm">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">مؤرشف</span>
            <div className="mt-1 text-2xl font-black text-slate-700 dark:text-slate-300 font-mono" dir="ltr">
              {(chefzSummary?.archived ?? 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">أرشفة قابلة للاستعادة</span>
          </div>
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
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold" title="مأخوذ: مرتبط بمندوب (Taken)">
                        {item.assigned} مأخوذ
                      </span>
                      <span>•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold" title="شاغر: بدون ارتباط نشط (Not Taken)">
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
                    <span>نوع الحساب والعمولة</span>
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
                <th className="px-4 py-3.5 whitespace-nowrap">هوية تقرير شيفز</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>حالة كلمة المرور</span>
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
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>حالة الحساب</span>
                    <TableHeaderColumnFilter
                      label="حالة الحساب"
                      value={colFilterStatus}
                      onChange={setColFilterStatus}
                      options={statusFilterOptions}
                      placeholder="تصفية بالحالة..."
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
                  <td colSpan={9} className="py-12 text-center text-sm text-[var(--muted)]">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--brand)]" />
                    جارٍ تحميل حسابات شيفز ودمج البيانات...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-[var(--muted)]">
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

                      {/* Chefz Account Type & Commission */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {chefz && chefz.accountType !== "Unconfigured" ? (
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone={chefz.accountType === "Freelancer" ? "blue" : "orange"}>
                              {chefz.accountType === "Freelancer" ? "فريلانسر" : "دوام كامل"}
                            </Badge>
                            <span className="text-xs font-semibold">
                              {chefz.accountType === "Freelancer" ? (
                                <span className="text-blue-600 dark:text-blue-400">عمولة: 15% من الأرباح</span>
                              ) : (
                                <span className="text-orange-600 dark:text-orange-400">عمولة: 25 ر.س / يوم</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-0.5">
                            <Badge tone="orange">إعداد الحساب مطلوب</Badge>
                            <span className="text-[11px] text-[var(--muted)]">بانتظار تحديد النوع</span>
                          </div>
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

                      {/* Lifecycle Status & Operational Block */}
                      <td className="px-4 py-3 text-xs">
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const status = chefz?.status || base.status;
                            if (status === "Available") {
                              return <Badge tone="green">متاح</Badge>;
                            }
                            if (status === "Assigned") {
                              return <Badge tone="blue">معيّن</Badge>;
                            }
                            if (status === "Suspended") {
                              return <Badge tone="orange">موقوف</Badge>;
                            }
                            if (status === "Retired") {
                              return <Badge tone="red">مستبعد</Badge>;
                            }
                            if (status === "Archived") {
                              return <Badge tone="gray">مؤرشف</Badge>;
                            }
                            return <Badge tone="gray">{status || "—"}</Badge>;
                          })()}

                          {chefz?.statusReason && (
                            <span className="text-[10px] text-[var(--muted)] line-clamp-1 font-medium" title={chefz.statusReason}>
                              {translateStatusReason(chefz.statusReason)}
                            </span>
                          )}

                          {chefz?.isOperationallyBlocked && (
                            <span
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800"
                              title={chefz.operationalBlockReason || "محظور تشغيلياً"}
                            >
                              <ShieldAlert className="h-3 w-3 shrink-0" />
                              محظور تشغيلياً
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Status Change button */}
                          {can("chefz.accounts.update") && (
                            <button
                              onClick={() => openStatusModal(item)}
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                              title="تغيير حالة الحساب (موقوف / مستبعد / مؤرشف / استعادة)"
                            >
                              <SlidersHorizontal className="h-4 w-4" />
                            </button>
                          )}

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
                              onClick={() => openAssignModal(base)}
                              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                              title="تعيين مندوب للحساب"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}

                          {currentRider && (
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

      {/* 3. Modal: Assign Rider */}
      <Modal
        isOpen={Boolean(assigningAccount)}
        onClose={() => {
          setAssigningAccount(null);
          setAssignError(null);
          setAssignLimitDetails(null);
        }}
        title={`تعيين مندوب للحساب — ${assigningAccount?.code || ""}`}
        maxWidth="max-w-md"
      >
        {assigningAccount && (
          <form onSubmit={handleAssignRider} className="space-y-4" dir="rtl">
            {/* Informational note on two accounts allowance */}
            <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
              <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <span>
                <strong>قواعد شيفز:</strong> يُسمح للمندوب بامتلاك حتى <strong>حسابين في منصة شيفز</strong> في نفس الوقت، على ألا يتجاوز حسابات الراتب (Salary) حساباً واحداً.
              </span>
            </div>

            {/* Error display if limit reached or blocked */}
            {assignError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{assignError}</span>
                </div>

                {assignLimitDetails && (
                  <div className="rounded-lg border border-red-200 bg-white dark:bg-slate-900 p-2 text-[11px] space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      الحد الأقصى المسموح: {assignLimitDetails.maximumActiveAccounts} حسابات (حسابات الراتب: {assignLimitDetails.maximumSalaryAccounts})
                    </p>
                    {assignLimitDetails.activeAccounts.length > 0 && (
                      <div>
                        <span className="text-[var(--muted)] block">الحسابات النشطة حالياً للمندوب:</span>
                        <ul className="list-disc list-inside mt-0.5 font-mono">
                          {assignLimitDetails.activeAccounts.map((acc, idx) => (
                            <li key={idx}>
                              {acc.platformCode}: {acc.externalAccountId} ({acc.paymentModel === "Salary" ? "راتب" : "لكل طلب"})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">
                اختر المندوب أو الموظف المكلف بالاستلام <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={selectedPersonKey}
                onChange={handlePersonChange}
                options={assignPersonOptions}
                placeholder="ابحث باسم الموظف أو المندوب أو رقم الهوية..."
                required
              />
            </div>

            {/* Profile Creation in Progress */}
            {isEnsuringProfile && (
              <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/90 dark:border-blue-900/40 dark:bg-blue-950/40 p-3 text-xs text-blue-900 dark:text-blue-200">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="font-bold">الموظف ليس لديه ملف مندوب مسجل</p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    جارٍ إنشاء ملف مندوب جديد بالحد الأدنى من البيانات تلقائياً...
                  </p>
                </div>
              </div>
            )}

            {/* Profile Creation Success */}
            {profileEnsureSuccess && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold">تم إنشاء ملف المندوب بنجاح ✓</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    تم إنشاء وتجهيز ملف المندوب بالحد الأدنى من البيانات للموظف. يمكنك الآن إتمام تعيين الحساب.
                  </p>
                </div>
              </div>
            )}

            {/* Profile Creation Error */}
            {profileEnsureError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">فشل إنشاء ملف المندوب للموظف</p>
                    <p className="text-[11px] text-red-700 dark:text-red-300">{profileEnsureError}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePersonChange(selectedPersonKey)}
                  className="w-full text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  إعادة المحاولة
                </Button>
              </div>
            )}

            {/* Assessment of selected rider's active accounts */}
            {selectedRiderId && checkingRiderAccounts && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2.5 text-xs text-[var(--muted)]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--brand)]" />
                <span>جارٍ فحص الحسابات النشطة المسندة...</span>
              </div>
            )}

            {/* Case 1: Rider has 1 active account -> NOTICE THE ADMIN */}
            {selectedRiderId && !checkingRiderAccounts && selectedRiderActiveAccounts.length === 1 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950 dark:text-amber-100">
                      تنبيه للمشرف: يمتلك حساباً نشطاً مسبقاً (حساب واحد)
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      المندوب/الموظف <strong>{personMetaMap.get(selectedPersonKey)?.name || "المكلف"}</strong> مرتبط حالياً بحساب نشط. عند إتمام هذا التعيين، سيصبح لديه <strong>حسابان نشطان</strong> وهو <strong>الحد الأقصى المسموح به</strong> نظامياً في شيفز.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-white/80 dark:bg-slate-900/70 p-2.5 text-[11px] space-y-1">
                  <span className="font-semibold text-amber-950 dark:text-amber-100 block">تفاصيل حسابه النشط الحالي:</span>
                  {selectedRiderActiveAccounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-mono">
                      <span>كود الحساب: <strong>{acc.code}</strong> {acc.externalAccountId ? `(ID: ${acc.externalAccountId})` : ""}</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-sans font-bold">
                        {acc.paymentModel === "Salary" ? "حساب راتب" : "لكل طلب"} • {acc.operatingCityNameAr || "المدينة"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case 2: Rider has 2 active accounts -> STOP THE OPERATION */}
            {selectedRiderId && !checkingRiderAccounts && selectedRiderActiveAccounts.length >= 2 && (
              <div className="rounded-xl border-2 border-red-500 bg-red-50 dark:border-red-700 dark:bg-red-950/60 p-3.5 text-xs text-red-900 dark:text-red-200 space-y-2.5 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="rounded-full bg-red-100 p-1 dark:bg-red-900/60 text-red-600 dark:text-red-400 shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-sm text-red-700 dark:text-red-300">
                      تم إيقاف العملية: لا يمكن التعيين (الحد الأقصى مكتمل)
                    </p>
                    <p className="text-[11px] leading-relaxed text-red-800 dark:text-red-300">
                      المندوب/الموظف <strong>{personMetaMap.get(selectedPersonKey)?.name || "المكلف"}</strong> يمتلك بالفعل <strong>{selectedRiderActiveAccounts.length} حسابات نشطة</strong> في النظام. يُمنع منعاً باتاً إضافة حساب ثالث للمندوب.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-white/90 dark:bg-slate-900/80 p-2.5 text-[11px] space-y-1.5">
                  <span className="font-bold text-red-950 dark:text-red-200 block">الحسابات النشطة المسندة له حالياً ({selectedRiderActiveAccounts.length}):</span>
                  <div className="space-y-1 font-mono">
                    {selectedRiderActiveAccounts.map((acc, idx) => (
                      <div key={acc.id} className="flex items-center justify-between bg-red-50/50 dark:bg-red-950/30 p-1.5 rounded border border-red-100 dark:border-red-900/30">
                        <span>
                          {idx + 1}. كود: <strong>{acc.code}</strong> {acc.externalAccountId ? `(${acc.externalAccountId})` : ""}
                        </span>
                        <span className="text-[10px] text-red-700 dark:text-red-400 font-sans font-bold">
                          {acc.paymentModel === "Salary" ? "راتب" : "لكل طلب"} • {acc.operatingCityNameAr || "المدينة"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-900/40 p-2 rounded-lg">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>الإجراء المطلوب: يجب تحرير أو إنهاء تكليف أحد حساباته الحالية أولاً قبل إمكانية تعيينه على هذا الحساب.</span>
                </div>
              </div>
            )}

            {/* Case 3: Rider has 0 active accounts */}
            {selectedRiderId && !checkingRiderAccounts && selectedRiderActiveAccounts.length === 0 && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>
                  {personMetaMap.get(selectedPersonKey)?.isEmployee ? "الموظف" : "المندوب"} لا يمتلك أي حساب نشط حالياً (متاح للتعيين كحساب أول).
                </span>
              </div>
            )}

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
                disabled={
                  assignSubmitting ||
                  !selectedPersonKey ||
                  isEnsuringProfile ||
                  !selectedRiderId ||
                  selectedRiderActiveAccounts.length >= 2 ||
                  checkingRiderAccounts
                }
                className={
                  selectedRiderActiveAccounts.length >= 2
                    ? "bg-red-600/70 text-white cursor-not-allowed opacity-60"
                    : selectedRiderActiveAccounts.length === 1
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : isEnsuringProfile
                    ? "bg-blue-600/70 text-white cursor-wait opacity-80"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }
              >
                {assignSubmitting ? (
                  "جارٍ التعيين..."
                ) : isEnsuringProfile ? (
                  "جارٍ إنشاء ملف المندوب..."
                ) : checkingRiderAccounts ? (
                  "جارٍ التحقق..."
                ) : selectedRiderActiveAccounts.length >= 2 ? (
                  "العملية متوقفة (مكتمل الحسابات)"
                ) : selectedRiderActiveAccounts.length === 1 ? (
                  "تأكيد التعيين (الحساب الثاني للمندوب)"
                ) : (
                  "تأكيد التعيين"
                )}
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

            <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
              <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <span>
                إنهاء التكليف يحرر هذا الحساب فقط، ويترك أي حساب آخر مرتبط بنفس المندوب نشطاً ومكلفاً دون تغيير.
              </span>
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
                    {(can("chefz.accounts.update") ||
                      can("platform_assignments.update") ||
                      can("platform_accounts.update")) && (
                      <th className="px-3 py-2.5 text-center">الإجراءات</th>
                    )}
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
                      {(can("chefz.accounts.update") ||
                        can("platform_assignments.update") ||
                        can("platform_accounts.update")) && (
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => openEditStartDateModal(asgn)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-colors"
                            title="تعديل تاريخ البدء"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>تعديل تاريخ البدء</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
      {/* 5. Modal: Lifecycle Status Change */}
      <Modal
        isOpen={Boolean(statusAccount)}
        onClose={() => setStatusAccount(null)}
        title={`تغيير حالة حساب شيفز — ${statusAccount?.base.code || ""}`}
        maxWidth="max-w-md"
      >
        {statusAccount && (
          <form onSubmit={handleSaveStatus} className="space-y-4" dir="rtl">
            {statusError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{statusError}</span>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">الحالة التشغيلية الحالية:</span>
                <span className="font-bold font-mono">
                  {statusAccount.chefz?.status || statusAccount.base.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">المندوب الفعلي المرتبط:</span>
                <span className="font-bold">
                  {statusAccount.base.currentAssignment?.actualRiderNameAr || "لا يوجد مندوب مرتبط"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--foreground)]">
                اختر الحالة المطلوبة <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-all ${
                    statusChoice === "Suspended"
                      ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30"
                      : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="statusChoice"
                    value="Suspended"
                    checked={statusChoice === "Suspended"}
                    onChange={() => setStatusChoice("Suspended")}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div>
                    <span className="font-bold text-[var(--foreground)] block">موقوف (Suspended)</span>
                    <span className="text-[var(--muted)] text-[11px]">
                      إيقاف مؤقت للحساب مع الاحتفاظ بارتباط المندوب إن وُجد.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-all ${
                    statusChoice === "Retired"
                      ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/30"
                      : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="statusChoice"
                    value="Retired"
                    checked={statusChoice === "Retired"}
                    onChange={() => setStatusChoice("Retired")}
                    className="mt-0.5 accent-rose-600"
                  />
                  <div>
                    <span className="font-bold text-[var(--foreground)] block">مستبعد (Retired)</span>
                    <span className="text-[var(--muted)] text-[11px]">
                      استبعاد الحساب من التشغيل مع الاحتفاظ برابط المندوب وبياناته.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-all ${
                    statusChoice === "Archived"
                      ? "border-slate-500 bg-slate-50/50 dark:bg-slate-900/40"
                      : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="statusChoice"
                    value="Archived"
                    checked={statusChoice === "Archived"}
                    onChange={() => setStatusChoice("Archived")}
                    className="mt-0.5 accent-slate-600"
                  />
                  <div>
                    <span className="font-bold text-[var(--foreground)] block">مؤرشف (Archived)</span>
                    <span className="text-[var(--muted)] text-[11px]">
                      أرشفة الحساب مع إمكانية استعادته لاحقاً دون حذفه.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition-all ${
                    statusChoice === "Active"
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                      : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="statusChoice"
                    value="Active"
                    checked={statusChoice === "Active"}
                    onChange={() => setStatusChoice("Active")}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-[var(--foreground)] block">استعادة الحالة التلقائية (Active)</span>
                    <span className="text-[var(--muted)] text-[11px]">
                      يحدد الحالة تلقائياً: (معيّن) إذا كان هناك مندوب مرتبط، أو (متاح) إذا لم يكن مرتبطاً.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-start gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
              <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <span>
                الحالات <strong>متاح</strong> و <strong>معيّن</strong> تُحدد تلقائياً. تغيير الحالة يحتفظ برابط المندوب، وإرجاع الحساب عملية منفصلة.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)]">سبب تغيير الحالة (اختياري)</label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="ملاحظات توثيق الإجراء (حد أقصى 500 حرف)..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
              />
              <span className="text-[10px] text-[var(--muted)] text-left block" dir="ltr">
                {statusReason.length} / 500
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStatusAccount(null)}
                disabled={statusSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={statusSubmitting}
                className="bg-[var(--brand)] text-white hover:opacity-90 min-w-[120px]"
              >
                {statusSubmitting ? "جارٍ الحفظ..." : "حفظ الحالة"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 6. Modal: Edit Assignment Start Date */}
      <Modal
        isOpen={Boolean(editingAssignment)}
        onClose={() => setEditingAssignment(null)}
        title="تعديل تاريخ بدء التكليف (Start Date)"
        maxWidth="max-w-md"
      >
        {editingAssignment && (
          <form onSubmit={handleSaveStartDate} className="space-y-4" dir="rtl">
            {startDateError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="font-semibold">{startDateError}</p>
                </div>
              </div>
            )}

            {/* Context Info Box */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">المندوب الفعلي:</span>
                <span className="font-bold text-[var(--foreground)]">
                  {editingAssignment.actualRiderNameAr || "مندوب سابق"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">تاريخ البدء الحالي:</span>
                <span className="font-mono font-bold text-[var(--foreground)]" dir="ltr">
                  {editingAssignment.effectiveFrom}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">تاريخ الانتهاء:</span>
                <span className="font-mono text-[var(--muted)]" dir="ltr">
                  {editingAssignment.effectiveTo || "مستمر حتى الآن"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">الحالة:</span>
                <span>
                  {editingAssignment.status === "Active" ? (
                    <Badge tone="green">نشط</Badge>
                  ) : editingAssignment.status === "Ended" ? (
                    <Badge tone="gray">منتهي</Badge>
                  ) : (
                    <Badge tone="red">ملغي</Badge>
                  )}
                </span>
              </div>
              {editingAssignment.rowVersion && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--border)]">
                  <span className="text-[var(--muted)]">رمز التزامن (rowVersion):</span>
                  <span
                    className="font-mono text-[var(--muted)] truncate max-w-[180px]"
                    dir="ltr"
                    title={editingAssignment.rowVersion}
                  >
                    {editingAssignment.rowVersion.slice(0, 16)}...
                  </span>
                </div>
              )}
            </div>

            {/* Date Input */}
            <div className="space-y-1.5">
              <DateInput
                label="تاريخ البدء الجديد (Effective From)"
                value={editStartDate}
                onChange={(val) => {
                  setEditStartDate(val);
                  setStartDateError(null);
                }}
                required
              />
              <p className="text-[11px] text-[var(--muted)]">
                سيتم إرسال رمز التزامن الحالي (rowVersion) مع التحديث لمنع التعارض بالتزامن.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingAssignment(null)}
                disabled={isSavingStartDate}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={
                  isSavingStartDate ||
                  !editStartDate.trim() ||
                  editStartDate === editingAssignment.effectiveFrom
                }
                className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 min-w-[130px]"
              >
                <Save className="h-4 w-4" />
                {isSavingStartDate ? "جارٍ التحديث..." : "حفظ تاريخ البدء"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
