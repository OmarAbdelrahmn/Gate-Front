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
  type FundBalance,
  type Movement,
  type TransferredDebt,
  type Account,
  type RiderPerson,
  type CashboxHandover,
} from "@/lib/jahez/types";
import { listRiders, listSponsors, type Sponsor } from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { EditPaymentMethodModal } from "@/components/jahez/EditPaymentMethodModal";
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
} from "lucide-react";

export default function JahezCashboxPage() {
  const { user, can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Permissions
  const canSettle = can("jahez.settle");
  const canDisburse = can("jahez.money.disburse");
  const canEditPayment = canSettle && canDisburse;
  const canSubmitHandover = can("jahez.cashbox.submit");
  const canConfirmHandover = can("jahez.cashbox.confirm");

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
  const [editPaymentContext, setEditPaymentContext] = useState<{
    riderName?: string | null;
    accountCode?: string | null;
    settlementDate?: string | null;
  } | undefined>(undefined);

  // Repay Debt Modal State
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<TransferredDebt | null>(null);
  const [repayFund, setRepayFund] = useState<Fund>(Fund.Cashbox);
  const [repayRef, setRepayRef] = useState("");
  const [repayReason, setRepayReason] = useState("سداد كامل المستحق المرحل");
  const [repaySubmitting, setRepaySubmitting] = useState(false);

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
      const [fundsRes, movRes, debtsRes, accRes, ridersRes, sponsorsRes, handoversRes] =
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
    return (
      m.id.toLowerCase().includes(q) ||
      m.reference.toLowerCase().includes(q) ||
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
    return (
      d.id.toLowerCase().includes(q) ||
      d.operationId.toLowerCase().includes(q) ||
      d.riderProfileId.toLowerCase().includes(q)
    );
  });

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
      toast.error("فشل التسليم", err instanceof Error ? err.message : "تعذر تسليم الأموال للمحاسب");
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
      toast.error("فشل الاعتماد", err instanceof Error ? err.message : "تعذر اعتماد تسليم الأموال");
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

  // Repayment Handler
  const openRepayModal = (debt: TransferredDebt) => {
    setSelectedDebt(debt);
    setRepayFund(Fund.Cashbox);
    setRepayRef(`REPAY-${Date.now().toString().slice(-6)}`);
    setRepayReason("سداد كامل المستحق المرحل");
    setIsRepayOpen(true);
  };

  const submitRepayment = async () => {
    if (!selectedDebt) return;
    setRepaySubmitting(true);
    try {
      await repayJahezTransferredDebt(selectedDebt.id, {
        fund: repayFund,
        reference: repayRef.trim() || "DEBT-REPAY-CASH",
        reason: repayReason.trim() || "سداد كامل المستحق",
        purpose: Purpose.TransferredDebtRepayment,
      });
      setIsRepayOpen(false);
      loadAllData(page);
    } catch (err: unknown) {
      toast.error("فشل السداد", err instanceof Error ? err.message : "تعذر سداد المستحق المرحل");
    } finally {
      setRepaySubmitting(false);
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
      toast.warning("تنبيه", "يرجى إدخال معرف فترة التسليم (Handover ID)");
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
      "رقم الحركة": m.id,
      "الجهة": getFundLabel(m.fund),
      "الاتجاه": m.direction === Direction.Receipt ? "قبض" : "صرف",
      "الغرض": getPurposeLabel(m.purpose),
      "المبلغ": m.amount,
      "المرجع": m.reference,
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
            تصدير الحركات (Excel)
          </Button>
        </div>
      </div>

      {/* Outstanding Funds Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* الخزنة */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-emerald-600" />
              الخزنة النقدية (Cashbox = 1)
            </span>
            <Badge tone="green">أرصدة معلقة</Badge>
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
              بترو آب (PetroApp = 2)
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
              البنك (Bank = 3)
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
          المستحقات والالتزامات المرحلة ({debts.length})
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
                  placeholder="بحث برقم الحركة، المرجع، البيان، اسم المندوب، الكفيل، أو رقم الإقامة..."
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
                    <th className="py-3 px-3">رقم الحركة</th>
                    <th className="py-3 px-3">المندوب الفعلي (المستخدم)</th>
                    <th className="py-3 px-3">صاحب الحساب (المالك)</th>
                    <th className="py-3 px-3">الكفيل</th>
                    <th className="py-3 px-3">الجهة</th>
                    <th className="py-3 px-3 text-center">الاتجاه</th>
                    <th className="py-3 px-3">الغرض</th>
                    <th className="py-3 px-3 text-center">المبلغ</th>
                    <th className="py-3 px-3 text-center">تسليم المحاسب</th>
                    <th className="py-3 px-3">المرجع</th>
                    <th className="py-3 px-3">التاريخ والوقت</th>
                    <th className="py-3 px-3">البيان</th>
                    <th className="py-3 px-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500 mb-2" />
                        جارٍ تحميل الحركات المالية...
                      </td>
                    </tr>
                  ) : filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-gray-500">
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
                          <td className="py-3 px-3 font-mono font-bold">#{m.id.slice(0, 8)}</td>

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

                          <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400">
                            {m.reference}
                          </td>
                          <td className="py-3 px-3 text-gray-400">
                            {m.occurredAtUtc?.slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {m.reason}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
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
                                    className="inline-flex items-center justify-center h-7 px-2 rounded-xl text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed gap-1"
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
                                      setEditPaymentOpId(m.operationId);
                                      setEditPaymentContext({
                                        riderName:
                                          m.userRider?.nameAr ||
                                          m.ownerRider?.nameAr ||
                                          fallbackRider?.fullNameAr,
                                        settlementDate: m.occurredAtUtc?.slice(0, 10),
                                      });
                                      setIsEditPaymentOpen(true);
                                    }}
                                    className="h-7 px-2 text-[11px] font-bold gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900 shadow-2xs"
                                    title="تعديل طريقة صرف التصفية (الخزنة ↔ الحساب البنكي)"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                    تعديل الدفع
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

      {/* Tab 3: Transferred Debts Table */}
      {activeTab === "transferredDebts" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3">رقم الالتزام</th>
                    <th className="py-3 px-3">رقم العملية الأصلية</th>
                    <th className="py-3 px-3">معرف المندوب الفعلي</th>
                    <th className="py-3 px-3 text-center">المبلغ المستحق</th>
                    <th className="py-3 px-3 text-center">حالة السداد</th>
                    <th className="py-3 px-3">تاريخ التسجيل</th>
                    <th className="py-3 px-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500 mb-2" />
                        جارٍ تحميل الالتزامات المرحلة...
                      </td>
                    </tr>
                  ) : filteredDebts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        لا توجد مستحقات مرحلة مسجلة
                      </td>
                    </tr>
                  ) : (
                    filteredDebts.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="py-3 px-3 font-mono font-bold">#{d.id.slice(0, 8)}</td>
                        <td className="py-3 px-3 font-mono text-gray-500">
                          {d.operationId.slice(0, 8)}
                        </td>
                        <td className="py-3 px-3 font-mono">{d.riderProfileId.slice(0, 8)}</td>
                        <td className="py-3 px-3 text-center font-mono font-black text-rose-700 text-sm">
                          {d.amount.toFixed(2)} ر.س
                        </td>
                        <td className="py-3 px-3 text-center">
                          {d.paidAtUtc ? (
                            <Badge tone="green">مسدد بالكامل</Badge>
                          ) : (
                            <Badge tone="red">معلق (حظر مالي)</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-400">
                          {d.createdAtUtc?.slice(0, 10)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {!d.paidAtUtc ? (
                            <Button
                              size="sm"
                              onClick={() => openRepayModal(d)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-xs"
                            >
                              سداد كامل المستحق
                            </Button>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              تم السداد {d.paidAtUtc.slice(0, 10)}
                            </span>
                          )}
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
              تاريخ يوم العمل المحاسبي (Riyadh Business Date) *
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
                <span className="text-[10px] text-gray-500 font-bold block mb-1">الخزنة (Cashbox)</span>
                <Input
                  type="number"
                  step="any"
                  value={confirmCashboxAmount}
                  onChange={(e) => setConfirmCashboxAmount(Number(e.target.value))}
                  className="font-mono font-bold"
                />
              </div>
              <div className="rounded-xl border p-2.5 bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">بترو آب (PetroApp)</span>
                <Input
                  type="number"
                  step="any"
                  value={confirmPetroAppAmount}
                  onChange={(e) => setConfirmPetroAppAmount(Number(e.target.value))}
                  className="font-mono font-bold"
                />
              </div>
              <div className="rounded-xl border p-2.5 bg-gray-50 dark:bg-gray-800">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">البنك (Bank)</span>
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
      {/* Repay Modal                                                        */}
      {/* ================================================================= */}
      <Modal
        isOpen={isRepayOpen}
        onClose={() => setIsRepayOpen(false)}
        title="سداد كامل المستحق المرحل"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {selectedDebt && (
            <div className="rounded-xl bg-rose-50 p-3 text-rose-950 dark:bg-rose-950/40 dark:text-rose-200">
              <div className="font-bold text-sm">
                المبلغ الإجمالي للسداد: {selectedDebt.amount.toFixed(2)} ريال
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-0.5">
                وفق القواعد الصارمة: يُسدد المبلغ بالكامل دون تجزئة. سداد كامل الدين يرفع سبب الحظر
                المالي عن المندوب.
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              الجهة المالية المستلمة *
            </label>
            <select
              value={repayFund}
              onChange={(e) => setRepayFund(Number(e.target.value) as Fund)}
              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800"
            >
              <option value={Fund.Cashbox}>الخزنة (Cashbox)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              مرجع الحركة الفعلية *
            </label>
            <Input
              value={repayRef}
              onChange={(e) => setRepayRef(e.target.value)}
              placeholder="رقم إيصال الخزنة..."
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              البيان / ملاحظات
            </label>
            <Input value={repayReason} onChange={(e) => setRepayReason(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsRepayOpen(false)}
              disabled={repaySubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={submitRepayment}
              disabled={repaySubmitting || !repayRef.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {repaySubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "تأكيد السداد"}
            </Button>
          </div>
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
              <option value={Fund.Cashbox}>الخزنة (Cashbox)</option>
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
        }}
        operationId={editPaymentOpId}
        contextInfo={editPaymentContext}
        canSettle={canSettle}
        canDisburse={canDisburse}
        onSuccess={() => {
          loadAllData(page);
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
        title={`تفاصيل الحركة المالية #${selectedMovement?.id.slice(0, 8) || ""}`}
        maxWidth="max-w-2xl"
      >
        {selectedMovement && (
          <div className="space-y-4 text-xs" dir="rtl">
            {/* Top overview card */}
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-[11px] text-gray-400">معرف الحركة الكامل</div>
                <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                  {selectedMovement.id}
                </div>
                <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span>{selectedMovement.occurredAtUtc?.slice(0, 19).replace("T", " ")}</span>
                </div>
              </div>
              <div className="text-left">
                <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                  {selectedMovement.amount.toFixed(2)} ر.س
                </div>
                <div className="flex items-center gap-1.5 mt-1 justify-end">
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

            {/* Grid details */}
            <div className="grid grid-cols-2 gap-3">
              {/* الغرض والبيان */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                <div className="font-bold text-gray-500 mb-1">الغرض والبيان</div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">
                  {getPurposeLabel(selectedMovement.purpose)}
                </div>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedMovement.reason || "-"}
                </div>
                <div className="text-[11px] text-gray-400 font-mono mt-1">
                  المرجع: {selectedMovement.reference || "-"}
                </div>
              </div>

              {/* الكفيل */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                <div className="font-bold text-gray-500 mb-1 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  الكفيل (Sponsor)
                </div>
                <div className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                  {getMovementSponsorName(selectedMovement) || "غير محدد"}
                </div>
                {selectedMovement.sponsorId && (
                  <div className="text-[10px] text-gray-400 font-mono mt-1">
                    ID: {selectedMovement.sponsorId}
                  </div>
                )}
              </div>

              {/* المندوب الفعلي المستخدم */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                <div className="font-bold text-gray-500 mb-1 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  المندوب الفعلي (المستخدم)
                </div>
                {selectedMovement.userRider ? (
                  <div className="space-y-0.5">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {selectedMovement.userRider.nameAr || selectedMovement.userRider.nameEn || "-"}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      إقامة: {selectedMovement.userRider.iqamaNo || "-"}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      جوال: {selectedMovement.userRider.mobile || "-"}
                    </div>
                    {selectedMovement.userRider.sponsorNameAr && (
                      <div className="text-[11px] text-indigo-600 font-semibold">
                        كفيل المندوب: {selectedMovement.userRider.sponsorNameAr}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 font-mono text-[11px]">غير مسند</span>
                )}
              </div>

              {/* صاحب الحساب المالك */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
                <div className="font-bold text-gray-500 mb-1 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-gray-500" />
                  صاحب الحساب الرسمي (المالك)
                </div>
                {selectedMovement.ownerRider ? (
                  <div className="space-y-0.5">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {selectedMovement.ownerRider.nameAr || selectedMovement.ownerRider.nameEn || "-"}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      إقامة: {selectedMovement.ownerRider.iqamaNo || "-"}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      جوال: {selectedMovement.ownerRider.mobile || "-"}
                    </div>
                    {selectedMovement.ownerRider.sponsorNameAr && (
                      <div className="text-[11px] text-indigo-600 font-semibold">
                        كفيل المالك: {selectedMovement.ownerRider.sponsorNameAr}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400 font-mono text-[11px]">-</span>
                )}
              </div>
            </div>

            {/* المعرفات والربط وتفاصيل تسليم المحاسب */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/70 dark:bg-gray-800/40 text-[11px] font-mono space-y-1">
              <div>معرف فترة التسليم (Handover ID): <span className="text-gray-800 dark:text-gray-200">{selectedMovement.handoverId}</span></div>
              {selectedMovement.cashboxHandoverId && (
                <div>معرف تسليم المحاسب (Cashbox Handover ID): <span className="text-indigo-700 dark:text-indigo-300 font-bold">{selectedMovement.cashboxHandoverId}</span></div>
              )}
              {selectedMovement.operationId && (
                <div>معرف العملية الأصلية (Operation ID): <span className="text-gray-800 dark:text-gray-200">{selectedMovement.operationId}</span></div>
              )}
              {selectedMovement.transferredDebtId && (
                <div>معرف الدين المرحل (Debt ID): <span className="text-gray-800 dark:text-gray-200">{selectedMovement.transferredDebtId}</span></div>
              )}
              <div>منشئ الحركة: <span className="text-gray-800 dark:text-gray-200">{selectedMovement.createdByUserId || selectedMovement.actorUserId || "-"}</span></div>
            </div>

            <div className="flex justify-end pt-3 border-t">
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
