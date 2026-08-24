"use client";
import { FormEvent, useEffect, useState } from "react";
import {
  Archive,
  KeyRound,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getUserAuthorization } from "../../lib/auth/authorization-api";
import { permissionLabel } from "../../lib/permission-labels";
import { translate } from "../../lib/i18n";
import {
  archiveUser,
  createTemporaryCredentials,
  resetUserPassword,
  revokeUserSessions,
  updateUser,
  updateUserStatus,
} from "../../lib/users/api";
import type { ManagedUser, TemporaryCredential } from "../../lib/users/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { toast } from "../ui/Toast";

type Props = { user: ManagedUser; onChanged: (user: ManagedUser) => void };
type Role = {
  assignmentId: string;
  roleCode: string;
  startsAtUtc: string;
  expiresAtUtc: string | null;
  reason: string | null;
};
type Direct = {
  assignmentId: string;
  permissionKey: string;
  effect: "Grant" | "Deny";
  startsAtUtc: string;
  expiresAtUtc: string | null;
  reason: string | null;
};
type Authorization = {
  authorizationVersion: number;
  roles?: Role[];
  directPermissions?: Direct[];
};
const roleNames: Record<string, { ar: string; en: string }> = {
  SYSTEM_ADMIN: { ar: "مسؤول النظام", en: "System Administrator" },
  MANAGER: { ar: "مدير", en: "Manager" },
  USER: { ar: "مستخدم عادي", en: "Standard User" },
};
const formatDateVal = (value: string | null, locale: "ar" | "en" = "ar") =>
  value
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-arab" : "en-US", {
        dateStyle: "medium",
      }).format(new Date(value))
    : locale === "en"
      ? "Not specified"
      : "غير محدد";

