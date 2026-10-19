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
  TreasuryEntryKind,
} from "@/lib/jahez/treasury/api";
import {
  formatSAR,
  getRiyadhTodayDate,
  getRiyadhFirstDayOfMonth,
  formatRiyadhDateTime,
  displayPersonName,
  getTreasuryLocationLabel,
  getTreasuryEntryKindLabel,
  getSponsorDisplayName,
} from "@/lib/jahez/treasury/utils";
import { getJahezFunds } from "@/lib/jahez/api";
import type { FundBalance } from "@/lib/jahez/types";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import {
  BadgeDollarSign,
  Building2,
  Wallet,
  Landmark,
  CreditCard,
  Fuel,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
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
          throw new Error("تعذر جلب الأرصدة الفعلية للخزائن. تأكد من تفعيل V3 وصلاحياتك.");
        }),
        getTreasuryAccounts().catch((err) => {
          console.error("Failed to fetch accounts", err);
          return [] as TreasuryAccount[];
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
      toast.error(err.message || "تعذر جلب قيود دفتر الخزينة");
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
      g.totalActual += b.balance;
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
      .filter((b) => b.isPosting)
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
        title="الأرصدة الفعلية ودفتر الخزائن"
        description="عرض الأرصدة الحقيقية المفصولة حسب الكفيل والغرض، مع تتبع كامل لقيود اليومية."
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

      {/* Clean KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
          <span className="text-xs font-medium text-muted-foreground block">إجمالي رصيد الخزائن</span>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono">
            {formatSAR(grandTotalActual)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {balances.filter((b) => b.isPosting).length} حساب فرعي نشط
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
          <span className="text-xs font-medium text-muted-foreground block">عهدة التصفيات (المشرف)</span>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono">
            {formatSAR(
              sponsorCardGroups.reduce((acc, curr) => acc + curr.settlementCustody, 0),
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">مخصصة لصرف تصفيات المناديب</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
          <span className="text-xs font-medium text-muted-foreground block">عهدة الرسوم المحصلة</span>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono">
            {formatSAR(
              sponsorCardGroups.reduce((acc, curr) => acc + curr.feeCustody, 0),
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">أمانة حتى تسليمها للمحاسب</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
          <span className="text-xs font-medium text-muted-foreground block">بترو آب والبنك</span>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono">
            {formatSAR(
              sponsorCardGroups.reduce(
                (acc, curr) => acc + curr.bankBalance + curr.petroAppClearing,
                0,
              ),
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">أرصدة الوقود والمقاصة الإلكترونية</p>
        </div>
      </div>



      {/* Sponsor-by-Sponsor Balances Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <h2 className="text-xs font-bold text-foreground">الأرصدة الفعلية حسب الكفيل المالي</h2>
          <span className="text-[11px] text-muted-foreground font-mono">
            {sponsorCardGroups.length} كفيل
          </span>
        </div>

        {sponsorCardGroups.length === 0 && !loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            لا توجد أرصدة مسجلة حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="py-2.5 px-3.5">الكفيل المالي</th>
                  <th className="py-2.5 px-3 text-left">عهدة تصفيات</th>
                  <th className="py-2.5 px-3 text-left">عهدة رسوم</th>
                  <th className="py-2.5 px-3 text-left">صندوق المركز</th>
                  <th className="py-2.5 px-3 text-left">بترو آب والبنك</th>
                  <th className="py-2.5 px-3.5 text-left font-bold text-foreground">الرصيد الفعلي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sponsorCardGroups.map((group) => (
                  <tr key={group.sponsorId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-foreground">
                      {group.sponsorName}
                      <span className="text-[10px] text-muted-foreground block font-normal">
                        {group.postingCount} حسابات ترحيل
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
                      {formatSAR(group.bankBalance + group.petroAppClearing)}
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

      {/* Treasury Journal Section */}
      <div className="space-y-4 pt-6 border-t border-border/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>دفتر حركات وقيود الخزينة</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              سجل تدقيق مالي دائم وموثق لجميع القيود والتحويلات والتسويات.
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
              <span>تحديث القيود</span>
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm text-xs">
          <div>
            <label className="block font-medium text-muted-foreground mb-1">من تاريخ</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">إلى تاريخ</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">الكفيل</label>
            <SearchableSelect
              value={selectedSponsorId}
              onChange={setSelectedSponsorId}
              options={[
                { value: "", label: "جميع الكفلاء" },
                ...sponsors.map((s) => ({
                  value: s.id,
                  label: getSponsorDisplayName(s),
                })),
              ]}
              placeholder="تصفية حسب الكفيل"
            />
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">الحساب الفرعي</label>
            <SearchableSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              options={[
                { value: "", label: "جميع الحسابات" },
                ...accounts
                  .filter((a) => a.isPosting)
                  .map((a) => ({
                    value: a.id,
                    label: `${a.code} - ${a.nameAr}`,
                  })),
              ]}
              placeholder="تصفية حسب الحساب"
            />
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">غرض الحساب</label>
            <SearchableSelect
              value={selectedPurpose}
              onChange={setSelectedPurpose}
              options={[
                { value: "", label: "جميع الأغراض" },
                { value: "1", label: "تصفيات" },
                { value: "2", label: "رسوم الحساب" },
                { value: "3", label: "مشترك / عام" },
              ]}
              placeholder="الغرض المالي"
            />
          </div>
        </div>

        {/* Table Search */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالمرجع، السبب، اسم المندوب، المنفذ..."
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

        {/* Journal Rows Table */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-3">التاريخ والوقت (الرياض)</th>
                  <th className="py-3 px-3">الحساب</th>
                  <th className="py-3 px-3">الكفيل</th>
                  <th className="py-3 px-3">نوع القيد</th>
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
                        <span>جاري تحميل حركات الدفتر...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!journalLoading && filteredJournalRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground">
                      لا توجد قيود تطابق معايير التصفية المحددة.
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
                            title="عرض تفاصيل القيد"
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
          title="تفاصيل قيد الخزينة"
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
                <span className="text-muted-foreground block">الكفيل المثبت:</span>
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
                <span className="text-muted-foreground block">نوع القيد:</span>
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
