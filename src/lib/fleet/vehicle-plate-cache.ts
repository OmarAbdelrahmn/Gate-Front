"use client";

import { useEffect, useState } from "react";
import { getVehiclesLookup, getAllVehicles } from "./api";

export interface VehiclePlateEntry {
  plateNumberAr: string;
  plateNumberEn: string;
  serialNumber?: string | null;
  assetNumber?: string | null;
}

const vehiclePlateMap = new Map<string, VehiclePlateEntry>();
const pendingLookups = new Set<string>();
const listeners = new Set<() => void>();

let isFetching = false;
let isFetched = false;

// Initialize from sessionStorage if available in browser
if (typeof window !== "undefined") {
  try {
    const raw = sessionStorage.getItem("fleet_vehicle_plates_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([k, v]) => {
        vehiclePlateMap.set(k.toLowerCase(), v as VehiclePlateEntry);
      });
    }
  } catch {}
}

function persistCache() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, VehiclePlateEntry> = {};
    vehiclePlateMap.forEach((val, key) => {
      obj[key] = val;
    });
    sessionStorage.setItem("fleet_vehicle_plates_cache", JSON.stringify(obj));
  } catch {}
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  });
}

function saveVehicleToCache(v: any) {
  if (!v) return;
  const plateAr =
    (v.plateNumberAr || "").trim() ||
    (v.plateLettersAr && v.plateDigits
      ? `${v.plateDigits} ${v.plateLettersAr}`.trim()
      : "") ||
    (v.plateNumberEn || "").trim();
  const plateEn =
    (v.plateNumberEn || "").trim() || (v.plateNumberAr || "").trim();
  const serial = (v.serialNumber || "").trim();
  const assetNumber = (v.assetNumber || "").trim();

  const entry: VehiclePlateEntry = {
    plateNumberAr: plateAr || serial || assetNumber,
    plateNumberEn: plateEn || serial || assetNumber,
    serialNumber: serial || undefined,
    assetNumber: assetNumber || undefined,
  };

  if (v.id) {
    vehiclePlateMap.set(String(v.id).trim().toLowerCase(), entry);
  }
  if (assetNumber) {
    vehiclePlateMap.set(assetNumber.toLowerCase(), entry);
  }
}

export async function loadVehiclePlates(): Promise<void> {
  if (isFetched || isFetching) return;
  isFetching = true;

  try {
    // 1. Fetch lookups first (fast)
    const lookupRes = await getVehiclesLookup("").catch(() => []);
    if (Array.isArray(lookupRes)) {
      for (const item of lookupRes) {
        saveVehicleToCache(item);
      }
    }

    // 2. Fetch full vehicle summaries to ensure all fields/pages are indexed
    const allVehicles = await getAllVehicles().catch(() => []);
    if (Array.isArray(allVehicles)) {
      for (const item of allVehicles) {
        saveVehicleToCache(item);
      }
    }

    isFetched = true;
    persistCache();
    notifyListeners();
  } catch (err) {
    console.warn("Failed to load vehicle plates:", err);
  } finally {
    isFetching = false;
  }
}

export async function lookupVehiclePlate(key: string): Promise<VehiclePlateEntry | null> {
  if (!key) return null;
  const lowerKey = key.trim().toLowerCase();
  const existing = vehiclePlateMap.get(lowerKey);
  if (existing) return existing;

  if (pendingLookups.has(lowerKey)) return null;
  pendingLookups.add(lowerKey);

  try {
    const list = await getVehiclesLookup(key).catch(() => []);
    if (Array.isArray(list) && list.length > 0) {
      for (const v of list) {
        saveVehicleToCache(v);
      }
      persistCache();
      notifyListeners();
      return vehiclePlateMap.get(lowerKey) || null;
    }
  } catch {
  } finally {
    pendingLookups.delete(lowerKey);
  }

  return null;
}

export function getVehiclePlate(key: string, locale: "ar" | "en" = "ar"): string | null {
  if (!key) return null;
  const entry = vehiclePlateMap.get(key.trim().toLowerCase());
  if (!entry) return null;
  return locale === "en" ? entry.plateNumberEn : entry.plateNumberAr;
}

export function replaceVehicleNumbersWithPlates(
  text: string,
  locale: "ar" | "en" = "ar"
): string {
  if (!text || typeof text !== "string") return text;

  let result = text;

  // 1. Replace VEH-[A-Za-z0-9_-]+ with the Arabic or English plate
  const matches = result.match(/VEH-[A-Za-z0-9_-]+/gi);
  if (matches) {
    for (const match of matches) {
      const plate = getVehiclePlate(match, locale);
      if (plate) {
        result = result.replaceAll(match, plate);
      } else {
        // Trigger lazy background resolution for any missing vehicle code
        void lookupVehiclePlate(match);
      }
    }
  }

  // 2. In Arabic notifications, translate status keywords for clean presentation
  if (locale === "ar") {
    result = result
      .replace(/\bAvailable\b/g, "متاحة")
      .replace(/\bAssigned\b/g, "مخصصة")
      .replace(/\bInMaintenance\b/g, "تحت الصيانة")
      .replace(/\bUnderMaintenance\b/g, "تحت الصيانة")
      .replace(/\bMaintenance\b/g, "صيانة")
      .replace(/\bOutOfService\b/g, "خارج الخدمة")
      .replace(/\bDecommissioned\b/g, "خارج الخدمة");
  }

  return result;
}

export function subscribeVehiclePlates(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useVehiclePlates() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void loadVehiclePlates();
    return subscribeVehiclePlates(() => setVersion((v) => v + 1));
  }, []);

  return {
    version,
    getVehiclePlate,
    replaceVehicleNumbersWithPlates,
  };
}

export function invalidateVehiclePlatesCache(): void {
  vehiclePlateMap.clear();
  isFetched = false;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("fleet_vehicle_plates_cache");
    } catch {}
  }
  void loadVehiclePlates();
  notifyListeners();
}

export function updateVehiclePlateCache(
  vehicleId: string,
  entry: Partial<VehiclePlateEntry> & { assetNumber?: string | null }
): void {
  if (!vehicleId) return;
  const lowerId = vehicleId.trim().toLowerCase();
  const existing = vehiclePlateMap.get(lowerId) || {
    plateNumberAr: "",
    plateNumberEn: "",
  };
  const updated: VehiclePlateEntry = {
    ...existing,
    ...entry,
    plateNumberAr: entry.plateNumberAr ?? existing.plateNumberAr,
    plateNumberEn: entry.plateNumberEn ?? existing.plateNumberEn,
    serialNumber: entry.serialNumber ?? existing.serialNumber,
    assetNumber: entry.assetNumber ?? existing.assetNumber,
  };
  vehiclePlateMap.set(lowerId, updated);
  if (entry.assetNumber) {
    vehiclePlateMap.set(entry.assetNumber.trim().toLowerCase(), updated);
  }
  persistCache();
  notifyListeners();
}
