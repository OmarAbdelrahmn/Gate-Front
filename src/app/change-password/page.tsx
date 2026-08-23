"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../lib/auth/AuthProvider";
export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, changePassword, logout } =
    useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router, user]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(
        form.newPassword,
      )
    ) {
      setError(
        "يجب أن تتكون كلمة المرور من 12 حرفًا على الأقل، وتتضمن حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا.",
      );
      return;
    }
    setLoading(true);
    try {
      const nextUser = await changePassword(
        form.currentPassword,
        form.newPassword,
      );
      router.replace(
        nextUser.requiresPasswordChange ? "/change-password" : "/dashboard",
      );
    } catch {
      setError(
        "تعذر تغيير كلمة المرور. تحقق من كلمة المرور الحالية وسياسة الأمان.",
      );
    } finally {
      setLoading(false);
    }
  }
  if (isLoading || !user)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f7fc]">
        <p className="text-sm font-bold text-slate-500">
          جارٍ التحقق من الجلسة…
        </p>
      </main>
    );
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f3f7fc] px-4 py-8 text-slate-900">
      <div
        aria-hidden
        className="absolute -right-40 -top-32 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl"
      />
      <section className="relative w-full max-w-[460px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_52px_rgba(28,62,104,.16)] sm:p-9">
        <header className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#0b55a8] to-[#2e8ce6] text-white shadow-lg shadow-blue-500/25">
            <KeyRound size={28} />
          </div>
          <h1 className="mt-5 text-2xl font-black">تغيير كلمة المرور</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {user.requiresPasswordChange
              ? "لأمان حسابك، يجب تغيير كلمة المرور المؤقتة قبل الدخول إلى النظام."
              : "حدّث كلمة مرور حسابك باستخدام كلمة المرور الحالية."}
          </p>
        </header>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <PasswordField
            label="كلمة المرور الحالية"
            value={form.currentPassword}
            onChange={(value) => setForm({ ...form, currentPassword: value })}
            show={show}
            onToggle={() => setShow(!show)}
            autoComplete="current-password"
          />
          <PasswordField
            label="كلمة المرور الجديدة"
            value={form.newPassword}
            onChange={(value) => setForm({ ...form, newPassword: value })}
            show={show}
            onToggle={() => setShow(!show)}
            autoComplete="new-password"
          />
          <PasswordField
            label="تأكيد كلمة المرور الجديدة"
            value={form.confirmPassword}
            onChange={(value) => setForm({ ...form, confirmPassword: value })}
            show={show}
            onToggle={() => setShow(!show)}
            autoComplete="new-password"
          />
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-6 text-red-700"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full !bg-[#1167c9] hover:!bg-[#0b55a8]"
            loading={loading}
          >
            حفظ كلمة المرور والدخول <ShieldCheck size={17} />
          </Button>
        </form>
        <button
          type="button"
          onClick={() => void logout()}
          className="mx-auto mt-5 flex min-h-10 items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-700"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </section>
    </main>
  );
}
function PasswordField({
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
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          className="h-11 w-full rounded-xl border border-slate-300 px-11 pr-3 text-slate-950 outline-none focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-500 hover:text-[#1167c9]"
        >
          {show ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
    </label>
  );
}
