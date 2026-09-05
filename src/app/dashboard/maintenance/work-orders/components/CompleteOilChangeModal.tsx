"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { completeOilChange, getOilBarrels } from "@/lib/maintenance/api";
import type {
  WorkOrder,
  InventoryItem,
  MaintenanceLocation,
  OilBarrel,
} from "@/lib/maintenance/types";
import { Droplets, Filter, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface CompleteOilChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
  workOrder: WorkOrder | null;
  items: InventoryItem[];
  locations: MaintenanceLocation[];
}

export function CompleteOilChangeModal({
  isOpen,
  onClose,
  onCompleted,
  workOrder,
  items,
  locations,
}: CompleteOilChangeModalProps) {
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [performedAtUtc, setPerformedAtUtc] = useState(new Date().toISOString().slice(0, 16));
  const [odometerAtChange, setOdometerAtChange] = useState<number>(0);
  const [inventoryLocationId, setInventoryLocationId] = useState("");
  const [oilInventoryItemId, setOilInventoryItemId] = useState("");
  const [oilFilterChanged, setOilFilterChanged] = useState(true);
  const [oilFilterInventoryItemId, setOilFilterInventoryItemId] = useState("");
  const [configuredOilQuantityLiters, setConfiguredOilQuantityLiters] = useState<string>("");
  const [laborCost, setLaborCost] = useState<number>(50);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [nextOilBarrelId, setNextOilBarrelId] = useState<string>("");

  // Barrels in selected location & item
  const [locationBarrels, setLocationBarrels] = useState<OilBarrel[]>([]);
  const [openBarrel, setOpenBarrel] = useState<OilBarrel | null>(null);
  const [sealedBarrels, setSealedBarrels] = useState<OilBarrel[]>([]);

  useEffect(() => {
    if (workOrder) {
      setOdometerAtChange(workOrder.odometerAtOpen || 0);
      setInventoryLocationId(workOrder.maintenanceLocationId || "");
      setPerformedAtUtc(new Date().toISOString().slice(0, 16));
      setLaborCost(50);
      setOtherCost(0);
      setNotes("");
      setNextOilBarrelId("");
    }
  }, [workOrder, isOpen]);

  // Load barrels when location or oil item changes
  useEffect(() => {
    if (!inventoryLocationId || !oilInventoryItemId) {
      setLocationBarrels([]);
      setOpenBarrel(null);
      setSealedBarrels([]);
      return;
    }

    getOilBarrels({
      inventoryLocationId,
      inventoryItemId: oilInventoryItemId,
    })
      .then((barrels) => {
        setLocationBarrels(barrels);
        const open = barrels.find((b) => b.status === 2);
        setOpenBarrel(open || null);
        const sealed = barrels.filter((b) => b.status === 1);
        setSealedBarrels(sealed);
      })
      .catch(() => {});
  }, [inventoryLocationId, oilInventoryItemId]);

  // Determine expected oil quantity
  const isCar = true; // default
  const defaultQuantity = oilFilterChanged ? 4 : 3.5;
  const effectiveQuantity = configuredOilQuantityLiters
    ? parseFloat(configuredOilQuantityLiters)
    : defaultQuantity;

  // Check if open barrel will be exhausted and needs next barrel
  const isMultiBarrelNeeded = Boolean(
    openBarrel && openBarrel.remainingLiters < effectiveQuantity,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrder) return;

    if (!inventoryLocationId) {
      alert("يرجى تحديد موقع المستودع / الورشة.");
      return;
    }

    if (!oilInventoryItemId) {
      alert("يرجى اختيار صنف الزيت المستخدم.");
      return;
    }

    if (oilFilterChanged && !oilFilterInventoryItemId) {
      alert("يرجى اختيار صنف فلتر الزيت عند تحديد خيار تغيير الفلتر.");
      return;
    }

    if (workOrder.odometerAtOpen && odometerAtChange < workOrder.odometerAtOpen) {
      alert("قراءة العداد عند تغيير الزيت يجب ألا تقل عن قراءة فتح أمر العمل.");
      return;
    }

    if (isMultiBarrelNeeded && !nextOilBarrelId) {
      alert(
        `البرميل المفتوح حالياً يحتوي على (${openBarrel?.remainingLiters} لتر) فقط بينما تتطلب العملية (${effectiveQuantity} لتر). يرجى اختيار البرميل المختوم التالي (FIFO) لاستكمال الكمية.`,
      );
      return;
    }

    setLoading(true);
    try {
      await completeOilChange(workOrder.id, {
        performedAtUtc: new Date(performedAtUtc).toISOString(),
        odometerAtChange: Number(odometerAtChange),
        inventoryLocationId,
        oilInventoryItemId,
        nextOilBarrelId: nextOilBarrelId || null,
        oilFilterChanged,
        oilFilterInventoryItemId: oilFilterChanged ? oilFilterInventoryItemId : null,
        configuredOilQuantityLiters: configuredOilQuantityLiters
          ? parseFloat(configuredOilQuantityLiters)
          : null,
        laborCost: Number(laborCost || 0),
        otherCost: Number(otherCost || 0),
        notes: notes.trim() || null,
        workOrderRowVersion: workOrder.rowVersion,
      });

      onCompleted();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const oilItems = items.filter((i) => i.itemType === 3);
  const filterItems = items.filter(
    (i) =>
      i.itemType === 1 &&
      (i.nameAr.includes("فلتر") ||
        i.nameEn.toLowerCase().includes("filter") ||
        i.sku.toLowerCase().includes("flt")),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تنفيذ عملية تغيير الزيت - أمر رقم ${workOrder?.workOrderNumber || ""}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Vehicle & Order Context */}
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              المركبة: {workOrder?.vehicleAssetNumber || "مركبة الشركة"}
            </span>
            <span className="text-slate-500">
              عداد البداية: {workOrder?.odometerAtOpen?.toLocaleString() || 0} كم
            </span>
          </div>
          <div className="text-left text-[11px] text-blue-700 dark:text-blue-400 font-bold">
            {workOrder?.maintenanceLocationNameAr}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              تاريخ وتوقيت العملية <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              value={performedAtUtc}
              onChange={(e) => setPerformedAtUtc(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              قراءة العداد عند التغيير (كم) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={workOrder?.odometerAtOpen || 0}
              value={odometerAtChange}
              onChange={(e) => setOdometerAtChange(parseInt(e.target.value) || 0)}
              required
              className="text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              موقع الورشة / المستودع <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={inventoryLocationId}
              onChange={(val) => setInventoryLocationId(val)}
              options={locations.map((l) => ({
                value: l.id,
                label: `${l.nameAr} (${l.code})`,
              }))}
              placeholder="اختر موقع الورشة..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              صنف الزيت <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={oilInventoryItemId}
              onChange={(val) => setOilInventoryItemId(val)}
              options={oilItems.map((i) => ({
                value: i.id,
                label: `${i.nameAr} (${i.sku})`,
              }))}
              placeholder="اختر صنف الزيت..."
              required
            />
          </div>
        </div>

        {/* Oil Barrels Context & Multi-barrel Prompt */}
        {oilInventoryItemId && inventoryLocationId && (
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/40 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Droplets size={15} className="text-amber-500" />
                حالة برميل الزيت النشط في الموقع
              </span>
              {openBarrel ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  برميل مفتوح: {openBarrel.barrelNumber} (متبقٍ: {openBarrel.remainingLiters}L)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[10px]">
                  لا يوجد برميل مفتوح حالياً!
                </span>
              )}
            </div>

            {/* Warning if current open barrel is insufficient */}
            {isMultiBarrelNeeded && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 space-y-2">
                <div className="flex items-start gap-2 text-[11px]">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      البرميل المفتوح سينفد أثناء هذه العملية!
                    </span>
                    <span>
                      البرميل الحالي به {openBarrel?.remainingLiters} لتر فقط، والعملية تحتاج {effectiveQuantity} لتر. سيستهلك النظام باقي البرميل الحالي ثم يفتح البرميل التالي تلقائياً.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">
                    اختر البرميل المختوم التالي (FIFO) <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={nextOilBarrelId}
                    onChange={(val) => setNextOilBarrelId(val)}
                    options={sealedBarrels.map((b) => ({
                      value: b.id,
                      label: `${b.barrelNumber} (${b.remainingLiters}L) - طرد #${b.packageSequence}`,
                    }))}
                    placeholder="اختر البرميل التالي لفتحه..."
                    required
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Selection */}
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs space-y-3">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={oilFilterChanged}
              onChange={(e) => setOilFilterChanged(e.target.checked)}
              className="size-4 rounded text-[#1167c9]"
            />
            <span>تم تغيير فلتر الزيت (مع الفلتر: 4 لتر / بدون الفلتر: 3.5 لتر للسيارات)</span>
          </label>

          {oilFilterChanged && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                صنف فلتر الزيت المصروف <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={oilFilterInventoryItemId}
                onChange={(val) => setOilFilterInventoryItemId(val)}
                options={(filterItems.length ? filterItems : items).map((i) => ({
                  value: i.id,
                  label: `${i.nameAr} (${i.sku})`,
                }))}
                placeholder="اختر فلتر الزيت المصروف..."
                required
              />
            </div>
          )}
        </div>

        {/* Quantity and Labor Costs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              كمية الزيت (لتر - فارغ للحساب الآلي)
            </label>
            <Input
              type="number"
              step="0.1"
              value={configuredOilQuantityLiters}
              onChange={(e) => setConfiguredOilQuantityLiters(e.target.value)}
              placeholder={`تلقائي (${defaultQuantity} لتر)`}
              className="text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              أجرة يد الفني / العمالة (ر.س)
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={laborCost}
              onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
              className="text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              تكاليف أخرى (ر.س)
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={otherCost}
              onChange={(e) => setOtherCost(parseFloat(e.target.value) || 0)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            ملاحظات الفحص والتشغيل
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مستوى الزيت، فحص التسريب..."
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            تأكيد إتمام تغيير الزيت
          </Button>
        </div>
      </form>
    </Modal>
  );
}
