"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { translate } from "../../../../lib/i18n";
import { EmployeeForm } from "../../../../components/employees/EmployeeForm";
import { createEmployee } from "../../../../lib/workforce/api";

export default function NewEmployeePage() {
  const router = useRouter();
  const { locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const BackIcon = locale === "en" ? ArrowLeft : ArrowRight;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/dashboard/employees"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1167c9]"
        >
          <BackIcon size={17} />
          {locale === "en" ? "Back to Employees" : "العودة إلى الموظفين"}
        </Link>
        <h1 className="mt-2 text-3xl font-black">
          {locale === "en" ? "Add Employee or Delegate" : "إضافة إداري أو مندوب"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Enter full details; selecting a delegate will attach a rider profile within the same request."
            : "أدخل البيانات كاملة؛ عند اختيار مندوب سيضاف ملف المندوب ضمن نفس الطلب."}
        </p>
      </div>
      <EmployeeForm
        initial={{
          isEmployee: true,
          engagementType: "SponsoredInternal",
          status: "Draft",
        }}
        submitLabel={locale === "en" ? "Create Record" : "إنشاء السجل"}
        onSave={async (payload) => {
          const result = await createEmployee(payload as never);
          router.replace(`/dashboard/employees/${result.employee.id}`);
        }}
      />
    </div>
  );
}
