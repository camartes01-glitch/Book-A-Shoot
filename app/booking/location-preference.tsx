import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Compass, MapPin, Navigation, Users } from "lucide-react-native";
import { WizardScreen } from "@/src/components/WizardScreen";
import { Button, Muted, SectionTitle } from "@/src/components/ui";
import { PlaceAutocompleteField } from "@/src/components/PlaceAutocompleteField";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, radius, spacing } from "@/src/constants/theme";
import type { EventLocation, ProviderLocationPreference } from "@/src/types/booking";
import { canonicalCityName } from "@/src/domain/cityResolution";
import { lookupCityByName } from "@/src/constants/cities";
import { getPlaceDetails, searchPlaceSuggestions } from "@/src/services/placesApi";

type Mode = ProviderLocationPreference["mode"];
type Choice = { city: string; formattedAddress: string };

/** Resolve free text the customer typed but did not pick from the list
 * ("hyderabad", "Bangalore", "vizag") to a real city — or null. */
async function resolveTypedCity(text: string, citiesOnly: boolean): Promise<Choice | null> {
  const t = text.trim();
  if (t.length < 2) return null;
  const known = lookupCityByName(t);
  if (known) return { city: known.city, formattedAddress: citiesOnly ? `${known.city}, ${known.state}` : t };
  try {
    const [first] = await searchPlaceSuggestions(t, { restrictToCities: citiesOnly });
    if (!first) return null;
    const loc = await getPlaceDetails(first.placeId);
    if (!loc.city) return null;
    return { city: loc.city, formattedAddress: citiesOnly ? [loc.city, loc.state].filter(Boolean).join(", ") : loc.formattedAddress || t };
  } catch {
    return null;
  }
}

