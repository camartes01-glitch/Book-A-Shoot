import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

const singleton = (id: string) => () => id;
const perDay =
  (prefix: string) =>
  ({ params }: { params?: Record<string, unknown> }) => {
    const raw = params?.dayId;
    return `${prefix}:${Array.isArray(raw) ? raw[0] : String(raw ?? "")}`;
  };

export default function BookingLayout() {
  const { ready, profile } = useAppStore();

  useEffect(() => {
    if (ready && !profile) router.replace("/(auth)/login");
  }, [ready, profile]);

  if (!ready || !profile) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {/* `getId` makes every wizard step a singleton in the stack: a double tap
          on Continue (or any repeated push) re-focuses the existing screen
          instead of stacking duplicate copies of it. */}
      <Stack.Screen name="new" getId={singleton("new")} />
      <Stack.Screen name="day/[dayId]/index" getId={perDay("day")} />
      <Stack.Screen name="day/[dayId]/location" getId={perDay("location")} />
      <Stack.Screen name="deliverables" getId={singleton("deliverables")} />
      <Stack.Screen name="delivery-date" getId={singleton("delivery-date")} />
      <Stack.Screen name="summary" getId={singleton("summary")} />
      <Stack.Screen name="budget" getId={singleton("budget")} />
      <Stack.Screen name="packages" getId={singleton("packages")} />
      <Stack.Screen name="location-preference" getId={singleton("location-preference")} />
      <Stack.Screen name="matches" getId={singleton("matches")} />
      <Stack.Screen name="vendor/[vendorId]" />
      <Stack.Screen name="vendor/gallery" />
      <Stack.Screen name="confirm" getId={singleton("confirm")} />
      <Stack.Screen name="camreels" getId={singleton("camreels")} />
    </Stack>
  );
}
