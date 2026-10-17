// src/app/admin/jahez/accounts/page.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getJahezAccounts,
  getAllJahezAccounts,
  getJahezAccountDetails,
  getJahezStatistics,
  updateJahezAccountStatus,
  createJahezHandover,
  previewJahezOperation,
  createJahezOperation,
  updateJahezOperation,
  executeJahezOperation,
  createJahezRequest,
  recordJahezFeeReceipt,
  getRiyadhTodayDate,
  getRiyadhNowIso,
} from "@/lib/jahez/api";
import {
  OperationMode,
  OperationStatus,
  Direction,
  Fund,
  Purpose,
  ApprovalKind,
  AdjustmentTarget,
  type Account,
  type AccountDetails,
  type Statistics,
  type Preview,
  type Operation,
  canEditPaymentMethod,
} from "@/lib/jahez/types";
import { EditPaymentMethodModal } from "@/components/jahez/EditPaymentMethodModal";
import { listRiders } from "@/lib/workforce/api";
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
  PlayCircle,
  FileText,
  KeyRound,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  Coins,
  Calculator,
  ShieldAlert,
  Send,
  Eye,
  FileSpreadsheet,
  Building2,
  MapPin,
  UserCheck,
  User,
  Phone,
  CreditCard,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Edit3,
} from "lucide-react";

