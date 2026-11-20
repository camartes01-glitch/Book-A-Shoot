import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, type ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { PackageTierCard } from "@/src/components/PackageTierCard";
import { Badge, Button, Card, Field, Muted, SectionTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { generatePackageOptions } from "@/src/engine/pricing";
import { formatInr } from "@/src/utils/format";
import { goBackTo } from "@/src/utils/wizardNav";
import { colors, radius, spacing } from "@/src/constants/theme";
import type { BudgetFeasibilityResult } from "@/src/engine/pricing";
import type { PackageOption, PackageTierId } from "@/src/types/booking";

const BUDGET_OPTIONS = [50000, 75000, 100000, 150000, 200000, 300000];

export default function BudgetScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";
  const { activeDraft, submitBudget, selectPackage } = useAppStore();
  const [digits, setDigits] = useState(activeDraft?.budget ? String(activeDraft.budget) : "");
  const [selectedTier, setSelectedTier] = useState<PackageTierId | null>(activeDraft?.selectedPackage ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feasibility, setFeasibility] = useState<BudgetFeasibilityResult | null>(null);
  /** The amount `feasibility` was computed for (stale once the amount changes). */
  const [checkedBudget, setCheckedBudget] = useState<number | null>(null);
  /** Synchronous guard: blocks the double/triple submit (Enter key + button +
   * footer) that used to push the next screen several times. */
  const busyRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const hydratedRef = useRef(false);

  // Hydrate once from the stored draft — never overwrite what the customer
  // is typing when a background refresh re-renders the draft.
  useEffect(() => {
    if (hydratedRef.current || !activeDraft) return;
    hydratedRef.current = true;
    if (activeDraft.budget) setDigits(String(activeDraft.budget));
    if (activeDraft.selectedPackage) setSelectedTier(activeDraft.selectedPackage);
  }, [activeDraft]);

  const numeric = parseInt(digits, 10) || 0;
  const display = digits ? formatInr(numeric).replace("₹", "₹ ") : "";

  // Package ranges depend only on the requirements, not on unrelated draft
  // fields — key the memo on what pricing actually reads.
  const pricingKey = activeDraft ? JSON.stringify([activeDraft.days, activeDraft.deliverables]) : "";
  const preview = useMemo(
    () => (activeDraft ? generatePackageOptions(activeDraft, numeric) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pricingKey, numeric],
  );

  /** Runs one async action at a time; surfaces failures instead of freezing. */
  const runExclusive = useCallback(async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const onSelectPackageCard = (pkg: PackageOption) => {
    const tier = pkg.id as PackageTierId;
    setSelectedTier(tier);
    setError(null);
    if (numeric <= 0) setDigits(String(pkg.minPrice));
  };

  const onSelectBudgetOption = (val: number) => {
    setDigits(String(val));
    setFeasibility(null);
    setError(null);
  };

  /** Single forward path for Continue / Enter / keyboard submit. */
  const onContinue = () =>
    runExclusive(async () => {
      if (numeric <= 0) {
        setError("Enter your budget to continue.");
        return;
      }
      // Already warned about a tight budget: the CTA now means "show options".
      if (feasibility?.isBelowEstimate && checkedBudget === numeric) {
        router.push("/booking/packages");
        return;
      }
      const result = await submitBudget(numeric);
      setFeasibility(result);
      setCheckedBudget(numeric);
      if (result.isBelowEstimate) {
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
        return;
      }
      if (selectedTier) {
        await selectPackage(selectedTier);
        router.push("/booking/location-preference");
      } else {
        router.push("/booking/packages");
      }
    });

  const onSaveAndReturn = () =>
    runExclusive(async () => {
      if (numeric <= 0) {
        setError("Enter your budget to continue.");
        return;
      }
      await submitBudget(numeric);
      if (selectedTier) await selectPackage(selectedTier);
      goBackTo("/booking/confirm");
    });

  const hasAlbum = Boolean(activeDraft?.deliverables?.photo?.album);
  const onBack = () => {
    if (isEditMode) goBackTo("/booking/confirm");
    else goBackTo(hasAlbum ? "/booking/delivery-date" : "/booking/deliverables");
  };

  const tight = Boolean(feasibility?.isBelowEstimate && checkedBudget === numeric);

  return (
    <WizardScreen
      title={isEditMode ? "Edit Budget" : "What is your budget?"}
      step="budget"
      onBack={onBack}
      scrollViewRef={scrollRef}
      footer={
        isEditMode ? (
          <Button label="Save & Return to Review" onPress={() => void onSaveAndReturn()} loading={busy} disabled={busy} flex={1} />
        ) : (
          <Button
            label={tight ? "Show closest options" : "Continue"}
            onPress={() => void onContinue()}
            loading={busy}
            disabled={busy}
            flex={1}
          />
        )
      }
    >
      <SectionTitle>What's your budget?</SectionTitle>
      <Muted>Pick an amount or enter your own. It's kept separate from the package ranges below.</Muted>

      <View style={styles.optionsGrid}>
        {BUDGET_OPTIONS.map((val) => (
          <View key={val} style={styles.optionCell}>
            <Button
              label={formatInr(val)}
              variant={numeric === val ? "primary" : "outline"}
              onPress={() => onSelectBudgetOption(val)}
              compact
            />
          </View>
        ))}
      </View>

      <Field
        label="Or enter a custom budget"
        placeholder="₹ 1,00,000"
        keyboardType="number-pad"
        inputMode="numeric"
        value={display}
        onChangeText={(text) => {
          setDigits(text.replace(/[^0-9]/g, "").slice(0, 9));
          setFeasibility(null);
          setError(null);
        }}
        returnKeyType="done"
        // onSubmitEditing also fires for the Enter key on web — a separate
        // onKeyDown handler would submit twice.
        onSubmitEditing={() => void (isEditMode ? onSaveAndReturn() : onContinue())}
        rightElement={
          <Button
            label="Enter"
            variant="primary"
            compact
            disabled={numeric <= 0 || busy}
            loading={busy}
            onPress={() => void (isEditMode ? onSaveAndReturn() : onContinue())}
            style={{ minWidth: 84 }}
          />
        }
      />

      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {tight && feasibility ? (
        <Card style={{ borderColor: colors.warning }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} color={colors.warning} />
            <Badge label="A bit tight" tone="amber" />
          </View>
          <Text style={styles.tightText}>
            Essential coverage for your selections starts at {formatInr(feasibility.estimatedCost)}.
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Button label="Adjust requirements" variant="outline" onPress={() => router.push("/booking/summary")} />
            <Button label="Show closest available options" onPress={() => router.push("/booking/packages")} />
          </View>
        </Card>
      ) : null}

      <View style={{ gap: 4, marginTop: spacing.xs }}>
        <SectionTitle>Approved coverage rates</SectionTitle>
        <Muted>Tap a package to choose Essential, Signature or Elite.</Muted>
      </View>
      {preview.map((pkg) => (
        <PackageTierCard
          key={pkg.id}
          pkg={pkg}
          selected={selectedTier === pkg.id}
          onSelect={() => onSelectPackageCard(pkg)}
          selectable
          days={activeDraft?.days}
          deliverables={activeDraft?.deliverables}
        />
      ))}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginVertical: spacing.xs,
  },
  optionCell: {
    width: "33.333%",
    padding: 4,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: "#FFF5F5",
  },
  errorText: { fontSize: 13.5, color: colors.danger, lineHeight: 19 },
  tightText: { fontSize: 14, fontWeight: "700", color: colors.ink, lineHeight: 20 },
});
