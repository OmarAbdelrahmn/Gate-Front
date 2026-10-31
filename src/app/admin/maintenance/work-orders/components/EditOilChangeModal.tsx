"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Edit3,
  Eye,
  Filter,
  Gauge,
  History,
  Info,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  User,
  Warehouse,
  Wrench,
  Calendar,
  Lock,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  commitOilChangeCorrection,
  getDirectOilBarrels,
  getDirectOilInventoryLocations,
  getInventoryItems,
  getOilChangeDetails,
  previewOilChangeCorrection,
} from "@/lib/maintenance/api";
import {
  ItemType,
  MaterialUsageDirection,
  MaterialUsageType,
  OilBarrelStatus,
  UnitOfMeasure,
  WorkOrderStatus,
  type DirectOilBarrel,
  type DirectOilInventoryLocation,
  type InventoryItem,
  type OilChangeDetailsResponse,
  type OilChangeWorkflowResponse,
} from "@/lib/maintenance/types";
import {
  canUseItem,
  formatCompatibleVehicleTypes,
  formatCurrency,
  formatDateTime,
  getVehicleTypeLabel,
  workOrderStatusConfig,
} from "@/lib/maintenance/constants";
import { useMaintenanceLookups } from "@/lib/maintenance/lookups";

export interface EditOilChangeModalProps {
  isOpen: boolean;
  oilChangeId: string;
  vehicleLabel?: string | null;
  onClose: () => void;
  onSuccess?: (result: OilChangeWorkflowResponse) => void;
}

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function EditOilChangeModal({
  isOpen,
  oilChangeId,
  vehicleLabel,
  onClose,
  onSuccess,
}: EditOilChangeModalProps) {
  const { can, canAny } = useAuth();
  const canEditDate =
    can("maintenance.oil.date_edit") ||
    canAny("maintenance.oil.complete", "maintenance.work_orders.manage");
  const {
    resolveRiderName,
    resolveLocationName,
    resolveItemName,
    resolveBarrelNumber,
    resolveVehicleLabel,
    resolveWorkOrderLabel,
  } = useMaintenanceLookups();

  const [details, setDetails] = useState<OilChangeDetailsResponse | null>(null);
  const [locations, setLocations] = useState<DirectOilInventoryLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [barrels, setBarrels] = useState<DirectOilBarrel[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Form Draft State
  const [performedAtLocal, setPerformedAtLocal] = useState("");
  const [odometerAtChange, setOdometerAtChange] = useState<number>(0);
  const [inventoryLocationId, setInventoryLocationId] = useState("");
  const [oilInventoryItemId, setOilInventoryItemId] = useState("");
  const [configuredOilQuantityLiters, setConfiguredOilQuantityLiters] =
    useState<string>("");
  const [oilFilterChanged, setOilFilterChanged] = useState<boolean>(false);
  const [oilFilterInventoryItemId, setOilFilterInventoryItemId] =
    useState<string>("");
  const [nextOilBarrelId, setNextOilBarrelId] = useState<string>("");
  const [laborCost, setLaborCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Mileage Baseline (only shown/sent when backend requires it or user explicitly provides it)
  const [requiresMileageBaseline, setRequiresMileageBaseline] = useState(false);
  const [mileageBaselineInput, setMileageBaselineInput] = useState<string>("");

  // Preview & Concurrency State
  const [previewResult, setPreviewResult] =
    useState<OilChangeWorkflowResponse | null>(null);
  const [concurrencyNotice, setConcurrencyNotice] = useState<string | null>(
    null,
  );
  const commitAttemptKeyRef = useRef<string | null>(null);

  const invalidatePreview = () => {
    setPreviewResult(null);
    commitAttemptKeyRef.current = null;
  };

  const loadOperationDetails = async (preserveDraft = false) => {
    setLoading(true);
    try {
      const [det, locList] = await Promise.all([
        getOilChangeDetails(oilChangeId),
        getDirectOilInventoryLocations().catch(() => []),
      ]);
      setDetails(det);
      setLocations(locList || []);

      const vType = det.operation.vehicleType;
      const itemList = await getInventoryItems({
        vehicleType: vType ?? undefined,
      }).catch(() => []);
      setItems((itemList || []).filter((i) => i.status === 1));

      if (!preserveDraft) {
        const op = det.operation;
        const activeMaterials = (det.materials || []).filter(
          (m) => m.direction === MaterialUsageDirection.Issue,
        );
        const oilMat = activeMaterials.find(
          (m) => m.usageType === MaterialUsageType.Oil,
        );
        const filterMat = activeMaterials.find(
          (m) => m.usageType === MaterialUsageType.OilFilter,
        );

        const resolvedLocId =
          det.inventoryLocationId ||
          op.inventoryLocationId ||
          oilMat?.inventoryLocationId ||
          filterMat?.inventoryLocationId ||
          (locList[0]?.inventoryLocationId ?? "");

        const resolvedOilItemId =
          op.oilInventoryItemId || oilMat?.inventoryItemId || "";

        const resolvedFilterItemId =
          op.oilFilterInventoryItemId || filterMat?.inventoryItemId || "";

        setPerformedAtLocal(
          toLocalDateTimeInput(op.effectiveServiceAtUtc || op.performedAtUtc),
        );
        setOdometerAtChange(op.odometerAtChange ?? 0);
        setInventoryLocationId(resolvedLocId);
        setOilInventoryItemId(resolvedOilItemId);
        setConfiguredOilQuantityLiters(
          String(
            op.configuredOilQuantityLiters ?? op.oilQuantityLiters ?? "",
          ),
        );
        setOilFilterChanged(Boolean(op.oilFilterChanged));
        setOilFilterInventoryItemId(resolvedFilterItemId);
        setNextOilBarrelId("");
        setLaborCost(op.laborCost ?? 0);
        setOtherCost(op.otherCost ?? 0);
        setNotes(op.notes ?? "");
      }
    } catch (err: any) {
      toast.error(
        "تعذر تحميل تفاصيل غيار الزيت",
        err?.message || "يرجى المحاولة مرة أخرى.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !oilChangeId) return;
    setPreviewResult(null);
    setConcurrencyNotice(null);
    setRequiresMileageBaseline(false);
    setMileageBaselineInput("");
    setReason("");
    commitAttemptKeyRef.current = null;
    void loadOperationDetails(false);
  }, [isOpen, oilChangeId]);

  const vehicleType = details?.operation.vehicleType ?? 2;
  const isCar = vehicleType === 2;
  const isCompanyVehicle = Boolean(details?.operation.vehicleId);
  const isAlreadyCancelled = Boolean(details?.operation.isCancelled);

  // Load barrels when location or oil item changes
  useEffect(() => {
    if (!isOpen || !inventoryLocationId || !oilInventoryItemId) {
      setBarrels([]);
      return;
    }
    let cancelled = false;
    getDirectOilBarrels(inventoryLocationId, oilInventoryItemId, vehicleType)
      .then((res) => {
        if (!cancelled) setBarrels(res || []);
      })
      .catch(() => {
        if (!cancelled) setBarrels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, inventoryLocationId, oilInventoryItemId, vehicleType]);

  const requiredQuantity = isCar
    ? oilFilterChanged
      ? 4
      : 3.5
    : Number(configuredOilQuantityLiters || 0);

  const openBarrel = useMemo(
    () => barrels.find((b) => b.status === OilBarrelStatus.Open),
    [barrels],
  );
  const sealedBarrels = useMemo(
    () => barrels.filter((b) => b.status === OilBarrelStatus.Sealed),
    [barrels],
  );

  const oilOptions = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.itemType === ItemType.Oil &&
            item.baseUnitOfMeasure === UnitOfMeasure.Liter &&
            canUseItem(item.compatibleVehicleTypes, vehicleType),
        )
        .map((item) => ({
          value: item.id,
          label: `${item.nameAr} (${item.sku})`,
          sublabel: `توافق: ${formatCompatibleVehicleTypes(item.compatibleVehicleTypes)}`,
        })),
    [items, vehicleType],
  );

  const filterOptions = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.itemType === ItemType.SparePart &&
            item.baseUnitOfMeasure === UnitOfMeasure.Piece &&
            canUseItem(item.compatibleVehicleTypes, vehicleType),
        )
        .map((item) => ({
          value: item.id,
          label: `${item.nameAr} (${item.sku})`,
          sublabel: `توافق: ${formatCompatibleVehicleTypes(item.compatibleVehicleTypes)}`,
        })),
    [items, vehicleType],
  );

  const locationOptions = useMemo(() => {
    const opts = locations.map((loc) => ({
      value: loc.inventoryLocationId,
      label: `${loc.maintenanceLocationNameAr} — ${loc.inventoryLocationNameAr}`,
    }));
    if (
      inventoryLocationId &&
      !opts.some((o) => o.value === inventoryLocationId)
    ) {
      opts.unshift({
        value: inventoryLocationId,
        label: resolveLocationName(inventoryLocationId),
      });
    }
    return opts;
  }, [locations, inventoryLocationId, resolveLocationName]);

  const buildPayload = (expectedEffectsHash: string | null) => {
    const op = details!.operation;
    const performedIso = canEditDate
      ? new Date(performedAtLocal).toISOString()
      : op.performedAtUtc;

    const parsedBaseline =
      requiresMileageBaseline && mileageBaselineInput.trim() !== ""
        ? Number(mileageBaselineInput)
        : null;

    return {
      performedAtUtc: performedIso,
      odometerAtChange: Number(odometerAtChange),
      inventoryLocationId,
      oilInventoryItemId,
      configuredOilQuantityLiters: isCar
        ? null
        : Number(configuredOilQuantityLiters),
      oilFilterChanged,
      oilFilterInventoryItemId: oilFilterChanged
        ? oilFilterInventoryItemId || null
        : null,
      nextOilBarrelId: nextOilBarrelId || null,
      laborCost: isCompanyVehicle ? 0 : Number(laborCost || 0),
      otherCost: Number(otherCost || 0),
      notes: notes.trim() || null,
      reason: reason.trim(),
      rowVersion: op.rowVersion,
      workOrderRowVersion: details?.workOrderRowVersion ?? null,
      expectedEffectsHash,
      mileageBaselineKm:
        parsedBaseline !== null && Number.isFinite(parsedBaseline)
          ? parsedBaseline
          : null,
    };
  };

  const validateForm = (): boolean => {
    if (!details) return false;
    if (!inventoryLocationId || !oilInventoryItemId) {
      toast.error("بيانات ناقصة", "يرجى اختيار المستودع وصنف الزيت.");
      return false;
    }
    if (oilFilterChanged && !oilFilterInventoryItemId) {
      toast.error("فلتر الزيت مطلوب", "يرجى اختيار صنف فلتر الزيت عند تفعيل تغيير الفلتر.");
      return false;
    }
    if (!isCar && (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0)) {
      toast.error("كمية الزيت مطلوبة", "يرجى إدخال كمية الزيت الفعلية باللتر للدراجة النارية.");
      return false;
    }
    if (odometerAtChange < 0) {
      toast.error("قراءة العداد غير صالحة", "يجب أن تكون قراءة العداد صفراً أو قيمة موجبة.");
      return false;
    }
    if (!reason.trim()) {
      toast.error("سبب التعديل مطلوب", "يرجى إدخال سبب التعديل لتوثيقه في سجل المراجعات.");
      return false;
    }
    if (reason.trim().length > 1000) {
      toast.error("السبب طويل جداً", "يجب ألا يتجاوز سبب التعديل 1000 حرف.");
      return false;
    }
    if (requiresMileageBaseline && mileageBaselineInput.trim() === "") {
      toast.error(
        "قراءة الأساس مطلوبة",
        "أفاد الخادم بالحاجة إلى قراءة العداد الأساسية (Mileage Baseline) لإعادة احتساب المسافات.",
      );
      return false;
    }
    return true;
  };

  const handleRunPreview = async () => {
    if (!validateForm() || !details) return;
    setPreviewLoading(true);
    setConcurrencyNotice(null);
    try {
      const payload = buildPayload(null);
      const res = await previewOilChangeCorrection(oilChangeId, payload);
      setPreviewResult(res);
      commitAttemptKeyRef.current = null;
      toast.success(
        "تمت المعاينة بنجاح",
        "راجع ملخص التغييرات والأثر المالي والمخزني أدناه قبل الاعتماد النهائي.",
      );
    } catch (err: any) {
      const code =
        err?.code ||
        err?.details?.errorCode ||
        err?.details?.title ||
        err?.errorCode;
      if (code === "maintenance.oil_change_mileage_basis_required") {
        setRequiresMileageBaseline(true);
      } else if (
        code === "maintenance.concurrency_conflict" ||
        code === "maintenance.oil_change_preview_changed"
      ) {
        setConcurrencyNotice(
          "تم تحديث السجل أو المخزون من مستخدم آخر. تم تحديث نسخة السجل مع الاحتفاظ بمدخلاتك — يرجى طلب المعاينة مجدداً.",
        );
        await loadOperationDetails(true);
      } else if (code === "maintenance.oil_change_cancelled") {
        await loadOperationDetails(true);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult || !details || !validateForm()) return;
    setCommitting(true);
    setConcurrencyNotice(null);
    commitAttemptKeyRef.current ??= crypto.randomUUID();
    try {
      const payload = buildPayload(previewResult.effectsHash);
      const res = await commitOilChangeCorrection(
        oilChangeId,
        payload,
        commitAttemptKeyRef.current,
      );
      onSuccess?.(res);
      onClose();
    } catch (err: any) {
      const code =
        err?.code ||
        err?.details?.errorCode ||
        err?.details?.title ||
        err?.errorCode;
      if (
        code === "maintenance.concurrency_conflict" ||
        code === "maintenance.oil_change_preview_changed"
      ) {
        commitAttemptKeyRef.current = null;
        setPreviewResult(null);
        setConcurrencyNotice(
          "تغيرت بيانات المخزون أو السجل منذ إنشاء المعاينة. تم جلب أحدث نسخة مع الحفاظ على تعديلاتك؛ يرجى إعادة المعاينة قبل الاعتماد.",
        );
        await loadOperationDetails(true);
      } else if (code === "maintenance.oil_change_mileage_basis_required") {
        commitAttemptKeyRef.current = null;
        setPreviewResult(null);
        setRequiresMileageBaseline(true);
      } else if (code === "maintenance.oil_change_cancelled") {
        commitAttemptKeyRef.current = null;
        setPreviewResult(null);
        await loadOperationDetails(true);
      }
    } finally {
      setCommitting(false);
    }
  };

  if (!isOpen) return null;

  const displayVehicle =
    vehicleLabel ||
    (details?.operation.vehicleId
      ? resolveVehicleLabel(details.operation.vehicleId)
      : details?.operation.maintenanceWorkOrderId
        ? resolveWorkOrderLabel(details.operation.maintenanceWorkOrderId)
        : "مركبة الخدمة");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل عملية غيار الزيت — ${displayVehicle}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-right" dir="rtl">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            جارٍ تحميل تفاصيل عملية غيار الزيت والبيانات المرتبطة...
          </div>
        ) : !details ? (
          <div className="py-10 text-center text-sm text-rose-600">
            تعذر تحميل بيانات عملية غيار الزيت.
          </div>
        ) : (
          <>
            {/* Operation Identity Header */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {displayVehicle}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                    {getVehicleTypeLabel(details.operation.vehicleType)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                    <History size={12} />
                    <span>مراجعة #{details.operation.revisionNumber ?? 0}</span>
                  </span>
                  {details.operation.maintenanceWorkOrderId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                      <Wrench size={12} />
                      <span>
                        {resolveWorkOrderLabel(
                          details.operation.maintenanceWorkOrderId,
                        )}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تاريخ الخدمة المسجل حالياً:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {formatDateTime(
                      details.operation.effectiveServiceAtUtc ||
                        details.operation.performedAtUtc,
                    )}
                  </strong>{" "}
                  • العداد المسجل:{" "}
                  <strong className="font-mono text-slate-700 dark:text-slate-200">
                    {Number(
                      details.operation.odometerAtChange ?? 0,
                    ).toLocaleString()}{" "}
                    كم
                  </strong>{" "}
                  • التكلفة الحالية:{" "}
                  <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(details.operation.totalCost)}
                  </strong>
                </p>
              </div>

              {isAlreadyCancelled && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                  <ShieldAlert size={15} />
                  <span>العملية ملغاة (للقراءة فقط)</span>
                </span>
              )}
            </div>

            {concurrencyNotice && (
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <RefreshCw
                  size={16}
                  className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                />
                <div className="space-y-1">
                  <p className="font-bold">تنبيه تزامن البيانات</p>
                  <p>{concurrencyNotice}</p>
                </div>
              </div>
            )}

            {/* Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Service Date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600" />
                    <span>تاريخ ووقت تنفيذ الخدمة الفعلي</span>
                  </label>
                  {!canEditDate && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      <Lock size={11} />
                      <span>يتطلب صلاحية تعديل التاريخ</span>
                    </span>
                  )}
                </div>
                <Input
                  type="datetime-local"
                  value={performedAtLocal}
                  disabled={!canEditDate || isAlreadyCancelled || committing}
                  onChange={(e) => {
                    setPerformedAtLocal(e.target.value);
                    invalidatePreview();
                  }}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  يُستخدم لتحديد السائق المسؤول وتسلسل قراءات العداد، بينما يتم ترحيل القيود المحاسبية والمخزنية بتاريخ الاعتماد الحالي.
                </span>
              </div>

              {/* Odometer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Gauge size={14} className="text-blue-600" />
                  <span>قراءة العداد الإجمالية عند الغيار (كم) *</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  value={odometerAtChange}
                  disabled={isAlreadyCancelled || committing}
                  onChange={(e) => {
                    setOdometerAtChange(Number(e.target.value));
                    invalidatePreview();
                  }}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  إجمالي قراءة عداد المسافات للمركبة وقت الخدمة (وليس المسافة المقطوعة منذ آخر غيار).
                </span>
              </div>

              {/* Warehouse / Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Warehouse size={14} className="text-blue-600" />
                  <span>مستودع الصرف *</span>
                </label>
                <SearchableSelect
                  value={inventoryLocationId}
                  disabled={isAlreadyCancelled || committing}
                  onChange={(val) => {
                    setInventoryLocationId(val);
                    setNextOilBarrelId("");
                    invalidatePreview();
                  }}
                  options={locationOptions}
                  placeholder="اختر مستودع الصرف..."
                />
              </div>

              {/* Oil Item */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Droplets size={14} className="text-amber-600" />
                  <span>صنف الزيت *</span>
                </label>
                <SearchableSelect
                  value={oilInventoryItemId}
                  disabled={isAlreadyCancelled || committing}
                  onChange={(val) => {
                    setOilInventoryItemId(val);
                    setNextOilBarrelId("");
                    invalidatePreview();
                  }}
                  options={oilOptions}
                  placeholder="اختر صنف الزيت..."
                />
              </div>

              {/* Oil Filter Toggle & Item */}
              <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/40 dark:bg-slate-900/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oilFilterChanged}
                      disabled={isAlreadyCancelled || committing}
                      onChange={(e) => {
                        setOilFilterChanged(e.target.checked);
                        invalidatePreview();
                      }}
                      className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Filter size={14} className="text-blue-600" />
                    <span>تم تغيير فلتر الزيت في هذه العملية</span>
                  </label>
                  {isCar && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                      كمية الزيت المعتمدة للسيارة تلقائياً:{" "}
                      {oilFilterChanged ? "4.000 لتر (مع فلتر)" : "3.500 لتر (بدون فلتر)"}
                    </span>
                  )}
                </div>

                {oilFilterChanged && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      صنف فلتر الزيت *
                    </label>
                    <SearchableSelect
                      value={oilFilterInventoryItemId}
                      disabled={isAlreadyCancelled || committing}
                      onChange={(val) => {
                        setOilFilterInventoryItemId(val);
                        invalidatePreview();
                      }}
                      options={filterOptions}
                      placeholder="اختر صنف فلتر الزيت..."
                    />
                  </div>
                )}
              </div>

              {/* Oil Quantity (Editable for Motorcycle, Auto for Car) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كمية الزيت باللتر{" "}
                  {isCar
                    ? `(تُحسب تلقائياً للسيارة: ${requiredQuantity} لتر)`
                    : "(مطلوبة للدراجة النارية) *"}
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={isCar ? requiredQuantity : configuredOilQuantityLiters}
                  disabled={isCar || isAlreadyCancelled || committing}
                  onChange={(e) => {
                    setConfiguredOilQuantityLiters(e.target.value);
                    invalidatePreview();
                  }}
                />
              </div>

              {/* Next Sealed Barrel Picker (Optional / When needed) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البرميل المختوم التالي (عند عدم كفاية البرميل المفتوح)
                </label>
                <SearchableSelect
                  value={nextOilBarrelId}
                  disabled={isAlreadyCancelled || committing}
                  onChange={(val) => {
                    setNextOilBarrelId(val);
                    invalidatePreview();
                  }}
                  options={[
                    { value: "", label: "تلقائي / استخدام البرميل المفتوح الحالي" },
                    ...sealedBarrels.map((b) => ({
                      value: b.id,
                      label: `${b.barrelNumber} (${b.remainingLiters} لتر متاح)${
                        b.allowBothVehicleTypes
                          ? " • مشترك"
                          : b.allowedVehicleType === 1
                            ? " • دراجات فقط"
                            : b.allowedVehicleType === 2
                              ? " • سيارات فقط"
                              : ""
                      }`,
                    })),
                  ]}
                  placeholder="اختر البرميل المختوم التالي عند الحاجة..."
                />
                {openBarrel && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-bold">
                    البرميل المفتوح حالياً: {openBarrel.barrelNumber} (المتبقي:{" "}
                    {openBarrel.remainingLiters} لتر)
                  </span>
                )}
              </div>

              {/* Labor Cost & Other Cost */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    تكلفة أجور اليد (ر.س)
                  </label>
                  {isCompanyVehicle && (
                    <span className="text-[10px] font-bold text-slate-400">
                      مقفلة (0 ر.س لمركبات الشركة)
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={isCompanyVehicle ? 0 : laborCost}
                  disabled={isCompanyVehicle || isAlreadyCancelled || committing}
                  onChange={(e) => {
                    setLaborCost(Number(e.target.value));
                    invalidatePreview();
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تكاليف أخرى إضافية (ر.س)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={otherCost}
                  disabled={isAlreadyCancelled || committing}
                  onChange={(e) => {
                    setOtherCost(Number(e.target.value));
                    invalidatePreview();
                  }}
                />
              </div>

              {/* Mileage Baseline (Shown if required by backend) */}
              {requiresMileageBaseline && (
                <div className="md:col-span-2 p-3.5 rounded-xl border border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-rose-900 dark:text-rose-200">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>مطلوب إدخال قراءة العداد الأساسية المعتمدة (Mileage Baseline Km)</span>
                  </div>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300">
                    لا تتوفر قراءة أساس موثوقة سابقة لإعادة احتساب المسافات بعد هذا التعديل. يرجى إدخال قراءة العداد الأساسية الموثقة للمركبة (لا تدخل 0 إلا إذا كانت موثقة فعلياً):
                  </p>
                  <Input
                    type="number"
                    min={0}
                    placeholder="أدخل قراءة الأساس المعتمدة بالكم..."
                    value={mileageBaselineInput}
                    onChange={(e) => {
                      setMileageBaselineInput(e.target.value);
                      invalidatePreview();
                    }}
                  />
                </div>
              )}

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات العملية
                </label>
                <Input
                  value={notes}
                  disabled={isAlreadyCancelled || committing}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    invalidatePreview();
                  }}
                  placeholder="ملاحظات فنية أو تشغيلية اختيارية..."
                />
              </div>

              {/* Reason for Edit */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل وتوثيق المراجعة <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  disabled={isAlreadyCancelled || committing}
                  onChange={(e) => {
                    setReason(e.target.value);
                    invalidatePreview();
                  }}
                  maxLength={1000}
                  placeholder="اكتب سبب تعديل عملية غيار الزيت بوضوح ليتم حفظه في سجل المراجعات..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed outline-none focus:border-blue-600 dark:text-white"
                />
              </div>
            </div>

            {/* Preview Button Bar */}
            {!isAlreadyCancelled && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/25 p-3">
                <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200">
                  <Info size={16} className="text-blue-600 shrink-0" />
                  <span>
                    يجب معاينة التعديل أولاً للتحقق من فروقات المخزون والتكاليف وسائق العهدة قبل التمكين من الحفظ النهائي.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  loading={previewLoading}
                  disabled={previewLoading || committing}
                  onClick={handleRunPreview}
                  className="shrink-0 gap-1.5 text-xs font-bold border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                >
                  <Eye size={14} />
                  <span>
                    {previewResult ? "تحديث المعاينة" : "معاينة الأثر قبل الاعتماد"}
                  </span>
                </Button>
              </div>
            )}

            {/* Preview Result Card */}
            {previewResult && (
              <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 dark:border-emerald-800/80 pb-3">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-black text-sm">
                    <Sparkles size={18} className="text-emerald-600" />
                    <span>نتيجة معاينة التعديل والآثار المالية والمخزنية</span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                    جاهز للاعتماد النهائي
                  </span>
                </div>

                {/* Closed Barrel Waste Banner */}
                {previewResult.effects.returnedAsWasteLiters > 0 && (
                  <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-200">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <span>الكمية المرتجعة من البرميل المغلق سُجلت كهالك</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      نظراً لأن البرميل الأصلي أصبح مغلقاً (فارغاً أو مرتجعاً)، سيتم تسجيل الكمية المستردة والبالغة{" "}
                      <strong className="font-mono underline">
                        {previewResult.effects.returnedAsWasteLiters} لتر
                      </strong>{" "}
                      كهالك مخزني على المستودع، ويبقى البرميل مغلقاً دون زيادة الرصيد المتاح للصرف.
                    </p>
                  </div>
                )}

                {/* Cost & Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">كمية الزيت المعتمدة</span>
                    <strong className="font-mono text-sm text-slate-900 dark:text-white">
                      {previewResult.effects.oilQuantityLiters} لتر
                    </strong>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">تكلفة الزيت (FIFO)</span>
                    <strong className="font-mono text-sm text-slate-900 dark:text-white">
                      {formatCurrency(previewResult.effects.oilCost)}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">تكلفة الفلتر</span>
                    <strong className="font-mono text-sm text-slate-900 dark:text-white">
                      {formatCurrency(previewResult.effects.filterCost)}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">أجور اليد + أخرى</span>
                    <strong className="font-mono text-sm text-slate-900 dark:text-white">
                      {formatCurrency(
                        (previewResult.effects.laborCost || 0) +
                          (previewResult.effects.otherCost || 0),
                      )}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 p-2.5 border border-emerald-300 dark:border-emerald-800">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">
                      الإجمالي الجديد
                    </span>
                    <strong className="font-mono text-sm text-emerald-900 dark:text-emerald-200">
                      {formatCurrency(previewResult.effects.totalCost)}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">عداد المركبة الناتج</span>
                    <strong className="font-mono text-sm text-blue-700 dark:text-blue-300">
                      {previewResult.effects.vehicleMileageKm != null
                        ? `${Number(previewResult.effects.vehicleMileageKm).toLocaleString()} كم`
                        : "بدون تغيير"}
                    </strong>
                  </div>
                </div>

                {/* Rider Attribution & Work Order Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white/80 dark:bg-slate-900/70 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-purple-600" />
                    <span className="text-slate-500">السائق المحمّل بالتكلفة وقت الخدمة:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {resolveRiderName(previewResult.effects.riderProfileId)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">حركة المواد:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {previewResult.effects.materialsReplaced
                        ? "عكس الصرف القديم وإصدار صرف جديد"
                        : "تحديث البيانات دون إعادة صرف المخزون"}
                    </span>
                  </div>

                  {previewResult.effects.workOrderStatus != null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">حالة أمر العمل:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        {workOrderStatusConfig[
                          previewResult.effects.workOrderStatus as WorkOrderStatus
                        ]?.label || "مكتمل"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Affected Barrels Table */}
                {previewResult.effects.barrels &&
                  previewResult.effects.barrels.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        البراميل المتأثرة بالتعديل:
                      </h5>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                            <tr>
                              <th className="px-3 py-2 font-bold">رقم البرميل</th>
                              <th className="px-3 py-2 font-bold">الكمية المصروفة</th>
                              <th className="px-3 py-2 font-bold">الكمية المستردة / المعكوسة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {previewResult.effects.barrels.map((b, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                                  {resolveBarrelNumber(b.barrelId, b.barrelNumber)}
                                </td>
                                <td className="px-3 py-2 font-mono text-amber-700 dark:text-amber-400">
                                  {b.issuedLiters > 0 ? `${b.issuedLiters} لتر` : "—"}
                                </td>
                                <td className="px-3 py-2 font-mono text-emerald-700 dark:text-emerald-400">
                                  {b.reversedLiters > 0 ? `${b.reversedLiters} لتر` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={committing}
              >
                إغلاق
              </Button>
              {!isAlreadyCancelled && (
                <Button
                  type="button"
                  variant="primary"
                  loading={committing}
                  disabled={!previewResult || previewLoading || committing}
                  onClick={handleCommit}
                  className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 size={15} />
                  <span>اعتماد وحفظ التعديل النهائي</span>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
