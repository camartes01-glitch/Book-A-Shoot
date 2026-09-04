import { useEffect } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Muted, SectionTitle } from "@/src/components/ui";
import { DayCard } from "@/src/components/DayCard";
import { useAppStore } from "@/src/state/AppProvider";
import { validateDays } from "@/src/engine/validation";
import { colors, spacing } from "@/src/constants/theme";

export default function BookingDaysScreen() {
  const { activeDraft, addDay, duplicateLastDay, deleteDay, reorderDays } = useAppStore();

  useEffect(() => {
    if (!activeDraft) router.replace("/(tabs)");
  }, [activeDraft]);

  if (!activeDraft) return null;
  const days = [...activeDraft.days].sort((a, b) => a.order - b.order);

  const onContinue = () => {
    const issues = validateDays(activeDraft.days);
    if (issues.length) {
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
          <Button label="+ Add Day" variant="outline" flex={1} icon={<Plus size={16} color={colors.primaryDark} />} onPress={() => void addDay()} />
          <Button label="Continue" flex={1} onPress={onContinue} />
        </>
      }
    >
      <SectionTitle>Event days</SectionTitle>
      <Muted>Add every day of your event — engagement, haldi, wedding, reception — each with its own requirements.</Muted>
      <View style={{ gap: spacing.md }}>
        {days.map((day, index) => (
          <DayCard
            key={day.dayId}
            day={day}
            deletable={days.length > 1}
            onPress={() => router.push(`/booking/day/${day.dayId}`)}
            onDuplicate={() => void duplicateLastDay()}
            onDelete={() => void deleteDay(day.dayId)}
            onMoveUp={index > 0 ? () => move(index, -1) : undefined}
            onMoveDown={index < days.length - 1 ? () => move(index, 1) : undefined}
          />
        ))}
      </View>
    </WizardScreen>
  );
}
