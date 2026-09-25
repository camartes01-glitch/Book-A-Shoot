import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell,
  CalendarCheck,
  Camera,
  Compass,
  Home,
  MessageCircle,
  User,
} from "lucide-react-native";
import { useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomBottomNavigation({ state, descriptors, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { startNewBooking, notifications } = useAppStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const bottomPad = Math.max(insets.bottom, Platform.OS === "web" ? 14 : 10);

  const currentRouteName = state.routes[state.index]?.name;
  const isHomeActive = currentRouteName === "index";
  const isBookingsActive = currentRouteName === "bookings";
  const isMessagesActive = currentRouteName === "messages";
  const isNotificationsActive = currentRouteName === "notifications";
  const isProfileActive = currentRouteName === "profile";

  const onBookPress = async () => {
    try {
      await startNewBooking();
      router.push("/booking/new");
    } catch {
      router.push("/booking/new");
    }
  };

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomPad }]}>
      {/* 1. Home Tab */}
      <Pressable
        style={styles.tabItem}
        onPress={() => navigation.navigate("index")}
        accessibilityRole="button"
        accessibilityLabel="Home"
      >
        <Home size={21} color={isHomeActive ? colors.primary : "#64748B"} />
        <Text style={[styles.tabLabel, isHomeActive && styles.tabLabelActive]}>Home</Text>
        {isHomeActive && <View style={styles.activeDot} />}
      </Pressable>

      {/* 2. My Bookings Tab (Replacing Explore) */}
      <Pressable
        style={styles.tabItem}
        onPress={() => navigation.navigate("bookings")}
        accessibilityRole="button"
        accessibilityLabel="My Bookings"
      >
        <CalendarCheck size={21} color={isBookingsActive ? colors.primary : "#64748B"} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.tabLabel, isBookingsActive && styles.tabLabelActive]}
        >
          Bookings
        </Text>
        {isBookingsActive && <View style={styles.activeDot} />}
      </Pressable>

      {/* 3. Center Floating Book Button */}
      <Pressable
        style={styles.centerBookItem}
        onPress={onBookPress}
        accessibilityRole="button"
        accessibilityLabel="Start booking a shoot"
      >
        <View style={styles.floatingCircle}>
          <Camera size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.centerBookLabel}>Book</Text>
      </Pressable>

      {/* 4. Messages Tab */}
      <Pressable
        style={styles.tabItem}
        onPress={() => navigation.navigate("messages")}
        accessibilityRole="button"
        accessibilityLabel="Messages"
      >
        <View style={styles.iconWithBadgeWrap}>
          <MessageCircle size={22} color={isMessagesActive ? colors.primary : "#64748B"} />
        </View>
        <Text style={[styles.tabLabel, isMessagesActive && styles.tabLabelActive]}>Messages</Text>
        {isMessagesActive && <View style={styles.activeDot} />}
      </Pressable>

      {/* 5. Profile Tab */}
      <Pressable
        style={styles.tabItem}
        onPress={() => navigation.navigate("profile")}
        accessibilityRole="button"
        accessibilityLabel="Profile"
      >
        <User size={22} color={isProfileActive ? colors.primary : "#64748B"} />
        <Text style={[styles.tabLabel, isProfileActive && styles.tabLabelActive]}>Profile</Text>
        {isProfileActive && <View style={styles.activeDot} />}
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { ready, profile, notifications } = useAppStore();
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (ready && !profile) router.replace("/(auth)/login");
  }, [ready, profile]);

  if (!ready || !profile) return null;

  return (
    <Tabs
      tabBar={(props) => <CustomBottomNavigation {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EDE4D8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    position: "relative",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  centerBookItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
  },
  floatingCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  centerBookLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 3,
  },
  iconWithBadgeWrap: {
    position: "relative",
  },
  badgePill: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgePillText: {
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "800",
  },
});
