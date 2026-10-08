"use client";

import { useCallback, useEffect, useState, useTransition, useMemo, useRef } from "react";
import {
  takeVehicle,
  getVehiclesLookup,
  getVehicleDetail,
  getAllVehicles,
  getRiderPromissoryFiles,
  getAllVehicleAssignments,
  getEmployeeVehicleProfile,
  ensureEmployeeVehicleProfile,
  generateUUID,
} from "@/lib/fleet/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
import { listRiders, listEmployees } from "@/lib/workforce/api";
import { getPlatformAccounts, type AccountResponse } from "@/lib/platforms/api";
import { getVehicleAccountAssignments } from "@/lib/fleet/vehicle-account-assignments-api";
import {
  VehicleCondition,
  VehicleOperationalStatus,
  RiderVehicleAssignmentStatus,
  type VehicleSummaryResponse,
  type TakeVehicleRequest,
  type VehicleLookupResponse,
} from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { Upload, X, FileText, AlertCircle, CheckCircle2, UserCheck, Sparkles, RefreshCw, Check } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicle: VehicleSummaryResponse | null;
  preselectedEmployeeId?: string | null;
}

interface VehicleSuggestion {
  vehicleId: string;
  assetNumber: string;
  plateNumberAr?: string | null;
  platformName: string;
  platformAccountCode?: string;
  reason: string;
}

interface SelectablePerson {
  key: string;
  riderProfileId: string | null;
  employeeId: string | null;
  name: string;
  iqamaNo?: string | null;
  isEmployee: boolean;
  typeLabel: string;
}

const getCurrentLocalDateTimeString = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
};

