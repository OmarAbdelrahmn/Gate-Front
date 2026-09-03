"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  VehicleCondition,
  VehicleConditionReport,
  VehicleIssueCategory,
  VehicleIssueSeverity,
} from "@/lib/fleet/types";
import { formatVehicleIssueCategory, formatVehicleIssueSeverity } from "@/lib/fleet/formatters";
import { AlertTriangle, Upload, X, FileText, ShieldAlert } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: VehicleConditionReport, evidenceFiles: File[]) => Promise<void>;
  isSubmitting: boolean;
  endCondition: VehicleCondition;
  vehicleInfo?: {
    assetNumber?: string | null;
    riderName?: string | null;
  } | null;
}

const ACCEPTED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const CATEGORY_OPTIONS = [
  { value: VehicleIssueCategory.Problem.toString(), label: "عطل ميكانيكي / تقني" },
  { value: VehicleIssueCategory.Accident.toString(), label: "حادث" },
  { value: VehicleIssueCategory.Theft.toString(), label: "سرقة" },
  { value: VehicleIssueCategory.Damage.toString(), label: "تلفيات خارجية" },
  { value: VehicleIssueCategory.Administrative.toString(), label: "مشكلة إدارية (أوراق، غرامات...)" },
];

const SEVERITY_OPTIONS = [
  { value: VehicleIssueSeverity.Low.toString(), label: "منخفضة" },
  { value: VehicleIssueSeverity.Medium.toString(), label: "متوسطة" },
  { value: VehicleIssueSeverity.High.toString(), label: "عالية" },
  { value: VehicleIssueSeverity.Critical.toString(), label: "حرجة جداً" },
];

