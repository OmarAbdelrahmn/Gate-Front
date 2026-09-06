"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { getStockBalances, getCostLayers } from "@/lib/maintenance/api";
import type {
  StockBalance,
  CostLayer,
  MaintenanceLocation,
  InventoryItem,
} from "@/lib/maintenance/types";
import { ItemType } from "@/lib/maintenance/types";
import {
  unitOfMeasureLabels,
  formatCurrency,
  formatDateTime,
  itemTypeLabels,
  itemTypeBadgeStyles,
} from "@/lib/maintenance/constants";

interface BalancesAndFifoViewProps {
  locations: MaintenanceLocation[];
  items: InventoryItem[];
}

export function BalancesAndFifoView({ locations, items }: BalancesAndFifoViewProps) {
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItemType, setSelectedItemType] = useState("");

  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [layersLoading, setLayersLoading] = useState(false);
  const [costLayers, setCostLayers] = useState<Record<string, CostLayer[]>>({});

  const loadBalances = async () => {
    setLoading(true);
    try {
      const data = await getStockBalances({
        inventoryLocationId: selectedLocationId || undefined,
        inventoryItemId: selectedItemId || undefined,
      });
      setBalances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [selectedLocationId, selectedItemId]);

  const toggleExpand = async (item: StockBalance) => {
    const key = `${item.inventoryLocationId}-${item.inventoryItemId}`;
    if (expandedItemId === key) {
      setExpandedItemId(null);
      return;
    }

    setExpandedItemId(key);
    if (!costLayers[key]) {
      setLayersLoading(true);
      try {
        const layers = await getCostLayers({
          inventoryLocationId: item.inventoryLocationId,
          inventoryItemId: item.inventoryItemId,
        });
        setCostLayers((prev) => ({ ...prev, [key]: layers }));
      } catch (err) {
        console.error(err);
      } finally {
        setLayersLoading(false);
      }
    }
  };

  const selectableItems = selectedItemType
    ? items.filter((i) => String(i.itemType) === selectedItemType)
    : items;

  const filteredBalances = balances.filter((b) => {
    if (!selectedItemType) return true;
    const itm = items.find((i) => i.id === b.inventoryItemId);
    return itm ? String(itm.itemType) === selectedItemType : true;
  });

  const totalInventoryValue = filteredBalances.reduce(
    (sum, b) => sum + (b.inventoryValue || 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Filters & Total Metric */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <select
              value={selectedItemType}
              onChange={(e) => {
                const newType = e.target.value;
                setSelectedItemType(newType);
                if (newType && selectedItemId) {
                  const currentItem = items.find((i) => i.id === selectedItemId);
                  if (currentItem && String(currentItem.itemType) !== newType) {
                    setSelectedItemId("");
                  }
                }
              }}
              className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="">جميع أنواع الأصناف (الكل)</option>
              <option value={String(ItemType.SparePart)}>قطع غيار (1)</option>
              <option value={String(ItemType.RiderAccessory)}>مستلزمات المناديب (2)</option>
              <option value={String(ItemType.Oil)}>زيوت ومواد تشحيم (3)</option>
              <option value={String(ItemType.Consumable)}>مستهلكات وورشة (4)</option>
            </select>
          </div>
          <div className="w-52">
            <SearchableSelect
              value={selectedLocationId}
              onChange={(val) => setSelectedLocationId(val)}
              options={[
                { value: "", label: "جميع المستودعات والمواقع" },
                ...locations.map((l) => ({
                  value: l.id,
                  label: `${l.nameAr} (${l.code})`,
                })),
              ]}
              placeholder="فلترة بالموقع..."
            />
          </div>
          <div className="w-64">
            <SearchableSelect
              value={selectedItemId}
              onChange={(val) => setSelectedItemId(val)}
              options={[
                { value: "", label: "جميع الأصناف المقابلة" },
                ...selectableItems.map((i) => ({
                  value: i.id,
                  label: `${i.nameAr} (${i.sku})`,
                  sublabel: `${itemTypeLabels[i.itemType] || ""} • SKU: ${i.sku}`,
                  keywords: `${itemTypeLabels[i.itemType] || ""} ${i.sku}`,
                })),
              ]}
              placeholder="فلترة بالصنف..."
            />
          </div>
          <Button
            variant="secondary"
            onClick={loadBalances}
            loading={loading}
            className="h-10 text-xs shrink-0"
          >
            <RefreshCw size={14} />
            تحديث
          </Button>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40">
          <div className="text-right">
            <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold block">
              إجمالي القيمة التقديرية للمخزون
            </span>
            <span className="text-base font-black text-slate-900 dark:text-white font-mono">
              {formatCurrency(totalInventoryValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Balances Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رمز الصنف</th>
              <th className="p-3">اسم الصنف</th>
              <th className="p-3">الموقع / المستودع</th>
              <th className="p-3 text-center">الرصيد المتاح (On Hand)</th>
              <th className="p-3 text-center">المحجوز</th>
              <th className="p-3 text-left">متوسط التكلفة التقريبي</th>
              <th className="p-3 text-left">إجمالي القيمة</th>
              <th className="p-3 text-center">طبقات التكلفة FIFO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  جارٍ تحميل أرصدة المخزون...
                </td>
              </tr>
            ) : filteredBalances.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  لا توجد أرصدة مطابقة للفلتر المحدد.
                </td>
              </tr>
            ) : (
              filteredBalances.map((bal) => {
                const key = `${bal.inventoryLocationId}-${bal.inventoryItemId}`;
                const isExpanded = expandedItemId === key;
                const layers = costLayers[key] || [];
                const itm = items.find((i) => i.id === bal.inventoryItemId);
                const badge = itm ? itemTypeBadgeStyles[itm.itemType] : null;

                return (
                  <React.Fragment key={bal.id}>
                    <tr
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                        isExpanded ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {bal.sku}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{bal.itemNameAr}</span>
                          {badge && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {bal.locationNameAr}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-sm text-[#1167c9] dark:text-blue-400">
                        {bal.quantityOnHand.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-500">
                        {bal.quantityReserved.toLocaleString()}
                      </td>
                      <td className="p-3 text-left font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(bal.reportingAverageUnitCost)}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(bal.inventoryValue)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="secondary"
                          onClick={() => toggleExpand(bal)}
                          className="h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
                        >
                          <Layers size={13} className="text-[#1167c9]" />
                          <span>طبقات FIFO</span>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </Button>
                      </td>
                    </tr>

                    {/* Collapsible FIFO Cost Layers */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                        <td colSpan={8} className="p-4">
                          <div className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 p-4 bg-white dark:bg-slate-900 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                                <Layers size={15} />
                                طبقات تكلفة الوارد أولاً (FIFO Cost Layers) للصنف: {bal.itemNameAr}
                              </h4>
                              <span className="text-[11px] text-slate-500">
                                يتم الصرف آلياً بالكامل من الطبقة الأقدم حتى نفادها قبل الانتقال للطبقة التالية.
                              </span>
                            </div>

                            {layersLoading && !layers.length ? (
                              <div className="py-4 text-center text-xs text-slate-400">
                                جارٍ استرجاع طبقات التكلفة...
                              </div>
                            ) : layers.length === 0 ? (
                              <div className="py-4 text-center text-xs text-slate-400">
                                لا توجد طبقات تكلفة نشطة ومتاحة لهذا الصنف في هذا الموقع.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-right text-[11px]">
                                  <thead className="border-b border-[var(--border)] bg-slate-100/70 dark:bg-slate-800 text-slate-600 font-bold">
                                    <tr>
                                      <th className="p-2">أسبقية FIFO</th>
                                      <th className="p-2">تاريخ الاستلام</th>
                                      <th className="p-2 text-center">الكمية الأصلية</th>
                                      <th className="p-2 text-center font-bold text-blue-600">الكمية المتبقية</th>
                                      <th className="p-2 text-left font-mono">تكلفة الوحدة (SAR)</th>
                                      <th className="p-2 text-left font-mono">القيمة المتبقية</th>
                                      <th className="p-2">رقم التشغيلة (Lot)</th>
                                      <th className="p-2">تاريخ الصلاحية</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {layers.map((layer, lIdx) => (
                                      <tr key={layer.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                        <td className="p-2 font-bold text-slate-700 dark:text-slate-300">
                                          {lIdx === 0 ? (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                              الطبقة الأقدم (تُصرف أولاً)
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 font-mono">
                                              #{layer.originalSequence || lIdx + 1}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2 font-mono text-slate-600 dark:text-slate-400">
                                          {formatDateTime(layer.receivedAtUtc)}
                                        </td>
                                        <td className="p-2 text-center font-mono text-slate-500">
                                          {layer.originalQuantity} {unitOfMeasureLabels[layer.baseUnitOfMeasure] || ""}
                                        </td>
                                        <td className="p-2 text-center font-mono font-black text-blue-600 dark:text-blue-400">
                                          {layer.remainingQuantity} {unitOfMeasureLabels[layer.baseUnitOfMeasure] || ""}
                                        </td>
                                        <td className="p-2 text-left font-mono font-bold text-slate-800 dark:text-slate-200">
                                          {formatCurrency(layer.unitCost)}
                                        </td>
                                        <td className="p-2 text-left font-mono font-bold text-slate-900 dark:text-white">
                                          {formatCurrency(layer.remainingValue)}
                                        </td>
                                        <td className="p-2 font-mono text-slate-600 dark:text-slate-400">
                                          {layer.lotNumber || "-"}
                                        </td>
                                        <td className="p-2 text-slate-600 dark:text-slate-400">
                                          {layer.expiryDate || "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
