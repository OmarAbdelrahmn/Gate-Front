"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UsersRound } from "lucide-react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { translate } from "../../../lib/i18n";
import { hrCatalogApi, type HrRow } from "../../../lib/hr/api";
import { listEmployees } from "../../../lib/workforce/api";
import type { Employee } from "../../../lib/workforce/types";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

const statusLabel: Record<string, { ar: string; en: string }> = {
  Active: { ar: "نشط", en: "Active" },
  Suspended: { ar: "موقوف", en: "Suspended" },
  Archived: { ar: "مؤرشف", en: "Archived" },
  Inactive: { ar: "غير نشط", en: "Inactive" },
  Draft: { ar: "مسودة", en: "Draft" },
  Onboarding: { ar: "قيد التهيئة", en: "Onboarding" },
  OnLeave: { ar: "في إجازة", en: "On Leave" },
  Terminated: { ar: "منتهي", en: "Terminated" },
};

const relationshipLabel: Record<string, { ar: string; en: string }> = {
  SponsoredInternal: { ar: "موظف مكفول داخليًا", en: "Internal Sponsored Employee" },
  OutsideRider: { ar: "رايدر خارجي", en: "External Rider" },
};

export default function EmployeesPage() {
  const { locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<HrRow[]>([]);
  const [workTypes, setWorkTypes] = useState<HrRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      listEmployees().then(setEmployees),
      hrCatalogApi.list("operating-cities").then(setCities).catch(() => []),
      hrCatalogApi.list("operational-work-types").then(setWorkTypes).catch(() => []),
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

  const results = useMemo(
    () =>
      employees.filter((item) =>
        `${item.employeeNumber ?? ""} ${item.iqamaNo ?? ""} ${item.fullNameAr} ${item.fullNameEn ?? ""} ${item.primaryPhone ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [employees, search],
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4">
          <div className="relative w-full max-w-xl">
            <Search
              className={`pointer-events-none absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"}`}
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                locale === "en"
                  ? "Search by name, Iqama #, employee #, or phone..."
                  : "ابحث بالاسم، رقم الإقامة، الرقم الوظيفي، أو الجوال..."
              }
              className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-3 text-sm ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
            />
          </div>
          <span className="flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
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
          <p className="p-8 text-center text-sm text-[var(--muted)]">
            {t("common.loading")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-[900px] w-full ${locale === "en" ? "text-left" : "text-right"}`}>
              <thead className="bg-slate-500/10 text-xs font-bold text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4">
                    {locale === "en" ? "Employee" : "الموظف"}
                  </th>
                  <th className="px-5 py-4">
                    {locale === "en" ? "Iqama / National ID" : "رقم الهوية / الإقامة"}
                  </th>
                  <th className="px-5 py-4">
                    {locale === "en" ? "Relationship" : "العلاقة"}
                  </th>
                  <th className="px-5 py-4">
                    {locale === "en" ? "Operational Role" : "الدور التشغيلي"}
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
                    employee.primaryPhone ??
                    (empRecord.secondaryPhone as string) ??
                    (employee.employeeNumber ? `${locale === "en" ? "Emp #" : "رقم"}: ${employee.employeeNumber}` : null) ??
                    (locale === "en" ? "No phone" : "بدون جوال");

                  const engKey = employee.engagementType || employee.relationshipType;
                  const relText = engKey && relationshipLabel[engKey]
                    ? locale === "en"
                      ? relationshipLabel[engKey].en
                      : relationshipLabel[engKey].ar
                    : engKey ?? "—";

                  const wtRow = workTypes.find(
                    (w) => w.id === (empRecord.operationalWorkTypeId as string),
                  );
                  const workType = String(
                    locale === "en"
                      ? (empRecord.operationalWorkTypeEn as string | undefined) ??
                        wtRow?.nameEn ??
                        employee.operationalWorkTypeAr ??
                        wtRow?.nameAr ??
                        "Unspecified"
                      : employee.operationalWorkTypeAr ??
                        wtRow?.nameAr ??
                        (empRecord.operationalWorkTypeEn as string | undefined) ??
                        "غير محدد",
                  );

                  const cityRow = cities.find(
                    (c) =>
                      c.id === (empRecord.operatingCityId as string) ||
                      c.id === (empRecord.cityId as string),
                  );
                  const city = String(
                    locale === "en"
                      ? (empRecord.operatingCityEn as string | undefined) ??
                        cityRow?.nameEn ??
                        employee.operatingCityAr ??
                        cityRow?.nameAr ??
                        "—"
                      : employee.operatingCityAr ??
                        cityRow?.nameAr ??
                        (empRecord.operatingCityEn as string | undefined) ??
                        "—",
                  );

                  const stObj = statusLabel[employee.status];
                  const stText = stObj
                    ? locale === "en"
                      ? stObj.en
                      : stObj.ar
                    : employee.status;

                  return (
                    <tr key={employee.id} className="hover:bg-blue-500/5 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900">{displayName}</div>
                        <div className="mt-0.5 text-xs font-semibold text-[var(--muted)]" dir="auto">
                          {secondaryInfo}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-700">
                        {employee.iqamaNo ?? "—"}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        {relText}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        {workType}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        {city}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                            employee.status === "Active"
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
                      colSpan={7}
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
