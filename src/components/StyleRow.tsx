import { StyleSheet, View } from "react-native";
import { ToggleRow } from "@/src/components/ToggleRow";
import { Stepper } from "@/src/components/Stepper";
import { colors } from "@/src/constants/theme";

/** A "Traditional" / "Candid" style row: enable toggle + a stepper that only
 * appears once enabled (spec sections 10–11, "Number of photographers"). */
export function StyleRow({
  label,
  description,
  enabled,
  count,
  min,
  max,
  onToggle,
  onCountChange,
  countLabel,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  count: number;
  min: number;
  max: number;
  onToggle: (next: boolean) => void;
  onCountChange: (next: number) => void;
  countLabel: string;
}) {
  return (
    <View style={styles.wrap}>
      <ToggleRow label={label} description={description} value={enabled} onValueChange={onToggle} />
      {enabled ? (
        <View style={styles.stepperWrap}>
          <Stepper label={countLabel} value={count} min={min} max={max} onChange={onCountChange} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  stepperWrap: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
