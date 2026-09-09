/**
 * Notifications store (spec section 48).
 * Real backend notification integration via `/api/notifications`.
 * Falls back non-authoritatively to AsyncStorage when offline or in DEMO mode.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppNotification } from "@/src/types/booking";
import { getAuthToken } from "@/src/services/camartesClient";
import { isDemoAuthMode } from "@/src/config/authMode";
import {
  fetchBackendNotifications,
  fetchUnreadCount,
  markAllAsRead as apiMarkAllAsRead,
  markAsRead as apiMarkAsRead,
  type BackendNotification,
} from "@/src/services/notificationsApi";

const KEY = "camartes-customer:notifications:v1";
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function mapBackendNotification(n: BackendNotification): AppNotification {
  return {
    id: String(n.id),
    title: n.title,
    body: n.message,
    createdAt: n.created_at || new Date().toISOString(),
    read: Boolean(n.read),
    bookingId:
      (n.data?.booking_id as string | undefined) ||
      (n.data?.request_id as string | undefined) ||
      undefined,
  };
}

export async function getNotifications(): Promise<AppNotification[]> {
  const token = await getAuthToken();
  if (token && !isDemoAuthMode()) {
    try {
      const remote = await fetchBackendNotifications();
      if (Array.isArray(remote)) {
        const mapped = remote.map(mapBackendNotification);
        await AsyncStorage.setItem(KEY, JSON.stringify(mapped));
        return mapped.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      }
    } catch {
      // Fall back gracefully to cached local notifications
    }
  }

  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as AppNotification[]) : [];
    return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function addNotification(notification: AppNotification): Promise<void> {
  const list = await getNotifications();
  await AsyncStorage.setItem(KEY, JSON.stringify([notification, ...list].slice(0, 100)));
  notifyListeners();
}

export async function markAllRead(): Promise<void> {
  const token = await getAuthToken();
  if (token && !isDemoAuthMode()) {
    try {
      await apiMarkAllAsRead();
    } catch {
      // non-blocking
    }
  }
  const list = await getNotifications();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.map((n) => ({ ...n, read: true }))));
  notifyListeners();
}

export async function markNotificationRead(id: string): Promise<void> {
  const token = await getAuthToken();
  if (token && !isDemoAuthMode() && /^\d+$/.test(id)) {
    try {
      await apiMarkAsRead(id);
    } catch {
      // non-blocking
    }
  }
  const list = await getNotifications();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.map((n) => (n.id === id ? { ...n, read: true } : n))));
  notifyListeners();
}

export async function unreadCount(): Promise<number> {
  const token = await getAuthToken();
  if (token && !isDemoAuthMode()) {
    try {
      const count = await fetchUnreadCount();
      if (typeof count === "number") {
        return count;
      }
    } catch {
      // fallback
    }
  }
  const list = await getNotifications();
  return list.filter((n) => !n.read).length;
}
