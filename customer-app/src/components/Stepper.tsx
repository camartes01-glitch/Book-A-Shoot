import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { colors } from "@/src/constants/theme";

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
          accessibilityLabel="Decrease"
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.btn, value <= min && styles.btnDisabled]}
          hitSlop={8}
        >
          <Minus size={16} color={value <= min ? colors.muted : colors.primaryDark} />
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase"
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.btn, value >= max && styles.btnDisabled]}
          hitSlop={8}
        >
          <Plus size={16} color={value >= max ? colors.muted : colors.primaryDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink, flex: 1 },
  control: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.peach,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.5 },
  value: { fontSize: 16, fontWeight: "800", color: colors.ink, minWidth: 20, textAlign: "center" },
});
