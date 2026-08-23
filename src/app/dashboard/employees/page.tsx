"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UsersRound } from "lucide-react";
import { listEmployees } from "../../../lib/workforce/api";
import type { Employee } from "../../../lib/workforce/types";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
const statusLabel: Record<string, string> = {
  Active: "نشط",
  Suspended: "موقوف",
  Archived: "مؤرشف",
  Inactive: "غير نشط",
};
const relationshipLabel: Record<string, string> = {
  SponsoredInternal: "موظف مكفول",
  OutsideRider: "رايدر خارجي",
};
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    void listEmployees()
      .then(setEmployees)
      .catch(() => setError("تعذر تحميل الموظفين أو لا تملك صلاحية عرضهم."))
      .finally(() => setLoading(false));
  }, []);
  console.log(employees);
  const results = useMemo(
    () =>
      employees.filter((item) =>
        `${item.employeeNumber} ${item.fullNameAr} ${item.fullNameEn ?? ""} ${item.primaryPhone ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [employees, search],
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">القوى العاملة</p>
          <h1 className="mt-1 text-3xl font-black">الإداريون والمناديب</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            إدارة بيانات الإداريين والمناديب وملفاتهم التشغيلية.
          </p>
        </div>
        <Link href="/dashboard/employees/new">
          <Button>
            <Plus size={17} />
            إضافة إداري أو مندوب
          </Button>
        </Link>
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4">
          <div className="relative w-full max-w-xl">
            <Search
              className="pointer-events-none absolute right-3 top-3 text-[var(--muted)]"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث بالاسم أو الرقم الوظيفي أو الجوال"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-10 pl-3 text-sm"
            />
          </div>
          <span className="flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
            <UsersRound size={18} />
            {results.length} موظف
          </span>
        </div>
        {error ? (
          <p role="alert" className="p-6 text-red-700">
            {error}
          </p>
        ) : loading ? (
          <p className="p-8 text-center text-sm text-[var(--muted)]">
            جارٍ تحميل الموظفين…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-right">
              <thead className="bg-slate-500/10 text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4">الموظف</th>
                  <th className="px-5 py-4">العلاقة</th>
                  <th className="px-5 py-4">الدور التشغيلي</th>
                  <th className="px-5 py-4">المدينة</th>
                  <th className="px-5 py-4">الحالة</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {results.map((employee) => (
                  <tr key={employee.id} className="hover:bg-blue-500/5">
                    <td className="px-5 py-4">
                      <b>{employee.fullNameAr}</b>
                      <span
                        className="mt-1 block text-xs text-[var(--muted)]"
                        dir="ltr"
                      >
                        {employee.employeeNumber} ·{" "}
                        {employee.primaryPhone ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {relationshipLabel[employee.relationshipType ?? ""] ??
                        "—"}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {employee.operationalWorkTypeAr ??
                        employee.jobTitleAr ??
                        "غير محدد"}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {employee.operatingCityAr ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${employee.status === "Active" ? "bg-emerald-500/10 text-emerald-700" : "bg-slate-500/10 text-slate-600"}`}
                      >
                        {statusLabel[employee.status] ?? employee.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        className="text-sm font-bold text-[#1167c9] hover:underline"
                        href={`/dashboard/employees/${employee.id}`}
                      >
                        عرض الملف
                      </Link>
                    </td>
                  </tr>
                ))}
                {!results.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-sm text-[var(--muted)]"
                    >
                      لا توجد نتائج مطابقة.
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
