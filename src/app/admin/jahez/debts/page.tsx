// src/app/admin/jahez/debts/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  closeJahezHandover,
  createSettlement,
  generateIdempotencyKey,
  getDebtActionGates,
  getJahezDebts,
  getJahezHandoverBalance,
  getJahezRiderDebtSummary,
  validateThroughDate,
} from "@/lib/jahez/api";
import {
  JahezDebtStatus,
  JahezPaymentStatus,
} from "@/lib/jahez/constants";
import type {
  JahezBalance,
  JahezRiderDebtSummary,
  PaymentRequest,
} from "@/lib/jahez/types";
import { JahezDebtStatusBadge } from "@/components/jahez/JahezDebtStatusBadge";
import { JahezPaymentStatusBadge } from "@/components/jahez/JahezPaymentStatusBadge";
import { JahezFinancialCards } from "@/components/jahez/JahezFinancialCards";
import { JahezRiderDebtSummaryCard } from "@/components/jahez/JahezRiderDebtSummaryCard";
import { ConfirmPaidModal } from "@/components/jahez/dialogs/ConfirmPaidModal";
import { FreezeAccountModal } from "@/components/jahez/dialogs/FreezeAccountModal";
import { JahezRiderCollectionModal } from "@/components/jahez/dialogs/JahezRiderCollectionModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  AlertTriangle,
  CreditCard,
  FileSpreadsheet,
  RefreshCw,
  Search,
  CheckCircle2,
  Scale,
  Lock,
  Eye,
  Coins,
  ChevronLeft,
  ChevronRight,
  Info,
  XCircle,
} from "lucide-react";

