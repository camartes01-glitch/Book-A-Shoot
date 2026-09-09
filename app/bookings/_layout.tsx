import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

export default function BookingsDetailLayout() {
  const { ready, profile } = useAppStore();

  useEffect(() => {
    if (ready && !profile) router.replace("/(auth)/login");
  }, [ready, profile]);

  if (!ready || !profile) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="[bookingId]" />
    </Stack>
  );
}
