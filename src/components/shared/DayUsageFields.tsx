"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info, Activity } from "lucide-react";
import type { PlatformAccountDayUsageInput } from "@/lib/platforms/day-usage-types";

interface DayUsageFieldsProps {
  value?: PlatformAccountDayUsageInput | null;
  onChange: (val: PlatformAccountDayUsageInput | null) => void;
  platform?: "generic" | "ninja" | "chefz" | "jahez";
  defaultOpen?: boolean;
  riderName?: string | null;
  effectiveDate?: string | null;
}

export function DayUsageFields({
  value,
  onChange,
  platform = "generic",
  defaultOpen = false,
  riderName,
  effectiveDate,
}: DayUsageFieldsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const current = value || {};

  const handleFieldChange = (field: keyof PlatformAccountDayUsageInput, rawValue: string) => {
    let nextValue: number | null = null;
    const trimmed = rawValue.trim();

    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed)) {
        nextValue = parsed;
      }
    }

    const updated: PlatformAccountDayUsageInput = {
      ...current,
      [field]: nextValue,
    };

    // Check if all fields are null or undefined
    const hasAnyValue = Object.values(updated).some((v) => v !== null && v !== undefined);
    onChange(hasAnyValue ? updated : null);
  };

  const isNinja = platform === "ninja";
  const isChefz = platform === "chefz";
  const isJahez = platform === "jahez";

  const hasEnteredData = Object.values(current).some((v) => v !== null && v !== undefined);

  const getVisibleFields = (): (keyof PlatformAccountDayUsageInput)[] => {
    const fields: (keyof PlatformAccountDayUsageInput)[] = ["ordersCount"];
    if (!isJahez || (current.workingHours !== undefined && current.workingHours !== null)) {
      fields.push("workingHours");
    }
    if (
      (!isChefz && !isJahez) ||
      isNinja ||
      (current.collectedAmount !== undefined && current.collectedAmount !== null)
    ) {
      fields.push("collectedAmount");
    }
    if (
      (!isChefz && !isJahez) ||
      isNinja ||
      (current.deductionsAmount !== undefined && current.deductionsAmount !== null)
    ) {
      fields.push("deductionsAmount");
    }
    if (
      isChefz ||
      platform === "generic" ||
      current.totalValidOffers !== undefined ||
      current.declinedOffers !== undefined ||
      current.missedOffers !== undefined
    ) {
      fields.push("totalValidOffers", "declinedOffers", "missedOffers");
    }
    return fields;
  };

  const visibleFields = getVisibleFields();
  const isAllZero =
    visibleFields.length > 0 &&
    hasEnteredData &&
    visibleFields.every((f) => current[f] === 0);

  const handleToggleAllZero = (checked: boolean) => {
    if (checked) {
      const updated: PlatformAccountDayUsageInput = { ...current };
      for (const f of visibleFields) {
        updated[f] = 0;
      }
      onChange(updated);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3 transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-right text-xs font-bold text-[var(--foreground)]"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span>
            تسجيل إنتاجية المندوب ليوم الإرجاع (Day Usage)
            {hasEnteredData && (
              <span className="mr-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                تم تسجيل قيم
              </span>
            )}
          </span>
          <span className="text-[10px] font-normal text-[var(--muted)]">(اختياري)</span>
        </div>
        <div className="flex items-center gap-1 text-[var(--muted)]">
          <span className="text-[11px]">{isOpen ? "طي الحقول" : "توسيع"}</span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3 pt-2 border-t border-[var(--border)] text-xs">
          <div className="flex items-start gap-2 rounded-lg bg-blue-50/70 p-2.5 text-[11px] text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900/50">
            <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p>
                سجل حصة المندوب المغادر{" "}
                {riderName ? <strong>({riderName})</strong> : ""} في تاريخ الإرجاع{" "}
                {effectiveDate ? <strong>({effectiveDate})</strong> : ""}. الأرقام تخص عمل هذا المندوب فقط في هذا اليوم وليست عداداً تراكمياً للحساب.
              </p>
              <p className="text-[10.5px] text-blue-700 dark:text-blue-300">
                <strong>تنبيه:</strong> اترك الحقل فارغاً إذا كانت القيمة غير معلومة، واكتب <strong>0</strong> إذا كانت القيمة المؤكدة صفراً.
              </p>
            </div>
          </div>

          {/* Zero-All Checkbox Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--background)] px-3 py-2 border border-[var(--border)]">
            <label
              htmlFor="day-usage-rider-all-zero"
              className="inline-flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id="day-usage-rider-all-zero"
                checked={isAllZero}
                onChange={(e) => handleToggleAllZero(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer accent-purple-600"
              />
              <span className="text-xs font-bold text-[var(--foreground)]">
                تصفير جميع قيم هذا المندوب (All at zero)
              </span>
              <span className="text-[11px] text-[var(--muted)] hidden sm:inline">
                (تعيين كافة الحقول كأصفار مؤكدة 0)
              </span>
            </label>

            {hasEnteredData && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[10.5px] font-semibold text-[var(--muted)] hover:text-rose-600 underline"
              >
                مسح وتفريغ الحقول (تركها فارغة / مجهولة)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Orders Count */}
            <div>
              <label className="mb-1 block font-bold text-[var(--foreground)]">
                {isChefz ? "الطلبات المقبولة (Accepted Orders)" : "عدد الطلبات (Orders Count)"}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="اتركه فارغاً إذا كان مجهولاً"
                value={current.ordersCount !== undefined && current.ordersCount !== null ? current.ordersCount : ""}
                onChange={(e) => handleFieldChange("ordersCount", e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
              />
            </div>

            {/* Working Hours */}
            {(!isJahez || (current.workingHours !== undefined && current.workingHours !== null)) && (
              <div>
                <label className="mb-1 block font-bold text-[var(--foreground)]">
                  ساعات العمل (Working Hours)
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="any"
                  placeholder="0 إلى 24 (حتى 8 خانات عشرية)"
                  value={current.workingHours !== undefined && current.workingHours !== null ? current.workingHours : ""}
                  onChange={(e) => handleFieldChange("workingHours", e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
                />
              </div>
            )}

            {/* Collected Amount */}
            {((!isChefz && !isJahez) || isNinja || (current.collectedAmount !== undefined && current.collectedAmount !== null)) && (
              <div>
                <label className="mb-1 block font-bold text-[var(--foreground)]">
                  المبالغ المحصلة كاش (Collected Amount)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00 ر.س"
                  value={current.collectedAmount !== undefined && current.collectedAmount !== null ? current.collectedAmount : ""}
                  onChange={(e) => handleFieldChange("collectedAmount", e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
                />
              </div>
            )}

            {/* Deductions Amount */}
            {((!isChefz && !isJahez) || isNinja || (current.deductionsAmount !== undefined && current.deductionsAmount !== null)) && (
              <div>
                <label className="mb-1 block font-bold text-[var(--foreground)]">
                  الخصومات / الاستقطاعات (Deductions Amount)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="يمكن إدخال قيمة سالبة أو موجبة"
                  value={current.deductionsAmount !== undefined && current.deductionsAmount !== null ? current.deductionsAmount : ""}
                  onChange={(e) => handleFieldChange("deductionsAmount", e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
                />
              </div>
            )}

            {/* Chefz Specific Offer/Order Metrics */}
            {(isChefz || platform === "generic" || current.totalValidOffers !== undefined || current.declinedOffers !== undefined || current.missedOffers !== undefined) && (
              <>
                <div>
                  <label className="mb-1 block font-bold text-[var(--foreground)]">
                    إجمالي العروض الصالحة (Total Valid Offers)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="اتركه فارغاً إذا كان مجهولاً"
                    value={current.totalValidOffers !== undefined && current.totalValidOffers !== null ? current.totalValidOffers : ""}
                    onChange={(e) => handleFieldChange("totalValidOffers", e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-[var(--foreground)]">
                    العروض المرفوضة (Declined Offers)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="اتركه فارغاً إذا كان مجهولاً"
                    value={current.declinedOffers !== undefined && current.declinedOffers !== null ? current.declinedOffers : ""}
                    onChange={(e) => handleFieldChange("declinedOffers", e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-[var(--foreground)]">
                    العروض الفائتة (Missed Offers)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="اتركه فارغاً إذا كان مجهولاً"
                    value={current.missedOffers !== undefined && current.missedOffers !== null ? current.missedOffers : ""}
                    onChange={(e) => handleFieldChange("missedOffers", e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
