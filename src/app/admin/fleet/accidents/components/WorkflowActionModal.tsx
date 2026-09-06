"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  executeWorkflowAction,
  uploadWorkflowAttachment,
  getVehicleSuppliers,
} from "@/lib/fleet/api";
import {
  VehicleAccidentWorkflowAction,
  VehicleAccidentEvidenceType,
  VehicleAccidentClaimType,
  VehicleAccidentWorkflowDetailResponse,
  VehicleAccidentDetailResponse,
  VehicleSupplierResponse,
  OtherPartyFault,
} from "@/lib/fleet/types";
import { formatWorkflowActionName } from "@/lib/fleet/formatters";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import {
  Upload,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Phone,
} from "lucide-react";

interface WorkflowActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accidentId: string;
  action: VehicleAccidentWorkflowAction;
  workflow: VehicleAccidentWorkflowDetailResponse;
  accident: VehicleAccidentDetailResponse | null;
  onSuccess: () => void;
}

export function WorkflowActionModal({
  isOpen,
  onClose,
  accidentId,
  action,
  workflow,
  accident,
  onSuccess,
}: WorkflowActionModalProps) {
  const [isPending, startTransition] = useTransition();

  // Common fields
  const [notes, setNotes] = useState("");
  const [occurredAtUtc, setOccurredAtUtc] = useState(
    new Date().toISOString().substring(0, 16)
  );

  // File upload for required attachment
  const [file, setFile] = useState<File | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string>("");

  // Action 1: AssessFault
  const [riderFaultPercentage, setRiderFaultPercentage] = useState<number>(100);
  const [otherParties, setOtherParties] = useState<OtherPartyFault[]>([]);

  // Action 4: OpenClaim
  const [claimType, setClaimType] = useState<VehicleAccidentClaimType>(
    VehicleAccidentClaimType.Repair
  );
  const [suppliers, setSuppliers] = useState<VehicleSupplierResponse[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  // Action 5, 21, 22: Reference
  const [reference, setReference] = useState("");

  // Amounts
  const [amount, setAmount] = useState<number | "">("");

  // Action 12, 17: Location & Contact / Appointment
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [appointmentAtUtc, setAppointmentAtUtc] = useState(
    new Date().toISOString().substring(0, 16)
  );

  // Load suppliers for Action 4
  useEffect(() => {
    if (action === VehicleAccidentWorkflowAction.OpenClaim) {
      getVehicleSuppliers()
        .then((res) => setSuppliers(res || []))
        .catch(() => setSuppliers([]));
    }
  }, [action]);

  // Set default values when opened
  useEffect(() => {
    if (isOpen) {
      setNotes("");
      setOccurredAtUtc(new Date().toISOString().substring(0, 16));
      setFile(null);
      setSelectedAttachmentId("");
      setReference("");
      setLocation("");
      setContact("");

      // Action 1 defaults
      if (action === VehicleAccidentWorkflowAction.AssessFault) {
        setRiderFaultPercentage(workflow.fault?.riderFaultPercentage ?? 100);
        setOtherParties(workflow.fault?.otherParties || []);
      }

      // Action 4 defaults: if 100% rider fault and non-minor, fee is 2500
      const is100Rider = (workflow.fault?.riderFaultPercentage ?? 0) === 100;
      const isNonMinor = (accident?.summary?.severity ?? 1) > 1;
      if (action === VehicleAccidentWorkflowAction.OpenClaim && is100Rider && isNonMinor) {
        setAmount(2500);
      } else if (action === VehicleAccidentWorkflowAction.SubmitInstallmentRefund) {
        setAmount(workflow.refund?.totalEligibleRefundAmount ?? 0);
      } else if (action === VehicleAccidentWorkflowAction.ConfirmTransfer) {
        setAmount(workflow.settlement?.compensationOfferAmount ?? "");
      } else {
        setAmount("");
      }
    }
  }, [isOpen, action, workflow, accident]);

  // Calculations for Action 1: Total Fault Percentage
  const otherPartiesTotal = otherParties.reduce(
    (sum, p) => sum + (Number(p.faultPercentage) || 0),
    0
  );
  const totalFaultPercentage = Number(riderFaultPercentage) + otherPartiesTotal;

  // Determine required evidence type for the current action
  const getRequiredEvidenceType = (): VehicleAccidentEvidenceType | null => {
    switch (action) {
      case VehicleAccidentWorkflowAction.AssessFault:
        return VehicleAccidentEvidenceType.NajmReport;
      case VehicleAccidentWorkflowAction.StartLocalRepair:
        return VehicleAccidentEvidenceType.DamagePromissoryNote;
      case VehicleAccidentWorkflowAction.CompleteLocalRepair:
      case VehicleAccidentWorkflowAction.CompleteRepair:
        return VehicleAccidentEvidenceType.RepairCompletion;
      case VehicleAccidentWorkflowAction.OpenClaim: {
        const is100Rider = (workflow.fault?.riderFaultPercentage ?? 0) === 100;
        const isNonMinor = (accident?.summary?.severity ?? 1) > 1;
        return is100Rider && isNonMinor ? VehicleAccidentEvidenceType.ClaimOpeningFeeReceipt : null;
      }
      case VehicleAccidentWorkflowAction.SubmitClaim:
      case VehicleAccidentWorkflowAction.SubmitToSupplier:
        return VehicleAccidentEvidenceType.ClaimSubmissionReport;
      case VehicleAccidentWorkflowAction.ReceiveCompensationOffer:
      case VehicleAccidentWorkflowAction.ProposeTotalLoss:
        return VehicleAccidentEvidenceType.AssessmentReceipt;
      case VehicleAccidentWorkflowAction.ApproveInsurance:
        return VehicleAccidentEvidenceType.PaymentReceipt;
      case VehicleAccidentWorkflowAction.RejectInsurance:
      case VehicleAccidentWorkflowAction.RejectInstallmentRefund:
        return VehicleAccidentEvidenceType.InsuranceDecision;
      case VehicleAccidentWorkflowAction.ConfirmTransfer:
        return VehicleAccidentEvidenceType.TransferReceipt;
      case VehicleAccidentWorkflowAction.ReceiveRepairDirection:
        return VehicleAccidentEvidenceType.RepairDirection;
      case VehicleAccidentWorkflowAction.ConfirmTotalLoss:
        return VehicleAccidentEvidenceType.TotalLossConfirmation;
      case VehicleAccidentWorkflowAction.RecordVehicleCollection:
        return VehicleAccidentEvidenceType.VehicleCollectionReceipt;
      case VehicleAccidentWorkflowAction.RecordValuation:
        return VehicleAccidentEvidenceType.ValuationReceipt;
      case VehicleAccidentWorkflowAction.SubmitInstallmentRefund:
        return VehicleAccidentEvidenceType.InstallmentRefundRequest;
      case VehicleAccidentWorkflowAction.ReceiveInstallmentRefund:
        return VehicleAccidentEvidenceType.InstallmentRefundReceipt;
      default:
        return null;
    }
  };

  const requiredEvidenceType = getRequiredEvidenceType();

  // Filter existing attachments matching this evidence type
  const matchingAttachments = requiredEvidenceType
    ? workflow.attachments.filter((a) => a.evidenceType === requiredEvidenceType)
    : [];

  const handleAddOtherParty = () => {
    setOtherParties([
      ...otherParties,
      { name: `الطرف ${otherParties.length + 2}`, faultPercentage: 0, vehiclePlate: "", insuranceCompany: "" },
    ]);
  };

  const handleRemoveOtherParty = (index: number) => {
    setOtherParties(otherParties.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!notes.trim()) {
      toast.error("ملاحظات مطلوبة", "حقل الملاحظات إلزامي نظاماً (حتى 1000 حرف).");
      return;
    }

    // Validate Action 1
    if (action === VehicleAccidentWorkflowAction.AssessFault) {
      if (totalFaultPercentage !== 100) {
        toast.error("خطأ في النسب", `مجموع نسب الخطأ يجب أن يساوي 100% بالضبط (المجموع الحالي: ${totalFaultPercentage}%).`);
        return;
      }
    }

    // Validate Action 2
    if (action === VehicleAccidentWorkflowAction.StartLocalRepair) {
      const damagePhotos = workflow.attachments.filter(
        (a) => a.evidenceType === VehicleAccidentEvidenceType.DamagePhoto
      );
      if (damagePhotos.length < 2) {
        toast.error("صور الضرر ناقصة", "يتطلب بدء الإصلاح البسيط صورتي ضرر على الأقل مرفوعتين بالحادث.");
        return;
      }
    }

    // Validate Action 5: Source Documents
    if (action === VehicleAccidentWorkflowAction.SubmitClaim) {
      const { iqama, license, registration } = workflow.sourceDocuments;
      if (!iqama?.versionId || !license?.versionId || !registration?.versionId) {
        toast.error("مستندات غير مكتملة", "لا يمكن تقديم المطالبة قبل توفر كافة مستندات السائق والمركبة (الإقامة، الرخصة، الاستمارة) بالنظام.");
        return;
      }
    }

    // Attachment check if required
    if (requiredEvidenceType && !file && !selectedAttachmentId) {
      toast.error("المستند إلزامي", "يرجى إرفاق أو اختيار المستند المطلوب لإتمام هذه الخطوة.");
      return;
    }

    startTransition(async () => {
      try {
        let finalAttachmentId = selectedAttachmentId;

        // If user uploaded a new file, upload it first
        if (file && requiredEvidenceType) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("evidenceType", String(requiredEvidenceType));
          formData.append("description", `مرفق خطوة: ${formatWorkflowActionName(action)}`);
          const uploadRes = await uploadWorkflowAttachment(accidentId, formData);
          finalAttachmentId = uploadRes.id;
        }

        // Execute workflow action
        await executeWorkflowAction(accidentId, {
          action,
          rowVersion: workflow.rowVersion,
          notes: notes.trim(),
          occurredAtUtc: new Date(occurredAtUtc).toISOString(),
          attachmentId: finalAttachmentId || undefined,
          riderFaultPercentage:
            action === VehicleAccidentWorkflowAction.AssessFault ? Number(riderFaultPercentage) : undefined,
          otherParties:
            action === VehicleAccidentWorkflowAction.AssessFault ? otherParties : undefined,
          claimType:
            action === VehicleAccidentWorkflowAction.OpenClaim ? claimType : undefined,
          supplierId:
            action === VehicleAccidentWorkflowAction.OpenClaim ? selectedSupplierId || undefined : undefined,
          reference: reference || undefined,
          amount: amount !== "" ? Number(amount) : undefined,
          location: location || undefined,
          contact: contact || undefined,
          appointmentAtUtc:
            action === VehicleAccidentWorkflowAction.RequestReinspection
              ? new Date(appointmentAtUtc).toISOString()
              : undefined,
        });

        toast.success("تم بنجاح", "تم تسجيل وتنفيذ الإجراء في دورة العمل بنجاح.");
        onSuccess();
        onClose();
      } catch (err: any) {
        toast.error("فشل تنفيذ الإجراء", err?.message || "حدث خطأ غير متوقع أثناء حفظ الخطوة.");
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formatWorkflowActionName(action)}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-3" dir="rtl">
        {/* Action Specific Fields */}

        {/* Action 1: AssessFault */}
        {action === VehicleAccidentWorkflowAction.AssessFault && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                توزيع نسب المسؤولية حسب تقرير نجم
              </span>
              <span
                className={`rounded-lg px-2.5 py-0.5 text-xs font-black ${
                  totalFaultPercentage === 100
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                }`}
              >
                الإجمالي: {totalFaultPercentage}% {totalFaultPercentage === 100 ? "✓" : "≠ 100%"}
              </span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                نسبة خطأ المندوب (السائق) % <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={riderFaultPercentage}
                onChange={(e) => setRiderFaultPercentage(Number(e.target.value))}
                required
              />
            </div>

            {/* Other Parties */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الأطراف الأخرى في الحادث
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddOtherParty}
                  className="h-7 px-2 text-[11px] flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> إضافة طرف آخر
                </Button>
              </div>

              {otherParties.map((party, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                >
                  <Input
                    placeholder="اسم الطرف"
                    value={party.name}
                    onChange={(e) => {
                      const updated = [...otherParties];
                      updated[idx].name = e.target.value;
                      setOtherParties(updated);
                    }}
                    required
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="النسبة %"
                    value={party.faultPercentage}
                    onChange={(e) => {
                      const updated = [...otherParties];
                      updated[idx].faultPercentage = Number(e.target.value);
                      setOtherParties(updated);
                    }}
                    required
                  />
                  <Input
                    placeholder="رقم اللوحة"
                    value={party.vehiclePlate || ""}
                    onChange={(e) => {
                      const updated = [...otherParties];
                      updated[idx].vehiclePlate = e.target.value;
                      setOtherParties(updated);
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="شركة التأمين"
                      value={party.insuranceCompany || ""}
                      onChange={(e) => {
                        const updated = [...otherParties];
                        updated[idx].insuranceCompany = e.target.value;
                        setOtherParties(updated);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOtherParty(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action 4: OpenClaim */}
        {action === VehicleAccidentWorkflowAction.OpenClaim && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  نوع المطالبة المطلوبة <span className="text-red-500">*</span>
                </label>
                <select
                  value={claimType}
                  onChange={(e) => setClaimType(Number(e.target.value) as VehicleAccidentClaimType)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={VehicleAccidentClaimType.Repair}>إصلاح المركبة (Repair)</option>
                  <option value={VehicleAccidentClaimType.Compensation}>طلب تعويض مالي (Compensation)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  شركة شراء المركبة المرتبطة
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">اعتماد المورد المسجل للمركبة تلقائياً</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameAr || s.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* If 100% rider fault and non-minor, note the 2500 SAR fee */}
            {(workflow.fault?.riderFaultPercentage ?? 0) === 100 && (accident?.summary?.severity ?? 1) > 1 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-bold">رسوم فتح المطالبة (2,500 ريال سعودي):</p>
                <p>
                  نظراً لأن نسبة الخطأ 100% على المندوب والحادث غير بسيط، يلزم نظاماً تسجيل دفع 2,500 ريال وإرفاق سند دفع فتح المطالبة (PDF).
                </p>
              </div>
            )}
          </div>
        )}

        {/* References: Action 5, 21, 22 */}
        {(action === VehicleAccidentWorkflowAction.SubmitClaim ||
          action === VehicleAccidentWorkflowAction.FollowUp ||
          action === VehicleAccidentWorkflowAction.SubmitInstallmentRefund) && (
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              رقم المرجع / رقم المطالبة {action !== VehicleAccidentWorkflowAction.FollowUp && <span className="text-red-500">*</span>}
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثال: CLM-2026-98765"
              required={action !== VehicleAccidentWorkflowAction.FollowUp}
            />
          </div>
        )}

        {/* Amount: Action 2, 6, 11, 20, 21, 22, 23 */}
        {(action === VehicleAccidentWorkflowAction.StartLocalRepair ||
          action === VehicleAccidentWorkflowAction.ReceiveCompensationOffer ||
          action === VehicleAccidentWorkflowAction.ConfirmTransfer ||
          action === VehicleAccidentWorkflowAction.RecordValuation ||
          action === VehicleAccidentWorkflowAction.FollowUp ||
          action === VehicleAccidentWorkflowAction.SubmitInstallmentRefund ||
          action === VehicleAccidentWorkflowAction.ReceiveInstallmentRefund) && (
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              المبلغ بالريال السعودي {action !== VehicleAccidentWorkflowAction.FollowUp && <span className="text-red-500">*</span>}
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="المبلغ بالريال..."
              required={action !== VehicleAccidentWorkflowAction.FollowUp}
              disabled={
                action === VehicleAccidentWorkflowAction.SubmitInstallmentRefund ||
                action === VehicleAccidentWorkflowAction.ConfirmTransfer
              }
            />
          </div>
        )}

        {/* Location & Contact: Action 12 (Repair Direction), Action 17 (Reinspection) */}
        {(action === VehicleAccidentWorkflowAction.ReceiveRepairDirection ||
          action === VehicleAccidentWorkflowAction.RequestReinspection) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                الموقع / الورشة / مركز الفحص <span className="text-red-500">*</span>
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="المدينة، الحي، اسم الورشة..."
                required
              />
            </div>
            {action === VehicleAccidentWorkflowAction.ReceiveRepairDirection ? (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  وسيلة التواصل / مسؤول الورشة <span className="text-red-500">*</span>
                </label>
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="رقم الهاتف أو اسم المهندس..."
                  required
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  موعد إعادة الفحص <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={appointmentAtUtc}
                  onChange={(e) => setAppointmentAtUtc(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* Document Requirement Section */}
        {requiredEvidenceType && (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-600" />
              المستند المطلوب لهذه الخطوة <span className="text-red-500">*</span>
            </span>

            {/* Option to select from previously uploaded attachments of same type */}
            {matchingAttachments.length > 0 && (
              <div className="mb-2">
                <label className="text-[11px] text-slate-500 block mb-1">
                  اختر من المستندات المرفوعة مسبقاً:
                </label>
                <select
                  value={selectedAttachmentId}
                  onChange={(e) => setSelectedAttachmentId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">-- أو ارفع ملفاً جديداً أدناه --</option>
                  {matchingAttachments.map((att) => (
                    <option key={att.id} value={att.id}>
                      {att.originalFileName} ({new Date(att.uploadedAtUtc).toLocaleDateString("ar-SA")})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* File Upload Box */}
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-3.5 text-center hover:border-blue-500 transition-colors dark:border-slate-700 bg-white dark:bg-slate-800">
              <input
                type="file"
                accept=".pdf,image/*"
                id="action-file-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setSelectedAttachmentId("");
                  }
                }}
              />
              <label
                htmlFor="action-file-input"
                className="cursor-pointer flex flex-col items-center gap-1"
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {file ? file.name : "اضغط لرفع ملف المستند المطلوب (PDF أو صورة)"}
                </span>
                <span className="text-[10px] text-slate-400">بحد أقصى 10 ميجابايت</span>
              </label>
            </div>
          </div>
        )}

        {/* Date & Time of Step */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              تاريخ ووقت تنفيذ الخطوة <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              value={occurredAtUtc}
              onChange={(e) => setOccurredAtUtc(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Notes (Always required up to 1000 characters) */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            الملاحظات وتفاصيل الإجراء <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="يرجى كتابة تفاصيل وملاحظات هذا الإجراء..."
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-red-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            required
          />
          <div className="text-left text-[10px] text-slate-400">{notes.length} / 1000 حرف</div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {isPending ? "جارٍ الحفظ والتوثيق..." : "تأكيد تنفيذ الخطوة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
