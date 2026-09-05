"use client";

import React from "react";
import { MaintenanceTabsNav } from "./components/MaintenanceTabsNav";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ShieldAlert } from "lucide-react";

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { can } = useAuth();

  const canAccessAny =
    can("maintenance.locations.read") ||
    can("maintenance.work_orders.read") ||
    can("maintenance.oil.read") ||
    can("maintenance.external_jobs.read") ||
    can("maintenance.profit_reports.read") ||
    can("inventory.items.read") ||
    can("inventory.stock.read") ||
    can("inventory.cost_layers.read") ||
    can("inventory.receipts.manage");

  if (!canAccessAny) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="max-w-md mx-auto p-6 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 space-y-3">
          <ShieldAlert size={40} className="mx-auto text-red-600" />
          <h2 className="text-lg font-bold">عفواً، لا تملك صلاحية الوصول</h2>
          <p className="text-xs">
            تتطلب هذه الوحدة إحدى صلاحيات إدارة الصيانة أو المخزون أو الورش. يرجى التواصل مع مسؤول النظام لمنحك الصلاحيات المناسبة.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <MaintenanceTabsNav />
      {children}
    </div>
  );
}
