// src/components/chefz/ChefzDeleteSettlementsModal.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  deleteChefzSettlements,
  extractDeletedSettlementsCounts,
} from "@/lib/chefz/api";
import type { ChefzDeleteSettlementsResponse } from "@/lib/chefz/types";
import {
  AlertTriangle,
  Trash2,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  ShieldAlert,
  Info,
  Clock,
  Layers,
  FileText,
  RotateCcw,
} from "lucide-react";

interface ChefzDeleteSettlementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ChefzDeleteSettlementsResponse) => void;
  onNavigateToBulkOrders?: () => void;
  initialYear?: number;
  initialMonth?: number;
  initialHalf?: 1 | 2;
}

const MONTHS = [
  { value: 1, labelAr: "01 - يناير", labelEn: "January" },
  { value: 2, labelAr: "02 - فبراير", labelEn: "February" },
  { value: 3, labelAr: "03 - مارس", labelEn: "March" },
  { value: 4, labelAr: "04 - أبريل", labelEn: "April" },
  { value: 5, labelAr: "05 - مايو", labelEn: "May" },
  { value: 6, labelAr: "06 - يونيو", labelEn: "June" },
  { value: 7, labelAr: "07 - يوليو", labelEn: "July" },
  { value: 8, labelAr: "08 - أغسطس", labelEn: "August" },
  { value: 9, labelAr: "09 - سبتمبر", labelEn: "September" },
  { value: 10, labelAr: "10 - أكتوبر", labelEn: "October" },
  { value: 11, labelAr: "11 - نوفمبر", labelEn: "November" },
  { value: 12, labelAr: "12 - ديسمبر", labelEn: "December" },
];