export default function JahezAccountsPage() {
  const { user, can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [assignedFilter, setAssignedFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [sponsorFilter, setSponsorFilter] = useState<string>("ALL");
  const [passwordFilter, setPasswordFilter] = useState<string>("ALL");

  // -----------------------------------------------------------------
  // Modals States
  // -----------------------------------------------------------------
  // 1. Handover Modal
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverAccount, setHandoverAccount] = useState<Account | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [handoverEffectiveAt, setHandoverEffectiveAt] = useState("");
  const [handoverInitialFee, setHandoverInitialFee] = useState<number>(0);
  const [handoverPaymentRef, setHandoverPaymentRef] = useState("");
  const [handoverReason, setHandoverReason] = useState("تسليم جديد للعمل");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // 2. Comprehensive Operation Modal ("شاشة العملية")
  const [isOpModalOpen, setIsOpModalOpen] = useState(false);
  const [opAccount, setOpAccount] = useState<Account | null>(null);
  const [opMode, setOpMode] = useState<OperationMode>(OperationMode.Settle);
  const [opThroughDate, setOpThroughDate] = useState("");
  const [opEffectiveAt, setOpEffectiveAt] = useState("");
  const [opNet, setOpNet] = useState<number | "">("");
  const [opReason, setOpReason] = useState("تصفية من داشبورد جاهز");
  const [opTransferToRider, setOpTransferToRider] = useState(false);
  const [opFund, setOpFund] = useState<Fund | "">("");
  const [opPaymentRef, setOpPaymentRef] = useState("");

  // Preview & Operation lifecycle state
  const [opPreview, setOpPreview] = useState<Preview | null>(null);
  const [savedOperation, setSavedOperation] = useState<Operation | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [opSubmitting, setOpSubmitting] = useState(false);

  // Last Settlement information for the selected account/handover
  interface LastSettlementInfo {
    loading: boolean;
    throughDate: string | null;
    executedAtUtc: string | null;
    net: number | null;
    commission: number | null;
    remaining: number | null;
    handoverStartedOn: string | null;
    commissionStartsOn: string | null;
    totalSettlementsCount: number;
  }
  const [opLastSettlement, setOpLastSettlement] = useState<LastSettlementInfo | null>(null);

  // Adjustment & Transfer Request inside Operation Modal
  const [isAdjustmentSubmitting, setIsAdjustmentSubmitting] = useState(false);
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);

  // 3. Account Details Modal
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<
    "overview" | "handovers" | "operations" | "requests" | "fees" | "orders" | "ledger"
  >("overview");

  // 4. Update Status Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusAccount, setStatusAccount] = useState<Account | null>(null);
  const [newStatus, setNewStatus] = useState<Account["status"]>("Available");
  const [statusReason, setStatusReason] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // 5. Fee Receipt Modal
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeAccount, setFeeAccount] = useState<Account | null>(null);
  const [feeAmount, setFeeAmount] = useState<number>(200);
  const [feeFund, setFeeFund] = useState<Fund>(Fund.Cashbox);
  const [feeReference, setFeeReference] = useState("");
  const [feeReason, setFeeReason] = useState("قبض رسوم فتح الحساب نقداً");
  const [feeSubmitting, setFeeSubmitting] = useState(false);

  // 6. Edit Payment Method Modal
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editPaymentOpId, setEditPaymentOpId] = useState<string | null>(null);
  const [editPaymentInitialOp, setEditPaymentInitialOp] = useState<Operation | null>(null);
  const [editPaymentContext, setEditPaymentContext] = useState<{
    riderName?: string | null;
    accountCode?: string | null;
    settlementDate?: string | null;
  } | undefined>(undefined);

  // -----------------------------------------------------------------
  // Load data - fetch ALL accounts across all pages
  // -----------------------------------------------------------------
  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, statRes, ridersRes] = await Promise.allSettled([
        getAllJahezAccounts(100),
        getJahezStatistics(),
        listRiders(),
      ]);

      if (accRes.status === "fulfilled") {
        setAccounts(accRes.value.items || []);
      } else {
        toast.error("خطأ", "فشل جلب قائمة حسابات جاهز");
      }

      if (statRes.status === "fulfilled") {
        setStatistics(statRes.value);
      }

      if (ridersRes.status === "fulfilled") {
        setRiders(ridersRes.value || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extract unique cities & sponsors from loaded accounts for dropdown filters
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.cityNameAr?.trim()) {
        set.add(a.cityNameAr.trim());
      }
    });
    return Array.from(set).sort();
  }, [accounts]);

  const availableSponsors = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.sponsorNameAr?.trim()) {
        set.add(a.sponsorNameAr.trim());
      }
    });
    return Array.from(set).sort();
  }, [accounts]);

  // Client search & filter over ALL loaded accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (statusFilter !== "ALL" && acc.status !== statusFilter) return false;
      if (assignedFilter === "ASSIGNED" && !acc.isAssigned) return false;
      if (assignedFilter === "UNASSIGNED" && acc.isAssigned) return false;
      if (cityFilter !== "ALL" && acc.cityNameAr !== cityFilter) return false;
      if (sponsorFilter !== "ALL" && acc.sponsorNameAr !== sponsorFilter) return false;
      if (passwordFilter === "HAS_PASSWORD" && !acc.hasPassword) return false;
      if (passwordFilter === "MISSING_PASSWORD" && acc.hasPassword) return false;

      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const codeMatch = acc.code?.toLowerCase().includes(q);
      const extMatch = acc.externalAccountId?.toLowerCase().includes(q);
      const userMatch = acc.userName?.toLowerCase().includes(q);
      const cityMatch = acc.cityNameAr?.toLowerCase().includes(q);
      const sponsorMatch = acc.sponsorNameAr?.toLowerCase().includes(q);
      const ownerMatch =
        acc.owner?.nameAr?.toLowerCase().includes(q) ||
        acc.owner?.iqamaNo?.includes(q) ||
        acc.owner?.mobile?.includes(q);
      const riderMatch =
        acc.actualRider?.nameAr?.toLowerCase().includes(q) ||
        acc.actualRider?.iqamaNo?.includes(q) ||
        acc.actualRider?.mobile?.includes(q);

      return (
        codeMatch ||
        extMatch ||
        userMatch ||
        cityMatch ||
        sponsorMatch ||
        ownerMatch ||
        riderMatch
      );
    });
  }, [accounts, search, statusFilter, assignedFilter, cityFilter, sponsorFilter, passwordFilter]);

  // Reset to first page whenever search, filter or pageSize changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, assignedFilter, cityFilter, sponsorFilter, passwordFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));

  // Current page items to display in table
  const paginatedAccounts = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredAccounts.slice(startIndex, startIndex + pageSize);
  }, [filteredAccounts, page, pageSize]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "ALL" ||
    assignedFilter !== "ALL" ||
    cityFilter !== "ALL" ||
    sponsorFilter !== "ALL" ||
    passwordFilter !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setAssignedFilter("ALL");
    setCityFilter("ALL");
    setSponsorFilter("ALL");
    setPasswordFilter("ALL");
  };

  // -----------------------------------------------------------------
  // Handover Action
  // -----------------------------------------------------------------
  const openHandoverModal = (acc: Account) => {
    setHandoverAccount(acc);
    setSelectedRiderId("");
    setHandoverEffectiveAt(getRiyadhNowIso().slice(0, 16));
    setHandoverInitialFee(0);
    setHandoverPaymentRef("");
    setHandoverReason("تسليم جديد للعمل");
    setIsHandoverOpen(true);
  };

  const submitHandover = async () => {
    if (!handoverAccount || !selectedRiderId) {
      toast.warning("تنبيه", "يرجى اختيار المندوب الفعلي");
      return;
    }
    if (handoverInitialFee > 0 && !handoverPaymentRef.trim()) {
      toast.warning("تنبيه", "يرجى إدخال مرجع الدفع / رقم الإيصال عند تسجيل قبض رسوم أولية");
      return;
    }
    setHandoverSubmitting(true);
    try {
      const effectiveAtUtc = new Date(handoverEffectiveAt).toISOString();
      await createJahezHandover({
        accountId: handoverAccount.accountId,
        riderProfileId: selectedRiderId,
        effectiveAtUtc,
        reason: handoverReason.trim() || "تسليم جديد",
        initialFeePayment: Number(handoverInitialFee) || 0,
        paymentReference: handoverPaymentRef.trim() || undefined,
      });
      setIsHandoverOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error("خطأ في التسليم", err instanceof Error ? err.message : "فشل تسليم الحساب");
    } finally {
      setHandoverSubmitting(false);
    }
  };

  // -----------------------------------------------------------------
  // Operation Action ("شاشة العملية")
  // -----------------------------------------------------------------
  const openOperationModal = (acc: Account) => {
    setOpAccount(acc);
    setOpMode(OperationMode.Settle);
    setOpThroughDate(getRiyadhTodayDate());
    setOpEffectiveAt(getRiyadhNowIso().slice(0, 16));
    setOpNet(0);
    setOpReason("تصفية من داشبورد جاهز");
    setOpTransferToRider(false);
    setOpFund(Fund.Cashbox);
    setOpPaymentRef("");
    setOpPreview(null);
    setSavedOperation(null);
    setIsOpModalOpen(true);

    // Load last settlement info for this account/handover
    setOpLastSettlement({
      loading: true,
      throughDate: null,
      executedAtUtc: null,
      net: null,
      commission: null,
      remaining: null,
      handoverStartedOn: null,
      commissionStartsOn: null,
      totalSettlementsCount: 0,
    });

    getJahezAccountDetails(acc.accountId, 1, 50)
      .then((details) => {
        const currentHandover =
          details.handovers?.items?.find((h) => h.id === acc.currentHandoverId) ||
          details.handovers?.items?.[0];

        // Filter executed / recorded settlements
        const settlements = (details.operations?.items || [])
          .filter(
            (op) =>
              (op.mode === OperationMode.Settle ||
                op.mode === OperationMode.SettleAndWithdraw ||
                op.purpose === Purpose.Settlement) &&
              (op.status === OperationStatus.Executed || Boolean(op.executedAtUtc)),
          )
          .sort((a, b) => (b.throughDate || "").localeCompare(a.throughDate || ""));

        const latest = settlements[0];
        const lastThrough = latest?.throughDate || currentHandover?.commissionPostedThrough || null;
        const lastExecuted =
          latest?.executedAtUtc ||
          latest?.effectiveAtUtc ||
          currentHandover?.lastSettlementPaymentAtUtc ||
          null;

        setOpLastSettlement({
          loading: false,
          throughDate: lastThrough,
          executedAtUtc: lastExecuted,
          net: latest?.net ?? null,
          commission: latest?.commission ?? null,
          remaining: latest?.remaining ?? null,
          handoverStartedOn: currentHandover?.startedAtUtc
            ? currentHandover.startedAtUtc.split("T")[0]
            : null,
          commissionStartsOn: currentHandover?.commissionStartsOn || null,
          totalSettlementsCount: settlements.length,
        });
      })
      .catch((err) => {
        console.warn("Could not load last settlement details", err);
        setOpLastSettlement({
          loading: false,
          throughDate: null,
          executedAtUtc: null,
          net: null,
          commission: null,
          remaining: null,
          handoverStartedOn: null,
          commissionStartsOn: null,
          totalSettlementsCount: 0,
        });
      });

    // Initial preview
    if (acc.currentHandoverId) {
      runPreview(acc.currentHandoverId, OperationMode.Settle, getRiyadhTodayDate(), 0);
    }
  };

  const runPreview = async (
    handoverId: string,
    mode: OperationMode,
    throughDate: string,
    netValue: number,
  ) => {
    setPreviewLoading(true);
    try {
      const effectiveAtUtc = new Date(opEffectiveAt || getRiyadhNowIso()).toISOString();
      const res = await previewJahezOperation({
        handoverId,
        mode,
        throughDate,
        effectiveAtUtc,
        net: Number(netValue) || 0,
        reason: opReason,
      });
      setOpPreview(res);
    } catch (err: unknown) {
      // preview error handled silently or with subtle badge
      setOpPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleNetChange = (val: string) => {
    const num = val === "" ? "" : Number(val);
    setOpNet(num);
    if (opAccount?.currentHandoverId && num !== "") {
      runPreview(opAccount.currentHandoverId, opMode, opThroughDate, Number(num));
    }
  };

  const handleModeChange = (newMode: OperationMode) => {
    setOpMode(newMode);
    if (newMode === OperationMode.Withdraw) {
      setOpThroughDate(getRiyadhTodayDate());
    }
    if (opAccount?.currentHandoverId) {
      runPreview(
        opAccount.currentHandoverId,
        newMode,
        opThroughDate,
        opNet === "" ? 0 : Number(opNet),
      );
    }
  };

  const handleSaveOperationDraft = async () => {
    if (!opAccount?.currentHandoverId) {
      toast.error("خطأ", "لا توجد فترة تسليم نشطة لهذا الحساب");
      return;
    }
    setOpSubmitting(true);
    try {
      const effectiveAtUtc = new Date(opEffectiveAt).toISOString();
      const needsFund =
        opPreview &&
        opPreview.remaining !== 0 &&
        !opTransferToRider &&
        opMode !== OperationMode.Withdraw;

      const op = await createJahezOperation({
        handoverId: opAccount.currentHandoverId,
        mode: opMode,
        throughDate: opThroughDate,
        effectiveAtUtc,
        net: opNet === "" ? 0 : Number(opNet),
        reason: opReason.trim() || "تصفية من داشبورد جاهز",
        fund: needsFund && opFund ? (Number(opFund) as Fund) : null,
        purpose: Purpose.Settlement,
        transferToRider: opTransferToRider,
        paymentReference: needsFund ? opPaymentRef.trim() || null : null,
      });
      setSavedOperation(op);
      toast.success("تم الحفظ", `تم حفظ مسودة العملية #${op.id.slice(0, 8)} بحالة جاهزة (Ready)`);
    } catch (err: unknown) {
      toast.error("فشل الحفظ", err instanceof Error ? err.message : "تعذر حفظ العملية");
    } finally {
      setOpSubmitting(false);
    }
  };

  const handleExecuteOperation = async () => {
    if (!savedOperation) return;
    setOpSubmitting(true);
    try {
      await executeJahezOperation(savedOperation.id);
      setIsOpModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error("فشل التنفيذ", err instanceof Error ? err.message : "تعذر تنفيذ العملية المالية");
    } finally {
      setOpSubmitting(false);
    }
  };

  const handleOpenAdjustmentRequest = async () => {
    if (!opAccount?.currentHandoverId || !savedOperation) {
      toast.warning("تنبيه", "يرجى حفظ مسودة العملية أولاً قبل فتح طلب التعديل");
      return;
    }
    setIsAdjustmentSubmitting(true);
    try {
      await createJahezRequest({
        handoverId: opAccount.currentHandoverId,
        kind: ApprovalKind.Adjustment,
        reason: `طلب مراجعة وتعديل التصفية للعملية #${savedOperation.id.slice(0, 8)}`,
        operationId: savedOperation.id,
        adjustmentTarget: AdjustmentTarget.Settlement,
        proposedNet: opNet === "" ? 0 : Number(opNet),
        proposedCommission: opPreview?.commission ?? 0,
      });
      toast.success(
        "تم فتح الطلب",
        "تم تحويل العملية إلى قيد المراجعة (UnderReview) بانتظار اعتماد الإدارة",
      );
      setIsOpModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error("فشل الطلب", err instanceof Error ? err.message : "تعذر إنشاء طلب التعديل");
    } finally {
      setIsAdjustmentSubmitting(false);
    }
  };

  const handleOpenTransferRequest = async () => {
    if (!opAccount?.currentHandoverId || !savedOperation) {
      toast.warning("تنبيه", "يرجى حفظ مسودة العملية أولاً");
      return;
    }
    setIsTransferSubmitting(true);
    try {
      await createJahezRequest({
        handoverId: opAccount.currentHandoverId,
        kind: ApprovalKind.SettlementTransfer,
        reason: "ترحيل كامل المستحق بعد السحب إلى مديونية المندوب",
        operationId: savedOperation.id,
      });
      toast.success("تم إرسال الطلب", "تم إرسال طلب الترحيل إلى الإدارة لاعتماده وتنفيذه");
      setIsOpModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error("فشل الطلب", err instanceof Error ? err.message : "تعذر إنشاء طلب الترحيل");
    } finally {
      setIsTransferSubmitting(false);
    }
  };

  // -----------------------------------------------------------------
  // Details Modal
  // -----------------------------------------------------------------
  const openDetailsModal = async (accountId: string) => {
    setSelectedAccountId(accountId);
    setIsDetailsOpen(true);
    setDetailsTab("overview");
    setDetailsLoading(true);
    try {
      const res = await getJahezAccountDetails(accountId, 1, 50);
      setAccountDetails(res);
    } catch (err: unknown) {
      toast.error("خطأ", "تعذر استعلام تفاصيل الحساب");
    } finally {
      setDetailsLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // Status Modal
  // -----------------------------------------------------------------
  const openStatusModal = (acc: Account) => {
    setStatusAccount(acc);
    setNewStatus(acc.status);
    setStatusReason(acc.statusReason || "");
    setIsStatusModalOpen(true);
  };

  const submitStatusUpdate = async () => {
    if (!statusAccount) return;
    setStatusSubmitting(true);
    try {
      await updateJahezAccountStatus(statusAccount.accountId, {
        status: newStatus,
        reason: statusReason.trim() || "تحديث حالة الحساب",
        rowVersion: statusAccount.rowVersion,
      });
      setIsStatusModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error("فشل التحديث", err instanceof Error ? err.message : "تعذر تحديث الحالة");
    } finally {
      setStatusSubmitting(false);
    }
  };

  // -----------------------------------------------------------------
  // Fee Receipt Modal
  // -----------------------------------------------------------------
  const openFeeModal = (acc: Account) => {
    if (!acc.currentHandoverId) {
      toast.warning("تنبيه", "لا توجد فترة تسليم نشطة لتسجيل رسوم فتح الحساب عليها");
      return;
    }
    setFeeAccount(acc);
    setFeeAmount(200);
    setFeeFund(Fund.Cashbox);
    setFeeReference(`FEE-${Date.now().toString().slice(-6)}`);
    setFeeReason("قبض رسوم فتح الحساب نقداً");
    setIsFeeModalOpen(true);
  };

  const submitFeeReceipt = async () => {
    if (!feeAccount?.currentHandoverId) return;
    setFeeSubmitting(true);
    try {
      await recordJahezFeeReceipt({
        handoverId: feeAccount.currentHandoverId,
        amount: Number(feeAmount) || 200,
        fund: feeFund,
        reference: feeReference.trim() || "FEE-CASH",
        reason: feeReason.trim() || "قبض رسوم فتح الحساب",
      });
      setIsFeeModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toast.error("فشل تسجيل الرسوم", err instanceof Error ? err.message : "تعذر تسجيل الإيصال");
    } finally {
      setFeeSubmitting(false);
    }
  };

  // Export
  const handleExport = () => {
    const dataToExport = filteredAccounts.map((a) => ({
      "رقم الحساب": a.code,
      "المعرف الخارجي": a.externalAccountId,
      "اسم المستخدم": a.userName || "-",
      "المدينة": a.cityNameAr,
      "الكفيل": a.sponsorNameAr || "-",
      "المالك الرسمي": a.owner?.nameAr || "-",
      "هوية المالك": a.owner?.iqamaNo || "-",
      "المندوب الفعلي": a.actualRider?.nameAr || "غير مسند",
      "هوية المندوب": a.actualRider?.iqamaNo || "-",
      "حالة الحساب": a.status,
      "حالة الإسناد": a.isAssigned ? "مسند" : "متاح",
      "كلمة المرور": a.hasPassword ? "متوفرة" : "غير متوفرة",
      "طلبات الأمس": a.yesterdayOrders ?? "لا توجد بيانات",
      "آخر طلبات": a.lastOrderCount ?? 0,
    }));
    exportToExcel(dataToExport, "حسابات_جاهز_V2");
  };

  return (
    <div className="space-y-6 p-4 md:p-8" dir="rtl">
      {/* ----------------- Top Header & Indicators ----------------- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                حسابات وتشغيل جاهز
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إدارة الحسابات، التسليم الجديد، العمليات والتصفيات اللحظية المعتمدة
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport} className="gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير إكسل
          </Button>
          <Link href="/admin/jahez/approvals">
            <Button variant="secondary" size="sm" className="gap-2">
              طلبات الاعتماد
            </Button>
          </Link>
          <Link href="/admin/jahez/cashbox">
            <Button variant="secondary" size="sm" className="gap-2">
              الأموال والعمليات
            </Button>
          </Link>
        </div>
      </div>

      {/* ----------------- Statistics Banner ----------------- */}
      {statistics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <div
            onClick={clearFilters}
            className={`cursor-pointer rounded-2xl border p-3 shadow-xs transition-all ${
              !hasActiveFilters
                ? "border-amber-500 bg-amber-50/30 dark:border-amber-600 dark:bg-amber-950/20"
                : "border-gray-200/80 bg-white hover:border-gray-400 dark:border-gray-800 dark:bg-gray-900"
            }`}
            title="انقر لعرض كافة الحسابات وإلغاء أي فلاتر"
          >
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              إجمالي الحسابات
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
              {accounts.length > 0 ? accounts.length : statistics.totalAccounts}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-400">
              {accounts.length > 0 ? "محملة بالكامل" : "عبر جميع الصفحات"}
            </div>
          </div>

          <div
            onClick={() => {
              setStatusFilter("ALL");
              setAssignedFilter("ASSIGNED");
            }}
            className={`cursor-pointer rounded-2xl border p-3 shadow-xs transition-all ${
              assignedFilter === "ASSIGNED"
                ? "border-emerald-500 bg-emerald-100/50 dark:border-emerald-600 dark:bg-emerald-950/40"
                : "border-emerald-200/80 bg-emerald-50/40 hover:border-emerald-400 dark:border-emerald-950 dark:bg-emerald-950/20"
            }`}
            title="فلترة الحسابات المسندة والنشطة"
          >
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              نشطة (Available/Assigned)
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-200">
              {statistics.activeAccounts}
            </div>
            <div className="mt-0.5 text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
              جاهزة للتشغيل
            </div>
          </div>

          <div
            onClick={() => {
              setAssignedFilter("UNASSIGNED");
              setStatusFilter("ALL");
            }}
            className={`cursor-pointer rounded-2xl border p-3 shadow-xs transition-all ${
              assignedFilter === "UNASSIGNED"
                ? "border-blue-500 bg-blue-100/50 dark:border-blue-600 dark:bg-blue-950/40"
                : "border-blue-200/80 bg-blue-50/40 hover:border-blue-400 dark:border-blue-950 dark:bg-blue-950/20"
            }`}
            title="فلترة الحسابات غير المسندة المتاحة"
          >
            <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
              غير مسندة حالياً
            </div>
            <div className="mt-1 text-2xl font-black text-blue-800 dark:text-blue-200">
              {statistics.unassignedAccounts}
            </div>
            <div className="mt-0.5 text-[10px] text-blue-600/80 dark:text-blue-400/80">
              متاحة للتسليم
            </div>
          </div>

          <div
            onClick={() => {
              setStatusFilter("Suspended");
            }}
            className={`cursor-pointer rounded-2xl border p-3 shadow-xs transition-all ${
              statusFilter === "Suspended"
                ? "border-rose-500 bg-rose-100/50 dark:border-rose-600 dark:bg-rose-950/40"
                : "border-rose-200/80 bg-rose-50/40 hover:border-rose-400 dark:border-rose-950 dark:bg-rose-950/20"
            }`}
            title="فلترة الحسابات الموقوفة"
          >
            <div className="text-xs font-medium text-rose-700 dark:text-rose-400">
              موقوفة إدارياً
            </div>
            <div className="mt-1 text-2xl font-black text-rose-800 dark:text-rose-200">
              {statistics.blockedAccounts}
            </div>
            <div className="mt-0.5 text-[10px] text-rose-600/80 dark:text-rose-400/80">
              Suspended
            </div>
          </div>

          <div
            onClick={() => {
              setPasswordFilter("MISSING_PASSWORD");
            }}
            className={`cursor-pointer rounded-2xl border p-3 shadow-xs transition-all ${
              passwordFilter === "MISSING_PASSWORD"
                ? "border-amber-500 bg-amber-100/50 dark:border-amber-600 dark:bg-amber-950/40"
                : "border-amber-200/80 bg-amber-50/40 hover:border-amber-400 dark:border-amber-950 dark:bg-amber-950/20"
            }`}
            title="فلترة الحسابات التي تنقصها كلمة المرور"
          >
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
              ناقصة كلمة المرور
            </div>
            <div className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-200">
              {statistics.missingPasswordAccounts}
            </div>
            <div className="mt-0.5 text-[10px] text-amber-600/80 dark:text-amber-400/80">
              تحتاج تدوير
            </div>
          </div>

          <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-3 shadow-xs dark:border-purple-950 dark:bg-purple-950/20">
            <div className="text-xs font-medium text-purple-700 dark:text-purple-400">
              طلبات الأمس
            </div>
            <div className="mt-1 text-2xl font-black text-purple-800 dark:text-purple-200">
              {statistics.yesterdayOrders ?? "-"}
            </div>
            <div className="mt-0.5 text-[10px] text-purple-600/80 dark:text-purple-400/80">
              {statistics.yesterday}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-3 shadow-xs dark:border-indigo-950 dark:bg-indigo-950/20">
            <div className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
              حسابات معتمدة أمس
            </div>
            <div className="mt-1 text-2xl font-black text-indigo-800 dark:text-indigo-200">
              {statistics.accountsWithYesterdayData}
            </div>
            <div className="mt-0.5 text-[10px] text-indigo-600/80 dark:text-indigo-400/80">
              سجلت نشاطاً معتمداً
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Filter & Search Bar ----------------- */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الحساب، اليوزر، الكفيل، المدينة، اسم أو إقامة أو جوال المالك أو المندوب..."
              className="pr-10 text-sm"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 self-start md:self-auto"
            >
              <X className="h-3.5 w-3.5" />
              مسح الفلاتر ({filteredAccounts.length} / {accounts.length})
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="ALL">جميع الحالات التشغيلية</option>
            <option value="Available">متاح (Available)</option>
            <option value="Assigned">مسند (Assigned)</option>
            <option value="Suspended">موقوف (Suspended)</option>
            <option value="Retired">متقاعد (Retired)</option>
            <option value="Archived">مؤرشف (Archived)</option>
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="ALL">جميع حالات الإسناد</option>
            <option value="ASSIGNED">مسند فقط</option>
            <option value="UNASSIGNED">غير مسند فقط</option>
          </select>

          <select
            value={passwordFilter}
            onChange={(e) => setPasswordFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="ALL">جميع حالات كلمة المرور</option>
            <option value="HAS_PASSWORD">كلمة المرور متوفرة</option>
            <option value="MISSING_PASSWORD">ناقصة كلمة المرور</option>
          </select>

          {availableCities.length > 0 && (
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="ALL">جميع المدن ({availableCities.length})</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          )}

          {availableSponsors.length > 0 && (
            <select
              value={sponsorFilter}
              onChange={(e) => setSponsorFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 max-w-[200px]"
            >
              <option value="ALL">جميع الكفلاء ({availableSponsors.length})</option>
              {availableSponsors.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ----------------- Accounts Table ----------------- */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
              <tr>
                <th className="py-3 px-3">رقم الحساب</th>
                <th className="py-3 px-3">اليوزر والمدينة</th>
                <th className="py-3 px-3">الكفيل</th>
                <th className="py-3 px-3">صاحب الحساب الرسمي</th>
                <th className="py-3 px-3">المندوب الفعلي (المستخدم)</th>
                <th className="py-3 px-3 text-center">الحالة والإسناد</th>
                <th className="py-3 px-3 text-center">الباسوورد</th>
                <th className="py-3 px-3 text-center">طلبات الأمس</th>
                <th className="py-3 px-3 text-center">التصفية / التسليم</th>
                <th className="py-3 px-3 text-center">إجراءات إضافية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && accounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-amber-500 mb-2" />
                    جارٍ تحميل حسابات جاهز V2...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    لا توجد حسابات مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => {
                  const hasConsistencyIssue = acc.isAssigned && !acc.currentHandoverId;

                  return (
                    <tr
                      key={acc.accountId}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* رقم الحساب */}
                      <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-gray-100">
                        <div>{acc.code}</div>
                        <div className="text-[10px] font-normal text-gray-400">
                          {acc.externalAccountId}
                        </div>
                      </td>

                      {/* اليوزر والمدينة */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {acc.userName || "-"}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>{acc.cityNameAr || "-"}</span>
                        </div>
                      </td>

                      {/* الكفيل */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {acc.sponsorNameAr || "بدون كفيل"}
                          </span>
                        </div>
                      </td>

                      {/* صاحب الحساب الرسمي (Owner) */}
                      <td className="py-3 px-3">
                        {acc.owner ? (
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {acc.owner.nameAr}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              إقامة: {acc.owner.iqamaNo || "-"}
                              {acc.owner.mobile && ` • ${acc.owner.mobile}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* المندوب الفعلي (Actual Rider) */}
                      <td className="py-3 px-3">
                        {acc.actualRider ? (
                          <div>
                            <div className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>{acc.actualRider.nameAr}</span>
                            </div>
                            <div className="text-[10px] text-gray-400">
                              إقامة: {acc.actualRider.iqamaNo || "-"}
                              {acc.actualRider.mobile && ` • ${acc.actualRider.mobile}`}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            غير مسند
                          </span>
                        )}
                      </td>

                      {/* الحالة والإسناد */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            tone={
                              acc.status === "Available"
                                ? "green"
                                : acc.status === "Assigned"
                                ? "blue"
                                : acc.status === "Suspended"
                                ? "red"
                                : "gray"
                            }
                            className="text-[10px]"
                          >
                            {acc.status === "Available"
                              ? "متاح"
                              : acc.status === "Assigned"
                              ? "مسند"
                              : acc.status === "Suspended"
                              ? "موقوف"
                              : acc.status === "Retired"
                              ? "متقاعد"
                              : "مؤرشف"}
                          </Badge>

                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {acc.isAssigned ? "مسند حالياً" : "غير مسند"}
                          </span>

                          {hasConsistencyIssue && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              title="الحساب معلم كمسند ولكن لا توجد فترة تسليم نشطة (isAssigned=true بدون currentHandoverId)"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              مشكلة اتساق
                            </span>
                          )}
                        </div>
                      </td>

                      {/* الباسوورد */}
                      <td className="py-3 px-3 text-center">
                        {acc.hasPassword ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <Lock className="h-2.5 w-2.5" />
                            متوفرة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100/70 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                            ناقصة
                          </span>
                        )}
                      </td>

                      {/* طلبات الأمس */}
                      <td className="py-3 px-3 text-center">
                        {acc.yesterdayOrders === null ? (
                          <span className="text-[10px] text-gray-400" title="لا توجد بيانات معتمدة">
                            -
                          </span>
                        ) : (
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {acc.yesterdayOrders}
                            </span>
                            <span className="text-[10px] text-gray-400 mr-0.5">طلب</span>
                            {acc.lastOrderDate && (
                              <div className="text-[9px] text-gray-400">
                                آخر: {acc.lastOrderCount} ({acc.lastOrderDate.slice(5)})
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* الإجراء الرئيسي حسب الإسناد */}
                      <td className="py-3 px-3 text-center">
                        {acc.isAssigned ? (
                          <Button
                            size="sm"
                            onClick={() => openOperationModal(acc)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-bold h-8 px-3 rounded-xl shadow-xs"
                            title="إجراء تصفية دورية عادية أو سحب للحساب"
                          >
                            <Calculator className="h-3.5 w-3.5" />
                            تصفية
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => openHandoverModal(acc)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold h-8 px-3 rounded-xl shadow-xs"
                            title="تسليم الحساب لمندوب جديد"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            تسليم
                          </Button>
                        )}
                      </td>

                      {/* الإجراءات الثانوية */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetailsModal(acc.accountId)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                            title="عرض تفاصيل الحساب والسجلات"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {acc.isAssigned && (
                            <button
                              onClick={() => openFeeModal(acc)}
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                              title="تسجيل قبض رسوم الحساب"
                            >
                              <Coins className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => openStatusModal(acc)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                            title="تحديث حالة الحساب"
                          >
                            <AlertTriangle className="h-4 w-4" />
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

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40 text-xs text-gray-500">
          <div>
            عرض {paginatedAccounts.length} من أصل {filteredAccounts.length} حساب مطابق
            {filteredAccounts.length !== accounts.length && (
              <span className="text-gray-400 mr-1 font-mono">
                (من إجمالي {accounts.length} حساب)
              </span>
            )}
            {" "}— (الصفحة {page} من {totalPages})
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
              <span>عرض:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 focus:outline-hidden"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="h-8 px-2 text-[11px]"
                title="الصفحة الأولى"
              >
                الأولى
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
                title="الصفحة السابقة"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-gray-700 dark:text-gray-300 px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 p-0"
                title="الصفحة التالية"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="h-8 px-2 text-[11px]"
                title="الصفحة الأخيرة"
              >
                الأخيرة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 1. Handover Modal (تسليم حساب للمندوب)                              */}
      {/* ================================================================= */}
      <Modal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        title="تسليم حساب جاهز للمندوب"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {handoverAccount && (
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
              <div className="font-bold">
                الحساب: {handoverAccount.code} ({handoverAccount.userName})
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300">
                المدينة: {handoverAccount.cityNameAr} • الكفيل:{" "}
                {handoverAccount.sponsorNameAr || "بدون"}
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              المندوب الفعلي (المستلم للتشغيل) *
            </label>
            <SearchableSelect
              options={riders.map((r) => ({
                value: r.id,
                label: `${r.fullNameAr || r.fullNameEn || "مندوب"} (إقامة: ${r.iqamaNo || "-"})`,
              }))}
              value={selectedRiderId}
              onChange={setSelectedRiderId}
              placeholder="ابحث باسم المندوب أو رقم الإقامة..."
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              تاريخ ووقت بدء التسليم الفعلي بتوقيت الرياض
            </label>
            <Input
              type="datetime-local"
              value={handoverEffectiveAt}
              onChange={(e) => setHandoverEffectiveAt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                الرسوم الأولية المقبوضة
              </label>
              <Input
                type="number"
                min="0"
                value={handoverInitialFee}
                onChange={(e) => setHandoverInitialFee(Number(e.target.value) || 0)}
              />
              <span className="text-[10px] text-gray-400">
                إذا قُبضت 200 ريال الآن ستُسجل فوراً كحركة مالية، أو اتركها 0 للقبض لاحقاً
              </span>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                مرجع الدفع {handoverInitialFee > 0 ? "*" : "(إن وجد)"}
              </label>
              <Input
                value={handoverPaymentRef}
                onChange={(e) => setHandoverPaymentRef(e.target.value)}
                placeholder="رقم إيصال الخزنة أو الحوالة"
                disabled={handoverInitialFee <= 0}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              سبب التسليم / ملاحظات
            </label>
            <Input
              value={handoverReason}
              onChange={(e) => setHandoverReason(e.target.value)}
              placeholder="للعمل..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="secondary"
              onClick={() => setIsHandoverOpen(false)}
              disabled={handoverSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={submitHandover}
              disabled={handoverSubmitting || !selectedRiderId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
            >
              {handoverSubmitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              تأكيد التسليم
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* 2. Comprehensive Operation Modal ("شاشة العملية")                   */}
      {/* ================================================================= */}
      <Modal
        isOpen={isOpModalOpen}
        onClose={() => setIsOpModalOpen(false)}
        title="شاشة العملية — تصفية وسحب وإسناد جاهز"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {opAccount && (
            <div className="flex items-center justify-between rounded-xl bg-indigo-50/80 p-3 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200">
              <div>
                <span className="font-bold text-sm">
                  الحساب: {opAccount.code} ({opAccount.userName || "-"})
                </span>
                <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  المندوب الفعلي: {opAccount.actualRider?.nameAr || "غير مسند"} (إقامة:{" "}
                  {opAccount.actualRider?.iqamaNo || "-"})
                </div>
              </div>
              <Badge tone="blue">فترة تسليم نشطة</Badge>
            </div>
          )}

          {/* 1. مسار العملية */}
          <div>
            <label className="block font-bold text-gray-800 dark:text-gray-200 mb-1.5">
              1. اختيار مسار العملية:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange(OperationMode.Settle)}
                className={`rounded-xl border p-2.5 text-center font-bold transition-all ${
                  opMode === OperationMode.Settle
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 ring-2 ring-indigo-500/20"
                    : "border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-800 dark:text-gray-300"
                }`}
              >
                تصفية دورية (عادية)
              </button>
              <button
                type="button"
                onClick={() => handleModeChange(OperationMode.SettleAndWithdraw)}
                className={`rounded-xl border p-2.5 text-center font-bold transition-all ${
                  opMode === OperationMode.SettleAndWithdraw
                    ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-2 ring-amber-500/20"
                    : "border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-800 dark:text-gray-300"
                }`}
              >
                تصفية نهائية وسحب
              </button>
              <button
                type="button"
                onClick={() => handleModeChange(OperationMode.Withdraw)}
                className={`rounded-xl border p-2.5 text-center font-bold transition-all ${
                  opMode === OperationMode.Withdraw
                    ? "border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 ring-2 ring-rose-500/20"
                    : "border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-800 dark:text-gray-300"
                }`}
              >
                سحب الحساب فقط
              </button>
            </div>
          </div>

          {/* 2. التواريخ */}
          <div className="space-y-2.5">
            {/* شريط تاريخ آخر تصفية */}
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    تاريخ آخر تصفية:
                  </span>
                </div>

                {opLastSettlement?.loading ? (
                  <span className="text-gray-400 animate-pulse text-[11px] font-medium">
                    جارٍ فحص تاريخ آخر تصفية...
                  </span>
                ) : opLastSettlement?.throughDate ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-xs">
                      {opLastSettlement.throughDate}
                    </span>
                    {opLastSettlement.executedAtUtc && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        (تنفيذ: {new Date(opLastSettlement.executedAtUtc).toLocaleDateString("ar-SA")})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    لا توجد تصفية سابقة{" "}
                    {opLastSettlement?.handoverStartedOn
                      ? `(بداية الإسناد: ${opLastSettlement.handoverStartedOn})`
                      : opLastSettlement?.commissionStartsOn
                      ? `(بدء احتساب العمولة: ${opLastSettlement.commissionStartsOn})`
                      : ""}
                  </span>
                )}
              </div>

              {/* تفاصيل إضافية عن آخر تصفية */}
              {opLastSettlement && !opLastSettlement.loading && opLastSettlement.throughDate && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-indigo-200/60 pt-2 text-[11px] text-gray-600 dark:border-indigo-900/40 dark:text-gray-400">
                  <span>
                    إجمالي التصفيات المنفذة:{" "}
                    <strong className="text-indigo-700 dark:text-indigo-300 font-bold">
                      {opLastSettlement.totalSettlementsCount}
                    </strong>
                  </span>
                  {opLastSettlement.remaining !== null && (
                    <span>
                      رصيد آخر تصفية:{" "}
                      <strong
                        className={`font-mono font-bold ${
                          (opLastSettlement.remaining || 0) < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : (opLastSettlement.remaining || 0) > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-600"
                        }`}
                      >
                        {Number(opLastSettlement.remaining).toFixed(2)} ر.س
                      </strong>
                    </span>
                  )}
                  {opLastSettlement.throughDate && (
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      تبدأ التصفية الحالية من:{" "}
                      {(() => {
                        try {
                          const d = new Date(opLastSettlement.throughDate);
                          d.setDate(d.getDate() + 1);
                          return d.toISOString().split("T")[0];
                        } catch {
                          return "";
                        }
                      })()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  تاريخ نهاية التصفية (YYYY-MM-DD)
                </label>
                <Input
                  type="date"
                  value={opThroughDate}
                  disabled={opMode === OperationMode.Withdraw}
                  onChange={(e) => {
                    setOpThroughDate(e.target.value);
                    if (opAccount?.currentHandoverId) {
                      runPreview(
                        opAccount.currentHandoverId,
                        opMode,
                        e.target.value,
                        opNet === "" ? 0 : Number(opNet),
                      );
                    }
                  }}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  وقت التنفيذ الفعلي بتوقيت الرياض
                </label>
                <Input
                  type="datetime-local"
                  value={opEffectiveAt}
                  onChange={(e) => setOpEffectiveAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. الصافي من داشبورد جاهز في المسارات المالية */}
          {opMode !== OperationMode.Withdraw && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-gray-800 dark:text-gray-200">
                  2. الصافي من داشبورد جاهز بإشارته (+ / -):
                </label>
                <span className="text-[10px] text-gray-500">
                  {Number(opNet) < 0 ? (
                    <span className="text-rose-600 font-bold">عليه مديونية بالداشبورد</span>
                  ) : Number(opNet) > 0 ? (
                    <span className="text-emerald-600 font-bold">له أرباح بالداشبورد</span>
                  ) : (
                    "صفر"
                  )}
                </span>
              </div>
              <Input
                type="number"
                step="0.01"
                value={opNet}
                onChange={(e) => handleNetChange(e.target.value)}
                placeholder="أدخل الصافي بإشارته كما يظهر بداشبورد جاهز..."
                className="font-mono text-base font-bold"
              />
            </div>
          )}

          {/* 4. بطاقة المعاينة اللحظية والحساب المالي الصارم من السيرفر */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-500" />
                معاينة الحساب المالي (المتبقي = الصافي + العمولة):
              </span>
              {previewLoading && (
                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  جارٍ الحساب...
                </span>
              )}
            </div>

            {opPreview ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white p-2.5 shadow-xs dark:bg-gray-900">
                    <div className="text-[10px] text-gray-400">الصافي المدخل</div>
                    <div className="mt-0.5 font-mono text-base font-black text-gray-900 dark:text-white">
                      {opPreview.net.toFixed(2)} ر.س
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 shadow-xs dark:bg-gray-900">
                    <div className="text-[10px] text-gray-400">العمولة المحسوبة</div>
                    <div className="mt-0.5 font-mono text-base font-black text-amber-600">
                      {opPreview.commission.toFixed(2)} ر.س
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 shadow-xs dark:bg-gray-900">
                    <div className="text-[10px] text-gray-400">المتبقي الصافي</div>
                    <div className="mt-0.5 font-mono text-base font-black text-gray-900 dark:text-white">
                      {opPreview.remaining.toFixed(2)} ر.س
                    </div>
                  </div>
                </div>

                {/* اتجاه المال والنص الظاهر الصريح */}
                <div
                  className={`rounded-xl p-3 text-center font-black text-sm flex items-center justify-center gap-2 ${
                    opPreview.remaining > 0
                      ? "bg-emerald-500 text-white"
                      : opPreview.remaining < 0
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {opPreview.remaining > 0 ? (
                    <>
                      <ArrowRightLeft className="h-4 w-4" />
                      قبض {Math.abs(opPreview.remaining).toFixed(2)} ريال من المندوب (عليه)
                    </>
                  ) : opPreview.remaining < 0 ? (
                    <>
                      <ArrowRightLeft className="h-4 w-4" />
                      صرف {Math.abs(opPreview.remaining).toFixed(2)} ريال للمندوب (له)
                    </>
                  ) : (
                    "لا قبض ولا صرف (المتبقي = 0)"
                  )}
                </div>

                {/* ترحيل كالتزام مالي */}
                {opMode === OperationMode.SettleAndWithdraw && opPreview.remaining > 0 && (
                  <label className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={opTransferToRider}
                      onChange={(e) => setOpTransferToRider(e.target.checked)}
                      className="rounded h-4 w-4 text-amber-600"
                    />
                    <span>
                      ترحيل المبلغ كالتزام مالي على المندوب وحظره تشغيلياً (يتطلب طلب واعتماد
                      المدير)
                    </span>
                  </label>
                )}

                {/* الجهة المالية عند وجود حركة حقيقية وبدون ترحيل */}
                {opPreview.remaining !== 0 &&
                  !opTransferToRider &&
                  opMode !== OperationMode.Withdraw && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          الجهة المالية المسموحة *
                        </label>
                        <select
                          value={opFund}
                          onChange={(e) => setOpFund(Number(e.target.value) as Fund)}
                          className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800"
                        >
                          {opPreview.direction === Direction.Receipt ? (
                            <>
                              <option value={Fund.Cashbox}>الخزنة (Cashbox)</option>
                              <option value={Fund.PetroApp}>بترو آب (PetroApp - للوقود فقط)</option>
                            </>
                          ) : (
                            <>
                              <option value={Fund.Cashbox}>الخزنة (Cashbox)</option>
                              <option value={Fund.Bank}>البنك (Bank - تحويل فعلي)</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          مرجع الحركة الفعلية *
                        </label>
                        <Input
                          value={opPaymentRef}
                          onChange={(e) => setOpPaymentRef(e.target.value)}
                          placeholder="رقم إيصال الخزنة أو مرجع التحويل"
                        />
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-2">
                أدخل المعطيات لمعاينة الحساب المالي من السيرفر
              </div>
            )}
          </div>

          {/* 5. سبب العملية */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات / سبب العملية
            </label>
            <Input
              value={opReason}
              onChange={(e) => setOpReason(e.target.value)}
              placeholder="تصفية دورية..."
            />
          </div>

          {/* أزرار العمليات والتدفق الإجرائي */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              {savedOperation && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleOpenAdjustmentRequest}
                    disabled={isAdjustmentSubmitting}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50 gap-1 text-[11px]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    طلب تعديل تصفية
                  </Button>

                  {opMode === OperationMode.SettleAndWithdraw && opTransferToRider && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleOpenTransferRequest}
                      disabled={isTransferSubmitting}
                      className="text-purple-700 border-purple-300 hover:bg-purple-50 gap-1 text-[11px]"
                    >
                      <Send className="h-3.5 w-3.5" />
                      طلب ترحيل واعتماد
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsOpModalOpen(false)}
                disabled={opSubmitting}
              >
                إغلاق
              </Button>

              {!savedOperation ? (
                <Button
                  size="sm"
                  onClick={handleSaveOperationDraft}
                  disabled={opSubmitting || previewLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5"
                >
                  {opSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  حفظ مسودة (Ready)
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleExecuteOperation}
                  disabled={opSubmitting || opTransferToRider}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                  title={
                    opTransferToRider
                      ? "عملية الترحيل تتطلب اعتماد المدير أولاً"
                      : "تنفيذ الحركة المالية وسحب الحساب إن وجد"
                  }
                >
                  {opSubmitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  تنفيذ الحركة المالية
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* 3. Account Details Modal (تفاصيل الحساب الشاملة)                    */}
      {/* ================================================================= */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="تفاصيل وسجلات حساب جاهز V2"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {detailsLoading ? (
            <div className="py-12 text-center text-gray-500">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-amber-500 mb-2" />
              جارٍ تحميل السجلات الكاملة للحساب...
            </div>
          ) : accountDetails ? (
            <div>
              {/* تبويبات التفاصيل */}
              <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto text-xs font-semibold">
                <button
                  onClick={() => setDetailsTab("overview")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    detailsTab === "overview"
                      ? "bg-amber-500 text-white font-bold"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                  }`}
                >
                  معلومات الحساب
                </button>
                <button
                  onClick={() => setDetailsTab("handovers")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    detailsTab === "handovers"
                      ? "bg-amber-500 text-white font-bold"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                  }`}
                >
                  فترات الإسناد ({accountDetails.handovers.items?.length || 0})
                </button>
                <button
                  onClick={() => setDetailsTab("operations")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    detailsTab === "operations"
                      ? "bg-amber-500 text-white font-bold"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                  }`}
                >
                  العمليات ({accountDetails.operations.items?.length || 0})
                </button>
                <button
                  onClick={() => setDetailsTab("requests")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    detailsTab === "requests"
                      ? "bg-amber-500 text-white font-bold"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                  }`}
                >
                  الطلبات ({accountDetails.requests.items?.length || 0})
                </button>
                <button
                  onClick={() => setDetailsTab("fees")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    detailsTab === "fees"
                      ? "bg-amber-500 text-white font-bold"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                  }`}
                >
                  الرسوم ({accountDetails.fees.items?.length || 0})
                </button>
                <button
                  onClick={() => setDetailsTab("orders")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    detailsTab === "orders"
                      ? "bg-amber-500 text-white font-bold"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                  }`}
                >
                  الطلبات اليومية ({accountDetails.orders.items?.length || 0})
                </button>
                <button
                  onClick={() => setDetailsTab("ledger")}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    detailsTab === "ledger"
                      ? "bg-amber-500 text-white font-bold"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
                  }`}
                >
                  دفتر الأستاذ ({accountDetails.ledger.items?.length || 0})
                </button>
              </div>

              {/* محتوى التبويبات */}
              <div className="pt-3">
                {detailsTab === "overview" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/40">
                      <div className="font-bold text-gray-800 dark:text-gray-200">
                        بيانات الحساب الأساسية:
                      </div>
                      <div>رقم الحساب: {accountDetails.account.code}</div>
                      <div>المعرف الخارجي: {accountDetails.account.externalAccountId}</div>
                      <div>اسم المستخدم: {accountDetails.account.userName || "-"}</div>
                      <div>المدينة: {accountDetails.account.cityNameAr}</div>
                      <div>الكفيل: {accountDetails.account.sponsorNameAr || "بدون"}</div>
                      <div>
                        الحالة التشغيلية: {accountDetails.account.status} (
                        {accountDetails.account.isAssigned ? "مسند" : "متاح"})
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/40">
                      <div className="font-bold text-gray-800 dark:text-gray-200">
                        الأطراف والملاحظات:
                      </div>
                      <div>المالك الرسمي: {accountDetails.account.owner?.nameAr || "-"}</div>
                      <div>المندوب الفعلي: {accountDetails.account.actualRider?.nameAr || "لا يوجد"}</div>
                      <div>ملاحظات الملكية: {accountDetails.account.ownershipNotes || "-"}</div>
                      <div>ملاحظات التشغيل: {accountDetails.account.operationalNotes || "-"}</div>
                    </div>
                  </div>
                )}

                {detailsTab === "operations" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="border-b bg-gray-50 dark:bg-gray-800 font-bold">
                        <tr>
                          <th className="py-2 px-3">رقم العملية</th>
                          <th className="py-2 px-3">النوع</th>
                          <th className="py-2 px-3">الصافي</th>
                          <th className="py-2 px-3">العمولة</th>
                          <th className="py-2 px-3">المتبقي</th>
                          <th className="py-2 px-3">الحالة</th>
                          <th className="py-2 px-3">التاريخ</th>
                          <th className="py-2 px-3 text-center">طريقة الدفع / الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {accountDetails.operations.items?.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-4 text-center text-gray-400">
                              لا توجد عمليات مسجلة على هذا الحساب
                            </td>
                          </tr>
                        ) : (
                          accountDetails.operations.items?.map((op) => {
                            const canEditThisOp = canEditPaymentMethod(
                              op,
                              can("jahez.settle"),
                              can("jahez.money.disburse"),
                            );

                            return (
                              <tr key={op.id}>
                                <td className="py-2 px-3 font-mono">{op.id.slice(0, 8)}</td>
                                <td className="py-2 px-3">
                                  {op.mode === 1
                                    ? "تصفية"
                                    : op.mode === 2
                                    ? "تصفية وسحب"
                                    : "سحب فقط"}
                                </td>
                                <td className="py-2 px-3 font-mono">{op.net.toFixed(2)}</td>
                                <td className="py-2 px-3 font-mono">{op.commission.toFixed(2)}</td>
                                <td className="py-2 px-3 font-mono font-bold">
                                  {op.remaining.toFixed(2)}
                                </td>
                                <td className="py-2 px-3">
                                  <Badge
                                    tone={
                                      op.status === 3
                                        ? "green"
                                        : op.status === 2
                                        ? "orange"
                                        : "blue"
                                    }
                                  >
                                    {op.status === 3
                                      ? "منفذة"
                                      : op.status === 2
                                      ? "قيد المراجعة"
                                      : "جاهزة"}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-gray-400">
                                  {op.effectiveAtUtc?.slice(0, 10)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {canEditThisOp ? (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        setEditPaymentOpId(op.id);
                                        setEditPaymentInitialOp(op);
                                        setEditPaymentContext({
                                          riderName:
                                            accountDetails.account.actualRider?.nameAr ||
                                            accountDetails.account.owner?.nameAr,
                                          accountCode: accountDetails.account.code,
                                          settlementDate: op.throughDate,
                                        });
                                        setIsEditPaymentOpen(true);
                                      }}
                                      className="h-6 px-2 text-[10px] font-bold gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900 shadow-2xs"
                                      title="تعديل طريقة صرف التصفية (الخزنة ↔ الحساب البنكي)"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                      تعديل طريقة الدفع
                                    </Button>
                                  ) : (
                                    <span className="text-gray-400 font-mono text-[11px]">
                                      {op.fund === 1 ? "الخزنة" : op.fund === 3 ? "البنك" : "-"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* بقية التبويبات تعرض السجلات بوضوح */}
                {detailsTab === "handovers" && (
                  <div className="space-y-2">
                    {accountDetails.handovers.items?.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-xl border p-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold">فترة تسليم #{h.id.slice(0, 8)}</div>
                          <div className="text-gray-400 text-[10px]">
                            بدأت في: {h.startedAtUtc?.slice(0, 10)} • انتهاء:{" "}
                            {h.endedAtUtc ? h.endedAtUtc.slice(0, 10) : "مستمرة"}
                          </div>
                        </div>
                        <div className="text-left font-mono text-[11px]">
                          عمولة حتى: {h.commissionPostedThrough || "لم تبدأ"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* 4. Update Status Modal                                             */}
      {/* ================================================================= */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="تحديث حالة حساب جاهز"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {statusAccount && (
            <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
              <span className="font-bold">الحساب: {statusAccount.code}</span>
              <div className="text-gray-500">الحالة الحالية: {statusAccount.status}</div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              الحالة التشغيلية الجديدة *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as Account["status"])}
              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="Available">متاح للتشغيل (Available)</option>
              <option value="Assigned">مسند (Assigned)</option>
              <option value="Suspended">موقوف إدارياً (Suspended)</option>
              <option value="Retired">متقاعد (Retired)</option>
              <option value="Archived">مؤرشف (Archived)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              سبب تغيير الحالة *
            </label>
            <Input
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="اكتب سبب التعديل..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={statusSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={submitStatusUpdate}
              disabled={statusSubmitting || !statusReason.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {statusSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "حفظ الحالة"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* 5. Fee Receipt Modal                                               */}
      {/* ================================================================= */}
      <Modal
        isOpen={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        title="قبض رسوم فتح الحساب"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {feeAccount && (
            <div className="rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="font-bold">
                الحساب: {feeAccount.code} ({feeAccount.userName || "-"})
              </div>
              <div className="text-[11px]">
                المندوب: {feeAccount.actualRider?.nameAr || "-"} (إقامة:{" "}
                {feeAccount.actualRider?.iqamaNo || "-"})
              </div>
            </div>
          )}

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
              مرجع الإيصال الفعلي *
            </label>
            <Input
              value={feeReference}
              onChange={(e) => setFeeReference(e.target.value)}
              placeholder="FEE-CASH-123..."
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              البيان / السبب
            </label>
            <Input value={feeReason} onChange={(e) => setFeeReason(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsFeeModalOpen(false)}
              disabled={feeSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={submitFeeReceipt}
              disabled={feeSubmitting || !feeReference.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {feeSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "تسجيل القبض"}
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
        }}
        operationId={editPaymentOpId}
        initialOperation={editPaymentInitialOp}
        contextInfo={editPaymentContext}
        canSettle={can("jahez.settle")}
        canDisburse={can("jahez.money.disburse")}
        onSuccess={() => {
          if (selectedAccountId) {
            openDetailsModal(selectedAccountId);
          }
          loadData();
        }}
      />
    </div>
  );
}
