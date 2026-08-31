"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import {
  navigation,
  type NavItem,
  type Role,
} from "../../lib/config/navigation";
import { useAuth } from "../../lib/auth/AuthProvider";

import { translate } from "../../lib/i18n";

const permitted = (
  item: NavItem,
  role: Role,
  can: (permission: string) => boolean,
) => item.roles.includes(role) && (!item.permission || can(item.permission)) && (!item.permissionsAny || item.permissionsAny.some(can));

export function Sidebar({
  role = "admin",
  open,
  onClose,
}: {
  role?: Role;
  open: boolean;
  onClose: () => void;
}) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const { can, isLoading, authorization, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "إدارة المستخدمين": path.startsWith("/dashboard/users"),
    "الموارد البشرية": path.startsWith("/dashboard/hr") || path.startsWith("/dashboard/employees"),
    "إدارة السكن": path.startsWith("/dashboard/housing"),
    "إدارة المنصات": path.startsWith("/dashboard/platforms"),
    "إدارة الأسطول والمركبات": path.startsWith("/dashboard/fleet") && !path.startsWith("/dashboard/fleet/vehicle-account-assignments") && !path.startsWith("/dashboard/fleet/phone-sims"),
    "ربط المركبات بالمنصات": path.startsWith("/dashboard/fleet/vehicle-account-assignments"),
    "إدارة شرائح الاتصال (SIM)": path.startsWith("/dashboard/fleet/phone-sims"),
  });
  const items =
    !authorization || isLoading
      ? []
      : navigation.filter(
          (item) =>
            permitted(item, role, can) &&
            (!item.children ||
              item.children.some((child) => permitted(child, role, can))),
        );

  const allHrefs = navigation
    .flatMap((item) => [
      item.href,
      ...(item.children?.map((child) => child.href) || []),
    ])
    .filter((h): h is string => Boolean(h));

  const isChildActive = (href?: string) => {
    if (!href) return false;
    if (path === href) return true;
    if (href === "/dashboard/fleet/vehicle-account-assignments") {
      return path === "/dashboard/fleet/vehicle-account-assignments";
    }
    if (!path.startsWith(`${href}/`)) return false;
    return !allHrefs.some(
      (otherHref) =>
        otherHref !== href &&
        otherHref.length > href.length &&
        (path === otherHref || path.startsWith(`${otherHref}/`))
    );
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[276px] flex-col border-l border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl transition-transform md:sticky md:top-[72px] md:h-[calc(100vh-72px)] md:translate-x-0 ${open ? "translate-x-0" : "translate-x-full"} ${collapsed ? "md:w-[88px]" : ""}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div
            className={`px-2 text-xs font-bold tracking-widest text-slate-400 ${collapsed ? "md:hidden" : ""}`}
          >
            {t("nav.mainMenu")}
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="grid h-10 w-10 place-items-center rounded-xl md:hidden"
          >
            <X size={19} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden min-h-0 no-scrollbar px-1" aria-label={t("nav.mainMenu")}>
          {isLoading && (
            <div className="space-y-3 px-2" aria-label={t("common.loading")}>
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          )}
          {!isLoading &&
            items.map((item) => {
              const Icon = item.icon;
              const children =
                item.children?.filter((child) => Boolean(child.href) && permitted(child, role, can)) ??
                [];
              const active =
                isChildActive(item.href) ||
                children.some((child) => isChildActive(child.href));

              const itemLabel = item.labelKey ? t(item.labelKey) : item.label;

              if (!children.length && item.href)
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold ${active ? "bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                  >
                    <Icon size={19} />
                    <span className={collapsed ? "md:hidden" : ""}>
                      {itemLabel}
                    </span>
                    {active && (
                      <span className="mr-auto h-2 w-2 rounded-full bg-[#f28b35]" />
                    )}
                  </Link>
                );
              const isOpen = expanded[item.label] ?? active;
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((current) => ({
                        ...current,
                        [item.label]: !isOpen,
                      }))
                    }
                    aria-expanded={isOpen}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-right text-sm font-bold transition-colors ${active ? "text-[#1167c9] dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                  >
                    <Icon size={19} />
                    <span className={collapsed ? "md:hidden" : ""}>
                      {itemLabel}
                    </span>
                    <ChevronDown
                      size={17}
                      className={`mr-auto transition-transform ${isOpen ? "rotate-180" : ""} ${collapsed ? "md:hidden" : ""}`}
                    />
                  </button>
                  {isOpen ? (
                    <div
                      className={`mt-1 space-y-1 border-r-2 rtl:border-r-2 ltr:border-l-2 ltr:border-r-0 border-blue-200/60 dark:border-blue-900/40 rtl:pr-2 ltr:pl-2 ${collapsed ? "md:hidden" : ""}`}
                    >
                      {children.map((child, idx) => {
                        if (!child.href) return null;
                        const ChildIcon = child.icon;
                        const childActive = isChildActive(child.href);
                        const childLabel = child.labelKey ? t(child.labelKey) : child.label;
                        return (
                          <Link
                            key={`${child.label}-${child.href || idx}`}
                            href={child.href}
                            onClick={onClose}
                            aria-current={childActive ? "page" : undefined}
                            className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all ${childActive ? "bg-[#1167c9] text-white dark:bg-[#1167c9] dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"}`}
                          >
                            <ChildIcon size={16} />
                            <span>{childLabel}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          {!isLoading && !authorization && (
            <div className="px-2 pt-4 text-center text-xs text-slate-500">
              <ShieldAlert className="mx-auto mb-2 text-orange-500" size={20} />
              {t("authorization.cannotVerify")}
            </div>
          )}
        </nav>
        <div className="mt-3 pt-3 border-t border-[var(--border)] shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors md:flex"
          >
            <ChevronDown
              size={16}
              className={collapsed ? "rotate-90" : "-rotate-90"}
            />
            <span className={collapsed ? "hidden" : ""}>{collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
