"use client";

import React, { useState, useEffect } from "react";
import { LocationsTab } from "../components/LocationsTab";
import { getMaintenanceLocations } from "@/lib/maintenance/api";
import type { MaintenanceLocation } from "@/lib/maintenance/types";

export default function MaintenanceSetupLocationsPage() {
  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await getMaintenanceLocations();
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load locations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  return (
    <LocationsTab
      locations={locations}
      loading={loading}
      onRefresh={loadLocations}
    />
  );
}
