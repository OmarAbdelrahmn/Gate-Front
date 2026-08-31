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
  TemporaryCredential,
  UpdateManagedUserRequest,
} from "./types";
export function listUsers(search = "") {
  return authFetch<ManagedUser[]>(
    `/api/users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );
}
export function getUser(userId: string) {
  return authFetch<ManagedUser>(`/api/users/${encodeURIComponent(userId)}`);
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
export function archiveUser(
  userId: string,
  reason: string,
  rowVersion: string,
) {
  return authFetch<void>(`/api/users/${encodeURIComponent(userId)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason, rowVersion }),
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
export function getPermissionCatalogue() {
  return authFetch<PermissionCatalogItem[]>("/api/users/permissions");
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
    process.env.NEXT_PUBLIC_API_URL || "https://gate.premiumasp.net"
  ).replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase}${cleanPath}`;
}

