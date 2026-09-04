import { useId } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator, type TextInputProps } from "react-native";
import { colors, radius, spacing } from "@/src/constants/theme";

export function Card({ children, accent = false, style }: { children: React.ReactNode; accent?: boolean; style?: object }) {
  return <View style={[styles.card, accent && styles.cardAccent, style]}>{children}</View>;
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.screenTitle}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  flex,
  compact,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  flex?: number;
  compact?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        flex != null ? { flex } : null,
        variant === "primary" && styles.btnPrimary,
        variant === "outline" && styles.btnOutline,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        (disabled || loading) && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <Text
            style={[
              styles.btnText,
              variant === "primary" && { color: colors.white },
              variant === "danger" && { color: colors.danger },
              (variant === "outline" || variant === "ghost") && { color: colors.primaryDark },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, error, nativeID, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const generatedId = useId();
  const inputId = nativeID ?? generatedId;
  const labelId = `${inputId}-label`;

  return (
    <View style={{ gap: 6 }}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      <TextInput
        nativeID={inputId}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        placeholderTextColor={colors.muted}
        style={[styles.input, error && { borderColor: colors.danger }]}
        {...props}
      />
      {hint ? <Muted>{hint}</Muted> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Badge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "peach" | "green" | "blue" | "violet" | "red" | "amber";
}) {
  const bg: Record<string, string> = {
    default: colors.primary,
    peach: colors.peach,
    green: colors.successBg,
    blue: colors.infoBg,
    violet: "#EDE9FE",
    red: colors.dangerBg,
    amber: colors.warningBg,
  };
  const fg: Record<string, string> = {
    default: colors.white,
    peach: colors.primaryDark,
    green: colors.success,
    blue: colors.info,
    violet: "#7C3AED",
    red: colors.danger,
    amber: colors.warning,
  };
  return (
    <View style={[styles.badge, { backgroundColor: bg[tone] }]}>
      <Text style={{ color: fg[tone], fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function BrandMark({ size = 52 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Text style={[styles.markC, { fontSize: size * 0.46 }]}>C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.peachBorder,
    borderWidth: 1,
    borderRadius: radius,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardAccent: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  screenTitle: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.4 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  errorText: { fontSize: 12, color: colors.danger, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.peachBorder,
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnCompact: { paddingVertical: 9, paddingHorizontal: 12, minHeight: 38 },
  btnPrimary: { backgroundColor: colors.primary },
  btnOutline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary },
  btnGhost: { backgroundColor: colors.peach },
  btnDanger: { backgroundColor: colors.dangerBg },
  btnText: { fontSize: 15, fontWeight: "700" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  mark: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  markC: { color: "#fff", fontWeight: "800" },
});
