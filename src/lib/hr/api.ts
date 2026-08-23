import { authFetch } from "../auth/api";

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
  list: (resource: string, employeeId?: string) => authFetch<HrRow[]>(`${workflowBase}/${resource}${employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""}`),
  create: (resource: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/${resource}`, { method: "POST", body: JSON.stringify(payload) }),
  update: (resource: string, id: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/${resource}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),
  leaveTransition: (id: string, action: string, comment: string, rowVersion?: string) => authFetch<HrRow>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/transitions`, { method: "POST", body: JSON.stringify({ action, comment, rowVersion: rowVersion || null }) }),
  forceCancelLeave: (id: string, comment: string, rowVersion?: string) => authFetch<HrRow>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/force-cancel`, { method: "POST", body: JSON.stringify({ action: "force-cancel", comment, rowVersion: rowVersion || null }) }),
  decideLeave: (id: string, action: "approve" | "reject" | "return", comment: string, rowVersion?: string) => authFetch<HrRow>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/approval-decisions`, { method: "POST", body: JSON.stringify({ action, comment, rowVersion: rowVersion || null }) }),
  listDateChanges: (id: string) => authFetch<HrRow[]>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/date-change-requests`),
  createDateChange: (id: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/date-change-requests`, { method: "POST", body: JSON.stringify(payload) }),
  resolveDateChange: (id: string, changeId: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/date-change-requests/${encodeURIComponent(changeId)}/resolve`, { method: "POST", body: JSON.stringify(payload) }),
  listCancellations: (id: string) => authFetch<HrRow[]>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/cancellation-requests`),
  createCancellation: (id: string, reason: string) => authFetch<HrRow>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/cancellation-requests`, { method: "POST", body: JSON.stringify({ reason }) }),
  resolveCancellation: (id: string, cancellationId: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/leave-requests/${encodeURIComponent(id)}/cancellation-requests/${encodeURIComponent(cancellationId)}/resolve`, { method: "POST", body: JSON.stringify(payload) }),
  transitionAbsence: (id: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/absence-cases/${encodeURIComponent(id)}/transitions`, { method: "POST", body: JSON.stringify(payload) }),
  resolveStatusChange: (id: string, payload: HrPayload) => authFetch<HrRow>(`${workflowBase}/employee-status-change-requests/${encodeURIComponent(id)}/resolve`, { method: "POST", body: JSON.stringify(payload) }),
};
