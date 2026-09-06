"use client";

import React, { useState, useEffect } from "react";
import {
  Droplets,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lock,
  Unlock,
  TrendingDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  getOilBarrels,
  openOilBarrel,
  recordOilLoss,
} from "@/lib/maintenance/api";
import type {
  OilBarrel,
  MaintenanceLocation,
  InventoryItem,
} from "@/lib/maintenance/types";
import { ItemType } from "@/lib/maintenance/types";
import {
  oilBarrelStatusConfig,
  formatCurrency,
  formatDateTime,
} from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";

interface OilBarrelsViewProps {
  locations: MaintenanceLocation[];
  items: InventoryItem[];
}

export function OilBarrelsView({ locations, items }: OilBarrelsViewProps) {
  const { can } = useAuth();
  const canManage = can("inventory.stock.adjust");

  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [barrels, setBarrels] = useState<OilBarrel[]>([]);

  // Modals & State
  const [actionLoading, setActionLoading] = useState(false);
  const [warningModalMessage, setWarningModalMessage] = useState<string | null>(null);

  // Loss Modal
  const [lossModalBarrel, setLossModalBarrel] = useState<OilBarrel | null>(null);
  const [lossQuantity, setLossQuantity] = useState<string>("");
  const [lossReason, setLossReason] = useState<string>("");

  const loadBarrels = async () => {
    setLoading(true);
    try {
      const data = await getOilBarrels({
        inventoryLocationId: selectedLocationId || undefined,
        inventoryItemId: selectedItemId || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setBarrels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarrels();
  }, [selectedLocationId, selectedItemId, statusFilter]);

  // Handle Open Barrel
  const handleOpenBarrel = async (barrel: OilBarrel) => {
    if (!confirm(`هل أنت متأكد من فتح البرميل رقم ${barrel.barrelNumber}؟`)) return;

    setActionLoading(true);
    try {
      const res = await openOilBarrel(barrel.id, {
        openedAtUtc: new Date().toISOString(),
        rowVersion: barrel.rowVersion,
      });

      if (res.hasPreviousBarrelWarning || !res.opened) {
        setWarningModalMessage(
          res.warningMessageAr ||
            `تنبيه تشغيلي: يوجد برميل زيت مفتوح حالياً متبقٍ به (${res.previousOpenBarrelsRemainingLiters} لتر). وفقاً للسياسة التشغيلية يجب استهلاك البرميل المفتوح أولاً قبل فتح برميل جديد.`,
        );
      } else {
        alert(`تم فتح البرميل ${barrel.barrelNumber} بنجاح وهو متاح الآن للاستهلاك.`);
      }
      loadBarrels();
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Record Loss
  const handleRecordLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lossModalBarrel) return;

    const qty = parseFloat(lossQuantity);
    if (!qty || qty <= 0) {
      alert("يرجى إدخال كمية فاقد صالحة وموجبة.");
      return;
    }

    if (qty > lossModalBarrel.remainingLossAllowanceLiters) {
      alert(
        `الكمية المدخلة (${qty} لتر) تتجاوز الحد الأقصى المسموح به للفاقد (${lossModalBarrel.remainingLossAllowanceLiters} لتر). الحد الأقصى القانوني للفاقد هو 2% من سعة البرميل الأصلية.`,
      );
      return;
    }

    setActionLoading(true);
    try {
      await recordOilLoss(lossModalBarrel.id, {
        occurredAtUtc: new Date().toISOString(),
        quantityLiters: qty,
        reason: lossReason.trim() || "فاقد وإهلاك طبيعي موثق",
        rowVersion: lossModalBarrel.rowVersion,
      });
      setLossModalBarrel(null);
      setLossQuantity("");
      setLossReason("");
      loadBarrels();
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const oilItems = items.filter((i) => i.itemType === ItemType.Oil);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <SearchableSelect
              value={selectedLocationId}
              onChange={(val) => setSelectedLocationId(val)}
              options={[
                { value: "", label: "جميع المستودعات والمواقع" },
                ...locations.map((l) => ({
                  value: l.id,
                  label: `${l.nameAr} (${l.code})`,
                })),
              ]}
              placeholder="الموقع..."
            />
          </div>
          <div className="w-64">
            <SearchableSelect
              value={selectedItemId}
              onChange={(val) => setSelectedItemId(val)}
              options={[
                { value: "", label: "جميع أصناف الزيوت" },
                ...oilItems.map((i) => ({
                  value: i.id,
                  label: `${i.nameAr} (${i.sku})`,
                })),
              ]}
              placeholder="صنف الزيت..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
          >
            <option value="all">جميع الحالات</option>
            <option value="open">المفتوحة حالياً (Open)</option>
            <option value="sealed">المختومة (Sealed)</option>
            <option value="depleted">المستهلكة (Depleted)</option>
            <option value="returned">المرتجعة (Returned)</option>
          </select>
        </div>

        <Button variant="secondary" onClick={loadBarrels} loading={loading} className="h-10 text-xs">
          <RefreshCw size={14} />
          تحديث البراميل
        </Button>
      </div>

      {/* Barrels Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          جارٍ فحص براميل الزيوت المسجلة...
        </div>
      ) : barrels.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          لا توجد براميل زيت مسجلة مطابقة للفلتر المحدد.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {barrels.map((barrel) => {
            const statusCfg = oilBarrelStatusConfig[barrel.status];
            const percentRemaining = Math.max(
              0,
              Math.min(100, (barrel.remainingLiters / barrel.nominalCapacityLiters) * 100),
            );
            const isOpen = barrel.status === 2;
            const isSealed = barrel.status === 1;

            return (
              <div
                key={barrel.id}
                className={`rounded-2xl border p-5 shadow-xs transition-all ${
                  isOpen
                    ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`grid size-9 place-items-center rounded-xl ${
                        isOpen
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <Droplets size={18} />
                    </div>
                    <div>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {barrel.barrelNumber}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        سلسلة طرد #{barrel.packageSequence}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                  >
                    {statusCfg?.label}
                  </span>
                </div>

                {/* Liters Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">الكمية المتبقية:</span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {barrel.remainingLiters.toFixed(2)} / {barrel.nominalCapacityLiters} لتر
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOpen
                          ? "bg-emerald-500"
                          : isSealed
                            ? "bg-blue-500"
                            : "bg-slate-400"
                      }`}
                      style={{ width: `${percentRemaining}%` }}
                    />
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border)] text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">تكلفة اللتر (FIFO):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(barrel.unitCostPerLiter)}/لتر
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">قيمة المخزون المتبقي:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(barrel.remainingInventoryValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">المستهلك:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {barrel.consumedLiters.toFixed(2)} لتر
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">الفاقد المسجل:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {barrel.recordedLossLiters.toFixed(2)} لتر (حد أقصى: {barrel.maximumAllowedLossLiters} لتر)
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2">
                    {isSealed && (
                      <Button
                        variant="primary"
                        onClick={() => handleOpenBarrel(barrel)}
                        loading={actionLoading}
                        className="w-full h-8 text-xs font-bold"
                      >
                        <Unlock size={13} />
                        فتح البرميل للاستهلاك
                      </Button>
                    )}

                    {isOpen && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setLossModalBarrel(barrel);
                          setLossQuantity("");
                          setLossReason("");
                        }}
                        className="w-full h-8 text-xs font-bold text-amber-700 dark:text-amber-400"
                      >
                        <TrendingDown size={13} />
                        تسجيل فاقد / إهلاك (بحد أقصى 2%)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warning Dialog when attempting to open a new barrel while another is open */}
      <Modal
        isOpen={Boolean(warningModalMessage)}
        onClose={() => setWarningModalMessage(null)}
        title="تنبيه حماية مخزون الزيوت"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center py-2" dir="rtl">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/50">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            لا يمكن فتح البرميل الجديد حالياً
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {warningModalMessage}
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => setWarningModalMessage(null)}
              className="w-full text-xs"
            >
              حسناً، فهمت ذلك
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Loss Modal */}
      <Modal
        isOpen={Boolean(lossModalBarrel)}
        onClose={() => setLossModalBarrel(null)}
        title={`تسجيل فاقد / إهلاك للبرميل: ${lossModalBarrel?.barrelNumber || ""}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordLoss} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-300">
              <span>الحد الأقصى القانوني المسموح به (2%):</span>
              <span className="font-mono">
                {lossModalBarrel?.maximumAllowedLossLiters} لتر
              </span>
            </div>
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 text-[11px]">
              <span>المتبقي من رصيد الفاقد المسموح:</span>
              <span className="font-mono font-bold">
                {lossModalBarrel?.remainingLossAllowanceLiters} لتر
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              كمية الفاقد المراد تسجيلها (باللتر) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={lossModalBarrel?.remainingLossAllowanceLiters || undefined}
              value={lossQuantity}
              onChange={(e) => setLossQuantity(e.target.value)}
              placeholder={`بحد أقصى ${lossModalBarrel?.remainingLossAllowanceLiters || 0} لتر`}
              required
              className="text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              سبب الفاقد <span className="text-red-500">*</span>
            </label>
            <Input
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              placeholder="مثال: تسريب موثق / بقايا ترسبات القاع"
              required
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setLossModalBarrel(null)}
              disabled={actionLoading}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button variant="primary" type="submit" loading={actionLoading} className="text-xs">
              تأكيد تسجيل الفاقد
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
