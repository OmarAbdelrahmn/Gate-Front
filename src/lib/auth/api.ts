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

export function extractErrorMessageFromBody(body: any): string | null {
  if (!body) return null;
  if (typeof body === "string") return body.trim() || null;

  const subErrors: string[] = [];

  // 1. Check identityErrors array (e.g. ASP.NET Identity / UserManagement)
  if (Array.isArray(body.identityErrors) && body.identityErrors.length > 0) {
    for (const err of body.identityErrors) {
      if (typeof err === "string" && err.trim()) {
        subErrors.push(err.trim());
      } else if (err && typeof err === "object") {
        const msg = err.description || err.message || err.detail || err.code;
        if (msg && typeof msg === "string" && msg.trim()) {
          subErrors.push(msg.trim());
        }
      }
    }
  }

  // 2. Check errors property (dictionary or array)
  if (body.errors) {
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      for (const err of body.errors) {
        if (typeof err === "string" && err.trim()) {
          subErrors.push(err.trim());
        } else if (err && typeof err === "object") {
          const msg = err.description || err.message || err.detail || err.code;
          if (msg && typeof msg === "string" && msg.trim()) {
            subErrors.push(msg.trim());
          }
        }
      }
    } else if (typeof body.errors === "object") {
      for (const [field, errs] of Object.entries(body.errors)) {
        if (!errs) continue;
        const fieldStr = Array.isArray(errs)
          ? errs.filter(Boolean).join(", ")
          : String(errs);
        if (fieldStr.trim()) {
          subErrors.push(`${field}: ${fieldStr.trim()}`);
        }
      }
    }
  }

  const mainDetail =
    (typeof body.detail === "string" && body.detail.trim()) ||
    (typeof body.message === "string" && body.message.trim()) ||
    (typeof body.error === "string" && body.error.trim()) ||
    null;

  if (subErrors.length > 0) {
    const formattedSub = subErrors.join(" | ");
    if (mainDetail && !formattedSub.includes(mainDetail)) {
      return `${mainDetail} (${formattedSub})`;
    }
    return formattedSub;
  }

  return (
    mainDetail ||
    (typeof body.title === "string" && body.title.trim()) ||
    null
  );
}

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
      case "phone_sim.invalid_phone_number":
        return "رقم الهاتف غير صحيح. يرجى إدخال رقم هاتف صالح بالصيغة المحلية أو الدولية.";
      case "phone_sim.invalid_iccid":
        return "رمز ICCID غير صحيح. يجب أن يتكون من 18 إلى 22 رقماً ويبدأ بـ 89.";
      case "phone_sim.invalid_status":
        return "حالة الشريحة المحددة غير صالحة لهذا الإجراء.";
      case "phone_sim.invalid_date_range":
        return "تاريخ التعيين غير صالح. يرجى التحقق من تواريخ البداية والنهاية.";
      case "phone_sim.responsible_employee_not_found":
        return "لم يتم العثور على الموظف المسؤول المحدد.";
      case "phone_sim.responsible_employee_unavailable":
        return "الموظف المسؤول غير متاح، يرجى اختيار موظف داخلي نشط.";
      case "phone_sim.rider_not_found":
        return "لم يتم العثور على ملف المندوب المحدد.";
      case "phone_sim.rider_unavailable":
        return "المندوب غير متاح حالياً للتعيين، يرجى اختيار مندوب نشط.";
      case "phone_sim.duplicate_phone_number":
        return "رقم الهاتف مستخدم بالفعل لشريحة أخرى في النظام.";
      case "phone_sim.duplicate_iccid":
        return "رمز ICCID مستخدم بالفعل لشريحة أخرى في النظام.";
      case "phone_sim.active_assignment_conflict":
        return "توجد عملية تعيين نشطة حالياً لهذه الشريحة. يرجى إنهاء التعيين الحالي أولاً.";
      case "phone_sim.assignment_conflict":
        return "يوجد تعارض في التعيين. يرجى مراجعة سجل التعيينات واختيار تاريخ بدء صالح.";
      case "phone_sim.concurrency_conflict":
        return "تم تعديل بيانات الشريحة بواسطة مستخدم آخر. يرجى إعادة تحميل الصفحة والمحاولة مجدداً.";
      case "fleet.invalid_request":
        return "طلب غير صالح. يرجى التأكد من التواريخ واختيار كفيلين مختلفين ومركبات صالحة.";
      case "fleet.lease_vehicle_sponsor_mismatch":
        return "المركبة المحددة لا تنتمي إلى الكفيل المؤجر الأصلي.";
      case "fleet.lease_period_conflict":
        return "توجد اتفاقية تأجير كفيل نشطة أو متداخلة للمركبة المحددة في منصة كيتا.";
      case "fleet.keeta_platform_unavailable":
        return "سجل منصة كيتا غير متاح في الكتالوج حالياً.";
      case "fleet.concurrency_conflict":
        return "تم تعديل الاتفاقية أو التعيين بواسطة مستخدم آخر. يرجى إعادة تحميل البيانات والمحاولة مجدداً.";
      case "fleet.return_condition_report_required":
        return "تقرير حالة المركبة مطلوب عندما تكون حالة المركبة غير جيدة.";
      case "fleet.return_condition_report_not_allowed":
        return "لا يمكن إرفاق تقرير حالة عند إرجاع المركبة بحالة جيدة.";
      case "fleet.invalid_file":
        return "الملف المرفق غير صالح. صيغ الملفات المقبولة: PDF, JPEG, PNG, WebP, GIF, BMP بحجم أقصى 10 ميجابايت.";
      case "fleet.idempotency_required":
        return "مطلوب مفتاح تكرار الطلب (Idempotency Key).";
      case "fleet.idempotency_conflict":
        return "تعارض في مفتاح التكرار. تم تغيير البيانات أو الملفات.";
      case "fleet.not_found":
        return "السجل المطلوب غير موجود أو تم حذفه.";
      case "fleet.forbidden":
        return "عفواً، لا تملك الصلاحية اللازمة لتنفيذ هذا الإجراء.";
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
      if (
        rawMessage &&
        typeof rawMessage === "string" &&
        (rawMessage.toLowerCase().includes("another device") ||
          rawMessage.toLowerCase().includes("signed out") ||
          rawMessage.toLowerCase().includes("session"))
      ) {
        return "تم تسجيل الخروج لأن الحساب تم استخدامه لتسجيل الدخول من جهاز آخر (يُسمح بجلسة نشطة واحدة فقط لكل حساب).";
      }
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

