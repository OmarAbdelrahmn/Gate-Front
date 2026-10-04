// src/app/admin/jahez/debts/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { createSettlement, getJahezDebts } from "@/lib/jahez/api";
import type { JahezBalance, PaymentRequest } from "@/lib/jahez/types";
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
  const [isPending, startTransition] = useTransition();

  // Quick Settlement Modal State
  const [selectedBalance, setSelectedBalance] = useState<JahezBalance | null>(null);
  const [throughDate, setThroughDate] = useState(new Date().toISOString().split("T")[0]);
  const [feePayment, setFeePayment] = useState<number | "">("");
  const [debtPayment, setDebtPayment] = useState<number | "">("");
  const [commissionPayment, setCommissionPayment] = useState<number | "">("");
  const [countsAsSettlement, setCountsAsSettlement] = useState(true);
  const [paymentReason, setPaymentReason] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const res = await getJahezDebts({
        overdueOnly,
        riderId: riderFilter || undefined,
        pageSize: 100,
      });
      setBalances(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر استعلام المديونيات";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadDebts();
    });
  }, [overdueOnly, riderFilter]);

  const handleOpenSettlement = (b: JahezBalance) => {
    setSelectedBalance(b);
    setThroughDate(new Date().toISOString().split("T")[0]);
    setFeePayment(b.fees > 0 ? b.fees : "");
    setDebtPayment(b.platformDebt > 0 ? b.platformDebt : "");
    const unposted = b.postedCommission + b.unpostedCommission;
    setCommissionPayment(unposted > 0 ? unposted : "");
    setCountsAsSettlement(true);
    setPaymentReason("سداد مديونية مستحقة لمندوب جاهز");
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBalance) return;
    const fPay = Number(feePayment) || 0;
    const dPay = Number(debtPayment) || 0;
    const cPay = Number(commissionPayment) || 0;

    if (fPay + dPay + cPay <= 0) {
      toast.error("خطأ", "يجب أن يكون إجمالي المبلغ المسدد أكبر من صفر");
      return;
    }

    setIsPaying(true);
    try {
      const payload: PaymentRequest = {
        handoverId: selectedBalance.handoverId,
        throughDate,
        feePayment: fPay,
        debtPayment: dPay,
        commissionPayment: cPay,
        countsAsSettlement,
        reason: paymentReason.trim(),
      };
      await createSettlement(payload);
      setSelectedBalance(null);
      loadDebts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشلت عملية السداد";
      toast.error("خطأ", msg);
    } finally {
      setIsPaying(false);
    }
  };

  const handleExport = () => {
    exportToExcel({
      filename: `jahez_debts_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: balances,
      columns: [
        { header: isEn ? "Handover ID" : "معرف التسليم", accessor: "handoverId" },
        { header: isEn ? "External ID" : "رقم الحساب الخارجي", accessor: (b) => b.externalAccountId ?? "-" },
        { header: isEn ? "Rider ID" : "معرف المندوب", accessor: "riderProfileId" },
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
    return (
      b.handoverId.toLowerCase().includes(term) ||
      (b.externalAccountId && b.externalAccountId.toLowerCase().includes(term)) ||
      b.riderProfileId.toLowerCase().includes(term)
    );
  });

  const totalOverdueCount = balances.filter((b) => b.isOverdue).length;
  const totalReceivableSum = balances.reduce((sum, b) => sum + b.totalReceivable, 0);
  const totalDebtSum = balances.reduce((sum, b) => sum + b.platformDebt, 0);

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
            onClick={loadDebts}
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
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isEn ? "Total Outstanding Receivables" : "إجمالي الذمم المستحقة"}
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {totalReceivableSum.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
          </p>
          <span className="text-xs text-gray-400 mt-1 block">
            {balances.length} {isEn ? "tracked handovers" : "حساب تسليم"}
          </span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {isEn ? "Platform Debt Portion" : "مديونية جاهز من العمليات"}
          </span>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {totalDebtSum.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
          </p>
          <span className="text-xs text-amber-500 mt-1 block">
            {isEn ? "Source Net Amount debt" : "مستورد من ملفات العمليات"}
          </span>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            {isEn ? "Overdue Accounts (>10 Days)" : "الحسابات المتأخرة (>10 أيام)"}
          </span>
          <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300">
            {totalOverdueCount}
          </p>
          <span className="text-xs text-red-500 mt-1 block">
            {isEn ? "Require immediate collection" : "تتطلب تحصيل عاجل"}
          </span>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {isEn ? "Commission Readiness" : "اكتمال احتساب العمولات"}
          </span>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {balances.filter((b) => b.commissionComplete).length} / {balances.length}
          </p>
          <span className="text-xs text-blue-500 mt-1 block">
            {isEn ? "Covered by daily/percentage policy" : "مغطاة بالسياسات اليومية/النسبة"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
            />
            <span>{isEn ? "Overdue Accounts Only" : "عرض الحسابات المتأخرة فقط"}</span>
          </label>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={isEn ? "Search by Account, Rider, or Handover ID..." : "ابحث برقم الحساب الخارجي، المندوب، أو معرف التسليم..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      {/* Debts Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Account (Driver ID)" : "الحساب (Driver ID)"}</th>
                <th className="px-4 py-3">{isEn ? "Rider Profile" : "المندوب الفعلي"}</th>
                <th className="px-4 py-3">{isEn ? "Account Fees" : "رسوم الحساب"}</th>
                <th className="px-4 py-3">{isEn ? "Platform Debt" : "مديونية جاهز"}</th>
                <th className="px-4 py-3">{isEn ? "Commission" : "العمولة"}</th>
                <th className="px-4 py-3">{isEn ? "Total Receivable" : "إجمالي الذمة"}</th>
                <th className="px-4 py-3">{isEn ? "Days Since Settlement" : "الأيام منذ آخر تسوية"}</th>
                <th className="px-4 py-3">{isEn ? "Overdue State" : "حالة التأخير"}</th>
                <th className="px-4 py-3">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-600 mb-2" />
                    {isEn ? "Loading debts..." : "جارٍ تحميل الذمم..."}
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No debts matching criteria" : "لا توجد مديونيات مطابقة للشروط"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBalances.map((b) => {
                  return (
                    <tr key={b.handoverId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 dark:text-white block">
                          {b.externalAccountId ? `[${b.externalAccountId}]` : b.accountId.slice(0, 8)}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          تسليم: {b.handoverId.slice(0, 8)}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {b.riderProfileId.slice(0, 8)}...
                      </td>

                      <td className="px-4 py-3 font-semibold text-blue-600">
                        {b.fees > 0 ? `${b.fees.toLocaleString("ar-SA")} ر.س` : "-"}
                      </td>

                      <td className="px-4 py-3 font-semibold">
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

                      <td className="px-4 py-3 text-purple-600 font-semibold">
                        {(b.postedCommission + b.unpostedCommission).toLocaleString("ar-SA")} ر.س
                        {b.unpostedCommission > 0 && (
                          <span className="text-[10px] text-gray-400 block">
                            (غير مرحل: {b.unpostedCommission} ر.س)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-bold text-base text-gray-900 dark:text-white">
                        {b.totalReceivable.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {b.daysSinceSettlementPayment} {isEn ? "days" : "يوم"}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          {b.reminderAnchorAtUtc
                            ? new Date(b.reminderAnchorAtUtc).toLocaleDateString("ar-SA")
                            : "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {b.isOverdue ? (
                          <Badge tone="red">
                            <AlertTriangle className="h-3 w-3 mr-1 inline" />
                            {isEn ? "Overdue (>10 d)" : "متأخر (>10 أيام)"}
                          </Badge>
                        ) : (
                          <Badge tone="green">
                            {isEn ? "On Schedule" : "ضمن المهلة"}
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {can("jahez.collections.manage") && (
                          <Button
                            variant="primary"
                            onClick={() => handleOpenSettlement(b)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-2.5 h-8 flex items-center gap-1 shadow-xs"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            {isEn ? "Collect" : "تحصيل"}
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

      {/* Quick Settlement Modal */}
      <Modal
        isOpen={Boolean(selectedBalance)}
        onClose={() => setSelectedBalance(null)}
        title={isEn ? "Direct Settlement Collection" : "سداد وتحصيل مباشر للمندوب"}
      >
        {selectedBalance && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-xs">
              <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                حساب: [{selectedBalance.externalAccountId || selectedBalance.accountId.slice(0, 8)}]
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded border dark:bg-gray-900">
                  <span className="text-gray-400 block">رسوم الحساب</span>
                  <span className="font-bold text-blue-600">{selectedBalance.fees} ر.س</span>
                </div>
                <div className="bg-white p-2 rounded border dark:bg-gray-900">
                  <span className="text-gray-400 block">مديونية جاهز</span>
                  <span className="font-bold text-amber-600">{selectedBalance.platformDebt} ر.س</span>
                </div>
                <div className="bg-white p-2 rounded border dark:bg-gray-900">
                  <span className="text-gray-400 block">العمولة</span>
                  <span className="font-bold text-purple-600">
                    {selectedBalance.postedCommission + selectedBalance.unpostedCommission} ر.س
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                {isEn ? "Cutoff Date (throughDate)" : "تاريخ الاستحقاق (حتى تاريخ)"}
              </label>
              <Input
                type="date"
                value={throughDate}
                onChange={(e) => setThroughDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  {isEn ? "Fee Payment" : "رسوم الحساب (ر.س)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={feePayment}
                  onChange={(e) => setFeePayment(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  {isEn ? "Debt Payment" : "مديونية جاهز (ر.س)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={debtPayment}
                  onChange={(e) => setDebtPayment(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  {isEn ? "Commission Payment" : "العمولة (ر.س)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={commissionPayment}
                  onChange={(e) => setCommissionPayment(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={countsAsSettlement}
                  onChange={(e) => setCountsAsSettlement(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>{isEn ? "Counts as Settlement (Resets 10-day overdue timer)" : "تحتسب كتسوية رسمية (تجدد عداد الـ 10 أيام)"}</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                {isEn ? "Reason / Notes" : "سبب وملاحظة التحصيل"}
              </label>
              <Input
                type="text"
                value={paymentReason}
                onChange={(e) => setPaymentReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedBalance(null)}
                disabled={isPaying}
              >
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isPaying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPaying ? (isEn ? "Saving..." : "جارٍ الحفظ...") : (isEn ? "Confirm Collection" : "تأكيد التحصيل")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
