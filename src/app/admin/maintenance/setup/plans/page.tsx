"use client";

import React, { useState, useEffect } from "react";
import { PlansTab } from "../components/PlansTab";
import {
  getMaintenancePlans,
  getInventoryItems,
} from "@/lib/maintenance/api";
import type {
  MaintenancePlan,
  InventoryItem,
} from "@/lib/maintenance/types";

export default function MaintenanceSetupPlansPage() {
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plns, itms] = await Promise.all([
        getMaintenancePlans().catch(() => []),
        getInventoryItems().catch(() => []),
      ]);
      setPlans(Array.isArray(plns) ? plns : []);
      setItems(Array.isArray(itms) ? itms : []);
    } catch (err) {
      console.error("Failed to load maintenance plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <PlansTab
      plans={plans}
      items={items}
      loading={loading}
      onRefresh={loadData}
    />
  );
}
