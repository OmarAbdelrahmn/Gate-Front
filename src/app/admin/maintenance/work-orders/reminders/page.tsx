"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowLeftRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OilRemindersView } from "../components/OilRemindersView";
import { DirectOilChangeModal } from "../components/DirectOilChangeModal";
import { CorrectOilChangeVehicleModal } from "../components/CorrectOilChangeVehicleModal";
import type { CompleteOilChangeResult } from "@/lib/maintenance/types";

function OilRemindersContent() {
  const searchParams = useSearchParams();
  const openOilChangeFor = searchParams.get("openOilChangeFor");

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [completedOilChange, setCompletedOilChange] = useState<CompleteOilChangeResult | null>(null);
  const [correctModalData, setCorrectModalData] = useState<CompleteOilChangeResult | null>(null);

  useEffect(() => {
    if (openOilChangeFor) {
      setVehicleId(openOilChangeFor);
    }
  }, [openOilChangeFor]);

  const handleStartOilChange = (vehicleId: string) => {
    setVehicleId(vehicleId);
  };

  return (
    <div className="space-y-4">
      {/* Post-Completion Fast Correction Banner */}
      {completedOilChange && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block">تم تسجيل عملية غيار الزيت بنجاح!</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                معرف العملية: {completedOilChange.id}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={() => {
                setCorrectModalData(completedOilChange);
                setCompletedOilChange(null);
              }}
              className="h-8 px-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 gap-1.5"
            >
              <ArrowLeftRight size={13} />
              <span>تصحيح المركبة في حال الخطأ</span>
            </Button>
            <button
              type="button"
              onClick={() => setCompletedOilChange(null)}
              className="p-1.5 text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
              title="إغلاق التنبيه"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <OilRemindersView key={refreshKey} onStartOilChange={handleStartOilChange} />

      {vehicleId && (
        <DirectOilChangeModal
          key={vehicleId}
          vehicleId={vehicleId}
          reminder={null}
          onClose={() => setVehicleId(null)}
          onCompleted={(result) => {
            setVehicleId(null);
            setRefreshKey((value) => value + 1);
            if (result) {
              setCompletedOilChange(result);
            }
          }}
        />
      )}

      {correctModalData && (
        <CorrectOilChangeVehicleModal
          isOpen={Boolean(correctModalData)}
          onClose={() => setCorrectModalData(null)}
          oilChangeId={correctModalData.id}
          currentVehicleId={correctModalData.vehicleId}
          currentVehicleType={correctModalData.vehicleType}
          onSuccess={() => {
            setRefreshKey((v) => v + 1);
            setCorrectModalData(null);
          }}
        />
      )}
    </div>
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
