"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { listRiders, listEmployees, listSponsors, Sponsor } from "@/lib/workforce/api";
import {
  getFuelCards,
  getAllFuelCards,
  FuelCard,
  FuelCardPage,
  FuelProvider,
  fuelProviderLabels,
} from "@/lib/fleet/fuel-cards-api";
import {
  Search,
  RefreshCw,
  Eye,
  UserPlus,
  UserMinus,
  History,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CreditCard,
  CheckCircle2,
  UserCheck,
  Building,
  Building2,
  MapPin,
  X,
  Filter as FilterIcon,
  FileSpreadsheet,
} from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import {
  TableHeaderColumnFilter,
  type FilterOption,
} from "@/app/admin/fleet/vehicles/components/TableHeaderFilter";

function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

interface FuelCardsListViewProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  canManage: boolean;
  onOpenAssign: (card: FuelCard) => void;
  onOpenStop: (card: FuelCard) => void;
  onOpenHistory: (card: FuelCard) => void;
  onOpenDetail: (cardId: string) => void;
  onOpenChangeSponsor: (card: FuelCard) => void;
  onOpenChangeCity: (card: FuelCard) => void;
}

export function FuelCardsListView({
  searchQuery,
  onSearchChange,
  canManage,
  onOpenAssign,
  onOpenStop,
  onOpenHistory,
  onOpenDetail,
  onOpenChangeSponsor,
  onOpenChangeCity,
}: FuelCardsListViewProps) {
  const { can } = useAuth();
  const canUpdate = can("fuel.update");
  const canDelete = can("fuel.delete");
  const [providerFilter, setProviderFilter] = useState<string[]>([]);
  const [headerCityFilter, setHeaderCityFilter] = useState<string[]>([]);
  const [riderFilterId, setRiderFilterId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(500);

  // Table Header Column Filters (Multi)
  const [headerCardNumberFilter, setHeaderCardNumberFilter] = useState<string[]>([]);
  const [headerPlateFilter, setHeaderPlateFilter] = useState<string[]>([]);
  const [headerAssignmentFilter, setHeaderAssignmentFilter] = useState<string[]>([]);
  const [headerSponsorFilter, setHeaderSponsorFilter] = useState<string[]>([]);

  const [sponsorsMap, setSponsorsMap] = useState<Record<string, Sponsor>>({});

  const FUEL_CARDS_FILTERS_SESSION_KEY = "admin_fleet_fuel_cards_filters_session";
  const [isRestored, setIsRestored] = useState(false);

  // Restore filters on mount for the current session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FUEL_CARDS_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const toArray = (val: any): string[] => {
          if (Array.isArray(val)) return val.map(String).filter(Boolean);
          if (typeof val === "string" && val.trim() && val !== "ALL") return [val.trim()];
          return [];
        };

        if (parsed.providerFilter) setProviderFilter(toArray(parsed.providerFilter));
        if (parsed.headerCityFilter) setHeaderCityFilter(toArray(parsed.headerCityFilter));
        if (typeof parsed.riderFilterId === "string") setRiderFilterId(parsed.riderFilterId);
        if (parsed.headerCardNumberFilter) setHeaderCardNumberFilter(toArray(parsed.headerCardNumberFilter));
        if (parsed.headerPlateFilter) setHeaderPlateFilter(toArray(parsed.headerPlateFilter));
        if (parsed.headerAssignmentFilter) setHeaderAssignmentFilter(toArray(parsed.headerAssignmentFilter));
        if (parsed.headerSponsorFilter) setHeaderSponsorFilter(toArray(parsed.headerSponsorFilter));
        if (typeof parsed.searchQuery === "string" && parsed.searchQuery) onSearchChange(parsed.searchQuery);
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
        providerFilter.length > 0 ||
        headerCityFilter.length > 0 ||
        riderFilterId ||
        headerCardNumberFilter.length > 0 ||
        headerPlateFilter.length > 0 ||
        headerAssignmentFilter.length > 0 ||
        headerSponsorFilter.length > 0 ||
        searchQuery
      ) {
        sessionStorage.setItem(
          FUEL_CARDS_FILTERS_SESSION_KEY,
          JSON.stringify({
            providerFilter,
            headerCityFilter,
            riderFilterId,
            headerCardNumberFilter,
            headerPlateFilter,
            headerAssignmentFilter,
            headerSponsorFilter,
            searchQuery,
          })
        );
      } else {
        sessionStorage.removeItem(FUEL_CARDS_FILTERS_SESSION_KEY);
      }
    } catch {
      // ignore sessionStorage errors
    }
  }, [
    isRestored,
    providerFilter,
    headerCityFilter,
    riderFilterId,
    headerCardNumberFilter,
    headerPlateFilter,
    headerAssignmentFilter,
    headerSponsorFilter,
    searchQuery,
  ]);

  const [allCards, setAllCards] = useState<FuelCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [ridersOptions, setRidersOptions] = useState<SelectOption[]>([]);

  // Load sponsors to resolve names
  useEffect(() => {
    listSponsors()
      .then((sponsors) => {
        const map: Record<string, Sponsor> = {};
        (sponsors || []).forEach((s) => {
          map[s.id] = s;
        });
        setSponsorsMap(map);
      })
      .catch((err) => {
        console.warn("Could not load sponsors list (user may lack sponsors.read):", err);
      });
  }, []);

  // Load riders and employees for lookup filter
  useEffect(() => {
    Promise.all([
      listRiders().catch(() => []),
      listEmployees().catch(() => []),
    ])
      .then(([riders, employees]) => {
        const options: SelectOption[] = [];
        const seenIds = new Set<string>();

        (riders || []).forEach((r) => {
          if (!r.id) return;
          seenIds.add(r.id);
          if (r.employeeId) seenIds.add(r.employeeId);

          options.push({
            value: r.id,
            label: `${r.fullNameAr || r.fullNameEn || "مندوب"} — مندوب`,
            sublabel: `هوية: ${r.iqamaNo || ""}`,
          });
        });

        (employees || []).forEach((e) => {
          if (!e.id) return;
          const riderId = (e as any).riderProfileId || e.rider?.id;
          if (riderId && seenIds.has(riderId)) return;
          if (seenIds.has(e.id)) return;

          const val = riderId || e.id;
          const typeTag = e.isEmployee !== false ? "موظف إداري" : "موظف";
          options.push({
            value: val,
            label: `${e.fullNameAr || e.fullNameEn || "موظف"} — ${typeTag}`,
            sublabel: `هوية: ${e.iqamaNo || ""}`,
          });
        });

        setRidersOptions(options);
      })
      .catch((err) => console.error("Failed to fetch riders/employees lookup:", err));
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllFuelCards();
      setAllCards(data);
    } catch (err) {
      console.error("Failed to fetch fuel cards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Statistics across ALL data
  const totalCount = allCards.length;
  const assignedCount = allCards.filter((c) => c.currentRider !== null).length;
  const unassignedCount = allCards.filter((c) => c.currentRider === null).length;
  const petroCount = allCards.filter((c) => c.provider === "PetroApp").length;
  const sayaraCount = allCards.filter((c) => c.provider === "SayaraApp").length;

  // Options for Table Header Filters (computed across all cards)
  const providerOptions = useMemo<FilterOption[]>(() => {
    return [
      { value: "PetroApp", label: fuelProviderLabels.PetroApp, count: petroCount },
      { value: "SayaraApp", label: fuelProviderLabels.SayaraApp, count: sayaraCount },
    ];
  }, [petroCount, sayaraCount]);

  const cardNumberOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    allCards.forEach((c) => {
      if (c.cardNumber) {
        map.set(c.cardNumber, (map.get(c.cardNumber) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([num, count]) => ({
        value: num,
        label: num,
        count,
      }));
  }, [allCards]);

  const plateOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    let unassignedPlates = 0;
    allCards.forEach((c) => {
      if (c.plateNumberText) {
        map.set(c.plateNumberText, (map.get(c.plateNumberText) || 0) + 1);
      } else {
        unassignedPlates++;
      }
    });
    const opts: FilterOption[] = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([plate, count]) => ({
        value: plate,
        label: plate,
        count,
      }));
    if (unassignedPlates > 0) {
      opts.unshift({
        value: "__none__",
        label: "بدون لوحة مسجلة",
        count: unassignedPlates,
      });
    }
    return opts;
  }, [allCards]);

  const assignmentOptions = useMemo<FilterOption[]>(() => {
    const opts: FilterOption[] = [
      { value: "assigned", label: "معينة لمندوب/موظف (نشطة)", count: assignedCount },
      { value: "unassigned", label: "شاغرة (غير مسندة)", count: unassignedCount },
    ];
    const riderMap = new Map<string, { label: string; count: number }>();
    allCards.forEach((c) => {
      if (c.currentRider) {
        const id = c.currentRider.riderProfileId;
        const name = c.currentRider.riderNameAr || c.currentRider.riderNameEn || "مندوب/موظف";
        const curr = riderMap.get(id) || { label: name, count: 0 };
        curr.count++;
        riderMap.set(id, curr);
      }
    });
    riderMap.forEach((info, id) => {
      opts.push({
        value: id,
        label: info.label,
        count: info.count,
      });
    });
    return opts;
  }, [allCards, assignedCount, unassignedCount]);

  const sponsorOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    allCards.forEach((c) => {
      if (c.sponsorId) {
        map.set(c.sponsorId, (map.get(c.sponsorId) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([id, count]) => {
        const sp = sponsorsMap[id];
        return {
          value: id,
          label: sp ? (sp.registryNameAr || sp.registryNameEn || sp.id) : id,
          count,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allCards, sponsorsMap]);

  const cityOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, { label: string; count: number }>();
    allCards.forEach((c) => {
      if (c.operatingCityId) {
        const name = c.operatingCityNameAr || c.operatingCityNameEn || c.operatingCityId;
        const curr = map.get(c.operatingCityId) || { label: name, count: 0 };
        curr.count++;
        map.set(c.operatingCityId, curr);
      }
    });
    return Array.from(map.entries())
      .map(([id, info]) => ({
        value: id,
        label: info.label,
        count: info.count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allCards]);

  const isHeaderFiltered = Boolean(
    providerFilter.length > 0 ||
    headerCityFilter.length > 0 ||
    headerCardNumberFilter.length > 0 ||
    headerPlateFilter.length > 0 ||
    headerAssignmentFilter.length > 0 ||
    headerSponsorFilter.length > 0
  );

  const clearHeaderFilters = () => {
    setProviderFilter([]);
    setHeaderCityFilter([]);
    setHeaderCardNumberFilter([]);
    setHeaderPlateFilter([]);
    setHeaderAssignmentFilter([]);
    setHeaderSponsorFilter([]);
    try {
      sessionStorage.removeItem(FUEL_CARDS_FILTERS_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  // Client-filtered cards based on top search, top provider/rider filters, and table header filters
  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      // Top Provider Filter
      if (providerFilter.length > 0 && !providerFilter.includes(card.provider)) {
        return false;
      }

      // Column: Operating City Filter
      if (headerCityFilter.length > 0 && !headerCityFilter.includes(card.operatingCityId)) {
        return false;
      }

      // Top Rider / Employee Filter
      if (
        riderFilterId &&
        card.currentRider?.riderProfileId !== riderFilterId &&
        card.currentRider?.employeeId !== riderFilterId
      ) {
        return false;
      }

      // Column: Card Number Filter
      if (headerCardNumberFilter.length > 0 && !headerCardNumberFilter.includes(card.cardNumber)) {
        return false;
      }

      // Column: Plate Number Filter
      if (headerPlateFilter.length > 0) {
        const match = headerPlateFilter.some((pf) => {
          if (pf === "__none__") return !card.plateNumberText;
          return card.plateNumberText === pf;
        });
        if (!match) return false;
      }

      // Column: Assignment Filter
      if (headerAssignmentFilter.length > 0) {
        const match = headerAssignmentFilter.some((af) => {
          if (af === "assigned") return Boolean(card.currentRider);
          if (af === "unassigned") return !card.currentRider;
          return card.currentRider?.riderProfileId === af;
        });
        if (!match) return false;
      }

      // Column: Sponsor Filter
      if (headerSponsorFilter.length > 0 && !headerSponsorFilter.includes(card.sponsorId)) {
        return false;
      }

      // Global Search Query
      if (searchQuery.trim()) {
        const sp = sponsorsMap[card.sponsorId];
        const sponsorName = sp ? (sp.registryNameAr || sp.registryNameEn || sp.id) : (card.sponsorId || "");
        const searchableText = normalizeText(
          [
            card.cardNumber,
            card.plateNumberText,
            card.operatingCityNameAr,
            card.operatingCityNameEn,
            card.currentRider?.riderNameAr,
            card.currentRider?.riderNameEn,
            card.currentRider?.employeeId,
            sponsorName,
            card.notes,
            card.providerNameAr,
            fuelProviderLabels[card.provider],
            card.provider,
          ]
            .filter(Boolean)
            .join(" ")
        );
        const queryTokens = normalizeText(searchQuery).split(/\s+/).filter(Boolean);
        const matchSearch = queryTokens.every((token) => searchableText.includes(token));
        if (!matchSearch) return false;
      }

      return true;
    });
  }, [
    allCards,
    providerFilter,
    headerCityFilter,
    riderFilterId,
    headerCardNumberFilter,
    headerPlateFilter,
    headerAssignmentFilter,
    headerSponsorFilter,
    searchQuery,
    sponsorsMap,
  ]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, providerFilter, headerCityFilter, riderFilterId, headerCardNumberFilter, headerPlateFilter, headerAssignmentFilter, headerSponsorFilter]);

  const totalPages = Math.ceil(filteredCards.length / pageSize) || 1;
  const paginatedCards = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCards.slice(start, start + pageSize);
  }, [filteredCards, page, pageSize]);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredCards.length === 0) return;
    setExporting(true);
    try {
      await exportToExcel({
        filename: `fuel-cards-${new Date().toISOString().split("T")[0]}`,
        sheetName: "بطاقات الوقود",
        data: filteredCards,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: "رقم البطاقة", accessor: (c) => c.cardNumber, width: 22, isText: true },
          { header: "المزود", accessor: (c) => c.providerNameAr || fuelProviderLabels[c.provider] || String(c.provider), width: 16 },
          {
            header: "مدينة التشغيل",
            accessor: (c) => c.operatingCityNameAr || c.operatingCityNameEn || c.operatingCityId || "—",
            width: 18,
          },
          {
            header: "الكفيل",
            accessor: (c) => {
              const sp = sponsorsMap[c.sponsorId];
              return sp ? (sp.registryNameAr || sp.registryNameEn || sp.id) : (c.sponsorId || "—");
            },
            width: 24,
          },
          { header: "اللوحة المرتبطة", accessor: (c) => c.plateNumberText || "—", width: 16, isText: true },
          { header: "المندوب أو الموظف المعين", accessor: (c) => c.currentRider?.riderNameAr || c.currentRider?.riderNameEn || "غير معين", width: 24 },
          { header: "الرقم الوظيفي", accessor: (c) => c.currentRider?.employeeId || "—", width: 18, isText: true },
          { header: "تاريخ بداية التعيين", accessor: (c) => c.currentRider?.effectiveFrom ? c.currentRider.effectiveFrom.split("T")[0] : "—", width: 18 },
          { header: "حالة التعيين", accessor: (c) => c.currentRider ? "معين" : "شاغر (متاح)", width: 16 },
          { header: "ملاحظات", accessor: (c) => c.notes || "—", width: 24 },
        ],
      });
    } catch (err) {
      console.error("Export fuel cards error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>إجمالي بطاقات الوقود</span>
            <CreditCard size={18} className="text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {totalCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>البطاقات المعينة لمناديب</span>
            <UserCheck size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {assignedCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>البطاقات الشاغرة (غير مسندة)</span>
            <CheckCircle2 size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {unassignedCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>بترو اب / سيارة اب</span>
            <Building size={18} className="text-indigo-500" />
          </div>
          <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
            {petroCount} بترو اب | {sayaraCount} سيارة اب
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث برقم البطاقة، اللوحة، أو اسم المندوب..."
                className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              />
            </div>

            {/* Provider Filter */}
            <div>
              <select
                value={providerFilter[0] || ""}
                onChange={(e) => {
                  setProviderFilter(e.target.value ? [e.target.value] : []);
                  setPage(1);
                }}
                className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
              >
                <option value="">جميع الشركات المزودة...</option>
                <option value="PetroApp">{fuelProviderLabels.PetroApp}</option>
                <option value="SayaraApp">{fuelProviderLabels.SayaraApp}</option>
              </select>
            </div>

            {/* Rider Filter */}
            <div>
              <SearchableSelect
                value={riderFilterId}
                onChange={(val) => {
                  setRiderFilterId(val);
                  setPage(1);
                }}
                options={ridersOptions}
                placeholder="المندوب أو الموظف المعين..."
                searchPlaceholder="بحث في المناديب والموظفين..."
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading || filteredCards.length === 0}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors shrink-0 disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            {exporting ? "جاري التصدير..." : "تصدير إكسل"}
          </button>
        </div>
      </div>

      {/* Active Table Header Filters */}
      {isHeaderFiltered && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
          <span className="text-[var(--muted)] font-bold">فلاتر أعمدة الجدول النشطة:</span>
          {providerFilter.map((pf) => (
            <Badge key={pf} className="bg-blue-50 text-[#1167c9] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 gap-1 pl-1.5 font-medium">
              المزود: {fuelProviderLabels[pf as FuelProvider] || pf}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setProviderFilter(providerFilter.filter((x) => x !== pf))} />
            </Badge>
          ))}
          {headerCityFilter.map((cId) => (
            <Badge key={cId} className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 gap-1 pl-1.5 font-medium">
              المدينة: {cityOptions.find((o: FilterOption) => o.value === cId)?.label || cId}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderCityFilter(headerCityFilter.filter((x) => x !== cId))} />
            </Badge>
          ))}
          {headerCardNumberFilter.map((cNum) => (
            <Badge key={cNum} className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 gap-1 pl-1.5 font-medium">
              رقم البطاقة: {cNum}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderCardNumberFilter(headerCardNumberFilter.filter((x) => x !== cNum))} />
            </Badge>
          ))}
          {headerPlateFilter.map((pVal) => (
            <Badge key={pVal} className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 gap-1 pl-1.5 font-medium">
              اللوحة: {pVal === "__none__" ? "بدون لوحة" : pVal}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderPlateFilter(headerPlateFilter.filter((x) => x !== pVal))} />
            </Badge>
          ))}
          {headerAssignmentFilter.map((aId) => (
            <Badge key={aId} className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 gap-1 pl-1.5 font-medium">
              التعيين: {assignmentOptions.find((o: FilterOption) => o.value === aId)?.label || aId}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderAssignmentFilter(headerAssignmentFilter.filter((x) => x !== aId))} />
            </Badge>
          ))}
          {headerSponsorFilter.map((spId) => (
            <Badge key={spId} className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 gap-1 pl-1.5 font-medium">
              الكفيل: {sponsorsMap[spId]?.registryNameAr || sponsorsMap[spId]?.registryNameEn || spId}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderSponsorFilter(headerSponsorFilter.filter((x) => x !== spId))} />
            </Badge>
          ))}
          <button
            type="button"
            onClick={clearHeaderFilters}
            className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold mr-auto cursor-pointer"
          >
            مسح جميع فلاتر الأعمدة
          </button>
        </div>
      )}

      {/* Cards Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] uppercase">
              <tr>
                <th className="px-4 py-3.5 text-start whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <span>شركة المزود</span>
                    <TableHeaderColumnFilter
                      label="المزود"
                      value={providerFilter}
                      onChange={(val) => {
                        setProviderFilter(val);
                        setPage(1);
                      }}
                      options={providerOptions}
                      placeholder="تصفية بالمزود..."
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-start whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <span>مدينة التشغيل</span>
                    <TableHeaderColumnFilter
                      label="المدينة"
                      value={headerCityFilter}
                      onChange={setHeaderCityFilter}
                      options={cityOptions}
                      placeholder="تصفية بمدينة التشغيل..."
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-start whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <span>رقم البطاقة / المعرف</span>
                    <TableHeaderColumnFilter
                      label="رقم البطاقة"
                      value={headerCardNumberFilter}
                      onChange={setHeaderCardNumberFilter}
                      options={cardNumberOptions}
                      placeholder="تصفية برقم البطاقة..."
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-start whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <span>رقم اللوحة</span>
                    <TableHeaderColumnFilter
                      label="اللوحة"
                      value={headerPlateFilter}
                      onChange={setHeaderPlateFilter}
                      options={plateOptions}
                      placeholder="تصفية باللوحة..."
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-start whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <span>الكفيل</span>
                    <TableHeaderColumnFilter
                      label="الكفيل"
                      value={headerSponsorFilter}
                      onChange={setHeaderSponsorFilter}
                      options={sponsorOptions}
                      placeholder="تصفية بالكفيل..."
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-start whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <span>المندوب أو الموظف المعين حالياً</span>
                    <TableHeaderColumnFilter
                      label="المندوب أو الموظف"
                      value={headerAssignmentFilter}
                      onChange={setHeaderAssignmentFilter}
                      options={assignmentOptions}
                      placeholder="تصفية بالمستلم والحالة..."
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-start whitespace-nowrap">تاريخ بدء التعيين</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                    جاري تحميل بطاقات الوقود...
                  </td>
                </tr>
              ) : allCards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                    لا توجد بطاقات وقود مسجلة.
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                    <FilterIcon size={24} className="mx-auto opacity-40 mb-2" />
                    <p className="font-bold text-sm text-[var(--foreground)]">لا توجد بطاقات وقود تطابق فلاتر الأعمدة أو معايير البحث المحددة.</p>
                    <button
                      type="button"
                      onClick={clearHeaderFilters}
                      className="mt-2 text-xs font-bold text-[#1167c9] hover:underline"
                    >
                      مسح فلاتر الأعمدة
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedCards.map((card: FuelCard) => {
                  const hasRider = card.currentRider !== null;

                  return (
                    <tr
                      key={card.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Provider */}
                      <td className="px-4 py-3.5">
                        <Badge tone={card.provider === "PetroApp" ? "blue" : "green"}>
                          {card.providerNameAr}
                        </Badge>
                      </td>

                      {/* Operating City */}
                      <td className="px-4 py-3.5 text-start whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
                          <span className="font-bold text-[var(--foreground)]">
                            {card.operatingCityNameAr || card.operatingCityNameEn || card.operatingCityId || "—"}
                          </span>
                        </div>
                        {card.operatingCityNameEn && card.operatingCityNameEn !== card.operatingCityNameAr && (
                          <span className="text-[10px] text-[var(--muted)] block font-mono pr-4">
                            {card.operatingCityNameEn}
                          </span>
                        )}
                      </td>

                      {/* Card Number with Isolated Bidi Rendering */}
                      <td className="px-4 py-3.5 text-start">
                        <span dir="auto" className="fuel-plate font-bold text-sm text-[var(--foreground)]">
                          {card.cardNumber}
                        </span>
                        {card.identifierType === "InternalNumber" && (
                          <span className="mr-2 text-[10px] text-[var(--muted)] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                            داخلي
                          </span>
                        )}
                      </td>

                      {/* Plate Number Text with Isolated Bidi Rendering */}
                      <td className="px-4 py-3.5 text-start">
                        {card.plateNumberText ? (
                          <span dir="auto" className="fuel-plate font-bold text-slate-700 dark:text-slate-300">
                            {card.plateNumberText}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Sponsor */}
                      <td className="px-4 py-3.5 text-start">
                        {(() => {
                          const sp = sponsorsMap[card.sponsorId];
                          const sponsorName = sp ? (sp.registryNameAr || sp.registryNameEn || sp.id) : card.sponsorId;
                          const isInactive = sp && sp.status && sp.status !== "Active";

                          return (
                            <div className="flex flex-col text-start max-w-[200px]">
                              <span className="font-bold text-[var(--foreground)] truncate" title={sponsorName}>
                                {sponsorName}
                              </span>
                              {sp?.employerIdentityNumber ? (
                                <span className="text-[10px] text-[var(--muted)] font-mono">
                                  هوية: {sp.employerIdentityNumber}
                                </span>
                              ) : null}
                              {isInactive && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                  ({sp.status})
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Current Rider */}
                      <td className="px-4 py-3.5">
                        {card.currentRider ? (
                          <Link
                            href={`/admin/employees/${card.currentRider.employeeId}`}
                            className="font-bold text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            {card.currentRider.riderNameAr || card.currentRider.riderNameEn}
                            <ExternalLink size={12} className="opacity-60" />
                          </Link>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900">
                            شاغرة (غير مسندة)
                          </span>
                        )}
                      </td>

                      {/* Effective From */}
                      <td className="px-4 py-3.5 font-mono text-[var(--muted)] dir-ltr text-start">
                        {card.currentRider?.effectiveFrom || "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View detail */}
                          <button
                            onClick={() => onOpenDetail(card.id)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="عرض التفاصيل الكاملة"
                          >
                            <Eye size={15} />
                          </button>

                          {/* View Assignment History */}
                          <button
                            onClick={() => onOpenHistory(card)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            title="عرض سجل التعيينات"
                          >
                            <History size={15} />
                          </button>

                          {/* Change Sponsor */}
                          {canUpdate && (
                            <button
                              onClick={() => onOpenChangeSponsor(card)}
                              className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              title="تغيير كفيل البطاقة"
                            >
                              <Building2 size={15} />
                            </button>
                          )}

                          {/* Change City */}
                          {canUpdate && (
                            <button
                              onClick={() => onOpenChangeCity(card)}
                              className="p-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300"
                              title="تغيير مدينة تشغيل البطاقة"
                            >
                              <MapPin size={15} />
                            </button>
                          )}

                          {!hasRider ? (
                            canUpdate && (
                              <button
                                onClick={() => onOpenAssign(card)}
                                className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                title="إسناد البطاقة لمندوب"
                              >
                                <UserPlus size={15} />
                              </button>
                            )
                          ) : (
                            canDelete && (
                              <button
                                onClick={() => onOpenStop(card)}
                                className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                title="إنهاء إسناد البطاقة (إرجاع)"
                              >
                                <UserMinus size={15} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Client Pagination */}
        {allCards.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] text-xs text-[var(--muted)] font-medium">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                عرض <strong className="text-[var(--foreground)]">{paginatedCards.length}</strong> من أصل{" "}
                <strong className="text-[var(--foreground)]">{filteredCards.length}</strong> بطاقة
                {filteredCards.length !== allCards.length && (
                  <span className="mr-1">(من إجمالي {allCards.length})</span>
                )}
                {" "}(الصفحة {page} من {totalPages})
              </div>

              <div className="flex items-center gap-1.5">
                <span>لكل صفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 px-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                title="الصفحة السابقة"
              >
                <ChevronRight size={18} />
              </button>
              <span className="px-2 font-bold text-[var(--foreground)]">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                title="الصفحة التالية"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
