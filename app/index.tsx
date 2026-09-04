import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/src/state/AppProvider";
import { BrandMark, Muted, Title } from "@/src/components/ui";
import { colors, spacing } from "@/src/constants/theme";

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
    <View style={styles.wrap}>
      <BrandMark size={72} />
      <Title>Camartes</Title>
      <Muted>Photography & videography, booked simply.</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.bg },
});
