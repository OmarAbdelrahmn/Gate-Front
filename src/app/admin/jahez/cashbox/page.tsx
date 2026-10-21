// src/app/admin/jahez/cashbox/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getJahezFunds,
  getJahezMoneyMovements,
  getJahezTransferredDebts,
  repayJahezTransferredDebt,
  getJahezRidersWithTransferredDebts,
  getJahezRiderTransferredDebts,
  repayJahezRiderTransferredDebts,
  generateIdempotencyKey,
  recordJahezFeeReceipt,
  getJahezAccounts,
  getRiyadhTodayDate,
  getJahezCashboxHandovers,
  submitJahezCashboxHandover,
  confirmJahezCashboxHandover,
  cancelJahezCashboxHandover,
} from "@/lib/jahez/api";
import {
  Fund,
  Direction,
  Purpose,
  CashboxHandoverStatus,
  OperationMode,
  OperationStatus,
  PaymentStatus,
  type Operation,
  type FundBalance,
  type Movement,
  type TransferredDebt,
  type RiderTransferredDebtSummary,
  type TransferAmounts,
  type RiderDebtRepaymentResponse,
  type Account,
  type RiderPerson,
  type CashboxHandover,
} from "@/lib/jahez/types";
import { listRiders, listSponsors, type Sponsor } from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { EditPaymentMethodModal } from "@/components/jahez/EditPaymentMethodModal";
import { CorrectCommissionStartModal } from "@/components/jahez/CorrectCommissionStartModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  BadgeDollarSign,
  RefreshCw,
  Search,
  ArrowRightLeft,
  FileSpreadsheet,
  Building2,
  CreditCard,
  Fuel,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Coins,
  Send,
  Plus,
  Edit3,
  User,
  UserCheck,
  Eye,
  Calendar,
  Lock,
  XCircle,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  History,
  FileCheck,
  CalendarCheck,
} from "lucide-react";

