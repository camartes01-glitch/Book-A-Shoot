/**
 * Notifications (spec section 48). Backed by AsyncStorage for now; a real
 * deployment would swap this for push notifications + a
 * `GET /api/customer/notifications` endpoint without changing call sites.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppNotification } from "@/src/types/booking";

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

export async function getNotifications(): Promise<AppNotification[]> {
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
  const list = await getNotifications();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.map((n) => ({ ...n, read: true }))));
  notifyListeners();
}

export async function unreadCount(): Promise<number> {
  const list = await getNotifications();
  return list.filter((n) => !n.read).length;
}
