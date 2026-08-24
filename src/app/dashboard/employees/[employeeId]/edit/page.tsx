"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { EmployeeForm } from "../../../../../components/employees/EmployeeForm";
import { getEmployee, updateEmployee } from "../../../../../lib/workforce/api";
import type { EmployeeDetails } from "../../../../../lib/workforce/types";

export default function EditEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const [id, setId] = useState("");
  const [details, setDetails] = useState<EmployeeDetails>();
  const [error, setError] = useState("");
  useEffect(() => {
    void params.then(({ employeeId }) => setId(employeeId));
  }, [params]);
  useEffect(() => {
    if (id)
      void getEmployee(id)
        .then(setDetails)
        .catch(() => setError("تعذر تحميل بيانات الموظف."));
  }, [id]);
  if (error)
    return (
      <p role="alert" className="text-red-700">
        {error}
      </p>
    );
  if (!details)
    return (
      <p className="py-12 text-center text-sm text-[var(--muted)]">
        جارٍ تحميل البيانات…
      </p>
    );
  const initial = {
    ...details.employee,
    tShirtSize: details.rider?.tShirtSize,
    operationalNotes: details.rider?.operationalNotes,
    riderRowVersion: details.rider?.rowVersion,
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/employees/${id}`}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1167c9]"
      >
        <ArrowRight size={17} />
        العودة إلى الملف
      </Link>
      <h1 className="text-3xl font-black">تعديل الإداري أو المندوب</h1>
      <EmployeeForm
        key={details.employee.id}
        initial={initial}
        submitLabel="حفظ التعديلات"
        onSave={async (payload) =>
          setDetails(await updateEmployee(id, payload as never))
        }
      />
    </div>
  );
}
