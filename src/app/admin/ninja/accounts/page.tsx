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
  getAllNinjaAccounts,
  setNinjaAccountStatus,
  compareNinjaAccounts,
  assignNinjaAccount,
  returnNinjaAccount,
  updateNinjaCredentials,
  getRiyadhTodayDate,
  formatRiyadhDateTime,
  isCooldownActive,
  formatRemainingCooldown,
  type NinjaAccountResponse,
  type NinjaAccountStatusRequest,
  type NinjaAccountComparisonResponse,
  type NinjaAssignRequest,
  type NinjaReturnRequest,
  type NinjaCredentialRequest,
} from "@/lib/ninja/api";
import {
  createPlatformAccount,
  getAllPlatformAccounts,
  type PlatformResponse,
  type AccountUpsertRequest,
  type AccountResponse,
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
  TableHeaderColumnFilter,
  TableHeaderDualFilter,
  type FilterOption,
} from "@/components/ui/TableHeaderFilter";
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
  SlidersHorizontal,
  ArrowRightLeft,
  ShieldAlert,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  Filter,
  X,
  MapPin,
  Building2,
} from "lucide-react";

export default function NinjaAccountsPage() {
  const { can, canAny, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Permissions (Dedicated Ninja permission keys)
  const canRead =
    can("ninja.read") ||
    canAny(
      "ninja.accounts.update",
      "ninja.assignments.create",
      "ninja.assignments.delete",
      "ninja.credentials.rotate",
    );
  const canUpdate = can("ninja.accounts.update") || can("ninja.read");
  const canAssign = can("ninja.assignments.create") || canUpdate;
  const canReturn = can("ninja.assignments.delete") || canUpdate;
  const canRotatePassword = can("ninja.credentials.rotate") || canUpdate;
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
  const [platformActiveAccounts, setPlatformActiveAccounts] = useState<AccountResponse[]>([]);

  // Pagination (load all by default on the first page, allow user to paginate client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">("all");

  // Toolbar Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCooldown, setFilterCooldown] = useState<"all" | "active" | "ready">("all");
  const [filterDebtBlocked, setFilterDebtBlocked] = useState(false);
  const [filterCityId, setFilterCityId] = useState("");
  const [filterSponsorId, setFilterSponsorId] = useState("");

  // Column Header Filters
  const [colFilterCaptain, setColFilterCaptain] = useState<string[]>([]);
  const [colFilterStatus, setColFilterStatus] = useState<string[]>([]);
  const [colFilterOwners, setColFilterOwners] = useState<string[]>([]);
  const [colFilterCitySponsor, setColFilterCitySponsor] = useState<string[]>([]);
  const [colFilterRiders, setColFilterRiders] = useState<string[]>([]);
  const [colFilterPhone, setColFilterPhone] = useState<string[]>([]);
  const [colFilterPasswordCooldown, setColFilterPasswordCooldown] = useState<string[]>([]);
  const [colFilterSheet, setColFilterSheet] = useState<string[]>([]);

  const todayRiyadh = useMemo(() => getRiyadhTodayDate(), []);

  // -------------------------------------------------------------
  // Modals States
  // -------------------------------------------------------------

  // 1. Status Control Modal
  const [statusAccount, setStatusAccount] = useState<NinjaAccountResponse | null>(null);
  const [statusSelected, setStatusSelected] = useState<"Active" | "Suspended" | "Retired" | "Archived">("Active");
  const [statusReason, setStatusReason] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // 2. Assign Modal
  const [assigningAccount, setAssigningAccount] = useState<NinjaAccountResponse | null>(null);
  const [assignRiderId, setAssignRiderId] = useState("");
  const [showAllRidersInAssign, setShowAllRidersInAssign] = useState(false);
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(todayRiyadh);
  const [assignPhone, setAssignPhone] = useState("");
  const [assignPassword, setAssignPassword] = useState("");
  const [assignReason, setAssignReason] = useState("تعيين حساب نينجا للمندوب");
  const [assignWasBackdated, setAssignWasBackdated] = useState(false);
  const [assignBackdatedReason, setAssignBackdatedReason] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // 3. Return Modal
  const [releasingAccount, setReleasingAccount] = useState<NinjaAccountResponse | null>(null);
  const [returnEffectiveTo, setReturnEffectiveTo] = useState(todayRiyadh);
  const [returnPhone, setReturnPhone] = useState("");
  const [returnPassword, setReturnPassword] = useState("");
  const [returnReason, setReturnReason] = useState("إرجاع حساب نينجا من قِبل المندوب");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // 4. Update Credentials Modal
  const [credAccount, setCredAccount] = useState<NinjaAccountResponse | null>(null);
  const [credPhone, setCredPhone] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credReason, setCredReason] = useState("تحديث بيانات الاتصال بالحساب");
  const [credSubmitting, setCredSubmitting] = useState(false);

  // 5. Compare Accounts Modal
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [compareSubmitting, setCompareSubmitting] = useState(false);
  const [compareResult, setCompareResult] = useState<NinjaAccountComparisonResponse | null>(null);
  const [compareTab, setCompareTab] = useState<"summary" | "sheetOnly" | "systemOnly" | "differences" | "matching">("summary");

  // 6. Create Account Modal
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
      const [plat, cityList, sponsorList, riderList, platformActiveAccs] = await Promise.all([
        ensureNinjaPlatform().catch(() => null),
        listOperatingCities().catch(() => []),
        listSponsors().catch(() => []),
        listRiders().catch(() => []),
        getAllPlatformAccounts({ status: "Assigned", currentOnly: true }).catch(() => []),
      ]);
      setPlatform(plat);
      setCities(cityList);
      setSponsors(sponsorList);
      setRiders(riderList);
      if (Array.isArray(platformActiveAccs)) {
        setPlatformActiveAccounts(platformActiveAccs);
      }
    } catch (e) {
      console.warn("Could not load lookups", e);
    }
  };

  const loadAccounts = async () => {
    if (!canRead) return;
    setLoading(true);
    setFetchError(null);
    try {
      const items = await getAllNinjaAccounts();
      setAccounts(items);
      // Quietly update active platform assignments
      getAllPlatformAccounts({ status: "Assigned", currentOnly: true })
        .then((res) => {
          if (Array.isArray(res)) setPlatformActiveAccounts(res);
        })
        .catch(() => {});
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
    if (canRead) {
      loadAccounts();
    }
  }, [canRead]);

  // Lookup maps
  const cityMap = useMemo(() => {
    return new Map<string, string>(cities.map((c) => [c.id, c.globalCityAr]));
  }, [cities]);

  const sponsorMap = useMemo(() => {
    return new Map<string, string>(sponsors.map((s) => [s.id, s.registryNameAr]));
  }, [sponsors]);

  // Active assignments tracking: identifies riders with active assignments in Ninja and other platforms
  const activeAssignmentRiderSet = useMemo(() => {
    const activeIds = new Set<string>();
    const activeIqamas = new Set<string>();

    const addId = (id?: string | null) => {
      if (id && typeof id === "string" && id.trim()) {
        activeIds.add(id.trim().toLowerCase());
      }
    };
    const addIqama = (iqama?: string | null) => {
      if (iqama && typeof iqama === "string" && iqama.trim()) {
        activeIqamas.add(iqama.trim().toLowerCase());
      }
    };

    // 1. From all Ninja accounts loaded in the page
    for (const acc of accounts) {
      const isAssigned =
        (acc.status || "").toLowerCase() === "assigned" ||
        Boolean(acc.currentAssignmentId) ||
        Boolean(acc.actualRiderProfileId) ||
        Boolean(acc.actualRider) ||
        Boolean(acc.actualEmployeeId);

      if (isAssigned) {
        addId(acc.actualRiderProfileId);
        addId(acc.actualEmployeeId);
        addId(acc.actualRider?.employeeId);
        addIqama(acc.actualRider?.iqamaNo);
      }
    }

    // 2. From global platform accounts
    for (const pAcc of platformActiveAccounts) {
      const isAssigned =
        (pAcc.status || "").toLowerCase() === "assigned" ||
        Boolean(pAcc.currentAssignment);

      if (isAssigned && pAcc.currentAssignment) {
        addId(pAcc.currentAssignment.actualRiderProfileId);
        addId(pAcc.currentAssignment.actualEmployeeId);
      }
    }

    return { activeIds, activeIqamas };
  }, [accounts, platformActiveAccounts]);

  const hasActiveAssignment = useMemo(() => {
    return (r: Rider): boolean => {
      const id = (r.id || "").trim().toLowerCase();
      const empId = (r.employeeId || "").trim().toLowerCase();
      const iqama = (r.iqamaNo || "").trim().toLowerCase();

      if (id && activeAssignmentRiderSet.activeIds.has(id)) return true;
      if (empId && activeAssignmentRiderSet.activeIds.has(empId)) return true;
      if (iqama && activeAssignmentRiderSet.activeIqamas.has(iqama)) return true;
      return false;
    };
  }, [activeAssignmentRiderSet]);

  const assignableRiders = useMemo(() => {
    return riders.filter((r) => !hasActiveAssignment(r));
  }, [riders, hasActiveAssignment]);

  const assignRiderOptions = useMemo(() => {
    const list = showAllRidersInAssign ? riders : assignableRiders;
    return list.map((r) => {
      const isActive = hasActiveAssignment(r);
      const activeTag = isActive ? " [لديه تعيين نشط حالياً ⚠️]" : "";
      return {
        value: r.id,
        label: `${r.fullNameAr || r.fullNameEn} (${r.iqamaNo || r.employeeId})${activeTag}`,
      };
    });
  }, [riders, assignableRiders, showAllRidersInAssign, hasActiveAssignment]);

  // Localized Status Badge & Detail Formatter
  const getStatusDisplay = (acc: NinjaAccountResponse) => {
    const raw = (acc.status || "").toLowerCase();
    const isAssigned = raw === "assigned";
    const isAvailable = raw === "available";
    const isSuspended = raw === "suspended";
    const isRetired = raw === "retired";
    const isArchived = raw === "archived";

    // 1. Badge label & styling
    let label = isEn ? "Available" : "متاح للتعيين";
    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40";
    let dotClass = "bg-emerald-500";

    if (isAssigned) {
      label = isEn ? "Assigned" : "معين لمندوب";
      badgeClass = "bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/40";
      dotClass = "bg-purple-600";
    } else if (isAvailable) {
      label = isEn ? "Available" : "متاح للتعيين";
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40";
      dotClass = "bg-emerald-500";
    } else if (isSuspended) {
      label = isEn ? "Suspended" : "موقوف";
      badgeClass = "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40";
      dotClass = "bg-amber-500";
    } else if (isRetired) {
      label = isEn ? "Retired" : "مستبعد";
      badgeClass = "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/40";
      dotClass = "bg-rose-500";
    } else if (isArchived) {
      label = isEn ? "Archived" : "مؤرشف";
      badgeClass = "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
      dotClass = "bg-gray-500";
    }

    // 2. Status Detail / Subtitle
    let detailText = "";
    let detailClass = "text-[10px] text-[var(--muted)]";
    const rawReason = (acc.statusReason || "").trim();

    if (isAvailable) {
      // Fix confusing sheet checkup notes on an Available account
      if (!rawReason || rawReason === "لا يعمل حسب ملف نينجا" || rawReason.toLowerCase().includes("not working")) {
        detailText = isEn ? "Vacant (Ready to assign)" : "حساب شاغر (جاهز للتعيين)";
      } else {
        detailText = rawReason;
      }
    } else if (isAssigned) {
      if (acc.assignmentEffectiveFrom) {
        detailText = isEn ? `Since ${acc.assignmentEffectiveFrom}` : `ساري منذ ${acc.assignmentEffectiveFrom}`;
      } else if (rawReason) {
        detailText = rawReason;
      } else {
        detailText = isEn ? "Active in operations" : "نشط بالتشغيل الميداني";
      }
    } else if (isSuspended) {
      detailClass = "text-[10px] text-amber-700 dark:text-amber-400 font-medium";
      detailText = rawReason || (isEn ? "Suspended administratively" : "إيقاف إداري يدوي");
    } else if (isRetired) {
      detailClass = "text-[10px] text-rose-700 dark:text-rose-400 font-medium";
      detailText = rawReason || (isEn ? "Retired from service" : "مستبعد من التشغيل");
    } else if (isArchived) {
      detailClass = "text-[10px] text-[var(--muted)]";
      detailText = rawReason || (isEn ? "Archived record" : "سجل مؤرشف");
    }

    return { label, badgeClass, dotClass, detailText, detailClass, isSuspended };
  };

  // -------------------------------------------------------------
  // Filter Options for Column Headers
  // -------------------------------------------------------------

  // 1. Captain ID & Code Filter Options
  const captainFilterOptions: FilterOption[] = useMemo(() => {
    let customCodeCount = 0;
    let matchCodeCount = 0;
    for (const a of accounts) {
      if (a.code && a.code !== a.captainId) {
        customCodeCount++;
      } else {
        matchCodeCount++;
      }
    }
    return [
      {
        value: "CODE_CUSTOM",
        label: "كود مخصص (يختلف عن الكابتن ID)",
        sublabel: "الحسابات التي تم تعيين بادئة أو كود مخصص لها",
        count: customCodeCount,
      },
      {
        value: "CODE_MATCH",
        label: "كود مطابق لرقم الكابتن",
        sublabel: "الحسابات التي يطابق كودها رقم الكابتن مباشرة",
        count: matchCodeCount,
      },
    ];
  }, [accounts]);

  // 2. Status Filter Options
  const statusFilterOptions: FilterOption[] = useMemo(() => {
    const statusCounts = new Map<string, number>();
    let hasReasonCount = 0;
    for (const a of accounts) {
      const s = a.status || "Available";
      statusCounts.set(s, (statusCounts.get(s) || 0) + 1);
      if (a.statusReason?.trim()) {
        hasReasonCount++;
      }
    }
    const standard: FilterOption[] = [
      {
        value: "Available",
        label: "متاح (Available)",
        sublabel: "جاهز للتعيين لمندوب",
        count: statusCounts.get("Available") || 0,
      },
      {
        value: "Assigned",
        label: "معين لمندوب (Assigned)",
        sublabel: "مرتبط بمندوب فعلي حالياً",
        count: statusCounts.get("Assigned") || 0,
      },
      {
        value: "Suspended",
        label: "موقوف (Suspended)",
        sublabel: "إيقاف إداري يدوي",
        count: statusCounts.get("Suspended") || 0,
      },
      {
        value: "Retired",
        label: "مستبعد (Retired)",
        sublabel: "مستبعد من التشغيل",
        count: statusCounts.get("Retired") || 0,
      },
      {
        value: "Archived",
        label: "مؤرشف (Archived)",
        sublabel: "أرشفة السجل مع إمكانية الاستعادة",
        count: statusCounts.get("Archived") || 0,
      },
    ];
    if (hasReasonCount > 0) {
      standard.push({
        value: "HAS_REASON",
        label: "مسجل له سبب إيقاف/تعديل",
        sublabel: "حسابات تحوي ملاحظات إدارية",
        count: hasReasonCount,
      });
    }
    return standard;
  }, [accounts]);

  // 3. Registered Owner Filter Options
  const ownerFilterOptions: FilterOption[] = useMemo(() => {
    let hasIqamaCount = 0;
    let noIqamaCount = 0;
    const ownerCounts = new Map<string, { count: number; iqama?: string }>();

    for (const a of accounts) {
      const name =
        a.owner?.nameAr || a.owner?.nameEn || a.ownerRiderNameAr || a.ownerRiderNameEn || "غير محدد";
      const iqama = a.owner?.iqamaNo || undefined;
      if (iqama) hasIqamaCount++;
      else noIqamaCount++;

      const prev = ownerCounts.get(name);
      if (prev) {
        prev.count++;
      } else {
        ownerCounts.set(name, { count: 1, iqama });
      }
    }

    const options: FilterOption[] = [
      {
        value: "HAS_IQAMA",
        label: "مسجل له رقم هوية/إقامة",
        count: hasIqamaCount,
      },
      {
        value: "NO_IQAMA",
        label: "غير مسجل له رقم هوية",
        count: noIqamaCount,
      },
    ];

    const sortedOwners = Array.from(ownerCounts.entries()).sort((a, b) => b[1].count - a[1].count);
    for (const [name, info] of sortedOwners) {
      options.push({
        value: `OWNER_${name}`,
        label: name,
        sublabel: info.iqama ? `هوية: ${info.iqama}` : undefined,
        count: info.count,
      });
    }

    return options;
  }, [accounts]);

  // 4. City & Sponsor Dual Filter Options
  const citySponsorFilterOptions: FilterOption[] = useMemo(() => {
    const cityCounts = new Map<string, number>();
    const sponsorCounts = new Map<string, number>();
    for (const a of accounts) {
      if (a.operatingCityId) {
        cityCounts.set(a.operatingCityId, (cityCounts.get(a.operatingCityId) || 0) + 1);
      }
      if (a.sponsorId) {
        sponsorCounts.set(a.sponsorId, (sponsorCounts.get(a.sponsorId) || 0) + 1);
      }
    }

    const list: FilterOption[] = [];
    for (const c of cities) {
      const count = cityCounts.get(c.id) || 0;
      if (count > 0) {
        list.push({
          value: `CITY_${c.id}`,
          label: `مدينة: ${c.globalCityAr}`,
          count,
        });
      }
    }
    for (const s of sponsors) {
      const count = sponsorCounts.get(s.id) || 0;
      if (count > 0) {
        list.push({
          value: `SPONSOR_${s.id}`,
          label: `كفيل: ${s.registryNameAr}`,
          count,
        });
      }
    }

    return list.sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [accounts, cities, sponsors]);

  // 5. Actual Assigned Rider Filter Options
  const riderFilterOptions: FilterOption[] = useMemo(() => {
    let assignedCount = 0;
    let unassignedCount = 0;
    let debtBlockedCount = 0;
    let debtClearCount = 0;
    const riderCounts = new Map<string, { count: number; name: string; iqama?: string }>();

    for (const a of accounts) {
      const isAssigned = Boolean(a.actualRiderProfileId || a.actualRider);
      if (isAssigned) {
        assignedCount++;
        const name =
          a.actualRider?.nameAr ||
          a.actualRider?.nameEn ||
          a.actualRiderNameAr ||
          a.actualRiderNameEn ||
          "مندوب معين";
        const key = a.actualRider?.employeeId || a.actualRider?.iqamaNo || name;
        const iqama = a.actualRider?.iqamaNo || undefined;
        const prev = riderCounts.get(key);
        if (prev) {
          prev.count++;
        } else {
          riderCounts.set(key, { count: 1, name, iqama });
        }
      } else {
        unassignedCount++;
      }

      if (a.isOperationallyBlocked) {
        debtBlockedCount++;
      } else {
        debtClearCount++;
      }
    }

    const options: FilterOption[] = [
      {
        value: "STATUS_ASSIGNED",
        label: "معين لمندوب (نشط)",
        sublabel: "حسابات مرتبطة بمندوب فعلي حالياً",
        count: assignedCount,
      },
      {
        value: "STATUS_UNASSIGNED",
        label: "غير معين (شاغر)",
        sublabel: "حسابات جاهزة للتخصيص والتعيين",
        count: unassignedCount,
      },
      {
        value: "DEBT_BLOCKED",
        label: "حظر مديونية تشغيلية",
        sublabel: "مندوب عليه حظر تشغيلي من منصة سابقة",
        count: debtBlockedCount,
      },
      {
        value: "DEBT_CLEAR",
        label: "سليم من حظر المديونية",
        sublabel: "لا توجد موانع مديونية مسجلة",
        count: debtClearCount,
      },
    ];

    const sortedRiders = Array.from(riderCounts.entries()).sort((a, b) => b[1].count - a[1].count);
    for (const [key, info] of sortedRiders) {
      options.push({
        value: `RIDER_${key}`,
        label: info.name,
        sublabel: info.iqama ? `هوية: ${info.iqama}` : undefined,
        count: info.count,
      });
    }

    return options;
  }, [accounts]);

  // 6. Login Phone Filter Options
  const phoneFilterOptions: FilterOption[] = useMemo(() => {
    let withPhoneCount = 0;
    let withoutPhoneCount = 0;
    let saudiCount = 0;
    let nonSaudiCount = 0;

    for (const a of accounts) {
      const p = (a.phoneNumber || "").trim();
      if (p) {
        withPhoneCount++;
        if (p.startsWith("05") || p.startsWith("+9665") || p.startsWith("9665")) {
          saudiCount++;
        } else {
          nonSaudiCount++;
        }
      } else {
        withoutPhoneCount++;
      }
    }

    return [
      {
        value: "WITH_PHONE",
        label: "مسجل له رقم هاتف دخول",
        sublabel: "أرقام الدخول النشطة للحسابات",
        count: withPhoneCount,
      },
      {
        value: "WITHOUT_PHONE",
        label: "لم يسجل رقم هاتف بعد",
        sublabel: "حسابات بحاجة لإدخال رقم هاتف",
        count: withoutPhoneCount,
      },
      {
        value: "SAUDI_PHONE",
        label: "رقم جوال سعودي (05xxxxxxxx)",
        count: saudiCount,
      },
      {
        value: "NON_SAUDI_PHONE",
        label: "رقم دولي أو غير قياسي",
        count: nonSaudiCount,
      },
    ];
  }, [accounts]);

  // 7. Password & Cooldown Filter Options
  const passwordCooldownFilterOptions: FilterOption[] = useMemo(() => {
    let passwordSetCount = 0;
    let passwordUnsetCount = 0;
    let cooldownActiveCount = 0;
    let cooldownReadyCount = 0;

    for (const a of accounts) {
      if (a.hasPassword) passwordSetCount++;
      else passwordUnsetCount++;

      if (isCooldownActive(a.passwordChangeAllowedAtUtc)) {
        cooldownActiveCount++;
      } else {
        cooldownReadyCount++;
      }
    }

    return [
      {
        value: "PASSWORD_SET",
        label: "كلمة المرور مسجلة",
        sublabel: "تم حفظ كلمة مرور مشفرة في النظام",
        count: passwordSetCount,
      },
      {
        value: "PASSWORD_UNSET",
        label: "كلمة المرور غير مسجلة",
        sublabel: "يلزم تدوير أو تسجيل كلمة المرور",
        count: passwordUnsetCount,
      },
      {
        value: "COOLDOWN_ACTIVE",
        label: "فترة انتظار نشطة (72h)",
        sublabel: "لا يمكن تعديل كلمة المرور حتى انتهاء المدة",
        count: cooldownActiveCount,
      },
      {
        value: "COOLDOWN_READY",
        label: "متاحة للتغيير",
        sublabel: "فترة الانتظار منتهية أو لم تسجل مسبقاً",
        count: cooldownReadyCount,
      },
    ];
  }, [accounts]);

  // 8. Latest Sheet Checkup Filter Options
  const sheetFilterOptions: FilterOption[] = useMemo(() => {
    let hasCheckupCount = 0;
    let noCheckupCount = 0;
    let sheetSuspendedCount = 0;
    let sheetActiveCount = 0;
    const statusCounts = new Map<string, number>();

    for (const a of accounts) {
      const has = Boolean(a.latestSheetStatus || a.sheetUpdatedAtUtc);
      if (has) hasCheckupCount++;
      else noCheckupCount++;

      if (a.latestSheetSuspended === true) sheetSuspendedCount++;
      else if (a.latestSheetSuspended === false) sheetActiveCount++;

      if (a.latestSheetStatus) {
        statusCounts.set(a.latestSheetStatus, (statusCounts.get(a.latestSheetStatus) || 0) + 1);
      }
    }

    const options: FilterOption[] = [
      {
        value: "CHECKUP_EXISTS",
        label: "تم فحصه بالشيت",
        sublabel: "حسابات خضعت للمطابقة مع شيتات نينجا",
        count: hasCheckupCount,
      },
      {
        value: "CHECKUP_NONE",
        label: "لا يوجد فحص بالشيت",
        sublabel: "حسابات جديدة أو لم ترد في شيت بعد",
        count: noCheckupCount,
      },
      {
        value: "SHEET_ACTIVE",
        label: "نشط بالشيت (غير موقوف)",
        count: sheetActiveCount,
      },
      {
        value: "SHEET_SUSPENDED",
        label: "موقوف بالشيت (Suspended)",
        count: sheetSuspendedCount,
      },
    ];

    for (const [st, count] of statusCounts.entries()) {
      options.push({
        value: `STATUS_${st}`,
        label: `حالة الشيت: ${st}`,
        count,
      });
    }

    return options;
  }, [accounts]);

  // -------------------------------------------------------------
  // Filtered Accounts
  // -------------------------------------------------------------
  const filteredAccounts = useMemo(() => {
    let result = accounts;

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((a) => {
        const captain = (a.captainId || "").toLowerCase();
        const code = (a.code || "").toLowerCase();
        const phone = (a.phoneNumber || "").toLowerCase();
        const ownerAr = (a.owner?.nameAr || a.ownerRiderNameAr || "").toLowerCase();
        const ownerEn = (a.owner?.nameEn || a.ownerRiderNameEn || "").toLowerCase();
        const ownerIqama = (a.owner?.iqamaNo || "").toLowerCase();
        const riderAr = (a.actualRider?.nameAr || a.actualRiderNameAr || "").toLowerCase();
        const riderEn = (a.actualRider?.nameEn || a.actualRiderNameEn || "").toLowerCase();
        const riderIqama = (a.actualRider?.iqamaNo || "").toLowerCase();
        const cityName = (cityMap.get(a.operatingCityId) || a.operatingCityNameAr || "").toLowerCase();
        const sponsorName = (sponsorMap.get(a.sponsorId || "") || a.sponsorNameAr || "").toLowerCase();
        return (
          captain.includes(q) ||
          code.includes(q) ||
          phone.includes(q) ||
          ownerAr.includes(q) ||
          ownerEn.includes(q) ||
          ownerIqama.includes(q) ||
          riderAr.includes(q) ||
          riderEn.includes(q) ||
          riderIqama.includes(q) ||
          cityName.includes(q) ||
          sponsorName.includes(q)
        );
      });
    }

    // Toolbar Status
    if (filterStatus !== "all") {
      result = result.filter((a) => (a.status || "").toLowerCase() === filterStatus.toLowerCase());
    }

    // Toolbar Cooldown
    if (filterCooldown === "active") {
      result = result.filter((a) => isCooldownActive(a.passwordChangeAllowedAtUtc));
    } else if (filterCooldown === "ready") {
      result = result.filter((a) => !isCooldownActive(a.passwordChangeAllowedAtUtc));
    }

    // Toolbar Debt Blocked
    if (filterDebtBlocked) {
      result = result.filter((a) => a.isOperationallyBlocked);
    }

    // Toolbar City
    if (filterCityId) {
      result = result.filter((a) => a.operatingCityId === filterCityId);
    }

    // Toolbar Sponsor
    if (filterSponsorId) {
      result = result.filter((a) => a.sponsorId === filterSponsorId);
    }

    // Column Filter: Captain ID & Code
    if (colFilterCaptain.length > 0) {
      result = result.filter((a) => {
        const isCustom = a.code && a.code !== a.captainId;
        return colFilterCaptain.some((val) => {
          if (val === "CODE_CUSTOM") return isCustom;
          if (val === "CODE_MATCH") return !isCustom;
          return a.captainId === val || a.code === val;
        });
      });
    }

    // Column Filter: Status
    if (colFilterStatus.length > 0) {
      result = result.filter((a) => {
        const s = (a.status || "").toLowerCase();
        return colFilterStatus.some((val) => {
          if (val === "HAS_REASON") return Boolean(a.statusReason?.trim());
          return s === val.toLowerCase();
        });
      });
    }

    // Column Filter: Registered Owner
    if (colFilterOwners.length > 0) {
      result = result.filter((a) => {
        const ownerName =
          a.owner?.nameAr || a.owner?.nameEn || a.ownerRiderNameAr || a.ownerRiderNameEn || "";
        const hasIqama = Boolean(a.owner?.iqamaNo);
        return colFilterOwners.some((val) => {
          if (val === "HAS_IQAMA") return hasIqama;
          if (val === "NO_IQAMA") return !hasIqama;
          if (val.startsWith("OWNER_")) return val.slice(6) === ownerName;
          return false;
        });
      });
    }

    // Column Filter: City / Sponsor
    if (colFilterCitySponsor.length > 0) {
      const selectedCities = colFilterCitySponsor
        .filter((v) => v.startsWith("CITY_"))
        .map((v) => v.slice(5));
      const selectedSponsors = colFilterCitySponsor
        .filter((v) => v.startsWith("SPONSOR_"))
        .map((v) => v.slice(8));

      if (selectedCities.length > 0) {
        result = result.filter(
          (a) => a.operatingCityId && selectedCities.includes(a.operatingCityId)
        );
      }
      if (selectedSponsors.length > 0) {
        result = result.filter((a) => a.sponsorId && selectedSponsors.includes(a.sponsorId));
      }
    }

    // Column Filter: Actual Assigned Rider
    if (colFilterRiders.length > 0) {
      result = result.filter((a) => {
        const isAssigned = Boolean(a.actualRiderProfileId || a.actualRider);
        const riderName =
          a.actualRider?.nameAr ||
          a.actualRider?.nameEn ||
          a.actualRiderNameAr ||
          a.actualRiderNameEn ||
          "";
        const riderKey = a.actualRider?.employeeId || a.actualRider?.iqamaNo || riderName;
        return colFilterRiders.some((val) => {
          if (val === "STATUS_ASSIGNED") return isAssigned;
          if (val === "STATUS_UNASSIGNED") return !isAssigned;
          if (val === "DEBT_BLOCKED") return a.isOperationallyBlocked;
          if (val === "DEBT_CLEAR") return !a.isOperationallyBlocked;
          if (val.startsWith("RIDER_"))
            return val.slice(6) === riderKey || val.slice(6) === riderName;
          return false;
        });
      });
    }

    // Column Filter: Phone
    if (colFilterPhone.length > 0) {
      result = result.filter((a) => {
        const p = (a.phoneNumber || "").trim();
        const hasPhone = Boolean(p);
        const isSaudi = p.startsWith("05") || p.startsWith("+9665") || p.startsWith("9665");
        return colFilterPhone.some((val) => {
          if (val === "WITH_PHONE") return hasPhone;
          if (val === "WITHOUT_PHONE") return !hasPhone;
          if (val === "SAUDI_PHONE") return hasPhone && isSaudi;
          if (val === "NON_SAUDI_PHONE") return hasPhone && !isSaudi;
          return false;
        });
      });
    }

    // Column Filter: Password & Cooldown
    if (colFilterPasswordCooldown.length > 0) {
      result = result.filter((a) => {
        const isCooldown = isCooldownActive(a.passwordChangeAllowedAtUtc);
        return colFilterPasswordCooldown.some((val) => {
          if (val === "PASSWORD_SET") return a.hasPassword;
          if (val === "PASSWORD_UNSET") return !a.hasPassword;
          if (val === "COOLDOWN_ACTIVE") return isCooldown;
          if (val === "COOLDOWN_READY") return !isCooldown;
          return false;
        });
      });
    }

    // Column Filter: Latest Sheet Checkup
    if (colFilterSheet.length > 0) {
      result = result.filter((a) => {
        const hasCheckup = Boolean(a.latestSheetStatus || a.sheetUpdatedAtUtc);
        return colFilterSheet.some((val) => {
          if (val === "CHECKUP_EXISTS") return hasCheckup;
          if (val === "CHECKUP_NONE") return !hasCheckup;
          if (val === "SHEET_SUSPENDED") return a.latestSheetSuspended === true;
          if (val === "SHEET_ACTIVE") return a.latestSheetSuspended === false;
          if (val.startsWith("STATUS_")) return (a.latestSheetStatus || "") === val.slice(7);
          return false;
        });
      });
    }

    return result;
  }, [
    accounts,
    search,
    filterStatus,
    filterCooldown,
    filterDebtBlocked,
    filterCityId,
    filterSponsorId,
    colFilterCaptain,
    colFilterStatus,
    colFilterOwners,
    colFilterCitySponsor,
    colFilterRiders,
    colFilterPhone,
    colFilterPasswordCooldown,
    colFilterSheet,
    cityMap,
    sponsorMap,
  ]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    search.trim() ||
      filterStatus !== "all" ||
      filterCooldown !== "all" ||
      filterDebtBlocked ||
      filterCityId ||
      filterSponsorId ||
      colFilterCaptain.length > 0 ||
      colFilterStatus.length > 0 ||
      colFilterOwners.length > 0 ||
      colFilterCitySponsor.length > 0 ||
      colFilterRiders.length > 0 ||
      colFilterPhone.length > 0 ||
      colFilterPasswordCooldown.length > 0 ||
      colFilterSheet.length > 0
  );

  const handleClearAllFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterCooldown("all");
    setFilterDebtBlocked(false);
    setFilterCityId("");
    setFilterSponsorId("");
    setColFilterCaptain([]);
    setColFilterStatus([]);
    setColFilterOwners([]);
    setColFilterCitySponsor([]);
    setColFilterRiders([]);
    setColFilterPhone([]);
    setColFilterPasswordCooldown([]);
    setColFilterSheet([]);
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    filterStatus,
    filterCooldown,
    filterDebtBlocked,
    filterCityId,
    filterSponsorId,
    colFilterCaptain,
    colFilterStatus,
    colFilterOwners,
    colFilterCitySponsor,
    colFilterRiders,
    colFilterPhone,
    colFilterPasswordCooldown,
    colFilterSheet,
    pageSize,
  ]);

  const totalFilteredCount = filteredAccounts.length;
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  // Displayed accounts: all by default on the first page
  const displayedAccounts = useMemo(() => {
    if (pageSize === "all") return filteredAccounts;
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // -------------------------------------------------------------
  // Actions: Change Status
  // -------------------------------------------------------------
  const openStatusModal = (account: NinjaAccountResponse) => {
    setStatusAccount(account);
    const curr = (account.status || "Available") as any;
    const rawReason = (account.statusReason || "").trim();
    if (curr === "Assigned" || curr === "Available") {
      setStatusSelected("Active");
      // Don't pre-fill stale sheet notes on active account
      if (rawReason === "لا يعمل حسب ملف نينجا" || rawReason === "مشكلة بالحساب حسب ملف نينجا") {
        setStatusReason("");
      } else {
        setStatusReason(rawReason);
      }
    } else if (["Suspended", "Retired", "Archived"].includes(curr)) {
      setStatusSelected(curr);
      setStatusReason(rawReason);
    } else {
      setStatusSelected("Active");
      setStatusReason("");
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusAccount) return;

    setStatusSubmitting(true);
    try {
      const targetId = statusAccount.accountId || statusAccount.id;
      if (!targetId) throw new Error("معرف الحساب غير صالح.");

      const cleanedReason = statusReason.trim();
      const finalReason =
        statusSelected === "Active" && (cleanedReason === "لا يعمل حسب ملف نينجا" || cleanedReason === "مشكلة بالحساب حسب ملف نينجا")
          ? null
          : cleanedReason || null;

      const payload: NinjaAccountStatusRequest = {
        status: statusSelected,
        rowVersion: statusAccount.rowVersion,
        reason: finalReason,
      };

      const updated = await setNinjaAccountStatus(targetId, payload);
      toast.success("تم بنجاح", `تم تحديث حالة الحساب إلى ${updated.status}.`);
      setStatusAccount(null);
      loadAccounts();
    } catch (err: any) {
      console.error("Status update error", err);
      if (err?.status === 409) {
        toast.error("تعارض في السجل (409)", "تم تعديل الحساب بالتزامن من مستخدم آخر. يرجى مراجعة البيانات الحالية.");
        loadAccounts();
      } else if (err?.code === "rider.jahez_debt_block" || err?.message?.includes("debt")) {
        toast.error("حظر مديونية تشغيلية", "لا يمكن تنشيط الحساب لوجود مديونية تشغيلية سابقة على المندوب.");
      } else {
        toast.error("خطأ", err?.message || "تعذر تحديث حالة الحساب.");
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Assign
  // -------------------------------------------------------------
  const openAssignModal = (account: NinjaAccountResponse) => {
    setAssigningAccount(account);
    setAssignRiderId("");
    setShowAllRidersInAssign(false);
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
    const chosenRider = riders.find((r) => r.id === assignRiderId);
    if (chosenRider && hasActiveAssignment(chosenRider) && !showAllRidersInAssign) {
      toast.error("تنبيه", "هذا المندوب لديه تعيين نشط حالياً. يرجى اختيار مندوب متاح بدون تعيينات نشطة.");
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
    if (assignPassword.trim() && !canRotatePassword) {
      toast.error("غير مصرح", "إدخال كلمة مرور جديدة يتطلب توفر صلاحية تدوير كلمات المرور (ninja.credentials.rotate).");
      return;
    }

    setAssignSubmitting(true);
    try {
      const targetId = assigningAccount.accountId || assigningAccount.id;
      if (!targetId) throw new Error("معرف الحساب غير صالح.");

      const payload: NinjaAssignRequest = {
        actualRiderProfileId: assignRiderId,
        effectiveFrom: assignEffectiveFrom,
        phoneNumber: assignPhone.trim(),
        newPassword: assignPassword.trim() ? assignPassword.trim() : null,
        reason: assignReason.trim() || null,
        wasBackdated: isBackdated,
        backdatedReason: isBackdated ? assignBackdatedReason.trim() : null,
      };

      const res = await assignNinjaAccount(targetId, payload);

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
      loadAccounts();
    } catch (err: any) {
      console.error("Assign error", err);
      if (err?.status === 409) {
        toast.error("تعارض في السجل (409)", "تم تعديل الحساب بالتزامن. يرجى مراجعة البيانات الحالية وإعادة المحاولة.");
        loadAccounts();
      } else {
        toast.error("خطأ في التعيين", err?.message || "تعذر تعيين الحساب.");
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
        "انتهت فترة انتظار كلمة المرور (أو لم تسجل مسبقاً)، يلزم إدخال كلمة مرور جديدة عند الإرجاع."
      );
      return;
    }
    if (returnPassword.trim() && !canRotatePassword) {
      toast.error("غير مصرح", "إدخال كلمة مرور جديدة يتطلب توفر صلاحية تدوير كلمات المرور (ninja.credentials.rotate).");
      return;
    }

    if (!releasingAccount.assignmentRowVersion) {
      toast.error("خطأ", "رمز تزامن التعيين مفقود. يرجى تحديث بيانات الحساب والمحاولة ثانية.");
      return;
    }

    setReturnSubmitting(true);
    try {
      const targetId = releasingAccount.accountId || releasingAccount.id;
      if (!targetId) throw new Error("معرف الحساب غير صالح.");

      const payload: NinjaReturnRequest = {
        effectiveTo: returnEffectiveTo,
        phoneNumber: returnPhone.trim(),
        newPassword: returnPassword.trim() ? returnPassword.trim() : null,
        reason: returnReason.trim(),
        rowVersion: releasingAccount.assignmentRowVersion,
        status: "Ended",
      };

      const res = await returnNinjaAccount(targetId, payload);

      if (res.credentials?.notification) {
        toast.warning(
          "تم الإرجاع مع تنبيه",
          isEn ? res.credentials.notification.messageEn : res.credentials.notification.messageAr
        );
      } else {
        toast.success("تم بنجاح", "تم إنهاء التعيين وإرجاع حساب نينجا بنجاح.");
      }

      setReleasingAccount(null);
      loadAccounts();
    } catch (err: any) {
      console.error("Return error", err);
      if (err?.status === 409) {
        toast.error("تعارض في سجل التعيين (409)", "تم تعديل التعيين بالتزامن. يرجى تحديث البيانات والمحاولة مجدداً.");
        loadAccounts();
      } else {
        toast.error("خطأ في الإرجاع", err?.message || "تعذر إرجاع الحساب.");
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
    setCredReason("تحديث بيانات الاتصال بالحساب");
  };

  const handleCredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credAccount) return;

    const trimmedPhone = credPhone.trim();
    const trimmedPass = credPassword.trim();

    if (!trimmedPhone && !trimmedPass) {
      toast.error("تنبيه", "يجب إدخال رقم الهاتف الجديد أو كلمة المرور الجديدة على الأقل.");
      return;
    }
    if (trimmedPhone && trimmedPhone.length < 7) {
      toast.error("تنبيه", "رقم الهاتف غير صالح (يجب ألا يقل عن 7 أرقام).");
      return;
    }
    if (!credReason.trim()) {
      toast.error("تنبيه", "يرجى ذكر سبب التحديث.");
      return;
    }
    if (trimmedPass && !canRotatePassword) {
      toast.error("غير مصرح", "تحديث أو إدخال كلمة مرور جديدة يتطلب صلاحية تدوير كلمات المرور (ninja.credentials.rotate).");
      return;
    }

    setCredSubmitting(true);
    try {
      const targetId = credAccount.accountId || credAccount.id;
      if (!targetId) throw new Error("معرف الحساب غير صالح.");

      const payload: NinjaCredentialRequest = {
        phoneNumber: trimmedPhone || null,
        newPassword: trimmedPass || null,
        reason: credReason.trim(),
        rowVersion: credAccount.rowVersion,
      };

      const res = await updateNinjaCredentials(targetId, payload);

      if (res.notification) {
        toast.warning(
          "تنبيه فترة الانتظار",
          isEn ? res.notification.messageEn : res.notification.messageAr
        );
      } else if (res.passwordChanged) {
        toast.success("تم بنجاح", "تم تحديث كلمة المرور ورقم الهاتف بنجاح.");
      } else {
        toast.success("تم بنجاح", "تم تحديث رقم الهاتف بنجاح (كلمة المرور لم تتغير).");
      }

      setCredAccount(null);
      loadAccounts();
    } catch (err: any) {
      console.error("Update credentials error", err);
      if (err?.status === 409) {
        toast.error("تعارض في السجل (409)", "تم تعديل بيانات الحساب بالتزامن. يرجى التحديث والمحاولة ثانية.");
        loadAccounts();
      } else {
        toast.error("خطأ في التحديث", err?.message || "تعذر تحديث بيانات الدخول.");
      }
    } finally {
      setCredSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Compare Accounts Workbook
  // -------------------------------------------------------------
  const handleCompareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compareFile) {
      toast.error("تنبيه", "يرجى اختيار ملف إكسل .xlsx.");
      return;
    }

    setCompareSubmitting(true);
    try {
      const res = await compareNinjaAccounts(compareFile);
      setCompareResult(res);
      setCompareTab("summary");
      if (res.comparisonCompleted) {
        toast.success("تمت المقارنة بنجاح", `تمت مقارنة ${res.summary?.sheetAccounts || 0} حساب من الشيت مع سجلات النظام.`);
      } else {
        toast.warning("اكتملت المقارنة مع تنبيهات", "تم فحص الملف ولكن توجد مشاكل أو تعارضات تحتاج إلى مراجعة.");
      }
    } catch (err: any) {
      console.error("Compare error", err);
      toast.error("خطأ في المقارنة", err?.message || "تعذر تنفيذ مقارنة الشيت مع النظام.");
    } finally {
      setCompareSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Actions: Create Account in ERP
  // -------------------------------------------------------------
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateAccount) return;

    if (!createCaptainId.trim()) {
      toast.error("تنبيه", "يرجى إدخال رقم الكابتن (Captain ID).");
      return;
    }
    if (!createCityId) {
      toast.error("تنبيه", "يرجى اختيار مدينة التشغيل.");
      return;
    }
    if (!createSponsorId) {
      toast.error("تنبيه", "يرجى اختيار الكفيل.");
      return;
    }
    if (!createOwnerRiderId) {
      toast.error("تنبيه", "يرجى اختيار ملف المندوب المالك للحساب.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const ninjaPlat = platform || (await ensureNinjaPlatform());
      if (!ninjaPlat?.id) {
        throw new Error("تعذر الوصول لمنصة نينجا في النظام.");
      }

      const payload: AccountUpsertRequest = {
        platformId: ninjaPlat.id,
        operatingCityId: createCityId,
        sponsorId: createSponsorId,
        ownerRiderProfileId: createOwnerRiderId,
        code: createCode.trim() || `NINJA-${createCaptainId.trim()}`,
        externalAccountId: createCaptainId.trim(),
        paymentModel: createPaymentModel,
        status: "Available",
      };

      await createPlatformAccount(payload);
      toast.success("تم بنجاح", `تم إنشاء حساب نينجا برقم كابتن ${createCaptainId.trim()} بنجاح.`);

      setIsCreateOpen(false);
      setCreateCaptainId("");
      setCreateCode("");
      loadAccounts();
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
          accessor: (a) => a.owner?.nameAr || a.ownerRiderNameAr || a.ownerEmployeeId || "—",
        },
        {
          header: "هوية المالك",
          accessor: (a) => a.owner?.iqamaNo || "—",
          isText: true,
        },
        {
          header: "المندوب الفعلي",
          accessor: (a) => a.actualRider?.nameAr || a.actualRiderNameAr || "غير معين",
        },
        {
          header: "هوية المندوب الفعلي",
          accessor: (a) => a.actualRider?.iqamaNo || "—",
          isText: true,
        },
        {
          header: "رقم هاتف الدخول",
          accessor: (a) => a.phoneNumber || "لم يسجل بعد",
          isText: true,
        },
        {
          header: "كلمة المرور مسجلة",
          accessor: (a) => (a.hasPassword ? "نعم" : "لا"),
        },
        {
          header: "فترة الانتظار (72h)",
          accessor: (a) =>
            isCooldownActive(a.passwordChangeAllowedAtUtc)
              ? "نشطة"
              : "متاحة للتغيير",
        },
        {
          header: "موعد إتاحة كلمة المرور",
          accessor: (a) =>
            a.passwordChangeAllowedAtUtc
              ? formatRiyadhDateTime(a.passwordChangeAllowedAtUtc, "ar")
              : "—",
        },
        {
          header: "آخر حالة بالشيت",
          accessor: (a) => a.latestSheetStatus || "—",
        },
        {
          header: "حظر مديونية تشغيلية",
          accessor: (a) => (a.isOperationallyBlocked ? "محظور" : "لا"),
        },
      ],
    });
  };

  if (!canRead) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center" dir={isEn ? "ltr" : "rtl"}>
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {t("common.error") || "غير مصرح"}
        </h2>
        <p className="text-slate-500 max-w-md">
          {isEn
            ? "You do not have permission to view Ninja accounts (ninja.read)."
            : "ليس لديك الصلاحية الكافية لعرض حسابات وعمليات نينجا (ninja.read)."}
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
                إدارة كباتن وحسابات نينجا، التحكم بالحالات، ربط المناديب، متابعة فترات انتظار كلمات المرور وفحوصات الشيتات.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/ninja/sheet-updates">
            <Button variant="secondary" className="gap-2 text-xs font-bold border-purple-200 dark:border-purple-900/50">
              <FileSpreadsheet className="h-4 w-4 text-purple-600" />
              فحص ومراجعة الشيتات
            </Button>
          </Link>

          <Button
            variant="secondary"
            onClick={() => {
              setIsCompareOpen(true);
              setCompareFile(null);
              setCompareResult(null);
            }}
            className="gap-2 text-xs font-bold"
          >
            <ArrowRightLeft className="h-4 w-4 text-indigo-600" />
            مقارنة شيت الكباتن
          </Button>

          <Button
            variant="secondary"
            onClick={() => loadAccounts()}
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
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير (Excel)
          </Button>

          {canCreateAccount && (
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              إضافة حساب نينجا
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-[var(--muted)] rtl:right-3.5 ltr:left-3.5" />
            <Input
              placeholder="بحث برقم الكابتن، كود الحساب، اسم المالك، المندوب، الهوية، الهاتف، المدينة أو الكفيل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 rtl:pr-10 ltr:pl-10 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="تصفية حسب حالة الحساب"
              className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--foreground)]"
            >
              <option value="all">جميع الحالات</option>
              <option value="Available">متاح (Available)</option>
              <option value="Assigned">معين (Assigned)</option>
              <option value="Suspended">موقوف (Suspended)</option>
              <option value="Retired">مستبعد (Retired)</option>
              <option value="Archived">مؤرشف (Archived)</option>
            </select>

            {/* Cooldown Filter */}
            <select
              value={filterCooldown}
              onChange={(e) => setFilterCooldown(e.target.value as any)}
              aria-label="تصفية حسب فترة الانتظار"
              className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--foreground)]"
            >
              <option value="all">جميع فترات الانتظار</option>
              <option value="active">فترة انتظار نشطة (72h)</option>
              <option value="ready">متاحة للتغيير</option>
            </select>

            {/* City Filter */}
            <select
              value={filterCityId}
              onChange={(e) => setFilterCityId(e.target.value)}
              aria-label="تصفية حسب المدينة"
              className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--foreground)]"
            >
              <option value="">جميع المدن</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.globalCityAr}
                </option>
              ))}
            </select>

            {/* Sponsor Filter */}
            <select
              value={filterSponsorId}
              onChange={(e) => setFilterSponsorId(e.target.value)}
              aria-label="تصفية حسب الكفيل"
              className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-xs text-[var(--foreground)]"
            >
              <option value="">جميع الكفلاء</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.registryNameAr}
                </option>
              ))}
            </select>

            {/* Debt Blocked Toggle */}
            <button
              type="button"
              onClick={() => setFilterDebtBlocked(!filterDebtBlocked)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${filterDebtBlocked
                  ? "bg-rose-600 text-white shadow"
                  : "bg-[var(--subtle-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              حظر مديونية فقط
            </button>
          </div>
        </div>

        {/* Active Column & Toolbar Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[var(--border)] text-xs">
            <span className="font-bold text-[var(--muted)]">فلاتر مطبقة:</span>

            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Search className="h-3 w-3" />
                <span>بحث: {search}</span>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="hover:text-red-500 rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {colFilterStatus.map((val) => {
              const opt = statusFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                >
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterStatus((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {colFilterOwners.map((val) => {
              const opt = ownerFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  <UserCheck className="h-3 w-3" />
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterOwners((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {colFilterCitySponsor.map((val) => {
              const opt = citySponsorFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                >
                  <MapPin className="h-3 w-3" />
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterCitySponsor((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {colFilterRiders.map((val) => {
              const opt = riderFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                >
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterRiders((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {colFilterPhone.map((val) => {
              const opt = phoneFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                >
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterPhone((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {colFilterPasswordCooldown.map((val) => {
              const opt = passwordCooldownFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                >
                  <Lock className="h-3 w-3" />
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterPasswordCooldown((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {colFilterSheet.map((val) => {
              const opt = sheetFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterSheet((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {colFilterCaptain.map((val) => {
              const opt = captainFilterOptions.find((o) => o.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                >
                  <span>{opt?.label || val}</span>
                  <button
                    type="button"
                    onClick={() => setColFilterCaptain((prev) => prev.filter((x) => x !== val))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 mr-2 transition-colors cursor-pointer"
            >
              إعادة تعيين جميع الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Accounts Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[var(--foreground)]">قائمة حسابات نينجا</span>
            <Badge tone="gray" className="text-xs font-mono">
              {filteredAccounts.length} حساب
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-[var(--subtle-bg)] text-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                {/* 1. Captain ID */}
                <th className="px-4 py-3 font-bold whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>كابتن ID</span>
                    <TableHeaderColumnFilter
                      label="كابتن ID والكود"
                      value={colFilterCaptain}
                      onChange={setColFilterCaptain}
                      options={captainFilterOptions}
                      placeholder="تصفية بالكود..."
                      align="right"
                    />
                  </div>
                </th>

                {/* 2. Status */}
                <th className="px-4 py-3 font-bold whitespace-nowrap">
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

                {/* 3. Owner & City/Sponsor */}
                <th className="px-4 py-3 font-bold whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>المالك والمدينة/الكفيل</span>
                    <TableHeaderDualFilter
                      label="المالك والمدينة/الكفيل"
                      align="right"
                      tab1={{
                        id: "owner",
                        label: "المالك المسجل",
                        icon: <UserCheck className="h-3 w-3" />,
                        values: colFilterOwners,
                        onChange: setColFilterOwners,
                        options: ownerFilterOptions,
                        placeholder: "تصفية بالمالك المسجل...",
                      }}
                      tab2={{
                        id: "city_sponsor",
                        label: "المدينة والكفيل",
                        icon: <MapPin className="h-3 w-3" />,
                        values: colFilterCitySponsor,
                        onChange: setColFilterCitySponsor,
                        options: citySponsorFilterOptions,
                        placeholder: "تصفية بالمدينة أو الكفيل...",
                      }}
                    />
                  </div>
                </th>

                {/* 4. Actual Rider */}
                <th className="px-4 py-3 font-bold whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>المندوب الفعلي</span>
                    <TableHeaderColumnFilter
                      label="المندوب الفعلي"
                      value={colFilterRiders}
                      onChange={setColFilterRiders}
                      options={riderFilterOptions}
                      placeholder="تصفية بالمندوب أو التعيين..."
                      align="right"
                    />
                  </div>
                </th>

                {/* 5. Phone */}
                <th className="px-4 py-3 font-bold whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>هاتف الدخول</span>
                    <TableHeaderColumnFilter
                      label="هاتف الدخول"
                      value={colFilterPhone}
                      onChange={setColFilterPhone}
                      options={phoneFilterOptions}
                      placeholder="تصفية برقم الهاتف..."
                      align="right"
                    />
                  </div>
                </th>

                {/* 6. Password & Cooldown */}
                <th className="px-4 py-3 font-bold whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>كلمة المرور وفترة الانتظار</span>
                    <TableHeaderColumnFilter
                      label="كلمة المرور والانتظار"
                      value={colFilterPasswordCooldown}
                      onChange={setColFilterPasswordCooldown}
                      options={passwordCooldownFilterOptions}
                      placeholder="تصفية بكلمة المرور والانتظار..."
                      align="right"
                    />
                  </div>
                </th>

                {/* 7. Sheet Checkup */}
                <th className="px-4 py-3 font-bold whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>آخر فحص بالشيت</span>
                    <TableHeaderColumnFilter
                      label="فحص الشيت"
                      value={colFilterSheet}
                      onChange={setColFilterSheet}
                      options={sheetFilterOptions}
                      placeholder="تصفية بفحص الشيت..."
                      align="right"
                    />
                  </div>
                </th>

                {/* 8. Actions */}
                <th className="px-4 py-3 font-bold text-center whitespace-nowrap">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <RefreshCw className="h-7 w-7 animate-spin text-purple-600 mx-auto mb-2" />
                    <p className="text-xs text-[var(--muted)]">جارٍ تحميل جميع حسابات نينجا...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-rose-600">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-bold">{fetchError}</p>
                  </td>
                </tr>
              ) : displayedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                    <Zap className="h-10 w-10 mx-auto mb-2 text-[var(--muted)]/40" />
                    <p className="font-bold text-sm">لا توجد حسابات مطابقة.</p>
                  </td>
                </tr>
              ) : (
                displayedAccounts.map((acc) => {
                  const accId = acc.accountId || acc.id || "";
                  const isAssigned = (acc.status || "").toLowerCase() === "assigned";
                  const isAvailable = (acc.status || "").toLowerCase() === "available";
                  const isSuspended = (acc.status || "").toLowerCase() === "suspended";
                  const isRetired = (acc.status || "").toLowerCase() === "retired";
                  const isArchived = (acc.status || "").toLowerCase() === "archived";
                  const cooldownActive = isCooldownActive(acc.passwordChangeAllowedAtUtc);

                  const ownerName = acc.owner?.nameAr || acc.owner?.nameEn || acc.ownerRiderNameAr || acc.ownerRiderNameEn || "—";
                  const riderName = acc.actualRider?.nameAr || acc.actualRider?.nameEn || acc.actualRiderNameAr || acc.actualRiderNameEn;

                  return (
                    <tr key={accId} className="hover:bg-[var(--subtle-bg)]/40 transition-colors">
                      {/* Captain ID */}
                      <td className="px-4 py-3 font-mono font-bold text-sm text-[var(--foreground)]">
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <span>{acc.captainId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.captainId, accId)}
                            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)]"
                            title="نسخ رقم الكابتن"
                          >
                            {copiedId === accId ? (
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
                        {(() => {
                          const statusInfo = getStatusDisplay(acc);
                          return (
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold w-fit border ${statusInfo.badgeClass}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                                {statusInfo.label}
                              </span>

                              {statusInfo.detailText && (
                                <span
                                  className={`line-clamp-1 flex items-center gap-1 ${statusInfo.detailClass}`}
                                  title={statusInfo.detailText}
                                >
                                  {statusInfo.isSuspended && <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />}
                                  <span>{statusInfo.detailText}</span>
                                </span>
                              )}

                              {acc.isOperationallyBlocked && (
                                <span
                                  className="inline-flex items-center gap-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 px-1.5 py-0.5 text-[10px] font-bold w-fit mt-0.5"
                                  title={acc.operationalBlockReason || "محظور تشغيلياً بسبب مديونية"}
                                >
                                  <ShieldAlert className="h-2.5 w-2.5 shrink-0" />
                                  حظر مديونية
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Registered Owner & City/Sponsor */}
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="font-bold text-[var(--foreground)]">
                          {ownerName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--muted)]" dir="ltr">
                          {acc.owner?.iqamaNo && <span>ID: {acc.owner.iqamaNo}</span>}
                          {acc.ownerEmployeeId && !acc.owner?.iqamaNo && <span>Emp: {acc.ownerEmployeeId.substring(0, 8)}...</span>}
                        </div>
                        {(acc.operatingCityNameAr || cityMap.get(acc.operatingCityId) || acc.sponsorNameAr || (acc.sponsorId && sponsorMap.get(acc.sponsorId))) && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px] text-[var(--muted)]">
                            {(acc.operatingCityNameAr || cityMap.get(acc.operatingCityId)) && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--subtle-bg)] px-1.5 py-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {acc.operatingCityNameAr || cityMap.get(acc.operatingCityId)}
                              </span>
                            )}
                            {(acc.sponsorNameAr || (acc.sponsorId && sponsorMap.get(acc.sponsorId))) && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--subtle-bg)] px-1.5 py-0.5">
                                <Building2 className="h-2.5 w-2.5" />
                                {acc.sponsorNameAr || sponsorMap.get(acc.sponsorId!)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actual Assigned Rider */}
                      <td className="px-4 py-3 space-y-0.5">
                        {acc.actualRiderProfileId || riderName ? (
                          <div>
                            <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 shrink-0" />
                              <span>{riderName || "مندوب معين"}</span>
                            </div>
                            {acc.actualRider?.iqamaNo && (
                              <span className="text-[11px] font-mono text-[var(--muted)]" dir="ltr">
                                ID: {acc.actualRider.iqamaNo}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block rounded-md bg-gray-100 dark:bg-gray-800/60 px-2 py-0.5 text-[11px] text-[var(--muted)]">
                            غير معين
                          </span>
                        )}

                        {acc.isOperationallyBlocked && (
                          <div
                            className="inline-flex items-center gap-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 text-[10px] font-bold mt-1"
                            title={acc.operationalBlockReason || "محظور بسبب مديونية تشغيلية سابقة"}
                          >
                            <ShieldAlert className="h-3 w-3 shrink-0" />
                            حظر مديونية
                          </div>
                        )}
                      </td>

                      {/* Login Phone */}
                      <td className="px-4 py-3 font-mono" dir="ltr">
                        {acc.phoneNumber ? (
                          <span className="font-semibold text-[var(--foreground)]">
                            {acc.phoneNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--muted)]">لم يسجل بعد</span>
                        )}
                      </td>

                      {/* Password & Cooldown */}
                      <td className="px-4 py-3 space-y-1">
                        <div className="flex items-center gap-1.5">
                          {acc.hasPassword ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                              <Lock className="h-3 w-3" />
                              مسجلة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                              غير مسجلة
                            </span>
                          )}
                        </div>

                        {cooldownActive ? (
                          <div
                            className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-300 font-bold"
                            title={formatRiyadhDateTime(acc.passwordChangeAllowedAtUtc, "ar")}
                          >
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatRemainingCooldown(acc.passwordChangeAllowedAtUtc, "ar")}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            متاحة للتغيير
                          </span>
                        )}
                      </td>

                      {/* Latest Sheet Checkup Observation */}
                      <td className="px-4 py-3 space-y-1">
                        {acc.latestSheetStatus ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${acc.latestSheetStatus === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : acc.latestSheetStatus === "NAQL_BLOCKED"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                  }`}
                              >
                                {acc.latestSheetStatus}
                              </span>

                              {acc.latestSheetSuspended !== null && (
                                <span
                                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${acc.latestSheetSuspended
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                      : "bg-emerald-50 text-emerald-700"
                                    }`}
                                >
                                  {acc.latestSheetSuspended ? "موقوف" : "نشط"}
                                </span>
                              )}
                            </div>

                            {acc.sheetUpdatedAtUtc && (
                              <div className="text-[10px] text-[var(--muted)] mt-0.5">
                                {formatRiyadhDateTime(acc.sheetUpdatedAtUtc, "ar")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--muted)]">لا يوجد فحص</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Status Control */}
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!canUpdate}
                            onClick={() => openStatusModal(acc)}
                            className="gap-1 text-[11px]"
                            title="التحكم بحالة الحساب (Active, Suspended, Retired, Archived)"
                          >
                            <SlidersHorizontal className="h-3 w-3 text-purple-600" />
                            الحالة
                          </Button>

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

                          {/* Update Credentials */}
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

        {/* Pagination & Summary Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 bg-[var(--subtle-bg)]/40 text-xs">
          <div className="text-[var(--muted)]">
            عرض <span className="font-bold font-mono text-[var(--foreground)]">{displayedAccounts.length}</span> من أصل{" "}
            <span className="font-bold font-mono text-[var(--foreground)]">{filteredAccounts.length}</span> حساب
            {filteredAccounts.length !== accounts.length && (
              <span className="text-[11px] text-[var(--muted)] font-normal"> (تمت تصفيته من إجمالي {accounts.length} حساب)</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--muted)]">سجلات الصفحة:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))}
                aria-label="تحديد عدد سجلات الصفحة"
                className="rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1 text-xs text-[var(--foreground)]"
              >
                <option value="all">الكل (عرض جميع السجلات)</option>
                <option value={50}>50 سجل</option>
                <option value={100}>100 سجل</option>
                <option value={200}>200 سجل</option>
              </select>
            </div>

            {/* Pagination Controls when not displaying all */}
            {pageSize !== "all" && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="text-xs"
                >
                  الصفحة السابقة
                </Button>
                <span className="font-mono text-xs text-[var(--foreground)]">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs"
                >
                  الصفحة التالية
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. Modal: Status Control                                      */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(statusAccount)}
        onClose={() => setStatusAccount(null)}
        title="تعديل حالة حساب نينجا"
        maxWidth="max-w-md"
      >
        {statusAccount && (
          <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs" dir="rtl">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 space-y-1">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[var(--muted)]">كابتن ID:</span>
                <span className="font-black text-sm text-[var(--foreground)]">{statusAccount.captainId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">الحالة الحالية:</span>
                {(() => {
                  const s = (statusAccount.status || "").toLowerCase();
                  if (s === "assigned") {
                    return (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                        {isEn ? "Assigned" : "معين لمندوب"}
                      </span>
                    );
                  }
                  if (s === "available") {
                    return <Badge tone="green">{isEn ? "Available" : "متاح للتعيين"}</Badge>;
                  }
                  if (s === "suspended") {
                    return <Badge tone="orange">{isEn ? "Suspended" : "موقوف"}</Badge>;
                  }
                  if (s === "retired") {
                    return <Badge tone="red">{isEn ? "Retired" : "مستبعد"}</Badge>;
                  }
                  return <Badge tone="gray">{isEn ? "Archived" : "مؤرشف"}</Badge>;
                })()}
              </div>
            </div>

            {statusAccount.isOperationallyBlocked && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  حظر مديونية تشغيلية سابقة
                </div>
                <p className="text-[11px]">
                  {statusAccount.operationalBlockReason || "المندوب محظور تشغيلياً؛ لن يتم قبول التنشيط حتى تسوية المديونية."}
                </p>
              </div>
            )}

            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1.5">الحالة الجديدة *</label>
              <select
                value={statusSelected}
                onChange={(e) => setStatusSelected(e.target.value as any)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-2.5 text-xs text-[var(--foreground)]"
              >
                <option value="Active">نشط (Active - يعود كـ معين أو متاح حسب وجود تعيين مفتوح)</option>
                <option value="Suspended">موقوف يدوي (Suspended - يحتفظ بالتعيين ويمنع تعيينات جديدة)</option>
                <option value="Retired">مستبعد (Retired - يحتفظ بالتعيين والسجل)</option>
                <option value="Archived">مؤرشف (Archived - أرشفة الحساب مع بقاء السجل)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1.5">سبب تعديل الحالة (اختياري)</label>
              <textarea
                rows={3}
                maxLength={500}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="اكتب سبب تغيير الحالة إن وجد (حتى 500 حرف)..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-2.5 text-xs text-[var(--foreground)]"
              />
              <div className="text-[10px] text-[var(--muted)] text-left" dir="ltr">
                {statusReason.length} / 500
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button type="button" variant="secondary" onClick={() => setStatusAccount(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" disabled={statusSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {statusSubmitting ? "جارٍ الحفظ..." : "حفظ الحالة"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 2. Modal: Compare Accounts Workbook                           */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        title="مقارنة شيت الكباتن مع حسابات النظام (Comparison Only)"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {!compareResult ? (
            <form onSubmit={handleCompareSubmit} className="space-y-4">
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-[var(--foreground)] space-y-1">
                <div className="font-bold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <ArrowRightLeft className="h-4 w-4" />
                  مقارنة فورية دون تعديل البيانات
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  ارفع شيت كباتن نينجا (.xlsx) للمقارنة المباشرة مع الحسابات المسجلة. تكشف المقارنة الحسابات المفقودة من أي طرف واختلافات الهوية والاسم والمدينة.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[var(--foreground)] mb-1.5">
                  ملف الكباتن (.xlsx) *
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  required
                  disabled={compareSubmitting}
                  onChange={(e) => setCompareFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-[var(--foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  الأعمدة المطلوبة في الصف الأول: المعرف، الاسم، المدينة، رقم الهوية.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button type="button" variant="secondary" onClick={() => setIsCompareOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={compareSubmitting || !compareFile}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
                >
                  {compareSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                  بدء المقارنة
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6 text-center">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2.5">
                  <div className="text-[10px] text-[var(--muted)]">حسابات الشيت</div>
                  <div className="text-base font-black">{compareResult.summary?.sheetAccounts || 0}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2.5">
                  <div className="text-[10px] text-[var(--muted)]">حسابات النظام</div>
                  <div className="text-base font-black">{compareResult.summary?.systemAccounts || 0}</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-emerald-700 dark:text-emerald-300">
                  <div className="text-[10px]">متطابقة</div>
                  <div className="text-base font-black">{compareResult.summary?.matchingAccounts || 0}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-amber-700 dark:text-amber-300">
                  <div className="text-[10px]">بيانات مختلفة</div>
                  <div className="text-base font-black">{compareResult.summary?.differentAccounts || 0}</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-rose-700 dark:text-rose-300">
                  <div className="text-[10px]">مفقودة بالنظام</div>
                  <div className="text-base font-black">{compareResult.summary?.sheetOnlyAccounts || 0}</div>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/40 p-2.5 text-purple-700 dark:text-purple-300">
                  <div className="text-[10px]">مفقودة بالشيت</div>
                  <div className="text-base font-black">{compareResult.summary?.systemOnlyAccounts || 0}</div>
                </div>
              </div>

              {/* Issues alert if not completed */}
              {!compareResult.comparisonCompleted && compareResult.issues?.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    تنبيهات فحص الملف:
                  </div>
                  {compareResult.issues.map((iss, i) => (
                    <div key={i}>• [صف {iss.rowNumber}]: {iss.message}</div>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] pb-2">
                {[
                  { id: "sheetOnly", label: `مفقودة بالنظام (${compareResult.sheetOnlyAccounts?.length || 0})` },
                  { id: "differences", label: `بيانات مختلفة (${compareResult.differentAccounts?.length || 0})` },
                  { id: "systemOnly", label: `مفقودة بالشيت (${compareResult.systemOnlyAccounts?.length || 0})` },
                  { id: "matching", label: `متطابقة (${compareResult.matchingAccounts?.length || 0})` },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setCompareTab(tb.id as any)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${compareTab === tb.id
                        ? "bg-indigo-600 text-white shadow"
                        : "bg-[var(--subtle-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="max-h-80 overflow-y-auto space-y-2">
                {compareTab === "sheetOnly" && (
                  <div className="space-y-2">
                    {compareResult.sheetOnlyAccounts?.length === 0 ? (
                      <p className="text-center text-[var(--muted)] py-6">لا توجد حسابات مفقودة بالنظام.</p>
                    ) : (
                      compareResult.sheetOnlyAccounts.map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-[var(--border)] p-3 bg-[var(--subtle-bg)]/40 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-[var(--foreground)]" dir="ltr">
                              {item.sheet.captainId}
                            </span>
                            <span className="text-[11px] text-[var(--muted)]">صف {item.sheet.rowNumber}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span>الاسم: <strong>{item.sheet.ownerName}</strong></span>
                            <span>المدينة: <strong>{item.sheet.city}</strong></span>
                            <span>الهوية: <strong className="font-mono">{item.sheet.ownerNationalId}</strong></span>
                          </div>

                          {/* Possible System Hints */}
                          {item.possibleSystemAccounts && item.possibleSystemAccounts.length > 0 && (
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2 text-[11px] text-amber-800 dark:text-amber-200 space-y-1 mt-1">
                              <div className="font-bold flex items-center gap-1">
                                <HelpCircle className="h-3.5 w-3.5" />
                                اقتراح للمراجعة (حساب بنفس هوية المالك برقم كابتن آخر):
                              </div>
                              {item.possibleSystemAccounts.map((hint, hIdx) => (
                                <div key={hIdx} className="font-mono text-[10px]">
                                  • كابتن بالنظام: <strong>{hint.captainId}</strong> ({hint.accountCode}) - {hint.status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {compareTab === "differences" && (
                  <div className="space-y-2">
                    {compareResult.differentAccounts?.length === 0 ? (
                      <p className="text-center text-[var(--muted)] py-6">لا توجد حسابات باختلافات في البيانات.</p>
                    ) : (
                      compareResult.differentAccounts.map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-amber-200 dark:border-amber-900/40 p-3 bg-amber-50/20 space-y-2">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-black text-sm text-[var(--foreground)]" dir="ltr">
                              كابتن: {item.sheet.captainId}
                            </span>
                            <span className="text-[11px] text-[var(--muted)]">صف {item.sheet.rowNumber}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded bg-white dark:bg-black/30 border border-[var(--border)]">
                              <div className="font-bold text-[var(--muted)] mb-1">بيانات الشيت:</div>
                              <div>الاسم: {item.sheet.ownerName}</div>
                              <div>المدينة: {item.sheet.city}</div>
                              <div>الهوية: {item.sheet.ownerNationalId}</div>
                            </div>
                            <div className="p-2 rounded bg-white dark:bg-black/30 border border-[var(--border)]">
                              <div className="font-bold text-[var(--muted)] mb-1">بيانات النظام:</div>
                              <div>الاسم: {item.system.ownerNameAr || item.system.ownerNameEn}</div>
                              <div>المدينة: {item.system.cityNameAr || item.system.cityCode}</div>
                              <div>الهوية: {item.system.ownerNationalId}</div>
                            </div>
                          </div>

                          {item.differences && item.differences.length > 0 && (
                            <div className="flex flex-wrap gap-1 text-[11px]">
                              {item.differences.map((d, dIdx) => (
                                <span key={dIdx} className="rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 px-1.5 py-0.5">
                                  اختلاف {d.field === "ownerNationalId" ? "الهوية" : d.field === "ownerName" ? "الاسم" : "المدينة"}: الشيت ({d.sheetValue}) مقابل النظام ({d.systemValue})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {compareTab === "systemOnly" && (
                  <div className="space-y-2">
                    {compareResult.systemOnlyAccounts?.length === 0 ? (
                      <p className="text-center text-[var(--muted)] py-6">لا توجد حسابات مفقودة بالشيت.</p>
                    ) : (
                      compareResult.systemOnlyAccounts.map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-[var(--border)] p-3 bg-[var(--subtle-bg)]/40 space-y-1">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-sm text-[var(--foreground)]" dir="ltr">{item.captainId}</span>
                            <span className="text-xs font-semibold">
                              {item.status === "Available" ? "متاح" : item.status === "Assigned" ? "معين" : item.status === "Suspended" ? "موقوف" : item.status === "Retired" ? "مستبعد" : item.status === "Archived" ? "مؤرشف" : item.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                            <span>كود: {item.accountCode}</span>
                            <span>المالك: {item.ownerNameAr || item.ownerNameEn || "—"}</span>
                            <span>المدينة: {item.cityNameAr || item.cityCode || "—"}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {compareTab === "matching" && (
                  <div className="space-y-2">
                    {compareResult.matchingAccounts?.length === 0 ? (
                      <p className="text-center text-[var(--muted)] py-6">لا توجد حسابات متطابقة تماماً.</p>
                    ) : (
                      compareResult.matchingAccounts.map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 p-2.5 bg-emerald-50/20 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="font-mono font-bold" dir="ltr">{item.sheet.captainId}</span>
                            <span>{item.sheet.ownerName}</span>
                            <span className="text-[var(--muted)]">({item.sheet.city})</span>
                          </div>
                          <span className="font-mono text-[var(--muted)]">{item.sheet.ownerNationalId}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setCompareResult(null);
                    setCompareFile(null);
                  }}
                >
                  مقارنة ملف آخر
                </Button>
                <Button type="button" variant="primary" onClick={() => setIsCompareOpen(false)} className="bg-indigo-600 text-white font-bold">
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 3. Modal: Assign Account                                      */}
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
                    {assigningAccount.owner?.nameAr || assigningAccount.ownerRiderNameAr || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Rider Select */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--foreground)]">
                  المندوب الفعلي (Actual Rider) <span className="text-red-500">*</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] select-none text-[var(--muted)] hover:text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={showAllRidersInAssign}
                    onChange={(e) => setShowAllRidersInAssign(e.target.checked)}
                    className="rounded border-[var(--border)] text-purple-600 focus:ring-purple-500"
                  />
                  <span>عرض جميع المناديب</span>
                </label>
              </div>

              <SearchableSelect
                options={assignRiderOptions}
                value={assignRiderId}
                onChange={setAssignRiderId}
                placeholder="ابحث واختر المندوب الفعلي غير المعين..."
              />

              <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>
                  المتاحون للتعيين (بدون تعيين نشط):{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {assignableRiders.length}
                  </strong>{" "}
                  من أصل {riders.length} مندوب
                </span>
                {!showAllRidersInAssign && riders.length > assignableRiders.length && (
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    (تم استبعاد {riders.length - assignableRiders.length} مندوب لديهم تعيينات نشطة)
                  </span>
                )}
              </div>
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
      {/* 4. Modal: Return Account                                      */}
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
                    {releasingAccount.actualRider?.nameAr || releasingAccount.actualRiderNameAr || "—"}
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
      {/* 5. Modal: Update Phone & Password                             */}
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
      {/* 6. Modal: Create Ninja Account in ERP                         */}
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
