"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  UserX,
  Eye,
  Briefcase,
  Phone,
  Globe,
  MapPin,
  ShieldAlert,
  FileCheck,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { TableHeaderColumnFilter, TableHeaderDualFilter, type FilterOption } from "@/components/ui/TableHeaderFilter";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { exportToExcel } from "@/lib/export-excel";
import { listEmployees } from "@/lib/workforce/api";
import {
  listExternalRiders,
  getOperatingCities,
  getOperationalWorkTypes,
  type ExternalRider,
  type OperatingCityCatalogItem,
  type OperationalWorkTypeCatalogItem,
} from "@/lib/workforce/external-riders-api";
import type { Employee } from "@/lib/workforce/types";
import { ExternalRiderStatusBadge } from "@/components/hr/ExternalRiderStatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { matchesArabicSearch } from "@/lib/utils/arabicSearch";

type TerminatedPerson = {
  id: string;
  sourceType: "Sponsored" | "ExternalRider";
  fullName: string;
  iqamaNo: string;
  phone: string;
  nationality: string;
  cityName: string;
  roleName: string;
  profileUrl: string;
  engagementLabel: { ar: string; en: string };
};

export default function TerminatedEmployeesPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [externalRiders, setExternalRiders] = useState<ExternalRider[]>([]);
  const [cities, setCities] = useState<OperatingCityCatalogItem[]>([]);
  const [workTypes, setWorkTypes] = useState<OperationalWorkTypeCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [headerCategoryFilter, setHeaderCategoryFilter] = useState<string[]>([]);
  const [headerNationalityFilter, setHeaderNationalityFilter] = useState<string[]>([]);
  const [headerCityFilter, setHeaderCityFilter] = useState<string[]>([]);
  const [headerRoleFilter, setHeaderRoleFilter] = useState<string[]>([]);

  const TERMINATED_FILTERS_SESSION_KEY = "admin_terminated_employees_filters_session";
  const isRestoredRef = useState({ current: false })[0];

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TERMINATED_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.search === "string") setSearch(parsed.search);
        if (Array.isArray(parsed.headerCategoryFilter)) setHeaderCategoryFilter(parsed.headerCategoryFilter);
        if (Array.isArray(parsed.headerNationalityFilter)) setHeaderNationalityFilter(parsed.headerNationalityFilter);
        if (Array.isArray(parsed.headerCityFilter)) setHeaderCityFilter(parsed.headerCityFilter);
        if (Array.isArray(parsed.headerRoleFilter)) setHeaderRoleFilter(parsed.headerRoleFilter);
      }
    } catch {
      // ignore
    } finally {
      isRestoredRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isRestoredRef.current) return;
    try {
      sessionStorage.setItem(
        TERMINATED_FILTERS_SESSION_KEY,
        JSON.stringify({
          search,
          headerCategoryFilter,
          headerNationalityFilter,
          headerCityFilter,
          headerRoleFilter,
        })
      );
    } catch {
      // ignore
    }
  }, [search, headerCategoryFilter, headerNationalityFilter, headerCityFilter, headerRoleFilter]);

  const canReadEmployees = can("employees.read");
  const canReadRiders = can("riders.read");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [empRes, extRes, cityRes, wtRes] = await Promise.all([
        canReadEmployees ? listEmployees().catch(() => []) : Promise.resolve([]),
        canReadRiders ? listExternalRiders().catch(() => []) : Promise.resolve([]),
        getOperatingCities().catch(() => []),
        getOperationalWorkTypes().catch(() => []),
      ]);

      setEmployees(empRes);
      setExternalRiders(extRes);
      setCities(cityRes);
      setWorkTypes(wtRes);
    } catch {
      setError(
        isEn
          ? "Unable to load terminated personnel data."
          : "تعذر تحميل بيانات الموظفين والمناديب منتهيي الخدمة."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cityMap = useMemo(() => {
    const map = new Map<string, OperatingCityCatalogItem>();
    cities.forEach((c) => map.set(c.id, c));
    return map;
  }, [cities]);

  const workTypeMap = useMemo(() => {
    const map = new Map<string, OperationalWorkTypeCatalogItem>();
    workTypes.forEach((w) => map.set(w.id, w));
    return map;
  }, [workTypes]);

  const terminatedList = useMemo<TerminatedPerson[]>(() => {
    const list: TerminatedPerson[] = [];

    // 1. Terminated sponsored employees / riders
    employees
      .filter((e) => e.status === "Terminated")
      .forEach((e) => {
        const empRec = e as Record<string, unknown>;
        const cityNameFound =
          typeof e.operatingCity === "object" && e.operatingCity
            ? isEn
              ? (e.operatingCity as any).nameEn || (e.operatingCity as any).nameAr
              : (e.operatingCity as any).nameAr || (e.operatingCity as any).nameEn
            : (empRec.operatingCityId as string)
            ? (isEn
                ? cityMap.get(empRec.operatingCityId as string)?.nameEn
                : cityMap.get(empRec.operatingCityId as string)?.nameAr) || "—"
            : "—";

        const roleNameFound =
          typeof e.operationalWorkType === "object" && e.operationalWorkType
            ? isEn
              ? (e.operationalWorkType as any).nameEn || (e.operationalWorkType as any).nameAr
              : (e.operationalWorkType as any).nameAr || (e.operationalWorkType as any).nameEn
            : (empRec.operationalWorkTypeId as string)
            ? (isEn
                ? workTypeMap.get(empRec.operationalWorkTypeId as string)?.nameEn
                : workTypeMap.get(empRec.operationalWorkTypeId as string)?.nameAr) || "—"
            : "—";

        list.push({
          id: e.id,
          sourceType: "Sponsored",
          fullName: isEn ? e.fullNameEn || e.fullNameAr : e.fullNameAr || e.fullNameEn || "—",
          iqamaNo: e.iqamaNo || "—",
          phone: e.primaryPhone || (empRec.phone as string) || "—",
          nationality: (empRec.nationalityAr as string) || e.nationality || "—",
          cityName: cityNameFound || "—",
          roleName: roleNameFound || "—",
          profileUrl: `/admin/hr/external-riders/${e.id}`,
          engagementLabel: {
            ar: e.isEmployee ? "إداري مكفول" : "مندوب مكفول",
            en: e.isEmployee ? "Sponsored Staff" : "Sponsored Rider",
          },
        });
      });

    // 2. Terminated external riders
    externalRiders
      .filter((r) => r.status === "Terminated")
      .forEach((r) => {
        const cityObj = r.operatingCityId ? cityMap.get(r.operatingCityId) : undefined;
        const workTypeObj = r.operationalWorkTypeId ? workTypeMap.get(r.operationalWorkTypeId) : undefined;

        const cName = cityObj
          ? isEn
            ? cityObj.nameEn || cityObj.nameAr || cityObj.code
            : cityObj.nameAr || cityObj.nameEn || cityObj.code
          : r.operatingCityId || "—";

        const wName = workTypeObj
          ? isEn
            ? workTypeObj.nameEn || workTypeObj.nameAr || workTypeObj.code
            : workTypeObj.nameAr || workTypeObj.nameEn || workTypeObj.code
          : r.operationalWorkTypeId || "—";

        list.push({
          id: r.employeeId,
          sourceType: "ExternalRider",
          fullName: r.fullNameAr,
          iqamaNo: r.iqamaNo || "—",
          phone: r.primaryPhone || "—",
          nationality: r.nationality || "—",
          cityName: cName,
          roleName: wName,
          profileUrl: `/admin/hr/external-riders/${r.employeeId}`,
          engagementLabel: {
            ar: "مندوب خارجي",
            en: "Outside Rider",
          },
        });
      });

    return list;
  }, [employees, externalRiders, cityMap, workTypeMap, isEn]);

  // Filter Options for TableHeaderColumnFilter
  const categoryFilterOptions: FilterOption[] = useMemo(() => [
    { value: "SponsoredStaff", label: isEn ? "Sponsored Staff" : "إداري مكفول" },
    { value: "SponsoredRider", label: isEn ? "Sponsored Rider" : "مندوب مكفول" },
    { value: "OutsideRider", label: isEn ? "Outside Rider" : "مندوب خارجي" },
  ], [isEn]);

  const nationalityFilterOptions: FilterOption[] = useMemo(() => {
    const set = new Set<string>();
    terminatedList.forEach((p) => {
      if (p.nationality && p.nationality !== "—") set.add(p.nationality.trim());
    });
    return Array.from(set).sort().map((nat) => ({
      value: nat,
      label: nat,
    }));
  }, [terminatedList]);

  const cityFilterOptions: FilterOption[] = useMemo(() => {
    const set = new Set<string>();
    terminatedList.forEach((p) => {
      if (p.cityName && p.cityName !== "—") set.add(p.cityName.trim());
    });
    return Array.from(set).sort().map((city) => ({
      value: city,
      label: city,
    }));
  }, [terminatedList]);

  const roleFilterOptions: FilterOption[] = useMemo(() => {
    const set = new Set<string>();
    terminatedList.forEach((p) => {
      if (p.roleName && p.roleName !== "—") set.add(p.roleName.trim());
    });
    return Array.from(set).sort().map((role) => ({
      value: role,
      label: role,
    }));
  }, [terminatedList]);

  const filteredList = useMemo(() => {
    return terminatedList.filter((item) => {
      if (headerCategoryFilter.length > 0) {
        let catKey = "OutsideRider";
        if (item.sourceType === "Sponsored") {
          catKey = item.engagementLabel.en === "Sponsored Staff" ? "SponsoredStaff" : "SponsoredRider";
        }
        if (!headerCategoryFilter.includes(catKey)) return false;
      }

      if (headerNationalityFilter.length > 0) {
        if (!item.nationality || !headerNationalityFilter.includes(item.nationality.trim())) return false;
      }

      if (headerCityFilter.length > 0) {
        if (!item.cityName || !headerCityFilter.includes(item.cityName.trim())) return false;
      }

      if (headerRoleFilter.length > 0) {
        if (!item.roleName || !headerRoleFilter.includes(item.roleName.trim())) return false;
      }

      if (!search.trim()) return true;
      return matchesArabicSearch(
        search,
        item.fullName,
        item.iqamaNo,
        item.phone,
        item.cityName,
        item.roleName,
        item.nationality,
        item.engagementLabel?.ar,
        item.engagementLabel?.en,
        item.sourceType,
      );
    });
  }, [terminatedList, search, headerCategoryFilter, headerNationalityFilter, headerCityFilter, headerRoleFilter]);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredList.length === 0) return;
    setExporting(true);
    try {
      await exportToExcel({
        filename: `terminated-personnel-${new Date().toISOString().split("T")[0]}`,
        sheetName: isEn ? "Terminated Personnel" : "منتهيي الخدمة",
        data: filteredList,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: isEn ? "Full Name" : "الاسم الكامل", accessor: (item) => item.fullName, width: 28 },
          { header: isEn ? "Iqama / ID No" : "رقم الإقامة / الهوية", accessor: (item) => item.iqamaNo, width: 20, isText: true },
          { header: isEn ? "Phone" : "رقم الجوال", accessor: (item) => item.phone, width: 18, isText: true },
          {
            header: isEn ? "Category" : "التصنيف",
            accessor: (item) => item.engagementLabel ? (isEn ? item.engagementLabel.en : item.engagementLabel.ar) : item.sourceType,
            width: 18,
          },
          { header: isEn ? "Nationality" : "الجنسية", accessor: (item) => item.nationality, width: 16 },
          { header: isEn ? "Operating City" : "المدينة التشغيلية", accessor: (item) => item.cityName, width: 20 },
          { header: isEn ? "Role" : "الدور", accessor: (item) => item.roleName, width: 22 },
        ],
      });
    } catch (err) {
      console.error("Export terminated error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-rose-600">{t("nav.hr")}</p>
          <h1 className="mt-1 text-3xl font-black flex items-center gap-3 text-slate-900 dark:text-white">
            <UserX className="text-rose-600 size-8" />
            <span>{isEn ? "Terminated Staff & Riders" : "منتهيي الخدمة"}</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {isEn
              ? "Comprehensive archive of terminated sponsored employees, sponsored delegates, and external riders."
              : "السجل الشامل للموظفين والمناديب المكفولين والمناديب الخارجيين منتهيي الخدمة."}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleExportExcel}
          loading={exporting}
          disabled={exporting || loading || filteredList.length === 0}
          className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
        >
          <FileSpreadsheet size={16} />
          {isEn ? "Export Excel" : "تصدير إكسل"}
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1 max-w-xl">
            <div className="relative flex-1 min-w-[240px]">
              <Search
                className={`pointer-events-none absolute top-3 text-[var(--muted)] ${
                  isEn ? "left-3" : "right-3"
                }`}
                size={18}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isEn
                    ? "Search terminated staff by name, Iqama, phone..."
                    : "ابحث بالاسم، رقم الإقامة، الهاتف..."
                }
                className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm ${
                  isEn ? "pl-10 pr-3" : "pr-10 pl-3"
                }`}
              />
            </div>

            {(search.trim() ||
              headerCategoryFilter.length > 0 ||
              headerNationalityFilter.length > 0 ||
              headerCityFilter.length > 0 ||
              headerRoleFilter.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setHeaderCategoryFilter([]);
                  setHeaderNationalityFilter([]);
                  setHeaderCityFilter([]);
                  setHeaderRoleFilter([]);
                  try {
                    sessionStorage.removeItem(TERMINATED_FILTERS_SESSION_KEY);
                  } catch {}
                }}
                className="h-11 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors shrink-0"
              >
                {isEn ? "Reset Filters" : "إعادة ضبط"}
              </button>
            )}
          </div>

          <span className="flex items-center gap-2 text-sm font-bold text-[var(--muted)] shrink-0">
            <UserX size={18} />
            {filteredList.length} {isEn ? "terminated" : "منتهي خدمة"}
          </span>
        </div>

        {/* Active Column Filter Badges */}
        {(headerCategoryFilter.length > 0 ||
          headerNationalityFilter.length > 0 ||
          headerCityFilter.length > 0 ||
          headerRoleFilter.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/70">
            <span className="text-[11px] font-bold text-[var(--muted)]">
              {isEn ? "Column filters:" : "فلاتر الأعمدة:"}
            </span>
            {headerCategoryFilter.map((cat) => {
              const opt = categoryFilterOptions.find((o) => o.value === cat);
              return (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                >
                  <span>{opt?.label || cat}</span>
                  <button
                    type="button"
                    onClick={() => setHeaderCategoryFilter((prev) => prev.filter((x) => x !== cat))}
                    className="hover:text-red-500 rounded-full"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}
            {headerNationalityFilter.map((nat) => (
              <span
                key={nat}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              >
                <span>{nat}</span>
                <button
                  type="button"
                  onClick={() => setHeaderNationalityFilter((prev) => prev.filter((x) => x !== nat))}
                  className="hover:text-red-500 rounded-full"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {headerCityFilter.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              >
                <span>{city}</span>
                <button
                  type="button"
                  onClick={() => setHeaderCityFilter((prev) => prev.filter((x) => x !== city))}
                  className="hover:text-red-500 rounded-full"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {headerRoleFilter.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
              >
                <span>{role}</span>
                <button
                  type="button"
                  onClick={() => setHeaderRoleFilter((prev) => prev.filter((x) => x !== role))}
                  className="hover:text-red-500 rounded-full"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                setHeaderCategoryFilter([]);
                setHeaderNationalityFilter([]);
                setHeaderCityFilter([]);
                setHeaderRoleFilter([]);
              }}
              className="text-[11px] text-red-600 dark:text-red-400 hover:underline ms-2 font-medium"
            >
              {isEn ? "Clear column filters" : "مسح فلاتر الأعمدة"}
            </button>
          </div>
        )}

        {error ? (
          <div className="flex items-center gap-3 p-6 text-red-700">
            <ShieldAlert size={20} />
            <p className="font-bold">{error}</p>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-[var(--muted)] font-bold">
            {t("common.loading")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-[900px] w-full ${isEn ? "text-left" : "text-right"}`}>
              <thead className="bg-slate-500/10 text-xs font-bold text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span>{isEn ? "Name" : "الاسم"}</span>
                      <TableHeaderDualFilter
                        label={isEn ? "Category & Nationality" : "التصنيف والجنسية"}
                        tab1={{
                          id: "category",
                          label: isEn ? "Category" : "التصنيف",
                          icon: <ShieldAlert className="h-3 w-3" />,
                          values: headerCategoryFilter,
                          onChange: setHeaderCategoryFilter,
                          options: categoryFilterOptions,
                          placeholder: isEn ? "Filter by category..." : "تصفية بالتصنيف...",
                        }}
                        tab2={{
                          id: "nationality",
                          label: isEn ? "Nationality" : "الجنسية",
                          icon: <Globe className="h-3 w-3" />,
                          values: headerNationalityFilter,
                          onChange: setHeaderNationalityFilter,
                          options: nationalityFilterOptions,
                          placeholder: isEn ? "Filter by nationality..." : "تصفية بالجنسية...",
                        }}
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4">{isEn ? "Iqama / Phone" : "رقم الإقامة / الجوال"}</th>
                  <th className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span>{isEn ? "City & Role" : "المدينة والدور"}</span>
                      <TableHeaderDualFilter
                        label={isEn ? "City & Role" : "المدينة والدور"}
                        tab1={{
                          id: "city",
                          label: isEn ? "Operating City" : "المدينة التشغيلية",
                          icon: <MapPin className="h-3 w-3" />,
                          values: headerCityFilter,
                          onChange: setHeaderCityFilter,
                          options: cityFilterOptions,
                          placeholder: isEn ? "Filter by city..." : "تصفية بالمدينة...",
                        }}
                        tab2={{
                          id: "role",
                          label: isEn ? "Role" : "الدور",
                          icon: <Briefcase className="h-3 w-3" />,
                          values: headerRoleFilter,
                          onChange: setHeaderRoleFilter,
                          options: roleFilterOptions,
                          placeholder: isEn ? "Filter by role..." : "تصفية بالدور...",
                        }}
                      />
                    </div>
                  </th>
                  <th className="px-5 py-4">{t("common.status")}</th>
                  <th className="px-5 py-4 text-center">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {filteredList.map((person) => (
                  <tr key={`${person.sourceType}-${person.id}`} className="hover:bg-rose-500/5 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={person.profileUrl}
                        className="font-black text-slate-900 dark:text-slate-100 hover:text-[#1167c9] transition-colors"
                      >
                        {person.fullName}
                      </Link>
                      {person.nationality && person.nationality !== "—" && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                            <Globe size={11} />
                            {person.nationality}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {person.iqamaNo}
                      </div>
                      {person.phone && person.phone !== "—" && (
                        <div className="mt-0.5 flex items-center gap-1 font-mono text-xs text-[var(--muted)]">
                          <Phone size={12} />
                          <span dir="ltr">{person.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <MapPin size={13} className="text-[#1167c9]" />
                        <span>{person.cityName}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                        <Briefcase size={13} />
                        <span>{person.roleName}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <ExternalRiderStatusBadge status="Terminated" locale={locale} />
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/admin/hr/forms?template=final_settlement&personId=${person.id}`}>
                          <Button variant="secondary" className="h-8 px-2.5 text-xs text-[#1167c9] hover:bg-blue-50 border-blue-200">
                            <FileCheck size={14} />
                            {isEn ? "Clearance" : "إقرار المخالصة"}
                          </Button>
                        </Link>
                        <Link href={person.profileUrl}>
                          <Button variant="secondary" className="h-8 px-3 text-xs">
                            <Eye size={14} />
                            {isEn ? "View Profile" : "عرض الملف"}
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {!filteredList.length && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-sm font-bold text-[var(--muted)]">
                      {isEn ? "No terminated personnel found." : "لا يوجد موظفون أو مناديب منتهيو الخدمة مطابقون."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
