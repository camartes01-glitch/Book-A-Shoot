import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Calendar, Camera, CheckCircle2, Clapperboard, Clock, Film, Image as ImageLucide, Lock, Mail, MapPin, Phone, Sparkles, Video, XCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressHeader } from "@/src/components/ProgressHeader";
import { Badge, Button, Card, Muted, ScreenTitle, SectionTitle } from "@/src/components/ui";
import { CandidateFirmCard } from "@/src/components/CandidateFirmCard";
import { FirmDetailModal } from "@/src/components/FirmDetailModal";
import * as bookingApi from "@/src/services/bookingApi";
import * as paymentApi from "@/src/services/paymentApi";
import type { AssignedPhotographer, Booking, EventDay, PackageTierId } from "@/src/types/booking";
import { STATUS_LABEL, STATUS_TONE } from "@/src/domain/statusLabels";
import { selectedAddOnLabels, selectedCoreServiceLabels } from "@/src/domain/dayServices";
import { DEFAULT_EVENT_CATEGORIES, eventTypeLabels } from "@/src/constants/eventCategories";
import { canSearchAgain, getBookingEventTitle, getEffectiveBookingStatus, isCompletedBooking } from "@/src/domain/bookingFilters";
import { resolvePackageOptions, selectedPackageQuote } from "@/src/engine/pricing";
import { PACKAGE_TIER_META } from "@/src/config/approvedBudget";
import { defaultExpectedDeliveryDate } from "@/src/engine/validation";
import { formatDateLong, formatInr, formatInrRange, formatPackageOverallLabel, formatTime12h } from "@/src/utils/format";
import { durationMinutes, formatDuration } from "@/src/utils/dateTime";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";
import { useAppStore } from "@/src/state/AppProvider";
import { normalizeRouteParam } from "@/src/utils/routeParam";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { isLocalWizardBooking, getDraftResumeRoute } from "@/src/domain/bookingRequest";

const TERMINAL_ALTERNATE = new Set(["VENDOR_REJECTED", "CUSTOMER_CANCELLED", "VENDOR_CANCELLED", "EXPIRED"]);
const CONTACT_UNLOCKED = new Set(["VENDOR_ACCEPTED", "CUSTOMER_CONFIRMED", "PAYMENT_PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"]);

function getDayEventTitle(day: EventDay): string {
  const labels = (day.eventTypeIds || [])
    .map((id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)?.label ?? id)
    .filter(Boolean);
  return labels.length ? labels.join(" · ") : `Event Day ${day.order}`;
}

function getDayServicesText(day: EventDay): string {
  const parts: string[] = [];
  if (day.photography?.traditional) parts.push(`Traditional Photo ×${day.photography.traditionalCount}`);
  if (day.photography?.candid) parts.push(`Candid Photo ×${day.photography.candidCount}`);
  if (day.videography?.traditional) parts.push(`Traditional Video ×${day.videography.traditionalCount}`);
  if (day.videography?.candid) parts.push(`Cinematic Video ×${day.videography.candidCount}`);
  return parts.length ? parts.join(" · ") : "No core coverage selected";
}

function getDayAddOnsText(day: EventDay): string {
  const parts: string[] = [];
  if (day.aerial?.drones > 0) parts.push(`Drone ×${day.aerial.drones}`);
  if (day.ledWall?.enabled) parts.push(`LED Wall (${day.ledWall.size}, ${day.ledWall.screenCount} screen${day.ledWall.screenCount > 1 ? "s" : ""})`);
  if (day.webLive?.enabled) parts.push(`Web Live (${day.webLive.quality}, ${day.webLive.cameraCount} cam)`);
  return parts.length ? parts.join(" · ") : "None";
}

