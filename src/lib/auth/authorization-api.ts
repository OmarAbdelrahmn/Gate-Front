import { authFetch } from "./api"; import type { AuthorizationSnapshot } from "./permissions";
export function getMyAuthorization(){return authFetch<AuthorizationSnapshot>("/api/user-profile/me/authorization");}
export function getUserAuthorization(userId:string){return authFetch<AuthorizationSnapshot>(`/api/users/${encodeURIComponent(userId)}/authorization`);}
