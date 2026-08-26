"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  createVehicle,
  updateVehicle,
  getVehicleManufacturers,
  getVehicleModels,
  getVehicleSuppliers,
} from "@/lib/fleet/api";
import {
  VehicleRegistrationType,
  VehicleType,
  VehicleFuelType,
  VehicleTransmissionType,
  VehicleOwnershipType,
  VehicleCatalogStatus,
  type VehicleUpsertRequest,
  type VehicleDetailResponse,
  type VehicleManufacturerResponse,
  type VehicleModelResponse,
  type VehicleSupplierResponse,
} from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { getOperatingCities, type OperatingCityCatalogItem } from "@/lib/workforce/external-riders-api";
import { Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingVehicle?: VehicleDetailResponse;
}

export function VehicleUpsertModal({ isOpen, onClose, onSuccess, editingVehicle }: Props) {
  const { locale } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<VehicleUpsertRequest>({
    assetNumber: "",
    serialNumber: "",
    plateNumberAr: "",
    plateNumberEn: "",
    plateLettersAr: "",
    plateLettersEn: "",
    plateDigits: "",
    vin: "",
    chassisNumber: "",
    engineNumber: "",
    sponsorId: "",
    operatingCityId: "",
    purchasedFromSupplierId: "",
    registrationType: VehicleRegistrationType.Private,
    vehicleManufacturerId: "",
    vehicleModelId: "",
    modelYear: new Date().getFullYear(),
    vehicleType: VehicleType.Car,
    fuelType: VehicleFuelType.Petrol,
    transmissionType: VehicleTransmissionType.Automatic,
    colorAr: "",
    colorEn: "",
    ownershipType: VehicleOwnershipType.Owned,
    ownerName: "",
    acquisitionDate: new Date().toISOString().split("T")[0],
    leaseReference: "",
    currentOdometer: 0,
    notes: "",
    rowVersion: null,
  });

  const [manufacturers, setManufacturers] = useState<VehicleManufacturerResponse[]>([]);
  const [allModels, setAllModels] = useState<VehicleModelResponse[]>([]);
  const [suppliers, setSuppliers] = useState<VehicleSupplierResponse[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [cities, setCities] = useState<OperatingCityCatalogItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load dependencies
      Promise.all([
        getVehicleManufacturers(),
        getVehicleModels(),
        getVehicleSuppliers(),
        listSponsors(),
        getOperatingCities(),
      ]).then(([mfg, mod, sup, spo, cit]) => {
        setManufacturers(mfg.filter((m) => m.status === VehicleCatalogStatus.Active));
        setAllModels(mod.filter((m) => m.status === VehicleCatalogStatus.Active));
        setSuppliers(sup.filter((s) => s.status === VehicleCatalogStatus.Active));
        setSponsors(spo);
        setCities(cit);
      });

      if (editingVehicle) {
        setFormData({
          assetNumber: editingVehicle.summary.assetNumber,
          serialNumber: editingVehicle.serialNumber || "",
          plateNumberAr: editingVehicle.summary.plateNumberAr || "",
          plateNumberEn: editingVehicle.summary.plateNumberEn || "",
          plateLettersAr: "",
          plateLettersEn: "",
          plateDigits: "",
          vin: editingVehicle.vin || "",
          chassisNumber: editingVehicle.chassisNumber || "",
          engineNumber: editingVehicle.engineNumber || "",
          sponsorId: editingVehicle.summary.sponsorId || "",
          operatingCityId: editingVehicle.summary.operatingCityId || "",
          purchasedFromSupplierId: editingVehicle.purchasedFromSupplierId || "",
          registrationType: editingVehicle.registrationType,
          vehicleManufacturerId: editingVehicle.vehicleManufacturerId,
          vehicleModelId: editingVehicle.vehicleModelId,
          modelYear: editingVehicle.modelYear || new Date().getFullYear(),
          vehicleType: editingVehicle.summary.vehicleType,
          fuelType: editingVehicle.fuelType,
          transmissionType: editingVehicle.transmissionType,
          colorAr: editingVehicle.colorAr || "",
          colorEn: editingVehicle.colorEn || "",
          ownershipType: editingVehicle.ownershipType,
          ownerName: editingVehicle.ownerName || "",
          acquisitionDate: editingVehicle.acquisitionDate ? editingVehicle.acquisitionDate.split("T")[0] : "",
          leaseReference: editingVehicle.leaseReference || "",
          currentOdometer: editingVehicle.summary.currentOdometer,
          notes: editingVehicle.notes || "",
          rowVersion: editingVehicle.summary.rowVersion,
        });
      } else {
        setFormData({
          assetNumber: "",
          serialNumber: "",
          plateNumberAr: "",
          plateNumberEn: "",
          plateLettersAr: "",
          plateLettersEn: "",
          plateDigits: "",
          vin: "",
          chassisNumber: "",
          engineNumber: "",
          sponsorId: "",
          operatingCityId: "",
          purchasedFromSupplierId: "",
          registrationType: VehicleRegistrationType.Private,
          vehicleManufacturerId: "",
          vehicleModelId: "",
          modelYear: new Date().getFullYear(),
          vehicleType: VehicleType.Car,
          fuelType: VehicleFuelType.Petrol,
          transmissionType: VehicleTransmissionType.Automatic,
          colorAr: "",
          colorEn: "",
          ownershipType: VehicleOwnershipType.Owned,
          ownerName: "",
          acquisitionDate: new Date().toISOString().split("T")[0],
          leaseReference: "",
          currentOdometer: 0,
          notes: "",
          rowVersion: null,
        });
      }
    }
  }, [isOpen, editingVehicle]);

  const availableModels = allModels.filter((m) => m.vehicleManufacturerId === formData.vehicleManufacturerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle && !formData.assetNumber?.trim()) {
      toast.error("خطأ في البيانات", "الرقم المرجعي مطلوب عند تحديث بيانات المركبة");
      return;
    }
    if (!formData.vehicleManufacturerId || !formData.vehicleModelId) {
      toast.error("خطأ في البيانات", "يرجى تعبئة الحقول المطلوبة (الصانع، الموديل)");
      return;
    }

    startTransition(async () => {
      try {
        const payload = { ...formData };
        if (!payload.assetNumber?.trim()) {
          payload.assetNumber = null;
        }
        if (!payload.sponsorId) payload.sponsorId = null;
        if (!payload.operatingCityId) payload.operatingCityId = null;
        if (!payload.purchasedFromSupplierId) payload.purchasedFromSupplierId = null;

        if (editingVehicle) {
          await updateVehicle(editingVehicle.summary.id, payload);
        } else {
          await createVehicle(payload);
        }
        onSuccess();
      } catch (err) {}
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingVehicle ? "تعديل المركبة" : "إضافة مركبة جديدة"} maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        
        {/* Identity */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">هوية المركبة الأساسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!editingVehicle ? (
              <div className="md:col-span-3 flex items-center gap-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 p-3.5 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 font-medium shadow-sm">
                <Sparkles className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>سيقوم النظام بتوليد <strong>الرقم المرجعي (Asset Number)</strong> تلقائياً فور حفظ المركبة (بصيغة <code className="font-mono font-bold bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-900 dark:text-blue-200">VEH-YYYYMMDD-XXXXXXXX</code>).</span>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  الرقم المرجعي (Asset) <span className="text-red-500">*</span>
                </label>
                <Input value={formData.assetNumber || ""} disabled readOnly />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">رقم اللوحة (عربي)</label>
              <Input value={formData.plateNumberAr || ""} onChange={(e) => setFormData({ ...formData, plateNumberAr: e.target.value })} placeholder="أ ب ج 1234" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">رقم اللوحة (إنجليزي)</label>
              <Input value={formData.plateNumberEn || ""} onChange={(e) => setFormData({ ...formData, plateNumberEn: e.target.value })} placeholder="ABC 1234" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">رقم الهيكل (VIN)</label>
              <Input value={formData.vin || ""} onChange={(e) => setFormData({ ...formData, vin: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الرقم التسلسلي (الاستمارة)</label>
              <Input value={formData.serialNumber || ""} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">نوع التسجيل <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={[
                  { value: VehicleRegistrationType.Private.toString(), label: "خصوصي" },
                  { value: VehicleRegistrationType.PrivateTransport.toString(), label: "نقل خاص" },
                  { value: VehicleRegistrationType.PublicTransport.toString(), label: "نقل عام" },
                  { value: VehicleRegistrationType.Motorcycle.toString(), label: "دراجة آلية" },
                ]}
                value={formData.registrationType.toString()}
                onChange={(v) => setFormData({ ...formData, registrationType: parseInt(v) as VehicleRegistrationType })}
              />
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">مواصفات المركبة</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">الصانع <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={manufacturers.map(m => ({ value: m.id, label: m.nameAr }))}
                value={formData.vehicleManufacturerId}
                onChange={(v) => {
                  setFormData({ ...formData, vehicleManufacturerId: v, vehicleModelId: "" });
                }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">الموديل <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={availableModels.map(m => ({ value: m.id, label: m.nameAr }))}
                value={formData.vehicleModelId}
                onChange={(v) => {
                  const mod = availableModels.find(x => x.id === v);
                  if (mod) {
                    setFormData({ ...formData, vehicleModelId: v, vehicleType: mod.vehicleType, fuelType: mod.defaultFuelType });
                  } else {
                    setFormData({ ...formData, vehicleModelId: v });
                  }
                }}
                disabled={!formData.vehicleManufacturerId}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">سنة الصنع</label>
              <Input type="number" min="1990" max="2050" value={formData.modelYear || ""} onChange={(e) => setFormData({ ...formData, modelYear: parseInt(e.target.value) || new Date().getFullYear() })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">ناقل الحركة</label>
              <SearchableSelect
                options={[
                  { value: VehicleTransmissionType.Automatic.toString(), label: "أوتوماتيك" },
                  { value: VehicleTransmissionType.Manual.toString(), label: "عادي" },
                ]}
                value={formData.transmissionType.toString()}
                onChange={(v) => setFormData({ ...formData, transmissionType: parseInt(v) as VehicleTransmissionType })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">اللون (عربي)</label>
              <Input value={formData.colorAr || ""} onChange={(e) => setFormData({ ...formData, colorAr: e.target.value })} placeholder="أبيض" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">اللون (إنجليزي)</label>
              <Input value={formData.colorEn || ""} onChange={(e) => setFormData({ ...formData, colorEn: e.target.value })} placeholder="White" />
            </div>
          </div>
        </div>

        {/* Ownership & Operation */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">الملكية والتشغيل</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الكفيل / الكيان المالك</label>
              <SearchableSelect
                options={[{ value: "", label: "لا يوجد" }, ...sponsors.map(s => ({ value: s.id, label: s.registryNameAr }))]}
                value={formData.sponsorId || ""}
                onChange={(v) => setFormData({ ...formData, sponsorId: v })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">مدينة التشغيل</label>
              <SearchableSelect
                options={[{ value: "", label: "غير محدد" }, ...cities.map(c => ({ value: c.id, label: c.nameAr }))]}
                value={formData.operatingCityId || ""}
                onChange={(v) => setFormData({ ...formData, operatingCityId: v })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">نوع الملكية</label>
              <SearchableSelect
                options={[
                  { value: VehicleOwnershipType.Owned.toString(), label: "مملوكة للشركة" },
                  { value: VehicleOwnershipType.Leased.toString(), label: "تأجير تشغيلي / تمويلي" },
                  { value: VehicleOwnershipType.ThirdParty.toString(), label: "طرف ثالث" },
                ]}
                value={formData.ownershipType.toString()}
                onChange={(v) => setFormData({ ...formData, ownershipType: parseInt(v) as VehicleOwnershipType })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">مورد الشراء / التأجير</label>
              <SearchableSelect
                options={[{ value: "", label: "لا يوجد" }, ...suppliers.map(s => ({ value: s.id, label: s.nameAr }))]}
                value={formData.purchasedFromSupplierId || ""}
                onChange={(v) => setFormData({ ...formData, purchasedFromSupplierId: v })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ الاستحواذ / بداية العقد</label>
              <Input type="date" value={formData.acquisitionDate || ""} onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })} />
            </div>
            {!editingVehicle && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">قراءة العداد الحالية (كم)</label>
                <Input type="number" min="0" value={formData.currentOdometer} onChange={(e) => setFormData({ ...formData, currentOdometer: parseInt(e.target.value) || 0 })} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending} className="bg-[#1167c9] hover:bg-[#0e56a8] px-8">
            {isPending ? "جارٍ الحفظ..." : "حفظ بيانات المركبة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
