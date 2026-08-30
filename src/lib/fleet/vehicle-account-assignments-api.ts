import { authFetch } from "../auth/api";

export type VehicleAccountAssignmentProblem = {
  code: string;
  severity: "Warning" | "Error" | string;
  message: string;
  expected?: string | null;
  actual?: string | null;
  maximumAccounts?: number | null;
  activeAccountCount?: number | null;
};

export type VehiclePlatformAccountAssignment = {
  id: string;
  vehicleId: string;
  vehicleAssetNumber?: string | null;
  vehicleType?: string | null;
  vehicleSponsorId?: string | null;
  vehicleSponsorNameAr?: string | null;
  vehicleOperatingCityId?: string | null;
  platformRiderAccountId: string;
  platformAccountCode?: string | null;
  externalAccountId?: string | null;
  platformId?: string | null;
  platformCode?: string | null;
  platformNameAr?: string | null;
  accountSponsorId?: string | null;
  accountSponsorNameAr?: string | null;
  accountOperatingCityId?: string | null;
  accountOperatingCityNameAr?: string | null;
  accountOwnerEmployeeId?: string | null;
  accountOwnerRiderNameAr?: string | null;
  approvalStatus: string;
  status: "Active" | "Ended" | "Closed" | string;
  hasProblems: boolean;
  problems: VehicleAccountAssignmentProblem[];
  effectiveFromUtc?: string | null;
  effectiveToUtc?: string | null;
  reason?: string | null;
  rowVersion: string;
};

export type CreateVehicleAccountAssignmentRequest = {
  vehicleId: string;
  platformRiderAccountId: string;
  effectiveFromUtc: string;
  reason?: string | null;
};

export type CloseVehicleAccountAssignmentRequest = {
  effectiveToUtc: string;
  reason?: string | null;
  rowVersion: string;
};

export type VehicleAccountAssignmentFilters = {
  vehicleId?: string;
  platformRiderAccountId?: string;
  platformId?: string;
  operatingCityId?: string;
  sponsorId?: string;
  activeOnly?: boolean;
};

// 1. GET /api/vehicle-platform-account-assignments
export async function getVehicleAccountAssignments(
  filters?: VehicleAccountAssignmentFilters
): Promise<VehiclePlatformAccountAssignment[]> {
  const query = new URLSearchParams();
  if (filters?.vehicleId) query.set("vehicleId", filters.vehicleId);
  if (filters?.platformRiderAccountId) query.set("platformRiderAccountId", filters.platformRiderAccountId);
  if (filters?.platformId) query.set("platformId", filters.platformId);
  if (filters?.operatingCityId) query.set("operatingCityId", filters.operatingCityId);
  if (filters?.sponsorId) query.set("sponsorId", filters.sponsorId);
  if (filters?.activeOnly !== undefined) query.set("activeOnly", String(filters.activeOnly));

  try {
    const res = await authFetch<VehiclePlatformAccountAssignment[]>(
      `/api/vehicle-platform-account-assignments?${query.toString()}`
    );
    return res || [];
  } catch (err: any) {
    console.error("Failed to fetch vehicle platform account assignments", err);
    return [];
  }
}

// 2. GET /api/vehicle-platform-account-assignments/problems
export async function getVehicleAccountAssignmentProblems(): Promise<VehiclePlatformAccountAssignment[]> {
  try {
    const res = await authFetch<VehiclePlatformAccountAssignment[]>(
      "/api/vehicle-platform-account-assignments/problems"
    );
    return res || [];
  } catch (err: any) {
    console.error("Failed to fetch vehicle account assignment problems", err);
    return [];
  }
}

// 3. GET /api/vehicle-platform-account-assignments/{id}
export function getVehicleAccountAssignment(id: string): Promise<VehiclePlatformAccountAssignment> {
  return authFetch<VehiclePlatformAccountAssignment>(
    `/api/vehicle-platform-account-assignments/${encodeURIComponent(id)}`
  );
}

// 4. POST /api/vehicle-platform-account-assignments
export function createVehicleAccountAssignment(
  payload: CreateVehicleAccountAssignmentRequest
): Promise<VehiclePlatformAccountAssignment> {
  return authFetch<VehiclePlatformAccountAssignment>(
    "/api/vehicle-platform-account-assignments",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

// 5. POST /api/vehicle-platform-account-assignments/{id}/close
export function closeVehicleAccountAssignment(
  id: string,
  payload: CloseVehicleAccountAssignmentRequest
): Promise<VehiclePlatformAccountAssignment | void> {
  return authFetch<VehiclePlatformAccountAssignment | void>(
    `/api/vehicle-platform-account-assignments/${encodeURIComponent(id)}/close`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}
