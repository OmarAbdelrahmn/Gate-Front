"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  BriefcaseBusiness,
  HeartHandshake,
  RefreshCw,
  Save,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  archiveEmployee,
  assignOperationalWork,
  changeEmployeeStatus,
  changeSponsorship,
  getEmployee,
  getSponsorships,
  listSponsors,
  updateOutsideRiderDetails,
  updateSponsoredDetails,
} from "@/lib/workforce/api";
import { hrCatalogApi, type HrRow } from "@/lib/hr/api";
import type { EmployeeDetails } from "@/lib/workforce/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { systemConfirm } from "@/components/ui/SystemDialog";

const today = new Date().toISOString().slice(0, 10);
const parseJson = (value: string) =>
  JSON.parse(value) as Record<string, unknown>;

export default function EmployeeActionsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { locale } = useAuth();
  const BackIcon = locale === "en" ? ArrowLeft : ArrowRight;

  const [employeeId, setEmployeeId] = useState<string>();
  const [details, setDetails] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");
  const [sponsorships, setSponsorships] = useState<unknown[]>([]);
  const [jobTitles, setJobTitles] = useState<HrRow[]>([]);
  const [workTypes, setWorkTypes] = useState<HrRow[]>([]);
  const [cities, setCities] = useState<HrRow[]>([]);
  const [sponsors, setSponsors] = useState<HrRow[]>([]);

  useEffect(() => {
    void params.then(({ employeeId: id }) => setEmployeeId(id));
  }, [params]);

  const loadAllData = async (id: string) => {
    setLoading(true);
    setFetchError("");
    try {
      // 1. Primary request: Employee details
      const empData = await getEmployee(id);
      setDetails(empData);

      // 2. Secondary requests (resilient via Promise.allSettled)
      const [sponRes, jRes, wRes, cRes, sListRes] = await Promise.allSettled([
        getSponsorships(id),
        hrCatalogApi.list("job-titles"),
        hrCatalogApi.list("operational-work-types"),
        hrCatalogApi.list("operating-cities"),
        listSponsors(),
      ]);

      if (sponRes.status === "fulfilled" && Array.isArray(sponRes.value)) {
        setSponsorships(sponRes.value);
      } else {
        setSponsorships([]);
      }

      if (jRes.status === "fulfilled") setJobTitles(jRes.value);
      if (wRes.status === "fulfilled") setWorkTypes(wRes.value);
      if (cRes.status === "fulfilled") setCities(cRes.value);
      if (sListRes.status === "fulfilled" && Array.isArray(sListRes.value)) {
        setSponsors(sListRes.value as unknown as HrRow[]);
      }
    } catch (err) {
      console.error("Failed to load employee actions data:", err);
      setFetchError(
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Unable to load employee details."
            : "تعذر تحميل بيانات الموظف والمستندات المرتبطة.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      void loadAllData(employeeId);
    }
  }, [employeeId]);

  async function run(key: string, task: () => Promise<unknown>) {
    if (!employeeId) return;
    setSaving(key);
    setMessage("");
    try {
      await task();
      setMessage(locale === "en" ? "Action completed successfully." : "تم حفظ الإجراء بنجاح.");
      // Refresh details
      const updatedEmp = await getEmployee(employeeId);
      setDetails(updatedEmp);
    } catch (err) {
      console.error("Error executing employee action:", err);
      setMessage(
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Failed to execute action. Please verify data and permissions."
            : "تعذر تنفيذ الإجراء. راجع البيانات والصلاحيات.",
      );
    } finally {
      setSaving("");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center text-sm font-bold text-[var(--muted)] flex items-center justify-center gap-2">
        <RefreshCw size={18} className="animate-spin text-[#1167c9]" />
        {locale === "en" ? "Loading employee actions..." : "جارٍ تحميل الإجراءات…"}
      </div>
    );
  }

  if (fetchError || !details || !employeeId) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 py-8">
        {employeeId && (
          <Link
            href={`/dashboard/employees/${employeeId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#1167c9]"
          >
            <BackIcon size={17} />
            {locale === "en" ? "Back to Employee Profile" : "العودة إلى ملف الموظف"}
          </Link>
        )}
        <Card className="p-6 border-red-200 bg-red-50/50 text-center">
          <p className="text-sm font-bold text-red-700">
            {fetchError || (locale === "en" ? "Employee not found." : "الموظف غير موجود.")}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => employeeId && void loadAllData(employeeId)}
            >
              <RefreshCw size={15} />
              {locale === "en" ? "Try Again" : "إعادة المحاولة"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const employeeName = locale === "en"
    ? details.employee.fullNameEn || details.employee.fullNameAr
    : details.employee.fullNameAr || details.employee.fullNameEn;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/dashboard/employees/${employeeId}`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1167c9]"
        >
          <BackIcon size={17} />
          {locale === "en" ? "Back to Employee Profile" : "العودة إلى ملف الموظف"}
        </Link>
        <h1 className="mt-2 text-3xl font-black">
          {locale === "en" ? "Employee Actions" : "إجراءات الموظف"}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {employeeName} —{" "}
          {locale === "en"
            ? "Status transitions, operational assignments, sponsorship changes, and archiving."
            : "الانتقالات والتكليف والكفالة والأرشفة والبيانات المرتبطة."}
        </p>
      </div>

      {message ? (
        <p
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-[#1167c9]"
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Transition Card */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black text-slate-900">
            <UserCheck size={18} />
            {locale === "en" ? "Change Employee Status" : "تغيير حالة الموظف"}
          </h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const selectedStatus = String(form.get("status"));
              const reasonStr = String(form.get("reason"));
              if (selectedStatus === "Archived") {
                void run("status", () =>
                  archiveEmployee(employeeId, {
                    reason: reasonStr,
                    rowVersion: details.employee.rowVersion,
                  }),
                );
              } else {
                void run("status", () =>
                  changeEmployeeStatus(employeeId, {
                    status: selectedStatus,
                    effectiveDate: String(form.get("effectiveFrom")),
                    reason: reasonStr,
                  }),
                );
              }
            }}
          >
            <label className="grid gap-1.5 text-xs font-bold text-slate-700">
              {locale === "en" ? "New Status" : "الحالة الجديدة"}
              <select
                name="status"
                required
                defaultValue={details.employee.status}
                className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="Draft">مسودة (Draft)</option>
                <option value="Onboarding">قيد التهيئة (Onboarding)</option>
                <option value="Active">نشط (Active)</option>
                <option value="Suspended">موقوف (Suspended)</option>
                <option value="OnLeave">في إجازة (On Leave)</option>
                <option value="Terminated">منتهي الخدمة (Terminated)</option>
                <option value="Archived">مؤرشف (Archived)</option>
                <option value="Fleeing">هروب / انقطاع (Fleeing)</option>
                <option value="Accident">حادث (Accident)</option>
                <option value="Sick">إجازة مرضية (Sick)</option>
              </select>
            </label>
            <Input
              name="effectiveFrom"
              label={locale === "en" ? "Effective Date" : "تاريخ السريان"}
              type="date"
              defaultValue={today}
              required
            />
            <Input
              name="reason"
              label={locale === "en" ? "Status Change Reason" : "سبب التغيير (statusReason)"}
              required
            />
            <Button loading={saving === "status"}>
              <Save size={16} />
              {locale === "en" ? "Save Status" : "حفظ الحالة"}
            </Button>
          </form>
        </Card>

        {/* Operational Assignment Card */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black text-slate-900">
            <BriefcaseBusiness size={18} />
            {locale === "en" ? "Operational Assignment" : "تكليف تشغيلي"}
          </h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void run("work", () =>
                assignOperationalWork(employeeId, {
                  jobTitleId: form.get("jobTitleId"),
                  operationalWorkTypeId: form.get("workTypeId"),
                  operatingCityId: form.get("cityId"),
                  effectiveFrom: form.get("effectiveFrom"),
                  reason: form.get("reason"),
                }),
              );
            }}
          >
            <Lookup name="jobTitleId" label={locale === "en" ? "Job Title" : "المسمى الوظيفي"} rows={jobTitles} locale={locale} />
            <Lookup name="workTypeId" label={locale === "en" ? "Work Type" : "نوع العمل التشغيلي"} rows={workTypes} locale={locale} />
            <Lookup name="cityId" label={locale === "en" ? "Operating City" : "مدينة التشغيل"} rows={cities} locale={locale} />
            <Input
              name="effectiveFrom"
              label={locale === "en" ? "Effective Date" : "تاريخ السريان"}
              type="date"
              defaultValue={today}
              required
            />
            <Input name="reason" label={locale === "en" ? "Reason" : "السبب"} required />
            <Button loading={saving === "work"}>
              <Save size={16} />
              {locale === "en" ? "Save Assignment" : "حفظ التكليف"}
            </Button>
          </form>
        </Card>

        {/* Sponsorship Change Card */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black text-slate-900">
            <HeartHandshake size={18} />
            {locale === "en" ? "Change Sponsorship" : "تغيير الكفالة"}
          </h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void run("sponsor", () =>
                changeSponsorship(employeeId, {
                  sponsorId: form.get("sponsorId"),
                  status: "Active",
                  effectiveFrom: form.get("effectiveFrom"),
                  reason: form.get("reason"),
                  sourceReference: null,
                }),
              );
            }}
          >
            <Lookup name="sponsorId" label={locale === "en" ? "Sponsor" : "الكفيل"} rows={sponsors} locale={locale} />
            <Input
              name="effectiveFrom"
              label={locale === "en" ? "Effective Date" : "تاريخ السريان"}
              type="date"
              defaultValue={today}
              required
            />
            <Input name="reason" label={locale === "en" ? "Reason" : "سبب التغيير"} required />
            <Button loading={saving === "sponsor"}>
              <Save size={16} />
              {locale === "en" ? "Save Sponsorship" : "حفظ الكفالة"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-[var(--muted)]">
            {locale === "en" ? `Sponsorship History Count: ${sponsorships.length}` : `سجل الكفالات: ${sponsorships.length}`}
          </p>
        </Card>

        {/* Archive Card */}
        <Card className="border-red-200 p-5 bg-red-50/20">
          <h2 className="flex items-center gap-2 font-black text-red-700">
            <Archive size={18} />
            {locale === "en" ? "Archive Employee" : "أرشفة الموظف"}
          </h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const promptMsg = locale === "en" ? "Are you sure you want to archive this employee?" : "هل تريد أرشفة الموظف؟";
              const titleMsg = locale === "en" ? "Archive Employee" : "أرشفة الموظف";
              if (await systemConfirm(promptMsg, titleMsg, true))
                void run("archive", () =>
                  archiveEmployee(employeeId, {
                    reason: String(form.get("reason")),
                    rowVersion: details.employee.rowVersion,
                  }),
                );
            }}
          >
            <Input name="reason" label={locale === "en" ? "Archive Reason" : "سبب الأرشفة"} required />
            <Button variant="danger" loading={saving === "archive"}>
              <Archive size={16} />
              {locale === "en" ? "Archive Employee" : "أرشفة الموظف"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Lookup({
  name,
  label,
  rows,
  locale = "ar",
}: {
  name: string;
  label: string;
  rows: HrRow[];
  locale?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-slate-700">
      {label}
      <select
        name={name}
        required
        className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
      >
        <option value="">
          {locale === "en" ? `Select ${label}` : `اختر ${label}`}
        </option>
        {rows.map((row) => {
          const title = locale === "en"
            ? row.nameEn || row.nameAr || row.registryNameEn || row.registryNameAr || row.globalCityEn || row.globalCityAr || row.code || row.id
            : row.nameAr || row.nameEn || row.registryNameAr || row.registryNameEn || row.globalCityAr || row.globalCityEn || row.code || row.id;
          return (
            <option key={row.id} value={row.id}>
              {String(title)}
            </option>
          );
        })}
      </select>
    </label>
  );
}
