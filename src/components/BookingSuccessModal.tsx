import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AlertCircle, ArrowRight, Calendar, Camera, Check, MapPin, ShieldCheck } from "lucide-react-native";
import { colors, spacing } from "@/src/constants/theme";
import { successFeedback } from "@/src/utils/haptics";

export interface BookingSuccessModalProps {
  visible: boolean;
  bookingId?: string | null;
  submissionError?: string | null;
  city?: string;
  statusMessage?: string | null;
  eventName?: string;
  dateLabel?: string;
  onComplete: (bookingId: string) => void;
  onDismissError?: () => void;
}

const SEARCH_SENTENCES = [
  "Great! We are finding the top 6 photography firms for you...",
  "Filtering studios with dual-slot cameras and prime lenses...",
  "Matching top cinematographers and candid masters in your city...",
  "Checking studio availability and calendar slots in real-time...",
  "Dispatching your shoot requirements to the top 6 studios in the city...",
  "Securing priority SLA response window with verified partners...",
];

export function BookingSuccessModal({
  visible,
  bookingId,
  submissionError,
  city,
  statusMessage,
  eventName,
  dateLabel,
  onComplete,
  onDismissError,
}: BookingSuccessModalProps) {
  const [phase, setPhase] = useState<"searching" | "dispatched">("searching");
  const [sentenceIndex, setSentenceIndex] = useState(0);

  // Animation values
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const radarScale1 = useRef(new Animated.Value(0.6)).current;
  const radarOpacity1 = useRef(new Animated.Value(0.85)).current;
  const radarScale2 = useRef(new Animated.Value(0.6)).current;
  const radarOpacity2 = useRef(new Animated.Value(0.85)).current;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const sentenceOpacity = useRef(new Animated.Value(1)).current;
  const sentenceTranslateY = useRef(new Animated.Value(0)).current;

  const checkCircleScale = useRef(new Animated.Value(0)).current;
  const checkMarkScale = useRef(new Animated.Value(0)).current;
  const fulfilledContentOpacity = useRef(new Animated.Value(0)).current;

  const sentenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radarLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const autoFinishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  const minTimeElapsedRef = useRef(false);
  const latestBookingIdRef = useRef<string | null>(bookingId || null);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (sentenceIntervalRef.current) clearInterval(sentenceIntervalRef.current);
    if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
    const targetId = latestBookingIdRef.current || bookingId || "";
    onComplete(targetId);
  };

  const transitionToDispatched = () => {
    if (completedRef.current) return;
    setPhase("dispatched");
    if (sentenceIntervalRef.current) clearInterval(sentenceIntervalRef.current);
    if (radarLoopRef.current) radarLoopRef.current.stop();
    void successFeedback();

    // Spring pop checkmark
    Animated.sequence([
      Animated.spring(checkCircleScale, {
        toValue: 1,
        friction: 4.5,
        tension: 75,
        useNativeDriver: true,
      }),
      Animated.spring(checkMarkScale, {
        toValue: 1,
        friction: 4,
        tension: 85,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(fulfilledContentOpacity, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Auto-redirect to live booking status after viewing fulfilled state
    autoFinishTimerRef.current = setTimeout(() => {
      handleFinish();
    }, 3400);
  };

  // Keep track of latest booking ID from background submit
  useEffect(() => {
    latestBookingIdRef.current = bookingId || null;
    if (bookingId && minTimeElapsedRef.current && phase === "searching" && !submissionError) {
      // Background finished and min display time elapsed: smoothly complete to 100%
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        transitionToDispatched();
      });
    }
  }, [bookingId, submissionError, phase]);

  useEffect(() => {
    if (!visible) {
      completedRef.current = false;
      minTimeElapsedRef.current = false;
      setPhase("searching");
      setSentenceIndex(0);
      bgOpacity.setValue(0);
      progressAnim.setValue(0);
      sentenceOpacity.setValue(1);
      sentenceTranslateY.setValue(0);
      checkCircleScale.setValue(0);
      checkMarkScale.setValue(0);
      fulfilledContentOpacity.setValue(0);
      if (sentenceIntervalRef.current) clearInterval(sentenceIntervalRef.current);
      if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
      if (radarLoopRef.current) radarLoopRef.current.stop();
      return;
    }

    if (submissionError) {
      if (sentenceIntervalRef.current) clearInterval(sentenceIntervalRef.current);
      if (radarLoopRef.current) radarLoopRef.current.stop();
      return;
    }

    // 1. Entrance backdrop
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // 2. Start concentric radar pulse animation loop immediately (0ms)
    const createRadarLoop = () => {
      radarScale1.setValue(0.6);
      radarOpacity1.setValue(0.85);
      radarScale2.setValue(0.6);
      radarOpacity2.setValue(0.85);

      const ring1 = Animated.parallel([
        Animated.timing(radarScale1, {
          toValue: 1.6,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(radarOpacity1, {
          toValue: 0,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      const ring2 = Animated.sequence([
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(radarScale2, {
            toValue: 1.6,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(radarOpacity2, {
            toValue: 0,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]);

      radarLoopRef.current = Animated.loop(Animated.parallel([ring1, ring2]));
      radarLoopRef.current.start();
    };
    createRadarLoop();

    // 3. Smooth progress bar: 0% -> 90% over 2800ms
    Animated.timing(progressAnim, {
      toValue: 0.9,
      duration: 2800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start(() => {
      minTimeElapsedRef.current = true;
      if (latestBookingIdRef.current) {
        // Request finished before or right at 2.8s: smoothly finish to 100%
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(() => {
          transitionToDispatched();
        });
      }
    });

    // 4. Rotating marketive sentences cycle immediately
    let currentIndex = 0;
    sentenceIntervalRef.current = setInterval(() => {
      // Fade out
      Animated.parallel([
        Animated.timing(sentenceOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(sentenceTranslateY, {
          toValue: -8,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        currentIndex = (currentIndex + 1) % SEARCH_SENTENCES.length;
        setSentenceIndex(currentIndex);
        sentenceTranslateY.setValue(10);
        // Fade in
        Animated.parallel([
          Animated.timing(sentenceOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(sentenceTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 720);

    return () => {
      if (sentenceIntervalRef.current) clearInterval(sentenceIntervalRef.current);
      if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
      if (radarLoopRef.current) radarLoopRef.current.stop();
    };
  }, [visible, submissionError]);

  if (!visible) return null;

  const currentSentence = SEARCH_SENTENCES[sentenceIndex];
  const targetCity = city || "your city";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleFinish}>
      <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
        <View style={styles.card}>
          {submissionError ? (
            /* ERROR STATE */
            <View style={styles.phaseContainer}>
              <View style={styles.errorIconCircle}>
                <AlertCircle size={38} color="#EA580C" strokeWidth={2.5} />
              </View>
              <Text style={styles.fulfilledTitle}>Unable to Dispatch Request</Text>
              <Text style={styles.fulfilledSubtitle}>{submissionError}</Text>
              <Pressable
                onPress={onDismissError}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed, { marginTop: spacing.md }]}
                accessibilityRole="button"
                accessibilityLabel="Dismiss error and try again"
              >
                <Text style={styles.actionButtonText}>Try Again</Text>
              </Pressable>
            </View>
          ) : phase === "searching" ? (
            /* SEARCHING & DISPATCHING PHASE (Rapido-style, 0ms instant start) */
            <View style={styles.phaseContainer}>
              {/* Radar Circle Animation */}
              <View style={styles.radarWrapper}>
                <Animated.View
                  style={[
                    styles.radarRing,
                    {
                      transform: [{ scale: radarScale1 }],
                      opacity: radarOpacity1,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.radarRing,
                    {
                      transform: [{ scale: radarScale2 }],
                      opacity: radarOpacity2,
                    },
                  ]}
                />

                <View style={styles.radarCenterCircle}>
                  <Camera size={34} color={colors.white} strokeWidth={2.2} />
                </View>
              </View>

              {/* Status Header Badge */}
              <View style={styles.dispatchPill}>
                <View style={styles.livePulseDot} />
                <Text style={styles.dispatchPillText}>Searching & Dispatching</Text>
              </View>

              {/* Rotating Marketive Sentence */}
              <View style={styles.sentenceWrapper}>
                <Animated.Text
                  style={[
                    styles.sentenceText,
                    {
                      opacity: sentenceOpacity,
                      transform: [{ translateY: sentenceTranslateY }],
                    },
                  ]}
                >
                  {currentSentence}
                </Animated.Text>
              </View>

              {/* Fulfilling Progress Line */}
              <View style={styles.progressBarSection}>
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
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabelLeft}>Scanning verified partner network</Text>
                  <Text style={styles.progressLabelRight}>Top 6 Studios</Text>
                </View>
              </View>
            </View>
          ) : (
            /* FULFILLED PHASE (Request Sent to Top 6 Studios) */
            <Animated.View style={[styles.phaseContainer, { opacity: fulfilledContentOpacity }]}>
              {/* Checkmark Pop */}
              <View style={styles.checkArea}>
                <Animated.View
                  style={[
                    styles.checkCircle,
                    {
                      transform: [{ scale: checkCircleScale }],
                    },
                  ]}
                >
                  <Animated.View style={{ transform: [{ scale: checkMarkScale }] }}>
                    <Check size={42} color={colors.white} strokeWidth={3.5} />
                  </Animated.View>
                </Animated.View>
              </View>

              {/* Clear MNC Rapido-style Status Message */}
              <Text style={styles.fulfilledTitle}>Request Dispatched to Top 6 Studios</Text>
              <Text style={styles.fulfilledSubtitle}>
                We've sent your request to the top 6 firms in {targetCity}. Please be patient while a best photographer accepts you.
              </Text>

              {/* Booking Snapshot Box */}
              <View style={styles.summaryBox}>
                {eventName ? (
                  <Text style={styles.summaryEventName} numberOfLines={1}>
                    {eventName}
                  </Text>
                ) : null}
                <View style={styles.summaryMetaRow}>
                  {dateLabel ? (
                    <View style={styles.summaryRow}>
                      <Calendar size={13} color="#EA580C" />
                      <Text style={styles.summaryMetaText}>{dateLabel}</Text>
                    </View>
                  ) : null}
                  <View style={styles.summaryRow}>
                    <MapPin size={13} color="#64748B" />
                    <Text style={styles.summaryMetaText}>{targetCity}</Text>
                  </View>
                </View>
                <View style={styles.studioSlotsRow}>
                  <ShieldCheck size={13} color="#EA580C" />
                  <Text style={styles.studioSlotsText}>6 Verified Photography Partners Queued</Text>
                </View>
              </View>

              {/* CTA Action Button */}
              <Pressable
                onPress={handleFinish}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="View live booking status"
              >
                <Text style={styles.actionButtonText}>View Live Booking Status</Text>
                <ArrowRight size={18} color={colors.white} strokeWidth={2.5} />
              </Pressable>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  phaseContainer: {
    width: "100%",
    alignItems: "center",
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FED7AA",
    marginBottom: spacing.md,
  },
  radarWrapper: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  radarRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    borderColor: "#EA580C",
    backgroundColor: "rgba(234, 88, 12, 0.08)",
  },
  radarCenterCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#EA580C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#C2410C",
  },
  dispatchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFF7ED",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: spacing.md,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EA580C",
  },
  dispatchPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
    letterSpacing: 0.3,
  },
  sentenceWrapper: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  sentenceText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    lineHeight: 22,
  },
  progressBarSection: {
    width: "100%",
    gap: 6,
    marginTop: spacing.xs,
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#EA580C",
    borderRadius: 99,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabelLeft: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  progressLabelRight: {
    fontSize: 11,
    color: "#EA580C",
    fontWeight: "700",
  },
  checkArea: {
    marginBottom: spacing.md,
  },
  checkCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fulfilledTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  fulfilledSubtitle: {
    fontSize: 13.5,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  summaryBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 6,
  },
  summaryEventName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryMetaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  studioSlotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  studioSlotsText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#EA580C",
  },
  actionButton: {
    width: "100%",
    backgroundColor: "#EA580C",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonPressed: {
    backgroundColor: "#C2410C",
    transform: [{ scale: 0.99 }],
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
});
