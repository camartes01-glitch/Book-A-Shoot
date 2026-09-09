import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { WizardScreen } from "@/src/components/WizardScreen";
import { PackageTierCard } from "@/src/components/PackageTierCard";
import { Button, Muted } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import type { PackageTierId } from "@/src/types/booking";
import { resolvePackageOptions, bookingPricingInputKey } from "@/src/engine/pricing";

export default function PackagesScreen() {
  const { activeDraft, selectPackage } = useAppStore();
  const [selected, setSelected] = useState<PackageTierId | null>(activeDraft?.selectedPackage ?? null);
  const [loading, setLoading] = useState(false);
  const transitionLockRef = useRef(false);
  const pricingKey = activeDraft ? bookingPricingInputKey(activeDraft) : "";
  const options = useMemo(
    () => (activeDraft ? resolvePackageOptions(activeDraft) : []),
    // pricingKey changes whenever services, add-ons, days, times, or budget change.
    [activeDraft, pricingKey],
  );

  useEffect(() => {
    setSelected(activeDraft?.selectedPackage ?? null);
  }, [activeDraft?.selectedPackage]);

  const onSelectPackage = async (tier: PackageTierId) => {
    if (transitionLockRef.current) return;
    transitionLockRef.current = true;
    setSelected(tier);
    setLoading(true);
    try {
      await selectPackage(tier);
      router.push("/booking/location-preference");
    } finally {
      setLoading(false);
      setTimeout(() => {
        transitionLockRef.current = false;
      }, 500);
    }
  };

  const onContinue = async () => {
    if (!selected || transitionLockRef.current) return;
    transitionLockRef.current = true;
    setLoading(true);
    try {
      await selectPackage(selected);
      router.push("/booking/location-preference");
    } finally {
      setLoading(false);
      setTimeout(() => {
        transitionLockRef.current = false;
      }, 500);
    }
  };

  return (
    <WizardScreen
      title="Choose your package"
      step="packages"
      onBack={() => router.push("/booking/budget")}
      footer={<Button label="Continue to location" onPress={onContinue} disabled={!selected} loading={loading} flex={1} />}
    >
      <Muted>
        Essential is BASIC, Signature is MEDIUM, Elite is HIGH. Each overall price is the combined approved range for every service and add-on you selected, across every event day. It is not your budget and not a provider quote.
      </Muted>

      {options.map((pkg) => (
        <PackageTierCard key={pkg.id} pkg={pkg} selected={selected === pkg.id} onSelect={() => void onSelectPackage(pkg.id)} />
      ))}
    </WizardScreen>
  );
}
