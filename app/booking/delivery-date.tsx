import { useState } from "react";
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

  if (!activeDraft) return null;
  const finalEventDate = latestDate(activeDraft.days.map((d) => d.eventDate ?? ""));

  const onContinue = async () => {
    const issues = validateExpectedDelivery(activeDraft.days, date);
    if (issues.length) {
      Alert.alert("Check the delivery date", issues[0].message);
      return;
    }
    await updateExpectedDelivery(date!);
    router.push("/booking/summary");
  };

  return (
    <WizardScreen title="Expected delivery" step="deliverables" footer={<Button label="Continue" onPress={onContinue} flex={1} />}>
      <Card>
        <SectionTitle>When do you need your photos & videos?</SectionTitle>
        <Muted>
          {finalEventDate
            ? `Your final event day is ${formatDateLong(finalEventDate)}. Pick a delivery date on or after that.`
            : "Set your event dates first."}
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
