import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { PackageTierCard } from "@/src/components/PackageTierCard";
import { Badge, Button, Card, Field, Muted, SectionTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { generatePackageOptions } from "@/src/engine/pricing";
import { formatInr } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";
import type { BudgetFeasibilityResult } from "@/src/engine/pricing";

export default function BudgetScreen() {
  const { activeDraft, submitBudget } = useAppStore();
  const [digits, setDigits] = useState(activeDraft?.budget ? String(activeDraft.budget) : "");
  const [loading, setLoading] = useState(false);
  const [feasibility, setFeasibility] = useState<BudgetFeasibilityResult | null>(null);

  const numeric = parseInt(digits, 10) || 0;
  const display = digits ? formatInr(numeric).replace("₹", "₹ ") : "";
  const preview = useMemo(
    () => (activeDraft ? generatePackageOptions(activeDraft, numeric) : []),
    [activeDraft, numeric],
  );

  const onCheck = async () => {
    if (numeric <= 0) {
      Alert.alert("Enter your budget", "Budget must be greater than zero.");
      return;
    }
    setLoading(true);
    try {
      const result = await submitBudget(numeric);
      setFeasibility(result);
      if (!result.isBelowEstimate) {
        router.push("/booking/packages");
      }
    } finally {
      setLoading(false);
    }
  };

  const onFooter = async () => {
    if (feasibility?.isBelowEstimate) {
      router.push("/booking/packages");
      return;
    }
    await onCheck();
  };

  return (
    <WizardScreen
      title="Your budget"
      step="budget"
      footer={<Button label={feasibility?.isBelowEstimate ? "Show closest options" : "Continue"} onPress={onFooter} loading={loading} flex={1} />}
    >
      <SectionTitle>Approved coverage rates</SectionTitle>
      <Muted>Essential, Signature and Elite use the approved Camartes ranges for the services you selected. These are not provider quotes.</Muted>
      {preview.map((pkg) => (
        <PackageTierCard key={pkg.id} pkg={pkg} selectable={false} />
      ))}

      <SectionTitle>What's your budget?</SectionTitle>
      <Muted>This amount is what Camartes uses for provider matching. It is kept separate from the package ranges above.</Muted>
      <Field
        label="Budget"
        placeholder="₹ 1,00,000"
        keyboardType="number-pad"
        inputMode="numeric"
        value={display}
        onChangeText={(text) => setDigits(text.replace(/[^0-9]/g, "").slice(0, 9))}
      />
      {feasibility?.isBelowEstimate ? (
        <Card style={{ borderColor: colors.warning }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} color={colors.warning} />
            <Badge label="A bit tight" tone="amber" />
          </View>
          <Muted style={{ fontWeight: "700", color: colors.ink }}>
            Approved Essential coverage for your selections starts at {formatInr(feasibility.estimatedCost)}.
          </Muted>
          <View style={{ gap: spacing.sm }}>
            <Button label="Adjust requirements" variant="outline" onPress={() => router.push("/booking/summary")} />
            <Button label="Show closest available options" onPress={() => router.push("/booking/packages")} />
          </View>
        </Card>
      ) : null}
    </WizardScreen>
  );
}
