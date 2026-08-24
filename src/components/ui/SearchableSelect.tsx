"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Check, X } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  keywords?: string;
};

export interface SearchableSelectProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  noOptionsText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  name,
  value,
  onChange,
  options,
  placeholder = "اختر...",
  searchPlaceholder = "بحث...",
  noOptionsText = "لا توجد نتائج",
  required = false,
  disabled = false,
  className = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placeAbove: boolean;
  }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownEstimatedHeight = 290;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < dropdownEstimatedHeight && rect.top > dropdownEstimatedHeight;

      setCoords({
        top: placeAbove ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        placeAbove,
      });
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update positioning when open or on scroll/resize
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
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSublabel = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false;
      const matchKeywords = opt.keywords ? opt.keywords.toLowerCase().includes(q) : false;
      return matchLabel || matchSublabel || matchKeywords;
    });
  }, [options, query]);

  function handleSelect(val: string) {
    onChange(val);
    setIsOpen(false);
  }

  const dropdownMenu = (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        top: coords.placeAbove ? undefined : `${coords.top}px`,
        bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
        zIndex: 99999,
      }}
      className="max-h-72 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col"
    >
      {/* Search Box Header */}
      <div className="p-2 border-b border-[var(--border)] bg-slate-50/80">
        <div className="relative flex items-center">
          <Search size={16} className="absolute right-3 text-[var(--muted)] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pr-9 pl-3 text-xs outline-none focus:border-[#1167c9] focus:ring-2 focus:ring-blue-100 font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute left-2.5 text-[var(--muted)] hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Options List */}
      <div className="overflow-y-auto p-1 max-h-52 divide-y divide-slate-100">
        {filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--muted)] font-medium">
            {noOptionsText}
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-right text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-blue-50 text-[#1167c9]"
                    : "text-[var(--foreground)] hover:bg-slate-100"
                }`}
              >
                <div className="truncate">
                  <p className="font-bold truncate">{opt.label}</p>
                  {opt.sublabel && (
                    <p className="text-[11px] font-mono text-[var(--muted)] font-normal truncate mt-0.5">
                      {opt.sublabel}
                    </p>
                  )}
                </div>
                {isSelected && <Check size={16} className="shrink-0 text-[#1167c9]" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for standard HTML forms */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-right text-sm font-bold shadow-sm transition-all outline-none focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100 ${
          disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "cursor-pointer hover:border-slate-400"
        } ${isOpen ? "border-[#1167c9] ring-4 ring-blue-100" : ""}`}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <span className="text-[var(--foreground)]">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-xs text-[var(--muted)] font-mono">({selectedOption.sublabel})</span>
              )}
            </span>
          ) : (
            <span className="text-[var(--muted)] font-normal">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-[var(--muted)]">
          {value && !required && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 rounded-md hover:bg-slate-200 hover:text-slate-700"
              title="تفريغ"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-[#1167c9]" : ""}`} />
        </div>
      </button>

      {/* Floating Searchable Dropdown rendered in Portal */}
      {isOpen && mounted && createPortal(dropdownMenu, document.body)}
    </div>
  );
}
