"use client";

import React, { useState } from "react";
import { PlusCircle, Edit2, Building2, Check, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LocationModal } from "./LocationModal";
import type { MaintenanceLocation } from "@/lib/maintenance/types";
import { locationTypeLabels } from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface LocationsTabProps {
  locations: MaintenanceLocation[];
  loading: boolean;
  onRefresh: () => void;
}

export function LocationsTab({ locations, loading, onRefresh }: LocationsTabProps) {
  const { can } = useAuth();
  const canManage = can("maintenance.locations.manage");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MaintenanceLocation | null>(null);

  const handleEdit = (loc: MaintenanceLocation) => {
    setSelectedLocation(loc);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedLocation(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            مواقع وورش الصيانة والمستودعات
          </h2>
          <p className="text-xs text-slate-500">
            تحديد المستودعات والورش، وتحديد إمكانية خدمة أسطول الشركة أو العملاء الخارجيين ومبيعات القطع.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={handleCreate} className="text-xs">
            <PlusCircle size={15} />
            إضافة موقع صيانة جديد
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رمز الموقع</th>
              <th className="p-3">اسم الموقع</th>
              <th className="p-3">نوع الموقع</th>
              <th className="p-3">المدينة</th>
              <th className="p-3 text-center">المخزون</th>
              <th className="p-3 text-center">مركبات الشركة</th>
              <th className="p-3 text-center">مركبات خارجية</th>
              <th className="p-3 text-center">إصلاح مدفوع</th>
              <th className="p-3 text-center">بيع قطع</th>
              {canManage && <th className="p-3 text-center">الإجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  جارٍ تحميل المواقع...
                </td>
              </tr>
            ) : locations.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  لا توجد مواقع مسجلة. أضف موقعاً جديداً للبدء.
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3">
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/50">
                      {loc.code}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div>{loc.nameAr}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{loc.nameEn}</div>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                    {locationTypeLabels[loc.locationType] || loc.locationType}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {loc.operatingCityNameAr || "-"}
                  </td>
                  <td className="p-3 text-center">
                    {loc.inventoryEnabled ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={12} />
                      </span>
                    ) : (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <X size={12} />
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {loc.allowsCompanyVehicles ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <Check size={12} />
                      </span>
                    ) : (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <X size={12} />
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {loc.allowsExternalVehicles ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                        <Check size={12} />
                      </span>
                    ) : (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <X size={12} />
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {loc.allowsPaidExternalRepairs ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <Check size={12} />
                      </span>
                    ) : (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <X size={12} />
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {loc.allowsSparePartSales ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={12} />
                      </span>
                    ) : (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <X size={12} />
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="p-3 text-center">
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(loc)}
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

      <LocationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
        location={selectedLocation}
      />
    </div>
  );
}
