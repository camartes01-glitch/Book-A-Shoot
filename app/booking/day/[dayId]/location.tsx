import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LocateFixed, MapPin } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Field, Muted, SectionTitle } from "@/src/components/ui";
import { PlaceAutocompleteField } from "@/src/components/PlaceAutocompleteField";
import { useAppStore } from "@/src/state/AppProvider";
import { normalizeRouteParam, safeBack } from "@/src/utils/routeParam";
import { getCurrentLocationDetails } from "@/src/services/placesApi";
import type { EventLocation } from "@/src/types/booking";
import { colors, radius, spacing } from "@/src/constants/theme";

export default function LocationPickerScreen() {
  const params = useLocalSearchParams<{ dayId: string | string[]; mode?: string }>();
  const isEditMode = params.mode === "edit";
  const dayId = normalizeRouteParam(params.dayId);
  const { activeDraft, updateDay } = useAppStore();
  const day =
    activeDraft?.days.find((d) => d.dayId === dayId) ?? (activeDraft?.days.length === 1 ? activeDraft.days[0] : undefined);

  const [locating, setLocating] = useState(false);
  const [selected, setSelected] = useState<EventLocation | null>(
    day?.location.formattedAddress || day?.location.city ? day.location : null,
  );
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (day?.location && !selected) {
      if (day.location.formattedAddress || day.location.city) {
        setSelected(day.location);
      }
    }
  }, [day?.location]);

  const onUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const result = await getCurrentLocationDetails();
      if ("error" in result) {
        showLocationError(result.error);
        return;
      }
      setLocationError(null);
      setSelected(result.location);
    } finally {
      setLocating(false);
    }
  };

  const showLocationError = (message: string) => {
    setSelected(null);
    setLocationError(message);
  };

  const onConfirm = async () => {
    const persistId = day?.dayId || dayId;
    if (!selected?.formattedAddress || !persistId) return;
    try {
      await updateDay(persistId, { location: selected });
      if (isEditMode) {
        router.replace(`/booking/day/${persistId}?step=event&mode=edit`);
      } else {
        safeBack(persistId ? `/booking/day/${persistId}` : "/(tabs)");
      }
    } catch {
      setLocationError("Could not save the event location. Return to the event day and try again.");
    }
  };

  const onBack = () => {
    const persistId = day?.dayId || dayId;
    if (isEditMode && persistId) {
      router.replace(`/booking/day/${persistId}?step=event&mode=edit`);
    } else {
      safeBack(persistId ? `/booking/day/${persistId}` : "/(tabs)");
    }
  };

  return (
    <WizardScreen
      title="Event location"
      step="event"
      onBack={onBack}
      footer={<Button label="Confirm location" onPress={onConfirm} disabled={!selected?.formattedAddress} flex={1} />}
    >
      <Card>
        <SectionTitle>Where is your event?</SectionTitle>
        <PlaceAutocompleteField onSelect={(location) => setSelected(location)} />
        <Button
          label="Use my current location"
          variant="outline"
          icon={<LocateFixed size={16} color={colors.primaryDark} />}
          onPress={onUseCurrentLocation}
          loading={locating}
        />
      </Card>

      {locationError ? (
        <Card style={{ borderColor: colors.danger }}>
          <Muted style={{ color: colors.danger }}>{locationError}</Muted>
        </Card>
      ) : null}

      {selected?.formattedAddress ? (
        <Card>
          <SectionTitle>Confirm & edit address</SectionTitle>
          <View style={styles.mapPreview}>
            <MapPin size={28} color={colors.primary} />
            <Muted>Pinned location</Muted>
          </View>
          <Field
            label="Full address"
            value={selected.formattedAddress}
            onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, formattedAddress: v, manuallyEdited: true } : prev))}
            multiline
          />
          <View style={styles.row}>
            <Field label="City" value={selected.city} onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, city: v } : prev))} />
            <Field label="Pincode" value={selected.pincode} onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, pincode: v } : prev))} keyboardType="number-pad" />
          </View>
          <View style={styles.row}>
            <Field label="District" value={selected.district} onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, district: v } : prev))} />
            <Field label="State" value={selected.state} onChangeText={(v) => setSelected((prev) => (prev ? { ...prev, state: v } : prev))} />
          </View>
        </Card>
      ) : null}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  mapPreview: {
    height: 100,
    borderRadius: radius,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", gap: spacing.sm },
});
