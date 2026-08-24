"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Check,
  Edit3,
  Plus,
  Save,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { systemConfirm } from "../../../../components/ui/SystemDialog";
import { permissionLabel } from "../../../../lib/permission-labels";
import {
  groupPermissions,
  permissionGroupLabel,
} from "../../../../lib/permission-groups";
import {
  archiveRole,
  createRole,
  getPermissionCatalogue,
  listRoles,
  replaceRolePermissions,
  updateRole,
} from "../../../../lib/users/api";
import type {
  PermissionCatalogItem,
  Role,
  RoleRequest,
} from "../../../../lib/users/types";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Input } from "../../../../components/ui/Input";

const emptyRole = (): RoleRequest => ({
  code: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  status: "Active",
  isTemplate: false,
  sourceTemplateId: null,
  rowVersion: null,
});
const requestFrom = (role: Role): RoleRequest => ({
  code: role.code,
  nameAr: role.nameAr,
  nameEn: role.nameEn,
  descriptionAr: role.descriptionAr ?? "",
  descriptionEn: role.descriptionEn ?? "",
  status: role.status,
  isTemplate: role.isTemplate,
  sourceTemplateId: role.sourceTemplateId,
  rowVersion: role.rowVersion,
});

import { translate } from "../../../../lib/i18n";

