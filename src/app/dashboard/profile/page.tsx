"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { getMyAuthorization } from "../../../lib/auth/authorization-api";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { permissionLabel } from "../../../lib/permission-labels";
import { getCurrentProfile } from "../../../lib/users/api";
import type { CurrentUserProfile } from "../../../lib/users/types";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

type Preferences = {
  locale: "ar" | "en";
  theme: "light" | "dark";
  density: "comfortable" | "compact";
};
const roleNames: Record<string, string> = {
  SYSTEM_ADMIN: "مسؤول النظام",
  MANAGER: "مدير",
  USER: "مستخدم عادي",
  Admin: "مسؤول",
  Member: "عضو",
  Accountant: "محاسب",
};
const roleCode = (item: unknown) =>
  typeof item === "string"
    ? item
    : typeof item === "object" && item !== null && "roleCode" in item
      ? String((item as { roleCode: unknown }).roleCode)
      : typeof item === "object" && item !== null && "code" in item
        ? String((item as { code: unknown }).code)
        : "—";

export default function ProfilePage() {
  const { locale, theme, density, setPreferences, user } = useAuth();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [authorization, setAuthorization] = useState<{
    roles?: unknown[];
    effectivePermissionKeys?: string[];
    deniedPermissionKeys?: string[];
  } | null>(null);
  const [preferences, setLocalPreferences] = useState<Preferences>({
    locale,
    theme,
    density,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    setLocalPreferences({ locale, theme, density });
  }, [density, locale, theme]);
  useEffect(() => {
    void Promise.allSettled([getCurrentProfile(), getMyAuthorization()]).then(
      ([profileResult, authorizationResult]) => {
        if (profileResult.status === "fulfilled")
          setProfile(profileResult.value);
        else setError("تعذر تحميل ملفك الشخصي.");
        if (authorizationResult.status === "fulfilled")
          setAuthorization(authorizationResult.value);
        setLoading(false);
      },
    );
  }, []);
  const permissions = useMemo(
    () => authorization?.effectivePermissionKeys ?? [],
    [authorization],
  );
  const roles = useMemo(() => {
    const assigned = authorization?.roles ?? [];
    return assigned.length ? assigned : (user?.roles ?? []);
  }, [authorization?.roles, user?.roles]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await setPreferences(preferences);
      setMessage("تم حفظ تفضيلاتك.");
    } catch {
      setMessage("تعذر حفظ التفضيلات.");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <p className="py-16 text-center text-sm text-[var(--muted)]">
        جارٍ تحميل ملفك الشخصي…
      </p>
    );
  if (error || !profile)
    return (
      <Card className="p-6">
        <p role="alert" className="text-red-700">
          {error || "تعذر تحميل ملفك الشخصي."}
        </p>
      </Card>
    );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-[#1167c9]">الحساب</p>
        <h1 className="mt-1 text-3xl font-black">ملفي الشخصي</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          بيانات حسابك وتفضيلات العرض والصلاحيات المتاحة لك.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-[#1167c9]">
                <UserRound size={26} />
              </div>
              <div>
                <h2 className="text-xl font-black">
                  {profile.displayNameAr || profile.displayNameEn}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  @{profile.userName}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
                  {profile.status === "Active" ? "حساب نشط" : profile.status}
                </span>
              </div>
            </div>
            <dl className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
              <Info label="البريد الإلكتروني" value={profile.email} dir="ltr" />
              <Info
                label="رقم الجوال"
                value={profile.phoneNumber || "غير مسجل"}
                dir="ltr"
              />
              <Info
                label="آخر دخول"
                value={
                  profile.lastLoginAtUtc
                    ? new Intl.DateTimeFormat("ar-SA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(profile.lastLoginAtUtc))
                    : "غير متاح"
                }
              />
              <Info
                label="آخر نشاط"
                value={
                  profile.lastActivityAtUtc
                    ? new Intl.DateTimeFormat("ar-SA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(profile.lastActivityAtUtc))
                    : "غير متاح"
                }
              />
            </dl>
          </Card>
          {profile.employee && (
            <Card className="p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <BriefcaseBusiness size={19} />
                بيانات العمل
              </h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Info label="اسم الموظف" value={profile.employee.fullNameAr} />
                <Info
                  label="رقم الموظف"
                  value={profile.employee.employeeNumber}
                  dir="ltr"
                />
                <Info
                  label="نوع العلاقة"
                  value={profile.employee.relationshipType}
                />
                <Info label="حالة الموظف" value={profile.employee.status} />
                <Info
                  label="تكليف حالي"
                  value={
                    profile.employee.currentAssignment
                      ? "يوجد تكليف حالي"
                      : "لا يوجد تكليف حالي"
                  }
                />
              </dl>
            </Card>
          )}
          <Card className="p-5 sm:p-7">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <ShieldCheck size={19} />
              التفويض والصلاحيات
            </h2>
            <div className="mt-5">
              <h3 className="text-sm font-black">الأدوار</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.map((role, index) => (
                  <span
                    key={`${roleCode(role)}-${index}`}
                    className="rounded-full bg-blue-500/10 px-3 py-1 text-sm font-bold text-[#1167c9]"
                  >
                    {roleNames[roleCode(role)] ?? roleCode(role)}
                  </span>
                ))}
                {!roles.length && (
                  <span className="text-sm text-[var(--muted)]">
                    لا توجد أدوار ظاهرة.
                  </span>
                )}
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-black">
                الصلاحيات الفعّالة ({permissions.length})
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {permissions.slice(0, 12).map((permission) => (
                  <div
                    key={permission}
                    className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-800"
                  >
                    <BadgeCheck size={16} className="shrink-0" />
                    {permissionLabel(permission)}
                  </div>
                ))}
              </div>
              {permissions.length > 12 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-bold text-[#1167c9]">
                    عرض {permissions.length - 12} صلاحيات أخرى
                  </summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {permissions.slice(12).map((permission) => (
                      <div
                        key={permission}
                        className="rounded-xl border border-[var(--border)] p-3 text-sm font-bold"
                      >
                        {permissionLabel(permission)}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="h-fit p-5 sm:p-7">
            <h2 className="text-lg font-black">تفضيلات العرض</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              اختر اللغة والمظهر وكثافة البيانات المناسبة لك.
            </p>
            <form onSubmit={save} className="mt-6 space-y-5">
              <fieldset>
                <legend className="mb-2 text-sm font-bold">اللغة</legend>
                <div className="grid grid-cols-2 gap-2">
                  <Option
                    label="العربية"
                    active={preferences.locale === "ar"}
                    onClick={() =>
                      setLocalPreferences({ ...preferences, locale: "ar" })
                    }
                  />
                  <Option
                    label="English"
                    active={preferences.locale === "en"}
                    onClick={() =>
                      setLocalPreferences({ ...preferences, locale: "en" })
                    }
                  />
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Globe2 size={16} />
                  كثافة العرض
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <Option
                    label="مريح"
                    active={preferences.density === "comfortable"}
                    onClick={() =>
                      setLocalPreferences({
                        ...preferences,
                        density: "comfortable",
                      })
                    }
                  />
                  <Option
                    label="مضغوط"
                    active={preferences.density === "compact"}
                    onClick={() =>
                      setLocalPreferences({
                        ...preferences,
                        density: "compact",
                      })
                    }
                  />
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 flex items-center gap-2 text-sm font-bold">
                  {preferences.theme === "dark" ? (
                    <Moon size={16} />
                  ) : (
                    <Sun size={16} />
                  )}
                  المظهر
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <Option
                    label="فاتح"
                    active={preferences.theme === "light"}
                    onClick={() =>
                      setLocalPreferences({ ...preferences, theme: "light" })
                    }
                  />
                  <Option
                    label="داكن"
                    active={preferences.theme === "dark"}
                    onClick={() =>
                      setLocalPreferences({ ...preferences, theme: "dark" })
                    }
                  />
                </div>
              </fieldset>
              {message && (
                <p
                  role="status"
                  className="rounded-xl bg-blue-500/10 p-3 text-sm font-bold text-[#1167c9]"
                >
                  {message}
                </p>
              )}
              <Button type="submit" className="w-full" loading={saving}>
                حفظ التفضيلات
              </Button>
            </form>
          </Card>
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}
function Info({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="text-right" dir="rtl">
      <dt className="text-xs font-bold text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words text-right text-sm font-bold" dir={dir}>
        {value}
      </dd>
    </div>
  );
}
function Option({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition-colors ${active ? "border-[#1167c9] bg-blue-50 text-[#1167c9]" : "border-[var(--border)] hover:bg-slate-50"}`}
    >
      {label}
    </button>
  );
}
function ChangePasswordCard() {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (form.next !== form.confirm) {
      setMessage("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(
        form.next,
      )
    ) {
      setMessage(
        "يجب أن تتكون كلمة المرور من 12 حرفًا على الأقل، وتتضمن حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا.",
      );
      return;
    }
    setSaving(true);
    try {
      await changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      setMessage("تم تغيير كلمة المرور بنجاح.");
    } catch {
      setMessage("تعذر تغيير كلمة المرور. تحقق من كلمة المرور الحالية.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div id="change-password" className="scroll-mt-24">
      <Card className="p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <KeyRound size={19} />
          تغيير كلمة المرور
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          استخدم كلمة مرور قوية من 12 حرفًا على الأقل.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <PasswordInput
            label="كلمة المرور الحالية"
            value={form.current}
            onChange={(value) => setForm({ ...form, current: value })}
            show={show}
            onToggle={() => setShow(!show)}
            autoComplete="current-password"
          />
          <PasswordInput
            label="كلمة المرور الجديدة"
            value={form.next}
            onChange={(value) => setForm({ ...form, next: value })}
            show={show}
            onToggle={() => setShow(!show)}
            autoComplete="new-password"
          />
          <PasswordInput
            label="تأكيد كلمة المرور الجديدة"
            value={form.confirm}
            onChange={(value) => setForm({ ...form, confirm: value })}
            show={show}
            onToggle={() => setShow(!show)}
            autoComplete="new-password"
          />
          {message && (
            <p
              role="status"
              className={`rounded-xl p-3 text-sm font-bold ${message.startsWith("تم") ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}
            >
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" loading={saving}>
            حفظ كلمة المرور
          </Button>
        </form>
      </Card>
    </div>
  );
}
function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span className="flex items-center justify-between gap-3"><span>{label}</span><span className="field-required" aria-hidden="true">مطلوب</span></span>
      <span className="relative">
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-11 pr-3 outline-none focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="absolute inset-y-0 left-0 grid w-11 place-items-center text-[var(--muted)] hover:text-[#1167c9]"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
