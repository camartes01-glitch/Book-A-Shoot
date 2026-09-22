import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { Field, Muted } from "@/src/components/ui";
import {
  getPlaceDetails,
  isGooglePlacesConfigured,
  searchPlaceSuggestions,
  type PlaceSuggestion,
} from "@/src/services/placesApi";
import type { EventLocation } from "@/src/types/booking";
import { colors } from "@/src/constants/theme";

export type PlaceAutocompleteFieldProps = {
  label?: string;
  placeholder?: string;
  /** Restrict suggestions to city-level places (e.g. provider-location search). */
  restrictToCities?: boolean;
  /** After a suggestion is picked: clear the search text (location.tsx's pattern,
   * where the resolved address shows in a separate confirm card), or leave the
   * picked label in the field (provider-location's pattern, no separate card). */
  clearQueryOnSelect?: boolean;
  onSelect: (location: EventLocation, suggestion: PlaceSuggestion) => void;
};

/** Shared debounced place/city search input + suggestion dropdown, backed by
 * `src/services/placesApi.ts` (real Google Places when configured, a curated
 * Indian-city dataset otherwise). Extracted from the event-location screen so
 * any other "search for a place" input (e.g. provider location preference)
 * gets the same behavior instead of a bare, unvalidated text field. */
export function PlaceAutocompleteField({
  label = "Search location",
  placeholder = "Search area, city or venue",
  restrictToCities,
  clearQueryOnSelect = true,
  onSelect,
}: PlaceAutocompleteFieldProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchPlaceSuggestions(query, { restrictToCities });
      setSuggestions(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, restrictToCities]);

  const onPickSuggestion = async (s: PlaceSuggestion) => {
    const details = await getPlaceDetails(s.placeId);
    setSuggestions([]);
    setQuery(clearQueryOnSelect ? "" : s.label);
    onSelect(details, s);
  };

  return (
    <View>
      <Field label={label} placeholder={placeholder} value={query} onChangeText={setQuery} returnKeyType="search" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
});
