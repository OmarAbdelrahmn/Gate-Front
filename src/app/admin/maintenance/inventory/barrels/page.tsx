"use client";

import React, { useState, useEffect } from "react";
import { OilBarrelsView } from "../components/OilBarrelsView";
import {
  getMaintenanceLocations,
  getInventoryItems,
  getDirectOilInventoryLocations,
} from "@/lib/maintenance/api";
import type {
  MaintenanceLocation,
  InventoryItem,
  DirectOilInventoryLocation,
} from "@/lib/maintenance/types";

export default function MaintenanceInventoryBarrelsPage() {
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [oilLocations, setOilLocations] = useState<DirectOilInventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, itms, directLocs] = await Promise.all([
        getMaintenanceLocations().catch(() => []),
        getInventoryItems().catch(() => []),
        getDirectOilInventoryLocations().catch(() => []),
      ]);
      setLocations(Array.isArray(locs) ? locs : []);
      setItems(Array.isArray(itms) ? itms : []);
      setOilLocations(Array.isArray(directLocs) ? directLocs : []);
    } catch (err) {
      console.error("Failed to load oil barrels data:", err);
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
        جارٍ تحميل بيانات براميل الزيوت...
      </div>
    );
  }

  return (
    <OilBarrelsView
      locations={locations}
      items={items}
      oilLocations={oilLocations}
    />
  );
}
