import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { SearchX } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Muted, SectionTitle } from "@/src/components/ui";
import { ProviderCard } from "@/src/components/ProviderCard";
import { EmptyState } from "@/src/components/EmptyState";
import { useAppStore } from "@/src/state/AppProvider";
import { MAX_MATCHES } from "@/src/engine/matching";
import { colors, spacing } from "@/src/constants/theme";

export default function VendorMatchesScreen() {
  const { activeDraft, loadVendorMatches, selectVendor } = useAppStore();
  const [loading, setLoading] = useState(!activeDraft?.matches);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  const runMatching = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadVendorMatches();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load matching service providers.");
    } finally {
      setLoading(false);
    }
  }, [loadVendorMatches]);

  useEffect(() => {
    if (!activeDraft?.matches) void runMatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelect = async (vendorId: string) => {
    setSelecting(vendorId);
    try {
      await selectVendor(vendorId);
      router.push("/booking/confirm");
    } finally {
      setSelecting(null);
    }
  };

  const matches = activeDraft?.matches ?? [];

  return (
    <WizardScreen title="Available service providers" step="matches">
      {loading ? (
        <View style={{ paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.sm }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Muted>Checking availability across the Camartes Vendor Platform…</Muted>
        </View>
      ) : error ? (
        <EmptyState icon={<SearchX size={40} color={colors.danger} />} title="Couldn't load service providers" body={error} actionLabel="Try again" onAction={runMatching} />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<SearchX size={40} color={colors.muted} />}
          title="We couldn't find a provider that matches all your requirements for this date and location."
        />
      ) : (
        <>
          <SectionTitle>
            {matches.length === MAX_MATCHES ? `${MAX_MATCHES} matching providers` : `We found ${matches.length} provider${matches.length === 1 ? "" : "s"} matching your requirements`}
          </SectionTitle>
          {matches.map((m) => (
            <ProviderCard
              key={m.vendorId}
              match={m}
              onViewProfile={() => router.push(`/booking/vendor/${m.vendorId}`)}
              onSelect={() => onSelect(m.vendorId)}
              selected={selecting === m.vendorId || activeDraft?.selectedVendorId === m.vendorId}
            />
          ))}
        </>
      )}

      {!loading && matches.length < MAX_MATCHES ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Muted style={{ fontWeight: "700", color: colors.ink }}>Want more options?</Muted>
          <Button label="Change date or time" variant="outline" onPress={() => router.push("/booking/new")} />
          <Button label="Adjust requirements" variant="outline" onPress={() => router.push("/booking/summary")} />
          <Button label="Increase budget" variant="outline" onPress={() => router.push("/booking/budget")} />
        </View>
      ) : null}
    </WizardScreen>
  );
}
