"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit3, MapPin, Plus, Search, X } from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { hrCatalogApi, type HrRow } from "../../../../lib/hr/api";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
type Tab = "global-cities" | "operating-cities";
const text = (v: unknown) => (v == null || v === "" ? "—" : String(v));
export default function CitiesPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>("operating-cities"),
    [globals, setGlobals] = useState<HrRow[]>([]),
    [operating, setOperating] = useState<HrRow[]>([]),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<HrRow | null>(null),
    [formOpen, setFormOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const manage = can("operating_cities.manage");
  async function load() {
    setError("");
    try {
      const [g, o] = await Promise.all([
        hrCatalogApi.list("global-cities"),
        hrCatalogApi.list("operating-cities"),
      ]);
      setGlobals(g);
      setOperating(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل بيانات المدن.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const rows = tab === "global-cities" ? globals : operating,
    filtered = useMemo(
      () =>
        rows.filter((row) =>
          JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
        ),
      [rows, search],
    );
  function open(row: HrRow | null) {
    setEditing(row);
    setFormOpen(true);
    setError("");
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      value = (key: string) => String(f.get(key) || "");
    try {
      const payload =
        tab === "global-cities"
          ? {
              code: value("code"),
              nameAr: value("nameAr"),
              nameEn: value("nameEn"),
              regionAr: value("regionAr"),
              regionEn: value("regionEn"),
              countryCode: value("countryCode"),
              latitude: value("latitude") ? Number(value("latitude")) : null,
              longitude: value("longitude") ? Number(value("longitude")) : null,
              displayOrder: Number(value("displayOrder") || 0),
              status: value("status"),
              rowVersion: editing?.rowVersion || null,
            }
          : {
              globalCityId: value("globalCityId"),
              enabledFrom: value("enabledFrom"),
              disabledAt: value("disabledAt") || null,
              status: value("status"),
              rowVersion: editing?.rowVersion || null,
            };
      if (editing) await hrCatalogApi.update(tab, editing.id, payload);
      else await hrCatalogApi.create(tab, payload);
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ المدينة.");
    } finally {
      setBusy(false);
    }
  }
  const input =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 font-normal";
  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">
            الإداريون والمناديب
          </p>
          <h1 className="mt-1 text-3xl font-black">إعدادات المدن</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            إدارة المدن العالمية ثم تفعيل المدن المستخدمة في التشغيل.
          </p>
        </div>
        {manage && (
          <Button onClick={() => open(null)}>
            <Plus size={18} />
            إضافة {tab === "global-cities" ? "مدينة عالمية" : "مدينة تشغيل"}
          </Button>
        )}
      </header>
      <div
        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
        role="tablist"
      >
        {(
          [
            ["operating-cities", "مدن التشغيل"],
            ["global-cities", "المدن العالمية"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setFormOpen(false);
            }}
            className={`min-h-11 rounded-lg px-5 font-bold ${tab === key ? "bg-[#1167c9] text-white" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700"
        >
          {error}
        </p>
      )}
      {formOpen && (
        <Card className="p-5">
          <div className="mb-4 flex justify-between">
            <h2 className="text-xl font-black">
              {editing ? "تعديل" : "إضافة"}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="إغلاق"
              className="grid h-11 w-11 place-items-center rounded-xl"
            >
              <X />
            </button>
          </div>
          <form
            onSubmit={submit}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {tab === "global-cities" ? (
              <>
                <Field
                  name="code"
                  label="الرمز"
                  value={editing?.code}
                  required
                />
                <Field
                  name="nameAr"
                  label="الاسم العربي"
                  value={editing?.nameAr}
                  required
                />
                <Field
                  name="nameEn"
                  label="الاسم الإنجليزي"
                  value={editing?.nameEn}
                  required
                />
                <Field
                  name="regionAr"
                  label="المنطقة بالعربية"
                  value={editing?.regionAr}
                  required
                />
                <Field
                  name="regionEn"
                  label="المنطقة بالإنجليزية"
                  value={editing?.regionEn}
                  required
                />
                <Field
                  name="countryCode"
                  label="رمز الدولة"
                  value={editing?.countryCode}
                  required
                />
                <Field
                  name="latitude"
                  label="خط العرض"
                  value={editing?.latitude}
                  type="number"
                />
                <Field
                  name="longitude"
                  label="خط الطول"
                  value={editing?.longitude}
                  type="number"
                />
                <Field
                  name="displayOrder"
                  label="ترتيب العرض"
                  value={editing?.displayOrder ?? 0}
                  type="number"
                  required
                />
              </>
            ) : (
              <>
                <label className="grid gap-2 font-bold">
                  المدينة العالمية
                  <select
                    name="globalCityId"
                    defaultValue={text(editing?.globalCityId).replace("—", "")}
                    required
                    className={input}
                  >
                    <option value="">اختر مدينة</option>
                    {globals.map((city) => (
                      <option key={city.id} value={city.id}>
                        {text(city.nameAr)} — {text(city.code)}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="enabledFrom"
                  label="تاريخ التفعيل"
                  value={editing?.enabledFrom}
                  type="date"
                  required
                />
                <Field
                  name="disabledAt"
                  label="تاريخ التعطيل"
                  value={editing?.disabledAt}
                  type="date"
                />
              </>
            )}
            <label className="grid gap-2 font-bold">
              الحالة
              <select
                name="status"
                required
                defaultValue={
                  text(editing?.status).replace("—", "") || "Active"
                }
                className={input}
              >
                <option value="Active">نشط</option>
                <option value="Inactive">غير نشط</option>
              </select>
            </label>
            <div className="col-span-full flex justify-end">
              <Button type="submit" loading={busy}>
                حفظ
              </Button>
            </div>
          </form>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-4">
          <label className="relative block">
            <Search
              className="absolute right-3 top-3 text-[var(--muted)]"
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث فوري باسم المدينة أو الرمز أو المنطقة"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-10 pl-3"
            />
          </label>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((city) => (
            <article
              key={city.id}
              className="rounded-xl border border-[var(--border)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 font-black">
                  <MapPin size={18} className="text-[#1167c9]" />
                  {text(city.nameAr || city.code)}
                </span>
                {manage && (
                  <button
                    onClick={() => open(city)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 font-bold text-[#1167c9]"
                  >
                    <Edit3 size={15} />
                    تعديل
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {text(city.nameEn)} · {text(city.code)}
              </p>
              <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                {text(city.status)}
              </span>
            </article>
          ))}
          {!filtered.length && (
            <p className="col-span-full p-8 text-center text-[var(--muted)]">
              لا توجد مدن مطابقة.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
function Field({
  name,
  label,
  value,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value: unknown;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 font-bold">
      {label}
      <input
        name={name}
        type={type}
        step={type === "number" ? "any" : undefined}
        defaultValue={text(value).replace("—", "")}
        required={required}
        className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
      />
    </label>
  );
}
