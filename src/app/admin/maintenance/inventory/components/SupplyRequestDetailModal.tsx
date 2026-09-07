"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getSupplyRequest,
  approveAndIssueSupplyRequest,
  rejectSupplyRequest,
  getOilBarrels,
  getStockBalances,
} from "@/lib/maintenance/api";
import type {
  SupplyRequest,
  SupplyRequestLine,
  MaintenanceLocation,
  OilBarrel,
  StockBalance,
} from "@/lib/maintenance/types";
import {
  SupplyRequestStatus,
  SupplyRequestSubjectType,
  OilBarrelStatus,
} from "@/lib/maintenance/types";
import {
  supplyRequestStatusConfig,
  supplyRequestSubjectLabels,
  formatCurrency,
  formatDateTime,
} from "@/lib/maintenance/constants";
import {
  PackageCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Car,
  User,
  Building2,
  AlertCircle,
  Droplets,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

interface SupplyRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  onActionCompleted: () => void;
  locations?: MaintenanceLocation[];
}

export function SupplyRequestDetailModal({
  isOpen,
  onClose,
  requestId,
  onActionCompleted,
  locations = [],
}: SupplyRequestDetailModalProps) {
  const { can } = useAuth();
  const canApprove = can("inventory.supply_requests.approve") || can("inventory.stock.move");

  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<SupplyRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [balancesMap, setBalancesMap] = useState<Record<string, StockBalance>>({});

  // Approval State
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approveNotes, setApproveNotes] = useState("Handed to vehicle administrator");
  const [nextOilBarrelId, setNextOilBarrelId] = useState<string | null>(null);
  const [sealedBarrels, setSealedBarrels] = useState<OilBarrel[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection State
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const handleModalClose = () => {
    setShowApproveConfirm(false);
    setShowRejectForm(false);
    setApproveNotes("Handed to vehicle administrator");
    setNextOilBarrelId(null);
    setRejectNotes("");
    setRequest(null);
    setErrorMsg(null);
    setBalancesMap({});
    onClose();
  };

  const loadDetails = () => {
    setLoading(true);
    setRefreshCount((prev) => prev + 1);
  };

  useEffect(() => {
    if (!isOpen || !requestId) {
      return;
    }

    let active = true;
    getSupplyRequest(requestId)
      .then((data) => {
        if (active) {
          setRequest(data);
          setLoading(false);

          // Fetch warehouse stock balances to lookup average/standard unit cost for items
          if (data?.inventoryLocationId) {
            Promise.all([
              getStockBalances({ inventoryLocationId: data.inventoryLocationId }).catch(() => [] as StockBalance[]),
              getStockBalances().catch(() => [] as StockBalance[]),
            ])
              .then(([bLoc, bAll]) => {
                if (active) {
                  const bMap: Record<string, StockBalance> = {};
                  if (Array.isArray(bAll)) {
                    for (const b of bAll) {
                      bMap[b.inventoryItemId] = b;
                      if (b.sku) bMap[b.sku] = b;
                    }
                  }
                  if (Array.isArray(bLoc)) {
                    for (const b of bLoc) {
                      bMap[b.inventoryItemId] = b;
                      if (b.sku) bMap[b.sku] = b;
                    }
                  }
                  setBalancesMap(bMap);
                }
              })
              .catch(() => {});
          }

          // Check if request involves oil items to load candidate sealed barrels
          const isOil = data?.lines?.some(
            (l) =>
              l.itemNameAr.includes("زيت") ||
              (l.itemNameEn && l.itemNameEn.toLowerCase().includes("oil")) ||
              l.sku.toLowerCase().includes("oil"),
          );

          if (isOil && data.inventoryLocationId) {
            getOilBarrels({
              inventoryLocationId: data.inventoryLocationId,
              status: "Sealed",
            })
              .then((bData) => {
                if (active && Array.isArray(bData)) {
                  setSealedBarrels(bData.filter((b) => b.status === OilBarrelStatus.Sealed));
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch((err: unknown) => {
        console.error(err);
        if (active) {
          setErrorMsg("تعذر تحميل تفاصيل طلب الصرف أو تم حذفه.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, requestId, refreshCount]);

  // Helpers to resolve unit cost and calculate total line cost and total request cost
  const getLineUnitCost = (line: SupplyRequestLine): number => {
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
    const bal = balancesMap[line.inventoryItemId] || (line.sku ? balancesMap[line.sku] : undefined);
    if (bal) {
      if (bal.reportingAverageUnitCost > 0) {
        return bal.reportingAverageUnitCost;
      }
      if (bal.quantityOnHand > 0 && bal.inventoryValue > 0) {
        return bal.inventoryValue / bal.quantityOnHand;
      }
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

  const getLineTotalCost = (line: SupplyRequestLine): number => {
    if (line.issuedCost && Number(line.issuedCost) > 0) {
      return Number(line.issuedCost);
    }
    const uCost = getLineUnitCost(line);
    const qty = line.requestedQuantity || 1;
    return uCost * qty;
  };

  const totalCalculatedCost = useMemo(() => {
    if (!request?.lines || request.lines.length === 0) {
      return request?.totalIssuedCost || 0;
    }
    const sumOfLines = request.lines.reduce((sum, line) => {
      return sum + getLineTotalCost(line);
    }, 0);

    if (request.totalIssuedCost > 0) {
      return request.totalIssuedCost;
    }
    return sumOfLines > 0 ? sumOfLines : (request.totalIssuedCost || 0);
  }, [request, balancesMap]);

  const handleApprove = async () => {
    if (!request) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await approveAndIssueSupplyRequest(request.id, {
        occurredAtUtc: new Date().toISOString(),
        rowVersion: request.rowVersion,
        notes: approveNotes.trim() || null,
        nextOilBarrelId: nextOilBarrelId || null,
      });

      setShowApproveConfirm(false);
      onActionCompleted();
      handleModalClose();
    } catch (err: any) {
      console.error(err);
      const code = err?.details?.errorCode || err?.details?.code;
      if (code === "maintenance.insufficient_stock") {
        setErrorMsg(
          "الرصيد في المستودع غير كافٍ لصرف كامل الطلب. لا يمكن صرف الطلب جزئياً ويظل الطلب معلقاً.",
        );
        setShowApproveConfirm(false);
      } else if (code === "maintenance.concurrency_conflict") {
        setErrorMsg(
          "حدث تعارض في التحديث بالتزامن (تم تعديل الطلب مسبقاً). تم تحديث البيانات، يرجى المراجعة والتأكيد مجدداً.",
        );
        setShowApproveConfirm(false);
        loadDetails();
      } else if (code === "maintenance.supply_request_not_pending") {
        setErrorMsg("حالة طلب الصرف لم تعد معلقة؛ تم اتخاذ إجراء عليها مسبقاً من قِبل مستخدم آخر.");
        setShowApproveConfirm(false);
        onActionCompleted();
        loadDetails();
      } else {
        setErrorMsg(err?.message || "تعذر اعتماد وصرف الطلب.");
        loadDetails();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !rejectNotes.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);
    try {
      await rejectSupplyRequest(request.id, {
        occurredAtUtc: new Date().toISOString(),
        rowVersion: request.rowVersion,
        notes: rejectNotes.trim(),
      });

      setShowRejectForm(false);
      onActionCompleted();
      handleModalClose();
    } catch (err: any) {
      console.error(err);
      const code = err?.details?.errorCode || err?.details?.code;
      if (code === "maintenance.concurrency_conflict") {
        setErrorMsg("تم تعديل السجل بواسطة مستخدم آخر. يرجى إعادة المحاولة بعد التحديث.");
        loadDetails();
      } else if (code === "maintenance.supply_request_not_pending") {
        setErrorMsg("تم اتخاذ إجراء على هذا الطلب مسبقاً.");
        onActionCompleted();
        loadDetails();
      } else {
        setErrorMsg(err?.message || "تعذر رفض الطلب.");
        loadDetails();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const isPending = request?.status === SupplyRequestStatus.PendingWarehouseApproval;
  const statusCfg = request ? supplyRequestStatusConfig[request.status] : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={request ? `طلب صرف مستودع: ${request.requestNumber}` : "تفاصيل طلب الصرف"}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-xs" dir="rtl">
        {loading && (
          <div className="p-12 text-center text-slate-400">
            جارٍ تحميل تفاصيل طلب الصرف من المستودع...
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {request && !loading && (
          <>
            {/* Header Ribbon */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-[#1167c9] text-white shadow-xs">
                  <PackageCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {request.requestNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                    >
                      {statusCfg?.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
                      {supplyRequestSubjectLabels[request.subjectType] || "طلب صرف"}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-1 flex flex-wrap items-center gap-3">
                    <span>تاريخ الطلب: {formatDateTime(request.requestedAtUtc)}</span>
                    <span>•</span>
                    <span>مقدم الطلب: <strong>{request.requestedByUserName || "المسؤول"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Status Badge or Total Cost */}
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">إجمالي تكلفة الصرف</span>
                <span className="text-base font-black font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(totalCalculatedCost)}
                </span>
                {isPending && totalCalculatedCost > 0 && !request.totalIssuedCost && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                    (محسوبة من القطع والكميات)
                  </span>
                )}
              </div>
            </div>

            {/* Target Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Building2 size={14} className="text-[#1167c9]" />
                  <span className="font-bold text-[11px]">مستودع الصرف</span>
                </div>
                <strong className="text-slate-800 dark:text-slate-200 block text-xs">
                  {request.inventoryLocationNameAr ||
                    locations.find((l) => l.id === request.inventoryLocationId)?.nameAr ||
                    "المستودع الرئيسي"}
                </strong>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  {request.subjectType === SupplyRequestSubjectType.VehicleMaintenance ? (
                    <Car size={14} className="text-emerald-600" />
                  ) : (
                    <User size={14} className="text-purple-600" />
                  )}
                  <span className="font-bold text-[11px]">
                    {request.subjectType === SupplyRequestSubjectType.VehicleMaintenance
                      ? "مركبة الصيانة"
                      : "المندوب المستلم"}
                  </span>
                </div>
                <strong className="text-slate-800 dark:text-slate-200 block text-xs">
                  {request.subjectType === SupplyRequestSubjectType.VehicleMaintenance ? (
                    <>
                      {request.vehicleAssetNumber || "مركبة"} • لوحة: {request.vehiclePlateNumber || "-"}
                      {request.workOrderNumber && (
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          أمر العمل: {request.workOrderNumber}
                        </span>
                      )}
                    </>
                  ) : (
                    request.riderNameAr || "مندوب"
                  )}
                </strong>
              </div>

              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Clock size={14} className="text-amber-600" />
                  <span className="font-bold text-[11px]">قرار المستودع</span>
                </div>
                <div className="text-xs">
                  {request.decisionAtUtc ? (
                    <div>
                      <span className="text-slate-700 dark:text-slate-300">
                        {formatDateTime(request.decisionAtUtc)}
                      </span>
                      {request.decisionByUserName && (
                        <span className="text-[10px] text-slate-400 block">
                          بواسطة: {request.decisionByUserName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">بانتظار الإجراء</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes / Rejection callout */}
            {(request.notes || request.decisionNotes || request.rejectionReason) && (
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-1.5">
                {request.notes && (
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">ملاحظات مقدم الطلب: </span>
                    <span className="text-slate-600 dark:text-slate-400">{request.notes}</span>
                  </div>
                )}
                {request.decisionNotes && (
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">ملاحظات المستودع: </span>
                    <span className="text-slate-600 dark:text-slate-400">{request.decisionNotes}</span>
                  </div>
                )}
                {request.rejectionReason && (
                  <div className="text-red-600 dark:text-red-400 font-bold">
                    <span>سبب رفض الطلب: </span>
                    <span>{request.rejectionReason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Lines List */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>الأصناف المطلوبة للتسليم ({request.lines?.length || 0})</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  يتم احتساب التكلفة آلياً بناءً على سعر قطع الغيار والكميات المطلوبة
                </span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-right text-xs">
                  <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5 font-mono">الرمز SKU</th>
                      <th className="p-2.5 text-center">الكمية المطلوبة</th>
                      <th className="p-2.5 text-center">الكمية المسلمة</th>
                      <th className="p-2.5 text-left font-mono">تكلفة الوحدة</th>
                      <th className="p-2.5 text-left font-mono">إجمالي التكلفة</th>
                      <th className="p-2.5">الملاحظات والعهدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {request.lines?.map((line, idx) => {
                      const lineKey = line.id || `line-${idx}`;
                      const unitCost = getLineUnitCost(line);
                      const lineTotal = getLineTotalCost(line);

                      return (
                        <tr key={lineKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                            <div>{line.itemNameAr}</div>
                            {line.itemNameEn && (
                              <div className="text-[10px] text-slate-400 font-normal">{line.itemNameEn}</div>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-slate-500 text-[11px]">{line.sku}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {line.requestedQuantity}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">
                            <span
                              className={
                                line.issuedQuantity > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-400"
                              }
                            >
                              {line.issuedQuantity}
                            </span>
                          </td>
                          <td className="p-2.5 text-left font-mono font-bold text-slate-700 dark:text-slate-300">
                            {formatCurrency(unitCost)}
                          </td>
                          <td className="p-2.5 text-left font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="p-2.5 text-slate-500 text-[11px]">
                            {line.expectedReturn && (
                              <span className="inline-block px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] ml-1">
                                عهدة مستردة
                              </span>
                            )}
                            {line.notes || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {request.lines && request.lines.length > 0 && (
                    <tfoot className="border-t-2 border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/50 font-bold">
                      <tr>
                        <td colSpan={5} className="p-2.5 text-right font-black text-slate-800 dark:text-slate-200">
                          إجمالي تكلفة قطع الغيار والمواد المحتسبة:
                        </td>
                        <td className="p-2.5 text-left font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(totalCalculatedCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Warehouse Confirmation Warning Box (Crucial Requirement) */}
            {isPending && showApproveConfirm && (
              <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-100 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-sm font-black block">
                      تأكيد التسليم الفعلي وخصم المخزون (Approve and Issue)
                    </strong>
                    <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 font-bold">
                      أنت تؤكد أنه تم تسليم هذه الأصناف فعلياً للمستلم. سيقوم النظام بخصم الكميات واحتساب التكلفة آلياً باستخدام طريقة الوارد أولاً يصرف أولاً (FIFO)، ولا يمكن الموافقة الجزئية على هذا الطلب.
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300 font-mono">
                      You are confirming that these items were physically handed over. The system will deduct stock using FIFO and cannot partially approve this request.
                    </p>
                  </div>
                </div>

                {sealedBarrels.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1.5">
                      <Droplets size={13} className="text-amber-600" />
                      <span>برميل الزيت الاحتياطي / التالي (اختياري - في حال عدم كفاية البرميل المفتوح الحالي)</span>
                    </label>
                    <select
                      value={nextOilBarrelId || ""}
                      onChange={(e) => setNextOilBarrelId(e.target.value || null)}
                      className="w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-2 text-xs font-mono font-bold focus:outline-hidden"
                    >
                      <option value="">-- الاعتماد على البرميل المفتوح الحالي تلقائياً --</option>
                      {sealedBarrels.map((barrel) => (
                        <option key={barrel.id} value={barrel.id}>
                          برميل رقم {barrel.barrelNumber} - سعة {barrel.nominalCapacityLiters} لتر (المتبقي: {barrel.remainingLiters} لتر)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                    ملاحظات التسليم والتسجيل
                  </label>
                  <Input
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    placeholder="Handed to vehicle administrator"
                    className="text-xs bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-300/60 dark:border-amber-800">
                  <Button
                    variant="ghost"
                    onClick={() => setShowApproveConfirm(false)}
                    disabled={actionLoading}
                    className="text-xs"
                  >
                    تراجع
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApprove}
                    loading={actionLoading}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle size={14} />
                    تأكيد التسليم والصرف الآن
                  </Button>
                </div>
              </div>
            )}

            {/* Rejection Form Box */}
            {isPending && showRejectForm && (
              <form
                onSubmit={handleReject}
                className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <XCircle size={22} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-sm font-bold block">رفض طلب الصرف</strong>
                    <p className="text-xs text-red-800 dark:text-red-300">
                      يرجى إدخال سبب الرفض (إلزامي). سيتم إشعار مقدم الطلب بحالة الرفض.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">
                    سبب الرفض <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="مثال: القطع غير متوفرة في المستودع حالياً أو غير مطابقة..."
                    required
                    className="text-xs bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-red-200 dark:border-red-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowRejectForm(false)}
                    disabled={actionLoading}
                    className="text-xs"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    disabled={!rejectNotes.trim()}
                    loading={actionLoading}
                    className="text-xs"
                  >
                    <XCircle size={14} />
                    تأكيد الرفض
                  </Button>
                </div>
              </form>
            )}

            {/* Bottom Actions Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={handleModalClose} disabled={actionLoading} className="text-xs">
                إغلاق
              </Button>

              {isPending && canApprove && !showApproveConfirm && !showRejectForm && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    onClick={() => setShowRejectForm(true)}
                    className="text-xs h-9"
                  >
                    <XCircle size={14} />
                    رفض الطلب (Reject)
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setShowApproveConfirm(true)}
                    className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle size={14} />
                    اعتماد وصرف (Approve & Issue)
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
