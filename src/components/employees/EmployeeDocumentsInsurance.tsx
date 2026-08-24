"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  Download,
  Eye,
  FilePlus,
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

export function EmployeeDocumentsInsurance({
  employeeId,
  riderProfileId,
}: {
  employeeId: string;
  riderProfileId?: string | null;
}) {
  const { can, locale } = useAuth();
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [types, setTypes] = useState<HrRow[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [versionTarget, setVersionTarget] = useState<EmployeeDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<EmployeeDocument | null>(null);
  const [versions, setVersions] = useState<Record<string, EmployeeDocumentVersion[]>>({});
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState("");
  const [selectedRiderKind, setSelectedRiderKind] = useState("");
  const versionInput = useRef<HTMLInputElement>(null);

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
      setError(
        e instanceof Error
          ? e.message
          : locale === "en"
            ? "Unable to preview document"
            : "تعذر عرض الوثيقة",
      );
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
    if (companyId) void getInsurancePlans(companyId).then(setPlans);
    else setPlans([]);
  }, [companyId]);

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await task();
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : locale === "en"
            ? "Action failed"
            : "تعذر تنفيذ العملية",
      );
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

  async function saveMetadata(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingDocument) return;
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
        editingDocument.id,
        {
          documentNumber: docNumber || null,
          issueDate: issueDate || null,
          expiryDate: expiryDate || null,
          notes: String(f.get("notes") || "") || null,
        },
        editingDocument.rowVersion,
      ),
    );
    setEditingDocument(null);
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
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "");
    const payload = {
      insuranceCompanyId: v("insuranceCompanyId"),
      insurancePlanLevelId: v("insurancePlanLevelId"),
      policyNumber: v("policyNumber") || null,
      memberNumber: v("memberNumber") || null,
      startDate: v("startDate"),
      endDate: v("endDate"),
      status: v("status"),
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
    e.currentTarget.reset();
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
  };

  const riderKinds: { value: RiderDocumentKind; labelAr: string; labelEn: string }[] = [
    { value: "residency-permit", labelAr: "الإقامة", labelEn: "Residency Permit" },
    { value: "driver-license", labelAr: "رخصة القيادة", labelEn: "Driver License" },
    { value: "rider-card", labelAr: "بطاقة المندوب", labelEn: "Rider Card" },
    { value: "health-card", labelAr: "البطاقة الصحية", labelEn: "Health Card" },
    { value: "promissory-note", labelAr: "سند الأمر", labelEn: "Promissory Note" },
    { value: "medical-insurance", labelAr: "التأمين الطبي", labelEn: "Medical Insurance" },
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
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <FilePlus size={20} />
          {locale === "en" ? "Documents" : "الوثائق"}
        </h2>
        {can("documents.upload") && (
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
        {editingDocument && (
          <form
            onSubmit={saveMetadata}
            className="mt-5 grid gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-2"
          >
            <h3 className="col-span-full font-black">
              {locale === "en"
                ? `Edit Metadata: ${((editingDocument as Record<string, unknown>).documentTypeNameEn as string | undefined) || editingDocument.documentTypeNameAr}`
                : `تعديل بيانات ${editingDocument.documentTypeNameAr}`}
            </h3>
            <label className="grid gap-2 text-sm font-bold">
              {locale === "en" ? "Document Number" : "رقم الوثيقة"}
              <input
                name="documentNumber"
                required
                defaultValue={editingDocument.documentNumber ?? ""}
                className={cls}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              {locale === "en" ? "Issue Date" : "تاريخ الإصدار"}
              <input
                name="issueDate"
                type="date"
                required
                defaultValue={editingDocument.issueDate ?? ""}
                className={cls}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              {locale === "en" ? "Expiry Date" : "تاريخ الانتهاء"}
              <input
                name="expiryDate"
                type="date"
                required
                defaultValue={editingDocument.expiryDate ?? ""}
                className={cls}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              {locale === "en" ? "Notes" : "ملاحظات"}
              <input
                name="notes"
                defaultValue={editingDocument.notes ?? ""}
                className={cls}
              />
            </label>
            <div className="col-span-full flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingDocument(null)}
              >
                {locale === "en" ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" loading={busy}>
                {locale === "en" ? "Save Changes" : "حفظ البيانات"}
              </Button>
            </div>
          </form>
        )}
        <div className="mt-5 space-y-2">
          {docs.map((doc) => {
            const docRec = doc as Record<string, unknown>;
            const docTypeName =
              locale === "en"
                ? (docRec.documentTypeNameEn as string | undefined) || doc.documentTypeNameAr
                : doc.documentTypeNameAr;
            return (
              <article key={doc.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-black">{docTypeName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {doc.currentFileName ??
                        (locale === "en" ? "No file" : "بدون ملف")}{" "}
                      ·{" "}
                      {doc.expiryDate ??
                        (locale === "en" ? "No expiry" : "بلا انتهاء")}
                    </p>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <button
                      onClick={() => void previewDoc(doc)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      aria-label={locale === "en" ? "Preview" : "معاينة"}
                      title={locale === "en" ? "Preview" : "معاينة"}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => void download(doc)}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      aria-label={locale === "en" ? "Download" : "تنزيل"}
                      title={locale === "en" ? "Download" : "تنزيل"}
                    >
                      <Download size={16} />
                    </button>
                    {can("documents.upload") && (
                      <button
                        onClick={() => version(doc)}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        aria-label={
                          locale === "en" ? "New Version" : "نسخة جديدة"
                        }
                        title={locale === "en" ? "New Version" : "نسخة جديدة"}
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                    {can("documents.catalog.manage") && (
                      <button
                        onClick={() => setEditingDocument(doc)}
                        className="h-9 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        {locale === "en" ? "Edit" : "تعديل"}
                      </button>
                    )}
                    <button
                      onClick={() => void toggleHistory(doc)}
                      className="h-9 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      {expandedHistory === doc.id
                        ? locale === "en"
                          ? "Hide Versions"
                          : "إخفاء النسخ"
                        : locale === "en"
                          ? "Version History"
                          : "سجل الوثائق"}
                    </button>
                    {can("documents.catalog.manage") && (
                      <button
                        onClick={async () => {
                          const reason = await systemPrompt(
                            locale === "en"
                              ? "Reason for archiving"
                              : "سبب الأرشفة",
                          );
                          if (reason)
                            void run(() =>
                              archiveEmployeeDocument(
                                employeeId,
                                doc.id,
                                reason,
                                doc.rowVersion,
                              ),
                            );
                        }}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        aria-label={locale === "en" ? "Archive" : "أرشفة"}
                        title={locale === "en" ? "Archive" : "أرشفة"}
                      >
                        <Archive size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {expandedHistory === doc.id && (
                  <div className="mt-3 border-t pt-3">
                    <h4 className="mb-2 text-sm font-black">
                      {locale === "en" ? "Saved Versions" : "النسخ المحفوظة"}
                    </h4>
                    <div className="space-y-2">
                      {(versions[doc.id] ?? []).map((version) => (
                        <div
                          key={version.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs"
                        >
                          <span>
                            {locale === "en" ? "Version" : "الإصدار"}{" "}
                            {version.versionNumber} · {version.originalFileName}{" "}
                            · {(version.fileSizeBytes / 1024).toFixed(1)} KB
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void previewDoc(doc, version.id)}
                            >
                              {locale === "en" ? "Preview" : "معاينة"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void downloadVersion(doc, version)}
                            >
                              {locale === "en"
                                ? "Download Version"
                                : "تنزيل النسخة"}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {versions[doc.id]?.length === 0 && (
                        <p className="text-xs text-[var(--muted)]">
                          {locale === "en"
                            ? "No saved versions."
                            : "لا توجد نسخ محفوظة."}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <ShieldCheck size={20} />
          {locale === "en" ? "Medical Insurance" : "التأمين الطبي"}
        </h2>
        {can("insurance.manage") && (
          <form
            key={editingPolicy?.id ?? "new"}
            onSubmit={savePolicy}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <label className="grid gap-2 text-sm font-bold">
              {locale === "en" ? "Insurance Company" : "شركة التأمين"}
              <select
                name="insuranceCompanyId"
                required
                value={companyId || editingPolicy?.insuranceCompanyId || ""}
                onChange={(e) => setCompanyId(e.target.value)}
                className={cls}
              >
                <option value="">
                  {locale === "en" ? "Select Company" : "اختر الشركة"}
                </option>
                {companies.map((c) => (
                  <option value={c.id} key={c.id}>
                    {locale === "en" ? c.nameEn || c.nameAr : c.nameAr}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              {locale === "en" ? "Plan" : "الخطة"}
              <select
                name="insurancePlanLevelId"
                required
                defaultValue={editingPolicy?.insurancePlanLevelId ?? ""}
                className={cls}
              >
                <option value="">
                  {locale === "en" ? "Select Plan" : "اختر الخطة"}
                </option>
                {plans.map((p) => (
                  <option value={p.id} key={p.id}>
                    {locale === "en" ? p.nameEn || p.nameAr : p.nameAr}
                  </option>
                ))}
              </select>
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
            return (
              <article
                key={p.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <div>
                  <p className="font-black">
                    {companyName} — {planName}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {p.startDate} {locale === "en" ? "to" : "إلى"} {p.endDate}
                  </p>
                </div>
                {can("insurance.manage") && (
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingPolicy(p);
                        setCompanyId(p.insuranceCompanyId);
                      }}
                    >
                      {locale === "en" ? "Edit" : "تعديل"}
                    </Button>
                    <button
                      onClick={async () => {
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
                      className="grid h-11 w-11 place-items-center rounded-xl border text-red-600"
                      aria-label={locale === "en" ? "Archive" : "أرشفة"}
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Card>
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
