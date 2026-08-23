"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Save, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getUserAuthorization } from "../../lib/auth/authorization-api";
import { permissionLabel } from "../../lib/permission-labels";
import {
  groupPermissions,
  permissionGroupLabel,
} from "../../lib/permission-groups";
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
  const { can } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [assignRoles, setAssignRoles] = useState<ExistingRole[]>([]);
  const [assignPermissions, setAssignPermissions] = useState<
    ExistingPermission[]
  >([]);
  const [search, setSearch] = useState("");
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
        setMessage("تعذر تحميل محرر الصلاحيات.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [canManagePermissions, canManageRoles, userId]);
  const matches = useMemo(
    () =>
      catalog
        .filter(
          (item) =>
            !assignPermissions.some(
              (selected) => selected.permissionKey === item.key,
            ) &&
            `${item.nameAr} ${item.key}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .slice(0, 12),
    [assignPermissions, catalog, search],
  );
  const groupedMatches = useMemo(() => groupPermissions(matches), [matches]);
  const groupedAssignments = useMemo(
    () =>
      groupPermissions(
        assignPermissions.map((item) => ({ ...item, key: item.permissionKey })),
      ),
    [assignPermissions],
  );
  async function saveRoles() {
    setSaving(true);
    setMessage("");
    try {
      await replaceUserRoles(userId, assignRoles);
      setMessage("تم حفظ الأدوار وتحديث صلاحيات المستخدم.");
    } catch {
      setMessage("تعذر حفظ الأدوار.");
    } finally {
      setSaving(false);
    }
  }
  async function savePermissions() {
    setSaving(true);
    setMessage("");
    try {
      await replaceUserPermissions(userId, assignPermissions);
      setMessage("تم حفظ الصلاحيات المباشرة وتحديث صلاحيات المستخدم.");
    } catch {
      setMessage("تعذر حفظ الصلاحيات المباشرة.");
    } finally {
      setSaving(false);
    }
  }
  if (!canManageRoles && !canManagePermissions) return null;
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-[#1167c9]" />
        <h2 className="text-lg font-black">تعديل الأدوار والصلاحيات</h2>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        الحفظ يستبدل قائمة التعيينات الحالية. حافظ على الأدوار أو الصلاحيات
        المطلوبة قبل الحفظ.
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
          جارٍ تحميل خيارات الصلاحيات…
        </p>
      ) : (
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          {canManageRoles && (
            <section className="rounded-xl border border-[var(--border)] p-4">
              <h3 className="font-black">الأدوار</h3>
              <div className="mt-3 space-y-2">
                {roles
                  .filter((role) => role.status === "Active")
                  .map((role) => {
                    const selected = assignRoles.some(
                      (item) => item.roleId === role.id,
                    );
                    return (
                      <label
                        key={role.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3 hover:bg-blue-500/5"
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
                        />
                        <span>
                          <b>{role.nameAr}</b>
                          <small className="mr-2 text-[var(--muted)]" dir="ltr">
                            {role.code}
                          </small>
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {role.descriptionAr}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>
              <Button
                className="mt-4"
                loading={saving}
                onClick={() => void saveRoles()}
              >
                <Save size={16} />
                حفظ الأدوار
              </Button>
            </section>
          )}
          {canManagePermissions && (
            <section className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black">الصلاحيات المباشرة</h3>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-[#1167c9]">
                  {assignPermissions.length} محددة
                </span>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث لإضافة صلاحية"
                className="mt-3 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              />
              {search && (
                <div className="mt-2 max-h-44 space-y-3 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                  {groupedMatches.map(([group, items]) => (
                    <section key={group}>
                      <h4 className="px-2 py-1 text-xs font-black text-[#1167c9]">
                        {permissionGroupLabel(group)}
                      </h4>
                      {items.map((item) => (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => {
                            setAssignPermissions((current) => [
                              ...current,
                              permissionRequest(item.key),
                            ]);
                            setSearch("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg p-2.5 text-right text-sm font-bold hover:bg-blue-500/10"
                        >
                          <span>{item.nameAr}</span>
                          <Plus size={16} />
                        </button>
                      ))}
                    </section>
                  ))}
                  {!matches.length && (
                    <p className="p-3 text-sm text-[var(--muted)]">
                      لا توجد صلاحيات مطابقة أو أنها مضافة بالفعل.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4 max-h-[440px] space-y-5 overflow-y-auto pr-1">
                {groupedAssignments.map(([group, items]) => (
                  <section key={group}>
                    <h4 className="mb-2 border-r-2 border-[#1167c9] pr-2 text-sm font-black text-[#1167c9]">
                      {permissionGroupLabel(group)}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((item) => (
                        <div
                          key={item.permissionKey}
                          className={`min-h-28 rounded-xl border p-3 ${item.effect === "Deny" ? "border-red-200 bg-red-50/60" : "border-emerald-200 bg-emerald-50/60"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-black leading-6">
                              {permissionLabel(item.permissionKey)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setAssignPermissions((current) =>
                                  current.filter(
                                    (row) =>
                                      row.permissionKey !== item.permissionKey,
                                  ),
                                )
                              }
                              aria-label={`حذف صلاحية ${permissionLabel(item.permissionKey)}`}
                              title="حذف الصلاحية"
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-100"
                            >
                              <X size={17} />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--muted)]">
                              القاعدة
                            </span>
                            <select
                              value={item.effect}
                              onChange={(e) =>
                                setAssignPermissions((current) =>
                                  current.map((row) =>
                                    row.permissionKey === item.permissionKey
                                      ? {
                                          ...row,
                                          effect: e.target.value as
                                            | "Grant"
                                            | "Deny",
                                        }
                                      : row,
                                  ),
                                )
                              }
                              className={`h-8 rounded-lg border px-2 text-xs font-bold ${item.effect === "Deny" ? "border-red-200 bg-red-100 text-red-700" : "border-emerald-200 bg-emerald-100 text-emerald-700"}`}
                            >
                              <option value="Grant">مسموح</option>
                              <option value="Deny">منع</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              {!assignPermissions.length && (
                <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
                  لم تتم إضافة أي صلاحية مباشرة.
                </p>
              )}
              <Button
                className="mt-4"
                loading={saving}
                onClick={() => void savePermissions()}
              >
                <Save size={16} />
                حفظ الصلاحيات
              </Button>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}
