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
  vehicleSerialNumber?: string | null;
  vehicleRegistrationNumber?: string | null;
  vehiclePlateNumberAr?: string | null;
  vehiclePlateNumberEn?: string | null;
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

export type SwitchVehicleAccountAssignmentRequest = {
  targetVehicleId: string;
  mode: "Immediate" | "Pending" | string;
  effectiveAtUtc?: string | null;
  reason?: string | null;
  rowVersion: string;
};

export type SwitchVehicleAccountAssignmentResponse = {
  id?: string;
  status: "Accepted" | "Pending" | string;
  newAssignmentId?: string | null;
  rowVersion?: string;
};

export type PendingVehicleAccountAssignmentSwitch = {
  id: string;
  sourceAssignmentId?: string;
  targetVehicleId: string;
  targetVehicleAssetNumber?: string | null;
  targetVehicleSerialNumber?: string | null;
  targetVehicleRegistrationNumber?: string | null;
  targetVehiclePlateNumberAr?: string | null;
  targetVehiclePlateNumberEn?: string | null;
  sourceVehicleId?: string;
  sourceVehicleAssetNumber?: string | null;
  sourceVehicleSerialNumber?: string | null;
  sourceVehicleRegistrationNumber?: string | null;
  sourceVehiclePlateNumberAr?: string | null;
  sourceVehiclePlateNumberEn?: string | null;
  platformRiderAccountId?: string;
  platformAccountCode?: string | null;
  platformNameAr?: string | null;
  accountOwnerRiderNameAr?: string | null;
  mode: "Immediate" | "Pending" | string;
  status: "Pending" | "Accepted" | string;
  reason?: string | null;
  effectiveAtUtc?: string | null;
  requestedAtUtc?: string | null;
  newAssignmentId?: string | null;
  rowVersion: string;
};

export type AcceptVehicleAccountAssignmentSwitchRequest = {
  effectiveAtUtc?: string | null;
  rowVersion: string;
};

// 6. POST /api/vehicle-platform-account-assignments/{id}/switch
export function switchVehicleAccountAssignment(
  assignmentId: string,
  payload: SwitchVehicleAccountAssignmentRequest
): Promise<SwitchVehicleAccountAssignmentResponse> {
  return authFetch<SwitchVehicleAccountAssignmentResponse>(
    `/api/vehicle-platform-account-assignments/${encodeURIComponent(assignmentId)}/switch`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

// 7. GET /api/vehicle-platform-account-assignments/switches?pendingOnly=true
export async function getPendingVehicleAccountAssignmentSwitches(
  pendingOnly: boolean = true
): Promise<PendingVehicleAccountAssignmentSwitch[]> {
  try {
    const res = await authFetch<PendingVehicleAccountAssignmentSwitch[]>(
      `/api/vehicle-platform-account-assignments/switches?pendingOnly=${pendingOnly}`
    );
    return res || [];
  } catch (err: any) {
    console.error("Failed to fetch pending vehicle account assignment switches", err);
    return [];
  }
}

// 8. POST /api/vehicle-platform-account-assignments/switches/{switchId}/accept
export function acceptVehicleAccountAssignmentSwitch(
  switchId: string,
  payload: AcceptVehicleAccountAssignmentSwitchRequest
): Promise<SwitchVehicleAccountAssignmentResponse> {
  return authFetch<SwitchVehicleAccountAssignmentResponse>(
    `/api/vehicle-platform-account-assignments/switches/${encodeURIComponent(switchId)}/accept`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}
