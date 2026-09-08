import { Pressable, StyleSheet, View } from "react-native";
import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { CalendarX2, MapPin } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Badge, Card, Muted, ScreenTitle, Title } from "@/src/components/ui";
import { EmptyState } from "@/src/components/EmptyState";
import { useAppStore } from "@/src/state/AppProvider";
import { STATUS_LABEL, STATUS_TONE } from "@/src/domain/statusLabels";
import { isLocalWizardBooking } from "@/src/domain/bookingRequest";
import { formatDateLong, formatInr } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";

export default function BookingsScreen() {
  const { bookings, refreshBookings, loadDraft } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      void refreshBookings();
    }, [refreshBookings]),
  );

  const openBooking = async (bookingId: string, booking: (typeof bookings)[number]) => {
    if (isLocalWizardBooking(booking)) {
      await loadDraft(bookingId);
      router.push("/booking/new");
    } else {
      router.push(`/bookings/${bookingId}`);
    }
  };

  return (
    <ScreenContainer>
      <ScreenTitle>My Bookings</ScreenTitle>
      {!bookings.length ? (
        <EmptyState
          icon={<CalendarX2 size={40} color={colors.muted} />}
          title="No bookings yet"
          body="Create your first booking to get matched with photographers and videographers."
          actionLabel="Create a booking"
          onAction={() => router.push("/(tabs)")}
        />
      ) : (
        bookings.map((b) => {
          const finalEventDate = b.days.map((d) => d.eventDate).filter(Boolean).sort().pop();
          return (
            <Pressable key={b.bookingId} onPress={() => openBooking(b.bookingId, b)}>
              <Card>
                <View style={styles.row}>
                  <Title>{b.remoteBookingId || (b.bookingId.startsWith("draft") ? "Untitled booking" : b.bookingId)}</Title>
                  <Badge label={STATUS_LABEL[b.status]} tone={STATUS_TONE[b.status]} />
                </View>
                <View style={styles.metaRow}>
                  <MapPin size={13} color={colors.muted} />
                  <Muted>{b.days[0]?.location.city || "Location not set"}</Muted>
                </View>
                <Muted>
                  {b.days.length} event day{b.days.length === 1 ? "" : "s"}
                  {finalEventDate ? ` · ${formatDateLong(finalEventDate)}` : ""}
                </Muted>
                {b.estimatedAmount ? <Muted style={{ fontWeight: "700", color: colors.primaryDark }}>{formatInr(b.estimatedAmount)}</Muted> : null}
              </Card>
            </Pressable>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
});
