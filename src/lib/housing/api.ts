import { authFetch } from "../auth/api";

export type HousingStatus = "Active" | "Inactive" | "Archived";

export interface AddressRequest {
  buildingNumber?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  additionalNumber?: string | null;
}

export interface Housing {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  cityId: string;
  cityAr?: string;
  address?: AddressRequest | null;
  latitude?: number | null;
  longitude?: number | null;
  totalCapacity: number;
  currentResidents: number;
  availableCapacity: number;
  contactPhone?: string | null;
  openedDate?: string | null;
  closedDate?: string | null;
  status: HousingStatus | string;
  statusReason?: string | null;
  notes?: string | null;
  rowVersion: string;
  isDeleted?: boolean;
}

export interface CreateHousingPayload {
  code: string;
  nameAr: string;
  nameEn: string;
  cityId: string;
  address?: AddressRequest | null;
  latitude?: number | null;
  longitude?: number | null;
  totalCapacity: number;
  contactPhone?: string | null;
  openedDate?: string | null;
  closedDate?: string | null;
  status: HousingStatus | string;
  statusReason?: string | null;
  notes?: string | null;
  rowVersion?: string | null;
}

export interface UpdateHousingPayload extends Omit<CreateHousingPayload, "rowVersion"> {
  rowVersion: string;
}

export interface ArchiveHousingPayload {
  reason: string;
  rowVersion: string;
}

export interface HousingPeriod {
  id: string;
  housingId: string;
  employeeId: string;
  iqamaNo?: string | null;
  employeeNameAr: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  startReason?: string | null;
  endReason?: string | null;
  capacityOverrideUsed: boolean;
  capacityOverrideReason?: string | null;
}

export interface AssignResidentPayload {
  employeeId: string;
  effectiveFrom: string;
  moveInReason?: string | null;
  sourceReference?: string | null;
  capacityOverrideUsed: boolean;
  capacityOverrideReason?: string | null;
}

export interface CloseResidencePayload {
  effectiveTo: string;
  reason: string;
}

export interface AssignSupervisorPayload {
  employeeId: string;
  effectiveFrom: string;
  assignmentReason?: string | null;
}

export interface CloseSupervisorPayload {
  effectiveTo: string;
  reason: string;
}

// Endpoint documentation DTO Type Aliases
export type HousingUpsertRequest = CreateHousingPayload;
export type ArchiveRequest = ArchiveHousingPayload;
export type AssignHousingResidentRequest = AssignResidentPayload;
export type ClosePeriodRequest = CloseResidencePayload;
export type AssignHousingSupervisorRequest = AssignSupervisorPayload;

export const listHousing = () => authFetch<Housing[]>("/api/housing");

export const getHousing = (id: string) =>
  authFetch<Housing>(`/api/housing/${encodeURIComponent(id)}`);

export const createHousing = (payload: CreateHousingPayload) =>
  authFetch<Housing>("/api/housing", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateHousing = (id: string, payload: UpdateHousingPayload) =>
  authFetch<Housing>(`/api/housing/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const archiveHousing = (id: string, reason: string, rowVersion: string) =>
  authFetch<void>(`/api/housing/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason, rowVersion }),
  });

export const listResidents = (id: string, currentOnly = false) =>
  authFetch<HousingPeriod[]>(
    `/api/housing/${encodeURIComponent(id)}/residents?currentOnly=${currentOnly}`,
  );

export const assignResident = (id: string, payload: AssignResidentPayload) =>
  authFetch<HousingPeriod[]>(`/api/housing/${encodeURIComponent(id)}/residents`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const closeResidence = (
  periodId: string,
  effectiveTo: string,
  reason: string,
) =>
  authFetch<void>(
    `/api/housing/residence-periods/${encodeURIComponent(periodId)}/close`,
    {
      method: "POST",
      body: JSON.stringify({ effectiveTo, reason }),
    },
  );

export const listSupervisors = (id: string, currentOnly = false) =>
  authFetch<HousingPeriod[]>(
    `/api/housing/${encodeURIComponent(id)}/supervisors?currentOnly=${currentOnly}`,
  );

export const assignSupervisor = (id: string, payload: AssignSupervisorPayload) =>
  authFetch<HousingPeriod[]>(`/api/housing/${encodeURIComponent(id)}/supervisors`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const closeSupervisor = (
  periodId: string,
  effectiveTo: string,
  reason: string,
) =>
  authFetch<void>(
    `/api/housing/supervisor-periods/${encodeURIComponent(periodId)}/close`,
    {
      method: "POST",
      body: JSON.stringify({ effectiveTo, reason }),
    },
  );
