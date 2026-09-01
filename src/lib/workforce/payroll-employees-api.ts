import { authFetch } from "../auth/api";

export type PayrollEmployeeSponsor = {
  id: string;
  employerIdentityNumber: string;
  registryNameAr: string;
  registryNameEn: string | null;
};

export type PayrollEmployee = {
  id: string;
  number: number;
  sponsorId: string;
  sponsor: PayrollEmployeeSponsor;
  name: string;
  nationalId: string;
  country: string;
  joiningDate: string; // YYYY-MM-DD
  personalIban: string; // normalized, without spaces
  salary: number;
  status: string;
  rowVersion: string; // opaque Base64 token
};

export type CreatePayrollEmployeeRequest = {
  number: number;
  sponsorId: string;
  name: string;
  nationalId: string;
  country: string;
  joiningDate: string;
  personalIban: string;
  salary: number;
  status: string;
};

export type UpdatePayrollEmployeeRequest = CreatePayrollEmployeeRequest & {
  rowVersion: string;
};

export type SponsorOption = {
  id: string;
  employerIdentityNumber: string;
  registryNameAr: string;
  registryNameEn: string | null;
  status: string;
};

export function listPayrollEmployees(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return authFetch<PayrollEmployee[]>(`/api/payroll-employees${query}`);
}

export function getPayrollEmployee(id: string) {
  return authFetch<PayrollEmployee>(`/api/payroll-employees/${encodeURIComponent(id)}`);
}

export function createPayrollEmployee(payload: CreatePayrollEmployeeRequest) {
  return authFetch<PayrollEmployee>("/api/payroll-employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePayrollEmployee(
  id: string,
  payload: UpdatePayrollEmployeeRequest,
) {
  return authFetch<PayrollEmployee>(`/api/payroll-employees/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePayrollEmployee(
  id: string,
  rowVersion: string,
  reason = "",
) {
  const query = new URLSearchParams({ rowVersion });
  if (reason.trim()) {
    query.set("reason", reason.trim());
  }
  return authFetch<void>(
    `/api/payroll-employees/${encodeURIComponent(id)}?${query.toString()}`,
    {
      method: "DELETE",
    },
  );
}

export function listSponsors() {
  return authFetch<SponsorOption[]>("/api/sponsors");
}
