// src/components/jahez/JahezVehicleTypeBadge.tsx
"use client";

import React from "react";
import { Bike, Car, Truck } from "lucide-react";
import { formatJahezVehicleType } from "@/lib/jahez/types";

interface JahezVehicleTypeBadgeProps {
  vehicleType?: string | null;
  isEn?: boolean;
  className?: string;
  showNone?: boolean;
}

export function JahezVehicleTypeBadge({
  vehicleType,
  isEn = false,
  className = "",
  showNone = false,
}: JahezVehicleTypeBadgeProps) {
  if (!vehicleType || !vehicleType.trim()) {
    if (showNone) {
      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700 ${className}`}
        >
          {isEn ? "No active vehicle" : "بدون مركبة نشطة"}
        </span>
      );
    }
    return <span className={`text-[11px] text-gray-400 dark:text-gray-500 ${className}`}>—</span>;
  }

  const raw = vehicleType.trim();
  const lower = raw.toLowerCase();

  let Icon = Car;
  let colorClasses =
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";

  if (lower === "motorcycle") {
    Icon = Bike;
    colorClasses =
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
  } else if (lower === "car") {
    Icon = Car;
    colorClasses =
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
  } else if (lower === "van") {
    Icon = Truck;
    colorClasses =
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
  } else if (lower === "truck") {
    Icon = Truck;
    colorClasses =
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  }

  const label = formatJahezVehicleType(raw, isEn);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${colorClasses} ${className}`}
      title={isEn ? `Active Vehicle Link: ${label}` : `نوع المركبة من أحدث ربط نشط معتمد: ${label}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
