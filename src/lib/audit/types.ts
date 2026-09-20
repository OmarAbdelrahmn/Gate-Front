export interface AuditActor {
  userId?: string | null;
  actorType?: string;
  userName?: string | null;
  displayNameAr?: string | null;
  displayNameEn?: string | null;
  employeeId?: string | null;
  status?: string | null;
}

export interface AuditRecord {
  entityType: string;
  entityId: string;
  displayLabel?: string | null;
  displayCode?: string | null;
}

export interface AuditChange {
  field: string;
  before?: any;
  after?: any;
}

export interface AuditRequestEvidence {
  sessionId?: string | null;
  supportAccessGrantId?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: string | null;
}

export interface AuditEntry {
  eventId: string;
  sequence: number;
  actorUserId?: string | null;
  actorType: string;
  action: string;
  category: string;
  entityType: string;
  entityId: string;
  occurredAtUtc: string;
  correlationId?: string | null;
  reason?: string | null;
  beforeJson?: string | null;
  afterJson?: string | null;
  source?: string | null;
  schemaVersion?: number;
  actor?: AuditActor | null;
  record?: AuditRecord | null;
  changes?: AuditChange[] | null;
  request?: AuditRequestEvidence | null;
}

export interface AuditEntriesParams {
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  correlationId?: string;
  fromUtc?: string;
  toUtc?: string;
  pageSize?: number;
  beforeSequence?: number | string | null;
}

export interface AuditEntriesResponse {
  items: AuditEntry[];
  nextCursor?: string | number | null;
}
