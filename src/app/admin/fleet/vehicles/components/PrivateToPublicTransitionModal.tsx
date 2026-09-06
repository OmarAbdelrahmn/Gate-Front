"use client";

import { useState, useTransition } from "react";
import { transitionVehicleRegistration } from "@/lib/fleet/api";
import { VehicleRegistrationType, type VehicleDetailResponse } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import {
  FileText,
  UploadCloud,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRightLeft,
  Truck,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle: VehicleDetailResponse;
}

export function PrivateToPublicTransitionModal({
  isOpen,
  onClose,
  onSuccess,
  vehicle,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const summary = vehicle.summary;
  const vehicleId = summary.id;

  // Form State
  const [plateNumberAr, setPlateNumberAr] = useState(summary.plateNumberAr || "");
  const [plateNumberEn, setPlateNumberEn] = useState(summary.plateNumberEn || "");
  const [plateLettersAr, setPlateLettersAr] = useState("");
  const [plateLettersEn, setPlateLettersEn] = useState("");
  const [plateDigits, setPlateDigits] = useState("");

  // Default datetime-local in local timezone (YYYY-MM-DDTHH:mm)
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [effectiveAtLocal, setEffectiveAtLocal] = useState(nowLocal);
  const [reason, setReason] = useState("تحويل المركبة إلى النقل العام");

  // Files
  const [istimaraFile, setIstimaraFile] = useState<File | null>(null);
  const [operationCardFile, setOperationCardFile] = useState<File | null>(null);

  // Requirements checks
  const isPrivateTransport =
    vehicle.registrationType === VehicleRegistrationType.PrivateTransport ||
    summary.registrationType === VehicleRegistrationType.PrivateTransport;

  const hasActiveAssignment = Boolean(
    summary.currentAssignmentId || summary.currentRiderProfileId
  );

  const isValidType = isPrivateTransport;
  const isEligible = isValidType && !hasActiveAssignment;

  const handleReset = () => {
    setPlateNumberAr(summary.plateNumberAr || "");
    setPlateNumberEn(summary.plateNumberEn || "");
    setPlateLettersAr("");
    setPlateLettersEn("");
    setPlateDigits("");
    setEffectiveAtLocal(nowLocal);
    setReason("تحويل المركبة إلى النقل العام");
    setIstimaraFile(null);
    setOperationCardFile(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEligible) {
      toast.error("إجراء غير متاح", "لا يمكن تنفيذ تحويل نوع التسجيل لهذه المركبة نظراً لعدم استيفاء الشروط.");
      return;
    }

    if (!plateNumberAr.trim()) {
      toast.error("بيانات ناقصة", "يرجى إدخال رقم اللوحة بالعربية");
      return;
    }
    if (!plateNumberEn.trim()) {
      toast.error("بيانات ناقصة", "يرجى إدخال رقم اللوحة بالإنجليزية");
      return;
    }
    if (!effectiveAtLocal) {
      toast.error("بيانات ناقصة", "يرجى اختيار تاريخ ووقت سريان التحويل");
      return;
    }
    if (!reason.trim()) {
      toast.error("بيانات ناقصة", "يرجى كتابة سبب التحويل");
      return;
    }
    if (!istimaraFile) {
      toast.error("ملف مفقود", "يرجى إرفاق وثيقة الاستمارة الحالية/الجديدة");
      return;
    }
    if (!operationCardFile) {
      toast.error("ملف مفقود", "يرجى إرفاق كرت التشغيل الخاصة بالنقل العام");
      return;
    }

    // Size check limit: 22 MB
    const totalSizeBytes = (istimaraFile.size || 0) + (operationCardFile.size || 0);
    const maxSizeBytes = 22 * 1024 * 1024;
    if (totalSizeBytes > maxSizeBytes) {
      toast.error("حجم الملفات كبير جداً", "إجمالي حجم الملفات يتجاوز الحد الأقصى المسموح به (22 ميجابايت).");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("plateNumberAr", plateNumberAr.trim());
        formData.append("plateNumberEn", plateNumberEn.trim());

        // Convert local datetime to UTC ISO string
        const effectiveDateObj = new Date(effectiveAtLocal);
        formData.append("effectiveAtUtc", effectiveDateObj.toISOString());

        formData.append("reason", reason.trim());
        formData.append("rowVersion", summary.rowVersion);
        formData.append("istimara", istimaraFile);
        formData.append("operationCard", operationCardFile);

        if (plateLettersAr.trim()) formData.append("plateLettersAr", plateLettersAr.trim());
        if (plateLettersEn.trim()) formData.append("plateLettersEn", plateLettersEn.trim());
        if (plateDigits.trim()) formData.append("plateDigits", plateDigits.trim());

        await transitionVehicleRegistration(vehicleId, formData);
        handleReset();
        onSuccess();
      } catch (err) {
        console.error("Transition error:", err);
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="تحويل نوع تسجيل المركبة إلى نقل عام"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 pt-2">
        {/* Banner Alert */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-base">
                تحويل نوع التسجيل من (نقل خاص) إلى (النقل العام)
              </h4>
              <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                يقوم هذا الإجراء بتحويل نوع تسجيل المركبة الرسمية إلى <span className="font-bold">نقل عام (PublicTransport)</span> وتسجيل التغيير في سجلات تراخيص الأسطول.
              </p>
            </div>
          </div>
        </div>

        {/* Requirements Status Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            isPrivateTransport
              ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
          }`}>
            {isPrivateTransport ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div className="text-xs">
              <div className="font-bold">نوع التسجيل الحالي</div>
              <div>{isPrivateTransport ? "نقل خاص (مؤهل للتحويل)" : "ليس نقل خاص (غير مؤهل)"}</div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            !hasActiveAssignment
              ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
          }`}>
            {!hasActiveAssignment ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div className="text-xs">
              <div className="font-bold">حالة التسليم للمندوب</div>
              <div>{!hasActiveAssignment ? "لا توجد عهدة نشطة (جاهزة للتحويل)" : `مسلّمة للمندوب (${summary.currentRiderName || "عهدة نشطة"})`}</div>
            </div>
          </div>
        </div>

        {!isEligible && (
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>
              تعذر البدء بتحويل نوع التسجيل: يجب أن تكون المركبة مسجلة بنوع (نقل خاص) وألا تكون مسلّمة لأي مندوب حالياً.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Vehicle Plates Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Truck className="h-4 w-4 text-[#1167c9]" />
              بيانات اللوحة الجديدة / الحالية
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  رقم اللوحة بالعربية <span className="text-red-500">*</span>
                </label>
                <Input
                  value={plateNumberAr}
                  onChange={(e) => setPlateNumberAr(e.target.value)}
                  placeholder="مثال: أ ب ج 1234"
                  disabled={!isEligible}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  رقم اللوحة بالإنجليزية <span className="text-red-500">*</span>
                </label>
                <Input
                  value={plateNumberEn}
                  onChange={(e) => setPlateNumberEn(e.target.value)}
                  placeholder="مثال: ABC 1234"
                  disabled={!isEligible}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  أحرف اللوحة بالعربية (اختياري)
                </label>
                <Input
                  value={plateLettersAr}
                  onChange={(e) => setPlateLettersAr(e.target.value)}
                  placeholder="مثال: أ ب ج"
                  disabled={!isEligible}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  أحرف اللوحة بالإنجليزية (اختياري)
                </label>
                <Input
                  value={plateLettersEn}
                  onChange={(e) => setPlateLettersEn(e.target.value)}
                  placeholder="مثال: ABC"
                  disabled={!isEligible}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  أرقام اللوحة (اختياري)
                </label>
                <Input
                  value={plateDigits}
                  onChange={(e) => setPlateDigits(e.target.value)}
                  placeholder="مثال: 1234"
                  disabled={!isEligible}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Effective Date & Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                تاريخ ووقت سريان التحويل (UTC) <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={effectiveAtLocal}
                onChange={(e) => setEffectiveAtLocal(e.target.value)}
                disabled={!isEligible}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                سبب التحويل <span className="text-red-500">*</span>
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="تحويل المركبة إلى النقل العام"
                disabled={!isEligible}
                required
              />
            </div>
          </div>

          {/* Section 3: Required Files */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              الوثائق المطلوبة للتحويل (PDF أو صور - بحد أقصى 22MB)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Istimara File */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  وثيقة الاستمارة (istimara) <span className="text-red-500">*</span>
                </label>

                {!istimaraFile ? (
                  <label className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                    isEligible
                      ? "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-[#1167c9] hover:bg-blue-50/30"
                      : "border-slate-200 bg-slate-100/50 cursor-not-allowed opacity-60"
                  }`}>
                    <UploadCloud className="h-6 w-6 text-[#1167c9] mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      اختيار ملف الاستمارة
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      PDF, JPG, PNG
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      disabled={!isEligible}
                      onChange={(e) => setIstimaraFile(e.target.files?.[0] || null)}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="truncate text-right">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {istimaraFile.name}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                          {(istimaraFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIstimaraFile(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Operation Card File */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  كرت التشغيل (operationCard) <span className="text-red-500">*</span>
                </label>

                {!operationCardFile ? (
                  <label className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                    isEligible
                      ? "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-emerald-600 hover:bg-emerald-50/30"
                      : "border-slate-200 bg-slate-100/50 cursor-not-allowed opacity-60"
                  }`}>
                    <UploadCloud className="h-6 w-6 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      اختيار ملف كرت التشغيل
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      PDF, JPG, PNG
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      disabled={!isEligible}
                      onChange={(e) => setOperationCardFile(e.target.files?.[0] || null)}
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="truncate text-right">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {operationCardFile.name}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                          {(operationCardFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOperationCardFile(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={handleClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={!isEligible || isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>{isPending ? "جارٍ التحويل..." : "تأكيد التحويل إلى نقل عام"}</span>
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
