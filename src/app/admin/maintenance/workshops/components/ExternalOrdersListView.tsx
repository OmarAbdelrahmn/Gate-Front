"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, CreditCard, Eye, User, Wrench, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CreateExternalOrderModal } from "./CreateExternalOrderModal";
import { ExternalOrderBillingModal } from "./ExternalOrderBillingModal";
import { WorkOrderDetailModal } from "../../work-orders/components/WorkOrderDetailModal";
import { getWorkOrders } from "@/lib/maintenance/api";
import type {
  WorkOrder,
  MaintenanceLocation,
  InventoryItem,
} from "@/lib/maintenance/types";
import {
  workOrderStatusConfig,
  maintenanceTypeLabels,
  formatDateTime,
} from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ExternalOrdersListViewProps {
  locations: MaintenanceLocation[];
  items: InventoryItem[];
}

export function ExternalOrdersListView({ locations, items }: ExternalOrdersListViewProps) {
  const { can } = useAuth();
  const canManage = can("maintenance.external_jobs.manage");

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [billingOrderId, setBillingOrderId] = useState<string | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getWorkOrders({
        serviceSubjectType: 2, // ExternalVehicle only
      });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            أوامر عمل العملاء الخارجيين (ورشة الرياض)
          </h2>
          <p className="text-xs text-slate-500">
            إدارة الإصلاحات المدفوعة، مبيعات قطع الغيار، أجور الفنيين، وتحصيل الدفعات للعملاء الخارجيين.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadOrders} loading={loading} className="text-xs h-9">
            <RefreshCw size={14} />
            تحديث
          </Button>
          {canManage && (
            <Button
              variant="primary"
              onClick={() => setCreateModalOpen(true)}
              className="text-xs h-9 shrink-0"
            >
              <PlusCircle size={15} />
              أمر صيانة خارجي جديد
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رقم الأمر</th>
              <th className="p-3">العميل</th>
              <th className="p-3">رقم اللوحة / المرجع</th>
              <th className="p-3">نوع الخدمة</th>
              <th className="p-3">الورشة</th>
              <th className="p-3 text-center">حالة الأمر</th>
              <th className="p-3 text-center">تاريخ الفتح</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  جارٍ تحميل أوامر الورشة الخارجية...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  لا توجد أوامر عمل لعملاء خارجيين حالياً.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const statusCfg = workOrderStatusConfig[order.status];
                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 font-mono font-black text-[#1167c9] dark:text-blue-400">
                      {order.workOrderNumber}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {order.externalVehicle?.customerName || "عميل خارجي"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {order.externalVehicle?.customerPhone || "-"}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {order.externalVehicle?.plateOrReference || "-"}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {maintenanceTypeLabels[order.maintenanceType] || order.maintenanceType}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {order.maintenanceLocationNameAr}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                      >
                        {statusCfg?.label}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500">
                      {formatDateTime(order.openedAtUtc)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="primary"
                          onClick={() => setBillingOrderId(order.id)}
                          className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1"
                        >
                          <CreditCard size={13} />
                          الفوترة والمالية
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setDetailOrderId(order.id)}
                          className="h-8 px-2.5 text-xs inline-flex items-center gap-1"
                        >
                          <Eye size={13} />
                          التفاصيل
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CreateExternalOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSaved={loadOrders}
        locations={locations}
      />

      <ExternalOrderBillingModal
        isOpen={Boolean(billingOrderId)}
        onClose={() => setBillingOrderId(null)}
        workOrderId={billingOrderId}
        items={items}
        locations={locations}
        onUpdated={loadOrders}
      />

      <WorkOrderDetailModal
        isOpen={Boolean(detailOrderId)}
        onClose={() => setDetailOrderId(null)}
        workOrderId={detailOrderId}
        items={items}
        locations={locations}
        onUpdated={loadOrders}
      />
    </div>
  );
}
