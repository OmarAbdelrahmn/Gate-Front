"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Filter, Plus, Search, UsersRound } from "lucide-react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { translate } from "../../../lib/i18n";
import { hrCatalogApi, type HrRow } from "../../../lib/hr/api";
import { listEmployees } from "../../../lib/workforce/api";
import type { Employee } from "../../../lib/workforce/types";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";

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
    const [engagementFilter, setEngagementFilter] = useState<string>("SponsoredInternal");
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const filterBtnRef = useRef<HTMLButtonElement>(null);
    const [popupCoords, setPopupCoords] = useState<{ top: number; left?: number; right?: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const toggleFilterPopup = () => {
        if (!showFilterPopup && filterBtnRef.current) {
            const rect = filterBtnRef.current.getBoundingClientRect();
            if (locale === "en") {
                setPopupCoords({ top: rect.bottom + 6, left: rect.left });
            } else {
                setPopupCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
            }
        }
        setShowFilterPopup((prev) => !prev);
    };

    useEffect(() => {
        setLoading(true);
        setError("");
        Promise.all([
            listEmployees().then(setEmployees),
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

    const engagementOptions = useMemo(() => {
        const options: { key: string; labelAr: string; labelEn: string }[] = [
            { key: "all", labelAr: "الكل", labelEn: "All " },
            { key: "SponsoredInternal", labelAr: "على الكفالة", labelEn: "Company Sponsored" },
        ];

        uniqueSponsors.forEach((sp) => {
            const key = sp.id.startsWith("name:") ? `sponsorName:${sp.nameAr}` : `sponsor:${sp.id}`;
            options.push({
                key,
                labelAr: `${sp.nameAr}`,
                labelEn: `${sp.nameEn || sp.nameAr}`,
            });
        });

        options.push({
            key: "OutsideRider",
            labelAr: "مندوب خارجي",
            labelEn: "External Delegate",
        });

        return options;
    }, [uniqueSponsors]);

    const results = useMemo(
        () =>
            employees.filter((item) => {
                if (statusFilter !== "all" && item.status !== statusFilter) {
                    return false;
                }

                if (engagementFilter !== "all") {
                    const empRec = item as Record<string, unknown>;
                    const relKey = item.engagementType || item.relationshipType;

                    if (engagementFilter === "SponsoredInternal") {
                        if (relKey !== "SponsoredInternal") return false;
                    } else if (engagementFilter === "OutsideRider") {
                        if (relKey !== "OutsideRider") return false;
                    } else if (engagementFilter.startsWith("sponsor:")) {
                        const targetId = engagementFilter.replace("sponsor:", "");
                        const actualSId = item.sponsorId || item.sponsor?.id || (empRec.sponsorId as string);
                        if (actualSId !== targetId) return false;
                    } else if (engagementFilter.startsWith("sponsorName:")) {
                        const targetName = engagementFilter.replace("sponsorName:", "");
                        const actualNameAr = item.sponsor?.nameAr || item.sponsorNameAr || (empRec.sponsorNameAr as string);
                        const actualNameEn = item.sponsor?.nameEn;
                        if (actualNameAr !== targetName && actualNameEn !== targetName) return false;
                    }
                }

                const searchTerm = search.trim().toLowerCase();
                if (!searchTerm) return true;

                const empRecord = item as Record<string, unknown>;
                const rawValues = extractAllObjectValues(item).join(" ");
                
                const workTypeStr = getWorkTypeDisplay(item, workTypes, locale);
                const cityStr = getCityDisplay(item, cities, locale);
                const housingStr = (item.housingNameAr || item.housingNameEn || (empRecord.housingNameAr as string) || (empRecord.housingNameEn as string) || (empRecord.housingName as string) || "") as string;
                
                const statusObj = statusLabel[item.status];
                const statusAr = statusObj?.ar || "";
                const statusEn = statusObj?.en || "";
                
                const engKey = item.engagementType || item.relationshipType || "";
                const relObj = relationshipLabel[engKey];
                const relAr = relObj?.ar || "";
                const relEn = relObj?.en || "";
                
                const roleAr = item.isEmployee ? "إداري" : "مندوب";
                const roleEn = item.isEmployee ? "Staff" : "Delegate";
                
                const pm = item.currentWorkPlatform?.paymentModel;
                const pmAr = pm === "PayPerOrder" ? "بالطلب" : pm === "Salary" ? "راتب" : "";
                const pmEn = pm === "PayPerOrder" ? "Pay Per Order" : pm === "Salary" ? "Salary" : "";

                const fullSearchableText = `${rawValues} ${workTypeStr} ${cityStr} ${housingStr} ${statusAr} ${statusEn} ${relAr} ${relEn} ${roleAr} ${roleEn} ${pmAr} ${pmEn}`
                    .toLowerCase();

                const searchWords = searchTerm.split(/\s+/);
                return searchWords.every((word) => fullSearchableText.includes(word));
            }),
        [employees, search, cities, workTypes, locale, statusFilter, engagementFilter],
    );

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
                <Link href="/dashboard/employees/new">
                    <Button>
                        <Plus size={17} />
                        {t("employees.newEmployee")}
                    </Button>
                </Link>
            </div>

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1 max-w-4xl">
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
                                        ? "Search by name, Iqama #, platform, sponsor, nationality, or phone..."
                                        : "ابحث بالاسم، رقم الإقامة، المنصة، الكفيل، الجنسية، الجوال..."
                                }
                                className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
                            />
                        </div>

                        {/* Top Status Filter */}
                        <div className="min-w-[160px]">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--foreground)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1167c9]"
                            >
                                <option value="all">
                                    {locale === "en" ? "Status: All" : "الحالة: جميع الحالات"}
                                </option>
                                {Object.entries(statusLabel).map(([key, val]) => (
                                    <option key={key} value={key}>
                                        {locale === "en" ? val.en : val.ar}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <span className="flex items-center gap-2 text-sm font-bold text-[var(--muted)] shrink-0">
                        <UsersRound size={18} />
                        {results.length}{" "}
                        {locale === "en" ? "employees" : "موظف"}
                    </span>
                </div>
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
                                        {locale === "en" ? "Employee" : "الموظف"}
                                    </th>
                                    <th className="px-5 py-4">
                                        {locale === "en" ? "Iqama / National ID" : "رقم الهوية / الإقامة"}
                                    </th>
                                    <th className="px-5 py-4">
                                        {locale === "en" ? "Nationality" : "الجنسية"}
                                    </th>
                                    <th className="px-5 py-4 relative">
                                        <div className="flex items-center gap-2">
                                            <span>{locale === "en" ? "Relationship & Sponsor" : "الكفيل"}</span>
                                            <div className="relative inline-block text-right">
                                                <button
                                                    ref={filterBtnRef}
                                                    type="button"
                                                    onClick={toggleFilterPopup}
                                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-bold transition-all ${
                                                        engagementFilter !== "all"
                                                            ? "border-[#1167c9] bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400"
                                                            : "border-[var(--border)] text-[var(--muted)] hover:bg-slate-200/60 dark:hover:bg-slate-800"
                                                    }`}
                                                    title={locale === "en" ? "Filter by relationship / sponsor" : "تصفية الكفيل والعلاقة"}
                                                >
                                                    <Filter size={13} />
                                                    {engagementFilter !== "all" && (
                                                        <span className="inline-block size-1.5 rounded-full bg-[#1167c9]" />
                                                    )}
                                                </button>

                                                {showFilterPopup && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-[9998] bg-transparent"
                                                            onClick={() => setShowFilterPopup(false)}
                                                        />
                                                        <div
                                                            style={{
                                                                top: popupCoords?.top ?? 0,
                                                                ...(locale === "en"
                                                                    ? { left: popupCoords?.left ?? 0 }
                                                                    : { right: popupCoords?.right ?? 0 }),
                                                            }}
                                                            className="fixed z-[9999] max-h-72 overflow-y-auto w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl"
                                                        >
                                                            <div className="px-2.5 py-1 text-[11px] font-black text-[var(--muted)] border-b border-[var(--border)] mb-1">
                                                                {locale === "en" ? "Filter Relationship & Sponsor" : "تصفية الكفيل ونوع العلاقة"}
                                                            </div>
                                                            {engagementOptions.map((opt) => (
                                                                <button
                                                                    key={opt.key}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEngagementFilter(opt.key);
                                                                        setShowFilterPopup(false);
                                                                    }}
                                                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors text-right ${
                                                                        engagementFilter === opt.key
                                                                            ? "bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400"
                                                                            : "text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                    }`}
                                                                >
                                                                    <span className="truncate">{locale === "en" ? opt.labelEn : opt.labelAr}</span>
                                                                    {engagementFilter === opt.key && <Check size={14} className="text-[#1167c9] dark:text-blue-400 shrink-0 ms-1" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-5 py-4">
                                        {locale === "en" ? "Operational Role" : "الدور التشغيلي"}
                                    </th>
                                    <th className="px-5 py-4">
                                        {locale === "en" ? "Work Platform" : "منصة العمل"}
                                    </th>
                                    <th className="px-5 py-4">
                                        {locale === "en" ? "City" : "المدينة"}
                                    </th>
                                    <th className="px-5 py-4">{t("common.status")}</th>
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
                                                    href={`/dashboard/employees/${employee.id}`}
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
