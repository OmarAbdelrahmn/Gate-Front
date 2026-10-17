// src/app/admin/ninja/sheet-updates/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getNinjaAccountSheetUploads,
  getNinjaAccountSheetUpload,
  getNinjaAccountSheetRows,
  uploadNinjaAccountSheet,
  updateNinjaAccountSheetNote,
  formatRiyadhDateTime,
  type NinjaAccountUpdateUploadResponse,
  type NinjaAccountUpdateRowResponse,
  type NinjaAccountUpdateRowQuery,
  type NinjaImportIssue,
} from "@/lib/ninja/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Calendar,
  FileText,
  Edit3,
  Trash2,
  Eye,
  Building2,
  User,
  ShieldAlert,
  Hash,
  Download,
  Copy,
  Check,
  Zap,
  Filter,
} from "lucide-react";

export default function NinjaSheetUpdatesPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const canRead = can("ninja.read");
  const canUpdate = can("ninja.accounts.update");

  // State: List of Uploads
  const [uploads, setUploads] = useState<NinjaAccountUpdateUploadResponse[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [uploadsError, setUploadsError] = useState<string | null>(null);
  const [uploadsPage, setUploadsPage] = useState(1);
  const [uploadsTotalCount, setUploadsTotalCount] = useState(0);
  const uploadsPageSize = 20;

  // State: Selected Upload Detail & Rows Inspector
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<NinjaAccountUpdateUploadResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Rows State
  const [rows, setRows] = useState<NinjaAccountUpdateRowResponse[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [rowsPage, setRowsPage] = useState(1);
  const [rowsTotalCount, setRowsTotalCount] = useState(0);
  const rowsPageSize = 50;

  // Row Filters
  const [filterMatchStatus, setFilterMatchStatus] = useState<"All" | "Found" | "NotFound" | "Ambiguous">("All");
  const [filterSheetStatus, setFilterSheetStatus] = useState<string>("All");
  const [filterProblemsOnly, setFilterProblemsOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadIssues, setUploadIssues] = useState<NinjaImportIssue[]>([]);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  // Edit Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Copy helper
  const [copiedHash, setCopiedHash] = useState(false);

  // -------------------------------------------------------------
  // Load Uploads
  // -------------------------------------------------------------
  const loadUploads = async (page = uploadsPage) => {
    if (!canRead) return;
    setUploadsLoading(true);
    setUploadsError(null);
    try {
      const res = await getNinjaAccountSheetUploads({ page, pageSize: uploadsPageSize });
      setUploads(res?.items || []);
      setUploadsTotalCount(res?.totalCount || 0);
    } catch (err: any) {
      console.error("Failed to load sheet uploads", err);
      setUploadsError(
        err?.message ||
          "تعذر جلب سجلات فحص الشيتات. تأكد من نشر الواجهة الخلفية وقاعدة البيانات الخاصة بفحص الشيتات."
      );
      setUploads([]);
    } finally {
      setUploadsLoading(false);
    }
  };

  useEffect(() => {
    loadUploads(uploadsPage);
  }, [uploadsPage, canRead]);

  // -------------------------------------------------------------
  // Load Selected Upload & Rows
  // -------------------------------------------------------------
  const loadSelectedUploadDetail = async (uploadId: string) => {
    setDetailLoading(true);
    try {
      const up = await getNinjaAccountSheetUpload(uploadId);
      setSelectedUpload(up);
    } catch (err: any) {
      console.error("Failed to load upload detail", err);
      toast.error("خطأ", "تعذر جلب تفاصيل هذا الفحص.");
    } finally {
      setDetailLoading(false);
    }
  };

  const loadRows = async (uploadId: string, page = rowsPage) => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      const query: NinjaAccountUpdateRowQuery = {
        page,
        pageSize: rowsPageSize,
      };
      if (filterMatchStatus !== "All") {
        query.matchStatus = filterMatchStatus;
      }
      if (filterSheetStatus !== "All") {
        query.sheetStatus = filterSheetStatus;
      }
      if (filterProblemsOnly) {
        query.problemsOnly = true;
      }

      const res = await getNinjaAccountSheetRows(uploadId, query);
      setRows(res?.items || []);
      setRowsTotalCount(res?.totalCount || 0);
    } catch (err: any) {
      console.error("Failed to load sheet rows", err);
      setRowsError(err?.message || "تعذر جلب صفوف الفحص.");
      setRows([]);
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUploadId) {
      loadSelectedUploadDetail(selectedUploadId);
      loadRows(selectedUploadId, rowsPage);
    }
  }, [selectedUploadId, rowsPage, filterMatchStatus, filterSheetStatus, filterProblemsOnly]);

  const handleSelectUpload = (upload: NinjaAccountUpdateUploadResponse) => {
    setSelectedUploadId(upload.id);
    setSelectedUpload(upload);
    setRowsPage(1);
    setFilterMatchStatus("All");
    setFilterSheetStatus("All");
    setFilterProblemsOnly(false);
    setSearchQuery("");
  };

  const handleBackToList = () => {
    setSelectedUploadId(null);
    setSelectedUpload(null);
    setRows([]);
    loadUploads(uploadsPage);
  };

  // -------------------------------------------------------------
  // Handle Upload Submission
  // -------------------------------------------------------------
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("تنبيه", "يرجى اختيار ملف Excel (.xlsx) صالح.");
      return;
    }

    setUploadSubmitting(true);
    setUploadIssues([]);
    setUploadErrorMsg(null);

    try {
      const res = await uploadNinjaAccountSheet(uploadFile, uploadNote);
      toast.success("تم بنجاح", `تم حفظ وفحص الشيت بنجاح (${res.summary?.totalRows || 0} صف).`);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadNote("");
      loadUploads(1);
      // Automatically open the new upload
      handleSelectUpload(res);
    } catch (err: any) {
      console.error("Upload error", err);
      const issues = err?.problem?.issues || err?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        setUploadIssues(issues);
        setUploadErrorMsg("تم رفض الملف لوجود مشاكل هيكلية أو أخطاء في الصفوف:");
      } else {
        const msg = err?.message || "تعذر رفع الشيت وحفظ الفحص.";
        setUploadErrorMsg(msg);
      }
    } finally {
      setUploadSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Handle Note Update
  // -------------------------------------------------------------
  const handleSaveNote = async () => {
    if (!selectedUpload) return;
    setNoteSubmitting(true);
    try {
      const res = await updateNinjaAccountSheetNote(selectedUpload.id, {
        note: editingNote.trim() || null,
        rowVersion: selectedUpload.rowVersion,
      });
      setSelectedUpload(res);
      setIsNoteModalOpen(false);
      toast.success("تم بنجاح", "تم تحديث ملاحظة الفحص بنجاح.");
      // Also update in list if present
      setUploads((prev) => prev.map((u) => (u.id === res.id ? res : u)));
    } catch (err: any) {
      console.error("Note update error", err);
      if (err?.status === 409) {
        toast.error("تعارض بالتزامن (409)", "تم تعديل الملاحظة من مستخدم آخر. تم تحديث البيانات، يرجى المراجعة.");
        loadSelectedUploadDetail(selectedUpload.id);
      } else {
        toast.error("خطأ", err?.message || "تعذر تحديث الملاحظة.");
      }
    } finally {
      setNoteSubmitting(false);
    }
  };

  const openNoteEditor = () => {
    if (!selectedUpload) return;
    setEditingNote(selectedUpload.note || "");
    setIsNoteModalOpen(true);
  };

  // -------------------------------------------------------------
  // Filtered rows for client search
  // -------------------------------------------------------------
  const displayedRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const captain = (r.captainId || "").toLowerCase();
      const sheetName = (r.sheetOwnerName || "").toLowerCase();
      const sheetCity = (r.sheetCity || "").toLowerCase();
      const sheetIqama = (r.sheetIqamaNo || "").toLowerCase();
      const sysCode = (r.system?.accountCode || "").toLowerCase();
      const sysOwnerAr = (r.system?.ownerNameAr || "").toLowerCase();
      const sysOwnerEn = (r.system?.ownerNameEn || "").toLowerCase();
      const sysCity = (r.system?.cityNameAr || "").toLowerCase();
      return (
        captain.includes(q) ||
        sheetName.includes(q) ||
        sheetCity.includes(q) ||
        sheetIqama.includes(q) ||
        sysCode.includes(q) ||
        sysOwnerAr.includes(q) ||
        sysOwnerEn.includes(q) ||
        sysCity.includes(q)
      );
    });
  }, [rows, searchQuery]);

  // -------------------------------------------------------------
  // Export Rows to Excel
  // -------------------------------------------------------------
  const handleExportRows = () => {
    if (!selectedUpload || rows.length === 0) return;
    exportToExcel({
      filename: `ninja-sheet-checkup-${selectedUpload.fileName.replace(/\.[^/.]+$/, "")}`,
      sheetName: "فحص الحسابات",
      data: displayedRows,
      columns: [
        { header: "رقم الصف بالملف", accessor: (r) => r.sourceRowNumber },
        { header: "رقم الكابتن (Captain ID)", accessor: (r) => r.captainId, isText: true },
        {
          header: "حالة المطابقة",
          accessor: (r) =>
            r.matchStatus === "Found"
              ? "مطابق"
              : r.matchStatus === "NotFound"
              ? "موجود بالملف وغير موجود بالنظام"
              : "متعدد المطابقة",
        },
        { header: "اسم المالك بالملف", accessor: (r) => r.sheetOwnerName || "—" },
        { header: "مدينة الملف", accessor: (r) => r.sheetCity || "—" },
        { header: "هوية الملف", accessor: (r) => r.sheetIqamaNo || "—", isText: true },
        { header: "حالة الحساب بالملف", accessor: (r) => r.sheetStatus || "—" },
        {
          header: "موقوف بالملف",
          accessor: (r) => (r.sheetSuspended === null ? "غير محدد" : r.sheetSuspended ? "نعم" : "لا"),
        },
        { header: "كود الحساب بالنظام", accessor: (r) => r.system?.accountCode || "—", isText: true },
        { header: "حالة الحساب بالنظام", accessor: (r) => r.system?.status || "—" },
        {
          header: "اسم المالك بالنظام",
          accessor: (r) => r.system?.ownerNameAr || r.system?.ownerNameEn || "—",
        },
        { header: "هوية المالك بالنظام", accessor: (r) => r.system?.ownerIqamaNo || "—", isText: true },
        { header: "حالة المالك بالنظام", accessor: (r) => r.system?.ownerStatus || "—" },
        {
          header: "مدينة الحساب بالنظام",
          accessor: (r) => r.system?.cityNameAr || r.system?.cityCode || "—",
        },
        {
          header: "المشاكل المكتشفة",
          accessor: (r) =>
            r.problems && r.problems.length > 0
              ? r.problems.map((p) => p.messageAr || p.code).join(" | ")
              : "لا توجد مشاكل",
        },
      ],
    });
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (!canRead) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center" dir={isEn ? "ltr" : "rtl"}>
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {t("common.error") || "غير مصرح"}
        </h2>
        <p className="text-slate-500 max-w-md">
          {isEn
            ? "You do not have permission to view Ninja sheet updates (ninja.read)."
            : "ليس لديك الصلاحية الكافية لعرض وفحص شيتات نينجا (ninja.read)."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isEn ? "ltr" : "rtl"}>
      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <Link href="/admin" className="hover:text-[var(--foreground)]">
              {t("nav.dashboard") || "لوحة التحكم"}
            </Link>
            <span>/</span>
            <span className="font-semibold text-[var(--foreground)]">إدارة نينجا</span>
            <span>/</span>
            {selectedUploadId ? (
              <>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="hover:underline text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  فحص ومراجعة الشيتات
                </button>
                <span>/</span>
                <span className="text-[var(--foreground)] font-bold">تفاصيل الفحص</span>
              </>
            ) : (
              <span>فحص ومراجعة الشيتات</span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                فحص ومراجعة شيتات حسابات نينجا (Sheet Checkups)
              </h1>
              <p className="text-xs text-[var(--muted)]">
                فحص وتدقيق شيتات حسابات نينجا المحفوظة، رصد الحسابات المفقودة واختلافات الهوية والمدينة والحظر بنقل دون تعديل النظام.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedUploadId ? (
            <>
              <Button
                variant="secondary"
                onClick={handleBackToList}
                className="gap-2 text-xs"
              >
                <ArrowRight className="h-4 w-4" />
                العودة لكل الفحوصات
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  loadSelectedUploadDetail(selectedUploadId);
                  loadRows(selectedUploadId, rowsPage);
                }}
                disabled={detailLoading || rowsLoading}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`h-4 w-4 ${detailLoading || rowsLoading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
              <Button
                variant="secondary"
                onClick={handleExportRows}
                disabled={rows.length === 0}
                className="gap-2 text-xs"
              >
                <Download className="h-4 w-4" />
                تصدير النتائج (Excel)
              </Button>
            </>
          ) : (
            <>
              <Link href="/admin/ninja/accounts">
                <Button variant="secondary" className="gap-2 text-xs">
                  <Zap className="h-4 w-4 text-purple-600" />
                  حسابات نينجا
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => loadUploads(uploadsPage)}
                disabled={uploadsLoading}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`h-4 w-4 ${uploadsLoading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsUploadOpen(true);
                  setUploadIssues([]);
                  setUploadErrorMsg(null);
                }}
                disabled={!canUpdate}
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                <Upload className="h-4 w-4" />
                رفع شيت فحص جديد
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: Detail & Row Inspector                                  */}
      {/* ------------------------------------------------------------- */}
      {selectedUploadId && selectedUpload ? (
        <div className="space-y-6">
          {/* Metadata & Summary Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border)] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-black text-[var(--foreground)]">
                    {selectedUpload.fileName}
                  </span>
                  <Badge tone="gray" className="text-xs">
                    ورقة: {selectedUpload.sheetName || "Sheet1"}
                  </Badge>
                  {selectedUpload.ignoredFooterRows > 0 && (
                    <Badge tone="gray" className="text-xs text-[var(--muted)]">
                      تم تجاهل {selectedUpload.ignoredFooterRows} صفوف تذييل
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    تاريخ الفحص: {formatRiyadhDateTime(selectedUpload.createdAtUtc, "ar")}
                  </span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => copyHash(selectedUpload.contentHash)}
                    className="flex items-center gap-1 font-mono text-[11px] hover:text-[var(--foreground)]"
                    title="نسخ تجزئة الملف SHA-256"
                  >
                    <Hash className="h-3 w-3" />
                    Hash: {selectedUpload.contentHash?.substring(0, 12)}...
                    {copiedHash ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Note display & Edit button */}
              <div className="flex items-center gap-3 bg-[var(--subtle-bg)]/80 rounded-xl p-3 border border-[var(--border)] max-w-xl">
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-[var(--muted)] flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    ملاحظة الفحص (Note):
                  </div>
                  <p className="text-xs text-[var(--foreground)] font-medium mt-0.5 line-clamp-2">
                    {selectedUpload.note ? selectedUpload.note : "لا توجد ملاحظة مسجلة على هذا الفحص."}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canUpdate}
                  onClick={openNoteEditor}
                  className="gap-1 text-xs shrink-0"
                  title="تعديل الملاحظة"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {selectedUpload.note ? "تعديل" : "إضافة ملاحظة"}
                </Button>
              </div>
            </div>

            {/* Metric KPI Badges Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3 text-center">
                <div className="text-[11px] font-medium text-[var(--muted)]">إجمالي الصفوف</div>
                <div className="text-xl font-black text-[var(--foreground)]">
                  {selectedUpload.summary?.totalRows || 0}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-center">
                <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">مطابق بالنظام</div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  {selectedUpload.summary?.foundRows || 0}
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 text-center">
                <div className="text-[11px] font-medium text-rose-700 dark:text-rose-400">مفقود بالنظام</div>
                <div className="text-xl font-black text-rose-700 dark:text-rose-300">
                  {selectedUpload.summary?.notFoundRows || 0}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-center">
                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">متعدد المطابقة</div>
                <div className="text-xl font-black text-amber-700 dark:text-amber-300">
                  {selectedUpload.summary?.ambiguousRows || 0}
                </div>
              </div>

              <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-100/50 dark:bg-rose-900/30 p-3 text-center">
                <div className="text-[11px] font-medium text-rose-800 dark:text-rose-200 font-bold">صفوف بها مشاكل</div>
                <div className="text-xl font-black text-rose-800 dark:text-rose-200">
                  {selectedUpload.summary?.rowsWithProblems || 0}
                </div>
              </div>

              <div className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 p-3 text-center">
                <div className="text-[11px] font-medium text-orange-700 dark:text-orange-400">اختلاف المدينة</div>
                <div className="text-xl font-black text-orange-700 dark:text-orange-300">
                  {selectedUpload.summary?.cityMismatchRows || 0}
                </div>
              </div>

              <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 p-3 text-center">
                <div className="text-[11px] font-medium text-purple-700 dark:text-purple-400">محظور بنقل</div>
                <div className="text-xl font-black text-purple-700 dark:text-purple-300">
                  {selectedUpload.summary?.naqlBlockedRows || 0}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 p-3 text-center">
                <div className="text-[11px] font-medium text-gray-700 dark:text-gray-400">موقوف بالشيت</div>
                <div className="text-xl font-black text-gray-700 dark:text-gray-300">
                  {selectedUpload.summary?.suspendedRows || 0}
                </div>
              </div>
            </div>

            {/* Provider Sheet Statuses Pills */}
            {selectedUpload.sheetStatuses && selectedUpload.sheetStatuses.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border)] text-xs">
                <span className="text-[var(--muted)] font-bold">توزيع حالات الشيت من المصدر:</span>
                {selectedUpload.sheetStatuses.map((st) => (
                  <span
                    key={st.sheetStatus}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold text-xs ${
                      st.sheetStatus === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : st.sheetStatus === "NAQL_BLOCKED"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <span>{st.sheetStatus}</span>
                    <span className="rounded-full bg-white/60 dark:bg-black/30 px-1.5 py-0.2 text-[10px]">
                      {st.count}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rows Filter Bar */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Match Status Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(["All", "Found", "NotFound", "Ambiguous"] as const).map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => {
                      setFilterMatchStatus(ms);
                      setRowsPage(1);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                      filterMatchStatus === ms
                        ? "bg-purple-600 text-white shadow"
                        : "bg-[var(--subtle-bg)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {ms === "All"
                      ? "الكل"
                      : ms === "Found"
                      ? "مطابق (Found)"
                      : ms === "NotFound"
                      ? "مفقود بالنظام (NotFound)"
                      : "متعدد (Ambiguous)"}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setFilterProblemsOnly(!filterProblemsOnly);
                    setRowsPage(1);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                    filterProblemsOnly
                      ? "bg-rose-600 text-white shadow"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  المشاكل فقط
                </button>
              </div>

              {/* Sheet Status & Search */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedUpload.sheetStatuses && selectedUpload.sheetStatuses.length > 0 && (
                  <select
                    value={filterSheetStatus}
                    onChange={(e) => {
                      setFilterSheetStatus(e.target.value);
                      setRowsPage(1);
                    }}
                    aria-label="تصفية بحالة الشيت"
                    className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-xs text-[var(--foreground)]"
                  >
                    <option value="All">جميع حالات الشيت</option>
                    {selectedUpload.sheetStatuses.map((s) => (
                      <option key={s.sheetStatus} value={s.sheetStatus}>
                        {s.sheetStatus} ({s.count})
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative min-w-[220px]">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-[var(--muted)] rtl:right-3 ltr:left-3" />
                  <Input
                    placeholder="بحث سريع برقم الكابتن أو الاسم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8.5 text-xs pr-8 rtl:pr-8 ltr:pl-8"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rows Table */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[var(--foreground)]">
                  صفوف الفحص المقارنة
                </span>
                <Badge tone="gray" className="text-xs">
                  {rowsTotalCount} صف مسجل
                </Badge>
              </div>

              {rowsTotalCount > 0 && (
                <div className="text-xs text-[var(--muted)]">
                  صفحة {rowsPage} من {Math.ceil(rowsTotalCount / rowsPageSize) || 1}
                </div>
              )}
            </div>

            {rowsLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mb-3" />
                <p className="text-sm font-bold text-[var(--foreground)]">جارِ جلب صفوف الفحص...</p>
              </div>
            ) : rowsError ? (
              <div className="p-8 text-center">
                <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-rose-600">{rowsError}</p>
              </div>
            ) : displayedRows.length === 0 ? (
              <div className="p-12 text-center text-[var(--muted)]">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-[var(--muted)]/50" />
                <p className="font-bold text-sm">لا توجد صفوف تطابق الفلاتر الحالية.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-[var(--subtle-bg)] text-[var(--muted)] border-b border-[var(--border)]">
                    <tr>
                      <th className="px-3 py-3 font-bold w-12 text-center">#</th>
                      <th className="px-3 py-3 font-bold">كابتن ID</th>
                      <th className="px-3 py-3 font-bold">حالة المطابقة</th>
                      <th className="px-3 py-3 font-bold">بيانات الشيت (الملف)</th>
                      <th className="px-3 py-3 font-bold">بيانات النظام المستخرجة</th>
                      <th className="px-3 py-3 font-bold">المشاكل والفروقات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {displayedRows.map((row) => {
                      const isFound = row.matchStatus === "Found";
                      const isNotFound = row.matchStatus === "NotFound";
                      const isAmbiguous = row.matchStatus === "Ambiguous";

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-[var(--subtle-bg)]/40 transition-colors ${
                            row.problems && row.problems.length > 0
                              ? "bg-rose-50/10 dark:bg-rose-950/10"
                              : ""
                          }`}
                        >
                          {/* Row Number */}
                          <td className="px-3 py-3 text-center font-mono font-bold text-[var(--muted)]">
                            {row.sourceRowNumber}
                          </td>

                          {/* Captain ID */}
                          <td className="px-3 py-3 font-mono font-black text-sm text-[var(--foreground)]" dir="ltr">
                            {row.captainId}
                          </td>

                          {/* Match Status */}
                          <td className="px-3 py-3">
                            {isFound && (
                              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                مطابق
                              </span>
                            )}
                            {isNotFound && (
                              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                <XCircle className="h-3 w-3" />
                                مفقود بالنظام
                              </span>
                            )}
                            {isAmbiguous && (
                              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                <AlertTriangle className="h-3 w-3" />
                                متعدد
                              </span>
                            )}
                          </td>

                          {/* Sheet Data */}
                          <td className="px-3 py-3 space-y-1">
                            <div className="font-bold text-[var(--foreground)]">
                              {row.sheetOwnerName || "—"}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                              <span>المدينة: <strong className="text-[var(--foreground)]">{row.sheetCity || "—"}</strong></span>
                              <span>•</span>
                              <span>الهوية: <strong className="font-mono text-[var(--foreground)]">{row.sheetIqamaNo || "—"}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                row.sheetStatus === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : row.sheetStatus === "NAQL_BLOCKED"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                              }`}>
                                {row.sheetStatus || "بلا حالة"}
                              </span>

                              {row.sheetSuspended !== null && (
                                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  row.sheetSuspended
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                }`}>
                                  {row.sheetSuspended ? "موقوف" : "غير موقوف"}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* System Data */}
                          <td className="px-3 py-3 space-y-1">
                            {row.system ? (
                              <>
                                <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                                  <span>{row.system.ownerNameAr || row.system.ownerNameEn || "—"}</span>
                                  <span className="text-[10px] rounded px-1.5 py-0.2 bg-[var(--subtle-bg)] text-[var(--muted)]">
                                    {row.system.accountCode || "NINJA"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                                  <span>مدينة: <strong className="text-[var(--foreground)]">{row.system.cityNameAr || row.system.cityCode || "—"}</strong></span>
                                  <span>•</span>
                                  <span>هوية: <strong className="font-mono text-[var(--foreground)]">{row.system.ownerIqamaNo || "—"}</strong></span>
                                  <span>•</span>
                                  <span>حالة المالك: <strong>{row.system.ownerStatus || "—"}</strong></span>
                                </div>
                                <div className="text-[11px]">
                                  حالة الحساب بالنظام: <strong className="text-purple-600 dark:text-purple-400 font-bold">{row.system.status}</strong>
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-[var(--muted)] italic">
                                {isNotFound
                                  ? "موجود في الملف وغير موجود في النظام"
                                  : "لا يوجد سجل نظام مطابق"}
                              </div>
                            )}
                          </td>

                          {/* Problems & Discrepancies */}
                          <td className="px-3 py-3">
                            {row.problems && row.problems.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {row.problems.map((prob, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 p-1 text-[11px] text-rose-700 dark:text-rose-300"
                                  >
                                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                    <span>{prob.messageAr || prob.messageEn || prob.code}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" />
                                سليم ومطابق
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {rowsTotalCount > rowsPageSize && (
              <div className="flex items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--subtle-bg)]/30">
                <div className="text-xs text-[var(--muted)]">
                  إجمالي {rowsTotalCount} صف
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={rowsPage <= 1 || rowsLoading}
                    onClick={() => setRowsPage((p) => Math.max(1, p - 1))}
                    className="gap-1 text-xs"
                  >
                    <ChevronRight className="h-4 w-4 rtl:block ltr:hidden" />
                    <ChevronLeft className="h-4 w-4 ltr:block rtl:hidden" />
                    السابق
                  </Button>
                  <span className="text-xs font-bold text-[var(--foreground)] px-2">
                    {rowsPage} / {Math.ceil(rowsTotalCount / rowsPageSize)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={rowsPage * rowsPageSize >= rowsTotalCount || rowsLoading}
                    onClick={() => setRowsPage((p) => p + 1)}
                    className="gap-1 text-xs"
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4 rtl:block ltr:hidden" />
                    <ChevronRight className="h-4 w-4 ltr:block rtl:hidden" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* VIEW 2: Uploads List                                            */
        /* ------------------------------------------------------------- */
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-[var(--foreground)]">
                  سجل شيتات الفحص المحفوظة
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  جميع الشيتات التي تم رفعها وفحصها مسبقاً مع ملخص الفروقات والملاحظات.
                </p>
              </div>

              <div className="text-xs text-[var(--muted)] font-mono">
                {uploadsTotalCount} فحص مسجل
              </div>
            </div>

            {uploadsLoading ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mb-3" />
                <p className="text-sm font-bold text-[var(--foreground)]">جارِ جلب سجلات الفحص...</p>
              </div>
            ) : uploadsError ? (
              <div className="p-12 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-rose-600 mb-4">{uploadsError}</p>
                <Button variant="secondary" onClick={() => loadUploads(1)}>
                  إعادة المحاولة
                </Button>
              </div>
            ) : uploads.length === 0 ? (
              <div className="p-16 text-center text-[var(--muted)] space-y-4">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-[var(--muted)]/50" />
                <div>
                  <p className="font-bold text-base text-[var(--foreground)]">لا توجد فحوصات شيتات سابقة</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    قم برفع ملف Excel الخاص بحسابات نينجا لمقارنته وحفظ تقرير الفحص المستقل.
                  </p>
                </div>
                {canUpdate && (
                  <Button
                    variant="primary"
                    onClick={() => setIsUploadOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs"
                  >
                    <Upload className="h-4 w-4" />
                    رفع شيت فحص الآن
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {uploads.map((up) => (
                  <div
                    key={up.id}
                    className="p-5 hover:bg-[var(--subtle-bg)]/50 transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-black text-[var(--foreground)]">
                          {up.fileName}
                        </span>
                        <Badge tone="gray" className="text-xs">
                          ورقة: {up.sheetName}
                        </Badge>
                        <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRiyadhDateTime(up.createdAtUtc, "ar")}
                        </span>
                      </div>

                      {up.note && (
                        <div className="flex items-start gap-1.5 text-xs text-[var(--foreground)] bg-[var(--subtle-bg)] p-2 rounded-lg border border-[var(--border)]">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-purple-600 mt-0.5" />
                          <span>{up.note}</span>
                        </div>
                      )}

                      {/* Summary Metrics Pills */}
                      <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--subtle-bg)] px-2 py-0.5 font-bold text-[var(--foreground)]">
                          إجمالي: {up.summary?.totalRows || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-bold">
                          مطابق: {up.summary?.foundRows || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 font-bold">
                          مفقود بالنظام: {up.summary?.notFoundRows || 0}
                        </span>
                        {up.summary?.ambiguousRows > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 font-bold">
                            متعدد: {up.summary?.ambiguousRows}
                          </span>
                        )}
                        {up.summary?.rowsWithProblems > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 px-2 py-0.5 font-black">
                            به مشاكل: {up.summary?.rowsWithProblems}
                          </span>
                        )}
                        {up.summary?.naqlBlockedRows > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 font-bold">
                            محظور بنقل: {up.summary?.naqlBlockedRows}
                          </span>
                        )}
                        {up.summary?.cityMismatchRows > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-2 py-0.5 font-bold">
                            اختلاف مدينة: {up.summary?.cityMismatchRows}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSelectUpload(up)}
                        className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                      >
                        <Eye className="h-4 w-4" />
                        عرض وتدقيق الصفوف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Uploads Pagination */}
            {uploadsTotalCount > uploadsPageSize && (
              <div className="flex items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--subtle-bg)]/30">
                <div className="text-xs text-[var(--muted)]">
                  إجمالي {uploadsTotalCount} فحص
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={uploadsPage <= 1 || uploadsLoading}
                    onClick={() => setUploadsPage((p) => Math.max(1, p - 1))}
                    className="gap-1 text-xs"
                  >
                    السابق
                  </Button>
                  <span className="text-xs font-bold text-[var(--foreground)] px-2">
                    {uploadsPage} / {Math.ceil(uploadsTotalCount / uploadsPageSize)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={uploadsPage * uploadsPageSize >= uploadsTotalCount || uploadsLoading}
                    onClick={() => setUploadsPage((p) => p + 1)}
                    className="gap-1 text-xs"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: Upload New Sheet Checkup                              */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => {
          if (!uploadSubmitting) {
            setIsUploadOpen(false);
            setUploadFile(null);
            setUploadNote("");
            setUploadIssues([]);
            setUploadErrorMsg(null);
          }
        }}
        title="رفع وفحص شيت حسابات نينجا جديد"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs" dir={isEn ? "ltr" : "rtl"}>
          <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 p-3 text-[var(--foreground)] space-y-1">
            <div className="font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              فحص ومطابقة مستقلة (Checkup Only)
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              هذه الخدمة تفحص وتطابق الحسابات بصورة مستقلة تماماً، ولا تقوم بتعديل بيانات الحسابات أو الملاك أو التعيينات في النظام.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
              ملف الحسابات (.xlsx) <span className="text-rose-500">*</span>
            </label>
            <input
              type="file"
              accept=".xlsx"
              required
              disabled={uploadSubmitting}
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-[var(--foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
            <p className="text-[10px] text-[var(--muted)] mt-1">
              أقصى حجم 10 ميجابايت. الأعمدة المطلوبة: المعرف، الاسم، المدينة، رقم الهوية، الحالة (وموقوف اختياري).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
              ملاحظة على هذا الفحص (Note - اختياري)
            </label>
            <textarea
              rows={3}
              maxLength={4000}
              disabled={uploadSubmitting}
              value={uploadNote}
              onChange={(e) => setUploadNote(e.target.value)}
              placeholder="مثال: فحص دوري لمطابقة الحسابات الجديدة وحصر المحظورين في نقل..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <div className="text-[10px] text-[var(--muted)] text-left" dir="ltr">
              {uploadNote.length} / 4000
            </div>
          </div>

          {/* Errors or Issues Display */}
          {uploadErrorMsg && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-rose-700 dark:text-rose-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>{uploadErrorMsg}</span>
              </div>

              {uploadIssues.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] pr-2">
                  {uploadIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-1 font-mono">
                      <span>•</span>
                      <span>
                        [صف {issue.rowNumber}
                        {issue.captainId ? ` - كابتن ${issue.captainId}` : ""}]: {issue.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              disabled={uploadSubmitting}
              onClick={() => setIsUploadOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploadSubmitting || !uploadFile}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
            >
              {uploadSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  جارِ الرفع والفحص...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  رفع وفحص الشيت
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: Edit Note                                             */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => !noteSubmitting && setIsNoteModalOpen(false)}
        title="تعديل ملاحظة الفحص"
      >
        <div className="space-y-4 text-xs" dir={isEn ? "ltr" : "rtl"}>
          <p className="text-[11px] text-[var(--muted)]">
            يمكنك كتابة ملاحظة توضيحية لتوثيق إجراءات العمل أو ترك الحقل فارغاً لمسح الملاحظة.
          </p>

          <div>
            <textarea
              rows={4}
              maxLength={4000}
              disabled={noteSubmitting}
              value={editingNote}
              onChange={(e) => setEditingNote(e.target.value)}
              placeholder="اكتب الملاحظة هنا..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-3 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <div className="text-[10px] text-[var(--muted)] text-left" dir="ltr">
              {editingNote.length} / 4000
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            {selectedUpload?.note && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={noteSubmitting}
                onClick={() => setEditingNote("")}
                className="text-xs gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                مسح الملاحظة
              </Button>
            )}

            <div className="flex items-center gap-2 mr-auto rtl:mr-auto ltr:ml-auto">
              <Button
                type="button"
                variant="secondary"
                disabled={noteSubmitting}
                onClick={() => setIsNoteModalOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={noteSubmitting}
                onClick={handleSaveNote}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
              >
                {noteSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
