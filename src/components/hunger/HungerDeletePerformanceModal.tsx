// src/components/hunger/HungerDeletePerformanceModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  deleteHungerPerformance,
  getRiyadhTodayIso,
  type HungerDeletePerformanceResponse,
} from "@/lib/hunger/api";
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
  FileCheck2,
  ArrowRight,
} from "lucide-react";

export interface HungerDeletePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: HungerDeletePerformanceResponse, deletedDate: string) => void;
  initialDate?: string;
  existingDates?: string[];
  sponsors?: Array<{ id: string; nameAr?: string; nameEn?: string; registryNameAr?: string }>;
}

export function HungerDeletePerformanceModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  existingDates,
  sponsors = [],
}: HungerDeletePerformanceModalProps) {
  const todayStr = getRiyadhTodayIso();
  const [reportDate, setReportDate] = useState<string>(initialDate || todayStr);
  const [scopeMode, setScopeMode] = useState<"all" | "sponsor">("all");
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HungerDeletePerformanceResponse | null>(null);

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
      const response = await deleteHungerPerformance(reportDate, reason.trim(), sponsorParam);
      setResult(response);

      const totalDeleted = response.performanceRowsDeleted ?? 0;
      toast.success(
        "تم تنفيذ عملية حذف تشغيل هنقرستيشن بنجاح",
        totalDeleted > 0
          ? `تم حذف ${totalDeleted} صف تشغيل (${response.potentialFinesDeleted ?? 0} غرامة محتملة) لتاريخ ${reportDate}`
          : `تم تنفيذ العملية بنجاح لتاريخ ${reportDate} (لا توجد سجلات مطابقة متبقية)`
      );
      onSuccess(response, reportDate);
    } catch (err: any) {
      const message =
        err?.message ||
        "تعذر حذف تشغيل هنقرستيشن اليومي. يرجى التحقق من صلاحية hunger.performance.delete وصحة البيانات وعدم وجود غرامات تمت مراجعتها.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="حذف تشغيل هنقرستيشن اليومي لتصحيح التكليفات"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5" dir="rtl">
        {/* Success View */}
        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold">تم حذف سجلات التشغيل اليومي بنجاح</h3>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    تم حذف عمليات التشغيل اليومية وتوزيعاتها والغرامات المحتملة غير المحسومة بنجاح، مع أرشفة السجلات الأصلية وتدوين سبب الحذف في سجل التدقيق.
                  </p>
                </div>
              </div>
            </div>

            {/* Scope & Date Meta Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted)]">التاريخ المنفذ:</div>
                  <div className="mt-1 flex items-center gap-2 font-mono font-bold text-[var(--foreground)] text-base">
                    <Calendar className="h-4 w-4 text-red-500" />
                    <span>{result.reportDate}</span>
                  </div>
                </div>
                <Badge tone="green">تمت المعاملة بنجاح</Badge>
              </div>

              <div className="pt-2 border-t border-[var(--border)] text-xs text-[var(--muted)] flex items-center justify-between">
                <span>نطاق الحذف:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {result.sponsorId ? `كفيل محدد: ${getSponsorDisplayName(result.sponsorId)}` : "جميع حسابات هنقرستيشن المصرّح بها"}
                </span>
              </div>
            </div>

            {/* Counts Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-center shadow-xs">
                <div className="text-xs text-[var(--muted)]">صفوف التشغيل اليومي المحذوفة</div>
                <div className="mt-1 text-2xl font-extrabold text-[var(--foreground)] font-mono">
                  {(result.performanceRowsDeleted ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-center shadow-xs">
                <div className="text-xs text-[var(--muted)]">الغرامات المحتملة المحذوفة</div>
                <div className="mt-1 text-2xl font-extrabold text-[var(--foreground)] font-mono">
                  {(result.potentialFinesDeleted ?? 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Correction Workflow Next Steps Guide */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span>الخطوات التالية لتصحيح التكليف واستعادة التشغيل:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800 dark:text-blue-300 pr-1 leading-relaxed">
                <li>قم بتصحيح فترات تكليف المناديب وحل أي تعارضات سابقة لهذا التاريخ.</li>
                <li>أنشئ <strong>معاينة استيراد جديدة (New Preview)</strong> من نفس ملف التشغيل الأصلي وقم بتأكيدها.</li>
                <li>المعاينة الجديدة تتخطى الصفوف السليمة القائمة وتعيد بناء الصفوف المحذوفة وفق التكليفات الحالية للمناديب.</li>
              </ol>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex items-center justify-end border-t border-[var(--border)] pt-4">
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
                صلاحية حساسة عالية الثقة (High-Trust)
              </span>
              <span className="font-mono text-[11px] opacity-80" dir="ltr">
                hunger.performance.delete
              </span>
            </div>

            {/* Scope / Clarification Notice */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <p className="font-bold text-xs">تنبيه نطاق الحذف والضوابط المالية:</p>
                  <p>
                    • سيتم الحذف اللين (Soft-Delete) لعمليات التشغيل وتوزيعاتها والغرامات المحتملة غير المحسومة لهذا اليوم.
                  </p>
                  <p>
                    • في حال كانت هناك غرامة تمت مراجعتها أو إسقاطها أو فوترتها، سيتم رفض الحذف (409 Conflict) لحماية السجلات المالية حتى تصحيح المراجعة.
                  </p>
                  <p>
                    • لقطات الجودة التراكمية، ومراجعات الجودة، والفواتير، وسجلات المحفظة تظل محفوظة ولا تتأثر بحذف تشغيل اليوم.
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
                تاريخ التشغيل المراد حذفه <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => {
                  setReportDate(e.target.value);
                  setError(null);
                }}
                max={todayStr}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--foreground)] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>تاريخ التقرير بصيغة YYYY-MM-DD (لا يتجاوز اليوم بتوقيت الرياض).</span>
                {hasRecordedData && (
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    يوجد بيانات مسجلة لهذا التاريخ
                  </span>
                )}
              </div>
            </div>

            {/* Scope Selection: All Accounts vs Specific Sponsor */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                نطاق الحسابات المستهدفة <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScopeMode("all");
                    setError(null);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-right text-xs transition-colors ${
                    scopeMode === "all"
                      ? "border-red-500 bg-red-50/40 font-bold text-red-900 dark:bg-red-950/30 dark:text-red-200"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-gray-400"
                  }`}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-bold">جميع الحسابات المصرّح بها</div>
                    <div className="text-[10px] opacity-75 font-normal">
                      يشمل الحسابات بدون كفيل والمؤرشفة
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScopeMode("sponsor");
                    if (!selectedSponsorId && sponsors.length > 0) {
                      setSelectedSponsorId(sponsors[0].id);
                    }
                    setError(null);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-right text-xs transition-colors ${
                    scopeMode === "sponsor"
                      ? "border-red-500 bg-red-50/40 font-bold text-red-900 dark:bg-red-950/30 dark:text-red-200"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-gray-400"
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-bold">كفيل محدد فقط</div>
                    <div className="text-[10px] opacity-75 font-normal">
                      حسب SponsorId المرتبط بالحساب
                    </div>
                  </div>
                </button>
              </div>

              {scopeMode === "sponsor" && (
                <div className="mt-2 space-y-1">
                  <select
                    value={selectedSponsorId}
                    onChange={(e) => {
                      setSelectedSponsorId(e.target.value);
                      setError(null);
                    }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-red-500"
                  >
                    <option value="" disabled>
                      اختر الكفيل المستهدف...
                    </option>
                    {sponsors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.registryNameAr || s.nameAr || s.nameEn || s.id}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--muted)]">
                    تتم التصفية استناداً إلى SponsorId الحالي للحساب، وليس كفيل المندوب.
                  </p>
                </div>
              )}
            </div>

            {/* Reason Textarea (Required, <= 1000 chars) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-[var(--foreground)]">
                  سبب الحذف والتصحيح <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    reason.length > 1000 ? "font-bold text-red-600" : "text-[var(--muted)]"
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
                rows={3}
                placeholder="مثال: تصحيح فترة تكليف مناديب لهذا اليوم وإعادة رفع الملف الأصلي..."
                maxLength={1000}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              {reason.trim().length === 0 && (
                <p className="text-[10px] text-[var(--muted)]">
                  السبب إلزامي لتوثيق سجل التدقيق (Audit Entry) للعملية.
                </p>
              )}
            </div>

            {/* Safety Confirmation Checkbox */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="font-semibold text-red-900 dark:text-red-200 leading-relaxed">
                  أؤكد رغبتي في حذف تشغيل هنقرستيشن لهذا اليوم والغرامات المحتملة غير المحسومة التابعة له، وأعلم أنه يلزم إنشاء معاينة استيراد جديدة لإعادة بناء البيانات بعد تصحيح التكليفات.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={!canSubmit}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <Trash2 className="h-4 w-4" />
                {submitting ? "جارٍ الحذف..." : "تأكيد حذف تشغيل اليوم"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