export function TakeVehicleModal({ isOpen, onClose, onSuccess, preselectedVehicle, preselectedEmployeeId }: Props) {
  const [isPending, startTransition] = useTransition();

  const [riders, setRiders] = useState<SelectOption[]>([]);
  const [availableLookupVehicles, setAvailableLookupVehicles] = useState<VehicleLookupResponse[]>([]);
  const [suggestedVehicles, setSuggestedVehicles] = useState<VehicleSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const personMetaMapRef = useRef<Map<string, SelectablePerson>>(new Map());

  // Background employee profile ensuring state & promise
  const backgroundProfilePromiseRef = useRef<Promise<string | null> | null>(null);
  const [isEnsuringProfileInBackground, setIsEnsuringProfileInBackground] = useState<boolean>(false);
  const [profileReadyNotice, setProfileReadyNotice] = useState<string | null>(null);

  // Idempotency key reference for retries
  const retryIdempotencyKeyRef = useRef<string>("");

  const [minOdometer, setMinOdometer] = useState<number>(0);
  const [existingPromissoryCount, setExistingPromissoryCount] = useState<number>(0);
  const [loadingPromissory, setLoadingPromissory] = useState<boolean>(false);

  const [isRealRider, setIsRealRider] = useState<boolean>(true);
  const [realRider, setRealRider] = useState({
    name: "",
    iqamaNo: "",
    relationshipToAssignedRider: "",
  });

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

  const loadPromissoryFiles = useCallback((targetRiderId: string) => {
    if (!targetRiderId) {
      setExistingPromissoryCount(0);
      setLoadingPromissory(false);
      return;
    }
    let cancelled = false;
    setLoadingPromissory(true);
    getRiderPromissoryFiles(targetRiderId)
      .then((promissoryFiles) => {
        if (!cancelled) setExistingPromissoryCount(promissoryFiles?.length || 0);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load rider promissory files:", err);
          setExistingPromissoryCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPromissory(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePersonChange = useCallback((value: string) => {
    retryIdempotencyKeyRef.current = "";
    setFormData((prev) => ({ ...prev, riderProfileId: value }));
    setProfileReadyNotice(null);

    if (!value) {
      backgroundProfilePromiseRef.current = null;
      setIsEnsuringProfileInBackground(false);
      setExistingPromissoryCount(0);
      setLoadingPromissory(false);
      setSuggestedVehicles([]);
      return;
    }

    const person = personMetaMapRef.current.get(value);
    if (!person) return;

    // If person already has a riderProfileId (e.g. existing operational/external rider or already resolved)
    if (person.riderProfileId) {
      backgroundProfilePromiseRef.current = Promise.resolve(person.riderProfileId);
      setIsEnsuringProfileInBackground(false);
      loadPromissoryFiles(person.riderProfileId);
      return;
    }

    // If person is an employee without a riderProfileId, ensure it immediately in the background!
    if (person.employeeId) {
      setIsEnsuringProfileInBackground(true);
      const bgPromise = (async () => {
        try {
          // 1. GET /api/employees/{employeeId}/vehicle-profile to check existing
          let profile = await getEmployeeVehicleProfile(person.employeeId!).catch(() => null);

          // 2. If null or !exists, call PUT to create minimal profile in the background
          if (!profile?.exists || !profile?.riderProfileId) {
            profile = await ensureEmployeeVehicleProfile(person.employeeId!).catch((err) => {
              console.warn("Background vehicle-profile creation failed:", err);
              return null;
            });
          }

          if (profile?.riderProfileId) {
            person.riderProfileId = profile.riderProfileId;
            setProfileReadyNotice("تم تجهيز ملف تسليم المركبة في الخلفية بنجاح");
            loadPromissoryFiles(profile.riderProfileId);
            return profile.riderProfileId;
          }
        } catch (err) {
          console.warn("Background ensureEmployeeVehicleProfile error:", err);
        } finally {
          setIsEnsuringProfileInBackground(false);
        }
        return null;
      })();

      backgroundProfilePromiseRef.current = bgPromise;
    } else {
      backgroundProfilePromiseRef.current = null;
      setIsEnsuringProfileInBackground(false);
    }
  }, [loadPromissoryFiles]);

  const loadModalData = useCallback(async () => {
    try {
      const [ridersRes, externalRes, employeesRes, assignedVehicles, activeAssignments] = await Promise.all([
        listRiders().catch(() => []),
        listExternalRiders().catch(() => []),
        listEmployees().catch(() => []),
        getAllVehicles({ status: VehicleOperationalStatus.Assigned.toString() }).catch(() => []),
        getAllVehicleAssignments({ status: RiderVehicleAssignmentStatus.Active }).catch(() => []),
      ]);

      const assignedRiderProfileIds = new Set<string>();
      const assignedEmployeeIds = new Set<string>();
      const assignedIqamaNos = new Set<string>();

      if (Array.isArray(assignedVehicles)) {
        assignedVehicles.forEach((v) => {
          const isCurrentlyAssigned =
            v.status === VehicleOperationalStatus.Assigned ||
            Number(v.status) === 2 ||
            String(v.status).toLowerCase() === "assigned";

          if (isCurrentlyAssigned && v.currentRiderProfileId) {
            assignedRiderProfileIds.add(v.currentRiderProfileId);
          }
        });
      }

      if (Array.isArray(activeAssignments)) {
        activeAssignments.forEach((a) => {
          // Strictly exclude ONLY if assignment is currently ACTIVE and NOT ended/completed/cancelled
          const hasEnded = Boolean(a.endedAtUtc);
          const statusNum = Number(a.status);
          const statusStr = String(a.status || "").toLowerCase();

          const isCompletedOrCancelled =
            statusNum === RiderVehicleAssignmentStatus.Completed ||
            statusNum === RiderVehicleAssignmentStatus.Cancelled ||
            statusNum === RiderVehicleAssignmentStatus.Corrected ||
            statusNum === 2 ||
            statusNum === 3 ||
            statusNum === 4 ||
            statusStr === "completed" ||
            statusStr === "cancelled" ||
            statusStr === "corrected";

          const isAssignmentActive =
            !hasEnded &&
            !isCompletedOrCancelled &&
            (statusNum === RiderVehicleAssignmentStatus.Active ||
              statusNum === 1 ||
              statusStr === "active" ||
              a.status === undefined ||
              a.status === null);

          if (isAssignmentActive) {
            if (a.riderProfileId) assignedRiderProfileIds.add(a.riderProfileId);
            if (a.employeeId) assignedEmployeeIds.add(a.employeeId);
            const cleanIqama = a.riderIqamaNo?.trim();
            if (cleanIqama) assignedIqamaNos.add(cleanIqama);
          }
        });
      }

      const map = new Map<string, SelectOption>();
      const metaMap = new Map<string, SelectablePerson>();
      const seenEmployeeIds = new Set<string>();
      const seenRiderProfileIds = new Set<string>();
      const seenIqamaNos = new Set<string>();

      const isPersonAssigned = (riderId?: string | null, empId?: string | null, iqama?: string | null) => {
        if (riderId && assignedRiderProfileIds.has(riderId)) return true;
        if (empId && assignedEmployeeIds.has(empId)) return true;
        const cleanIqama = iqama?.trim();
        if (cleanIqama && assignedIqamaNos.has(cleanIqama)) return true;
        return false;
      };

      const isPersonSeen = (riderId?: string | null, empId?: string | null, iqama?: string | null) => {
        if (riderId && seenRiderProfileIds.has(riderId)) return true;
        if (empId && seenEmployeeIds.has(empId)) return true;
        const cleanIqama = iqama?.trim();
        if (cleanIqama && seenIqamaNos.has(cleanIqama)) return true;
        return false;
      };

      const markPersonSeen = (riderId?: string | null, empId?: string | null, iqama?: string | null) => {
        if (riderId) seenRiderProfileIds.add(riderId);
        if (empId) seenEmployeeIds.add(empId);
        const cleanIqama = iqama?.trim();
        if (cleanIqama) seenIqamaNos.add(cleanIqama);
      };

      // 1. Operational Riders (from /api/riders)
      (ridersRes || []).forEach((r) => {
        if (!r.id) return;
        if (isPersonAssigned(r.id, r.employeeId, r.iqamaNo)) return;
        if (isPersonSeen(r.id, r.employeeId, r.iqamaNo)) return;

        const key = `rider_${r.id}`;
        const iqamaStr = r.iqamaNo ? ` (${r.iqamaNo})` : "";
        map.set(key, {
          value: key,
          label: `${r.fullNameAr}${iqamaStr} — مندوب`,
          keywords: `${r.fullNameAr} ${r.iqamaNo || ""} مندوب`,
        });
        metaMap.set(key, {
          key,
          riderProfileId: r.id,
          employeeId: r.employeeId || null,
          name: r.fullNameAr,
          iqamaNo: r.iqamaNo,
          isEmployee: false,
          typeLabel: "مندوب",
        });

        markPersonSeen(r.id, r.employeeId, r.iqamaNo);
      });

      // 2. Employees (including administrative employees and sponsored riders from /api/employees)
      (employeesRes || []).forEach((e) => {
        if (!e.id) return;

        // Eligibility: must be Active in HR
        const statusStr = String(e.status || "").toLowerCase();
        if (statusStr !== "active") return;

        const existingRiderId = (e as any).riderProfileId || e.rider?.id;
        if (isPersonAssigned(existingRiderId, e.id, e.iqamaNo)) return;
        if (isPersonSeen(existingRiderId, e.id, e.iqamaNo)) return;

        const key = `emp_${e.id}`;
        const iqamaStr = e.iqamaNo ? ` (${e.iqamaNo})` : "";
        const isAdministrative = e.isEmployee !== false;
        const typeTag = isAdministrative ? "موظف إداري" : "موظف";

        map.set(key, {
          value: key,
          label: `${e.fullNameAr}${iqamaStr} — ${typeTag}`,
          keywords: `${e.fullNameAr} ${e.iqamaNo || ""} ${typeTag} موظف`,
        });
        metaMap.set(key, {
          key,
          riderProfileId: existingRiderId || null,
          employeeId: e.id,
          name: e.fullNameAr,
          iqamaNo: e.iqamaNo,
          isEmployee: isAdministrative,
          typeLabel: typeTag,
        });

        markPersonSeen(existingRiderId, e.id, e.iqamaNo);
      });

      // 3. External Riders (from /api/external-riders) - only add if not already present as employee or rider
      (externalRes || []).forEach((r) => {
        if (!r.riderProfileId) return;
        if (isPersonAssigned(r.riderProfileId, r.employeeId, r.iqamaNo)) return;
        if (isPersonSeen(r.riderProfileId, r.employeeId, r.iqamaNo)) return;

        const key = `external_${r.riderProfileId}`;
        const iqamaStr = r.iqamaNo ? ` (${r.iqamaNo})` : "";
        map.set(key, {
          value: key,
          label: `${r.fullNameAr}${iqamaStr} — مندوب خارجي`,
          keywords: `${r.fullNameAr} ${r.iqamaNo || ""} خارجي`,
        });
        metaMap.set(key, {
          key,
          riderProfileId: r.riderProfileId,
          employeeId: r.employeeId || null,
          name: r.fullNameAr,
          iqamaNo: r.iqamaNo,
          isEmployee: false,
          typeLabel: "مندوب خارجي",
        });

        markPersonSeen(r.riderProfileId, r.employeeId, r.iqamaNo);
      });

      personMetaMapRef.current = metaMap;
      setRiders(Array.from(map.values()));

      // If preselectedEmployeeId was provided, auto-select them!
      if (preselectedEmployeeId) {
        const found = Array.from(metaMap.values()).find((p) => p.employeeId === preselectedEmployeeId);
        if (found) {
          handlePersonChange(found.key);
        }
      }
    } catch (err) {
      console.error("Failed to load riders/employees data:", err);
    }
  }, [preselectedEmployeeId, handlePersonChange]);

  useEffect(() => {
    if (isOpen) {
      setIsRealRider(true);
      setRealRider({
        name: "",
        iqamaNo: "",
        relationshipToAssignedRider: "",
      });
      setSuggestedVehicles([]);
      setLoadingSuggestions(false);
      setProfileReadyNotice(null);
      retryIdempotencyKeyRef.current = "";

      loadModalData();

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
        setAvailableLookupVehicles([
          {
            id: preselectedVehicle.id,
            assetNumber: preselectedVehicle.assetNumber || "",
            plateNumberAr: preselectedVehicle.plateNumberAr,
            plateNumberEn: preselectedVehicle.plateNumberEn,
            manufacturer: preselectedVehicle.manufacturer,
            model: preselectedVehicle.model,
            status: preselectedVehicle.status,
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
        Promise.all([
          getVehiclesLookup("").catch(() => []),
          getAllVehicles({ status: VehicleOperationalStatus.Available.toString() }).catch(() => []),
        ]).then(([lookupRes, allAvailable]) => {
          const vMap = new Map<string, VehicleLookupResponse>();
          (lookupRes || [])
            .filter((v) => v.status === VehicleOperationalStatus.Available)
            .forEach((v) => {
              vMap.set(v.id, v);
            });
          (allAvailable || []).forEach((v) => {
            if (!vMap.has(v.id)) {
              vMap.set(v.id, {
                id: v.id,
                assetNumber: v.assetNumber || "",
                plateNumberAr: v.plateNumberAr,
                plateNumberEn: v.plateNumberEn,
                manufacturer: v.manufacturer,
                model: v.model,
                status: VehicleOperationalStatus.Available,
              });
            }
          });
          setAvailableLookupVehicles(Array.from(vMap.values()));
        });
      }
      setFiles([]);
    }
  }, [isOpen, preselectedVehicle, loadModalData]);

  const handleVehicleChange = useCallback(async (vehicleId: string) => {
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
  }, []);

  // Dynamic Suggestion: When rider is chosen, inspect platform accounts & linked active vehicles
  useEffect(() => {
    const riderIdKey = formData.riderProfileId;
    if (!riderIdKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestedVehicles([]);
      setLoadingSuggestions(false);
      return;
    }

    let isCancelled = false;
    setLoadingSuggestions(true);

    const fetchRiderPlatformVehicles = async () => {
      try {
        const meta = personMetaMapRef.current.get(riderIdKey);
        const targetRiderId = meta?.riderProfileId;
        if (!targetRiderId) {
          if (!isCancelled) {
            setSuggestedVehicles([]);
            setLoadingSuggestions(false);
          }
          return;
        }

        const accountQueries: Promise<AccountResponse[]>[] = [
          getPlatformAccounts({ actualRiderProfileId: targetRiderId, currentOnly: false }).catch(() => []),
          getPlatformAccounts({ ownerRiderProfileId: targetRiderId, currentOnly: false }).catch(() => []),
        ];

        const [accountResults, activeAssignments] = await Promise.all([
          Promise.all(accountQueries),
          getVehicleAccountAssignments({ activeOnly: true }).catch(() => []),
        ]);

        if (isCancelled) return;

        // Collect all unique accounts belonging to this rider
        const accountMap = new Map<string, AccountResponse>();
        accountResults.flat().forEach((acc) => {
          if (acc && acc.id) {
            accountMap.set(acc.id, acc);
          }
        });

        const suggestions: VehicleSuggestion[] = [];
        const seenVehicleIds = new Set<string>();

        activeAssignments.forEach((assign) => {
          if (
            assign.platformRiderAccountId &&
            accountMap.has(assign.platformRiderAccountId) &&
            assign.vehicleId &&
            !seenVehicleIds.has(assign.vehicleId)
          ) {
            // Verify if available for rider
            const isAvailable = availableLookupVehicles.some((v) => v.id === assign.vehicleId);
            if (isAvailable) {
              seenVehicleIds.add(assign.vehicleId);
              const acc = accountMap.get(assign.platformRiderAccountId);
              const platformName =
                assign.platformNameAr ||
                acc?.platformNameAr ||
                acc?.platformNameEn ||
                acc?.platformCode ||
                "المنصة";
              const accountCode = assign.platformAccountCode || acc?.code || "";

              suggestions.push({
                vehicleId: assign.vehicleId,
                assetNumber: assign.vehicleAssetNumber || "",
                plateNumberAr: assign.vehiclePlateNumberAr || "",
                platformName,
                platformAccountCode: accountCode,
                reason: `هذه مركبته في منصة ${platformName}${accountCode ? ` (حساب: ${accountCode})` : ""}`,
              });
            }
          }
        });

        setSuggestedVehicles(suggestions);

        // If exactly 1 suggestion found and no vehicle chosen yet, auto-select it
        if (suggestions.length === 1 && !formData.vehicleId && !preselectedVehicle) {
          handleVehicleChange(suggestions[0].vehicleId);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions for rider platform accounts:", err);
        if (!isCancelled) setSuggestedVehicles([]);
      } finally {
        if (!isCancelled) setLoadingSuggestions(false);
      }
    };

    fetchRiderPlatformVehicles();

    return () => {
      isCancelled = true;
    };
  }, [formData.riderProfileId, formData.vehicleId, availableLookupVehicles, preselectedVehicle, handleVehicleChange]);

  const vehicleOptions = useMemo(() => {
    if (preselectedVehicle) {
      return [
        {
          value: preselectedVehicle.id,
          label: `${preselectedVehicle.assetNumber} - ${preselectedVehicle.plateNumberAr || "بدون لوحة"}`,
        },
      ];
    }

    const suggestionMap = new Map(suggestedVehicles.map((s) => [s.vehicleId, s]));

    const options = availableLookupVehicles.map((v) => {
      const suggestion = suggestionMap.get(v.id);
      if (suggestion) {
        return {
          value: v.id,
          label: `⭐ ${v.assetNumber} - ${v.plateNumberAr || "بدون لوحة"} (مقترحة - منصة ${suggestion.platformName})`,
          sublabel: suggestion.reason,
          keywords: `${v.assetNumber} ${v.plateNumberAr || ""} ${suggestion.platformName} ${suggestion.platformAccountCode || ""} مقترحة`,
        };
      }
      return {
        value: v.id,
        label: `${v.assetNumber} - ${v.plateNumberAr || "بدون لوحة"}`,
        sublabel: v.manufacturer && v.model ? `${v.manufacturer} ${v.model}` : undefined,
        keywords: `${v.assetNumber} ${v.plateNumberAr || ""} ${v.manufacturer || ""} ${v.model || ""}`,
      };
    });

    return options.sort((a, b) => {
      const aSug = suggestionMap.has(a.value);
      const bSug = suggestionMap.has(b.value);
      if (aSug && !bSug) return -1;
      if (!aSug && bSug) return 1;
      return 0;
    });
  }, [preselectedVehicle, availableLookupVehicles, suggestedVehicles]);

  const handleAddFiles = (newFilesList: FileList | null) => {
    if (!newFilesList) return;
    const maxNewAllowed = Math.max(0, 3 - existingPromissoryCount);

    if (existingPromissoryCount >= 3) {
      toast.error("تنبيه", "المندوب يمتلك بالفعل 3 سندات أمر مسجلة (الحد الأقصى)، لا يمكن إرفاق سندات جديدة.");
      return;
    }

    const slotsLeft = maxNewAllowed - files.length;
    if (slotsLeft <= 0) {
      toast.error("تنبيه", `المجموع الكلي المسموح به هو 3 سندات فقط. (المندوب يمتلك ${existingPromissoryCount} سندات وقمت بإرفاق ${files.length}).`);
      return;
    }

    const selected = Array.from(newFilesList);
    const validFiles: File[] = [];

    for (const file of selected) {
      if (files.length + validFiles.length >= maxNewAllowed) {
        toast.error("تنبيه", `تم الوصول للحد الأقصى الإجمالي وهو 3 سندات أمر للمندوب.`);
        break;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("تنبيه", `حجم الملف ${file.name} يتجاوز 10 ميجابايت.`);
        continue;
      }
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
      if (!validTypes.includes(file.type)) {
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
      toast.error("خطأ في البيانات", "يرجى اختيار المندوب أو الموظف المستلم أولاً.");
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
    if (formData.startOdometer < minOdometer) {
      toast.error(
        "خطأ في العداد",
        `قراءة العداد (${formData.startOdometer}) لا يمكن أن تكون أقل من القراءة الحالية للمركبة (${minOdometer} كم).`
      );
      return;
    }

    if (!isRealRider) {
      if (!realRider.name.trim()) {
        toast.error("خطأ في البيانات", "يرجى إدخال اسم السائق الفعلي.");
        return;
      }
      if (realRider.name.trim().length > 200) {
        toast.error("خطأ في البيانات", "اسم السائق الفعلي يجب ألا يتجاوز 200 حرف.");
        return;
      }
      const cleanIqama = realRider.iqamaNo.trim();
      if (!/^\d{10}$/.test(cleanIqama)) {
        toast.error("خطأ في البيانات", "رقم إقامة السائق الفعلي يجب أن يتكون من 10 أرقام بالضبط.");
        return;
      }
      if (!realRider.relationshipToAssignedRider.trim()) {
        toast.error("خطأ في البيانات", "يرجى إدخال صلة القرابة/العلاقة بالسائق المستلم.");
        return;
      }
      if (realRider.relationshipToAssignedRider.trim().length > 200) {
        toast.error("خطأ في البيانات", "صلة القرابة/العلاقة يجب ألا تتجاوز 200 حرف.");
        return;
      }
    }

    const fuelVal = formData.startFuelLevelPercentage !== "" ? Number(formData.startFuelLevelPercentage) : null;
    if (fuelVal !== null && (fuelVal < 0 || fuelVal > 100)) {
      toast.error("خطأ في الوقود", "نسبة الوقود يجب أن تكون بين 0 و 100%.");
      return;
    }

    if (loadingPromissory && files.length > 0) {
      toast.error("يرجى الانتظار", "جارٍ التحقق من سجل سندات الأمر الخاصة بالمستلم...");
      return;
    }
    if (existingPromissoryCount + files.length > 3) {
      toast.error("عدد الملفات كبير", "المجموع الكلي المسموح به هو 3 سندات أمر للمستلم. احذف بعض الملفات الجديدة ثم حاول مرة أخرى.");
      return;
    }

    startTransition(async () => {
      try {
        const person = personMetaMapRef.current.get(formData.riderProfileId);
        if (!person) {
          toast.error("خطأ في البيانات", "يرجى اختيار المندوب أو الموظف المستلم.");
          return;
        }

        let resolvedRiderId = person.riderProfileId;

        // If background creation was initiated, await it!
        if (!resolvedRiderId && backgroundProfilePromiseRef.current) {
          resolvedRiderId = await backgroundProfilePromiseRef.current;
        }

        // Safety fallback if still null and it is an employee:
        if (!resolvedRiderId && person.employeeId) {
          const profileRes = await ensureEmployeeVehicleProfile(person.employeeId);
          resolvedRiderId = profileRes?.riderProfileId || null;
          if (resolvedRiderId) {
            person.riderProfileId = resolvedRiderId;
          }
        }

        if (!resolvedRiderId) {
          toast.error("خطأ في ملف المركبة", "تعذر الحصول على معرف ملف المركبة للموظف. يرجى المحاولة مجدداً.");
          return;
        }

        const metadataJSON: TakeVehicleRequest = {
          riderProfileId: resolvedRiderId,
          isRealRider: isRealRider,
          realRider: isRealRider
            ? null
            : {
                name: realRider.name.trim(),
                iqamaNo: realRider.iqamaNo.trim(),
                relationshipToAssignedRider: realRider.relationshipToAssignedRider.trim(),
              },
          vehicleId: formData.vehicleId,
          startedAtUtc: new Date(formData.startedAtUtc).toISOString(),
          startOdometer: Number(formData.startOdometer),
          startCondition: Number(formData.startCondition) as VehicleCondition,
          startFuelLevelPercentage: fuelVal,
          permissionReference: formData.permissionReference.trim(),
          reason: formData.reason.trim() || null,
          notes: formData.notes.trim() || undefined,
        };

        const payload = new FormData();
        payload.append("metadata", JSON.stringify(metadataJSON));

        files.forEach((file) => {
          payload.append("promissoryFiles", file);
        });

        // Use or generate idempotency key for retry support
        if (!retryIdempotencyKeyRef.current) {
          retryIdempotencyKeyRef.current = generateUUID();
        }

        const response = await takeVehicle(payload, retryIdempotencyKeyRef.current);
        console.log("Take Vehicle API Response:", response);
        retryIdempotencyKeyRef.current = ""; // Cleared on success
        onSuccess();
      } catch (err: any) {
        console.error("Take vehicle failed:", err);
        // Reload current data on failure
        loadModalData();
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسليم مركبة لمندوب أو موظف (عهدة جديدة)" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5 pt-3">
        {/* Rider & Vehicle Section: Rider FIRST, Vehicle SECOND */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              المندوب أو الموظف المستلم <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={riders}
              value={formData.riderProfileId}
              placeholder="اختر المندوب أو الموظف أولاً..."
              searchPlaceholder="بحث بالاسم أو رقم الإقامة..."
              onChange={handlePersonChange}
            />
            {isEnsuringProfileInBackground && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200/70 dark:border-blue-900/50 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                <span>جاري تجهيز ملف تسليم المركبة للموظف في الخلفية تلقائياً...</span>
              </div>
            )}
            {profileReadyNotice && !isEnsuringProfileInBackground && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{profileReadyNotice}</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
              المركبة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={vehicleOptions}
              value={formData.vehicleId}
              placeholder={formData.riderProfileId ? "اختر المركبة (أو اختر من المقترحات)..." : "اختر المندوب أو الموظف أولاً أو اختر مركبة..."}
              searchPlaceholder="بحث برقم المركبة أو اللوحة أو المنصة..."
              onChange={handleVehicleChange}
              disabled={!!preselectedVehicle}
            />
            {minOdometer > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                العداد الحالي للمركبة: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{minOdometer.toLocaleString()} كم</span>
              </p>
            )}
          </div>
        </div>

        {/* Loading Indicator for Suggestions */}
        {loadingSuggestions && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/70 dark:border-blue-900/50 animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span>جاري فحص حسابات المنصة للمندوب واقتراح المركبات المتاحة له...</span>
          </div>
        )}

        {/* Suggestions Box */}
        {suggestedVehicles.length > 0 && (
          <div className="rounded-xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/60 p-3.5 dark:border-emerald-800/80 dark:from-emerald-950/40 dark:to-teal-950/30 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>مركبات مقترحة للمندوب (مرتبطة بحساباته على المنصات ومتاحة حالياً)</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                {suggestedVehicles.length} {suggestedVehicles.length === 1 ? "مركبة مقترحة" : "مركبات مقترحة"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {suggestedVehicles.map((sug) => {
                const isSelected = formData.vehicleId === sug.vehicleId;
                return (
                  <div
                    key={sug.vehicleId}
                    className={`flex items-center justify-between gap-2.5 p-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-100/80 dark:bg-emerald-900/60 ring-1 ring-emerald-500/50 shadow-sm"
                        : "border-emerald-200/80 bg-white/90 dark:bg-slate-900/90 hover:border-emerald-400 hover:shadow-xs"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 font-mono">
                          {sug.assetNumber}
                        </span>
                        {sug.plateNumberAr && (
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {sug.plateNumberAr}
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                          {sug.platformName}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate mt-1" title={sug.reason}>
                        السبب: {sug.reason}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant={isSelected ? "primary" : "secondary"}
                      className={`shrink-0 text-xs h-7 px-2.5 transition-all ${
                        isSelected ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      }`}
                      onClick={() => handleVehicleChange(sug.vehicleId)}
                      disabled={!!preselectedVehicle}
                    >
                      {isSelected ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> تم الاختيار
                        </span>
                      ) : (
                        "اختيار المركبة"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Real Rider Checkbox & Section */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isRealRider}
              onChange={(e) => setIsRealRider(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-[#1167c9] focus:ring-[#1167c9] dark:border-slate-700 dark:bg-slate-800"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              المندوب أو الموظف المختار هو السائق الفعلي للمركبة
            </span>
          </label>

          {!isRealRider && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 p-2 rounded-md border border-amber-200 dark:border-amber-900/50">
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>يرجى إدخال بيانات السائق الفعلي للمركبة (يجب أن تتطابق الهوية والبيانات بدقة).</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    اسم السائق الفعلي <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={realRider.name}
                    onChange={(e) => setRealRider({ ...realRider, name: e.target.value })}
                    placeholder="الاسم الكامل"
                    maxLength={200}
                    required={!isRealRider}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    رقم إقامة السائق الفعلي <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={realRider.iqamaNo}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setRealRider({ ...realRider, iqamaNo: val });
                    }}
                    placeholder="10 أرقام"
                    maxLength={10}
                    required={!isRealRider}
                  />
                  {realRider.iqamaNo && realRider.iqamaNo.length !== 10 && (
                    <p className="mt-1 text-[11px] text-red-500">يجب أن يتكون من 10 أرقام (الحالي: {realRider.iqamaNo.length})</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    صلة القرابة / العلاقة بالسائق المندوب <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={realRider.relationshipToAssignedRider}
                    onChange={(e) => setRealRider({ ...realRider, relationshipToAssignedRider: e.target.value })}
                    placeholder="مثال: أخ، ابن عم، صديق..."
                    maxLength={200}
                    required={!isRealRider}
                  />
                </div>
              </div>
            </div>
          )}
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
              السبب <span className="text-xs text-slate-400 font-normal">(اختياري)</span>
            </label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="مثال: تسليم عهدة يومية، تبديل وردية..."
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
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1167c9]" />
              <span>سندات الأمر / Promissory Notes</span>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full">اختياري</span>
            </label>
            <div className="flex items-center gap-2">
              {loadingPromissory ? (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> جارٍ فحص السندات...
                </span>
              ) : formData.riderProfileId ? (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    existingPromissoryCount >= 3
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                      : existingPromissoryCount > 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  سندات المستلم السابقة: {existingPromissoryCount} / 3
                </span>
              ) : null}
            </div>
          </div>

          {formData.riderProfileId && !loadingPromissory && (
            <>
              {existingPromissoryCount === 0 ? (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                  <FileText className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                  <div>
                    <p className="font-bold">يمكن إتمام التسليم دون إرفاق سند أمر</p>
                    <p className="mt-0.5 font-normal leading-relaxed">
                      لا توجد سندات أمر سابقة لهذا المستلم. يمكنك إرفاق حتى 3 سندات الآن أو المتابعة دون ملفات.
                    </p>
                  </div>
                </div>
              ) : existingPromissoryCount >= 3 ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>المستلم يمتلك بالفعل 3 سندات أمر مسجلة (الحد الأقصى). يمكنك إتمام التسليم دون إضافة ملفات.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs font-medium dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    المستلم يمتلك {existingPromissoryCount} {existingPromissoryCount === 1 ? "سند أمر مسجل مسبقاً" : "سندات أمر مسجلة مسبقاً"}. إرفاق سند جديد اختياري (متبقي {3 - existingPromissoryCount} كحد أقصى).
                  </span>
                </div>
              )}
            </>
          )}

          {existingPromissoryCount < 3 && files.length < (3 - existingPromissoryCount) && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center transition-colors hover:border-[#1167c9] dark:border-slate-700 dark:bg-slate-800">
              <Upload className="h-6 w-6 mb-1 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                اضغط هنا لرفع سندات الأمر اختيارياً (PDF أو صور)
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">PDF, PNG, JPG (حتى 10MB)</span>
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp"
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
