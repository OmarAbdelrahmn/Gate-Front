// src/app/admin/jahez/cashbox/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  confirmCashboxHandover,
  createCashboxHandover,
  decideCashboxHandover,
  getCashboxBalance,
  getCashboxEntries,
  getCashboxHandovers,
} from "@/lib/jahez/api";
import {
  JahezCashboxHandoffStatus,
  JahezCashboxSection,
  type AccountantConfirmRequest,
  type CashboxCreateRequest,
  type CashboxDecisionRequest,
  type JahezCashboxBalance,
  type JahezCashboxEntry,
  type JahezCashboxHandover,
} from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  BadgeDollarSign,
  CheckCircle,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
  XCircle,
  Clock,
  ArrowRightLeft,
  Banknote,
} from "lucide-react";

export default function JahezCashboxPage() {
  const { user, can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [activeTab, setActiveTab] = useState<"handoffs" | "entries">("handoffs");
  const [balance, setBalance] = useState<JahezCashboxBalance | null>(null);
  const [handovers, setHandovers] = useState<JahezCashboxHandover[]>([]);
  const [entries, setEntries] = useState<JahezCashboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modals state
  // 1. Submit Handoff
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitBusinessDate, setSubmitBusinessDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [submitReason, setSubmitReason] = useState("تصفية");
  const [submitting, setSubmitting] = useState(false);

  // 2. Accountant Confirmation
  const [confirmingHandover, setConfirmingHandover] = useState<JahezCashboxHandover | null>(null);
  const [confirmFeeAmount, setConfirmFeeAmount] = useState<number | "">("");
  const [confirmSettlementAmount, setConfirmSettlementAmount] = useState<number | "">("");
  const [confirmReason, setConfirmReason] = useState("مطابقة وعد واستلام مبالغ الصندوق");
  const [isConfirming, setIsConfirming] = useState(false);

  // 3. Final Decision
  const [decidingHandover, setDecidingHandover] = useState<JahezCashboxHandover | null>(null);
  const [decisionReason, setDecisionReason] = useState("اعتماد تسليم الصندوق وإخلاء العهدة");
  const [isDeciding, setIsDeciding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, handRes, entRes] = await Promise.all([
        getCashboxBalance(),
        getCashboxHandovers({ pageSize: 50 }),
        getCashboxEntries({ pageSize: 50 }),
      ]);
      setBalance(balRes);
      setHandovers(handRes.items || []);
      setEntries(entRes.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تحميل بيانات صندوق النقد";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadData();
    });
  }, []);

  // Submit handoff
  const handleSubmitHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب تسليم الصندوق للمحاسب");
      return;
    }
    setSubmitting(true);
    try {
      const payload: CashboxCreateRequest = {
        businessDate: submitBusinessDate,
        reason: submitReason.trim(),
      };
      await createCashboxHandover(payload);
      setIsSubmitOpen(false);
      setSubmitReason("تصفية");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل بدء تسليم الصندوق";
      toast.error("خطأ", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm handoff
  const handleConfirmHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingHandover) return;
    const fAmt = Number(confirmFeeAmount) || 0;
    const sAmt = Number(confirmSettlementAmount) || 0;

    if (!confirmReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة ملاحظة تأكيد المحاسب");
      return;
    }

    setIsConfirming(true);
    try {
      const payload: AccountantConfirmRequest = {
        feeAmount: fAmt,
        settlementAmount: sAmt,
        reason: confirmReason.trim(),
      };
      await confirmCashboxHandover(confirmingHandover.id, payload);
      setConfirmingHandover(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تأكيد الاستلام";
      toast.error("خطأ", msg);
    } finally {
      setIsConfirming(false);
    }
  };

  // Final Decision (Approve / Reject)
  const handleDecide = async (approve: boolean) => {
    if (!decidingHandover) return;
    if (!decisionReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب الاعتماد أو الرفض");
      return;
    }

    setIsDeciding(true);
    try {
      const payload: CashboxDecisionRequest = {
        approve,
        reason: decisionReason.trim(),
      };
      await decideCashboxHandover(decidingHandover.id, payload);
      setDecidingHandover(null);
      setDecisionReason("");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشلت العملية";
      toast.error("خطأ", msg);
    } finally {
      setIsDeciding(false);
    }
  };

  const statusBadge = (status: JahezCashboxHandoffStatus) => {
    switch (status) {
      case JahezCashboxHandoffStatus.Pending:
        return (
          <Badge tone="orange">
            <Clock className="h-3 w-3 mr-1 inline" />
            {isEn ? "Pending Accountant" : "بانتظار تأكيد المحاسب"}
          </Badge>
        );
      case JahezCashboxHandoffStatus.AccountantConfirmed:
        return (
          <Badge tone="blue">
            <UserCheck className="h-3 w-3 mr-1 inline" />
            {isEn ? "Accountant Confirmed" : "تمت مطابقة المحاسب"}
          </Badge>
        );
      case JahezCashboxHandoffStatus.Approved:
        return (
          <Badge tone="green">
            <CheckCircle className="h-3 w-3 mr-1 inline" />
            {isEn ? "Approved (Custody Cleared)" : "معتمد نهائياً (أُخليت العهدة)"}
          </Badge>
        );
      case JahezCashboxHandoffStatus.Rejected:
        return (
          <Badge tone="red">
            <XCircle className="h-3 w-3 mr-1 inline" />
            {isEn ? "Rejected (Released)" : "مرفوض (أعيد للمتاح)"}
          </Badge>
        );
      default:
        return <Badge tone="gray">{String(status)}</Badge>;
    }
  };

  const handleExportHandovers = () => {
    exportToExcel({
      filename: `jahez_cashbox_handovers_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: handovers,
      columns: [
        { header: isEn ? "Handoff ID" : "معرف التسليم", accessor: "id" },
        { header: isEn ? "Business Date" : "تاريخ التشغيل", accessor: "businessDate" },
        { header: isEn ? "Fees (SAR)" : "رسوم محجوزة (ر.س)", accessor: "feeAmount" },
        { header: isEn ? "Settlements (SAR)" : "تسويات محجوزة (ر.س)", accessor: "settlementAmount" },
        { header: isEn ? "Submitter" : "المستخدم المسلم", accessor: "requestedByUserId" },
        { header: isEn ? "Reason" : "السبب", accessor: "reason" },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <BadgeDollarSign className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {isEn ? "Jahez Two-Section Cashbox & Accountant Handoff" : "صندوق جاهز النقدي وتسليم المحاسب"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Reconcile the two independent cashbox sections: Account Fees vs Settlements, with strict 3-party custody handover."
              : "إدارة صندوق النقد بقسميه المستقلين: رسوم الحساب والتسويات، ودورة تسليم المحاسب ثلاثية الأطراف."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportHandovers}
            disabled={handovers.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isEn ? "Export" : "تصدير"}
          </Button>

          {can("jahez.cashbox.submit") && (
            <Button
              variant="primary"
              onClick={() => {
                setSubmitBusinessDate(new Date().toISOString().split("T")[0]);
                setSubmitReason("تصفية");
                setIsSubmitOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Send className="h-4 w-4" />
              {isEn ? "Deliver to Accountant" : "بدء تسليم الصندوق للمحاسب"}
            </Button>
          )}
        </div>
      </div>

      {/* Two Independently Reconciled Sections Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Account Fees */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-5 shadow-sm dark:border-blue-900/60 dark:from-blue-950/20 dark:to-gray-900">
          <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {isEn ? "Section 1: Account Fees" : "القسم الأول: رسوم الحساب"}
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {isEn ? "Non-custodial account setup fee receipts" : "تحصيلات رسوم فتح وتسليم الحساب (200 ر.س)"}
                </span>
              </div>
            </div>
            <Badge tone="blue">
              {isEn ? "Section 1" : "قسم 1"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="bg-white p-3 rounded-lg border border-blue-100 dark:bg-gray-800 dark:border-blue-900/30">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                {isEn ? "Available in Hand" : "متاح بالعهدة (جاهز)"}
              </span>
              <span className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1 block">
                {(balance?.availableFees ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-gray-400">ر.س</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-amber-100 dark:bg-gray-800 dark:border-amber-900/30">
              <span className="text-xs text-amber-600 dark:text-amber-400 block">
                {isEn ? "Reserved for Handoff" : "محجوز للتسليم"}
              </span>
              <span className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1 block">
                {(balance?.reservedFees ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-gray-400">ر.س</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                {isEn ? "Total Active Custody" : "إجمالي العهدة الحالية"}
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white mt-1 block">
                {(balance?.fees ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-gray-400">ر.س</span>
            </div>
          </div>
        </div>

        {/* Section 2: Settlements */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/20 dark:to-gray-900">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
                <BadgeDollarSign className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {isEn ? "Section 2: Settlements" : "القسم الثاني: التسويات والعمولات"}
                </h3>
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {isEn ? "Platform debt & operational commission collections" : "تحصيلات مديونية منصة جاهز وعمولة التشغيل"}
                </span>
              </div>
            </div>
            <Badge tone="green">
              {isEn ? "Section 2" : "قسم 2"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="bg-white p-3 rounded-lg border border-emerald-100 dark:bg-gray-800 dark:border-emerald-900/30">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                {isEn ? "Available in Hand" : "متاح بالعهدة (جاهز)"}
              </span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">
                {(balance?.availableSettlements ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-gray-400">ر.س</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-amber-100 dark:bg-gray-800 dark:border-amber-900/30">
              <span className="text-xs text-amber-600 dark:text-amber-400 block">
                {isEn ? "Reserved for Handoff" : "محجوز للتسليم"}
              </span>
              <span className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1 block">
                {(balance?.reservedSettlements ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-gray-400">ر.س</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                {isEn ? "Total Active Custody" : "إجمالي العهدة الحالية"}
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white mt-1 block">
                {(balance?.settlements ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-gray-400">ر.س</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 flex gap-4">
        <button
          onClick={() => setActiveTab("handoffs")}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "handoffs"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          {isEn ? "Accountant Handoffs Log" : "سجل تسليمات المحاسب"}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
            {handovers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("entries")}
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "entries"
              ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <Banknote className="h-4 w-4" />
          {isEn ? "Cashbox Receipts Log" : "حركات المقبوضات الفردية"}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
            {entries.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Handovers Table */}
      {activeTab === "handoffs" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3">{isEn ? "Business Date" : "تاريخ التشغيل"}</th>
                  <th className="px-4 py-3">{isEn ? "Status" : "الحالة"}</th>
                  <th className="px-4 py-3">{isEn ? "Section 1: Fees" : "قسم 1: الرسوم"}</th>
                  <th className="px-4 py-3">{isEn ? "Section 2: Settlements" : "قسم 2: التسويات"}</th>
                  <th className="px-4 py-3">{isEn ? "Total Handoff" : "إجمالي التسليم"}</th>
                  <th className="px-4 py-3">{isEn ? "Submitter" : "المسلّم"}</th>
                  <th className="px-4 py-3">{isEn ? "Accountant" : "المحاسب"}</th>
                  <th className="px-4 py-3">{isEn ? "Approver" : "المعتمد"}</th>
                  <th className="px-4 py-3">{isEn ? "Actions" : "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-500">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                      {isEn ? "Loading..." : "جارٍ التحميل..."}
                    </td>
                  </tr>
                ) : handovers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      <BadgeDollarSign className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                      <p className="font-medium text-gray-600 dark:text-gray-300">
                        {isEn ? "No cashbox handoffs found" : "لا توجد عمليات تسليم للمحاسب مسجلة"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  handovers.map((h) => {
                    const totalHandoff = h.feeAmount + h.settlementAmount;
                    const canAccountantConfirm =
                      h.status === JahezCashboxHandoffStatus.Pending &&
                      can("jahez.cashbox.confirm") &&
                      user?.id !== h.requestedByUserId;

                    const canFinalDecide =
                      (h.status === JahezCashboxHandoffStatus.AccountantConfirmed ||
                        h.status === JahezCashboxHandoffStatus.Pending) &&
                      can("jahez.cashbox.approve") &&
                      user?.id !== h.requestedByUserId &&
                      user?.id !== h.accountantUserId;

                    return (
                      <tr key={h.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                          {h.businessDate}
                        </td>
                        <td className="px-4 py-3">{statusBadge(h.status)}</td>
                        <td className="px-4 py-3 text-blue-600 font-semibold">
                          {h.feeAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                          {h.accountantFeeAmount !== null && (
                            <span className="block text-[11px] text-gray-400">
                              (تأكيد: {h.accountantFeeAmount.toLocaleString("ar-SA")} ر.س)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">
                          {h.settlementAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                          {h.accountantSettlementAmount !== null && (
                            <span className="block text-[11px] text-gray-400">
                              (تأكيد: {h.accountantSettlementAmount.toLocaleString("ar-SA")} ر.س)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                          {totalHandoff.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {(isEn
                            ? h.requestedByUserNameEn || h.requestedByUserNameAr
                            : h.requestedByUserNameAr || h.requestedByUserNameEn) || (isEn ? "User" : "المستخدم")}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {h.accountantUserId
                            ? (isEn
                                ? h.accountantUserNameEn || h.accountantUserNameAr
                                : h.accountantUserNameAr || h.accountantUserNameEn) || (isEn ? "Accountant" : "المحاسب")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {h.approvedByUserId
                            ? (isEn
                                ? h.approvedByUserNameEn || h.approvedByUserNameAr
                                : h.approvedByUserNameAr || h.approvedByUserNameEn) || (isEn ? "Approver" : "المعتمد")
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {canAccountantConfirm && (
                              <Button
                                variant="primary"
                                onClick={() => {
                                  setConfirmingHandover(h);
                                  setConfirmFeeAmount(h.feeAmount);
                                  setConfirmSettlementAmount(h.settlementAmount);
                                  setConfirmReason(isEn ? "Reconciled and received cashbox amounts" : "مطابقة وعد واستلام مبالغ الصندوق");
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2.5 h-9"
                              >
                                <UserCheck className="h-3 w-3 mr-1" />
                                {isEn ? "Confirm" : "مطابقة وتأكيد"}
                              </Button>
                            )}

                            {canFinalDecide && (
                              <Button
                                variant="primary"
                                onClick={() => {
                                  setDecidingHandover(h);
                                  setDecisionReason(isEn ? "Approved handoff and custody cleared" : "اعتماد تسليم الصندوق وإخلاء العهدة");
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-2.5 h-9"
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                {isEn ? "Decision" : "اعتماد / رفض"}
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
      )}

      {/* Tab 2: Individual Cashbox Entries */}
      {activeTab === "entries" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3">{isEn ? "Received At" : "وقت الاستلام"}</th>
                  <th className="px-4 py-3">{isEn ? "Cashbox Section" : "قسم الصندوق"}</th>
                  <th className="px-4 py-3">{isEn ? "Amount" : "المبلغ المحصل"}</th>
                  <th className="px-4 py-3">{isEn ? "Account (Driver ID)" : "الحساب (Driver ID)"}</th>
                  <th className="px-4 py-3">{isEn ? "Actual Rider" : "المندوب الفعلي"}</th>
                  <th className="px-4 py-3">{isEn ? "Collector" : "المحصل"}</th>
                  <th className="px-4 py-3">{isEn ? "Handoff Status" : "حالة التسليم للمحاسب"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">
                      {isEn ? "No cashbox entries found" : "لا توجد حركات مقبوضات مسجلة في الصندوق"}
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-300">
                        {new Date(e.receivedAtUtc).toLocaleString("ar-SA")}
                      </td>
                      <td className="px-4 py-3">
                        {e.section === JahezCashboxSection.AccountFees ? (
                          <Badge tone="blue">
                            {isEn ? "1 - Account Fees" : "1 - رسوم الحساب"}
                          </Badge>
                        ) : (
                          <Badge tone="green">
                            {isEn ? "2 - Settlements" : "2 - التسويات"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                        {e.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 dark:text-white block font-mono">
                          {e.account?.externalAccountId || e.externalAccountId
                            ? `[${e.account?.externalAccountId || e.externalAccountId}]`
                            : e.account?.code || "-"}
                        </span>
                        {e.account?.code && e.account.code !== (e.account.externalAccountId || e.externalAccountId) && (
                          <span className="text-xs text-emerald-600 block">
                            {e.account.code}
                          </span>
                        )}
                        {(isEn ? (e.ownerRiderNameEn || e.ownerRiderNameAr) : (e.ownerRiderNameAr || e.ownerRiderNameEn)) && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5" title={isEn ? "Account Owner" : "صاحب الحساب"}>
                            {isEn ? (e.ownerRiderNameEn || e.ownerRiderNameAr) : (e.ownerRiderNameAr || e.ownerRiderNameEn)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-800 dark:text-gray-200 font-medium">
                        {(isEn
                          ? e.actualRiderNameEn || e.actualRiderNameAr
                          : e.actualRiderNameAr || e.actualRiderNameEn) || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
                        {(isEn
                          ? e.collectedByUserNameEn || e.collectedByUserNameAr
                          : e.collectedByUserNameAr || e.collectedByUserNameEn) || (isEn ? "Collector" : "المحصل")}
                      </td>
                      <td className="px-4 py-3">
                        {e.cashboxHandoverId ? (
                          <span className="text-xs text-emerald-600 font-medium">
                            {isEn ? "Reserved in Handoff" : "مشمول بتسليم محاسب"}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">
                            {isEn ? "Available in Custody" : "متاح بالصندوق"}
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
      )}

      {/* Modal 1: Submit Cashbox Handoff */}
      <Modal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        title={isEn ? "Submit Cashbox to Accountant" : "بدء تسليم الصندوق للمحاسب"}
      >
        <form onSubmit={handleSubmitHandoff} className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <Lock className="h-4 w-4" />
              {isEn ? "Reservation Mechanism" : "آلية حجز مبالغ الصندوق"}
            </span>
            <p>
              {isEn
                ? "Submitting will reserve all unreserved entries received through this business date. Available funds will become reserved until the accountant and final approver decide."
                : "سيتم حجز جميع المقبوضات غير المحجوزة حتى نهاية تاريخ اليوم المحدد، وتجميدها من المتاح لحين مطابقة واعتماد المحاسب."}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Business Date (Riyadh UTC+3)" : "تاريخ التشغيل (بتوقيت الرياض)"}
            </label>
            <Input
              type="date"
              value={submitBusinessDate}
              onChange={(e) => setSubmitBusinessDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Reason / Notes" : "سبب التسليم / ملاحظات"}
            </label>
            <Input
              type="text"
              placeholder={isEn ? "e.g., Daily cashbox delivery to accountant..." : "مثال: تسليم صندوق نقد يوم الأربعاء للمحاسب..."}
              value={submitReason}
              onChange={(e) => setSubmitReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSubmitOpen(false)}
              disabled={submitting}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (isEn ? "Submitting..." : "جارٍ التسليم...") : (isEn ? "Confirm & Reserve" : "تأكيد وبدء التسليم")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Accountant Confirmation */}
      <Modal
        isOpen={Boolean(confirmingHandover)}
        onClose={() => setConfirmingHandover(null)}
        title={isEn ? "Accountant Confirmation (Step 2)" : "تأكيد ومطابقة المحاسب (المرحلة 2)"}
      >
        <form onSubmit={handleConfirmHandoff} className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-200">
            <span className="font-semibold block mb-1">
              {isEn ? "Separation of Duties Notice" : "قاعدة فصل الصلاحيات والمطابقة"}
            </span>
            <p>
              {isEn
                ? "The accountant must be a different user from the submitter. Both section figures must match their reserved totals exactly, not merely the combined total."
                : "يجب أن يكون المحاسب مستخدماً مختلفاً عن المسلّم، ويجب أن يطابق كلا القسمين مبالغ الحجز بدقة متناهية."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg dark:bg-gray-800 text-xs">
            <div>
              <span className="text-gray-500 block">{isEn ? "Reserved Fees:" : "الرسوم المحجوزة:"}</span>
              <span className="font-bold text-blue-600 text-sm">
                {confirmingHandover?.feeAmount.toLocaleString("ar-SA")} ر.س
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">{isEn ? "Reserved Settlements:" : "التسويات المحجوزة:"}</span>
              <span className="font-bold text-emerald-600 text-sm">
                {confirmingHandover?.settlementAmount.toLocaleString("ar-SA")} ر.س
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Accountant Fee Amount (SAR)" : "مبلغ رسوم الحساب المستلمة فعلياً (ر.س)"}
            </label>
            <Input
              type="number"
              step="0.01"
              value={confirmFeeAmount}
              onChange={(e) => setConfirmFeeAmount(e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Accountant Settlement Amount (SAR)" : "مبلغ التسويات المستلمة فعلياً (ر.س)"}
            </label>
            <Input
              type="number"
              step="0.01"
              value={confirmSettlementAmount}
              onChange={(e) => setConfirmSettlementAmount(e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Confirmation Reason / Notes" : "سبب وملاحظة تأكيد الاستلام"}
            </label>
            <Input
              type="text"
              placeholder={isEn ? "e.g., Received and reconciled both sections..." : "مثال: تم عد واستلام ومطابقة كلا القسمين..."}
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmingHandover(null)}
              disabled={isConfirming}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isConfirming}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConfirming ? (isEn ? "Confirming..." : "جارٍ التأكيد...") : (isEn ? "Confirm Receipt" : "تأكيد ومطابقة الاستلام")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Final Decision (Approve / Reject) */}
      <Modal
        isOpen={Boolean(decidingHandover)}
        onClose={() => setDecidingHandover(null)}
        title={isEn ? "Final Decision on Cashbox Handoff (Step 3)" : "الاعتماد النهائي لتسليم الصندوق (المرحلة 3)"}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-900/40 dark:bg-purple-950/20 text-xs text-purple-800 dark:text-purple-200">
            <span className="font-semibold block mb-1">
              {isEn ? "3rd Distinct User Rule" : "شرط المستخدم الثالث المستقل"}
            </span>
            <p>
              {isEn
                ? "Approval requires a third user distinct from both the submitter and accountant. Approval removes reserved amounts from custody. Rejection releases reservation back to available."
                : "الاعتماد النهائي يتطلب مستخدماً ثالثاً غير المسلّم والمحاسب. الاعتماد يُخلي العهدة ويُسقط المبالغ، والرفض يُعيد المبالغ المحجوزة للصندوق كمتاحة."}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Decision Reason (Required)" : "سبب قرار الاعتماد أو الرفض (إلزامي)"}
            </label>
            <Input
              type="text"
              placeholder={isEn ? "e.g., Approved after accountant physical audit..." : "مثال: تم الاعتماد بعد التدقيق الفعلي للمحاسب..."}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDecidingHandover(null)}
              disabled={isDeciding}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={() => handleDecide(false)}
              disabled={isDeciding}
              className="flex items-center gap-1"
            >
              <XCircle className="h-4 w-4" />
              {isDeciding ? (isEn ? "Rejecting..." : "جارٍ الرفض...") : (isEn ? "Reject Handoff" : "رفض التسليم وإعادة المتاح")}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => handleDecide(true)}
              disabled={isDeciding}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
            >
              <CheckCircle className="h-4 w-4" />
              {isDeciding ? (isEn ? "Approving..." : "جارٍ الاعتماد...") : (isEn ? "Approve (Clear Custody)" : "الاعتماد النهائي وإخلاء العهدة")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
