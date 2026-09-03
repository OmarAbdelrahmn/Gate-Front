"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Search, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getUserAuthorization } from "../../lib/auth/authorization-api";
import { permissionLabel } from "../../lib/permission-labels";
import {
  groupPermissions,
  permissionGroup,
  permissionGroupLabel,
} from "../../lib/permission-groups";
import { translate } from "../../lib/i18n";
import {
  getPermissionCatalogue,
  listRoles,
  replaceUserPermissions,
  replaceUserRoles,
} from "../../lib/users/api";
import type {
  ManagedDirectPermissionAssignmentRequest,
  ManagedRoleAssignmentRequest,
  PermissionCatalogItem,
  Role,
} from "../../lib/users/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { toast } from "../ui/Toast";

type ExistingRole = ManagedRoleAssignmentRequest & { roleId: string };
type ExistingPermission = ManagedDirectPermissionAssignmentRequest;
const roleRequest = (roleId: string): ManagedRoleAssignmentRequest => ({
  roleId,
  startsAtUtc: null,
  expiresAtUtc: null,
  reason: null,
  isAllHousingScope: false,
  isAllClientScope: false,
  includesFuturePlatformContracts: false,
  scopes: [],
});
const permissionRequest = (
  permissionKey: string,
): ManagedDirectPermissionAssignmentRequest => ({
  permissionKey,
  effect: "Grant",
  startsAtUtc: null,
  expiresAtUtc: null,
  reason: null,
  isAllHousingScope: false,
  isAllClientScope: false,
  includesFuturePlatformContracts: false,
  scopes: [],
});

