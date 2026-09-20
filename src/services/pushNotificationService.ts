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

const PUSH_PREFS_KEY = "camartes_customer:notification_preferences:v1";

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
        if (data?.sender_id) {
          router.push({
            pathname: "/chat/[userId]",
            params: {
              userId: String(data.sender_id),
              name: String(data.sender_name || "Photography Partner"),
            },
          });
        } else if (data?.booking_id) {
          router.push(`/bookings/${data.booking_id}`);
        }
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

        if (data.sender_id) {
          router.push({
            pathname: "/chat/[userId]",
            params: {
              userId: String(data.sender_id),
              name: String(data.sender_name || "Photography Partner"),
            },
          });
        } else if (data.booking_id) {
          router.push(`/bookings/${data.booking_id}`);
        }
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
}

export const pushNotificationService = new PushNotificationService();
