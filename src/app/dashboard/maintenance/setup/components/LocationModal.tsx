"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createMaintenanceLocation, updateMaintenanceLocation } from "@/lib/maintenance/api";
import { listOperatingCities } from "@/lib/workforce/api";
import type { MaintenanceLocation } from "@/lib/maintenance/types";
import { LocationType } from "@/lib/maintenance/types";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  location: MaintenanceLocation | null;
}

export function LocationModal({
  isOpen,
  onClose,
  onSaved,
  location,
}: LocationModalProps) {
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<{ id: string; nameAr: string }[]>([]);

  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [operatingCityId, setOperatingCityId] = useState("");
  const [locationType, setLocationType] = useState<LocationType>(LocationType.Warehouse);
  const [allowsCompanyVehicles, setAllowsCompanyVehicles] = useState(true);
  const [allowsExternalVehicles, setAllowsExternalVehicles] = useState(false);
  const [allowsSparePartSales, setAllowsSparePartSales] = useState(false);
  const [allowsPaidExternalRepairs, setAllowsPaidExternalRepairs] = useState(false);
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");

  useEffect(() => {
    listOperatingCities()
      .then((res: any) => {
        if (Array.isArray(res)) setCities(res);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (location) {
      setCode(location.code || "");
      setNameAr(location.nameAr || "");
      setNameEn(location.nameEn || "");
      setOperatingCityId(location.operatingCityId || "");
      setLocationType(location.locationType || LocationType.Warehouse);
      setAllowsCompanyVehicles(Boolean(location.allowsCompanyVehicles));
      setAllowsExternalVehicles(Boolean(location.allowsExternalVehicles));
      setAllowsSparePartSales(Boolean(location.allowsSparePartSales));
      setAllowsPaidExternalRepairs(Boolean(location.allowsPaidExternalRepairs));
      setInventoryEnabled(Boolean(location.inventoryEnabled));
      setAddress(location.address || "");
      setNotes(location.notes || "");
      setLatitude(location.latitude !== undefined && location.latitude !== null ? String(location.latitude) : "");
      setLongitude(location.longitude !== undefined && location.longitude !== null ? String(location.longitude) : "");
    } else {
      setCode("");
      setNameAr("");
      setNameEn("");
      setOperatingCityId("");
      setLocationType(LocationType.Warehouse);
      setAllowsCompanyVehicles(true);
      setAllowsExternalVehicles(false);
      setAllowsSparePartSales(false);
      setAllowsPaidExternalRepairs(false);
      setInventoryEnabled(true);
      setAddress("");
      setNotes("");
      setLatitude("");
      setLongitude("");
    }
  }, [location, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (location) {
        await updateMaintenanceLocation(location.id, {
          code,
          nameAr,
          nameEn,
          operatingCityId,
          locationType: Number(locationType),
          allowsCompanyVehicles,
          allowsExternalVehicles,
          allowsSparePartSales,
          allowsPaidExternalRepairs,
          inventoryEnabled,
          address: address || null,
          notes: notes || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          rowVersion: location.rowVersion,
        });
      } else {
        await createMaintenanceLocation({
          code,
          nameAr,
          nameEn,
          operatingCityId,
          locationType: Number(locationType),
          allowsCompanyVehicles,
          allowsExternalVehicles,
          allowsSparePartSales,
          allowsPaidExternalRepairs,
          inventoryEnabled,
          address: address || null,
          notes: notes || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          rowVersion: null,
        });
      }
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
      title={location ? "تعديل موقع الصيانة" : "إضافة موقع صيانة أو ورشة"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رمز الموقع (Code) <span className="text-red-500">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="مثال: JED-WH أو RUH-WS"
              required
              className="font-mono uppercase text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نوع الموقع <span className="text-red-500">*</span>
            </label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(Number(e.target.value) as LocationType)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
              required
            >
              <option value={LocationType.Warehouse}>مستودع (Warehouse)</option>
              <option value={LocationType.Workshop}>ورشة صيانة (Workshop)</option>
              <option value={LocationType.WarehouseAndWorkshop}>
                مستودع وورشة (Warehouse & Workshop)
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الاسم بالعربية <span className="text-red-500">*</span>
            </label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: ورشة الرياض المركزية"
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الاسم بالإنجليزية <span className="text-red-500">*</span>
            </label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Example: Riyadh Workshop"
              required
              dir="ltr"
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            مدينة التشغيل <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            value={operatingCityId}
            onChange={(val) => setOperatingCityId(val)}
            options={cities.map((c) => ({ value: c.id, label: c.nameAr }))}
            placeholder="اختر مدينة التشغيل..."
            required
          />
        </div>

        {/* Operational Flags */}
        <div className="rounded-xl border border-[var(--border)] p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            الصلاحيات والإمكانيات التشغيلية للموقع
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={inventoryEnabled}
                onChange={(e) => setInventoryEnabled(e.target.checked)}
                className="size-4 rounded text-[#1167c9]"
              />
              <span>تفعيل إدارة المخزون (Inventory Enabled)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={allowsCompanyVehicles}
                onChange={(e) => setAllowsCompanyVehicles(e.target.checked)}
                className="size-4 rounded text-[#1167c9]"
              />
              <span>صيانة مركبات الشركة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={allowsExternalVehicles}
                onChange={(e) => setAllowsExternalVehicles(e.target.checked)}
                className="size-4 rounded text-[#1167c9]"
              />
              <span>استقبال مركبات العملاء الخارجيين</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={allowsPaidExternalRepairs}
                onChange={(e) => setAllowsPaidExternalRepairs(e.target.checked)}
                className="size-4 rounded text-[#1167c9]"
              />
              <span>إصلاحات خارجية مدفوعة بأجور يد</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={allowsSparePartSales}
                onChange={(e) => setAllowsSparePartSales(e.target.checked)}
                className="size-4 rounded text-[#1167c9]"
              />
              <span>بيع قطع الغيار لعملاء الورشة</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              خط العرض (Latitude)
            </label>
            <Input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="مثال: 24.7136"
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              خط الطول (Longitude)
            </label>
            <Input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="مثال: 46.6753"
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            العنوان وملاحظات
          </label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="وصف العنوان أو الحي..."
            className="text-xs mb-2"
          />
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات إضافية..."
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            {location ? "حفظ التعديلات" : "إضافة الموقع"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
