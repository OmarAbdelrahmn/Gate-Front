"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createMaintenancePlan, updateMaintenancePlan } from "@/lib/maintenance/api";
import type { MaintenancePlan, InventoryItem } from "@/lib/maintenance/types";
import { ItemType } from "@/lib/maintenance/types";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  plan: MaintenancePlan | null;
  items: InventoryItem[];
}

export function PlanModal({ isOpen, onClose, onSaved, plan, items }: PlanModalProps) {
  const [loading, setLoading] = useState(false);

  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [vehicleType, setVehicleType] = useState<number>(2); // 2 = Car, 1 = Motorcycle
  const [triggerType, setTriggerType] = useState<number>(1); // 1 = Kilometers, 2 = Days, 3 = Both
  const [intervalDays, setIntervalDays] = useState<string>("90");
  const [intervalKilometers, setIntervalKilometers] = useState<string>("5000");
  const [reminderAfterKilometers, setReminderAfterKilometers] = useState<string>("4000");
  const [maximumAfterKilometers, setMaximumAfterKilometers] = useState<string>("5000");
  const [alertDaysBefore, setAlertDaysBefore] = useState<string>("7");
  const [alertKilometersBefore, setAlertKilometersBefore] = useState<string>("500");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [defaultOilQuantityLiters, setDefaultOilQuantityLiters] = useState<string>("4");

  useEffect(() => {
    if (plan) {
      setCode(plan.code || "");
      setNameAr(plan.nameAr || "");
      setNameEn(plan.nameEn || "");
      setVehicleType(plan.vehicleType || 2);
      setTriggerType(plan.triggerType || 1);
      setIntervalDays(plan.intervalDays ? String(plan.intervalDays) : "");
      setIntervalKilometers(plan.intervalKilometers ? String(plan.intervalKilometers) : "");
      setReminderAfterKilometers(plan.reminderAfterKilometers ? String(plan.reminderAfterKilometers) : "");
      setMaximumAfterKilometers(plan.maximumAfterKilometers ? String(plan.maximumAfterKilometers) : "");
      setAlertDaysBefore(plan.alertDaysBefore ? String(plan.alertDaysBefore) : "");
      setAlertKilometersBefore(plan.alertKilometersBefore ? String(plan.alertKilometersBefore) : "");
      setInventoryItemId(plan.inventoryItemId || "");
      setDefaultOilQuantityLiters(plan.defaultOilQuantityLiters ? String(plan.defaultOilQuantityLiters) : "");
    } else {
      setCode("");
      setNameAr("");
      setNameEn("");
      setVehicleType(2);
      setTriggerType(1);
      setIntervalDays("90");
      setIntervalKilometers("5000");
      setReminderAfterKilometers("4000");
      setMaximumAfterKilometers("5000");
      setAlertDaysBefore("7");
      setAlertKilometersBefore("500");
      setInventoryItemId("");
      setDefaultOilQuantityLiters("4");
    }
  }, [plan, isOpen]);

  // Adjust defaults when vehicle type changes
  const handleVehicleTypeChange = (type: number) => {
    setVehicleType(type);
    if (type === 1) {
      // Motorcycle
      setIntervalKilometers("1000");
      setReminderAfterKilometers("800");
      setMaximumAfterKilometers("1000");
      setDefaultOilQuantityLiters("1");
    } else {
      // Car
      setIntervalKilometers("5000");
      setReminderAfterKilometers("4000");
      setMaximumAfterKilometers("5000");
      setDefaultOilQuantityLiters("4");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (plan) {
        await updateMaintenancePlan(plan.id, {
          code,
          nameAr,
          nameEn,
          vehicleModelId: null,
          vehicleType,
          triggerType,
          intervalDays: intervalDays ? parseInt(intervalDays) : null,
          intervalKilometers: intervalKilometers ? parseInt(intervalKilometers) : null,
          reminderAfterKilometers: reminderAfterKilometers ? parseInt(reminderAfterKilometers) : null,
          maximumAfterKilometers: maximumAfterKilometers ? parseInt(maximumAfterKilometers) : null,
          alertDaysBefore: alertDaysBefore ? parseInt(alertDaysBefore) : null,
          alertKilometersBefore: alertKilometersBefore ? parseInt(alertKilometersBefore) : null,
          inventoryItemId: inventoryItemId || null,
          defaultOilQuantityLiters: defaultOilQuantityLiters ? parseFloat(defaultOilQuantityLiters) : null,
          checklistJson: null,
          rowVersion: plan.rowVersion,
        });
      } else {
        await createMaintenancePlan({
          code,
          nameAr,
          nameEn,
          vehicleModelId: null,
          vehicleType,
          triggerType,
          intervalDays: intervalDays ? parseInt(intervalDays) : null,
          intervalKilometers: intervalKilometers ? parseInt(intervalKilometers) : null,
          reminderAfterKilometers: reminderAfterKilometers ? parseInt(reminderAfterKilometers) : null,
          maximumAfterKilometers: maximumAfterKilometers ? parseInt(maximumAfterKilometers) : null,
          alertDaysBefore: alertDaysBefore ? parseInt(alertDaysBefore) : null,
          alertKilometersBefore: alertKilometersBefore ? parseInt(alertKilometersBefore) : null,
          inventoryItemId: inventoryItemId || null,
          defaultOilQuantityLiters: defaultOilQuantityLiters ? parseFloat(defaultOilQuantityLiters) : null,
          checklistJson: null,
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

  const oilItems = items.filter((i) => i.itemType === ItemType.Oil);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? "تعديل خطة الصيانة الدورية" : "إضافة خطة صيانة دورية جديدة"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رمز الخطة (Code) <span className="text-red-500">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="مثال: PLN-OIL-CAR5K"
              required
              className="font-mono uppercase text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نوع المركبة المستهدفة <span className="text-red-500">*</span>
            </label>
            <select
              value={vehicleType}
              onChange={(e) => handleVehicleTypeChange(Number(e.target.value))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
              required
            >
              <option value={2}>سيارة (Car - 5,000 كم)</option>
              <option value={1}>دراجة نارية (Motorcycle - 1,000 كم)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              طريقة التنبيه (Trigger) <span className="text-red-500">*</span>
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(Number(e.target.value))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
              required
            >
              <option value={1}>حسب عداد الكيلومترات (Odometer)</option>
              <option value={2}>حسب عدد الأيام (Time/Days)</option>
              <option value={3}>الأسبق بين العداد والأيام</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم الخطة بالعربية <span className="text-red-500">*</span>
            </label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: دورة تغيير زيت السيارات 5000 كم"
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم الخطة بالإنجليزية <span className="text-red-500">*</span>
            </label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Example: Car Oil Change 5,000 KM"
              required
              dir="ltr"
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              بدء التذكير بعد (كم) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={reminderAfterKilometers}
              onChange={(e) => setReminderAfterKilometers(e.target.value)}
              placeholder="4000 للسيارات / 800 للدراجات"
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الحد الأقصى للاستحقاق (كم) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={maximumAfterKilometers}
              onChange={(e) => setMaximumAfterKilometers(e.target.value)}
              placeholder="5000 للسيارات / 1000 للدراجات"
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              كمية الزيت الافتراضية (لتر)
            </label>
            <Input
              type="number"
              step="0.1"
              value={defaultOilQuantityLiters}
              onChange={(e) => setDefaultOilQuantityLiters(e.target.value)}
              placeholder="مثال: 4 أو 1"
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            صنف الزيت المقترن (اختياري)
          </label>
          <SearchableSelect
            value={inventoryItemId}
            onChange={(val) => setInventoryItemId(val)}
            options={[
              { value: "", label: "بدون تقييد لصنف محدد" },
              ...oilItems.map((i) => ({
                value: i.id,
                label: `${i.nameAr} (${i.sku})`,
              })),
            ]}
            placeholder="اختر صنف الزيت المقترن..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            {plan ? "حفظ التعديلات" : "إضافة الخطة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
