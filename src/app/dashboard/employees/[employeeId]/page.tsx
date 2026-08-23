"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ContactRound,
  Pencil,
  UserRound,
} from "lucide-react";
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

const relationshipLabels: Record<string, string> = {
  SponsoredInternal: "موظف مكفول داخليًا",
  OutsideRider: "رايدر خارجي",
};

const statusLabels: Record<string, string> = {
  Active: "نشط",
  Suspended: "موقوف",
  Archived: "مؤرشف",
  Inactive: "غير نشط",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function Timeline({
  title,
  entries,
}: {
  title: string;
  entries: Period[] | OperationalAssignment[];
}) {
  return (
    <Card className="p-5">
      <h2 className="font-black">{title}</h2>
      {entries.length ? (
        <ol className="mt-4 space-y-3 border-s border-[var(--border)] ps-4">
          {entries.map((entry) => {
            const detail =
              "value" in entry ? entry.value : entry.operationalWorkTypeAr;
            return (
              <li key={entry.id} className="relative text-sm">
                <span className="absolute -start-[1.32rem] top-1.5 size-2 rounded-full bg-[#1167c9]" />
                <p className="font-bold">{detail || "تكليف تشغيلي"}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  من {formatDate(entry.effectiveFrom)}
                  {entry.effectiveTo
                    ? ` إلى ${formatDate(entry.effectiveTo)}`
                    : " — مستمر"}
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
          لا توجد سجلات حتى الآن.
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
  const [employeeId, setEmployeeId] = useState<string>();
  const [details, setDetails] = useState<EmployeeDetails>();
  const [error, setError] = useState("");

  useEffect(() => {
    void params.then(({ employeeId: id }) => setEmployeeId(id));
  }, [params]);

  useEffect(() => {
    if (!employeeId) return;
    setError("");
    void getEmployee(employeeId)
      .then(setDetails)
      .catch(() => setError("تعذر تحميل ملف الموظف أو لا تملك صلاحية عرضه."));
  }, [employeeId]);

  if (error) {
    return (
      <Card className="p-6">
        <p role="alert" className="font-bold text-red-700">
          {error}
        </p>
        <Link
          href="/dashboard/employees"
          className="mt-4 inline-flex text-sm font-bold text-[#1167c9]"
        >
          العودة إلى الموظفين
        </Link>
      </Card>
    );
  }

  if (!details) {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted)]">
        جارٍ تحميل ملف الموظف…
      </p>
    );
  }

  const { employee, rider } = details;
  const isActive = employee.status === "Active";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/employees"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1167c9]"
          >
            <ArrowRight size={17} />
            العودة إلى الموظفين
          </Link>
          <p className="mt-3 text-sm font-bold text-[#1167c9]">ملف الموظف</p>
          <h1 className="mt-1 text-3xl font-black">{employee.fullNameAr}</h1>
          {employee.fullNameEn ? (
            <p className="mt-1 text-sm text-[var(--muted)]" dir="ltr">
              {employee.fullNameEn}
            </p>
          ) : null}
        </div>
        <Link href={`/dashboard/employees/${employee.id}/edit`}>
          <Button variant="secondary">
            <Pencil size={17} />
            تعديل البيانات
          </Button>
        </Link>
        <Link href={`/dashboard/employees/${employee.id}/actions`}>
          <Button>إجراءات الموظف</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1167c9] p-5 text-white sm:p-7">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/15">
              <UserRound size={28} />
            </span>
            <div>
              <p className="text-lg font-black">{employee.employeeNumber}</p>
              <p className="mt-1 text-sm text-white/80">
                {relationshipLabels[employee.relationshipType ?? ""] ?? "—"}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${isActive ? "bg-emerald-100 text-emerald-900" : "bg-white/15 text-white"}`}
          >
            {statusLabels[employee.status] ?? employee.status}
          </span>
        </div>
        <dl className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["رقم الجوال", employee.primaryPhone ?? "—"],
            ["الجنسية", employee.nationalityCountryCode ?? "—"],
            ["تاريخ التعيين", formatDate(employee.hireDate)],
            ["المدينة", employee.operatingCityAr ?? "غير محددة"],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--surface)] p-4">
              <dt className="text-xs font-bold text-[var(--muted)]">{label}</dt>
              <dd className="mt-1 text-sm font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <EmployeeComplianceTabs
        employeeId={employee.id}
        riderProfileId={rider?.id ?? null}
      />
      <EmployeeDocumentsInsurance employeeId={employee.id} riderProfileId={rider?.id ?? null} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Timeline title="سجل الحالة" entries={details.statusHistory ?? []} />
          <Timeline
            title="سجل التكليفات التشغيلية"
            entries={details.operationalAssignmentHistory ?? []}
          />
        </div>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-black">
              <ContactRound size={18} />
              ملف الرايدر
            </h2>
            {rider ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-[var(--muted)]">الحالة</dt>
                  <dd className="mt-1 font-bold">
                    {statusLabels[rider.status] ?? rider.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">مدينة التفضيل</dt>
                  <dd className="mt-1 font-bold">
                    {rider.preferredCityAr ?? "غير محددة"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">بداية الملف</dt>
                  <dd className="mt-1 font-bold">
                    {formatDate(rider.riderStartDate)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                لا يوجد ملف رايدر مرتبط بهذا الموظف.
              </p>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-black">
              <BriefcaseBusiness size={18} />
              العمل التشغيلي
            </h2>
            <p className="mt-4 text-sm font-bold">
              {employee.operationalWorkTypeAr ??
                employee.jobTitleAr ??
                "لا يوجد تكليف حالي"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {employee.operatingCityAr ?? "المدينة غير محددة"}
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-black">
              <CalendarDays size={18} />
              سجل العلاقة
            </h2>
            <p className="mt-4 text-sm text-[var(--muted)]">
              {(details.relationshipHistory ?? []).length} سجل علاقة محفوظ.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
