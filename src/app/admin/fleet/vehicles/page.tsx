"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicles } from "@/lib/fleet/api";
import { VehicleOperationalStatus, VehicleRegistrationType, type VehicleSummaryResponse } from "@/lib/fleet/types";
import { formatVehicleType, formatVehicleRegistrationType } from "@/lib/fleet/formatters";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Car, Search, Plus, RefreshCw, AlertTriangle, ChevronRight, Filter, X, FileSpreadsheet } from "lucide-react";
import { VehicleUpsertModal } from "./components/VehicleUpsertModal";
import { exportToExcel } from "@/lib/export-excel";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import {
  TableHeaderColumnFilter,
  TableHeaderCitySponsorFilter,
  type FilterOption,
} from "./components/TableHeaderFilter";

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
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)); // normalize eastern arabic numbers to 0-9
}

function getStatusArabicText(status: VehicleOperationalStatus): string {
  switch (status) {
    case VehicleOperationalStatus.Available:
      return "متاح Available";
    case VehicleOperationalStatus.Assigned:
      return "معين معيّن مستخدم Assigned";
    case VehicleOperationalStatus.ProblemHold:
      return "إيقاف ايقاف مشكلة ProblemHold";
    case VehicleOperationalStatus.AccidentHold:
      return "إيقاف ايقاف حادث AccidentHold";
    case VehicleOperationalStatus.Stolen:
      return "مسروق Stolen";
    case VehicleOperationalStatus.OutOfService:
      return "خارج الخدمة OutOfService";
    case VehicleOperationalStatus.Decommissioned:
      return "مستبعد Decommissioned";
    default:
      return String(status);
  }
}

function getRegistrationTypeSearchText(reg: VehicleRegistrationType): string {
  switch (Number(reg)) {
    case VehicleRegistrationType.PublicTransport:
      return "نقل عام عامة Public Transport PublicTransport";
    case VehicleRegistrationType.PrivateTransport:
      return "نقل خاص خاصة Private Transport PrivateTransport";
    case VehicleRegistrationType.Private:
      return "خصوصي Private";
    case VehicleRegistrationType.Taxi:
      return "أجرة اجره Taxi";
    case VehicleRegistrationType.SmallBus:
      return "حافلة صغيرة باص صغير SmallBus";
    case VehicleRegistrationType.PublicBus:
      return "حافلة عامة باص عام PublicBus";
    case VehicleRegistrationType.Motorcycle:
      return "دراجة آلية دراجة نارية دباب سيكل Motorcycle";
    case VehicleRegistrationType.PublicWorks:
      return "أشغال عامة اشغال عامة معدات PublicWorks";
    default:
      return String(reg);
  }
}

function getVehicleSearchableText(item: VehicleSummaryResponse): string {
  const parts: (string | number | null | undefined)[] = [
    item.plateNumberAr,
    item.plateNumberEn,
    item.plateLettersAr,
    item.plateLettersEn,
    item.plateDigits,
    item.plateNumberAr ? item.plateNumberAr.replace(/\s+/g, "") : "",
    item.plateNumberEn ? item.plateNumberEn.replace(/\s+/g, "") : "",
    !item.plateNumberAr ? "بدون لوحة" : "",
    item.serialNumber,
    item.assetNumber,
    item.chassisNumber,
    item.manufacturer,
    item.model,
    formatVehicleType(item.vehicleType),
    formatVehicleRegistrationType(item.registrationType),
    getRegistrationTypeSearchText(item.registrationType),
    getStatusArabicText(item.status),
    !item.isReadyForAssignment && item.status === VehicleOperationalStatus.Available ? "غير جاهزة للتسليم" : "",
    item.operatingCity,
    item.sponsorName,
    item.currentRiderName,
    item.actualRider?.actualRiderName,
    item.actualRider?.actualRiderIqamaNo,
    item.currentOdometer,
    item.currentOdometer ? `${item.currentOdometer} كم` : "",
  ];

  return parts
    .filter(Boolean)
    .map((p) => normalizeText(String(p)))
    .join(" ");
}

