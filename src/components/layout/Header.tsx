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
import { translate } from "../../lib/i18n";

export function Header({ onMenu }: { onMenu: () => void }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const { user, logout, logoutAll, locale, theme, setPreferences } = useAuth();
  const t = (key: string) => translate(locale, key);
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
    "flex min-h-11 items-center gap-2 rounded-lg px-3 text-right font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200";
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 bg-gradient-to-l from-[#0b55a8] via-[#1167c9] to-[#2e8ce6] px-4 text-white shadow-lg md:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label={t("nav.mainMenu")}
          className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/15 md:hidden"
        >
          <Menu size={21} />
        </button>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg font-black text-[#1167c9] shadow-sm">
          {locale === "en" ? "M" : "ب"}
        </div>
        <div>
          <div className="text-sm font-black leading-tight">
            {t("header.appName")}
          </div>
          <div className="text-[11px] text-blue-100">{t("header.appSubtitle")}</div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={savingPreferences}
          onClick={() =>
            void updatePreference({ locale: locale === "ar" ? "en" : "ar" })
          }
          aria-label={t("header.switchLanguage")}
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
          aria-label={t("header.switchTheme")}
          className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/15 disabled:opacity-60"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          aria-label={t("header.notifications")}
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
            <div className="absolute left-0 top-14 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-sm text-[var(--foreground)] shadow-xl">
              <div className="border-b border-[var(--border)] px-3 py-2">
                <b className="block">{t("header.myAccount")}</b>
                <small className="text-[var(--muted)]">{name}</small>
              </div>
              <Link
                href="/dashboard/profile"
                onClick={() => setOpen(false)}
                className={menuLink}
              >
                <UserRound size={17} />
                {t("header.profile")}
              </Link>
              <Link
                href="/dashboard/profile#change-password"
                onClick={() => setOpen(false)}
                className={menuLink}
              >
                <KeyRound size={17} />
                {t("header.changePassword")}
              </Link>
              <Link
                href="/dashboard/profile/sessions"
                onClick={() => setOpen(false)}
                className={menuLink}
              >
                <MonitorSmartphone size={17} />
                {t("header.activeSessions")}
              </Link>
              <div className="my-1 border-t border-[var(--border)]" />
              <button
                disabled={loggingOut}
                onClick={() => void leave()}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-right font-bold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60"
              >
                <LogOut size={16} />
                {loggingOut
                  ? t("common.loading")
                  : t("header.signOut")}
              </button>
              <button
                disabled={loggingOut}
                onClick={async () => {
                  if (await systemConfirm(t("header.confirmSignOutAll"), t("header.signOutAll"), true))
                    void leave(true);
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-right font-bold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60"
              >
                <ShieldCheck size={16} />
                {t("header.signOutAll")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
