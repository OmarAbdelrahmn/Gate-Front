// src/app/admin/hunger/finance/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getHungerPlatform,
  getAllHungerAccounts,
  getHungerFinanceEvents,
  createHungerFinanceEvent,
  createHungerFinanceRequest,
  executeHungerFinanceRequest,
  confirmHungerWithdrawalArrival,
  cancelHungerWithdrawal,
  createHungerRemittance,
  createHungerRemittanceDraft,
  submitHungerRemittance,
  confirmHungerRemittance,
  cancelHungerRemittance,
  reverseHungerReceiptConfirmation,
  getHungerPendingCollections,
  getHungerSettlementDocuments,
  createHungerSettlementDocument,
  reconcileHungerSettlementDocument,
  saveHungerFinanceConfiguration,
  generateHungerIdempotencyKey,
  getRiyadhTodayIso,
  getRiyadhCurrentMonthStartIso,
  getFinancialEventKindMeta,
  getWithdrawalStatusMeta,
  getRemittanceStatusMeta,
  getHungerErrorMessage,
  HUNGER_FINANCIAL_EVENT_KINDS,
  HUNGER_SETTLEMENT_DOCUMENT_KINDS,
  type HungerAccountItem,
  type HungerFinanceEventItem,
  type HungerFinancialEventKind,
  type HungerRemittanceResponse,
  type HungerRemittanceSourceLineItem,
  type HungerSettlementDocumentItem,
  type HungerSettlementDocumentKind,
} from "@/lib/hunger/api";
import {
  listEmployees,
  listOperatingCities,
  listRiders,
  listSponsors,
  type OperatingCity,
  type Sponsor,
} from "@/lib/workforce/api";
import type { Employee, Rider } from "@/lib/workforce/types";
import { WalletsTab } from "../components/WalletsTab";
import {
  getTreasuryAccounts,
  type TreasuryAccount,
} from "@/lib/jahez/treasury/api";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateInput } from "@/components/ui/DateInput";
import { toast } from "@/components/ui/Toast";
import {
  TableHeaderColumnFilter,
  type FilterOption,
} from "@/components/ui/TableHeaderFilter";
import {
  BadgeDollarSign,
  Wallet,
  ArrowLeftRight,
  FileText,
  Settings,
  Plus,
  RefreshCw,
  Landmark,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Send,
  RotateCcw,
  AlertTriangle,
  Link2,
} from "lucide-react";

type FinanceTab =
  | "events"
  | "wallets"
  | "remittances"
  | "settlements"
  | "configuration";

