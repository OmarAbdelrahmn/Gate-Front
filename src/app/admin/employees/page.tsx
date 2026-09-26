"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Filter, Plus, Search, UsersRound, FileText, FileSpreadsheet, X } from "lucide-react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { TableHeaderColumnFilter, type FilterOption } from "@/components/ui/TableHeaderFilter";
import { translate } from "../../../lib/i18n";
import { exportToExcel } from "../../../lib/export-excel";
import { hrCatalogApi, type HrRow } from "../../../lib/hr/api";
import { listEmployees } from "../../../lib/workforce/api";
import type { Employee } from "../../../lib/workforce/types";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { matchesArabicSearch } from "@/lib/utils/arabicSearch";

const statusLabel: Record<string, { ar: string; en: string }> = {
    Draft: { ar: "مسودة", en: "Draft" },
    Onboarding: { ar: "قيد التهيئة", en: "Onboarding" },
    Active: { ar: "نشط", en: "Active" },
    Suspended: { ar: "موقوف", en: "Suspended" },
    OnLeave: { ar: "في إجازة", en: "On Leave" },
    Terminated: { ar: "منتهي الخدمة", en: "Terminated" },
    Archived: { ar: "مؤرشف", en: "Archived" },
    Fleeing: { ar: "هروب / انقطاع", en: "Fleeing" },
    Accident: { ar: "حادث", en: "Accident" },
    Sick: { ar: "إجازة مرضية", en: "Sick" },
    Inactive: { ar: "غير نشط", en: "Inactive" },
};

const relationshipLabel: Record<string, { ar: string; en: string }> = {
    SponsoredInternal: { ar: "على الكفالة", en: "Internal Sponsored Employee" },
    OutsideRider: { ar: "مندوب خارجي", en: "External Delegate" },
};

function getCityDisplay(employee: Employee, cities: HrRow[], locale: string): string {
    const empRecord = employee as Record<string, unknown>;

    if (employee.operatingCity && typeof employee.operatingCity === "object") {
        const cObj = employee.operatingCity as Record<string, unknown>;
        const val = locale === "en"
            ? (cObj.nameEn || cObj.cityNameEn || cObj.globalCityEn || cObj.nameAr || cObj.cityNameAr || cObj.globalCityAr)
            : (cObj.nameAr || cObj.cityNameAr || cObj.globalCityAr || cObj.nameEn || cObj.cityNameEn || cObj.globalCityEn);
        if (typeof val === "string" && val.trim()) return val.trim();
    }

    const rawRef = typeof employee.operatingCity === "string"
        ? employee.operatingCity
        : (empRecord.operatingCityId as string) || (empRecord.cityId as string) || (empRecord.operatingCity as string);

    if (rawRef && typeof rawRef === "string") {
        const found = cities.find((c) => c.id === rawRef || c.globalCityId === rawRef || c.code === rawRef);
        if (found) {
            const val = locale === "en"
                ? (found.globalCityEn as string) || (found.cityNameEn as string) || (found.nameEn as string) || (found.globalCityAr as string) || (found.nameAr as string)
                : (found.globalCityAr as string) || (found.cityNameAr as string) || (found.nameAr as string) || (found.globalCityEn as string) || (found.nameEn as string);
            if (val) return val;
        }
        if (rawRef.length < 32 && !rawRef.includes("-")) {
            return rawRef;
        }
    }

    const flatVal = locale === "en"
        ? (empRecord.operatingCityEn as string) || (empRecord.cityNameEn as string) || employee.operatingCityAr
        : employee.operatingCityAr || (empRecord.cityNameAr as string) || (empRecord.operatingCityEn as string);

    if (typeof flatVal === "string" && flatVal.trim()) return flatVal.trim();

    return "—";
}

function getWorkTypeDisplay(employee: Employee, workTypes: HrRow[], locale: string): string {
    const empRecord = employee as Record<string, unknown>;

    if (employee.operationalWorkType && typeof employee.operationalWorkType === "object") {
        const wtObj = employee.operationalWorkType as Record<string, unknown>;
        const val = locale === "en"
            ? (wtObj.nameEn || wtObj.nameAr || wtObj.code)
            : (wtObj.nameAr || wtObj.nameEn || wtObj.code);
        if (typeof val === "string" && val.trim()) return val.trim();
    }

    const rawRef = typeof employee.operationalWorkType === "string"
        ? employee.operationalWorkType
        : (empRecord.operationalWorkTypeId as string) || (empRecord.workTypeId as string) || (empRecord.operationalWorkType as string);

    if (rawRef && typeof rawRef === "string") {
        const found = workTypes.find((w) => w.id === rawRef || w.code === rawRef);
        if (found) {
            const val = locale === "en"
                ? (found.nameEn as string) || (found.nameAr as string) || (found.code as string)
                : (found.nameAr as string) || (found.nameEn as string) || (found.code as string);
            if (val) return val;
        }
        if (rawRef.length < 32 && !rawRef.includes("-")) {
            return rawRef;
        }
    }

    const flatVal = locale === "en"
        ? (empRecord.operationalWorkTypeEn as string) || employee.operationalWorkTypeAr || employee.jobTitleAr
        : employee.operationalWorkTypeAr || employee.jobTitleAr || (empRecord.operationalWorkTypeEn as string);

    if (typeof flatVal === "string" && flatVal.trim()) return flatVal.trim();

    return locale === "en" ? "Unspecified" : "غير محدد";
}

