"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  BookOpen,
  Search,
  CheckCircle2,
  XCircle,
  Archive,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  getDocumentTypes,
  createDocumentType,
  updateDocumentType,
  type DocumentType,
  type CatalogStatus,
  type DocumentTypeInput,
} from "../../lib/workforce/documents-api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { toast } from "../ui/Toast";

const SUPPORTED_MIME_TYPES = [
  { value: "application/pdf", label: "PDF Document (.pdf)" },
  { value: "image/jpeg", label: "JPEG Image (.jpg, .jpeg)" },
  { value: "image/png", label: "PNG Image (.png)" },
  { value: "image/webp", label: "WEBP Image (.webp)" },
  { value: "image/gif", label: "GIF Image (.gif)" },
  { value: "image/bmp", label: "BMP Image (.bmp)" },
];

export function DocumentTypeAdminPanel() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const canManage = can("documents.catalog.manage");

  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Modal / Form state
  const [openModal, setOpenModal] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);

  const [formData, setFormData] = useState<DocumentTypeInput>({
    code: "",
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    appliesToSponsoredInternal: true,
    appliesToOutsideRider: true,
    appliesToRiderProfile: true,
    requiresNumber: true,
    requiresIssueDate: false,
    requiresExpiryDate: true,
    requiresFile: true,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxFileSizeBytes: 10485760, // 10 MB
    status: "Active",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDocumentTypes();
      setTypes(data || []);
    } catch (err: any) {
      setError(
        err?.message || (isEn ? "Failed to load document definitions." : "تعذر تحميل أنواع الوثائق.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData({
      code: "",
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      appliesToSponsoredInternal: true,
      appliesToOutsideRider: true,
      appliesToRiderProfile: true,
      requiresNumber: true,
      requiresIssueDate: false,
      requiresExpiryDate: true,
      requiresFile: true,
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
      maxFileSizeBytes: 10485760,
      status: "Active",
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (docType: DocumentType) => {
    setEditingType(docType);
    setFormData({
      code: docType.code,
      nameAr: docType.nameAr,
      nameEn: docType.nameEn,
      descriptionAr: docType.descriptionAr || "",
      descriptionEn: docType.descriptionEn || "",
      appliesToSponsoredInternal: docType.appliesToSponsoredInternal,
      appliesToOutsideRider: docType.appliesToOutsideRider,
      appliesToRiderProfile: docType.appliesToRiderProfile,
      requiresNumber: docType.requiresNumber,
      requiresIssueDate: docType.requiresIssueDate,
      requiresExpiryDate: docType.requiresExpiryDate,
      requiresFile: docType.requiresFile,
      allowedMimeTypes: docType.allowedMimeTypes || ["application/pdf", "image/jpeg", "image/png"],
      maxFileSizeBytes: docType.maxFileSizeBytes || 10485760,
      status: docType.status,
      rowVersion: docType.rowVersion,
    });
    setOpenModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error(isEn ? "Code is required" : "الرمز المطلوب", isEn ? "Please enter a code for the document definition." : "يرجى كتابة رمز تعريفي مستقر للوثيقة.");
      return;
    }

    if (!formData.nameAr.trim() || !formData.nameEn.trim()) {
      toast.error(isEn ? "Names are required" : "الأسماء مطلوبة", isEn ? "Arabic and English names are required." : "الاسم باللغة العربية والإنجليزي مطلوبين.");
      return;
    }

    if (
      !formData.appliesToSponsoredInternal &&
      !formData.appliesToOutsideRider &&
      !formData.appliesToRiderProfile
    ) {
      toast.error(
        isEn ? "Audience required" : "الجمهور المستهدف مطلوب",
        isEn ? "At least one target audience flag must be selected." : "يجب اختيار فئة واحدة على الأقل في جمهور الوثيقة."
      );
      return;
    }

    if (formData.allowedMimeTypes.length === 0) {
      toast.error(isEn ? "File Formats Required" : "أنواع الملفات مطلوبة", isEn ? "Select at least one allowed MIME type." : "اختر نوع ملف واحد على الأقل.");
      return;
    }

    setBusy(true);
    try {
      const payload: DocumentTypeInput = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        descriptionAr: formData.descriptionAr?.trim() || null,
        descriptionEn: formData.descriptionEn?.trim() || null,
        rowVersion: editingType?.rowVersion || null,
      };

      if (editingType) {
        await updateDocumentType(editingType.id, payload);
        toast.success(
          isEn ? "Definition Updated" : "تم تحديث تعريف الوثيقة",
          isEn ? "Document definition updated successfully." : "تم تحديث تعريف نوع الوثيقة بنجاح."
        );
      } else {
        await createDocumentType(payload);
        toast.success(
          isEn ? "Definition Created" : "تم إنشاء نوع الوثيقة",
          isEn ? "New document definition created successfully." : "تم تسجيل نوع وثيقة جديد بنجاح."
        );
      }
      setOpenModal(false);
      loadData();
    } catch (err: any) {
      let msg = err?.message || (isEn ? "Failed to save definition." : "تعذر حفظ تعريف الوثيقة.");
      if (err?.status === 409) {
        msg = isEn ? "Duplicate code or record updated by another user." : "رمز الوثيقة مكرر أو تم تعديله من قبل مستخدم آخر.";
      }
      toast.error(isEn ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setBusy(false);
    }
  };

  const filteredTypes = types.filter(
    (t) =>
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.nameAr.toLowerCase().includes(search.toLowerCase()) ||
      t.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">{isEn ? "Document Definitions" : "كتالوج أنواع الوثائق"}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {isEn
              ? "Configure staff document specifications, rules, MIME formats, and size limits."
              : "إعداد وتحديد شروط وأنواع الملفات وحجم كل وثيقة في النظام."}
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus size={17} />
            {isEn ? "Add Document Definition" : "إضافة نوع وثيقة جديد"}
          </Button>
        )}
      </div>

      {/* Search and Table Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4">
          <div className="relative w-full max-w-md">
            <Search
              className={`pointer-events-none absolute top-3 text-[var(--muted)] ${
                isEn ? "left-3" : "right-3"
              }`}
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEn ? "Search by code or name..." : "ابحث بالرمز أو الاسم..."}
              className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm ${
                isEn ? "pl-10 pr-3" : "pr-10 pl-3"
              }`}
            />
          </div>
        </div>

        {error ? (
          <div className="p-6 text-center text-sm font-bold text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-10 text-center text-sm font-bold text-[var(--muted)]">
            {isEn ? "Loading document definitions..." : "جاري تحميل أنواع الوثائق..."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-[900px] w-full ${isEn ? "text-left" : "text-right"}`}>
              <thead className="bg-slate-500/10 text-xs font-bold text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4">{isEn ? "Code" : "الرمز"}</th>
                  <th className="px-5 py-4">{isEn ? "Name (Ar / En)" : "الاسم العربي والإنكليزي"}</th>
                  <th className="px-5 py-4">{isEn ? "Audience" : "الجمهور المستهدف"}</th>
                  <th className="px-5 py-4">{isEn ? "Required Rules" : "الشروط المطلوبة"}</th>
                  <th className="px-5 py-4">{isEn ? "File Formats & Size" : "صيغ الملفات والحجم"}</th>
                  <th className="px-5 py-4">{isEn ? "Status" : "الحالة"}</th>
                  {canManage && <th className="px-5 py-4 text-center">{isEn ? "Action" : "الإجراء"}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {filteredTypes.map((t) => (
                  <tr key={t.id} className="hover:bg-blue-500/5 transition-colors">
                    <td className="px-5 py-4 font-mono font-black text-[#1167c9]">{t.code}</td>
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900">{t.nameAr}</div>
                      <div className="text-xs text-[var(--muted)] font-medium">{t.nameEn}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium">
                      <div className="flex flex-wrap gap-1">
                        {t.appliesToSponsoredInternal && (
                          <span className="rounded bg-blue-50 text-[#1167c9] px-2 py-0.5 font-bold border border-blue-200">
                            {isEn ? "Admin" : "اداري"}
                          </span>
                        )}
                        {t.appliesToOutsideRider && (
                          <span className="rounded bg-purple-50 text-purple-700 px-2 py-0.5 font-bold border border-purple-200">
                            {isEn ? "Outside Rider" : "مندوب خارجي"}
                          </span>
                        )}
                        {t.appliesToRiderProfile && (
                          <span className="rounded bg-cyan-50 text-cyan-700 px-2 py-0.5 font-bold border border-cyan-200">
                            {isEn ? "Rider" : "مندوب"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium">
                      <div className="flex flex-wrap gap-1.5">
                        {t.requiresNumber && (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 border">
                            {isEn ? "# Number" : "رقم"}
                          </span>
                        )}
                        {t.requiresIssueDate && (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 border">
                            {isEn ? "Issue Date" : "تاريخ إصدار"}
                          </span>
                        )}
                        {t.requiresExpiryDate && (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 border">
                            {isEn ? "Expiry Date" : "تاريخ انتهاء"}
                          </span>
                        )}
                        {t.requiresFile && (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 border">
                            {isEn ? "File Required" : "ملف"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono">
                      <div>{(t.allowedMimeTypes || []).map((m) => m.split("/")[1]).join(", ")}</div>
                      <div className="text-[11px] text-[var(--muted)] font-bold">
                        {isEn ? "Max: " : "أقصى حجم: "}
                        {(t.maxFileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black ${
                          t.status === "Active"
                            ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                            : t.status === "Disabled"
                            ? "bg-amber-100 text-amber-950 border border-amber-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-4 text-center">
                        <Button
                          variant="secondary"
                          onClick={() => handleOpenEdit(t)}
                          className="h-8 px-2.5 text-xs gap-1"
                        >
                          <Pencil size={14} />
                          {isEn ? "Edit" : "تعديل"}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredTypes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-sm font-bold text-[var(--muted)]">
                      {isEn ? "No matching document definitions found." : "لا توجد تعريفات وثائق مطابقة."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Creation / Editing Modal */}
      {openModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black">
                  {editingType
                    ? isEn ? "Edit Document Definition" : "تعديل تعريف الوثيقة"
                    : isEn ? "Create Document Definition" : "إنشاء نوع وثيقة جديد"}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {isEn ? "Configure definition rules and audience targets." : "تحديد القواعد، فئات الجمهور، وأنواع الملفات المسموحة."}
                </p>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border text-[var(--muted)] hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Stable Code Key (Uppercase) *" : "الرمز التعريفي (أحرف كبيرة) *"}
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PASSPORT_IMAGE"
                    required
                    disabled={!!editingType}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-mono font-bold focus:border-[#1167c9] outline-none disabled:bg-slate-100"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Status *" : "الحالة *"}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CatalogStatus })}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
                  >
                    <option value="Active">{isEn ? "Active" : "نشط"}</option>
                    <option value="Disabled">{isEn ? "Disabled" : "معطل"}</option>
                    <option value="Archived">{isEn ? "Archived" : "مؤرشف"}</option>
                  </select>
                </div>

                {/* Name Ar */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Arabic Name *" : "الاسم بالعربية *"}
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    placeholder="صورة جواز السفر"
                    required
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
                  />
                </div>

                {/* Name En */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "English Name *" : "الاسم بالإنجليزية *"}
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="Passport image"
                    required
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
                  />
                </div>

                {/* Description Ar */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Arabic Description" : "الوصف بالعربية"}
                  </label>
                  <input
                    type="text"
                    value={formData.descriptionAr || ""}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium focus:border-[#1167c9] outline-none"
                  />
                </div>
              </div>

              {/* Target Audience Checkboxes */}
              <div className="rounded-xl border p-4 bg-slate-50/50 space-y-2">
                <p className="text-xs font-bold text-[#1167c9]">
                  {isEn ? "Target Audience Flags (At least one must be active):" : "جمهور الوثيقة الفعلي (يجب اختيار فئة واحدة على الأقل):"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.appliesToSponsoredInternal}
                      onChange={(e) =>
                        setFormData({ ...formData, appliesToSponsoredInternal: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                    />
                    <span>{isEn ? "Admin Staff" : "اداري"}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.appliesToOutsideRider}
                      onChange={(e) =>
                        setFormData({ ...formData, appliesToOutsideRider: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                    />
                    <span>{isEn ? "Outside Rider" : "مندوب خارجي"}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.appliesToRiderProfile}
                      onChange={(e) =>
                        setFormData({ ...formData, appliesToRiderProfile: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                    />
                    <span>{isEn ? "Rider" : "مندوب"}</span>
                  </label>
                </div>
              </div>

              {/* Field Requirement Flags */}
              <div className="rounded-xl border p-4 bg-slate-50/50 space-y-2">
                <p className="text-xs font-bold text-[#1167c9]">
                  {isEn ? "Required Data Input Flags:" : "الشروط والبيانات المطلوبة عند الرفع:"}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.requiresNumber}
                      onChange={(e) => setFormData({ ...formData, requiresNumber: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                    />
                    <span>{isEn ? "Requires Number" : "رقم الوثيقة"}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.requiresIssueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, requiresIssueDate: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                    />
                    <span>{isEn ? "Requires Issue Date" : "تاريخ الإصدار"}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.requiresExpiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, requiresExpiryDate: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                    />
                    <span>{isEn ? "Requires Expiry Date" : "تاريخ الانتهاء"}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.requiresFile}
                      onChange={(e) => setFormData({ ...formData, requiresFile: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                    />
                    <span>{isEn ? "Requires File" : "ملف الوثيقة"}</span>
                  </label>
                </div>
              </div>

              {/* MIME Types & Max File Size */}
              <div className="rounded-xl border p-4 bg-slate-50/50 space-y-3">
                <p className="text-xs font-bold text-[#1167c9]">
                  {isEn ? "Allowed File Formats & Max Size Limit:" : "أنواع وقوالب الملفات المقبولة وأقصى حجم:"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                  {SUPPORTED_MIME_TYPES.map((mime) => (
                    <label key={mime.value} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.allowedMimeTypes.includes(mime.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              allowedMimeTypes: [...formData.allowedMimeTypes, mime.value],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              allowedMimeTypes: formData.allowedMimeTypes.filter((m) => m !== mime.value),
                            });
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                      />
                      <span>{mime.label}</span>
                    </label>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Maximum Upload Size (MB)" : "أقصى حجم مسموح به (بالميجابايت - أقصى 10MB حالياً)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.maxFileSizeBytes / (1024 * 1024)}
                    onChange={(e) => {
                      const mb = Math.max(1, Math.min(100, Number(e.target.value) || 10));
                      setFormData({ ...formData, maxFileSizeBytes: mb * 1024 * 1024 });
                    }}
                    className="h-10 w-full sm:w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-mono font-bold focus:border-[#1167c9] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpenModal(false)}
                  disabled={busy}
                >
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
                <Button type="submit" loading={busy}>
                  {editingType ? (isEn ? "Save Changes" : "تحديث التعريف") : (isEn ? "Create Definition" : "إضافة نوع الوثيقة")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
