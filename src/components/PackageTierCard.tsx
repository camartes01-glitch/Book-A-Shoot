import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react-native";
import { Badge, Card, Muted } from "@/src/components/ui";
import type { Deliverables, EventDay, PackageOption, PackageTierId } from "@/src/types/booking";
import { getDetailedPackageBreakdown } from "@/src/config/approvedBudget";
import { formatInrRange } from "@/src/utils/format";
import { colors, radius, spacing } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

export function PackageTierCard({
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 640;
  const prominent = pkg.id === "signature";

  const breakdown = getDetailedPackageBreakdown(days, pkg.id as PackageTierId, deliverables);

  const toggleExpand = () => {
    void selectionFeedback();
    setExpanded((prev) => !prev);
  };

  const handleSelect = () => {
    void selectionFeedback();
    onSelect?.();
  };

  return (
    <Card
      accent={!!selected}
      style={[
        styles.cardContainer,
        prominent && !selected
          ? { borderColor: colors.primary, backgroundColor: colors.peach, borderWidth: 1.5 }
          : prominent
            ? { backgroundColor: colors.peach }
            : undefined,
      ]}
    >
      {/* Header Bar - Tap header or arrow to toggle expand */}
      <Pressable
        onPress={toggleExpand}
        accessibilityRole="button"
        accessibilityLabel={`${pkg.label} package. ${expanded ? "Collapse details" : "Expand breakdown details"}`}
        style={({ pressed }) => [styles.headerPressable, pressed && styles.cardPressed]}
      >
        <View style={styles.headerMainRow}>
          <View style={styles.headerTitleCol}>
            <View style={styles.titleRow}>
              <Text style={styles.packageName}>{pkg.label}</Text>
              <Text style={styles.priceSeparator}>—</Text>
              <Text style={styles.price}>
                {pkg.maxPrice > 0 ? formatInrRange(pkg.minPrice, pkg.maxPrice) : "Select coverage to see rates"}
              </Text>
              {prominent ? <Badge label="Most chosen" /> : null}
              {pkg.recommended ? <Badge label="Closest to your budget" tone="green" /> : null}
              {selected ? <Badge label="Selected" tone="green" /> : null}
            </View>
            <Muted style={styles.headlineText}>{pkg.headline}</Muted>
          </View>

          <View
            style={styles.arrowButton}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          >
            {expanded ? (
              <ChevronUp size={20} color={colors.primaryDark} />
            ) : (
              <ChevronDown size={20} color={colors.primaryDark} />
            )}
          </View>
        </View>

        {!expanded ? (
          <View style={styles.expandHintRow}>
            <Text style={styles.expandHintText}>Tap card or arrow for event-by-event breakdown</Text>
            <ChevronDown size={13} color={colors.primary} />
          </View>
        ) : null}
      </Pressable>

      {/* Expanded Cost Breakdown Section */}
      {expanded ? (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />

          {/* Per-Event Breakdown */}
          {breakdown.events.length > 0 ? (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>
                Event Breakdown ({breakdown.events.length} event{breakdown.events.length > 1 ? "s" : ""})
              </Text>

              <View style={[styles.eventsGrid, isDesktop && breakdown.events.length > 1 && styles.eventsGridDesktop]}>
                {breakdown.events.map((evt) => (
                  <View
                    key={evt.dayId}
                    style={[styles.eventBox, isDesktop && breakdown.events.length > 1 && styles.eventBoxDesktop]}
                  >
                    <View style={styles.eventHeaderRow}>
                      <Text style={styles.eventTitle}>{evt.eventTitle}</Text>
                      <Text style={styles.eventSubtotal}>
                        {formatInrRange(evt.subtotal.min, evt.subtotal.max)}
                      </Text>
                    </View>

                    <View style={styles.linesList}>
                      {evt.lines.map((line) => (
                        <View key={line.serviceId} style={styles.lineItem}>
                          <CheckCircle2 size={13} color={colors.success} style={{ marginTop: 2 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.lineLabel}>
                              {line.label}
                              {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                            </Text>
                            {line.note ? <Text style={styles.lineNote}>{line.note}</Text> : null}
                          </View>
                          <Text style={styles.linePrice}>{formatInrRange(line.minPrice, line.maxPrice)}</Text>
                        </View>
                      ))}
                      {!evt.lines.length ? (
                        <Muted style={{ fontStyle: "italic", fontSize: 12 }}>No coverage requirements for this day.</Muted>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* Fallback if days array is not available */
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>Included Requirements</Text>
              <View style={styles.linesList}>
                {pkg.serviceLines.map((line) => (
                  <View key={line.serviceId} style={styles.lineItem}>
                    <CheckCircle2 size={13} color={colors.success} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineLabel}>
                        {line.label}
                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                      </Text>
                      {line.note ? <Text style={styles.lineNote}>{line.note}</Text> : null}
                    </View>
                    <Text style={styles.linePrice}>{formatInrRange(line.minPrice, line.maxPrice)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Common Selections (Albums, Teasers, etc.) */}
          {breakdown.deliverablesLines.length > 0 ? (
            <View style={styles.sectionContainer}>
              <View style={styles.eventHeaderRow}>
                <Text style={styles.sectionHeading}>Common Deliverables & Add-ons</Text>
                <Text style={styles.eventSubtotal}>
                  {formatInrRange(breakdown.deliverablesSubtotal.min, breakdown.deliverablesSubtotal.max)}
                </Text>
              </View>

              <View style={styles.eventBox}>
                <View style={styles.linesList}>
                  {breakdown.deliverablesLines.map((line, idx) => (
                    <View key={`${line.serviceId}-${idx}`} style={styles.lineItem}>
                      <CheckCircle2 size={13} color={colors.primary} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lineLabel}>{line.label}</Text>
                        {line.note ? <Text style={styles.lineNote}>{line.note}</Text> : null}
                      </View>
                      <Text style={styles.linePrice}>{formatInrRange(line.minPrice, line.maxPrice)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {/* Total Added Cost Summary Banner */}
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Added Cost</Text>
              <Text style={styles.totalValue}>
                {formatInrRange(breakdown.grandTotal.min, breakdown.grandTotal.max)}
              </Text>
            </View>
          </View>

          {/* Close Card Button */}
          <Pressable onPress={toggleExpand} style={styles.closeCardButton}>
            <Text style={styles.closeCardText}>Close breakdown details</Text>
            <ChevronUp size={15} color={colors.primaryDark} />
          </Pressable>

          {/* Select Package Action Button */}
          {selectable ? (
            <Pressable
              onPress={handleSelect}
              accessibilityRole="button"
              accessibilityLabel={`Select ${pkg.label} package`}
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
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    padding: spacing.md,
  },
  headerPressable: {
    gap: 4,
  },
  cardPressed: {
    opacity: 0.92,
  },
  headerMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  packageName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  priceSeparator: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.muted,
  },
  price: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  headlineText: {
    fontSize: 13.5,
    fontWeight: "500",
    color: colors.muted,
  },
  arrowButton: {
    padding: 6,
    borderRadius: radius,
    backgroundColor: colors.bgWarm,
    alignItems: "center",
    justifyContent: "center",
  },
  expandHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  expandHintText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  expandedContent: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 2,
  },
  sectionContainer: {
    gap: spacing.xs,
  },
  sectionHeading: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: 0.1,
  },
  eventsGrid: {
    gap: spacing.sm,
  },
  eventsGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  eventBox: {
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  eventBoxDesktop: {
    flex: 1,
    minWidth: 280,
  },
  eventHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.bgWarm,
    paddingBottom: 4,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.ink,
  },
  eventSubtotal: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  linesList: {
    gap: 6,
  },
  lineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  lineLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.ink,
  },
  lineNote: {
    fontSize: 12,
    color: colors.muted,
  },
  linePrice: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  totalBox: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius,
    padding: spacing.sm,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.peach,
  },
  closeCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  closeCardText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  actionButtonVisual: {
    minHeight: 44,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  actionButtonSelected: {
    backgroundColor: colors.primary,
  },
  actionButtonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
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


