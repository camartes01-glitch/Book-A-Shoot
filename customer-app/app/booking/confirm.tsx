import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Muted, SectionTitle, ScreenTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { formatDateLong, formatInr } from "@/src/utils/format";
import { spacing } from "@/src/constants/theme";

export default function ConfirmBookingScreen() {
  const { activeDraft, submitVendorRequest, clearActiveDraft } = useAppStore();
  const [loading, setLoading] = useState(false);

  if (!activeDraft || !activeDraft.selectedVendorId) return null;
  const match = activeDraft.matches?.find((m) => m.vendorId === activeDraft.selectedVendorId);
  const finalEventDate = activeDraft.days.map((d) => d.eventDate).filter(Boolean).sort().pop();

  const onSubmit = async () => {
    setLoading(true);
    try {
      await submitVendorRequest();
      const bookingId = activeDraft.bookingId;
      clearActiveDraft();
      router.replace(`/bookings/${bookingId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardScreen title="Confirm your request" step="confirm" footer={<Button label="Submit Booking Request" onPress={onSubmit} loading={loading} flex={1} />}>
      <ScreenTitle>Confirm Your Booking Request</ScreenTitle>

      <Card>
        <SectionTitle>Vendor</SectionTitle>
        <Muted style={{ fontSize: 16, fontWeight: "800", color: undefined }}>{match?.studioName}</Muted>
      </Card>

      <Card>
        <SectionTitle>Package</SectionTitle>
        <Muted style={{ textTransform: "capitalize" }}>{activeDraft.selectedPackage}</Muted>
      </Card>

      <Card>
        <SectionTitle>Total estimated amount</SectionTitle>
        <Muted style={{ fontSize: 22, fontWeight: "800" }}>{formatInr(activeDraft.estimatedAmount ?? 0)}</Muted>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Muted>Event days</Muted>
          <Muted style={{ fontWeight: "700" }}>{activeDraft.days.length}</Muted>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Muted>Location</Muted>
          <Muted style={{ fontWeight: "700" }}>{activeDraft.days[0]?.location.city}</Muted>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Muted>Final event date</Muted>
          <Muted style={{ fontWeight: "700" }}>{formatDateLong(finalEventDate ?? null)}</Muted>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Muted>Expected delivery</Muted>
          <Muted style={{ fontWeight: "700" }}>{formatDateLong(activeDraft.expectedDeliveryDate)}</Muted>
        </View>
      </Card>

      <Card>
        <Muted>
          Your booking request will be sent to the vendor. They can accept, decline or send a counter offer — you'll be
          notified either way.
        </Muted>
      </Card>
    </WizardScreen>
  );
}
