import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

export default function BookingLayout() {
  const { ready, profile } = useAppStore();

  useEffect(() => {
    if (ready && !profile) router.replace("/(auth)/login");
  }, [ready, profile]);

  if (!ready || !profile) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="new" />
      <Stack.Screen name="day/[dayId]/index" />
      <Stack.Screen name="day/[dayId]/location" />
      <Stack.Screen name="deliverables" />
      <Stack.Screen name="delivery-date" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="packages" />
      <Stack.Screen name="matches" />
      <Stack.Screen name="vendor/[vendorId]" />
      <Stack.Screen name="confirm" />
    </Stack>
  );
}
