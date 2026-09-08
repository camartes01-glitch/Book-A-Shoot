import { useEffect } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Muted, SectionTitle } from "@/src/components/ui";
import { DayCard } from "@/src/components/DayCard";
import { useAppStore } from "@/src/state/AppProvider";
import { validateDays } from "@/src/engine/validation";
import { colors, spacing } from "@/src/constants/theme";

export default function BookingDaysScreen() {
  const { activeDraft, addDay, duplicateEventDay, deleteDay, reorderDays } = useAppStore();

  useEffect(() => {
    if (!activeDraft) router.replace("/(tabs)");
  }, [activeDraft]);

  if (!activeDraft) return null;
  const days = [...activeDraft.days].sort((a, b) => a.order - b.order);
  const issues = validateDays(activeDraft.days);
  const canContinue = issues.length === 0;

  const onContinue = () => {
    if (!canContinue) {
      Alert.alert("Finish your event details", issues[0].message);
      return;
    }
    router.push("/booking/deliverables");
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...days];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    void reorderDays(next.map((d) => d.dayId));
  };

  return (
    <WizardScreen
      title="Your event"
      step="event"
      onBack={() => router.replace("/(tabs)")}
      footer={
        <>
          <Button label="Add another day" variant="outline" flex={1} onPress={() => void addDay()} />
          <Button label="Continue" flex={1} onPress={onContinue} disabled={!canContinue} />
        </>
      }
    >
      <SectionTitle>What are you planning?</SectionTitle>
      <Muted>Add each day of coverage. Tap a day to choose the event, time and services.</Muted>
      {!canContinue ? (
        <Muted style={{ color: colors.danger, fontWeight: "600" }}>
          {issues[0].message}
          {issues.length > 1 ? ` (+${issues.length - 1} more)` : ""}
        </Muted>
      ) : null}
      <View style={{ gap: spacing.md }}>
        {days.map((day, index) => (
          <DayCard
            key={day.dayId}
            day={day}
            deletable={days.length > 1}
            onPress={() => router.push(`/booking/day/${day.dayId}`)}
            onDuplicate={() => void duplicateEventDay(day.dayId)}
            onDelete={() => void deleteDay(day.dayId)}
            onMoveUp={index > 0 ? () => move(index, -1) : undefined}
            onMoveDown={index < days.length - 1 ? () => move(index, 1) : undefined}
          />
        ))}
      </View>
    </WizardScreen>
  );
}
