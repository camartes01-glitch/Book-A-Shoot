import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MessageSquare, SearchX, SlidersHorizontal } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Muted } from "@/src/components/ui";
import { ProviderCard } from "@/src/components/ProviderCard";
import { EmptyState } from "@/src/components/EmptyState";
import { useAppStore } from "@/src/state/AppProvider";
import { MAX_MATCHES } from "@/src/engine/matching";
import { selectedPackageQuote } from "@/src/engine/pricing";
import { colors, spacing } from "@/src/constants/theme";

export default function VendorMatchesScreen() {
  const { activeDraft, loadVendorMatches, selectVendor } = useAppStore();
  const [loading, setLoading] = useState(!activeDraft?.matches);
  const [error, setError] = useState<string | null>(null);
  const transitionLockRef = useRef(false);

  const runMatching = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadVendorMatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load matching photography firms.");
    } finally {
      setLoading(false);
    }
  }, [loadVendorMatches]);

  useEffect(() => {
    if (!activeDraft?.matches) void runMatching();
  }, [activeDraft?.matches, runMatching]);

  const matches = activeDraft?.matches ?? [];
  const quoted = activeDraft ? selectedPackageQuote(activeDraft) : undefined;
  const pkgLabel = quoted?.label;

  const onDispatchToAll = async () => {
    if (!matches.length || transitionLockRef.current) return;
    transitionLockRef.current = true;
    try {
      const topId = activeDraft?.selectedVendorId || matches[0].vendorId;
      await selectVendor(topId);
      router.push("/booking/confirm");
    } finally {
      setTimeout(() => {
        transitionLockRef.current = false;
      }, 500);
    }
  };

  return (
    <WizardScreen
      title="Suitable Photographers"
      step="providers"
      onBack={() => router.push("/booking/location-preference")}
      footer={
        matches.length > 0 ? (
          <Button
            label={
              matches.length === 1
                ? "Dispatch request to this firm →"
                : `Dispatch request to all ${matches.length} firms →`
            }
            onPress={onDispatchToAll}
            flex={1}
          />
        ) : undefined
      }
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#EA580C" size="large" />
          <Text style={styles.loadingTitle}>Matching top verified photography firms…</Text>
          <Muted>Scanning live studio catalogs in your preferred location</Muted>
        </View>
      ) : error ? (
        <EmptyState
          icon={<SearchX size={40} color={colors.danger} />}
          title="Couldn't load photography firms"
          body={error}
          actionLabel="Try again"
          onAction={runMatching}
        />
      ) : matches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<SlidersHorizontal size={36} color={colors.primaryDark} />}
            title="We couldn't find the right match yet."
            body="Changing the date, time, location, services or budget can produce more matches from the live Camartes catalog."
          />
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button label="Change date or time" onPress={() => router.push("/booking/new")} />
            <Button label="Adjust requirements" variant="outline" onPress={() => router.push("/booking/summary")} />
            <Button label="Increase budget" variant="outline" onPress={() => router.push("/booking/budget")} />
          </View>
        </Card>
      ) : (
        <>
          {/* Clean Marketing Banner without eyebrow or celebration emoji */}
          <View style={styles.heroSection}>
            <Text style={styles.headline}>
              We found the best photography firms for you!
            </Text>

            <Text style={styles.subheadline}>
              Your shoot request will be automatically dispatched to all {matches.length} verified
              photography firms & studios. Track responses anytime in My Bookings. You can easily{" "}
              <Text style={styles.chatInlineHighlight}>chat in-app directly</Text> with any firm, and
              direct phone and WhatsApp contact unlocks once a firm accepts.
            </Text>

            <View style={styles.metaBadgesRow}>
              <View style={styles.chatHighlightBadge}>
                <MessageSquare size={13} color="#EA580C" strokeWidth={2.5} />
                <Text style={styles.chatHighlightBadgeText}>In-app chat available</Text>
              </View>

              {pkgLabel ? (
                <View style={styles.tierPill}>
                  <Text style={styles.tierPillText}>Package Tier: {pkgLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* List of matched photography firms */}
          <View style={styles.cardsList}>
            {matches.map((m) => (
              <ProviderCard
                key={m.vendorId}
                match={m}
                packageLabel={pkgLabel}
                onViewProfile={() => router.push(`/booking/vendor/${m.vendorId}`)}
              />
            ))}
          </View>

          {matches.length < MAX_MATCHES ? (
            <View style={styles.moreOptionsBox}>
              <Text style={styles.moreOptionsTitle}>Want to discover more photography firms?</Text>
              <Text style={styles.moreOptionsSubtitle}>
                Broadening your budget or adjusting event timings can connect you with additional studios.
              </Text>
              <View style={{ gap: spacing.sm, marginTop: 4 }}>
                <Button label="Adjust Requirements" variant="outline" onPress={() => router.push("/booking/summary")} />
                <Button label="Increase Budget" variant="outline" onPress={() => router.push("/booking/budget")} />
              </View>
            </View>
          ) : null}
        </>
      )}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: spacing.sm,
  },
  heroSection: {
    gap: 10,
  },
  headline: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  subheadline: {
    fontSize: 13.5,
    color: "#475569",
    lineHeight: 20,
    fontWeight: "400",
  },
  chatInlineHighlight: {
    fontWeight: "700",
    color: "#EA580C",
    textDecorationLine: "underline",
  },
  metaBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  chatHighlightBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  chatHighlightBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  tierPillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#334155",
  },
  cardsList: {
    gap: 16,
  },
  moreOptionsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  moreOptionsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  moreOptionsSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
  },
});
