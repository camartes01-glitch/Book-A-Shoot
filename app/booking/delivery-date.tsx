import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Muted, SectionTitle } from "@/src/components/ui";
import { DateField } from "@/src/components/DateField";
import { useAppStore } from "@/src/state/AppProvider";
import { validateExpectedDelivery } from "@/src/engine/validation";
import { formatDateLong } from "@/src/utils/format";
import { latestDate } from "@/src/utils/dateTime";

export default function DeliveryDateScreen() {
  const { activeDraft, updateExpectedDelivery } = useAppStore();
  const [date, setDate] = useState<string | null>(activeDraft?.expectedDeliveryDate ?? null);

  useEffect(() => {
    if (activeDraft?.expectedDeliveryDate) {
      setDate(activeDraft.expectedDeliveryDate);
    }
  }, [activeDraft?.expectedDeliveryDate]);

  if (!activeDraft) return null;
  const finalEventDate = latestDate(activeDraft.days.map((d) => d.eventDate ?? ""));

  const onContinue = async () => {
    const issues = validateExpectedDelivery(activeDraft.days, date);
    if (issues.length) {
      Alert.alert("Check the delivery date", issues[0].message);
      return;
    }
    await updateExpectedDelivery(date!);
    router.push("/booking/budget");
  };

  return (
    <WizardScreen
      title="When do you need them?"
      step="deliverables"
      onBack={() => router.back()}
      footer={<Button label="Continue to budget" onPress={onContinue} flex={1} />}
    >
      <Card>
          <SectionTitle>When do you need your photos & videos?</SectionTitle>
          <Muted>
            {finalEventDate ? `Your last event day is ${formatDateLong(finalEventDate)}.` : "Set your event dates first."}
          </Muted>
        <DateField
          label="Expected delivery date"
          value={date}
          onChange={setDate}
          minimumDate={finalEventDate ? new Date(`${finalEventDate}T00:00:00`) : new Date()}
        />
      </Card>
    </WizardScreen>
  );
}