function AuthorizationView({ data, locale = "ar" }: { data: Authorization; locale?: "ar" | "en" }) {
  const roles = data.roles ?? [];
  const permissions = data.directPermissions ?? [];
  return (
    <div className="mt-5 space-y-5">
      <section>
        <h3 className="mb-2 font-black">
          {locale === "en" ? "Assigned Roles" : "الأدوار المعيّنة"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.assignmentId}
              className="min-h-28 rounded-xl border border-[var(--border)] p-3"
            >
              <b>
                {roleNames[role.roleCode]
                  ? locale === "en"
                    ? roleNames[role.roleCode].en
                    : roleNames[role.roleCode].ar
                  : role.roleCode}
              </b>
              <span className="mx-2 text-xs text-[var(--muted)]" dir="ltr">
                {role.roleCode}
              </span>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {locale === "en" ? "Starts" : "يبدأ"}: {formatDateVal(role.startsAtUtc, locale)} · {locale === "en" ? "Expires" : "ينتهي"}:{" "}
                {formatDateVal(role.expiresAtUtc, locale)}
              </p>
              {role.reason && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {locale === "en" ? "Reason" : "السبب"}: {role.reason}
                </p>
              )}
            </div>
          ))}
          {!roles.length && (
            <p className="rounded-xl bg-slate-500/10 p-3 text-sm text-[var(--muted)]">
              {locale === "en" ? "No roles assigned." : "لا توجد أدوار معيّنة."}
            </p>
          )}
        </div>
      </section>
      <section>
        <h3 className="mb-2 font-black">
          {locale === "en" ? "Direct Permissions" : "الصلاحيات المباشرة"} ({permissions.length})
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {permissions.slice(0, 5).map((item) => (
            <div
              key={item.assignmentId}
              className={`min-h-28 rounded-xl border p-3 ${item.effect === "Deny" ? "border-red-200 bg-red-50/60" : "border-emerald-200 bg-emerald-50/60"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <b>{permissionLabel(item.permissionKey, locale)}</b>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${item.effect === "Deny" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {item.effect === "Deny" ? (locale === "en" ? "Deny" : "منع") : (locale === "en" ? "Grant" : "مسموح")}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {locale === "en" ? "Starts" : "يبدأ"}: {formatDateVal(item.startsAtUtc, locale)} · {locale === "en" ? "Expires" : "ينتهي"}:{" "}
                {formatDateVal(item.expiresAtUtc, locale)}
              </p>
            </div>
          ))}
        </div>
        {permissions.length > 5 && (
          <details className="mt-3">
            <summary className="cursor-pointer font-bold text-[#1167c9]">
              {locale === "en" ? `Show ${permissions.length - 5} more permissions` : `عرض ${permissions.length - 5} صلاحيات أخرى`}
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {permissions.slice(5).map((item) => (
                <div
                  key={item.assignmentId}
                  className="min-h-20 rounded-xl border border-[var(--border)] p-3"
                >
                  <b>{permissionLabel(item.permissionKey, locale)}</b>
                  <span className="mx-2 text-xs text-[var(--muted)]">
                    {item.effect === "Deny" ? (locale === "en" ? "Deny" : "منع") : (locale === "en" ? "Grant" : "مسموح")}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
        {!permissions.length && (
          <p className="rounded-xl bg-slate-500/10 p-3 text-sm text-[var(--muted)]">
            {locale === "en"
              ? "No direct permissions; access is derived from role assignments only."
              : "لا توجد صلاحيات مباشرة؛ الوصول يأتي من الدور فقط."}
          </p>
        )}
      </section>
    </div>
  );
}

export function UserManagementPanel({ user, onChanged }: Props) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState(user.status);
  const [credential, setCredential] = useState<TemporaryCredential | null>(
    null,
  );
  const [authorization, setAuthorization] = useState<Authorization | null>(
    null,
  );
  const [authorizationError, setAuthorizationError] = useState("");
  const [edit, setEdit] = useState({
    userName: user.userName ?? "",
    displayNameAr: user.displayNameAr ?? "",
    displayNameEn: user.displayNameEn ?? "",
    email: user.email ?? "",
    phoneNumber: user.phoneNumber ?? "",
    employeeId: user.employeeId,
  });
  const canReadAuthorization = can("permissions.read");
  useEffect(() => {
    if (!canReadAuthorization) return;
    void getUserAuthorization(user.id)
      .then((data) => setAuthorization(data as Authorization))
      .catch(() => setAuthorizationError(locale === "en" ? "Unable to load permissions." : "تعذر تحميل الصلاحيات."));
  }, [canReadAuthorization, user.id, locale]);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      toast.success(
        locale === "en" ? "Action Successful" : "تمت العملية بنجاح",
        success
      );
    } catch (err: any) {
      const msg =
        err?.message ||
        (locale === "en"
          ? "Operation failed. Check inputs and permissions."
          : "تعذر إتمام العملية. راجع البيانات والصلاحيات.");
      setMessage(msg);
      toast.error(
        locale === "en" ? "Operation Failed" : "فشلت العملية",
        msg
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    await run(
      async () =>
        onChanged(
          await updateUser(user.id, { ...edit, rowVersion: user.rowVersion }),
        ),
      locale === "en" ? "User details updated successfully." : "تم تحديث بيانات المستخدم.",
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="p-5 sm:p-7">
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Save size={19} />
              {locale === "en" ? "Account Details" : "بيانات الحساب"}
            </h2>
          </div>
          <Input
            label={locale === "en" ? "Username" : "اسم المستخدم"}
            required
            value={edit.userName}
            onChange={(e) => setEdit({ ...edit, userName: e.target.value })}
          />
          <Input
            label={locale === "en" ? "Email Address" : "البريد الإلكتروني"}
            type="email"
            value={edit.email}
            onChange={(e) => setEdit({ ...edit, email: e.target.value })}
          />
          <Input
            label={locale === "en" ? "Arabic Display Name" : "الاسم بالعربية"}
            required
            value={edit.displayNameAr}
            onChange={(e) =>
              setEdit({ ...edit, displayNameAr: e.target.value })
            }
          />
          <Input
            label={locale === "en" ? "English Display Name" : "الاسم بالإنجليزية"}
            value={edit.displayNameEn}
            onChange={(e) =>
              setEdit({ ...edit, displayNameEn: e.target.value })
            }
          />
          <Input
            label={locale === "en" ? "Phone Number" : "رقم الجوال"}
            value={edit.phoneNumber}
            onChange={(e) => setEdit({ ...edit, phoneNumber: e.target.value })}
          />
          <div className="flex items-end">
            {can("users.update") && (
              <Button loading={busy} type="submit">
                {t("common.save")}
              </Button>
            )}
          </div>
        </form>
      </Card>
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="font-black">
            {locale === "en" ? "Account Status & Security" : "حالة وأمان الحساب"}
          </h2>
          <div className="mt-4 grid gap-3">
            <select
              aria-label={locale === "en" ? "Account status" : "حالة الحساب"}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ManagedUser["status"])
              }
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="Active">{locale === "en" ? "Active" : "نشط"}</option>
              <option value="Locked">{locale === "en" ? "Locked" : "مقفل"}</option>
              <option value="Suspended">{locale === "en" ? "Suspended" : "موقوف"}</option>
            </select>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={locale === "en" ? "Reason for action" : "سبب الإجراء"}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            />
            {can("users.update") && (
              <Button
                loading={busy}
                onClick={() =>
                  void run(
                    async () =>
                      onChanged(
                        await updateUserStatus(
                          user.id,
                          status,
                          reason,
                          user.rowVersion,
                        ),
                      ),
                    locale === "en" ? "Account status updated." : "تم تحديث حالة الحساب.",
                  )
                }
              >
                {locale === "en" ? "Update Status" : "تحديث الحالة"}
              </Button>
            )}
            <input
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder={locale === "en" ? "New strong password" : "كلمة مرور جديدة قوية"}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            />
            {can("users.update") && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() =>
                    void run(
                      () => resetUserPassword(user.id, password),
                      locale === "en" ? "Password reset successfully." : "تمت إعادة تعيين كلمة المرور.",
                    )
                  }
                >
                  <KeyRound size={16} />
                  {locale === "en" ? "Reset Password" : "إعادة تعيين"}
                </Button>
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() =>
                    void run(
                      async () =>
                        setCredential(
                          await createTemporaryCredentials(
                            user.id,
                            "Password reset",
                            30,
                          ),
                        ),
                      locale === "en" ? "Temporary credentials generated." : "تم إنشاء بيانات دخول مؤقتة.",
                    )
                  }
                >
                  <LockKeyhole size={16} />
                  {locale === "en" ? "Temp Credentials" : "بيانات مؤقتة"}
                </Button>
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() =>
                    void run(
                      () => revokeUserSessions(user.id, reason),
                      locale === "en" ? "Sessions revoked successfully." : "تم إلغاء الجلسات.",
                    )
                  }
                >
                  <RotateCcw size={16} />
                  {locale === "en" ? "Revoke Sessions" : "إلغاء الجلسات"}
                </Button>
              </div>
            )}
            {credential && (
              <div className="rounded-xl bg-orange-50 p-3 text-sm text-orange-900">
                <b>{locale === "en" ? "Secret Credential — shown once:" : "القيمة السرية — تظهر مرة واحدة:"}</b>
                <code
                  className="mt-2 block break-all rounded bg-white p-2"
                  dir="ltr"
                >
                  {credential.secret}
                </code>
              </div>
            )}
          </div>
        </Card>
        {can("users.archive") && (
          <Card className="border-red-200 p-5">
            <h2 className="font-black text-red-700">
              {locale === "en" ? "Final Action" : "إجراء نهائي"}
            </h2>
            <Button
              variant="danger"
              className="mt-3"
              loading={busy}
              onClick={() =>
                void run(
                  () => archiveUser(user.id, reason, user.rowVersion),
                  locale === "en" ? "User archived successfully." : "تمت أرشفة المستخدم.",
                )
              }
            >
              <Archive size={16} />
              {locale === "en" ? "Archive User" : "أرشفة المستخدم"}
            </Button>
          </Card>
        )}
      </div>
      <div className="xl:col-span-2">
        <Card className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <ShieldCheck size={19} />
              {locale === "en" ? "Roles & Permissions" : "الأدوار والصلاحيات"}
            </h2>
          </div>
          {message && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-800"
            >
              {message}
            </p>
          )}
          {authorizationError ? (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {authorizationError}
            </p>
          ) : authorization ? (
            <AuthorizationView data={authorization} locale={locale} />
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {locale === "en" ? "Loading roles and permissions..." : "جارٍ تحميل الأدوار والصلاحيات…"}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
