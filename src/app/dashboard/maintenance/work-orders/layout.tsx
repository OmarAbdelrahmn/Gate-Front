"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, Droplets } from "lucide-react";

export default function MaintenanceWorkOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/dashboard/maintenance/work-orders/orders",
      label: "أوامر الصيانة والعمل",
      icon: Wrench,
    },
    {
      href: "/dashboard/maintenance/work-orders/reminders",
      label: "لوحة تذكيرات واستحقاقات الزيوت",
      icon: Droplets,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          أوامر الصيانة وتغيير الزيت
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          إدارة دورة أوامر الصيانة (فتح ← تنفيذ ← اكتمال ← إقفال)، صرف قطع الغيار بنظام FIFO، ومتابعة عدادات الزيوت.
        </p>
      </div>

      {/* Sub-Tabs Nav */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-[#1167c9] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
