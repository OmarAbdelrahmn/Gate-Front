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
  Filter,
  Info,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  getDocumentTypes,
  getDocumentRequirements,
  createDocumentRequirement,
  updateDocumentRequirement,
  type DocumentType,
  type DocumentRequirement,
  type CatalogStatus,
  type DocumentRequirementInput,
} from "../../lib/workforce/documents-api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { toast } from "../ui/Toast";

function getScopeDescription(
  rel: "SponsoredInternal" | "OutsideRider" | null,
  isRider: boolean,
  locale: "ar" | "en" = "ar"
) {
  const isEn = locale === "en";
  if (rel === null && !isRider) {
    return isEn ? "All staff and riders" : "جميع الموظفين والمناديب";
  }
  if (rel === null && isRider) {
    return isEn ? "All riders (admin and outside)" : "جميع المناديب (إداري وخارجي)";
  }
  if (rel === "SponsoredInternal" && !isRider) {
    return isEn ? "All admin staff" : "الإداريين فقط";
  }
  if (rel === "SponsoredInternal" && isRider) {
    return isEn ? "Admin riders only" : "المناديب فقط";
  }
  if (rel === "OutsideRider") {
    return isEn ? "Outside riders only" : "المناديب الخارجيين فقط";
  }
  return isEn ? "Custom Scope" : "نطاق مخصص";
}

