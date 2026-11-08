// src/app/admin/hunger/accounts/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getAllHungerAccounts,
  exportHungerAccounts,
  downloadHungerAccountsTemplate,
  getHungerPlatform,
  updateHungerAccountDisposition,
  createHungerWalletReview,
  confirmHungerWalletReview,
  checkAccountWalletPeriodStatus,
  parseRiderAccountLimitError,
  getPlatformAccountBusinessContext,
  updatePlatformAccountBusiness,
  revealPlatformAccountCredentials,
  updateSimCardOwnership,
  getRiyadhTodayIso,
  getRiyadhCurrentMonthStartIso,
  getDispositionMeta,
  getCompensationModelLabel,
  getActualVehicleCustodyStatusMeta,
  getActualVehicleOwnershipMeta,
  getHungerErrorMessage,
  isWalletReviewExpiredOrSuperseded,
  HUNGER_DISPOSITIONS,
  HUNGER_COMPENSATION_MODELS,
  HUNGER_SIM_OWNERSHIPS,
  type HungerAccountItem,
  type HungerAccountsFilterParams,
  type HungerOperationalDisposition,
  type HungerCompensationModel,
  type HungerSimOwnership,
  type HungerWalletReviewResponse,
  type PlatformAccountBusinessContextResponse,
  type PlatformAccountCredentialRevealResponse,
} from "@/lib/hunger/api";
import { WalletReviewResultCard } from "../components/WalletReviewResultCard";
import { RiderSwapModal } from "../components/RiderSwapModal";
import { AccountsFilterPanel } from "../components/AccountsFilterPanel";
import { AccountVehicleSimDetailSection } from "../components/AccountVehicleSimDetailSection";
import { SeedImportConflictModal } from "../components/SeedImportConflictModal";
import { DeferredRemindersPanel } from "../components/DeferredRemindersPanel";
import {
  listOperatingCities,
  listEmployees,
  listRiders,
  type OperatingCity,
} from "@/lib/workforce/api";
import type { Employee, Rider } from "@/lib/workforce/types";
import { getAllVehicles } from "@/lib/fleet/api";
import type { VehicleSummaryResponse } from "@/lib/fleet/types";
import { getPhoneSims, type PhoneSim } from "@/lib/fleet/phone-sims-api";
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
  AssignmentContextSection,
  type AssignmentContextSectionRef,
} from "@/components/shared/AssignmentContextSection";
import { SharedAccountDayUsageModal } from "@/components/shared/SharedAccountDayUsageModal";
import type { PlatformAccountDayUsageInput } from "@/lib/platforms/day-usage-types";
import { getRiderPlatformHistory } from "@/lib/platforms/api";
import type { PlatformAssignmentLimit } from "@/lib/platforms/capacity";
import {
  Flame,
  Search,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  SlidersHorizontal,
  Building2,
  MapPin,
  Smartphone,
  Car,
  KeyRound,
  Eye,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  ShieldAlert,
  CalendarClock,
  Wallet,
  Users,
  Server,
} from "lucide-react";

const INITIAL_API_FILTERS: HungerAccountsFilterParams = {
  from: getRiyadhCurrentMonthStartIso(),
  through: getRiyadhTodayIso(),
};

const MAX_WALLET_FILE_SIZE = 5 * 1024 * 1024; // 5 MiB (5,242,880 bytes)
const ALLOWED_WALLET_FILE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
]);
const ALLOWED_WALLET_FILE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".dib",
]);

function validateWalletEvidenceFile(file: File): string | null {
  if (file.size === 0) {
    return "الملف المختار فارغ (0 بايت). يرجى اختيار ملف صورة صالح.";
  }
  if (file.size > MAX_WALLET_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return `حجم الملف (${sizeMb} ميجابايت) يتجاوز الحد الأقصى المسموح به (5 ميجابايت).`;
  }

  const name = file.name.toLowerCase();
  const extMatch = name.match(/\.[a-z0-9]+$/);
  const ext = extMatch ? extMatch[0] : "";

  if (ext === ".svg" || file.type === "image/svg+xml") {
    return "ملفات SVG غير مدعومة لأسباب أمنية. يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP أو GIF أو BMP.";
  }
  if (ext === ".pdf" || file.type === "application/pdf") {
    return "ملفات PDF غير مدعومة. يرجى اختيار صورة شاشة أو صورة إثبات.";
  }

  const isAllowedExt = ALLOWED_WALLET_FILE_EXTS.has(ext);
  const isAllowedMime = ALLOWED_WALLET_FILE_TYPES.has(file.type.toLowerCase());

  if (!isAllowedExt && !isAllowedMime) {
    return "نوع الملف غير مدعوم. الصيغ المدعومة هي: JPEG (.jpg, .jpeg), PNG, WebP, GIF, BMP (.bmp, .dib).";
  }

  return null;
}

