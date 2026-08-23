"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { EmployeeForm } from "../../../../components/employees/EmployeeForm";
import { createEmployee } from "../../../../lib/workforce/api";

export default function NewEmployeePage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/dashboard/employees"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1167c9]"
        >
          <ArrowRight size={17} />
          العودة إلى الموظفين
        </Link>
        <h1 className="mt-2 text-3xl font-black">إضافة إداري أو مندوب</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          أدخل البيانات كاملة؛ عند اختيار مندوب سيضاف ملف المندوب ضمن نفس الطلب.
        </p>
      </div>
      <EmployeeForm
        initial={{
          isEmployee: true,
          engagementType: "SponsoredInternal",
          status: "Draft",
        }}
        submitLabel="إنشاء السجل"
        onSave={async (payload) => {
          const result = await createEmployee(payload as never);
          router.replace(`/dashboard/employees/${result.employee.id}`);
        }}
      />
    </div>
  );
}
