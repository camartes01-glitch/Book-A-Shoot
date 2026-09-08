import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ProgressHeader, type WizardStepId } from "@/src/components/ProgressHeader";
import { colors, spacing } from "@/src/constants/theme";

/** Shared shell for booking screens: light progress + scroll + sticky CTA. */
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
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ProgressHeader title={title} step={step} onBack={onBack} />
        <ScrollView
          contentContainerStyle={[styles.content, footer ? { paddingBottom: spacing.xxl } : { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: spacing.md,
  },
});
