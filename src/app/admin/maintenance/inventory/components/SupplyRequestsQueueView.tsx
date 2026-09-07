"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  PackageCheck,
  RefreshCw,
  Car,
  User,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { getSupplyRequests, getStockBalances } from "@/lib/maintenance/api";
import { getVehicles } from "@/lib/fleet/api";
import { listRiders } from "@/lib/workforce/api";
import type {
  SupplyRequest,
  SupplyRequestLine,
  MaintenanceLocation,
  StockBalance,
} from "@/lib/maintenance/types";
import {
  SupplyRequestStatus,
  SupplyRequestSubjectType,
} from "@/lib/maintenance/types";
import {
  supplyRequestStatusConfig,
  supplyRequestSubjectLabels,
  formatCurrency,
  formatDateTime,
} from "@/lib/maintenance/constants";
import { SupplyRequestDetailModal } from "./SupplyRequestDetailModal";
import { useAuth } from "@/lib/auth/AuthProvider";

interface SupplyRequestsQueueViewProps {
  locations: MaintenanceLocation[];
}

export function SupplyRequestsQueueView({ locations }: SupplyRequestsQueueViewProps) {
  const { can } = useAuth();
  const canReadQueue = can("inventory.supply_requests.read");
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter state (Initial request defaults to pending per specs)
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [riderFilter, setRiderFilter] = useState<string>("");

  // Select options state
  const [vehicles, setVehicles] = useState<{ id: string; label: string }[]>([]);
  const [riders, setRiders] = useState<{ id: string; label: string }[]>([]);

  // Expandable rows for item previews
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Detail Modal - initialized from deep link if present
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(() => {
    return searchParams.get("requestId") || searchParams.get("id") || null;
  });

  // Load select options
  useEffect(() => {
    getVehicles({ pageSize: 150 })
      .then((res) => {
        if (res?.items) {
          setVehicles(
            res.items.map((v) => ({
              id: v.id,
              label: `${v.assetNumber || "مركبة"} - ${v.plateNumberAr || v.plateNumberEn || ""}`,
            })),
          );
        }
      })
      .catch(() => {});

    listRiders()
      .then((res) => {
        if (Array.isArray(res)) {
          setRiders(
            res.map((r) => ({
              id: r.id,
              label: r.fullNameAr || r.fullNameEn || "مندوب",
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const loadRequests = () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (!canReadQueue) {
      setLoading(false);
      return;
    }

    let active = true;
    getSupplyRequests({
      status: statusFilter,
      inventoryLocationId: locationFilter || undefined,
      vehicleId: vehicleFilter || undefined,
      riderProfileId: riderFilter || undefined,
    })
      .then((data) => {
        if (active) {
          setRequests(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.error(err);
        if (active) {
          setRequests([]);
          setLoading(false);
        }
      });

    // Fetch stock balances across warehouses to resolve item unit costs
    const balancePromises: Promise<StockBalance[]>[] = [
      getStockBalances().catch(() => [] as StockBalance[]),
    ];
    if (locations && locations.length > 0) {
      for (const loc of locations) {
        balancePromises.push(
          getStockBalances({ inventoryLocationId: loc.id }).catch(() => [] as StockBalance[]),
        );
      }
    }
    Promise.all(balancePromises)
      .then((results) => {
        if (active) {
          const allBalances: StockBalance[] = [];
          const seen = new Set<string>();
          for (const list of results) {
            if (Array.isArray(list)) {
              for (const b of list) {
                const key = `${b.inventoryLocationId}_${b.inventoryItemId}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  allBalances.push(b);
                }
              }
            }
          }
          setBalances(allBalances);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [canReadQueue, statusFilter, locationFilter, vehicleFilter, riderFilter, refreshKey, locations]);

  const resolveBalanceUnitCost = (b: StockBalance): number => {
    if (b.reportingAverageUnitCost && b.reportingAverageUnitCost > 0) {
      return b.reportingAverageUnitCost;
    }
    if (b.quantityOnHand > 0 && b.inventoryValue > 0) {
      return b.inventoryValue / b.quantityOnHand;
    }
    return 0;
  };

  const getItemUnitCost = (itemId: string, locationId?: string, sku?: string): number => {
    if (locationId) {
      const exact = balances.find(
        (b) =>
          b.inventoryLocationId === locationId &&
          (b.inventoryItemId === itemId || (sku && b.sku === sku)),
      );
      if (exact) {
        const cost = resolveBalanceUnitCost(exact);
        if (cost > 0) return cost;
      }
    }
    const anyBal = balances.find(
      (b) =>
        (b.inventoryItemId === itemId || (sku && b.sku === sku)) &&
        (b.reportingAverageUnitCost > 0 || (b.quantityOnHand > 0 && b.inventoryValue > 0)),
    );
    if (anyBal) {
      const cost = resolveBalanceUnitCost(anyBal);
      if (cost > 0) return cost;
    }
    return 0;
  };

  const getLineUnitCost = (line: SupplyRequestLine, locationId?: string): number => {
    if (line.issuedQuantity > 0 && line.issuedCost > 0) {
      return line.issuedCost / line.issuedQuantity;
    }
    if ((line as any).unitCost && Number((line as any).unitCost) > 0) {
      return Number((line as any).unitCost);
    }
    if ((line as any).cost && Number((line as any).cost) > 0) {
      return Number((line as any).cost);
    }
    if ((line as any).price && Number((line as any).price) > 0) {
      return Number((line as any).price);
    }
    if ((line as any).estimatedUnitCost && Number((line as any).estimatedUnitCost) > 0) {
      return Number((line as any).estimatedUnitCost);
    }
    const balCost = getItemUnitCost(line.inventoryItemId, locationId, line.sku);
    if (balCost > 0) {
      return balCost;
    }
    if (line.notes) {
      const match = line.notes.match(
        /(?:تكلفة الوحدة|unit\s*cost|سعر الوحدة|تكلفة|سعر)[:\s]+([\d.]+)/i,
      );
      if (match && !isNaN(Number(match[1]))) {
        return Number(match[1]);
      }
    }
    return 0;
  };

  const getLineTotalCost = (line: SupplyRequestLine, locationId?: string): number => {
    if (line.issuedCost && Number(line.issuedCost) > 0) {
      return Number(line.issuedCost);
    }
    const uCost = getLineUnitCost(line, locationId);
    const qty = line.requestedQuantity || 1;
    return uCost * qty;
  };

  const getRequestTotalCost = (req: SupplyRequest): number => {
    if (req.totalIssuedCost && Number(req.totalIssuedCost) > 0) {
      return Number(req.totalIssuedCost);
    }
    if (!req.lines || req.lines.length === 0) {
      return (req as any).estimatedCost || (req as any).totalCost || 0;
    }
    const linesTotal = req.lines.reduce((sum, line) => {
      return sum + getLineTotalCost(line, req.inventoryLocationId);
    }, 0);
    if (linesTotal > 0) {
      return linesTotal;
    }
    return (req as any).estimatedCost || (req as any).totalCost || 0;
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (!canReadQueue) {
    return (
      <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center space-y-3" dir="rtl">
        <PackageCheck size={36} className="mx-auto text-slate-400" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          طابور طلبات صرف المستودع مخصص لمسؤولي المستودع
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          يتطلب هذا القسم صلاحية قراءة طلبات المستودع (inventory.supply_requests.read). يمكن لمسؤول المركبات متابعة حالة طلب الصرف من داخل تفاصيل أمر الصيانة، كما يمكن لمسؤول المناديب متابعة طلباته من شاشة طلب مستلزمات المناديب.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PackageCheck size={18} className="text-[#1167c9]" />
            طابور طلبات صرف المستودع (Warehouse Supply Requests Queue)
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5">
            مراجعة طلبات قطع غيار الصيانة ومستلزمات المناديب والتسليم الفعلي قبل خصم أرصدة المخزون.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadRequests}
            loading={loading}
            className="h-8 text-xs px-3"
          >
            <RefreshCw size={13} />
            تحديث القائمة
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">حالة الطلب</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-xs font-bold focus:outline-hidden"
          >
            <option value="pending">بانتظار موافقة المستودع (Pending)</option>
            <option value="approved">معتمد ومصروف (Approved / Issued)</option>
            <option value="rejected">مرفوض (Rejected)</option>
            <option value="cancelled">ملغي (Cancelled)</option>
            <option value="all">جميع الحالات (All)</option>
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">مستودع الصرف</label>
          <SearchableSelect
            value={locationFilter}
            onChange={(val) => setLocationFilter(val)}
            options={[
              { value: "", label: "جميع المستودعات والمواقع" },
              ...locations.map((l) => ({
                value: l.id,
                label: `${l.nameAr} (${l.code})`,
              })),
            ]}
            placeholder="تصفية بالمستودع..."
          />
        </div>

        {/* Vehicle Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">مركبة الصيانة</label>
          <SearchableSelect
            value={vehicleFilter}
            onChange={(val) => setVehicleFilter(val)}
            options={[
              { value: "", label: "جميع المركبات" },
              ...vehicles.map((v) => ({
                value: v.id,
                label: v.label,
              })),
            ]}
            placeholder="تصفية بالمركبة..."
          />
        </div>

        {/* Rider Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">المندوب</label>
          <SearchableSelect
            value={riderFilter}
            onChange={(val) => setRiderFilter(val)}
            options={[
              { value: "", label: "جميع المناديب" },
              ...riders.map((r) => ({
                value: r.id,
                label: r.label,
              })),
            ]}
            placeholder="تصفية بالمندوب..."
          />
        </div>
      </div>

      {/* Queue Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رقم الطلب والوقت</th>
              <th className="p-3">الهدف والجهة</th>
              <th className="p-3">المستلم / المركبة</th>
              <th className="p-3">مستودع الصرف</th>
              <th className="p-3">مقدم الطلب</th>
              <th className="p-3 text-center">عدد الأصناف</th>
              <th className="p-3 text-center">الحالة</th>
              <th className="p-3 text-left font-mono">التكلفة الإجمالية</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  جارٍ تحميل طلبات صرف المستودع...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  لا توجد طلبات صرف تطابق معايير البحث المحددة.
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const statusCfg = supplyRequestStatusConfig[req.status];
                const isExpanded = expandedId === req.id;
                const isVehicle = req.subjectType === SupplyRequestSubjectType.VehicleMaintenance;

                return (
                  <React.Fragment key={req.id}>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      {/* Request Number & Time */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">
                          {req.requestNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatDateTime(req.requestedAtUtc)}
                        </div>
                      </td>

                      {/* Subject Badge */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isVehicle
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          }`}
                        >
                          {isVehicle ? <Car size={12} /> : <User size={12} />}
                          {supplyRequestSubjectLabels[req.subjectType] || "طلب صرف"}
                        </span>
                      </td>

                      {/* Target Info */}
                      <td className="p-3">
                        {isVehicle ? (
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {req.vehicleAssetNumber || "مركبة"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              لوحة: {req.vehiclePlateNumber || "-"}
                            </div>
                            {req.workOrderNumber && (
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                                أمر: {req.workOrderNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {req.riderNameAr || "مندوب"}
                            </div>
                            <div className="text-[10px] text-slate-400">مستلزمات عمل</div>
                          </div>
                        )}
                      </td>

                      {/* Warehouse Location */}
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-bold">
                        {req.inventoryLocationNameAr ||
                          locations.find((l) => l.id === req.inventoryLocationId)?.nameAr ||
                          "المستودع الرئيسي"}
                      </td>

                      {/* Requester */}
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {req.requestedByUserName || "المسؤول"}
                      </td>

                      {/* Line Count & Expand Toggle */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpand(req.id)}
                          className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] cursor-pointer"
                        >
                          <span>{req.lines?.length || 0} أصناف</span>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            statusCfg?.border || ""
                          } ${statusCfg?.bg || ""} ${statusCfg?.text || ""}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusCfg?.dot || "bg-slate-400"}`} />
                          {statusCfg?.label || req.status}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="p-3 text-left font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(getRequestTotalCost(req))}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <Button
                          variant={req.status === SupplyRequestStatus.PendingWarehouseApproval ? "primary" : "secondary"}
                          onClick={() => setSelectedRequestId(req.id)}
                          className="h-8 text-xs px-2.5"
                        >
                          <Eye size={13} />
                          {req.status === SupplyRequestStatus.PendingWarehouseApproval
                            ? "مراجعة واعتماد"
                            : "عرض التفاصيل"}
                        </Button>
                      </td>
                    </tr>

                    {/* Expandable Preview of Lines */}
                    {isExpanded && req.lines && req.lines.length > 0 && (
                      <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                        <td colSpan={9} className="p-3">
                          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
                            <span className="font-bold text-[11px] text-slate-500 block">
                              تفاصيل الأصناف المطلوبة في الطلب {req.requestNumber}:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {req.lines.map((line, lIdx) => {
                                const lineUnit = getLineUnitCost(line, req.inventoryLocationId);
                                const lineTotal = getLineTotalCost(line, req.inventoryLocationId);
                                return (
                                  <div
                                    key={line.id || lIdx}
                                    className="p-2.5 rounded-lg border border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-slate-800 dark:text-slate-200">
                                        {line.itemNameAr}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono">{line.sku}</div>
                                      {lineUnit > 0 && (
                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                          سعر الوحدة: {formatCurrency(lineUnit)}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-left font-mono">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {line.requestedQuantity} مطلوب
                                      </span>
                                      {lineTotal > 0 && (
                                        <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                          {formatCurrency(lineTotal)}
                                        </span>
                                      )}
                                      {line.issuedQuantity > 0 && (
                                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                                          {line.issuedQuantity} مصروف
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Warehouse Detail Drawer / Modal */}
      <SupplyRequestDetailModal
        isOpen={Boolean(selectedRequestId)}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
        onActionCompleted={loadRequests}
        locations={locations}
      />
    </div>
  );
}
