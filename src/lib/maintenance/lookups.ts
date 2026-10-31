"use client";

import { useEffect, useState } from "react";
import { listUsers } from "@/lib/users/api";
import { listRiders, listEmployees } from "@/lib/workforce/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
import {
  getMaintenanceLocations,
  getDirectOilInventoryLocations,
  getInventoryItems,
  getOilBarrels,
  getWorkOrders,
  getExternalWorkOrders,
} from "./api";
import {
  loadVehiclePlates,
  getVehiclePlate,
  subscribeVehiclePlates,
} from "@/lib/fleet/vehicle-plate-cache";

interface ResolvedEntityMaps {
  users: Map<string, string>;
  riders: Map<string, { nameAr: string; nameEn: string; iqamaNo?: string }>;
  locations: Map<string, { nameAr: string; nameEn: string; code?: string }>;
  items: Map<string, { nameAr: string; nameEn: string; sku: string }>;
  barrels: Map<string, { barrelNumber: string; itemNameAr?: string }>;
  workOrders: Map<
    string,
    {
      workOrderNumber: string;
      externalVehicleRef?: string;
      customerName?: string;
      vehiclePlate?: string;
    }
  >;
}

const maps: ResolvedEntityMaps = {
  users: new Map(),
  riders: new Map(),
  locations: new Map(),
  items: new Map(),
  barrels: new Map(),
  workOrders: new Map(),
};

// Seed default known location IDs so they always resolve immediately
maps.locations.set("019d77f0-0000-7000-8000-000000000001", {
  nameAr: "ورشة جدة",
  nameEn: "Jeddah Workshop",
});
maps.locations.set("019d77f0-0000-7000-8000-000000000002", {
  nameAr: "ورشة الرياض",
  nameEn: "Riyadh Workshop",
});
maps.locations.set("019d77f0-0000-7000-8000-000000000003", {
  nameAr: "مستودع جدة",
  nameEn: "Jeddah Warehouse",
});
maps.locations.set("019d77f0-0000-7000-8000-000000000004", {
  nameAr: "مستودع الرياض",
  nameEn: "Riyadh Warehouse",
});

const listeners = new Set<() => void>();
let isLoaded = false;
let isFetching = false;
let fetchPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function norm(id?: string | null): string {
  return (id || "").trim().toLowerCase();
}

