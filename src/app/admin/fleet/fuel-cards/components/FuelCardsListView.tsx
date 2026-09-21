"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { listRiders } from "@/lib/workforce/api";
import {
  getFuelCards,
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
  X,
  Filter as FilterIcon,
  FileSpreadsheet,
} from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import {
  TableHeaderColumnFilter,
  type FilterOption,
} from "@/app/admin/fleet/vehicles/components/TableHeaderFilter";

interface FuelCardsListViewProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  canManage: boolean;
  onOpenAssign: (card: FuelCard) => void;
  onOpenStop: (card: FuelCard) => void;
  onOpenHistory: (card: FuelCard) => void;
  onOpenDetail: (cardId: string) => void;
}

export function FuelCardsListView({
  searchQuery,
  onSearchChange,
  canManage,
  onOpenAssign,
  onOpenStop,
  onOpenHistory,
  onOpenDetail,
}: FuelCardsListViewProps) {
  const [providerFilter, setProviderFilter] = useState<FuelProvider | "">("");
  const [riderFilterId, setRiderFilterId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Table Header Column Filters
  const [headerCardNumberFilter, setHeaderCardNumberFilter] = useState<string>("");
  const [headerPlateFilter, setHeaderPlateFilter] = useState<string>("");
  const [headerAssignmentFilter, setHeaderAssignmentFilter] = useState<string>("");

  const FUEL_CARDS_FILTERS_SESSION_KEY = "admin_fleet_fuel_cards_filters_session";
  const [isRestored, setIsRestored] = useState(false);

  // Restore filters on mount for the current session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FUEL_CARDS_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.providerFilter === "string") setProviderFilter(parsed.providerFilter as FuelProvider | "");
        if (typeof parsed.riderFilterId === "string") setRiderFilterId(parsed.riderFilterId);
        if (typeof parsed.headerCardNumberFilter === "string") setHeaderCardNumberFilter(parsed.headerCardNumberFilter);
        if (typeof parsed.headerPlateFilter === "string") setHeaderPlateFilter(parsed.headerPlateFilter);
        if (typeof parsed.headerAssignmentFilter === "string") setHeaderAssignmentFilter(parsed.headerAssignmentFilter);
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
        providerFilter ||
        riderFilterId ||
        headerCardNumberFilter ||
        headerPlateFilter ||
        headerAssignmentFilter ||
        searchQuery
      ) {
        sessionStorage.setItem(
          FUEL_CARDS_FILTERS_SESSION_KEY,
          JSON.stringify({
            providerFilter,
            riderFilterId,
            headerCardNumberFilter,
            headerPlateFilter,
            headerAssignmentFilter,
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
    riderFilterId,
    headerCardNumberFilter,
    headerPlateFilter,
    headerAssignmentFilter,
    searchQuery,
  ]);

  const [cardsPageData, setCardsPageData] = useState<FuelCardPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [ridersOptions, setRidersOptions] = useState<SelectOption[]>([]);

  // Load riders for lookup filter
  useEffect(() => {
    listRiders()
      .then((riders) => {
        const options = (riders || []).map((r) => ({
          value: r.id, // riderProfileId
          label: r.fullNameAr || r.fullNameEn || "مندوب",
          sublabel: `هوية: ${r.iqamaNo || ""}`,
        }));
        setRidersOptions(options);
      })
      .catch((err) => console.error("Failed to fetch riders lookup:", err));
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFuelCards({
        search: searchQuery.trim() || undefined,
        provider: providerFilter || undefined,
        riderProfileId: riderFilterId || undefined,
        page,
        pageSize,
      });
      setCardsPageData(data);
    } catch (err) {
      console.error("Failed to fetch fuel cards:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, providerFilter, riderFilterId, page, pageSize]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const items = cardsPageData?.items || [];
  const totalCount = cardsPageData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Statistics
  const assignedCount = items.filter((c) => c.currentRider !== null).length;
  const unassignedCount = items.filter((c) => c.currentRider === null).length;
  const petroCount = items.filter((c) => c.provider === "PetroApp").length;
  const sayaraCount = items.filter((c) => c.provider === "SayaraApp").length;

  // Options for Table Header Filters
  const providerOptions = useMemo<FilterOption[]>(() => {
    return [
      { value: "PetroApp", label: fuelProviderLabels.PetroApp, count: petroCount },
      { value: "SayaraApp", label: fuelProviderLabels.SayaraApp, count: sayaraCount },
    ];
  }, [petroCount, sayaraCount]);

  const cardNumberOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    items.forEach((c) => {
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
  }, [items]);

  const plateOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    let unassignedPlates = 0;
    items.forEach((c) => {
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
  }, [items]);

  const assignmentOptions = useMemo<FilterOption[]>(() => {
    const opts: FilterOption[] = [
      { value: "assigned", label: "معينة لمندوب (نشطة)", count: assignedCount },
      { value: "unassigned", label: "شاغرة (غير مسندة)", count: unassignedCount },
    ];
    const riderMap = new Map<string, { label: string; count: number }>();
    items.forEach((c) => {
      if (c.currentRider) {
        const id = c.currentRider.riderProfileId;
        const name = c.currentRider.riderNameAr || c.currentRider.riderNameEn || "مندوب";
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
  }, [items, assignedCount, unassignedCount]);

  const isHeaderFiltered = Boolean(
    providerFilter || headerCardNumberFilter || headerPlateFilter || headerAssignmentFilter
  );

  const clearHeaderFilters = () => {
    setProviderFilter("");
    setHeaderCardNumberFilter("");
    setHeaderPlateFilter("");
    setHeaderAssignmentFilter("");
    try {
      sessionStorage.removeItem(FUEL_CARDS_FILTERS_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  // Client-filtered cards based on table header filters
  const filteredCards = useMemo(() => {
    return items.filter((card) => {
      if (headerCardNumberFilter && card.cardNumber !== headerCardNumberFilter) {
        return false;
      }
      if (headerPlateFilter) {
        if (headerPlateFilter === "__none__") {
          if (card.plateNumberText) return false;
        } else if (card.plateNumberText !== headerPlateFilter) {
          return false;
        }
      }
      if (headerAssignmentFilter) {
        if (headerAssignmentFilter === "assigned" && !card.currentRider) return false;
        if (headerAssignmentFilter === "unassigned" && card.currentRider) return false;
        if (
          headerAssignmentFilter !== "assigned" &&
          headerAssignmentFilter !== "unassigned" &&
          card.currentRider?.riderProfileId !== headerAssignmentFilter
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, headerCardNumberFilter, headerPlateFilter, headerAssignmentFilter]);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const data = await getFuelCards({
        search: searchQuery.trim() || undefined,
        provider: providerFilter || undefined,
        riderProfileId: riderFilterId || undefined,
        page: 1,
        pageSize: 10000,
      });

      const exportItems = data?.items || [];
      if (exportItems.length === 0) {
        return;
      }

      await exportToExcel({
        filename: `fuel-cards-${new Date().toISOString().split("T")[0]}`,
        sheetName: "بطاقات الوقود",
        data: exportItems,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: "رقم البطاقة", accessor: (c) => c.cardNumber, width: 22, isText: true },
          { header: "المزود", accessor: (c) => c.providerNameAr || fuelProviderLabels[c.provider] || String(c.provider), width: 16 },
          { header: "اللوحة المرتبطة", accessor: (c) => c.plateNumberText || "—", width: 16, isText: true },
          { header: "المندوب المعين", accessor: (c) => c.currentRider?.riderNameAr || c.currentRider?.riderNameEn || "غير معين", width: 24 },
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
            <span>بترو اب / سيارة اب (بالمعروض)</span>
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
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value as FuelProvider | "");
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
                placeholder="المندوب المعين..."
                searchPlaceholder="بحث في المناديب..."
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading || totalCount === 0}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors shrink-0 disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            تصدير إكسل
          </button>
        </div>
      </div>

      {/* Active Table Header Filters */}
      {isHeaderFiltered && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
          <span className="text-[var(--muted)] font-bold">فلاتر أعمدة الجدول النشطة:</span>
          {providerFilter && (
            <Badge className="bg-blue-50 text-[#1167c9] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 gap-1 pl-1.5 font-medium">
              المزود: {fuelProviderLabels[providerFilter]}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setProviderFilter("")} />
            </Badge>
          )}
          {headerCardNumberFilter && (
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 gap-1 pl-1.5 font-medium">
              رقم البطاقة: {headerCardNumberFilter}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderCardNumberFilter("")} />
            </Badge>
          )}
          {headerPlateFilter && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 gap-1 pl-1.5 font-medium">
              اللوحة: {headerPlateFilter === "__none__" ? "بدون لوحة" : headerPlateFilter}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderPlateFilter("")} />
            </Badge>
          )}
          {headerAssignmentFilter && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 gap-1 pl-1.5 font-medium">
              التعيين: {assignmentOptions.find((o: FilterOption) => o.value === headerAssignmentFilter)?.label || headerAssignmentFilter}
              <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setHeaderAssignmentFilter("")} />
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
                        setProviderFilter(val as FuelProvider | "");
                        setPage(1);
                      }}
                      options={providerOptions}
                      placeholder="تصفية بالمزود..."
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
                    <span>المندوب المعين حالياً</span>
                    <TableHeaderColumnFilter
                      label="المندوب"
                      value={headerAssignmentFilter}
                      onChange={setHeaderAssignmentFilter}
                      options={assignmentOptions}
                      placeholder="تصفية بالمندوب والحالة..."
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
                  <td colSpan={6} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                    جاري تحميل بطاقات الوقود...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted)]">
                    لا توجد بطاقات وقود تطابق معايير البحث.
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted)]">
                    <FilterIcon size={24} className="mx-auto opacity-40 mb-2" />
                    <p className="font-bold text-sm text-[var(--foreground)]">لا توجد بطاقات وقود تطابق فلاتر الأعمدة المحددة.</p>
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
                filteredCards.map((card: FuelCard) => {
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

                          {canManage && (
                            <>
                              {!hasRider ? (
                                <button
                                  onClick={() => onOpenAssign(card)}
                                  className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  title="إسناد البطاقة لمندوب"
                                >
                                  <UserPlus size={15} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => onOpenStop(card)}
                                  className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  title="إنهاء إسناد البطاقة (إرجاع)"
                                >
                                  <UserMinus size={15} />
                                </button>
                              )}
                            </>
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

        {/* Server Pagination */}
        {cardsPageData && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] text-xs text-[var(--muted)] font-medium">
            <div>
              عرض {items.length} من إجمالي {totalCount} بطاقة (الصفحة {page} من {totalPages})
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
              <span className="px-2 font-bold text-[var(--foreground)]">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
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
