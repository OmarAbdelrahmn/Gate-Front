"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createCompanyWorkOrder } from "@/lib/maintenance/api";
import { getVehicles } from "@/lib/fleet/api";
import type { MaintenanceLocation } from "@/lib/maintenance/types";
import { MaintenanceType } from "@/lib/maintenance/types";
import { maintenanceTypeLabels } from "@/lib/maintenance/constants";

interface CreateCompanyWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  locations: MaintenanceLocation[];
  initialVehicleId?: string;
  initialMaintenanceType?: MaintenanceType;
}

export function CreateCompanyWorkOrderModal({
  isOpen,
  onClose,
  onSaved,
  locations,
  initialVehicleId,
  initialMaintenanceType,
}: CreateCompanyWorkOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; plateNumber: string; assetNumber: string }[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [maintenanceLocationId, setMaintenanceLocationId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>(
    MaintenanceType.Corrective,
  );
  const [openedAtUtc, setOpenedAtUtc] = useState(new Date().toISOString().slice(0, 16));
  const [odometerAtOpen, setOdometerAtOpen] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Load active company vehicles
    getVehicles({ pageSize: 150 })
      .then((res) => {
        if (res?.items) {
          setVehicles(
            res.items.map((v) => ({
              id: v.id,
              plateNumber: v.plateNumberAr || v.plateNumberEn || "",
              assetNumber: v.assetNumber || "مركبة",
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialVehicleId) setVehicleId(initialVehicleId);
      if (initialMaintenanceType) setMaintenanceType(initialMaintenanceType);
      setOpenedAtUtc(new Date().toISOString().slice(0, 16));
    }
  }, [isOpen, initialVehicleId, initialMaintenanceType]);

  // Filter locations that allow company vehicles
  const allowedLocations = locations.filter((l) => l.allowsCompanyVehicles);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      alert("يرجى اختيار مركبة الشركة.");
      return;
    }
    if (!maintenanceLocationId) {
      alert("يرجى اختيار موقع الصيانة أو الورشة.");
      return;
    }

    setLoading(true);
    try {
      await createCompanyWorkOrder({
        serviceSubjectType: 1,
        vehicleId,
        maintenanceLocationId,
        maintenanceType: Number(maintenanceType),
        openedAtUtc: new Date(openedAtUtc).toISOString(),
        odometerAtOpen: odometerAtOpen ? parseInt(odometerAtOpen) : null,
        estimatedCost: Number(estimatedCost || 0),
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
        externalVehicle: null,
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إنشاء أمر صيانة لمركبة شركة"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              مركبة الشركة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={vehicleId}
              onChange={(val) => setVehicleId(val)}
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.assetNumber} - لوحة: ${v.plateNumber}`,
              }))}
              placeholder="اختر المركبة من الأسطول..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              موقع الصيانة / الورشة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={maintenanceLocationId}
              onChange={(val) => setMaintenanceLocationId(val)}
              options={allowedLocations.map((l) => ({
                value: l.id,
                label: `${l.nameAr} (${l.code})`,
              }))}
              placeholder="اختر موقع الصيانة..."
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نوع الصيانة <span className="text-red-500">*</span>
            </label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(Number(e.target.value) as MaintenanceType)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
              required
            >
              {Object.entries(maintenanceTypeLabels)
                .filter(([k]) => Number(k) !== 6) // Exclude PartSaleOnly for company vehicles
                .map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              قراءة العداد عند الدخول (كم)
            </label>
            <Input
              type="number"
              min="0"
              value={odometerAtOpen}
              onChange={(e) => setOdometerAtOpen(e.target.value)}
              placeholder="قراءة العداد الحالية"
              className="text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              التكلفة التقديرية (ر.س)
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
              className="text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            وصف العطل / التشخيص المبدئي
          </label>
          <Input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="مثال: صوت طقطقة في المكابح الأمامية..."
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            ملاحظات إضافية
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي تفاصيل أو متطلبات فحص خاصة..."
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            إنشاء أمر الصيانة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
