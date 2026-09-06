"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { History, Package, RotateCcw, Droplets } from "lucide-react";
import {
  getVehicleMaterialHistory,
  getRiderMaterialHistory,
} from "@/lib/maintenance/api";
import type { MaterialUsage } from "@/lib/maintenance/types";
import {
  materialUsageTypeLabels,
  unitOfMeasureLabels,
  formatCurrency,
  formatDateTime,
} from "@/lib/maintenance/constants";

interface MaterialHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId?: string | null;
  vehicleAssetNumber?: string | null;
  riderProfileId?: string | null;
}

export function MaterialHistoryModal({
  isOpen,
  onClose,
  vehicleId,
  vehicleAssetNumber,
  riderProfileId,
}: MaterialHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<MaterialUsage[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const fetchHistory = async () => {
      try {
        if (vehicleId) {
          const res = await getVehicleMaterialHistory(vehicleId);
          setHistory(res);
        } else if (riderProfileId) {
          const res = await getRiderMaterialHistory(riderProfileId);
          setHistory(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, vehicleId, riderProfileId]);

  const title = vehicleId
    ? `سجل استهلاك القطع والمواد للمركبة: ${vehicleAssetNumber || ""}`
    : `سجل استهلاك المواد والعهد للمندوب`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-4xl">
      <div className="space-y-4 text-xs">
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-right">
            <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
              <tr>
                <th className="p-3">تاريخ الصرف</th>
                <th className="p-3">الصنف / المادة</th>
                <th className="p-3">نوع الاستخدام</th>
                <th className="p-3 text-center">الكمية</th>
                <th className="p-3 text-center">الحركة</th>
                <th className="p-3 text-left">التكلفة الإجمالية (FIFO)</th>
                <th className="p-3">توزيع طبقات التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    جارٍ استرجاع سجل الاستهلاك والمواد...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا توجد حركات استهلاك مسجلة مسبقاً.
                  </td>
                </tr>
              ) : (
                history.map((usage) => {
                  const isReversal = usage.direction === 2;
                  return (
                    <tr
                      key={usage.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                        isReversal ? "bg-red-50/30 dark:bg-red-950/20 text-red-800 dark:text-red-300" : ""
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {formatDateTime(usage.usedAtUtc)}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        <div>{usage.itemNameAr}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{usage.sku}</div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {materialUsageTypeLabels[usage.usageType] || usage.usageType}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        {usage.quantity} {unitOfMeasureLabels[usage.unitOfMeasure] || ""}
                      </td>
                      <td className="p-3 text-center">
                        {isReversal ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                            عكس / إرجاع
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            صرف فعلي
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-left font-mono font-bold">
                        {formatCurrency(usage.totalCost)}
                      </td>
                      <td className="p-3 text-[10px] text-slate-500 font-mono">
                        {usage.costAllocations && usage.costAllocations.length > 0 ? (
                          <div className="space-y-0.5">
                            {usage.costAllocations.map((alloc, idx) => (
                              <div key={idx}>
                                {alloc.quantity} × {alloc.unitCost.toFixed(2)} = {alloc.cost.toFixed(2)} ر.س
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            إغلاق السجل
          </Button>
        </div>
      </div>
    </Modal>
  );
}
