import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors, elevation, radius, spacing } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

export function ServiceSelectCard({
  title,
  subtitle,
  icon,
  selected,
  summary,
  onPress,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  selected: boolean;
  summary?: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.card, selected && styles.cardOn]}>
      <Pressable
        onPress={() => {
          void selectionFeedback();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={styles.header}
      >
        <View style={styles.iconWrap}>{icon}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{selected && summary ? summary : subtitle}</Text>
        </View>
        <View style={[styles.check, selected && styles.checkOn]}>{selected ? <Check size={14} color={colors.white} /> : null}</View>
      </Pressable>
      {selected && children ? <View style={styles.body}>{children}</View> : null}
    </View>
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
  cardOn: { borderColor: colors.primary, borderWidth: 1.5 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
});
