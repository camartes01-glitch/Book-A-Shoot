import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { colors, elevation, radius, spacing } from "@/src/constants/theme";
import { ToggleRow } from "@/src/components/ToggleRow";

export function AddOnCard({
  title,
  subtitle,
  icon,
  enabled,
  disabled,
  disabledReason,
  summary,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  enabled: boolean;
  disabled?: boolean;
  disabledReason?: string;
  summary?: string;
  onToggle: (next: boolean) => void;
  children?: React.ReactNode;
}) {
  const visuallyOn = enabled && !disabled;
  return (
    <View style={[styles.card, visuallyOn && styles.cardOn, disabled && styles.cardDisabled]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, visuallyOn && styles.iconWrapOn]}>{icon}</View>
        <View style={{ flex: 1 }}>
          <ToggleRow
            label={title}
            description={disabled ? disabledReason ?? subtitle : visuallyOn && summary ? summary : subtitle}
            value={visuallyOn}
            disabled={disabled}
            onValueChange={onToggle}
          />
        </View>
      </View>
      {visuallyOn && children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

export function ExpandRow({
  open,
  onPress,
  label,
}: {
  open: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.expand} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }}>
      <Text style={styles.expandLabel}>{label}</Text>
      {open ? <ChevronUp size={16} color={colors.primaryDark} /> : <ChevronDown size={16} color={colors.primaryDark} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...elevation.card,
  },
  cardOn: { borderColor: colors.primary },
  cardDisabled: { backgroundColor: colors.cream },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapOn: { backgroundColor: colors.peachBorder },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  expand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6 },
  expandLabel: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
});
