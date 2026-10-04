export type NotificationSeverity =
  | "Information"
  | "Success"
  | "Warning"
  | "Error"
  | "Critical";

export interface NotificationItem {
  id: string; // GUID
  eventType: string; // producer-defined, not a fixed enum
  severity: NotificationSeverity;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  sourceEntityType: string | null;
  sourceEntityId: string | null; // GUID
  deepLink: string | null;
  visibleAtUtc: string; // ISO 8601 timestamp
  expiresAtUtc: string | null;
  readAtUtc: string | null;
  acknowledgedAtUtc: string | null;
  archivedAtUtc: string | null;
  rowVersion: string; // opaque Base64 version
  permissionKeys: string[]; // [] for a personal notification
}

export interface NotificationQueryRequest {
  permissions?: string[] | null;
  unreadOnly?: boolean; // default false
  pageSize?: number; // default 50, valid range 1–200
  cursor?: string | null;
}

export interface NotificationFeed {
  items: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
  effectivePermissions: string[];
}

export type NotificationStateAction =
  | "read"
  | "unread"
  | "acknowledge"
  | "archive";

export interface NotificationStateRequest {
  action: NotificationStateAction;
  rowVersion: string;
}

export interface CreateNotificationRequest {
  recipientUserId: string; // existing user GUID
  eventType: string;
  severity: NotificationSeverity; // parsed case-insensitively
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  deepLink?: string | null;
  scopeSnapshotJson?: string | null; // JSON encoded as a string, when needed
  deduplicationKey: string;
  visibleAtUtc?: string | null; // defaults to server time
  expiresAtUtc?: string | null;
  permissionKeys?: string[] | null;
}

export interface NotificationUnreadCountResponse {
  count: number;
}

export interface NotificationReadAllRequest {
  permissions?: string[] | null;
}

export interface NotificationReadAllResponse {
  markedCount: number;
  readAtUtc: string; // ISO 8601 UTC timestamp assigned to newly read items
  effectivePermissions: string[];
}
