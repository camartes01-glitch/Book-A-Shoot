import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/src/constants/theme";

export function ScreenContainer({
  children,
  scroll = true,
  footer,
  contentStyle,
  keyboardAvoiding = false,
  includeBottomSafeArea = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  contentStyle?: object;
  keyboardAvoiding?: boolean;
  includeBottomSafeArea?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const Content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
  );

  const framed = (
    <SafeAreaView
      style={styles.safe}
      edges={includeBottomSafeArea ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]}
    >
      {Content}
      {footer ? (
        <View style={[styles.footer, !includeBottomSafeArea && { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );

  if (!keyboardAvoiding) return framed;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {framed}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: spacing.md,
  },
});
