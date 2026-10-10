// src/app/admin/jahez/imports/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  commitImportBatch,
  downloadImportFile,
  getImportBatches,
  getImportPreview,
  uploadImportBatch,
  getJahezHandovers,
} from "@/lib/jahez/api";
import {
  JahezImportKind,
  type DispatchAllocationItem,
  type ImportCommitRequest,
  type JahezImportBatch,
  type JahezImportPreview,
  type JahezHandover,
} from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileUp,
  RefreshCw,
  FileCheck,
} from "lucide-react";

export default function JahezImportsReportPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [batches, setBatches] = useState<JahezImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadKind, setUploadKind] = useState<JahezImportKind>(JahezImportKind.Transactions);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replacesBatchId, setReplacesBatchId] = useState("");
  const [correctionReason, setCorrectionReason] = useState(
    isEn ? "Correction and replacement of previous batch files" : "تصحيح واستبدال ملفات الدفعة السابقة"
  );
  const [uploading, setUploading] = useState(false);

  // Preview Drawer / Modal State
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [preview, setPreview] = useState<JahezImportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Dispatch Allocations Modal
  const [allocations, setAllocations] = useState<Record<string, { handoverId: string; count: number; reason: string }>>({});
  const [handovers, setHandovers] = useState<JahezHandover[]>([]);

  useEffect(() => {
    getJahezHandovers({ pageSize: 100 })
      .then((res) => setHandovers(res.items || []))
      .catch(() => {});
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await getImportBatches({ page, pageSize: 50 });
      setBatches(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر استعلام ملفات الاستيراد";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadBatches();
    });
  }, [page]);

  const handleOpenPreview = async (batchId: string) => {
    setSelectedBatchId(batchId);
    setPreviewLoading(true);
    try {
      const p = await getImportPreview(batchId);
      setPreview(p);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تحميل معاينة الدفعة";
      toast.error("خطأ", msg);
      setSelectedBatchId(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 10) {
        toast.error("تنبيه", "الحد الأقصى المسموح به هو 10 ملفات في الدفعة الواحدة");
        return;
      }
      setSelectedFiles(files);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error("تنبيه", "يرجى اختيار ملف إكسل واحد على الأقل");
      return;
    }

    setUploading(true);
    try {
      const previewRes = await uploadImportBatch(uploadKind, selectedFiles, {
        replacesBatchId: replacesBatchId.trim() || undefined,
        correctionReason: correctionReason.trim() || undefined,
      });

      setIsUploadOpen(false);
      setSelectedFiles([]);
      setReplacesBatchId("");
      setCorrectionReason(
        isEn ? "Correction and replacement of previous batch files" : "تصحيح واستبدال ملفات الدفعة السابقة"
      );
      loadBatches();

      setPreview(previewRes);
      setSelectedBatchId(previewRes.batchId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل رفع الملفات";
      toast.error("خطأ", msg);
    } finally {
      setUploading(false);
    }
  };

  const handleCommitBatch = async () => {
    if (!preview) return;

    const blockingIssues = preview.issues.filter((iss) => iss.code !== "assignment_ambiguous");
    if (blockingIssues.length > 0) {
      toast.error("تنبيه", "لا يمكن ترحيل الدفعة طالما توجد ملاحظات أو أخطاء تعارض غير محلولة");
      return;
    }

    const ambiguousIssues = preview.issues.filter((iss) => iss.code === "assignment_ambiguous");
    if (ambiguousIssues.length > 0) {
      const missingAlloc = ambiguousIssues.some(
        (iss) => !iss.rowId || !allocations[iss.rowId] || !allocations[iss.rowId].handoverId || allocations[iss.rowId].count <= 0
      );
      if (missingAlloc) {
        toast.error("تنبيه", "يرجى استكمال تحديد توزيع جميع الصفوف الملتبسة وتعيين الحساب والعدد قبل الترحيل");
        return;
      }
    }

    setCommitting(true);
    try {
      let commitReq: ImportCommitRequest = {};
      if (preview.kind === JahezImportKind.DailyDispatches && Object.keys(allocations).length > 0) {
        commitReq = {
          allocations: Object.entries(allocations).map(([rowId, a]) => ({
            rowId,
            handoverId: a.handoverId,
            count: a.count,
            reason: a.reason,
          })),
        };
      }

      const updated = await commitImportBatch(preview.batchId, commitReq);
      setPreview(updated);
      loadBatches();
      toast.success("تم بنجاح", "تم ترحيل واعتماد دفعة الاستيراد بنجاح");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل ترحيل الدفعة";
      toast.error("خطأ", msg);
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadFile = async (fileId: string, originalName: string) => {
    try {
      const { blob } = await downloadImportFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName || "import-file.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تنزيل الملف";
      toast.error("خطأ", msg);
    }
  };

  const handleExportBatches = () => {
    exportToExcel({
      filename: `jahez_import_batches_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: batches,
      columns: [
        { header: isEn ? "Batch ID" : "معرف الدفعة", accessor: "id" },
        {
          header: isEn ? "Kind" : "نوع الاستيراد",
          accessor: (b) => (b.kind === JahezImportKind.Transactions ? "عمليات Net Amount" : "طلبات يومية Dispatches"),
        },
        { header: isEn ? "Uploaded At" : "تاريخ الرفع", accessor: "createdAtUtc" },
        {
          header: isEn ? "Committed" : "مرحل ومعتمد",
          accessor: (b) => (b.committedAtUtc ? "نعم" : "مسودة"),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {isEn ? "Jahez Uploaded Files Report & Batch Auditor" : "تقرير ملفات استيراد جاهز والتدقيق المالي"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Track, preview, and audit uploaded transaction and dispatch XLSX workbooks. Download original files and commit ledger impact."
              : "متابعة وتدقيق ومعاينة ملفات عمليات إكسل (SDP Report) والطلبات اليومية لجاهز، وتنزيل الملفات الأصلية وترحيل الأرصدة."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadBatches}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportBatches}
            disabled={batches.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <Download className="h-4 w-4" />
            {isEn ? "Export Log" : "تصدير السجل"}
          </Button>

          {can("jahez.imports.create") && (
            <Button
              variant="primary"
              onClick={() => setIsUploadOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <FileUp className="h-4 w-4" />
              {isEn ? "Upload New Batch" : "رفع دفعة ملفات جديدة"}
            </Button>
          )}
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Uploaded Date" : "تاريخ الرفع"}</th>
                <th className="px-4 py-3">{isEn ? "Import Kind" : "نوع الملفات"}</th>
                <th className="px-4 py-3">{isEn ? "Uploaded By" : "المستخدم الرافِع"}</th>
                <th className="px-4 py-3">{isEn ? "Commit Status" : "حالة الترحيل"}</th>
                <th className="px-4 py-3">{isEn ? "Batch Replacement" : "تصحيح لدفعة سابقة"}</th>
                <th className="px-4 py-3">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    {isEn ? "Loading import batches..." : "جارٍ استعلام دفعات الاستيراد..."}
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <FileSpreadsheet className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No import batches recorded" : "لا توجد ملفات أو دفعات مرفوعة"}
                    </p>
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {new Date(b.createdAtUtc).toLocaleString("ar-SA", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="px-4 py-3">
                      {b.kind === JahezImportKind.Transactions ? (
                        <Badge tone="blue">
                          {isEn ? "Transactions (SDP_Report)" : "عمليات مالية (SDP)"}
                        </Badge>
                      ) : (
                        <Badge tone="orange">
                          {isEn ? "Daily Dispatches (Insights)" : "طلبات يومية (Dispatches)"}
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {(isEn
                        ? b.uploadedByUserNameEn || b.uploadedByUserNameAr
                        : b.uploadedByUserNameAr || b.uploadedByUserNameEn) || (isEn ? "User" : "المستخدم")}
                    </td>

                    <td className="px-4 py-3">
                      {b.committedAtUtc ? (
                        <Badge tone="green">
                          <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                          {isEn ? "Committed" : "مرحل ومعتمد"}
                        </Badge>
                      ) : (
                        <Badge tone="orange">
                          <Clock className="h-3 w-3 mr-1 inline" />
                          {isEn ? "Preview / Pending" : "معاينة بانتظار الاعتماد"}
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-500">
                      {b.replacesBatchId ? (
                        <span className="text-indigo-600 font-medium">
                          {isEn ? "Correction replacement" : "دفعة تصحيحية بديلة"}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenPreview(b.id)}
                        className="text-xs py-1 px-2.5 h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        {isEn ? "Audit & Preview" : "معاينة وتدقيق"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Batch Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title={isEn ? "Upload Jahez Excel Batch" : "رفع دفعة ملفات إكسل جديدة لجاهز"}
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Import Kind" : "نوع ملفات الاستيراد"}
            </label>
            <select
              value={uploadKind}
              onChange={(e) => setUploadKind(Number(e.target.value) as JahezImportKind)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value={JahezImportKind.Transactions}>
                {isEn ? "1 - Transactions Workbook (Sheet: SDP_Report)" : "1 - تقرير العمليات المالية (Sheet: SDP_Report)"}
              </option>
              <option value={JahezImportKind.DailyDispatches}>
                {isEn ? "2 - Daily Dispatches Workbook (Sheet: Delivery Insights Report)" : "2 - تقرير الطلبات اليومية (Sheet: Delivery Insights Report)"}
              </option>
            </select>
          </div>

          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-emerald-500 dark:border-gray-700">
            <FileSpreadsheet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <label className="cursor-pointer font-semibold text-emerald-600 hover:text-emerald-500 text-sm block">
              <span>{isEn ? "Choose 1 to 10 XLSX files" : "اضغط لاختيار 1 إلى 10 ملفات إكسل (XLSX)"}</span>
              <input
                type="file"
                multiple
                accept=".xlsx"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <p className="text-[11px] text-gray-400 mt-1">
              {isEn ? "Max 10MB per file, max 30MB total per batch" : "الحد الأقصى 10 ميجابايت للملف، و30 ميجابايت لإجمالي الدفعة"}
            </p>
            {selectedFiles.length > 0 && (
              <div className="mt-3 text-right text-xs bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg space-y-1">
                <span className="font-semibold text-gray-700 dark:text-gray-300 block">
                  الملفات المحددة ({selectedFiles.length}):
                </span>
                {selectedFiles.map((f, i) => (
                  <div key={i} className="text-gray-500 flex justify-between">
                    <span>{f.name}</span>
                    <span>{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 dark:border-gray-800 space-y-3">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">
              {isEn ? "Batch Replacement / Correction (Optional)" : "تصحيح أو استبدال دفعة سابقة (اختياري)"}
            </span>

            <div>
              <label className="text-xs text-gray-500 block mb-1">
                {isEn ? "Replaces Batch ID" : "معرف الدفعة السابقة المراد استبدالها"}
              </label>
              <Input
                type="text"
                placeholder="UUID..."
                value={replacesBatchId}
                onChange={(e) => {
                  setReplacesBatchId(e.target.value);
                  if (e.target.value && !correctionReason) {
                    setCorrectionReason(
                      isEn ? "Correction and replacement of previous batch files" : "تصحيح واستبدال ملفات الدفعة السابقة"
                    );
                  }
                }}
              />
            </div>

            {replacesBatchId && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  {isEn ? "Correction Reason (Required when replacing)" : "سبب ومبرر تصحيح الدفعة (إلزامي)"}
                </label>
                <Input
                  type="text"
                  placeholder="سبب التصحيح..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUploadOpen(false)}
              disabled={uploading}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || selectedFiles.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {uploading ? (isEn ? "Uploading & Parsing..." : "جارٍ الرفع والمعالجة...") : (isEn ? "Upload & Prepare Preview" : "رفع وإعداد المعاينة")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview & Audit Modal */}
      <Modal
        isOpen={Boolean(selectedBatchId && preview)}
        onClose={() => {
          setSelectedBatchId(null);
          setPreview(null);
        }}
        title={isEn ? "Import Batch Audit & Preview" : "معاينة وتدقيق دفعة الاستيراد"}
      >
        {preview && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg dark:bg-gray-800 text-xs">
              <div>
                <span className="text-gray-400 block">معرف الدفعة:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {preview.batchId}
                </span>
              </div>
              <div>
                {preview.committed ? (
                  <Badge tone="green">
                    <CheckCircle className="h-3 w-3 mr-1 inline" />
                    مرحل ومعتمد في السجلات
                  </Badge>
                ) : (
                  <Badge tone="orange">
                    <Clock className="h-3 w-3 mr-1 inline" />
                    مسودة بانتظار الاعتماد
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                الملفات الأصلية المحفوظة في الدفعة:
              </h4>
              <div className="space-y-1.5">
                {preview.files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-2.5 rounded-lg text-xs"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">{f.fileName}</span>
                    <Button
                      variant="secondary"
                      onClick={() => handleDownloadFile(f.id, f.fileName)}
                      className="text-xs py-1 px-2.5 h-8 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      تنزيل الملف الأصلي (XLSX)
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {preview.issues.filter((iss) => iss.code !== "assignment_ambiguous").length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/70 p-3.5 dark:border-red-900/60 dark:bg-red-950/20 text-xs">
                <h4 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  ملاحظات وموانع الترحيل المكتشفة ({preview.issues.filter((iss) => iss.code !== "assignment_ambiguous").length}):
                </h4>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {preview.issues
                    .filter((iss) => iss.code !== "assignment_ambiguous")
                    .map((iss, i) => (
                      <div key={i} className="text-red-700 dark:text-red-300 text-[11px] flex gap-2">
                        <span className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">
                          [{iss.code}]
                        </span>
                        <span>
                          الملف: {iss.fileName} {iss.rowNumber ? `(سطر ${iss.rowNumber})` : ""} - {iss.description}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {preview.issues.filter((iss) => iss.code === "assignment_ambiguous").length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20 text-xs space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">
                    توزيع الطلبات الملتبسة (Ambiguous Dispatch Allocations) - {preview.issues.filter((iss) => iss.code === "assignment_ambiguous").length} سطر يتطلب التعيين:
                  </h4>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  يسمح النظام بترحيل الدفعة عند وجود أسطر ملتبسة الفترات فقط بعد تعيين سجل التسليم (Handover) والعدد والسبب يدويًا لكل سطر.
                </p>
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {preview.issues
                    .filter((iss) => iss.code === "assignment_ambiguous")
                    .map((iss, i) => {
                      const rowId = iss.rowId || `idx-${i}`;
                      const currentAlloc = allocations[rowId] || {
                        handoverId: "",
                        count: 1,
                        reason: isEn ? "Manual allocation for ambiguous dispatch" : "توزيع يدوي لطلبات ملتبسة",
                      };
                      return (
                        <div
                          key={rowId}
                          className="bg-white dark:bg-gray-800 p-2.5 rounded border border-amber-200 dark:border-amber-800 space-y-2"
                        >
                          <div className="flex justify-between items-center text-[11px] text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">
                              الملف: {iss.fileName} {iss.rowNumber ? `(سطر ${iss.rowNumber})` : ""}
                            </span>
                            <span className="text-gray-500">{iss.description}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                {isEn ? "Handover Account" : "حساب التسليم (Handover)"}
                              </label>
                              <select
                                value={currentAlloc.handoverId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAllocations((prev) => ({
                                    ...prev,
                                    [rowId]: {
                                      ...(prev[rowId] || {
                                        count: 1,
                                        reason: isEn ? "Manual allocation" : "توزيع يدوي لطلبات ملتبسة",
                                      }),
                                      handoverId: val,
                                    },
                                  }));
                                }}
                                className="w-full text-xs p-1.5 border rounded dark:bg-gray-900 dark:border-gray-700 text-gray-900 dark:text-white"
                              >
                                <option value="">-- {isEn ? "Select Handover" : "اختر التسليم"} --</option>
                                {handovers.map((h) => {
                                  const driverId = h.externalAccountId || h.account?.externalAccountId || h.account?.code || h.id.slice(0, 8);
                                  const riderName = isEn
                                    ? (h.actualRiderNameEn || h.actualRiderNameAr || h.ownerRiderNameEn || h.ownerRiderNameAr || "Rider")
                                    : (h.actualRiderNameAr || h.actualRiderNameEn || h.ownerRiderNameAr || h.ownerRiderNameEn || "مندوب");
                                  const period = h.commissionStartsOn || h.startedAtUtc?.slice(0, 10);
                                  return (
                                    <option key={h.id} value={h.id}>
                                      {driverId} - {riderName} ({period})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                {isEn ? "Orders Count" : "عدد الطلبات (Count)"}
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={currentAlloc.count || ""}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  setAllocations((prev) => ({
                                    ...prev,
                                    [rowId]: {
                                      ...(prev[rowId] || {
                                        handoverId: "",
                                        reason: isEn ? "Manual allocation" : "توزيع يدوي لطلبات ملتبسة",
                                      }),
                                      count: val,
                                    },
                                  }));
                                }}
                                className="w-full text-xs p-1.5 border rounded dark:bg-gray-900 dark:border-gray-700 text-gray-900 dark:text-white"
                                placeholder={isEn ? "Count" : "العدد"}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                {isEn ? "Allocation Reason" : "سبب التوزيع (Reason)"}
                              </label>
                              <input
                                type="text"
                                value={currentAlloc.reason}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAllocations((prev) => ({
                                    ...prev,
                                    [rowId]: {
                                      ...(prev[rowId] || { handoverId: "", count: 1 }),
                                      reason: val,
                                    },
                                  }));
                                }}
                                className="w-full text-xs p-1.5 border rounded dark:bg-gray-900 dark:border-gray-700 text-gray-900 dark:text-white"
                                placeholder={isEn ? "Reason" : "سبب التوزيع"}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                ملخص التأثير المالي على الحسابات:
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-800">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="p-2">{isEn ? "Account (Driver ID)" : "الحساب (Driver ID)"}</th>
                      <th className="p-2">الفترة</th>
                      <th className="p-2">الأسطر الصالحة</th>
                      <th className="p-2">صافي المبلغ (Net)</th>
                      <th className="p-2">تغير المديونية (-Net)</th>
                      <th className="p-2">الطلبات</th>
                      <th className="p-2">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {preview.accounts.map((acc, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <span className="font-mono font-bold block">{acc.driverId}</span>
                          {(isEn ? (acc.ownerRiderNameEn || acc.ownerRiderNameAr) : (acc.ownerRiderNameAr || acc.ownerRiderNameEn)) && (
                            <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                              {isEn ? (acc.ownerRiderNameEn || acc.ownerRiderNameAr) : (acc.ownerRiderNameAr || acc.ownerRiderNameEn)}
                            </span>
                          )}
                        </td>
                        <td className="p-2">{acc.fromDate} → {acc.toDate}</td>
                        <td className="p-2">{acc.validRowCount}</td>
                        <td className="p-2 font-mono font-semibold">
                          {acc.netAmount !== null ? `${acc.netAmount.toLocaleString("ar-SA")} ر.س` : "-"}
                        </td>
                        <td className="p-2 font-mono font-bold text-amber-600">
                          {acc.platformDebtChange !== null
                            ? `${acc.platformDebtChange.toLocaleString("ar-SA")} ر.س`
                            : "-"}
                        </td>
                        <td className="p-2 font-semibold">
                          {acc.dispatches !== null ? acc.dispatches : "-"}
                        </td>
                        <td className="p-2">
                          {acc.hasIssues ? (
                            <Badge tone="red">
                              يوجد ملاحظات
                            </Badge>
                          ) : (
                            <Badge tone="green">
                              صالح للترحيل
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedBatchId(null);
                  setPreview(null);
                }}
              >
                إغلاق
              </Button>

              {!preview.committed && can("jahez.imports.update") && (
                <Button
                  variant="primary"
                  onClick={handleCommitBatch}
                  disabled={
                    committing ||
                    preview.issues.some((iss) => iss.code !== "assignment_ambiguous") ||
                    (preview.issues.some((iss) => iss.code === "assignment_ambiguous") &&
                      preview.issues
                        .filter((iss) => iss.code === "assignment_ambiguous")
                        .some(
                          (iss) =>
                            !iss.rowId ||
                            !allocations[iss.rowId] ||
                            !allocations[iss.rowId].handoverId ||
                            allocations[iss.rowId].count <= 0
                        ))
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FileCheck className="h-4 w-4" />
                  {committing ? "جارٍ الترحيل..." : "ترحيل واعتماد الدفعة في السجلات"}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
