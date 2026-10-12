// src/app/admin/jahez/settlements/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  createSettlement,
  getJahezHandoverBalance,
  getJahezHandovers,
  getAllJahezHandovers,
  getJahezHandoverSettlements,
  validateThroughDate,
  generateIdempotencyKey,
} from "@/lib/jahez/api";
import type {
  JahezBalance,
  JahezHandover,
  JahezSettlement,
  PaymentRequest,
} from "@/lib/jahez/types";
import { JahezDebtStatus } from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { ConfirmPaidModal } from "@/components/jahez/dialogs/ConfirmPaidModal";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from "lucide-react";

export default function JahezSettlementsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [settlements, setSettlements] = useState<JahezSettlement[]>([]);
  const [handovers, setHandovers] = useState<JahezHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [selectedHandoverId, setSelectedHandoverId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // New Settlement Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalHandoverId, setModalHandoverId] = useState("");
  const [throughDate, setThroughDate] = useState(new Date().toISOString().split("T")[0]);
  const [feePayment, setFeePayment] = useState<number | "">("");
  const [debtPayment, setDebtPayment] = useState<number | "">("");
  const [commissionPayment, setCommissionPayment] = useState<number | "">("");
  const [countsAsSettlement, setCountsAsSettlement] = useState(true);
  const [reason, setReason] = useState("تحصيل وتسوية نقدية للمندوب");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [lastSettlementId, setLastSettlementId] = useState<string | null>(null);
  const [confirmPaidBalance, setConfirmPaidBalance] = useState<JahezBalance | null>(null);

  // Live balance preview for selected handover in modal
  const [modalBalance, setModalBalance] = useState<JahezBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceTrigger, setBalanceTrigger] = useState(0);

  // Load handovers
  const loadHandovers = async () => {
    try {
      const all = await getAllJahezHandovers();
      setHandovers(all);
    } catch {
      // Handled silently
    }
  };

  // Load settlements
  const loadSettlements = async () => {
    setLoading(true);
    try {
      if (selectedHandoverId) {
        const res = await getJahezHandoverSettlements(selectedHandoverId, { page, pageSize });
        setSettlements(res.items || []);
      } else {
        const currentHandovers = handovers.length > 0 ? handovers : await getAllJahezHandovers().catch(() => []);
        if (handovers.length === 0 && currentHandovers.length > 0) {
          setHandovers(currentHandovers);
        }
        const allSettlements: JahezSettlement[] = [];
        for (const h of currentHandovers.slice(0, 5)) {
          const sRes = await getJahezHandoverSettlements(h.id, { pageSize: 20 });
          allSettlements.push(...(sRes.items || []));
        }
        setSettlements(allSettlements);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تحميل التحصيلات";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHandovers();
  }, []);

  useEffect(() => {
    startTransition(() => {
      loadSettlements();
    });
  }, [selectedHandoverId, page]);

  useEffect(() => {
    if (!modalHandoverId || !throughDate) {
      setModalBalance(null);
      setCommissionPayment("");
      return;
    }
    let cancelled = false;
    setBalanceLoading(true);
    getJahezHandoverBalance(modalHandoverId, throughDate)
      .then((b) => {
        if (!cancelled) {
          setModalBalance(b);
          if (!b.commissionComplete) {
            setDebtPayment("");
            setCommissionPayment(0);
            setCountsAsSettlement(false);
          } else {
            const totalComm = (b.postedCommission || 0) + (b.unpostedCommission || 0);
            setCommissionPayment(Number(Math.max(0, totalComm).toFixed(2)));
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModalBalance(null);
          setCommissionPayment(0);
        }
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [modalHandoverId, throughDate, balanceTrigger]);

  const handleOpenModal = (handoverId?: string) => {
    const targetHandoverId = handoverId || selectedHandoverId || (handovers[0]?.id ?? "");
    setModalHandoverId(targetHandoverId);
    setThroughDate(new Date().toISOString().split("T")[0]);
    setDateValidationError(null);
    setIdempotencyKey(generateIdempotencyKey("stl"));
    setFeePayment("");
    setDebtPayment("");
    setCountsAsSettlement(true);
    setReason(isEn ? "Rider cash collection and settlement" : "تحصيل وتسوية نقدية للمندوب");
    setBalanceTrigger((prev) => prev + 1);
    setIsModalOpen(true);
  };

  const handleThroughDateChange = async (newDate: string) => {
    setThroughDate(newDate);
    setIdempotencyKey(generateIdempotencyKey("stl"));
    if (!modalHandoverId) return;

    const val = validateThroughDate(newDate, {
      startedAtUtc: modalBalance?.reminderAnchorAtUtc,
    }, locale);
    if (!val.isValid) {
      setDateValidationError(val.error || (isEn ? "Invalid date" : "تاريخ غير صحيح"));
      return;
    }
    setDateValidationError(null);
    setBalanceLoading(true);
    try {
      const fresh = await getJahezHandoverBalance(modalHandoverId, newDate);
      setModalBalance(fresh);
      if (!fresh.commissionComplete) {
        setDebtPayment("");
        setCommissionPayment(0);
        setCountsAsSettlement(false);
      } else {
        const comm = (fresh.postedCommission || 0) + (fresh.unpostedCommission || 0);
        setCommissionPayment(Number(Math.max(0, comm).toFixed(2)));
        if (Number(debtPayment) > fresh.platformDebt) {
          setDebtPayment(fresh.platformDebt > 0 ? fresh.platformDebt : "");
        }
      }
    } catch (err: unknown) {
      console.warn("Could not refetch balance for throughDate:", err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handlePaymentAmountChange = (
    field: "fee" | "debt" | "reason" | "counts",
    val: any
  ) => {
    setIdempotencyKey(generateIdempotencyKey("stl"));
    if (field === "fee") setFeePayment(val);
    if (field === "debt") setDebtPayment(val);
    if (field === "reason") setReason(val);
    if (field === "counts") setCountsAsSettlement(val);
  };

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalHandoverId) {
      toast.error("تنبيه", "يرجى اختيار حساب التسليم أولاً");
      return;
    }

    if (balanceLoading) {
      toast.error("تنبيه", isEn ? "Please wait for the balance to finish calculating" : "يرجى الانتظار حتى اكتمال استعلام الرصيد");
      return;
    }

    const dateVal = validateThroughDate(throughDate, {
      startedAtUtc: modalBalance?.reminderAnchorAtUtc,
    }, locale);
    if (!dateVal.isValid) {
      toast.error("خطأ في التاريخ", dateVal.error || "تاريخ غير صحيح");
      return;
    }

    const fPay = Number(feePayment) || 0;
    const dPay = Number(debtPayment) || 0;
    const cPay = Number(commissionPayment) || 0;
    const totalPay = fPay + dPay + cPay;

    if (totalPay <= 0) {
      toast.error("خطأ", "يجب أن يكون إجمالي المبلغ المحصل أكبر من صفر");
      return;
    }

    // When commission is incomplete:
    // - Prevent any collection that requires countsAsSettlement=true (full or partial).
    // - Includes platform debt collection even when commissionPayment=0.
    // - Allow fee payment only with countsAsSettlement=false.
    if (modalBalance && !modalBalance.commissionComplete) {
      if (countsAsSettlement || dPay > 0 || cPay > 0) {
        toast.error(
          "خطأ في الشروط",
          isEn
            ? "Commission calculation data is incomplete for this period. Settlements and debt/commission payments are blocked until earnings are recorded. You may only collect account fees with countsAsSettlement=false."
            : "بيانات احتساب العمولة غير مكتملة لهذه الفترة. يُمنع إرسال أي تحصيل يحتاج countsAsSettlement=true (بما في ذلك مديونية جاهز)؛ لأن الباك إند يثبت العمولة حتى نهاية فترة التصفية قبل تسجيل التحصيل. يُسمح فقط بتحصيل الرسوم بدون تسوية (countsAsSettlement=false)."
        );
        return;
      }
    }

    // Ceilings per bucket: Cannot pay more than positive outstanding balance
    const maxFee = Math.max(0, modalBalance?.fees ?? 0);
    const maxDebt = Math.max(0, modalBalance?.platformDebt ?? 0);
    const maxComm = Math.max(0, Number(((modalBalance?.postedCommission ?? 0) + (modalBalance?.unpostedCommission ?? 0)).toFixed(2)));

    if (fPay > maxFee) {
      toast.error(
        "خطأ",
        isEn
          ? `Fee payment (${fPay} SAR) exceeds outstanding fees balance (${maxFee} SAR)`
          : `المبلغ المدخل لرسوم الحساب (${fPay} ر.س) يتجاوز الرصيد المستحق (${maxFee} ر.س)`
      );
      return;
    }

    if (dPay > maxDebt) {
      toast.error(
        "خطأ",
        isEn
          ? `Debt payment (${dPay} SAR) exceeds platform debt balance (${maxDebt} SAR)`
          : `المبلغ المدخل لمديونية جاهز (${dPay} ر.س) يتجاوز الرصيد المستحق (${maxDebt} ر.س)`
      );
      return;
    }

    if (cPay > maxComm) {
      toast.error(
        "خطأ",
        isEn
          ? `Commission payment (${cPay} SAR) exceeds outstanding commission (${maxComm} SAR)`
          : `المبلغ المدخل لعمولة التشغيل (${cPay} ر.س) يتجاوز الرصيد المستحق (${maxComm} ر.س)`
      );
      return;
    }

    if (!reason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب أو ملاحظة التحصيل");
      return;
    }

    // countsAsSettlement enforcement: Any collection of debt or commission MUST count as settlement
    const mustCountAsSettlement = dPay > 0 || cPay > 0;
    const finalCountsAsSettlement = mustCountAsSettlement ? true : countsAsSettlement;

    setIsSubmitting(true);
    try {
      const payload: PaymentRequest = {
        handoverId: modalHandoverId,
        throughDate,
        feePayment: fPay,
        debtPayment: dPay,
        commissionPayment: cPay,
        countsAsSettlement: finalCountsAsSettlement,
        reason: reason.trim(),
      };

      const result = await createSettlement(payload, idempotencyKey);
      setLastSettlementId(result.id);
      setIsModalOpen(false);

      // Refresh balance and list
      const freshBal = await getJahezHandoverBalance(modalHandoverId, throughDate).catch(() => null);
      loadSettlements();

      // Check if Confirm Paid conditions are met:
      const checkBal = freshBal || modalBalance;
      const canConfirm =
        checkBal &&
        checkBal.debtStatus !== JahezDebtStatus.Active &&
        (checkBal.outstandingAmount ?? 0) === 0 &&
        checkBal.commissionComplete &&
        can("jahez.collections.create");

      if (canConfirm) {
        setConfirmPaidBalance(checkBal);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشلت عملية التحصيل";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHandoverInfo = (s: JahezSettlement) => {
    const h = handovers.find((item) => item.id === s.handoverId);
    const extId = s.account?.externalAccountId || s.externalAccountId || h?.account?.externalAccountId || h?.externalAccountId;
    const code = s.account?.code || h?.account?.code;
    const ownerName = isEn
      ? (s.ownerRiderNameEn || s.ownerRiderNameAr || h?.ownerRiderNameEn || h?.ownerRiderNameAr)
      : (s.ownerRiderNameAr || s.ownerRiderNameEn || h?.ownerRiderNameAr || h?.ownerRiderNameEn);
    const riderName = isEn
      ? (s.actualRiderNameEn || s.actualRiderNameAr || h?.actualRiderNameEn || h?.actualRiderNameAr)
      : (s.actualRiderNameAr || s.actualRiderNameEn || h?.actualRiderNameAr || h?.actualRiderNameEn);
    return { h, extId, code, ownerName, riderName };
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: `jahez_settlements_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: settlements,
      columns: [
        { header: isEn ? "Recorded At" : "تاريخ التسجيل", accessor: "recordedAtUtc" },
        {
          header: isEn ? "Driver ID" : "رقم الحساب الخارجي",
          accessor: (s) => getHandoverInfo(s).extId || "-",
        },
        {
          header: isEn ? "Account Code" : "رمز الحساب",
          accessor: (s) => getHandoverInfo(s).code || "-",
        },
        {
          header: isEn ? "Owner Name" : "صاحب الحساب",
          accessor: (s) => getHandoverInfo(s).ownerName || "-",
        },
        {
          header: isEn ? "Actual Rider" : "المندوب الفعلي",
          accessor: (s) => getHandoverInfo(s).riderName || "-",
        },
        { header: isEn ? "Cutoff Date" : "تاريخ الاستحقاق", accessor: "throughDate" },
        { header: isEn ? "Fee Payment" : "رسوم الحساب", accessor: "feePayment" },
        { header: isEn ? "Debt Payment" : "مديونية جاهز", accessor: "debtPayment" },
        { header: isEn ? "Commission Payment" : "عمولة التشغيل", accessor: "commissionPayment" },
        { header: isEn ? "Reason" : "السبب", accessor: "reason" },
      ],
    });
  };

  const filteredSettlements = settlements.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const info = getHandoverInfo(s);
    const extId = (info.extId || "").toLowerCase();
    const code = (info.code || "").toLowerCase();
    const owner = (info.ownerName || "").toLowerCase();
    const rider = (info.riderName || "").toLowerCase();
    return (
      extId.includes(term) ||
      code.includes(term) ||
      owner.includes(term) ||
      rider.includes(term) ||
      s.reason.toLowerCase().includes(term) ||
      s.throughDate.includes(term)
    );
  });

  const totalFeeCollected = settlements.reduce((sum, s) => sum + s.feePayment, 0);
  const totalDebtCollected = settlements.reduce((sum, s) => sum + s.debtPayment, 0);
  const totalCommissionCollected = settlements.reduce((sum, s) => sum + s.commissionPayment, 0);
  const grandTotal = totalFeeCollected + totalDebtCollected + totalCommissionCollected;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {isEn ? "Jahez Settlements & Rider Collections" : "تحصيلات وتسويات مناديب جاهز"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Record rider collections across 3 buckets: Account Fees, Platform Debt, and Commission. Updates cashbox sections automatically."
              : "تسجيل تحصيلات المناديب على السلات الثلاث: رسوم الحساب، مديونية جاهز، والعمولة، وتوجيهها آلياً لصندوق النقد."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadSettlements}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={settlements.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isEn ? "Export Excel" : "تصدير إكسل"}
          </Button>

          {can("jahez.collections.create") && (
            <Button
              variant="primary"
              onClick={() => handleOpenModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {isEn ? "New Collection" : "تسجيل تحصيل جديد"}
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isEn ? "Total Collected (SAR)" : "إجمالي التحصيلات (ر.س)"}
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {grandTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-gray-400 mt-1 block">
            {settlements.length} {isEn ? "operations" : "عملية مسجلة"}
          </span>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {isEn ? "Account Fees Collected" : "تحصيلات رسوم الحساب"}
          </span>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {totalFeeCollected.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-blue-500 mt-1 block">
            {isEn ? "→ Directed to Fees Cashbox" : "← يوجّه لصندوق رسوم الحساب"}
          </span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {isEn ? "Platform Debt Collected" : "تحصيلات مديونية جاهز"}
          </span>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {totalDebtCollected.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-amber-500 mt-1 block">
            {isEn ? "→ Directed to Settlements Cashbox" : "← يوجّه لصندوق التسويات"}
          </span>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            {isEn ? "Commission Collected" : "تحصيلات عمولة التشغيل"}
          </span>
          <p className="mt-2 text-2xl font-bold text-purple-700 dark:text-purple-300">
            {totalCommissionCollected.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-purple-500 mt-1 block">
            {isEn ? "→ Directed to Settlements Cashbox" : "← يوجّه لصندوق التسويات"}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Filter by Handover" : "تصفية بحساب التسليم"}
          </label>
          <SearchableSelect
            value={selectedHandoverId}
            onChange={(val) => {
              setSelectedHandoverId(val);
              setPage(1);
            }}
            options={[
              { value: "", label: isEn ? "All Accounts" : "جميع حسابات التسليم" },
              ...handovers.map((h) => {
                const accDisplay = h.account?.externalAccountId || h.externalAccountId || h.account?.code || "-";
                const rider = isEn
                  ? (h.actualRiderNameEn || h.actualRiderNameAr || h.ownerRiderNameEn || h.ownerRiderNameAr)
                  : (h.actualRiderNameAr || h.actualRiderNameEn || h.ownerRiderNameAr || h.ownerRiderNameEn);
                return {
                  value: h.id,
                  label: `[${accDisplay}]${rider ? ` - ${rider}` : ""} (${h.commissionStartsOn})`,
                  sublabel: rider ? `${isEn ? "Rider:" : "المندوب:"} ${rider}` : undefined,
                  keywords: `${accDisplay} ${h.account?.code || ""} ${h.externalAccountId || ""} ${h.account?.externalAccountId || ""} ${h.actualRiderNameAr || ""} ${h.actualRiderNameEn || ""} ${h.ownerRiderNameAr || ""} ${h.ownerRiderNameEn || ""} ${h.commissionStartsOn || ""}`,
                };
              }),
            ]}
          />
        </div>

        <div className="flex-1 relative">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Quick Search" : "بحث سريع"}
          </label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={isEn ? "Search by ID, reason, or date..." : "ابحث برقم المعرف، السبب، أو التاريخ..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Recorded At" : "تاريخ التسجيل"}</th>
                <th className="px-4 py-3">{isEn ? "Account (Driver ID)" : "الحساب (Driver ID)"}</th>
                <th className="px-4 py-3">{isEn ? "Cutoff Date" : "تاريخ الاستحقاق"}</th>
                <th className="px-4 py-3">{isEn ? "Fee Payment" : "رسوم الحساب"}</th>
                <th className="px-4 py-3">{isEn ? "Platform Debt" : "مديونية جاهز"}</th>
                <th className="px-4 py-3">{isEn ? "Commission" : "عمولة التشغيل"}</th>
                <th className="px-4 py-3">{isEn ? "Total Paid" : "المبلغ الإجمالي"}</th>
                <th className="px-4 py-3">{isEn ? "Settlement Type" : "نوع السداد"}</th>
                <th className="px-4 py-3">{isEn ? "Reason" : "السبب والملاحظة"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    {isEn ? "Loading settlements..." : "جارٍ تحميل التحصيلات..."}
                  </td>
                </tr>
              ) : filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <CreditCard className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No settlements found" : "لا توجد تحصيلات مسجلة"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((s) => {
                  const itemTotal = s.feePayment + s.debtPayment + s.commissionPayment;
                  const info = getHandoverInfo(s);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {new Date(s.recordedAtUtc).toLocaleDateString("ar-SA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 dark:text-white block font-mono">
                          {info.extId ? `[${info.extId}]` : info.code || "-"}
                        </span>
                        {info.code && info.code !== info.extId && (
                          <span className="text-xs text-emerald-600 block">
                            {info.code}
                          </span>
                        )}
                        {info.ownerName && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5" title={isEn ? "Account Owner" : "صاحب الحساب"}>
                            {info.ownerName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                        {s.throughDate}
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-semibold">
                        {s.feePayment > 0 ? `${s.feePayment.toLocaleString("ar-SA")} ر.س` : "-"}
                      </td>
                      <td className="px-4 py-3 text-amber-600 font-semibold">
                        {s.debtPayment > 0 ? `${s.debtPayment.toLocaleString("ar-SA")} ر.س` : "-"}
                      </td>
                      <td className="px-4 py-3 text-purple-600 font-semibold">
                        {s.commissionPayment > 0
                          ? `${s.commissionPayment.toLocaleString("ar-SA")} ر.س`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {itemTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                      </td>
                      <td className="px-4 py-3">
                        {s.countsAsSettlement ? (
                          <Badge tone="green">
                            <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                            {isEn ? "Settlement (Resets timer)" : "تسوية (تجدد عداد الـ 10 أيام)"}
                          </Badge>
                        ) : (
                          <Badge tone="gray">
                            {isEn ? "Fee Only" : "رسوم فقط"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title={s.reason}>
                        {s.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Collection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEn ? "Record Jahez Rider Collection" : "تسجيل تحصيل مالي لمندوب جاهز"}
      >
        <form onSubmit={handleSubmitSettlement} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Select Handover Account" : "اختر حساب التسليم"}
            </label>
            <SearchableSelect
              value={modalHandoverId}
              onChange={(val) => setModalHandoverId(val)}
              options={handovers.map((h) => {
                const accDisplay = h.account?.externalAccountId || h.externalAccountId || h.account?.code || "-";
                const rider = isEn
                  ? (h.actualRiderNameEn || h.actualRiderNameAr || h.ownerRiderNameEn || h.ownerRiderNameAr)
                  : (h.actualRiderNameAr || h.actualRiderNameEn || h.ownerRiderNameAr || h.ownerRiderNameEn);
                return {
                  value: h.id,
                  label: `${isEn ? "Account" : "حساب"} [${accDisplay}]${rider ? ` - ${rider}` : ""} (${h.commissionStartsOn})`,
                  sublabel: rider ? `${isEn ? "Rider:" : "المندوب:"} ${rider}` : undefined,
                  keywords: `${accDisplay} ${h.account?.code || ""} ${h.externalAccountId || ""} ${h.account?.externalAccountId || ""} ${h.actualRiderNameAr || ""} ${h.actualRiderNameEn || ""} ${h.ownerRiderNameAr || ""} ${h.ownerRiderNameEn || ""} ${h.commissionStartsOn || ""}`,
                };
              })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {isEn ? "Settlement Period End Date (throughDate)" : "نهاية فترة التصفية (حتى تاريخ)"}
              </label>
              {balanceLoading && (
                <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {isEn ? "Recalculating balance..." : "جارٍ إعادة احتساب الرصيد..."}
                </span>
              )}
            </div>
            <Input
              type="date"
              value={throughDate}
              onChange={(e) => handleThroughDateChange(e.target.value)}
              required
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {isEn
                ? "This cutoff date freezes commission calculation up to this date. It does not alter the actual collection timestamp recorded by the server."
                : "تحديد نهاية فترة التصفية يثبت احتساب العمولة حتى هذا التاريخ. الخادم يسجل وقت التحصيل الفعلي آليًا عند الحفظ."}
            </p>
            {dateValidationError && (
              <p className="text-xs text-red-600 font-semibold mt-1">
                {dateValidationError}
              </p>
            )}
          </div>

          {/* Balance Preview Card */}
          {modalHandoverId && (
            <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-gray-700 dark:text-gray-200">
                <span>{isEn ? "Current Outstanding Balance" : "الأرصدة المستحقة حالياً"}</span>
                <button
                  type="button"
                  onClick={() => setBalanceTrigger((prev) => prev + 1)}
                  disabled={balanceLoading}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title={isEn ? "Refresh Balance" : "تحديث الرصيد"}
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${balanceLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {modalBalance ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                      <span className="text-gray-400 block">{isEn ? "Fees Due" : "رسوم مستحقة"}</span>
                      <span className="font-bold text-blue-600">{modalBalance.fees} ر.س</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                      <span className="text-gray-400 block">{isEn ? "Platform Debt" : "مديونية جاهز"}</span>
                      <span className="font-bold text-amber-600">{modalBalance.platformDebt} ر.س</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
                      <span className="text-gray-400 block">{isEn ? "Commission" : "العمولة"}</span>
                      <span className="font-bold text-purple-600">
                        {((modalBalance.postedCommission || 0) + (modalBalance.unpostedCommission || 0)).toFixed(2)} ر.س
                      </span>
                    </div>
                  </div>

                  {/* Warning if commission calculation data is incomplete */}
                  {(!modalBalance.commissionComplete || (modalBalance.problems && modalBalance.problems.length > 0)) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span>{isEn ? "Commission Data Incomplete" : "بيانات احتساب العمولة غير مكتملة"}</span>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        {isEn
                          ? "Commission calculation data is incomplete for this period. Settlements cannot be finalized until earnings are recorded."
                          : "بيانات نسبة الأرباح غير مكتملة لهذه الفترة، وسيرفض النظام التصفية حتى يتم إدخال كشوف الأرباح المعتمدة."}
                      </p>
                      {modalBalance.problems && modalBalance.problems.length > 0 && (
                        <ul className="list-disc list-inside text-[11px] pt-0.5 space-y-0.5 text-amber-800 dark:text-amber-300">
                          {modalBalance.problems.map((prob, idx) => (
                            <li key={idx}>{prob}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Quick Action: Fill Full Outstanding Balances */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[11px] text-gray-500">
                      {!modalBalance.commissionComplete
                        ? (isEn ? "Only fees can be collected (countsAsSettlement=false)" : "متاح تحصيل رسوم الحساب فقط بدون تصفية")
                        : (isEn ? "Select amounts to collect" : "حدد المبالغ المراد تحصيلها")}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        handlePaymentAmountChange("fee", Math.max(0, modalBalance.fees));
                        if (modalBalance.commissionComplete) {
                          handlePaymentAmountChange("debt", Math.max(0, modalBalance.platformDebt));
                          const comm = Math.max(0, Number(((modalBalance.postedCommission || 0) + (modalBalance.unpostedCommission || 0)).toFixed(2)));
                          setCommissionPayment(comm);
                          handlePaymentAmountChange("counts", true);
                        } else {
                          handlePaymentAmountChange("debt", "");
                          setCommissionPayment(0);
                          handlePaymentAmountChange("counts", false);
                        }
                      }}
                      className="text-xs py-1 px-2.5 h-auto font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />
                      {modalBalance.commissionComplete
                        ? (isEn ? "Fill Full Outstanding Amounts" : "سداد كامل الأرصدة المستحقة")
                        : (isEn ? "Fill Outstanding Fees Only" : "سداد رسوم الحساب فقط")}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 italic">
                  {balanceLoading ? (isEn ? "Loading balance..." : "جارٍ استعلام الرصيد...") : (isEn ? "No balance available" : "تعذر استعلام الرصيد")}
                </p>
              )}
            </div>
          )}

          {/* Payment Buckets Inputs */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex justify-between mb-1">
                <span>
                  {isEn ? "Fee Payment (SAR)" : "تحصيل رسوم الحساب (ر.س)"}
                  {modalBalance && modalBalance.fees > 0 && (
                    <span className="text-gray-400 text-[11px] font-normal ms-1">
                      ({isEn ? "Max:" : "الحد الأقصى:"} {modalBalance.fees} ر.س)
                    </span>
                  )}
                </span>
                <span className="text-blue-600 text-[11px] font-normal">
                  {isEn ? "→ Goes to Account Fees Cashbox" : "← يدخل في صندوق رسوم الحساب"}
                </span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={modalBalance ? Math.max(0, modalBalance.fees) : undefined}
                placeholder="0.00"
                value={feePayment}
                onChange={(e) => handlePaymentAmountChange("fee", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex justify-between mb-1">
                <span>
                  {isEn ? "Debt Payment (SAR)" : "تحصيل مديونية جاهز (ر.س)"}
                  {modalBalance && modalBalance.platformDebt > 0 && (
                    <span className="text-gray-400 text-[11px] font-normal ms-1">
                      ({isEn ? "Max:" : "الحد الأقصى:"} {modalBalance.platformDebt} ر.س)
                    </span>
                  )}
                </span>
                <span className="text-amber-600 text-[11px] font-normal">
                  {isEn ? "→ Goes to Settlements Cashbox" : "← يدخل في صندوق التسويات"}
                </span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={modalBalance ? Math.max(0, modalBalance.platformDebt) : undefined}
                placeholder="0.00"
                value={debtPayment}
                disabled={Boolean(modalBalance && !modalBalance.commissionComplete)}
                onChange={(e) => handlePaymentAmountChange("debt", e.target.value === "" ? "" : Number(e.target.value))}
                className={modalBalance && !modalBalance.commissionComplete ? "bg-gray-100 cursor-not-allowed dark:bg-gray-800" : ""}
              />
              {modalBalance && !modalBalance.commissionComplete && (
                <span className="text-[10px] text-amber-600 block mt-0.5">
                  {isEn
                    ? "Blocked: commission must be complete first"
                    : "محظور حتى اكتمال بيانات العمولة"}
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex justify-between items-center mb-1">
                <span className="flex items-center gap-1.5">
                  <span>{isEn ? "Commission Payment (SAR)" : "تحصيل عمولة التشغيل (ر.س)"}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    <Lock className="h-3 w-3" />
                    {isEn ? "Auto-calculated" : "محسوبة تلقائياً"}
                  </span>
                </span>
                <span className="text-purple-600 text-[11px] font-normal">
                  {isEn ? "→ Goes to Settlements Cashbox" : "← يدخل في صندوق التسويات"}
                </span>
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={balanceLoading ? (isEn ? "Calculating..." : "جارٍ الاحتساب...") : "0.00"}
                  value={commissionPayment}
                  readOnly
                  disabled
                  tabIndex={-1}
                  className="bg-gray-100/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 font-semibold cursor-not-allowed select-none border-dashed"
                />
                {balanceLoading && (
                  <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none">
                    <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {isEn
                  ? "Calculated automatically like the outstanding balance (posted + unposted commission) and locked from editing."
                  : "تُحسب تلقائياً مثل رصيد العمولة المستحقة حالياً (المرحلة + غير المرحلة) ومقفلة بالكامل ولا يمكن تعديلها."}
              </p>
            </div>
          </div>

          {/* Counts as settlement checkbox */}
          {(() => {
            const mustCountAsSettlement = (Number(debtPayment) > 0) || (Number(commissionPayment) > 0);
            const isBlocked = Boolean(modalBalance && !modalBalance.commissionComplete);
            const isDisabled = isBlocked || mustCountAsSettlement;
            const isChecked = !isBlocked && (mustCountAsSettlement || countsAsSettlement);

            return (
              <div className={`rounded-lg border p-3 ${
                isBlocked
                  ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"
                  : "border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/10"
              }`}>
                <label className={`flex items-start gap-2.5 ${isDisabled ? "cursor-default" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={(e) => handlePaymentAmountChange("counts", e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                  />
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {isEn ? "Counts as Settlement (Restarts 10-day overdue timer for this period)" : "تحتسب كتسوية رسمية (تجدد عداد الـ 10 أيام لهذه الفترة فقط)"}
                      </span>
                      {isBlocked ? (
                        <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                          {isEn ? "Blocked (Commission Incomplete)" : "محظور لنقص العمولة"}
                        </span>
                      ) : mustCountAsSettlement ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                          {isEn ? "Mandatory for Debt/Commission" : "إلزامي عند سداد مديونية أو عمولة"}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 text-[11px] block mt-0.5">
                      {isBlocked
                        ? (isEn
                            ? "Settlement is blocked because commission data is incomplete. Only fees can be collected without counting as settlement."
                            : "التسوية محظورة لأن احتساب العمولة غير مكتمل. يُسمح فقط بتحصيل رسوم الحساب دون احتسابها كتسوية.")
                        : (isEn
                            ? "Any payment of platform debt or commission must count as settlement and resets the 10-day overdue countdown anchor for this period only."
                            : "سداد مديونية جاهز أو عمولة التشغيل يُحتسب تلقائياً كتسوية رسمية ويعيد ضبط مؤقت المطالبة لهذه الفترة المحددة فقط.")}
                    </span>
                  </div>
                </label>
              </div>
            );
          })()}

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Reason / Payment Notes" : "سبب التحصيل / البيان"}
            </label>
            <Input
              type="text"
              placeholder={isEn ? "e.g., Rider weekly cash settlement..." : "مثال: تسوية نقدية أسبوعية من المندوب..."}
              value={reason}
              onChange={(e) => handlePaymentAmountChange("reason", e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmitting ||
                balanceLoading ||
                Boolean(dateValidationError) ||
                (Number(feePayment) || 0) + (Number(debtPayment) || 0) + (Number(commissionPayment) || 0) <= 0 ||
                (Boolean(modalBalance && !modalBalance.commissionComplete) && (
                  (Number(feePayment) || 0) <= 0 ||
                  (Number(debtPayment) || 0) > 0 ||
                  (Number(commissionPayment) || 0) > 0 ||
                  countsAsSettlement
                ))
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting
                ? (isEn ? "Recording..." : "جارٍ التسجيل...")
                : balanceLoading
                ? (isEn ? "Calculating balance..." : "جارٍ استعلام الرصيد...")
                : modalBalance && !modalBalance.commissionComplete
                ? (isEn ? "Collect Fees Only" : "تحصيل الرسوم فقط")
                : (isEn ? "Confirm Collection" : "تأكيد التحصيل")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Paid Modal */}
      <ConfirmPaidModal
        isOpen={Boolean(confirmPaidBalance)}
        onClose={() => setConfirmPaidBalance(null)}
        handover={null}
        balance={confirmPaidBalance}
        locale={locale}
        wasPrecededByCollection={Boolean(lastSettlementId)}
        onSuccess={() => {
          setConfirmPaidBalance(null);
          loadSettlements();
        }}
      />
    </div>
  );
}
