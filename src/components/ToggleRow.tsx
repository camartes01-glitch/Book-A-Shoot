import { StyleSheet, Switch, Text, View } from "react-native";
import { colors } from "@/src/constants/theme";

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.peachBorder, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  desc: { fontSize: 12, color: colors.muted },
});
