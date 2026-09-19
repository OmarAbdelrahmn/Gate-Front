"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";

export interface DateInputProps {
  label?: string;
  value?: string | null; // ISO YYYY-MM-DD or empty
  onChange?: (val: string) => void; // emits YYYY-MM-DD or empty
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  min?: string;
  max?: string;
}

// Convert YYYY-MM-DD to DD/MM/YYYY
export function ymdToDmy(ymd?: string | null): string {
  if (!ymd) return "";
  const match = String(ymd).trim().match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");
    return `${day}/${month}/${year}`;
  }
  return "";
}

// Convert DD/MM/YYYY to YYYY-MM-DD
export function dmyToYmd(dmy: string): string | null {
  const match = dmy.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;

  const padDay = String(day).padStart(2, "0");
  const padMonth = String(month).padStart(2, "0");
  return `${year}-${padMonth}-${padDay}`;
}

export function DateInput({
  label,
  value = "",
  onChange,
  required = false,
  disabled = false,
  className = "",
  placeholder = "DD/MM/YYYY",
  name,
  id,
  min,
  max,
}: DateInputProps) {
  const [inputText, setInputText] = useState<string>(() => ymdToDmy(value));
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  // Sync internal text state when external value changes
  useEffect(() => {
    setInputText(ymdToDmy(value));
  }, [value]);

  // Handle typing in text input with auto-formatting
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow only digits and slashes
    raw = raw.replace(/[^\d\/]/g, "");

    // If user pasted or typed numbers without slashes, format it
    // Example: "19092026" -> "19/09/2026"
    const digits = raw.replace(/\D/g, "");
    let formatted = raw;

    if (!raw.includes("/") && digits.length > 2) {
      if (digits.length <= 4) {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      } else {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
      }
    }

    // Limit to max 10 chars "DD/MM/YYYY"
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }

    setInputText(formatted);

    // If matches complete DD/MM/YYYY, check validity and fire onChange
    if (formatted.length === 10) {
      const ymd = dmyToYmd(formatted);
      if (ymd) {
        onChange?.(ymd);
      }
    } else if (formatted.trim() === "") {
      onChange?.("");
    }
  };

  const handleBlur = () => {
    if (inputText.trim() === "") {
      onChange?.("");
      setInputText("");
      return;
    }
    const ymd = dmyToYmd(inputText);
    if (ymd) {
      onChange?.(ymd);
      setInputText(ymdToDmy(ymd));
    } else {
      // Revert to current external value
      setInputText(ymdToDmy(value));
    }
  };

  // When user picks a date using the native date picker popup
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYmd = e.target.value;
    setInputText(ymdToDmy(newYmd));
    onChange?.(newYmd);
  };

  // Open the native browser calendar picker
  const handleOpenPicker = () => {
    if (disabled) return;
    try {
      hiddenDateRef.current?.showPicker();
    } catch {
      hiddenDateRef.current?.focus();
    }
  };

  const currentYmd = value ? (value.length >= 10 ? value.slice(0, 10) : "") : "";

  return (
    <div className="space-y-1 w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center w-full" dir="ltr">
        {/* Visible LTR formatted input */}
        <input
          id={id}
          type="text"
          dir="ltr"
          inputMode="numeric"
          value={inputText}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-3 pr-10 font-mono text-sm text-[var(--foreground)] outline-none placeholder:text-slate-400 focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100 ${className}`}
        />

        {/* Hidden native date input used for showPicker() */}
        <input
          ref={hiddenDateRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={currentYmd}
          min={min}
          max={max}
          disabled={disabled}
          onChange={handleNativePickerChange}
          className="absolute opacity-0 pointer-events-none w-0 h-0 -z-10"
        />

        {/* Calendar Picker Trigger Icon */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={handleOpenPicker}
          title="اختيار التاريخ من التقويم"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-[#1167c9] hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
        </button>

        {/* Hidden form input with YYYY-MM-DD if name is provided */}
        {name && <input type="hidden" name={name} value={currentYmd} />}
      </div>
    </div>
  );
}
