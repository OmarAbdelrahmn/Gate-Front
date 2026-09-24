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
  VehicleOperationalStatus,
  type VehicleUpsertRequest,
  type VehicleDetailResponse,
  type VehicleManufacturerResponse,
  type VehicleModelResponse,
  type VehicleSupplierResponse,
} from "@/lib/fleet/types";
import { formatVehicleOperationalStatus } from "@/lib/fleet/formatters";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { getOperatingCities, type OperatingCityCatalogItem } from "@/lib/workforce/external-riders-api";
import { Sparkles, Landmark, ShieldCheck, Building2, Info, AlertCircle, Activity } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingVehicle?: VehicleDetailResponse;
}

type RegisteredOwnerMode = "implicit" | "supplier" | "sponsor";

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
  { ar: "ذهبي", en: "Gold" },
  { ar: "بني", en: "Brown" },
  { ar: "أصفر", en: "Yellow" },
  { ar: "أخضر", en: "Green" },
];

export function VehicleUpsertModal({ isOpen, onClose, onSuccess, editingVehicle }: Props) {
  const { can } = useAuth();
  const canDecommission = can("fleet.vehicles.decommission");
  const [isPending, startTransition] = useTransition();
  const [currentOperationalStatus, setCurrentOperationalStatus] = useState<number | null>(null);

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
    registeredOwnerSupplierId: null,
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

  const [ownerMode, setOwnerMode] = useState<RegisteredOwnerMode>("implicit");
  const [sponsorsForbidden, setSponsorsForbidden] = useState<boolean>(false);

  const [manufacturers, setManufacturers] = useState<VehicleManufacturerResponse[]>([]);
  const [allModels, setAllModels] = useState<VehicleModelResponse[]>([]);
  const [suppliers, setSuppliers] = useState<VehicleSupplierResponse[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [cities, setCities] = useState<OperatingCityCatalogItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load dependencies safely without one failure aborting all
      const mfgPromise = getVehicleManufacturers().catch(() => [] as VehicleManufacturerResponse[]);
      const modPromise = getVehicleModels().catch(() => [] as VehicleModelResponse[]);
      const supPromise = getVehicleSuppliers().catch(() => [] as VehicleSupplierResponse[]);
      const citPromise = getOperatingCities().catch(() => [] as OperatingCityCatalogItem[]);
      const spoPromise = listSponsors()
        .then((res) => {
          setSponsorsForbidden(false);
          return res;
        })
        .catch((err: unknown) => {
          const e = err as { status?: number };
          if (e?.status === 403) {
            setSponsorsForbidden(true);
          }
          return [] as Sponsor[];
        });

      Promise.all([mfgPromise, modPromise, supPromise, spoPromise, citPromise]).then(
        ([mfg, mod, sup, spo, cit]) => {
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
        }
      );

      if (editingVehicle) {
        const currentOwnerId = editingVehicle.registeredOwnerSupplierId || null;
        const currentOwnerType = editingVehicle.registeredOwnerType;

        let initialMode: RegisteredOwnerMode = "implicit";
        if (currentOwnerId) {
          if (currentOwnerType === "Sponsor") {
            initialMode = "sponsor";
          } else if (currentOwnerType === "Supplier") {
            initialMode = "supplier";
          } else {
            // Default fallback if type not provided
            initialMode = "supplier";
          }
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOwnerMode(initialMode);
        setFormData({
          assetNumber: editingVehicle.summary.assetNumber,
          serialNumber: editingVehicle.serialNumber || "",
          plateNumberAr: editingVehicle.summary.plateNumberAr || "",
          plateNumberEn: editingVehicle.summary.plateNumberEn || "",
          plateLettersAr: editingVehicle.plateLettersAr || "",
          plateLettersEn: editingVehicle.plateLettersEn || "",
          plateDigits: editingVehicle.plateDigits || "",
          vin: editingVehicle.vin || "",
          chassisNumber: editingVehicle.chassisNumber || "",
          engineNumber: editingVehicle.engineNumber || "",
          sponsorId: editingVehicle.summary.sponsorId || "",
          operatingCityId: editingVehicle.summary.operatingCityId || "",
          purchasedFromSupplierId: editingVehicle.purchasedFromSupplierId || "",
          registeredOwnerSupplierId: currentOwnerId,
          registrationType: editingVehicle.registrationType ?? editingVehicle.summary.registrationType,
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
        setCurrentOperationalStatus(null);
      } else {
        setOwnerMode("implicit");
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
          registeredOwnerSupplierId: null,
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
        setCurrentOperationalStatus(null);
      }
    }
  }, [isOpen, editingVehicle]);

  const availableModels = allModels.filter((m) => m.vehicleManufacturerId === formData.vehicleManufacturerId);

  const statusOptions = [
    {
      value: "",
      label: editingVehicle
        ? `الاحتفاظ بالحالة الحالية (${formatVehicleOperationalStatus(editingVehicle.summary.status)})`
        : "الاحتفاظ بالحالة الحالية (بدون تغيير)",
    },
    { value: String(VehicleOperationalStatus.Available), label: "متاح (Available)" },
    { value: String(VehicleOperationalStatus.ProblemHold), label: "إيقاف - مشكلة (ProblemHold)" },
    { value: String(VehicleOperationalStatus.AccidentHold), label: "إيقاف - حادث (AccidentHold)" },
    { value: String(VehicleOperationalStatus.Stolen), label: "مسروق (Stolen)" },
    { value: String(VehicleOperationalStatus.OutOfService), label: "خارج الخدمة (OutOfService)" },
    ...(canDecommission || editingVehicle?.summary.status === VehicleOperationalStatus.Decommissioned
      ? [{ value: String(VehicleOperationalStatus.Decommissioned), label: "تالف / مستبعد (Decommissioned)" }]
      : []),
  ];

  // Computed options that preserve existing selections even if archived or 403 Forbidden
  const operatingSponsorOptions = sponsors.map((s) => ({
    value: s.id,
    label: s.registryNameAr,
    sublabel: s.registryNameEn || s.employerIdentityNumber || undefined,
    keywords: `${s.registryNameEn || ""} ${s.employerIdentityNumber || ""}`,
  }));
  if (
    editingVehicle?.summary?.sponsorId &&
    !operatingSponsorOptions.some((o) => o.value === editingVehicle.summary.sponsorId)
  ) {
    operatingSponsorOptions.unshift({
      value: editingVehicle.summary.sponsorId,
      label: editingVehicle.summary.sponsorName || editingVehicle.summary.sponsorId,
      sublabel: "(الكفيل المشغّل الحالي)",
      keywords: "",
    });
  }

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.nameAr,
    sublabel: s.nameEn || s.code || undefined,
    keywords: `${s.nameEn || ""} ${s.code || ""} ${s.commercialRegistrationNumber || ""}`,
  }));
  const purchaseSupplierOptions = suppliers.map((s) => ({ value: s.id, label: s.nameAr }));
  if (
    editingVehicle?.purchasedFromSupplierId &&
    !purchaseSupplierOptions.some((option) => option.value === editingVehicle.purchasedFromSupplierId)
  ) {
    purchaseSupplierOptions.unshift({
      value: editingVehicle.purchasedFromSupplierId,
      label: editingVehicle.supplierName || editingVehicle.purchasedFromSupplierId,
    });
  }
  if (
    editingVehicle?.registeredOwnerSupplierId &&
    ownerMode === "supplier" &&
    !supplierOptions.some((o) => o.value === editingVehicle.registeredOwnerSupplierId)
  ) {
    supplierOptions.unshift({
      value: editingVehicle.registeredOwnerSupplierId,
      label: editingVehicle.registeredOwnerSupplier || editingVehicle.registeredOwnerSupplierId,
      sublabel: "(المالك المسجل الحالي)",
      keywords: "",
    });
  }

  const sponsorOptions = sponsors.map((sp) => ({
    value: sp.id,
    label: sp.registryNameAr,
    sublabel: sp.registryNameEn || sp.employerIdentityNumber || undefined,
    keywords: `${sp.registryNameEn || ""} ${sp.employerIdentityNumber || ""} ${sp.commercialRegistrationNumber || ""}`,
  }));
  if (
    editingVehicle?.registeredOwnerSupplierId &&
    ownerMode === "sponsor" &&
    !sponsorOptions.some((o) => o.value === editingVehicle.registeredOwnerSupplierId)
  ) {
    sponsorOptions.unshift({
      value: editingVehicle.registeredOwnerSupplierId,
      label: editingVehicle.registeredOwnerSupplier || editingVehicle.registeredOwnerSupplierId,
      sublabel: "(المالك المسجل الحالي)",
      keywords: "",
    });
  }

  const selectedSponsor = sponsors.find((s) => s.id === formData.sponsorId);
  const selectedSponsorName =
    selectedSponsor?.registryNameAr ||
    (editingVehicle && editingVehicle.summary.sponsorId === formData.sponsorId
      ? editingVehicle.summary.sponsorName
      : null) ||
    "الكفيل المشغّل";

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

    // Required selection when explicit supplier or sponsor owner is enabled
    if (ownerMode === "supplier" && !formData.registeredOwnerSupplierId) {
      toast.error("خطأ في البيانات", "يرجى اختيار جهة التمويل / المورد المالك المسجل");
      return;
    }
    if (ownerMode === "sponsor" && !formData.registeredOwnerSupplierId) {
      toast.error("خطأ في البيانات", "يرجى اختيار الكفيل المالك المسجل للمركبة");
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
          registeredOwnerSupplierId: ownerMode === "implicit" ? null : (formData.registeredOwnerSupplierId || null),
          colorAr: formData.colorAr?.trim() || null,
          colorEn: formData.colorEn?.trim() || null,
          ownerName: formData.ownerName?.trim() || null,
          acquisitionDate: formData.acquisitionDate?.trim() || null,
          leaseReference: formData.leaseReference?.trim() || null,
          notes: formData.notes?.trim() || null,
          currentOperationalStatus: editingVehicle ? currentOperationalStatus : null,
          rowVersion: editingVehicle ? editingVehicle.summary.rowVersion : null,
        };

        if (editingVehicle) {
          // Strictly preserve protected vehicle identity fields on PUT request
          payload.serialNumber = editingVehicle.serialNumber ?? null;
          payload.chassisNumber = editingVehicle.chassisNumber ?? null;
          payload.plateNumberAr = editingVehicle.summary.plateNumberAr ?? null;
          payload.plateNumberEn = editingVehicle.summary.plateNumberEn ?? null;
          payload.plateLettersAr = editingVehicle.plateLettersAr ?? null;
          payload.plateLettersEn = editingVehicle.plateLettersEn ?? null;
          payload.plateDigits = editingVehicle.plateDigits ?? null;
          payload.registrationType = editingVehicle.registrationType ?? editingVehicle.summary.registrationType;

          await updateVehicle(editingVehicle.summary.id, payload);
        } else {
          await createVehicle(payload);
        }
        onSuccess();
      } catch (err: unknown) {
        const e = err as { status?: number; message?: string };
        if (e?.status === 404) {
          toast.error("خطأ في المالك المسجل", e.message || "المالك المسجل المحدد غير موجود أو تمت أرشفته");
        }
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingVehicle ? "تعديل المركبة" : "إضافة مركبة جديدة"} maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        
        {/* Identity */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">هوية المركبة الأساسية</h3>
          
          {editingVehicle && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
              <span>بيانات الهوية والتسجيل (الرقم التسلسلي، رقم الهيكل، تفاصيل اللوحة، ونوع التسجيل) محمية من التعديل المباشر عند تحديث المركبة.</span>
            </div>
          )}

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
                disabled={Boolean(editingVehicle)}
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
                disabled={Boolean(editingVehicle)}
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
                disabled={Boolean(editingVehicle)}
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
                disabled={Boolean(editingVehicle)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">أحرف اللوحة (عربي)</label>
              <Input
                value={formData.plateLettersAr || ""}
                onChange={(e) => setFormData({ ...formData, plateLettersAr: e.target.value })}
                placeholder="أ ب ج"
                disabled={Boolean(editingVehicle)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">أحرف اللوحة (إنجليزي)</label>
              <Input
                value={formData.plateLettersEn || ""}
                onChange={(e) => setFormData({ ...formData, plateLettersEn: e.target.value })}
                placeholder="ABC"
                disabled={Boolean(editingVehicle)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">أرقام اللوحة</label>
              <Input
                value={formData.plateDigits || ""}
                onChange={(e) => setFormData({ ...formData, plateDigits: e.target.value })}
                placeholder="1234"
                disabled={Boolean(editingVehicle)}
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
                disabled={Boolean(editingVehicle)}
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

        {/* Operational Status (Update Mode) */}
        {editingVehicle && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#1167c9]" />
                <span>الحالة التشغيلية للمركبة (Operational Status)</span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">الحالة المسجلة حالياً:</span>
                <span className="font-bold px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-xs">
                  {formatVehicleOperationalStatus(editingVehicle.summary.status)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  تعديل الحالة التشغيلية للمركبة
                </label>
                <SearchableSelect
                  options={statusOptions}
                  value={currentOperationalStatus !== null ? String(currentOperationalStatus) : ""}
                  placeholder="الاحتفاظ بالحالة الحالية..."
                  onChange={(v) => setCurrentOperationalStatus(v ? Number(v) : null)}
                />
              </div>

              {/* Warning when transitioning away from Assigned */}
              {editingVehicle.summary.status === VehicleOperationalStatus.Assigned &&
                currentOperationalStatus !== null &&
                currentOperationalStatus !== VehicleOperationalStatus.Assigned && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong>تنبيه إنهاء التعيين:</strong> تغيير الحالة بعيداً عن (معيّن) سيقوم تلقائياً بإنهاء تعيين المندوب النشط المسلم له هذه المركبة في النظام.
                    </div>
                  </div>
                )}

              {/* Notice when transitioning away from Decommissioned */}
              {editingVehicle.summary.status === VehicleOperationalStatus.Decommissioned &&
                currentOperationalStatus !== null &&
                currentOperationalStatus !== VehicleOperationalStatus.Decommissioned && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                    <div>
                      <strong>إعادة التفعيل:</strong> تغيير الحالة بعيداً عن (تالف / مستبعد) سيقوم بمسح تاريخ وسبب الاستبعاد المسجل للمركبة تلقائياً.
                    </div>
                  </div>
                )}

              {/* Warning when choosing Decommissioned */}
              {currentOperationalStatus === VehicleOperationalStatus.Decommissioned &&
                editingVehicle.summary.status !== VehicleOperationalStatus.Decommissioned && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <strong>تنبيه الاستبعاد (تالف):</strong> سيتم إيقاف تشغيل المركبة بالكامل واستبعادها كمركبة تالفة. يتطلب هذا الإجراء صلاحية الاستبعاد (<code className="font-mono bg-rose-100 dark:bg-rose-900 px-1 py-0.5 rounded">fleet.vehicles.decommission</code>).
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Ownership & Operation */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">الملكية والتشغيل</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                الكفيل المشغّل (المستخدم الفعلي) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={operatingSponsorOptions}
                value={formData.sponsorId || ""}
                placeholder="اختر الكفيل المشغّل..."
                onChange={(v) => setFormData({ ...formData, sponsorId: v })}
              />
              {sponsorsForbidden && (
                <span className="mt-1 block text-[11px] text-amber-600 dark:text-amber-400">
                  تنبيه: لا تملك صلاحية عرض قائمة الكفلاء (workforce.sponsors.read)
                </span>
              )}
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
                مورد الشراء الأصلي{" "}
                <span className="text-slate-400 text-xs font-normal">(اختياري)</span>
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: "لا يوجد" },
                  ...purchaseSupplierOptions,
                ]}
                value={formData.purchasedFromSupplierId || ""}
                placeholder="اختر مورد الشراء..."
                onChange={(v) => setFormData({ ...formData, purchasedFromSupplierId: v })}
              />
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                مصدر شراء المركبة (يبقى محفوظاً ولا يتغير حتى بعد انتهاء التمويل أو تغيير المالك)
              </span>
            </div>

            {/* Registered Owner Section (Polymorphic: Operating Sponsor, Supplier, or Sponsor) */}
            <div className="col-span-1 md:col-span-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1167c9] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>المالك المسجل (في استمارة المركبة)</span>
                      {ownerMode === "implicit" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          الكفيل المشغّل (تلقائي)
                        </span>
                      )}
                      {ownerMode === "supplier" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          مورد / جهة تمويل (Supplier)
                        </span>
                      )}
                      {ownerMode === "sponsor" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          كفيل رسمي (Sponsor)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      حدد الجهة المسجلة رسمياً كمالك في الاستمارة (الكفيل المشغّل نفسه، جهة تمويل/مورد، أو كفيل مسجل آخر)
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3.5">
                {/* 1. Implicit (Operating Sponsor) */}
                <button
                  type="button"
                  onClick={() => {
                    setOwnerMode("implicit");
                    setFormData((prev) => ({ ...prev, registeredOwnerSupplierId: null }));
                  }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-start transition-all cursor-pointer ${
                    ownerMode === "implicit"
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
                  }`}
                >
                  <ShieldCheck
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      ownerMode === "implicit" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">الكفيل المشغّل (تلقائي)</div>
                    <div className="text-[11px] opacity-80 mt-0.5">مسجلة مباشرة باسم الكفيل المستخدم أعلاه</div>
                  </div>
                </button>

                {/* 2. Supplier */}
                <button
                  type="button"
                  onClick={() => {
                    setOwnerMode("supplier");
                    if (!suppliers.some((s) => s.id === formData.registeredOwnerSupplierId)) {
                      setFormData((prev) => ({ ...prev, registeredOwnerSupplierId: null }));
                    }
                  }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-start transition-all cursor-pointer ${
                    ownerMode === "supplier"
                      ? "border-amber-500 bg-amber-50/70 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-600 ring-2 ring-amber-500/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
                  }`}
                >
                  <Building2
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      ownerMode === "supplier" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">مورد / جهة تمويل</div>
                    <div className="text-[11px] opacity-80 mt-0.5">مسجلة باسم بنك أو جهة تمويل أو مورد</div>
                  </div>
                </button>

                {/* 3. Sponsor */}
                <button
                  type="button"
                  onClick={() => {
                    setOwnerMode("sponsor");
                    if (!sponsors.some((sp) => sp.id === formData.registeredOwnerSupplierId)) {
                      setFormData((prev) => ({
                        ...prev,
                        registeredOwnerSupplierId: formData.sponsorId || null,
                      }));
                    }
                  }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-start transition-all cursor-pointer ${
                    ownerMode === "sponsor"
                      ? "border-indigo-500 bg-indigo-50/70 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100 dark:border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300"
                  }`}
                >
                  <Landmark
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      ownerMode === "sponsor" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">كفيل رسمي (Sponsor)</div>
                    <div className="text-[11px] opacity-80 mt-0.5">مسجلة باسم كفيل (نفس المشغّل أو كفيل آخر)</div>
                  </div>
                </button>
              </div>

              {/* Mode-specific Content */}
              {ownerMode === "implicit" && (
                <div className="mt-3.5 flex items-start gap-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 p-3.5 border border-emerald-200/80 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">
                      المالك المسجل المعتمد: {selectedSponsorName}
                    </div>
                    <p className="text-emerald-700/90 dark:text-emerald-400/90 text-xs mt-1">
                      المركبة مسجلة رسمياً باسم الكفيل المشغّل المحدد أعلاه بدون وجود جهة تمويل أو كفيل مالك منفصل.
                    </p>
                  </div>
                </div>
              )}

              {ownerMode === "supplier" && (
                <div className="mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    جهة التمويل / المورد المالك المسجل <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={supplierOptions}
                    value={formData.registeredOwnerSupplierId || ""}
                    placeholder="اختر البنك أو المورد (مثال: مصرف الراجحي، شركة التمويل)..."
                    onChange={(v) => setFormData({ ...formData, registeredOwnerSupplierId: v })}
                  />
                  <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-800/50">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span>
                      ستُسجل المركبة باسم جهة التمويل/المورد المختارة كمالك مسجل، ويبقى الكفيل المختار أعلاه (
                      <strong>{selectedSponsorName}</strong>) هو المستخدم المشغّل الفعلي.
                    </span>
                  </div>
                </div>
              )}

              {ownerMode === "sponsor" && (
                <div className="mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-2">
                  {sponsorsForbidden ? (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <div className="font-bold">تنبيه الصلاحيات (403 Forbidden):</div>
                        <div>
                          لا تملك صلاحية استعراض الكفلاء (
                          <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">
                            workforce.sponsors.read
                          </code>
                          ).
                          {formData.registeredOwnerSupplierId && (
                            <span className="block mt-1 font-semibold">
                              تم الإبقاء على الكفيل المسجل الحالي المحفوظ في النظام.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        الكفيل المالك المسجل للمركبة <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={sponsorOptions}
                        value={formData.registeredOwnerSupplierId || ""}
                        placeholder="اختر الكفيل المالك المسجل..."
                        onChange={(v) => setFormData({ ...formData, registeredOwnerSupplierId: v })}
                      />
                      {formData.registeredOwnerSupplierId && (
                        <div
                          className={`flex items-start gap-2 text-xs p-2.5 rounded-lg border ${
                            formData.registeredOwnerSupplierId === formData.sponsorId
                              ? "text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/50"
                              : "text-blue-800 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/50"
                          }`}
                        >
                          <Info className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            {formData.registeredOwnerSupplierId === formData.sponsorId ? (
                              <>
                                المالك المسجل صراحة هو <strong>نفس الكفيل المشغّل</strong> ({selectedSponsorName}).
                              </>
                            ) : (
                              <>
                                الكفيل المالك المسجل يختلف عن الكفيل المشغّل (المالك المسجل:{" "}
                                <strong>
                                  {sponsorOptions.find((s) => s.value === formData.registeredOwnerSupplierId)?.label ||
                                    "الكفيل المختار"}
                                </strong>{" "}
                                | الكفيل المشغّل: <strong>{selectedSponsorName}</strong>).
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                اسم المالك المسجل (حقل نصي اختياري للتوافق)
              </label>
              <Input
                value={formData.ownerName || ""}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="حقل إضافي اختياري..."
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
