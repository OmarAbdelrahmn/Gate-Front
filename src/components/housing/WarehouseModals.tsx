"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, AlertTriangle, ArrowRightLeft, Building2, Truck, Info } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { toast } from "../ui/Toast";
import { SearchableSelect, type SelectOption } from "../ui/SearchableSelect";
import {
  createWarehouseItem,
  updateWarehouseItem,
  transferWarehouseItemStatus,
  correctWarehouseItemQuantity,
  deleteWarehouseItem,
  transferWarehouseItemHousing,
  getWarehouseItem,
  listHousing,
  type WarehouseItem,
  type WarehouseItemStatus,
  type Housing,
} from "../../lib/housing/api";

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition-all focus:border-[#1167c9] outline-none";

const STATUS_OPTIONS: WarehouseItemStatus[] = ["Unused", "Used", "Damaged"];

function statusLabelAr(s: WarehouseItemStatus): string {
  switch (s) {
    case "Unused": return "غير مستخدم";
    case "Used": return "مستخدم";
    case "Damaged": return "تالف";
  }
}

function getSourceBalance(item: WarehouseItem, status: WarehouseItemStatus): number {
  switch (status) {
    case "Unused": return item.unusedQuantity;
    case "Used": return item.usedQuantity;
    case "Damaged": return item.damagedQuantity;
  }
}

// ============================
// 1. Add / Edit Item Modal
// ============================
export function WarehouseItemUpsertModal({
  isOpen,
  onClose,
  housingId,
  item,
  onSuccess,
  isEn,
}: {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  item: WarehouseItem | null;
  onSuccess: () => void;
  isEn: boolean;
}) {
  const isEdit = Boolean(item);

  const [nameAr, setNameAr] = useState("");
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState<WarehouseItemStatus>("Unused");
  const [notes, setNotes] = useState("");
  const [rowVersion, setRowVersion] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [concurrencyWarning, setConcurrencyWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setNameAr(item.nameAr);
        setNotes(item.notes || "");
        setRowVersion(item.rowVersion);
      } else {
        setNameAr("");
        setQuantity("");
        setStatus("Unused");
        setNotes("");
        setRowVersion(null);
      }
      setError("");
      setConcurrencyWarning(false);
    }
  }, [isOpen, item]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!nameAr.trim()) {
      setError(isEn ? "Arabic name is required" : "الاسم بالعربية مطلوب");
      return;
    }
    if (nameAr.trim().length > 200) {
      setError(isEn ? "Name max 200 characters" : "الاسم بحد أقصى 200 حرف");
      return;
    }

    if (!isEdit) {
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty < 0) {
        setError(isEn ? "Quantity must be zero or greater" : "الكمية يجب أن تكون صفر أو أكثر");
        return;
      }
      const decimalParts = quantity.split(".");
      if (decimalParts.length > 1 && decimalParts[1].length > 3) {
        setError(isEn ? "Max 3 decimal places" : "بحد أقصى 3 أرقام عشرية");
        return;
      }
    }

    if (notes.length > 2000) {
      setError(isEn ? "Notes max 2000 characters" : "الملاحظات بحد أقصى 2000 حرف");
      return;
    }

    setBusy(true);
    try {
      if (isEdit && item) {
        await updateWarehouseItem(housingId, item.id, {
          nameAr: nameAr.trim(),
          notes: notes.trim() || null,
          rowVersion: rowVersion!,
        });
        toast.success(
          isEn ? "Item Updated" : "تم تحديث الصنف",
          isEn ? "Item name and notes updated." : "تم تحديث اسم الصنف والملاحظات."
        );
      } else {
        await createWarehouseItem(housingId, {
          nameAr: nameAr.trim(),
          quantity: parseFloat(quantity),
          status,
          notes: notes.trim() || null,
        });
        toast.success(
          isEn ? "Item Added" : "تمت إضافة الصنف",
          isEn ? "Warehouse item created." : "تمت إضافة صنف المستودع."
        );
      }
      onClose();
      onSuccess();
    } catch (err: any) {
      const errorCode = err?.details?.errorCode;
      if (errorCode === "hr.concurrency_conflict" && isEdit && item) {
        setConcurrencyWarning(true);
        try {
          const fresh = await getWarehouseItem(housingId, item.id);
          setRowVersion(fresh.rowVersion);
        } catch { /* keep stale */ }
        setError(
          isEn
            ? "Modified by another user. Review and resubmit."
            : "تم تعديل الصنف بواسطة مستخدم آخر. راجع وأعد الإرسال."
        );
      } else {
        setError(err?.message || (isEn ? "Failed to save" : "تعذر الحفظ"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h2 className="text-lg font-black">
            {isEdit
              ? (isEn ? "Edit Item" : "تعديل الصنف")
              : (isEn ? "Add Item" : "إضافة صنف")}
          </h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {concurrencyWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {error && !concurrencyWarning && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Arabic Name" : "الاسم بالعربية"} <span className="text-rose-500">*</span>
            </span>
            <input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              maxLength={200}
              placeholder={isEn ? "e.g. سرير مفرد" : "مثال: سرير مفرد"}
              className={inputCls}
              dir="rtl"
              autoFocus
            />
          </label>

          {/* Quantity + Status only for create */}
          {!isEdit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Quantity" : "الكمية"} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                  dir="ltr"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-bold">
                <span>
                  {isEn ? "Status" : "الحالة"} <span className="text-rose-500">*</span>
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as WarehouseItemStatus)}
                  className={inputCls}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {isEn ? s : statusLabelAr(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label className="grid gap-1.5 text-xs font-bold">
            <span>{isEn ? "Notes" : "ملاحظات"}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={isEn ? "Optional notes..." : "ملاحظات اختيارية..."}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium transition-all focus:border-[#1167c9] outline-none resize-none"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEdit ? (isEn ? "Save" : "حفظ") : (isEn ? "Add" : "إضافة")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ============================
// 2. Transfer Status Modal
// ============================
export function TransferStatusModal({
  isOpen,
  onClose,
  housingId,
  item,
  onSuccess,
  isEn,
}: {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  item: WarehouseItem | null;
  onSuccess: () => void;
  isEn: boolean;
}) {
  const [fromStatus, setFromStatus] = useState<WarehouseItemStatus>("Unused");
  const [toStatus, setToStatus] = useState<WarehouseItemStatus>("Used");
  const [quantity, setQuantity] = useState("");
  const [rowVersion, setRowVersion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [concurrencyWarning, setConcurrencyWarning] = useState(false);
  const [liveItem, setLiveItem] = useState<WarehouseItem | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setFromStatus("Unused");
      setToStatus("Used");
      setQuantity("");
      setRowVersion(item.rowVersion);
      setError("");
      setConcurrencyWarning(false);
      setLiveItem(item);
    }
  }, [isOpen, item]);

  const currentItem = liveItem || item;
  const sourceBalance = currentItem ? getSourceBalance(currentItem, fromStatus) : 0;

  // Auto-pick a different toStatus when fromStatus changes
  useEffect(() => {
    if (fromStatus === toStatus) {
      const alt = STATUS_OPTIONS.find((s) => s !== fromStatus);
      if (alt) setToStatus(alt);
    }
  }, [fromStatus, toStatus]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentItem) return;
    setError("");

    if (fromStatus === toStatus) {
      setError(isEn ? "Source and destination must differ" : "الحالة المصدر والوجهة يجب أن تختلف");
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError(isEn ? "Quantity must be greater than zero" : "الكمية يجب أن تكون أكبر من صفر");
      return;
    }
    const decimalParts = quantity.split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > 3) {
      setError(isEn ? "Max 3 decimal places" : "بحد أقصى 3 أرقام عشرية");
      return;
    }
    if (qty > sourceBalance) {
      setError(
        isEn
          ? `Exceeds available balance (${sourceBalance})`
          : `الكمية تتجاوز الرصيد المتاح (${sourceBalance})`
      );
      return;
    }

    setBusy(true);
    try {
      await transferWarehouseItemStatus(housingId, currentItem.id, {
        fromStatus,
        toStatus,
        quantity: qty,
        rowVersion,
      });
      toast.success(
        isEn ? "Transfer Complete" : "تم نقل الحالة",
        isEn
          ? `${qty} transferred from ${fromStatus} to ${toStatus}`
          : `تم نقل ${qty} من ${statusLabelAr(fromStatus)} إلى ${statusLabelAr(toStatus)}`
      );
      onClose();
      onSuccess();
    } catch (err: any) {
      const errorCode = err?.details?.errorCode;
      if (errorCode === "hr.concurrency_conflict") {
        setConcurrencyWarning(true);
        try {
          const fresh = await getWarehouseItem(housingId, currentItem.id);
          setRowVersion(fresh.rowVersion);
          setLiveItem(fresh);
        } catch { /* keep current */ }
        setError(
          isEn
            ? "Item modified by another user. Balances refreshed — review and resubmit."
            : "تم تعديل الصنف. تم تحديث الأرصدة — راجع وأعد الإرسال."
        );
      } else {
        setError(err?.message || (isEn ? "Transfer failed" : "تعذر نقل الحالة"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-[#1167c9]" />
            <h2 className="text-lg font-black">{isEn ? "Transfer Status" : "نقل حالة"}</h2>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-[var(--subtle-bg)] p-3 border border-[var(--border)]">
          <p className="text-sm font-bold text-[var(--foreground)]" dir="rtl">{currentItem.nameAr}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-[var(--muted)]">
            <span>{isEn ? "Unused" : "غير مستخدم"}: <strong className="text-emerald-600">{currentItem.unusedQuantity}</strong></span>
            <span>{isEn ? "Used" : "مستخدم"}: <strong className="text-blue-600">{currentItem.usedQuantity}</strong></span>
            <span>{isEn ? "Damaged" : "تالف"}: <strong className="text-rose-600">{currentItem.damagedQuantity}</strong></span>
          </div>
        </div>

        {concurrencyWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {error && !concurrencyWarning && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold">
              <span>{isEn ? "From status" : "من الحالة"} <span className="text-rose-500">*</span></span>
              <select value={fromStatus} onChange={(e) => setFromStatus(e.target.value as WarehouseItemStatus)} className={inputCls}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{isEn ? s : statusLabelAr(s)}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-bold">
              <span>{isEn ? "To status" : "إلى الحالة"} <span className="text-rose-500">*</span></span>
              <select value={toStatus} onChange={(e) => setToStatus(e.target.value as WarehouseItemStatus)} className={inputCls}>
                {STATUS_OPTIONS.filter((s) => s !== fromStatus).map((s) => (
                  <option key={s} value={s}>{isEn ? s : statusLabelAr(s)}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1.5 text-xs font-bold">
            <span className="flex items-center justify-between">
              <span>{isEn ? "Quantity" : "الكمية"} <span className="text-rose-500">*</span></span>
              <span className="text-[11px] font-medium text-[var(--muted)]">
                {isEn ? "Available" : "المتاح"}: <strong className="text-[var(--foreground)]">{sourceBalance}</strong>
              </span>
            </span>
            <input
              type="number"
              min="0.001"
              max={sourceBalance}
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className={inputCls}
              dir="ltr"
              autoFocus
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEn ? "Transfer" : "نقل"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ============================
// 3. Correct Quantity Modal
// ============================
export function CorrectQuantityModal({
  isOpen,
  onClose,
  housingId,
  item,
  onSuccess,
  isEn,
}: {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  item: WarehouseItem | null;
  onSuccess: () => void;
  isEn: boolean;
}) {
  const [status, setStatus] = useState<WarehouseItemStatus>("Unused");
  const [quantity, setQuantity] = useState("");
  const [rowVersion, setRowVersion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [concurrencyWarning, setConcurrencyWarning] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setStatus("Unused");
      setQuantity(String(item.unusedQuantity));
      setRowVersion(item.rowVersion);
      setError("");
      setConcurrencyWarning(false);
    }
  }, [isOpen, item]);

  // Update quantity display when status changes
  useEffect(() => {
    if (item) {
      setQuantity(String(getSourceBalance(item, status)));
    }
  }, [status, item]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    setError("");

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) {
      setError(isEn ? "Quantity must be zero or greater" : "الكمية يجب أن تكون صفر أو أكثر");
      return;
    }
    const decimalParts = quantity.split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > 3) {
      setError(isEn ? "Max 3 decimal places" : "بحد أقصى 3 أرقام عشرية");
      return;
    }

    setBusy(true);
    try {
      await correctWarehouseItemQuantity(housingId, item.id, status, {
        quantity: qty,
        rowVersion,
      });
      toast.success(
        isEn ? "Quantity Corrected" : "تم تصحيح الكمية",
        isEn
          ? `${status} quantity set to ${qty}`
          : `تم تعيين كمية ${statusLabelAr(status)} إلى ${qty}`
      );
      onClose();
      onSuccess();
    } catch (err: any) {
      const errorCode = err?.details?.errorCode;
      if (errorCode === "hr.concurrency_conflict") {
        setConcurrencyWarning(true);
        try {
          const fresh = await getWarehouseItem(housingId, item.id);
          setRowVersion(fresh.rowVersion);
        } catch { /* keep current */ }
        setError(
          isEn
            ? "Modified by another user. Row version refreshed — review and resubmit."
            : "تم تعديل الصنف. تم تحديث الإصدار — راجع وأعد الإرسال."
        );
      } else {
        setError(err?.message || (isEn ? "Failed to correct quantity" : "تعذر تصحيح الكمية"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h2 className="text-lg font-black">{isEn ? "Correct Quantity" : "تصحيح الكمية"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-[var(--subtle-bg)] p-3 border border-[var(--border)]">
          <p className="text-sm font-bold text-[var(--foreground)]" dir="rtl">{item.nameAr}</p>
        </div>

        {concurrencyWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {error && !concurrencyWarning && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>{isEn ? "Status to correct" : "الحالة المراد تصحيحها"} <span className="text-rose-500">*</span></span>
            <select value={status} onChange={(e) => setStatus(e.target.value as WarehouseItemStatus)} className={inputCls}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{isEn ? s : statusLabelAr(s)}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-bold">
            <span>{isEn ? "New quantity" : "الكمية الجديدة"} <span className="text-rose-500">*</span></span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputCls}
              dir="ltr"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy}>
              {isEn ? "Correct" : "تصحيح"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ============================
// 4. Delete Item Modal
// ============================
export function DeleteWarehouseItemModal({
  isOpen,
  onClose,
  housingId,
  item,
  onSuccess,
  isEn,
}: {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  item: WarehouseItem | null;
  onSuccess: () => void;
  isEn: boolean;
}) {
  const [reason, setReason] = useState("");
  const [rowVersion, setRowVersion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      setReason("");
      setRowVersion(item.rowVersion);
      setError("");
    }
  }, [isOpen, item]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    if (!reason.trim()) {
      setError(isEn ? "Reason is required" : "سبب الحذف مطلوب");
      return;
    }

    setError("");
    setBusy(true);
    try {
      await deleteWarehouseItem(housingId, item.id, {
        reason: reason.trim(),
        rowVersion,
      });
      toast.success(
        isEn ? "Item Deleted" : "تم حذف الصنف",
        isEn ? "Warehouse item removed." : "تم حذف صنف المستودع."
      );
      onClose();
      onSuccess();
    } catch (err: any) {
      const errorCode = err?.details?.errorCode;
      if (errorCode === "hr.concurrency_conflict") {
        try {
          const fresh = await getWarehouseItem(housingId, item.id);
          setRowVersion(fresh.rowVersion);
        } catch { /* item may be deleted */ }
        setError(
          isEn
            ? "Modified by another user. Please try again."
            : "تم تعديل الصنف بواسطة مستخدم آخر. يرجى المحاولة مرة أخرى."
        );
      } else {
        setError(err?.message || (isEn ? "Failed to delete" : "تعذر الحذف"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-black">{isEn ? "Delete Item" : "حذف الصنف"}</h2>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--muted)] font-medium leading-relaxed">
          {isEn
            ? `Are you sure you want to delete "${item.nameAr}"? This action is a soft delete.`
            : `هل أنت متأكد من حذف "${item.nameAr}"؟ سيتم إخفاء الصنف من القوائم.`}
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Reason" : "سبب الحذف"} <span className="text-rose-500">*</span>
            </span>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={isEn ? "e.g. No longer used in housing" : "مثال: لم يعد الصنف مستخدماً في السكن"}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium transition-all focus:border-[#1167c9] outline-none resize-none"
              autoFocus
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={busy} className="bg-rose-600 hover:bg-rose-700 text-white">
              {isEn ? "Confirm Delete" : "تأكيد الحذف"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ============================
// 5. Transfer to Another Housing Warehouse Modal
// ============================
export function TransferHousingModal({
  isOpen,
  onClose,
  housingId,
  item,
  onSuccess,
  isEn,
}: {
  isOpen: boolean;
  onClose: () => void;
  housingId: string;
  item: WarehouseItem | null;
  onSuccess: () => void;
  isEn: boolean;
}) {
  const [destinationHousingId, setDestinationHousingId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rowVersion, setRowVersion] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHousings, setLoadingHousings] = useState(false);
  const [housings, setHousings] = useState<Housing[]>([]);
  const [error, setError] = useState("");
  const [concurrencyWarning, setConcurrencyWarning] = useState(false);
  const [liveItem, setLiveItem] = useState<WarehouseItem | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setDestinationHousingId("");
      setQuantity("");
      setRowVersion(item.rowVersion);
      setError("");
      setConcurrencyWarning(false);
      setLiveItem(item);

      setLoadingHousings(true);
      listHousing()
        .then((list) => {
          const available = (list || []).filter(
            (h) => h.id !== housingId && h.status !== "Archived" && !h.isDeleted,
          );
          setHousings(available);
        })
        .catch((err) => {
          console.error("Failed to load destination housings:", err);
        })
        .finally(() => {
          setLoadingHousings(false);
        });
    }
  }, [isOpen, item, housingId]);

  const currentItem = liveItem || item;
  const availableUnused = currentItem ? currentItem.unusedQuantity : 0;

  const housingOptions: SelectOption[] = housings.map((h) => ({
    value: h.id,
    label: isEn
      ? `${h.nameEn || h.nameAr} (${h.code})`
      : `${h.nameAr || h.nameEn} (${h.code})`,
    sublabel: isEn
      ? (h.cityAr ? `City: ${h.cityAr}` : undefined)
      : (h.cityAr ? `المدينة: ${h.cityAr}` : undefined),
    keywords: `${h.code} ${h.nameAr} ${h.nameEn}`,
  }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentItem) return;
    setError("");

    if (!destinationHousingId) {
      setError(
        isEn
          ? "Please select a destination housing"
          : "يرجى اختيار السكن الوجهة",
      );
      return;
    }

    if (destinationHousingId === housingId) {
      setError(
        isEn
          ? "Destination must be a different housing"
          : "يجب اختيار سكن وجهة مختلف عن السكن الحالي",
      );
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError(
        isEn
          ? "Quantity must be greater than zero"
          : "الكمية يجب أن تكون أكبر من صفر",
      );
      return;
    }

    const decimalParts = quantity.split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > 3) {
      setError(
        isEn
          ? "Quantity can have at most 3 decimal places"
          : "الكمية يمكن أن تحتوي على 3 أرقام عشرية كحد أقصى",
      );
      return;
    }

    if (qty > availableUnused) {
      setError(
        isEn
          ? `Quantity exceeds available unused balance (${availableUnused})`
          : `الكمية تتجاوز الرصيد غير المستخدم المتاح (${availableUnused})`,
      );
      return;
    }

    setBusy(true);
    try {
      await transferWarehouseItemHousing(housingId, currentItem.id, {
        destinationHousingId,
        quantity: qty,
        rowVersion,
      });

      const dest = housings.find((h) => h.id === destinationHousingId);
      const destName = isEn
        ? dest?.nameEn || dest?.nameAr || "destination housing"
        : dest?.nameAr || "السكن الوجهة";

      toast.success(
        isEn ? "Transfer Successful" : "تم نقل الكمية بنجاح",
        isEn
          ? `Transferred ${qty} to ${destName} warehouse.`
          : `تم نقل ${qty} إلى مستودع ${destName}.`,
      );
      onClose();
      onSuccess();
    } catch (err: any) {
      const errorCode = err?.details?.errorCode;
      if (errorCode === "hr.concurrency_conflict") {
        setConcurrencyWarning(true);
        try {
          const fresh = await getWarehouseItem(housingId, currentItem.id);
          setRowVersion(fresh.rowVersion);
          setLiveItem(fresh);
        } catch {
          /* keep current */
        }
        setError(
          isEn
            ? "Item modified by another user. Balances refreshed — review and resubmit."
            : "تم تعديل الصنف بواسطة مستخدم آخر. تم تحديث الرصيد — راجع وأعد الإرسال.",
        );
      } else {
        setError(
          err?.message ||
            (isEn ? "Transfer failed" : "تعذر نقل الصنف إلى سكن آخر"),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen || !currentItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-purple-600" />
            <h2 className="text-lg font-black">
              {isEn ? "Transfer to Housing Warehouse" : "نقل إلى مستودع سكن آخر"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Source item balance card */}
        <div className="mt-3 rounded-xl bg-[var(--subtle-bg)] p-3 border border-[var(--border)] space-y-1.5">
          <p className="text-sm font-bold text-[var(--foreground)]" dir="rtl">
            {currentItem.nameAr}
          </p>
          <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
            <span>{isEn ? "Unused balance (transferable)" : "الرصيد غير المستخدم (المتاح للنقل)"}:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {availableUnused}
            </span>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-purple-50/70 p-2.5 text-[11px] font-medium text-purple-900 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900">
          <Info size={15} className="shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
          <span>
            {isEn
              ? "Only unused quantity is transferred to the destination housing warehouse. If the item exists there, its unused balance will increase; otherwise it will be created automatically."
              : "يتم نقل الرصيد غير المستخدم فقط. سيعثر النظام على مستودع السكن الوجهة تلقائياً ويضيف الرصيد إليه أو ينشئ الصنف إذا لم يكن موجوداً."}
          </span>
        </div>

        {concurrencyWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {error && !concurrencyWarning && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-1.5 text-xs font-bold">
            <span>
              {isEn ? "Destination Housing" : "السكن الوجهة"} <span className="text-rose-500">*</span>
            </span>
            <SearchableSelect
              value={destinationHousingId}
              onChange={setDestinationHousingId}
              options={housingOptions}
              placeholder={
                loadingHousings
                  ? (isEn ? "Loading housings..." : "جاري تحميل المساكن...")
                  : (isEn ? "Select destination housing..." : "اختر السكن الوجهة...")
              }
              searchPlaceholder={isEn ? "Search housing..." : "بحث عن سكن..."}
              noOptionsText={isEn ? "No available housings" : "لا توجد مساكن متاحة"}
              disabled={loadingHousings || busy}
              required
            />
          </div>

          <label className="grid gap-1.5 text-xs font-bold">
            <span className="flex items-center justify-between">
              <span>
                {isEn ? "Quantity to transfer" : "الكمية المراد نقلها"} <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] font-medium text-[var(--muted)]">
                {isEn ? "Max" : "الحد الأقصى"}: <strong className="text-emerald-600">{availableUnused}</strong>
              </span>
            </span>
            <input
              type="number"
              min="0.001"
              max={availableUnused}
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className={inputCls}
              dir="ltr"
              disabled={busy || availableUnused <= 0}
              autoFocus
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="submit"
              loading={busy}
              disabled={availableUnused <= 0 || loadingHousings}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isEn ? "Transfer" : "تأكيد النقل"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

