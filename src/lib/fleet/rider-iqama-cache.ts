"use client";

import { useEffect, useState, useCallback } from "react";
import { listRiders, listEmployees } from "@/lib/workforce/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";

export interface RiderIdentifiable {
  riderProfileId?: string | null;
  employeeId?: string | null;
  accountId?: string | null;
  riderNameAr?: string | null;
  riderNameEn?: string | null;
  iqamaNo?: string | null;
  iqama?: string | null;
}

// In-memory cache
const idToIqamaMap = new Map<string, string>();
const nameToIqamaMap = new Map<string, string>();
const listeners = new Set<() => void>();

let isFetching = false;
let isFetched = false;
let fetchPromise: Promise<void> | null = null;

const CACHE_SESSION_KEY = "fleet_rider_iqama_cache_v1";

// Initialize from sessionStorage if available
if (typeof window !== "undefined") {
  try {
    const raw = sessionStorage.getItem(CACHE_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.ids && typeof parsed.ids === "object") {
        Object.entries(parsed.ids).forEach(([k, v]) => {
          if (v && typeof v === "string") idToIqamaMap.set(k.toLowerCase(), v);
        });
      }
      if (parsed.names && typeof parsed.names === "object") {
        Object.entries(parsed.names).forEach(([k, v]) => {
          if (v && typeof v === "string") nameToIqamaMap.set(k.trim(), v);
        });
      }
      if (idToIqamaMap.size > 0) {
        isFetched = true;
      }
    }
  } catch {
    // Ignore sessionStorage errors
  }
}

function persistCache() {
  if (typeof window === "undefined") return;
  try {
    const ids: Record<string, string> = {};
    const names: Record<string, string> = {};
    idToIqamaMap.forEach((v, k) => {
      ids[k] = v;
    });
    nameToIqamaMap.forEach((v, k) => {
      names[k] = v;
    });
    sessionStorage.setItem(CACHE_SESSION_KEY, JSON.stringify({ ids, names }));
  } catch {
    // Ignore sessionStorage quota errors
  }
}

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error("Rider iqama cache listener error:", e);
    }
  });
}

function isValidIqama(iqama?: string | null): boolean {
  if (!iqama) return false;
  const trimmed = String(iqama).trim();
  return (
    trimmed.length >= 6 &&
    trimmed !== "-" &&
    trimmed !== "—" &&
    trimmed !== "0" &&
    trimmed.toLowerCase() !== "null" &&
    trimmed.toLowerCase() !== "undefined"
  );
}

function isValidId(id?: string | null): boolean {
  if (!id) return false;
  const trimmed = String(id).trim();
  return (
    trimmed !== "" &&
    trimmed !== "0" &&
    trimmed !== "00000000-0000-0000-0000-000000000000" &&
    trimmed.toLowerCase() !== "null" &&
    trimmed.toLowerCase() !== "undefined"
  );
}

export function registerRiderIqama(params: {
  riderProfileId?: string | null;
  employeeId?: string | null;
  accountId?: string | null;
  iqamaNo?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
}) {
  if (!isValidIqama(params.iqamaNo)) return;
  const iqama = String(params.iqamaNo).trim();

  if (isValidId(params.riderProfileId)) {
    idToIqamaMap.set(params.riderProfileId!.toLowerCase().trim(), iqama);
  }
  if (isValidId(params.employeeId)) {
    idToIqamaMap.set(params.employeeId!.toLowerCase().trim(), iqama);
  }
  if (isValidId(params.accountId)) {
    idToIqamaMap.set(params.accountId!.toLowerCase().trim(), iqama);
  }
  if (params.nameAr && params.nameAr.trim()) {
    nameToIqamaMap.set(params.nameAr.trim(), iqama);
  }
  if (params.nameEn && params.nameEn.trim()) {
    nameToIqamaMap.set(params.nameEn.trim(), iqama);
  }
}

