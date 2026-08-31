import type { UserStatus } from "../auth/permissions";
export type ManagedUser = {
  id: string;
  employeeId: string | null;
  userName: string;
  email: string;
  phoneNumber: string;
  displayNameAr: string;
  displayNameEn: string;
  status: UserStatus;
  requiresPasswordChange: boolean;
  isDevelopmentOnly: boolean;
  lastLoginAtUtc: string | null;
  lastActivityAtUtc: string | null;
  createdAtUtc: string;
  rowVersion: string;
  profileImageUrl?: string | null;
};
export type CreateManagedUserRequest = {
  userName: string;
  initialPassword: string;
  displayNameAr: string;
  displayNameEn: string;
  email: string;
  phoneNumber: string;
  employeeId: string | null;
  roleAssignments?: ManagedRoleAssignmentRequest[];
  directPermissionAssignments?: ManagedDirectPermissionAssignmentRequest[];
};
export type UpdateManagedUserRequest = Omit<
  CreateManagedUserRequest,
  "initialPassword" | "roleAssignments" | "directPermissionAssignments"
> & { rowVersion: string };
export type Role = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  status: string;
  isTemplate: boolean;
  sourceTemplateId: string | null;
  rowVersion: string | null;
  isProtected?: boolean;
  permissionKeys?: string[];
};
export type RoleRequest = Omit<Role, "id">;
export type TemporaryCredential = {
  id: string;
  userId: string;
  purpose: string;
  secret: string;
  expiresAtUtc: string;
};
export type CurrentUserProfile = ManagedUser & {
  preferredLocale: string;
  preferredTheme: string;
  preferredDensity: string;
  employee?: {
    id: string;
    employeeNumber: string;
    fullNameAr: string;
    status: string;
    relationshipType: string;
    riderProfileId: string | null;
    riderStatus: string | null;
    currentAssignment: unknown | null;
  } | null;
};
export type AuthorizationScopeRequest = {
  type: "Housing" | "ClientPlatform" | "ClientContract";
  targetId: string;
};
export type ManagedRoleAssignmentRequest = {
  roleId: string;
  startsAtUtc: string | null;
  expiresAtUtc: string | null;
  reason: string | null;
  isAllHousingScope: boolean;
  isAllClientScope: boolean;
  includesFuturePlatformContracts: boolean;
  scopes: AuthorizationScopeRequest[];
};
export type ManagedDirectPermissionAssignmentRequest = {
  permissionKey: string;
  effect: "Allow" | "Deny" | "Grant";
  startsAtUtc: string | null;
  expiresAtUtc: string | null;
  reason: string | null;
  isAllHousingScope: boolean;
  isAllClientScope: boolean;
  includesFuturePlatformContracts: boolean;
  scopes: AuthorizationScopeRequest[];
};
export type PermissionCatalogItem = {
  key: string;
  module: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isSensitive: boolean;
  isHighTrust: boolean;
  requiresHousingScope: boolean;
  requiresClientScope: boolean;
};
