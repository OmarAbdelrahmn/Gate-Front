import { clearAuth, readAuth, writeAuth } from "./token-store";
import { toast } from "../../components/ui/Toast";
import type {
  AuthApiError,
  AuthSession,
  AuthenticationTokenResponse,
  ChangePasswordRequest,
  LoginRequest,
} from "./types";
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://gate.premiumasp.net"
).replace(/\/$/, "");
const AUTH_ROUTE = `${API_BASE_URL}/api/auth`;
let refreshPromise: Promise<AuthenticationTokenResponse> | null = null;

export type CustomRequestInit = RequestInit & {
  notifySuccess?: boolean | string;
  suppressErrorToast?: boolean;
};

export function getFriendlyErrorMessage(
  status: number,
  rawMessage?: string | null,
  errorCode?: string | null,
): string {
  if (errorCode) {
    switch (errorCode) {
      case "platform.payment_model_not_supported":
        return "نموذج الدفع غير مدعوم للمنصة المحددة. يرجى تحديث المنصة واختيار نموذج من النماذج المدعومة.";
      case "platform.payment_models_in_use":
        return "لا يمكن إزالة نموذج الدفع لأن هناك حسابات غير مؤرشفة تستخدمه حالياً.";
      case "platform.rider_account_limit_reached":
        return "المندوب لديه حسابان نشطان بالفعل. يرجى إنهاء تعيين حساب قبل تعيين حساب آخر.";
      case "platform.rider_salary_account_limit_reached":
        return "المندوب لديه حساب راتب (Salary) نشط بالفعل. استخدم PayPerOrder أو أنهِ تعيين حساب الراتب الحالي.";
      case "platform.rider_profile_not_found":
        return "لم يتم العثور على ملف المندوب. يرجى التأكد من اختيار مندوب يملك ملف سائق صالح (Rider Profile ID).";
      case "platform.rider_profile_unavailable":
        return "ملف المندوب غير متاح حالياً أو غير مؤهل لتعيين حساب منصة.";
      case "hr.concurrency_conflict":
        return "حدث تعارض في التحديث بالتزامن. يرجى إعادة تحميل البيانات والمحاولة مجدداً.";
      case "hr.invalid_request":
        return "طلب غير صالح. يرجى التأكد من صحة البيانات والمدخلات.";
    }
  }

  if (
    rawMessage &&
    typeof rawMessage === "string" &&
    !rawMessage.toLowerCase().includes("http") &&
    !rawMessage.match(/^[0-9]{3}$/) &&
    !rawMessage.includes("401") &&
    !rawMessage.includes("403") &&
    !rawMessage.includes("500")
  ) {
    return rawMessage;
  }

  switch (status) {
    case 400:
      return "البيانات المدخلة غير صحيحة، يرجى التأكد من صحة المدخلات وإعادة المحاولة.";
    case 401:
      return "انتهت جلسة العمل الخاصة بك، يرجى إعادة تسجيل الدخول للاستمرار.";
    case 403:
      return "عفواً، لا تملك الصلاحيات المطلوبة لتنفيذ هذا الإجراء.";
    case 404:
      return "المعلومات المطلوبة غير موجودة في النظام.";
    case 409:
      return "يوجد تعارض في البيانات، أو السجل موجود مسبقاً.";
    case 422:
      return "البيانات غير مكتملة أو لا تستوفي شروط النظام.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "حدث خطأ في خوادم النظام، يرجى المحاولة مرة أخرى لاحقاً.";
    default:
      return rawMessage || "تعذر إكمال الطلب، يرجى إعادة المحاولة.";
  }
}

async function parseResponse<T>(
  response: Response,
  options?: { notifySuccess?: boolean | string; suppressErrorToast?: boolean; method?: string }
): Promise<T> {
  if (response.status === 204) {
    if (typeof window !== "undefined" && options?.notifySuccess) {
      const msg = typeof options.notifySuccess === "string" ? options.notifySuccess : "تمت العملية بنجاح";
      toast.success("تم بنجاح", msg);
    }
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    let rawMsg: string | null = null;
    if (body?.errors && typeof body.errors === "object" && !Array.isArray(body.errors)) {
      const errMsgs = Object.entries(body.errors)
        .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(", ") : errs}`)
        .join(" | ");
      if (errMsgs) rawMsg = errMsgs;
    }
    if (!rawMsg) {
      rawMsg =
        body?.detail ||
        body?.message ||
        body?.error ||
        body?.title ||
        (typeof body === "string" ? body : null);
    }

    const errorCode = body?.errorCode || body?.code;
    const friendlyMsg = getFriendlyErrorMessage(response.status, rawMsg, errorCode);

    const error = new Error(friendlyMsg) as AuthApiError;
    error.status = response.status;
    error.details = body;

    const isGet = options?.method === "GET";
    const shouldShowToast = !options?.suppressErrorToast && response.status !== 404 && !isGet;

    if (typeof window !== "undefined" && shouldShowToast) {
      toast.error("تنبيه من النظام", friendlyMsg, {
        status: response.status,
        details: body,
      });
    }

    throw error;
  }

  if (typeof window !== "undefined" && options?.notifySuccess) {
    const msg =
      typeof options.notifySuccess === "string"
        ? options.notifySuccess
        : body?.message || "تمت العملية بنجاح";
    toast.success("تم بنجاح", msg, { status: response.status, details: body });
  }

  return body as T;
}

async function request<T>(
  path: string,
  init: CustomRequestInit = {},
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
  return parseResponse<T>(response, {
    notifySuccess: init.notifySuccess,
    suppressErrorToast: init.suppressErrorToast,
    method: init.method || "GET",
  });
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
export async function authFetch<T>(path: string, init: CustomRequestInit = {}) {
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
export async function authPreviewBlob(path: string) {
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
  if (!response.ok) throw new Error("تعذر عرض الوثيقة");
  const blob = await response.blob();
  const contentType = response.headers.get("content-type") || blob.type || "application/pdf";
  return { blob, contentType, url: URL.createObjectURL(blob) };
}
