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
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <FilePlus size={20} />
              {locale === "en" ? "Documents" : "الوثائق"}
            </h2>
            {can("documents.upload") && (
              <button
                type="button"
                onClick={() => setShowUploadForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1167c9] hover:bg-blue-100 transition-colors"
              >
                {showUploadForm ? <ChevronUp size={16} /> : <Plus size={16} />}
                {locale === "en"
                  ? showUploadForm
                    ? "Hide Upload Form"
                    : "Upload New Document"
                  : showUploadForm
                    ? "إخفاء نموذج الرفع"
                    : "رفع وثيقة جديدة"}
              </button>
            )}
          </div>
          {can("documents.upload") && showUploadForm && (
            <form onSubmit={upload} className="mt-4 grid gap-3 sm:grid-cols-2">
              {riderProfileId ? (
                <label className="grid gap-2 text-sm font-bold">
                  {locale === "en" ? "Delegate Document Type" : "نوع وثيقة المندوب"}
                  <select
                    name="riderDocumentKind"
                    value={selectedRiderKind}
                    onChange={(e) => setSelectedRiderKind(e.target.value)}
                    required
                    className={cls}
                  >
                    <option value="">
                      {locale === "en" ? "Select Type" : "اختر النوع"}
                    </option>
                    {riderKinds.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {locale === "en" ? kind.labelEn : kind.labelAr}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="grid gap-2 text-sm font-bold">
                  {locale === "en" ? "Document Type" : "نوع الوثيقة"}
                  <select
                    name="documentTypeId"
                    value={selectedDocTypeId}
                    onChange={(e) => setSelectedDocTypeId(e.target.value)}
                    required
                    className={cls}
                  >
                    <option value="">
                      {locale === "en" ? "Select Type" : "اختر النوع"}
                    </option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {String(
                          (locale === "en" ? t.nameEn || t.nameAr : t.nameAr) ??
                          t.code,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="grid gap-2 text-sm font-bold">
                {locale === "en" ? "File" : "الملف"}
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  required
                  className={`${cls} py-2`}
                />
              </label>
              {[
                [
                  "documentNumber",
                  locale === "en" ? "Document Number" : "رقم الوثيقة",
                  "text",
                ],
                [
                  "issueDate",
                  locale === "en" ? "Issue Date" : "تاريخ الإصدار",
                  "date",
                ],
                [
                  "expiryDate",
                  locale === "en" ? "Expiry Date" : "تاريخ الانتهاء",
                  "date",
                ],
                ["notes", locale === "en" ? "Notes" : "ملاحظات", "text"],
              ].map(([n, l, t]) => {
                const isReq = ["documentNumber", "issueDate", "expiryDate"].includes(n);
                return (
                  <label key={n} className="grid gap-2 text-sm font-bold">
                    {l}
                    <input name={n} type={t} required={isReq} className={cls} />
                  </label>
                );
              })}
              <Button type="submit" loading={busy}>
                {locale === "en" ? "Upload Document" : "رفع الوثيقة"}
              </Button>
              <p className="self-center text-xs text-[var(--muted)]">
                {locale === "en"
                  ? "PDF, JPEG, or PNG, up to 11MB (specific document types may limit size further)."
                  : "PDF أو JPEG أو PNG، بحد أقصى 11MB وقد يفرض نوع الوثيقة حدًا أقل."}
              </p>
            </form>
          )}

          <div className="mt-5 space-y-4">
            {docs.map((doc) => {
              const docRec = doc as Record<string, unknown>;
              const docTypeName =
                locale === "en"
                  ? (docRec.documentTypeNameEn as string | undefined) || doc.documentTypeNameAr
                  : doc.documentTypeNameAr;
              const isEditing = editingDocId === doc.id;
              const isHistoryExpanded = expandedHistory === doc.id;
              const badge = getExpiryBadge(doc.expiryDate, locale);

              return (
                <article
                  key={doc.id}
                  className={`rounded-2xl border bg-[var(--surface)] p-5 shadow-sm space-y-4 transition-all ${
                    isEditing
                      ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10"
                      : "border-[var(--border)] hover:border-blue-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
                        <FilePlus size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-[var(--foreground)]">{docTypeName}</h3>
                        <p className="text-xs text-[var(--muted)] mt-0.5 font-mono">
                          {doc.currentFileName
                            ? `${doc.currentFileName} ${doc.currentFileSizeBytes ? `(${(doc.currentFileSizeBytes / 1024).toFixed(1)} KB)` : ""}`
                            : (locale === "en" ? "No file uploaded" : "لا يوجد ملف مرفوع")}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black shadow-sm ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Document Summary / Data Section */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs rounded-xl bg-[var(--subtle-bg)] p-3.5 border border-[var(--border)]">
                    <div>
                      <span className="font-bold text-[var(--muted)] block mb-0.5">{locale === "en" ? "Document No." : "رقم الوثيقة"}</span>
                      <span className="font-mono font-extrabold text-[var(--foreground)]">{doc.documentNumber || "—"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[var(--muted)] block mb-0.5">{locale === "en" ? "Issue Date" : "تاريخ الإصدار"}</span>
                      <span className="font-extrabold text-[var(--foreground)]">{formatDocDate(doc.issueDate, locale)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[var(--muted)] block mb-0.5">{locale === "en" ? "Expiry Date" : "تاريخ الانتهاء"}</span>
                      <span className="font-extrabold text-[var(--foreground)]">{formatDocDate(doc.expiryDate, locale)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[var(--muted)] block mb-0.5">{locale === "en" ? "Notes" : "ملاحظات"}</span>
                      <span className="font-extrabold text-[var(--foreground)]">{doc.notes || "—"}</span>
                    </div>
                  </div>

                  {/* Inline Embedded Document File Preview */}
                  <div className="relative rounded-xl border border-[var(--border)] bg-slate-950/5 dark:bg-slate-900/40 h-60 flex items-center justify-center overflow-hidden">
                    {previews[doc.id]?.loading ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-[#1167c9]" />
                        <span>{locale === "en" ? "Loading document preview..." : "جارٍ تحميل معاينة المستند..."}</span>
                      </div>
                    ) : previews[doc.id]?.url ? (
                      previews[doc.id].contentType?.startsWith("image/") ? (
                        <img
                          src={previews[doc.id].url}
                          alt={docTypeName}
                          className="max-h-full w-auto object-contain p-1 rounded-lg"
                        />
                      ) : previews[doc.id].contentType?.includes("pdf") ? (
                        <iframe
                          src={previews[doc.id].url}
                          title={docTypeName}
                          className="w-full h-full border-0 rounded-lg bg-white"
                        />
                      ) : (
                        <div className="text-center p-4 text-xs text-slate-500 font-bold">
                          <FilePlus className="h-8 w-8 mx-auto text-slate-400 mb-1" />
                          {locale === "en" ? "Preview not supported for this file type." : "المعاينة غير مدعومة لهذا النوع من الملفات."}
                        </div>
                      )
                    ) : (
                      <div className="text-center p-4 text-xs text-slate-400 font-semibold">
                        <FilePlus className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                        {locale === "en" ? "No file uploaded" : "لا يوجد ملف للمعاينة"}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void previewDoc(doc)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                        title={locale === "en" ? "Preview" : "معاينة"}
                      >
                        <Eye size={14} />
                        {locale === "en" ? "Preview" : "معاينة"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void download(doc)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                        title={locale === "en" ? "Download" : "تنزيل"}
                      >
                        <Download size={14} />
                        {locale === "en" ? "Download" : "تنزيل"}
                      </button>

                      {can("documents.upload") && (
                        <button
                          type="button"
                          onClick={() => version(doc)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                          title={locale === "en" ? "New Version" : "نسخة جديدة"}
                        >
                          <RefreshCw size={14} />
                          {locale === "en" ? "New Version" : "نسخة جديدة"}
                        </button>
                      )}

                      {can("documents.catalog.manage") && (
                        <button
                          type="button"
                          onClick={() => setEditingDocId(isEditing ? null : doc.id)}
                          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                            isEditing
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                          }`}
                        >
                          <Pencil size={14} />
                          {locale === "en" ? "Edit" : "تعديل"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void toggleHistory(doc)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <History size={14} />
                        {isHistoryExpanded
                          ? (locale === "en" ? "Hide History" : "إخفاء السجل")
                          : (locale === "en" ? "Version History" : "سجل الوثائق")}
                      </button>
                    </div>

                    {can("documents.catalog.manage") && (
                      <button
                        type="button"
                        onClick={async () => {
                          const reason = await systemPrompt(
                            locale === "en" ? "Reason for archiving" : "سبب الأرشفة",
                          );
                          if (reason)
                            void run(() =>
                              archiveEmployeeDocument(employeeId, doc.id, reason, doc.rowVersion),
                            );
                        }}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors cursor-pointer"
                        title={locale === "en" ? "Archive" : "أرشفة"}
                      >
                        <Archive size={14} />
                        {locale === "en" ? "Archive" : "أرشفة"}
                      </button>
                    )}
                  </div>

                  {/* Inline Edit Form for THIS document section only */}
                  {isEditing && (
                    <form
                      onSubmit={(e) => saveMetadata(e, doc)}
                      className="mt-3 grid gap-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4 sm:grid-cols-2 animate-in fade-in duration-200"
                    >
                      <div className="col-span-full flex items-center justify-between border-b border-amber-200 pb-2">
                        <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                          <Pencil size={15} />
                          {locale === "en" ? `Edit ${docTypeName} Details` : `تعديل بيانات ${docTypeName}`}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setEditingDocId(null)}
                          className="text-xs text-amber-800 hover:underline font-bold cursor-pointer"
                        >
                          {locale === "en" ? "Cancel" : "إلغاء"}
                        </button>
                      </div>

                      <label className="grid gap-1.5 text-xs font-bold text-slate-800">
                        {locale === "en" ? "Document Number" : "رقم الوثيقة"} <span className="text-rose-500">*</span>
                        <input
                          name="documentNumber"
                          required
                          defaultValue={doc.documentNumber ?? ""}
                          className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-medium focus:border-[#1167c9] outline-none"
                        />
                      </label>

                      <label className="grid gap-1.5 text-xs font-bold text-slate-800">
                        {locale === "en" ? "Issue Date" : "تاريخ الإصدار"} <span className="text-rose-500">*</span>
                        <input
                          name="issueDate"
                          type="date"
                          required
                          defaultValue={doc.issueDate ?? ""}
                          className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-medium focus:border-[#1167c9] outline-none"
                        />
                      </label>

                      <label className="grid gap-1.5 text-xs font-bold text-slate-800">
                        {locale === "en" ? "Expiry Date" : "تاريخ الانتهاء"} <span className="text-rose-500">*</span>
                        <input
                          name="expiryDate"
                          type="date"
                          required
                          defaultValue={doc.expiryDate ?? ""}
                          className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-medium focus:border-[#1167c9] outline-none"
                        />
                      </label>

                      <label className="grid gap-1.5 text-xs font-bold text-slate-800">
                        {locale === "en" ? "Notes" : "ملاحظات"}
                        <input
                          name="notes"
                          defaultValue={doc.notes ?? ""}
                          className="h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs font-medium focus:border-[#1167c9] outline-none"
                        />
                      </label>

                      <div className="col-span-full flex justify-end gap-2 pt-2 border-t border-amber-200">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 text-xs px-3"
                          onClick={() => setEditingDocId(null)}
                        >
                          {locale === "en" ? "Cancel" : "إلغاء"}
                        </Button>
                        <Button type="submit" loading={busy} className="h-8 text-xs px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold">
                          {locale === "en" ? "Save Changes" : "حفظ التعديلات"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Version History Panel for THIS document */}
                  {isHistoryExpanded && (
                    <div className="border-t border-[var(--border)] pt-3 mt-3">
                      <h4 className="mb-2 text-xs font-extrabold text-[var(--foreground)]">
                        {locale === "en" ? "Saved Versions" : "النسخ المحفوظة"}
                      </h4>
                      <div className="space-y-2">
                        {(versions[doc.id] ?? []).map((version) => (
                          <div
                            key={version.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-200"
                          >
                            <span className="font-mono text-slate-700">
                              {locale === "en" ? "Version" : "الإصدار"} {version.versionNumber} · {version.originalFileName} · {(version.fileSizeBytes / 1024).toFixed(1)} KB
                            </span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-7 text-[11px] px-2"
                                onClick={() => void previewDoc(doc, version.id)}
                              >
                                {locale === "en" ? "Preview" : "معاينة"}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-7 text-[11px] px-2"
                                onClick={() => void downloadVersion(doc, version)}
                              >
                                {locale === "en" ? "Download Version" : "تنزيل النسخة"}
                              </Button>
                            </div>
                          </div>
                        ))}
                        {versions[doc.id]?.length === 0 && (
                          <p className="text-xs text-[var(--muted)]">
                            {locale === "en" ? "No saved versions." : "لا توجد نسخ محفوظة."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            {docs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
                <p className="font-bold text-sm text-[var(--muted)]">
                  {locale === "en" ? "No documents uploaded yet." : "لا توجد وثائق مرفوعة حتى الآن."}
                </p>
              </div>
            )}
          </div>
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
