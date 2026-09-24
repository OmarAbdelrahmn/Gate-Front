"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAllVehicleAssignments, getAllVehicles } from "@/lib/fleet/api";
import {
  VehicleOperationalStatus,
  RiderVehicleAssignmentStatus,
  type VehicleSummaryResponse,
  type RiderVehicleAssignmentResponse,
} from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  TableHeaderColumnFilter,
  type FilterOption,
} from "@/app/admin/fleet/vehicles/components/TableHeaderFilter";
import {
  Key,
  Search,
  RefreshCw,
  Car,
  ArrowLeftRight,
  CalendarClock,
  ShieldCheck,
  X,
  FileSpreadsheet,
  FileUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import { TakeVehicleModal } from "./components/TakeVehicleModal";
import { ReturnVehicleModal } from "./components/ReturnVehicleModal";
import { SwitchVehicleModal } from "./components/SwitchVehicleModal";
import { RenewPermissionModal } from "./components/RenewPermissionModal";
import { AttachPromissoryFilesModal } from "./components/AttachPromissoryFilesModal";

function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove tashkeel/diacritics
    .replace(/\u0640/g, "") // remove tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

type ActiveModal = "take" | "return" | "switch" | "renew" | "promissory" | null;

export default function AssignmentsPage() {
  const { can } = useAuth();
  const [assignments, setAssignments] = useState<RiderVehicleAssignmentResponse[]>([]);
  const [vehicles, setVehicles] = useState<VehicleSummaryResponse[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Map<string, VehicleSummaryResponse>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"assigned" | "available">("assigned");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<"active" | "all" | "completed">("active");

  const [cityFilter, setCityFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummaryResponse | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, vehiclesRes] = await Promise.all([
        getAllVehicleAssignments().catch((err) => {
          console.error("Failed to load vehicle assignments:", err);
          return [] as RiderVehicleAssignmentResponse[];
        }),
        getAllVehicles().catch((err) => {
          console.error("Failed to load vehicles:", err);
          return [] as VehicleSummaryResponse[];
        }),
      ]);

      console.log("[Vehicle Assignments API Response]:", assignmentsRes);
      setAssignments(assignmentsRes || []);
      setVehicles(vehiclesRes || []);

      const vMap = new Map<string, VehicleSummaryResponse>();
      for (const v of vehiclesRes || []) {
        if (v.id) vMap.set(v.id, v);
      }
      setVehiclesMap(vMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Helper to open modal for an assignment
  const openModalForAssignment = (type: ActiveModal, assignment: RiderVehicleAssignmentResponse) => {
    const vehicle = vehiclesMap.get(assignment.vehicleId);
    const vehicleForModal: VehicleSummaryResponse = vehicle
      ? {
          ...vehicle,
          currentAssignmentId: assignment.id,
          currentRiderProfileId: assignment.riderProfileId,
          currentRiderName: assignment.riderName,
          isRealRider: assignment.isRealRider,
          realRider: assignment.realRider,
          permitEndDate: assignment.permissionEndsOn || vehicle.permitEndDate,
          rowVersion: assignment.rowVersion || vehicle.rowVersion,
        }
      : {
          id: assignment.vehicleId,
          assetNumber: assignment.assetNumber,
          serialNumber: assignment.assetNumber,
          currentAssignmentId: assignment.id,
          currentRiderProfileId: assignment.riderProfileId,
          currentRiderName: assignment.riderName,
          isRealRider: assignment.isRealRider,
          realRider: assignment.realRider,
          permitEndDate: assignment.permissionEndsOn,
          currentOdometer: assignment.startOdometer,
          operatingCity: assignment.vehicleOperatingCityNameAr,
          operatingCityId: assignment.vehicleOperatingCityId,
          status: VehicleOperationalStatus.Assigned,
          vehicleType: 1 as any,
          registrationType: 1 as any,
          isReadyForAssignment: false,
          rowVersion: assignment.rowVersion,
        };

    setSelectedVehicle(vehicleForModal);
    setActiveModal(type);
  };

  // Helper to open modal for an available vehicle
  const openModalForVehicle = (type: ActiveModal, vehicle: VehicleSummaryResponse | null = null) => {
    setSelectedVehicle(vehicle);
    setActiveModal(type);
  };

  const handleModalSuccess = () => {
    setActiveModal(null);
    setSelectedVehicle(null);
    loadData();
  };

  // Sort assignments newest first
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const timeA = a.startedAtUtc ? new Date(a.startedAtUtc).getTime() : 0;
      const timeB = b.startedAtUtc ? new Date(b.startedAtUtc).getTime() : 0;
      return timeB - timeA;
    });
  }, [assignments]);

  // Available vehicles list
  const availableVehicles = useMemo(() => {
    return vehicles.filter((v) => v.isReadyForAssignment && v.status === VehicleOperationalStatus.Available);
  }, [vehicles]);

  // Counts
  const activeAssignmentsCount = useMemo(() => {
    return assignments.filter(
      (a) => a.status === RiderVehicleAssignmentStatus.Active || a.status === 1 || (!a.endedAtUtc && a.status !== 2)
    ).length;
  }, [assignments]);

  const completedAssignmentsCount = useMemo(() => {
    return assignments.filter(
      (a) => a.status === RiderVehicleAssignmentStatus.Completed || a.status === 2 || Boolean(a.endedAtUtc)
    ).length;
  }, [assignments]);

  // Operating City Options for Table Header Filter
  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();

    if (filterType === "assigned") {
      for (const a of assignments) {
        const v = vehiclesMap.get(a.vehicleId);
        const city = (a.vehicleOperatingCityNameAr || v?.operatingCity || "").trim();
        if (city) {
          counts.set(city, (counts.get(city) || 0) + 1);
        }
      }
    } else {
      for (const v of availableVehicles) {
        const city = (v.operatingCity || "").trim();
        if (city) {
          counts.set(city, (counts.get(city) || 0) + 1);
        }
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];
    const sortedCities = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

    for (const [city, count] of sortedCities) {
      opts.push({
        value: city,
        label: city,
        sublabel: `${count} مركبة`,
        count,
      });
    }

    if (cityFilter && !opts.some((o) => o.value === cityFilter)) {
      opts.push({
        value: cityFilter,
        label: cityFilter,
      });
    }

    return opts;
  }, [filterType, assignments, availableVehicles, vehiclesMap, cityFilter]);

  // Vehicle Manufacturer / Model Options for Table Header Filter
  const manufacturerOptions = useMemo(() => {
    const mfgMap = new Map<string, { count: number; models: Map<string, number> }>();

    const targetVehicles =
      filterType === "assigned"
        ? assignments
            .map((a) => vehiclesMap.get(a.vehicleId))
            .filter((v): v is VehicleSummaryResponse => Boolean(v))
        : availableVehicles;

    for (const v of targetVehicles) {
      const mfg = (v.manufacturer || "").trim();
      const mdl = (v.model || "").trim();
      if (!mfg && !mdl) continue;

      const mainKey = mfg || mdl;
      const existing = mfgMap.get(mainKey);
      if (existing) {
        existing.count += 1;
        if (mdl && mdl !== mainKey) {
          existing.models.set(mdl, (existing.models.get(mdl) || 0) + 1);
        }
      } else {
        const models = new Map<string, number>();
        if (mdl && mdl !== mainKey) {
          models.set(mdl, 1);
        }
        mfgMap.set(mainKey, { count: 1, models });
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];
    const sortedMfgs = Array.from(mfgMap.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [mfg, info] of sortedMfgs) {
      if (info.models.size > 1) {
        opts.push({
          value: mfg,
          label: `${mfg} (الكل)`,
          sublabel: `${info.count} مركبة`,
          count: info.count,
        });

        const sortedModels = Array.from(info.models.entries()).sort((a, b) => b[1] - a[1]);
        for (const [mdl, mdlCount] of sortedModels) {
          const combined = `${mfg} ${mdl}`;
          opts.push({
            value: combined,
            label: `— ${combined}`,
            sublabel: `${mdlCount} مركبة`,
            count: mdlCount,
          });
        }
      } else {
        const mdl = Array.from(info.models.keys())[0];
        const label = mdl ? `${mfg} ${mdl}` : mfg;
        opts.push({
          value: label,
          label: label,
          sublabel: `${info.count} مركبة`,
          count: info.count,
        });
      }
    }

    if (manufacturerFilter && !opts.some((o) => o.value === manufacturerFilter)) {
      opts.push({
        value: manufacturerFilter,
        label: manufacturerFilter,
      });
    }

    return opts;
  }, [filterType, assignments, availableVehicles, vehiclesMap, manufacturerFilter]);

  // Filtered assigned data
  const filteredAssignedData = useMemo(() => {
    const queryTokens = search.trim() ? normalizeText(search).split(/\s+/).filter(Boolean) : [];

    return sortedAssignments.filter((item) => {
      // 0. Status Filter (active vs completed vs all)
      const isCompleted =
        item.status === RiderVehicleAssignmentStatus.Completed ||
        item.status === 2 ||
        Boolean(item.endedAtUtc);
      const isActive = !isCompleted;

      if (assignmentStatusFilter === "active" && !isActive) return false;
      if (assignmentStatusFilter === "completed" && !isCompleted) return false;

      const vehicle = vehiclesMap.get(item.vehicleId);

      // 1. Search Query across assignment and vehicle fields
      if (queryTokens.length > 0) {
        const parts = [
          item.assetNumber,
          item.riderName,
          item.riderIqamaNo,
          item.employeeId,
          item.permissionReference,
          item.assignmentReason,
          item.vehicleOperatingCityNameAr,
          item.realRider?.name,
          item.realRider?.iqamaNo,
          vehicle?.serialNumber,
          vehicle?.assetNumber,
          vehicle?.chassisNumber,
          vehicle?.plateNumberAr,
          vehicle?.plateNumberEn,
          vehicle?.plateLettersAr,
          vehicle?.plateLettersEn,
          vehicle?.plateDigits,
          vehicle?.manufacturer,
          vehicle?.model,
          vehicle?.operatingCity,
        ];

        const searchableText = parts
          .filter(Boolean)
          .map((p) => normalizeText(String(p)))
          .join(" ");

        const matchesSearch = queryTokens.every((token) => searchableText.includes(token));
        if (!matchesSearch) return false;
      }

      // 2. Operating City Filter
      if (cityFilter) {
        const city = item.vehicleOperatingCityNameAr || vehicle?.operatingCity || "";
        if (!city || normalizeText(city) !== normalizeText(cityFilter)) {
          return false;
        }
      }

      // 3. Manufacturer / Model Filter
      if (manufacturerFilter) {
        const normFilter = normalizeText(manufacturerFilter.replace(/^—\s*/, ""));
        const itemMfg = normalizeText(vehicle?.manufacturer);
        const itemMdl = normalizeText(vehicle?.model);
        const itemCombined = normalizeText([vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(" "));

        const matchesCombined = itemCombined.includes(normFilter);
        const matchesMfg = itemMfg ? itemMfg.includes(normFilter) || normFilter.includes(itemMfg) : false;
        const matchesMdl = itemMdl ? itemMdl.includes(normFilter) || normFilter.includes(itemMdl) : false;

        if (!matchesCombined && !matchesMfg && !matchesMdl) {
          return false;
        }
      }

      return true;
    });
  }, [sortedAssignments, vehiclesMap, search, assignmentStatusFilter, cityFilter, manufacturerFilter]);

  // Filtered available data
  const filteredAvailableData = useMemo(() => {
    const queryTokens = search.trim() ? normalizeText(search).split(/\s+/).filter(Boolean) : [];

    return availableVehicles.filter((item) => {
      if (queryTokens.length > 0) {
        const parts = [
          item.serialNumber,
          item.assetNumber,
          item.chassisNumber,
          item.plateNumberAr,
          item.plateNumberEn,
          item.plateLettersAr,
          item.plateLettersEn,
          item.plateDigits,
          item.manufacturer,
          item.model,
          item.operatingCity,
        ];

        const searchableText = parts
          .filter(Boolean)
          .map((p) => normalizeText(String(p)))
          .join(" ");

        const matchesSearch = queryTokens.every((token) => searchableText.includes(token));
        if (!matchesSearch) return false;
      }

      if (cityFilter) {
        if (!item.operatingCity || normalizeText(item.operatingCity) !== normalizeText(cityFilter)) {
          return false;
        }
      }

      if (manufacturerFilter) {
        const normFilter = normalizeText(manufacturerFilter.replace(/^—\s*/, ""));
        const itemMfg = normalizeText(item.manufacturer);
        const itemMdl = normalizeText(item.model);
        const itemCombined = normalizeText([item.manufacturer, item.model].filter(Boolean).join(" "));

        const matchesCombined = itemCombined.includes(normFilter);
        const matchesMfg = itemMfg ? itemMfg.includes(normFilter) || normFilter.includes(itemMfg) : false;
        const matchesMdl = itemMdl ? itemMdl.includes(normFilter) || normFilter.includes(itemMdl) : false;

        if (!matchesCombined && !matchesMfg && !matchesMdl) {
          return false;
        }
      }

      return true;
    });
  }, [availableVehicles, search, cityFilter, manufacturerFilter]);

  const hasActiveFilters = Boolean(cityFilter || manufacturerFilter);
  const isFiltered = Boolean(search.trim() || hasActiveFilters);

  const handleExportExcel = async () => {
    if (filterType === "assigned") {
      if (filteredAssignedData.length === 0) return;
      setExporting(true);
      try {
        await exportToExcel({
          filename: `vehicle-assignments-${new Date().toISOString().split("T")[0]}`,
          sheetName: "تعيينات المركبات",
          data: filteredAssignedData,
          columns: [
            { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
            {
              header: "اللوحة (عربي)",
              accessor: (item) => vehiclesMap.get(item.vehicleId)?.plateNumberAr || "—",
              width: 16,
              isText: true,
            },
            {
              header: "اللوحة (إنجليزي)",
              accessor: (item) => vehiclesMap.get(item.vehicleId)?.plateNumberEn || "—",
              width: 16,
              isText: true,
            },
            {
              header: "المركبة والموديل",
              accessor: (item) => {
                const v = vehiclesMap.get(item.vehicleId);
                return [v?.manufacturer, v?.model].filter(Boolean).join(" ") || item.assetNumber || "—";
              },
              width: 22,
            },
            {
              header: "الرقم التسلسلي / الأصل",
              accessor: (item) => vehiclesMap.get(item.vehicleId)?.serialNumber || item.assetNumber || "—",
              width: 18,
              isText: true,
            },
            {
              header: "المدينة التشغيلية",
              accessor: (item) => item.vehicleOperatingCityNameAr || vehiclesMap.get(item.vehicleId)?.operatingCity || "—",
              width: 16,
            },
            {
              header: "المندوب المنسوب",
              accessor: (item) => item.riderName || "—",
              width: 24,
            },
            {
              header: "هوية المندوب",
              accessor: (item) => item.riderIqamaNo || "—",
              width: 18,
              isText: true,
            },
            {
              header: "المندوب الفعلي",
              accessor: (item) => item.realRider?.name || "نفس المندوب",
              width: 22,
            },
            {
              header: "هوية المندوب الفعلي",
              accessor: (item) => item.realRider?.iqamaNo || "—",
              width: 20,
              isText: true,
            },
            {
              header: "صلة القرابة",
              accessor: (item) => item.realRider?.relationshipToAssignedRider || "—",
              width: 16,
            },
            {
              header: "انتهاء التفويض",
              accessor: (item) => (item.permissionEndsOn ? item.permissionEndsOn.split("T")[0] : "—"),
              width: 16,
            },
            {
              header: "عداد البداية (كم)",
              accessor: (item) => item.startOdometer ?? "—",
              width: 16,
            },
            {
              header: "عداد النهاية (كم)",
              accessor: (item) => item.endOdometer ?? "—",
              width: 16,
            },
            {
              header: "حالة التعيين",
              accessor: (item) => (item.status === 1 || !item.endedAtUtc ? "نشط" : "منتهي"),
              width: 14,
            },
          ],
        });
      } catch (err) {
        console.error("Export assignments error:", err);
      } finally {
        setExporting(false);
      }
    } else {
      if (filteredAvailableData.length === 0) return;
      setExporting(true);
      try {
        await exportToExcel({
          filename: `available-vehicles-${new Date().toISOString().split("T")[0]}`,
          sheetName: "المركبات المتاحة",
          data: filteredAvailableData,
          columns: [
            { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
            { header: "اللوحة (عربي)", accessor: (item) => item.plateNumberAr || "—", width: 16, isText: true },
            { header: "اللوحة (إنجليزي)", accessor: (item) => item.plateNumberEn || "—", width: 16, isText: true },
            { header: "المركبة والموديل", accessor: (item) => [item.manufacturer, item.model].filter(Boolean).join(" ") || "—", width: 22 },
            { header: "الرقم التسلسلي", accessor: (item) => item.serialNumber || "—", width: 18, isText: true },
            { header: "المدينة التشغيلية", accessor: (item) => item.operatingCity || "—", width: 16 },
            { header: "العداد الحالي", accessor: (item) => item.currentOdometer ?? "—", width: 14 },
            { header: "حالة المركبة", accessor: () => "متاح للتسليم", width: 16 },
          ],
        });
      } catch (err) {
        console.error("Export available vehicles error:", err);
      } finally {
        setExporting(false);
      }
    }
  };

  const currentCount = filterType === "assigned" ? filteredAssignedData.length : filteredAvailableData.length;
  const totalCount = filterType === "assigned" ? assignments.length : availableVehicles.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Key className="h-7 w-7 text-[#1167c9]" />
            مركز تعيينات المركبات
            {!loading && totalCount > 0 && (
              <span className="text-sm font-normal text-slate-500 mr-2">
                ({isFiltered ? `${currentCount} من ${totalCount}` : `${totalCount}`} {filterType === "assigned" ? "تعيين" : "مركبة متاحة"})
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة تسليم واستلام وتبديل المركبات للمناديب ومتابعة العهد
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            loading={exporting}
            disabled={exporting || loading || currentCount === 0}
            className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
          >
            <FileSpreadsheet size={16} />
            تصدير إكسل
          </Button>
          {can("fleet.assignments.manage") && (
            <div className="flex gap-2">
              <Button onClick={() => openModalForVehicle("take")} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Key className="h-4 w-4" /> تسليم مركبة
              </Button>
              <Button onClick={() => openModalForVehicle("return")} variant="secondary" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" /> استلام مركبة
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filterType === "assigned" ? "primary" : "secondary"}
              className={filterType === "assigned" ? "bg-[#1167c9] hover:bg-[#0e56a8]" : ""}
              onClick={() => setFilterType("assigned")}
            >
              المركبات المسلمة
              {activeAssignmentsCount > 0 && (
                <span className="mr-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-white/20 text-white">
                  {activeAssignmentsCount}
                </span>
              )}
            </Button>
            <Button
              variant={filterType === "available" ? "primary" : "secondary"}
              className={filterType === "available" ? "bg-[#1167c9] hover:bg-[#0e56a8]" : ""}
              onClick={() => setFilterType("available")}
            >
              المركبات المتاحة
              {availableVehicles.length > 0 && (
                <span className="mr-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {availableVehicles.length}
                </span>
              )}
            </Button>
          </div>

          <form onSubmit={handleSearch} className="flex min-w-[280px] sm:min-w-[340px] flex-1 max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم المندوب، الهوية، اللوحة، أو الأصل..."
                className="pr-10 pl-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="مسح البحث"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="button" variant="secondary" onClick={loadData} disabled={loading} className="px-3" title="تحديث البيانات">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </form>
        </div>

        {filterType === "assigned" && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-[var(--muted)] font-medium">حالة التعيين:</span>
            <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--surface)] text-xs">
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter("active")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  assignmentStatusFilter === "active"
                    ? "bg-[#1167c9] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                النشطة ({activeAssignmentsCount})
              </button>
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter("completed")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  assignmentStatusFilter === "completed"
                    ? "bg-[#1167c9] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                المنتهية ({completedAssignmentsCount})
              </button>
              <button
                type="button"
                onClick={() => setAssignmentStatusFilter("all")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  assignmentStatusFilter === "all"
                    ? "bg-[#1167c9] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                الكل ({assignments.length})
              </button>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-xs text-[var(--muted)]">التصفيات النشطة:</span>
            {manufacturerFilter && (
              <Badge className="bg-blue-50 text-[#1167c9] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 gap-1 pl-1.5 font-medium">
                الصانع / الموديل: {manufacturerFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setManufacturerFilter("")} />
              </Badge>
            )}
            {cityFilter && (
              <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 gap-1 pl-1.5 font-medium">
                المدينة: {cityFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setCityFilter("")} />
              </Badge>
            )}
            <button
              type="button"
              onClick={() => {
                setCityFilter("");
                setManufacturerFilter("");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold underline cursor-pointer mr-1"
            >
              مسح التصفيات
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : filterType === "assigned" ? (
          filteredAssignedData.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)]">
              <Key className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-lg font-bold">لا توجد تعيينات مطابقة</p>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  className="mt-4 gap-1 text-xs px-3 py-1.5"
                  onClick={() => {
                    setCityFilter("");
                    setManufacturerFilter("");
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> مسح التصفية
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span>المركبة (الرقم التسلسلي)</span>
                        <TableHeaderColumnFilter
                          label="الصانع / الموديل"
                          value={manufacturerFilter}
                          onChange={setManufacturerFilter}
                          options={manufacturerOptions}
                          placeholder="تصفية بالصانع أو الموديل..."
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">اللوحة</th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span>مدينة التشغيل</span>
                        <TableHeaderColumnFilter
                          label="مدينة التشغيل"
                          value={cityFilter}
                          onChange={setCityFilter}
                          options={cityOptions}
                          placeholder="تصفية بالمدينة..."
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">المندوب المنسوب</th>
                    <th className="px-6 py-4">المندوب الفعلي</th>
                    <th className="px-6 py-4">انتهاء التفويض</th>
                    <th className="px-6 py-4">العداد (كم)</th>
                    <th className="px-6 py-4 text-center">حالة التعيين</th>
                    {can("fleet.assignments.manage") && <th className="px-6 py-4 text-center">الإجراءات السريعة</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredAssignedData.map((item) => {
                    const vehicle = vehiclesMap.get(item.vehicleId);
                    const isCompleted =
                      item.status === RiderVehicleAssignmentStatus.Completed ||
                      item.status === 2 ||
                      Boolean(item.endedAtUtc);
                    const isActive = !isCompleted;

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                          <Link
                            href={`/admin/fleet/vehicles/${item.vehicleId}`}
                            className="font-bold font-mono text-[#1167c9] hover:underline"
                          >
                            {vehicle?.serialNumber || item.assetNumber || "—"}
                          </Link>
                          <div className="text-xs text-[var(--muted)]">
                            {[vehicle?.manufacturer, vehicle?.model].filter(Boolean).join(" ") || `أصل: ${item.assetNumber}`}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold border border-slate-300 rounded px-2 py-0.5 w-fit bg-white dark:bg-slate-900 shadow-sm">
                            {vehicle?.plateNumberAr || item.assetNumber || "بدون لوحة"}
                          </div>
                          {vehicle?.plateNumberEn && (
                            <div className="text-[11px] text-[var(--muted)] font-mono mt-0.5">
                              {vehicle.plateNumberEn}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                          {item.vehicleOperatingCityNameAr || vehicle?.operatingCity || "—"}
                        </td>
                        <td className="px-6 py-4">
                          {item.employeeId ? (
                            <Link
                              href={`/admin/employees/${item.employeeId}`}
                              className="font-bold text-[#1167c9] hover:underline block"
                            >
                              {item.riderName || "—"}
                            </Link>
                          ) : (
                            <div className="font-bold">{item.riderName || "—"}</div>
                          )}
                          {item.riderIqamaNo && (
                            <div className="text-xs font-mono text-slate-500">
                              إقامة: {item.riderIqamaNo}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const isNotReal = item.isRealRider === false || String(item.isRealRider) === "false";
                            const realRiderObj = item.realRider;

                            if ((isNotReal || realRiderObj) && realRiderObj && (realRiderObj.name || realRiderObj.iqamaNo)) {
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-purple-700 dark:text-purple-300">
                                      {realRiderObj.name || "—"}
                                    </span>
                                    {realRiderObj.relationshipToAssignedRider && (
                                      <span className="inline-block rounded-md bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                                        {realRiderObj.relationshipToAssignedRider}
                                      </span>
                                    )}
                                  </div>
                                  {realRiderObj.iqamaNo && (
                                    <div className="text-xs font-mono text-purple-600/90 dark:text-purple-400 font-medium">
                                      إقامة: {realRiderObj.iqamaNo}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
                                نفس المندوب المنسوب
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <div>
                            {item.permissionEndsOn
                              ? item.permissionEndsOn.split("T")[0]
                              : item.permitEndDate
                              ? item.permitEndDate.split("T")[0]
                              : "—"}
                          </div>
                          {item.permissionReference && (
                            <div className="text-[11px] text-[var(--muted)] font-mono">
                              مرجع: {item.permissionReference}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <div>{(vehicle?.currentOdometer ?? item.startOdometer ?? 0).toLocaleString()}</div>
                          {item.endOdometer != null && (
                            <div className="text-[11px] text-[var(--muted)] font-mono">
                              النهاية: {item.endOdometer.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isActive ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs">
                              نشط
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-xs">
                              منتهي
                            </Badge>
                          )}
                        </td>

                        {can("fleet.assignments.manage") && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isActive ? (
                                <>
                                  <button
                                    onClick={() => openModalForAssignment("return", item)}
                                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 bg-red-50/50 dark:bg-red-950/30 dark:hover:bg-red-900/50 transition-colors"
                                    title="استلام (إرجاع) المركبة"
                                  >
                                    <ArrowLeftRight className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openModalForAssignment("switch", item)}
                                    className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 bg-blue-50/50 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 transition-colors"
                                    title="تبديل المركبة"
                                  >
                                    <Car className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openModalForAssignment("renew", item)}
                                    className="rounded-lg p-2 text-orange-600 hover:bg-orange-50 bg-orange-50/50 dark:bg-orange-950/30 dark:hover:bg-orange-900/50 transition-colors"
                                    title="تجديد التفويض"
                                  >
                                    <CalendarClock className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openModalForAssignment("promissory", item)}
                                    className="rounded-lg p-2 text-violet-600 hover:bg-violet-50 bg-violet-50/50 dark:bg-violet-950/30 dark:hover:bg-violet-900/50 transition-colors"
                                    title="إرفاق سندات الأمر بالعهدة الحالية"
                                    aria-label="إرفاق سندات الأمر بالعهدة الحالية"
                                  >
                                    <FileUp className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Available Vehicles Table */
          filteredAvailableData.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)]">
              <Key className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-lg font-bold">لا توجد مركبات متاحة جاهزة للتسليم</p>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  className="mt-4 gap-1 text-xs px-3 py-1.5"
                  onClick={() => {
                    setCityFilter("");
                    setManufacturerFilter("");
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> مسح التصفية
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span>المركبة (الرقم التسلسلي)</span>
                        <TableHeaderColumnFilter
                          label="الصانع / الموديل"
                          value={manufacturerFilter}
                          onChange={setManufacturerFilter}
                          options={manufacturerOptions}
                          placeholder="تصفية بالصانع أو الموديل..."
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">اللوحة</th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span>مدينة التشغيل</span>
                        <TableHeaderColumnFilter
                          label="مدينة التشغيل"
                          value={cityFilter}
                          onChange={setCityFilter}
                          options={cityOptions}
                          placeholder="تصفية بالمدينة..."
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">العداد الحالي (كم)</th>
                    <th className="px-6 py-4 text-center">حالة الجاهزية</th>
                    {can("fleet.assignments.manage") && <th className="px-6 py-4 text-center">الإجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredAvailableData.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/fleet/vehicles/${item.id}`}
                          className="font-bold font-mono text-[#1167c9] hover:underline"
                        >
                          {item.serialNumber || item.assetNumber || "—"}
                        </Link>
                        <div className="text-xs text-[var(--muted)]">{item.manufacturer} {item.model}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold border border-slate-300 rounded px-2 py-0.5 w-fit bg-white dark:bg-slate-900 shadow-sm">
                          {item.plateNumberAr || "بدون لوحة"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                        {item.operatingCity || "—"}
                      </td>
                      <td className="px-6 py-4 font-mono">{item.currentOdometer.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs">
                          جاهزة للتسليم
                        </Badge>
                      </td>
                      {can("fleet.assignments.manage") && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openModalForVehicle("take", item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                            title="تسليم هذه المركبة لمندوب"
                          >
                            <Key className="h-3.5 w-3.5" />
                            تسليم مركبة
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <TakeVehicleModal isOpen={activeModal === "take"} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} preselectedVehicle={selectedVehicle} />
      <ReturnVehicleModal isOpen={activeModal === "return"} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} preselectedVehicle={selectedVehicle} />
      <SwitchVehicleModal isOpen={activeModal === "switch"} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} preselectedVehicle={selectedVehicle} />
      <RenewPermissionModal isOpen={activeModal === "renew"} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} preselectedVehicle={selectedVehicle} />
      {activeModal === "promissory" && (
        <AttachPromissoryFilesModal key={selectedVehicle?.currentAssignmentId} isOpen onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} vehicle={selectedVehicle} />
      )}
    </div>
  );
}
