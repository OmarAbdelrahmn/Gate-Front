"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { BookOpen, Factory, Car, Building2, IdCard, AlertTriangle } from "lucide-react";
import { ManufacturersTab } from "./components/ManufacturersTab";
import { ModelsTab } from "./components/ModelsTab";
import { SuppliersTab } from "./components/SuppliersTab";
import { DriverLicenseCategoriesTab } from "./components/DriverLicenseCategoriesTab";

type TabId = "manufacturers" | "models" | "suppliers" | "driver-license-categories";

function FleetCatalogsContent() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;

  const tabs = [
    {
      id: "manufacturers" as const,
      label: isEn ? "Vehicle Manufacturers" : "صناع المركبات",
      icon: Factory,
      permission: "fleet.vehicles.read",
    },
    {
      id: "models" as const,
      label: isEn ? "Vehicle Models" : "موديلات المركبات",
      icon: Car,
      permission: "fleet.vehicles.read",
    },
    {
      id: "suppliers" as const,
      label: isEn ? "Suppliers" : "الموردون",
      icon: Building2,
      permission: "fleet.vehicles.read",
    },
    {
      id: "driver-license-categories" as const,
      label: isEn ? "Driver License Categories" : "فئات رخص القيادة",
      icon: IdCard,
      permission: "licenses.read",
    },
  ];

  const visibleTabs = tabs.filter((tab) => can(tab.permission));

  const defaultTab = visibleTabs.some((t) => t.id === tabParam)
    ? (tabParam as TabId)
    : visibleTabs[0]?.id;

  const [activeTab, setActiveTab] = useState<TabId | undefined>(defaultTab);

  useEffect(() => {
    if (tabParam && visibleTabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    } else if (!activeTab || !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id);
    }
  }, [tabParam, visibleTabs, activeTab]);

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {t("common.error")}
        </h2>
        <p className="text-slate-500">
          {isEn
            ? "Sorry, you do not have permission to access this page."
            : "عفواً، لا تملك صلاحية الوصول لهذه الصفحة."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-[#1167c9]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {isEn ? "Catalogs & Suppliers" : "الكتالوجات والموردون"}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {isEn
              ? "Manage vehicle manufacturers, models, suppliers, and driver license categories"
              : "إدارة المصنعين والموديلات والموردين وفئات رخص القيادة"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--border)]">
        {visibleTabs.map((tab) => {
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
        {activeTab === "driver-license-categories" && <DriverLicenseCategoriesTab />}
      </div>
    </div>
  );
}

export default function FleetCatalogsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm font-bold text-slate-500">
          جارٍ التحميل...
        </div>
      }
    >
      <FleetCatalogsContent />
    </Suspense>
  );
}