export function DocumentRequirementAdminPanel() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const canManage = can("documents.catalog.manage");

  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Modal / Form state
  const [openModal, setOpenModal] = useState(false);
  const [editingReq, setEditingReq] = useState<DocumentRequirement | null>(null);

  const [formData, setFormData] = useState<{
    documentTypeId: string;
    relationshipType: "SponsoredInternal" | "OutsideRider" | null;
    appliesToRiderProfile: boolean;
    isRequired: boolean;
    reminderOffsetsDaysInput: string;
    effectiveFrom: string;
    effectiveTo: string;
    status: CatalogStatus;
  }>({
    documentTypeId: "",
    relationshipType: null,
    appliesToRiderProfile: false,
    isRequired: true,
    reminderOffsetsDaysInput: "90, 60, 30, 7, 0",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    status: "Active",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [typesRes, reqsRes] = await Promise.all([
        getDocumentTypes(),
        getDocumentRequirements(selectedDocTypeId || undefined),
      ]);
      setDocTypes(typesRes || []);
      setRequirements(reqsRes || []);
    } catch (err: any) {
      setError(
        err?.message || (isEn ? "Failed to load requirements." : "تعذر تحميل تكليفات الوثائق.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDocTypeId]);

  const handleOpenCreate = () => {
    setEditingReq(null);
    setFormData({
      documentTypeId: docTypes[0]?.id || "",
      relationshipType: null,
      appliesToRiderProfile: false,
      isRequired: true,
      reminderOffsetsDaysInput: "90, 60, 30, 7, 0",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: "",
      status: "Active",
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (req: DocumentRequirement) => {
    setEditingReq(req);
    setFormData({
      documentTypeId: req.documentTypeId,
      relationshipType: req.relationshipType,
      appliesToRiderProfile: req.appliesToRiderProfile,
      isRequired: req.isRequired,
      reminderOffsetsDaysInput: (req.reminderOffsetsDays || []).join(", "),
      effectiveFrom: req.effectiveFrom ? req.effectiveFrom.slice(0, 10) : "",
      effectiveTo: req.effectiveTo ? req.effectiveTo.slice(0, 10) : "",
      status: req.status,
    });
    setOpenModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.documentTypeId) {
      toast.error(isEn ? "Document Type Required" : "نوع الوثيقة مطلوب");
      return;
    }

    if (!formData.effectiveFrom) {
      toast.error(isEn ? "Effective From Date Required" : "تاريخ سريان المتطلب مطلوب");
      return;
    }

    // Parse reminder offsets
    const offsets = formData.reminderOffsetsDaysInput
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n >= 0)
      .sort((a, b) => b - a);

    setBusy(true);
    try {
      const payload: DocumentRequirementInput = {
        documentTypeId: formData.documentTypeId,
        relationshipType: formData.relationshipType,
        appliesToRiderProfile: formData.appliesToRiderProfile,
        isRequired: formData.isRequired,
        reminderOffsetsDays: offsets,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo.trim() ? formData.effectiveTo.trim() : null,
        status: formData.status,
        rowVersion: editingReq?.rowVersion || null,
      };

      if (editingReq) {
        await updateDocumentRequirement(editingReq.id, payload);
        toast.success(
          isEn ? "Requirement Updated" : "تم تحديث التكليف",
          isEn ? "Document requirement updated successfully." : "تم تحديث متطلب الوثيقة بنجاح."
        );
      } else {
        await createDocumentRequirement(payload);
        toast.success(
          isEn ? "Requirement Created" : "تم إضافة التكليف",
          isEn ? "New document requirement assigned successfully." : "تم إنشاء تكليف وثيقة جديد بنجاح."
        );
      }
      setOpenModal(false);
      loadData();
    } catch (err: any) {
      let msg = err?.message || (isEn ? "Failed to save requirement." : "تعذر حفظ التكليف.");
      if (err?.status === 409) {
        msg = isEn ? "Conflict or overlapping active requirement rule." : "تعارض في التكليف أو أن البيانات محدثة من مستخدم آخر.";
      }
      toast.error(isEn ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">{isEn ? "Document Requirements" : "تكليفات ومتطلبات الوثائق"}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {isEn
              ? "Assign document rules to staff categories, set mandatory flags, effective dates, and reminder days."
              : "تخصيص الوثائق المطلوبة لكل فئة موظفين/مناديب وتحديد تاريخ السريان وأيام التنبيه."}
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus size={17} />
            {isEn ? "Add Requirement Rule" : "إضافة تكليف متطلب جديد"}
          </Button>
        )}
      </div>

      {/* Filter and Table Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-[var(--muted)]" />
            <span className="text-xs font-bold">{isEn ? "Filter by Document Type:" : "تصفية حسب نوع الوثيقة:"}</span>
            <select
              value={selectedDocTypeId}
              onChange={(e) => setSelectedDocTypeId(e.target.value)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
            >
              <option value="">{isEn ? "All Document Types" : "جميع أنواع الوثائق"}</option>
              {docTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {isEn ? dt.nameEn : dt.nameAr} ({dt.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="p-6 text-center text-sm font-bold text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-10 text-center text-sm font-bold text-[var(--muted)]">
            {isEn ? "Loading document requirements..." : "جاري تحميل التكليفات والمتطلبات..."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-[900px] w-full ${isEn ? "text-left" : "text-right"}`}>
              <thead className="bg-slate-500/10 text-xs font-bold text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4">{isEn ? "Document Name" : "اسم الوثيقة"}</th>
                  <th className="px-5 py-4">{isEn ? "Target Scope" : "النطاق المستهدف"}</th>
                  <th className="px-5 py-4">{isEn ? "Mandatory / Optional" : "إلزامي / اختياري"}</th>
                  <th className="px-5 py-4">{isEn ? "Effective Dates" : "تواريخ السريان"}</th>
                  <th className="px-5 py-4">{isEn ? "Reminders (Days)" : "أيام التنبيه"}</th>
                  <th className="px-5 py-4">{isEn ? "Status" : "الحالة"}</th>
                  {canManage && <th className="px-5 py-4 text-center">{isEn ? "Action" : "الإجراء"}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {requirements.map((r) => {
                  const scopeText = getScopeDescription(r.relationshipType, r.appliesToRiderProfile, locale);
                  const matchedType = docTypes.find(
                    (dt) => dt.id === r.documentTypeId || dt.code === r.documentTypeCode
                  );
                  const docName = matchedType
                    ? (isEn ? matchedType.nameEn : matchedType.nameAr)
                    : r.documentTypeCode;
                  return (
                    <tr key={r.id} className="hover:bg-blue-500/5 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">{docName}</div>
                        <div className="font-mono text-xs font-bold text-[#1167c9]">
                          {r.documentTypeCode}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">{scopeText}</div>
                        <div className="mt-0.5 text-xs text-[var(--muted)]">
                          {r.relationshipType || "Null (All)"} | {r.appliesToRiderProfile ? "RiderProfile=true" : "RiderProfile=false"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {r.isRequired ? (
                          <span className="inline-flex rounded-full bg-rose-100 text-rose-950 px-3 py-0.5 text-xs font-black border border-rose-300">
                            {isEn ? "Mandatory" : "إلزامي"}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 text-slate-700 px-3 py-0.5 text-xs font-bold border border-slate-300">
                            {isEn ? "Optional" : "اختياري"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono">
                        <div>{isEn ? "From: " : "من: "}{r.effectiveFrom ? r.effectiveFrom.slice(0, 10) : "—"}</div>
                        <div className="text-[11px] text-[var(--muted)]">
                          {isEn ? "To: " : "إلى: "}{r.effectiveTo ? r.effectiveTo.slice(0, 10) : (isEn ? "Indefinite" : "مفتوح")}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono">
                        {(r.reminderOffsetsDays || []).join(", ")} {isEn ? "days" : "يوم"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black ${
                            r.status === "Active"
                              ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                              : r.status === "Disabled"
                              ? "bg-amber-100 text-amber-950 border border-amber-300"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-5 py-4 text-center">
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenEdit(r)}
                            className="h-8 px-2.5 text-xs gap-1"
                          >
                            <Pencil size={14} />
                            {isEn ? "Edit" : "تعديل"}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {requirements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-sm font-bold text-[var(--muted)]">
                      {isEn ? "No matching requirement rules found." : "لا توجد قواعد تكليف مطابقة."}
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
            className="w-full max-w-xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl space-y-5 border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black">
                  {editingReq
                    ? isEn ? "Edit Document Requirement" : "تعديل تكليف الوثيقة"
                    : isEn ? "Create Document Requirement" : "إضافة تكليف متطلب جديد"}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {isEn ? "Set scope and reminder parameters." : "تحديد الفئة والمواعيد الإلزامية."}
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
              {/* Document Type select */}
              <div>
                <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                  {isEn ? "Select Document Type *" : "اختر نوع الوثيقة *"}
                </label>
                <select
                  value={formData.documentTypeId}
                  onChange={(e) => setFormData({ ...formData, documentTypeId: e.target.value })}
                  required
                  disabled={!!editingReq}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none disabled:bg-slate-100"
                >
                  {docTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {isEn ? dt.nameEn : dt.nameAr} ({dt.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Relationship Type Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Relationship Type Scope" : "نطاق العلاقات الوظيفية"}
                  </label>
                  <select
                    value={formData.relationshipType === null ? "null" : formData.relationshipType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        relationshipType: e.target.value === "null" ? null : (e.target.value as any),
                      })
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
                  >
                    <option value="null">{isEn ? "All (No limit)" : "الكل (إداري ومندوب خارجي)"}</option>
                    <option value="SponsoredInternal">{isEn ? "Admin Staff" : "إداري"}</option>
                    <option value="OutsideRider">{isEn ? "Outside Rider" : "المناديب الخارجيين"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Rider Profile Requirement Switch" : "تقييد بملف المندوب"}
                  </label>
                  <select
                    value={formData.appliesToRiderProfile ? "true" : "false"}
                    onChange={(e) =>
                      setFormData({ ...formData, appliesToRiderProfile: e.target.value === "true" })
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
                  >
                    <option value="false">{isEn ? "False (All staff in scope)" : "لا (يشمل الإداريين والمناديب)"}</option>
                    <option value="true">{isEn ? "True (Only Riders in scope)" : "نعم (يشمل المناديب فقط)"}</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Scope Hint Box */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs flex items-center gap-2 text-blue-950 font-bold">
                <Info size={16} className="text-[#1167c9] shrink-0" />
                <span>
                  {isEn ? "Active Scope Preview: " : "معاينة النطاق المستهدف الفعلي: "}
                  {getScopeDescription(formData.relationshipType, formData.appliesToRiderProfile, locale)}
                </span>
              </div>

              {/* Mandatory & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Requirement Level *" : "درجة الإلزام *"}
                  </label>
                  <select
                    value={formData.isRequired ? "true" : "false"}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.value === "true" })}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
                  >
                    <option value="true">{isEn ? "Mandatory (Required for completeness)" : "إلزامي (مطلوب لاستيفاء الملف)"}</option>
                    <option value="false">{isEn ? "Optional (Voluntary file)" : "اختياري (مستند اختياري)"}</option>
                  </select>
                </div>

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
              </div>

              {/* Reminder Offsets */}
              <div>
                <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                  {isEn ? "Reminder Offsets Days (Comma-separated)" : "أيام التنبيه قبل الانتهاء (مفصولة بفاصلة)"}
                </label>
                <input
                  type="text"
                  value={formData.reminderOffsetsDaysInput}
                  onChange={(e) => setFormData({ ...formData, reminderOffsetsDaysInput: e.target.value })}
                  placeholder="90, 60, 30, 7, 0"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-mono font-bold focus:border-[#1167c9] outline-none"
                />
              </div>

              {/* Effective Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Effective From Date *" : "تاريخ بداية السريان *"}
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    required
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Effective To Date (Optional)" : "تاريخ نهاية السريان (اختياري)"}
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold focus:border-[#1167c9] outline-none"
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
                  {editingReq ? (isEn ? "Save Changes" : "تحديث التكليف") : (isEn ? "Create Requirement Rule" : "إضافة التكليف")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
