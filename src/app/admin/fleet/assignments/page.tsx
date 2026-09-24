"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicles } from "@/lib/fleet/api";
import { listRiders, listEmployees } from "@/lib/workforce/api";
import { VehicleOperationalStatus, type VehicleSummaryResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  TableHeaderColumnFilter,
  type FilterOption,
} from "@/app/admin/fleet/vehicles/components/TableHeaderFilter";
import { Key, Search, RefreshCw, Car, ArrowLeftRight, CalendarClock, ShieldCheck, X, FileSpreadsheet, FileUp } from "lucide-react";
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
  const [data, setData] = useState<VehicleSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"assigned" | "available">("assigned");
  const [riderToEmpMap, setRiderToEmpMap] = useState<Map<string, string>>(new Map());
  const [riderDetailsMap, setRiderDetailsMap] = useState<
    Map<string, { nameAr: string; nameEn?: string; iqama?: string; phone?: string }>
  >(new Map());

  const [cityFilter, setCityFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummaryResponse | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const status =
        filterType === "assigned"
          ? VehicleOperationalStatus.Assigned.toString()
          : VehicleOperationalStatus.Available.toString();

      const [firstRes, ridersRes, empRes] = await Promise.all([
        getVehicles({
          status,
          page: 1,
          pageSize: 2000,
        }),
        listRiders().catch(() => []),
        listEmployees().catch(() => []),
      ]);

      console.log("[Fleet Assignments API Response]:", firstRes);

      let allVehicles = firstRes?.items || [];
      const totalCount = firstRes?.totalCount ?? allVehicles.length;

      // Backend clamps pageSize to 200. If totalCount exceeds 200, fetch remaining pages concurrently
      if (totalCount > allVehicles.length) {
        const pageSize = firstRes?.pageSize || 200;
        const totalPages = Math.ceil(totalCount / pageSize);
        const pagePromises = [];
        for (let p = 2; p <= totalPages; p++) {
          pagePromises.push(
            getVehicles({
              status,
              page: p,
              pageSize,
            }).catch((err) => {
              console.warn(`Failed to load vehicles page ${p}:`, err);
              return null;
            })
          );
        }
        const remainingResults = await Promise.all(pagePromises);
        for (const r of remainingResults) {
          if (r?.items) {
            allVehicles = allVehicles.concat(r.items);
          }
        }
      }

      const map = new Map<string, string>();
      const detailsMap = new Map<string, { nameAr: string; nameEn?: string; iqama?: string; phone?: string }>();

      ridersRes.forEach((r) => {
        if (r.id && r.employeeId) map.set(r.id, r.employeeId);
        const info = {
          nameAr: r.fullNameAr || "",
          nameEn: r.fullNameEn || "",
          iqama: r.iqamaNo || "",
          phone: "",
        };
        if (r.id) detailsMap.set(r.id, info);
        if (r.employeeId) detailsMap.set(r.employeeId, info);
      });

      empRes.forEach((e) => {
        if (e.riderProfileId && e.id) map.set(e.riderProfileId, e.id);
        if (e.rider?.id && e.id) map.set(e.rider.id, e.id);
        if (e.id) map.set(e.id, e.id);

        const info = {
          nameAr: e.fullNameAr || "",
          nameEn: e.fullNameEn || "",
          iqama: e.iqamaNo || "",
          phone: e.primaryPhone || (e as any).phone || "",
        };
        if (e.id) {
          const existing = detailsMap.get(e.id);
          detailsMap.set(e.id, { ...existing, ...info });
        }
        if (e.riderProfileId) {
          const existing = detailsMap.get(e.riderProfileId);
          detailsMap.set(e.riderProfileId, { ...existing, ...info });
        }
        if (e.rider?.id) {
          const existing = detailsMap.get(e.rider.id);
          detailsMap.set(e.rider.id, { ...existing, ...info });
        }
      });

      setRiderToEmpMap(map);
      setRiderDetailsMap(detailsMap);

      // Filter out available vehicles that are not ready
      if (filterType === "available") {
        setData(allVehicles.filter((v) => v.isReadyForAssignment));
      } else {
        setData(allVehicles);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const openModal = (type: ActiveModal, vehicle: VehicleSummaryResponse | null = null) => {
    setSelectedVehicle(vehicle);
    setActiveModal(type);
  };

  const handleModalSuccess = () => {
    setActiveModal(null);
    setSelectedVehicle(null);
    loadData();
  };

  // Operating City Options for Table Header Filter
  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const v of data) {
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

    if (cityFilter && !opts.some((o) => o.value === cityFilter)) {
      opts.push({
        value: cityFilter,
        label: cityFilter,
      });
    }

    return opts;
  }, [data, cityFilter]);

  // Vehicle Manufacturer / Model Options for Table Header Filter
  const manufacturerOptions = useMemo(() => {
    const mfgMap = new Map<string, { count: number; models: Map<string, number> }>();

    for (const v of data) {
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
  }, [data, manufacturerFilter]);

  // Apply client-side filters
  const filteredData = useMemo(() => {
    const queryTokens = search.trim() ? normalizeText(search).split(/\s+/).filter(Boolean) : [];

    return data.filter((item) => {
      // 1. Search Query across vehicle and rider fields
      if (queryTokens.length > 0) {
        const empId =
          (item as any).employeeId ||
          (item as any).currentEmployeeId ||
          (item.currentRiderProfileId ? riderToEmpMap.get(item.currentRiderProfileId) || item.currentRiderProfileId : null);

        const riderInfo =
          (item.currentRiderProfileId ? riderDetailsMap.get(item.currentRiderProfileId) : null) ||
          (empId ? riderDetailsMap.get(empId) : null);

        const realRiderObj = item.realRider || (item.actualRider && item.actualRider.isSelectedRiderTheActualRider === false ? {
          id: item.actualRider.selectedRiderEmployeeId || item.actualRider.selectedRiderProfileId,
          name: item.actualRider.actualRiderName,
          iqamaNo: item.actualRider.actualRiderIqamaNo,
          relationshipToAssignedRider: item.actualRider.relationshipToSelectedRider,
        } : null);

        const realRiderInfo = realRiderObj?.id ? riderDetailsMap.get(realRiderObj.id) : null;

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
          item.currentRiderName,
          riderInfo?.nameAr,
          riderInfo?.nameEn,
          riderInfo?.iqama,
          riderInfo?.phone,
          realRiderObj?.name,
          realRiderObj?.iqamaNo,
          realRiderInfo?.nameAr,
          realRiderInfo?.nameEn,
          realRiderInfo?.iqama,
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
        if (!item.operatingCity || normalizeText(item.operatingCity) !== normalizeText(cityFilter)) {
          return false;
        }
      }

      // 3. Vehicle Manufacturer / Model Filter
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
  }, [data, search, cityFilter, manufacturerFilter, riderToEmpMap, riderDetailsMap]);

  const hasActiveFilters = Boolean(cityFilter || manufacturerFilter);
  const isFiltered = Boolean(search.trim() || hasActiveFilters);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredData.length === 0) return;
    setExporting(true);
    try {
      await exportToExcel({
        filename: `vehicle-assignments-${filterType}-${new Date().toISOString().split("T")[0]}`,
        sheetName: filterType === "assigned" ? "المركبات المسلمة" : "المركبات المتاحة",
        data: filteredData,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: "اللوحة (عربي)", accessor: (item) => item.plateNumberAr || "—", width: 16, isText: true },
          { header: "اللوحة (إنجليزي)", accessor: (item) => item.plateNumberEn || "—", width: 16, isText: true },
          { header: "المركبة والموديل", accessor: (item) => [item.manufacturer, item.model].filter(Boolean).join(" ") || "—", width: 22 },
          { header: "الرقم التسلسلي", accessor: (item) => item.serialNumber || "—", width: 18, isText: true },
          { header: "المدينة التشغيلية", accessor: (item) => item.operatingCity || "—", width: 16 },
          {
            header: "المندوب المسجل",
            accessor: (item) => {
              const rInfo = item.currentRiderProfileId ? riderDetailsMap.get(item.currentRiderProfileId) : null;
              return rInfo?.nameAr || item.currentRiderName || "—";
            },
            width: 24,
          },
          {
            header: "هوية المندوب",
            accessor: (item) => {
              const rInfo = item.currentRiderProfileId ? riderDetailsMap.get(item.currentRiderProfileId) : null;
              return rInfo?.iqama || "—";
            },
            width: 18,
            isText: true,
          },
          {
            header: "جوال المندوب",
            accessor: (item) => {
              const rInfo = item.currentRiderProfileId ? riderDetailsMap.get(item.currentRiderProfileId) : null;
              return rInfo?.phone || "—";
            },
            width: 18,
            isText: true,
          },
          {
            header: "المندوب الفعلي (إن وجد)",
            accessor: (item) => item.actualRider ? (item.actualRider.actualRiderName || (item.actualRider as any).name || "—") : "—",
            width: 22,
          },
          {
            header: "هوية المندوب الفعلي",
            accessor: (item) => item.actualRider ? (item.actualRider.actualRiderIqamaNo || "—") : "—",
            width: 20,
            isText: true,
          },
          {
            header: "حالة المركبة",
            accessor: (item) => item.status === VehicleOperationalStatus.Assigned ? "معين" : "متاح",
            width: 14,
          },
        ],
      });
    } catch (err) {
      console.error("Export assignments error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Key className="h-7 w-7 text-[#1167c9]" />
            مركز تعيينات المركبات
            {data.length > 0 && (
              <span className="text-sm font-normal text-slate-500 mr-2">
                ({isFiltered ? `${filteredData.length} من ${data.length}` : `${data.length}`} مركبة)
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة تسليم واستلام وتبديل المركبات للمناديب
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
          {can("fleet.assignments.manage") && (
            <div className="flex gap-2">
              <Button onClick={() => openModal("take")} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Key className="h-4 w-4" /> تسليم مركبة
              </Button>
              <Button onClick={() => openModal("return")} variant="secondary" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" /> استلام مركبة
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              variant={filterType === "assigned" ? "primary" : "secondary"}
              className={filterType === "assigned" ? "bg-[#1167c9] hover:bg-[#0e56a8]" : ""}
              onClick={() => setFilterType("assigned")}
            >
              المركبات المسلمة
            </Button>
            <Button
              variant={filterType === "available" ? "primary" : "secondary"}
              className={filterType === "available" ? "bg-[#1167c9] hover:bg-[#0e56a8]" : ""}
              onClick={() => setFilterType("available")}
            >
              المركبات المتاحة
            </Button>
          </div>

          <form onSubmit={handleSearch} className="flex min-w-[280px] sm:min-w-[340px] flex-1 max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم المندوب، اللوحة، أو الرقم..."
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
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <Key className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">لا توجد بيانات مطابقة</p>
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
                  {filterType === "assigned" && (
                    <>
                      <th className="px-6 py-4">المندوب المنسوب</th>
                      <th className="px-6 py-4">المندوب الفعلي</th>
                    </>
                  )}
                  <th className="px-6 py-4">انتهاء التفويض</th>
                  <th className="px-6 py-4">العداد (كم)</th>
                  {can("fleet.assignments.manage") && <th className="px-6 py-4 text-center">الإجراءات السريعة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredData.map((item) => {
                  const empId =
                    (item as any).employeeId ||
                    (item as any).currentEmployeeId ||
                    (item.currentRiderProfileId ? riderToEmpMap.get(item.currentRiderProfileId) || item.currentRiderProfileId : null);

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/fleet/vehicles/${item.id}`}
                          className="font-bold font-mono text-[#1167c9] hover:underline"
                        >
                          {item.serialNumber || "—"}
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
                      {filterType === "assigned" && (
                        <>
                          <td className="px-6 py-4">
                            {empId ? (
                              <Link
                                href={`/admin/employees/${empId}`}
                                className="font-bold text-[#1167c9] hover:underline block"
                              >
                                {item.currentRiderName || "—"}
                              </Link>
                            ) : (
                              <div className="font-bold">{item.currentRiderName || "—"}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const isNotReal = item.isRealRider === false || String(item.isRealRider) === "false";
                              const realRiderObj = item.realRider || (item.actualRider && item.actualRider.isSelectedRiderTheActualRider === false ? {
                                id: item.actualRider.selectedRiderEmployeeId || item.actualRider.selectedRiderProfileId,
                                name: item.actualRider.actualRiderName,
                                iqamaNo: item.actualRider.actualRiderIqamaNo,
                                relationshipToAssignedRider: item.actualRider.relationshipToSelectedRider,
                              } : null);

                              if ((isNotReal || realRiderObj) && realRiderObj && (realRiderObj.name || realRiderObj.iqamaNo)) {
                                const realEmpId = realRiderObj.id ? (riderToEmpMap.get(realRiderObj.id) || realRiderObj.id) : null;
                                return (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {realEmpId && realEmpId !== "guid" && riderToEmpMap.has(realRiderObj.id || "") ? (
                                        <Link
                                          href={`/admin/employees/${realEmpId}`}
                                          className="font-bold text-purple-700 dark:text-purple-300 hover:underline"
                                        >
                                          {realRiderObj.name || "—"}
                                        </Link>
                                      ) : (
                                        <span className="font-bold text-purple-700 dark:text-purple-300">
                                          {realRiderObj.name || "—"}
                                        </span>
                                      )}
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
                        </>
                      )}
                      <td className="px-6 py-4 font-mono">
                        {item.permitEndDate ? item.permitEndDate.split("T")[0] : "—"}
                      </td>
                      <td className="px-6 py-4 font-mono">{item.currentOdometer.toLocaleString()}</td>

                      {can("fleet.assignments.manage") && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {filterType === "available" ? (
                              <button
                                onClick={() => openModal("take", item)}
                                className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 transition-colors"
                                title="تسليم هذه المركبة"
                              >
                                <Key className="h-4 w-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => openModal("return", item)}
                                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 bg-red-50/50 dark:bg-red-950/30 dark:hover:bg-red-900/50 transition-colors"
                                  title="استلام (إرجاع) المركبة"
                                >
                                  <ArrowLeftRight className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openModal("switch", item)}
                                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 bg-blue-50/50 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 transition-colors"
                                  title="تبديل المركبة"
                                >
                                  <Car className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openModal("renew", item)}
                                  className="rounded-lg p-2 text-orange-600 hover:bg-orange-50 bg-orange-50/50 dark:bg-orange-950/30 dark:hover:bg-orange-900/50 transition-colors"
                                  title="تجديد التفويض"
                                >
                                  <CalendarClock className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openModal("promissory", item)}
                                  className="rounded-lg p-2 text-violet-600 hover:bg-violet-50 bg-violet-50/50 dark:bg-violet-950/30 dark:hover:bg-violet-900/50 transition-colors"
                                  title="إرفاق سندات الأمر بالعهدة الحالية"
                                  aria-label="إرفاق سندات الأمر بالعهدة الحالية"
                                >
                                  <FileUp className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredData.length === 0 && (
                  <tr>
                    <td
                      colSpan={filterType === "assigned" ? (can("fleet.assignments.manage") ? 8 : 7) : (can("fleet.assignments.manage") ? 6 : 5)}
                      className="px-6 py-12 text-center text-slate-500 font-medium"
                    >
                      {search.trim() || hasActiveFilters
                        ? "لا توجد نتائج مطابقة للبحث أو التصفية الحالية"
                        : filterType === "assigned"
                          ? "لا توجد مركبات مسلّمة حالياً"
                          : "لا توجد مركبات متاحة جاهزة للتسليم"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
