import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { colors, touchTarget } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <View style={styles.row}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.control}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ? `Decrease ${label}` : "Decrease"}
          disabled={value <= min}
          onPress={() => {
            void selectionFeedback();
            onChange(Math.max(min, value - 1));
          }}
          style={[styles.btn, value <= min && styles.btnDisabled]}
          hitSlop={6}
        >
          <Minus size={16} color={value <= min ? colors.muted : colors.primaryDark} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label ? `Increase ${label}` : "Increase"}
          disabled={value >= max}
          onPress={() => {
            void selectionFeedback();
            onChange(Math.min(max, value + 1));
          }}
          style={[styles.btn, value >= max && styles.btnDisabled]}
          hitSlop={6}
        >
          <Plus size={16} color={value >= max ? colors.muted : colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink, flex: 1 },
  control: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  btn: {
    width: touchTarget - 4,
    height: touchTarget - 4,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.45 },
  value: { fontSize: 16, fontWeight: "800", color: colors.ink, minWidth: 22, textAlign: "center" },
});
