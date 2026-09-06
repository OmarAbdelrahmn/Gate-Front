"use client";

import React, { useState } from "react";
import { PlusCircle, Edit2, Clock, Gauge, Droplets } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PlanModal } from "./PlanModal";
import type { MaintenancePlan, InventoryItem } from "@/lib/maintenance/types";
import { useAuth } from "@/lib/auth/AuthProvider";

interface PlansTabProps {
  plans: MaintenancePlan[];
  items: InventoryItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function PlansTab({ plans, items, loading, onRefresh }: PlansTabProps) {
  const { can } = useAuth();
  const canManage = can("maintenance.work_orders.manage");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);

  const handleEdit = (p: MaintenancePlan) => {
    setSelectedPlan(p);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            خطط الصيانة الوقائية والزيوت
          </h2>
          <p className="text-xs text-slate-500">
            قواعد تذكيرات الزيوت للسيارات (تذكير عند 4,000 كم / استحقاق عند 5,000 كم) والدراجات (تذكير عند 800 كم / استحقاق عند 1,000 كم).
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={handleCreate} className="text-xs">
            <PlusCircle size={15} />
            إضافة خطة دورية جديدة
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رمز الخطة</th>
              <th className="p-3">اسم الخطة</th>
              <th className="p-3">المركبة المستهدفة</th>
              <th className="p-3">بدء التذكير</th>
              <th className="p-3">الحد الأقصى للاستحقاق</th>
              <th className="p-3 text-center">كمية الزيت</th>
              {canManage && <th className="p-3 text-center">الإجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  جارٍ تحميل خطط الصيانة...
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  لا توجد خطط مسجلة حتى الآن.
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {plan.code}
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div>{plan.nameAr}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{plan.nameEn}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        plan.vehicleType === 1
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      }`}
                    >
                      {plan.vehicleType === 1 ? "دراجة نارية (1,000 كم)" : "سيارة (5,000 كم)"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">
                    {plan.reminderAfterKilometers
                      ? `${plan.reminderAfterKilometers.toLocaleString()} كم`
                      : "-"}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 font-mono font-bold">
                    {plan.maximumAfterKilometers
                      ? `${plan.maximumAfterKilometers.toLocaleString()} كم`
                      : "-"}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                    {plan.defaultOilQuantityLiters ? `${plan.defaultOilQuantityLiters} لتر` : "-"}
                  </td>
                  {canManage && (
                    <td className="p-3 text-center">
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(plan)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <Edit2 size={13} />
                        تعديل
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PlanModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
        plan={selectedPlan}
        items={items}
      />
    </div>
  );
}
