"use client";

import React, { useState, useEffect } from "react";
import { ReceiptsView } from "../components/ReceiptsView";
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

export default function MaintenanceInventoryReceiptsPage() {
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, sups, itms] = await Promise.all([
        getMaintenanceLocations().catch(() => []),
        getSuppliers().catch(() => []),
        getInventoryItems().catch(() => []),
      ]);
      setLocations(Array.isArray(locs) ? locs : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
      setItems(Array.isArray(itms) ? itms : []);
    } catch (err) {
      console.error("Failed to load receipts data:", err);
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
        جارٍ تحميل بيانات الاستلام والمشتريات...
      </div>
    );
  }

  return (
    <ReceiptsView
      locations={locations}
      suppliers={suppliers}
      items={items}
    />
  );
}
