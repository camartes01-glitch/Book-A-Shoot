import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { WizardScreen } from "@/src/components/WizardScreen";
import { PackageTierCard } from "@/src/components/PackageTierCard";
import { Button, Muted } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import type { PackageTierId } from "@/src/types/booking";
import { generatePackageOptions } from "@/src/engine/pricing";

export default function PackagesScreen() {
  const { activeDraft, selectPackage } = useAppStore();
  const [selected, setSelected] = useState<PackageTierId | null>(activeDraft?.selectedPackage ?? null);
  const [loading, setLoading] = useState(false);
  const options = useMemo(
    () => (activeDraft ? generatePackageOptions(activeDraft, activeDraft.budget ?? 0) : []),
    [activeDraft],
  );

  useEffect(() => {
    setSelected(activeDraft?.selectedPackage ?? null);
  }, [activeDraft?.selectedPackage]);

  const onContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await selectPackage(selected);
      router.push("/booking/matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardScreen
      title="Choose what works"
      step="packages"
      footer={<Button label="Find providers" onPress={onContinue} disabled={!selected} loading={loading} flex={1} />}
    >
      <Muted>
        Essential is BASIC, Signature is MEDIUM, Elite is HIGH. Ranges come from the approved Camartes sheet for your selected services — not from a live package catalog or invented provider quotes.
      </Muted>

      {options.map((pkg) => (
        <PackageTierCard key={pkg.id} pkg={pkg} selected={selected === pkg.id} onSelect={() => setSelected(pkg.id)} />
      ))}
    </WizardScreen>
  );
}
