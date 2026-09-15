import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { CheckCircle2, Lock, Mail, Phone, XCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressHeader } from "@/src/components/ProgressHeader";
import { Badge, Button, Card, Muted, ScreenTitle, SectionTitle } from "@/src/components/ui";
import { StatusTimeline } from "@/src/components/StatusTimeline";
import { CandidateFirmCard } from "@/src/components/CandidateFirmCard";
import * as bookingApi from "@/src/services/bookingApi";
import * as paymentApi from "@/src/services/paymentApi";
import type { AssignedPhotographer, Booking } from "@/src/types/booking";
import { STATUS_LABEL, STATUS_TONE } from "@/src/domain/statusLabels";
import { selectedAddOnLabels, selectedCoreServiceLabels } from "@/src/domain/dayServices";
import { eventTypeLabels } from "@/src/constants/eventCategories";
import { canSearchAgain, getBookingEventTitle, getEffectiveBookingStatus, isCompletedBooking } from "@/src/domain/bookingFilters";
import { selectedPackageQuote } from "@/src/engine/pricing";
import { formatDateLong, formatInr, formatInrRange, formatPackageOverallLabel } from "@/src/utils/format";
import { colors, spacing } from "@/src/constants/theme";
import { useAppStore } from "@/src/state/AppProvider";
import { normalizeRouteParam } from "@/src/utils/routeParam";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { isLocalWizardBooking, getDraftResumeRoute } from "@/src/domain/bookingRequest";

const TERMINAL_ALTERNATE = new Set(["VENDOR_REJECTED", "CUSTOMER_CANCELLED", "VENDOR_CANCELLED", "EXPIRED"]);
const CONTACT_UNLOCKED = new Set(["VENDOR_ACCEPTED", "CUSTOMER_CONFIRMED", "PAYMENT_PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"]);