export function AuthorizationEditor({ userId }: { userId: string }) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [assignRoles, setAssignRoles] = useState<ExistingRole[]>([]);
  const [assignPermissions, setAssignPermissions] = useState<
    ExistingPermission[]
  >([]);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedPermissionGroup, setSelectedPermissionGroup] =
    useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const canManageRoles = can("roles.manage");
  const canManagePermissions = can("permissions.manage");

  useEffect(() => {
    if (!canManageRoles && !canManagePermissions) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [auth, allRoles, allPermissions] = await Promise.all([
          getUserAuthorization(userId),
          listRoles(),
          getPermissionCatalogue(),
        ]);
        const raw = auth as {
          roles?: ExistingRole[];
          directPermissions?: ExistingPermission[];
        };
        setAssignRoles(raw.roles ?? []);
        setAssignPermissions(raw.directPermissions ?? []);
        setRoles(allRoles);
        setCatalog(allPermissions);
      } catch {
        setMessage(
          locale === "en"
            ? "Failed to load permission editor."
            : "تعذر تحميل محرر الصلاحيات.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [canManagePermissions, canManageRoles, userId, locale]);

  const groupedPermissionsCatalog = useMemo(() => {
    const searchLower = permissionSearch.toLowerCase().trim();
    const items = catalog.filter((item) => {
      const matchesSearch =
        !searchLower ||
        `${item.nameAr} ${item.nameEn} ${item.key} ${item.module}`
          .toLowerCase()
          .includes(searchLower);
      const matchesGroup =
        selectedPermissionGroup === "all" ||
        permissionGroup(item.key) === selectedPermissionGroup;
      return matchesSearch && matchesGroup;
    });
    return groupPermissions(items);
  }, [catalog, permissionSearch, selectedPermissionGroup]);

  const togglePermissionKey = (key: string) => {
    setAssignPermissions((prev) => {
      const exists = prev.some((item) => item.permissionKey === key);
      if (exists) {
        return prev.filter((item) => item.permissionKey !== key);
      } else {
        return [...prev, permissionRequest(key)];
      }
    });
  };

  const togglePermissionGroupKeys = (groupItems: PermissionCatalogItem[]) => {
    const groupKeys = groupItems.map((item) => item.key);
    const allSelected = groupKeys.every((key) =>
      assignPermissions.some((item) => item.permissionKey === key),
    );
    if (allSelected) {
      setAssignPermissions((prev) =>
        prev.filter((item) => !groupKeys.includes(item.permissionKey)),
      );
    } else {
      setAssignPermissions((prev) => {
        const existingKeys = new Set(prev.map((item) => item.permissionKey));
        const newItems = groupKeys
          .filter((key) => !existingKeys.has(key))
          .map((key) => permissionRequest(key));
        return [...prev, ...newItems];
      });
    }
  };

  const clearAllPermissions = () => {
    setAssignPermissions([]);
  };

  const toggleEffect = (key: string) => {
    setAssignPermissions((prev) =>
      prev.map((item) =>
        item.permissionKey === key
          ? { ...item, effect: item.effect === "Grant" ? "Deny" : "Grant" }
          : item,
      ),
    );
  };

  async function saveRoles() {
    setSaving(true);
    setMessage("");
    try {
      await replaceUserRoles(userId, assignRoles);
      const msg =
        locale === "en"
          ? "Roles saved and user authorization updated."
          : "تم حفظ الأدوار وتحديث صلاحيات المستخدم.";
      setMessage(msg);
      toast.success(
        locale === "en" ? "Roles Updated" : "تم تحديث الأدوار",
        msg,
      );
    } catch (err: any) {
      const msg =
        err?.message ||
        (locale === "en" ? "Failed to save roles." : "تعذر حفظ الأدوار.");
      setMessage(msg);
      toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions() {
    setSaving(true);
    setMessage("");
    try {
      await replaceUserPermissions(userId, assignPermissions);
      const msg =
        locale === "en"
          ? "Direct permissions saved and user authorization updated."
          : "تم حفظ الصلاحيات المباشرة وتحديث صلاحيات المستخدم.";
      setMessage(msg);
      toast.success(
        locale === "en" ? "Permissions Updated" : "تم تحديث الصلاحيات",
        msg,
      );
    } catch (err: any) {
      const msg =
        err?.message ||
        (locale === "en"
          ? "Failed to save direct permissions."
          : "تعذر حفظ الصلاحيات المباشرة.");
      setMessage(msg);
      toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setSaving(false);
    }
  }

  if (!canManageRoles && !canManagePermissions) return null;
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-[#1167c9]" />
        <h2 className="text-lg font-black">
          {locale === "en"
            ? "Edit Roles & Permissions"
            : "تعديل الأدوار والصلاحيات"}
        </h2>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {locale === "en"
          ? "Saving replaces the current assignments list. Keep required roles or permissions before saving."
          : "الحفظ يستبدل قائمة التعيينات الحالية. حافظ على الأدوار أو الصلاحيات المطلوبة قبل الحفظ."}
      </p>
      {message && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-blue-500/10 p-3 text-sm font-bold text-[#1167c9]"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p className="mt-5 text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Loading permission options..."
            : "جارٍ تحميل خيارات الصلاحيات…"}
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {canManageRoles && (
            <section className="rounded-xl border border-[var(--border)] p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-black text-base">
                    {locale === "en" ? "Assigned Roles" : "الأدوار المعيّنة"}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {locale === "en"
                      ? "Select roles to assign to this user."
                      : "حدد الأدوار المراد تعيينها لهذا المستخدم."}
                  </p>
                </div>
                <Button
                  loading={saving}
                  onClick={() => void saveRoles()}
                >
                  <Save size={16} />
                  {locale === "en" ? "Save Roles" : "حفظ الأدوار"}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roles
                  .filter((role) => role.status === "Active")
                  .map((role) => {
                    const selected = assignRoles.some(
                      (item) => item.roleId === role.id,
                    );
                    const roleName =
                      locale === "en"
                        ? role.nameEn || role.nameAr
                        : role.nameAr;
                    const roleDesc =
                      locale === "en"
                        ? role.descriptionEn || role.descriptionAr
                        : role.descriptionAr;
                    return (
                      <label
                        key={role.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                          selected
                            ? "border-[#1167c9] bg-blue-50/60 dark:bg-blue-950/30 font-bold"
                            : "border-[var(--border)] hover:bg-slate-500/5"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setAssignRoles((current) =>
                              selected
                                ? current.filter(
                                    (item) => item.roleId !== role.id,
                                  )
                                : [...current, roleRequest(role.id)],
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <b className="text-sm">{roleName}</b>
                            <span
                              className="font-mono text-xs text-[var(--muted)] shrink-0"
                              dir="ltr"
                            >
                              {role.code}
                            </span>
                          </div>
                          {roleDesc && (
                            <p className="mt-1 text-xs text-[var(--muted)] font-normal line-clamp-2">
                              {roleDesc}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </section>
          )}

          {canManagePermissions && (
            <section className="rounded-xl border border-[var(--border)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="font-black text-base">
                    {locale === "en"
                      ? "Direct Permissions"
                      : "الصلاحيات المباشرة"}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {locale === "en"
                      ? "Check the permissions you wish to grant directly to this user."
                      : "حدد الصلاحيات التي ترغب بمنحها مباشرة لهذا المستخدم."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-[#1167c9]">
                    {assignPermissions.length}{" "}
                    {locale === "en" ? "selected" : "محددة"}
                  </span>
                  <Button loading={saving} onClick={() => void savePermissions()}>
                    <Save size={16} />
                    {locale === "en" ? "Save Permissions" : "حفظ الصلاحيات"}
                  </Button>
                </div>
              </div>

              {/* Selected Permissions Summary Badges */}
              {assignPermissions.length > 0 && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1167c9]">
                      {locale === "en"
                        ? "Selected Direct Permissions"
                        : "الصلاحيات المباشرة المحددة"}{" "}
                      ({assignPermissions.length}):
                    </span>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      {locale === "en" ? "Clear all selected" : "إلغاء تحديد الكل"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {assignPermissions.map((assigned) => {
                      const key = assigned.permissionKey;
                      const item = catalog.find((p) => p.key === key);
                      const label = item
                        ? locale === "en"
                          ? item.nameEn || item.nameAr
                          : item.nameAr
                        : permissionLabel(key, locale);
                      const isDeny = assigned.effect === "Deny";
                      return (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-sm ${
                            isDeny
                              ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
                              : "border-blue-200 bg-white text-[#1167c9] dark:bg-slate-900 dark:border-blue-800"
                          }`}
                        >
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={() => toggleEffect(key)}
                            title={
                              locale === "en"
                                ? "Toggle Effect (Grant/Deny)"
                                : "تبديل القاعدة (مسموح/منع)"
                            }
                            className={`rounded px-1 text-[10px] uppercase font-mono ${
                              isDeny
                                ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}
                          >
                            {assigned.effect === "Deny"
                              ? locale === "en"
                                ? "Deny"
                                : "منع"
                              : locale === "en"
                                ? "Grant"
                                : "مسموح"}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePermissionKey(key)}
                            className="rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search & Category Filter Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search
                    size={16}
                    className="absolute right-3 top-3 text-[var(--muted)]"
                  />
                  <input
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    placeholder={
                      locale === "en"
                        ? "Search permissions by name or key..."
                        : "ابحث عن صلاحية باسمها أو الرمز…"
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-3 pr-9 text-xs"
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedPermissionGroup("all")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      selectedPermissionGroup === "all"
                        ? "bg-[#1167c9] text-white"
                        : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-blue-500/10"
                    }`}
                  >
                    {locale === "en" ? "All" : "الكل"}
                  </button>
                  {[
                    "Security",
                    "Workforce",
                    "Compliance",
                    "Fleet",
                    "Workflows",
                    "Operations",
                  ].map((grp) => (
                    <button
                      type="button"
                      key={grp}
                      onClick={() => setSelectedPermissionGroup(grp)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        selectedPermissionGroup === grp
                          ? "bg-[#1167c9] text-white"
                          : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-blue-500/10"
                      }`}
                    >
                      {permissionGroupLabel(grp as any, locale)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grouped Catalog Grid with Checkboxes */}
              <div className="max-h-[500px] overflow-y-auto space-y-5 pr-1">
                {groupedPermissionsCatalog.map(([group, items]) => {
                  const isAllGroupSelected =
                    items.length > 0 &&
                    items.every((item) =>
                      assignPermissions.some(
                        (p) => p.permissionKey === item.key,
                      ),
                    );
                  return (
                    <div key={group} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                        <h4 className="border-r-2 border-[#1167c9] pr-2 text-xs font-black text-[#1167c9]">
                          {permissionGroupLabel(group, locale)} ({items.length})
                        </h4>
                        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-[#1167c9] hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isAllGroupSelected}
                            onChange={() =>
                              togglePermissionGroupKeys(
                                items as PermissionCatalogItem[],
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-blue-400 text-[#1167c9] focus:ring-[#1167c9]"
                          />
                          <span>
                            {isAllGroupSelected
                              ? locale === "en"
                                ? "Deselect All"
                                : "إلغاء تحديد الكل"
                              : locale === "en"
                                ? "Select All"
                                : "تحديد الكل"}
                          </span>
                        </label>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => {
                          const assigned = assignPermissions.find(
                            (p) => p.permissionKey === item.key,
                          );
                          const isSelected = Boolean(assigned);
                          const isDeny = assigned?.effect === "Deny";
                          return (
                            <div
                              key={item.key}
                              className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                                isSelected
                                  ? isDeny
                                    ? "border-red-300 bg-red-50/60 dark:bg-red-950/30 font-bold"
                                    : "border-[#1167c9] bg-blue-50/60 dark:bg-blue-950/30 font-bold"
                                  : "border-[var(--border)] hover:bg-slate-500/5"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermissionKey(item.key)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    onClick={() => togglePermissionKey(item.key)}
                                    className="cursor-pointer text-xs leading-5"
                                  >
                                    {locale === "en"
                                      ? item.nameEn || item.nameAr
                                      : item.nameAr}
                                  </span>
                                  {isSelected && (
                                    <button
                                      type="button"
                                      onClick={() => toggleEffect(item.key)}
                                      title={
                                        locale === "en"
                                          ? "Toggle Effect (Grant/Deny)"
                                          : "تبديل القاعدة (مسموح/منع)"
                                      }
                                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        isDeny
                                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                      }`}
                                    >
                                      {isDeny
                                        ? locale === "en"
                                          ? "Deny"
                                          : "منع"
                                        : locale === "en"
                                          ? "Grant"
                                          : "مسموح"}
                                    </button>
                                  )}
                                </div>
                                <span
                                  onClick={() => togglePermissionKey(item.key)}
                                  className="block cursor-pointer font-mono text-[10px] text-[var(--muted)] truncate"
                                  dir="ltr"
                                >
                                  {item.key}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {groupedPermissionsCatalog.length === 0 && (
                  <p className="py-8 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                    {locale === "en"
                      ? "No matching permissions found."
                      : "لا توجد صلاحيات مطابقة."}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}

