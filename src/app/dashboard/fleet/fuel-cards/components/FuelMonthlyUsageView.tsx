"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { listRiders } from "@/lib/workforce/api";
import {
  getFuelMonthlyUsage,
  FuelMonthlyUsage,
  FuelMonthlyUsagePage,
  FuelProvider,
  fuelProviderLabels,
} from "@/lib/fleet/fuel-cards-api";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Droplet,
  Coins,
  FileSpreadsheet,
} from "lucide-react";

export function FuelMonthlyUsageView() {
  // Default to 1st of current month
  const defaultMonth = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  };

  const [month, setMonth] = useState(defaultMonth());
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<FuelProvider | "">("");
  const [riderProfileId, setRiderProfileId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [data, setData] = useState<FuelMonthlyUsagePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [ridersOptions, setRidersOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    listRiders()
      .then((riders) => {
        const options = (riders || []).map((r) => ({
          value: r.id,
          label: r.fullNameAr || r.fullNameEn || "مندوب",
          sublabel: `هوية: ${r.iqamaNo || ""}`,
        }));
        setRidersOptions(options);
      })
      .catch((err) => console.error("Failed to load riders options:", err));
  }, []);

  const fetchMonthlyData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFuelMonthlyUsage({
        month,
        search: search.trim() || undefined,
        provider: provider || undefined,
        riderProfileId: riderProfileId || undefined,
        page,
        pageSize,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to fetch monthly usage:", err);
    } finally {
      setLoading(false);
    }
  }, [month, search, provider, riderProfileId, page, pageSize]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const totalLiters = data?.totalLiters ?? 0;
  const totalAmount = data?.totalAmount ?? 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary KPI Cards above table */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>إجمالي اللترات المستهلكة (للكشف كاملاً)</span>
            <Droplet size={18} className="text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {totalLiters.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} <span className="text-xs font-normal">لتر</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>إجمالي المبلغ الشامل للضريبة (للكشف كاملاً)</span>
            <Coins size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">ر.س</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>عدد بطاقات الاستهلاك المقيدة</span>
            <FileSpreadsheet size={18} className="text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {totalCount} <span className="text-xs font-normal text-[var(--muted)]">سجل</span>
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Month Selector (Required) */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              الشهر المطلوب <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              required
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              بحث في السجلات
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث برقم البطاقة، اللوحة، المندوب..."
                className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              />
            </div>
          </div>

          {/* Provider Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              مزود الخدمة
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as FuelProvider | "");
                setPage(1);
              }}
              className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
            >
              <option value="">جميع المزودين...</option>
              <option value="PetroApp">{fuelProviderLabels.PetroApp}</option>
              <option value="SayaraApp">{fuelProviderLabels.SayaraApp}</option>
            </select>
          </div>

          {/* Rider Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              تصفية حسب المندوب
            </label>
            <SearchableSelect
              value={riderProfileId}
              onChange={(val) => {
                setRiderProfileId(val);
                setPage(1);
              }}
              options={ridersOptions}
              placeholder="المندوب..."
              searchPlaceholder="بحث في المناديب..."
            />
          </div>
        </div>
      </div>

      {/* Monthly Usage Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] uppercase">
              <tr>
                <th className="px-4 py-3.5 text-start">المزود</th>
                <th className="px-4 py-3.5 text-start">رقم البطاقة</th>
                <th className="px-4 py-3.5 text-start">رقم اللوحة</th>
                <th className="px-4 py-3.5 text-start">المندوب المسند له</th>
                <th className="px-4 py-3.5 text-start">الشهر</th>
                <th className="px-4 py-3.5 text-end">اللترات المستهلكة</th>
                <th className="px-4 py-3.5 text-end">المبلغ قبل الضريبة</th>
                <th className="px-4 py-3.5 text-end">مبلغ الضريبة</th>
                <th className="px-4 py-3.5 text-end">الإجمالي شامل الضريبة</th>
                <th className="px-4 py-3.5 text-center">العمليات / نوع الوقود</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                    جاري تحميل تقرير الاستهلاك الشهري...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                    لا توجد بيانات استهلاك شهري لشهر ({month}) تطابق الفلترة.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Provider */}
                    <td className="px-4 py-3.5">
                      <Badge tone={item.provider === "PetroApp" ? "blue" : "green"}>
                        {item.providerNameAr}
                      </Badge>
                    </td>

                    {/* Card Number */}
                    <td className="px-4 py-3.5 font-bold">
                      <span dir="auto" className="fuel-plate text-sm text-[var(--foreground)]">
                        {item.cardNumber}
                      </span>
                    </td>

                    {/* Plate Text */}
                    <td className="px-4 py-3.5">
                      {item.plateNumberText ? (
                        <span dir="auto" className="fuel-plate font-bold text-slate-700 dark:text-slate-300">
                          {item.plateNumberText}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>

                    {/* Rider */}
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/dashboard/employees/${item.employeeId}`}
                        className="font-bold text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {item.riderNameAr || item.riderNameEn || "مندوب"}
                        <ExternalLink size={12} className="opacity-60" />
                      </Link>
                    </td>

                    {/* Report Month */}
                    <td className="px-4 py-3.5 font-mono text-[var(--muted)] dir-ltr text-start">
                      {item.reportMonth}
                    </td>

                    {/* Total Liters */}
                    <td className="px-4 py-3.5 text-end font-bold text-blue-700 dark:text-blue-400 font-mono">
                      {item.totalLiters.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}
                    </td>

                    {/* Amount Before Tax */}
                    <td className="px-4 py-3.5 text-end font-mono text-[var(--muted)]">
                      {item.amountBeforeTax != null
                        ? item.amountBeforeTax.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "—"}
                    </td>

                    {/* VAT Amount */}
                    <td className="px-4 py-3.5 text-end font-mono text-[var(--muted)]">
                      {item.vatAmount != null
                        ? item.vatAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "—"}
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3.5 text-end font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                      {item.totalAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </td>

                    {/* Operations / Fuel type */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="text-[11px] space-y-0.5">
                        {item.transactionCount != null && (
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.transactionCount} عملية
                          </div>
                        )}
                        {item.fuelType && (
                          <div className="text-[var(--muted)]">
                            {item.fuelType}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination */}
        {data && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] text-xs text-[var(--muted)] font-medium">
            <div>
              عرض {items.length} من إجمالي {totalCount} سجل (الصفحة {page} من {totalPages})
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
              <span className="px-2 font-bold text-[var(--foreground)]">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
