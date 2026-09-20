import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Award, CheckCircle2, ChevronRight, Lock, MapPin, ShieldCheck } from "lucide-react-native";
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
    .toUpperCase() || "PF";
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
  onSelect?: () => void;
  selected?: boolean;
  packageLabel?: string;
}) {
  const location = [match.area, match.city].filter((part, i, arr) => part && arr.indexOf(part) === i).join(", ");

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onViewProfile}
        style={({ pressed }) => [styles.pressableArea, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`View profile of ${match.studioName}`}
      >
        {match.imageUrl ? (
          <View style={styles.coverWrapper}>
            <Image
              source={{ uri: match.imageUrl }}
              style={styles.cover}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.verifiedFloatingBadge}>
              <ShieldCheck size={13} color="#059669" strokeWidth={2.5} />
              <Text style={styles.verifiedFloatingText}>Verified Firm</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.headerRow}>
          {match.imageUrl ? null : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(match.studioName)}</Text>
            </View>
          )}

          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {match.studioName}
              </Text>
              {match.available ? (
                <View style={styles.availableBadge}>
                  <CheckCircle2 size={12} color="#059669" strokeWidth={2.5} />
                  <Text style={styles.availableText}>Available</Text>
                </View>
              ) : match.unavailableReason ? (
                <View style={[styles.availableBadge, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                  <Text style={[styles.availableText, { color: "#D97706" }]}>Check dates</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.firmBadge}>
                <Text style={styles.firmBadgeText}>Photography Firm</Text>
              </View>
              {match.serviceCategory ? (
                <Text style={styles.category} numberOfLines={1}>
                  {match.serviceCategory}
                </Text>
              ) : null}
            </View>

            {location ? (
              <View style={styles.metaRow}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stats & Meta row */}
        <View style={styles.statsRow}>
          <View style={styles.metaRow}>
            <RatingStars rating={match.rating} />
            {match.completedBookings > 0 ? (
              <Text style={styles.metaText}>· {match.completedBookings} shoots completed</Text>
            ) : null}
          </View>

          {match.experienceYears > 0 ? (
            <View style={styles.metaRow}>
              <Award size={13} color="#64748B" />
              <Text style={styles.metaText}>{match.experienceYears} yrs exp</Text>
            </View>
          ) : null}
        </View>

        {/* Privacy badge */}
        <View style={styles.contactMaskedBadge}>
          <Lock size={12} color="#C2410C" />
          <Text style={styles.contactMaskedText}>Contact unlocks upon acceptance</Text>
        </View>


      </Pressable>

      {/* Primary Action Button: View Profile & Portfolio */}
      <View style={styles.actions}>
        <Button
          label="View Profile & Portfolio"
          variant="outline"
          onPress={onViewProfile}
          icon={<ChevronRight size={16} color="#EA580C" strokeWidth={2.5} />}
          flex={1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: spacing.md,
    gap: 10,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  pressableArea: {
    gap: 10,
  },
  cardPressed: {
    opacity: 0.95,
  },
  coverWrapper: {
    position: "relative",
    width: "100%",
    height: 140,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  verifiedFloatingBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verifiedFloatingText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#059669",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    fontSize: 16,
    color: "#EA580C",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  name: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 1,
  },
  firmBadge: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  firmBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  category: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availableText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  pkg: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#EA580C",
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  priceLabel: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  price: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  contactMaskedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  contactMaskedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C2410C",
  },
  actions: {
    marginTop: 4,
    width: "100%",
  },
});
