import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Bell, CalendarCheck, Home, MessageCircle, User } from "lucide-react-native";
import { useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

export default function TabsLayout() {
  const { ready, profile, notifications } = useAppStore();
  const unread = notifications.filter((n) => !n.read).length;

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
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
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
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color }) => <Bell size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}
