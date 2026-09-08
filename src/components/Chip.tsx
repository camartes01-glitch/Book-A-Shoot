import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors, touchTarget } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        void selectionFeedback();
        onPress();
      }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {selected ? <Check size={14} color={colors.white} /> : null}
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: touchTarget - 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  labelSelected: { color: colors.white },
});
