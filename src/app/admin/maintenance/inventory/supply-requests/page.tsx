"use client";

import React, { useState, useEffect } from "react";
import { SupplyRequestsQueueView } from "../components/SupplyRequestsQueueView";
import { getMaintenanceLocations } from "@/lib/maintenance/api";
import type { MaintenanceLocation } from "@/lib/maintenance/types";

export default function SupplyRequestsPage() {
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaintenanceLocations()
      .then((data) => {
        setLocations(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load locations for supply requests queue:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        جارٍ تحميل طابور طلبات صرف المستودع...
      </div>
    );
  }

  return <SupplyRequestsQueueView locations={locations} />;
}
