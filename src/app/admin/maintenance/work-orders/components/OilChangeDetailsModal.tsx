"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Edit3,
  FileText,
  Gauge,
  History,
  Layers,
  Package,
  ShieldAlert,
  User,
  Warehouse,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getOilChangeDetails,
  getOilChangeRevisions,
} from "@/lib/maintenance/api";
import {
  MaterialUsageDirection,
  WorkOrderStatus,
  type OilChangeDetailsResponse,
  type OilChangeRevisionItem,
  type OilChangeRevisionsResponse,
} from "@/lib/maintenance/types";
import {
  formatCurrency,
  formatDateTime,
  getMaterialUsageTypeLabel,
  getUnitOfMeasureLabel,
  getVehicleTypeLabel,
  workOrderStatusConfig,
} from "@/lib/maintenance/constants";
import { useMaintenanceLookups } from "@/lib/maintenance/lookups";

export interface OilChangeDetailsModalProps {
  isOpen: boolean;
  oilChangeId: string;
  vehicleLabel?: string | null;
  initialTab?: "details" | "revisions";
  onClose: () => void;
  onRequestEdit?: (oilChangeId: string) => void;
  onRequestCancel?: (oilChangeId: string) => void;
  onRequestCorrectVehicle?: (
    oilChangeId: string,
    vehicleId: string | null,
    vehicleType: number,
  ) => void;
}

