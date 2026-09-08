"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getVehicleAccident,
  getVehicleAccidentWorkflow,
  getVehicleDetail,
  downloadAccidentPdf,
  downloadWorkflowAttachment,
  downloadWorkflowSourceDocument,
} from "@/lib/fleet/api";
import { listRiders } from "@/lib/workforce/api";
import {
  VehicleAccidentDetailResponse,
  VehicleAccidentWorkflowDetailResponse,
  VehicleAccidentWorkflowStage,
  VehicleAccidentWorkflowAction,
  VehicleAccidentEvidenceType,
  VehicleAccidentRefundStatus,
  VehicleAccidentStatus,
  VehicleAccidentSeverity,
} from "@/lib/fleet/types";
import {
  formatWorkflowStage,
  getWorkflowStageColor,
  formatEvidenceType,
  formatRefundStatus,
  formatCountdownTimer,
  formatWorkflowActionName,
} from "@/lib/fleet/formatters";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";

// Modals
import { WorkflowActionModal } from "../components/WorkflowActionModal";
import { AddTowingModal } from "../components/AddTowingModal";
import { AddInstallmentModal } from "../components/AddInstallmentModal";
import {
  FinalizeAccidentModal,
  CloseAccidentModal,
} from "../components/FinalizeAndCloseModals";

import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Download,
  FileText,
  GitBranch,
  CreditCard,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Car,
  User,
  MapPin,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  History,
  Info,
  ExternalLink,
} from "lucide-react";

