"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  SlidersHorizontal,
  Package,
  Wrench,
  BadgeDollarSign,
} from "lucide-react";

export function MaintenanceTabsNav() {
  const pathname = usePathname();

  const tabs = [
    {
      label: "لوحة المؤشرات",
      href: "/dashboard/maintenance",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "الإعدادات والكتالوج",
      href: "/dashboard/maintenance/setup",
      icon: SlidersHorizontal,
      exact: false,
    },
    {
      label: "المخزون والمشتريات والزيوت",
      href: "/dashboard/maintenance/inventory",
      icon: Package,
      exact: false,
    },
    {
      label: "أوامر الصيانة وتغيير الزيت",
      href: "/dashboard/maintenance/work-orders",
      icon: Wrench,
      exact: false,
    },
    {
      label: "ورشة الرياض والعمليات الخارجية",
      href: "/dashboard/maintenance/workshops",
      icon: BadgeDollarSign,
      exact: false,
    },
  ];

  return (
    <div className="mb-6 border-b border-[var(--border)] bg-[var(--surface)] p-2 rounded-2xl shadow-xs" dir="rtl">
      <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                isActive
                  ? "bg-[#1167c9] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
