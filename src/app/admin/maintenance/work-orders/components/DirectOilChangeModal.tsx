"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { getVehicleDetail } from "@/lib/fleet/api";
import { completeDirectOilChange, getDirectOilBarrels, getDirectOilInventoryLocations, getInventoryItems } from "@/lib/maintenance/api";
import { ItemType, OilBarrelStatus, UnitOfMeasure, type DirectOilBarrel, type DirectOilInventoryLocation, type InventoryItem, type OilReminder } from "@/lib/maintenance/types";

interface Props {
  vehicleId: string;
  reminder: OilReminder | null;
  onClose: () => void;
  onCompleted: () => void;
}

function localDateTime(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function DirectOilChangeModal({ vehicleId, reminder, onClose, onCompleted }: Props) {
  const [locations, setLocations] = useState<DirectOilInventoryLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vehicleRowVersion, setVehicleRowVersion] = useState("");
  const [vehicleType, setVehicleType] = useState<number | null>(reminder?.vehicleType ?? null);
  const [currentOdometer, setCurrentOdometer] = useState(reminder?.currentOdometer ?? 0);
  const [odometer, setOdometer] = useState(reminder?.currentOdometer ?? 0);
  const [performedAtLocal, setPerformedAtLocal] = useState(localDateTime);
  const [inventoryLocationId, setInventoryLocationId] = useState("");
  const [oilItemId, setOilItemId] = useState("");
  const [filterChanged, setFilterChanged] = useState(true);
  const [filterItemId, setFilterItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [nextBarrelId, setNextBarrelId] = useState("");
  const [barrels, setBarrels] = useState<DirectOilBarrel[]>([]);
  const [otherCost, setOtherCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const attemptKey = useRef<string | null>(null);
  const isCar = vehicleType === 2;
  const requiredQuantity = isCar ? (filterChanged ? 4 : 3.5) : Number(quantity);
  const openBarrel = barrels.find((barrel) => barrel.status === OilBarrelStatus.Open);
  const needsNextBarrel = Boolean(openBarrel && openBarrel.remainingLiters < requiredQuantity);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getVehicleDetail(vehicleId), getDirectOilInventoryLocations(), getInventoryItems()])
      .then(([vehicle, siteList, itemList]) => {
        if (cancelled) return;
        setVehicleRowVersion(vehicle.summary.rowVersion);
        setVehicleType(vehicle.summary.vehicleType);
        setCurrentOdometer(vehicle.summary.currentOdometer);
        setOdometer(vehicle.summary.currentOdometer);
        setLocations(siteList);
        setItems(itemList.filter((item) => item.status === 1));
      })
      .catch((error) => { if (!cancelled) toast.error("تعذر تحميل البيانات", error instanceof Error ? error.message : "حاول مرة أخرى."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vehicleId]);

  useEffect(() => {
    if (!inventoryLocationId || !oilItemId) return;
    let cancelled = false;
    getDirectOilBarrels(inventoryLocationId, oilItemId)
      .then((result) => { if (!cancelled) setBarrels(result); })
      .catch(() => { if (!cancelled) setBarrels([]); });
    return () => { cancelled = true; };
  }, [inventoryLocationId, oilItemId]);

  const oilOptions = useMemo(() => items.filter((item) => item.itemType === ItemType.Oil && item.baseUnitOfMeasure === UnitOfMeasure.Liter)
    .map((item) => ({ value: item.id, label: `${item.nameAr} (${item.sku})` })), [items]);
  const filterOptions = useMemo(() => items.filter((item) => item.itemType === ItemType.SparePart && item.baseUnitOfMeasure === UnitOfMeasure.Piece)
    .map((item) => ({ value: item.id, label: `${item.nameAr} (${item.sku})` })), [items]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || loading) return;
    if (!vehicleRowVersion || !inventoryLocationId || !oilItemId || (filterChanged && !filterItemId)) {
      toast.error("بيانات ناقصة", "اختر موقع الصيانة والزيت والفلتر عند تغييره.");
      return;
    }
    if (!isCar && (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0)) {
      toast.error("كمية الزيت مطلوبة", "أدخل كمية الزيت الفعلية باللتر للدراجة النارية.");
      return;
    }
    if (odometer < currentOdometer) {
      toast.error("قراءة العداد غير صالحة", "قراءة التغيير لا يمكن أن تقل عن القراءة الحالية.");
      return;
    }
    if (needsNextBarrel && !nextBarrelId) {
      toast.error("برميل إضافي مطلوب", "اختر البرميل المختوم التالي لإكمال كمية الزيت.");
      return;
    }
    attemptKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    try {
      await completeDirectOilChange(vehicleId, {
        performedAtUtc: new Date(performedAtLocal).toISOString(),
        odometerAtChange: odometer,
        inventoryLocationId,
        oilInventoryItemId: oilItemId,
        nextOilBarrelId: needsNextBarrel ? nextBarrelId : null,
        oilFilterChanged: filterChanged,
        oilFilterInventoryItemId: filterChanged ? filterItemId : null,
        configuredOilQuantityLiters: isCar ? null : requiredQuantity,
        otherCost,
        notes: notes.trim() || null,
        vehicleRowVersion,
      }, attemptKey.current);
      onCompleted();
    } catch {
      // authFetch displays the API validation message.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`تغيير الزيت مباشرة — ${reminder?.assetNumber ?? "المركبة"}`} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="space-y-4 text-sm">
        {loading && <p>جارٍ تحميل بيانات المركبة والمخزون...</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>تاريخ ووقت التغيير <Input type="datetime-local" value={performedAtLocal} onChange={(event) => { setPerformedAtLocal(event.target.value); attemptKey.current = null; }} required /></label>
          <label>قراءة العداد (كم) <Input type="number" min={currentOdometer} value={odometer} onChange={(event) => { setOdometer(Number(event.target.value)); attemptKey.current = null; }} required /></label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>موقع الصيانة والمخزون
            <SearchableSelect value={inventoryLocationId} onChange={(value) => { setInventoryLocationId(value); setNextBarrelId(""); attemptKey.current = null; }}
              options={locations.map((location) => ({ value: location.inventoryLocationId, label: `${location.maintenanceLocationNameAr} — ${location.inventoryLocationNameAr}` }))} placeholder="اختر الموقع" required />
          </label>
          <label>صنف الزيت
            <SearchableSelect value={oilItemId} onChange={(value) => { setOilItemId(value); setNextBarrelId(""); attemptKey.current = null; }} options={oilOptions} placeholder="اختر الزيت" required />
          </label>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={filterChanged} onChange={(event) => { setFilterChanged(event.target.checked); attemptKey.current = null; }} />تم تغيير فلتر الزيت</label>
        {filterChanged && <label>صنف فلتر الزيت
          <SearchableSelect value={filterItemId} onChange={(value) => { setFilterItemId(value); attemptKey.current = null; }} options={filterOptions} placeholder="اختر الفلتر" required />
        </label>}
        <label>كمية الزيت باللتر {isCar ? `(ثابتة: ${requiredQuantity} لتر)` : "(مطلوبة للدراجة)"}
          <Input type="number" step="0.001" min="0.001" value={isCar ? requiredQuantity : quantity} onChange={(event) => { setQuantity(event.target.value); attemptKey.current = null; }} disabled={isCar} required={!isCar} />
        </label>
        {oilItemId && inventoryLocationId && (
          <p className="rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800">
            {openBarrel ? `البرميل المفتوح: ${openBarrel.barrelNumber} — المتبقي ${openBarrel.remainingLiters} لتر` : "لا يوجد برميل مفتوح في الموقع؛ افتح برميلاً قبل التنفيذ."}
          </p>
        )}
        {needsNextBarrel && <label>البرميل المختوم التالي
          <SearchableSelect value={nextBarrelId} onChange={(value) => { setNextBarrelId(value); attemptKey.current = null; }}
            options={barrels.filter((barrel) => barrel.status === OilBarrelStatus.Sealed).map((barrel) => ({ value: barrel.id, label: `${barrel.barrelNumber} (${barrel.remainingLiters} لتر)` }))}
            placeholder="اختر البرميل التالي" required />
        </label>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>تكاليف أخرى (ر.س) <Input type="number" min="0" step="0.01" value={otherCost} onChange={(event) => { setOtherCost(Number(event.target.value)); attemptKey.current = null; }} /></label>
          <label>ملاحظات <Input value={notes} onChange={(event) => { setNotes(event.target.value); attemptKey.current = null; }} /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>إلغاء</Button>
          <Button type="submit" disabled={loading || submitting || !vehicleRowVersion}>{submitting ? "جارٍ التسجيل والصرف..." : "تسجيل تغيير الزيت وصرف المواد"}</Button>
        </div>
      </form>
    </Modal>
  );
}
