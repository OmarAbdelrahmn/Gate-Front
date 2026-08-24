"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { authFetch } from "../../lib/auth/api";
import {
  hrCatalogApi,
  hrWorkflowApi,
  type HrPayload,
  type HrRow,
} from "../../lib/hr/api";
import { hrSections, type HrField, type HrSection } from "../../lib/hr/config";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { systemPrompt } from "../ui/SystemDialog";
import { toast } from "../ui/Toast";
import { SearchableSelect } from "../ui/SearchableSelect";

import { translate } from "../../lib/i18n";

const workflowResources = new Set([
  "leave-types",
  "leave-approval-workflows",
  "leave-requests",
  "absence-cases",
  "employee-status-change-requests",
]);
const display = (value: unknown, locale: "ar" | "en" = "ar") =>
  value === true
    ? (locale === "en" ? "Yes" : "نعم")
    : value === false
      ? (locale === "en" ? "No" : "لا")
      : value == null || value === ""
        ? "—"
        : String(value);
const errorMessage = (error: unknown, locale: "ar" | "en" = "ar") =>
  error instanceof Error
    ? error.message
    : (locale === "en" ? "Operation failed. Check data and permissions then try again." : "تعذر تنفيذ العملية. تحقق من البيانات والصلاحية ثم حاول مجددًا.");
const inferredSource = (field: HrField): HrField["source"] =>
  field.source ??
  (
    {
      employeeId: "employees",
      documentTypeId: "document-types",
      leaveTypeId: "leave-types",
      clientPlatformId: "platforms",
      relatedClientContractId: "contracts",
    } as Record<string, HrField["source"]>
  )[field.key];

function initialValues(section: HrSection, row?: HrRow | null) {
  return Object.fromEntries(
    section.fields.map((field) => {
      const value = row?.[field.key];
      if (field.kind === "json")
        return [field.key, JSON.stringify(value ?? [], null, 2)];
      if (field.kind === "csv")
        return [field.key, Array.isArray(value) ? value.join(", ") : ""];
      if (field.kind === "boolean") return [field.key, Boolean(value)];
      return [field.key, value == null ? "" : String(value)];
    }),
  );
}

function toPayload(
  section: HrSection,
  values: Record<string, string | boolean>,
  editing: HrRow | null,
): HrPayload {
  const payload: HrPayload = {};
  for (const field of section.fields) {
    const value = values[field.key];
    if (field.kind === "boolean") payload[field.key] = Boolean(value);
    else if (field.kind === "number")
      payload[field.key] = value === "" ? null : Number(value);
    else if (field.kind === "csv")
      payload[field.key] = String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) =>
          field.key === "reminderOffsetsDays" ? Number(item) : item,
        );
    else if (field.kind === "json")
      payload[field.key] = JSON.parse(String(value || "[]"));
    else payload[field.key] = value === "" ? null : value;
  }
  if (editing?.rowVersion) payload.rowVersion = editing.rowVersion;
  return payload;
}

function Field({
  field,
  value,
  onChange,
  options,
  locale = "ar",
}: {
  field: HrField;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  options?: { value: string; label: string; labelEn?: string }[];
  locale?: "ar" | "en";
}) {
  const label = locale === "en" ? (field.labelEn || field.label) : field.label;
  if (field.kind === "boolean")
    return (
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border)] px-3 text-sm font-bold">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-[#1167c9]"
        />
        {label}
      </label>
    );
  if (field.kind === "select" || inferredSource(field)) {
    const selectOptions = (options ?? field.options ?? []).map((opt) => ({
      value: opt.value,
      label: locale === "en" ? (opt.labelEn || opt.label) : opt.label,
    }));
    return (
      <label className="grid gap-2 text-sm font-bold">
        <span>{label.replace("معرّف ", "").replace(" ID", "")}</span>
        <SearchableSelect
          value={String(value)}
          onChange={(val) => onChange(val)}
          options={selectOptions}
          required={field.required}
          placeholder={locale === "en" ? "Select..." : "اختر..."}
          searchPlaceholder={locale === "en" ? "Search..." : "ابحث..."}
        />
      </label>
    );
  }
  if (field.kind === "json")
    return (
      <label className="col-span-full grid gap-2 text-sm font-bold">
        <span>{label}</span>
        <textarea
          dir="ltr"
          rows={8}
          required={field.required}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs"
        />
      </label>
    );
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>
      <input
        type={
          field.kind === "date"
            ? "date"
            : field.kind === "number"
              ? "number"
              : "text"
        }
        required={field.required}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 font-normal outline-none focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

