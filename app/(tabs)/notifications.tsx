import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  Bell,
  BellOff,
  Calendar,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Settings,
  Sparkles,
  XCircle,
} from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Badge, Button, Card, Muted, ScreenTitle } from "@/src/components/ui";
import { EmptyState } from "@/src/components/EmptyState";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, elevation, radius, spacing } from "@/src/constants/theme";
import { markNotificationRead } from "@/src/services/notificationsStore";
import {
  type NotificationPreferences,
  pushNotificationService,
} from "@/src/services/pushNotificationService";
import { selectionFeedback } from "@/src/utils/haptics";
import type { AppNotification, AppNotificationCategory } from "@/src/types/booking";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type TabType = "all" | "booking" | "message" | "reminder";

export default function NotificationsScreen() {
  const { notifications, bookings, refreshNotifications, markNotificationsRead } = useAppStore();
  const [selectedTab, setSelectedTab] = useState<TabType>("all");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    pushEnabled: true,
    remindersEnabled: true,
  });

  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
    }, [refreshNotifications]),
  );

  useEffect(() => {
    void pushNotificationService.getPreferences().then(setPrefs);
  }, []);

  const handleTogglePush = async (val: boolean) => {
    void selectionFeedback();
    const updated = await pushNotificationService.setPreferences({ pushEnabled: val });
    setPrefs(updated);
    if (val) {
      await pushNotificationService.init();
    }
  };

  const handleToggleReminders = async (val: boolean) => {
    void selectionFeedback();
    const updated = await pushNotificationService.setPreferences({ remindersEnabled: val });
    setPrefs(updated);
  };

  const filteredNotifications = useMemo(() => {
    if (selectedTab === "all") return notifications;
    if (selectedTab === "message") {
      return notifications.filter((n) => n.category === "message" || n.type === "message");
    }
    if (selectedTab === "reminder") {
      return notifications.filter((n) => n.category === "reminder" || n.type === "reminder");
    }
    if (selectedTab === "booking") {
      return notifications.filter(
        (n) =>
          n.category === "booking" ||
          n.type === "booking" ||
          n.type === "match" ||
          (!n.category && n.type !== "message"),
      );
    }
    return notifications;
  }, [notifications, selectedTab]);

  const handlePressNotification = async (n: AppNotification) => {
    void selectionFeedback();
    if (n.id) {
      try {
        await markNotificationRead(n.id);
        await refreshNotifications();
      } catch {
        // non-blocking
      }
    }

    const titleLower = (n.title || "").toLowerCase();
    const bodyLower = (n.body || "").toLowerCase();

    const isChatMessage =
      n.category === "message" ||
      n.type === "message" ||
      Boolean(n.userId) ||
      Boolean(n.firmId) ||
      titleLower.includes("message") ||
      titleLower.includes("chat") ||
      titleLower.includes("text") ||
      bodyLower.includes("texted") ||
      bodyLower.includes("messaged") ||
      bodyLower.includes("sent a message");

    let targetUserId = n.userId || n.firmId;
    let targetFirmName = n.firmName;
    let targetFirmPicture: string | undefined = undefined;

    if (!targetUserId && n.bookingId) {
      const matchBooking = bookings.find((b) => b.bookingId === n.bookingId);
      if (matchBooking) {
        const assigned = matchBooking.assigned_photographers || [];
        const matchedFirm = assigned.find(
          (f) =>
            (f.name &&
              (titleLower.includes(f.name.toLowerCase()) || bodyLower.includes(f.name.toLowerCase()))) ||
            f.has_accepted,
        );
        if (matchedFirm) {
          targetUserId = matchedFirm.provider_id || matchedFirm.id;
          targetFirmName = matchedFirm.name;
          targetFirmPicture = matchedFirm.profile_image || undefined;
        }
      }
    }

    if (isChatMessage) {
      if (targetUserId) {
        router.push({
          pathname: "/chat/[userId]",
          params: {
            userId: targetUserId,
            name: targetFirmName || "Photography Firm",
            picture: targetFirmPicture || "",
            accepted: "true",
          },
        });
        return;
      }
      router.push("/(tabs)/messages");
      return;
    }

    if (n.bookingId) {
      router.push(`/bookings/${n.bookingId}`);
    } else {
      router.push("/(tabs)/bookings");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ScreenContainer>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View>
          <ScreenTitle>Notifications</ScreenTitle>
          <Muted style={styles.headerSub}>
            {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}` : "All updates are caught up"}
          </Muted>
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 ? (
            <Button label="Mark all read" variant="ghost" compact onPress={markNotificationsRead} />
          ) : null}
          <Pressable
            onPress={() => {
              void selectionFeedback();
              setSettingsVisible(true);
            }}
            hitSlop={8}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel="Notification settings"
          >
            <Settings size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { id: "all", label: `All (${notifications.length})` },
            { id: "booking", label: "Bookings & Matches" },
            { id: "message", label: "Messages" },
            { id: "reminder", label: "Reminders" },
          ].map((tab) => {
            const isSelected = selectedTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => {
                  void selectionFeedback();
                  setSelectedTab(tab.id as TabType);
                }}
                style={[styles.tabPill, isSelected && styles.tabPillActive]}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification List */}
      {!filteredNotifications.length ? (
        <EmptyState
          icon={<BellOff size={44} color={colors.muted} />}
          title="No notifications yet"
          body={
            selectedTab === "all"
              ? "All your shoot alerts, photographer replies, and match notifications will appear right here."
              : `No ${selectedTab} notifications at the moment.`
          }
        />
      ) : (
        <View style={styles.listContainer}>
          {filteredNotifications.map((n, idx) => {
            const isMsg = n.category === "message" || n.type === "message";
            const isReminder = n.category === "reminder" || n.type === "reminder";
            const isMatch = n.type === "match";
            const isReject = (n.title || "").toLowerCase().includes("unavailable") || (n.body || "").toLowerCase().includes("unavailable");
            const isAccept = (n.title || "").toLowerCase().includes("accepted");

            return (
              <Pressable
                key={n.id && n.id !== "undefined" ? n.id : `notif-${idx}`}
                onPress={() => void handlePressNotification(n)}
                accessibilityRole="button"
                accessibilityLabel={`Notification: ${n.title}`}
              >
                <Card accent={!n.read} style={styles.cardBox}>
                  <View style={styles.notifRow}>
                    <View
                      style={[
                        styles.iconBadge,
                        isMsg && styles.iconBadgeMsg,
                        isReminder && styles.iconBadgeReminder,
                        isMatch && styles.iconBadgeMatch,
                        isAccept && styles.iconBadgeAccept,
                        isReject && styles.iconBadgeReject,
                      ]}
                    >
                      {isMsg ? (
                        <MessageSquare size={18} color="#FF6B35" />
                      ) : isReminder ? (
                        <Calendar size={18} color="#F59E0B" />
                      ) : isMatch ? (
                        <Sparkles size={18} color="#8B5CF6" />
                      ) : isAccept ? (
                        <CheckCircle2 size={18} color="#10B981" />
                      ) : isReject ? (
                        <XCircle size={18} color="#64748B" />
                      ) : (
                        <Bell size={18} color={n.read ? colors.muted : colors.primary} />
                      )}
                    </View>

                    <View style={styles.contentWrap}>
                      <View style={styles.titleLine}>
                        <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        {!n.read ? <View style={styles.unreadDot} /> : null}
                      </View>

                      <Text style={styles.notifBody}>{n.body}</Text>

                      <View style={styles.footerLine}>
                        <Text style={styles.timeText}>{timeAgo(n.createdAt)}</Text>
                        <View style={styles.actionPrompt}>
                          <Text style={styles.actionPromptText}>
                            {isMsg
                              ? "Reply to Partner"
                              : isMatch
                              ? "View Matches"
                              : isAccept
                              ? "View Booking Details"
                              : "Tap to view"}
                          </Text>
                          <ChevronRight size={14} color="#EA580C" />
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Notification Preferences Modal */}
      <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSettingsVisible(false)} />
          <View style={styles.settingsModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Notification Preferences</Text>
                <Text style={styles.modalSubtitle}>Manage your push alerts & shoot reminders</Text>
              </View>
              <Button label="Done" compact variant="primary" onPress={() => setSettingsVisible(false)} />
            </View>

            <View style={styles.settingItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Receive real-time alerts for messages, acceptances, and booking confirmations</Text>
              </View>
              <Switch
                value={prefs.pushEnabled}
                onValueChange={handleTogglePush}
                trackColor={{ false: "#CBD5E1", true: "#FF6B35" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Shoot Reminders</Text>
                <Text style={styles.settingDesc}>Get automatic reminders 24 hours before your shoot schedule</Text>
              </View>
              <Switch
                value={prefs.remindersEnabled}
                onValueChange={handleToggleReminders}
                trackColor={{ false: "#CBD5E1", true: "#FF6B35" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  listContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  cardBox: {
    padding: 14,
    borderRadius: 16,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeMsg: {
    backgroundColor: "#FFF7ED",
  },
  iconBadgeReminder: {
    backgroundColor: "#FEF3C7",
  },
  iconBadgeMatch: {
    backgroundColor: "#F5F3FF",
  },
  iconBadgeAccept: {
    backgroundColor: "#ECFDF5",
  },
  iconBadgeReject: {
    backgroundColor: "#F1F5F9",
  },
  contentWrap: {
    flex: 1,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: "800",
    color: "#0F172A",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B35",
    marginLeft: 6,
  },
  notifBody: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 8,
  },
  footerLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  actionPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionPromptText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  settingsModalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 16,
    ...elevation.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
});
