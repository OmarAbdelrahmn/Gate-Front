"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Smartphone,
  ChevronRight,
  Plus,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  MapPin,
  UserCheck,
  ArrowLeftRight,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PhoneSimsNavProps {
  onRefresh?: () => void;
  onOpenCreate?: () => void;
  onOpenPlaces?: () => void;
  onOpenFormTemplate?: () => void;
  onExportExcel?: () => void;
  exporting?: boolean;
  loading?: boolean;
  canManage?: boolean;
}

export function PhoneSimsNav({
  onRefresh,
  onOpenCreate,
  onOpenPlaces,
  onOpenFormTemplate,
  onExportExcel,
  exporting = false,
  loading = false,
  canManage = false,
}: PhoneSimsNavProps) {
  const pathname = usePathname();

  const navTabs = [
    {
      label: "جميع الشرائح والمخزون",
      href: "/admin/fleet/phone-sims",
      icon: Smartphone,
      isActive: pathname === "/admin/fleet/phone-sims",
    },
    {
      label: "تعيينات المناديب والعهد",
      href: "/admin/fleet/phone-sims/assignments",
      icon: UserCheck,
      isActive: pathname.startsWith("/admin/fleet/phone-sims/assignments"),
    },
    {
      label: "سجل نقل المسؤوليات",
      href: "/admin/fleet/phone-sims/transfers",
      icon: ArrowLeftRight,
      isActive: pathname.startsWith("/admin/fleet/phone-sims/transfers"),
    },
    {
      label: "الشرائح المعلقة والمؤرشفة",
      href: "/admin/fleet/phone-sims/archived",
      icon: Archive,
      isActive: pathname.startsWith("/admin/fleet/phone-sims/archived"),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] mb-1">
            <span>إدارة الأسطول والتشغيل</span>
            <ChevronRight className="h-3 w-3 rtl:rotate-180 text-slate-400" />
            <span className="text-[#1167c9] dark:text-blue-400 font-bold">
              شرائح الاتصال (SIM)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Smartphone size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                إدارة شرائح الاتصال (SIM)
              </h1>
              <p className="text-xs text-[var(--muted)] mt-0.5 font-medium">
                متابعة وتوثيق مخزون شرائح الاتصال، مواقعها، تعيينها للمناديب، ونقل مسؤوليّة العهد بين الموظفين.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <Button
              variant="secondary"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl shadow-xs text-xs font-bold"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-[#1167c9]" : ""} />
              تحديث
            </Button>
          )}

          {onOpenPlaces && (
            <Button
              variant="secondary"
              onClick={onOpenPlaces}
              className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl shadow-xs text-xs font-bold text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            >
              <MapPin size={15} className="text-blue-600" />
              المواقع والمقرات
            </Button>
          )}

          {onExportExcel && (
            <Button
              variant="secondary"
              onClick={onExportExcel}
              disabled={loading || exporting}
              className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl shadow-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-bold"
            >
              <FileSpreadsheet size={15} />
              تصدير إكسل
            </Button>
          )}

          {onOpenFormTemplate && (
            <Button
              variant="secondary"
              onClick={onOpenFormTemplate}
              className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl shadow-xs text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 text-xs font-bold"
            >
              <Printer size={15} className="text-[#1167c9]" />
              نموذج استلام
            </Button>
          )}

          {canManage && onOpenCreate && (
            <Button
              variant="primary"
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl shadow-md shadow-blue-500/20 text-xs font-bold"
            >
              <Plus size={16} />
              إضافة شريحة
            </Button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] overflow-x-auto pb-0">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
                tab.isActive
                  ? "border-[#1167c9] text-[#1167c9] bg-blue-50/40 dark:bg-blue-950/20 rounded-t-xl"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

