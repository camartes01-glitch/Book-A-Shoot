import { useCallback, useEffect, useRef } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, ChevronLeft, Home } from "lucide-react-native";
import { router } from "expo-router";
import { colors, fontWeights, radius, spacing } from "@/src/constants/theme";
import { useAppStore } from "@/src/state/AppProvider";
import { selectionFeedback } from "@/src/utils/haptics";
import {
  VISUAL_INDEX,
  WIZARD_STEPS,
  type VisualStepId,
  type WizardStepId,
} from "@/src/constants/steps";

export { WIZARD_STEPS, type VisualStepId, type WizardStepId };

export function ProgressHeader({
  title,
  step,
  onBack,
  onHome,
}: {
  title: string;
  step: WizardStepId;
  onBack?: () => void;
  onHome?: () => void;
}) {
  const activeIndex = VISUAL_INDEX[step] ?? 0;
  const { activeDraft } = useAppStore();
  const stepScrollRef = useRef<ScrollView>(null);
  const stepLayoutsRef = useRef<Record<number, { x: number; width: number }>>({});

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      router.replace("/(tabs)");
    }
  };

  const scrollToActiveStep = useCallback((idx: number) => {
    const layout = stepLayoutsRef.current[idx];
    if (layout && stepScrollRef.current) {
      // Center the active step with a 60px offset from left edge
      const targetX = Math.max(0, layout.x - 60);
      stepScrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, []);

  useEffect(() => {
    // Slight timeout ensures layout measurements have populated
    const timer = setTimeout(() => {
      scrollToActiveStep(activeIndex);
    }, 120);
    return () => clearTimeout(timer);
  }, [activeIndex, scrollToActiveStep]);

  const onStepLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    stepLayoutsRef.current[index] = { x, width };
    if (index === activeIndex) {
      scrollToActiveStep(index);
    }
  };

  const handleStepPress = (targetStepId: VisualStepId, targetIndex: number) => {
    // Only backward navigation is permitted via header taps.
    // Advancing to subsequent steps requires completing validation via the CTA buttons.
    if (targetIndex >= activeIndex) {
      return;
    }
    selectionFeedback();

    const targetDayId = activeDraft?.days?.[0]?.dayId || "d1";

    switch (targetStepId) {
      case "event":
        router.push(`/booking/day/${targetDayId}?step=event`);
        break;
      case "photography":
        router.push(`/booking/day/${targetDayId}?step=photography`);
        break;
      case "videography":
        router.push(`/booking/day/${targetDayId}?step=videography`);
        break;
      case "addons":
        router.push(`/booking/deliverables`);
        break;
      case "budget":
        router.push(`/booking/budget`);
        break;
      case "packages":
        router.push(`/booking/packages`);
        break;
      case "location":
        router.push(`/booking/location-preference`);
        break;
      case "providers":
        router.push(`/booking/matches`);
        break;
      case "review":
        router.push(`/booking/confirm`);
        break;
    }
  };

  return (
    <View style={styles.safe}>
      {/* Top Header Bar */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack ?? (() => router.back())}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to Home (Save as draft)"
          onPress={handleHome}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Home size={18} color={colors.ink} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Horizontal Steps Slider */}
      <View style={styles.sliderContainer}>
        <ScrollView
          ref={stepScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepsScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {WIZARD_STEPS.map((s, i) => {
            const isActive = i === activeIndex;
            const isCompleted = i < activeIndex;
            const isFuture = i > activeIndex;

            return (
              <Pressable
                key={s.id}
                onLayout={(e) => onStepLayout(i, e)}
                onPress={() => handleStepPress(s.id, i)}
                disabled={isFuture}
                style={({ pressed }) => [
                  styles.stepChip,
                  isActive && styles.stepChipActive,
                  isCompleted && styles.stepChipCompleted,
                  isFuture && styles.stepChipFuture,
                  pressed && isCompleted && styles.stepChipPressed,
                ]}
                accessibilityRole="tab"
                accessibilityLabel={`${i + 1}. ${s.label}${isActive ? " (current)" : isCompleted ? " (completed - tap to return)" : ""}`}
                accessibilityState={{ selected: isActive, disabled: isFuture }}
              >
                {/* Step indicator circle / check */}
                <View
                  style={[
                    styles.stepBadge,
                    isActive && styles.stepBadgeActive,
                    isCompleted && styles.stepBadgeCompleted,
                    isFuture && styles.stepBadgeFuture,
                  ]}
                >
                  {isCompleted ? (
                    <Check size={11} color={colors.white} strokeWidth={3} />
                  ) : (
                    <Text
                      style={[
                        styles.stepBadgeText,
                        isActive && styles.stepBadgeTextActive,
                        isFuture && styles.stepBadgeTextFuture,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>

                {/* Step Name */}
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                    isFuture && styles.stepLabelFuture,
                  ]}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>

                {/* Active Underline Glow */}
                {isActive && <View style={styles.activeUnderline} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.peachBorder,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: fontWeights.heading,
    color: colors.ink,
    paddingHorizontal: 8,
  },
  sliderContainer: {
    paddingVertical: 8,
    backgroundColor: colors.bg,
  },
  stepsScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  stepChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    position: "relative",
  },
  stepChipActive: {
    backgroundColor: "#FFF5EB",
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  stepChipCompleted: {
    backgroundColor: colors.card,
    borderColor: colors.peachBorder,
  },
  stepChipFuture: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    opacity: 0.45,
  },
  stepChipPressed: {
    backgroundColor: colors.bgWarm,
    transform: [{ scale: 0.98 }],
  },
  stepBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  stepBadgeActive: {
    backgroundColor: colors.primary,
  },
  stepBadgeCompleted: {
    backgroundColor: colors.primaryDark,
  },
  stepBadgeFuture: {
    backgroundColor: colors.peachBorder,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
  },
  stepBadgeTextActive: {
    color: colors.white,
  },
  stepBadgeTextFuture: {
    color: colors.muted,
  },
  stepLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.ink,
  },
  stepLabelActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  stepLabelCompleted: {
    color: colors.ink,
    fontWeight: "600",
  },
  stepLabelFuture: {
    color: colors.muted,
    fontWeight: "500",
  },
  activeUnderline: {
    position: "absolute",
    bottom: -1,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
});