function extractAllObjectValues(obj: unknown, visited = new WeakSet()): string[] {
    if (obj === null || obj === undefined) return [];
    if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
        return [String(obj)];
    }
    if (typeof obj === "object") {
        if (visited.has(obj as object)) return [];
        visited.add(obj as object);
        if (Array.isArray(obj)) {
            return obj.flatMap((item) => extractAllObjectValues(item, visited));
        }
        return Object.values(obj).flatMap((val) => extractAllObjectValues(val, visited));
    }
    return [];
}

export default function EmployeesPage() {
    const { locale } = useAuth();
    const t = (key: string) => translate(locale, key);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [cities, setCities] = useState<HrRow[]>([]);
    const [workTypes, setWorkTypes] = useState<HrRow[]>([]);
    const [sponsors, setSponsors] = useState<HrRow[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string[]>([]);
    const [engagementFilter, setEngagementFilter] = useState<string[]>(["SponsoredInternal"]);
    const [nationalityFilter, setNationalityFilter] = useState<string[]>([]);
    const [workTypeFilter, setWorkTypeFilter] = useState<string[]>([]);
    const [platformFilter, setPlatformFilter] = useState<string[]>([]);
    const [cityFilter, setCityFilter] = useState<string[]>([]);
    const [headerStatusFilter, setHeaderStatusFilter] = useState<string[]>([]);
    const [roleFilter, setRoleFilter] = useState<"all" | "employees" | "riders">("all");

    const EMPLOYEES_FILTERS_SESSION_KEY = "admin_employees_filters_session";
    const isRestoredRef = useRef(false);

    // Restore filters on mount for the current session only
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(EMPLOYEES_FILTERS_SESSION_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.search === "string") setSearch(parsed.search);
                if (typeof parsed.statusFilter === "string") setStatusFilter(parsed.statusFilter);
                if (Array.isArray(parsed.engagementFilter)) {
                    setEngagementFilter(parsed.engagementFilter);
                } else if (typeof parsed.engagementFilter === "string") {
                    if (parsed.engagementFilter === "all" || !parsed.engagementFilter) {
                        setEngagementFilter([]);
                    } else {
                        setEngagementFilter([parsed.engagementFilter]);
                    }
                }
                if (Array.isArray(parsed.employeeTypeFilter)) setEmployeeTypeFilter(parsed.employeeTypeFilter);
                if (Array.isArray(parsed.nationalityFilter)) setNationalityFilter(parsed.nationalityFilter);
                if (Array.isArray(parsed.workTypeFilter)) setWorkTypeFilter(parsed.workTypeFilter);
                if (Array.isArray(parsed.platformFilter)) setPlatformFilter(parsed.platformFilter);
                if (Array.isArray(parsed.cityFilter)) setCityFilter(parsed.cityFilter);
                if (Array.isArray(parsed.headerStatusFilter)) setHeaderStatusFilter(parsed.headerStatusFilter);
                if (typeof parsed.roleFilter === "string" && ["all", "employees", "riders"].includes(parsed.roleFilter)) {
                    setRoleFilter(parsed.roleFilter as "all" | "employees" | "riders");
                }
            }
        } catch {
            // ignore JSON parse or sessionStorage errors
        } finally {
            isRestoredRef.current = true;
        }
    }, []);

    // Save filters to sessionStorage for the current session whenever filters change
    useEffect(() => {
        if (!isRestoredRef.current) return;
        try {
            sessionStorage.setItem(
                EMPLOYEES_FILTERS_SESSION_KEY,
                JSON.stringify({
                    search,
                    statusFilter,
                    employeeTypeFilter,
                    engagementFilter,
                    nationalityFilter,
                    workTypeFilter,
                    platformFilter,
                    cityFilter,
                    headerStatusFilter,
                    roleFilter,
                })
            );
        } catch {
            // ignore sessionStorage errors
        }
    }, [search, statusFilter, employeeTypeFilter, engagementFilter, nationalityFilter, workTypeFilter, platformFilter, cityFilter, headerStatusFilter, roleFilter]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setLoading(true);
        setError("");
        Promise.all([
            listEmployees().then((data) => {
                console.log("Employees:", data);
                setEmployees(data);
            }),
            hrCatalogApi.list("operating-cities").then(setCities).catch(() => []),
            hrCatalogApi.list("operational-work-types").then(setWorkTypes).catch(() => []),
            hrCatalogApi.list("sponsors").then(setSponsors).catch(() => []),
        ])
            .catch(() =>
                setError(
                    locale === "en"
                        ? "Unable to load employees or insufficient permissions."
                        : "تعذر تحميل الموظفين أو لا تملك صلاحية عرضهم.",
                ),
            )
            .finally(() => setLoading(false));
    }, [locale]);

    const uniqueSponsors = useMemo(() => {
        const map = new Map<string, { id: string; nameAr: string; nameEn?: string }>();

        sponsors.forEach((s) => {
            const nameAr = (s.nameAr || s.nameEn || s.name || s.code) as string;
            const nameEn = (s.nameEn || s.nameAr || s.name || s.code) as string;
            if (s.id && nameAr) {
                map.set(s.id, { id: s.id, nameAr, nameEn });
            }
        });

        employees.forEach((emp) => {
            const empRec = emp as Record<string, unknown>;
            const sObj = emp.sponsor;
            const sId = sObj?.id || emp.sponsorId || (empRec.sponsorId as string);
            const sNameAr = sObj?.nameAr || emp.sponsorNameAr || (empRec.sponsorNameAr as string);
            const sNameEn = sObj?.nameEn || (empRec.sponsorNameEn as string);

            if (sId && (sNameAr || sNameEn)) {
                if (!map.has(sId)) {
                    map.set(sId, { id: sId, nameAr: sNameAr || sNameEn || sId, nameEn: sNameEn || sNameAr || sId });
                }
            } else if (sNameAr) {
                const key = `name:${sNameAr}`;
                if (!map.has(key)) {
                    map.set(key, { id: key, nameAr: sNameAr, nameEn: sNameEn || sNameAr });
                }
            }
        });

        return Array.from(map.values());
    }, [sponsors, employees]);

    const engagementOptions: FilterOption[] = useMemo(() => {
        const options: FilterOption[] = [
            { value: "SponsoredInternal", label: locale === "en" ? "Company Sponsored" : "على الكفالة" },
        ];

        uniqueSponsors.forEach((sp) => {
            const key = sp.id.startsWith("name:") ? `sponsorName:${sp.nameAr}` : `sponsor:${sp.id}`;
            options.push({
                value: key,
                label: locale === "en" ? (sp.nameEn || sp.nameAr) : sp.nameAr,
            });
        });

        options.push({
            value: "OutsideRider",
            label: locale === "en" ? "External Delegate" : "مندوب خارجي",
        });

        return options;
    }, [uniqueSponsors, locale]);

    const nationalityOptions: FilterOption[] = useMemo(() => {
        const set = new Set<string>();
        employees.forEach((emp) => {
            const empRecord = emp as Record<string, unknown>;
            const nat = (emp.nationality || (empRecord.nationalityAr as string) || "").trim();
            if (nat) set.add(nat);
        });
        return Array.from(set).sort().map((nat) => ({
            value: nat,
            label: nat,
        }));
    }, [employees]);

    const platformOptions: FilterOption[] = useMemo(() => {
        const map = new Map<string, string>();
        employees.forEach((emp) => {
            if (emp.currentWorkPlatform) {
                const id = emp.currentWorkPlatform.id || emp.currentWorkPlatform.code || emp.currentWorkPlatform.nameAr || "";
                const name = locale === "en"
                    ? emp.currentWorkPlatform.nameEn || emp.currentWorkPlatform.nameAr || emp.currentWorkPlatform.code
                    : emp.currentWorkPlatform.nameAr || emp.currentWorkPlatform.nameEn || emp.currentWorkPlatform.code;
                if (id && name) map.set(id, name);
            }
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }, [employees, locale]);

    const cityOptions: FilterOption[] = useMemo(() => {
        const map = new Map<string, string>();
        cities.forEach((c) => {
            const rawName = locale === "en" ? c.nameEn || c.nameAr || c.name || c.code : c.nameAr || c.nameEn || c.name || c.code;
            const name = typeof rawName === "string" ? rawName : "";
            if (c.id && name) map.set(c.id, name);
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }, [cities, locale]);

    const employeeTypeOptions: FilterOption[] = useMemo(() => [
        { value: "Staff", label: locale === "en" ? "Staff" : "إداري" },
        { value: "Delegate", label: locale === "en" ? "Delegate" : "مندوب" },
    ], [locale]);

    const workTypeOptions: FilterOption[] = useMemo(() => {
        const map = new Map<string, string>();
        workTypes.forEach((w) => {
            const rawName = locale === "en" ? w.nameEn || w.nameAr || w.code : w.nameAr || w.nameEn || w.code;
            const name = typeof rawName === "string" ? rawName : "";
            if (w.id && name) map.set(w.id, name);
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }, [workTypes, locale]);

    const statusOptions: FilterOption[] = useMemo(() => {
        return Object.entries(statusLabel).map(([key, val]) => ({
            value: key,
            label: locale === "en" ? val.en : val.ar,
        }));
    }, [locale]);

    const results = useMemo(
        () =>
            employees.filter((item) => {
                const empRecord = item as Record<string, unknown>;

                if (item.status === "Terminated") {
                    return false;
                }

                if (statusFilter !== "all" && item.status !== statusFilter) {
                    return false;
                }

                if (headerStatusFilter.length > 0 && !headerStatusFilter.includes(item.status)) {
                    return false;
                }

                if (roleFilter === "employees" && !item.isEmployee) {
                    return false;
                }
                if (roleFilter === "riders" && item.isEmployee) {
                    return false;
                }

                if (engagementFilter.length > 0) {
                    const relKey = item.engagementType || item.relationshipType;
                    const actualSId = item.sponsorId || item.sponsor?.id || (empRecord.sponsorId as string);
                    const actualNameAr = item.sponsor?.nameAr || item.sponsorNameAr || (empRecord.sponsorNameAr as string);
                    const actualNameEn = item.sponsor?.nameEn;

                    const matchesAny = engagementFilter.some((filterKey) => {
                        if (filterKey === "SponsoredInternal") {
                            return relKey === "SponsoredInternal";
                        }
                        if (filterKey === "OutsideRider") {
                            return relKey === "OutsideRider";
                        }
                        if (filterKey.startsWith("sponsor:")) {
                            const targetId = filterKey.replace("sponsor:", "");
                            return actualSId === targetId;
                        }
                        if (filterKey.startsWith("sponsorName:")) {
                            const targetName = filterKey.replace("sponsorName:", "");
                            return actualNameAr === targetName || actualNameEn === targetName;
                        }
                        return false;
                    });

                    if (!matchesAny) return false;
                }

                if (employeeTypeFilter.length > 0) {
                    const typeVal = item.isEmployee ? "Staff" : "Delegate";
                    if (!employeeTypeFilter.includes(typeVal)) return false;
                }

                if (nationalityFilter.length > 0) {
                    const nat = (item.nationality || (empRecord.nationalityAr as string) || "").trim();
                    if (!nationalityFilter.includes(nat)) return false;
                }

                if (workTypeFilter.length > 0) {
                    const wId = item.operationalWorkType?.id || (empRecord.operationalWorkTypeId as string) || (typeof item.operationalWorkType === "string" ? item.operationalWorkType : "") || "";
                    const wCode = item.operationalWorkType?.code || "";
                    const matchesWorkType = workTypeFilter.includes(wId) || (Boolean(wCode) && workTypeFilter.includes(wCode));
                    if (!matchesWorkType) return false;
                }

                if (platformFilter.length > 0) {
                    const platId = item.currentWorkPlatform?.id || item.currentWorkPlatform?.code || item.currentWorkPlatform?.nameAr || "";
                    if (!platformFilter.includes(platId)) return false;
                }

                if (cityFilter.length > 0) {
                    const cId = item.operatingCity?.id || (empRecord.operatingCityId as string) || (typeof item.operatingCity === "string" ? item.operatingCity : "") || "";
                    const cCode = ((item.operatingCity as unknown) as Record<string, unknown> | null | undefined)?.code as string | undefined || "";
                    const matchesCity = cityFilter.includes(cId) || (Boolean(cCode) && cityFilter.includes(cCode));
                    if (!matchesCity) return false;
                }

                if (!search.trim()) return true;

                const rawValues = extractAllObjectValues(item).join(" ");

                const displayNameAr = item.fullNameAr || "";
                const displayNameEn = item.fullNameEn || "";

                const roleAr = item.isEmployee ? "إداري اداري موظف إداري موظف اداري" : "مندوب سائق مندوب توصيل";
                const roleEn = item.isEmployee ? "Staff Administrative" : "Delegate Rider";

                const secondaryPhones = [
                    item.primaryPhone,
                    item.secondaryPhone,
                    item.email,
                    item.employeeNumber ? `رقم: ${item.employeeNumber} Emp #: ${item.employeeNumber} ${item.employeeNumber}` : "",
                    !item.primaryPhone && !item.secondaryPhone ? "بدون جوال No phone" : "",
                ].filter(Boolean).join(" ");

                const iqamaNo = item.iqamaNo || (empRecord.iqamaNo as string) || "";
                const nationalId = (empRecord.nationalId as string) || "";

                const nationality = [
                    item.nationality,
                    empRecord.nationalityAr as string,
                    empRecord.nationalityEn as string,
                ].filter(Boolean).join(" ");

                const engKey = item.engagementType || item.relationshipType || "";
                const relObj = relationshipLabel[engKey];
                const relationshipStr = [
                    relObj?.ar,
                    relObj?.en,
                    engKey === "SponsoredInternal" ? "على الكفالة علي الكفالة مكفول" : "",
                    engKey === "OutsideRider" ? "مندوب خارجي" : "",
                    item.sponsor?.nameAr,
                    item.sponsor?.nameEn,
                    (item.sponsor as Record<string, unknown>)?.code as string,
                    item.sponsorNameAr,
                    empRecord.sponsorNameEn as string,
                    empRecord.sponsorNameAr as string,
                ].filter(Boolean).join(" ");

                const workTypeAr = getWorkTypeDisplay(item, workTypes, "ar");
                const workTypeEn = getWorkTypeDisplay(item, workTypes, "en");
                const professionDetails = [
                    workTypeAr,
                    workTypeEn,
                    item.operationalWorkTypeAr,
                    empRecord.operationalWorkTypeEn as string,
                    item.jobTitleAr,
                    empRecord.jobTitleEn as string,
                    empRecord.jobTitle as string,
                    item.rider?.tShirtSize ? `المقاس: ${item.rider.tShirtSize} Size: ${item.rider.tShirtSize} ${item.rider.tShirtSize}` : "",
                    empRecord.residencyProfession as string,
                    empRecord.professionAr as string,
                    empRecord.professionEn as string,
                ].filter(Boolean).join(" ");

                const platformDetails = [
                    item.currentWorkPlatform?.nameAr,
                    item.currentWorkPlatform?.nameEn,
                    item.currentWorkPlatform?.code,
                    item.currentWorkPlatform?.paymentModel === "PayPerOrder" ? "بالطلب Pay Per Order" : "",
                    item.currentWorkPlatform?.paymentModel === "Salary" ? "راتب Salary" : "",
                    item.currentWorkPlatform?.paymentModel,
                    item.currentWorkPlatform?.externalAccountId,
                    item.currentWorkPlatform?.platformRiderAccountId,
                ].filter(Boolean).join(" ");

                const cityAr = getCityDisplay(item, cities, "ar");
                const cityEn = getCityDisplay(item, cities, "en");
                const housingStr = (item.housingNameAr || item.housingNameEn || (empRecord.housingNameAr as string) || (empRecord.housingNameEn as string) || (empRecord.housingName as string) || "") as string;
                const locationDetails = [
                    cityAr,
                    cityEn,
                    item.operatingCityAr,
                    empRecord.operatingCityEn as string,
                    empRecord.cityNameAr as string,
                    empRecord.cityNameEn as string,
                    housingStr,
                ].filter(Boolean).join(" ");

                const statusObj = statusLabel[item.status];
                const statusDetails = [
                    statusObj?.ar,
                    statusObj?.en,
                    item.status,
                ].filter(Boolean).join(" ");

                return matchesArabicSearch(
                    search,
                    displayNameAr,
                    displayNameEn,
                    roleAr,
                    roleEn,
                    secondaryPhones,
                    iqamaNo,
                    nationalId,
                    nationality,
                    relationshipStr,
                    professionDetails,
                    platformDetails,
                    locationDetails,
                    statusDetails,
                    rawValues,
                );
            }),
        [employees, search, cities, workTypes, locale, statusFilter, headerStatusFilter, employeeTypeFilter, engagementFilter, nationalityFilter, workTypeFilter, platformFilter, cityFilter, roleFilter],
    );

    const [exporting, setExporting] = useState(false);

    const handleExportExcel = async () => {
        if (results.length === 0) {
            return;
        }
        setExporting(true);
        try {
            await exportToExcel({
                filename: `employees-${new Date().toISOString().split("T")[0]}`,
                sheetName: locale === "en" ? "Employees" : "الموظفين",
                data: results,
                columns: [
                    { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
                    {
                        header: locale === "en" ? "Employee Name" : "اسم الموظف",
                        accessor: (emp) => locale === "en" ? (emp.fullNameEn || emp.fullNameAr) : (emp.fullNameAr || emp.fullNameEn),
                        width: 28,
                    },
                    {
                        header: locale === "en" ? "Type" : "نوع الكادر",
                        accessor: (emp) => emp.isEmployee ? (locale === "en" ? "Staff" : "إداري") : (locale === "en" ? "Delegate" : "مندوب"),
                        width: 14,
                    },
                    {
                        header: locale === "en" ? "Iqama / National ID" : "رقم الهوية / الإقامة",
                        accessor: (emp) => emp.iqamaNo || (emp as any).nationalId || "—",
                        width: 20,
                        isText: true,
                    },
                    {
                        header: locale === "en" ? "Primary Phone" : "رقم الجوال",
                        accessor: (emp) => emp.primaryPhone || "—",
                        width: 18,
                        isText: true,
                    },
                    {
                        header: locale === "en" ? "Nationality" : "الجنسية",
                        accessor: (emp) => emp.nationality || (emp as any).nationalityAr || "—",
                        width: 16,
                    },
                    {
                        header: locale === "en" ? "Sponsor / Registry" : "الكفيل / السجل",
                        accessor: (emp) => {
                            const empRec = emp as Record<string, unknown>;
                            return (locale === "en"
                                ? emp.sponsor?.nameEn || emp.sponsor?.nameAr
                                : emp.sponsor?.nameAr || emp.sponsor?.nameEn) ||
                                (empRec.sponsorNameAr as string) ||
                                "—";
                        },
                        width: 24,
                    },
                    {
                        header: locale === "en" ? "Operational Role" : "الدور التشغيلي",
                        accessor: (emp) => getWorkTypeDisplay(emp, workTypes, locale),
                        width: 22,
                    },
                    {
                        header: locale === "en" ? "Operating City" : "المدينة التشغيلية",
                        accessor: (emp) => getCityDisplay(emp, cities, locale),
                        width: 18,
                    },
                    {
                        header: locale === "en" ? "Status" : "الحالة",
                        accessor: (emp) => {
                            const st = statusLabel[emp.status];
                            return st ? (locale === "en" ? st.en : st.ar) : emp.status;
                        },
                        width: 16,
                    },
                ],
            });
        } catch (err) {
            console.error("Failed to export employees:", err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-[#1167c9]">
                        {t("nav.hr")}
                    </p>
                    <h1 className="mt-1 text-3xl font-black">{t("employees.title")}</h1>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                        {locale === "en"
                            ? "Manage administrative staff, delegates, and operational files."
                            : "إدارة بيانات الإداريين والمناديب وملفاتهم التشغيلية."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleExportExcel}
                        loading={exporting}
                        disabled={exporting || loading || results.length === 0}
                        className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
                    >
                        <FileSpreadsheet size={16} />
                        {locale === "en" ? "Export Excel" : "تصدير إكسل"}
                    </Button>
                    <Link href="/admin/hr/forms">
                        <Button variant="secondary">
                            <FileText size={17} />
                            {locale === "en" ? "HR Forms & Clearance" : "نماذج الموارد البشرية والمخالصات"}
                        </Button>
                    </Link>
                    <Link href="/admin/employees/new">
                        <Button>
                            <Plus size={17} />
                            {t("employees.newEmployee")}
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1 max-w-5xl">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[240px]">
                            <Search
                                className={`pointer-events-none absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"}`}
                                size={18}
                            />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={
                                    locale === "en"
                                        ? "Search by name, Iqama #, role (Staff/Delegate), platform, sponsor, city, or status..."
                                        : "ابحث بالاسم، رقم الإقامة، الدور (إداري/مندوب)، المنصة، الكفيل، المدينة، الحالة..."
                                }
                                className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
                            />
                        </div>

                        {/* Top Status Filter */}
                        <div className="w-[95px] shrink-0">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold text-[var(--foreground)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1167c9]"
                            >
                                <option value="all">
                                    {locale === "en" ? "Status" : "الحالة"}
                                </option>
                                {Object.entries(statusLabel).map(([key, val]) => (
                                    <option key={key} value={key}>
                                        {locale === "en" ? val.en : val.ar}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Role Filter (Employees / Riders / All) */}
                        <div className="w-[95px] shrink-0">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as "all" | "employees" | "riders")}
                                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold text-[var(--foreground)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1167c9]"
                            >
                                <option value="all">
                                    {locale === "en" ? "Role" : "العمل"}
                                </option>
                                <option value="employees">
                                    {locale === "en" ? "Staff" : "إداري"}
                                </option>
                                <option value="riders">
                                    {locale === "en" ? "Riders" : "مناديب"}
                                </option>
                            </select>
                        </div>

                        {(search ||
                            statusFilter !== "all" ||
                            roleFilter !== "all" ||
                            employeeTypeFilter.length > 0 ||
                            workTypeFilter.length > 0 ||
                            engagementFilter.length !== 1 ||
                            engagementFilter[0] !== "SponsoredInternal" ||
                            nationalityFilter.length > 0 ||
                            platformFilter.length > 0 ||
                            cityFilter.length > 0 ||
                            headerStatusFilter.length > 0) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch("");
                                        setStatusFilter("all");
                                        setEmployeeTypeFilter([]);
                                        setEngagementFilter(["SponsoredInternal"]);
                                        setNationalityFilter([]);
                                        setWorkTypeFilter([]);
                                        setPlatformFilter([]);
                                        setCityFilter([]);
                                        setHeaderStatusFilter([]);
                                        setRoleFilter("all");
                                        try {
                                            sessionStorage.removeItem(EMPLOYEES_FILTERS_SESSION_KEY);
                                        } catch { }
                                    }}
                                    className="h-11 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors shrink-0"
                                >
                                    {locale === "en" ? "Reset Filters" : "إعادة ضبط"}
                                </button>
                            )}
                    </div>

                    <span className="flex items-center gap-2 text-sm font-bold text-[var(--muted)] shrink-0">
                        <UsersRound size={18} />
                        {results.length}{" "}
                        {locale === "en" ? "employees" : "موظف"}
                    </span>
                </div>

                {/* Active Column Filter Badges */}
                {(employeeTypeFilter.length > 0 ||
                    nationalityFilter.length > 0 ||
                    workTypeFilter.length > 0 ||
                    platformFilter.length > 0 ||
                    cityFilter.length > 0 ||
                    headerStatusFilter.length > 0 ||
                    engagementFilter.length !== 1 ||
                    engagementFilter[0] !== "SponsoredInternal") && (
                        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/70">
                            <span className="text-[11px] font-bold text-[var(--muted)]">
                                {locale === "en" ? "Column filters:" : "فلاتر الأعمدة:"}
                            </span>
                            {employeeTypeFilter.map((t) => {
                                const opt = employeeTypeOptions.find((o) => o.value === t);
                                return (
                                    <span
                                        key={t}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                    >
                                        <span>{opt?.label || t}</span>
                                        <button
                                            type="button"
                                            onClick={() => setEmployeeTypeFilter((prev) => prev.filter((x) => x !== t))}
                                            className="hover:text-red-500 rounded-full"
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                );
                            })}
                            {nationalityFilter.map((nat) => (
                                <span
                                    key={nat}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                >
                                    <span>{nat}</span>
                                    <button
                                        type="button"
                                        onClick={() => setNationalityFilter((prev) => prev.filter((x) => x !== nat))}
                                        className="hover:text-red-500 rounded-full"
                                    >
                                        <X size={11} />
                                    </button>
                                </span>
                            ))}
                            {engagementFilter.map((eng) => {
                                const opt = engagementOptions.find((o) => o.value === eng);
                                return (
                                    <span
                                        key={eng}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    >
                                        <span>{opt?.label || eng}</span>
                                        <button
                                            type="button"
                                            onClick={() => setEngagementFilter((prev) => prev.filter((x) => x !== eng))}
                                            className="hover:text-red-500 rounded-full"
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                );
                            })}
                            {workTypeFilter.map((wId) => {
                                const opt = workTypeOptions.find((o) => o.value === wId);
                                return (
                                    <span
                                        key={wId}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                                    >
                                        <span>{opt?.label || wId}</span>
                                        <button
                                            type="button"
                                            onClick={() => setWorkTypeFilter((prev) => prev.filter((x) => x !== wId))}
                                            className="hover:text-red-500 rounded-full"
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                );
                            })}
                            {platformFilter.map((plat) => {
                                const opt = platformOptions.find((o) => o.value === plat);
                                return (
                                    <span
                                        key={plat}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                    >
                                        <span>{opt?.label || plat}</span>
                                        <button
                                            type="button"
                                            onClick={() => setPlatformFilter((prev) => prev.filter((x) => x !== plat))}
                                            className="hover:text-red-500 rounded-full"
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                );
                            })}
                            {cityFilter.map((c) => {
                                const opt = cityOptions.find((o) => o.value === c);
                                return (
                                    <span
                                        key={c}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    >
                                        <span>{opt?.label || c}</span>
                                        <button
                                            type="button"
                                            onClick={() => setCityFilter((prev) => prev.filter((x) => x !== c))}
                                            className="hover:text-red-500 rounded-full"
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                );
                            })}
                            {headerStatusFilter.map((st) => {
                                const opt = statusOptions.find((o) => o.value === st);
                                return (
                                    <span
                                        key={st}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                    >
                                        <span>{opt?.label || st}</span>
                                        <button
                                            type="button"
                                            onClick={() => setHeaderStatusFilter((prev) => prev.filter((x) => x !== st))}
                                            className="hover:text-red-500 rounded-full"
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => {
                                    setEmployeeTypeFilter([]);
                                    setNationalityFilter([]);
                                    setEngagementFilter(["SponsoredInternal"]);
                                    setWorkTypeFilter([]);
                                    setPlatformFilter([]);
                                    setCityFilter([]);
                                    setHeaderStatusFilter([]);
                                }}
                                className="text-[11px] text-red-600 dark:text-red-400 hover:underline ms-2 font-medium"
                            >
                                {locale === "en" ? "Clear column filters" : "مسح فلاتر الأعمدة"}
                            </button>
                        </div>
                    )}
                {error ? (
                    <p role="alert" className="p-6 text-red-700">
                        {error}
                    </p>
                ) : loading ? (
                    <div className="p-10 text-center text-sm text-[var(--muted)]">
                        {locale === "en" ? "Loading employee directory..." : "جاري تحميل دليل الموظفين..."}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className={`min-w-[1180px] w-full ${locale === "en" ? "text-left" : "text-right"}`}>
                            <thead className="relative z-30 bg-slate-500/10 text-xs font-bold text-[var(--muted)]">
                                <tr>
                                    <th className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>{locale === "en" ? "Employee" : "الموظف"}</span>
                                            <TableHeaderColumnFilter
                                                label={locale === "en" ? "Employee Type" : "نوع الكادر"}
                                                value={employeeTypeFilter}
                                                onChange={(val) => setEmployeeTypeFilter(val)}
                                                options={employeeTypeOptions}
                                                placeholder={locale === "en" ? "Filter by type..." : "تصفية بنوع الكادر..."}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-5 py-4">
                                        {locale === "en" ? "Iqama / National ID" : "رقم الهوية / الإقامة"}
                                    </th>
                                    <th className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>{locale === "en" ? "Nationality" : "الجنسية"}</span>
                                            <TableHeaderColumnFilter
                                                label={locale === "en" ? "Nationality" : "الجنسية"}
                                                value={nationalityFilter}
                                                onChange={(val) => setNationalityFilter(val)}
                                                options={nationalityOptions}
                                                placeholder={locale === "en" ? "Filter by nationality..." : "تصفية بالجنسية..."}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>{locale === "en" ? "Relationship & Sponsor" : "الكفيل"}</span>
                                            <TableHeaderColumnFilter
                                                label={locale === "en" ? "Relationship & Sponsor" : "الكفيل"}
                                                value={engagementFilter}
                                                onChange={(val) => setEngagementFilter(val)}
                                                options={engagementOptions}
                                                placeholder={locale === "en" ? "Filter by sponsor..." : "تصفية بالكفيل..."}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>{locale === "en" ? "Operational Role" : "الدور التشغيلي"}</span>
                                            <TableHeaderColumnFilter
                                                label={locale === "en" ? "Operational Role" : "الدور التشغيلي"}
                                                value={workTypeFilter}
                                                onChange={(val) => setWorkTypeFilter(val)}
                                                options={workTypeOptions}
                                                placeholder={locale === "en" ? "Filter by role..." : "تصفية بالدور..."}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>{locale === "en" ? "Work Platform" : "منصة العمل"}</span>
                                            <TableHeaderColumnFilter
                                                label={locale === "en" ? "Work Platform" : "منصة العمل"}
                                                value={platformFilter}
                                                onChange={(val) => setPlatformFilter(val)}
                                                options={platformOptions}
                                                placeholder={locale === "en" ? "Filter by platform..." : "تصفية بالمنصة..."}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>{locale === "en" ? "City" : "المدينة"}</span>
                                            <TableHeaderColumnFilter
                                                label={locale === "en" ? "City" : "المدينة"}
                                                value={cityFilter}
                                                onChange={(val) => setCityFilter(val)}
                                                options={cityOptions}
                                                placeholder={locale === "en" ? "Filter by city..." : "تصفية بالمدينة..."}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>{t("common.status")}</span>
                                            <TableHeaderColumnFilter
                                                label={t("common.status")}
                                                value={headerStatusFilter}
                                                onChange={(val) => setHeaderStatusFilter(val)}
                                                options={statusOptions}
                                                placeholder={locale === "en" ? "Filter by status..." : "تصفية بالحالة..."}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-5 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)] text-sm">
                                {results.map((employee) => {
                                    const empRecord = employee as Record<string, unknown>;

                                    const displayName =
                                        locale === "en"
                                            ? employee.fullNameEn || employee.fullNameAr
                                            : employee.fullNameAr || employee.fullNameEn;

                                    const secondaryInfo =
                                        employee.primaryPhone ||
                                        employee.secondaryPhone ||
                                        employee.email ||
                                        (employee.employeeNumber ? `${locale === "en" ? "Emp #" : "رقم"}: ${employee.employeeNumber}` : null) ||
                                        (locale === "en" ? "No phone" : "بدون جوال");

                                    const nationalityText =
                                        employee.nationality ||
                                        (empRecord.nationalityAr as string) ||
                                        "—";

                                    const sponsorName =
                                        (locale === "en"
                                            ? employee.sponsor?.nameEn || employee.sponsor?.nameAr
                                            : employee.sponsor?.nameAr || employee.sponsor?.nameEn) ||
                                        (empRecord.sponsorNameAr as string) ||
                                        null;

                                    const engKey = employee.engagementType || employee.relationshipType;
                                    const relText = engKey && relationshipLabel[engKey]
                                        ? locale === "en"
                                            ? relationshipLabel[engKey].en
                                            : relationshipLabel[engKey].ar
                                        : engKey || "—";

                                    const workType = getWorkTypeDisplay(employee, workTypes, locale);

                                    const subDetail = employee.rider?.tShirtSize
                                        ? `${locale === "en" ? "Size: " : "المقاس: "}${employee.rider.tShirtSize}`
                                        : (empRecord.residencyProfession as string) || null;

                                    const city = getCityDisplay(employee, cities, locale);
                                    const housingName = (locale === "en"
                                        ? employee.housingNameEn || employee.housingNameAr || (empRecord.housingNameEn as string) || (empRecord.housingNameAr as string) || (empRecord.housingName as string)
                                        : employee.housingNameAr || employee.housingNameEn || (empRecord.housingNameAr as string) || (empRecord.housingNameEn as string) || (empRecord.housingName as string)) || null;

                                    const stObj = statusLabel[employee.status];
                                    const stText = stObj
                                        ? locale === "en"
                                            ? stObj.en
                                            : stObj.ar
                                        : employee.status;

                                    return (
                                        <tr key={employee.id} className="hover:bg-blue-500/5 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-900">{displayName}</span>
                                                    <span
                                                        className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${employee.isEmployee
                                                            ? "bg-purple-100 text-purple-700"
                                                            : "bg-blue-100 text-blue-700"
                                                            }`}
                                                    >
                                                        {employee.isEmployee
                                                            ? (locale === "en" ? "Staff" : "إداري")
                                                            : (locale === "en" ? "Delegate" : "مندوب")}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 text-xs font-semibold text-[var(--muted)]" dir="auto">
                                                    {secondaryInfo}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-mono font-bold text-slate-700">
                                                {employee.iqamaNo ?? "—"}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-slate-700">
                                                {nationalityText}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-slate-700">{relText}</div>
                                                {sponsorName && (
                                                    <div className="mt-0.5 text-xs font-semibold text-blue-600">
                                                        {sponsorName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-slate-700">{workType}</div>
                                                {subDetail && (
                                                    <div className="mt-0.5 text-xs font-semibold text-[var(--muted)]">
                                                        {subDetail}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                {employee.currentWorkPlatform ? (
                                                    <div>
                                                        <div className="font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
                                                            <span>
                                                                {employee.currentWorkPlatform.nameAr || employee.currentWorkPlatform.nameEn || employee.currentWorkPlatform.code || "—"}
                                                            </span>
                                                            {employee.currentWorkPlatform.paymentModel && (
                                                                <Badge className={`text-[10px] px-1.5 py-0.5 ${employee.currentWorkPlatform.paymentModel === "Salary" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                                                    {employee.currentWorkPlatform.paymentModel === "PayPerOrder"
                                                                        ? (locale === "en" ? "Pay Per Order" : "بالطلب")
                                                                        : employee.currentWorkPlatform.paymentModel === "Salary"
                                                                            ? (locale === "en" ? "Salary" : "راتب")
                                                                            : employee.currentWorkPlatform.paymentModel}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {(employee.currentWorkPlatform.externalAccountId || employee.currentWorkPlatform.platformRiderAccountId) && (
                                                            <div className="mt-0.5 text-xs font-mono font-semibold text-[#1167c9]">
                                                                {employee.currentWorkPlatform.externalAccountId || employee.currentWorkPlatform.platformRiderAccountId}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--muted)] font-bold">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-slate-700">{city}</div>
                                                {housingName && (
                                                    <div className="mt-0.5 text-xs font-semibold text-[var(--muted)]">
                                                        {housingName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${employee.status === "Active"
                                                        ? "bg-emerald-500/10 text-emerald-700"
                                                        : "bg-slate-500/10 text-slate-600"
                                                        }`}
                                                >
                                                    {stText}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    className="inline-flex min-h-8 items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-[#1167c9] hover:bg-blue-100 transition-colors"
                                                    href={`/admin/employees/${employee.id}`}
                                                >
                                                    {locale === "en" ? "View Profile" : "عرض الملف"}
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!results.length && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="p-10 text-center text-sm font-bold text-[var(--muted)]"
                                        >
                                            {locale === "en"
                                                ? "No matching employees found."
                                                : "لا توجد نتائج مطابقة."}
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
