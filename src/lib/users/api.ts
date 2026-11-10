 import { authFetch } from "../auth/api";
import type {
  CreateManagedUserRequest,
  CurrentUserProfile,
  ManagedDirectPermissionAssignmentRequest,
  ManagedRoleAssignmentRequest,
  ManagedUser,
  PermissionCatalogItem,
  Role,
  RoleRequest,
  RestoreManagedUserRequest,
  TemporaryCredential,
  UpdateManagedUserRequest,
} from "./types";
export function listUsers(search = "") {
  return authFetch<ManagedUser[]>(
    `/api/users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );
}
export function getArchivedUsers(search = "") {
  const params = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return authFetch<ManagedUser[]>(`/api/users/archived${params}`);
}
export function getUser(userId: string) {
  return authFetch<ManagedUser>(`/api/users/${encodeURIComponent(userId)}`);
}
export function restoreUser(
  userId: string,
  request: RestoreManagedUserRequest,
): Promise<ManagedUser> {
  return authFetch<ManagedUser>(
    `/api/users/${encodeURIComponent(userId)}/restore`,
    {
      method: "PATCH",
      body: JSON.stringify(request),
    },
  );
}
export async function createUser(payload: CreateManagedUserRequest): Promise<ManagedUser> {
  const res = await authFetch<{ user: ManagedUser } | ManagedUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return "user" in res ? res.user : res;
}
export function updateUser(userId: string, payload: UpdateManagedUserRequest) {
  return authFetch<ManagedUser>(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
export function updateUserStatus(
  userId: string,
  status: string,
  reason: string,
  rowVersion: string,
) {
  return authFetch<ManagedUser>(
    `/api/users/${encodeURIComponent(userId)}/status`,
    { method: "PATCH", body: JSON.stringify({ status, reason, rowVersion }) },
  );
}
export async function archiveUser(
  userId: string,
  reason: string,
  rowVersion?: string,
) {
  let targetRowVersion = rowVersion;

  // Obtain the current rowVersion from GET /api/users/{userId} if not provided
  if (!targetRowVersion) {
    try {
      const currentUser = await getUser(userId);
      if (currentUser?.rowVersion) {
        targetRowVersion = currentUser.rowVersion;
      }
    } catch (err) {
      console.warn("Could not fetch user to obtain fresh rowVersion:", err);
    }
  }

  const cleanReason = reason?.trim() || "User account is no longer required";

  return authFetch<void>(`/api/users/${encodeURIComponent(userId)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason: cleanReason, rowVersion: targetRowVersion }),
  });
}
export function resetUserPassword(userId: string, newPassword: string) {
  return authFetch<void>(
    `/api/users/${encodeURIComponent(userId)}/password/reset`,
    { method: "POST", body: JSON.stringify({ newPassword }) },
  );
}
export function createTemporaryCredentials(
  userId: string,
  purpose: string,
  validForMinutes: number,
) {
  return authFetch<TemporaryCredential>(
    `/api/users/${encodeURIComponent(userId)}/temporary-credentials`,
    { method: "POST", body: JSON.stringify({ purpose, validForMinutes }) },
  );
}
export function revokeTemporaryCredentials(
  userId: string,
  credentialId: string,
  reason: string,
) {
  return authFetch<void>(
    `/api/users/${encodeURIComponent(userId)}/temporary-credentials/${encodeURIComponent(credentialId)}/revoke`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}
export function revokeUserSessions(userId: string, reason = "") {
  return authFetch<void>(
    `/api/users/${encodeURIComponent(userId)}/sessions/revoke${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`,
    { method: "POST" },
  );
}
export function listRoles() {
  return authFetch<Role[]>("/api/users/roles");
}
export function getRole(roleId: string) {
  return authFetch<Role>(`/api/users/roles/${encodeURIComponent(roleId)}`);
}
export function getRolePermissions(roleId: string) {
  return authFetch<string[] | { permissionKeys: string[] }>(
    `/api/users/roles/${encodeURIComponent(roleId)}/permissions`,
  );
}
export async function getRolePermissionKeys(role: Role): Promise<string[]> {
  if (Array.isArray(role.permissionKeys) && role.permissionKeys.length > 0) {
    return role.permissionKeys;
  }
  try {
    const detailed = await getRole(role.id);
    if (Array.isArray(detailed?.permissionKeys) && detailed.permissionKeys.length > 0) {
      return detailed.permissionKeys;
    }
  } catch {
    // try fallback
  }
  try {
    const perms = await getRolePermissions(role.id);
    if (Array.isArray(perms)) return perms;
    if (perms && Array.isArray((perms as any).permissionKeys)) {
      return (perms as any).permissionKeys;
    }
  } catch {
    // try fallback
  }
  return role.permissionKeys ?? [];
}
export function createRole(payload: RoleRequest) {
  return authFetch<Role>("/api/users/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateRole(roleId: string, payload: RoleRequest) {
  return authFetch<Role>(`/api/users/roles/${encodeURIComponent(roleId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
export function replaceRolePermissions(
  roleId: string,
  permissionKeys: string[],
  rowVersion: string,
) {
  return authFetch<Role>(
    `/api/users/roles/${encodeURIComponent(roleId)}/permissions`,
    { method: "PUT", body: JSON.stringify({ permissionKeys, rowVersion }) },
  );
}
export function archiveRole(
  roleId: string,
  reason: string,
  rowVersion: string,
) {
  return authFetch<void>(
    `/api/users/roles/${encodeURIComponent(roleId)}/archive`,
    { method: "PATCH", body: JSON.stringify({ reason, rowVersion }) },
  );
}
export const NINJA_PERMISSION_CATALOG_ITEMS: PermissionCatalogItem[] = [
  {
    key: "ninja.read",
    module: "Ninja",
    nameAr: "عرض منصة نينجا",
    nameEn: "View Ninja Platform",
    descriptionAr: "عرض حسابات وعمليات وتقارير وخصومات منصة نينجا",
    descriptionEn: "View Ninja accounts, operations, reports, and deductions",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "ninja.accounts.update",
    module: "Ninja",
    nameAr: "تعديل وإعداد حسابات وشيتات نينجا",
    nameEn: "Update Ninja Accounts & Sheets",
    descriptionAr: "تعديل بيانات الحسابات وإدارة شيتات المراجعة وتحديثات نينجا",
    descriptionEn: "Configure accounts, manage sheet checkups and Ninja updates",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "ninja.assignments.create",
    module: "Ninja",
    nameAr: "إسناد وتسليم حسابات نينجا للمناديب",
    nameEn: "Assign Ninja Accounts",
    descriptionAr: "إسناد وتسليم حسابات نينجا المتاحة للمناديب",
    descriptionEn: "Assign and deliver available Ninja accounts to riders",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "ninja.assignments.delete",
    module: "Ninja",
    nameAr: "سحب وإلغاء إسناد حسابات نينجا",
    nameEn: "Release Ninja Accounts",
    descriptionAr: "سحب حسابات نينجا من المناديب وإلغاء التعيين",
    descriptionEn: "Release and unassign Ninja accounts from riders",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "ninja.assignments.dates.update",
    module: "Ninja",
    nameAr: "تعديل تواريخ تكليفات نينجا",
    nameEn: "Edit Ninja assignment dates",
    descriptionAr: "تصحيح وتعديل تواريخ بدء وانتهاء فترات التكليف لحسابات نينجا",
    descriptionEn: "Correct and edit start and end dates for Ninja account assignments",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "ninja.credentials.rotate",
    module: "Ninja",
    nameAr: "تدوير كلمات مرور حسابات نينجا",
    nameEn: "Rotate Ninja Credentials",
    descriptionAr: "تحديث وتدوير كلمات المرور لحسابات نينجا وتجاوز فترة الانتظار",
    descriptionEn: "Update and rotate Ninja passwords and handle cooldowns",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "ninja.performance.import",
    module: "Ninja",
    nameAr: "استيراد تقارير أداء نينجا",
    nameEn: "Import Ninja Performance",
    descriptionAr: "رفع واستيراد شيتات الأداء اليومي لمنصة نينجا",
    descriptionEn: "Upload and import daily Ninja performance sheets",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "ninja.performance.delete",
    module: "Ninja",
    nameAr: "حذف أداء نينجا اليومي",
    nameEn: "Delete Ninja daily performance",
    descriptionAr: "حذف أداء يوم محدد لجميع حسابات نينجا أو حسابات كفيل محدد لإعادة الاستيراد",
    descriptionEn: "Delete a Ninja performance day for all accounts or one sponsor for reimport",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "ninja.deductions.import",
    module: "Ninja",
    nameAr: "استيراد خصومات نينجا",
    nameEn: "Import Ninja Deductions",
    descriptionAr: "رفع واستيراد شيتات الخصومات اليومية لمنصة نينجا",
    descriptionEn: "Upload and import daily Ninja deductions sheets",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "ninja.evaluation.manage",
    module: "Ninja",
    nameAr: "إدارة سياق التسعير والمسؤولية ولقطات تقييم نينجا",
    nameEn: "Manage Ninja Evaluation Context, Responsibility & Snapshots",
    descriptionAr: "تعديل سياق التسعير وأوزان المسؤولية التعاقدية وإنشاء لقطات تقييم نينجا",
    descriptionEn: "Manage pricing context, planned responsibility schedules, and create evaluation snapshots",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "ninja.evaluation.export",
    module: "Ninja",
    nameAr: "تصدير نتائج تقييم أداء نينجا (XLSX)",
    nameEn: "Export Ninja Evaluation Results (XLSX)",
    descriptionAr: "تصدير نتائج تقييم أداء نينجا والمبالغ المقترحة كملف إكسل كامل",
    descriptionEn: "Export complete filtered Ninja evaluation reports and suggestions as XLSX",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
];

export const CHEFZ_PERMISSION_CATALOG_ITEMS: PermissionCatalogItem[] = [
  {
    key: "chefz.read",
    module: "Chefz",
    nameAr: "عرض منصة شيفز",
    nameEn: "View Chefz Platform",
    descriptionAr: "عرض حسابات وعمليات وتصفيات وتقارير شيفز",
    descriptionEn: "View Chefz accounts, operations, settlements, and reports",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "chefz.accounts.update",
    module: "Chefz",
    nameAr: "تعديل وإعداد حسابات شيفز",
    nameEn: "Update Chefz Accounts",
    descriptionAr: "تعديل بيانات وإعدادات حسابات شيفز",
    descriptionEn: "Configure and update Chefz account details",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "chefz.settlements.create",
    module: "Chefz",
    nameAr: "إنشاء تصفيات شيفز",
    nameEn: "Create Chefz Settlements",
    descriptionAr: "إنشاء وتوثيق تصفيات المحافظ المالية لشيفز",
    descriptionEn: "Create and record Chefz wallet settlements",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "chefz.settlements.delete",
    module: "Chefz",
    nameAr: "حذف تصفيات شيفز",
    nameEn: "Delete Chefz Settlements",
    descriptionAr: "حذف تصفيات المحافظ والطلبات لشيفز لنصف شهر محدد نهائياً مع صفوف الطلبات وسجلات الاستيراد",
    descriptionEn: "Permanently delete Chefz wallet and order settlements for a half-month period with imported rows and import records",
    isSensitive: false,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "chefz.performance.import",
    module: "Chefz",
    nameAr: "استيراد تقارير أداء شيفز",
    nameEn: "Import Chefz Performance",
    descriptionAr: "رفع واستيراد تقارير الأداء اليومي لشيفز",
    descriptionEn: "Import Chefz daily performance reports",
    isSensitive: false,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: false,
  },
  {
    key: "chefz.performance.delete",
    module: "Chefz",
    nameAr: "حذف تقارير أداء شيفز",
    nameEn: "Delete Chefz Performance",
    descriptionAr: "حذف تقارير وسجلات الأداء اليومي لشيفز لتاريخ محدد نهائياً",
    descriptionEn: "Permanently delete Chefz daily performance reports and records for a specific date",
    isSensitive: false,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
];

export const HUNGER_PERMISSION_CATALOG_ITEMS: PermissionCatalogItem[] = [
  {
    key: "hunger.read",
    module: "Hungerstation",
    nameAr: "عرض حسابات وملخص وتقارير هنقرستيشن",
    nameEn: "View Hungerstation Accounts, Summary & Reports",
    descriptionAr: "عرض الحسابات والملخص الشهري وتقارير التشغيل اليومي والجودة التراكمية لمنصة هنقرستيشن",
    descriptionEn: "View Hungerstation accounts, monthly summary, daily operations and cumulative quality reports",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.accounts.import",
    module: "Hungerstation",
    nameAr: "معاينة واعتماد ملف تأسيس حسابات هنقرستيشن",
    nameEn: "Preview & Confirm Hungerstation Seed Import",
    descriptionAr: "رفع ومعاينة واعتماد ملف تأسيس الحسابات (Sheet1) وربط أصحاب الحسابات وبيانات المصدر",
    descriptionEn: "Upload, preview and confirm Hungerstation seed accounts workbook",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.accounts.update",
    module: "Hungerstation",
    nameAr: "تحديث التصنيف التشغيلي واستخدام اليوم لحسابات هنقرستيشن",
    nameEn: "Update Hungerstation Operational Disposition & Day Usage",
    descriptionAr: "تغيير التصنيف التشغيلي للحساب (طبيعي، مشكلة، إيقاف إداري، محظور، مؤجل للشهر القادم) وبيانات الاستخدام المشترك",
    descriptionEn: "Change operational disposition and shared day usage for Hungerstation accounts",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.quality.import",
    module: "Hungerstation",
    nameAr: "استيراد وإعادة تخصيص الجودة التراكمية لهنقرستيشن",
    nameEn: "Import & Reallocate Hungerstation Cumulative Quality",
    descriptionAr: "تحميل القالب ومعاينة واعتماد ملفات الجودة التراكمية وعرض النتيجة وإعادة توزيع الفروقات على المناديب",
    descriptionEn: "Download template, preview, confirm, inspect and reallocate Hungerstation cumulative quality",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.quality.export",
    module: "Hungerstation",
    nameAr: "تصدير تقارير الجودة التراكمية لهنقرستيشن",
    nameEn: "Export Hungerstation Cumulative Quality",
    descriptionAr: "تصدير تقارير الجودة التراكمية الشهرية كملف إكسل (يتطلب أيضاً صلاحية hunger.read)",
    descriptionEn: "Export cumulative quality reports to Excel (also requires hunger.read)",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.performance.import",
    module: "Hungerstation",
    nameAr: "استيراد التشغيل اليومي والمقارنة اليدوية لهنقرستيشن",
    nameEn: "Import Hungerstation Daily Operations & Manual Comparison",
    descriptionAr: "تحميل القالب ورفع واعتماد شيتات التشغيل اليومي وتسجيل المقارنة اليدوية للطلبات والساعات",
    descriptionEn: "Import daily operations workbooks and record manual order/hour comparisons",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.performance.export",
    module: "Hungerstation",
    nameAr: "تصدير تقارير التشغيل اليومي لهنقرستيشن",
    nameEn: "Export Hungerstation Daily Operations",
    descriptionAr: "تصدير تقارير التشغيل اليومي لهنقرستيشن كملف إكسل (يتطلب أيضاً صلاحية hunger.read)",
    descriptionEn: "Export daily operations reports to Excel (also requires hunger.read)",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.performance.delete",
    module: "Hungerstation",
    nameAr: "حذف التشغيل اليومي لهنقرستيشن",
    nameEn: "Delete Hungerstation Daily Operations",
    descriptionAr: "حذف أداء وتشغيل يوم محدد لجميع الحسابات أو كفيل محدد لتصحيح التكليفات وإعادة الاستيراد",
    descriptionEn: "Delete daily operations and allocations for a date to allow assignment correction and reimport",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "jahez.performance.delete",
    module: "Jahez",
    nameAr: "حذف طلبات جاهز اليومية",
    nameEn: "Delete Jahez Daily Performance",
    descriptionAr: "حذف طلبات وإرساليات يوم محدد لجميع الحسابات أو كفيل محدد لتصحيح التكليفات",
    descriptionEn: "Delete daily dispatch orders for a date to allow assignment correction",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.alerts.manage",
    module: "Hungerstation",
    nameAr: "إدارة قواعد تنبيهات المتابعة المؤرخة لهنقرستيشن",
    nameEn: "Manage Hungerstation Dated Alert Rules",
    descriptionAr: "إضافة وإدارة قواعد المتابعة المؤرخة لساعات العمل الحرجة والمتابعة وعدم الحضور",
    descriptionEn: "Add and manage versioned follow-up alert rules for working hours and no-shows",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.finance.manage",
    module: "Hungerstation",
    nameAr: "إدارة التمويل والشحن والتحصيل والمحافظ والتسويات لهنقرستيشن",
    nameEn: "Manage Hungerstation Wallets, Funding, Collections & Settlements",
    descriptionAr: "تسجيل التمويل والشحن والتحصيل ومراجعة واعتماد المحفظة عند التسليم والاستلام وإثبات مستندات التسوية",
    descriptionEn: "Manage funding, top-ups, collections, wallet reviews on handover/return and settlement documents",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.finance.configure",
    module: "Hungerstation",
    nameAr: "اعتماد الربط والتهيئة المحاسبية لمشرفي هنقرستيشن",
    nameEn: "Configure & Approve Hungerstation Supervisor Accounting",
    descriptionAr: "صلاحية عالية الثقة لاعتماد ربط المشرف والكفيل بحسابات العهدة والتحصيل والمحفظة وتصفية المناديب",
    descriptionEn: "High-trust permission to configure supervisor sub-account mappings",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "hunger.remittances.confirm",
    module: "Hungerstation",
    nameAr: "تأكيد المحاسب للاستلام الفعلي لتوريدات هنقرستيشن",
    nameEn: "Accountant Confirmation of Hungerstation Remittances",
    descriptionAr: "تأكيد المحاسب لوصول واستلام مبالغ التوريدات الفعلي في حساب الخزينة المستلم",
    descriptionEn: "Accountant confirmation of actual remittance receipt into destination treasury sub-account",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_accounts.fields.identity",
    module: "PlatformAccounts",
    nameAr: "حقول الحساب المشتركة: هوية الحساب والرقم الخارجي والاسم والمنصة",
    nameEn: "Platform Account Fields: Identity, External ID, Name & Platform",
    descriptionAr: "عرض وتعديل هوية الحساب ورقم معرفه الخارجي واسمه ومنصته",
    descriptionEn: "View and update account identity, external ID, name and platform",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_accounts.fields.owner",
    module: "PlatformAccounts",
    nameAr: "حقول الحساب المشتركة: ربط صاحب الحساب (المالك)",
    nameEn: "Platform Account Fields: Account Owner Link",
    descriptionAr: "عرض وتعديل ربط صاحب الحساب (المالك) بشكل مستقل عن المندوب المكلف فعلياً",
    descriptionEn: "View and update the platform account owner link",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_accounts.fields.city",
    module: "PlatformAccounts",
    nameAr: "حقول الحساب المشتركة: مدينة الحساب",
    nameEn: "Platform Account Fields: Operating City",
    descriptionAr: "عرض وتعديل المدينة التشغيلية المرتبطة بالحساب",
    descriptionEn: "View and update the operating city of the platform account",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_accounts.fields.registry",
    module: "PlatformAccounts",
    nameAr: "حقول الحساب المشتركة: بيانات جهة وسجل التسجيل التجاري",
    nameEn: "Platform Account Fields: Commercial Registry Data",
    descriptionAr: "عرض وتعديل بيانات جهة التسجيل ورقم السجل التجاري للحساب",
    descriptionEn: "View and update commercial registration entity and number",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_accounts.fields.contact",
    module: "PlatformAccounts",
    nameAr: "حقول الحساب المشتركة: هاتف الحساب وربط الشريحة (SIM)",
    nameEn: "Platform Account Fields: Account Phone & SIM Link",
    descriptionAr: "عرض وتعديل رقم هاتف الحساب وربطه بشريحة الاتصال وملكيتها",
    descriptionEn: "View and update account phone number, SIM link and SIM ownership",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_accounts.fields.registered_vehicle",
    module: "PlatformAccounts",
    nameAr: "حقول الحساب المشتركة: المركبة المسجلة على الحساب",
    nameEn: "Platform Account Fields: Registered Vehicle",
    descriptionAr: "عرض وتعديل المركبة المسجلة على الحساب بشكل مستقل عن حركة المركبات بالأسطول",
    descriptionEn: "View and update the vehicle registered on the account independently of fleet movement",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_accounts.fields.settlement",
    module: "PlatformAccounts",
    nameAr: "حقول الحساب المشتركة: نظام تسوية المعرف",
    nameEn: "Platform Account Fields: Account Settlement System",
    descriptionAr: "عرض وتعديل نظام التصفية والتسوية المعتمد لمعرف الحساب",
    descriptionEn: "View and update the settlement system configured for the account",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_assignments.fields.compensation",
    module: "PlatformAssignments",
    nameAr: "حقول التكليف المشتركة: نظام محاسبة المندوب (عمولة / تارجت)",
    nameEn: "Platform Assignment Fields: Compensation Model (Commission / Target)",
    descriptionAr: "عرض وتعديل نظام محاسبة المندوب (Commission / Target / Unknown) بشكل مستقل عن PaymentModel",
    descriptionEn: "View and update rider compensation model (Commission / Target / Unknown)",
    isSensitive: true,
    isHighTrust: false,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
  {
    key: "platform_accounts.credentials.reveal",
    module: "PlatformAccounts",
    nameAr: "الإفصاح الفعلي عن الرقم السري لحساب المنصة",
    nameEn: "Explicitly Reveal Platform Account Credentials",
    descriptionAr: "كشف الرقم السري لحساب المنصة بطلب مستقل مسجل في التدقيق دون منحه تلقائياً من قراءة السجل",
    descriptionEn: "Explicitly reveal platform account secret credentials with audit logging",
    isSensitive: true,
    isHighTrust: true,
    requiresHousingScope: false,
    requiresClientScope: true,
  },
];

export async function getPermissionCatalogue(): Promise<PermissionCatalogItem[]> {
  try {
    const serverItems = await authFetch<PermissionCatalogItem[]>("/api/users/permissions");
    const existingKeys = new Set(serverItems.map((item) => item.key));
    const merged = [...serverItems];

    // Ensure Ninja permissions are always present as choices in the catalogue
    for (const ninjaItem of NINJA_PERMISSION_CATALOG_ITEMS) {
      if (!existingKeys.has(ninjaItem.key)) {
        merged.push(ninjaItem);
        existingKeys.add(ninjaItem.key);
      }
    }

    // Ensure Chefz permissions are always present as choices in the catalogue
    for (const chefzItem of CHEFZ_PERMISSION_CATALOG_ITEMS) {
      if (!existingKeys.has(chefzItem.key)) {
        merged.push(chefzItem);
        existingKeys.add(chefzItem.key);
      }
    }

    // Ensure Hungerstation & Shared Platform Field permissions are always present in the catalogue
    for (const hungerItem of HUNGER_PERMISSION_CATALOG_ITEMS) {
      if (!existingKeys.has(hungerItem.key)) {
        merged.push(hungerItem);
        existingKeys.add(hungerItem.key);
      }
    }

    return merged;
  } catch {
    return [
      ...NINJA_PERMISSION_CATALOG_ITEMS,
      ...CHEFZ_PERMISSION_CATALOG_ITEMS,
      ...HUNGER_PERMISSION_CATALOG_ITEMS,
    ];
  }
}
export function replaceUserRoles(
  userId: string,
  assignments: ManagedRoleAssignmentRequest[],
) {
  return authFetch<unknown>(`/api/users/${encodeURIComponent(userId)}/roles`, {
    method: "PUT",
    body: JSON.stringify({ assignments }),
  });
}
export function replaceUserPermissions(
  userId: string,
  assignments: ManagedDirectPermissionAssignmentRequest[],
) {
  return authFetch<unknown>(
    `/api/users/${encodeURIComponent(userId)}/permissions`,
    { method: "PUT", body: JSON.stringify({ assignments }) },
  );
}
export function getCurrentProfile() {
  return authFetch<CurrentUserProfile>("/api/user-profile/me");
}
export function updatePreferences(payload: {
  preferredLocale: string;
  preferredTheme: string;
  preferredDensity: string;
}) {
  return authFetch<CurrentUserProfile>("/api/user-profile/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadProfileImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return authFetch<CurrentUserProfile>("/api/user-profile/me/profile-image", {
    method: "PUT",
    body: formData,
  });
}

export function resolveProfileImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL || "https://gat.premiumasp.net"
  ).replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase}${cleanPath}`;
}

