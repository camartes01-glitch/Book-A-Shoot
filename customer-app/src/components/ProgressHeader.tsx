import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { router } from "expo-router";
import { colors, spacing } from "@/src/constants/theme";

export const WIZARD_STEPS = [
  { id: "event", label: "Event" },
  { id: "services", label: "Services" },
  { id: "deliverables", label: "Deliverables" },
  { id: "budget", label: "Budget" },
  { id: "matches", label: "Matches" },
  { id: "confirm", label: "Confirm" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export function ProgressHeader({
  title,
  step,
  onBack,
}: {
  title: string;
  step: WizardStepId;
  onBack?: () => void;
}) {
  const activeIndex = WIZARD_STEPS.findIndex((s) => s.id === step);

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
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 34 }} />
      </View>
      <View style={styles.stepsRow}>
        {WIZARD_STEPS.map((s, i) => (
          <View key={s.id} style={styles.stepItem}>
            <View style={[styles.dot, i <= activeIndex && styles.dotActive]}>
              <Text style={[styles.dotText, i <= activeIndex && styles.dotTextActive]}>{String(i + 1).padStart(2, "0")}</Text>
            </View>
            {i < WIZARD_STEPS.length - 1 ? <View style={[styles.line, i < activeIndex && styles.lineActive]} /> : null}
          </View>
        ))}
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: "800", color: colors.ink },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  stepItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { backgroundColor: colors.primary },
  dotText: { fontSize: 9, fontWeight: "800", color: colors.primaryDark },
  dotTextActive: { color: colors.white },
  line: { flex: 1, height: 2, backgroundColor: colors.peach, marginHorizontal: 2 },
  lineActive: { backgroundColor: colors.primary },
});
