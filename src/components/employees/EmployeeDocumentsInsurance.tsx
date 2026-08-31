"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FilePlus,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { hrCatalogApi, type HrRow } from "../../lib/hr/api";
import { StaffDocumentChecklistPanel } from "../documents/StaffDocumentChecklistPanel";
import {
  archiveEmployeeDocument,
  archiveInsurancePolicy,
  createInsurancePolicy,
  downloadEmployeeDocument,
  getEmployeeDocuments,
  getEmployeeDocumentVersions,
  getInsuranceCompanies,
  getInsurancePlans,
  getInsurancePolicies,
  previewEmployeeDocument,
  updateEmployeeDocument,
  updateInsurancePolicy,
  uploadEmployeeDocument,
  uploadEmployeeDocumentVersion,
  uploadRiderDocument,
  type EmployeeDocument,
  type EmployeeDocumentVersion,
  type InsuranceCompany,
  type InsurancePlan,
  type InsurancePolicy,
  type RiderDocumentKind,
} from "../../lib/workforce/compliance-api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { systemPrompt } from "../ui/SystemDialog";
import { toast } from "../ui/Toast";
import { SearchableSelect } from "../ui/SearchableSelect";

function getExpiryBadge(expiryDate: string | null, locale: "ar" | "en" = "ar") {
  if (!expiryDate) {
    return {
      label: locale === "en" ? "No Expiry" : "بلا تاريخ انتهاء",
      classes: "bg-slate-100 text-slate-700 border border-slate-200 font-bold",
    };
  }
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0) {
    return {
      label: locale === "en" ? "Expired" : "منتهية",
      classes: "bg-rose-100 text-rose-950 border border-rose-300 font-black",
    };
  }
  if (days <= 30) {
    return {
      label: locale === "en" ? "Expiring Soon" : "قريبة الانتهاء",
      classes: "bg-amber-100 text-amber-950 border border-amber-300 font-black",
    };
  }
  return {
    label: locale === "en" ? "Valid" : "سارية",
    classes: "bg-emerald-100 text-emerald-950 border border-emerald-300 font-black",
  };
}

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

