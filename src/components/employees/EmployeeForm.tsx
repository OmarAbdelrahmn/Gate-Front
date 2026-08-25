"use client";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, ContactRound, Save, UserRound, Bike } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { translate } from "../../lib/i18n";
import { hrCatalogApi, type HrRow } from "../../lib/hr/api";
import { listSponsors, type Sponsor } from "../../lib/workforce/api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { toast } from "../ui/Toast";
import { SearchableSelect } from "../ui/SearchableSelect";

const allFields = [
  ["iqamaNo", "رقم الإقامة", "Iqama / National ID", "text"],
  ["residencyProfession", "مهنة الإقامة", "Residency Profession", "text"],
  ["workingForMeAs", "يعمل لدينا بوظيفة", "Working Position", "text"],
  ["fullNameAr", "الاسم بالعربية", "Arabic Name", "text"],
  ["fullNameEn", "الاسم بالإنجليزية", "English Name", "text"],
  ["nationality", "الجنسية", "Nationality", "text"],
  ["birthDate", "تاريخ الميلاد", "Date of Birth", "date"],
  ["primaryPhone", "الجوال", "Primary Phone", "text"],
  ["secondaryPhone", "جوال إضافي", "Secondary Phone", "text"],
  ["email", "البريد الإلكتروني", "Email Address", "email"],
  ["emergencyContactName", "اسم جهة اتصال الطوارئ", "Emergency Contact Name", "text"],
  ["emergencyContactRelationship", "صلة القرابة", "Emergency Contact Relationship", "text"],
  ["emergencyContactPhone", "جوال الطوارئ", "Emergency Phone", "text"],
  ["statusReason", "سبب الحالة", "Status Reason", "text"],
  ["hireDate", "تاريخ التعيين", "Hire Date", "date"],
  ["contractStartDate", "بداية العقد", "Contract Start Date", "date"],
  ["contractEndDate", "نهاية العقد", "Contract End Date", "date"],
  ["probationEndDate", "نهاية التجربة", "Probation End Date", "date"],
  ["terminationDate", "تاريخ الانتهاء", "Termination Date", "date"],
  ["alternateContactName", "اسم الاتصال البديل", "Alternate Contact Name", "text"],
  ["alternateContactPhone", "جوال الاتصال البديل", "Alternate Contact Phone", "text"],
] as const;

type FieldKey = (typeof allFields)[number][0];
type Tab = "basic" | "contact" | "work" | "rider";
const basic: FieldKey[] = ["iqamaNo", "fullNameAr", "fullNameEn", "nationality", "birthDate"];
const contact: FieldKey[] = [
  "primaryPhone",
  "secondaryPhone",
  "email",
  "emergencyContactName",
  "emergencyContactRelationship",
  "emergencyContactPhone",
];
const work: FieldKey[] = ["statusReason", "hireDate", "terminationDate"];
const contract: FieldKey[] = ["contractStartDate", "contractEndDate", "probationEndDate"];
const blank = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;

