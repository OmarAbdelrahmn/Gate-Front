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
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { getOilBarrelUsage } from "@/lib/maintenance/api";
import type {
  OilBarrel,
  OilBarrelUsageResponse,
  OilBarrelUsageVehicleRow,
} from "@/lib/maintenance/types";
import {
  oilBarrelStatusConfig,
  oilBarrelVehicleTypeConfig,
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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<OilBarrelUsageResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!barrel || !data) return;
    setExporting(true);
    try {
      let allVehicles: OilBarrelUsageVehicleRow[] = [];

      // If there are more records than currently loaded in this single page, fetch all
      if (data.totalCount > data.vehicles.length) {
        const fetchPageSize = 200;
        const totalPages = Math.ceil(data.totalCount / fetchPageSize);
        for (let p = 1; p <= totalPages; p++) {
          const res = await getOilBarrelUsage(barrel.id, p, fetchPageSize);
          if (res.vehicles && res.vehicles.length > 0) {
            allVehicles.push(...res.vehicles);
          }
        }
      } else {
        allVehicles = [...data.vehicles];
      }

      if (allVehicles.length === 0) {
        toast.error("لا توجد بيانات", "لا توجد سجلات استهلاك لتصديرها لهذا البرميل.");
        return;
      }

      const safeSheetName = `استهلاك برميل ${barrel.barrelNumber}`.replace(/[\\/*?:[\]]/g, "_").slice(0, 31);
      const filename = `oil-barrel-usage-${barrel.barrelNumber}-${new Date().toISOString().slice(0, 10)}.xlsx`;

      await exportToExcel<OilBarrelUsageVehicleRow>({
        filename,
        sheetName: safeSheetName,
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
            accessor: (row) => row.assetNumber || (row.externalWorkOrderId ? `أمر عمل #${row.externalWorkOrderId}` : "—"),
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
      });

      toast.success("تم التصدير بنجاح", `تم تنزيل سجل استهلاك البرميل ${barrel.barrelNumber}`);
    } catch (err: unknown) {
      console.error("Export barrel usage error:", err);
      toast.error("فشل التصدير", err instanceof Error ? err.message : "حدث خطأ أثناء تصدير سجل الاستهلاك.");
    } finally {
      setExporting(false);
    }
  };

  const loadUsage = async (targetPage = page, targetPageSize = pageSize) => {
    if (!barrel) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getOilBarrelUsage(barrel.id, targetPage, targetPageSize);
      setData(res);
      setPage(res.page);
      setPageSize(res.pageSize);
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
      loadUsage(1, pageSize);
    } else {
      setData(null);
      setErrorMsg(null);
    }
  }, [isOpen, barrel?.id]);

  if (!barrel) return null;

  const currentBarrel = data?.barrel || barrel;
  const statusCfg = oilBarrelStatusConfig[currentBarrel.status];
  const typeCfg =
    currentBarrel.allowedVehicleType !== undefined && currentBarrel.allowedVehicleType !== null
      ? oilBarrelVehicleTypeConfig[currentBarrel.allowedVehicleType]
      : null;

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadUsage(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    loadUsage(1, newSize);
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
                {typeCfg ? (
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
              disabled={loading || exporting || !data || data.vehicles.length === 0}
              loading={exporting}
              className="h-9 text-xs gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
            >
              <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
              تصدير Excel
            </Button>

            <Button
              variant="secondary"
              onClick={() => loadUsage(page, pageSize)}
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
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
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-medium">
                الفاقد الموثق
              </span>
              <span className="text-lg font-mono font-black text-amber-800 dark:text-amber-300">
                {currentBarrel.recordedLossLiters.toFixed(2)}
                <span className="text-xs font-normal mr-1">لتر</span>
              </span>
            </div>
          </div>
        )}

        {/* Informational note about totals */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
          <span>* الإجماليات أعلاه تغطي كافة استهلاك البرميل بالكامل عبر جميع الصفحات. الفاقد الموثق يبقى منفصلاً عن استهلاك المركبات.</span>
          {data && (
            <span className="font-medium">
              إجمالي المركبات / السجلات: {data.totalCount}
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

        {/* Table of Vehicle Usage */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              جارٍ تحميل تفاصيل استهلاك المركبات...
            </div>
          ) : !data || data.vehicles.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              لا توجد عمليات استهلاك مسجلة لهذا البرميل حتى الآن.
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
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  أمر عمل #{row.externalWorkOrderId}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {data && data.totalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">عرض:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-xs font-bold"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200 (الحد الأقصى)</option>
                </select>
                <span className="text-slate-500">
                  صفحة {page} من {totalPages}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  className="h-8 px-2 text-xs"
                >
                  <ArrowRight size={14} />
                  السابق
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || loading}
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
            disabled={loading || exporting || !data || data.vehicles.length === 0}
            loading={exporting}
            className="text-xs gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
          >
            <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
            تصدير Excel
          </Button>

          <Button variant="secondary" onClick={onClose} className="text-xs">
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
