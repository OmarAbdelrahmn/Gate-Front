"use client";

import React, { useState, useEffect, useId } from "react";
import {
  HIJRI_MONTHS,
  gregorianToHijri,
  hijriToGregorian,
  formatHijriDate,
} from "@/lib/date/hijri";
import { Calendar } from "lucide-react";

export interface DualCalendarDateInputProps {
  name: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (gregorianDateStr: string) => void;
  required?: boolean;
  locale?: "ar" | "en";
  className?: string;
  disabled?: boolean;
}

export function DualCalendarDateInput({
  name,
  label,
  value: controlledValue,
  defaultValue,
  onChange,
  required = false,
  locale = "ar",
  className = "",
  disabled = false,
}: DualCalendarDateInputProps) {
  const isEn = locale === "en";
  const uniqueId = useId();

  // Internal Gregorian state (YYYY-MM-DD)
  const [gregorianDate, setGregorianDate] = useState<string>(() => {
    return (controlledValue !== undefined ? controlledValue : defaultValue) || "";
  });

  // Hijri mode checkbox state
  const [isHijri, setIsHijri] = useState<boolean>(false);

  // Hijri components (Year, Month, Day)
  const [hijriParts, setHijriParts] = useState<{ year: number; month: number; day: number }>(() => {
    const initG = controlledValue || defaultValue;
    if (initG && initG.length >= 10) {
      return gregorianToHijri(initG);
    }
    return gregorianToHijri(new Date());
  });

  // Sync if controlled value changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setGregorianDate(controlledValue || "");
      if (controlledValue && controlledValue.length >= 10) {
        setHijriParts(gregorianToHijri(controlledValue));
      }
    }
  }, [controlledValue]);

  // Handle Gregorian date change
  const handleGregorianChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setGregorianDate(newVal);
    onChange?.(newVal);
    if (newVal && newVal.length >= 10) {
      setHijriParts(gregorianToHijri(newVal));
    }
  };

  // Handle Hijri toggle
  const handleToggleHijri = (checked: boolean) => {
    setIsHijri(checked);
    if (checked) {
      // If we have an existing Gregorian date, ensure Hijri parts are synced
      if (gregorianDate && gregorianDate.length >= 10) {
        const h = gregorianToHijri(gregorianDate);
        setHijriParts(h);
      } else {
        // Default to today converted
        const todayH = gregorianToHijri(new Date());
        setHijriParts(todayH);
        const computedG = hijriToGregorian(todayH.year, todayH.month, todayH.day);
        setGregorianDate(computedG);
        onChange?.(computedG);
      }
    } else {
      // Switched back to Gregorian: recalculate Gregorian date from Hijri parts
      const computedG = hijriToGregorian(hijriParts.year, hijriParts.month, hijriParts.day);
      setGregorianDate(computedG);
      onChange?.(computedG);
    }
  };

  // Update Hijri part
  const updateHijri = (field: "year" | "month" | "day", val: number) => {
    const updated = { ...hijriParts, [field]: val };
    setHijriParts(updated);
    const computedG = hijriToGregorian(updated.year, updated.month, updated.day);
    setGregorianDate(computedG);
    onChange?.(computedG);
  };

  // Helper arrays for selects
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const currentHijriYear = gregorianToHijri(new Date()).year;
  const years = Array.from({ length: 35 }, (_, i) => currentHijriYear - 5 + i);

  return (
    <div className="space-y-1.5 text-xs">
      {/* Header with Label and Hijri Checkbox */}
      <div className="flex items-center justify-between gap-2">
        {label && (
          <label
            htmlFor={uniqueId}
            className="block font-bold text-[var(--foreground)] cursor-pointer select-none"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        {/* Hijri Checkbox Toggle */}
        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none rounded-lg bg-blue-50/80 px-2 py-0.5 text-[11px] font-bold text-[#1167c9] border border-blue-200/80 hover:bg-blue-100 transition-colors">
          <input
            type="checkbox"
            checked={isHijri}
            onChange={(e) => handleToggleHijri(e.target.checked)}
            disabled={disabled}
            className="size-3.5 rounded border-slate-300 text-[#1167c9] focus:ring-[#1167c9] cursor-pointer"
          />
          <span>{isEn ? "Hijri Date (هجري)" : "تاريخ هجري"}</span>
        </label>
      </div>

      {/* When in Hijri Mode */}
      {isHijri ? (
        <div className="space-y-2 rounded-xl border border-blue-300 bg-blue-50/50 p-2.5 animate-in fade-in duration-200">
          <div className="grid grid-cols-3 gap-2">
            {/* Day */}
            <div>
              <span className="block text-[10px] font-bold text-slate-600 mb-1">
                {isEn ? "Day" : "اليوم"}
              </span>
              <select
                value={hijriParts.day}
                onChange={(e) => updateHijri("day", parseInt(e.target.value, 10))}
                disabled={disabled}
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold outline-none focus:border-[#1167c9]"
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <span className="block text-[10px] font-bold text-slate-600 mb-1">
                {isEn ? "Month" : "الشهر"}
              </span>
              <select
                value={hijriParts.month}
                onChange={(e) => updateHijri("month", parseInt(e.target.value, 10))}
                disabled={disabled}
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold outline-none focus:border-[#1167c9]"
              >
                {HIJRI_MONTHS.map((m) => (
                  <option key={m.number} value={m.number}>
                    {m.number} - {isEn ? m.nameEn : m.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <span className="block text-[10px] font-bold text-slate-600 mb-1">
                {isEn ? "Year (AH)" : "السنة (هـ)"}
              </span>
              <select
                value={hijriParts.year}
                onChange={(e) => updateHijri("year", parseInt(e.target.value, 10))}
                disabled={disabled}
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold outline-none focus:border-[#1167c9]"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} {isEn ? "AH" : "هـ"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Converted Gregorian Date Badge */}
          <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold border border-blue-200">
            <span className="text-slate-600 flex items-center gap-1">
              <Calendar size={13} className="text-[#1167c9]" />
              {isEn ? "Gregorian Equivalent:" : "المقابل بالميلادي (للنظام):"}
            </span>
            <span className="font-mono text-[#1167c9] font-black">
              {gregorianDate || "—"}
            </span>
          </div>

          {/* Hidden input to supply Gregorian date to parent HTML Form / FormData */}
          <input
            type="hidden"
            name={name}
            value={gregorianDate}
            required={required}
          />
        </div>
      ) : (
        /* Gregorian Mode */
        <div className="space-y-1">
          <input
            id={uniqueId}
            type="date"
            name={name}
            value={gregorianDate}
            onChange={handleGregorianChange}
            required={required}
            disabled={disabled}
            className={
              className ||
              "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium focus:border-[#1167c9] outline-none"
            }
          />
          {gregorianDate && gregorianDate.length >= 10 && (
            <p className="text-[10px] font-medium text-[var(--muted)] flex items-center gap-1 px-1">
              <span>{isEn ? "Hijri Equivalent:" : "الموافق بالهجري:"}</span>
              <span className="font-bold text-slate-700">
                {formatHijriDate(gregorianToHijri(gregorianDate), locale)}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