export default function BookingDetailScreen() {
  const { bookingId: bookingIdParam } = useLocalSearchParams<{ bookingId: string | string[] }>();
  const bookingId = normalizeRouteParam(bookingIdParam);
  const { refreshBookings, deleteBooking, confirmPhotographer, loadDraft, searchAgainBooking } = useAppStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"delete" | null>(null);
  const [firmToConfirm, setFirmToConfirm] = useState<AssignedPhotographer | null>(null);
  const [confirmingFirmId, setConfirmingFirmId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

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

  const match = booking.matches?.find((m) => m.vendorId === (booking.confirmed_provider_id || booking.selectedVendorId));
  const contactUnlocked = CONTACT_UNLOCKED.has(booking.status);
  const displayId = booking.remoteBookingId || booking.bookingId;
  const services = Array.from(new Set(booking.days.flatMap((day) => selectedCoreServiceLabels(day))));
  const addOns = Array.from(new Set(booking.days.flatMap((day) => selectedAddOnLabels(day))));
  const quoted = selectedPackageQuote(booking);

  const assignedFirms: AssignedPhotographer[] = booking.assigned_photographers?.length
    ? booking.assigned_photographers
    : (booking.matches?.slice(0, 6).map((m) => {
        const isAccepted = booking.status === "VENDOR_ACCEPTED" || booking.status === "CONFIRMED" || booking.status === "CUSTOMER_CONFIRMED";
        const isThisConfirmed = (booking.status === "CONFIRMED" || booking.status === "CUSTOMER_CONFIRMED") && (m.vendorId === (booking.confirmed_provider_id || booking.selectedVendorId));
        const firmAccepted = isAccepted && (m.vendorId === (booking.confirmed_provider_id || booking.selectedVendorId));
        return {
          id: m.vendorId,
          provider_id: m.vendorId,
          name: m.studioName,
          rating: m.rating,
          city: m.city,
          profile_image: m.imageUrl,
          has_accepted: firmAccepted,
          is_confirmed: isThisConfirmed,
          can_confirm: firmAccepted && !booking.confirmed_provider_id && booking.status !== "CONFIRMED",
          contact_unlocked: firmAccepted || isThisConfirmed,
          contact_phone: m.contactPhone,
          contact_email: m.contactEmail,
          contact_whatsapp: m.contactPhone,
        };
      }) ?? []);

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

  const handleConfirmFirm = async (firm: AssignedPhotographer) => {
    setBusy(true);
    setConfirmingFirmId(firm.provider_id);
    setError(null);
    try {
      const updated = await confirmPhotographer(booking.bookingId, firm.provider_id);
      setBooking(updated);
      setFirmToConfirm(null);
      Alert.alert("Photography Partner Confirmed!", `${firm.name} is now locked as your official photography partner.`);
    } catch (err: any) {
      const msg = err.message || "Failed to confirm photography partner.";
      setError(msg);
      Alert.alert("Confirmation Failed", msg);
    } finally {
      setBusy(false);
      setConfirmingFirmId(null);
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
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Card style={styles.topCard}>
          {booking.firms_status_message ? (
            <View
              style={styles.firmsStatusPill}
              testID="firms-status-badge"
            >
              <Text style={styles.firmsStatusText}>
                {booking.firms_status_message}
              </Text>
            </View>
          ) : null}
          <ScreenTitle>{getBookingEventTitle(booking)}</ScreenTitle>
          <Muted style={{ fontSize: 12, marginTop: -2, marginBottom: 4 }}>ID: {displayId}</Muted>
          <Badge label={STATUS_LABEL[getEffectiveBookingStatus(booking)]} tone={STATUS_TONE[getEffectiveBookingStatus(booking)]} />
          {booking.remoteStatus ? <Muted>Camartes status: {booking.remoteStatus}</Muted> : null}
        </Card>

        {error ? <Muted style={{ color: colors.danger, fontWeight: "700" }}>{error}</Muted> : null}

        {TERMINAL_ALTERNATE.has(booking.status) || canSearchAgain(booking) ? (
          <Card style={{ borderColor: canSearchAgain(booking) ? colors.primary : colors.danger }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <XCircle size={18} color={canSearchAgain(booking) ? colors.primaryDark : colors.danger} />
              <SectionTitle>{STATUS_LABEL[getEffectiveBookingStatus(booking)]}</SectionTitle>
            </View>
            <Muted style={{ marginTop: 4 }}>
              {booking.firms_status_message || (TERMINAL_ALTERNATE.has(booking.status) ? "This booking is no longer active." : "No photography firms were available or accepted for this request.")}
            </Muted>
            {canSearchAgain(booking) ? (
              <View style={{ marginTop: 12 }}>
                <Button
                  label="Search Again"
                  variant="primary"
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await searchAgainBooking(booking);
                      router.push("/booking/confirm");
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : "Could not prepare booking for retry.";
                      Alert.alert("Search again", msg);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  loading={busy}
                />
              </View>
            ) : null}
          </Card>
        ) : (
          <Card>
            <SectionTitle>Status</SectionTitle>
            <StatusTimeline status={getEffectiveBookingStatus(booking)} booking={booking} />
          </Card>
        )}

        {/* Candidate Photography Firms List with Swiggy-like Clean Design */}
        {assignedFirms.length > 0 ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <SectionTitle>Candidate Photography Firms ({assignedFirms.length})</SectionTitle>
              <Muted style={{ fontSize: 11, color: colors.muted }}>Pull down to refresh</Muted>
            </View>
            <View style={{ gap: 8 }}>
              {assignedFirms.map((firm) => (
                <CandidateFirmCard
                  key={firm.provider_id || firm.id}
                  firm={firm}
                  onConfirm={(f) => setFirmToConfirm(f)}
                  confirmLoading={busy && confirmingFirmId === firm.provider_id}
                  onChat={(f) => {
                    const pid = f.provider_id || f.id;
                    if (!pid) {
                      router.push("/(tabs)/messages");
                      return;
                    }
                    if (!f.has_accepted) {
                      Alert.alert(
                        "Request Pending",
                        `${f.name} hasn't accepted your request yet. Chat will unlock as soon as they accept your booking request.`,
                        [{ text: "Got it" }]
                      );
                      return;
                    }
                    router.push({
                      pathname: "/chat/[userId]",
                      params: {
                        userId: pid,
                        name: f.name,
                        picture: f.profile_image || "",
                        phone: f.contact_phone || "",
                        accepted: "true",
                      },
                    });
                  }}
                />
              ))}
            </View>
          </View>
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

        {!isCompletedBooking(booking) ? (
          <View style={{ gap: spacing.sm, marginVertical: spacing.md }}>
            {canSearchAgain(booking) ? (
              <Button
                label="Search Again"
                variant="primary"
                onPress={async () => {
                  setBusy(true);
                  try {
                    await searchAgainBooking(booking);
                    router.push("/booking/confirm");
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Could not prepare booking for retry.";
                    Alert.alert("Search again", msg);
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                loading={busy}
              />
            ) : null}

            <Button
              label="Edit event details"
              variant="outline"
              onPress={async () => {
                try {
                  const loaded = await loadDraft(booking.bookingId);
                  const active = loaded ?? booking;
                  const target = getDraftResumeRoute(active);
                  router.push(target as any);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Could not load booking.";
                  Alert.alert("Edit booking", msg);
                }
              }}
              disabled={busy}
            />

            {(isLocalWizardBooking(booking) || (!booking.remoteBookingId && booking.status === "DRAFT")) ? (
              <Button
                label="Delete draft"
                variant="danger"
                onPress={() => setConfirmMode("delete")}
                disabled={busy}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmMode !== null}
        title="Delete draft booking?"
        message="This will remove the draft booking and all of its event days. This action cannot be undone."
        confirmLabel="Delete draft"
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
          }
        }}
        onCancel={() => {
          if (!busy) setConfirmMode(null);
        }}
        testID="booking-detail-confirm-dialog"
      />

      <ConfirmDialog
        visible={firmToConfirm !== null}
        title="Confirm Photographer"
        message={`Confirm ${firmToConfirm?.name} as your photography partner? This will lock your booking with this partner.`}
        confirmLabel="Confirm Photographer"
        cancelLabel="Cancel"
        confirmVariant="primary"
        loading={busy && confirmingFirmId !== null}
        onConfirm={() => {
          if (firmToConfirm) void handleConfirmFirm(firmToConfirm);
        }}
        onCancel={() => {
          if (!busy) setFirmToConfirm(null);
        }}
        testID="confirm-photographer-dialog"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topCard: {
    gap: 8,
  },
  firmsStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  firmsStatusIndigo: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  firmsStatusPurple: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  firmsStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  firmsStatusTextIndigo: {
    color: colors.primaryDark,
  },
  firmsStatusTextPurple: {
    color: colors.primaryDark,
  },
});

