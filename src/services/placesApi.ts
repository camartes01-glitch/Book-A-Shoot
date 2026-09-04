/**
 * Location / Google Maps integration (spec section 9).
 *
 * Two independent capabilities:
 *  1. "Use my current location" — always works, no API key required. It uses
 *     `expo-location`'s device/OS reverse geocoder (Apple Maps on iOS,
 *     Google Play services on Android), matching the same pattern already
 *     used in the Camartes Field app.
 *  2. "Search for an address" — uses the real Google Places Autocomplete +
 *     Place Details REST APIs when `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is
 *     configured (add it as a Cloud Agent / EAS secret). Without a key it
 *     falls back to a curated Indian-city dataset (`src/constants/cities.ts`)
 *     so the flow still works end to end; the customer can always edit the
 *     full address afterwards regardless of which path was used (spec:
 *     "Allow customer to manually edit the address after selecting the map
 *     location").
 */
import * as Location from "expo-location";
import type { EventLocation } from "@/src/types/booking";
import { findCity, nearestCity } from "@/src/constants/cities";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

export type PlaceSuggestion = {
  placeId: string;
  label: string;
  secondaryLabel?: string;
};

export function isGooglePlacesConfigured(): boolean {
  return GOOGLE_PLACES_API_KEY.length > 0;
}

export async function searchPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];

  if (isGooglePlacesConfigured()) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query,
      )}&components=country:in&key=${GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const json = (await res.json()) as { predictions?: Array<{ place_id: string; description: string; structured_formatting?: { main_text?: string; secondary_text?: string } }> };
      return (json.predictions ?? []).map((p) => ({
        placeId: p.place_id,
        label: p.structured_formatting?.main_text ?? p.description,
        secondaryLabel: p.structured_formatting?.secondary_text,
      }));
    } catch {
      // fall through to the offline dataset below
    }
  }

  return findCity(query)
    .slice(0, 12)
    .map((c) => ({ placeId: `city:${c.city}`, label: c.city, secondaryLabel: `${c.district}, ${c.state}` }));
}

function addressComponent(components: Array<{ long_name: string; types: string[] }>, type: string): string {
  return components.find((c) => c.types.includes(type))?.long_name ?? "";
}

export async function getPlaceDetails(placeId: string): Promise<EventLocation> {
  if (isGooglePlacesConfigured() && !placeId.startsWith("city:")) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,address_component&key=${GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        result?: {
          formatted_address?: string;
          geometry?: { location?: { lat: number; lng: number } };
          address_components?: Array<{ long_name: string; types: string[] }>;
        };
      };
      const result = json.result;
      if (result) {
        const components = result.address_components ?? [];
        return {
          placeId,
          formattedAddress: result.formatted_address ?? "",
          latitude: result.geometry?.location?.lat ?? null,
          longitude: result.geometry?.location?.lng ?? null,
          city: addressComponent(components, "locality") || addressComponent(components, "administrative_area_level_2"),
          district: addressComponent(components, "administrative_area_level_2"),
          state: addressComponent(components, "administrative_area_level_1"),
          pincode: addressComponent(components, "postal_code"),
          manuallyEdited: false,
        };
      }
    } catch {
      // fall through
    }
  }

  const cityName = placeId.replace(/^city:/, "");
  const record = findCity(cityName)[0] ?? findCity("")[0];
  return {
    placeId,
    formattedAddress: `${record.city}, ${record.district}, ${record.state} ${record.pincode}`,
    latitude: record.lat,
    longitude: record.lng,
    city: record.city,
    district: record.district,
    state: record.state,
    pincode: record.pincode,
    manuallyEdited: false,
  };
}

export type CurrentLocationResult = { location: EventLocation } | { error: string };

export async function getCurrentLocationDetails(): Promise<CurrentLocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return { error: "Location permission denied. Search for your address instead." };
  }

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = position.coords;

    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        const city = place.city || place.subregion || place.district || "";
        const state = place.region || "";
        const formatted = [place.name, place.street, city, state, place.postalCode].filter(Boolean).join(", ");
        return {
          location: {
            placeId: null,
            formattedAddress: formatted,
            latitude,
            longitude,
            city,
            district: place.subregion || place.district || city,
            state,
            pincode: place.postalCode || "",
            manuallyEdited: false,
          },
        };
      }
    } catch {
      // native reverse geocoder unavailable — fall back to nearest known city
    }

    const nearest = nearestCity(latitude, longitude);
    return {
      location: {
        placeId: null,
        formattedAddress: `Near ${nearest.city}, ${nearest.state}`,
        latitude,
        longitude,
        city: nearest.city,
        district: nearest.district,
        state: nearest.state,
        pincode: nearest.pincode,
        manuallyEdited: false,
      },
    };
  } catch {
    return { error: "Could not get your current location. Search for your address instead." };
  }
}
