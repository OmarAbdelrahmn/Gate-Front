import { authDownload, authFetch, authPreviewBlob } from "../auth/api";

export type ExpiringRecord = {
  id: string;
  expiryDate: string | null;
  status: string;
  notes: string | null;
  rowVersion: string;
};

export type ResidencyPermit = ExpiringRecord & {
  sponsorId: string | null;
  sponsorNameAr: string | null;
  residencyProfessionId: string;
  residencyProfessionAr: string;
  permitNumberMasked: string;
  issueDate: string | null;
  isCurrent: boolean;
};

export type DriverLicense = ExpiringRecord & {
  driverLicenseCategoryId: string;
  categoryAr: string;
  licenseNumberMasked: string | null;
  issueDate: string | null;
  bookingStatus: string;
  issuanceStatus: string;
  licenseStatus: string;
  isCurrent: boolean;
};

export type RiderCard = ExpiringRecord & {
  cardNumber: string;
  cardType: string;
  validityCycle: string;
  issueDate: string | null;
  isCurrent: boolean;
  previousCardId: string | null;
  employeeDocumentId: string | null;
};

export type HealthCard = ExpiringRecord & {
  cardNumberMasked: string;
  cardType: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  isCurrent: boolean;
  previousCardId: string | null;
  employeeDocumentId: string | null;
};

export type EmployeeDocument = ExpiringRecord & {
  documentTypeCode: string;
  documentTypeNameAr: string;
  documentNumber: string | null;
  issuingCountryCode: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  currentFileName: string | null;
  currentContentType: string | null;
  currentFileSizeBytes: number | null;
};
export type EmployeeDocumentVersion = {
  id: string;
  employeeDocumentId: string;
  versionNumber: number;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  uploadedByUserId: string;
  uploadedAtUtc: string;
};
export type RiderDocumentKind = "residency-permit" | "driver-license" | "rider-card" | "health-card" | "promissory-note" | "medical-insurance" | "ajeer-contract";

export function getResidencyPermits(employeeId: string) {
  return authFetch<ResidencyPermit[]>(
    `/api/compliance/residency-permits?employeeId=${encodeURIComponent(employeeId)}`,
  );
}

export function getFullResidencyPermitNumber(id: string) {
  return authFetch<{ id: string; permitNumber: string }>(
    `/api/compliance/residency-permits/${encodeURIComponent(id)}/sensitive`,
  );
}

export function getDriverLicenses(employeeId: string) {
  return authFetch<DriverLicense[]>(
    `/api/compliance/driver-licenses?employeeId=${encodeURIComponent(employeeId)}`,
  );
}

export function getRiderCards(riderProfileId: string) {
  return authFetch<RiderCard[]>(
    `/api/riders/${encodeURIComponent(riderProfileId)}/cards`,
  );
}

export function getHealthCards(riderProfileId: string) {
  return authFetch<HealthCard[]>(
    `/api/riders/${encodeURIComponent(riderProfileId)}/health-cards`,
  );
}

