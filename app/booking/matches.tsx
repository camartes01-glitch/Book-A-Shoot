import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { SearchX, SlidersHorizontal } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Muted, SectionTitle } from "@/src/components/ui";
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
  const [selecting, setSelecting] = useState<string | null>(null);
  const transitionLockRef = useRef(false);

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
  }, [activeDraft?.matches, runMatching]);

  const onSelect = async (vendorId: string) => {
    if (transitionLockRef.current) return;
    transitionLockRef.current = true;
    setSelecting(vendorId);
    setError(null);
    try {
      await selectVendor(vendorId);
      router.push("/booking/confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not select that provider.");
      transitionLockRef.current = false;
    } finally {
      setSelecting(null);
      setTimeout(() => {
        transitionLockRef.current = false;
      }, 500);
    }
  };

  const matches = activeDraft?.matches ?? [];
  const quoted = activeDraft ? selectedPackageQuote(activeDraft) : undefined;
  const pkgLabel = quoted?.label;

  return (
    <WizardScreen
      title="Choose your photographer or videographer"
      step="providers"
      onBack={() => router.push("/booking/packages")}
    >
      {loading ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: "center", gap: spacing.sm }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Muted>Looking for professionals who can cover your event…</Muted>
        </View>
      ) : error ? (
        <EmptyState icon={<SearchX size={40} color={colors.danger} />} title="Couldn't load service providers" body={error} actionLabel="Try again" onAction={runMatching} />
      ) : matches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<SlidersHorizontal size={36} color={colors.primaryDark} />}
            title="We couldn't find the right match yet."
            body="Changing the date, time, location, services or budget can produce more matches from the live Camartes catalog."
          />
          <View style={{ gap: spacing.sm }}>
            <Button label="Change date or time" onPress={() => router.push("/booking/new")} />
            <Button label="Adjust requirements" variant="outline" onPress={() => router.push("/booking/summary")} />
            <Button label="Increase budget" variant="outline" onPress={() => router.push("/booking/budget")} />
          </View>
        </Card>
      ) : (
        <>
          <SectionTitle>
            {matches.length === 1 ? "1 professional matches your event" : `${matches.length} professionals match your event`}
          </SectionTitle>
          {pkgLabel ? <Muted>Showing availability for {pkgLabel}</Muted> : null}
          {matches.map((m) => (
            <ProviderCard
              key={m.vendorId}
              match={m}
              packageLabel={pkgLabel}
              onViewProfile={() => router.push(`/booking/vendor/${m.vendorId}`)}
              onSelect={() => onSelect(m.vendorId)}
              selected={selecting === m.vendorId || activeDraft?.selectedVendorId === m.vendorId}
            />
          ))}
          {matches.length < MAX_MATCHES ? (
            <View style={{ gap: spacing.sm }}>
              <Muted>Want more options?</Muted>
              <Button label="Change date or time" variant="outline" onPress={() => router.push("/booking/new")} />
              <Button label="Adjust requirements" variant="outline" onPress={() => router.push("/booking/summary")} />
              <Button label="Increase budget" variant="outline" onPress={() => router.push("/booking/budget")} />
            </View>
          ) : null}
        </>
      )}
    </WizardScreen>
  );
}
