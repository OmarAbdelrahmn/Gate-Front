"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ArrowLeftRight,
  Edit3,
  Ban,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { OilRemindersView } from "../components/OilRemindersView";
import { DirectOilChangeModal } from "../components/DirectOilChangeModal";
import { CorrectOilChangeVehicleModal } from "../components/CorrectOilChangeVehicleModal";
import { EditOilChangeModal } from "../components/EditOilChangeModal";
import { CancelOilChangeModal } from "../components/CancelOilChangeModal";
import { OilChangeDetailsModal } from "../components/OilChangeDetailsModal";
import type { CompleteOilChangeResult } from "@/lib/maintenance/types";
import { formatCurrency } from "@/lib/maintenance/constants";
import { useMaintenanceLookups } from "@/lib/maintenance/lookups";

function OilRemindersContent() {
  const searchParams = useSearchParams();
  const openOilChangeFor = searchParams.get("openOilChangeFor");
  const { can } = useAuth();
  const { resolveVehicleLabel } = useMaintenanceLookups();

  const canEditOilChange =
    can("maintenance.oil.edit") &&
    can("inventory.stock.move") &&
    can("inventory.cost_layers.read");
  const canCancelOilChange =
    can("maintenance.oil.cancel") &&
    can("inventory.stock.adjust") &&
    can("inventory.cost_layers.read");

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [completedOilChange, setCompletedOilChange] =
    useState<CompleteOilChangeResult | null>(null);
  const [correctModalData, setCorrectModalData] =
    useState<CompleteOilChangeResult | null>(null);
  const [editOilChangeId, setEditOilChangeId] = useState<string | null>(null);
  const [cancelOilChangeId, setCancelOilChangeId] = useState<string | null>(
    null,
  );
  const [detailsOilChangeId, setDetailsOilChangeId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (openOilChangeFor) {
      setVehicleId(openOilChangeFor);
    }
  }, [openOilChangeFor]);

  const handleStartOilChange = (targetVehicleId: string) => {
    setVehicleId(targetVehicleId);
  };

  return (
    <div className="space-y-4">
      {/* Post-Completion Fast Action Banner (No raw IDs) */}
      {completedOilChange && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block">
                تم تسجيل عملية غيار الزيت بنجاح للمركبة{" "}
                {resolveVehicleLabel(completedOilChange.vehicleId)}!
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                العداد:{" "}
                {Number(
                  completedOilChange.odometerAtChange ?? 0,
                ).toLocaleString()}{" "}
                كم • الكمية: {completedOilChange.oilQuantityLiters} لتر • التكلفة
                الإجمالية: {formatCurrency(completedOilChange.totalCost)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={() => setDetailsOilChangeId(completedOilChange.id)}
              className="h-8 px-2.5 text-xs font-bold gap-1.5"
            >
              <Eye size={13} />
              <span>التفاصيل والمراجعات</span>
            </Button>
            {canEditOilChange && (
              <Button
                variant="secondary"
                onClick={() => setEditOilChangeId(completedOilChange.id)}
                className="h-8 px-2.5 text-xs font-bold text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50 gap-1.5"
              >
                <Edit3 size={13} />
                <span>تعديل غيار الزيت</span>
              </Button>
            )}
            {canCancelOilChange && (
              <Button
                variant="secondary"
                onClick={() => setCancelOilChangeId(completedOilChange.id)}
                className="h-8 px-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 gap-1.5"
              >
                <Ban size={13} />
                <span>إلغاء غيار الزيت</span>
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setCorrectModalData(completedOilChange);
              }}
              className="h-8 px-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 gap-1.5"
            >
              <ArrowLeftRight size={13} />
              <span>تصحيح المركبة</span>
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

      <OilRemindersView
        key={refreshKey}
        onStartOilChange={handleStartOilChange}
      />

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
            setCompletedOilChange(null);
          }}
        />
      )}

      {editOilChangeId && (
        <EditOilChangeModal
          isOpen={Boolean(editOilChangeId)}
          oilChangeId={editOilChangeId}
          onClose={() => setEditOilChangeId(null)}
          onSuccess={() => {
            setRefreshKey((v) => v + 1);
            setEditOilChangeId(null);
          }}
        />
      )}

      {cancelOilChangeId && (
        <CancelOilChangeModal
          isOpen={Boolean(cancelOilChangeId)}
          oilChangeId={cancelOilChangeId}
          onClose={() => setCancelOilChangeId(null)}
          onSuccess={() => {
            setRefreshKey((v) => v + 1);
            setCancelOilChangeId(null);
            setCompletedOilChange(null);
          }}
        />
      )}

      {detailsOilChangeId && (
        <OilChangeDetailsModal
          isOpen={Boolean(detailsOilChangeId)}
          oilChangeId={detailsOilChangeId}
          onClose={() => setDetailsOilChangeId(null)}
          onRequestEdit={(id) => {
            setDetailsOilChangeId(null);
            setEditOilChangeId(id);
          }}
          onRequestCancel={(id) => {
            setDetailsOilChangeId(null);
            setCancelOilChangeId(id);
          }}
          onRequestCorrectVehicle={(id, vId, vType) => {
            setDetailsOilChangeId(null);
            setCorrectModalData({
              id,
              vehicleId: vId || "",
              vehicleType: vType,
              maintenanceWorkOrderId: null,
              performedAtUtc: "",
              odometerAtChange: 0,
              oilQuantityLiters: 0,
              oilCost: 0,
              oilFilterChanged: false,
              oilFilterCost: 0,
              laborCost: 0,
              otherCost: 0,
              totalCost: 0,
              riderProfileId: null,
            });
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