export function getEmployeeDocuments(employeeId: string) {
  return authFetch<EmployeeDocument[]>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents`,
  );
}

export function updateResidencyPermit(
  employeeId: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return authFetch<ResidencyPermit>(
    `/api/compliance/employees/${encodeURIComponent(employeeId)}/residency-permits/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export function updateDriverLicense(
  employeeId: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return authFetch<DriverLicense>(
    `/api/compliance/employees/${encodeURIComponent(employeeId)}/driver-licenses/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export function updateRiderCard(
  riderProfileId: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return authFetch<RiderCard>(
    `/api/riders/${encodeURIComponent(riderProfileId)}/cards/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export function updateHealthCard(
  riderProfileId: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return authFetch<HealthCard>(
    `/api/riders/${encodeURIComponent(riderProfileId)}/health-cards/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export function updateEmployeeDocument(
  employeeId: string,
  id: string,
  metadata: Record<string, unknown>,
  rowVersion: string,
) {
  return authFetch<EmployeeDocument>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify({ metadata, rowVersion }) },
  );
}

export function uploadEmployeeDocument(employeeId: string, form: FormData) {
  return authFetch<EmployeeDocument>(`/api/employees/${encodeURIComponent(employeeId)}/documents`, { method: "POST", body: form });
}
export function uploadRiderDocument(riderProfileId: string, kind: RiderDocumentKind, form: FormData) {
  return authFetch<EmployeeDocument>(`/api/riders/${encodeURIComponent(riderProfileId)}/documents/${kind}`, { method: "POST", body: form });
}
export function uploadEmployeeDocumentVersion(employeeId: string, documentId: string, file: File) {
  const form = new FormData(); form.append("file", file);
  return authFetch<EmployeeDocument>(`/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/versions`, { method: "POST", body: form });
}
export function getEmployeeDocumentVersions(employeeId: string, documentId: string) {
  return authFetch<EmployeeDocumentVersion[]>(`/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/versions`);
}
export function downloadEmployeeDocument(employeeId: string, documentId: string, versionId?: string) {
  return authDownload(`/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/download${versionId ? `?versionId=${encodeURIComponent(versionId)}` : ""}`);
}
export function previewEmployeeDocument(employeeId: string, documentId: string, versionId?: string) {
  return authPreviewBlob(`/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/preview${versionId ? `?versionId=${encodeURIComponent(versionId)}` : ""}`);
}
export function archiveEmployeeDocument(employeeId: string, documentId: string, reason: string, rowVersion: string) {
  return authFetch<void>(`/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/archive`, { method: "PATCH", body: JSON.stringify({ reason, rowVersion }) });
}

export type InsuranceCompany = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  providerRegistrationNumber: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: string;
  notes: string | null;
  rowVersion: string;
};

export type InsuranceCompanyInput = {
  code: string;
  nameAr: string;
  nameEn?: string | null;
  providerRegistrationNumber?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  status: string;
  notes?: string | null;
  rowVersion: string | null;
};

export type InsurancePlan = {
  id: string;
  insuranceCompanyId: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  rank: number;
  networkName: string | null;
  coverageClass: string | null;
  annualCoverageLimit: number | null;
  deductiblePercentage: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  rowVersion: string;
};

export type InsurancePlanInput = {
  code: string;
  nameAr: string;
  nameEn?: string | null;
  rank: number;
  networkName?: string | null;
  coverageClass?: string | null;
  annualCoverageLimit?: number | null;
  deductiblePercentage?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: string;
  rowVersion: string | null;
};

export type InsurancePolicy = ExpiringRecord & {
  employeeId?: string;
  insuranceCompanyId: string;
  insuranceCompanyAr: string;
  insuranceCompanyEn?: string | null;
  insurancePlanLevelId: string;
  insurancePlanAr: string;
  insurancePlanEn?: string | null;
  policyNumberMasked?: string | null;
  memberNumberMasked?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
  previousPolicyId?: string | null;
  employeeDocumentId?: string | null;
  notes?: string | null;
  rowVersion: string;
};

export type InsurancePolicyInput = {
  insuranceCompanyId: string;
  insurancePlanLevelId: string;
  policyNumber: string;
  memberNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
  previousPolicyId?: string | null;
  employeeDocumentId?: string | null;
  notes?: string | null;
  rowVersion: string | null;
};

// 1. List insurance companies
export const getInsuranceCompanies = () =>
  authFetch<InsuranceCompany[]>("/api/insurance/companies");

// 2. Create insurance company
export const createInsuranceCompany = (payload: InsuranceCompanyInput) =>
  authFetch<InsuranceCompany>("/api/insurance/companies", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// 3. Update insurance company
export const updateInsuranceCompany = (id: string, payload: InsuranceCompanyInput) =>
  authFetch<InsuranceCompany>(`/api/insurance/companies/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// 10. Archive insurance company
export const archiveInsuranceCompany = (id: string, reason: string, rowVersion: string) =>
  authFetch<void>(`/api/insurance/companies/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason, rowVersion }),
  });

// 4. List company plans
export const getInsurancePlans = (companyId: string) =>
  authFetch<InsurancePlan[]>(`/api/insurance/companies/${encodeURIComponent(companyId)}/plans`);

// 5. Create insurance plan
export const createInsurancePlan = (companyId: string, payload: InsurancePlanInput) =>
  authFetch<InsurancePlan>(`/api/insurance/companies/${encodeURIComponent(companyId)}/plans`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

// 6. Update insurance plan
export const updateInsurancePlan = (companyId: string, id: string, payload: InsurancePlanInput) =>
  authFetch<InsurancePlan>(`/api/insurance/companies/${encodeURIComponent(companyId)}/plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// 11. Archive insurance plan
export const archiveInsurancePlan = (id: string, reason: string, rowVersion: string) =>
  authFetch<void>(`/api/insurance/plans/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason, rowVersion }),
  });

// 7. List medical insurance policies
export const getInsurancePolicies = (employeeId?: string) =>
  authFetch<InsurancePolicy[]>(
    `/api/insurance/policies${employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""}`
  );

// 8. Create employee insurance policy
export const createInsurancePolicy = (employeeId: string, payload: InsurancePolicyInput | Record<string, unknown>) =>
  authFetch<InsurancePolicy>(`/api/insurance/employees/${encodeURIComponent(employeeId)}/policies`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

// 9. Update employee insurance policy
export const updateInsurancePolicy = (employeeId: string, id: string, payload: InsurancePolicyInput | Record<string, unknown>) =>
  authFetch<InsurancePolicy>(`/api/insurance/employees/${encodeURIComponent(employeeId)}/policies/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// 12. Archive insurance policy
export const archiveInsurancePolicy = (id: string, reason: string, rowVersion: string) =>
  authFetch<void>(`/api/insurance/policies/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason, rowVersion }),
  });

