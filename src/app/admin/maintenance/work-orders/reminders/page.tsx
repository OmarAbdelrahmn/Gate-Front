"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OilRemindersView } from "../components/OilRemindersView";
import { DirectOilChangeModal } from "../components/DirectOilChangeModal";

function OilRemindersContent() {
  const searchParams = useSearchParams();
  const openOilChangeFor = searchParams.get("openOilChangeFor");

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (openOilChangeFor) {
      setVehicleId(openOilChangeFor);
    }
  }, [openOilChangeFor]);

  const handleStartOilChange = (vehicleId: string) => {
    setVehicleId(vehicleId);
  };

  return (
    <>
      <OilRemindersView key={refreshKey} onStartOilChange={handleStartOilChange} />
      {vehicleId && <DirectOilChangeModal key={vehicleId} vehicleId={vehicleId} reminder={null}
        onClose={() => setVehicleId(null)}
        onCompleted={() => { setVehicleId(null); setRefreshKey((value) => value + 1); }} />}
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
