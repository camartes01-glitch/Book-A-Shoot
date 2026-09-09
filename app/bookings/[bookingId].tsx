import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { CheckCircle2, Mail, Phone, XCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressHeader } from "@/src/components/ProgressHeader";
import { Badge, Button, Card, Muted, ScreenTitle, SectionTitle } from "@/src/components/ui";
import { StatusTimeline } from "@/src/components/StatusTimeline";
import * as bookingApi from "@/src/services/bookingApi";
import * as paymentApi from "@/src/services/paymentApi";
import type { Booking } from "@/src/types/booking";
import { STATUS_LABEL, STATUS_TONE } from "@/src/domain/statusLabels";
import { selectedAddOnLabels, selectedCoreServiceLabels } from "@/src/domain/dayServices";
import { eventTypeLabels } from "@/src/constants/eventCategories";
import { selectedPackageQuote } from "@/src/engine/pricing";
import { formatDateLong, formatInr, formatInrRange, formatPackageOverallLabel } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";
import { useAppStore } from "@/src/state/AppProvider";
import { normalizeRouteParam } from "@/src/utils/routeParam";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { isLocalWizardBooking } from "@/src/domain/bookingRequest";

const TERMINAL_ALTERNATE = new Set(["VENDOR_REJECTED", "CUSTOMER_CANCELLED", "VENDOR_CANCELLED", "EXPIRED"]);
const CANCELLABLE = new Set(["SUBMITTED", "MATCHING", "VENDOR_SELECTED", "REQUEST_SENT", "VENDOR_ACCEPTED", "CUSTOMER_CONFIRMED"]);
const CONTACT_UNLOCKED = new Set(["VENDOR_ACCEPTED", "CUSTOMER_CONFIRMED", "PAYMENT_PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"]);

