import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { Field, Muted } from "@/src/components/ui";
import { getPlaceDetails, searchPlaceSuggestions, type PlaceSuggestion } from "@/src/services/placesApi";
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
  /** Pre-fill the input (e.g. a previously chosen city). */
  initialQuery?: string;
  /** Bias results towards a point (e.g. the event's city). */
  near?: { latitude: number; longitude: number } | null;
  /** Raw text as the customer types — lets the parent know when the field
   * holds text that has not been confirmed by picking a suggestion. */
  onQueryChange?: (text: string) => void;
  onSelect: (location: EventLocation, suggestion: PlaceSuggestion) => void;
};

const DEBOUNCE_MS = 300;

/** Debounced place/city search with a suggestion list. Stale responses are
 * aborted, so results always match the latest text the customer typed. */
function PlaceAutocompleteFieldImpl({
  label = "Search location",
  placeholder = "Search area, building, venue or city",
  restrictToCities,
  clearQueryOnSelect = true,
  initialQuery = "",
  near,
  onQueryChange,
  onSelect,
}: PlaceAutocompleteFieldProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  /** Text equal to a picked label must not trigger a new search. */
  const committedRef = useRef<string | null>(initialQuery || null);
  const nearLat = near?.latitude;
  const nearLng = near?.longitude;

  useEffect(() => {
    const q = query.trim();
    if (!q || q === committedRef.current) {
      setSuggestions([]);
      setSearching(false);
      setSearched(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaceSuggestions(q, {
          restrictToCities,
          signal: controller.signal,
          near: typeof nearLat === "number" && typeof nearLng === "number" ? { latitude: nearLat, longitude: nearLng } : null,
        });
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setSearched(true);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, restrictToCities, nearLat, nearLng]);

  const onChangeText = useCallback(
    (text: string) => {
      committedRef.current = null;
      setPickError(null);
      setQuery(text);
      onQueryChange?.(text);
    },
    [onQueryChange],
  );

  const onPickSuggestion = async (s: PlaceSuggestion) => {
    if (picking) return;
    setPicking(s.placeId);
    setPickError(null);
    try {
      const details = await getPlaceDetails(s.placeId);
      const nextText = clearQueryOnSelect ? "" : details.city && restrictToCities ? details.city : s.label;
      committedRef.current = nextText || null;
      setSuggestions([]);
      setSearched(false);
      setQuery(nextText);
      onSelect(details, s);
    } catch (err) {
      // Keep the list open so the customer can pick again; never guess a location.
      setPickError(err instanceof Error ? err.message : "Couldn't load this place. Please try again.");
    } finally {
      setPicking(null);
    }
  };

  const showEmpty = searched && !searching && suggestions.length === 0 && query.trim().length >= 3;

  return (
    <View>
      <Field
        label={label}
        placeholder={placeholder}
        value={query}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="words"
        rightElement={searching ? <ActivityIndicator color={colors.primary} /> : undefined}
      />
      {suggestions.length > 0 ? (
        <View style={styles.list} accessibilityRole="menu">
          {suggestions.map((s, i) => (
            <Pressable
              key={s.placeId}
              style={({ pressed }) => [styles.suggestionRow, i === suggestions.length - 1 && styles.lastRow, pressed && styles.rowPressed]}
              onPress={() => void onPickSuggestion(s)}
              accessibilityRole="menuitem"
              accessibilityLabel={[s.label, s.secondaryLabel].filter(Boolean).join(", ")}
            >
              <MapPin size={16} color={colors.primaryDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {s.label}
                </Text>
                {s.secondaryLabel ? (
                  <Muted numberOfLines={1} style={styles.secondary}>
                    {s.secondaryLabel}
                  </Muted>
                ) : null}
              </View>
              {picking === s.placeId ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      {showEmpty ? (
        <Muted style={styles.empty}>
          {restrictToCities
            ? "No matching city found. Check the spelling and try again."
            : "No matches yet — try a nearby landmark, area or city name."}
        </Muted>
      ) : null}
      {pickError ? (
        <Muted style={[styles.empty, { color: colors.danger }]}>
          {pickError}
        </Muted>
      ) : null}
    </View>
  );
}

export const PlaceAutocompleteField = memo(PlaceAutocompleteFieldImpl);

const styles = StyleSheet.create({
  list: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 48,
  },
  lastRow: { borderBottomWidth: 0 },
  rowPressed: { backgroundColor: colors.peach },
  suggestionTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  secondary: { fontSize: 12 },
  empty: { marginTop: 8, fontSize: 12.5 },
});
