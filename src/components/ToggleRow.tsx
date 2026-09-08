import { StyleSheet, Switch, Text, View } from "react-native";
import { colors } from "@/src/constants/theme";

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]} pointerEvents={disabled ? "none" : "auto"}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      <Switch
        value={disabled ? false : value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#D1D5DB", true: colors.primary }}
        thumbColor={colors.white}
        ios_backgroundColor="#D1D5DB"
        accessibilityState={{ disabled: !!disabled, checked: disabled ? false : value }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowDisabled: { opacity: 0.55 },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  labelDisabled: { color: colors.muted },
  desc: { fontSize: 12, color: colors.muted },
});