export function EmployeeDocumentsInsurance({
  employeeId,
  riderProfileId,
  activeTab = "all",
}: {
  employeeId: string;
  riderProfileId?: string | null;
  activeTab?: "docs" | "insurance" | "all";
}) {
  const { can, locale } = useAuth();
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [types, setTypes] = useState<HrRow[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [planId, setPlanId] = useState("");
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [versionTarget, setVersionTarget] = useState<EmployeeDocument | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, EmployeeDocumentVersion[]>>({});
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState("");
  const [selectedRiderKind, setSelectedRiderKind] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [openPolicyId, setOpenPolicyId] = useState<string | null>(null);
  const versionInput = useRef<HTMLInputElement>(null);

  const [previews, setPreviews] = useState<
    Record<string, { url: string; contentType: string; loading: boolean; error?: string }>
  >({});

  const [previewModalData, setPreviewModalData] = useState<{
    title: string;
    url: string;
    contentType: string;
  } | null>(null);

  async function previewDoc(doc: EmployeeDocument, versionId?: string) {
    try {
      setBusy(true);
      setError("");
      const res = await previewEmployeeDocument(employeeId, doc.id, versionId);
      const docRec = doc as Record<string, unknown>;
      const name =
        locale === "en"
          ? (docRec.documentTypeNameEn as string | undefined) || doc.documentTypeNameAr
          : doc.documentTypeNameAr;
      setPreviewModalData({
        title: `${name}${versionId ? ` (v${versionId})` : ""}`,
        url: res.url,
        contentType: res.contentType,
      });
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : locale === "en"
            ? "Unable to preview document"
            : "تعذر عرض الوثيقة";
      setError(msg);
      toast.error(locale === "en" ? "Preview Error" : "خطأ في المعاينة", msg);
    } finally {
      setBusy(false);
    }
  }

  async function load() {
    try {
      const [d, t, c, p] = await Promise.all([
        getEmployeeDocuments(employeeId),
        hrCatalogApi.list("document-types"),
        getInsuranceCompanies(),
        getInsurancePolicies(employeeId),
      ]);
      setDocs(d);
      setTypes(t);
      setCompanies(c);
      setPolicies(p);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : locale === "en"
            ? "Unable to load documents and insurance"
            : "تعذر تحميل الوثائق والتأمين",
      );
    }
  }

  useEffect(() => {
    void load();
  }, [employeeId]);

  useEffect(() => {
    if (!docs.length) return;
    docs.forEach((doc) => {
      if (doc.currentFileName && !previews[doc.id]) {
        setPreviews((prev) => ({
          ...prev,
          [doc.id]: { url: "", contentType: "", loading: true },
        }));
        previewEmployeeDocument(employeeId, doc.id)
          .then((res) => {
            setPreviews((prev) => ({
              ...prev,
              [doc.id]: { url: res.url, contentType: res.contentType, loading: false },
            }));
          })
          .catch((e) => {
            setPreviews((prev) => ({
              ...prev,
              [doc.id]: {
                url: "",
                contentType: "",
                loading: false,
                error: e instanceof Error ? e.message : "Error",
              },
            }));
          });
      }
    });
  }, [docs, employeeId]);

  useEffect(() => {
    if (companyId) void getInsurancePlans(companyId).then(setPlans);
    else setPlans([]);
  }, [companyId]);

  async function run(task: () => Promise<unknown>, successMsg?: string) {
    setBusy(true);
    setError("");
    try {
      await task();
      await load();
      toast.success(
        locale === "en" ? "Action Successful" : "تمت العملية بنجاح",
        successMsg || (locale === "en" ? "Updated successfully." : "تم تحديث البيانات بنجاح")
      );
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : locale === "en"
            ? "Action failed"
            : "تعذر تنفيذ العملية";
      setError(msg);
      toast.error(locale === "en" ? "Action Failed" : "فشل الإجراء", msg);
    } finally {
      setBusy(false);
    }
  }

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get("file") as File;
    if (!validateFile(file, f)) return;
    const kind = String(f.get("riderDocumentKind") || "") as RiderDocumentKind;

    const docNumber = String(f.get("documentNumber") || "").trim();
    const issueDate = String(f.get("issueDate") || "").trim();
    const expiryDate = String(f.get("expiryDate") || "").trim();

    if (!docNumber || !issueDate || !expiryDate) {
      setError(
        locale === "en"
          ? "Document Number, Issue Date, and Expiry Date are required."
          : "رقم الوثيقة وتاريخ الإصدار وتاريخ الانتهاء حقول مطلوبة.",
      );
      return;
    }

    await run(() =>
      riderProfileId
        ? uploadRiderDocument(riderProfileId, kind, f)
        : uploadEmployeeDocument(employeeId, f),
    );
    form.reset();
    setSelectedDocTypeId("");
    setSelectedRiderKind("");
  }

  function validateFile(file: File, form?: FormData) {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setError(
        locale === "en"
          ? "File type not allowed. Please use PDF, JPEG, or PNG."
          : "نوع الملف غير مسموح. استخدم PDF أو JPEG أو PNG.",
      );
      return false;
    }
    const hardLimit = 11 * 1024 * 1024;
    const selectedCode = riderProfileId
      ? kindCode[String(form?.get("riderDocumentKind") || "")]
      : String(
        types.find((t) => t.id === form?.get("documentTypeId"))?.code ?? "",
      );
    const configured = Number(
      types.find((t) => String(t.code) === selectedCode)?.maxFileSizeBytes ||
      hardLimit,
    );
    if (file.size > Math.min(hardLimit, configured)) {
      setError(
        locale === "en"
          ? "File size exceeds the allowed limit for this type (max 11MB)."
          : "حجم الملف أكبر من الحد المسموح لهذا النوع (بحد أقصى 11MB).",
      );
      return false;
    }
    return true;
  }

  async function saveMetadata(e: FormEvent<HTMLFormElement>, targetDoc: EmployeeDocument) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const docNumber = String(f.get("documentNumber") || "").trim();
    const issueDate = String(f.get("issueDate") || "").trim();
    const expiryDate = String(f.get("expiryDate") || "").trim();

    if (!docNumber || !issueDate || !expiryDate) {
      setError(
        locale === "en"
          ? "Document Number, Issue Date, and Expiry Date are required."
          : "رقم الوثيقة وتاريخ الإصدار وتاريخ الانتهاء حقول مطلوبة.",
      );
      return;
    }

    await run(() =>
      updateEmployeeDocument(
        employeeId,
        targetDoc.id,
        {
          documentNumber: docNumber || null,
          issueDate: issueDate || null,
          expiryDate: expiryDate || null,
          notes: String(f.get("notes") || "") || null,
        },
        targetDoc.rowVersion,
      ),
    );
    setEditingDocId(null);
  }

  async function toggleHistory(doc: EmployeeDocument) {
    if (expandedHistory === doc.id) {
      setExpandedHistory(null);
      return;
    }
    setExpandedHistory(doc.id);
    if (!versions[doc.id]) {
      try {
        const rows = await getEmployeeDocumentVersions(employeeId, doc.id);
        setVersions((current) => ({ ...current, [doc.id]: rows }));
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : locale === "en"
              ? "Unable to load version history"
              : "تعذر تحميل سجل النسخ",
        );
      }
    }
  }

  async function savePolicy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const f = new FormData(formElement);
    const v = (k: string) => String(f.get(k) || "");
    const compId = v("insuranceCompanyId") || companyId;
    const plnId = v("insurancePlanLevelId") || planId;

    if (!compId || !plnId) {
      setError(
        locale === "en"
          ? "Insurance Company and Plan are required."
          : "شركة التأمين والخطة حقول مطلوبة.",
      );
      return;
    }

    const payload = {
      insuranceCompanyId: compId,
      insurancePlanLevelId: plnId,
      policyNumber: v("policyNumber") || null,
      memberNumber: v("memberNumber") || null,
      startDate: v("startDate"),
      endDate: v("endDate"),
      status: v("status") || "Active",
      isCurrent: true,
      previousPolicyId: null,
      employeeDocumentId: null,
      notes: v("notes") || null,
      rowVersion: editingPolicy?.rowVersion || null,
    };
    await run(() =>
      editingPolicy
        ? updateInsurancePolicy(employeeId, editingPolicy.id, payload)
        : createInsurancePolicy(employeeId, payload),
    );
    setEditingPolicy(null);
    setCompanyId("");
    setPlanId("");
    formElement?.reset();
  }

  function version(doc: EmployeeDocument) {
    setVersionTarget(doc);
    versionInput.current?.click();
  }

  const kindCode: Record<string, string> = {
    "residency-permit": "RESIDENCY_PERMIT",
    "driver-license": "DRIVER_LICENSE",
    "rider-card": "RIDER_CARD",
    "health-card": "HEALTH_CARD",
    "promissory-note": "PROMISSORY_NOTE",
    "medical-insurance": "MEDICAL_INSURANCE",
    "ajeer-contract": "AJEER_CONTRACT",
  };

  const riderKinds: { value: RiderDocumentKind; labelAr: string; labelEn: string }[] = [
    { value: "residency-permit", labelAr: "الإقامة", labelEn: "Residency Permit" },
    { value: "driver-license", labelAr: "رخصة القيادة", labelEn: "Driver License" },
    { value: "rider-card", labelAr: "بطاقة السائق", labelEn: "Rider Card" },
    { value: "health-card", labelAr: "البطاقة الصحية", labelEn: "Health Card" },
    { value: "promissory-note", labelAr: "سند الأمر", labelEn: "Promissory Note" },
    { value: "medical-insurance", labelAr: "التأمين الطبي", labelEn: "Medical Insurance" },
    { value: "ajeer-contract", labelAr: "عقود اجير", labelEn: "Ajeer Contract" },
  ];

  async function download(doc: EmployeeDocument) {
    try {
      const { blob, fileName } = await downloadEmployeeDocument(
        employeeId,
        doc.id,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(fileName);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : locale === "en"
            ? "Download failed"
            : "تعذر التنزيل",
      );
    }
  }

  async function downloadVersion(
    doc: EmployeeDocument,
    version: EmployeeDocumentVersion,
  ) {
    try {
      const { blob, fileName } = await downloadEmployeeDocument(
        employeeId,
        doc.id,
        version.id,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(fileName || version.originalFileName);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : locale === "en"
            ? "Version download failed"
            : "تعذر تنزيل النسخة",
      );
    }
  }

  const cls =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <input
        ref={versionInput}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        aria-label={
          locale === "en"
            ? "Choose new document version"
            : "اختيار نسخة وثيقة جديدة"
        }
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && versionTarget && validateFile(file))
            void run(() =>
              uploadEmployeeDocumentVersion(employeeId, versionTarget.id, file),
            );
          e.target.value = "";
        }}
      />
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 xl:col-span-2">
          {error}
        </p>
      )}
      {(activeTab === "all" || activeTab === "docs") && (
        <Card className={`p-5 ${activeTab === "docs" ? "xl:col-span-2" : ""}`}>
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black">
                <FilePlus size={20} className="text-[#1167c9]" />
                {locale === "en" ? "Employee Documents" : "وثائق ومستندات الموظف"}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {locale === "en"
                  ? "Manage uploaded employee documents, file versions, and validity dates."
                  : "إدارة واستعراض المستندات والملفات المرفوعة للموظف وتواريخ الصلاحية."}
              </p>
            </div>
            {can("documents.manage") && (
              <Button
                variant="secondary"
                onClick={() => setShowUploadForm((prev) => !prev)}
                className="gap-1.5 text-xs font-bold"
              >
                {showUploadForm ? <ChevronUp size={16} /> : <Plus size={16} />}
                {locale === "en"
                  ? showUploadForm
                    ? "Hide Upload Form"
                    : "Upload File"
                  : showUploadForm
                    ? "إخفاء نموذج الرفع"
                    : "رفع وثيقة جديدة"}
              </Button>
            )}
          </div>

            {/* Upload Form */}
            {can("documents.manage") && showUploadForm && (
              <form onSubmit={upload} className="mb-6 rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
                <h4 className="text-xs font-black text-[#1167c9]">
                  {locale === "en" ? "Upload New Document" : "رفع وثيقة جديدة للموظف"}
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {riderProfileId ? (
                    <label className="grid gap-1 text-xs font-bold">
                      {locale === "en" ? "Document Kind *" : "نوع الوثيقة *"}
                      <select
                        name="riderDocumentKind"
                        required
                        value={selectedRiderKind}
                        onChange={(e) => setSelectedRiderKind(e.target.value)}
                        className={cls}
                      >
                        <option value="">{locale === "en" ? "Select Document Kind" : "اختر نوع الوثيقة"}</option>
                        {riderKinds.map((k) => (
                          <option key={k.value} value={k.value}>
                            {locale === "en" ? k.labelEn : k.labelAr}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="grid gap-1 text-xs font-bold">
                      {locale === "en" ? "Document Type *" : "نوع الوثيقة *"}
                      <SearchableSelect
                        name="documentTypeId"
                        required
                        value={selectedDocTypeId}
                        onChange={(val) => setSelectedDocTypeId(val)}
                        options={types.map((t) => ({
                          value: String(t.id),
                          label: locale === "en" ? String(t.nameEn || t.nameAr) : String(t.nameAr),
                          sublabel: String(t.code || ""),
                        }))}
                        placeholder={locale === "en" ? "Select Document Type" : "اختر نوع الوثيقة"}
                        searchPlaceholder={locale === "en" ? "Search document type..." : "ابحث عن نوع الوثيقة..."}
                      />
                    </label>
                  )}

                  <label className="grid gap-1 text-xs font-bold">
                    {locale === "en" ? "Document Number *" : "رقم الوثيقة *"}
                    <input name="documentNumber" type="text" required placeholder="1234567890" className={cls} />
                  </label>

                  <label className="grid gap-1 text-xs font-bold">
                    {locale === "en" ? "Issue Date *" : "تاريخ الإصدار *"}
                    <input name="issueDate" type="date" required className={cls} />
                  </label>

                  <label className="grid gap-1 text-xs font-bold">
                    {locale === "en" ? "Expiry Date *" : "تاريخ الانتهاء *"}
                    <input name="expiryDate" type="date" required className={cls} />
                  </label>

                  <label className="grid gap-1 text-xs font-bold sm:col-span-2">
                    {locale === "en" ? "File (PDF, JPG, PNG - max 11MB) *" : "الملف (PDF, JPG, PNG - أقصى 11 ميجابايت) *"}
                    <input name="file" type="file" required accept="application/pdf,image/jpeg,image/png" className={cls} />
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowUploadForm(false)}>
                    {locale === "en" ? "Cancel" : "إلغاء"}
                  </Button>
                  <Button type="submit" loading={busy}>
                    {locale === "en" ? "Upload Document" : "رفع الوثيقة"}
                  </Button>
                </div>
              </form>
            )}

            {/* List of Uploaded Documents */}
            {docs.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-[var(--muted)] border border-dashed rounded-xl">
                {locale === "en" ? "No uploaded documents found." : "لا توجد وثائق مرفوعة سابقة لهذا الموظف."}
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map((doc) => {
                  const badge = getExpiryBadge(doc.expiryDate, locale);
                  const isEditing = editingDocId === doc.id;
                  const prevInfo = previews[doc.id];
                  const docRec = doc as Record<string, unknown>;
                  const name =
                    locale === "en"
                      ? (docRec.documentTypeNameEn as string | undefined) || doc.documentTypeNameAr
                      : doc.documentTypeNameAr;

                  return (
                    <article
                      key={doc.id}
                      className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)] hover:border-blue-300 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* File Preview Thumbnail */}
                          {prevInfo?.url && prevInfo.contentType.startsWith("image/") ? (
                            <img
                              src={prevInfo.url}
                              alt={name}
                              className="h-12 w-12 rounded-lg object-cover border cursor-pointer"
                              onClick={() => previewDoc(doc)}
                            />
                          ) : (
                            <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-50 text-[#1167c9] border border-blue-200">
                              <FilePlus size={22} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-slate-900">{name}</h4>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${badge.classes}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-xs font-mono font-bold text-[#1167c9] mt-0.5">
                              {doc.documentNumber || "—"}
                            </p>
                            <p className="text-[11px] text-[var(--muted)] mt-0.5">
                              {locale === "en" ? "Issue: " : "الإصدار: "}
                              {formatDocDate(doc.issueDate, locale)} | {locale === "en" ? "Expiry: " : "الانتهاء: "}
                              {formatDocDate(doc.expiryDate, locale)}
                            </p>
                          </div>
                        </div>

                        {/* Document Actions */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {doc.currentFileName && (
                            <>
                              <button
                                type="button"
                                onClick={() => previewDoc(doc)}
                                className="grid h-8 w-8 place-items-center rounded-lg border bg-slate-50 text-slate-700 hover:bg-slate-100"
                                title={locale === "en" ? "Preview" : "معاينة"}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => download(doc)}
                                className="grid h-8 w-8 place-items-center rounded-lg border bg-slate-50 text-slate-700 hover:bg-slate-100"
                                title={locale === "en" ? "Download" : "تنزيل"}
                              >
                                <Download size={15} />
                              </button>
                            </>
                          )}
                          {can("documents.manage") && (
                            <>
                              <button
                                type="button"
                                onClick={() => version(doc)}
                                className="grid h-8 w-8 place-items-center rounded-lg border bg-blue-50 text-[#1167c9] hover:bg-blue-100"
                                title={locale === "en" ? "Upload new version" : "رفع نسخة جديدة"}
                              >
                                <Plus size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDocId(isEditing ? null : doc.id)}
                                className="grid h-8 w-8 place-items-center rounded-lg border bg-slate-50 text-slate-700 hover:bg-slate-100"
                                title={locale === "en" ? "Edit metadata" : "تعديل البيانات"}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const reason = await systemPrompt(
                                    locale === "en" ? "Reason for archiving" : "سبب الأرشفة"
                                  );
                                  if (reason)
                                    void run(() =>
                                      archiveEmployeeDocument(employeeId, doc.id, reason, doc.rowVersion)
                                    );
                                }}
                                className="grid h-8 w-8 place-items-center rounded-lg border bg-rose-50 text-rose-600 hover:bg-rose-100"
                                title={locale === "en" ? "Archive document" : "أرشفة الوثيقة"}
                              >
                                <Archive size={15} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleHistory(doc)}
                            className="grid h-8 w-8 place-items-center rounded-lg border bg-slate-50 text-slate-700 hover:bg-slate-100"
                            title={locale === "en" ? "Version history" : "سجل النسخ"}
                          >
                            <History size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Edit Metadata Form */}
                      {isEditing && (
                        <form onSubmit={(e) => saveMetadata(e, doc)} className="mt-3 rounded-lg border bg-slate-50 p-3 space-y-3 text-xs">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label className="font-bold">
                              {locale === "en" ? "Document Number" : "رقم الوثيقة"}
                              <input
                                name="documentNumber"
                                defaultValue={doc.documentNumber || ""}
                                required
                                className="mt-1 h-9 w-full rounded-lg border bg-white px-2 font-mono"
                              />
                            </label>
                            <label className="font-bold">
                              {locale === "en" ? "Issue Date" : "تاريخ الإصدار"}
                              <input
                                name="issueDate"
                                type="date"
                                defaultValue={doc.issueDate ? doc.issueDate.slice(0, 10) : ""}
                                required
                                className="mt-1 h-9 w-full rounded-lg border bg-white px-2"
                              />
                            </label>
                            <label className="font-bold">
                              {locale === "en" ? "Expiry Date" : "تاريخ الانتهاء"}
                              <input
                                name="expiryDate"
                                type="date"
                                defaultValue={doc.expiryDate ? doc.expiryDate.slice(0, 10) : ""}
                                required
                                className="mt-1 h-9 w-full rounded-lg border bg-white px-2"
                              />
                            </label>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => setEditingDocId(null)}>
                              {locale === "en" ? "Cancel" : "إلغاء"}
                            </Button>
                            <Button type="submit" loading={busy}>
                              {locale === "en" ? "Save Changes" : "حفظ التعديلات"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Version History */}
                      {expandedHistory === doc.id && (
                        <div className="mt-3 rounded-lg border bg-slate-50 p-3 space-y-2 text-xs">
                          <h5 className="font-black text-[#1167c9]">
                            {locale === "en" ? "Version History" : "سجل النسخ المرفوعة"}
                          </h5>
                          {versions[doc.id] ? (
                            versions[doc.id].length === 0 ? (
                              <p className="text-[var(--muted)]">{locale === "en" ? "No previous versions found." : "لا توجد نسخ سابقة."}</p>
                            ) : (
                              <div className="space-y-1.5">
                                {versions[doc.id].map((ver) => (
                                  <div key={ver.id} className="flex items-center justify-between rounded bg-white p-2 border text-[11px]">
                                    <div>
                                      <span className="font-bold text-slate-800">
                                        v{ver.versionNumber}: {ver.originalFileName}
                                      </span>
                                      <span className="text-[var(--muted)] ms-2">
                                        ({(ver.fileSizeBytes / 1024).toFixed(1)} KB)
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => downloadVersion(doc, ver)}
                                      className="flex items-center gap-1 font-bold text-[#1167c9] hover:underline"
                                    >
                                      <Download size={13} />
                                      {locale === "en" ? "Download" : "تحميل"}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : (
                            <p className="text-[var(--muted)]">{locale === "en" ? "Loading versions..." : "جاري التحميل..."}</p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </Card>
      )}
      {(activeTab === "all" || activeTab === "insurance") && (
        <Card className={`p-5 ${activeTab === "insurance" ? "xl:col-span-2" : ""}`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <ShieldCheck size={20} />
              {locale === "en" ? "Medical Insurance" : "التأمين الطبي"}
            </h2>
            {can("insurance.manage") && (
              <button
                type="button"
                onClick={() => {
                  if (showPolicyForm && editingPolicy) {
                    setEditingPolicy(null);
                  }
                  setShowPolicyForm((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1167c9] hover:bg-blue-100 transition-colors"
              >
                {showPolicyForm ? <ChevronUp size={16} /> : <Plus size={16} />}
                {locale === "en"
                  ? showPolicyForm
                    ? "Hide Form"
                    : "Add Policy"
                  : showPolicyForm
                    ? "إخفاء النموذج"
                    : "إضافة وثيقة تأمين"}
              </button>
            )}
          </div>
          {can("insurance.manage") && showPolicyForm && (
            <form
              key={editingPolicy?.id ?? "new"}
              onSubmit={savePolicy}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <label className="grid gap-2 text-sm font-bold">
                {locale === "en" ? "Insurance Company" : "شركة التأمين"}
                <SearchableSelect
                  name="insuranceCompanyId"
                  required
                  value={companyId || editingPolicy?.insuranceCompanyId || ""}
                  onChange={(val) => setCompanyId(val)}
                  options={companies.map((c) => ({
                    value: c.id,
                    label: locale === "en" ? c.nameEn || c.nameAr : c.nameAr,
                    sublabel: c.code,
                  }))}
                  placeholder={locale === "en" ? "Select Company" : "اختر الشركة"}
                  searchPlaceholder={locale === "en" ? "Search company..." : "ابحث عن شركة..."}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                {locale === "en" ? "Plan" : "الخطة"}
                <SearchableSelect
                  name="insurancePlanLevelId"
                  required
                  value={planId || editingPolicy?.insurancePlanLevelId || ""}
                  onChange={(val) => setPlanId(val)}
                  options={plans.map((p) => ({
                    value: p.id,
                    label: locale === "en" ? p.nameEn || p.nameAr : p.nameAr,
                    sublabel: p.code,
                  }))}
                  placeholder={locale === "en" ? "Select Plan" : "اختر الخطة"}
                  searchPlaceholder={locale === "en" ? "Search plan..." : "ابحث عن خطة..."}
                />
              </label>
              {[
                [
                  "policyNumber",
                  locale === "en" ? "Policy Number" : "رقم الوثيقة",
                  "text",
                ],
                [
                  "memberNumber",
                  locale === "en" ? "Member Number" : "رقم العضوية",
                  "text",
                ],
                [
                  "startDate",
                  locale === "en" ? "Start Date" : "تاريخ البداية",
                  "date",
                ],
                [
                  "endDate",
                  locale === "en" ? "End Date" : "تاريخ النهاية",
                  "date",
                ],
                ["notes", locale === "en" ? "Notes" : "ملاحظات", "text"],
              ].map(([n, l, t]) => (
                <label key={n} className="grid gap-2 text-sm font-bold">
                  {l}
                  <input
                    name={n}
                    type={t}
                    required={["startDate", "endDate"].includes(n)}
                    defaultValue={String(
                      (editingPolicy as unknown as Record<string, unknown>)?.[
                      n
                      ] ?? "",
                    )}
                    className={cls}
                  />
                </label>
              ))}
              <input type="hidden" name="status" value="Active" />
              <Button type="submit" loading={busy}>
                {editingPolicy
                  ? locale === "en"
                    ? "Save Edits"
                    : "حفظ التعديل"
                  : locale === "en"
                    ? "Add Policy"
                    : "إضافة وثيقة تأمين"}
              </Button>
            </form>
          )}
          <div className="mt-5 space-y-2">
            {policies.map((p) => {
              const pRec = p as Record<string, unknown>;
              const companyName =
                locale === "en"
                  ? (pRec.insuranceCompanyEn as string | undefined) || p.insuranceCompanyAr
                  : p.insuranceCompanyAr;
              const planName =
                locale === "en"
                  ? (pRec.insurancePlanEn as string | undefined) || p.insurancePlanAr
                  : p.insurancePlanAr;
              const isOpen = openPolicyId === p.id;
              return (
                <article
                  key={p.id}
                  className={`rounded-xl border transition-all ${isOpen ? "border-[#1167c9] bg-blue-50/20 ring-1 ring-[#1167c9]/30" : "border-[var(--border)] hover:border-blue-300"
                    }`}
                >
                  <div
                    onClick={() => setOpenPolicyId(isOpen ? null : p.id)}
                    className="flex cursor-pointer items-center justify-between gap-3 p-3.5"
                  >
                    <div className="flex-1">
                      <p className="font-black text-sm text-[var(--foreground)]">
                        {companyName} — {planName}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {p.startDate} {locale === "en" ? "to" : "إلى"} {p.endDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-[var(--border)] p-3.5 bg-[var(--surface)] rounded-b-xl space-y-3">
                      <div className="grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
                        <div>
                          <span className="font-bold text-[var(--foreground)]">
                            {locale === "en" ? "Policy Number: " : "رقم الوثيقة: "}
                          </span>
                          {p.policyNumberMasked ?? (pRec.policyNumber as string | undefined) ?? "—"}
                        </div>
                        <div>
                          <span className="font-bold text-[var(--foreground)]">
                            {locale === "en" ? "Member Number: " : "رقم العضوية: "}
                          </span>
                          {p.memberNumberMasked ?? (pRec.memberNumber as string | undefined) ?? "—"}
                        </div>
                      </div>
                      {can("insurance.manage") && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPolicy(p);
                              setCompanyId(p.insuranceCompanyId);
                              setPlanId(p.insurancePlanLevelId);
                              setShowPolicyForm(true);
                            }}
                          >
                            {locale === "en" ? "Edit" : "تعديل"}
                          </Button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const reason = await systemPrompt(
                                locale === "en"
                                  ? "Reason for archiving"
                                  : "سبب الأرشفة",
                              );
                              if (reason)
                                void run(() =>
                                  archiveInsurancePolicy(p.id, reason, p.rowVersion),
                                );
                            }}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            aria-label={locale === "en" ? "Archive" : "أرشفة"}
                            title={locale === "en" ? "Archive" : "أرشفة"}
                          >
                            <Archive size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </Card>
      )}
      {previewModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPreviewModalData(null)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] w-full max-w-4xl rounded-2xl bg-[var(--surface)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black">{previewModalData.title}</h3>
              <button
                onClick={() => setPreviewModalData(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border hover:bg-slate-100"
                aria-label={locale === "en" ? "Close" : "إغلاق"}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-xl bg-slate-50 p-2">
              {previewModalData.contentType.startsWith("image/") ? (
                <img
                  src={previewModalData.url}
                  alt={previewModalData.title}
                  className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
                />
              ) : (
                <iframe
                  src={previewModalData.url}
                  title={previewModalData.title}
                  className="h-[70vh] w-full rounded-lg border bg-white"
                />
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setPreviewModalData(null)}>
                {locale === "en" ? "Close" : "إغلاق"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