export function ChefzDeleteSettlementsModal({
  isOpen,
  onClose,
  onSuccess,
  onNavigateToBulkOrders,
  initialYear,
  initialMonth,
  initialHalf,
}: ChefzDeleteSettlementsModalProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState<number>(initialYear || currentYear);
  const [month, setMonth] = useState<number>(initialMonth || currentMonth);
  const [half, setHalf] = useState<1 | 2>(initialHalf || 1);

  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConflict409, setIsConflict409] = useState(false);
  const [result, setResult] = useState<ChefzDeleteSettlementsResponse | null>(null);

  // Synchronize initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialYear) setYear(initialYear);
      if (initialMonth) setMonth(initialMonth);
      if (initialHalf) setHalf(initialHalf);
      setConfirmed(false);
      setError(null);
      setIsConflict409(false);
      setResult(null);
    }
  }, [isOpen, initialYear, initialMonth, initialHalf]);

  // Compute available years (from 2024 to currentYear + 1)
  const availableYears = useMemo(() => {
    const list: number[] = [];
    const base = Math.max(currentYear + 1, 2027);
    for (let y = base; y >= 2024; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Exact dates calculation for the selected period
  const periodInfo = useMemo(() => {
    const mm = String(month).padStart(2, "0");
    const monthObj = MONTHS.find((m) => m.value === month);
    const monthName = monthObj ? monthObj.labelAr.split(" - ")[1] : `شهر ${month}`;

    if (half === 1) {
      const from = `${year}-${mm}-01`;
      const to = `${year}-${mm}-15`;
      return {
        from,
        to,
        label: `1–15 ${monthName} ${year}`,
        halfLabel: "النصف الأول (1 – 15)",
        daysCount: 15,
      };
    } else {
      const lastDay = new Date(year, month, 0).getDate();
      const from = `${year}-${mm}-16`;
      const to = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
      return {
        from,
        to,
        label: `16–${lastDay} ${monthName} ${year}`,
        halfLabel: `النصف الثاني (16 – ${lastDay})`,
        daysCount: lastDay - 16 + 1,
      };
    }
  }, [year, month, half]);

  // Handle deletion execution
  const handleDelete = async () => {
    if (!confirmed) return;

    setError(null);
    setIsConflict409(false);
    setSubmitting(true);

    try {
      const response = await deleteChefzSettlements(year, month, half);
      setResult(response);
      toast.success(
        "تم حذف تصفيات الفترة بنجاح",
        `تمت معالجة الفترة ${response.periodFrom || periodInfo.from} إلى ${
          response.periodTo || periodInfo.to
        }`
      );
      onSuccess(response);
    } catch (err: any) {
      const status = err?.status;
      const isConflict = status === 409 || err?.isMultiPeriodConflict;
      setIsConflict409(Boolean(isConflict));

      const message =
        err?.message ||
        "تعذر حذف تصفيات الفترة. يرجى التحقق من الصلاحيات وسلامة البيانات.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const parsedCounts = useMemo(() => {
    if (!result) return null;
    return extractDeletedSettlementsCounts(result);
  }, [result]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="حذف تصفيات شيفز لنصف شهر"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5" dir="rtl">
        {/* If successfully deleted, show the outcome summary */}
        {result && parsedCounts ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold">تم حذف تصفيات الفترة بنجاح</h3>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                    تم توثيق قيد تدقيق (Audit Entry) على مستوى الفترة باسم المستخدم
                    وتواريخ الفترة والأعداد المحذوفة. يمكنك الآن إعادة رفع الملف
                    الأصلي وحسابه.
                  </p>
                </div>
              </div>
            </div>

            {/* Period Range Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm">
              <div className="text-xs text-[var(--muted)]">الفترة المعالجة:</div>
              <div className="mt-1 flex items-center gap-2 font-mono font-bold text-[var(--foreground)]">
                <Calendar className="h-4 w-4 text-[var(--brand)]" />
                <span>{parsedCounts.periodFrom || periodInfo.from}</span>
                <span className="text-[var(--muted)]">←</span>
                <span>{parsedCounts.periodTo || periodInfo.to}</span>
                <Badge tone="blue" className="mr-auto">
                  {periodInfo.label}
                </Badge>
              </div>
            </div>

            {/* Counts Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center shadow-sm">
                <div className="text-xs text-[var(--muted)]">تصفيات المحفظة</div>
                <div className="mt-1 text-xl font-extrabold text-[var(--foreground)]">
                  {parsedCounts.walletSettlements.toLocaleString("ar-SA-u-nu-latn")}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center shadow-sm">
                <div className="text-xs text-[var(--muted)]">تصفيات الطلبات</div>
                <div className="mt-1 text-xl font-extrabold text-[var(--foreground)]">
                  {parsedCounts.orderSettlements.toLocaleString("ar-SA-u-nu-latn")}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center shadow-sm">
                <div className="text-xs text-[var(--muted)]">صفوف الطلبات</div>
                <div className="mt-1 text-xl font-extrabold text-[var(--foreground)]">
                  {parsedCounts.orderRows.toLocaleString("ar-SA-u-nu-latn")}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center shadow-sm">
                <div className="text-xs text-[var(--muted)]">سجلات الاستيراد</div>
                <div className="mt-1 text-xl font-extrabold text-[var(--foreground)]">
                  {parsedCounts.importRecords.toLocaleString("ar-SA-u-nu-latn")}
                </div>
              </div>
            </div>

            {/* Zero Counts Note if empty period */}
            {parsedCounts.total === 0 &&
              parsedCounts.orderRows === 0 &&
              parsedCounts.importRecords === 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>
                      الفترة كانت فارغة بالفعل، وأرجع الخادم أصفاراً لجميع السجلات
                      دون أي خطأ.
                    </span>
                  </div>
                </div>
              )}

            {/* Bottom actions after success */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              {onNavigateToBulkOrders && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onClose();
                    onNavigateToBulkOrders();
                  }}
                  className="gap-2 border-[var(--brand)] text-[var(--brand)] hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <Upload className="h-4 w-4" />
                  رفع ملف جديد وإعادة الاحتساب
                </Button>
              )}
              <Button onClick={onClose} className="bg-[var(--brand)] text-white">
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          /* Main Deletion Form */
          <div className="space-y-5">
            {/* High-Trust Permission Header Note */}
            <div className="flex items-center justify-between rounded-xl bg-red-50/80 px-3 py-2 text-xs font-semibold text-red-800 border border-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                إجراء عالي الثقة (High-Trust Action)
              </span>
              <span className="font-mono text-[11px] opacity-80">
                chefz.settlements.delete
              </span>
            </div>

            {/* Period Selection Form */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Year Select */}
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
                    السنة (Year)
                  </label>
                  <select
                    value={year}
                    onChange={(e) => {
                      setYear(Number(e.target.value));
                      setError(null);
                    }}
                    disabled={submitting}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Select */}
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
                    الشهر (Month)
                  </label>
                  <select
                    value={month}
                    onChange={(e) => {
                      setMonth(Number(e.target.value));
                      setError(null);
                    }}
                    disabled={submitting}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.labelAr} ({m.labelEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Half Segment Selection */}
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] mb-1.5 block">
                  نصف الشهر (Half-Month Period)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHalf(1);
                      setError(null);
                    }}
                    disabled={submitting}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                      half === 1
                        ? "border-[var(--brand)] bg-blue-50/70 text-[var(--brand)] font-bold shadow-sm dark:bg-blue-950/50 dark:border-blue-700"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="text-xs font-bold">النصف الأول (1)</span>
                    <span className="text-[11px] text-[var(--muted)] mt-0.5">
                      1 – 15 من الشهر
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHalf(2);
                      setError(null);
                    }}
                    disabled={submitting}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                      half === 2
                        ? "border-[var(--brand)] bg-blue-50/70 text-[var(--brand)] font-bold shadow-sm dark:bg-blue-950/50 dark:border-blue-700"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="text-xs font-bold">النصف الثاني (2)</span>
                    <span className="text-[11px] text-[var(--muted)] mt-0.5">
                      16 – نهاية الشهر
                    </span>
                  </button>
                </div>
              </div>

              {/* Exact Dates Preview Display */}
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
                <span className="text-[var(--muted)]">النطاق الزمني المحدد:</span>
                <span className="font-mono font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[var(--brand)]" />
                  {periodInfo.from} إلى {periodInfo.to} ({periodInfo.label})
                </span>
              </div>
            </div>

            {/* Warning Scope Details */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>ما الذي سيتم حذفه نهائياً بهذه العملية؟</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pr-1 text-amber-800 dark:text-amber-300">
                <li>
                  جميع تصفيات المحافظ وتصفيات الطلبات في الفترة المختارة.
                </li>
                <li>
                  صفوف الطلبات المستوردة المقابلة لتلك التصفيات.
                </li>
                <li>
                  سجلات الاستيراد (Import Records) التي تقع تصفياتها بالكامل في
                  هذه الفترة.
                </li>
                <li>
                  يمكن إعادة رفع ملف الإكسل الأصلي للطلبات مجدداً وإعادة الاحتساب
                  بعد الحذف.
                </li>
              </ul>
            </div>

            {/* Conflict Note (409 handling explanation) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                ملاحظة الملفات متعددة الفترات:
              </span>{" "}
              إذا كان الملف المستورد يمتد لأكثر من نصف شهر، فسترفض العملية مع رمز
              تعارض (409) دون حذف أي بيانات، حفاظاً على الفترة الأخرى.
            </div>

            {/* Error Display */}
            {error && (
              <div
                className={`rounded-xl border p-3 text-xs leading-relaxed ${
                  isConflict409
                    ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-200"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    {isConflict409 && (
                      <div className="font-bold text-red-950 dark:text-red-100 mb-1">
                        تعارض في الاستيراد متعدد الفترات (409 Conflict):
                      </div>
                    )}
                    <div>{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface)]">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="select-none leading-relaxed">
                  أقر بأنني أرغب بحذف جميع التصفيات وسجلات الطلبات نهائياً للفترة
                  المحددة ({periodInfo.label})، وأفهم أن هذا الإجراء لا يمكن
                  التراجع عنه.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                إلغاء
              </Button>

              <Button
                onClick={handleDelete}
                disabled={!confirmed || submitting}
                className="gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {submitting ? "جاري حذف التصفيات..." : "تأكيد وحذف تصفيات الفترة"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
