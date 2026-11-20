import React, { memo, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { Badge } from "@/src/components/ui";
import type { Deliverables, EventDay, PackageOption, PackageTierId } from "@/src/types/booking";
import { getDetailedPackageBreakdown } from "@/src/config/approvedBudget";
import { formatInrRange } from "@/src/utils/format";
import { colors, radius, spacing } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

type Line = { key: string; label: string; note?: string | null; price: string };

/** One label/price row. The price sits right of the label when there is room
 * and wraps underneath (right-aligned) on narrow phones — it can never be
 * pushed outside the card. */
function PriceRow({ line, muted }: { line: Line; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelCol}>
        <Text style={[styles.rowLabel, muted && styles.rowLabelMuted]}>{line.label}</Text>
        {line.note ? <Text style={styles.rowNote}>{line.note}</Text> : null}
      </View>
      <Text style={styles.rowPrice}>{line.price}</Text>
    </View>
  );
}

function Section({ title, subtotal, lines }: { title: string; subtotal?: string; lines: Line[] }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtotal ? <Text style={styles.sectionSubtotal}>{subtotal}</Text> : null}
      </View>
      {lines.length ? (
        <View style={styles.lines}>
          {lines.map((l) => (
            <PriceRow key={l.key} line={l} />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No coverage selected for this day.</Text>
      )}
    </View>
  );
}

function PackageTierCardImpl({
  pkg,
  selected,
  onSelect,
  selectable = true,
  days = [],
  deliverables,
}: {
  pkg: PackageOption;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  days?: EventDay[];
  deliverables?: Deliverables;
}) {
  const [expanded, setExpanded] = useState(false);
  const prominent = pkg.id === "signature";

  // Breakdown only needs computing when it is visible.
  const breakdown = useMemo(
    () => (expanded ? getDetailedPackageBreakdown(days, pkg.id as PackageTierId, deliverables) : null),
    [expanded, days, pkg.id, deliverables],
  );

  const toggleExpand = () => {
    void selectionFeedback();
    setExpanded((prev) => !prev);
  };

  const handleSelect = () => {
    if (!selectable) {
      toggleExpand();
      return;
    }
    void selectionFeedback();
    onSelect?.();
  };

  const priceText = pkg.maxPrice > 0 ? formatInrRange(pkg.minPrice, pkg.maxPrice) : "Select coverage to see rates";

  return (
    <View
      style={[
        styles.card,
        prominent && styles.cardProminent,
        selected && styles.cardSelected,
      ]}
    >
      <Pressable
        onPress={handleSelect}
        accessibilityRole={selectable ? "radio" : "button"}
        accessibilityState={selectable ? { selected: !!selected } : undefined}
        accessibilityLabel={`${pkg.label} package, ${priceText}`}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.headerTop}>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{pkg.label}</Text>
            <View style={styles.badges}>
              {prominent ? <Badge label="Most chosen" /> : null}
              {pkg.recommended ? <Badge label="Closest to budget" tone="green" /> : null}
            </View>
          </View>
          {selectable ? (
            <View style={[styles.radio, selected && styles.radioOn]}>
              {selected ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
            </View>
          ) : null}
        </View>
        <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {priceText}
        </Text>
        {pkg.headline ? <Text style={styles.headline}>{pkg.headline}</Text> : null}
      </Pressable>

      <Pressable
        onPress={toggleExpand}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={6}
      >
        <Text style={styles.toggleText}>{expanded ? "Hide cost breakdown" : "See cost breakdown"}</Text>
        {expanded ? <ChevronUp size={16} color={colors.primaryDark} /> : <ChevronDown size={16} color={colors.primaryDark} />}
      </Pressable>

      {expanded && breakdown ? (
        <View style={styles.body}>
          {breakdown.events.length > 0 ? (
            breakdown.events.map((evt) => (
              <Section
                key={evt.dayId}
                title={evt.eventTitle}
                subtotal={formatInrRange(evt.subtotal.min, evt.subtotal.max)}
                lines={evt.lines.map((line) => ({
                  key: line.serviceId,
                  label: `${line.label}${line.quantity > 1 ? ` × ${line.quantity}` : ""}`,
                  note: line.note,
                  price: formatInrRange(line.minPrice, line.maxPrice),
                }))}
              />
            ))
          ) : (
            <Section
              title="Included coverage"
              lines={pkg.serviceLines.map((line) => ({
                key: line.serviceId,
                label: `${line.label}${line.quantity > 1 ? ` × ${line.quantity}` : ""}`,
                note: line.note,
                price: formatInrRange(line.minPrice, line.maxPrice),
              }))}
            />
          )}

          {breakdown.deliverablesLines.length > 0 ? (
            <Section
              title="Deliverables & add-ons"
              subtotal={formatInrRange(breakdown.deliverablesSubtotal.min, breakdown.deliverablesSubtotal.max)}
              lines={breakdown.deliverablesLines.map((line, idx) => ({
                key: `${line.serviceId}-${idx}`,
                label: line.label,
                note: line.note,
                price: formatInrRange(line.minPrice, line.maxPrice),
              }))}
            />
          ) : null}

          <View style={styles.total}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatInrRange(breakdown.grandTotal.min, breakdown.grandTotal.max)}
            </Text>
            <Text style={styles.totalNote}>Approved range across all selected days. Final price is confirmed by the photographer.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const PackageTierCard = memo(PackageTierCardImpl);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardProminent: {
    borderColor: colors.peachBorder,
    backgroundColor: colors.cream,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.peach,
  },
  pressed: { opacity: 0.85 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  nameCol: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  name: { fontSize: 17, fontWeight: "800", color: colors.ink },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.disabled,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  price: { fontSize: 20, fontWeight: "800", color: colors.primaryDark, marginTop: 2 },
  headline: { fontSize: 13, lineHeight: 18, color: colors.muted },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  toggleText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    columnGap: 8,
    rowGap: 2,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgWarm,
  },
  sectionTitle: { flexShrink: 1, fontSize: 14, fontWeight: "800", color: colors.ink },
  sectionSubtotal: { marginLeft: "auto", fontSize: 13.5, fontWeight: "800", color: colors.primaryDark },
  lines: { gap: 10 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    columnGap: 12,
    rowGap: 2,
  },
  rowLabelCol: { flexGrow: 1, flexShrink: 1, flexBasis: "55%" },
  rowLabel: { fontSize: 13.5, fontWeight: "600", color: colors.ink, lineHeight: 19 },
  rowLabelMuted: { color: colors.muted },
  rowNote: { fontSize: 12, color: colors.muted, lineHeight: 16, marginTop: 1 },
  rowPrice: {
    marginLeft: "auto",
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  emptyText: { fontSize: 12.5, fontStyle: "italic", color: colors.muted },
  total: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    padding: spacing.md,
    gap: 2,
  },
  totalLabel: { fontSize: 12.5, fontWeight: "700", color: "#D1D5DB", textTransform: "uppercase", letterSpacing: 0.6 },
  totalValue: { fontSize: 22, fontWeight: "800", color: colors.white, fontVariant: ["tabular-nums"] },
  totalNote: { fontSize: 11.5, color: "#9CA3AF", lineHeight: 16, marginTop: 2 },
});
