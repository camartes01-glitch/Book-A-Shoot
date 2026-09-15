import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ArrowRight, Calendar, Check, Sparkles } from "lucide-react-native";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";
import { successFeedback } from "@/src/utils/haptics";

export interface BookingSuccessModalProps {
  visible: boolean;
  bookingId: string;
  statusMessage?: string | null;
  eventName?: string;
  dateLabel?: string;
  onComplete: () => void;
}

export function BookingSuccessModal({
  visible,
  bookingId,
  statusMessage,
  eventName,
  dateLabel,
  onComplete,
}: BookingSuccessModalProps) {
  // Animation values
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0.7)).current;
  const rippleOpacity = useRef(new Animated.Value(0.8)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(24)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const particlesScale = useRef(new Animated.Value(0)).current;
  const particlesOpacity = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    onComplete();
  };

  useEffect(() => {
    if (!visible) {
      completedRef.current = false;
      bgOpacity.setValue(0);
      rippleScale.setValue(0.7);
      rippleOpacity.setValue(0.8);
      circleScale.setValue(0);
      checkScale.setValue(0);
      contentOpacity.setValue(0);
      contentTranslateY.setValue(24);
      progressAnim.setValue(0);
      particlesScale.setValue(0);
      particlesOpacity.setValue(0);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // 1. Entrance backdrop
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // 2. Ripple pulse
    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1.5,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Main Orange Circle Pop & Bounce
    Animated.spring(circleScale, {
      toValue: 1,
      friction: 4.5,
      tension: 70,
      useNativeDriver: true,
    }).start();

    // 4. White Checkmark Pop (staggered slightly)
    const checkTimer = setTimeout(() => {
      void successFeedback();
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 3.8,
          tension: 85,
          useNativeDriver: true,
        }),
        Animated.timing(particlesScale, {
          toValue: 1.3,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particlesOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(particlesOpacity, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, 180);

    // 5. Card Content Fade & Slide in
    const contentTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Progress indicator bar (2.4 seconds total)
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]).start();
    }, 320);

    // 6. Auto-redirect to booking details after 2.7 seconds
    timerRef.current = setTimeout(() => {
      handleFinish();
    }, 2800);

    return () => {
      clearTimeout(checkTimer);
      clearTimeout(contentTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  const cleanMessage =
    statusMessage && !statusMessage.toLowerCase().includes("no photography firms")
      ? statusMessage
      : "Dispatched to verified photography partners. You will be notified as partners accept.";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleFinish}>
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        <View style={styles.card}>
          {/* Top Decorative Sparkles */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.particlesContainer,
              {
                transform: [{ scale: particlesScale }],
                opacity: particlesOpacity,
              },
            ]}
          >
            <View style={[styles.particleDot, { top: -20, left: 30, backgroundColor: "#FFB703" }]} />
            <View style={[styles.particleDot, { top: -10, right: 35, backgroundColor: "#FF6B35" }]} />
            <View style={[styles.particleDot, { bottom: -15, left: 40, backgroundColor: "#EA580C" }]} />
            <View style={[styles.particleDot, { bottom: -12, right: 45, backgroundColor: "#FB8500" }]} />
            <Sparkles size={20} color="#FFB703" style={{ position: "absolute", top: -22, right: 60 }} />
          </Animated.View>

          {/* PhonePe-Style Orange Tick Animation */}
          <View style={styles.animationArea}>
            {/* Soft outer glow */}
            <View style={styles.auraGlow} />

            {/* Expanding outer ripple */}
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  transform: [{ scale: rippleScale }],
                  opacity: rippleOpacity,
                },
              ]}
            />

            {/* Inner radiant peach ring */}
            <View style={styles.peachRing}>
              {/* Solid Orange Badge */}
              <Animated.View
                style={[
                  styles.orangeCircle,
                  {
                    transform: [{ scale: circleScale }],
                  },
                ]}
              >
                {/* Crisp White Checkmark with spring pop */}
                <Animated.View
                  style={{
                    transform: [{ scale: checkScale }],
                  }}
                >
                  <Check size={44} color={colors.white} strokeWidth={4} />
                </Animated.View>
              </Animated.View>
            </View>
          </View>

          {/* Animated Message & Booking Card */}
          <Animated.View
            style={[
              styles.contentWrap,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <Text style={styles.title}>Booking Request Sent!</Text>
            <Text style={styles.subtitle}>{cleanMessage}</Text>

            {/* Booking ID Pill */}
            {bookingId ? (
              <View style={styles.bookingIdBadge}>
                <Text style={styles.bookingIdLabel}>Booking ID:</Text>
                <Text style={styles.bookingIdValue}>#{bookingId}</Text>
              </View>
            ) : null}

            {/* Event Summary Preview Box */}
            {(eventName || dateLabel) ? (
              <View style={styles.summaryBox}>
                {eventName ? (
                  <Text style={styles.summaryEventName} numberOfLines={1}>
                    {eventName}
                  </Text>
                ) : null}
                {dateLabel ? (
                  <View style={styles.summaryRow}>
                    <Calendar size={14} color={colors.primaryDark} />
                    <Text style={styles.summaryDateText}>{dateLabel}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Auto-redirect progress bar line */}
            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>

            {/* Instant Navigation CTA Button */}
            <Pressable
              onPress={handleFinish}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="View booking details"
            >
              <Text style={styles.actionButtonText}>View Booking Details</Text>
              <ArrowRight size={18} color={colors.white} strokeWidth={2.5} />
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 10, 6, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.12)",
  },
  particlesContainer: {
    position: "absolute",
    top: 50,
    width: 200,
    height: 120,
  },
  particleDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  animationArea: {
    width: 130,
    height: 130,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  auraGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 107, 53, 0.08)",
  },
  rippleRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  peachRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FED7AA",
  },
  orangeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  contentWrap: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  bookingIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: spacing.md,
  },
  bookingIdLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  bookingIdValue: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  summaryBox: {
    width: "100%",
    backgroundColor: "#FAF8F5",
    borderRadius: radiusSm,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#EFE8DF",
    alignItems: "center",
    gap: 3,
  },
  summaryEventName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryDateText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  progressBarTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "#F3E8DD",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  actionButton: {
    width: "100%",
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radiusSm,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.985 }],
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
