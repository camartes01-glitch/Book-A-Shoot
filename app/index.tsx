import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/src/state/AppProvider";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";
import { colors } from "@/src/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Splash() {
  const { ready, profile } = useAppStore();

  useEffect(() => {
    const getDestination = () => {
      if (!profile) return "/landing";
      const hasMobile = Boolean(profile.mobile && profile.mobile.length >= 10);
      return hasMobile ? "/(tabs)" : "/(auth)/complete-profile";
    };

    if (ready) {
      const timer = setTimeout(() => {
        router.replace(getDestination() as any);
      }, 350);
      return () => clearTimeout(timer);
    }
    const hardFallback = setTimeout(() => {
      router.replace(getDestination() as any);
    }, 2000);
    return () => clearTimeout(hardFallback);
  }, [ready, profile]);

  return (
    <SafeAreaView style={styles.wrap} edges={["top", "left", "right", "bottom"]}>
      <BookAShootLogo maxWidth={360} widthFraction={0.88} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },
});