export default function HungerAccountsPage() {
  const { can, canAny, authorization, user, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const deniedPermSet = useMemo(
    () =>
      new Set(
        authorization?.deniedPermissionKeys ??
          authorization?.directDenies ??
          [],
      ),
    [authorization],
  );

  const canFinanceAction = useCallback(
    (perm: string) => {
      if (deniedPermSet.has(perm)) return false;
      return can(perm) || can("hunger.finance.manage");
    },
    [can, deniedPermSet],
  );

  // Permissions
  const canRead = canAny(
    "hunger.read",
    "hunger.accounts.import",
    "hunger.accounts.update",
    "hunger.finance.manage",
    "hunger.finance.wallet.review",
  );
  const canImportSeed = can("hunger.accounts.import");
  const canUpdateAccount = can("hunger.accounts.update");
  const canWalletReview = canFinanceAction("hunger.finance.wallet.review");
  const canExportAccounts =
    can("hunger.performance.export") && can("hunger.read");

  // Granular shared field permissions
  const canFieldOwner = can("platform_accounts.fields.owner");
  const canFieldCity = can("platform_accounts.fields.city");
  const canFieldRegistry = can("platform_accounts.fields.registry");
  const canFieldContact = can("platform_accounts.fields.contact");
  const canFieldVehicle = can("platform_accounts.fields.registered_vehicle");
  const canFieldSettlement = can("platform_accounts.fields.settlement");
  const canFieldCompensation = can("platform_assignments.fields.compensation");
  const canRevealCredentials = can("platform_accounts.credentials.reveal");
  const canVehicleIdentity = can("fleet.vehicles.fields.identity");

  // Core Data & Server Query Filters
  const [platformId, setPlatformId] = useState("");
  const [accounts, setAccounts] = useState<HungerAccountItem[]>([]);
  const [apiFilters, setApiFilters] =
    useState<HungerAccountsFilterParams>(INITIAL_API_FILTERS);
  const [loading, setLoading] = useState(true);
  const [exportingFormat, setExportingFormat] = useState<
    "xlsx" | "csv" | null
  >(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDisposition, setFilterDisposition] = useState<string>("all");
  const [filterAssignment, setFilterAssignment] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Table Header Column Filters
  const [colFilterAccount, setColFilterAccount] = useState<string[]>([]);
  const [colFilterOwner, setColFilterOwner] = useState<string[]>([]);
  const [colFilterRider, setColFilterRider] = useState<string[]>([]);
  const [colFilterDisposition, setColFilterDisposition] = useState<string[]>(
    [],
  );
  const [colFilterCitySponsor, setColFilterCitySponsor] = useState<string[]>(
    [],
  );
  const [colFilterVehicleSim, setColFilterVehicleSim] = useState<string[]>([]);

  // Lookups (human-readable names — never raw IDs)
  const [cities, setCities] = useState<OperatingCity[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [vehicles, setVehicles] = useState<VehicleSummaryResponse[]>([]);
  const [phoneSims, setPhoneSims] = useState<PhoneSim[]>([]);

  // 1. Seed Import Modal State
  const [seedModalOpen, setSeedModalOpen] = useState(false);

  // 2. Disposition Update Modal State
  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<HungerAccountItem | null>(null);
  const [dispValue, setDispValue] =
    useState<HungerOperationalDisposition>("Normal");
  const [dispReason, setDispReason] = useState("");
  const [dispDeferredUntil, setDispDeferredUntil] = useState("");
  const [dispBusy, setDispBusy] = useState(false);

  // 3. Wallet Review & Deliver / Return Modal State
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletAction, setWalletAction] = useState<"Deliver" | "Return">(
    "Deliver",
  );
  const [walletSupervisorId, setWalletSupervisorId] = useState("");
  const [walletMobileBalance, setWalletMobileBalance] = useState("0.00");
  const [walletClosingBalance, setWalletClosingBalance] = useState("");
  const [walletProvenAdjustments, setWalletProvenAdjustments] =
    useState("0.00");
  const [walletEvidenceFile, setWalletEvidenceFile] = useState<File | null>(null);
  const [walletEvidencePreview, setWalletEvidencePreview] = useState<string | null>(null);
  const [walletEvidenceError, setWalletEvidenceError] = useState<string | null>(null);
  const walletFileInputRef = useRef<HTMLInputElement | null>(null);
  const [closingEvidence, setClosingEvidence] = useState("");
  const [adjustmentEvidence, setAdjustmentEvidence] = useState("");
  const [walletBusinessDate, setWalletBusinessDate] =
    useState(getRiyadhTodayIso());

  useEffect(() => {
    return () => {
      if (walletEvidencePreview) {
        URL.revokeObjectURL(walletEvidencePreview);
      }
    };
  }, [walletEvidencePreview]);

  const handleWalletFileSelect = (file: File | null) => {
    if (!file) {
      handleWalletFileRemove();
      return;
    }
    const error = validateWalletEvidenceFile(file);
    if (error) {
      setWalletEvidenceError(error);
      toast.error(error);
      if (walletFileInputRef.current) walletFileInputRef.current.value = "";
      return;
    }
    setWalletEvidenceError(null);
    if (walletEvidencePreview) {
      URL.revokeObjectURL(walletEvidencePreview);
    }
    setWalletEvidenceFile(file);
    setWalletEvidencePreview(URL.createObjectURL(file));
    setWalletReviewResult(null);
  };

  const handleWalletFileRemove = () => {
    if (walletEvidencePreview) {
      URL.revokeObjectURL(walletEvidencePreview);
    }
    setWalletEvidenceFile(null);
    setWalletEvidencePreview(null);
    setWalletEvidenceError(null);
    if (walletFileInputRef.current) {
      walletFileInputRef.current.value = "";
    }
    setWalletReviewResult(null);
  };

  // Deliver fields
  const [assignRiderProfileId, setAssignRiderProfileId] = useState("");
  const [assignEffectiveFrom, setAssignEffectiveFrom] =
    useState(getRiyadhTodayIso());
  const [assignCompensationModel, setAssignCompensationModel] =
    useState<HungerCompensationModel>("Commission");
  const [assignPaymentModel, setAssignPaymentModel] = useState("Commission");
  const [assignReason, setAssignReason] = useState("");
  const [assignBackdatedReason, setAssignBackdatedReason] = useState("");
  const assignmentContextRef = useRef<AssignmentContextSectionRef | null>(null);

  // Return fields
  const [returnEffectiveTo, setReturnEffectiveTo] =
    useState(getRiyadhTodayIso());
  const [returnReason, setReturnReason] = useState("");
  const [returnDayUsage, setReturnDayUsage] =
    useState<PlatformAccountDayUsageInput | null>(null);

  const [walletReviewResult, setWalletReviewResult] =
    useState<HungerWalletReviewResponse | null>(null);
  const [walletStaleError, setWalletStaleError] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);

  // Wallet Period History State (for distinguishing new accounts without history vs prior activity)
  const [walletHistoryCheck, setWalletHistoryCheck] = useState<{
    loading: boolean;
    hasNoHistory: boolean;
    missingContract: boolean;
    reason: string;
  }>({
    loading: false,
    hasNoHistory: false,
    missingContract: false,
    reason: "",
  });

  // Rider Limit & Eligibility Errors (attached to the rider field on 409 or pre-check)
  const [riderLimitError, setRiderLimitError] = useState<string | null>(null);
  const [riderLimitDetails, setRiderLimitDetails] =
    useState<PlatformAssignmentLimit | null>(null);
  const [riderPreCheckWarning, setRiderPreCheckWarning] = useState<
    string | null
  >(null);
  const [riderPreCheckLoading, setRiderPreCheckLoading] = useState(false);

  // 3b. Rider Swap Modal State
  const [swapModalAccount, setSwapModalAccount] =
    useState<HungerAccountItem | null>(null);

  // 4. Shared Business Context & Credentials Modal State
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [businessContext, setBusinessContext] =
    useState<PlatformAccountBusinessContextResponse | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [bizOwnerEmployeeId, setBizOwnerEmployeeId] = useState("");
  const [bizCityId, setBizCityId] = useState("");
  const [bizRegistryName, setBizRegistryName] = useState("");
  const [bizRegistryNumber, setBizRegistryNumber] = useState("");
  const [bizSettlementSystem, setBizSettlementSystem] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizSimId, setBizSimId] = useState("");
  const [bizVehicleId, setBizVehicleId] = useState("");
  const [bizEffectiveFrom, setBizEffectiveFrom] = useState(getRiyadhTodayIso());
  const [bizReason, setBizReason] = useState("");
  const [bizBusy, setBizBusy] = useState(false);

  // SIM ownership sub-form
  const [simOwnershipValue, setSimOwnershipValue] =
    useState<HungerSimOwnership>("Company");
  const [simEvidenceRef, setSimEvidenceRef] = useState("");
  const [simEffectiveFrom, setSimEffectiveFrom] = useState(getRiyadhTodayIso());
  const [simBusy, setSimBusy] = useState(false);

  // Credential reveal sub-form
  const [revealReason, setRevealReason] = useState("");
  const [revealedSecret, setRevealedSecret] =
    useState<PlatformAccountCredentialRevealResponse | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);

  // 5. Shared Day Usage Modal State
  const [dayUsageModalAccount, setDayUsageModalAccount] =
    useState<HungerAccountItem | null>(null);

  const loadAccounts = useCallback(async () => {
    await Promise.resolve();
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const baseApiFilters: HungerAccountsFilterParams = { ...apiFilters };
      delete baseApiFilters.page;
      delete baseApiFilters.pageSize;
      delete baseApiFilters.disposition;

      const all = await getAllHungerAccounts(baseApiFilters, {
        suppressErrorToast: true,
      });
      setAccounts(all);
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر تحميل حسابات منصة هنقرستيشن"),
      );
    } finally {
      setLoading(false);
    }
  }, [canRead, apiFilters]);

  const loadLookups = useCallback(async () => {
    const [platRes, citiesRes, empRes, ridersRes, vehiclesRes, simsRes] =
      await Promise.allSettled([
        getHungerPlatform(),
        listOperatingCities(),
        listEmployees(),
        listRiders(),
        getAllVehicles(),
        getPhoneSims({ page: 1, pageSize: 500 }),
      ]);

    if (platRes.status === "fulfilled" && platRes.value?.id) {
      setPlatformId(platRes.value.id);
    }
    if (citiesRes.status === "fulfilled" && Array.isArray(citiesRes.value)) {
      setCities(citiesRes.value);
    }
    if (empRes.status === "fulfilled" && Array.isArray(empRes.value)) {
      const empList = empRes.value;
      setEmployees(empList);
      const matched = empList.find(
        (e) =>
          (user?.userName && e.iqamaNo && e.iqamaNo === user.userName) ||
          (user?.displayNameAr && e.fullNameAr === user.displayNameAr) ||
          (user?.displayNameEn && e.fullNameEn === user.displayNameEn),
      );
      if (matched) {
        setWalletSupervisorId((prev) => prev || matched.id);
      }
    }
    if (ridersRes.status === "fulfilled" && Array.isArray(ridersRes.value)) {
      setRiders(ridersRes.value);
    }
    if (
      vehiclesRes.status === "fulfilled" &&
      Array.isArray(vehiclesRes.value)
    ) {
      setVehicles(vehiclesRes.value);
    }
    if (
      simsRes.status === "fulfilled" &&
      Array.isArray(simsRes.value?.items)
    ) {
      setPhoneSims(simsRes.value.items);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAccounts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAccounts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLookups();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadLookups]);

  // Select options (Human-readable names + Iqama/Plate/Phone — NO raw IDs shown)
  const supervisorOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${e.fullNameAr}${e.iqamaNo ? ` — هوية: ${e.iqamaNo}` : ""}`,
        sublabel: e.jobTitleAr || e.operationalWorkTypeAr || undefined,
      })),
    [employees],
  );

  const riderOptions = useMemo(
    () =>
      riders.map((r) => ({
        value: r.id,
        label: `${r.fullNameAr}${r.iqamaNo ? ` — هوية: ${r.iqamaNo}` : ""}`,
        sublabel: r.preferredCityAr || r.phoneNumber || undefined,
      })),
    [riders],
  );

  const cityOptions = useMemo(
    () =>
      cities.map((c) => ({
        value: c.id,
        label: isEn ? c.globalCityEn || c.globalCityAr : c.globalCityAr,
      })),
    [cities, isEn],
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: `${v.plateNumberAr || v.plateNumberEn || "بدون لوحة"}${v.manufacturer ? ` — ${v.manufacturer} ${v.model || ""}` : ""}`,
        sublabel: v.serialNumber
          ? `الرقم التسلسلي: ${v.serialNumber}`
          : undefined,
      })),
    [vehicles],
  );

  const simOptions = useMemo(
    () =>
      phoneSims.map((s) => ({
        value: s.id,
        label: `${s.phoneNumber}${s.carrierName ? ` (${s.carrierName})` : ""}`,
        sublabel: s.responsibleEmployeeNameAr
          ? `المسؤول: ${s.responsibleEmployeeNameAr}`
          : undefined,
      })),
    [phoneSims],
  );

  // Table Header Column Filter Options
  const accountColumnFilterOptions = useMemo<FilterOption[]>(() => {
    let usedCount = 0;
    let unknownCount = 0;
    let hasPassCount = 0;
    let noPassCount = 0;
    const segments = new Map<string, number>();

    for (const a of accounts) {
      if (a.monthlyUsageStatus === "Used") usedCount++;
      else unknownCount++;
      if (a.hasPassword === true) hasPassCount++;
      else if (a.hasPassword === false) noPassCount++;
      if (a.latestQualitySegment) {
        const seg = `SEG_${a.latestQualitySegment}`;
        segments.set(seg, (segments.get(seg) || 0) + 1);
      }
    }

    const opts: FilterOption[] = [
      {
        value: "MONTHLY_USED",
        label: "مستخدم هذا الشهر (Used)",
        count: usedCount,
      },
      {
        value: "MONTHLY_UNKNOWN",
        label: "غير مثبت استخدامه (Unknown)",
        count: unknownCount,
      },
      {
        value: "HAS_PASSWORD",
        label: "مسجل له كلمة مرور",
        count: hasPassCount,
      },
      {
        value: "NO_PASSWORD",
        label: "بدون كلمة مرور مسجلة",
        count: noPassCount,
      },
    ];
    for (const [segKey, cnt] of segments.entries()) {
      const segCode = segKey.replace("SEG_", "");
      opts.push({
        value: segKey,
        label: `شريحة جودة ${segCode}`,
        count: cnt,
      });
    }
    return opts;
  }, [accounts]);

  const ownerColumnFilterOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, { label: string; sublabel?: string; count: number }>();
    let noOwnerCount = 0;
    for (const a of accounts) {
      const name = a.ownerNameAr || a.ownerNameEn;
      if (!name) {
        noOwnerCount++;
        continue;
      }
      const key = a.ownerNationalId || name;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, {
          label: name,
          sublabel: a.ownerNationalId ? `هوية: ${a.ownerNationalId}` : undefined,
          count: 1,
        });
      }
    }
    const opts: FilterOption[] = [];
    if (noOwnerCount > 0) {
      opts.push({ value: "NO_OWNER", label: "بدون مالك محدد", count: noOwnerCount });
    }
    for (const [value, item] of map.entries()) {
      opts.push({ value, ...item });
    }
    return opts;
  }, [accounts]);

  const riderColumnFilterOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, { label: string; sublabel?: string; count: number }>();
    let assignedCount = 0;
    let unassignedCount = 0;
    let commissionCount = 0;
    let targetCount = 0;
    for (const a of accounts) {
      const isAssigned =
        a.assignmentStatus === "Assigned" ||
        Boolean(a.actualRider?.nameAr || a.actualRider?.riderProfileId);
      const name =
        a.actualRider?.nameAr ||
        a.actualRider?.nameEn ||
        (isAssigned ? a.assignedRiderNameAr || a.assignedRiderNameEn : null);
      if (!isAssigned || !name) {
        unassignedCount++;
        continue;
      }
      assignedCount++;
      if ((a.compensationModel || "").toLowerCase() === "commission") commissionCount++;
      else if ((a.compensationModel || "").toLowerCase() === "target") targetCount++;

      const iqama = a.actualRider?.iqamaNo || a.assignedNationalId;
      const key = iqama || name || a.actualRider?.riderProfileId || "";
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, {
          label: name,
          sublabel: iqama ? `هوية: ${iqama}` : undefined,
          count: 1,
        });
      }
    }
    const opts: FilterOption[] = [
      { value: "STATE_ASSIGNED", label: "مكلف لمندوب (Assigned)", count: assignedCount },
      { value: "STATE_UNASSIGNED", label: "غير مكلف (Unassigned)", count: unassignedCount },
      { value: "COMP_COMMISSION", label: "نظام عمولة (Commission)", count: commissionCount },
      { value: "COMP_TARGET", label: "نظام تارجت (Target)", count: targetCount },
    ];
    for (const [value, item] of map.entries()) {
      opts.push({ value, ...item });
    }
    return opts;
  }, [accounts]);

  const dispositionColumnFilterOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const a of accounts) {
      const d = (a.disposition || "Unknown").toLowerCase();
      counts.set(d, (counts.get(d) || 0) + 1);
    }
    const opts: FilterOption[] = HUNGER_DISPOSITIONS.map((d) => ({
      value: d.value,
      label: d.labelAr,
      sublabel: d.labelEn,
      count: counts.get(d.value.toLowerCase()) || 0,
    }));
    opts.push({
      value: "Unknown",
      label: "غير مصنف (Unknown)",
      sublabel: "حساب بلا تصنيف تشغيلي موثق",
      count: counts.get("unknown") || 0,
    });
    return opts;
  }, [accounts]);

  const citySponsorColumnFilterOptions = useMemo<FilterOption[]>(() => {
    const cityCounts = new Map<string, number>();
    const sponsorCounts = new Map<string, number>();
    for (const a of accounts) {
      if (a.operatingCityNameAr) {
        cityCounts.set(
          a.operatingCityNameAr,
          (cityCounts.get(a.operatingCityNameAr) || 0) + 1,
        );
      }
      const sp = a.commercialRegistrationName || a.sponsorNameAr;
      if (sp) {
        sponsorCounts.set(sp, (sponsorCounts.get(sp) || 0) + 1);
      }
    }
    const opts: FilterOption[] = [];
    for (const [city, cnt] of cityCounts.entries()) {
      opts.push({
        value: `CITY:${city}`,
        label: city,
        sublabel: "المدينة التشغيلية",
        count: cnt,
      });
    }
    for (const [sp, cnt] of sponsorCounts.entries()) {
      opts.push({
        value: `SPONSOR:${sp}`,
        label: sp,
        sublabel: "السجل التجاري / الكفيل",
        count: cnt,
      });
    }
    return opts;
  }, [accounts]);

  const vehicleSimColumnFilterOptions = useMemo<FilterOption[]>(() => {
    let hasVehicle = 0;
    let noVehicle = 0;
    let hasSim = 0;
    let noSim = 0;
    for (const a of accounts) {
      if (
        a.registeredVehiclePlate ||
        a.actualVehiclePlate ||
        a.sourceVehicleDescription
      ) {
        hasVehicle++;
      } else {
        noVehicle++;
      }
      if (a.accountPhoneNumber || a.simPhoneNumber) {
        hasSim++;
      } else {
        noSim++;
      }
    }
    return [
      { value: "HAS_VEHICLE", label: "مرتبط بمركبة مسجلة / فعلية", count: hasVehicle },
      { value: "NO_VEHICLE", label: "بدون مركبة مسجلة", count: noVehicle },
      { value: "HAS_SIM", label: "مسجل له رقم جوال / شريحة", count: hasSim },
      { value: "NO_SIM", label: "بدون رقم جوال / شريحة", count: noSim },
    ];
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      const isAssigned =
        acc.assignmentStatus === "Assigned" ||
        Boolean(acc.actualRider?.nameAr || acc.actualRider?.riderProfileId);
      if (filterAssignment === "assigned" && !isAssigned) return false;
      if (filterAssignment === "unassigned" && isAssigned) return false;
      if (
        filterCity !== "all" &&
        acc.operatingCityId !== filterCity &&
        acc.operatingCityNameAr !== filterCity
      ) {
        return false;
      }

      // Operational Disposition Filter (Quick filter pills or toolbar dropdown)
      if (filterDisposition !== "all") {
        const d = (acc.disposition || "Unknown").toLowerCase();
        if (filterDisposition === "blocked_or_stopped") {
          if (d !== "blocked" && d !== "administrativestop") return false;
        } else if (filterDisposition.toLowerCase() !== d) {
          return false;
        }
      }

      // 1. Account Column Filter
      if (colFilterAccount.length > 0) {
        const match = colFilterAccount.some((val) => {
          if (val === "MONTHLY_USED") return acc.monthlyUsageStatus === "Used";
          if (val === "MONTHLY_UNKNOWN" || val === "MONTHLY_UNUSED")
            return acc.monthlyUsageStatus !== "Used";
          if (val === "HAS_PASSWORD") return acc.hasPassword === true;
          if (val === "NO_PASSWORD") return acc.hasPassword === false;
          if (val.startsWith("SEG_")) {
            return acc.latestQualitySegment === val.replace("SEG_", "");
          }
          return false;
        });
        if (!match) return false;
      }

      // 2. Owner Column Filter
      if (colFilterOwner.length > 0) {
        const ownerName = acc.ownerNameAr || acc.ownerNameEn;
        const ownerKey = acc.ownerNationalId || ownerName || "";
        const match = colFilterOwner.some((val) => {
          if (val === "NO_OWNER") return !ownerName;
          return val === ownerKey || val === ownerName;
        });
        if (!match) return false;
      }

      // 3. Actual Rider Column Filter (المندوب المكلف)
      if (colFilterRider.length > 0) {
        const riderName =
          acc.actualRider?.nameAr ||
          acc.actualRider?.nameEn ||
          (isAssigned ? acc.assignedRiderNameAr || acc.assignedRiderNameEn : null);
        const riderIqama = acc.actualRider?.iqamaNo || acc.assignedNationalId;
        const riderKey =
          riderIqama ||
          riderName ||
          acc.actualRider?.riderProfileId ||
          "";
        const match = colFilterRider.some((val) => {
          if (val === "STATE_ASSIGNED") return isAssigned;
          if (val === "STATE_UNASSIGNED") return !isAssigned;
          if (val === "COMP_COMMISSION")
            return (acc.compensationModel || "").toLowerCase() === "commission";
          if (val === "COMP_TARGET")
            return (acc.compensationModel || "").toLowerCase() === "target";
          return val === riderKey || val === riderName;
        });
        if (!match) return false;
      }

      // 4. Disposition Column Filter
      if (colFilterDisposition.length > 0) {
        const dispVal = (acc.disposition || "Unknown").toLowerCase();
        const match = colFilterDisposition.some(
          (val) => val.toLowerCase() === dispVal,
        );
        if (!match) return false;
      }

      // 5. City & Sponsor Column Filter
      if (colFilterCitySponsor.length > 0) {
        const sp = acc.commercialRegistrationName || acc.sponsorNameAr || "";
        const match = colFilterCitySponsor.some((val) => {
          if (val.startsWith("CITY:"))
            return acc.operatingCityNameAr === val.replace("CITY:", "");
          if (val.startsWith("SPONSOR:"))
            return sp === val.replace("SPONSOR:", "");
          return false;
        });
        if (!match) return false;
      }

      // 6. Vehicle & SIM Column Filter
      if (colFilterVehicleSim.length > 0) {
        const hasV = Boolean(
          acc.registeredVehiclePlate ||
            acc.actualVehiclePlate ||
            acc.sourceVehicleDescription,
        );
        const hasS = Boolean(acc.accountPhoneNumber || acc.simPhoneNumber);
        const match = colFilterVehicleSim.some((val) => {
          if (val === "HAS_VEHICLE") return hasV;
          if (val === "NO_VEHICLE") return !hasV;
          if (val === "HAS_SIM") return hasS;
          if (val === "NO_SIM") return !hasS;
          return false;
        });
        if (!match) return false;
      }

      if (!q) return true;
      const haystack = [
        acc.externalAccountId,
        acc.accountCode,
        acc.accountName,
        acc.ownerNameAr,
        acc.ownerNameEn,
        acc.ownerNationalId,
        acc.ownerPhoneNumber,
        acc.actualRider?.nameAr,
        acc.actualRider?.nameEn,
        acc.actualRider?.iqamaNo,
        acc.actualRider?.phoneNumber,
        acc.assignedRiderNameAr,
        acc.assignedRiderNameEn,
        acc.assignedNationalId,
        acc.assignedPhoneNumber,
        acc.operatingCityNameAr,
        acc.sponsorNameAr,
        acc.commercialRegistrationName,
        acc.accountPhoneNumber,
        acc.simPhoneNumber,
        acc.registeredVehiclePlate,
        acc.registeredVehicleSerial,
        acc.actualVehiclePlate,
        acc.sourceVehicleDescription,
        // Statuses and operational disposition labels (Arabic & English)
        acc.disposition,
        getDispositionMeta(acc.disposition).labelAr,
        getDispositionMeta(acc.disposition).labelEn,
        // Assignment status
        acc.assignmentStatus,
        isAssigned ? "مكلف assigned" : "شاغر غير مكلف unassigned",
        // Monthly usage status
        acc.monthlyUsageStatus,
        acc.monthlyUsageStatus === "Used" ? "مستخدم هذا الشهر used" : "غير مثبت unknown",
        // Account status
        acc.status,
        // Compensation model
        acc.compensationModel,
        acc.compensationModel ? getCompensationModelLabel(acc.compensationModel) : null,
        // Quality segment
        acc.latestQualitySegment ? `شريحة ${acc.latestQualitySegment}` : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    accounts,
    search,
    filterDisposition,
    filterAssignment,
    filterCity,
    colFilterAccount,
    colFilterOwner,
    colFilterRider,
    colFilterDisposition,
    colFilterCitySponsor,
    colFilterVehicleSim,
  ]);

  // Summary KPIs
  const stats = useMemo(() => {
    const total = accounts.length;
    let normal = 0;
    let problem = 0;
    let blockedOrStopped = 0;
    let deferred = 0;
    let unknown = 0;
    let assigned = 0;

    for (const a of accounts) {
      const d = (a.disposition || "Unknown").toLowerCase();
      if (d === "normal") normal++;
      else if (d === "problem") problem++;
      else if (d === "blocked" || d === "administrativestop")
        blockedOrStopped++;
      else if (d === "deferrednextmonth") deferred++;
      else unknown++;

      const isAssigned =
        a.assignmentStatus === "Assigned" ||
        Boolean(
          a.actualRider?.riderProfileId ||
            a.actualRider?.nameAr ||
            a.assignedRiderProfileId ||
            a.assignedRiderNameAr,
        );
      if (isAssigned) assigned++;
    }
    return {
      total,
      normal,
      problem,
      blockedOrStopped,
      deferred,
      unknown,
      assigned,
      unassigned: Math.max(0, total - assigned),
    };
  }, [accounts]);

  // Live calculation for Wallet Review (null when closingBalance is omitted, unless confirmed no previous history)
  const computedCurrentPeriodBalance = useMemo<number | null>(() => {
    const rawClosing = String(walletClosingBalance).trim();
    if (rawClosing === "") {
      // Authoritative account data confirms there is no previous wallet period: closing is 0, adjustments is 0
      if (walletAction === "Deliver" && walletHistoryCheck.hasNoHistory) {
        const mobile =
          parseFloat(String(walletMobileBalance).replace(/,/g, "")) || 0;
        return Number(mobile.toFixed(2));
      }
      return null;
    }
    const mobile =
      parseFloat(String(walletMobileBalance).replace(/,/g, "")) || 0;
    const closing =
      parseFloat(rawClosing.replace(/,/g, "")) || 0;
    const adj =
      parseFloat(String(walletProvenAdjustments).replace(/,/g, "")) || 0;
    return Number((mobile - (closing + adj)).toFixed(2));
  }, [
    walletMobileBalance,
    walletClosingBalance,
    walletProvenAdjustments,
    walletAction,
    walletHistoryCheck.hasNoHistory,
  ]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Handlers: Server Export & Template Download
  const handleServerExport = async (format: "xlsx" | "csv") => {
    setExportingFormat(format);
    try {
      await exportHungerAccounts({
        ...apiFilters,
        disposition:
          filterDisposition !== "all"
            ? filterDisposition
            : apiFilters.disposition,
        format,
      });
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تصدير الحسابات من الخادم"));
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDownloadSeedTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadHungerAccountsTemplate();
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تحميل قالب التأسيس"));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Handlers: Disposition Update
  const openDispositionModal = (acc: HungerAccountItem) => {
    setSelectedAccount(acc);
    setDispValue(
      (acc.disposition as HungerOperationalDisposition) || "Normal",
    );
    setDispReason(acc.dispositionReason || "");
    setDispDeferredUntil(
      acc.deferredUntil ? acc.deferredUntil.slice(0, 10) : "",
    );
    setDispositionModalOpen(true);
  };

  const handleSaveDisposition = async () => {
    if (!selectedAccount) return;
    const accId = selectedAccount.accountId || selectedAccount.id || "";
    if (!dispReason.trim()) {
      toast.warning("يرجى كتابة سبب تغيير الحالة التشغيلية");
      return;
    }
    if (dispValue === "DeferredNextMonth" && !dispDeferredUntil) {
      toast.warning("يرجى تحديد تاريخ التأجيل للشهر القادم");
      return;
    }
    setDispBusy(true);
    try {
      await updateHungerAccountDisposition(
        accId,
        {
          disposition: dispValue,
          reason: dispReason.trim(),
          deferredUntil:
            dispValue === "DeferredNextMonth" ? dispDeferredUntil : null,
          rowVersion: selectedAccount.rowVersion || "",
        },
        { suppressErrorToast: true },
      );
      setDispositionModalOpen(false);
      await loadAccounts();
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تحديث الحالة التشغيلية"));
    } finally {
      setDispBusy(false);
    }
  };

  // Handlers: Wallet Review & Deliver / Return
  const openWalletModal = (
    acc: HungerAccountItem,
    action: "Deliver" | "Return",
  ) => {
    setSelectedAccount(acc);
    setWalletAction(action);
    setWalletReviewResult(null);
    setWalletStaleError(null);
    setRiderLimitError(null);
    setRiderLimitDetails(null);
    setRiderPreCheckWarning(null);
    setWalletMobileBalance(
      acc.lastWalletBalance !== undefined && acc.lastWalletBalance !== null
        ? String(acc.lastWalletBalance)
        : "0.00",
    );
    setWalletClosingBalance(
      acc.lastClosingBalance !== undefined && acc.lastClosingBalance !== null
        ? String(acc.lastClosingBalance)
        : "",
    );
    setWalletProvenAdjustments("0.00");
    if (walletEvidencePreview) {
      URL.revokeObjectURL(walletEvidencePreview);
    }
    setWalletEvidenceFile(null);
    setWalletEvidencePreview(null);
    setWalletEvidenceError(null);
    if (walletFileInputRef.current) {
      walletFileInputRef.current.value = "";
    }
    setClosingEvidence("");
    setAdjustmentEvidence("");
    setWalletBusinessDate(getRiyadhTodayIso());
    setRiderLimitError(null);
    setRiderLimitDetails(null);
    setRiderPreCheckWarning(null);
    const initialDeliverRider =
      action === "Deliver"
        ? acc.actualRider?.riderProfileId || ""
        : "";
    setAssignRiderProfileId(initialDeliverRider);
    setRiderPreCheckLoading(action === "Deliver" && Boolean(initialDeliverRider));
    setAssignEffectiveFrom(getRiyadhTodayIso());
    setAssignCompensationModel(
      (acc.compensationModel as HungerCompensationModel) || "Commission",
    );
    setAssignPaymentModel(acc.paymentModel || "Commission");
    setAssignReason(action === "Deliver" ? "تسليم حساب هنقر" : "");
    setAssignBackdatedReason("");
    setReturnEffectiveTo(getRiyadhTodayIso());
    setReturnReason("");
    setReturnDayUsage(null);
    setWalletModalOpen(true);

    const accId = acc.accountId || acc.id || "";
    if (action === "Deliver") {
      setWalletHistoryCheck({
        loading: true,
        hasNoHistory: false,
        missingContract: false,
        reason: "",
      });
      void checkAccountWalletPeriodStatus(accId, acc).then((res) => {
        setWalletHistoryCheck({
          loading: false,
          hasNoHistory: res.hasNoHistory,
          missingContract: res.missingContract,
          reason: res.reason,
        });
      });
    } else {
      setWalletHistoryCheck({
        loading: false,
        hasNoHistory: false,
        missingContract: false,
        reason: "",
      });
    }
  };

  // Pre-review eligibility check for Deliver
  useEffect(() => {
    if (
      !walletModalOpen ||
      walletAction !== "Deliver" ||
      !assignRiderProfileId
    ) {
      return;
    }

    let isMounted = true;

    getRiderPlatformHistory(assignRiderProfileId)
      .then((res) => {
        if (!isMounted) return;
        const openAssignments = (res?.assignments || []).filter(
          (a) => a.effectiveTo === null,
        );
        const activeHunger = openAssignments.filter(
          (a) =>
            a.platformCode?.toUpperCase().includes("HUNGER") ||
            a.platformId === platformId,
        );
        if (activeHunger.length >= 1) {
          const accNumbers = activeHunger
            .map((a) => a.externalAccountId || a.accountCode || a.accountId)
            .filter(Boolean)
            .join("، ");
          setRiderPreCheckWarning(
            `تنبيه مسبق: المندوب لديه حاليًا حساب هنقرستيشن نشط${accNumbers ? ` رقم ${accNumbers}` : ""}. الحد الأقصى المسموح به هو حساب واحد فقط.`,
          );
        } else if (openAssignments.length > 0) {
          const otherNames = openAssignments
            .map(
              (a) =>
                `${a.platformNameAr || a.platformCode || "منصة"}: ${a.externalAccountId || a.accountId}`,
            )
            .join("، ");
          setRiderPreCheckWarning(
            `تنبيه مسبق: المندوب لديه تعيينات نشطة في منصات أخرى (${otherNames}). يرجى التحقق من أهليته وسعة حسابه.`,
          );
        } else {
          setRiderPreCheckWarning(null);
        }
      })
      .catch(() => {
        // Silently catch pre-check network errors
      })
      .finally(() => {
        if (isMounted) setRiderPreCheckLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [walletModalOpen, walletAction, assignRiderProfileId, platformId]);

  const handleCreateWalletReview = async () => {
    if (!selectedAccount) return;
    const accId = selectedAccount.accountId || selectedAccount.id || "";
    if (!walletSupervisorId) {
      toast.warning("يرجى اختيار المشرف المسؤول عن المراجعة المالية");
      return;
    }
    const todayIso = getRiyadhTodayIso();
    const isBackdatedDeliver =
      walletAction === "Deliver" && assignEffectiveFrom < todayIso;

    if (walletAction === "Deliver") {
      if (!assignRiderProfileId) {
        toast.warning("يرجى اختيار المندوب المراد تسليمه الحساب");
        return;
      }
      if (!assignReason.trim()) {
        toast.warning("يرجى كتابة سبب التسليم");
        return;
      }
      if (isBackdatedDeliver && !assignBackdatedReason.trim()) {
        toast.warning("يرجى كتابة سبب التسليم بأثر رجعي");
        return;
      }
    } else {
      if (!returnReason.trim()) {
        toast.warning("يرجى كتابة سبب إخلاء واستلام الحساب");
        return;
      }
    }

    const holderRiderId =
      walletAction === "Deliver"
        ? assignRiderProfileId
        : selectedAccount.actualRider?.riderProfileId ||
          selectedAccount.assignedRiderProfileId ||
          "";

    let previousDayUsages = undefined;
    if (walletAction === "Deliver" && assignmentContextRef.current) {
      if (!assignmentContextRef.current.isValid) {
        toast.warning("يرجى استكمال توزيع استخدام اليوم السابق أولاً");
        return;
      }
      previousDayUsages = assignmentContextRef.current.getPreviousDayUsages();
    }

    const hasRawClosing = String(walletClosingBalance).trim() !== "";
    let isNoHistory = false;
    let isMissingContract = false;

    if (!hasRawClosing && walletAction === "Deliver") {
      let currentCheck = walletHistoryCheck;
      if (currentCheck.loading) {
        setWalletBusy(true);
        const resolved = await checkAccountWalletPeriodStatus(
          accId,
          selectedAccount,
        );
        currentCheck = {
          loading: false,
          hasNoHistory: resolved.hasNoHistory,
          missingContract: resolved.missingContract,
          reason: resolved.reason,
        };
        setWalletHistoryCheck(currentCheck);
      }
      isNoHistory = currentCheck.hasNoHistory;
      isMissingContract = currentCheck.missingContract;
    }

    let payloadClosingBalance: number | null;
    let payloadClosingEvidence: string | null;
    let payloadProvenAdjustments: number;
    let payloadAdjustmentEvidence: string | null;

    if (hasRawClosing) {
      payloadClosingBalance =
        parseFloat(String(walletClosingBalance).replace(/,/g, "")) || 0;
      payloadClosingEvidence = closingEvidence.trim() || null;
      payloadProvenAdjustments =
        parseFloat(String(walletProvenAdjustments).replace(/,/g, "")) || 0;
      payloadAdjustmentEvidence = adjustmentEvidence.trim() || null;
    } else if (isNoHistory) {
      // Authoritative account data confirms there is no previous wallet period:
      // Send closingBalance: 0, closingEvidence: null, provenAdjustments: 0, adjustmentEvidence: null
      payloadClosingBalance = 0;
      payloadClosingEvidence = null;
      payloadProvenAdjustments = 0;
      payloadAdjustmentEvidence = null;
    } else {
      // Accounts with prior activity and unknown closing balance, or missing contract: preserve null
      payloadClosingBalance = null;
      payloadClosingEvidence = closingEvidence.trim() || null;
      payloadProvenAdjustments =
        parseFloat(String(walletProvenAdjustments).replace(/,/g, "")) || 0;
      payloadAdjustmentEvidence = adjustmentEvidence.trim() || null;
    }

    setWalletBusy(true);
    setWalletStaleError(null);
    setRiderLimitError(null);
    setRiderLimitDetails(null);
    try {
      const review = await createHungerWalletReview(
        accId,
        {
          action: walletAction,
          riderProfileId: holderRiderId,
          supervisorEmployeeId: walletSupervisorId,
          businessDate: walletBusinessDate,
          mobileBalance: String(walletMobileBalance).trim(),
          closingBalance: payloadClosingBalance,
          provenAdjustments: payloadProvenAdjustments,
          walletEvidence: walletEvidenceFile || null,
          closingEvidence: payloadClosingEvidence,
          adjustmentEvidence: payloadAdjustmentEvidence,
          assignment:
            walletAction === "Deliver"
              ? {
                  actualRiderProfileId: assignRiderProfileId,
                  riderProfileId: assignRiderProfileId,
                  effectiveFrom: assignEffectiveFrom,
                  reason: assignReason.trim(),
                  wasBackdated: isBackdatedDeliver,
                  backdatedReason: isBackdatedDeliver
                    ? assignBackdatedReason.trim()
                    : null,
                  compensationModel: assignCompensationModel,
                  paymentModel: assignPaymentModel || "Commission",
                  previousDayUsages,
                }
              : null,
          return:
            walletAction === "Return"
              ? {
                  effectiveTo: returnEffectiveTo,
                  status: "Ended",
                  reason: returnReason.trim(),
                  rowVersion:
                    selectedAccount.assignmentRowVersion ||
                    selectedAccount.activeAssignmentRowVersion ||
                    selectedAccount.rowVersion ||
                    "",
                  dayUsage: returnDayUsage || undefined,
                }
              : null,
        },
        { suppressErrorToast: true },
      );
      setWalletReviewResult(review);
      if (review.canConfirm === false || review.closingBalance === null) {
        if (isMissingContract) {
          toast.warning(
            "تم حفظ مراجعة المحفظة — تعذر التحقق من الفترات السابقة (عقد الـ API غير مكتمل)؛ يجب تسجيل رصيد الإقفال السابق مع دليله للاعتماد",
          );
        } else {
          toast.warning(
            "تم حفظ مراجعة المحفظة — الحساب له نشاط سابق؛ يجب تسجيل رصيد الإقفال السابق مع دليله للاعتماد النهائي",
          );
        }
      } else {
        toast.success(
          "تمت مراجعة المحفظة بنجاح (صالحة لمدة 20 دقيقة) — يمكنك الآن التأكيد النهائي",
        );
      }
    } catch (err) {
      const parsedLimit = parseRiderAccountLimitError(err);
      if (parsedLimit) {
        setRiderLimitError(parsedLimit.message);
        setRiderLimitDetails(parsedLimit.limit || null);
        toast.error(parsedLimit.message);
      } else {
        const details =
          (err as { details?: Record<string, unknown> })?.details ||
          (err as Record<string, unknown>);
        const errorCode = String(
          details?.errorCode || (err as { code?: string })?.code || "",
        );
        if (errorCode === "files.invalid_file") {
          setWalletEvidenceError(
            "صورة الإثبات غير صالحة أو غير مدعومة. يرجى اختيار صورة بصيغة (JPEG, PNG, WebP, GIF, BMP) لا يتجاوز حجمها 5 ميجابايت.",
          );
        }
        toast.error(getHungerErrorMessage(err, "تعذر إنشاء مراجعة المحفظة"));
      }
    } finally {
      setWalletBusy(false);
    }
  };

  const handleConfirmWalletReview = async () => {
    if (!walletReviewResult?.reviewId) return;
    setWalletBusy(true);
    setWalletStaleError(null);
    try {
      await confirmHungerWalletReview(walletReviewResult.reviewId, {
        suppressErrorToast: true,
      });
      setWalletModalOpen(false);
      setWalletReviewResult(null);
      setRiderLimitError(null);
      setRiderLimitDetails(null);
      toast.success("تم تأكيد مراجعة المحفظة واعتماد العملية بنجاح");
      await loadAccounts();
    } catch (err) {
      const parsedLimit = parseRiderAccountLimitError(err);
      if (parsedLimit) {
        // Structured 409 limit error: attach to rider field, keep modal open, preserve form data
        setRiderLimitError(parsedLimit.message);
        setRiderLimitDetails(parsedLimit.limit || null);
        // Force fresh review after resolving blocker
        setWalletReviewResult(null);
        toast.error(parsedLimit.message);
      } else if (isWalletReviewExpiredOrSuperseded(err)) {
        const staleMsg =
          "انتهت صلاحية المراجعة أو استُبدلت بمراجعة أحدث — أنشئ مراجعة جديدة";
        setWalletStaleError(staleMsg);
        setWalletReviewResult(null);
        toast.error(staleMsg);
      } else {
        toast.error(getHungerErrorMessage(err, "تعذر تأكيد مراجعة المحفظة"));
      }
    } finally {
      setWalletBusy(false);
    }
  };

  // Handlers: Shared Business Context & Credentials
  const openBusinessModal = async (acc: HungerAccountItem) => {
    setSelectedAccount(acc);
    setRevealedSecret(null);
    setRevealReason("");
    setBusinessModalOpen(true);
    setBusinessLoading(true);

    setBizOwnerEmployeeId(acc.ownerEmployeeId || "");
    setBizCityId(acc.operatingCityId || "");
    setBizRegistryName(acc.commercialRegistrationName || "");
    setBizRegistryNumber(acc.commercialRegistrationNumber || "");
    setBizSettlementSystem(acc.settlementSystem || "");
    setBizPhone(acc.accountPhoneNumber || "");
    setBizSimId(acc.phoneSimCardId || "");
    setBizVehicleId(acc.registeredVehicleId || "");
    setBizEffectiveFrom(getRiyadhTodayIso());
    setBizReason("");
    setSimOwnershipValue(
      acc.simOwnership === "Personal" ? "Personal" : "Company",
    );
    setSimEvidenceRef("");

    const accId = acc.accountId || acc.id || "";
    try {
      const ctx = await getPlatformAccountBusinessContext(
        accId,
        {
          from: apiFilters.from,
          through: apiFilters.through,
        },
        { suppressErrorToast: true },
      );
      setBusinessContext(ctx);
      if (ctx.ownerEmployeeId) setBizOwnerEmployeeId(ctx.ownerEmployeeId);
      if (ctx.operatingCityId) setBizCityId(ctx.operatingCityId);
      if (ctx.commercialRegistrationName)
        setBizRegistryName(ctx.commercialRegistrationName);
      if (ctx.commercialRegistrationNumber)
        setBizRegistryNumber(ctx.commercialRegistrationNumber);
      if (ctx.settlementSystem) setBizSettlementSystem(ctx.settlementSystem);
      if (ctx.accountPhoneNumber) setBizPhone(ctx.accountPhoneNumber);
      if (ctx.phoneSimCardId) setBizSimId(ctx.phoneSimCardId);
      if (ctx.registeredVehicleId) setBizVehicleId(ctx.registeredVehicleId);
      if (ctx.simOwnership === "Company" || ctx.simOwnership === "Personal")
        setSimOwnershipValue(ctx.simOwnership);
    } catch {
      setBusinessContext(null);
    } finally {
      setBusinessLoading(false);
    }
  };

  const handleSaveBusinessContext = async () => {
    if (!selectedAccount) return;
    if (!bizReason.trim()) {
      toast.warning("يرجى كتابة سبب تحديث بيانات الحساب");
      return;
    }
    const accId = selectedAccount.accountId || selectedAccount.id || "";
    setBizBusy(true);
    try {
      await updatePlatformAccountBusiness(
        accId,
        {
          ownerEmployeeId: canFieldOwner
            ? bizOwnerEmployeeId || null
            : undefined,
          operatingCityId: canFieldCity ? bizCityId || null : undefined,
          commercialRegistrationName: canFieldRegistry
            ? bizRegistryName.trim() || null
            : undefined,
          commercialRegistrationNumber: canFieldRegistry
            ? bizRegistryNumber.trim() || null
            : undefined,
          settlementSystem: canFieldSettlement
            ? bizSettlementSystem.trim() || null
            : undefined,
          accountPhoneNumber: canFieldContact
            ? bizPhone.trim() || null
            : undefined,
          phoneSimCardId: canFieldContact ? bizSimId || null : undefined,
          registeredVehicleId: canFieldVehicle
            ? bizVehicleId || null
            : undefined,
          effectiveFrom: bizEffectiveFrom,
          reason: bizReason.trim(),
          rowVersion:
            businessContext?.rowVersion || selectedAccount.rowVersion || "",
        },
        { suppressErrorToast: true },
      );
      setBusinessModalOpen(false);
      await loadAccounts();
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر حفظ البيانات التجارية للحساب"),
      );
    } finally {
      setBizBusy(false);
    }
  };

  const handleUpdateSimOwnership = async () => {
    const targetSimId =
      bizSimId ||
      businessContext?.phoneSimCardId ||
      selectedAccount?.phoneSimCardId;
    if (!targetSimId) {
      toast.warning("يرجى اختيار شريحة الاتصال المرتبطة أولاً");
      return;
    }
    if (!simEvidenceRef.trim()) {
      toast.warning("يرجى إدخال مرجع الإثبات لتغيير ملكية الشريحة");
      return;
    }
    const simObj = phoneSims.find((s) => s.id === targetSimId);
    setSimBusy(true);
    try {
      await updateSimCardOwnership(
        targetSimId,
        {
          ownership: simOwnershipValue,
          evidenceReference: simEvidenceRef.trim(),
          effectiveFrom: simEffectiveFrom,
          rowVersion:
            businessContext?.simRowVersion || simObj?.rowVersion || "",
        },
        { suppressErrorToast: true },
      );
      toast.success("تم تحديث ملكية شريحة الاتصال بنجاح");
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تحديث ملكية الشريحة"));
    } finally {
      setSimBusy(false);
    }
  };

  const handleRevealCredentials = async () => {
    if (!selectedAccount) return;
    if (!revealReason.trim()) {
      toast.warning("يرجى كتابة سبب كشف الرقم السري (يُسجل في سجل التدقيق)");
      return;
    }
    const accId = selectedAccount.accountId || selectedAccount.id || "";
    setRevealBusy(true);
    try {
      const secret = await revealPlatformAccountCredentials(
        accId,
        revealReason.trim(),
        { suppressErrorToast: true },
      );
      setRevealedSecret(secret);
      toast.success("تم كشف بيانات الدخول وتسجيل العملية في سجل التدقيق");
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر كشف بيانات الدخول السرية"),
      );
    } finally {
      setRevealBusy(false);
    }
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: `hunger-accounts-${getRiyadhTodayIso()}`,
      sheetName: "حسابات هنقرستيشن",
      data: filteredAccounts,
      columns: [
        {
          header: "الرقم الخارجي للحساب",
          accessor: (a) => a.externalAccountId || a.accountName || "—",
          isText: true,
        },
        {
          header: "صاحب الحساب (المالك)",
          accessor: (a) => a.ownerNameAr || a.ownerNameEn || "—",
        },
        {
          header: "هوية صاحب الحساب",
          accessor: (a) => a.ownerNationalId || "—",
          isText: true,
        },
        {
          header: "حالة التكليف",
          accessor: (a) =>
            a.assignmentStatus === "Assigned" || a.actualRider
              ? "مكلف (Assigned)"
              : "غير مكلف (Unassigned)",
        },
        {
          header: "المندوب المكلف",
          accessor: (a) =>
            a.actualRider?.nameAr ||
            a.actualRider?.nameEn ||
            (a.assignmentStatus === "Assigned"
              ? a.assignedRiderNameAr || a.assignedRiderNameEn
              : null) ||
            "غير مكلف",
        },
        {
          header: "هوية المندوب المكلف",
          accessor: (a) =>
            a.actualRider?.iqamaNo || a.assignedNationalId || "—",
          isText: true,
        },
        {
          header: "جوال المندوب المكلف",
          accessor: (a) =>
            a.actualRider?.phoneNumber || a.assignedPhoneNumber || "—",
          isText: true,
        },
        {
          header: "نظام محاسبة المندوب",
          accessor: (a) => getCompensationModelLabel(a.compensationModel),
        },
        {
          header: "الحالة التشغيلية",
          accessor: (a) => getDispositionMeta(a.disposition).labelAr,
        },
        {
          header: "سبب الحالة",
          accessor: (a) => a.dispositionReason || "—",
        },
        {
          header: "المدينة",
          accessor: (a) => a.operatingCityNameAr || "—",
        },
        {
          header: "السجل التجاري",
          accessor: (a) => a.commercialRegistrationName || "—",
        },
        {
          header: "نظام التصفية",
          accessor: (a) => a.settlementSystem || "—",
        },
        {
          header: "هاتف الحساب / الشريحة",
          accessor: (a) => a.accountPhoneNumber || a.simPhoneNumber || "—",
          isText: true,
        },
        {
          header: "المركبة المسجلة",
          accessor: (a) => a.registeredVehiclePlate || "—",
        },
      ],
    });
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
          {isEn
            ? "You do not have permission to view Hungerstation accounts (hunger.read)."
            : "ليس لديك الصلاحية الكافية لعرض حسابات وعمليات هنقرستيشن (hunger.read)."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isEn ? "ltr" : "rtl"}>
      {/* Breadcrumb & Page Header */}
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
            <span>الحسابات والتسليم والتأسيس</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                حسابات منصة هنقرستيشن (Hungerstation Accounts)
              </h1>
              <p className="text-xs text-[var(--muted)]">
                إدارة الحسابات والتأسيس، متابعة أصحاب الحسابات والمناديب المكلفين
                فعليًا، ومراجعة المحافظ عند التسليم والاستلام.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadAccounts()}
            disabled={loading}
          >
            <RefreshCw
              className={`ml-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            تحديث البيانات
          </Button>

          {canExportAccounts ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleServerExport("csv")}
                loading={exportingFormat === "csv"}
              >
                <FileSpreadsheet className="ml-1.5 h-3.5 w-3.5 text-sky-600" />
                تصدير CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleServerExport("xlsx")}
                loading={exportingFormat === "xlsx"}
              >
                <FileSpreadsheet className="ml-1.5 h-3.5 w-3.5 text-emerald-600" />
                تصدير إكسل (.xlsx)
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={filteredAccounts.length === 0}
            >
              <FileSpreadsheet className="ml-1.5 h-3.5 w-3.5 text-emerald-600" />
              تصدير إكسل
            </Button>
          )}

          {canImportSeed && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleDownloadSeedTemplate()}
                loading={downloadingTemplate}
              >
                <FileSpreadsheet className="ml-1.5 h-3.5 w-3.5 text-amber-600" />
                تحميل القالب
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSeedModalOpen(true)}
              >
                <Upload className="ml-1.5 h-3.5 w-3.5" />
                استيراد ملف التأسيس (Seed)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Deferred-Month Reminders Panel (Section 6) */}
      <DeferredRemindersPanel
        canRead={canRead}
        onSelectAccount={(extId) => {
          setSearch(extId);
          setApiFilters((prev) => ({
            ...prev,
            externalAccountId: extId,
          }));
        }}
      />

      {/* Summary KPI Cards (Interactive Status Filters across all pages) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* All Accounts */}
        <button
          type="button"
          onClick={() => {
            setFilterDisposition("all");
            setFilterAssignment("all");
          }}
          className={`group rounded-2xl border bg-[var(--surface)] p-4 text-right shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
            filterDisposition === "all" && filterAssignment === "all"
              ? "border-amber-500 ring-2 ring-amber-500/30"
              : "border-[var(--border)]"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-[var(--muted)]">
            <span>إجمالي الحسابات</span>
            <Server className="h-4 w-4 text-slate-400 group-hover:text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
            {stats.total}
          </p>
          <span className="mt-1 block text-[10px] text-[var(--muted)]">
            {filterDisposition === "all" && filterAssignment === "all"
              ? "● الكل معروض"
              : "عرض كافة الحالات"}
          </span>
        </button>

        {/* Normal / Working */}
        <button
          type="button"
          onClick={() => {
            setFilterDisposition((prev) =>
              prev.toLowerCase() === "normal" ? "all" : "Normal",
            );
          }}
          className={`group rounded-2xl border p-4 text-right shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
            filterDisposition.toLowerCase() === "normal"
              ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30 dark:border-emerald-600 dark:bg-emerald-950/40"
              : "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span>يعمل (نشط تشغيلياً)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {stats.normal}
          </p>
          <span className="mt-1 block text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
            {filterDisposition.toLowerCase() === "normal"
              ? "● الفلتر مفعل (انقر للإلغاء)"
              : "انقر للتصفية"}
          </span>
        </button>

        {/* Assigned */}
        <button
          type="button"
          onClick={() => {
            setFilterAssignment((prev) =>
              prev === "assigned" ? "all" : "assigned",
            );
          }}
          className={`group rounded-2xl border p-4 text-right shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
            filterAssignment === "assigned"
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/30 dark:border-blue-600 dark:bg-blue-950/40"
              : "border-blue-200/70 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-blue-700 dark:text-blue-300">
            <span>المندوب المكلف</span>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {stats.assigned}
          </p>
          <span className="mt-1 block text-[10px] text-blue-600/80 dark:text-blue-400/80">
            {filterAssignment === "assigned"
              ? "● الفلتر مفعل (انقر للإلغاء)"
              : "انقر للتصفية"}
          </span>
        </button>

        {/* Problem */}
        <button
          type="button"
          onClick={() => {
            setFilterDisposition((prev) =>
              prev.toLowerCase() === "problem" ? "all" : "Problem",
            );
          }}
          className={`group rounded-2xl border p-4 text-right shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
            filterDisposition.toLowerCase() === "problem"
              ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/30 dark:border-amber-600 dark:bg-amber-950/40"
              : "border-amber-200/70 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-300">
            <span>مشكلة تشغيلية</span>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {stats.problem}
          </p>
          <span className="mt-1 block text-[10px] text-amber-600/80 dark:text-amber-400/80">
            {filterDisposition.toLowerCase() === "problem"
              ? "● الفلتر مفعل (انقر للإلغاء)"
              : "انقر للتصفية"}
          </span>
        </button>

        {/* Blocked or Stopped */}
        <button
          type="button"
          onClick={() => {
            setFilterDisposition((prev) =>
              prev === "blocked_or_stopped" ? "all" : "blocked_or_stopped",
            );
          }}
          className={`group rounded-2xl border p-4 text-right shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
            filterDisposition === "blocked_or_stopped" ||
            filterDisposition.toLowerCase() === "blocked" ||
            filterDisposition.toLowerCase() === "administrativestop"
              ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500/30 dark:border-rose-600 dark:bg-rose-950/40"
              : "border-rose-200/70 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-300">
            <span>إيقاف إداري / محظور</span>
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300">
            {stats.blockedOrStopped}
          </p>
          <span className="mt-1 block text-[10px] text-rose-600/80 dark:text-rose-400/80">
            {filterDisposition === "blocked_or_stopped" ||
            filterDisposition.toLowerCase() === "blocked" ||
            filterDisposition.toLowerCase() === "administrativestop"
              ? "● الفلتر مفعل (انقر للإلغاء)"
              : "انقر للتصفية"}
          </span>
        </button>

        {/* Deferred Next Month */}
        <button
          type="button"
          onClick={() => {
            setFilterDisposition((prev) =>
              prev.toLowerCase() === "deferrednextmonth"
                ? "all"
                : "DeferredNextMonth",
            );
          }}
          className={`group rounded-2xl border p-4 text-right shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
            filterDisposition.toLowerCase() === "deferrednextmonth"
              ? "border-slate-500 bg-slate-100 ring-2 ring-slate-500/30 dark:border-slate-600 dark:bg-slate-800"
              : "border-[var(--border)] bg-[var(--subtle-bg)]"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-[var(--muted)]">
            <span>مؤجل للشهر القادم</span>
            <CalendarClock className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
            {stats.deferred}
          </p>
          <span className="mt-1 block text-[10px] text-[var(--muted)]">
            {filterDisposition.toLowerCase() === "deferrednextmonth"
              ? "● الفلتر مفعل (انقر للإلغاء)"
              : "انقر للتصفية"}
          </span>
        </button>
      </div>

      {/* Server-side Vehicle / SIM / Date Range Filter Panel */}
      <AccountsFilterPanel
        filters={apiFilters}
        onChange={(next) => setApiFilters(next)}
        onReset={() => {
          setApiFilters(INITIAL_API_FILTERS);
          setFilterDisposition("all");
          setFilterAssignment("all");
          setFilterCity("all");
          setSearch("");
          setColFilterAccount([]);
          setColFilterOwner([]);
          setColFilterRider([]);
          setColFilterDisposition([]);
          setColFilterCitySponsor([]);
          setColFilterVehicleSim([]);
        }}
        employeeOptions={supervisorOptions}
        riderOptions={riderOptions}
        cityOptions={cityOptions}
      />

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[260px] flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث شامل: الحساب، المالك، المندوب، الهوية، الجوال، اللوحة، الحالة..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 pr-9 pl-8 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-amber-500 focus:bg-[var(--surface)] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--foreground)] text-sm font-bold"
                title="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={filterDisposition}
            onChange={(e) => setFilterDisposition(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-amber-500 focus:outline-none"
          >
            <option value="all">جميع الحالات التشغيلية</option>
            {HUNGER_DISPOSITIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {isEn ? d.labelEn : d.labelAr}
              </option>
            ))}
            <option value="blocked_or_stopped">إيقاف إداري ومحظور معاً</option>
            <option value="Unknown">غير مصنف (Unknown)</option>
          </select>

          <select
            value={filterAssignment}
            onChange={(e) =>
              setFilterAssignment(
                e.target.value as "all" | "assigned" | "unassigned",
              )
            }
            className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-amber-500 focus:outline-none"
          >
            <option value="all">حالة التكليف: الكل</option>
            <option value="assigned">مكلف لمندوب فعليًا</option>
            <option value="unassigned">شاغر (غير مكلف)</option>
          </select>

          {cities.length > 0 && (
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-amber-500 focus:outline-none"
            >
              <option value="all">جميع المدن</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {isEn ? c.globalCityEn || c.globalCityAr : c.globalCityAr}
                </option>
              ))}
            </select>
          )}

          {(search ||
            filterDisposition !== "all" ||
            filterAssignment !== "all" ||
            filterCity !== "all" ||
            colFilterAccount.length > 0 ||
            colFilterOwner.length > 0 ||
            colFilterRider.length > 0 ||
            colFilterDisposition.length > 0 ||
            colFilterCitySponsor.length > 0 ||
            colFilterVehicleSim.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilterDisposition("all");
                setFilterAssignment("all");
                setFilterCity("all");
                setColFilterAccount([]);
                setColFilterOwner([]);
                setColFilterRider([]);
                setColFilterDisposition([]);
                setColFilterCitySponsor([]);
                setColFilterVehicleSim([]);
              }}
              className="text-xs text-[var(--muted)] hover:text-amber-600"
            >
              إعادة تعيين الفلاتر
            </Button>
          )}
        </div>

        <div className="text-xs font-semibold text-[var(--muted)]">
          النتائج المعروضة:{" "}
          <span className="font-bold text-[var(--foreground)]">
            {filteredAccounts.length}
          </span>{" "}
          من أصل {accounts.length} حساب
        </div>
      </div>

      {/* Accounts Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b-2 border-slate-200 bg-slate-100/95 text-[11px] font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-start gap-1.5">
                    <span>رقم الحساب والاسم</span>
                    <TableHeaderColumnFilter
                      label="رقم الحساب والاستخدام والجودة"
                      value={colFilterAccount}
                      onChange={setColFilterAccount}
                      options={accountColumnFilterOptions}
                      placeholder="تصفية بالاستخدام أو شريحة الجودة..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-start gap-1.5">
                    <span>صاحب الحساب (المالك)</span>
                    <TableHeaderColumnFilter
                      label="صاحب الحساب (المالك)"
                      value={colFilterOwner}
                      onChange={setColFilterOwner}
                      options={ownerColumnFilterOptions}
                      placeholder="بحث باسم المالك أو الهوية..."
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
                      options={riderColumnFilterOptions}
                      placeholder="بحث بالمندوب المكلف أو حالة التكليف..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-start gap-1.5">
                    <span>الحالة التشغيلية</span>
                    <TableHeaderColumnFilter
                      label="الحالة التشغيلية"
                      value={colFilterDisposition}
                      onChange={setColFilterDisposition}
                      options={dispositionColumnFilterOptions}
                      placeholder="تصفية بالحالة التشغيلية..."
                      align="right"
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-start gap-1.5">
                    <span>المدينة والسجل والمركبة</span>
                    <TableHeaderDualFilter
                      label="المدينة والسجل والمركبة"
                      align="right"
                      tab1={{
                        id: "city_sponsor",
                        label: "المدينة والسجل",
                        icon: <MapPin className="h-3 w-3" />,
                        values: colFilterCitySponsor,
                        onChange: setColFilterCitySponsor,
                        options: citySponsorColumnFilterOptions,
                        placeholder: "تصفية بالمدينة أو السجل...",
                      }}
                      tab2={{
                        id: "vehicle_sim",
                        label: "المركبة والشريحة",
                        icon: <Car className="h-3 w-3" />,
                        values: colFilterVehicleSim,
                        onChange: setColFilterVehicleSim,
                        options: vehicleSimColumnFilterOptions,
                        placeholder: "تصفية بالمركبة أو الشريحة...",
                      }}
                    />
                  </div>
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
                    colSpan={6}
                    className="py-14 text-center text-sm text-[var(--muted)]"
                  >
                    جارٍ تحميل حسابات منصة هنقرستيشن...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-14 text-center text-sm text-[var(--muted)]"
                  >
                    لا توجد حسابات مطابقة لمعايير البحث الحالية.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, idx) => {
                  const disp = getDispositionMeta(acc.disposition);
                  const isAssigned =
                    acc.assignmentStatus === "Assigned" ||
                    Boolean(
                      acc.actualRider?.riderProfileId ||
                        acc.actualRider?.nameAr,
                    );
                  const riderDisplayName =
                    acc.actualRider?.nameAr ||
                    acc.actualRider?.nameEn ||
                    (isAssigned
                      ? acc.assignedRiderNameAr || acc.assignedRiderNameEn
                      : null);
                  const externalLabel =
                    acc.externalAccountId ||
                    acc.accountName ||
                    `حساب #${idx + 1}`;
                  const rowKey = acc.accountId || acc.id || String(idx);

                  return (
                    <tr
                      key={rowKey}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      {/* 1. Account Identity */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--foreground)]">
                            {externalLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(externalLabel, rowKey)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            title="نسخ رقم الحساب"
                          >
                            {copiedKey === rowKey ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {acc.accountCode &&
                          acc.accountCode !== externalLabel && (
                            <p className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">
                              كود: {acc.accountCode}
                            </p>
                          )}
                        {acc.accountName &&
                          acc.externalAccountId &&
                          acc.accountName !== acc.externalAccountId && (
                            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                              {acc.accountName}
                            </p>
                          )}
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {acc.settlementSystem && (
                            <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              تصفية: {acc.settlementSystem}
                            </span>
                          )}
                          {acc.monthlyUsageStatus && (
                            <Badge
                              tone={
                                acc.monthlyUsageStatus === "Used"
                                  ? "green"
                                  : "gray"
                              }
                            >
                              {acc.monthlyUsageStatus === "Used"
                                ? "مستخدم هذا الشهر"
                                : "غير مثبت استخدامه"}
                            </Badge>
                          )}
                          {acc.latestQualitySegment && (
                            <Badge tone="purple">
                              جودة {acc.latestQualitySegment}
                              {acc.latestQualityRank !== null &&
                              acc.latestQualityRank !== undefined
                                ? ` (#${acc.latestQualityRank})`
                                : ""}
                              {acc.latestQualityScore !== null &&
                              acc.latestQualityScore !== undefined
                                ? ` — ${acc.latestQualityScore}`
                                : ""}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* 2. Account Owner (صاحب الحساب) */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[var(--foreground)]">
                          {acc.ownerNameAr || acc.ownerNameEn || "غير محدد"}
                        </div>
                        {acc.ownerNationalId && (
                          <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                            هوية: {acc.ownerNationalId}
                          </div>
                        )}
                        {acc.ownerPhoneNumber && (
                          <div
                            className="mt-0.5 text-[11px] text-slate-400"
                            dir="ltr"
                          >
                            {acc.ownerPhoneNumber}
                          </div>
                        )}
                      </td>

                      {/* 3. Assigned Rider (المندوب المكلف) */}
                      <td className="px-4 py-3.5">
                        {isAssigned && riderDisplayName ? (
                          <div>
                            <div className="font-bold text-blue-700 dark:text-blue-400">
                              {riderDisplayName}
                            </div>
                            {(acc.actualRider?.iqamaNo ||
                              acc.assignedNationalId) && (
                              <div className="text-[11px] text-[var(--muted)]">
                                هوية:{" "}
                                {acc.actualRider?.iqamaNo ||
                                  acc.assignedNationalId}
                              </div>
                            )}
                            {(acc.actualRider?.phoneNumber ||
                              acc.assignedPhoneNumber) && (
                              <div
                                className="text-[11px] text-slate-400"
                                dir="ltr"
                              >
                                {acc.actualRider?.phoneNumber ||
                                  acc.assignedPhoneNumber}
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {acc.compensationModel && (
                                <Badge tone="blue">
                                  {getCompensationModelLabel(
                                    acc.compensationModel,
                                    isEn,
                                  )}
                                </Badge>
                              )}
                              {(acc.assignmentFrom ||
                                acc.assignmentEffectiveFrom) && (
                                <span className="text-[10px] text-slate-400">
                                  منذ{" "}
                                  {(
                                    acc.assignmentFrom ||
                                    acc.assignmentEffectiveFrom
                                  )?.slice(0, 10)}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Badge tone="gray">غير مكلف</Badge>
                        )}
                      </td>

                      {/* 4. Operational Disposition */}
                      <td className="px-4 py-3.5">
                        <Badge tone={disp.badgeTone}>
                          {isEn ? disp.labelEn : disp.labelAr}
                        </Badge>
                        {acc.deferredUntil && (
                          <div className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            مؤجل حتى: {acc.deferredUntil.slice(0, 10)}
                          </div>
                        )}
                        {acc.dispositionReason && (
                          <div
                            className="mt-0.5 max-w-[180px] truncate text-[11px] text-[var(--muted)]"
                            title={acc.dispositionReason}
                          >
                            {acc.dispositionReason}
                          </div>
                        )}
                      </td>

                      {/* 5. City / Registry / Vehicle / SIM */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 text-[11px] text-[var(--muted)]">
                          {acc.operatingCityNameAr && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span>{acc.operatingCityNameAr}</span>
                            </div>
                          )}
                          {(acc.commercialRegistrationName ||
                            acc.sponsorNameAr) && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <span>
                                {acc.commercialRegistrationName ||
                                  acc.sponsorNameAr}
                              </span>
                            </div>
                          )}
                          {(acc.accountPhoneNumber ||
                            acc.simPhoneNumber ||
                            acc.simOwnership ||
                            acc.sourceSimOwnership) && (
                            <div className="flex flex-wrap items-center gap-1">
                              <Smartphone className="h-3 w-3 text-slate-400" />
                              {(acc.accountPhoneNumber ||
                                acc.simPhoneNumber) && (
                                <span dir="ltr">
                                  {acc.accountPhoneNumber || acc.simPhoneNumber}
                                </span>
                              )}
                              {acc.simOwnership && (
                                <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {HUNGER_SIM_OWNERSHIPS.find(
                                    (s) => s.value === acc.simOwnership,
                                  )?.labelAr || acc.simOwnership}
                                </span>
                              )}
                              {acc.sourceSimOwnership && (
                                <span
                                  className="rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                  title="ملكية الشريحة من ملف الاستيراد"
                                >
                                  من ملف الاستيراد: {acc.sourceSimOwnership}
                                </span>
                              )}
                              {(acc.simHolder?.nameAr ||
                                acc.sim?.holder?.nameAr ||
                                acc.simResponsibleEmployee?.nameAr) && (
                                <span className="text-[10px] text-slate-500">
                                  (حامل الشريحة:{" "}
                                  {acc.simHolder?.nameAr ||
                                    acc.sim?.holder?.nameAr ||
                                    acc.simResponsibleEmployee?.nameAr}
                                  )
                                </span>
                              )}
                            </div>
                          )}
                          {(acc.registeredVehiclePlate ||
                            acc.actualVehiclePlate ||
                            acc.sourceVehicleDescription ||
                            acc.actualVehicleCustodyStatus) && (
                            <div className="space-y-1">
                              {(acc.registeredVehiclePlate ||
                                acc.actualVehiclePlate ||
                                acc.sourceVehicleDescription) && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <Car className="h-3 w-3 text-slate-400" />
                                  <span>
                                    {acc.registeredVehiclePlate ||
                                      acc.actualVehiclePlate ||
                                      acc.sourceVehicleDescription}
                                  </span>
                                  {!acc.registeredVehiclePlate &&
                                    !acc.actualVehiclePlate &&
                                    acc.sourceVehicleDescription && (
                                      <span className="rounded bg-amber-50 px-1 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                                        من ملف الاستيراد
                                      </span>
                                    )}
                                </div>
                              )}
                              {acc.actualVehicleCustodyStatus && (
                                <div className="flex flex-wrap items-center gap-1">
                                  {(() => {
                                    const custodyMeta =
                                      getActualVehicleCustodyStatusMeta(
                                        acc.actualVehicleCustodyStatus,
                                      );
                                    return (
                                      <span
                                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${custodyMeta.className}`}
                                      >
                                        {custodyMeta.labelAr}
                                      </span>
                                    );
                                  })()}
                                  {acc.actualVehicleOwnership &&
                                    acc.actualVehicleOwnership !==
                                      "Unknown" && (
                                      <Badge
                                        tone={
                                          getActualVehicleOwnershipMeta(
                                            acc.actualVehicleOwnership,
                                          ).badgeTone
                                        }
                                      >
                                        {
                                          getActualVehicleOwnershipMeta(
                                            acc.actualVehicleOwnership,
                                          ).labelAr
                                        }
                                      </Badge>
                                    )}
                                </div>
                              )}
                            </div>
                          )}
                          {!acc.operatingCityNameAr &&
                            !acc.commercialRegistrationName &&
                            !acc.sponsorNameAr &&
                            !acc.accountPhoneNumber &&
                            !acc.simPhoneNumber &&
                            !acc.registeredVehiclePlate &&
                            !acc.actualVehiclePlate &&
                            !acc.sourceVehicleDescription &&
                            !acc.actualVehicleCustodyStatus && (
                              <span className="text-slate-400">—</span>
                            )}
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-start gap-1.5 flex-nowrap">
                          {canWalletReview && !isAssigned && (
                            <button
                              type="button"
                              onClick={() => openWalletModal(acc, "Deliver")}
                              className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 transition-colors shadow-xs"
                              title="تسليم الحساب ومراجعة المحفظة"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}

                          {canWalletReview && isAssigned && (
                            <button
                              type="button"
                              onClick={() => setSwapModalAccount(acc)}
                              className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 transition-colors shadow-xs"
                              title="تبديل المندوب (مراجعة واحدة متزامنة للإخلاء والتسليم)"
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                            </button>
                          )}

                          {canWalletReview && isAssigned && (
                            <button
                              type="button"
                              onClick={() => openWalletModal(acc, "Return")}
                              className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 transition-colors shadow-xs"
                              title="إخلاء الحساب ومراجعة المحفظة"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}

                          {canUpdateAccount && (
                            <button
                              type="button"
                              onClick={() => openDispositionModal(acc)}
                              className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--subtle-bg)] text-blue-600 dark:text-blue-400 transition-colors shadow-xs"
                              title="تغيير الحالة التشغيلية للحساب"
                            >
                              <SlidersHorizontal className="h-4 w-4" />
                            </button>
                          )}

                          {canUpdateAccount && (
                            <button
                              type="button"
                              onClick={() => setDayUsageModalAccount(acc)}
                              className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 dark:text-purple-300 transition-colors shadow-xs"
                              title="توثيق استخدام اليوم المشترك للحساب"
                            >
                              <CalendarClock className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void openBusinessModal(acc)}
                            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-300 transition-colors shadow-xs"
                            title="البيانات التجارية، الشريحة، المركبة المسجلة، وكشف الرقم السري"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* One-Page Footer Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--subtle-bg)] px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              عرض كافة الحسابات في صفحة واحدة
            </span>
            <span>—</span>
            <span>
              إجمالي الحسابات:{" "}
              <strong className="text-[var(--foreground)]">
                {accounts.length}
              </strong>
            </span>
            <span>—</span>
            <span>
              المعروض حالياً:{" "}
              <strong className="text-amber-600 dark:text-amber-400">
                {filteredAccounts.length}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(search ||
              filterDisposition !== "all" ||
              filterAssignment !== "all" ||
              filterCity !== "all" ||
              colFilterAccount.length > 0 ||
              colFilterOwner.length > 0 ||
              colFilterRider.length > 0 ||
              colFilterDisposition.length > 0 ||
              colFilterCitySponsor.length > 0 ||
              colFilterVehicleSim.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterDisposition("all");
                  setFilterAssignment("all");
                  setFilterCity("all");
                  setColFilterAccount([]);
                  setColFilterOwner([]);
                  setColFilterRider([]);
                  setColFilterDisposition([]);
                  setColFilterCitySponsor([]);
                  setColFilterVehicleSim([]);
                }}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                مسح جميع الفلاتر
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              العودة للأعلى ↑
            </Button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: Seed Import with Conflict Resolution (Section 5)
         ===================================================================== */}
      <SeedImportConflictModal
        open={seedModalOpen}
        onClose={() => setSeedModalOpen(false)}
        onSuccess={() => void loadAccounts()}
        defaultPlatformId={platformId}
      />

      {/* =====================================================================
          MODAL 2: Update Operational Disposition
         ===================================================================== */}
      <Modal
        isOpen={dispositionModalOpen}
        onClose={() => setDispositionModalOpen(false)}
        title={`تحديث الحالة التشغيلية — ${selectedAccount?.externalAccountId || selectedAccount?.accountName || ""}`}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              الحالة التشغيلية الجديدة
            </label>
            <select
              value={dispValue}
              onChange={(e) =>
                setDispValue(e.target.value as HungerOperationalDisposition)
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
            >
              {HUNGER_DISPOSITIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.labelAr}
                </option>
              ))}
            </select>
          </div>

          {dispValue === "DeferredNextMonth" && (
            <DateInput
              label="مؤجل حتى تاريخ"
              value={dispDeferredUntil}
              onChange={setDispDeferredUntil}
            />
          )}

          <Input
            label="سبب تغيير الحالة التشغيلية *"
            value={dispReason}
            onChange={(e) => setDispReason(e.target.value)}
            placeholder="مثال: إيقاف مؤقت للمراجعة، مشكلة في التطبيق، تأجيل للشهر القادم..."
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDispositionModalOpen(false)}
              disabled={dispBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSaveDisposition()}
              disabled={dispBusy}
            >
              {dispBusy ? "جارٍ الحفظ..." : "حفظ الحالة التشغيلية"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 3: Wallet Review & Confirm (Deliver / Return)
         ===================================================================== */}
      <Modal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        title={
          walletAction === "Deliver"
            ? `مراجعة المحفظة وتسليم الحساب — ${selectedAccount?.externalAccountId || selectedAccount?.accountName || ""}`
            : `مراجعة المحفظة وإخلاء الحساب — ${selectedAccount?.externalAccountId || selectedAccount?.accountName || ""}`
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            <div className="flex items-center gap-2 font-bold">
              <Wallet className="h-4 w-4" />
              <span>
                معادلة المحفظة: رصيد الفترة الحالية = رصيد الجوال − (رصيد
                الإقفال + التسويات المثبتة)
              </span>
            </div>
            <p className="mt-1 text-[11px]">
              يُقبل رصيد الجوال الموجب أو السالب أو الصفر في كلٍ من التسليم
              والاستلام دون الحاجة لصلاحية استثنائية، وتُحفظ المراجعة لمدة 20
              دقيقة قبل التنفيذ النهائي.
            </p>
          </div>

          {/* Deliver: Wallet Period History Check Banner */}
          {walletAction === "Deliver" && (
            <>
              {walletHistoryCheck.loading && (
                <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                  <span>
                    جارٍ التحقق من السجل المالي وسوابق المحفظة للحساب...
                  </span>
                </div>
              )}
              {!walletHistoryCheck.loading &&
                walletHistoryCheck.hasNoHistory &&
                !walletClosingBalance.trim() && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 text-xs text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold">
                        حساب جديد دون فترات محفظة سابقة
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        أكدت البيانات المعتمدة عدم وجود فترات محفظة سابقة. سيتم
                        إرسال رصيد إقفال بقيمة 0 والتسويات بقيمة 0 تلقائيًا بدون
                        أدلة لاعتماد التسليم مباشرة.
                      </p>
                    </div>
                  </div>
                )}
              {!walletHistoryCheck.loading &&
                !walletHistoryCheck.hasNoHistory &&
                !walletHistoryCheck.missingContract &&
                !walletClosingBalance.trim() && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-bold">
                        الحساب لديه نشاط أو فترات سابقة — يلزم تسجيل رصيد الإقفال
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        {walletHistoryCheck.reason ||
                          "الحساب لديه سجل محفظة سابق؛ لا يمكن اعتماد التسليم برصيد إقفال غير معروف. يرجى إدخال رصيد الإقفال السابق مع إثباته للاعتماد."}
                      </p>
                    </div>
                  </div>
                )}
              {!walletHistoryCheck.loading &&
                walletHistoryCheck.missingContract &&
                !walletClosingBalance.trim() && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50/80 p-3 text-xs text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <div>
                      <p className="font-bold">
                        عقد الـ API لا يتيح التحقق القاطع من سجل المحفظة (Missing
                        Backend Contract)
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        تعذر تأكيد ما إذا كان الحساب جديدًا كليًا أو لديه فترات
                        سابقة. تم الإبقاء على رصيد الإقفال كـ null منعًا للخطأ
                        المالي؛ يجب تسجيل رصيد الإقفال السابق يدويًا مع دليله
                        للاعتماد.
                      </p>
                    </div>
                  </div>
                )}
            </>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                المشرف المسؤول *
              </label>
              <SearchableSelect
                options={supervisorOptions}
                value={walletSupervisorId}
                onChange={setWalletSupervisorId}
                placeholder="ابحث باسم المشرف أو رقم الهوية..."
              />
            </div>

            <DateInput
              label="تاريخ العملية المالي *"
              value={walletBusinessDate}
              onChange={setWalletBusinessDate}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="رصيد الجوال الحالي (+ / - / 0) *"
              value={walletMobileBalance}
              onChange={(e) => setWalletMobileBalance(e.target.value)}
              placeholder="مثال: -100.00 أو +250.00"
            />
            <Input
              label="رصيد الإقفال السابق (اختياري)"
              type="number"
              step="0.01"
              value={walletClosingBalance}
              onChange={(e) => {
                setWalletClosingBalance(e.target.value);
                setWalletReviewResult(null);
              }}
              placeholder={
                walletAction === "Deliver" && walletHistoryCheck.hasNoHistory
                  ? "0.00 (حساب جديد بدون فترات سابقة)"
                  : "اتركه فارغًا إن لم يتوفر"
              }
            />
            <Input
              label="التسويات المثبتة"
              type="number"
              step="0.01"
              value={walletProvenAdjustments}
              onChange={(e) => setWalletProvenAdjustments(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-4 py-3">
            <span className="text-xs font-semibold text-[var(--muted)]">
              صافي رصيد الفترة الحالية المحسوب:
            </span>
            {computedCurrentPeriodBalance === null ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                  غير معروف
                </span>
                <span className="text-[11px] text-[var(--muted)]">
                  (حفظ المراجعة فقط — يتوقف التأكيد لعدم إدخال رصيد الإقفال)
                </span>
              </div>
            ) : (
              <span
                className={`text-base font-extrabold ${
                  computedCurrentPeriodBalance < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : computedCurrentPeriodBalance > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-[var(--foreground)]"
                }`}
                dir="ltr"
              >
                {computedCurrentPeriodBalance >= 0
                  ? `+${computedCurrentPeriodBalance.toFixed(2)}`
                  : computedCurrentPeriodBalance.toFixed(2)}{" "}
                SAR
              </span>
            )}
          </div>

          {/* Wallet Evidence Image & Optional Reference Evidences */}
          <div className="space-y-3 rounded-xl border border-[var(--border)] p-3.5">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[var(--foreground)]">
                  صورة إثبات رصيد المحفظة (اختياري)
                </label>
                <span className="text-[11px] text-[var(--muted)]">
                  JPG, PNG, WebP, GIF, BMP — الحد الأقصى 5 ميجابايت
                </span>
              </div>

              <input
                ref={walletFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.dib"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  handleWalletFileSelect(f);
                }}
              />

              {!walletEvidenceFile ? (
                <div
                  onClick={() => walletFileInputRef.current?.click()}
                  className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--subtle-bg)]/40 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50/20 dark:hover:border-blue-700"
                >
                  <Upload className="h-6 w-6 text-[var(--muted)]" />
                  <p className="mt-1 text-xs font-semibold text-[var(--foreground)]">
                    انقر لاختيار صورة إثبات رصيد المحفظة
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    (اختياري — يمكنك المتابعة بدون إرفاق صورة)
                  </p>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    {walletEvidencePreview && (
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-[var(--border)] bg-black/5 dark:bg-white/5">
                        <Image
                          src={walletEvidencePreview}
                          alt="معاينة إثبات المحفظة"
                          width={48}
                          height={48}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p
                        className="max-w-[200px] truncate text-xs font-bold text-[var(--foreground)] sm:max-w-[300px]"
                        dir="ltr"
                      >
                        {walletEvidenceFile.name}
                      </p>
                      <p className="text-[11px] text-[var(--muted)]">
                        {(walletEvidenceFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {walletEvidencePreview && (
                      <a
                        href={walletEvidencePreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--subtle-bg)]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>معاينة</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => walletFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--subtle-bg)]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>استبدال</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWalletFileRemove}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              )}

              {walletEvidenceError && (
                <p className="mt-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  {walletEvidenceError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-2 sm:grid-cols-2">
              <Input
                label="مرجع إثبات الإقفال (اختياري)"
                value={closingEvidence}
                onChange={(e) => setClosingEvidence(e.target.value)}
                placeholder="مرجع الإقفال"
              />
              <Input
                label="مرجع إثبات التسويات (اختياري)"
                value={adjustmentEvidence}
                onChange={(e) => setAdjustmentEvidence(e.target.value)}
                placeholder="مرجع التسوية"
              />
            </div>
          </div>

          {walletAction === "Deliver" ? (
            <div className="space-y-3 rounded-xl border border-[var(--border)] p-3.5">
              <h4 className="text-xs font-bold text-[var(--foreground)]">
                بيانات تكليف المندوب الجديد
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                    المندوب المستلم *
                  </label>
                  <SearchableSelect
                    options={riderOptions}
                    value={assignRiderProfileId}
                    onChange={(val) => {
                      setAssignRiderProfileId(val);
                      setRiderLimitError(null);
                      setRiderLimitDetails(null);
                      setRiderPreCheckWarning(null);
                      setRiderPreCheckLoading(Boolean(val));
                      setWalletReviewResult(null);
                    }}
                    placeholder="ابحث باسم المندوب أو رقم الإقامة..."
                  />

                  {riderPreCheckLoading && (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                      <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      <span>جارٍ التحقق من أهلية وسعة المندوب...</span>
                    </p>
                  )}

                  {!riderLimitError && riderPreCheckWarning && (
                    <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="space-y-0.5">
                        <p className="font-bold leading-relaxed">
                          {riderPreCheckWarning}
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          يُرجى معالجة التكليفات القائمة أو اختيار مندوب مؤهل قبل إجراء المراجعة المالية.
                        </p>
                      </div>
                    </div>
                  )}

                  {riderLimitError && (
                    <div className="mt-2 space-y-1.5 rounded-xl border border-rose-300 bg-rose-50/90 p-3 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <div className="space-y-1.5">
                          <p className="font-bold leading-relaxed">{riderLimitError}</p>
                          {riderLimitDetails?.activeAccounts &&
                            riderLimitDetails.activeAccounts.length > 0 && (
                              <div className="rounded-lg border border-rose-200 bg-white/70 p-2 text-[11px] text-rose-950 dark:border-rose-900/40 dark:bg-zinc-900/80 dark:text-rose-200">
                                <span className="font-semibold">
                                  الحسابات النشطة للمندوب حاليًا:
                                </span>
                                <ul className="mt-1 list-inside list-disc space-y-0.5">
                                  {riderLimitDetails.activeAccounts.map((acc, idx) => (
                                    <li key={acc.assignmentId || acc.accountId || idx}>
                                      {acc.platformNameAr ||
                                        (acc.platformCode &&
                                        acc.platformCode
                                          .toUpperCase()
                                          .includes("HUNGER")
                                          ? "هنقرستيشن"
                                          : acc.platformCode) ||
                                        "منصة"}{" "}
                                      — رقم الحساب:{" "}
                                      <strong dir="ltr">
                                        {acc.externalAccountId || acc.accountId}
                                      </strong>
                                      {acc.paymentModel ? ` (${acc.paymentModel})` : ""}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          <p className="text-[11px] text-rose-700 dark:text-rose-300">
                            * بعد معالجة وإنهاء التكليف المانع أو تعديل السعة عبر المسار المعتمد، يجب إنشاء مراجعة محفظة جديدة قبل تأكيد العملية.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <DateInput
                  label="تاريخ بداية التكليف *"
                  value={assignEffectiveFrom}
                  onChange={setAssignEffectiveFrom}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                    نظام محاسبة المندوب (Compensation Model)
                  </label>
                  <select
                    value={assignCompensationModel}
                    onChange={(e) =>
                      setAssignCompensationModel(
                        e.target.value as HungerCompensationModel,
                      )
                    }
                    disabled={!canFieldCompensation}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium disabled:opacity-60"
                  >
                    {HUNGER_COMPENSATION_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.labelAr}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="سبب التسليم *"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  placeholder="مثال: تسليم حساب تشغيلي للمندوب"
                />
              </div>

              {assignEffectiveFrom < getRiyadhTodayIso() && (
                <Input
                  label="سبب التكليف بأثر رجعي (Backdated Reason) *"
                  value={assignBackdatedReason}
                  onChange={(e) => setAssignBackdatedReason(e.target.value)}
                  placeholder="مثال: تأسيس موثق من الملف"
                />
              )}

              {assignRiderProfileId && (
                <AssignmentContextSection
                  ref={assignmentContextRef}
                  accountId={
                    selectedAccount?.accountId || selectedAccount?.id
                  }
                  riderProfileId={assignRiderProfileId}
                  businessDate={assignEffectiveFrom}
                />
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-[var(--border)] p-3.5">
              <h4 className="text-xs font-bold text-[var(--foreground)]">
                بيانات إخلاء واستلام الحساب من المندوب:{" "}
                <span className="text-blue-600">
                  {selectedAccount?.assignedRiderNameAr || "المندوب الحالي"}
                </span>
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateInput
                  label="تاريخ نهاية التكليف *"
                  value={returnEffectiveTo}
                  onChange={setReturnEffectiveTo}
                />
                <Input
                  label="سبب الإخلاء / الاستلام *"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="مثال: إجازة، نقل لمنصة أخرى، إنهاء تكليف..."
                />
              </div>
            </div>
          )}

          {walletStaleError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {walletStaleError}
            </div>
          )}

          {walletReviewResult && (
            <WalletReviewResultCard
              title="نتيجة فحص ومراجعة المحفظة"
              review={walletReviewResult}
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setWalletModalOpen(false)}
              disabled={walletBusy}
            >
              إلغاء
            </Button>
            <Button
              variant={walletReviewResult ? "secondary" : "primary"}
              onClick={() => void handleCreateWalletReview()}
              disabled={walletBusy}
            >
              {walletBusy
                ? "جارٍ المراجعة..."
                : walletReviewResult
                  ? "إنشاء مراجعة جديدة"
                  : "1. فحص ومراجعة المحفظة"}
            </Button>
            {walletReviewResult && (
              <Button
                variant="primary"
                onClick={() => void handleConfirmWalletReview()}
                disabled={
                  walletBusy ||
                  walletReviewResult.canConfirm === false ||
                  walletReviewResult.closingBalance === null
                }
              >
                {walletBusy
                  ? "جارٍ الاعتماد..."
                  : "2. تأكيد واعتماد العملية نهائيًا"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 4: Shared Business Context, SIM Ownership & Credentials Reveal
         ===================================================================== */}
      <Modal
        isOpen={businessModalOpen}
        onClose={() => setBusinessModalOpen(false)}
        title={`البيانات التجارية والسرية — ${selectedAccount?.externalAccountId || selectedAccount?.accountName || ""}`}
      >
        <div className="space-y-5">
          {businessLoading ? (
            <p className="py-6 text-center text-xs text-[var(--muted)]">
              جارٍ تحميل السياق التجاري للحساب...
            </p>
          ) : (
            <>
              <AccountVehicleSimDetailSection
                account={selectedAccount}
                context={businessContext}
                canEditVehicleIdentity={canVehicleIdentity}
              />

              <div className="space-y-3 rounded-xl border border-[var(--border)] p-3.5">
                <h4 className="text-xs font-bold text-[var(--foreground)]">
                  البيانات التجارية والتشغيلية للحساب
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                      صاحب الحساب (المالك)
                    </label>
                    <SearchableSelect
                      options={supervisorOptions}
                      value={bizOwnerEmployeeId}
                      onChange={setBizOwnerEmployeeId}
                      disabled={!canFieldOwner}
                      placeholder="اختر صاحب الحساب..."
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                      المدينة التشغيلية
                    </label>
                    <SearchableSelect
                      options={cityOptions}
                      value={bizCityId}
                      onChange={setBizCityId}
                      disabled={!canFieldCity}
                      placeholder="اختر المدينة..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label="جهة التسجيل / السجل التجاري"
                    value={bizRegistryName}
                    onChange={(e) => setBizRegistryName(e.target.value)}
                    disabled={!canFieldRegistry}
                  />
                  <Input
                    label="رقم السجل التجاري"
                    value={bizRegistryNumber}
                    onChange={(e) => setBizRegistryNumber(e.target.value)}
                    disabled={!canFieldRegistry}
                  />
                  <Input
                    label="نظام التصفية"
                    value={bizSettlementSystem}
                    onChange={(e) => setBizSettlementSystem(e.target.value)}
                    disabled={!canFieldSettlement}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label="رقم هاتف الحساب"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    disabled={!canFieldContact}
                  />
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                      شريحة الاتصال (SIM)
                    </label>
                    <SearchableSelect
                      options={simOptions}
                      value={bizSimId}
                      onChange={setBizSimId}
                      disabled={!canFieldContact}
                      placeholder="اختر رقم الشريحة..."
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                      المركبة المسجلة على الحساب
                    </label>
                    <SearchableSelect
                      options={vehicleOptions}
                      value={bizVehicleId}
                      onChange={setBizVehicleId}
                      disabled={!canFieldVehicle}
                      placeholder="اختر لوحة المركبة..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DateInput
                    label="ساري من تاريخ"
                    value={bizEffectiveFrom}
                    onChange={setBizEffectiveFrom}
                  />
                  <Input
                    label="سبب التعديل *"
                    value={bizReason}
                    onChange={(e) => setBizReason(e.target.value)}
                    placeholder="سبب تحديث البيانات التجارية"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleSaveBusinessContext()}
                    disabled={bizBusy}
                  >
                    {bizBusy
                      ? "جارٍ الحفظ..."
                      : "حفظ البيانات التجارية للحساب"}
                  </Button>
                </div>
              </div>

              {canFieldContact && (
                <div className="space-y-3 rounded-xl border border-[var(--border)] p-3.5">
                  <h4 className="text-xs font-bold text-[var(--foreground)]">
                    تحديث ملكية شريحة الاتصال المرتبطة (SIM Ownership)
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                        ملكية الشريحة
                      </label>
                      <select
                        value={simOwnershipValue}
                        onChange={(e) =>
                          setSimOwnershipValue(
                            e.target.value as HungerSimOwnership,
                          )
                        }
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                      >
                        {HUNGER_SIM_OWNERSHIPS.filter(
                          (o) =>
                            o.value === "Company" || o.value === "Personal",
                        ).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.labelAr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <DateInput
                      label="تاريخ السريان"
                      value={simEffectiveFrom}
                      onChange={setSimEffectiveFrom}
                    />
                    <Input
                      label="مرجع الإثبات *"
                      value={simEvidenceRef}
                      onChange={(e) => setSimEvidenceRef(e.target.value)}
                      placeholder="رقم السند أو المرفق"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleUpdateSimOwnership()}
                      disabled={simBusy}
                    >
                      {simBusy ? "جارٍ التحديث..." : "تحديث ملكية الشريحة"}
                    </Button>
                  </div>
                </div>
              )}

              {canRevealCredentials && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      كشف بيانات الدخول السرية (مسجل في سجل التدقيق)
                    </h4>
                    <Badge tone="orange">حساس - No Store</Badge>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label="سبب كشف كلمة المرور *"
                        value={revealReason}
                        onChange={(e) => setRevealReason(e.target.value)}
                        placeholder="مثال: تسليم الحساب للمندوب وتفعيل الدخول..."
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleRevealCredentials()}
                      disabled={revealBusy}
                    >
                      <Eye className="ml-1.5 h-3.5 w-3.5" />
                      {revealBusy ? "جارٍ الكشف..." : "كشف الرقم السري"}
                    </Button>
                  </div>

                  {revealedSecret && (
                    <div className="mt-2 rounded-lg border border-amber-300 bg-[var(--surface)] p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted)]">
                          كلمة المرور / الرمز:
                        </span>
                        <span
                          className="font-mono text-sm font-bold text-[var(--foreground)]"
                          dir="ltr"
                        >
                          {revealedSecret.password ||
                            revealedSecret.secret ||
                            "لا توجد كلمة مرور مسجلة"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 5: Shared Account Day Usage Modal
         ===================================================================== */}
      {dayUsageModalAccount && (
        <SharedAccountDayUsageModal
          isOpen={Boolean(dayUsageModalAccount)}
          onClose={() => setDayUsageModalAccount(null)}
          accountId={
            dayUsageModalAccount.accountId || dayUsageModalAccount.id || ""
          }
          accountCode={
            dayUsageModalAccount.externalAccountId ||
            dayUsageModalAccount.accountName ||
            "حساب هنقرستيشن"
          }
          platformName="هنقرستيشن"
          canEdit={canUpdateAccount}
          initialDate={getRiyadhTodayIso()}
          onUpdated={() => void loadAccounts()}
        />
      )}

      {/* =====================================================================
          MODAL 6: Rider Swap Modal (Return + Deliver in one review)
         ===================================================================== */}
      <RiderSwapModal
        key={swapModalAccount?.accountId || swapModalAccount?.id || "closed"}
        isOpen={Boolean(swapModalAccount)}
        onClose={() => setSwapModalAccount(null)}
        account={swapModalAccount}
        supervisorOptions={supervisorOptions}
        riderOptions={riderOptions}
        defaultSupervisorId={walletSupervisorId}
        canFieldCompensation={canFieldCompensation}
        onSuccess={() => void loadAccounts()}
      />
    </div>
  );
}
