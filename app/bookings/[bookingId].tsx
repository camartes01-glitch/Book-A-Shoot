import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Calendar, Camera, CheckCircle2, ChevronLeft, Clock, MapPin, ShieldCheck, Sparkles, XCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, Card, Muted, ScreenTitle, SectionTitle } from "@/src/components/ui";
import { CandidateFirmCard } from "@/src/components/CandidateFirmCard";
import { FirmDetailModal } from "@/src/components/FirmDetailModal";
import * as bookingApi from "@/src/services/bookingApi";
import * as paymentApi from "@/src/services/paymentApi";
import type { AssignedPhotographer, Booking, EventDay, PackageTierId } from "@/src/types/booking";
import { STATUS_LABEL, STATUS_TONE } from "@/src/domain/statusLabels";
import { selectedAddOnLabels, selectedCoreServiceLabels } from "@/src/domain/dayServices";
import { DEFAULT_EVENT_CATEGORIES, eventTypeLabels } from "@/src/constants/eventCategories";
import { canSearchAgain, getBookingEventTitle, getEffectiveBookingStatus, isCompletedBooking, isCancelledBooking, isDraftBooking } from "@/src/domain/bookingFilters";
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
import { resolveProviderSearchTarget } from "@/src/domain/cityResolution";
import { reelsDeliverableLine, reelsPackageLabel } from "@/src/domain/reelsRequest";
import { normalizeReelsPlan, reelsContentLabel } from "@/src/constants/reels";

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

  const load = useCallback(async (syncList = true) => {
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

      // 3. Keep bookings list in sync non-blockingly (not on every status poll)
      if (syncList) void refreshBookings();
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
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void load(false);
    }, 8000);
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

  const handleBackToBookings = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    } else {
      router.navigate("/(tabs)/bookings");
    }
  };

  if (missing && !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right", "bottom"]}>
        <DetailHeader title="Booking details" onBack={handleBackToBookings} />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Muted>This booking was not found on this device.</Muted>
          <Button label="Back to bookings" onPress={handleBackToBookings} />
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
  const isDraft = isDraftBooking(booking) || isLocalWizardBooking(booking);
  const isCancelled = isCancelledBooking(booking);
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

  const bookingCity =
    booking.providerLocationPreference?.city ||
    booking.days?.[0]?.location?.city ||
    "the city";
  const isConfirmed =
    booking.status === "CONFIRMED" || booking.status === "CUSTOMER_CONFIRMED";
  const hasAnyAccepted =
    assignedFirms.some((f) => f.has_accepted || f.is_confirmed) ||
    booking.status === "VENDOR_ACCEPTED" ||
    isConfirmed;

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
    const providerId = firm.provider_id || firm.id;
    const currentBooking = booking;

    // 1. Immediately dismiss modal so user doesn't wait
    setFirmToConfirm(null);
    setSelectedFirmModal(null);
    setError(null);

    // 2. Immediately reflect confirmed state in the current screen (0ms)
    if (currentBooking) {
      const sourceFirms =
        currentBooking.assigned_photographers && currentBooking.assigned_photographers.length > 0
          ? currentBooking.assigned_photographers
          : assignedFirms;

      const updatedPhotographers = sourceFirms.map((f) => {
        const isThis = f.provider_id === providerId || f.id === providerId;
        return {
          ...f,
          is_confirmed: isThis,
          can_confirm: false,
          has_accepted: isThis ? true : f.has_accepted,
          contact_unlocked: isThis ? true : f.contact_unlocked,
        };
      });

      const selectedFirm =
        sourceFirms.find((f) => f.provider_id === providerId || f.id === providerId) || firm;

      const optimisticBooking: Booking = {
        ...currentBooking,
        status: "CONFIRMED",
        remoteStatus: "confirmed",
        confirmed_provider_id: providerId,
        selectedVendorId: providerId,
        assigned_photographers: updatedPhotographers,
        contactMasked: false,
        acceptedVendorContact: {
          phone: selectedFirm.contact_phone || firm.contact_phone,
          email: selectedFirm.contact_email || firm.contact_email,
          studioName: selectedFirm.name || firm.name,
        },
        firms_status_message: "Photography partner confirmed",
        updatedAt: new Date().toISOString(),
      };

      setBooking(optimisticBooking);
    }

    // 3. Confirm with the server; announce success only once it is real
    try {
      const targetId = currentBooking?.bookingId || bookingId;
      const updated = await confirmPhotographer(targetId, providerId);
      if (updated) {
        setBooking(updated);
      }
      Alert.alert(
        "Photography Partner Confirmed!",
        `${firm.name} is now locked as your official photography partner.`,
      );
    } catch (err: any) {
      if (currentBooking) setBooking(currentBooking); // roll back the optimistic view
      const msg = err?.message || "Failed to confirm photography partner.";
      setError(msg);
      Alert.alert("Couldn't confirm partner", msg);
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

  const dispatchCity = resolveProviderSearchTarget(booking).city || bookingCity;
  const sortedDays = [...booking.days].sort((a, b) => a.order - b.order);
  const firstDay = sortedDays[0];
  const extraDays = sortedDays.length - 1;
  const effectiveStatus = getEffectiveBookingStatus(booking);
  const estimateText = booking.reels
    ? formatInrRange(booking.reels.quoteMin, booking.reels.quoteMax)
    : effectiveQuoted && effectiveQuoted.maxPrice > 0
      ? formatInrRange(effectiveQuoted.minPrice, effectiveQuoted.maxPrice)
      : booking.budget
        ? formatInr(booking.budget)
        : null;
  const deliveryDate = booking.reels ? null : booking.expectedDeliveryDate || defaultExpectedDeliveryDate(booking.days);
  if (booking.reels) {
    // Reels requests: show the reel requirements instead of event deliverables.
    deliverablesSummary.splice(
      0,
      deliverablesSummary.length,
      reelsDeliverableLine(booking.reels),
      reelsContentLabel(booking.reels.contentType),
      ...(normalizeReelsPlan(booking.reels.plan) === "monthly" ? [] : [`${booking.reels.durationHours} hr shoot`]),
      "DSLR camera + gimbal",
    );
  }
  const awaiting = !hasAnyAccepted && !isCancelled && !TERMINAL_ALTERNATE.has(booking.status) && !isDraft;
  const firmCountLabel = assignedFirms.length > 0 ? `${assignedFirms.length} firm${assignedFirms.length === 1 ? "" : "s"}` : "top firms";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right", "bottom"]}>
      <DetailHeader title="Booking details" onBack={handleBackToBookings} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ── Summary ─────────────────────────────────────────── */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {getBookingEventTitle(booking)}
            </Text>
            <Badge label={STATUS_LABEL[effectiveStatus]} tone={STATUS_TONE[effectiveStatus]} />
          </View>
          <View style={styles.factsGrid}>
            <Fact
              icon={<Calendar size={14} color={colors.primaryDark} />}
              label="Date"
              value={
                firstDay?.eventDate
                  ? `${formatDateLong(firstDay.eventDate)}${extraDays > 0 ? ` +${extraDays} day${extraDays > 1 ? "s" : ""}` : ""}`
                  : "Date pending"
              }
            />
            <Fact icon={<MapPin size={14} color={colors.primaryDark} />} label="City" value={firstDay?.location?.city || "—"} />
            <Fact icon={<Sparkles size={14} color={colors.primaryDark} />} label="Package" value={booking.reels ? `CamReels · ${reelsPackageLabel(booking.reels)}` : effectiveQuoted?.label || packageLabel} />
            {estimateText ? (
              <Fact icon={<ShieldCheck size={14} color={colors.primaryDark} />} label="Estimate" value={estimateText} />
            ) : null}
          </View>
          <Text style={styles.bookingId} selectable>
            Booking ID · {displayId}
          </Text>
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Status ──────────────────────────────────────────── */}
        {TERMINAL_ALTERNATE.has(booking.status) ? (
          <StatusBanner
            tone="danger"
            icon={<XCircle size={18} color={colors.danger} />}
            title={STATUS_LABEL[effectiveStatus]}
            body={booking.firms_status_message || "This booking is no longer active."}
          />
        ) : awaiting ? (
          <StatusBanner
            tone="info"
            icon={
              <View style={styles.radarPingWrap}>
                <View style={styles.radarPingRing} />
                <View style={styles.radarPingDot} />
              </View>
            }
            title={`Request sent to ${firmCountLabel} in ${dispatchCity}`}
            body="We'll notify you the moment a studio accepts. Studio names and contacts unlock after acceptance."
          />
        ) : hasAnyAccepted && !isConfirmed ? (
          <StatusBanner
            tone="success"
            icon={<CheckCircle2 size={18} color={colors.success} />}
            title="A studio accepted your request"
            body="Review their profile below and confirm to lock in your booking."
          />
        ) : null}

        {/* ── Photography firms ───────────────────────────────── */}
        {assignedFirms.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Photography firms</Text>
              <Text style={styles.sectionMeta}>Pull down to refresh</Text>
            </View>
            <View style={{ gap: 8 }}>
              {assignedFirms.map((firm, index) => (
                <CandidateFirmCard
                  key={firm.provider_id || firm.id}
                  firm={firm}
                  index={index}
                  bookingCreatedAt={booking?.createdAt}
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
                      Alert.alert("Request pending", "Chat unlocks as soon as this studio accepts your request.", [{ text: "Got it" }]);
                      return;
                    }
                    router.push({
                      pathname: "/chat/[userId]",
                      params: { userId: pid, name: f.name, picture: f.profile_image || "", phone: f.contact_phone || "", accepted: "true" },
                    });
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {booking.status === "CUSTOMER_CONFIRMED" || booking.status === "PAYMENT_PENDING" ? (
          <Card style={{ gap: 8 }}>
            <Text style={styles.sectionHeading}>Payment</Text>
            <Text style={styles.bodyText}>Complete payment to finalise your booking.</Text>
            {booking.estimatedAmount ? <Text style={styles.valueStrong}>Payable: {formatInr(booking.estimatedAmount)}</Text> : null}
            <Button label={busy ? "Processing payment…" : "Pay with Razorpay"} onPress={handleInitiatePayment} disabled={busy} loading={busy} />
          </Card>
        ) : null}

        {/* ── Event days ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{sortedDays.length > 1 ? `Event days (${sortedDays.length})` : "Event details"}</Text>
          {sortedDays.map((day) => {
            const minutes = day?.startTime && day?.endTime ? durationMinutes(day.startTime, day.endTime, day.overnight) : null;
            const addOnsText = getDayAddOnsText(day);
            const timing = [
              day.startTime && day.endTime ? `${formatTime12h(day.startTime)} – ${formatTime12h(day.endTime)}` : null,
              day.overnight ? "ends next day" : null,
              minutes != null ? formatDuration(minutes) : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Card key={day.dayId} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  {sortedDays.length > 1 ? (
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>Day {day.order}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.dayTitle} numberOfLines={2}>
                    {getDayEventTitle(day)}
                  </Text>
                </View>
                <InfoRow
                  icon={<Clock size={15} color={colors.muted} />}
                  label="When"
                  value={day.eventDate ? formatDateLong(day.eventDate) : "Date pending"}
                  sub={timing}
                />
                <InfoRow
                  icon={<MapPin size={15} color={colors.muted} />}
                  label="Venue"
                  value={day.location?.formattedAddress || day.location?.city || "Location pending"}
                />
                <InfoRow icon={<Camera size={15} color={colors.muted} />} label="Crew" value={getDayServicesText(day)} />
                {addOnsText !== "None" ? (
                  <InfoRow icon={<Sparkles size={15} color={colors.muted} />} label="Add-ons" value={addOnsText} />
                ) : null}
              </Card>
            );
          })}
        </View>

        {/* ── Deliverables ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Deliverables</Text>
          <Card style={styles.dayCard}>
            {deliverablesSummary.length ? (
              <View style={styles.chips}>
                {deliverablesSummary.map((item) => (
                  <View key={item} style={styles.chip}>
                    <Text style={styles.chipText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.bodyText}>Edited photos and videos as agreed with your studio.</Text>
            )}
            {deliveryDate ? (
              <InfoRow icon={<Clock size={15} color={colors.muted} />} label="Target delivery" value={formatDateLong(deliveryDate)} />
            ) : null}
          </Card>
        </View>

        {/* ── Actions ─────────────────────────────────────────── */}
        {!isCompletedBooking(booking) ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            {canSearchAgain(booking) ? (
              <Button
                label="Search again"
                variant="primary"
                onPress={async () => {
                  setBusy(true);
                  try {
                    const next = await searchAgainBooking(booking);
                    if (isLocalWizardBooking(next) && next.reels) {
                      // Reels have no event wizard: resend straight to fresh videographers.
                      await bookingApi.getVendorMatches(next.bookingId);
                      const sent = await bookingApi.submitVendorRequest(next.bookingId);
                      router.replace(`/bookings/${sent.bookingId}`);
                    } else if (isLocalWizardBooking(next)) {
                      router.push("/booking/confirm");
                    } else {
                      setBooking(next);
                      Alert.alert(
                        "We're searching again",
                        next.firms_status_message ||
                          "Your request is back with photographers for the next 24 hours. We'll let you know as they accept.",
                      );
                    }
                  } catch (e) {
                    Alert.alert("Search again", e instanceof Error ? e.message : "Could not prepare booking for retry.");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                loading={busy}
              />
            ) : null}

            {isDraft ? (
              <Button
                label="Continue booking"
                variant="primary"
                onPress={async () => {
                  try {
                    const loaded = await loadDraft(booking.bookingId);
                    router.push(getDraftResumeRoute(loaded ?? booking) as any);
                  } catch (e) {
                    Alert.alert("Continue booking", e instanceof Error ? e.message : "Could not load booking.");
                  }
                }}
                disabled={busy}
              />
            ) : null}

            {isDraft || isCancelled ? (
              <Button
                label={isDraft ? "Delete draft" : "Delete request"}
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
        title={isDraft ? "Delete draft booking?" : "Delete cancelled request?"}
        message={
          isDraft
            ? "This will remove the draft booking and all of its event days. This action cannot be undone."
            : "This will remove the cancelled shoot request from your bookings. This action cannot be undone."
        }
        confirmLabel={isDraft ? "Delete draft" : "Delete request"}
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={busy}
        onConfirm={async () => {
          if (confirmMode === "delete") {
            setConfirmMode(null);
            setBusy(true);
            try {
              await deleteBooking(booking.bookingId);
              handleBackToBookings();
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

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerBack} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
        <ChevronLeft size={22} color={colors.ink} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerBack} />
    </View>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factLabelRow}>
        {icon}
        <Text style={styles.factLabel}>{label}</Text>
      </View>
      <Text style={styles.factValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function InfoRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
        {sub ? <Text style={styles.infoSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const BANNER_TONES = {
  info: { bg: "#FFF7ED", border: "#FED7AA" },
  success: { bg: colors.successBg, border: "#A7F3D0" },
  danger: { bg: colors.dangerBg, border: "#FECACA" },
} as const;

function StatusBanner({
  tone,
  icon,
  title,
  body,
}: {
  tone: keyof typeof BANNER_TONES;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const t = BANNER_TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]} accessibilityRole="summary">
      <View style={styles.bannerIcon}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerBack: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: colors.ink },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  summaryCard: { gap: 14 },
  summaryTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  summaryTitle: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.ink, lineHeight: 26 },
  factsGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  fact: { width: "50%", paddingRight: 8, gap: 3 },
  factLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  factLabel: { fontSize: 11.5, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  factValue: { fontSize: 14, fontWeight: "700", color: colors.ink, lineHeight: 19 },
  bookingId: { fontSize: 11.5, color: colors.muted },
  errorBox: { padding: spacing.md, borderRadius: radius, borderWidth: 1, borderColor: "#FECACA", backgroundColor: colors.dangerBg },
  errorText: { fontSize: 13, color: colors.danger, fontWeight: "600", lineHeight: 18 },
  banner: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: spacing.md, borderRadius: radius, borderWidth: 1 },
  bannerIcon: { width: 24, alignItems: "center", paddingTop: 1 },
  bannerTitle: { fontSize: 14.5, fontWeight: "800", color: colors.ink, lineHeight: 20 },
  bannerBody: { fontSize: 13, color: "#4B5563", lineHeight: 18 },
  section: { gap: 10 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  sectionHeading: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sectionMeta: { fontSize: 12, color: colors.muted },
  bodyText: { fontSize: 13.5, color: "#4B5563", lineHeight: 19 },
  valueStrong: { fontSize: 15, fontWeight: "800", color: colors.ink },
  dayCard: { gap: 12 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayTitle: { flex: 1, fontSize: 15.5, fontWeight: "800", color: colors.ink },
  dayBadge: { backgroundColor: colors.peach, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99 },
  dayBadgeText: { fontSize: 11.5, fontWeight: "800", color: colors.primaryDark },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoIcon: { width: 20, alignItems: "center", paddingTop: 2 },
  infoLabel: { fontSize: 11.5, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  infoValue: { fontSize: 14, fontWeight: "600", color: colors.ink, lineHeight: 20, marginTop: 1 },
  infoSub: { fontSize: 12.5, color: colors.muted, lineHeight: 17, marginTop: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.peachBorder,
  },
  chipText: { fontSize: 12.5, fontWeight: "700", color: colors.ink },
  radarPingWrap: { width: 22, height: 22, justifyContent: "center", alignItems: "center" },
  radarPingRing: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(234, 88, 12, 0.15)",
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
  },
  radarPingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryDark },
});
