"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import {
  getFuelImportHistory,
  FuelImportHistoryItem,
  FuelProvider,
  fuelProviderLabels,
} from "@/lib/fleet/fuel-cards-api";
import {
  History,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export function FuelImportHistoryView() {
  const [month, setMonth] = useState("");
  const [provider, setProvider] = useState<FuelProvider | "">("");
  const [historyItems, setHistoryItems] = useState<FuelImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFuelImportHistory({
        month: month || undefined,
        provider: provider || undefined,
      });
      setHistoryItems(data || []);
    } catch (err) {
      console.error("Failed to fetch import history:", err);
    } finally {
      setLoading(false);
    }
  }, [month, provider]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Month filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              تصفية حسب الشهر
            </label>
            <input
              type="date"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="YYYY-MM-01"
              className="w-full h-10 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            />
          </div>

          {/* Provider filter */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
              تصفية حسب شركة المزود
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as FuelProvider | "")}
              className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
            >
              <option value="">جميع الشركات المزودة...</option>
              <option value="PetroApp">{fuelProviderLabels.PetroApp}</option>
              <option value="SayaraApp">{fuelProviderLabels.SayaraApp}</option>
            </select>
          </div>

          {/* Refresh button */}
          <div className="flex items-end">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="w-full h-10 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-[var(--foreground)] flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-[#1167c9]" : ""} />
              تحديث سجل الاستيراد
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] uppercase">
              <tr>
                <th className="px-4 py-3.5 text-start">اسم الملف</th>
                <th className="px-4 py-3.5 text-start">المزود</th>
                <th className="px-4 py-3.5 text-start">شهر التقرير</th>
                <th className="px-4 py-3.5 text-end">صفوف المصدر</th>
                <th className="px-4 py-3.5 text-end">بطاقات جديدة</th>
                <th className="px-4 py-3.5 text-end">سجلات أنشئت / حدثت</th>
                <th className="px-4 py-3.5 text-end">بدون إسناد</th>
                <th className="px-4 py-3.5 text-end">أخطاء</th>
                <th className="px-4 py-3.5 text-start">تاريخ الاستيراد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                    جاري تحميل سجل الاستيراد...
                  </td>
                </tr>
              ) : historyItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--muted)]">
                    لا يوجد سجل عمليات استيراد سابق لمطابقة الفلترة.
                  </td>
                </tr>
              ) : (
                historyItems.map((item) => (
                  <tr
                    key={item.id || item.importId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* File Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                        <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[200px]" title={item.originalFileName}>
                          {item.originalFileName}
                        </span>
                      </div>
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-3.5">
                      <Badge tone={item.provider === "PetroApp" ? "blue" : "green"}>
                        {item.providerNameAr}
                      </Badge>
                    </td>

                    {/* Report Month */}
                    <td className="px-4 py-3.5 font-mono text-[var(--muted)] dir-ltr text-start">
                      {item.reportMonth}
                    </td>

                    {/* Source Rows */}
                    <td className="px-4 py-3.5 text-end font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.sourceRows}
                    </td>

                    {/* Created Cards */}
                    <td className="px-4 py-3.5 text-end font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.createdCards}
                    </td>

                    {/* Created/Updated Monthly Records */}
                    <td className="px-4 py-3.5 text-end font-mono text-[var(--muted)]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.createdMonthlyRecords}</span>
                      <span> / </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{item.updatedMonthlyRecords}</span>
                    </td>

                    {/* Unassigned Cards */}
                    <td className="px-4 py-3.5 text-end font-mono font-bold text-amber-600 dark:text-amber-400">
                      {item.unassignedCards}
                    </td>

                    {/* Invalid Rows */}
                    <td className="px-4 py-3.5 text-end font-mono font-bold text-red-600 dark:text-red-400">
                      {item.invalidRows}
                    </td>

                    {/* Imported At */}
                    <td className="px-4 py-3.5 text-start font-mono text-[11px] text-[var(--muted)]">
                      {new Date(item.importedAtUtc).toLocaleString("ar-SA")}
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
