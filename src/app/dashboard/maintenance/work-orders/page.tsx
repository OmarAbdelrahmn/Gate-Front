"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Wrench, Droplets, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WorkOrdersListView } from "./components/WorkOrdersListView";
import { OilRemindersView } from "./components/OilRemindersView";
import { CreateCompanyWorkOrderModal } from "./components/CreateCompanyWorkOrderModal";
import {
  getMaintenanceLocations,
  getInventoryItems,
} from "@/lib/maintenance/api";
import type {
  MaintenanceLocation,
  InventoryItem,
} from "@/lib/maintenance/types";
import { MaintenanceType } from "@/lib/maintenance/types";

type WorkOrdersSubTab = "orders" | "reminders";

export default function MaintenanceWorkOrdersPage() {
  const searchParams = useSearchParams();
  const openOilChangeFor = searchParams.get("openOilChangeFor");

  const [activeTab, setActiveTab] = useState<WorkOrdersSubTab>(
    openOilChangeFor ? "reminders" : "orders",
  );
  const [loading, setLoading] = useState(true);

  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);

  // Launch Oil Change Modal prefill
  const [prefillVehicleId, setPrefillVehicleId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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

  useEffect(() => {
    if (openOilChangeFor) {
      setPrefillVehicleId(openOilChangeFor);
      setCreateModalOpen(true);
    }
  }, [openOilChangeFor]);

  const handleStartOilChange = (vehicleId: string) => {
    setPrefillVehicleId(vehicleId);
    setCreateModalOpen(true);
  };

  const tabs = [
    {
      id: "orders" as WorkOrdersSubTab,
      label: "أوامر الصيانة والعمل",
      icon: Wrench,
    },
    {
      id: "reminders" as WorkOrdersSubTab,
      label: "لوحة تذكيرات واستحقاقات الزيوت",
      icon: Droplets,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            أوامر الصيانة وتغيير الزيت
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة دورة أوامر الصيانة (فتح ← تنفيذ ← اكتمال ← إقفال)، صرف قطع الغيار بنظام FIFO، ومتابعة عدادات الزيوت.
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
        <WorkOrdersListView
          locations={locations}
          items={items}
        />
      )}

      {activeTab === "reminders" && (
        <OilRemindersView
          onStartOilChange={handleStartOilChange}
        />
      )}

      {/* Pre-filled Order Modal for Oil Change */}
      <CreateCompanyWorkOrderModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setPrefillVehicleId(null);
        }}
        onSaved={loadData}
        locations={locations}
        initialVehicleId={prefillVehicleId || undefined}
        initialMaintenanceType={MaintenanceType.OilChange}
      />
    </div>
  );
}
