import { authDownload, authFetch } from "../auth/api";

export type PersonType = "Employee" | "Rider" | "External";
export type SponsorPartyRole = "Claimant" | "Defendant";
export type CaseStatus = "Open" | "InProgress" | "Suspended" | "Closed";
export type HearingStatus = "Scheduled" | "Completed" | "Postponed" | "Cancelled";

export interface LegalCaseSummary {
  id: string;
  caseNumber: string;
  personType: PersonType;
  personName: string | null;
  employeeId: string | null;
  riderProfileId: string | null;
  sponsorId: string;
  sponsorNameAr?: string | null;
  sponsorNameEn?: string | null;
  sponsorPartyRole: SponsorPartyRole;
  caseDate: string; // YYYY-MM-DD (Riyadh local)
  caseTime: string; // HH:mm:ss (Riyadh local)
  status: CaseStatus;
  details: string;
  notes: string | null;
  responsibleUserId: string;
  responsibleUserName?: string | null;
  hearingsCount?: number;
  rowVersion: string;
  createdAtUtc?: string;
}

export interface HearingFile {
  id: string;
  hearingId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  description?: string | null;
  uploadedAtUtc: string;
  uploadedByUserId?: string | null;
  uploadedByUserName?: string | null;
  rowVersion?: string;
}

export interface LegalCaseHearing {
  id: string;
  caseId: string;
  hearingNumber: number;
  hearingDate: string; // YYYY-MM-DD (Riyadh local)
  hearingTime: string; // HH:mm:ss (Riyadh local)
  status: HearingStatus;
  details: string;
  notes?: string | null;
  location?: string | null;
  files?: HearingFile[];
  rowVersion: string;
  createdAtUtc?: string;
}

export interface ResolvedParty {
  name: string;
  type: "Sponsor" | "Person";
  details?: string | null;
}

export interface LegalCaseDetail extends LegalCaseSummary {
  claimant?: ResolvedParty | null;
  defendant?: ResolvedParty | null;
  hearings: LegalCaseHearing[];
}

export interface LegalCaseHistoryItem {
  id: string;
  caseId: string;
  changeType: string;
  changedFields?: string[] | string | null;
  beforeJson?: string | null;
  afterJson?: string | null;
  changeReason?: string | null;
  actor?: string | null;
  actorName?: string | null;
  changedByUserId?: string | null;
  timestamp?: string | null;
  createdAtUtc?: string | null;
}

export interface PagedLegalCasesResponse {
  items: LegalCaseSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export interface ListLegalCasesParams {
  search?: string;
  status?: CaseStatus | "";
  sponsorId?: string;
  employeeId?: string;
  riderProfileId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateLegalCaseRequest {
  caseNumber: string;
  personType: PersonType;
  personName?: string | null;
  employeeId?: string | null;
  riderProfileId?: string | null;
  sponsorId: string;
  sponsorPartyRole: SponsorPartyRole;
  caseDate: string;
  caseTime: string;
  status: CaseStatus;
  details: string;
  notes?: string | null;
  responsibleUserId: string;
  rowVersion?: string | null;
  changeReason?: string | null;
}

export interface UpdateLegalCaseRequest {
  caseNumber: string;
  personType: PersonType;
  personName?: string | null;
  employeeId?: string | null;
  riderProfileId?: string | null;
  sponsorId: string;
  sponsorPartyRole: SponsorPartyRole;
  caseDate: string;
  caseTime: string;
  status: CaseStatus;
  details: string;
  notes?: string | null;
  responsibleUserId: string;
  rowVersion: string;
  changeReason: string;
}

export interface ArchiveLegalCaseRequest {
  rowVersion: string;
  reason: string;
}

export interface CreateHearingRequest {
  hearingDate: string;
  hearingTime: string;
  status: HearingStatus;
  details: string;
  notes?: string | null;
  location?: string | null;
  rowVersion?: string | null;
  changeReason?: string | null;
}

export interface UpdateHearingRequest {
  hearingDate: string;
  hearingTime: string;
  status: HearingStatus;
  details: string;
  notes?: string | null;
  location?: string | null;
  rowVersion: string;
  changeReason: string;
}

export interface ArchiveHearingRequest {
  rowVersion: string;
  reason: string;
}

export interface ArchiveHearingFileRequest {
  rowVersion?: string;
  reason?: string;
}

// API Functions

export async function listLegalCases(
  params: ListLegalCasesParams = {}
): Promise<PagedLegalCasesResponse> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status) query.set("status", params.status);
  if (params.sponsorId) query.set("sponsorId", params.sponsorId);
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.riderProfileId) query.set("riderProfileId", params.riderProfileId);
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const raw = await authFetch<PagedLegalCasesResponse | LegalCaseSummary[]>(
    `/api/hr/legal-cases${queryString}`
  );

  // Normalize response in case backend returns an array or paged object
  if (Array.isArray(raw)) {
    return {
      items: raw,
      totalCount: raw.length,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      totalPages: Math.ceil(raw.length / (params.pageSize || 50)),
    };
  }

  return {
    items: raw.items || [],
    totalCount: raw.totalCount ?? (raw.items ? raw.items.length : 0),
    page: raw.page || params.page || 1,
    pageSize: raw.pageSize || params.pageSize || 50,
    totalPages:
      raw.totalPages ??
      Math.ceil((raw.totalCount || 0) / (raw.pageSize || params.pageSize || 50)),
  };
}

