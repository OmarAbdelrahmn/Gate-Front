"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  FilePlus,
  Plus,
  Eye,
  Download,
  RefreshCw,
  Pencil,
  Archive,
  History,
  FileText,
  AlertCircle,
  HelpCircle,
  X,
  Upload,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  getEmployeeChecklist,
  getRiderChecklist,
  uploadEmployeeChecklistDocument,
  uploadRiderChecklistDocument,
  uploadEmployeeDocumentVersion,
  updateEmployeeDocumentMetadata,
  getEmployeeDocumentVersions,
  downloadEmployeeDocumentFile,
  previewEmployeeDocumentFile,
  archiveEmployeeDocumentRecord,
  type StaffDocumentChecklistItem,
  type EmployeeDocument,
  type EmployeeDocumentVersion,
  type DocumentFulfillmentStatus,
} from "../../lib/workforce/documents-api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { toast } from "../ui/Toast";
import { systemPrompt } from "../ui/SystemDialog";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

const fulfillmentConfig: Record<
  DocumentFulfillmentStatus,
  { labelAr: string; labelEn: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  Complete: {
    labelAr: "مكتملة",
    labelEn: "Complete",
    badgeClass: "bg-emerald-100 text-emerald-950 border border-emerald-300 font-black",
    icon: CheckCircle2,
  },
  Expired: {
    labelAr: "منتهية",
    labelEn: "Expired",
    badgeClass: "bg-rose-100 text-rose-950 border border-rose-300 font-black animate-pulse",
    icon: AlertTriangle,
  },
  Incomplete: {
    labelAr: "غير مكتملة",
    labelEn: "Incomplete",
    badgeClass: "bg-amber-100 text-amber-950 border border-amber-300 font-black",
    icon: Clock,
  },
  Missing: {
    labelAr: "مفقودة",
    labelEn: "Missing",
    badgeClass: "bg-red-100 text-red-950 border border-red-300 font-black",
    icon: AlertCircle,
  },
  Optional: {
    labelAr: "اختيارية",
    labelEn: "Optional",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-300 font-bold",
    icon: HelpCircle,
  },
};

const missingFieldLabels: Record<string, { ar: string; en: string }> = {
  document: { ar: "وثيقة غير مرفوعة", en: "Document missing" },
  activeDocument: { ar: "لا توجد وثيقة نشطة", en: "No active document" },
  documentNumber: { ar: "رقم الوثيقة مطلوب", en: "Document number required" },
  issueDate: { ar: "تاريخ الإصدار مطلوب", en: "Issue date required" },
  expiryDate: { ar: "تاريخ الانتهاء مطلوب", en: "Expiry date required" },
  validExpiryDate: { ar: "الوثيقة منتهية الصلاحية", en: "Expired document" },
  file: { ar: "الملف مطلوب", en: "File required" },
};