export function HrSectionManager({
  sectionKey,
  embedded = false,
}: {
  sectionKey: string;
  embedded?: boolean;
}) {
  const section = hrSections[sectionKey];
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [rows, setRows] = useState<HrRow[]>([]);
  const [editing, setEditing] = useState<HrRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lookups, setLookups] = useState<
    Record<string, { value: string; label: string; labelEn?: string }[]>
  >({});
  const manageable = section ? can(section.permissionManage) : false;

  const load = useCallback(async () => {
    if (!section) return;
    setLoading(true);
    setError("");
    try {
      const data = workflowResources.has(section.resource)
        ? await hrWorkflowApi.list(section.resource)
        : await hrCatalogApi.list(section.resource);
      setRows(data);
    } catch (err) {
      setError(errorMessage(err, locale));
    } finally {
      setLoading(false);
    }
  }, [section, locale]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const sources = [
      ...new Set(section?.fields.map(inferredSource).filter(Boolean) ?? []),
    ] as NonNullable<HrField["source"]>[];
    const paths: Record<NonNullable<HrField["source"]>, string> = {
      employees: "/api/employees",
      "document-types": "/api/hr-catalogs/document-types",
      "leave-types": "/api/hr-workflows/leave-types",
      platforms: "/api/platform-operations/platforms",
      contracts: "/api/platform-operations/contracts",
      "operational-work-types": "/api/hr-catalogs/operational-work-types",
    };
    void Promise.all(
      sources.map(async (source) => {
        try {
          const data = await authFetch<HrRow[]>(paths[source]);
          return [
            source,
            data.map((row) => ({
              value: row.id,
              label: String(
                row.fullNameAr ??
                  row.nameAr ??
                  row.platformNameAr ??
                  row.contractNameAr ??
                  row.code ??
                  row.id,
              ),
              labelEn: String(
                row.fullNameEn ??
                  row.nameEn ??
                  row.platformNameEn ??
                  row.contractNameEn ??
                  row.code ??
                  row.id,
              ),
            })),
          ] as const;
        } catch {
          return [source, []] as const;
        }
      }),
    ).then((entries) => setLookups(Object.fromEntries(entries)));
  }, [section]);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );
  if (!section) return <p role="alert">{locale === "en" ? "Requested section not found." : "القسم المطلوب غير موجود."}</p>;

  const openForm = (row: HrRow | null) => {
    setEditing(row);
    setCreating(true);
    setValues(initialValues(section, row));
    setError("");
    setNotice("");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = toPayload(section, values, editing);
      if (editing)
        await (workflowResources.has(section.resource)
          ? hrWorkflowApi.update(section.resource, editing.id, payload)
          : hrCatalogApi.update(section.resource, editing.id, payload));
      else
        await (workflowResources.has(section.resource)
          ? hrWorkflowApi.create(section.resource, payload)
          : hrCatalogApi.create(section.resource, payload));
      setCreating(false);
      setEditing(null);
      const msg = locale === "en" ? "Data saved successfully." : "تم حفظ البيانات بنجاح.";
      setNotice(msg);
      toast.success(locale === "en" ? "Saved Successfully" : "تم الحفظ بنجاح", msg);
      await load();
    } catch (err) {
      const msg = errorMessage(err, locale);
      setError(msg);
      toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setBusy(false);
    }
  };

  const run = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError("");
    try {
      await operation();
      setNotice(success);
      toast.success(locale === "en" ? "Action Completed" : "تمت العملية بنجاح", success);
      await load();
    } catch (err) {
      const msg = errorMessage(err, locale);
      setError(msg);
      toast.error(locale === "en" ? "Operation Failed" : "فشلت العملية", msg);
    } finally {
      setBusy(false);
    }
  };
  const leaveAction = async (row: HrRow, action: string) => {
    const comment = (await systemPrompt(locale === "en" ? "Enter comment or reason for action" : "أدخل التعليق أو سبب الإجراء"))?.trim();
    if (!comment) return;
    const op =
      action === "force-cancel"
        ? hrWorkflowApi.forceCancelLeave(
            row.id,
            comment,
            String(row.rowVersion || ""),
          )
        : ["approve", "reject", "return"].includes(action)
          ? hrWorkflowApi.decideLeave(
              row.id,
              action as "approve" | "reject" | "return",
              comment,
              String(row.rowVersion || ""),
            )
          : hrWorkflowApi.leaveTransition(
              row.id,
              action,
              comment,
              String(row.rowVersion || ""),
            );
    void run(() => op, locale === "en" ? "Leave request updated." : "تم تحديث طلب الإجازة.");
  };
  const absenceAction = async (row: HrRow) => {
    const status = (
      await systemPrompt(
        locale === "en" ? "New Status: UnderReview / DeadlineApproaching / Overdue / Resolved / Cancelled / Closed" : "الحالة الجديدة: UnderReview / DeadlineApproaching / Overdue / Resolved / Cancelled / Closed",
      )
    )?.trim();
    if (!status) return;
    const reason = (await systemPrompt(locale === "en" ? "Reason for change" : "سبب التغيير"))?.trim();
    if (!reason) return;
    void run(
      () =>
        hrWorkflowApi.transitionAbsence(row.id, {
          status,
          reason,
          resolutionCode: null,
          resolutionNotes: null,
          rowVersion: row.rowVersion,
        }),
      locale === "en" ? "Absence case updated." : "تم تحديث حالة الغياب.",
    );
  };
  const statusAction = async (row: HrRow, approve: boolean) => {
    const resolutionReason = (await systemPrompt(locale === "en" ? "Decision reason" : "سبب القرار"))?.trim();
    if (!resolutionReason) return;
    void run(
      () =>
        hrWorkflowApi.resolveStatusChange(row.id, {
          approve,
          resolutionReason,
          rowVersion: row.rowVersion,
        }),
      locale === "en" ? "Decision recorded." : "تم تسجيل القرار.",
    );
  };
  const setWorkTypes = async (row: HrRow) => {
    const raw =
      (await systemPrompt(locale === "en" ? "Select work types from mapping editor" : "اختر أنواع العمل من محرر الربط", ""))?.trim() ?? "";
    void run(
      () =>
        hrCatalogApi.setJobTitleWorkTypes(
          row.id,
          raw
            ? raw
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)
            : [],
        ),
      locale === "en" ? "Linked work types updated." : "تم تحديث أنواع العمل المرتبطة.",
    );
  };

  const sectionTitle = locale === "en" ? (section.titleEn || section.title) : section.title;
  const sectionDesc = locale === "en" ? (section.descriptionEn || section.description) : section.description;

  return (
    <div className="space-y-6">
      <header
        className={`flex flex-wrap items-end justify-between gap-4 ${embedded ? "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" : ""}`}
      >
        <div>
          {!embedded && (
            <p className="text-sm font-bold text-[#1167c9]">{t("nav.hrManagement")}</p>
          )}
          {embedded ? (
            <h2 className="text-xl font-black">{sectionTitle}</h2>
          ) : (
            <h1 className="mt-1 text-3xl font-black">{sectionTitle}</h1>
          )}
          <p className="mt-2 text-sm text-[var(--muted)]">
            {sectionDesc}
          </p>
        </div>
        {manageable && (
          <Button onClick={() => openForm(null)}>
            <Plus size={18} />
            {t("common.add")}
          </Button>
        )}
      </header>
      {(error || notice) && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-sm font-bold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          {error || notice}
        </p>
      )}
      {creating && (
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">
              {editing ? (locale === "en" ? "Edit Data" : "تعديل البيانات") : (locale === "en" ? "Add New Record" : "إضافة سجل")}
            </h2>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => setCreating(false)}
              className="grid h-11 w-11 place-items-center rounded-xl hover:bg-slate-100"
            >
              <X size={19} />
            </button>
          </div>
          <form
            onSubmit={save}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {section.fields.map((field) => {
              const source = inferredSource(field);
              return (
                <Field
                  key={field.key}
                  field={field}
                  locale={locale}
                  value={
                    values[field.key] ?? (field.kind === "boolean" ? false : "")
                  }
                  options={source ? lookups[source] : undefined}
                  onChange={(value) =>
                    setValues((current) => ({ ...current, [field.key]: value }))
                  }
                />
              );
            })}
            <div className="col-span-full flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreating(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={busy}>
                <Check size={18} />
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-[var(--border)] p-4">
          <label className="relative min-w-[280px] flex-1">
            <Search
              className={`absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"}`}
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === "en" ? "Search all fields..." : "بحث فوري في جميع البيانات"}
              className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
            />
          </label>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw size={17} />
            {locale === "en" ? "Refresh" : "تحديث"}
          </Button>
        </div>
        {loading ? (
          <div className="space-y-3 p-5" aria-label={t("common.loading")}>
            {[1, 2, 3].map((x) => (
              <div
                key={x}
                className="h-12 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-[var(--muted)]">
                <tr>
                  {section.columns.map((column) => (
                    <th key={column.key} className="px-4 py-3">
                      {locale === "en" ? (column.labelEn || column.label) : column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    {section.columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 font-medium">
                        {display(row[column.key], locale)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {manageable && section.workflow !== "status" && (
                          <button
                            onClick={() => openForm(row)}
                            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--border)] px-3 font-bold text-[#1167c9]"
                          >
                            <Edit3 size={15} />
                            {t("common.edit")}
                          </button>
                        )}
                        {section.resource === "job-titles" && manageable && (
                          <button
                            onClick={() => setWorkTypes(row)}
                            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--border)] px-3 font-bold"
                          >
                            <Settings2 size={15} />
                            {locale === "en" ? "Link Work Types" : "ربط أنواع العمل"}
                          </button>
                        )}
                        {section.workflow === "leave" && (
                          <select
                            aria-label={locale === "en" ? "Leave request action" : "إجراء طلب الإجازة"}
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value)
                                leaveAction(row, e.target.value);
                              e.target.value = "";
                            }}
                            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 font-bold"
                          >
                            <option value="">{locale === "en" ? "Choose Action" : "اختر إجراء"}</option>
                            <option value="submit">{locale === "en" ? "Submit" : "إرسال"}</option>
                            <option value="activate">{locale === "en" ? "Activate" : "تفعيل"}</option>
                            <option value="complete">{locale === "en" ? "Complete" : "إكمال"}</option>
                            {can("leave_requests.approve") && (
                              <>
                                <option value="approve">{locale === "en" ? "Approve" : "اعتماد"}</option>
                                <option value="reject">{locale === "en" ? "Reject" : "رفض"}</option>
                                <option value="return">{locale === "en" ? "Return" : "إعادة للتعديل"}</option>
                                <option value="force-cancel">
                                  {locale === "en" ? "Force Cancel" : "إلغاء إجباري"}
                                </option>
                              </>
                            )}
                          </select>
                        )}
                        {section.workflow === "absence" && (
                          <button
                            onClick={() => absenceAction(row)}
                            className="min-h-10 rounded-lg border px-3 font-bold"
                          >
                            {locale === "en" ? "Change Path" : "تغيير المسار"}
                          </button>
                        )}
                        {section.workflow === "status" &&
                          can("employee_status_changes.approve") && (
                            <>
                              <button
                                onClick={() => statusAction(row, true)}
                                className="min-h-10 rounded-lg bg-emerald-600 px-3 font-bold text-white"
                              >
                                {locale === "en" ? "Approve" : "اعتماد"}
                              </button>
                              <button
                                onClick={() => statusAction(row, false)}
                                className="min-h-10 rounded-lg bg-red-600 px-3 font-bold text-white"
                              >
                                {locale === "en" ? "Reject" : "رفض"}
                              </button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={section.columns.length + 1}
                      className="p-10 text-center text-[var(--muted)]"
                    >
                      {locale === "en" ? "No matching data found." : "لا توجد بيانات مطابقة."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
