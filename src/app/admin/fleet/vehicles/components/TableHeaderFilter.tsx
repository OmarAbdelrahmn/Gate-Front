"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Filter, ChevronDown, Check, X, Search, Building2, MapPin } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  sublabel?: string;
  count?: number;
}

interface TableHeaderColumnFilterProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: FilterOption[];
  placeholder?: string;
}

export function TableHeaderColumnFilter({
  label,
  value,
  onChange,
  options,
  placeholder = "بحث وتصفية...",
}: TableHeaderColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({
    left: 0,
    width: 240,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 240;
      const dropdownHeight = 280;

      let left = rect.right - dropdownWidth;
      if (left < 10) left = 10;
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setCoords({
        left,
        width: dropdownWidth,
        top: placeAbove ? undefined : rect.bottom + 6,
        bottom: placeAbove ? window.innerHeight - rect.top + 6 : undefined,
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => {
        window.removeEventListener("scroll", updateCoords, true);
        window.removeEventListener("resize", updateCoords);
      };
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, query]);

  const isFiltered = Boolean(value);

  return (
    <div className="relative inline-block text-right">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative inline-flex items-center justify-center p-1 rounded-md transition-all select-none cursor-pointer ${
          isFiltered
            ? "bg-blue-50 dark:bg-blue-950/80 text-[#1167c9] dark:text-blue-300 border border-blue-300 dark:border-blue-700 shadow-2xs"
            : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        }`}
        title={isFiltered ? `تصفية ${label}: ${selectedOption?.label || value}` : `تصفية ${label}`}
      >
        <Filter
          className={`h-3.5 w-3.5 transition-colors ${
            isFiltered
              ? "text-[#1167c9] dark:text-blue-300 fill-current"
              : "text-current"
          }`}
        />
        {isFiltered && (
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1167c9] dark:bg-blue-400 ring-1 ring-white dark:ring-slate-900" />
          </span>
        )}
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              zIndex: 99999,
            }}
            className="max-h-72 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col text-right text-xs"
          >
            {/* Header & Search */}
            <div className="p-2 border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-800/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  تصفية {label}
                </span>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setIsOpen(false);
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold cursor-pointer"
                  >
                    مسح التصفية
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full h-7 pr-7 pl-6 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#1167c9]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-1 max-h-52 divide-y divide-[var(--border)]">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start text-xs transition-all ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400 font-bold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                      }`}
                    >
                      <div className="truncate flex-1">
                        <span className="truncate block">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate block">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#1167c9] dark:text-blue-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

interface TableHeaderCitySponsorFilterProps {
  cityValue: string;
  onCityChange: (val: string) => void;
  cityOptions: FilterOption[];
  sponsorValue: string;
  onSponsorChange: (val: string) => void;
  sponsorOptions: FilterOption[];
}

export function TableHeaderCitySponsorFilter({
  cityValue,
  onCityChange,
  cityOptions,
  sponsorValue,
  onSponsorChange,
  sponsorOptions,
}: TableHeaderCitySponsorFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"city" | "sponsor">("city");
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({
    left: 0,
    width: 290,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 290;
      const dropdownHeight = 320;

      let left = rect.right - dropdownWidth;
      if (left < 10) left = 10;
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setCoords({
        left,
        width: dropdownWidth,
        top: placeAbove ? undefined : rect.bottom + 6,
        bottom: placeAbove ? window.innerHeight - rect.top + 6 : undefined,
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => {
        window.removeEventListener("scroll", updateCoords, true);
        window.removeEventListener("resize", updateCoords);
      };
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const selectedCity = useMemo(
    () => cityOptions.find((opt) => opt.value === cityValue),
    [cityOptions, cityValue]
  );
  const selectedSponsor = useMemo(
    () => sponsorOptions.find((opt) => opt.value === sponsorValue),
    [sponsorOptions, sponsorValue]
  );

  const isFiltered = Boolean(cityValue || sponsorValue);

  const currentOptions = activeTab === "city" ? cityOptions : sponsorOptions;
  const currentValue = activeTab === "city" ? cityValue : sponsorValue;
  const handleCurrentChange = activeTab === "city" ? onCityChange : onSponsorChange;

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return currentOptions;
    const q = query.toLowerCase().trim();
    return currentOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [currentOptions, query]);

  // Generate trigger button label
  const buttonLabel = useMemo(() => {
    if (cityValue && sponsorValue) {
      return `${selectedCity?.label || cityValue} + ${selectedSponsor?.label || sponsorValue}`;
    }
    if (cityValue) return selectedCity?.label || cityValue;
    if (sponsorValue) return selectedSponsor?.label || sponsorValue;
    return "الكل";
  }, [cityValue, sponsorValue, selectedCity, selectedSponsor]);

  return (
    <div className="relative inline-block text-right">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative inline-flex items-center justify-center p-1 rounded-md transition-all select-none cursor-pointer ${
          isFiltered
            ? "bg-blue-50 dark:bg-blue-950/80 text-[#1167c9] dark:text-blue-300 border border-blue-300 dark:border-blue-700 shadow-2xs"
            : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        }`}
        title={isFiltered ? `تصفية المدينة / الكفيل: ${buttonLabel}` : "تصفية المدينة / الكفيل"}
      >
        <Filter
          className={`h-3.5 w-3.5 transition-colors ${
            isFiltered
              ? "text-[#1167c9] dark:text-blue-300 fill-current"
              : "text-current"
          }`}
        />
        {isFiltered && (
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1167c9] dark:bg-blue-400 ring-1 ring-white dark:ring-slate-900" />
          </span>
        )}
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              zIndex: 99999,
            }}
            className="max-h-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col text-right text-xs"
          >
            {/* Header & Tabs */}
            <div className="p-2 border-b border-[var(--border)] bg-slate-50/70 dark:bg-slate-800/60 flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  المدينة / الكفيل
                </span>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={() => {
                      onCityChange("");
                      onSponsorChange("");
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold cursor-pointer"
                  >
                    مسح الكل
                  </button>
                )}
              </div>

              {/* Tabs Switcher */}
              <div className="grid grid-cols-2 p-0.5 bg-slate-200/70 dark:bg-slate-900/60 rounded-lg text-center font-bold text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("city");
                    setQuery("");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeTab === "city"
                      ? "bg-white dark:bg-slate-800 text-[#1167c9] dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  <span>المدينة</span>
                  {cityValue && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1167c9] dark:bg-blue-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("sponsor");
                    setQuery("");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeTab === "sponsor"
                      ? "bg-white dark:bg-slate-800 text-[#1167c9] dark:text-blue-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <Building2 className="h-3 w-3" />
                  <span>الكفيل / السجل</span>
                  {sponsorValue && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1167c9] dark:bg-blue-400" />
                  )}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    activeTab === "city"
                      ? "بحث في المدن..."
                      : "بحث في الكفلاء والسجلات..."
                  }
                  className="w-full h-7 pr-7 pl-6 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#1167c9]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-1 max-h-48 divide-y divide-[var(--border)]">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === currentValue;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleCurrentChange(opt.value);
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400 font-bold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                      }`}
                    >
                      <div className="truncate flex-1">
                        <span className="truncate block">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate block">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#1167c9] dark:text-blue-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Summary / Done */}
            {(cityValue || sponsorValue) && (
              <div className="p-2 border-t border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                <div className="flex flex-wrap items-center gap-1">
                  {cityValue && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                      مدينة: {selectedCity?.label || cityValue}
                      <X
                        className="h-2.5 w-2.5 cursor-pointer hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCityChange("");
                        }}
                      />
                    </span>
                  )}
                  {sponsorValue && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                      كفيل: {selectedSponsor?.label || sponsorValue}
                      <X
                        className="h-2.5 w-2.5 cursor-pointer hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSponsorChange("");
                        }}
                      />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 rounded-md bg-[#1167c9] text-white hover:bg-[#0e56a8] font-bold text-[11px] ml-auto cursor-pointer"
                >
                  تم
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