function formatDocDate(value: string | null, locale: "ar" | "en" = "ar") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-arab" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function StaffDocumentChecklistPanel({
  employeeId,
  riderProfileId,
  staffName,
}: {
  employeeId?: string | null;
  riderProfileId?: string | null;
  staffName?: string | null;
}) {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const canUpload = can("documents.upload");
  const canDownloadSensitive = can("documents.download_sensitive");

  const [checklist, setChecklist] = useState<StaffDocumentChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Upload modal state for checklist item
  const [uploadTargetItem, setUploadTargetItem] = useState<StaffDocumentChecklistItem | null>(null);

  // Version target upload state
  const [versionTargetDoc, setVersionTargetDoc] = useState<EmployeeDocument | null>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  // Edit metadata target state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // History target state
  const [expandedHistoryDocId, setExpandedHistoryDocId] = useState<string | null>(null);
  const [docVersions, setDocVersions] = useState<Record<string, EmployeeDocumentVersion[]>>({});

  // Sensitive Preview Modal state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    contentType: string;
    docId: string;
    versionId?: string;
  }>({ isOpen: false, title: "", url: "", contentType: "", docId: "" });

  const loadChecklist = async () => {
    if (!employeeId && !riderProfileId) return;
    setLoading(true);
    setError("");
    try {
      let data: StaffDocumentChecklistItem[] = [];
      if (riderProfileId) {
        data = await getRiderChecklist(riderProfileId);
      } else if (employeeId) {
        data = await getEmployeeChecklist(employeeId);
      }
      setChecklist(data || []);
    } catch (err: any) {
      const msg =
        err?.message ||
        (isEn ? "Failed to load document checklist." : "تعذر تحميل قائمة تعبئة الوثائق.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [employeeId, riderProfileId]);

  // Statistics calculation
  const stats = {
    total: checklist.length,
    complete: checklist.filter((i) => i.fulfillmentStatus === "Complete").length,
    missing: checklist.filter((i) => i.fulfillmentStatus === "Missing").length,
    expired: checklist.filter((i) => i.fulfillmentStatus === "Expired").length,
    incomplete: checklist.filter((i) => i.fulfillmentStatus === "Incomplete").length,
    optional: checklist.filter((i) => i.fulfillmentStatus === "Optional").length,
  };

  // Upload checklist item submit
  const handleChecklistUploadSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploadTargetItem) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File;

    if (uploadTargetItem.requiresFile && (!file || file.size === 0)) {
      toast.error(isEn ? "File required" : "الملف مطلوب", isEn ? "Please select a file to upload." : "يرجى اختيار ملف للرفع.");
      return;
    }

    if (uploadTargetItem.requiresNumber && !String(formData.get("documentNumber") || "").trim()) {
      toast.error(isEn ? "Document Number Required" : "رقم الوثيقة مطلوب");
      return;
    }

    if (uploadTargetItem.requiresIssueDate && !String(formData.get("issueDate") || "").trim()) {
      toast.error(isEn ? "Issue Date Required" : "تاريخ الإصدار مطلوب");
      return;
    }

    if (uploadTargetItem.requiresExpiryDate && !String(formData.get("expiryDate") || "").trim()) {
      toast.error(isEn ? "Expiry Date Required" : "تاريخ الانتهاء مطلوب");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (riderProfileId) {
        await uploadRiderChecklistDocument(riderProfileId, formData);
      } else if (employeeId) {
        await uploadEmployeeChecklistDocument(employeeId, formData);
      }
      toast.success(
        isEn ? "Document Uploaded" : "تم رفع الوثيقة",
        isEn ? "Document uploaded successfully." : "تم رفع الوثيقة بنجاح وإعادة احتساب الاستيفاء."
      );
      setUploadTargetItem(null);
      form.reset();
      loadChecklist();
    } catch (err: any) {
      let msg = err?.message || (isEn ? "Failed to upload document." : "تعذر رفع الوثيقة.");
      if (err?.status === 409) {
        msg = isEn
          ? "Duplicate document number or concurrency conflict."
          : "رقم الوثيقة مستخدم بالفعل أو تعارض في البيانات.";
      } else if (err?.status === 400) {
        msg = isEn ? `Invalid data or file format: ${msg}` : `البيانات أو الملف غير صالح: ${msg}`;
      }
      setError(msg);
      toast.error(isEn ? "Upload Error" : "خطأ في الرفع", msg);
    } finally {
      setBusy(false);
    }
  };

  // New Version Upload
  const handleVersionUpload = async (file: File) => {
    const targetEmpId = employeeId || (riderProfileId ? riderProfileId : null);
    if (!versionTargetDoc || !targetEmpId) return;

    setBusy(true);
    try {
      await uploadEmployeeDocumentVersion(targetEmpId, versionTargetDoc.id, file);
      toast.success(
        isEn ? "New Version Uploaded" : "تم رفع النسخة الجديدة",
        isEn ? "Document version updated successfully." : "تم تحديث نسخة الوثيقة بنجاح."
      );
      setVersionTargetDoc(null);
      loadChecklist();
    } catch (err: any) {
      toast.error(
        isEn ? "Upload Failed" : "فشل الرفع",
        err?.message || (isEn ? "Unable to upload new version." : "تعذر رفع النسخة الجديدة.")
      );
    } finally {
      setBusy(false);
    }
  };

  // Save Metadata Edit
  const handleSaveMetadata = async (e: FormEvent<HTMLFormElement>, doc: EmployeeDocument) => {
    e.preventDefault();
    const targetEmpId = employeeId || (riderProfileId ? riderProfileId : null);
    if (!targetEmpId) return;

    const form = new FormData(e.currentTarget);
    const metadata = {
      documentNumber: String(form.get("documentNumber") || "").trim() || null,
      issueDate: String(form.get("issueDate") || "").trim() || null,
      expiryDate: String(form.get("expiryDate") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    };

    setBusy(true);
    try {
      await updateEmployeeDocumentMetadata(targetEmpId, doc.id, metadata, doc.rowVersion);
      toast.success(
        isEn ? "Metadata Updated" : "تم تحديث البيانات",
        isEn ? "Document metadata updated successfully." : "تم تحديث بيانات الوثيقة بنجاح."
      );
      setEditingDocId(null);
      loadChecklist();
    } catch (err: any) {
      toast.error(
        isEn ? "Update Failed" : "فشل التحديث",
        err?.message || (isEn ? "Unable to update document metadata." : "تعذر تحديث البيانات.")
      );
    } finally {
      setBusy(false);
    }
  };

  // Toggle History
  const toggleHistory = async (doc: EmployeeDocument) => {
    const targetEmpId = employeeId || (riderProfileId ? riderProfileId : null);
    if (!targetEmpId) return;

    if (expandedHistoryDocId === doc.id) {
      setExpandedHistoryDocId(null);
      return;
    }
    setExpandedHistoryDocId(doc.id);
    if (!docVersions[doc.id]) {
      try {
        const rows = await getEmployeeDocumentVersions(targetEmpId, doc.id);
        setDocVersions((prev) => ({ ...prev, [doc.id]: rows }));
      } catch (err: any) {
        toast.error(isEn ? "History Error" : "خطأ السجل", isEn ? "Failed to load versions." : "تعذر تحميل النسخ.");
      }
    }
  };

  // Preview sensitive document
  const handlePreviewDocument = async (doc: EmployeeDocument, versionId?: string) => {
    const targetEmpId = employeeId || (riderProfileId ? riderProfileId : null);
    if (!targetEmpId) return;
    if (!canDownloadSensitive) {
      toast.error(
        isEn ? "Permission Denied" : "صلاحية غير متوفرة",
        isEn ? "You do not have permission to view sensitive document files." : "ليس لديك صلاحية تنزيل/معاينة الوثائق الحساسة (documents.download_sensitive)."
      );
      return;
    }

    setBusy(true);
    try {
      const res = await previewEmployeeDocumentFile(targetEmpId, doc.id, versionId);
      setPreviewModal({
        isOpen: true,
        title: `${doc.documentTypeNameAr} ${versionId ? `(v${versionId})` : ""}`,
        url: res.url,
        contentType: res.contentType,
        docId: doc.id,
        versionId,
      });
    } catch (err: any) {
      toast.error(
        isEn ? "Preview Error" : "خطأ في المعاينة",
        err?.message || (isEn ? "Failed to preview document file." : "تعذر معاينة ملف الوثيقة.")
      );
    } finally {
      setBusy(false);
    }
  };

  // Download sensitive document
  const handleDownloadDocument = async (doc: EmployeeDocument, versionId?: string) => {
    const targetEmpId = employeeId || (riderProfileId ? riderProfileId : null);
    if (!targetEmpId) return;
    if (!canDownloadSensitive) {
      toast.error(
        isEn ? "Permission Denied" : "صلاحية غير متوفرة",
        isEn ? "You do not have permission to download sensitive document files." : "ليس لديك صلاحية تنزيل الوثائق الحساسة (documents.download_sensitive)."
      );
      return;
    }

    try {
      const { blob, fileName } = await downloadEmployeeDocumentFile(targetEmpId, doc.id, versionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(fileName || doc.currentFileName || "document");
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(
        isEn ? "Download Error" : "خطأ في التنزيل",
        err?.message || (isEn ? "Failed to download document file." : "تعذر تنزيل ملف الوثيقة.")
      );
    }
  };

  // Archive document
  const handleArchiveDocument = async (doc: EmployeeDocument) => {
    const targetEmpId = employeeId || (riderProfileId ? riderProfileId : null);
    if (!targetEmpId) return;

    const reason = await systemPrompt(
      isEn ? "Reason for archiving document" : "سبب أرشفة الوثيقة",
      isEn ? "Enter legal or correction reason..." : "أدخل سبب أرشفة هذا المستند..."
    );
    if (!reason) return;

    setBusy(true);
    try {
      await archiveEmployeeDocumentRecord(targetEmpId, doc.id, reason, doc.rowVersion);
      toast.success(
        isEn ? "Document Archived" : "تمت أرشفة الوثيقة",
        isEn ? "Document record archived successfully." : "تمت أرشفة الوثيقة وإلغاء استيفائها."
      );
      loadChecklist();
    } catch (err: any) {
      toast.error(
        isEn ? "Archive Failed" : "فشل الأرشفة",
        err?.message || (isEn ? "Failed to archive document." : "تعذر أرشفة الوثيقة.")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for version uploading */}
      <input
        ref={versionFileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleVersionUpload(file);
          e.target.value = "";
        }}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Stat Badges */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Total Types" : "إجمالي الوثائق"}</p>
            <p className="text-xl font-black">{stats.total}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Complete" : "مكتملة"}</p>
            <p className="text-xl font-black text-emerald-600">{stats.complete}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Missing" : "مفقودة"}</p>
            <p className="text-xl font-black text-red-600">{stats.missing}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Expired" : "منتهية"}</p>
            <p className="text-xl font-black text-rose-600">{stats.expired}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Incomplete" : "غير مكتملة"}</p>
            <p className="text-xl font-black text-amber-600">{stats.incomplete}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <HelpCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--muted)]">{isEn ? "Optional" : "اختيارية"}</p>
            <p className="text-xl font-black text-slate-600">{stats.optional}</p>
          </div>
        </Card>
      </div>

      {/* Checklist Main List */}
      {loading ? (
        <Card className="p-10 text-center text-sm font-bold text-[var(--muted)]">
          {isEn ? "Calculating staff document checklist status..." : "جاري حساب وحصر استيفاء الوثائق..."}
        </Card>
      ) : checklist.length === 0 ? (
        <Card className="p-10 text-center text-sm font-bold text-[var(--muted)]">
          {isEn ? "No document requirements assigned for this staff member." : "لا توجد متطلبات وثائق مسندة لهذا الفرد حالياً."}
        </Card>
      ) : (
        <div className="space-y-4">
          {checklist.map((item) => {
            const fConf = fulfillmentConfig[item.fulfillmentStatus] || fulfillmentConfig.Missing;
            const FIcon = fConf.icon;
            const title = isEn ? item.documentTypeNameEn || item.documentTypeNameAr : item.documentTypeNameAr;

            return (
              <Card
                key={item.documentTypeId}
                className="p-5 space-y-4 transition-all hover:border-blue-300"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#1167c9] shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-[var(--foreground)]">{title}</h3>
                        <span className="font-mono text-xs font-bold rounded bg-[var(--subtle-bg)] px-2 py-0.5 border border-[var(--border)] text-[var(--muted)]">
                          {item.documentTypeCode}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                        {item.isRequired ? (
                          <span className="text-rose-600 font-extrabold">{isEn ? "Mandatory" : "إلزامية"}</span>
                        ) : (
                          <span>{isEn ? "Optional Requirement" : "متطلب اختياري"}</span>
                        )}
                        {item.reminderOffsetsDays && item.reminderOffsetsDays.length > 0 && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                            {isEn ? "Reminders: " : "أيام التذكير: "}
                            {item.reminderOffsetsDays.join(", ")} {isEn ? "days" : "يوم"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Fulfillment Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black shadow-sm ${fConf.badgeClass}`}>
                      <FIcon size={15} />
                      <span>{isEn ? fConf.labelEn : fConf.labelAr}</span>
                    </span>

                    {/* Upload button for this checklist definition */}
                    {canUpload && (
                      <Button
                        onClick={() => setUploadTargetItem(item)}
                        className="gap-1.5 text-xs bg-[#1167c9] hover:bg-blue-700 text-white font-bold h-8 px-3"
                      >
                        <Upload size={14} />
                        {isEn ? "Upload Document" : "رفع الوثيقة"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline Missing Fields Validation Hints */}
                {item.missingFields && item.missingFields.length > 0 && item.fulfillmentStatus !== "Complete" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs font-bold text-amber-900 flex flex-wrap items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    <span>{isEn ? "Validation hints: " : "الملاحظات والشروط المفقودة: "}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.missingFields.map((field) => {
                        const lbl = missingFieldLabels[field];
                        const text = lbl ? (isEn ? lbl.en : lbl.ar) : field;
                        return (
                          <span
                            key={field}
                            className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] text-amber-950 border border-amber-300 font-bold"
                          >
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Uploaded records list for this document type */}
                {item.documents && item.documents.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-[var(--muted)]">
                      {isEn ? "Uploaded Records & Version History:" : "الوثائق المرفوعة وسجلات النسخ:"}
                    </p>
                    {item.documents.map((doc) => {
                      const isEditing = editingDocId === doc.id;
                      const isHistoryExpanded = expandedHistoryDocId === doc.id;

                      return (
                        <div
                          key={doc.id}
                          className={`rounded-xl border bg-[var(--surface)] p-4 shadow-sm space-y-3 transition-all ${
                            isEditing
                              ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10"
                              : "border-[var(--border)]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-[#1167c9]">
                                {doc.documentNumber || (isEn ? "No Number" : "بدون رقم")}
                              </span>
                              {doc.currentVersionNumber && (
                                <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-bold text-[#1167c9] border border-blue-200">
                                  v{doc.currentVersionNumber}
                                </span>
                              )}
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                  doc.status === "Active"
                                    ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                                    : doc.status === "Expired"
                                    ? "bg-rose-100 text-rose-950 border border-rose-300"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {doc.status}
                              </span>
                            </div>

                            <p className="font-mono text-[11px] text-[var(--muted)]">
                              {doc.currentFileName
                                ? `${doc.currentFileName} ${
                                    doc.currentFileSizeBytes
                                      ? `(${(doc.currentFileSizeBytes / 1024).toFixed(1)} KB)`
                                      : ""
                                  }`
                                : (isEn ? "No file file" : "لا يوجد ملف")}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-[var(--muted)] font-medium block">{isEn ? "Issue Date" : "تاريخ الإصدار"}</span>
                              <span className="font-extrabold text-[var(--foreground)]">{formatDocDate(doc.issueDate, locale)}</span>
                            </div>
                            <div>
                              <span className="text-[var(--muted)] font-medium block">{isEn ? "Expiry Date" : "تاريخ الانتهاء"}</span>
                              <span className="font-extrabold text-[var(--foreground)]">{formatDocDate(doc.expiryDate, locale)}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[var(--muted)] font-medium block">{isEn ? "Notes" : "ملاحظات"}</span>
                              <span className="font-extrabold text-[var(--foreground)]">{doc.notes || "—"}</span>
                            </div>
                          </div>

                          {/* Action toolbar for document record */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {canDownloadSensitive && doc.currentFileName && (
                                <>
                                  <Button
                                    variant="secondary"
                                    onClick={() => handlePreviewDocument(doc)}
                                    className="h-8 px-2 text-xs font-bold gap-1"
                                  >
                                    <Eye size={13} />
                                    {isEn ? "Preview" : "معاينة"}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    onClick={() => handleDownloadDocument(doc)}
                                    className="h-8 px-2 text-xs font-bold gap-1"
                                  >
                                    <Download size={13} />
                                    {isEn ? "Download" : "تنزيل"}
                                  </Button>
                                </>
                              )}

                              {canUpload && (
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setVersionTargetDoc(doc);
                                    versionFileInputRef.current?.click();
                                  }}
                                  className="h-8 px-2 text-xs font-bold gap-1"
                                >
                                  <RefreshCw size={13} />
                                  {isEn ? "New Version" : "رفع نسخة"}
                                </Button>
                              )}

                              {canUpload && (
                                <Button
                                  variant="secondary"
                                  onClick={() => setEditingDocId(isEditing ? null : doc.id)}
                                  className={`h-8 px-2 text-xs font-bold gap-1 ${
                                    isEditing ? "bg-amber-600 text-white" : ""
                                  }`}
                                >
                                  <Pencil size={13} />
                                  {isEn ? "Edit Metadata" : "تعديل البيانات"}
                                </Button>
                              )}

                              <Button
                                variant="secondary"
                                onClick={() => toggleHistory(doc)}
                                className="h-8 px-2 text-xs font-bold gap-1"
                              >
                                <History size={13} />
                                {isHistoryExpanded
                                  ? isEn ? "Hide History" : "إخفاء السجل"
                                  : isEn ? "Versions History" : "سجل النسخ"}
                              </Button>
                            </div>

                            {canUpload && (
                              <Button
                                variant="secondary"
                                onClick={() => handleArchiveDocument(doc)}
                                className="h-7 px-2.5 text-[11px] gap-1 text-red-600 hover:bg-red-50 border-red-200"
                              >
                                <Archive size={13} />
                                {isEn ? "Archive" : "أرشفة"}
                              </Button>
                            )}
                          </div>

                          {/* Metadata Edit Form */}
                          {isEditing && (
                            <form
                              onSubmit={(e) => handleSaveMetadata(e, doc)}
                              className="mt-3 grid gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4 sm:grid-cols-2 animate-in fade-in duration-200"
                            >
                              <div>
                                <label className="block text-xs font-bold mb-1">
                                  {isEn ? "Document Number" : "رقم الوثيقة"}
                                </label>
                                <input
                                  type="text"
                                  name="documentNumber"
                                  defaultValue={doc.documentNumber || ""}
                                  className="h-9 w-full rounded-lg border bg-white px-3 text-xs font-bold outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold mb-1">
                                  {isEn ? "Issue Date" : "تاريخ الإصدار"}
                                </label>
                                <input
                                  type="date"
                                  name="issueDate"
                                  defaultValue={doc.issueDate ? doc.issueDate.slice(0, 10) : ""}
                                  className="h-9 w-full rounded-lg border bg-white px-3 text-xs font-bold outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold mb-1">
                                  {isEn ? "Expiry Date" : "تاريخ الانتهاء"}
                                </label>
                                <input
                                  type="date"
                                  name="expiryDate"
                                  defaultValue={doc.expiryDate ? doc.expiryDate.slice(0, 10) : ""}
                                  className="h-9 w-full rounded-lg border bg-white px-3 text-xs font-bold outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold mb-1">
                                  {isEn ? "Notes" : "ملاحظات"}
                                </label>
                                <input
                                  type="text"
                                  name="notes"
                                  defaultValue={doc.notes || ""}
                                  className="h-9 w-full rounded-lg border bg-white px-3 text-xs font-bold outline-none"
                                />
                              </div>

                              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => setEditingDocId(null)}
                                >
                                  {isEn ? "Cancel" : "إلغاء"}
                                </Button>
                                <Button type="submit" loading={busy}>
                                  {isEn ? "Save Metadata" : "حفظ البيانات"}
                                </Button>
                              </div>
                            </form>
                          )}

                          {/* Version History Table */}
                          {isHistoryExpanded && (
                            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 space-y-2 animate-in fade-in duration-200">
                              <p className="text-xs font-bold text-[var(--foreground)]">
                                {isEn ? "Version History Log:" : "سجل الإصدارات المرفوعة:"}
                              </p>
                              {docVersions[doc.id] && docVersions[doc.id].length > 0 ? (
                                <div className="divide-y divide-[var(--border)] text-xs">
                                  {docVersions[doc.id].map((ver) => (
                                    <div
                                      key={ver.id}
                                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                                    >
                                      <div>
                                        <span className="font-mono font-bold text-[#1167c9]">
                                          v{ver.versionNumber}
                                        </span>
                                        <span className="ms-2 font-mono text-[var(--muted)]">
                                          {ver.originalFileName} ({(ver.fileSizeBytes / 1024).toFixed(1)} KB)
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-[var(--muted)]">
                                          {formatDocDate(ver.uploadedAtUtc, locale)}
                                        </span>
                                        {canDownloadSensitive && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handlePreviewDocument(doc, ver.id)}
                                              className="text-[#1167c9] hover:underline font-bold text-[11px]"
                                            >
                                              {isEn ? "Preview" : "معاينة"}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDownloadDocument(doc, ver.id)}
                                              className="text-[#1167c9] hover:underline font-bold text-[11px]"
                                            >
                                              {isEn ? "Download" : "تنزيل"}
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-[var(--muted)] font-medium">
                                  {isEn ? "No versions found." : "لا توجد نسخ أقدم."}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-[var(--muted)] py-1">
                    {isEn ? "No document files uploaded for this item yet." : "لم يتم رفع أي مستندات لهذا المتطلب حتى الآن."}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal for a specific checklist definition */}
      {uploadTargetItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setUploadTargetItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[var(--surface)] p-6 shadow-2xl space-y-5 border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
                  <FilePlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {isEn ? "Upload Document" : "رفع وثيقة جديدة"}
                  </h3>
                  <p className="text-xs font-bold text-[#1167c9]">
                    {isEn ? uploadTargetItem.documentTypeNameEn || uploadTargetItem.documentTypeNameAr : uploadTargetItem.documentTypeNameAr}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadTargetItem(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border text-[var(--muted)] hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChecklistUploadSubmit} className="space-y-4">
              <input type="hidden" name="documentTypeId" value={uploadTargetItem.documentTypeId} />

              {/* Number field */}
              {uploadTargetItem.requiresNumber && (
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Document / Special Number" : "رقم الوثيقة / الخاص"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="documentNumber"
                    required
                    placeholder="P12345678"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium focus:border-[#1167c9] outline-none"
                  />
                </div>
              )}

              {/* Issue Date field */}
              {uploadTargetItem.requiresIssueDate && (
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Issue Date" : "تاريخ الإصدار"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="issueDate"
                    required
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium focus:border-[#1167c9] outline-none"
                  />
                </div>
              )}

              {/* Expiry Date field */}
              {uploadTargetItem.requiresExpiryDate && (
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Expiry / End Date" : "تاريخ الانتهاء"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    required
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium focus:border-[#1167c9] outline-none"
                  />
                </div>
              )}

              {/* File picker field */}
              {uploadTargetItem.requiresFile && (
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Document File" : "ملف الوثيقة"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="file"
                    name="file"
                    required
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium focus:border-[#1167c9] outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#1167c9]"
                  />
                  <p className="mt-1 text-[11px] text-[var(--muted)] font-medium">
                    {isEn ? "Supported formats: PDF, JPEG, PNG, WEBP (Max 10 MB)." : "الصيغ المعتمدة: PDF, JPEG, PNG, WEBP (بحد أقصى 10 ميجابايت)."}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                  {isEn ? "Notes (Optional)" : "ملاحظات (اختياري)"}
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder={isEn ? "Additional notes..." : "أي ملاحظات إضافية..."}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium focus:border-[#1167c9] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setUploadTargetItem(null)}
                  disabled={busy}
                >
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
                <Button type="submit" loading={busy}>
                  {isEn ? "Upload & Save" : "رفع وتأكيد الوثيقة"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sensitive Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        url={previewModal.url}
        contentType={previewModal.contentType}
        onDownload={() => {
          const item = checklist.flatMap((i) => i.documents).find((d) => d.id === previewModal.docId);
          if (item) void handleDownloadDocument(item, previewModal.versionId);
        }}
        locale={locale}
      />
    </div>
  );
}
