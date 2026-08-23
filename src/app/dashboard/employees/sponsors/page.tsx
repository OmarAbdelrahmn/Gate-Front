"use client";
import { useEffect, useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
import {
  archiveSponsor,
  listSponsors,
  type Sponsor,
  updateSponsor,
} from "../../../../lib/workforce/api";
import { Card } from "../../../../components/ui/Card";
import { systemPrompt } from "../../../../components/ui/SystemDialog";
export default function SponsorsPage() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void listSponsors()
      .then(setItems)
      .catch(() => setError("تعذر تحميل الكفلاء أو لا تملك صلاحية عرضهم."));
  }, []);
  const results = useMemo(
    () =>
      items.filter((x) =>
        `${x.registryNameAr} ${x.employerIdentityNumber} ${x.contactPhone ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [items, search],
  );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-[#1167c9]">الإداريون والمناديب</p>
        <h1 className="mt-1 text-3xl font-black">الكفلاء</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          بيانات الجهات الكافلة المرتبطة بالإداريين والمناديب.
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-4">
          <label className="relative block max-w-xl">
            <Search
              className="pointer-events-none absolute right-3 top-3 text-[var(--muted)]"
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الكفيل أو رقم الهوية"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-10 pl-3 text-sm"
            />
          </label>
        </div>
        {error ? (
          <p role="alert" className="p-6 text-red-700">
            {error}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table dir="rtl" className="min-w-[760px] w-full table-fixed text-right">
              <thead className="bg-slate-500/10 text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4">الكفيل</th>
                  <th className="px-5 py-4">رقم الهوية</th>
                  <th className="px-5 py-4">نوع الكفيل</th>
                  <th className="px-5 py-4">بيانات التواصل</th>
                  <th className="px-5 py-4">الحالة</th>
                  <th className="px-5 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {results.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 font-bold">
                        <Building2 size={17} className="text-[#1167c9]" />
                        {item.registryNameAr}
                      </span>
                      {item.registryNameEn && (
                        <span
                          className="mt-1 block text-xs text-[var(--muted)]"
                          dir="ltr"
                        >
                          {item.registryNameEn}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm" dir="ltr">
                      {item.employerIdentityNumber}
                    </td>
                    <td className="px-5 py-4 text-sm">{item.sponsorType}</td>
                    <td className="px-5 py-4 text-sm">
                      {item.contactName ?? "—"}
                      <span className="mt-1 block text-xs" dir="ltr">
                        {item.contactPhone ?? ""}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={async () => {
                          const value = await systemPrompt(
                            "اسم الكفيل بالعربية",
                            item.registryNameAr,
                          );
                          if (value)
                            void updateSponsor(item.id, {
                              ...item,
                              registryNameAr: value,
                              address: null,
                            }).then(() => location.reload());
                        }}
                        className="text-sm font-bold text-[#1167c9]"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={async () => {
                          const reason = await systemPrompt("سبب الأرشفة");
                          if (reason)
                            void archiveSponsor(item.id, {
                              reason,
                              rowVersion: item.rowVersion,
                            }).then(() => location.reload());
                        }}
                        className="mr-3 text-sm font-bold text-red-600"
                      >
                        أرشفة
                      </button>
                    </td>
                  </tr>
                ))}
                {!results.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-sm text-[var(--muted)]"
                    >
                      لا يوجد كفلاء مطابقون.
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
