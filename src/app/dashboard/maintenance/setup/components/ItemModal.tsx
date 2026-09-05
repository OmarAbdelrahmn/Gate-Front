"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createInventoryItem, updateInventoryItem } from "@/lib/maintenance/api";
import type { InventoryItem } from "@/lib/maintenance/types";
import { ItemType, UnitOfMeasure } from "@/lib/maintenance/types";
import { itemTypeLabels, unitOfMeasureLabels } from "@/lib/maintenance/constants";
import { Sparkles, Info } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Sparkles size={16} />
              <span>هل تريد تعريف برميل زيت جديد؟</span>
            </div>
            <button
              type="button"
              onClick={applyOilBarrelPreset}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors"
            >
              تطبيق إعدادات برميل الزيت (208 لتر)
            </button>
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
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
              required
            >
              {Object.entries(itemTypeLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
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
            تنويه نظام التكاليف: لا يتم تعيين سعر تكلفة ثابت للأصناف، بل يتم احتساب التكلفة تلقائياً بنظام الوارد أولاً صادر أولاً (FIFO) من واقع فواتير وإيصالات الشراء الفعلية.
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
