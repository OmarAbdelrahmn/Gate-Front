"use client";

import { useState, useTransition, useEffect } from "react";
import { correctVehicleIdentity } from "@/lib/fleet/api";
import { VehicleRegistrationType, type VehicleDetailResponse, type VehicleIdentityCorrectionRequest } from "@/lib/fleet/types";
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
  ShieldAlert,
  Edit3,
  Sparkles,
  Info,
  CheckCircle2,
  FileCheck2,
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

export function VehicleIdentityCorrectionModal({
  isOpen,
  onClose,
  onSuccess,
  vehicle,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const summary = vehicle.summary;
  const vehicleId = summary.id;

  // Initialize plate components from current vehicle
  const [plateDigits, setPlateDigits] = useState("");
  const [plateLettersAr, setPlateLettersAr] = useState("");
  const [plateLettersEn, setPlateLettersEn] = useState("");

  const [plateNumberAr, setPlateNumberAr] = useState("");
  const [plateNumberEn, setPlateNumberEn] = useState("");
  const [isManualFullPlate, setIsManualFullPlate] = useState(false);
  const [plateFormat, setPlateFormat] = useState<"digits-first" | "letters-first">("digits-first");

  const [serialNumber, setSerialNumber] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [vin, setVin] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveAtLocal, setEffectiveAtLocal] = useState(currentLocalDateTime);

  // Sync state when vehicle changes or modal opens
  useEffect(() => {
    if (isOpen && vehicle) {
      setPlateDigits(vehicle.plateDigits || "");
      setPlateLettersAr(vehicle.plateLettersAr || "");
      setPlateLettersEn(vehicle.plateLettersEn || "");
      setPlateNumberAr(summary.plateNumberAr || "");
      setPlateNumberEn(summary.plateNumberEn || "");
      setSerialNumber(vehicle.serialNumber || "");
      setChassisNumber(vehicle.chassisNumber || "");
      setVin(vehicle.vin || "");
      setReason("تصحيح بيانات وهوية اللوحة الرسمية للمركبة");
      setEffectiveAtLocal(currentLocalDateTime());
      setIsManualFullPlate(false);
    }
  }, [isOpen, vehicle, summary]);

  // Whenever components change, auto-update the full plate fields if not in manual mode
  useEffect(() => {
    if (!isManualFullPlate && (plateDigits || plateLettersAr || plateLettersEn)) {
      const { plateNumberAr: newAr, plateNumberEn: newEn } = buildPlateStrings(
        plateDigits,
        plateLettersAr,
        plateLettersEn,
        {
          arabicFormat: plateFormat,
          englishFormat: plateFormat,
        }
      );
      if (newAr) setPlateNumberAr(newAr);
      if (newEn) setPlateNumberEn(newEn);
    }
  }, [plateDigits, plateLettersAr, plateLettersEn, plateFormat, isManualFullPlate]);

  const handleDigitsChange = (val: string) => {
    const clean = sanitizePlateDigits(val);
    setPlateDigits(clean);
  };

  const handleLettersArChange = (val: string) => {
    const clean = sanitizePlateLettersAr(val);
    setPlateLettersAr(clean);

    if (!plateLettersEn.trim() || plateLettersEn === transliteratePlateArToEn(plateLettersAr)) {
      setPlateLettersEn(transliteratePlateArToEn(clean));
    }
  };

  const handleLettersEnChange = (val: string) => {
    const clean = sanitizePlateLettersEn(val);
    setPlateLettersEn(clean);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDigits = plateDigits.trim();
    const cleanLettersAr = plateLettersAr.trim();
    const cleanLettersEn = plateLettersEn.trim();
    const finalPlateAr = plateNumberAr.trim();
    const finalPlateEn = plateNumberEn.trim();

    if (!finalPlateAr) {
      toast.error("بيانات ناقصة", "يرجى تحديد رقم اللوحة الكامل بالعربية");
      return;
    }
    if (!finalPlateEn) {
      toast.error("بيانات ناقصة", "يرجى تحديد رقم اللوحة الكامل بالإنجليزية");
      return;
    }

    if (/\d/.test(cleanLettersEn) || /\d/.test(cleanLettersAr)) {
      toast.error("خطأ في المدخلات", "خانة أحرف اللوحة لا يمكن أن تحتوي على أرقام.");
      return;
    }
    if (cleanDigits && !/^\d+$/.test(cleanDigits)) {
      toast.error("خطأ في المدخلات", "خانة أرقام اللوحة يجب أن تحتوي على أرقام فقط.");
      return;
    }

    if (!reason.trim()) {
      toast.error("بيانات ناقصة", "يرجى توضيح سبب تصحيح الهوية");
      return;
    }

    const regType = (vehicle.registrationType ?? summary.registrationType) as VehicleRegistrationType;

    startTransition(async () => {
      try {
        const payload: VehicleIdentityCorrectionRequest = {
          assetNumber: summary.assetNumber || "",
          serialNumber: serialNumber.trim() || null,
          plateNumberAr: finalPlateAr,
          plateNumberEn: finalPlateEn,
          plateLettersAr: cleanLettersAr || null,
          plateLettersEn: cleanLettersEn || null,
          plateDigits: cleanDigits || null,
          vin: vin.trim() || null,
          chassisNumber: chassisNumber.trim() || null,
          engineNumber: vehicle.engineNumber?.trim() || null,
          sponsorId: summary.sponsorId || null,
          operatingCityId: summary.operatingCityId || null,
          registrationType: regType,
          purchasedFromSupplierId: vehicle.purchasedFromSupplierId || null,
          reason: reason.trim(),
          effectiveAtUtc: new Date(effectiveAtLocal).toISOString(),
          rowVersion: summary.rowVersion || "",
        };

        await correctVehicleIdentity(vehicleId, payload);

        // Update local client cache so navigation and detail badges reflect the corrected plate immediately
        updateVehiclePlateCache(vehicleId, {
          plateNumberAr: finalPlateAr,
          plateNumberEn: finalPlateEn,
          assetNumber: summary.assetNumber,
          serialNumber: serialNumber.trim() || null,
        });
        invalidateVehiclePlatesCache();

        toast.success(
          "تم تصحيح هوية المركبة بنجاح",
          `تم تحديث بيانات اللوحة إلى (${finalPlateAr}) وتسجيل عملية التصحيح في سجل التدقيق.`
        );

        onSuccess();
        onClose();
      } catch (err) {
        console.error("Identity correction error:", err);
      }
    });
  };

  const regType = vehicle.registrationType ?? summary.registrationType;
  const isPublic =
    regType === VehicleRegistrationType.PublicTransport ||
    Number(regType) === VehicleRegistrationType.PublicTransport ||
    regType === VehicleRegistrationType.PublicBus ||
    Number(regType) === VehicleRegistrationType.PublicBus;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تصحيح هوية وبيانات لوحة المركبة (Identity Correction)"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 pt-2">
        {/* Banner Alert */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white font-bold">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950 dark:text-amber-200 text-base">
                تصحيح هوية اللوحة وسجلات المرور
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                يُستخدم هذا الإجراء لتصحيح الأخطاء المطبعية أو تبادل أحرف وأرقام اللوحة أو تحديث
                البيانات الثبوتية الرسمية للمركبة. يتم توثيق العملية في سجل التدقيق غير القابل للتعديل.
              </p>
            </div>
          </div>
        </div>

        {/* Live Saudi Plate Visual Preview */}
        <SaudiPlatePreview
          digits={plateDigits}
          lettersAr={plateLettersAr}
          lettersEn={plateLettersEn}
          registrationType={isPublic ? "public" : "private"}
          label="معاينة اللوحة بعد التصحيح (Corrected Plate Preview)"
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Plate Details */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <FileCheck2 className="h-4 w-4 text-blue-600" />
              مكونات اللوحة المصححة
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  أرقام اللوحة (digits)
                </label>
                <Input
                  value={plateDigits}
                  onChange={(e) => handleDigitsChange(e.target.value)}
                  placeholder="مثال: 1987"
                  maxLength={4}
                  className="font-mono text-center text-base font-bold tracking-widest"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  أرقام فقط (0-9)
                </span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  أحرف اللوحة بالعربية
                </label>
                <Input
                  value={plateLettersAr}
                  onChange={(e) => handleLettersArChange(e.target.value)}
                  placeholder="مثال: أ ع س"
                  maxLength={7}
                  className="text-center text-base font-bold tracking-widest"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  أحرف عربية مفصولة بمسافات
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    أحرف اللوحة بالإنجليزية
                  </label>
                  {plateLettersAr && (
                    <button
                      type="button"
                      onClick={() => setPlateLettersEn(transliteratePlateArToEn(plateLettersAr))}
                      className="text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-0.5"
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
                  maxLength={7}
                  className="font-mono uppercase text-center text-base font-bold tracking-widest"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  أحرف لاتينية كبيرة A-Z
                </span>
              </div>
            </div>

            {/* Full Plates Auto-Generation / Customization */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  صيغة رقم اللوحة الكامل المصحح:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newFormat = plateFormat === "digits-first" ? "letters-first" : "digits-first";
                      setPlateFormat(newFormat);
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                    رقم اللوحة الكامل بالعربية (المُحدث) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={plateNumberAr}
                    onChange={(e) => {
                      setIsManualFullPlate(true);
                      setPlateNumberAr(e.target.value);
                    }}
                    placeholder="مثال: 1987 أ ع س"
                    className="font-bold text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    رقم اللوحة الكامل بالإنجليزية (المُحدث) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={plateNumberEn}
                    onChange={(e) => {
                      setIsManualFullPlate(true);
                      setPlateNumberEn(e.target.value);
                    }}
                    placeholder="مثال: 1987 SEA"
                    className="font-mono font-bold text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Other Vehicle Identity Identifiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                الرقم التسلسلي (Serial Number)
              </label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="مثال: 821504220"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                رقم الهيكل (Chassis / VIN)
              </label>
              <Input
                value={chassisNumber || vin}
                onChange={(e) => {
                  setChassisNumber(e.target.value);
                  setVin(e.target.value);
                }}
                placeholder="رقم الهيكل"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                نوع التسجيل الرسمي
              </label>
              <div className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800 flex items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                {formatVehicleRegistrationType(regType)}
              </div>
            </div>
          </div>

          {/* Section 3: Reason & Effective Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                سبب التصحيح <span className="text-red-500">*</span>
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="توضيح سبب تصحيح بيانات اللوحة أو الهوية"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                تاريخ سريان التصحيح <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={effectiveAtLocal}
                onChange={(e) => setEffectiveAtLocal(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isPending ? "جارٍ حفظ التصحيح..." : "تأكيد تصحيح الهوية"}</span>
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
