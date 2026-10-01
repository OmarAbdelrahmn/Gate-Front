"use client";

import { useState, useTransition, useEffect } from "react";
import { transitionVehicleRegistration } from "@/lib/fleet/api";
import { VehicleRegistrationType, type VehicleDetailResponse } from "@/lib/fleet/types";
import { formatVehicleRegistrationType } from "@/lib/fleet/formatters";
import { updateVehiclePlateCache, invalidateVehiclePlatesCache } from "@/lib/fleet/vehicle-plate-cache";
import {
  sanitizePlateDigits,
  sanitizePlateLettersAr,
  sanitizePlateLettersEn,
  transliteratePlateArToEn,
  buildPlateStrings,
} from "@/lib/fleet/saudi-plate";
import { SaudiPlatePreview } from "./SaudiPlatePreview";
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
  Sparkles,
  Edit3,
  Info,
  Check,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle: VehicleDetailResponse;
}

function currentLocalDateTime(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
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

  // Split plate components (User input)
  const [plateDigits, setPlateDigits] = useState("");
  const [plateLettersAr, setPlateLettersAr] = useState("");
  const [plateLettersEn, setPlateLettersEn] = useState("");

  // Full plate strings (Generated or manual)
  const [plateNumberAr, setPlateNumberAr] = useState("");
  const [plateNumberEn, setPlateNumberEn] = useState("");
  const [isManualFullPlate, setIsManualFullPlate] = useState(false);

  // Format preference for full plate string
  const [plateFormat, setPlateFormat] = useState<"digits-first" | "letters-first">("digits-first");

  const [effectiveAtLocal, setEffectiveAtLocal] = useState(currentLocalDateTime);
  const [reason, setReason] = useState("تحويل المركبة إلى النقل العام");

  // Files
  const [istimaraFile, setIstimaraFile] = useState<File | null>(null);
  const [operationCardFile, setOperationCardFile] = useState<File | null>(null);

  // Requirements checks
  const currentRegType = vehicle.registrationType ?? summary.registrationType;
  const isAlreadyPublicTransport =
    currentRegType === VehicleRegistrationType.PublicTransport ||
    Number(currentRegType) === VehicleRegistrationType.PublicTransport ||
    currentRegType === VehicleRegistrationType.PublicBus ||
    Number(currentRegType) === VehicleRegistrationType.PublicBus;

  const hasActiveAssignment = Boolean(
    summary.currentAssignmentId || summary.currentRiderProfileId
  );

  const isEligible = !isAlreadyPublicTransport;

  // Whenever components change, auto-update the full plate fields if not in manual mode
  useEffect(() => {
    if (!isManualFullPlate) {
      const { plateNumberAr: newAr, plateNumberEn: newEn } = buildPlateStrings(
        plateDigits,
        plateLettersAr,
        plateLettersEn,
        {
          arabicFormat: plateFormat,
          englishFormat: plateFormat,
        }
      );
      setPlateNumberAr(newAr);
      setPlateNumberEn(newEn);
    }
  }, [plateDigits, plateLettersAr, plateLettersEn, plateFormat, isManualFullPlate]);

  const handleReset = () => {
    setPlateDigits("");
    setPlateLettersAr("");
    setPlateLettersEn("");
    setPlateNumberAr("");
    setPlateNumberEn("");
    setIsManualFullPlate(false);
    setPlateFormat("digits-first");
    setEffectiveAtLocal(currentLocalDateTime());
    setReason("تحويل المركبة إلى النقل العام");
    setIstimaraFile(null);
    setOperationCardFile(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Handlers for plate components with sanitization & auto-transliteration
  const handleDigitsChange = (val: string) => {
    const clean = sanitizePlateDigits(val);
    setPlateDigits(clean);
  };

  const handleLettersArChange = (val: string) => {
    const clean = sanitizePlateLettersAr(val);
    setPlateLettersAr(clean);

    // If English letters are not manually edited yet, auto-suggest standard Latin equivalent
    if (!plateLettersEn.trim() || plateLettersEn === transliteratePlateArToEn(plateLettersAr)) {
      const autoEn = transliteratePlateArToEn(clean);
      setPlateLettersEn(autoEn);
    }
  };

  const handleLettersEnChange = (val: string) => {
    const clean = sanitizePlateLettersEn(val);
    setPlateLettersEn(clean);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEligible) {
      toast.error(
        "إجراء غير متاح",
        "لا يمكن تنفيذ تحويل نوع التسجيل لهذه المركبة نظراً لعدم استيفاء الشروط."
      );
      return;
    }

    // 1. Mandatory Plate Validation
    const cleanDigits = plateDigits.trim();
    const cleanLettersAr = plateLettersAr.trim();
    const cleanLettersEn = plateLettersEn.trim();
    const finalPlateAr = plateNumberAr.trim();
    const finalPlateEn = plateNumberEn.trim();

    if (!cleanDigits) {
      toast.error("بيانات ناقصة", "يرجى إدخال أرقام اللوحة الجديدة (1-4 أرقام)");
      return;
    }
    if (!cleanLettersAr) {
      toast.error("بيانات ناقصة", "يرجى إدخال أحرف اللوحة بالعربية للوحة الجديدة");
      return;
    }
    if (!cleanLettersEn) {
      toast.error("بيانات ناقصة", "يرجى إدخال أحرف اللوحة بالإنجليزية للوحة الجديدة");
      return;
    }
    if (!finalPlateAr) {
      toast.error("بيانات ناقصة", "يرجى تحديد أو التحقق من رقم اللوحة الكامل بالعربية");
      return;
    }
    if (!finalPlateEn) {
      toast.error("بيانات ناقصة", "يرجى تحديد أو التحقق من رقم اللوحة الكامل بالإنجليزية");
      return;
    }

    // 2. Anti-Old-Plate Check: Prevent submitting the old private plate
    const oldPlateAr = (summary.plateNumberAr || "").trim();
    const oldPlateEn = (summary.plateNumberEn || "").trim();

    if (oldPlateAr && finalPlateAr.toLowerCase() === oldPlateAr.toLowerCase()) {
      toast.error(
        "لوحة غير صالحة للتحويل",
        `رقم اللوحة بالعربية (${finalPlateAr}) مطابق للوحة القديمة للمركبة! عند التحويل لنقل عام يجب إدخال اللوحة الجديدة الصادرة.`
      );
      return;
    }

    if (oldPlateEn && finalPlateEn.toLowerCase() === oldPlateEn.toLowerCase()) {
      toast.error(
        "لوحة غير صالحة للتحويل",
        `رقم اللوحة بالإنجليزية (${finalPlateEn}) مطابق للوحة القديمة للمركبة! عند التحويل لنقل عام يجب إدخال اللوحة الجديدة الصادرة.`
      );
      return;
    }

    // 3. Prevent Swapped Numbers/Letters
    if (/\d/.test(cleanLettersEn) || /\d/.test(cleanLettersAr)) {
      toast.error("خطأ في المدخلات", "خانة أحرف اللوحة لا يمكن أن تحتوي على أرقام.");
      return;
    }
    if (!/^\d+$/.test(cleanDigits)) {
      toast.error("خطأ في المدخلات", "خانة أرقام اللوحة يجب أن تحتوي على أرقام فقط.");
      return;
    }

    // 4. Other form requirements
    if (!effectiveAtLocal) {
      toast.error("بيانات ناقصة", "يرجى اختيار تاريخ ووقت سريان التحويل");
      return;
    }
    if (!reason.trim()) {
      toast.error("بيانات ناقصة", "يرجى كتابة سبب التحويل");
      return;
    }
    if (!istimaraFile) {
      toast.error("ملف مفقود", "يرجى إرفاق وثيقة الاستمارة الجديدة/المحدثة");
      return;
    }
    if (!operationCardFile) {
      toast.error("ملف مفقود", "يرجى إرفاق كرت التشغيل الخاص بالنقل العام");
      return;
    }

    // The API accepts up to 10 MiB for each document.
    const maxFileSizeBytes = 10 * 1024 * 1024;
    if (istimaraFile.size > maxFileSizeBytes) {
      toast.error("حجم ملف الاستمارة كبير جداً", "حجم ملف الاستمارة يجب ألا يتجاوز 10 ميجابايت.");
      return;
    }
    if (operationCardFile.size > maxFileSizeBytes) {
      toast.error("حجم ملف كرت التشغيل كبير جداً", "حجم ملف كرت التشغيل يجب ألا يتجاوز 10 ميجابايت.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("plateNumberAr", finalPlateAr);
        formData.append("plateNumberEn", finalPlateEn);

        // Convert local datetime to UTC ISO string
        const effectiveDateObj = new Date(effectiveAtLocal);
        formData.append("effectiveAtUtc", effectiveDateObj.toISOString());

        formData.append("reason", reason.trim());
        formData.append("rowVersion", summary.rowVersion);
        formData.append("istimara", istimaraFile);
        formData.append("operationCard", operationCardFile);

        formData.append("plateLettersAr", cleanLettersAr);
        formData.append("plateLettersEn", cleanLettersEn);
        formData.append("plateDigits", cleanDigits);

        await transitionVehicleRegistration(vehicleId, formData);

        // Update local client cache so navigation and detail badges reflect the new plate immediately
        updateVehiclePlateCache(vehicleId, {
          plateNumberAr: finalPlateAr,
          plateNumberEn: finalPlateEn,
          assetNumber: summary.assetNumber,
          serialNumber: vehicle.serialNumber,
        });
        invalidateVehiclePlatesCache();

        toast.success(
          "تم تحويل نوع التسجيل بنجاح",
          `تم تحويل المركبة إلى نقل عام وتحديث اللوحة إلى (${finalPlateAr})`
        );

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
                تحويل نوع التسجيل إلى (النقل العام)
              </h4>
              <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                يقوم هذا الإجراء بتحويل نوع تسجيل المركبة الرسمي من (
                {formatVehicleRegistrationType(currentRegType)}) إلى{" "}
                <span className="font-bold">نقل عام (PublicTransport)</span> وإصدار لوحة النقل
                العام الجديدة وتحديث سجلات ترخيص الأسطول.
              </p>
            </div>
          </div>
        </div>

        {/* Requirements Status Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              !isAlreadyPublicTransport
                ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
            }`}
          >
            {!isAlreadyPublicTransport ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div className="text-xs">
              <div className="font-bold">نوع التسجيل الحالي</div>
              <div>
                {formatVehicleRegistrationType(currentRegType)}{" "}
                {!isAlreadyPublicTransport ? "(مؤهل للتحويل)" : "(مسجلة بالفعل كنقل عام)"}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border flex items-center gap-3 border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs">
              <div className="font-bold">حالة التسليم للمندوب</div>
              <div>
                {!hasActiveAssignment
                  ? "لا توجد عهدة نشطة (جاهزة للتحويل)"
                  : `مسلّمة للمندوب (${summary.currentRiderName || "عهدة نشطة"}) وستبقى العهدة كما هي`}
              </div>
            </div>
          </div>
        </div>

        {/* Current Vehicle Plate Reference Notice */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <span>اللوحة الحالية للمركبة (سيتم استبدالها باللوحة الجديدة أدناه):</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100">
                {summary.plateNumberAr || "غير محدد"}
              </span>
              <span className="text-slate-400">/</span>
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100">
                {summary.plateNumberEn || "غير محدد"}
              </span>
            </div>
          </div>
        </div>

        {!isEligible && (
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>لا يمكن تحويل المركبة: نوع تسجيل المركبة هو (نقل عام) بالفعل.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: New Public Transport License Plate */}
          <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-2">
              <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-600" />
                بيانات لوحة النقل العام الجديدة الصادرة
              </h4>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                * اللوحة الصادرة من إدارة المرور لنوع النقل العام
              </span>
            </div>

            {/* Live Saudi Plate Visual Preview */}
            <SaudiPlatePreview
              digits={plateDigits}
              lettersAr={plateLettersAr}
              lettersEn={plateLettersEn}
              registrationType="public"
            />

            {/* Split Plate Inputs with Strict Character Filtering */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* 1. Plate Digits */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  أرقام اللوحة (1-4 أرقام) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={plateDigits}
                  onChange={(e) => handleDigitsChange(e.target.value)}
                  placeholder="مثال: 1987"
                  disabled={!isEligible}
                  maxLength={4}
                  className="font-mono text-center text-base font-bold tracking-widest"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  أرقام فقط (يتم منع كتابة الأحرف تلقائياً)
                </span>
              </div>

              {/* 2. Arabic Letters */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  أحرف اللوحة بالعربية <span className="text-red-500">*</span>
                </label>
                <Input
                  value={plateLettersAr}
                  onChange={(e) => handleLettersArChange(e.target.value)}
                  placeholder="مثال: أ ع س"
                  disabled={!isEligible}
                  maxLength={7}
                  className="text-center text-base font-bold tracking-widest"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  أحرف عربية مفصولة بمسافات (مثل: أ ع س)
                </span>
              </div>

              {/* 3. English Letters */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    أحرف اللوحة بالإنجليزية <span className="text-red-500">*</span>
                  </label>
                  {plateLettersAr && (
                    <button
                      type="button"
                      onClick={() => setPlateLettersEn(transliteratePlateArToEn(plateLettersAr))}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-0.5"
                      title="مطابقة الحروف اللاتينية تلقائياً حسب معايير المرور"
                    >
                      <Sparkles className="h-3 w-3" />
                      مطابقة آلية
                    </button>
                  )}
                </div>
                <Input
                  value={plateLettersEn}
                  onChange={(e) => handleLettersEnChange(e.target.value)}
                  placeholder="مثال: S E A"
                  disabled={!isEligible}
                  maxLength={7}
                  className="font-mono uppercase text-center text-base font-bold tracking-widest"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  أحرف لاتينية كبيرة A-Z (تمنع الأرقام)
                </span>
              </div>
            </div>

            {/* Full Plates Auto-Generation / Customization */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  صيغة رقم اللوحة الكامل للطلب:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newFormat = plateFormat === "digits-first" ? "letters-first" : "digits-first";
                      setPlateFormat(newFormat);
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>الترتيب: {plateFormat === "digits-first" ? "الأرقام أولاً" : "الأحرف أولاً"}</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setIsManualFullPlate(!isManualFullPlate)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>{isManualFullPlate ? "تفعيل التوليد الآلي" : "تعديل الصيغة يدوياً"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    رقم اللوحة الكامل بالعربية (المُرسل لقاعدة البيانات) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={plateNumberAr}
                    onChange={(e) => {
                      setIsManualFullPlate(true);
                      setPlateNumberAr(e.target.value);
                    }}
                    disabled={!isEligible}
                    placeholder="مثال: 1987 أ ع س"
                    className="font-bold text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    رقم اللوحة الكامل بالإنجليزية (المُرسل لقاعدة البيانات) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={plateNumberEn}
                    onChange={(e) => {
                      setIsManualFullPlate(true);
                      setPlateNumberEn(e.target.value);
                    }}
                    disabled={!isEligible}
                    placeholder="مثال: 1987 SEA"
                    className="font-mono font-bold text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Effective Date & Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                تاريخ ووقت سريان التحويل (التوقيت المحلي) <span className="text-red-500">*</span>
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
              الوثائق المطلوبة للتحويل (PDF أو صور - 10 ميجابايت لكل ملف)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Istimara File */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  وثيقة الاستمارة الجديدة (istimara) <span className="text-red-500">*</span>
                </label>

                {!istimaraFile ? (
                  <label
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                      isEligible
                        ? "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-[#1167c9] hover:bg-blue-50/30"
                        : "border-slate-200 bg-slate-100/50 cursor-not-allowed opacity-60"
                    }`}
                  >
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
                  كرت التشغيل للنقل العام (operationCard) <span className="text-red-500">*</span>
                </label>

                {!operationCardFile ? (
                  <label
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                      isEligible
                        ? "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-emerald-600 hover:bg-emerald-50/30"
                        : "border-slate-200 bg-slate-100/50 cursor-not-allowed opacity-60"
                    }`}
                  >
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
