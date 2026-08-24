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
import { translate } from "../../../lib/i18n";
type City = { id: string; nameAr: string; nameEn?: string; code: string };
export default function HousingPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [items, setItems] = useState<Housing[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Housing | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
      setError(e instanceof Error ? e.message : (locale === "en" ? "Failed to load housing" : "تعذر تحميل السكن"));
    }
  }
  useEffect(() => {
    void load();
  }, [locale]);

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
      setError(e instanceof Error ? e.message : (locale === "en" ? "Failed to save" : "تعذر الحفظ"));
    } finally {
      setBusy(false);
    }
  }
  const cls =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3";
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">{t("nav.housing")}</p>
          <h1 className="text-3xl font-black">{t("housing.title")}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {locale === "en" ? "Manage residential units, capacity, residents, and supervisors." : "إدارة المساكن والسعة والسكان والمشرفين."}
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
            {t("housing.addHousing")}
          </Button>
        )}
      </header>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
      )}
      {open && (
        <Card className="p-5">
          <h2 className="mb-4 text-xl font-black">
            {editing ? (locale === "en" ? "Edit Housing Unit" : "تعديل السكن") : t("housing.addHousing")}
          </h2>
          <form
            onSubmit={save}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {[
              ["code", locale === "en" ? "Code" : "الرمز"],
              ["nameAr", locale === "en" ? "Arabic Name" : "الاسم العربي"],
              ["nameEn", locale === "en" ? "English Name" : "الاسم الإنجليزي"],
              ["totalCapacity", t("housing.totalCapacity")],
              ["contactPhone", locale === "en" ? "Contact Phone" : "هاتف التواصل"],
              ["buildingNumber", locale === "en" ? "Building No." : "رقم المبنى"],
              ["street", locale === "en" ? "Street" : "الشارع"],
              ["district", locale === "en" ? "District" : "الحي"],
              ["postalCode", locale === "en" ? "Postal Code" : "الرمز البريدي"],
              ["openedDate", locale === "en" ? "Opening Date" : "تاريخ الافتتاح"],
              ["closedDate", locale === "en" ? "Closing Date" : "تاريخ الإغلاق"],
              ["statusReason", locale === "en" ? "Status Reason" : "سبب الحالة"],
              ["notes", locale === "en" ? "Notes" : "ملاحظات"],
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
              {t("cities.operatingCities")}
              <select
                name="cityId"
                required
                defaultValue={editing?.cityId ?? ""}
                className={cls}
              >
                <option value="">{locale === "en" ? "Select City" : "اختر مدينة"}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "en" ? c.nameEn || c.nameAr : c.nameAr} — {c.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-bold">
              {t("common.status")}
              <select
                name="status"
                required
                defaultValue={editing?.status ?? "Active"}
                className={cls}
              >
                <option value="Active">{t("common.active")}</option>
                <option value="Inactive">{t("common.inactive")}</option>
                <option value="Closed">{locale === "en" ? "Closed" : "مغلق"}</option>
              </select>
            </label>
            <div className="col-span-full flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={busy}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="p-4">
          <label className="relative block">
            <Search className={`absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"}`} size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("housing.searchPlaceholder")}
              className={`h-11 w-full rounded-xl border ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
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
                  {locale === "en" ? (x.nameEn || x.nameAr) : x.nameAr}
                </Link>
                {manage && (
                  <button
                    onClick={() => {
                      setEditing(x);
                      setOpen(true);
                    }}
                    aria-label={t("common.edit")}
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
                  {t("housing.residents")} {x.currentResidents}/{x.totalCapacity}
                </span>
                <span className="font-bold text-emerald-700">
                  {t("housing.availableCapacity")} {x.availableCapacity}
                </span>
              </div>
            </article>
          ))}
          {!shown.length && (
            <p className="col-span-full p-8 text-center text-[var(--muted)]">
              {locale === "en" ? "No housing units found." : "لا يوجد سكن مطابق."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
