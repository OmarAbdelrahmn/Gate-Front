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
      setOilReminders(Array.isArray(reminders) ? reminders : (reminders as any)?.items || []);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="text-slate-700 dark:text-slate-300" size={22} />
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
          <Link href="/admin/maintenance/work-orders/orders">
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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              أوامر العمل النشطة
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Wrench size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "…" : activeOrdersCount}
            </span>
            <span className="text-xs text-slate-500">أمر مفتوح / قيد التنفيذ</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[var(--border)]">
            <span className="text-slate-500">إجمالي الأوامر: {workOrders.length}</span>
            <Link
              href="/admin/maintenance/work-orders/orders"
              className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              عرض القائمة <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Urgent Oil Reminders */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              تغيير الزيت المستحق
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Droplets size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "…" : urgentOilReminders.length}
            </span>
            <span className="text-xs text-slate-500">مركبة مستحقة / متأخرة</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[var(--border)]">
            <span className="text-slate-500">إجمالي المركبات: {oilReminders.length}</span>
            <Link
              href="/admin/maintenance/work-orders/reminders"
              className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              متابعة التذكيرات <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Open Oil Barrels */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              البراميل المفتوحة (النشطة)
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "…" : openBarrels.length}
            </span>
            <span className="text-xs text-slate-500">براميل قيد الاستهلاك</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[var(--border)]">
            <span className="text-slate-500">
              المتبقي:{" "}
              {openBarrels.reduce((sum, b) => sum + (b.remainingLiters || 0), 0)}{" "}
              لتر
            </span>
            <Link
              href="/admin/maintenance/inventory/barrels"
              className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              إدارة البراميل <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Operational Locations */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              مواقع وورش التشغيل
            </span>
            <div className="grid size-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Building2 size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "…" : locations.length}
            </span>
            <span className="text-xs text-slate-500">مواقع مسجلة</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-[var(--border)]">
            <span className="text-slate-500">
              جدة: JED-WH | الرياض: RUH-WS
            </span>
            <Link
              href="/admin/maintenance/setup/locations"
              className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              عرض الإعدادات <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Locations Overview Cards */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-slate-500 dark:text-slate-400" />
          القواعد التشغيلية للمواقع والمستودعات
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Jeddah Warehouse */}
          <div className="rounded-xl border border-[var(--border)] p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
                  JED-WH
                </span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1">
                  مستودع جدة (Jeddah Warehouse)
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 font-medium">
                مركبات الشركة فقط
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              المخزون مُمكّن. مخصص لخدمة وصيانة مركبات أسطول الشركة وإصدار المستلزمات للمناديب. لا تظهر فيه خدمات الإصلاح الخارجي أو بيع القطع للعملاء.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)] text-[11px]">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-slate-400" /> إدارة المخزون
              </span>
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-slate-400" /> صيانة الشركة
              </span>
              <span className="text-slate-400">✕ إصلاح خارجي</span>
              <span className="text-slate-400">✕ بيع قطع نقدي</span>
            </div>
          </div>

          {/* Riyadh Workshop */}
          <div className="rounded-xl border border-[var(--border)] p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
                  RUH-WS
                </span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1">
                  ورشة الرياض (Riyadh Workshop)
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 font-medium">
                شركة + عملاء خارجيين
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              المخزون مُمكّن. يخدم مركبات الشركة والعملاء الخارجيين مع إمكانية بيع قطع الغيار، أجور اليد المدفوعة، مستحقات الفنيين، واحتساب الأرباح الحقيقية.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)] text-[11px]">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-slate-400" /> إدارة المخزون
              </span>
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-slate-400" /> صيانة الشركة
              </span>
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-slate-400" /> إصلاح خارجي مدفوع
              </span>
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-slate-400" /> بيع قطع غيار
              </span>
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-slate-400" /> تقرير الأرباح
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
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench size={16} className="text-slate-500 dark:text-slate-400" />
              أحدث أوامر العمل
            </h2>
            <Link
              href="/admin/maintenance/work-orders/orders"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
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
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
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
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Droplets size={16} className="text-slate-500 dark:text-slate-400" />
              تنبيهات تغيير الزيت العاجلة
            </h2>
            <Link
              href="/admin/maintenance/work-orders/reminders"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
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
                        العداد: {(reminder.currentOdometer ?? 0).toLocaleString()} كم •
                        المقطوع منذ آخر تغيير: {(reminder.distanceSinceLastChange ?? 0).toLocaleString()} كم
                      </div>
                    </div>
                    <Link
                      href={`/admin/maintenance/work-orders/reminders?openOilChangeFor=${reminder.vehicleId}`}
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