export default function RolesPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalogue, setCatalogue] = useState<PermissionCatalogItem[]>([]);
  const [selected, setSelected] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleRequest>(emptyRole());
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = can("roles.manage");

  async function load() {
    setLoading(true);
    setError("");
    const [rolesResult, permissionsResult] = await Promise.allSettled([
      listRoles(),
      getPermissionCatalogue(),
    ]);
    if (rolesResult.status === "fulfilled") setRoles(rolesResult.value);
    else setError(locale === "en" ? "Failed to load roles or permission denied." : "تعذر تحميل الأدوار أو لا تملك صلاحية عرضها.");
    if (permissionsResult.status === "fulfilled")
      setCatalogue(permissionsResult.value);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, [locale]);
  const permissions = useMemo(
    () =>
      catalogue.filter((item) =>
        `${item.nameAr} ${item.nameEn} ${item.key}`
          .toLowerCase()
          .includes(permissionSearch.toLowerCase()),
      ),
    [catalogue, permissionSearch],
  );
  const groupedPermissions = useMemo(
    () => groupPermissions(permissions),
    [permissions],
  );
  function choose(role: Role) {
    setSelected(role);
    setForm(requestFrom(role));
    setSelectedKeys(role.permissionKeys ?? []);
    setMessage("");
    setArchiveReason("");
  }
  function startCreate() {
    setSelected(null);
    setForm(emptyRole());
    setSelectedKeys([]);
    setMessage("");
    setArchiveReason("");
  }
  function updateField<K extends keyof RoleRequest>(
    key: K,
    value: RoleRequest[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function saveRole(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase().replaceAll(" ", "_"),
      };
      const saved = selected
        ? await updateRole(selected.id, payload)
        : await createRole(payload);
      setRoles((current) =>
        selected
          ? current.map((role) => (role.id === saved.id ? saved : role))
          : [saved, ...current],
      );
      choose(saved);
      setMessage(locale === "en" ? "Role details saved successfully." : "تم حفظ بيانات الدور.");
    } catch {
      setMessage(locale === "en" ? "Failed to save role. Please check inputs and permissions." : "تعذر حفظ الدور. راجع الحقول وصلاحياتك.");
    } finally {
      setSaving(false);
    }
  }
  async function savePermissions() {
    if (!selected?.rowVersion) {
      setMessage(
        locale === "en"
          ? "Cannot save permissions because role version is unavailable. Refresh the page."
          : "تعذر حفظ الصلاحيات لأن إصدار الدور غير متاح. حدّث الخدمة الخلفية ثم أعد تحميل الصفحة.",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const saved = await replaceRolePermissions(
        selected.id,
        selectedKeys,
        selected.rowVersion,
      );
      setRoles((current) =>
        current.map((role) => (role.id === saved.id ? saved : role)),
      );
      choose(saved);
      setMessage(locale === "en" ? "Role permissions updated." : "تم استبدال صلاحيات الدور.");
    } catch {
      setMessage(locale === "en" ? "Failed to save permissions. Role may have been modified by another user." : "تعذر حفظ الصلاحيات. ربما تم تعديل الدور من مستخدم آخر.");
    } finally {
      setSaving(false);
    }
  }
  async function removeRole() {
    if (
      !selected?.rowVersion ||
      !(await systemConfirm(locale === "en" ? `Do you want to archive role "${selected.nameEn || selected.nameAr}"?` : `هل تريد أرشفة دور «${selected.nameAr}»؟`, locale === "en" ? "Archive Role" : "أرشفة الدور", true))
    )
      return;
    setSaving(true);
    setMessage("");
    try {
      await archiveRole(selected.id, archiveReason, selected.rowVersion);
      setRoles((current) => current.filter((role) => role.id !== selected.id));
      startCreate();
      setMessage(locale === "en" ? "Role archived successfully." : "تمت أرشفة الدور.");
    } catch {
      setMessage(locale === "en" ? "Failed to archive role." : "تعذر أرشفة الدور.");
    } finally {
      setSaving(false);
    }
  }
  const protectedRole = Boolean(
    selected?.isProtected ||
      ["SYSTEM_ADMIN", "MANAGER", "USER"].includes(selected?.code ?? ""),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">{t("nav.userManagement")}</p>
          <h1 className="mt-1 text-3xl font-black">{t("nav.rolesAndPermissions")}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {locale === "en" ? "Create custom roles and assign associated permissions." : "أنشئ الأدوار المخصصة وحدد الصلاحيات التي تمنحها."}
          </p>
        </div>
        {canManage && (
          <Button onClick={startCreate}>
            <Plus size={17} />
            {t("roles.addRole")}
          </Button>
        )}
      </div>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-blue-500/10 p-3 text-sm font-bold text-[#1167c9]"
        >
          {message}
        </p>
      )}
      {error ? (
        <Card className="p-6">
          <p role="alert" className="text-red-700">
            {error}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit p-3">
            <h2 className="px-2 pb-3 font-black">{locale === "en" ? "Role List" : "قائمة الأدوار"}</h2>
            {loading ? (
              <p className="px-2 py-5 text-sm text-[var(--muted)]">
                {t("common.loading")}
              </p>
            ) : (
              <div className="space-y-1">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => choose(role)}
                    className={`w-full rounded-xl p-3 text-right transition-colors ${selected?.id === role.id ? "bg-blue-50 text-[#1167c9]" : "hover:bg-slate-50"}`}
                  >
                    <span className="flex items-center justify-between gap-2 font-bold">
                      <span>{locale === "en" ? role.nameEn || role.nameAr : role.nameAr}</span>
                      {selected?.id === role.id && <Check size={16} />}
                    </span>
                    <span
                      className="mt-1 block text-xs text-[var(--muted)]"
                      dir="ltr"
                    >
                      {role.code}
                    </span>
                  </button>
                ))}
                {!roles.length && (
                  <p className="px-2 py-5 text-sm text-[var(--muted)]">
                    {locale === "en" ? "No roles found." : "لا توجد أدوار."}
                  </p>
                )}
              </div>
            )}
          </Card>
          <div className="space-y-6">
            <Card className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  {selected ? <Edit3 size={19} /> : <Plus size={19} />}
                  {selected ? (locale === "en" ? "Edit Role" : "تعديل الدور") : t("roles.addRole")}
                </h2>
                {protectedRole && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                    {locale === "en" ? "Protected Role" : "دور محمي"}
                  </span>
                )}
              </div>
              {protectedRole ? (
                <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-900">
                  {locale === "en" ? "Protected roles cannot be modified or archived. You may inspect permissions below." : "لا يمكن تعديل أو أرشفة الأدوار المحمية. يمكنك مراجعة صلاحياتها أدناه."}
                </p>
              ) : (
                <form
                  onSubmit={saveRole}
                  className="mt-5 grid gap-4 sm:grid-cols-2"
                >
                  <Input
                    label={t("roles.code")}
                    required
                    value={form.code}
                    onChange={(event) =>
                      updateField("code", event.target.value)
                    }
                    placeholder="HR_OFFICER"
                    dir="ltr"
                  />
                  <Input
                    label={locale === "en" ? "Arabic Role Name" : "اسم الدور بالعربية"}
                    required
                    value={form.nameAr}
                    onChange={(event) =>
                      updateField("nameAr", event.target.value)
                    }
                  />
                  <Input
                    label={locale === "en" ? "English Role Name" : "اسم الدور بالإنجليزية"}
                    required
                    value={form.nameEn}
                    onChange={(event) =>
                      updateField("nameEn", event.target.value)
                    }
                    dir="ltr"
                  />
                  <label className="grid gap-2 text-sm font-bold">
                    {t("common.status")}
                    <select
                      required
                      value={form.status}
                      onChange={(event) =>
                        updateField("status", event.target.value)
                      }
                      className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
                    >
                      <option value="Active">{t("common.active")}</option>
                      <option value="Inactive">{t("common.inactive")}</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                    {locale === "en" ? "Arabic Description" : "الوصف بالعربية"}
                    <textarea
                      value={form.descriptionAr}
                      onChange={(event) =>
                        updateField("descriptionAr", event.target.value)
                      }
                      className="min-h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-normal"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                    {locale === "en" ? "English Description" : "الوصف بالإنجليزية"}
                    <textarea
                      value={form.descriptionEn}
                      onChange={(event) =>
                        updateField("descriptionEn", event.target.value)
                      }
                      dir="ltr"
                      className="min-h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 font-normal"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <Button type="submit" loading={saving}>
                      <Save size={16} />
                      {t("common.save")}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
            {selected && (
              <Card className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-black">
                      <ShieldCheck size={19} />
                      {locale === "en" ? "Role Permissions" : "صلاحيات الدور"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {locale === "en"
                        ? `Saving replaces all permissions for this role (${selectedKeys.length} selected).`
                        : `الحفظ يستبدل جميع صلاحيات هذا الدور (${selectedKeys.length} محددة).`}
                    </p>
                  </div>
                  {canManage && !protectedRole && (
                    <Button
                      loading={saving}
                      onClick={() => void savePermissions()}
                    >
                      <Save size={16} />
                      {locale === "en" ? "Save Permissions" : "حفظ الصلاحيات"}
                    </Button>
                  )}
                </div>
                {!catalogue.length ? (
                  <p className="mt-5 rounded-xl bg-slate-500/10 p-3 text-sm text-[var(--muted)]">
                    {locale === "en"
                      ? "Unable to load permission catalog. Requires permission to view permissions."
                      : "تعذر تحميل دليل الصلاحيات. تحتاج إلى صلاحية عرض الصلاحيات لتعديلها."}
                  </p>
                ) : (
                  <>
                    <label className="relative mt-5 block">
                      <span className="sr-only">{locale === "en" ? "Search permissions" : "البحث في الصلاحيات"}</span>
                      <Search
                        className={`pointer-events-none absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"}`}
                        size={18}
                      />
                      <input
                        value={permissionSearch}
                        onChange={(event) =>
                          setPermissionSearch(event.target.value)
                        }
                        placeholder={locale === "en" ? "Search by permission name" : "ابحث باسم صلاحية"}
                        className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
                      />
                    </label>
                    <div className="mt-4 max-h-[520px] space-y-5 overflow-y-auto pr-1">
                      {groupedPermissions.map(([group, items]) => (
                        <section key={group}>
                          <h3 className={`mb-2 pr-2 text-sm font-black text-[#1167c9] ${locale === "en" ? "border-l-2 pl-2" : "border-r-2 pr-2"}`}>
                            {permissionGroupLabel(group, locale)}
                          </h3>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {items.map((item) => {
                              const checked = selectedKeys.includes(item.key);
                              return (
                                <label
                                  key={item.key}
                                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? "border-blue-200 bg-blue-50/70" : "border-[var(--border)]"}`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!canManage || protectedRole}
                                    checked={checked}
                                    onChange={() =>
                                      setSelectedKeys((current) =>
                                        checked
                                          ? current.filter(
                                              (key) => key !== item.key,
                                            )
                                          : [...current, item.key],
                                      )
                                    }
                                    className="mt-1"
                                  />
                                  <span>
                                    <b className="text-sm">
                                      {locale === "en" ? item.nameEn || permissionLabel(item.key, locale) : item.nameAr || permissionLabel(item.key, locale)}
                                    </b>
                                    <small className="mt-1 block text-xs text-[var(--muted)]">
                                      {locale === "en" ? item.descriptionEn || item.descriptionAr : item.descriptionAr}
                                    </small>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )}
            {selected && canManage && !protectedRole && (
              <Card className="border-red-200 p-5">
                <h2 className="flex items-center gap-2 font-black text-red-700">
                  <Archive size={18} />
                  {locale === "en" ? "Archive Role" : "أرشفة الدور"}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {locale === "en" ? "Archival cannot be undone from this page." : "لا يمكن استرجاع الأرشفة من هذه الصفحة."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <input
                    value={archiveReason}
                    onChange={(event) => setArchiveReason(event.target.value)}
                    placeholder={locale === "en" ? "Archival reason" : "سبب الأرشفة"}
                    className="h-11 min-w-56 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  />
                  <Button
                    variant="danger"
                    loading={saving}
                    onClick={() => void removeRole()}
                  >
                    <Archive size={16} />
                    {locale === "en" ? "Archive Role" : "أرشفة الدور"}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