function looksLikeUuid(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export async function ensureMaintenanceLookupsLoaded(force = false): Promise<void> {
  if (isLoaded && !force) return;
  if (isFetching && fetchPromise && !force) return fetchPromise;

  isFetching = true;
  fetchPromise = Promise.all([
    loadVehiclePlates().catch(() => {}),
    listUsers().catch(() => []),
    listRiders().catch(() => []),
    listEmployees().catch(() => []),
    listExternalRiders().catch(() => []),
    getMaintenanceLocations().catch(() => []),
    getDirectOilInventoryLocations().catch(() => []),
    getInventoryItems().catch(() => []),
    getOilBarrels().catch(() => []),
    getWorkOrders().catch(() => []),
    getExternalWorkOrders().catch(() => []),
  ])
    .then(
      ([
        ,
        users,
        riders,
        employees,
        externalRiders,
        locations,
        directOilLocations,
        items,
        barrels,
        workOrders,
        externalWorkOrders,
      ]) => {
        (users || []).forEach((u: any) => {
          if (!u?.id) return;
          const label =
            u.displayNameAr ||
            u.employee?.fullNameAr ||
            u.displayNameEn ||
            u.employee?.fullNameEn ||
            u.userName ||
            u.email;
          if (label) {
            maps.users.set(norm(u.id), String(label).trim());
          }
        });

        (employees || []).forEach((e: any) => {
          const entry = {
            nameAr: e.fullNameAr || e.fullNameEn || "موظف",
            nameEn: e.fullNameEn || e.fullNameAr || "Employee",
            iqamaNo: e.iqamaNo || undefined,
          };
          if (e.id) maps.riders.set(norm(e.id), entry);
          const rId = e.riderProfileId || e.rider?.id;
          if (rId) maps.riders.set(norm(rId), entry);
        });

        (riders || []).forEach((r: any) => {
          const entry = {
            nameAr: r.fullNameAr || r.fullNameEn || "مندوب",
            nameEn: r.fullNameEn || r.fullNameAr || "Rider",
            iqamaNo: r.iqamaNo || undefined,
          };
          if (r.id) maps.riders.set(norm(r.id), entry);
          if (r.employeeId) maps.riders.set(norm(r.employeeId), entry);
        });

        (externalRiders || []).forEach((er: any) => {
          const entry = {
            nameAr: er.fullNameAr || "مندوب خارجي",
            nameEn: er.fullNameAr || "External Rider",
            iqamaNo: er.iqamaNo || undefined,
          };
          if (er.id) maps.riders.set(norm(er.id), entry);
          if (er.riderProfileId) maps.riders.set(norm(er.riderProfileId), entry);
          if (er.employeeId) maps.riders.set(norm(er.employeeId), entry);
        });

        (locations || []).forEach((loc: any) => {
          if (!loc?.id) return;
          maps.locations.set(norm(loc.id), {
            nameAr: loc.nameAr || loc.nameEn || loc.code || "موقع صيانة",
            nameEn: loc.nameEn || loc.nameAr || loc.code || "Location",
            code: loc.code || undefined,
          });
        });

        (directOilLocations || []).forEach((dLoc: any) => {
          if (dLoc?.inventoryLocationId) {
            maps.locations.set(norm(dLoc.inventoryLocationId), {
              nameAr:
                dLoc.inventoryLocationNameAr ||
                dLoc.maintenanceLocationNameAr ||
                "مستودع الزيوت",
              nameEn:
                dLoc.inventoryLocationNameAr ||
                dLoc.maintenanceLocationNameAr ||
                "Oil Warehouse",
            });
          }
          if (dLoc?.maintenanceLocationId) {
            maps.locations.set(norm(dLoc.maintenanceLocationId), {
              nameAr:
                dLoc.maintenanceLocationNameAr ||
                dLoc.inventoryLocationNameAr ||
                "ورشة الصيانة",
              nameEn:
                dLoc.maintenanceLocationNameAr ||
                dLoc.inventoryLocationNameAr ||
                "Maintenance Workshop",
            });
          }
        });

        (items || []).forEach((it: any) => {
          if (!it?.id) return;
          maps.items.set(norm(it.id), {
            nameAr: it.nameAr || it.nameEn || it.sku || "صنف مخزني",
            nameEn: it.nameEn || it.nameAr || it.sku || "Inventory Item",
            sku: it.sku || "",
          });
        });

        (barrels || []).forEach((b: any) => {
          if (!b?.id) return;
          const itemInfo = b.inventoryItemId
            ? maps.items.get(norm(b.inventoryItemId))
            : undefined;
          maps.barrels.set(norm(b.id), {
            barrelNumber: b.barrelNumber || "برميل زيت",
            itemNameAr: itemInfo?.nameAr,
          });
        });

        const allWos = [...(workOrders || []), ...(externalWorkOrders || [])];
        allWos.forEach((wo: any) => {
          if (!wo?.id) return;
          maps.workOrders.set(norm(wo.id), {
            workOrderNumber: wo.workOrderNumber || "أمر عمل",
            externalVehicleRef: wo.externalVehicle?.plateOrReference || undefined,
            customerName: wo.externalVehicle?.customerName || undefined,
            vehiclePlate:
              wo.vehiclePlateNumberAr ||
              wo.vehiclePlateNumber ||
              wo.vehicleAssetNumber ||
              undefined,
          });
        });

        isLoaded = true;
        notify();
      },
    )
    .finally(() => {
      isFetching = false;
      fetchPromise = null;
    });

  return fetchPromise;
}

export function resolveFriendlyUserName(
  userIdOrName?: string | null,
  isEn = false,
): string {
  if (!userIdOrName || !userIdOrName.trim()) {
    return isEn ? "System User" : "مستخدم النظام";
  }
  const clean = userIdOrName.trim();
  const mapped = maps.users.get(norm(clean));
  if (mapped) return mapped;
  if (!looksLikeUuid(clean)) return clean;
  return isEn ? "Authorized User" : "موظف مختص";
}

export function resolveFriendlyRiderName(
  riderProfileId?: string | null,
  isEn = false,
): string {
  if (!riderProfileId || !riderProfileId.trim()) {
    return isEn ? "Unassigned (No Rider)" : "غير معين (بدون سائق)";
  }
  const entry = maps.riders.get(norm(riderProfileId));
  if (entry) {
    const name = isEn ? entry.nameEn : entry.nameAr;
    return entry.iqamaNo ? `${name} (${entry.iqamaNo})` : name;
  }
  if (!looksLikeUuid(riderProfileId)) return riderProfileId;
  return isEn ? "Assigned Rider" : "سائق مكلف";
}

export function resolveFriendlyLocationName(
  locationId?: string | null,
  isEn = false,
): string {
  if (!locationId || !locationId.trim()) {
    return isEn ? "Main Warehouse" : "المستودع الرئيسي";
  }
  const entry = maps.locations.get(norm(locationId));
  if (entry) {
    return isEn ? entry.nameEn : entry.nameAr;
  }
  if (!looksLikeUuid(locationId)) return locationId;
  return isEn ? "Authorized Warehouse" : "المستودع المعتمد";
}

export function resolveFriendlyItemName(
  itemId?: string | null,
  isEn = false,
): string {
  if (!itemId || !itemId.trim()) {
    return isEn ? "Not Specified" : "غير محدد";
  }
  const entry = maps.items.get(norm(itemId));
  if (entry) {
    const name = isEn ? entry.nameEn : entry.nameAr;
    return entry.sku ? `${name} (${entry.sku})` : name;
  }
  if (!looksLikeUuid(itemId)) return itemId;
  return isEn ? "Inventory Item" : "صنف مخزني";
}

export function resolveFriendlyBarrelNumber(
  barrelId?: string | null,
  fallbackNumber?: string | null,
  isEn = false,
): string {
  if (fallbackNumber && fallbackNumber.trim() && !looksLikeUuid(fallbackNumber)) {
    return fallbackNumber.trim();
  }
  if (!barrelId || !barrelId.trim()) {
    return isEn ? "Oil Barrel" : "برميل زيت";
  }
  const entry = maps.barrels.get(norm(barrelId));
  if (entry?.barrelNumber) {
    return entry.barrelNumber;
  }
  if (!looksLikeUuid(barrelId)) return barrelId;
  return isEn ? "Registered Oil Barrel" : "برميل زيت مسجل";
}

export function resolveFriendlyVehicleLabel(
  vehicleId?: string | null,
  fallbackAssetOrPlate?: string | null,
  isEn = false,
): string {
  if (vehicleId) {
    const plate = getVehiclePlate(vehicleId, isEn ? "en" : "ar");
    if (plate && !looksLikeUuid(plate)) return plate;
  }
  if (fallbackAssetOrPlate) {
    const plateFromAsset = getVehiclePlate(fallbackAssetOrPlate, isEn ? "en" : "ar");
    if (plateFromAsset && !looksLikeUuid(plateFromAsset)) return plateFromAsset;
    if (!looksLikeUuid(fallbackAssetOrPlate)) return fallbackAssetOrPlate;
  }
  return isEn ? "Company Vehicle" : "مركبة الشركة";
}

export function resolveFriendlyWorkOrderLabel(
  workOrderId?: string | null,
  isEn = false,
): string {
  if (!workOrderId || !workOrderId.trim()) {
    return isEn ? "Direct Service" : "خدمة مباشرة";
  }
  const entry = maps.workOrders.get(norm(workOrderId));
  if (entry) {
    if (entry.externalVehicleRef) {
      return `${entry.workOrderNumber} (${entry.externalVehicleRef})`;
    }
    return entry.workOrderNumber;
  }
  if (!looksLikeUuid(workOrderId)) return workOrderId;
  return isEn ? "Linked Work Order" : "أمر عمل مرتبط";
}

export function useMaintenanceLookups() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    listeners.add(onUpdate);
    const unsubPlates = subscribeVehiclePlates(onUpdate);
    void ensureMaintenanceLookupsLoaded();
    return () => {
      listeners.delete(onUpdate);
      unsubPlates();
    };
  }, []);

  return {
    isLoaded,
    refreshLookups: () => ensureMaintenanceLookupsLoaded(true),
    resolveUserName: resolveFriendlyUserName,
    resolveRiderName: resolveFriendlyRiderName,
    resolveLocationName: resolveFriendlyLocationName,
    resolveItemName: resolveFriendlyItemName,
    resolveBarrelNumber: resolveFriendlyBarrelNumber,
    resolveVehicleLabel: resolveFriendlyVehicleLabel,
    resolveWorkOrderLabel: resolveFriendlyWorkOrderLabel,
  };
}
