import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

function HideSplashWhenReady() {
  const { ready } = useAppStore();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <HideSplashWhenReady />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="booking" />
          <Stack.Screen name="bookings" />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
