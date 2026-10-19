// src/app/admin/jahez/treasury/reports/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TreasuryNavHeader } from "@/components/jahez/treasury/TreasuryNavHeader";
import {
  getTreasuryReport,
  exportTreasuryReport,
  getTreasuryAccounts,
  getTreasuryHandovers,
  type TreasuryReport,
  type TreasuryReportType,
  type TreasuryFilter,
  type TreasuryAccount,
  type TreasuryHandover,
  TreasuryHandoverStatus,
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
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import {
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  Building2,
  Layers,
  Fuel,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function TreasuryReportsPage() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canReadReport = can("jahez.financial-reports.read") || isAdmin;
  const canExportReport = can("jahez.financial-reports.export") || isAdmin;

  // Selected Report Type
  const [reportType, setReportType] = useState<TreasuryReportType>("movements");

  // Filters
  const today = useMemo(() => getRiyadhTodayDate(), []);
  const firstOfMonth = useMemo(() => getRiyadhFirstDayOfMonth(), []);
  const [fromDate, setFromDate] = useState<string>(firstOfMonth);
  const [toDate, setToDate] = useState<string>(today);
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedHandoverId, setSelectedHandoverId] = useState<string>("");

  // Data states
  const [reportData, setReportData] = useState<TreasuryReport | null>(null);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [handovers, setHandovers] = useState<TreasuryHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"xlsx" | "pdf" | null>(null);

  // Pagination for movements inside report
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Load Lookup Data (Accounts, Sponsors, Confirmed Handovers)
  const loadLookups = useCallback(async () => {
    try {
      const [accs, sps, hds] = await Promise.all([
        getTreasuryAccounts().catch(() => [] as TreasuryAccount[]),
        listSponsors().catch(() => [] as Sponsor[]),
        getTreasuryHandovers(1, 100).catch(() => ({ items: [] })),
      ]);
      setAccounts(accs);
      setSponsors(sps);
      setHandovers((hds?.items || []).filter((h) => h.status === TreasuryHandoverStatus.Confirmed));
    } catch {
      // non-blocking
    }
  }, []);

  const reportRequest = useRef(0);

  // Load Report Data
  const loadReport = useCallback(async () => {
    if (!canReadReport) return;
    const requestId = ++reportRequest.current;
    setReportError(null);
    if (reportType === "handover" && !selectedHandoverId) {
      setReportData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const filter: TreasuryFilter = {
        fromDate,
        toDate,
        page,
        pageSize,
      };
      if (selectedSponsorId && reportType !== "trading") {
        filter.sponsorId = selectedSponsorId;
      }
      if (selectedAccountId) {
        filter.subAccountId = selectedAccountId;
      }

      const res = await getTreasuryReport(reportType, filter, selectedHandoverId);
      if (requestId === reportRequest.current) setReportData(res);
    } catch (err: any) {
      if (requestId !== reportRequest.current) return;
      setReportError(err.message || "تعذر تحميل التقرير. حاول مرة أخرى.");
      toast.error(err.message || "تعذر جلب التقرير المالي");
      setReportData(null);
    } finally {
      if (requestId === reportRequest.current) setLoading(false);
    }
  }, [canReadReport, reportType, fromDate, toDate, page, pageSize, selectedSponsorId, selectedAccountId, selectedHandoverId]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Handle Export from Server (xlsx or pdf)
  const handleExport = async (format: "xlsx" | "pdf") => {
    if (!canExportReport) {
      toast.error("لا تملك صلاحية تصدير التقارير المالية (jahez.financial-reports.export)");
      return;
    }
    if (reportType === "handover" && !selectedHandoverId) {
      toast.error("يرجى اختيار محضر تسليم معتمد أولاً");
      return;
    }

    setExportingFormat(format);
    try {
      const filter: TreasuryFilter = {
        fromDate,
        toDate,
      };
      if (selectedSponsorId && reportType !== "trading") {
        filter.sponsorId = selectedSponsorId;
      }
      if (selectedAccountId) {
        filter.subAccountId = selectedAccountId;
      }

      toast.info(`جاري إعداد وتحميل ملف ${format.toUpperCase()} من الخادم...`);
      const { blob, fileName } = await exportTreasuryReport(
        reportType,
        format,
        filter,
        selectedHandoverId || undefined,
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || `jahez-${reportType}-${fromDate}-${toDate}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`تم تصدير تقرير ${format.toUpperCase()} بنجاح`);
    } catch (err: any) {
      toast.error(err.message || "فشل تصدير التقرير من الخادم (تأكد من عدم تجاوز حد 10,000 قيد)");
    } finally {
      setExportingFormat(null);
    }
  };

  const reportTabs = [
    { type: "movements" as const, label: "حركة الخزائن", icon: FileSpreadsheet },
    { type: "subaccounts" as const, label: "أرصدة الحسابات", icon: Layers },
    { type: "trading" as const, label: "كشف شركة التجارية", icon: Building2 },
    { type: "petroapp" as const, label: "تقرير بترو آب", icon: Fuel },
    { type: "handover" as const, label: "محضر التسليم المعتمد", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <TreasuryNavHeader
        title="تقارير الخزينة"
        description="اختر التقرير والفترة والشركة، ثم اعرض النتائج أو نزّلها بصيغة Excel أو PDF."
        onRefresh={loadReport}
        isRefreshing={loading}
        extraActions={
          canExportReport && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport("xlsx")}
                disabled={Boolean(exportingFormat) || loading}
                className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
              >
                <FileDown className="h-4 w-4" />
                <span>{exportingFormat === "xlsx" ? "جاري التجهيز..." : "تنزيل Excel"}</span>
              </Button>

              <Button
                size="sm"
                onClick={() => handleExport("pdf")}
                disabled={Boolean(exportingFormat) || loading}
                className="gap-1.5 font-semibold"
              >
                <Printer className="h-4 w-4" />
                <span>{exportingFormat === "pdf" ? "جاري التجهيز..." : "طباعة / PDF"}</span>
              </Button>
            </div>
          )
        }
      />

      {/* Report Types Tabs */}
      <div className="flex border-b border-border/80 gap-3 text-xs overflow-x-auto pb-1 scrollbar-none">
        {reportTabs.map((tab) => {
          const isActive = reportType === tab.type;
          const Icon = tab.icon;
          return (
            <button
              key={tab.type}
              onClick={() => {
                setReportType(tab.type);
                setPage(1);
              }}
              className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-border bg-card p-3.5 text-xs">
        <div>
          <label className="block font-medium text-muted-foreground mb-1">من تاريخ *</label>
          <Input
            type="date"
            required
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div>
          <label className="block font-medium text-muted-foreground mb-1">إلى تاريخ *</label>
          <Input
            type="date"
            required
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        {reportType === "trading" ? (
          <div>
            <label className="block font-medium text-muted-foreground mb-1">الكفيل التجاري</label>
            <div className="h-9 rounded-md border border-border bg-muted/40 px-3 flex items-center font-bold text-foreground">
              مؤسسة التجارية (7038745530)
            </div>
          </div>
        ) : reportType === "handover" ? (
          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              محضر التسليم المعتمد *
            </label>
            <SearchableSelect
              value={selectedHandoverId}
              onChange={setSelectedHandoverId}
              options={handovers.map((h) => ({
                value: h.id,
                label: `${h.documentNumber || "محضر"} - ${h.businessDate} [${formatSAR(h.cashboxAmount)}]`,
              }))}
              placeholder="اختر محضر تسليم معتمد"
            />
          </div>
        ) : (
          <div>
            <label className="block font-medium text-muted-foreground mb-1">الشركة (كفيل الحساب)</label>
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
              placeholder="تصفية بالكفيل"
            />
          </div>
        )}

        <div className="flex items-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadReport}
            disabled={loading}
            className="w-full h-9 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>عرض التقرير</span>
          </Button>
        </div>
      </div>

      {/* Report Content View */}
      <div className="space-y-6">
        {reportError && <div className="treasury-info" role="alert"><p>{reportError}</p><Button variant="secondary" size="sm" onClick={loadReport}>إعادة المحاولة</Button></div>}
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm">جاري احتساب وتوليد التقرير المالي...</p>
          </div>
        )}

        {!loading && !reportError && !reportData && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            {reportType === "handover" && !selectedHandoverId ? (
              <p>يرجى اختيار محضر تسليم معتمد من القائمة أعلاه لعرض بياناته.</p>
            ) : (
              <p>لا توجد بيانات مطابقة لمعايير التقرير.</p>
            )}
          </div>
        )}

        {/* 1. Accounts Summary Table (for Movements, Subaccounts, Trading) */}
        {!loading && reportType !== "petroapp" && reportData && reportData.accounts && reportData.accounts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>ملخص الأرصدة خلال الفترة</span>
              </h3>
            </div>

            <p className="text-sm text-muted-foreground">الحساب الرئيسي يجمع الحسابات التابعة له؛ لا تجمع رصيده معها مرة أخرى.</p>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">اسم الحساب</th>
                      <th className="py-3 px-3">رصيد أول المدة</th>
                      <th className="py-3 px-3">المقبوضات</th>
                      <th className="py-3 px-3">المدفوعات</th>
                      <th className="py-3 px-3">تحويل وارد</th>
                      <th className="py-3 px-3">تحويل صادر</th>
                      <th className="py-3 px-4">رصيد آخر المدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {reportData.accounts.map((acc) => (
                      <tr
                        key={acc.subAccountId}
                        className={`hover:bg-muted/40 transition-colors ${
                          !acc.isPosting ? "bg-muted/30 font-bold" : ""
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <span className={!acc.isPosting ? "text-foreground font-bold" : "text-foreground font-medium"}>
                            {acc.nameAr}
                          </span>
                          {!acc.isPosting && <span className="treasury-count ms-2">إجمالي مجموعة</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">
                          {formatSAR(acc.opening)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground">
                          {acc.receipts ? formatSAR(acc.receipts) : <span className="text-muted-foreground/40 font-mono">—</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground">
                          {acc.payments ? formatSAR(acc.payments) : <span className="text-muted-foreground/40 font-mono">—</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground">
                          {acc.transfersIn ? formatSAR(acc.transfersIn) : <span className="text-muted-foreground/40 font-mono">—</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground">
                          {acc.transfersOut ? formatSAR(acc.transfersOut) : <span className="text-muted-foreground/40 font-mono">—</span>}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                          {formatSAR(acc.closing)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. Movements Details Table (for Movements & Trading) */}
        {!loading && reportData && reportData.movements && reportData.movements.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span>تفاصيل القيود المسجلة (إجمالي القيود: {reportData.totalMovements})</span>
              </h3>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
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
                  disabled={reportData.movements.length < pageSize}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1 text-xs"
                >
                  <span>التالي</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-3">وقت الرياض</th>
                      <th className="py-3 px-3">الحساب</th>
                      <th className="py-3 px-3">الكفيل</th>
                      <th className="py-3 px-3">نوع القيد</th>
                      <th className="py-3 px-3">المبلغ</th>
                      <th className="py-3 px-3">المرجع</th>
                      <th className="py-3 px-3">المندوب</th>
                      <th className="py-3 px-3">المنفذ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {reportData.movements.map((m) => (
                      <tr key={m.posting.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                          {formatRiyadhDateTime(m.posting.occurredAtUtc)}
                        </td>
                        <td className="py-2.5 px-3 font-medium">{m.accountNameAr}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{m.sponsorNameAr || "—"}</td>
                        <td className="py-2.5 px-3">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px]">
                            {getTreasuryEntryKindLabel(m.posting.kind)}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-3 font-bold font-mono ${
                            m.posting.amount >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatSAR(m.posting.amount)}
                        </td>
                        <td className="py-2.5 px-3 max-w-[180px] truncate" title={m.posting.reference}>
                          {m.posting.reference || "—"}
                        </td>
                        <td className="py-2.5 px-3">{displayPersonName(m.driverNameAr, "driver")}</td>
                        <td className="py-2.5 px-3">{displayPersonName(m.posting.actorNameAr, "user")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. Handover Report View */}
        {!loading && reportType === "petroapp" && reportData && (
          <section className="rounded-xl border border-border bg-card overflow-hidden" aria-label="تقرير بترو آب">
            <div className="treasury-section-heading"><div><h2>التحصيل والشحن ورصيد المحفظة</h2><p>القيمة غير المثبتة تظهر «غير متحقق» حتى يتوفر إثباتها.</p></div></div>
            <div className="overflow-x-auto"><table className="w-full text-right"><thead><tr>
              {["الشركة", "المبالغ المحصلة", "شحن المحفظة", "المخصص من التحصيل", "التحصيل غير المخصص", "فرق الشحن", "رصيد أول الفترة", "رصيد آخر الفترة", "استهلاك الوقود", "الحالة"].map(label => <th key={label} scope="col">{label}</th>)}
            </tr></thead><tbody className="divide-y divide-border">
              {reportData.fuel.map(row => <tr key={row.sponsorId}>
                <th scope="row">{row.sponsorNameAr}</th>
                {[row.collections, row.funding, row.allocatedCollections, row.unallocatedCollections, row.fundingDifference, row.openingStatement, row.closingStatement, row.importedConsumption].map((amount, index) => <td key={index} className="whitespace-nowrap">{amount == null ? "غير متحقق" : formatSAR(amount)}</td>)}
                <td><Badge tone={row.status === "Matched" ? "green" : "orange"}>{row.status === "Matched" ? "متطابق" : row.status === "Difference" ? "يوجد فرق" : "غير متحقق"}</Badge></td>
              </tr>)}
              {reportData.fuel.length === 0 && <tr><td colSpan={10} className="treasury-empty">لا توجد بيانات بترو آب ضمن الفترة المختارة.</td></tr>}
            </tbody></table></div>
          </section>
        )}

        {!loading && reportType === "handover" && reportData?.handover && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-xs font-semibold text-primary">محضر تسليم معتمد</span>
                <h3 className="text-xl font-bold font-mono text-foreground">
                  {reportData.handover.handover.documentNumber}
                </h3>
                <p className="text-xs text-muted-foreground">
                  تاريخ العمل المحاسبي: {reportData.handover.handover.businessDate}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground block">إجمالي النقدية المستلمة</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatSAR(reportData.handover.handover.cashboxAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">المشرف المسلّم:</span>
                <span className="font-semibold text-foreground">
                  {displayPersonName(reportData.handover.handover.requestedByNameAr, "user")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">المحاسب المعتمد:</span>
                <span className="font-semibold text-foreground">
                  {displayPersonName(reportData.handover.handover.accountantNameAr, "user")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">وقت الاعتماد:</span>
                <span className="font-mono">
                  {formatRiyadhDateTime(reportData.handover.handover.confirmedAtUtc)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">عدد الحركات:</span>
                <span className="font-bold font-mono">
                  {reportData.handover.handover.movementCount} حركة
                </span>
              </div>
            </div>

            {/* Lines Breakdown */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-xs text-foreground">تفصيل سطور العهدة المسلّمة:</h4>
              <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border/60 text-xs">
                {reportData.handover.lines.map((l) => (
                  <div key={l.id} className="flex justify-between items-center p-3">
                    <div>
                      <span className="font-semibold text-foreground">{l.accountNameAr}</span>
                      <span className="text-muted-foreground block text-[11px]">
                        كفيل: {l.sponsorNameAr || "عام"} • {l.movementCount} حركة
                      </span>
                    </div>
                    <span className="font-bold text-primary">{formatSAR(l.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
