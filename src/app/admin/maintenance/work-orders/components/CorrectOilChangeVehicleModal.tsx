"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeftRight,
  Car,
  Bike,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Clock,
  ShieldCheck,
  Check,
  Copy,
  Info,
  Calendar,
  Layers,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { correctOilChangeVehicle, getVehicleOilChanges } from "@/lib/maintenance/api";
import { getAuditEntries } from "@/lib/audit/api";
import { getAllVehicles } from "@/lib/fleet/api";
import type { VehicleSummaryResponse } from "@/lib/fleet/types";
import type { CompleteOilChangeResult } from "@/lib/maintenance/types";

export interface CorrectOilChangeVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result?: CompleteOilChangeResult) => void;
  oilChangeId?: string | null;
  currentVehicleId?: string | null;
  currentVehiclePlate?: string | null;
  currentVehicleType?: number | null; // 1 = Motorcycle, 2 = Car
}

const DEFAULT_REASON = "تصحيح اختيار المركبة بالخطأ أثناء تسجيل عملية تغيير الزيت";

export function CorrectOilChangeVehicleModal({
  isOpen,
  onClose,
  onSuccess,
  oilChangeId,
  currentVehicleId,
  currentVehiclePlate,
  currentVehicleType,
}: CorrectOilChangeVehicleModalProps) {
  // Current / Wrong vehicle selection
  const [sourceVehicleId, setSourceVehicleId] = useState<string>("");
  // Oil change ID (resolved from vehicle or passed as prop)
  const [targetOilChangeId, setTargetOilChangeId] = useState<string>("");
  // Oil changes list for source vehicle
  const [availableOilChanges, setAvailableOilChanges] = useState<CompleteOilChangeResult[]>([]);
  const [loadingOilChanges, setLoadingOilChanges] = useState<boolean>(false);
  // Manual ID toggle if user wants to override
  const [showManualIdInput, setShowManualIdInput] = useState<boolean>(false);

  // Replacement vehicle state
  const [replacementVehicleId, setReplacementVehicleId] = useState<string>("");
  const [vehicleType, setVehicleType] = useState<number>(currentVehicleType ?? 2);

  // Reason (with default)
  const [reason, setReason] = useState<string>(DEFAULT_REASON);

  // All vehicles catalog
  const [vehicles, setVehicles] = useState<VehicleSummaryResponse[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Reset and sync state when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const initVehicleId = currentVehicleId || "";
      setSourceVehicleId(initVehicleId);
      setTargetOilChangeId(oilChangeId || "");
      setVehicleType(currentVehicleType ?? 2);
      setReplacementVehicleId("");
      setReason(DEFAULT_REASON);
      setShowManualIdInput(!oilChangeId && !currentVehicleId ? false : Boolean(oilChangeId && !currentVehicleId));
      setAvailableOilChanges([]);
      setCopiedId(false);
    }
  }, [isOpen, oilChangeId, currentVehicleId, currentVehicleType]);

  // Load vehicles list on modal open
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadingVehicles(true);

    getAllVehicles()
      .then((data) => {
        if (!cancelled) {
          setVehicles(data || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load vehicles for correction:", err);
        if (!cancelled) {
          toast.error("تعذر تحميل قائمة المركبات", "يرجى إعادة المحاولة.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingVehicles(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // When source vehicle changes, auto-resolve vehicle type and fetch oil change(s)
  useEffect(() => {
    if (!isOpen || !sourceVehicleId) return;

    const sourceVeh = vehicles.find((v) => v.id === sourceVehicleId);
    if (sourceVeh) {
      setVehicleType(Number(sourceVeh.vehicleType));
    }

    // If an oilChangeId was already passed as prop and matches this vehicle, retain it
    if (oilChangeId && sourceVehicleId === currentVehicleId) {
      setTargetOilChangeId(oilChangeId);
      return;
    }

    let cancelled = false;
    setLoadingOilChanges(true);

    const resolveOilChange = async () => {
      try {
        // 1. Try fetching vehicle's oil changes endpoint
        const changes = await getVehicleOilChanges(sourceVehicleId);
        if (cancelled) return;

        if (changes.length > 0) {
          setAvailableOilChanges(changes);
          setTargetOilChangeId(changes[0].id);
          return;
        }

        // 2. Fallback: Search audit log for recent OilChangeOperation for this vehicle
        const auditRes = await getAuditEntries({
          entityType: "OilChangeOperation",
          pageSize: 50,
        });
        if (cancelled) return;

        const matchedEntry = (auditRes?.items || []).find((entry) => {
          if (entry.entityId === targetOilChangeId) return true;
          const raw = JSON.stringify(entry);
          return raw.includes(sourceVehicleId);
        });

        if (matchedEntry && matchedEntry.entityId) {
          setTargetOilChangeId(matchedEntry.entityId);
          setAvailableOilChanges([
            {
              id: matchedEntry.entityId,
              maintenanceWorkOrderId: null,
              performedAtUtc: matchedEntry.occurredAtUtc,
              odometerAtChange: sourceVeh?.currentOdometer ?? 0,
              vehicleType: sourceVeh?.vehicleType ?? 2,
              oilQuantityLiters: 0,
              oilCost: 0,
              oilFilterChanged: false,
              oilFilterCost: 0,
              laborCost: 0,
              otherCost: 0,
              totalCost: 0,
              vehicleId: sourceVehicleId,
              riderProfileId: null,
            },
          ]);
        } else {
          setAvailableOilChanges([]);
          if (!targetOilChangeId) {
            setTargetOilChangeId("");
          }
        }
      } catch (err) {
        console.warn("Could not auto-resolve oil change for vehicle:", err);
      } finally {
        if (!cancelled) {
          setLoadingOilChanges(false);
        }
      }
    };

    resolveOilChange();

    return () => {
      cancelled = true;
    };
  }, [isOpen, sourceVehicleId, vehicles, currentVehicleId, oilChangeId]);

  // Options for selecting the source (current / wrong) vehicle
  const sourceVehicleOptions: SelectOption[] = useMemo(() => {
    return vehicles.map((v) => {
      const plate = v.plateNumberAr || v.plateNumberEn || "بدون لوحة";
      const asset = v.assetNumber ? ` • أصل #${v.assetNumber}` : "";
      const typeLabel = Number(v.vehicleType) === 1 ? "دراجة نارية" : "سيارة";
      const model = [v.manufacturer, v.model].filter(Boolean).join(" ");
      const odo = v.currentOdometer != null ? ` • العداد: ${Number(v.currentOdometer).toLocaleString()} كم` : "";

      return {
        value: v.id,
        label: `${plate}${asset} (${typeLabel})`,
        sublabel: `${model ? `${model} • ` : ""}${typeLabel}${odo}`,
        keywords: `${v.plateNumberAr || ""} ${v.plateNumberEn || ""} ${v.assetNumber || ""} ${v.serialNumber || ""} ${model} ${typeLabel}`,
      };
    });
  }, [vehicles]);

  // Options for selecting the replacement vehicle (MUST match the source vehicle's type and not be the same vehicle)
  const replacementVehicleOptions: SelectOption[] = useMemo(() => {
    return vehicles
      .filter((v) => {
        const matchesType = Number(v.vehicleType) === Number(vehicleType);
        const isNotSource = sourceVehicleId ? v.id !== sourceVehicleId : true;
        return matchesType && isNotSource;
      })
      .map((v) => {
        const plate = v.plateNumberAr || v.plateNumberEn || "بدون لوحة";
        const asset = v.assetNumber ? ` • أصل #${v.assetNumber}` : "";
        const model = [v.manufacturer, v.model].filter(Boolean).join(" ");
        const odo = v.currentOdometer != null ? ` • العداد: ${Number(v.currentOdometer).toLocaleString()} كم` : "";

        return {
          value: v.id,
          label: `${plate}${asset}`,
          sublabel: `${model ? `${model} • ` : ""}${odo}`,
          keywords: `${v.plateNumberAr || ""} ${v.plateNumberEn || ""} ${v.assetNumber || ""} ${v.serialNumber || ""} ${model}`,
        };
      });
  }, [vehicles, vehicleType, sourceVehicleId]);

  const selectedSourceVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === sourceVehicleId) || null;
  }, [vehicles, sourceVehicleId]);

  const selectedReplacementVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === replacementVehicleId) || null;
  }, [vehicles, replacementVehicleId]);

  const handleCopyId = () => {
    if (!targetOilChangeId) return;
    navigator.clipboard.writeText(targetOilChangeId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanId = targetOilChangeId.trim();
    const cleanReason = reason.trim();

    if (!cleanId) {
      toast.error(
        "معرف العملية غير محدد",
        "يرجى اختيار مركبة تحتوي على عملية غيار زيت مسجلة، أو إدخال معرّف العملية يدوياً.",
      );
      return;
    }

    if (!replacementVehicleId) {
      toast.error("بيانات ناقصة", "يرجى اختيار المركبة البديلة المستهدفة.");
      return;
    }

    if (sourceVehicleId && replacementVehicleId === sourceVehicleId) {
      toast.error("مركبة غير صالحة", "لا يمكن استبدال المركبة بنفس المركبة الحالية.");
      return;
    }

    if (!cleanReason) {
      toast.error("سبب التصحيح مطلوب", "يرجى كتابة سبب تصحيح المركبة لتوثيقه في سجل التدقيق.");
      return;
    }

    if (cleanReason.length < 5) {
      toast.error("سبب غير كافٍ", "يرجى تقديم سبب واضح ومفصل لعملية التصحيح (5 أحرف على الأقل).");
      return;
    }

    setSubmitting(true);
    try {
      const result = await correctOilChangeVehicle(cleanId, {
        vehicleId: replacementVehicleId,
        reason: cleanReason,
      });

      toast.success(
        "تم تصحيح المركبة بنجاح",
        "تم تحديث استهلاك البراميل المرتبط وقراءة العداد وتكاليف التشغيل وتذكيرات الصيانة بنجاح.",
      );

      onSuccess?.(result);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to correct oil change vehicle:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isCar = vehicleType === 2;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تصحيح المركبة لعملية غيار زيت مكتملة / Correct Oil Change Vehicle"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-right" dir="rtl">
        {/* Informational Guidance Banner */}
        <div className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-2 leading-relaxed">
          <div className="flex items-center gap-2 font-black text-amber-950 dark:text-amber-100 text-sm">
            <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>تصحيح خطأ اختيار المركبة في معاملة واحدة</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300">
            اختر المركبة التي تم تسجيل غيار الزيت لها بالخطأ، ثم اختر المركبة البديلة الصحيحة من نفس
            النوع. سيقوم النظام بنقل استهلاك البرميل وقراءة العداد والمصاريف وتحديث جدول التذكيرات
            وتوثيق سبب التصحيح في سجل التدقيق (Audit Log).
          </p>
        </div>

        {/* 1. Current / Wrong Vehicle Selection (Dropdown from Vehicles) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              المركبة الحالية (التي تم تغيير الزيت لها بالخطأ) <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowManualIdInput(!showManualIdInput)}
              className="text-[11px] font-bold text-[#1167c9] hover:underline"
            >
              {showManualIdInput ? "إخفاء معرّف العملية اليدوي" : "أو إدخال معرّف العملية يدوياً"}
            </button>
          </div>

          <SearchableSelect
            value={sourceVehicleId}
            onChange={(val) => {
              setSourceVehicleId(val);
              setReplacementVehicleId("");
            }}
            options={sourceVehicleOptions}
            placeholder={
              loadingVehicles
                ? "جارٍ تحميل قائمة المركبات..."
                : "ابحث باللوحة أو رقم الأصل لاختيار المركبة..."
            }
            searchPlaceholder="بحث برقم اللوحة، الأصل، الطراز..."
            disabled={loadingVehicles || submitting}
            required={!targetOilChangeId}
          />

          {/* Selected Source Vehicle Details & Resolved Oil Change */}
          {selectedSourceVehicle && (
            <div className="mt-2.5 space-y-2">
              <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                    {Number(selectedSourceVehicle.vehicleType) === 1 ? <Bike size={16} /> : <Car size={16} />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {selectedSourceVehicle.plateNumberAr || selectedSourceVehicle.plateNumberEn || "بدون لوحة"}
                      {selectedSourceVehicle.assetNumber ? ` • أصل #${selectedSourceVehicle.assetNumber}` : ""}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      النوع: {Number(selectedSourceVehicle.vehicleType) === 1 ? "دراجة نارية" : "سيارة"} •
                      العداد: {Number(selectedSourceVehicle.currentOdometer ?? 0).toLocaleString()} كم
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  خاطئة / استبدال
                </span>
              </div>

              {/* Resolved Oil Change info card */}
              {loadingOilChanges ? (
                <div className="p-2.5 text-center text-xs text-slate-400 border border-dashed border-[var(--border)] rounded-xl">
                  جارٍ استرجاع عملية غيار الزيت للمركبة...
                </div>
              ) : availableOilChanges.length > 1 ? (
                <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 text-xs space-y-1.5">
                  <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-200">
                    تم العثور على أكثر من عملية غيار زيت، اختر العملية المراد تصحيحها:
                  </label>
                  <select
                    value={targetOilChangeId}
                    onChange={(e) => setTargetOilChangeId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-xs font-bold"
                  >
                    {availableOilChanges.map((oc) => (
                      <option key={oc.id} value={oc.id}>
                        {oc.performedAtUtc ? new Date(oc.performedAtUtc).toLocaleDateString("ar-SA") : "عملية"} • عداد: {oc.odometerAtChange?.toLocaleString() ?? 0} كم • كمية: {oc.oilQuantityLiters}L • ({oc.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
              ) : targetOilChangeId ? (
                <div className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold block">عملية غيار الزيت المحددة جاهزة للتصحيح</span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                        المعرف: {targetOilChangeId}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 rounded text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[11px] font-bold flex items-center gap-1"
                    title="نسخ المعرف"
                  >
                    {copiedId ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedId ? "تم النسخ" : "نسخ"}</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                    <span>لم يتم استرجاع معرّف العملية تلقائياً، يمكنك كتابته يدوياً أدناه.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualIdInput(true)}
                    className="font-bold underline text-[11px]"
                  >
                    إدخال المعرف
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Oil Change ID Input (Optional / Expandable or when prefilled without vehicle) */}
        {(showManualIdInput || (!sourceVehicleId && targetOilChangeId)) && (
          <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              معرّف عملية غيار الزيت (Oil Change ID) <span className="text-rose-500">*</span>
            </label>
            <Input
              value={targetOilChangeId}
              onChange={(e) => setTargetOilChangeId(e.target.value)}
              placeholder="مثال: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              className="font-mono text-xs"
            />
            <span className="text-[10px] text-slate-400 block">
              معرّف العملية المطلوب تصحيحها كما هو مسجل في قاعدة البيانات أو سجل التدقيق.
            </span>
          </div>
        )}

        {/* 2. Replacement Vehicle (Filtered to Same Vehicle Type) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              المركبة البديلة الصحيحة (Replacement Vehicle) <span className="text-rose-500">*</span>
            </label>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {isCar ? <Car size={13} /> : <Bike size={13} />}
              <span>حصر النوع: {isCar ? "سيارة" : "دراجة نارية"}</span>
            </span>
          </div>

          <SearchableSelect
            value={replacementVehicleId}
            onChange={(val) => setReplacementVehicleId(val)}
            options={replacementVehicleOptions}
            placeholder={
              loadingVehicles
                ? "جارٍ تحميل المركبات..."
                : replacementVehicleOptions.length === 0
                  ? `لا توجد مركبات بديلة متاحة من نوع (${isCar ? "سيارة" : "دراجة نارية"})`
                  : "اختر المركبة البديلة باللوحة أو رقم الأصل..."
            }
            searchPlaceholder="بحث برقم اللوحة، الأصل، الطراز..."
            disabled={loadingVehicles || submitting}
            required
          />

          {selectedReplacementVehicle && (
            <div className="mt-2.5 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>
                  تم اختيار البديل: {selectedReplacementVehicle.plateNumberAr || selectedReplacementVehicle.plateNumberEn || "بدون لوحة"}
                  {selectedReplacementVehicle.assetNumber ? ` (أصل #${selectedReplacementVehicle.assetNumber})` : ""}
                </span>
              </div>
              <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                العداد: {Number(selectedReplacementVehicle.currentOdometer ?? 0).toLocaleString()} كم
              </span>
            </div>
          )}
        </div>

        {/* 3. Reason for Correction (With Default Value) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              سبب التصحيح وتوثيق التدقيق (Reason) <span className="text-rose-500">*</span>
            </label>
            {reason !== DEFAULT_REASON && (
              <button
                type="button"
                onClick={() => setReason(DEFAULT_REASON)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
              >
                استعادة السبب الافتراضي
              </button>
            )}
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            required
            placeholder={DEFAULT_REASON}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed outline-none focus:border-[#1167c9] focus:ring-1 focus:ring-[#1167c9] dark:text-white"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">
            تم وضع سبب افتراضي تلقائياً. سيتم حفظ هذا السبب في سجل التدقيق (Audit Log).
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            إلغاء
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={
              submitting ||
              loadingVehicles ||
              !targetOilChangeId.trim() ||
              !replacementVehicleId ||
              !reason.trim()
            }
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            <ArrowLeftRight size={14} />
            <span>تأكيد وتصحيح المركبة</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
