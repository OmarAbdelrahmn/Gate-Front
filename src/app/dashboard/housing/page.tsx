"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building, Edit3, Plus, Search } from "lucide-react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { authFetch } from "../../../lib/auth/api";
import {
  createHousing,
  listHousing,
  updateHousing,
  type Housing,
} from "../../../lib/housing/api";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
type City = { id: string; nameAr: string; code: string };
export default function HousingPage() {
  const { can } = useAuth(),
    [items, setItems] = useState<Housing[]>([]),
    [cities, setCities] = useState<City[]>([]),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Housing | null>(null),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const manage = can("housing.manage");
  async function load() {
    try {
      const [h, c] = await Promise.all([
        listHousing(),
        authFetch<City[]>("/api/hr-catalogs/operating-cities"),
      ]);
      setItems(h);
      setCities(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل السكن");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const shown = useMemo(
    () =>
      items.filter((x) =>
        `${x.code} ${x.nameAr} ${x.nameEn} ${x.cityAr}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [items, search],
  );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget),
      v = (k: string) => String(f.get(k) || "");
    const payload = {
      code: v("code"),
      nameAr: v("nameAr"),
      nameEn: v("nameEn"),
      cityId: v("cityId"),
      address: {
        buildingNumber: v("buildingNumber") || null,
        street: v("street") || null,
        district: v("district") || null,
        city: null,
        postalCode: v("postalCode") || null,
        additionalNumber: null,
      },
      latitude: null,
      longitude: null,
      totalCapacity: Number(v("totalCapacity")),
      contactPhone: v("contactPhone") || null,
      openedDate: v("openedDate") || null,
      closedDate: v("closedDate") || null,
      status: v("status"),
      statusReason: v("statusReason") || null,
      notes: v("notes") || null,
      rowVersion: editing?.rowVersion || null,
    };
    try {
      if (editing) await updateHousing(editing.id, payload);
      else await createHousing(payload);
      setOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }
  const cls =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3";
  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">إدارة السكن</p>
          <h1 className="text-3xl font-black">السكن</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            إدارة المساكن والسعة والسكان والمشرفين.
          </p>
        </div>
        {manage && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={18} />
            إضافة سكن
          </Button>
        )}
      </header>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
      )}
      {open && (
        <Card className="p-5">
          <h2 className="mb-4 text-xl font-black">
            {editing ? "تعديل السكن" : "إضافة سكن"}
          </h2>
          <form
            onSubmit={save}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {[
              ["code", "الرمز"],
              ["nameAr", "الاسم العربي"],
              ["nameEn", "الاسم الإنجليزي"],
              ["totalCapacity", "السعة الإجمالية"],
              ["contactPhone", "هاتف التواصل"],
              ["buildingNumber", "رقم المبنى"],
              ["street", "الشارع"],
              ["district", "الحي"],
              ["postalCode", "الرمز البريدي"],
              ["openedDate", "تاريخ الافتتاح"],
              ["closedDate", "تاريخ الإغلاق"],
              ["statusReason", "سبب الحالة"],
              ["notes", "ملاحظات"],
            ].map(([k, l]) => (
              <label key={k} className="grid gap-2 font-bold">
                {l}
                <input
                  name={k}
                  type={
                    k.includes("Date")
                      ? "date"
                      : k === "totalCapacity"
                        ? "number"
                        : "text"
                  }
                  required={[
                    "code",
                    "nameAr",
                    "nameEn",
                    "totalCapacity",
                  ].includes(k)}
                  defaultValue={String(
                    (editing as unknown as Record<string, unknown>)?.[k] ?? "",
                  )}
                  className={cls}
                />
              </label>
            ))}
            <label className="grid gap-2 font-bold">
              مدينة التشغيل
              <select
                name="cityId"
                required
                defaultValue={editing?.cityId ?? ""}
                className={cls}
              >
                <option value="">اختر مدينة</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} — {c.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-bold">
              الحالة
              <select
                name="status"
                required
                defaultValue={editing?.status ?? "Active"}
                className={cls}
              >
                <option value="Active">نشط</option>
                <option value="Inactive">غير نشط</option>
                <option value="Closed">مغلق</option>
              </select>
            </label>
            <div className="col-span-full flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" loading={busy}>
                حفظ
              </Button>
            </div>
          </form>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="p-4">
          <label className="relative block">
            <Search className="absolute right-3 top-3" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث فوري"
              className="h-11 w-full rounded-xl border pr-10"
            />
          </label>
        </div>
        <div className="grid gap-3 border-t p-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((x) => (
            <article key={x.id} className="rounded-xl border p-4">
              <div className="flex justify-between">
                <Link
                  href={`/dashboard/housing/${x.id}`}
                  className="flex gap-2 font-black text-[#1167c9]"
                >
                  <Building size={18} />
                  {x.nameAr}
                </Link>
                {manage && (
                  <button
                    onClick={() => {
                      setEditing(x);
                      setOpen(true);
                    }}
                    aria-label="تعديل"
                    className="grid h-10 w-10 place-items-center rounded-lg border"
                  >
                    <Edit3 size={16} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {x.cityAr} · {x.code}
              </p>
              <div className="mt-4 flex justify-between text-sm">
                <span>
                  السكان {x.currentResidents}/{x.totalCapacity}
                </span>
                <span className="font-bold text-emerald-700">
                  متاح {x.availableCapacity}
                </span>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
