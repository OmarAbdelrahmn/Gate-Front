import { authFetch } from "../auth/api";

export type PlatformStatus = "Active" | "Disabled" | "Archived";

export interface PlatformResponse {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  status: PlatformStatus | string;
  notes?: string | null;
  rowVersion: string;
}

export interface PlatformUpsertRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  status: PlatformStatus | string;
  notes?: string | null;
  archiveReason?: string | null;
  rowVersion?: string | null;
}

export type AccountStatus = "Available" | "Assigned" | "Suspended" | "Retired" | "Archived";

export type AssignmentStatus = "Active" | "Ended" | "Cancelled";

export interface AssignmentResponse {
  id: string;
  accountId: string;
  actualRiderProfileId: string;
  actualEmployeeId?: string | null;
  actualRiderNameAr?: string | null;
  actualRiderNameEn?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: AssignmentStatus | string;
  startReason?: string | null;
  endReason?: string | null;
  wasBackdated: boolean;
  backdatedReason?: string | null;
  assignedByUserId?: string | null;
  endedByUserId?: string | null;
  rowVersion: string;
}

export interface AccountResponse {
  id: string;
  platformId: string;
  platformCode?: string | null;
  platformNameAr?: string | null;
  platformNameEn?: string | null;
  operatingCityId: string;
  operatingCityNameAr?: string | null;
  operatingCityNameEn?: string | null;
  ownerRiderProfileId: string;
  ownerEmployeeId?: string | null;
  ownerRiderNameAr?: string | null;
  ownerRiderNameEn?: string | null;
  code: string;
  externalAccountId?: string | null;
  userName?: string | null;
  status: AccountStatus | string;
  statusReason?: string | null;
  acquisitionDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  currentAssignment?: AssignmentResponse | null;
  rowVersion: string;
}

export interface AccountUpsertRequest {
  platformId: string;
  operatingCityId: string;
  ownerRiderProfileId: string;
  code: string;
  externalAccountId?: string | null;
  userName?: string | null;
  status: AccountStatus | string;
  statusReason?: string | null;
  acquisitionDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  archiveReason?: string | null;
  rowVersion?: string | null;
}

export interface AssignRequest {
  actualRiderProfileId: string;
  effectiveFrom: string;
  reason?: string | null;
  wasBackdated?: boolean;
  backdatedReason?: string | null;
}

export interface ReleaseRequest {
  effectiveTo: string;
  status: "Ended" | "Cancelled" | string;
  reason?: string | null;
  rowVersion: string; // Assignment rowVersion!
}

export interface CredentialHistoryResponse {
  id: string;
  version: number;
  rotatedAtUtc: string;
  rotatedByUserId?: string | null;
  reason?: string | null;
}

export interface RotateCredentialRequest {
  secret: string;
  reason?: string | null;
}

export interface RiderPlatformHistoryItem {
  assignmentId: string;
  platformId: string;
  platformCode?: string | null;
  platformNameAr?: string | null;
  platformNameEn?: string | null;
  accountId: string;
  accountCode?: string | null;
  externalAccountId?: string | null;
  ownerRiderProfileId?: string | null;
  ownerRiderNameAr?: string | null;
  ownerRiderNameEn?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: AssignmentStatus | string;
  startReason?: string | null;
  endReason?: string | null;
  wasBackdated: boolean;
  backdatedReason?: string | null;
}

export interface RiderPlatformHistoryResponse {
  riderProfileId: string;
  employeeId?: string | null;
  riderNameAr?: string | null;
  riderNameEn?: string | null;
  assignments: RiderPlatformHistoryItem[];
}

export interface AccountFilterParams {
  accountId?: string;
  platformId?: string;
  operatingCityId?: string;
  ownerRiderProfileId?: string;
  actualRiderProfileId?: string;
  status?: AccountStatus | string;
  currentOnly?: boolean;
  includeArchived?: boolean;
}

// 1. GET /api/platforms?includeArchived=false
export const getPlatforms = async (includeArchived = false) => {
  try {
    const res = await authFetch<PlatformResponse[]>(`/api/platforms?includeArchived=${includeArchived}`);
    console.log("=== API Response: GET /api/platforms ===", res);
    return res;
  } catch (err: any) {
    console.error("=== API Error: GET /api/platforms ===", err?.status, err?.message, err?.details);
    return [];
  }
};

// 2. POST /api/platforms
export const createPlatform = (payload: PlatformUpsertRequest) =>
  authFetch<PlatformResponse>("/api/platforms", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء المنصة بنجاح",
  });

