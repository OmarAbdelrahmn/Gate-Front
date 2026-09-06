"use client";

import React, { useState, useEffect } from "react";
import { TransfersAndReturnsView } from "../components/TransfersAndReturnsView";
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

export default function MaintenanceInventoryTransfersPage() {
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, itms, sups] = await Promise.all([
        getMaintenanceLocations().catch(() => []),
        getInventoryItems().catch(() => []),
        getSuppliers().catch(() => []),
      ]);
      setLocations(Array.isArray(locs) ? locs : []);
      setItems(Array.isArray(itms) ? itms : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
    } catch (err) {
      console.error("Failed to load transfers data:", err);
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
        جارٍ تحميل بيانات التحويلات والعهد...
      </div>
    );
  }

  return (
    <TransfersAndReturnsView
      locations={locations}
      items={items}
      suppliers={suppliers}
    />
  );
}
