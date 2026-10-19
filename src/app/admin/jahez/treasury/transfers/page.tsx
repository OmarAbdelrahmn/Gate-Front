// src/app/admin/jahez/treasury/transfers/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TreasuryNavHeader } from "@/components/jahez/treasury/TreasuryNavHeader";
import {
  getTreasuryAccounts,
  getTreasuryBalances,
  createTreasuryTransfer,
  createTreasuryCashEntry,
  reverseTreasuryPosting,
  getTreasuryJournal,
  generateTreasuryIdempotencyKey,
  type TreasuryAccount,
  type TreasuryBalance,
  type TreasuryJournalRow,
  type TreasuryTransferCreate,
  type TreasuryCashEntryCreate,
  type TreasuryReversalCreate,
  TreasuryLocation,
  TreasuryPurpose,
  TreasuryEntryKind,
} from "@/lib/jahez/treasury/api";
import {
  formatSAR,
  getTreasuryLocationLabel,
  getTreasuryPurposeLabel,
  getTreasuryDirectionsLabel,
  getSponsorDisplayName,
  formatRiyadhDateTime,
  getRiyadhTodayDate,
} from "@/lib/jahez/treasury/utils";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import {
  ArrowLeftRight,
  PlusCircle,
  RotateCcw,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Send,
  Coins,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function TreasuryTransfersPage() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canTransfer = can("jahez.treasury.transfers.create") || isAdmin;
  const canCashEntry = can("jahez.treasury.entries.create") || isAdmin;
  const canAdjust = can("jahez.treasury.adjust") || isAdmin;

  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: "transfer" | "cashEntry" | "adjustments"
  const [activeTab, setActiveTab] = useState<"transfer" | "cashEntry" | "adjustments">("transfer");

  // ---------------------------------------------------------
  // 1. Transfer Form State
  // ---------------------------------------------------------
  const [selectedTransferSponsorId, setSelectedTransferSponsorId] = useState<string>("");
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferReference, setTransferReference] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");
  const [isConfirmTransferOpen, setIsConfirmTransferOpen] = useState(false);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // ---------------------------------------------------------
  // 2. Central Cash Entry Form State
  // ---------------------------------------------------------
  const [cashSubAccountId, setCashSubAccountId] = useState<string>("");
  const [cashEntryType, setCashEntryType] = useState<"receipt" | "disbursement">("receipt");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cashReference, setCashReference] = useState<string>("");
  const [cashReason, setCashReason] = useState<string>("");
  const [submittingCash, setSubmittingCash] = useState(false);

  // ---------------------------------------------------------
  // 3. Adjustment & Reversal Form State (Authorized Finance)
  // ---------------------------------------------------------
  const [adjustSubAccountId, setAdjustSubAccountId] = useState<string>("");
  const [adjustKind, setAdjustKind] = useState<
    TreasuryEntryKind.Business | TreasuryEntryKind.Opening | TreasuryEntryKind.Adjustment
  >(TreasuryEntryKind.Adjustment);
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustReference, setAdjustReference] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Reversal Form
  const [reversalPostingId, setReversalPostingId] = useState<string>("");
  const [reversalReference, setReversalReference] = useState<string>("");
  const [reversalReason, setReversalReason] = useState<string>("");
  const [submittingReversal, setSubmittingReversal] = useState(false);
  const [reversibleJournalRows, setReversibleJournalRows] = useState<TreasuryJournalRow[]>([]);
  const [loadingJournal, setLoadingJournal] = useState(false);

  const loadReversiblePostings = useCallback(async () => {
    if (!canAdjust) return;
    setLoadingJournal(true);
    try {
      const today = getRiyadhTodayDate();
      const d = new Date();
      d.setDate(d.getDate() - 90);
      const fromDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);

      const res = await getTreasuryJournal({
        fromDate,
        toDate: today,
        pageSize: 100,
      });

      const items = res?.items || [];
      const eligible = items.filter(
        (r) =>
          r.posting.kind !== TreasuryEntryKind.Reversal &&
          !r.posting.reversesPostingId &&
          !r.posting.cashboxHandoverId
      );
      setReversibleJournalRows(eligible);
    } catch (err: any) {
      console.error("Failed to load journal for reversal:", err);
    } finally {
      setLoadingJournal(false);
    }
  }, [canAdjust]);

  useEffect(() => {
    if (activeTab === "adjustments" && canAdjust) {
      loadReversiblePostings();
    }
  }, [activeTab, canAdjust, loadReversiblePostings]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, bals, sps] = await Promise.all([
        getTreasuryAccounts().catch(() => [] as TreasuryAccount[]),
        getTreasuryBalances().catch(() => [] as TreasuryBalance[]),
        listSponsors().catch(() => [] as Sponsor[]),
      ]);
      setAccounts(accs);
      setBalances(bals);
      setSponsors(sps);
    } catch (err: any) {
      toast.error(err.message || "تعذر جلب بيانات الحسابات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Balance Map
  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    balances.forEach((b) => map.set(b.subAccountId, b.balance));
    return map;
  }, [balances]);

  // Sponsors Map
  const sponsorsMap = useMemo(() => {
    const map = new Map<string, string>();
    sponsors.forEach((s) => map.set(s.id, getSponsorDisplayName(s)));
    return map;
  }, [sponsors]);

  // Accounts of selected sponsor for Transfer
  const sponsorPostingAccounts = useMemo(() => {
    if (!selectedTransferSponsorId) return [];
    return accounts.filter(
      (a) => a.isPosting && a.isActive && a.sponsorId === selectedTransferSponsorId,
    );
  }, [accounts, selectedTransferSponsorId]);

  // Valid Source Accounts for Transfer (Cannot be supervisor custody; cannot be petroapp)
  const validSourceAccounts = useMemo(() => {
    return sponsorPostingAccounts.filter(
      (a) => a.location !== TreasuryLocation.Supervisor && a.location !== TreasuryLocation.PetroApp,
    );
  }, [sponsorPostingAccounts]);

  // Valid Destination Accounts for Transfer (If supervisor, must be Settlement; cannot be petroapp)
  const validDestinationAccounts = useMemo(() => {
    return sponsorPostingAccounts.filter((a) => {
      if (a.id === fromAccountId) return false;
      if (a.location === TreasuryLocation.PetroApp) return false;
      if (a.location === TreasuryLocation.Supervisor && a.purpose !== TreasuryPurpose.Settlement) {
        return false;
      }
      return true;
    });
  }, [sponsorPostingAccounts, fromAccountId]);

  // Selected source & destination accounts
  const sourceAccount = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId],
  );
  const destinationAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId),
    [accounts, toAccountId],
  );

  // Reversal Options from Journal Rows
  const reversalOptions = useMemo(() => {
    return reversibleJournalRows.map((r) => {
      const isPositive = r.posting.amount > 0;
      const directionLabel = isPositive ? "وارد +" : "صادر -";
      const amtStr = formatSAR(Math.abs(r.posting.amount));
      const refStr = r.posting.reference ? `[${r.posting.reference}]` : "";
      const reasonStr = r.posting.reason ? ` - ${r.posting.reason}` : "";

      return {
        value: r.posting.id,
        label: `${r.accountNameAr} (${directionLabel} ${amtStr}) ${refStr}`,
        sublabel: `${formatRiyadhDateTime(r.posting.occurredAtUtc)} | كفيل: ${r.sponsorNameAr || "عام"}${reasonStr}`,
        keywords: `${r.accountCode} ${r.accountNameAr} ${r.posting.reference || ""} ${r.posting.reason || ""} ${r.posting.amount} ${r.sponsorNameAr || ""}`,
      };
    });
  }, [reversibleJournalRows]);

  const selectedReversalRow = useMemo(() => {
    return reversibleJournalRows.find((r) => r.posting.id === reversalPostingId) || null;
  }, [reversibleJournalRows, reversalPostingId]);

  // Validate Transfer submission before confirm modal
  const handleOpenTransferConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(transferAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("يرجى إدخال مبلغ تحويل موجب");
      return;
    }
    if (!fromAccountId || !toAccountId) {
      toast.error("يرجى اختيار حساب المصدر وحساب الوجهة");
      return;
    }
    if (!transferReference.trim() || !transferReason.trim()) {
      toast.error("المرجع والسبب مطلوبان لإتمام التحويل المالي");
      return;
    }

    // Check available source balance
    const currentSrcBal = balanceMap.get(fromAccountId) || 0;
    if (num > currentSrcBal) {
      toast.warning(
        `تنبيه: المبلغ المراد تحويله (${formatSAR(num)}) أكبر من الرصيد الدفتري الحالي للحساب (${formatSAR(currentSrcBal)}). قد يرفض الخادم العملية.`,
      );
    }

    setIsConfirmTransferOpen(true);
  };

  // Submit Internal Transfer
  const handleTransferSubmit = async () => {
    setSubmittingTransfer(true);
    try {
      const num = parseFloat(transferAmount);
      const key = generateTreasuryIdempotencyKey("transfer");
      const payload: TreasuryTransferCreate = {
        fromAccountId,
        toAccountId,
        amount: num,
        reference: transferReference.trim(),
        reason: transferReason.trim(),
      };

      await createTreasuryTransfer(payload, key);
      toast.success("تم تنفيذ التحويل المالي بنجاح");
      setIsConfirmTransferOpen(false);
      setTransferAmount("");
      setTransferReference("");
      setTransferReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "فشل تنفيذ التحويل الداخلي");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Central Cash Entry Accounts (Central or Bank only)
  const centralAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.isPosting &&
        a.isActive &&
        (a.location === TreasuryLocation.Central || a.location === TreasuryLocation.Bank),
    );
  }, [accounts]);

  // Submit Central Cash Entry
  const handleCashEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(cashAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("يرجى إدخال مبلغ موجب");
      return;
    }
    if (!cashSubAccountId) {
      toast.error("يرجى اختيار الحساب");
      return;
    }
    if (!cashReference.trim() || !cashReason.trim()) {
      toast.error("المرجع والسبب مطلوبان");
      return;
    }

    setSubmittingCash(true);
    try {
      const signedAmount = cashEntryType === "receipt" ? num : -num;
      const key = generateTreasuryIdempotencyKey("cash-entry");
      const payload: TreasuryCashEntryCreate = {
        subAccountId: cashSubAccountId,
        amount: signedAmount,
        kind: TreasuryEntryKind.Business,
        reference: cashReference.trim(),
        reason: cashReason.trim(),
      };

      await createTreasuryCashEntry(payload, key);
      toast.success("تم تسجيل القيد المركزي بنجاح");
      setCashAmount("");
      setCashReference("");
      setCashReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "فشل تسجيل القيد المركزي");
    } finally {
      setSubmittingCash(false);
    }
  };

  // Submit Adjustment / Opening
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(adjustAmount);
    if (isNaN(num) || num === 0) {
      toast.error("يرجى إدخال مبلغ غير صفري");
      return;
    }
    if (!adjustSubAccountId) {
      toast.error("يرجى اختيار الحساب");
      return;
    }
    if (!adjustReference.trim() || !adjustReason.trim()) {
      toast.error("المرجع والسبب مطلوبان");
      return;
    }

    setSubmittingAdjust(true);
    try {
      const key = generateTreasuryIdempotencyKey("adjust");
      const payload: TreasuryCashEntryCreate = {
        subAccountId: adjustSubAccountId,
        amount: num,
        kind: adjustKind,
        reference: adjustReference.trim(),
        reason: adjustReason.trim(),
      };

      await createTreasuryCashEntry(payload, key);
      toast.success("تم إثبات القيد المالي بنجاح");
      setAdjustAmount("");
      setAdjustReference("");
      setAdjustReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "فشل تسجيل التسوية المالية");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Submit Reversal
  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalPostingId.trim()) {
      toast.error("يرجى إدخال معرف القيد الداخلي المراد عكسه");
      return;
    }
    if (!reversalReference.trim() || !reversalReason.trim()) {
      toast.error("المرجع والسبب مطلوبان لعكس القيد");
      return;
    }

    setSubmittingReversal(true);
    try {
      const key = generateTreasuryIdempotencyKey("reversal");
      const payload: TreasuryReversalCreate = {
        postingId: reversalPostingId.trim(),
        reference: reversalReference.trim(),
        reason: reversalReason.trim(),
      };

      await reverseTreasuryPosting(payload, key);
      toast.success("تم عكس القيد بنجاح (وعكس كلا طرفي التحويل الداخلي إن وُجدا)");
      setReversalPostingId("");
      setReversalReference("");
      setReversalReason("");
      loadData();
      loadReversiblePostings();
    } catch (err: any) {
      toast.error(err.message || "تعذر عكس القيد (تأكد من أن القيد غير مقفل بتسليم معتمد)");
    } finally {
      setSubmittingReversal(false);
    }
  };

  return (
    <div className="space-y-6">
      <TreasuryNavHeader
        title="التمويل والتحويلات والقيود المركزية"
        description="إدارة حركة التمويل الداخلي بين حسابات الكفيل، وتسجيل القيود والتسويات المصرح بها."
        onRefresh={loadData}
        isRefreshing={loading}
      />

      {/* Tabs */}
      <div className="flex border-b border-border/80 gap-3 text-xs">
        <button
          onClick={() => setActiveTab("transfer")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "transfer"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>التمويل والتحويل الداخلي</span>
        </button>

        <button
          onClick={() => setActiveTab("cashEntry")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "cashEntry"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>القبض والصرف المركزي العادي</span>
        </button>

        {canAdjust && (
          <button
            onClick={() => setActiveTab("adjustments")}
            className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "adjustments"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>التسويات والافتتاح وعكس القيود</span>
          </button>
        )}
      </div>

      {/* Tab 1: Funding & Internal Transfers */}
      {activeTab === "transfer" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 max-w-4xl">
          <div>
            <h2 className="text-sm font-bold text-foreground">نموذج التمويل والتحويل الداخلي</h2>
              <p className="text-xs text-muted-foreground">
                التحويل يتم حصراً بين حسابين نشطين لنفس الكفيل المالي.
              </p>
            </div>

            <form onSubmit={handleOpenTransferConfirm} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  1. اختر الكفيل المالي *
                </label>
                <SearchableSelect
                  value={selectedTransferSponsorId}
                  onChange={(val) => {
                    setSelectedTransferSponsorId(val);
                    setFromAccountId("");
                    setToAccountId("");
                  }}
                  options={sponsors.map((s) => ({
                    value: s.id,
                    label: getSponsorDisplayName(s),
                  }))}
                  placeholder="اختر كفيل الحسابات المراد التحويل بينها"
                />
              </div>

              {selectedTransferSponsorId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                    <label className="block font-semibold text-foreground">
                      2. حساب المصدر (خصم) *
                    </label>
                    <SearchableSelect
                      value={fromAccountId}
                      onChange={setFromAccountId}
                      options={validSourceAccounts.map((a) => {
                        const bal = balanceMap.get(a.id) || 0;
                        return {
                          value: a.id,
                          label: `${a.code} - ${a.nameAr} [${formatSAR(bal)}]`,
                        };
                      })}
                      placeholder="اختر حساب المصدر (المركز أو البنك)"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      * لا يمكن التحويل من عهدة المشرف يدوياً (تخرج عهدة المشرف بمحضر تسليم فقط).
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                    <label className="block font-semibold text-foreground">
                      3. حساب الوجهة (إيداع) *
                    </label>
                    <SearchableSelect
                      value={toAccountId}
                      onChange={setToAccountId}
                      options={validDestinationAccounts.map((a) => {
                        const bal = balanceMap.get(a.id) || 0;
                        return {
                          value: a.id,
                          label: `${a.code} - ${a.nameAr} [${formatSAR(bal)}]`,
                        };
                      })}
                      placeholder="اختر حساب الوجهة"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      * إذا كانت الوجهة عهدة مشرف فيجب أن تكون لغرض تصفيات المناديب حصراً.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    المبلغ بالريال السعودي *
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    المرجع / رقم الإشعار *
                  </label>
                  <Input
                    required
                    placeholder="مثال: تمويل تشغيل أكتوبر / إشعار بنكي 412"
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    className="h-9 text-xs"
                    maxLength={500}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  السبب والغرض الإداري *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="اكتب سبب التحويل بدقة للتوثيق والتدقيق المحاسبي..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  maxLength={2000}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={!selectedTransferSponsorId || !fromAccountId || !toAccountId}
                  className="gap-2 font-semibold"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>مراجعة وتأكيد التحويل</span>
                </Button>
              </div>
            </form>
        </div>
      )}

      {/* Tab 2: Central Cash Entries */}
      {activeTab === "cashEntry" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 max-w-4xl">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              تسجيل قبض أو صرف مركزي عادي
            </h2>
              <p className="text-xs text-muted-foreground">
                متاح فقط في حسابات المركز الرئيسي أو البنك. لا تستخدم هذا النموذج لصرف أو قبض رسوم
                مندوب مسجلة في عمليات V2.
              </p>
            </div>

            <form onSubmit={handleCashEntrySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    الحساب المركزي أو البنكي *
                  </label>
                  <SearchableSelect
                    value={cashSubAccountId}
                    onChange={setCashSubAccountId}
                    options={centralAccounts.map((a) => ({
                      value: a.id,
                      label: `${a.code} - ${a.nameAr} (${getTreasuryLocationLabel(a.location)})`,
                    }))}
                    placeholder="اختر الحساب المستهدف"
                  />
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">نوع القيد *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCashEntryType("receipt")}
                      className={`h-9 rounded-md border text-xs font-semibold transition-all ${
                        cashEntryType === "receipt"
                          ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      قبض (وارد +)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashEntryType("disbursement")}
                      className={`h-9 rounded-md border text-xs font-semibold transition-all ${
                        cashEntryType === "disbursement"
                          ? "border-red-600 bg-red-500/10 text-red-600 dark:text-red-400"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      صرف (صادر -)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    المبلغ بالريال السعودي *
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    المرجع / السند *
                  </label>
                  <Input
                    required
                    placeholder="مثال: سند قبض مركز الرياض / 105"
                    value={cashReference}
                    onChange={(e) => setCashReference(e.target.value)}
                    className="h-9 text-xs"
                    maxLength={500}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  السبب والبيان *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="سبب القيد المركزي..."
                  value={cashReason}
                  onChange={(e) => setCashReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  maxLength={2000}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submittingCash} className="gap-2 font-semibold">
                  <Coins className="h-4 w-4" />
                  <span>{submittingCash ? "جاري التسجيل..." : "حفظ القيد المركزي"}</span>
                </Button>
              </div>
            </form>
        </div>
      )}

      {/* Tab 3: Adjustments, Openings & Reversals (Authorized Finance) */}
      {activeTab === "adjustments" && canAdjust && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opening / Adjustment Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>تسوية مالية أو رصيد افتتاحي</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                صلاحية مالية خاصة (`jahez.treasury.adjust`). الرصيد الافتتاحي يسجل مرة واحدة فقط قبل
                التفعيل.
              </p>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    الحساب المستهدف *
                  </label>
                  <SearchableSelect
                    value={adjustSubAccountId}
                    onChange={setAdjustSubAccountId}
                    options={accounts
                      .filter((a) => a.isPosting && a.isActive)
                      .map((a) => ({
                        value: a.id,
                        label: `${a.code} - ${a.nameAr}`,
                      }))}
                    placeholder="اختر الحساب"
                  />
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    طبيعة الإجراء *
                  </label>
                  <SearchableSelect
                    value={String(adjustKind)}
                    onChange={(val) =>
                      setAdjustKind(
                        Number(val) as TreasuryEntryKind.Opening | TreasuryEntryKind.Adjustment
                      )
                    }
                    options={[
                      { value: String(TreasuryEntryKind.Adjustment), label: "تسوية مالية" },
                      { value: String(TreasuryEntryKind.Opening), label: "رصيد افتتاحي" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    المبلغ بالريال (موجب أو سالب) *
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    المرجع المالي المعتمد *
                  </label>
                  <Input
                    required
                    placeholder="مثال: تسوية مطابقة مدقق داخلي / قرار 12"
                    value={adjustReference}
                    onChange={(e) => setAdjustReference(e.target.value)}
                    className="h-9 text-xs"
                    maxLength={500}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  السبب والقرار المالي *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="بيان سبب التسوية المعتمدة..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  maxLength={2000}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submittingAdjust} className="gap-2 font-semibold">
                  <span>{submittingAdjust ? "جاري الإثبات..." : "تسجيل التسوية"}</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Reversal Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-500" />
                <span>عكس قيد محاسبي</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                عكس قيد مسجل بالدفتر غير مقفل. عند اختيار طرف تحويل داخلي يعكس الخادم طرفي التحويل
                معاً تلقائياً.
              </p>
            </div>

            <form onSubmit={handleReversalSubmit} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-muted-foreground">
                    اختر القيد المحاسبي المراد عكسه *
                  </label>
                  <button
                    type="button"
                    onClick={loadReversiblePostings}
                    disabled={loadingJournal}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    title="تحديث قائمة القيود المتاحة للعكس"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingJournal ? "animate-spin" : ""}`} />
                    <span>تحديث القائمة</span>
                  </button>
                </div>
                <SearchableSelect
                  value={reversalPostingId}
                  onChange={(val) => {
                    setReversalPostingId(val);
                    const selected = reversibleJournalRows.find((r) => r.posting.id === val);
                    if (selected && !reversalReference) {
                      setReversalReference(
                        selected.posting.reference
                          ? `عكس: ${selected.posting.reference}`
                          : `عكس قيد: ${selected.accountNameAr}`
                      );
                    }
                  }}
                  options={reversalOptions}
                  placeholder={
                    loadingJournal
                      ? "جاري تحميل القيود القابلة للعكس..."
                      : reversalOptions.length === 0
                        ? "لا توجد قيود قابلة للعكس حالياً بالدفتر"
                        : "ابحث واختر القيد من دفتر الحركات..."
                  }
                  searchPlaceholder="ابحث باسم الحساب، المرجع، المبلغ، أو البيان..."
                  disabled={loadingJournal}
                />
              </div>

              {selectedReversalRow && (
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">بيانات القيد المحدد:</span>
                    <Badge
                      tone={selectedReversalRow.posting.amount > 0 ? "green" : "red"}
                      className="text-[10px]"
                    >
                      {selectedReversalRow.posting.amount > 0 ? "وارد +" : "صادر -"}{" "}
                      {formatSAR(Math.abs(selectedReversalRow.posting.amount))}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <span>الحساب:</span>{" "}
                      <strong className="text-foreground">{selectedReversalRow.accountNameAr}</strong>
                    </div>
                    <div>
                      <span>الكفيل:</span>{" "}
                      <strong className="text-foreground">
                        {selectedReversalRow.sponsorNameAr || "عام"}
                      </strong>
                    </div>
                    <div>
                      <span>التاريخ:</span>{" "}
                      <span className="text-foreground font-mono">
                        {formatRiyadhDateTime(selectedReversalRow.posting.occurredAtUtc)}
                      </span>
                    </div>
                    <div>
                      <span>المرجع الأصلي:</span>{" "}
                      <span className="text-foreground">
                        {selectedReversalRow.posting.reference || "—"}
                      </span>
                    </div>
                  </div>
                  {selectedReversalRow.posting.reason && (
                    <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>البيان:</span> {selectedReversalRow.posting.reason}
                    </div>
                  )}
                  {selectedReversalRow.posting.kind === TreasuryEntryKind.Transfer && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      * هذا القيد جزء من تحويل داخلي؛ سيتم عكس طرفي التحويل معاً تلقائياً.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  مرجع العكس والتصحيح *
                </label>
                <Input
                  required
                  placeholder="مثال: إشعار عكس قيد تحويل خاطئ / 77"
                  value={reversalReference}
                  onChange={(e) => setReversalReference(e.target.value)}
                  className="h-9 text-xs"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">
                  سبب وتبرير العكس المحاسبي *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="سبب إلغاء وعكس القيد..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  maxLength={2000}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={submittingReversal || !reversalPostingId}
                  className="gap-2 font-semibold text-amber-600 hover:bg-amber-500/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{submittingReversal ? "جاري العكس..." : "تأكيد عكس القيد"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Internal Transfer */}
      <Modal
        isOpen={isConfirmTransferOpen}
        onClose={() => setIsConfirmTransferOpen(false)}
        title="تأكيد ومراجعة التحويل الداخلي"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-1">
            <span className="text-xs text-muted-foreground">ملخص الحركة المالية:</span>
            <div className="text-sm font-bold text-primary">
              تحويل {formatSAR(parseFloat(transferAmount || "0"))} من حساب [
              {sourceAccount?.nameAr}] إلى حساب [{destinationAccount?.nameAr}]
            </div>
            <div className="text-[11px] text-muted-foreground">
              الكفيل المالي: {sponsorsMap.get(selectedTransferSponsorId)}
            </div>
          </div>

          <div className="space-y-2 text-muted-foreground border-y border-border py-3">
            <div className="flex justify-between">
              <span>المرجع:</span>
              <span className="font-semibold text-foreground">{transferReference}</span>
            </div>
            <div className="flex justify-between">
              <span>السبب:</span>
              <span className="font-semibold text-foreground">{transferReason}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConfirmTransferOpen(false)}
              disabled={submittingTransfer}
            >
              رجوع وتعديل
            </Button>
            <Button
              size="sm"
              onClick={handleTransferSubmit}
              disabled={submittingTransfer}
              className="gap-2 font-semibold"
            >
              {submittingTransfer ? "جاري التحويل..." : "تأكيد الإرسال الآن"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
