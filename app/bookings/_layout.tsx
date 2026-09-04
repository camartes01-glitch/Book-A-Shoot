import { Stack } from "expo-router";
import { colors } from "@/src/constants/theme";

export default function BookingsDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="[bookingId]" />
    </Stack>
  );
}
