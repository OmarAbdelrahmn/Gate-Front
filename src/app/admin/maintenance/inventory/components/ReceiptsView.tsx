"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlusCircle,
  FileText,
  Search,
  Loader2,
  Copy,
  Check,
  Trash2,
  Info,
  Calendar,
  Building2,
  Receipt,
  RefreshCw,
  Filter,
  X,
  TrendingUp,
  Boxes,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CreateReceiptModal } from "./CreateReceiptModal";
import { BillViewerModal } from "./BillViewerModal";
import { ReceiptDetailsModal } from "./ReceiptDetailsModal";
import { getPurchaseReceipts, getPurchaseReceipt } from "@/lib/maintenance/api";
import type {
  PurchaseReceipt,
  MaintenanceLocation,
  InventoryItem,
  Supplier,
} from "@/lib/maintenance/types";
import { formatCurrency, formatDate } from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "@/components/ui/Toast";

interface ReceiptsViewProps {
  locations: MaintenanceLocation[];
  suppliers: Supplier[];
  items: InventoryItem[];
}

const STORAGE_KEY = "maintenance_recent_receipts";

export function ReceiptsView({ locations, suppliers, items }: ReceiptsViewProps) {
  const { can } = useAuth();
  const canManage = can("inventory.receipts.manage");

  // Receipts data
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  // Direct GUID lookup
  const [lookupLoading, setLookupLoading] = useState(false);

  // Copy ID feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<PurchaseReceipt | null>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingDetailsReceipt, setViewingDetailsReceipt] = useState<PurchaseReceipt | null>(null);

  // Enrich receipt with readable names if missing from API response
  const enrichReceipt = useCallback(
    (rcpt: any): PurchaseReceipt => {
      const sup = suppliers.find(
        (s) => s.id === (rcpt.supplierId || rcpt.supplier?.id),
      );
      const loc = locations.find(
        (l) => l.id === (rcpt.inventoryLocationId || rcpt.inventoryLocation?.id),
      );
      return {
        ...rcpt,
        id: rcpt.id,
        receiptNumber:
          rcpt.receiptNumber || rcpt.number || rcpt.code || (rcpt.id ? rcpt.id.slice(0, 8) : "—"),
        supplierNameAr:
          rcpt.supplierNameAr ||
          rcpt.supplierName ||
          rcpt.supplier?.legalNameAr ||
          rcpt.supplier?.nameAr ||
          sup?.legalNameAr ||
          "مورد غير محدد",
        supplierInvoiceNumber:
          rcpt.supplierInvoiceNumber || rcpt.invoiceNumber || "—",
        invoiceDate: rcpt.invoiceDate || rcpt.receivedAtUtc || rcpt.createdAtUtc,
        inventoryLocationNameAr:
          rcpt.inventoryLocationNameAr ||
          rcpt.inventoryLocationName ||
          rcpt.inventoryLocation?.nameAr ||
          rcpt.location?.nameAr ||
          loc?.nameAr ||
          "مستودع غير محدد",
        inventoryValuationAmount:
          rcpt.inventoryValuationAmount ?? rcpt.valuationAmount ?? 0,
        totalAmount: rcpt.totalAmount ?? rcpt.total ?? 0,
        subtotal: rcpt.subtotal ?? 0,
        taxAmount: rcpt.taxAmount ?? 0,
        discountAmount: rcpt.discountAmount ?? 0,
        lines: Array.isArray(rcpt.lines) ? rcpt.lines : [],
        attachment: rcpt.attachment || null,
      };
    },
    [suppliers, locations],
  );

  // Load receipts from API and merge with cached receipts
  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch from server API
      const serverData = await getPurchaseReceipts({
        inventoryLocationId: selectedLocationId || undefined,
        supplierId: selectedSupplierId || undefined,
      }).catch((err) => {
        console.warn("Failed to fetch receipts from server:", err);
        return [];
      });

      // 2. Read locally cached receipts as backup
      let cachedReceipts: PurchaseReceipt[] = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            cachedReceipts = parsed;
          }
        }
      } catch (e) {
        console.warn("Failed to read cached receipts:", e);
      }

      // 3. Merge server and cached receipts (server data prioritized)
      const mergedMap = new Map<string, PurchaseReceipt>();
      serverData.forEach((item: any) => {
        if (item && item.id) {
          mergedMap.set(item.id, enrichReceipt(item));
        }
      });
      cachedReceipts.forEach((item: any) => {
        if (item && item.id && !mergedMap.has(item.id)) {
          mergedMap.set(item.id, enrichReceipt(item));
        }
      });

      setReceipts(Array.from(mergedMap.values()));
    } catch (err: any) {
      console.error("Failed to load receipts:", err);
      setError(err?.message || "تعذر تحميل فواتير وإيصالات المشتريات من الخادم.");
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, selectedSupplierId, enrichReceipt]);

  // Initial load on mount and when location/supplier filters change
  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // Save new receipt to cache and update state
  const handleReceiptCreated = (newReceipt?: PurchaseReceipt) => {
    if (!newReceipt) {
      loadReceipts();
      return;
    }
    const enriched = enrichReceipt(newReceipt);
    setReceipts((prev) => {
      const updated = [enriched, ...prev.filter((r) => r.id !== enriched.id)];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
      } catch (e) {
        console.warn("Failed to persist receipts to localStorage:", e);
      }
      return updated;
    });
    toast.success(
      "تم تسجيل الإيصال بنجاح",
      `تم إصدار إيصال الاستلام رقم ${enriched.receiptNumber}`,
    );
    // Also trigger server reload
    loadReceipts();
  };

  // Direct GUID lookup
  const handleDirectLookup = async (guid: string) => {
    const idToFind = guid.trim();
    if (!idToFind) return;

    setLookupLoading(true);
    try {
      const result = await getPurchaseReceipt(idToFind);
      if (result && result.id) {
        const enriched = enrichReceipt(result);
        setReceipts((prev) => [
          enriched,
          ...prev.filter((r) => r.id !== enriched.id),
        ]);
        toast.success(
          "تم العثور على الإيصال",
          `إيصال رقم: ${enriched.receiptNumber || enriched.id}`,
        );
      } else {
        toast.error("غير موجود", "لم يتم العثور على إيصال بالمعرّف المدخل.");
      }
    } catch (err: any) {
      console.error("Failed to lookup receipt:", err);
      toast.error(
        "فشل الاستعلام",
        err?.message || "تعذر العثور على الإيصال بالمعرف المدخل.",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  // Copy ID to clipboard
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.info("تم النسخ", "تم نسخ معرف الإيصال إلى الحافظة");
    } catch {
      // Fallback
    }
  };

  const handleOpenBill = (receipt: PurchaseReceipt) => {
    setViewingReceipt(receipt);
    setBillModalOpen(true);
  };

  const handleOpenDetails = (receipt: PurchaseReceipt) => {
    setViewingDetailsReceipt(receipt);
    setDetailsModalOpen(true);
  };

  // Filtered receipts list
  const filteredReceipts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return receipts.filter((rcpt) => {
      // Location filter
      if (selectedLocationId && rcpt.inventoryLocationId !== selectedLocationId) {
        return false;
      }
      // Supplier filter
      if (selectedSupplierId && rcpt.supplierId !== selectedSupplierId) {
        return false;
      }
      // Search term
      if (term) {
        const matchesNumber = (rcpt.receiptNumber || "").toLowerCase().includes(term);
        const matchesInvoice = (rcpt.supplierInvoiceNumber || "")
          .toLowerCase()
          .includes(term);
        const matchesSupplier = (rcpt.supplierNameAr || "").toLowerCase().includes(term);
        const matchesLocation = (rcpt.inventoryLocationNameAr || "")
          .toLowerCase()
          .includes(term);
        const matchesId = (rcpt.id || "").toLowerCase().includes(term);
        if (
          !matchesNumber &&
          !matchesInvoice &&
          !matchesSupplier &&
          !matchesLocation &&
          !matchesId
        ) {
          return false;
        }
      }
      return true;
    });
  }, [receipts, searchTerm, selectedLocationId, selectedSupplierId]);

  // Financial KPI totals
  const stats = useMemo(() => {
    const totalCount = filteredReceipts.length;
    const totalValuation = filteredReceipts.reduce(
      (sum, r) => sum + (r.inventoryValuationAmount || 0),
      0,
    );
    const totalInvoices = filteredReceipts.reduce(
      (sum, r) => sum + (r.totalAmount || 0),
      0,
    );
    return { totalCount, totalValuation, totalInvoices };
  }, [filteredReceipts]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || selectedLocationId || selectedSupplierId,
  );

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedLocationId("");
    setSelectedSupplierId("");
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt size={18} className="text-[#1167c9]" />
            فواتير واستلام المشتريات
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تسجيل فواتير المشتريات، وتحديث تكلفة ومخزون الأصناف، وعرض فواتير التوريد المرفقة.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={loadReceipts}
            disabled={loading}
            className="text-xs text-slate-600 dark:text-slate-300"
            title="تحديث البيانات من الخادم"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#1167c9]" : ""} />
            تحديث
          </Button>

          {canManage && (
            <Button
              variant="primary"
              onClick={() => setCreateModalOpen(true)}
              className="text-xs shrink-0"
            >
              <PlusCircle size={15} />
              تسجيل إيصال مشتريات جديد
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
              إجمالي فواتير وإيصالات الشراء
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {stats.totalCount}
            </span>
          </div>
          <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#1167c9] flex items-center justify-center">
            <Boxes size={20} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
              إجمالي قيمة الفواتير
            </span>
            <span className="text-lg font-black text-[#1167c9] dark:text-blue-400 font-mono">
              {formatCurrency(stats.totalInvoices)}
            </span>
          </div>
          <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
              قيمة تقييم المخزون
            </span>
            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {formatCurrency(stats.totalValuation)}
            </span>
          </div>
          <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم الإيصال، رقم فاتورة المورد، اسم المورد، أو المعرف (ID)..."
              className="w-full h-9.5 ps-9 pe-3 text-xs rounded-xl border border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/50 text-[var(--foreground)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1167c9]/30 focus:border-[#1167c9]"
            />
          </div>

          {/* Location Select */}
          <div className="w-full sm:w-56">
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full h-9.5 px-3 text-xs rounded-xl border border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/50 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1167c9]/30 focus:border-[#1167c9]"
            >
              <option value="">جميع المستودعات</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Select */}
          <div className="w-full sm:w-56">
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full h-9.5 px-3 text-xs rounded-xl border border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/50 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#1167c9]/30 focus:border-[#1167c9]"
            >
              <option value="">جميع الموردين</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.legalNameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="h-9.5 text-xs px-2.5 text-slate-500 hover:text-red-500 shrink-0"
              title="إلغاء جميع الفلاتر"
            >
              <X size={14} />
              مسح التصفية
            </Button>
          )}
        </div>

        {/* GUID Direct Lookup hint if user types a GUID that is not currently shown */}
        {searchTerm.trim().length >= 32 &&
          filteredReceipts.length === 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs">
              <span className="text-blue-800 dark:text-blue-300">
                يبدو أنك تبحث عن معرف إيصال محدد (ID). هل ترغب في جلب بياناته مباشرة من الخادم؟
              </span>
              <Button
                variant="secondary"
                loading={lookupLoading}
                onClick={() => handleDirectLookup(searchTerm)}
                className="h-8 text-xs shrink-0"
              >
                جلب الإيصال بالمعرّف
              </Button>
            </div>
          )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="ghost"
            onClick={loadReceipts}
            className="text-xs text-red-700 dark:text-red-300 hover:underline"
          >
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Receipts Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 font-bold">
            <tr>
              <th className="p-3.5">رقم الإيصال / المعرّف</th>
              <th className="p-3.5">المورد</th>
              <th className="p-3.5">رقم فاتورة المورد</th>
              <th className="p-3.5">تاريخ الفاتورة</th>
              <th className="p-3.5">المستودع المستلم</th>
              <th className="p-3.5 text-center">عدد الأصناف</th>
              <th className="p-3.5 text-left">قيمة تقييم المخزون</th>
              <th className="p-3.5 text-left">إجمالي الفاتورة</th>
              <th className="p-3.5 text-center">وثيقة وتفاصيل الفاتورة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-[#1167c9]" />
                    <span className="font-medium">جارٍ تحميل فواتير وإيصالات المشتريات من الخادم...</span>
                  </div>
                </td>
              </tr>
            ) : filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
                    <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <FileText size={24} />
                    </div>
                    {hasActiveFilters ? (
                      <>
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                          لا توجد نتائج مطابقة لخيارات البحث والتصفية
                        </p>
                        <p className="text-xs text-slate-500">
                          جرّب تغيير كلمات البحث أو إعادة ضبط خيارات المستودع والمورد.
                        </p>
                        <Button
                          variant="secondary"
                          onClick={resetFilters}
                          className="text-xs mt-2"
                        >
                          إعادة تعيين خيارات البحث
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                          لا توجد إيصالات مشتريات مسجلة حتى الآن
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          يمكنك البدء بتسجيل أول إيصال استلام مشتريات وإرفاق الفاتورة ليتم تحديث تكلفة ومخزون الأصناف تلقائياً.
                        </p>
                        {canManage && (
                          <Button
                            variant="primary"
                            onClick={() => setCreateModalOpen(true)}
                            className="text-xs mt-2"
                          >
                            <PlusCircle size={14} />
                            تسجيل إيصال مشتريات جديد الآن
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredReceipts.map((rcpt) => (
                <tr
                  key={rcpt.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  {/* Receipt Number & Copy ID */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#1167c9] dark:text-blue-400">
                        {rcpt.receiptNumber || "—"}
                      </span>
                      {rcpt.id && (
                        <button
                          type="button"
                          onClick={() => handleCopyId(rcpt.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                          title={`نسخ المعرف: ${rcpt.id}`}
                        >
                          {copiedId === rcpt.id ? (
                            <Check size={12} className="text-green-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                    {rcpt.id && (
                      <span
                        className="block font-mono text-[10px] text-slate-400 truncate max-w-[140px]"
                        title={rcpt.id}
                      >
                        ID: {rcpt.id}
                      </span>
                    )}
                  </td>

                  {/* Supplier */}
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {rcpt.supplierNameAr || "—"}
                  </td>

                  {/* Supplier Invoice Number */}
                  <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                    {rcpt.supplierInvoiceNumber || "—"}
                  </td>

                  {/* Invoice Date */}
                  <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">
                    {rcpt.invoiceDate ? formatDate(rcpt.invoiceDate) : "—"}
                  </td>

                  {/* Location */}
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span>{rcpt.inventoryLocationNameAr || "—"}</span>
                    </div>
                  </td>

                  {/* Lines Count */}
                  <td className="p-3.5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {rcpt.lines?.length || 0} بنود
                    </span>
                  </td>

                  {/* Valuation Amount */}
                  <td className="p-3.5 text-left font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(rcpt.inventoryValuationAmount || 0)}
                  </td>

                  {/* Total Amount */}
                  <td className="p-3.5 text-left font-mono font-black text-slate-900 dark:text-white">
                    {formatCurrency(rcpt.totalAmount || 0)}
                  </td>

                  {/* Attached Bill & Details Buttons */}
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap sm:flex-nowrap">
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenBill(rcpt)}
                        className="h-8 px-2.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
                        title={rcpt.attachment?.originalFileName || "عرض وثيقة الفاتورة المرفقة"}
                      >
                        <FileText size={13} className="text-[#1167c9]" />
                        <span>عرض الفاتورة</span>
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => handleOpenDetails(rcpt)}
                        className="h-8 px-2.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap bg-blue-50 text-[#1167c9] hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800"
                        title="عرض تفاصيل الفاتورة والأصناف"
                      >
                        <Receipt size={13} />
                        <span>تفاصيل الفاتورة</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <CreateReceiptModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSaved={handleReceiptCreated}
        locations={locations}
        suppliers={suppliers}
        items={items}
      />

      <BillViewerModal
        isOpen={billModalOpen}
        onClose={() => {
          setBillModalOpen(false);
          setViewingReceipt(null);
        }}
        receiptId={viewingReceipt?.id || null}
        receiptNumber={viewingReceipt?.receiptNumber}
        originalFileName={viewingReceipt?.attachment?.originalFileName}
      />

      <ReceiptDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setViewingDetailsReceipt(null);
        }}
        receipt={viewingDetailsReceipt}
        items={items}
        suppliers={suppliers}
        locations={locations}
        onViewBillDoc={(rcpt) => {
          handleOpenBill(rcpt);
        }}
      />
    </div>
  );
}

