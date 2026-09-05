"use client";

import React, { useState, useEffect } from "react";
import { BadgeDollarSign, Wrench, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExternalOrdersListView } from "./components/ExternalOrdersListView";
import { ProfitReportView } from "./components/ProfitReportView";
import {
  getMaintenanceLocations,
  getInventoryItems,
} from "@/lib/maintenance/api";
import type {
  MaintenanceLocation,
  InventoryItem,
} from "@/lib/maintenance/types";

type WorkshopSubTab = "orders" | "profit";

export default function MaintenanceWorkshopsPage() {
  const [activeTab, setActiveTab] = useState<WorkshopSubTab>("orders");
  const [loading, setLoading] = useState(true);

  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, itms] = await Promise.all([
        getMaintenanceLocations().catch(() => []),
        getInventoryItems().catch(() => []),
      ]);
      setLocations(locs);
      setItems(itms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    {
      id: "orders" as WorkshopSubTab,
      label: "أوامر العمل الخارجية والفوترة",
      icon: Wrench,
    },
    {
      id: "profit" as WorkshopSubTab,
      label: "تقرير أرباح ورشة الرياض الحقيقية",
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            ورشة الرياض والعمليات الخارجية
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة صيانة عملاء ورشة الرياض الخارجيين، فوترة القطع وأجور اليد، مستحقات الفنيين، واحتساب الأرباح المحاسبية الحقيقية.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadData}
          loading={loading}
          className="text-xs shrink-0"
        >
          <RefreshCw size={14} />
          تحديث
        </Button>
      </div>

      {/* Sub Tabs */}
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
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {activeTab === "orders" && (
        <ExternalOrdersListView
          locations={locations}
          items={items}
        />
      )}

      {activeTab === "profit" && (
        <ProfitReportView
          locations={locations}
        />
      )}
    </div>
  );
}
