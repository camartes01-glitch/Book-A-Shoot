import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AlertTriangle, CheckCircle2, Mail, Phone, XCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressHeader } from "@/src/components/ProgressHeader";
import { Badge, Button, Card, Muted, ScreenTitle, SectionTitle } from "@/src/components/ui";
import { StatusTimeline } from "@/src/components/StatusTimeline";
import * as bookingApi from "@/src/services/bookingApi";
import type { Booking } from "@/src/types/booking";
import { STATUS_LABEL, STATUS_TONE } from "@/src/domain/statusLabels";
import { formatDateLong, formatInr } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";

const TERMINAL_ALTERNATE = new Set(["VENDOR_REJECTED", "CUSTOMER_CANCELLED", "VENDOR_CANCELLED", "EXPIRED"]);
const CANCELLABLE = new Set(["SUBMITTED", "MATCHING", "VENDOR_SELECTED", "REQUEST_SENT", "VENDOR_ACCEPTED", "CUSTOMER_CONFIRMED"]);

export default function BookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBooking(await bookingApi.getBooking(bookingId));
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (booking?.status !== "REQUEST_SENT") return;
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [booking?.status, load]);

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const match = booking.matches?.find((m) => m.vendorId === booking.selectedVendorId);
  const contactUnlocked = ["VENDOR_ACCEPTED", "CUSTOMER_CONFIRMED", "PAYMENT_PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(booking.status);

  const run = async (fn: () => Promise<Booking>) => {
    setBusy(true);
    try {
      setBooking(await fn());
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right", "bottom"]}>
      <ProgressHeader title="Booking details" step="providers" onBack={() => router.replace("/(tabs)/bookings")} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card>
          <ScreenTitle>{booking.bookingId}</ScreenTitle>
          <Badge label={STATUS_LABEL[booking.status]} tone={STATUS_TONE[booking.status]} />
        </Card>

        {TERMINAL_ALTERNATE.has(booking.status) ? (
          <Card style={{ borderColor: colors.danger }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <XCircle size={18} color={colors.danger} />
              <SectionTitle>{STATUS_LABEL[booking.status]}</SectionTitle>
            </View>
            {booking.status === "VENDOR_REJECTED" ? (
              <>
                <Muted>Your selected vendor could not take this booking. You can choose another matched provider without re-entering your requirements.</Muted>
                <Button label="Choose another provider" onPress={() => run(() => bookingApi.reopenForMatching(booking.bookingId)).then(() => router.push("/booking/matches"))} />
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
              <Muted>Waiting for the vendor to respond…</Muted>
            </View>
          </Card>
        ) : null}

        {booking.counterOffer && booking.counterOffer.status === "pending" ? (
          <Card style={{ borderColor: colors.warning }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} color={colors.warning} />
              <SectionTitle>Vendor Counter Offer</SectionTitle>
            </View>
            <Muted style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}>{formatInr(booking.counterOffer.amount)}</Muted>
            <Muted>{booking.counterOffer.note}</Muted>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Muted>Your budget</Muted>
              <Muted style={{ fontWeight: "700" }}>{formatInr(booking.budget ?? 0)}</Muted>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Muted>Difference</Muted>
              <Muted style={{ fontWeight: "700" }}>{formatInr(booking.counterOffer.amount - (booking.budget ?? 0))}</Muted>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Button label="Accept" flex={1} onPress={() => run(() => bookingApi.respondToCounterOffer(booking.bookingId, "accept"))} loading={busy} />
              <Button label="Decline" flex={1} variant="outline" onPress={() => run(() => bookingApi.respondToCounterOffer(booking.bookingId, "decline"))} loading={busy} />
            </View>
          </Card>
        ) : null}

        {booking.status === "VENDOR_ACCEPTED" && !booking.counterOffer ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={18} color={colors.success} />
              <SectionTitle>Vendor accepted your request</SectionTitle>
            </View>
            <Button label="Confirm booking" onPress={() => run(() => bookingApi.confirmBooking(booking.bookingId))} loading={busy} />
          </Card>
        ) : null}

        {booking.status === "CUSTOMER_CONFIRMED" ? (
          <Card>
            <SectionTitle>Payment</SectionTitle>
            <Muted>Amount due: {formatInr(booking.estimatedAmount ?? 0)}</Muted>
            <Button label="Proceed to payment" onPress={() => run(() => bookingApi.markPaymentComplete(booking.bookingId))} loading={busy} />
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
                  <Muted>Contact unlocked — visible in your Camartes messages.</Muted>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Mail size={14} color={colors.primaryDark} />
                  <Muted>Booking updates will also be emailed to you.</Muted>
                </View>
              </View>
            ) : (
              <Muted>Contact details unlock once the vendor accepts.</Muted>
            )}
          </Card>
        ) : null}

        <Card>
          <SectionTitle>Booking summary</SectionTitle>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Package</Muted>
            <Muted style={{ fontWeight: "700", textTransform: "capitalize" }}>{booking.selectedPackage}</Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Estimated amount</Muted>
            <Muted style={{ fontWeight: "700" }}>{formatInr(booking.estimatedAmount ?? 0)}</Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Event days</Muted>
            <Muted style={{ fontWeight: "700" }}>{booking.days.length}</Muted>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Expected delivery</Muted>
            <Muted style={{ fontWeight: "700" }}>{formatDateLong(booking.expectedDeliveryDate)}</Muted>
          </View>
        </Card>

        {CANCELLABLE.has(booking.status) ? (
          <Button label="Cancel booking" variant="danger" onPress={() => run(() => bookingApi.cancelBooking(booking.bookingId))} loading={busy} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