export default function BookingDetailScreen() {
  const { bookingId: bookingIdParam } = useLocalSearchParams<{ bookingId: string | string[] }>();
  const bookingId = normalizeRouteParam(bookingIdParam);
  const { reopenForMatching, refreshBookings, deleteBooking } = useAppStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"delete" | "cancel" | null>(null);

  const load = useCallback(async () => {
    try {
      const local = await bookingApi.getBooking(bookingId);
      if (!local) {
        setMissing(true);
        return;
      }
      setMissing(false);
      if (local.remoteBookingId) {
        const fresh = await bookingApi.refreshRemoteBookingStatus(local.bookingId);
        setBooking(fresh ?? local);
      } else {
        setBooking(local);
      }
      await refreshBookings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh this booking from Camartes.");
      const local = await bookingApi.getBooking(bookingId);
      if (local) setBooking(local);
    }
  }, [bookingId, refreshBookings]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (booking?.status !== "REQUEST_SENT" || !booking.remoteBookingId) return;
    const interval = setInterval(() => void load(), 8000);
    return () => clearInterval(interval);
  }, [booking?.status, booking?.remoteBookingId, load]);

  if (missing && !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right", "bottom"]}>
        <ProgressHeader title="Booking details" step="providers" onBack={() => router.replace("/(tabs)/bookings")} />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Muted>This booking was not found on this device.</Muted>
          <Button label="Back to bookings" onPress={() => router.replace("/(tabs)/bookings")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const match = booking.matches?.find((m) => m.vendorId === booking.selectedVendorId);
  const contactUnlocked = CONTACT_UNLOCKED.has(booking.status);
  const displayId = booking.remoteBookingId || booking.bookingId;
  const services = Array.from(new Set(booking.days.flatMap((day) => selectedCoreServiceLabels(day))));
  const addOns = Array.from(new Set(booking.days.flatMap((day) => selectedAddOnLabels(day))));
  const quoted = selectedPackageQuote(booking);

  const run = async (fn: () => Promise<Booking>) => {
    setBusy(true);
    setError(null);
    try {
      setBooking(await fn());
      await refreshBookings();
    } catch (e) {
      const message = e instanceof Error ? e.message : "That update could not be saved.";
      setError(message);
      Alert.alert("Update not saved", message);
    } finally {
      setBusy(false);
    }
  };

  const handleInitiatePayment = async () => {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const targetBookingId = booking.remoteBookingId || booking.bookingId;
      const order = await paymentApi.createPaymentOrder(targetBookingId);

      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: order.key_id,
          amount: order.amount * 100,
          currency: order.currency,
          name: "Camartes Book A Shoot",
          description: `Booking #${order.booking_id}`,
          order_id: order.order_id,
          handler: async (response: any) => {
            try {
              setBusy(true);
              const verified = await paymentApi.verifyPayment({
                booking_id: order.booking_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              if (verified.success) {
                Alert.alert("Payment Successful", "Your booking is confirmed!");
                await load();
              }
            } catch (verErr: any) {
              Alert.alert("Verification Failed", verErr.message || "Payment verification failed.");
            } finally {
              setBusy(false);
            }
          },
          theme: { color: colors.primary },
        });
        rzp.open();
      } else {
        const verified = await paymentApi.verifyPayment({
          booking_id: order.booking_id,
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: "mock_valid_signature",
        });
        if (verified.success) {
          Alert.alert("Payment Successful", "Your booking has been verified and confirmed!");
          await load();
        }
      }
    } catch (err: any) {
      const msg = err.message || "Could not initiate payment.";
      setError(msg);
      Alert.alert("Payment Error", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right", "bottom"]}>
      <ProgressHeader title="Booking details" step="providers" onBack={() => router.replace("/(tabs)/bookings")} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card>
          <ScreenTitle>{displayId}</ScreenTitle>
          <Badge label={STATUS_LABEL[booking.status]} tone={STATUS_TONE[booking.status]} />
          {booking.remoteStatus ? <Muted>Camartes status: {booking.remoteStatus}</Muted> : null}
        </Card>

        {error ? <Muted style={{ color: colors.danger, fontWeight: "700" }}>{error}</Muted> : null}

        {TERMINAL_ALTERNATE.has(booking.status) ? (
          <Card style={{ borderColor: colors.danger }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <XCircle size={18} color={colors.danger} />
              <SectionTitle>{STATUS_LABEL[booking.status]}</SectionTitle>
            </View>
            {booking.status === "VENDOR_REJECTED" ? (
              <>
                <Muted>Your selected vendor could not take this booking. You can choose another matched provider without re-entering your requirements.</Muted>
                <Button
                  label="Choose another provider"
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await reopenForMatching(booking.bookingId);
                      router.push("/booking/matches");
                    } catch (e) {
                      Alert.alert("Could not reopen matching", e instanceof Error ? e.message : "Try again.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </>
            ) : (
              <Muted>This booking is no longer active.</Muted>
            )}
          </Card>
        ) : (
          <Card>
            <SectionTitle>Status</SectionTitle>
            <StatusTimeline status={booking.status} />
          </Card>
        )}

        {booking.status === "REQUEST_SENT" ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={colors.primary} />
              <Muted>Your request is with Camartes. This screen updates when the provider responds — it will not invent an acceptance.</Muted>
            </View>
          </Card>
        ) : null}

        {booking.status === "VENDOR_ACCEPTED" && !booking.counterOffer ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={18} color={colors.success} />
              <SectionTitle>Vendor accepted your request</SectionTitle>
            </View>
            <Muted>Confirming asks Camartes to record that status. It is not marked confirmed until the backend accepts the update.</Muted>
            <Button label="Confirm booking" onPress={() => run(() => bookingApi.confirmBooking(booking.bookingId))} loading={busy} />
          </Card>
        ) : null}

        {booking.status === "CUSTOMER_CONFIRMED" || booking.status === "PAYMENT_PENDING" ? (
          <Card>
            <SectionTitle>Payment</SectionTitle>
            <Muted>
              Complete payment with Razorpay to finalize your booking. Status will transition to Confirmed upon backend verification.
            </Muted>
            {booking.estimatedAmount ? (
              <Muted style={{ fontWeight: "700", color: colors.ink, marginVertical: 4 }}>
                Payable Amount: {formatInr(booking.estimatedAmount)}
              </Muted>
            ) : null}
            <Button
              label={busy ? "Processing Payment..." : "Pay with Razorpay"}
              onPress={handleInitiatePayment}
              disabled={busy}
              loading={busy}
            />
          </Card>
        ) : null}

        {match ? (
          <Card>
            <SectionTitle>Vendor</SectionTitle>
            <Muted style={{ fontWeight: "800", color: colors.ink, fontSize: 15 }}>{match.studioName}</Muted>
            <Muted>{match.city}</Muted>
            {contactUnlocked ? (
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Phone size={14} color={colors.primaryDark} />
                  <Muted>The provider accepted on Camartes. Direct numbers stay in Camartes until that platform shows them.</Muted>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Mail size={14} color={colors.primaryDark} />
                  <Muted>Booking updates also come from Camartes.</Muted>
                </View>
              </View>
            ) : (
              <Muted>Contact details unlock once the vendor accepts on Camartes.</Muted>
            )}
          </Card>
        ) : booking.selectedVendorId ? (
          <Card>
            <SectionTitle>Vendor</SectionTitle>
            <Muted>Provider ID {booking.selectedVendorId}</Muted>
          </Card>
        ) : null}

        <Card>
          <SectionTitle>Booking summary</SectionTitle>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Event type</Muted>
            <Muted style={{ fontWeight: "700", flex: 1, textAlign: "right" }}>
              {eventTypeLabels(booking.days.flatMap((day) => day.eventTypeIds)) || "—"}
            </Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Services</Muted>
            <Muted style={{ fontWeight: "700", flex: 1, textAlign: "right" }}>{services.join(" · ") || "—"}</Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Add-ons</Muted>
            <Muted style={{ fontWeight: "700", flex: 1, textAlign: "right" }}>{addOns.join(" · ") || "None"}</Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Muted>Package</Muted>
            <Muted style={{ fontWeight: "700", flex: 1, textAlign: "right", flexShrink: 1 }}>
              {quoted
                ? formatPackageOverallLabel(quoted.label, quoted.minPrice, quoted.maxPrice)
                : booking.selectedPackage ?? "—"}
            </Muted>
          </View>
          {quoted && quoted.maxPrice > 0 ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Muted>Package estimate</Muted>
              <Muted style={{ fontWeight: "700", flex: 1, textAlign: "right", flexShrink: 1 }}>
                {formatInrRange(quoted.minPrice, quoted.maxPrice)}
              </Muted>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Provider estimate</Muted>
            <Muted style={{ fontWeight: "700" }}>{booking.estimatedAmount ? formatInr(booking.estimatedAmount) : "—"}</Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Event days</Muted>
            <Muted style={{ fontWeight: "700" }}>{booking.days.length}</Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Location</Muted>
            <Muted style={{ fontWeight: "700", flex: 1, textAlign: "right" }}>
              {booking.days[0]?.location.formattedAddress || booking.days[0]?.location.city || "—"}
            </Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Expected delivery</Muted>
            <Muted style={{ fontWeight: "700" }}>{formatDateLong(booking.expectedDeliveryDate)}</Muted>
          </View>
        </Card>

        {isLocalWizardBooking(booking) || (!booking.remoteBookingId && booking.status === "DRAFT") ? (
          <Button
            label="Delete booking"
            variant="danger"
            onPress={() => setConfirmMode("delete")}
            disabled={busy}
          />
        ) : CANCELLABLE.has(booking.status) ? (
          <Button
            label="Cancel booking"
            variant="danger"
            onPress={() => setConfirmMode("cancel")}
            disabled={busy}
          />
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmMode !== null}
        title={confirmMode === "delete" ? "Delete booking?" : "Cancel booking?"}
        message={
          confirmMode === "delete"
            ? "This will remove the entire booking and all of its event days. This action cannot be undone."
            : "This will cancel your booking request with Camartes. This action cannot be undone."
        }
        confirmLabel={confirmMode === "delete" ? "Delete booking" : "Cancel booking"}
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={busy}
        onConfirm={async () => {
          if (confirmMode === "delete") {
            setBusy(true);
            try {
              await deleteBooking(booking.bookingId);
              setConfirmMode(null);
              router.replace("/(tabs)/bookings");
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Could not delete booking.";
              Alert.alert("Could not delete booking", msg);
            } finally {
              setBusy(false);
            }
          } else if (confirmMode === "cancel") {
            await run(() => bookingApi.cancelBooking(booking.bookingId));
            setConfirmMode(null);
          }
        }}
        onCancel={() => {
          if (!busy) setConfirmMode(null);
        }}
        testID="booking-detail-confirm-dialog"
      />
    </SafeAreaView>
  );
}
