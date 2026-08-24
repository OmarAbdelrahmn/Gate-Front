"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building,
  CalendarDays,
  ContactRound,
  FileText,
  Pencil,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { translate } from "../../../../lib/i18n";
import { hrCatalogApi, type HrRow } from "../../../../lib/hr/api";
import { getEmployee } from "../../../../lib/workforce/api";
import type {
  EmployeeDetails,
  OperationalAssignment,
  Period,
} from "../../../../lib/workforce/types";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { EmployeeComplianceTabs } from "../../../../components/employees/EmployeeComplianceTabs";
import { EmployeeDocumentsInsurance } from "../../../../components/employees/EmployeeDocumentsInsurance";
import { EmployeePlatformAccounts } from "../../../../components/employees/EmployeePlatformAccounts";

const relationshipLabels: Record<string, { ar: string; en: string }> = {
  SponsoredInternal: { ar: "على الكفالة", en: "Internal Sponsored Employee" },
  OutsideRider: { ar: "رايدر خارجي", en: "External Rider" },
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  Active: { ar: "نشط", en: "Active" },
  Suspended: { ar: "موقوف", en: "Suspended" },
  Archived: { ar: "مؤرشف", en: "Archived" },
  Inactive: { ar: "غير نشط", en: "Inactive" },
  Draft: { ar: "مسودة", en: "Draft" },
  Onboarding: { ar: "قيد التهيئة", en: "Onboarding" },
  OnLeave: { ar: "في إجازة", en: "On Leave" },
  Terminated: { ar: "منتهي", en: "Terminated" },
};

