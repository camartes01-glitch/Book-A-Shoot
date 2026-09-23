import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { Calendar, Camera, ChevronRight, Clapperboard, Clock, Image as ImageLucide, Lock, MapPin, Pencil, ShieldCheck, Sparkles, Star, Video } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Muted, SectionTitle } from "@/src/components/ui";
import { BookingSuccessModal } from "@/src/components/BookingSuccessModal";
import { useAppStore } from "@/src/state/AppProvider";
import { selectedPackageQuote } from "@/src/engine/pricing";
import { formatDateLong, formatInr, formatInrRange, formatPackageOverallLabel, formatTime12h } from "@/src/utils/format";
import { durationMinutes, formatDuration } from "@/src/utils/dateTime";
import { colors } from "@/src/constants/theme";
import { DEFAULT_EVENT_CATEGORIES } from "@/src/constants/eventCategories";
import { CamartesApiError } from "@/src/services/camartesClient";
import { detectDayOvertime, getBookingPricingModel } from "@/src/config/approvedBudget";
import type { EventDay } from "@/src/types/booking";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PF"
  );
}

function SectionHead({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <View style={styles.sectionHeadRow}>
      <SectionTitle>{title}</SectionTitle>
      <Pressable onPress={onEdit} hitSlop={8} style={styles.singleEditBtn} accessibilityRole="button" accessibilityLabel={`Edit ${title}`}>
        <Pencil size={13} color="#EA580C" />
        <Text style={styles.singleEditText}>Edit</Text>
      </Pressable>
    </View>
  );
}

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

