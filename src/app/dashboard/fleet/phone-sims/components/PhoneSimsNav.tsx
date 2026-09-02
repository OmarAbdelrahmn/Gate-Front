"use client";

import React from "react";
import {
  Smartphone,
  ChevronRight,
  Plus,
  RefreshCw,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PhoneSimsNavProps {
  onRefresh?: () => void;
  onOpenCreate?: () => void;
  onOpenFormTemplate?: () => void;
  loading?: boolean;
  canManage?: boolean;
}

export function PhoneSimsNav({
  onRefresh,
  onOpenCreate,
  onOpenFormTemplate,
  loading = false,
  canManage = false,
}: PhoneSimsNavProps) {
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
                متابعة وتوثيق مخزون شرائح الاتصال، تعيينها للمناديب، ونقل مسؤوليّة العهد بين الموظفين.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <Button
              variant="secondary"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 h-10 px-4 rounded-xl shadow-xs"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-[#1167c9]" : ""} />
              تحديث البيانات
            </Button>
          )}

          {onOpenFormTemplate && (
            <Button
              variant="secondary"
              onClick={onOpenFormTemplate}
              className="flex items-center gap-2 h-10 px-4 rounded-xl shadow-xs text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            >
              <Printer size={16} className="text-[#1167c9]" />
              نموذج استلام الشريحة
            </Button>
          )}

          {canManage && onOpenCreate && (
            <Button
              variant="primary"
              onClick={onOpenCreate}
              className="flex items-center gap-2 h-10 px-4 rounded-xl shadow-md shadow-blue-500/20 font-bold"
            >
              <Plus size={18} />
              إضافة شريحة جديدة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
