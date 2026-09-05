"use client";

import React, { useState, useEffect } from "react";
import {
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Clock,
  RefreshCw,
  PlusCircle,
  Car,
  Bike,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getOilReminders } from "@/lib/maintenance/api";
import type { OilReminder } from "@/lib/maintenance/types";
import { OilReminderStatus } from "@/lib/maintenance/types";
import {
  oilReminderStatusConfig,
  formatDate,
} from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface OilRemindersViewProps {
  onStartOilChange: (vehicleId: string) => void;
}

export function OilRemindersView({ onStartOilChange }: OilRemindersViewProps) {
  const { can } = useAuth();
  const canManage = can("maintenance.oil.complete");

  const [reminders, setReminders] = useState<OilReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const loadReminders = async () => {
    setLoading(true);
    try {
      const data = await getOilReminders();
      setReminders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const filteredReminders = reminders.filter((r) => {
    if (statusFilter !== "all" && String(r.status) !== statusFilter) return false;
    if (typeFilter !== "all" && String(r.vehicleType) !== typeFilter) return false;
    return true;
  });

  const dueCount = reminders.filter((r) => r.status === 2).length;
  const overdueCount = reminders.filter((r) => r.status === 3).length;

  return (
    <div className="space-y-4">
      {/* Thresholds Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 text-xs flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white shrink-0">
            <Car size={20} />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">
              قواعد دورة زيت السيارات (Cars)
            </span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
              بدء التذكير عند <strong>4,000 كم</strong> • مستحق ومتأخر عند <strong>5,000 كم</strong> (سعة الزيت: 3.5 لتر بدون فلتر / 4 لتر مع الفلتر).
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20 text-xs flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-purple-600 text-white shrink-0">
            <Bike size={20} />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">
              قواعد دورة زيت الدراجات النارية (Bikes)
            </span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
              بدء التذكير عند <strong>800 كم</strong> • مستحق ومتأخر عند <strong>1,000 كم</strong> (سعة الزيت: 0.8 إلى 1 لتر).
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-bold focus:outline-hidden"
          >
            <option value="all">جميع الحالات</option>
            <option value="3">متأخر (Overdue - عاجل)</option>
            <option value="2">مستحق (Due)</option>
            <option value="1">طبيعي (OK)</option>
            <option value="4">لم يتم التغيير مسبقاً (Never Done)</option>
            <option value="5">بيانات العداد مفقودة</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-bold focus:outline-hidden"
          >
            <option value="all">جميع أنواع المركبات</option>
            <option value="2">سيارات فقط</option>
            <option value="1">دراجات نارية فقط</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {(overdueCount > 0 || dueCount > 0) && (
            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold">
                  {overdueCount} متأخر
                </span>
              )}
              {dueCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {dueCount} مستحق
                </span>
              )}
            </div>
          )}
          <Button variant="secondary" onClick={loadReminders} loading={loading} className="h-9 text-xs">
            <RefreshCw size={14} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Reminders Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رقم الأصل / اللوحة</th>
              <th className="p-3">نوع المركبة</th>
              <th className="p-3 text-center">العداد الحالي</th>
              <th className="p-3 text-center">عداد آخر تغيير</th>
              <th className="p-3 text-center">المقطوع منذ التغيير</th>
              <th className="p-3 text-center">تاريخ آخر تغيير</th>
              <th className="p-3 text-center">حالة الاستحقاق</th>
              {canManage && <th className="p-3 text-center">الإجراء</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  جارٍ فحص استحقاقات تغيير الزيوت...
                </td>
              </tr>
            ) : filteredReminders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  لا توجد تنبيهات مطابقة للفلتر المحدد.
                </td>
              </tr>
            ) : (
              filteredReminders.map((r) => {
                const statusCfg = oilReminderStatusConfig[r.status];
                const isCar = r.vehicleType === 2;
                const maxKm = isCar ? 5000 : 1000;
                const progressPct = Math.min(
                  100,
                  Math.max(0, (r.distanceSinceLastChange / maxKm) * 100),
                );

                return (
                  <tr key={r.vehicleId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {r.assetNumber}
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        {isCar ? <Car size={14} className="text-blue-600" /> : <Bike size={14} className="text-purple-600" />}
                        <span>{isCar ? "سيارة" : "دراجة نارية"}</span>
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {r.currentOdometer.toLocaleString()} كم
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500">
                      {r.lastOilChangeOdometer ? `${r.lastOilChangeOdometer.toLocaleString()} كم` : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="space-y-1">
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          {r.distanceSinceLastChange.toLocaleString()} كم
                        </span>
                        <div className="h-1.5 w-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              r.status === 3
                                ? "bg-red-500"
                                : r.status === 2
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500">
                      {r.lastCompletedAtUtc ? formatDate(r.lastCompletedAtUtc) : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                      >
                        {statusCfg?.label}
                      </span>
                    </td>
                    {canManage && (
                      <td className="p-3 text-center">
                        <Button
                          variant="primary"
                          onClick={() => onStartOilChange(r.vehicleId)}
                          className={`h-8 px-2.5 text-xs ${
                            r.status === 3
                              ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                              : r.status === 2
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : ""
                          }`}
                        >
                          <Droplets size={13} />
                          تغيير الزيت
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
