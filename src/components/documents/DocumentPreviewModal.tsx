"use client";

import { X, FileText, Download } from "lucide-react";
import { Button } from "../ui/Button";

export function DocumentPreviewModal({
  isOpen,
  onClose,
  title,
  url,
  contentType,
  onDownload,
  locale = "ar",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  contentType: string;
  onDownload?: () => void;
  locale?: "ar" | "en";
}) {
  if (!isOpen) return null;

  const isEn = locale === "en";
  const isImage = contentType.startsWith("image/");
  const isPdf = contentType.includes("pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col h-[85vh] w-full max-w-4xl rounded-2xl bg-[var(--surface)] p-5 shadow-2xl overflow-hidden border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[var(--foreground)]">{title}</h3>
              <p className="text-xs font-mono text-[var(--muted)]">{contentType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="secondary" onClick={onDownload} className="h-8 px-3 text-xs gap-1.5">
                <Download size={14} />
                {isEn ? "Download" : "تنزيل"}
              </Button>
            )}
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={isEn ? "Close" : "إغلاق"}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-xl bg-slate-950/10 p-2 flex items-center justify-center">
          {isImage ? (
            <img
              src={url}
              alt={title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-md"
            />
          ) : isPdf ? (
            <iframe src={url} title={title} className="h-full w-full rounded-lg bg-white border-0" />
          ) : (
            <div className="text-center p-8">
              <FileText size={48} className="mx-auto text-[var(--muted)] mb-3" />
              <p className="text-sm font-bold text-[var(--foreground)]">
                {isEn ? "Preview is not supported for this format." : "المعاينة التفاعلية غير مدعومة لهذا الامتداد."}
              </p>
              {onDownload && (
                <Button onClick={onDownload} className="mt-4 gap-2">
                  <Download size={16} />
                  {isEn ? "Download File to View" : "تنزيل الملف للمعاينة"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
