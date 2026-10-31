import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Headphones, Home, User } from "lucide-react-native";
import { colors, fontWeights, spacing } from "@/src/constants/theme";
import { useAppStore } from "@/src/state/AppProvider";
import { selectionFeedback } from "@/src/utils/haptics";

export function AppBottomNav() {
  // Never render on web — web uses executive universal top navbar
  if (Platform.OS === "web") {
    return null;
  }

  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { profile } = useAppStore();

  // Never render for signed-in users — authenticated experience uses (tabs) navigation exclusively
  if (profile) {
    return null;
  }

  // Hide on screens with their own fixed bottom UI (booking wizard, chat, tabs)
  if (
    pathname.startsWith("/(tabs)") ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/chat")
  ) {
    return null;
  }

  const isHome = pathname === "/" || pathname === "/landing" || pathname === "/index";
  const isServices = pathname === "/services" || pathname.startsWith("/photographers") || pathname.startsWith("/cinematography");
  const isLogin = pathname.includes("login") || pathname.startsWith("/(auth)");
  const isContact = pathname === "/contact";

  const handleNav = (target: string) => {
    selectionFeedback();
    router.push(target as any);
  };

  const navItems = [
    {
      key: "home",
      label: "Home",
      icon: Home,
      active: isHome,
      onPress: () => handleNav("/landing"),
    },
    {
      key: "services",
      label: "Services",
      icon: Camera,
      active: isServices,
      onPress: () => handleNav("/services"),
    },
    {
      key: "auth",
      label: profile ? "Dashboard" : "Login / Signup",
      icon: User,
      active: isLogin,
      onPress: () => handleNav(profile ? "/(tabs)" : "/(auth)/login"),
    },
    {
      key: "contact",
      label: "Contact Us",
      icon: Headphones,
      active: isContact,
      onPress: () => handleNav("/contact"),
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.navRow}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.tabBtn,
                pressed && styles.tabBtnPressed,
              ]}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: item.active }}
            >
              <View style={[styles.iconWrap, item.active && styles.iconWrapActive]}>
                <Icon
                  size={20}
                  color={item.active ? colors.primary : colors.muted}
                  strokeWidth={item.active ? 2.5 : 2}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  item.active ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.peachBorder,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    paddingTop: 8,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabBtnPressed: {
    opacity: 0.75,
  },
  iconWrap: {
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 3,
  },
  iconWrapActive: {
    backgroundColor: colors.bgWarm,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  tabLabelActive: {
    color: colors.primaryDark,
    fontWeight: fontWeights.heading,
  },
  tabLabelInactive: {
    color: colors.muted,
    fontWeight: fontWeights.medium,
  },
});
