"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  getWorkOrder,
  transitionWorkOrder,
  recordMaterialUsage,
  reverseMaterialUsage,
  cancelSupplyRequest,
} from "@/lib/maintenance/api";
import { authFetch } from "@/lib/auth/api";
import type {
  WorkOrder,
  MaterialUsage,
  InventoryItem,
  MaintenanceLocation,
} from "@/lib/maintenance/types";
import {
  WorkOrderStatus,
  MaterialUsageType,
  ItemType,
  SupplyRequestStatus,
} from "@/lib/maintenance/types";
import {
  workOrderStatusConfig,
  getWorkOrderEffectiveStatus,
  maintenanceTypeLabels,
  materialUsageTypeLabels,
  unitOfMeasureLabels,
  itemTypeLabels,
  formatCurrency,
  formatDateTime,
  supplyRequestStatusConfig,
  getLinkedInventoryLocationId,
} from "@/lib/maintenance/constants";
import { CompleteOilChangeModal } from "./CompleteOilChangeModal";
import { MaterialHistoryModal } from "./MaterialHistoryModal";
import {
  Play,
  CheckCircle,
  Lock,
  XCircle,
  Plus,
  RotateCcw,
  History,
  Droplets,
  Wrench,
  Package,
  PackageCheck,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

interface WorkOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string | null;
  items: InventoryItem[];
  locations: MaintenanceLocation[];
  onUpdated: () => void;
}

