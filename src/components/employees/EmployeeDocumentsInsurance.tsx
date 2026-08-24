"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  Download,
  FilePlus,
  RefreshCw,
  ShieldCheck,
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
  const { can } = useAuth(),
    [docs, setDocs] = useState<EmployeeDocument[]>([]),
    [types, setTypes] = useState<HrRow[]>([]),
    [companies, setCompanies] = useState<InsuranceCompany[]>([]),
    [plans, setPlans] = useState<InsurancePlan[]>([]),
    [policies, setPolicies] = useState<InsurancePolicy[]>([]),
    [companyId, setCompanyId] = useState(""),
    [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [versionTarget, setVersionTarget] = useState<EmployeeDocument | null>(null);
  const [editingDocument,setEditingDocument]=useState<EmployeeDocument|null>(null);
  const [versions,setVersions]=useState<Record<string,EmployeeDocumentVersion[]>>({});
  const [expandedHistory,setExpandedHistory]=useState<string|null>(null);
  const versionInput = useRef<HTMLInputElement>(null);
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
      setError(e instanceof Error ? e.message : "تعذر تحميل الوثائق والتأمين");
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
      setError(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  }
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const file=f.get("file") as File;
    if(!validateFile(file,f)) return;
    const kind=String(f.get("riderDocumentKind")||"") as RiderDocumentKind;
    await run(() => riderProfileId ? uploadRiderDocument(riderProfileId,kind,f) : uploadEmployeeDocument(employeeId, f));
    form.reset();
  }
  function validateFile(file:File,form?:FormData){
    if(!["application/pdf","image/jpeg","image/png"].includes(file.type)){setError("نوع الملف غير مسموح. استخدم PDF أو JPEG أو PNG.");return false}
    const hardLimit=11*1024*1024;
    const selectedCode=riderProfileId?kindCode[String(form?.get("riderDocumentKind")||"")]:String(types.find(t=>t.id===form?.get("documentTypeId"))?.code??"");
    const configured=Number(types.find(t=>String(t.code)===selectedCode)?.maxFileSizeBytes||hardLimit);
    if(file.size>Math.min(hardLimit,configured)){setError("حجم الملف أكبر من الحد المسموح لهذا النوع (بحد أقصى 11MB).");return false}
    return true;
  }
  async function saveMetadata(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!editingDocument)return;const f=new FormData(e.currentTarget);await run(()=>updateEmployeeDocument(employeeId,editingDocument.id,{documentNumber:String(f.get("documentNumber")||"")||null,issueDate:String(f.get("issueDate")||"")||null,expiryDate:String(f.get("expiryDate")||"")||null,notes:String(f.get("notes")||"")||null},editingDocument.rowVersion));setEditingDocument(null)}
  async function toggleHistory(doc:EmployeeDocument){if(expandedHistory===doc.id){setExpandedHistory(null);return}setExpandedHistory(doc.id);if(!versions[doc.id]){try{const rows=await getEmployeeDocumentVersions(employeeId,doc.id);setVersions(current=>({...current,[doc.id]:rows}))}catch(e){setError(e instanceof Error?e.message:"تعذر تحميل سجل النسخ")}}}
  async function savePolicy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      v = (k: string) => String(f.get(k) || "");
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
  const kindCode:Record<string,string>={"residency-permit":"RESIDENCY_PERMIT","driver-license":"DRIVER_LICENSE","rider-card":"RIDER_CARD","health-card":"HEALTH_CARD","promissory-note":"PROMISSORY_NOTE","medical-insurance":"MEDICAL_INSURANCE"};
  const riderKinds:{value:RiderDocumentKind;label:string}[]=[{value:"residency-permit",label:"الإقامة"},{value:"driver-license",label:"رخصة القيادة"},{value:"rider-card",label:"بطاقة المندوب"},{value:"health-card",label:"البطاقة الصحية"},{value:"promissory-note",label:"سند الأمر"},{value:"medical-insurance",label:"التأمين الطبي"}];
  async function download(doc: EmployeeDocument) {
    try {
      const { blob, fileName } = await downloadEmployeeDocument(
          employeeId,
          doc.id,
        ),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(fileName);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التنزيل");
    }
  }
  async function downloadVersion(doc:EmployeeDocument,version:EmployeeDocumentVersion){try{const{blob,fileName}=await downloadEmployeeDocument(employeeId,doc.id,version.id),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=decodeURIComponent(fileName||version.originalFileName);a.click();URL.revokeObjectURL(url)}catch(e){setError(e instanceof Error?e.message:"تعذر تنزيل النسخة")}}
  const cls =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3";
  return (
    <div className="grid gap-6 xl:grid-cols-2" dir="rtl">
      <input ref={versionInput} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" aria-label="اختيار نسخة وثيقة جديدة" onChange={(e)=>{const file=e.target.files?.[0];if(file&&versionTarget&&validateFile(file))void run(()=>uploadEmployeeDocumentVersion(employeeId,versionTarget.id,file));e.target.value=""}} />
      {error && (
        <p className="xl:col-span-2 bg-red-50 p-3 text-red-700">{error}</p>
      )}
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <FilePlus size={20} />
          الوثائق
        </h2>
        {can("documents.upload") && (
          <form onSubmit={upload} className="mt-4 grid gap-3 sm:grid-cols-2">
            {riderProfileId ? <label className="grid gap-2 font-bold">نوع وثيقة المندوب<select name="riderDocumentKind" required className={cls}><option value="">اختر النوع</option>{riderKinds.map(kind=><option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></label> : <label className="grid gap-2 font-bold">نوع الوثيقة<select name="documentTypeId" required className={cls}><option value="">اختر النوع</option>{types.map((t) => <option key={t.id} value={t.id}>{String(t.nameAr ?? t.code)}</option>)}</select></label>}
            <label className="grid gap-2 font-bold">
              الملف
              <input
                name="file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                required
                className={`${cls} py-2`}
              />
            </label>
            {[
              ["documentNumber", "رقم الوثيقة", "text"],
              ["issueDate", "تاريخ الإصدار", "date"],
              ["expiryDate", "تاريخ الانتهاء", "date"],
              ["notes", "ملاحظات", "text"],
            ].map(([n, l, t]) => (
              <label key={n} className="grid gap-2 font-bold">
                {l}
                <input name={n} type={t} className={cls} />
              </label>
            ))}
            <Button type="submit" loading={busy}>
              رفع الوثيقة
            </Button>
            <p className="self-center text-xs text-[var(--muted)]">PDF أو JPEG أو PNG، بحد أقصى 11MB وقد يفرض نوع الوثيقة حدًا أقل.</p>
          </form>
        )}
        {editingDocument&&<form onSubmit={saveMetadata} className="mt-5 grid gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-2"><h3 className="col-span-full font-black">تعديل بيانات {editingDocument.documentTypeNameAr}</h3><label className="grid gap-2 font-bold">رقم الوثيقة<input name="documentNumber" defaultValue={editingDocument.documentNumber??""} className={cls}/></label><label className="grid gap-2 font-bold">تاريخ الإصدار<input name="issueDate" type="date" defaultValue={editingDocument.issueDate??""} className={cls}/></label><label className="grid gap-2 font-bold">تاريخ الانتهاء<input name="expiryDate" type="date" defaultValue={editingDocument.expiryDate??""} className={cls}/></label><label className="grid gap-2 font-bold">ملاحظات<input name="notes" defaultValue={editingDocument.notes??""} className={cls}/></label><div className="col-span-full flex justify-end gap-2"><Button type="button" variant="secondary" onClick={()=>setEditingDocument(null)}>إلغاء</Button><Button type="submit" loading={busy}>حفظ البيانات</Button></div></form>}
        <div className="mt-5 space-y-2">
          {docs.map((doc) => (
            <article key={doc.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-black">{doc.documentTypeNameAr}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {doc.currentFileName ?? "بدون ملف"} ·{" "}
                    {doc.expiryDate ?? "بلا انتهاء"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => void download(doc)}
                    className="grid h-10 w-10 place-items-center rounded-lg border"
                    aria-label="تنزيل"
                  >
                    <Download size={16} />
                  </button>
                  {can("documents.upload") && (
                    <button
                      onClick={() => version(doc)}
                      className="grid h-10 w-10 place-items-center rounded-lg border"
                      aria-label="نسخة جديدة"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                  {can("documents.catalog.manage") && (
                    <button
                      onClick={() => setEditingDocument(doc)}
                      className="h-10 rounded-lg border px-3 font-bold"
                    >
                      تعديل
                    </button>
                  )}
                  <button onClick={()=>void toggleHistory(doc)} className="h-10 rounded-lg border px-3 font-bold">{expandedHistory===doc.id?"إخفاء النسخ":"سجل النسخ"}</button>
                  {can("documents.catalog.manage") && (
                    <button
                      onClick={async () => {
                        const reason = await systemPrompt("سبب الأرشفة");
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
                      className="grid h-10 w-10 place-items-center rounded-lg border text-red-600"
                    >
                      <Archive size={16} />
                    </button>
                  )}
                </div>
              </div>
              {expandedHistory===doc.id&&<div className="mt-3 border-t pt-3"><h4 className="mb-2 text-sm font-black">النسخ المحفوظة</h4><div className="space-y-2">{(versions[doc.id]??[]).map(version=><div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-xs"><span>الإصدار {version.versionNumber} · {version.originalFileName} · {(version.fileSizeBytes/1024).toFixed(1)} KB</span><Button type="button" variant="secondary" onClick={()=>void downloadVersion(doc,version)}>تنزيل النسخة</Button></div>)}{versions[doc.id]?.length===0&&<p className="text-xs text-[var(--muted)]">لا توجد نسخ محفوظة.</p>}</div></div>}
            </article>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <ShieldCheck size={20} />
          التأمين الطبي
        </h2>
        {can("insurance.manage") && (
          <form
            key={editingPolicy?.id ?? "new"}
            onSubmit={savePolicy}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <label className="grid gap-2 font-bold">
              شركة التأمين
              <select
                name="insuranceCompanyId"
                required
                value={companyId || editingPolicy?.insuranceCompanyId || ""}
                onChange={(e) => setCompanyId(e.target.value)}
                className={cls}
              >
                <option value="">اختر الشركة</option>
                {companies.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-bold">
              الخطة
              <select
                name="insurancePlanLevelId"
                required
                defaultValue={editingPolicy?.insurancePlanLevelId ?? ""}
                className={cls}
              >
                <option value="">اختر الخطة</option>
                {plans.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.nameAr}
                  </option>
                ))}
              </select>
            </label>
            {[
              ["policyNumber", "رقم الوثيقة", "text"],
              ["memberNumber", "رقم العضوية", "text"],
              ["startDate", "تاريخ البداية", "date"],
              ["endDate", "تاريخ النهاية", "date"],
              ["notes", "ملاحظات", "text"],
            ].map(([n, l, t]) => (
              <label key={n} className="grid gap-2 font-bold">
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
              {editingPolicy ? "حفظ التعديل" : "إضافة وثيقة تأمين"}
            </Button>
          </form>
        )}
        <div className="mt-5 space-y-2">
          {policies.map((p) => (
            <article
              key={p.id}
              className="flex items-center justify-between rounded-xl border p-3"
            >
              <div>
                <p className="font-black">
                  {p.insuranceCompanyAr} — {p.insurancePlanAr}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {p.startDate} إلى {p.endDate}
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
                    تعديل
                  </Button>
                  <button
                    onClick={async () => {
                      const reason = await systemPrompt("سبب الأرشفة");
                      if (reason)
                        void run(() =>
                          archiveInsurancePolicy(p.id, reason, p.rowVersion),
                        );
                    }}
                    className="grid h-11 w-11 place-items-center rounded-xl border text-red-600"
                  >
                    <Archive size={16} />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
