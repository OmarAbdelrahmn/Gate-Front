"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  navigation,
  type NavItem,
  type Role,
} from "@/lib/config/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRouteForUser } from "@/lib/auth/roles";
import { translate } from "@/lib/i18n";

const permitted = (
  item: NavItem,
  role: Role,
  can: (permission: string) => boolean,
) =>
  (!item.roles || item.roles.includes(role)) &&
  (!item.permission || can(item.permission)) &&
  (!item.permissionsAny || item.permissionsAny.some(can));

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
  const [collapsed, setCollapsed] = useState(false);
  const { user, can, isLoading, authorization, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const defaultRoute = getDefaultRouteForUser(user);

  const resolveItemHref = (item: NavItem) => {
    if (item.labelKey === "nav.dashboard") return defaultRoute;
    return item.href;
  };

  const allHrefs = navigation
    .flatMap((item) => [
      resolveItemHref(item),
      ...(item.children?.map((child) => resolveItemHref(child)) || []),
    ])
    .filter((h): h is string => Boolean(h));

  const isChildActive = (href?: string) => {
    if (!href) return false;
    const targetHref = href === "/admin" && defaultRoute !== "/admin" ? defaultRoute : href;
    if (path === targetHref) return true;
    if (targetHref === "/admin/fleet/vehicle-account-assignments") {
      return path === "/admin/fleet/vehicle-account-assignments";
    }
    if (targetHref === "/admin/maintenance" || targetHref === "/admin/maintenance/dashboard") {
      return path === "/admin/maintenance" || path === "/admin/maintenance/dashboard";
    }
    if (!path.startsWith(`${targetHref}/`)) return false;
    return !allHrefs.some(
      (otherHref) =>
        otherHref !== targetHref &&
        otherHref.length > targetHref.length &&
        (path === otherHref || path.startsWith(`${otherHref}/`))
    );
  };

  const findActiveParentKey = () => {
    const parent = navigation.find(
      (item) =>
        permitted(item, role, can) &&
        item.children?.some(
          (child) => permitted(child, role, can) && isChildActive(resolveItemHref(child)),
        ),
    );
    return parent ? (parent.labelKey || parent.label) : null;
  };

  // Accordion rule: only one nav can be open at a time
  const [openKey, setOpenKey] = useState<string | null>(() => findActiveParentKey());

  useEffect(() => {
    if (isLoading) return;
    setOpenKey(findActiveParentKey());
  }, [path, defaultRoute, isLoading]);

  // Hover state with grace period for collapsed flyout menu
  const [hoveredFlyoutKey, setHoveredFlyoutKey] = useState<string | null>(null);
  const flyoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterFlyout = (key: string) => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
      flyoutTimerRef.current = null;
    }
    setHoveredFlyoutKey(key);
  };

  const handleMouseLeaveFlyout = () => {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current);
    }
    flyoutTimerRef.current = setTimeout(() => {
      setHoveredFlyoutKey(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (flyoutTimerRef.current) {
        clearTimeout(flyoutTimerRef.current);
      }
    };
  }, []);

  const handleToggleNav = (itemKey: string) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenKey(itemKey);
    } else {
      setOpenKey((prev) => (prev === itemKey ? null : itemKey));
    }
  };

  const items =
    !authorization || isLoading
      ? []
      : navigation.filter(
          (item) =>
            permitted(item, role, can) &&
            (!item.children ||
              item.children.some((child) => permitted(child, role, can))),
        );

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[276px] flex-col border-l border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl transition-all md:sticky md:top-[72px] md:h-[calc(100vh-72px)] md:translate-x-0 ${open ? "translate-x-0" : "translate-x-full"} ${collapsed ? "md:w-[88px]" : ""}`}
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
        <nav
          className={`flex-1 space-y-1 ${
            collapsed ? "md:overflow-visible" : "overflow-y-auto overflow-x-hidden"
          } min-h-0 no-scrollbar px-1`}
          aria-label={t("nav.mainMenu")}
        >
          {isLoading && (
            <div className="space-y-3 px-2" aria-label={t("common.loading")}>
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          )}
          {!isLoading &&
            items.map((item, index) => {
              const Icon = item.icon;
              const children =
                item.children?.filter(
                  (child) => Boolean(child.href) && permitted(child, role, can),
                ) ?? [];
              const itemHref = resolveItemHref(item);
              const itemKey = item.labelKey || item.label;
              const active =
                isChildActive(itemHref) ||
                children.some((child) => isChildActive(resolveItemHref(child)));

              const itemLabel = item.labelKey ? t(item.labelKey) : item.label;

              // Direct link without sub-menu (e.g. Dashboard, Housing, Profile)
              if (!children.length && itemHref)
                return (
                  <div key={itemKey} className="relative group/navitem">
                    <Link
                      href={itemHref}
                      prefetch={false}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
                        active
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                    >
                      <Icon size={19} className="shrink-0" />
                      <span className={collapsed ? "md:hidden" : ""}>
                        {itemLabel}
                      </span>
                      {active && !collapsed && (
                        <span className="h-2 w-2 rounded-full bg-[#f28b35] rtl:mr-auto rtl:ml-0 ltr:ml-auto ltr:mr-0 shrink-0" />
                      )}
                    </Link>
                    {/* Tooltip when collapsed on desktop */}
                    {collapsed && (
                      <div
                        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-50 hidden md:group-hover/navitem:block whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white shadow-xl dark:bg-slate-100 dark:text-slate-900 ${
                          locale === "ar"
                            ? "right-[calc(100%+8px)]"
                            : "left-[calc(100%+8px)]"
                        }`}
                      >
                        {itemLabel}
                      </div>
                    )}
                  </div>
                );

              // Parent item with sub-menu
              const isOpen = openKey === itemKey;

              const isFlyoutOpen = collapsed && hoveredFlyoutKey === itemKey;
              const isLowerItem = index >= items.length - 3;

              return (
                <div
                  key={itemKey}
                  className="relative group/navitem"
                  onMouseEnter={() => {
                    if (collapsed) handleMouseEnterFlyout(itemKey);
                  }}
                  onMouseLeave={() => {
                    if (collapsed) handleMouseLeaveFlyout();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleNav(itemKey)}
                    aria-expanded={isOpen}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-right text-sm font-bold transition-colors ${
                      active
                        ? "text-[#1167c9] dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                  >
                    <Icon size={19} className="shrink-0" />
                    <span className={collapsed ? "md:hidden" : ""}>
                      {itemLabel}
                    </span>
                    <ChevronDown
                      size={17}
                      className={`transition-transform shrink-0 rtl:mr-auto rtl:ml-0 ltr:ml-auto ltr:mr-0 ${isOpen ? "rotate-180" : ""} ${collapsed ? "md:hidden" : ""}`}
                    />
                  </button>

                  {/* Desktop Collapsed Floating Flyout with Seamless Hover Bridge */}
                  {collapsed && (
                    <div
                      className={`absolute z-50 ${isLowerItem ? "bottom-0" : "top-0"} ${
                        isFlyoutOpen ? "md:flex" : "hidden md:group-hover/navitem:flex"
                      } flex-col ${
                        locale === "ar"
                          ? "right-full pr-2.5 before:absolute before:inset-y-0 before:-right-3 before:w-5 before:content-['']"
                          : "left-full pl-2.5 before:absolute before:inset-y-0 before:-left-3 before:w-5 before:content-['']"
                      }`}
                    >
                      <div className="flex flex-col min-w-[240px] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-xs font-bold text-slate-400">
                          <Icon size={16} className="shrink-0 text-[#1167c9]" />
                          <span>{itemLabel}</span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {children.map((child, idx) => {
                            const childHref = resolveItemHref(child);
                            if (!childHref) return null;
                            const ChildIcon = child.icon;
                            const childActive = isChildActive(childHref);
                            const childLabel = child.labelKey
                              ? t(child.labelKey)
                              : child.label;
                            return (
                              <Link
                                key={`${child.label}-${childHref || idx}`}
                                href={childHref}
                                prefetch={false}
                                onClick={() => {
                                  setHoveredFlyoutKey(null);
                                  onClose();
                                }}
                                aria-current={childActive ? "page" : undefined}
                                className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-bold transition-all ${
                                  childActive
                                    ? "bg-[#1167c9] text-white shadow-sm"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <ChildIcon size={15} className="shrink-0" />
                                <span>{childLabel}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standard In-flow Accordion for Expanded Mode */}
                  {isOpen && !collapsed ? (
                    <div className="mt-1 space-y-1 border-r-2 rtl:border-r-2 ltr:border-l-2 ltr:border-r-0 border-blue-200/60 dark:border-blue-900/40 rtl:pr-2 ltr:pl-2">
                      {children.map((child, idx) => {
                        const childHref = resolveItemHref(child);
                        if (!childHref) return null;
                        const ChildIcon = child.icon;
                        const childActive = isChildActive(childHref);
                        const childLabel = child.labelKey
                          ? t(child.labelKey)
                          : child.label;
                        return (
                          <Link
                            key={`${child.label}-${childHref || idx}`}
                            href={childHref}
                            prefetch={false}
                            onClick={onClose}
                            aria-current={childActive ? "page" : undefined}
                            className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all ${
                              childActive
                                ? "bg-[#1167c9] text-white dark:bg-[#1167c9] dark:text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                            }`}
                          >
                            <ChildIcon size={16} className="shrink-0" />
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
            aria-label={collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
            className="hidden w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors md:flex"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${
                collapsed
                  ? locale === "ar"
                    ? "-rotate-90"
                    : "rotate-90"
                  : locale === "ar"
                    ? "rotate-90"
                    : "-rotate-90"
              }`}
            />
            <span className={collapsed ? "hidden" : ""}>
              {collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
