"use client";

import React, { useState, useEffect } from "react";
import { ItemsTab } from "../components/ItemsTab";
import { getInventoryItems } from "@/lib/maintenance/api";
import type { InventoryItem } from "@/lib/maintenance/types";

export default function MaintenanceSetupItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async (search?: string) => {
    setLoading(true);
    try {
      const data = await getInventoryItems(search);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleSearchItems = async (q: string) => {
    loadItems(q);
  };

  return (
    <ItemsTab
      items={items}
      loading={loading}
      onRefresh={() => loadItems()}
      onSearch={handleSearchItems}
    />
  );
}