export async function ensureRiderIqamaLoaded(): Promise<void> {
  if (isFetched && idToIqamaMap.size > 0) return;
  if (isFetching && fetchPromise) return fetchPromise;

  isFetching = true;
  fetchPromise = Promise.all([
    listRiders().catch(() => []),
    listEmployees().catch(() => []),
    listExternalRiders().catch(() => []),
  ])
    .then(([riders, employees, externalRiders]) => {
      (riders || []).forEach((r) => {
        registerRiderIqama({
          riderProfileId: r.id,
          employeeId: r.employeeId,
          iqamaNo: r.iqamaNo,
          nameAr: r.fullNameAr,
          nameEn: r.fullNameEn,
        });
      });

      (employees || []).forEach((e) => {
        const riderId = (e as any).riderProfileId || e.rider?.id;
        registerRiderIqama({
          riderProfileId: riderId,
          employeeId: e.id,
          iqamaNo: e.iqamaNo,
          nameAr: e.fullNameAr,
          nameEn: e.fullNameEn,
        });
      });

      (externalRiders || []).forEach((er) => {
        registerRiderIqama({
          riderProfileId: er.riderProfileId,
          employeeId: er.employeeId,
          iqamaNo: er.iqamaNo,
          nameAr: er.fullNameAr,
        });
      });

      isFetched = true;
      persistCache();
      notifyListeners();
    })
    .catch((err) => {
      console.warn("Failed to preload rider iqamas:", err);
    })
    .finally(() => {
      isFetching = false;
      fetchPromise = null;
    });

  return fetchPromise;
}

export function getRiderIqama(person?: RiderIdentifiable | null): string | null {
  if (!person) return null;

  // 1. Direct property on person object if already populated
  const direct = person.iqamaNo || person.iqama;
  if (isValidIqama(direct)) {
    return String(direct).trim();
  }

  // 2. Lookup by riderProfileId
  if (isValidId(person.riderProfileId)) {
    const found = idToIqamaMap.get(person.riderProfileId!.toLowerCase().trim());
    if (found) return found;
  }

  // 3. Lookup by employeeId
  if (isValidId(person.employeeId)) {
    const found = idToIqamaMap.get(person.employeeId!.toLowerCase().trim());
    if (found) return found;
  }

  // 4. Lookup by accountId
  if (isValidId(person.accountId)) {
    const found = idToIqamaMap.get(person.accountId!.toLowerCase().trim());
    if (found) return found;
  }

  // 5. Lookup by Arabic Name
  if (person.riderNameAr && person.riderNameAr.trim()) {
    const found = nameToIqamaMap.get(person.riderNameAr.trim());
    if (found) return found;
  }

  // 5. Lookup by English Name
  if (person.riderNameEn && person.riderNameEn.trim()) {
    const found = nameToIqamaMap.get(person.riderNameEn.trim());
    if (found) return found;
  }

  return null;
}

export function formatRiderWithIqama(
  name: string | null | undefined,
  iqama: string | null | undefined
): string {
  const cleanName = (name || "").trim() || "—";
  if (cleanName === "—" || cleanName === "غير معين") return cleanName;
  if (isValidIqama(iqama)) {
    return `${cleanName} (${String(iqama).trim()})`;
  }
  return cleanName;
}

export function useRiderIqamaCache() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    listeners.add(onChange);

    if (!isFetched && !isFetching) {
      ensureRiderIqamaLoaded();
    }

    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const resolveIqama = useCallback((person?: RiderIdentifiable | null) => {
    return getRiderIqama(person);
  }, []);

  const formatWithIqama = useCallback(
    (name: string | null | undefined, iqama: string | null | undefined) => {
      return formatRiderWithIqama(name, iqama);
    },
    []
  );

  return {
    getRiderIqama: resolveIqama,
    formatRiderWithIqama: formatWithIqama,
    isLoaded: isFetched,
  };
}
