import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Lock, Pencil, ShieldCheck } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Muted, SectionTitle } from "@/src/components/ui";
import { BookingSuccessModal } from "@/src/components/BookingSuccessModal";
import { useAppStore } from "@/src/state/AppProvider";
import { selectedPackageQuote } from "@/src/engine/pricing";
import { formatDateLong, formatInr, formatInrRange, formatPackageOverallLabel, formatTime12h } from "@/src/utils/format";
import { durationMinutes, formatDuration } from "@/src/utils/dateTime";
import { colors } from "@/src/constants/theme";
import { DEFAULT_EVENT_CATEGORIES } from "@/src/constants/eventCategories";
import { selectedAddOnLabels, selectedCoreServiceLabels } from "@/src/domain/dayServices";
import { CamartesApiError } from "@/src/services/camartesClient";

function EditLink({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${label}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Pencil size={14} color={colors.primaryDark} />
        <Muted style={{ color: colors.primaryDark, fontWeight: "800" }}>Edit</Muted>
      </View>
    </Pressable>
  );
}

function SectionHead({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <SectionTitle>{title}</SectionTitle>
      <EditLink onPress={onEdit} label={title} />
    </View>
  );
}

import { detectDayOvertime, getBookingPricingModel } from "@/src/config/approvedBudget";

