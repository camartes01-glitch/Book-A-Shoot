import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Pencil } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Muted, SectionTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { generatePackageOptions } from "@/src/engine/pricing";
import { formatDateLong, formatInr, formatInrRange, formatTime12h } from "@/src/utils/format";
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

export default function ConfirmBookingScreen() {
  const { activeDraft, submitVendorRequest, clearActiveDraft } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeDraft || !activeDraft.selectedVendorId) {
    return (
      <WizardScreen title="Review & send" step="providers">
        <Muted>Select a provider before sending a booking request.</Muted>
        <Button label="Find providers" onPress={() => router.replace("/booking/matches")} />
      </WizardScreen>
    );
  }
  const match = activeDraft.matches?.find((m) => m.vendorId === activeDraft.selectedVendorId);
  const pkg =
    activeDraft.packageOptions?.find((p) => p.id === activeDraft.selectedPackage) ??
    generatePackageOptions(activeDraft, activeDraft.budget ?? 0).find((p) => p.id === activeDraft.selectedPackage);
  const days = [...activeDraft.days].sort((a, b) => a.order - b.order);
  const firstDay = days[0];
  const eventLabel = days
    .flatMap((day) => day.eventTypeIds.map((id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)?.label ?? id))
    .filter(Boolean)
    .join(" · ");
  const services = Array.from(new Set(days.flatMap((day) => selectedCoreServiceLabels(day))));
  const addOns = Array.from(new Set(days.flatMap((day) => selectedAddOnLabels(day))));

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const submitted = await submitVendorRequest();
      clearActiveDraft();
      router.replace(`/bookings/${submitted.bookingId}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not send the booking request.";
      setError(message);
      if (e instanceof CamartesApiError && e.status === 401) {
        Alert.alert("Sign in required", message, [{ text: "Sign in", onPress: () => router.push("/(auth)/login") }]);
      } else {
        Alert.alert("Request not sent", message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardScreen title="Review & send" step="providers" footer={<Button label="Send booking request" onPress={onSubmit} loading={loading} flex={1} />}>
      <SectionTitle>You're almost booked</SectionTitle>
      {error ? <Muted style={{ color: colors.danger, fontWeight: "700" }}>{error}</Muted> : null}
      <Muted>Sending this request creates a real booking on Camartes. It is not confirmed until the provider and Camartes say so.</Muted>

      <Card>
        <SectionHead title="Event" onEdit={() => router.push("/booking/new")} />
        <Muted style={{ fontWeight: "800", color: colors.ink }}>{eventLabel || "Event"}</Muted>
        <Muted>
          {days.length} day{days.length === 1 ? "" : "s"} of coverage
        </Muted>
      </Card>

        <Card>
          <SectionHead title="Date and time" onEdit={() => router.push(firstDay ? `/booking/day/${firstDay.dayId}` : "/booking/new")} />
          {days.map((day) => {
            const minutes =
              day.startTime && day.endTime ? durationMinutes(day.startTime, day.endTime, day.overnight) : null;
            return (
              <Muted key={day.dayId} style={{ fontWeight: "700", color: colors.ink }}>
                Day {day.order}: {formatDateLong(day.eventDate)} · {formatTime12h(day.startTime)} – {formatTime12h(day.endTime)}
                {day.overnight ? " · Ends the next day" : ""}
                {minutes != null ? ` · ${formatDuration(minutes)}` : ""}
              </Muted>
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
        <SectionHead title="Services" onEdit={() => router.push(firstDay ? `/booking/day/${firstDay.dayId}` : "/booking/new")} />
        <Muted style={{ fontWeight: "800", color: colors.ink }}>{services.join(" · ") || "Add coverage"}</Muted>
      </Card>

      <Card>
        <SectionHead title="Add-ons" onEdit={() => router.push(firstDay ? `/booking/day/${firstDay.dayId}` : "/booking/new")} />
        <Muted style={{ fontWeight: "700", color: colors.ink }}>{addOns.length ? addOns.join(" · ") : "None"}</Muted>
      </Card>

      <Card>
        <SectionHead title="Deliverables" onEdit={() => router.push("/booking/deliverables")} />
        <Muted>Photos, videos and album as specified</Muted>
        <Muted>Expected by {formatDateLong(activeDraft.expectedDeliveryDate)}</Muted>
      </Card>

      <Card>
        <SectionHead title="Budget" onEdit={() => router.push("/booking/budget")} />
        <Muted style={{ fontWeight: "800", color: colors.ink }}>{activeDraft.budget ? formatInr(activeDraft.budget) : "Not set"}</Muted>
        <Muted>Approximate</Muted>
      </Card>

      <Card>
        <SectionHead title="Package" onEdit={() => router.push("/booking/packages")} />
        <Muted style={{ fontWeight: "800", color: colors.ink }}>{pkg?.label ?? activeDraft.selectedPackage}</Muted>
        {pkg && pkg.maxPrice > 0 ? (
          <Muted style={{ fontSize: 20, fontWeight: "800", color: colors.primaryDark }}>{formatInrRange(pkg.minPrice, pkg.maxPrice)}</Muted>
        ) : null}
        <Muted>Approved range for your selected services. Not a provider quote.</Muted>
      </Card>

      <Card>
        <SectionHead title="Provider" onEdit={() => router.push("/booking/matches")} />
        <Muted style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>{match?.studioName}</Muted>
        <Muted>{[match?.area, match?.city].filter(Boolean).join(", ")}</Muted>
        {match?.serviceCategory ? <Muted>{match.serviceCategory}</Muted> : null}
      </Card>
    </WizardScreen>
  );
}
