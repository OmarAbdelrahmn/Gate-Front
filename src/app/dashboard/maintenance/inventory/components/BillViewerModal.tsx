"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Download, Loader2, FileText, AlertCircle } from "lucide-react";
import { downloadReceiptBillFile, previewReceiptBillFile } from "@/lib/maintenance/api";

interface BillViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: string | null;
  receiptNumber?: string;
  originalFileName?: string;
}

export function BillViewerModal({
  isOpen,
  onClose,
  receiptId,
  receiptNumber,
  originalFileName,
}: BillViewerModalProps) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !receiptId) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    previewReceiptBillFile(receiptId)
      .then((res) => {
        setBlobUrl(res.url);
        setContentType(res.contentType);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "تعذر تحميل ملف الفاتورة.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, receiptId]);

  const handleDownload = async () => {
    if (!receiptId) return;
    setDownloading(true);
    try {
      const res = await downloadReceiptBillFile(receiptId);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalFileName || res.fileName || `Bill-${receiptNumber || receiptId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "تعذر تنزيل الملف.");
    } finally {
      setDownloading(false);
    }
  };

  const isPdf = contentType.toLowerCase().includes("pdf");
  const isImage = contentType.toLowerCase().includes("image");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`فاتورة الشراء المرفقة: ${receiptNumber || ""}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[var(--border)] text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <FileText size={16} className="text-[#1167c9]" />
            <span className="font-bold font-mono">{originalFileName || "فاتورة الشراء"}</span>
          </div>
          <Button
            variant="secondary"
            onClick={handleDownload}
            loading={downloading}
            className="h-8 text-xs"
          >
            <Download size={14} />
            تنزيل الملف
          </Button>
        </div>

        {/* Viewer Content */}
        <div className="relative min-h-[450px] max-h-[70vh] overflow-hidden rounded-xl border border-[var(--border)] bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
              <Loader2 size={28} className="animate-spin text-[#1167c9]" />
              <span>جارٍ تحميل وثيقة الفاتورة المؤمنة...</span>
            </div>
          )}

          {error && (
            <div className="p-6 text-center text-xs text-red-600 dark:text-red-400 space-y-2">
              <AlertCircle size={28} className="mx-auto text-red-500" />
              <p className="font-bold">{error}</p>
              <Button variant="secondary" onClick={handleDownload} className="text-xs mt-2">
                محاولة التنزيل المباشر
              </Button>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <>
              {isPdf ? (
                <iframe
                  src={`${blobUrl}#toolbar=0`}
                  title="PDF Viewer"
                  className="size-full min-h-[500px] border-none rounded-xl"
                />
              ) : isImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={blobUrl}
                  alt="Bill attachment preview"
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl p-2"
                />
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 space-y-3">
                  <FileText size={36} className="mx-auto text-slate-400" />
                  <p>نوع الملف لا يدعم المعاينة المباشرة في المتصفح ({contentType}).</p>
                  <Button variant="primary" onClick={handleDownload} loading={downloading} className="text-xs">
                    تنزيل الملف لفتحه
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
