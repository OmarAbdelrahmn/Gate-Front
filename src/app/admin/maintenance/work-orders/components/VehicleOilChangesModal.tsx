"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Ban,
  CheckCircle2,
  Droplets,
  Edit3,
  Eye,
  FileText,
  Gauge,
  History,
  RefreshCw,
  ShieldAlert,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getVehicleOilChanges,
  getWorkOrderOilChanges,
} from "@/lib/maintenance/api";
import type { CompleteOilChangeResult } from "@/lib/maintenance/types";
import {
  formatCurrency,
  formatDateTime,
  getVehicleTypeLabel,
} from "@/lib/maintenance/constants";
import { useMaintenanceLookups } from "@/lib/maintenance/lookups";
import { EditOilChangeModal } from "./EditOilChangeModal";
import { CancelOilChangeModal } from "./CancelOilChangeModal";
import { OilChangeDetailsModal } from "./OilChangeDetailsModal";
import { CorrectOilChangeVehicleModal } from "./CorrectOilChangeVehicleModal";

export interface VehicleOilChangesModalProps {
  isOpen: boolean;
  vehicleId?: string | null;
  workOrderId?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: number | null;
  initialActionHint?: "edit" | "cancel" | "correct_vehicle" | "details" | null;
  onClose: () => void;
  onChanged?: () => void;
}

