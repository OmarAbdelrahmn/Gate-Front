"use client";

import { useEffect, useState, useTransition } from "react";
import { takeVehicle, getVehiclesLookup, getVehicleDetail } from "@/lib/fleet/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
import { listRiders, listEmployees } from "@/lib/workforce/api";
import { VehicleCondition, type VehicleSummaryResponse, type TakeVehicleRequest } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicle: VehicleSummaryResponse | null;
}

const getCurrentLocalDateTimeString = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
};

export function TakeVehicleModal({ isOpen, onClose, onSuccess, preselectedVehicle }: Props) {
  const [isPending, startTransition] = useTransition();

  const [riders, setRiders] = useState<{ value: string; label: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ value: string; label: string }[]>([]);
  const [lookupVehicleMap, setLookupVehicleMap] = useState<Map<string, { currentOdometer: number }>>(new Map());

  const [minOdometer, setMinOdometer] = useState<number>(0);

  const [formData, setFormData] = useState({
    riderProfileId: "",
    vehicleId: "",
    startedAtUtc: getCurrentLocalDateTimeString(),
    startOdometer: 0,
    startCondition: VehicleCondition.Good,
    startFuelLevelPercentage: "100",
    permissionReference: "",
    reason: "",
    notes: "",
  });

  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        listRiders().catch(() => []),
        listExternalRiders().catch(() => []),
        listEmployees().catch(() => []),
      ]).then(([ridersRes, externalRes, employeesRes]) => {
        const map = new Map<string, { value: string; label: string }>();

        ridersRes.forEach((r) => {
          const id = r.id || r.employeeId;
          if (id && !map.has(id)) {
            const iqamaStr = r.iqamaNo ? ` (${r.iqamaNo})` : "";
            map.set(id, { value: id, label: `${r.fullNameAr}${iqamaStr}` });
          }
        });

        externalRes.forEach((r) => {
          const id = r.riderProfileId || r.employeeId;
          if (id && !map.has(id)) {
            const iqamaStr = r.iqamaNo ? ` (${r.iqamaNo})` : "";
            map.set(id, { value: id, label: `${r.fullNameAr}${iqamaStr}` });
          }
        });

        employeesRes.forEach((e) => {
          const id = e.riderProfileId || e.id;
          if (id && !map.has(id)) {
            const iqamaStr = e.iqamaNo ? ` (${e.iqamaNo})` : "";
            map.set(id, { value: id, label: `${e.fullNameAr}${iqamaStr}` });
          }
        });

        setRiders(Array.from(map.values()));
      });

      if (preselectedVehicle) {
        setFormData({
          riderProfileId: "",
          vehicleId: preselectedVehicle.id,
          startedAtUtc: getCurrentLocalDateTimeString(),
          startOdometer: preselectedVehicle.currentOdometer,
          startCondition: VehicleCondition.Good,
          startFuelLevelPercentage: "100",
          permissionReference: "",
          reason: "",
          notes: "",
        });
        setMinOdometer(preselectedVehicle.currentOdometer);
        setVehicles([
          {
            value: preselectedVehicle.id,
            label: `${preselectedVehicle.assetNumber} - ${preselectedVehicle.plateNumberAr || "بدون لوحة"}`,
          },
        ]);
      } else {
        setFormData({
          riderProfileId: "",
          vehicleId: "",
          startedAtUtc: getCurrentLocalDateTimeString(),
          startOdometer: 0,
          startCondition: VehicleCondition.Good,
          startFuelLevelPercentage: "100",
          permissionReference: "",
          reason: "",
          notes: "",
        });
        setMinOdometer(0);
        getVehiclesLookup("").then((res) => {
          setVehicles(
            res.map((v) => ({
              value: v.id,
              label: `${v.assetNumber} - ${v.plateNumberAr || "بدون لوحة"}`,
            }))
          );
        });
      }
      setFiles([]);
    }
  }, [isOpen, preselectedVehicle]);

  const handleVehicleChange = async (vehicleId: string) => {
    setFormData((prev) => ({ ...prev, vehicleId }));
    if (!vehicleId) return;

    try {
      const detail = await getVehicleDetail(vehicleId);
      if (detail && detail.summary) {
        const odo = detail.summary.currentOdometer || 0;
        setMinOdometer(odo);
        setFormData((prev) => ({
          ...prev,
          vehicleId,
          startOdometer: Math.max(prev.startOdometer, odo),
        }));
      }
    } catch {
      // Fallback
    }
  };

  const handleAddFiles = (newFilesList: FileList | null) => {
    if (!newFilesList) return;
    const selected = Array.from(newFilesList);

    const validFiles: File[] = [];
    for (const file of selected) {
      if (files.length + validFiles.length >= 3) {
        toast.error("تنبيه", "يمكن رفع 3 ملفات كحد أقصى لسندات الأمر.");
        break;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("تنبيه", `حجم الملف ${file.name} يتجاوز 10 ميجابايت.`);
        continue;
      }
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!validTypes.some((type) => file.type.startsWith("image/") || file.type === "application/pdf")) {
        toast.error("تنبيه", `الملف ${file.name} غير مدعوم. المسموح: PDF والصور فقط.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.riderProfileId) {
      toast.error("خطأ في البيانات", "يرجى اختيار المندوب المستلم.");
      return;
    }
    if (!formData.vehicleId) {
      toast.error("خطأ في البيانات", "يرجى اختيار المركبة.");
      return;
    }
    if (!formData.permissionReference.trim()) {
      toast.error("خطأ في البيانات", "يرجى إدخال رقم التفويض.");
      return;
    }
    if (!formData.reason.trim()) {
      toast.error("خطأ في البيانات", "يرجى إدخال سبب تسليم المركبة.");
      return;
    }
    if (formData.startOdometer < minOdometer) {
      toast.error(
        "خطأ في العداد",
        `قراءة العداد (${formData.startOdometer}) لا يمكن أن تكون أقل من القراءة الحالية للمركبة (${minOdometer} كم).`
      );
      return;
    }

    const fuelVal = formData.startFuelLevelPercentage !== "" ? Number(formData.startFuelLevelPercentage) : undefined;
    if (fuelVal !== undefined && (fuelVal < 0 || fuelVal > 100)) {
      toast.error("خطأ في الوقود", "نسبة الوقود يجب أن تكون بين 0 و 100%.");
      return;
    }

    startTransition(async () => {
      try {
        const metadataJSON: TakeVehicleRequest = {
          riderProfileId: formData.riderProfileId,
          vehicleId: formData.vehicleId,
          startedAtUtc: new Date(formData.startedAtUtc).toISOString(),
          startOdometer: Number(formData.startOdometer),
          startCondition: Number(formData.startCondition) as VehicleCondition,
          startFuelLevelPercentage: fuelVal,
          permissionReference: formData.permissionReference.trim(),
          reason: formData.reason.trim(),
          notes: formData.notes.trim() || undefined,
        };

        const payload = new FormData();
        payload.append("metadata", JSON.stringify(metadataJSON));

        files.forEach((file) => {
          payload.append("promissoryFiles", file);
        });

        await takeVehicle(payload);
        onSuccess();
      } catch (err) {
        // Error toast handled by authFetch
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسليم مركبة لمندوب (عهدة جديدة)" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5 pt-3">
        {/* Rider & Vehicle Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              المركبة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={vehicles}
              value={formData.vehicleId}
              placeholder="اختر المركبة..."
              searchPlaceholder="بحث برقم المركبة أو اللوحة..."
              onChange={handleVehicleChange}
              disabled={!!preselectedVehicle}
            />
            {minOdometer > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                العداد الحالي للمركبة: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{minOdometer.toLocaleString()} كم</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              المندوب المستلم <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={riders}
              value={formData.riderProfileId}
              placeholder="اختر المندوب..."
              searchPlaceholder="بحث بالاسم أو رقم الإقامة..."
              onChange={(v) => setFormData({ ...formData, riderProfileId: v })}
            />
          </div>
        </div>

        {/* Date, Odometer, Fuel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              تاريخ ووقت الاستلام (UTC) <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              value={formData.startedAtUtc}
              onChange={(e) => setFormData({ ...formData, startedAtUtc: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              العداد عند التسليم (كم) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={minOdometer}
              value={formData.startOdometer}
              onChange={(e) => setFormData({ ...formData, startOdometer: parseInt(e.target.value) || 0 })}
              required
            />
            {formData.startOdometer < minOdometer && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" /> لا يمكن أن يكون أقل من {minOdometer}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              مستوى الوقود (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="0 - 100"
              value={formData.startFuelLevelPercentage}
              onChange={(e) => setFormData({ ...formData, startFuelLevelPercentage: e.target.value })}
            />
          </div>
        </div>

        {/* Condition & Permission Ref */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              حالة المركبة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={[
                { value: VehicleCondition.Unknown.toString(), label: "1 - غير معروف (Unknown)" },
                { value: VehicleCondition.Good.toString(), label: "2 - جيدة (Good)" },
                { value: VehicleCondition.Fair.toString(), label: "3 - مقبولة (Fair)" },
                { value: VehicleCondition.Damaged.toString(), label: "4 - متضررة (Damaged)" },
                { value: VehicleCondition.Unsafe.toString(), label: "5 - غير آمنة (Unsafe)" },
              ]}
              value={formData.startCondition.toString()}
              onChange={(v) => setFormData({ ...formData, startCondition: parseInt(v) as VehicleCondition })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              رقم التفويض / مرجع الصلاحية <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.permissionReference}
              onChange={(e) => setFormData({ ...formData, permissionReference: e.target.value })}
              placeholder="مثال: PERM-2026-001"
              required
            />
          </div>
        </div>

        {/* Reason & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              السبب <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="مثال: تسليم عهدة يومية، تبديل وردية..."
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              ملاحظات إضافية
            </label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات تفصيلية أخرى..."
            />
          </div>
        </div>

        {/* Promissory Files Section */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1167c9]" />
              سندات الأمر / Promissory Notes
            </label>
            <span className="text-xs text-slate-500 font-mono">{files.length} / 3 ملفات</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            يجب أن يمتلك المندوب إما سندات أمل نشطة مسجلة مسبقاً، أو رفع ملفات جديدة عبر النموذج. (الحد الأقصى: 3 ملفات بصيغة PDF أو صورة، بحجم حتى 10 ميجابايت لكل ملف).
          </p>

          {files.length < 3 && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center transition-colors hover:border-[#1167c9] dark:border-slate-700 dark:bg-slate-800">
              <Upload className="h-6 w-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                اضغط هنا لرفع سندات الأمر (PDF أو صور)
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">PDF, PNG, JPG (حتى 10MB)</span>
              <input
                type="file"
                multiple
                accept="application/pdf,image/*"
                onChange={(e) => handleAddFiles(e.target.files)}
                className="hidden"
              />
            </label>
          )}

          {files.length > 0 && (
            <ul className="space-y-2 pt-1">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="حذف الملف"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
            {isPending ? "جارٍ التجميع والحفظ..." : "تأكيد وتسليم المركبة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
