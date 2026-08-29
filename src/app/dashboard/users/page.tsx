"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  Plus,
  Search,
  RefreshCw,
  UsersRound,
  ShieldCheck,
  X,
  User,
  Shield,
  Check,
} from "lucide-react";
import { extractErrorMessageFromBody } from "../../../lib/auth/api";
import { useAuth } from "../../../lib/auth/AuthProvider";
import {
  createUser,
  getPermissionCatalogue,
  listRoles,
  listUsers,
} from "../../../lib/users/api";
import type {
  AuthorizationScopeRequest,
  CreateManagedUserRequest,
  ManagedUser,
  PermissionCatalogItem,
  Role,
} from "../../../lib/users/types";
import { listEmployees } from "../../../lib/workforce/api";
import type { Employee } from "../../../lib/workforce/types";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { SearchableSelect } from "../../../components/ui/SearchableSelect";
import { Table } from "../../../components/ui/Table";
import { toast } from "../../../components/ui/Toast";
import { groupPermissions, permissionGroup, permissionGroupLabel } from "../../../lib/permission-groups";
import { permissionLabel } from "../../../lib/permission-labels";
import { translate } from "../../../lib/i18n";

const emptyForm = {
  userName: "",
  initialPassword: "",
  displayNameAr: "",
  displayNameEn: "",
  email: "",
  phoneNumber: "",
  employeeId: null as string | null,
};

type SelectedRoleState = {
  roleId: string;
  startsAtUtc: string;
  expiresAtUtc: string;
  reason: string;
  isAllHousingScope: boolean;
  isAllClientScope: boolean;
  includesFuturePlatformContracts: boolean;
  scopes: AuthorizationScopeRequest[];
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  Active: { ar: "نشط", en: "Active" },
  PendingTemporaryPassword: { ar: "بانتظار تغيير كلمة المرور", en: "Pending Temp Password" },
  Locked: { ar: "مقفل", en: "Locked" },
  Suspended: { ar: "موقوف", en: "Suspended" },
  Archived: { ar: "مؤرشف", en: "Archived" },
};

function formatDate(value: string | null, locale: "ar" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : "ar-SA-u-nu-arab",
    { dateStyle: "medium", timeStyle: "short" },
  ).format(new Date(value));
}

