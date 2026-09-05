"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Layers,
  Droplets,
  ArrowLeftRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ReceiptsView } from "./components/ReceiptsView";
import { BalancesAndFifoView } from "./components/BalancesAndFifoView";
import { OilBarrelsView } from "./components/OilBarrelsView";
import { TransfersAndReturnsView } from "./components/TransfersAndReturnsView";
import {
  getMaintenanceLocations,
  getInventoryItems,
  getSuppliers,
} from "@/lib/maintenance/api";
import type {
  MaintenanceLocation,
  InventoryItem,
  Supplier,
} from "@/lib/maintenance/types";

type InventorySubTab = "receipts" | "balances" | "barrels" | "transfers";

export default function MaintenanceInventoryPage() {
  const [activeTab, setActiveTab] = useState<InventorySubTab>("receipts");
  const [loading, setLoading] = useState(true);

  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, itms, sups] = await Promise.all([
        getMaintenanceLocations().catch(() => []),
        getInventoryItems().catch(() => []),
        getSuppliers().catch(() => []),
      ]);
      setLocations(locs);
      setItems(itms);
      setSuppliers(sups);
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
      id: "receipts" as InventorySubTab,
      label: "فواتير واستلام المشتريات",
      icon: FileSpreadsheet,
    },
    {
      id: "balances" as InventorySubTab,
      label: "أرصدة المخزون وطبقات FIFO",
      icon: Layers,
    },
    {
      id: "barrels" as InventorySubTab,
      label: "براميل الزيوت وإدارة الفاقد",
      icon: Droplets,
    },
    {
      id: "transfers" as InventorySubTab,
      label: "التحويلات والمرتجعات والعهد",
      icon: ArrowLeftRight,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            إدارة المخزون والمشتريات والزيوت
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إيصالات الشراء مع الفاتورة الإلزامية، طبقات تكلفة الوارد أولاً FIFO، تتبع براميل الزيت واستهلاكها، والتحويلات.
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
      {activeTab === "receipts" && (
        <ReceiptsView
          locations={locations}
          suppliers={suppliers}
          items={items}
        />
      )}

      {activeTab === "balances" && (
        <BalancesAndFifoView
          locations={locations}
          items={items}
        />
      )}

      {activeTab === "barrels" && (
        <OilBarrelsView
          locations={locations}
          items={items}
        />
      )}

      {activeTab === "transfers" && (
        <TransfersAndReturnsView
          locations={locations}
          items={items}
          suppliers={suppliers}
        />
      )}
    </div>
  );
}
