import { authFetch } from "../auth/api";
import type { AuditEntriesParams, AuditEntriesResponse, AuditEntry } from "./types";

export async function getAuditEntries(params: AuditEntriesParams = {}): Promise<AuditEntriesResponse> {
  const query = new URLSearchParams();
  if (params.actorUserId) {
    query.set("actorUserId", params.actorUserId);
    query.set("userId", params.actorUserId);
    query.set("actorId", params.actorUserId);
  } else if (params.userId) {
    query.set("userId", params.userId);
  }
  if (params.userName) query.set("userName", params.userName);
  if (params.entityType && params.entityType !== "ALL") query.set("entityType", params.entityType);
  if (params.entityId) query.set("entityId", params.entityId);
  if (params.action && params.action !== "ALL") query.set("action", params.action);
  if (params.correlationId) query.set("correlationId", params.correlationId);
  if (params.fromUtc) query.set("fromUtc", params.fromUtc);
  if (params.toUtc) query.set("toUtc", params.toUtc);
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.beforeSequence !== undefined && params.beforeSequence !== null && params.beforeSequence !== "") {
    query.set("beforeSequence", String(params.beforeSequence));
  }

  const qStr = query.toString();
  return authFetch<AuditEntriesResponse>(`/api/audit-entries${qStr ? `?${qStr}` : ""}`);
}

export async function getAuditEntry(eventId: string): Promise<AuditEntry> {
  return authFetch<AuditEntry>(`/api/audit-entries/${encodeURIComponent(eventId)}`);
}
