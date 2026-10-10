"use client";

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Droplets,
  FileSpreadsheet,
  Info,
  RefreshCw,
  ShieldAlert,
  User,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { getOilBarrelMissingHistory } from "@/lib/maintenance/api";
import { listUsers } from "@/lib/users/api";
import type {
  OilBarrel,
  OilBarrelMissingEntry,
  OilBarrelMissingHistoryResponse,
  MaintenanceLocation,
} from "@/lib/maintenance/types";
import {
  oilBarrelMissingReasonConfig,
  formatCurrency,
  formatDateTime,
} from "@/lib/maintenance/constants";

interface OilBarrelMissingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  barrel: OilBarrel | null;
  locations?: MaintenanceLocation[];
  itemName?: string;
  locationName?: string;
}

export function OilBarrelMissingHistoryModal({
  isOpen,
  onClose,
  barrel,
  locations = [],
  itemName,
  locationName,
}: OilBarrelMissingHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<OilBarrelMissingHistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [exporting, setExporting] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Fetch users lookup once
  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((usersList) => {
        if (cancelled || !Array.isArray(usersList)) return;
        const map: Record<string, string> = {};
        for (const u of usersList) {
          map[u.id] =
            u.displayNameAr ||
            u.displayNameEn ||
            u.employee?.fullNameAr ||
            u.userName ||
            u.email ||
            u.id;
        }
        setUsersMap(map);
      })
      .catch((err) => {
        console.error("Failed to load user names for write-off history:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHistory = async (targetPage = page, targetPageSize = pageSize) => {
    if (!barrel) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getOilBarrelMissingHistory(barrel.id, targetPage, targetPageSize);
      setData(res);
      setPage(res.page);
      setPageSize(res.pageSize);
    } catch (err: unknown) {
      console.error("Failed to load barrel missing write-off history:", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "تعذر استرجاع سجل إهلاك ومفقودات البرميل. يرجى التحقق من صلاحيات القراءة.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && barrel) {
      setPage(1);
      loadHistory(1, pageSize);
    } else {
      setData(null);
      setErrorMsg(null);
    }
  }, [isOpen, barrel?.id]);

  if (!barrel) return null;

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1;

  const resolveWarehouseName = (locationId: string) => {
    const loc = locations.find((l) => l.id === locationId);
    if (loc) return `${loc.nameAr} (${loc.code})`;
    if (locationId === "019d77f0-0000-7000-8000-000000000003") return "مستودع جدة (JED-WH)";
    if (locationId === "019d77f0-0000-7000-8000-000000000004") return "مستودع الرياض (RUH-WH)";
    return locationName || locationId;
  };

  const resolveUserName = (userId: string) => {
    return usersMap[userId] || userId;
  };

  const handleExportExcel = async () => {
    if (!barrel || !data) return;
    setExporting(true);
    try {
      let allEntries: OilBarrelMissingEntry[] = [];

      if (data.totalCount > data.entries.length) {
        const fetchPageSize = 200;
        const pagesNeeded = Math.ceil(data.totalCount / fetchPageSize);
        for (let p = 1; p <= pagesNeeded; p++) {
          const res = await getOilBarrelMissingHistory(barrel.id, p, fetchPageSize);
          if (res.entries && res.entries.length > 0) {
            allEntries.push(...res.entries);
          }
        }
      } else {
        allEntries = [...data.entries];
      }

      if (allEntries.length === 0) {
        toast.error("لا توجد بيانات", "لا توجد سجلات شطب مفقودات لتصديرها.");
        return;
      }

      const safeSheetName = `شطب برميل ${barrel.barrelNumber}`.replace(/[\\/*?:[\]]/g, "_").slice(0, 31);
      const filename = `oil-barrel-writeoffs-${barrel.barrelNumber}-${new Date().toISOString().slice(0, 10)}.xlsx`;

      await exportToExcel<OilBarrelMissingEntry>({
        filename,
        sheetName: safeSheetName,
        data: allEntries,
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
            header: "تاريخ ووقت الواقعة",
            accessor: (row) => formatDateTime(row.occurredAtUtc),
            width: 22,
          },
          {
            header: "فئة الفقدان",
            accessor: (row) => oilBarrelMissingReasonConfig[row.missingReason]?.labelAr || String(row.missingReason),
            width: 18,
          },
          {
            header: "الكمية المشطوبة (لتر)",
            accessor: (row) => Number(row.quantityLiters.toFixed(3)),
            width: 18,
          },
          {
            header: "مبلغ التكلفة (ر.س)",
            accessor: (row) => Number(row.costAmount.toFixed(2)),
            width: 18,
          },
          {
            header: "المستودع المسؤول",
            accessor: (row) => resolveWarehouseName(row.responsibleInventoryLocationId),
            width: 24,
          },
          {
            header: "المستخدم المسجل",
            accessor: (row) => resolveUserName(row.recordedByUserId),
            width: 20,
          },
          {
            header: "تاريخ التسجيل للنظام",
            accessor: (row) => formatDateTime(row.recordedAtUtc),
            width: 22,
          },
          {
            header: "السبب والتوضيح",
            accessor: (row) => row.reason,
            isText: true,
            width: 35,
          },
          {
            header: "معرف حركة المخزون",
            accessor: (row) => row.stockMovementId,
            isText: true,
            width: 25,
          },
        ],
      });

      toast.success("تم التصدير بنجاح", `تم تنزيل سجل مفقودات البرميل ${barrel.barrelNumber}`);
    } catch (err: unknown) {
      console.error("Export write-offs error:", err);
      toast.error("فشل التصدير", err instanceof Error ? err.message : "حدث خطأ أثناء التصدير.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`سجل إهلاك ومفقودات البرميل / Write-off History — ${barrel.barrelNumber}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 text-right" dir="rtl">
        {/* Barrel Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Droplets size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                  {barrel.barrelNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  سجل مفقودات المستودع
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {itemName || "صنف الزيت"} • {locationName || "المستودع"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              disabled={loading || exporting || !data || data.entries.length === 0}
              loading={exporting}
              className="h-9 text-xs gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
            >
              <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
              تصدير Excel
            </Button>
            <Button
              variant="secondary"
              onClick={() => loadHistory(page, pageSize)}
              loading={loading}
              className="h-9 text-xs"
            >
              <RefreshCw size={13} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Global Summary KPI Tiles */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30">
              <span className="text-[11px] text-rose-700 dark:text-rose-300 block font-bold mb-1">
                إجمالي الكمية المشطوبة
              </span>
              <span className="text-xl font-mono font-black text-rose-900 dark:text-rose-100">
                {data.totalMissingLiters.toFixed(3)}
                <span className="text-xs font-normal mr-1">لتر</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-slate-500 block font-bold mb-1">
                إجمالي تكلفة الشطب (FIFO)
              </span>
              <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {formatCurrency(data.totalCostAmount)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-slate-500 block font-bold mb-1">
                إجمالي عمليات الشطب
              </span>
              <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {data.totalCount}
                <span className="text-xs font-normal mr-1">عملية</span>
              </span>
            </div>
          </div>
        )}

        {/* Informational Callout */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
          <Info size={16} className="shrink-0 mt-0.5 text-slate-500" />
          <p className="leading-relaxed">
            السجل غير قابل للتعديل أو الحذف (Append-only). يقتصر هذا السجل على إهلاكات المستودع المستقلة ويستثني فاقد النسبة المسموحة (2%).
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Entries Table */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              جارٍ تحميل سجل الشطب والمفقودات...
            </div>
          ) : !data || data.entries.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              لا توجد عمليات شطب أو زيت مفقود مسجلة لهذا البرميل حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold">
                    <th className="p-3">تاريخ ووقت الواقعة</th>
                    <th className="p-3">فئة الفقدان</th>
                    <th className="p-3">الكمية</th>
                    <th className="p-3">التكلفة</th>
                    <th className="p-3">المستودع المسؤول</th>
                    <th className="p-3">المسجل بواسطة</th>
                    <th className="p-3">السبب والتوضيح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.entries.map((entry) => {
                    const reasonCfg = oilBarrelMissingReasonConfig[entry.missingReason];
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3 font-mono whitespace-nowrap">
                          <div>{formatDateTime(entry.occurredAtUtc)}</div>
                          <div className="text-[10px] text-slate-400">
                            تسجيل: {formatDateTime(entry.recordedAtUtc)}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              reasonCfg
                                ? `${reasonCfg.bg} ${reasonCfg.text} ${reasonCfg.border}`
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            {reasonCfg?.labelAr || `نوع ${entry.missingReason}`}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {entry.quantityLiters.toFixed(3)} لتر
                        </td>
                        <td className="p-3 font-mono whitespace-nowrap">
                          {formatCurrency(entry.costAmount)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {resolveWarehouseName(entry.responsibleInventoryLocationId)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            مسؤولية المستودع
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {resolveUserName(entry.recordedByUserId)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            حركة #{entry.stockMovementId.slice(0, 8)}
                          </div>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">
                          {entry.reason}
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
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-900/30 text-xs">
              <div className="text-slate-500">
                إجمالي السجلات: <span className="font-bold">{data.totalCount}</span> • الصفحة{" "}
                <span className="font-bold">{page}</span> من{" "}
                <span className="font-bold">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const newPage = Math.max(1, page - 1);
                    setPage(newPage);
                    loadHistory(newPage, pageSize);
                  }}
                  disabled={page <= 1 || loading}
                  className="h-8 text-xs gap-1"
                >
                  <ArrowRight size={13} />
                  السابق
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const newPage = Math.min(totalPages, page + 1);
                    setPage(newPage);
                    loadHistory(newPage, pageSize);
                  }}
                  disabled={page >= totalPages || loading}
                  className="h-8 text-xs gap-1"
                >
                  التالي
                  <ArrowLeft size={13} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
