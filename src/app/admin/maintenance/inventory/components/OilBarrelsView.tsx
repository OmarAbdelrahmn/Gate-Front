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
  FileSpreadsheet,
  Car,
  Bike,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { exportToExcel } from "@/lib/export-excel";
import {
  getOilBarrels,
  recordOilLoss,
} from "@/lib/maintenance/api";
import type {
  OilBarrel,
  MaintenanceLocation,
  InventoryItem,
  OpenBarrelResponse,
} from "@/lib/maintenance/types";
import { ItemType, OilBarrelStatus } from "@/lib/maintenance/types";
import {
  oilBarrelStatusConfig,
  oilBarrelVehicleTypeConfig,
  formatCurrency,
  formatDateTime,
} from "@/lib/maintenance/constants";
import { useAuth } from "@/lib/auth/AuthProvider";
import { OpenOilBarrelModal } from "./OpenOilBarrelModal";
import { AssignOilBarrelVehicleTypeModal } from "./AssignOilBarrelVehicleTypeModal";
import { OilBarrelUsageModal } from "./OilBarrelUsageModal";

interface OilBarrelsViewProps {
  locations: MaintenanceLocation[];
  items: InventoryItem[];
}

export function OilBarrelsView({ locations, items }: OilBarrelsViewProps) {
  const { can } = useAuth();
  const canMove = can("inventory.stock.move");
  const canAdjust = can("inventory.stock.adjust");
  const canViewUsage = can("inventory.stock.read") || can("maintenance.oil.read");

  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("all");

  const [barrels, setBarrels] = useState<OilBarrel[]>([]);

  // Action / Warning Modals
  const [actionLoading, setActionLoading] = useState(false);
  const [warningModalMessage, setWarningModalMessage] = useState<string | null>(null);

  // New Modals
  const [openModalBarrel, setOpenModalBarrel] = useState<OilBarrel | null>(null);
  const [assignTypeModalBarrel, setAssignTypeModalBarrel] = useState<OilBarrel | null>(null);
  const [usageModalBarrel, setUsageModalBarrel] = useState<OilBarrel | null>(null);

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
        vehicleType:
          vehicleTypeFilter === "all" ? undefined : Number(vehicleTypeFilter),
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
  }, [selectedLocationId, selectedItemId, statusFilter, vehicleTypeFilter]);

  // Handle Open Barrel response from OpenOilBarrelModal
  const handleOpenSuccess = (res: OpenBarrelResponse) => {
    setOpenModalBarrel(null);
    if (res.hasPreviousBarrelWarning || !res.opened) {
      setWarningModalMessage(
        res.warningMessageAr ||
          `تنبيه تشغيلي: يوجد برميل زيت مفتوح حالياً متبقٍ به (${res.previousOpenBarrelsRemainingLiters} لتر). وفقاً للسياسة التشغيلية يجب استهلاك البرميل المفتوح أولاً قبل فتح برميل جديد.`,
      );
    } else {
      alert(`تم فتح البرميل بنجاح وهو متاح الآن للاستهلاك.`);
    }
    loadBarrels();
  };

  // Handle Assign Vehicle Type response
  const handleAssignSuccess = () => {
    setAssignTypeModalBarrel(null);
    loadBarrels();
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
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (barrels.length === 0) {
      alert("لا توجد بيانات براميل زيت للتصدير.");
      return;
    }
    await exportToExcel({
      filename: `oil-barrels-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "براميل الزيوت",
      columns: [
        { header: "رقم البرميل", accessor: "barrelNumber", isText: true, width: 22 },
        {
          header: "المستودع / الموقع",
          accessor: (b) => {
            const loc = locations.find((l) => l.id === b.inventoryLocationId);
            return loc ? `${loc.nameAr} (${loc.code})` : b.inventoryLocationId;
          },
          width: 25,
        },
        {
          header: "صنف الزيت",
          accessor: (b) => {
            const itm = items.find((i) => i.id === b.inventoryItemId);
            return itm ? `${itm.nameAr} (${itm.sku})` : b.inventoryItemId;
          },
          width: 28,
        },
        {
          header: "نوع المركبة المسموح",
          accessor: (b) =>
            b.allowedVehicleType === 2
              ? "سيارات فقط"
              : b.allowedVehicleType === 1
                ? "دراجات نارية فقط"
                : "غير محدد",
          width: 20,
        },
        {
          header: "الحالة",
          accessor: (b) => oilBarrelStatusConfig[b.status]?.label || String(b.status),
          width: 15,
        },
        { header: "سلسلة الطرد", accessor: "packageSequence", width: 14 },
        { header: "السعة الاسمية (لتر)", accessor: "nominalCapacityLiters", width: 18 },
        { header: "المتبقي (لتر)", accessor: (b) => Number(b.remainingLiters.toFixed(2)), width: 15 },
        { header: "المستهلك (لتر)", accessor: (b) => Number(b.consumedLiters.toFixed(2)), width: 15 },
        { header: "الفاقد المسجل (لتر)", accessor: (b) => Number(b.recordedLossLiters.toFixed(2)), width: 18 },
        { header: "الحد الأقصى للفاقد (لتر)", accessor: (b) => Number(b.maximumAllowedLossLiters.toFixed(2)), width: 22 },
        { header: "تكلفة اللتر (ر.س)", accessor: (b) => Number(b.unitCostPerLiter.toFixed(2)), width: 18 },
        { header: "قيمة المخزون المتبقي (ر.س)", accessor: (b) => Number(b.remainingInventoryValue.toFixed(2)), width: 22 },
        {
          header: "تاريخ الفتح",
          accessor: (b) => (b.openedAtUtc ? formatDateTime(b.openedAtUtc) : "-"),
          width: 20,
        },
        {
          header: "تاريخ الاستهلاك",
          accessor: (b) => (b.depletedAtUtc ? formatDateTime(b.depletedAtUtc) : "-"),
          width: 20,
        },
      ],
      data: barrels,
    });
  };

  const oilItems = items.filter((i) => i.itemType === ItemType.Oil);

  const getBarrelItemName = (barrel: OilBarrel | null) => {
    if (!barrel) return "";
    const itm = items.find((i) => i.id === barrel.inventoryItemId);
    return itm ? `${itm.nameAr} (${itm.sku})` : "";
  };

  const getBarrelLocationName = (barrel: OilBarrel | null) => {
    if (!barrel) return "";
    const loc = locations.find((l) => l.id === barrel.inventoryLocationId);
    return loc ? `${loc.nameAr} (${loc.code})` : "";
  };

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
            <option value="Open">المفتوحة حالياً (Open)</option>
            <option value="Sealed">المختومة (Sealed)</option>
            <option value="Depleted">المستهلكة (Depleted)</option>
            <option value="Returned">المرتجعة (Returned)</option>
          </select>
          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
          >
            <option value="all">جميع أنواع المركبات</option>
            <option value="2">سيارات فقط (Cars - 2)</option>
            <option value="1">دراجات نارية فقط (Motorcycles - 1)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="h-10 text-xs inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
          >
            <FileSpreadsheet size={14} />
            تصدير إكسل
          </Button>
          <Button variant="secondary" onClick={loadBarrels} loading={loading} className="h-10 text-xs">
            <RefreshCw size={14} />
            تحديث البراميل
          </Button>
        </div>
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
            const isOpen = barrel.status === OilBarrelStatus.Open;
            const isSealed = barrel.status === OilBarrelStatus.Sealed;
            const isDepleted = barrel.status === OilBarrelStatus.Depleted;
            const isUnclassifiedOpen = isOpen && (barrel.allowedVehicleType === null || barrel.allowedVehicleType === undefined);
            const typeCfg =
              barrel.allowedVehicleType !== undefined && barrel.allowedVehicleType !== null
                ? oilBarrelVehicleTypeConfig[barrel.allowedVehicleType]
                : null;

            return (
              <div
                key={barrel.id}
                className={`rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isOpen
                    ? isUnclassifiedOpen
                      ? "border-amber-400 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/20 ring-2 ring-amber-500/20"
                      : "border-emerald-400 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`grid size-9 place-items-center rounded-xl shrink-0 ${
                          isOpen
                            ? isUnclassifiedOpen
                              ? "bg-amber-600 text-white"
                              : "bg-emerald-600 text-white"
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
                          طرد #{barrel.packageSequence}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg?.border} ${statusCfg?.bg} ${statusCfg?.text}`}
                      >
                        {statusCfg?.label}
                      </span>
                      {typeCfg ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${typeCfg.border} ${typeCfg.bg} ${typeCfg.text}`}
                        >
                          {barrel.allowedVehicleType === 1 ? <Bike size={11} /> : <Car size={11} />}
                          {typeCfg.badgeAr}
                        </span>
                      ) : isUnclassifiedOpen ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                          <AlertTriangle size={11} />
                          غير محدد
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Warning banner for legacy unclassified open barrel */}
                  {isUnclassifiedOpen && (
                    <div className="mt-3 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div className="leading-snug">
                        <span className="font-bold block">برميل مفتوح سابقاً بدون تصنيف</span>
                        <span className="text-[11px] text-amber-800 dark:text-amber-300">
                          لا يمكن استهلاك الزيت في العمليات الجديدة حتى يتم تحديد نوع المركبة.
                        </span>
                      </div>
                    </div>
                  )}

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
                      <span className="text-[11px] text-slate-400 block">تكلفة اللتر:</span>
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
                        {barrel.recordedLossLiters.toFixed(2)} لتر
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
                  {/* Sealed Barrel Open Action */}
                  {isSealed && canMove && (
                    <Button
                      variant="primary"
                      onClick={() => setOpenModalBarrel(barrel)}
                      className="w-full h-8 text-xs font-bold"
                    >
                      <Unlock size={13} />
                      فتح البرميل للاستهلاك
                    </Button>
                  )}

                  {/* Unclassified Open Barrel Assign Action */}
                  {isUnclassifiedOpen && canMove && (
                    <Button
                      variant="primary"
                      onClick={() => setAssignTypeModalBarrel(barrel)}
                      className="w-full h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <ShieldAlert size={13} />
                      تحديد نوع المركبة
                    </Button>
                  )}

                  {/* View Usage Action (for Open and Depleted barrels) */}
                  {(isOpen || isDepleted) && canViewUsage && (
                    <Button
                      variant="secondary"
                      onClick={() => setUsageModalBarrel(barrel)}
                      className={`h-8 text-xs font-bold ${
                        isOpen && !isUnclassifiedOpen ? "flex-1" : isDepleted ? "w-full" : "flex-1"
                      }`}
                    >
                      <Eye size={13} />
                      عرض الاستهلاك
                    </Button>
                  )}

                  {/* Record Loss Action (Open barrels only) */}
                  {isOpen && canAdjust && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setLossModalBarrel(barrel);
                        setLossQuantity("");
                        setLossReason("");
                      }}
                      className="h-8 text-xs font-bold text-amber-700 dark:text-amber-400 flex-1"
                    >
                      <TrendingDown size={13} />
                      تسجيل فاقد
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Open Barrel Modal (Vehicle Type Choice Required) */}
      <OpenOilBarrelModal
        isOpen={Boolean(openModalBarrel)}
        onClose={() => setOpenModalBarrel(null)}
        barrel={openModalBarrel}
        itemName={getBarrelItemName(openModalBarrel)}
        locationName={getBarrelLocationName(openModalBarrel)}
        onSuccess={handleOpenSuccess}
      />

      {/* Assign Vehicle Type Modal (One-time compatibility for legacy open barrels) */}
      <AssignOilBarrelVehicleTypeModal
        isOpen={Boolean(assignTypeModalBarrel)}
        onClose={() => setAssignTypeModalBarrel(null)}
        barrel={assignTypeModalBarrel}
        itemName={getBarrelItemName(assignTypeModalBarrel)}
        locationName={getBarrelLocationName(assignTypeModalBarrel)}
        onSuccess={handleAssignSuccess}
      />

      {/* View Usage Modal */}
      <OilBarrelUsageModal
        isOpen={Boolean(usageModalBarrel)}
        onClose={() => setUsageModalBarrel(null)}
        barrel={usageModalBarrel}
        itemName={getBarrelItemName(usageModalBarrel)}
        locationName={getBarrelLocationName(usageModalBarrel)}
      />

      {/* Warning Dialog when attempting to open a new barrel while another of the same type is open */}
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
        <form onSubmit={handleRecordLoss} className="space-y-4 text-right" dir="rtl">
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
