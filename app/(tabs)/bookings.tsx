import { useState, useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CalendarX2, MapPin, Trash2, XCircle } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Badge, Card, Muted, ScreenTitle, Title } from "@/src/components/ui";
import { EmptyState } from "@/src/components/EmptyState";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useAppStore } from "@/src/state/AppProvider";
import { STATUS_LABEL, STATUS_TONE } from "@/src/domain/statusLabels";
import { isLocalWizardBooking } from "@/src/domain/bookingRequest";
import { formatDateLong, formatInr } from "@/src/utils/format";
import { colors, radiusSm, spacing } from "@/src/constants/theme";
import type { Booking } from "@/src/types/booking";

const CANCELLABLE_STATUSES = new Set([
  "SUBMITTED",
  "MATCHING",
  "VENDOR_SELECTED",
  "REQUEST_SENT",
  "VENDOR_ACCEPTED",
  "CUSTOMER_CONFIRMED",
]);

interface TargetAction {
  booking: Booking;
  mode: "delete" | "cancel";
}

export default function BookingsScreen() {
  const { bookings, refreshBookings, loadDraft, deleteBooking } = useAppStore();
  const [targetAction, setTargetAction] = useState<TargetAction | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshBookings();
    }, [refreshBookings]),
  );

  const openBooking = async (bookingId: string, booking: Booking) => {
    if (isLocalWizardBooking(booking) || (!booking.remoteBookingId && booking.status === "DRAFT")) {
      await loadDraft(bookingId);
      router.push("/booking/new");
    } else {
      router.push(`/bookings/${bookingId}`);
    }
  };

  const handleConfirmAction = async () => {
    if (!targetAction || busy) return;
    setBusy(true);
    try {
      await deleteBooking(targetAction.booking.bookingId);
      setTargetAction(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to process booking.";
      Alert.alert(targetAction.mode === "delete" ? "Could not delete booking" : "Could not cancel booking", msg);
    } finally {
      setBusy(false);
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
          const isDraft = isLocalWizardBooking(b) || (!b.remoteBookingId && b.status === "DRAFT");
          const canCancel = !isDraft && CANCELLABLE_STATUSES.has(b.status);

          return (
            <Card key={b.bookingId} style={styles.cardContainer}>
              <Pressable
                onPress={() => openBooking(b.bookingId, b)}
                accessibilityRole="button"
                accessibilityLabel={`Open booking ${b.remoteBookingId || b.bookingId}`}
                style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
                testID={`booking-card-${b.bookingId}`}
              >
                <View style={styles.row}>
                  <Title style={styles.bookingTitle}>
                    {b.remoteBookingId || (b.bookingId.startsWith("draft") ? "Untitled booking" : b.bookingId)}
                  </Title>
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
                {b.estimatedAmount ? (
                  <Muted style={{ fontWeight: "700", color: colors.primaryDark }}>{formatInr(b.estimatedAmount)}</Muted>
                ) : null}
              </Pressable>

              {isDraft || canCancel ? (
                <View style={styles.actionRow} testID={`booking-actions-${b.bookingId}`}>
                  {isDraft ? (
                    <Pressable
                      style={({ pressed }) => [styles.deleteBtn, pressed && styles.actionPressed]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setTargetAction({ booking: b, mode: "delete" });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Delete booking"
                      testID={`delete-booking-btn-${b.bookingId}`}
                    >
                      <Trash2 size={14} color={colors.danger} />
                      <Text style={styles.deleteBtnText}>Delete booking</Text>
                    </Pressable>
                  ) : null}

                  {canCancel ? (
                    <Pressable
                      style={({ pressed }) => [styles.cancelBtn, pressed && styles.actionPressed]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setTargetAction({ booking: b, mode: "cancel" });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel booking"
                      testID={`cancel-booking-btn-${b.bookingId}`}
                    >
                      <XCircle size={14} color={colors.danger} />
                      <Text style={styles.cancelBtnText}>Cancel booking</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <ConfirmDialog
        visible={targetAction !== null}
        title={targetAction?.mode === "delete" ? "Delete booking?" : "Cancel booking?"}
        message={
          targetAction?.mode === "delete"
            ? "This will remove the entire booking and all of its event days. This action cannot be undone."
            : "This will cancel your booking request with Camartes. This action cannot be undone."
        }
        confirmLabel={targetAction?.mode === "delete" ? "Delete booking" : "Cancel booking"}
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={busy}
        onConfirm={() => void handleConfirmAction()}
        onCancel={() => {
          if (!busy) setTargetAction(null);
        }}
        testID="booking-confirm-dialog"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    padding: 0,
    overflow: "hidden",
  },
  cardPressable: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardPressed: {
    opacity: 0.85,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  bookingTitle: {
    fontSize: 16,
    flexShrink: 1,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.cream,
    gap: spacing.sm,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radiusSm,
    backgroundColor: colors.dangerBg,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radiusSm,
    backgroundColor: colors.dangerBg,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
  actionPressed: {
    opacity: 0.65,
  },
});
