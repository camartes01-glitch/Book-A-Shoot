import { Pressable, StyleSheet, View } from "react-native";
import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Badge, Card, Muted, ScreenTitle, Title } from "@/src/components/ui";
import { EmptyState } from "@/src/components/EmptyState";
import { useAppStore } from "@/src/state/AppProvider";
import { colors } from "@/src/constants/theme";

const CONTACT_UNLOCKED_STATUSES = new Set(["VENDOR_ACCEPTED", "CUSTOMER_CONFIRMED", "PAYMENT_PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"]);

export default function MessagesScreen() {
  const { bookings, refreshBookings } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      void refreshBookings();
    }, [refreshBookings]),
  );

  const threads = bookings.filter((b) => b.selectedVendorId);

  return (
    <ScreenContainer>
      <ScreenTitle>Messages</ScreenTitle>
      <Muted>All conversations with service providers stay on Camartes until a booking is confirmed.</Muted>
      {!threads.length ? (
        <EmptyState
          icon={<MessageCircle size={40} color={colors.muted} />}
          title="No conversations yet"
          body="Once you send a booking request to a provider, updates and messages will appear here."
        />
      ) : (
        threads.map((b) => {
          const unlocked = CONTACT_UNLOCKED_STATUSES.has(b.status);
          const studio = b.matches?.find((m) => m.vendorId === b.selectedVendorId)?.studioName ?? "Service provider";
          return (
            <Pressable key={b.bookingId} onPress={() => router.push(`/bookings/${b.bookingId}`)}>
              <Card>
                <View style={styles.row}>
                  <Title>{studio}</Title>
                  <Badge label={unlocked ? "Accepted on Camartes" : "Request sent"} tone={unlocked ? "green" : "peach"} />
                </View>
                <Muted>
                  {unlocked
                    ? "The provider has accepted this booking on Camartes. Open the booking for the latest status."
                    : "Waiting for the provider to respond on Camartes. This is not a confirmed conversation."}
                </Muted>
              </Card>
            </Pressable>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
});
