import { useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Badge, Button, Card, Field, Muted, SectionTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { formatInr } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";
import type { BudgetFeasibilityResult } from "@/src/engine/pricing";

export default function BudgetScreen() {
  const { submitBudget } = useAppStore();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [feasibility, setFeasibility] = useState<BudgetFeasibilityResult | null>(null);

  const numeric = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;

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

  return (
    <WizardScreen title="Your budget" step="budget" footer={feasibility ? undefined : <Button label="Continue" onPress={onCheck} loading={loading} flex={1} />}>
      <Card>
        <SectionTitle>What's your budget?</SectionTitle>
        <Muted>Tell us your approximate budget for the requirements you've selected. No need to pick from fixed slabs — enter any amount.</Muted>
        <Field
          label="Budget (INR)"
          placeholder="1,50,000"
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
        {numeric > 0 ? <Muted style={{ fontWeight: "700", color: colors.primaryDark }}>{formatInr(numeric)}</Muted> : null}
      </Card>

      {feasibility?.isBelowEstimate ? (
        <Card style={{ borderColor: colors.warning }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} color={colors.warning} />
            <Badge label="Budget check" tone="amber" />
          </View>
          <Muted style={{ fontWeight: "700", color: colors.ink }}>Your selected requirements may be above your budget.</Muted>
          <Muted>
            Based on your selections, similar bookings typically cost around {formatInr(feasibility.estimatedCost)}. You're about{" "}
            {formatInr(feasibility.shortfall)} short of our lightest package.
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
