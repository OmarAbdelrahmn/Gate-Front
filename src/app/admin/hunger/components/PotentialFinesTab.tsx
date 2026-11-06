// src/app/admin/hunger/components/PotentialFinesTab.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  getHungerPotentialFines,
  resolveHungerPotentialFine,
  getHungerSettlementDocuments,
  getRiyadhCurrentMonthStartIso,
  getRiyadhTodayIso,
  getHungerErrorMessage,
  type BadgeTone,
  type HungerPotentialFineItem,
  type HungerSettlementDocumentItem,
} from "@/lib/hunger/api";
import { toast } from "@/components/ui/Toast";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Info,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface PotentialFinesTabProps {
  platformId: string;
  canRead: boolean;
  canManageFinance: boolean;
}

function getFineStatusMeta(status?: string | null): {
  labelAr: string;
  tone: BadgeTone;
} {
  const norm = (status || "Potential").trim().toLowerCase();
  if (norm === "invoiced") {
    return { labelAr: "مفوترة (Invoiced)", tone: "blue" };
  }
  if (norm === "waived") {
    return { labelAr: "معفاة (Waived)", tone: "green" };
  }
  return { labelAr: "غرامة محتملة (Potential)", tone: "orange" };
}

export function PotentialFinesTab({
  platformId,
  canRead,
  canManageFinance,
}: PotentialFinesTabProps) {
  const [fromDate, setFromDate] = useState(getRiyadhCurrentMonthStartIso());
  const [throughDate, setThroughDate] = useState(getRiyadhTodayIso());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [items, setItems] = useState<HungerPotentialFineItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Resolve Modal State
  const [resolveTarget, setResolveTarget] =
    useState<HungerPotentialFineItem | null>(null);
  const [resolveMode, setResolveMode] = useState<"Invoiced" | "Waived">(
    "Invoiced",
  );
  const [invoiceMonth, setInvoiceMonth] = useState(
    getRiyadhCurrentMonthStartIso().slice(0, 7),
  );
  const [invoiceDocuments, setInvoiceDocuments] = useState<
    HungerSettlementDocumentItem[]
  >([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceDocumentId, setInvoiceDocumentId] = useState("");
  const [invoiceSourceKey, setInvoiceSourceKey] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadFines = useCallback(async () => {
    if (!canRead) return;
    if (fromDate > throughDate) {
      toast.error("تاريخ البداية يجب ألا يكون بعد تاريخ النهاية");
      return;
    }
    const diffDays = Math.round(
      (new Date(throughDate).getTime() - new Date(fromDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays > 367) {
      toast.error("نطاق التاريخ لا يمكن أن يتجاوز 367 يومًا");
      return;
    }

    setLoading(true);
    try {
      const res = await getHungerPotentialFines({
        from: fromDate,
        through: throughDate,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر جلب سجل الغرامات المحتملة"),
      );
    } finally {
      setLoading(false);
    }
  }, [canRead, fromDate, throughDate, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadFines();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadFines]);

  const loadInvoiceDocumentsForMonth = useCallback(
    async (monthStr: string) => {
      if (!platformId || !canManageFinance) return;
      setLoadingInvoices(true);
      try {
        const res = await getHungerSettlementDocuments({
          platformId,
          month: monthStr,
          page: 1,
          pageSize: 100,
        });
        const invoicesOnly = res.items.filter(
          (doc) => (doc.kind || "").toLowerCase() === "invoice",
        );
        setInvoiceDocuments(invoicesOnly);
      } catch {
        setInvoiceDocuments([]);
      } finally {
        setLoadingInvoices(false);
      }
    },
    [platformId, canManageFinance],
  );

  const openResolveModal = (
    fine: HungerPotentialFineItem,
    mode: "Invoiced" | "Waived",
  ) => {
    const defaultMonth = (fine.sourceDay || fine.reportDate || throughDate).slice(
      0,
      7,
    );
    setResolveTarget(fine);
    setResolveMode(mode);
    setInvoiceMonth(defaultMonth);
    setInvoiceDocumentId(fine.invoiceDocumentId || "");
    setInvoiceSourceKey(fine.invoiceSourceKey || "");
    setEvidence("");
    if (mode === "Invoiced") {
      void loadInvoiceDocumentsForMonth(defaultMonth);
    }
  };

  const invoiceSelectOptions = useMemo(
    () =>
      invoiceDocuments.map((doc) => ({
        value: doc.id || doc.documentId || "",
        label: `${doc.documentReference} (${doc.month?.slice(0, 7) || invoiceMonth})`,
        sublabel: `المبلغ: ${doc.amount} ر.س`,
      })),
    [invoiceDocuments, invoiceMonth],
  );

  const handleConfirmResolve = async () => {
    if (!resolveTarget) return;
    if (!evidence.trim()) {
      toast.error("مرجع الدليل (evidence) إلزامي");
      return;
    }
    if (resolveMode === "Invoiced") {
      if (!invoiceDocumentId.trim()) {
        toast.error("يرجى اختيار مستند الفاتورة (invoiceDocumentId)");
        return;
      }
      if (!invoiceSourceKey.trim()) {
        toast.error("يرجى إدخال مفتاح المصدر بالفاتورة (invoiceSourceKey)");
        return;
      }
    }

    setSubmitting(true);
    try {
      const fineId = resolveTarget.id || resolveTarget.fineId || "";
      await resolveHungerPotentialFine(fineId, {
        status: resolveMode,
        ...(resolveMode === "Invoiced"
          ? {
              invoiceDocumentId: invoiceDocumentId.trim(),
              invoiceSourceKey: invoiceSourceKey.trim(),
            }
          : {}),
        evidence: evidence.trim(),
        rowVersion: resolveTarget.rowVersion,
      });
      setResolveTarget(null);
      await loadFines();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.error(
          "تغيرت نسخة السجل (409) — تم تحديث البيانات، يرجى المحاولة مرة أخرى.",
        );
        setResolveTarget(null);
        await loadFines();
      } else {
        toast.error(getHungerErrorMessage(err, "تعذر معالجة الغرامة المحتملة"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4">
      {/* Prominent Non-Debt Rule Note */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          لا تُنشئ الغرامة المحتملة دينًا على المندوب ولا قيدًا ماليًا. يتم فتحها
          تلقائيًا عند وجود شفتات غياب (NoShow &gt; 0) في استيراد التشغيل اليومي،
          ويُعبر الرقم عن <u>عدد الشفتات</u> وليس مبلغًا ماليًا.
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <DateInput
                label="من تاريخ (from)"
                value={fromDate}
                onChange={(val) => {
                  setFromDate(val);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-40">
              <DateInput
                label="إلى تاريخ (through)"
                value={throughDate}
                onChange={(val) => {
                  setThroughDate(val);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadFines()}
            loading={loading}
          >
            <RefreshCw className="ml-1.5 h-3.5 w-3.5" />
            تحديث القائمة
          </Button>
        </div>
      </div>

      {/* Fines Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              سجل الغرامات المحتملة من عدم الحضور (NoShow)
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              إجمالي السجلات: {totalCount} سجل
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b-2 border-slate-200 bg-slate-100/95 text-[11px] font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">الحساب</th>
                <th className="px-4 py-3.5 whitespace-nowrap">المندوب</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  يوم المصدر (Source Day)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  عدد شفتات الغياب (NoShow)
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  الدليل ومستند الفاتورة
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  إجراءات المعالجة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-[var(--muted-foreground)]"
                  >
                    جاري تحميل الغرامات المحتملة...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-[var(--muted-foreground)]"
                  >
                    لا توجد غرامات محتملة في النطاق الزمني المحدد
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const shifts = row.noShowShiftsCount ?? row.noShowCount ?? 0;
                  const meta = getFineStatusMeta(row.status);
                  const isPotential =
                    (row.status || "Potential").trim().toLowerCase() ===
                    "potential";
                  return (
                    <tr
                      key={
                        row.id ||
                        row.fineId ||
                        `${row.accountId}-${row.sourceDay}-${idx}`
                      }
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-[var(--foreground)]">
                          {row.externalAccountId ||
                            row.accountCode ||
                            row.accountId}
                        </div>
                        {row.accountName && (
                          <div className="text-[11px] text-[var(--muted-foreground)]">
                            {row.accountName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[var(--foreground)]">
                          {row.riderNameAr || row.riderNameEn || "غير مكلف"}
                        </div>
                        {row.riderIqamaNo && (
                          <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
                            {row.riderIqamaNo}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        {row.sourceDay || row.reportDate || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-0.5">
                          <Badge tone="red">{shifts} شفتات</Badge>
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            عدد شفتات وليس مبلغًا ماليًا
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={meta.tone}>{meta.labelAr}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 text-xs">
                          <div>
                            <span className="text-[var(--muted-foreground)]">
                              الدليل:{" "}
                            </span>
                            <span className="font-mono">
                              {row.evidence || row.evidenceReference || "—"}
                            </span>
                          </div>
                          {row.invoiceSourceKey && (
                            <div className="text-[11px]">
                              <span className="text-[var(--muted-foreground)]">
                                مفتاح الفاتورة:{" "}
                              </span>
                              <span className="font-mono font-semibold">
                                {row.invoiceSourceKey}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {!isPotential ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            تمت المعالجة
                          </span>
                        ) : !canManageFinance ? (
                          <span className="text-[11px] text-[var(--muted-foreground)]">
                            للقراءة فقط
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openResolveModal(row, "Invoiced")}
                            >
                              <FileCheck className="ml-1 h-3.5 w-3.5 text-sky-600" />
                              مفوترة
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openResolveModal(row, "Waived")}
                            >
                              <ShieldCheck className="ml-1 h-3.5 w-3.5 text-emerald-600" />
                              إعفاء
                            </Button>
                          </div>
                        )}
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
              إجمالي السجلات: <strong>{totalCount}</strong>
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

      {/* Resolve Fine Modal (Invoiced / Waived) */}
      <Modal
        isOpen={Boolean(resolveTarget)}
        onClose={() => !submitting && setResolveTarget(null)}
        title={
          resolveMode === "Invoiced"
            ? "تحويل الغرامة المحتملة إلى مفوترة (Invoiced)"
            : "إعفاء من الغرامة المحتملة (Waived)"
        }
      >
        <div className="space-y-4">
          {resolveTarget && (
            <p className="text-xs text-[var(--muted-foreground)]">
              الحساب:{" "}
              <strong>
                {resolveTarget.externalAccountId || resolveTarget.accountId}
              </strong>{" "}
              — يوم المصدر:{" "}
              <strong>
                {resolveTarget.sourceDay || resolveTarget.reportDate}
              </strong>{" "}
              ({resolveTarget.noShowShiftsCount ?? resolveTarget.noShowCount}{" "}
              شفتات)
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              لا تُنشئ الغرامة المحتملة دينًا على المندوب ولا قيدًا ماليًا.
            </span>
          </div>

          {resolveMode === "Invoiced" && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  شهر الفاتورة (للبحث في مستندات التسوية من نوع Invoice)
                </label>
                <input
                  type="month"
                  value={invoiceMonth}
                  onChange={(e) => {
                    const nextMonth = e.target.value;
                    setInvoiceMonth(nextMonth);
                    if (nextMonth) {
                      void loadInvoiceDocumentsForMonth(nextMonth);
                    }
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  مستند الفاتورة الضريبية (invoiceDocumentId) *
                </label>
                <SearchableSelect
                  options={invoiceSelectOptions}
                  value={invoiceDocumentId}
                  onChange={setInvoiceDocumentId}
                  placeholder={
                    loadingInvoices
                      ? "جاري جلب الفواتير..."
                      : "اختر فاتورة من مستندات التسوية..."
                  }
                />
                {invoiceDocuments.length === 0 && !loadingInvoices && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    لا توجد مستندات تسوية من نوع Invoice لهذا الشهر — يمكنك
                    إضافتها من شاشة التسويات المالية أو إدخال UUID المستند
                    مباشرة أدناه.
                  </p>
                )}
              </div>

              <Input
                label="أو إدخال معرف مستند الفاتورة مباشرة (UUID)"
                value={invoiceDocumentId}
                onChange={(e) => setInvoiceDocumentId(e.target.value)}
                placeholder="UUID مستند الفاتورة..."
              />

              <Input
                label="مفتاح المصدر في الفاتورة (invoiceSourceKey) *"
                value={invoiceSourceKey}
                onChange={(e) => setInvoiceSourceKey(e.target.value)}
                placeholder="مثال: سطر الفاتورة أو رقم المرجع داخل الفاتورة..."
              />
            </>
          )}

          <Input
            label="مرجع الدليل / الإثبات (evidence) *"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="رقم المستند أو رابط الإثبات أو سبب الإعفاء الموثق..."
          />

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button
              variant="ghost"
              onClick={() => setResolveTarget(null)}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmResolve}
              loading={submitting}
            >
              {resolveMode === "Invoiced"
                ? "تأكيد الفوترة وربط المستند"
                : "تأكيد الإعفاء"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
