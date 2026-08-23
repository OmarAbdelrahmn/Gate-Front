import { authFetch } from "../auth/api";
import type {
  CreateEmployeeRequest,
  ChangeEmployeeStatusRequest,
  Employee,
  EmployeeDetails,
  Rider,
  UpdateEmployeeRequest,
  RoleTransitionRequest,
} from "./types";
export function listEmployees() {
  return authFetch<Employee[]>("/api/employees");
}
export function getEmployee(employeeId: string) {
  return authFetch<EmployeeDetails>(
    `/api/employees/${encodeURIComponent(employeeId)}`,
  );
}
export function createEmployee(payload: CreateEmployeeRequest) {
  return authFetch<EmployeeDetails>("/api/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateEmployee(
  employeeId: string,
  payload: UpdateEmployeeRequest,
) {
  return authFetch<EmployeeDetails>(
    `/api/employees/${encodeURIComponent(employeeId)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}
export function changeEmployeeStatus(
  employeeId: string,
  payload: ChangeEmployeeStatusRequest,
) {
  return authFetch<EmployeeDetails>(
    `/api/employees/${encodeURIComponent(employeeId)}/status-transitions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
export function changeEmployeeRole(
  employeeId: string,
  payload: RoleTransitionRequest,
) {
  return authFetch<EmployeeDetails>(
    `/api/employees/${encodeURIComponent(employeeId)}/role-transitions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
export function getWorkHistory(employeeId: string) {
  return authFetch<EmployeeDetails["workHistory"]>(
    `/api/employees/${encodeURIComponent(employeeId)}/work-history`,
  );
}
export function updateSponsoredDetails(
  employeeId: string,
  payload: Record<string, unknown>,
) {
  return authFetch(
    `/api/employees/${encodeURIComponent(employeeId)}/sponsored-details`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}
export function updateOutsideRiderDetails(
  employeeId: string,
  payload: Record<string, unknown>,
) {
  return authFetch(
    `/api/employees/${encodeURIComponent(employeeId)}/outside-rider-details`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}
export function assignOperationalWork(
  employeeId: string,
  payload: Record<string, unknown>,
) {
  return authFetch<EmployeeDetails>(
    `/api/employees/${encodeURIComponent(employeeId)}/operational-assignments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
export function getSponsorships(employeeId: string) {
  return authFetch<unknown[]>(
    `/api/employees/${encodeURIComponent(employeeId)}/sponsorships`,
  );
}
export function changeSponsorship(
  employeeId: string,
  payload: Record<string, unknown>,
) {
  return authFetch<unknown[]>(
    `/api/employees/${encodeURIComponent(employeeId)}/sponsorships`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
export function archiveEmployee(
  employeeId: string,
  payload: { reason: string; rowVersion: string },
) {
  return authFetch<void>(
    `/api/employees/${encodeURIComponent(employeeId)}/archive`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
export function listRiders(outsideOnly?: boolean) {
  return authFetch<Rider[]>(
    `/api/riders${outsideOnly === undefined ? "" : `?outsideOnly=${outsideOnly}`}`,
  );
}
export type Sponsor = {
  id: string;
  employerIdentityNumber: string;
  registryNameAr: string;
  registryNameEn: string | null;
  commercialRegistrationNumber: string | null;
  sponsorType: string;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  rowVersion: string;
};
export function listSponsors() {
  return authFetch<Sponsor[]>("/api/sponsors");
}
export function createSponsor(payload: Record<string, unknown>) {
  return authFetch<Sponsor>("/api/sponsors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateSponsor(id: string, payload: Record<string, unknown>) {
  return authFetch<Sponsor>(`/api/sponsors/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
export function archiveSponsor(
  id: string,
  payload: { reason: string; rowVersion: string },
) {
  return authFetch<void>(`/api/sponsors/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export type OperatingCity = {
  id: string;
  code: string;
  globalCityId: string;
  globalCityAr: string;
  globalCityEn: string;
  status: string;
  rowVersion: string;
};
export function listOperatingCities() {
  return authFetch<OperatingCity[]>("/api/hr-catalogs/operating-cities");
}
export type OperationalWorkType = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  status: string;
  rowVersion: string;
};
export function listOperationalWorkTypes() {
  return authFetch<OperationalWorkType[]>(
    "/api/hr-catalogs/operational-work-types",
  );
}
export function createOperationalWorkType(payload: Record<string, unknown>) {
  return authFetch<OperationalWorkType>(
    "/api/hr-catalogs/operational-work-types",
    { method: "POST", body: JSON.stringify(payload) },
  );
}
export function updateOperationalWorkType(
  id: string,
  payload: Record<string, unknown>,
) {
  return authFetch<OperationalWorkType>(
    `/api/hr-catalogs/operational-work-types/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}
export type GlobalCity = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  status: string;
};
export function listGlobalCities() {
  return authFetch<GlobalCity[]>("/api/hr-catalogs/global-cities");
}
export function createOperatingCity(payload: Record<string, unknown>) {
  return authFetch<OperatingCity>("/api/hr-catalogs/operating-cities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateOperatingCity(
  id: string,
  payload: Record<string, unknown>,
) {
  return authFetch<OperatingCity>(
    `/api/hr-catalogs/operating-cities/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}
