"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package,
  Search,
  Plus,
  Pencil,
  Trash2,
  Boxes,
  BarChart3,
  Building,
  ArrowRightLeft,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import {
  getHousingWarehouse,
  listWarehouseItems,
  type HousingWarehouse,
  type WarehouseItem,
  type WarehouseItemStatus,
} from "../../lib/housing/api";
import {
  WarehouseItemUpsertModal,
  TransferStatusModal,
  CorrectQuantityModal,
  DeleteWarehouseItemModal,
  TransferHousingModal,
} from "./WarehouseModals";

const STATUS_FILTERS: { id: WarehouseItemStatus | "ALL"; labelEn: string; labelAr: string }[] = [
  { id: "ALL", labelEn: "All", labelAr: "الكل" },
  { id: "Unused", labelEn: "Unused", labelAr: "غير مستخدم" },
  { id: "Used", labelEn: "Used", labelAr: "مستخدم" },
  { id: "Damaged", labelEn: "Damaged", labelAr: "تالف" },
];

function fmtQty(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function WarehouseTab({
  housingId,
  isArchived,
}: {
  housingId: string;
  isArchived: boolean;
}) {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const manage = can("housing.manage");

  // Data
  const [warehouse, setWarehouse] = useState<HousingWarehouse | null>(null);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WarehouseItemStatus | "ALL">("ALL");

  // Modals
  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [transferItem, setTransferItem] = useState<WarehouseItem | null>(null);
  const [transferHousingItem, setTransferHousingItem] = useState<WarehouseItem | null>(null);
  const [correctItem, setCorrectItem] = useState<WarehouseItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<WarehouseItem | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [wh, itms] = await Promise.all([
        getHousingWarehouse(housingId),
        listWarehouseItems(
          housingId,
          debouncedSearch.trim() || undefined,
          statusFilter !== "ALL" ? statusFilter : undefined,
        ),
      ]);
      setWarehouse(wh);
      setItems(itms || []);
    } catch (err: any) {
      setError(
        err?.message ||
        (isEn ? "Failed to load warehouse data" : "تعذر تحميل بيانات المستودع")
      );
    } finally {
      setLoading(false);
    }
  }, [housingId, debouncedSearch, statusFilter, isEn]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  function handleMutationSuccess() {
    void loadData();
  }

  function openAdd() {
    setEditingItem(null);
    setUpsertOpen(true);
  }

  function openEdit(item: WarehouseItem) {
    setEditingItem(item);
    setUpsertOpen(true);
  }

  // Loading skeleton
  if (loading && !warehouse) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[var(--surface)] p-4 border border-[var(--border)] animate-pulse">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
              <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !warehouse) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <p className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700 max-w-lg mx-auto border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ========== Summary Cards ========== */}
      {warehouse && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "Warehouse" : "المستودع"}</span>
              <Package size={15} className="text-blue-500" />
            </div>
            <p className="text-sm font-black mt-1 truncate">
              {isEn ? warehouse.nameEn : warehouse.nameAr}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "Item Records" : "عدد الأصناف"}</span>
              <Boxes size={15} className="text-purple-500" />
            </div>
            <p className="text-xl font-black mt-1">
              {warehouse.itemCount} {isEn ? "items" : "صنف"}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "Total Quantity" : "إجمالي الكمية"}</span>
              <BarChart3 size={15} className="text-amber-500" />
            </div>
            <p className="text-xl font-black text-[#1167c9] mt-1">
              {fmtQty(warehouse.totalQuantity)}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
              <span>{isEn ? "Housing" : "السكن"}</span>
              <Building size={15} className="text-emerald-500" />
            </div>
            <p className="text-sm font-black mt-1 truncate">
              {isEn ? warehouse.housingNameEn : warehouse.housingNameAr}
            </p>
            <p className="text-[11px] font-mono text-[var(--muted)]">{warehouse.housingCode}</p>
          </div>
        </div>
      )}

      {/* ========== Toolbar ========== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search
              size={16}
              className={`absolute top-3 text-[var(--muted)] ${isEn ? "left-3" : "right-3"}`}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? "Search by name..." : "بحث بالاسم..."}
              className={`h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-medium ${
                isEn ? "pl-9 pr-3" : "pr-9 pl-3"
              } outline-none focus:border-[#1167c9]`}
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 rounded-xl bg-[var(--subtle-bg)] border border-[var(--border)] p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  statusFilter === f.id
                    ? "bg-[#1167c9] text-white shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {isEn ? f.labelEn : f.labelAr}
              </button>
            ))}
          </div>
        </div>

        {/* Add item button */}
        {manage && !isArchived && (
          <Button onClick={openAdd} className="h-10 px-3 text-xs">
            <Plus size={15} />
            {isEn ? "Add Item" : "إضافة صنف"}
          </Button>
        )}
      </div>

      {/* ========== Items ========== */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--muted)]">
          <Package className="mx-auto mb-3 opacity-30" size={48} />
          <h3 className="font-bold text-base text-[var(--foreground)]">
            {search || statusFilter !== "ALL"
              ? (isEn ? "No matching items" : "لا توجد أصناف مطابقة")
              : (isEn ? "No items in warehouse" : "لا توجد أصناف في المستودع")}
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)] max-w-md mx-auto">
            {search || statusFilter !== "ALL"
              ? (isEn ? "Try adjusting your search or filter." : "جرب تغيير البحث أو المرشح.")
              : (isEn ? "Add the first item to track inventory." : "أضف الصنف الأول لبدء تتبع المخزون.")}
          </p>
          {!search && statusFilter === "ALL" && manage && !isArchived && (
            <Button onClick={openAdd} className="mt-4 text-xs">
              <Plus size={14} />
              {isEn ? "Add First Item" : "إضافة الصنف الأول"}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--subtle-bg)]">
                  <th className="px-4 py-3 text-xs font-extrabold text-[var(--muted)] text-start">
                    {isEn ? "Item" : "الصنف"}
                  </th>
                  <th className="px-4 py-3 text-xs font-extrabold text-emerald-600 text-center">
                    {isEn ? "Unused" : "غير مستخدم"}
                  </th>
                  <th className="px-4 py-3 text-xs font-extrabold text-blue-600 text-center">
                    {isEn ? "Used" : "مستخدم"}
                  </th>
                  <th className="px-4 py-3 text-xs font-extrabold text-rose-600 text-center">
                    {isEn ? "Damaged" : "تالف"}
                  </th>
                  <th className="px-4 py-3 text-xs font-extrabold text-[var(--muted)] text-center">
                    {isEn ? "Total" : "الإجمالي"}
                  </th>
                  {manage && !isArchived && (
                    <th className="px-4 py-3 text-xs font-extrabold text-[var(--muted)] text-center">
                      {isEn ? "Actions" : "الإجراءات"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--subtle-bg)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-sm text-[var(--foreground)]" dir="rtl">{item.nameAr}</p>
                      {item.notes && (
                        <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate max-w-[200px]" dir="rtl">{item.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                        item.unusedQuantity > 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "text-[var(--muted)]"
                      }`}>
                        {item.unusedQuantity > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        {fmtQty(item.unusedQuantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                        item.usedQuantity > 0
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          : "text-[var(--muted)]"
                      }`}>
                        {item.usedQuantity > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                        {fmtQty(item.usedQuantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
                        item.damagedQuantity > 0
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          : "text-[var(--muted)]"
                      }`}>
                        {item.damagedQuantity > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                        {fmtQty(item.damagedQuantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-black text-xs">{fmtQty(item.totalQuantity)}</td>
                    {manage && !isArchived && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setTransferItem(item)}
                            title={isEn ? "Transfer status" : "نقل حالة"}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9] dark:hover:bg-blue-950/40 transition-all"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                          <button
                            onClick={() => setTransferHousingItem(item)}
                            title={
                              item.unusedQuantity > 0
                                ? (isEn ? "Transfer to another housing" : "نقل إلى سكن آخر")
                                : (isEn ? "No unused quantity to transfer" : "لا توجد كمية غير مستخدمة للنقل")
                            }
                            disabled={item.unusedQuantity <= 0}
                            className={`grid h-8 w-8 place-items-center rounded-lg transition-all ${
                              item.unusedQuantity > 0
                                ? "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                                : "text-[var(--muted)] opacity-35 cursor-not-allowed"
                            }`}
                          >
                            <Truck size={14} />
                          </button>
                          <button
                            onClick={() => setCorrectItem(item)}
                            title={isEn ? "Correct quantity" : "تصحيح كمية"}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 transition-all"
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            title={isEn ? "Edit" : "تعديل"}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--foreground)] dark:hover:bg-slate-800 transition-all"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingItem(item)}
                            title={isEn ? "Delete" : "حذف"}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-bold text-sm text-[var(--foreground)]" dir="rtl">{item.nameAr}</p>
                    {item.notes && (
                      <p className="text-[11px] text-[var(--muted)] truncate" dir="rtl">{item.notes}</p>
                    )}

                    {/* Balance badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {isEn ? "Unused" : "غير مستخدم"}: {fmtQty(item.unusedQuantity)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {isEn ? "Used" : "مستخدم"}: {fmtQty(item.usedQuantity)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {isEn ? "Damaged" : "تالف"}: {fmtQty(item.damagedQuantity)}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-[var(--muted)]">
                      {isEn ? "Total" : "الإجمالي"}: <strong className="text-[var(--foreground)]">{fmtQty(item.totalQuantity)}</strong>
                    </p>
                  </div>

                  {manage && !isArchived && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => setTransferItem(item)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9] dark:hover:bg-blue-950/40 transition-all border border-[var(--border)]"
                        title={isEn ? "Transfer" : "نقل حالة"}
                      >
                        <ArrowRightLeft size={13} />
                      </button>
                      <button
                        onClick={() => setTransferHousingItem(item)}
                        className={`grid h-8 w-8 place-items-center rounded-lg transition-all border border-[var(--border)] ${
                          item.unusedQuantity > 0
                            ? "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            : "text-[var(--muted)] opacity-35 cursor-not-allowed"
                        }`}
                        title={
                          item.unusedQuantity > 0
                            ? (isEn ? "Transfer to housing" : "نقل لسكن آخر")
                            : (isEn ? "No unused quantity" : "لا توجد كمية غير مستخدمة")
                        }
                        disabled={item.unusedQuantity <= 0}
                      >
                        <Truck size={13} />
                      </button>
                      <button
                        onClick={() => setCorrectItem(item)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 transition-all border border-[var(--border)]"
                        title={isEn ? "Correct" : "تصحيح كمية"}
                      >
                        <SlidersHorizontal size={13} />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--foreground)] dark:hover:bg-slate-800 transition-all border border-[var(--border)]"
                        title={isEn ? "Edit" : "تعديل"}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-all border border-[var(--border)]"
                        title={isEn ? "Delete" : "حذف"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ========== Modals ========== */}
      <WarehouseItemUpsertModal
        isOpen={upsertOpen}
        onClose={() => { setUpsertOpen(false); setEditingItem(null); }}
        housingId={housingId}
        item={editingItem}
        onSuccess={handleMutationSuccess}
        isEn={isEn}
      />

      <TransferStatusModal
        isOpen={Boolean(transferItem)}
        onClose={() => setTransferItem(null)}
        housingId={housingId}
        item={transferItem}
        onSuccess={handleMutationSuccess}
        isEn={isEn}
      />

      <TransferHousingModal
        isOpen={Boolean(transferHousingItem)}
        onClose={() => setTransferHousingItem(null)}
        housingId={housingId}
        item={transferHousingItem}
        onSuccess={handleMutationSuccess}
        isEn={isEn}
      />

      <CorrectQuantityModal
        isOpen={Boolean(correctItem)}
        onClose={() => setCorrectItem(null)}
        housingId={housingId}
        item={correctItem}
        onSuccess={handleMutationSuccess}
        isEn={isEn}
      />

      <DeleteWarehouseItemModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        housingId={housingId}
        item={deletingItem}
        onSuccess={handleMutationSuccess}
        isEn={isEn}
      />
    </div>
  );
}
