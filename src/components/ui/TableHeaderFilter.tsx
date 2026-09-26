"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Filter,
  Check,
  X,
  Search,
  Building2,
  MapPin,
  CheckSquare,
  Square,
  RotateCcw,
} from "lucide-react";
import { matchesArabicSearch, normalizeArabicText } from "@/lib/utils/arabicSearch";

export interface FilterOption {
  value: string;
  label: string;
  sublabel?: string;
  count?: number;
}

export interface TableHeaderColumnFilterProps {
  label: string;
  value?: string | string[];
  selectedValues?: string[];
  onChange: (val: string[]) => void;
  options: FilterOption[];
  placeholder?: string;
  align?: "left" | "right";
  multi?: boolean;
}

export function TableHeaderColumnFilter({
  label,
  value,
  selectedValues,
  onChange,
  options,
  placeholder = "بحث وتصفية...",
  align = "right",
  multi = true,
}: TableHeaderColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize selected values to a clean string array
  const currentSelected: string[] = useMemo(() => {
    if (Array.isArray(selectedValues)) {
      return selectedValues.filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }
    if (typeof value === "string" && value.trim() && value !== "ALL") {
      return [value.trim()];
    }
    return [];
  }, [value, selectedValues]);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({
    left: 0,
    width: 260,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 260;
      const dropdownHeight = 340;

      let left = align === "left" ? rect.left : rect.right - dropdownWidth;
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
  }, [align]);

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
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("scroll", updateCoords, true);
        window.removeEventListener("resize", updateCoords);
      };
    } else {
      setQuery("");
    }
  }, [isOpen, updateCoords]);

  // Options without the pseudo "ALL" or "" option, used for list and mass select
  const validSelectableOptions = useMemo(() => {
    return options.filter((opt) => opt.value !== "" && opt.value !== "ALL");
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((opt) => {
      // Don't show "All" option if searching
      if (opt.value === "" || opt.value === "ALL") return false;
      return matchesArabicSearch(query, opt.label, opt.sublabel, opt.value);
    });
  }, [options, query]);

  const isFiltered = currentSelected.length > 0;

  const toggleOption = (val: string) => {
    if (!val || val === "ALL") {
      // Clicking "ALL" resets all selections
      onChange([]);
      return;
    }

    if (!multi) {
      if (currentSelected.includes(val)) {
        onChange([]);
      } else {
        onChange([val]);
      }
      setIsOpen(false);
      return;
    }

    if (currentSelected.includes(val)) {
      onChange(currentSelected.filter((v) => v !== val));
    } else {
      onChange([...currentSelected, val]);
    }
  };

  const selectAll = () => {
    const allVals = validSelectableOptions.map((o) => o.value);
    onChange(allVals);
  };

  const clearAll = () => {
    onChange([]);
  };

  // Summary labels of selected items for tooltip
  const tooltipText = useMemo(() => {
    if (!isFiltered) return `تصفية ${label}`;
    const selectedLabels = currentSelected
      .map((val) => {
        const found = options.find((o) => o.value === val);
        return found ? found.label : val;
      })
      .slice(0, 3)
      .join("، ");
    const more = currentSelected.length > 3 ? ` (+${currentSelected.length - 3})` : "";
    return `تصفية ${label}: ${selectedLabels}${more}`;
  }, [isFiltered, label, currentSelected, options]);

  return (
    <div className="relative inline-block text-right">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded-md transition-all select-none cursor-pointer text-xs ${
          isFiltered
            ? "bg-blue-50 dark:bg-blue-950/80 text-[#1167c9] dark:text-blue-300 border border-blue-300 dark:border-blue-700 shadow-2xs font-semibold"
            : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        }`}
        title={tooltipText}
        aria-label={`تصفية عمود ${label}`}
      >
        <Filter
          className={`h-3.5 w-3.5 transition-colors shrink-0 ${
            isFiltered ? "text-[#1167c9] dark:text-blue-300 fill-current" : "text-current"
          }`}
        />
        {isFiltered && (
          <span className="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[10px] font-bold rounded-full bg-[#1167c9] text-white dark:bg-blue-500 shadow-xs">
            {currentSelected.length}
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
            className="max-h-[380px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col text-right text-xs"
          >
            {/* Header */}
            <div className="p-2.5 border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                  <span>تصفية {label}</span>
                  {isFiltered && (
                    <span className="text-[11px] font-normal text-blue-600 dark:text-blue-400">
                      ({currentSelected.length} محدد)
                    </span>
                  )}
                </div>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    مسح
                  </button>
                )}
              </div>

              {/* Quick Select Buttons in Multi mode */}
              {multi && validSelectableOptions.length > 1 && (
                <div className="flex items-center justify-between gap-1 text-[11px] text-slate-600 dark:text-slate-400 px-1">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="hover:text-[#1167c9] dark:hover:text-blue-400 font-medium cursor-pointer"
                  >
                    تحديد الكل ({validSelectableOptions.length})
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              )}

              {/* Search input */}
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-1.5 max-h-56 divide-y divide-[var(--border)]">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  لا توجد نتائج مطابقة للبحث
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isAllOption = opt.value === "" || opt.value === "ALL";
                  const isSelected = isAllOption
                    ? currentSelected.length === 0
                    : currentSelected.includes(opt.value);

                  return (
                    <button
                      key={opt.value || "__all__"}
                      type="button"
                      onClick={() => toggleOption(opt.value)}
                      className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-start text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-300 font-semibold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium"
                      }`}
                    >
                      {/* Checkbox Icon */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isAllOption ? (
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-[#1167c9] bg-[#1167c9]"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        ) : (
                          <div
                            className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-[#1167c9] bg-[#1167c9] text-white"
                                : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                        )}
                      </div>

                      {/* Text details */}
                      <div className="truncate flex-1">
                        <span className="truncate block">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate block">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>

                      {/* Count pill if available */}
                      {opt.count !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono shrink-0">
                          {opt.count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isFiltered ? `تم تحديد ${currentSelected.length}` : "الكل محدد"}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-md bg-[#1167c9] text-white hover:bg-[#0e56a8] font-bold text-xs cursor-pointer ml-auto shadow-xs"
              >
                تم
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export interface TableHeaderCitySponsorFilterProps {
  cityValue?: string | string[];
  cityValues?: string[];
  onCityChange: (val: string[]) => void;
  cityOptions: FilterOption[];
  sponsorValue?: string | string[];
  sponsorValues?: string[];
  onSponsorChange: (val: string[]) => void;
  sponsorOptions: FilterOption[];
}

export function TableHeaderCitySponsorFilter({
  cityValue,
  cityValues,
  onCityChange,
  cityOptions,
  sponsorValue,
  sponsorValues,
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

  // Normalize selected cities
  const selectedCities: string[] = useMemo(() => {
    if (Array.isArray(cityValues)) return cityValues.filter(Boolean);
    if (Array.isArray(cityValue)) return cityValue.filter(Boolean);
    if (typeof cityValue === "string" && cityValue.trim() && cityValue !== "ALL") {
      return [cityValue.trim()];
    }
    return [];
  }, [cityValue, cityValues]);

  // Normalize selected sponsors
  const selectedSponsors: string[] = useMemo(() => {
    if (Array.isArray(sponsorValues)) return sponsorValues.filter(Boolean);
    if (Array.isArray(sponsorValue)) return sponsorValue.filter(Boolean);
    if (typeof sponsorValue === "string" && sponsorValue.trim() && sponsorValue !== "ALL") {
      return [sponsorValue.trim()];
    }
    return [];
  }, [sponsorValue, sponsorValues]);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({
    left: 0,
    width: 300,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 300;
      const dropdownHeight = 380;

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
  }, []);

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
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("scroll", updateCoords, true);
        window.removeEventListener("resize", updateCoords);
      };
    } else {
      setQuery("");
    }
  }, [isOpen, updateCoords]);

  const totalFilteredCount = selectedCities.length + selectedSponsors.length;
  const isFiltered = totalFilteredCount > 0;

  const currentOptions = activeTab === "city" ? cityOptions : sponsorOptions;
  const currentSelected = activeTab === "city" ? selectedCities : selectedSponsors;
  const handleSelectionChange = activeTab === "city" ? onCityChange : onSponsorChange;

  const validSelectableOptions = useMemo(() => {
    return currentOptions.filter((opt) => opt.value !== "" && opt.value !== "ALL");
  }, [currentOptions]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return currentOptions;
    return currentOptions.filter((opt) => {
      if (opt.value === "" || opt.value === "ALL") return false;
      return matchesArabicSearch(query, opt.label, opt.sublabel, opt.value);
    });
  }, [currentOptions, query]);

  const toggleOption = (val: string) => {
    if (!val || val === "ALL") {
      handleSelectionChange([]);
      return;
    }
    if (currentSelected.includes(val)) {
      handleSelectionChange(currentSelected.filter((v) => v !== val));
    } else {
      handleSelectionChange([...currentSelected, val]);
    }
  };

  const selectAllCurrent = () => {
    handleSelectionChange(validSelectableOptions.map((o) => o.value));
  };

  const clearCurrent = () => {
    handleSelectionChange([]);
  };

  const clearAllBoth = () => {
    onCityChange([]);
    onSponsorChange([]);
  };

  return (
    <div className="relative inline-block text-right">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded-md transition-all select-none cursor-pointer text-xs ${
          isFiltered
            ? "bg-blue-50 dark:bg-blue-950/80 text-[#1167c9] dark:text-blue-300 border border-blue-300 dark:border-blue-700 shadow-2xs font-semibold"
            : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        }`}
        title={
          isFiltered
            ? `تصفية المدينة / الكفيل: (${selectedCities.length} مدينة، ${selectedSponsors.length} كفيل)`
            : "تصفية المدينة / الكفيل"
        }
      >
        <Filter
          className={`h-3.5 w-3.5 transition-colors shrink-0 ${
            isFiltered ? "text-[#1167c9] dark:text-blue-300 fill-current" : "text-current"
          }`}
        />
        {isFiltered && (
          <span className="inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[10px] font-bold rounded-full bg-[#1167c9] text-white dark:bg-blue-500 shadow-xs">
            {totalFilteredCount}
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
            className="max-h-[400px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col text-right text-xs"
          >
            {/* Header & Tabs */}
            <div className="p-2.5 border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                  <span>تصفية المدينة / الكفيل</span>
                  {totalFilteredCount > 0 && (
                    <span className="text-[11px] font-normal text-blue-600 dark:text-blue-400">
                      ({totalFilteredCount} محدد)
                    </span>
                  )}
                </div>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={clearAllBoth}
                    className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
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
                  {selectedCities.length > 0 && (
                    <span className="px-1 py-0.2 rounded-full bg-[#1167c9] text-white text-[10px] min-w-[14px]">
                      {selectedCities.length}
                    </span>
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
                  {selectedSponsors.length > 0 && (
                    <span className="px-1 py-0.2 rounded-full bg-[#1167c9] text-white text-[10px] min-w-[14px]">
                      {selectedSponsors.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Quick Select in Current Tab */}
              {validSelectableOptions.length > 1 && (
                <div className="flex items-center justify-between gap-1 text-[11px] text-slate-600 dark:text-slate-400 px-1">
                  <button
                    type="button"
                    onClick={selectAllCurrent}
                    className="hover:text-[#1167c9] dark:hover:text-blue-400 font-medium cursor-pointer"
                  >
                    تحديد كل {activeTab === "city" ? "المدن" : "الكفلاء"} ({validSelectableOptions.length})
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={clearCurrent}
                    className="hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              )}

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
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-1.5 max-h-52 divide-y divide-[var(--border)]">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isAllOption = opt.value === "" || opt.value === "ALL";
                  const isSelected = isAllOption
                    ? currentSelected.length === 0
                    : currentSelected.includes(opt.value);

                  return (
                    <button
                      key={opt.value || "__all__"}
                      type="button"
                      onClick={() => toggleOption(opt.value)}
                      className={`w-full flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-start text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-300 font-semibold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium"
                      }`}
                    >
                      {/* Checkbox Icon */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isAllOption ? (
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-[#1167c9] bg-[#1167c9]"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        ) : (
                          <div
                            className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-[#1167c9] bg-[#1167c9] text-white"
                                : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                        )}
                      </div>

                      <div className="truncate flex-1">
                        <span className="truncate block">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate block">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>

                      {opt.count !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono shrink-0">
                          {opt.count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Summary / Done */}
            <div className="p-2 border-t border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 truncate">
                {activeTab === "city"
                  ? `${selectedCities.length} مدينة محددة`
                  : `${selectedSponsors.length} كفيل محدد`}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-md bg-[#1167c9] text-white hover:bg-[#0e56a8] font-bold text-xs ml-auto cursor-pointer shadow-xs"
              >
                تم
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
