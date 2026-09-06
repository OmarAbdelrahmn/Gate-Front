"use client";

import React, { useState, useEffect } from "react";
import { ProfitReportView } from "../components/ProfitReportView";
import { getMaintenanceLocations } from "@/lib/maintenance/api";
import type { MaintenanceLocation } from "@/lib/maintenance/types";

export default function MaintenanceWorkshopsProfitPage() {
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const locs = await getMaintenanceLocations();
      setLocations(Array.isArray(locs) ? locs : []);
    } catch (err) {
      console.error("Failed to load locations for profit report:", err);
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
        جارٍ تحميل تقرير أرباح الورشة...
      </div>
    );
  }

  return (
    <ProfitReportView
      locations={locations}
    />
  );
}
