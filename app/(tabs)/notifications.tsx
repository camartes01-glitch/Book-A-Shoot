import { Pressable, StyleSheet, View } from "react-native";
import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { Bell, BellOff } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Button, Card, Muted, ScreenTitle } from "@/src/components/ui";
import { EmptyState } from "@/src/components/EmptyState";
import { useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

import { markNotificationRead } from "@/src/services/notificationsStore";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsScreen() {
  const { notifications, bookings, refreshNotifications, markNotificationsRead } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
    }, [refreshNotifications]),
  );

  const handlePressNotification = async (n: (typeof notifications)[0]) => {
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
            (f.name && (titleLower.includes(f.name.toLowerCase()) || bodyLower.includes(f.name.toLowerCase()))) ||
            f.has_accepted
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

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <ScreenTitle>Notifications</ScreenTitle>
        {notifications.some((n) => !n.read) ? <Button label="Mark all read" variant="ghost" compact onPress={markNotificationsRead} /> : null}
      </View>
      {!notifications.length ? (
        <EmptyState icon={<BellOff size={40} color={colors.muted} />} title="You're all caught up" body="Booking and vendor updates will show up here." />
      ) : (
        notifications.map((n, idx) => (
          <Pressable
            key={n.id && n.id !== "undefined" ? n.id : `notif-${idx}`}
            onPress={() => void handlePressNotification(n)}
            accessibilityRole="button"
            accessibilityLabel={`Notification: ${n.title}`}
          >
            <Card accent={!n.read}>
              <View style={styles.row}>
                <Bell size={16} color={n.read ? colors.muted : colors.primary} />
                <View style={{ flex: 1 }}>
                  <Muted style={{ fontWeight: "800", color: colors.ink }}>{n.title}</Muted>
                  <Muted>{n.body}</Muted>
                  <Muted style={{ fontSize: 11 }}>{timeAgo(n.createdAt)}</Muted>
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
});
