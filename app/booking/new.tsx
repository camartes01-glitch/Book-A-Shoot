import { useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Muted, SectionTitle } from "@/src/components/ui";
import { DayCard } from "@/src/components/DayCard";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useAppStore } from "@/src/state/AppProvider";
import { validateDays } from "@/src/engine/validation";
import { colors, spacing } from "@/src/constants/theme";
import type { EventDay } from "@/src/types/booking";

export default function BookingDaysScreen() {
  const { activeDraft, addDay, duplicateEventDay, deleteDay, reorderDays } = useAppStore();
  const [dayToDelete, setDayToDelete] = useState<EventDay | null>(null);
  const [singleDayNotice, setSingleDayNotice] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const continueLock = useRef(false);
  const addLock = useRef(false);

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
    if (continueLock.current) return;
    continueLock.current = true;
    router.push("/booking/deliverables");
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...days];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    void reorderDays(next.map((d) => d.dayId));
  };

  const handleConfirmDelete = async () => {
    if (!dayToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteDay(dayToDelete.dayId);
      setDayToDelete(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not remove this day.";
      Alert.alert("Could not remove day", msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <WizardScreen
      title="Your event"
      step="event"
      onBack={() => router.replace("/(tabs)")}
      footer={
        <>
          <Button
            label="Add another day"
            variant="outline"
            flex={1}
            onPress={() => {
              if (addLock.current) return;
              addLock.current = true;
              void addDay().finally(() => {
                addLock.current = false;
              });
            }}
          />
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
            onEdit={() => router.push(`/booking/day/${day.dayId}`)}
            onDelete={() => setDayToDelete(day)}
            onDisabledDelete={() => setSingleDayNotice(true)}
            onMoveUp={index > 0 ? () => move(index, -1) : undefined}
            onMoveDown={index < days.length - 1 ? () => move(index, 1) : undefined}
          />
        ))}
      </View>

      <ConfirmDialog
        visible={dayToDelete !== null}
        title="Delete event day?"
        message={
          dayToDelete
            ? `This will remove Day ${dayToDelete.order} and all of its details from the booking.`
            : "This will remove this event day and all of its details from the booking."
        }
        confirmLabel="Delete Day"
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!isDeleting) setDayToDelete(null);
        }}
        testID="day-delete-confirm-dialog"
      />

      <ConfirmDialog
        visible={singleDayNotice}
        title="Cannot delete day"
        message="A booking must have at least one event day. Add another day before removing this one."
        confirmLabel="Understood"
        cancelLabel="Close"
        confirmVariant="primary"
        onConfirm={() => setSingleDayNotice(false)}
        onCancel={() => setSingleDayNotice(false)}
        testID="single-day-notice-dialog"
      />
    </WizardScreen>
  );
}
