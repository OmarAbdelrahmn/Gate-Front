"use client";

import React, { useState, useEffect } from "react";
import {
  Droplets,
  Car,
  Bike,
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  FileText,
  HelpCircle,
  TrendingDown,
  RotateCcw,
  FileSpreadsheet,
  ArrowLeftRight,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { exportMultiSheetExcel, type ExcelSheetDefinition } from "@/lib/export-excel";
import { getOilBarrelUsage } from "@/lib/maintenance/api";
import { CorrectOilChangeVehicleModal } from "@/app/admin/maintenance/work-orders/components/CorrectOilChangeVehicleModal";
import { VehicleOilChangesModal } from "@/app/admin/maintenance/work-orders/components/VehicleOilChangesModal";
import { useMaintenanceLookups } from "@/lib/maintenance/lookups";
import type {
  OilBarrel,
  OilBarrelUsageResponse,
  OilBarrelUsageVehicleRow,
  OilBarrelLossEntry,
} from "@/lib/maintenance/types";
import {
  oilBarrelStatusConfig,
  oilBarrelVehicleTypeConfig,
  sharedOilBarrelVehicleTypeConfig,
  formatDateTime,
} from "@/lib/maintenance/constants";

interface OilBarrelUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  barrel: OilBarrel | null;
  itemName?: string;
  locationName?: string;
}

