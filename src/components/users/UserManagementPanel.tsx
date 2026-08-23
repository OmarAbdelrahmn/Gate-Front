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
const roleNames: Record<string, string> = {
  SYSTEM_ADMIN: "مسؤول النظام",
  MANAGER: "مدير",
  USER: "مستخدم عادي",
};
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("ar-SA-u-nu-arab", {
        dateStyle: "medium",
      }).format(new Date(value))
    : "غير محدد";
function AuthorizationView({ data }: { data: Authorization }) {
  const roles = data.roles ?? [];
  const permissions = data.directPermissions ?? [];
  return (
    <div className="mt-5 space-y-5">
      <section>
        <h3 className="mb-2 font-black">الأدوار المعيّنة</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.assignmentId}
              className="min-h-28 rounded-xl border border-[var(--border)] p-3"
            >
              <b>{roleNames[role.roleCode] ?? role.roleCode}</b>
              <span className="mr-2 text-xs text-[var(--muted)]" dir="ltr">
                {role.roleCode}
              </span>
              <p className="mt-1 text-xs text-[var(--muted)]">
                يبدأ: {date(role.startsAtUtc)} · ينتهي:{" "}
                {date(role.expiresAtUtc)}
              </p>
              {role.reason && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  السبب: {role.reason}
                </p>
              )}
            </div>
          ))}
          {!roles.length && (
            <p className="rounded-xl bg-slate-500/10 p-3 text-sm text-[var(--muted)]">
              لا توجد أدوار معيّنة.
            </p>
          )}
        </div>
      </section>
      <section>
        <h3 className="mb-2 font-black">
          الصلاحيات المباشرة ({permissions.length})
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {permissions.slice(0, 5).map((item) => (
            <div
              key={item.assignmentId}
              className={`min-h-28 rounded-xl border p-3 ${item.effect === "Deny" ? "border-red-200 bg-red-50/60" : "border-emerald-200 bg-emerald-50/60"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <b>{permissionLabel(item.permissionKey)}</b>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${item.effect === "Deny" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {item.effect === "Deny" ? "منع" : "مسموح"}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                يبدأ: {date(item.startsAtUtc)} · ينتهي:{" "}
                {date(item.expiresAtUtc)}
              </p>
            </div>
          ))}
        </div>
        {permissions.length > 5 && (
          <details className="mt-3">
            <summary className="cursor-pointer font-bold text-[#1167c9]">
              عرض {permissions.length - 5} صلاحيات أخرى
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {permissions.slice(5).map((item) => (
                <div
                  key={item.assignmentId}
                  className="min-h-20 rounded-xl border border-[var(--border)] p-3"
                >
                  <b>{permissionLabel(item.permissionKey)}</b>
                  <span className="mr-2 text-xs text-[var(--muted)]">
                    {item.effect === "Deny" ? "منع" : "مسموح"}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
        {!permissions.length && (
          <p className="rounded-xl bg-slate-500/10 p-3 text-sm text-[var(--muted)]">
            لا توجد صلاحيات مباشرة؛ الوصول يأتي من الدور فقط.
          </p>
        )}
      </section>
    </div>
  );
}
export function UserManagementPanel({ user, onChanged }: Props) {
  const { can } = useAuth();
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
      .catch(() => setAuthorizationError("تعذر تحميل الصلاحيات."));
  }, [canReadAuthorization, user.id]);
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("تعذر إتمام العملية. راجع البيانات والصلاحيات.");
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
      "تم تحديث بيانات المستخدم.",
    );
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="p-5 sm:p-7">
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Save size={19} />
              بيانات الحساب
            </h2>
          </div>
          <Input
            label="اسم المستخدم"
            required
            value={edit.userName}
            onChange={(e) => setEdit({ ...edit, userName: e.target.value })}
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={edit.email}
            onChange={(e) => setEdit({ ...edit, email: e.target.value })}
          />
          <Input
            label="الاسم بالعربية"
            required
            value={edit.displayNameAr}
            onChange={(e) =>
              setEdit({ ...edit, displayNameAr: e.target.value })
            }
          />
          <Input
            label="الاسم بالإنجليزية"
            value={edit.displayNameEn}
            onChange={(e) =>
              setEdit({ ...edit, displayNameEn: e.target.value })
            }
          />
          <Input
            label="رقم الجوال"
            value={edit.phoneNumber}
            onChange={(e) => setEdit({ ...edit, phoneNumber: e.target.value })}
          />
          <div className="flex items-end">
            {can("users.update") && (
              <Button loading={busy} type="submit">
                حفظ التعديلات
              </Button>
            )}
          </div>
        </form>
      </Card>
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="font-black">حالة وأمان الحساب</h2>
          <div className="mt-4 grid gap-3">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ManagedUser["status"])
              }
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="Active">نشط</option>
              <option value="Locked">مقفل</option>
              <option value="Suspended">موقوف</option>
            </select>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="سبب الإجراء"
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
                    "تم تحديث حالة الحساب.",
                  )
                }
              >
                تحديث الحالة
              </Button>
            )}
            <input
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة مرور جديدة قوية"
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
                      "تمت إعادة تعيين كلمة المرور.",
                    )
                  }
                >
                  <KeyRound size={16} />
                  إعادة تعيين
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
                      "تم إنشاء بيانات دخول مؤقتة.",
                    )
                  }
                >
                  <LockKeyhole size={16} />
                  بيانات مؤقتة
                </Button>
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() =>
                    void run(
                      () => revokeUserSessions(user.id, reason),
                      "تم إلغاء الجلسات.",
                    )
                  }
                >
                  <RotateCcw size={16} />
                  إلغاء الجلسات
                </Button>
              </div>
            )}
            {credential && (
              <div className="rounded-xl bg-orange-50 p-3 text-sm text-orange-900">
                <b>القيمة السرية — تظهر مرة واحدة:</b>
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
            <h2 className="font-black text-red-700">إجراء نهائي</h2>
            <Button
              variant="danger"
              className="mt-3"
              loading={busy}
              onClick={() =>
                void run(
                  () => archiveUser(user.id, reason, user.rowVersion),
                  "تمت أرشفة المستخدم.",
                )
              }
            >
              <Archive size={16} />
              أرشفة المستخدم
            </Button>
          </Card>
        )}
      </div>
      <div className="xl:col-span-2">
        <Card className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <ShieldCheck size={19} />
              الأدوار والصلاحيات
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
            <AuthorizationView data={authorization} />
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              جارٍ تحميل الأدوار والصلاحيات…
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
