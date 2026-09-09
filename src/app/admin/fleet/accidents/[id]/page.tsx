"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authPreviewBlob } from "@/lib/auth/api";
import {
  getVehicleAccident,
  getVehicleAccidentWorkflow,
  getVehicleDetail,
  getVehicleFiles,
  downloadVehicleFile,
  downloadAccidentPdf,
  downloadWorkflowAttachment,
  downloadWorkflowSourceDocument,
} from "@/lib/fleet/api";
import { listRiders, listEmployees } from "@/lib/workforce/api";
import {
  getEmployeeDocuments,
  downloadEmployeeDocument,
} from "@/lib/workforce/compliance-api";
import {
  getEmployeeChecklist,
  getRiderChecklist,
} from "@/lib/workforce/documents-api";
import {
  VehicleAccidentDetailResponse,
  VehicleAccidentWorkflowDetailResponse,
  VehicleAccidentWorkflowStage,
  VehicleAccidentWorkflowAction,
  VehicleAccidentEvidenceType,
  VehicleAccidentRefundStatus,
  VehicleAccidentStatus,
  VehicleAccidentSeverity,
  VehicleFileKind,
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
  Eye,
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
  X,
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
  const rawTab = searchParams.get("tab") || "overview";
  const initialTab =
    rawTab === "towing" || rawTab === "attachments" || rawTab === "documents"
      ? "documents"
      : rawTab === "incident" || rawTab === "workflow" || rawTab === "overview"
      ? "overview"
      : rawTab;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

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

  // Source documents fetched directly from HR & Vehicles
  const [targetEmployeeId, setTargetEmployeeId] = useState<string | null>(null);
  const [hrDocs, setHrDocs] = useState<{
    iqama?: { id: string; employeeId: string; name: string; size?: number; contentType?: string } | null;
    license?: { id: string; employeeId: string; name: string; size?: number; contentType?: string } | null;
  }>({});
  const [vehicleIstimara, setVehicleIstimara] = useState<{
    id: string;
    vehicleId: string;
    name: string;
    size?: number;
    contentType?: string;
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
        const vId = accRes.summary.vehicleId;
        getVehicleDetail(vId)
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

        // Fetch Istimara from Vehicle Files
        getVehicleFiles(vId)
          .then((files) => {
            if (Array.isArray(files)) {
              const istimara = files.find(
                (f) =>
                  Number(f.kind) === 1 ||
                  f.kind === VehicleFileKind.Istimara ||
                  String(f.kind).toLowerCase() === "istimara" ||
                  f.displayName?.includes("استمارة") ||
                  f.originalFileName?.toLowerCase().includes("istimara") ||
                  f.currentFileName?.toLowerCase().includes("istimara")
              );
              if (istimara) {
                setVehicleIstimara({
                  id: istimara.id,
                  vehicleId: vId,
                  name: istimara.originalFileName || istimara.displayName || istimara.currentFileName || "استمارة المركبة",
                  size: istimara.fileSizeBytes || undefined,
                  contentType: istimara.contentType || undefined,
                });
              }
            }
          })
          .catch((e) => console.warn("Could not fetch vehicle files:", e));
      }

      if (accRes.summary.riderProfileId) {
        const rpId = accRes.summary.riderProfileId;
        Promise.allSettled([listRiders().catch(() => []), listEmployees().catch(() => [])])
          .then(([ridersRes, employeesRes]) => {
            const riders = ridersRes.status === "fulfilled" && Array.isArray(ridersRes.value) ? ridersRes.value : [];
            const employees = employeesRes.status === "fulfilled" && Array.isArray(employeesRes.value) ? employeesRes.value : [];

            let matchedRider = riders.find((x) => x.id === rpId || x.employeeId === rpId);
            let matchedEmp = employees.find((e) => e.id === rpId || e.riderProfileId === rpId);

            if (matchedRider && !matchedEmp && matchedRider.employeeId) {
              matchedEmp = employees.find((e) => e.id === matchedRider?.employeeId);
            }
            if (matchedEmp && !matchedRider && matchedEmp.riderProfileId) {
              matchedRider = riders.find((x) => x.id === matchedEmp?.riderProfileId);
            }

            const riderName =
              matchedRider?.fullNameAr ||
              matchedRider?.fullNameEn ||
              matchedEmp?.fullNameAr ||
              matchedEmp?.fullNameEn;
            const iqamaNo = matchedRider?.iqamaNo || matchedEmp?.iqamaNo;
            setRiderInfo({
              name: riderName,
              iqamaNo: iqamaNo,
            });

            const targetEmpId = matchedEmp?.id || matchedRider?.employeeId || (matchedRider ? null : rpId);
            const targetRiderId = matchedRider?.id || rpId;
            setTargetEmployeeId(targetEmpId || targetRiderId);

            // Fetch Rider documents from HR APIs (documents list & checklists)
            const docFetchers: Promise<any>[] = [];
            if (targetEmpId) {
              docFetchers.push(getEmployeeDocuments(targetEmpId).catch(() => []));
              docFetchers.push(getEmployeeChecklist(targetEmpId).catch(() => []));
            }
            if (targetRiderId) {
              docFetchers.push(getRiderChecklist(targetRiderId).catch(() => []));
            }
            if (!targetEmpId && targetRiderId) {
              docFetchers.push(getEmployeeDocuments(targetRiderId).catch(() => []));
            }

            Promise.allSettled(docFetchers).then((results) => {
              interface ExtractedDoc {
                id: string;
                employeeId: string;
                name: string;
                size?: number;
                contentType?: string;
                typeCode?: string;
              }
              const foundDocs: ExtractedDoc[] = [];

              for (const r of results) {
                if (r.status !== "fulfilled" || !r.value) continue;
                const val = r.value;
                if (Array.isArray(val)) {
                  for (const item of val) {
                    // Direct EmployeeDocument
                    if (item.id && (item.documentTypeCode || item.documentTypeNameAr || item.currentFileName)) {
                      foundDocs.push({
                        id: item.id,
                        employeeId: targetEmpId || targetRiderId,
                        name: item.currentFileName || item.documentTypeNameAr || item.documentTypeCode || "مستند",
                        size: item.currentFileSizeBytes || undefined,
                        contentType: item.currentContentType || undefined,
                        typeCode: item.documentTypeCode,
                      });
                    }
                    // Checklist item with documents array
                    if (item.documentTypeCode && Array.isArray(item.documents)) {
                      for (const d of item.documents) {
                        if (d && d.id) {
                          foundDocs.push({
                            id: d.id,
                            employeeId: targetEmpId || targetRiderId,
                            name: d.currentFileName || item.documentTypeNameAr || item.documentTypeCode,
                            size: d.currentFileSizeBytes || undefined,
                            contentType: d.currentContentType || undefined,
                            typeCode: item.documentTypeCode,
                          });
                        }
                      }
                    }
                  }
                }
              }

              const matchedIqama = foundDocs.find((d) => {
                const code = (d.typeCode || "").toUpperCase();
                const name = (d.name || "").toLowerCase();
                return (
                  code === "RESIDENCY_PERMIT" ||
                  code === "RESIDENCY-PERMIT" ||
                  code.includes("IQAMA") ||
                  name.includes("إقامة") ||
                  name.includes("اقامة") ||
                  name.includes("iqama") ||
                  name.includes("residency")
                );
              });

              const matchedLicense = foundDocs.find((d) => {
                const code = (d.typeCode || "").toUpperCase();
                const name = (d.name || "").toLowerCase();
                return (
                  code === "DRIVER_LICENSE" ||
                  code === "DRIVER-LICENSE" ||
                  code.includes("LICENSE") ||
                  name.includes("رخصة") ||
                  name.includes("قيادة") ||
                  name.includes("license")
                );
              });

              setHrDocs({
                iqama: matchedIqama
                  ? {
                      id: matchedIqama.id,
                      employeeId: matchedIqama.employeeId,
                      name: matchedIqama.name,
                      size: matchedIqama.size,
                      contentType: matchedIqama.contentType,
                    }
                  : null,
                license: matchedLicense
                  ? {
                      id: matchedLicense.id,
                      employeeId: matchedLicense.employeeId,
                      name: matchedLicense.name,
                      size: matchedLicense.size,
                      contentType: matchedLicense.contentType,
                    }
                  : null,
              });
            });
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

  // Live Preview Modal State
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    url: string | null;
    contentType: string | null;
    loading: boolean;
    error: string | null;
    onDownload?: () => void;
  }>({
    isOpen: false,
    title: "",
    url: null,
    contentType: null,
    loading: false,
    error: null,
  });

  const handleClosePreview = () => {
    if (previewModal.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal({
      isOpen: false,
      title: "",
      url: null,
      contentType: null,
      loading: false,
      error: null,
    });
  };

  const handleOpenLiveView = async ({
    title,
    fetchBlob,
    onDownload,
  }: {
    title: string;
    fetchBlob: () => Promise<{ blob: Blob; contentType?: string; url?: string }>;
    onDownload?: () => void;
  }) => {
    if (previewModal.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal({
      isOpen: true,
      title,
      url: null,
      contentType: null,
      loading: true,
      error: null,
      onDownload,
    });

    try {
      const res = await fetchBlob();
      const finalUrl = res.url || URL.createObjectURL(res.blob);
      const finalType = res.contentType || res.blob.type || "application/pdf";
      setPreviewModal({
        isOpen: true,
        title,
        url: finalUrl,
        contentType: finalType,
        loading: false,
        error: null,
        onDownload,
      });
    } catch (err: any) {
      console.error("Live preview error:", err);
      setPreviewModal((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "تعذر تحميل المعاينة المباشرة للمستند.",
      }));
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadAccidentPdf(id);
    } catch (e) {
      toast.error("خطأ", "فشل تحميل ملف PDF للحادث.");
    }
  };

  const handleLiveViewPdf = () => {
    handleOpenLiveView({
      title: "تقرير الحادث PDF",
      fetchBlob: () => authPreviewBlob(`/api/vehicle-accidents/${id}/pdf`),
      onDownload: handleDownloadPdf,
    });
  };

  const triggerBlobDownload = async (
    downloadPromise: Promise<{ blob: Blob; fileName: string }>,
    defaultName: string
  ) => {
    try {
      const { blob, fileName } = await downloadPromise;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(fileName || defaultName);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      toast.error("خطأ", "فشل تحميل المستند.");
    }
  };

  const handleDownloadDoc = async (kind: "iqama" | "license" | "registration") => {
    try {
      await downloadWorkflowSourceDocument(id, kind);
    } catch (e) {
      toast.error("خطأ", "فشل تحميل المستند من النظام.");
    }
  };

  // Handle IQAMA download (existing) and LIVE VIEW
  const handleDownloadIqama = async () => {
    const doc = hrDocs.iqama;
    if (doc) {
      await triggerBlobDownload(
        downloadEmployeeDocument(doc.employeeId, doc.id),
        doc.name || "iqama.pdf"
      );
    } else {
      await handleDownloadDoc("iqama");
    }
  };

  const handleLiveViewIqama = () => {
    const doc = hrDocs.iqama;
    handleOpenLiveView({
      title: "إقامة المندوب",
      fetchBlob: () => {
        if (doc) {
          return authPreviewBlob(`/api/employees/${doc.employeeId}/documents/${doc.id}/preview`)
            .catch(() => authPreviewBlob(`/api/employees/${doc.employeeId}/documents/${doc.id}/download`));
        }
        return authPreviewBlob(`/api/vehicle-accidents/${id}/workflow/documents/iqama/download`);
      },
      onDownload: handleDownloadIqama,
    });
  };

  const handleDownloadLicense = async () => {
    const doc = hrDocs.license;
    if (doc) {
      await triggerBlobDownload(
        downloadEmployeeDocument(doc.employeeId, doc.id),
        doc.name || "driver_license.pdf"
      );
    } else {
      await handleDownloadDoc("license");
    }
  };

  const handleLiveViewLicense = () => {
    const doc = hrDocs.license;
    handleOpenLiveView({
      title: "رخصة القيادة",
      fetchBlob: () => {
        if (doc) {
          return authPreviewBlob(`/api/employees/${doc.employeeId}/documents/${doc.id}/preview`)
            .catch(() => authPreviewBlob(`/api/employees/${doc.employeeId}/documents/${doc.id}/download`));
        }
        return authPreviewBlob(`/api/vehicle-accidents/${id}/workflow/documents/license/download`);
      },
      onDownload: handleDownloadLicense,
    });
  };

  const handleDownloadIstimara = async () => {
    const doc = vehicleIstimara;
    if (doc) {
      await triggerBlobDownload(
        downloadVehicleFile(doc.vehicleId, doc.id),
        doc.name || "istimara.pdf"
      );
    } else {
      await handleDownloadDoc("registration");
    }
  };

  const handleLiveViewIstimara = () => {
    const doc = vehicleIstimara;
    handleOpenLiveView({
      title: "استمارة المركبة",
      fetchBlob: () => {
        if (doc) {
          return authPreviewBlob(`/api/vehicles/${doc.vehicleId}/files/${doc.id}/download`);
        }
        return authPreviewBlob(`/api/vehicle-accidents/${id}/workflow/documents/registration/download`);
      },
      onDownload: handleDownloadIstimara,
    });
  };

  const handleDownloadAttachment = async (attId: string) => {
    try {
      await downloadWorkflowAttachment(id, attId);
    } catch (e) {
      toast.error("خطأ", "فشل تحميل المرفق.");
    }
  };

  const handleLiveViewAttachment = (attId: string, title?: string) => {
    handleOpenLiveView({
      title: title || "مرفق الحادث",
      fetchBlob: () => authPreviewBlob(`/api/vehicle-accidents/${id}/evidence/${attId}/download`),
      onDownload: () => handleDownloadAttachment(attId),
    });
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

  const getStageDescription = () => {
    switch (workflow.stage) {
      case VehicleAccidentWorkflowStage.AwaitingNajm:
        return "بانتظار مراجعة تقرير نجم وتسجيل نسب المسؤولية لتحديد مسار المعالجة.";
      case VehicleAccidentWorkflowStage.Assessed:
        return (workflow.fault?.riderFaultPercentage ?? 0) === 100 &&
          accident.summary.severity === VehicleAccidentSeverity.Minor
          ? "المسار إصلاح بسيط على المندوب — مطلوب رفع سند لأمر وإثبات الأضرار."
          : "المسار فتح ملف مطالبة رسمية لدى التأمين أو شركة الشراء.";
      case VehicleAccidentWorkflowStage.LocalRepair:
        return "الإصلاح البسيط جارٍ — مطلوب إثبات انتهاء الإصلاح لإنهاء الملف.";
      case VehicleAccidentWorkflowStage.ClaimDraft:
        return "تم إعداد المطالبة — مطلوب تسجيل تسليمها ورقم المرجع لدى الجهة.";
      case VehicleAccidentWorkflowStage.AwaitingAssessment:
        return "المطالبة مسلّمة بانتظار نتيجة التقييم (عرض تعويض، توجيه إصلاح، أو إتلاف).";
      case VehicleAccidentWorkflowStage.CompensationOffered:
        return "تم استلام عرض التعويض — مطلوب تسليمه للتأمين للبدء بالصرف.";
      case VehicleAccidentWorkflowStage.AwaitingInsurance:
        return "الملف لدى شركة التأمين — بانتظار القبول والسداد أو تسجيل الرفض.";
      case VehicleAccidentWorkflowStage.InsuranceRejected:
        return "تم رفض المطالبة من التأمين — متاح إعادة التقديم أو اتخاذ إجراء بديل.";
      case VehicleAccidentWorkflowStage.InsuranceApproved:
      case VehicleAccidentWorkflowStage.TotalLossValued:
        return "تم قبول المطالبة — مطلوب تسليم الملف لشركة الشراء للتحويل المالي.";
      case VehicleAccidentWorkflowStage.AwaitingSupplierTransfer:
        return "بانتظار التحويل المالي من شركة الشراء — مطلوب تأكيد استلام المبلغ.";
      case VehicleAccidentWorkflowStage.RepairDirected:
        return "تم تحديد ورشة الإصلاح — مطلوب تسجيل بدء العمل بالمركبة.";
      case VehicleAccidentWorkflowStage.Repairing:
        return "الإصلاح قيد التنفيذ بالورشة — يمكنك تسجيل متابعة أو إتمام الإصلاح.";
      case VehicleAccidentWorkflowStage.TotalLossProposed:
        return "مقترح إتلاف كلي — متاح طلب إعادة فحص أو تأكيد الإتلاف.";
      case VehicleAccidentWorkflowStage.AwaitingReinspection:
        return "بانتظار موعد إعادة الفحص — تأكيد الإتلاف أو تحويل للإصلاح.";
      case VehicleAccidentWorkflowStage.TotalLossConfirmed:
        return "تم تأكيد الإتلاف — مطلوب تسجيل استلام الجهة للمركبة.";
      case VehicleAccidentWorkflowStage.AwaitingValuation:
        return "تم تسليم المركبة المتلفة — بانتظار التقدير المالي النهائي.";
      case VehicleAccidentWorkflowStage.Completed:
        return "اكتملت دورة العمل بنجاح — متاح الآن إدارة وتقديم استرداد الأقساط.";
      default:
        return "متابعة إجراءات الحادث والتسوية.";
    }
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            {/* Clean Breadcrumb (No Accident Number) */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link
                href="/admin/fleet/accidents"
                className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-semibold"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>سجل الحوادث</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">تفاصيل الحادث</span>
            </div>

            {/* Title & Badges */}
            <div className="flex items-center gap-3 flex-wrap pt-0.5">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                ملف الحادث
              </h1>

              {/* Status Badge */}
              <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-xs px-2.5 py-0.5 font-bold">
                {accident.summary.status === VehicleAccidentStatus.Reported && "مسجل مبدئي"}
                {accident.summary.status === VehicleAccidentStatus.Finalized && "معتمد"}
                {accident.summary.status === VehicleAccidentStatus.Closed && "مغلق نهائياً"}
              </Badge>

              {/* Severity Badge */}
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2.5 py-0.5 font-bold">
                {accident.summary.severity === VehicleAccidentSeverity.Minor && "حادث بسيط"}
                {accident.summary.severity === VehicleAccidentSeverity.Moderate && "حادث متوسط"}
                {accident.summary.severity === VehicleAccidentSeverity.Serious && "حادث خطير"}
                {accident.summary.severity === VehicleAccidentSeverity.Critical && "حادث حرج (تلف كلي)"}
              </Badge>

              {/* Stage Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-black ${stageColor.bg} ${stageColor.text} ${stageColor.border}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {formatWorkflowStage(workflow.stage)}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={handleLiveViewPdf}
              className="h-9 px-3 text-xs flex items-center gap-1.5 font-bold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
            >
              <Eye className="h-3.5 w-3.5" /> معاينة التقرير
            </Button>

            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              className="h-9 px-3 text-xs flex items-center gap-1.5 font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> تحميل التقرير PDF
            </Button>

            {can("fleet.accidents.finalize") && accident.summary.status === VehicleAccidentStatus.Reported && (
              <Button
                onClick={() => setIsFinalizeOpen(true)}
                className="h-9 px-3 text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> اعتماد التقرير
              </Button>
            )}

            {can("fleet.accidents.finalize") && accident.summary.status !== VehicleAccidentStatus.Closed && (
              <Button
                onClick={() => setIsCloseOpen(true)}
                className="h-9 px-3 text-xs flex items-center gap-1.5 bg-slate-900 hover:bg-slate-950 text-white dark:bg-white dark:text-slate-900 font-bold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> إغلاق الملف نهائياً
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={loadAllData}
              className="h-9 px-2 text-xs"
              title="تحديث البيانات"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Prominent Vehicle & Driver Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Vehicle Serial & Plate */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Car className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-slate-400 block">المركبة المعنية</span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <Link
                  href={`/admin/fleet/vehicles/${accident.summary.vehicleId}`}
                  className="font-mono text-sm font-black text-blue-600 hover:underline"
                >
                  {vehicleInfo?.serialNumber || "—"}
                </Link>
                {vehicleInfo?.plateDisplay && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs">
                    {vehicleInfo.plateDisplay}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rider Name & Iqama */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-slate-400 block">المندوب (السائق)</span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <Link
                  href={`/admin/employees/${accident.summary.riderProfileId}`}
                  className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 hover:underline truncate max-w-[140px]"
                >
                  {riderInfo?.name || "مندوب"}
                </Link>
                {riderInfo?.iqamaNo && (
                  <span className="text-xs text-slate-500 font-mono">
                    (هوية: {riderInfo.iqamaNo})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Date of Accident */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">تاريخ الحادث</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {new Date(accident.summary.occurredAtUtc).toLocaleDateString("ar-SA")}
              </span>
            </div>
          </div>

          {/* Downtime */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">مدة التعطل</span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {workflow.incidentCalendarDays} أيام تقويمية
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified, Clean Action Bar */}
      {accident.summary.status !== VehicleAccidentStatus.Closed && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg">
                <GitBranch className="h-3.5 w-3.5" />
                المرحلة: {formatWorkflowStage(workflow.stage)}
              </span>
              {workflow.deadlineAtUtc && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                    timer.isOverdue || workflow.isOverdue
                      ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 animate-pulse"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  المهلة: {timer.formatted}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {getStageDescription()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {can("fleet.accidents.finalize") && (
              <>
                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingNajm && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.AssessFault)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9"
                  >
                    تسجيل نسب تقرير نجم
                  </Button>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.Assessed &&
                  ((workflow.fault?.riderFaultPercentage ?? 0) === 100 &&
                  accident.summary.severity === VehicleAccidentSeverity.Minor ? (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.StartLocalRepair)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9"
                    >
                      بدء إصلاح بسيط
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.OpenClaim)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9"
                    >
                      فتح المطالبة
                    </Button>
                  ))}

                {workflow.stage === VehicleAccidentWorkflowStage.LocalRepair && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.CompleteLocalRepair)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9"
                  >
                    إثبات انتهاء الإصلاح
                  </Button>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.ClaimDraft && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitClaim)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9"
                  >
                    تسجيل تقديم المطالبة
                  </Button>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingAssessment && (
                  <div className="flex gap-1.5">
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ReceiveCompensationOffer)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-9"
                    >
                      عرض تعويض
                    </Button>
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ReceiveRepairDirection)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9"
                    >
                      توجيه إصلاح
                    </Button>
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ProposeTotalLoss)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9"
                    >
                      مقترح إتلاف
                    </Button>
                  </div>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.CompensationOffered && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitToInsurance)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9"
                  >
                    تسليم للتأمين (بدء 15 يوم)
                  </Button>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingInsurance && (
                  <div className="flex gap-1.5">
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ApproveInsurance)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9"
                    >
                      قبول التأمين وسداده
                    </Button>
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RejectInsurance)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9"
                    >
                      رفض التأمين
                    </Button>
                  </div>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.InsuranceRejected && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitToInsurance)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9"
                  >
                    إعادة التقديم للتأمين
                  </Button>
                )}

                {(workflow.stage === VehicleAccidentWorkflowStage.InsuranceApproved ||
                  workflow.stage === VehicleAccidentWorkflowStage.TotalLossValued) && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitToSupplier)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9"
                  >
                    تسليم لشركة الشراء (بدء 10 أيام)
                  </Button>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingSupplierTransfer && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ConfirmTransfer)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9"
                  >
                    تأكيد وصول التحويل
                  </Button>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.RepairDirected && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.StartRepair)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9"
                  >
                    بدء الإصلاح
                  </Button>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.Repairing && (
                  <div className="flex gap-1.5">
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RepairProgress)}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold h-9"
                    >
                      تحديث متابعة
                    </Button>
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.CompleteRepair)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9"
                    >
                      إتمام الإصلاح
                    </Button>
                  </div>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.TotalLossProposed && (
                  <div className="flex gap-1.5">
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RequestReinspection)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9"
                    >
                      طلب إعادة فحص
                    </Button>
                    <Button
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ConfirmTotalLoss)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9"
                    >
                      تأكيد الإتلاف
                    </Button>
                  </div>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.TotalLossConfirmed && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RecordVehicleCollection)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9"
                  >
                    محضر استلام الجهة للمركبة
                  </Button>
                )}

                {workflow.stage === VehicleAccidentWorkflowStage.AwaitingValuation && (
                  <Button
                    onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RecordValuation)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9"
                  >
                    تسجيل التقدير المالي
                  </Button>
                )}
              </>
            )}

            <Button
              variant="secondary"
              onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.FollowUp)}
              className="h-9 px-3 text-xs flex items-center gap-1.5"
            >
              متابعة عامة
            </Button>
          </div>
        </div>
      )}

      {/* Streamlined Tabs Navigation (4 Clean Tabs Instead of 7) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>بيانات الحادث والمطالبة</span>
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "documents"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>المستندات والمرفقات ({((workflow.attachments || []).length) + (workflow.sourceDocuments ? 3 : 0)})</span>
        </button>

        <button
          onClick={() => setActiveTab("installments")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "installments"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>استرداد الأقساط</span>
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "timeline"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <History className="h-4 w-4" />
          <span>سجل العمليات</span>
        </button>
      </div>

      {/* Tab 1: Comprehensive Incident & Claim Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Incident details */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    تفاصيل تقرير الحادث الميداني
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    onClick={handleLiveViewPdf}
                    className="h-8 px-2.5 text-xs flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                  >
                    <Eye className="h-3 w-3" /> معاينة
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleDownloadPdf}
                    className="h-8 px-2.5 text-xs flex items-center gap-1 font-semibold"
                  >
                    <Download className="h-3 w-3" /> PDF
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">تقرير المرور / نجم:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {accident.policeReportNumber || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">مطالبة التأمين المبدئي:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {accident.insuranceClaimNumber || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">حالة قيادة المركبة:</span>
                  <span className="font-bold">
                    {accident.summary.isDrivable ? (
                      <span className="text-emerald-600">قابلة للقيادة</span>
                    ) : (
                      <span className="text-red-600">غير قابلة للقيادة (سطحة)</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">الإصابات:</span>
                  <span className="font-bold">
                    {accident.hasInjuries ? (
                      <span className="text-red-600">{accident.injuryDetails || "يوجد إصابات"}</span>
                    ) : (
                      <span className="text-emerald-600">سليم بدون إصابات</span>
                    )}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-0.5">موقع الحادث:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {accident.summary.locationDescription || "—"}
                  </span>
                </div>
              </div>

              {(accident.narrative || accident.damageDescription) && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {accident.narrative && (
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        سرد تفاصيل الحادث:
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl leading-relaxed">
                        {accident.narrative}
                      </p>
                    </div>
                  )}
                  {accident.damageDescription && (
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        وصف الضرر الظاهر:
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl leading-relaxed">
                        {accident.damageDescription}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Card 2: Najm Fault Assessment */}
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
                    {new Date(workflow.fault.assessedAtUtc).toLocaleDateString("ar-SA")}
                  </span>
                )}
              </div>

              {workflow.fault ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                    <span className="font-semibold">نسبة خطأ المندوب (السائق):</span>
                    <span className="font-mono text-base font-black text-red-600">
                      {workflow.fault.riderFaultPercentage}%
                    </span>
                  </div>

                  {workflow.fault.otherParties && workflow.fault.otherParties.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700 dark:text-slate-300">
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
                    <p className="text-slate-400">لا توجد أطراف أخرى مسجلة</p>
                  )}

                  {workflow.fault.notes && (
                    <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                      <strong>ملاحظات نجم:</strong> {workflow.fault.notes}
                    </p>
                  )}

                  {workflow.fault.najmAttachmentId && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleLiveViewAttachment(workflow.fault!.najmAttachmentId!, "تقرير نجم PDF")}
                        className="flex-1 text-xs flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" /> معاينة تقرير نجم
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleDownloadAttachment(workflow.fault!.najmAttachmentId!)}
                        className="flex-1 text-xs flex items-center justify-center gap-1.5 font-semibold"
                      >
                        <Download className="h-3.5 w-3.5" /> تحميل التقرير
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  لم يتم تسجيل تقرير نجم بعد
                </div>
              )}
            </Card>
          </div>

          {/* Card 3: Claim & Financial Settlement */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  بيانات المطالبة والتسوية المالية
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-slate-400 block">نوع المطالبة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {workflow.claim?.requestedType === 1 ? "إصلاح المركبة" : "طلب تعويض مالي"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-slate-400 block">رقم المطالبة (المرجع):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {workflow.claim?.number || "لم يُسجل بعد"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-slate-400 block">شركة شراء المركبة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {workflow.claim?.supplierName || "—"}
                </span>
              </div>

              {workflow.fault?.openingFeeAmount && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 space-y-1 text-amber-800 dark:text-amber-200">
                  <span className="block text-amber-600 dark:text-amber-400">رسوم فتح المطالبة:</span>
                  <span className="font-bold font-mono">{workflow.fault.openingFeeAmount} ريال</span>
                </div>
              )}

              {workflow.settlement?.amount && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 space-y-1 text-purple-800 dark:text-purple-200">
                  <span className="block text-purple-600 dark:text-purple-400">مبلغ عرض التعويض:</span>
                  <span className="font-bold font-mono">{workflow.settlement.amount} ريال</span>
                </div>
              )}

              {workflow.settlement?.transferReceivedAmount && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 space-y-1 text-emerald-800 dark:text-emerald-200">
                  <span className="block text-emerald-600 dark:text-emerald-400">المبلغ المستلم بحسابنا:</span>
                  <span className="font-bold font-mono">{workflow.settlement.transferReceivedAmount} ريال</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Consolidated Documents, Towing & Attachments */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Driver & Vehicle System Documents */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  وثائق السائق والمركبة من النظام
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Iqama */}
              {(() => {
                const isAvailable = Boolean(hrDocs.iqama?.id || workflow.sourceDocuments?.iqama?.versionId);
                const fileName = hrDocs.iqama?.name || workflow.sourceDocuments?.iqama?.originalFileName;
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">إقامة المندوب</span>
                        {isAvailable ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">متوفرة بالنظام</Badge>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">غير متوفرة</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate" title={fileName || ""}>
                        {fileName || "لا يوجد ملف مسجل"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {isAvailable ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={handleLiveViewIqama}
                            className="flex-1 text-xs flex items-center justify-center gap-1 h-8 font-semibold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            <Eye className="h-3.5 w-3.5" /> معاينة
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleDownloadIqama}
                            className="flex-1 text-xs flex items-center justify-center gap-1 h-8 font-semibold"
                          >
                            <Download className="h-3.5 w-3.5" /> تحميل
                          </Button>
                        </>
                      ) : null}
                      {targetEmployeeId && (
                        <Link
                          href={`/admin/employees/${targetEmployeeId}`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="فتح ملف الموظف في الموارد البشرية"
                        >
                          <span>ملف HR</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* License */}
              {(() => {
                const isAvailable = Boolean(hrDocs.license?.id || workflow.sourceDocuments?.license?.versionId);
                const fileName = hrDocs.license?.name || workflow.sourceDocuments?.license?.originalFileName;
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">رخصة القيادة</span>
                        {isAvailable ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">متوفرة بالنظام</Badge>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">غير متوفرة</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate" title={fileName || ""}>
                        {fileName || "لا يوجد ملف مسجل"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {isAvailable ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={handleLiveViewLicense}
                            className="flex-1 text-xs flex items-center justify-center gap-1 h-8 font-semibold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            <Eye className="h-3.5 w-3.5" /> معاينة
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleDownloadLicense}
                            className="flex-1 text-xs flex items-center justify-center gap-1 h-8 font-semibold"
                          >
                            <Download className="h-3.5 w-3.5" /> تحميل
                          </Button>
                        </>
                      ) : null}
                      {targetEmployeeId && (
                        <Link
                          href={`/admin/employees/${targetEmployeeId}`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="فتح ملف الموظف في الموارد البشرية"
                        >
                          <span>ملف HR</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Registration */}
              {(() => {
                const isAvailable = Boolean(vehicleIstimara?.id || workflow.sourceDocuments?.registration?.versionId);
                const fileName = vehicleIstimara?.name || workflow.sourceDocuments?.registration?.originalFileName;
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">استمارة المركبة</span>
                        {isAvailable ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">متوفرة بالنظام</Badge>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">غير متوفرة</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate" title={fileName || ""}>
                        {fileName || "لا يوجد ملف مسجل"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {isAvailable ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={handleLiveViewIstimara}
                            className="flex-1 text-xs flex items-center justify-center gap-1 h-8 font-semibold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            <Eye className="h-3.5 w-3.5" /> معاينة
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleDownloadIstimara}
                            className="flex-1 text-xs flex items-center justify-center gap-1 h-8 font-semibold"
                          >
                            <Download className="h-3.5 w-3.5" /> تحميل
                          </Button>
                        </>
                      ) : null}
                      {accident.summary.vehicleId && (
                        <Link
                          href={`/admin/fleet/vehicles/${accident.summary.vehicleId}`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="فتح ملف المركبة في الأسطول"
                        >
                          <span>ملف المركبة</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* Towing Trips & Receipts */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  إيصالات السطحة ورحلات نقل المركبة ({towingAttachments.length})
                </h3>
              </div>
              {can("fleet.accidents.report") && (
                <Button
                  onClick={() => setIsTowingModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5 font-bold h-8"
                >
                  <Plus className="h-3.5 w-3.5" /> إضافة إيصال سطحة
                </Button>
              )}
            </div>

            {towingAttachments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Truck className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p className="font-semibold">لا توجد إيصالات سطحة مسجلة لهذا الحادث</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">وصف الرحلة</th>
                      <th className="px-4 py-3">من</th>
                      <th className="px-4 py-3">إلى</th>
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
                        <td className="px-4 py-3 font-bold text-amber-600 font-mono">
                          {t.amount ? `${t.amount} ريال` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="secondary"
                              onClick={() => handleLiveViewAttachment(t.id, t.description || "إيصال سطحة")}
                              className="h-7 px-2 text-[11px] flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                            >
                              <Eye className="h-3 w-3" /> معاينة
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleDownloadAttachment(t.id)}
                              className="h-7 px-2 text-[11px] flex items-center gap-1 font-semibold"
                            >
                              <Download className="h-3 w-3" /> تنزيل
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* General Attachments & Damage Photos */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  مرفقات وصور الحادث ({(workflow.attachments || []).length})
                </h3>
              </div>
            </div>

            {(workflow.attachments || []).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد مرفقات إضافية مسجلة</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(workflow.attachments || []).map((att) => (
                  <div
                    key={att.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          {formatEvidenceType(att.evidenceType)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {((att.fileSizeBytes ?? 0) / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {att.originalFileName}
                      </h4>
                      {att.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{att.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                      <span>{new Date(att.uploadedAtUtc).toLocaleDateString("ar-SA")}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLiveViewAttachment(att.id, att.originalFileName || "مرفق الحادث")}
                          className="text-emerald-600 hover:underline font-bold flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> معاينة
                        </button>
                        <button
                          onClick={() => handleDownloadAttachment(att.id)}
                          className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" /> تحميل
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Installment Refunds */}
      {activeTab === "installments" && (
        <Card className="p-5 space-y-5">
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
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs flex items-center gap-1.5 font-bold h-9"
                  >
                    <Plus className="h-4 w-4" /> إضافة قسط مدفوع
                  </Button>

                  {workflow.refund?.status === VehicleAccidentRefundStatus.NotSubmitted &&
                    (workflow.refund?.recordedEligibleAmount ?? 0) > 0 && (
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.SubmitInstallmentRefund)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9"
                      >
                        تقديم طلب الاسترداد
                      </Button>
                    )}

                  {workflow.refund?.status === VehicleAccidentRefundStatus.Submitted && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.ReceiveInstallmentRefund)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9"
                      >
                        تسجيل استلام المبلغ
                      </Button>
                      <Button
                        onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.RejectInstallmentRefund)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9"
                      >
                        تسجيل رفض الطلب
                      </Button>
                    </div>
                  )}

                  {workflow.refund?.status === VehicleAccidentRefundStatus.NotSubmitted && (
                    <Button
                      variant="secondary"
                      onClick={() => handleOpenAction(VehicleAccidentWorkflowAction.MarkNoInstallments)}
                      className="text-xs text-slate-500 h-9"
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
            <div className="p-10 text-center text-slate-400 text-xs">
              <CreditCard className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="font-semibold">لم يتم تسجيل أي أقساط مدفوعة لهذا الحادث</p>
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
                        {inst.receiptAttachmentId ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="secondary"
                              onClick={() => handleLiveViewAttachment(inst.receiptAttachmentId, "إيصال سداد القسط")}
                              className="h-7 px-2 text-[11px] flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                              title="معاينة إيصال القسط"
                            >
                              <Eye className="h-3 w-3" /> معاينة
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleDownloadAttachment(inst.receiptAttachmentId)}
                              className="h-7 px-2 text-[11px] flex items-center gap-1 font-semibold"
                              title="تحميل إيصال القسط"
                            >
                              <Download className="h-3 w-3" /> الإيصال
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Activity Timeline */}
      {activeTab === "timeline" && (
        <Card className="p-5 space-y-5">
          <div className="border-b pb-3 dark:border-slate-800">
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
                          {formatWorkflowActionName(entry.eventType ?? entry.action ?? (0 as any))}
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

      {/* Universal Live View Modal */}
      {previewModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={handleClosePreview}
        >
          <div
            className="relative flex flex-col h-[88vh] w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                    {previewModal.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-slate-400">
                      {previewModal.contentType || "معاينة حية للمستند"}
                    </span>
                    {previewModal.loading && (
                      <span className="text-[11px] text-blue-600 animate-pulse font-medium">
                        (جارٍ التحميل...)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewModal.url && (
                  <a
                    href={previewModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                    title="فتح في علامة تبويب جديدة"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>نافذة خارجية</span>
                  </a>
                )}
                {previewModal.onDownload && (
                  <Button
                    variant="secondary"
                    onClick={previewModal.onDownload}
                    className="h-8 px-3 text-xs gap-1.5 font-bold"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>تحميل الملف</span>
                  </Button>
                )}
                <button
                  onClick={handleClosePreview}
                  className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-auto bg-slate-950/5 dark:bg-slate-950/40 p-4 flex items-center justify-center">
              {previewModal.loading ? (
                <div className="text-center space-y-3 p-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    جارٍ إعداد المعاينة المباشرة للمستند...
                  </p>
                </div>
              ) : previewModal.error ? (
                <div className="text-center p-8 max-w-md space-y-4">
                  <AlertTriangle className="h-12 w-12 mx-auto text-amber-500" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      تعذر عرض المعاينة المباشرة
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {previewModal.error}
                    </p>
                  </div>
                  {previewModal.onDownload && (
                    <Button onClick={previewModal.onDownload} className="gap-2 text-xs font-bold">
                      <Download className="h-3.5 w-3.5" /> تنزيل الملف بدلاً من ذلك
                    </Button>
                  )}
                </div>
              ) : previewModal.url ? (
                previewModal.contentType?.startsWith("image/") ? (
                  <img
                    src={previewModal.url}
                    alt={previewModal.title}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
                  />
                ) : previewModal.contentType?.includes("pdf") ? (
                  <iframe
                    src={previewModal.url}
                    title={previewModal.title}
                    className="h-full w-full rounded-2xl bg-white border border-slate-200 dark:border-slate-800 shadow-sm"
                  />
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <FileText className="h-16 w-16 mx-auto text-slate-400" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      المعاينة المباشرة مخصصة لملفات الصور ومستندات PDF.
                    </p>
                    {previewModal.onDownload && (
                      <Button onClick={previewModal.onDownload} className="gap-2 text-xs font-bold">
                        <Download className="h-4 w-4" /> تنزيل الملف
                      </Button>
                    )}
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