export function getDefaultDeviceLabel(): string {
  if (typeof window === "undefined") return "Web Browser";
  const ua = window.navigator.userAgent;
  if (/mobile|android|iphone|ipad/i.test(ua)) return "Mobile Browser";
  if (/macintosh|mac os x/i.test(ua)) return "Mac PC";
  if (/windows/i.test(ua)) return "Windows PC";
  if (/linux/i.test(ua)) return "Linux PC";
  return "Web Browser";
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
    const rawMsg = extractErrorMessageFromBody(body);
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
    try {
      await refreshAccessToken();
      return request<T>(path, init, true, false);
    } catch {
      clearAuth();
    }
  }
  if (response.status === 401 && includeAccessToken) clearAuth();
  return parseResponse<T>(response, {
    notifySuccess: init.notifySuccess,
    suppressErrorToast: init.suppressErrorToast,
    method: init.method || "GET",
  });
}
export async function login(payload: LoginRequest) {
  const label = payload.deviceLabel?.trim() || getDefaultDeviceLabel();
  const bodyPayload = {
    login: payload.login.trim(),
    password: payload.password,
    deviceLabel: label.slice(0, 200),
  };
  const auth = await request<AuthenticationTokenResponse>("/login", {
    method: "POST",
    body: JSON.stringify(bodyPayload),
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
    try {
      const refreshed = await refreshAccessToken();
      headers.set("Authorization", `${refreshed.tokenType} ${refreshed.accessToken}`);
      response = await fetch(url, { headers, cache: "no-store" });
    } catch {
      clearAuth();
      throw new Error("انتهت الجلسة، يرجى إعادة تسجيل الدخول.");
    }
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const rawMsg = extractErrorMessageFromBody(errorBody);
    const friendlyMsg = getFriendlyErrorMessage(response.status, rawMsg, errorBody?.errorCode);
    throw new Error(friendlyMsg || "تعذر تنزيل الملف");
  }
  return { blob: await response.blob(), fileName: response.headers.get("content-disposition")?.match(/filename\*?=(?:UTF-8'')?[\"']?([^\"';]+)/i)?.[1] ?? "document" };
}
export async function authPreviewBlob(path: string) {
  const auth = readAuth();
  const headers = new Headers();
  if (auth) headers.set("Authorization", `${auth.tokenType} ${auth.accessToken}`);
  const url = path.startsWith("/api/") ? `${API_BASE_URL}${path}` : `${AUTH_ROUTE}${path}`;
  let response = await fetch(url, { headers, cache: "no-store" });
  if (response.status === 401 && auth?.refreshToken) {
    try {
      const refreshed = await refreshAccessToken();
      headers.set("Authorization", `${refreshed.tokenType} ${refreshed.accessToken}`);
      response = await fetch(url, { headers, cache: "no-store" });
    } catch {
      clearAuth();
      throw new Error("انتهت الجلسة، يرجى إعادة تسجيل الدخول.");
    }
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const rawMsg = extractErrorMessageFromBody(errorBody);
    const friendlyMsg = getFriendlyErrorMessage(response.status, rawMsg, errorBody?.errorCode);
    throw new Error(friendlyMsg || "تعذر عرض الوثيقة");
  }
  const blob = await response.blob();
  const contentType = response.headers.get("content-type") || blob.type || "application/pdf";
  return { blob, contentType, url: URL.createObjectURL(blob) };
}
