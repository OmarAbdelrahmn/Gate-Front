"use client";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Globe2,
  KeyRound,
  LogOut,
  Menu,
  MonitorSmartphone,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { systemConfirm } from "../ui/SystemDialog";
export function Header({ onMenu }: { onMenu: () => void }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const { user, logout, logoutAll, locale, theme, setPreferences } = useAuth();
  const router = useRouter();
  const name =
    locale === "en"
      ? (user?.displayNameEn ?? "System Administrator")
      : (user?.displayNameAr ?? "مدير النظام");
  const initials = name.trim().slice(0, 1);
  async function leave(all = false) {
    setLoggingOut(true);
    try {
      if (all) await logoutAll();
      else await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }
  async function updatePreference(next: {
    locale?: "ar" | "en";
    theme?: "light" | "dark";
  }) {
    setSavingPreferences(true);
    try {
      await setPreferences(next);
    } finally {
      setSavingPreferences(false);
    }
  }
  const menuLink =
    "flex min-h-11 items-center gap-2 rounded-lg px-3 text-right font-bold hover:bg-slate-50";
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 bg-gradient-to-l from-[#0b55a8] via-[#1167c9] to-[#2e8ce6] px-4 text-white shadow-lg md:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label="فتح القائمة"
          className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/15 md:hidden"
        >
          <Menu size={21} />
        </button>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg font-black text-[#1167c9] shadow-sm">
          ب
        </div>
        <div>
          <div className="text-sm font-black leading-tight">
            البوابة المقبلة
          </div>
          <div className="text-[11px] text-blue-100">للخدمات اللوجستية</div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={savingPreferences}
          onClick={() =>
            void updatePreference({ locale: locale === "ar" ? "en" : "ar" })
          }
          aria-label="تغيير اللغة"
          className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm hover:bg-white/15 disabled:opacity-60 sm:flex"
        >
          <Globe2 size={17} />
          {locale === "ar" ? "EN" : "عربي"}
        </button>
        <button
          disabled={savingPreferences}
          onClick={() =>
            void updatePreference({
              theme: theme === "dark" ? "light" : "dark",
            })
          }
          aria-label="تبديل المظهر"
          className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/15 disabled:opacity-60"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          aria-label="الإشعارات"
          className="relative grid h-10 w-10 place-items-center rounded-xl hover:bg-white/15"
        >
          <Bell size={18} />
          <i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f28b35]" />
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            aria-haspopup="true"
            aria-expanded={open}
            className="flex h-11 items-center gap-2 rounded-xl px-2 hover:bg-white/15"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f28b35] text-sm font-black">
              {initials}
            </span>
            <span className="hidden text-right text-xs sm:block">
              <b className="block">{name}</b>
              <small className="text-blue-100">
                {user?.roles?.join("، ") ?? "Admin Manager"}
              </small>
            </span>
            <ChevronDown size={15} />
          </button>
          {open && (
            <div className="absolute left-0 top-14 w-64 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-xl">
              <div className="border-b border-slate-100 px-3 py-2">
                <b className="block">حسابي</b>
                <small className="text-slate-500">{name}</small>
              </div>
              <Link
                href="/dashboard/profile"
                onClick={() => setOpen(false)}
                className={menuLink}
              >
                <UserRound size={17} />
                ملفي الشخصي
              </Link>
              <Link
                href="/dashboard/profile#change-password"
                onClick={() => setOpen(false)}
                className={menuLink}
              >
                <KeyRound size={17} />
                تغيير كلمة المرور
              </Link>
              <Link
                href="/dashboard/profile/sessions"
                onClick={() => setOpen(false)}
                className={menuLink}
              >
                <MonitorSmartphone size={17} />
                الجلسات النشطة
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                disabled={loggingOut}
                onClick={() => void leave()}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-right font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <LogOut size={16} />
                {loggingOut
                  ? "جارٍ تسجيل الخروج…"
                  : "تسجيل الخروج من هذه الجلسة"}
              </button>
              <button
                disabled={loggingOut}
                onClick={async () => {
                  if (await systemConfirm("هل تريد تسجيل الخروج من جميع الأجهزة؟", "تسجيل الخروج من جميع الأجهزة", true))
                    void leave(true);
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-right font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <ShieldCheck size={16} />
                تسجيل الخروج من جميع الأجهزة
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
