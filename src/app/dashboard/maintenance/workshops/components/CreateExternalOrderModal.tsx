"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createExternalWorkOrder } from "@/lib/maintenance/api";
import type { MaintenanceLocation } from "@/lib/maintenance/types";
import { MaintenanceType } from "@/lib/maintenance/types";
import { maintenanceTypeLabels } from "@/lib/maintenance/constants";

interface CreateExternalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  locations: MaintenanceLocation[];
}

export function CreateExternalOrderModal({
  isOpen,
  onClose,
  onSaved,
  locations,
}: CreateExternalOrderModalProps) {
  const [loading, setLoading] = useState(false);

  // Filter locations that allow external vehicles (e.g. RUH-WS)
  const allowedLocations = locations.filter(
    (l) => l.allowsExternalVehicles && l.allowsPaidExternalRepairs,
  );

  const [maintenanceLocationId, setMaintenanceLocationId] = useState(
    allowedLocations[0]?.id || "",
  );
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>(
    MaintenanceType.Corrective,
  );

  // External Vehicle Snapshot
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [plateOrReference, setPlateOrReference] = useState("");
  const [vehicleType, setVehicleType] = useState<number>(2); // 2 = Car, 1 = Motorcycle
  const [odometerAtOpen, setOdometerAtOpen] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!maintenanceLocationId) {
      alert("يرجى اختيار ورشة الصيانة المؤهلة للعمل الخارجي (مثل ورشة الرياض).");
      return;
    }
    if (!customerName.trim()) {
      alert("يرجى إدخال اسم العميل.");
      return;
    }
    if (!plateOrReference.trim()) {
      alert("يرجى إدخال رقم اللوحة أو المرجع للمركبة.");
      return;
    }

    setLoading(true);
    try {
      await createExternalWorkOrder({
        serviceSubjectType: 2,
        vehicleId: null,
        vehicleIssueId: null,
        maintenanceLocationId,
        maintenanceType: Number(maintenanceType),
        openedAtUtc: new Date().toISOString(),
        scheduledAtUtc: null,
        odometerAtOpen: odometerAtOpen ? parseInt(odometerAtOpen) : null,
        estimatedCost: 0,
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
        externalVehicle: {
          plateOrReference: plateOrReference.trim().toUpperCase(),
          vehicleType: Number(vehicleType),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim() || null,
        },
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
      title="إنشاء أمر صيانة لعميل خارجي (ورشة الرياض)"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Customer & Vehicle Snapshot */}
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
          <span className="font-bold text-amber-900 dark:text-amber-300 block">
            بيانات العميل والمركبة الخارجية (اللقطة التوثيقية)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم العميل <span className="text-red-500">*</span>
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: عبد الله محمد الشمري"
                required
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم جوال العميل <span className="text-red-500">*</span>
              </label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                required
                dir="ltr"
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم اللوحة / المرجع <span className="text-red-500">*</span>
              </label>
              <Input
                value={plateOrReference}
                onChange={(e) => setPlateOrReference(e.target.value)}
                placeholder="مثال: أ ب ج 1234"
                required
                className="text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                نوع المركبة
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(Number(e.target.value))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-bold focus:outline-hidden"
              >
                <option value={2}>سيارة (Car)</option>
                <option value={1}>دراجة نارية (Motorcycle)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                قراءة العداد (كم)
              </label>
              <Input
                type="number"
                min="0"
                value={odometerAtOpen}
                onChange={(e) => setOdometerAtOpen(e.target.value)}
                placeholder="اختياري"
                className="text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Location & Maintenance Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              الورشة المستلمة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={maintenanceLocationId}
              onChange={(val) => setMaintenanceLocationId(val)}
              options={allowedLocations.map((l) => ({
                value: l.id,
                label: `${l.nameAr} (${l.code})`,
              }))}
              placeholder="اختر الورشة المؤهلة..."
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              نوع الخدمة المطلوبة <span className="text-red-500">*</span>
            </label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(Number(e.target.value) as MaintenanceType)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-bold focus:outline-hidden"
              required
            >
              {Object.entries(maintenanceTypeLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            شكوى العميل / العطل المطلوب إصلاحه
          </label>
          <Input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="مثال: فحص وتغيير أقمشة الفرامل وتغيير الزيت..."
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            ملاحظات
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي اتفاقات خاصة أو تفاصيل..."
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            فتح أمر الصيانة الخارجي
          </Button>
        </div>
      </form>
    </Modal>
  );
}
