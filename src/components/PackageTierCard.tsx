import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import { Badge, Card, Muted, Title } from "@/src/components/ui";
import type { PackageOption } from "@/src/types/booking";
import { formatInrRange, formatPackageOverallLabel } from "@/src/utils/format";
import { colors, radius, spacing } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

export function PackageTierCard({
  pkg,
  selected,
  onSelect,
  selectable = true,
}: {
  pkg: PackageOption;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
}) {
  const prominent = pkg.id === "signature";

  return (
    <Card
      accent={!!selected}
      style={
        prominent && !selected
          ? { borderColor: colors.primary, backgroundColor: colors.peach, borderWidth: 2 }
          : prominent
            ? { backgroundColor: colors.peach }
            : undefined
      }
    >
      <Pressable
        onPress={
          selectable
            ? () => {
                void selectionFeedback();
                onSelect?.();
              }
            : undefined
        }
        disabled={!selectable}
        accessibilityRole={selectable ? "button" : undefined}
        accessibilityState={{ selected: !!selected }}
        accessibilityLabel={`${formatPackageOverallLabel(pkg.label, pkg.minPrice, pkg.maxPrice)} package`}
        style={({ pressed }) => [styles.pressableContent, pressed && selectable && styles.cardPressed]}
      >
        <View style={styles.titleRow}>
          <Title style={styles.packageName}>{formatPackageOverallLabel(pkg.label, pkg.minPrice, pkg.maxPrice)}</Title>
          {prominent ? <Badge label="Most chosen" /> : null}
          {pkg.recommended ? <Badge label="Closest to your budget" tone="green" /> : null}
          {selected ? <Badge label="Selected" tone="green" /> : null}
        </View>

        <Text style={styles.price}>
          {pkg.maxPrice > 0 ? formatInrRange(pkg.minPrice, pkg.maxPrice) : "Select coverage to see rates"}
        </Text>
        <Muted>{pkg.headline}</Muted>

        <View style={{ gap: 6 }}>
          {pkg.serviceLines.map((line) => (
            <View key={line.serviceId} style={styles.line}>
              <CheckCircle2 size={14} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Muted style={{ color: colors.ink, fontWeight: "700" }}>
                  {line.label}
                  {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                </Muted>
                <Muted>
                  {formatInrRange(line.minPrice, line.maxPrice)}
                  {line.note ? ` · ${line.note}` : ""}
                </Muted>
              </View>
            </View>
          ))}
          {!pkg.serviceLines.length ? <Muted>No coverage selected yet.</Muted> : null}
        </View>

        {selectable ? (
          <View
            pointerEvents="none"
            style={[
              styles.actionButtonVisual,
              selected ? styles.actionButtonSelected : styles.actionButtonOutline,
            ]}
          >
            <Text
              style={[
                styles.actionButtonText,
                selected ? styles.actionButtonTextSelected : styles.actionButtonTextOutline,
              ]}
            >
              {selected ? "Selected" : "Select package"}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  pressableContent: {
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.96,
  },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, flexWrap: "wrap" },
  packageName: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primaryDark,
    marginTop: spacing.xs,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  actionButtonVisual: {
    minHeight: 46,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  actionButtonSelected: {
    backgroundColor: colors.primary,
  },
  actionButtonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  actionButtonTextSelected: {
    color: colors.white,
  },
  actionButtonTextOutline: {
    color: colors.primaryDark,
  },
});
