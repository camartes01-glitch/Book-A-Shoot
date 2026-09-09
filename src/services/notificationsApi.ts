/**
 * Backend notifications API integration.
 * Communicates directly with Camartes backend endpoints:
 * - GET /api/notifications
 * - GET /api/notifications/unread-count
 * - PUT /api/notifications/read
 * - PUT /api/notifications/{id}/read
 * - DELETE /api/notifications/{id}
 */
import { camartesFetch } from "./camartesClient";

export type BackendNotification = {
  id: number | string;
  type?: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  created_at?: string;
};

export async function fetchBackendNotifications(): Promise<BackendNotification[]> {
  const response = await camartesFetch<BackendNotification[]>(
    "/api/notifications",
    {},
    { requireAuth: true },
  );
  return Array.isArray(response) ? response : [];
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await camartesFetch<{ unread_count: number }>(
    "/api/notifications/unread-count",
    {},
    { requireAuth: true },
  );
  return response?.unread_count ?? 0;
}

export async function markAllAsRead(): Promise<void> {
  await camartesFetch(
    "/api/notifications/read",
    { method: "PUT" },
    { requireAuth: true },
  );
}

export async function markAsRead(notificationId: number | string): Promise<void> {
  await camartesFetch(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PUT" },
    { requireAuth: true },
  );
}

export async function deleteNotification(notificationId: number | string): Promise<void> {
  await camartesFetch(
    `/api/notifications/${encodeURIComponent(notificationId)}`,
    { method: "DELETE" },
    { requireAuth: true },
  );
}
