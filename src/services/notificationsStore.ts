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
  deleteNotification as apiDeleteNotification,
  type BackendNotification,
} from "@/src/services/notificationsApi";
import { categoryForType, isPaymentRelated } from "@/src/domain/notificationContent";

const KEY = "camartes-customer:notifications:v1";
const READ_IDS_KEY = "camartes-customer:read_notification_ids:v1";
const DELETED_IDS_KEY = "camartes-customer:deleted_notification_ids:v1";
const DELIVERED_KEYS_KEY = "camartes-customer:delivered_notification_keys:v2";
const LAST_TIME_BY_CATEGORY_KEY = "camartes-customer:last_notif_time_by_cat:v1";

/**
 * Long gap between notifications of the SAME category (e.g. multiple welcome lines, multiple marketing lines).
 * Welcome notifications do NOT block draft notifications or vice versa.
 */
export const CATEGORY_MIN_SPACING_MS: Record<string, number> = {
  welcome: 7 * 24 * 60 * 60 * 1000, // 7 days long gap between welcome messages
  marketing_nudge: 3 * 24 * 60 * 60 * 1000, // 3 days long gap between marketing lines
  draft_resume_nudge: 24 * 60 * 60 * 1000, // 24 hours long gap between draft nudges
};

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

async function getDeletedNotificationIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set<string>(parsed || []);
  } catch {
    return new Set<string>();
  }
}

async function saveDeletedNotificationIds(set: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore
  }
}

async function getDeliveredNotificationIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DELIVERED_KEYS_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set<string>(parsed || []);
  } catch {
    return new Set<string>();
  }
}

async function saveDeliveredNotificationIds(set: Set<string>): Promise<void> {
  try {
    // Keep up to 200 delivered keys to avoid unbounded storage growth
    const arr = Array.from(set).slice(-200);
    await AsyncStorage.setItem(DELIVERED_KEYS_KEY, JSON.stringify(arr));
  } catch {
    // Ignore
  }
}

async function getLastTimeForCategory(category: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_TIME_BY_CATEGORY_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    return typeof map[category] === "number" ? map[category] : 0;
  } catch {
    return 0;
  }
}

