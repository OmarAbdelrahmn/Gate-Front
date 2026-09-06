"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  RotateCcw,
  UserCheck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  createTransfer,
  createSupplierReturn,
  createRiderIssue,
  getCostLayers,
} from "@/lib/maintenance/api";
import { listRiders } from "@/lib/workforce/api";
import type {
  MaintenanceLocation,
  InventoryItem,
  Supplier,
  CostLayer,
} from "@/lib/maintenance/types";
import { ItemType } from "@/lib/maintenance/types";
import { itemTypeLabels } from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface TransfersAndReturnsViewProps {
  locations: MaintenanceLocation[];
  items: InventoryItem[];
  suppliers: Supplier[];
}

export function TransfersAndReturnsView({
  locations,
  items,
  suppliers,
}: TransfersAndReturnsViewProps) {
  const { can } = useAuth();
  const canMove = can("inventory.stock.move");
  const canReturn = can("inventory.returns.manage");

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<"transfer" | "return" | "rider">("transfer");
  const [loading, setLoading] = useState(false);

  // Riders
  const [riders, setRiders] = useState<{ id: string; nameAr: string; nationalId?: string }[]>([]);

  useEffect(() => {
    listRiders()
      .then((res: any) => {
        if (Array.isArray(res)) {
          setRiders(
            res.map((r) => ({
              id: r.id || r.riderProfileId,
              nameAr: r.fullNameAr || r.riderNameAr || r.nameAr || "مندوب",
              nationalId: r.nationalId,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  // Transfer state
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferLines, setTransferLines] = useState<
    { inventoryItemId: string; quantity: number }[]
  >([{ inventoryItemId: "", quantity: 1 }]);

  // Supplier Return state
  const [returnSupplierId, setReturnSupplierId] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [availableLayers, setAvailableLayers] = useState<CostLayer[]>([]);
  const [returnLines, setReturnLines] = useState<
    { inventoryItemId: string; stockCostLayerId: string; quantity: number; reason: string }[]
  >([{ inventoryItemId: "", stockCostLayerId: "", quantity: 1, reason: "Defect" }]);

  // Rider Issue state
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [issueLocationId, setIssueLocationId] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [issueLines, setIssueLines] = useState<
    { inventoryItemId: string; quantity: number; expectedReturn: boolean }[]
  >([{ inventoryItemId: "", quantity: 1, expectedReturn: false }]);
  const [onlyRiderAccessories, setOnlyRiderAccessories] = useState(true);

  // Rider assignable items (ItemType.RiderAccessory === 2)
  const riderAccessories = items.filter((i) => i.itemType === ItemType.RiderAccessory);
  const displayedRiderItems =
    onlyRiderAccessories && riderAccessories.length > 0 ? riderAccessories : items;

  // Inventory-enabled locations
  const invLocations = locations.filter((l) => l.inventoryEnabled);

  // Handle Transfer Submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceLocationId || !destinationLocationId) {
      alert("يرجى اختيار موقع المصدر وموقع الوجهة.");
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      alert("موقع المصدر وموقع الوجهة يجب أن يكونا مختلفين.");
      return;
    }

    // Check oil whole barrels
    for (const line of transferLines) {
      const item = items.find((i) => i.id === line.inventoryItemId);
      if (item?.itemType === ItemType.Oil) {
        if (!Number.isInteger(line.quantity)) {
          alert("نقل الزيوت مقتصر فعلياً على البراميل الكاملة والمختومة كأعداد صحيحة.");
          return;
        }
      }
    }

    setLoading(true);
    try {
      await createTransfer({
        sourceLocationId,
        destinationLocationId,
        postedAtUtc: new Date().toISOString(),
        reason: transferReason.trim() || "نقل مخزون تشغيلي",
        lines: transferLines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          quantity: Number(l.quantity),
        })),
      });
      alert("تم تنفيذ نقل المخزون بنجاح.");
      setTransferReason("");
      setTransferLines([{ inventoryItemId: "", quantity: 1 }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Supplier Return Submit
  const handleSupplierReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSupplierId || !returnLocationId) {
      alert("يرجى اختيار المورد والموقع.");
      return;
    }

    setLoading(true);
    try {
      await createSupplierReturn({
        supplierId: returnSupplierId,
        inventoryLocationId: returnLocationId,
        purchaseReceiptId: null,
        returnedAtUtc: new Date().toISOString(),
        reason: returnReason.trim() || "إرجاع للمورد",
        lines: returnLines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          stockCostLayerId: l.stockCostLayerId,
          quantity: Number(l.quantity),
          reason: l.reason.trim() || "Damaged",
        })),
      });
      alert("تم تسجيل مرتجع المورد بنجاح.");
      setReturnReason("");
      setReturnLines([
        { inventoryItemId: "", stockCostLayerId: "", quantity: 1, reason: "Defect" },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Rider Issue Submit
  const handleRiderIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRiderId || !issueLocationId) {
      alert("يرجى اختيار المندوب وموقع الصرف.");
      return;
    }

    setLoading(true);
    try {
      await createRiderIssue({
        riderProfileId: selectedRiderId,
        inventoryLocationId: issueLocationId,
        issuedAtUtc: new Date().toISOString(),
        notes: issueNotes.trim() || null,
        lines: issueLines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          quantity: Number(l.quantity),
          expectedReturn: l.expectedReturn,
        })),
      });
      alert("تم صرف المستلزمات للمندوب بنجاح.");
      setIssueNotes("");
      setIssueLines([{ inventoryItemId: "", quantity: 1, expectedReturn: false }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("transfer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeSubTab === "transfer"
              ? "bg-[#1167c9] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <ArrowLeftRight size={14} />
          <span>نقل المخزون بين المواقع</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("return")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeSubTab === "return"
              ? "bg-[#1167c9] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <RotateCcw size={14} />
          <span>مرتجع إلى المورد</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("rider")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeSubTab === "rider"
              ? "bg-[#1167c9] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <UserCheck size={14} />
          <span>صرف عهد ومستلزمات للمندوب</span>
        </button>
      </div>

      {/* Transfer Form */}
      {activeSubTab === "transfer" && (
        <form onSubmit={handleTransferSubmit} className="space-y-4 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight size={16} className="text-[#1167c9]" />
                طلب تحويل مخزون (مثال: من مستودع جدة إلى ورشة الرياض)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ملاحظة نظام الزيوت: نقل الزيوت مقيد فيزيائياً بالبراميل الكاملة والمختومة فقط (يمنع نقل البراميل المفتوحة جزئياً).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                مستودع المصدر (من) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={sourceLocationId}
                onChange={(val) => setSourceLocationId(val)}
                options={invLocations.map((l) => ({
                  value: l.id,
                  label: `${l.nameAr} (${l.code})`,
                }))}
                placeholder="اختر موقع المصدر..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                مستودع الوجهة (إلى) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={destinationLocationId}
                onChange={(val) => setDestinationLocationId(val)}
                options={invLocations
                  .filter((l) => l.id !== sourceLocationId)
                  .map((l) => ({
                    value: l.id,
                    label: `${l.nameAr} (${l.code})`,
                  }))}
                placeholder="اختر موقع الوجهة..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              سبب التحويل
            </label>
            <Input
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="مثال: تعزيز رصيد ورشة الرياض من قطع الغيار"
              className="text-xs"
            />
          </div>

          {/* Transfer Lines */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                الأصناف المراد نقلها
              </h4>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setTransferLines((prev) => [...prev, { inventoryItemId: "", quantity: 1 }])
                }
                className="h-8 text-xs px-2.5"
              >
                <Plus size={13} />
                إضافة سطر
              </Button>
            </div>

            {transferLines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex-1">
                  <SearchableSelect
                    value={line.inventoryItemId}
                    onChange={(val) => {
                      const copy = [...transferLines];
                      copy[idx].inventoryItemId = val;
                      setTransferLines(copy);
                    }}
                    options={items.map((i) => ({
                      value: i.id,
                      label: `${i.nameAr} (${i.sku})`,
                      sublabel: `${itemTypeLabels[i.itemType] || ""} • SKU: ${i.sku}`,
                      keywords: `${itemTypeLabels[i.itemType] || ""} ${i.sku} ${i.nameEn || ""}`,
                    }))}
                    placeholder="اختر الصنف..."
                    required
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => {
                      const copy = [...transferLines];
                      copy[idx].quantity = parseFloat(e.target.value) || 1;
                      setTransferLines(copy);
                    }}
                    placeholder="الكمية"
                    required
                    className="text-xs font-mono"
                  />
                </div>
                {transferLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setTransferLines((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex justify-end">
            <Button variant="primary" type="submit" loading={loading} disabled={!canMove} className="text-xs">
              تأكيد ونقل المخزون
            </Button>
          </div>
        </form>
      )}

      {/* Supplier Return Form */}
      {activeSubTab === "return" && (
        <form onSubmit={handleSupplierReturnSubmit} className="space-y-4 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="border-b border-[var(--border)] pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw size={16} className="text-amber-500" />
              إرجاع بضاعة تالفة أو غير مطابقة إلى المورد
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ربط المرتجع بطبقات تكلفة الوارد أولاً لضمان دقة الحسابات المالية.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المورد <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={returnSupplierId}
                onChange={(val) => setReturnSupplierId(val)}
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: s.legalNameAr,
                }))}
                placeholder="اختر المورد..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المستودع المصدر للمرتجع <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={returnLocationId}
                onChange={(val) => setReturnLocationId(val)}
                options={invLocations.map((l) => ({
                  value: l.id,
                  label: `${l.nameAr} (${l.code})`,
                }))}
                placeholder="اختر الموقع..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              سبب الإرجاع العام
            </label>
            <Input
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="مثال: عيب مصنعي / تلف أثناء الشحن"
              className="text-xs"
            />
          </div>

          {/* Return Lines */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                الأصناف المرتجعة
              </h4>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setReturnLines((prev) => [
                    ...prev,
                    {
                      inventoryItemId: "",
                      stockCostLayerId: "",
                      quantity: 1,
                      reason: "Defect",
                    },
                  ])
                }
                className="h-8 text-xs px-2.5"
              >
                <Plus size={13} />
                إضافة سطر
              </Button>
            </div>

            {returnLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
                <div className="sm:col-span-2">
                  <SearchableSelect
                    value={line.inventoryItemId}
                    onChange={(val) => {
                      const copy = [...returnLines];
                      copy[idx].inventoryItemId = val;
                      setReturnLines(copy);
                    }}
                    options={items.map((i) => ({
                      value: i.id,
                      label: `${i.nameAr} (${i.sku})`,
                      sublabel: `${itemTypeLabels[i.itemType] || ""} • SKU: ${i.sku}`,
                      keywords: `${itemTypeLabels[i.itemType] || ""} ${i.sku} ${i.nameEn || ""}`,
                    }))}
                    placeholder="اختر الصنف..."
                    required
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => {
                      const copy = [...returnLines];
                      copy[idx].quantity = parseFloat(e.target.value) || 1;
                      setReturnLines(copy);
                    }}
                    placeholder="الكمية"
                    required
                    className="text-xs font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={line.reason}
                    onChange={(e) => {
                      const copy = [...returnLines];
                      copy[idx].reason = e.target.value;
                      setReturnLines(copy);
                    }}
                    placeholder="سبب الإرجاع"
                    className="text-xs"
                  />
                  {returnLines.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setReturnLines((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex justify-end">
            <Button variant="primary" type="submit" loading={loading} disabled={!canReturn} className="text-xs">
              تأكيد مرتجع المورد
            </Button>
          </div>
        </form>
      )}

      {/* Rider Issue Form */}
      {activeSubTab === "rider" && (
        <form onSubmit={handleRiderIssueSubmit} className="space-y-4 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="border-b border-[var(--border)] pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck size={16} className="text-purple-600" />
              صرف عهد ومستلزمات لمندوب (Rider Accessory / Equipment)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              صرف خوذات، حقائب توصيل، حامل جوال، وسترات أمان وتوثيقها على ملف المندوب.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المندوب المستلم <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={selectedRiderId}
                onChange={(val) => setSelectedRiderId(val)}
                options={riders.map((r) => ({
                  value: r.id,
                  label: r.nameAr,
                  sublabel: r.nationalId,
                }))}
                placeholder="اختر المندوب..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المستودع الصادر منه <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={issueLocationId}
                onChange={(val) => setIssueLocationId(val)}
                options={invLocations.map((l) => ({
                  value: l.id,
                  label: `${l.nameAr} (${l.code})`,
                }))}
                placeholder="اختر موقع المستودع..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات الصرف
            </label>
            <Input
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              placeholder="تسليم عهدة تشغيلية عند بدء العمل..."
              className="text-xs"
            />
          </div>

          {/* Issue Lines */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  المستلزمات والعهد المصروفة
                </h4>
                <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setOnlyRiderAccessories(true)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      onlyRiderAccessories
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    مستلزمات المناديب فقط ({riderAccessories.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnlyRiderAccessories(false)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      !onlyRiderAccessories
                        ? "bg-[#1167c9] text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    كافة الأصناف ({items.length})
                  </button>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setIssueLines((prev) => [
                    ...prev,
                    { inventoryItemId: "", quantity: 1, expectedReturn: false },
                  ])
                }
                className="h-8 text-xs px-2.5 shrink-0"
              >
                <Plus size={13} />
                إضافة صنف
              </Button>
            </div>

            {onlyRiderAccessories && riderAccessories.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>لم يتم العثور على أصناف مصنفة كـ &quot;مستلزمات ومعدات المندوب&quot; (ItemType = 2) حالياً.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOnlyRiderAccessories(false)}
                  className="font-bold underline text-[11px] shrink-0 cursor-pointer"
                >
                  عرض كافة الأصناف
                </button>
              </div>
            )}

            {issueLines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex-1">
                  <SearchableSelect
                    value={line.inventoryItemId}
                    onChange={(val) => {
                      const copy = [...issueLines];
                      copy[idx].inventoryItemId = val;
                      setIssueLines(copy);
                    }}
                    options={displayedRiderItems.map((i) => ({
                      value: i.id,
                      label: `${i.nameAr} (${i.sku})`,
                      sublabel: `${itemTypeLabels[i.itemType] || ""} • SKU: ${i.sku}`,
                      keywords: `${itemTypeLabels[i.itemType] || ""} ${i.sku} ${i.nameEn || ""}`,
                    }))}
                    placeholder="اختر الصنف/المستلزم..."
                    required
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => {
                      const copy = [...issueLines];
                      copy[idx].quantity = parseFloat(e.target.value) || 1;
                      setIssueLines(copy);
                    }}
                    placeholder="الكمية"
                    required
                    className="text-xs font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs whitespace-nowrap text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={line.expectedReturn}
                    onChange={(e) => {
                      const copy = [...issueLines];
                      copy[idx].expectedReturn = e.target.checked;
                      setIssueLines(copy);
                    }}
                    className="size-4 rounded text-[#1167c9]"
                  />
                  <span>عهدة مستردة لاحقاً</span>
                </label>
                {issueLines.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setIssueLines((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex justify-end">
            <Button variant="primary" type="submit" loading={loading} disabled={!canReturn} className="text-xs">
              تأكيد صرف المستلزمات
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
