import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Bell, Calendar, MessageSquare, Sparkles, X } from "lucide-react-native";
import type { AppNotification } from "@/src/types/booking";
import { colors, elevation, radius, spacing } from "@/src/constants/theme";

interface InAppNotificationToastProps {
  notification: AppNotification | null;
  onPress: (notification: AppNotification) => void;
  onDismiss: () => void;
}

export function InAppNotificationToast({
  notification,
  onPress,
  onDismiss,
}: InAppNotificationToastProps) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 5500);

      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
    }
  }, [notification]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!notification) return null;

  const isMsg = notification.category === "message" || notification.type === "message";
  const isReminder = notification.category === "reminder" || notification.type === "reminder";
  const isMatch = notification.type === "match";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.card}>
        <Pressable
          onPress={() => {
            handleDismiss();
            onPress(notification);
          }}
          style={styles.contentPressable}
          accessibilityRole="button"
          accessibilityLabel={`Notification: ${notification.title}`}
        >
          <View style={styles.iconCircle}>
            {isMsg ? (
              <MessageSquare size={20} color="#FF6B35" />
            ) : isReminder ? (
              <Calendar size={20} color="#F59E0B" />
            ) : isMatch ? (
              <Sparkles size={20} color="#8B5CF6" />
            ) : (
              <Bell size={20} color="#FF6B35" />
            )}
          </View>

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {notification.title}
              </Text>
              <View style={styles.nowBadge}>
                <Text style={styles.nowBadgeText}>NEW</Text>
              </View>
            </View>
            <Text style={styles.body} numberOfLines={2}>
              {notification.body}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <X size={16} color="#64748B" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "web" ? 16 : 48,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingRight: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
      },
      default: {
        ...elevation.card,
        shadowColor: "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  contentPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 6,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  nowBadge: {
    backgroundColor: "#FF6B35",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  nowBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