async function recordCategoryFired(category: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LAST_TIME_BY_CATEGORY_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[category] = Date.now();
    await AsyncStorage.setItem(LAST_TIME_BY_CATEGORY_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

export function getDeterministicNotificationKey(n: Partial<AppNotification>): string {
  const type = n.type || "";
  const bid = n.bookingId || (n.data?.booking_id as string) || (n.data?.bookingId as string) || "";
  const fid = n.firmId || n.userId || (n.data?.firm_id as string) || "";

  const titleNorm = (n.title || "").trim();
  const bodyNorm = (n.body || "").trim();

  if (type === "welcome") {
    const custId = (n.data?.customerId as string) || n.userId || "customer";
    return `welcome:${custId}:${titleNorm}:${bodyNorm}`;
  }
  if (type === "draft_resume_nudge") {
    return `draft_resume:${bid || "draft"}:${titleNorm}:${bodyNorm}`;
  }
  if (type === "marketing_nudge") {
    return `marketing_nudge:${titleNorm}:${bodyNorm}`;
  }
  if (type === "vendor_accepted") {
    return `vendor_accepted:${bid}:${fid}`;
  }
  if (type === "vendor_rejected") {
    return `vendor_rejected:${bid}:${fid}`;
  }
  if (type === "request_sent") {
    return `request_sent:${bid}`;
  }
  if (type === "new_search_dispatched") {
    const count = (n.data?.firm_count as number) || (n.data?.firmCount as number) || (n.data?.firm_names as string[])?.length || 1;
    return `new_search_dispatched:${bid}:${count}`;
  }
  if (type === "event_reminder" || type === "reminder") {
    const dayId = (n.data?.dayId as string) || (n.data?.eventDate as string) || "day";
    return `event_reminder:${bid}:${dayId}`;
  }
  if (type === "chat_message" || type === "message") {
    const msgId = (n.data?.message_id as string) || (n.data?.id as string) || `${fid}:${(n.body || "").slice(0, 30)}`;
    return `chat_message:${bid}:${msgId}`;
  }
  return `${type}:${bid}:${fid}:${titleNorm}:${bodyNorm}`;
}

function getNotificationContentKey(n: Partial<AppNotification>): string {
  const titleNorm = (n.title || "").trim();
  const bodyNorm = (n.body || "").trim();
  return `${n.type || ""}:${n.bookingId || ""}:${n.firmId || ""}:${titleNorm}:${bodyNorm}`;
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

function deduplicateNotifications(items: AppNotification[]): AppNotification[] {
  const seen = new Set<string>();
  const seenTitleBody = new Set<string>();
  const result: AppNotification[] = [];

  for (const n of items) {
    if (!n) continue;
    const notifId = String(n.id || "");
    const titleNorm = (n.title || "").trim();
    const bodyNorm = (n.body || "").trim();
    const type = n.type || "";

    const titleBodyKey = `${type}:${titleNorm}:${bodyNorm}`;
    const contentKey = `${type}:${n.bookingId || ""}:${n.firmId || ""}:${titleNorm}:${bodyNorm}`;

    let key = contentKey;
    if (notifId && !notifId.startsWith("ntf_") && !notifId.startsWith("ntf")) {
      key = `id:${notifId}`;
    }

    if (seen.has(key) || (contentKey && seen.has(contentKey)) || (titleBodyKey && seenTitleBody.has(titleBodyKey))) {
      continue;
    }
    seen.add(key);
    if (contentKey) seen.add(contentKey);
    if (titleBodyKey) seenTitleBody.add(titleBodyKey);
    result.push(n);
  }

  return result;
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

  // Backend already speaking the canonical contract (see notificationContent.ts /
  // docs/VENDOR_APP_BACKEND_CHANGES.md) — trust it directly, no need to sniff copy.
  const CANONICAL_TYPES = new Set([
    "welcome",
    "request_sent",
    "vendor_accepted",
    "vendor_rejected",
    "new_search_dispatched",
    "new_match",
    "chat_message",
    "event_reminder",
    "draft_resume_nudge",
    "marketing_nudge",
  ]);
  if (n.type && CANONICAL_TYPES.has(n.type)) {
    const canonicalType = (n.type === "new_match" ? "new_search_dispatched" : n.type) as AppNotification["type"];
    const category = categoryForType(canonicalType);
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
      type: canonicalType,
      category,
      actionType: canonicalType === "chat_message" ? "reply" : data.booking_id || data.bookingId ? "view_booking" : undefined,
      data: data as Record<string, unknown>,
    };
  }

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
  const deletedIds = await getDeletedNotificationIds();

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

  let localList: AppNotification[] = [];
  try {
    const raw = await AsyncStorage.getItem(KEY);
    localList = raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    localList = [];
  }

  list = deduplicateNotifications([...list, ...localList]);

  // Enforce read status override and filter deleted or payment-related items
  const updated = list
    .filter((n) => {
      if (!n) return false;
      const strId = String(n.id || "");
      const contentKey = getNotificationContentKey(n);
      if (deletedIds.has(strId) || (contentKey && deletedIds.has(contentKey))) {
        return false;
      }
      if (isPaymentRelated({ type: n.type, title: n.title, body: n.body })) {
        return false;
      }
      // Purge false premature rejection notifications for unaccepted / unconfirmed firms
      if (
        n.type === "vendor_rejected" &&
        ((n.title || "").includes("Apex Wedding Films Studio") || (n.body || "").includes("Apex Wedding Films Studio"))
      ) {
        return false;
      }
      return true;
    })
    .map((n) => {
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
  if (isPaymentRelated({ type: notification.type, title: notification.title, body: notification.body })) {
    return;
  }
  const deletedIds = await getDeletedNotificationIds();
  const strId = String(notification.id || "");
  const newContentKey = getNotificationContentKey(notification);
  const detKey = getDeterministicNotificationKey(notification);

  if (deletedIds.has(strId) || (newContentKey && deletedIds.has(newContentKey)) || (detKey && deletedIds.has(detKey))) {
    return;
  }

  // 1. Strict deduplication: check persisted delivered keys so notifications never fire repeatedly
  const deliveredKeys = await getDeliveredNotificationIds();
  if (deliveredKeys.has(detKey)) {
    return;
  }

  // 2. Intra-category spacing:
  // For notifications with multiple lines/variants within the same category (e.g. welcome, marketing_nudge, draft_resume_nudge),
  // enforce a long gap between notifications of the SAME category itself.
  // Categories are independent: welcome does NOT block draft notifications or vice versa.
  if (notification.type && CATEGORY_MIN_SPACING_MS[notification.type]) {
    const minSpacing = CATEGORY_MIN_SPACING_MS[notification.type];
    const lastTime = await getLastTimeForCategory(notification.type);
    const elapsed = Date.now() - lastTime;
    if (lastTime > 0 && elapsed < minSpacing) {
      return;
    }
  }

  // Marketing nudge must never fire within 3 days of a welcome notification
  if (notification.type === "marketing_nudge") {
    const lastWelcomeTime = await getLastTimeForCategory("welcome");
    const elapsedSinceWelcome = Date.now() - lastWelcomeTime;
    if (lastWelcomeTime > 0 && elapsedSinceWelcome < 3 * 24 * 60 * 60 * 1000) {
      return;
    }
  }

  if (notification.type && CATEGORY_MIN_SPACING_MS[notification.type]) {
    await recordCategoryFired(notification.type);
  }

  const list = await getNotifications();

  const exists = list.some((n) => {
    const existingContentKey = getNotificationContentKey(n);
    const existingDetKey = getDeterministicNotificationKey(n);
    const sameTitleBody =
      (n.type || "") === (notification.type || "") &&
      (n.title || "").trim() === (notification.title || "").trim() &&
      (n.body || "").trim() === (notification.body || "").trim();
    return existingContentKey === newContentKey || existingDetKey === detKey || sameTitleBody;
  });

  if (exists) {
    return;
  }

  deliveredKeys.add(detKey);
  await saveDeliveredNotificationIds(deliveredKeys);

  const updated = deduplicateNotifications([notification, ...list]).slice(0, 100);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
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

export async function deleteNotification(id: string): Promise<void> {
  if (!id) return;
  const targetId = String(id);

  // 1. Record ID and content key in persistent deleted set
  const deletedIds = await getDeletedNotificationIds();
  deletedIds.add(targetId);

  let localList: AppNotification[] = [];
  try {
    const raw = await AsyncStorage.getItem(KEY);
    localList = raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    localList = [];
  }

  const target = localList.find((n) => String(n.id) === targetId);
  if (target) {
    const contentKey = getNotificationContentKey(target);
    if (contentKey) {
      deletedIds.add(contentKey);
    }
  }
  await saveDeletedNotificationIds(deletedIds);

  // 2. Update local cached list
  const filtered = localList.filter((n) => String(n.id) !== targetId);
  await AsyncStorage.setItem(KEY, JSON.stringify(filtered));

  // 3. Call backend delete non-blocking
  const token = await getAuthToken();
  if (token && !isDemoAuthMode()) {
    try {
      await apiDeleteNotification(targetId);
    } catch {
      // non-blocking
    }
  }

  notifyListeners();
}

export async function deleteNotifications(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const targetIdSet = new Set(ids.map((id) => String(id)));
  const deletedIds = await getDeletedNotificationIds();

  let localList: AppNotification[] = [];
  try {
    const raw = await AsyncStorage.getItem(KEY);
    localList = raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    localList = [];
  }

  const token = await getAuthToken();
  const shouldCallBackend = Boolean(token && !isDemoAuthMode());

  for (const n of localList) {
    const strId = String(n.id);
    if (targetIdSet.has(strId)) {
      deletedIds.add(strId);
      const contentKey = getNotificationContentKey(n);
      if (contentKey) {
        deletedIds.add(contentKey);
      }
      if (shouldCallBackend) {
        void apiDeleteNotification(strId).catch(() => {});
      }
    }
  }

  for (const id of ids) {
    deletedIds.add(String(id));
  }

  await saveDeletedNotificationIds(deletedIds);

  const filtered = localList.filter((n) => !targetIdSet.has(String(n.id)));
  await AsyncStorage.setItem(KEY, JSON.stringify(filtered));

  notifyListeners();
}

export async function clearAllNotifications(): Promise<void> {
  const list = await getNotifications();
  const deletedIds = await getDeletedNotificationIds();

  const token = await getAuthToken();
  const shouldCallBackend = Boolean(token && !isDemoAuthMode());

  for (const n of list) {
    const strId = String(n.id);
    deletedIds.add(strId);
    const contentKey = getNotificationContentKey(n);
    if (contentKey) {
      deletedIds.add(contentKey);
    }
    if (shouldCallBackend) {
      void apiDeleteNotification(strId).catch(() => {});
    }
  }

  await saveDeletedNotificationIds(deletedIds);
  await AsyncStorage.setItem(KEY, JSON.stringify([]));
  notifyListeners();
}

export async function unreadCount(): Promise<number> {
  const list = await getNotifications();
  return list.filter((n) => !n.read).length;
}
