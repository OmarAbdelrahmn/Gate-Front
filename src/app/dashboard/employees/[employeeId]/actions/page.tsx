"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Archive,
  BriefcaseBusiness,
  HeartHandshake,
  Save,
} from "lucide-react";
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
} from "../../../../../lib/workforce/api";
import { hrCatalogApi, type HrRow } from "../../../../../lib/hr/api";
import type { EmployeeDetails } from "../../../../../lib/workforce/types";
import { Button } from "../../../../../components/ui/Button";
import { Card } from "../../../../../components/ui/Card";
import { Input } from "../../../../../components/ui/Input";
import { systemConfirm } from "../../../../../components/ui/SystemDialog";

const today = new Date().toISOString().slice(0, 10);
const parseJson = (value: string) =>
  JSON.parse(value) as Record<string, unknown>;

export default function EmployeeActionsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const [employeeId, setEmployeeId] = useState<string>();
  const [details, setDetails] = useState<EmployeeDetails>();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");
  const [sponsorships, setSponsorships] = useState<unknown[]>([]);
  const [jobTitles, setJobTitles] = useState<HrRow[]>([]), [workTypes, setWorkTypes] = useState<HrRow[]>([]), [cities, setCities] = useState<HrRow[]>([]), [sponsors, setSponsors] = useState<HrRow[]>([]);
  useEffect(() => {
    void params.then(({ employeeId: id }) => setEmployeeId(id));
  }, [params]);
  useEffect(() => {
    if (!employeeId) return;
    void Promise.all([getEmployee(employeeId), getSponsorships(employeeId)])
      .then(([employee, history]) => {
        setDetails(employee);
        setSponsorships(history);
      })
      .catch(() => setMessage("تعذر تحميل إجراءات الموظف."));
  }, [employeeId]);
  useEffect(() => { void Promise.all([hrCatalogApi.list("job-titles"), hrCatalogApi.list("operational-work-types"), hrCatalogApi.list("operating-cities"), listSponsors()]).then(([j, w, c, s]) => { setJobTitles(j); setWorkTypes(w); setCities(c); setSponsors(s as unknown as HrRow[]) }) }, []);
  async function run(key: string, task: () => Promise<unknown>) {
    setSaving(key);
    setMessage("");
    try {
      await task();
      setMessage("تم حفظ الإجراء بنجاح.");
      if (employeeId) {
        const [employee, history] = await Promise.all([
          getEmployee(employeeId),
          getSponsorships(employeeId),
        ]);
        setDetails(employee);
        setSponsorships(history);
      }
    } catch {
      setMessage("تعذر تنفيذ الإجراء. راجع البيانات والصلاحيات.");
    } finally {
      setSaving("");
    }
  }
  if (!employeeId || !details)
    return (
      <p className="py-12 text-center text-sm text-[var(--muted)]">
        جارٍ تحميل الإجراءات…
      </p>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/dashboard/employees/${employeeId}`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1167c9]"
        >
          <ArrowRight size={17} />
          العودة إلى ملف الموظف
        </Link>
        <h1 className="mt-2 text-3xl font-black">إجراءات الموظف</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {details.employee.fullNameAr} — الانتقالات والتكليف والكفالة والبيانات
          المرتبطة.
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
        <Card className="p-5">
          <h2 className="font-black">تغيير حالة الموظف</h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void run("status", () =>
                changeEmployeeStatus(employeeId, {
                  status: String(form.get("status")),
                  effectiveDate: String(form.get("effectiveFrom")),
                  reason: String(form.get("reason")),
                }),
              );
            }}
          >
            <select
              name="status"
              required
              defaultValue={details.employee.status}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
            >
              <option value="Active">نشط</option>
              <option value="Suspended">موقوف</option>
              <option value="Inactive">غير نشط</option>
            </select>
            <Input
              name="effectiveFrom"
              label="تاريخ السريان"
              type="date"
              defaultValue={today}
              required
            />
            <Input name="reason" label="سبب التغيير" required />
            <Button loading={saving === "status"}>
              <Save size={16} />
              حفظ الحالة
            </Button>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black">
            <BriefcaseBusiness size={18} />
            تكليف تشغيلي
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
            <Lookup name="jobTitleId" label="المسمى الوظيفي" rows={jobTitles} />
            <Lookup name="workTypeId" label="نوع العمل التشغيلي" rows={workTypes} />
            <Lookup name="cityId" label="مدينة التشغيل" rows={cities} />
            <Input
              name="effectiveFrom"
              label="تاريخ السريان"
              type="date"
              defaultValue={today}
              required
            />
            <Input name="reason" label="السبب" required />
            <Button loading={saving === "work"}>
              <Save size={16} />
              حفظ التكليف
            </Button>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black">
            <HeartHandshake size={18} />
            تغيير الكفالة
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
            <Lookup name="sponsorId" label="الكفيل" rows={sponsors} />
            <Input
              name="effectiveFrom"
              label="تاريخ السريان"
              type="date"
              defaultValue={today}
              required
            />
            <Input name="reason" label="سبب التغيير" required />
            <Button loading={saving === "sponsor"}>
              <Save size={16} />
              حفظ الكفالة
            </Button>
          </form>
          <p className="mt-4 text-xs text-[var(--muted)]">
            سجل الكفالات: {sponsorships.length}
          </p>
        </Card>
        <Card className="border-red-200 p-5">
          <h2 className="flex items-center gap-2 font-black text-red-700">
            <Archive size={18} />
            أرشفة الموظف
          </h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              if (await systemConfirm("هل تريد أرشفة الموظف؟", "أرشفة الموظف", true))
                void run("archive", () =>
                  archiveEmployee(employeeId, {
                    reason: String(form.get("reason")),
                    rowVersion: details.employee.rowVersion,
                  }),
                );
            }}
          >
            <Input name="reason" label="سبب الأرشفة" required />
            <Button variant="danger" loading={saving === "archive"}>
              <Archive size={16} />
              أرشفة الموظف
            </Button>
          </form>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="font-black">بيانات العلاقة المتقدمة</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          تُرسل الحقول كاملة إلى مسار بيانات الموظف المكفول أو المندوب الخارجي،
          بما في ذلك rowVersion.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const json = new FormData(e.currentTarget).get("payload");
              try {
                void run("sponsored", () =>
                  updateSponsoredDetails(employeeId, parseJson(String(json))),
                );
              } catch {
                setMessage("صيغة JSON لبيانات الموظف المكفول غير صحيحة.");
              }
            }}
          >
            <label className="grid gap-2 text-sm font-bold">
              بيانات الموظف المكفول
              <textarea
                name="payload"
                required
                defaultValue={JSON.stringify(
                  details.sponsoredDetails ?? {},
                  null,
                  2,
                )}
                className="min-h-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs"
                dir="ltr"
              />
            </label>
            <Button className="mt-3" loading={saving === "sponsored"}>
              حفظ بيانات المكفول
            </Button>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const json = new FormData(e.currentTarget).get("payload");
              try {
                void run("outside", () =>
                  updateOutsideRiderDetails(
                    employeeId,
                    parseJson(String(json)),
                  ),
                );
              } catch {
                setMessage("صيغة JSON لبيانات المندوب الخارجي غير صحيحة.");
              }
            }}
          >
            <label className="grid gap-2 text-sm font-bold">
              بيانات المندوب الخارجي
              <textarea
                name="payload"
                required
                defaultValue={JSON.stringify(
                  details.outsideRiderDetails ?? {},
                  null,
                  2,
                )}
                className="min-h-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs"
                dir="ltr"
              />
            </label>
            <Button className="mt-3" loading={saving === "outside"}>
              حفظ بيانات المندوب
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
function Lookup({ name, label, rows }: { name: string; label: string; rows: HrRow[] }) { return <label className="grid gap-2 text-sm font-bold">{label}<select name={name} required className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"><option value="">اختر {label}</option>{rows.map(row => <option key={row.id} value={row.id}>{String(row.nameAr ?? row.registryNameAr ?? row.globalCityAr ?? row.code ?? row.id)}</option>)}</select></label> }
