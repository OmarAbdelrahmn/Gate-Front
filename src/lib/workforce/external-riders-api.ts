import { authFetch } from "../auth/api";
import type { AddressDto } from "./types";

export type ExternalRider = {
  employeeId: string;
  riderProfileId: string;
  iqamaNo: string;
  fullNameAr: string;
  nationality?: string | null;
  iban?: string | null;
  address?: AddressDto | null;
  primaryPhone?: string;
  operatingCityId?: string;
  operationalWorkTypeId?: string;
  status: string;
  rowVersion: string;
};

export type CreateExternalRiderRequest = {
  iqamaNo: string;
  fullNameAr: string;
  nationality?: string | null;
  iban?: string | null;
  address?: AddressDto | null;
  primaryPhone: string;
  operatingCityId: string;
  operationalWorkTypeId: string;
};

export type UpdateExternalRiderRequest = {
  iqamaNo?: string;
  fullNameAr?: string;
  nationality?: string | null;
  iban?: string | null;
  address?: AddressDto | null;
  primaryPhone?: string;
  operatingCityId?: string;
  operationalWorkTypeId?: string;
  rowVersion: string;
};

export type OperatingCityCatalogItem = {
  id: string;
  globalCityId?: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  status: string;
};

export type OperationalWorkTypeCatalogItem = {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  status: string;
};

export function getOperatingCities(): Promise<OperatingCityCatalogItem[]> {
  return authFetch<OperatingCityCatalogItem[]>("/api/hr-catalogs/operating-cities");
}

export function getOperationalWorkTypes(): Promise<OperationalWorkTypeCatalogItem[]> {
  return authFetch<OperationalWorkTypeCatalogItem[]>("/api/hr-catalogs/operational-work-types");
}

export function listExternalRiders(): Promise<ExternalRider[]> {
  return authFetch<ExternalRider[]>("/api/external-riders");
}

export function getExternalRider(employeeId: string): Promise<ExternalRider> {
  return authFetch<ExternalRider>(`/api/external-riders/${encodeURIComponent(employeeId)}`);
}

export function createExternalRider(payload: CreateExternalRiderRequest): Promise<ExternalRider> {
  return authFetch<ExternalRider>("/api/external-riders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExternalRider(
  employeeId: string,
  payload: UpdateExternalRiderRequest
): Promise<ExternalRider> {
  return authFetch<ExternalRider>(`/api/external-riders/${encodeURIComponent(employeeId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