export function OilBarrelUsageModal({
  isOpen,
  onClose,
  barrel,
  itemName,
  locationName,
}: OilBarrelUsageModalProps) {
  const {
    resolveUserName,
    resolveLocationName,
    resolveWorkOrderLabel,
  } = useMaintenanceLookups();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<OilBarrelUsageResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"vehicles" | "losses">("vehicles");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [lossPage, setLossPage] = useState(1);
  const [lossPageSize, setLossPageSize] = useState(50);
  const [exporting, setExporting] = useState(false);
  const [isCorrectVehicleModalOpen, setIsCorrectVehicleModalOpen] = useState(false);
  const [selectedVehicleForOps, setSelectedVehicleForOps] = useState<{
    vehicleId: string;
    plate: string;
    vehicleType?: number | null;
  } | null>(null);

  const handleExportExcel = async () => {
    if (!barrel || !data) return;
    setExporting(true);
    try {
      let allVehicles: OilBarrelUsageVehicleRow[] = [];
      let allLosses: OilBarrelLossEntry[] = [];

      // If there are more vehicle records than currently loaded in this single page, fetch all
      if (data.totalCount > data.vehicles.length) {
        const fetchPageSize = 200;
        const totalPages = Math.ceil(data.totalCount / fetchPageSize);
        for (let p = 1; p <= totalPages; p++) {
          const res = await getOilBarrelUsage(barrel.id, p, fetchPageSize, 1, 1);
          if (res.vehicles && res.vehicles.length > 0) {
            allVehicles.push(...res.vehicles);
          }
        }
      } else {
        allVehicles = [...data.vehicles];
      }

      // If there are more loss records than currently loaded, fetch all losses
      const totalLossCount = data.lossTotalCount ?? data.lossEntries?.length ?? 0;
      const currentLosses = data.lossEntries || [];
      if (totalLossCount > currentLosses.length) {
        const fetchLossPageSize = 200;
        const totalLossPages = Math.ceil(totalLossCount / fetchLossPageSize);
        for (let lp = 1; lp <= totalLossPages; lp++) {
          const res = await getOilBarrelUsage(barrel.id, 1, 1, lp, fetchLossPageSize);
          if (res.lossEntries && res.lossEntries.length > 0) {
            allLosses.push(...res.lossEntries);
          }
        }
      } else {
        allLosses = [...currentLosses];
      }

      if (allVehicles.length === 0 && allLosses.length === 0) {
        toast.error("لا توجد بيانات", "لا توجد سجلات استهلاك أو فاقد لتصديرها لهذا البرميل.");
        return;
      }

      const safeBarrelNumber = barrel.barrelNumber.replace(/[\\/*?:[\]]/g, "_");
      const filename = `oil-barrel-usage-${safeBarrelNumber}-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const vehicleSheet: ExcelSheetDefinition<OilBarrelUsageVehicleRow> = {
        sheetName: "استهلاك المركبات",
        data: allVehicles,
        columns: [
          {
            header: "م",
            accessor: (_, idx) => idx + 1,
            width: 6,
          },
          {
            header: "رقم البرميل",
            accessor: () => barrel.barrelNumber,
            isText: true,
            width: 18,
          },
          {
            header: "صنف الزيت",
            accessor: () => itemName || "—",
            width: 22,
          },
          {
            header: "المستودع / الموقع",
            accessor: () => locationName || "—",
            width: 20,
          },
          {
            header: "رقم اللوحة (عربي)",
            accessor: (row) => row.plateNumberAr || (row.externalPlateOrReference ? row.externalPlateOrReference : "—"),
            isText: true,
            width: 18,
          },
          {
            header: "رقم اللوحة (إنجليزي)",
            accessor: (row) => row.plateNumberEn || "—",
            isText: true,
            width: 18,
          },
          {
            header: "رقم الأصل / المرجع",
            accessor: (row) => row.assetNumber || (row.externalWorkOrderId ? resolveWorkOrderLabel(row.externalWorkOrderId) : "—"),
            isText: true,
            width: 18,
          },
          {
            header: "تصنيف السجل",
            accessor: (row) => {
              if (row.vehicleId) return "مركبة أسطول";
              if (row.externalWorkOrderId || row.externalPlateOrReference) return "مركبة خارجية";
              return "استهلاك سابق للترقية";
            },
            width: 18,
          },
          {
            header: "نوع المركبة",
            accessor: (row) => {
              if (row.vehicleType === 1) return "دراجة نارية";
              if (row.vehicleType === 2) return "سيارة";
              return "—";
            },
            width: 14,
          },
          {
            header: "صافي الاستهلاك (لتر)",
            accessor: (row) => Number(row.netUsedLiters.toFixed(2)),
            width: 18,
          },
          {
            header: "إجمالي المنصرف (لتر)",
            accessor: (row) => Number(row.issuedLiters.toFixed(2)),
            width: 18,
          },
          {
            header: "إجمالي المرتجع (لتر)",
            accessor: (row) => Number(row.reversedLiters.toFixed(2)),
            width: 18,
          },
          {
            header: "عدد العمليات",
            accessor: (row) => row.issueCount,
            width: 12,
          },
          {
            header: "تاريخ آخر استخدام",
            accessor: (row) => (row.lastUsedAtUtc ? formatDateTime(row.lastUsedAtUtc) : "—"),
            width: 22,
          },
        ],
      };

      const lossSheet: ExcelSheetDefinition<OilBarrelLossEntry> = {
        sheetName: "سجل الفاقد والتالف",
        data: allLosses,
        columns: [
          {
            header: "م",
            accessor: (_, idx) => idx + 1,
            width: 6,
          },
          {
            header: "رقم البرميل",
            accessor: () => barrel.barrelNumber,
            isText: true,
            width: 18,
          },
          {
            header: "صنف الزيت",
            accessor: () => itemName || "—",
            width: 22,
          },
          {
            header: "المستودع / الموقع",
            accessor: () => locationName || "—",
            width: 20,
          },
          {
            header: "نوع الفاقد / السبب",
            accessor: (row) => {
              if (row.missingReason === 1) return "مفقود (Missing)";
              if (row.missingReason === 2) return "تالف أو مسكوب (Wasted)";
              if (row.missingReason === 3) return "مسروق (Theft)";
              return "فاقد عادي (Ordinary Loss)";
            },
            width: 24,
          },
          {
            header: "الكمية (لتر)",
            accessor: (row) => Number(row.quantityLiters.toFixed(2)),
            width: 14,
          },
          {
            header: "التكلفة التقديرية (ر.س)",
            accessor: (row) => Number(row.costAmount.toFixed(2)),
            width: 18,
          },
          {
            header: "البيان / سبب التسجيل",
            accessor: (row) => row.reason || "—",
            width: 28,
          },
          {
            header: "المستودع المسؤول",
            accessor: (row) =>
              row.responsibleInventoryLocationId
                ? resolveLocationName(row.responsibleInventoryLocationId)
                : locationName || "—",
            width: 22,
          },
          {
            header: "المسجل بواسطة",
            accessor: (row) =>
              row.recordedByUserId ? resolveUserName(row.recordedByUserId) : "مستخدم النظام",
            width: 22,
          },
          {
            header: "مصدر القيد",
            accessor: (row) =>
              row.correctionRevisionId
                ? "هالك مرتجع من تعديل/إلغاء غيار زيت (برميل مغلق)"
                : row.missingReason
                  ? "شطب مستودع"
                  : "فاقد تشغيل عادي",
            width: 30,
          },
          {
            header: "تاريخ الحدوث",
            accessor: (row) => (row.occurredAtUtc ? formatDateTime(row.occurredAtUtc) : "—"),
            width: 22,
          },
          {
            header: "تاريخ التسجيل",
            accessor: (row) => (row.recordedAtUtc ? formatDateTime(row.recordedAtUtc) : "—"),
            width: 22,
          },
        ],
      };

      await exportMultiSheetExcel({
        filename,
        sheets: [vehicleSheet, lossSheet],
      });

      toast.success(
        "تم التصدير بنجاح",
        `تم تنزيل سجل استهلاك وفاقد البرميل ${barrel.barrelNumber} في شيتين منفصلين (استهلاك المركبات + سجل الفاقد والتالف)`
      );
    } catch (err: unknown) {
      console.error("Export barrel usage error:", err);
      toast.error("فشل التصدير", err instanceof Error ? err.message : "حدث خطأ أثناء تصدير سجل الاستهلاك.");
    } finally {
      setExporting(false);
    }
  };

  const loadUsage = async (
    targetPage = page,
    targetPageSize = pageSize,
    targetLossPage = lossPage,
    targetLossPageSize = lossPageSize
  ) => {
    if (!barrel) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getOilBarrelUsage(
        barrel.id,
        targetPage,
        targetPageSize,
        targetLossPage,
        targetLossPageSize
      );
      setData(res);
      setPage(res.page);
      setPageSize(res.pageSize);
      if (res.lossPage) setLossPage(res.lossPage);
      if (res.lossPageSize) setLossPageSize(res.lossPageSize);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "تعذر استرجاع بيانات استهلاك البرميل.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && barrel) {
      setPage(1);
      setLossPage(1);
      setActiveTab("vehicles");
      loadUsage(1, pageSize, 1, lossPageSize);
    } else {
      setData(null);
      setErrorMsg(null);
    }
  }, [isOpen, barrel?.id]);

  if (!barrel) return null;

  const currentBarrel = data?.barrel || barrel;
  const isShared = Boolean(currentBarrel.allowBothVehicleTypes);
  const statusCfg = oilBarrelStatusConfig[currentBarrel.status];
  const typeCfg =
    !isShared &&
    currentBarrel.allowedVehicleType !== undefined &&
    currentBarrel.allowedVehicleType !== null
      ? oilBarrelVehicleTypeConfig[currentBarrel.allowedVehicleType]
      : null;

  const totalVehiclePages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1;
  const totalLossPages = data
    ? Math.max(1, Math.ceil((data.lossTotalCount ?? data.lossEntries?.length ?? 0) / lossPageSize))
    : 1;

  const handleVehiclePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalVehiclePages) return;
    setPage(newPage);
    loadUsage(newPage, pageSize, lossPage, lossPageSize);
  };

  const handleVehiclePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    loadUsage(1, newSize, lossPage, lossPageSize);
  };

  const handleLossPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalLossPages) return;
    setLossPage(newPage);
    loadUsage(page, pageSize, newPage, lossPageSize);
  };

  const handleLossPageSizeChange = (newSize: number) => {
    setLossPageSize(newSize);
    setLossPage(1);
    loadUsage(page, pageSize, 1, newSize);
  };

  const getLossReasonBadge = (missingReason: number | null | undefined) => {
    if (missingReason === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          مفقود (Missing)
        </span>
      );
    }
    if (missingReason === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          تالف / مسكوب (Wasted)
        </span>
      );
    }
    if (missingReason === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          مسروق (Theft)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        فاقد عادي (Ordinary Loss)
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`سجل استهلاك البرميل / Barrel Usage — ${barrel.barrelNumber}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Barrel Header & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Droplets size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                  {currentBarrel.barrelNumber}
                </span>
                {statusCfg && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusCfg.border} ${statusCfg.bg} ${statusCfg.text}`}
                  >
                    {statusCfg.label}
                  </span>
                )}
                {isShared ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${sharedOilBarrelVehicleTypeConfig.border} ${sharedOilBarrelVehicleTypeConfig.bg} ${sharedOilBarrelVehicleTypeConfig.text}`}
                  >
                    <Car size={13} />
                    <Bike size={13} />
                    {sharedOilBarrelVehicleTypeConfig.badgeAr}
                  </span>
                ) : typeCfg ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeCfg.border} ${typeCfg.bg} ${typeCfg.text}`}
                  >
                    {currentBarrel.allowedVehicleType === 1 ? (
                      <Bike size={13} />
                    ) : (
                      <Car size={13} />
                    )}
                    {typeCfg.badgeAr}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                    <HelpCircle size={13} />
                    غير محدد النوع
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {itemName || "صنف الزيت"} • {locationName || "الموقع"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              disabled={loading || exporting || !data || (data.vehicles.length === 0 && (!data.lossEntries || data.lossEntries.length === 0))}
              loading={exporting}
              className="h-9 text-xs gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
            >
              <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
              تصدير Excel (شيتين)
            </Button>

            <Button
              variant="secondary"
              onClick={() => setIsCorrectVehicleModalOpen(true)}
              className="h-9 text-xs gap-1.5 font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-300 dark:border-amber-800"
              title="تصحيح اختيار مركبة خاطئة على عملية غيار زيت"
            >
              <ArrowLeftRight size={13} />
              تصحيح مركبة
            </Button>

            <Button
              variant="secondary"
              onClick={() => loadUsage(page, pageSize, lossPage, lossPageSize)}
              loading={loading}
              className="h-9 text-xs"
            >
              <RefreshCw size={13} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Global Summary KPI Cards (Cover entire barrel) */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Net Used */}
            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30">
              <span className="text-[11px] text-blue-700 dark:text-blue-300 block font-medium">
                صافي الاستهلاك (المركبات)
              </span>
              <span className="text-lg font-mono font-black text-blue-900 dark:text-blue-100">
                {data.netUsedLiters.toFixed(2)}
                <span className="text-xs font-normal mr-1">لتر</span>
              </span>
            </div>

            {/* Total Issued */}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-slate-500 block font-medium">
                إجمالي المنصرف
              </span>
              <span className="text-lg font-mono font-black text-slate-900 dark:text-white">
                {data.totalIssuedLiters.toFixed(2)}
                <span className="text-xs font-normal mr-1">لتر</span>
              </span>
            </div>

            {/* Total Reversed */}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                إجمالي المرتجع
              </span>
              <span className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-300">
                {data.totalReversedLiters.toFixed(2)}
                <span className="text-xs font-normal mr-1">لتر</span>
              </span>
            </div>

            {/* Remaining */}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-slate-500 block font-medium">
                المتبقي الحالي
              </span>
              <span className="text-lg font-mono font-black text-slate-800 dark:text-slate-200">
                {currentBarrel.remainingLiters.toFixed(2)}
                <span className="text-xs font-normal mr-1">لتر</span>
              </span>
            </div>

            {/* Recorded Loss */}
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-medium">
                الفاقد الطبيعي (2%)
              </span>
              <span className="text-lg font-mono font-black text-amber-800 dark:text-amber-300">
                {currentBarrel.recordedLossLiters.toFixed(2)}
                <span className="text-xs font-normal mr-1">لتر</span>
              </span>
            </div>

            {/* Recorded Missing (Warehouse write-off) */}
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
              <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">
                المفقود والتالف (المستودع)
              </span>
              <span className="text-lg font-mono font-black text-rose-800 dark:text-rose-300">
                {(currentBarrel.recordedMissingLiters || 0).toFixed(2)}
                <span className="text-xs font-normal mr-1">لتر</span>
              </span>
            </div>
          </div>
        )}

        {/* Informational note about totals */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
          <span>* الإجماليات أعلاه تغطي استهلاك البرميل بالكامل. الفاقد الطبيعي الموثق ومفقودات المستودع مسجلة بشكل منفصل ومفصل.</span>
          {data && (
            <span className="font-medium">
              مركبات: {data.totalCount} | قيود فاقد/تالف: {data.lossTotalCount ?? data.lossEntries?.length ?? 0}
            </span>
          )}
        </div>

        {/* Error state */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Navigation Tabs (Vehicles vs Losses) */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("vehicles")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
              activeTab === "vehicles"
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            <Car size={14} />
            <span>استهلاك المركبات</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "vehicles"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-[var(--foreground)]"
              }`}
            >
              {data?.totalCount ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("losses")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
              activeTab === "losses"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            <AlertCircle size={14} />
            <span>سجل الفاقد والتالف (Loss & Waste)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "losses"
                  ? "bg-white/20 text-white"
                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
              }`}
            >
              {data?.lossTotalCount ?? data?.lossEntries?.length ?? 0}
            </span>
          </button>
        </div>

        {/* Table Content (Vehicles vs Losses) */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              {activeTab === "vehicles" ? "جارٍ تحميل تفاصيل استهلاك المركبات..." : "جارٍ تحميل تفاصيل قيود الفاقد والتالف..."}
            </div>
          ) : activeTab === "vehicles" ? (
            !data || data.vehicles.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                لا توجد عمليات استهلاك مركبات مسجلة لهذا البرميل حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold">
                      <th className="p-3">المركبة / أمر العمل</th>
                      <th className="p-3 text-center">نوع المركبة</th>
                      <th className="p-3 text-center">الاستهلاك باللتر (الصافي)</th>
                      <th className="p-3 text-center">المنصرف</th>
                      <th className="p-3 text-center">المرتجع</th>
                      <th className="p-3 text-center">عدد العمليات</th>
                      <th className="p-3 text-left">آخر استخدام</th>
                      <th className="p-3 text-center">إدارة عمليات المركبة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {data.vehicles.map((row, idx) => {
                      const isExternal = row.vehicleId === null && Boolean(row.externalWorkOrderId || row.externalPlateOrReference);
                      const isLegacyUnidentified = row.vehicleId === null && !row.externalWorkOrderId && !row.externalPlateOrReference;

                      return (
                        <tr
                          key={row.vehicleId || row.externalWorkOrderId || `unidentified-${idx}`}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                        >
                          {/* Plate / Asset */}
                          <td className="p-3">
                            {isLegacyUnidentified ? (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <HelpCircle size={14} className="text-slate-400" />
                                <span className="font-bold">استهلاك تاريخي غير محدد</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  سابق للترقية
                                </span>
                              </div>
                            ) : isExternal ? (
                              <div>
                                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                                  <span>{row.externalPlateOrReference || "مركبة خارجية"}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    خارجي
                                  </span>
                                </div>
                                {row.externalWorkOrderId && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {resolveWorkOrderLabel(row.externalWorkOrderId)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="font-mono font-bold text-slate-900 dark:text-white">
                                  {row.plateNumberAr || row.plateNumberEn || "-"}
                                  {row.plateNumberAr && row.plateNumberEn && (
                                    <span className="text-[11px] text-slate-400 mr-1.5">
                                      ({row.plateNumberEn})
                                    </span>
                                  )}
                                </div>
                                {row.assetNumber && (
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    أصل #{row.assetNumber}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Vehicle Type */}
                          <td className="p-3 text-center">
                            {row.vehicleType === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Bike size={12} />
                                دراجة نارية
                              </span>
                            ) : row.vehicleType === 2 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <Car size={12} />
                                سيارة
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">-</span>
                            )}
                          </td>

                          {/* Net Used Liters */}
                          <td className="p-3 text-center">
                            <span className="font-mono font-black text-sm text-[#1167c9] dark:text-blue-400">
                              {row.netUsedLiters.toFixed(2)}
                              <span className="text-[10px] font-normal mr-0.5">L</span>
                            </span>
                          </td>

                          {/* Issued */}
                          <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                            {row.issuedLiters.toFixed(2)}
                          </td>

                          {/* Reversed */}
                          <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400">
                            {row.reversedLiters > 0 ? `+${row.reversedLiters.toFixed(2)}` : "0.00"}
                          </td>

                          {/* Issue Count */}
                          <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                            {row.issueCount}
                          </td>

                          {/* Last Used */}
                          <td className="p-3 text-left font-mono text-[11px] text-slate-500">
                            {row.lastUsedAtUtc ? formatDateTime(row.lastUsedAtUtc) : "-"}
                          </td>

                          {/* Vehicle Operations Action */}
                          <td className="p-3 text-center">
                            {row.vehicleId ? (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                  setSelectedVehicleForOps({
                                    vehicleId: row.vehicleId!,
                                    plate:
                                      row.plateNumberAr ||
                                      row.plateNumberEn ||
                                      row.assetNumber ||
                                      "مركبة الشركة",
                                    vehicleType: row.vehicleType,
                                  })
                                }
                                className="h-7 px-2.5 text-[11px] font-bold"
                                title="استعراض عمليات غيار الزيت الفردية لهذه المركبة لتعديلها أو إلغائها أو تصحيح المركبة"
                              >
                                عمليات المركبة ({row.issueCount})
                              </Button>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Loss Entries Table */
            !data || !data.lossEntries || data.lossEntries.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                لا توجد قيود فاقد أو تالف مسجلة لهذا البرميل حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold">
                      <th className="p-3">نوع الفاقد / السبب</th>
                      <th className="p-3 text-center">الكمية باللتر</th>
                      <th className="p-3 text-center">التكلفة التقديرية</th>
                      <th className="p-3">المستودع والمسجل</th>
                      <th className="p-3">البيان / سبب التسجيل</th>
                      <th className="p-3 text-center">تاريخ الحدوث</th>
                      <th className="p-3 text-left">تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {data.lossEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                      >
                        {/* Missing Reason Badge */}
                        <td className="p-3">
                          <div className="space-y-1">
                            {getLossReasonBadge(entry.missingReason)}
                            {entry.correctionRevisionId && (
                              <span className="block w-fit px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800">
                                هالك مرتجع من برميل مغلق (تعديل/إلغاء غيار زيت)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="p-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                          {entry.quantityLiters.toFixed(2)}
                          <span className="text-[10px] font-normal mr-0.5">L</span>
                        </td>

                        {/* Cost */}
                        <td className="p-3 text-center font-mono text-slate-700 dark:text-slate-300">
                          {entry.costAmount.toFixed(2)}
                          <span className="text-[10px] text-slate-400 mr-1">ر.س</span>
                        </td>

                        {/* Warehouse & User */}
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {entry.responsibleInventoryLocationId
                              ? resolveLocationName(entry.responsibleInventoryLocationId)
                              : locationName || "المستودع الرئيسي"}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            بواسطة:{" "}
                            {entry.recordedByUserId
                              ? resolveUserName(entry.recordedByUserId)
                              : "مستخدم النظام"}
                          </div>
                        </td>

                        {/* Reason / Notes */}
                        <td className="p-3 max-w-[240px] truncate text-slate-800 dark:text-slate-200" title={entry.reason}>
                          {entry.reason || "—"}
                        </td>

                        {/* Occurred At */}
                        <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                          {entry.occurredAtUtc ? formatDateTime(entry.occurredAtUtc) : "—"}
                        </td>

                        {/* Recorded At */}
                        <td className="p-3 text-left font-mono text-[11px] text-slate-400">
                          {entry.recordedAtUtc ? formatDateTime(entry.recordedAtUtc) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Pagination Controls for Vehicles */}
          {activeTab === "vehicles" && data && data.totalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">عرض:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handleVehiclePageSizeChange(Number(e.target.value))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-xs font-bold"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200 (الحد الأقصى)</option>
                </select>
                <span className="text-slate-500">
                  صفحة {page} من {totalVehiclePages}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  onClick={() => handleVehiclePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  className="h-8 px-2 text-xs"
                >
                  <ArrowRight size={14} />
                  السابق
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleVehiclePageChange(page + 1)}
                  disabled={page >= totalVehiclePages || loading}
                  className="h-8 px-2 text-xs"
                >
                  التالي
                  <ArrowLeft size={14} />
                </Button>
              </div>
            </div>
          )}

          {/* Pagination Controls for Losses */}
          {activeTab === "losses" && data && (data.lossTotalCount ?? data.lossEntries?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">عرض:</span>
                <select
                  value={lossPageSize}
                  onChange={(e) => handleLossPageSizeChange(Number(e.target.value))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-xs font-bold"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200 (الحد الأقصى)</option>
                </select>
                <span className="text-slate-500">
                  صفحة {lossPage} من {totalLossPages}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  onClick={() => handleLossPageChange(lossPage - 1)}
                  disabled={lossPage <= 1 || loading}
                  className="h-8 px-2 text-xs"
                >
                  <ArrowRight size={14} />
                  السابق
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleLossPageChange(lossPage + 1)}
                  disabled={lossPage >= totalLossPages || loading}
                  className="h-8 px-2 text-xs"
                >
                  التالي
                  <ArrowLeft size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={loading || exporting || !data || (data.vehicles.length === 0 && (!data.lossEntries || data.lossEntries.length === 0))}
            loading={exporting}
            className="text-xs gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
          >
            <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
            تصدير Excel (شيتين)
          </Button>

          <Button variant="secondary" onClick={onClose} className="text-xs">
            إغلاق
          </Button>
        </div>
      </div>

      <CorrectOilChangeVehicleModal
        isOpen={isCorrectVehicleModalOpen}
        onClose={() => setIsCorrectVehicleModalOpen(false)}
        currentVehicleType={currentBarrel.allowedVehicleType}
        onSuccess={() => {
          loadUsage(page, pageSize, lossPage, lossPageSize);
        }}
      />

      {selectedVehicleForOps && (
        <VehicleOilChangesModal
          isOpen={Boolean(selectedVehicleForOps)}
          vehicleId={selectedVehicleForOps.vehicleId}
          vehiclePlate={selectedVehicleForOps.plate}
          vehicleType={selectedVehicleForOps.vehicleType}
          onClose={() => setSelectedVehicleForOps(null)}
          onChanged={() => {
            loadUsage(page, pageSize, lossPage, lossPageSize);
          }}
        />
      )}
    </Modal>
  );
}