export default function UsersPage() {
  const { can, isLoading, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "roles" | "permissions">("basic");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Authorization catalog prerequisites
  const [rolesCatalog, setRolesCatalog] = useState<Role[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionCatalogItem[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  // Permission selection state
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedPermissionGroup, setSelectedPermissionGroup] = useState<string>("all");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);

  // Roles selection state
  const [selectedRoles, setSelectedRoles] = useState<SelectedRoleState[]>([]);

  const canRead = can("users.read");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersData, employeesData] = await Promise.all([
        listUsers(search),
        listEmployees().catch(() => [] as Employee[]),
      ]);
      setUsers(usersData);
      setEmployees(employeesData);
    } catch {
      setError(
        locale === "en"
          ? "Failed to load users. Verify API connection and permissions."
          : "تعذر تحميل المستخدمين. تأكد من اتصال واجهة API وصلاحياتك.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, locale]);

  useEffect(() => {
    if (isLoading || !canRead) return;
    const timer = window.setTimeout(() => void load(), 350);
    return () => window.clearTimeout(timer);
  }, [isLoading, canRead, load]);

  const loadCatalogs = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      const [rolesData, permsData] = await Promise.allSettled([
        can("roles.read") || can("roles.manage") ? listRoles() : Promise.resolve([] as Role[]),
        can("permissions.read") || can("permissions.manage")
          ? getPermissionCatalogue()
          : Promise.resolve([] as PermissionCatalogItem[]),
      ]);
      if (rolesData.status === "fulfilled") {
        setRolesCatalog(rolesData.value.filter((r) => r.status === "Active"));
      }
      if (permsData.status === "fulfilled") {
        setPermissionsCatalog(permsData.value);
      }
    } catch (err) {
      console.error("Failed to load permission/role catalogs", err);
    } finally {
      setCatalogsLoading(false);
    }
  }, [can]);

  const handleOpenCreateForm = () => {
    const nextShow = !showForm;
    setShowForm(nextShow);
    if (nextShow) {
      setFormError("");
      setActiveTab("basic");
      void loadCatalogs();
    }
  };

  const employeeOptions = useMemo(() => {
    return [
      {
        value: "",
        label:
          locale === "en"
            ? "None (No linked employee)"
            : "بدون (غير مرتبط بموظف)",
      },
      ...employees.map((emp) => ({
        value: emp.id,
        label:
          locale === "en" && emp.fullNameEn
            ? emp.fullNameEn
            : emp.fullNameAr,
        sublabel: emp.employeeNumber
          ? `رقم: ${emp.employeeNumber}`
          : emp.iqamaNo
            ? `هوية: ${emp.iqamaNo}`
            : emp.primaryPhone || "",
      })),
    ];
  }, [employees, locale]);

  const handleEmployeeChange = (employeeId: string) => {
    const selected = employees.find((e) => e.id === employeeId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        employeeId: selected.id,
        displayNameAr: selected.fullNameAr || prev.displayNameAr,
        displayNameEn: selected.fullNameEn || prev.displayNameEn,
        email: selected.email || prev.email,
        phoneNumber: selected.primaryPhone || prev.phoneNumber,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        employeeId: null,
      }));
    }
  };

  // Role toggle
  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoles((current) => {
      const exists = current.some((r) => r.roleId === roleId);
      if (exists) {
        return current.filter((r) => r.roleId !== roleId);
      } else {
        return [
          ...current,
          {
            roleId,
            startsAtUtc: "",
            expiresAtUtc: "",
            reason: "",
            isAllHousingScope: false,
            isAllClientScope: false,
            includesFuturePlatformContracts: false,
            scopes: [],
          },
        ];
      }
    });
  };

  // Direct Permission toggle
  const togglePermissionKey = (key: string) => {
    setSelectedPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Direct Permission group toggle (Select / Deselect All in group)
  const togglePermissionGroupKeys = (groupItems: PermissionCatalogItem[]) => {
    const groupKeys = groupItems.map((item) => item.key);
    const allSelected = groupKeys.every((key) => selectedPermissionKeys.includes(key));
    if (allSelected) {
      setSelectedPermissionKeys((prev) => prev.filter((key) => !groupKeys.includes(key)));
    } else {
      setSelectedPermissionKeys((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };


  // Grouped Permissions catalog for UI
  const groupedPermissionsCatalog = useMemo(() => {
    const searchLower = permissionSearch.toLowerCase().trim();
    const items = permissionsCatalog.filter((item) => {
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
  }, [permissionsCatalog, permissionSearch, selectedPermissionGroup]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);

    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phoneNumber.trim();
    const trimmedNameEn = form.displayNameEn.trim();

    if (trimmedEmail && !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setFormError(
        locale === "en"
          ? "Please enter a valid email address."
          : "يرجى إدخال بريد إلكتروني صالح.",
      );
      setSubmitting(false);
      return;
    }

    const uniquePermissionKeys = Array.from(new Set(selectedPermissionKeys));

    const payload: CreateManagedUserRequest = {
      userName: form.userName.trim(),
      initialPassword: form.initialPassword,
      displayNameAr: form.displayNameAr.trim(),
      displayNameEn: trimmedNameEn || (null as any),
      email: trimmedEmail || (null as any),
      phoneNumber: trimmedPhone || (null as any),
      employeeId: form.employeeId || null,
      roleAssignments:
        selectedRoles.length > 0
          ? selectedRoles.map((r) => {
              const starts = r.startsAtUtc ? new Date(r.startsAtUtc).toISOString() : null;
              const expires = r.expiresAtUtc ? new Date(r.expiresAtUtc).toISOString() : null;
              return {
                roleId: r.roleId,
                startsAtUtc: expires && !starts ? new Date().toISOString() : starts,
                expiresAtUtc: expires,
                reason: r.reason.trim() || null,
                isAllHousingScope: r.isAllHousingScope,
                isAllClientScope: r.isAllClientScope,
                includesFuturePlatformContracts: r.includesFuturePlatformContracts,
                scopes: r.scopes || [],
              };
            })
          : null as any,
      directPermissionAssignments:
        uniquePermissionKeys.length > 0
          ? uniquePermissionKeys.map((key) => ({
              permissionKey: key,
              effect: "Grant" as const,
              startsAtUtc: null,
              expiresAtUtc: null,
              reason: null,
              isAllHousingScope: false,
              isAllClientScope: false,
              includesFuturePlatformContracts: false,
              scopes: [],
            }))
          : [],
    };

    try {
      const created = await createUser(payload);
      setUsers((current) => [created, ...current]);
      setForm(emptyForm);
      setSelectedRoles([]);
      setSelectedPermissionKeys([]);
      setShowForm(false);
      toast.success(
        locale === "en" ? "User Created" : "تم إنشاء المستخدم",
        locale === "en"
          ? `User ${created.userName} created successfully.`
          : `تم إنشاء حساب ${created.userName} بنجاح.`,
      );
    } catch (err: any) {
      console.error("[CREATE USER API ERROR]:", err);
      console.error("[CREATE USER FULL BACKEND ERROR DETAILS]:", err?.details || err);
      const backendDetail = extractErrorMessageFromBody(err?.details) || err?.message;
      const msg =
        backendDetail ||
        (locale === "en"
          ? "Failed to create user. Review input and permissions."
          : "تعذر إنشاء المستخدم. راجع البيانات والصلاحيات.");
      setFormError(msg);
      toast.error(locale === "en" ? "Create Failed" : "فشل إنشاء المستخدم", msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoading && !canRead)
    return (
      <Card className="p-8">
        <h1 className="text-xl font-black">{t("authorization.notAuthorized")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {locale === "en"
            ? "You need users.read permission to view user management."
            : "تحتاج إلى صلاحية users.read لعرض إدارة المستخدمين."}
        </p>
      </Card>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">{t("nav.userManagement")}</p>
          <h1 className="mt-1 text-3xl font-black">{t("users.title")}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {locale === "en"
              ? "Create accounts with initial roles, permissions, and access status."
              : "إنشاء الحسابات وتعيين الأدوار والصلاحيات الأولية وإدارة حالة الوصول."}
          </p>
        </div>
        {can("users.create") && (
          <Button onClick={handleOpenCreateForm}>
            <Plus size={17} />
            {t("users.newUser")}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-5 sm:p-7 border-2 border-[#1167c9]/20 shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black">
                <User size={22} className="text-[#1167c9]" />
                {locale === "en" ? "Create New User Account" : "إنشاء حساب مستخدم جديد"}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {locale === "en"
                  ? "Configure identity details, assigned roles, and direct permission overrides."
                  : "إعداد بيانات الهوية، الأدوار المخصصة، والصلاحيات المباشرة."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Tabs */}
          <div className="mt-5 flex gap-2 border-b border-[var(--border)] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                activeTab === "basic"
                  ? "bg-[#1167c9] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:bg-blue-500/10"
              }`}
            >
              <User size={17} />
              {locale === "en" ? "Account Details" : "بيانات الحساب"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                activeTab === "roles"
                  ? "bg-[#1167c9] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:bg-blue-500/10"
              }`}
            >
              <Shield size={17} />
              {locale === "en" ? "Roles" : "الأدوار"}
              {selectedRoles.length > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {selectedRoles.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("permissions")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                activeTab === "permissions"
                  ? "bg-[#1167c9] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:bg-blue-500/10"
              }`}
            >
              <ShieldCheck size={17} />
              {locale === "en" ? "Direct Permissions" : "الصلاحيات المباشرة"}
              {selectedPermissionKeys.length > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {selectedPermissionKeys.length}
                </span>
              )}
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-6">
            {/* TAB 1: BASIC ACCOUNT DETAILS */}
            {activeTab === "basic" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                    {locale === "en" ? "Linked Employee" : "الموظف المرتبط"}
                  </label>
                  <SearchableSelect
                    value={form.employeeId || ""}
                    onChange={handleEmployeeChange}
                    options={employeeOptions}
                    placeholder={
                      locale === "en"
                        ? "Select Employee (Optional)..."
                        : "اختر الموظف (اختياري)..."
                    }
                  />
                </div>
                <Input
                  label={t("users.username")}
                  required
                  value={form.userName}
                  onChange={(e) => setForm({ ...form, userName: e.target.value })}
                />
                <Input
                  label={locale === "en" ? "Initial Password" : "كلمة المرور الأولية"}
                  type="password"
                  minLength={12}
                  required
                  value={form.initialPassword}
                  onChange={(e) =>
                    setForm({ ...form, initialPassword: e.target.value })
                  }
                />
                <Input
                  label={locale === "en" ? "Arabic Name" : "الاسم بالعربية"}
                  required
                  value={form.displayNameAr}
                  onChange={(e) =>
                    setForm({ ...form, displayNameAr: e.target.value })
                  }
                />
                <Input
                  label={locale === "en" ? "English Name" : "الاسم بالإنجليزية"}
                  value={form.displayNameEn}
                  onChange={(e) =>
                    setForm({ ...form, displayNameEn: e.target.value })
                  }
                />
                <Input
                  label={locale === "en" ? "Email" : "البريد الإلكتروني"}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label={t("users.phone")}
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                />
              </div>
            )}

            {/* TAB 2: ROLES */}
            {activeTab === "roles" && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--muted)]">
                  {locale === "en"
                    ? "Select initial roles for this account. If none selected, minimal USER role is assigned automatically."
                    : "اختر الأدوار الأولية للحساب. في حال عدم الاختيار، سيتم تعيين دور المستخدم العادي تلقائياً."}
                </p>

                {catalogsLoading ? (
                  <p className="py-6 text-center text-sm text-[var(--muted)]">
                    {locale === "en" ? "Loading active roles catalog..." : "جارٍ تحميل قائمة الأدوار النشطة…"}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rolesCatalog.map((role) => {
                      const selected = selectedRoles.find((r) => r.roleId === role.id);
                      const isChecked = Boolean(selected);
                      return (
                        <label
                          key={role.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                            isChecked
                              ? "border-[#1167c9] bg-blue-50/60 dark:bg-blue-950/30 font-bold"
                              : "border-[var(--border)] hover:bg-slate-500/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRoleSelection(role.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <b className="text-sm">
                                {locale === "en" ? role.nameEn || role.nameAr : role.nameAr}
                              </b>
                              <span className="font-mono text-xs text-[var(--muted)]">
                                {role.code}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted)] font-normal">
                              {locale === "en" ? role.descriptionEn || role.descriptionAr : role.descriptionAr}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DIRECT PERMISSION ASSIGNMENTS (SIMPLE SELECTION) */}
            {activeTab === "permissions" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--muted)]">
                    {locale === "en"
                      ? "Check the permissions you wish to grant directly to this user."
                      : "حدد الصلاحيات التي ترغب بمنحها مباشرة لهذا المستخدم."}
                  </p>
                  {selectedPermissionKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPermissionKeys([])}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      {locale === "en" ? "Clear all selected" : "إلغاء تحديد الكل"}
                    </button>
                  )}
                </div>

                {/* Selected Permissions Summary Badges */}
                {selectedPermissionKeys.length > 0 && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                    <span className="mb-2 block text-xs font-bold text-[#1167c9]">
                      {locale === "en" ? "Selected Permissions" : "الصلاحيات المحددة"} ({selectedPermissionKeys.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {selectedPermissionKeys.map((key) => {
                        const item = permissionsCatalog.find((p) => p.key === key);
                        const label = item
                          ? locale === "en"
                            ? item.nameEn || item.nameAr
                            : item.nameAr
                          : permissionLabel(key, locale);
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-[#1167c9] shadow-sm dark:bg-slate-900 dark:border-blue-800"
                          >
                            <span>{label}</span>
                            <button
                              type="button"
                              onClick={() => togglePermissionKey(key)}
                              className="rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
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
                    <Search size={16} className="absolute right-3 top-3 text-[var(--muted)]" />
                    <input
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      placeholder={locale === "en" ? "Search permissions by name or key..." : "ابحث عن صلاحية باسمها أو الرمز…"}
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
                    {["Security", "Workforce", "Compliance", "Fleet", "Workflows", "Operations"].map((grp) => (
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
                {catalogsLoading ? (
                  <p className="py-6 text-center text-sm text-[var(--muted)]">
                    {locale === "en" ? "Loading permissions..." : "جارٍ تحميل الصلاحيات…"}
                  </p>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto space-y-5 pr-1">
                    {groupedPermissionsCatalog.map(([group, items]) => {
                      const isAllGroupSelected =
                        items.length > 0 &&
                        items.every((item) => selectedPermissionKeys.includes(item.key));
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
                                onChange={() => togglePermissionGroupKeys(items)}
                                className="h-3.5 w-3.5 rounded border-blue-400 text-[#1167c9] focus:ring-[#1167c9]"
                              />
                              <span>
                                {isAllGroupSelected
                                  ? (locale === "en" ? "Deselect All" : "إلغاء تحديد الكل")
                                  : (locale === "en" ? "Select All" : "تحديد الكل")}
                              </span>
                            </label>
                          </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {items.map((item) => {
                            const isSelected = selectedPermissionKeys.includes(item.key);
                            return (
                              <label
                                key={item.key}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                                  isSelected
                                    ? "border-[#1167c9] bg-blue-50/60 dark:bg-blue-950/30 font-bold"
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
                                  <span className="block text-xs leading-5">
                                    {locale === "en" ? item.nameEn || item.nameAr : item.nameAr}
                                  </span>
                                  <span className="block font-mono text-[10px] text-[var(--muted)] truncate" dir="ltr">
                                    {item.key}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                    {groupedPermissionsCatalog.length === 0 && (
                      <p className="py-8 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                        {locale === "en" ? "No matching permissions found." : "لا توجد صلاحيات مطابقة."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {formError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3.5 text-sm font-bold text-red-700">
                {formError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 border-t border-[var(--border)] pt-4">
              <Button type="submit" loading={submitting}>
                {t("common.save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-[#1167c9]">
              <UsersRound size={20} />
            </div>
            <div>
              <h2 className="font-black">{t("users.title")}</h2>
              <p className="text-xs text-[var(--muted)]">
                {users.length} {locale === "en" ? "accounts" : "حساب"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--muted)]">
              <Search size={17} />
              <input
                aria-label={t("users.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("users.searchPlaceholder")}
                className="w-56 bg-transparent text-sm text-[var(--foreground)] outline-none sm:w-80"
              />
            </label>
            <Button
              variant="secondary"
              onClick={() => void load()}
              aria-label={t("common.loading")}
            >
              <RefreshCw size={17} />
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--muted)]">
            {t("common.loading")}
          </div>
        ) : (
          <Table>
            <thead className="border-b border-[var(--border)] bg-[var(--background)] text-xs text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4">{locale === "en" ? "Name" : "الاسم"}</th>
                <th className="px-5 py-4">{t("users.username")}</th>
                <th className="px-5 py-4">
                  {locale === "en" ? "Email" : "البريد الإلكتروني"}
                </th>
                <th className="px-5 py-4">{t("users.phone")}</th>
                <th className="px-5 py-4">{t("common.status")}</th>
                <th className="px-5 py-4">
                  {locale === "en" ? "Last Activity" : "آخر نشاط"}
                </th>
                <th className="px-5 py-4">
                  {locale === "en" ? "Created Date" : "تاريخ الإنشاء"}
                </th>
                <th className="px-5 py-4">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((user) => {
                const linkedEmp = user.employeeId
                  ? employees.find((e) => e.id === user.employeeId)
                  : null;
                return (
                  <tr key={user.id} className="hover:bg-blue-500/5">
                    <td className="px-5 py-4">
                      <b className="block">
                        {locale === "en"
                          ? user.displayNameEn || user.displayNameAr
                          : user.displayNameAr || user.displayNameEn}
                      </b>
                      {linkedEmp && (
                        <span className="block text-xs font-normal text-[var(--muted)]">
                          {locale === "en"
                            ? `Employee: ${linkedEmp.fullNameEn || linkedEmp.fullNameAr}`
                            : `الموظف: ${linkedEmp.fullNameAr}`}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium" dir="ltr">
                      {user.userName}
                    </td>
                    <td className="px-5 py-4" dir="ltr">
                      {user.email}
                    </td>
                    <td className="px-5 py-4" dir="ltr">
                      {user.phoneNumber || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        tone={
                          user.status === "Active"
                            ? "green"
                            : user.status === "Locked"
                              ? "red"
                              : "orange"
                        }
                      >
                        {statusLabels[user.status]?.[locale] ?? user.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatDate(user.lastActivityAtUtc, locale)}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatDate(user.createdAtUtc, locale)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/users/${user.id}`}
                        aria-label={`${t("common.edit")} ${user.displayNameAr || user.userName}`}
                        title={t("common.edit")}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#1167c9] hover:bg-blue-500/10"
                      >
                        <Pencil size={17} />
                        <span className="hidden sm:inline">{t("common.edit")}</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-[var(--muted)]"
                  >
                    {locale === "en"
                      ? "No matching users found."
                      : "لا توجد نتائج مطابقة."}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
