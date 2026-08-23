"use client";
import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { authFetch } from "../../../../lib/auth/api";
import {
  assignResident,
  assignSupervisor,
  closeResidence,
  closeSupervisor,
  getHousing,
  listResidents,
  listSupervisors,
  type Housing,
  type HousingPeriod,
} from "../../../../lib/housing/api";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { systemPrompt } from "../../../../components/ui/SystemDialog";
type Employee = { id: string; fullNameAr: string; iqamaNo?: string };
export default function HousingDetails({
  params,
}: {
  params: Promise<{ housingId: string }>;
}) {
  const { housingId } = use(params),
    [housing, setHousing] = useState<Housing | null>(null),
    [residents, setResidents] = useState<HousingPeriod[]>([]),
    [supervisors, setSupervisors] = useState<HousingPeriod[]>([]),
    [employees, setEmployees] = useState<Employee[]>([]),
    [error, setError] = useState("");
  async function load() {
    try {
      const [h, r, s, e] = await Promise.all([
        getHousing(housingId),
        listResidents(housingId),
        listSupervisors(housingId),
        authFetch<Employee[]>("/api/employees"),
      ]);
      setHousing(h);
      setResidents(r);
      setSupervisors(s);
      setEmployees(e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل التفاصيل");
    }
  }
  useEffect(() => {
    void load();
  }, [housingId]);
  async function assign(
    e: FormEvent<HTMLFormElement>,
    kind: "resident" | "supervisor",
  ) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      employeeId = String(f.get("employeeId")),
      effectiveFrom = String(f.get("effectiveFrom")),
      reason = String(f.get("reason") || "");
    try {
      if (kind === "resident")
        await assignResident(housingId, {
          employeeId,
          effectiveFrom,
          moveInReason: reason || null,
          sourceReference: null,
          capacityOverrideUsed: false,
          capacityOverrideReason: null,
        });
      else
        await assignSupervisor(housingId, {
          employeeId,
          effectiveFrom,
          assignmentReason: reason || null,
        });
      await load();
      e.currentTarget.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الإسناد");
    }
  }
  async function close(p: HousingPeriod, kind: "resident" | "supervisor") {
    const date = await systemPrompt("تاريخ الانتهاء", "", "إنهاء الفترة", "date"),
      reason = await systemPrompt("سبب الإنهاء", "", "إنهاء الفترة");
    if (!date || !reason) return;
    await (kind === "resident"
      ? closeResidence(p.id, date, reason)
      : closeSupervisor(p.id, date, reason));
    await load();
  }
  if (!housing) return <p>{error || "جاري التحميل…"}</p>;
  return (
    <div className="space-y-6" dir="rtl">
      <Link
        href="/dashboard/housing"
        className="inline-flex items-center gap-2 text-[#1167c9]"
      >
        <ArrowRight size={17} />
        العودة للسكن
      </Link>
      <header>
        <h1 className="text-3xl font-black">{housing.nameAr}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {housing.cityAr} · السعة {housing.currentResidents}/
          {housing.totalCapacity}
        </p>
      </header>
      {error && <p className="bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        <PeriodCard
          title="السكان"
          rows={residents}
          employees={employees}
          onSubmit={(e) => assign(e, "resident")}
          onClose={(p) => close(p, "resident")}
        />
        <PeriodCard
          title="المشرفون"
          rows={supervisors}
          employees={employees}
          onSubmit={(e) => assign(e, "supervisor")}
          onClose={(p) => close(p, "supervisor")}
        />
      </div>
    </div>
  );
}
function PeriodCard({
  title,
  rows,
  employees,
  onSubmit,
  onClose,
}: {
  title: string;
  rows: HousingPeriod[];
  employees: Employee[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: (p: HousingPeriod) => void;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          name="employeeId"
          required
          className="h-11 rounded-xl border bg-[var(--surface)] px-3"
        >
          <option value="">اختر الموظف</option>
          {employees.map((e) => (
            <option value={e.id} key={e.id}>
              {e.fullNameAr}
            </option>
          ))}
        </select>
        <input
          name="effectiveFrom"
          type="date"
          required
          className="h-11 rounded-xl border bg-[var(--surface)] px-3"
        />
        <input
          name="reason"
          placeholder="سبب الإسناد"
          className="h-11 rounded-xl border bg-[var(--surface)] px-3"
        />
        <Button type="submit">إسناد</Button>
      </form>
      <div className="mt-5 space-y-2">
        {rows.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl border p-3"
          >
            <div>
              <p className="font-bold">{p.employeeNameAr}</p>
              <p className="text-xs text-[var(--muted)]">
                من {p.effectiveFrom}
                {p.effectiveTo ? ` إلى ${p.effectiveTo}` : " · حالي"}
              </p>
            </div>
            {!p.effectiveTo && (
              <Button variant="secondary" onClick={() => onClose(p)}>
                إنهاء
              </Button>
            )}
          </div>
        ))}
        {!rows.length && (
          <p className="py-5 text-center text-[var(--muted)]">لا توجد سجلات.</p>
        )}
      </div>
    </Card>
  );
}
