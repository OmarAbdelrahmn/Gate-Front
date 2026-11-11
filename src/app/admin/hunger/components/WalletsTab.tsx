// src/app/admin/hunger/components/WalletsTab.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { AccountsFilterPanel } from "./AccountsFilterPanel";
import {
  getHungerWallets,
  exportHungerWallets,
  getHungerAccountWalletHistory,
  getApprovalStatusMeta,
  getFinancialEventKindMeta,
  getRemittanceStatusMeta,
  getWalletAlertMeta,
  HUNGER_WALLET_RECEIPT_STATES,
  getHungerErrorMessage,
  resolveHungerEvidenceUrl,
  type HungerAccountsFilterParams,
  type HungerWalletHistoryEventItem,
  type HungerWalletListItem,
  type HungerWalletObservationItem,
} from "@/lib/hunger/api";
import { toast } from "@/components/ui/Toast";
import {
  Download,
  History,
  Info,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface WalletsTabProps {
  canReadFinance: boolean;
  employeeOptions: SelectOption[];
  riderOptions: SelectOption[];
  cityOptions: SelectOption[];
  sponsorOptions?: SelectOption[];
}

function formatWalletMoneyOrUnknown(
  val: number | null | undefined,
): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return "غير معروف";
  }
  return `${Number(val).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

export function WalletsTab({
  canReadFinance,
  employeeOptions,
  riderOptions,
  cityOptions,
  sponsorOptions = [],
}: WalletsTabProps) {
  const [balanceFrom, setBalanceFrom] = useState("");
  const [balanceThrough, setBalanceThrough] = useState("");
  const [balanceEqual, setBalanceEqual] = useState("");
  const [receiptState, setReceiptState] = useState("all");
  const [alertOnly, setAlertOnly] = useState(false);
  const [accountFilters, setAccountFilters] =
    useState<HungerAccountsFilterParams>({});

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [items, setItems] = useState<HungerWalletListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<
    "xlsx" | "csv" | null
  >(null);

  // Wallet History Modal State
  const [historyTarget, setHistoryTarget] =
    useState<HungerWalletListItem | null>(null);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageSize, setEventsPageSize] = useState(25);
  const [historyEvents, setHistoryEvents] = useState<
    HungerWalletHistoryEventItem[]
  >([]);
  const [historyEventsTotal, setHistoryEventsTotal] = useState(0);

  const [obsPage, setObsPage] = useState(1);
  const [obsPageSize, setObsPageSize] = useState(25);
  const [historyObservations, setHistoryObservations] = useState<
    HungerWalletObservationItem[]
  >([]);
  const [historyObservationsTotal, setHistoryObservationsTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const currentQuery = useMemo(
    () => ({
      page,
      pageSize,
      balanceFrom: balanceFrom.trim() || undefined,
      balanceThrough: balanceThrough.trim() || undefined,
      balanceEqual: balanceEqual.trim() || undefined,
      receiptState: receiptState !== "all" ? receiptState : undefined,
      alertOnly: alertOnly || undefined,
      accountFilters,
    }),
    [
      page,
      pageSize,
      balanceFrom,
      balanceThrough,
      balanceEqual,
      receiptState,
      alertOnly,
      accountFilters,
    ],
  );

  const loadWallets = useCallback(async () => {
    if (!canReadFinance) return;
    setLoading(true);
    try {
      const res = await getHungerWallets(currentQuery);
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر جلب أرصدة المحافظ"));
    } finally {
      setLoading(false);
    }
  }, [canReadFinance, currentQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadWallets();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadWallets]);

  const handleExport = async (format: "xlsx" | "csv") => {
    if (!canReadFinance) return;
    setExportingFormat(format);
    try {
      await exportHungerWallets({
        ...currentQuery,
        format,
      });
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تصدير أرصدة المحافظ"));
    } finally {
      setExportingFormat(null);
    }
  };

  const loadAccountHistory = useCallback(
    async (
      accountId: string,
      evPage: number,
      evPageSize: number,
      obPage: number,
      obPageSize: number,
    ) => {
      setLoadingHistory(true);
      try {
        const res = await getHungerAccountWalletHistory(accountId, {
          page: evPage,
          pageSize: evPageSize,
          eventsPage: evPage,
          eventsPageSize: evPageSize,
          observationsPage: obPage,
          observationsPageSize: obPageSize,
        });
        setHistoryEvents(res.events);
        setHistoryEventsTotal(res.totalEvents);
        setHistoryObservations(res.observations);
        setHistoryObservationsTotal(res.totalObservations);
      } catch (err) {
        toast.error(
          getHungerErrorMessage(err, "تعذر جلب سجل المحفظة للحساب"),
        );
      } finally {
        setLoadingHistory(false);
      }
    },
    [],
  );

  const openHistoryModal = (walletRow: HungerWalletListItem) => {
    setHistoryTarget(walletRow);
    setEventsPage(1);
    setObsPage(1);
    setHistoryEvents([]);
    setHistoryObservations([]);
    void loadAccountHistory(
      walletRow.accountId,
      1,
      eventsPageSize,
      1,
      obsPageSize,
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const eventsTotalPages = Math.max(
    1,
    Math.ceil(historyEventsTotal / eventsPageSize),
  );
  const obsTotalPages = Math.max(
    1,
    Math.ceil(historyObservationsTotal / obsPageSize),
  );

  if (!canReadFinance) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        ليس لديك صلاحية عرض المحافظ المالية (hunger.finance.read).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Prominent Mobile Balance Note */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-sky-300 bg-sky-50 p-4 text-xs font-bold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <div>
          تنبيه مهم: رصيد التطبيق (mobileBalance) المعروض هو{" "}
          <u>آخر رصيد مُلاحظ — ليس رصيدًا حيًا من المنصة</u>، ويعتمد على آخر
          مراجعة محفظة موثقة مع تاريخ الملاحظة (observedOn) والدليل المرفق.
          القيم الفارغة (null) تُعرض دائمًا &quot;غير معروف&quot; وليس صفرًا.
        </div>
      </div>

      {/* Wallet Balance & Receipt State Filters */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="الرصيد من (balanceFrom)"
              type="number"
              step="0.01"
              value={balanceFrom}
              onChange={(e) => {
                setBalanceFrom(e.target.value);
                setPage(1);
              }}
              placeholder="من مبلغ..."
            />
            <Input
              label="الرصيد إلى (balanceThrough)"
              type="number"
              step="0.01"
              value={balanceThrough}
              onChange={(e) => {
                setBalanceThrough(e.target.value);
                setPage(1);
              }}
              placeholder="إلى مبلغ..."
            />
            <Input
              label="الرصيد يساوي (balanceEqual)"
              type="number"
              step="0.01"
              value={balanceEqual}
              onChange={(e) => {
                setBalanceEqual(e.target.value);
                setPage(1);
              }}
              placeholder="يساوي..."
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                حالة إيصالات التوريد (receiptState)
              </label>
              <select
                value={receiptState}
                onChange={(e) => {
                  setReceiptState(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
              >
                <option value="all">الكل</option>
                {HUNGER_WALLET_RECEIPT_STATES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.labelAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/70 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <input
                type="checkbox"
                checked={alertOnly}
                onChange={(e) => {
                  setAlertOnly(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-amber-400 text-amber-600"
              />
              <span>المحافظ ذات التنبيهات فقط (alertOnly)</span>
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadWallets()}
              loading={loading}
            >
              <RefreshCw className="ml-1.5 h-3.5 w-3.5" />
              تحديث
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleExport("csv")}
              loading={exportingFormat === "csv"}
            >
              <Download className="ml-1.5 h-3.5 w-3.5" />
              تصدير CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleExport("xlsx")}
              loading={exportingFormat === "xlsx"}
            >
              <Download className="ml-1.5 h-3.5 w-3.5" />
              تصدير Excel (.xlsx)
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsible Accounts.* Filter Panel */}
      <AccountsFilterPanel
        filters={accountFilters}
        onChange={(next) => {
          setAccountFilters(next);
          setPage(1);
        }}
        onReset={() => {
          setAccountFilters({});
          setPage(1);
        }}
        employeeOptions={employeeOptions}
        riderOptions={riderOptions}
        cityOptions={cityOptions}
        sponsorOptions={sponsorOptions}
        hideDateRange
        labelPrefix="فلاتر الحسابات للمحافظ (accounts.*)"
      />

      {/* Wallets Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              ملخص محافظ الحسابات والأرصدة الملاحظة
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              إجمالي الحسابات: {totalCount} حساب
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b-2 border-slate-200 bg-slate-100/95 text-[11px] font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  الحساب والمندوب
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  آخر رصيد مُلاحظ (ليس رصيدًا حيًا من المنصة)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  رصيد الفترة (periodBalance)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  الرصيد المنسوب (attributedBalance)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  الحقوق المقيدة (restrictedRights)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  سحب بانتظار الوصول (pendingArrival)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  إيصالات معلقة (pendingReceipts)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  إيصالات مؤكدة (confirmedReceipts)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">السجل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-[var(--muted-foreground)]"
                  >
                    جاري تحميل المحافظ...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-[var(--muted-foreground)]"
                  >
                    لا توجد محافظ مطابقة للفلاتر المحددة
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const observed = row.observedOn || row.observedAtUtc;
                  const ev = row.evidence || row.walletEvidence;
                  const alertMeta = getWalletAlertMeta(row.alert);
                  return (
                    <tr
                      key={row.accountId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-bold text-[var(--foreground)]">
                            {row.externalAccountId ||
                              row.accountCode ||
                              row.accountId}
                          </span>
                          {alertMeta && (
                            <Badge tone={alertMeta.badgeTone}>
                              {alertMeta.labelAr}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">
                          المندوب: {row.assignedRiderNameAr || "غير معروف"} |
                          المالك: {row.ownerNameAr || "غير معروف"}
                        </div>
                        {row.alert === "CustodyProposalOpen" && (
                          <div className="mt-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            الحساب بوضعية WalletPending — يُعاد فتحه لـ Normal فقط عند تأكيد تسليم (Deliver) برصيد محفظة يساوي 0
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-sky-700 dark:text-sky-300">
                            {formatWalletMoneyOrUnknown(row.mobileBalance)}
                          </div>
                          <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            آخر رصيد مُلاحظ — ليس رصيدًا حيًا من المنصة
                          </div>
                          <div className="text-[10px] text-[var(--muted-foreground)]">
                            تاريخ الملاحظة: {observed || "غير معروف"} | الدليل:{" "}
                            {ev || "غير معروف"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        {formatWalletMoneyOrUnknown(
                          row.periodBalance ?? row.currentPeriodBalance,
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        {formatWalletMoneyOrUnknown(row.attributedBalance)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {formatWalletMoneyOrUnknown(
                          row.restrictedRights ?? row.reservedRights,
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-purple-600 dark:text-purple-400">
                        {formatWalletMoneyOrUnknown(row.pendingArrival)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-orange-600 dark:text-orange-400">
                        {formatWalletMoneyOrUnknown(row.pendingReceipts)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatWalletMoneyOrUnknown(row.confirmedReceipts)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openHistoryModal(row)}
                        >
                          <History className="ml-1 h-3.5 w-3.5" />
                          السجل
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted-foreground)]">
              إجمالي الحسابات: <strong>{totalCount}</strong>
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(
                  Math.min(Math.max(Number(e.target.value) || 50, 1), 100),
                );
                setPage(1);
              }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            >
              {[10, 25, 50, 100].map((sz) => (
                <option key={sz} value={sz}>
                  {sz} / صفحة
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              السابق
            </Button>
            <span>
              صفحة {page} من {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              التالي
            </Button>
          </div>
        </div>
      </div>

      {/* Wallet History Modal (Events + Observations) */}
      <Modal
        isOpen={Boolean(historyTarget)}
        onClose={() => !loadingHistory && setHistoryTarget(null)}
        title={`سجل محفظة الحساب: ${
          historyTarget?.externalAccountId ||
          historyTarget?.accountCode ||
          historyTarget?.accountId ||
          ""
        }`}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-5">
          <p className="text-xs text-[var(--muted-foreground)]">
            عرض الحركات المالية ومراجعات المحفظة الملاحظة لهذا الحساب
          </p>
          {/* Batch Remittance Note */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              ملاحظة: قد تشترك عدة حسابات في دفعة توريد واحدة (Remittance Batch)؛
              لذلك فإن إجمالي مبلغ دفعة التوريد قد يغطي عدة حسابات معًا.
            </span>
          </div>

          {/* 1. Financial Events Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[var(--foreground)]">
              1. الحركات المالية المرتبطة بالحساب ({historyEventsTotal})
            </h4>
            <div className="max-h-64 overflow-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-right text-xs">
                <thead className="sticky top-0 bg-[var(--subtle-bg)] font-bold text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2">التاريخ</th>
                    <th className="px-3 py-2">نوع الحركة</th>
                    <th className="px-3 py-2">المبلغ</th>
                    <th className="px-3 py-2">التوريد / التأكيد / العكس</th>
                    <th className="px-3 py-2">الدليل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {historyEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 text-center text-[var(--muted-foreground)]"
                      >
                        {loadingHistory
                          ? "جاري تحميل الحركات المالية..."
                          : "لا توجد حركات مالية مسجلة لهذا الحساب"}
                      </td>
                    </tr>
                  ) : (
                    historyEvents.map((ev) => {
                      const kindMeta = getFinancialEventKindMeta(ev.kind);
                      const remMeta = ev.remittanceStatus
                        ? getRemittanceStatusMeta(ev.remittanceStatus)
                        : null;
                      return (
                        <tr
                          key={ev.id || ev.eventId}
                          className="hover:bg-[var(--subtle-bg)]/50"
                        >
                          <td className="px-3 py-2 font-mono">
                            {ev.businessDate || "غير معروف"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={kindMeta.badgeTone}>
                              {kindMeta.labelAr}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 font-mono font-bold">
                            {formatWalletMoneyOrUnknown(ev.amount)}
                          </td>
                          <td className="px-3 py-2 text-[11px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {ev.approvalStatus &&
                                ev.approvalStatus !== "NotRequired" && (
                                  <Badge
                                    tone={
                                      getApprovalStatusMeta(ev.approvalStatus)
                                        .badgeTone
                                    }
                                  >
                                    {
                                      getApprovalStatusMeta(ev.approvalStatus)
                                        .labelAr
                                    }
                                  </Badge>
                                )}
                              {remMeta && (
                                <Badge tone={remMeta.badgeTone}>
                                  {remMeta.labelAr}
                                </Badge>
                              )}
                              {ev.isReversed && (
                                <Badge tone="red">تم عكس التأكيد</Badge>
                              )}
                              {ev.confirmedAmount !== null &&
                                ev.confirmedAmount !== undefined && (
                                  <span>
                                    مؤكد:{" "}
                                    {formatWalletMoneyOrUnknown(
                                      ev.confirmedAmount,
                                    )}
                                  </span>
                                )}
                              {(ev.remittanceBatchAmount !== null &&
                                ev.remittanceBatchAmount !== undefined) ||
                              (ev.remittanceTotalAmount !== null &&
                                ev.remittanceTotalAmount !== undefined) ? (
                                <span className="text-[var(--muted-foreground)]">
                                  (إجمالي الدفعة:{" "}
                                  {formatWalletMoneyOrUnknown(
                                    ev.remittanceBatchAmount ??
                                      ev.remittanceTotalAmount,
                                  )}
                                  )
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px]">
                            {(() => {
                              const imgUrl = resolveHungerEvidenceUrl(
                                ev.evidenceReference,
                              );
                              if (imgUrl) {
                                return (
                                  <a
                                    href={imgUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-sans font-bold text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    <span>صورة الإثبات</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                );
                              }
                              return ev.evidenceReference || "غير معروف";
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 1. Events Pager */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--subtle-bg)]/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted-foreground)]">
                  إجمالي الحركات: <strong>{historyEventsTotal}</strong>
                </span>
                <select
                  value={eventsPageSize}
                  onChange={(e) => {
                    const clamped = Math.min(
                      Math.max(Number(e.target.value) || 25, 1),
                      100,
                    );
                    setEventsPageSize(clamped);
                    setEventsPage(1);
                    if (historyTarget) {
                      void loadAccountHistory(
                        historyTarget.accountId,
                        1,
                        clamped,
                        obsPage,
                        obsPageSize,
                      );
                    }
                  }}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs"
                >
                  {[10, 25, 50, 100].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz} / صفحة
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={eventsPage <= 1}
                  onClick={() => {
                    const nextPage = Math.max(1, eventsPage - 1);
                    setEventsPage(nextPage);
                    if (historyTarget) {
                      void loadAccountHistory(
                        historyTarget.accountId,
                        nextPage,
                        eventsPageSize,
                        obsPage,
                        obsPageSize,
                      );
                    }
                  }}
                >
                  السابق
                </Button>
                <span>
                  صفحة {eventsPage} من {eventsTotalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={eventsPage >= eventsTotalPages}
                  onClick={() => {
                    const nextPage = Math.min(eventsTotalPages, eventsPage + 1);
                    setEventsPage(nextPage);
                    if (historyTarget) {
                      void loadAccountHistory(
                        historyTarget.accountId,
                        nextPage,
                        eventsPageSize,
                        obsPage,
                        obsPageSize,
                      );
                    }
                  }}
                >
                  التالي
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Wallet Observations Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[var(--foreground)]">
              2. سجل الملاحظات ومراجعات المحفظة ({historyObservationsTotal})
            </h4>
            <div className="max-h-64 overflow-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-right text-xs">
                <thead className="sticky top-0 bg-[var(--subtle-bg)] font-bold text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2">تاريخ الملاحظة</th>
                    <th className="px-3 py-2">الإجراء</th>
                    <th className="px-3 py-2">الرصيد الملاحظ (mobileBalance)</th>
                    <th className="px-3 py-2">رصيد الإقفال / التسويات</th>
                    <th className="px-3 py-2">رصيد الفترة / المنسوب</th>
                    <th className="px-3 py-2">المندوب / الدليل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {historyObservations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-4 text-center text-[var(--muted-foreground)]"
                      >
                        {loadingHistory
                          ? "جاري تحميل الملاحظات..."
                          : "لا توجد ملاحظات محفظة مسجلة لهذا الحساب"}
                      </td>
                    </tr>
                  ) : (
                    historyObservations.map((obs, idx) => (
                      <tr
                        key={obs.id || obs.reviewId || idx}
                        className="hover:bg-[var(--subtle-bg)]/50"
                      >
                        <td className="px-3 py-2 font-mono">
                          {obs.observedOn || obs.observedAtUtc || "غير معروف"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            tone={obs.action === "Deliver" ? "green" : "orange"}
                          >
                            {obs.action === "Deliver"
                              ? "تسليم (Deliver)"
                              : obs.action === "Return"
                                ? "إخلاء (Return)"
                                : obs.action || "ملاحظة"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-sky-700 dark:text-sky-300">
                          {formatWalletMoneyOrUnknown(obs.mobileBalance)}
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          <div>
                            إقفال:{" "}
                            {formatWalletMoneyOrUnknown(obs.closingBalance)}
                          </div>
                          <div>
                            تسويات:{" "}
                            {formatWalletMoneyOrUnknown(obs.provenAdjustments)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          <div>
                            الفترة:{" "}
                            {formatWalletMoneyOrUnknown(
                              obs.periodBalance ?? obs.currentPeriodBalance,
                            )}
                          </div>
                          <div>
                            المنسوب:{" "}
                            {formatWalletMoneyOrUnknown(obs.attributedBalance)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[11px]">
                          <div>{obs.riderNameAr || "غير معروف"}</div>
                          <div className="font-mono text-[var(--muted-foreground)]">
                            {(() => {
                              const ref = obs.evidence || obs.walletEvidence;
                              const imgUrl = resolveHungerEvidenceUrl(ref);
                              if (imgUrl) {
                                return (
                                  <a
                                    href={imgUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-sans font-bold text-blue-600 hover:underline dark:text-blue-400"
                                  >
                                    <span>صورة الإثبات</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                );
                              }
                              return ref || "غير معروف";
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. Observations Pager */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--subtle-bg)]/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted-foreground)]">
                  إجمالي الملاحظات: <strong>{historyObservationsTotal}</strong>
                </span>
                <select
                  value={obsPageSize}
                  onChange={(e) => {
                    const clamped = Math.min(
                      Math.max(Number(e.target.value) || 25, 1),
                      100,
                    );
                    setObsPageSize(clamped);
                    setObsPage(1);
                    if (historyTarget) {
                      void loadAccountHistory(
                        historyTarget.accountId,
                        eventsPage,
                        eventsPageSize,
                        1,
                        clamped,
                      );
                    }
                  }}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-xs"
                >
                  {[10, 25, 50, 100].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz} / صفحة
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={obsPage <= 1}
                  onClick={() => {
                    const nextPage = Math.max(1, obsPage - 1);
                    setObsPage(nextPage);
                    if (historyTarget) {
                      void loadAccountHistory(
                        historyTarget.accountId,
                        eventsPage,
                        eventsPageSize,
                        nextPage,
                        obsPageSize,
                      );
                    }
                  }}
                >
                  السابق
                </Button>
                <span>
                  صفحة {obsPage} من {obsTotalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={obsPage >= obsTotalPages}
                  onClick={() => {
                    const nextPage = Math.min(obsTotalPages, obsPage + 1);
                    setObsPage(nextPage);
                    if (historyTarget) {
                      void loadAccountHistory(
                        historyTarget.accountId,
                        eventsPage,
                        eventsPageSize,
                        nextPage,
                        obsPageSize,
                      );
                    }
                  }}
                >
                  التالي
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-[var(--border)] pt-3">
            <Button variant="ghost" onClick={() => setHistoryTarget(null)}>
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
