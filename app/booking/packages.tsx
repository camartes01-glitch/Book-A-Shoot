import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Badge, Button, Card, Muted, SectionTitle, Title } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import type { PackageTierId } from "@/src/types/booking";
import { formatInr } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";

export default function PackagesScreen() {
  const { activeDraft, selectPackage } = useAppStore();
  const [selected, setSelected] = useState<PackageTierId | null>(activeDraft?.selectedPackage ?? null);
  const [loading, setLoading] = useState(false);

  if (!activeDraft?.packageOptions) return null;

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
      title="Choose your package"
      step="budget"
      footer={<Button label="Find Available Service Providers" onPress={onContinue} disabled={!selected} loading={loading} flex={1} />}
    >
      <SectionTitle>Recommended packages</SectionTitle>
      <Muted>Generated from your requirements, event location and Camartes vendor pricing — not from fixed price slabs.</Muted>

      {activeDraft.packageOptions.map((pkg) => {
        const isSelected = selected === pkg.id;
        return (
          <Card key={pkg.id} accent={isSelected} style={isSelected ? { borderColor: colors.primary } : undefined}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Title>{pkg.label}</Title>
              {pkg.recommended ? <Badge label="Recommended" /> : null}
            </View>
            <Muted style={{ fontSize: 18, fontWeight: "800", color: colors.primaryDark }}>
              {formatInr(pkg.minPrice)} – {formatInr(pkg.maxPrice)}
            </Muted>
            <Muted>{pkg.headline}</Muted>
            <View style={{ gap: 4, marginTop: 4 }}>
              {pkg.bullets.map((b) => (
                <View key={b} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} color={colors.success} />
                  <Muted>{b}</Muted>
                </View>
              ))}
            </View>
            <Button
              label={isSelected ? "Selected" : "Select this package"}
              variant={isSelected ? "primary" : "outline"}
              onPress={() => setSelected(pkg.id)}
            />
          </Card>
        );
      })}
    </WizardScreen>
  );
}
