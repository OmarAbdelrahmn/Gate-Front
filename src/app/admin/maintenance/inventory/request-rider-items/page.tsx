"use client";

import React, { useState, useEffect } from "react";
import { RequestRiderItemsView } from "../components/RequestRiderItemsView";
import { getMaintenanceLocations, getInventoryItems } from "@/lib/maintenance/api";
import type { MaintenanceLocation, InventoryItem } from "@/lib/maintenance/types";

export default function RequestRiderItemsPage() {
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMaintenanceLocations().catch(() => []),
      getInventoryItems().catch(() => []),
    ])
      .then(([locs, itms]) => {
        setLocations(Array.isArray(locs) ? locs : []);
        setItems(Array.isArray(itms) ? itms : []);
      })
      .catch((err) => {
        console.error("Failed to load data for rider item request:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        جارٍ تحميل بيانات طلب مستلزمات المناديب...
      </div>
    );
  }

  return <RequestRiderItemsView locations={locations} items={items} />;
}