export default function JahezDebtsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [balances, setBalances] = useState<JahezBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [riderFilter, setRiderFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modals & Action States
  const [inspectBalance, setInspectBalance] = useState<JahezBalance | null>(null);
  const [confirmPaidBalance, setConfirmPaidBalance] = useState<JahezBalance | null>(null);
  const [freezeBalance, setFreezeBalance] = useState<JahezBalance | null>(null);

  // Quick Settlement Modal State
  const [selectedBalance, setSelectedBalance] = useState<JahezBalance | null>(null);

  // Close Handover State
  const [closeHandoverBalance, setCloseHandoverBalance] = useState<JahezBalance | null>(null);
  const [closeEffectiveAt, setCloseEffectiveAt] = useState(new Date().toISOString().slice(0, 16));
  const [closeReason, setCloseReason] = useState("إنهاء فترة تشغيل الحساب واستلام العهدة");
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  const loadDebts = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await getJahezDebts({
        overdueOnly,
        riderId: riderFilter || undefined,
        page: targetPage,
        pageSize,
      });
      const items = res.items || [];
      setBalances(items);
      setHasNextPage(items.length >= pageSize);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر استعلام المديونيات";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    startTransition(() => {
      loadDebts(1);
    });
  }, [overdueOnly, riderFilter]);

  useEffect(() => {
    startTransition(() => {
      loadDebts(page);
    });
  }, [page]);

  const handleOpenSettlement = (b: JahezBalance) => {
    setSelectedBalance(b);
  };

  const handleCloseHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeHandoverBalance) return;
    setIsSubmittingClose(true);
    try {
      await closeJahezHandover(closeHandoverBalance.handoverId, {
        effectiveAtUtc: new Date(closeEffectiveAt).toISOString(),
        reason: closeReason.trim(),
      });
      setCloseHandoverBalance(null);
      loadDebts(page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إنهاء فترة الاستخدام";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const handleExport = () => {
    exportToExcel({
      filename: `jahez_debts_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: balances,
      columns: [
        {
          header: isEn ? "Driver ID" : "رقم الحساب الخارجي",
          accessor: (b) => b.account?.externalAccountId || b.externalAccountId || "-",
        },
        {
          header: isEn ? "Account Code" : "رمز الحساب",
          accessor: (b) => b.account?.code || "-",
        },
        {
          header: isEn ? "Owner Name" : "صاحب الحساب",
          accessor: (b) =>
            (isEn
              ? b.ownerRiderNameEn || b.ownerRiderNameAr
              : b.ownerRiderNameAr || b.ownerRiderNameEn) || "-",
        },
        {
          header: isEn ? "Actual Rider" : "المندوب الفعلي",
          accessor: (b) =>
            (isEn
              ? b.actualRiderNameEn || b.actualRiderNameAr
              : b.actualRiderNameAr || b.actualRiderNameEn) || "-",
        },
        { header: isEn ? "Fees (SAR)" : "الرسوم", accessor: "fees" },
        { header: isEn ? "Platform Debt (SAR)" : "مديونية جاهز", accessor: "platformDebt" },
        { header: isEn ? "Total Receivable (SAR)" : "إجمالي الذمة", accessor: "totalReceivable" },
        { header: isEn ? "Days Since Settlement" : "الأيام منذ آخر تسوية", accessor: "daysSinceSettlementPayment" },
        { header: isEn ? "Overdue" : "متأخر", accessor: (b) => (b.isOverdue ? "نعم" : "لا") },
      ],
    });
  };

  const filteredBalances = balances.filter((b) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const riderName = (
      isEn
        ? b.actualRiderNameEn || b.actualRiderNameAr || b.ownerRiderNameEn || b.ownerRiderNameAr
        : b.actualRiderNameAr || b.actualRiderNameEn || b.ownerRiderNameAr || b.ownerRiderNameEn
    )?.toLowerCase() || "";
    const accCode = (b.account?.code || "").toLowerCase();
    const extId = (b.account?.externalAccountId || b.externalAccountId || "").toLowerCase();
    return (
      b.handoverId.toLowerCase().includes(term) ||
      b.accountId.toLowerCase().includes(term) ||
      b.riderProfileId.toLowerCase().includes(term) ||
      extId.includes(term) ||
      accCode.includes(term) ||
      riderName.includes(term)
    );
  });

  const totalOverdueCount = balances.filter((b) => b.isOverdue).length;
  const totalReceivableSum = balances.reduce((sum, b) => sum + (b.totalReceivable ?? 0), 0);
  const totalOutstandingSum = balances.reduce(
    (sum, b) =>
      sum +
      (typeof b.outstandingAmount === "number"
        ? b.outstandingAmount
        : Math.max(0, b.fees ?? 0) +
          Math.max(0, b.platformDebt ?? 0) +
          Math.max(0, (b.postedCommission ?? 0) + (b.unpostedCommission ?? 0))),
    0,
  );
  const totalDebtSum = balances.reduce((sum, b) => sum + (b.platformDebt ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Scale className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            {isEn ? "Jahez Rider Debts & 10-Day Overdue Monitor" : "مديونيات ومتأخرات مناديب جاهز"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Track outstanding fees, platform debt, and commissions. Flag accounts exceeding the 10 Riyadh-calendar-days reminder threshold."
              : "متابعة الذمم والرسوم ومديونيات جاهز، ومراقبة حسابات المناديب التي تجاوزت مهلة السداد (10 أيام بتوقيت الرياض)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => loadDebts()}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={balances.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isEn ? "Export" : "تصدير"}
          </Button>
        </div>
      </div>

      {/* Overdue Warning Alert Banner */}
      {totalOverdueCount > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 shadow-sm dark:border-red-900/60 dark:bg-red-950/20 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm text-red-800 dark:text-red-200">
            <span className="font-bold">
              {isEn
                ? `Attention: ${totalOverdueCount} Accounts Overdue (>10 Days without Settlement)`
                : `تنبيه: يوجد ${totalOverdueCount} حسابات متأخرة في السداد (تجاوزت 10 أيام بدون تسوية فعلية)`}
            </span>
            <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
              {isEn
                ? "Automatic hourly worker scans send notifications for these accounts. A positive actual settlement restarts the 10-day reminder timer."
                : "يقوم النظام بإرسال إشعارات دورية للمستخدمين المخولين بهذه الحسابات. تسديد أي دفعة تسوية فعلية يعيد ضبط العداد."}
            </p>
          </div>
          <Button
            variant="danger"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className="text-xs px-3 py-1 h-8"
          >
            {overdueOnly ? (isEn ? "Show All" : "عرض الكل") : (isEn ? "Filter Overdue Only" : "تصفية المتأخرين فقط")}
          </Button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding to collect */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/20">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-600" />
            {isEn ? "Collectible Outstanding (Loaded)" : "المطلوب تحصيله (في هذه الصفحة)"}
          </span>
          <p className="mt-2 text-2xl font-black text-amber-950 dark:text-amber-100 font-mono">
            {totalOutstandingSum.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
          </p>
          <span className="text-[11px] text-amber-700/80 mt-1 block">
            {isEn ? "Sum of positive bucket receivables" : "مجموع الذمم الإيجابية المستحقة للتحصيل"}
          </span>
        </div>

        {/* Signed Net Balance */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-gray-400" />
            {isEn ? "Signed Net Balance (Loaded)" : "صافي رصيد الفترة الشامل"}
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white font-mono">
            {totalReceivableSum.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">
            {isEn ? "Mathematical net across buckets" : "الصافي الحسابي شاملاً الأرصدة الدائنة"}
          </span>
        </div>

        {/* Overdue Accounts */}
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {isEn ? "Overdue Accounts (>10 Days)" : "الحسابات المتأخرة (>10 أيام)"}
          </span>
          <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300 font-mono">
            {totalOverdueCount}
          </p>
          <span className="text-[11px] text-red-500 mt-1 block">
            {isEn ? "Using server isOverdue flag" : "بناءً على حالة الخادم الفعلية"}
          </span>
        </div>

        {/* Commission Readiness */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            {isEn ? "Commission Readiness" : "اكتمال احتساب العمولات"}
          </span>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">
            {balances.filter((b) => b.commissionComplete).length} / {balances.length}
          </p>
          <span className="text-[11px] text-blue-500 mt-1 block">
            {isEn ? "Covered by approved earnings" : "مغطاة بكشوف أرباح معتمدة"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
            />
            <span>{isEn ? "Overdue Accounts Only" : "عرض المتأخرين فقط"}</span>
          </label>
        </div>

        <div className="w-full md:w-64">
          <Input
            type="text"
            placeholder={isEn ? "Filter by Rider ID..." : "تصفية بمعرف المندوب (خادم)..."}
            value={riderFilter}
            onChange={(e) => setRiderFilter(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="flex-1 relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={isEn ? "Filter loaded results (Account, Rider, ID)..." : "تصفية النتائج المعروضة (الحساب، المندوب، الرمز)..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 text-xs"
          />
        </div>
      </div>

      {/* Backend Rider Debt Summary (Unified total liability across periods) */}
      {riderFilter.trim() && (
        <div className="transition-all duration-200">
          <JahezRiderDebtSummaryCard riderId={riderFilter.trim()} locale={locale} />
        </div>
      )}

      {/* Debts Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Account (Driver ID)" : "الحساب (Driver ID)"}</th>
                <th className="px-4 py-3">{isEn ? "Rider Profile" : "المندوب الفعلي"}</th>
                <th className="px-4 py-3">{isEn ? "Lifecycle" : "حالة الفترة"}</th>
                <th className="px-4 py-3">{isEn ? "Payment Status" : "حالة السداد"}</th>
                <th className="px-4 py-3">{isEn ? "Fees" : "رسوم الحساب"}</th>
                <th className="px-4 py-3">{isEn ? "Platform Debt" : "مديونية جاهز"}</th>
                <th className="px-4 py-3">{isEn ? "Commission" : "العمولة"}</th>
                <th className="px-4 py-3">{isEn ? "Outstanding" : "المطلوب تحصيله"}</th>
                <th className="px-4 py-3">{isEn ? "Attributed" : "رصيد الحساب"}</th>
                <th className="px-4 py-3">{isEn ? "Days / Overdue" : "المهلة / التأخير"}</th>
                <th className="px-4 py-3">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-600 mb-2" />
                    {isEn ? "Loading debts..." : "جارٍ تحميل الذمم..."}
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No debts matching criteria" : "لا توجد مديونيات مطابقة للشروط"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBalances.map((b) => {
                  const gates = getDebtActionGates(b, can);
                  const totalComm = (b.postedCommission ?? 0) + (b.unpostedCommission ?? 0);
                  const outstanding = typeof b.outstandingAmount === "number" ? b.outstandingAmount : Math.max(0, b.fees ?? 0) + Math.max(0, b.platformDebt ?? 0) + Math.max(0, totalComm);
                  const accRec = typeof b.accountReceivable === "number" ? b.accountReceivable : (b.debtTransferred ? 0 : b.totalReceivable);

                  return (
                    <tr key={b.handoverId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 dark:text-white block font-mono">
                          {b.account?.externalAccountId || b.externalAccountId
                            ? `[${b.account?.externalAccountId || b.externalAccountId}]`
                            : b.account?.code || "-"}
                        </span>
                        {b.account?.code && b.account.code !== (b.account.externalAccountId || b.externalAccountId) && (
                          <span className="text-xs text-emerald-600 block">
                            {b.account.code}
                          </span>
                        )}
                        {(isEn ? (b.ownerRiderNameEn || b.ownerRiderNameAr) : (b.ownerRiderNameAr || b.ownerRiderNameEn)) && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5" title={isEn ? "Account Owner" : "صاحب الحساب"}>
                            {isEn ? (b.ownerRiderNameEn || b.ownerRiderNameAr) : (b.ownerRiderNameAr || b.ownerRiderNameEn)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {(isEn
                          ? b.actualRiderNameEn || b.actualRiderNameAr
                          : b.actualRiderNameAr || b.actualRiderNameEn) || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <JahezDebtStatusBadge status={b.debtStatus} locale={locale} />
                      </td>

                      <td className="px-4 py-3">
                        <JahezPaymentStatusBadge
                          status={b.paymentStatus}
                          debtStatus={b.debtStatus}
                          debtPaidAtUtc={b.debtPaidAtUtc}
                          locale={locale}
                        />
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        {b.fees > 0 ? `${b.fees.toLocaleString("ar-SA")} ر.س` : "-"}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs">
                        {b.platformDebt < 0 ? (
                          <span className="text-emerald-600" title="رصيد دائن للمندوب">
                            {b.platformDebt.toLocaleString("ar-SA")} ر.س (دائن)
                          </span>
                        ) : b.platformDebt > 0 ? (
                          <span className="text-amber-600 font-bold">
                            {b.platformDebt.toLocaleString("ar-SA")} ر.س
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-purple-600 font-semibold">
                        {totalComm.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                        {!b.commissionComplete && (
                          <span className="text-[10px] text-amber-600 block" title="حساب العمولة غير مكتمل">
                            ⚠️ غير مكتمل
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-bold text-base text-amber-900 dark:text-amber-100 font-mono">
                        {outstanding.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {accRec.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                        {b.debtTransferred && (
                          <span className="text-[10px] text-purple-600 block font-sans">
                            (منقول للمندوب)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {b.isOverdue ? (
                            <Badge tone="red">
                              <AlertTriangle className="h-3 w-3 mr-1 inline" />
                              {isEn ? "Overdue" : "متأخر (>10 أيام)"}
                            </Badge>
                          ) : (
                            <Badge tone="green">
                              {isEn ? "On Schedule" : "ضمن المهلة"}
                            </Badge>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {b.daysSinceSettlementPayment} {isEn ? "days" : "يوم"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            onClick={() => setInspectBalance(b)}
                            className="text-xs py-1 px-2 h-8 text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                            title={isEn ? "Financial Details" : "التفاصيل المالية"}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {gates.collect && (
                            <Button
                              variant="primary"
                              onClick={() => handleOpenSettlement(b)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-2 h-8 flex items-center gap-1 shadow-xs"
                              title={isEn ? "Collect Payment" : "تسجيل تحصيل"}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              {isEn ? "Collect" : "تحصيل"}
                            </Button>
                          )}

                          {gates.confirmPaid && (
                            <Button
                              variant="secondary"
                              onClick={() => setConfirmPaidBalance(b)}
                              className="text-xs py-1 px-2 h-8 text-teal-700 border-teal-200 hover:bg-teal-50 flex items-center gap-1"
                              title={isEn ? "Confirm Paid" : "تأكيد السداد"}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {isEn ? "Confirm" : "تأكيد"}
                            </Button>
                          )}

                          {gates.closeHandover && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setCloseHandoverBalance(b);
                                setCloseEffectiveAt(new Date().toISOString().slice(0, 10));
                                setCloseReason("");
                              }}
                              className="text-xs py-1 px-2 h-8 text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1"
                              title={isEn ? "End Usage Period (Leaves debt on rider)" : "إنهاء فترة الاستخدام (مع بقاء الدين على المندوب)"}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {isEn ? "End Period" : "إنهاء الفترة"}
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850 text-xs">
          <span className="text-gray-500">
            {isEn ? `Page ${page} (Max 50 items/page)` : `الصفحة ${page} (بحد أقصى 50 عنصرًا لكل صفحة)`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-8 text-xs flex items-center gap-1"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              {isEn ? "Previous" : "السابق"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage || loading}
              className="h-8 text-xs flex items-center gap-1"
            >
              {isEn ? "Next" : "التالي"}
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Direct Settlement Collection Modal */}
      {selectedBalance && (
        <JahezRiderCollectionModal
          isOpen={Boolean(selectedBalance)}
          onClose={() => setSelectedBalance(null)}
          initialHandoverId={selectedBalance.handoverId}
          initialRiderId={selectedBalance.riderProfileId}
          onSuccess={() => {
            loadDebts(page);
          }}
        />
      )}

      {/* Financial Details Drawer Modal */}
      <Modal
        isOpen={Boolean(inspectBalance)}
        onClose={() => setInspectBalance(null)}
        title={isEn ? "Period Financial Details" : "تفاصيل الذمة المالية للفترة"}
        maxWidth="max-w-4xl"
      >
        {inspectBalance && (
          <div className="space-y-4">
            <JahezFinancialCards balance={inspectBalance} locale={locale} />
            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
              <Button variant="secondary" onClick={() => setInspectBalance(null)}>
                {isEn ? "Close" : "إغلاق"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Paid Modal */}
      <ConfirmPaidModal
        isOpen={Boolean(confirmPaidBalance)}
        onClose={() => setConfirmPaidBalance(null)}
        handover={null}
        balance={confirmPaidBalance}
        locale={locale}
        wasPrecededByCollection={false}
        onSuccess={() => {
          setConfirmPaidBalance(null);
          loadDebts(page);
        }}
      />

      {/* End Usage Period Modal */}
      <Modal
        isOpen={Boolean(closeHandoverBalance)}
        onClose={() => setCloseHandoverBalance(null)}
        title={isEn ? "End Usage Period (Close Handover)" : "إنهاء فترة الاستخدام (إغلاق الإسناد)"}
      >
        {closeHandoverBalance && (
          <form onSubmit={handleCloseHandoverSubmit} className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-semibold">
                {isEn ? "Notice: Ending usage period leaves existing debt on rider" : "تنبيه: إنهاء فترة الاستخدام يغلق فترة التشغيل مع بقاء الدين بذمة المندوب"}
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                {isEn
                  ? "This closes the active handover period for the open non-frozen account. The account is no longer in use, but outstanding platform debt and fees remain attributed to the rider until settled."
                  : "هذا الإجراء ينهي فترة الاستخدام للحساب المفتوح غير المجمد دون تجميد أو نقل؛ ويبقى الدين مسجلاً بذمة المندوب لحين تحصيله."}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                {isEn ? "Effective End Date" : "تاريخ انتهاء الاستخدام الفعلي"}
              </label>
              <Input
                type="date"
                value={closeEffectiveAt}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCloseEffectiveAt(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                {isEn ? "Reason for Ending Usage" : "سبب إنهاء فترة الاستخدام"}
              </label>
              <Input
                type="text"
                placeholder={isEn ? "e.g. Rider stopped working / handover completed" : "مثال: توقف المندوب عن العمل / انتهاء فترة التسليم"}
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCloseHandoverBalance(null)}
                disabled={isSubmittingClose}
              >
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={isSubmittingClose || !closeReason.trim()}
              >
                {isSubmittingClose
                  ? (isEn ? "Closing..." : "جارٍ الإنهاء...")
                  : (isEn ? "Confirm End Period" : "تأكيد إنهاء الفترة")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
