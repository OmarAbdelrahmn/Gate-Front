"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, FileText, Download, Eye, ExternalLink, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CreateReceiptModal } from "./CreateReceiptModal";
import { BillViewerModal } from "./BillViewerModal";
import { authFetch } from "@/lib/auth/api";
import type {
  PurchaseReceipt,
  MaintenanceLocation,
  InventoryItem,
  Supplier,
} from "@/lib/maintenance/types";
import { formatCurrency, formatDate } from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ReceiptsViewProps {
  locations: MaintenanceLocation[];
  suppliers: Supplier[];
  items: InventoryItem[];
}

export function ReceiptsView({ locations, suppliers, items }: ReceiptsViewProps) {
  const { can } = useAuth();
  const canManage = can("inventory.receipts.manage");

  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<PurchaseReceipt | null>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      // Backend returns list of receipts from /api/maintenance-inventory/receipts
      const data = await authFetch<PurchaseReceipt[]>("/api/maintenance-inventory/receipts").catch(
        () => [],
      );
      setReceipts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const handleOpenBill = (receipt: PurchaseReceipt) => {
    setViewingReceipt(receipt);
    setBillModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            إيصالات استلام المشتريات وفواتير التوريد
          </h2>
          <p className="text-xs text-slate-500">
            فواتير المشتريات المرفقة، إنشاء طبقات تكلفة FIFO للقطع، وإنشاء براميل الزيوت المستقلة لكل طرد.
          </p>
        </div>
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

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رقم الإيصال</th>
              <th className="p-3">المورد</th>
              <th className="p-3">رقم فاتورة المورد</th>
              <th className="p-3">تاريخ الفاتورة</th>
              <th className="p-3">المستودع المستلم</th>
              <th className="p-3 text-left">قيمة تقييم المخزون</th>
              <th className="p-3 text-left">إجمالي الفاتورة</th>
              <th className="p-3 text-center">الفاتورة المرفقة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  جارٍ تحميل إيصالات الاستلام...
                </td>
              </tr>
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  لا توجد إيصالات مشتريات مسجلة حتى الآن.
                </td>
              </tr>
            ) : (
              receipts.map((rcpt) => (
                <tr key={rcpt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3 font-mono font-bold text-[#1167c9] dark:text-blue-400">
                    {rcpt.receiptNumber}
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    {rcpt.supplierNameAr}
                  </td>
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                    {rcpt.supplierInvoiceNumber}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">
                    {formatDate(rcpt.invoiceDate)}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {rcpt.inventoryLocationNameAr}
                  </td>
                  <td className="p-3 text-left font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(rcpt.inventoryValuationAmount)}
                  </td>
                  <td className="p-3 text-left font-mono font-black text-slate-900 dark:text-white">
                    {formatCurrency(rcpt.totalAmount)}
                  </td>
                  <td className="p-3 text-center">
                    {rcpt.attachment ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenBill(rcpt)}
                        className="h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
                        title={rcpt.attachment.originalFileName}
                      >
                        <FileText size={13} className="text-[#1167c9]" />
                        <span>عرض الفاتورة</span>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => handleOpenBill(rcpt)}
                        className="h-8 px-2 text-xs text-slate-400"
                      >
                        معاينة
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateReceiptModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSaved={loadReceipts}
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
    </div>
  );
}
