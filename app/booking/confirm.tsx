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
  const [isSearching, setIsSearching] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    bookingId: string;
    city?: string;
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

  if (!activeDraft) return null;

  const matches = activeDraft?.matches ?? [];
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

  const onSubmit = () => {
    if (!profile) {
      router.push({ pathname: "/(auth)/login", params: { returnTo: "/booking/confirm" } });
      return;
    }
    // 1. Immediately launch rotating sentences modal with 0ms delay — no button spinner!
    setIsSearching(true);
    setSubmissionError(null);
    setError(null);

    const queryCity = activeDraft.providerLocationPreference?.city || firstDay?.location?.city || "Hyderabad";

    // 2. Run background search & dispatch concurrently
    (async () => {
      try {
        const submitted = await submitVendorRequest();
        setSuccessData({
          bookingId: submitted.bookingId,
          city: queryCity,
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
          setIsSearching(false);
          Alert.alert("Sign in required", message, [
            {
              text: "Sign in",
              onPress: () => router.push({ pathname: "/(auth)/login", params: { returnTo: "/booking/confirm", reauth: "1" } }),
            },
          ]);
        } else if (
          message.toLowerCase().includes("no photography firms with active balance") ||
          message.toLowerCase().includes("no suitable firms with active balance")
        ) {
          const cleanMsg = "No photography firms with active balance and availability found in your area right now. Please check back shortly.";
          setSubmissionError(cleanMsg);
        } else {
          setSubmissionError(message);
        }
      }
    })();
  };

  return (
    <WizardScreen
      title="Review your booking"
      step="review"
      onBack={() => router.push("/booking/location-preference")}
      footer={<Button label="Send booking request" onPress={onSubmit} flex={1} />}
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

        {/* Album Delivery Date - only needed and shown if album is selected */}
        {activeDraft.deliverables.photo.album ? (
          <View style={styles.detailRow}>
            <Clock size={15} color="#EA580C" style={styles.detailIcon} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={styles.detailLabel}>Album Delivery Date</Text>
              <Text style={styles.detailValueText}>
                {activeDraft.expectedDeliveryDate ? formatDateLong(activeDraft.expectedDeliveryDate) : "Album date pending"}
              </Text>
            </View>
          </View>
        ) : null}
      </Card>

      {/* Budget Card */}
      <Card>
        <SectionHead title="Budget" onEdit={() => router.push("/booking/budget?mode=edit")} />
        <Muted style={{ fontWeight: "700", color: colors.ink }}>{activeDraft.budget ? formatInr(activeDraft.budget) : "Not set"}</Muted>
        <Muted>Approximate overall budget</Muted>
      </Card>

      {/* Approved Package Card */}
      <Card>
        <SectionHead title="Approved Package Range" onEdit={() => router.push("/booking/packages?mode=edit")} />
        <Muted style={{ fontWeight: "700", color: colors.ink, flexShrink: 1 }}>
          {pkg ? formatPackageOverallLabel(pkg.label, pkg.minPrice, pkg.maxPrice) : (activeDraft.selectedPackage ?? "—")}
        </Muted>
        {pkg && pkg.maxPrice > 0 ? (
          <Muted style={{ fontSize: 20, fontWeight: "700", color: colors.primaryDark, flexShrink: 1 }}>
            {formatInrRange(pkg.minPrice, pkg.maxPrice)}
          </Muted>
        ) : null}
        <Muted>Approved range for your selected multi-event services. Not a provider quote.</Muted>
      </Card>

      {/* Top 6 Studio Dispatch Assurance Card */}
      <Card>
        <SectionHead
          title="Top 6 Studio Dispatch"
          onEdit={() => router.push("/booking/location-preference?mode=edit")}
        />

        <View style={styles.dispatchHeader}>
          <View style={styles.dispatchTitleRow}>
            <ShieldCheck size={16} color="#EA580C" />
            <Text style={styles.dispatchTitle}>Automated Dispatch to Top 6 Studios</Text>
          </View>
          <View style={styles.locationPill}>
            <MapPin size={11} color="#64748B" />
            <Text style={styles.locationPillText}>
              {activeDraft.providerLocationPreference?.city || firstDay?.location?.city || "Hyderabad"}
            </Text>
          </View>
        </View>

        <Text style={styles.dispatchDescription}>
          Your shoot specifications will be dispatched automatically to the top 6 verified photography firms in this city. Studio identities, portfolios, and direct contacts are unlocked as soon as a firm accepts your request.
        </Text>

        <View style={styles.dispatchAssuranceList}>
          <View style={styles.assuranceItem}>
            <View style={styles.assuranceIconCircle}>
              <Camera size={14} color="#EA580C" />
            </View>
            <View style={styles.assuranceTextCol}>
              <Text style={styles.assuranceHeading}>Verified Equipment & Crew</Text>
              <Text style={styles.assuranceSub}>
                Only studios with multi-camera setups, prime lenses, and insured crew are assigned.
              </Text>
            </View>
          </View>

          <View style={styles.assuranceItem}>
            <View style={styles.assuranceIconCircle}>
              <Lock size={14} color="#EA580C" />
            </View>
            <View style={styles.assuranceTextCol}>
              <Text style={styles.assuranceHeading}>Privacy-First Studio Matching</Text>
              <Text style={styles.assuranceSub}>
                Studio names, portfolios, direct phone, and chat unlock instantly as soon as a firm accepts your request.
              </Text>
            </View>
          </View>

          <View style={styles.assuranceItem}>
            <View style={styles.assuranceIconCircle}>
              <Clock size={14} color="#EA580C" />
            </View>
            <View style={styles.assuranceTextCol}>
              <Text style={styles.assuranceHeading}>Instant Notifications</Text>
              <Text style={styles.assuranceSub}>
                Real-time alerts notify you the moment a verified photographer reviews and accepts.
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <BookingSuccessModal
        visible={isSearching || !!successData}
        bookingId={successData?.bookingId}
        submissionError={submissionError}
        city={successData?.city || activeDraft.providerLocationPreference?.city || firstDay?.location?.city || "Hyderabad"}
        statusMessage={successData?.statusMessage}
        eventName={overallEventLabel || "Photography Booking"}
        dateLabel={firstDay?.eventDate ? formatDateLong(firstDay.eventDate) : undefined}
        onDismissError={() => {
          setIsSearching(false);
          setSubmissionError(null);
        }}
        onComplete={(targetId) => {
          const finalId = targetId || successData?.bookingId;
          clearActiveDraft();
          setIsSearching(false);
          setSuccessData(null);
          if (finalId) {
            router.replace(`/bookings/${finalId}`);
          } else {
            router.replace("/(tabs)/bookings");
          }
        }}
      />
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
    fontWeight: "700",
    color: "#EA580C",
  },
  eventCardTitle: {
    fontSize: 15,
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  dispatchTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  dispatchTitle: {
    fontSize: 14,
    fontWeight: "700",
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
  dispatchDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18.5,
    marginVertical: 4,
  },
  dispatchAssuranceList: {
    gap: 8,
    marginTop: 8,
  },
  assuranceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF7ED",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  assuranceIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginTop: 1,
  },
  assuranceTextCol: {
    flex: 1,
    gap: 2,
  },
  assuranceHeading: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  assuranceSub: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
  },
});
