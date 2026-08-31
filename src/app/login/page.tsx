"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../lib/auth/AuthProvider";

import { getDefaultDeviceLabel } from "../../lib/auth/api";
import type { AuthApiError } from "../../lib/auth/types";

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const [form, setForm] = useState({ login: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(
        user.requiresPasswordChange ? "/change-password" : "/dashboard"
      );
    }
  }, [isLoading, isAuthenticated, user, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedUser = await login({
        login: form.login,
        password: form.password,
        deviceLabel: getDefaultDeviceLabel(),
      });
      router.replace(
        loggedUser.requiresPasswordChange ? "/change-password" : "/dashboard",
      );
    } catch (err: unknown) {
      const apiErr = err as AuthApiError;
      setError(apiErr?.message || "اسم المستخدم أو كلمة المرور غير صحيحة، أو أن الحساب غير متاح.");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="relative grid min-h-screen place-items-center bg-[#f3f7fc] text-slate-900">
        <div className="flex items-center gap-3 text-sm font-bold text-[#1167c9]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>جاري التحقق من الجلسة والتوجيه تلقائياً...</span>
        </div>
      </main>
    );
  }

  if (isAuthenticated && user) {
    return null;
  }
  const controlClass =
    "!border-slate-300 !bg-white !text-slate-950 shadow-sm placeholder:!text-slate-400 hover:border-slate-400 focus:!border-[#1167c9]";
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f3f7fc] px-4 py-8 text-slate-900">
      <div
        aria-hidden
        className="absolute -right-40 -top-32 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-orange-100/50 blur-3xl"
      />
      <section className="relative w-full max-w-[440px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_52px_rgba(28,62,104,.16)] sm:p-9">
        <header className="mb-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#0b55a8] to-[#2e8ce6] text-white shadow-lg shadow-blue-500/25">
            <Building2 size={28} />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
            تسجيل الدخول
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            منصة البوابة المقبلة للخدمات اللوجستية
          </p>
        </header>
        <form onSubmit={submit} className="space-y-5">
          <Input
            label="اسم المستخدم أو البريد الإلكتروني"
            className={controlClass}
            placeholder="مثال: omar أو omar@example.com"
            autoComplete="username"
            required
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
          />
          <label className="grid gap-2 text-sm font-bold text-slate-900">
            <span className="flex items-center gap-2"><span>كلمة المرور</span><span className="field-required" aria-hidden="true">مطلوب</span></span>
            <span className="relative">
              <input
                className={`h-11 w-full rounded-xl border px-11 py-0 pr-3 text-slate-950 outline-none ${controlClass}`}
                type={showPassword ? "text" : "password"}
                placeholder="أدخل كلمة المرور"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                }
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                className="absolute inset-y-0 left-0 grid w-11 place-items-center rounded-l-xl text-slate-500 hover:text-[#1167c9] focus-visible:outline-none"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold leading-6 text-red-700"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            loading={loading}
            className="w-full !rounded-xl !bg-[#1167c9] hover:!bg-[#0b55a8]"
          >
            تسجيل الدخول <LockKeyhole size={17} />
          </Button>
        </form>
        <footer className="mt-7 flex flex-col items-center gap-2 border-t border-slate-100 pt-5 text-center text-xs font-medium text-slate-500">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck size={15} className="text-[#1167c9]" />
            <span>دخول آمن ومشفر (جلسة نشطة واحدة لكل حساب)</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