export default function BookingDetailScreen() {
  const { bookingId: bookingIdParam, focusFirmId: focusFirmIdParam } = useLocalSearchParams<{
    bookingId: string | string[];
    focusFirmId?: string | string[];
  }>();
  const bookingId = normalizeRouteParam(bookingIdParam);
  const focusFirmId = normalizeRouteParam(focusFirmIdParam);
  const focusHandledRef = useRef(false);
  const { refreshBookings, deleteBooking, confirmPhotographer, loadDraft, searchAgainBooking } = useAppStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"delete" | null>(null);
  const [firmToConfirm, setFirmToConfirm] = useState<AssignedPhotographer | null>(null);
  const [selectedFirmModal, setSelectedFirmModal] = useState<AssignedPhotographer | null>(null);
  const [confirmingFirmId, setConfirmingFirmId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // 1. Immediately render cached booking if present (0ms!)
      let current = await bookingApi.getBooking(bookingId);
      if (current) {
        setMissing(false);
        setBooking(current);
      }

      // 2. Revalidate / refresh in background or fetch directly by ID
      const targetId = current?.bookingId || bookingId;
      const fresh = await bookingApi.refreshRemoteBookingStatus(targetId);
      if (fresh) {
        setMissing(false);
        setBooking(fresh);
        current = fresh;
      }

      if (!current) {
        setMissing(true);
        return;
      }

      // 3. Keep bookings list in sync non-blockingly
      void refreshBookings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh this booking from Camartes.");
      const local = await bookingApi.getBooking(bookingId);
      if (local) {
        setMissing(false);
        setBooking(local);
      }
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

  useEffect(() => {
    if (!booking || !focusFirmId || focusHandledRef.current) return;
    const match = booking.assigned_photographers?.find((f) => (f.provider_id || f.id) === focusFirmId);
    if (match) {
      setSelectedFirmModal(match);
      focusHandledRef.current = true;
    }
  }, [booking, focusFirmId]);

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

  const albumLabel = booking.deliverables?.photo?.album
    ? `Printed Photo Album (${
        booking.deliverables.photo.albumPagesOption === "custom"
          ? booking.deliverables.photo.albumPagesCustomCount || 20
          : booking.deliverables.photo.albumPagesOption || 20
      } pages)`
    : null;
  const rawAddOns = [
    ...booking.days.flatMap((day) => selectedAddOnLabels(day)),
    ...(albumLabel ? [albumLabel] : []),
  ];
  const addOns = Array.from(new Set(rawAddOns.filter(Boolean)));

  const deliverablesSummary: string[] = [];
  if (booking.deliverables?.photo?.album) {
    const pages =
      booking.deliverables.photo.albumPagesOption === "custom"
        ? Math.max(1, booking.deliverables.photo.albumPagesCustomCount ?? 20)
        : parseInt(String(booking.deliverables.photo.albumPagesOption ?? "20"), 10) || 20;
    deliverablesSummary.push(`Printed Photo Album (${pages} pages)`);
  }
  if (booking.deliverables?.photo?.rawPhotos) deliverablesSummary.push("Raw Photos");
  const edCount =
    booking.deliverables?.photo?.editedPhotosOption === "custom"
      ? booking.deliverables.photo.editedPhotosCustomCount
      : booking.deliverables?.photo?.editedPhotosOption;
  if (edCount && String(edCount) !== "0") deliverablesSummary.push(`Edited Photos (${edCount})`);
  if (booking.deliverables?.video?.rawVideo) deliverablesSummary.push("Raw Video Footage");
  if (booking.deliverables?.video?.editedTraditionalVideoCount) {
    deliverablesSummary.push(`${booking.deliverables.video.editedTraditionalVideoCount} Traditional Video${booking.deliverables.video.editedTraditionalVideoCount > 1 ? "s" : ""}`);
  }
  if (booking.deliverables?.video?.editedCinematicVideoCount) {
    deliverablesSummary.push(`${booking.deliverables.video.editedCinematicVideoCount} Cinematic Video${booking.deliverables.video.editedCinematicVideoCount > 1 ? "s" : ""}`);
  }
  if (booking.deliverables?.video?.teaserCinematicEnabled) {
    deliverablesSummary.push(`Teaser Cinematic Video (${booking.deliverables.video.teaserDurationMinutes || 1} min)`);
  }

  const quoted = selectedPackageQuote(booking);
  let effectiveQuoted = quoted;
  if (!effectiveQuoted && booking.selectedPackage) {
    try {
      const opts = resolvePackageOptions(booking);
      effectiveQuoted = opts.find((o) => o.id === booking.selectedPackage);
    } catch {
      effectiveQuoted = undefined;
    }
  }

  const rawTier = booking.selectedPackage as PackageTierId | null | undefined;
  const packageLabel = rawTier
    ? (PACKAGE_TIER_META[rawTier]?.label ?? (typeof rawTier === "string" ? rawTier.charAt(0).toUpperCase() + rawTier.slice(1) : "—"))
    : "—";

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

        {TERMINAL_ALTERNATE.has(booking.status) ? (
          <Card style={{ borderColor: colors.danger }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <XCircle size={18} color={colors.danger} />
              <SectionTitle>{STATUS_LABEL[getEffectiveBookingStatus(booking)]}</SectionTitle>
            </View>
            <Muted style={{ marginTop: 4 }}>
              {booking.firms_status_message || "This booking is no longer active."}
            </Muted>
          </Card>
        ) : null}

        {/* Candidate Photography Firms List with Swiggy-like Clean Design */}
        {assignedFirms.length > 0 ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <SectionTitle>Candidate Photography Firms ({assignedFirms.length})</SectionTitle>
              <Muted style={{ fontSize: 11, color: colors.muted }}>Pull down to refresh</Muted>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: -4, marginBottom: 2 }}>
              <Clock size={12} color="#EA580C" />
              <Text style={{ fontSize: 12, color: "#9A3412", fontWeight: "600" }}>
                Tap on any firm card to track live response status & shoot timeline
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {assignedFirms.map((firm) => (
                <CandidateFirmCard
                  key={firm.provider_id || firm.id}
                  firm={firm}
                  onPress={(f) => setSelectedFirmModal(f)}
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

        {/* EXECUTIVE BOOKING SPECIFICATION & MULTI-EVENT BREAKDOWN */}
        <View style={{ gap: 12, marginTop: 4 }}>
          <View style={{ gap: 4 }}>
            <SectionTitle>Shoot Specification & Requirements</SectionTitle>
            <Muted>Complete breakdown of scheduled event days, crew requirements, and post-production deliverables.</Muted>
          </View>

          {/* Scheduled Event Days Cards */}
          {booking.days.map((day) => {
            const minutes = day?.startTime && day?.endTime ? durationMinutes(day.startTime, day.endTime, day.overnight) : null;
            const eventTitle = getDayEventTitle(day);
            const servicesText = getDayServicesText(day);
            const addOnsText = getDayAddOnsText(day);

            return (
              <Card key={day.dayId} style={styles.eventDayCard}>
                {/* Event Header */}
                <View style={styles.eventCardHeader}>
                  <View style={styles.eventCardTitleGroup}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>Day {day.order}</Text>
                    </View>
                    <Text style={styles.eventCardTitle} numberOfLines={1}>
                      {eventTitle}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Date & Timings */}
                <View style={styles.detailRow}>
                  <Calendar size={15} color="#EA580C" style={styles.detailIcon} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={styles.detailLabel}>Date & Schedule</Text>
                    <Text style={styles.detailValueText}>
                      {day.eventDate ? formatDateLong(day.eventDate) : "Date pending"}
                    </Text>
                    <Text style={styles.detailSubValueText}>
                      {day.startTime ? formatTime12h(day.startTime) : "--"} – {day.endTime ? formatTime12h(day.endTime) : "--"}
                      {day.overnight ? " · Overnight (ends next day)" : ""}
                      {minutes != null ? ` · ${formatDuration(minutes)}` : ""}
                    </Text>
                  </View>
                </View>

                {/* Venue Location */}
                <View style={styles.detailRow}>
                  <MapPin size={15} color="#EA580C" style={styles.detailIcon} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={styles.detailLabel}>Venue Location</Text>
                    <Text style={styles.detailValueText}>
                      {day.location?.formattedAddress || day.location?.city || "Location pending"}
                    </Text>
                  </View>
                </View>

                {/* Coverage Requirements */}
                <View style={styles.detailRow}>
                  <Camera size={15} color="#EA580C" style={styles.detailIcon} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={styles.detailLabel}>Photography & Videography Crew</Text>
                    <Text style={styles.detailValueText}>{servicesText}</Text>
                  </View>
                </View>

                {/* Add-ons */}
                {addOnsText !== "None" ? (
                  <View style={styles.detailRow}>
                    <Sparkles size={15} color="#EA580C" style={styles.detailIcon} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={styles.detailLabel}>Day Add-ons</Text>
                      <Text style={styles.detailValueText}>{addOnsText}</Text>
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })}

          {/* Common Deliverables Card */}
          <Card>
            <View style={styles.eventCardHeader}>
              <View style={styles.eventCardTitleGroup}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Deliverables</Text>
                </View>
                <Text style={styles.eventCardTitle}>Post-Production & Handover</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {booking.deliverables?.video?.teaserCinematicEnabled ? (
              <View style={styles.detailRow}>
                <Clapperboard size={15} color="#EA580C" style={styles.detailIcon} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.detailLabel}>Teaser Highlight</Text>
                  <Text style={styles.detailValueText}>
                    Cinematic Teaser ({booking.deliverables.video?.teaserDurationMinutes || 1} min)
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <ImageLucide size={15} color="#EA580C" style={styles.detailIcon} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={styles.detailLabel}>Photo Deliverables</Text>
                <Text style={styles.detailValueText}>
                  {booking.deliverables?.photo?.editedPhotosOption === "custom"
                    ? `${booking.deliverables.photo.editedPhotosCustomCount ?? 0} edited photos`
                    : `${booking.deliverables?.photo?.editedPhotosOption || 200} edited photos`}
                  {booking.deliverables?.photo?.album
                    ? ` · Printed Album (${booking.deliverables.photo.albumPagesOption === "custom" ? booking.deliverables.photo.albumPagesCustomCount : booking.deliverables.photo.albumPagesOption || 20} pages)`
                    : ""}
                  {booking.deliverables?.photo?.rawPhotos ? " · All raw files" : ""}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Video size={15} color="#EA580C" style={styles.detailIcon} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={styles.detailLabel}>Video Deliverables</Text>
                <Text style={styles.detailValueText}>
                  {booking.deliverables?.video?.editedTraditionalVideoCount || 1} traditional film(s) · {booking.deliverables?.video?.editedCinematicVideoCount || 1} cinematic story
                  {booking.deliverables?.video?.rawVideo ? " · All raw video footage" : ""}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Clock size={15} color="#EA580C" style={styles.detailIcon} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={styles.detailLabel}>Target Delivery Date</Text>
                <Text style={styles.detailValueText}>
                  {formatDateLong(booking.expectedDeliveryDate || defaultExpectedDeliveryDate(booking.days))}
                </Text>
              </View>
            </View>
          </Card>

          {/* Package Tier & Estimate Card */}
          <Card>
            <View style={styles.eventCardHeader}>
              <View style={styles.eventCardTitleGroup}>
                <View style={[styles.dayBadge, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={[styles.dayBadgeText, { color: "#D97706" }]}>Package</Text>
                </View>
                <Text style={styles.eventCardTitle}>
                  {effectiveQuoted?.label || packageLabel}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Muted style={{ fontWeight: "700" }}>Approved Estimate Range</Muted>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#EA580C" }}>
                {effectiveQuoted && effectiveQuoted.maxPrice > 0
                  ? formatInrRange(effectiveQuoted.minPrice, effectiveQuoted.maxPrice)
                  : booking.budget
                    ? formatInr(booking.budget)
                    : "Standard Tier"}
              </Text>
            </View>
            <Muted style={{ fontSize: 11.5, marginTop: 4 }}>
              Customer-approved milestone budget covering {booking.days.length} event day{booking.days.length > 1 ? "s" : ""} & selected post-production deliverables.
            </Muted>
          </Card>
        </View>

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

      <FirmDetailModal
        visible={selectedFirmModal !== null}
        firm={selectedFirmModal}
        booking={booking}
        onClose={() => setSelectedFirmModal(null)}
        onViewProfile={(f) => {
          setSelectedFirmModal(null);
          const vid = f.provider_id || f.id;
          if (vid) {
            router.push({
              pathname: "/booking/vendor/[vendorId]",
              params: {
                vendorId: vid,
                name: f.name,
                city: f.city,
                rating: String(f.rating || 4.8),
                image: f.profile_image || "",
              },
            });
          }
        }}
        onConfirmFirm={(f) => {
          setSelectedFirmModal(null);
          setFirmToConfirm(f);
        }}
        confirmLoading={busy && confirmingFirmId === selectedFirmModal?.provider_id}
        onChat={(f) => {
          const pid = f.provider_id || f.id;
          if (!pid) {
            router.push("/(tabs)/messages");
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
  eventDayCard: {
    gap: 10,
    backgroundColor: colors.white,
  },
  eventCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  eventCardTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  eventCardTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  dayBadge: {
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dayBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  detailIcon: {
    marginTop: 3,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValueText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 1,
  },
  detailSubValueText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
});

