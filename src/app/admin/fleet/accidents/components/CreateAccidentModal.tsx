"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createVehicleAccident,
  getVehiclesLookup,
  getVehicleDetail,
  getVehicles,
  getVehicleAssignment,
  getVehicleRiderTimeline,
} from "@/lib/fleet/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
import { listRiders, listEmployees } from "@/lib/workforce/api";
import {
  VehicleAccidentSeverity,
  type VehicleSummaryResponse,
  type RiderVehicleAssignmentResponse,
} from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RealRiderNotice {
  name: string;
  iqamaNo?: string;
  relationshipToAssignedRider?: string;
  permissionReference?: string;
  assignedRiderName?: string;
}

function getLocalDatetimeString(d = new Date()) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function CreateAccidentModal({ isOpen, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const [vehicles, setVehicles] = useState<{ value: string; label: string }[]>([]);
  const [vehicleSummariesMap, setVehicleSummariesMap] = useState<Map<string, VehicleSummaryResponse>>(new Map());
  const [riders, setRiders] = useState<{ value: string; label: string }[]>([]);
  const [assignedRiderName, setAssignedRiderName] = useState("");
  const [realRiderNotice, setRealRiderNotice] = useState<RealRiderNotice | null>(null);
  const [loadingVehicleInfo, setLoadingVehicleInfo] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const [formData, setFormData] = useState({
    accidentNumber: "",
    vehicleId: "",
    riderProfileId: "",
    occurredAtUtc: getLocalDatetimeString(),
    locationDescription: "",
    latitude: "",
    longitude: "",
    policeReportNumber: "",
    insuranceClaimNumber: "",
    severity: VehicleAccidentSeverity.Minor,
    isDrivable: true,
    hasInjuries: false,
    injuryDetails: "",
    thirdPartyDetails: "",
    damageDescription: "",
    faultAssessment: "",
    narrative: "",
  });

  const hasAnyOptionalFilled = Boolean(
    formData.locationDescription.trim() ||
      formData.latitude.trim() ||
      formData.longitude.trim() ||
      formData.insuranceClaimNumber.trim() ||
      formData.damageDescription.trim() ||
      formData.narrative.trim() ||
      formData.thirdPartyDetails.trim() ||
      formData.faultAssessment.trim()
  );

  useEffect(() => {
    if (isOpen) {
      setFormData({
        accidentNumber: "",
        vehicleId: "",
        riderProfileId: "",
        occurredAtUtc: getLocalDatetimeString(),
        locationDescription: "",
        latitude: "",
        longitude: "",
        policeReportNumber: "",
        insuranceClaimNumber: "",
        severity: VehicleAccidentSeverity.Minor,
        isDrivable: true,
        hasInjuries: false,
        injuryDetails: "",
        thirdPartyDetails: "",
        damageDescription: "",
        faultAssessment: "",
        narrative: "",
      });
      setAssignedRiderName("");
      setRealRiderNotice(null);
      setLoadingVehicleInfo(false);
      setShowOptionalFields(false);

      // 1. Fetch vehicles lookup and detailed summaries
      Promise.all([
        getVehiclesLookup("").catch(() => []),
        getVehicles({ pageSize: 500 }).catch(() => ({ items: [] })),
      ]).then(([lookupRes, fullVehiclesRes]) => {
        const vMap = new Map<string, VehicleSummaryResponse>();
        if (fullVehiclesRes?.items) {
          fullVehiclesRes.items.forEach((item) => {
            vMap.set(item.id, item);
          });
        }
        setVehicleSummariesMap(vMap);

        const optionsMap = new Map<string, { value: string; label: string }>();

        // From lookup
        lookupRes.forEach((v) => {
          optionsMap.set(v.id, {
            value: v.id,
            label: `${v.assetNumber} - ${v.plateNumberAr || "بدون لوحة"}`,
          });
        });

        // From full list
        if (fullVehiclesRes?.items) {
          fullVehiclesRes.items.forEach((v) => {
            if (!optionsMap.has(v.id)) {
              optionsMap.set(v.id, {
                value: v.id,
                label: `${v.assetNumber || v.serialNumber || "مركبة"} - ${v.plateNumberAr || "بدون لوحة"}`,
              });
            }
          });
        }

        setVehicles(Array.from(optionsMap.values()));
      });

      // 2. Fetch workforce riders and employees
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
    }
  }, [isOpen]);

  const handleVehicleChange = async (vehicleId: string) => {
    setFormData((prev) => ({ ...prev, vehicleId, riderProfileId: "" }));
    setRealRiderNotice(null);
    setAssignedRiderName("");

    if (!vehicleId) return;

    setLoadingVehicleInfo(true);
    try {
      // 1. Check cached vehicle summary from getVehicles
      const cachedVeh = vehicleSummariesMap.get(vehicleId);

      // 2. Fetch vehicle detail from API
      const detailRes = await getVehicleDetail(vehicleId).catch((err) => {
        console.warn("Could not load vehicle detail:", err);
        return null;
      });
      const summary: VehicleSummaryResponse | undefined =
        detailRes?.summary || (detailRes as any) || cachedVeh;

      // 3. Fetch active assignment if assignmentId exists
      let assignment: RiderVehicleAssignmentResponse | null = null;
      const activeAssignmentId =
        summary?.currentAssignmentId ||
        cachedVeh?.currentAssignmentId ||
        (detailRes as any)?.currentAssignmentId;

      if (activeAssignmentId) {
        try {
          assignment = await getVehicleAssignment(activeAssignmentId);
        } catch (e) {
          console.warn("Could not fetch vehicle assignment directly:", e);
        }
      }

      // 4. Fallback to vehicle rider timeline if needed
      if (!assignment && !summary?.currentRiderProfileId && !cachedVeh?.currentRiderProfileId) {
        try {
          const timeline = await getVehicleRiderTimeline(vehicleId);
          const activeItem = timeline?.find(
            (t) => t.assignment?.status === 1 || !t.assignment?.endedAtUtc
          );
          if (activeItem?.assignment) {
            assignment = activeItem.assignment;
          }
        } catch (e) {
          console.warn("Could not fetch vehicle rider timeline:", e);
        }
      }

      // 5. Extract rider profile ID and assigned rider name
      const targetRiderId =
        assignment?.riderProfileId ||
        summary?.currentRiderProfileId ||
        cachedVeh?.currentRiderProfileId ||
        (detailRes as any)?.riderProfileId ||
        "";

      let targetRiderName =
        summary?.currentRiderName ||
        cachedVeh?.currentRiderName ||
        (assignment as any)?.riderName ||
        (assignment as any)?.employeeName ||
        "";

      if (targetRiderId) {
        // Find matching label if available in existing riders
        const existingOpt = riders.find((r) => r.value === targetRiderId);
        if (existingOpt && !targetRiderName) {
          targetRiderName = existingOpt.label;
        }

        // Ensure this rider is present in options list so SearchableSelect displays it
        setRiders((prev) => {
          if (!prev.some((r) => r.value === targetRiderId)) {
            return [
              {
                value: targetRiderId,
                label: targetRiderName || `المندوب المسجل (${targetRiderId})`,
              },
              ...prev,
            ];
          }
          return prev;
        });

        setFormData((prev) => ({
          ...prev,
          vehicleId,
          riderProfileId: targetRiderId,
        }));
        setAssignedRiderName(targetRiderName || "المندوب المسجل");
      }

      // 6. Check for real rider (المندوب الفعلي)
      const isNotReal =
        assignment?.isRealRider === false ||
        summary?.isRealRider === false ||
        cachedVeh?.isRealRider === false ||
        String(assignment?.isRealRider) === "false" ||
        String(summary?.isRealRider) === "false" ||
        String(cachedVeh?.isRealRider) === "false";

      const rawRealRider =
        assignment?.realRider ||
        summary?.realRider ||
        cachedVeh?.realRider ||
        (assignment as any)?.actualRider ||
        summary?.actualRider ||
        cachedVeh?.actualRider;

      let detectedRealRider: RealRiderNotice | null = null;

      if (
        rawRealRider &&
        (rawRealRider.name ||
          rawRealRider.actualRiderName ||
          rawRealRider.iqamaNo ||
          rawRealRider.actualRiderIqamaNo)
      ) {
        detectedRealRider = {
          name: rawRealRider.name || rawRealRider.actualRiderName || "—",
          iqamaNo: rawRealRider.iqamaNo || rawRealRider.actualRiderIqamaNo || "",
          relationshipToAssignedRider:
            rawRealRider.relationshipToAssignedRider ||
            rawRealRider.relationshipToSelectedRider ||
            "",
          permissionReference:
            assignment?.permissionReference || (summary as any)?.permissionReference || "",
          assignedRiderName: targetRiderName,
        };
      } else if (isNotReal && rawRealRider) {
        detectedRealRider = {
          name: rawRealRider.name || rawRealRider.actualRiderName || "—",
          iqamaNo: rawRealRider.iqamaNo || rawRealRider.actualRiderIqamaNo || "",
          relationshipToAssignedRider:
            rawRealRider.relationshipToAssignedRider ||
            rawRealRider.relationshipToSelectedRider ||
            "",
          permissionReference: assignment?.permissionReference || "",
          assignedRiderName: targetRiderName,
        };
      }

      if (detectedRealRider) {
        setRealRiderNotice(detectedRealRider);

        // Toast notification when choosing vehicle with real rider
        toast.warning(
          "تنبيه: المندوب الفعلي (Actual Rider)",
          `المركبة مسجل عليها تفويض بمندوب فعلي: ${detectedRealRider.name}${detectedRealRider.iqamaNo ? ` (رقم الإقامة: ${detectedRealRider.iqamaNo})` : ""
          }${detectedRealRider.relationshipToAssignedRider
            ? ` - صلة القرابة: ${detectedRealRider.relationshipToAssignedRider}`
            : ""
          }`
        );
      } else if (targetRiderId && targetRiderName) {
        toast.info(
          "تم تحديد المندوب",
          `تم تعبئة المندوب صاحب تفويض العهدة تلقائياً: ${targetRiderName}`
        );
      }
    } catch (err) {
      console.error("Failed to load vehicle assignment details:", err);
    } finally {
      setLoadingVehicleInfo(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const accidentNumber = formData.accidentNumber.trim();
    const vehicleId = formData.vehicleId.trim();
    const riderProfileId = formData.riderProfileId.trim();
    const policeReportNumber = formData.policeReportNumber.trim();

    if (!accidentNumber) {
      toast.error("بيانات غير مكتملة", "رقم الحادث (Accident Number) إلزامي ومطلوب.");
      return;
    }
    if (accidentNumber.length > 64) {
      toast.error("رقم غير صالح", "رقم الحادث يجب ألا يتجاوز 64 حرفاً.");
      return;
    }
    if (!vehicleId) {
      toast.error("بيانات غير مكتملة", "يرجى اختيار المركبة.");
      return;
    }
    if (!riderProfileId) {
      toast.error("بيانات غير مكتملة", "يرجى اختيار المندوب (السائق).");
      return;
    }
    if (!formData.occurredAtUtc) {
      toast.error("تاريخ غير صالح", "يرجى تحديد تاريخ ووقت الحادث.");
      return;
    }

    const occurredDate = new Date(formData.occurredAtUtc);
    if (isNaN(occurredDate.getTime())) {
      toast.error("تاريخ غير صالح", "تاريخ ووقت الحادث غير صالح، يرجى إدخال تاريخ صحيح.");
      return;
    }
    if (occurredDate.getTime() > Date.now()) {
      toast.error("تاريخ غير صالح", "تاريخ ووقت الحادث لا يمكن أن يكون في المستقبل.");
      return;
    }

    if (!policeReportNumber) {
      toast.error("بيانات غير مكتملة", "رقم تقرير المرور / نجم إلزامي ومطلوب.");
      return;
    }

    const severityNum = Number(formData.severity);
    if (![1, 2, 3, 4].includes(severityNum)) {
      toast.error("خطورة غير صالحة", "درجة خطورة الحادث يجب أن تكون 1، 2، 3 أو 4.");
      return;
    }

    if (formData.hasInjuries && !formData.injuryDetails.trim()) {
      toast.error("بيانات غير مكتملة", "تفاصيل الإصابات البشرية مطلوبة طالما تم تحديد وجود إصابات.");
      return;
    }

    let latitude: number | null = null;
    if (formData.latitude.trim() !== "") {
      const parsedLat = parseFloat(formData.latitude.trim());
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        toast.error("إحداثيات غير صالحة", "خط العرض (Latitude) يجب أن يكون رقماً بين -90 و 90.");
        return;
      }
      latitude = parsedLat;
    }

    let longitude: number | null = null;
    if (formData.longitude.trim() !== "") {
      const parsedLng = parseFloat(formData.longitude.trim());
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        toast.error("إحداثيات غير صالحة", "خط الطول (Longitude) يجب أن يكون رقماً بين -180 و 180.");
        return;
      }
      longitude = parsedLng;
    }

    startTransition(async () => {
      try {
        const payload: Parameters<typeof createVehicleAccident>[0] = {
          accidentNumber,
          vehicleId,
          riderProfileId,
          occurredAtUtc: occurredDate.toISOString(),
          policeReportNumber,
          severity: severityNum as VehicleAccidentSeverity,
          isDrivable: Boolean(formData.isDrivable),
          hasInjuries: Boolean(formData.hasInjuries),
          ...(formData.hasInjuries && formData.injuryDetails.trim()
            ? { injuryDetails: formData.injuryDetails.trim() }
            : {}),
          ...(formData.locationDescription.trim()
            ? { locationDescription: formData.locationDescription.trim() }
            : {}),
          ...(latitude !== null ? { latitude } : {}),
          ...(longitude !== null ? { longitude } : {}),
          ...(formData.insuranceClaimNumber.trim()
            ? { insuranceClaimNumber: formData.insuranceClaimNumber.trim() }
            : {}),
          ...(formData.damageDescription.trim()
            ? { damageDescription: formData.damageDescription.trim() }
            : {}),
          ...(formData.narrative.trim()
            ? { narrative: formData.narrative.trim() }
            : {}),
          ...(formData.thirdPartyDetails.trim()
            ? { thirdPartyDetails: formData.thirdPartyDetails.trim() }
            : {}),
          ...(formData.faultAssessment.trim()
            ? { faultAssessment: formData.faultAssessment.trim() }
            : {}),
        };

        await createVehicleAccident(payload);
        onSuccess();
      } catch (err: any) {
        toast.error("فشل التسجيل", err?.message || "حدث خطأ أثناء تسجيل الحادث.");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل حادث سير" maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6 pt-4" dir="rtl">
        {/* Accident Number (First Input) */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            رقم الحادث (Accident Number) <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.accidentNumber}
            onChange={(e) => setFormData({ ...formData, accidentNumber: e.target.value })}
            placeholder="مثال: ACC-2026-000123"
            maxLength={64}
            required
            autoFocus
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            رقم تعريفي فريد للحادث يتم إدخاله بواسطة المستخدم (حد أقصى 64 حرفاً، منفصل عن رقم تقرير المرور/نجم).
          </p>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              المركبة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={vehicles}
              value={formData.vehicleId}
              placeholder="اختر المركبة..."
              searchPlaceholder="بحث برقم المركبة أو اللوحة..."
              onChange={(v) => handleVehicleChange(v)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                المندوب (السائق) <span className="text-red-500">*</span>
              </label>
              {loadingVehicleInfo ? (
                <span className="text-xs font-normal text-blue-600 dark:text-blue-400 animate-pulse">
                  جارٍ فحص بيانات التفويض...
                </span>
              ) : assignedRiderName ? (
                <span className="text-xs font-normal text-blue-600 dark:text-blue-400">
                  (تم التعبئة من تفويض المركبة)
                </span>
              ) : null}
            </div>
            <SearchableSelect
              options={riders}
              value={formData.riderProfileId}
              placeholder="اختر المندوب..."
              searchPlaceholder="بحث بالاسم أو الإقامة..."
              onChange={(v) => setFormData({ ...formData, riderProfileId: v })}
            />
          </div>
        </div>

        {/* Notice of Autofilled Assigned Rider */}
        {assignedRiderName && !realRiderNotice && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              تم تعبئة المندوب صاحب العهدة الحالية تلقائياً من تفويض التشغيل: <strong>{assignedRiderName}</strong>
            </span>
          </div>
        )}

        {/* Real Rider Warning & Notification Card */}
        {realRiderNotice && (
          <div className="rounded-2xl border-2 border-purple-300 bg-purple-50/90 p-4 text-purple-950 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0 shadow-sm">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-purple-950 dark:text-purple-100">
                      تنبيه: مسجل مندوب فعلي (Real Rider) في تفويض هذه المركبة
                    </h4>
                    <span className="rounded-md bg-purple-200 dark:bg-purple-900 px-2 py-0.5 text-[11px] font-bold text-purple-800 dark:text-purple-200">
                      بيانات تفويض الاستلام
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const noteText = `(المندوب الفعلي وقت الحادث: ${realRiderNotice.name}${realRiderNotice.iqamaNo ? ` - إقامة: ${realRiderNotice.iqamaNo}` : ""
                        }${realRiderNotice.relationshipToAssignedRider
                          ? ` - صلة القرابة: ${realRiderNotice.relationshipToAssignedRider}`
                          : ""
                        }${realRiderNotice.permissionReference
                          ? ` - مرجع التفويض: ${realRiderNotice.permissionReference}`
                          : ""
                        })`;
                      setFormData((prev) => ({
                        ...prev,
                        narrative: prev.narrative
                          ? `${prev.narrative}\n${noteText}`
                          : `ملاحظة: ${noteText}`,
                      }));
                      setShowOptionalFields(true);
                      toast.success("تم التضمين", "تم إدراج بيانات المندوب الفعلي في سرد الحادث.");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span>إدراج بالسرد</span>
                  </button>
                </div>
                <p className="text-xs text-purple-800 dark:text-purple-300">
                  المركبة مسلمة نظاماً في عهدة{" "}
                  <strong>{assignedRiderName || "المندوب الأساسي"}</strong>، ولكن مسجل في تفويض الاستلام أن هناك <strong>مندوباً فعلياً</strong> يقودها:
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs font-semibold flex-wrap">
                  <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                    الاسم: <strong>{realRiderNotice.name}</strong>
                  </span>
                  {realRiderNotice.iqamaNo && (
                    <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 font-mono">
                      رقم الإقامة: <strong>{realRiderNotice.iqamaNo}</strong>
                    </span>
                  )}
                  {realRiderNotice.relationshipToAssignedRider && (
                    <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                      صلة القرابة / العلاقة: <strong>{realRiderNotice.relationshipToAssignedRider}</strong>
                    </span>
                  )}
                  {realRiderNotice.permissionReference && (
                    <span className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 font-mono">
                      رقم التفويض: <strong>{realRiderNotice.permissionReference}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Required Fields: Date & Police Report Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              تاريخ ووقت الحادث <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              max={getLocalDatetimeString()}
              value={formData.occurredAtUtc}
              onChange={(e) => setFormData({ ...formData, occurredAtUtc: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              رقم تقرير المرور / نجم <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.policeReportNumber}
              onChange={(e) => setFormData({ ...formData, policeReportNumber: e.target.value })}
              placeholder="مثال: NAJM-123456 أو TRAFFIC-XXXXXX"
              required
            />
          </div>
        </div>

        {/* Primary Required Fields: Status & Severity */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                درجة خطورة الحادث <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: VehicleAccidentSeverity.Minor.toString(), label: "1 - بسيط (خدوش، صدمة خفيفة)" },
                  { value: VehicleAccidentSeverity.Moderate.toString(), label: "2 - متوسط (يحتاج صيانة)" },
                  { value: VehicleAccidentSeverity.Serious.toString(), label: "3 - خطير (تلفيات كبيرة)" },
                  { value: VehicleAccidentSeverity.Critical.toString(), label: "4 - حرج (تلف كلي)" },
                ]}
                value={formData.severity.toString()}
                onChange={(v) => setFormData({ ...formData, severity: parseInt(v) as VehicleAccidentSeverity })}
              />
            </div>
            <div className="flex flex-col gap-3 justify-center">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDrivable}
                  onChange={(e) => setFormData({ ...formData, isDrivable: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                المركبة قابلة للقيادة حالياً (لا تحتاج لسطحة)
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-red-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasInjuries}
                  onChange={(e) => setFormData({ ...formData, hasInjuries: e.target.checked })}
                  className="h-5 w-5 rounded border-red-300 text-red-600 focus:ring-red-600"
                />
                يوجد إصابات بشرية في الحادث
              </label>
            </div>
          </div>

          {/* Conditional Injury Details */}
          {formData.hasInjuries && (
            <div className="pt-2 border-t border-red-200 dark:border-red-900/50 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="mb-1 block text-sm font-bold text-red-700 dark:text-red-300">
                تفاصيل الإصابات البشرية <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-red-300 p-2.5 text-sm focus:border-red-600 focus:outline-none dark:border-red-800 dark:bg-slate-900"
                rows={2}
                value={formData.injuryDetails}
                onChange={(e) => setFormData({ ...formData, injuryDetails: e.target.value })}
                placeholder="يرجى توضيح نوع الإصابات وحالة المصابين والمستشفى الذي تم النقل إليه..."
                required={formData.hasInjuries}
              ></textarea>
            </div>
          )}
        </div>

        {/* Collapsible Optional Fields */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowOptionalFields((prev) => !prev)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 transition-colors text-right"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div className="text-right">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 block">
                  بيانات وتفاصيل إضافية (اختياري)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  الموقع، الأضرار، السرد، التأمين، بيانات الطرف الثالث
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasAnyOptionalFilled && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                  تم إدخال تفاصيل
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                  showOptionalFields ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {showOptionalFields && (
            <div className="mt-3 space-y-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Location */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  موقع الحادث (المدينة، الحي، الشارع) <span className="text-xs font-normal text-slate-400">(اختياري)</span>
                </label>
                <Input
                  value={formData.locationDescription}
                  onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
                  placeholder="مثال: الرياض - طريق الملك فهد - حي العليا"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    خط العرض (Latitude) <span className="text-xs font-normal text-slate-400">(اختياري: من -90 إلى 90)</span>
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="مثال: 24.7136"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    خط الطول (Longitude) <span className="text-xs font-normal text-slate-400">(اختياري: من -180 إلى 180)</span>
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="مثال: 46.6753"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Insurance Claim Number */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  رقم مطالبة التأمين <span className="text-xs font-normal text-slate-400">(اختياري)</span>
                </label>
                <Input
                  value={formData.insuranceClaimNumber}
                  onChange={(e) => setFormData({ ...formData, insuranceClaimNumber: e.target.value })}
                  placeholder="مثال: CLM-123456"
                />
              </div>

              {/* Damage Description */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  وصف الأضرار والتلفيات بالمركبة <span className="text-xs font-normal text-slate-400">(اختياري)</span>
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  rows={2}
                  value={formData.damageDescription}
                  onChange={(e) => setFormData({ ...formData, damageDescription: e.target.value })}
                  placeholder="مثال: تلفيات بالصدام الخلفي، كسر في الأنوار الخلفية..."
                ></textarea>
              </div>

              {/* Narrative & Assessment */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  سرد تفاصيل وكيفية وقوع الحادث <span className="text-xs font-normal text-slate-400">(اختياري)</span>
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                  rows={3}
                  value={formData.narrative}
                  onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
                  placeholder="يرجى وصف ما حدث وتتابع الأحداث بالتفصيل..."
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    تفاصيل الطرف الثالث <span className="text-xs font-normal text-slate-400">(اختياري)</span>
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    rows={2}
                    value={formData.thirdPartyDetails}
                    onChange={(e) => setFormData({ ...formData, thirdPartyDetails: e.target.value })}
                    placeholder="بيانات المركبة الأخرى، السائق، التأمين..."
                  ></textarea>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    نسبة الخطأ / التقييم المبدئي <span className="text-xs font-normal text-slate-400">(اختياري)</span>
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    rows={2}
                    value={formData.faultAssessment}
                    onChange={(e) => setFormData({ ...formData, faultAssessment: e.target.value })}
                    placeholder="مثال: الخطأ 100% على الطرف الآخر..."
                  ></textarea>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white font-bold">
            {isPending ? "جارٍ الحفظ..." : "تسجيل تقرير الحادث"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