export function VehicleOilChangesModal({
  isOpen,
  vehicleId,
  workOrderId,
  vehiclePlate,
  vehicleType,
  initialActionHint,
  onClose,
  onChanged,
}: VehicleOilChangesModalProps) {
  const { can, canAny } = useAuth();
  const canEditOilChange =
    (can("maintenance.oil.edit") &&
      can("inventory.stock.move") &&
      can("inventory.cost_layers.read")) ||
    canAny(
      "maintenance.oil.complete",
      "maintenance.oil.read",
      "maintenance.work_orders.manage",
      "inventory.stock.move",
    );
  const canCancelOilChange =
    (can("maintenance.oil.cancel") &&
      can("inventory.stock.adjust") &&
      can("inventory.cost_layers.read")) ||
    canAny(
      "maintenance.oil.complete",
      "maintenance.oil.read",
      "maintenance.work_orders.manage",
      "inventory.stock.adjust",
    );
  const canCorrectVehicle = canAny(
    "maintenance.oil.complete",
    "maintenance.oil.edit",
    "maintenance.oil.read",
    "maintenance.work_orders.manage",
  );

  const { resolveRiderName, resolveVehicleLabel, resolveWorkOrderLabel } =
    useMaintenanceLookups();

  const [operations, setOperations] = useState<CompleteOilChangeResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Active child modal states
  const [detailsOpId, setDetailsOpId] = useState<string | null>(null);
  const [detailsInitialTab, setDetailsInitialTab] = useState<
    "details" | "revisions"
  >("details");
  const [editOpId, setEditOpId] = useState<string | null>(null);
  const [cancelOpId, setCancelOpId] = useState<string | null>(null);
  const [correctVehicleOp, setCorrectVehicleOp] = useState<{
    oilChangeId: string;
    vehicleId: string;
    vehicleType: number;
  } | null>(null);

  const loadOperations = async () => {
    if (!vehicleId && !workOrderId) return;
    setLoading(true);
    try {
      const [vehOps, woOps] = await Promise.all([
        vehicleId ? getVehicleOilChanges(vehicleId) : Promise.resolve([]),
        workOrderId ? getWorkOrderOilChanges(workOrderId) : Promise.resolve([]),
      ]);
      const mergedMap = new Map<string, CompleteOilChangeResult>();
      for (const op of [...(vehOps || []), ...(woOps || [])]) {
        if (op?.id) mergedMap.set(op.id, op);
      }
      setOperations(Array.from(mergedMap.values()));
    } catch (err: any) {
      toast.error(
        "تعذر تحميل سجل غيار الزيت",
        err?.message || "يرجى المحاولة مرة أخرى.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || (!vehicleId && !workOrderId)) return;
    void loadOperations();
  }, [isOpen, vehicleId, workOrderId]);

  if (!isOpen) return null;

  const displayVehicle =
    vehiclePlate ||
    (vehicleId ? resolveVehicleLabel(vehicleId) : null) ||
    (workOrderId ? resolveWorkOrderLabel(workOrderId) : null) ||
    "مركبة الشركة";

  const activeOperations = operations.filter((op) => !op.isCancelled);
  const activeTotalCost = activeOperations.reduce(
    (sum, op) => sum + (Number(op.totalCost) || 0),
    0,
  );
  const activeTotalLiters = activeOperations.reduce(
    (sum, op) => sum + (Number(op.oilQuantityLiters) || 0),
    0,
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`سجل عمليات غيار الزيت وإدارتها — ${displayVehicle}`}
        maxWidth="max-w-6xl"
      >
        <div className="space-y-4 text-right" dir="rtl">
          {/* Summary Banner */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {displayVehicle}
                </span>
                {vehicleType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                    {getVehicleTypeLabel(vehicleType)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر العملية المطلوبة لعرض التفاصيل وسجل المراجعات، أو تنفيذ{" "}
                <strong>تعديل غيار الزيت</strong> أو{" "}
                <strong>إلغاء غيار الزيت</strong> أو{" "}
                <strong>تصحيح المركبة</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">
                  العمليات النشطة
                </span>
                <strong className="font-mono text-slate-900 dark:text-white">
                  {activeOperations.length} من {operations.length}
                </strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">
                  إجمالي اللترات النشطة
                </span>
                <strong className="font-mono text-amber-700 dark:text-amber-400">
                  {activeTotalLiters.toFixed(2)} لتر
                </strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 block text-[10px] font-bold">
                  إجمالي التكاليف الفعالة
                </span>
                <strong className="font-mono text-emerald-800 dark:text-emerald-200">
                  {formatCurrency(activeTotalCost)}
                </strong>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={loadOperations}
                disabled={loading}
                className="text-xs gap-1.5"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                <span>تحديث</span>
              </Button>
            </div>
          </div>

          {initialActionHint && operations.length > 1 && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2 font-medium">
              <FileText size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                {initialActionHint === "edit" &&
                  "تحتوي هذه المركبة على عدة عمليات غيار زيت. يرجى اختيار العملية المراد تعديلها بالضغط على زر (تعديل غيار الزيت) أمامها."}
                {initialActionHint === "cancel" &&
                  "تحتوي هذه المركبة على عدة عمليات غيار زيت. يرجى اختيار العملية المراد إلغاؤها بالضغط على زر (إلغاء غيار الزيت) أمامها."}
                {initialActionHint === "correct_vehicle" &&
                  "تحتوي هذه المركبة على عدة عمليات غيار زيت. يرجى اختيار العملية المراد تصحيح مركبتها بالضغط على زر (تصحيح المركبة) أمامها."}
                {initialActionHint === "details" &&
                  "استعرض عمليات غيار الزيت المسجلة لهذه المركبة واختر العملية لعرض تفاصيلها وسجل مراجعاتها."}
              </span>
            </div>
          )}

          {/* Operations Table */}
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              جارٍ تحميل سجل عمليات غيار الزيت للمركبة...
            </div>
          ) : operations.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              لا توجد عمليات غيار زيت مسجلة لهذه المركبة حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-3.5 py-3 font-bold">الحالة والمراجعة</th>
                    <th className="px-3.5 py-3 font-bold">تاريخ الخدمة</th>
                    <th className="px-3.5 py-3 font-bold">قراءة العداد</th>
                    <th className="px-3.5 py-3 font-bold">كمية الزيت والفلتر</th>
                    <th className="px-3.5 py-3 font-bold">السائق المرتبط</th>
                    <th className="px-3.5 py-3 font-bold">التكلفة</th>
                    <th className="px-3.5 py-3 font-bold text-center">
                      الإجراءات المتاحة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {operations.map((op) => {
                    const isCancelled = Boolean(op.isCancelled);
                    const revCount = op.revisionNumber ?? 0;
                    return (
                      <tr
                        key={op.id}
                        className={
                          isCancelled
                            ? "bg-rose-50/20 dark:bg-rose-950/10 opacity-85"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        }
                      >
                        <td className="px-3.5 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                <ShieldAlert size={11} />
                                <span>ملغاة</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 size={11} />
                                <span>نشطة</span>
                              </span>
                            )}
                            {revCount > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailsInitialTab("revisions");
                                  setDetailsOpId(op.id);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              >
                                <History size={10} />
                                <span>مراجعة #{revCount}</span>
                              </button>
                            )}
                          </div>
                          {op.maintenanceWorkOrderId && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {resolveWorkOrderLabel(op.maintenanceWorkOrderId)}
                            </span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {formatDateTime(
                            op.effectiveServiceAtUtc || op.performedAtUtc,
                          )}
                        </td>

                        <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          {Number(op.odometerAtChange ?? 0).toLocaleString()} كم
                        </td>

                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {op.oilQuantityLiters} لتر
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {op.oilFilterChanged
                              ? "مع تغيير فلتر الزيت"
                              : "بدون تغيير فلتر"}
                          </div>
                        </td>

                        <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300">
                          {resolveRiderName(op.riderProfileId)}
                        </td>

                        <td className="px-3.5 py-3">
                          {isCancelled ? (
                            <div>
                              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 block">
                                0.00 ر.س (نشط)
                              </span>
                              <span className="font-mono text-[10px] text-rose-500 line-through">
                                {formatCurrency(op.totalCost)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(op.totalCost)}
                            </span>
                          )}
                        </td>

                        <td className="px-3.5 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {canEditOilChange && (
                              <button
                                type="button"
                                disabled={isCancelled}
                                onClick={() => setEditOpId(op.id)}
                                aria-label="تعديل غيار الزيت"
                                title="تعديل غيار الزيت"
                                className="inline-flex size-8 items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}

                            {canCancelOilChange && (
                              <button
                                type="button"
                                disabled={isCancelled}
                                onClick={() => setCancelOpId(op.id)}
                                aria-label="إلغاء غيار الزيت"
                                title="إلغاء غيار الزيت"
                                className="inline-flex size-8 items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                              >
                                <Ban size={14} />
                              </button>
                            )}

                            {canCorrectVehicle && (op.vehicleId || vehicleId) && (
                              <button
                                type="button"
                                disabled={isCancelled}
                                onClick={() =>
                                  setCorrectVehicleOp({
                                    oilChangeId: op.id,
                                    vehicleId: op.vehicleId || vehicleId || "",
                                    vehicleType:
                                      op.vehicleType || vehicleType || 2,
                                  })
                                }
                                aria-label="تصحيح المركبة"
                                title="تصحيح المركبة"
                                className="inline-flex size-8 items-center justify-center rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                              >
                                <ArrowLeftRight size={14} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setDetailsInitialTab("details");
                                setDetailsOpId(op.id);
                              }}
                              aria-label="التفاصيل وسجل المراجعات"
                              title="التفاصيل وسجل المراجعات"
                              className="inline-flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>

      {/* Child Modals */}
      {detailsOpId && (
        <OilChangeDetailsModal
          isOpen={Boolean(detailsOpId)}
          oilChangeId={detailsOpId}
          vehicleLabel={displayVehicle}
          initialTab={detailsInitialTab}
          onClose={() => setDetailsOpId(null)}
          onRequestEdit={(id) => {
            setDetailsOpId(null);
            setEditOpId(id);
          }}
          onRequestCancel={(id) => {
            setDetailsOpId(null);
            setCancelOpId(id);
          }}
          onRequestCorrectVehicle={(id, vId, vType) => {
            setDetailsOpId(null);
            setCorrectVehicleOp({
              oilChangeId: id,
              vehicleId: vId || vehicleId || "",
              vehicleType: vType || vehicleType || 2,
            });
          }}
        />
      )}

      {editOpId && (
        <EditOilChangeModal
          isOpen={Boolean(editOpId)}
          oilChangeId={editOpId}
          vehicleLabel={displayVehicle}
          onClose={() => setEditOpId(null)}
          onSuccess={() => {
            setEditOpId(null);
            void loadOperations();
            onChanged?.();
          }}
        />
      )}

      {cancelOpId && (
        <CancelOilChangeModal
          isOpen={Boolean(cancelOpId)}
          oilChangeId={cancelOpId}
          vehicleLabel={displayVehicle}
          onClose={() => setCancelOpId(null)}
          onSuccess={() => {
            setCancelOpId(null);
            void loadOperations();
            onChanged?.();
          }}
        />
      )}

      {correctVehicleOp && (
        <CorrectOilChangeVehicleModal
          isOpen={Boolean(correctVehicleOp)}
          oilChangeId={correctVehicleOp.oilChangeId}
          currentVehicleId={correctVehicleOp.vehicleId}
          currentVehiclePlate={displayVehicle}
          currentVehicleType={correctVehicleOp.vehicleType}
          onClose={() => setCorrectVehicleOp(null)}
          onSuccess={() => {
            setCorrectVehicleOp(null);
            void loadOperations();
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
