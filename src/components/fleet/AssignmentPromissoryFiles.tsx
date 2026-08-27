"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRiderPromissoryFiles, downloadPromissoryFile } from "@/lib/fleet/api";
import { authPreviewBlob } from "@/lib/auth/api";
import type { RiderPromissoryFileResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import {
  FileText,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Lock,
} from "lucide-react";

interface AssignmentPromissoryFilesProps {
  riderProfileId: string;
  promissoryFileVersionIds?: string[];
  locale?: "ar" | "en";
  className?: string;
}

interface MatchedPromissoryFile {
  file: RiderPromissoryFileResponse;
  versionId?: string;
  isAssociatedVersion: boolean;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string | null, isEn = false): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(isEn ? "en-US" : "ar-SA");
  } catch {
    return dateStr;
  }
}

export function AssignmentPromissoryFiles({
  riderProfileId,
  promissoryFileVersionIds = [],
  locale = "ar",
  className = "",
}: AssignmentPromissoryFilesProps) {
  const { can, locale: authLocale } = useAuth();
  const activeLocale = locale || authLocale || "ar";
  const isEn = activeLocale === "en";

  const canDownload =
    can("fleet.files.download") ||
    can("promissory_notes.read") ||
    can("fleet.files.read") ||
    can("documents.download") ||
    can("fleet.assignments.read") ||
    can("riders.read") ||
    can("employees.read");

  const [files, setFiles] = useState<RiderPromissoryFileResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Preview Modal State
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    title: string;
    loading: boolean;
    url: string | null;
    contentType: string | null;
    error: string | null;
  }>({
    isOpen: false,
    title: "",
    loading: false,
    url: null,
    contentType: null,
    error: null,
  });

  useEffect(() => {
    if (!riderProfileId) return;

    setLoading(true);
    setError(null);

    getRiderPromissoryFiles(riderProfileId)
      .then((data) => {
        setFiles(data || []);
      })
      .catch((err) => {
        console.error("Failed to fetch rider promissory files:", err);
        setError(
          isEn
            ? "Failed to load promissory notes."
            : "تعذر تحميل ملفات سندات الأمر للمندوب."
        );
        setFiles([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [riderProfileId, isEn]);

  // Match files with promissoryFileVersionIds associated with the assignment
  const matchedFiles: MatchedPromissoryFile[] = useMemo(() => {
    if (!files.length) return [];

    const versionSet = new Set(promissoryFileVersionIds || []);

    if (versionSet.size === 0) {
      // Show all rider's promissory files if no specific version IDs specified
      return files.map((f) => ({
        file: f,
        versionId: f.currentVersionId || undefined,
        isAssociatedVersion: true,
      }));
    }

    const matched: MatchedPromissoryFile[] = [];
    const matchedFileIds = new Set<string>();

    // 1. First check files matching currentVersionId
    files.forEach((f) => {
      if (f.currentVersionId && versionSet.has(f.currentVersionId)) {
        matched.push({
          file: f,
          versionId: f.currentVersionId,
          isAssociatedVersion: true,
        });
        matchedFileIds.add(f.id);
      }
    });

    // 2. Check files matching file.id directly
    files.forEach((f) => {
      if (!matchedFileIds.has(f.id) && versionSet.has(f.id)) {
        matched.push({
          file: f,
          versionId: f.currentVersionId || undefined,
          isAssociatedVersion: true,
        });
        matchedFileIds.add(f.id);
      }
    });

    // 3. Fallback: If versionSet has items but no exact match found in currentVersionId,
    // present the rider's files with associated indicator or display versionId
    if (matched.length === 0) {
      return files.map((f) => ({
        file: f,
        versionId: f.currentVersionId || undefined,
        isAssociatedVersion: false,
      }));
    }

    return matched;
  }, [files, promissoryFileVersionIds]);

  const handleDownload = async (file: RiderPromissoryFileResponse, versionId?: string) => {
    if (!canDownload) {
      toast.error(
        isEn ? "Permission Denied" : "صلاحية غير كافية",
        isEn
          ? "You need permission to download promissory notes."
          : "تتطلب هذه العملية صلاحية تنزيل الملفات."
      );
      return;
    }

    try {
      const res = await downloadPromissoryFile(riderProfileId, file.id, versionId);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(res.blob);
      link.download =
        res.fileName || file.originalFileName || file.currentFileName || "promissory-note.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(
        isEn ? "Success" : "تم بنجاح",
        isEn ? "Promissory note downloaded successfully." : "تم تنزيل سند الأمر بنجاح."
      );
    } catch (e: any) {
      console.error("Failed to download promissory file:", e);
      toast.error(
        isEn ? "Download Failed" : "فشل التنزيل",
        e?.message || (isEn ? "Could not download promissory note." : "تعذر تنزيل سند الأمر.")
      );
    }
  };

  const handleOpenPreview = async (
    file: RiderPromissoryFileResponse,
    versionId?: string
  ) => {
    if (!canDownload) {
      toast.error(
        isEn ? "Permission Denied" : "صلاحية غير كافية",
        isEn
          ? "You need permission to preview promissory notes."
          : "تتطلب معاينة السندات توفر الصلاحية."
      );
      return;
    }

    const title = `${isEn ? "Preview Promissory Note: " : "معاينة سند الأمر: "}${
      file.originalFileName || file.currentFileName || "promissory-note.pdf"
    }`;

    setPreviewState({
      isOpen: true,
      title,
      loading: true,
      url: null,
      contentType: null,
      error: null,
    });

    try {
      const path = `/api/riders/${riderProfileId}/promissory-files/${file.id}/download${
        versionId ? `?versionId=${versionId}` : ""
      }`;
      const res = await authPreviewBlob(path);
      setPreviewState({
        isOpen: true,
        title,
        loading: false,
        url: res.url,
        contentType: res.contentType,
        error: null,
      });
    } catch (e: any) {
      console.error("Promissory file preview error:", e);
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        error: e?.message || (isEn ? "Could not load document preview." : "تعذر تحميل معاينة سند الأمر."),
      }));
    }
  };

  const handleClosePreview = () => {
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }
    setPreviewState({
      isOpen: false,
      title: "",
      loading: false,
      url: null,
      contentType: null,
      error: null,
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 py-2 text-xs text-[var(--muted)] ${className}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1167c9]" />
        <span>{isEn ? "Loading promissory notes..." : "جارٍ تحميل سندات الأمر..."}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-xs text-rose-600 dark:text-rose-400 py-1 ${className}`}>
        {error}
      </div>
    );
  }

  if (!files.length || !matchedFiles.length) {
    return null;
  }

  return (
    <div className={`space-y-2 mt-2 pt-2 border-t border-[var(--border)] ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
          <ShieldCheck className="h-4 w-4 text-[#1167c9]" />
          <span>{isEn ? "Promissory Notes (السندات)" : "سندات الأمر المرتبطة بالعهد"}</span>
        </div>
        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] px-1.5 py-0.2">
          {matchedFiles.length} {isEn ? "Files" : "سندات"}
        </Badge>
      </div>

      {!canDownload && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isEn
              ? "Requires permission to view or download files."
              : "يتطلب تنزيل ومعاينة السندات توفر الصلاحية المناسبة."}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        {matchedFiles.map(({ file, versionId, isAssociatedVersion }) => {
          const fileName =
            file.originalFileName || file.currentFileName || "promissory-note.pdf";

          return (
            <div
              key={`${file.id}-${versionId || "default"}`}
              className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div
                    className="font-bold text-[var(--foreground)] truncate font-mono text-xs"
                    title={fileName}
                  >
                    {fileName}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)] mt-0.5">
                    {file.versionNumber && (
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        v{file.versionNumber}
                      </span>
                    )}
                    <span>{formatFileSize(file.fileSizeBytes)}</span>
                    {file.uploadedAtUtc && (
                      <span>{formatDate(file.uploadedAtUtc, isEn)}</span>
                    )}
                    {isAssociatedVersion && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {isEn ? "Associated" : "مرتبط بالتعيين"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ms-auto">
                {canDownload ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3 text-xs font-bold gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 shadow-sm cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(file, versionId);
                      }}
                      title={isEn ? "Preview Note" : "معاينة السند"}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{isEn ? "View" : "معاينة"}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3 text-xs font-bold gap-1.5 text-[#1167c9] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 shadow-sm cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file, versionId);
                      }}
                      title={isEn ? "Download Note" : "تنزيل السند"}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{isEn ? "Download" : "تنزيل"}</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled
                    className="h-8 px-3 text-xs font-bold gap-1.5 opacity-50 cursor-not-allowed text-slate-400 border border-slate-200 dark:border-slate-800"
                    title={isEn ? "Download permission required" : "تتطلب صلاحية التنزيل"}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{isEn ? "Locked" : "محمي"}</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Preview Modal */}
      {previewState.isOpen && (
        <Modal
          isOpen={previewState.isOpen}
          onClose={handleClosePreview}
          title={previewState.title}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4 pt-2">
            {previewState.loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#1167c9]" />
                <span className="text-sm font-semibold">
                  {isEn ? "Loading live preview..." : "جارٍ تحميل المعاينة المباشرة..."}
                </span>
              </div>
            ) : previewState.error ? (
              <div className="p-8 text-center text-red-600">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold">{previewState.error}</p>
              </div>
            ) : previewState.url ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-900/40 flex items-center justify-center min-h-[400px]">
                {previewState.contentType?.startsWith("image/") ? (
                  <img
                    src={previewState.url}
                    alt={previewState.title}
                    className="max-h-[70vh] object-contain rounded-lg shadow-sm"
                  />
                ) : previewState.contentType?.includes("pdf") ? (
                  <iframe
                    src={previewState.url}
                    className="w-full h-[70vh] rounded-lg border-0"
                    title={previewState.title}
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      {isEn
                        ? "Preview available for PDF and images."
                        : "تتوفر المعاينة للصور ومستندات PDF."}
                    </p>
                    <a
                      href={previewState.url}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1167c9] text-white rounded-lg text-xs font-bold"
                    >
                      <Download className="h-4 w-4" /> {isEn ? "Download File" : "تنزيل الملف"}
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {previewState.url && (
                <a
                  href={previewState.url}
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                >
                  <Download className="h-4 w-4" /> {isEn ? "Download File" : "تنزيل الملف"}
                </a>
              )}
              <Button variant="secondary" onClick={handleClosePreview}>
                {isEn ? "Close" : "إغلاق"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