export default function ConfirmBookingScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 640;

  const { activeDraft, loadVendorMatches, submitVendorRequest, clearActiveDraft, profile } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    bookingId: string;
    statusMessage?: string | null;
    eventName?: string;
    dateLabel?: string;
  } | null>(null);

  useEffect(() => {
    if (activeDraft && (!activeDraft.matches || activeDraft.matches.length === 0)) {
      setFetchingMatches(true);
      void loadVendorMatches().finally(() => setFetchingMatches(false));
    }
  }, [activeDraft?.bookingId, activeDraft?.matches?.length]);

  const matches = activeDraft?.matches ?? [];
  const primaryVendorId = activeDraft?.selectedVendorId || matches[0]?.vendorId;

  if (!activeDraft) return null;

  if (!primaryVendorId && matches.length === 0) {
    if (fetchingMatches) {
      return (
        <WizardScreen title="Review your booking" step="review">
          <Muted>Matching verified photography partners for your updated details…</Muted>
        </WizardScreen>
      );
    }
    return (
      <WizardScreen title="Review your booking" step="review">
        <Muted>Match providers before sending a booking request.</Muted>
        <Button label="Find providers" onPress={() => router.replace("/booking/matches")} />
      </WizardScreen>
    );
  }
  const match = matches.find((m) => m.vendorId === primaryVendorId) || matches[0];
  const displayMatches = matches.length > 0 ? matches : (match ? [match] : []);
  const pkg = selectedPackageQuote(activeDraft);
  const days = [...(activeDraft.days || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const firstDay = days[0];

  const overallEventLabel = days
    .flatMap((day) => day.eventTypeIds.map((id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)?.label ?? id))
    .filter(Boolean)
    .join(" · ");

  const model = getBookingPricingModel(days);
  const teaserTitle =
    model === "wedding"
      ? "Wedding Teaser Cinematic Editing"
      : model === "outdoor"
        ? "Outdoor Shoot Teaser Cinematic Editing"
        : "Teaser Cinematic Editing";
  const teaserEnabled = activeDraft.deliverables.video?.teaserCinematicEnabled;
  const teaserMins = activeDraft.deliverables.video?.teaserDurationMinutes ?? 1;

  const onSubmit = async () => {
    if (!profile) {
      router.push({ pathname: "/(auth)/login", params: { returnTo: "/booking/confirm" } });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const submitted = await submitVendorRequest();
      setSuccessData({
        bookingId: submitted.bookingId,
        statusMessage:
          submitted.firms_status_message ||
          "Dispatched to verified photography partners. You will be notified as partners accept.",
        eventName: overallEventLabel || "Photography Booking",
        dateLabel: firstDay?.eventDate ? formatDateLong(firstDay.eventDate) : undefined,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not send the booking request.";
      setError(message);
      if (e instanceof CamartesApiError && e.status === 401 && !profile) {
        Alert.alert("Sign in required", message, [{ text: "Sign in", onPress: () => router.push({ pathname: "/(auth)/login", params: { returnTo: "/booking/confirm", reauth: "1" } }) }]);
      } else if (
        message.toLowerCase().includes("no photography firms with active balance") ||
        message.toLowerCase().includes("no suitable firms with active balance")
      ) {
        const cleanMsg = "No photography firms with active balance and availability found in your area right now. Please check back shortly.";
        setError(cleanMsg);
        Alert.alert("No Available Firms", cleanMsg);
      } else {
        Alert.alert("Request not sent", message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardScreen
      title="Review your booking"
      step="review"
      onBack={() => router.push("/booking/matches")}
      footer={<Button label="Send booking request" onPress={onSubmit} loading={loading} flex={1} />}
    >
      <SectionTitle>You're almost booked</SectionTitle>
      {profile ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 }}>
          <ShieldCheck size={16} color={colors.primary} />
          <Muted style={{ color: colors.ink, fontWeight: "600" }}>
            Signed in as {profile.name} ({profile.mobile ? `+91 ${profile.mobile}` : profile.email})
          </Muted>
        </View>
      ) : null}
      {error ? (
        <View style={{ gap: 8, marginVertical: 8 }}>
          <Muted style={{ color: colors.danger, fontWeight: "700" }}>{error}</Muted>
          {!profile ? (
            <Button
              label="Sign In or Register"
              variant="outline"
              onPress={() => router.push({ pathname: "/(auth)/login", params: { returnTo: "/booking/confirm", reauth: "1" } })}
            />
          ) : null}
        </View>
      ) : null}
      <Muted>Sending this request dispatches your shoot to verified photography partners. It is not confirmed until a partner accepts and confirms.</Muted>

      {/* Individual Per-Event Cards Container (Left/Right on Desktop, Stacked on Mobile) */}
      <View style={isDesktop ? styles.desktopGrid : styles.mobileGrid}>
        {days.map((day) => {
          const minutes =
            day?.startTime && day?.endTime ? durationMinutes(day.startTime, day.endTime, day.overnight) : null;
          const overtime = day?.startTime && day?.endTime ? detectDayOvertime(day, durationMinutes) : { isExtended: false, note: null };
          const eventTitle = getDayEventTitle(day);
          const servicesText = getDayServicesText(day);
          const addOnsText = getDayAddOnsText(day);

          return (
            <Card key={day.dayId} style={isDesktop ? styles.desktopCard : styles.mobileCard}>
              {/* Event Card Header */}
              <View style={styles.eventCardHeader}>
                <View style={styles.eventCardTitleGroup}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>Day {day.order}</Text>
                  </View>
                  <Text style={styles.eventCardTitle} numberOfLines={1}>
                    {eventTitle}
                  </Text>
                </View>
                <Pressable
                  style={styles.singleEditBtn}
                  onPress={() => router.push(`/booking/day/${day.dayId}?step=event&mode=edit`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit details for Day ${day.order} ${eventTitle}`}
                >
                  <Pencil size={13} color="#EA580C" />
                  <Text style={styles.singleEditText}>Edit</Text>
                </Pressable>
              </View>

              <View style={styles.divider} />

              {/* Date & Time */}
              <View style={styles.detailRow}>
                <Calendar size={15} color="#EA580C" style={styles.detailIcon} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValueText}>
                    {day.eventDate ? formatDateLong(day.eventDate) : "Date pending"}
                  </Text>
                  <Text style={styles.detailSubValueText}>
                    {day.startTime ? formatTime12h(day.startTime) : "--"} – {day.endTime ? formatTime12h(day.endTime) : "--"}
                    {day.overnight ? " · Ends next day" : ""}
                    {minutes != null ? ` · ${formatDuration(minutes)}` : ""}
                  </Text>
                  {overtime?.isExtended && overtime?.note ? (
                    <Text style={styles.overtimeText}>{overtime.note} (standard schedule is 8 hrs)</Text>
                  ) : null}
                </View>
              </View>

              {/* Location */}
              <View style={styles.detailRow}>
                <MapPin size={15} color="#EA580C" style={styles.detailIcon} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValueText}>
                    {day.location?.formattedAddress || day.location?.city || "Location pending"}
                  </Text>
                </View>
              </View>

              {/* Coverage & Services */}
              <View style={styles.detailRow}>
                <Camera size={15} color="#EA580C" style={styles.detailIcon} />
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.detailLabel}>Coverage & Services</Text>
                    <Pressable
                      onPress={() => router.push(`/booking/day/${day.dayId}?step=photography&mode=edit`)}
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#EA580C" }}>Edit</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.detailValueText}>{servicesText}</Text>
                </View>
              </View>

              {/* Add-ons */}
              <View style={styles.detailRow}>
                <Sparkles size={15} color="#EA580C" style={styles.detailIcon} />
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.detailLabel}>Event Add-ons</Text>
                    <Pressable
                      onPress={() => router.push(`/booking/day/${day.dayId}?step=addons&mode=edit`)}
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#EA580C" }}>Edit</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.detailValueText}>{addOnsText}</Text>
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      {/* Common Selections Displayed Separately AFTER the Event Cards */}

      {/* Deliverables Card */}
      <Card>
        <SectionHead title="Deliverables" onEdit={() => router.push("/booking/deliverables?mode=edit")} />

        <View style={styles.divider} />

        {/* Teaser Highlight */}
        {teaserEnabled ? (
          <View style={styles.detailRow}>
            <Clapperboard size={15} color="#EA580C" style={styles.detailIcon} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={styles.detailLabel}>Teaser Highlight</Text>
              <Text style={styles.detailValueText}>
                {teaserTitle} ({teaserMins} min{teaserMins > 1 ? "s" : ""})
              </Text>
            </View>
          </View>
        ) : null}

        {/* Photos Deliverables */}
        <View style={styles.detailRow}>
          <ImageLucide size={15} color="#EA580C" style={styles.detailIcon} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.detailLabel}>Photos</Text>
            <Text style={styles.detailValueText}>
              {activeDraft.deliverables.photo.editedPhotosOption === "custom"
                ? `${activeDraft.deliverables.photo.editedPhotosCustomCount ?? 0} edited photos`
                : `${activeDraft.deliverables.photo.editedPhotosOption} edited photos`}
              {activeDraft.deliverables.photo.album
                ? ` · Printed Album (${activeDraft.deliverables.photo.albumPagesOption === "custom" ? activeDraft.deliverables.photo.albumPagesCustomCount : activeDraft.deliverables.photo.albumPagesOption} pages)`
                : ""}
              {activeDraft.deliverables.photo.rawPhotos ? " · All raw files" : ""}
            </Text>
          </View>
        </View>

        {/* Videos Deliverables */}
        <View style={styles.detailRow}>
          <Video size={15} color="#EA580C" style={styles.detailIcon} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.detailLabel}>Videos</Text>
            <Text style={styles.detailValueText}>
              {activeDraft.deliverables.video.editedTraditionalVideoCount} traditional film{activeDraft.deliverables.video.editedTraditionalVideoCount !== 1 ? "s" : ""} · {activeDraft.deliverables.video.editedCinematicVideoCount} cinematic story{activeDraft.deliverables.video.editedCinematicVideoCount !== 1 ? "ies" : ""}
              {activeDraft.deliverables.video.rawVideo ? " · All raw footage" : ""}
            </Text>
          </View>
        </View>

        {/* Expected Delivery Date */}
        <View style={styles.detailRow}>
          <Clock size={15} color="#EA580C" style={styles.detailIcon} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.detailLabel}>Expected Delivery Date</Text>
            <Text style={styles.detailValueText}>
              {activeDraft.expectedDeliveryDate ? formatDateLong(activeDraft.expectedDeliveryDate) : "Delivery date pending"}
            </Text>
          </View>
        </View>
      </Card>

      {/* Budget Card */}
      <Card>
        <SectionHead title="Budget" onEdit={() => router.push("/booking/budget?mode=edit")} />
        <Muted style={{ fontWeight: "800", color: colors.ink }}>{activeDraft.budget ? formatInr(activeDraft.budget) : "Not set"}</Muted>
        <Muted>Approximate overall budget</Muted>
      </Card>

      {/* Approved Package Card */}
      <Card>
        <SectionHead title="Approved Package Range" onEdit={() => router.push("/booking/packages?mode=edit")} />
        <Muted style={{ fontWeight: "800", color: colors.ink, flexShrink: 1 }}>
          {pkg ? formatPackageOverallLabel(pkg.label, pkg.minPrice, pkg.maxPrice) : (activeDraft.selectedPackage ?? "—")}
        </Muted>
        {pkg && pkg.maxPrice > 0 ? (
          <Muted style={{ fontSize: 20, fontWeight: "800", color: colors.primaryDark, flexShrink: 1 }}>
            {formatInrRange(pkg.minPrice, pkg.maxPrice)}
          </Muted>
        ) : null}
        <Muted>Approved range for your selected multi-event services. Not a provider quote.</Muted>
      </Card>

      {/* Selected Photography Firms Preview Card */}
      <Card>
        <SectionHead
          title="Matched Photography Firms"
          onEdit={() => router.push("/booking/matches")}
        />

        <View style={styles.dispatchHeader}>
          <Text style={styles.dispatchTitle}>
            {displayMatches.length === 1
              ? "Dispatched to 1 Verified Studio"
              : `Dispatched to all ${displayMatches.length} Verified Studios`}
          </Text>
          <View style={styles.locationPill}>
            <MapPin size={11} color="#64748B" />
            <Text style={styles.locationPillText}>
              {activeDraft.providerLocationPreference?.city || firstDay?.location?.city || "Hyderabad"}
            </Text>
          </View>
        </View>

        {/* Short Preview of Each Selected Photography Firm */}
        <View style={styles.firmsList}>
          {displayMatches.map((m) => {
            const loc = [m.area, m.city].filter(Boolean).join(", ") || m.city || "Hyderabad";
            return (
              <Pressable
                key={m.vendorId}
                onPress={() => router.push(`/booking/vendor/${m.vendorId}`)}
                style={({ pressed }) => [
                  styles.firmPreviewCard,
                  pressed && styles.firmPreviewPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`View profile and details of ${m.studioName}`}
              >
                {/* Thumbnail / Avatar */}
                {m.imageUrl ? (
                  <Image
                    source={{ uri: m.imageUrl }}
                    style={styles.firmThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.firmAvatarFallback}>
                    <Text style={styles.firmAvatarText}>{initials(m.studioName)}</Text>
                  </View>
                )}

                {/* Firm Info */}
                <View style={styles.firmInfoCol}>
                  <View style={styles.firmNameRow}>
                    <Text style={styles.firmNameText} numberOfLines={1}>
                      {m.studioName}
                    </Text>
                    <View style={styles.kycBadge}>
                      <ShieldCheck size={11} color="#EA580C" strokeWidth={2.5} />
                      <Text style={styles.kycBadgeText}>KYC Verified</Text>
                    </View>
                  </View>

                  <View style={styles.firmSubRow}>
                    <View style={styles.ratingBadge}>
                      <Star size={11} color="#EA580C" fill="#EA580C" />
                      <Text style={styles.ratingValue}>
                        {m.rating ? m.rating.toFixed(1) : "4.8"}
                      </Text>
                      {m.completedBookings ? (
                        <Text style={styles.shootsCount}>({m.completedBookings} shoots)</Text>
                      ) : null}
                    </View>
                    <Text style={styles.subDot}>•</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {loc}
                    </Text>
                  </View>

                  <View style={styles.viewAboutLinkRow}>
                    <Text style={styles.viewAboutLinkText}>View Profile & About Details</Text>
                    <ChevronRight size={13} color="#EA580C" strokeWidth={2.5} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Mutual Contact Privacy Callout */}
        <View style={styles.privacyBox}>
          <View style={styles.privacyBoxHeader}>
            <Lock size={13} color="#C2410C" />
            <Text style={styles.privacyBoxTitle}>Mutual Contact Privacy</Text>
          </View>
          <Text style={styles.privacyBoxText}>
            Your contact details (phone & email) will NOT appear to studios until one accepts your request. Direct phone and WhatsApp contacts unlock immediately upon acceptance.
          </Text>
        </View>
      </Card>

      {successData ? (
        <BookingSuccessModal
          visible={!!successData}
          bookingId={successData.bookingId}
          statusMessage={successData.statusMessage}
          eventName={successData.eventName}
          dateLabel={successData.dateLabel}
          onComplete={() => {
            const targetId = successData.bookingId;
            clearActiveDraft();
            setSuccessData(null);
            router.replace(`/bookings/${targetId}`);
          }}
        />
      ) : null}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  sectionHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  desktopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 4,
  },
  mobileGrid: {
    flexDirection: "column",
    gap: 12,
    marginVertical: 4,
  },
  desktopCard: {
    flex: 1,
    minWidth: 280,
  },
  mobileCard: {
    width: "100%",
  },
  eventCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eventCardTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dayBadge: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dayBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  eventCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    flex: 1,
  },
  singleEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  singleEditText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EA580C",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  detailIcon: {
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValueText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 18,
  },
  detailSubValueText: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "500",
  },
  overtimeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    marginTop: 2,
  },
  dispatchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
    marginBottom: 8,
  },
  dispatchTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.ink,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  locationPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
  },
  firmsList: {
    gap: 8,
    marginVertical: 4,
  },
  firmPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  firmPreviewPressed: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    transform: [{ scale: 0.985 }],
  },
  firmThumbnail: {
    width: 62,
    height: 62,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  firmAvatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  firmAvatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#EA580C",
  },
  firmInfoCol: {
    flex: 1,
    gap: 3,
  },
  firmNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  firmNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  kycBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EA580C",
  },
  firmSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingValue: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  shootsCount: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  subDot: {
    fontSize: 11,
    color: "#CBD5E1",
  },
  locationText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "500",
    flex: 1,
  },
  viewAboutLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  viewAboutLinkText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  privacyBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
    gap: 3,
  },
  privacyBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  privacyBoxTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#C2410C",
  },
  privacyBoxText: {
    fontSize: 11.5,
    color: "#9A3412",
    lineHeight: 16,
  },
});