function safeParseJson(raw?: string | null): Record<string, any> | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function OilChangeDetailsModal({
  isOpen,
  oilChangeId,
  vehicleLabel,
  initialTab = "details",
  onClose,
  onRequestEdit,
  onRequestCancel,
  onRequestCorrectVehicle,
}: OilChangeDetailsModalProps) {
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

  const {
    resolveUserName,
    resolveRiderName,
    resolveLocationName,
    resolveItemName,
    resolveBarrelNumber,
    resolveVehicleLabel,
    resolveWorkOrderLabel,
  } = useMaintenanceLookups();

  const [activeTab, setActiveTab] = useState<"details" | "revisions">(
    initialTab,
  );
  const [details, setDetails] = useState<OilChangeDetailsResponse | null>(null);
  const [revisionsData, setRevisionsData] =
    useState<OilChangeRevisionsResponse | null>(null);
  const [revPage, setRevPage] = useState(1);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setRevPage(1);
    }
  }, [isOpen, initialTab, oilChangeId]);

  useEffect(() => {
    if (!isOpen || !oilChangeId) return;
    let cancelled = false;
    setLoadingDetails(true);
    getOilChangeDetails(oilChangeId)
      .then((res) => {
        if (!cancelled) setDetails(res);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            "تعذر تحميل تفاصيل غيار الزيت",
            err?.message || "يرجى المحاولة مرة أخرى.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, oilChangeId]);

  useEffect(() => {
    if (!isOpen || !oilChangeId) return;
    let cancelled = false;
    setLoadingRevisions(true);
    getOilChangeRevisions(oilChangeId, revPage, 20)
      .then((res) => {
        if (!cancelled) setRevisionsData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setRevisionsData({ items: [], page: revPage, pageSize: 20, totalCount: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRevisions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, oilChangeId, revPage]);

  if (!isOpen) return null;

  const op = details?.operation;
  const isCancelled = Boolean(op?.isCancelled);
  const displayVehicle =
    vehicleLabel ||
    (op?.vehicleId
      ? resolveVehicleLabel(op.vehicleId)
      : op?.maintenanceWorkOrderId
        ? resolveWorkOrderLabel(op.maintenanceWorkOrderId)
        : "مركبة الخدمة");

  const getActionBadge = (action: string) => {
    const clean = (action || "").trim();
    if (clean === "Cancel" || clean.toLowerCase().includes("cancel")) {
      return {
        label: "إلغاء العملية",
        cls: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800",
      };
    }
    if (clean === "EditDate" || clean.toLowerCase().includes("date")) {
      return {
        label: "تعديل بيانات وتاريخ الخدمة",
        cls: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800",
      };
    }
    return {
      label: "تعديل بيانات العملية",
      cls: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800",
    };
  };

  const renderSnapshotSummary = (
    snap: Record<string, any> | null,
    title: string,
    tone: "before" | "after",
  ) => {
    if (!snap) return null;
    const performed =
      snap.effectiveServiceAtUtc ||
      snap.EffectiveServiceAtUtc ||
      snap.performedAtUtc ||
      snap.PerformedAtUtc;
    const odo = snap.odometerAtChange ?? snap.OdometerAtChange;
    const oilQty =
      snap.oilQuantityLiters ??
      snap.OilQuantityLiters ??
      snap.configuredOilQuantityLiters ??
      snap.ConfiguredOilQuantityLiters;
    const filterChanged =
      snap.oilFilterChanged ?? snap.OilFilterChanged ?? null;
    const totalCost = snap.totalCost ?? snap.TotalCost;
    const oilItem = snap.oilInventoryItemId ?? snap.OilInventoryItemId;
    const filterItem =
      snap.oilFilterInventoryItemId ?? snap.OilFilterInventoryItemId;
    const locId = snap.inventoryLocationId ?? snap.InventoryLocationId;
    const riderId = snap.riderProfileId ?? snap.RiderProfileId;
    const cancelledFlag = snap.isCancelled ?? snap.IsCancelled;

    return (
      <div
        className={`rounded-xl p-3 border text-xs space-y-1.5 ${
          tone === "before"
            ? "bg-slate-50/90 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
            : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/70"
        }`}
      >
        <div className="font-black text-[11px] text-slate-700 dark:text-slate-300 border-b border-slate-200/70 dark:border-slate-800 pb-1">
          {title}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {performed && (
            <div>
              <span className="text-slate-400">تاريخ الخدمة: </span>
              <strong className="text-slate-800 dark:text-slate-200">
                {formatDateTime(performed)}
              </strong>
            </div>
          )}
          {odo !== undefined && odo !== null && (
            <div>
              <span className="text-slate-400">العداد: </span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {Number(odo).toLocaleString()} كم
              </strong>
            </div>
          )}
          {oilQty !== undefined && oilQty !== null && (
            <div>
              <span className="text-slate-400">كمية الزيت: </span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {oilQty} لتر
              </strong>
            </div>
          )}
          {filterChanged !== null && (
            <div>
              <span className="text-slate-400">الفلتر: </span>
              <strong className="text-slate-800 dark:text-slate-200">
                {filterChanged ? "تم تغيير الفلتر" : "بدون فلتر"}
              </strong>
            </div>
          )}
          {oilItem && (
            <div className="col-span-2">
              <span className="text-slate-400">صنف الزيت: </span>
              <strong className="text-slate-800 dark:text-slate-200">
                {resolveItemName(oilItem)}
              </strong>
            </div>
          )}
          {filterChanged && filterItem && (
            <div className="col-span-2">
              <span className="text-slate-400">صنف الفلتر: </span>
              <strong className="text-slate-800 dark:text-slate-200">
                {resolveItemName(filterItem)}
              </strong>
            </div>
          )}
          {locId && (
            <div>
              <span className="text-slate-400">المستودع: </span>
              <strong className="text-slate-800 dark:text-slate-200">
                {resolveLocationName(locId)}
              </strong>
            </div>
          )}
          {riderId !== undefined && (
            <div>
              <span className="text-slate-400">السائق: </span>
              <strong className="text-slate-800 dark:text-slate-200">
                {resolveRiderName(riderId)}
              </strong>
            </div>
          )}
          {totalCost !== undefined && totalCost !== null && (
            <div>
              <span className="text-slate-400">الإجمالي: </span>
              <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                {formatCurrency(Number(totalCost))}
              </strong>
            </div>
          )}
          {cancelledFlag !== undefined && (
            <div>
              <span className="text-slate-400">الحالة: </span>
              <strong
                className={
                  cancelledFlag ? "text-rose-600" : "text-emerald-600"
                }
              >
                {cancelledFlag ? "ملغاة" : "نشطة"}
              </strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEffectsSummary = (eff: Record<string, any> | null) => {
    if (!eff) return null;
    const waste =
      eff.returnedAsWasteLiters ?? eff.ReturnedAsWasteLiters ?? 0;
    const totalCost = eff.totalCost ?? eff.TotalCost;
    const mileage = eff.vehicleMileageKm ?? eff.VehicleMileageKm;
    const barrels: any[] = eff.barrels ?? eff.Barrels ?? [];

    return (
      <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 p-3 text-[11px] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-blue-900 dark:text-blue-200">
            الأثر المالي والمخزني المعتمد في هذه المراجعة:
          </span>
          {totalCost !== undefined && (
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
              صافي التكلفة النشطة: {formatCurrency(Number(totalCost))}
            </span>
          )}
          {mileage != null && (
            <span className="font-mono text-slate-700 dark:text-slate-300">
              عداد المركبة الناتج: {Number(mileage).toLocaleString()} كم
            </span>
          )}
        </div>

        {Number(waste) > 0 && (
          <div className="p-2 rounded-lg bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span>
              الكمية المرتجعة من البرميل المغلق سُجلت كهالك ({waste} لتر)
            </span>
          </div>
        )}

        {Array.isArray(barrels) && barrels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {barrels.map((b, i) => {
              const bId = b.barrelId ?? b.BarrelId;
              const bNum = b.barrelNumber ?? b.BarrelNumber;
              const issued = b.issuedLiters ?? b.IssuedLiters ?? 0;
              const reversed = b.reversedLiters ?? b.ReversedLiters ?? 0;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <strong>{resolveBarrelNumber(bId, bNum)}:</strong>
                  {issued > 0 && (
                    <span className="text-amber-700 dark:text-amber-400 font-mono">
                      صرف {issued}L
                    </span>
                  )}
                  {reversed > 0 && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                      استرداد {reversed}L
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تفاصيل وسجل مراجعات غيار الزيت — ${displayVehicle}`}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-5 text-right" dir="rtl">
        {/* Top Action & Status Bar */}
        {op && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {displayVehicle}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                {getVehicleTypeLabel(op.vehicleType)}
              </span>
              {isCancelled ? (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                  <ShieldAlert size={13} />
                  <span>ملغاة</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 size={13} />
                  <span>نشطة ومعتمدة</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                <History size={12} />
                <span>مراجعة #{op.revisionNumber ?? 0}</span>
              </span>
            </div>

            {/* Distinct 3 Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {canCorrectVehicle && onRequestCorrectVehicle && op.vehicleId && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCancelled}
                  onClick={() =>
                    onRequestCorrectVehicle(
                      op.id,
                      op.vehicleId,
                      op.vehicleType,
                    )
                  }
                  className="text-xs gap-1.5 font-bold border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                >
                  <ArrowLeftRight size={14} />
                  <span>تصحيح المركبة</span>
                </Button>
              )}

              {canEditOilChange && onRequestEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCancelled}
                  onClick={() => onRequestEdit(op.id)}
                  className="text-xs gap-1.5 font-bold border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                >
                  <Edit3 size={14} />
                  <span>تعديل غيار الزيت</span>
                </Button>
              )}

              {canCancelOilChange && onRequestCancel && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={isCancelled}
                  onClick={() => onRequestCancel(op.id)}
                  className="text-xs gap-1.5 font-bold"
                >
                  <Ban size={14} />
                  <span>إلغاء غيار الزيت</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2.5 text-xs font-black border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "details"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileText size={15} />
            <span>تفاصيل العملية وحركات المواد</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("revisions")}
            className={`px-4 py-2.5 text-xs font-black border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "revisions"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <History size={15} />
            <span>
              سجل المراجعات والتعديلات{" "}
              {revisionsData?.totalCount != null
                ? `(${revisionsData.totalCount})`
                : ""}
            </span>
          </button>
        </div>

        {/* Tab 1: Details & Materials */}
        {activeTab === "details" && (
          <div className="space-y-5">
            {loadingDetails ? (
              <div className="py-12 text-center text-sm text-slate-500">
                جارٍ تحميل بيانات العملية...
              </div>
            ) : !details || !op ? (
              <div className="py-10 text-center text-sm text-rose-600">
                تعذر العثور على تفاصيل هذه العملية.
              </div>
            ) : (
              <>
                {/* Cancellation Notice Banner */}
                {isCancelled && (
                  <div className="p-4 rounded-2xl border border-rose-300 bg-rose-50/80 dark:border-rose-800 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-sm text-rose-900 dark:text-rose-200">
                      <Ban size={17} className="text-rose-600 shrink-0" />
                      <span>عملية غيار زيت ملغاة (التكلفة الفعالة النشطة: 0.00 ر.س)</span>
                    </div>
                    <p>
                      تاريخ الإلغاء:{" "}
                      <strong>{formatDateTime(details.cancelledAtUtc)}</strong>{" "}
                      • بواسطة:{" "}
                      <strong>{resolveUserName(details.cancelledByUserId)}</strong>
                    </p>
                    {details.cancellationReason && (
                      <p>
                        سبب الإلغاء الموثق:{" "}
                        <strong className="underline">
                          {details.cancellationReason}
                        </strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <Calendar size={13} className="text-blue-600" />
                      <span>تاريخ الخدمة الفعلي</span>
                    </span>
                    <strong className="text-slate-900 dark:text-white block">
                      {formatDateTime(
                        op.effectiveServiceAtUtc || op.performedAtUtc,
                      )}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <Gauge size={13} className="text-blue-600" />
                      <span>قراءة العداد عند الغيار</span>
                    </span>
                    <strong className="font-mono text-sm text-slate-900 dark:text-white block">
                      {Number(op.odometerAtChange ?? 0).toLocaleString()} كم
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <Warehouse size={13} className="text-blue-600" />
                      <span>المستودع وموقع الخدمة</span>
                    </span>
                    <strong className="text-slate-900 dark:text-white block">
                      {resolveLocationName(
                        details.inventoryLocationId || op.inventoryLocationId,
                      )}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <User size={13} className="text-purple-600" />
                      <span>السائق المنسوب إليه</span>
                    </span>
                    <strong className="text-slate-900 dark:text-white block">
                      {resolveRiderName(op.riderProfileId)}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <Droplets size={13} className="text-amber-600" />
                      <span>كمية وتكلفة الزيت</span>
                    </span>
                    <strong className="font-mono text-slate-900 dark:text-white block">
                      {op.oilQuantityLiters} لتر • {formatCurrency(op.oilCost)}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <Package size={13} className="text-blue-600" />
                      <span>حالة وتكلفة الفلتر</span>
                    </span>
                    <strong className="font-mono text-slate-900 dark:text-white block">
                      {op.oilFilterChanged
                        ? `تم التغيير • ${formatCurrency(op.oilFilterCost)}`
                        : "لم يتم تغيير الفلتر"}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <Wrench size={13} className="text-slate-600" />
                      <span>أجور اليد وتكاليف أخرى</span>
                    </span>
                    <strong className="font-mono text-slate-900 dark:text-white block">
                      {formatCurrency((op.laborCost || 0) + (op.otherCost || 0))}
                    </strong>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      isCancelled
                        ? "border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/30"
                        : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30"
                    }`}
                  >
                    <span className="text-[11px] text-slate-500 dark:text-slate-300 font-bold block mb-1">
                      التكلفة النشطة المعتمدة
                    </span>
                    {isCancelled ? (
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-sm text-emerald-700 dark:text-emerald-400">
                          0.00 ر.س
                        </strong>
                        <span className="font-mono text-[11px] text-rose-500 line-through">
                          {formatCurrency(op.totalCost)}
                        </span>
                      </div>
                    ) : (
                      <strong className="font-mono text-sm text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(op.totalCost)}
                      </strong>
                    )}
                  </div>
                </div>

                {op.notes && (
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      ملاحظات مسجلة:{" "}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {op.notes}
                    </span>
                  </div>
                )}

                {/* Material Usages & FIFO Cost Layers */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers size={15} className="text-blue-600" />
                    <span>
                      حركات صرف وعكس المخزون وتخصيص طبقات التكلفة (FIFO)
                    </span>
                  </h4>

                  {!details.materials || details.materials.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      لا توجد حركات مواد مسجلة لهذه العملية.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100/80 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="px-3 py-2.5 font-bold">اتجاه الحركة</th>
                            <th className="px-3 py-2.5 font-bold">الصنف والنوع</th>
                            <th className="px-3 py-2.5 font-bold">الكمية</th>
                            <th className="px-3 py-2.5 font-bold">تاريخ الخدمة الفعلي</th>
                            <th className="px-3 py-2.5 font-bold">تاريخ الترحيل المخزني</th>
                            <th className="px-3 py-2.5 font-bold">السائق المحمّل</th>
                            <th className="px-3 py-2.5 font-bold">إجمالي التكلفة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {details.materials.map((m) => {
                            const isReversal =
                              m.direction === MaterialUsageDirection.Reversal;
                            return (
                              <tr
                                key={m.id}
                                className={
                                  isReversal
                                    ? "bg-rose-50/30 dark:bg-rose-950/15"
                                    : ""
                                }
                              >
                                <td className="px-3 py-2.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      isReversal
                                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                    }`}
                                  >
                                    {isReversal ? "عكس / استرداد" : "صرف مخزني"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {m.itemNameAr || resolveItemName(m.inventoryItemId)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {getMaterialUsageTypeLabel(m.usageType)} • SKU:{" "}
                                    {m.sku}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {m.quantity}{" "}
                                  {getUnitOfMeasureLabel(m.unitOfMeasure)}
                                </td>
                                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                                  {formatDateTime(
                                    m.effectiveServiceAtUtc || m.usedAtUtc,
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                                  {formatDateTime(m.usedAtUtc)}
                                </td>
                                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                                  {resolveRiderName(m.riderProfileId)}
                                </td>
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(m.totalCost)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Revisions History */}
        {activeTab === "revisions" && (
          <div className="space-y-4">
            {loadingRevisions ? (
              <div className="py-12 text-center text-sm text-slate-500">
                جارٍ تحميل سجل المراجعات...
              </div>
            ) : !revisionsData || revisionsData.items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                لا توجد مراجعات أو تعديلات سابقة مسجلة على عملية غيار الزيت هذه.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {revisionsData.items.map((rev: OilChangeRevisionItem) => {
                    const badge = getActionBadge(rev.action);
                    const actorLabel = resolveUserName(
                      rev.actorName ||
                        rev.actor ||
                        rev.actorUserId ||
                        rev.createdByUserId,
                    );
                    const timeStr = formatDateTime(
                      rev.postedAtUtc || rev.postingTime || rev.occurredAtUtc,
                    );
                    const beforeObj = safeParseJson(rev.beforeJson);
                    const afterObj = safeParseJson(rev.afterJson);
                    const effectsObj = safeParseJson(rev.effectsJson);

                    return (
                      <div
                        key={rev.id || rev.revisionNumber}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              مراجعة #{rev.revisionNumber}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <User size={13} />
                              <strong>{actorLabel}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} />
                              <span>{timeStr}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800">
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            السبب الموثق:{" "}
                          </span>
                          <span className="text-slate-900 dark:text-white font-medium">
                            {rev.reason || "—"}
                          </span>
                        </div>

                        {(beforeObj || afterObj) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {renderSnapshotSummary(
                              beforeObj,
                              "البيانات قبل المراجعة",
                              "before",
                            )}
                            {renderSnapshotSummary(
                              afterObj,
                              "البيانات بعد المراجعة",
                              "after",
                            )}
                          </div>
                        )}

                        {renderEffectsSummary(effectsObj)}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {revisionsData.totalCount > revisionsData.pageSize && (
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <span className="text-slate-500">
                      إجمالي المراجعات: {revisionsData.totalCount}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={revPage <= 1}
                        onClick={() => setRevPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 text-xs"
                      >
                        <ChevronRight size={14} />
                        <span>السابق</span>
                      </Button>
                      <span className="font-bold">صفحة {revPage}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={
                          revPage * revisionsData.pageSize >=
                          revisionsData.totalCount
                        }
                        onClick={() => setRevPage((p) => p + 1)}
                        className="px-2.5 py-1 text-xs"
                      >
                        <span>التالي</span>
                        <ChevronLeft size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
