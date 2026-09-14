"use client";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Archive,
  ZoomIn,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { extractErrorMessageFromBody } from "../../../lib/auth/api";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { ArchiveUserModal } from "../../../components/users/ArchiveUserModal";
import { RestoreUserModal } from "../../../components/users/RestoreUserModal";
import {
  createUser,
  getArchivedUsers,
  getPermissionCatalogue,
  getRolePermissionKeys,
  listRoles,
  listUsers,
  resolveProfileImageUrl,
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
import {
  groupPermissions,
  permissionGroup,
  permissionGroupLabel,
  permissionGroups,
} from "../../../lib/permission-groups";
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
  const [userToArchive, setUserToArchive] = useState<ManagedUser | null>(null);
  const [userToRestore, setUserToRestore] = useState<ManagedUser | null>(null);

  // View tabs state (Active vs Archived)
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");
  const [archivedUsers, setArchivedUsers] = useState<ManagedUser[]>([]);
  const [archivedSearch, setArchivedSearch] = useState("");
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");
  const [hasLoadedArchivedOnce, setHasLoadedArchivedOnce] = useState(false);

  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewImage) {
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImage]);

  // Authorization catalog prerequisites
  const [rolesCatalog, setRolesCatalog] = useState<Role[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionCatalogItem[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  // Permission selection state
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedPermissionGroup, setSelectedPermissionGroup] = useState<string>("all");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [manuallyAddedKeys, setManuallyAddedKeys] = useState<Set<string>>(new Set());
  const [manuallyRemovedKeys, setManuallyRemovedKeys] = useState<Set<string>>(new Set());

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

  const loadArchived = useCallback(
    async (query = archivedSearch) => {
      setArchivedLoading(true);
      setArchivedError("");
      try {
        const data = await getArchivedUsers(query);
        setArchivedUsers(data);
        setHasLoadedArchivedOnce(true);
      } catch {
        setArchivedError(
          locale === "en"
            ? "Failed to load archived users. Verify API connection and permissions."
            : "تعذر تحميل المستخدمين المؤرشفين. تأكد من اتصال واجهة API وصلاحياتك.",
        );
      } finally {
        setArchivedLoading(false);
      }
    },
    [archivedSearch, locale],
  );

  useEffect(() => {
    if (isLoading || !canRead) return;
    const timer = window.setTimeout(() => void load(), 350);
    return () => window.clearTimeout(timer);
  }, [isLoading, canRead, load]);

  // Initial load of archived users once auth is ready
  useEffect(() => {
    if (isLoading || !canRead) return;
    void loadArchived("");
  }, [isLoading, canRead, loadArchived]);

  // Debounced search for archived users (only triggers when archivedSearch changes, NOT on tab switch)
  const isFirstArchivedSearch = useRef(true);
  useEffect(() => {
    if (isFirstArchivedSearch.current) {
      isFirstArchivedSearch.current = false;
      return;
    }
    if (isLoading || !canRead) return;
    const timer = window.setTimeout(() => void loadArchived(archivedSearch), 350);
    return () => window.clearTimeout(timer);
  }, [isLoading, canRead, archivedSearch, loadArchived]);

  const handleTabChange = (tab: "active" | "archived") => {
    setViewTab(tab);
    if (tab === "archived" && !hasLoadedArchivedOnce) {
      void loadArchived(archivedSearch);
    }
  };

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
      setForm(emptyForm);
      setSelectedRoles([]);
      setSelectedPermissionKeys([]);
      setManuallyAddedKeys(new Set());
      setManuallyRemovedKeys(new Set());
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

  const primarySelectedRoleId = selectedRoles[0]?.roleId || "";
  const primarySelectedRole = rolesCatalog.find((r) => r.id === primarySelectedRoleId);

  const roleOptions = useMemo(() => {
    return [
      {
        value: "",
        label:
          locale === "en"
            ? "None (No role selected)"
            : "بدون (لم يتم اختيار دور بعد)",
      },
      ...rolesCatalog.map((role) => ({
        value: role.id,
        label: locale === "en" && role.nameEn ? role.nameEn : role.nameAr,
        sublabel: `${role.code} · ${role.permissionKeys?.length ?? 0} ${
          locale === "en" ? "permissions" : "صلاحية"
        }`,
      })),
    ];
  }, [rolesCatalog, locale]);

  const handlePrimaryRoleChange = async (roleId: string) => {
    if (!roleId) {
      const allRoleKeys = rolesCatalog.flatMap((r) => r.permissionKeys ?? []);
      setSelectedRoles([]);
      setSelectedPermissionKeys((prev) =>
        prev.filter((k) => !allRoleKeys.includes(k) || manuallyAddedKeys.has(k)),
      );
      return;
    }

    const role = rolesCatalog.find((r) => r.id === roleId);
    if (!role) return;

    setSelectedRoles([
      {
        roleId,
        startsAtUtc: "",
        expiresAtUtc: "",
        reason: "",
        isAllHousingScope: true,
        isAllClientScope: true,
        includesFuturePlatformContracts: true,
        scopes: [],
      },
    ]);

    const rolePerms = await getRolePermissionKeys(role);
    if (rolePerms.length > 0 && (!role.permissionKeys || role.permissionKeys.length === 0)) {
      setRolesCatalog((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissionKeys: rolePerms } : r)),
      );
    }

    setSelectedPermissionKeys((prev) => {
      const customAdded = prev.filter((k) => manuallyAddedKeys.has(k));
      return Array.from(new Set([...customAdded, ...rolePerms]));
    });
    setManuallyRemovedKeys(new Set());

    toast.success(
      locale === "en" ? "Role Selected & Permissions Auto-Filled" : "تم اختيار الدور وتعبئة الصلاحيات",
      locale === "en"
        ? `Loaded ${rolePerms.length} permissions from "${role.nameEn || role.nameAr}". You can customize them in Direct Permissions.`
        : `تمت تعبئة ${rolePerms.length} صلاحية تلقائياً من دور "${role.nameAr}". يمكنك تخصيصها في تبويب الصلاحيات المباشرة.`,
    );
  };

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

  // Role toggle with automatic permission population
  const toggleRoleSelection = async (roleId: string) => {
    const role = rolesCatalog.find((r) => r.id === roleId);
    if (!role) return;

    const isAlreadySelected = selectedRoles.some((r) => r.roleId === roleId);

    if (isAlreadySelected) {
      // Uncheck role
      const remainingRoles = selectedRoles.filter((r) => r.roleId !== roleId);
      setSelectedRoles(remainingRoles);

      // Collect permissions of remaining selected roles
      const remainingRoleKeys = new Set(
        remainingRoles.flatMap((r) => {
          const matched = rolesCatalog.find((rc) => rc.id === r.roleId);
          return matched?.permissionKeys ?? [];
        }),
      );

      const thisRolePerms = role.permissionKeys ?? [];

      // Remove this role's permissions UNLESS they belong to a remaining role or were manually added by user
      setSelectedPermissionKeys((prev) =>
        prev.filter(
          (key) =>
            remainingRoleKeys.has(key) ||
            manuallyAddedKeys.has(key) ||
            !thisRolePerms.includes(key),
        ),
      );
    } else {
      // Check role
      const newRoleItem: SelectedRoleState = {
        roleId,
        startsAtUtc: "",
        expiresAtUtc: "",
        reason: "",
        isAllHousingScope: true,
        isAllClientScope: true,
        includesFuturePlatformContracts: true,
        scopes: [],
      };
      setSelectedRoles((prev) => [...prev, newRoleItem]);

      // Fetch role permissions if missing or empty
      const rolePerms = await getRolePermissionKeys(role);
      if (rolePerms.length > 0 && (!role.permissionKeys || role.permissionKeys.length === 0)) {
        setRolesCatalog((prev) =>
          prev.map((r) => (r.id === roleId ? { ...r, permissionKeys: rolePerms } : r)),
        );
      }

      // Auto-fill role permissions into selectedPermissionKeys
      setSelectedPermissionKeys((prev) => Array.from(new Set([...prev, ...rolePerms])));

      // Clean up manuallyRemovedKeys for this role's permissions
      setManuallyRemovedKeys((prev) => {
        const next = new Set(prev);
        rolePerms.forEach((k) => next.delete(k));
        return next;
      });

      toast.success(
        locale === "en" ? "Permissions Auto-Filled" : "تمت تعبئة الصلاحيات",
        locale === "en"
          ? `Auto-filled ${rolePerms.length} permissions from role "${role.nameEn || role.nameAr}". You can customize them in Direct Permissions.`
          : `تمت تعبئة ${rolePerms.length} صلاحية تلقائياً من دور "${role.nameAr}". يمكنك تخصيصها بحرية في تبويب الصلاحيات المباشرة.`,
      );
    }
  };

  // Direct Permission toggle (Full user control)
  const togglePermissionKey = (key: string) => {
    setSelectedPermissionKeys((prev) => {
      const exists = prev.includes(key);
      if (exists) {
        setManuallyRemovedKeys((m) => new Set(m).add(key));
        setManuallyAddedKeys((m) => {
          const next = new Set(m);
          next.delete(key);
          return next;
        });
        return prev.filter((k) => k !== key);
      } else {
        setManuallyAddedKeys((m) => new Set(m).add(key));
        setManuallyRemovedKeys((m) => {
          const next = new Set(m);
          next.delete(key);
          return next;
        });
        return [...prev, key];
      }
    });
  };

  // Direct Permission group toggle (Select / Deselect All in group)
  const togglePermissionGroupKeys = (groupItems: PermissionCatalogItem[]) => {
    const groupKeys = groupItems.map((item) => item.key);
    const allSelected = groupKeys.every((key) => selectedPermissionKeys.includes(key));
    if (allSelected) {
      setManuallyRemovedKeys((m) => {
        const next = new Set(m);
        groupKeys.forEach((k) => next.add(k));
        return next;
      });
      setManuallyAddedKeys((m) => {
        const next = new Set(m);
        groupKeys.forEach((k) => next.delete(k));
        return next;
      });
      setSelectedPermissionKeys((prev) => prev.filter((key) => !groupKeys.includes(key)));
    } else {
      setManuallyAddedKeys((m) => {
        const next = new Set(m);
        groupKeys.forEach((k) => next.add(k));
        return next;
      });
      setManuallyRemovedKeys((m) => {
        const next = new Set(m);
        groupKeys.forEach((k) => next.delete(k));
        return next;
      });
      setSelectedPermissionKeys((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  // Reset permissions to exact permissions defined by currently selected roles
  const handleResetToRolePermissions = () => {
    const allRolePerms = Array.from(
      new Set(
        selectedRoles.flatMap((r) => {
          const matched = rolesCatalog.find((rc) => rc.id === r.roleId);
          return matched?.permissionKeys ?? [];
        }),
      ),
    );
    setSelectedPermissionKeys(allRolePerms);
    setManuallyAddedKeys(new Set());
    setManuallyRemovedKeys(new Set());
    toast.info(
      locale === "en" ? "Permissions Reset" : "إعادة التعيين",
      locale === "en"
        ? `Reset permissions to match the ${allRolePerms.length} permissions defined by your selected role(s).`
        : `تمت إعادة تعيين الصلاحيات لتطابق ${allRolePerms.length} صلاحية المحددة في الأدوار المختارة.`,
    );
  };

  const handleClearAllPermissions = () => {
    setSelectedPermissionKeys([]);
    setManuallyAddedKeys(new Set());
    const allRolePerms = selectedRoles.flatMap((r) => {
      const matched = rolesCatalog.find((rc) => rc.id === r.roleId);
      return matched?.permissionKeys ?? [];
    });
    setManuallyRemovedKeys(new Set(allRolePerms));
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

    if (!trimmedEmail) {
      setFormError(
        locale === "en"
          ? "Email address is required."
          : "البريد الإلكتروني مطلوب.",
      );
      setSubmitting(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
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
              isAllHousingScope: true,
              isAllClientScope: true,
              includesFuturePlatformContracts: true,
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
      setManuallyAddedKeys(new Set());
      setManuallyRemovedKeys(new Set());
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

                {/* Primary Role / Role Preset */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[var(--foreground)]">
                      {locale === "en" ? "Role / Template (Optional)" : "الدور الوظيفي / القالب (اختياري)"}
                    </label>
                    <span className="text-[11px] text-[var(--muted)]">
                      {locale === "en"
                        ? "Choosing a role auto-fills its permissions into Direct Permissions"
                        : "اختيار دور يعبئ الصلاحيات المرتبطة به تلقائياً في تبويب الصلاحيات"}
                    </span>
                  </div>
                  <SearchableSelect
                    value={primarySelectedRoleId}
                    onChange={(val) => void handlePrimaryRoleChange(val)}
                    options={roleOptions}
                    placeholder={
                      locale === "en"
                        ? "Select Role (Auto-fills permissions)..."
                        : "اختر الدور الوظيفي (تعبئة تلقائية للصلاحيات)..."
                    }
                  />
                  {primarySelectedRole && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-500/20 bg-blue-50/50 p-3 dark:bg-blue-950/20">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-[#1167c9] shrink-0" />
                        <span className="text-xs font-bold text-[#1167c9]">
                          {locale === "en"
                            ? `${selectedPermissionKeys.length} permissions auto-filled from "${primarySelectedRole.nameEn || primarySelectedRole.nameAr}"`
                            : `تمت تعبئة ${selectedPermissionKeys.length} صلاحية تلقائياً من دور "${primarySelectedRole.nameAr}"`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("permissions")}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#1167c9] hover:underline"
                      >
                        <span>{locale === "en" ? "Review & Customize Permissions →" : "مراجعة وتخصيص الصلاحيات ←"}</span>
                      </button>
                    </div>
                  )}
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
                  label={locale === "en" ? "Email *" : "البريد الإلكتروني *"}
                  type="email"
                  required
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
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50/50 p-3 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Shield size={16} className="text-[#1167c9] shrink-0" />
                    <span>
                      {locale === "en"
                        ? "Selecting any role auto-fills its permissions into the Direct Permissions tab. You have full control to uncheck or select additional permissions."
                        : "تحديد أي دور يقوم بتعبئة صلاحياته تلقائياً في تبويب الصلاحيات المباشرة. يمكنك تعديلها بحرية تامة وإلغاء أو إضافة أي صلاحية."}
                    </span>
                  </div>
                  {selectedPermissionKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("permissions")}
                      className="text-xs font-bold text-[#1167c9] hover:underline"
                    >
                      {locale === "en"
                        ? `Customize Permissions (${selectedPermissionKeys.length}) →`
                        : `تخصيص الصلاحيات (${selectedPermissionKeys.length}) ←`}
                    </button>
                  )}
                </div>

                {catalogsLoading ? (
                  <p className="py-6 text-center text-sm text-[var(--muted)]">
                    {locale === "en" ? "Loading active roles catalog..." : "جارٍ تحميل قائمة الأدوار النشطة…"}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rolesCatalog.map((role) => {
                      const selected = selectedRoles.find((r) => r.roleId === role.id);
                      const isChecked = Boolean(selected);
                      const permsCount = role.permissionKeys?.length ?? 0;
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
                            onChange={() => void toggleRoleSelection(role.id)}
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
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                                <ShieldCheck size={12} className="text-[#1167c9]" />
                                <span>
                                  {permsCount}{" "}
                                  {locale === "en" ? "permissions" : "صلاحية"}
                                </span>
                              </span>
                              {isChecked && (
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  {locale === "en" ? "✓ Permissions Loaded" : "✓ الصلاحيات معبأة"}
                                </span>
                              )}
                            </div>
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
                {/* Auto-filled role alert */}
                {selectedRoles.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-500/20 bg-blue-50/50 p-3 dark:bg-blue-950/20">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#1167c9] shrink-0" />
                      <span className="text-xs text-[var(--foreground)]">
                        {locale === "en"
                          ? `Permissions auto-filled from ${selectedRoles.length} selected role(s). You have 100% control to uncheck or select new permissions below.`
                          : `تمت تعبئة الصلاحيات تلقائياً من الأدوار المحددة (${selectedRoles.length}). لديك تحكم كامل لإلغاء تحديد أي منها أو إضافة صلاحيات جديدة.`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetToRolePermissions}
                      className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-bold text-[#1167c9] shadow-sm hover:bg-blue-50 dark:bg-slate-900 dark:border-blue-800 transition-colors"
                    >
                      {locale === "en" ? "Reset to Role Defaults" : "إعادة التعيين لصلاحيات الدور"}
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--muted)]">
                    {locale === "en"
                      ? "Check or uncheck the permissions you wish to grant directly to this user."
                      : "حدد أو ألغِ تحديد الصلاحيات التي ترغب بمنحها لهذا المستخدم."}
                  </p>
                  {selectedPermissionKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllPermissions}
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
                    {permissionGroups.map((grp) => (
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

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleTabChange("active")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
            viewTab === "active"
              ? "bg-[#1167c9] text-white shadow-sm"
              : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-blue-500/10 hover:text-[#1167c9]"
          }`}
        >
          <UsersRound size={17} />
          <span>{t("users.activeUsers")}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              viewTab === "active"
                ? "bg-white/20 text-white"
                : "bg-slate-200/80 dark:bg-slate-800 text-[var(--foreground)]"
            }`}
          >
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("archived")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
            viewTab === "archived"
              ? "bg-[#1167c9] text-white shadow-sm"
              : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-blue-500/10 hover:text-[#1167c9]"
          }`}
        >
          <Archive size={17} />
          <span>{t("users.archivedUsers")}</span>
          {hasLoadedArchivedOnce && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                viewTab === "archived"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200/80 dark:bg-slate-800 text-[var(--foreground)]"
              }`}
            >
              {archivedUsers.length}
            </span>
          )}
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                viewTab === "active"
                  ? "bg-blue-500/10 text-[#1167c9]"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {viewTab === "active" ? <UsersRound size={20} /> : <Archive size={20} />}
            </div>
            <div>
              <h2 className="font-black">
                {viewTab === "active" ? t("users.title") : t("users.archivedUsers")}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {viewTab === "active"
                  ? `${users.length} ${locale === "en" ? "active accounts" : "حساب نشط"}`
                  : `${archivedUsers.length} ${locale === "en" ? "archived accounts" : "حساب مؤرشف"}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--muted)]">
              <Search size={17} />
              <input
                aria-label={
                  viewTab === "active"
                    ? t("users.searchPlaceholder")
                    : t("users.searchArchivedPlaceholder")
                }
                value={viewTab === "active" ? search : archivedSearch}
                onChange={(e) =>
                  viewTab === "active"
                    ? setSearch(e.target.value)
                    : setArchivedSearch(e.target.value)
                }
                placeholder={
                  viewTab === "active"
                    ? t("users.searchPlaceholder")
                    : t("users.searchArchivedPlaceholder")
                }
                className="w-56 bg-transparent text-sm text-[var(--foreground)] outline-none sm:w-80"
              />
            </label>
            <Button
              variant="secondary"
              onClick={() => (viewTab === "active" ? void load() : void loadArchived(archivedSearch))}
              aria-label={t("common.loading")}
              disabled={viewTab === "active" ? loading : archivedLoading}
            >
              <RefreshCw
                size={17}
                className={(viewTab === "active" ? loading : archivedLoading) ? "animate-spin text-[#1167c9]" : ""}
              />
            </Button>
          </div>
        </div>

        {(viewTab === "active" ? error : archivedError) && (
          <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {viewTab === "active" ? error : archivedError}
          </p>
        )}

        {(viewTab === "active" ? loading && users.length === 0 : archivedLoading && archivedUsers.length === 0) ? (
          <div className="p-8 text-center text-sm text-[var(--muted)]">
            {t("common.loading")}
          </div>
        ) : (
          <div className={(viewTab === "active" ? loading : archivedLoading) ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200"}>
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
              {(viewTab === "active" ? users : archivedUsers).map((user) => {
                const linkedEmp = user.employeeId
                  ? employees.find((e) => e.id === user.employeeId)
                  : null;
                return (
                  <tr key={user.id} className="hover:bg-blue-500/5">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {user.profileImageUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: resolveProfileImageUrl(user.profileImageUrl) || "",
                                title:
                                  locale === "en"
                                    ? user.displayNameEn || user.displayNameAr || user.userName
                                    : user.displayNameAr || user.displayNameEn || user.userName,
                                subtitle: user.userName,
                              })
                            }
                            className="group relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1167c9] transition-transform hover:scale-105 cursor-pointer"
                            title={locale === "en" ? "Click to view full photo" : "انقر لعرض الصورة بالحجم الكامل"}
                          >
                            <img
                              src={resolveProfileImageUrl(user.profileImageUrl) || ""}
                              alt={user.displayNameAr || user.userName}
                              className="h-full w-full object-cover group-hover:brightness-90 transition-all"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn size={14} className="text-white drop-shadow" />
                            </div>
                          </button>
                        ) : (
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400 font-black text-xs">
                            {(user.displayNameAr || user.userName || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
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
                        </div>
                      </div>
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
                      {viewTab === "archived" ? (
                        <Badge tone="gray">
                          {statusLabels["Archived"]?.[locale] ?? "Archived"}
                        </Badge>
                      ) : (
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
                      )}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatDate(user.lastActivityAtUtc, locale)}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {formatDate(user.createdAtUtc, locale)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/users/${user.id}`}
                          aria-label={`${t("common.edit")} ${user.displayNameAr || user.userName}`}
                          title={t("common.edit")}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-[#1167c9] hover:bg-blue-500/10"
                        >
                          <Pencil size={15} />
                          <span className="hidden sm:inline">{t("common.edit")}</span>
                        </Link>
                        {viewTab === "active" && can("users.archive") && user.status !== "Archived" && (
                          <button
                            type="button"
                            onClick={() => setUserToArchive(user)}
                            aria-label={locale === "en" ? "Archive User" : "أرشفة المستخدم"}
                            title={locale === "en" ? "Archive User" : "أرشفة المستخدم"}
                            className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs font-bold text-red-600 hover:bg-red-500/10 transition-colors"
                          >
                            <Archive size={15} />
                            <span className="hidden md:inline">{locale === "en" ? "Archive" : "أرشفة"}</span>
                          </button>
                        )}
                        {viewTab === "archived" && can("users.archive") && (
                          <button
                            type="button"
                            onClick={() => setUserToRestore(user)}
                            aria-label={t("users.restoreUser")}
                            title={t("users.restoreUser")}
                            className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                          >
                            <RotateCcw size={15} />
                            <span className="hidden md:inline">{t("users.restore")}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(viewTab === "active" ? users : archivedUsers).length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-[var(--muted)]"
                  >
                    {viewTab === "active"
                      ? (locale === "en" ? "No matching users found." : "لا توجد نتائج مطابقة.")
                      : (locale === "en" ? "No archived users found." : "لا يوجد مستخدمون مؤرشفون.")}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          </div>
        )}
      </Card>

      <ArchiveUserModal
        isOpen={Boolean(userToArchive)}
        onClose={() => setUserToArchive(null)}
        user={userToArchive}
        onSuccess={() => {
          void load();
          void loadArchived(archivedSearch);
        }}
      />

      <RestoreUserModal
        isOpen={Boolean(userToRestore)}
        onClose={() => setUserToRestore(null)}
        user={userToRestore}
        onSuccess={(restored) => {
          setArchivedUsers((prev) => prev.filter((u) => u.id !== restored.id));
          void load();
        }}
        onConflict={() => {
          void loadArchived(archivedSearch);
        }}
        onNotFound={(userId) => {
          setArchivedUsers((prev) => prev.filter((u) => u.id !== userId));
          void load();
        }}
      />

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {/* Header */}
            <div className="flex items-center justify-between w-full pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="font-black text-base text-[var(--foreground)]">
                  {previewImage.title}
                </h3>
                {previewImage.subtitle && (
                  <p className="text-xs text-[var(--muted)] font-mono" dir="ltr">
                    @{previewImage.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--foreground)] transition-colors"
                aria-label={locale === "en" ? "Close" : "إغلاق"}
              >
                <X size={18} />
              </button>
            </div>

            {/* Image View */}
            <div className="mt-3 flex items-center justify-center w-full max-h-[70vh] overflow-hidden rounded-xl bg-slate-900/5 dark:bg-slate-950/40 p-2">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-md"
              />
            </div>

            {/* Footer / Link */}
            <div className="mt-3 flex items-center justify-between w-full pt-2 border-t border-[var(--border)] text-xs text-[var(--muted)]">
              <span>
                {locale === "en"
                  ? "Click outside or press Esc to close"
                  : "انقر خارج الصورة أو اضغط Esc للإغلاق"}
              </span>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-[#1167c9] hover:underline"
              >
                <ExternalLink size={14} />
                <span>
                  {locale === "en" ? "Open full image" : "فتح الصورة كاملة"}
                </span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
