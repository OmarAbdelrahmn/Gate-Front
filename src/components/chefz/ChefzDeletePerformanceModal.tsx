// src/components/chefz/ChefzDeletePerformanceModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  deleteChefzPerformance,
  extractDeletedPerformanceCounts,
  getRiyadhTodayDate,
} from "@/lib/chefz/api";
import type { ChefzDeletePerformanceResponse } from "@/lib/chefz/types";
import {
  AlertTriangle,
  Trash2,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Info,
  Clock,
  RotateCcw,
  Building2,
  Users,
} from "lucide-react";

export interface ChefzDeletePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ChefzDeletePerformanceResponse, deletedDate: string) => void;
  initialDate?: string;
  existingDates?: string[];
  sponsors?: Array<{ id: string; nameAr?: string; nameEn?: string; registryNameAr?: string }>;
}

export function ChefzDeletePerformanceModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  existingDates,
  sponsors = [],
}: ChefzDeletePerformanceModalProps) {
  const todayStr = getRiyadhTodayDate();
  const [reportDate, setReportDate] = useState<string>(initialDate || todayStr);
  const [scopeMode, setScopeMode] = useState<"all" | "sponsor">("all");
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChefzDeletePerformanceResponse | null>(null);

  // Synchronize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReportDate(initialDate || todayStr);
      setScopeMode("all");
      setSelectedSponsorId(sponsors[0]?.id || "");
      setReason("");
      setConfirmed(false);
      setError(null);
      setResult(null);
    }
  }, [isOpen, initialDate, todayStr, sponsors]);

  const hasRecordedData = existingDates && existingDates.includes(reportDate);

  const getSponsorDisplayName = (sponsorId: string): string => {
    const s = sponsors.find((x) => x.id === sponsorId);
    if (!s) return sponsorId;
    return s.registryNameAr || s.nameAr || s.nameEn || sponsorId;
  };

  const isReasonValid = reason.trim().length > 0 && reason.trim().length <= 1000;
  const isSponsorSelectionValid = scopeMode === "all" || Boolean(selectedSponsorId);
  const canSubmit = confirmed && Boolean(reportDate) && isReasonValid && isSponsorSelectionValid && !submitting;

  const handleDelete = async () => {
    if (!canSubmit) return;

    setError(null);
    setSubmitting(true);

    try {
      const sponsorParam = scopeMode === "sponsor" ? selectedSponsorId : null;
      const response = await deleteChefzPerformance(reportDate, reason.trim(), sponsorParam);
      setResult(response);

      const parsed = extractDeletedPerformanceCounts(response, reportDate);
      toast.success(
        "تم حذف تقرير الأداء بنجاح",
        parsed.performanceRowsDeleted > 0
          ? `تم حذف ${parsed.performanceRowsDeleted} صف أداء (${parsed.sourcesDeleted} مصدر) لتاريخ ${reportDate}`
          : `تم حذف تقرير الأداء لتاريخ ${reportDate}`
      );
      onSuccess(response, reportDate);
    } catch (err: any) {
      const message =
        err?.message ||
        "تعذر حذف تقرير الأداء اليومي. يرجى التحقق من الصلاحيات وسلامة التاريخ والسبب.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const parsedCounts = result
    ? extractDeletedPerformanceCounts(result, reportDate)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="حذف تقرير أداء شيفز اليومي لتصحيح التكليفات"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5" dir="rtl">
        {/* If successfully deleted, show the outcome summary */}
        {result && parsedCounts ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold">تم حذف تقرير الأداء بنجاح</h3>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                    تم حذف مصادر الأداء المحددة وتوزيعات المناديب لهذا التاريخ. يمكنك الآن تعديل التكليفات وإعادة رفع ملف الإكسل لاستعادة بيانات الحسابات المفقودة.
                  </p>
                </div>
              </div>
            </div>

            {/* Processed Date Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted)]">التاريخ المحذوف:</div>
                  <div className="mt-1 flex items-center gap-2 font-mono font-bold text-[var(--foreground)] text-base">
                    <Calendar className="h-4 w-4 text-red-500" />
                    <span>{parsedCounts.reportDate}</span>
                  </div>
                </div>
                <Badge tone="green">تم الحذف بنجاح</Badge>
              </div>

              <div className="pt-2 border-t border-[var(--border)] text-xs text-[var(--muted)] flex items-center justify-between">
                <span>نطاق الحذف:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {result.sponsorId ? `كفيل محدد: ${getSponsorDisplayName(result.sponsorId)}` : "جميع حسابات شيفز المصرّح بها"}
                </span>
              </div>
            </div>

            {/* Counts Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center shadow-xs">
                <div className="text-xs text-[var(--muted)]">صفوف الأداء</div>
                <div className="mt-1 text-xl font-extrabold text-[var(--foreground)] font-mono">
                  {parsedCounts.performanceRowsDeleted.toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center shadow-xs">
                <div className="text-xs text-[var(--muted)]">سجلات المصادر</div>
                <div className="mt-1 text-xl font-extrabold text-[var(--foreground)] font-mono">
                  {parsedCounts.sourcesDeleted.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Bottom actions after success */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button onClick={onClose} className="bg-[var(--brand)] text-white">
                إغلاق
              </Button>
            </div>
          </div>
        ) : (
          /* Main Deletion Form */
          <div className="space-y-4">
            {/* High-Trust Permission Header Note */}
            <div className="flex items-center justify-between rounded-xl bg-red-50/80 px-3 py-2 text-xs font-semibold text-red-800 border border-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                إجراء عالي الثقة (High-Trust Action)
              </span>
              <span className="font-mono text-[11px] opacity-80" dir="ltr">
                chefz.performance.delete
              </span>
            </div>

            {/* Warning Message */}
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <div className="space-y-1">
                  <p className="font-bold">تحذير من الحذف النهائي لسجلات الأداء:</p>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    سيؤدي هذا الإجراء إلى حذف مصادر الأداء وتوزيعات المناديب لهذا اليوم لتسهيل تصحيح التكليفات. تسويات المحفظة وصفوف الطلبات المستوردة للتسويات لا تتأثر.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message if any */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Date Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                تاريخ تقرير الأداء المراد حذفه <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => {
                  setReportDate(e.target.value);
                  setError(null);
                }}
                max={todayStr}
                disabled={submitting}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2.5 px-3 text-sm text-[var(--foreground)] outline-none focus:border-red-500 font-mono"
              />

              <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>الصيغة: YYYY-MM-DD</span>
                {hasRecordedData ? (
                  <Badge tone="blue" className="text-[10px]">
                    توجد سجلات أداء مسجلة لهذا التاريخ
                  </Badge>
                ) : (
                  <span className="flex items-center gap-1 text-[var(--muted)]">
                    <Clock className="h-3 w-3" />
                    اليوم الأقصى: {todayStr}
                  </span>
                )}
              </div>
            </div>

            {/* Sponsor Scope Selection */}
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                نطاق الحذف <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScopeMode("all")}
                  disabled={submitting}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-bold transition-all border ${
                    scopeMode === "all"
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>جميع حسابات شيفز</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeMode("sponsor")}
                  disabled={submitting}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-bold transition-all border ${
                    scopeMode === "sponsor"
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>حسابات كفيل محدد</span>
                </button>
              </div>

              {scopeMode === "sponsor" && (
                <div className="mt-2 space-y-1 pt-2 border-t border-[var(--border)]">
                  <label className="block text-[11px] font-semibold text-[var(--foreground)]">
                    اختر الكفيل <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSponsorId}
                    onChange={(e) => setSelectedSponsorId(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 px-3 text-xs text-[var(--foreground)] outline-none focus:border-red-500"
                  >
                    <option value="" disabled>
                      -- اختر الكفيل --
                    </option>
                    {sponsors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.registryNameAr || s.nameAr || s.nameEn || s.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Reason Textarea (Required, max 1,000 chars) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[var(--foreground)]">
                  سبب إجراء التصحيح والحذف <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    reason.length > 1000 ? "text-red-500 font-bold" : "text-[var(--muted)]"
                  }`}
                >
                  {reason.length} / 1000 حرف
                </span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                disabled={submitting}
                rows={2}
                maxLength={1000}
                required
                placeholder="مثال: تصحيح فترة تكليف المندوب وإعادة الاستيراد..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs text-[var(--foreground)] outline-none focus:border-red-500 leading-relaxed"
              />
            </div>

            {/* Confirmation Checkbox */}
            <div className="rounded-xl border border-red-200/80 bg-red-50/40 p-3 dark:border-red-900/40 dark:bg-red-950/20">
              <label className="flex cursor-pointer items-start gap-2.5 text-xs select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={submitting || !reportDate || !isReasonValid || !isSponsorSelectionValid}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-red-600 focus:ring-red-500"
                />
                <span className="font-semibold text-red-900 dark:text-red-200">
                  أؤكد رغبتي في حذف تقرير أداء تاريخ{" "}
                  <span className="font-mono underline font-bold" dir="ltr">
                    {reportDate || "—"}
                  </span>{" "}
                  {scopeMode === "sponsor" && selectedSponsorId ? (
                    <>(لكفيل: {getSponsorDisplayName(selectedSponsorId)})</>
                  ) : (
                    <>(لكافة الحسابات المصرّح بها)</>
                  )}{" "}
                  نهائياً للبدء في إجراءات تصحيح التكليفات.
                </span>
              </label>
            </div>

            {/* Bottom Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
                className="text-xs font-semibold"
              >
                إلغاء
              </Button>

              <Button
                onClick={handleDelete}
                disabled={!canSubmit}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>حذف تقرير الأداء للتصحيح</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