// 3. PUT /api/platforms/{id}
export const updatePlatform = (id: string, payload: PlatformUpsertRequest) =>
  authFetch<PlatformResponse>(`/api/platforms/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث المنصة بنجاح",
  });

// 4. GET /api/platform-accounts
export const getPlatformAccounts = async (filters?: AccountFilterParams) => {
  const query = new URLSearchParams();
  if (filters?.accountId) query.set("accountId", filters.accountId);
  if (filters?.platformId) query.set("platformId", filters.platformId);
  if (filters?.operatingCityId) query.set("operatingCityId", filters.operatingCityId);
  if (filters?.ownerRiderProfileId) query.set("ownerRiderProfileId", filters.ownerRiderProfileId);
  if (filters?.actualRiderProfileId) query.set("actualRiderProfileId", filters.actualRiderProfileId);
  if (filters?.status) query.set("status", filters.status);
  if (filters?.currentOnly !== undefined) query.set("currentOnly", String(filters.currentOnly));
  if (filters?.includeArchived !== undefined) query.set("includeArchived", String(filters.includeArchived));

  const queryString = query.toString();
  const url = `/api/platform-accounts${queryString ? `?${queryString}` : ""}`;
  try {
    const res = await authFetch<AccountResponse[]>(url);
    console.log(`=== API Response: GET ${url} ===`, res);
    return res;
  } catch (err: any) {
    console.error(`=== API Error: GET ${url} ===`, err?.status, err?.message, err?.details);
    return [];
  }
};

// 5. GET /api/platform-accounts/{id}
export const getPlatformAccount = async (id: string) => {
  try {
    return await authFetch<AccountResponse>(`/api/platform-accounts/${encodeURIComponent(id)}`);
  } catch (err: any) {
    console.error(`=== API Error: GET /api/platform-accounts/${id} ===`, err?.status, err?.message);
    return null;
  }
};

// 6. POST /api/platform-accounts
export const createPlatformAccount = (payload: AccountUpsertRequest) =>
  authFetch<AccountResponse>("/api/platform-accounts", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء حساب المنصة بنجاح",
  });

// 7. PUT /api/platform-accounts/{id}
export const updatePlatformAccount = (id: string, payload: AccountUpsertRequest) =>
  authFetch<AccountResponse>(`/api/platform-accounts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث حساب المنصة بنجاح",
  });

// 8. POST /api/platform-accounts/{id}/assign
export const assignPlatformAccount = (id: string, payload: AssignRequest) =>
  authFetch<AssignmentResponse>(`/api/platform-accounts/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تعيين المندوب للحساب بنجاح",
  });

// 9. POST /api/platform-accounts/{id}/release
export const releasePlatformAccount = (id: string, payload: ReleaseRequest) =>
  authFetch<AssignmentResponse>(`/api/platform-accounts/${encodeURIComponent(id)}/release`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنهاء تعيين المندوب للحساب بنجاح",
  });

// 10. GET /api/platform-accounts/{id}/assignment-history
export const getAccountAssignmentHistory = async (id: string) => {
  try {
    return await authFetch<AssignmentResponse[]>(`/api/platform-accounts/${encodeURIComponent(id)}/assignment-history`);
  } catch (err: any) {
    console.error(`=== API Error: GET /api/platform-accounts/${id}/assignment-history ===`, err?.status, err?.message);
    return [];
  }
};

// 11. GET /api/platform-accounts/{id}/credential-history
export const getAccountCredentialHistory = async (id: string) => {
  try {
    return await authFetch<CredentialHistoryResponse[]>(`/api/platform-accounts/${encodeURIComponent(id)}/credential-history`);
  } catch (err: any) {
    console.error(`=== API Error: GET /api/platform-accounts/${id}/credential-history ===`, err?.status, err?.message);
    return [];
  }
};

// 12. POST /api/platform-accounts/{id}/rotate-credential
export const rotateAccountCredential = (id: string, payload: RotateCredentialRequest) =>
  authFetch<CredentialHistoryResponse>(`/api/platform-accounts/${encodeURIComponent(id)}/rotate-credential`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تدويـر بيانات الاعتماد بنجاح",
  });

// 13. GET /api/riders/{riderProfileId}/platform-history
export const getRiderPlatformHistory = async (riderProfileId: string) => {
  try {
    return await authFetch<RiderPlatformHistoryResponse>(`/api/riders/${encodeURIComponent(riderProfileId)}/platform-history`);
  } catch (err: any) {
    console.error(`=== API Error: GET /api/riders/${riderProfileId}/platform-history ===`, err?.status, err?.message);
    return null;
  }
};
