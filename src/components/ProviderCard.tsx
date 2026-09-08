import { Image, StyleSheet, Text, View } from "react-native";
import { Award, CheckCircle2, MapPin } from "lucide-react-native";
import type { VendorMatchResult } from "@/src/types/booking";
import { RatingStars } from "@/src/components/RatingStars";
import { Button } from "@/src/components/ui";
import { formatInr } from "@/src/utils/format";
import { colors, elevation, radius, spacing } from "@/src/constants/theme";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProviderCard({
  match,
  onViewProfile,
  onSelect,
  selected,
  packageLabel,
}: {
  match: VendorMatchResult;
  onViewProfile: () => void;
  onSelect: () => void;
  selected?: boolean;
  packageLabel?: string;
}) {
  const location = [match.area, match.city].filter((part, i, arr) => part && arr.indexOf(part) === i).join(", ");

  return (
    <View style={[styles.card, selected && styles.cardSelected]} accessibilityState={{ selected: !!selected }}>
      {match.imageUrl ? (
        <Image source={{ uri: match.imageUrl }} style={styles.cover} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : null}
      <View style={styles.headerRow}>
        {match.imageUrl ? null : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(match.studioName)}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={1}>
            {match.studioName}
          </Text>
          {match.serviceCategory ? <Text style={styles.category}>{match.serviceCategory}</Text> : null}
          {location ? (
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.muted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
        </View>
        {match.available ? (
          <View style={styles.availableBadge}>
            <CheckCircle2 size={13} color={colors.success} />
            <Text style={styles.availableText}>Available</Text>
          </View>
        ) : match.unavailableReason ? (
          <View style={[styles.availableBadge, { backgroundColor: colors.warningBg }]}>
            <Text style={[styles.availableText, { color: colors.warning }]}>Check dates</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <RatingStars rating={match.rating} />
        {match.completedBookings > 0 ? <Text style={styles.metaText}>· {match.completedBookings} bookings</Text> : null}
      </View>
      {match.experienceYears > 0 ? (
        <View style={styles.metaRow}>
          <Award size={13} color={colors.muted} />
          <Text style={styles.metaText}>{match.experienceYears} years experience</Text>
        </View>
      ) : null}
      {packageLabel ? <Text style={styles.pkg}>Package: {packageLabel}</Text> : null}
      {match.estimatedPrice > 0 ? (
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Estimated for your event</Text>
          <Text style={styles.price}>{formatInr(match.estimatedPrice)}</Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button label="View profile" variant="outline" onPress={onViewProfile} flex={1} compact />
        <Button label={selected ? "Selected" : "Select provider"} onPress={onSelect} flex={1} compact disabled={selected} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
    overflow: "hidden",
    ...elevation.card,
  },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  cover: {
    width: "100%",
    height: 132,
    borderRadius: 12,
    backgroundColor: colors.peach,
    marginBottom: 4,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "800", color: colors.primaryDark },
  name: { fontSize: 16, fontWeight: "800", color: colors.ink },
  category: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availableText: { fontSize: 10, fontWeight: "800", color: colors.success },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  pkg: { fontSize: 12, fontWeight: "700", color: colors.ink },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  price: { fontSize: 17, fontWeight: "800", color: colors.primaryDark },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
});
