"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  createRiderSupplyRequest,
  getMySupplyRequest,
  cancelSupplyRequest,
  getInventoryItems,
} from "@/lib/maintenance/api";
import { listRiders } from "@/lib/workforce/api";
import type {
  MaintenanceLocation,
  InventoryItem,
  SupplyRequest,
} from "@/lib/maintenance/types";
import {
  ItemType,
  SupplyRequestStatus,
} from "@/lib/maintenance/types";
import {
  supplyRequestStatusConfig,
  formatCurrency,
  formatDateTime,
  WORK_SITE_TO_INVENTORY_LOCATION_MAP,
} from "@/lib/maintenance/constants";
import { LocationType } from "@/lib/maintenance/types";
import { useAuth } from "@/lib/auth/AuthProvider";

interface RiderItemLine {
  tempId: string;
  inventoryItemId: string;
  quantity: number;
  expectedReturn: boolean;
  notes: string;
}

interface RequestRiderItemsViewProps {
  locations: MaintenanceLocation[];
  items?: InventoryItem[];
}

export function RequestRiderItemsView({
  locations,
  items: propItems,
}: RequestRiderItemsViewProps) {
  const { can } = useAuth();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [riders, setRiders] = useState<{ id: string; label: string }[]>([]);
  const [fetchedItems, setFetchedItems] = useState<InventoryItem[]>([]);
  const availableItems = propItems && propItems.length > 0 ? propItems : fetchedItems;

  // Inventory locations that have inventory enabled (excluding pure work sites)
  const warehouseLocations = locations.filter(
    (l) =>
      (l.inventoryEnabled || l.locationType === LocationType.Warehouse || (l.locationType as number) === 1) &&
      !Object.keys(WORK_SITE_TO_INVENTORY_LOCATION_MAP).includes(l.id),
  );

  // Form fields
  const [riderProfileId, setRiderProfileId] = useState("");
  const [inventoryLocationId, setInventoryLocationId] = useState(() => {
    const defaultLoc = locations.find(
      (l) =>
        (l.inventoryEnabled || l.locationType === LocationType.Warehouse || (l.locationType as number) === 1) &&
        !Object.keys(WORK_SITE_TO_INVENTORY_LOCATION_MAP).includes(l.id),
    );
    return defaultLoc ? defaultLoc.id : "019d77f0-0000-7000-8000-000000000003";
  });
  const [requestedAtUtc, setRequestedAtUtc] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [notes, setNotes] = useState("");

  // Repeatable accessory lines
  const [lines, setLines] = useState<RiderItemLine[]>([
    {
      tempId: "1",
      inventoryItemId: "",
      quantity: 1,
      expectedReturn: true,
      notes: "",
    },
  ]);

  // Last submitted or active request
  const [submittedRequest, setSubmittedRequest] = useState<SupplyRequest | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Deep linking for viewing a personal request
  useEffect(() => {
    const deepId = searchParams.get("requestId") || searchParams.get("id");
    if (deepId) {
      let active = true;
      getMySupplyRequest(deepId)
        .then((res) => {
          if (active) setSubmittedRequest(res);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [searchParams]);

  // Load riders and inventory items
  useEffect(() => {
    let active = true;
    listRiders()
      .then((res) => {
        if (active && Array.isArray(res)) {
          setRiders(
            res.map((r) => ({
              id: r.id,
              label: `${r.fullNameAr || r.fullNameEn || "مندوب"} (إقامة: ${r.iqamaNo || "-"})`,
            })),
          );
        }
      })
      .catch(() => {});

    if (!propItems || propItems.length === 0) {
      getInventoryItems()
        .then((data) => {
          if (active && Array.isArray(data)) {
            setFetchedItems(data);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [propItems]);

  // Only allow items whose itemType is RiderAccessory (2)
  const riderAccessories = availableItems.filter(
    (i) => i.itemType === ItemType.RiderAccessory,
  );

  const handleAddLine = () => {
    const newId = `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setLines((prev) => [
      ...prev,
      {
        tempId: newId,
        inventoryItemId: "",
        quantity: 1,
        expectedReturn: true,
        notes: "",
      },
    ]);
  };

  const handleUpdateLine = <K extends keyof RiderItemLine>(
    index: number,
    field: K,
    value: RiderItemLine[K],
  ) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      alert("يجب تضمين صنف واحد على الأقل في الطلب.");
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveLocationId = inventoryLocationId || warehouseLocations[0]?.id || "";
    if (!riderProfileId) {
      alert("يرجى اختيار المندوب المستلم.");
      return;
    }
    if (!effectiveLocationId) {
      alert("يرجى اختيار مستودع الصرف.");
      return;
    }
    if (lines.length === 0) {
      alert("يرجى إضافة صنف واحد على الأقل.");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.inventoryItemId) {
        alert(`يرجى اختيار صنف المستلزمات للسطر رقم ${i + 1}.`);
        return;
      }
      if (!line.quantity || Number(line.quantity) <= 0) {
        alert(`يرجى تحديد كمية صحيحة للسطر رقم ${i + 1}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const created = await createRiderSupplyRequest({
        riderProfileId,
        inventoryLocationId: effectiveLocationId,
        requestedAtUtc: new Date(requestedAtUtc).toISOString(),
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          quantity: Number(l.quantity),
          maintenanceUsageType: null, // Per spec: no maintenance usage type for rider request
          expectedReturn: Boolean(l.expectedReturn),
          notes: l.notes.trim() || null,
        })),
      });

      // Fetch fresh details via personal request endpoint per specs
      const fresh = await getMySupplyRequest(created.id);
      setSubmittedRequest(fresh);

      // Reset form lines
      setLines([
        {
          tempId: "line-1",
          inventoryItemId: "",
          quantity: 1,
          expectedReturn: true,
          notes: "",
        },
      ]);
      setNotes("");
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Requester cancellation flow
  const handleCancelRequest = async (req: SupplyRequest) => {
    const reason = prompt(
      "يرجى إدخال سبب إلغاء طلب المستلزمات:",
      "Wrong item selected",
    );
    if (reason === null) return;

    setCancelLoading(true);
    try {
      await cancelSupplyRequest(req.id, {
        occurredAtUtc: new Date().toISOString(),
        rowVersion: req.rowVersion,
        notes: reason.trim() || "Wrong item selected",
      });

      const updated = await getMySupplyRequest(req.id);
      setSubmittedRequest(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setCancelLoading(false);
    }
  };

  const statusCfg = submittedRequest
    ? supplyRequestStatusConfig[submittedRequest.status]
    : null;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag size={18} className="text-purple-600" />
            طلب مستلزمات ومعدات للمناديب (Request rider items)
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5">
            تقديم طلب صرف عهد ومستلزمات عمل للمندوب واعتمادها والتسليم الفعلي من المستودع.
          </p>
        </div>
      </div>

      {/* Confirmation & Status Card for Submitted Request */}
      {submittedRequest && (
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4 shadow-xs">
          {/* Status Banner */}
          {submittedRequest.status === SupplyRequestStatus.PendingWarehouseApproval && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle size={22} className="text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">
                    Waiting for warehouse approval. Stock has not been issued.
                  </span>
                  <span className="text-xs text-amber-800 dark:text-amber-300">
                    بانتظار موافقة المستودع. تم تسجيل طلب المستلزمات رقم{" "}
                    <strong>{submittedRequest.requestNumber}</strong> وهو قيد مراجعة أمين المستودع للتسليم الفعلي.
                  </span>
                </div>
              </div>

              {can("inventory.supply_requests.submit") && (
                <Button
                  variant="danger"
                  onClick={() => handleCancelRequest(submittedRequest)}
                  loading={cancelLoading}
                  className="text-xs h-8 shrink-0"
                >
                  <XCircle size={13} />
                  إلغاء الطلب المعلق
                </Button>
              )}
            </div>
          )}

          {submittedRequest.status === SupplyRequestStatus.ApprovedAndIssued && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
              <CheckCircle size={22} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-sm block">تم اعتماد وصرف الطلب بنجاح</span>
                <span className="text-xs">
                  تم تسليم الأصناف فعلياً للمندوب وتوثيق الصرف بتكلفة إجمالية{" "}
                  <strong>{formatCurrency(submittedRequest.totalIssuedCost || 0)}</strong>.
                </span>
              </div>
            </div>
          )}

          {submittedRequest.status === SupplyRequestStatus.Rejected && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-3">
              <XCircle size={22} className="text-red-600 shrink-0" />
              <div>
                <span className="font-bold text-sm block">تم رفض طلب المستلزمات من قِبل المستودع</span>
                <span className="text-xs">
                  سبب الرفض: {submittedRequest.rejectionReason || submittedRequest.decisionNotes || "غير محدد"}.
                </span>
              </div>
            </div>
          )}

          {submittedRequest.status === SupplyRequestStatus.Cancelled && (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-3">
              <AlertCircle size={22} className="text-slate-500 shrink-0" />
              <div>
                <span className="font-bold text-sm block">تم إلغاء الطلب</span>
                <span className="text-xs">
                  ملاحظات الإلغاء: {submittedRequest.decisionNotes || submittedRequest.notes || "تم إلغاء الطلب."}
                </span>
              </div>
            </div>
          )}

          {/* Request Header Summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                طلب رقم {submittedRequest.requestNumber}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
              >
                {statusCfg?.label}
              </span>
            </div>

            <div className="text-slate-500 text-[11px]">
              تاريخ الطلب: {formatDateTime(submittedRequest.requestedAtUtc)}
            </div>
          </div>

          {/* Target details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-slate-400 text-[10px] block">المندوب:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {submittedRequest.riderNameAr || "مندوب"}
              </strong>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-slate-400 text-[10px] block">مستودع الصرف:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {submittedRequest.inventoryLocationNameAr ||
                  locations.find((l) => l.id === submittedRequest.inventoryLocationId)?.nameAr ||
                  "المستودع الرئيسي"}
              </strong>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-slate-400 text-[10px] block">إجمالي التكلفة المصروفة:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {formatCurrency(submittedRequest.totalIssuedCost || 0)}
              </strong>
            </div>
          </div>

          {/* Lines Table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5 font-mono">SKU</th>
                  <th className="p-2.5 text-center">الكمية المطلوبة</th>
                  <th className="p-2.5 text-center">الكمية المسلمة</th>
                  <th className="p-2.5 text-left font-mono">التكلفة</th>
                  <th className="p-2.5">طبيعة العهدة</th>
                  <th className="p-2.5">الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {submittedRequest.lines?.map((line, lIdx) => (
                  <tr key={line.id || lIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {line.itemNameAr}
                    </td>
                    <td className="p-2.5 font-mono text-slate-500 text-[11px]">{line.sku}</td>
                    <td className="p-2.5 text-center font-mono font-bold">{line.requestedQuantity}</td>
                    <td className="p-2.5 text-center font-mono font-bold">
                      <span className={line.issuedQuantity > 0 ? "text-emerald-600" : "text-slate-400"}>
                        {line.issuedQuantity}
                      </span>
                    </td>
                    <td className="p-2.5 text-left font-mono font-bold">
                      {formatCurrency(line.issuedCost || 0)}
                    </td>
                    <td className="p-2.5">
                      {line.expectedReturn ? (
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                          عهدة مستردة
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">استهلاك شخصي</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-500 text-[11px]">{line.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Request Submission Form */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4 shadow-xs">
        <div className="border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Plus size={16} className="text-[#1167c9]" />
            إنشاء طلب مستلزمات جديد
          </h3>
          <p className="text-slate-500 text-[11px] mt-0.5">
            تحديد المندوب ومستودع الصرف ومستلزمات العمل ومعدات التوصيل المطلوبة.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                المندوب المستلم <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={riderProfileId}
                onChange={(val) => setRiderProfileId(val)}
                options={riders.map((r) => ({
                  value: r.id,
                  label: r.label,
                }))}
                placeholder="اختر المندوب..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                مستودع الصرف <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={inventoryLocationId}
                onChange={(val) => setInventoryLocationId(val)}
                options={warehouseLocations.map((l) => ({
                  value: l.id,
                  label: `${l.nameAr} (${l.code})`,
                }))}
                placeholder="اختر المستودع..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ ووقت الطلب <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={requestedAtUtc}
                onChange={(e) => setRequestedAtUtc(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات الطلب (اختياري)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تسليم عهدة بداية العمل، شنطة حفظ حرارة وخوذة وسترة..."
              className="text-xs"
            />
          </div>

          {/* Repeatable Rider-Accessory Lines */}
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                أصناف مستلزمات المندوب (Rider accessories only)
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddLine}
                className="text-xs h-7 px-2.5"
              >
                <Plus size={13} />
                إضافة صنف آخر
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div
                  key={line.tempId}
                  className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                >
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] text-slate-400 mb-0.5">
                      الصنف (مستلزمات مناديب فقط) <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={line.inventoryItemId}
                      onChange={(val) => handleUpdateLine(idx, "inventoryItemId", val)}
                      options={riderAccessories.map((item) => ({
                        value: item.id,
                        label: `${item.nameAr} (${item.sku})`,
                        sublabel: `SKU: ${item.sku}`,
                      }))}
                      placeholder="اختر صنف المستلزمات..."
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">
                      الكمية <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(e) =>
                        handleUpdateLine(idx, "quantity", parseFloat(e.target.value) || 1)
                      }
                      required
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 text-center pt-2 sm:pt-0">
                    <label className="block text-[10px] text-slate-400 mb-1">متوقع استرجاعها؟</label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={line.expectedReturn}
                        onChange={(e) =>
                          handleUpdateLine(idx, "expectedReturn", e.target.checked)
                        }
                        className="rounded border-slate-300 text-[#1167c9] focus:ring-0 size-4 cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        عهدة مستردة
                      </span>
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">ملاحظة السطر</label>
                    <Input
                      value={line.notes}
                      onChange={(e) => handleUpdateLine(idx, "notes", e.target.value)}
                      placeholder="المقاس أو الحالة..."
                      className="text-xs"
                    />
                  </div>

                  <div className="sm:col-span-1 text-center pt-3 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      title="حذف السطر"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <ShoppingBag size={14} />
              تقديم طلب المستلزمات للمستودع
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
