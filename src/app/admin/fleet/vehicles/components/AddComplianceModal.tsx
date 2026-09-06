"use client";

import { useState, useEffect, useTransition } from "react";
import {
  addVehicleRegistration,
  addVehicleInsurance,
  addVehicleInspection,
  renewVehicleOperationCard,
  uploadVehicleFile,
} from "@/lib/fleet/api";
import {
  VehicleInspectionResult,
  VehicleRegistrationType,
  type VehicleRegistrationRequest,
  type VehicleInsuranceRequest,
  type VehicleInspectionRequest,
  type VehicleOperationCardRequest,
} from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { FileText, ShieldCheck, Wrench, CreditCard, UploadCloud, X } from "lucide-react";

export type ComplianceTabType = "Registration" | "InsurancePolicy" | "Inspection" | "OperationCard";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicleId: string;
  initialType?: ComplianceTabType;
  registrationType?: VehicleRegistrationType | number | null;
}

export function AddComplianceModal({
  isOpen,
  onClose,
  onSuccess,
  vehicleId,
  initialType = "Registration",
  registrationType,
}: Props) {
  const [activeTab, setActiveTab] = useState<ComplianceTabType>(initialType);
  const [isPending, startTransition] = useTransition();

  const isPublicTransport =
    registrationType === VehicleRegistrationType.PublicTransport ||
    registrationType === VehicleRegistrationType.PublicBus;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);
      setSelectedFile(null);
    }
  }, [isOpen, initialType]);

  // Attached File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Registration Form State
  const [regForm, setRegForm] = useState<VehicleRegistrationRequest>({
    registrationNumber: "",
    issuingAuthority: "المرور",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "",
  });

  // Insurance Form State
  const [insForm, setInsForm] = useState<VehicleInsuranceRequest>({
    providerName: "",
    policyNumber: "",
    coverageType: "شامل",
    effectiveFrom: new Date().toISOString().split("T")[0],
    expiryDate: "",
    claimReference: "",
    claimContact: "",
    notes: "",
  });

  // Inspection Form State
  const [inspForm, setInspForm] = useState<VehicleInspectionRequest>({
    inspectionNumber: "",
    stationName: "",
    inspectionDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    result: VehicleInspectionResult.Passed,
    odometer: 0,
    failureNotes: "",
    notes: "",
  });

  // Operation Card Form State
  const [opCardForm, setOpCardForm] = useState<VehicleOperationCardRequest>({
    cardNumber: "",
    issuingAuthority: "الهيئة العامة للنقل",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        if (activeTab === "Registration") {
          if (!regForm.registrationNumber.trim()) {
            toast.error("خطأ في البيانات", "يرجى إدخال رقم الاستمارة");
            return;
          }
          if (!regForm.issuingAuthority?.trim()) {
            toast.error("خطأ في البيانات", "يرجى إدخال جهة الإصدار (مثل: المرور - الرياض)");
            return;
          }
          if (!regForm.issueDate || !regForm.expiryDate) {
            toast.error("خطأ في البيانات", "يرجى اختيار تاريخ الإصدار وتاريخ الانتهاء");
            return;
          }
          await addVehicleRegistration(vehicleId, {
            ...regForm,
            registrationNumber: regForm.registrationNumber.trim(),
            issuingAuthority: regForm.issuingAuthority.trim(),
            notes: regForm.notes?.trim() || null,
          });

          // Upload attached Istimara file if provided
          if (selectedFile) {
            if (selectedFile.size > 10 * 1024 * 1024) {
              toast.error("حجم الملف كبير", "حجم ملف الاستمارة يتجاوز 10 ميجابايت.");
            } else {
              const formData = new FormData();
              formData.append("file", selectedFile);
              await uploadVehicleFile(vehicleId, "Istimara", formData);
            }
          }
        } else if (activeTab === "InsurancePolicy") {
          if (!insForm.providerName.trim()) {
            toast.error("خطأ في البيانات", "يرجى إدخال اسم شركة التأمين");
            return;
          }
          if (!insForm.policyNumber.trim()) {
            toast.error("خطأ في البيانات", "يرجى إدخال رقم البوليصة");
            return;
          }
          if (!insForm.effectiveFrom || !insForm.expiryDate) {
            toast.error("خطأ في البيانات", "يرجى اختيار تاريخ بداية وتاريخ انتهاء البوليصة");
            return;
          }
          await addVehicleInsurance(vehicleId, {
            ...insForm,
            providerName: insForm.providerName.trim(),
            policyNumber: insForm.policyNumber.trim(),
            coverageType: insForm.coverageType?.trim() || null,
            claimReference: insForm.claimReference?.trim() || null,
            claimContact: insForm.claimContact?.trim() || null,
            notes: insForm.notes?.trim() || null,
          });
        } else if (activeTab === "Inspection") {
          if (!inspForm.inspectionNumber.trim()) {
            toast.error("خطأ في البيانات", "يرجى إدخال رقم الفحص الدوري");
            return;
          }
          if (!inspForm.inspectionDate || !inspForm.expiryDate) {
            toast.error("خطأ في البيانات", "يرجى اختيار تاريخ الفحص وتاريخ الانتهاء");
            return;
          }
          await addVehicleInspection(vehicleId, {
            ...inspForm,
            inspectionNumber: inspForm.inspectionNumber.trim(),
            stationName: inspForm.stationName?.trim() || null,
            failureNotes: inspForm.failureNotes?.trim() || null,
            notes: inspForm.notes?.trim() || null,
          });
        } else if (activeTab === "OperationCard") {
          if (!opCardForm.cardNumber.trim()) {
            toast.error("خطأ في البيانات", "يرجى إدخال رقم كرت التشغيل");
            return;
          }
          if (!opCardForm.issueDate || !opCardForm.expiryDate) {
            toast.error("خطأ في البيانات", "يرجى اختيار تاريخ الإصدار وتاريخ الانتهاء");
            return;
          }
          await renewVehicleOperationCard(vehicleId, {
            cardNumber: opCardForm.cardNumber.trim(),
            issuingAuthority: opCardForm.issuingAuthority?.trim() || null,
            issueDate: opCardForm.issueDate,
            expiryDate: opCardForm.expiryDate,
            notes: opCardForm.notes?.trim() || null,
          });

          if (selectedFile) {
            if (selectedFile.size > 10 * 1024 * 1024) {
              toast.error("حجم الملف كبير", "حجم ملف كرت التشغيل يتجاوز 10 ميجابايت.");
            } else {
              const formData = new FormData();
              formData.append("file", selectedFile);
              await uploadVehicleFile(vehicleId, "OperationCard", formData);
            }
          }
        }

        onSuccess();
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تحديث بيانات الالتزام والتراخيص"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 pt-2">
        {/* Type Selector Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("Registration")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "Registration"
                ? "bg-white dark:bg-slate-900 text-[#1167c9] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>استمارة السير</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("InsurancePolicy")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "InsurancePolicy"
                ? "bg-white dark:bg-slate-900 text-[#1167c9] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>بوليصة التأمين</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("Inspection")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "Inspection"
                ? "bg-white dark:bg-slate-900 text-[#1167c9] shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Wrench className="h-4 w-4 text-orange-500" />
            <span>الفحص الدوري</span>
          </button>
          {isPublicTransport && (
            <button
              type="button"
              onClick={() => setActiveTab("OperationCard")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === "OperationCard"
                  ? "bg-white dark:bg-slate-900 text-[#1167c9] shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <span>كرت التشغيل</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Registration Form */}
          {activeTab === "Registration" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    رقم الاستمارة <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={regForm.registrationNumber}
                    onChange={(e) => setRegForm({ ...regForm, registrationNumber: e.target.value })}
                    placeholder="مثال: REG-102938"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    جهة الإصدار <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={regForm.issuingAuthority || ""}
                    onChange={(e) => setRegForm({ ...regForm, issuingAuthority: e.target.value })}
                    placeholder="مثال: المرور - الرياض"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ الإصدار <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={regForm.issueDate}
                    onChange={(e) => setRegForm({ ...regForm, issueDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ الانتهاء <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={regForm.expiryDate}
                    onChange={(e) => setRegForm({ ...regForm, expiryDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  إرفاق وثيقة الاستمارة (اختياري)
                </label>
                {!selectedFile ? (
                  <label className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4 text-center cursor-pointer hover:border-[#1167c9] hover:bg-blue-50/30 transition-all">
                    <UploadCloud className="h-6 w-6 text-[#1167c9] mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      اضغط لاختيار ملف الاستمارة
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      (PDF, JPG, PNG - بحجم أقصى 10MB)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="truncate text-right">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {selectedFile.name}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">ملاحظات</label>
                <Input
                  value={regForm.notes || ""}
                  onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
            </div>
          )}

          {/* Insurance Form */}
          {activeTab === "InsurancePolicy" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    شركة التأمين <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={insForm.providerName}
                    onChange={(e) => setInsForm({ ...insForm, providerName: e.target.value })}
                    placeholder="مثال: التعاونية للتأمين"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    رقم بوليصة التأمين <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={insForm.policyNumber}
                    onChange={(e) => setInsForm({ ...insForm, policyNumber: e.target.value })}
                    placeholder="مثال: POL-2026-99"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    نوع التغطية
                  </label>
                  <SearchableSelect
                    options={[
                      { value: "شامل", label: "تأمين شامل" },
                      { value: "ضد الغير", label: "تأمين ضد الغير (ثالث)" },
                      { value: "أخرى", label: "أخرى" },
                    ]}
                    value={insForm.coverageType || "شامل"}
                    onChange={(val) => setInsForm({ ...insForm, coverageType: val })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ بداية التغطية <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={insForm.effectiveFrom}
                    onChange={(e) => setInsForm({ ...insForm, effectiveFrom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ انتهاء التغطية <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={insForm.expiryDate}
                    onChange={(e) => setInsForm({ ...insForm, expiryDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    رقم التواصل مع المطالبات
                  </label>
                  <Input
                    value={insForm.claimContact || ""}
                    onChange={(e) => setInsForm({ ...insForm, claimContact: e.target.value })}
                    placeholder="مثال: 920000000"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">ملاحظات</label>
                <Input
                  value={insForm.notes || ""}
                  onChange={(e) => setInsForm({ ...insForm, notes: e.target.value })}
                  placeholder="ملاحظات تفصيلية حول البوليصة..."
                />
              </div>
            </div>
          )}

          {/* Inspection Form */}
          {activeTab === "Inspection" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    رقم شهادة الفحص الدوري <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={inspForm.inspectionNumber}
                    onChange={(e) => setInspForm({ ...inspForm, inspectionNumber: e.target.value })}
                    placeholder="مثال: INSP-2026-88"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    محطة / مركز الفحص
                  </label>
                  <Input
                    value={inspForm.stationName || ""}
                    onChange={(e) => setInspForm({ ...inspForm, stationName: e.target.value })}
                    placeholder="مثال: محطة الفحص الدوري بالرياض"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    نتيجة الفحص <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={[
                      { value: VehicleInspectionResult.Passed.toString(), label: "اجتاز الفحص بنجاح" },
                      { value: VehicleInspectionResult.Conditional.toString(), label: "اجتاز بملاحظات مشروطة" },
                      { value: VehicleInspectionResult.Failed.toString(), label: "لم يجتز الفحص (راسب)" },
                    ]}
                    value={inspForm.result.toString()}
                    onChange={(val) => setInspForm({ ...inspForm, result: parseInt(val) as VehicleInspectionResult })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    قراءة العداد وقت الفحص (كم) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={inspForm.odometer}
                    onChange={(e) => setInspForm({ ...inspForm, odometer: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ الفحص <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={inspForm.inspectionDate}
                    onChange={(e) => setInspForm({ ...inspForm, inspectionDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ الانتهاء <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={inspForm.expiryDate}
                    onChange={(e) => setInspForm({ ...inspForm, expiryDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              {inspForm.result === VehicleInspectionResult.Failed && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-red-600">أسباب عدم الاجتياز / النواقص</label>
                  <Input
                    value={inspForm.failureNotes || ""}
                    onChange={(e) => setInspForm({ ...inspForm, failureNotes: e.target.value })}
                    placeholder="تفاصيل الأعطال أو الملاحظات التي تسببت برفض الفحص..."
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">ملاحظات</label>
                <Input
                  value={inspForm.notes || ""}
                  onChange={(e) => setInspForm({ ...inspForm, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>
          )}

          {/* Operation Card Form */}
          {activeTab === "OperationCard" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    رقم كرت التشغيل <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={opCardForm.cardNumber}
                    onChange={(e) => setOpCardForm({ ...opCardForm, cardNumber: e.target.value })}
                    placeholder="مثال: OPC-998877"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    جهة الإصدار
                  </label>
                  <Input
                    value={opCardForm.issuingAuthority || ""}
                    onChange={(e) => setOpCardForm({ ...opCardForm, issuingAuthority: e.target.value })}
                    placeholder="مثال: الهيئة العامة للنقل"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ الإصدار <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={opCardForm.issueDate}
                    onChange={(e) => setOpCardForm({ ...opCardForm, issueDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تاريخ الانتهاء <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={opCardForm.expiryDate}
                    onChange={(e) => setOpCardForm({ ...opCardForm, expiryDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  إرفاق ملف كرت التشغيل (اختياري)
                </label>
                {!selectedFile ? (
                  <label className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4 text-center cursor-pointer hover:border-[#1167c9] hover:bg-blue-50/30 transition-all">
                    <UploadCloud className="h-6 w-6 text-[#1167c9] mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      اضغط لاختيار ملف كرت التشغيل
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      (PDF, JPG, PNG - بحجم أقصى 10MB)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="truncate text-right">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {selectedFile.name}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">ملاحظات</label>
                <Input
                  value={opCardForm.notes || ""}
                  onChange={(e) => setOpCardForm({ ...opCardForm, notes: e.target.value })}
                  placeholder="ملاحظات حول كرت التشغيل..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#1167c9] hover:bg-[#0e56a8] px-8">
              {isPending ? "جارٍ الحفظ..." : "حفظ التحديث"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
