"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, useMemo, useCallback } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  History,
  Info,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  UserCheck,
  UserX,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  getVehicleDailyDistances,
  getVehicleDailyDistance,
  getVehicleDailyDistanceReport,
  saveManualOdometer,
  importGpsFile,
  getGpsImportLogs,
  getAppliedSourceInfo,
  getDailyDistanceErrorMessage,
  getGpsRowErrorMessage,
  type VehicleDailyDistanceItem,
  type VehicleDailyDistancesResponse,
  type VehicleDailyReportDay,
  type SaveManualOdometerRequest,
  type GpsImportResponse,
  type GpsImportLogItem,
} from "@/lib/fleet/daily-distances-api";
import {
  TableHeaderColumnFilter,
  TableHeaderDualFilter,
  type FilterOption,
} from "@/app/admin/fleet/vehicles/components/TableHeaderFilter";
import { getVehicles, getAllVehicles, getAllVehicleAssignments } from "@/lib/fleet/api";
import { formatVehicleType } from "@/lib/fleet/formatters";
import {
  VehicleType,
  VehicleOperationalStatus,
  RiderVehicleAssignmentStatus,
  type VehicleSummaryResponse,
  type RiderVehicleAssignmentResponse,
} from "@/lib/fleet/types";

function getRiyadhDateStr(daysOffset = 0): string {
  const now = new Date();
  const riyadhOffsetMs = 3 * 60 * 60 * 1000;
  const targetDate = new Date(now.getTime() + riyadhOffsetMs + daysOffset * 24 * 60 * 60 * 1000);
  return targetDate.toISOString().slice(0, 10);
}

