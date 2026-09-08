import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LocateFixed, MapPin } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Card, Field, Muted, SectionTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import {
  getCurrentLocationDetails,
  getPlaceDetails,
  isGooglePlacesConfigured,
  searchPlaceSuggestions,
  type PlaceSuggestion,
} from "@/src/services/placesApi";
import type { EventLocation } from "@/src/types/booking";
import { colors, radius, spacing } from "@/src/constants/theme";

export default function LocationPickerScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const { activeDraft, updateDay } = useAppStore();
  const day = activeDraft?.days.find((d) => d.dayId === dayId);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selected, setSelected] = useState<EventLocation | null>(day?.location.formattedAddress ? day.location : null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchPlaceSuggestions(query);
      setSuggestions(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const onPickSuggestion = async (s: PlaceSuggestion) => {
    const details = await getPlaceDetails(s.placeId);
    setSelected(details);
    setSuggestions([]);
    setQuery("");
  };

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
    if (!selected?.formattedAddress || !dayId) return;
    await updateDay(dayId, { location: selected });
    router.back();
  };

  return (
    <WizardScreen title="Event location" step="event" footer={<Button label="Confirm location" onPress={onConfirm} disabled={!selected?.formattedAddress} flex={1} />}>
      <Card>
        <SectionTitle>Where is your event?</SectionTitle>
        <Field
          label="Search location"
          placeholder="Search area, city or venue"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {!isGooglePlacesConfigured() ? (
          <Muted>Searching Camartes' city directory. Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY for full address autocomplete.</Muted>
        ) : null}
        {searching ? <ActivityIndicator color={colors.primary} /> : null}
        {suggestions.map((s) => (
          <Pressable key={s.placeId} style={styles.suggestionRow} onPress={() => onPickSuggestion(s)}>
            <MapPin size={16} color={colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.suggestionTitle}>{s.label}</Text>
              {s.secondaryLabel ? <Muted>{s.secondaryLabel}</Muted> : null}
            </View>
          </Pressable>
        ))}
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
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
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
