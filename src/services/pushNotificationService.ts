/**
 * Cross-Platform Push & In-App Notification Service for Book A Shoot
 * Handles:
 * - Device Push Token registration with Camartes backend (/api/notifications/push-token)
 * - Notification response listeners and deep-linking (Chat / Booking details)
 * - Browser Web Notifications fallback for web clients
 * - User notification preferences (Push toggle, Reminders toggle)
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { camartesFetch } from "./camartesClient";
import type { AppNotification } from "@/src/types/booking";
import { resolveNotificationRoute } from "@/src/domain/notificationRouting";

const PUSH_PREFS_KEY = "camartes_customer:notification_preferences:v1";
const SCHEDULED_MAP_KEY = "camartes_customer:scheduled_notifications:v1";

/** Builds a minimal AppNotification from a raw push/local-notification `data`
 * payload so both native taps and web onclick share the same routing logic. */
function notificationFromPushData(data: Record<string, unknown> | undefined): AppNotification {
  return {
    id: String((data?.notification_id as string) || "push"),
    title: "",
    body: "",
    createdAt: new Date().toISOString(),
    read: false,
    type: (data?.type as AppNotification["type"]) || undefined,
    bookingId: (data?.booking_id as string) || (data?.bookingId as string) || undefined,
    userId: (data?.sender_id as string) || (data?.user_id as string) || (data?.provider_id as string) || undefined,
    firmId: (data?.firm_id as string) || (data?.provider_id as string) || undefined,
    firmName: (data?.sender_name as string) || (data?.firm_name as string) || undefined,
    data: data || undefined,
  };
}

function routeFromPushData(data: Record<string, unknown> | undefined): void {
  const route = resolveNotificationRoute(notificationFromPushData(data), []);
  if (route.params) {
    router.push({ pathname: route.pathname as any, params: route.params });
  } else {
    router.push(route.pathname as any);
  }
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  remindersEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  pushEnabled: true,
  remindersEnabled: true,
};

class PushNotificationService {
  private registeredToken: string | null = null;
  private currentUserId: string | null = null;
  private isInitialized = false;

  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const raw = await AsyncStorage.getItem(PUSH_PREFS_KEY);
      if (raw) {
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
      }
    } catch {
      // Ignore read errors
    }
    return DEFAULT_PREFS;
  }

  async setPreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const current = await this.getPreferences();
      const updated = { ...current, ...prefs };
      await AsyncStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return DEFAULT_PREFS;
    }
  }

  async init(userId?: string): Promise<void> {
    if (userId) {
      this.currentUserId = userId;
    }
    if (this.isInitialized && !userId) return;
    this.isInitialized = true;

    const prefs = await this.getPreferences();
    if (!prefs.pushEnabled) return;

    if (Platform.OS === "web") {
      this.initWebNotifications();
    } else {
      await this.initNativeNotifications();
    }
  }

  private initWebNotifications(): void {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // Ready for browser notifications
  }

  async requestWebPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    } catch {
      return false;
    }
  }

  showWebNotification(title: string, body: string, data?: Record<string, unknown>): void {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      const notif = new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data,
      });
      notif.onclick = () => {
        window.focus();
        routeFromPushData(data);
      };
    } catch {
      // Notification constructor error ignored
    }
  }

  private async initNativeNotifications(): Promise<void> {
    try {
      // Safely load expo-notifications if present
      // @ts-ignore
      const Notifications = (await import("expo-notifications").catch(() => null)) as any;
      // @ts-ignore
      const Device = (await import("expo-device").catch(() => null)) as any;
      if (!Notifications || !Device) return;

      if (!Device.isDevice) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Camartes Book A Shoot",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF6B35",
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") return;

      const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
      const token = tokenData?.data;
      if (token) {
        this.registeredToken = token;
        await this.registerTokenWithBackend(token);
      }

      // Handle notification tap
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        if (!data) return;
        routeFromPushData(data);
      });
    } catch (e) {
      if (__DEV__) console.log("[PushNotifications] Native init note:", e);
    }
  }

  async registerTokenWithBackend(token: string, explicitUserId?: string): Promise<void> {
    const uid = explicitUserId || this.currentUserId;
    try {
      await camartesFetch(
        "/api/notifications/push-token",
        {
          method: "POST",
          body: JSON.stringify({
            expo_push_token: token,
            device_type: Platform.OS,
            user_id: uid || undefined,
          }),
        },
        { auth: true, requireAuth: false },
      );
    } catch (e) {
      if (__DEV__) console.log("[PushNotifications] Registration note:", e);
    }
  }

  private async getScheduledMap(): Promise<Record<string, string>> {
    try {
      const raw = await AsyncStorage.getItem(SCHEDULED_MAP_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private async loadNotificationsModule(): Promise<any | null> {
    if (Platform.OS === "web") return null;
    // @ts-ignore
    return (await import("expo-notifications").catch(() => null)) as any;
  }

  private async ensurePermission(Notifications: any): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") return true;
      const { status: requested } = await Notifications.requestPermissionsAsync();
      return requested === "granted";
    } catch {
      return false;
    }
  }

  private async scheduleWithTrigger(
    key: string,
    content: { title: string; body: string; data?: Record<string, unknown> },
    buildTrigger: (Notifications: any) => unknown,
  ): Promise<void> {
    const Notifications = await this.loadNotificationsModule();
    if (!Notifications) return;
    if (!(await this.ensurePermission(Notifications))) return;
    try {
      await this.cancelScheduledNotification(key);
      const identifier = await Notifications.scheduleNotificationAsync({
        content: { title: content.title, body: content.body, data: content.data },
        trigger: buildTrigger(Notifications),
      });
      const map = await this.getScheduledMap();
      map[key] = identifier;
      await AsyncStorage.setItem(SCHEDULED_MAP_KEY, JSON.stringify(map));
    } catch (e) {
      if (__DEV__) console.log("[PushNotifications] Schedule note:", e);
    }
  }

  /**
   * Schedules a one-shot local notification for an absolute future time
   * (event reminders, draft-abandonment nudges) so it fires even if the app
   * is closed. Re-scheduling under the same `key` replaces any previous
   * schedule. No-ops silently when expo-notifications isn't available —
   * local scheduling needs no push/FCM/APNs credentials, only the package.
   */
  async scheduleAt(key: string, content: { title: string; body: string; data?: Record<string, unknown> }, when: Date): Promise<void> {
    if (when.getTime() <= Date.now()) return;
    await this.scheduleWithTrigger(key, content, (Notifications) => ({
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    }));
  }

  /** Schedules a repeating nudge every `days` days (e.g. the idle "come back" nudge). */
  async scheduleRepeatingEveryDays(
    key: string,
    content: { title: string; body: string; data?: Record<string, unknown> },
    days: number,
  ): Promise<void> {
    await this.scheduleWithTrigger(key, content, (Notifications) => ({
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(days * 86400),
      repeats: true,
    }));
  }

  async hasScheduled(key: string): Promise<boolean> {
    const map = await this.getScheduledMap();
    return Boolean(map[key]);
  }

  async cancelScheduledNotification(key: string): Promise<void> {
    const map = await this.getScheduledMap();
    const identifier = map[key];
    if (!identifier) return;
    const Notifications = await this.loadNotificationsModule();
    if (Notifications) {
      try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      } catch (e) {
        if (__DEV__) console.log("[PushNotifications] Cancel note:", e);
      }
    }
    delete map[key];
    await AsyncStorage.setItem(SCHEDULED_MAP_KEY, JSON.stringify(map));
  }
}

export const pushNotificationService = new PushNotificationService();
