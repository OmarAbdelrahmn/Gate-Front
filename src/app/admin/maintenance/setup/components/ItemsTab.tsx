"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PlusCircle, Edit2, Search, FileSpreadsheet, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TableHeaderColumnFilter, type FilterOption } from "@/components/ui/TableHeaderFilter";
import { exportToExcel } from "@/lib/export-excel";
import { ItemModal } from "./ItemModal";
import type { InventoryItem, VehicleType } from "@/lib/maintenance/types";
import { ItemType } from "@/lib/maintenance/types";
import {
  getItemTypeLabel,
  getUnitOfMeasureLabel,
  getItemTypeBadgeStyle,
  getVehicleTypeBadgeStyle,
  getVehicleTypeLabel,
  ALL_VEHICLE_TYPES,
  formatCompatibleVehicleTypes,
} from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ItemsTabProps {
  items: InventoryItem[];
  loading: boolean;
  onRefresh: () => void;
  onSearch: (q: string) => void;
  vehicleTypeFilter?: VehicleType | null;
  onVehicleTypeFilterChange?: (vt: VehicleType | null) => void;
}

export function ItemsTab({
  items,
  loading,
  onRefresh,
  onSearch,
  vehicleTypeFilter,
  onVehicleTypeFilterChange,
}: ItemsTabProps) {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const canCreate = can("inventory.items.create");
  const canUpdate = can("inventory.items.update");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>(() => {
    return vehicleTypeFilter !== undefined && vehicleTypeFilter !== null ? [String(vehicleTypeFilter)] : [];
  });

  useEffect(() => {
    if (vehicleTypeFilter !== undefined && vehicleTypeFilter !== null) {
      setSelectedVehicleTypes([String(vehicleTypeFilter)]);
    }
  }, [vehicleTypeFilter]);

  const counts = useMemo(() => ({
    all: items.length,
    spareParts: items.filter((i) => i.itemType === ItemType.SparePart).length,
    riderAccessories: items.filter((i) => i.itemType === ItemType.RiderAccessory).length,
    oils: items.filter((i) => i.itemType === ItemType.Oil).length,
    consumables: items.filter((i) => i.itemType === ItemType.Consumable).length,
  }), [items]);

  const itemTypeOptions: FilterOption[] = useMemo(() => {
    const types = [
      ItemType.SparePart,
      ItemType.RiderAccessory,
      ItemType.Oil,
      ItemType.Consumable,
    ];
    return types.map((t) => ({
      value: String(t),
      label: getItemTypeLabel(t, isEn),
      count: items.filter((i) => i.itemType === t).length,
    }));
  }, [items, isEn]);

  const vehicleTypeOptions: FilterOption[] = useMemo(() => {
    return [
      {
        value: "UNIVERSAL",
        label: isEn ? "All Vehicles (Universal)" : "كافة المركبات (شامل)",
        count: items.filter(
          (i) =>
            !i.compatibleVehicleTypes ||
            i.compatibleVehicleTypes.length === 0 ||
            i.compatibleVehicleTypes.length === 5,
        ).length,
      },
      ...ALL_VEHICLE_TYPES.map((vt) => {
        const count = items.filter((i) => {
          if (
            !i.compatibleVehicleTypes ||
            i.compatibleVehicleTypes.length === 0 ||
            i.compatibleVehicleTypes.length === 5
          ) {
            return true;
          }
          return i.compatibleVehicleTypes.includes(vt);
        }).length;
        return {
          value: String(vt),
          label: `${getVehicleTypeLabel(vt, isEn)} (${vt})`,
          count,
        };
      }),
    ];
  }, [items, isEn]);

  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filter by Item Type
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(String(item.itemType))) {
          return false;
        }
      }

      // 2. Filter by Vehicle Type Compatibility
      if (selectedVehicleTypes.length > 0) {
        const isUniversal =
          !item.compatibleVehicleTypes ||
          item.compatibleVehicleTypes.length === 0 ||
          item.compatibleVehicleTypes.length === 5;

        const matches = selectedVehicleTypes.some((selectedVt) => {
          if (selectedVt === "UNIVERSAL") {
            return isUniversal;
          }
          const vtNum = Number(selectedVt) as VehicleType;
          if (isUniversal) {
            return true;
          }
          return item.compatibleVehicleTypes?.includes(vtNum);
        });

        if (!matches) {
          return false;
        }
      }

      // 3. Client-side search matching
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          (item.nameAr && item.nameAr.toLowerCase().includes(q)) ||
          (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
          (item.barcode && item.barcode.toLowerCase().includes(q)) ||
          (item.sku && item.sku.toLowerCase().includes(q));
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedTypes, selectedVehicleTypes, searchQuery]);

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

  const handleExportExcel = async () => {
    if (displayedItems.length === 0) {
      alert(isEn ? "No items to export." : "لا توجد أصناف للتصدير.");
      return;
    }
    await exportToExcel({
      filename: `maintenance-items-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: isEn ? "Items Catalog" : "دليل الأصناف",
      columns: [
        { header: isEn ? "Barcode" : "الباركود", accessor: (i) => i.barcode || "-", isText: true, width: 20 },
        { header: isEn ? "Item Name (Ar)" : "اسم الصنف (عربي)", accessor: "nameAr", width: 28 },
        { header: isEn ? "Item Name (En)" : "اسم الصنف (إنجليزي)", accessor: (i) => i.nameEn || "-", width: 28 },
        {
          header: isEn ? "Item Type" : "نوع الصنف",
          accessor: (i) => getItemTypeLabel(i.itemType, isEn),
          width: 20,
        },
        {
          header: isEn ? "Compatible Vehicles" : "أنواع المركبات المتوافقة",
          accessor: (i) => formatCompatibleVehicleTypes(i.compatibleVehicleTypes, isEn),
          width: 24,
        },
        {
          header: isEn ? "Base UOM" : "وحدة الصرف",
          accessor: (i) => getUnitOfMeasureLabel(i.baseUnitOfMeasure, isEn),
          width: 16,
        },
        {
          header: isEn ? "Purchase UOM" : "وحدة الشراء",
          accessor: (i) => getUnitOfMeasureLabel(i.purchaseUnitOfMeasure, isEn),
          width: 16,
        },
        { header: isEn ? "Package Qty" : "سعة العبوة", accessor: "defaultPackageQuantity", width: 14 },
        { header: isEn ? "Min Stock" : "الحد الأدنى", accessor: "minimumStockLevel", width: 14 },
        { header: isEn ? "Reorder Qty" : "كمية إعادة الطلب", accessor: "reorderQuantity", width: 16 },
        { header: isEn ? "Serialized" : "تتبع بالرقم التسلسلي", accessor: (i) => (i.isSerialized ? (isEn ? "Yes" : "نعم") : (isEn ? "No" : "لا")), width: 18 },
        { header: isEn ? "Lot Tracked" : "تتبع برقم التشغيلة", accessor: (i) => (i.isLotTracked ? (isEn ? "Yes" : "نعم") : (isEn ? "No" : "لا")), width: 18 },
      ],
      data: displayedItems,
    });
  };

  const isFiltered = selectedTypes.length > 0 || selectedVehicleTypes.length > 0;

  const handleResetFilters = () => {
    setSelectedTypes([]);
    setSelectedVehicleTypes([]);
    if (onVehicleTypeFilterChange) {
      onVehicleTypeFilterChange(null);
    }
  };

  const filterTabs = [
    { id: "ALL" as const, label: isEn ? "All Items" : "كافة الأصناف", count: counts.all },
    { id: ItemType.SparePart, label: isEn ? "Spare Parts" : "قطع غيار", count: counts.spareParts, badgeClass: "text-blue-700 dark:text-blue-400" },
    { id: ItemType.RiderAccessory, label: isEn ? "Rider Items" : "مستلزمات المناديب", count: counts.riderAccessories, badgeClass: "text-purple-700 dark:text-purple-400" },
    { id: ItemType.Oil, label: isEn ? "Oils & Lubricants" : "زيوت ومواد تشحيم", count: counts.oils, badgeClass: "text-amber-700 dark:text-amber-400" },
    { id: ItemType.Consumable, label: isEn ? "Consumables" : "مستهلكات وورشة", count: counts.consumables, badgeClass: "text-emerald-700 dark:text-emerald-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEn ? "Items, Spare Parts & Oils Catalog" : "كتالوج الأصناف وقطع الغيار والزيوت"}
          </h2>
          <p className="text-xs text-slate-500">
            {isEn
              ? "Manage spare parts, oil barrels (208L), rider accessories, and workshop consumables."
              : "إدارة قطع الغيار، براميل الزيوت (208 لتر)، مستلزمات المناديب، ومستهلكات الورشة."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search
              size={15}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${isEn ? "left-3" : "right-3"}`}
            />
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={isEn ? "Search by item name or barcode..." : "بحث باسم الصنف أو الباركود..."}
              className={`text-xs ${isEn ? "pl-9" : "pr-9"}`}
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="text-xs shrink-0 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
          >
            <FileSpreadsheet size={15} />
            {isEn ? "Export Excel" : "تصدير إكسل"}
          </Button>
          {canCreate && (
            <Button variant="primary" onClick={handleCreate} className="text-xs shrink-0">
              <PlusCircle size={15} />
              {isEn ? "Add New Item" : "إضافة صنف جديد"}
            </Button>
          )}
        </div>
      </div>

      {/* Item Type Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => {
          const isActive =
            tab.id === "ALL"
              ? selectedTypes.length === 0
              : selectedTypes.length === 1 && selectedTypes[0] === String(tab.id);
          return (
            <button
              key={String(tab.id)}
              onClick={() => {
                if (tab.id === "ALL") {
                  setSelectedTypes([]);
                } else {
                  setSelectedTypes([String(tab.id)]);
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#1167c9] text-white shadow-xs"
                  : "bg-[var(--surface)] border border-[var(--border)] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}

        {isFiltered && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            <RotateCcw size={12} />
            <span>{isEn ? "Reset Filters" : "إعادة ضبط الفلاتر"}</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-start text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3 text-start">{isEn ? "Item Name" : "اسم الصنف"}</th>
              <th className="p-3 text-start">
                <div className="flex items-center gap-1.5">
                  <span>{isEn ? "Type" : "النوع"}</span>
                  <TableHeaderColumnFilter
                    label={isEn ? "Type" : "النوع"}
                    selectedValues={selectedTypes}
                    onChange={(val) => setSelectedTypes(val)}
                    options={itemTypeOptions}
                    placeholder={isEn ? "Filter by item type..." : "تصفية حسب نوع الصنف..."}
                  />
                </div>
              </th>
              <th className="p-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span>{isEn ? "Vehicle Compatibility" : "توافق المركبات"}</span>
                  <TableHeaderColumnFilter
                    label={isEn ? "Vehicle Compatibility" : "توافق المركبات"}
                    selectedValues={selectedVehicleTypes}
                    onChange={(val) => setSelectedVehicleTypes(val)}
                    options={vehicleTypeOptions}
                    placeholder={isEn ? "Filter by vehicle type..." : "تصفية حسب توافق المركبات..."}
                  />
                </div>
              </th>
              <th className="p-3 text-start">{isEn ? "Base UOM" : "وحدة الصرف"}</th>
              <th className="p-3 text-start">{isEn ? "Purchase UOM" : "وحدة الشراء"}</th>
              <th className="p-3 text-center">{isEn ? "Package Qty" : "سعة العبوة"}</th>
              <th className="p-3 text-center">{isEn ? "Min Stock" : "الحد الأدنى"}</th>
              <th className="p-3 text-center">{isEn ? "Reorder Qty" : "إعادة الطلب"}</th>
              {canUpdate && <th className="p-3 text-center">{isEn ? "Actions" : "الإجراءات"}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={canUpdate ? 9 : 8} className="p-8 text-center text-slate-400">
                  {isEn ? "Loading items..." : "جارٍ تحميل الأصناف..."}
                </td>
              </tr>
            ) : displayedItems.length === 0 ? (
              <tr>
                <td colSpan={canUpdate ? 9 : 8} className="p-8 text-center text-slate-400">
                  {isEn ? "No items matching the selected filters or search." : "لا توجد أصناف مطابقة للفلتر المحدد أو البحث."}
                </td>
              </tr>
            ) : (
              displayedItems.map((item) => {
                const badge = getItemTypeBadgeStyle(item.itemType, isEn);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      <div>{isEn ? (item.nameEn || item.nameAr) : (item.nameAr || item.nameEn)}</div>
                      {item.nameEn && item.nameAr && item.nameEn !== item.nameAr && (
                        <div className="text-[11px] text-slate-400 font-normal">
                          {isEn ? item.nameAr : item.nameEn}
                        </div>
                      )}
                      {item.barcode && (
                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                          {isEn ? `Barcode: ${item.barcode}` : `باركود: ${item.barcode}`}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {!item.compatibleVehicleTypes || item.compatibleVehicleTypes.length === 5 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {isEn ? "All Vehicles (5)" : "كافة المركبات (5)"}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 justify-center max-w-[150px] mx-auto">
                          {item.compatibleVehicleTypes.map((vt) => {
                            const b = getVehicleTypeBadgeStyle(vt, isEn);
                            return (
                              <span
                                key={vt}
                                className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold border ${b.bg} ${b.text} ${b.border}`}
                              >
                                {b.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {getUnitOfMeasureLabel(item.baseUnitOfMeasure, isEn)}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {getUnitOfMeasureLabel(item.purchaseUnitOfMeasure, isEn)}
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
                    {canUpdate && (
                      <td className="p-3 text-center">
                        <Button
                          variant="secondary"
                          onClick={() => handleEdit(item)}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Edit2 size={13} />
                          {isEn ? "Edit" : "تعديل"}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
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
