import { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { WizardScreen } from "@/src/components/WizardScreen";
import { PackageTierCard } from "@/src/components/PackageTierCard";
import { Button, Muted } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import type { PackageTierId } from "@/src/types/booking";
import { resolvePackageOptions, bookingPricingInputKey } from "@/src/engine/pricing";
import { goBackTo } from "@/src/utils/wizardNav";
import { colors } from "@/src/constants/theme";

export default function PackagesScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";
  const { activeDraft, selectPackage } = useAppStore();
  const [selected, setSelected] = useState<PackageTierId | null>(activeDraft?.selectedPackage ?? null);
  const [loading, setLoading] = useState(false);
  const transitionLockRef = useRef(false);
  const pricingKey = activeDraft ? bookingPricingInputKey(activeDraft) : "";
  const options = useMemo(
    () => (activeDraft ? resolvePackageOptions(activeDraft) : []),
    // pricingKey changes whenever services, add-ons, days, times, or budget change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pricingKey],
  );

  useEffect(() => {
    if (activeDraft?.selectedPackage) setSelected(activeDraft.selectedPackage);
  }, [activeDraft?.selectedPackage]);

  const [error, setError] = useState<string | null>(null);

  // Selection is local until Continue — no storage write on every tap.
  const onSelectPackage = (tier: PackageTierId) => {
    setSelected(tier);
    setError(null);
  };

  const commit = async (then: () => void) => {
    if (!selected || transitionLockRef.current) return;
    transitionLockRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await selectPackage(selected);
      then();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Could not save your package. Please try again.");
    } finally {
      transitionLockRef.current = false;
      setLoading(false);
    }
  };

  const onContinue = () => commit(() => router.push("/booking/location-preference"));
  const onSaveAndReturn = () => commit(() => goBackTo("/booking/confirm"));
  const onBack = () => goBackTo(isEditMode ? "/booking/confirm" : "/booking/budget");

  return (
    <WizardScreen
      title={isEditMode ? "Edit Package Range" : "Choose your package"}
      step="packages"
      onBack={onBack}
      footer={
        isEditMode ? (
          <Button label="Save & Return to Review" onPress={onSaveAndReturn} disabled={!selected} loading={loading} flex={1} />
        ) : (
          <Button label="Continue to location" onPress={onContinue} disabled={!selected} loading={loading} flex={1} />
        )
      }
    >
      <Muted>
        Each price is the combined approved range for everything you selected, across all event days — not your budget and not a final quote.
      </Muted>

      {error ? <Muted style={{ color: colors.danger }}>{error}</Muted> : null}

      {options.map((pkg) => (
        <PackageTierCard
          key={pkg.id}
          pkg={pkg}
          selected={selected === pkg.id}
          onSelect={() => onSelectPackage(pkg.id)}
          days={activeDraft?.days}
          deliverables={activeDraft?.deliverables}
        />
      ))}
    </WizardScreen>
  );
}