export function EmployeeForm({
  initial,
  submitLabel,
  onSave,
}: {
  initial: Record<string, unknown>;
  submitLabel: string;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [isEmployee, setEmployee] = useState(
    initial.isEmployee !== undefined ? Boolean(initial.isEmployee) : true,
  );
  const [engagement, setEngagement] = useState(
    String(initial.engagementType ?? "SponsoredInternal"),
  );

  useEffect(() => {
    if (initial.isEmployee !== undefined) {
      setEmployee(Boolean(initial.isEmployee));
    }
    if (initial.engagementType) {
      setEngagement(String(initial.engagementType));
    }
  }, [initial.isEmployee, initial.engagementType]);

  const [active, setActive] = useState<Tab>("basic");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [workTypes, setWorkTypes] = useState<HrRow[]>([]);
  const [cities, setCities] = useState<HrRow[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [professions, setProfessions] = useState<HrRow[]>([]);
  const [jobTitles, setJobTitles] = useState<HrRow[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      hrCatalogApi.list("operational-work-types"),
      hrCatalogApi.list("operating-cities"),
      listSponsors(),
      hrCatalogApi.list("residency-professions"),
      hrCatalogApi.list("job-titles"),
    ])
      .then(([types, operatingCities, sponsorRows, professionRows, titleRows]) => {
        setWorkTypes(types);
        setCities(operatingCities);
        setSponsors(sponsorRows);
        setProfessions(professionRows);
        setJobTitles(titleRows);
      })
      .catch(() =>
        setError(
          locale === "en"
            ? "Failed to load reference lists for form."
            : "تعذر تحميل القوائم المرجعية للنموذج.",
        ),
      )
      .finally(() => setCatalogsLoading(false));
  }, [locale]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const effectiveIsEmployee = engagement === "OutsideRider" ? false : isEmployee;
    const status = String(form.get("status") ?? "");

    const payload: Record<string, unknown> = {
      rowVersion: initial.rowVersion ?? null,
      rider: effectiveIsEmployee
        ? null
        : {
            tShirtSize: blank(form.get("tShirtSize")) ?? (initial.tShirtSize ? String(initial.tShirtSize) : null),
            operationalNotes: blank(form.get("operationalNotes")) ?? (initial.operationalNotes ? String(initial.operationalNotes) : null),
            rowVersion: initial.riderRowVersion ?? (initial.rider as { rowVersion?: string })?.rowVersion ?? null,
          },
    };
    allFields.forEach(([key]) => (payload[key] = blank(form.get(key))));
    payload.isEmployee = effectiveIsEmployee;
    payload.engagementType = engagement;
    payload.status = status;
    payload.statusReason = blank(form.get("statusReason"));
    payload.gender = blank(form.get("gender"));
    payload.maritalStatus = blank(form.get("maritalStatus"));
    payload.notes = blank(form.get("notes"));
    payload.operationalWorkTypeId = blank(form.get("operationalWorkTypeId"));
    payload.operatingCityId = blank(form.get("operatingCityId"));
    payload.sponsorId = engagement === "SponsoredInternal" ? blank(form.get("sponsorId")) : null;

    // Validation Rules matching API Spec
    if (!payload.fullNameAr || !payload.engagementType || !payload.status) {
      const msg = locale === "en"
        ? "Arabic Full Name, Engagement Type, and Status are required."
        : "الاسم بالعربية ونوع الارتباط وحالة الموظف حقول مطلوبة.";
      setError(msg);
      toast.error(locale === "en" ? "Validation Error" : "خطأ في التحقق من البيانات", msg);
      return;
    }

    const iqama = String(payload.iqamaNo ?? "").trim();
    if (!iqama || !/^\d{10}$/.test(iqama)) {
      const msg = locale === "en"
        ? "Iqama / National ID number is required and must contain exactly 10 digits."
        : "رقم الإقامة / الهوية الوطنية مطلوب ويجب أن يتكون من 10 أرقام بالضبط.";
      setError(msg);
      toast.error(locale === "en" ? "Validation Error" : "خطأ في رقم الإقامة", msg);
      return;
    }

    if (status === "Active" && engagement === "SponsoredInternal" && !payload.sponsorId) {
      const msg = locale === "en"
        ? "Sponsored internal employees require selecting a sponsor when Active."
        : "الموظف على كفالة الشركة يتطلب اختيار كفيل عندما يكون نشطاً.";
      setError(msg);
      toast.error(locale === "en" ? "Validation Error" : "خطأ في التحديد", msg);
      return;
    }

    const startDate = String(payload.contractStartDate ?? "");
    const endDate = String(payload.contractEndDate ?? "");
    if (startDate && endDate && startDate > endDate) {
      const msg = locale === "en"
        ? "Contract end date cannot be earlier than contract start date."
        : "تاريخ نهاية العقد لا يمكن أن يكون قبل تاريخ بداية العقد.";
      setError(msg);
      toast.error(locale === "en" ? "Validation Error" : "خطأ في التواريخ", msg);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(payload);
      toast.success(
        locale === "en" ? "Saved Successfully" : "تم الحفظ بنجاح",
        locale === "en" ? "Employee details updated successfully." : "تم التحديث بنجاح"
      );
    } catch (err: any) {
      let msg = err?.message;
      if (err?.status === 409 || String(err?.message ?? "").includes("409") || String(err?.message ?? "").includes("conflict")) {
        msg = locale === "en"
          ? "Role transition failed (409 Conflict): Rider has an active platform or vehicle assignment."
          : "تعذر تحويل المندوب إلى موظف إداري لوجود منصة أو مركبة مسندة إليه حالياً. يجب إلغاء الإسنادات أولاً. (409)";
      }
      if (!msg) {
        msg = locale === "en"
          ? "Failed to save data. Check required fields and values."
          : "تعذر حفظ البيانات. راجع الحقول المطلوبة والقيم المختارة.";
      }
      setError(msg);
      toast.error(locale === "en" ? "Validation Error" : "خطأ في الحفظ", msg);
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    {
      key: "basic" as const,
      label: locale === "en" ? "Basic Information" : "البيانات الأساسية",
      icon: UserRound,
    },
    {
      key: "contact" as const,
      label: locale === "en" ? "Contact Information" : "التواصل",
      icon: ContactRound,
    },
    {
      key: "work" as const,
      label: locale === "en" ? "Work & Relationship" : "العمل والعلاقة",
      icon: BriefcaseBusiness,
    },
    ...(!isEmployee
      ? [
          {
            key: "rider" as const,
            label: locale === "en" ? "Delegate Details" : "بيانات المندوب",
            icon: Bike,
          },
        ]
      : []),
  ];

  const renderFields = (keys: FieldKey[]) =>
    keys.map((key) => {
      const field = allFields.find((item) => item[0] === key)!;
      const label = locale === "en" ? field[2] : field[1];
      const rawVal = initial[key];
      const valStr =
        field[3] === "date" && typeof rawVal === "string" && rawVal
          ? rawVal.slice(0, 10)
          : String(rawVal ?? "");
      return (
        <Input
          key={key}
          name={key}
          label={label}
          type={field[3]}
          required={key === "fullNameAr" || key === "iqamaNo"}
          defaultValue={valStr}
          maxLength={key === "iqamaNo" ? 10 : undefined}
          dir={key === "email" || key.includes("Phone") || key === "iqamaNo" ? "ltr" : undefined}
        />
      );
    });

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 font-normal outline-none focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100";

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-3 sm:p-4">
          <div
            role="tablist"
            aria-label={locale === "en" ? "Employee form sections" : "أقسام بيانات الموظف"}
            className="flex gap-2 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon,
                selected = active === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(tab.key)}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold ${selected ? "bg-[#1167c9] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:bg-blue-50"}`}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <section role="tabpanel" hidden={active !== "basic"} className="grid gap-4 sm:grid-cols-2">
            <h2 className="col-span-full text-lg font-black">
              {locale === "en" ? "Identity & Personal Details" : "الهوية والبيانات الشخصية"}
            </h2>
            {renderFields(basic)}
            <CatalogSelect
              name="residencyProfession"
              label={locale === "en" ? "Residency Profession" : "مهنة الإقامة"}
              value={initial.residencyProfession}
              loading={catalogsLoading}
              options={professions.map((item) => ({
                value: String(locale === "en" ? item.nameEn || item.nameAr || item.code : item.nameAr ?? item.code),
                label: String(locale === "en" ? item.nameEn || item.nameAr || item.code : item.nameAr ?? item.code),
              }))}
              locale={locale}
            />
            <CatalogSelect
              name="workingForMeAs"
              label={locale === "en" ? "Working Position" : "يعمل لدينا بوظيفة"}
              value={initial.workingForMeAs}
              loading={catalogsLoading}
              options={jobTitles.map((item) => ({
                value: String(locale === "en" ? item.nameEn || item.nameAr || item.code : item.nameAr ?? item.code),
                label: String(locale === "en" ? item.nameEn || item.nameAr || item.code : item.nameAr ?? item.code),
              }))}
              locale={locale}
            />
            <Select
              label={locale === "en" ? "Gender" : "الجنس"}
              name="gender"
              value={initial.gender}
              options={[
                { value: "", label: locale === "en" ? "Unspecified" : "غير محدد" },
                { value: "Male", label: locale === "en" ? "Male" : "ذكر" },
                { value: "Female", label: locale === "en" ? "Female" : "أنثى" },
              ]}
              className={selectClass}
            />
            <Select
              label={locale === "en" ? "Marital Status" : "الحالة الاجتماعية"}
              name="maritalStatus"
              value={initial.maritalStatus}
              options={[
                { value: "", label: locale === "en" ? "Unspecified" : "غير محددة" },
                { value: "Single", label: locale === "en" ? "Single" : "أعزب" },
                { value: "Married", label: locale === "en" ? "Married" : "متزوج" },
              ]}
              className={selectClass}
            />
          </section>

          <section role="tabpanel" hidden={active !== "contact"} className="grid gap-4 sm:grid-cols-2">
            <h2 className="col-span-full text-lg font-black">
              {locale === "en" ? "Contact & Emergency Details" : "بيانات التواصل والطوارئ"}
            </h2>
            {renderFields(contact)}
            {engagement === "OutsideRider" &&
              renderFields(["alternateContactName", "alternateContactPhone"])}
          </section>

          <section role="tabpanel" hidden={active !== "work"} className="grid gap-4 sm:grid-cols-2">
            <h2 className="col-span-full text-lg font-black">
              {locale === "en" ? "Work & Operational Relationship" : "العمل والعلاقة التشغيلية"}
            </h2>
            <Select
              label={locale === "en" ? "Person Type" : "نوع الشخص"}
              value={isEmployee ? "employee" : "rider"}
              onChange={(value) => {
                setEmployee(value === "employee");
                if (value === "employee" && active === "rider") setActive("work");
              }}
              required
              options={[
                { value: "employee", label: locale === "en" ? "Administrative Staff" : "موظف إداري" },
                { value: "rider", label: locale === "en" ? "Delegate (Rider)" : "مندوب" },
              ]}
              className={selectClass}
            />
            <Select
              label={locale === "en" ? "Engagement Type" : "نوع الارتباط"}
              name="engagementType"
              value={engagement}
              onChange={setEngagement}
              required
              options={[
                { value: "SponsoredInternal", label: locale === "en" ? "Company Sponsored" : "على الكفالة" },
                { value: "OutsideRider", label: locale === "en" ? "External Delegate" : "مندوب خارجي" },
              ]}
              className={selectClass}
            />
            <Select
              label={locale === "en" ? "Employee Status" : "حالة الموظف"}
              name="status"
              value={initial.status ?? "Draft"}
              required
              options={[
                { value: "Draft", label: locale === "en" ? "Draft" : "مسودة" },
                { value: "Onboarding", label: locale === "en" ? "Onboarding" : "قيد التهيئة" },
                { value: "Active", label: locale === "en" ? "Active" : "نشط" },
                { value: "Suspended", label: locale === "en" ? "Suspended" : "موقوف" },
                { value: "OnLeave", label: locale === "en" ? "On Leave" : "في إجازة" },
                { value: "Terminated", label: locale === "en" ? "Terminated" : "منتهي الخدمة" },
                { value: "Archived", label: locale === "en" ? "Archived" : "مؤرشف" },
                { value: "Fleeing", label: locale === "en" ? "Fleeing" : "هروب / انقطاع" },
                { value: "Accident", label: locale === "en" ? "Accident" : "حادث" },
                { value: "Sick", label: locale === "en" ? "Sick" : "إجازة مرضية" },
              ]}
              className={selectClass}
            />
            {renderFields(work)}
            <CatalogSelect
              name="operationalWorkTypeId"
              label={locale === "en" ? "Operational Work Type" : "نوع العمل التشغيلي"}
              value={initial.operationalWorkTypeId}
              loading={catalogsLoading}
              options={workTypes.map((item) => ({
                value: item.id,
                label: String(locale === "en" ? item.nameEn || item.nameAr || item.code : item.nameAr ?? item.code),
              }))}
              locale={locale}
            />
            <CatalogSelect
              name="operatingCityId"
              label={locale === "en" ? "Operating City" : "مدينة التشغيل"}
              value={initial.operatingCityId}
              loading={catalogsLoading}
              options={cities.map((item) => ({
                value: item.id,
                label: String(locale === "en" ? item.nameEn || item.nameAr || item.code : item.nameAr ?? item.code),
              }))}
              locale={locale}
            />
            {engagement === "SponsoredInternal" && (
              <>
                <CatalogSelect
                  name="sponsorId"
                  label={locale === "en" ? "Sponsor" : "الكفيل"}
                  value={initial.sponsorId}
                  loading={catalogsLoading}
                  options={sponsors.map((item) => ({
                    value: item.id,
                    label: locale === "en" ? item.registryNameEn || item.registryNameAr : item.registryNameAr,
                  }))}
                  locale={locale}
                />
                {renderFields(contract)}
              </>
            )}
            <label className="col-span-full grid gap-2 text-sm font-bold">
              {t("common.notes")}
              <textarea
                name="notes"
                defaultValue={String(initial.notes ?? "")}
                className="min-h-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-normal"
              />
            </label>
          </section>

          {!isEmployee && (
            <section role="tabpanel" hidden={active !== "rider"} className="grid gap-4 sm:grid-cols-2">
              <h2 className="col-span-full text-lg font-black">
                {locale === "en" ? "Delegate Operational Data" : "بيانات تشغيل المندوب"}
              </h2>
              <Select
                label={locale === "en" ? "T-Shirt Size" : "مقاس تي شيرت"}
                name="tShirtSize"
                value={initial.tShirtSize}
                options={[
                  "",
                  "ExtraSmall",
                  "Small",
                  "Medium",
                  "Large",
                  "ExtraLarge",
                  "DoubleExtraLarge",
                  "TripleExtraLarge",
                ].map((value) => ({
                  value,
                  label: value || (locale === "en" ? "Unspecified" : "غير محدد"),
                }))}
                className={selectClass}
              />
              <Input
                name="operationalNotes"
                label={locale === "en" ? "Delegate Notes" : "ملاحظات المندوب"}
                defaultValue={String(initial.operationalNotes ?? "")}
              />
            </section>
          )}

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"
            >
              {error}
            </p>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-slate-50/60 p-4">
          <p className="text-xs text-[var(--muted)]">
            {locale === "en"
              ? "Review required fields before saving."
              : "راجع الحقول المعلّمة «مطلوب» قبل الحفظ."}
          </p>
          <Button type="submit" loading={saving}>
            <Save size={17} />
            {submitLabel}
          </Button>
        </footer>
      </Card>
    </form>
  );
}

function CatalogSelect({
  name,
  label,
  value,
  options,
  loading,
  locale = "ar",
}: {
  name: string;
  label: string;
  value: unknown;
  options: { value: string; label: string }[];
  loading: boolean;
  locale?: "ar" | "en";
}) {
  const [selectedVal, setSelectedVal] = useState<string>(String(value ?? ""));
  useEffect(() => {
    setSelectedVal(String(value ?? ""));
  }, [value]);

  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <SearchableSelect
        name={name}
        value={selectedVal}
        onChange={setSelectedVal}
        disabled={loading}
        options={options}
        placeholder={
          loading
            ? locale === "en"
              ? "Loading options..."
              : "جارٍ تحميل الخيارات…"
            : locale === "en"
              ? `Select ${label}`
              : `اختر ${label}`
        }
        searchPlaceholder={locale === "en" ? `Search ${label}...` : `ابحث في ${label}...`}
      />
    </label>
  );
}

function Select({
  label,
  name,
  value,
  options,
  required,
  onChange,
}: {
  label: string;
  name?: string;
  value: unknown;
  options: { value: string; label: string }[];
  className?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  const [selectedVal, setSelectedVal] = useState<string>(String(value ?? ""));
  useEffect(() => {
    setSelectedVal(String(value ?? ""));
  }, [value]);

  function handleChange(val: string) {
    setSelectedVal(val);
    onChange?.(val);
  }

  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <SearchableSelect
        name={name}
        value={onChange ? String(value ?? "") : selectedVal}
        onChange={handleChange}
        required={required}
        options={options}
        placeholder={label}
        searchPlaceholder="ابحث..."
      />
    </label>
  );
}
