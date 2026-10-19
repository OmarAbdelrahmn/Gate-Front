// src/app/admin/jahez/treasury/balances/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TreasuryNavHeader } from "@/components/jahez/treasury/TreasuryNavHeader";
import {
  getTreasuryBalances,
  getTreasuryAccounts,
  getTreasuryJournal,
  type TreasuryBalance,
  type TreasuryAccount,
  type TreasuryJournalRow,
  type TreasuryFilter,
  TreasuryLocation,
  TreasuryPurpose,
} from "@/lib/jahez/treasury/api";
import {
  formatSAR,
  getRiyadhTodayDate,
  getRiyadhFirstDayOfMonth,
  formatRiyadhDateTime,
  displayPersonName,
  getTreasuryEntryKindLabel,
  getSponsorDisplayName,
} from "@/lib/jahez/treasury/utils";
import { getJahezFunds } from "@/lib/jahez/api";
import type { FundBalance } from "@/lib/jahez/types";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/jahez/treasury/TreasuryModal";
import { toast } from "@/components/ui/Toast";
import {
  Building2, Wallet, Landmark, Fuel, ArrowDownLeft, ArrowUpRight,
  RefreshCw, Search, ChevronLeft, ChevronRight, Eye, AlertCircle, FileText,
} from "lucide-react";

