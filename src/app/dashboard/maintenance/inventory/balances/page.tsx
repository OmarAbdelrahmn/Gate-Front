"use client";

import React, { useState, useEffect } from "react";
import { BalancesAndFifoView } from "../components/BalancesAndFifoView";
import {
  getMaintenanceLocations,
  getInventoryItems,
} from "@/lib/maintenance/api";
import type {
  MaintenanceLocation,
  InventoryItem,
} from "@/lib/maintenance/types";

export default function MaintenanceInventoryBalancesPage() {
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, itms] = await Promise.all([
        getMaintenanceLocations().catch(() => []),
        getInventoryItems().catch(() => []),
      ]);
      setLocations(Array.isArray(locs) ? locs : []);
      setItems(Array.isArray(itms) ? itms : []);
    } catch (err) {
      console.error("Failed to load inventory balances data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        جارٍ تحميل أرصدة المخزون وطبقات FIFO...
      </div>
    );
  }

  return (
    <BalancesAndFifoView
      locations={locations}
      items={items}
    />
  );
}
