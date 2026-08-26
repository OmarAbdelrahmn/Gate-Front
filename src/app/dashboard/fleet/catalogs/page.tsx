"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { BookOpen, Factory, Car, Building2, AlertTriangle } from "lucide-react";
import { ManufacturersTab } from "./components/ManufacturersTab";
import { ModelsTab } from "./components/ModelsTab";
import { SuppliersTab } from "./components/SuppliersTab";

type TabId = "manufacturers" | "models" | "suppliers";

export default function FleetCatalogsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [activeTab, setActiveTab] = useState<TabId>("manufacturers");

  if (!can("fleet.vehicles.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">
          {t("common.error")}
        </h2>
        <p className="text-slate-500">
          عفواً، لا تملك صلاحية الوصول لهذه الصفحة (fleet.vehicles.read).
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "manufacturers", label: "صناع المركبات", icon: Factory },
    { id: "models", label: "موديلات المركبات", icon: Car },
    { id: "suppliers", label: "الموردون", icon: Building2 },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-[#1167c9]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">الكتالوجات والموردون</h1>
          <p className="text-sm text-[var(--muted)]">إدارة المصنعين والموديلات والموردين للمركبات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold transition-colors ${
                isActive
                  ? "border-[#1167c9] text-[#1167c9]"
                  : "border-transparent text-[var(--muted)] hover:border-slate-300 hover:text-slate-700 dark:hover:border-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === "manufacturers" && <ManufacturersTab />}
        {activeTab === "models" && <ModelsTab />}
        {activeTab === "suppliers" && <SuppliersTab />}
      </div>
    </div>
  );
}