export default function ConfirmBookingScreen() {
  const { activeDraft, submitVendorRequest, clearActiveDraft, profile } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    bookingId: string;
    statusMessage?: string | null;
    eventName?: string;
    dateLabel?: string;
  } | null>(null);

  const matches = activeDraft?.matches ?? [];
  const primaryVendorId = activeDraft?.selectedVendorId || matches[0]?.vendorId;

  if (!activeDraft || (!primaryVendorId && matches.length === 0)) {
    return (
      <WizardScreen title="Review your booking" step="review">
        <Muted>Match providers before sending a booking request.</Muted>
        <Button label="Find providers" onPress={() => router.replace("/booking/matches")} />
      </WizardScreen>
    );
  }
  const match = matches.find((m) => m.vendorId === primaryVendorId) || matches[0];
  const pkg = selectedPackageQuote(activeDraft);
  const days = [...activeDraft.days].sort((a, b) => a.order - b.order);
  const firstDay = days[0];
  const eventLabel = days
    .flatMap((day) => day.eventTypeIds.map((id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)?.label ?? id))
    .filter(Boolean)
    .join(" · ");
  const services = Array.from(new Set(days.flatMap((day) => selectedCoreServiceLabels(day))));
  const addOns = Array.from(new Set(days.flatMap((day) => selectedAddOnLabels(day))));

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
        eventName: eventLabel || "Photography Booking",
        dateLabel: firstDay?.eventDate ? formatDateLong(firstDay.eventDate) : undefined,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not send the booking request.";
      setError(message);
      if (e instanceof CamartesApiError && e.status === 401) {
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
          {error.toLowerCase().includes("sign in") ? (
            <Button
              label="Sign In or Register"
              variant="outline"
              onPress={() => router.push({ pathname: "/(auth)/login", params: { returnTo: "/booking/confirm", reauth: "1" } })}
            />
          ) : null}
        </View>
      ) : null}
      <Muted>Sending this request dispatches your shoot to verified photography partners. It is not confirmed until a partner accepts and confirms.</Muted>

      <Card>
        <SectionHead title="Event" onEdit={() => router.push(firstDay ? `/booking/day/${firstDay.dayId}?step=event` : "/booking/new")} />
        <Muted style={{ fontWeight: "800", color: colors.ink }}>{eventLabel || "Event"}</Muted>
        <Muted>
          {days.length} day{days.length === 1 ? "" : "s"} of coverage
        </Muted>
      </Card>

      <Card>
        <SectionHead title="Date and time" onEdit={() => router.push(firstDay ? `/booking/day/${firstDay.dayId}?step=event` : "/booking/new")} />
        {days.map((day) => {
          const minutes =
            day.startTime && day.endTime ? durationMinutes(day.startTime, day.endTime, day.overnight) : null;
          const overtime = detectDayOvertime(day, durationMinutes);
          return (
            <View key={day.dayId} style={{ gap: 2, marginBottom: 4 }}>
              <Muted style={{ fontWeight: "700", color: colors.ink }}>
                Day {day.order}: {formatDateLong(day.eventDate)} · {formatTime12h(day.startTime)} – {formatTime12h(day.endTime)}
                {day.overnight ? " · Ends the next day" : ""}
                {minutes != null ? ` · ${formatDuration(minutes)}` : ""}
              </Muted>
              {overtime.isExtended && overtime.note ? (
                <Muted style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 13 }}>
                  ⚠️ {overtime.note} (standard included schedule is 8 hours)
                </Muted>
              ) : null}
            </View>
          );
        })}
      </Card>

      <Card>
        <SectionHead title="Location" onEdit={() => router.push(firstDay ? `/booking/day/${firstDay.dayId}/location` : "/booking/new")} />
        {days.map((day) => (
          <Muted key={day.dayId} style={{ fontWeight: "700", color: colors.ink }}>
            Day {day.order}: {day.location.formattedAddress || day.location.city || "Location pending"}
          </Muted>
        ))}
      </Card>

      <Card>
        <SectionHead title="Services" onEdit={() => router.push(firstDay ? `/booking/day/${firstDay.dayId}?step=photography` : "/booking/new")} />
        <Muted style={{ fontWeight: "800", color: colors.ink }}>{services.join(" · ") || "Add coverage"}</Muted>
      </Card>

      <Card>
        <SectionHead title="Add-ons" onEdit={() => router.push(firstDay ? `/booking/day/${firstDay.dayId}?step=addons` : "/booking/new")} />
        <Muted style={{ fontWeight: "700", color: colors.ink }}>{addOns.length ? addOns.join(" · ") : "None"}</Muted>
      </Card>

      <Card>
        <SectionHead title="Deliverables" onEdit={() => router.push("/booking/deliverables")} />
        {teaserEnabled ? (
          <Muted style={{ fontWeight: "700", color: colors.primaryDark }}>
            🎬 {teaserTitle}: {teaserMins} min{teaserMins > 1 ? "s" : ""}
          </Muted>
        ) : null}
        <Muted>
          Photos: {activeDraft.deliverables.photo.editedPhotosOption === "custom" ? `${activeDraft.deliverables.photo.editedPhotosCustomCount ?? 0} edited` : `${activeDraft.deliverables.photo.editedPhotosOption} edited`}
          {activeDraft.deliverables.photo.album ? ` · Album (${activeDraft.deliverables.photo.albumPagesOption === "custom" ? activeDraft.deliverables.photo.albumPagesCustomCount : activeDraft.deliverables.photo.albumPagesOption} pages)` : ""}
          {activeDraft.deliverables.photo.rawPhotos ? " · Raw files" : ""}
        </Muted>
        <Muted>
          Videos: {activeDraft.deliverables.video.editedTraditionalVideoCount} traditional · {activeDraft.deliverables.video.editedCinematicVideoCount} cinematic
          {activeDraft.deliverables.video.rawVideo ? " · Raw footage" : ""}
        </Muted>
        <Muted>Expected by {formatDateLong(activeDraft.expectedDeliveryDate)}</Muted>
      </Card>

      <Card>
        <SectionHead title="Budget" onEdit={() => router.push("/booking/budget")} />
        <Muted style={{ fontWeight: "800", color: colors.ink }}>{activeDraft.budget ? formatInr(activeDraft.budget) : "Not set"}</Muted>
        <Muted>Approximate</Muted>
      </Card>

      <Card>
        <SectionHead title="Package" onEdit={() => router.push("/booking/packages")} />
        <Muted style={{ fontWeight: "800", color: colors.ink, flexShrink: 1 }}>
          {pkg ? formatPackageOverallLabel(pkg.label, pkg.minPrice, pkg.maxPrice) : (activeDraft.selectedPackage ?? "—")}
        </Muted>
        {pkg && pkg.maxPrice > 0 ? (
          <Muted style={{ fontSize: 20, fontWeight: "800", color: colors.primaryDark, flexShrink: 1 }}>
            {formatInrRange(pkg.minPrice, pkg.maxPrice)}
          </Muted>
        ) : null}
        <Muted>Approved range for your selected services. Not a provider quote.</Muted>
      </Card>

      <Card>
        <SectionHead title="Lead Dispatch & Assigned Providers" onEdit={() => router.push("/booking/matches")} />
        <Muted style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>
          {matches.length > 1 ? `Dispatched to ${matches.length} Verified Photographers` : (match?.studioName || "Verified Photographer")}
        </Muted>
        <Muted>
          Preferred location: {activeDraft.providerLocationPreference?.city || firstDay?.location.city || "Near event"}
        </Muted>
        <View style={{ marginTop: 8, padding: 10, backgroundColor: colors.peach, borderRadius: 8, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Lock size={14} color={colors.primaryDark} />
            <Muted style={{ fontWeight: "800", color: colors.primaryDark }}>Mutual Contact Privacy</Muted>
          </View>
          <Muted style={{ fontSize: 12 }}>
            Your contact details (phone & email) will NOT appear to photographers until one accepts your request. Photographers' direct contacts will likewise unlock upon acceptance.
          </Muted>
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
