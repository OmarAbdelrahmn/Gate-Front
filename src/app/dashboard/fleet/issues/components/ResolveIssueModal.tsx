"use client";

import { useState, useEffect } from "react";
import {
  resolveVehicleIssue,
  transitionVehicleIssue,
  getVehicleReadiness,
} from "@/lib/fleet/api";
import { formatVehicleIssueCategory } from "@/lib/fleet/formatters";
import {
  VehicleIssueStatus,
  VehicleIssueSeverity,
  type VehicleIssueSummaryResponse,
  type VehicleReadinessResponse,
} from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  Wrench,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Car,
  Calendar,
  ShieldCheck,
  CheckSquare,
  User,
  Tag,
  Clock,
  Sparkles,
  FileCheck2,
  ExternalLink,
} from "lucide-react";

import Link from "next/link";

interface ResolveIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: VehicleIssueSummaryResponse | null;
  vehicleDisplayInfo?: {
    plateDisplay?: string;
    serialDisplay?: string;
  };
  riderNameDisplay?: string;
  riderEmpIdDisplay?: string;
  onSuccess?: () => void;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().replace("T", " ").substring(0, 16);
  } catch {
    return dateStr;
  }
}

export function ResolveIssueModal({
  isOpen,
  onClose,
  issue,
  vehicleDisplayInfo,
  riderNameDisplay,
  riderEmpIdDisplay,
  onSuccess,
}: ResolveIssueModalProps) {
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [closeImmediately, setCloseImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (issue) {
      setResolutionSummary(issue.resolutionSummary || "");
    } else {
      setResolutionSummary("");
    }
  }, [issue, isOpen]);

  if (!isOpen || !issue) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const summary = resolutionSummary.trim();
    if (!summary) {
      toast.error("خطأ في البيانات", "يرجى كتابة ملخص الإجراءات والحل المتخذ لإصلاح العطل.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Resolve issue via API
      const resolvedIssue = await resolveVehicleIssue(issue.id, {
        resolutionSummary: summary,
        rowVersion: issue.rowVersion,
      });

      // 2. Fetch vehicle readiness status
      try {
        const readiness = await getVehicleReadiness(issue.vehicleId);
        if (readiness?.isEligibleForAssignment) {
          toast.success(
            "جاهزية التشغيل",
            "تم حل العطل بنجاح وأصبحت المركبة متاحة وجاهزة للتعيين (Available=1)!"
          );
        } else {
          toast.info(
            "تحديث الحالة",
            "تم تسجيل حل العطل بنجاح، لكن المركبة لا تزال بانتظار استكمال متطلبات التشغيل أو البلاغات الأخرى."
          );
        }
      } catch (readinessErr) {
        console.warn("Readiness check warning:", readinessErr);
      }

      // 3. Close immediately if option checked
      if (closeImmediately) {
        try {
          await transitionVehicleIssue(issue.id, "close", {
            reason: summary,
            rowVersion: resolvedIssue.rowVersion,
          });
        } catch (closeErr: any) {
          console.error("Failed to close issue immediately:", closeErr);
          toast.error("تنبيه الإغلاق", "تم حل العطل لكن تعذر تغيير حالته إلى (مغلق) تلقائياً.");
        }
      }

      toast.success("تم الحل", `تم اعتماد حل البلاغ #${issue.issueNumber} بنجاح.`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to resolve issue:", err);
      const errorCode = err?.details?.errorCode || err?.code;
      if (errorCode === "fleet.concurrency_conflict") {
        toast.error("تعارض بالتزامن", "تم تعديل البلاغ بواسطة مستخدم آخر. يرجى تحديث الصفحة والمحاولة مجدداً.");
      } else {
        toast.error("خطأ في معالجة الطلب", err?.message || "حدث خطأ غير متوقع أثناء حفظ حل البلاغ.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSeverityBadge = (severity: VehicleIssueSeverity) => {
    switch (severity) {
      case VehicleIssueSeverity.Low:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            أهمية: منخفضة
          </span>
        );
      case VehicleIssueSeverity.Medium:
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
            أهمية: متوسطة
          </span>
        );
      case VehicleIssueSeverity.High:
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            أهمية: عالية
          </span>
        );
      case VehicleIssueSeverity.Critical:
        return (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800">
            أهمية: حرجة
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إقفال وحل البلاغ #${issue.issueNumber}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        {/* Header Summary Card */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 p-5 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900/80 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-extrabold text-emerald-800 dark:text-emerald-300 tracking-wide dir-ltr">
                  #{issue.issueNumber}
                </span>
                {renderSeverityBadge(issue.severity)}
                {issue.blocksOperation && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 border border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800">
                    <AlertTriangle className="h-3 w-3" />
                    يعيق التشغيل
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 px-3 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800 w-fit">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>تاريخ البلاغ: {formatDate(issue.reportedAtUtc)}</span>
            </div>
          </div>

          {/* Grid Information */}
          <div className="mt-4 pt-3.5 border-t border-emerald-500/15 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 rounded-xl bg-white/60 dark:bg-slate-900/60 p-2.5 border border-slate-200/50 dark:border-slate-800">
              <Car className="h-4 w-4 text-[#1167c9] shrink-0" />
              <div>
                <span className="text-slate-500 block text-[11px]">المركبة</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {vehicleDisplayInfo?.plateDisplay || `مركبة #${issue.vehicleId.slice(0, 8)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-white/60 dark:bg-slate-900/60 p-2.5 border border-slate-200/50 dark:border-slate-800">
              <User className="h-4 w-4 text-purple-600 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[11px]">السائق المعني</span>
                {riderNameDisplay ? (
                  riderEmpIdDisplay ? (
                    <Link
                      href={`/dashboard/employees/${riderEmpIdDisplay}`}
                      className="font-bold text-[#1167c9] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{riderNameDisplay}</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/employees?search=${encodeURIComponent(riderNameDisplay)}`}
                      className="font-bold text-[#1167c9] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{riderNameDisplay}</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </Link>
                  )
                ) : (
                  <span className="font-bold text-slate-400">غير محدد</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-white/60 dark:bg-slate-900/60 p-2.5 border border-slate-200/50 dark:border-slate-800 sm:col-span-2">
              <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[11px]">التصنيف</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatVehicleIssueCategory(issue.category)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Issue Description Summary */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5 flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-slate-400" />
            <span>تفاصيل العطل المسجل:</span>
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
            {issue.description}
          </p>
        </div>

        {/* Resolution Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                <span>ملخص الإجراءات والحل المتخذ <span className="text-red-500">*</span></span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">مطلوب توثيق الصيانة والقطع</span>
            </label>
            <textarea
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              rows={4}
              required
              placeholder="مثال: تم التوجه لمركز الصيانة، استبدال الإطار الخلفي واختبار سلامة المركبة والتاكد من خلوها من أي أعطال..."
              className="w-full rounded-2xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          {/* Clean Styled Checkbox */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 transition-colors hover:border-emerald-300">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={closeImmediately}
                onChange={(e) => setCloseImmediately(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-emerald-600" />
                  إغلاق البلاغ نهائياً فور التسجيل
                </span>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  تغيير حالة المعاملة إلى (مغلق) تلقائياً وأرشفة البلاغ بعد الحفظ.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Readiness Info Note */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-xs text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>
            عند تقديم وتأكيد الحل، يتم فحص حالة المركبة آلياً وتحويلها إلى (متاحة للتعيين Available=1) فور انتفاء كافة الأعطال المانعة.
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl px-5 py-2.5 text-xs font-bold"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs gap-2 px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جارٍ المعالجة...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>تأكيد واعتماد حل العطل</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
