import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";
import { colors, spacing } from "@/src/constants/theme";

/** Customer-facing marketplace steps. Engine screens map onto these five. */
export const WIZARD_STEPS = [
  { id: "event", label: "Event" },
  { id: "services", label: "Services" },
  { id: "budget", label: "Budget" },
  { id: "packages", label: "Packages" },
  { id: "providers", label: "Providers" },
] as const;

export type VisualStepId = (typeof WIZARD_STEPS)[number]["id"];

/** Includes legacy screen ids so existing routes keep compiling. */
export type WizardStepId = VisualStepId | "deliverables" | "matches" | "confirm";

const VISUAL_INDEX: Record<WizardStepId, number> = {
  event: 0,
  services: 1,
  deliverables: 1,
  budget: 2,
  packages: 3,
  providers: 4,
  matches: 4,
  confirm: 4,
};

export function ProgressHeader({
  title,
  step,
  onBack,
}: {
  title: string;
  step: WizardStepId;
  onBack?: () => void;
}) {
  const activeIndex = VISUAL_INDEX[step] ?? 0;

  return (
    <View style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack ?? (() => router.back())}
          style={styles.backBtn}
          hitSlop={10}
        >
          <ChevronLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 34 }} />
      </View>
      <View style={styles.stepsRow} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 4, now: activeIndex }}>
        {WIZARD_STEPS.map((s, i) => {
          const done = i <= activeIndex;
          return (
            <View key={s.id} style={styles.stepItem}>
              <View style={[styles.bar, done && styles.barActive]} />
              <Text
                style={[styles.stepLabel, done && styles.stepLabelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.ink, paddingHorizontal: 8 },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  stepItem: { flex: 1, gap: 4 },
  bar: { height: 3, borderRadius: 99, backgroundColor: colors.peach },
  barActive: { backgroundColor: colors.primary },
  stepLabel: { fontSize: 9, fontWeight: "700", color: colors.muted, textAlign: "center" },
  stepLabelActive: { color: colors.primaryDark },
});
