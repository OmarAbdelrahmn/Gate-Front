"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createCompanyWorkOrder, getInventoryItems, getStockBalances } from "@/lib/maintenance/api";
import { getVehicles, getVehicleDetail } from "@/lib/fleet/api";
import type { MaintenanceLocation, InventoryItem } from "@/lib/maintenance/types";
import { MaintenanceType, ItemType, MaterialUsageType, LocationType } from "@/lib/maintenance/types";
import {
  maintenanceTypeLabels,
  getLinkedInventoryLocationId,
  formatCurrency,
} from "@/lib/maintenance/constants";
import { PackagePlus, Trash2, Plus, Droplets, AlertCircle } from "lucide-react";

interface RequestedPartLine {
  tempId: string;
  inventoryItemId: string;
  quantity: number;
  unitCost?: number;
  maintenanceUsageType: number;
  notes: string;
}

interface VehicleOption {
  id: string;
  plateNumber: string;
  assetNumber: string;
  operatingCityId?: string | null;
  operatingCity?: string | null;
  currentOdometer?: number;
}

interface CreateCompanyWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  locations: MaintenanceLocation[];
  items?: InventoryItem[];
  initialVehicleId?: string;
  initialMaintenanceType?: MaintenanceType;
}

export function CreateCompanyWorkOrderModal({
  isOpen,
  onClose,
  onSaved,
  locations,
  items: propItems,
  initialVehicleId,
  initialMaintenanceType,
}: CreateCompanyWorkOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [fetchedItems, setFetchedItems] = useState<InventoryItem[]>([]);
  const availableItems = propItems && propItems.length > 0 ? propItems : fetchedItems;

  const [vehicleId, setVehicleId] = useState(initialVehicleId || "");
  const [prevVehicleProp, setPrevVehicleProp] = useState(initialVehicleId);
  if (initialVehicleId !== prevVehicleProp) {
    setPrevVehicleProp(initialVehicleId);
    setVehicleId(initialVehicleId || "");
  }

  const [maintenanceLocationId, setMaintenanceLocationId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>(
    initialMaintenanceType ?? MaintenanceType.Corrective,
  );
  const [prevTypeProp, setPrevTypeProp] = useState(initialMaintenanceType);
  if (initialMaintenanceType !== prevTypeProp) {
    setPrevTypeProp(initialMaintenanceType);
    setMaintenanceType(initialMaintenanceType ?? MaintenanceType.Corrective);
  }

  const [openedAtUtc] = useState(new Date().toISOString().slice(0, 16));
  const [odometerAtOpen, setOdometerAtOpen] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  // Warehouse Parts Request State (for non-oil work orders)
  const [requestNotes, setRequestNotes] = useState("");
  const [requestedLines, setRequestedLines] = useState<RequestedPartLine[]>([]);
  const [stockBalances, setStockBalances] = useState<Record<string, number>>({});

  // Warehouse Oil Change State (for maintenanceType === 5)
  const [oilInventoryItemId, setOilInventoryItemId] = useState("");
  const [oilFilterChanged, setOilFilterChanged] = useState(true);
  const [oilFilterInventoryItemId, setOilFilterInventoryItemId] = useState("");
  const [oilNotes, setOilNotes] = useState("");

  // Error and conflict banner
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Filter locations that allow company vehicles
  const allowedLocations = useMemo(
    () => locations.filter((l) => l.allowsCompanyVehicles),
    [locations],
  );

  // Helper to find the best matching maintenance location based on vehicle location
  const findMatchingLocation = useCallback(
    (v: { operatingCityId?: string | null; operatingCity?: string | null }): string | null => {
      const candidates = allowedLocations.length > 0 ? allowedLocations : locations;
      if (candidates.length === 0) return null;

      // 1. Try matching by operatingCityId
      if (v.operatingCityId) {
        const workshopInCity = candidates.find(
          (l) =>
            l.operatingCityId === v.operatingCityId &&
            (l.locationType === LocationType.Workshop || l.locationType === LocationType.WarehouseAndWorkshop),
        );
        if (workshopInCity) return workshopInCity.id;

        const anyInCity = candidates.find((l) => l.operatingCityId === v.operatingCityId);
        if (anyInCity) return anyInCity.id;
      }

      // 2. Try matching by operatingCity name string
      if (v.operatingCity && v.operatingCity.trim()) {
        const cityName = v.operatingCity.trim().toLowerCase();
        const workshopByName = candidates.find(
          (l) =>
            ((l.operatingCityNameAr && l.operatingCityNameAr.toLowerCase().includes(cityName)) ||
              (l.nameAr && l.nameAr.toLowerCase().includes(cityName))) &&
            (l.locationType === LocationType.Workshop || l.locationType === LocationType.WarehouseAndWorkshop),
        );
        if (workshopByName) return workshopByName.id;

        const anyByName = candidates.find(
          (l) =>
            (l.operatingCityNameAr && l.operatingCityNameAr.toLowerCase().includes(cityName)) ||
            (l.nameAr && l.nameAr.toLowerCase().includes(cityName)),
        );
        if (anyByName) return anyByName.id;
      }

      // 3. Fallback: if only one candidate location exists, pick it
      if (candidates.length === 1) {
        return candidates[0].id;
      }

      return null;
    },
    [allowedLocations, locations],
  );

  const handleVehicleSelect = (selectedId: string) => {
    setVehicleId(selectedId);
    setConflictError(null);
    if (!selectedId) return;

    const foundVehicle = vehicles.find((v) => v.id === selectedId);
    if (foundVehicle) {
      if (foundVehicle.currentOdometer && (!odometerAtOpen || odometerAtOpen === "0")) {
        setOdometerAtOpen(String(foundVehicle.currentOdometer));
      }
      const matchedLocId = findMatchingLocation(foundVehicle);
      if (matchedLocId) {
        setMaintenanceLocationId(matchedLocId);
      }
    }

    getVehicleDetail(selectedId)
      .then((res) => {
        const summary = res?.summary || res;
        if (summary) {
          if (summary.currentOdometer && (!odometerAtOpen || odometerAtOpen === "0")) {
            setOdometerAtOpen(String(summary.currentOdometer));
          }
          const matchedLocId = findMatchingLocation(summary);
          if (matchedLocId) {
            setMaintenanceLocationId(matchedLocId);
          }
        }
      })
      .catch(() => {});
  };

  const handleClose = () => {
    setRequestedLines([]);
    setRequestNotes("");
    setOilInventoryItemId("");
    setOilFilterChanged(true);
    setOilFilterInventoryItemId("");
    setOilNotes("");
    setDiagnosis("");
    setNotes("");
    setOdometerAtOpen("");
    setMaintenanceLocationId("");
    setConflictError(null);
    onClose();
  };

  useEffect(() => {
    let active = true;
    getVehicles({ pageSize: 150 })
      .then((res) => {
        if (active && res?.items) {
          const mappedVehicles: VehicleOption[] = res.items.map((v) => ({
            id: v.id,
            plateNumber: v.plateNumberAr || v.plateNumberEn || "",
            assetNumber: v.assetNumber || "مركبة",
            operatingCityId: v.operatingCityId,
            operatingCity: v.operatingCity,
            currentOdometer: v.currentOdometer,
          }));
          setVehicles(mappedVehicles);

          if (initialVehicleId) {
            const initialVeh = mappedVehicles.find((v) => v.id === initialVehicleId);
            if (initialVeh) {
              const matched = findMatchingLocation(initialVeh);
              if (matched) {
                setMaintenanceLocationId((prev) => prev || matched);
              }
              if (initialVeh.currentOdometer) {
                setOdometerAtOpen((prev) =>
                  !prev || prev === "0" ? String(initialVeh.currentOdometer) : prev,
                );
              }
            }
          }
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
  }, [propItems, initialVehicleId, findMatchingLocation]);

  // Load warehouse stock balances for parts unit cost
  useEffect(() => {
    const effectivePartsLoc =
      getLinkedInventoryLocationId(maintenanceLocationId, locations) ||
      maintenanceLocationId;
    if (!effectivePartsLoc) return;

    let active = true;
    getStockBalances({ inventoryLocationId: effectivePartsLoc })
      .then((data) => {
        if (active && Array.isArray(data)) {
          const map: Record<string, number> = {};
          for (const b of data) {
            if (b.reportingAverageUnitCost > 0) {
              map[b.inventoryItemId] = b.reportingAverageUnitCost;
            }
          }
          setStockBalances(map);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [maintenanceLocationId, locations]);

  // Handle adding a parts line
  const handleAddLine = () => {
    const newId = `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setRequestedLines((prev) => [
      ...prev,
      {
        tempId: newId,
        inventoryItemId: "",
        quantity: 1,
        unitCost: 0,
        maintenanceUsageType: MaterialUsageType.SparePart,
        notes: "",
      },
    ]);
  };

  // Handle line item change
  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = availableItems.find((i) => i.id === itemId);
    const defaultUsageType =
      selectedItem?.itemType === ItemType.Consumable
        ? MaterialUsageType.Consumable
        : MaterialUsageType.SparePart;
    const autoCost = stockBalances[itemId] || 0;

    setRequestedLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        inventoryItemId: itemId,
        maintenanceUsageType: defaultUsageType,
        unitCost: next[index].unitCost ? next[index].unitCost : autoCost,
      };
      return next;
    });
  };

  const handleUpdateLine = <K extends keyof RequestedPartLine>(
    index: number,
    field: K,
    value: RequestedPartLine[K],
  ) => {
    setRequestedLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveLine = (index: number) => {
    setRequestedLines((prev) => prev.filter((_, i) => i !== index));
  };

  const isOilChange = maintenanceType === MaintenanceType.OilChange;

  const totalPartsEstimatedCost = useMemo(() => {
    return requestedLines.reduce((sum, line) => {
      const qty = Number(line.quantity) || 0;
      const cost = Number(line.unitCost) || 0;
      return sum + qty * cost;
    }, 0);
  }, [requestedLines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (!vehicleId) {
      alert("يرجى اختيار مركبة الشركة.");
      return;
    }
    if (!maintenanceLocationId) {
      alert("يرجى اختيار موقع الصيانة أو الورشة.");
      return;
    }

    // Validate based on maintenance type
    if (isOilChange) {
      const effectiveOilLoc =
        getLinkedInventoryLocationId(maintenanceLocationId, locations) ||
        maintenanceLocationId;
      if (!effectiveOilLoc) {
        alert("يرجى اختيار موقع الصيانة أو الورشة أولاً لتحديد مستودع الصرف.");
        return;
      }
      if (!oilInventoryItemId) {
        alert("يرجى اختيار صنف الزيت المطلوب.");
        return;
      }
      if (oilFilterChanged && !oilFilterInventoryItemId) {
        alert("يرجى اختيار صنف فلتر الزيت عند تفعيل خيار تغيير الفلتر.");
        return;
      }
    } else {
      if (requestedLines.length > 0) {
        const effectivePartsLoc =
          getLinkedInventoryLocationId(maintenanceLocationId, locations) ||
          maintenanceLocationId;
        if (!effectivePartsLoc) {
          alert("يرجى اختيار موقع الصيانة أو الورشة أولاً لتحديد مستودع الصرف.");
          return;
        }
        for (let i = 0; i < requestedLines.length; i++) {
          const line = requestedLines[i];
          if (!line.inventoryItemId) {
            alert(`يرجى اختيار الصنف للسطر رقم ${i + 1}.`);
            return;
          }
          if (!line.quantity || Number(line.quantity) <= 0) {
            alert(`يرجى تحديد كمية صحيحة أكبر من الصفر للسطر رقم ${i + 1}.`);
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      if (isOilChange) {
        const effectiveOilLoc =
          getLinkedInventoryLocationId(maintenanceLocationId, locations) ||
          maintenanceLocationId;
        await createCompanyWorkOrder({
          serviceSubjectType: 1,
          vehicleId,
          maintenanceLocationId,
          maintenanceType: 5,
          openedAtUtc: new Date(openedAtUtc).toISOString(),
          odometerAtOpen: odometerAtOpen ? parseInt(odometerAtOpen) : null,
          estimatedCost: 0,
          diagnosis: diagnosis.trim() || "تغيير زيت",
          notes: notes.trim() || null,
          externalVehicle: null,
          supplyRequest: null,
          oilChange: {
            inventoryLocationId: effectiveOilLoc,
            oilInventoryItemId,
            oilFilterChanged,
            oilFilterInventoryItemId: oilFilterChanged ? oilFilterInventoryItemId : null,
            notes: oilNotes.trim() || null,
          },
        });
      } else {
        const effectivePartsLoc =
          getLinkedInventoryLocationId(maintenanceLocationId, locations) ||
          maintenanceLocationId;
        const supplyRequestPayload =
          requestedLines.length > 0
            ? {
                inventoryLocationId: effectivePartsLoc,
                notes: requestNotes.trim() || null,
                lines: requestedLines.map((l) => {
                  const cost = Number(l.unitCost) || 0;
                  const noteParts = [l.notes.trim()];
                  if (cost > 0) {
                    noteParts.push(`تكلفة الوحدة: ${cost.toFixed(2)} ر.س`);
                  }
                  return {
                    inventoryItemId: l.inventoryItemId,
                    quantity: Number(l.quantity),
                    maintenanceUsageType: Number(l.maintenanceUsageType || 1),
                    expectedReturn: false,
                    notes: noteParts.filter(Boolean).join(" - ") || null,
                  };
                }),
              }
            : null;

        await createCompanyWorkOrder({
          serviceSubjectType: 1,
          vehicleId,
          maintenanceLocationId,
          maintenanceType: Number(maintenanceType),
          openedAtUtc: new Date(openedAtUtc).toISOString(),
          odometerAtOpen: odometerAtOpen ? parseInt(odometerAtOpen) : null,
          estimatedCost: totalPartsEstimatedCost,
          diagnosis: diagnosis.trim() || null,
          notes: notes.trim() || null,
          externalVehicle: null,
          supplyRequest: supplyRequestPayload,
          oilChange: null,
        });
      }

      onSaved();
      handleClose();
    } catch (err: any) {
      console.error(err);
      const errCode = err?.details?.errorCode || err?.details?.code;
      if (errCode === "maintenance.active_vehicle_work_order_exists") {
        setConflictError(
          "توجد عملية صيانة نشطة حالياً لهذه المركبة (أمر مفتوح أو قيد العمل أو مكتمل). لا يمكن تقديم أمر جديد لنفس المركبة حتى إغلاق أو إلغاء الأمر الحالي.",
        );
      } else if (errCode === "maintenance.oil_change_request_required") {
        setConflictError("يلزم تعبئة بيانات طلب تغيير الزيت والفلتر في نموذج أمر العمل وإعادة الإرسال.");
      } else if (errCode === "maintenance.invalid_location") {
        setConflictError("موقع المستودع المحدد غير صالح أو غير مرتبط بموقع الصيانة. يرجى اختيار مستودع صالح.");
      } else if (errCode === "maintenance.invalid_inventory_item") {
        setConflictError("صنف المخزون المحدد لم يعد صالحاً لهذا الطلب. تم تحديث قائمة الأصناف.");
        getInventoryItems()
          .then((d) => setFetchedItems(d))
          .catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter items for maintenance (exclude oil items, focus on spare parts and consumables)
  const maintenanceItems = useMemo(
    () =>
      availableItems.filter(
        (i) => i.itemType === ItemType.SparePart || i.itemType === ItemType.Consumable,
      ),
    [availableItems],
  );

  // Filter oil items for oil change
  const oilItems = useMemo(
    () => availableItems.filter((i) => i.itemType === ItemType.Oil),
    [availableItems],
  );

  // Filter oil filter items
  const oilFilterItems = useMemo(() => {
    const filters = availableItems.filter(
      (i) =>
        i.itemType === ItemType.SparePart &&
        (i.nameAr.includes("فلتر") ||
          i.nameAr.includes("صفاية") ||
          (i.nameEn && i.nameEn.toLowerCase().includes("filter")) ||
          (i.sku && i.sku.toLowerCase().includes("flt"))),
    );
    return filters.length > 0
      ? filters
      : availableItems.filter((i) => i.itemType === ItemType.SparePart);
  }, [availableItems]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="إنشاء أمر صيانة لمركبة شركة"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {conflictError && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <div className="flex-1 font-bold">{conflictError}</div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              مركبة الشركة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={vehicleId}
              onChange={handleVehicleSelect}
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.assetNumber} - لوحة: ${v.plateNumber}`,
                sublabel: v.operatingCity ? `المدينة: ${v.operatingCity}` : undefined,
                keywords: `${v.assetNumber} ${v.plateNumber} ${v.operatingCity || ""}`,
              }))}
              placeholder="اختر المركبة من الأسطول..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              موقع الصيانة / الورشة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={maintenanceLocationId}
              onChange={(val) => setMaintenanceLocationId(val)}
              options={allowedLocations.map((l) => ({
                value: l.id,
                label: `${l.nameAr} (${l.code})`,
                sublabel: l.operatingCityNameAr ? `المدينة: ${l.operatingCityNameAr}` : undefined,
                keywords: `${l.nameAr} ${l.code} ${l.operatingCityNameAr || ""}`,
              }))}
              placeholder="اختر موقع الصيانة..."
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              نوع الصيانة <span className="text-red-500">*</span>
            </label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(Number(e.target.value) as MaintenanceType)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-bold focus:outline-hidden"
              required
            >
              {Object.entries(maintenanceTypeLabels)
                .filter(([k]) => Number(k) !== 6) // Exclude PartSaleOnly for company vehicles
                .map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              قراءة العداد عند الدخول (كم) {isOilChange && <span className="text-amber-500">*</span>}
            </label>
            <Input
              type="number"
              min="0"
              value={odometerAtOpen}
              onChange={(e) => setOdometerAtOpen(e.target.value)}
              placeholder="قراءة العداد الحالية"
              required={isOilChange}
              className="text-xs font-mono"
            />
            {isOilChange && (
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                تُعتمد هذه القراءة لحساب دورة الزيت القادمة وتحديث جدول الصيانة.
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            وصف العطل / التشخيص المبدئي
          </label>
          <Input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder={isOilChange ? "تغيير زيت وفلتر دوري" : "مثال: صوت طقطقة في المكابح الأمامية..."}
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            ملاحظات أمر الصيانة
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي تفاصيل أو متطلبات فحص خاصة..."
            className="text-xs"
          />
        </div>

        {/* Section: Oil Change (maintenanceType === 5) */}
        {isOilChange && (
          <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
              <Droplets size={16} className="text-amber-600" />
              <span>بيانات طلب تغيير الزيت من المستودع (Oil Change Request)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              سيتم إرسال طلب صرف الزيت والفلتر آلياً إلى طابور المستودع. يتم حساب كمية الزيت المقررة للسيارة والخصم التلقائي بواسطة المستودع عند الاعتماد الفعلي.
            </p>

            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                صنف الزيت المطلوب <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={oilInventoryItemId}
                onChange={(val) => setOilInventoryItemId(val)}
                options={oilItems.map((item) => ({
                  value: item.id,
                  label: `${item.nameAr} (${item.sku})`,
                  sublabel: `SKU: ${item.sku}`,
                }))}
                placeholder="اختر صنف الزيت..."
                required
              />
            </div>

            <div className="p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-white/70 dark:bg-slate-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={oilFilterChanged}
                    onChange={(e) => setOilFilterChanged(e.target.checked)}
                    className="size-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>تغيير فلتر الزيت (السيفون)</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  {oilFilterChanged ? "سيتم طلب فلتر جديد مع الزيت" : "تغيير زيت فقط بدون فلتر"}
                </span>
              </div>

              {oilFilterChanged && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    صنف فلتر الزيت <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={oilFilterInventoryItemId}
                    onChange={(val) => setOilFilterInventoryItemId(val)}
                    options={oilFilterItems.map((item) => ({
                      value: item.id,
                      label: `${item.nameAr} (${item.sku})`,
                      sublabel: `SKU: ${item.sku}`,
                    }))}
                    placeholder="اختر فلتر الزيت المناسب..."
                    required={oilFilterChanged}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات طلب تغيير الزيت (اختياري)
              </label>
              <Input
                value={oilNotes}
                onChange={(e) => setOilNotes(e.target.value)}
                placeholder="ملاحظات لأمين المستودع حول الزيت أو الفلتر..."
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* Section: Parts requested from warehouse (Omitted for Oil Change work orders) */}
        {!isOilChange && (
          <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
                <PackagePlus size={16} className="text-[#1167c9]" />
                <span>قطع الغيار والمواد المطلوبة من المستودع (Parts requested from warehouse)</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddLine}
                className="text-xs h-7 px-2.5"
              >
                <Plus size={13} />
                إضافة قطعة / مادة
              </Button>
            </div>

            <p className="text-[11px] text-slate-500">
              يتم إرسال طلب الصرف إلى أمين المستودع للاعتماد والتسليم الفعلي. لن يتم خصم المخزون محلياً أو بدء أمر الصيانة حتى يتم اعتماد الصرف.
            </p>

            {requestedLines.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات طلب الصرف (اختياري)
                  </label>
                  <Input
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="ملاحظات لأمين المستودع حول القطع المطلوبة..."
                    className="text-xs"
                  />
                </div>

                {/* Lines Table */}
                <div className="space-y-2">
                  {requestedLines.map((line, idx) => (
                    <div
                      key={line.tempId}
                      className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          الصنف المطلوب <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          value={line.inventoryItemId}
                          onChange={(val) => handleItemSelect(idx, val)}
                          options={maintenanceItems.map((item) => ({
                            value: item.id,
                            label: `${item.nameAr} (${item.sku})`,
                            sublabel: `SKU: ${item.sku}`,
                          }))}
                          placeholder="اختر الصنف..."
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

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          تكلفة الوحدة
                        </label>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] font-mono font-bold text-slate-700 dark:text-slate-300 text-xs text-left">
                          {formatCurrency(line.unitCost || 0)}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">نوع الاستخدام</label>
                        <select
                          value={line.maintenanceUsageType}
                          onChange={(e) =>
                            handleUpdateLine(idx, "maintenanceUsageType", Number(e.target.value))
                          }
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-xs font-bold focus:outline-hidden"
                        >
                          <option value={MaterialUsageType.SparePart}>قطعة غيار (1)</option>
                          <option value={MaterialUsageType.Consumable}>مستهلكات (4)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 text-left">
                        <label className="block text-[10px] text-slate-400 mb-0.5">إجمالي السطر</label>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatCurrency((Number(line.quantity) || 1) * (Number(line.unitCost) || 0))}
                        </div>
                      </div>

                      <div className="sm:col-span-11">
                        <Input
                          value={line.notes}
                          onChange={(e) => handleUpdateLine(idx, "notes", e.target.value)}
                          placeholder="ملاحظة السطر أو موقع التركيب (اختياري)..."
                          className="text-xs"
                        />
                      </div>

                      <div className="sm:col-span-1 text-center">
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

                {/* Total Parts Cost Summary Ribbon */}
                <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-white/80 dark:bg-slate-900/60 flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    إجمالي تكلفة قطع الغيار والمواد التقديرية:
                  </span>
                  <span className="text-sm font-black font-mono text-[#1167c9] dark:text-blue-400">
                    {formatCurrency(totalPartsEstimatedCost)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            إنشاء أمر الصيانة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
