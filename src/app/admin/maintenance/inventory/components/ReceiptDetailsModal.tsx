"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  FileText,
  Download,
  Printer,
  Building2,
  Receipt,
  Eye,
  Loader2,
  Package,
  Boxes,
  CheckCircle2,
  Check,
  Copy,
  Droplet,
  Car,
  Bike,
} from "lucide-react";
import { getPurchaseReceipt, downloadReceiptBillFile } from "@/lib/maintenance/api";
import type {
  PurchaseReceipt,
  PurchaseReceiptLine,
  MaintenanceLocation,
  InventoryItem,
  Supplier,
  OilBarrel,
} from "@/lib/maintenance/types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getUnitOfMeasureLabel,
  getItemTypeBadgeStyle,
  getOilBarrelStatusLabel,
  oilBarrelStatusConfig,
  oilBarrelVehicleTypeConfig,
  sharedOilBarrelVehicleTypeConfig,
} from "@/lib/maintenance/constants";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ReceiptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PurchaseReceipt | null;
  items: InventoryItem[];
  suppliers: Supplier[];
  locations: MaintenanceLocation[];
  onViewBillDoc?: (receipt: PurchaseReceipt) => void;
}

export function ReceiptDetailsModal({
  isOpen,
  onClose,
  receipt,
  items,
  suppliers,
  locations,
  onViewBillDoc,
}: ReceiptDetailsModalProps) {
  const { locale } = useAuth();
  const isEn = locale === "en";

  const [activeReceipt, setActiveReceipt] = useState<PurchaseReceipt | null>(receipt);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Sync with prop when opened or receipt changes
  useEffect(() => {
    if (!isOpen || !receipt) {
      setActiveReceipt(null);
      return;
    }

    setActiveReceipt(receipt);

    // Fetch full server details if receipt has an ID to ensure all lines & details are up-to-date
    if (receipt.id) {
      setLoading(true);
      getPurchaseReceipt(receipt.id)
        .then((fullData) => {
          if (fullData) {
            setActiveReceipt((prev) => ({
              ...(prev || receipt),
              ...fullData,
              // Preserve enriched names if missing
              supplierNameAr:
                fullData.supplierNameAr ||
                prev?.supplierNameAr ||
                receipt.supplierNameAr,
              inventoryLocationNameAr:
                fullData.inventoryLocationNameAr ||
                prev?.inventoryLocationNameAr ||
                receipt.inventoryLocationNameAr,
            }));
          }
        })
        .catch((err) => {
          console.warn("Could not fetch extended receipt details, using initial data:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, receipt]);

  // Match supplier info
  const supplierInfo = useMemo(() => {
    if (!activeReceipt) return null;
    return (
      suppliers.find(
        (s) =>
          s.id === activeReceipt.supplierId ||
          s.supplierNumber === activeReceipt.supplierId ||
          s.legalNameAr === activeReceipt.supplierNameAr ||
          s.legalNameEn === activeReceipt.supplierNameAr
      ) || null
    );
  }, [suppliers, activeReceipt]);

  // Match warehouse info
  const locationInfo = useMemo(() => {
    if (!activeReceipt) return null;
    return (
      locations.find(
        (l) =>
          l.id === activeReceipt.inventoryLocationId ||
          l.nameAr === activeReceipt.inventoryLocationNameAr ||
          l.nameEn === activeReceipt.inventoryLocationNameAr
      ) || null
    );
  }, [locations, activeReceipt]);

  // Copy ID to clipboard
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.info(
        isEn ? "Copied" : "تم النسخ",
        isEn ? "Invoice ID copied to clipboard" : "تم نسخ معرف الفاتورة إلى الحافظة"
      );
    } catch {
      // Fallback
    }
  };

  // Download Bill Attachment
  const handleDownloadAttachment = async () => {
    if (!activeReceipt?.id) return;
    setDownloading(true);
    try {
      const res = await downloadReceiptBillFile(activeReceipt.id);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        activeReceipt.attachment?.originalFileName ||
        res.fileName ||
        `Bill-${activeReceipt.receiptNumber || activeReceipt.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        isEn ? "Downloaded" : "تم التنزيل",
        isEn ? "Invoice document downloaded successfully" : "تم تنزيل وثيقة الفاتورة بنجاح"
      );
    } catch (err: any) {
      toast.error(
        isEn ? "Download failed" : "فشل التنزيل",
        err?.message || (isEn ? "Could not download attached invoice file." : "تعذر تنزيل ملف الفاتورة المرفق.")
      );
    } finally {
      setDownloading(false);
    }
  };

  // Print invoice summary
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !activeReceipt) return null;

  const lines = Array.isArray(activeReceipt.lines) ? activeReceipt.lines : [];
  const barrels: OilBarrel[] = Array.isArray(activeReceipt.oilBarrels)
    ? activeReceipt.oilBarrels
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-5xl"
    >
      <div dir={isEn ? "ltr" : "rtl"} className="space-y-6 -mt-2 print:space-y-4 text-start">
        {/* Modal Header & Quick Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1167c9] flex items-center justify-center border border-blue-200 dark:border-blue-900 shrink-0">
                <Receipt size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isEn ? "Purchase Receipt & Invoice Details" : "تفاصيل فاتورة وإيصال المشتريات"}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 size={12} />
                    {isEn ? "Recorded & Received" : "مسجل ومستلم"}
                  </span>
                  {loading && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                      <Loader2 size={12} className="animate-spin" />
                      {isEn ? "Updating..." : "جارٍ التحديث..."}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{isEn ? "Receipt #:" : "رقم الإيصال:"}</span>
                  <span className="font-mono font-bold text-[#1167c9] dark:text-blue-400 text-sm">
                    {activeReceipt.receiptNumber || "—"}
                  </span>
                  {activeReceipt.id && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                      <span>• ID:</span>
                      <span className="truncate max-w-[120px]" title={activeReceipt.id}>
                        {activeReceipt.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(activeReceipt.id)}
                        className="p-1 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                        title={isEn ? "Copy ID" : "نسخ المعرف"}
                      >
                        {copiedId ? (
                          <Check size={12} className="text-green-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            {onViewBillDoc && (
              <Button
                variant="secondary"
                onClick={() => onViewBillDoc(activeReceipt)}
                className="h-9 text-xs inline-flex items-center gap-1.5"
                title={isEn ? "Preview original attached invoice file" : "معاينة وثيقة الفاتورة الأصلية المرفقة"}
              >
                <Eye size={14} className="text-[#1167c9]" />
                <span>{isEn ? "Preview Document" : "معاينة الوثيقة"}</span>
              </Button>
            )}

            {activeReceipt.attachment && (
              <Button
                variant="secondary"
                onClick={handleDownloadAttachment}
                loading={downloading}
                className="h-9 text-xs inline-flex items-center gap-1.5"
                title={isEn ? "Download invoice file" : "تنزيل ملف الفاتورة"}
              >
                <Download size={14} />
                <span>{isEn ? "Download Invoice" : "تنزيل الفاتورة"}</span>
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={handlePrint}
              className="h-9 text-xs inline-flex items-center gap-1.5"
              title={isEn ? "Print invoice details" : "طباعة تفاصيل الفاتورة"}
            >
              <Printer size={14} />
              <span>{isEn ? "Print" : "طباعة"}</span>
            </Button>
          </div>
        </div>

        {/* Top Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Supplier Info */}
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs pb-1.5 border-b border-[var(--border)]">
              <Building2 size={15} className="text-[#1167c9]" />
              <span>{isEn ? "Supplier Information" : "بيانات المورد"}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isEn ? "Supplier Name:" : "اسم المورد:"}</span>
                <span className="font-bold text-slate-900 dark:text-white text-start">
                  {isEn
                    ? (supplierInfo?.legalNameEn || activeReceipt.supplierNameAr || supplierInfo?.legalNameAr || "Unspecified Supplier")
                    : (activeReceipt.supplierNameAr || supplierInfo?.legalNameAr || supplierInfo?.legalNameEn || "مورد غير محدد")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isEn ? "Supplier Invoice #:" : "رقم فاتورة المورد:"}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {activeReceipt.supplierInvoiceNumber || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isEn ? "Invoice Date:" : "تاريخ الفاتورة:"}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {activeReceipt.invoiceDate ? formatDate(activeReceipt.invoiceDate, isEn) : "—"}
                </span>
              </div>
              {supplierInfo?.vatNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{isEn ? "Tax / VAT #:" : "الرقم الضريبي:"}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {supplierInfo.vatNumber}
                  </span>
                </div>
              )}
              {supplierInfo?.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{isEn ? "Contact Phone:" : "هاتف التواصل:"}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {supplierInfo.phone}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Warehouse & Receipt Info */}
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs pb-1.5 border-b border-[var(--border)]">
              <Boxes size={15} className="text-[#1167c9]" />
              <span>{isEn ? "Warehouse & Receiving" : "المستودع والاستلام"}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isEn ? "Receiving Warehouse:" : "المستودع المستلم:"}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {isEn
                    ? (locationInfo?.nameEn || activeReceipt.inventoryLocationNameAr || locationInfo?.nameAr || "Unspecified Warehouse")
                    : (activeReceipt.inventoryLocationNameAr || locationInfo?.nameAr || locationInfo?.nameEn || "مستودع غير محدد")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isEn ? "Received At:" : "تاريخ ووقت الاستلام:"}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {activeReceipt.receivedAtUtc ? formatDateTime(activeReceipt.receivedAtUtc, isEn) : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isEn ? "Invoice Currency:" : "عملة الفاتورة:"}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activeReceipt.currencyCode || "SAR"} ({isEn ? "SAR" : "ر.س"})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isEn ? "Item Lines Count:" : "عدد بنود الأصناف:"}</span>
                <span className="font-mono font-bold text-[#1167c9] dark:text-blue-400">
                  {lines.length} {isEn ? (lines.length === 1 ? "line" : "lines") : (lines.length === 1 ? "بند" : "بنود")}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Attached Bill Document */}
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs pb-1.5 border-b border-[var(--border)]">
              <FileText size={15} className="text-[#1167c9]" />
              <span>{isEn ? "Attached Invoice Document" : "وثيقة الفاتورة المرفقة"}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {activeReceipt.attachment ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">{isEn ? "File Name:" : "اسم الملف:"}</span>
                    <span
                      className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[150px]"
                      title={activeReceipt.attachment.originalFileName}
                    >
                      {activeReceipt.attachment.originalFileName}
                    </span>
                  </div>
                  {activeReceipt.attachment.fileSizeBytes > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{isEn ? "File Size:" : "حجم الملف:"}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {(activeReceipt.attachment.fileSizeBytes / 1024).toFixed(1)} {isEn ? "KB" : "كيلوبايت"}
                      </span>
                    </div>
                  )}
                  {activeReceipt.attachment.contentType && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">{isEn ? "File Type:" : "نوع الملف:"}</span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {activeReceipt.attachment.contentType}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 flex items-center gap-2">
                    {onViewBillDoc && (
                      <button
                        type="button"
                        onClick={() => onViewBillDoc(activeReceipt)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1167c9] dark:bg-blue-950/50 dark:text-blue-300 font-bold text-[11px] inline-flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye size={12} />
                        {isEn ? "Preview Document" : "معاينة الوثيقة"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDownloadAttachment}
                      disabled={downloading}
                      className="flex-1 py-1.5 px-2 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] inline-flex items-center justify-center gap-1 transition-colors"
                    >
                      {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      {isEn ? "Download File" : "تنزيل الملف"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-slate-400 space-y-1">
                  <FileText size={22} className="mx-auto opacity-50" />
                  <p className="text-[11px]">{isEn ? "No attachment for this invoice" : "لا يوجد ملف مرفق لهذه الفاتورة"}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Highlights (Summary Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Subtotal */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/40 dark:bg-slate-900/20">
            <span className="block text-[11px] text-slate-500 font-medium mb-1">
              {isEn ? "Subtotal" : "المجموع الفرعي"}
            </span>
            <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(activeReceipt.subtotal || 0, isEn)}
            </span>
          </div>

          {/* Discount */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/40 dark:bg-slate-900/20">
            <span className="block text-[11px] text-slate-500 font-medium mb-1">
              {isEn ? "Total Discount" : "إجمالي الخصم"}
            </span>
            <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {activeReceipt.discountAmount > 0 ? `-${formatCurrency(activeReceipt.discountAmount, isEn)}` : formatCurrency(0, isEn)}
            </span>
          </div>

          {/* Tax Amount */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/40 dark:bg-slate-900/20">
            <span className="block text-[11px] text-slate-500 font-medium mb-1">
              {isEn ? "VAT (Tax)" : "ضريبة القيمة المضافة"}
            </span>
            <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(activeReceipt.taxAmount || 0, isEn)}
            </span>
          </div>

          {/* Valuation Amount */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/40 dark:bg-slate-900/20">
            <span className="block text-[11px] text-slate-500 font-medium mb-1">
              {isEn ? "Inventory Valuation" : "تقييم المخزون"}
            </span>
            <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
              {formatCurrency(activeReceipt.inventoryValuationAmount || 0, isEn)}
            </span>
          </div>

          {/* Total Invoice Amount */}
          <div className="col-span-2 sm:col-span-1 p-3 rounded-xl border-2 border-[#1167c9]/30 bg-blue-50/40 dark:bg-blue-950/30">
            <span className="block text-[11px] text-[#1167c9] dark:text-blue-300 font-bold mb-1">
              {isEn ? "Net Invoice Total" : "إجمالي الفاتورة الصافي"}
            </span>
            <span className="text-base font-mono font-black text-[#1167c9] dark:text-blue-400">
              {formatCurrency(activeReceipt.totalAmount || 0, isEn)}
            </span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package size={16} className="text-[#1167c9]" />
              <span>{isEn ? `Invoice Items & Lines (${lines.length})` : `بنود وأصناف الفاتورة (${lines.length})`}</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-normal">
              {isEn
                ? "Received items, purchase units, and recorded unit costs"
                : "الأصناف المستلمة ووحدات الشراء وتكاليف الوحدات المسجلة"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 font-bold">
                <tr>
                  <th className="p-3 text-center w-10">#</th>
                  <th className="p-3 text-start">{isEn ? "Received Item" : "الصنف المستلم"}</th>
                  <th className="p-3 text-start">{isEn ? "SKU Code" : "رمز SKU"}</th>
                  <th className="p-3 text-center">{isEn ? "Purchase Unit" : "وحدة الشراء"}</th>
                  <th className="p-3 text-center">{isEn ? "Package Count" : "عدد العبوات"}</th>
                  <th className="p-3 text-center">{isEn ? "Package Capacity" : "سعة العبوة"}</th>
                  <th className="p-3 text-center">{isEn ? "Base Qty" : "الكمية الأساسية"}</th>
                  <th className="p-3 text-end">{isEn ? "Package Price" : "سعر شراء العبوة"}</th>
                  <th className="p-3 text-end">{isEn ? "Subtotal" : "المجموع الفرعي"}</th>
                  <th className="p-3 text-end">{isEn ? "Discount" : "الخصم"}</th>
                  <th className="p-3 text-end">{isEn ? "VAT" : "الضريبة"}</th>
                  <th className="p-3 text-end">{isEn ? "Base Unit Cost" : "تكلفة الوحدة"}</th>
                  <th className="p-3 text-start">{isEn ? "Lot / Expiry" : "التشغيلة / الصلاحية"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-400">
                      {isEn ? "No detailed lines recorded for this receipt" : "لا توجد بنود مفصلة مسجلة في هذا الإيصال"}
                    </td>
                  </tr>
                ) : (
                  lines.map((line: PurchaseReceiptLine, idx: number) => {
                    const matchedItem = items.find(
                      (i) => i.id === line.inventoryItemId || i.sku === line.sku
                    );
                    const itemName = isEn
                      ? (matchedItem?.nameEn || matchedItem?.nameAr || line.sku || `Line ${idx + 1}`)
                      : (matchedItem?.nameAr || matchedItem?.nameEn || line.sku || `بند ${idx + 1}`);
                    const purchaseUnitLabel = getUnitOfMeasureLabel(line.purchaseUnit, isEn);
                    const baseUnitLabel = getUnitOfMeasureLabel(line.baseUnitOfMeasure, isEn);
                    const typeStyle = matchedItem?.itemType
                      ? getItemTypeBadgeStyle(matchedItem.itemType, isEn)
                      : null;

                    return (
                      <tr
                        key={line.id || idx}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="p-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Item Name & Type */}
                        <td className="p-3 text-start">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {itemName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {typeStyle && (
                              <span
                                className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}
                              >
                                {typeStyle.label}
                              </span>
                            )}
                            {matchedItem?.barcode && (
                              <span className="font-mono text-[10px] text-slate-400">
                                {isEn ? `Barcode: ${matchedItem.barcode}` : `باركود: ${matchedItem.barcode}`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300 text-start">
                          {line.sku || matchedItem?.sku || "—"}
                        </td>

                        {/* Purchase Unit */}
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {purchaseUnitLabel}
                          </span>
                        </td>

                        {/* Package Count */}
                        <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {line.packageCount}
                        </td>

                        {/* Declared Qty Per Package */}
                        <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                          {line.declaredQuantityPerPackage}
                        </td>

                        {/* Received Base Quantity */}
                        <td className="p-3 text-center font-mono font-bold text-[#1167c9] dark:text-blue-400">
                          {line.receivedBaseQuantity} {baseUnitLabel}
                        </td>

                        {/* Package Unit Price */}
                        <td className="p-3 text-end font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatCurrency(line.packageUnitPrice || 0, isEn)}
                        </td>

                        {/* Subtotal */}
                        <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(line.lineSubtotal || 0, isEn)}
                        </td>

                        {/* Discount */}
                        <td className="p-3 text-end font-mono text-emerald-600 dark:text-emerald-400">
                          {line.discountAmount > 0
                            ? `-${formatCurrency(line.discountAmount, isEn)}`
                            : formatCurrency(0, isEn)}
                        </td>

                        {/* Tax */}
                        <td className="p-3 text-end font-mono text-amber-600 dark:text-amber-400">
                          {line.taxAmount > 0
                            ? formatCurrency(line.taxAmount, isEn)
                            : formatCurrency(0, isEn)}
                        </td>

                        {/* Base Unit Cost */}
                        <td className="p-3 text-end font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                          {formatCurrency(line.baseUnitCost || 0, isEn)}
                        </td>

                        {/* Lot / Expiry Date */}
                        <td className="p-3 text-slate-600 dark:text-slate-300 text-start">
                          {line.lotNumber || line.expiryDate ? (
                            <div className="space-y-0.5 text-[11px]">
                              {line.lotNumber && (
                                <div>
                                  <span className="text-slate-400">{isEn ? "Lot: " : "تشغيلة: "}</span>
                                  <span className="font-mono font-bold">{line.lotNumber}</span>
                                </div>
                              )}
                              {line.expiryDate && (
                                <div>
                                  <span className="text-slate-400">{isEn ? "Exp: " : "صلاحية: "}</span>
                                  <span className="font-mono">{formatDate(line.expiryDate, isEn)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {lines.length > 0 && (
                <tfoot className="border-t-2 border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 font-bold">
                  <tr>
                    <td colSpan={4} className="p-3 text-start">
                      {isEn ? "Grand Totals:" : "المجاميع الإجمالية:"}
                    </td>
                    <td className="p-3 text-center font-mono">
                      {lines.reduce((s, l) => s + (l.packageCount || 0), 0)}
                    </td>
                    <td></td>
                    <td className="p-3 text-center font-mono text-[#1167c9] dark:text-blue-400">
                      {lines.reduce((s, l) => s + (l.receivedBaseQuantity || 0), 0)}
                    </td>
                    <td></td>
                    <td className="p-3 text-end font-mono">
                      {formatCurrency(activeReceipt.subtotal || 0, isEn)}
                    </td>
                    <td className="p-3 text-end font-mono text-emerald-600">
                      {formatCurrency(activeReceipt.discountAmount || 0, isEn)}
                    </td>
                    <td className="p-3 text-end font-mono text-amber-600">
                      {formatCurrency(activeReceipt.taxAmount || 0, isEn)}
                    </td>
                    <td colSpan={2} className="p-3 text-end font-mono text-base font-black text-[#1167c9] dark:text-blue-400">
                      {formatCurrency(activeReceipt.totalAmount || 0, isEn)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Oil Barrels Section (if any barrels linked) */}
        {barrels.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Droplet size={16} className="text-amber-600" />
              <span>{isEn ? `Oil Barrels Recorded under this Receipt (${barrels.length})` : `براميل الزيت المسجلة تحت هذا الإيصال (${barrels.length})`}</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-[var(--border)] bg-amber-50/40 dark:bg-amber-950/20 text-slate-700 dark:text-slate-200 font-bold">
                  <tr>
                    <th className="p-2.5 text-start">{isEn ? "Barrel No. / Barcode" : "رقم / باركود البرميل"}</th>
                    <th className="p-2.5 text-center">{isEn ? "Allowed Vehicle" : "النوع المسموح"}</th>
                    <th className="p-2.5 text-center">{isEn ? "Nominal Capacity" : "السعة الاسمية"}</th>
                    <th className="p-2.5 text-center">{isEn ? "Current Remaining" : "المتبقي الحالي"}</th>
                    <th className="p-2.5 text-end">{isEn ? "Liter Price" : "سعر اللتر"}</th>
                    <th className="p-2.5 text-center">{isEn ? "Status" : "الحالة"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {barrels.map((barrel) => {
                    const statusLabel = getOilBarrelStatusLabel(barrel.status, isEn);
                    const statusConf = oilBarrelStatusConfig[barrel.status];
                    const isShared = Boolean(barrel.allowBothVehicleTypes);
                    const typeConf =
                      !isShared &&
                      barrel.allowedVehicleType !== undefined &&
                      barrel.allowedVehicleType !== null
                        ? oilBarrelVehicleTypeConfig[barrel.allowedVehicleType]
                        : null;

                    return (
                      <tr key={barrel.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white text-start">
                          {barrel.barrelNumber}
                        </td>
                        <td className="p-2.5 text-center">
                          {isShared ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sharedOilBarrelVehicleTypeConfig.bg} ${sharedOilBarrelVehicleTypeConfig.text} border ${sharedOilBarrelVehicleTypeConfig.border}`}
                            >
                              <Car size={10} />
                              <Bike size={10} />
                              {isEn ? sharedOilBarrelVehicleTypeConfig.badgeEn : sharedOilBarrelVehicleTypeConfig.badgeAr}
                            </span>
                          ) : typeConf ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${typeConf.bg} ${typeConf.text} border ${typeConf.border}`}
                            >
                              {isEn ? (typeConf.badgeEn || typeConf.labelEn) : (typeConf.badgeAr || typeConf.labelAr)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">{isEn ? "Unspecified" : "غير محدد"}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {barrel.nominalCapacityLiters} {isEn ? "L" : "لتر"}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-[#1167c9]">
                          {barrel.remainingLiters} {isEn ? "L" : "لتر"}
                        </td>
                        <td className="p-2.5 text-end font-mono">
                          {formatCurrency(barrel.unitCostPerLiter || 0, isEn)}
                        </td>
                        <td className="p-2.5 text-center">
                          {statusConf && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConf.bg} ${statusConf.text} border ${statusConf.border}`}
                            >
                              {statusLabel}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] print:hidden">
          <div className="text-xs text-slate-400">
            {isEn
              ? "The receipt is registered and inventory valuation logs are up to date."
              : "تم تسجيل الإيصال في النظام وتحديث سجل التكاليف والمخزون بنجاح."}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} className="text-xs px-5">
              {isEn ? "Close Window" : "إغلاق النافذة"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

