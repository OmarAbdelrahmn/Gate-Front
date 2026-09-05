"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileSpreadsheet,
  Layers,
  Droplets,
  ArrowLeftRight,
} from "lucide-react";

export default function MaintenanceInventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/dashboard/maintenance/inventory/receipts",
      label: "فواتير واستلام المشتريات",
      icon: FileSpreadsheet,
    },
    {
      href: "/dashboard/maintenance/inventory/balances",
      label: "أرصدة المخزون وطبقات FIFO",
      icon: Layers,
    },
    {
      href: "/dashboard/maintenance/inventory/barrels",
      label: "براميل الزيوت وإدارة الفاقد",
      icon: Droplets,
    },
    {
      href: "/dashboard/maintenance/inventory/transfers",
      label: "التحويلات والمرتجعات والعهد",
      icon: ArrowLeftRight,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          إدارة المخزون والمشتريات والزيوت
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          إيصالات الشراء مع الفاتورة الإلزامية، طبقات تكلفة الوارد أولاً FIFO، تتبع براميل الزيت واستهلاكها، والتحويلات.
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
