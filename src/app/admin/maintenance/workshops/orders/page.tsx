"use client";

import React, { useState, useEffect } from "react";
import { ExternalOrdersListView } from "../components/ExternalOrdersListView";
import {
  getMaintenanceLocations,
  getInventoryItems,
} from "@/lib/maintenance/api";
import type {
  MaintenanceLocation,
  InventoryItem,
} from "@/lib/maintenance/types";

export default function MaintenanceWorkshopsOrdersPage() {
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
      console.error("Failed to load workshop orders page data:", err);
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
        جارٍ تحميل أوامر العمل الخارجية والفوترة...
      </div>
    );
  }

  return (
    <ExternalOrdersListView
      locations={locations}
      items={items}
    />
  );
}
