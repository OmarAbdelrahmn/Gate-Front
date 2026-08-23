import { clearAuth, readAuth, writeAuth } from "./token-store";
import type {
  AuthApiError,
  AuthSession,
  AuthenticationTokenResponse,
  ChangePasswordRequest,
  LoginRequest,
} from "./types";
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const AUTH_ROUTE = `${API_BASE_URL}/api/auth`;
let refreshPromise: Promise<AuthenticationTokenResponse> | null = null;
async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      body?.message ?? "حدث خطأ في المصادقة",
    ) as AuthApiError;
    error.status = response.status;
    error.details = body;
    throw error;
  }
  return body as T;
}
async function request<T>(
  path: string,
  init: RequestInit = {},
  includeAccessToken = false,
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (includeAccessToken) {
    const auth = readAuth();
    if (auth)
      headers.set("Authorization", `${auth.tokenType} ${auth.accessToken}`);
  }
  const url = path.startsWith("/api/")
    ? `${API_BASE_URL}${path}`
    : `${AUTH_ROUTE}${path}`;
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  if (
    response.status === 401 &&
    includeAccessToken &&
    retry &&
    readAuth()?.refreshToken
  ) {
    await refreshAccessToken();
    return request<T>(path, init, true, false);
  }
  if (response.status === 401 && includeAccessToken) clearAuth();
  return parseResponse<T>(response);
}
export async function login(payload: LoginRequest) {
  const auth = await request<AuthenticationTokenResponse>("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  writeAuth(auth);
  return auth;
}
export async function refreshAccessToken() {
  const current = readAuth();
  if (!current?.refreshToken) throw new Error("لا توجد جلسة قابلة للتحديث");
  if (!refreshPromise)
    refreshPromise = request<AuthenticationTokenResponse>("/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
      .then((auth) => {
        writeAuth(auth);
        return auth;
      })
      .catch((error) => {
        clearAuth();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  return refreshPromise;
}
export async function logout() {
  await request<void>("/logout", { method: "POST" }, true);
  clearAuth();
}
export async function logoutAll() {
  await request<void>("/logout-all", { method: "POST" }, true);
  clearAuth();
}
export async function changePassword(payload: ChangePasswordRequest) {
  const auth = await request<AuthenticationTokenResponse>(
    "/change-password",
    { method: "POST", body: JSON.stringify(payload) },
    true,
  );
  writeAuth(auth);
  return auth;
}
export async function listSessions() {
  return request<AuthSession[]>("/sessions", {}, true);
}
export async function revokeSession(sessionId: string) {
  return request<void>(
    `/sessions/${encodeURIComponent(sessionId)}/revoke`,
    { method: "POST" },
    true,
  );
}
export async function authFetch<T>(path: string, init: RequestInit = {}) {
  return request<T>(path, init, true);
}
export async function authDownload(path: string) {
  const auth = readAuth();
  const headers = new Headers();
  if (auth) headers.set("Authorization", `${auth.tokenType} ${auth.accessToken}`);
  const url = path.startsWith("/api/") ? `${API_BASE_URL}${path}` : `${AUTH_ROUTE}${path}`;
  let response = await fetch(url, { headers, cache: "no-store" });
  if (response.status === 401 && auth?.refreshToken) {
    const refreshed = await refreshAccessToken();
    headers.set("Authorization", `${refreshed.tokenType} ${refreshed.accessToken}`);
    response = await fetch(url, { headers, cache: "no-store" });
  }
  if (!response.ok) throw new Error("تعذر تنزيل الملف");
  return { blob: await response.blob(), fileName: response.headers.get("content-disposition")?.match(/filename\*?=(?:UTF-8'')?[\"']?([^\"';]+)/i)?.[1] ?? "document" };
}