export function WorkOrderDetailModal({
  isOpen,
  onClose,
  workOrderId,
  items,
  locations,
  onUpdated,
}: WorkOrderDetailModalProps) {
  const { can } = useAuth();
  const canManage = can("maintenance.work_orders.manage");

  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [materials, setMaterials] = useState<MaterialUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  // Material Issue Modal/Form
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [issueQuantity, setIssueQuantity] = useState<number>(1);
  const [issueUsageType, setIssueUsageType] = useState<MaterialUsageType>(
    MaterialUsageType.SparePart,
  );
  const [issueNotes, setIssueNotes] = useState("");
  const [materialLoading, setMaterialLoading] = useState(false);
  const [issueItemTypeFilter, setIssueItemTypeFilter] = useState<ItemType | "ALL">("ALL");

  const filteredIssueItems =
    issueItemTypeFilter === "ALL"
      ? items
      : items.filter((i) => i.itemType === issueItemTypeFilter);

  const handleItemSelectForIssue = (itemId: string) => {
    setSelectedItemId(itemId);
    const chosen = items.find((i) => i.id === itemId);
    if (chosen) {
      if (chosen.itemType === ItemType.Oil) {
        setIssueUsageType(MaterialUsageType.Oil);
      } else if (chosen.itemType === ItemType.Consumable) {
        setIssueUsageType(MaterialUsageType.Consumable);
      } else if (chosen.itemType === ItemType.SparePart) {
        if (
          chosen.nameAr.includes("فلتر زيت") ||
          chosen.nameEn.toLowerCase().includes("oil filter")
        ) {
          setIssueUsageType(MaterialUsageType.OilFilter);
        } else {
          setIssueUsageType(MaterialUsageType.SparePart);
        }
      }
    }
  };

  // Oil Change Modal
  const [oilModalOpen, setOilModalOpen] = useState(false);

  // History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const loadOrderDetails = () => {
    setLoading(true);
    setRefreshCount((prev) => prev + 1);
  };

  const handleModalClose = () => {
    setOrder(null);
    setMaterials([]);
    setIssueModalOpen(false);
    setOilModalOpen(false);
    setHistoryModalOpen(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !workOrderId) {
      return;
    }

    let active = true;
    Promise.all([
      getWorkOrder(workOrderId),
      authFetch<MaterialUsage[]>(
        `/api/maintenance-work-orders/${workOrderId}/materials`,
      ).catch(() => []),
    ])
      .then(([data, mats]) => {
        if (active) {
          setOrder(data);
          setMaterials(Array.isArray(mats) ? mats : []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.error(err);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, workOrderId, refreshCount]);

  // Handle Transitions
  const handleTransition = async (action: "start" | "complete" | "close" | "cancel") => {
    if (!order) return;
    const confirmMsg =
      action === "start"
        ? "بدء العمل على أمر الصيانة الآن؟"
        : action === "complete"
          ? "تأكيد اكتمال جميع أعمال الصيانة؟"
          : action === "close"
            ? "إقفال أمر الصيانة نهائياً؟ لن يمكن تعديله بعد ذلك."
            : "هل أنت متأكد من إلغاء أمر الصيانة؟";

    if (!confirm(confirmMsg)) return;

    setTransitionLoading(true);
    try {
      await transitionWorkOrder(order.id, action, {
        occurredAtUtc: new Date().toISOString(),
        rowVersion: order.rowVersion,
      });
      loadOrderDetails();
      onUpdated();
    } catch (err: unknown) {
      console.error(err);
      // Reload on error (e.g. concurrency conflict or state conflict)
      loadOrderDetails();
    } finally {
      setTransitionLoading(false);
    }
  };

  // Handle Material Issue
  const handleIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !selectedItemId) return;

    setMaterialLoading(true);
    try {
      await recordMaterialUsage(order.id, {
        inventoryItemId: selectedItemId,
        inventoryLocationId: getLinkedInventoryLocationId(order.maintenanceLocationId, locations),
        quantity: Number(issueQuantity),
        usageType: Number(issueUsageType),
        usedAtUtc: new Date().toISOString(),
        notes: issueNotes.trim() || null,
      });
      setIssueModalOpen(false);
      setSelectedItemId("");
      setIssueQuantity(1);
      setIssueNotes("");
      await loadOrderDetails();
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setMaterialLoading(false);
    }
  };

  // Handle Reverse Material
  const handleReverseMaterial = async (usage: MaterialUsage) => {
    const reason = prompt("يرجى إدخال سبب عكس حركة الصرف:");
    if (!reason || !reason.trim()) return;

    try {
      await reverseMaterialUsage(usage.id, {
        reversedAtUtc: new Date().toISOString(),
        reason: reason.trim(),
      });
      await loadOrderDetails();
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Supply Request Cancel
  const [cancelSupplyLoading, setCancelSupplyLoading] = useState(false);
  const [ownershipError, setOwnershipError] = useState(false);
  const handleCancelSupplyRequest = async () => {
    if (!order?.supplyRequest) return;
    const reason = prompt("يرجى إدخال سبب إلغاء طلب صرف المواد من المستودع:", "Wrong item selected");
    if (reason === null) return;

    setCancelSupplyLoading(true);
    try {
      await cancelSupplyRequest(order.supplyRequest.id, {
        occurredAtUtc: new Date().toISOString(),
        rowVersion: order.supplyRequest.rowVersion,
        notes: reason.trim() || "Wrong item selected",
      });
      loadOrderDetails();
      onUpdated();
    } catch (err: any) {
      console.error(err);
      const code = err?.details?.errorCode || err?.details?.code;
      if (code === "maintenance.supply_request_ownership") {
        setOwnershipError(true);
        alert("عفواً، لا يملك صلاحية إلغاء هذا الطلب سوى المستخدم الذي قام بإنشائه.");
      }
      loadOrderDetails();
    } finally {
      setCancelSupplyLoading(false);
    }
  };

  if (!order && loading) {
    return (
      <Modal isOpen={isOpen} onClose={handleModalClose} title="تفاصيل أمر الصيانة" maxWidth="max-w-4xl">
        <div className="p-12 text-center text-xs text-slate-400">
          جارٍ تحميل تفاصيل أمر الصيانة...
        </div>
      </Modal>
    );
  }

  if (!order) return null;

  const statusCfg = getWorkOrderEffectiveStatus(order.status, order.supplyRequest);
  const isOilChangeOrder = order.maintenanceType === 5;
  const isEditable = order.status === 1 || order.status === 2;

  const supplyReq = order.supplyRequest;
  const isSupplyPending = supplyReq?.status === SupplyRequestStatus.PendingWarehouseApproval;
  const isSupplyRejected = supplyReq?.status === SupplyRequestStatus.Rejected;
  const isSupplyCancelled = supplyReq?.status === SupplyRequestStatus.Cancelled;
  const hasSupplyBlock = isSupplyPending || isSupplyRejected || isSupplyCancelled;
  const canStart = order.status === WorkOrderStatus.Open && !hasSupplyBlock;
  const canCancelSupply = isSupplyPending && !ownershipError && (can("inventory.supply_requests.submit") || canManage);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={`أمر صيانة رقم ${order.workOrderNumber}`}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6 text-xs" dir="rtl">
        {/* Header Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#1167c9] text-white shadow-xs">
              <Wrench size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {order.workOrderNumber}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                >
                  {statusCfg?.label}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                  {maintenanceTypeLabels[order.maintenanceType] || order.maintenanceType}
                </span>
              </div>
              <div className="text-slate-500 text-[11px] mt-1 flex flex-wrap items-center gap-3">
                <span>
                  الهدف:{" "}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {order.serviceSubjectType === 1
                      ? `مركبة شركة (${order.vehicleAssetNumber || "غير محدد"})`
                      : `عميل خارجي (${order.externalVehicle?.plateOrReference || "-"})`}
                  </strong>
                </span>
                <span>•</span>
                <span>الموقع: <strong>{order.maintenanceLocationNameAr}</strong></span>
                <span>•</span>
                <span>تاريخ الفتح: {formatDateTime(order.openedAtUtc)}</span>
              </div>
            </div>
          </div>

          {/* Workflow Action Buttons */}
          {canManage && (
            <div className="flex items-center gap-2">
              {canStart && (
                <Button
                  variant="primary"
                  onClick={() => handleTransition("start")}
                  loading={transitionLoading}
                  className="text-xs h-9"
                >
                  <Play size={14} />
                  بدء العمل (Start)
                </Button>
              )}

              {order.status === WorkOrderStatus.InProgress && (
                <Button
                  variant="primary"
                  onClick={() => handleTransition("complete")}
                  loading={transitionLoading}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle size={14} />
                  اكتمال الصيانة (Complete)
                </Button>
              )}

              {order.status === WorkOrderStatus.Completed && (
                <Button
                  variant="primary"
                  onClick={() => handleTransition("close")}
                  loading={transitionLoading}
                  className="text-xs h-9 bg-slate-800 hover:bg-slate-900"
                >
                  <Lock size={14} />
                  إقفال نهائي (Close)
                </Button>
              )}

              {(order.status === WorkOrderStatus.Open ||
                order.status === WorkOrderStatus.InProgress) && (
                <Button
                  variant="danger"
                  onClick={() => handleTransition("cancel")}
                  loading={transitionLoading}
                  className="text-xs h-9"
                >
                  <XCircle size={14} />
                  إلغاء
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Status Banners for Supply Request */}
        {supplyReq && isSupplyPending && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block text-sm">
                  Waiting for warehouse approval. Stock has not been issued.
                </span>
                <span className="text-[11px] text-amber-800 dark:text-amber-300">
                  بانتظار موافقة المستودع. لم يتم صرف المواد بعد. طلب الصرف رقم <strong>{supplyReq.requestNumber}</strong> قيد مراجعة أمين المستودع.
                </span>
              </div>
            </div>
            {canCancelSupply && (
              <Button
                variant="danger"
                onClick={handleCancelSupplyRequest}
                loading={cancelSupplyLoading}
                className="text-xs h-8 shrink-0"
              >
                <XCircle size={13} />
                إلغاء طلب الصرف
              </Button>
            )}
          </div>
        )}

        {supplyReq && isSupplyRejected && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200">
            <div className="flex items-center gap-3">
              <XCircle size={20} className="text-red-600 shrink-0" />
              <div className="flex-1">
                <span className="font-bold block text-sm">تم رفض طلب صرف المواد من قِبل المستودع</span>
                <span className="text-[11px] text-red-800 dark:text-red-300 block mt-0.5">
                  سبب الرفض: <strong>{supplyReq.rejectionReason || supplyReq.decisionNotes || "غير محدد"}</strong>
                </span>
                <span className="text-[10px] text-red-700/80 dark:text-red-400 mt-1 block">
                  لا يمكن بدء أمر الصيانة. يلزم إلغاء أمر الصيانة الحالي وإعادة إنشائه في حال الرغبة بطلب قطع بديلة.
                </span>
              </div>
            </div>
            {canManage && (order.status === WorkOrderStatus.Open || order.status === WorkOrderStatus.InProgress) && (
              <Button
                variant="danger"
                onClick={() => handleTransition("cancel")}
                loading={transitionLoading}
                className="text-xs h-8 shrink-0"
              >
                <XCircle size={13} />
                إلغاء أمر الصيانة
              </Button>
            )}
          </div>
        )}

        {supplyReq && isSupplyCancelled && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-500/10 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <AlertCircle size={20} className="text-slate-500 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block text-sm">تم إلغاء طلب صرف المواد من المستودع</span>
              <span className="text-[11px] text-slate-500 block">
                ملاحظات الإلغاء: {supplyReq.decisionNotes || supplyReq.notes || "تم إلغاء الطلب من قبل المنشئ."}
              </span>
            </div>
          </div>
        )}

        {/* Warehouse Supply Request Card */}
        {supplyReq && (
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <PackageCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      طلب صرف المواد من المستودع (Warehouse supply request)
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {supplyReq.requestNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        supplyRequestStatusConfig[supplyReq.status]?.border || ""
                      } ${supplyRequestStatusConfig[supplyReq.status]?.bg || ""} ${
                        supplyRequestStatusConfig[supplyReq.status]?.text || ""
                      }`}
                    >
                      {supplyRequestStatusConfig[supplyReq.status]?.label || supplyReq.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    دورة صرف المستودع برقم طلب مستقل وتأكيد التسليم الفعلي
                  </span>
                </div>
              </div>

              {canCancelSupply && (
                <Button
                  variant="ghost"
                  onClick={handleCancelSupplyRequest}
                  loading={cancelSupplyLoading}
                  className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <XCircle size={13} />
                  إلغاء طلب الصرف
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600 dark:text-slate-300 text-[11px]">
              <div className="p-2.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-slate-400 block text-[10px]">مستودع الصرف المختار:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {supplyReq.inventoryLocationNameAr || order.maintenanceLocationNameAr}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-slate-400 block text-[10px]">مركبة أمر العمل:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {supplyReq.vehicleAssetNumber || order.vehicleAssetNumber || "مركبة"} • {supplyReq.vehiclePlateNumber || "-"}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-slate-400 block text-[10px]">مقدم الطلب / وقت الطلب:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {supplyReq.requestedByUserName || "مسؤول المركبات"} • {formatDateTime(supplyReq.requestedAtUtc)}
                </strong>
              </div>
            </div>

            {/* Decision info if approved or rejected */}
            {(supplyReq.decisionAtUtc || supplyReq.decisionByUserName || supplyReq.decisionNotes || supplyReq.rejectionReason) && (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/40 dark:bg-slate-900/20 text-[11px] space-y-1">
                <div className="flex flex-wrap items-center gap-4 text-slate-500">
                  {supplyReq.decisionAtUtc && (
                    <span>تاريخ قرار المستودع: <strong>{formatDateTime(supplyReq.decisionAtUtc)}</strong></span>
                  )}
                  {supplyReq.decisionByUserName && (
                    <span>المسؤول: <strong>{supplyReq.decisionByUserName}</strong></span>
                  )}
                  <span>إجمالي التكلفة المصروفة: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{formatCurrency(supplyReq.totalIssuedCost || 0)}</strong></span>
                </div>
                {supplyReq.decisionNotes && (
                  <div className="text-slate-700 dark:text-slate-300">
                    ملاحظات المستودع: {supplyReq.decisionNotes}
                  </div>
                )}
                {supplyReq.rejectionReason && (
                  <div className="text-red-600 dark:text-red-400 font-bold">
                    سبب الرفض: {supplyReq.rejectionReason}
                  </div>
                )}
              </div>
            )}

            {/* Lines Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5 font-mono">الرمز SKU</th>
                    <th className="p-2.5 text-center">الكمية المطلوبة</th>
                    <th className="p-2.5 text-center">الكمية المصروفة</th>
                    <th className="p-2.5 text-left font-mono">التكلفة المصروفة</th>
                    <th className="p-2.5">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {supplyReq.lines?.map((line, lIdx) => (
                    <tr key={line.id || lIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                        {line.itemNameAr}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                        {line.sku}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {line.requestedQuantity}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        <span className={line.issuedQuantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                          {line.issuedQuantity}
                        </span>
                      </td>
                      <td className="p-2.5 text-left font-mono font-bold">
                        {formatCurrency(line.issuedCost || 0)}
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">
                        {line.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Oil Change Legacy CTA only for External Vehicles (Company oil changes handled by warehouse approval) */}
        {isOilChangeOrder && isEditable && order.serviceSubjectType === 2 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800">
            <div className="flex items-center gap-3 text-amber-900 dark:text-amber-300">
              <Droplets size={24} className="text-amber-600" />
              <div>
                <span className="font-bold text-sm block">أمر تغيير زيت محرك (عميل خارجي)</span>
                <span className="text-[11px] text-amber-800 dark:text-amber-400">
                  تحديد صنف الزيت، استهلاك البرميل المفتوح تلقائياً، والتحقق من كمية السيارة (3.5L / 4L مع الفلتر).
                </span>
              </div>
            </div>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => setOilModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0"
              >
                <Droplets size={14} />
                تنفيذ وتأكيد عملية تغيير الزيت
              </Button>
            )}
          </div>
        )}

        {/* Details & Costs Summary Cards */}
        {order.serviceSubjectType === 1 ? (
          /* Company / Internal Vehicle: actualTotalCost is labeled 'التكلفة الإجمالية' and contains issued material cost only; actualLaborCost is omitted */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {order.estimatedCost > 0 && (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <span className="text-[11px] text-slate-400 block">التكلفة التقديرية (محسوبة آلياً)</span>
                <span className="text-sm font-black font-mono text-slate-700 dark:text-slate-300">
                  {formatCurrency(order.estimatedCost)}
                </span>
              </div>
            )}
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-slate-400 block">تكلفة المواد والقطع الفعلية</span>
              <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(order.actualMaterialCost)}
              </span>
            </div>
            {order.actualOtherCost > 0 && (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <span className="text-[11px] text-slate-400 block">تكاليف أخرى</span>
                <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(order.actualOtherCost)}
                </span>
              </div>
            )}
            <div className="p-3 rounded-xl border border-blue-200/80 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold block">
                التكلفة الإجمالية
              </span>
              <span className="text-sm font-black font-mono text-blue-700 dark:text-blue-300">
                {formatCurrency(order.actualTotalCost)}
              </span>
            </div>
          </div>
        ) : (
          /* Outside / External Customer Vehicle: full outside-work totals including actualLaborCost */
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-slate-400 block">تكلفة المواد والقطع</span>
              <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(order.actualMaterialCost)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-slate-400 block">تكلفة أجور اليد والعمالة</span>
              <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(order.actualLaborCost)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[11px] text-slate-400 block">تكاليف أخرى</span>
              <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                {formatCurrency(order.actualOtherCost)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-blue-200/80 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold block">
                التكلفة الإجمالية الفعلية
              </span>
              <span className="text-sm font-black font-mono text-blue-700 dark:text-blue-300">
                {formatCurrency(order.actualTotalCost)}
              </span>
            </div>
          </div>
        )}

        {/* Diagnosis & Notes */}
        {(order.diagnosis || order.notes) && (
          <div className="p-4 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
            {order.diagnosis && (
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">التشخيص والعطل: </span>
                <span className="text-slate-600 dark:text-slate-400">{order.diagnosis}</span>
              </div>
            )}
            {order.notes && (
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">ملاحظات: </span>
                <span className="text-slate-600 dark:text-slate-400">{order.notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Materials Usage & Cost Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Package size={16} className="text-[#1167c9]" />
                المواد وقطع الغيار المصروفة على أمر العمل
              </h3>
              <span className="text-[11px] text-slate-500">
                (توزيع تكلفة المواد والقطع مسجل ومدقق آلياً)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {order.vehicleId && (
                <Button
                  variant="secondary"
                  onClick={() => setHistoryModalOpen(true)}
                  className="h-8 text-xs px-2.5"
                >
                  <History size={13} />
                  سجل استهلاك المركبة التاريخي
                </Button>
              )}
              {isEditable && canManage && !order.supplyRequest && (
                <Button
                  variant="primary"
                  onClick={() => setIssueModalOpen(true)}
                  className="h-8 text-xs px-2.5"
                >
                  <Plus size={13} />
                  صرف قطعة / مادة
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-right">
              <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5">نوع الاستخدام</th>
                  <th className="p-2.5 text-center">الكمية</th>
                  <th className="p-2.5 text-left font-mono">التكلفة الإجمالية</th>
                  <th className="p-2.5">تفاصيل التكلفة والتوريد</th>
                  <th className="p-2.5 text-center">الحالة / الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      لم يتم صرف أي قطع غيار أو مواد على هذا الأمر حتى الآن.
                    </td>
                  </tr>
                ) : (
                  materials.map((mat) => {
                    const isReversed = mat.direction === 2;
                    return (
                      <tr
                        key={mat.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                          isReversed
                            ? "bg-red-50/30 dark:bg-red-950/20 text-red-800 dark:text-red-300"
                            : ""
                        }`}
                      >
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                          <div>{mat.itemNameAr}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{mat.sku}</div>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          {materialUsageTypeLabels[mat.usageType] || mat.usageType}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold">
                          {mat.quantity} {unitOfMeasureLabels[mat.unitOfMeasure] || ""}
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold">
                          {formatCurrency(mat.totalCost)}
                        </td>
                        <td className="p-2.5 text-[10px] text-slate-500 font-mono">
                          {mat.costAllocations && mat.costAllocations.length > 0 ? (
                            <div className="space-y-0.5">
                              {mat.costAllocations.map((alloc, aIdx) => (
                                <div key={aIdx}>
                                  {alloc.quantity} × {alloc.unitCost.toFixed(2)} = {alloc.cost.toFixed(2)} ر.س
                                </div>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {isReversed ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                              معكوس / ملغي
                            </span>
                          ) : isEditable && canManage ? (
                            <Button
                              variant="secondary"
                              onClick={() => handleReverseMaterial(mat)}
                              className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700"
                            >
                              <RotateCcw size={12} />
                              عكس الصرف
                            </Button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Issue Material Modal */}
        <Modal
          isOpen={issueModalOpen}
          onClose={() => setIssueModalOpen(false)}
          title="صرف قطعة غيار / مادة من المستودع"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleIssueMaterial} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  الصنف المراد صرفه <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {[
                    { id: "ALL" as const, label: "الكل" },
                    { id: ItemType.SparePart, label: "قطع غيار (1)" },
                    { id: ItemType.Oil, label: "زيوت (3)" },
                    { id: ItemType.Consumable, label: "مستهلكات (4)" },
                  ].map((chip) => (
                    <button
                      key={String(chip.id)}
                      type="button"
                      onClick={() => setIssueItemTypeFilter(chip.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                        issueItemTypeFilter === chip.id
                          ? "bg-[#1167c9] text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
              <SearchableSelect
                value={selectedItemId}
                onChange={handleItemSelectForIssue}
                options={filteredIssueItems.map((i) => ({
                  value: i.id,
                  label: `${i.nameAr} (${i.sku})`,
                  sublabel: `${itemTypeLabels[i.itemType] || ""} • SKU: ${i.sku}`,
                  keywords: `${itemTypeLabels[i.itemType] || ""} ${i.sku} ${i.nameEn || ""}`,
                }))}
                placeholder="اختر الصنف..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الكمية <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0.1"
                  step="any"
                  value={issueQuantity}
                  onChange={(e) => setIssueQuantity(parseFloat(e.target.value) || 1)}
                  required
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع الاستخدام
                </label>
                <select
                  value={issueUsageType}
                  onChange={(e) =>
                    setIssueUsageType(Number(e.target.value) as MaterialUsageType)
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
                >
                  <option value={MaterialUsageType.SparePart}>قطعة غيار</option>
                  <option value={MaterialUsageType.Consumable}>مستهلكات ورشة</option>
                  <option value={MaterialUsageType.Oil}>زيت</option>
                  <option value={MaterialUsageType.OilFilter}>فلتر زيت</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات الصرف
              </label>
              <Input
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="سبب الصرف أو رقم الإذن..."
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
              يقوم الخادم آلياً باحتساب تكلفة الصرف من واقع الرصيد المتاح في مستودع {order.maintenanceLocationNameAr}.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIssueModalOpen(false)}
                disabled={materialLoading}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button variant="primary" type="submit" loading={materialLoading} className="text-xs">
                تأكيد الصرف
              </Button>
            </div>
          </form>
        </Modal>

        {/* Oil Change Modal */}
        <CompleteOilChangeModal
          isOpen={oilModalOpen}
          onClose={() => setOilModalOpen(false)}
          onCompleted={() => {
            loadOrderDetails();
            onUpdated();
          }}
          workOrder={order}
          items={items}
          locations={locations}
        />

        {/* Material History Modal */}
        <MaterialHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          vehicleId={order.vehicleId}
          vehicleAssetNumber={order.vehicleAssetNumber}
          riderProfileId={order.attributedRiderProfileId}
        />
      </div>
    </Modal>
  );
}
