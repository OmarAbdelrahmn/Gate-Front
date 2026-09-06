"use client";

import React from "react";
import {
  Fuel,
  ChevronRight,
  Plus,
  RefreshCw,
  Upload,
  CreditCard,
  BarChart3,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export type FuelCardsTab = "cards" | "monthly" | "import" | "history";

interface FuelCardsNavProps {
  activeTab: FuelCardsTab;
  onTabChange: (tab: FuelCardsTab) => void;
  onRefresh?: () => void;
  onOpenCreate?: () => void;
  loading?: boolean;
  canManage?: boolean;
  canImport?: boolean;
}

export function FuelCardsNav({
  activeTab,
  onTabChange,
  onRefresh,
  onOpenCreate,
  loading = false,
  canManage = false,
  canImport = false,
}: FuelCardsNavProps) {
  const tabs: { id: FuelCardsTab; label: string; icon: React.ElementType }[] = [
    { id: "cards", label: "بطاقات الوقود", icon: CreditCard },
    { id: "monthly", label: "الاستهلاك الشهري", icon: BarChart3 },
    { id: "import", label: "استيراد الملفات", icon: Upload },
    { id: "history", label: "سجل الاستيراد", icon: History },
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
              بطاقات الوقود (PetroApp & SayaraApp)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Fuel size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                إدارة بطاقات الوقود
              </h1>
              <p className="text-xs text-[var(--muted)] mt-0.5 font-medium">
                متابعة وإسناد بطاقات الوقود لشركة بترو اب وشركة سيارة اب، رفع كشوفات الاستهلاك، ومتابعة الاستهلاك الشهري.
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

          {canManage && onOpenCreate && (
            <Button
              variant="primary"
              onClick={onOpenCreate}
              className="flex items-center gap-2 h-10 px-4 rounded-xl shadow-md shadow-blue-500/20 font-bold"
            >
              <Plus size={18} />
              إضافة بطاقة جديدة
            </Button>
          )}

          {canImport && activeTab !== "import" && (
            <Button
              variant="secondary"
              onClick={() => onTabChange("import")}
              className="flex items-center gap-2 h-10 px-4 rounded-xl shadow-xs border-blue-200 dark:border-blue-800 text-[#1167c9] dark:text-blue-400"
            >
              <Upload size={16} />
              رفع كشف حساب
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] pt-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-[#1167c9] text-[#1167c9] dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-xl"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-t-xl"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
