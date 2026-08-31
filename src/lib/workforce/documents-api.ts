import { authDownload, authFetch, authPreviewBlob } from "../auth/api";

export type CatalogStatus = "Active" | "Disabled" | "Archived";

export type DocumentType = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  appliesToSponsoredInternal: boolean;
  appliesToOutsideRider: boolean;
  appliesToRiderProfile: boolean;
  requiresNumber: boolean;
  requiresIssueDate: boolean;
  requiresExpiryDate: boolean;
  requiresFile: boolean;
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
  status: CatalogStatus;
  rowVersion: string;
};

export type DocumentRequirement = {
  id: string;
  documentTypeId: string;
  documentTypeCode: string;
  relationshipType: "SponsoredInternal" | "OutsideRider" | null;
  appliesToRiderProfile: boolean;
  isRequired: boolean;
  reminderOffsetsDays: number[];
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null;
  status: CatalogStatus;
  rowVersion: string;
};

export type EmployeeDocument = {
  id: string;
  employeeId: string;
  documentTypeId: string;
  documentTypeCode: string;
  documentTypeNameAr: string;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  status: "Active" | "Expired" | "Superseded" | "Archived";
  notes: string | null;
  currentVersionId: string | null;
  currentVersionNumber: number | null;
  currentFileName: string | null;
  currentContentType: string | null;
  currentFileSizeBytes: number | null;
  rowVersion: string;
};

export type DocumentFulfillmentStatus =
  | "Missing"
  | "Optional"
  | "Incomplete"
  | "Expired"
  | "Complete";

export type StaffDocumentChecklistItem = {
  documentTypeId: string;
  documentTypeCode: string;
  documentTypeNameAr: string;
  documentTypeNameEn: string;
  requiresNumber: boolean;
  requiresIssueDate: boolean;
  requiresExpiryDate: boolean;
  requiresFile: boolean;
  isRequired: boolean;
  reminderOffsetsDays: number[];
  fulfillmentStatus: DocumentFulfillmentStatus;
  missingFields: Array<
    | "document"
    | "activeDocument"
    | "documentNumber"
    | "issueDate"
    | "expiryDate"
    | "validExpiryDate"
    | "file"
  >;
  documents: EmployeeDocument[];
};

export type DocumentTypeInput = {
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  appliesToSponsoredInternal: boolean;
  appliesToOutsideRider: boolean;
  appliesToRiderProfile: boolean;
  requiresNumber: boolean;
  requiresIssueDate: boolean;
  requiresExpiryDate: boolean;
  requiresFile: boolean;
  allowedMimeTypes: string[];
  maxFileSizeBytes: number;
  status: CatalogStatus;
  rowVersion?: string | null;
};

export type DocumentRequirementInput = {
  documentTypeId: string;
  relationshipType: "SponsoredInternal" | "OutsideRider" | null;
  appliesToRiderProfile: boolean;
  isRequired: boolean;
  reminderOffsetsDays: number[];
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: CatalogStatus;
  rowVersion?: string | null;
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

// Document Definition Administration APIs
export function getDocumentTypes() {
  return authFetch<DocumentType[]>("/api/hr-catalogs/document-types");
}

export function createDocumentType(payload: DocumentTypeInput) {
  return authFetch<DocumentType>("/api/hr-catalogs/document-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDocumentType(id: string, payload: DocumentTypeInput) {
  return authFetch<DocumentType>(`/api/hr-catalogs/document-types/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Assignment Administration APIs
export function getDocumentRequirements(documentTypeId?: string) {
  const query = documentTypeId ? `?documentTypeId=${encodeURIComponent(documentTypeId)}` : "";
  return authFetch<DocumentRequirement[]>(`/api/hr-catalogs/document-requirements${query}`);
}

export function createDocumentRequirement(payload: DocumentRequirementInput) {
  return authFetch<DocumentRequirement>("/api/hr-catalogs/document-requirements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDocumentRequirement(id: string, payload: DocumentRequirementInput) {
  return authFetch<DocumentRequirement>(`/api/hr-catalogs/document-requirements/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Staff Checklist APIs
export function getEmployeeChecklist(employeeId: string) {
  return authFetch<StaffDocumentChecklistItem[]>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents/checklist`
  );
}

export function getRiderChecklist(riderProfileId: string) {
  return authFetch<StaffDocumentChecklistItem[]>(
    `/api/riders/${encodeURIComponent(riderProfileId)}/documents/checklist`
  );
}

// Upload Documents (Multipart FormData)
export function uploadEmployeeChecklistDocument(employeeId: string, form: FormData) {
  return authFetch<EmployeeDocument>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents`,
    { method: "POST", body: form }
  );
}

export function uploadRiderChecklistDocument(riderProfileId: string, form: FormData) {
  return authFetch<EmployeeDocument>(
    `/api/riders/${encodeURIComponent(riderProfileId)}/documents`,
    { method: "POST", body: form }
  );
}

// Existing Document Actions
export function getEmployeeActualDocuments(employeeId: string) {
  return authFetch<EmployeeDocument[]>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents`
  );
}

export function uploadEmployeeDocumentVersion(
  employeeId: string,
  documentId: string,
  file: File
) {
  const form = new FormData();
  form.append("file", file);
  return authFetch<EmployeeDocument>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/versions`,
    { method: "POST", body: form }
  );
}

export function updateEmployeeDocumentMetadata(
  employeeId: string,
  documentId: string,
  metadata: {
    documentNumber?: string | null;
    issueDate?: string | null;
    expiryDate?: string | null;
    notes?: string | null;
  },
  rowVersion: string
) {
  return authFetch<EmployeeDocument>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ metadata, rowVersion }),
    }
  );
}

export function getEmployeeDocumentVersions(employeeId: string, documentId: string) {
  return authFetch<EmployeeDocumentVersion[]>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/versions`
  );
}

export function downloadEmployeeDocumentFile(
  employeeId: string,
  documentId: string,
  versionId?: string
) {
  return authDownload(
    `/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/download${
      versionId ? `?versionId=${encodeURIComponent(versionId)}` : ""
    }`
  );
}

export function previewEmployeeDocumentFile(
  employeeId: string,
  documentId: string,
  versionId?: string
) {
  return authPreviewBlob(
    `/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/preview${
      versionId ? `?versionId=${encodeURIComponent(versionId)}` : ""
    }`
  );
}

export function archiveEmployeeDocumentRecord(
  employeeId: string,
  documentId: string,
  reason: string,
  rowVersion: string
) {
  return authFetch<void>(
    `/api/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/archive`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason, rowVersion }),
    }
  );
}
