"use client";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOperatingCity,
  listGlobalCities,
  type GlobalCity,
} from "../../../../../lib/workforce/api";
import { Button } from "../../../../../components/ui/Button";
import { Card } from "../../../../../components/ui/Card";
export default function NewCityPage() {
  const router = useRouter();
  const [cities, setCities] = useState<GlobalCity[]>([]);
  useEffect(() => {
    void listGlobalCities().then(setCities);
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await createOperatingCity({
      globalCityId: f.get("globalCityId"),
      enabledFrom: f.get("enabledFrom"),
      disabledAt: null,
      status: "Active",
      rowVersion: null,
    });
    router.replace("/dashboard/employees/cities");
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-black">إضافة مدينة تشغيل</h1>
      <form onSubmit={submit}>
        <Card className="grid gap-4 p-6">
          <label className="grid gap-2 text-sm font-bold">
            المدينة
            <select
              name="globalCityId"
              required
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
            >
              <option value="">اختر مدينة</option>
              {cities.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            تاريخ التفعيل
            <input
              name="enabledFrom"
              type="date"
              required
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
            />
          </label>
          <Button type="submit">حفظ المدينة</Button>
        </Card>
      </form>
    </div>
  );
}
