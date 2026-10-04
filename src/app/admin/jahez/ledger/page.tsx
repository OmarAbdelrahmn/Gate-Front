// src/app/admin/jahez/ledger/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { createAdjustment, getJahezHandovers, getJahezLedger } from "@/lib/jahez/api";
import {
  JahezLedgerBucket,
  JahezLedgerKind,
  type JahezHandover,
  type JahezLedgerEntry,
  type LedgerAdjustmentRequest,
} from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  BookOpen,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  ArrowRightLeft,
  RotateCcw,
  FileCode,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default function JahezLedgerPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [entries, setEntries] = useState<JahezLedgerEntry[]>([]);
  const [handovers, setHandovers] = useState<JahezHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [selectedHandoverId, setSelectedHandoverId] = useState("");
  const [riderFilter, setRiderFilter] = useState("");
  const [bucketFilter, setBucketFilter] = useState<number | "">("");
  const [kindFilter, setKindFilter] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjHandoverId, setAdjHandoverId] = useState("");
  const [adjBucket, setAdjBucket] = useState<JahezLedgerBucket>(JahezLedgerBucket.PlatformDebt);
  const [adjAmount, setAdjAmount] = useState<number | "">("");
  const [adjReason, setAdjReason] = useState("تسوية قيد مالي يدوي");
  const [reversesEntryId, setReversesEntryId] = useState<string | null>(null);
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Calculation JSON viewer modal
  const [selectedCalcJson, setSelectedCalcJson] = useState<string | null>(null);

  const loadHandovers = async () => {
    try {
      const res = await getJahezHandovers({ pageSize: 100 });
      setHandovers(res.items || []);
    } catch {
      // Ignored
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await getJahezLedger({
        handoverId: selectedHandoverId || undefined,
        riderId: riderFilter || undefined,
        page,
        pageSize: 50,
      });
      setEntries(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر استعلام السجل المالي";
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
      loadLedger();
    });
  }, [selectedHandoverId, riderFilter, page]);

  const handleOpenNewAdjustment = () => {
    setAdjHandoverId(selectedHandoverId || handovers[0]?.id || "");
    setAdjBucket(JahezLedgerBucket.PlatformDebt);
    setAdjAmount("");
    setAdjReason(isEn ? "Manual financial ledger adjustment" : "تسوية قيد مالي يدوي");
    setReversesEntryId(null);
    setIsAdjustmentModalOpen(true);
  };

  const getHandoverInfo = (e: JahezLedgerEntry) => {
    const h = handovers.find((item) => item.id === e.handoverId);
    const extId = e.account?.externalAccountId || e.externalAccountId || h?.account?.externalAccountId || h?.externalAccountId;
    const code = e.account?.code || h?.account?.code;
    const ownerName = isEn
      ? (e.ownerRiderNameEn || e.ownerRiderNameAr || h?.ownerRiderNameEn || h?.ownerRiderNameAr)
      : (e.ownerRiderNameAr || e.ownerRiderNameEn || h?.ownerRiderNameAr || h?.ownerRiderNameEn);
    const riderName = isEn
      ? (e.actualRiderNameEn || e.actualRiderNameAr || h?.actualRiderNameEn || h?.actualRiderNameAr)
      : (e.actualRiderNameAr || e.actualRiderNameEn || h?.actualRiderNameAr || h?.actualRiderNameEn);
    return { h, extId, code, ownerName, riderName };
  };

  const handleReverseEntry = (entry: JahezLedgerEntry) => {
    if (entry.kind === JahezLedgerKind.Payment) {
      toast.error("تنبيه", "لا يمكن عكس مدفوعات النقد عبر قيود التسوية اليدوية");
      return;
    }
    setAdjHandoverId(entry.handoverId);
    setAdjBucket(entry.bucket);
    setAdjAmount(-entry.amount);
    setAdjReason(isEn ? "Reversal adjustment for original entry" : "قيد تسوية عكسي للقيد الأصلي");
    setReversesEntryId(entry.id);
    setIsAdjustmentModalOpen(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjHandoverId) {
      toast.error("تنبيه", "يرجى اختيار حساب التسليم");
      return;
    }
    if (adjAmount === "" || Number(adjAmount) === 0) {
      toast.error("خطأ", "يجب إدخال مبلغ صحيح (موجب لإضافة ذمة، أو سالب لتخفيض ذمة/رصيد دائن)");
      return;
    }
    if (!adjReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب التسوية");
      return;
    }

    setIsSubmittingAdj(true);
    try {
      const payload: LedgerAdjustmentRequest = {
        handoverId: adjHandoverId,
        bucket: adjBucket,
        amount: Number(adjAmount),
        reason: adjReason.trim(),
        reversesEntryId: reversesEntryId || null,
      };

      await createAdjustment(payload);
      setIsAdjustmentModalOpen(false);
      loadLedger();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تسجيل قيد التسوية";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const bucketLabel = (b: JahezLedgerBucket) => {
    switch (b) {
      case JahezLedgerBucket.AccountFee:
        return (
          <Badge tone="blue">
            {isEn ? "Account Fee" : "رسوم الحساب"}
          </Badge>
        );
      case JahezLedgerBucket.PlatformDebt:
        return (
          <Badge tone="orange">
            {isEn ? "Platform Debt" : "مديونية جاهز"}
          </Badge>
        );
      case JahezLedgerBucket.Commission:
        return (
          <Badge tone="blue">
            {isEn ? "Commission" : "عمولة التشغيل"}
          </Badge>
        );
      default:
        return <Badge tone="gray">{String(b)}</Badge>;
    }
  };

  const kindLabel = (k: JahezLedgerKind) => {
    switch (k) {
      case JahezLedgerKind.Charge:
        return (
          <Badge tone="gray">
            <TrendingUp className="h-3 w-3 mr-1 inline text-red-500" />
            {isEn ? "Charge" : "استحقاق"}
          </Badge>
        );
      case JahezLedgerKind.Payment:
        return (
          <Badge tone="green">
            <TrendingDown className="h-3 w-3 mr-1 inline text-emerald-500" />
            {isEn ? "Payment" : "سداد"}
          </Badge>
        );
      case JahezLedgerKind.Adjustment:
        return (
          <Badge tone="blue">
            <ArrowRightLeft className="h-3 w-3 mr-1 inline text-indigo-500" />
            {isEn ? "Adjustment" : "قيد تسوية"}
          </Badge>
        );
      case JahezLedgerKind.Transfer:
        return (
          <Badge tone="blue">
            {isEn ? "Transfer Marker" : "علامة ترحيل دين"}
          </Badge>
        );
      case JahezLedgerKind.OpeningBalance:
        return (
          <Badge tone="orange">
            {isEn ? "Opening Balance" : "رصيد افتتاحي"}
          </Badge>
        );
      default:
        return <Badge tone="gray">{String(k)}</Badge>;
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (bucketFilter !== "" && e.bucket !== Number(bucketFilter)) return false;
    if (kindFilter !== "" && e.kind !== Number(kindFilter)) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    const info = getHandoverInfo(e);
    const extId = (info.extId || "").toLowerCase();
    const code = (info.code || "").toLowerCase();
    const owner = (info.ownerName || "").toLowerCase();
    const rider = (info.riderName || "").toLowerCase();
    return (
      extId.includes(term) ||
      code.includes(term) ||
      owner.includes(term) ||
      rider.includes(term) ||
      e.id.toLowerCase().includes(term) ||
      e.reason.toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    exportToExcel({
      filename: `jahez_ledger_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: entries,
      columns: [
        { header: isEn ? "Date & Time" : "التاريخ والوقت", accessor: "occurredAtUtc" },
        {
          header: isEn ? "Driver ID" : "رقم الحساب الخارجي",
          accessor: (e) => getHandoverInfo(e).extId || "-",
        },
        {
          header: isEn ? "Account Code" : "رمز الحساب",
          accessor: (e) => getHandoverInfo(e).code || "-",
        },
        {
          header: isEn ? "Owner Name" : "صاحب الحساب",
          accessor: (e) => getHandoverInfo(e).ownerName || "-",
        },
        {
          header: isEn ? "Actual Rider" : "المندوب الفعلي",
          accessor: (e) => getHandoverInfo(e).riderName || "-",
        },
        { header: isEn ? "Bucket" : "السلة المالية", accessor: "bucket" },
        { header: isEn ? "Kind" : "نوع القيد", accessor: "kind" },
        { header: isEn ? "Amount (SAR)" : "المبلغ (ر.س)", accessor: "amount" },
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
            <BookOpen className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            {isEn ? "Jahez Financial Ledger & Adjustments" : "سجل العمليات المالية والتسويات لجاهز"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Immutable audit trail of all fees, imported net debt, daily commissions, collections, and manual signed adjustments."
              : "السجل المالي غير القابل للتعديل لكافة الرسوم والمديونيات المستوردة والعمولات والتحصيلات وقيود التسوية."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadLedger}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isEn ? "Export" : "تصدير"}
          </Button>

          {can("jahez.adjustments.manage") && (
            <Button
              variant="primary"
              onClick={handleOpenNewAdjustment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {isEn ? "New Adjustment Entry" : "قيد تسوية يدوي"}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
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
              { value: "", label: isEn ? "All Accounts" : "جميع الحسابات" },
              ...handovers.map((h) => {
                const accDisplay = h.account?.externalAccountId || h.externalAccountId || h.account?.code || "-";
                const rider = isEn
                  ? (h.actualRiderNameEn || h.actualRiderNameAr || h.ownerRiderNameEn || h.ownerRiderNameAr)
                  : (h.actualRiderNameAr || h.actualRiderNameEn || h.ownerRiderNameAr || h.ownerRiderNameEn);
                return {
                  value: h.id,
                  label: `[${accDisplay}]${rider ? ` - ${rider}` : ""} (${h.commissionStartsOn})`,
                };
              }),
            ]}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Financial Bucket" : "السلة المالية"}
          </label>
          <select
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">{isEn ? "All Buckets" : "جميع السلات"}</option>
            <option value="1">{isEn ? "1 - Account Fees" : "1 - رسوم الحساب"}</option>
            <option value="2">{isEn ? "2 - Platform Debt" : "2 - مديونية جاهز"}</option>
            <option value="3">{isEn ? "3 - Commission" : "3 - عمولة التشغيل"}</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Entry Kind" : "نوع القيد"}
          </label>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">{isEn ? "All Kinds" : "جميع الأنواع"}</option>
            <option value="1">{isEn ? "1 - Charge" : "1 - استحقاق (Charge)"}</option>
            <option value="2">{isEn ? "2 - Payment" : "2 - سداد (Payment)"}</option>
            <option value="3">{isEn ? "3 - Adjustment" : "3 - تسوية (Adjustment)"}</option>
            <option value="4">{isEn ? "4 - Transfer Marker" : "4 - علامة ترحيل (Transfer)"}</option>
            <option value="5">{isEn ? "5 - Opening Balance" : "5 - رصيد افتتاحي"}</option>
          </select>
        </div>

        <div className="relative">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Quick Search" : "بحث سريع"}
          </label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={isEn ? "Search ID or reason..." : "ابحث برقم القيد أو السبب..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Occurred At" : "وقت العملية"}</th>
                <th className="px-4 py-3">{isEn ? "Account (Driver ID)" : "الحساب (Driver ID)"}</th>
                <th className="px-4 py-3">{isEn ? "Bucket" : "السلة"}</th>
                <th className="px-4 py-3">{isEn ? "Kind" : "نوع القيد"}</th>
                <th className="px-4 py-3">{isEn ? "Signed Amount" : "المبلغ (ر.س)"}</th>
                <th className="px-4 py-3">{isEn ? "Period / Source" : "الفترة / المصدر"}</th>
                <th className="px-4 py-3">{isEn ? "Reason" : "السبب والبيان"}</th>
                <th className="px-4 py-3">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    {isEn ? "Loading ledger entries..." : "جارٍ استعلام السجل المالي..."}
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <BookOpen className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No ledger entries found" : "لا توجد قيود مالية مطابقة"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const isPositive = e.amount > 0;
                  const info = getHandoverInfo(e);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {new Date(e.occurredAtUtc).toLocaleString("ar-SA", {
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

                      <td className="px-4 py-3">{bucketLabel(e.bucket)}</td>

                      <td className="px-4 py-3">{kindLabel(e.kind)}</td>

                      <td className="px-4 py-3 font-mono font-bold">
                        <span
                          className={
                            isPositive
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {isPositive ? `+${e.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}` : `${e.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}`}{" "}
                          ر.س
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500">
                        {e.fromDate && e.throughDate ? (
                          <span>
                            {e.fromDate} → {e.throughDate}
                          </span>
                        ) : (
                          <span>
                            {e.kind === JahezLedgerKind.Payment
                              ? (isEn ? "Settlement Payment" : "سداد تسوية")
                              : e.bucket === JahezLedgerBucket.AccountFee
                              ? (isEn ? "Handover Fee" : "رسوم التسليم")
                              : e.kind === JahezLedgerKind.Adjustment
                              ? (isEn ? "Manual Adjustment" : "تسوية يدوية")
                              : e.kind === JahezLedgerKind.OpeningBalance
                              ? (isEn ? "Opening Balance" : "رصيد افتتاحي")
                              : "-"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate" title={e.reason}>
                        {e.reason}
                        {e.reversesEntryId && (
                          <span className="block text-[10px] text-indigo-500 font-medium">
                            {isEn ? "Reversal entry" : "قيد تسوية عكسي"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {e.calculationJson && (
                            <Button
                              variant="secondary"
                              onClick={() => setSelectedCalcJson(e.calculationJson)}
                              className="text-xs py-0.5 px-2 h-8 text-indigo-600 border-indigo-200"
                              title={isEn ? "View calculation evidence" : "عرض دليل الحسبة"}
                            >
                              <FileCode className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {can("jahez.adjustments.manage") &&
                            e.kind !== JahezLedgerKind.Payment && (
                              <Button
                                variant="secondary"
                                onClick={() => handleReverseEntry(e)}
                                className="text-xs py-0.5 px-2 h-8 text-amber-600 border-amber-200 hover:bg-amber-50"
                                title={isEn ? "Create reversal entry" : "إنشاء قيد عكسي"}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
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

      {/* Manual Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title={reversesEntryId ? (isEn ? "Create Reversal Entry" : "تسجيل قيد تسوية عكسي") : (isEn ? "Create Manual Adjustment" : "تسجيل قيد تسوية يدوي")}
      >
        <form onSubmit={handleSubmitAdjustment} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Select Handover Account" : "حساب التسليم"}
            </label>
            <SearchableSelect
              value={adjHandoverId}
              onChange={(val) => setAdjHandoverId(val)}
              options={handovers.map((h) => {
                const accDisplay = h.account?.externalAccountId || h.externalAccountId || h.account?.code || "-";
                const rider = isEn
                  ? (h.actualRiderNameEn || h.actualRiderNameAr || h.ownerRiderNameEn || h.ownerRiderNameAr)
                  : (h.actualRiderNameAr || h.actualRiderNameEn || h.ownerRiderNameAr || h.ownerRiderNameEn);
                return {
                  value: h.id,
                  label: `${isEn ? "Account" : "حساب"} [${accDisplay}]${rider ? ` - ${rider}` : ""} (${h.commissionStartsOn})`,
                };
              })}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Target Bucket" : "السلة المالية المستهدفة"}
            </label>
            <select
              value={adjBucket}
              onChange={(e) => setAdjBucket(Number(e.target.value) as JahezLedgerBucket)}
              disabled={Boolean(reversesEntryId)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value={JahezLedgerBucket.AccountFee}>{isEn ? "1 - Account Fee" : "1 - رسوم الحساب"}</option>
              <option value={JahezLedgerBucket.PlatformDebt}>{isEn ? "2 - Platform Debt" : "2 - مديونية جاهز"}</option>
              <option value={JahezLedgerBucket.Commission}>{isEn ? "3 - Commission" : "3 - عمولة التشغيل"}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex justify-between mb-1">
              <span>{isEn ? "Signed Amount (SAR)" : "مبلغ التسوية بالرمز (ر.س)"}</span>
              <span className="text-[11px] text-gray-400">
                {isEn ? "+ adds receivable, - reduces debt" : "+ إضافة مطالبة، - تخفيض دين/رصيد دائن"}
              </span>
            </label>
            <Input
              type="number"
              step="0.000001"
              placeholder="+50.00 أو -50.00"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value === "" ? "" : Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Reason / Documented Justification" : "السبب والمبرر المالي الموثق"}
            </label>
            <Input
              type="text"
              placeholder={isEn ? "e.g., Manual correction of misassigned debt..." : "مثال: تصحيح تسوية مديونية غير مطابقة..."}
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              required
            />
          </div>

          {reversesEntryId && (
            <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <span className="font-semibold block">ربط القيد العكسي:</span>
              معرف القيد الأصلي المستهدف: {reversesEntryId}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAdjustmentModalOpen(false)}
              disabled={isSubmittingAdj}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingAdj}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmittingAdj ? (isEn ? "Saving..." : "جارٍ التسجيل...") : (isEn ? "Confirm Adjustment" : "تأكيد قيد التسوية")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Calculation JSON Viewer Modal */}
      <Modal
        isOpen={Boolean(selectedCalcJson)}
        onClose={() => setSelectedCalcJson(null)}
        title={isEn ? "Commission Calculation Evidence" : "تفاصيل ودليل احتساب العمولة (Calculation Evidence)"}
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            {isEn
              ? "Raw calculation parameters, policy references, and earnings components used to compute this ledger entry."
              : "البيانات الأصلية وعناصر بيان الأرباح وسياسة العمولة التي تم بناءً عليها تسجيل هذا القيد في السجل."}
          </p>

          <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto max-h-96">
            {selectedCalcJson ? JSON.stringify(JSON.parse(selectedCalcJson), null, 2) : ""}
          </pre>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setSelectedCalcJson(null)}>
              {isEn ? "Close" : "إلغاء"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
