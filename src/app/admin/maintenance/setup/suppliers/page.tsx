"use client";

import React, { useState, useEffect } from "react";
import { SuppliersTab } from "../components/SuppliersTab";
import { getSuppliers } from "@/lib/maintenance/api";
import type { Supplier } from "@/lib/maintenance/types";

export default function MaintenanceSetupSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <SuppliersTab
      suppliers={suppliers}
      loading={loading}
      onRefresh={loadSuppliers}
    />
  );
}