function formatDate(value: string | null | undefined, locale: "ar" | "en" = "ar") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-arab" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function Timeline({
  title,
  entries,
  locale = "ar",
}: {
  title: string;
  entries: Period[] | OperationalAssignment[];
  locale?: "ar" | "en";
}) {
  return (
    <Card className="p-5">
      <h2 className="font-black">{title}</h2>
      {entries.length ? (
        <ol className={`mt-4 space-y-3 border-s border-[var(--border)] ${locale === "en" ? "ps-4" : "ps-4"}`}>
          {entries.map((entry) => {
            const entryRec = entry as Record<string, unknown>;
            const detail =
              "value" in entry
                ? entry.value
                : locale === "en"
                  ? (entryRec.operationalWorkTypeEn as string | undefined) || entry.operationalWorkTypeAr
                  : entry.operationalWorkTypeAr;
            return (
              <li key={entry.id} className="relative text-sm">
                <span className={`absolute top-1.5 size-2 rounded-full bg-[#1167c9] ${locale === "en" ? "-left-[1.05rem]" : "-right-[1.05rem]"}`} />
                <p className="font-bold">{detail || (locale === "en" ? "Operational Assignment" : "تكليف تشغيلي")}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {locale === "en"
                    ? `From ${formatDate(entry.effectiveFrom, locale)}${entry.effectiveTo ? ` to ${formatDate(entry.effectiveTo, locale)}` : " — Ongoing"}`
                    : `من ${formatDate(entry.effectiveFrom, locale)}${entry.effectiveTo ? ` إلى ${formatDate(entry.effectiveTo, locale)}` : " — مستمر"}`}
                </p>
                {entry.reason ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {entry.reason}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">
          {locale === "en" ? "No history entries yet." : "لا توجد سجلات حتى الآن."}
        </p>
      )}
    </Card>
  );
}

export default function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [employeeId, setEmployeeId] = useState<string>();
  const [details, setDetails] = useState<EmployeeDetails>();
  const [cities, setCities] = useState<HrRow[]>([]);
  const [error, setError] = useState("");
  const [showDocsModal, setShowDocsModal] = useState(false);

  useEffect(() => {
    void params.then(({ employeeId: id }) => setEmployeeId(id));
  }, [params]);

  useEffect(() => {
    hrCatalogApi
      .list("operating-cities")
      .then(setCities)
      .catch(() => []);
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    setError("");
    void getEmployee(employeeId)
      .then(setDetails)
      .catch(() =>
        setError(
          locale === "en"
            ? "Unable to load employee profile or insufficient permissions."
            : "تعذر تحميل ملف الموظف أو لا تملك صلاحيةعرضه.",
        ),
      );
  }, [employeeId, locale]);

  const statusEntries = useMemo(() => {
    if (!details) return [];
    if (details.statusHistory && details.statusHistory.length > 0) {
      return details.statusHistory;
    }
    const filtered = (details.workHistory ?? []).filter(
      (w) => w.changeType === "Status",
    );
    return filtered.map((w) => {
      const valText =
        w.newValue && statusLabels[w.newValue]
          ? locale === "en"
            ? statusLabels[w.newValue].en
            : statusLabels[w.newValue].ar
          : w.newValue || "";
      return {
        id: w.id,
        value: valText,
        effectiveFrom: w.effectiveDate || w.createdAtUtc,
        effectiveTo: null,
        reason: w.reason,
        changedByUserId: w.changedByUserId,
      };
    });
  }, [details, locale]);

  const roleEntries = useMemo(() => {
    if (!details) return [];
    const filtered = (details.workHistory ?? []).filter(
      (w) => w.changeType === "Role",
    );
    return filtered.map((w) => ({
      id: w.id,
      value: w.newValue || "",
      effectiveFrom: w.effectiveDate || w.createdAtUtc,
      effectiveTo: null,
      reason: w.reason,
      changedByUserId: w.changedByUserId,
    }));
  }, [details]);

  const relationshipEntries = useMemo(() => {
    if (!details) return [];
    if (details.relationshipHistory && details.relationshipHistory.length > 0) {
      return details.relationshipHistory;
    }
    const filtered = (details.workHistory ?? []).filter(
      (w) => w.changeType === "Engagement" || w.changeType === "Relationship",
    );
    return filtered.map((w) => {
      const valText =
        w.newValue && relationshipLabels[w.newValue]
          ? locale === "en"
            ? relationshipLabels[w.newValue].en
            : relationshipLabels[w.newValue].ar
          : w.newValue || "—";
      return {
        id: w.id,
        value: valText,
        effectiveFrom: w.effectiveDate || w.createdAtUtc,
        effectiveTo: null,
        reason: w.reason,
        changedByUserId: w.changedByUserId || "",
      };
    });
  }, [details, locale]);

  const assignmentEntries = useMemo(() => {
    if (!details) return [];
    if (
      details.operationalAssignmentHistory &&
      details.operationalAssignmentHistory.length > 0
    ) {
      return details.operationalAssignmentHistory;
    }
    const filtered = (details.workHistory ?? []).filter(
      (w) =>
        w.changeType === "OperationalAssignment" ||
        w.changeType === "WorkType" ||
        w.changeType === "Assignment",
    );
    return filtered.map((w) => ({
      id: w.id,
      jobTitleId: "",
      jobTitleAr: w.newValue || "",
      operationalWorkTypeId: "",
      operationalWorkTypeAr: w.newValue || "",
      operatingCityId: "",
      operatingCityAr: "",
      effectiveFrom: w.effectiveDate || w.createdAtUtc,
      effectiveTo: null,
      reason: w.reason,
    }));
  }, [details]);

  const BackIcon = locale === "en" ? ArrowLeft : ArrowRight;

  if (error) {
    return (
      <div className="p-6">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!details) {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted)]">
        {t("common.loading")}
      </p>
    );
  }

  const { employee, rider } = details;

  const isActive = employee.status === "Active";
  const displayName =
    locale === "en"
      ? employee.fullNameEn || employee.fullNameAr
      : employee.fullNameAr || employee.fullNameEn;
  const secondaryName =
    locale === "en"
      ? employee.fullNameEn ? employee.fullNameAr : null
      : employee.fullNameAr ? employee.fullNameEn : null;

  const relKey = employee.engagementType || employee.relationshipType;
  const relObj = relationshipLabels[relKey ?? ""];
  const relText = relObj ? (locale === "en" ? relObj.en : relObj.ar) : (relKey ?? "—");

  const stObj = statusLabels[employee.status];
  const stText = stObj ? (locale === "en" ? stObj.en : stObj.ar) : employee.status;

  const riderStObj = rider ? statusLabels[rider.status] : null;
  const riderStText = riderStObj ? (locale === "en" ? riderStObj.en : riderStObj.ar) : rider?.status;

  const empRec = employee as Record<string, unknown>;
  const riderRec = rider as Record<string, unknown> | null;

  const cityFromCatalog = cities.find(
    (c) =>
      c.id === empRec.operatingCityId ||
      c.id === empRec.cityId ||
      c.globalCityId === empRec.operatingCityId,
  );

  const operatingCity =
    locale === "en"
      ? (empRec.operatingCityEn as string | undefined) ??
      (cityFromCatalog?.globalCityEn as string | undefined) ??
      (cityFromCatalog?.cityNameEn as string | undefined) ??
      cityFromCatalog?.nameEn ??
      employee.operatingCityAr ??
      (cityFromCatalog?.globalCityAr as string | undefined) ??
      "Unspecified"
      : employee.operatingCityAr ??
      (cityFromCatalog?.globalCityAr as string | undefined) ??
      (cityFromCatalog?.cityNameAr as string | undefined) ??
      cityFromCatalog?.nameAr ??
      (empRec.operatingCityEn as string | undefined) ??
      "غير محددة";

  const preferredCity = rider
    ? locale === "en"
      ? (riderRec?.preferredCityEn as string | undefined) ?? rider.preferredCityAr ?? "Unspecified"
      : rider.preferredCityAr ?? "غير محددة"
    : null;

  const phoneNumber =
    employee.primaryPhone ??
    (empRec.secondaryPhone as string) ??
    (empRec.emergencyContactPhone as string) ??
    (empRec.phone as string) ??
    "—";

  const nationality =
    (empRec.nationalityAr as string) ??
    employee.nationality ??
    employee.nationalityCountryCode ??
    "—";

  const rawHireDate =
    employee.hireDate ??
    (empRec.contractStartDate as string) ??
    (empRec.createdAt as string) ??
    rider?.riderStartDate;

  const empNumDisplay =
    employee.employeeNumber ||
    (employee.iqamaNo
      ? `${locale === "en" ? "Iqama" : "رقم الهوية/الإقامة"}: ${employee.iqamaNo}`
      : `${locale === "en" ? "ID" : "المعرف"}: ${employee.id.slice(0, 8)}`);

  const workAssignment =
    locale === "en"
      ? (empRec.operationalWorkTypeEn as string | undefined) ??
      (empRec.jobTitleEn as string | undefined) ??
      employee.operationalWorkTypeAr ??
      employee.jobTitleAr ??
      "No current assignment"
      : employee.operationalWorkTypeAr ??
      employee.jobTitleAr ??
      "لا يوجد تكليف حالي";

  const housing = details.housing;
  const housingName = housing
    ? (locale === "en" ? housing.nameEn || housing.nameAr : housing.nameAr || housing.nameEn)
    : (locale === "en" ? "Not Housed" : "غير مسكن");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/employees"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1167c9]"
          >
            <BackIcon size={17} />
            {locale === "en" ? "Back to Employees" : "العودة إلى الموظفين"}
          </Link>
          <p className="mt-3 text-sm font-bold text-[#1167c9]">
            {t("employees.employeeDetails")}
          </p>
          <h1 className="mt-1 text-3xl font-black">{displayName}</h1>
          {secondaryName ? (
            <p className="mt-1 text-sm text-[var(--muted)]" dir="auto">
              {secondaryName}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/employees/${employee.id}/edit`}>
            <Button variant="secondary">
              <Pencil size={17} />
              {locale === "en" ? "Edit Data" : "تعديل البيانات"}
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setShowDocsModal(true)}>
            <FileText size={17} />
            {locale === "en" ? "Documents & Insurance" : "الوثائق والتأمين"}
          </Button>
          <Link href={`/dashboard/employees/${employee.id}/actions`}>
            <Button>{locale === "en" ? "Employee Actions" : "إجراءات الموظف"}</Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1167c9] p-5 text-white sm:p-7">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/15">
              <UserRound size={28} />
            </span>
            <div>
              <p className="text-lg font-black">{empNumDisplay}</p>
              <p className="mt-1 text-sm text-white/80">{relText}</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${isActive ? "bg-emerald-100 text-emerald-900" : "bg-white/15 text-white"}`}
          >
            {stText}
          </span>
        </div>
        <dl className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-5">
          {([
            { label: locale === "en" ? "Phone Number" : "رقم الجوال", value: String(phoneNumber ?? "—") },
            { label: locale === "en" ? "Nationality" : "الجنسية", value: String(nationality ?? "—") },
            { label: locale === "en" ? "Hire Date" : "تاريخ التعيين", value: formatDate(rawHireDate, locale) },
            { label: locale === "en" ? "Operating City" : "المدينة", value: String(operatingCity ?? "—") },
            { label: locale === "en" ? "Housing" : "السكن", value: String(housingName) },
          ] as const).map(({ label, value }) => (
            <div key={label} className="bg-[var(--surface)] p-4">
              <dt className="text-xs font-bold text-[var(--muted)]">{label}</dt>
              <dd className="mt-1 text-sm font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black">
            <Building size={18} />
            {locale === "en" ? "Housing Residence" : "السكن الحالي"}
          </h2>
          {housing ? (
            <div className="mt-4 space-y-1.5">
              <Link
                href={`/dashboard/housing/${housing.id}`}
                className="block text-sm font-extrabold text-[#1167c9] hover:underline"
              >
                {locale === "en" ? housing.nameEn || housing.nameAr : housing.nameAr || housing.nameEn}
              </Link>
              {(housing.code || housing.cityAr) && (
                <p className="text-xs font-mono font-medium text-[var(--muted)]">
                  {[housing.code, housing.cityAr].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {locale === "en"
                ? "Not currently housed in any housing unit."
                : "غير مسكن حالياً في أي وحدة سكنية."}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black">
            <ContactRound size={18} />
            {locale === "en" ? "Rider Profile" : "ملف المندوب"}
          </h2>
          {rider ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-xs text-[var(--muted)]">{t("common.status")}</dt>
                <dd className="font-bold">{riderStText}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-[var(--muted)]">
                  {locale === "en" ? "Preferred City" : "مدينة التفضيل"}
                </dt>
                <dd className="font-bold">{preferredCity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-[var(--muted)]">
                  {locale === "en" ? "Start Date" : "بداية الملف"}
                </dt>
                <dd className="font-bold">
                  {formatDate(rider.riderStartDate, locale)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {locale === "en"
                ? "No rider profile associated with this employee."
                : "لا يوجد ملف رايدر مرتبط بهذا الموظف."}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black">
            <BriefcaseBusiness size={18} />
            {locale === "en" ? "Operational Work" : "العمل التشغيلي"}
          </h2>
          <p className="mt-4 text-sm font-bold">{workAssignment}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{String(operatingCity ?? "")}</p>
        </Card>
      </div>

      <EmployeePlatformAccounts
        employeeId={employee.id}
        riderProfileId={rider?.id ?? null}
      />

      <EmployeeComplianceTabs
        employeeId={employee.id}
        riderProfileId={rider?.id ?? null}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Timeline
          title={locale === "en" ? "Status History" : "سجل الحالة"}
          entries={statusEntries}
          locale={locale}
        />
        <Timeline
          title={locale === "en" ? "Role History" : "سجل الأدوار الوظيفية"}
          entries={roleEntries}
          locale={locale}
        />
        <Timeline
          title={locale === "en" ? "Operational Assignment History" : "سجل التكليفات التشغيلية"}
          entries={assignmentEntries}
          locale={locale}
        />
        <Timeline
          title={locale === "en" ? "Relationship History" : "سجل العلاقة"}
          entries={relationshipEntries}
          locale={locale}
        />
      </div>

      {showDocsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowDocsModal(false)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] w-full max-w-5xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-xl font-black flex items-center gap-2">
                <FileText size={22} />
                {locale === "en" ? "Employee Documents & Insurance" : "وثائق وتأمين الموظف"}
              </h2>
              <button
                onClick={() => setShowDocsModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border hover:bg-slate-100 transition-colors"
                aria-label={locale === "en" ? "Close" : "إغلاق"}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1">
              <EmployeeDocumentsInsurance
                employeeId={employee.id}
                riderProfileId={rider?.id ?? null}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
