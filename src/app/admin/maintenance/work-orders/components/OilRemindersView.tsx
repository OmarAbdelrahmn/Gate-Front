"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Search,
  FileSpreadsheet,
  ArrowLeftRight,
  History,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportToExcel } from "@/lib/export-excel";
import { Input } from "@/components/ui/Input";
import { TableHeaderColumnFilter, type FilterOption } from "@/components/ui/TableHeaderFilter";
import { getOilReminders } from "@/lib/maintenance/api";
import type { OilReminder } from "@/lib/maintenance/types";
import { OilReminderStatus } from "@/lib/maintenance/types";
import {
  oilReminderStatusConfig,
  formatDate,
} from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehiclePlate, useVehiclePlates } from "@/lib/fleet/vehicle-plate-cache";
import { CorrectOilChangeVehicleModal } from "./CorrectOilChangeVehicleModal";
import { VehicleOilChangesModal } from "./VehicleOilChangesModal";

interface OilRemindersViewProps {
  onStartOilChange: (vehicleId: string) => void;
}

const OIL_REMINDERS_FILTERS_SESSION_KEY = "oil_reminders_filters_session";

export function OilRemindersView({ onStartOilChange }: OilRemindersViewProps) {
  const { can } = useAuth();
  const canManage = can("maintenance.oil.complete") && can("inventory.stock.move");
  const canViewOrManageHistory =
    canManage ||
    can("maintenance.oil.read") ||
    (can("maintenance.oil.edit") && can("inventory.stock.move") && can("inventory.cost_layers.read")) ||
    (can("maintenance.oil.cancel") && can("inventory.stock.adjust") && can("inventory.cost_layers.read"));

  // Subscribe to vehicle plate cache for automatic plate resolution
  useVehiclePlates();

  const [reminders, setReminders] = useState<OilReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCorrectVehicleModalOpen, setIsCorrectVehicleModalOpen] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<{
    vehicleId: string;
    plate: string;
    vehicleType: number;
  } | null>(null);

  const isRestoredRef = useRef(false);

  // Restore filters from sessionStorage for current session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(OIL_REMINDERS_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.searchQuery === "string") setSearchQuery(parsed.searchQuery);
        if (typeof parsed.statusFilter === "string") setStatusFilter(parsed.statusFilter);
        if (typeof parsed.typeFilter === "string") setTypeFilter(parsed.typeFilter);
      }
    } catch {
    } finally {
      isRestoredRef.current = true;
    }
  }, []);

  // Save filters to sessionStorage whenever filters change
  useEffect(() => {
    if (!isRestoredRef.current) return;
    try {
      sessionStorage.setItem(
        OIL_REMINDERS_FILTERS_SESSION_KEY,
        JSON.stringify({
          searchQuery,
          statusFilter,
          typeFilter,
        })
      );
    } catch {}
  }, [searchQuery, statusFilter, typeFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    try {
      sessionStorage.removeItem(OIL_REMINDERS_FILTERS_SESSION_KEY);
    } catch {}
  };

  const getPlate = (r: OilReminder) => {
    return (
      (r as any)?.plateNumberAr ||
      (r as any)?.plateNumber ||
      (r.vehicleId ? getVehiclePlate(r.vehicleId, "ar") : null) ||
      (r.assetNumber ? getVehiclePlate(r.assetNumber, "ar") : null) ||
      r.assetNumber ||
      "—"
    );
  };

  const loadReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOilReminders();
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.data)
        ? (data as any).data
        : Array.isArray((data as any)?.reminders)
        ? (data as any).reminders
        : [];
      setReminders(list);
    } catch (err: any) {
      console.error("Failed to load oil reminders:", err);
      setError(err?.message || "تعذر تحميل استحقاقات وتذكيرات الزيوت من الخادم.");
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const safeReminders = Array.isArray(reminders) ? reminders : [];

  const filteredReminders = safeReminders.filter((r) => {
    if (!r) return false;
    if (statusFilter !== "all" && String(r.status) !== statusFilter) return false;
    if (typeFilter !== "all" && String(r.vehicleType) !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qClean = q.replace(/[\s-]+/g, "");
      const plate = getPlate(r).toLowerCase();
      const plateClean = plate.replace(/[\s-]+/g, "");
      const asset = (r.assetNumber || "").toLowerCase();
      const assetClean = asset.replace(/[\s-]+/g, "");

      const matchesPlate = plate.includes(q) || (Boolean(qClean) && plateClean.includes(qClean));
      const matchesAsset = asset.includes(q) || (Boolean(qClean) && assetClean.includes(qClean));

      if (!matchesPlate && !matchesAsset) return false;
    }
    return true;
  });

  const dueCount = safeReminders.filter((r) => r && r.status === 2).length;
  const overdueCount = safeReminders.filter((r) => r && r.status === 3).length;

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredReminders.length === 0) return;
    setExporting(true);
    try {
      await exportToExcel({
        filename: `oil-reminders-${new Date().toISOString().split("T")[0]}.xlsx`,
        sheetName: "تذكيرات وتغيير الزيوت",
        data: filteredReminders,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          { header: "رقم اللوحة", accessor: (r) => getPlate(r), width: 18, isText: true },
          { header: "نوع المركبة", accessor: (r) => r.vehicleType === 2 ? "سيارة" : r.vehicleType === 1 ? "دراجة نارية" : String(r.vehicleType), width: 16 },
          { header: "العداد الحالي (كم)", accessor: (r) => r.currentOdometer, width: 16 },
          { header: "عداد آخر تغيير (كم)", accessor: (r) => r.lastOilChangeOdometer ?? "—", width: 18 },
          { header: "المقطوع منذ التغيير (كم)", accessor: (r) => r.distanceSinceLastChange, width: 20 },
          { header: "الحد الأقصى للاستحقاق (كم)", accessor: (r) => r.maximumDueOdometer, width: 20 },
          { header: "المسافة المتبقية (كم)", accessor: (r) => r.maximumDueOdometer - r.currentOdometer, width: 18 },
          { header: "تاريخ آخر تغيير", accessor: (r) => r.lastCompletedAtUtc ? r.lastCompletedAtUtc.split("T")[0] : "لم يتم مسبقاً", width: 18 },
          { header: "الحالة", accessor: (r) => oilReminderStatusConfig[r.status]?.label || String(r.status), width: 16 },
        ],
      });
    } catch (err) {
      console.error("Export oil reminders error:", err);
    } finally {
      setExporting(false);
    }
  };

  const statusFilterOptions: FilterOption[] = [
    { value: "3", label: "متأخر (Overdue - عاجل)", sublabel: "عاجل - تجاوز الحد الأقصى للاستحقاق" },
    { value: "2", label: "مستحق (Due)", sublabel: "مستحق التغيير وبدء التنبيه" },
    { value: "1", label: "طبيعي (OK)", sublabel: "ضمن معدل الكيلومترات الآمن" },
    { value: "4", label: "لم يتم التغيير مسبقاً", sublabel: "لا يوجد سجل غيار سابق" },
    { value: "5", label: "بيانات العداد مفقودة", sublabel: "العداد الحالي غير مسجل" },
  ];

  const typeFilterOptions: FilterOption[] = [
    { value: "2", label: "سيارات فقط", sublabel: "Cars - دورة 4,000 إلى 5,000 كم" },
    { value: "1", label: "دراجات نارية فقط", sublabel: "Bikes - دورة 800 إلى 1,000 كم" },
  ];

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

      {/* Error Alert if any */}
      {error && (
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-xs flex items-center justify-between gap-3 text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" onClick={loadReminders} className="h-8 text-xs border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30">
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1 max-w-5xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search
                className="pointer-events-none absolute top-3 text-[var(--muted)] right-3"
                size={18}
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم اللوحة أو رقم الأصل..."
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold pr-10 pl-3 focus:outline-none focus:ring-2 focus:ring-[#1167c9]"
              />
            </div>

            {/* Status Select Filter */}
            <div className="w-[170px] shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--foreground)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1167c9]"
              >
                <option value="all">جميع الحالات</option>
                <option value="3">متأخر (Overdue - عاجل)</option>
                <option value="2">مستحق (Due)</option>
                <option value="1">طبيعي (OK)</option>
                <option value="4">لم يتم التغيير مسبقاً</option>
                <option value="5">بيانات العداد مفقودة</option>
              </select>
            </div>

            {/* Type Select Filter */}
            <div className="w-[160px] shrink-0">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--foreground)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1167c9]"
              >
                <option value="all">جميع أنواع المركبات</option>
                <option value="2">سيارات فقط</option>
                <option value="1">دراجات نارية فقط</option>
              </select>
            </div>

            {/* Reset Button */}
            {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-11 px-3 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors shrink-0"
              >
                إعادة ضبط
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] shrink-0 px-2">
              <Droplets size={17} className="text-blue-600" />
              {filteredReminders.length} مركبة
            </span>

            {(overdueCount > 0 || dueCount > 0) && (
              <div className="flex items-center gap-1.5">
                {overdueCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 font-bold text-xs">
                    {overdueCount} متأخر
                  </span>
                )}
                {dueCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-bold text-xs">
                    {dueCount} مستحق
                  </span>
                )}
              </div>
            )}

            {canManage && (
              <Button
                variant="secondary"
                onClick={() => setIsCorrectVehicleModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold h-11 text-xs rounded-xl"
                title="تصحيح اختيار مركبة خاطئة على عملية غيار زيت سابقة"
              >
                <ArrowLeftRight size={14} />
                تصحيح مركبة
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={handleExportExcel}
              disabled={loading || exporting || filteredReminders.length === 0}
              className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold h-11 text-xs rounded-xl"
            >
              <FileSpreadsheet size={15} />
              تصدير إكسل
            </Button>

            <Button variant="secondary" onClick={loadReminders} loading={loading} className="h-11 text-xs rounded-xl">
              <RefreshCw size={14} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Active Column Filter Badges Bar */}
        {(statusFilter !== "all" || typeFilter !== "all") && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/70">
            <span className="text-[11px] font-bold text-[var(--muted)]">فلاتر نشطة:</span>
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <span>{statusFilterOptions.find((o) => o.value === statusFilter)?.label || `حالة ${statusFilter}`}</span>
                <button type="button" onClick={() => setStatusFilter("all")} className="hover:text-red-500 rounded-full">
                  <X size={11} />
                </button>
              </span>
            )}
            {typeFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <span>{typeFilterOptions.find((o) => o.value === typeFilter)?.label || `نوع ${typeFilter}`}</span>
                <button type="button" onClick={() => setTypeFilter("all")} className="hover:text-red-500 rounded-full">
                  <X size={11} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] text-red-600 dark:text-red-400 hover:underline ms-2 font-medium"
            >
              مسح الفلاتر
            </button>
          </div>
        )}

        {/* Reminders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="relative z-10 bg-slate-500/10 text-xs font-bold text-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="p-3">رقم اللوحة</th>
                <th className="p-3">
                  <div className="flex items-center gap-1.5">
                    <span>نوع المركبة</span>
                    <TableHeaderColumnFilter
                      label="نوع المركبة"
                      value={typeFilter === "all" ? [] : [typeFilter]}
                      onChange={(val) => setTypeFilter(val[0] || "all")}
                      options={typeFilterOptions}
                      placeholder="تصفية بالنوع..."
                      multi={false}
                    />
                  </div>
                </th>
                <th className="p-3 text-center">العداد الحالي</th>
                <th className="p-3 text-center">عداد آخر تغيير</th>
                <th className="p-3 text-center">المقطوع منذ التغيير</th>
                <th className="p-3 text-center">تاريخ آخر تغيير</th>
                <th className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>حالة الاستحقاق</span>
                    <TableHeaderColumnFilter
                      label="حالة الاستحقاق"
                      value={statusFilter === "all" ? [] : [statusFilter]}
                      onChange={(val) => setStatusFilter(val[0] || "all")}
                      options={statusFilterOptions}
                      placeholder="تصفية بالحالة..."
                      multi={false}
                    />
                  </div>
                </th>
                {(canManage || canViewOrManageHistory) && (
                  <th className="p-3 text-center">الإجراءات والسجل</th>
                )}
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
                  {error ? "تعذر جلب البيانات، يرجى إعادة المحاولة." : "لا توجد تنبيهات مطابقة للفلتر المحدد."}
                </td>
              </tr>
            ) : (
              filteredReminders.map((r, idx) => {
                const statusCfg = oilReminderStatusConfig[r.status] || {
                  label: "غير محدد",
                  bg: "bg-slate-100 dark:bg-slate-800",
                  text: "text-slate-600 dark:text-slate-300",
                  border: "border-slate-200 dark:border-slate-700",
                };
                const isCar = r.vehicleType === 2;
                const maxKm = isCar ? 5000 : 1000;
                const distance = Number(r.distanceSinceLastChange ?? 0);
                const progressPct = Math.min(
                  100,
                  Math.max(0, (distance / maxKm) * 100),
                );
                const currentOdoText = r.currentOdometer != null ? `${Number(r.currentOdometer).toLocaleString()} كم` : "غير متوفر";
                const lastOdoText = r.lastOilChangeOdometer != null ? `${Number(r.lastOilChangeOdometer).toLocaleString()} كم` : "-";

                return (
                  <tr key={r.vehicleId || r.assetNumber || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {getPlate(r)}
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        {isCar ? <Car size={14} className="text-blue-600" /> : <Bike size={14} className="text-purple-600" />}
                        <span>{isCar ? "سيارة" : "دراجة نارية"}</span>
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {currentOdoText}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500">
                      {lastOdoText}
                    </td>
                    <td className="p-3 text-center">
                      <div className="space-y-1">
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          {distance.toLocaleString()} كم
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
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg?.border || "border-slate-200"} ${statusCfg?.bg || "bg-slate-100"} ${statusCfg?.text || "text-slate-600"}`}
                      >
                        {statusCfg?.label || "غير محدد"}
                      </span>
                    </td>
                    {(canManage || canViewOrManageHistory) && (
                      <td className="p-3 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {canManage && (
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
                          )}
                          {canViewOrManageHistory && r.vehicleId && (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setHistoryVehicle({
                                  vehicleId: r.vehicleId,
                                  plate: getPlate(r),
                                  vehicleType: r.vehicleType,
                                })
                              }
                              className="h-8 px-2.5 text-xs gap-1 font-bold"
                              title="عرض سجل غيار الزيت وتعديل أو إلغاء أو تصحيح العمليات السابقة"
                            >
                              <History size={13} />
                              <span>السجل والتعديل</span>
                            </Button>
                          )}
                        </div>
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

      <CorrectOilChangeVehicleModal
        isOpen={isCorrectVehicleModalOpen}
        onClose={() => setIsCorrectVehicleModalOpen(false)}
        onSuccess={() => {
          loadReminders();
        }}
      />

      {historyVehicle && (
        <VehicleOilChangesModal
          isOpen={Boolean(historyVehicle)}
          vehicleId={historyVehicle.vehicleId}
          vehiclePlate={historyVehicle.plate}
          vehicleType={historyVehicle.vehicleType}
          onClose={() => setHistoryVehicle(null)}
          onChanged={() => {
            loadReminders();
          }}
        />
      )}
    </div>
  );
}
