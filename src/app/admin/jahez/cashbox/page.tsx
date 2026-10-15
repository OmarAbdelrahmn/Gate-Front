// src/app/admin/jahez/cashbox/page.tsx
"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
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
} from "@/lib/jahez/api";
import {
  Fund,
  Direction,
  Purpose,
  type FundBalance,
  type Movement,
  type TransferredDebt,
  type Account,
} from "@/lib/jahez/types";
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
} from "lucide-react";

export default function JahezCashboxPage() {
  const { user, can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [activeTab, setActiveTab] = useState<"movements" | "transferredDebts">("movements");

  // Data states
  const [funds, setFunds] = useState<FundBalance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [debts, setDebts] = useState<TransferredDebt[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [fundFilter, setFundFilter] = useState<number | "">("");
  const [directionFilter, setDirectionFilter] = useState<number | "">("");
  const [search, setSearch] = useState("");

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
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadAllData = async (targetPage = page) => {
    setLoading(true);
    try {
      const [fundsRes, movRes, debtsRes, accRes] = await Promise.allSettled([
        getJahezFunds(),
        getJahezMoneyMovements(targetPage, pageSize),
        getJahezTransferredDebts(targetPage, pageSize),
        getJahezAccounts(1, 100),
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
    } catch (err: unknown) {
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
    loadAllData(page);
  }, [page, pageSize]);

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
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      m.id.toLowerCase().includes(q) ||
      m.reference.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q) ||
      m.handoverId.toLowerCase().includes(q)
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
      "المستخدم الفعلي": m.riderProfileId,
      "السبب": m.reason,
    }));
    exportToExcel(data, "حركات_جاهز_المالية");
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
              الأموال وحركات الدفتر المالي
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              أرصدة الجهات الثلاث، سجل الحركات الفعلية، وسداد الالتزامات المرحلة
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

          <Button
            size="sm"
            onClick={openFeeModal}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
          >
            <Coins className="h-4 w-4" />
            قبض رسوم فتح حساب
          </Button>

          <Button variant="secondary" size="sm" onClick={handleExportMovements} className="gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير الحركات
          </Button>
        </div>
      </div>

      {/* Funds Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* الخزنة */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-950 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              الخزنة (Cashbox = 1)
            </span>
            <Badge tone="green">قبض وصرف</Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-gray-500">الرصيد الدفتري</div>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-100 font-mono">
                {cashboxData.balance.toFixed(2)} ر.س
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-500 space-y-0.5">
              <div>المقبوضات: {cashboxData.receipts.toFixed(2)}</div>
              <div>المصروفات: {cashboxData.disbursements.toFixed(2)}</div>
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
            <Badge tone="blue">قبض وقود فقط</Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-gray-500">إجمالي مقبوضات الوقود</div>
              <div className="text-2xl font-black text-blue-800 dark:text-blue-100 font-mono">
                {petroData.receipts.toFixed(2)} ر.س
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-400">
              purpose=Fuel فقط
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
            <Badge tone="gray">صرف تحويلات فقط</Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] text-gray-500">إجمالي التحويلات للمناديب</div>
              <div className="text-2xl font-black text-purple-800 dark:text-purple-100 font-mono">
                {bankData.disbursements.toFixed(2)} ر.س
              </div>
            </div>
            <div className="text-right text-[11px] text-gray-400">
              صرف فقط بمرجع فعلي
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab("movements")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "movements"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
          }`}
        >
          سجل الحركات المالية الموحد ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab("transferredDebts")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "transferredDebts"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
          }`}
        >
          المستحقات والالتزامات المرحلة ({debts.length})
        </button>
      </div>

      {/* Tab 1: Movements Table */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الحركة، المرجع، أو السبب..."
                className="pr-10 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={fundFilter}
                onChange={(e) => setFundFilter(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
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
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="">جميع الاتجاهات</option>
                <option value={Direction.Receipt}>قبض</option>
                <option value={Direction.Disbursement}>صرف</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b bg-gray-50/80 font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="py-3 px-3">رقم الحركة</th>
                    <th className="py-3 px-3">الجهة</th>
                    <th className="py-3 px-3 text-center">الاتجاه</th>
                    <th className="py-3 px-3">الغرض</th>
                    <th className="py-3 px-3 text-center">المبلغ</th>
                    <th className="py-3 px-3">المرجع الفعلي</th>
                    <th className="py-3 px-3">التاريخ والوقت</th>
                    <th className="py-3 px-3">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-500 mb-2" />
                        جارٍ تحميل الحركات المالية...
                      </td>
                    </tr>
                  ) : filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        لا توجد حركات مالية مسجلة بعد
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="py-3 px-3 font-mono font-bold">#{m.id.slice(0, 8)}</td>
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
                        <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400">
                          {m.reference}
                        </td>
                        <td className="py-3 px-3 text-gray-400">
                          {m.occurredAtUtc?.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {m.reason}
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

      {/* Tab 2: Transferred Debts Table */}
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
    </div>
  );
}
