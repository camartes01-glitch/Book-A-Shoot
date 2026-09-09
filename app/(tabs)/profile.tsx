import { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LogOut, MapPin, Mail, Phone } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Button, Card, Field, Muted, ScreenTitle, SectionTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, spacing } from "@/src/constants/theme";

export default function ProfileScreen() {
  const { profile, updateProfile, logout } = useAppStore();
  const [name, setName] = useState(profile?.name ?? "");
  const [editing, setEditing] = useState(false);

  const onSave = async () => {
    await updateProfile({ name, avatarInitials: name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "C" });
    setEditing(false);
  };

  const performLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const onLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = typeof window !== "undefined" && window.confirm("Log out? You can sign back in anytime.");
      if (confirmed) void performLogout();
      return;
    }
    Alert.alert("Log out?", "You can sign back in anytime.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void performLogout();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <ScreenTitle>Profile</ScreenTitle>

      <Card>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Muted style={styles.avatarText}>{profile?.avatarInitials}</Muted>
          </View>
          {editing ? (
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Field label="Name" value={name} onChangeText={setName} />
              <Button label="Save" compact onPress={onSave} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <SectionTitle>{profile?.name}</SectionTitle>
              <Button label="Edit name" variant="ghost" compact onPress={() => setEditing(true)} />
            </View>
          )}
        </View>
      </Card>

      <Card>
        {profile?.mobile ? (
          <View style={styles.row}>
            <Phone size={16} color={colors.muted} />
            <Muted>+91 {profile.mobile}</Muted>
          </View>
        ) : null}
        {profile?.email ? (
          <View style={styles.row}>
            <Mail size={16} color={colors.muted} />
            <Muted>{profile.email}</Muted>
          </View>
        ) : null}
        <View style={styles.row}>
          <MapPin size={16} color={colors.muted} />
          <Muted>{profile?.savedAddresses.length ?? 0} saved addresses</Muted>
        </View>
      </Card>

      <Button label="Log out" variant="danger" icon={<LogOut size={16} color={colors.danger} />} onPress={onLogout} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontWeight: "800", fontSize: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