function getDateOffsetStr(baseDateStr: string, daysOffset: number): string {
  const d = new Date(baseDateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return baseDateStr;
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

export default function VehicleDailyDistancesPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  // Filter States
  const [workDate, setWorkDate] = useState<string>(getRiyadhDateStr(-1));
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<"gps" | "manual" | "missing" | "">("");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");

  // Table Header Column Filters (Multi)
  const [headerCityFilter, setHeaderCityFilter] = useState<string[]>([]);
  const [headerVehicleTypeFilter, setHeaderVehicleTypeFilter] = useState<string[]>([]);
  const [headerPlateFilter, setHeaderPlateFilter] = useState<string[]>([]);
  const [headerSourceFilter, setHeaderSourceFilter] = useState<string[]>([]);
  const [headerGpsStatusFilter, setHeaderGpsStatusFilter] = useState<string[]>([]);
  const [headerManualStatusFilter, setHeaderManualStatusFilter] = useState<string[]>([]);

  const GPS_DAILY_DISTANCES_FILTERS_SESSION_KEY = "admin_fleet_daily_distances_filters_session";
  const [isRestored, setIsRestored] = useState(false);

  // Restore filters on mount for the current session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(GPS_DAILY_DISTANCES_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const toArray = (val: any): string[] => {
          if (Array.isArray(val)) return val.map(String).filter(Boolean);
          if (typeof val === "string" && val.trim() && val !== "ALL") return [val.trim()];
          return [];
        };

        if (parsed.headerCityFilter) setHeaderCityFilter(toArray(parsed.headerCityFilter));
        if (parsed.headerVehicleTypeFilter) setHeaderVehicleTypeFilter(toArray(parsed.headerVehicleTypeFilter));
        if (parsed.headerPlateFilter) setHeaderPlateFilter(toArray(parsed.headerPlateFilter));
        if (parsed.headerSourceFilter) setHeaderSourceFilter(toArray(parsed.headerSourceFilter));
        if (parsed.headerGpsStatusFilter) setHeaderGpsStatusFilter(toArray(parsed.headerGpsStatusFilter));
        if (parsed.headerManualStatusFilter) setHeaderManualStatusFilter(toArray(parsed.headerManualStatusFilter));
        if (typeof parsed.sourceFilter === "string") setSourceFilter(parsed.sourceFilter as any);
        if (parsed.assignmentFilter && ["all", "assigned", "unassigned"].includes(parsed.assignmentFilter)) {
          setAssignmentFilter(parsed.assignmentFilter as any);
        }
        if (typeof parsed.searchQuery === "string") setSearchQuery(parsed.searchQuery);
      }
    } catch {
      // ignore JSON parse or sessionStorage errors
    } finally {
      setIsRestored(true);
    }
  }, []);

  // Save filters to sessionStorage whenever filters change (only after initial restoration)
  useEffect(() => {
    if (!isRestored) return;
    try {
      if (
        headerCityFilter.length > 0 ||
        headerVehicleTypeFilter.length > 0 ||
        headerPlateFilter.length > 0 ||
        headerSourceFilter.length > 0 ||
        headerGpsStatusFilter.length > 0 ||
        headerManualStatusFilter.length > 0 ||
        sourceFilter ||
        assignmentFilter !== "all" ||
        searchQuery
      ) {
        sessionStorage.setItem(
          GPS_DAILY_DISTANCES_FILTERS_SESSION_KEY,
          JSON.stringify({
            headerCityFilter,
            headerVehicleTypeFilter,
            headerPlateFilter,
            headerSourceFilter,
            headerGpsStatusFilter,
            headerManualStatusFilter,
            sourceFilter,
            assignmentFilter,
            searchQuery,
          })
        );
      } else {
        sessionStorage.removeItem(GPS_DAILY_DISTANCES_FILTERS_SESSION_KEY);
      }
    } catch {
      // ignore sessionStorage errors
    }
  }, [
    isRestored,
    headerCityFilter,
    headerVehicleTypeFilter,
    headerPlateFilter,
    headerSourceFilter,
    headerGpsStatusFilter,
    headerManualStatusFilter,
    sourceFilter,
    assignmentFilter,
    searchQuery,
  ]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Data States
  const [data, setData] = useState<VehicleDailyDistancesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Manual Reading Modal State
  const [selectedItemForManual, setSelectedItemForManual] = useState<VehicleDailyDistanceItem | null>(null);
  const [manualOdometer, setManualOdometer] = useState<string>("");
  const [manualBaseline, setManualBaseline] = useState<string>("");
  const [manualNotes, setManualNotes] = useState<string>("");
  const [requireBaselineInput, setRequireBaselineInput] = useState<boolean>(false);
  const [concurrencyConflictNotice, setConcurrencyConflictNotice] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<VehicleDailyReportDay[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [applicableBaseline, setApplicableBaseline] = useState<{ date: string; value: number } | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);

  // GPS Import Modal State
  const [isGpsImportOpen, setIsGpsImportOpen] = useState<boolean>(false);
  const [gpsFile, setGpsFile] = useState<File | null>(null);
  const [expectedDate, setExpectedDate] = useState<string>(workDate);
  const [importResult, setImportResult] = useState<GpsImportResponse | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // GPS Import Logs Modal State
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<GpsImportLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);


  // Mapping of vehicleId -> metadata (city, type, assignment status, rider name)
  const [vehicleCities, setVehicleCities] = useState<Record<string, string>>({});
  const [vehicleTypes, setVehicleTypes] = useState<Record<string, number | VehicleType>>({});
  const [vehicleAssignedMap, setVehicleAssignedMap] = useState<Record<string, boolean>>({});
  const [vehicleRiderMap, setVehicleRiderMap] = useState<Record<string, string>>({});

  // Load all vehicle metadata and active assignments to enrich daily distances table
  useEffect(() => {
    let isMounted = true;
    async function loadVehicleMetadata() {
      try {
        const [vehiclesRes, assignmentsRes] = await Promise.all([
          getAllVehicles().catch((err) => {
            console.warn("Failed to load vehicles via getAllVehicles:", err);
            return [] as VehicleSummaryResponse[];
          }),
          getAllVehicleAssignments().catch((err) => {
            console.warn("Failed to load vehicle assignments via getAllVehicleAssignments:", err);
            return [] as RiderVehicleAssignmentResponse[];
          }),
        ]);

        if (isMounted) {
          const cityMap: Record<string, string> = {};
          const typeMap: Record<string, number | VehicleType> = {};
          const assignedMap: Record<string, boolean> = {};
          const riderMap: Record<string, string> = {};

          (vehiclesRes || []).forEach((v) => {
            const city = v.operatingCity || (v as any).operatingCityNameAr || (v as any).city;
            if (v.id && city) {
              cityMap[v.id] = city;
            }
            if (v.id && v.vehicleType != null) {
              typeMap[v.id] = v.vehicleType;
            }
            const isAssigned = Boolean(
              v.currentAssignmentId ||
              v.currentRiderProfileId ||
              v.currentRiderName ||
              v.status === VehicleOperationalStatus.Assigned ||
              (v as any).status === 2 ||
              (v as any).status === "Assigned" ||
              (v as any).isAssigned
            );
            if (v.id) {
              assignedMap[v.id] = isAssigned;
              if (v.currentRiderName) {
                riderMap[v.id] = v.currentRiderName;
              }
            }
          });

          (assignmentsRes || []).forEach((a) => {
            const isActive =
              a.status === RiderVehicleAssignmentStatus.Active ||
              a.status === 1 ||
              (a as any).status === "Active" ||
              !a.endedAtUtc;
            if (a.vehicleId && isActive) {
              assignedMap[a.vehicleId] = true;
              if (a.riderName) {
                riderMap[a.vehicleId] = a.riderName;
              }
            }
          });

          setVehicleCities(cityMap);
          setVehicleTypes(typeMap);
          setVehicleAssignedMap(assignedMap);
          setVehicleRiderMap(riderMap);
        }
      } catch (err) {
        console.warn("Failed to load vehicle metadata:", err);
      }
    }
    loadVehicleMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  const isItemAssigned = useCallback(
    (item: VehicleDailyDistanceItem): boolean => {
      if ((item as any).isAssigned !== undefined) return Boolean((item as any).isAssigned);
      if ((item as any).is_assigned !== undefined) return Boolean((item as any).is_assigned);
      if ((item as any).currentAssignmentId) return true;
      if ((item as any).assignmentId) return true;
      if ((item as any).currentRiderName || (item as any).riderName) return true;
      return Boolean(vehicleAssignedMap[item.vehicleId]);
    },
    [vehicleAssignedMap]
  );

  const getItemRiderName = useCallback(
    (item: VehicleDailyDistanceItem): string | null => {
      return (
        (item as any).currentRiderName ||
        (item as any).riderName ||
        vehicleRiderMap[item.vehicleId] ||
        null
      );
    },
    [vehicleRiderMap]
  );

  const getItemCity = useCallback(
    (item: VehicleDailyDistanceItem): string => {
      return (
        item.operatingCity ||
        item.operatingCityNameAr ||
        item.city ||
        vehicleCities[item.vehicleId] ||
        ""
      );
    },
    [vehicleCities]
  );

  const getItemVehicleType = useCallback(
    (item: VehicleDailyDistanceItem): VehicleType | number | null => {
      const raw =
        item.vehicleType ??
        (item as any).VehicleType ??
        vehicleTypes[item.vehicleId];
      if (raw == null || raw === "") return null;
      return typeof raw === "string" && !isNaN(Number(raw)) ? Number(raw) : (raw as any);
    },
    [vehicleTypes]
  );

  const fetchDailyDistances = async (query = debouncedSearchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getVehicleDailyDistances({
        workDate,
        search: query,
        source: sourceFilter,
        page: 1,
        pageSize: 300,
      });
      setData(result);
    } catch (err: any) {
      console.error("Error fetching daily distances", err);
      setError(err?.message || "تعذر تحميل البيانات المسافات اليومية للمركبات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyDistances(debouncedSearchQuery);
  }, [workDate, sourceFilter, debouncedSearchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDailyDistances(searchQuery);
  };

  // Load vehicle's daily distance history and sync freshest record
  const loadVehicleHistoryAndSyncRecord = async (item: VehicleDailyDistanceItem) => {
    setHistoryLoading(true);
    setVehicleHistory([]);
    setApplicableBaseline(null);

    const targetDate = item.workDate;
    const fromDate = getDateOffsetStr(targetDate, -30);
    const toDate = getDateOffsetStr(targetDate, 7);

    try {
      const [reportRes, freshItemRes] = await Promise.allSettled([
        getVehicleDailyDistanceReport(item.vehicleId, { fromDate, toDate }),
        getVehicleDailyDistance(item.vehicleId, item.workDate, item.assetNumber),
      ]);

      let freshItem: VehicleDailyDistanceItem | null = null;
      if (freshItemRes.status === "fulfilled" && freshItemRes.value) {
        const itemVal = freshItemRes.value;
        freshItem = itemVal;
        setSelectedItemForManual((prev) => {
          if (!prev || prev.vehicleId !== item.vehicleId) return prev;
          return {
            ...prev,
            ...itemVal,
            rowVersion: itemVal.rowVersion ?? prev.rowVersion,
          };
        });
      }

      if (reportRes.status === "fulfilled" && reportRes.value?.days) {
        const days = reportRes.value.days;
        setVehicleHistory(days);

        // Find applicable baseline: latest recorded day before targetDate
        const priorDays = days
          .filter(
            (d) =>
              d.workDate < targetDate &&
              (d.hasRecord || d.effectiveOdometerAfterKm != null || d.manualOdometerReading != null)
          )
          .sort((a, b) => a.workDate.localeCompare(b.workDate));

        const latestPrior = priorDays.length > 0 ? priorDays[priorDays.length - 1] : null;

        if (latestPrior) {
          const baseVal = latestPrior.effectiveOdometerAfterKm ?? latestPrior.manualOdometerReading;
          if (baseVal != null) {
            setApplicableBaseline({
              date: latestPrior.workDate,
              value: baseVal,
            });
          }
        } else {
          // If no prior daily distance record exists, fallback to baseline in item if any
          const baselineFromItem =
            freshItem?.manualBaselineOdometerReading ?? item.manualBaselineOdometerReading;
          if (baselineFromItem != null) {
            setApplicableBaseline({
              date: "الأساس الأولي المسجل",
              value: baselineFromItem,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Could not load vehicle daily distance history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Earliest recorded day after target workDate (to show subsequent constraint)
  const nextRecordedDay = useMemo(() => {
    if (!selectedItemForManual || !vehicleHistory.length) return null;
    const targetDate = selectedItemForManual.workDate;
    const subsequentDays = vehicleHistory
      .filter(
        (d) =>
          d.workDate > targetDate &&
          (d.hasRecord || d.effectiveOdometerAfterKm != null || d.manualOdometerReading != null)
      )
      .sort((a, b) => a.workDate.localeCompare(b.workDate));

    if (subsequentDays.length === 0) return null;
    const firstSubsequent = subsequentDays[0];
    const reading = firstSubsequent.manualOdometerReading ?? firstSubsequent.effectiveOdometerAfterKm;
    if (reading == null) return null;
    return {
      date: firstSubsequent.workDate,
      value: reading,
    };
  }, [selectedItemForManual, vehicleHistory]);

  // Open Manual Modal
  const handleOpenManualModal = (item: VehicleDailyDistanceItem) => {
    setSelectedItemForManual(item);
    setConcurrencyConflictNotice(null);
    setApiErrorMessage(null);

    const isCorrection = item.manualOdometerReading != null;
    setManualOdometer(
      item.manualOdometerReading != null ? item.manualOdometerReading.toString() : ""
    );

    if (isCorrection) {
      setRequireBaselineInput(false);
      setManualBaseline(
        item.manualBaselineOdometerReading != null ? item.manualBaselineOdometerReading.toString() : ""
      );
    } else {
      const currentRefOdometer = item.currentOdometer;
      let initialBaseline = "";
      if (item.manualBaselineOdometerReading != null) {
        initialBaseline = item.manualBaselineOdometerReading.toString();
      } else if (currentRefOdometer != null && currentRefOdometer > 0) {
        if (item.gpsDistanceKm != null && item.gpsDistanceKm > 0) {
          const calcBaseline = currentRefOdometer - item.gpsDistanceKm;
          const normalized = calcBaseline > 0 ? calcBaseline : 0;
          initialBaseline = Number.isInteger(normalized) ? normalized.toString() : normalized.toFixed(2);
        } else {
          initialBaseline = currentRefOdometer.toString();
        }
      }
      setManualBaseline(initialBaseline);
      setRequireBaselineInput(item.manualBaselineOdometerReading == null);
    }

    setManualNotes(item.manualNotes || "");

    // Load vehicle history and sync freshest record & baseline
    loadVehicleHistoryAndSyncRecord(item);
  };

  // Submit Manual Odometer
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForManual) return;
    setApiErrorMessage(null);

    const odoVal = parseFloat(manualOdometer);
    if (isNaN(odoVal) || odoVal < 0) {
      toast.error(
        locale === "en" ? "Invalid Data" : "بيانات غير صالحة",
        locale === "en"
          ? "Please enter a valid total odometer reading."
          : "رجاء إدخال قراءة العداد الإجمالية بشكل صحيح."
      );
      return;
    }

    const isCorrection = selectedItemForManual.manualOdometerReading != null;
    const isLowerThanBaseline = applicableBaseline != null && odoVal < applicableBaseline.value;

    let baselineVal: number | null = null;
    if (isCorrection || isLowerThanBaseline) {
      // Per requirements: when correcting an existing odometer reading or entering a reading below previous baseline,
      // send null baselineOdometerReading.
      // Do not use the existing reading or vehicle's current odometer as the minimum allowed value.
      // The backend validates against the applicable baseline and recalculates later daily mileage.
      baselineVal = null;
    } else if (applicableBaseline != null) {
      // If the vehicle has an earlier daily-distance record, the backend ignores client baseline
      // and calculates it from existing history.
      baselineVal = null;
    } else {
      baselineVal = manualBaseline.trim() ? parseFloat(manualBaseline) : null;
      if (requireBaselineInput && (baselineVal === null || isNaN(baselineVal) || baselineVal < 0)) {
        toast.error(
          locale === "en" ? "Baseline Reading Required" : "قراءة الأساس مطلوبة",
          locale === "en"
            ? "Please enter previous odometer reading (baseline) to calculate distance."
            : "يجب إدخال قراءة العداد السابقة (الأساس) لتحديد بداية الاحتساب."
        );
        return;
      }
      if (baselineVal !== null && odoVal < baselineVal) {
        toast.error(
          locale === "en" ? "Reading Error" : "خطأ في القراءة",
          locale === "en"
            ? "Current odometer reading cannot be less than baseline reading."
            : "قراءة العداد الحالية لا يمكن أن تكون أقل من قراءة الأساس."
        );
        return;
      }
    }

    // Determine if a row already exists for target workDate
    const targetDayInHistory = vehicleHistory.find(
      (d) => d.workDate === selectedItemForManual.workDate
    );
    const hasExistingRow = Boolean(
      (selectedItemForManual.rowVersion && selectedItemForManual.rowVersion.trim()) ||
      (selectedItemForManual.id && selectedItemForManual.id.trim()) ||
      selectedItemForManual.manualOdometerReading != null ||
      selectedItemForManual.gpsDistanceKm != null ||
      (targetDayInHistory && targetDayInHistory.hasRecord)
    );

    // Requirement: Send existing record's rowVersion if row exists, null only when no existing row.
    const rowVersionToSend =
      hasExistingRow && selectedItemForManual.rowVersion && selectedItemForManual.rowVersion.trim()
        ? selectedItemForManual.rowVersion.trim()
        : null;

    const notesToSend = manualNotes.trim()
      ? manualNotes.trim()
      : isLowerThanBaseline
      ? "Corrected vehicle odometer"
      : null;

    startTransition(async () => {
      try {
        const payload: SaveManualOdometerRequest = {
          odometerReading: odoVal,
          baselineOdometerReading: baselineVal,
          notes: notesToSend,
          rowVersion: rowVersionToSend,
        };

        const updatedItem = await saveManualOdometer(
          selectedItemForManual.vehicleId,
          selectedItemForManual.workDate,
          payload
        );

        const isOdoCorrection = Boolean(updatedItem?.isOdometerCorrection || isLowerThanBaseline);

        toast.success(
          isOdoCorrection
            ? (locale === "en" ? "Odometer Corrected Successfully" : "تم تصحيح عداد المركبة بنجاح")
            : isCorrection
            ? (locale === "en" ? "Correction Saved" : "تم حفظ التصحيح بنجاح")
            : (locale === "en" ? "Saved Successfully" : "تم الحفظ بنجاح"),
          isOdoCorrection
            ? (locale === "en"
                ? "Vehicle odometer has been updated. Manual distance is 0 km, and subsequent daily records were recalculated."
                : "تم تصحيح عداد المركبة وتحديث العداد التشغيلي. المسافة اليدوية لليوم 0 كم وتمت إعادة احتساب الأيام اللاحقة.")
            : isCorrection
            ? (locale === "en"
                ? "Manual odometer reading was corrected and daily records and vehicle mileage were refreshed."
                : "تم تصحيح قراءة العداد اليدوية واحتساب المسافة وتحديث المسافة الإجمالية للمركبة.")
            : (locale === "en"
                ? "Manual odometer reading recorded successfully."
                : "تم تسجيل قراءة العداد اليدوية واحتساب المسافة المعتمدة.")
        );

        // Immediately update row with PUT response
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((it) => (it.vehicleId === updatedItem.vehicleId ? updatedItem : it)),
          };
        });

        setSelectedItemForManual(null);
        setConcurrencyConflictNotice(null);
        setApiErrorMessage(null);

        // Refresh daily record, subsequent days, KPIs, and vehicle mileage
        fetchDailyDistances();
      } catch (err: any) {
        console.error("Save manual odometer error:", err);
        const errorCode = err?.details?.errorCode || err?.code || err?.errorCode;

        // Requirement 3: Extract exact API detail message when it rejects the reading
        const detailMsg =
          (typeof err?.details?.detail === "string" && err.details.detail.trim()) ||
          (typeof err?.details?.message === "string" && err.details.message.trim()) ||
          (err?.details?.errors && typeof err.details.errors === "object"
            ? Object.entries(err.details.errors)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                .join(" | ")
            : null) ||
          (typeof err?.message === "string" && err.message.trim()) ||
          (locale === "en"
            ? "The correction may be below the applicable baseline or make a later reading invalid."
            : "قد تكون القراءة المصححة أقل من قراءة الأساس المعتمدة أو تجعل قراءة لاحقة غير صالحة.");

        setApiErrorMessage(detailMsg);

        if (errorCode === "fleet.daily_distance.invalid_manual_odometer") {
          toast.error(
            locale === "en" ? "Invalid Odometer Reading" : "قراءة عداد غير صالحة",
            detailMsg
          );
        } else if (err?.status === 409 || errorCode === "fleet.concurrency_conflict") {
          toast.error(
            locale === "en" ? "Concurrency Conflict" : "تعارض في التحديث",
            locale === "en"
              ? "The record was modified by another user. Reloading record for your review..."
              : "تم تعديل السجل بواسطة مستخدم آخر. تم إعادة تحميل السجل لمراجعته قبل المحاولة مجدداً."
          );

          try {
            const freshItem = await getVehicleDailyDistance(
              selectedItemForManual.vehicleId,
              selectedItemForManual.workDate,
              selectedItemForManual.assetNumber
            );
            if (freshItem) {
              setSelectedItemForManual(freshItem);
              setManualOdometer(
                freshItem.manualOdometerReading != null
                  ? freshItem.manualOdometerReading.toString()
                  : ""
              );
              setManualNotes(freshItem.manualNotes || "");
              if (freshItem.manualOdometerReading == null) {
                setRequireBaselineInput(freshItem.manualBaselineOdometerReading == null);
              } else {
                setRequireBaselineInput(false);
              }
              setConcurrencyConflictNotice(
                locale === "en"
                  ? "The record has been updated with the latest data from the server. Please review before retrying."
                  : "تم تحديث بيانات السجل بأحدث القيم من الخادم بالتزامن. يرجى مراجعة البيانات وتعديل القراءة إن لزم الأمر قبل إعادة المحاولة."
              );
            }
            loadVehicleHistoryAndSyncRecord(selectedItemForManual);
          } catch (reloadErr) {
            console.warn("Could not reload record directly:", reloadErr);
          }

          fetchDailyDistances();
        } else if (
          errorCode === "fleet.daily_distance.manual_baseline_required" ||
          (err?.status === 400 && err?.message?.includes("baseline"))
        ) {
          setRequireBaselineInput(true);
          toast.error(
            locale === "en" ? "Baseline Required" : "مطلوب قراءة الأساس",
            detailMsg
          );
        } else {
          const errInfo = getDailyDistanceErrorMessage(errorCode, detailMsg);
          toast.error(errInfo.title, errInfo.description);
        }
      }
    });
  };

  // Open GPS Import Modal
  const handleOpenGpsImport = () => {
    setGpsFile(null);
    setExpectedDate(workDate);
    setImportResult(null);
    setIsGpsImportOpen(true);
  };

  // Submit GPS Import File
  const handleGpsImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gpsFile) {
      toast.error("ملف مفقود", "يرجى اختيار ملف تقرير GPS بصيغة .xls أو .xlsx أو .htm أو .zip");
      return;
    }

    setIsUploading(true);
    setImportResult(null);

    try {
      const res = await importGpsFile(gpsFile, expectedDate);
      setImportResult(res);
      toast.success(
        "تم معالجة التقرير",
        `تم مطابقة ${res.matchedRows} مركبة بنجاح (${res.unmatchedRows} غير مطابقة، ${res.invalidRows} غير صالحة).`
      );
      if (expectedDate && expectedDate !== workDate) {
        setWorkDate(expectedDate);
      }
      fetchDailyDistances();
    } catch (err: any) {
      console.error("GPS import error:", err);
      const errInfo = getDailyDistanceErrorMessage(err?.errorCode, err?.message);
      toast.error(errInfo.title, errInfo.description);
    } finally {
      setIsUploading(false);
    }
  };

  // Download GPS import problems / unaccepted rows as Excel (.xlsx)
  const handleDownloadErrorsExcel = async () => {
    if (!importResult) return;

    try {
      const XLSX = await import("xlsx");

      const errorRows =
        importResult.errors && importResult.errors.length > 0
          ? importResult.errors.map((err, idx) => {
              if (locale === "en") {
                return {
                  "#": idx + 1,
                  "Row Number": err.rowNumber != null ? err.rowNumber : "—",
                  "Plate Number": err.plateNumber || "—",
                  "Error Code": err.errorCode || "UNACCEPTED",
                  "Rejection Reason / Description": getGpsRowErrorMessage(err.errorCode) || err.message || err.errorCode,
                  "Work Date": expectedDate || workDate,
                  "Imported File": gpsFile?.name || "GPS Report",
                };
              }

              return {
                "م": idx + 1,
                "رقم الصف في الملف": err.rowNumber != null ? err.rowNumber : "—",
                "رقم اللوحة": err.plateNumber || "—",
                "رمز المشكلة": err.errorCode || "غير مقبول",
                "سبب عدم القبول / وصف المشكلة": getGpsRowErrorMessage(err.errorCode) || err.message || err.errorCode,
                "تاريخ العمل": expectedDate || workDate,
                "اسم الملف المستورد": gpsFile?.name || "تقرير GPS",
              };
            })
          : [
              {
                "م": 1,
                "رقم الصف في الملف": "—",
                "رقم اللوحة": "—",
                "رمز المشكلة": "UNMATCHED_RECORDS",
                "سبب عدم القبول / وصف المشكلة": `يوجد ${importResult.unmatchedRows} صف غير مطابق و ${importResult.invalidRows} صف غير صالح في الملف.`,
                "تاريخ العمل": expectedDate || workDate,
                "اسم الملف المستورد": gpsFile?.name || "تقرير GPS",
              },
            ];

      const worksheet = XLSX.utils.json_to_sheet(errorRows);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 6 },  // #
        { wch: 18 }, // Row number
        { wch: 20 }, // Plate
        { wch: 25 }, // Error Code
        { wch: 45 }, // Reason
        { wch: 16 }, // Work Date
        { wch: 28 }, // File name
      ];

      // Format Plate Number column as text
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:G1");
      const plateColIndex = 2; // Column C
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: plateColIndex });
        const cell = worksheet[cellAddress];
        if (cell) {
          cell.t = "s";
          cell.z = "@";
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        locale === "en" ? "GPS Import Problems" : "مشاكل استيراد GPS"
      );

      const fileName = `gps-import-problems-${expectedDate || workDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(
        "تم تصدير ملف المشاكل",
        "تم تنزيل تقرير المشاكل والصفوف غير المقبولة بنجاح بصيغة Excel"
      );
    } catch (exportErr) {
      console.error("Error exporting GPS problems Excel:", exportErr);
      toast.error("فشل التصدير", "حدث خطأ أثناء إنشاء ملف Excel");
    }
  };

  // Export current table records as Excel
  const handleExportTableExcel = async () => {
    if (!data || !filteredItems.length) {
      toast.error("لا توجد بيانات", "لا توجد سجلات مسافات لتصديرها لهذا اليوم وفق الفلاتر المحددة.");
      return;
    }

    try {
      const XLSX = await import("xlsx");

      const rows = filteredItems.map((item, idx) => {
        const sourceInfo = getAppliedSourceInfo(item.appliedSource);
        const cityName = getItemCity(item) || "—";
        const vehicleTypeName = (() => {
          const vt = getItemVehicleType(item);
          return vt != null ? formatVehicleType(vt, locale) : "—";
        })();

        const isAssigned = isItemAssigned(item);
        const riderName = getItemRiderName(item);

        if (locale === "en") {
          return {
            "#": idx + 1,
            "Vehicle (Plate Ar)": item.plateNumberAr || "—",
            "Plate (En)": item.plateNumberEn || "—",
            "City": cityName,
            "Vehicle Type": (() => {
              const vt = getItemVehicleType(item);
              return vt != null ? formatVehicleType(vt, "en") : "—";
            })(),
            "Assignment Status": isAssigned ? "Assigned" : "Unassigned",
            "Assigned Rider": riderName || "—",
            "GPS Distance (KM)": item.gpsDistanceKm != null ? item.gpsDistanceKm : "—",
            "Manual Odometer": item.manualOdometerReading != null ? item.manualOdometerReading : "—",
            "Manual Baseline": item.manualBaselineOdometerReading != null ? item.manualBaselineOdometerReading : "—",
            "Manual Distance (KM)": item.manualDistanceKm != null ? item.manualDistanceKm : "—",
            "Applied Distance (KM)": item.appliedDistanceKm != null ? item.appliedDistanceKm : "—",
            "Applied Source": sourceInfo.labelEn,
            "Vehicle Tracked Distance (KM)": item.vehicleTrackedDistanceKm != null ? item.vehicleTrackedDistanceKm : "—",
            "Effective Odometer After (KM)": item.effectiveOdometerAfterKm != null ? item.effectiveOdometerAfterKm : "—",
            "GPS Import ID": item.lastGpsImportId || "—",
            "GPS Imported At": item.gpsImportedAtUtc || "—",
            "Manual Entered At": item.manualEnteredAtUtc || "—",
            "Manual Notes": item.manualNotes || "—",
            "Work Date": item.workDate,
          };
        }

        return {
          "م": idx + 1,
          "المركبة (اللوحة عربي)": item.plateNumberAr || "—",
          "اللوحة (إنجليزي)": item.plateNumberEn || "—",
          "المدينة": cityName,
          "نوع المركبة": vehicleTypeName,
          "حالة التعيين": isAssigned ? "معينة" : "غير معينة",
          "المندوب المستلم": riderName || "—",
          "مسافة GPS (كم)": item.gpsDistanceKm != null ? item.gpsDistanceKm : "—",
          "قراءة العداد اليدوية": item.manualOdometerReading != null ? item.manualOdometerReading : "—",
          "قراءة الأساس اليدوية": item.manualBaselineOdometerReading != null ? item.manualBaselineOdometerReading : "—",
          "المسافة اليدوية (كم)": item.manualDistanceKm != null ? item.manualDistanceKm : "—",
          "المسافة المعتمدة (كم)": item.appliedDistanceKm != null ? item.appliedDistanceKm : "—",
          "المصدر المعتمد": sourceInfo.labelAr,
          "إجمالي المركبة التشغيلي (كم)": item.vehicleTrackedDistanceKm != null ? item.vehicleTrackedDistanceKm : "—",
          "العداد بعد هذا اليوم (كم)": item.effectiveOdometerAfterKm != null ? item.effectiveOdometerAfterKm : "—",
          "رقم عملية استيراد GPS": item.lastGpsImportId || "—",
          "تاريخ استيراد GPS": item.gpsImportedAtUtc ? new Date(item.gpsImportedAtUtc).toLocaleString("ar-SA") : "—",
          "تاريخ الإدخال اليدوي": item.manualEnteredAtUtc ? new Date(item.manualEnteredAtUtc).toLocaleString("ar-SA") : "—",
          "ملاحظات الإدخال اليدوي": item.manualNotes || "—",
          "تاريخ العمل": item.workDate,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 18 }, // City
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 22 },
        { wch: 18 },
        { wch: 24 },
        { wch: 24 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 25 },
        { wch: 16 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        locale === "en" ? "Daily Distances" : "المسافات اليومية"
      );

      const fileName = `daily-distances-${workDate}${headerCityFilter ? `-${headerCityFilter}` : ""}${sourceFilter ? `-${sourceFilter}` : ""}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success("تم التصدير", "تم تنزيل سجلات المسافات اليومية بنجاح بصيغة Excel");
    } catch (err) {
      console.error("Error exporting daily distances:", err);
      toast.error("فشل التصدير", "حدث خطأ أثناء إنشاء ملف Excel");
    }
  };

  // Open Logs Modal
  const handleOpenLogs = async () => {
    setIsLogsModalOpen(true);
    setLogsLoading(true);
    try {
      const res = await getGpsImportLogs(workDate);
      setLogs(res);
    } catch (err: any) {
      console.error("Error fetching import logs", err);
      toast.error("خطأ", "تعذر تحميل سجل عمليات الرفع.");
    } finally {
      setLogsLoading(false);
    }
  };
  // Options for Table Header Filters
  const cityOptions = useMemo<FilterOption[]>(() => {
    if (!data?.items) return [];
    const map = new Map<string, number>();
    data.items.forEach((item) => {
      const city = getItemCity(item);
      if (city) {
        map.set(city, (map.get(city) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([city, count]) => ({
        value: city,
        label: city,
        count,
      }));
  }, [data?.items, getItemCity]);

  const vehicleTypeOptions = useMemo<FilterOption[]>(() => {
    if (!data?.items) return [];
    const map = new Map<string, { label: string; count: number }>();
    data.items.forEach((item) => {
      const vType = getItemVehicleType(item);
      if (vType != null) {
        const key = String(vType);
        const label = formatVehicleType(vType, locale);
        const current = map.get(key) || { label, count: 0 };
        current.count++;
        map.set(key, current);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].label.localeCompare(b[1].label))
      .map(([value, { label, count }]) => ({
        value,
        label,
        count,
      }));
  }, [data?.items, getItemVehicleType, locale]);

  const plateOptions = useMemo<FilterOption[]>(() => {
    if (!data?.items) return [];
    const map = new Map<string, number>();
    data.items.forEach((item) => {
      const plate = item.plateNumberAr || item.plateNumberEn || item.assetNumber;
      if (plate) {
        map.set(plate, (map.get(plate) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([plate, count]) => ({
        value: plate,
        label: plate,
        count,
      }));
  }, [data?.items]);

  const sourceOptions = useMemo<FilterOption[]>(() => {
    if (!data?.items) return [];
    let gpsCount = 0;
    let manualCount = 0;
    let noneCount = 0;
    data.items.forEach((item) => {
      const s = getAppliedSourceInfo(item.appliedSource);
      if (s.code === "Gps") gpsCount++;
      else if (s.code === "Manual") manualCount++;
      else noneCount++;
    });
    return [
      { value: "Gps", label: "GPS (معتمد)", count: gpsCount },
      { value: "Manual", label: "يدوي (بديل)", count: manualCount },
      { value: "None", label: "بدون مسافة", count: noneCount },
    ];
  }, [data?.items]);

  const gpsStatusOptions = useMemo<FilterOption[]>(() => {
    if (!data?.items) return [];
    let hasCount = 0;
    let zeroCount = 0;
    let noCount = 0;
    data.items.forEach((item) => {
      if (item.gpsDistanceKm == null) noCount++;
      else if (item.gpsDistanceKm === 0) zeroCount++;
      else hasCount++;
    });
    return [
      { value: "has_gps", label: "مسافة مسجلة (> 0 كم)", count: hasCount },
      { value: "zero_gps", label: "مسافة صفرية (0 كم)", count: zeroCount },
      { value: "no_gps", label: "غير متوفرة (—)", count: noCount },
    ];
  }, [data?.items]);

  const manualStatusOptions = useMemo<FilterOption[]>(() => {
    if (!data?.items) return [];
    let hasManual = 0;
    let noManual = 0;
    data.items.forEach((item) => {
      if (item.manualOdometerReading != null) hasManual++;
      else noManual++;
    });
    return [
      { value: "has_manual", label: "قراءة مسجلة", count: hasManual },
      { value: "no_manual", label: "بدون قراءة يدوية", count: noManual },
    ];
  }, [data?.items]);

  const { assignedCount, unassignedCount } = useMemo(() => {
    if (!data?.items) return { assignedCount: 0, unassignedCount: 0 };
    let assigned = 0;
    let unassigned = 0;
    data.items.forEach((item) => {
      if (isItemAssigned(item)) assigned++;
      else unassigned++;
    });
    return { assignedCount: assigned, unassignedCount: unassigned };
  }, [data?.items, isItemAssigned]);

  const clearHeaderFilters = () => {
    setHeaderCityFilter([]);
    setHeaderVehicleTypeFilter([]);
    setHeaderPlateFilter([]);
    setHeaderSourceFilter([]);
    setHeaderGpsStatusFilter([]);
    setHeaderManualStatusFilter([]);
    setAssignmentFilter("all");
    try {
      sessionStorage.removeItem(GPS_DAILY_DISTANCES_FILTERS_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const isHeaderFiltered = Boolean(
    headerCityFilter.length > 0 ||
    headerVehicleTypeFilter.length > 0 ||
    headerPlateFilter.length > 0 ||
    headerSourceFilter.length > 0 ||
    headerGpsStatusFilter.length > 0 ||
    headerManualStatusFilter.length > 0 ||
    assignmentFilter !== "all"
  );

  // Client-filtered items based on table header filters and assignment
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      if (assignmentFilter === "assigned") {
        if (!isItemAssigned(item)) return false;
      } else if (assignmentFilter === "unassigned") {
        if (isItemAssigned(item)) return false;
      }
      if (headerCityFilter.length > 0) {
        const itemCity = getItemCity(item).toLowerCase();
        const match = headerCityFilter.some((cf) => {
          const c = cf.toLowerCase();
          return itemCity === c || itemCity.includes(c);
        });
        if (!match) return false;
      }
      if (headerVehicleTypeFilter.length > 0) {
        const vType = getItemVehicleType(item);
        if (vType == null) return false;
        const vTypeStr = String(vType);
        const vTypeLabel = formatVehicleType(vType, locale).toLowerCase();
        const match = headerVehicleTypeFilter.some((filterVal) => {
          return (
            filterVal === vTypeStr ||
            filterVal.toLowerCase() === vTypeLabel
          );
        });
        if (!match) return false;
      }
      if (headerPlateFilter.length > 0) {
        const match = headerPlateFilter.some((pf) => {
          const p = pf.toLowerCase();
          const matchAr = item.plateNumberAr?.toLowerCase().includes(p);
          const matchEn = item.plateNumberEn?.toLowerCase().includes(p);
          const matchAsset = item.assetNumber?.toLowerCase().includes(p);
          return matchAr || matchEn || matchAsset;
        });
        if (!match) return false;
      }
      if (headerSourceFilter.length > 0) {
        const s = getAppliedSourceInfo(item.appliedSource);
        if (!headerSourceFilter.includes(s.code)) return false;
      }
      if (headerGpsStatusFilter.length > 0) {
        const match = headerGpsStatusFilter.some((gf) => {
          if (gf === "has_gps") return item.gpsDistanceKm != null && item.gpsDistanceKm > 0;
          if (gf === "zero_gps") return item.gpsDistanceKm === 0;
          if (gf === "no_gps") return item.gpsDistanceKm == null;
          return false;
        });
        if (!match) return false;
      }
      if (headerManualStatusFilter.length > 0) {
        const match = headerManualStatusFilter.some((mf) => {
          if (mf === "has_manual") return item.manualOdometerReading != null;
          if (mf === "no_manual") return item.manualOdometerReading == null;
          return false;
        });
        if (!match) return false;
      }
      return true;
    });
  }, [
    data?.items,
    assignmentFilter,
    isItemAssigned,
    headerCityFilter,
    headerVehicleTypeFilter,
    headerPlateFilter,
    headerSourceFilter,
    headerGpsStatusFilter,
    headerManualStatusFilter,
    getItemCity,
    getItemVehicleType,
    locale,
  ]);

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <span>إدارة الأسطول والمركبات</span>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-[#1167c9] dark:text-blue-400">المسافات اليومية (GPS والعداد)</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
            <Gauge className="h-7 w-7 text-[#1167c9] dark:text-blue-400" />
            المسافات اليومية للمركبات
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            سجل موحد لكل يوم يجمع بين مسافة GPS اليومية وقراءة العداد اليدوية للمركبة مع اعتماد تلقائي لمصدر GPS عند توفره.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data && data.items.length > 0 && (
            <Button
              variant="secondary"
              onClick={handleExportTableExcel}
              className="gap-2 text-xs font-bold"
            >
              <FileDown className="h-4 w-4 text-[#1167c9]" />
              تصدير السجلات (Excel)
            </Button>
          )}

          {(can("fleet.daily_distances.read") || can("fleet.vehicles.read") || can("fleet.assignments.read")) && (
            <>
              <Link href="/admin/fleet/daily-distances/fleet-report">
                <Button
                  variant="secondary"
                  className="gap-2 text-xs font-bold hover:text-emerald-700 dark:hover:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                >
                  <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  تقرير مسافات الأسطول (جميع المركبات)
                </Button>
              </Link>

              <Link href="/admin/fleet/daily-distances/vehicle-report">
                <Button
                  variant="secondary"
                  className="gap-2 text-xs font-bold hover:text-[#1167c9]"
                >
                  <Gauge className="h-4 w-4 text-[#1167c9]" />
                  تقرير مسافات مركبة
                </Button>
              </Link>

              <Link href="/admin/fleet/daily-distances/missing-records">
                <Button
                  variant="secondary"
                  className="gap-2 text-xs font-bold hover:text-amber-600"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  تقرير السجلات المفقودة
                </Button>
              </Link>

              <Button variant="secondary" onClick={handleOpenLogs} className="gap-2 text-xs font-bold">
                <History className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                سجل عمليات الرفع
              </Button>
            </>
          )}

          {(can("fleet.daily_distances.import") || can("fleet.vehicles.read") || can("fleet.assignments.read")) && (
            <Button
              onClick={handleOpenGpsImport}
              className="gap-2 bg-[#1167c9] hover:bg-blue-700 text-white font-bold text-xs shadow-md"
            >
              <Upload className="h-4 w-4" />
              رفع تقرير GPS
            </Button>
          )}
        </div>
      </div>

      {/* Top Filter Bar */}
      <Card className="p-4 space-y-4 bg-[var(--surface)] border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Work Date Selection */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[var(--foreground)] shrink-0 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#1167c9]" />
              تاريخ العمل المستهدف <span className="text-red-500">*</span>:
            </label>
            <Input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-44 text-xs font-mono font-bold"
              required
            />
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث برقم الأصل أو اللوحة..."
                className="pr-9 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="مسح البحث"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="secondary" className="text-xs gap-1 font-bold">
              تصفية
            </Button>
          </form>
        </div>

        {/* Source & Assignment Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          {/* Source Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[var(--muted)] ml-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              مصدر المسافة:
            </span>

            <button
              type="button"
              onClick={() => setSourceFilter("")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                sourceFilter === ""
                  ? "bg-[#1167c9] text-white shadow-xs"
                  : "bg-[var(--subtle-bg)] text-[var(--foreground)] hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              الكل {data ? `(${data.totalCount})` : ""}
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter("gps")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                sourceFilter === "gps"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>GPS معتمد</span>
              {data && <span className="font-mono text-[11px]">({data.gpsCount})</span>}
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter("manual")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                sourceFilter === "manual"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>بديل يدوي</span>
              {data && <span className="font-mono text-[11px]">({data.manualFallbackCount})</span>}
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter("missing")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                sourceFilter === "missing"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>بدون مسافة</span>
              {data && <span className="font-mono text-[11px]">({data.missingCount})</span>}
            </button>
          </div>

          {/* Vehicle Assignment Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[var(--muted)] ml-1 flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
              حالة التعيين:
            </span>

            <button
              type="button"
              onClick={() => setAssignmentFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                assignmentFilter === "all"
                  ? "bg-[#1167c9] text-white shadow-xs"
                  : "bg-[var(--subtle-bg)] text-[var(--foreground)] hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              الكل {data ? `(${data.items.length})` : ""}
            </button>

            <button
              type="button"
              onClick={() => setAssignmentFilter("assigned")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                assignmentFilter === "assigned"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 hover:bg-indigo-100"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>معينة (على مندوب)</span>
              {data && <span className="font-mono text-[11px]">({assignedCount})</span>}
            </button>

            <button
              type="button"
              onClick={() => setAssignmentFilter("unassigned")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                assignmentFilter === "unassigned"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <UserX className="h-3.5 w-3.5" />
              <span>غير معينة (متاحة)</span>
              {data && <span className="font-mono text-[11px]">({unassignedCount})</span>}
            </button>
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-2 border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">مركبات GPS المعتمدة</span>
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-100 font-mono">
              {data.gpsCount} <span className="text-xs font-sans text-emerald-700">مركبة</span>
            </div>
            <p className="text-[11px] text-emerald-700/80">المسافة مستوردة تلقائياً من تقرير GPS.</p>
          </Card>

          <Card className="p-4 space-y-2 border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">البديل اليدوي</span>
              <Edit3 className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-950 dark:text-amber-100 font-mono">
              {data.manualFallbackCount} <span className="text-xs font-sans text-amber-700">مركبة</span>
            </div>
            <p className="text-[11px] text-amber-700/80">اعتماد الفرق اليدوي لعدم توفر GPS اليوم.</p>
          </Card>

          <Card className="p-4 space-y-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">بدون مسافة مسجلة</span>
              <AlertCircle className="h-5 w-5 text-slate-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {data.missingCount} <span className="text-xs font-sans text-slate-600">مركبة</span>
            </div>
            <p className="text-[11px] text-slate-500">تحتاج رفع تقرير GPS أو إدخال قراءة العداد.</p>
          </Card>

          <Card className="p-4 space-y-2 border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">إجمالي مسافة اليوم المعتمدة</span>
              <Gauge className="h-5 w-5 text-[#1167c9]" />
            </div>
            <div className="text-2xl font-black text-[#1167c9] dark:text-blue-400 font-mono">
              {data.appliedTotalKm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-xs font-sans text-blue-800 dark:text-blue-300">كم</span>
            </div>
            <p className="text-[11px] text-blue-700/80">مجموع المسافات الفعالة المعتمدة لليوم.</p>
          </Card>
        </div>
      )}

      {/* Active Table Header Filters */}
      {isHeaderFiltered && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
          <span className="text-[var(--muted)] font-bold">فلاتر أعمدة الجدول النشطة:</span>
          {headerCityFilter.map((c) => (
            <Badge key={c} className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 gap-1 pl-1.5 font-medium">
              المدينة: {c}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderCityFilter(headerCityFilter.filter((x) => x !== c))} />
            </Badge>
          ))}
          {headerVehicleTypeFilter.map((vtVal) => (
            <Badge key={vtVal} className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 gap-1 pl-1.5 font-medium">
              نوع المركبة: {vehicleTypeOptions.find((o) => o.value === vtVal)?.label || vtVal}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderVehicleTypeFilter(headerVehicleTypeFilter.filter((x) => x !== vtVal))} />
            </Badge>
          ))}
          {headerPlateFilter.map((p) => (
            <Badge key={p} className="bg-blue-50 text-[#1167c9] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 gap-1 pl-1.5 font-medium">
              اللوحة: {p}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderPlateFilter(headerPlateFilter.filter((x) => x !== p))} />
            </Badge>
          ))}
          {headerSourceFilter.map((sVal) => (
            <Badge key={sVal} className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 gap-1 pl-1.5 font-medium">
              المصدر: {sourceOptions.find((s: FilterOption) => s.value === sVal)?.label || sVal}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderSourceFilter(headerSourceFilter.filter((x) => x !== sVal))} />
            </Badge>
          ))}
          {headerGpsStatusFilter.map((gVal) => (
            <Badge key={gVal} className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 gap-1 pl-1.5 font-medium">
              مسافة GPS: {gpsStatusOptions.find((s: FilterOption) => s.value === gVal)?.label || gVal}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderGpsStatusFilter(headerGpsStatusFilter.filter((x) => x !== gVal))} />
            </Badge>
          ))}
          {headerManualStatusFilter.map((mVal) => (
            <Badge key={mVal} className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 gap-1 pl-1.5 font-medium">
              العداد اليدوي: {manualStatusOptions.find((s: FilterOption) => s.value === mVal)?.label || mVal}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderManualStatusFilter(headerManualStatusFilter.filter((x) => x !== mVal))} />
            </Badge>
          ))}
          {assignmentFilter !== "all" && (
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 gap-1 pl-1.5 font-medium">
              التعيين: {assignmentFilter === "assigned" ? "معينة (على مندوب)" : "غير معينة (متاحة)"}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setAssignmentFilter("all")} />
            </Badge>
          )}
          <button
            type="button"
            onClick={clearHeaderFilters}
            className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold mr-auto cursor-pointer"
          >
            مسح جميع فلاتر الأعمدة
          </button>
        </div>
      )}

      {/* Main Table */}
      <Card className="p-0 overflow-hidden border-[var(--border)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#1167c9]" />
            <p className="text-xs text-[var(--muted)]">جاري تحميل المسافات اليومية للمركبات...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-4 border-red-200 bg-red-50/50">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h3 className="font-bold text-red-900 text-sm">{error}</h3>
            <Button onClick={() => fetchDailyDistances()} variant="secondary" className="gap-2 text-xs">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Gauge className="h-10 w-10 text-[var(--muted)] mx-auto opacity-50" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">لا توجد سجلات مسافات لهذا اليوم.</h3>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
              تأكد من اختيار تاريخ عمل صحيح أو قم برفع تقرير GPS الخاص بهذا اليوم.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Filter className="h-10 w-10 text-[var(--muted)] mx-auto opacity-50" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">لا توجد سجلات تطابق فلاتر الأعمدة المحددة.</h3>
            <Button variant="secondary" onClick={clearHeaderFilters} className="text-xs">
              مسح فلاتر الأعمدة
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs dir-rtl">
              <thead className="bg-[#1167c9]/10 text-xs font-extrabold text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>المركبة</span>
                      <TableHeaderColumnFilter
                        label="المركبة"
                        value={headerPlateFilter}
                        onChange={setHeaderPlateFilter}
                        options={plateOptions}
                        placeholder="بحث في المركبات..."
                      />
                    </div>
                  </th>
                  <th className="px-3.5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="leading-tight">المدينة</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">نوع المركبة</span>
                      </div>
                      <TableHeaderDualFilter
                        label="المدينة ونوع المركبة"
                        tab1={{
                          id: "city",
                          label: "المدينة",
                          icon: <MapPin className="h-3 w-3" />,
                          values: headerCityFilter,
                          onChange: setHeaderCityFilter,
                          options: cityOptions,
                          placeholder: "بحث في المدن...",
                        }}
                        tab2={{
                          id: "vehicleType",
                          label: "نوع المركبة",
                          icon: <Truck className="h-3 w-3" />,
                          values: headerVehicleTypeFilter,
                          onChange: setHeaderVehicleTypeFilter,
                          options: vehicleTypeOptions,
                          placeholder: "تصفية حسب نوع المركبة...",
                        }}
                      />
                    </div>
                  </th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <span>مسافة GPS</span>
                      <TableHeaderColumnFilter
                        label="مسافة GPS"
                        value={headerGpsStatusFilter}
                        onChange={setHeaderGpsStatusFilter}
                        options={gpsStatusOptions}
                        placeholder="تصفية مسافة GPS..."
                      />
                    </div>
                  </th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <span>قراءة العداد اليدوية</span>
                      <TableHeaderColumnFilter
                        label="العداد اليدوي"
                        value={headerManualStatusFilter}
                        onChange={setHeaderManualStatusFilter}
                        options={manualStatusOptions}
                        placeholder="تصفية القراءة اليدوية..."
                      />
                    </div>
                  </th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">قراءة الأساس</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">المسافة اليدوية</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap bg-blue-500/10 text-[#1167c9]">المسافة المعتمدة</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <span>المصدر المعتمد</span>
                      <TableHeaderColumnFilter
                        label="المصدر المعتمد"
                        value={headerSourceFilter}
                        onChange={setHeaderSourceFilter}
                        options={sourceOptions}
                        placeholder="تصفية المصدر..."
                      />
                    </div>
                  </th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">إجمالي المركبة التشغيلي</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap bg-slate-100/60 dark:bg-slate-800/40">العداد بعد اليوم</th>
                  <th className="px-3 py-3.5 whitespace-nowrap text-center">بيانات الإدخال / الاستيراد</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-medium">
                {filteredItems.map((item: VehicleDailyDistanceItem) => {
                  const sourceInfo = getAppliedSourceInfo(item.appliedSource);

                  return (
                    <tr key={item.vehicleId} className="hover:bg-[var(--subtle-bg)] transition-colors">
                      {/* Vehicle */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Link
                          href={`/admin/fleet/vehicles/${item.vehicleId}`}
                          className="group hover:underline inline-block"
                        >
                          <div className="font-bold text-[var(--foreground)] group-hover:text-[#1167c9] transition-colors">{item.plateNumberAr || "—"}</div>
                          <div className="font-mono text-[10px] text-[var(--muted)]">{item.plateNumberEn || "—"}</div>
                        </Link>
                        <div className="mt-1">
                          {isItemAssigned(item) ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900"
                              title={getItemRiderName(item) ? `المندوب: ${getItemRiderName(item)}` : "المركبة معينة"}
                            >
                              <UserCheck className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">{getItemRiderName(item) || "معينة"}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700">
                              <UserX className="h-3 w-3 text-slate-400" />
                              <span>غير معينة</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* City & Vehicle Type */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {getItemCity(item) || "—"}
                        </div>
                        <div className="mt-1">
                          {(() => {
                            const vType = getItemVehicleType(item);
                            if (vType == null) {
                              return <span className="text-[10px] text-slate-400">—</span>;
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700">
                                {formatVehicleType(vType, locale)}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* GPS Distance */}
                      <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                        {item.gpsDistanceKm != null ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {item.gpsDistanceKm.toFixed(2)} كم
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Manual Odometer Reading */}
                      <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                        {item.manualOdometerReading != null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.manualOdometerReading.toLocaleString()}
                            </span>
                            {item.isOdometerCorrection && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Sparkles className="h-2.5 w-2.5" />
                                تصحيح عداد
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Baseline Odometer */}
                      <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                        {item.manualBaselineOdometerReading != null ? (
                          <span className="text-slate-600 dark:text-slate-400">
                            {item.manualBaselineOdometerReading.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Manual Calculated Distance */}
                      <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                        {item.manualDistanceKm != null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              {item.manualDistanceKm.toFixed(2)} كم
                            </span>
                            {item.isOdometerCorrection && (
                              <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold">
                                (تصحيح عداد)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Applied Distance Km (Main Highlighted Column) */}
                      <td className="px-3 py-3 text-center font-mono bg-blue-50/50 dark:bg-blue-950/20 whitespace-nowrap">
                        {item.appliedDistanceKm != null ? (
                          <span className="text-sm font-black text-[#1167c9] dark:text-blue-400">
                            {item.appliedDistanceKm.toFixed(2)} كم
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">0.00 كم</span>
                        )}
                      </td>

                      {/* Applied Source Badge */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${sourceInfo.colorClass}`}
                          >
                            {sourceInfo.code === "Gps" && <CheckCircle2 className="h-3 w-3" />}
                            {sourceInfo.code === "Manual" && <Edit3 className="h-3 w-3" />}
                            {sourceInfo.code === "None" && <AlertCircle className="h-3 w-3" />}
                            <span>{sourceInfo.labelAr}</span>
                          </span>
                          {sourceInfo.code === "Gps" && item.manualOdometerReading != null && (
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                              (تم حفظ اليدوي للمراجعة)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vehicle Tracked Total Distance */}
                      <td className="px-3 py-3 text-center font-mono whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.vehicleTrackedDistanceKm != null
                            ? `${item.vehicleTrackedDistanceKm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} كم`
                            : "—"}
                        </span>
                      </td>

                      {/* Effective Odometer After This Day */}
                      <td className="px-3 py-3 text-center font-mono bg-slate-50/60 dark:bg-slate-900/40 whitespace-nowrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.effectiveOdometerAfterKm != null
                            ? `${item.effectiveOdometerAfterKm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} كم`
                            : "—"}
                        </span>
                      </td>

                      {/* Entry and Import Details */}
                      <td className="px-3 py-3 text-[10px] text-slate-600 dark:text-slate-400 whitespace-nowrap leading-tight">
                        {item.lastGpsImportId && (
                          <div className="font-mono text-[9px] text-[#1167c9] dark:text-blue-400 flex items-center gap-1">
                            <span className="font-bold">استيراد:</span>
                            <span title={item.lastGpsImportId}>{item.lastGpsImportId.slice(0, 8)}...</span>
                          </div>
                        )}
                        {item.gpsImportedAtUtc && (
                          <div>
                            <span className="text-slate-500 font-medium">GPS:</span>{" "}
                            {new Date(item.gpsImportedAtUtc).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                        {item.manualEnteredAtUtc && (
                          <div className="text-amber-700 dark:text-amber-400">
                            <span className="font-medium">يدوي:</span>{" "}
                            {new Date(item.manualEnteredAtUtc).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                            {item.manualNotes && (
                              <span title={`ملاحظة: ${item.manualNotes}`} className="cursor-help mr-1">
                                📝
                              </span>
                            )}
                          </div>
                        )}
                        {!item.gpsImportedAtUtc && !item.manualEnteredAtUtc && !item.lastGpsImportId && (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {(can("fleet.daily_distances.read") || can("fleet.vehicles.read") || can("fleet.assignments.read")) && (
                            <Link
                              href={`/admin/fleet/daily-distances/vehicle-report?vehicleId=${encodeURIComponent(item.vehicleId)}&workDate=${encodeURIComponent(item.workDate)}`}
                            >
                              <Button
                                variant="secondary"
                                className="text-[11px] py-1 px-2.5 gap-1 font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9]"
                                title="عرض تقرير مسافات المركبة"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5 text-[#1167c9]" />
                                <span>التقرير</span>
                              </Button>
                            </Link>
                          )}

                          {(item.manualOdometerReading != null ? can("fleet.daily_distances.update") : can("fleet.daily_distances.create")) && (
                            <Button
                              variant="secondary"
                              onClick={() => handleOpenManualModal(item)}
                              className="text-[11px] py-1 px-2.5 gap-1 font-bold"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-[#1167c9]" />
                              <span>{item.manualOdometerReading != null ? "تعديل العداد" : "إدخال العداد"}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Enter/Edit Manual Odometer Reading */}
      <Modal
        isOpen={Boolean(selectedItemForManual)}
        onClose={() => {
          setSelectedItemForManual(null);
          setConcurrencyConflictNotice(null);
        }}
        title={
          selectedItemForManual?.manualOdometerReading != null
            ? "تصحيح قراءة العداد اليدوية"
            : "إدخال قراءة العداد اليدوية"
        }
      >
        {selectedItemForManual && (
          <form onSubmit={handleManualSubmit} className="space-y-4 pt-2 text-xs">
            {/* Top Identity Card */}
            <Card className="p-3 bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-xs space-y-1.5 text-slate-800 dark:text-slate-200">
              <div className="flex items-center justify-between font-bold">
                <span>
                  رقم الأصل:{" "}
                  <span className="font-mono text-[#1167c9]">{selectedItemForManual.assetNumber}</span>
                </span>
                <span>
                  اللوحة:{" "}
                  <strong>
                    {selectedItemForManual.plateNumberAr || selectedItemForManual.plateNumberEn || "—"}
                  </strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>تاريخ العمل: <strong>{selectedItemForManual.workDate}</strong></span>
                <span>
                  العداد التشغيلي الحالي:{" "}
                  <strong>{selectedItemForManual.currentOdometer.toLocaleString()} كم</strong>
                </span>
                {selectedItemForManual.manualOdometerReading != null && (
                  <span className="text-amber-700 dark:text-amber-400 font-bold">
                    القراءة المسجلة: {selectedItemForManual.manualOdometerReading.toLocaleString()} كم
                  </span>
                )}
              </div>

              {/* Row Existence & RowVersion Status (Requirement 2) */}
              {(() => {
                const targetDayInHist = vehicleHistory.find(
                  (d) => d.workDate === selectedItemForManual.workDate
                );
                const rowExists = Boolean(
                  (selectedItemForManual.rowVersion && selectedItemForManual.rowVersion.trim()) ||
                  (selectedItemForManual.id && selectedItemForManual.id.trim()) ||
                  selectedItemForManual.manualOdometerReading != null ||
                  selectedItemForManual.gpsDistanceKm != null ||
                  (targetDayInHist && targetDayInHist.hasRecord)
                );
                return (
                  <div className="flex items-center gap-2 pt-1 border-t border-blue-200/60 dark:border-blue-900/40 text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400">حالة السجل بالخادم:</span>
                    {rowExists ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        سجل موجود مسبقاً (سيتم إرسال rowVersion للتحديث والتوافق)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        <Info className="h-3 w-3" />
                        سجل جديد (لا يوجد صف سابق - سيتم إرسال rowVersion: null)
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="text-[11px] text-blue-800 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#1167c9] dark:text-blue-400" />
                  <span>إمكانية تخفيض وتصحيح قراءة العداد (Odometer Correction):</span>
                </div>
                <p>
                  يمكنك إدخال قراءة أقل من قراءة اليوم السابق (مثال: إدخال 20 ليوم 30 أكتوبر بعد 100 في 29 أكتوبر). سيقبلها النظام كتصحيح لعداد المركبة وتحديث للعداد التشغيلي، وستكون المسافة اليدوية لليوم 0 كم مع بقاء سجل اليوم السابق في التاريخ وإعادة احتساب الأيام اللاحقة.
                </p>
              </div>
            </Card>

            {/* API Error Message Alert Card (Requirement 3) */}
            {apiErrorMessage && (
              <Card className="p-3.5 bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    <span>تفاصيل رفض القراءة من النظام (API Rejection Detail):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApiErrorMessage(null)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 p-0.5 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-2.5 bg-white/80 dark:bg-black/40 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-semibold leading-relaxed text-red-800 dark:text-red-200">
                  {apiErrorMessage}
                </div>
                <div className="text-[11px] text-red-700 dark:text-red-300 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    السماح بإدخال رقم أقل في النموذج لا يتجاوز شروط التحقق من المسافات في الخادم. يجب أن تكون القراءة أعلى من قراءة الأساس المعتمدة بالنظام ولا تؤدي لجعل قراءات الأيام اللاحقة سالبة أو غير صالحة.
                  </span>
                </div>
              </Card>
            )}

            {/* Concurrency Conflict Banner (When record reloaded) */}
            {concurrencyConflictNotice && (
              <Card className="p-3 bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    تعارض في التحديث بالتزامن
                  </p>
                  <button
                    type="button"
                    onClick={() => setConcurrencyConflictNotice(null)}
                    className="text-amber-700 hover:text-amber-900 dark:text-amber-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {concurrencyConflictNotice}
                </p>
              </Card>
            )}

            {/* Vehicle Daily Distance History & Baseline Context Panel (Requirement 1) */}
            <Card className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                  <History className="h-4 w-4 text-[#1167c9]" />
                  <span>سجل المسافات وقراءات العداد السابقة واللاحقة للمركبة:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="text-[11px] text-[#1167c9] dark:text-blue-400 font-bold hover:underline"
                >
                  {isHistoryExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                </button>
              </div>

              {historyLoading ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#1167c9]" />
                  <span>جارِ فحص تاريخ مسافات المركبة وحساب قراءة الأساس من الخادم...</span>
                </div>
              ) : (
                <>
                  {/* 3 KPI Summary Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Applicable Baseline */}
                    <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">
                        قراءة الأساس المعتمدة بالنظام
                      </div>
                      <div className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {applicableBaseline != null
                          ? `${applicableBaseline.value.toLocaleString()} كم`
                          : "غير محددة (يلزم إدخال أساس)"}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                        {applicableBaseline != null
                          ? `محسوبة من تاريخ: ${applicableBaseline.date}`
                          : "لا يوجد سجل مسافات سابق"}
                      </div>
                    </div>

                    {/* Target Day */}
                    <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80">
                      <div className="text-[10px] text-blue-800 dark:text-blue-300 font-bold">
                        قراءة اليوم المستهدف ({selectedItemForManual.workDate})
                      </div>
                      <div className="text-sm font-black font-mono text-[#1167c9] dark:text-blue-400 mt-0.5">
                        {selectedItemForManual.manualOdometerReading != null
                          ? `${selectedItemForManual.manualOdometerReading.toLocaleString()} كم`
                          : "غير مسجل حالياً"}
                      </div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                        {selectedItemForManual.appliedDistanceKm != null
                          ? `المسافة الحالية: ${selectedItemForManual.appliedDistanceKm.toFixed(2)} كم`
                          : "لا توجد مسافة معتمدة"}
                      </div>
                    </div>

                    {/* Next Recorded Day Constraint */}
                    <div className="p-2.5 bg-purple-50/80 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/80">
                      <div className="text-[10px] text-purple-800 dark:text-purple-300 font-bold">
                        أقرب قراءة لاحقة مسجلة
                      </div>
                      <div className="text-sm font-black font-mono text-purple-700 dark:text-purple-400 mt-0.5">
                        {nextRecordedDay != null
                          ? `${nextRecordedDay.value.toLocaleString()} كم`
                          : "لا توجد قراءات لاحقة"}
                      </div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                        {nextRecordedDay != null
                          ? `يوم ${nextRecordedDay.date} (الحد الأقصى المسموح)`
                          : "لا يوجد قيد من أيام لاحقة"}
                      </div>
                    </div>
                  </div>

                  {/* Collapsible History Table */}
                  {isHistoryExpanded && vehicleHistory.length > 0 && (
                    <div className="overflow-x-auto max-h-48 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <table className="w-full text-[11px] text-right border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-bold">
                          <tr>
                            <th className="px-2.5 py-1.5">التاريخ</th>
                            <th className="px-2.5 py-1.5 text-center">الأساس</th>
                            <th className="px-2.5 py-1.5 text-center">قراءة العداد</th>
                            <th className="px-2.5 py-1.5 text-center">المسافة كم</th>
                            <th className="px-2.5 py-1.5 text-center">المصدر</th>
                            <th className="px-2.5 py-1.5 text-center">العداد بعد اليوم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                          {vehicleHistory
                            .filter(
                              (d) =>
                                d.hasRecord ||
                                d.effectiveOdometerAfterKm != null ||
                                d.workDate === selectedItemForManual.workDate
                            )
                            .map((day) => {
                              const isTarget = day.workDate === selectedItemForManual.workDate;
                              const isBaselineDay =
                                applicableBaseline && day.workDate === applicableBaseline.date;
                              const isNextDay =
                                nextRecordedDay && day.workDate === nextRecordedDay.date;

                              return (
                                <tr
                                  key={day.workDate}
                                  className={
                                    isTarget
                                      ? "bg-blue-100/70 dark:bg-blue-900/40 font-bold"
                                      : isBaselineDay
                                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                                      : isNextDay
                                      ? "bg-purple-50 dark:bg-purple-950/20"
                                      : "hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
                                  }
                                >
                                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                      <span>{day.workDate}</span>
                                      {isTarget && (
                                        <Badge tone="blue" className="text-[9px] px-1 py-0">
                                          اليوم المستهدف
                                        </Badge>
                                      )}
                                      {isBaselineDay && (
                                        <Badge tone="green" className="text-[9px] px-1 py-0">
                                          أساس اليوم
                                        </Badge>
                                      )}
                                      {isNextDay && (
                                        <Badge tone="purple" className="text-[9px] px-1 py-0">
                                          قراءة لاحقة
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center">
                                    {day.manualBaselineOdometerReading != null
                                      ? day.manualBaselineOdometerReading.toLocaleString()
                                      : "—"}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center font-bold">
                                    {day.manualOdometerReading != null
                                      ? day.manualOdometerReading.toLocaleString()
                                      : "—"}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center text-[#1167c9] dark:text-blue-400 font-bold">
                                    {day.appliedDistanceKm != null
                                      ? day.appliedDistanceKm.toFixed(2)
                                      : "0.00"}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center text-[10px]">
                                    {day.appliedSource === 2 ? "GPS" : day.appliedSource === 1 ? "يدوي" : "—"}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center">
                                    {day.effectiveOdometerAfterKm != null
                                      ? day.effectiveOdometerAfterKm.toLocaleString()
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Baseline Required Notice (For new entry or backend error) */}
            {requireBaselineInput && !applicableBaseline && (
              <Card className="p-3 bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  مطلوب تحديد قراءة الأساس السابقة:
                </p>
                <p className="text-[11px] leading-relaxed">
                  لا توجد قراءة سابقة مسجلة لهذه المركبة لتحديد بداية احتساب اليوم. يُرجى أدناه إدخال قراءة العداد السابقة (الأساس).
                </p>
              </Card>
            )}

            {/* Odometer Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {selectedItemForManual.manualOdometerReading != null
                  ? "قراءة العداد الإجمالية المصححة (Odometer Reading)"
                  : "قراءة العداد الإجمالية الحالية (Odometer Reading)"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                value={manualOdometer}
                onChange={(e) => setManualOdometer(e.target.value)}
                placeholder="أدخل قراءة العداد الإجمالية للمركبة (مثال: 100)..."
                className="font-mono text-sm"
                required
              />
              <span className="text-[11px] text-slate-500 block">
                {selectedItemForManual.manualOdometerReading != null
                  ? "ملاحظة: يمكنك إدخال أي قيمة صحيحة حتى لو كانت أقل من القراءة المسجلة سابقاً لتصحيح الخطأ."
                  : "ملاحظة: هذه هي القراءة الكلية المكتوبة على عداد المركبة وليست مسافة اليوم فقط."}
              </span>

              {/* Real-time Constraint Warnings & Explanations */}
              {(() => {
                if (!manualOdometer || isNaN(parseFloat(manualOdometer))) return null;
                const odo = parseFloat(manualOdometer);

                // If reading is lower than applicable baseline: explain that it acts as odometer correction!
                if (applicableBaseline && odo < applicableBaseline.value) {
                  return (
                    <div className="p-3 bg-purple-50/90 dark:bg-purple-950/40 rounded-xl border-2 border-purple-300 dark:border-purple-800 text-purple-950 dark:text-purple-200 text-xs space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                        <Sparkles className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                        <span>تصحيح عداد المركبة (Odometer Correction)</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                          أقل من قراءة الأساس ({applicableBaseline.value.toLocaleString()} كم)
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300">
                        القراءة المدخلة ({odo.toLocaleString()} كم) أقل من قراءة اليوم السابق ({applicableBaseline.date}: {applicableBaseline.value.toLocaleString()} كم).
                        سيقبل النظام هذه القراءة <strong>كتصحيح لعداد المركبة</strong> ويحدث العداد التشغيلي للمركبة.
                      </p>
                      <ul className="text-[10px] text-purple-700 dark:text-purple-300 space-y-1 list-disc list-inside pt-0.5 font-medium">
                        <li>سيبقى سجل اليوم السابق ({applicableBaseline.date}) محفوظاً في التاريخ كما هو.</li>
                        <li>المسافة اليدوية المحسوبة لهذا اليوم ستكون <strong>0 كم</strong> (لأنه لا يمكن استنتاج المسافة من قراءة مخفضة).</li>
                        {selectedItemForManual.gpsDistanceKm != null && selectedItemForManual.gpsDistanceKm > 0 ? (
                          <li className="text-emerald-700 dark:text-emerald-400 font-bold">
                            مسافة الـ GPS متوفرة ({selectedItemForManual.gpsDistanceKm.toFixed(2)} كم) وستظل معتمدة للمسافة اليومية.
                          </li>
                        ) : (
                          <li>ستظل مسافة اليوم معتمدة على GPS إن وُجدت لاحقاً أو تبقى 0 كم.</li>
                        )}
                        <li>
                          {nextRecordedDay != null
                            ? `سيتم إعادة احتساب سجلات الأيام اللاحقة (بدءاً من ${nextRecordedDay.date}) بناءً على القراءة المصححة.`
                            : "لا توجد سجلات لأيام لاحقة، وسيكون عداد المركبة الحالي هو هذه القراءة المصححة."}
                        </li>
                      </ul>
                    </div>
                  );
                }

                // If reading is greater than next recorded day:
                if (nextRecordedDay && odo > nextRecordedDay.value) {
                  return (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[11px] font-bold flex items-start gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <span>
                        تنبيه: القراءة المدخلة ({odo.toLocaleString()} كم) أعلى من قراءة اليوم اللاحق ({nextRecordedDay.date}: {nextRecordedDay.value.toLocaleString()} كم). قد يتسبب ذلك في جعل تسلسل الأيام اللاحقة غير صالح وسيرفضها الخادم.
                      </span>
                    </div>
                  );
                }

                return null;
              })()}
            </div>

            {/* Baseline Field Handling: only shown when no baseline exists in system */}
            {(selectedItemForManual.manualOdometerReading == null || requireBaselineInput) && !applicableBaseline && (
              (requireBaselineInput || selectedItemForManual.manualBaselineOdometerReading != null || selectedItemForManual.currentOdometer != null) && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      قراءة العداد السابقة (الأساس / Baseline) {requireBaselineInput && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex items-center gap-2">
                      {selectedItemForManual.currentOdometer != null && selectedItemForManual.gpsDistanceKm != null && selectedItemForManual.gpsDistanceKm > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const base = (selectedItemForManual.manualOdometerReading ?? selectedItemForManual.currentOdometer) - selectedItemForManual.gpsDistanceKm!;
                            const val = base > 0 ? base : 0;
                            setManualBaseline(Number.isInteger(val) ? val.toString() : val.toFixed(2));
                          }}
                          className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
                        >
                          خصم مسافة GPS ({( (selectedItemForManual.manualOdometerReading ?? selectedItemForManual.currentOdometer) - selectedItemForManual.gpsDistanceKm ).toFixed(2)} كم)
                        </button>
                      )}
                      {selectedItemForManual.currentOdometer != null && (
                        <button
                          type="button"
                          onClick={() => setManualBaseline(selectedItemForManual.currentOdometer.toString())}
                          className="text-[11px] text-[#1167c9] dark:text-blue-400 hover:underline font-bold"
                        >
                          العداد الحالي ({selectedItemForManual.currentOdometer.toLocaleString()} كم)
                        </button>
                      )}
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={manualBaseline}
                    onChange={(e) => setManualBaseline(e.target.value)}
                    placeholder="أدخل قراءة الأساس السابقة..."
                    className="font-mono text-sm"
                    required={requireBaselineInput}
                  />
                </div>
              )
            )}

            {/* Calculated Distance Preview */}
            {(() => {
              if (!manualOdometer || isNaN(parseFloat(manualOdometer))) return null;
              const odo = parseFloat(manualOdometer);
              const effectiveBase =
                applicableBaseline?.value ??
                (manualBaseline && !isNaN(parseFloat(manualBaseline)) ? parseFloat(manualBaseline) : null);

              if (effectiveBase != null) {
                const diff = odo - effectiveBase;
                if (diff >= 0) {
                  return (
                    <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between font-bold">
                      <span>المسافة اليدوية المحسوبة:</span>
                      <span className="font-mono text-base text-[#1167c9] dark:text-blue-400">
                        {diff.toFixed(2)} كم
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-purple-50/80 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-300">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span>المسافة اليدوية لليوم (تصحيح عداد):</span>
                      </div>
                      <span className="font-mono text-base text-purple-700 dark:text-purple-400">
                        0.00 كم
                      </span>
                    </div>
                  );
                }
              }
              return null;
            })()}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {selectedItemForManual.manualOdometerReading != null || (applicableBaseline && parseFloat(manualOdometer) < applicableBaseline.value)
                  ? "سبب التصحيح / ملاحظات تشغيلية"
                  : "ملاحظات تشغيلية (اختياري)"}
              </label>
              <Input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder={
                  applicableBaseline && parseFloat(manualOdometer) < applicableBaseline.value
                    ? "مثال: تصحيح قراءة عداد المركبة (Corrected vehicle odometer)..."
                    : selectedItemForManual.manualOdometerReading != null
                    ? "مثال: تصحيح قراءة خاطئة (Corrected incorrect reading)..."
                    : "أدخل أي ملاحظات حول قراءة العداد..."
                }
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedItemForManual(null);
                  setConcurrencyConflictNotice(null);
                  setApiErrorMessage(null);
                }}
                disabled={isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending || historyLoading || !manualOdometer.trim()}
                className="gap-2 bg-[#1167c9] hover:bg-blue-700 text-white font-bold"
              >
                {isPending || historyLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
                {selectedItemForManual.manualOdometerReading != null
                  ? "حفظ تصحيح العداد"
                  : "حفظ قراءة العداد"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Upload GPS Report (.xls / .xlsx / .htm / .html / .zip) */}
      <Modal
        isOpen={isGpsImportOpen}
        onClose={() => setIsGpsImportOpen(false)}
        title="رفع تقرير المسافات من نظام GPS"
      >
        <form onSubmit={handleGpsImportSubmit} className="space-y-4 pt-2 text-xs">
          <Card className="p-3 bg-blue-50 dark:bg-blue-950/40 border-blue-200 text-xs text-slate-800 dark:text-slate-200 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-[#1167c9]">
              <Info className="h-4 w-4" />
              تعليمات وصيغ ملف GPS المدعومة:
            </p>
            <ul className="text-[11px] leading-relaxed list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
              <li>ملفات Excel الحقيقية بصيغتي <strong>.xls</strong> و <strong>.xlsx</strong>.</li>
              <li>تقارير HTML المنزلة من نظام GPS بامتداد <strong>.xls</strong> أو <strong>.htm / .html</strong>.</li>
              <li>ملف <strong>ZIP</strong> مضغوط يحتوي على ملف التقرير ومجلد <strong>.files</strong> المرافق له في حال كانت البيانات مفصولة.</li>
              <li>التعرف التلقائي على الأرقام واللوحات العربية والإنجليزية والفارسية بمختلف التنسيقات.</li>
            </ul>
          </Card>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              تاريخ العمل المتوقع للتقرير <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="font-mono text-xs font-bold"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              اختر ملف التقرير (.xls / .xlsx / .htm / .html / .zip - أقصى 10MB) <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center bg-slate-50 dark:bg-slate-900/50 hover:border-[#1167c9] transition-colors">
              <FileSpreadsheet className="h-8 w-8 text-[#1167c9] mx-auto mb-2" />
              <input
                type="file"
                accept=".xls,.xlsx,.htm,.html,.zip"
                onChange={(e) => setGpsFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1167c9] file:text-white hover:file:bg-blue-700 cursor-pointer"
                required
              />
              {gpsFile && (
                <p className="mt-2 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  الملف المحدد: {gpsFile.name} ({(gpsFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          {/* Import Results Box */}
          {importResult && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block">صفوف مطابقة</span>
                  <span className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-400">
                    {importResult.matchedRows}
                  </span>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">غير مطابقة</span>
                  <span className="font-mono text-lg font-black text-amber-700 dark:text-amber-400">
                    {importResult.unmatchedRows}
                  </span>
                </div>

                <div className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200">
                  <span className="text-[10px] text-red-800 dark:text-red-300 font-bold block">غير صالحة</span>
                  <span className="font-mono text-lg font-black text-red-700 dark:text-red-400">
                    {importResult.invalidRows}
                  </span>
                </div>
              </div>

              {/* Download Problems Alert & Button */}
              {(importResult.errors?.length > 0 || importResult.unmatchedRows > 0 || importResult.invalidRows > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 dark:text-red-200">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                      <span>يوجد صفوف أو لوحات غير مقبولة في الملف</span>
                    </div>
                    <p className="text-[11px] text-red-700 dark:text-red-300">
                      يمكنك تحميل ملف Excel يحتوي على قائمة المشاكل واللوحات المرفوضة مع أرقام الصفوف وأسباب الرفض.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDownloadErrorsExcel}
                    className="gap-2 text-xs font-bold bg-white dark:bg-slate-900 border-red-300 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950 shadow-xs shrink-0"
                  >
                    <FileDown className="h-4 w-4 text-red-600" />
                    <span>تحميل المشاكل (Excel)</span>
                  </Button>
                </div>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="border rounded-xl p-3 bg-red-50/60 dark:bg-red-950/30 max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-red-900 dark:text-red-300 pb-1 border-b border-red-200/60">
                    <span>ملاحظات وشرائح الأخطاء أثناء الرفع ({importResult.errors.length}):</span>
                    <button
                      type="button"
                      onClick={handleDownloadErrorsExcel}
                      className="text-xs font-bold text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>تنزيل كملف Excel</span>
                    </button>
                  </div>
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-red-800 dark:text-red-200 border-b border-red-200/50 pb-1 last:border-none">
                      {err.rowNumber && <span className="font-mono font-bold">[صف {err.rowNumber}] </span>}
                      {err.plateNumber && <span className="font-bold">لوحة: {err.plateNumber} — </span>}
                      <span>{getGpsRowErrorMessage(err.errorCode) || err.message || err.errorCode}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsGpsImportOpen(false)}
              disabled={isUploading}
            >
              إغلاق
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !gpsFile}
              className="gap-2 bg-[#1167c9] hover:bg-blue-700 text-white font-bold"
            >
              {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              بدء معالجة الملف
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: GPS Import Logs History */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title="سجل عمليات رفع تقارير GPS"
      >
        <div className="space-y-4 pt-2 text-xs">
          {logsLoading ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#1167c9]" />
              <p className="text-xs text-[var(--muted)]">جاري تحميل سجل عمليات الرفع...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">لا توجد عمليات رفع مسجلة لليوم.</div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] rounded-xl border">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">اسم الملف</th>
                    <th className="p-2.5">تاريخ العمل</th>
                    <th className="p-2.5 text-center">الصفوف المطابقة</th>
                    <th className="p-2.5 text-center">غير مطابقة</th>
                    <th className="p-2.5 text-center">بواسطة</th>
                    <th className="p-2.5 text-center">وقت الرفع</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-2.5 font-mono font-bold text-[#1167c9] max-w-xs truncate">
                        {log.fileName}
                      </td>
                      <td className="p-2.5 font-mono">{log.workDate}</td>
                      <td className="p-2.5 text-center font-mono text-emerald-700 font-bold">
                        {log.matchedRows}
                      </td>
                      <td className="p-2.5 text-center font-mono text-amber-700">
                        {log.unmatchedRows}
                      </td>
                      <td className="p-2.5 text-center">{log.importedByUserName || "مستخدم النظام"}</td>
                      <td className="p-2.5 text-center font-mono text-[10px] text-slate-500">
                        {new Date(log.importedAtUtc).toLocaleString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={() => setIsLogsModalOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
