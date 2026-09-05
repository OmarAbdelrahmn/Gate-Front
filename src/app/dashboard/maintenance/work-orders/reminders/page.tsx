"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OilRemindersView } from "../components/OilRemindersView";
import { CreateCompanyWorkOrderModal } from "../components/CreateCompanyWorkOrderModal";
import { getMaintenanceLocations } from "@/lib/maintenance/api";
import type { MaintenanceLocation } from "@/lib/maintenance/types";
import { MaintenanceType } from "@/lib/maintenance/types";

function OilRemindersContent() {
  const searchParams = useSearchParams();
  const openOilChangeFor = searchParams.get("openOilChangeFor");

  const [locations, setLocations] = useState<MaintenanceLocation[]>([]);
  const [prefillVehicleId, setPrefillVehicleId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    getMaintenanceLocations()
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    if (openOilChangeFor) {
      setPrefillVehicleId(openOilChangeFor);
      setCreateModalOpen(true);
    }
  }, [openOilChangeFor]);

  const handleStartOilChange = (vehicleId: string) => {
    setPrefillVehicleId(vehicleId);
    setCreateModalOpen(true);
  };

  return (
    <>
      <OilRemindersView onStartOilChange={handleStartOilChange} />

      <CreateCompanyWorkOrderModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setPrefillVehicleId(null);
        }}
        onSaved={() => {}}
        locations={locations}
        initialVehicleId={prefillVehicleId || undefined}
        initialMaintenanceType={MaintenanceType.OilChange}
      />
    </>
  );
}

export default function MaintenanceWorkOrdersRemindersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          جارٍ تحميل لوحة استحقاقات وتذكيرات الزيوت...
        </div>
      }
    >
      <OilRemindersContent />
    </Suspense>
  );
}