export default function AccidentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = useAuth();
  const id = params.id as string;

  const [accident, setAccident] = useState<VehicleAccidentDetailResponse | null>(null);
  const [workflow, setWorkflow] = useState<VehicleAccidentWorkflowDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs
  const defaultTab = searchParams.get("tab") || "workflow";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Modals state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    action: VehicleAccidentWorkflowAction;
  }>({
    open: false,
    action: VehicleAccidentWorkflowAction.FollowUp,
  });
  const [isTowingModalOpen, setIsTowingModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);

  // Live timer tick
  const [remainingSecs, setRemainingSecs] = useState<number | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<{
    serialNumber?: string | null;
    plateDisplay?: string | null;
  } | null>(null);
  const [riderInfo, setRiderInfo] = useState<{
    name?: string | null;
    iqamaNo?: string | null;
  } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [accRes, wfRes] = await Promise.all([
        getVehicleAccident(id),
        getVehicleAccidentWorkflow(id),
      ]);
      setAccident(accRes);
      setWorkflow(wfRes);
      setRemainingSecs(wfRes.remainingSeconds ?? null);

      if (accRes.summary.vehicleId) {
        getVehicleDetail(accRes.summary.vehicleId)
          .then((v) => {
            const serial = v.serialNumber || v.summary?.serialNumber || v.summary?.assetNumber;
            const plate =
              v.summary?.plateNumberAr ||
              (v.summary?.plateLettersAr && v.summary?.plateDigits
                ? `${v.summary.plateLettersAr} ${v.summary.plateDigits}`
                : null) ||
              v.summary?.plateNumberEn;
            setVehicleInfo({ serialNumber: serial, plateDisplay: plate });
          })
          .catch(() => {});
      }
      if (accRes.summary.riderProfileId) {
        listRiders()
          .then((riders) => {
            const r = riders.find(
              (x) =>
                x.id === accRes.summary.riderProfileId ||
                x.employeeId === accRes.summary.riderProfileId,
            );
            if (r) {
              setRiderInfo({
                name: r.fullNameAr || r.fullNameEn,
                iqamaNo: r.iqamaNo,
              });
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      console.error(err);
      toast.error("خطأ", "تعذر تحميل بيانات الحادث ودورة العمل.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadAllData();
  }, [id]);

  // Live countdown tick every second
  useEffect(() => {
    if (remainingSecs === null) return;
    const interval = setInterval(() => {
      setRemainingSecs((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSecs]);

  const handleOpenAction = (action: VehicleAccidentWorkflowAction) => {
    setActionModal({ open: true, action });
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadAccidentPdf(id);
    } catch (e) {
      toast.error("خطأ", "فشل تحميل ملف PDF للحادث.");
    }
  };

  const handleDownloadDoc = async (kind: "iqama" | "license" | "registration") => {
    try {
      await downloadWorkflowSourceDocument(id, kind);
    } catch (e) {
      toast.error("خطأ", "فشل تحميل المستند من النظام.");
    }
  };

  const handleDownloadAttachment = async (attId: string) => {
    try {
      await downloadWorkflowAttachment(id, attId);
    } catch (e) {
      toast.error("خطأ", "فشل تحميل المرفق.");
    }
  };

  if (!can("fleet.accidents.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500 mb-2" />
        <h2 className="text-xl font-bold">صلاحية غير كافية</h2>
      </div>
    );
  }

  if (loading || !accident || !workflow) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-red-600" />
          <p className="text-sm font-semibold text-slate-500">جارٍ تحميل دورة عمل الحادث...</p>
        </div>
      </div>
    );
  }

  const stageColor = getWorkflowStageColor(workflow.stage);
  const timer = formatCountdownTimer(remainingSecs);
  const refund = formatRefundStatus(workflow.refund?.status);

  // Towing items
  const towingAttachments = (workflow.attachments || []).filter(
    (a) => a.evidenceType === VehicleAccidentEvidenceType.TowingReceipt
  );

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/admin/fleet/accidents"
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowRight className="h-4 w-4" />
                <span>سجل الحوادث</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                #{accident.summary.accidentNumber}
              </span>

              {/* Status Badge */}
              <Badge className="bg-slate-100 text-slate-700 border-slate-300">
                {accident.summary.status === VehicleAccidentStatus.Reported && "مسجل مبدئي"}
                {accident.summary.status === VehicleAccidentStatus.Finalized && "معتمد"}
                {accident.summary.status === VehicleAccidentStatus.Closed && "مغلق نهائياً"}
              </Badge>

              {/* Severity Badge */}
              <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                {accident.summary.severity === VehicleAccidentSeverity.Minor && "حادث بسيط"}
                {accident.summary.severity === VehicleAccidentSeverity.Moderate && "حادث متوسط"}
                {accident.summary.severity === VehicleAccidentSeverity.Serious && "حادث خطير"}
                {accident.summary.severity === VehicleAccidentSeverity.Critical && "حادث حرج (تلف كلي)"}
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                ملف الحادث #{accident.summary.accidentNumber}
              </h1>

              {/* Stage Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-black ${stageColor.bg} ${stageColor.text} ${stageColor.border}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {formatWorkflowStage(workflow.stage)}
              </span>
            </div>

            {/* Sub-meta details */}
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400 pt-1">
              <Link
                href={`/admin/fleet/vehicles/${accident.summary.vehicleId}`}
                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-blue-600 font-bold"
              >
                <Car className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  {vehicleInfo?.serialNumber
                    ? `مركبة: ${vehicleInfo.serialNumber}`
                    : "المركبة المعنية"}
                  {vehicleInfo?.plateDisplay ? ` • ${vehicleInfo.plateDisplay}` : ""}
                </span>
              </Link>
              <Link
                href={`/admin/employees/${accident.summary.riderProfileId}`}
                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-blue-600 font-bold"
              >
                <User className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  {riderInfo?.name
                    ? `المندوب: ${riderInfo.name}`
                    : `المندوب: ${accident.summary.riderProfileId.substring(0, 10)}...`}
                  {riderInfo?.iqamaNo ? ` (هوية: ${riderInfo.iqamaNo})` : ""}
                </span>
              </Link>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>وقوع الحادث: {new Date(accident.summary.occurredAtUtc).toLocaleDateString("ar-SA")}</span>
              </span>
              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                <span>مدة التعطل: {workflow.incidentCalendarDays} أيام تقويمية</span>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              className="h-9 px-3 text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> تحميل التقرير PDF
            </Button>

            {can("fleet.accidents.finalize") && accident.summary.status === VehicleAccidentStatus.Reported && (
              <Button
                onClick={() => setIsFinalizeOpen(true)}
                className="h-9 px-3 text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> اعتماد التقرير
              </Button>
            )}

            {can("fleet.accidents.finalize") && accident.summary.status !== VehicleAccidentStatus.Closed && (
              <Button
                onClick={() => setIsCloseOpen(true)}
                className="h-9 px-3 text-xs flex items-center gap-1.5 bg-slate-900 hover:bg-slate-950 text-white dark:bg-white dark:text-slate-900"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> إغلاق الملف نهائياً
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={loadAllData}
              className="h-9 px-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Active Countdown Timer Banner */}
        {workflow.deadlineAtUtc && (
          <div
            className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              timer.isOverdue || workflow.isOverdue
                ? "bg-red-500/10 border-red-300 text-red-800 dark:border-red-900/50 dark:text-red-200"
                : "bg-amber-500/10 border-amber-300 text-amber-800 dark:border-amber-900/50 dark:text-amber-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl text-white ${
                  timer.isOverdue || workflow.isOverdue ? "bg-red-600 animate-pulse" : "bg-amber-600"
                }`}
              >
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">
                  {workflow.stage === VehicleAccidentWorkflowStage.AwaitingInsurance
                    ? "مهلة رد شركة التأمين (15 يوماً)"
                    : "مهلة تحويل شركة شراء المركبة (10 أيام)"}
                </p>
                <p className="text-xs opacity-80">
                  تاريخ انتهاء المهلة: {new Date(workflow.deadlineAtUtc).toLocaleString("ar-SA")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-base font-black px-3 py-1 rounded-xl shadow-sm ${
                  timer.isOverdue || workflow.isOverdue
                    ? "bg-red-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {timer.formatted}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recommended Next Step & Contextual Action Bar */}
      {accident.summary.status !== VehicleAccidentStatus.Closed && (
        <div className="rounded-3xl border border-red-200/90 bg-gradient-to-l from-red-600/10 via-amber-500/5 to-transparent p-5 dark:border-red-900/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                الإجراء التالي الموصى به في دورة العمل
              </span>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingNajm &&
                  "مطلوب مراجعة تقرير نجم وتسجيل نسب المسؤولية لجميع الأطراف"}
                {workflow.stage === VehicleAccidentWorkflowStage.Assessed &&
                  ((workflow.fault?.riderFaultPercentage ?? 0) === 100 &&
                  accident.summary.severity === VehicleAccidentSeverity.Minor
                    ? "المسار: إصلاح بسيط على المندوب — مطلوب رفع سند لأمر وصورتي ضرر"
                    : "المسار: فتح ملف المطالبة لدى التأمين / شركة الشراء")}
                {workflow.stage === VehicleAccidentWorkflowStage.LocalRepair &&
                  "الإصلاح البسيط جارٍ — مطلوب إثبات انتهاء الإصلاح"}
                {workflow.stage === VehicleAccidentWorkflowStage.ClaimDraft &&
                  "المطالبة مفتوحة — مطلوب تسجيل تسليمها ورقم المطالبة"}
                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingAssessment &&
                  "تم تسليم المطالبة بانتظار التقييم — سجل رد التعويض، توجيه الإصلاح، أو الإتلاف"}
                {workflow.stage === VehicleAccidentWorkflowStage.CompensationOffered &&
                  "وصل عرض التعويض — مطلوب تسليم الملف للتأمين لبدء مهلة الـ 15 يوماً"}
                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingInsurance &&
                  "الملف لدى التأمين — بانتظار قبول التأمين أو تسجيل الرفض"}
                {workflow.stage === VehicleAccidentWorkflowStage.InsuranceRejected &&
                  "تم رفض التأمين — متاح إعادة التقديم للتأمين أو المتابعة"}
                {workflow.stage === VehicleAccidentWorkflowStage.InsuranceApproved &&
                  "تم قبول وسداد التأمين — مطلوب تسليم الملف لشركة الشراء لبدء مهلة الـ 10 أيام"}
                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingSupplierTransfer &&
                  "بانتظار التحويل المالي من شركة الشراء — مطلوب تأكيد استلام التحويل"}
                {workflow.stage === VehicleAccidentWorkflowStage.RepairDirected &&
                  "تحددت ورشة الإصلاح — مطلوب تسجيل بدء الإصلاح"}
                {workflow.stage === VehicleAccidentWorkflowStage.Repairing &&
                  "الإصلاح قيد التنفيذ — يمكنك تسجيل تحديث أو إثبات إتمام الإصلاح"}
                {workflow.stage === VehicleAccidentWorkflowStage.TotalLossProposed &&
                  "اقتراح إتلاف كلي — يمكن طلب إعادة فحص أو تأكيد الإتلاف"}
                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingReinspection &&
                  "بانتظار موعد إعادة الفحص — تأكيد الإتلاف أو تحويل للإصلاح"}
                {workflow.stage === VehicleAccidentWorkflowStage.TotalLossConfirmed &&
                  "تأكد الإتلاف — مطلوب تسجيل استلام الجهة للمركبة (نهاية فترة الحادث)"}
                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingValuation &&
                  "تم استلام المركبة المتلفة — بانتظار التقدير المالي النهائي"}
                {workflow.stage === VehicleAccidentWorkflowStage.TotalLossValued &&
                  "تم تسجيل التقدير المالي — مطلوب تسليم المطالبة لشركة شراء المركبة"}
                {workflow.stage === VehicleAccidentWorkflowStage.Completed &&
                  "اكتمل المسار الأساسي بنجاح! متاح الآن إدارة وتقديم استرداد الأقساط"}
              </h3>
            </div>

            {/* Action Buttons based on stage */}
            <div className="flex items-center gap-2 flex-wrap">
              {can("fleet.accidents.finalize") && (
                <>
                  {workflow.stage === VehicleAccidentWorkflowStage.AwaitingNajm && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.AssessFault)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      تسجيل نسب تقرير نجم
                    </Button>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.Assessed &&
                    ((workflow.fault?.riderFaultPercentage ?? 0) === 100 &&
                    accident.summary.severity === VehicleAccidentSeverity.Minor ? (
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.StartLocalRepair)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        بدء إصلاح بسيط
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.OpenClaim)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        فتح المطالبة
                      </Button>
                    ))}

                  {workflow.stage === VehicleAccidentWorkflowStage.LocalRepair && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.CompleteLocalRepair)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      إثبات انتهاء الإصلاح
                    </Button>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.ClaimDraft && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitClaim)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      تسجيل تقديم المطالبة
                    </Button>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.AwaitingAssessment && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ReceiveCompensationOffer)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                      >
                        عرض تعويض
                      </Button>
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ReceiveRepairDirection)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                      >
                        توجيه إصلاح
                      </Button>
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ProposeTotalLoss)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                      >
                        مقترح إتلاف
                      </Button>
                    </div>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.CompensationOffered && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitToInsurance)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      تسليم للتأمين (بدء 15 يوم)
                    </Button>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.AwaitingInsurance && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ApproveInsurance)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        قبول التأمين وسداده
                      </Button>
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RejectInsurance)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      >
                        رفض التأمين
                      </Button>
                    </div>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.InsuranceRejected && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitToInsurance)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      إعادة التقديم للتأمين
                    </Button>
                  )}

                  {(workflow.stage === VehicleAccidentWorkflowStage.InsuranceApproved ||
                    workflow.stage === VehicleAccidentWorkflowStage.TotalLossValued) && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitToSupplier)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      تسليم لشركة الشراء (بدء 10 أيام)
                    </Button>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.AwaitingSupplierTransfer && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ConfirmTransfer)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      تأكيد وصول مبلغ التحويل
                    </Button>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.RepairDirected && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.StartRepair)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      بدء الإصلاح
                    </Button>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.Repairing && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RepairProgress)}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                      >
                        تحديث متابعة
                      </Button>
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.CompleteRepair)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        إتمام الإصلاح
                      </Button>
                    </div>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.TotalLossProposed && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RequestReinspection)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                      >
                        طلب إعادة فحص
                      </Button>
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ConfirmTotalLoss)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                      >
                        تأكيد الإتلاف
                      </Button>
                    </div>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.TotalLossConfirmed && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RecordVehicleCollection)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      محضر استلام الجهة للمركبة
                    </Button>
                  )}

                  {workflow.stage === VehicleAccidentWorkflowStage.AwaitingValuation && (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RecordValuation)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      تسجيل التقدير المالي
                    </Button>
                  )}
                </>
              )}

              {/* Universal Follow Up Action */}
              <Button
                variant="secondary"
                onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.FollowUp)}
                className="h-10 px-3 text-xs flex items-center gap-1.5"
              >
                متابعة عامة (Follow Up)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("workflow")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "workflow"
              ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <GitBranch className="h-4 w-4" />
          <span>بيانات دورة العمل والتسوية</span>
        </button>

        <button
          onClick={() => setActiveTab("incident")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "incident"
              ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>تقرير الحادث الأصلي</span>
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "documents"
              ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>مستندات السائق والمركبة</span>
        </button>

        <button
          onClick={() => setActiveTab("towing")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "towing"
              ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>السطحات والنقل ({towingAttachments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("installments")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "installments"
              ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>استرداد الأقساط</span>
        </button>

        <button
          onClick={() => setActiveTab("attachments")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "attachments"
              ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>كافة المرفقات ({workflow.attachments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "timeline"
              ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <History className="h-4 w-4" />
          <span>سجل العمليات والتدقيق</span>
        </button>
      </div>

      {/* Tab 1: Workflow Overview */}
      {activeTab === "workflow" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fault Assessment Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-red-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    تحديد المسؤولية ونسب الخطأ (نجم)
                  </h3>
                </div>
                {workflow.fault?.assessedAtUtc && (
                  <span className="text-[11px] text-slate-400">
                    تم التقييم في: {new Date(workflow.fault.assessedAtUtc).toLocaleDateString("ar-SA")}
                  </span>
                )}
              </div>

              {workflow.fault ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                    <span className="text-xs font-semibold">نسبة خطأ المندوب (السائق):</span>
                    <span className="font-mono text-sm font-black text-red-600">
                      {workflow.fault.riderFaultPercentage}%
                    </span>
                  </div>

                  {workflow.fault.otherParties && workflow.fault.otherParties.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        الأطراف الأخرى في الحادث:
                      </p>
                      {workflow.fault.otherParties.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                        >
                          <div>
                            <span className="font-bold">{p.name}</span>
                            {p.vehiclePlate && <span className="mr-2 text-slate-500 font-mono">({p.vehiclePlate})</span>}
                            {p.insuranceCompany && <span className="mr-2 text-slate-400">[{p.insuranceCompany}]</span>}
                          </div>
                          <span className="font-mono font-bold text-blue-600">
                            {p.faultPercentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">لا توجد أطراف أخرى مسجلة بالحادث</p>
                  )}

                  {workflow.fault.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                      <strong>ملاحظات نجم:</strong> {workflow.fault.notes}
                    </p>
                  )}

                  {workflow.fault.najmAttachmentId && (
                    <Button
                      variant="secondary"
                      onClick={() => handleDownloadAttachment(workflow.fault!.najmAttachmentId!)}
                      className="w-full text-xs flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Download className="h-3.5 w-3.5" /> تحميل تقرير نجم PDF
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  لم يتم تسجيل مراجعة تقرير نجم حتى الآن
                </div>
              )}
            </Card>

            {/* Claim & Settlement Details Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    بيانات المطالبة والتسوية
                  </h3>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {workflow.claim ? (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">نوع المطالبة المطلوبة:</span>
                      <span className="font-bold">
                        {workflow.claim.requestedType === 1 ? "إصلاح المركبة" : "طلب تعويض مالي"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">رقم المطالبة (المرجع):</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {workflow.claim.number || "لم يُسجل بعد"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">شركة شراء المركبة:</span>
                      <span className="font-bold">{workflow.claim.supplierName || "الشركة الافتراضية"}</span>
                    </div>

                    {workflow.fault?.openingFeeAmount && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-amber-700 dark:text-amber-300 font-bold">
                        <span>رسوم فتح المطالبة المدفوعة:</span>
                        <span>{workflow.fault.openingFeeAmount} ريال</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400">لم يتم فتح ملف مطالبة رسمية</p>
                )}

                {workflow.settlement && (
                  <>
                    {workflow.settlement.amount && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 font-bold text-purple-700">
                        <span>مبلغ عرض التعويض:</span>
                        <span>{workflow.settlement.amount} ريال</span>
                      </div>
                    )}

                    {workflow.settlement.insuranceDecision && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">قرار شركة التأمين:</span>
                        <Badge
                          className={
                            workflow.settlement.insuranceDecision === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {workflow.settlement.insuranceDecision === "Approved" ? "قبول وسداد" : "رفض المطالبة"}
                        </Badge>
                      </div>
                    )}

                    {workflow.settlement.transferReceivedAmount && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 font-bold text-emerald-700">
                        <span>المبلغ المستلم بحساب شركتنا:</span>
                        <span>{workflow.settlement.transferReceivedAmount} ريال</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Incident Info (Original Report) */}
      {activeTab === "incident" && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تفاصيل وبيانات تقرير الحادث الميداني
              </h3>
              <p className="text-xs text-slate-500">
                التقرير المسجل عند وقوع الحادث ورقم المرور والبيانات الوصفية
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              className="text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> تحميل التقرير PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">رقم تقرير المرور / نجم:</span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {accident.policeReportNumber || "—"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">رقم مطالبة التأمين المبدئي:</span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {accident.insuranceClaimNumber || "—"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">حالة القيادة للمركبة:</span>
              <span className="font-bold text-sm">
                {accident.summary.isDrivable ? (
                  <span className="text-emerald-600">قابلة للقيادة</span>
                ) : (
                  <span className="text-red-600">غير قابلة للقيادة (تحتاج سطحة)</span>
                )}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">الإصابات البشرية:</span>
              <span className="font-bold text-sm">
                {accident.hasInjuries ? (
                  <span className="text-red-600">يوجد إصابات: {accident.injuryDetails}</span>
                ) : (
                  <span className="text-emerald-600">لا توجد إصابات</span>
                )}
              </span>
            </div>

            <div className="md:col-span-2">
              <span className="text-slate-500 block mb-1">موقع وقوع الحادث:</span>
              <span className="font-semibold text-sm">
                {accident.summary.locationDescription || "—"}
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                سرد وتفاصيل الحادث (Narrative):
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl leading-relaxed">
                {accident.narrative || "لا يوجد سرد مدخل"}
              </p>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                وصف الضرر الظاهر بالمركبة:
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl leading-relaxed">
                {accident.damageDescription || "لا يوجد وصف للأضرار"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Source Documents */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200 text-xs flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm">مستندات السائق والمركبة من النظام</p>
              <p>
                الإقامة والرخصة يتم جلبهما من ملف الموظف السائق المرتبط بالحادث، والاستمارة من مرفقات المركبة (Istimara).
                عدم توفر أي ملف يظهر باللون الأحمر ويمنع تقديم المطالبة رسمياً حتى يتم تحديثه في ملف السائق أو المركبة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Iqama */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">إقامة المندوب</span>
                {workflow.sourceDocuments?.iqama?.versionId ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">متوفرة بالنظام</Badge>
                ) : (
                  <Badge className="bg-red-50 text-red-700 border-red-200">غير متوفرة</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                اسم الملف: {workflow.sourceDocuments?.iqama?.originalFileName || "لا يوجد ملف"}
              </p>
              {workflow.sourceDocuments?.iqama?.downloadUrl && (
                <Button
                  variant="secondary"
                  onClick={() => handleDownloadDoc("iqama")}
                  className="w-full text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> تحميل الإقامة
                </Button>
              )}
            </Card>

            {/* License */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">رخصة القيادة</span>
                {workflow.sourceDocuments?.license?.versionId ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">متوفرة بالنظام</Badge>
                ) : (
                  <Badge className="bg-red-50 text-red-700 border-red-200">غير متوفرة</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                اسم الملف: {workflow.sourceDocuments?.license?.originalFileName || "لا يوجد ملف"}
              </p>
              {workflow.sourceDocuments?.license?.downloadUrl && (
                <Button
                  variant="secondary"
                  onClick={() => handleDownloadDoc("license")}
                  className="w-full text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> تحميل الرخصة
                </Button>
              )}
            </Card>

            {/* Registration */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">استمارة المركبة</span>
                {workflow.sourceDocuments?.registration?.versionId ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">متوفرة بالنظام</Badge>
                ) : (
                  <Badge className="bg-red-50 text-red-700 border-red-200">غير متوفرة</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                اسم الملف: {workflow.sourceDocuments?.registration?.originalFileName || "لا يوجد ملف"}
              </p>
              {workflow.sourceDocuments?.registration?.downloadUrl && (
                <Button
                  variant="secondary"
                  onClick={() => handleDownloadDoc("registration")}
                  className="w-full text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> تحميل الاستمارة
                </Button>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab 4: Towing Receipts */}
      {activeTab === "towing" && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إيصالات السطحة ورحلات نقل المركبة
              </h3>
              <p className="text-xs text-slate-500">
                سجل الرحلات وتكاليف نقل وسحب المركبة المتضررة
              </p>
            </div>
            {can("fleet.accidents.report") && (
              <Button
                onClick={() => setIsTowingModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5 font-bold"
              >
                <Plus className="h-4 w-4" /> إضافة إيصال سطحة
              </Button>
            )}
          </div>

          {towingAttachments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Truck className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm font-bold">لا توجد إيصالات سطحة مسجلة لهذا الحادث</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">وصف الرحلة</th>
                    <th className="px-4 py-3">من (الانطلاق)</th>
                    <th className="px-4 py-3">إلى (الوصول)</th>
                    <th className="px-4 py-3">وقت النقل</th>
                    <th className="px-4 py-3">التكلفة</th>
                    <th className="px-4 py-3 text-center">الإيصال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {towingAttachments.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-semibold">{t.description || "سطحة نقل"}</td>
                      <td className="px-4 py-3">{t.fromLocation || "—"}</td>
                      <td className="px-4 py-3">{t.toLocation || "—"}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {t.transportedAtUtc ? new Date(t.transportedAtUtc).toLocaleString("ar-SA") : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-600 font-mono">
                        {t.amount ? `${t.amount} ريال` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="secondary"
                          onClick={() => handleDownloadAttachment(t.id)}
                          className="h-7 px-2.5 text-[11px] flex items-center gap-1 mx-auto"
                        >
                          <Download className="h-3 w-3" /> تنزيل
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 5: Installment Refunds */}
      {activeTab === "installments" && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  استرداد الأقساط المدفوعة عن فترة الحادث
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold ${refund.bg} ${refund.color}`}
                >
                  {refund.text}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                مدة تعطل المركبة: <strong>{workflow.incidentCalendarDays} أيام</strong> | إجمالي المبالغ المؤهلة:{" "}
                <strong className="text-purple-600 font-mono font-bold">
                  {workflow.refund?.recordedEligibleAmount ?? 0} ريال
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {can("fleet.accidents.finalize") && (
                <>
                  <Button
                    onClick={() => setIsInstallmentModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs flex items-center gap-1.5 font-bold"
                  >
                    <Plus className="h-4 w-4" /> إضافة قسط مدفوع
                  </Button>

                  {workflow.refund?.status === VehicleAccidentRefundStatus.NotSubmitted &&
                    (workflow.refund?.recordedEligibleAmount ?? 0) > 0 && (
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitInstallmentRefund)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                      >
                        تقديم طلب الاسترداد
                      </Button>
                    )}

                  {workflow.refund?.status === VehicleAccidentRefundStatus.Submitted && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ReceiveInstallmentRefund)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        تسجيل استلام المبلغ
                      </Button>
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RejectInstallmentRefund)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                      >
                        تسجيل رفض الطلب
                      </Button>
                    </div>
                  )}

                  {workflow.refund?.status === VehicleAccidentRefundStatus.NotSubmitted && (
                    <Button
                      variant="secondary"
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.MarkNoInstallments)}
                      className="text-xs text-slate-500"
                    >
                      لا توجد أقساط للمطالبة
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Installments Table */}
          {!workflow.refund?.installments || workflow.refund.installments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm font-bold">لم يتم تسجيل أي أقساط مدفوعة لهذا الحادث</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">فترة القسط (من - إلى)</th>
                    <th className="px-4 py-3">تاريخ الدفع</th>
                    <th className="px-4 py-3">مبلغ القسط</th>
                    <th className="px-4 py-3">المبلغ المؤهل للاسترداد</th>
                    <th className="px-4 py-3">ملاحظات</th>
                    <th className="px-4 py-3 text-center">الإيصال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {workflow.refund.installments.map((inst) => (
                    <tr key={inst.id}>
                      <td className="px-4 py-3 font-mono font-semibold">
                        {inst.periodFrom} ⟵ {inst.periodTo}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{inst.paidOn}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {inst.amount} ريال
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-purple-600">
                        {inst.refundEligibleAmount} ريال
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {inst.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="secondary"
                          onClick={() => handleDownloadAttachment(inst.receiptAttachmentId)}
                          className="h-7 px-2.5 text-[11px] flex items-center gap-1 mx-auto"
                        >
                          <Download className="h-3 w-3" /> الإيصال
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 6: Attachments & Evidence */}
      {activeTab === "attachments" && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                جميع المرفقات والأدلة الرسمية ({(workflow.attachments || []).length})
              </h3>
              <p className="text-xs text-slate-500">
                تقارير نجم، السندات، إيصالات السداد والتحويل، الصور والخطابات
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(workflow.attachments || []).map((att) => (
              <div
                key={att.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {formatEvidenceType(att.evidenceType)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {((att.fileSizeBytes ?? 0) / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {att.originalFileName}
                  </h4>
                  {att.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{att.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                  <span>{new Date(att.uploadedAtUtc).toLocaleDateString("ar-SA")}</span>
                  <button
                    onClick={() => handleDownloadAttachment(att.id)}
                    className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" /> تحميل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 7: Timeline & Audit */}
      {activeTab === "timeline" && (
        <Card className="p-6 space-y-6">
          <div className="border-b pb-4 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              سجل العمليات والتدقيق التاريخي للحادث
            </h3>
            <p className="text-xs text-slate-500">
              توثيق زمني كامل لكافة الإجراءات والخطوات المنفذة مع المستخدم والوقت والملاحظات
            </p>
          </div>

          <div className="space-y-4 pr-2">
            {workflow.timeline && workflow.timeline.length > 0 ? (
              <div className="relative border-r-2 border-slate-200 dark:border-slate-800 pr-6 space-y-6 mr-3">
                {workflow.timeline.map((entry, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -right-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-600 dark:border-slate-900" />
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatWorkflowActionName(entry.eventType ?? entry.action ?? 0 as any)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(entry.occurredAtUtc).toLocaleString("ar-SA")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {entry.reason ?? entry.notes}
                      </p>
                      {entry.performedByUserName && (
                        <span className="text-[10px] text-slate-400 block pt-1">
                          المنفذ: {entry.performedByUserName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">لا يوجد سجل تاريخي بعد</p>
            )}
          </div>
        </Card>
      )}

      {/* Action Modals */}
      {actionModal.open && (
        <WorkflowActionModal
          isOpen={actionModal.open}
          onClose={() => setActionModal({ open: false, action: actionModal.action })}
          accidentId={id}
          action={actionModal.action}
          workflow={workflow}
          accident={accident}
          onSuccess={() => {
            loadAllData();
          }}
        />
      )}

      {/* Towing Modal */}
      <AddTowingModal
        isOpen={isTowingModalOpen}
        onClose={() => setIsTowingModalOpen(false)}
        accidentId={id}
        onSuccess={() => loadAllData()}
      />

      {/* Installment Modal */}
      <AddInstallmentModal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        accidentId={id}
        workflowRowVersion={workflow.rowVersion}
        incidentStartedAtUtc={workflow.incidentStartedAtUtc}
        incidentEndedAtUtc={workflow.incidentEndedAtUtc}
        onSuccess={() => loadAllData()}
      />

      {/* Finalize Modal */}
      <FinalizeAccidentModal
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        accidentId={id}
        accidentSummaryRowVersion={accident.summary.rowVersion}
        onSuccess={() => loadAllData()}
      />

      {/* Close Modal */}
      <CloseAccidentModal
        isOpen={isCloseOpen}
        onClose={() => setIsCloseOpen(false)}
        accidentId={id}
        accidentSummaryRowVersion={accident.summary.rowVersion}
        accidentDetail={accident}
        workflowDetail={workflow}
        onSuccess={() => loadAllData()}
      />
    </div>
  );
}
