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

const COMMON_VEHICLE_COLORS = [
  { ar: "أبيض", en: "White" },
  { ar: "لؤلؤي", en: "Pearl White" },
  { ar: "أسود", en: "Black" },
  { ar: "فضي", en: "Silver" },
  { ar: "رمادي", en: "Gray" },
  { ar: "رصاصي", en: "Charcoal" },
  { ar: "كحلي", en: "Navy Blue" },
  { ar: "أزرق", en: "Blue" },
  { ar: "أحمر", en: "Red" },
  { ar: "عنابي", en: "Maroon" },
  { ar: "بني", en: "Brown" },
  { ar: "بيج", en: "Beige" },
  { ar: "ذهبي", en: "Gold" },
  { ar: "برونزي", en: "Bronze" },
  { ar: "شامبين", en: "Champagne" },
  { ar: "موكا", en: "Mocha" },
  { ar: "أخضر", en: "Green" },
  { ar: "أصفر", en: "Yellow" },
  { ar: "برتقالي", en: "Orange" },
  { ar: "بنفسجي", en: "Purple" },
];

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
        const activeMfg = mfg.filter((m) => m.status === VehicleCatalogStatus.Active);
        const activeMod = mod.filter((m) => m.status === VehicleCatalogStatus.Active);
        const activeSup = sup.filter((s) => s.status === VehicleCatalogStatus.Active);

        setManufacturers(activeMfg);
        setAllModels(activeMod);
        setSuppliers(activeSup);
        setSponsors(spo);
        setCities(cit);

        if (!editingVehicle) {
          // Pre-select default sponsor & city if available
          setFormData((prev) => ({
            ...prev,
            sponsorId: prev.sponsorId || (spo.length > 0 ? spo[0].id : ""),
            operatingCityId: prev.operatingCityId || (cit.length > 0 ? cit[0].id : ""),
          }));
        }
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

    // Required fields validation
    if (!formData.serialNumber?.trim()) {
      toast.error("خطأ في البيانات", "يرجى إدخال الرقم التسلسلي (الاستمارة)");
      return;
    }
    if (!formData.chassisNumber?.trim()) {
      toast.error("خطأ في البيانات", "يرجى إدخال رقم الهيكل");
      return;
    }
    if (!formData.plateNumberAr?.trim()) {
      toast.error("خطأ في البيانات", "يرجى إدخال رقم اللوحة بالعربي");
      return;
    }
    if (!formData.plateNumberEn?.trim()) {
      toast.error("خطأ في البيانات", "يرجى إدخال رقم اللوحة بالإنجليزي");
      return;
    }
    if (!formData.vehicleManufacturerId) {
      toast.error("خطأ في البيانات", "يرجى اختيار الصانع");
      return;
    }
    if (!formData.vehicleModelId) {
      toast.error("خطأ في البيانات", "يرجى اختيار الموديل");
      return;
    }
    if (!formData.sponsorId) {
      toast.error("خطأ في البيانات", "يرجى اختيار الكفيل / الكيان المالك");
      return;
    }
    if (!formData.operatingCityId) {
      toast.error("خطأ في البيانات", "يرجى اختيار مدينة التشغيل");
      return;
    }

    // Conditional requirement: Supplier is required when ownershipType is Owned (1)
    if (formData.ownershipType === VehicleOwnershipType.Owned && !formData.purchasedFromSupplierId) {
      toast.error("خطأ في البيانات", "مورد الشراء مطلوب عند اختيار نوع الملكية 'مملوكة للشركة'");
      return;
    }

    // Model Year validation (1950 - 2200)
    if (formData.modelYear !== null && formData.modelYear !== undefined && formData.modelYear !== 0) {
      if (formData.modelYear < 1950 || formData.modelYear > 2200) {
        toast.error("خطأ في البيانات", "سنة الصنع يجب أن تكون بين 1950 و 2200");
        return;
      }
    }

    // Odometer validation for new vehicles
    if (!editingVehicle) {
      if (formData.currentOdometer === undefined || formData.currentOdometer === null || formData.currentOdometer < 0) {
        toast.error("خطأ في البيانات", "قراءة العداد الحالية يجب أن تكون 0 أو أكثر");
        return;
      }
    }

    startTransition(async () => {
      try {
        const payload: VehicleUpsertRequest = {
          ...formData,
          assetNumber: formData.assetNumber?.trim() || null,
          serialNumber: formData.serialNumber?.trim() || null,
          chassisNumber: formData.chassisNumber?.trim() || null,
          plateNumberAr: formData.plateNumberAr?.trim() || null,
          plateNumberEn: formData.plateNumberEn?.trim() || null,
          plateLettersAr: formData.plateLettersAr?.trim() || null,
          plateLettersEn: formData.plateLettersEn?.trim() || null,
          plateDigits: formData.plateDigits?.trim() || null,
          vin: formData.vin?.trim() || null,
          engineNumber: formData.engineNumber?.trim() || null,
          sponsorId: formData.sponsorId || null,
          operatingCityId: formData.operatingCityId || null,
          purchasedFromSupplierId: formData.purchasedFromSupplierId || null,
          colorAr: formData.colorAr?.trim() || null,
          colorEn: formData.colorEn?.trim() || null,
          ownerName: formData.ownerName?.trim() || null,
          acquisitionDate: formData.acquisitionDate?.trim() || null,
          leaseReference: formData.leaseReference?.trim() || null,
          notes: formData.notes?.trim() || null,
        };

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
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                الرقم التسلسلي (الاستمارة) <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.serialNumber || ""}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="SN-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                رقم الهيكل (Chassis Number) <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.chassisNumber || ""}
                onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                placeholder="CH-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">رقم التعرف على المركبة (VIN)</label>
              <Input
                value={formData.vin || ""}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                placeholder="1HGCM82633A123456"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">رقم المحرك</label>
              <Input
                value={formData.engineNumber || ""}
                onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                placeholder="EN-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                رقم اللوحة (عربي) <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.plateNumberAr || ""}
                onChange={(e) => setFormData({ ...formData, plateNumberAr: e.target.value })}
                placeholder="أ ب ج 1234"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                رقم اللوحة (إنجليزي) <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.plateNumberEn || ""}
                onChange={(e) => setFormData({ ...formData, plateNumberEn: e.target.value })}
                placeholder="ABC 1234"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">أحرف اللوحة (عربي)</label>
              <Input
                value={formData.plateLettersAr || ""}
                onChange={(e) => setFormData({ ...formData, plateLettersAr: e.target.value })}
                placeholder="أ ب ج"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">أحرف اللوحة (إنجليزي)</label>
              <Input
                value={formData.plateLettersEn || ""}
                onChange={(e) => setFormData({ ...formData, plateLettersEn: e.target.value })}
                placeholder="ABC"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">أرقام اللوحة</label>
              <Input
                value={formData.plateDigits || ""}
                onChange={(e) => setFormData({ ...formData, plateDigits: e.target.value })}
                placeholder="1234"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                نوع التسجيل <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: VehicleRegistrationType.Private.toString(), label: "خصوصي" },
                  { value: VehicleRegistrationType.PrivateTransport.toString(), label: "نقل خاص" },
                  { value: VehicleRegistrationType.PublicTransport.toString(), label: "نقل عام" },
                  { value: VehicleRegistrationType.Motorcycle.toString(), label: "دراجة آلية" },
                  { value: VehicleRegistrationType.SmallBus.toString(), label: "حافلة صغيرة" },
                  { value: VehicleRegistrationType.PublicBus.toString(), label: "حافلة عامة" },
                  { value: VehicleRegistrationType.Taxi.toString(), label: "أجرة" },
                  { value: VehicleRegistrationType.PublicWorks.toString(), label: "أشغال عامة" },
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
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                الصانع <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={manufacturers.map((m) => ({ value: m.id, label: m.nameAr }))}
                value={formData.vehicleManufacturerId}
                placeholder="اختر الصانع..."
                onChange={(v) => {
                  setFormData({ ...formData, vehicleManufacturerId: v, vehicleModelId: "" });
                }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                الموديل <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={availableModels.map((m) => ({ value: m.id, label: m.nameAr }))}
                value={formData.vehicleModelId}
                placeholder="اختر الموديل..."
                onChange={(v) => {
                  const mod = availableModels.find((x) => x.id === v);
                  if (mod) {
                    setFormData({
                      ...formData,
                      vehicleModelId: v,
                      vehicleType: mod.vehicleType,
                      fuelType: mod.defaultFuelType,
                    });
                  } else {
                    setFormData({ ...formData, vehicleModelId: v });
                  }
                }}
                disabled={!formData.vehicleManufacturerId}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                سنة الصنع <span className="text-slate-400 text-xs font-normal">(1950 - 2200)</span>
              </label>
              <Input
                type="number"
                min="1950"
                max="2200"
                value={formData.modelYear || ""}
                onChange={(e) => setFormData({ ...formData, modelYear: parseInt(e.target.value) || new Date().getFullYear() })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                نوع المركبة <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: VehicleType.Car.toString(), label: "سيارة" },
                  { value: VehicleType.Motorcycle.toString(), label: "دراجة نارية" },
                  { value: VehicleType.Van.toString(), label: "فان / شاحنة صغيرة" },
                  { value: VehicleType.Truck.toString(), label: "شاحنة" },
                  { value: VehicleType.Other.toString(), label: "أخرى" },
                ]}
                value={formData.vehicleType.toString()}
                onChange={(v) => setFormData({ ...formData, vehicleType: parseInt(v) as VehicleType })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                نوع الوقود <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: VehicleFuelType.Petrol.toString(), label: "بنزين" },
                  { value: VehicleFuelType.Diesel.toString(), label: "ديزل" },
                  { value: VehicleFuelType.Electric.toString(), label: "كهرباء" },
                  { value: VehicleFuelType.Hybrid.toString(), label: "هايبرد" },
                  { value: VehicleFuelType.Other.toString(), label: "أخرى" },
                ]}
                value={formData.fuelType.toString()}
                onChange={(v) => setFormData({ ...formData, fuelType: parseInt(v) as VehicleFuelType })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                ناقل الحركة <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: VehicleTransmissionType.Automatic.toString(), label: "أوتوماتيك" },
                  { value: VehicleTransmissionType.Manual.toString(), label: "عادي" },
                  { value: VehicleTransmissionType.Other.toString(), label: "أخرى" },
                ]}
                value={formData.transmissionType.toString()}
                onChange={(v) => setFormData({ ...formData, transmissionType: parseInt(v) as VehicleTransmissionType })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">اللون (عربي)</label>
              <SearchableSelect
                options={COMMON_VEHICLE_COLORS.map((c) => ({ value: c.ar, label: c.ar, sublabel: c.en }))}
                value={formData.colorAr || ""}
                placeholder="اختر اللون بالعربي..."
                onChange={(val) => {
                  const match = COMMON_VEHICLE_COLORS.find((c) => c.ar === val);
                  setFormData({
                    ...formData,
                    colorAr: val,
                    colorEn: match ? match.en : formData.colorEn,
                  });
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">اللون (إنجليزي)</label>
              <SearchableSelect
                options={COMMON_VEHICLE_COLORS.map((c) => ({ value: c.en, label: c.en, sublabel: c.ar }))}
                value={formData.colorEn || ""}
                placeholder="Select English color..."
                onChange={(val) => {
                  const match = COMMON_VEHICLE_COLORS.find((c) => c.en === val);
                  setFormData({
                    ...formData,
                    colorEn: val,
                    colorAr: match ? match.ar : formData.colorAr,
                  });
                }}
              />
            </div>
          </div>
        </div>

        {/* Ownership & Operation */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">الملكية والتشغيل</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                الكفيل / الكيان المالك <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={sponsors.map((s) => ({ value: s.id, label: s.registryNameAr }))}
                value={formData.sponsorId || ""}
                placeholder="اختر الكفيل..."
                onChange={(v) => setFormData({ ...formData, sponsorId: v })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                مدينة التشغيل <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={cities.map((c) => ({ value: c.id, label: c.nameAr }))}
                value={formData.operatingCityId || ""}
                placeholder="اختر المدينة..."
                onChange={(v) => setFormData({ ...formData, operatingCityId: v })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                نوع الملكية <span className="text-red-500">*</span>
              </label>
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
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                مورد الشراء / التأجير{" "}
                {formData.ownershipType === VehicleOwnershipType.Owned ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
                )}
              </label>
              <SearchableSelect
                options={[
                  ...(formData.ownershipType !== VehicleOwnershipType.Owned ? [{ value: "", label: "لا يوجد" }] : []),
                  ...suppliers.map((s) => ({ value: s.id, label: s.nameAr })),
                ]}
                value={formData.purchasedFromSupplierId || ""}
                placeholder="اختر المورد..."
                onChange={(v) => setFormData({ ...formData, purchasedFromSupplierId: v })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">اسم المالك المسجل</label>
              <Input
                value={formData.ownerName || ""}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="مثال: شركة الحلول المتقدمة"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">تاريخ الاستحواذ / بداية العقد</label>
              <Input
                type="date"
                value={formData.acquisitionDate || ""}
                onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">مرجع عقد الإيجار</label>
              <Input
                value={formData.leaseReference || ""}
                onChange={(e) => setFormData({ ...formData, leaseReference: e.target.value })}
                placeholder="مثال: LEASE-2026-99"
              />
            </div>
            {!editingVehicle && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  قراءة العداد الحالية (كم) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.currentOdometer}
                  onChange={(e) => setFormData({ ...formData, currentOdometer: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">ملاحظات</label>
              <Input
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أي ملاحظات أو بيانات إضافية..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending} className="bg-[#1167c9] hover:bg-[#0e56a8] px-8">
            {isPending ? "جارٍ الحفظ..." : "حفظ بيانات المركبة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
