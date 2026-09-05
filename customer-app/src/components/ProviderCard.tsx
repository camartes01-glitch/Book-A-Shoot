import { Pressable, StyleSheet, Text, View } from "react-native";
import { Award, CheckCircle2, MapPin } from "lucide-react-native";
import type { VendorMatchResult } from "@/src/types/booking";
import { RatingStars } from "@/src/components/RatingStars";
import { Button } from "@/src/components/ui";
import { formatInr } from "@/src/utils/format";
import { colors, radius, spacing } from "@/src/constants/theme";

export function ProviderCard({
  match,
  onViewProfile,
  onSelect,
  selected,
}: {
  match: VendorMatchResult;
  onViewProfile: () => void;
  onSelect: () => void;
  selected?: boolean;
}) {
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{match.studioName}</Text>
        <View style={styles.availableBadge}>
          <CheckCircle2 size={13} color={colors.success} />
          <Text style={styles.availableText}>Available</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <MapPin size={13} color={colors.muted} />
        <Text style={styles.metaText}>{match.city}</Text>
      </View>
      <View style={styles.metaRow}>
        <RatingStars rating={match.rating} />
        <Text style={styles.metaText}>· {match.completedBookings} completed bookings</Text>
      </View>
      <View style={styles.metaRow}>
        <Award size={13} color={colors.muted} />
        <Text style={styles.metaText}>{match.experienceYears} years experience</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Estimated package</Text>
        <Text style={styles.price}>{formatInr(match.estimatedPrice)}</Text>
      </View>
      <View style={styles.actions}>
        <Button label="View Profile" variant="outline" onPress={onViewProfile} flex={1} compact />
        <Button label={selected ? "Selected" : "Select"} onPress={onSelect} flex={1} compact disabled={selected} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    padding: spacing.md,
    gap: 6,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.cream },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 16, fontWeight: "800", color: colors.ink, flexShrink: 1 },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availableText: { fontSize: 10, fontWeight: "800", color: colors.success },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, color: colors.muted },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  price: { fontSize: 17, fontWeight: "800", color: colors.primaryDark },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
});
