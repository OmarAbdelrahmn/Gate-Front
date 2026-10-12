// src/components/jahez/dialogs/JahezRiderCollectionModal.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  createAdjustment,
  createLegacyAdoption,
  createSettlement,
  generateIdempotencyKey,
  getAllJahezHandovers,
  getJahezHandoverBalance,
  getJahezRiderAllPeriods,
  validateThroughDate,
  type JahezRiderFullDebtData,
  type JahezRiderPeriodDetail,
} from "@/lib/jahez/api";
import { JahezDebtStatus, JahezLedgerBucket, JahezPaymentStatus } from "@/lib/jahez/constants";
import type {
  JahezBalance,
  JahezHandover,
  LegacyAdoptionRequest,
  LedgerAdjustmentRequest,
  PaymentRequest,
} from "@/lib/jahez/types";
import { JahezDebtStatusBadge } from "@/components/jahez/JahezDebtStatusBadge";
import { JahezPaymentStatusBadge } from "@/components/jahez/JahezPaymentStatusBadge";
import { ConfirmPaidModal } from "@/components/jahez/dialogs/ConfirmPaidModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  HelpCircle,
  Info,
  Lock,
  PlusCircle,
  RefreshCw,
  Scale,
  Sparkles,
  XCircle,
} from "lucide-react";

export interface JahezRiderCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHandoverId?: string;
  initialRiderId?: string;
  onSuccess?: () => void;
  handoversList?: JahezHandover[];
}

interface PeriodAllocation {
  handoverId: string;
  accountDisplay: string;
  periodDates: string;
  debtStatus: JahezDebtStatus;
  platformDebt: number;
  fees: number;
  commission: number;
  commissionComplete: boolean;
  problems: string[];
  allocatedDebt: number;
  allocatedFee: number;
  idempotencyKey: string;
  status: "idle" | "running" | "success" | "failed";
  settlementId?: string;
  errorMessage?: string;
}

