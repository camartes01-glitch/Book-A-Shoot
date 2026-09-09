import { Stack } from "expo-router";
import { colors } from "@/src/constants/theme";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
