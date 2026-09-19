import { authFetch, authDownload } from "../auth/api";
import type {
  LeaveTypeResponse,
  LeaveTypeUpsertRequest,
  LeaveWorkflow,
  LeaveRequestResponse,
  LeaveRequestUpsertRequest,
  LeaveDateChangeRequest,
  LeaveDateChangeCreateRequest,
  LeaveDateChangeResolveRequest,
  LeaveCancellationRequest,
  LeaveCancellationResolveRequest,
  LeaveDocumentResponse,
  LeaveDocumentVersionResponse,
  LeaveDocumentMetadataUpdateRequest,
} from "./leave-types";

export type HrRow = { id: string; rowVersion?: string; [key: string]: unknown };
export type HrPayload = Record<string, unknown>;

const catalogBase = "/api/hr-catalogs";
const workflowBase = "/api/hr-workflows";

export const hrCatalogApi = {
  list: (resource: string, query = "") => authFetch<HrRow[]>(`${catalogBase}/${resource}${query}`),
  create: (resource: string, payload: HrPayload) => authFetch<HrRow>(`${catalogBase}/${resource}`, { method: "POST", body: JSON.stringify(payload) }),
  update: (resource: string, id: string, payload: HrPayload) => authFetch<HrRow>(`${catalogBase}/${resource}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),
  setJobTitleWorkTypes: (id: string, operationalWorkTypeIds: string[]) => authFetch<void>(`${catalogBase}/job-titles/${encodeURIComponent(id)}/operational-work-types`, { method: "PUT", body: JSON.stringify({ operationalWorkTypeIds }) }),
};

export const hrWorkflowApi = {
  // Generic methods
  list: (resource: string, employeeId?: string) => authFetch<HrRow[]>(`${workflowBase}/${resource}${employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""}`),
  create: (resource: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/${resource}`, { method: "POST", body: JSON.stringify(payload) }),
  update: (resource: string, id: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/${resource}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),

  // Leave Types
  getLeaveTypes: () => authFetch<LeaveTypeResponse[]>(`${workflowBase}/leave-types`),
  createLeaveType: (payload: LeaveTypeUpsertRequest) => authFetch<LeaveTypeResponse>(`${workflowBase}/leave-types`, { method: "POST", body: JSON.stringify(payload) }),
  updateLeaveType: (id: string, payload: LeaveTypeUpsertRequest) => authFetch<LeaveTypeResponse>(`${workflowBase}/leave-types/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),

  // Workflows
  getWorkflows: () => authFetch<LeaveWorkflow[]>(`${workflowBase}/leave-approval-workflows`),
  createWorkflow: (payload: HrPayload) => authFetch<LeaveWorkflow>(`${workflowBase}/leave-approval-workflows`, { method: "POST", body: JSON.stringify(payload) }),
  updateWorkflow: (id: string, payload: HrPayload) => authFetch<LeaveWorkflow>(`${workflowBase}/leave-approval-workflows/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),

  // Leave Requests
  getLeaveRequests: (employeeId?: string) => authFetch<LeaveRequestResponse[]>(`${workflowBase}/leave-requests${employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""}`),
  createLeaveRequest: (payload: LeaveRequestUpsertRequest) => authFetch<LeaveRequestResponse>(`${workflowBase}/leave-requests`, { method: "POST", body: JSON.stringify(payload) }),
  updateLeaveRequest: (id: string, payload: LeaveRequestUpsertRequest) => authFetch<LeaveRequestResponse>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),

  // Transitions & Decisions
  leaveTransition: (id: string, action: string, comment: string, rowVersion?: string) => authFetch<LeaveRequestResponse>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/transitions`, { method: "POST", body: JSON.stringify({ action, comment, rowVersion: rowVersion || null }) }),
  forceCancelLeave: (id: string, comment: string, rowVersion?: string) => authFetch<LeaveRequestResponse>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/force-cancel`, { method: "POST", body: JSON.stringify({ action: "force-cancel", comment, rowVersion: rowVersion || null }) }),
  decideLeave: (id: string, action: "approve" | "reject" | "return", comment: string, rowVersion?: string) => authFetch<LeaveRequestResponse>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/approval-decisions`, { method: "POST", body: JSON.stringify({ action, comment, rowVersion: rowVersion || null }) }),

  // Date Change Requests
  listDateChanges: (id: string) => authFetch<LeaveDateChangeRequest[]>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/date-change-requests`),
  createDateChange: (id: string, payload: LeaveDateChangeCreateRequest) => authFetch<LeaveDateChangeRequest>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/date-change-requests`, { method: "POST", body: JSON.stringify(payload) }),
  resolveDateChange: (id: string, changeId: string, payload: LeaveDateChangeResolveRequest) => authFetch<LeaveDateChangeRequest>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/date-change-requests/${encodeURIComponent(changeId)}/resolve`, { method: "POST", body: JSON.stringify(payload) }),

  // Cancellation Requests
  listCancellations: (id: string) => authFetch<LeaveCancellationRequest[]>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/cancellation-requests`),
  createCancellation: (id: string, reason: string) => authFetch<LeaveCancellationRequest>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/cancellation-requests`, { method: "POST", body: JSON.stringify({ reason }) }),
  resolveCancellation: (id: string, cancellationId: string, payload: LeaveCancellationResolveRequest) => authFetch<LeaveCancellationRequest>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/cancellation-requests/${encodeURIComponent(cancellationId)}/resolve`, { method: "POST", body: JSON.stringify(payload) }),

  // Leave Documents
  listDocuments: (leaveRequestId: string) => authFetch<LeaveDocumentResponse[]>(`${workflowBase}/leave-requests/${encodeURIComponent(leaveRequestId)}/documents`),
  uploadDocument: (leaveRequestId: string, formData: FormData) => authFetch<LeaveDocumentResponse>(`${workflowBase}/leave-requests/${encodeURIComponent(leaveRequestId)}/documents`, { method: "POST", body: formData }),
  uploadDocumentVersion: (leaveRequestId: string, documentId: string, formData: FormData) => authFetch<LeaveDocumentResponse>(`${workflowBase}/leave-requests/${encodeURIComponent(leaveRequestId)}/documents/${encodeURIComponent(documentId)}/versions`, { method: "POST", body: formData }),
  updateDocumentMetadata: (leaveRequestId: string, documentId: string, payload: LeaveDocumentMetadataUpdateRequest) => authFetch<LeaveDocumentResponse>(`${workflowBase}/leave-requests/${encodeURIComponent(leaveRequestId)}/documents/${encodeURIComponent(documentId)}`, { method: "PUT", body: JSON.stringify(payload) }),
  listDocumentVersions: (leaveRequestId: string, documentId: string) => authFetch<LeaveDocumentVersionResponse[]>(`${workflowBase}/leave-requests/${encodeURIComponent(leaveRequestId)}/documents/${encodeURIComponent(documentId)}/versions`),
  downloadDocument: (leaveRequestId: string, documentId: string, versionId?: string) => authDownload(`${workflowBase}/leave-requests/${encodeURIComponent(leaveRequestId)}/documents/${encodeURIComponent(documentId)}/download${versionId ? `?versionId=${encodeURIComponent(versionId)}` : ""}`),
  archiveDocument: (leaveRequestId: string, documentId: string, reason: string, rowVersion: string) => authFetch<void>(`${workflowBase}/leave-requests/${encodeURIComponent(leaveRequestId)}/documents/${encodeURIComponent(documentId)}/archive`, { method: "PATCH", body: JSON.stringify({ reason, rowVersion }) }),

  // Absence & Status Changes
  transitionAbsence: (id: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/absence-cases/${encodeURIComponent(id)}/transitions`, { method: "POST", body: JSON.stringify(payload) }),
  resolveStatusChange: (id: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/employee-status-change-requests/${encodeURIComponent(id)}/resolve`, { method: "POST", body: JSON.stringify(payload) }),
};
