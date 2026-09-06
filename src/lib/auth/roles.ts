import type { AuthUser } from "./types";

/**
 * Resolves the initial landing route for a user based on their roles.
 */
export function getDefaultRouteForUser(user: AuthUser | null): string {
  if (!user) return "/login";
  if (user.requiresPasswordChange) return "/change-password";

  const userRoles = (user.roles || []).map((r) => r.toLowerCase());

  if (userRoles.includes("admin")) return "/admin";
  if (userRoles.includes("manager")) return "/manager";
  if (userRoles.includes("accountant")) return "/accountant";
  if (userRoles.includes("member")) return "/member";

  return "/admin";
}
