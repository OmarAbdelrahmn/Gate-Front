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
  iqamaNo: string;
  fullNameAr: string;
  nationality?: string | null;
  iban?: string | null;
  address?: AddressDto | null;
  primaryPhone: string;
  operationalWorkTypeId: string;
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

export type DeleteExternalRiderRequest = {
  reason: string;
  rowVersion: string;
};

export type ExternalRiderImportPreview = {
  totalRows?: number;
  newRowsCount?: number;
  updatedRowsCount?: number;
  invalidRowsCount?: number;
  errors?: string[];
  warnings?: string[];
  rows?: any[];
  [key: string]: unknown;
};

export type ExternalRiderImportResult = {
  success?: boolean;
  insertedCount?: number;
  updatedCount?: number;
  failedCount?: number;
  errors?: string[];
  message?: string;
  [key: string]: unknown;
};

export function deleteExternalRider(
  employeeId: string,
  payload: DeleteExternalRiderRequest
): Promise<void> {
  return authFetch<void>(`/api/external-riders/${encodeURIComponent(employeeId)}`, {
    method: "DELETE",
    body: JSON.stringify(payload),
    notifySuccess: "تم حذف المندوب الخارجي بنجاح",
  });
}

export function validateExternalRidersImport(
  file: File
): Promise<ExternalRiderImportPreview> {
  const formData = new FormData();
  formData.append("file", file);
  return authFetch<ExternalRiderImportPreview>("/api/import/external-riders/validate", {
    method: "POST",
    body: formData,
  });
}

export function executeExternalRidersImport(
  file: File
): Promise<ExternalRiderImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return authFetch<ExternalRiderImportResult>("/api/import/external-riders", {
    method: "POST",
    body: formData,
    notifySuccess: "تم استيراد المناديب الخارجيين بنجاح",
  });
}

