import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressHeader, type WizardStepId } from "@/src/components/ProgressHeader";
import { colors, spacing } from "@/src/constants/theme";

/** Shared shell for every step of the booking wizard (spec section 39):
 * progress header + scrollable content + sticky bottom CTA row. */
export function WizardScreen({
  title,
  step,
  onBack,
  footer,
  children,
}: {
  title: string;
  step: WizardStepId;
  onBack?: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ProgressHeader title={title} step={step} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: spacing.md,
  },
});