export function VehicleConditionReportModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  endCondition,
  vehicleInfo,
}: Props) {
  const [category, setCategory] = useState<VehicleIssueCategory | null>(null);
  const [severity, setSeverity] = useState<VehicleIssueSeverity | null>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [isRiderResponsible, setIsRiderResponsible] = useState<boolean | null>(null);
  const [estimatedRepairCost, setEstimatedRepairCost] = useState<string>("0");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear modal values when endCondition changes to Good (2) or modal closes
  useEffect(() => {
    if (!isOpen || endCondition === VehicleCondition.Good) {
      setCategory(null);
      setSeverity(null);
      setProblemDescription("");
      setIsRiderResponsible(null);
      setEstimatedRepairCost("0");
      setEvidenceFiles([]);
      setFileError(null);
      setShowConfirmStep(false);
      setValidationError(null);
    }
  }, [isOpen, endCondition]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setValidationError(null);
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const newFiles = [...evidenceFiles];
    let errMessage: string | null = null;

    for (const file of selected) {
      if (newFiles.length >= 2) {
        errMessage = "يُسمح بإرفاق ملفين كحد أقصى لإثبات المشكلة.";
        break;
      }

      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const isValidExt = ACCEPTED_FILE_EXTENSIONS.includes(ext);
      const isValidMime = ACCEPTED_MIME_TYPES.includes(file.type);

      if (!isValidExt && !isValidMime) {
        errMessage = `الملف (${file.name}) غير مدعوم. الصيغ المقبولة: PDF, JPEG, PNG, WebP, GIF, BMP.`;
        break;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errMessage = `حجم الملف (${file.name}) يتجاوز الحد الأقصى المسموح به (10 ميجابايت).`;
        break;
      }

      // Avoid duplicates by name and size
      if (!newFiles.some((f) => f.name === file.name && f.size === file.size)) {
        newFiles.push(file);
      }
    }

    if (errMessage) {
      setFileError(errMessage);
    }

    setEvidenceFiles(newFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFileError(null);
    setValidationError(null);
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation logic
  const isCategoryValid = category !== null;
  const isSeverityValid = severity !== null;
  const isDescriptionValid =
    problemDescription.trim().length >= 1 && problemDescription.trim().length <= 4000;
  const isResponsibilityValid = isRiderResponsible !== null;
  const numCost = parseFloat(estimatedRepairCost);
  const isCostValid = !isNaN(numCost) && numCost >= 0;
  const isFilesValid = evidenceFiles.length >= 1 && evidenceFiles.length <= 2;

  const isFormValid =
    isCategoryValid &&
    isSeverityValid &&
    isDescriptionValid &&
    isResponsibilityValid &&
    isCostValid &&
    isFilesValid;

  const getValidationMessages = (): string[] => {
    const msgs: string[] = [];
    if (category === null) {
      msgs.push("تصنيف المشكلة مطلوب.");
    }
    if (severity === null) {
      msgs.push("الأهمية / الخطورة مطلوبة.");
    }
    if (!problemDescription.trim()) {
      msgs.push("وصف المشكلة مطلوب (1–4000 حرف).");
    } else if (problemDescription.length > 4000) {
      msgs.push("وصف المشكلة يتجاوز 4000 حرف.");
    }
    if (isRiderResponsible === null) {
      msgs.push("يرجى تحديد مسؤولية السائق عن المشكلة (نعم أم لا).");
    }
    if (isNaN(numCost) || numCost < 0) {
      msgs.push("التكلفة التقديرية للإصلاح يجب أن تكون صفر أو أكثر.");
    }
    if (evidenceFiles.length === 0) {
      msgs.push("يرجى رفع ملف إثبات واحد على الأقل (ملف أو ملفان كحد أقصى).");
    } else if (evidenceFiles.length > 2) {
      msgs.push("يُسمح برفع ملفين كحد أقصى.");
    }
    return msgs;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msgs = getValidationMessages();
    if (msgs.length > 0) {
      setValidationError(msgs.join(" "));
      return;
    }
    setValidationError(null);
    setShowConfirmStep(true);
  };

  const handleFinalSubmit = async () => {
    if (!isFormValid || category === null || severity === null || isRiderResponsible === null) return;
    try {
      const report: VehicleConditionReport = {
        category,
        severity,
        problemDescription: problemDescription.trim(),
        isRiderResponsible,
        estimatedRepairCost: Math.round(numCost * 100) / 100,
      };
      await onSubmit(report, evidenceFiles);
    } catch (err: any) {
      console.error("Condition report submit error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تقرير حالة المركبة"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 pt-2">
        {/* Context info banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <span>يتطلب إرجاع/تبديل المركبة بحالة غير جيدة توثيق تقرير حالة</span>
          </div>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            سيتم حفظ العملية وتوثيق المشكلة وحظر التشغيل ورفع الملفات بشكل متكامل وأتوماتيكي.
          </p>
          {vehicleInfo && (
            <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold pt-2 border-t border-amber-200/60 dark:border-amber-900/60">
              {vehicleInfo.assetNumber && <span>المركبة: {vehicleInfo.assetNumber}</span>}
              {vehicleInfo.riderName && <span>المندوب: {vehicleInfo.riderName}</span>}
            </div>
          )}
        </div>

        {/* Live validation summary */}
        <div aria-live="polite" className="sr-only">
          {validationError || fileError}
        </div>
        {(validationError || fileError) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">يرجى تصحيح الأخطاء التالية:</p>
              <p className="mt-0.5">{validationError || fileError}</p>
            </div>
          </div>
        )}

        {!showConfirmStep ? (
          <form onSubmit={handlePreSubmit} className="space-y-4">
            {/* Category & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  تصنيف المشكلة <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={CATEGORY_OPTIONS}
                  value={category !== null ? category.toString() : ""}
                  onChange={(v) => {
                    setCategory(parseInt(v) as VehicleIssueCategory);
                    setValidationError(null);
                  }}
                  placeholder="اختر تصنيف المشكلة..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  الأهمية / الخطورة <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={SEVERITY_OPTIONS}
                  value={severity !== null ? severity.toString() : ""}
                  onChange={(v) => {
                    setSeverity(parseInt(v) as VehicleIssueSeverity);
                    setValidationError(null);
                  }}
                  placeholder="اختر مستوى الأهمية..."
                />
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                ما هي المشكلة؟ <span className="text-red-500">*</span>
              </label>
              <textarea
                value={problemDescription}
                onChange={(e) => {
                  setProblemDescription(e.target.value);
                  setValidationError(null);
                }}
                maxLength={4000}
                rows={4}
                required
                placeholder="أدخل وصفاً تفصيلياً للأضرار أو العطل في المركبة (1–4000 حرف)..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-[#1167c9] focus:outline-none focus:ring-2 focus:ring-[#1167c9]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>يرجى كتابة تفاصيل المشكلة بدقة</span>
                <span>{problemDescription.length} / 4000</span>
              </div>
            </div>

            {/* Rider Responsibility */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                هل السائق مسؤول عن المشكلة؟ <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsRiderResponsible(true);
                    setValidationError(null);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-right transition-all ${
                    isRiderResponsible === true
                      ? "border-red-500 bg-red-50 text-red-900 font-bold dark:bg-red-950/40 dark:text-red-200 dark:border-red-700 ring-2 ring-red-500/20"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isRiderResponsible === true
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isRiderResponsible === true && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">نعم - السائق مسؤول عن المشكلة</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      تم تقييم الأذى أو العطل كناتج عن خطأ أو إهمال السائق
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRiderResponsible(false);
                    setValidationError(null);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-right transition-all ${
                    isRiderResponsible === false
                      ? "border-blue-500 bg-blue-50 text-blue-900 font-bold dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700 ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isRiderResponsible === false
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isRiderResponsible === false && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">لا - المشكلة ميكانيكية / طبيعية</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      عطل طبيعي أو ميكانيكي وليس بسبب خطأ المندوب
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Estimated Repair Cost */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                التكلفة التقديرية للإصلاح (ريال سعودي) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={estimatedRepairCost}
                  onChange={(e) => {
                    setEstimatedRepairCost(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="0.00"
                  required
                  className="font-mono text-left dir-ltr"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                  SAR
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                أدخل المبلغ بالريال السعودي (يمكن أن يكون 0 إذا كانت تكلفة الإصلاح غير محددة أو غير مكلفة).
              </span>
            </div>

            {/* Evidence Files */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                إثبات المشكلة (ملف أو ملفان) <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                الصيغ المسموحة: PDF, JPEG, PNG, WebP, GIF, BMP — الحجم الأقصى للملف: 10 ميجابايت.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp"
                multiple
                className="hidden"
              />

              <div className="space-y-2">
                {evidenceFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 shrink-0 text-[#1167c9]" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" dir="ltr">
                          {file.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-800"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {evidenceFiles.length < 2 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-600 hover:border-[#1167c9] hover:bg-blue-50/40 hover:text-[#1167c9] transition-all dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/40"
                  >
                    <Upload className="h-4 w-4" />
                    <span>
                      {evidenceFiles.length === 0
                        ? "اختيار ملف الإثبات الأول (مطلوب)"
                        : "إضافة ملف إثبات ثاني (اختياري)"}
                    </span>
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                🔒 جميع ملفات الأدلة المرفقة هي أدلة خاصة ومحمية وتخضع لسياسة خصوصية النظام.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                متابعة لتأكيد التقرير
              </Button>
            </div>
          </form>
        ) : (
          /* Confirmation Step */
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
              <div className="flex items-center gap-2 text-base font-bold text-red-800 dark:text-red-300">
                <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
                <span>هل أنت متأكد من توثيق حالة المركبة وحظر التشغيل؟</span>
              </div>
              <p className="mt-2 text-sm text-red-700 dark:text-red-400 leading-relaxed">
                إنهاء العملية بحالة غير جيدة سيقوم بـ:
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-red-800 dark:text-red-300 font-medium">
                <li>إنهاء عهدة المركبة الحالية/القديمة.</li>
                <li>تحويل حالة المركبة تلقائياً إلى <b>إيقاف بسبب مشكلة (ProblemHold)</b>.</li>
                <li>إنشاء بلاغ عطل مفصل وربطه بهذا التعيين بشكل آلي.</li>
                <li>حفظ ملفات الإثبات المرفقة في سجلات العطل.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="font-bold text-slate-800 dark:text-slate-200 border-b pb-2 dark:border-slate-800">
                ملخص تقرير الحالة:
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">تصنيف المشكلة: </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {category !== null ? formatVehicleIssueCategory(category) : "—"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">الأهمية / الخطورة: </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {severity !== null ? formatVehicleIssueSeverity(severity) : "—"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">وصف المشكلة: </span>
                <span className="text-slate-900 dark:text-slate-100">{problemDescription}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">مسؤولية السائق: </span>
                <span className="font-bold">
                  {isRiderResponsible ? "نعم (السائق مسؤول)" : "لا (عطل طبيعي/ميكانيكي)"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">التكلفة التقديرية: </span>
                <span className="font-bold font-mono" dir="ltr">{numCost.toFixed(2)} SAR</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">عدد ملفات الإثبات: </span>
                <span className="font-bold">{evidenceFiles.length} ملف</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowConfirmStep(false)}
                disabled={isSubmitting}
              >
                تعديل التقرير
              </Button>
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isSubmitting ? "جارٍ الحفظ والإنهاء..." : "تأكيد واستلام المركبة"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

