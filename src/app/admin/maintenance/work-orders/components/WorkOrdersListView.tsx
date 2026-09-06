"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Eye, Wrench, RefreshCw, Car, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { WorkOrderDetailModal } from "./WorkOrderDetailModal";
import { CreateCompanyWorkOrderModal } from "./CreateCompanyWorkOrderModal";
import { getWorkOrders } from "@/lib/maintenance/api";
import type {
  WorkOrder,
  MaintenanceLocation,
  InventoryItem,
} from "@/lib/maintenance/types";
import {
  workOrderStatusConfig,
  maintenanceTypeLabels,
  formatCurrency,
  formatDateTime,
} from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface WorkOrdersListViewProps {
  locations: MaintenanceLocation[];
  items: InventoryItem[];
}

export function WorkOrdersListView({ locations, items }: WorkOrdersListViewProps) {
  const { can } = useAuth();
  const canManage = can("maintenance.work_orders.manage");

  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  // Filters
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getWorkOrders({
        maintenanceLocationId: locationFilter || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        serviceSubjectType: subjectFilter === "all" ? undefined : Number(subjectFilter),
      });
      setWorkOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [locationFilter, statusFilter, subjectFilter]);

  return (
    <div className="space-y-4">
      {/* Filters & Create CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <SearchableSelect
              value={locationFilter}
              onChange={(val) => setLocationFilter(val)}
              options={[
                { value: "", label: "جميع المواقع والورش" },
                ...locations.map((l) => ({
                  value: l.id,
                  label: `${l.nameAr} (${l.code})`,
                })),
              ]}
              placeholder="فلترة بالموقع..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-bold focus:outline-hidden"
          >
            <option value="all">جميع الحالات</option>
            <option value="1">مفتوح (Open)</option>
            <option value="2">قيد التنفيذ (InProgress)</option>
            <option value="3">مكتمل (Completed)</option>
            <option value="4">مغلق نهائياً (Closed)</option>
            <option value="5">ملغي (Cancelled)</option>
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-bold focus:outline-hidden"
          >
            <option value="all">جميع الأهداف</option>
            <option value="1">مركبات الشركة</option>
            <option value="2">عملاء خارجيين</option>
          </select>

          <Button variant="secondary" onClick={loadOrders} loading={loading} className="h-9 text-xs">
            <RefreshCw size={14} />
            تحديث
          </Button>
        </div>

        {canManage && (
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs shrink-0"
          >
            <PlusCircle size={15} />
            أمر صيانة شركة جديد
          </Button>
        )}
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رقم الأمر</th>
              <th className="p-3">هدف الخدمة</th>
              <th className="p-3">نوع الصيانة</th>
              <th className="p-3">الموقع / الورشة</th>
              <th className="p-3 text-center">العداد عند الفتح</th>
              <th className="p-3 text-center">حالة الأمر</th>
              <th className="p-3 text-left font-mono">التكلفة الإجمالية</th>
              <th className="p-3 text-center">تاريخ الفتح</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  جارٍ تحميل أوامر الصيانة...
                </td>
              </tr>
            ) : workOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  لا توجد أوامر صيانة مطابقة للفلتر المحدد.
                </td>
              </tr>
            ) : (
              workOrders.map((order) => {
                const statusCfg = workOrderStatusConfig[order.status];
                const isCompany = order.serviceSubjectType === 1;

                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 font-mono font-black text-[#1167c9] dark:text-blue-400">
                      {order.workOrderNumber}
                    </td>
                    <td className="p-3">
                      {isCompany ? (
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <Car size={14} className="text-blue-600 shrink-0" />
                          <span>مركبة: {order.vehicleAssetNumber || "غير محدد"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <User size={14} className="text-amber-600 shrink-0" />
                          <span>عميل: {order.externalVehicle?.customerName || order.externalVehicle?.plateOrReference}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {maintenanceTypeLabels[order.maintenanceType] || order.maintenanceType}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {order.maintenanceLocationNameAr}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                      {order.odometerAtOpen ? `${order.odometerAtOpen.toLocaleString()} كم` : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                      >
                        {statusCfg?.label}
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(order.actualTotalCost)}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500">
                      {formatDateTime(order.openedAtUtc)}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="h-8 px-2.5 text-xs inline-flex items-center gap-1"
                      >
                        <Eye size={13} />
                        عرض وإدارة
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      <CreateCompanyWorkOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSaved={loadOrders}
        locations={locations}
      />

      {/* Detail Modal */}
      <WorkOrderDetailModal
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        workOrderId={selectedOrderId}
        items={items}
        locations={locations}
        onUpdated={loadOrders}
      />
    </div>
  );
}