export default function ProviderLocationPreferenceScreen() {
  const { activeDraft, setProviderLocationPreference } = useAppStore();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";

  const firstDay = useMemo(
    () => [...(activeDraft?.days ?? [])].sort((a, b) => a.order - b.order)[0],
    [activeDraft?.days],
  );
  const eventCity = canonicalCityName(firstDay?.location.city);
  const eventAddress = firstDay?.location.formattedAddress || "";
  const eventCoords =
    typeof firstDay?.location.latitude === "number" && typeof firstDay?.location.longitude === "number"
      ? { latitude: firstDay.location.latitude, longitude: firstDay.location.longitude }
      : null;

  const savedPref = activeDraft?.providerLocationPreference ?? null;
  const [mode, setMode] = useState<Mode>(savedPref?.mode ?? "event_location");
  const [areaChoice, setAreaChoice] = useState<Choice | null>(
    savedPref?.mode === "preferred_area" && savedPref.city ? { city: savedPref.city, formattedAddress: savedPref.formattedAddress || savedPref.city } : null,
  );
  const [cityChoice, setCityChoice] = useState<Choice | null>(
    savedPref?.mode === "another_area" && savedPref.city ? { city: savedPref.city, formattedAddress: savedPref.formattedAddress || savedPref.city } : null,
  );
  // Text typed into a search box but not (yet) confirmed by picking a row.
  const [areaTyped, setAreaTyped] = useState("");
  const [cityTyped, setCityTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Rehydrate once the draft loads (deep link / cold start).
  useEffect(() => {
    if (!savedPref) return;
    setMode(savedPref.mode);
    if (savedPref.mode === "preferred_area" && savedPref.city) {
      setAreaChoice({ city: savedPref.city, formattedAddress: savedPref.formattedAddress || savedPref.city });
    }
    if (savedPref.mode === "another_area" && savedPref.city) {
      setCityChoice({ city: savedPref.city, formattedAddress: savedPref.formattedAddress || savedPref.city });
    }
  }, [savedPref?.mode, savedPref?.city, savedPref?.formattedAddress]);

  const selectMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const onCityTyped = useCallback((t: string) => {
    setCityTyped(t);
    setCityChoice(null);
    setError(null);
  }, []);
  const onAreaTyped = useCallback((t: string) => {
    setAreaTyped(t);
    setAreaChoice(null);
    setError(null);
  }, []);
  const onCityPicked = useCallback((loc: EventLocation) => {
    setCityChoice({ city: loc.city, formattedAddress: [loc.city, loc.state].filter(Boolean).join(", ") });
    setCityTyped("");
    setError(null);
  }, []);
  const onAreaPicked = useCallback((loc: EventLocation, s: { label: string }) => {
    setAreaChoice({ city: loc.city, formattedAddress: [s.label, loc.city].filter(Boolean).join(", ") });
    setAreaTyped("");
    setError(null);
  }, []);

  /** City photographers will be searched in, for the summary line. */
  const targetCity =
    mode === "event_location" ? eventCity : mode === "another_area" ? cityChoice?.city ?? null : areaChoice?.city ?? null;

  const onContinue = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      let pref: ProviderLocationPreference;
      if (mode === "event_location") {
        if (!eventCity) {
          setError("Your event location has no city yet. Go back and set the event location first.");
          return;
        }
        pref = { mode, city: eventCity, formattedAddress: eventAddress };
      } else {
        const isCity = mode === "another_area";
        let choice = isCity ? cityChoice : areaChoice;
        const typed = isCity ? cityTyped : areaTyped;
        if (!choice && typed.trim()) {
          choice = await resolveTypedCity(typed, isCity);
          if (choice) (isCity ? setCityChoice : setAreaChoice)(choice);
        }
        if (!choice?.city) {
          setError(
            isCity
              ? "Select the city you want photographers from (for example Hyderabad) from the list."
              : "Select an area from the list so we know which city to search in.",
          );
          return;
        }
        pref = { mode, city: canonicalCityName(choice.city), formattedAddress: choice.formattedAddress };
      }
      await setProviderLocationPreference(pref);
      router.replace("/booking/confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your preference. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    router.replace(isEditMode ? "/booking/confirm" : "/booking/packages");
  };

  const option = (value: Mode, Icon: typeof MapPin, title: string, subtitle: string, body?: React.ReactNode) => {
    const selected = mode === value;
    return (
      <Pressable
        style={[styles.optionCard, selected && styles.optionCardSelected]}
        onPress={() => selectMode(value)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        <View style={styles.optionHeader}>
          <View style={styles.iconCircle}>
            <Icon size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.optionTitle}>{title}</Text>
            <Text style={styles.optionSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          {selected ? (
            <View style={styles.checkCircle}>
              <Check size={16} color={colors.white} />
            </View>
          ) : (
            <View style={styles.uncheckCircle} />
          )}
        </View>
        {selected && body ? <View style={{ marginTop: spacing.sm, gap: 6 }}>{body}</View> : null}
      </Pressable>
    );
  };

  return (
    <WizardScreen
      title="Provider location"
      step="location"
      onBack={onBack}
      footer={
        <Button label={isEditMode ? "Save & Return to Review" : "Continue to Review"} onPress={onContinue} loading={loading} flex={1} />
      }
    >
      <View style={{ gap: 4 }}>
        <SectionTitle>Where should your photographers come from?</SectionTitle>
        <Muted>Your request goes only to verified photography firms based in the city you choose.</Muted>
      </View>

      {option("event_location", MapPin, "Same city as my event", eventCity ? `${eventCity}${eventAddress ? ` · ${eventAddress}` : ""}` : "Set your event location first")}

      {option(
        "preferred_area",
        Navigation,
        "A specific area",
        "Photographers from a particular locality",
        <PlaceAutocompleteField
          label="Area or locality"
          placeholder="e.g. Banjara Hills, Benz Circle, Koramangala"
          clearQueryOnSelect={false}
          initialQuery={areaChoice?.formattedAddress ?? ""}
          near={eventCoords}
          onQueryChange={onAreaTyped}
          onSelect={onAreaPicked}
        />,
      )}

      {option(
        "another_area",
        Compass,
        "Another city",
        "Hire a team that travels from a different city",
        <PlaceAutocompleteField
          label="City"
          placeholder="e.g. Hyderabad, Bengaluru, Chennai"
          restrictToCities
          clearQueryOnSelect={false}
          initialQuery={cityChoice?.city ?? ""}
          onQueryChange={onCityTyped}
          onSelect={onCityPicked}
        />,
      )}

      {error ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : targetCity ? (
        <View style={styles.summaryBox}>
          <Users size={16} color={colors.primaryDark} />
          <Text style={styles.summaryText}>
            We'll send your request to photographers in <Text style={styles.summaryCity}>{targetCity}</Text>.
          </Text>
        </View>
      ) : null}
    </WizardScreen>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.peach,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  optionSubtitle: { fontSize: 12, fontWeight: "500", color: colors.muted },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  uncheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryText: { flex: 1, fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  summaryCity: { fontWeight: "800", color: colors.primaryDark },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: "#FFF5F5",
  },
  errorText: { fontSize: 13.5, color: colors.danger, lineHeight: 19 },
});
