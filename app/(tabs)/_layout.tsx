import { useEffect } from "react";
import { Platform, Text } from "react-native";
import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, CalendarCheck, Home, MessageCircle, User } from "lucide-react-native";
import { useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

function TabLabel({ color, children, focused }: { color: string; children: React.ReactNode; focused: boolean }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.62}
      maxFontSizeMultiplier={1.1}
      allowFontScaling
      style={{
        color,
        fontSize: 9,
        letterSpacing: -0.15,
        fontWeight: focused ? "800" : "600",
        textAlign: "center",
        marginTop: 1,
        marginBottom: 0,
        width: "100%",
        paddingHorizontal: 1,
        includeFontPadding: false,
      }}
    >
      {children}
    </Text>
  );
}

export default function TabsLayout() {
  const { ready, profile, notifications } = useAppStore();
  const unread = notifications.filter((n) => !n.read).length;
  const insets = useSafeAreaInsets();
  // Web has no home-indicator inset; keep extra padding so labels are not clipped.
  const bottomPad = Math.max(insets.bottom, Platform.OS === "web" ? 14 : 10);
  const barHeight = 58 + bottomPad;

  useEffect(() => {
    if (ready && !profile) router.replace("/(auth)/login");
  }, [ready, profile]);

  if (!ready || !profile) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: barHeight,
          paddingTop: 6,
          paddingBottom: bottomPad,
        },
        tabBarItemStyle: { flex: 1, paddingHorizontal: 0, minWidth: 0, paddingBottom: 0 },
        tabBarIconStyle: { marginTop: 2 },
        tabBarLabel: ({ color, children, focused }) => (
          <TabLabel color={String(color)} focused={focused}>
            {children}
          </TabLabel>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen
        name="bookings"
        options={{ title: "Bookings", tabBarIcon: ({ color }) => <CalendarCheck size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: "Messages", tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarAccessibilityLabel: "Notifications",
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color }) => <Bell size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}