export function getLegalCase(id: string): Promise<LegalCaseDetail> {
  return authFetch<LegalCaseDetail>(`/api/hr/legal-cases/${encodeURIComponent(id)}`);
}

export function createLegalCase(payload: CreateLegalCaseRequest): Promise<LegalCaseDetail> {
  return authFetch<LegalCaseDetail>("/api/hr/legal-cases", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء القضية بنجاح",
  });
}

export function updateLegalCase(
  id: string,
  payload: UpdateLegalCaseRequest
): Promise<LegalCaseDetail> {
  return authFetch<LegalCaseDetail>(`/api/hr/legal-cases/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث القضية بنجاح",
  });
}

export function archiveLegalCase(
  id: string,
  payload: ArchiveLegalCaseRequest
): Promise<void> {
  return authFetch<void>(`/api/hr/legal-cases/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify(payload),
    notifySuccess: "تم أرشفة القضية بنجاح",
  });
}

export function getLegalCaseHistory(id: string): Promise<LegalCaseHistoryItem[]> {
  return authFetch<LegalCaseHistoryItem[]>(
    `/api/hr/legal-cases/${encodeURIComponent(id)}/history`
  );
}

// Hearing APIs

export function createHearing(
  caseId: string,
  payload: CreateHearingRequest
): Promise<LegalCaseHearing> {
  return authFetch<LegalCaseHearing>(
    `/api/hr/legal-cases/${encodeURIComponent(caseId)}/hearings`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تمت إضافة الجلسة بنجاح",
    }
  );
}

export function updateHearing(
  caseId: string,
  hearingId: string,
  payload: UpdateHearingRequest
): Promise<LegalCaseHearing> {
  return authFetch<LegalCaseHearing>(
    `/api/hr/legal-cases/${encodeURIComponent(caseId)}/hearings/${encodeURIComponent(
      hearingId
    )}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      notifySuccess: "تم تحديث بيانات الجلسة بنجاح",
    }
  );
}

export function archiveHearing(
  caseId: string,
  hearingId: string,
  payload: ArchiveHearingRequest
): Promise<void> {
  return authFetch<void>(
    `/api/hr/legal-cases/${encodeURIComponent(caseId)}/hearings/${encodeURIComponent(
      hearingId
    )}`,
    {
      method: "DELETE",
      body: JSON.stringify(payload),
      notifySuccess: "تم أرشفة الجلسة بنجاح",
    }
  );
}

// Hearing Files APIs

export async function uploadHearingFile(
  caseId: string,
  hearingId: string,
  file: File,
  description?: string
): Promise<HearingFile> {
  const formData = new FormData();
  formData.append("file", file);
  if (description?.trim()) {
    formData.append("description", description.trim());
  }

  return authFetch<HearingFile>(
    `/api/hr/legal-cases/${encodeURIComponent(caseId)}/hearings/${encodeURIComponent(
      hearingId
    )}/files`,
    {
      method: "POST",
      body: formData,
      notifySuccess: "تم رفع الملف بنجاح",
    }
  );
}

export function downloadHearingFile(
  caseId: string,
  hearingId: string,
  fileId: string
) {
  return authDownload(
    `/api/hr/legal-cases/${encodeURIComponent(caseId)}/hearings/${encodeURIComponent(
      hearingId
    )}/files/${encodeURIComponent(fileId)}/download`
  );
}

export function archiveHearingFile(
  caseId: string,
  hearingId: string,
  fileId: string,
  payload?: ArchiveHearingFileRequest
): Promise<void> {
  return authFetch<void>(
    `/api/hr/legal-cases/${encodeURIComponent(caseId)}/hearings/${encodeURIComponent(
      hearingId
    )}/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      body: payload ? JSON.stringify(payload) : undefined,
      notifySuccess: "تم حذف الملف بنجاح",
    }
  );
}
