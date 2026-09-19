"use client";

import React, { useState, useRef } from "react";
import type { HearingFile } from "@/lib/hr/legal-cases-api";
import {
  uploadHearingFile,
  downloadHearingFile,
  archiveHearingFile,
} from "@/lib/hr/legal-cases-api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LegalCaseArchiveModal } from "./LegalCaseArchiveModal";
import { toast } from "@/components/ui/Toast";
import {
  FileText,
  FileImage,
  Upload,
  Download,
  Trash2,
  Paperclip,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

interface HearingFilesCardProps {
  caseId: string;
  hearingId: string;
  hearingNumber: number;
  files: HearingFile[];
  onFilesChanged: () => void;
}

const MAX_FILES_PER_HEARING = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
];

export function HearingFilesCard({
  caseId,
  hearingId,
  hearingNumber,
  files,
  onFilesChanged,
}: HearingFilesCardProps) {
  const { can } = useAuth();
  const canManage = can("legal_cases.manage");
  const canDownload = can("legal_cases.files.download");

  const [uploading, setUploading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [fileToArchive, setFileToArchive] = useState<HearingFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (contentType?: string, fileName?: string) => {
    const isImage =
      contentType?.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|bmp)$/i.test(fileName || "");
    if (isImage) {
      return <FileImage className="size-5 text-purple-600 dark:text-purple-400" />;
    }
    return <FileText className="size-5 text-blue-600 dark:text-blue-400" />;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("حجم الملف كبير جداً", "الحد الأقصى المسموح به للملف هو 10 ميجابايت");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Check extension
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(
        "صيغة الملف غير مدعومة",
        "الصيغ المقبولة هي: PDF, JPEG, PNG, WebP, GIF, BMP"
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("يرجى اختيار ملف", "اختر ملفاً لرفعه");
      return;
    }

    if (files.length >= MAX_FILES_PER_HEARING) {
      toast.error(
        "تم بلوغ الحد الأقصى",
        "لا يمكن رفع أكثر من 5 ملفات نشطة للجلسة الواحدة"
      );
      return;
    }

    setUploading(true);
    try {
      await uploadHearingFile(caseId, hearingId, selectedFile, description);
      setSelectedFile(null);
      setDescription("");
      setShowUploadForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onFilesChanged();
    } catch (err: any) {
      console.error("Failed to upload file:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: HearingFile) => {
    if (!canDownload) {
      toast.error("غير مصرح", "لا تملك صلاحية تنزيل مرفقات الجلسات");
      return;
    }

    setDownloadingFileId(file.id);
    try {
      const { blob, fileName } = await downloadHearingFile(caseId, hearingId, file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || file.fileName || "hearing-document";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Failed to download file:", err);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleArchiveConfirm = async (reason: string) => {
    if (!fileToArchive) return;
    await archiveHearingFile(caseId, hearingId, fileToArchive.id, {
      rowVersion: fileToArchive.rowVersion,
      reason,
    });
    setFileToArchive(null);
    onFilesChanged();
  };

  const isLimitReached = files.length >= MAX_FILES_PER_HEARING;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-[var(--muted)]" />
          <h4 className="text-xs font-semibold text-[var(--foreground)]">
            مرفقات ووثائق الجلسة
          </h4>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isLimitReached
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {files.length} / {MAX_FILES_PER_HEARING} ملفات
          </span>
        </div>

        {canManage && !isLimitReached && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="text-xs flex items-center gap-1.5 h-8 px-2.5"
          >
            <Upload className="size-3.5" />
            {showUploadForm ? "إلغاء الرفع" : "إرفاق ملف"}
          </Button>
        )}
      </div>

      {/* Upload Form Box */}
      {showUploadForm && canManage && (
        <form
          onSubmit={handleUploadSubmit}
          className="p-3.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-800/60 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp"
              onChange={handleFileSelect}
              className="block w-full text-xs text-slate-500 file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            />
            {selectedFile && (
              <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف اختياري للملف (مثال: محضر الجلسة، مذكرة جوابية...)"
              className="text-xs"
              disabled={uploading}
            />
            <Button
              type="submit"
              variant="primary"
              loading={uploading}
              disabled={!selectedFile || uploading}
              className="whitespace-nowrap w-full sm:w-auto text-xs h-9 px-3"
            >
              رفع الملف
            </Button>
          </div>

          <p className="text-[11px] text-[var(--muted)]">
            الحد الأقصى: 10 ميجابايت. الصيغ المقبولة: PDF, JPEG, PNG, WebP, GIF, BMP.
          </p>
        </form>
      )}

      {/* Files List */}
      {files.length === 0 ? (
        <div className="py-4 text-center text-xs text-[var(--muted)] bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-[var(--border)]">
          لا توجد مرفقات مرفوعة لهذه الجلسة حتى الآن.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                  {getFileIcon(file.contentType, file.fileName)}
                </div>
                <div className="overflow-hidden">
                  <p
                    className="text-xs font-medium text-[var(--foreground)] truncate max-w-[170px] sm:max-w-[190px]"
                    title={file.fileName}
                  >
                    {file.fileName}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                    <span>{formatFileSize(file.fileSize)}</span>
                    {file.description && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[110px]" title={file.description}>
                          {file.description}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canDownload && (
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    disabled={downloadingFileId === file.id}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                    title="تنزيل الملف"
                  >
                    <Download className="size-4" />
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setFileToArchive(file)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    title="أرشفة الملف"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archive File Modal */}
      <LegalCaseArchiveModal
        isOpen={!!fileToArchive}
        onClose={() => setFileToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="أرشفة مرفق الجلسة"
        itemDescription={`هل أنت متأكد من رغبتك في أرشفة الملف "${fileToArchive?.fileName}"؟ لن يكون متاحاً للتنزيل بعد الأرشفة.`}
      />
    </div>
  );
}
