"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, BarChart3 } from "lucide-react";

export default function MaintenanceWorkshopsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/dashboard/maintenance/workshops/orders",
      label: "أوامر العمل الخارجية والفوترة",
      icon: Wrench,
    },
    {
      href: "/dashboard/maintenance/workshops/profit",
      label: "تقرير أرباح ورشة الرياض الحقيقية",
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          ورشة الرياض والعمليات الخارجية
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          إدارة صيانة عملاء ورشة الرياض الخارجيين، فوترة القطع وأجور اليد، مستحقات الفنيين، واحتساب الأرباح المحاسبية الحقيقية.
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