export default function HungerFinancePage() {
  const { can, canAny, authorization, user } = useAuth();

  const deniedPermSet = useMemo(
    () =>
      new Set(
        authorization?.deniedPermissionKeys ??
          authorization?.directDenies ??
          [],
      ),
    [authorization],
  );

  // Explicit denial overrides the hunger.finance.manage superset
  const canFinanceAction = useCallback(
    (perm: string) => {
      if (deniedPermSet.has(perm)) return false;
      return can(perm) || can("hunger.finance.manage");
    },
    [can, deniedPermSet],
  );

  const canFinanceRead =
    canFinanceAction("hunger.finance.read") ||
    canAny(
      "hunger.read",
      "hunger.finance.manage",
      "hunger.finance.configure",
      "hunger.remittances.confirm",
    );
  const canFundingRequest = canFinanceAction("hunger.finance.funding.request");
  const canFundingExecute = canFinanceAction("hunger.finance.funding.execute");
  const canTopupRequest = canFinanceAction("hunger.finance.topup.request");
  const canTopupExecute = canFinanceAction("hunger.finance.topup.execute");
  const canCollection = canFinanceAction("hunger.finance.collection");
  const canWithdrawalRequest = canFinanceAction(
    "hunger.finance.withdrawal.request",
  );
  const canWithdrawalConfirmArrival = canFinanceAction(
    "hunger.finance.withdrawal.arrival.confirm",
  );
  const canRiderPayment = canFinanceAction("hunger.finance.rider.payment");
  const canRemittanceSubmit = canFinanceAction("hunger.remittances.submit");
  const canConfirmRemittance = canFinanceAction("hunger.remittances.confirm");
  const canRemittanceCancelReverse = canFinanceAction(
    "hunger.remittances.cancel_reverse",
  );
  const canConfigureFinance = can("hunger.finance.configure");
  const canManageSettlements = can("hunger.finance.manage");

  const canCreateAnyFinancialEvent =
    canFundingRequest ||
    canFundingExecute ||
    canTopupRequest ||
    canTopupExecute ||
    canCollection ||
    canWithdrawalRequest ||
    canRiderPayment;

  const [activeTab, setActiveTab] = useState<FinanceTab>("events");
  const [platformId, setPlatformId] = useState<string>("");

  // Lookups (all human-readable, no raw IDs exposed)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [cities, setCities] = useState<OperatingCity[]>([]);
  const [accounts, setAccounts] = useState<HungerAccountItem[]>([]);
  const [subAccounts, setSubAccounts] = useState<TreasuryAccount[]>([]);

  // Selected Supervisor for Events & Remittances
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");

  // Tab 1: Financial Events & Custody Balances
  const [eventsList, setEventsList] = useState<HungerFinanceEventItem[]>([]);
  const [custodyBalance, setCustodyBalance] = useState<number>(0);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [colFilterEventKind, setColFilterEventKind] = useState<string[]>([]);
  const [colFilterEventAccount, setColFilterEventAccount] = useState<string[]>(
    [],
  );
  const [colFilterDocKind, setColFilterDocKind] = useState<string[]>([]);

  // Create Financial Event / Request Modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventKind, setEventKind] =
    useState<HungerFinancialEventKind>("Collection");
  const [eventExecutionMode, setEventExecutionMode] = useState<
    "Request" | "Execute"
  >("Execute");
  const [eventAmount, setEventAmount] = useState("");
  const [eventAccountId, setEventAccountId] = useState("");
  const [eventRiderId, setEventRiderId] = useState("");
  const [eventCounterSubAccountId, setEventCounterSubAccountId] = useState("");
  const [eventRelatedEventId, setEventRelatedEventId] = useState("");
  const [eventBusinessDate, setEventBusinessDate] =
    useState(getRiyadhTodayIso());
  const [eventEvidence, setEventEvidence] = useState("");
  // Withdrawal specific fields
  const [withdrawalSourceWalletBalance, setWithdrawalSourceWalletBalance] =
    useState("");
  const [withdrawalDestinationType, setWithdrawalDestinationType] = useState<
    "Company" | "Supervisor"
  >("Company");
  const [withdrawalDestinationOwnerId, setWithdrawalDestinationOwnerId] =
    useState("");
  const [withdrawalTransferRef, setWithdrawalTransferRef] = useState("");
  const [withdrawalAgainstReservedRights, setWithdrawalAgainstReservedRights] =
    useState(false);
  const [eventBusy, setEventBusy] = useState(false);
  const [executingRequestId, setExecutingRequestId] = useState<string | null>(
    null,
  );

  // Withdrawal Confirm Arrival / Cancel Modal
  const [withdrawalActionModal, setWithdrawalActionModal] = useState<{
    event: HungerFinanceEventItem;
    mode: "confirm-arrival" | "cancel";
  } | null>(null);
  const [withdrawalActionDate, setWithdrawalActionDate] =
    useState(getRiyadhTodayIso());
  const [withdrawalActionEvidence, setWithdrawalActionEvidence] = useState("");
  const [withdrawalActionBusy, setWithdrawalActionBusy] = useState(false);

  // Tab 2: Remittances & Pending Collections
  const [selectedSourceAmounts, setSelectedSourceAmounts] = useState<
    Record<string, number>
  >({});
  const [remitBusinessDate, setRemitBusinessDate] =
    useState(getRiyadhTodayIso());
  const [remitEvidence, setRemitEvidence] = useState("");
  const [remitBusy, setRemitBusy] = useState(false);
  const [recentRemittances, setRecentRemittances] = useState<
    HungerRemittanceResponse[]
  >([]);

  // Pending Collections (Batches + Sources)
  const [pendingBatches, setPendingBatches] = useState<
    HungerRemittanceResponse[]
  >([]);
  const [pendingBatchesTotal, setPendingBatchesTotal] = useState(0);
  const [pendingSources, setPendingSources] = useState<
    HungerRemittanceSourceLineItem[]
  >([]);
  const [pendingSourcesTotal, setPendingSourcesTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(25);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Submit Draft Remittance Modal
  const [submitDraftTarget, setSubmitDraftTarget] =
    useState<HungerRemittanceResponse | null>(null);
  const [submitDraftDate, setSubmitDraftDate] = useState(getRiyadhTodayIso());
  const [submitDraftEvidence, setSubmitDraftEvidence] = useState("");
  const [submitDraftBusy, setSubmitDraftBusy] = useState(false);

  // Accountant Confirm Remittance Modal
  const [confirmRemitModalOpen, setConfirmRemitModalOpen] = useState(false);
  const [targetRemittance, setTargetRemittance] =
    useState<HungerRemittanceResponse | null>(null);
  const [confirmMode, setConfirmMode] = useState<
    "all_remaining" | "selected_sources" | "partial_amounts"
  >("all_remaining");
  const [confirmSelectedSourceIds, setConfirmSelectedSourceIds] = useState<
    string[]
  >([]);
  const [confirmPartialAmounts, setConfirmPartialAmounts] = useState<
    Record<string, string>
  >({});
  const [confirmDestSubAccountId, setConfirmDestSubAccountId] = useState("");
  const [confirmDestType, setConfirmDestType] = useState<
    "" | "Company" | "Supervisor"
  >("");
  const [confirmDestOwnerId, setConfirmDestOwnerId] = useState("");
  const [confirmBusinessDate, setConfirmBusinessDate] =
    useState(getRiyadhTodayIso());
  const [confirmEvidence, setConfirmEvidence] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Cancel Remittance Batch / Reverse Receipt Confirmation Modal
  const [cancelOrReverseModal, setCancelOrReverseModal] = useState<{
    mode: "cancel-batch" | "reverse-confirmation";
    targetId: string;
    label: string;
  } | null>(null);
  const [cancelReverseDate, setCancelReverseDate] =
    useState(getRiyadhTodayIso());
  const [cancelReverseEvidence, setCancelReverseEvidence] = useState("");
  const [cancelReverseReason, setCancelReverseReason] = useState("");
  const [cancelReverseBusy, setCancelReverseBusy] = useState(false);

  // Tab 3: Settlement Documents (`Invoice` / `MonthClose` / `Adjustment`)
  const [settlementMonth, setSettlementMonth] = useState(
    getRiyadhCurrentMonthStartIso().slice(0, 7),
  );
  const [settlementFilterAccountId, setSettlementFilterAccountId] =
    useState("");
  const [settlementDocs, setSettlementDocs] = useState<
    HungerSettlementDocumentItem[]
  >([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docKind, setDocKind] =
    useState<HungerSettlementDocumentKind>("Invoice");
  const [docAccountId, setDocAccountId] = useState("");
  const [docMonth, setDocMonth] = useState(
    getRiyadhCurrentMonthStartIso().slice(0, 7),
  );
  const [docReference, setDocReference] = useState("");
  const [docAmount, setDocAmount] = useState("");
  const [docEvidence, setDocEvidence] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docBusinessDate, setDocBusinessDate] = useState(getRiyadhTodayIso());
  // Adjustment fields
  const [docSourceDocumentType, setDocSourceDocumentType] = useState(
    "StatementAdjustment",
  );
  const [docSourceReference, setDocSourceReference] = useState("");
  const [docClosingSnapshotId, setDocClosingSnapshotId] = useState("");
  const [docBusy, setDocBusy] = useState(false);

  // Reconcile Adjustment Modal
  const [reconcileTargetDoc, setReconcileTargetDoc] =
    useState<HungerSettlementDocumentItem | null>(null);
  const [reconcileSnapshotId, setReconcileSnapshotId] = useState("");
  const [reconcileEvidence, setReconcileEvidence] = useState("");
  const [reconcileBusy, setReconcileBusy] = useState(false);

  // Tab 4: Supervisor Accounting Configuration (`hunger.finance.configure`)
  const [cfgSupervisorId, setCfgSupervisorId] = useState("");
  const [cfgSponsorId, setCfgSponsorId] = useState("");
  const [cfgCustodySubId, setCfgCustodySubId] = useState("");
  const [cfgCollectionsSubId, setCfgCollectionsSubId] = useState("");
  const [cfgWalletSubId, setCfgWalletSubId] = useState("");
  const [cfgRiderClearingSubId, setCfgRiderClearingSubId] = useState("");
  const [cfgEvidence, setCfgEvidence] = useState("");
  const [cfgIsActive, setCfgIsActive] = useState(true);
  const [cfgBusy, setCfgBusy] = useState(false);

  // Load all lookups
  useEffect(() => {
    void (async () => {
      const [plat, emps, rids, sps, cits, accs, subs] = await Promise.allSettled([
        getHungerPlatform(),
        listEmployees(),
        listRiders(),
        listSponsors(),
        listOperatingCities(),
        getAllHungerAccounts(),
        getTreasuryAccounts(),
      ]);

      if (plat.status === "fulfilled" && plat.value?.id) {
        setPlatformId(plat.value.id);
      }
      if (emps.status === "fulfilled" && Array.isArray(emps.value)) {
        setEmployees(emps.value);
      }
      if (rids.status === "fulfilled" && Array.isArray(rids.value)) {
        setRiders(rids.value);
      }
      if (sps.status === "fulfilled" && Array.isArray(sps.value)) {
        setSponsors(sps.value);
      }
      if (cits.status === "fulfilled" && Array.isArray(cits.value)) {
        setCities(cits.value);
      }
      if (accs.status === "fulfilled" && Array.isArray(accs.value)) {
        setAccounts(accs.value);
      }
      if (subs.status === "fulfilled" && Array.isArray(subs.value)) {
        setSubAccounts(subs.value);
      }
    })();
  }, []);

  // Auto-select supervisor from current logged-in user or first employee
  useEffect(() => {
    if (!selectedSupervisorId && employees.length > 0) {
      void (async () => {
        await Promise.resolve();
        const matched = employees.find(
          (e) =>
            (user?.userName && e.iqamaNo === user.userName) ||
            (user?.displayNameAr && e.fullNameAr === user.displayNameAr) ||
            (user?.displayNameEn && e.fullNameEn === user.displayNameEn),
        );
        const chosen = matched?.id || employees[0]?.id || "";
        setSelectedSupervisorId(chosen);
        if (!cfgSupervisorId) setCfgSupervisorId(chosen);
      })();
    }
  }, [employees, user, selectedSupervisorId, cfgSupervisorId]);

  const citySelectOptions = useMemo(
    () =>
      cities.map((c) => ({
        value: c.id,
        label: c.globalCityAr || c.globalCityEn,
      })),
    [cities],
  );

  // Human-readable options
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
      riders
        .filter((r) => Boolean(r.id))
        .map((r) => ({
          value: r.id,
          label: `${r.fullNameAr}${r.iqamaNo ? ` — هوية: ${r.iqamaNo}` : ""}`,
          sublabel: r.preferredCityAr || r.phoneNumber || undefined,
        })),
    [riders],
  );

  const sponsorOptions = useMemo(
    () =>
      sponsors.map((s) => ({
        value: s.id,
        label: `${s.registryNameAr}${s.employerIdentityNumber ? ` (${s.employerIdentityNumber})` : ""}`,
      })),
    [sponsors],
  );

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.accountId || a.id || "",
        label: `${a.externalAccountId || a.accountName || "حساب"}${a.ownerNameAr ? ` — المالك: ${a.ownerNameAr}` : ""}`,
        sublabel: a.assignedRiderNameAr
          ? `المكلف: ${a.assignedRiderNameAr}`
          : "شاغر",
      })),
    [accounts],
  );

  const subAccountOptions = useMemo(
    () =>
      subAccounts.map((sa) => ({
        value: sa.id,
        label: `${sa.nameAr || sa.nameEn || sa.code || "حساب خزينة"}${sa.code ? ` (${sa.code})` : ""}`,
        sublabel: sa.nameEn || undefined,
      })),
    [subAccounts],
  );

  const relatedEventOptions = useMemo(
    () =>
      eventsList.map((ev) => ({
        value: ev.id || ev.eventId || "",
        label: `${getFinancialEventKindMeta(ev.kind).labelAr} — ${ev.amount} ر.س (${ev.businessDate?.slice(0, 10) || ""})`,
        sublabel: ev.externalAccountId || ev.riderNameAr || undefined,
      })),
    [eventsList],
  );

  const walletReturnEventOptions = useMemo(
    () =>
      eventsList
        .filter((ev) => {
          const k = (ev.kind || "").toLowerCase();
          return k.includes("return") || k.includes("wallet") || Boolean(ev.id || ev.eventId);
        })
        .map((ev) => ({
          value: ev.id || ev.eventId || "",
          label: `${getFinancialEventKindMeta(ev.kind).labelAr} — ${ev.amount} ر.س (${ev.businessDate?.slice(0, 10) || ""})`,
          sublabel: ev.externalAccountId || ev.riderNameAr || undefined,
        })),
    [eventsList],
  );

  const monthCloseDocOptions = useMemo(
    () =>
      settlementDocs
        .filter((d) => (d.kind || "").toLowerCase() === "monthclose")
        .map((d) => ({
          value: d.id || d.documentId || "",
          label: `إقفال شهري: ${d.documentReference} — ${d.month?.slice(0, 7) || ""} (${Number(d.amount || 0).toFixed(2)} SAR)`,
          sublabel: d.externalAccountId || "على مستوى المنصة",
        })),
    [settlementDocs],
  );

  // Permitted event kinds based on user's granular permissions
  const allowedFinancialEventKinds = useMemo(() => {
    return HUNGER_FINANCIAL_EVENT_KINDS.filter((k) => {
      switch (k.value) {
        case "Funding":
          return canFundingRequest || canFundingExecute;
        case "TopUpAdvance":
        case "TopUpCollected":
          return canTopupRequest || canTopupExecute;
        case "Collection":
          return canCollection;
        case "WithdrawalCompany":
        case "WithdrawalSupervisor":
          return canWithdrawalRequest;
        case "RiderPayment":
          return canRiderPayment;
        default:
          return false;
      }
    });
  }, [
    canFundingRequest,
    canFundingExecute,
    canTopupRequest,
    canTopupExecute,
    canCollection,
    canWithdrawalRequest,
    canRiderPayment,
  ]);

  const handleChangeEventKind = useCallback(
    (nextKind: HungerFinancialEventKind) => {
      setEventKind(nextKind);
      if (nextKind === "Funding") {
        if (!canFundingExecute && canFundingRequest) {
          setEventExecutionMode("Request");
        } else if (canFundingExecute && !canFundingRequest) {
          setEventExecutionMode("Execute");
        }
      } else if (
        nextKind === "TopUpAdvance" ||
        nextKind === "TopUpCollected"
      ) {
        if (!canTopupExecute && canTopupRequest) {
          setEventExecutionMode("Request");
        } else if (canTopupExecute && !canTopupRequest) {
          setEventExecutionMode("Execute");
        }
      } else {
        setEventExecutionMode("Execute");
      }

      if (nextKind === "WithdrawalCompany") {
        setWithdrawalDestinationType("Company");
      } else if (nextKind === "WithdrawalSupervisor") {
        setWithdrawalDestinationType("Supervisor");
        if (!withdrawalDestinationOwnerId && selectedSupervisorId) {
          setWithdrawalDestinationOwnerId(selectedSupervisorId);
        }
      }
    },
    [
      canFundingExecute,
      canFundingRequest,
      canTopupExecute,
      canTopupRequest,
      selectedSupervisorId,
      withdrawalDestinationOwnerId,
    ],
  );

  const eventKindColOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const ev of eventsList) {
      const k = (ev.kind || "").toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return HUNGER_FINANCIAL_EVENT_KINDS.map((k) => ({
      value: k.value,
      label: k.labelAr,
      sublabel: k.labelEn,
      count: counts.get(k.value.toLowerCase()) || 0,
    }));
  }, [eventsList]);

  const eventAccountColOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    for (const ev of eventsList) {
      const label =
        ev.externalAccountId || ev.accountName || ev.riderNameAr || "عام";
      map.set(label, (map.get(label) || 0) + 1);
    }
    return Array.from(map.entries()).map(([value, count]) => ({
      value,
      label: value,
      count,
    }));
  }, [eventsList]);

  const filteredEventsList = useMemo(() => {
    return eventsList.filter((ev) => {
      if (colFilterEventKind.length > 0) {
        const k = (ev.kind || "").toLowerCase();
        if (!colFilterEventKind.some((v) => v.toLowerCase() === k))
          return false;
      }
      if (colFilterEventAccount.length > 0) {
        const label =
          ev.externalAccountId || ev.accountName || ev.riderNameAr || "عام";
        if (!colFilterEventAccount.includes(label)) return false;
      }
      return true;
    });
  }, [eventsList, colFilterEventKind, colFilterEventAccount]);

  const docKindColOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const d of settlementDocs) {
      const k = (d.kind || "").toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return HUNGER_SETTLEMENT_DOCUMENT_KINDS.map((k) => ({
      value: k.value,
      label: k.labelAr,
      sublabel: k.labelEn,
      count: counts.get(k.value.toLowerCase()) || 0,
    }));
  }, [settlementDocs]);

  const filteredSettlementDocs = useMemo(() => {
    return settlementDocs.filter((doc) => {
      if (colFilterDocKind.length > 0) {
        const k = (doc.kind || "").toLowerCase();
        if (!colFilterDocKind.some((v) => v.toLowerCase() === k)) return false;
      }
      return true;
    });
  }, [settlementDocs, colFilterDocKind]);

  // Load Financial Events for Supervisor
  const loadEvents = useCallback(async () => {
    await Promise.resolve();
    if (!canFinanceRead || !selectedSupervisorId) return;
    setEventsLoading(true);
    try {
      let resolvedPlatformId = platformId;
      if (!resolvedPlatformId) {
        const p = await getHungerPlatform();
        resolvedPlatformId = p?.id || "";
        if (resolvedPlatformId) setPlatformId(resolvedPlatformId);
      }
      if (!resolvedPlatformId) {
        setEventsLoading(false);
        return;
      }
      const res = await getHungerFinanceEvents(
        {
          platformId: resolvedPlatformId,
          supervisorEmployeeId: selectedSupervisorId,
          page: 1,
          pageSize: 100,
        },
        { suppressErrorToast: true },
      );
      setEventsList(res.items);
      setCustodyBalance(res.custodyBalance ?? 0);
      setPendingBalance(
        res.pendingBalance ?? res.pendingRemittanceBalance ?? 0,
      );
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر تحميل الحركات المالية للمشرف"),
      );
    } finally {
      setEventsLoading(false);
    }
  }, [canFinanceRead, platformId, selectedSupervisorId]);

  // Load Pending Collections (Batches + Sources)
  const loadPendingCollections = useCallback(async () => {
    await Promise.resolve();
    if (!canFinanceRead || !selectedSupervisorId) return;
    setPendingLoading(true);
    try {
      let resolvedPlatformId = platformId;
      if (!resolvedPlatformId) {
        const p = await getHungerPlatform();
        resolvedPlatformId = p?.id || "";
        if (resolvedPlatformId) setPlatformId(resolvedPlatformId);
      }
      if (!resolvedPlatformId) {
        setPendingLoading(false);
        return;
      }
      const res = await getHungerPendingCollections(
        {
          platformId: resolvedPlatformId,
          supervisorEmployeeId: selectedSupervisorId,
          page: pendingPage,
          pageSize: pendingPageSize,
        },
        { suppressErrorToast: true },
      );
      setPendingBatches(res.batches.items);
      setPendingBatchesTotal(res.batches.totalCount);
      setPendingSources(res.sources.items);
      setPendingSourcesTotal(res.sources.totalCount);
    } catch (err) {
      toast.error(
        getHungerErrorMessage(
          err,
          "تعذر تحميل التحصيلات المعلقة وسندات التوريد",
        ),
      );
    } finally {
      setPendingLoading(false);
    }
  }, [
    canFinanceRead,
    platformId,
    selectedSupervisorId,
    pendingPage,
    pendingPageSize,
  ]);

  // Load Settlement Documents
  const loadSettlementDocuments = useCallback(async () => {
    await Promise.resolve();
    if (!canFinanceRead) return;
    setSettlementsLoading(true);
    try {
      let resolvedPlatformId = platformId;
      if (!resolvedPlatformId) {
        const p = await getHungerPlatform();
        resolvedPlatformId = p?.id || "";
        if (resolvedPlatformId) setPlatformId(resolvedPlatformId);
      }
      if (!resolvedPlatformId) {
        setSettlementsLoading(false);
        return;
      }
      const res = await getHungerSettlementDocuments(
        {
          platformId: resolvedPlatformId,
          month: `${settlementMonth}-01`,
          accountId: settlementFilterAccountId || undefined,
          page: 1,
          pageSize: 100,
        },
        { suppressErrorToast: true },
      );
      setSettlementDocs(res.items);
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تحميل مستندات التسوية"));
    } finally {
      setSettlementsLoading(false);
    }
  }, [canFinanceRead, platformId, settlementMonth, settlementFilterAccountId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "events") {
        void loadEvents();
      } else if (activeTab === "remittances") {
        void loadEvents();
        void loadPendingCollections();
      } else if (activeTab === "settlements") {
        void loadSettlementDocuments();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, loadEvents, loadPendingCollections, loadSettlementDocuments]);

  // Handlers: Create Financial Event or Request
  const isFundingOrTopupKind =
    eventKind === "Funding" ||
    eventKind === "TopUpAdvance" ||
    eventKind === "TopUpCollected";
  const isWithdrawalKind =
    eventKind === "WithdrawalCompany" || eventKind === "WithdrawalSupervisor";

  const handleCreateFinancialEvent = async () => {
    if (!selectedSupervisorId) {
      toast.warning("يرجى اختيار المشرف أولاً");
      return;
    }
    const amt = parseFloat(eventAmount);
    if (!amt || amt <= 0) {
      toast.warning("يرجى إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    if (!eventEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع السند أو الإثبات المالي");
      return;
    }

    if (isWithdrawalKind) {
      const srcBal = parseFloat(withdrawalSourceWalletBalance);
      if (isNaN(srcBal)) {
        toast.warning("يرجى إدخال رصيد المحفظة المصدر عند السحب");
        return;
      }
      if (!withdrawalDestinationOwnerId) {
        toast.warning(
          withdrawalDestinationType === "Company"
            ? "يرجى اختيار الكفيل / الشركة المستلمة للسحب"
            : "يرجى اختيار المشرف المستلم للسحب",
        );
        return;
      }
      if (!eventCounterSubAccountId) {
        toast.warning("يرجى اختيار حساب الخزينة المقابل للسحب");
        return;
      }
      if (!withdrawalTransferRef.trim()) {
        toast.warning("يرجى إدخال مرجع التحويل البنكي للسحب");
        return;
      }
      if (withdrawalAgainstReservedRights && !eventRelatedEventId) {
        toast.warning(
          "عند اختيار السحب مقابل حقوق محفوظة، يرجى اختيار حركة إخلاء المحفظة (WalletReturn) المرتبطة",
        );
        return;
      }
    }

    setEventBusy(true);
    try {
      let resolvedPlatformId = platformId;
      if (!resolvedPlatformId) {
        const p = await getHungerPlatform();
        resolvedPlatformId = p?.id || "";
      }

      const payload = {
        platformId: resolvedPlatformId,
        supervisorEmployeeId: selectedSupervisorId,
        kind: eventKind,
        amount: amt,
        accountId: eventAccountId || null,
        riderProfileId: eventRiderId || null,
        counterSubAccountId: eventCounterSubAccountId || null,
        relatedEventId: eventRelatedEventId || null,
        businessDate: eventBusinessDate,
        idempotencyKey: generateHungerIdempotencyKey("hng-ev"),
        evidenceReference: eventEvidence.trim(),
        ...(isWithdrawalKind
          ? {
              sourceWalletBalance: parseFloat(withdrawalSourceWalletBalance),
              destinationType: withdrawalDestinationType,
              destinationOwnerId: withdrawalDestinationOwnerId,
              transferReference: withdrawalTransferRef.trim(),
              transferDate: eventBusinessDate, // Must equal businessDate
              againstReservedRights: withdrawalAgainstReservedRights,
            }
          : {}),
      };

      if (isFundingOrTopupKind && eventExecutionMode === "Request") {
        await createHungerFinanceRequest(payload, {
          suppressErrorToast: true,
        });
      } else {
        await createHungerFinanceEvent(payload, {
          suppressErrorToast: true,
        });
      }

      setEventModalOpen(false);
      setEventAmount("");
      setEventEvidence("");
      setWithdrawalSourceWalletBalance("");
      setWithdrawalTransferRef("");
      setWithdrawalAgainstReservedRights(false);
      await loadEvents();
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تسجيل الحركة المالية"));
    } finally {
      setEventBusy(false);
    }
  };

  // Handler: Execute a Pending Finance Request
  const handleExecuteRequest = async (ev: HungerFinanceEventItem) => {
    const reqId = ev.requestId || ev.id || ev.eventId || "";
    if (!reqId) return;
    setExecutingRequestId(reqId);
    try {
      await executeHungerFinanceRequest(reqId, { suppressErrorToast: true });
      await loadEvents();
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تنفيذ الطلب المالي"));
    } finally {
      setExecutingRequestId(null);
    }
  };

  // Handler: Withdrawal Confirm Arrival or Cancel
  const handleConfirmOrCancelWithdrawal = async () => {
    if (!withdrawalActionModal) return;
    const withdrawalId =
      withdrawalActionModal.event.id ||
      withdrawalActionModal.event.eventId ||
      "";
    if (!withdrawalId) return;
    if (!withdrawalActionEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع الإثبات");
      return;
    }

    setWithdrawalActionBusy(true);
    try {
      if (withdrawalActionModal.mode === "confirm-arrival") {
        await confirmHungerWithdrawalArrival(
          withdrawalId,
          {
            idempotencyKey: generateHungerIdempotencyKey("hng-wd-arr"),
            businessDate: withdrawalActionDate,
            evidenceReference: withdrawalActionEvidence.trim(),
          },
          { suppressErrorToast: true },
        );
      } else {
        await cancelHungerWithdrawal(
          withdrawalId,
          {
            idempotencyKey: generateHungerIdempotencyKey("hng-wd-can"),
            businessDate: withdrawalActionDate,
            evidenceReference: withdrawalActionEvidence.trim(),
          },
          { suppressErrorToast: true },
        );
      }
      setWithdrawalActionModal(null);
      setWithdrawalActionEvidence("");
      await loadEvents();
    } catch (err) {
      toast.error(
        getHungerErrorMessage(
          err,
          withdrawalActionModal.mode === "confirm-arrival"
            ? "تعذر تأكيد وصول السحب"
            : "تعذر إلغاء حركة السحب",
        ),
      );
    } finally {
      setWithdrawalActionBusy(false);
    }
  };

  // Remittable events (Collection / WithdrawalSupervisor / pendingSources)
  const remittableEvents = useMemo(() => {
    if (pendingSources.length > 0) {
      return pendingSources;
    }
    return eventsList.filter((ev) => {
      const k = (ev.kind || "").toLowerCase();
      return (
        k === "collection" ||
        k === "withdrawalsupervisor" ||
        k === "topupcollected"
      );
    });
  }, [pendingSources, eventsList]);

  const totalSelectedRemittanceAmount = useMemo(
    () =>
      Object.values(selectedSourceAmounts).reduce(
        (acc, v) => acc + (Number(v) || 0),
        0,
      ),
    [selectedSourceAmounts],
  );

  const toggleRemittanceSource = (
    ev: HungerFinanceEventItem | HungerRemittanceSourceLineItem,
  ) => {
    const key =
      (ev as HungerRemittanceSourceLineItem).sourceEventId ||
      ev.id ||
      ev.eventId ||
      "";
    if (!key) return;
    setSelectedSourceAmounts((prev) => {
      const next = { ...prev };
      if (next[key] !== undefined) {
        delete next[key];
      } else {
        next[key] =
          ev.remainingAmount ??
          ev.remainingRemittableAmount ??
          ev.amount ??
          0;
      }
      return next;
    });
  };

  const handleCreateRemittance = async (asDraft: boolean) => {
    const sources = Object.entries(selectedSourceAmounts)
      .filter(([, amt]) => amt > 0)
      .map(([sourceEventId, amount]) => ({ sourceEventId, amount }));

    if (sources.length === 0) {
      toast.warning("يرجى تحديد حركة تحصيل واحدة على الأقل للتوريد");
      return;
    }
    if (!remitEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع سند التوريد أو التحويل البنكي");
      return;
    }
    setRemitBusy(true);
    try {
      let resolvedPlatformId = platformId;
      if (!resolvedPlatformId) {
        const p = await getHungerPlatform();
        resolvedPlatformId = p?.id || "";
      }
      const reqBody = {
        platformId: resolvedPlatformId,
        supervisorEmployeeId: selectedSupervisorId,
        sources,
        idempotencyKey: generateHungerIdempotencyKey(
          asDraft ? "hng-rem-drf" : "hng-rem",
        ),
        businessDate: remitBusinessDate,
        evidenceReference: remitEvidence.trim(),
      };
      const created = asDraft
        ? await createHungerRemittanceDraft(reqBody, {
            suppressErrorToast: true,
          })
        : await createHungerRemittance(reqBody, {
            suppressErrorToast: true,
          });
      const supName =
        employees.find((e) => e.id === selectedSupervisorId)?.fullNameAr ||
        "المشرف";
      setRecentRemittances((prev) => [
        {
          ...created,
          remittanceId: created.remittanceId || created.id || "",
          supervisorNameAr: created.supervisorNameAr || supName,
          totalAmount: created.totalAmount ?? totalSelectedRemittanceAmount,
          businessDate: remitBusinessDate,
          evidenceReference: remitEvidence.trim(),
          status: created.status || (asDraft ? "Draft" : "Submitted"),
        },
        ...prev,
      ]);
      setSelectedSourceAmounts({});
      setRemitEvidence("");
      await Promise.all([loadEvents(), loadPendingCollections()]);
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر إنشاء سند التوريد"));
    } finally {
      setRemitBusy(false);
    }
  };

  const handleSubmitRemittanceDraft = async () => {
    if (!submitDraftTarget) return;
    const remId =
      submitDraftTarget.remittanceId || submitDraftTarget.id || "";
    if (!remId) return;
    if (!submitDraftEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع الإثبات لإرسال المسودة");
      return;
    }
    setSubmitDraftBusy(true);
    try {
      await submitHungerRemittance(
        remId,
        {
          idempotencyKey: generateHungerIdempotencyKey("hng-rem-sub"),
          businessDate: submitDraftDate,
          evidenceReference: submitDraftEvidence.trim(),
        },
        { suppressErrorToast: true },
      );
      setSubmitDraftTarget(null);
      setSubmitDraftEvidence("");
      await Promise.all([loadEvents(), loadPendingCollections()]);
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر إرسال مسودة التوريد للمحاسب"),
      );
    } finally {
      setSubmitDraftBusy(false);
    }
  };

  const openAccountantConfirmModal = (rem: HungerRemittanceResponse) => {
    setTargetRemittance(rem);
    setConfirmMode("all_remaining");
    setConfirmSelectedSourceIds([]);
    const initialPartials: Record<string, string> = {};
    for (const s of rem.sources ?? []) {
      const remAmt =
        s.remainingAmount ??
        Math.max(0, (s.amount || 0) - (s.confirmedAmount || 0));
      initialPartials[s.sourceEventId] = String(remAmt);
    }
    setConfirmPartialAmounts(initialPartials);
    setConfirmDestSubAccountId("");
    setConfirmDestType("");
    setConfirmDestOwnerId("");
    setConfirmBusinessDate(getRiyadhTodayIso());
    setConfirmEvidence(rem.evidenceReference || "");
    setConfirmRemitModalOpen(true);
  };

  const handleConfirmRemittanceReceipt = async () => {
    if (!targetRemittance) return;
    if (!confirmEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع تأكيد الاستلام المحاسبي");
      return;
    }

    let sourcesPayload = undefined;
    let selectedIdsPayload = undefined;

    if (confirmMode === "selected_sources") {
      if (confirmSelectedSourceIds.length === 0) {
        toast.warning("يرجى اختيار مصدر واحد على الأقل لتأكيده بالكامل");
        return;
      }
      selectedIdsPayload = confirmSelectedSourceIds;
    } else if (confirmMode === "partial_amounts") {
      const entries = Object.entries(confirmPartialAmounts)
        .map(([sourceEventId, val]) => ({
          sourceEventId,
          amount: parseFloat(val) || 0,
        }))
        .filter((x) => x.amount > 0);
      if (entries.length === 0) {
        toast.warning("يرجى إدخال مبلغ أكبر من صفر لمصدر واحد على الأقل");
        return;
      }
      sourcesPayload = entries;
    }

    const remId = targetRemittance.remittanceId || targetRemittance.id || "";
    setConfirmBusy(true);
    try {
      const updated = await confirmHungerRemittance(
        remId,
        {
          destinationSubAccountId: confirmDestSubAccountId || null,
          destinationType: confirmDestType || null,
          destinationOwnerId: confirmDestOwnerId || null,
          sources: sourcesPayload,
          selectedSourceIds: selectedIdsPayload,
          idempotencyKey: generateHungerIdempotencyKey("hng-rem-cnf"),
          businessDate: confirmBusinessDate,
          evidenceReference: confirmEvidence.trim(),
        },
        { suppressErrorToast: true },
      );
      setRecentRemittances((prev) =>
        prev.map((r) =>
          (r.remittanceId || r.id) === remId
            ? { ...r, ...updated, status: updated.status || "Confirmed" }
            : r,
        ),
      );
      setConfirmRemitModalOpen(false);
      await Promise.all([loadEvents(), loadPendingCollections()]);
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تأكيد استلام التوريد"));
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleCancelBatchOrReverseConfirmation = async () => {
    if (!cancelOrReverseModal) return;
    if (!cancelReverseReason.trim()) {
      toast.warning("يرجى إدخال السبب (إلزامي)");
      return;
    }
    if (!cancelReverseEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع الإثبات");
      return;
    }
    setCancelReverseBusy(true);
    try {
      if (cancelOrReverseModal.mode === "cancel-batch") {
        await cancelHungerRemittance(
          cancelOrReverseModal.targetId,
          {
            idempotencyKey: generateHungerIdempotencyKey("hng-rem-can"),
            businessDate: cancelReverseDate,
            evidenceReference: cancelReverseEvidence.trim(),
            reason: cancelReverseReason.trim(),
          },
          { suppressErrorToast: true },
        );
      } else {
        await reverseHungerReceiptConfirmation(
          cancelOrReverseModal.targetId,
          {
            idempotencyKey: generateHungerIdempotencyKey("hng-rcp-rev"),
            businessDate: cancelReverseDate,
            evidenceReference: cancelReverseEvidence.trim(),
            reason: cancelReverseReason.trim(),
          },
          { suppressErrorToast: true },
        );
      }
      setCancelOrReverseModal(null);
      setCancelReverseReason("");
      setCancelReverseEvidence("");
      await Promise.all([loadEvents(), loadPendingCollections()]);
    } catch (err) {
      toast.error(
        getHungerErrorMessage(
          err,
          cancelOrReverseModal.mode === "cancel-batch"
            ? "تعذر إلغاء دفعة التوريد"
            : "تعذر عكس تأكيد الاستلام",
        ),
      );
    } finally {
      setCancelReverseBusy(false);
    }
  };

  // Handlers: Settlement Document (`Invoice` / `MonthClose` / `Adjustment`)
  const handleCreateSettlementDoc = async () => {
    const amt = parseFloat(docAmount);
    if (!docReference.trim() || !docEvidence.trim() || isNaN(amt)) {
      toast.warning("يرجى استكمال رقم المستند والمبلغ ومرجع الإثبات");
      return;
    }
    if (docKind === "Adjustment") {
      if (!docSourceDocumentType.trim() || !docSourceReference.trim()) {
        toast.warning(
          "لتسجيل مستند تسوية (Adjustment)، يرجى إدخال نوع المستند المصدر ورقم مرجع المصدر",
        );
        return;
      }
      if (!docClosingSnapshotId) {
        toast.warning(
          "يرجى اختيار مستند الإقفال الشهري (MonthClose) المرتبط بالتسوية",
        );
        return;
      }
    }
    setDocBusy(true);
    try {
      let resolvedPlatformId = platformId;
      if (!resolvedPlatformId) {
        const p = await getHungerPlatform();
        resolvedPlatformId = p?.id || "";
      }
      await createHungerSettlementDocument(
        {
          platformId: resolvedPlatformId,
          accountId: docAccountId || null,
          month: `${docMonth}-01`,
          kind: docKind,
          documentReference: docReference.trim(),
          amount: amt,
          evidenceReference: docEvidence.trim(),
          notes: docNotes.trim() || null,
          businessDate: docBusinessDate,
          ...(docKind === "Adjustment"
            ? {
                sourceDocumentType: docSourceDocumentType.trim(),
                sourceReference: docSourceReference.trim(),
                closingSnapshotId: docClosingSnapshotId,
              }
            : {}),
        },
        { suppressErrorToast: true },
      );
      setDocModalOpen(false);
      setDocReference("");
      setDocAmount("");
      setDocEvidence("");
      setDocNotes("");
      setDocSourceReference("");
      await loadSettlementDocuments();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.error("هذا المصدر مسجل مسبقًا");
      } else {
        toast.error(getHungerErrorMessage(err, "تعذر تسجيل مستند التسوية"));
      }
    } finally {
      setDocBusy(false);
    }
  };

  // Handler: Reconcile Unmatched Adjustment
  const handleReconcileAdjustment = async () => {
    if (!reconcileTargetDoc) return;
    const docId =
      reconcileTargetDoc.id || reconcileTargetDoc.documentId || "";
    if (!docId) return;
    if (!reconcileSnapshotId) {
      toast.warning("يرجى اختيار مستند الإقفال الشهري (MonthClose) للمطابقة");
      return;
    }
    if (!reconcileEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع إثبات المطابقة");
      return;
    }
    setReconcileBusy(true);
    try {
      await reconcileHungerSettlementDocument(
        docId,
        {
          closingSnapshotId: reconcileSnapshotId,
          evidenceReference: reconcileEvidence.trim(),
        },
        { suppressErrorToast: true },
      );
      setReconcileTargetDoc(null);
      setReconcileEvidence("");
      await loadSettlementDocuments();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.error("هذا المصدر مسجل مسبقًا");
      } else {
        toast.error(getHungerErrorMessage(err, "تعذر مطابقة مستند التسوية"));
      }
    } finally {
      setReconcileBusy(false);
    }
  };

  // Handlers: Supervisor Accounting Configuration
  const handleSaveConfiguration = async () => {
    if (
      !cfgSupervisorId ||
      !cfgSponsorId ||
      !cfgCustodySubId ||
      !cfgCollectionsSubId ||
      !cfgWalletSubId ||
      !cfgRiderClearingSubId ||
      !cfgEvidence.trim()
    ) {
      toast.warning(
        "يرجى اختيار المشرف والكفيل وجميع حسابات الخزينة الفرعية الأربعة ومرجع الاعتماد",
      );
      return;
    }
    setCfgBusy(true);
    try {
      let resolvedPlatformId = platformId;
      if (!resolvedPlatformId) {
        const p = await getHungerPlatform();
        resolvedPlatformId = p?.id || "";
      }
      await saveHungerFinanceConfiguration(
        {
          platformId: resolvedPlatformId,
          supervisorEmployeeId: cfgSupervisorId,
          sponsorId: cfgSponsorId,
          custodySubAccountId: cfgCustodySubId,
          collectionsSubAccountId: cfgCollectionsSubId,
          walletSubAccountId: cfgWalletSubId,
          riderClearingSubAccountId: cfgRiderClearingSubId,
          evidenceReference: cfgEvidence.trim(),
          isActive: cfgIsActive,
        },
        { suppressErrorToast: true },
      );
      setCfgEvidence("");
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر حفظ تهيئة حسابات مشرف هنقرستيشن"),
      );
    } finally {
      setCfgBusy(false);
    }
  };

  // Combine server batches and recently created local remittances
  const displayedRemittanceBatches = useMemo(() => {
    const map = new Map<string, HungerRemittanceResponse>();
    for (const b of pendingBatches) {
      const id = b.remittanceId || b.id || "";
      if (id) map.set(id, b);
    }
    for (const r of recentRemittances) {
      const id = r.remittanceId || r.id || "";
      if (id && !map.has(id)) {
        map.set(id, r);
      }
    }
    return Array.from(map.values());
  }, [pendingBatches, recentRemittances]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <Link href="/admin" className="hover:text-[var(--foreground)]">
              لوحة التحكم
            </Link>
            <span>/</span>
            <span className="font-semibold text-[var(--foreground)]">
              إدارة هنقرستيشن
            </span>
            <span>/</span>
            <span>المحافظ والتوريد والتسويات</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <BadgeDollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                المحافظ والتوريد والتسويات المالية — هنقرستيشن
              </h1>
              <p className="text-xs text-[var(--muted)]">
                إدارة عهد المشرفين وشحن المحافظ والسحب وسندات التوريد للخزينة
                ومستندات التسوية والفواتير الشهرية
              </p>
            </div>
          </div>
        </div>

        {/* Section Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "events"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>عهدة المشرف والحركات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("wallets")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "wallets"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <Landmark className="h-3.5 w-3.5" />
            <span>المحافظ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("remittances")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "remittances"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>سندات التوريد والتحصيلات المعلقة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settlements")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "settlements"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>الفواتير والتسويات</span>
          </button>

          {canConfigureFinance && (
            <button
              type="button"
              onClick={() => setActiveTab("configuration")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "configuration"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-[var(--muted)] hover:bg-[var(--subtle-hover)] hover:text-[var(--foreground)]"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>تهيئة الحسابات</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          TAB: Wallets (Section 8)
         ===================================================================== */}
      {activeTab === "wallets" && (
        <WalletsTab
          canReadFinance={canFinanceRead}
          employeeOptions={supervisorOptions}
          riderOptions={riderOptions}
          cityOptions={citySelectOptions}
          sponsorOptions={sponsorOptions}
        />
      )}

      {/* =====================================================================
          TAB 1: Financial Events, Requests & Withdrawals
         ===================================================================== */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {/* Supervisor Selector & Custody KPIs */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                المشرف المسؤول عن المحفظة والعهدة
              </label>
              <SearchableSelect
                options={supervisorOptions}
                value={selectedSupervisorId}
                onChange={setSelectedSupervisorId}
                placeholder="اختر المشرف..."
              />
            </div>

            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span>رصيد العهدة الحالي للمشرف</span>
                <Landmark className="h-4 w-4" />
              </div>
              <p
                className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300"
                dir="ltr"
              >
                {custodyBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                SAR
              </p>
            </div>

            <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
                <span>الرصيد المعلق بانتظار التوريد</span>
                <Clock className="h-4 w-4" />
              </div>
              <p
                className="mt-2 text-2xl font-extrabold text-amber-700 dark:text-amber-300"
                dir="ltr"
              >
                {pendingBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                SAR
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                سجل الحركات والطلبات المالية للمحافظ والعهدة
              </h3>
              <p className="text-xs text-[var(--muted)]">
                يشمل طلبات وتنفيذ التمويل وشحن المحافظ، التحصيل من المناديب،
                حركات السحب (مع تأكيد الوصول أو الإلغاء)، وصرف المستحقات.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void loadEvents()}
                disabled={eventsLoading}
              >
                <RefreshCw
                  className={`ml-1.5 h-3.5 w-3.5 ${eventsLoading ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
              {canCreateAnyFinancialEvent && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const initialKind =
                      allowedFinancialEventKinds.find(
                        (k) => k.value === eventKind,
                      )?.value ||
                      allowedFinancialEventKinds[0]?.value ||
                      "Collection";
                    handleChangeEventKind(initialKind);
                    setEventModalOpen(true);
                  }}
                >
                  <Plus className="ml-1.5 h-3.5 w-3.5" />
                  تسجيل حركة / طلب مالي جديد
                </Button>
              )}
            </div>
          </div>

          {/* Events Table */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/95 dark:bg-slate-800/95 text-[11px] font-black text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">التاريخ</th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1.5">
                        <span>نوع الحركة المالية</span>
                        <TableHeaderColumnFilter
                          label="نوع الحركة المالية"
                          value={colFilterEventKind}
                          onChange={setColFilterEventKind}
                          options={eventKindColOptions}
                          placeholder="تصفية بنوع الحركة..."
                          align="right"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">المبلغ</th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1.5">
                        <span>الحساب / المندوب</span>
                        <TableHeaderColumnFilter
                          label="الحساب / المندوب"
                          value={colFilterEventAccount}
                          onChange={setColFilterEventAccount}
                          options={eventAccountColOptions}
                          placeholder="بحث بالحساب أو المندوب..."
                          align="right"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      حساب الخزينة / الوجهة
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">مرجع الإثبات</th>
                    <th className="px-4 py-3 whitespace-nowrap">
                      حالة الحركة / السحب / التوريد
                    </th>
                    <th className="px-4 py-3 whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {eventsLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-[var(--muted)]"
                      >
                        جارٍ تحميل الحركات المالية...
                      </td>
                    </tr>
                  ) : filteredEventsList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-[var(--muted)]"
                      >
                        لا توجد حركات مالية مسجلة لهذا المشرف حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    filteredEventsList.map((ev, idx) => {
                      const meta = getFinancialEventKindMeta(ev.kind);
                      const isWithdrawal =
                        ev.kind === "WithdrawalCompany" ||
                        ev.kind === "WithdrawalSupervisor";
                      const rawStatus =
                        ev.withdrawalStatus || ev.status || "";
                      const isPendingArrival =
                        isWithdrawal &&
                        (rawStatus === "PendingArrival" ||
                          rawStatus === "Pending" ||
                          !rawStatus);
                      const isRequested =
                        rawStatus === "Requested" ||
                        Boolean(ev.requestId && rawStatus !== "Executed");
                      const canExecRequest =
                        ev.kind === "Funding"
                          ? canFundingExecute
                          : ev.kind === "TopUpAdvance" ||
                              ev.kind === "TopUpCollected"
                            ? canTopupExecute
                            : false;
                      const rowId =
                        ev.requestId || ev.id || ev.eventId || String(idx);

                      return (
                        <tr
                          key={rowId}
                          className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-3 font-medium">
                            {ev.businessDate?.slice(0, 10) || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={meta.badgeTone}>
                              {meta.labelAr}
                            </Badge>
                            {ev.againstReservedRights && (
                              <span className="mr-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                                مقابل حقوق محفوظة
                              </span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 font-extrabold text-[var(--foreground)]"
                            dir="ltr"
                          >
                            {Number(ev.amount || 0).toFixed(2)} SAR
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[var(--foreground)]">
                              {ev.externalAccountId ||
                                ev.accountName ||
                                ev.riderNameAr ||
                                "—"}
                            </div>
                            {ev.riderNameAr && ev.externalAccountId && (
                              <div className="text-[11px] text-[var(--muted)]">
                                المندوب: {ev.riderNameAr}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[var(--muted)]">
                            <div>{ev.counterSubAccountName || "—"}</div>
                            {ev.transferReference && (
                              <div className="text-[10px] text-slate-400">
                                تحويل: {ev.transferReference}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[var(--muted)]">
                            {ev.evidenceReference || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1">
                              {isWithdrawal && (
                                <Badge
                                  tone={
                                    getWithdrawalStatusMeta(
                                      rawStatus || "PendingArrival",
                                    ).badgeTone
                                  }
                                >
                                  {
                                    getWithdrawalStatusMeta(
                                      rawStatus || "PendingArrival",
                                    ).labelAr
                                  }
                                </Badge>
                              )}
                              {isRequested && (
                                <Badge tone="orange">
                                  طلب بانتظار التنفيذ (Requested)
                                </Badge>
                              )}
                              {rawStatus === "Executed" && (
                                <Badge tone="green">منفذ</Badge>
                              )}
                              {ev.remittanceStatus && (
                                <Badge
                                  tone={
                                    getRemittanceStatusMeta(
                                      ev.remittanceStatus,
                                    ).badgeTone
                                  }
                                >
                                  {
                                    getRemittanceStatusMeta(
                                      ev.remittanceStatus,
                                    ).labelAr
                                  }
                                </Badge>
                              )}
                              {!isWithdrawal &&
                                !isRequested &&
                                rawStatus !== "Executed" &&
                                !ev.remittanceStatus && (
                                  <span className="text-[var(--muted)]">—</span>
                                )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {isRequested && canExecRequest && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={executingRequestId === rowId}
                                  onClick={() => void handleExecuteRequest(ev)}
                                >
                                  <Play className="ml-1 h-3 w-3" />
                                  {executingRequestId === rowId
                                    ? "جارٍ التنفيذ..."
                                    : "تنفيذ"}
                                </Button>
                              )}

                              {isPendingArrival &&
                                canWithdrawalConfirmArrival && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                      setWithdrawalActionModal({
                                        event: ev,
                                        mode: "confirm-arrival",
                                      });
                                      setWithdrawalActionDate(
                                        getRiyadhTodayIso(),
                                      );
                                      setWithdrawalActionEvidence(
                                        ev.transferReference ||
                                          ev.evidenceReference ||
                                          "",
                                      );
                                    }}
                                  >
                                    <CheckCircle2 className="ml-1 h-3 w-3" />
                                    تأكيد الوصول
                                  </Button>
                                )}

                              {isPendingArrival && canWithdrawalRequest && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setWithdrawalActionModal({
                                      event: ev,
                                      mode: "cancel",
                                    });
                                    setWithdrawalActionDate(
                                      getRiyadhTodayIso(),
                                    );
                                    setWithdrawalActionEvidence("");
                                  }}
                                >
                                  <XCircle className="ml-1 h-3 w-3 text-rose-600" />
                                  إلغاء
                                </Button>
                              )}
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
        </div>
      )}

      {/* =====================================================================
          TAB 2: Remittances, Drafts, Accountant Confirmation & Pending Collections
         ===================================================================== */}
      {activeTab === "remittances" && (
        <div className="space-y-5">
          {/* Mandatory Accounting Rule Banner */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs font-bold text-amber-950 shadow-xs dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              وصول المبلغ لحساب المشرف ليس استلامًا للشركة، وتأكيد الاستلام لا
              يعيد تعبئة عهدة الشحن.
            </span>
          </div>

          {/* Create Remittance (Draft or Submit) from Supervisor Collection Sources */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  إنشاء سند توريد من تحصيلات المشرف للخزينة
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  حدد حركات التحصيل المراد توريدها للخزينة؛ يمكن حفظ الدفعة
                  كمسودة أولًا أو إنشاؤها وإرسالها للمحاسب مباشرة.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  void Promise.all([loadEvents(), loadPendingCollections()])
                }
                disabled={pendingLoading || eventsLoading}
              >
                <RefreshCw
                  className={`ml-1.5 h-3.5 w-3.5 ${pendingLoading ? "animate-spin" : ""}`}
                />
                تحديث التحصيلات والدفعات
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  المشرف المورِّد *
                </label>
                <SearchableSelect
                  options={supervisorOptions}
                  value={selectedSupervisorId}
                  onChange={(val) => {
                    setSelectedSupervisorId(val);
                    setPendingPage(1);
                  }}
                />
              </div>
              <DateInput
                label="تاريخ التوريد *"
                value={remitBusinessDate}
                onChange={setRemitBusinessDate}
              />
              <Input
                label="مرجع سند التوريد / التحويل البنكي *"
                value={remitEvidence}
                onChange={(e) => setRemitEvidence(e.target.value)}
                placeholder="رقم الحوالة أو سند القبض"
              />
            </div>

            {/* Pending Collection Sources Table */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--foreground)]">
                  المصادر والتحصيلات المعلقة القابلة للتوريد ({pendingSourcesTotal || remittableEvents.length})
                </h4>
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/95 dark:bg-slate-800/95 text-[11px] font-black text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">اختيار</th>
                      <th className="p-3">تاريخ الحركة</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">الحساب / المندوب</th>
                      <th className="p-3">المبلغ الأصلي</th>
                      <th className="p-3">المؤكد سابقًا</th>
                      <th className="p-3">المتبقي للتوريد</th>
                      <th className="p-3">المبلغ المراد توريده الآن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {remittableEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-8 text-center text-[var(--muted)]"
                        >
                          لا توجد حركات تحصيل قابلة للتوريد حاليًا لهذا المشرف.
                        </td>
                      </tr>
                    ) : (
                      remittableEvents.map((ev, idx) => {
                        const key =
                          (ev as HungerRemittanceSourceLineItem)
                            .sourceEventId ||
                          ev.id ||
                          ev.eventId ||
                          String(idx);
                        const checked =
                          selectedSourceAmounts[key] !== undefined;
                        const confirmedAmt = ev.confirmedAmount ?? 0;
                        const remainingAmt =
                          ev.remainingAmount ??
                          ev.remainingRemittableAmount ??
                          Math.max(0, (ev.amount || 0) - confirmedAmt);

                        return (
                          <tr key={key}>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRemittanceSource(ev)}
                                className="h-4 w-4 rounded border-slate-300 text-amber-500"
                              />
                            </td>
                            <td className="p-3">
                              {ev.businessDate?.slice(0, 10) || "—"}
                            </td>
                            <td className="p-3">
                              {getFinancialEventKindMeta(ev.kind).labelAr}
                            </td>
                            <td className="p-3">
                              {ev.externalAccountId ||
                                ev.riderNameAr ||
                                ev.evidenceReference ||
                                "—"}
                            </td>
                            <td className="p-3 font-bold" dir="ltr">
                              {Number(ev.amount || 0).toFixed(2)} SAR
                            </td>
                            <td
                              className="p-3 font-semibold text-emerald-600"
                              dir="ltr"
                            >
                              {Number(confirmedAmt).toFixed(2)} SAR
                            </td>
                            <td
                              className="p-3 font-bold text-amber-600"
                              dir="ltr"
                            >
                              {Number(remainingAmt).toFixed(2)} SAR
                            </td>
                            <td className="p-3">
                              {checked ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={selectedSourceAmounts[key]}
                                  onChange={(e) =>
                                    setSelectedSourceAmounts((prev) => ({
                                      ...prev,
                                      [key]: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  className="w-32 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs font-bold"
                                />
                              ) : (
                                <span className="text-[var(--muted)]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-bold text-[var(--foreground)]">
                إجمالي مبلغ سند التوريد المحدد:{" "}
                <span className="text-base text-emerald-600" dir="ltr">
                  {totalSelectedRemittanceAmount.toFixed(2)} SAR
                </span>
              </div>
              {canRemittanceSubmit && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleCreateRemittance(true)}
                    disabled={remitBusy || totalSelectedRemittanceAmount <= 0}
                  >
                    {remitBusy ? "جارٍ الحفظ..." : "حفظ كمسودة (Draft)"}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleCreateRemittance(false)}
                    disabled={remitBusy || totalSelectedRemittanceAmount <= 0}
                  >
                    <Send className="ml-1.5 h-3.5 w-3.5" />
                    {remitBusy
                      ? "جارٍ الإرسال..."
                      : "إنشاء وإرسال للمحاسب مباشرة"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Pending & Recent Remittance Batches Table */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  دفعات وسندات التوريد وتأكيدات استلام المحاسب ({pendingBatchesTotal || displayedRemittanceBatches.length})
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  متابعة دفعات التوريد (مسودة، مرسلة، مؤكدة جزئيًا، مؤكدة، ملغاة)
                  وتأكيد الاستلام الكلي أو الجزئي أو عكس التأكيد.
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/95 dark:bg-slate-800/95 text-[11px] font-black text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المشرف</th>
                    <th className="p-3">المرجع</th>
                    <th className="p-3">إجمالي الدفعة</th>
                    <th className="p-3">المؤكد استلامه</th>
                    <th className="p-3">المتبقي</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {displayedRemittanceBatches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-[var(--muted)]"
                      >
                        لا توجد دفعات توريد مسجلة حاليًا لهذا المشرف.
                      </td>
                    </tr>
                  ) : (
                    displayedRemittanceBatches.map((rem, i) => {
                      const remId = rem.remittanceId || rem.id || String(i);
                      const statusMeta = getRemittanceStatusMeta(rem.status);
                      const totalAmt = rem.totalAmount ?? 0;
                      const confirmedAmt =
                        rem.confirmedAmount ??
                        (rem.status === "Confirmed" ? totalAmt : 0);
                      const remainingAmt =
                        rem.remainingAmount ??
                        Math.max(0, totalAmt - confirmedAmt);
                      const hasEverBeenConfirmed =
                        confirmedAmt > 0 ||
                        Boolean(
                          rem.confirmations && rem.confirmations.length > 0,
                        ) ||
                        rem.status === "PartiallyConfirmed" ||
                        rem.status === "Confirmed";
                      const canCancelBatch =
                        canRemittanceCancelReverse &&
                        (rem.status === "Draft" ||
                          rem.status === "Submitted" ||
                          rem.status === "PendingConfirmation") &&
                        !hasEverBeenConfirmed;

                      return (
                        <tr key={remId}>
                          <td className="p-3 font-medium">
                            {rem.businessDate?.slice(0, 10) || "—"}
                          </td>
                          <td className="p-3 font-semibold">
                            {rem.supervisorNameAr || "مشرف هنقرستيشن"}
                          </td>
                          <td className="p-3 text-[var(--muted)]">
                            {rem.evidenceReference || "—"}
                          </td>
                          <td className="p-3 font-extrabold" dir="ltr">
                            {Number(totalAmt).toFixed(2)} SAR
                          </td>
                          <td
                            className="p-3 font-bold text-emerald-600"
                            dir="ltr"
                          >
                            {Number(confirmedAmt).toFixed(2)} SAR
                          </td>
                          <td
                            className="p-3 font-bold text-amber-600"
                            dir="ltr"
                          >
                            {Number(remainingAmt).toFixed(2)} SAR
                          </td>
                          <td className="p-3">
                            <Badge tone={statusMeta.badgeTone}>
                              {statusMeta.labelAr}
                            </Badge>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {rem.status === "Draft" && canRemittanceSubmit && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setSubmitDraftTarget(rem);
                                    setSubmitDraftDate(getRiyadhTodayIso());
                                    setSubmitDraftEvidence(
                                      rem.evidenceReference || "",
                                    );
                                  }}
                                >
                                  <Send className="ml-1 h-3 w-3" />
                                  إرسال للمحاسب
                                </Button>
                              )}

                              {rem.status !== "Confirmed" &&
                                rem.status !== "Cancelled" &&
                                rem.status !== "Draft" &&
                                canConfirmRemittance && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() =>
                                      openAccountantConfirmModal(rem)
                                    }
                                  >
                                    <ShieldCheck className="ml-1 h-3.5 w-3.5" />
                                    تأكيد استلام المحاسب
                                  </Button>
                                )}

                              {canCancelBatch && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setCancelOrReverseModal({
                                      mode: "cancel-batch",
                                      targetId: remId,
                                      label: `دفعة التوريد (${rem.evidenceReference || remId.slice(0, 8)})`,
                                    });
                                    setCancelReverseDate(getRiyadhTodayIso());
                                    setCancelReverseEvidence("");
                                    setCancelReverseReason("");
                                  }}
                                >
                                  <XCircle className="ml-1 h-3 w-3 text-rose-600" />
                                  إلغاء الدفعة
                                </Button>
                              )}

                              {canRemittanceCancelReverse &&
                                rem.confirmations &&
                                rem.confirmations
                                  .filter((c) => !c.isReversed)
                                  .map((c) => {
                                    const cId =
                                      c.confirmationId || c.id || "";
                                    if (!cId) return null;
                                    return (
                                      <Button
                                        key={cId}
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                          setCancelOrReverseModal({
                                            mode: "reverse-confirmation",
                                            targetId: cId,
                                            label: `تأكيد استلام (${Number(c.amount || 0).toFixed(2)} SAR)`,
                                          });
                                          setCancelReverseDate(
                                            getRiyadhTodayIso(),
                                          );
                                          setCancelReverseEvidence("");
                                          setCancelReverseReason("");
                                        }}
                                      >
                                        <RotateCcw className="ml-1 h-3 w-3 text-amber-600" />
                                        عكس التأكيد ({Number(c.amount || 0).toFixed(0)})
                                      </Button>
                                    );
                                  })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Pending Collections */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
              <div>
                الصفحة {pendingPage} — عرض {pendingPageSize} لكل صفحة
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pendingPageSize}
                  onChange={(e) => {
                    setPendingPageSize(Number(e.target.value) || 25);
                    setPendingPage(1);
                  }}
                  className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                >
                  <option value={10}>10 / صفحة</option>
                  <option value={25}>25 / صفحة</option>
                  <option value={50}>50 / صفحة</option>
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pendingPage <= 1 || pendingLoading}
                  onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                >
                  السابق
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={
                    pendingLoading ||
                    (pendingBatches.length < pendingPageSize &&
                      pendingSources.length < pendingPageSize)
                  }
                  onClick={() => setPendingPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: Settlement Documents (`Invoice` / `MonthClose` / `Adjustment`)
         ===================================================================== */}
      {activeTab === "settlements" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  شهر التسوية
                </label>
                <input
                  type="month"
                  value={settlementMonth}
                  onChange={(e) => setSettlementMonth(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div className="min-w-[260px]">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  تصفية بحساب محدد (اختياري)
                </label>
                <SearchableSelect
                  options={[
                    { value: "", label: "جميع الحسابات" },
                    ...accountOptions,
                  ]}
                  value={settlementFilterAccountId}
                  onChange={setSettlementFilterAccountId}
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => void loadSettlementDocuments()}
                disabled={settlementsLoading}
              >
                <RefreshCw
                  className={`ml-1.5 h-3.5 w-3.5 ${settlementsLoading ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
            </div>

            {canManageSettlements && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setDocModalOpen(true)}
              >
                <Plus className="ml-1.5 h-3.5 w-3.5" />
                تسجيل مستند تسوية / فاتورة / تعديل
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/95 dark:bg-slate-800/95 text-[11px] font-black text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">الشهر</th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-start gap-1.5">
                      <span>نوع المستند</span>
                      <TableHeaderColumnFilter
                        label="نوع المستند"
                        value={colFilterDocKind}
                        onChange={setColFilterDocKind}
                        options={docKindColOptions}
                        placeholder="تصفية بنوع المستند..."
                        align="right"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">رقم المستند</th>
                  <th className="px-4 py-3 whitespace-nowrap">المصدر (للتعديلات)</th>
                  <th className="px-4 py-3 whitespace-nowrap">الحساب</th>
                  <th className="px-4 py-3 whitespace-nowrap">المبلغ</th>
                  <th className="px-4 py-3 whitespace-nowrap">مرجع الإثبات</th>
                  <th className="px-4 py-3 whitespace-nowrap">حالة المطابقة</th>
                  <th className="px-4 py-3 whitespace-nowrap">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {settlementsLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-[var(--muted)]"
                    >
                      جارٍ تحميل مستندات التسوية...
                    </td>
                  </tr>
                ) : filteredSettlementDocs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-[var(--muted)]"
                    >
                      لا توجد مستندات تسوية مسجلة لهذا الشهر.
                    </td>
                  </tr>
                ) : (
                  filteredSettlementDocs.map((doc, idx) => {
                    const kindLabel =
                      HUNGER_SETTLEMENT_DOCUMENT_KINDS.find(
                        (k) => k.value === doc.kind,
                      )?.labelAr || doc.kind;
                    const recStatus =
                      doc.reconciliationStatus ||
                      (doc.kind === "Adjustment" ? "Unmatched" : "Matched");
                    const isUnmatchedAdjustment =
                      doc.kind === "Adjustment" &&
                      (recStatus.toLowerCase() === "unmatched" ||
                        !doc.closingSnapshotId);

                    return (
                      <tr
                        key={doc.id || doc.documentId || idx}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3">
                          {doc.month?.slice(0, 7) || "—"}
                        </td>
                        <td className="px-4 py-3 font-bold">{kindLabel}</td>
                        <td className="px-4 py-3 font-semibold">
                          {doc.documentReference}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-[var(--muted)]">
                          {doc.sourceDocumentType || doc.sourceReference ? (
                            <span>
                              {doc.sourceDocumentType || "مصدر"}:{" "}
                              {doc.sourceReference || "—"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {doc.externalAccountId ||
                            doc.accountName ||
                            "على مستوى المنصة"}
                        </td>
                        <td className="px-4 py-3 font-extrabold" dir="ltr">
                          {Number(doc.amount || 0).toFixed(2)} SAR
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {doc.evidenceReference}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={isUnmatchedAdjustment ? "orange" : "green"}
                          >
                            {isUnmatchedAdjustment
                              ? "غير مطابق (Unmatched)"
                              : recStatus === "Matched" ||
                                  recStatus === "Reconciled"
                                ? "مطابق (Matched)"
                                : recStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isUnmatchedAdjustment && canManageSettlements && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setReconcileTargetDoc(doc);
                                setReconcileSnapshotId(
                                  doc.closingSnapshotId || "",
                                );
                                setReconcileEvidence(
                                  doc.evidenceReference || "",
                                );
                              }}
                            >
                              <Link2 className="ml-1 h-3 w-3" />
                              مطابقة
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: Supervisor Accounting Configuration (`hunger.finance.configure`)
         ===================================================================== */}
      {activeTab === "configuration" && canConfigureFinance && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="mb-4 border-b border-[var(--border)] pb-4">
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              اعتماد تهيئة الحسابات المحاسبية لمشرف هنقرستيشن
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              ربط المشرف والكفيل بحسابات الخزينة الفرعية الأربعة (العهدة،
              التحصيلات، المحفظة، وتصفية المناديب).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                المشرف المسؤول *
              </label>
              <SearchableSelect
                options={supervisorOptions}
                value={cfgSupervisorId}
                onChange={setCfgSupervisorId}
                placeholder="اختر المشرف..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                الكفيل / المنشأة *
              </label>
              <SearchableSelect
                options={sponsorOptions}
                value={cfgSponsorId}
                onChange={setCfgSponsorId}
                placeholder="اختر الكفيل..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                1. حساب عهدة المشرف (Custody Sub-Account) *
              </label>
              <SearchableSelect
                options={subAccountOptions}
                value={cfgCustodySubId}
                onChange={setCfgCustodySubId}
                placeholder="اختر حساب العهدة..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                2. حساب التحصيلات (Collections Sub-Account) *
              </label>
              <SearchableSelect
                options={subAccountOptions}
                value={cfgCollectionsSubId}
                onChange={setCfgCollectionsSubId}
                placeholder="اختر حساب التحصيلات..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                3. حساب محفظة المنصة (Wallet Sub-Account) *
              </label>
              <SearchableSelect
                options={subAccountOptions}
                value={cfgWalletSubId}
                onChange={setCfgWalletSubId}
                placeholder="اختر حساب المحفظة..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                4. حساب تسوية المناديب (Rider Clearing Sub-Account) *
              </label>
              <SearchableSelect
                options={subAccountOptions}
                value={cfgRiderClearingSubId}
                onChange={setCfgRiderClearingSubId}
                placeholder="اختر حساب تسوية المناديب..."
              />
            </div>

            <Input
              label="مرجع قرار الاعتماد المحاسبي *"
              value={cfgEvidence}
              onChange={(e) => setCfgEvidence(e.target.value)}
              placeholder="رقم قرار الإدارة المالية..."
            />

            <div className="flex items-center gap-2 pt-6">
              <input
                id="cfg-active"
                type="checkbox"
                checked={cfgIsActive}
                onChange={(e) => setCfgIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-amber-500"
              />
              <label
                htmlFor="cfg-active"
                className="text-xs font-semibold text-[var(--foreground)]"
              >
                التهيئة نشطة ومعتمدة للتشغيل المالي
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => void handleSaveConfiguration()}
              disabled={cfgBusy}
            >
              {cfgBusy
                ? "جارٍ الحفظ والاعتماد..."
                : "حفظ واعتماد تهيئة حسابات المشرف"}
            </Button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: Create Financial Event / Request / Withdrawal
         ===================================================================== */}
      <Modal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title="تسجيل حركة أو طلب مالي جديد (محفظة / عهدة / تحصيل / سحب)"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                نوع الحركة المالية *
              </label>
              <select
                value={eventKind}
                onChange={(e) =>
                  handleChangeEventKind(
                    e.target.value as HungerFinancialEventKind,
                  )
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium"
              >
                {allowedFinancialEventKinds.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.labelAr}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="المبلغ (SAR) *"
              type="number"
              step="0.01"
              value={eventAmount}
              onChange={(e) => setEventAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Section 5: Request vs Execute selector for Funding & Top-ups */}
          {isFundingOrTopupKind && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3">
              <label className="mb-2 block text-xs font-bold text-[var(--foreground)]">
                طريقة المعالجة (الطلب مقابل التنفيذ المباشر)
              </label>
              <div className="flex flex-wrap gap-3 text-xs">
                {((eventKind === "Funding" && canFundingRequest) ||
                  (eventKind !== "Funding" && canTopupRequest)) && (
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="eventExecMode"
                      checked={eventExecutionMode === "Request"}
                      onChange={() => setEventExecutionMode("Request")}
                      className="text-amber-500"
                    />
                    <span>
                      طلب فقط (Requested — يحفظ بدون قيد محاسبي لحين التنفيذ)
                    </span>
                  </label>
                )}
                {((eventKind === "Funding" && canFundingExecute) ||
                  (eventKind !== "Funding" && canTopupExecute)) && (
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="eventExecMode"
                      checked={eventExecutionMode === "Execute"}
                      onChange={() => setEventExecutionMode("Execute")}
                      className="text-amber-500"
                    />
                    <span>تنفيذ مباشر (Execute — ترحيل محاسبي فوري)</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Withdrawal-specific required fields */}
          {isWithdrawalKind && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                بيانات السحب الإلزامية (حالة السحب تبدأ بـ «انتظار الوصول»)
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                لا يتم ترحيل المبلغ إلى حساب الوجهة إلا بعد تأكيد وصول السحب
                فعليًا.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="رصيد المحفظة المصدر قبل السحب *"
                  type="number"
                  step="0.01"
                  value={withdrawalSourceWalletBalance}
                  onChange={(e) =>
                    setWithdrawalSourceWalletBalance(e.target.value)
                  }
                  placeholder="مثال: 5000.00"
                />

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                    نوع الوجهة المستلمة *
                  </label>
                  <select
                    value={withdrawalDestinationType}
                    onChange={(e) => {
                      const nextType = e.target.value as
                        | "Company"
                        | "Supervisor";
                      setWithdrawalDestinationType(nextType);
                      setWithdrawalDestinationOwnerId(
                        nextType === "Supervisor" ? selectedSupervisorId : "",
                      );
                    }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                  >
                    <option value="Company">حساب الشركة / الكفيل (Company)</option>
                    <option value="Supervisor">حساب المشرف (Supervisor)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                    {withdrawalDestinationType === "Company"
                      ? "الكفيل / المنشأة المستلمة (destinationOwnerId) *"
                      : "المشرف المستلم (destinationOwnerId) *"}
                  </label>
                  <SearchableSelect
                    options={
                      withdrawalDestinationType === "Company"
                        ? sponsorOptions
                        : supervisorOptions
                    }
                    value={withdrawalDestinationOwnerId}
                    onChange={setWithdrawalDestinationOwnerId}
                    placeholder={
                      withdrawalDestinationType === "Company"
                        ? "اختر الكفيل..."
                        : "اختر المشرف..."
                    }
                  />
                </div>

                <Input
                  label="مرجع التحويل البنكي للسحب (transferReference) *"
                  value={withdrawalTransferRef}
                  onChange={(e) => setWithdrawalTransferRef(e.target.value)}
                  placeholder="رقم الحوالة / العملية البنكية"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={withdrawalAgainstReservedRights}
                    onChange={(e) =>
                      setWithdrawalAgainstReservedRights(e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-amber-500"
                  />
                  <span>
                    سحب مقابل حقوق محفوظة (يتطلب ربطه بحركة إخلاء المحفظة
                    WalletReturn)
                  </span>
                </label>
                <span className="text-[11px] text-[var(--muted)]">
                  تاريخ التحويل (transferDate): مطابق للتاريخ المالي ({eventBusinessDate})
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                حساب هنقرستيشن (اختياري)
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: "بدون حساب محدد" },
                  ...accountOptions,
                ]}
                value={eventAccountId}
                onChange={setEventAccountId}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                المندوب (اختياري)
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: "بدون مندوب محدد" },
                  ...riderOptions,
                ]}
                value={eventRiderId}
                onChange={setEventRiderId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                حساب الخزينة المقابل {isWithdrawalKind ? "*" : "(للتمويل / السحب)"}
              </label>
              <SearchableSelect
                options={[
                  ...(isWithdrawalKind
                    ? []
                    : [{ value: "", label: "افتراضي حسب تهيئة المشرف" }]),
                  ...subAccountOptions,
                ]}
                value={eventCounterSubAccountId}
                onChange={setEventCounterSubAccountId}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                {isWithdrawalKind && withdrawalAgainstReservedRights
                  ? "حركة إخلاء المحفظة المرتبطة (WalletReturn) *"
                  : "ربط بحركة سابقة (مثل سلفة شحن)"}
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: "بدون ربط بحركة سابقة" },
                  ...(isWithdrawalKind && withdrawalAgainstReservedRights
                    ? walletReturnEventOptions
                    : relatedEventOptions),
                ]}
                value={eventRelatedEventId}
                onChange={setEventRelatedEventId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateInput
              label="التاريخ المالي *"
              value={eventBusinessDate}
              onChange={setEventBusinessDate}
            />

            <Input
              label="مرجع السند / الإثبات المالي *"
              value={eventEvidence}
              onChange={(e) => setEventEvidence(e.target.value)}
              placeholder="رقم السند أو إيصال التحويل"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setEventModalOpen(false)}
              disabled={eventBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCreateFinancialEvent()}
              disabled={eventBusy}
            >
              {eventBusy
                ? "جارٍ الحفظ..."
                : isFundingOrTopupKind && eventExecutionMode === "Request"
                  ? "حفظ الطلب المالي (Requested)"
                  : "حفظ وتنفيذ الحركة المالية"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 1B: Confirm Withdrawal Arrival or Cancel Withdrawal
         ===================================================================== */}
      <Modal
        isOpen={Boolean(withdrawalActionModal)}
        onClose={() => setWithdrawalActionModal(null)}
        title={
          withdrawalActionModal?.mode === "confirm-arrival"
            ? "تأكيد وصول مبلغ السحب إلى حساب الوجهة"
            : "إلغاء حركة السحب (PendingArrival)"
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs">
            <div>
              المبلغ:{" "}
              <strong dir="ltr">
                {Number(withdrawalActionModal?.event.amount || 0).toFixed(2)}{" "}
                SAR
              </strong>
            </div>
            <div className="mt-1 text-[var(--muted)]">
              {withdrawalActionModal?.mode === "confirm-arrival"
                ? "بتأكيد الوصول يتم ترحيل المبلغ محاسبيًا إلى حساب الوجهة المستلمة."
                : "بإلغاء السحب يتم إيقاف الحركة قبل وصولها لحساب الوجهة."}
            </div>
          </div>

          <DateInput
            label="التاريخ المالي *"
            value={withdrawalActionDate}
            onChange={setWithdrawalActionDate}
          />

          <Input
            label="مرجع الإثبات *"
            value={withdrawalActionEvidence}
            onChange={(e) => setWithdrawalActionEvidence(e.target.value)}
            placeholder="رقم كشف البنك أو مرجع الإلغاء"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setWithdrawalActionModal(null)}
              disabled={withdrawalActionBusy}
            >
              تراجع
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleConfirmOrCancelWithdrawal()}
              disabled={withdrawalActionBusy}
            >
              {withdrawalActionBusy
                ? "جارٍ التنفيذ..."
                : withdrawalActionModal?.mode === "confirm-arrival"
                  ? "تأكيد وصول السحب"
                  : "تأكيد إلغاء السحب"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 2A: Submit Draft Remittance
         ===================================================================== */}
      <Modal
        isOpen={Boolean(submitDraftTarget)}
        onClose={() => setSubmitDraftTarget(null)}
        title="إرسال مسودة سند التوريد إلى المحاسب"
      >
        <div className="space-y-4">
          <DateInput
            label="تاريخ الإرسال المالي *"
            value={submitDraftDate}
            onChange={setSubmitDraftDate}
          />
          <Input
            label="مرجع الإثبات / التحويل *"
            value={submitDraftEvidence}
            onChange={(e) => setSubmitDraftEvidence(e.target.value)}
            placeholder="رقم إيصال الإيداع أو الحوالة"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setSubmitDraftTarget(null)}
              disabled={submitDraftBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSubmitRemittanceDraft()}
              disabled={submitDraftBusy}
            >
              {submitDraftBusy ? "جارٍ الإرسال..." : "إرسال للمحاسب"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 2B: Accountant Confirm Remittance (3 Confirmation Modes)
         ===================================================================== */}
      <Modal
        isOpen={confirmRemitModalOpen}
        onClose={() => setConfirmRemitModalOpen(false)}
        title="تأكيد المحاسب لاستلام سند التوريد"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            وصول المبلغ لحساب المشرف ليس استلامًا للشركة، وتأكيد الاستلام لا
            يعيد تعبئة عهدة الشحن.
          </div>

          {/* Confirmation Mode Selector */}
          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3">
            <label className="block text-xs font-bold text-[var(--foreground)]">
              نطاق تأكيد الاستلام
            </label>
            <div className="flex flex-col gap-2 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="remitConfirmMode"
                  checked={confirmMode === "all_remaining"}
                  onChange={() => setConfirmMode("all_remaining")}
                  className="text-amber-500"
                />
                <span>تأكيد كامل المبلغ المتبقي لجميع مصادر الدفعة</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="remitConfirmMode"
                  checked={confirmMode === "selected_sources"}
                  onChange={() => setConfirmMode("selected_sources")}
                  className="text-amber-500"
                />
                <span>
                  تأكيد كامل المتبقي لمصادر محددة فقط (selectedSourceIds)
                </span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="remitConfirmMode"
                  checked={confirmMode === "partial_amounts"}
                  onChange={() => setConfirmMode("partial_amounts")}
                  className="text-amber-500"
                />
                <span>تأكيد مبالغ جزئية مخصصة لكل مصدر (sources)</span>
              </label>
            </div>

            {confirmMode !== "all_remaining" &&
              targetRemittance?.sources &&
              targetRemittance.sources.length > 0 && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-2">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                        <th className="p-1.5">المصدر</th>
                        <th className="p-1.5">الأصلي</th>
                        <th className="p-1.5">المتبقي</th>
                        <th className="p-1.5">
                          {confirmMode === "selected_sources"
                            ? "تحديد"
                            : "مبلغ التأكيد"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {targetRemittance.sources.map((src) => {
                        const remAmt =
                          src.remainingAmount ??
                          Math.max(
                            0,
                            (src.amount || 0) - (src.confirmedAmount || 0),
                          );
                        const isChecked = confirmSelectedSourceIds.includes(
                          src.sourceEventId,
                        );
                        return (
                          <tr key={src.sourceEventId}>
                            <td className="p-1.5 font-mono">
                              {src.sourceEventId.slice(0, 8)}...
                            </td>
                            <td className="p-1.5" dir="ltr">
                              {Number(src.amount || 0).toFixed(2)}
                            </td>
                            <td className="p-1.5 font-bold" dir="ltr">
                              {Number(remAmt).toFixed(2)}
                            </td>
                            <td className="p-1.5">
                              {confirmMode === "selected_sources" ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setConfirmSelectedSourceIds((prev) =>
                                      isChecked
                                        ? prev.filter(
                                            (id) => id !== src.sourceEventId,
                                          )
                                        : [...prev, src.sourceEventId],
                                    )
                                  }
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-amber-500"
                                />
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={
                                    confirmPartialAmounts[src.sourceEventId] ??
                                    ""
                                  }
                                  onChange={(e) =>
                                    setConfirmPartialAmounts((prev) => ({
                                      ...prev,
                                      [src.sourceEventId]: e.target.value,
                                    }))
                                  }
                                  className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[11px] font-bold"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                حساب الخزينة المستلم الفعلي (اختياري)
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: "الحساب الافتراضي للخزينة" },
                  ...subAccountOptions,
                ]}
                value={confirmDestSubAccountId}
                onChange={setConfirmDestSubAccountId}
                placeholder="اختر حساب الخزينة أو البنك المستلم..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                نوع الوجهة المستلمة (اختياري)
              </label>
              <select
                value={confirmDestType}
                onChange={(e) =>
                  setConfirmDestType(
                    e.target.value as "" | "Company" | "Supervisor",
                  )
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium"
              >
                <option value="">افتراضي (حساب الشركة)</option>
                <option value="Company">الشركة / الكفيل (Company)</option>
                <option value="Supervisor">المشرف (Supervisor)</option>
              </select>
            </div>
          </div>

          {confirmDestType && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                {confirmDestType === "Company"
                  ? "الكفيل المستلم (destinationOwnerId)"
                  : "المشرف المستلم (destinationOwnerId)"}
              </label>
              <SearchableSelect
                options={
                  confirmDestType === "Company"
                    ? sponsorOptions
                    : supervisorOptions
                }
                value={confirmDestOwnerId}
                onChange={setConfirmDestOwnerId}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateInput
              label="تاريخ الاستلام الفعلي *"
              value={confirmBusinessDate}
              onChange={setConfirmBusinessDate}
            />

            <Input
              label="مرجع الإثبات المحاسبي *"
              value={confirmEvidence}
              onChange={(e) => setConfirmEvidence(e.target.value)}
              placeholder="رقم قيد الخزينة أو كشف البنك"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmRemitModalOpen(false)}
              disabled={confirmBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleConfirmRemittanceReceipt()}
              disabled={confirmBusy}
            >
              {confirmBusy ? "جارٍ التأكيد..." : "تأكيد استلام التوريد"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 2C: Cancel Remittance Batch / Reverse Receipt Confirmation
         ===================================================================== */}
      <Modal
        isOpen={Boolean(cancelOrReverseModal)}
        onClose={() => setCancelOrReverseModal(null)}
        title={
          cancelOrReverseModal?.mode === "cancel-batch"
            ? `إلغاء ${cancelOrReverseModal.label}`
            : `عكس ${cancelOrReverseModal?.label || "تأكيد الاستلام"}`
        }
      >
        <div className="space-y-4">
          <DateInput
            label="التاريخ المالي *"
            value={cancelReverseDate}
            onChange={setCancelReverseDate}
          />
          <Input
            label="السبب الإلزامي (reason) *"
            value={cancelReverseReason}
            onChange={(e) => setCancelReverseReason(e.target.value)}
            placeholder="اكتب سبب الإلغاء أو عكس التأكيد..."
          />
          <Input
            label="مرجع الإثبات *"
            value={cancelReverseEvidence}
            onChange={(e) => setCancelReverseEvidence(e.target.value)}
            placeholder="رقم السند أو المرجع المحاسبي"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setCancelOrReverseModal(null)}
              disabled={cancelReverseBusy}
            >
              تراجع
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCancelBatchOrReverseConfirmation()}
              disabled={cancelReverseBusy}
            >
              {cancelReverseBusy
                ? "جارٍ التنفيذ..."
                : cancelOrReverseModal?.mode === "cancel-batch"
                  ? "تأكيد إلغاء الدفعة"
                  : "تأكيد عكس الاستلام"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 3A: Register Settlement Document (Invoice / MonthClose / Adjustment)
         ===================================================================== */}
      <Modal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="تسجيل مستند تسوية / فاتورة / إقفال شهري / تعديل"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                نوع المستند *
              </label>
              <select
                value={docKind}
                onChange={(e) =>
                  setDocKind(e.target.value as HungerSettlementDocumentKind)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-medium"
              >
                {HUNGER_SETTLEMENT_DOCUMENT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.labelAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                الشهر المالي *
              </label>
              <input
                type="month"
                value={docMonth}
                onChange={(e) => setDocMonth(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Section 7: Adjustment required fields */}
          {docKind === "Adjustment" && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                بيانات المصدر ومستند الإقفال لتسوية الفرق (Adjustment)
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="نوع المستند المصدر (sourceDocumentType) *"
                  value={docSourceDocumentType}
                  onChange={(e) => setDocSourceDocumentType(e.target.value)}
                  placeholder="مثال: StatementAdjustment أو CreditNote"
                />
                <Input
                  label="رقم مرجع المصدر (sourceReference) *"
                  value={docSourceReference}
                  onChange={(e) => setDocSourceReference(e.target.value)}
                  placeholder="معرف السطر أو الإشعار في الكشف"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  مستند الإقفال الشهري المرتبط (closingSnapshotId) *
                </label>
                <SearchableSelect
                  options={monthCloseDocOptions}
                  value={docClosingSnapshotId}
                  onChange={setDocClosingSnapshotId}
                  placeholder="اختر مستند الإقفال الشهري (MonthClose)..."
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              الحساب المرتبط (أو اتركه فارغًا للتسوية العامة على المنصة)
            </label>
            <SearchableSelect
              options={[
                { value: "", label: "تسوية عامة على مستوى منصة هنقرستيشن" },
                ...accountOptions,
              ]}
              value={docAccountId}
              onChange={setDocAccountId}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="رقم المستند / الفاتورة *"
              value={docReference}
              onChange={(e) => setDocReference(e.target.value)}
              placeholder="مثال: INV-2026-1104"
            />
            <Input
              label="مبلغ المستند (SAR) *"
              type="number"
              step="0.01"
              value={docAmount}
              onChange={(e) => setDocAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateInput
              label="تاريخ المستند *"
              value={docBusinessDate}
              onChange={setDocBusinessDate}
            />
            <Input
              label="مرجع المرفق / الإثبات *"
              value={docEvidence}
              onChange={(e) => setDocEvidence(e.target.value)}
              placeholder="رابط أو رقم مرفق الفاتورة"
            />
          </div>

          <Input
            label="ملاحظات إضافية"
            value={docNotes}
            onChange={(e) => setDocNotes(e.target.value)}
            placeholder="أي تفاصيل حول مطابقة المستند..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDocModalOpen(false)}
              disabled={docBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCreateSettlementDoc()}
              disabled={docBusy}
            >
              {docBusy ? "جارٍ الحفظ..." : "تسجيل المستند"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 3B: Reconcile Unmatched Settlement Adjustment
         ===================================================================== */}
      <Modal
        isOpen={Boolean(reconcileTargetDoc)}
        onClose={() => setReconcileTargetDoc(null)}
        title={`مطابقة مستند تسوية — ${reconcileTargetDoc?.documentReference || ""}`}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              مستند الإقفال الشهري (closingSnapshotId) *
            </label>
            <SearchableSelect
              options={monthCloseDocOptions}
              value={reconcileSnapshotId}
              onChange={setReconcileSnapshotId}
              placeholder="اختر مستند الإقفال الشهري (MonthClose)..."
            />
          </div>

          <Input
            label="مرجع إثبات المطابقة *"
            value={reconcileEvidence}
            onChange={(e) => setReconcileEvidence(e.target.value)}
            placeholder="رقم محضر المطابقة أو المرفق"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setReconcileTargetDoc(null)}
              disabled={reconcileBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleReconcileAdjustment()}
              disabled={reconcileBusy}
            >
              {reconcileBusy ? "جارٍ المطابقة..." : "تأكيد المطابقة"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
