"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Truck,
  XCircle,
  Link2,
  ExternalLink,
  ChevronRight,
  Info,
  Repeat,
  ArrowRight,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { getVehicles } from "@/lib/fleet/api";
import { getPlatformAccounts, getPlatforms } from "@/lib/platforms/api";
import { listOperatingCities, listSponsors } from "@/lib/workforce/api";
import {
  getVehicleAccountAssignments,
  getVehicleAccountAssignmentProblems,
  createVehicleAccountAssignment,
  closeVehicleAccountAssignment,
  switchVehicleAccountAssignment,
  getPendingVehicleAccountAssignmentSwitches,
  acceptVehicleAccountAssignmentSwitch,
  type VehiclePlatformAccountAssignment,
  type VehicleAccountAssignmentProblem,
  type CreateVehicleAccountAssignmentRequest,
  type PendingVehicleAccountAssignmentSwitch,
  type SwitchVehicleAccountAssignmentRequest,
} from "@/lib/fleet/vehicle-account-assignments-api";

// Problem Code Translations & Icons
const PROBLEM_TRANSLATIONS: Record<string, { ar: string; en: string; descriptionAr: string }> = {
  VehicleArchived: {
    ar: "المركبة مؤرشفة",
    en: "Vehicle Archived",
    descriptionAr: "المركبة المرتبطة تم أرشفاتها في النظام.",
  },
  PlatformAccountArchived: {
    ar: "حساب المنصة مؤرشف",
    en: "Platform Account Archived",
    descriptionAr: "حساب المنصة المرتبط تم أرشفتـه.",
  },
  VehicleOperationalStatus: {
    ar: "حالة المركبة غير متاحة",
    en: "Vehicle Status Not Available",
    descriptionAr: "المركبة ليست في حالة تشغيلية مسموح بها (متاحة أو مسندة).",
  },
  PlatformAccountStatus: {
    ar: "حالة حساب المنصة غير متاحة",
    en: "Platform Account Status Not Available",
    descriptionAr: "حساب المنصة ليس في حالة متاح أو مخصص.",
  },
  UnsupportedVehicleType: {
    ar: "نوع المركبة غير مدعوم",
    en: "Unsupported Vehicle Type",
    descriptionAr: "نوع المركبة لا يخضع لسياسات السعة المحددة (سيارات/دراجات).",
  },
  VehicleSponsorMissing: {
    ar: "المركبة بدون كفيل",
    en: "Vehicle Sponsor Missing",
    descriptionAr: "لم يتم تحديد كفيل للمركبة.",
  },
  SponsorMismatch: {
    ar: "عدم تطابق الكفيل",
    en: "Sponsor Mismatch",
    descriptionAr: "كفيل المركبة لا يطابق كفيل حساب المنصة.",
  },
  VehicleCityMissing: {
    ar: "المركبة بدون مدينة تشغيل",
    en: "Vehicle City Missing",
    descriptionAr: "لم يتم تحديد مدينة تشغيل للمركبة.",
  },
  OperatingCityMismatch: {
    ar: "عدم تطابق المدينة التشغيلية",
    en: "Operating City Mismatch",
    descriptionAr: "مدينة تشغيل المركبة تختلف عن مدينة حساب المنصة.",
  },
  DuplicateActiveAssignment: {
    ar: "تكرار الربط النشط",
    en: "Duplicate Active Assignment",
    descriptionAr: "تم ربط هذه المركبة أو الحساب أكثر من مرة في نفس الوقت.",
  },
  PlatformCityCapacityExceeded: {
    ar: "تجاوز الحد الأقصى لحسابات المنصة",
    en: "Platform City Capacity Exceeded",
    descriptionAr: "تجاوزت هذه المنصة والمدينة السعة المسموحة لنوع المركبة.",
  },
};

export default function VehicleAccountAssignmentsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Core States
  const [activeTab, setActiveTab] = useState<"assignments" | "problems" | "switches">("assignments");

  useEffect(() => {
    if (pathname.endsWith("/switches")) {
      setActiveTab("switches");
    } else if (pathname.endsWith("/problems")) {
      setActiveTab("problems");
    } else if (tabParam === "switches" || tabParam === "problems" || tabParam === "assignments") {
      setActiveTab(tabParam);
    } else {
      setActiveTab("assignments");
    }
  }, [pathname, tabParam]);
  const [assignments, setAssignments] = useState<VehiclePlatformAccountAssignment[]>([]);
  const [problems, setProblems] = useState<VehiclePlatformAccountAssignment[]>([]);
  const [pendingSwitches, setPendingSwitches] = useState<PendingVehicleAccountAssignmentSwitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Catalogs
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);

  // Filters
  const [filterVehicleId, setFilterVehicleId] = useState("");
  const [filterPlatformId, setFilterPlatformId] = useState("");
  const [filterCityId, setFilterCityId] = useState("");
  const [filterSponsorId, setFilterSponsorId] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<VehiclePlatformAccountAssignment | null>(null);
  const [selectedSwitch, setSelectedSwitch] = useState<PendingVehicleAccountAssignmentSwitch | null>(null);

  // Warning Modal (Non-blocking response popup)
  const [createdWarningAssignment, setCreatedWarningAssignment] = useState<VehiclePlatformAccountAssignment | null>(null);

  // Form Data
  const [createFormData, setCreateFormData] = useState<CreateVehicleAccountAssignmentRequest>({
    vehicleId: "",
    platformRiderAccountId: "",
    effectiveFromUtc: new Date().toISOString().slice(0, 16),
    reason: "",
  });

  const [closeFormData, setCloseFormData] = useState({
    effectiveToUtc: new Date().toISOString().slice(0, 16),
    reason: "",
  });

  const [switchFormData, setSwitchFormData] = useState({
    targetVehicleId: "",
    mode: "Immediate" as "Immediate" | "Pending",
    effectiveAtUtc: new Date().toISOString().slice(0, 16),
    reason: "",
  });

  const [acceptFormData, setAcceptFormData] = useState({
    effectiveAtUtc: new Date().toISOString().slice(0, 16),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignRes, probRes, vehRes, accRes, platRes, cityRes, sponRes, switchRes] = await Promise.allSettled([
        getVehicleAccountAssignments({
          vehicleId: filterVehicleId || undefined,
          platformId: filterPlatformId || undefined,
          operatingCityId: filterCityId || undefined,
          sponsorId: filterSponsorId || undefined,
          activeOnly,
        }),
        getVehicleAccountAssignmentProblems(),
        getVehicles({ pageSize: 1000 }),
        getPlatformAccounts({ currentOnly: false }),
        getPlatforms(true),
        listOperatingCities(),
        listSponsors(),
        getPendingVehicleAccountAssignmentSwitches(true),
      ]);

      if (assignRes.status === "fulfilled") setAssignments(assignRes.value);
      if (probRes.status === "fulfilled") setProblems(probRes.value);
      if (vehRes.status === "fulfilled") setVehicles(vehRes.value?.items || []);
      if (accRes.status === "fulfilled") {
        setPlatformAccounts(Array.isArray(accRes.value) ? accRes.value : (accRes.value as any)?.items || []);
      }
      if (platRes.status === "fulfilled") setPlatforms(platRes.value);
      if (cityRes.status === "fulfilled") setCities(cityRes.value);
      if (sponRes.status === "fulfilled") setSponsors(sponRes.value);
      if (switchRes.status === "fulfilled") setPendingSwitches(switchRes.value);
    } catch (err) {
      console.error("Failed to load vehicle account assignment data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can("fleet.assignments.read") || can("fleet.vehicles.read")) {
      loadData();
    }
  }, [filterVehicleId, filterPlatformId, filterCityId, filterSponsorId, activeOnly]);

  // Options Mapping
  const vehicleOptions = useMemo(() => {
    return vehicles.map((v) => ({
      value: v.id,
      label: `${v.plateLettersAr || ""} ${v.plateDigits || ""} (${v.assetNumber || v.serialNumber || ""})`,
      sublabel: `${v.make || ""} ${v.model || ""} - ${v.year || ""}`,
    }));
  }, [vehicles]);

  const accountOptions = useMemo(() => {
    return platformAccounts.map((acc) => ({
      value: acc.id,
      label: `${acc.code} - ${acc.platformNameAr || acc.platformCode}`,
      sublabel: `المالك: ${acc.ownerRiderNameAr || "—"} | المدينة: ${acc.operatingCityNameAr || "—"}`,
    }));
  }, [platformAccounts]);

  const platformOptions = useMemo(() => {
    return platforms.map((p) => ({
      value: p.id,
      label: `${p.nameAr} (${p.code})`,
    }));
  }, [platforms]);

  const cityOptions = useMemo(() => {
    return cities.map((c) => ({
      value: c.id,
      label: c.globalCityAr || c.code,
    }));
  }, [cities]);

  const sponsorOptions = useMemo(() => {
    return sponsors.map((s) => ({
      value: s.id,
      label: locale === "en" ? (s.registryNameEn || s.registryNameAr) : s.registryNameAr,
    }));
  }, [sponsors]);

  // Search Filter
  const filteredAssignments = useMemo(() => {
    const list = activeTab === "problems" ? problems : assignments;
    const term = search.toLowerCase().trim();
    if (!term) return list;
    return list.filter((item) => {
      return (
        item.vehicleAssetNumber?.toLowerCase().includes(term) ||
        item.platformAccountCode?.toLowerCase().includes(term) ||
        item.externalAccountId?.toLowerCase().includes(term) ||
        item.platformCode?.toLowerCase().includes(term) ||
        item.platformNameAr?.toLowerCase().includes(term) ||
        item.accountOwnerRiderNameAr?.toLowerCase().includes(term) ||
        item.vehicleSponsorNameAr?.toLowerCase().includes(term) ||
        item.accountSponsorNameAr?.toLowerCase().includes(term)
      );
    });
  }, [assignments, problems, activeTab, search]);

  // Handlers
  const handleOpenCreate = () => {
    setCreateFormData({
      vehicleId: vehicles[0]?.id || "",
      platformRiderAccountId: platformAccounts[0]?.id || "",
      effectiveFromUtc: new Date().toISOString().slice(0, 16),
      reason: "",
    });
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.vehicleId || !createFormData.platformRiderAccountId || !createFormData.effectiveFromUtc) {
      toast.error("خطأ في البيانات", "يرجى اختيار المركبة، حساب المنصة، وتاريخ بداية الربط.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: CreateVehicleAccountAssignmentRequest = {
          ...createFormData,
          effectiveFromUtc: new Date(createFormData.effectiveFromUtc).toISOString(),
        };

        const res = await createVehicleAccountAssignment(payload);
        setIsCreateOpen(false);
        toast.success("تم الربط بنجاح", "تم إنشاء رابط المركبة بحساب المنصة بنجاح.");

        // Check for non-blocking warnings in API response!
        if (res?.hasProblems || (res?.problems && res.problems.length > 0)) {
          setCreatedWarningAssignment(res);
        }

        loadData();
      } catch (err: any) {
        console.error("Create vehicle account assignment error:", err);
        toast.error("فشل الربط", err?.message || "تعذر إسناد المركبة لحساب المنصة.");
      }
    });
  };

  const handleOpenClose = (item: VehiclePlatformAccountAssignment) => {
    setSelectedAssignment(item);
    setCloseFormData({
      effectiveToUtc: new Date().toISOString().slice(0, 16),
      reason: "",
    });
    setIsCloseOpen(true);
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (!closeFormData.effectiveToUtc) {
      toast.error("خطأ في البيانات", "يرجى تحديد تاريخ نهاية الربط.");
      return;
    }

    startTransition(async () => {
      try {
        await closeVehicleAccountAssignment(selectedAssignment.id, {
          effectiveToUtc: new Date(closeFormData.effectiveToUtc).toISOString(),
          reason: closeFormData.reason || undefined,
          rowVersion: selectedAssignment.rowVersion,
        });
        setIsCloseOpen(false);
        toast.success("تم إنهاء الربط", "تم إغلاق ربط المركبة بحساب المنصة بنجاح.");
        loadData();
      } catch (err: any) {
        console.error("Close assignment error:", err);
        toast.error("فشل الإنهاء", err?.message || "تعذر إنهاء الربط. يرجى المحاولة مجدداً.");
      }
    });
  };

  const handleOpenSwitch = (item: VehiclePlatformAccountAssignment) => {
    setSelectedAssignment(item);
    setSwitchFormData({
      targetVehicleId: "",
      mode: "Immediate",
      effectiveAtUtc: new Date().toISOString().slice(0, 16),
      reason: "",
    });
    setIsSwitchOpen(true);
  };

  const handleSwitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !switchFormData.targetVehicleId) {
      toast.error("خطأ في البيانات", "يرجى اختيار المركبة الجديدة المستهدفة.");
      return;
    }

    const trimmedReason = switchFormData.reason.trim();
    if (!trimmedReason) {
      toast.error("خطأ في البيانات", "سبب التبديل مطلوب ويجب ألا يكون فارغاً.");
      return;
    }

    if (trimmedReason.length > 1000) {
      toast.error("خطأ في البيانات", "سبب التبديل يجب ألا يتجاوز 1000 حرف.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: SwitchVehicleAccountAssignmentRequest = {
          targetVehicleId: switchFormData.targetVehicleId,
          mode: switchFormData.mode,
          effectiveAtUtc: switchFormData.mode === "Pending"
            ? null
            : (switchFormData.effectiveAtUtc ? new Date(switchFormData.effectiveAtUtc).toISOString() : null),
          reason: trimmedReason,
          rowVersion: selectedAssignment.rowVersion,
        };

        const res = await switchVehicleAccountAssignment(selectedAssignment.id, payload);
        setIsSwitchOpen(false);
        toast.success(
          switchFormData.mode === "Immediate" ? "تم التبديل المباشر" : "تم إنشاء طلب التبديل المعلق",
          switchFormData.mode === "Immediate"
            ? "تم إنهاء الربط السابق وإنشاء ربط جديد للمركبة المستهدفة."
            : "تم تسجيل طلب التبديل المعلق بنجاح في انتظار التسليم."
        );
        loadData();
      } catch (err: any) {
        console.error("Switch assignment error:", err);
        toast.error("فشل التبديل", err?.message || "تعذر تنفيذ عملية التبديل.");
      }
    });
  };

  const handleOpenAccept = (sw: PendingVehicleAccountAssignmentSwitch) => {
    setSelectedSwitch(sw);
    setAcceptFormData({
      effectiveAtUtc: new Date().toISOString().slice(0, 16),
    });
    setIsAcceptOpen(true);
  };

  const handleAcceptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSwitch) return;

    startTransition(async () => {
      try {
        await acceptVehicleAccountAssignmentSwitch(selectedSwitch.id, {
          effectiveAtUtc: acceptFormData.effectiveAtUtc ? new Date(acceptFormData.effectiveAtUtc).toISOString() : new Date().toISOString(),
          rowVersion: selectedSwitch.rowVersion,
        });
        setIsAcceptOpen(false);
        toast.success("تم قبول وتأكيد التبديل", "تم إنهاء الربط القديم وتفعيل الربط الجديد للمركبة المستهدفة.");
        loadData();
      } catch (err: any) {
        console.error("Accept switch error:", err);
        toast.error("فشل تأكيد التبديل", err?.message || "تعذر قبول طلب التبديل.");
      }
    });
  };

  const resolveValueName = (val: string | number | null | undefined) => {
    if (val === null || val === undefined || val === "") return "—";
    const str = String(val);
    const foundSponsor = sponsors.find((s) => s.id === str);
    if (foundSponsor) {
      return locale === "en" ? (foundSponsor.registryNameEn || foundSponsor.registryNameAr) : foundSponsor.registryNameAr;
    }
    const foundCity = cities.find((c) => c.id === str);
    if (foundCity) {
      return locale === "en" ? (foundCity.globalCityEn || foundCity.globalCityAr || foundCity.code) : (foundCity.globalCityAr || foundCity.code);
    }
    const foundVehicle = vehicles.find((v) => v.id === str);
    if (foundVehicle) {
      return foundVehicle.assetNumber || foundVehicle.id;
    }

    const lower = str.toLowerCase();
    if (lower.includes("one active link per vehicle and account")) {
      return locale === "en" ? "One active link per vehicle & account" : "رابط نشط واحد لكل مركبة وحساب";
    }
    if (lower.includes("active links")) {
      const match = str.match(/\d+/);
      const count = match ? match[0] : "";
      return locale === "en" ? `${count} active links` : `${count} روابط نشطة`;
    }
    if (lower.includes("available or assigned")) {
      return locale === "en" ? "Available or Assigned" : "متاح أو مخصص";
    }

    const STATUS_MAP: Record<string, { ar: string; en: string }> = {
      available: { ar: "متاح", en: "Available" },
      assigned: { ar: "مخصص", en: "Assigned" },
      suspended: { ar: "موقوف", en: "Suspended" },
      active: { ar: "نشط", en: "Active" },
      draft: { ar: "مسودة", en: "Draft" },
      archived: { ar: "مؤرشف", en: "Archived" },
      disabled: { ar: "معطل", en: "Disabled" },
      maintenance: { ar: "صيانة", en: "Maintenance" },
      inservice: { ar: "في الخدمة", en: "In Service" },
      outofservice: { ar: "خارج الخدمة", en: "Out of Service" },
      incustody: { ar: "في العهدة", en: "In Custody" },
    };

    if (STATUS_MAP[lower]) {
      return locale === "en" ? STATUS_MAP[lower].en : STATUS_MAP[lower].ar;
    }

    return str;
  };

  const translateMessage = (msg: string | null | undefined, code: string) => {
    if (!msg) return PROBLEM_TRANSLATIONS[code]?.descriptionAr || "";
    const lower = msg.toLowerCase();
    if (lower.includes("belong to different sponsors")) {
      return locale === "en"
        ? "The vehicle and platform account belong to different sponsors."
        : "تختلف كفالة المركبة عن كفالة حساب المنصة المرتبط.";
    }
    if (lower.includes("already actively linked")) {
      return locale === "en"
        ? "This vehicle or platform account is already actively linked."
        : "هذه المركبة أو حساب المنصة مرتبط بالفعل بشكل نشط.";
    }
    if (lower.includes("different operating cities")) {
      return locale === "en"
        ? "Vehicle and platform account operate in different cities."
        : "المدينة التشغيلية للمركبة تختلف عن مدينة حساب المنصة.";
    }
    if (lower.includes("not available for operational use") || lower.includes("account is not available")) {
      return locale === "en"
        ? "The platform account is not available for operational use."
        : "حساب المنصة غير متاح للاستخدام التشغيلي.";
    }
    if (lower.includes("vehicle is not available") || lower.includes("vehicle operational status")) {
      return locale === "en"
        ? "The vehicle is not in an available operational status."
        : "المركبة ليست في حالة تشغيلية متاحة.";
    }
    if (lower.includes("unsupported vehicle type")) {
      return locale === "en"
        ? "The vehicle type is not supported for platform capacity rules."
        : "نوع المركبة غير مدعوم في قواعد السعة لهذه المنصة.";
    }
    if (lower.includes("vehicle sponsor missing")) {
      return locale === "en"
        ? "Vehicle sponsor is missing."
        : "لم يتم تحديد كفيل للمركبة.";
    }
    if (lower.includes("vehicle city missing")) {
      return locale === "en"
        ? "Vehicle operating city is missing."
        : "لم يتم تحديد مدينة تشغيل للمركبة.";
    }
    if (lower.includes("capacity exceeded")) {
      return locale === "en"
    }
    return msg;
  };

  const resolveOwnerRiderName = (item?: {
    accountOwnerRiderNameAr?: string | null;
    platformRiderAccountId?: string;
  } | null) => {
    if (!item) return "—";
    const directName = item.accountOwnerRiderNameAr || (item as any).ownerRiderNameAr || (item as any).riderNameAr;
    if (directName) return directName;

    if (item.platformRiderAccountId) {
      const accList = Array.isArray(platformAccounts) ? platformAccounts : [];
      const acc = accList.find((a: any) => a.id === item.platformRiderAccountId);
      if (acc) {
        return acc.ownerRiderNameAr || acc.ownerRiderNameEn || acc.currentAssignment?.actualRiderNameAr || "—";
      }
    }
    return "—";
  };

  const formatAssignmentStartDate = (item?: any) => {
    if (!item) return "—";
    let dateStr = item.effectiveFromUtc || item.effectiveFrom || item.startDate || item.createdAtUtc || item.createdDate;

    if (!dateStr && item.platformRiderAccountId) {
      const accList = Array.isArray(platformAccounts) ? platformAccounts : [];
      const acc = accList.find((a: any) => a.id === item.platformRiderAccountId);
      if (acc) {
        dateStr = acc.currentAssignment?.effectiveFrom || acc.startDate || acc.acquisitionDate;
      }
    }

    if (!dateStr) return "—";
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return dateStr;
      return parsed.toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const resolveVehiclePlateAr = (item?: any, role?: "source" | "target") => {
    if (!item) return "";
    if (role === "source" && item.sourceVehiclePlateNumberAr) return item.sourceVehiclePlateNumberAr;
    if (role === "target" && item.targetVehiclePlateNumberAr) return item.targetVehiclePlateNumberAr;
    if (item.vehiclePlateNumberAr) return item.vehiclePlateNumberAr;

    const vId = role === "source" ? item.sourceVehicleId : role === "target" ? item.targetVehicleId : item.vehicleId;
    if (!vId) return "";
    const v = vehicles.find((veh) => veh.id === vId);
    if (!v) return "";
    if (v.plateLettersAr && v.plateDigits) {
      return `${v.plateLettersAr} ${v.plateDigits}`;
    }
    return (v as any).plateNumberAr || "";
  };

  const resolveVehicleRegistration = (item?: any, role?: "source" | "target") => {
    if (!item) return "—";
    const directReg =
      role === "source"
        ? item.sourceVehicleRegistrationNumber
        : role === "target"
          ? item.targetVehicleRegistrationNumber
          : item.vehicleRegistrationNumber;

    if (directReg) return directReg;

    const fallbackAsset =
      role === "source"
        ? item.sourceVehicleAssetNumber
        : role === "target"
          ? item.targetVehicleAssetNumber
          : item.vehicleAssetNumber;

    const vId = role === "source" ? item.sourceVehicleId : role === "target" ? item.targetVehicleId : item.vehicleId;
    if (!vId) return fallbackAsset || "—";

    const v = vehicles.find((veh) => veh.id === vId);
    return (v as any)?.registrationNumber || v?.serialNumber || fallbackAsset || vId;
  };

  const resolveVehicleSerialNumber = (item?: any, role?: "source" | "target") => {
    if (!item) return "";
    const directSerial =
      role === "source"
        ? item.sourceVehicleSerialNumber
        : role === "target"
          ? item.targetVehicleSerialNumber
          : item.vehicleSerialNumber;

    if (directSerial) return directSerial;

    const vId = role === "source" ? item.sourceVehicleId : role === "target" ? item.targetVehicleId : item.vehicleId;
    if (!vId) return "";

    const v = vehicles.find((veh) => veh.id === vId);
    return v?.serialNumber || "";
  };

  const resolveVehicleLink = (item?: any, role?: "source" | "target") => {
    if (!item) return null;
    const vId = role === "source" ? item.sourceVehicleId : role === "target" ? item.targetVehicleId : item.vehicleId;
    if (vId) return `/dashboard/fleet/vehicles/${vId}`;
    return null;
  };

  const resolvePlatformAccountLink = (item?: any) => {
    if (!item) return null;
    const accId = item.platformRiderAccountId;
    if (accId) return `/dashboard/platforms/accounts/${accId}`;
    if (item.platformAccountCode) return `/dashboard/platforms/accounts?search=${encodeURIComponent(item.platformAccountCode)}`;
    return null;
  };

  const resolveOwnerRiderLink = (item?: any) => {
    if (!item) return null;
    const empId = item.accountOwnerEmployeeId || item.ownerRiderId;
    if (empId) return `/dashboard/employees/${empId}`;
    if (item.platformRiderAccountId) {
      const acc = platformAccounts.find((a) => a.id === item.platformRiderAccountId);
      if (acc?.ownerRiderId || acc?.employeeId || acc?.riderId) {
        return `/dashboard/employees/${acc.ownerRiderId || acc.employeeId || acc.riderId}`;
      }
    }
    return null;
  };

  const renderProblemBadge = (problem: VehicleAccountAssignmentProblem) => {
    const translation = PROBLEM_TRANSLATIONS[problem.code] || {
      ar: problem.code,
      en: problem.code,
      descriptionAr: problem.message || problem.code,
    };

    const titleText = locale === "en" ? translation.en : translation.ar;
    const descText = translateMessage(problem.message, problem.code);

    const expectedDisplay = resolveValueName(problem.expected);
    const actualDisplay = resolveValueName(problem.actual);

    const severityText =
      !problem.severity || problem.severity.toLowerCase() === "warning"
        ? locale === "en"
          ? "Warning"
          : "تحذير"
        : problem.severity;

    return (
      <div
        key={problem.code}
        className="rounded-2xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 text-xs text-amber-950 dark:text-amber-100 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 dark:border-amber-900/60 pb-2">
          <span className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            {titleText}
          </span>
          <span className="rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 text-[11px] font-extrabold shadow-xs">
            {severityText}
          </span>
        </div>

        <p className="text-xs font-semibold leading-relaxed text-amber-900/90 dark:text-amber-200/90">
          {descText}
        </p>

        {(problem.expected || problem.actual || problem.maximumAccounts !== undefined || problem.activeAccountCount !== undefined) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40 text-xs font-semibold">
            {problem.expected && (
              <div className="flex items-start gap-1.5 bg-amber-100/70 dark:bg-amber-900/30 p-2 rounded-xl border border-amber-200/50">
                <span className="text-amber-800 dark:text-amber-400 font-bold shrink-0">{locale === "en" ? "Expected:" : "المتوقع:"}</span>
                <span className="font-sans font-bold text-amber-950 dark:text-white leading-tight break-words">
                  {expectedDisplay}
                </span>
              </div>
            )}
            {problem.actual && (
              <div className="flex items-start gap-1.5 bg-amber-100/70 dark:bg-amber-900/30 p-2 rounded-xl border border-amber-200/50">
                <span className="text-amber-800 dark:text-amber-400 font-bold shrink-0">{locale === "en" ? "Actual:" : "الفعلي:"}</span>
                <span className="font-sans font-bold text-amber-950 dark:text-white leading-tight break-words">
                  {actualDisplay}
                </span>
              </div>
            )}
            {problem.maximumAccounts !== undefined && problem.maximumAccounts !== null && (
              <div className="flex items-center gap-1.5 bg-amber-100/70 dark:bg-amber-900/30 p-2 rounded-xl border border-amber-200/50">
                <span className="text-amber-800 dark:text-amber-400 font-bold shrink-0">{locale === "en" ? "Max Allowed:" : "الحد الأقصى:"}</span>
                <span className="font-mono font-extrabold text-amber-950 dark:text-white">{problem.maximumAccounts}</span>
              </div>
            )}
            {problem.activeAccountCount !== undefined && problem.activeAccountCount !== null && (
              <div className="flex items-center gap-1.5 bg-amber-100/70 dark:bg-amber-900/30 p-2 rounded-xl border border-amber-200/50">
                <span className="text-amber-800 dark:text-amber-400 font-bold shrink-0">{locale === "en" ? "Active Count:" : "العدد النشط:"}</span>
                <span className="font-mono font-extrabold text-amber-950 dark:text-white">{problem.activeAccountCount}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <span>إدارة الأسطول والتشغيل</span>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-[#1167c9] dark:text-blue-400">المركبات فى التشغبل</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
            <Link2 className="h-7 w-7 text-[#1167c9] dark:text-blue-400" />
            {activeTab === "switches"
              ? "طلبات التبديل المعلقة"
              : activeTab === "problems"
                ? "التحذيرات التشغيلية"
                : "جميع الربطات النشطة"}
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            إسناد المركبات لحسابات المنصات ومتابعة التنبيهات والتحذيرات التشغيلية دون التعطيل غير الضروري.
          </p>
        </div>

        {can("fleet.assignments.manage") && (
          <Button onClick={handleOpenCreate} className="gap-2 shadow-lg shadow-blue-500/20">
            <Plus className="h-4 w-4" />
            ربط مركبة بحساب منصة
          </Button>
        )}
      </div>

      {/* Warning Summary Banner if Problems Exist */}
      {problems.length > 0 && (
        <Card className="border-amber-300 bg-amber-500/10 dark:border-amber-800 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                يوجد {problems.length} إسناد نشط يحتوى على تحذيرات تشغيلية
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                تأكد من عدم وجود تعارض بين كفيل أو مدينة المركبة وحساب المنصة لضمان الامتثال التام.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/fleet/vehicle-account-assignments/problems"
            className="shrink-0 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
          >
            عرض التحذيرات
          </Link>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">المركبة</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع المركبات" }, ...vehicleOptions]}
              value={filterVehicleId}
              onChange={setFilterVehicleId}
              placeholder="اختر المركبة..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">حساب المنصة</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع الحسابات" }, ...accountOptions]}
              value={filterPlatformId}
              onChange={setFilterPlatformId}
              placeholder="اختر الحساب..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">المنصة</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع المنصات" }, ...platformOptions]}
              value={filterPlatformId}
              onChange={setFilterPlatformId}
              placeholder="اختر المنصة..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">مدينة التشغيل</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع المدن" }, ...cityOptions]}
              value={filterCityId}
              onChange={setFilterCityId}
              placeholder="اختر المدينة..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">الكفيل</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع الكفلاء" }, ...sponsorOptions]}
              value={filterSponsorId}
              onChange={setFilterSponsorId}
              placeholder="اختر الكفيل..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم أصل المركبة، رمز الحساب، المنصة..."
              className="pr-10"
            />
          </div>

          <Button variant="secondary" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث البيانات
          </Button>
        </div>
      </div>

      {/* Content Table / Cards */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="h-8 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
            <div className="h-12 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
            <div className="h-12 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
          </div>
        ) : activeTab === "switches" ? (
          /* Pending Switches View */
          pendingSwitches.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)]">
              <Repeat className="mx-auto mb-3 h-10 w-10 opacity-40 text-indigo-500" />
              <p className="font-semibold">لا توجد طلبات تبديل معلقة حالياً</p>
              <p className="text-xs text-[var(--muted)] mt-1">يمكنك استخدام زر "تبديل المركبة" على أي إسناد نشط لإنشاء طلب تبديل معلق.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-indigo-500/10 text-xs font-bold uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-6 py-4">المركبة الحالية (المسترجعة)</th>
                    <th className="px-6 py-4">المركبة المستهدفة (الجديدة)</th>
                    <th className="px-6 py-4">حساب المنصة والمالك</th>
                    <th className="px-6 py-4">السبب وتاريخ الطلب</th>
                    <th className="px-6 py-4">الحالة والوضع</th>
                    <th className="px-6 py-4 text-center">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pendingSwitches.map((sw) => (
                    <tr key={sw.id} className="transition-colors hover:bg-indigo-500/5">
                      {/* Old vehicle */}
                      <td className="px-6 py-4">
                        {resolveVehicleLink(sw, "source") ? (
                          <Link
                            href={resolveVehicleLink(sw, "source")!}
                            className="font-bold font-mono text-[var(--foreground)] hover:text-[#1167c9] hover:underline flex items-center gap-1.5"
                            title="عرض صفحة تفاصيل المركبة"
                          >
                            <Truck className="h-4 w-4 text-slate-500 shrink-0" />
                            <span>{resolveVehicleRegistration(sw, "source")}</span>
                            <ExternalLink className="h-3 w-3 opacity-60 text-[var(--muted)]" />
                          </Link>
                        ) : (
                          <div className="font-bold font-mono text-[var(--foreground)] flex items-center gap-1.5">
                            <Truck className="h-4 w-4 text-slate-500 shrink-0" />
                            {resolveVehicleRegistration(sw, "source")}
                          </div>
                        )}
                        {resolveVehiclePlateAr(sw, "source") && (
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono mt-0.5">
                            اللوحة: {resolveVehiclePlateAr(sw, "source")}
                          </div>
                        )}
                      </td>

                      {/* New vehicle */}
                      <td className="px-6 py-4">
                        <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-indigo-600 shrink-0" />
                          {resolveVehicleRegistration(sw, "target")}
                        </div>
                        {resolveVehiclePlateAr(sw, "target") && (
                          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 font-mono mt-0.5">
                            اللوحة: {resolveVehiclePlateAr(sw, "target")}
                          </div>
                        )}
                      </td>

                      {/* Platform account */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1167c9] dark:text-blue-400 font-mono">
                          {sw.platformAccountCode || "—"}
                          {sw.platformNameAr && (
                            <span className="font-sans text-xs font-normal text-[var(--foreground)] ml-1">
                              ({sw.platformNameAr})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          المالك: {resolveOwnerRiderName(sw)}
                        </div>
                      </td>

                      {/* Reason & Date */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-[var(--foreground)]">
                          {sw.reason || "بدون سبب محدد"}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] font-mono mt-0.5">
                          {sw.requestedAtUtc ? new Date(sw.requestedAtUtc).toLocaleString("ar-SA") : "—"}
                        </div>
                      </td>

                      {/* Mode & Status */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-200">
                            {sw.status === "Pending" ? "معلق (Pending)" : sw.status}
                          </Badge>
                          <div className="text-[11px] text-[var(--muted)] font-mono">
                            النمط: {sw.mode || "Pending"}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        {can("fleet.assignments.manage") && (
                          <Button
                            onClick={() => handleOpenAccept(sw)}
                            className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            قبول وتأكيد التبديل
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredAssignments.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            <Link2 className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-semibold">لا توجد عمليات ربط مطابقة لخيارات البحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">المركبة والمعلومات</th>
                  <th className="px-6 py-4">حساب المنصة والمالك</th>
                  <th className="px-6 py-4">الكفلاء والمدن</th>
                  <th className="px-6 py-4">فترة الربط والحالة</th>
                  <th className="px-6 py-4">التنبيهات التشغيلية</th>
                  <th className="px-6 py-4 text-center">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredAssignments.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-blue-500/5">
                    {/* Vehicle info */}
                    <td className="px-6 py-4">
                      {resolveVehicleLink(item) ? (
                        <Link
                          href={resolveVehicleLink(item)!}
                          className="font-bold font-mono text-[#1167c9] hover:underline flex items-center gap-1.5"
                          title="عرض صفحة تفاصيل المركبة"
                        >
                          <Truck className="h-4 w-4 text-[#1167c9] shrink-0" />
                          <span>{resolveVehicleRegistration(item)}</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      ) : (
                        <div className="font-bold font-mono text-[var(--foreground)] flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-[#1167c9] shrink-0" />
                          {resolveVehicleRegistration(item)}
                        </div>
                      )}
                      <div className="text-xs text-[var(--muted)] mt-0.5 space-y-0.5">
                        {resolveVehiclePlateAr(item) && (
                          <div className="font-semibold text-slate-700 dark:text-slate-200 font-mono">
                            اللوحة: {resolveVehiclePlateAr(item)}
                          </div>
                        )}
                        <div>النوع: {item.vehicleType || "غير محدد"}</div>
                      </div>
                    </td>

                    {/* Platform account info */}
                    <td className="px-6 py-4">
                      {resolvePlatformAccountLink(item) ? (
                        <Link
                          href={resolvePlatformAccountLink(item)!}
                          className="font-bold text-[#1167c9] dark:text-blue-400 font-mono hover:underline flex items-center gap-1"
                          title="عرض تفاصيل حساب المنصة"
                        >
                          <span>{item.platformAccountCode}</span>
                          {item.platformNameAr && (
                            <span className="font-sans text-xs font-normal text-[var(--foreground)]">
                              ({item.platformNameAr})
                            </span>
                          )}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                      ) : (
                        <div className="font-bold text-[#1167c9] dark:text-blue-400 font-mono flex items-center gap-1">
                          {item.platformAccountCode}
                          {item.platformNameAr && (
                            <span className="font-sans text-xs font-normal text-[var(--foreground)]">
                              ({item.platformNameAr})
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5">
                        <span>المالك:</span>
                        {resolveOwnerRiderLink(item) ? (
                          <Link
                            href={resolveOwnerRiderLink(item)!}
                            className="font-semibold text-slate-800 dark:text-slate-200 hover:text-[#1167c9] hover:underline flex items-center gap-1"
                            title="عرض صفحة تفاصيل المندوب / الموظف"
                          >
                            <span>{resolveOwnerRiderName(item)}</span>
                            <ExternalLink className="h-3 w-3 text-[#1167c9] shrink-0" />
                          </Link>
                        ) : (
                          <span>{resolveOwnerRiderName(item)}</span>
                        )}
                      </div>
                    </td>

                    {/* Sponsors & Cities */}
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1 text-[var(--foreground)]">
                          <span className="text-[var(--muted)]">كفيل المركبة:</span>
                          <strong className="font-semibold">{item.vehicleSponsorNameAr || "—"}</strong>
                        </div>
                        <div className="flex items-center gap-1 text-[var(--foreground)]">
                          <span className="text-[var(--muted)]">كفيل الحساب:</span>
                          <strong className="font-semibold">{item.accountSponsorNameAr || "—"}</strong>
                        </div>
                      </div>
                    </td>

                    {/* Status & Dates */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <Badge
                          className={
                            item.status === "Active"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }
                        >
                          {item.status === "Active" ? "نشط (Active)" : item.status}
                        </Badge>
                        <div className="text-[11px] text-[var(--muted)] font-mono">
                          من: {formatAssignmentStartDate(item)}
                        </div>
                      </div>
                    </td>

                    {/* Problems / Warnings */}
                    <td className="px-6 py-4">
                      {item.hasProblems && item.problems && item.problems.length > 0 ? (
                        <div className="space-y-1.5 max-w-xs">
                          {item.problems.map((p) => renderProblemBadge(p))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-4 w-4" />
                          متوافق بدون تحذيرات
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      {can("fleet.assignments.manage") && item.status === "Active" && (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenSwitch(item)}
                            className="text-xs py-1 px-2.5 gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200"
                          >
                            <Repeat className="h-3.5 w-3.5" />
                            تبديل المركبة
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleOpenClose(item)}
                            className="text-xs py-1 px-2.5"
                          >
                            إغلاق الربط
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Assignment */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="ربط مركبة بحساب منصة"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              اختر المركبة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={vehicleOptions}
              value={createFormData.vehicleId}
              onChange={(val) => setCreateFormData({ ...createFormData, vehicleId: val })}
              placeholder="اختر المركبة..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              اختر حساب المنصة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={accountOptions}
              value={createFormData.platformRiderAccountId}
              onChange={(val) => setCreateFormData({ ...createFormData, platformRiderAccountId: val })}
              placeholder="اختر حساب المنصة..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                تاريخ بداية الربط <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={createFormData.effectiveFromUtc}
                onChange={(e) => setCreateFormData({ ...createFormData, effectiveFromUtc: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">السبب (اختياري)</label>
              <Input
                value={createFormData.reason || ""}
                onChange={(e) => setCreateFormData({ ...createFormData, reason: e.target.value })}
                placeholder="سبب الإسناد..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isPending}>
              حفظ وتأكيد الربط
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close Assignment */}
      <Modal
        isOpen={isCloseOpen}
        onClose={() => setIsCloseOpen(false)}
        title="إنهاء ربط المركبة بحساب المنصة"
      >
        <form onSubmit={handleCloseSubmit} className="space-y-4 pt-2">
          <p className="text-xs text-[var(--muted)]">
            سيتم إغلاق الربط للمركبة <strong className="text-[var(--foreground)]">{selectedAssignment?.vehicleAssetNumber}</strong> مع الحساب <strong className="text-[var(--foreground)]">{selectedAssignment?.platformAccountCode}</strong>.
          </p>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              تاريخ نهاية الربط <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              value={closeFormData.effectiveToUtc}
              onChange={(e) => setCloseFormData({ ...closeFormData, effectiveToUtc: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">سبب الإنهاء</label>
            <Input
              value={closeFormData.reason}
              onChange={(e) => setCloseFormData({ ...closeFormData, reason: e.target.value })}
              placeholder="أدخل سبب إغلاق الربط..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" type="button" onClick={() => setIsCloseOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" type="submit" loading={isPending}>
              تأكيد إنهاء الربط
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Switch Assignment */}
      <Modal
        isOpen={isSwitchOpen}
        onClose={() => setIsSwitchOpen(false)}
        title="تبديل مركبة ربط حساب المنصة"
      >
        <form onSubmit={handleSwitchSubmit} className="space-y-4 pt-2">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-4 border border-indigo-200 dark:border-indigo-900 space-y-1">
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              بيانات الربط الحالي المراد تبديله:
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-indigo-800 dark:text-indigo-300 pt-1">
              <div>المركبة الحالية: <strong className="font-sans">{resolveVehicleRegistration(selectedAssignment)}</strong> {resolveVehiclePlateAr(selectedAssignment) ? `(${resolveVehiclePlateAr(selectedAssignment)})` : ""}</div>
              <div>حساب المنصة: <strong className="font-sans">{selectedAssignment?.platformAccountCode}</strong></div>
              <div>المالك: <strong className="font-sans">{resolveOwnerRiderName(selectedAssignment)}</strong></div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
              نمط التبديل <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSwitchFormData({ ...switchFormData, mode: "Immediate" })}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 ${switchFormData.mode === "Immediate"
                    ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
              >
                <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <CheckCircle2 className={`h-4 w-4 ${switchFormData.mode === "Immediate" ? "text-indigo-600" : "text-slate-400"}`} />
                  تبديل مباشر الآن (Immediate)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  يُستخدم عند انتقال الحساب للمركبة الجديدة بالفعل. ينتهي الربط القديم فوراً.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSwitchFormData({ ...switchFormData, mode: "Pending" })}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 ${switchFormData.mode === "Pending"
                    ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
              >
                <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Clock className={`h-4 w-4 ${switchFormData.mode === "Pending" ? "text-indigo-600" : "text-slate-400"}`} />
                  طلب تبديل معلق (Pending)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  يُستخدم عندما يتم تسليم المركبة لاحقاً. يبقى الربط الحالي نشطاً حتى قبول الطلب.
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              اختر المركبة الجديدة (المستهدفة) <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={vehicleOptions.filter((v) => v.value !== selectedAssignment?.vehicleId)}
              value={switchFormData.targetVehicleId}
              onChange={(val) => setSwitchFormData({ ...switchFormData, targetVehicleId: val })}
              placeholder="اختر المركبة المستهدفة..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                تاريخ وتوقيت النقل {switchFormData.mode === "Immediate" ? <span className="text-red-500">*</span> : "(غير مستخدم في المعلق)"}
              </label>
              {switchFormData.mode === "Immediate" ? (
                <Input
                  type="datetime-local"
                  value={switchFormData.effectiveAtUtc}
                  onChange={(e) => setSwitchFormData({ ...switchFormData, effectiveAtUtc: e.target.value })}
                  required
                />
              ) : (
                <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  سيتم تحديد توقيت النقل عند تأكيد قبول التبديل لاحقاً (null)
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                سبب التبديل <span className="text-red-500">*</span>
              </label>
              <Input
                value={switchFormData.reason}
                onChange={(e) => setSwitchFormData({ ...switchFormData, reason: e.target.value })}
                placeholder="أدخل سبب التبديل (مثل: استبدال مركبة)..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" type="button" onClick={() => setIsSwitchOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              تنفيذ التبديل
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Accept Switch */}
      <Modal
        isOpen={isAcceptOpen}
        onClose={() => setIsAcceptOpen(false)}
        title="تأكيد وقبول طلب التبديل المعلق"
      >
        <form onSubmit={handleAcceptSubmit} className="space-y-4 pt-2">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 border border-emerald-200 dark:border-emerald-900 space-y-2">
            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              تفاصيل تسليم المركبة والتبديل:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-mono">
              <div>
                المركبة القديمة: <strong className="font-sans">{resolveVehicleRegistration(selectedSwitch, "source")}</strong>
                {resolveVehiclePlateAr(selectedSwitch, "source") ? ` (${resolveVehiclePlateAr(selectedSwitch, "source")})` : ""}
              </div>
              <div>
                المركبة الجديدة: <strong className="font-sans text-indigo-600 dark:text-indigo-400">{resolveVehicleRegistration(selectedSwitch, "target")}</strong>
                {resolveVehiclePlateAr(selectedSwitch, "target") ? ` (${resolveVehiclePlateAr(selectedSwitch, "target")})` : ""}
              </div>
              <div>حساب المنصة: <strong className="font-sans">{selectedSwitch?.platformAccountCode}</strong></div>
              <div>السبب: <strong className="font-sans">{selectedSwitch?.reason || "—"}</strong></div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              تاريخ وتوقيت التسليم الفعلي <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              value={acceptFormData.effectiveAtUtc}
              onChange={(e) => setAcceptFormData({ ...acceptFormData, effectiveAtUtc: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" type="button" onClick={() => setIsAcceptOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              قبول وتأكيد نقل الحساب
            </Button>
          </div>
        </form>
      </Modal>

      {/* Non-blocking Warning Modal after Creation */}
      {createdWarningAssignment && (
        <Modal
          isOpen={Boolean(createdWarningAssignment)}
          onClose={() => setCreatedWarningAssignment(null)}
          title="تم الربط بنجاح مع وجود تنبيهات تشغيلية"
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-xl bg-amber-50 p-4 text-amber-900 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                تنبيه تشغيلي (غير معطل للإسناد)
              </div>
              <p className="text-xs">
                تم تنفيذ الإسناد بنجاح في النظام، ولكن أظهرت الفحوصات التشغيلية التنبيهات التالية:
              </p>
            </div>

            <div className="space-y-2">
              {createdWarningAssignment.problems?.map((p) => renderProblemBadge(p))}
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border)]">
              <Button onClick={() => setCreatedWarningAssignment(null)}>
                حسناً، فهمت ذلك
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
