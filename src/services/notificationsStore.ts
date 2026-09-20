/**
 * Notifications store (spec section 48).
 * Real backend notification integration via `/api/notifications`.
 * Falls back non-authoritatively to AsyncStorage when offline or in DEMO mode.
 * Persists read notification IDs locally so read state is 100% reliable.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppNotification, AppNotificationCategory } from "@/src/types/booking";
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
const READ_IDS_KEY = "camartes-customer:read_notification_ids:v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // Ignore
    }
  });
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function getReadNotificationIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set<string>(parsed || []);
  } catch {
    return new Set<string>();
  }
}

async function saveReadNotificationIds(set: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore
  }
}

function mapBackendNotification(n: BackendNotification): AppNotification {
  const notifId = String(n.id || (n as any).notification_id || (n as any)._id || Math.random());
  const data = (n.data as Record<string, unknown> | null) || {};

  const userId =
    (data.user_id as string | undefined) ||
    (data.userId as string | undefined) ||
    (data.provider_id as string | undefined) ||
    (data.providerId as string | undefined) ||
    (data.sender_id as string | undefined) ||
    (data.senderId as string | undefined) ||
    (data.firm_id as string | undefined) ||
    (data.firmId as string | undefined);

  const firmName =
    (data.name as string | undefined) ||
    (data.firm_name as string | undefined) ||
    (data.firmName as string | undefined) ||
    (data.sender_name as string | undefined) ||
    (data.senderName as string | undefined);

  const titleLower = (n.title || "").toLowerCase();
  const msgLower = (n.message || "").toLowerCase();

  const isMsg =
    n.type === "chat" ||
    n.type === "message" ||
    n.type === "new_message" ||
    n.type === "chat_message" ||
    n.type === "vendor_message" ||
    Boolean(data.sender_id) ||
    titleLower.includes("message") ||
    titleLower.includes("chat") ||
    msgLower.includes("texted") ||
    msgLower.includes("messaged");

  const isReminder =
    n.type === "shoot_reminder" ||
    titleLower.includes("reminder") ||
    titleLower.includes("tomorrow") ||
    titleLower.includes("almost time") ||
    msgLower.includes("reminder");

  const isMatch =
    n.type === "new_match" ||
    titleLower.includes("match") ||
    msgLower.includes("new match");

  let notifType: AppNotification["type"] = "booking";
  let category: AppNotificationCategory = "booking";
  if (isMsg) {
    notifType = "message";
    category = "message";
  } else if (isReminder) {
    notifType = "reminder";
    category = "reminder";
  } else if (isMatch) {
    notifType = "match";
    category = "booking";
  }

  let actionType: "reply" | "view_booking" | "view_matches" | undefined = undefined;
  if (isMsg) {
    actionType = "reply";
  } else if (isMatch) {
    actionType = "view_matches";
  } else if (data.booking_id || data.bookingId || data.request_id) {
    actionType = "view_booking";
  }

  return {
    id: notifId,
    title: n.title,
    body: n.message,
    createdAt: n.created_at || new Date().toISOString(),
    read: Boolean(n.read),
    bookingId:
      (data.booking_id as string | undefined) ||
      (data.request_id as string | undefined) ||
      (data.bookingId as string | undefined) ||
      undefined,
    userId,
    firmId: userId,
    firmName,
    type: notifType,
    category,
    actionType,
    data: data as Record<string, unknown>,
  };
}

export async function getNotifications(): Promise<AppNotification[]> {
  const readIds = await getReadNotificationIds();

  let list: AppNotification[] = [];
  const token = await getAuthToken();

  if (token && !isDemoAuthMode()) {
    try {
      const remote = await fetchBackendNotifications();
      if (Array.isArray(remote)) {
        list = remote.map(mapBackendNotification);
      }
    } catch {
      // Fallback
    }
  }

  if (list.length === 0) {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      list = raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      list = [];
    }
  }

  // Enforce read status override for locally read items
  const updated = list.map((n) => {
    const stringId = String(n.id);
    if (readIds.has(stringId) || n.read) {
      return { ...n, read: true };
    }
    return n;
  });

  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  return updated.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addNotification(notification: AppNotification): Promise<void> {
  const list = await getNotifications();
  await AsyncStorage.setItem(KEY, JSON.stringify([notification, ...list].slice(0, 100)));
  notifyListeners();
}

export async function markAllRead(): Promise<void> {
  const list = await getNotifications();
  const readIds = await getReadNotificationIds();
  list.forEach((n) => readIds.add(String(n.id)));
  await saveReadNotificationIds(readIds);

  const token = await getAuthToken();
  if (token && !isDemoAuthMode()) {
    try {
      await apiMarkAllAsRead();
    } catch {
      // non-blocking
    }
  }

  const updated = list.map((n) => ({ ...n, read: true }));
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  notifyListeners();
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!id) return;
  const targetId = String(id);

  // 1. Instantly record in persistent read set
  const readIds = await getReadNotificationIds();
  readIds.add(targetId);
  await saveReadNotificationIds(readIds);

  // 2. Call backend non-blocking without format restrictions
  const token = await getAuthToken();
  if (token && !isDemoAuthMode()) {
    try {
      await apiMarkAsRead(targetId);
    } catch {
      // non-blocking
    }
  }

  // 3. Update cached list
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw) as AppNotification[];
      const updated = list.map((n) => (String(n.id) === targetId ? { ...n, read: true } : n));
      await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    }
  } catch {
    // non-blocking
  }

  notifyListeners();
}

export async function unreadCount(): Promise<number> {
  const token = await getAuthToken();
  if (token && !isDemoAuthMode()) {
    try {
      return await fetchUnreadCount();
    } catch {
      // fallback to local list
    }
  }
  const list = await getNotifications();
  return list.filter((n) => !n.read).length;
}
