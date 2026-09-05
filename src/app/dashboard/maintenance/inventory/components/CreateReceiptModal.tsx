"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createPurchaseReceipt } from "@/lib/maintenance/api";
import type {
  MaintenanceLocation,
  InventoryItem,
  Supplier,
  ReceiptLinePayload,
} from "@/lib/maintenance/types";
import { UnitOfMeasure, ItemType } from "@/lib/maintenance/types";
import { unitOfMeasureLabels, formatCurrency } from "@/lib/maintenance/constants";
import {
  Plus,
  Trash2,
  UploadCloud,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react";

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  locations: MaintenanceLocation[];
  suppliers: Supplier[];
  items: InventoryItem[];
}

export function CreateReceiptModal({
  isOpen,
  onClose,
  onSaved,
  locations,
  suppliers,
  items,
}: CreateReceiptModalProps) {
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [inventoryLocationId, setInventoryLocationId] = useState("");
  const [billFile, setBillFile] = useState<File | null>(null);

  // Receipt Lines
  const [lines, setLines] = useState<ReceiptLinePayload[]>([
    {
      inventoryItemId: "",
      purchaseUnit: UnitOfMeasure.Piece,
      packageCount: 1,
      declaredQuantityPerPackage: 1,
      grossWeightKg: null,
      netWeightKg: null,
      packageUnitPrice: 0,
      discountAmount: 0,
      taxAmount: 0,
      lotNumber: "",
      expiryDate: null,
    },
  ]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        inventoryItemId: "",
        purchaseUnit: UnitOfMeasure.Piece,
        packageCount: 1,
        declaredQuantityPerPackage: 1,
        grossWeightKg: null,
        netWeightKg: null,
        packageUnitPrice: 0,
        discountAmount: 0,
        taxAmount: 0,
        lotNumber: "",
        expiryDate: null,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, updates: Partial<ReceiptLinePayload>) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = items.find((i) => i.id === itemId);
    if (selectedItem) {
      const isOil = selectedItem.itemType === ItemType.Oil;
      updateLine(index, {
        inventoryItemId: itemId,
        purchaseUnit: selectedItem.purchaseUnitOfMeasure || (isOil ? UnitOfMeasure.Barrel : UnitOfMeasure.Piece),
        declaredQuantityPerPackage: selectedItem.defaultPackageQuantity || (isOil ? 208 : 1),
        packageCount: 1,
        grossWeightKg: isOil ? 210 : null,
        netWeightKg: isOil ? 208 : null,
      });
    } else {
      updateLine(index, { inventoryItemId: itemId });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("حجم الملف يتجاوز 10 ميجابايت.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
    ];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert("صيغة الملف غير مدعومة. الصيغ المقبولة: PDF أو صور (PNG, JPG, WebP, GIF, BMP).");
      return;
    }

    setBillFile(file);
  };

  // Totals calculations
  const subtotal = lines.reduce(
    (sum, l) => sum + (l.packageCount || 0) * (l.packageUnitPrice || 0),
    0,
  );
  const totalDiscount = lines.reduce((sum, l) => sum + (l.discountAmount || 0), 0);
  const totalTax = lines.reduce((sum, l) => sum + (l.taxAmount || 0), 0);
  const totalAmount = subtotal - totalDiscount + totalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!billFile) {
      alert("يرجى إرفاق ملف الفاتورة الأصلي (مطلوب وإلزامي).");
      return;
    }

    if (!supplierId) {
      alert("يرجى اختيار المورد.");
      return;
    }

    if (!inventoryLocationId) {
      alert("يرجى اختيار موقع الاستلام والمخزن.");
      return;
    }

    // Validate lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.inventoryItemId) {
        alert(`يرجى تحديد الصنف في السطر رقم ${i + 1}.`);
        return;
      }
      if (!line.packageCount || line.packageCount <= 0 || !Number.isInteger(line.packageCount)) {
        alert(`عدد الطرود في السطر رقم ${i + 1} يجب أن يكون عدداً صحيحاً وموجباً.`);
        return;
      }

      const item = items.find((itm) => itm.id === line.inventoryItemId);
      if (item?.itemType === ItemType.Oil) {
        // Oil barrel validation
        if (!line.grossWeightKg || line.grossWeightKg <= 0) {
          alert(`الوزن الإجمالي لبراميل الزيت في السطر ${i + 1} مطلوب وقيمة موجبة.`);
          return;
        }
        if (!line.netWeightKg || line.netWeightKg <= 0) {
          alert(`الوزن الصافي لبراميل الزيت في السطر ${i + 1} مطلوب وقيمة موجبة.`);
          return;
        }
        if (line.netWeightKg > line.grossWeightKg) {
          alert(`الوزن الصافي لا يمكن أن يتجاوز الوزن الإجمالي في السطر ${i + 1}.`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const receiptJson = {
        supplierId,
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        invoiceDate,
        receivedAtUtc: new Date().toISOString(),
        inventoryLocationId,
        currencyCode: "SAR",
        lines: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          purchaseUnit: Number(l.purchaseUnit),
          packageCount: Number(l.packageCount),
          declaredQuantityPerPackage: Number(l.declaredQuantityPerPackage),
          grossWeightKg: l.grossWeightKg ? Number(l.grossWeightKg) : null,
          netWeightKg: l.netWeightKg ? Number(l.netWeightKg) : null,
          packageUnitPrice: Number(l.packageUnitPrice),
          discountAmount: Number(l.discountAmount || 0),
          taxAmount: Number(l.taxAmount || 0),
          lotNumber: l.lotNumber?.trim() || null,
          expiryDate: l.expiryDate || null,
        })),
      };

      await createPurchaseReceipt(receiptJson, billFile);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Only inventory-enabled locations can receive stock
  const receivingLocations = locations.filter((l) => l.inventoryEnabled);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل إيصال استلام مشتريات (مع الفاتورة الإلزامية)"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-[var(--border)]">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              المورد <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={supplierId}
              onChange={(val) => setSupplierId(val)}
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.legalNameAr,
                sublabel: s.supplierNumber,
              }))}
              placeholder="اختر المورد..."
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رقم فاتورة المورد <span className="text-red-500">*</span>
            </label>
            <Input
              value={supplierInvoiceNumber}
              onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
              placeholder="مثال: INV-2026-99"
              required
              className="text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              تاريخ الفاتورة <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              مستودع الاستلام <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={inventoryLocationId}
              onChange={(val) => setInventoryLocationId(val)}
              options={receivingLocations.map((l) => ({
                value: l.id,
                label: `${l.nameAr} (${l.code})`,
              }))}
              placeholder="اختر موقع المستودع..."
              required
            />
          </div>
        </div>

        {/* Mandatory Bill File Attachment */}
        <div className="p-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 text-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#1167c9] text-white">
                <UploadCloud size={20} />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  ملف الفاتورة الأصلية (إلزامي) <span className="text-red-500">*</span>
                </span>
                <span className="text-slate-500 text-[11px]">
                  صيغ مسموحة: PDF, PNG, JPG, WebP, GIF, BMP بحجم أقصى 10 ميجابايت.
                </span>
              </div>
            </div>

            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-[var(--border)] rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs">
                <span>{billFile ? "تغيير الملف المحدد" : "اختر ملف الفاتورة..."}</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {billFile && (
            <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <FileText size={15} />
                <span className="font-bold">{billFile.name}</span>
                <span className="text-[11px] opacity-75">
                  ({(billFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBillFile(null)}
                className="text-red-600 hover:underline font-bold"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>

        {/* Lines Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              بنود وأصناف الإيصال (كل عبوة زيت تُنشئ برميلاً مستقلاً بنظام FIFO)
            </h3>
            <Button
              type="button"
              variant="secondary"
              onClick={addLine}
              className="h-8 text-xs px-2.5"
            >
              <Plus size={14} />
              إضافة سطر
            </Button>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {lines.map((line, idx) => {
              const selectedItem = items.find((i) => i.id === line.inventoryItemId);
              const isOil = selectedItem?.itemType === ItemType.Oil;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      بند #{idx + 1}
                      {isOil && (
                        <span className="mr-2 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                          برميل زيت (أوزان مطلوبة)
                        </span>
                      )}
                    </span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md"
                        title="حذف البند"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        الصنف <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        value={line.inventoryItemId}
                        onChange={(val) => handleItemSelect(idx, val)}
                        options={items.map((i) => ({
                          value: i.id,
                          label: `${i.nameAr} (${i.sku})`,
                          sublabel: isOil ? "برميل زيت" : undefined,
                        }))}
                        placeholder="اختر الصنف..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        عدد الطرود / البراميل <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={line.packageCount}
                        onChange={(e) =>
                          updateLine(idx, { packageCount: parseInt(e.target.value) || 1 })
                        }
                        required
                        className="text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        سعر الطرد قبل الضريبة (ر.س) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.packageUnitPrice}
                        onChange={(e) =>
                          updateLine(idx, {
                            packageUnitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        سعة الطرد (لتر/حبة)
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={line.declaredQuantityPerPackage}
                        onChange={(e) =>
                          updateLine(idx, {
                            declaredQuantityPerPackage: parseFloat(e.target.value) || 1,
                          })
                        }
                        className="text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        الضريبة المضافة (VAT)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.taxAmount}
                        onChange={(e) =>
                          updateLine(idx, { taxAmount: parseFloat(e.target.value) || 0 })
                        }
                        className="text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        رقم التشغيلة (Lot No.)
                      </label>
                      <Input
                        value={line.lotNumber || ""}
                        onChange={(e) => updateLine(idx, { lotNumber: e.target.value })}
                        placeholder="LOT-1234"
                        className="text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        تاريخ الانتهاء
                      </label>
                      <Input
                        type="date"
                        value={line.expiryDate || ""}
                        onChange={(e) => updateLine(idx, { expiryDate: e.target.value || null })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Oil-specific weight inputs */}
                  {isOil && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                          الوزن الإجمالي القائم (Gross Kg) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={line.grossWeightKg || ""}
                          onChange={(e) =>
                            updateLine(idx, {
                              grossWeightKg: parseFloat(e.target.value) || null,
                            })
                          }
                          placeholder="مثال: 210 كجم"
                          required
                          className="text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                          الوزن الصافي للزيت (Net Kg) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={line.netWeightKg || ""}
                          onChange={(e) =>
                            updateLine(idx, {
                              netWeightKg: parseFloat(e.target.value) || null,
                            })
                          }
                          placeholder="مثال: 208 كجم (يجب ألا يتجاوز القائم)"
                          required
                          className="text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 block">إجمالي الفاتورة:</span>
            <span className="text-base font-black text-[#1167c9] dark:text-blue-400 font-mono">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
            <span>المجموع قبل الضريبة: {formatCurrency(subtotal)}</span>
            <span>إجمالي الضريبة: {formatCurrency(totalTax)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            تسجيل الإيصال وحفظ المشتريات
          </Button>
        </div>
      </form>
    </Modal>
  );
}