export default function VehiclesPage() {
  const { can } = useAuth();
  const [allVehicles, setAllVehicles] = useState<VehicleSummaryResponse[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [registryFilter, setRegistryFilter] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const VEHICLES_FILTERS_SESSION_KEY = "admin_fleet_vehicles_filters_session";
  const [isRestored, setIsRestored] = useState(false);

  // Restore filters on mount for the current session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(VEHICLES_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.search === "string" && parsed.search) setSearch(parsed.search);
        if (typeof parsed.statusFilter === "string" && parsed.statusFilter) setStatusFilter(parsed.statusFilter);
        if (typeof parsed.registryFilter === "string" && parsed.registryFilter) setRegistryFilter(parsed.registryFilter);
        if (typeof parsed.registrationFilter === "string" && parsed.registrationFilter) setRegistrationFilter(parsed.registrationFilter);
        if (typeof parsed.modelFilter === "string" && parsed.modelFilter) setModelFilter(parsed.modelFilter);
        if (typeof parsed.cityFilter === "string" && parsed.cityFilter) setCityFilter(parsed.cityFilter);
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
      if (search || statusFilter || registryFilter || registrationFilter || modelFilter || cityFilter) {
        sessionStorage.setItem(
          VEHICLES_FILTERS_SESSION_KEY,
          JSON.stringify({
            search,
            statusFilter,
            registryFilter,
            registrationFilter,
            modelFilter,
            cityFilter,
          })
        );
      } else {
        sessionStorage.removeItem(VEHICLES_FILTERS_SESSION_KEY);
      }
    } catch {
      // ignore sessionStorage errors
    }
  }, [isRestored, search, statusFilter, registryFilter, registrationFilter, modelFilter, cityFilter]);

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("");
    setRegistryFilter("");
    setRegistrationFilter("");
    setModelFilter("");
    setCityFilter("");
    try {
      sessionStorage.removeItem(VEHICLES_FILTERS_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const [isUpsertOpen, setIsUpsertOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [firstRes, sponsorsData] = await Promise.all([
        getVehicles({
          page: 1,
          pageSize: 200,
        }),
        listSponsors().catch((err) => {
          console.warn("Failed to load sponsors list:", err);
          return [] as Sponsor[];
        }),
      ]);

      if (sponsorsData) {
        setSponsors(sponsorsData);
      }

      let allItems = firstRes?.items || [];
      const totalCount = firstRes?.totalCount ?? allItems.length;

      // The backend clamps pageSize to 200. If totalCount exceeds 200, fetch remaining pages concurrently to display all vehicles.
      if (totalCount > allItems.length) {
        const pageSize = firstRes.pageSize || 200;
        const totalPages = Math.ceil(totalCount / pageSize);
        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(
            getVehicles({
              page: p,
              pageSize,
            })
          );
        }
        const remainingResults = await Promise.all(pagePromises);
        for (const r of remainingResults) {
          if (r?.items) {
            allItems = allItems.concat(r.items);
          }
        }
      }

      setAllVehicles(allItems);
    } catch (e: any) {
      console.warn("Failed to load vehicles data:", e);
      setError(e?.message || "تعذر جلب بيانات المركبات من الخادم.");
      setAllVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const registryOptions = useMemo(() => {
    const opts: { value: string; label: string; sublabel?: string }[] = [
      { value: "", label: "الكل" },
    ];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const s of sponsors) {
      if (!s.id || seenIds.has(s.id)) continue;
      seenIds.add(s.id);
      if (s.registryNameAr) seenNames.add(normalizeText(s.registryNameAr));
      if (s.registryNameEn) seenNames.add(normalizeText(s.registryNameEn));

      opts.push({
        value: s.id,
        label: s.registryNameAr,
        sublabel: s.commercialRegistrationNumber
          ? `سجل: ${s.commercialRegistrationNumber}`
          : (s.registryNameEn || undefined),
      });
    }

    // Also include any sponsors present on vehicles if not in sponsors API
    for (const v of allVehicles) {
      if (v.sponsorId && !seenIds.has(v.sponsorId)) {
        seenIds.add(v.sponsorId);
        if (v.sponsorName) seenNames.add(normalizeText(v.sponsorName));
        opts.push({
          value: v.sponsorId,
          label: v.sponsorName || v.sponsorId,
        });
      } else if (!v.sponsorId && v.sponsorName && !seenNames.has(normalizeText(v.sponsorName))) {
        seenNames.add(normalizeText(v.sponsorName));
        opts.push({
          value: v.sponsorName,
          label: v.sponsorName,
        });
      }
    }

    // Preserve restored value if sponsors is still loading
    if (registryFilter && !opts.some((o) => o.value === registryFilter)) {
      opts.push({
        value: registryFilter,
        label: registryFilter,
      });
    }

    return opts;
  }, [sponsors, allVehicles, registryFilter]);

  const registrationTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const v of allVehicles) {
      if (v.registrationType !== undefined && v.registrationType !== null) {
        const key = String(v.registrationType);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }

    const opts: { value: string; label: string; sublabel?: string }[] = [
      { value: "", label: "الكل" },
    ];

    // Sort by count descending so most popular types come first
    const sortedTypes = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

    for (const [typeKey, count] of sortedTypes) {
      const num = Number(typeKey);
      const label = formatVehicleRegistrationType(num as VehicleRegistrationType);
      opts.push({
        value: typeKey,
        label,
        sublabel: `${count} مركبة`,
      });
    }

    // Preserve restored value if allVehicles is still loading
    if (registrationFilter && !opts.some((o) => o.value === registrationFilter)) {
      const num = Number(registrationFilter);
      const label = formatVehicleRegistrationType(num as VehicleRegistrationType);
      opts.push({
        value: registrationFilter,
        label,
      });
    }

    return opts;
  }, [allVehicles, registrationFilter]);

  const modelOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();

    for (const v of allVehicles) {
      const mfg = (v.manufacturer || "").trim();
      const mdl = (v.model || "").trim();
      const label = [mfg, mdl].filter(Boolean).join(" ").trim();
      if (!label) continue;

      const existing = counts.get(label);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(label, { label, count: 1 });
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];

    // Sort by count descending so most popular models come first
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [key, item] of sorted) {
      opts.push({
        value: key,
        label: item.label,
        sublabel: `${item.count} مركبة`,
        count: item.count,
      });
    }

    // Preserve restored value if allVehicles is still loading
    if (modelFilter && !opts.some((o) => o.value === modelFilter)) {
      opts.push({
        value: modelFilter,
        label: modelFilter,
      });
    }

    return opts;
  }, [allVehicles, modelFilter]);

  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const v of allVehicles) {
      const city = (v.operatingCity || "").trim();
      if (city) {
        counts.set(city, (counts.get(city) || 0) + 1);
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

    // Preserve restored value if allVehicles is still loading
    if (cityFilter && !opts.some((o) => o.value === cityFilter)) {
      opts.push({
        value: cityFilter,
        label: cityFilter,
      });
    }

    return opts;
  }, [allVehicles, cityFilter]);

  const statusOptions: FilterOption[] = useMemo(
    () => [
      { value: "", label: "الكل" },
      { value: "Available", label: "متاح" },
      { value: "Assigned", label: "معيّن" },
      { value: "ProblemHold", label: "إيقاف (مشكلة)" },
      { value: "AccidentHold", label: "إيقاف (حادث)" },
      { value: "OutOfService", label: "خارج الخدمة" },
      { value: "Stolen", label: "مسروق" },
      { value: "Decommissioned", label: "مستبعد" },
    ],
    []
  );

  const filteredData = useMemo(() => {
    return allVehicles.filter((item) => {
      // 1. Status Filter
      if (statusFilter) {
        const itemStatusStr = String(item.status);
        const enumKey = String((VehicleOperationalStatus as Record<string, any>)[item.status] || "");
        if (itemStatusStr !== statusFilter && enumKey !== statusFilter) {
          return false;
        }
      }

      // 2. Model Filter
      if (modelFilter) {
        const itemModelCombined = [item.manufacturer, item.model].filter(Boolean).join(" ").trim();
        const normFilter = normalizeText(modelFilter);
        const matchesCombined = normalizeText(itemModelCombined).includes(normFilter);
        const matchesModel = item.model ? normalizeText(item.model).includes(normFilter) : false;
        const matchesMfg = item.manufacturer ? normalizeText(item.manufacturer).includes(normFilter) : false;
        if (!matchesCombined && !matchesModel && !matchesMfg) {
          return false;
        }
      }

      // 3. Registration Type Filter (Dynamic from backend data)
      if (registrationFilter) {
        if (
          String(item.registrationType) !== registrationFilter &&
          Number(item.registrationType) !== Number(registrationFilter)
        ) {
          return false;
        }
      }

      // 4. City Filter
      if (cityFilter) {
        if (!item.operatingCity || normalizeText(item.operatingCity) !== normalizeText(cityFilter)) {
          return false;
        }
      }

      // 5. Registry (Sponsor) Filter
      if (registryFilter) {
        const selectedSponsor = sponsors.find((s) => s.id === registryFilter);
        const matchesId = item.sponsorId === registryFilter;
        const matchesName = Boolean(
          selectedSponsor &&
          item.sponsorName &&
          (normalizeText(item.sponsorName) === normalizeText(selectedSponsor.registryNameAr) ||
           (selectedSponsor.registryNameEn && normalizeText(item.sponsorName) === normalizeText(selectedSponsor.registryNameEn)))
        );
        const matchesDirectName = Boolean(item.sponsorName && normalizeText(item.sponsorName) === normalizeText(registryFilter));

        if (!matchesId && !matchesName && !matchesDirectName) {
          return false;
        }
      }

      // 6. Search Query across all fields
      if (!search.trim()) return true;

      const searchableText = getVehicleSearchableText(item);
      const queryTokens = normalizeText(search).split(/\s+/).filter(Boolean);

      return queryTokens.every((token) => searchableText.includes(token));
    });
  }, [allVehicles, sponsors, search, statusFilter, modelFilter, registrationFilter, cityFilter, registryFilter]);

  const isFiltered = Boolean(
    search.trim() ||
    statusFilter ||
    modelFilter ||
    registrationFilter ||
    cityFilter ||
    registryFilter
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (!can("fleet.vehicles.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">صلاحية غير كافية</h2>
      </div>
    );
  }

  const renderStatus = (status: VehicleOperationalStatus) => {
    switch (status) {
      case VehicleOperationalStatus.Available: return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">متاح</Badge>;
      case VehicleOperationalStatus.Assigned: return <Badge className="bg-blue-50 text-blue-700 border-blue-200">معيّن</Badge>;
      case VehicleOperationalStatus.ProblemHold: return <Badge className="bg-orange-50 text-orange-700 border-orange-200">إيقاف (مشكلة)</Badge>;
      case VehicleOperationalStatus.AccidentHold: return <Badge className="bg-red-50 text-red-700 border-red-200">إيقاف (حادث)</Badge>;
      case VehicleOperationalStatus.Stolen: return <Badge className="bg-purple-50 text-purple-700 border-purple-200">مسروق</Badge>;
      case VehicleOperationalStatus.OutOfService: return <Badge className="bg-slate-100 text-slate-700 border-slate-300">خارج الخدمة</Badge>;
      case VehicleOperationalStatus.Decommissioned: return <Badge className="bg-slate-800 text-slate-300 border-slate-700">مستبعد</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredData.length === 0) return;
    setExporting(true);
    try {
      await exportToExcel({
        filename: `vehicles-fleet-${new Date().toISOString().split("T")[0]}`,
        sheetName: "أسطول المركبات",
        data: filteredData,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: "اللوحة (عربي)", accessor: (v) => v.plateNumberAr || "—", width: 16, isText: true },
          { header: "اللوحة (إنجليزي)", accessor: (v) => v.plateNumberEn || "—", width: 16, isText: true },
          { header: "الشركة والموديل", accessor: (v) => [v.manufacturer, v.model].filter(Boolean).join(" ") || "—", width: 22 },
          { header: "رقم الهيكل", accessor: (v) => v.chassisNumber || "—", width: 22, isText: true },
          { header: "الرقم التسلسلي", accessor: (v) => v.serialNumber || "—", width: 18, isText: true },
          { header: "نوع التسجيل", accessor: (v) => formatVehicleRegistrationType(v.registrationType), width: 18 },
          { header: "المدينة التشغيلية", accessor: (v) => v.operatingCity || "—", width: 16 },
          { header: "الكفيل / السجل", accessor: (v) => v.sponsorName || "—", width: 22 },
          {
            header: "الحالة التشغيلية",
            accessor: (v) => {
              switch (v.status) {
                case VehicleOperationalStatus.Available: return "متاح";
                case VehicleOperationalStatus.Assigned: return "معيّن";
                case VehicleOperationalStatus.ProblemHold: return "إيقاف (مشكلة)";
                case VehicleOperationalStatus.AccidentHold: return "إيقاف (حادث)";
                case VehicleOperationalStatus.OutOfService: return "خارج الخدمة";
                case VehicleOperationalStatus.Stolen: return "مسروق";
                case VehicleOperationalStatus.Decommissioned: return "مستبعد";
                default: return String(v.status);
              }
            },
            width: 16,
          },
          { header: "المندوب المستلم حالياً", accessor: (v) => v.currentRiderName || "—", width: 22 },
        ],
      });
    } catch (err) {
      console.error("Export vehicles error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Car className="h-7 w-7 text-[#1167c9]" />
            أسطول المركبات
            {allVehicles.length > 0 && (
              <span className="text-sm font-normal text-slate-500 mr-2">
                ({isFiltered ? `${filteredData.length} من ${allVehicles.length}` : `${allVehicles.length}`} مركبة)
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة المركبات، الاستمارات، وتتبع العهدة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            loading={exporting}
            disabled={exporting || loading || filteredData.length === 0}
            className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
          >
            <FileSpreadsheet size={16} />
            تصدير إكسل
          </Button>
          {can("fleet.vehicles.manage") && (
            <Button onClick={() => setIsUpsertOpen(true)} className="flex items-center gap-2 bg-[#1167c9] hover:bg-[#0e56a8]">
              <Plus className="h-4 w-4" /> إضافة مركبة جديدة
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 min-w-[240px] gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث شامل: اللوحة، التسلسلي، الهيكل، الموديل، نوع التسجيل، السجل، المدينة، الحالة..."
                className="pr-8 pl-7 h-9 text-xs rounded-lg"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="مسح البحث"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {isFiltered && (
            <Button
              variant="secondary"
              onClick={clearAllFilters}
              className="gap-1.5 text-xs h-9 min-h-0 px-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
            >
              <RefreshCw className="h-3.5 w-3.5" /> مسح الفلاتر
            </Button>
          )}
        </div>

        {/* Active Filters Summary */}
        {(modelFilter || registrationFilter || cityFilter || registryFilter || statusFilter) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)] text-xs">
            <span className="text-[var(--muted)] text-[11px] font-semibold ml-1">الفلاتر النشطة:</span>
            {modelFilter && (
              <Badge className="bg-blue-50 text-[#1167c9] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 gap-1 pl-1.5 font-medium">
                الموديل: {modelFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setModelFilter("")} />
              </Badge>
            )}
            {registrationFilter && (
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 gap-1 pl-1.5 font-medium">
                نوع التسجيل: {formatVehicleRegistrationType(Number(registrationFilter) as VehicleRegistrationType)}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setRegistrationFilter("")} />
              </Badge>
            )}
            {cityFilter && (
              <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 gap-1 pl-1.5 font-medium">
                المدينة: {cityFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setCityFilter("")} />
              </Badge>
            )}
            {registryFilter && (
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 gap-1 pl-1.5 font-medium">
                الكفيل: {sponsors.find((s) => s.id === registryFilter)?.registryNameAr || registryFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setRegistryFilter("")} />
              </Badge>
            )}
            {statusFilter && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 gap-1 pl-1.5 font-medium">
                الحالة: {statusOptions.find((s) => s.value === statusFilter)?.label || statusFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setStatusFilter("")} />
              </Badge>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" onClick={loadData} className="gap-1 text-xs px-3">
            <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <Car className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">{error ? "لا توجد بيانات متاحة حالياً" : "لا توجد مركبات مطابقة لمعايير البحث"}</p>
            {isFiltered && (
              <Button
                variant="secondary"
                className="mt-4 gap-1 text-xs px-3 py-1.5"
                onClick={clearAllFilters}
              >
                <RefreshCw className="h-3.5 w-3.5" /> مسح التصفية والبحث
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-3.5 whitespace-nowrap">رقم اللوحة</th>
                  <th className="px-6 py-3.5 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>الموديل</span>
                      <TableHeaderColumnFilter
                        label="الموديل"
                        value={modelFilter}
                        onChange={setModelFilter}
                        options={modelOptions}
                        placeholder="تصفية بالموديل..."
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>نوع التسجيل</span>
                      <TableHeaderColumnFilter
                        label="نوع التسجيل"
                        value={registrationFilter}
                        onChange={setRegistrationFilter}
                        options={registrationTypeOptions}
                        placeholder="تصفية بنوع التسجيل..."
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>المدينة / الكفيل</span>
                      <TableHeaderCitySponsorFilter
                        cityValue={cityFilter}
                        onCityChange={setCityFilter}
                        cityOptions={cityOptions}
                        sponsorValue={registryFilter}
                        onSponsorChange={setRegistryFilter}
                        sponsorOptions={registryOptions}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 whitespace-nowrap">عداد الكيلومترات</th>
                  <th className="px-6 py-3.5 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>الحالة</span>
                      <TableHeaderColumnFilter
                        label="الحالة"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={statusOptions}
                        placeholder="تصفية بالحالة..."
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-center whitespace-nowrap">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredData.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <Link href={`/admin/fleet/vehicles/${item.id}`} className="group block">
                        {item.plateNumberAr ? (
                          <div className="flex flex-col items-start">
                            <span className="font-bold border border-slate-300 dark:border-slate-700 rounded px-3 py-1 min-w-[110px] text-center whitespace-nowrap inline-block text-xs shadow-2xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 group-hover:border-[#1167c9] group-hover:text-[#1167c9] transition-colors">
                              {item.plateNumberAr}
                            </span>
                            {item.plateNumberEn && (
                              <span className="text-xs text-[var(--muted)] mt-1 font-mono text-center w-full block">{item.plateNumberEn}</span>
                            )}
                          </div>
                        ) : (
                          <span className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#1167c9] text-xs">بدون لوحة</span>
                        )}
                        {item.serialNumber && (
                          <div className="text-[11px] text-[var(--muted)] font-mono mt-1">
                            الرقم التسلسلي: <span className="font-bold text-slate-700 dark:text-slate-300">{item.serialNumber}</span>
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold">{item.manufacturer} {item.model}</div>
                      <div className="text-xs text-[var(--muted)]">النوع: {formatVehicleType(item.vehicleType)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        item.registrationType === VehicleRegistrationType.PublicTransport || Number(item.registrationType) === VehicleRegistrationType.PublicTransport
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                          : item.registrationType === VehicleRegistrationType.PrivateTransport || Number(item.registrationType) === VehicleRegistrationType.PrivateTransport
                          ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      }`}>
                        {formatVehicleRegistrationType(item.registrationType)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>{item.operatingCity || "—"}</div>
                      <div className="text-xs text-[var(--muted)]">{item.sponsorName || "—"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <div>
                        {(item.trackedDistanceKm ?? item.vehicleTrackedDistanceKm ?? item.currentOdometer).toLocaleString(undefined, {
                          minimumFractionDigits: (item.trackedDistanceKm != null || item.vehicleTrackedDistanceKm != null) ? 2 : 0,
                          maximumFractionDigits: 2,
                        })} كم
                      </div>
                      {(item.trackedDistanceKm != null || item.vehicleTrackedDistanceKm != null) && (
                        <div className="text-[10px] text-[var(--muted)] font-mono">
                          العداد: {item.currentOdometer.toLocaleString()} كم
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        {renderStatus(item.status)}
                        {!item.isReadyForAssignment && item.status === VehicleOperationalStatus.Available && (
                          <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1">غير جاهزة للتسليم</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/admin/fleet/vehicles/${item.id}`} className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
                        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {allVehicles.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3 text-xs text-[var(--muted)] font-medium">
            <span>
              {isFiltered ? (
                <>
                  نتائج البحث: <strong className="text-slate-800 dark:text-slate-200">{filteredData.length}</strong> من أصل <strong className="text-slate-800 dark:text-slate-200">{allVehicles.length}</strong> مركبة
                </>
              ) : (
                <>
                  إجمالي المركبات في الأسطول: <strong className="text-slate-800 dark:text-slate-200">{allVehicles.length}</strong> مركبة
                </>
              )}
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[#1167c9] hover:underline"
              >
                إلغاء التصفية
              </button>
            )}
          </div>
        )}
      </div>

      <VehicleUpsertModal 
        isOpen={isUpsertOpen} 
        onClose={() => setIsUpsertOpen(false)} 
        onSuccess={() => { setIsUpsertOpen(false); loadData(); }}
      />
    </div>
  );
}
