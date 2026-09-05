"use client";

import React, { useState, useEffect } from "react";
import { Building2, Package, Users, CalendarCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LocationsTab } from "./components/LocationsTab";
import { ItemsTab } from "./components/ItemsTab";
import { SuppliersTab } from "./components/SuppliersTab";
import { PlansTab } from "./components/PlansTab";
import {
  getMaintenanceLocations,
  getInventoryItems,
  getSuppliers,
  getMaintenancePlans,
} from "@/lib/maintenance/api";
import type {
  MaintenanceLocation,
  InventoryItem,
  Supplier,
  MaintenancePlan,
} from "@/lib/maintenance/types";

type SetupSubTab = "locations" | "items" | "suppliers" | "plans";

export default function MaintenanceSetupPage() {
  const [activeTab, setActiveTab] = useState<SetupSubTab>("locations");
  const [loading, setLoading] = useState(true);

  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [locs, itms, sups, plns] = await Promise.all([
        getMaintenanceLocations().catch(() => []),
        getInventoryItems().catch(() => []),
        getSuppliers().catch(() => []),
        getMaintenancePlans().catch(() => []),
      ]);
      setLocations(locs);
      setItems(itms);
      setSuppliers(sups);
      setPlans(plns);
    } catch (err) {
      console.error("Failed to load setup data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSearchItems = async (q: string) => {
    try {
      const res = await getInventoryItems(q);
      setItems(res);
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    {
      id: "locations" as SetupSubTab,
      label: "المواقع والورش",
      icon: Building2,
      count: locations.length,
    },
    {
      id: "items" as SetupSubTab,
      label: "الأصناف وقطع الغيار",
      icon: Package,
      count: items.length,
    },
    {
      id: "suppliers" as SetupSubTab,
      label: "الموردون",
      icon: Users,
      count: suppliers.length,
    },
    {
      id: "plans" as SetupSubTab,
      label: "خطط الصيانة والزيوت",
      icon: CalendarCheck,
      count: plans.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            إعدادات الصيانة والكتالوج
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تهيئة مستودع جدة وورشة الرياض، أصناف المخزون والزيوت، الموردين، وقواعد دورات الصيانة الوقائية.
          </p>
        </div>
        <Button variant="secondary" onClick={loadAll} loading={loading} className="text-xs shrink-0">
          <RefreshCw size={14} />
          تحديث البيانات
        </Button>
      </div>

      {/* Sub-Tabs Nav */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#1167c9] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === "locations" && (
        <LocationsTab
          locations={locations}
          loading={loading}
          onRefresh={loadAll}
        />
      )}

      {activeTab === "items" && (
        <ItemsTab
          items={items}
          loading={loading}
          onRefresh={loadAll}
          onSearch={handleSearchItems}
        />
      )}

      {activeTab === "suppliers" && (
        <SuppliersTab
          suppliers={suppliers}
          loading={loading}
          onRefresh={loadAll}
        />
      )}

      {activeTab === "plans" && (
        <PlansTab
          plans={plans}
          items={items}
          loading={loading}
          onRefresh={loadAll}
        />
      )}
    </div>
  );
}
