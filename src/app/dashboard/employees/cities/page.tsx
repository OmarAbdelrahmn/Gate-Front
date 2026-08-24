"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit3, MapPin, Plus, Search, X } from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { hrCatalogApi, type HrRow } from "../../../../lib/hr/api";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { translate } from "../../../../lib/i18n";
type Tab = "global-cities" | "operating-cities";
const text = (v: unknown) => (v == null || v === "" ? "—" : String(v));
export default function CitiesPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
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
      setError(e instanceof Error ? e.message : (locale === "en" ? "Failed to load city data." : "تعذر تحميل بيانات المدن."));
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
      setError(e instanceof Error ? e.message : (locale === "en" ? "Failed to save city." : "تعذر حفظ المدينة."));
    } finally {
      setBusy(false);
    }
  }
  const input =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 font-normal";
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">
            {t("nav.employees")}
          </p>
          <h1 className="mt-1 text-3xl font-black">{t("cities.title")}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {locale === "en" ? "Manage global cities and activate operating locations." : "إدارة المدن العالمية ثم تفعيل المدن المستخدمة في التشغيل."}
          </p>
        </div>
        {manage && (
          <Button onClick={() => open(null)}>
            <Plus size={18} />
            {t("common.add")} {tab === "global-cities" ? t("cities.globalCities") : t("cities.operatingCities")}
          </Button>
        )}
      </header>
      <div
        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
        role="tablist"
      >
        {(
          [
            ["operating-cities", t("cities.operatingCities")],
            ["global-cities", t("cities.globalCities")],
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
              {editing ? t("common.edit") : t("common.add")}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label={t("common.close")}
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
                  label={locale === "en" ? "Code" : "الرمز"}
                  value={editing?.code}
                  required
                />
                <Field
                  name="nameAr"
                  label={locale === "en" ? "Arabic Name" : "الاسم العربي"}
                  value={editing?.nameAr}
                  required
                />
                <Field
                  name="nameEn"
                  label={locale === "en" ? "English Name" : "الاسم الإنجليزي"}
                  value={editing?.nameEn}
                  required
                />
                <Field
                  name="regionAr"
                  label={locale === "en" ? "Arabic Region" : "المنطقة بالعربية"}
                  value={editing?.regionAr}
                  required
                />
                <Field
                  name="regionEn"
                  label={locale === "en" ? "English Region" : "المنطقة بالإنجليزية"}
                  value={editing?.regionEn}
                  required
                />
                <Field
                  name="countryCode"
                  label={locale === "en" ? "Country Code" : "رمز الدولة"}
                  value={editing?.countryCode}
                  required
                />
                <Field
                  name="latitude"
                  label={locale === "en" ? "Latitude" : "خط العرض"}
                  value={editing?.latitude}
                  type="number"
                />
                <Field
                  name="longitude"
                  label={locale === "en" ? "Longitude" : "خط الطول"}
                  value={editing?.longitude}
                  type="number"
                />
                <Field
                  name="displayOrder"
                  label={locale === "en" ? "Display Order" : "ترتيب العرض"}
                  value={editing?.displayOrder ?? 0}
                  type="number"
                  required
                />
              </>
            ) : (
              <>
                <label className="grid gap-2 font-bold">
                  {t("cities.globalCities")}
                  <select
                    name="globalCityId"
                    defaultValue={text(editing?.globalCityId).replace("—", "")}
                    required
                    className={input}
                  >
                    <option value="">{locale === "en" ? "Select City" : "اختر مدينة"}</option>
                    {globals.map((city) => (
                      <option key={city.id} value={city.id}>
                        {text(locale === "en" ? city.nameEn || city.nameAr : city.nameAr)} — {text(city.code)}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  name="enabledFrom"
                  label={locale === "en" ? "Enabled Date" : "تاريخ التفعيل"}
                  value={editing?.enabledFrom}
                  type="date"
                  required
                />
                <Field
                  name="disabledAt"
                  label={locale === "en" ? "Disabled Date" : "تاريخ التعطيل"}
                  value={editing?.disabledAt}
                  type="date"
                />
              </>
            )}
            <label className="grid gap-2 font-bold">
              {t("common.status")}
              <select
                name="status"
                required
                defaultValue={
                  text(editing?.status).replace("—", "") || "Active"
                }
                className={input}
              >
                <option value="Active">{t("common.active")}</option>
                <option value="Inactive">{t("common.inactive")}</option>
              </select>
            </label>
            <div className="col-span-full flex justify-end">
              <Button type="submit" loading={busy}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-4">
          <label className="relative block">
            <Search
              className={`absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"}`}
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("cities.searchPlaceholder")}
              className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
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
                  {text(locale === "en" ? city.nameEn || city.nameAr || city.code : city.nameAr || city.code)}
                </span>
                {manage && (
                  <button
                    onClick={() => open(city)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 font-bold text-[#1167c9]"
                  >
                    <Edit3 size={15} />
                    {t("common.edit")}
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {text(locale === "en" ? city.nameAr : city.nameEn)} · {text(city.code)}
              </p>
              <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                {city.status === "Active" ? t("common.active") : city.status === "Inactive" ? t("common.inactive") : text(city.status)}
              </span>
            </article>
          ))}
          {!filtered.length && (
            <p className="col-span-full p-8 text-center text-[var(--muted)]">
              {locale === "en" ? "No matching cities found." : "لا توجد مدن مطابقة."}
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
