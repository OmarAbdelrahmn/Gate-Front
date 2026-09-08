"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PlusCircle, Eye, Wrench, RefreshCw, Car, User, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { WorkOrderDetailModal } from "./WorkOrderDetailModal";
import { CreateCompanyWorkOrderModal } from "./CreateCompanyWorkOrderModal";
import { getWorkOrders, getSupplyRequests } from "@/lib/maintenance/api";
import { getVehicles } from "@/lib/fleet/api";
import type { VehicleSummaryResponse } from "@/lib/fleet/types";
import type {
  WorkOrder,
  MaintenanceLocation,
  InventoryItem,
  SupplyRequest,
} from "@/lib/maintenance/types";
import {
  SupplyRequestStatus,
  WorkOrderStatus,
} from "@/lib/maintenance/types";
import {
  workOrderStatusConfig,
  getWorkOrderEffectiveStatus,
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
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Map<string, VehicleSummaryResponse>>(new Map());
  const [vehiclesByAssetMap, setVehiclesByAssetMap] = useState<Map<string, VehicleSummaryResponse>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Deep-link effect
  useEffect(() => {
    const deepId = searchParams.get("workOrderId") || searchParams.get("id");
    if (deepId) {
      setSelectedOrderId(deepId);
    }
  }, [searchParams]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const isCustomStatus =
        statusFilter === "rejected" || statusFilter === "pending_supply";
      const canReadSupply = can("inventory.supply_requests.read");
      const [data, supplyRequests, vehiclesRes] = await Promise.all([
        getWorkOrders({
          maintenanceLocationId: locationFilter || undefined,
          status:
            statusFilter === "all" || isCustomStatus ? undefined : statusFilter,
          serviceSubjectType:
            subjectFilter === "all" ? undefined : Number(subjectFilter),
        }),
        canReadSupply ? getSupplyRequests().catch(() => []) : Promise.resolve([]),
        getVehicles({ pageSize: 500 }).catch(() => null),
      ]);

      if (vehiclesRes?.items) {
        const vMap = new Map<string, VehicleSummaryResponse>();
        const vAssetMap = new Map<string, VehicleSummaryResponse>();
        for (const v of vehiclesRes.items) {
          if (v.id) vMap.set(v.id, v);
          if (v.assetNumber) vAssetMap.set(v.assetNumber, v);
        }
        setVehiclesMap(vMap);
        setVehiclesByAssetMap(vAssetMap);
      }

      const supplyMap = new Map<string, SupplyRequest>();
      if (Array.isArray(supplyRequests)) {
        for (const sr of supplyRequests) {
          if (sr.workOrderId) {
            supplyMap.set(sr.workOrderId, sr);
          }
        }
      }

      const merged = (Array.isArray(data) ? data : []).map((ord) => ({
        ...ord,
        supplyRequest:
          ord.supplyRequest || (ord.id ? supplyMap.get(ord.id) : null) || null,
      }));

      let filtered = merged;
      if (statusFilter === "1") {
        // Truly open orders: open in work order status, and not blocked by rejected or pending supply request
        filtered = merged.filter(
          (o) =>
            o.status === WorkOrderStatus.Open &&
            o.supplyRequest?.status !== SupplyRequestStatus.Rejected &&
            o.supplyRequest?.status !== SupplyRequestStatus.PendingWarehouseApproval,
        );
      } else if (statusFilter === "rejected") {
        filtered = merged.filter(
          (o) => o.supplyRequest?.status === SupplyRequestStatus.Rejected,
        );
      } else if (statusFilter === "pending_supply") {
        filtered = merged.filter(
          (o) =>
            o.supplyRequest?.status ===
            SupplyRequestStatus.PendingWarehouseApproval,
        );
      }

      setWorkOrders(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [locationFilter, statusFilter, subjectFilter]);

  const getOrderVehicleInfo = (order: WorkOrder) => {
    const veh =
      (order.vehicleId ? vehiclesMap.get(order.vehicleId) : null) ||
      (order.vehicleAssetNumber ? vehiclesByAssetMap.get(order.vehicleAssetNumber) : null);

    const serialDisplay =
      (order as any).vehicleSerialNumber ||
      (order as any).serialNumber ||
      veh?.serialNumber ||
      veh?.chassisNumber ||
      order.vehicleAssetNumber ||
      "—";

    let plateDisplay: string | null = null;
    if (veh) {
      if (veh.plateNumberAr) {
        plateDisplay = veh.plateNumberAr;
      } else if (veh.plateLettersAr && veh.plateDigits) {
        plateDisplay = `${veh.plateLettersAr} ${veh.plateDigits}`;
      } else if (veh.plateNumberEn) {
        plateDisplay = veh.plateNumberEn;
      }
    }
    if (!plateDisplay) {
      plateDisplay =
        (order as any).vehiclePlateNumberAr ||
        (order as any).vehiclePlateNumber ||
        (order as any).plateNumberAr ||
        order.supplyRequest?.vehiclePlateNumber ||
        null;
    }

    const vehModel = veh ? [veh.manufacturer, veh.model].filter(Boolean).join(" ") : null;

    return { serialDisplay, plateDisplay, vehModel };
  };

  const displayedOrders = workOrders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const { serialDisplay, plateDisplay, vehModel } = getOrderVehicleInfo(order);
    const customer = order.externalVehicle?.customerName?.toLowerCase() || "";
    const extPlate = order.externalVehicle?.plateOrReference?.toLowerCase() || "";
    const loc = order.maintenanceLocationNameAr?.toLowerCase() || "";
    return (
      (serialDisplay && serialDisplay.toLowerCase().includes(q)) ||
      (plateDisplay && plateDisplay.toLowerCase().includes(q)) ||
      (vehModel && vehModel.toLowerCase().includes(q)) ||
      customer.includes(q) ||
      extPlate.includes(q) ||
      loc.includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="h-6 w-6 text-[#1167c9]" />
            أوامر الصيانة والعمل
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة وإدارة أوامر صيانة مركبات الأسطول والتكاليف واستحقاقات الورش
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs shrink-0 h-9"
          >
            <PlusCircle size={15} />
            أمر صيانة شركة جديد
          </Button>
        )}
      </div>

      {/* Prominent Search at the Head of the Page */}
      <div className="relative">
        <Search
          size={18}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالرقم التسلسلي للمركبة، رقم اللوحة العربي، موقع الورشة، أو اسم العميل..."
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 pr-11 pl-10 text-sm font-medium shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1.5 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            title="مسح البحث"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs">
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
            <option value="1">مفتوح (جاهز)</option>
            <option value="rejected">مرفوض (المستودع)</option>
            <option value="pending_supply">بانتظار موافقة المستودع</option>
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

        <div className="text-xs text-slate-500 font-medium">
          إجمالي النتائج:{" "}
          <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
            {displayedOrders.length}
          </span>
          {workOrders.length !== displayedOrders.length && (
            <span className="text-slate-400 mr-1">
              (من أصل {workOrders.length})
            </span>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">الرقم التسلسلي</th>
              <th className="p-3">رقم اللوحة</th>
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
            ) : displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  لا توجد أوامر صيانة مطابقة للفلتر المحدد.
                </td>
              </tr>
            ) : (
              displayedOrders.map((order) => {
                const statusCfg = getWorkOrderEffectiveStatus(order.status, order.supplyRequest);
                const isCompany = order.serviceSubjectType === 1;
                const { serialDisplay, plateDisplay, vehModel } = getOrderVehicleInfo(order);

                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3">
                      {isCompany ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 font-mono font-black text-[#1167c9] dark:text-blue-400">
                            <Car size={14} className="text-blue-600 shrink-0" />
                            <span>{serialDisplay}</span>
                          </div>
                          {vehModel && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {vehModel}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <User size={14} className="text-amber-600 shrink-0" />
                          <span>عميل: {order.externalVehicle?.customerName || "عميل خارجي"}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {isCompany ? (
                        plateDisplay ? (
                          <div className="font-bold border border-slate-300 dark:border-slate-700 rounded-md px-2 py-0.5 w-fit bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-slate-200 font-sans">
                            {plateDisplay}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">بدون لوحة</span>
                        )
                      ) : (
                        order.externalVehicle?.plateOrReference ? (
                          <div className="font-bold border border-slate-300 dark:border-slate-700 rounded-md px-2 py-0.5 w-fit bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-slate-200 font-sans">
                            {order.externalVehicle.plateOrReference}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )
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
                        title={
                          order.supplyRequest?.status === SupplyRequestStatus.Rejected
                            ? `تم رفض طلب المواد: ${order.supplyRequest.rejectionReason || "من قبل المستودع"}`
                            : statusCfg?.label
                        }
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
        items={items}
      />

      {/* Detail Modal */}
      <WorkOrderDetailModal
        isOpen={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        workOrderId={selectedOrderId}
        items={items}
        locations={locations}
        onUpdated={loadOrders}
        vehiclesMap={vehiclesMap}
        vehiclesByAssetMap={vehiclesByAssetMap}
      />
    </div>
  );
}
