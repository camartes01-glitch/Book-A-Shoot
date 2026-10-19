import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Muted, SectionTitle } from "@/src/components/ui";
import { DateField } from "@/src/components/DateField";
import { useAppStore } from "@/src/state/AppProvider";
import { validateExpectedDelivery } from "@/src/engine/validation";
import { formatDateLong } from "@/src/utils/format";
import { latestDate } from "@/src/utils/dateTime";

import { safeBack } from "@/src/utils/routeParam";

export default function DeliveryDateScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";
  const { activeDraft, updateExpectedDelivery, loadVendorMatches } = useAppStore();
  const [date, setDate] = useState<string | null>(activeDraft?.expectedDeliveryDate ?? null);

  useEffect(() => {
    if (activeDraft?.expectedDeliveryDate) {
      setDate(activeDraft.expectedDeliveryDate);
    }
  }, [activeDraft?.expectedDeliveryDate]);

  // Guard: this screen is strictly for album delivery date; if no album, skip forward
  useEffect(() => {
    if (activeDraft && !activeDraft.deliverables?.photo?.album) {
      if (isEditMode) {
        router.replace("/booking/confirm");
      } else {
        router.replace("/booking/budget");
      }
    }
  }, [activeDraft, isEditMode]);

  if (!activeDraft) return null;
  const finalEventDate = latestDate(activeDraft.days.map((d) => d.eventDate ?? ""));

  const onContinue = async () => {
    const issues = validateExpectedDelivery(activeDraft.days, date);
    if (issues.length) {
      Alert.alert("Check the album delivery date", issues[0].message);
      return;
    }
    await updateExpectedDelivery(date!);
    router.push("/booking/budget");
  };

  const onSaveAndReturn = async () => {
    const issues = validateExpectedDelivery(activeDraft.days, date);
    if (issues.length) {
      Alert.alert("Check the album delivery date", issues[0].message);
      return;
    }
    await updateExpectedDelivery(date!);
    try {
      await loadVendorMatches();
    } catch {
      // non-blocking
    }
    router.replace("/booking/confirm");
  };

  const onBack = () => {
    if (isEditMode) {
      router.replace("/booking/confirm");
    } else {
      safeBack("/booking/deliverables");
    }
  };

  return (
    <WizardScreen
      title={isEditMode ? "Edit Album Delivery Date" : "When do you need your album?"}
      step="deliverables"
      onBack={onBack}
      footer={
        isEditMode ? (
          <Button label="Save & Return to Review" onPress={onSaveAndReturn} flex={1} />
        ) : (
          <Button label="Continue to budget" onPress={onContinue} flex={1} />
        )
      }
    >
      <Card>
          <SectionTitle>When do you need your printed album?</SectionTitle>
          <Muted>
            {finalEventDate ? `Your last event day is ${formatDateLong(finalEventDate)}.` : "Set your event dates first."}
          </Muted>
        <DateField
          label="Album delivery date"
          value={date}
          onChange={setDate}
          minimumDate={finalEventDate ? new Date(`${finalEventDate}T00:00:00`) : new Date()}
        />
      </Card>
    </WizardScreen>
  );
}
