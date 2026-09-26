"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createInventoryItem, updateInventoryItem } from "@/lib/maintenance/api";
import type { InventoryItem } from "@/lib/maintenance/types";
import { ItemType, UnitOfMeasure, VehicleType } from "@/lib/maintenance/types";
import {
  itemTypeLabels,
  unitOfMeasureLabels,
  vehicleTypeLabels,
  ALL_VEHICLE_TYPES,
} from "@/lib/maintenance/constants";
import { Sparkles, Info, Check, AlertCircle } from "lucide-react";

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: InventoryItem | null;
}

export function ItemModal({ isOpen, onClose, onSaved, item }: ItemModalProps) {
  const [loading, setLoading] = useState(false);

  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [itemType, setItemType] = useState<ItemType>(ItemType.SparePart);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [baseUnitOfMeasure, setBaseUnitOfMeasure] = useState<UnitOfMeasure>(UnitOfMeasure.Piece);
  const [purchaseUnitOfMeasure, setPurchaseUnitOfMeasure] = useState<UnitOfMeasure>(UnitOfMeasure.Piece);
  const [defaultPackageQuantity, setDefaultPackageQuantity] = useState<number>(1);
  const [minimumStockLevel, setMinimumStockLevel] = useState<number>(5);
  const [reorderQuantity, setReorderQuantity] = useState<number>(10);
  const [isSerialized, setIsSerialized] = useState(false);
  const [isLotTracked, setIsLotTracked] = useState(false);
  const [compatibleVehicleTypes, setCompatibleVehicleTypes] = useState<VehicleType[]>(ALL_VEHICLE_TYPES);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setSku(item.sku || "");
      setBarcode(item.barcode || "");
      setItemType(item.itemType || ItemType.SparePart);
      setNameAr(item.nameAr || "");
      setNameEn(item.nameEn || "");
      setDescriptionAr(item.descriptionAr || "");
      setDescriptionEn(item.descriptionEn || "");
      setBaseUnitOfMeasure(item.baseUnitOfMeasure || UnitOfMeasure.Piece);
      setPurchaseUnitOfMeasure(item.purchaseUnitOfMeasure || UnitOfMeasure.Piece);
      setDefaultPackageQuantity(item.defaultPackageQuantity || 1);
      setMinimumStockLevel(item.minimumStockLevel || 0);
      setReorderQuantity(item.reorderQuantity || 0);
      setIsSerialized(Boolean(item.isSerialized));
      setIsLotTracked(Boolean(item.isLotTracked));
      setCompatibleVehicleTypes(
        item.compatibleVehicleTypes && item.compatibleVehicleTypes.length > 0
          ? item.compatibleVehicleTypes
          : ALL_VEHICLE_TYPES,
      );
      setValidationError(null);
    } else {
      setSku("");
      setBarcode("");
      setItemType(ItemType.SparePart);
      setNameAr("");
      setNameEn("");
      setDescriptionAr("");
      setDescriptionEn("");
      setBaseUnitOfMeasure(UnitOfMeasure.Piece);
      setPurchaseUnitOfMeasure(UnitOfMeasure.Piece);
      setDefaultPackageQuantity(1);
      setMinimumStockLevel(5);
      setReorderQuantity(10);
      setIsSerialized(false);
      setIsLotTracked(false);
      setCompatibleVehicleTypes(ALL_VEHICLE_TYPES);
      setValidationError(null);
    }
  }, [item, isOpen]);

  const applyOilBarrelPreset = () => {
    setItemType(ItemType.Oil);
    setBaseUnitOfMeasure(UnitOfMeasure.Liter); // 2
    setPurchaseUnitOfMeasure(UnitOfMeasure.Barrel); // 3
    setDefaultPackageQuantity(208);
    setMinimumStockLevel(20);
    setReorderQuantity(208);
    setIsLotTracked(true);
    if (!sku) setSku("OIL-10W40");
    if (!nameAr) setNameAr("زيت محرك 10W-40 (برميل)");
    if (!nameEn) setNameEn("Engine Oil 10W-40 (Barrel)");
  };

  const applyRiderAccessoryPreset = () => {
    setItemType(ItemType.RiderAccessory);
    setBaseUnitOfMeasure(UnitOfMeasure.Piece); // 1
    setPurchaseUnitOfMeasure(UnitOfMeasure.Piece); // 1
    setDefaultPackageQuantity(1);
    setMinimumStockLevel(5);
    setReorderQuantity(10);
    setIsLotTracked(false);
    setIsSerialized(true);
    if (!sku) setSku("RDR-ACC-01");
    if (!nameAr) setNameAr("خوذة دراجة نارية قياسية");
    if (!nameEn) setNameEn("Standard Rider Helmet");
  };

  const toggleVehicleType = (type: VehicleType) => {
    setCompatibleVehicleTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      return next.sort((a, b) => a - b);
    });
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (compatibleVehicleTypes.length === 0) {
      setValidationError("يجب اختيار نوع مركبة واحد على الأقل متوافق مع الصنف.");
      return;
    }
    setValidationError(null);
    setLoading(true);
    try {
      if (item) {
        await updateInventoryItem(item.id, {
          sku,
          barcode: barcode || null,
          itemType: Number(itemType),
          nameAr,
          nameEn,
          descriptionAr: descriptionAr || null,
          descriptionEn: descriptionEn || null,
          baseUnitOfMeasure: Number(baseUnitOfMeasure),
          purchaseUnitOfMeasure: Number(purchaseUnitOfMeasure),
          defaultPackageQuantity: Number(defaultPackageQuantity),
          minimumStockLevel: Number(minimumStockLevel),
          reorderQuantity: Number(reorderQuantity),
          isSerialized,
          isLotTracked,
          compatibleVehicleTypes,
          rowVersion: item.rowVersion,
        });
      } else {
        await createInventoryItem({
          sku,
          barcode: barcode || null,
          itemType: Number(itemType),
          nameAr,
          nameEn,
          descriptionAr: descriptionAr || null,
          descriptionEn: descriptionEn || null,
          baseUnitOfMeasure: Number(baseUnitOfMeasure),
          purchaseUnitOfMeasure: Number(purchaseUnitOfMeasure),
          defaultPackageQuantity: Number(defaultPackageQuantity),
          minimumStockLevel: Number(minimumStockLevel),
          reorderQuantity: Number(reorderQuantity),
          isSerialized,
          isLotTracked,
          compatibleVehicleTypes,
          rowVersion: null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? "تعديل صنف مخزون / قطعة غيار" : "إضافة صنف مخزون جديد"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!item && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs">
              <div className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                <Sparkles size={14} className="shrink-0" />
                <span className="font-bold text-[11px]">مستلزمات مندوب؟</span>
              </div>
              <button
                type="button"
                onClick={applyRiderAccessoryPreset}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer shrink-0"
              >
                تطبيق قالب المندوب (خوذة)
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Sparkles size={14} className="shrink-0" />
                <span className="font-bold text-[11px]">برميل زيت جديد؟</span>
              </div>
              <button
                type="button"
                onClick={applyOilBarrelPreset}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer shrink-0"
              >
                تطبيق قالب برميل الزيت
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رمز الصنف (SKU) <span className="text-red-500">*</span>
            </label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="مثال: OIL-10W40 أو BRK-PAD-01"
              required
              className="font-mono uppercase text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الباركود (Barcode)
            </label>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="الباركود إن وجد"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نوع الصنف <span className="text-red-500">*</span>
            </label>
            <select
              value={itemType}
              onChange={(e) => setItemType(Number(e.target.value) as ItemType)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden cursor-pointer"
              required
            >
              {Object.entries(itemTypeLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label} ({val})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم الصنف بالعربية <span className="text-red-500">*</span>
            </label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: زيت محرك بترولايزر 10W-40"
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم الصنف بالإنجليزية <span className="text-red-500">*</span>
            </label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Example: Engine Oil 10W-40"
              required
              dir="ltr"
              className="text-xs"
            />
          </div>
        </div>

        {/* Compatible Vehicle Types Multiselect */}
        <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                أنواع المركبات المتوافقة (Compatible vehicle types) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                حدد أنواع المركبات التي يتوافق معها هذا الصنف (يمكن اختيار نوع واحد أو عدة أنواع).
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCompatibleVehicleTypes(ALL_VEHICLE_TYPES);
                  setValidationError(null);
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 font-bold transition-colors cursor-pointer"
              >
                تحديد الكل (5)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompatibleVehicleTypes([VehicleType.Motorcycle]);
                  setValidationError(null);
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 font-bold transition-colors cursor-pointer"
              >
                دراجة فقط
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompatibleVehicleTypes([VehicleType.Car]);
                  setValidationError(null);
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 font-bold transition-colors cursor-pointer"
              >
                سيارة فقط
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {ALL_VEHICLE_TYPES.map((type) => {
              const isSelected = compatibleVehicleTypes.includes(type);
              const label = vehicleTypeLabels[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleVehicleType(type)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#1167c9] border-[#1167c9] text-white shadow-xs"
                      : "bg-[var(--surface)] border-[var(--border)] text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`size-4 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? "bg-white text-[#1167c9] border-white"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span>{label}</span>
                  </div>
                  <span className="text-[10px] opacity-75 font-mono">({type})</span>
                </button>
              );
            })}
          </div>

          {validationError && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold pt-1">
              <AlertCircle size={14} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              وحدة الصرف الأساسية (Base UOM) <span className="text-red-500">*</span>
            </label>
            <select
              value={baseUnitOfMeasure}
              onChange={(e) => setBaseUnitOfMeasure(Number(e.target.value) as UnitOfMeasure)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
              required
            >
              {Object.entries(unitOfMeasureLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              وحدة الشراء (Purchase UOM) <span className="text-red-500">*</span>
            </label>
            <select
              value={purchaseUnitOfMeasure}
              onChange={(e) => setPurchaseUnitOfMeasure(Number(e.target.value) as UnitOfMeasure)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
              required
            >
              {Object.entries(unitOfMeasureLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              سعة العبوة / التعبئة الافتراضية <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0.01"
              step="any"
              value={defaultPackageQuantity}
              onChange={(e) => setDefaultPackageQuantity(parseFloat(e.target.value) || 1)}
              required
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الحد الأدنى للطلب (Reorder Point)
            </label>
            <Input
              type="number"
              min="0"
              value={reorderQuantity}
              onChange={(e) => setReorderQuantity(parseFloat(e.target.value) || 0)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الحد الأدنى لمخزون الأمان (Min Stock Level)
            </label>
            <Input
              type="number"
              min="0"
              value={minimumStockLevel}
              onChange={(e) => setMinimumStockLevel(parseFloat(e.target.value) || 0)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isLotTracked}
              onChange={(e) => setIsLotTracked(e.target.checked)}
              className="size-4 rounded text-[#1167c9]"
            />
            <span>تتبع برقم التشغيلة (Lot Tracked - مطلوب للزيوت)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isSerialized}
              onChange={(e) => setIsSerialized(e.target.checked)}
              className="size-4 rounded text-[#1167c9]"
            />
            <span>تتبع بالرقم التسلسلي (Serialized)</span>
          </label>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            تنويه نظام التكاليف: لا يتم تعيين سعر تكلفة ثابت للأصناف، بل يتم احتساب التكلفة تلقائياً من واقع فواتير وإيصالات الشراء الفعلية.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            {item ? "حفظ التعديلات" : "إضافة الصنف"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