export function JahezRiderCollectionModal({
  isOpen,
  onClose,
  initialHandoverId,
  initialRiderId,
  onSuccess,
  handoversList,
}: JahezRiderCollectionModalProps) {
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  // Active rider and handovers cache
  const [allHandovers, setAllHandovers] = useState<JahezHandover[]>(handoversList || []);
  const [selectedRiderId, setSelectedRiderId] = useState<string>(initialRiderId || "");
  const [selectedHandoverId, setSelectedHandoverId] = useState<string>(initialHandoverId || "");

  // Cutoff date for settlement
  const [throughDate, setThroughDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  // Full rider periods & summary
  const [riderData, setRiderData] = useState<JahezRiderFullDebtData | null>(null);
  const [isLoadingRiderData, setIsLoadingRiderData] = useState(false);

  // Collection Mode: "single" | "multi"
  const [collectionMode, setCollectionMode] = useState<"single" | "multi">("single");

  // Single Period Collection Form
  const [singleHandoverId, setSingleHandoverId] = useState<string>("");
  const [singleFeePayment, setSingleFeePayment] = useState<number | "">("");
  const [singleDebtPayment, setSingleDebtPayment] = useState<number | "">("");
  const [singleCommissionPayment, setSingleCommissionPayment] = useState<number | "">("");
  const [singleCountsAsSettlement, setSingleCountsAsSettlement] = useState(true);
  const [singleIdempotencyKey, setSingleIdempotencyKey] = useState(() => generateIdempotencyKey("stl"));

  // Multi-Period Collection Form
  const [targetTotalDebt, setTargetTotalDebt] = useState<number | "">("");
  const [allocations, setAllocations] = useState<PeriodAllocation[]>([]);

  // Common fields & execution state
  const [reason, setReason] = useState(isEn ? "Rider debt collection and settlement" : "تحصيل وتسوية مديونية مندوب جاهز");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchResults, setBatchResults] = useState<{
    completed: boolean;
    hasErrors: boolean;
    results: PeriodAllocation[];
  } | null>(null);

  // Diagnostic collapsible box
  const [showDiagnosticHelp, setShowDiagnosticHelp] = useState(false);

  // Subsequent Confirm Paid modal
  const [confirmPaidBalance, setConfirmPaidBalance] = useState<JahezBalance | null>(null);

  // Historical unrecorded debt registration state
  const [recordDebtMode, setRecordDebtMode] = useState<"adjustment" | "legacy" | null>(null);
  const [recordHandoverId, setRecordHandoverId] = useState("");
  const [recordAmount, setRecordAmount] = useState<number | "">("");
  const [recordCoveredDate, setRecordCoveredDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [recordReason, setRecordReason] = useState("إثبات رصيد مديونية سابقة غير مسجل للنظام");
  const [isSubmittingRecordDebt, setIsSubmittingRecordDebt] = useState(false);

  // Legacy Adoption state
  const [legacyAssignmentId, setLegacyAssignmentId] = useState("");
  const [legacyOpeningDebt, setLegacyOpeningDebt] = useState<number | "">("");
  const [legacyOpeningFees, setLegacyOpeningFees] = useState<number | "">("");
  const [legacyOpeningComm, setLegacyOpeningComm] = useState<number | "">("");
  const [legacyStartOn, setLegacyStartOn] = useState(() => new Date().toISOString().split("T")[0]);
  const [legacyReason, setLegacyReason] = useState("ترحيل واعتماد حساب قديم غير مهيأ مالياً");

  // Load handovers cache if empty
  useEffect(() => {
    if (isOpen && allHandovers.length === 0) {
      getAllJahezHandovers()
        .then((items) => setAllHandovers(items))
        .catch(() => {});
    }
  }, [isOpen, allHandovers.length]);

  // Sync initial props
  useEffect(() => {
    if (isOpen) {
      if (initialRiderId) {
        setSelectedRiderId(initialRiderId);
      } else if (initialHandoverId) {
        setSelectedHandoverId(initialHandoverId);
        const match = allHandovers.find((h) => h.id === initialHandoverId);
        if (match) {
          const rId = match.riderProfileId || match.actualRiderProfileId;
          if (rId) setSelectedRiderId(rId);
        }
      }
      setBatchResults(null);
      setSingleIdempotencyKey(generateIdempotencyKey("stl"));
    }
  }, [isOpen, initialHandoverId, initialRiderId, allHandovers]);

  // If a handover is selected from list, resolve rider ID
  const handleSelectHandoverChange = (handoverId: string) => {
    setSelectedHandoverId(handoverId);
    setSingleHandoverId(handoverId);
    const match = allHandovers.find((h) => h.id === handoverId);
    if (match) {
      const rId = match.riderProfileId || match.actualRiderProfileId;
      if (rId && rId !== selectedRiderId) {
        setSelectedRiderId(rId);
      }
    }
  };

  // Fetch full rider debt data whenever riderId or throughDate changes
  const fetchRiderData = async (riderId: string, cutoffDate: string) => {
    if (!riderId || !cutoffDate) return;
    setIsLoadingRiderData(true);
    try {
      const data = await getJahezRiderAllPeriods(riderId, cutoffDate);
      setRiderData(data);

      // Pre-select single handover if not already set or not in list
      if (data.periods.length > 0) {
        const found = data.periods.find((p) => p.handover.id === selectedHandoverId);
        const activePeriod = found || data.periods[data.periods.length - 1]; // or latest
        const hId = activePeriod.handover.id;
        setSingleHandoverId(hId);

        // Populate single inputs
        const bal = activePeriod.balance;
        if (!bal.commissionComplete) {
          setSingleDebtPayment("");
          setSingleCommissionPayment(0);
          setSingleCountsAsSettlement(false);
          setSingleFeePayment(Math.max(0, bal.fees));
        } else {
          setSingleDebtPayment(Math.max(0, bal.platformDebt));
          const comm = (bal.postedCommission || 0) + (bal.unpostedCommission || 0);
          setSingleCommissionPayment(comm > 0 ? Number(comm.toFixed(2)) : 0);
          setSingleFeePayment(Math.max(0, bal.fees));
          setSingleCountsAsSettlement(true);
        }
      }

      // Initialize allocations for multi-period mode
      initializeAllocations(data.periods);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر جلب فترات المندوب";
      toast.error("خطأ", msg);
    } finally {
      setIsLoadingRiderData(false);
    }
  };

  // Initialize or re-initialize allocations
  const initializeAllocations = (periods: JahezRiderPeriodDetail[]) => {
    const list: PeriodAllocation[] = periods.map((p) => {
      const accDisplay = p.handover.account?.code || p.handover.externalAccountId || p.balance.externalAccountId || p.handover.accountId;
      const startDate = p.handover.commissionStartsOn || p.handover.startedAtUtc?.slice(0, 10) || "-";
      const endDate = p.handover.endedAtUtc ? p.handover.endedAtUtc.slice(0, 10) : (isEn ? "Open" : "مستمر");
      const comm = Number(((p.balance.postedCommission || 0) + (p.balance.unpostedCommission || 0)).toFixed(2));

      return {
        handoverId: p.handover.id,
        accountDisplay: accDisplay || "-",
        periodDates: `${startDate} → ${endDate}`,
        debtStatus: p.balance.debtStatus,
        platformDebt: Math.max(0, p.balance.platformDebt),
        fees: Math.max(0, p.balance.fees),
        commission: comm,
        commissionComplete: p.balance.commissionComplete,
        problems: p.balance.problems || [],
        allocatedDebt: 0,
        allocatedFee: 0,
        idempotencyKey: generateIdempotencyKey(`stl-${p.handover.id.slice(0, 8)}`),
        status: "idle",
      };
    });
    setAllocations(list);
  };

  useEffect(() => {
    if (selectedRiderId && throughDate) {
      fetchRiderData(selectedRiderId, throughDate);
    }
  }, [selectedRiderId, throughDate]);

  // Validate throughDate
  const handleThroughDateChange = (newDate: string) => {
    setThroughDate(newDate);
    const val = validateThroughDate(newDate, undefined, locale as "ar" | "en");
    if (!val.isValid) {
      setDateValidationError(val.error || "تاريخ غير صالح");
    } else {
      setDateValidationError(null);
    }
  };

  // Selected period for Single Period mode
  const currentSinglePeriod = useMemo(() => {
    if (!riderData || !singleHandoverId) return null;
    return riderData.periods.find((p) => p.handover.id === singleHandoverId) || null;
  }, [riderData, singleHandoverId]);

  // When changing singleHandoverId, sync inputs
  const handleSinglePeriodChange = (hId: string) => {
    setSingleHandoverId(hId);
    setSingleIdempotencyKey(generateIdempotencyKey("stl"));
    if (!riderData) return;
    const match = riderData.periods.find((p) => p.handover.id === hId);
    if (!match) return;

    const bal = match.balance;
    if (!bal.commissionComplete) {
      setSingleDebtPayment("");
      setSingleCommissionPayment(0);
      setSingleCountsAsSettlement(false);
      setSingleFeePayment(Math.max(0, bal.fees));
    } else {
      setSingleDebtPayment(Math.max(0, bal.platformDebt));
      const comm = (bal.postedCommission || 0) + (bal.unpostedCommission || 0);
      setSingleCommissionPayment(comm > 0 ? Number(comm.toFixed(2)) : 0);
      setSingleFeePayment(Math.max(0, bal.fees));
      setSingleCountsAsSettlement(true);
    }
  };

  // Rider options for SearchableSelect
  const riderOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; sublabel?: string; keywords: string }>();
    for (const h of allHandovers) {
      const rId = h.riderProfileId || h.actualRiderProfileId;
      if (!rId) continue;
      if (!map.has(rId)) {
        const name = isEn
          ? h.actualRiderNameEn || h.actualRiderNameAr || h.ownerRiderNameEn || h.ownerRiderNameAr || rId
          : h.actualRiderNameAr || h.actualRiderNameEn || h.ownerRiderNameAr || h.ownerRiderNameEn || rId;
        const emp = h.actualEmployeeId ? `(${h.actualEmployeeId})` : "";
        map.set(rId, {
          value: rId,
          label: `${name} ${emp}`,
          sublabel: `ID: ${rId.slice(0, 8)}...`,
          keywords: `${name} ${emp} ${rId}`,
        });
      }
    }
    return Array.from(map.values());
  }, [allHandovers, isEn]);

  // Total eligible platform debt across all complete periods
  const totalEligiblePlatformDebt = useMemo(() => {
    if (!allocations.length) return 0;
    return allocations
      .filter((a) => a.commissionComplete && a.platformDebt > 0)
      .reduce((sum, a) => sum + a.platformDebt, 0);
  }, [allocations]);

  // Total allocated debt in multi-period table
  const totalAllocatedDebt = useMemo(() => {
    return allocations.reduce((sum, a) => sum + (Number(a.allocatedDebt) || 0), 0);
  }, [allocations]);

  // "اقتراح التوزيع على الأقدم أولاً" - Smart Auto-Distribution (Oldest First)
  const handleAutoDistributeOldestFirst = (targetAmount: number) => {
    let remaining = targetAmount;
    const updated = allocations.map((item) => {
      if (!item.commissionComplete || item.platformDebt <= 0) {
        return { ...item, allocatedDebt: 0 };
      }
      if (remaining <= 0) {
        return { ...item, allocatedDebt: 0 };
      }
      const canTake = Math.min(item.platformDebt, remaining);
      const rounded = Number(canTake.toFixed(2));
      remaining = Number((remaining - rounded).toFixed(2));
      return {
        ...item,
        allocatedDebt: rounded,
        idempotencyKey: generateIdempotencyKey(`stl-${item.handoverId.slice(0, 8)}`),
      };
    });
    setAllocations(updated);
  };

  // Update allocation manually for a period
  const handleUpdateAllocation = (handoverId: string, val: number) => {
    setAllocations((prev) =>
      prev.map((item) => {
        if (item.handoverId !== handoverId) return item;
        const maxAllowed = item.platformDebt;
        const safeVal = Math.min(Math.max(0, val), maxAllowed);
        return {
          ...item,
          allocatedDebt: safeVal,
          idempotencyKey: generateIdempotencyKey(`stl-${item.handoverId.slice(0, 8)}`),
        };
      }),
    );
  };

  // -------------------------------------------------------------
  // Historical Debt Recording Handlers (Requirements 1 & 2)
  // -------------------------------------------------------------

  // Handler: Record Unregistered Historical Debt via Ledger Adjustment (Case A)
  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordHandoverId) {
      toast.error("تنبيه", "يرجى اختيار فترة الاستخدام أو الحساب المستهدف");
      return;
    }
    const amt = Number(recordAmount);
    if (!amt || amt <= 0) {
      toast.error("خطأ", "يجب إدخال مبلغ مديونية موجب صحيح");
      return;
    }
    if (!recordReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب وملاحظة التسجيل");
      return;
    }

    setIsSubmittingRecordDebt(true);
    try {
      const fullReason = `${recordReason.trim()} [تغطية حتى تاريخ: ${recordCoveredDate}]`;
      const payload: LedgerAdjustmentRequest = {
        handoverId: recordHandoverId,
        bucket: JahezLedgerBucket.PlatformDebt,
        amount: amt,
        reason: fullReason,
      };

      await createAdjustment(payload);
      toast.success(
        "تم تسجيل المديونية القديمة بنجاح",
        "تم قيد الرصيد دفترياً دون إنشاء حركة قبض أو صندوق. تم تحديث سقف التحصيل للفترة."
      );

      // Re-fetch rider data so the new debt balance appears
      await fetchRiderData(selectedRiderId, throughDate);

      // Set single debt payment to the recorded amount if on single mode
      setSingleHandoverId(recordHandoverId);
      setSingleDebtPayment(amt);

      setRecordDebtMode(null);
      setRecordAmount("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تسجيل المديونية القديمة";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmittingRecordDebt(false);
    }
  };

  // Handler: Record Unregistered Historical Debt via Legacy Adoption (Case B)
  const handleRecordLegacyAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legacyAssignmentId) {
      toast.error("تنبيه", "يرجى تحديد معرف التعيين / الإسناد القديم");
      return;
    }

    setIsSubmittingRecordDebt(true);
    try {
      const payload: LegacyAdoptionRequest = {
        assignmentId: legacyAssignmentId,
        financialStartOn: legacyStartOn,
        openingDebt: Number(legacyOpeningDebt) || 0,
        openingFees: Number(legacyOpeningFees) || 0,
        openingCommission: Number(legacyOpeningComm) || 0,
        reason: legacyReason.trim(),
      };

      await createLegacyAdoption(payload);
      toast.success("تم اعتماد الحساب السابق بنجاح", "تمت تهيئة الحساب وإدراج أرصدته في النظام.");

      await fetchRiderData(selectedRiderId, throughDate);
      setRecordDebtMode(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل اعتماد الحساب السابق";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmittingRecordDebt(false);
    }
  };

  // -------------------------------------------------------------
  // Submission Handlers
  // -------------------------------------------------------------

  // 1. Submit Single Period
  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSinglePeriod) return;

    const bal = currentSinglePeriod.balance;
    const fPay = Number(singleFeePayment) || 0;
    const dPay = Number(singleDebtPayment) || 0;
    const cPay = Number(singleCommissionPayment) || 0;

    if (fPay <= 0 && dPay <= 0 && cPay <= 0) {
      toast.error("تنبيه", "يرجى إدخال مبلغ للتحصيل");
      return;
    }

    if (!bal.commissionComplete && (dPay > 0 || cPay > 0 || singleCountsAsSettlement)) {
      toast.error(
        "خطأ في الشروط",
        isEn
          ? "Commission calculation data is incomplete for this period. Settlements and debt/commission payments are blocked until earnings are recorded. Only fees can be collected with countsAsSettlement=false."
          : "بيانات احتساب العمولة غير مكتملة لهذه الفترة. يُمنع إرسال أي تحصيل يحتاج countsAsSettlement=true (بما في ذلك مديونية جاهز)؛ لأن الباك إند يثبت العمولة حتى نهاية فترة التصفية قبل تسجيل التحصيل. يُسمح فقط بتحصيل الرسوم بدون تسوية (countsAsSettlement=false)."
      );
      return;
    }

    const maxDebt = Math.max(0, bal.platformDebt);
    if (dPay > maxDebt) {
      toast.error(
        "خطأ",
        isEn
          ? `Debt payment (${dPay} SAR) exceeds platform debt balance (${maxDebt} SAR)`
          : `المبلغ المدخل لمديونية جاهز (${dPay} ر.س) يتجاوز الرصيد المستحق لهذه الفترة (${maxDebt} ر.س). لسداد مديونية فترات أخرى، استخدم وضع التحصيل المتعدد.`
      );
      return;
    }

    const maxFee = Math.max(0, bal.fees);
    if (fPay > maxFee) {
      toast.error(
        "خطأ",
        isEn
          ? `Fee payment (${fPay} SAR) exceeds outstanding fees (${maxFee} SAR)`
          : `المبلغ المدخل لرسوم الحساب (${fPay} ر.س) يتجاوز الرصيد المستحق (${maxFee} ر.س)`
      );
      return;
    }

    const mustCount = dPay > 0 || cPay > 0;
    const finalCounts = mustCount ? true : singleCountsAsSettlement;

    setIsSubmitting(true);
    try {
      const payload: PaymentRequest = {
        handoverId: singleHandoverId,
        throughDate,
        feePayment: fPay,
        debtPayment: dPay,
        commissionPayment: cPay,
        countsAsSettlement: finalCounts,
        reason: reason.trim(),
      };

      const result = await createSettlement(payload, singleIdempotencyKey);
      toast.success(
        "تم بنجاح",
        isEn ? `Collection recorded successfully (#${result.id})` : `تم تسجيل التحصيل المالي بنجاح (رقم: ${result.id.slice(0, 8)})`
      );

      // Refresh rider data
      if (selectedRiderId) {
        await fetchRiderData(selectedRiderId, throughDate);
      }
      if (onSuccess) onSuccess();

      // Check if Confirm Paid can be triggered
      const freshBal = await getJahezHandoverBalance(singleHandoverId, throughDate).catch(() => null);
      const checkBal = freshBal || bal;
      if (
        checkBal &&
        checkBal.debtStatus !== JahezDebtStatus.Active &&
        (checkBal.outstandingAmount ?? 0) === 0 &&
        checkBal.commissionComplete &&
        can("jahez.collections.create")
      ) {
        setConfirmPaidBalance(checkBal);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشلت عملية التحصيل";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Multi-Period Collection
  const handleSubmitMulti = async (retryFailedOnly = false) => {
    const opsToRun = allocations.filter((a) => {
      const hasAmount = a.allocatedDebt > 0 || a.allocatedFee > 0;
      if (retryFailedOnly) {
        return a.status === "failed";
      }
      return hasAmount && a.status !== "success";
    });

    if (opsToRun.length === 0) {
      toast.error("تنبيه", "لا توجد مبالغ موزعة للتحصيل أو لا توجد عمليات فاشلة لإعادة محاولتها");
      return;
    }

    setIsSubmitting(true);
    const updatedAllocations = [...allocations];

    for (const op of opsToRun) {
      const idx = updatedAllocations.findIndex((a) => a.handoverId === op.handoverId);
      if (idx === -1) continue;

      updatedAllocations[idx] = {
        ...updatedAllocations[idx],
        status: "running",
        errorMessage: undefined,
      };
      setAllocations([...updatedAllocations]);

      try {
        const payload: PaymentRequest = {
          handoverId: op.handoverId,
          throughDate,
          feePayment: op.allocatedFee,
          debtPayment: op.allocatedDebt,
          commissionPayment: 0,
          countsAsSettlement: op.allocatedDebt > 0,
          reason: reason.trim(),
        };

        const result = await createSettlement(payload, op.idempotencyKey);
        updatedAllocations[idx] = {
          ...updatedAllocations[idx],
          status: "success",
          settlementId: result.id,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "فشل التحصيل على هذه الفترة";
        updatedAllocations[idx] = {
          ...updatedAllocations[idx],
          status: "failed",
          errorMessage: msg,
        };
      }
      setAllocations([...updatedAllocations]);
    }

    setIsSubmitting(false);

    // Analyze overall outcomes
    const completedOps = updatedAllocations.filter((a) => (a.allocatedDebt > 0 || a.allocatedFee > 0));
    const anyFailed = completedOps.some((a) => a.status === "failed");
    const allSuccess = completedOps.length > 0 && completedOps.every((a) => a.status === "success");

    setBatchResults({
      completed: true,
      hasErrors: anyFailed,
      results: completedOps,
    });

    // Refresh data
    if (selectedRiderId) {
      fetchRiderData(selectedRiderId, throughDate);
    }
    if (onSuccess) onSuccess();

    if (allSuccess) {
      toast.success(
        "اكتملت التسويات",
        isEn
          ? "All period collections recorded successfully!"
          : "تم تسجيل كافة تحصيلات الفترات بنجاح دون تجاوز سقف أي فترة!"
      );
    } else if (anyFailed) {
      toast.error(
        "تنبيه جزئي",
        isEn
          ? "Some collections succeeded while others failed. Review below and retry failed operations only."
          : "تم تحصيل بعض الفترات بنجاح وفشلت أخرى. يمكنك مراجعة التفاصيل وإعادة محاولة العمليات الفاشلة فقط."
      );
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEn ? "Record Jahez Rider Collection" : "تسجيل تحصيل مالي لمندوب جاهز"}
      >
        <div className="space-y-4">
          {/* Top Controls: Rider Selection & Cutoff Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                {isEn ? "Select Rider" : "اختر المندوب"}
              </label>
              <SearchableSelect
                value={selectedRiderId}
                onChange={(val) => {
                  setSelectedRiderId(val);
                  setBatchResults(null);
                }}
                options={riderOptions}
                placeholder={isEn ? "Search rider by name, ID..." : "ابحث عن المندوب بالاسم أو الرقم..."}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {isEn ? "Settlement Cutoff Date (throughDate)" : "نهاية فترة التصفية (حتى تاريخ)"}
                </label>
                {isLoadingRiderData && (
                  <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {isEn ? "Calculating..." : "جارٍ الاحتساب..."}
                  </span>
                )}
              </div>
              <Input
                type="date"
                value={throughDate}
                onChange={(e) => handleThroughDateChange(e.target.value)}
                required
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {isEn
                  ? "Cutoff date fixes commission up to this date. Server records actual collection timestamp."
                  : "تحديد نهاية فترة التصفية يثبت احتساب العمولة حتى هذا التاريخ. الخادم يسجل وقت التحصيل الفعلي آليًا عند الحفظ."}
              </p>
              {dateValidationError && (
                <p className="text-xs text-red-600 font-semibold mt-0.5">{dateValidationError}</p>
              )}
            </div>
          </div>

          {/* Rider Debt Summary Cards */}
          {selectedRiderId && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-900 dark:text-blue-200">
                    {isEn ? "Rider Total Liability Summary" : "إجمالي مستحقات ومطلوبات المندوب (الباك إند)"}
                  </span>
                  {riderData?.summary && (
                    <JahezPaymentStatusBadge status={riderData.summary.paymentStatus} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecordHandoverId(currentSinglePeriod?.handover.id || riderData?.periods[0]?.handover.id || "");
                      setRecordDebtMode("adjustment");
                    }}
                    className="text-amber-800 bg-amber-100/90 hover:bg-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded flex items-center gap-1 text-[11px] font-semibold transition-colors"
                  >
                    <PlusCircle className="h-3 w-3" />
                    <span>إثبات رصيد قديم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchRiderData(selectedRiderId, throughDate)}
                    disabled={isLoadingRiderData}
                    className="text-blue-700 dark:text-blue-300 hover:text-blue-900 flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingRiderData ? "animate-spin" : ""}`} />
                    <span>{isEn ? "Refresh Dues" : "تحديث المستحقات"}</span>
                  </button>
                </div>
              </div>

              {riderData?.summary ? (
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="bg-white p-2 rounded-lg border border-blue-200/60 dark:bg-gray-900 dark:border-gray-800 shadow-sm">
                    <span className="text-gray-400 block text-[10px]">{isEn ? "Platform Debt" : "مديونية جاهز (إجمالي)"}</span>
                    <span className="font-bold text-amber-600 text-sm">{riderData.summary.platformDebt} ر.س</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-200/60 dark:bg-gray-900 dark:border-gray-800 shadow-sm">
                    <span className="text-gray-400 block text-[10px]">{isEn ? "Fees" : "رسوم الحساب"}</span>
                    <span className="font-bold text-blue-600 text-sm">{riderData.summary.fees} ر.س</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-200/60 dark:bg-gray-900 dark:border-gray-800 shadow-sm">
                    <span className="text-gray-400 block text-[10px]">{isEn ? "Commission" : "العمولة الإجمالية"}</span>
                    <span className="font-bold text-purple-600 text-sm">
                      {((riderData.summary.postedCommission || 0) + (riderData.summary.unpostedCommission || 0)).toFixed(2)} ر.س
                    </span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 block mt-0.5">
                      مرحّلة: {(riderData.summary.postedCommission || 0).toFixed(2)} | غير مرحّلة: {(riderData.summary.unpostedCommission || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-200/60 dark:bg-gray-900 dark:border-gray-800 shadow-sm">
                    <span className="text-gray-400 block text-[10px]">{isEn ? "Total Receivable" : "إجمالي المطلوب تحصيله"}</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      {riderData.summary.totalReceivable ?? riderData.summary.outstandingAmount} ر.س
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 italic text-[11px]">
                  {isLoadingRiderData ? (isEn ? "Loading rider summary..." : "جارٍ استعلام ملخص المندوب...") : (isEn ? "No summary available" : "لا يوجد ملخص متاح")}
                </p>
              )}

              {/* Ceiling notice */}
              <div className="text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-1.5 pt-0.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600" />
                <span>
                  <strong>تنبيه السقف:</strong> لا يُستخدم إجمالي المستحقات الكلي كسقف لحقل مديونية جاهز؛ فهو يشمل الرسوم والعمولة أيضًا، وكل فترة لها سقفها الخاص بمديونية جاهز.
                </span>
              </div>
            </div>
          )}

          {/* Subform: Record Unregistered Historical Debt (Requirements 1 & 2) */}
          {recordDebtMode && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50/95 dark:bg-amber-950/40 dark:border-amber-700 p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-950 dark:text-amber-200">
                  <Scale className="h-4 w-4 text-amber-700" />
                  <span>تسجيل وإثبات رصيد قديم غير مقيد للنظام</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRecordDebtMode(null)}
                  className="text-xs h-7 py-0"
                >
                  إغلاق
                </Button>
              </div>

              {/* Sub-mode selector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecordDebtMode("adjustment")}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    recordDebtMode === "adjustment"
                      ? "bg-amber-700 text-white shadow-sm"
                      : "bg-white text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  تسوية مالية موثقة (الفترة مهيأة بالفعل)
                </button>
                <button
                  type="button"
                  onClick={() => setRecordDebtMode("legacy")}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    recordDebtMode === "legacy"
                      ? "bg-amber-700 text-white shadow-sm"
                      : "bg-white text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  اعتماد حساب سابق مفتوح (Legacy Adoption)
                </button>
              </div>

              {recordDebtMode === "adjustment" ? (
                <form onSubmit={handleRecordAdjustment} className="space-y-3 pt-1">
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>قاعدة هامة:</strong> تسجيل الدين هو قيد تسوية دفتري إثباتي فقط؛ <strong>لا ينشئ سند قبض ولا حركة نقدية في الصندوق</strong>. بعد الحفظ سيتحدث سقف مديونية جاهز لهذه الفترة فوراً ليتاح تحصيلها نظامياً.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        فترة الاستخدام / الحساب المستهدف
                      </label>
                      <SearchableSelect
                        value={recordHandoverId}
                        onChange={(val) => setRecordHandoverId(val)}
                        options={
                          riderData?.periods.map((p) => {
                            const acc = p.handover.account?.code || p.handover.externalAccountId || p.handover.accountId;
                            const start = p.handover.commissionStartsOn || p.handover.startedAtUtc?.slice(0, 10);
                            const end = p.handover.endedAtUtc ? p.handover.endedAtUtc.slice(0, 10) : "مستمر";
                            return {
                              value: p.handover.id,
                              label: `حساب [${acc}] (${start} → ${end})`,
                              sublabel: `مديونية حالية: ${p.balance.platformDebt} ر.س`,
                            };
                          }) || []
                        }
                        placeholder="اختر الفترة..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        مبلغ المديونية القديمة غير المسجل (ر.س)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="مثال: 5125.00 أو 229.60"
                        value={recordAmount}
                        onChange={(e) => setRecordAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        التاريخ الذي يغطيه الرصيد القديم (لمنع تكراره مع الحركات)
                      </label>
                      <Input
                        type="date"
                        required
                        value={recordCoveredDate}
                        onChange={(e) => setRecordCoveredDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        السبب والمستند الموثق
                      </label>
                      <Input
                        type="text"
                        required
                        value={recordReason}
                        onChange={(e) => setRecordReason(e.target.value)}
                        placeholder="بيان إثبات المديونية السابقة..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={isSubmittingRecordDebt || !recordHandoverId || !recordAmount || Number(recordAmount) <= 0}
                      className="bg-amber-700 hover:bg-amber-800 text-white text-xs"
                    >
                      {isSubmittingRecordDebt ? "جارٍ إثبات الرصيد..." : "إثبات المديونية وتحديث السقف"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRecordLegacyAdoption} className="space-y-3 pt-1">
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>Legacy Adoption:</strong> يُستخدم فقط للإسناد القديم المفتوح الذي لم تتم تهيئته ماليًا برصيد افتتاحي.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        معرف التعيين أو الإسناد القديم (Assignment ID)
                      </label>
                      <Input
                        type="text"
                        required
                        value={legacyAssignmentId}
                        onChange={(e) => setLegacyAssignmentId(e.target.value)}
                        placeholder="معرف التعيين القديم..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        تاريخ بداية الأثر المالي
                      </label>
                      <Input
                        type="date"
                        required
                        value={legacyStartOn}
                        onChange={(e) => setLegacyStartOn(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        مديونية جاهز الافتتاحية (ر.س)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={legacyOpeningDebt}
                        onChange={(e) => setLegacyOpeningDebt(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        رسوم الحساب الافتتاحية (ر.س)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={legacyOpeningFees}
                        onChange={(e) => setLegacyOpeningFees(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        العمولة الافتتاحية (ر.س)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={legacyOpeningComm}
                        onChange={(e) => setLegacyOpeningComm(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        بيان وسبب الاعتماد
                      </label>
                      <Input
                        type="text"
                        required
                        value={legacyReason}
                        onChange={(e) => setLegacyReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={isSubmittingRecordDebt || !legacyAssignmentId}
                      className="bg-amber-700 hover:bg-amber-800 text-white text-xs"
                    >
                      {isSubmittingRecordDebt ? "جارٍ الاعتماد..." : "اعتماد الحساب وتهيئة الرصيد"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Diagnostic Help Accordion (Requirement 5) */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowDiagnosticHelp(!showDiagnosticHelp)}
              className="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 font-medium"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>{isEn ? "Debt exists on this period but not showing in balance?" : "هل توجد مديونية تخص الفترة ولا تظهر في الرصيد المستحق؟"}</span>
              </div>
              {showDiagnosticHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showDiagnosticHelp && (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  إذا كانت المديونية القديمة تخص الفترة نفسها لكن رصيدها صفر أو غير محدث، يرجى فحص الخطوات التالية:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ps-1">
                  <li><strong>معرف الفترة (handoverId):</strong> تأكد من اختيار فترة الاستخدام والحساب المطابق لتلك العمليات.</li>
                  <li><strong>تاريخ نهاية فترة التصفية (throughDate):</strong> اختر تاريخاً يغطي تاريخ تسجيل الحركات واضغط على زر تحديث الرصيد.</li>
                  <li><strong>التهيئة الافتتاحية (Legacy Adoption):</strong> إذا كان الإسناد قديماً، يجب تهيئته عبر صفحة الإسنادات بتسجيل الرصيد الافتتاحي أولاً.</li>
                  <li><strong>استيراد حركات SDP:</strong> تأكد من رفع ملفات العمليات والطلبات لتلك الفترة من صفحة الاستيراد.</li>
                  <li className="text-red-600 font-medium"><strong>تنبيه قطعي:</strong> لا تحاول معالجة رصيد ناقص برفع سقف التحصيل يدوياً أو تكرار تسجيل المديونية؛ فالباك إند يرفض أي تحصيل يتجاوز رصيد البند الفعلي.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          {selectedRiderId && riderData && riderData.periods.length > 0 && (
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
              <button
                type="button"
                onClick={() => setCollectionMode("single")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  collectionMode === "single"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {isEn ? "Single Period Collection" : "التحصيل على فترة واحدة محددة"}
              </button>
              <button
                type="button"
                onClick={() => setCollectionMode("multi")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  collectionMode === "multi"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>{isEn ? "Multi-Period Debt Collection" : "تحصيل مديونية يشمل عدة فترات (توزيع آلي)"}</span>
              </button>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* MODE 1: Single Period Collection */}
          {/* ----------------------------------------------------------------- */}
          {collectionMode === "single" && (
            <form onSubmit={handleSubmitSingle} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  {isEn ? "Select Target Usage Period" : "اختر فترة الاستخدام المستهدفة للتحصيل"}
                </label>
                <SearchableSelect
                  value={singleHandoverId}
                  onChange={(val) => handleSinglePeriodChange(val)}
                  options={
                    riderData?.periods.map((p) => {
                      const acc = p.handover.account?.code || p.handover.externalAccountId || p.balance.externalAccountId || p.handover.accountId;
                      const start = p.handover.commissionStartsOn || p.handover.startedAtUtc?.slice(0, 10);
                      const end = p.handover.endedAtUtc ? p.handover.endedAtUtc.slice(0, 10) : (isEn ? "Open" : "مستمر");
                      return {
                        value: p.handover.id,
                        label: `حساب [${acc}] (${start} → ${end}) - مديونية: ${p.balance.platformDebt} ر.س`,
                        sublabel: `رسوم: ${p.balance.fees} ر.س | إجمالي المستحق: ${p.balance.outstandingAmount} ر.س`,
                        keywords: `${acc} ${start} ${end}`,
                      };
                    }) || []
                  }
                  placeholder={isEn ? "Select period..." : "اختر الفترة..."}
                />
              </div>

              {currentSinglePeriod && (
                <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      أرصدة الفترة المختارة: [
                      {currentSinglePeriod.handover.account?.code ||
                        currentSinglePeriod.handover.externalAccountId ||
                        currentSinglePeriod.balance.externalAccountId ||
                        "-"}
                      ]
                    </span>
                    <JahezDebtStatusBadge status={currentSinglePeriod.balance.debtStatus} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded border dark:bg-gray-900">
                      <span className="text-gray-400 block text-[10px]">رسوم الحساب</span>
                      <span className="font-bold text-blue-600">{currentSinglePeriod.balance.fees} ر.س</span>
                    </div>
                    <div className="bg-white p-2 rounded border dark:bg-gray-900">
                      <span className="text-gray-400 block text-[10px]">مديونية جاهز (لهذه الفترة)</span>
                      <span className="font-bold text-amber-600">{currentSinglePeriod.balance.platformDebt} ر.س</span>
                    </div>
                    <div className="bg-white p-2 rounded border dark:bg-gray-900">
                      <span className="text-gray-400 block text-[10px]">العمولة المحسوبة</span>
                      <span className="font-bold text-purple-600">
                        {((currentSinglePeriod.balance.postedCommission || 0) + (currentSinglePeriod.balance.unpostedCommission || 0)).toFixed(2)} ر.س
                      </span>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 block mt-0.5">
                        مرحّلة: {(currentSinglePeriod.balance.postedCommission || 0).toFixed(2)} | غير مرحّلة: {(currentSinglePeriod.balance.unpostedCommission || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Difference between selected period debt and rider total debt */}
                  {riderData?.summary && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300 space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span>مديونية هذه الفترة: {currentSinglePeriod.balance.platformDebt} ر.س</span>
                        <span>إجمالي مديونية المندوب: {riderData.summary.platformDebt} ر.س</span>
                      </div>
                      {riderData.summary.platformDebt > currentSinglePeriod.balance.platformDebt && (
                        <div className="text-amber-800 dark:text-amber-200 pt-0.5">
                          توجد مديونية إضافية على المندوب في فترات أخرى قدرها{" "}
                          <strong>
                            {(riderData.summary.platformDebt - currentSinglePeriod.balance.platformDebt).toFixed(2)} ر.س
                          </strong>
                          . سقف التحصيل لهذه الفترة هو {currentSinglePeriod.balance.platformDebt} ر.س فقط. لتحصيل الفترات معاً، استخدم وضع التحصيل المتعدد.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Incomplete Commission Alert */}
                  {(!currentSinglePeriod.balance.commissionComplete ||
                    (currentSinglePeriod.balance.problems && currentSinglePeriod.balance.problems.length > 0)) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-2.5 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span>بيانات احتساب العمولة غير مكتملة لهذه الفترة</span>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        سيرفض الباك إند سداد مديونية جاهز أو العمولة حتى اكتمال البيانات. يُسمح فقط بتحصيل الرسوم بدون تصفية.
                      </p>
                      {currentSinglePeriod.balance.problems && currentSinglePeriod.balance.problems.length > 0 && (
                        <ul className="list-disc list-inside text-[11px] ps-1 text-amber-800 dark:text-amber-300">
                          {currentSinglePeriod.balance.problems.map((prob, idx) => (
                            <li key={idx}>{prob}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bucket Inputs */}
              <div className="space-y-3 pt-1">
                {(() => {
                  const maxFee = currentSinglePeriod ? Math.max(0, currentSinglePeriod.balance.fees) : 0;
                  const isFeeExceeded = typeof singleFeePayment === "number" && singleFeePayment > maxFee;
                  return (
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex justify-between mb-1">
                        <span>
                          تحصيل رسوم الحساب (ر.س)
                          <span className="text-gray-500 font-semibold text-[11px] ms-1">
                            (سقف الرسوم: {maxFee} ر.س)
                          </span>
                        </span>
                        <span className="text-blue-600 text-[11px] font-normal">← يدخل في صندوق الرسوم</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={maxFee}
                        placeholder="0.00"
                        value={singleFeePayment}
                        onChange={(e) => setSingleFeePayment(e.target.value === "" ? "" : Number(e.target.value))}
                        className={isFeeExceeded ? "border-red-500 focus:ring-red-500 bg-red-50/20" : ""}
                      />
                      {isFeeExceeded && (
                        <p className="text-xs text-red-600 font-semibold mt-1">
                          المبلغ المدخل ({singleFeePayment} ر.س) يتجاوز رسوم الفترة المستحقة (الحد الأقصى: {maxFee} ر.س).
                        </p>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const maxDebt = currentSinglePeriod ? Math.max(0, currentSinglePeriod.balance.platformDebt) : 0;
                  const isDebtExceeded = typeof singleDebtPayment === "number" && singleDebtPayment > maxDebt;
                  return (
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex justify-between mb-1">
                        <span>
                          تحصيل مديونية جاهز (ر.س)
                          <span className="text-gray-500 font-semibold text-[11px] ms-1">
                            (سقف الفترة: {maxDebt} ر.س)
                          </span>
                        </span>
                        <span className="text-amber-600 text-[11px] font-normal">← يدخل في صندوق التصفيات</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={maxDebt}
                        placeholder="0.00"
                        value={singleDebtPayment}
                        onChange={(e) => setSingleDebtPayment(e.target.value === "" ? "" : Number(e.target.value))}
                        disabled={!currentSinglePeriod?.balance.commissionComplete}
                        className={`${
                          !currentSinglePeriod?.balance.commissionComplete
                            ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                            : isDebtExceeded
                            ? "border-red-500 focus:ring-red-500 bg-red-50/20"
                            : ""
                        }`}
                      />
                      {isDebtExceeded && (
                        <p className="text-xs text-red-600 font-semibold mt-1">
                          {maxDebt === 0
                            ? `لا توجد مديونية جاهز مسجلة على هذه الفترة (الرصيد: 0.00 ر.س). يمنع التحصيل بدون رصيد مديونية مسجل.`
                            : `المبلغ المدخل (${singleDebtPayment} ر.س) يتجاوز الرصيد الموجب لمديونية جاهز لهذه الفترة (الحد الأقصى: ${maxDebt} ر.س).`}
                        </p>
                      )}
                      {maxDebt === 0 && !isDebtExceeded && (
                        <div className="flex items-center justify-between text-[11px] text-amber-800 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 mt-1">
                          <span>مديونية هذه الفترة صفرية. هل توجد مديونية قديمة غير مقيدة في النظام؟</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRecordHandoverId(currentSinglePeriod?.handover.id || "");
                              setRecordDebtMode("adjustment");
                            }}
                            className="text-blue-700 underline font-bold hover:text-blue-900"
                          >
                            تسجيل الرصيد القديم أولاً (إثبات دفتري)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex justify-between mb-1">
                    <span>
                      العمولة المحسوبة (ر.س)
                      <span className="text-gray-400 text-[11px] font-normal ms-1">
                        (محسوبة ومقفلة آلياً حتى نهاية فترة التصفية)
                      </span>
                    </span>
                    <span className="text-purple-600 text-[11px] font-normal">← يدخل في صندوق التصفيات</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={singleCommissionPayment}
                    readOnly
                    disabled
                    className="bg-gray-100/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 font-semibold cursor-not-allowed select-none border-dashed"
                  />
                </div>

                {/* Counts As Settlement Checkbox */}
                {(() => {
                  const mustCount = (Number(singleDebtPayment) > 0) || (Number(singleCommissionPayment) > 0);
                  const isBlocked = !currentSinglePeriod?.balance.commissionComplete;
                  const isDisabled = isBlocked || mustCount;
                  const isChecked = !isBlocked && (mustCount || singleCountsAsSettlement);

                  return (
                    <div className={`rounded-lg border p-3 ${
                      isBlocked
                        ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"
                        : "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    }`}>
                      <label className={`flex items-start gap-2.5 ${isDisabled ? "cursor-default" : "cursor-pointer"}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={(e) => setSingleCountsAsSettlement(e.target.checked)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                        />
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              تحتسب كتسوية رسمية (تجدد عداد الـ 10 أيام لهذه الفترة فقط)
                            </span>
                            {isBlocked ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                                محظور لنقص العمولة
                              </span>
                            ) : mustCount ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                                إلزامي لسداد المديونية
                              </span>
                            ) : null}
                          </div>
                          <span className="text-gray-500 dark:text-gray-400 text-[11px] block mt-0.5">
                            {isBlocked
                              ? "التسوية محظورة لأن احتساب العمولة غير مكتمل. يُسمح فقط بتحصيل الرسوم دون تسوية."
                              : "سداد مديونية جاهز أو عمولة التشغيل يُحتسب تلقائياً كتسوية رسمية ويعيد ضبط مؤقت المطالبة لهذه الفترة المحددة فقط."}
                          </span>
                        </div>
                      </label>
                    </div>
                  );
                })()}

                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    سبب أو ملاحظة التحصيل
                  </label>
                  <Input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    placeholder="بيان سند القبض..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    isSubmitting ||
                    !currentSinglePeriod ||
                    Boolean(dateValidationError) ||
                    (typeof singleDebtPayment === "number" && singleDebtPayment > Math.max(0, currentSinglePeriod.balance.platformDebt)) ||
                    (typeof singleFeePayment === "number" && singleFeePayment > Math.max(0, currentSinglePeriod.balance.fees)) ||
                    (Number(singleFeePayment) || 0) + (Number(singleDebtPayment) || 0) + (Number(singleCommissionPayment) || 0) <= 0 ||
                    (!currentSinglePeriod.balance.commissionComplete && (
                      (Number(singleDebtPayment) || 0) > 0 ||
                      (Number(singleCommissionPayment) || 0) > 0 ||
                      singleCountsAsSettlement
                    ))
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  {isSubmitting
                    ? isEn ? "Recording..." : "جارٍ التسجيل..."
                    : !currentSinglePeriod?.balance?.commissionComplete
                    ? isEn ? "Collect Fees Only" : "تحصيل الرسوم فقط"
                    : isEn ? "Record Collection" : "تسجيل التحصيل لهذه الفترة"}
                </Button>
              </div>
            </form>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* MODE 2: Multi-Period Collection & Distribution */}
          {/* ----------------------------------------------------------------- */}
          {collectionMode === "multi" && (
            <div className="space-y-3.5">
              {totalEligiblePlatformDebt === 0 ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>لا توجد مديونية جاهز مسجلة للتحصيل. راجع الفترات أو سجّل الرصيد القديم إن لم يكن مسجلًا.</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    مجموع مديونية جاهز المتاحة والمكتملة عبر كافة فترات هذا المندوب هو <strong>0.00 ر.س</strong>. لا يمكن رفع السقف أو استخدام بنود الرسوم أو العمولة لزيادة سقف مديونية جاهز.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setRecordHandoverId(riderData?.periods[0]?.handover.id || "");
                        setRecordDebtMode("adjustment");
                      }}
                      className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center gap-1 shadow-sm h-8 px-3"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>تسجيل الرصيد القديم الآن (إثبات دفتري)</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => setCollectionMode("single")}
                      className="text-xs text-blue-700 underline font-semibold hover:text-blue-900 ps-2"
                    >
                      مراجعة الفترات بشكل فردي
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-emerald-600" />
                      <span>توزيع مديونية جاهز على فترات الاستخدام</span>
                    </span>
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      الحد الأقصى القابل للتوزيع: <strong>{totalEligiblePlatformDebt} ر.س</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    أدخل إجمالي المبلغ المطلوب تحصيله من مديونية جاهز، وسيتم توزيعه على الفترات مع ضمان إرسال كل حصة إلى
                    معرف فترتها الخاص (handoverId) دون تجاوز سقف أي فترة.
                  </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalEligiblePlatformDebt}
                      placeholder="المبلغ المراد تحصيله (ر.س)..."
                      value={targetTotalDebt}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setTargetTotalDebt(val);
                        if (typeof val === "number" && val > 0) {
                          handleAutoDistributeOldestFirst(val);
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setTargetTotalDebt(totalEligiblePlatformDebt);
                      handleAutoDistributeOldestFirst(totalEligiblePlatformDebt);
                    }}
                    className="text-xs h-9 bg-white dark:bg-gray-900 text-emerald-700 border-emerald-300 font-semibold"
                  >
                    سداد الإجمالي كاملاً ({totalEligiblePlatformDebt} ر.س)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (typeof targetTotalDebt === "number" && targetTotalDebt > 0) {
                        handleAutoDistributeOldestFirst(targetTotalDebt);
                      }
                    }}
                    disabled={typeof targetTotalDebt !== "number" || targetTotalDebt <= 0}
                    className="text-xs h-9"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    اقتراح التوزيع (الأقدم أولاً)
                  </Button>
                </div>
              </div>
            )}

            {/* Allocations Review Table */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 dark:bg-gray-800/80 px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 flex justify-between items-center">
                  <span>جدول مراجعة التوزيع عبر الفترات (مرتبة من الأقدم)</span>
                  <span className={`text-[11px] font-bold ${
                    totalAllocatedDebt === targetTotalDebt
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}>
                    إجمالي الموزع: {totalAllocatedDebt} ر.س / المطلوب: {targetTotalDebt || 0} ر.س
                  </span>
                </div>

                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-gray-100/70 dark:bg-gray-800/40 text-[11px] text-gray-500 border-b dark:border-gray-800">
                      <tr>
                        <th className="px-3 py-2">الحساب وفترة الاستخدام</th>
                        <th className="px-3 py-2 text-center">حالة الفترة</th>
                        <th className="px-3 py-2 text-center">مديونية جاهز</th>
                        <th className="px-3 py-2 text-center">اكتمال العمولة</th>
                        <th className="px-3 py-2 text-left">المبلغ المخصص (ر.س)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {allocations.map((a) => (
                        <tr key={a.handoverId} className={!a.commissionComplete ? "bg-amber-50/20" : ""}>
                          <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                            <div>حساب [{a.accountDisplay}]</div>
                            <div className="text-[10px] text-gray-400 font-normal">{a.periodDates}</div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <JahezDebtStatusBadge status={a.debtStatus} />
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-amber-600">
                            {a.platformDebt} ر.س
                          </td>
                          <td className="px-3 py-2 text-center">
                            {a.commissionComplete ? (
                              <Badge tone="green">مكتملة</Badge>
                            ) : (
                              <span title={a.problems.join(" - ")}>
                                <Badge tone="red">غير مكتملة</Badge>
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-left">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={a.platformDebt}
                              disabled={!a.commissionComplete || a.platformDebt <= 0 || a.status === "success"}
                              value={a.allocatedDebt}
                              onChange={(e) =>
                                handleUpdateAllocation(
                                  a.handoverId,
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              className={`w-28 text-left font-bold text-xs ${
                                !a.commissionComplete
                                  ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                  : a.status === "success"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : ""
                              }`}
                            />
                            {a.allocatedDebt > a.platformDebt && (
                              <span className="text-[10px] text-red-600 block mt-0.5">يتجاوز السقف!</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  سبب أو ملاحظة التحصيل
                </label>
                <Input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="بيان سند القبض المجمع..."
                />
              </div>

              {/* Execution Progress & Batch Results */}
              {batchResults && (
                <div className={`rounded-xl border p-3 text-xs space-y-2 ${
                  batchResults.hasErrors
                    ? "border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30"
                    : "border-emerald-300 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                }`}>
                  <div className="font-bold flex items-center justify-between">
                    <span className={batchResults.hasErrors ? "text-amber-900 dark:text-amber-200" : "text-emerald-900 dark:text-emerald-200"}>
                      {batchResults.hasErrors
                        ? "نتائج تنفيذ التحصيلات (فشل جزئي)"
                        : "تم تنفيذ كافة التحصيلات بنجاح"}
                    </span>
                    {batchResults.hasErrors && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleSubmitMulti(true)}
                        disabled={isSubmitting}
                        className="text-xs py-1 px-2.5 h-auto bg-amber-600 hover:bg-amber-700 text-white border-none font-semibold"
                      >
                        <RefreshCw className="h-3 w-3 mr-1 inline" />
                        إعادة محاولة العمليات الفاشلة فقط
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {batchResults.results.map((res) => (
                      <div
                        key={res.handoverId}
                        className={`flex items-center justify-between p-2 rounded-lg border text-[11px] ${
                          res.status === "success"
                            ? "bg-white border-emerald-200 dark:bg-gray-900 dark:border-gray-800 text-emerald-800 dark:text-emerald-300"
                            : "bg-white border-red-200 dark:bg-gray-900 dark:border-gray-800 text-red-800 dark:text-red-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {res.status === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                          )}
                          <span>
                            حساب [{res.accountDisplay}]: {res.allocatedDebt} ر.س
                          </span>
                        </div>
                        <div>
                          {res.status === "success" ? (
                            <span className="text-gray-500 text-[10px]">إيصال: #{res.settlementId?.slice(0, 8)}</span>
                          ) : (
                            <span className="text-red-600 font-semibold">{res.errorMessage}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  {isEn ? "Close" : "إغلاق"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleSubmitMulti(false)}
                  disabled={
                    isSubmitting ||
                    totalEligiblePlatformDebt <= 0 ||
                    totalAllocatedDebt <= 0 ||
                    Boolean(dateValidationError) ||
                    Boolean(allocations.some((a) => a.allocatedDebt > a.platformDebt)) ||
                    Boolean(batchResults?.results.every((r) => r.status === "success"))
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  {isSubmitting
                    ? isEn ? "Processing..." : "جارٍ إرسال التحصيلات..."
                    : isEn ? "Confirm & Record All" : `تأكيد وتسجيل التحصيلات (${totalAllocatedDebt} ر.س)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Subsequent Confirm Paid modal if conditions met */}
      {confirmPaidBalance && (
        <ConfirmPaidModal
          isOpen={Boolean(confirmPaidBalance)}
          onClose={() => {
            setConfirmPaidBalance(null);
            onClose();
          }}
          handover={null}
          balance={confirmPaidBalance}
          wasPrecededByCollection={true}
          onSuccess={() => {
            setConfirmPaidBalance(null);
            onClose();
            if (onSuccess) onSuccess();
          }}
        />
      )}
    </>
  );
}
