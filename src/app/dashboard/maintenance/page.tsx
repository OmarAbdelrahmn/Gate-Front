"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wrench,
  AlertTriangle,
  Package,
  BadgeDollarSign,
  Droplets,
  PlusCircle,
  FileSpreadsheet,
  ArrowUpRight,
  RefreshCw,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getWorkOrders,
  getOilReminders,
  getOilBarrels,
  getMaintenanceLocations,
} from "@/lib/maintenance/api";
import type {
  WorkOrder,
  OilReminder,
  OilBarrel,
  MaintenanceLocation,
} from "@/lib/maintenance/types";
import {
  workOrderStatusConfig,
  oilReminderStatusConfig,
  formatDateTime,
  formatCurrency,
} from "@/lib/maintenance/constants";

export default function MaintenanceOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [oilReminders, setOilReminders] = useState<OilReminder[]>([]);
  const [openBarrels, setOpenBarrels] = useState<OilBarrel[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, orders, reminders, barrels] = await Promise.all([
        getMaintenanceLocations().catch(() => []),
        getWorkOrders().catch(() => []),
        getOilReminders().catch(() => []),
        getOilBarrels({ status: "open" }).catch(() => []),
      ]);
      setLocations(locs);
      setWorkOrders(orders);
      setOilReminders(reminders);
      setOpenBarrels(barrels);
    } catch (err) {
      console.error("Failed to load maintenance overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeOrdersCount = workOrders.filter(
    (o) => o.status === 1 || o.status === 2,
  ).length;

  const urgentOilReminders = oilReminders.filter(
    (r) => r.status === 2 || r.status === 3,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="text-[#1167c9]" />
            لوحة مؤشرات الصيانة والمخزون والورش
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            مستودع جدة (JED-WH)، ورشة الرياض (RUH-WS)، طبقات تكلفة FIFO، تتبع براميل الزيوت، وأرباح الورشة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadData}
            loading={loading}
            className="text-xs"
          >
            <RefreshCw size={15} />
            تحديث البيانات
          </Button>
          <Link href="/dashboard/maintenance/work-orders">
            <Button variant="primary" className="text-xs">
              <PlusCircle size={16} />
              أمر صيانة جديد
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Work Orders */}
        <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/70 to-white dark:from-blue-950/20 dark:to-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              أوامر العمل النشطة
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Wrench size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {loading ? "…" : activeOrdersCount}
            </span>
            <span className="text-xs text-slate-500">أمر مفتوح / قيد التنفيذ</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-blue-100 dark:border-blue-900/40">
            <span className="text-slate-500">إجمالي الأوامر: {workOrders.length}</span>
            <Link
              href="/dashboard/maintenance/work-orders"
              className="font-bold text-[#1167c9] hover:underline flex items-center gap-1"
            >
              عرض القائمة <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Urgent Oil Reminders */}
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              تغيير الزيت المستحق
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
              <Droplets size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {loading ? "…" : urgentOilReminders.length}
            </span>
            <span className="text-xs text-slate-500">مركبة مستحقة / متأخرة</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-amber-100 dark:border-amber-900/40">
            <span className="text-slate-500">إجمالي المركبات: {oilReminders.length}</span>
            <Link
              href="/dashboard/maintenance/work-orders"
              className="font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              متابعة التذكيرات <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Open Oil Barrels */}
        <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              البراميل المفتوحة (النشطة)
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Package size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {loading ? "…" : openBarrels.length}
            </span>
            <span className="text-xs text-slate-500">براميل قيد الاستهلاك</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-emerald-100 dark:border-emerald-900/40">
            <span className="text-slate-500">
              المتبقي:{" "}
              {openBarrels.reduce((sum, b) => sum + (b.remainingLiters || 0), 0)}{" "}
              لتر
            </span>
            <Link
              href="/dashboard/maintenance/inventory"
              className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              إدارة البراميل <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Operational Locations */}
        <div className="rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-50/70 to-white dark:from-purple-950/20 dark:to-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              مواقع وورش التشغيل
            </span>
            <div className="grid size-10 place-items-center rounded-xl bg-purple-600 text-white shadow-sm">
              <Building2 size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {loading ? "…" : locations.length}
            </span>
            <span className="text-xs text-slate-500">مواقع مسجلة</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-purple-100 dark:border-purple-900/40">
            <span className="text-slate-500">
              جدة: JED-WH | الرياض: RUH-WS
            </span>
            <Link
              href="/dashboard/maintenance/setup"
              className="font-bold text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              عرض الإعدادات <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Locations Overview Cards */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-[#1167c9]" />
          القواعد التشغيلية للمواقع والمستودعات
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Jeddah Warehouse */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-mono font-bold">
                  JED-WH
                </span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1">
                  مستودع جدة (Jeddah Warehouse)
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
                مركبات الشركة فقط
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              المخزون مُمكّن. مخصص لخدمة وصيانة مركبات أسطول الشركة وإصدار المستلزمات للمناديب. لا تظهر فيه خدمات الإصلاح الخارجي أو بيع القطع للعملاء.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> إدارة المخزون
              </span>
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> صيانة الشركة
              </span>
              <span className="text-slate-400">✕ إصلاح خارجي</span>
              <span className="text-slate-400">✕ بيع قطع نقدي</span>
            </div>
          </div>

          {/* Riyadh Workshop */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 p-4 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-mono font-bold">
                  RUH-WS
                </span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1">
                  ورشة الرياض (Riyadh Workshop)
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                شركة + عملاء خارجيين
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              المخزون مُمكّن. يخدم مركبات الشركة والعملاء الخارجيين مع إمكانية بيع قطع الغيار، أجور اليد المدفوعة، مستحقات الفنيين، واحتساب الأرباح الحقيقية.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px]">
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> إدارة المخزون
              </span>
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> صيانة الشركة
              </span>
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> إصلاح خارجي مدفوع
              </span>
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> بيع قطع غيار
              </span>
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> تقرير الأرباح
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Orders & Urgent Oil Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench size={18} className="text-[#1167c9]" />
              أحدث أوامر العمل
            </h2>
            <Link
              href="/dashboard/maintenance/work-orders"
              className="text-xs font-bold text-[#1167c9] hover:underline"
            >
              عرض الكل
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 py-4">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : workOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              لا توجد أوامر عمل مسجلة حتى الآن.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] overflow-hidden">
              {workOrders.slice(0, 5).map((order) => {
                const statusCfg = workOrderStatusConfig[order.status];
                return (
                  <div
                    key={order.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {order.workOrderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                        >
                          {statusCfg?.label || order.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {order.serviceSubjectType === 1
                          ? `مركبة شركة (${order.vehicleAssetNumber || "غير محدد"})`
                          : `عميل خارجي (${order.externalVehicle?.plateOrReference || "-"})`}
                        {" • "}
                        {order.maintenanceLocationNameAr || "الموقع"}
                      </div>
                    </div>
                    <div className="text-left font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(order.actualTotalCost)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Urgent Oil Reminders */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Droplets size={18} className="text-amber-500" />
              تنبيهات تغيير الزيت العاجلة
            </h2>
            <Link
              href="/dashboard/maintenance/work-orders"
              className="text-xs font-bold text-amber-600 hover:underline"
            >
              سجل التذكيرات
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 py-4">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : urgentOilReminders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ممتاز! لا توجد مركبات مستحقة أو متأخرة عن موعد تغيير الزيت.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] overflow-hidden">
              {urgentOilReminders.slice(0, 5).map((reminder) => {
                const statusCfg = oilReminderStatusConfig[reminder.status];
                return (
                  <div
                    key={reminder.vehicleId}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {reminder.assetNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                        >
                          {statusCfg?.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        العداد: {reminder.currentOdometer.toLocaleString()} كم •
                        المقطوع منذ آخر تغيير: {reminder.distanceSinceLastChange.toLocaleString()} كم
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/maintenance/work-orders?openOilChangeFor=${reminder.vehicleId}`}
                    >
                      <Button variant="secondary" className="h-8 text-[11px] px-2.5">
                        تغيير الزيت
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
