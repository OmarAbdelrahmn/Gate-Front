"use client";

import React, { useState, useEffect } from "react";
import { ItemsTab } from "../components/ItemsTab";
import { getInventoryItems } from "@/lib/maintenance/api";
import type { InventoryItem, VehicleType } from "@/lib/maintenance/types";

export default function MaintenanceSetupItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleType | null>(null);

  const loadItems = async (search?: string, vehicleType?: VehicleType | null) => {
    setLoading(true);
    try {
      const s = search !== undefined ? search : searchQuery;
      const vt = vehicleType !== undefined ? vehicleType : vehicleTypeFilter;
      const data = await getInventoryItems({
        search: s || undefined,
        vehicleType: vt ?? undefined,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems("", null);
  }, []);

  const handleSearchItems = async (q: string) => {
    setSearchQuery(q);
    loadItems(q, vehicleTypeFilter);
  };

  const handleVehicleTypeFilterChange = (vt: VehicleType | null) => {
    setVehicleTypeFilter(vt);
    loadItems(searchQuery, vt);
  };

  return (
    <ItemsTab
      items={items}
      loading={loading}
      onRefresh={() => loadItems(searchQuery, vehicleTypeFilter)}
      onSearch={handleSearchItems}
      vehicleTypeFilter={vehicleTypeFilter}
      onVehicleTypeFilterChange={handleVehicleTypeFilterChange}
    />
  );
}