export default function TreasuryBalancesPage() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canReadTreasury = can("jahez.treasury.read") || isAdmin;

  // Data states
  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [legacyFunds, setLegacyFunds] = useState<FundBalance[]>([]);
  const [journalRows, setJournalRows] = useState<TreasuryJournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Journal Filters
  const today = useMemo(() => getRiyadhTodayDate(), []);
  const firstOfMonth = useMemo(() => getRiyadhFirstDayOfMonth(), []);
  const [fromDate, setFromDate] = useState<string>(firstOfMonth);
  const [toDate, setToDate] = useState<string>(today);
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

  // Selected Journal Row for Details Modal
  const [selectedRow, setSelectedRow] = useState<TreasuryJournalRow | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Load Balances, Accounts, and Sponsors
  const loadCoreData = useCallback(async () => {
    if (!canReadTreasury) return;
    setLoading(true);
    setFetchError(null);
    try {
      const [balancesRes, accountsRes, sponsorsRes] = await Promise.all([
        getTreasuryBalances().catch((err) => {
          console.error("Failed to fetch balances", err);
          throw new Error("تعذر تحميل الأرصدة. تحقق من الاتصال وصلاحية عرض الخزينة.");
        }),
        getTreasuryAccounts().catch((err) => {
          console.error("Failed to fetch accounts", err);
          throw new Error("تعذر تحميل حسابات الخزينة. أعد المحاولة لعرض الأرصدة بشكل صحيح.");
        }),
        listSponsors().catch(() => [] as Sponsor[]),
      ]);

      setBalances(balancesRes || []);
      setAccounts(accountsRes || []);
      setSponsors(sponsorsRes || []);

      // Optionally load legacy V2 funds for non-settled comparison
      if (can("jahez.cashbox.read") || isAdmin) {
        try {
          const v2Funds = await getJahezFunds();
          setLegacyFunds(v2Funds || []);
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      setFetchError(err.message || "حدث خطأ أثناء تحميل بيانات الخزائن");
      toast.error(err.message || "حدث خطأ أثناء تحميل بيانات الخزائن");
    } finally {
      setLoading(false);
    }
  }, [canReadTreasury, isAdmin, can]);

  // Load Journal Rows based on filters
  const loadJournal = useCallback(async () => {
    if (!canReadTreasury) return;
    setJournalLoading(true);
    setJournalError(null);
    try {
      const filter: TreasuryFilter = {
        fromDate: fromDate || firstOfMonth,
        toDate: toDate || today,
        page,
        pageSize,
      };
      if (selectedSponsorId) filter.sponsorId = selectedSponsorId;
      if (selectedAccountId) filter.subAccountId = selectedAccountId;
      if (selectedPurpose) filter.purpose = Number(selectedPurpose);

      const res = await getTreasuryJournal(filter);
      setJournalRows(res?.items || []);
    } catch (err: any) {
      setJournalError(err.message || "تعذر تحميل حركة الأموال. حاول مرة أخرى.");
      setJournalRows([]);
    } finally {
      setJournalLoading(false);
    }
  }, [canReadTreasury, fromDate, toDate, firstOfMonth, today, page, pageSize, selectedSponsorId, selectedAccountId, selectedPurpose]);

  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  // Sponsors Map for Quick Name Lookup
  const sponsorsMap = useMemo(() => {
    const map = new Map<string, string>();
    sponsors.forEach((s) => map.set(s.id, getSponsorDisplayName(s)));
    return map;
  }, [sponsors]);

  // Calculate actual totals per sponsor & location (ONLY isPosting=true)
  const sponsorCardGroups = useMemo(() => {
    // Group balances by sponsorId
    const groups = new Map<
      string,
      {
        sponsorId: string;
        sponsorName: string;
        totalActual: number;
        settlementCustody: number;
        feeCustody: number;
        centralBalance: number;
        bankBalance: number;
        petroAppClearing: number;
        postingCount: number;
      }
    >();

    // Leaf balances only
    const leafBalances = balances.filter((b) => b.isPosting);

    leafBalances.forEach((b) => {
      const spId = b.sponsorId || "unassigned";
      if (!groups.has(spId)) {
        const name = b.sponsorId ? sponsorsMap.get(b.sponsorId) || "كفيل غير معروف" : "بدون كفيل محدد";
        groups.set(spId, {
          sponsorId: spId,
          sponsorName: name,
          totalActual: 0,
          settlementCustody: 0,
          feeCustody: 0,
          centralBalance: 0,
          bankBalance: 0,
          petroAppClearing: 0,
          postingCount: 0,
        });
      }

      const g = groups.get(spId)!;
      if (b.location !== TreasuryLocation.PetroApp) g.totalActual += b.balance;
      g.postingCount++;

      // Distinguish locations and purposes
      const acc = accounts.find((a) => a.id === b.subAccountId);
      if (b.location === TreasuryLocation.Supervisor) {
        if (acc?.purpose === TreasuryPurpose.AccountFee) {
          g.feeCustody += b.balance;
        } else {
          g.settlementCustody += b.balance;
        }
      } else if (b.location === TreasuryLocation.Central) {
        g.centralBalance += b.balance;
      } else if (b.location === TreasuryLocation.Bank) {
        g.bankBalance += b.balance;
      } else if (b.location === TreasuryLocation.PetroApp) {
        g.petroAppClearing += b.balance;
      }
    });

    return Array.from(groups.values());
  }, [balances, accounts, sponsorsMap]);

  // Grand Total of All Posting Accounts
  const grandTotalActual = useMemo(() => {
    return balances
      .filter((b) => b.isPosting && b.location !== TreasuryLocation.PetroApp)
      .reduce((acc, curr) => acc + curr.balance, 0);
  }, [balances]);

  // Filtered Journal rows by search query
  const filteredJournalRows = useMemo(() => {
    if (!searchQuery.trim()) return journalRows;
    const q = searchQuery.toLowerCase().trim();
    return journalRows.filter((r) => {
      return (
        (r.accountNameAr && r.accountNameAr.toLowerCase().includes(q)) ||
        (r.accountCode && r.accountCode.toLowerCase().includes(q)) ||
        (r.sponsorNameAr && r.sponsorNameAr.toLowerCase().includes(q)) ||
        (r.driverNameAr && r.driverNameAr.toLowerCase().includes(q)) ||
        (r.posting.actorNameAr && r.posting.actorNameAr.toLowerCase().includes(q)) ||
        (r.posting.reference && r.posting.reference.toLowerCase().includes(q)) ||
        (r.posting.reason && r.posting.reason.toLowerCase().includes(q))
      );
    });
  }, [journalRows, searchQuery]);

  return (
    <div className="space-y-6">
      <TreasuryNavHeader
        title="الأرصدة وحركة الأموال"
        description="تابع أموال كل شركة، وما لدى المشرف، وما تم تسليمه للمحاسب."
        onRefresh={() => {
          loadCoreData();
          loadJournal();
        }}
        isRefreshing={loading || journalLoading}
      />

      {/* Error Banner */}
      {fetchError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{fetchError}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadCoreData} className="gap-2 shrink-0">
            <RefreshCw className="h-4 w-4" />
            <span>إعادة المحاولة</span>
          </Button>
        </div>
      )}

      <section className="treasury-summary" aria-label="ملخص الأرصدة" aria-busy={loading}>
        <div className="treasury-summary-top">
          <div>
            <p className="treasury-total-label">إجمالي النقدية والبنك المسجل</p>
            <p className="treasury-total">{loading ? "جارٍ التحميل…" : fetchError ? "غير متاح" : formatSAR(grandTotalActual)}</p>
          </div>
          <p className="treasury-summary-note">رصيد مسجل، وقد يشمل مبالغ بانتظار التسليم. تحصيلات بترو آب تظهر منفصلة أدناه، ولا تدخل في هذا الإجمالي.</p>
        </div>
        <div className="treasury-metrics">
          {[
            { label: "تصفيات لدى المشرف", icon: Wallet, amount: sponsorCardGroups.reduce((sum, g) => sum + g.settlementCustody, 0), help: "رصيد التصفيات لكل شركة" },
            { label: "رسوم لدى المشرف", icon: FileText, amount: sponsorCardGroups.reduce((sum, g) => sum + g.feeCustody, 0), help: "رسوم محصلة بانتظار التسليم" },
            { label: "الخزينة الرئيسية", icon: Building2, amount: sponsorCardGroups.reduce((sum, g) => sum + g.centralBalance, 0), help: "المبالغ المسجلة لدى المحاسب" },
            { label: "الحسابات البنكية", icon: Landmark, amount: sponsorCardGroups.reduce((sum, g) => sum + g.bankBalance, 0), help: "الرصيد البنكي المسجل لكل شركة" },
          ].map(metric => <div className="treasury-metric" key={metric.label}>
            <span className="treasury-metric-label"><metric.icon size={17} aria-hidden="true" />{metric.label}</span>
            <strong>{loading ? "…" : fetchError ? "غير متاح" : formatSAR(metric.amount)}</strong>
            <p>{metric.help}</p>
          </div>)}
        </div>
      </section>

      {/* Sponsor-by-Sponsor Balances Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="treasury-section-heading border-b border-border">
          <div><h2>رصيد كل شركة</h2><p>أموال كل شركة مستقلة عن الشركات الأخرى.</p></div>
          <span className="treasury-count">
            {sponsorCardGroups.length} شركات
          </span>
        </div>

        {sponsorCardGroups.length === 0 && !loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            لا توجد حسابات لعرض أرصدتها حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="py-2.5 px-3.5">الشركة (كفيل الحساب)</th>
                  <th className="py-2.5 px-3 text-left">تصفيات المشرف</th>
                  <th className="py-2.5 px-3 text-left">رسوم المشرف</th>
                  <th className="py-2.5 px-3 text-left">الخزينة الرئيسية</th>
                  <th className="py-2.5 px-3 text-left">البنك</th>
                  <th className="py-2.5 px-3 text-left">تحصيلات بترو آب</th>
                  <th className="py-2.5 px-3.5 text-left font-bold text-foreground">النقدية والبنك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sponsorCardGroups.map((group) => (
                  <tr key={group.sponsorId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-foreground">
                      {group.sponsorName}
                      <span className="text-[10px] text-muted-foreground block font-normal">
                        {group.postingCount} حسابات
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono">
                      {formatSAR(group.settlementCustody)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono">
                      {formatSAR(group.feeCustody)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono">
                      {formatSAR(group.centralBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono">
                      {formatSAR(group.bankBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono">
                      {formatSAR(group.petroAppClearing)}
                    </td>
                    <td className="py-2.5 px-3.5 text-left font-mono font-bold text-foreground">
                      {formatSAR(group.totalActual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="treasury-info"><Fuel size={18} aria-hidden="true" /><p>تحصيلات بترو آب هي المبالغ المسجلة من المناديب، وليست رصيد محفظة الوقود. راجع صفحة بترو آب لمعرفة الشحن وكشف الرصيد.</p></div>
      {legacyFunds.length > 0 && <details className="treasury-legacy"><summary>حركات بانتظار التسليم — النظام السابق</summary><p>هذه مبالغ الحركات غير المسلّمة في النظام السابق، وليست رصيد الخزينة الحالي.</p><div className="flex flex-wrap gap-4 mt-3">{legacyFunds.map((fund, index) => <span key={index}>{fund.fund === 1 ? "نقدية" : fund.fund === 2 ? "بترو آب" : "بنك"}: {formatSAR(fund.balance)}</span>)}</div></details>}

      {/* Treasury Journal Section */}
      <div className="space-y-4 pt-6 border-t border-border/80">
        <div className="treasury-journal-heading">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>حركة الأموال</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              راجع المقبوضات والمصروفات والتحويلات خلال الفترة التي تختارها.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadJournal}
              disabled={journalLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${journalLoading ? "animate-spin" : ""}`} />
              <span>تحديث الحركات</span>
            </Button>
          </div>
        </div>

        <div className="treasury-filters">
          <div><label htmlFor="treasury-from">من تاريخ</label><Input id="treasury-from" type="date" value={fromDate} max={toDate || undefined} onChange={e => { setFromDate(e.target.value); setPage(1); }} /></div>
          <div><label htmlFor="treasury-to">إلى تاريخ</label><Input id="treasury-to" type="date" value={toDate} min={fromDate || undefined} onChange={e => { setToDate(e.target.value); setPage(1); }} /></div>
          <div><label htmlFor="treasury-sponsor">الشركة (كفيل الحساب)</label><select id="treasury-sponsor" value={selectedSponsorId} onChange={e => { setSelectedSponsorId(e.target.value); setPage(1); }}><option value="">جميع الشركات</option>{sponsors.map(sponsor => <option key={sponsor.id} value={sponsor.id}>{getSponsorDisplayName(sponsor)}</option>)}</select></div>
          <div><label htmlFor="treasury-account">الحساب</label><select id="treasury-account" value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setPage(1); }}><option value="">جميع الحسابات</option>{accounts.filter(account => account.isPosting).map(account => <option key={account.id} value={account.id}>{account.nameAr}</option>)}</select></div>
          <div><label htmlFor="treasury-purpose">نوع المبلغ</label><select id="treasury-purpose" value={selectedPurpose} onChange={e => { setSelectedPurpose(e.target.value); setPage(1); }}><option value="">جميع الأنواع</option><option value="1">تصفيات</option><option value="2">رسوم الحساب</option><option value="3">رسوم وتصفيات</option></select></div>
        </div>

        {/* Table Search */}
        <div className="treasury-table-toolbar">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="بحث في حركات الصفحة الحالية"
              placeholder="بحث في هذه الصفحة بالاسم أو المرجع…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || journalLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1 text-xs"
            >
              <ChevronRight className="h-4 w-4" />
              <span>السابق</span>
            </Button>
            <span className="text-xs font-semibold px-2">صفحة {page}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={journalRows.length < pageSize || journalLoading}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1 text-xs"
            >
              <span>التالي</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {journalError && <div className="treasury-info" role="alert"><AlertCircle size={18} /><p>{journalError}</p><Button variant="secondary" size="sm" onClick={loadJournal}>إعادة المحاولة</Button></div>}
        {/* Journal Rows Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-3">التاريخ والوقت (الرياض)</th>
                  <th className="py-3 px-3">الحساب</th>
                  <th className="py-3 px-3">الكفيل</th>
                  <th className="py-3 px-3">نوع الحركة</th>
                  <th className="py-3 px-3">الاتجاه</th>
                  <th className="py-3 px-3">المبلغ</th>
                  <th className="py-3 px-3">المرجع</th>
                  <th className="py-3 px-3">المندوب</th>
                  <th className="py-3 px-3">منفذ الحركة</th>
                  <th className="py-3 px-3 text-center">التسوية</th>
                  <th className="py-3 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {journalLoading && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span>جارٍ تحميل الحركات…</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!journalLoading && !journalError && filteredJournalRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground">
                      <div className="treasury-empty"><FileText size={28} aria-hidden="true" /><strong>لا توجد حركات لعرضها</strong><p>ستظهر المقبوضات والمصروفات هنا بعد تسجيلها. يمكنك تغيير الفترة أو خيارات البحث.</p></div>
                    </td>
                  </tr>
                )}

                {!journalLoading &&
                  filteredJournalRows.map((row) => {
                    const isIncoming = row.posting.amount > 0;
                    return (
                      <tr key={row.posting.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                          {formatRiyadhDateTime(row.posting.occurredAtUtc)}
                        </td>
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                          {row.accountNameAr}
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            {row.accountCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {row.sponsorNameAr || "—"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px]">
                            {getTreasuryEntryKindLabel(row.posting.kind)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isIncoming ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <ArrowDownLeft className="h-3 w-3" />
                              وارد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                              <ArrowUpRight className="h-3 w-3" />
                              صادر
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-bold whitespace-nowrap ${
                            isIncoming
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatSAR(row.posting.amount)}
                        </td>
                        <td className="py-2.5 px-3 max-w-[180px] truncate" title={row.posting.reference}>
                          {row.posting.reference || "—"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {displayPersonName(row.driverNameAr, "driver")}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {displayPersonName(row.posting.actorNameAr, "user")}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {row.isReconciled ? (
                            <Badge tone="green" className="text-[10px]">
                              مسوّى
                            </Badge>
                          ) : (
                            <Badge tone="orange" className="text-[10px]">
                              غير مسوّى
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedRow(row);
                              setIsDetailModalOpen(true);
                            }}
                            title="عرض تفاصيل الحركة"
                            aria-label="عرض تفاصيل الحركة"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRow && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="تفاصيل الحركة"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 border-b border-border pb-3">
              <div>
                <span className="text-muted-foreground block">الحساب:</span>
                <span className="font-bold text-foreground">
                  {selectedRow.accountNameAr} ({selectedRow.accountCode})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">الشركة صاحبة المبلغ:</span>
                <span className="font-bold text-foreground">
                  {selectedRow.sponsorNameAr || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">المبلغ:</span>
                <span
                  className={`font-bold ${
                    selectedRow.posting.amount >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatSAR(selectedRow.posting.amount)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">نوع الحركة:</span>
                <span>{getTreasuryEntryKindLabel(selectedRow.posting.kind)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">تاريخ الإجراء:</span>
                <span className="font-mono">
                  {formatRiyadhDateTime(selectedRow.posting.occurredAtUtc)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">منفذ الحركة:</span>
                <span>{displayPersonName(selectedRow.posting.actorNameAr, "user")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground block">المرجع:</span>
                <p className="rounded-lg bg-muted/50 p-2 font-mono text-[11px] break-all">
                  {selectedRow.posting.reference || "لا يوجد مرجع"}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground block">السبب والبيان:</span>
                <p className="rounded-lg bg-muted/50 p-2 leading-relaxed">
                  {selectedRow.posting.reason || "لا يوجد بيان مسجل"}
                </p>
              </div>

              {selectedRow.driverNameAr && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <div>
                    <span className="text-muted-foreground block">المندوب:</span>
                    <span>{selectedRow.driverNameAr}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">رقم الإقامة:</span>
                    <span className="font-mono">{selectedRow.iqamaNo || "—"}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
