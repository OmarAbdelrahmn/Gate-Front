// src/app/admin/jahez/dispatches/page.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { getJahezDispatches } from "@/lib/jahez/api";
import type { JahezDispatch } from "@/lib/jahez/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  Truck,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Search,
  Users,
  PackageCheck,
  TrendingUp,
} from "lucide-react";

export default function JahezDailyDispatchesPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [riderFilter, setRiderFilter] = useState("");
  const [search, setSearch] = useState("");

  const [dispatches, setDispatches] = useState<JahezDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const [isPending, startTransition] = useTransition();

  const loadDispatches = async () => {
    if (!from || !to) {
      toast.error("تنبيه", "يرجى تحديد تاريخ البداية والنهاية للتقرير");
      return;
    }
    setLoading(true);
    try {
      const res = await getJahezDispatches({
        from,
        to,
        riderId: riderFilter.trim() || undefined,
        page,
        pageSize,
      });
      setDispatches(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر استعلام تقرير طلبات المناديب";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadDispatches();
    });
  }, [from, to, page]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadDispatches();
  };

  const handleExport = () => {
    exportToExcel({
      filename: `jahez_daily_orders_${from}_to_${to}.xlsx`,
      data: dispatches,
      columns: [
        { header: isEn ? "Date" : "تاريخ التشغيل", accessor: "date" },
        { header: isEn ? "Driver ID" : "رقم الحساب الخارجي", accessor: (d) => d.externalAccountId ?? "-" },
        { header: isEn ? "Rider ID" : "معرف المندوب", accessor: "riderProfileId" },
        { header: isEn ? "Orders Count" : "عدد الطلبات", accessor: "count" },
        { header: isEn ? "Handover ID" : "معرف التسليم", accessor: "handoverId" },
      ],
    });
  };

  const filteredDispatches = useMemo(() => {
    if (!search) return dispatches;
    const term = search.toLowerCase();
    return dispatches.filter(
      (d) =>
        (d.externalAccountId && d.externalAccountId.toLowerCase().includes(term)) ||
        d.riderProfileId.toLowerCase().includes(term) ||
        d.handoverId.toLowerCase().includes(term) ||
        d.date.includes(term),
    );
  }, [dispatches, search]);

  const totalOrders = dispatches.reduce((sum, d) => sum + d.count, 0);
  const uniqueRiders = new Set(dispatches.map((d) => d.riderProfileId)).size;
  const uniqueAccounts = new Set(dispatches.map((d) => d.externalAccountId || d.accountId)).size;
  const averageOrdersPerRider = uniqueRiders > 0 ? (totalOrders / uniqueRiders).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {isEn ? "Daily Orders / Dispatches per Rider Report" : "تقرير طلبات المناديب اليومية لجاهز (Dispatches)"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Official daily order insights imported from Jahez Delivery Insights reports, mapped directly to actual riders."
              : "إحصائيات إنجاز الطلبات اليومية المستوردة من تقارير إكسل جاهز، والمنسوبة للمناديب الفعليين حسب فترات الاستخدام."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadDispatches}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={dispatches.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isEn ? "Export Excel" : "تصدير التقرير"}
          </Button>
        </div>
      </div>

      {/* Date Range & Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col sm:flex-row items-end gap-3"
      >
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "From Date (Required)" : "من تاريخ (إلزامي)"}
          </label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "To Date (Required)" : "إلى تاريخ (إلزامي)"}
          </label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Filter by Rider Profile ID" : "تصفية برقم المندوب الفعلي"}
          </label>
          <Input
            type="text"
            placeholder="UUID..."
            value={riderFilter}
            onChange={(e) => setRiderFilter(e.target.value)}
          />
        </div>

        <div className="flex-1 min-w-[180px] relative">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Search in Table" : "بحث في النتائج"}
          </label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={isEn ? "Driver ID or Rider..." : "رقم الحساب أو المندوب..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>

        <Button type="submit" variant="primary" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Filter className="h-4 w-4 mr-1" />
          {isEn ? "Apply" : "تطبيق"}
        </Button>
      </form>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isEn ? "Total Dispatches in Period" : "إجمالي طلبات الفترة"}
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-emerald-600" />
            {totalOrders.toLocaleString("ar-SA")}
          </p>
          <span className="text-xs text-gray-400 mt-1 block">
            {dispatches.length} {isEn ? "daily records" : "سجل يومي"}
          </span>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {isEn ? "Active Riders with Orders" : "المناديب المنفذين للطلبات"}
          </span>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            {uniqueRiders}
          </p>
          <span className="text-xs text-blue-500 mt-1 block">
            {isEn ? "Attributed actual riders" : "مناديب فعليين مسندة إليهم"}
          </span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {isEn ? "Active Accounts" : "الحسابات المستخدمة"}
          </span>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Truck className="h-6 w-6 text-amber-600" />
            {uniqueAccounts}
          </p>
          <span className="text-xs text-amber-500 mt-1 block">
            {isEn ? "Accounts with activity" : "حسابات جاهز النشطة"}
          </span>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            {isEn ? "Average Dispatches / Rider" : "معدل الطلبات لكل مندوب"}
          </span>
          <p className="mt-2 text-2xl font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            {averageOrdersPerRider}
          </p>
          <span className="text-xs text-purple-500 mt-1 block">
            {isEn ? "Orders per active rider" : "طلب / مندوب خلال الفترة"}
          </span>
        </div>
      </div>

      {/* Dispatches Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Date" : "تاريخ التشغيل"}</th>
                <th className="px-4 py-3">{isEn ? "Driver ID" : "رقم الحساب الخارجي"}</th>
                <th className="px-4 py-3">{isEn ? "Actual Rider Profile" : "المندوب الفعلي"}</th>
                <th className="px-4 py-3">{isEn ? "Dispatches Count" : "عدد الطلبات"}</th>
                <th className="px-4 py-3">{isEn ? "Handover ID" : "معرف التسليم"}</th>
                <th className="px-4 py-3">{isEn ? "Account ID" : "معرف الحساب"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    {isEn ? "Loading dispatches report..." : "جارٍ استعلام تقرير الطلبات اليومية..."}
                  </td>
                </tr>
              ) : filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Truck className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No dispatches recorded in this date range" : "لا توجد طلبات مسجلة في هذا النطاق الزمني"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((d, idx) => (
                  <tr key={`${d.handoverId}-${d.date}-${idx}`} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                      {d.date}
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">
                      {d.externalAccountId ? `[${d.externalAccountId}]` : "-"}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {d.riderProfileId.slice(0, 8)}...
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-bold text-base text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                        {d.count} {isEn ? "orders" : "طلب"}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {d.handoverId.slice(0, 8)}...
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {d.accountId.slice(0, 8)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
