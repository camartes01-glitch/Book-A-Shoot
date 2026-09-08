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
    if (!ready) return;
    const timer = setTimeout(() => {
      router.replace(profile ? "/(tabs)" : "/(auth)/login");
    }, 500);
    return () => clearTimeout(timer);
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
