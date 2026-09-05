"use client";

import React, { useState } from "react";
import { PlusCircle, Edit2, Search, Package, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ItemModal } from "./ItemModal";
import type { InventoryItem } from "@/lib/maintenance/types";
import { itemTypeLabels, unitOfMeasureLabels } from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ItemsTabProps {
  items: InventoryItem[];
  loading: boolean;
  onRefresh: () => void;
  onSearch: (q: string) => void;
}

export function ItemsTab({ items, loading, onRefresh, onSearch }: ItemsTabProps) {
  const { can } = useAuth();
  const canManage = can("inventory.items.manage");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setModalOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearch(val);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            كتالوج الأصناف وقطع الغيار والزيوت
          </h2>
          <p className="text-xs text-slate-500">
            إدارة قطع الغيار، براميل الزيوت (208 لتر)، مستلزمات المناديب، ومستهلكات الورشة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="بحث بالرمز (SKU) أو الاسم..."
              className="pr-9 text-xs"
            />
          </div>
          {canManage && (
            <Button variant="primary" onClick={handleCreate} className="text-xs shrink-0">
              <PlusCircle size={15} />
              إضافة صنف جديد
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رمز الصنف (SKU)</th>
              <th className="p-3">اسم الصنف</th>
              <th className="p-3">النوع</th>
              <th className="p-3">وحدة الصرف</th>
              <th className="p-3">وحدة الشراء</th>
              <th className="p-3 text-center">سعة العبوة</th>
              <th className="p-3 text-center">الحد الأدنى</th>
              <th className="p-3 text-center">إعادة الطلب</th>
              {canManage && <th className="p-3 text-center">الإجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  جارٍ تحميل الأصناف...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  لا توجد أصناف مطابقة للبحث.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {item.sku}
                    </span>
                    {item.barcode && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.barcode}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div>{item.nameAr}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{item.nameEn}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.itemType === 3
                          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {itemTypeLabels[item.itemType] || item.itemType}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {unitOfMeasureLabels[item.baseUnitOfMeasure] || item.baseUnitOfMeasure}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {unitOfMeasureLabels[item.purchaseUnitOfMeasure] || item.purchaseUnitOfMeasure}
                  </td>
                  <td className="p-3 text-center font-mono font-bold">
                    {item.defaultPackageQuantity}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                    {item.minimumStockLevel}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                    {item.reorderQuantity}
                  </td>
                  {canManage && (
                    <td className="p-3 text-center">
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(item)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <Edit2 size={13} />
                        تعديل
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
        item={selectedItem}
      />
    </div>
  );
}
