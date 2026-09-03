"use client";

import { useEffect, useState } from "react";
import {
  getVehicleIssueEvidence,
  downloadVehicleIssueEvidence,
  getVehicleAssignment,
  resolveVehicleIssue,
  transitionVehicleIssue,
  getVehicleReadiness,
} from "@/lib/fleet/api";
import { formatVehicleIssueCategory } from "@/lib/fleet/formatters";
import {
  VehicleIssueStatus,
  VehicleIssueCategory,
  VehicleIssueSeverity,
  type VehicleIssueSummaryResponse,
  type VehicleIssueEvidenceResponse,
  type VehicleReadinessResponse,
} from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  Wrench,
  Download,
  FileText,
  AlertTriangle,
  UserCheck,
  UserX,
  DollarSign,
  Link as LinkIcon,
  Calendar,
  Eye,
  Loader2,
  ExternalLink,
  CheckCircle2,
  CheckSquare,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  issue: VehicleIssueSummaryResponse | null;
  initialResolveMode?: boolean;
  onSuccess?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

export function IssueDetailsModal({ isOpen, onClose, issue, initialResolveMode = false, onSuccess }: Props) {
  const [currentIssue, setCurrentIssue] = useState<VehicleIssueSummaryResponse | null>(issue);
  const [evidenceList, setEvidenceList] = useState<VehicleIssueEvidenceResponse[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Resolve / Close state
  const [resolutionSummaryText, setResolutionSummaryText] = useState("");
  const [closeImmediately, setCloseImmediately] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [readinessStatus, setReadinessStatus] = useState<VehicleReadinessResponse | null>(null);

  // Live File Preview State
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    title: string;
    loading: boolean;
    url: string | null;
    contentType: string | null;
    error: string | null;
    evidenceId: string | null;
  }>({
    isOpen: false,
    title: "",
    loading: false,
    url: null,
    contentType: null,
    error: null,
    evidenceId: null,
  });

  const [linkedRiderName, setLinkedRiderName] = useState<string | null>(null);
  const [linkedRiderEmpId, setLinkedRiderEmpId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIssue(issue);
    setResolutionSummaryText(issue?.resolutionSummary || "");
    setShowResolveForm(!!initialResolveMode);
    setReadinessStatus(null);

    if (isOpen && issue?.id) {
      setLoadingEvidence(true);
      setEvidenceList([]);
      getVehicleIssueEvidence(issue.id)
        .then((res) => setEvidenceList(res || []))
        .catch((err) => {
          console.error("Failed to load issue evidence:", err);
          setEvidenceList([]);
        })
        .finally(() => setLoadingEvidence(false));

      if (issue.relatedAssignmentId) {
        getVehicleAssignment(issue.relatedAssignmentId)
          .then((a) => {
            const name =
              a?.riderName ||
              (a as any)?.actualRiderName ||
              (a as any)?.employeeName ||
              (a as any)?.selectedRiderNameAr ||
              a?.realRider?.name ||
              a?.actualRider?.actualRiderName ||
              a?.actualRider?.selectedRiderNameAr;
            if (name) setLinkedRiderName(name);

            const empId =
              a?.employeeId ||
              a?.realRider?.id ||
              (a as any)?.riderEmployeeId ||
              a?.actualRider?.selectedRiderEmployeeId ||
              a?.riderProfileId;
            if (empId) setLinkedRiderEmpId(empId);
          })
          .catch(() => {
            setLinkedRiderName(null);
            setLinkedRiderEmpId(null);
          });
      } else {
        setLinkedRiderName(null);
        setLinkedRiderEmpId(null);
      }
    }
  }, [isOpen, issue]);

  if (!isOpen || !currentIssue) return null;

  const handleDownload = async (evidenceId: string, fileName: string) => {
    setDownloadingId(evidenceId);
    try {
      const res = await downloadVehicleIssueEvidence(currentIssue.id, evidenceId);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName || fileName || "evidence-file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("نجاح", "تم تنزيل ملف الإثبات بنجاح.");
    } catch (err: any) {
      console.error("Failed to download evidence:", err);
      toast.error("خطأ", err.message || "تعذر تنزيل ملف الإثبات.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (item: VehicleIssueEvidenceResponse) => {
    setPreviewState({
      isOpen: true,
      title: item.originalFileName,
      loading: true,
      url: null,
      contentType: item.contentType,
      error: null,
      evidenceId: item.id,
    });

    try {
      const res = await downloadVehicleIssueEvidence(currentIssue.id, item.id);
      const url = URL.createObjectURL(res.blob);
      setPreviewState({
        isOpen: true,
        title: item.originalFileName,
        loading: false,
        url,
        contentType: item.contentType || res.blob.type,
        error: null,
        evidenceId: item.id,
      });
    } catch (err: any) {
      console.error("Failed to load evidence preview:", err);
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "تعذر تحميل المعاينة المباشرة للملف.",
      }));
    }
  };

  const handleClosePreview = () => {
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }
    setPreviewState({
      isOpen: false,
      title: "",
      loading: false,
      url: null,
      contentType: null,
      error: null,
      evidenceId: null,
    });
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentIssue) return;

    const summary = resolutionSummaryText.trim();
    if (!summary) {
      toast.error("خطأ", "يرجى تقديم ملخص للإغلاق وتفاصيل استبدال/إصلاح العطل.");
      return;
    }

    setIsResolving(true);
    try {
      // 1. Resolve issue (POST /api/vehicle-issues/{issueId}/resolve)
      const resolvedIssue = await resolveVehicleIssue(currentIssue.id, {
        resolutionSummary: summary,
        rowVersion: currentIssue.rowVersion,
      });

      let activeIssue = resolvedIssue;

      // 2. Fetch vehicle readiness (GET /api/vehicles/{vehicleId}/readiness)
      try {
        const readiness = await getVehicleReadiness(currentIssue.vehicleId);
        setReadinessStatus(readiness);
        if (readiness?.isEligibleForAssignment) {
          toast.success("جاهزية التشغيل", "المركبة أصبحت متاحة وتأكّدت جاهزيتها للتعيين بنجاح (Available=1)!");
        } else {
          toast.info(
            "تنبيه التشغيل",
            "تم حل العطل وتغيير حالته إلى (تم الحل)، لكن المركبة لا تزال بانتظار استكمال متطلبات التشغيل أو البلاغات الأخرى."
          );
        }
      } catch (readinessErr) {
        console.warn("Readiness check error:", readinessErr);
      }

      // 3. Optionally close issue (POST /api/vehicle-issues/{issueId}/close)
      if (closeImmediately) {
        try {
          const closedIssue = await transitionVehicleIssue(currentIssue.id, "close", {
            reason: summary,
            rowVersion: resolvedIssue.rowVersion,
          });
          activeIssue = closedIssue;
        } catch (closeErr: any) {
          console.error("Failed to close issue after resolve:", closeErr);
          toast.error("تنبيه الإغلاق", "تم حل العطل بنجاح ولكن تعذر إغلاق البلاغ تلقائياً.");
        }
      }

      setCurrentIssue(activeIssue);
      setShowResolveForm(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to resolve issue:", err);
      const errorCode = err?.details?.errorCode || err?.code;
      if (errorCode === "fleet.concurrency_conflict") {
        toast.error("تعارض بالتزامن", "تم تحديث بيانات البلاغ من مستخدم آخر. يرجى إعادة التحميل.");
      } else {
        toast.error("خطأ", err?.message || "حدث خطأ أثناء حل العطل.");
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleCloseIssueOnly = async () => {
    if (!currentIssue) return;
    setIsResolving(true);
    try {
      const closedIssue = await transitionVehicleIssue(currentIssue.id, "close", {
        reason: currentIssue.resolutionSummary || resolutionSummaryText || "إغلاق البلاغ",
        rowVersion: currentIssue.rowVersion,
      });
      setCurrentIssue(closedIssue);
      toast.success("نجاح", "تم إغلاق البلاغ بنجاح.");
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to close issue:", err);
      toast.error("خطأ", err?.message || "حدث خطأ أثناء إغلاق البلاغ.");
    } finally {
      setIsResolving(false);
    }
  };

  const renderStatus = (status: VehicleIssueStatus) => {
    switch (status) {
      case VehicleIssueStatus.Open:
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">مفتوح</Badge>;
      case VehicleIssueStatus.UnderReview:
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200">قيد المراجعة</Badge>;
      case VehicleIssueStatus.Resolved:
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">تم الحل</Badge>;
      case VehicleIssueStatus.Closed:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">مغلق</Badge>;
      case VehicleIssueStatus.Rejected:
        return <Badge className="bg-red-50 text-red-700 border-red-200">مرفوض</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderSeverity = (severity: VehicleIssueSeverity) => {
    switch (severity) {
      case VehicleIssueSeverity.Low:
        return <span className="text-slate-600 font-medium">منخفض</span>;
      case VehicleIssueSeverity.Medium:
        return <span className="text-blue-600 font-bold">متوسط</span>;
      case VehicleIssueSeverity.High:
        return <span className="text-orange-600 font-bold">عالي</span>;
      case VehicleIssueSeverity.Critical:
        return <span className="text-red-600 font-bold">حرج</span>;
      default:
        return <span>{severity}</span>;
    }
  };

  const isResolvedOrClosed =
    currentIssue.status === VehicleIssueStatus.Resolved ||
    currentIssue.status === VehicleIssueStatus.Closed;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`تفاصيل البلاغ #${currentIssue.issueNumber}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6 pt-2">
          {/* Header Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-[#1167c9]">#{currentIssue.issueNumber}</span>
                {renderStatus(currentIssue.status)}
                {currentIssue.blocksOperation && (
                  <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">يعيق التشغيل</Badge>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>تاريخ البلاغ: {formatDate(currentIssue.reportedAtUtc)}</span>
              </div>
            </div>

            <div className="text-left font-medium text-xs">
              <div>الأهمية: {renderSeverity(currentIssue.severity)}</div>
              <div className="text-slate-500 mt-0.5">
                التصنيف: <span className="font-bold text-slate-800 dark:text-slate-200">{formatVehicleIssueCategory(currentIssue.category)}</span>
              </div>
            </div>
          </div>

          {/* Responsibility and Repair Cost Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Responsibility */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                {currentIssue.isRiderResponsible ? (
                  <UserCheck className="h-4 w-4 text-red-500" />
                ) : (
                  <UserX className="h-4 w-4 text-blue-500" />
                )}
                <span>مسؤولية السائق</span>
              </div>
              {currentIssue.isRiderResponsible !== undefined && currentIssue.isRiderResponsible !== null ? (
                <div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${currentIssue.isRiderResponsible
                        ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300"
                        : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
                      }`}
                  >
                    {currentIssue.isRiderResponsible ? "نعم - السائق مسؤول عن المشكلة" : "لا - عطل طبيعي / ميكانيكي"}
                  </div>
                  {(() => {
                    const resolvedRiderName =
                      currentIssue.rider?.realRider?.name ||
                      currentIssue.rider?.riderName ||
                      (currentIssue as any).riderNameAr ||
                      (currentIssue as any).riderName ||
                      (currentIssue as any).riderFullName ||
                      linkedRiderName;

                    const resolvedEmpId =
                      currentIssue.rider?.realRider?.id ||
                      currentIssue.rider?.employeeId ||
                      (currentIssue as any).employeeId ||
                      (currentIssue as any).riderId ||
                      currentIssue.rider?.riderProfileId ||
                      linkedRiderEmpId;

                    if (!resolvedRiderName) return null;
                    return (
                      <div className="mt-2.5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500 font-medium">السائق:</span>
                        {resolvedEmpId ? (
                          <Link
                            href={`/dashboard/employees/${resolvedEmpId}`}
                            className="inline-flex items-center gap-1.5 font-bold text-[#1167c9] hover:underline bg-blue-50/80 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            <span>{resolvedRiderName}</span>
                            <ExternalLink className="h-3 w-3 text-[#1167c9]" />
                          </Link>
                        ) : (
                          <Link
                            href={`/dashboard/employees?search=${encodeURIComponent(resolvedRiderName)}`}
                            className="inline-flex items-center gap-1.5 font-bold text-[#1167c9] hover:underline bg-blue-50/80 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            <span>{resolvedRiderName}</span>
                            <ExternalLink className="h-3 w-3 text-[#1167c9]" />
                          </Link>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div>
                  <span className="text-sm font-semibold text-slate-400">غير محدد</span>
                  {(() => {
                    const resolvedRiderName =
                      currentIssue.rider?.realRider?.name ||
                      currentIssue.rider?.riderName ||
                      (currentIssue as any).riderNameAr ||
                      (currentIssue as any).riderName ||
                      (currentIssue as any).riderFullName ||
                      linkedRiderName;

                    const resolvedEmpId =
                      currentIssue.rider?.realRider?.id ||
                      currentIssue.rider?.employeeId ||
                      (currentIssue as any).employeeId ||
                      (currentIssue as any).riderId ||
                      currentIssue.rider?.riderProfileId ||
                      linkedRiderEmpId;

                    if (!resolvedRiderName) return null;
                    return (
                      <div className="mt-2.5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-500 font-medium">السائق:</span>
                        {resolvedEmpId ? (
                          <Link
                            href={`/dashboard/employees/${resolvedEmpId}`}
                            className="inline-flex items-center gap-1.5 font-bold text-[#1167c9] hover:underline bg-blue-50/80 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            <span>{resolvedRiderName}</span>
                            <ExternalLink className="h-3 w-3 text-[#1167c9]" />
                          </Link>
                        ) : (
                          <Link
                            href={`/dashboard/employees?search=${encodeURIComponent(resolvedRiderName)}`}
                            className="inline-flex items-center gap-1.5 font-bold text-[#1167c9] hover:underline bg-blue-50/80 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            <span>{resolvedRiderName}</span>
                            <ExternalLink className="h-3 w-3 text-[#1167c9]" />
                          </Link>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Repair Cost */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span>التكلفة التقديرية للإصلاح</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100" dir="ltr">
                {currentIssue.estimatedRepairCost !== undefined && currentIssue.estimatedRepairCost !== null
                  ? `${Number(currentIssue.estimatedRepairCost).toFixed(2)} SAR`
                  : "—"}
              </div>
            </div>
          </div>

          {/* Linked Assignment if present */}
          {currentIssue.relatedAssignmentId && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-[#1167c9] shrink-0" />
                <span className="font-bold">البلاغ مرتبط بتعيين مركبة قائمة</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/fleet/vehicles/${currentIssue.vehicleId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1167c9] px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>عرض ملف المركبة</span>
                </Link>
                <Link
                  href="/dashboard/fleet/assignments"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-[#1167c9] hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>مركز التعيينات</span>
                </Link>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">وصف المشكلة:</h4>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {currentIssue.description}
            </div>
          </div>

          {/* Existing Resolution Summary if present */}
          {currentIssue.resolutionSummary && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ملخص الحل والإصلاح:</span>
                </h4>
                {readinessStatus && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${readinessStatus.isEligibleForAssignment
                        ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                      }`}
                  >
                    {readinessStatus.isEligibleForAssignment ? "جاهزة للتعيين (Available=1)" : "غير جاهزة للتعيين"}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{currentIssue.resolutionSummary}</p>
            </div>
          )}

          {/* Resolution & Closure Action Area */}
          {!isResolvedOrClosed && (
            <div>
              {!showResolveForm ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-[#1167c9]" />
                      <span>هل تم إصلاح العطل أو معالجة المشكلة؟</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      تسجيل الحل سيعيد المركبة إلى حالة متاحة (Available=1) إذا لم تكن هناك أعطال حظر أخرى.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowResolveForm(true)}
                    className="bg-[#1167c9] hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>تسجيل حل البلاغ</span>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResolveSubmit} className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/50 pb-2">
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                      <span>معالجة وحل البلاغ</span>
                    </h4>
                    <Button type="button" variant="ghost" onClick={() => setShowResolveForm(false)} className="text-xs text-slate-500">
                      إلغاء
                    </Button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ملخص الحل والإجراءات المتخذة <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={resolutionSummaryText}
                      onChange={(e) => setResolutionSummaryText(e.target.value)}
                      placeholder="مثال: تم استبدال العجلة الخلفية واختبار المركبة بنجاح والتأكد من سلامة الهيكل..."
                      rows={3}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={closeImmediately}
                        onChange={(e) => setCloseImmediately(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>إغلاق البلاغ نهائياً فور الحفظ (Close Issue)</span>
                    </label>

                    <Button
                      type="submit"
                      disabled={isResolving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                    >
                      {isResolving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>جارٍ الحفظ والتحقق...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>تأكيد الحل وحفظ</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {currentIssue.status === VehicleIssueStatus.Resolved && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div>
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>تم حل هذا العطل بنجاح</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  يمكنك الآن إغلاق البلاغ نهائياً للأرشفة.
                </p>
              </div>
              <Button
                onClick={handleCloseIssueOnly}
                disabled={isResolving}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs gap-1.5 shrink-0 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                <span>إغلاق البلاغ نهائياً</span>
              </Button>
            </div>
          )}

          {/* Evidence files section */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
              <span>ملفات الإثبات المرفقة:</span>
              <span className="text-xs text-slate-400 font-normal">
                ({evidenceList.length} ملف)
              </span>
            </h4>

            {loadingEvidence ? (
              <div className="p-6 text-center text-xs text-slate-400">جارٍ تحميل ملفات الإثبات...</div>
            ) : evidenceList.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                لا توجد ملفات إثبات مرفقة لهذا البلاغ.
              </div>
            ) : (
              <div className="space-y-3">
                {evidenceList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1167c9] dark:bg-blue-950/50">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" dir="ltr">
                          {item.originalFileName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5" dir="ltr">
                          <span>{formatFileSize(item.fileSizeBytes)}</span>
                          <span>•</span>
                          <span>{item.contentType}</span>
                          <span>•</span>
                          <span>{formatDate(item.uploadedAtUtc)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        className="gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                        onClick={() => handlePreview(item)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>معاينة</span>
                      </Button>

                      <Button
                        variant="secondary"
                        className="gap-1.5 text-xs text-[#1167c9] border-blue-200 hover:bg-blue-50 dark:border-blue-800"
                        disabled={downloadingId === item.id}
                        onClick={() => handleDownload(item.id, item.originalFileName)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{downloadingId === item.id ? "جارٍ التنزيل..." : "تنزيل"}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>

      {/* Live Evidence Preview Sub-Modal */}
      {previewState.isOpen && (
        <Modal
          isOpen={previewState.isOpen}
          onClose={handleClosePreview}
          title={`معاينة الإثبات: ${previewState.title}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4 pt-2 text-right dir-rtl">
            {previewState.loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#1167c9]" />
                <span className="text-sm font-semibold">جارٍ تحميل المعاينة المباشرة للملف...</span>
              </div>
            ) : previewState.error ? (
              <div className="p-8 text-center text-red-600">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold">{previewState.error}</p>
              </div>
            ) : previewState.url ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-900/60 flex items-center justify-center min-h-[420px] p-2">
                {previewState.contentType?.startsWith("image/") ? (
                  <img
                    src={previewState.url}
                    alt={previewState.title}
                    className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
                  />
                ) : previewState.contentType?.includes("pdf") ? (
                  <iframe
                    src={previewState.url}
                    className="w-full h-[75vh] rounded-lg border-0"
                    title={previewState.title}
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      تتوفر المعاينة المباشرة للصور ومستندات PDF. يمكنك تنزيل الملف أو فتحه في نافذة جديدة.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {previewState.url ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="gap-1.5 text-xs text-[#1167c9]"
                    onClick={() => window.open(previewState.url!, "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>فتح في نافذة جديدة</span>
                  </Button>
                  {previewState.evidenceId && (
                    <Button
                      variant="secondary"
                      className="gap-1.5 text-xs"
                      onClick={() => handleDownload(previewState.evidenceId!, previewState.title)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>تنزيل الملف</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <Button variant="secondary" onClick={handleClosePreview}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
