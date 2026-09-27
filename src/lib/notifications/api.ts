import { authFetch } from "../auth/api";
import type {
  CreateNotificationRequest,
  NotificationFeed,
  NotificationItem,
  NotificationQueryRequest,
  NotificationStateAction,
  NotificationUnreadCountResponse,
} from "./types";

/**
 * Query notifications feed with items, nextCursor, unreadCount, and effectivePermissions.
 * Uses POST /api/notifications/query.
 */
export async function queryNotifications(
  request: NotificationQueryRequest = {},
  options?: { suppressErrorToast?: boolean }
): Promise<NotificationFeed> {
  return authFetch<NotificationFeed>("/api/notifications/query", {
    method: "POST",
    body: JSON.stringify(request),
    suppressErrorToast: options?.suppressErrorToast,
  });
}

/**
 * Load notifications with GET /api/notifications.
 */
export async function getNotifications(params?: {
  permissions?: string[] | null;
  unreadOnly?: boolean;
  pageSize?: number;
  cursor?: string | null;
}): Promise<{ items: NotificationItem[]; nextCursor: string | null }> {
  const query = new URLSearchParams();
  if (params?.permissions) {
    for (const p of params.permissions) {
      query.append("permissions", p);
    }
  }
  if (params?.unreadOnly !== undefined) {
    query.set("unreadOnly", String(params.unreadOnly));
  }
  if (params?.pageSize !== undefined) {
    query.set("pageSize", String(params.pageSize));
  }
  if (params?.cursor) {
    query.set("cursor", params.cursor);
  }
  const qs = query.toString();
  return authFetch<{ items: NotificationItem[]; nextCursor: string | null }>(
    `/api/notifications${qs ? `?${qs}` : ""}`
  );
}

/**
 * Fetch total unread notifications count with GET /api/notifications/unread-count.
 */
export async function getUnreadCount(
  permissions?: string[] | null
): Promise<number> {
  const query = new URLSearchParams();
  if (permissions) {
    for (const p of permissions) {
      query.append("permissions", p);
    }
  }
  const qs = query.toString();
  const res = await authFetch<NotificationUnreadCountResponse>(
    `/api/notifications/unread-count${qs ? `?${qs}` : ""}`,
    { suppressErrorToast: true }
  );
  return res.count;
}

/**
 * Update notification state (read, unread, acknowledge, archive).
 * Uses POST /api/notifications/{id}/state.
 * Requires latest rowVersion. Returns updated NotificationItem.
 */
export async function updateNotificationState(
  id: string,
  action: NotificationStateAction,
  rowVersion: string,
  options?: { suppressErrorToast?: boolean }
): Promise<NotificationItem> {
  return authFetch<NotificationItem>(
    `/api/notifications/${encodeURIComponent(id)}/state`,
    {
      method: "POST",
      body: JSON.stringify({ action, rowVersion }),
      suppressErrorToast: options?.suppressErrorToast,
    }
  );
}

/**
 * Create a notification for a user (administrative UI).
 * Requires 'notifications.manage' permission.
 * Uses POST /api/notifications.
 */
export async function createNotification(
  payload: CreateNotificationRequest
): Promise<NotificationItem> {
  return authFetch<NotificationItem>("/api/notifications", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء الإشعار بنجاح",
  });
}