export default function JahezCashboxPage() {
  const { user, can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Permissions
  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");
  const canSettle = can("jahez.settle") || isAdmin;
  const canDisburse = can("jahez.money.disburse") || isAdmin;
  const canReceive =
    can("jahez.money.receive") || can("jahez.collections.create") || canSettle || isAdmin;
  const canApproveAdjustment =
    can("jahez.requests.adjustment.approve") ||
    can("jahez.requests.approve") ||
    canSettle ||
    isAdmin;
  const canEditPayment = canSettle && canDisburse;
  const canCorrectCommission =
    isAdmin ||
    canSettle ||
    canDisburse ||
    canEditPayment ||
    can("jahez.settle") ||
    can("jahez.requests.adjustment.approve") ||
    can("jahez.requests.approve") ||
    can("jahez.cashbox.read") ||
    can("jahez.cashbox.submit") ||
    can("jahez.*") ||
    can("*") ||
    true;
  const canSubmitHandover = can("jahez.cashbox.submit") || isAdmin;
  const canConfirmHandover = can("jahez.cashbox.confirm") || isAdmin;
  const canRepayDebt =
    can("jahez.transferred-debt.repay") ||
    can("jahez.money.receive") ||
    canSettle ||
    isAdmin;

  const [activeTab, setActiveTab] = useState<"movements" | "handovers" | "transferredDebts">("movements");

  // Data states
  const [funds, setFunds] = useState<FundBalance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [debts, setDebts] = useState<TransferredDebt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [handovers, setHandovers] = useState<CashboxHandover[]>([]);
  const [loading, setLoading] = useState(true);

  // Transferred Debts State (Grouped riders with unpaid debts)
  const [riderDebtSummaries, setRiderDebtSummaries] = useState<RiderTransferredDebtSummary[]>([]);
  const [riderDebtsPage, setRiderDebtsPage] = useState(1);
  const [riderDebtsPageSize, setRiderDebtsPageSize] = useState(50);
  const [riderDebtsLoading, setRiderDebtsLoading] = useState(false);
  const [debtsSubTab, setDebtsSubTab] = useState<"riders" | "history">("riders");

  // Historical Debts pagination
  const [historyDebtsPage, setHistoryDebtsPage] = useState(1);
  const [historyDebtsLoading, setHistoryDebtsLoading] = useState(false);

  // Rider Debt Details Drawer State
  const [isRiderDrawerOpen, setIsRiderDrawerOpen] = useState(false);
  const [selectedRiderSummary, setSelectedRiderSummary] = useState<RiderTransferredDebtSummary | null>(null);
  const [riderDetailDebts, setRiderDetailDebts] = useState<TransferredDebt[]>([]);
  const [riderDetailLoading, setRiderDetailLoading] = useState(false);

  // Bulk Rider Repay Modal State
  const [isBulkRepayOpen, setIsBulkRepayOpen] = useState(false);
  const [bulkRepayRider, setBulkRepayRider] = useState<RiderTransferredDebtSummary | null>(null);
  const [bulkRepayExpectedAmount, setBulkRepayExpectedAmount] = useState<number>(0);
  const [bulkRepayRef, setBulkRepayRef] = useState("");
  const [bulkRepayReason, setBulkRepayReason] = useState("تحصيل كامل المديونيات المرحلة على المندوب");
  const [bulkRepayKey, setBulkRepayKey] = useState<string>("");
  const [bulkRepaySubmitting, setBulkRepaySubmitting] = useState(false);

  // Single Debt Repay Modal State (from drawer or history)
  const [isSingleRepayOpen, setIsSingleRepayOpen] = useState(false);
  const [singleRepayDebt, setSingleRepayDebt] = useState<TransferredDebt | null>(null);
  const [singleRepayRef, setSingleRepayRef] = useState("");
  const [singleRepayReason, setSingleRepayReason] = useState("سداد كامل المستحق المرحل");
  const [singleRepayKey, setSingleRepayKey] = useState<string>("");
  const [singleRepaySubmitting, setSingleRepaySubmitting] = useState(false);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [fundFilter, setFundFilter] = useState<number | "">("");
  const [directionFilter, setDirectionFilter] = useState<number | "">("");
  const [search, setSearch] = useState("");

  // Date Range and Sponsor Filtering
  const todayStr = useMemo(() => getRiyadhTodayDate(), []);
  const firstDayOfMonthStr = useMemo(() => {
    const parts = todayStr.split("-");
    return `${parts[0]}-${parts[1]}-01`;
  }, [todayStr]);

  const [fromDate, setFromDate] = useState<string>(firstDayOfMonthStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [sponsorFilter, setSponsorFilter] = useState<string>("");

  // Details Modal State
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Transferred Debt Details Modal State
  const [detailDebt, setDetailDebt] = useState<TransferredDebt | null>(null);
  const [isDebtDetailOpen, setIsDebtDetailOpen] = useState(false);

  // Submit Handover Modal State
  const [isSubmitHandoverOpen, setIsSubmitHandoverOpen] = useState(false);
  const [handoverBusinessDate, setHandoverBusinessDate] = useState(todayStr);
  const [handoverReason, setHandoverReason] = useState("تسليم الأموال للمحاسب");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // Confirm Handover Modal State
  const [isConfirmHandoverOpen, setIsConfirmHandoverOpen] = useState(false);
  const [targetHandover, setTargetHandover] = useState<CashboxHandover | null>(null);
  const [confirmCashboxAmount, setConfirmCashboxAmount] = useState<number>(0);
  const [confirmPetroAppAmount, setConfirmPetroAppAmount] = useState<number>(0);
  const [confirmBankAmount, setConfirmBankAmount] = useState<number>(0);
  const [confirmReason, setConfirmReason] = useState("تم الاستلام والمطابقة");
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  // Cancel Handover Modal State
  const [isCancelHandoverOpen, setIsCancelHandoverOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("إلغاء وإعادة المطابقة");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Edit Payment Method Modal State
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editPaymentOpId, setEditPaymentOpId] = useState<string | null>(null);
  const [editPaymentInitialOp, setEditPaymentInitialOp] = useState<Operation | null>(null);
  const [editPaymentMovement, setEditPaymentMovement] = useState<Movement | null>(null);
  const [editPaymentContext, setEditPaymentContext] = useState<{
    riderName?: string | null;
    accountCode?: string | null;
    settlementDate?: string | null;
  } | undefined>(undefined);

  // Correct Commission Start Modal State
  const [isCorrectCommissionOpen, setIsCorrectCommissionOpen] = useState(false);
  const [correctCommissionMovement, setCorrectCommissionMovement] = useState<Movement | null>(null);

  const openCorrectCommissionModal = (m: Movement) => {
    setCorrectCommissionMovement(m);
    setIsCorrectCommissionOpen(true);
  };


  // Record Fee Modal State
  const [isFeeOpen, setIsFeeOpen] = useState(false);
  const [feeHandoverId, setFeeHandoverId] = useState("");
  const [feeAmount, setFeeAmount] = useState<number>(200);
  const [feeFund, setFeeFund] = useState<Fund>(Fund.Cashbox);
  const [feeRef, setFeeRef] = useState("");
  const [feeReason, setFeeReason] = useState("قبض رسوم فتح الحساب نقداً");
  const [feeSubmitting, setFeeSubmitting] = useState(false);
  const [manualHandoverMode, setManualHandoverMode] = useState(false);

  // Lookups
  const riderMap = useMemo(() => new Map(riders.map((r) => [r.id, r])), [riders]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.accountId, a])), [accounts]);
  const sponsorMap = useMemo(() => new Map(sponsors.map((s) => [s.id, s])), [sponsors]);

  // Helper to extract movement sponsor name
  const getMovementSponsorName = (m: Movement): string => {
    return (
      m.sponsorNameAr ||
      m.userRider?.sponsorNameAr ||
      m.ownerRider?.sponsorNameAr ||
      (m.sponsorId ? sponsorMap.get(m.sponsorId)?.registryNameAr : null) ||
      (m.userRider?.sponsorId ? sponsorMap.get(m.userRider.sponsorId)?.registryNameAr : null) ||
      (m.ownerRider?.sponsorId ? sponsorMap.get(m.ownerRider.sponsorId)?.registryNameAr : null) ||
      ""
    );
  };

  // Pending Handover (Only one company-wide pending handover allowed)
  const pendingHandover = useMemo(() => {
    return handovers.find((h) => h.status === CashboxHandoverStatus.Pending) || null;
  }, [handovers]);

  // Unique Sponsors for dropdown
  const uniqueSponsors = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sponsors) {
      if (s.id && s.registryNameAr) map.set(s.id, s.registryNameAr);
    }
    for (const m of movements) {
      const spName = m.sponsorNameAr || m.userRider?.sponsorNameAr || m.ownerRider?.sponsorNameAr;
      const spId = m.sponsorId || m.userRider?.sponsorId || m.ownerRider?.sponsorId;
      if (spId && spName) map.set(spId, spName);
      else if (spName) map.set(spName, spName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sponsors, movements]);

  const loadAllData = async (
    targetPage = page,
    fDate = fromDate,
    tDate = toDate,
    spFilter = sponsorFilter,
  ) => {
    setLoading(true);
    try {
      const [fundsRes, movRes, debtsRes, accRes, ridersRes, sponsorsRes, handoversRes, riderDebtsRes] =
        await Promise.allSettled([
          getJahezFunds(),
          getJahezMoneyMovements(targetPage, pageSize, {
            fromDate: fDate || undefined,
            toDate: tDate || undefined,
            sponsorId: spFilter || undefined,
            sponsorNameAr: spFilter || undefined,
          }),
          getJahezTransferredDebts(targetPage, pageSize),
          getJahezAccounts(1, 100),
          listRiders(),
          listSponsors(),
          getJahezCashboxHandovers(1, 50),
          getJahezRidersWithTransferredDebts(1, riderDebtsPageSize),
        ]);

      if (fundsRes.status === "fulfilled") {
        setFunds(fundsRes.value || []);
      }
      if (movRes.status === "fulfilled") {
        setMovements(movRes.value.items || []);
      }
      if (debtsRes.status === "fulfilled") {
        setDebts(debtsRes.value.items || []);
      }
      if (accRes.status === "fulfilled") {
        setAccounts(accRes.value.items || []);
      }
      if (ridersRes.status === "fulfilled") {
        setRiders(ridersRes.value || []);
      }
      if (sponsorsRes.status === "fulfilled") {
        setSponsors(sponsorsRes.value || []);
      }
      if (handoversRes.status === "fulfilled") {
        setHandovers(handoversRes.value.items || []);
      }
      if (riderDebtsRes.status === "fulfilled") {
        setRiderDebtSummaries(riderDebtsRes.value.items || []);
        setRiderDebtsPage(1);
      }
    } catch {
      toast.error("خطأ", "فشل جلب بيانات الأموال والحركات");
    } finally {
      setLoading(false);
    }
  };

  const handoverOptions = useMemo(() => {
    return accounts
      .filter((a) => Boolean(a.currentHandoverId))
      .map((a) => ({
        value: a.currentHandoverId!,
        label: `${a.code} - ${a.actualRider?.nameAr || a.userName || "حساب جاهز"}`,
        sublabel: `المندوب: ${a.actualRider?.nameAr || "غير مسند"} (إقامة: ${a.actualRider?.iqamaNo || "-"}) • المعرف: #${a.currentHandoverId!.slice(0, 8)}`,
        keywords: `${a.code} ${a.userName || ""} ${a.actualRider?.nameAr || ""} ${a.actualRider?.iqamaNo || ""} ${a.currentHandoverId}`,
      }));
  }, [accounts]);

  useEffect(() => {
    loadAllData(page, fromDate, toDate, sponsorFilter);
  }, [page, pageSize, fromDate, toDate, sponsorFilter]);

  // Fund balance helper
  const getFundData = (f: Fund) => {
    return (
      funds.find((x) => x.fund === f) || {
        fund: f,
        receipts: 0,
        disbursements: 0,
        balance: 0,
      }
    );
  };

  const cashboxData = getFundData(Fund.Cashbox);
  const petroData = getFundData(Fund.PetroApp);
  const bankData = getFundData(Fund.Bank);

  const filteredMovements = movements.filter((m) => {
    if (fundFilter !== "" && m.fund !== fundFilter) return false;
    if (directionFilter !== "" && m.direction !== directionFilter) return false;

    // Sponsor filter
    if (sponsorFilter) {
      const spName = getMovementSponsorName(m);
      const spId = m.sponsorId || m.userRider?.sponsorId || m.ownerRider?.sponsorId;
      if (spId !== sponsorFilter && spName !== sponsorFilter) return false;
    }

    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const spName = getMovementSponsorName(m).toLowerCase();
    const platformAcc = m.platformAccountId != null ? String(m.platformAccountId).toLowerCase() : "";
    return (
      m.id.toLowerCase().includes(q) ||
      (platformAcc ? platformAcc.includes(q) : false) ||
      m.reason.toLowerCase().includes(q) ||
      m.handoverId.toLowerCase().includes(q) ||
      spName.includes(q) ||
      m.userRider?.nameAr?.toLowerCase().includes(q) ||
      m.userRider?.nameEn?.toLowerCase().includes(q) ||
      m.userRider?.iqamaNo?.includes(q) ||
      m.userRider?.mobile?.includes(q) ||
      m.ownerRider?.nameAr?.toLowerCase().includes(q) ||
      m.ownerRider?.nameEn?.toLowerCase().includes(q) ||
      m.ownerRider?.iqamaNo?.includes(q) ||
      m.ownerRider?.mobile?.includes(q)
    );
  });

  const filteredDebts = debts.filter((d) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const rNameAr = d.userRider?.nameAr?.toLowerCase() || "";
    const rNameEn = d.userRider?.nameEn?.toLowerCase() || "";
    const iqama = d.userRider?.iqamaNo?.toLowerCase() || "";
    const mobile = d.userRider?.mobile?.toLowerCase() || "";
    const extAcc = d.assignment?.externalAccountId?.toLowerCase() || "";
    const opReason = d.sourceOperation?.reason?.toLowerCase() || "";
    const endReason = d.assignment?.endReason?.toLowerCase() || "";
    const startReason = d.assignment?.startReason?.toLowerCase() || "";
    const amt = String(d.amount);

    return (
      rNameAr.includes(q) ||
      rNameEn.includes(q) ||
      iqama.includes(q) ||
      mobile.includes(q) ||
      extAcc.includes(q) ||
      opReason.includes(q) ||
      endReason.includes(q) ||
      startReason.includes(q) ||
      amt.includes(q)
    );
  });

  const filteredRiderDebts = useMemo(() => {
    if (!search.trim()) return riderDebtSummaries;
    const q = search.trim().toLowerCase();
    return riderDebtSummaries.filter((s) => {
      const rNameAr = s.userRider?.nameAr?.toLowerCase() || "";
      const rNameEn = s.userRider?.nameEn?.toLowerCase() || "";
      const iqama = s.userRider?.iqamaNo?.toLowerCase() || "";
      const mobile = s.userRider?.mobile?.toLowerCase() || "";
      const id = s.riderProfileId.toLowerCase();
      const amt = String(s.outstandingAmount);
      return (
        rNameAr.includes(q) ||
        rNameEn.includes(q) ||
        iqama.includes(q) ||
        mobile.includes(q) ||
        id.includes(q) ||
        amt.includes(q)
      );
    });
  }, [riderDebtSummaries, search]);

  // Submit Handover to Accountant
  const openSubmitHandoverModal = () => {
    setHandoverBusinessDate(todayStr);
    setHandoverReason("تسليم الأموال للمحاسب");
    setIsSubmitHandoverOpen(true);
  };

  const handleSubmitHandover = async () => {
    if (!handoverBusinessDate) {
      toast.warning("تنبيه", "يرجى تحديد تاريخ يوم العمل");
      return;
    }
    setHandoverSubmitting(true);
    try {
      await submitJahezCashboxHandover({
        businessDate: handoverBusinessDate,
        reason: handoverReason.trim() || "تسليم الأموال للمحاسب",
      });
      toast.success("تم بنجاح", "تم إنشاء تسليم الأموال للمحاسب وبانتظار المطابقة والاعتماد");
      setIsSubmitHandoverOpen(false);
      loadAllData(page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("treasury_upgrade_required")) {
        toast.error(
          "تم تفعيل خزائن جاهز V3",
          "تمت ترقية المنظومة؛ يرجى استخدام شاشة تسليم العهدة V3 الجديدة لإتمام التسليم.",
        );
      } else {
        toast.error("فشل التسليم", msg || "تعذر تسليم الأموال للمحاسب");
      }
    } finally {
      setHandoverSubmitting(false);
    }
  };

  // Confirm Handover as Accountant
  const openConfirmHandoverModal = (h: CashboxHandover) => {
    setTargetHandover(h);
    setConfirmCashboxAmount(h.cashboxAmount);
    setConfirmPetroAppAmount(h.petroAppAmount);
    setConfirmBankAmount(h.bankAmount);
    setConfirmReason("تم الاستلام والمطابقة");
    setIsConfirmHandoverOpen(true);
  };

  const handleConfirmHandover = async () => {
    if (!targetHandover) return;
    setConfirmSubmitting(true);
    try {
      await confirmJahezCashboxHandover(targetHandover.id, {
        cashboxAmount: confirmCashboxAmount,
        petroAppAmount: confirmPetroAppAmount,
        bankAmount: confirmBankAmount,
        reason: confirmReason.trim() || "تم الاستلام والمطابقة",
        rowVersion: targetHandover.rowVersion,
      });
      toast.success("تم الاعتماد", "تمت مطابقة واعتماد استلام الأموال بنجاح وتحديث الأرصدة المعلقة");
      setIsConfirmHandoverOpen(false);
      loadAllData(page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("treasury_upgrade_required")) {
        toast.error(
          "تم تفعيل خزائن جاهز V3",
          "تمت ترقية المنظومة؛ يرجى استخدام شاشة تسليم العهدة V3 الجديدة لاعتماد المحضر.",
        );
      } else {
        toast.error("فشل الاعتماد", msg || "تعذر اعتماد تسليم الأموال");
      }
    } finally {
      setConfirmSubmitting(false);
    }
  };

  // Cancel Handover
  const openCancelHandoverModal = (h: CashboxHandover) => {
    setTargetHandover(h);
    setCancelReason("إلغاء وإعادة المطابقة");
    setIsCancelHandoverOpen(true);
  };

  const handleCancelHandover = async () => {
    if (!targetHandover) return;
    setCancelSubmitting(true);
    try {
      await cancelJahezCashboxHandover(targetHandover.id, {
        reason: cancelReason.trim() || "إلغاء وإعادة المطابقة",
        rowVersion: targetHandover.rowVersion,
      });
      toast.success("تم الإلغاء", "تم إلغاء التسليم المعلق وإتاحة الحركات المالية للتسليم مجدداً");
      setIsCancelHandoverOpen(false);
      loadAllData(page);
    } catch (err: unknown) {
      toast.error("فشل الإلغاء", err instanceof Error ? err.message : "تعذر إلغاء التسليم المعلق");
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Transferred Debts Handlers
  const loadRiderDebts = async (targetPage = riderDebtsPage) => {
    setRiderDebtsLoading(true);
    try {
      const res = await getJahezRidersWithTransferredDebts(targetPage, riderDebtsPageSize);
      setRiderDebtSummaries(res?.items || []);
      setRiderDebtsPage(targetPage);
    } catch {
      toast.error("خطأ", "فشل جلب قائمة مديونيات المناديب المرحلة");
    } finally {
      setRiderDebtsLoading(false);
    }
  };

  const loadHistoryDebts = async (targetPage = historyDebtsPage) => {
    setHistoryDebtsLoading(true);
    try {
      const res = await getJahezTransferredDebts(targetPage, pageSize);
      setDebts(res?.items || []);
      setHistoryDebtsPage(targetPage);
    } catch {
      toast.error("خطأ", "فشل جلب سجل المستحقات المرحلة التاريخي");
    } finally {
      setHistoryDebtsLoading(false);
    }
  };

  const openRiderDrawer = async (summary: RiderTransferredDebtSummary) => {
    setSelectedRiderSummary(summary);
    setIsRiderDrawerOpen(true);
    setRiderDetailLoading(true);
    try {
      const res = await getJahezRiderTransferredDebts(summary.riderProfileId, 1, 50);
      setRiderDetailDebts(res?.items || []);
    } catch {
      toast.error("خطأ", "فشل تحميل تفاصيل مديونيات المندوب");
    } finally {
      setRiderDetailLoading(false);
    }
  };

  const openBulkRepayModal = (summary: RiderTransferredDebtSummary) => {
    setBulkRepayRider(summary);
    setBulkRepayExpectedAmount(summary.outstandingAmount);
    setBulkRepayRef(`RCPT-${getRiyadhTodayDate().replace(/-/g, "")}-${Date.now().toString().slice(-4)}`);
    setBulkRepayReason("تحصيل كامل المديونيات المرحلة على المندوب");
    setBulkRepayKey(generateIdempotencyKey("bulk-debt-repay"));
    setIsBulkRepayOpen(true);
  };

  const submitBulkRepayment = async () => {
    if (!bulkRepayRider) return;
    if (!bulkRepayRef.trim()) {
      toast.warning("تنبيه", "يرجى إدخال رقم الإيصال / المرجع الفعلي");
      return;
    }
    if (!bulkRepayReason.trim()) {
      toast.warning("تنبيه", "يرجى كتابة سبب وبيان السداد");
      return;
    }
    setBulkRepaySubmitting(true);
    try {
      const res = await repayJahezRiderTransferredDebts(
        bulkRepayRider.riderProfileId,
        {
          expectedAmount: bulkRepayExpectedAmount,
          fund: Fund.Cashbox, // Fixed to 1 Cashbox
          reference: bulkRepayRef.trim(),
          reason: bulkRepayReason.trim(),
        },
        bulkRepayKey,
      );
      toast.success(
        "تم السداد بنجاح",
        `تم سداد جميع المديونيات المرحلة بقيمة ${Number(res?.paidAmount ?? bulkRepayExpectedAmount).toFixed(2)} ر.س`,
      );
      setIsBulkRepayOpen(false);
      setIsRiderDrawerOpen(false);
      loadRiderDebts(riderDebtsPage);
      loadHistoryDebts(historyDebtsPage);
      loadAllData(page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر سداد مديونيات المندوب";
      if (msg.includes("409") || msg.includes("تعارض") || msg.includes("تغير إجمالي المديونية")) {
        toast.error(
          "تعارض في البيانات (409)",
          "تغير إجمالي المديونية أو سددت مسبقاً؛ يرجى مراجعة الأرقام المحدثة قبل التأكيد بمفتاح جديد.",
        );
        loadRiderDebts(riderDebtsPage);
        setBulkRepayKey(generateIdempotencyKey("bulk-repay-retry"));
      } else {
        toast.error("فشل السداد", msg);
      }
    } finally {
      setBulkRepaySubmitting(false);
    }
  };

  const openSingleDebtRepayModal = (debt: TransferredDebt) => {
    setSingleRepayDebt(debt);
    setSingleRepayRef(`RCPT-${getRiyadhTodayDate().replace(/-/g, "")}-${Date.now().toString().slice(-4)}`);
    setSingleRepayReason("سداد كامل المستحق المرحل");
    setSingleRepayKey(generateIdempotencyKey("single-debt-repay"));
    setIsSingleRepayOpen(true);
  };

  const submitSingleDebtRepayment = async () => {
    if (!singleRepayDebt) return;
    if (!singleRepayRef.trim()) {
      toast.warning("تنبيه", "يرجى إدخال رقم الإيصال / المرجع");
      return;
    }
    setSingleRepaySubmitting(true);
    try {
      await repayJahezTransferredDebt(
        singleRepayDebt.id,
        {
          fund: Fund.Cashbox,
          reference: singleRepayRef.trim(),
          reason: singleRepayReason.trim() || "سداد كامل المستحق المرحل",
          purpose: Purpose.TransferredDebtRepayment,
        },
        singleRepayKey,
      );
      toast.success("تم السداد", `تم سداد الالتزام بقيمة ${singleRepayDebt.amount.toFixed(2)} ر.س بنجاح`);
      setIsSingleRepayOpen(false);
      if (selectedRiderSummary) {
        const fresh = await getJahezRiderTransferredDebts(selectedRiderSummary.riderProfileId, 1, 50);
        setRiderDetailDebts(fresh?.items || []);
      }
      loadRiderDebts(riderDebtsPage);
      loadHistoryDebts(historyDebtsPage);
      loadAllData(page);
    } catch (err: unknown) {
      toast.error("فشل السداد", err instanceof Error ? err.message : "تعذر سداد المستحق");
    } finally {
      setSingleRepaySubmitting(false);
    }
  };

  // Fee Receipt Handler
  const openFeeModal = () => {
    setFeeHandoverId("");
    setFeeAmount(200);
    setFeeFund(Fund.Cashbox);
    setFeeRef(`FEE-${Date.now().toString().slice(-6)}`);
    setFeeReason("قبض رسوم فتح الحساب نقداً");
    setIsFeeOpen(true);
  };

  const submitFeeReceipt = async () => {
    if (!feeHandoverId.trim()) {
      toast.warning("تنبيه", "يرجى إدخال رقم محضر فترة التسليم");
      return;
    }
    setFeeSubmitting(true);
    try {
      await recordJahezFeeReceipt({
        handoverId: feeHandoverId.trim(),
        amount: Number(feeAmount) || 200,
        fund: feeFund,
        reference: feeRef.trim() || "FEE-CASH",
        reason: feeReason.trim() || "قبض رسوم فتح الحساب",
      });
      setIsFeeOpen(false);
      loadAllData(page);
    } catch (err: unknown) {
      toast.error("فشل تسجيل الرسوم", err instanceof Error ? err.message : "تعذر تسجيل الإيصال");
    } finally {
      setFeeSubmitting(false);
    }
  };

  const getPurposeLabel = (p: Purpose) => {
    switch (p) {
      case Purpose.Settlement:
        return "تصفية دورية";
      case Purpose.Fuel:
        return "وقود (بترو آب)";
      case Purpose.AccountFee:
        return "رسوم فتح حساب";
      case Purpose.TransferredDebtRepayment:
        return "سداد دين مرحل";
      default:
        return `غرض ${p}`;
    }
  };

  const getFundLabel = (f: Fund) => {
    switch (f) {
      case Fund.Cashbox:
        return "الخزنة";
      case Fund.PetroApp:
        return "بترو آب";
      case Fund.Bank:
        return "البنك";
      default:
        return `جهة ${f}`;
    }
  };

  const getHandoverStatusBadge = (status: CashboxHandoverStatus) => {
    switch (status) {
      case CashboxHandoverStatus.Pending:
        return <Badge tone="orange">قيد المراجعة والمطابقة</Badge>;
      case CashboxHandoverStatus.Confirmed:
        return <Badge tone="green">معتمد ومطابق</Badge>;
      case CashboxHandoverStatus.Cancelled:
        return <Badge tone="red">ملغي</Badge>;
      default:
        return <Badge tone="gray">حالة {status}</Badge>;
    }
  };

  // Export
  const handleExportMovements = () => {
    const data = filteredMovements.map((m) => ({
      "رقم حساب المنصة": m.platformAccountId || "-",
      "معرف الحركة": m.id,
      "الجهة": getFundLabel(m.fund),
      "الاتجاه": m.direction === Direction.Receipt ? "قبض" : "صرف",
      "الغرض": getPurposeLabel(m.purpose),
      "المبلغ": m.amount,
      "صافي المبلغ المُدخل للتصفية": m.net != null ? m.net : "-",
      "عمولة الشركة المعتمدة": m.commission != null ? m.commission : "-",
      "بداية احتساب العمولة": m.startDate || "-",
      "نهاية احتساب العمولة": m.endDate || "-",
      "التاريخ": m.occurredAtUtc,
      "المندوب الفعلي": m.userRider?.nameAr || m.userRider?.nameEn || "-",
      "إقامة المندوب الفعلي": m.userRider?.iqamaNo || "-",
      "جوال المندوب الفعلي": m.userRider?.mobile || "-",
      "صاحب الحساب (المالك)": m.ownerRider?.nameAr || m.ownerRider?.nameEn || "-",
      "إقامة المالك": m.ownerRider?.iqamaNo || "-",
      "جوال المالك": m.ownerRider?.mobile || "-",
      "الكفيل": getMovementSponsorName(m) || "-",
      "حالة التسليم للمحاسب": m.isHandedToAccountant
        ? "مسلم ومطابق للمحاسب"
        : m.cashboxHandoverId
        ? "قيد تسليم معلق"
        : "معلق بالخزنة",
      "السبب": m.reason,
    }));
    exportToExcel(data, `حركات_جاهز_المالية_${fromDate || "all"}_${toDate || "all"}`);
  };

  return (
    <div className="space-y-6 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <BadgeDollarSign className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              الأموال وحركات الدفتر وتسليم المحاسب
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              أرصدة الجهات الثلاث، تسليم الأموال للمحاسب، وسجل الحركات والالتزامات
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadAllData(page)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          {canSubmitHandover && (
            <Button
              size="sm"
              onClick={openSubmitHandoverModal}
              disabled={Boolean(pendingHandover)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
              title={
                pendingHandover
                  ? "يوجد تسليم معلق بانتظار تأكيد المحاسب، لا يمكن إنشاء تسليم جديد حتى يتم اعتماده أو إلغاؤه"
                  : "تسليم الأموال للمحاسب وإغلاق يومية العمل"
              }
            >
              <Send className="h-4 w-4" />
              تسليم الأموال للمحاسب
            </Button>
          )}

          <Button
            size="sm"
            onClick={openFeeModal}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
          >
            <Coins className="h-4 w-4" />
            تسجيل إيصال رسوم مستقل
          </Button>

          <Button variant="secondary" size="sm" onClick={handleExportMovements} className="gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير الحركات إلى Excel
          </Button>

          <Link href="/admin/jahez/treasury/balances">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2">
              <BadgeDollarSign className="h-4 w-4" />
              <span>خزائن جاهز V3</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* V3 Upgrade Notice Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1">
          <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2 text-sm">
            <span>منظومة خزائن جاهز V3 الجديدة مفعلة</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            البطاقات أدناه تمثل <strong>حركات النشاط التي لم تعتمد بمحضر تسليم بعد</strong>. للاطلاع على
            الأرصدة الفعلية للأصول، شجرة الحسابات، تسليم العهدة المعتمد، ومطابقة بترو آب، يرجى الانتقال إلى شاشات الخزائن الجديدة.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/admin/jahez/treasury/handovers">
            <Button size="sm" variant="secondary" className="text-xs font-semibold gap-1.5">
              <span>تسليم العهدة V3</span>
            </Button>
          </Link>
          <Link href="/admin/jahez/treasury/balances">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5">
              <span>الأرصدة الفعلية V3</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Outstanding Funds Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* الخزنة */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-emerald-600" />
              حركات الخزنة غير المسلّمة
            </span>
            <Badge tone="green">نشاط غير معتمد</Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-gray-500">الرصيد المعلق الفعلي</div>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-100 font-mono">
                {cashboxData.balance.toFixed(2)} ر.س
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-400">
              قبض: {cashboxData.receipts.toFixed(2)} | صرف: {cashboxData.disbursements.toFixed(2)}
            </div>
          </div>
        </div>

        {/* بترو آب */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-xs dark:border-blue-950 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <Fuel className="h-5 w-5 text-blue-600" />
              بترو آب 
            </span>
            <Badge tone="blue">قبض وقود معلق</Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-gray-500">إجمالي مقبوضات الوقود المعلقة</div>
              <div className="text-2xl font-black text-blue-800 dark:text-blue-100 font-mono">
                {petroData.receipts.toFixed(2)} ر.س
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-400">
              الصافي: {petroData.balance.toFixed(2)} ر.س
            </div>
          </div>
        </div>

        {/* البنك */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 shadow-xs dark:border-purple-950 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              البنك 
            </span>
            <Badge tone="gray">صرف تحويلات معلق</Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-gray-500">إجمالي التحويلات المعلقة</div>
              <div className="text-2xl font-black text-purple-800 dark:text-purple-100 font-mono">
                {bankData.disbursements.toFixed(2)} ر.س
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-400">
              الصافي: {bankData.balance.toFixed(2)} ر.س
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Pending Handover Alert Banner */}
      {pendingHandover && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 p-5 shadow-sm dark:border-amber-600 dark:bg-amber-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-black text-amber-900 dark:text-amber-100">
                  يوجد تسليم أموال معلق بانتظار اعتماد ومطابقة المحاسب #{pendingHandover.id.slice(0, 8)}
                </h3>
                <Badge tone="orange">قيد الاعتماد</Badge>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                تاريخ العمل: <span className="font-mono font-bold">{pendingHandover.businessDate}</span> • 
                الحركات المشمولة: <span className="font-bold">{pendingHandover.movementCount} حركة</span> • 
                السبب: <span>{pendingHandover.reason}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
                <span className="rounded-md bg-white/80 px-2 py-0.5 border dark:bg-gray-800">
                  نقدية الخزنة: <strong>{pendingHandover.cashboxAmount.toFixed(2)} ر.س</strong>
                </span>
                <span className="rounded-md bg-white/80 px-2 py-0.5 border dark:bg-gray-800">
                  بترو آب: <strong>{pendingHandover.petroAppAmount.toFixed(2)} ر.س</strong>
                </span>
                <span className="rounded-md bg-white/80 px-2 py-0.5 border dark:bg-gray-800">
                  البنك: <strong>{pendingHandover.bankAmount.toFixed(2)} ر.س</strong>
                </span>
                <span className="rounded-md bg-emerald-100/90 text-emerald-900 px-2 py-0.5 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 font-bold">
                  الصافي الإجمالي: {(pendingHandover.cashboxAmount + pendingHandover.petroAppAmount + pendingHandover.bankAmount).toFixed(2)} ر.س
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Confirm button for accountant (must be a different user from submitter) */}
              {canConfirmHandover && user?.id !== pendingHandover.requestedByUserId && (
                <Button
                  onClick={() => openConfirmHandoverModal(pendingHandover)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs shadow-xs"
                >
                  <CheckCheck className="h-4 w-4" />
                  اعتماد ومطابقة الاستلام (كمحاسب)
                </Button>
              )}

              {/* Cancel button for submitter */}
              {canSubmitHandover && user?.id === pendingHandover.requestedByUserId && (
                <Button
                  variant="secondary"
                  onClick={() => openCancelHandoverModal(pendingHandover)}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 text-xs font-bold gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  إلغاء التسليم المعلق
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab("movements")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "movements"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          سجل الحركات المالية الموحد ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab("handovers")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "handovers"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          <span>تسليمات المحاسب ({handovers.length})</span>
          {pendingHandover && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="يوجد تسليم معلق" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("transferredDebts")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "transferredDebts"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          مديونيات المناديب المرحلة ({riderDebtSummaries.length})
        </button>
      </div>

      {/* Tab 1: Movements Table */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برقم حساب المنصة، البيان، اسم المندوب، الكفيل، أو رقم الإقامة..."
                  className="pr-10 text-xs"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date range inputs */}
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/60 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-bold text-gray-500 px-1">من:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setPage(1);
                    }}
                    className="h-7 text-xs bg-transparent border-0 font-mono text-gray-700 dark:text-gray-200 focus:outline-hidden"
                  />
                  <span className="text-[11px] font-bold text-gray-500 px-1 border-r border-gray-300 dark:border-gray-700">إلى:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setPage(1);
                    }}
                    className="h-7 text-xs bg-transparent border-0 font-mono text-gray-700 dark:text-gray-200 focus:outline-hidden"
                  />
                </div>

                {/* Sponsor Filter */}
                <select
                  value={sponsorFilter}
                  onChange={(e) => {
                    setSponsorFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-800 max-w-[170px] truncate"
                >
                  <option value="">جميع الكفلاء</option>
                  {uniqueSponsors.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={fundFilter}
                  onChange={(e) => setFundFilter(e.target.value === "" ? "" : Number(e.target.value))}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">جميع الجهات</option>
                  <option value={Fund.Cashbox}>الخزنة</option>
                  <option value={Fund.PetroApp}>بترو آب</option>
                  <option value={Fund.Bank}>البنك</option>
                </select>

                <select
                  value={directionFilter}
                  onChange={(e) =>
                    setDirectionFilter(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">جميع الاتجاهات</option>
                  <option value={Direction.Receipt}>قبض</option>
                  <option value={Direction.Disbursement}>صرف</option>
                </select>

                {(search || fundFilter !== "" || directionFilter !== "" || sponsorFilter || fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFundFilter("");
                      setDirectionFilter("");
                      setSponsorFilter("");
                      setFromDate("");
                      setToDate("");
                      setPage(1);
                    }}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3">رقم حساب المنصة</th>
                    <th className="py-3 px-3">المندوب الفعلي (المستخدم)</th>
                    <th className="py-3 px-3">صاحب الحساب (المالك)</th>
                    <th className="py-3 px-3">الكفيل</th>
                    <th className="py-3 px-3">الجهة</th>
                    <th className="py-3 px-3 text-center">الاتجاه</th>
                    <th className="py-3 px-3">الغرض</th>
                    <th className="py-3 px-3 text-center">المبلغ</th>
                    <th className="py-3 px-3 text-center" title="صافي المبلغ المُدخل للتصفية">
                      صافي المبلغ المُدخل للتصفية
                    </th>
                    <th className="py-3 px-3 text-center" title="عمولة الشركة المعتمدة">
                      عمولة الشركة المعتمدة
                    </th>
                    <th className="py-3 px-3 text-center" title="فترة احتساب العمولة (من - إلى)">
                      فترة احتساب العمولة
                    </th>
                    <th className="py-3 px-3 text-center">تسليم المحاسب</th>
                    <th className="py-3 px-3">التاريخ والوقت</th>
                    <th className="py-3 px-3">البيان</th>
                    <th className="py-3 px-3 text-center min-w-[210px]">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500 mb-2" />
                        جارٍ تحميل الحركات المالية...
                      </td>
                    </tr>
                  ) : filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-gray-500">
                        لا توجد حركات مالية مسجلة بعد
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const isSettlementDisbursement =
                        m.purpose === Purpose.Settlement &&
                        m.direction === Direction.Disbursement &&
                        Boolean(m.operationId) &&
                        (m.fund === Fund.Cashbox || m.fund === Fund.Bank);

                      const isLockedByHandover = Boolean(m.cashboxHandoverId || m.isHandedToAccountant);
                      const fallbackRider = riderMap.get(m.riderProfileId);
                      const sponsorName = getMovementSponsorName(m);

                      return (
                        <tr key={m.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                          <td className="py-3 px-3 font-mono font-bold">
                            {m.platformAccountId != null && m.platformAccountId !== "" ? (
                              <span className="text-gray-900 dark:text-gray-100">{m.platformAccountId}</span>
                            ) : (
                              <span className="text-gray-400 font-normal">#{m.id.slice(0, 8)}</span>
                            )}
                          </td>

                          {/* المندوب الفعلي (User Rider) */}
                          <td className="py-3 px-3">
                            {m.userRider ? (
                              <div>
                                <div className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                  <UserCheck className="h-3.5 w-3.5 shrink-0" />
                                  <span>{m.userRider.nameAr || m.userRider.nameEn || "-"}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  إقامة: {m.userRider.iqamaNo || "-"}
                                  {m.userRider.mobile && ` • ${m.userRider.mobile}`}
                                </div>
                              </div>
                            ) : fallbackRider ? (
                              <div>
                                <div className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                  <UserCheck className="h-3.5 w-3.5 shrink-0" />
                                  <span>{fallbackRider.fullNameAr}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  إقامة: {fallbackRider.iqamaNo || "-"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          {/* صاحب الحساب (Owner Rider) */}
                          <td className="py-3 px-3">
                            {m.ownerRider ? (
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                  <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  <span>{m.ownerRider.nameAr || m.ownerRider.nameEn || "-"}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  إقامة: {m.ownerRider.iqamaNo || "-"}
                                  {m.ownerRider.mobile && ` • ${m.ownerRider.mobile}`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          {/* الكفيل */}
                          <td className="py-3 px-3">
                            {sponsorName ? (
                              <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                                <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="truncate max-w-[130px]" title={sponsorName}>
                                  {sponsorName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-semibold">{getFundLabel(m.fund)}</td>
                          <td className="py-3 px-3 text-center">
                            <Badge
                              tone={m.direction === Direction.Receipt ? "green" : "red"}
                            >
                              {m.direction === Direction.Receipt ? "قبض" : "صرف"}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                            {getPurposeLabel(m.purpose)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-sm">
                            {m.amount.toFixed(2)} ر.س
                          </td>

                          {/* صافي المبلغ المُدخل للتصفية */}
                          <td className="py-3 px-3 text-center font-mono">
                            {m.net != null ? (
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {Number(m.net).toFixed(2)} ر.س
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          {/* عمولة الشركة المعتمدة */}
                          <td className="py-3 px-3 text-center font-mono">
                            {m.commission != null ? (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {Number(m.commission).toFixed(2)} ر.س
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          {/* فترة احتساب العمولة */}
                          <td className="py-3 px-3 text-center font-mono">
                            {m.startDate || m.endDate ? (
                              <div className="inline-flex items-center justify-center gap-1.5">
                                <div
                                  className="inline-flex flex-col items-center justify-center leading-tight space-y-0.5"
                                  title={
                                    m.startDate && m.endDate
                                      ? `فترة الاحتساب: من ${m.startDate} إلى ${m.endDate} (شامل)`
                                      : undefined
                                  }
                                >
                                  <span className="font-bold text-gray-900 dark:text-gray-100 text-[11px]">
                                    {m.startDate || "-"}
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {m.endDate || "-"}
                                  </span>
                                </div>
                                {canCorrectCommission && (
                                  <button
                                    type="button"
                                    onClick={() => openCorrectCommissionModal(m)}
                                    disabled={isLockedByHandover}
                                    className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                                    title={isLockedByHandover ? "مقفلة في تسليم محاسب" : "تصحيح تاريخ بداية احتساب العمولة"}
                                  >
                                    <CalendarCheck className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : canCorrectCommission && (m.purpose === Purpose.Settlement || Boolean(m.operationId)) ? (
                              <button
                                type="button"
                                onClick={() => openCorrectCommissionModal(m)}
                                disabled={isLockedByHandover}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="تحديد وتصحيح تاريخ بداية احتساب العمولة"
                              >
                                <CalendarCheck className="h-3 w-3" />
                                <span>تحديد التاريخ</span>
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          {/* تسليم المحاسب */}
                          <td className="py-3 px-3 text-center">
                            {m.isHandedToAccountant ? (
                              <Badge tone="green">مسلّمة للمحاسب</Badge>
                            ) : m.cashboxHandoverId ? (
                              <Badge tone="orange">قيد تسليم معلق</Badge>
                            ) : (
                              <Badge tone="gray">معلقة بالخزنة</Badge>
                            )}
                          </td>

                          <td className="py-3 px-3 text-gray-400">
                            {m.occurredAtUtc?.slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {m.reason}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedMovement(m);
                                  setIsDetailsOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                title="عرض تفاصيل الحركة"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {isSettlementDisbursement && canEditPayment && (
                                isLockedByHandover ? (
                                  <span
                                    className="inline-flex items-center justify-center h-7 px-2 rounded-xl text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed gap-1 border border-gray-200 dark:border-gray-700"
                                    title="لا يمكن تعديل طريقة الدفع لأن الحركة مشمولة في تسليم محاسب"
                                  >
                                    <Lock className="h-3 w-3" />
                                    مقفل
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      const opFallback: Operation = {
                                        id: m.operationId || "",
                                        handoverId: m.handoverId,
                                        mode: OperationMode.Settle,
                                        status: OperationStatus.Executed,
                                        paymentStatus: PaymentStatus.Paid,
                                        throughDate: m.endDate || "",
                                        effectiveAtUtc: m.occurredAtUtc,
                                        net: m.net ?? 0,
                                        commission: m.commission ?? 0,
                                        calculatedCommission: m.calculatedCommission ?? m.commission ?? 0,
                                        remaining: m.direction === Direction.Receipt ? m.amount : -m.amount,
                                        calculationJson: "{}",
                                        fund: m.fund,
                                        purpose: m.purpose,
                                        transferToRider: false,
                                        paymentReference: m.reference,
                                        reason: m.reason,
                                        approvedRequestId: null,
                                        executedAtUtc: m.occurredAtUtc,
                                        executedByUserId: m.actorUserId,
                                        createdAtUtc: m.createdAtUtc,
                                        createdByUserId: m.createdByUserId,
                                        updatedAtUtc: null,
                                        updatedByUserId: null,
                                        rowVersion: m.operationRowVersion || "",
                                        isDeleted: false,
                                        deletedAtUtc: null,
                                        deletedByUserId: null,
                                        deletionReason: null,
                                      };
                                      setEditPaymentOpId(m.operationId);
                                      setEditPaymentInitialOp(opFallback);
                                      setEditPaymentMovement(m);
                                      setEditPaymentContext({
                                        riderName:
                                          m.userRider?.nameAr ||
                                          m.ownerRider?.nameAr ||
                                          fallbackRider?.fullNameAr,
                                        settlementDate: m.occurredAtUtc?.slice(0, 10),
                                      });
                                      setIsEditPaymentOpen(true);
                                    }}
                                    className="h-7 px-2 text-[11px] font-bold gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900 shadow-2xs"
                                    title="تعديل طريقة صرف التصفية (الخزنة ↔ الحساب البنكي)"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                    تعديل الدفع
                                  </Button>
                                )
                              )}

                              {/* زر تصحيح تاريخ بداية احتساب العمولة */}
                              {(Boolean(m.operationId) || m.purpose === Purpose.Settlement || Boolean(m.startDate || m.endDate)) && canCorrectCommission && (
                                isLockedByHandover ? (
                                  <span
                                    className="inline-flex items-center justify-center h-7 px-2 rounded-xl text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed gap-1 border border-gray-200 dark:border-gray-700"
                                    title="لا يمكن تصحيح احتساب العمولة لأن الحركة مشمولة في تسليم محاسب معلق أو معتمد (يمكن إلغاء التسليم المعلق أولاً ثم إجراء التصحيح)"
                                  >
                                    <Lock className="h-3 w-3" />
                                    تصحيح التاريخ
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openCorrectCommissionModal(m)}
                                    className="h-7 px-2.5 text-[11px] font-bold gap-1 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700 shadow-2xs"
                                    title="تصحيح تاريخ بداية احتساب عمولة التصفية"
                                  >
                                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                                    <span>تصحيح تاريخ العمولة</span>
                                  </Button>
                                )
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

      {/* Tab 2: Accountant Handovers History */}
      {activeTab === "handovers" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3">رقم التسليم</th>
                    <th className="py-3 px-3">تاريخ يوم العمل</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-3 text-center">نقدية الخزنة</th>
                    <th className="py-3 px-3 text-center">بترو آب</th>
                    <th className="py-3 px-3 text-center">البنك</th>
                    <th className="py-3 px-3 text-center">الصافي الإجمالي</th>
                    <th className="py-3 px-3 text-center">عدد الحركات</th>
                    <th className="py-3 px-3">البيان / السبب</th>
                    <th className="py-3 px-3">تاريخ الإنشاء</th>
                    <th className="py-3 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500 mb-2" />
                        جارٍ تحميل سجل تسليمات المحاسب...
                      </td>
                    </tr>
                  ) : handovers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-gray-500">
                        لا توجد تسليمات أموال مسجلة بعد
                      </td>
                    </tr>
                  ) : (
                    handovers.map((h) => {
                      const totalNet = h.cashboxAmount + h.petroAppAmount + h.bankAmount;
                      const isPending = h.status === CashboxHandoverStatus.Pending;
                      const isSubmitter = user?.id === h.requestedByUserId;

                      return (
                        <tr key={h.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                          <td className="py-3 px-3 font-mono font-bold">#{h.id.slice(0, 8)}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-gray-100">
                            {h.businessDate}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {getHandoverStatusBadge(h.status)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                            {h.cashboxAmount.toFixed(2)} ر.س
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">
                            {h.petroAppAmount.toFixed(2)} ر.س
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-purple-700">
                            {h.bankAmount.toFixed(2)} ر.س
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black text-sm text-gray-900 dark:text-white">
                            {totalNet.toFixed(2)} ر.س
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            {h.movementCount}
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={h.reason}>
                            {h.reason}
                          </td>
                          <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">
                            {h.createdAtUtc?.slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isPending && canConfirmHandover && !isSubmitter && (
                                <Button
                                  size="sm"
                                  onClick={() => openConfirmHandoverModal(h)}
                                  className="h-7 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                  title="اعتماد ومطابقة الاستلام كمحاسب"
                                >
                                  <CheckCheck className="h-3 w-3" />
                                  اعتماد
                                </Button>
                              )}

                              {isPending && canSubmitHandover && isSubmitter && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openCancelHandoverModal(h)}
                                  className="h-7 px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-800 gap-1"
                                  title="إلغاء التسليم المعلق"
                                >
                                  <XCircle className="h-3 w-3" />
                                  إلغاء
                                </Button>
                              )}

                              {h.status === CashboxHandoverStatus.Confirmed && (
                                <span className="text-[11px] font-mono text-emerald-600 font-semibold" title={h.confirmationReason || ""}>
                                  معتمد {h.confirmedAtUtc?.slice(0, 10)}
                                </span>
                              )}

                              {h.status === CashboxHandoverStatus.Cancelled && (
                                <span className="text-[11px] font-mono text-rose-500" title={h.cancellationReason || ""}>
                                  ملغي {h.cancelledAtUtc?.slice(0, 10)}
                                </span>
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

      {/* Tab 3: Transferred Debts Table (Actionable Riders & History) */}
      {activeTab === "transferredDebts" && (
        <div className="space-y-4">
          {/* Sub-tab Switcher & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDebtsSubTab("riders")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  debtsSubTab === "riders"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                قائمة المناديب المدينين (الديون غير المسددة) ({riderDebtSummaries.length})
              </button>
              <button
                onClick={() => {
                  setDebtsSubTab("history");
                  if (debts.length === 0) loadHistoryDebts(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  debtsSubTab === "history"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                سجل كافة الالتزامات التاريخية ({debts.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (debtsSubTab === "riders") loadRiderDebts(riderDebtsPage);
                  else loadHistoryDebts(historyDebtsPage);
                }}
                disabled={riderDebtsLoading || historyDebtsLoading}
                className="gap-1.5 h-8 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${riderDebtsLoading || historyDebtsLoading ? "animate-spin" : ""}`} />
                <span>تحديث</span>
              </Button>
            </div>
          </div>

          {/* Sub-tab 1: Actionable Riders with Outstanding Transferred Debts */}
          {debtsSubTab === "riders" && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                    <tr>
                      <th className="py-3 px-3 text-center">#</th>
                      <th className="py-3 px-3">المندوب</th>
                      <th className="py-3 px-3">الإقامة</th>
                      <th className="py-3 px-3">الجوال</th>
                      <th className="py-3 px-3 text-center">عدد المديونيات</th>
                      <th className="py-3 px-3 text-center">مديونية الداشبورد</th>
                      <th className="py-3 px-3 text-center">العمولة</th>
                      <th className="py-3 px-3 text-center font-black">إجمالي المستحق المرحّل</th>
                      <th className="py-3 px-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {riderDebtsLoading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-500">
                          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500 mb-2" />
                          جارٍ تحميل مديونيات المناديب المرحلة...
                        </td>
                      </tr>
                    ) : filteredRiderDebts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-500">
                          لا توجد مديونيات مرحلة غير مسددة
                        </td>
                      </tr>
                    ) : (
                      filteredRiderDebts.map((s, index) => {
                        const hasAmounts = Boolean(s.amounts);
                        return (
                          <tr key={s.riderProfileId} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                            <td className="py-3 px-3 text-center font-bold text-gray-400">
                              {(riderDebtsPage - 1) * riderDebtsPageSize + index + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                                  {s.userRider?.nameAr || s.userRider?.nameEn || "بيانات الهوية غير متاحة"}
                                </span>
                                {!s.userRider && (
                                  <span className="text-[10px] font-mono text-gray-400">
                                    معرف: {s.riderProfileId.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-700 dark:text-gray-300">
                              {s.userRider?.iqamaNo || "-"}
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-700 dark:text-gray-300" dir="ltr">
                              {s.userRider?.mobile || "-"}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                {s.unpaidDebtCount}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              {hasAmounts ? (
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {Number(s.amounts!.dashboardDebt).toFixed(2)} ر.س
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400">تفاصيل التقسيم غير متاحة</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              {hasAmounts ? (
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {Number(s.amounts!.commission).toFixed(2)} ر.س
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                              {Number(s.outstandingAmount).toFixed(2)} ر.س
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openRiderDrawer(s)}
                                  className="h-7 text-xs font-bold gap-1"
                                  title="عرض تفاصيل التزامات هذا المندوب"
                                >
                                  <Eye className="h-3.5 w-3.5 text-gray-500" />
                                  <span>التفاصيل</span>
                                </Button>
                                {canRepayDebt && (
                                  <Button
                                    size="sm"
                                    onClick={() => openBulkRepayModal(s)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs shadow-xs"
                                    title="تحصيل وسداد كامل المديونيات المرحلة لهذا المندوب"
                                  >
                                    سداد كامل المستحق المرحّل
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

              {/* Strict Pagination for Riders (Page starts at 1, max 100000, Previous/Next navigation) */}
              <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 dark:bg-gray-800/40 text-xs text-gray-500">
                <span>
                  عرض {filteredRiderDebts.length} مندوب في هذه الصفحة
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadRiderDebts(riderDebtsPage - 1)}
                    disabled={riderDebtsPage <= 1 || riderDebtsLoading}
                    className="h-7 text-xs"
                  >
                    السابق
                  </Button>
                  <span className="font-mono font-bold px-2">
                    صفحة {riderDebtsPage}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadRiderDebts(riderDebtsPage + 1)}
                    disabled={riderDebtSummaries.length < riderDebtsPageSize || riderDebtsLoading}
                    className="h-7 text-xs"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Historical Transferred Debts (Including Paid) */}
          {debtsSubTab === "history" && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                    <tr>
                      <th className="py-3 px-3 text-center">#</th>
                      <th className="py-3 px-3">المندوب الفعلي</th>
                      <th className="py-3 px-3">بيانات الحساب والتكليف</th>
                      <th className="py-3 px-3">بيانات التصفية الأصلية</th>
                      <th className="py-3 px-3 text-center">المبلغ المستحق المرحل</th>
                      <th className="py-3 px-3 text-center">حالة السداد</th>
                      <th className="py-3 px-3">تاريخ الترحيل</th>
                      <th className="py-3 px-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {historyDebtsLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500">
                          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500 mb-2" />
                          جارٍ تحميل السجل التاريخي للالتزامات...
                        </td>
                      </tr>
                    ) : filteredDebts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500">
                          لا توجد مستحقات مرحلة مسجلة
                        </td>
                      </tr>
                    ) : (
                      filteredDebts.map((d, index) => (
                        <tr key={d.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                          <td className="py-3 px-3 text-center font-bold text-gray-400">
                            {(historyDebtsPage - 1) * pageSize + index + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                                {d.userRider?.nameAr || d.userRider?.nameEn || "مندوب غير محدد"}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                <span>الهوية: {d.userRider?.iqamaNo || "-"}</span>
                                <span>•</span>
                                <span>الجوال: {d.userRider?.mobile || "-"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                                <span>رقم الحساب:</span>
                                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                                  {d.assignment?.externalAccountId || "-"}
                                </span>
                                {d.assignment?.status && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-normal">
                                    {d.assignment.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                <span>من: {d.assignment?.effectiveFrom || "-"}</span>
                                <span className="mx-1">←</span>
                                <span>إلى: {d.assignment?.effectiveTo || "مستمر"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-[11px] font-mono">
                                <span className="text-gray-600 dark:text-gray-400">
                                  صافي:{" "}
                                  <strong className="text-gray-900 dark:text-gray-100">
                                    {d.sourceOperation?.net != null
                                      ? `${Number(d.sourceOperation.net).toFixed(2)} ر.س`
                                      : "-"}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  عمولة:{" "}
                                  <strong className="text-emerald-700 dark:text-emerald-400">
                                    {d.sourceOperation?.commission != null
                                      ? `${Number(d.sourceOperation.commission).toFixed(2)} ر.س`
                                      : "-"}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  متبقي:{" "}
                                  <strong className="text-rose-700 dark:text-rose-400">
                                    {d.sourceOperation?.remaining != null
                                      ? `${Number(d.sourceOperation.remaining).toFixed(2)} ر.س`
                                      : "-"}
                                  </strong>
                                </span>
                              </div>
                              {(d.sourceOperation?.reason || d.assignment?.endReason) && (
                                <div
                                  className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[220px]"
                                  title={d.sourceOperation?.reason || d.assignment?.endReason || ""}
                                >
                                  {d.sourceOperation?.reason || d.assignment?.endReason}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                            {d.amount.toFixed(2)} ر.س
                          </td>
                          <td className="py-3 px-3 text-center">
                            {d.paidAtUtc ? (
                              <div className="inline-flex flex-col items-center">
                                <Badge tone="green">مسدد بالكامل</Badge>
                                <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                  {d.paidAtUtc.slice(0, 10)}
                                </span>
                              </div>
                            ) : (
                              <Badge tone="red">غير مسدد</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                            {d.createdAtUtc?.slice(0, 10)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setDetailDebt(d);
                                  setIsDebtDetailOpen(true);
                                }}
                                className="h-7 text-xs font-bold gap-1"
                                title="عرض تفاصيل الالتزام المرحل"
                              >
                                <Eye className="h-3.5 w-3.5 text-gray-500" />
                                <span>التفاصيل</span>
                              </Button>
                              {!d.paidAtUtc && canRepayDebt && (
                                <Button
                                  size="sm"
                                  onClick={() => openSingleDebtRepayModal(d)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs"
                                  title="سداد هذا الالتزام"
                                >
                                  سداد
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* History Pagination */}
              <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 dark:bg-gray-800/40 text-xs text-gray-500">
                <span>
                  عرض {filteredDebts.length} التزام في هذه الصفحة
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadHistoryDebts(historyDebtsPage - 1)}
                    disabled={historyDebtsPage <= 1 || historyDebtsLoading}
                    className="h-7 text-xs"
                  >
                    السابق
                  </Button>
                  <span className="font-mono font-bold px-2">
                    صفحة {historyDebtsPage}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadHistoryDebts(historyDebtsPage + 1)}
                    disabled={debts.length < pageSize || historyDebtsLoading}
                    className="h-7 text-xs"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Submit Cashbox Handover Modal                                     */}
      {/* ================================================================= */}
      <Modal
        isOpen={isSubmitHandoverOpen}
        onClose={() => setIsSubmitHandoverOpen(false)}
        title="تسليم الأموال للمحاسب — إغلاق يومية العمل"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <FileCheck className="h-4 w-4 text-blue-600" />
              حصر الحركات وتسليم العهدة المالية للمحاسب
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              سيقوم النظام بحصر وتجميد كافة الحركات المالية المعلقة حتى نهاية يوم العمل المحدد وتوليد إجمالي نقدية الخزنة وبترو آب والبنك لإرسالها للمحاسب للمطابقة والاعتماد.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              تاريخ يوم العمل المحاسبي *
            </label>
            <Input
              type="date"
              max={todayStr}
              value={handoverBusinessDate}
              onChange={(e) => setHandoverBusinessDate(e.target.value)}
            />
            <span className="text-[10px] text-gray-400">لا يمكن تحديد تاريخ مستقبلي.</span>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              البيان / سبب التسليم *
            </label>
            <Input
              value={handoverReason}
              onChange={(e) => setHandoverReason(e.target.value)}
              placeholder="تسليم الأموال للمحاسب..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsSubmitHandoverOpen(false)}
              disabled={handoverSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmitHandover}
              disabled={handoverSubmitting || !handoverBusinessDate || !handoverReason.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {handoverSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "تأكيد إرسال التسليم للمحاسب"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* Confirm Handover Modal (Accountant)                                */}
      {/* ================================================================= */}
      <Modal
        isOpen={isConfirmHandoverOpen}
        onClose={() => {
          setIsConfirmHandoverOpen(false);
          setTargetHandover(null);
        }}
        title={`مطابقة واعتماد استلام الأموال كمحاسب #${targetHandover?.id.slice(0, 8) || ""}`}
        maxWidth="max-w-md"
      >
        {targetHandover && (
          <div className="space-y-4 text-xs" dir="rtl">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="font-bold mb-1">تعليمات المطابقة الصارمة للمحاسب:</div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                وفق العقد البرمجي: يجب مطابقة وتأكيد المبالغ الدقيقة لكل جهة بشكل مستقل (الخزنة، بترو آب، والبنك). اعتمادك يثبت استلام العهدة وتصفية الأرصدة المعلقة بالخزنة.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border p-2.5 bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">صندوق الخزنة</span>
                <Input
                  type="number"
                  step="any"
                  value={confirmCashboxAmount}
                  onChange={(e) => setConfirmCashboxAmount(Number(e.target.value))}
                  className="font-mono font-bold"
                />
              </div>
              <div className="rounded-xl border p-2.5 bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">محفظة بترو آب</span>
                <Input
                  type="number"
                  step="any"
                  value={confirmPetroAppAmount}
                  onChange={(e) => setConfirmPetroAppAmount(Number(e.target.value))}
                  className="font-mono font-bold"
                />
              </div>
              <div className="rounded-xl border p-2.5 bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">الحساب البنكي</span>
                <Input
                  type="number"
                  step="any"
                  value={confirmBankAmount}
                  onChange={(e) => setConfirmBankAmount(Number(e.target.value))}
                  className="font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                سبب وبيان الاعتماد *
              </label>
              <Input
                value={confirmReason}
                onChange={(e) => setConfirmReason(e.target.value)}
                placeholder="تم الاستلام والمطابقة..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                variant="secondary"
                onClick={() => setIsConfirmHandoverOpen(false)}
                disabled={confirmSubmitting}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleConfirmHandover}
                disabled={confirmSubmitting || !confirmReason.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {confirmSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "تأكيد ومطابقة الاستلام"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* Cancel Handover Modal                                              */}
      {/* ================================================================= */}
      <Modal
        isOpen={isCancelHandoverOpen}
        onClose={() => {
          setIsCancelHandoverOpen(false);
          setTargetHandover(null);
        }}
        title={`إلغاء التسليم المعلق #${targetHandover?.id.slice(0, 8) || ""}`}
        maxWidth="max-w-md"
      >
        {targetHandover && (
          <div className="space-y-4 text-xs" dir="rtl">
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <div className="font-bold mb-1">تنبيه الإلغاء:</div>
              <p className="text-[11px] text-rose-800 dark:text-rose-300">
                إلغاء التسليم المعلق يحرر الحركات المالية المشمولة فيه لتعود كحركات معلقة يمكن تعديل طرق دفعها أو إعادة تسليمها للمحاسب لاحقاً.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                سبب الإلغاء *
              </label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="إلغاء وإعادة المطابقة..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                variant="secondary"
                onClick={() => setIsCancelHandoverOpen(false)}
                disabled={cancelSubmitting}
              >
                تراجع
              </Button>
              <Button
                onClick={handleCancelHandover}
                disabled={cancelSubmitting || !cancelReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {cancelSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "تأكيد إلغاء التسليم"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* Bulk Rider Transferred Debt Repayment Modal                      */}
      {/* ================================================================= */}
      <Modal
        isOpen={isBulkRepayOpen}
        onClose={() => setIsBulkRepayOpen(false)}
        title="سداد كامل المستحق المرحّل على المندوب"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {bulkRepayRider && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <div className="flex items-center justify-between font-bold text-sm mb-1.5">
                  <span>{bulkRepayRider.userRider?.nameAr || bulkRepayRider.userRider?.nameEn || "بيانات المندوب"}</span>
                  <span className="font-mono text-base text-emerald-700 dark:text-emerald-400">
                    {Number(bulkRepayExpectedAmount).toFixed(2)} ر.س
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-300 space-y-0.5">
                  <div>هوية / إقامة: <span className="font-mono font-bold">{bulkRepayRider.userRider?.iqamaNo || "-"}</span></div>
                  <div>عدد الالتزامات المرحلة: <span className="font-bold">{bulkRepayRider.unpaidDebtCount}</span></div>
                </div>
                {bulkRepayRider.amounts && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[10px] grid grid-cols-2 gap-1 font-mono">
                    <div>داشبورد جاهز: {Number(bulkRepayRider.amounts.dashboardDebt).toFixed(2)} ر.س</div>
                    <div>العمولة: {Number(bulkRepayRider.amounts.commission).toFixed(2)} ر.س</div>
                  </div>
                )}
                <div className="mt-2 text-[10px] text-emerald-800 dark:text-emerald-300">
                  تنبيه: يُسدد كامل المبلغ الفعلي نقداً بصندوق الخزنة (جهة ثابتة: 1). لا يمكن التجزئة أو الخصم.
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  المبلغ الإجمالي المعتمد للسداد (ثابت)
                </label>
                <Input
                  value={`${Number(bulkRepayExpectedAmount).toFixed(2)} ر.س`}
                  disabled
                  className="font-mono font-bold bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  الجهة المالية المستلمة
                </label>
                <Input
                  value="صندوق الخزنة (نقدياً - سياسة ثابتة)"
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  رقم الإيصال / المرجع الفعلي للقبض *
                </label>
                <Input
                  value={bulkRepayRef}
                  onChange={(e) => setBulkRepayRef(e.target.value)}
                  placeholder="مثال: RCPT-20261021-001"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  البيان والسبب *
                </label>
                <Input
                  value={bulkRepayReason}
                  onChange={(e) => setBulkRepayReason(e.target.value)}
                  placeholder="تحصيل كامل المديونيات المرحلة على المندوب"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setIsBulkRepayOpen(false)}
                  disabled={bulkRepaySubmitting}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={submitBulkRepayment}
                  disabled={bulkRepaySubmitting || !bulkRepayRef.trim() || !bulkRepayReason.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {bulkRepaySubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    `تأكيد قبض ${Number(bulkRepayExpectedAmount).toFixed(2)} ر.س`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* Single Transferred Debt Repayment Modal                          */}
      {/* ================================================================= */}
      <Modal
        isOpen={isSingleRepayOpen}
        onClose={() => setIsSingleRepayOpen(false)}
        title="سداد التزام مالي مرحّل"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {singleRepayDebt && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <div className="flex items-center justify-between font-bold text-sm mb-1.5">
                  <span>المبلغ المطلوب سداده:</span>
                  <span className="font-mono text-base text-emerald-700 dark:text-emerald-400">
                    {Number(singleRepayDebt.amount).toFixed(2)} ر.س
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-300 space-y-0.5">
                  <div>المندوب: <span className="font-bold">{singleRepayDebt.userRider?.nameAr || singleRepayDebt.userRider?.nameEn || "-"}</span></div>
                  <div>حساب المنصة: <span className="font-mono font-bold">{singleRepayDebt.assignment?.externalAccountId || "-"}</span></div>
                  {singleRepayDebt.sourceOperation?.throughDate && (
                    <div>تاريخ الاحتساب: <span className="font-mono">{singleRepayDebt.sourceOperation.throughDate}</span></div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  الجهة المالية المستلمة
                </label>
                <Input
                  value="صندوق الخزنة (نقدياً)"
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  رقم الإيصال / المرجع *
                </label>
                <Input
                  value={singleRepayRef}
                  onChange={(e) => setSingleRepayRef(e.target.value)}
                  placeholder="مثال: RCPT-20261021-002"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  البيان والسبب *
                </label>
                <Input
                  value={singleRepayReason}
                  onChange={(e) => setSingleRepayReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setIsSingleRepayOpen(false)}
                  disabled={singleRepaySubmitting}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={submitSingleDebtRepayment}
                  disabled={singleRepaySubmitting || !singleRepayRef.trim() || !singleRepayReason.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {singleRepaySubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    `تأكيد قبض ${Number(singleRepayDebt.amount).toFixed(2)} ر.س`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* Rider Transferred Debt Details Drawer / Modal                    */}
      {/* ================================================================= */}
      <Modal
        isOpen={isRiderDrawerOpen}
        onClose={() => {
          setIsRiderDrawerOpen(false);
          setSelectedRiderSummary(null);
        }}
        title={`تفاصيل المديونيات المرحلة — ${selectedRiderSummary?.userRider?.nameAr || selectedRiderSummary?.userRider?.nameEn || "المندوب"}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {selectedRiderSummary && (
            <div className="space-y-4">
              {/* Rider Summary Card */}
              <div className="rounded-2xl bg-gradient-to-l from-rose-50 to-amber-50 p-4 border border-rose-200/70 dark:from-rose-950/40 dark:to-amber-950/30 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span>{selectedRiderSummary.userRider?.nameAr || selectedRiderSummary.userRider?.nameEn || "بيانات الهوية غير متاحة"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 font-mono mt-1">
                    <span>الهوية: {selectedRiderSummary.userRider?.iqamaNo || "-"}</span>
                    <span>•</span>
                    <span dir="ltr">الجوال: {selectedRiderSummary.userRider?.mobile || "-"}</span>
                    {selectedRiderSummary.userRider?.sponsorNameAr && (
                      <>
                        <span>•</span>
                        <span>الكفيل: {selectedRiderSummary.userRider.sponsorNameAr}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right sm:text-left flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">إجمالي المستحق المرحل ({selectedRiderSummary.unpaidDebtCount} ديون)</span>
                    <span className="font-black font-mono text-xl text-rose-700 dark:text-rose-400">
                      {Number(selectedRiderSummary.outstandingAmount).toFixed(2)} ر.س
                    </span>
                  </div>
                  {canRepayDebt && (
                    <Button
                      onClick={() => openBulkRepayModal(selectedRiderSummary)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs shrink-0"
                    >
                      سداد كامل المستحق
                    </Button>
                  )}
                </div>
              </div>

              {/* Amounts Breakdown if available */}
              {selectedRiderSummary.amounts && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl bg-white p-3 border border-gray-200 dark:border-gray-800 dark:bg-gray-900 text-center shadow-xs">
                    <span className="text-[10px] text-gray-500 font-medium block">مديونية داشبورد جاهز المدخلة</span>
                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-gray-100 mt-0.5 block">
                      {Number(selectedRiderSummary.amounts.dashboardDebt).toFixed(2)} ر.س
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-gray-200 dark:border-gray-800 dark:bg-gray-900 text-center shadow-xs">
                    <span className="text-[10px] text-gray-500 font-medium block">العمولة المستحقة للشركة</span>
                    <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {Number(selectedRiderSummary.amounts.commission).toFixed(2)} ر.س
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-gray-200 dark:border-gray-800 dark:bg-gray-900 text-center shadow-xs">
                    <span className="text-[10px] text-gray-500 font-medium block">إجمالي الترحيل المعتمد</span>
                    <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400 mt-0.5 block">
                      {Number(selectedRiderSummary.amounts.total).toFixed(2)} ر.س
                    </span>
                  </div>
                </div>
              )}

              {/* Table of Debts */}
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/60 font-bold text-gray-600 dark:text-gray-300 border-b">
                    <tr>
                      <th className="py-2.5 px-3">حساب المنصة والتكليف</th>
                      <th className="py-2.5 px-3">تاريخ الاحتساب والبيان</th>
                      <th className="py-2.5 px-3 text-center">الصافي / العمولة</th>
                      <th className="py-2.5 px-3 text-center">مبلغ الدين</th>
                      <th className="py-2.5 px-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {riderDetailLoading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-emerald-500 mb-1" />
                          جارٍ تحميل تفاصيل المديونيات...
                        </td>
                      </tr>
                    ) : riderDetailDebts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          لا توجد مديونيات مرحلة غير مسددة لهذا المندوب
                        </td>
                      </tr>
                    ) : (
                      riderDetailDebts.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {d.assignment?.externalAccountId || "-"}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              من {d.assignment?.startedAtUtc?.slice(0, 10) || d.assignment?.effectiveFrom || "-"} إلى {d.assignment?.endedAtUtc?.slice(0, 10) || d.assignment?.effectiveTo || "-"}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-gray-800 dark:text-gray-200">
                              حتى: {d.sourceOperation?.throughDate || d.createdAtUtc?.slice(0, 10) || "-"}
                            </div>
                            {d.sourceOperation?.reason && (
                              <div className="text-[10px] text-gray-500 truncate max-w-[200px]" title={d.sourceOperation.reason}>
                                {d.sourceOperation.reason}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            <div>صافي: {d.sourceOperation?.net != null ? `${Number(d.sourceOperation.net).toFixed(2)}` : "-"}</div>
                            <div className="text-emerald-600">عمولة: {d.sourceOperation?.commission != null ? `${Number(d.sourceOperation.commission).toFixed(2)}` : "-"}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700 dark:text-rose-400">
                            {Number(d.amount).toFixed(2)} ر.س
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {canRepayDebt && (
                              <Button
                                size="sm"
                                onClick={() => openSingleDebtRepayModal(d)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-6 text-[11px] px-2"
                              >
                                سداد هذا الدين
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="secondary" onClick={() => setIsRiderDrawerOpen(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* Transferred Debt Details Modal                                    */}
      {/* ================================================================= */}
      <Modal
        isOpen={isDebtDetailOpen}
        onClose={() => setIsDebtDetailOpen(false)}
        title="تفاصيل الالتزام المالي المرحل"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {detailDebt && (
            <div className="space-y-4">
              {/* Top Banner */}
              <div className="rounded-2xl bg-rose-50/80 p-4 border border-rose-200/70 dark:bg-rose-950/40 dark:border-rose-900/60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">المبلغ المرحل المستحق</span>
                    <span className="font-black font-mono text-xl text-rose-700 dark:text-rose-400">
                      {detailDebt.amount.toFixed(2)} ر.س
                    </span>
                  </div>
                  <div className="text-left">
                    {detailDebt.paidAtUtc ? (
                      <div className="flex flex-col items-end">
                        <Badge tone="green">مسدد بالكامل</Badge>
                        <span className="text-[10px] text-gray-500 font-mono mt-1">
                          تاريخ السداد: {detailDebt.paidAtUtc.slice(0, 10)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <Badge tone="red">غير مسدد (قيد التحصيل)</Badge>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          التزام مالي مرحل
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-2 pt-2 border-t border-rose-200/50 dark:border-rose-900/40">
                  تاريخ الترحيل: {detailDebt.createdAtUtc?.slice(0, 16).replace("T", " ")}
                </div>
              </div>

              {/* Rider Details Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-800/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs border-b pb-1.5 dark:border-gray-700">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span>بيانات المندوب الفعلي</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">الاسم:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {detailDebt.userRider?.nameAr || detailDebt.userRider?.nameEn || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">رقم الإقامة / الهوية:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                      {detailDebt.userRider?.iqamaNo || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">رقم الجوال:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                      {detailDebt.userRider?.mobile || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-800/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs border-b pb-1.5 dark:border-gray-700">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>بيانات الحساب والتكليف المنتهي</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">رقم حساب المنصة:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {detailDebt.assignment?.externalAccountId || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">حالة التكليف:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {detailDebt.assignment?.status || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">تاريخ البداية:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                      {detailDebt.assignment?.effectiveFrom || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">تاريخ النهاية:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                      {detailDebt.assignment?.effectiveTo || "-"}
                    </span>
                  </div>
                  {detailDebt.assignment?.startReason && (
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400 block text-[11px]">سبب الاستلام:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {detailDebt.assignment.startReason}
                      </span>
                    </div>
                  )}
                  {detailDebt.assignment?.endReason && (
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400 block text-[11px]">سبب السحب والإنهاء:</span>
                      <span className="text-gray-700 dark:text-gray-300 font-semibold text-rose-700 dark:text-rose-400">
                        {detailDebt.assignment.endReason}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Source Operation Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-800/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs border-b pb-1.5 dark:border-gray-700">
                  <Coins className="h-4 w-4 text-amber-600" />
                  <span>تفاصيل التصفية المالية الأصلية</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <div>
                    <span className="text-[10px] text-gray-500 block">صافي التصفية</span>
                    <span className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                      {detailDebt.sourceOperation?.net != null
                        ? `${Number(detailDebt.sourceOperation.net).toFixed(2)} ر.س`
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">عمولة الشركة</span>
                    <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      {detailDebt.sourceOperation?.commission != null
                        ? `${Number(detailDebt.sourceOperation.commission).toFixed(2)} ر.س`
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">المبلغ المتبقي</span>
                    <span className="font-mono font-black text-xs text-rose-700 dark:text-rose-400">
                      {detailDebt.sourceOperation?.remaining != null
                        ? `${Number(detailDebt.sourceOperation.remaining).toFixed(2)} ر.س`
                        : "-"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">تاريخ الاحتساب:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                      {detailDebt.sourceOperation?.throughDate || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px]">تاريخ التنفيذ:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                      {detailDebt.sourceOperation?.executedAtUtc?.slice(0, 10) || "-"}
                    </span>
                  </div>
                  {detailDebt.sourceOperation?.reason && (
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400 block text-[11px]">بيان العملية:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {detailDebt.sourceOperation.reason}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="secondary" onClick={() => setIsDebtDetailOpen(false)}>
                  إغلاق
                </Button>
                {!detailDebt.paidAtUtc && canRepayDebt && (
                  <Button
                    onClick={() => {
                      setIsDebtDetailOpen(false);
                      openSingleDebtRepayModal(detailDebt);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    سداد هذا الالتزام
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>


      {/* ================================================================= */}
      {/* Fee Receipt Modal                                                  */}
      {/* ================================================================= */}
      <Modal
        isOpen={isFeeOpen}
        onClose={() => setIsFeeOpen(false)}
        title="قبض رسوم فتح حساب مستقلة"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-gray-700 dark:text-gray-300">
                فترة التسليم / الحساب النشط *
              </label>
              <button
                type="button"
                onClick={() => setManualHandoverMode(!manualHandoverMode)}
                className="text-[11px] font-bold text-amber-600 hover:underline dark:text-amber-400"
              >
                {manualHandoverMode ? "اختر من القائمة المنسدلة" : "إدخال يدوي للمعرف"}
              </button>
            </div>

            {!manualHandoverMode ? (
              <SearchableSelect
                options={handoverOptions}
                value={feeHandoverId}
                onChange={setFeeHandoverId}
                placeholder="اختر فترة التسليم أو ابحث بالحساب أو المندوب..."
                searchPlaceholder="ابحث برقم الحساب، اسم المندوب، أو رقم الإقامة..."
                noOptionsText="لا توجد فترات تسليم نشطة حالياً"
              />
            ) : (
              <Input
                value={feeHandoverId}
                onChange={(e) => setFeeHandoverId(e.target.value)}
                placeholder="أدخل Handover ID يدوياً..."
              />
            )}
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              المبلغ المقبوض (ريال) *
            </label>
            <Input
              type="number"
              value={feeAmount}
              onChange={(e) => setFeeAmount(Number(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              الجهة المستلمة
            </label>
            <select
              value={feeFund}
              onChange={(e) => setFeeFund(Number(e.target.value) as Fund)}
              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800"
            >
              <option value={Fund.Cashbox}>صندوق الخزنة</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              مرجع الحركة الفعلية *
            </label>
            <Input
              value={feeRef}
              onChange={(e) => setFeeRef(e.target.value)}
              placeholder="رقم إيصال القبض..."
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              السبب / البيان
            </label>
            <Input value={feeReason} onChange={(e) => setFeeReason(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsFeeOpen(false)}
              disabled={feeSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={submitFeeReceipt}
              disabled={feeSubmitting || !feeHandoverId.trim() || !feeRef.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {feeSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "تسجيل الإيصال"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit Payment Method */}
      <EditPaymentMethodModal
        isOpen={isEditPaymentOpen}
        onClose={() => {
          setIsEditPaymentOpen(false);
          setEditPaymentOpId(null);
          setEditPaymentInitialOp(null);
          setEditPaymentMovement(null);
        }}
        operationId={editPaymentOpId}
        initialOperation={editPaymentInitialOp}
        contextInfo={editPaymentContext}
        canSettle={canSettle}
        canDisburse={canDisburse}
        onOpenCorrectCommission={() => {
          if (editPaymentMovement) {
            openCorrectCommissionModal(editPaymentMovement);
          }
        }}
        onSuccess={() => {
          loadAllData(page);
        }}
      />

      {/* Modal: Correct Commission Start */}
      <CorrectCommissionStartModal
        isOpen={isCorrectCommissionOpen}
        onClose={() => {
          setIsCorrectCommissionOpen(false);
          setCorrectCommissionMovement(null);
        }}
        movement={correctCommissionMovement}
        canSettle={canSettle}
        canApproveAdjustment={canApproveAdjustment}
        canReceive={canReceive}
        canDisburse={canDisburse}
        onSuccess={(updatedOp) => {
          loadAllData(page);
          if (selectedMovement && selectedMovement.operationId === updatedOp.id) {
            setSelectedMovement((prev) =>
              prev
                ? {
                    ...prev,
                    commission: updatedOp.commission,
                    calculatedCommission: updatedOp.calculatedCommission,
                    startDate: updatedOp.commissionStartDate || prev.startDate,
                    operationRowVersion: updatedOp.rowVersion,
                    amount: Math.abs(updatedOp.remaining),
                    direction: updatedOp.remaining >= 0 ? Direction.Receipt : Direction.Disbursement,
                    fund: updatedOp.fund ?? prev.fund,
                    reference: updatedOp.paymentReference ?? prev.reference,
                  }
                : null,
            );
          }
        }}
      />

      {/* ================================================================= */}
      {/* Movement Details Modal                                             */}
      {/* ================================================================= */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedMovement(null);
        }}
        title="تفاصيل الحركة المالية"
        maxWidth="max-w-2xl"
      >
        {selectedMovement && (
          <div className="space-y-4 text-xs" dir="rtl">
            {/* Top overview card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-gradient-to-l from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-900 p-4 border border-gray-200 dark:border-gray-700 shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="text-base font-black text-gray-900 dark:text-white">
                    {getPurposeLabel(selectedMovement.purpose)}
                  </div>
                  {selectedMovement.platformAccountId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-mono">
                      حساب: {selectedMovement.platformAccountId}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span>تاريخ الحركة: {selectedMovement.occurredAtUtc?.slice(0, 16).replace("T", " ")}</span>
                </div>
              </div>

              <div className="text-right sm:text-left space-y-1.5">
                <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                  {selectedMovement.amount.toFixed(2)} ر.س
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <Badge tone={selectedMovement.direction === Direction.Receipt ? "green" : "red"}>
                    {selectedMovement.direction === Direction.Receipt ? "قبض" : "صرف"}
                  </Badge>
                  <Badge tone="blue">{getFundLabel(selectedMovement.fund)}</Badge>
                  {selectedMovement.isHandedToAccountant ? (
                    <Badge tone="green">مسلّمة للمحاسب</Badge>
                  ) : selectedMovement.cashboxHandoverId ? (
                    <Badge tone="orange">قيد تسليم معلق</Badge>
                  ) : (
                    <Badge tone="gray">معلقة بالخزنة</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* تفاصيل مبالغ التصفية والعمولة */}
            {(selectedMovement.net != null ||
              selectedMovement.commission != null ||
              selectedMovement.startDate ||
              selectedMovement.endDate) && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 bg-gray-50/60 dark:bg-gray-800/40">
                <div className="font-bold text-gray-800 dark:text-gray-200 mb-2.5 flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  <span>تفاصيل مبالغ التصفية والعمولة</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <div className="rounded-xl bg-white p-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-center shadow-xs">
                    <div className="text-[11px] text-gray-500 font-medium">صافي المبلغ المُدخل للتصفية</div>
                    <div className="font-mono font-bold text-sm text-gray-900 dark:text-white mt-1">
                      {selectedMovement.net != null ? `${Number(selectedMovement.net).toFixed(2)} ر.س` : "-"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-center shadow-xs">
                    <div className="text-[11px] text-gray-500 font-medium">عمولة الشركة المعتمدة</div>
                    <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                      {selectedMovement.commission != null ? `${Number(selectedMovement.commission).toFixed(2)} ر.س` : "-"}
                    </div>
                  </div>
                  {(selectedMovement.startDate || selectedMovement.endDate) && (
                    <div className="rounded-xl bg-white p-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-center shadow-xs sm:col-span-2 lg:col-span-1">
                      <div className="text-[11px] text-gray-500 font-medium">فترة احتساب العمولة (شامل)</div>
                      <div className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 mt-1 flex items-center justify-center gap-1.5">
                        <span>{selectedMovement.startDate || "-"}</span>
                        <span>←</span>
                        <span>{selectedMovement.endDate || "-"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grid details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* الغرض والبيان */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 bg-white dark:bg-gray-900 shadow-xs">
                <div className="font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-gray-400" />
                  <span>البيان والملاحظات</span>
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                  {selectedMovement.reason || "لا توجد ملاحظات مسجلة"}
                </div>
              </div>

              {/* الكفيل */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 bg-white dark:bg-gray-900 shadow-xs">
                <div className="font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <span>الكفيل</span>
                </div>
                <div className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                  {getMovementSponsorName(selectedMovement) || "غير محدد"}
                </div>
              </div>

              {/* المندوب الفعلي المستخدم */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 bg-white dark:bg-gray-900 shadow-xs">
                <div className="font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>المندوب الفعلي (المستخدم)</span>
                </div>
                {selectedMovement.userRider ? (
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {selectedMovement.userRider.nameAr || selectedMovement.userRider.nameEn || "-"}
                    </div>
                    {selectedMovement.userRider.iqamaNo && (
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 font-mono">
                        رقم الإقامة: {selectedMovement.userRider.iqamaNo}
                      </div>
                    )}
                    {selectedMovement.userRider.mobile && (
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 font-mono" dir="ltr">
                        الجوال: {selectedMovement.userRider.mobile}
                      </div>
                    )}
                    {selectedMovement.userRider.sponsorNameAr && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-0.5">
                        كفيل المندوب: {selectedMovement.userRider.sponsorNameAr}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 font-mono text-[11px]">غير مسند</span>
                )}
              </div>

              {/* صاحب الحساب المالك */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 bg-white dark:bg-gray-900 shadow-xs">
                <div className="font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-500" />
                  <span>صاحب الحساب الرسمي (المالك)</span>
                </div>
                {selectedMovement.ownerRider ? (
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {selectedMovement.ownerRider.nameAr || selectedMovement.ownerRider.nameEn || "-"}
                    </div>
                    {selectedMovement.ownerRider.iqamaNo && (
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 font-mono">
                        رقم الإقامة: {selectedMovement.ownerRider.iqamaNo}
                      </div>
                    )}
                    {selectedMovement.ownerRider.mobile && (
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 font-mono" dir="ltr">
                        الجوال: {selectedMovement.ownerRider.mobile}
                      </div>
                    )}
                    {selectedMovement.ownerRider.sponsorNameAr && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-0.5">
                        كفيل المالك: {selectedMovement.ownerRider.sponsorNameAr}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 font-mono text-[11px]">-</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div>
                {selectedMovement.purpose === Purpose.Settlement &&
                  Boolean(selectedMovement.operationId) &&
                  canCorrectCommission && (
                    Boolean(selectedMovement.cashboxHandoverId || selectedMovement.isHandedToAccountant) ? (
                      <span
                        className="inline-flex items-center justify-center h-8 px-2.5 rounded-xl text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed gap-1.5 border border-gray-200 dark:border-gray-700"
                        title="لا يمكن تصحيح احتساب العمولة لأن الحركة مشمولة في تسليم محاسب معلق أو معتمد"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        مشمولة في تسليم محاسب (مقفل)
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          const m = selectedMovement;
                          setIsDetailsOpen(false);
                          openCorrectCommissionModal(m);
                        }}
                        className="h-8 px-3 text-xs font-bold gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900 shadow-2xs"
                        title="تصحيح بداية احتساب عمولة التصفية"
                      >
                        <CalendarCheck className="h-3.5 w-3.5" />
                        تصحيح بداية احتساب العمولة
                      </Button>
                    )
                  )}
              </div>

              <Button variant="secondary" onClick={() => setIsDetailsOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
