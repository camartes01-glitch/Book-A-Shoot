/**
 * Location search + "Use my current location".
 *
 * Search (any area, street, building, venue, landmark or city in India):
 *   1. Google Places API (New) Autocomplete/Details — when EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
 *      is configured (recommended at scale: highest quality, SLA-backed).
 *   2. Photon (OpenStreetMap) autocomplete — free, no key, India-bounded.
 *   3. Curated offline service-city list — always works, even with no network.
 *
 * Current location:
 *   Device GPS fix → reverse geocode (Google if configured, else the device's
 *   native geocoder with OSM Nominatim as a fallback) → `resolveCity`, which
 *   snaps the point to its service city (Kanuru → Vijayawada, NTR District).
 *
 * Every result's `city` goes through `resolveCity`, so photographer matching
 * always receives a real city name, never a suburb, municipality or Plus Code.
 */
import { Platform } from "react-native";
import * as Location from "expo-location";
import type { EventLocation } from "@/src/types/booking";
import { findCity, lookupCityByName, nearestCity } from "@/src/constants/cities";
import { isPlusCode, joinAddressParts, resolveCity } from "@/src/domain/cityResolution";

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";
const USER_AGENT = "BookAShoot/1.1 (info@bookashoot.online)";
/** India bounding box: minLon,minLat,maxLon,maxLat. */
const INDIA_BBOX = "68.1,6.5,97.5,35.7";
const NETWORK_TIMEOUT_MS = 8000;

export type PlaceSuggestion = {
  placeId: string;
  label: string;
  secondaryLabel?: string;
};

export function isGooglePlacesConfigured(): boolean {
  return GOOGLE_PLACES_API_KEY.length > 0;
}

export type PlaceSearchOptions = {
  /** Only city-level results (e.g. "Another city" provider preference). */
  restrictToCities?: boolean;
  /** Bias results towards this point (e.g. the customer's event city). */
  near?: { latitude: number; longitude: number } | null;
  /** Abort a superseded request (typing fast). */
  signal?: AbortSignal;
};

/** Locations resolved at search time, keyed by suggestion id, so picking a
 * Photon / offline suggestion needs no second network call. Bounded. */
const resolvedSuggestions = new Map<string, EventLocation>();
function rememberSuggestion(id: string, location: EventLocation) {
  if (resolvedSuggestions.size > 200) {
    const oldest = resolvedSuggestions.keys().next().value;
    if (oldest !== undefined) resolvedSuggestions.delete(oldest);
  }
  resolvedSuggestions.set(id, location);
}

async function fetchJson<T>(url: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener?.("abort", onAbort);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.("abort", onAbort);
  }
}

// ─── Offline city list ──────────────────────────────────────────────────────

function offlineCitySuggestions(query: string, limit = 8): PlaceSuggestion[] {
  return findCity(query)
    .slice(0, limit)
    .map((c) => {
      const id = `city:${c.city}`;
      rememberSuggestion(id, {
        placeId: id,
        formattedAddress: `${c.city}, ${c.district}, ${c.state} ${c.pincode}`,
        latitude: c.lat,
        longitude: c.lng,
        city: c.city,
        district: c.district,
        state: c.state,
        pincode: c.pincode,
        manuallyEdited: false,
      });
      return { placeId: id, label: c.city, secondaryLabel: `${c.district}, ${c.state}` };
    });
}

// ─── Google Places (Places API (New) + Geocoding API) ──────────────────────
//
// Billing-aware by design:
//  * Autocomplete requests share a session token with the Place Details call
//    that ends the search, so Google bills one session instead of every
//    keystroke.
//  * Details ask only for Essentials fields (address, location, components).
//  * A permission/billing/quota refusal opens a circuit breaker: Google is
//    skipped for a while and search goes straight to OpenStreetMap, instead
//    of paying a failed round trip on every keystroke.
//  * The web build skips Google (no CORS for these endpoints from browsers).

type GoogleComponent = { long_name: string; short_name?: string; types: string[] };

const GOOGLE_COOLDOWN_MS = 10 * 60 * 1000;
let googleDisabledUntil = 0;

class GoogleRefusedError extends Error {}

function googleAvailable(): boolean {
  return isGooglePlacesConfigured() && Platform.OS !== "web" && Date.now() >= googleDisabledUntil;
}

function tripGoogleBreaker(reason: string) {
  googleDisabledUntil = Date.now() + GOOGLE_COOLDOWN_MS;
  if (typeof __DEV__ !== "undefined" && __DEV__) console.warn(`[places] Google disabled for 10 min: ${reason}`);
}

function newSessionToken(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** One token per search: created by the first keystroke, consumed by the details call. */
let sessionToken: string | null = null;
function currentSessionToken(): string {
  if (!sessionToken) sessionToken = newSessionToken();
  return sessionToken;
}

async function googleFetch<T>(url: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener?.("abort", onAbort);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY, ...(init.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: { status?: string; message?: string } };
    if (!res.ok) {
      const status = body?.error?.status ?? `HTTP ${res.status}`;
      // 400 INVALID_ARGUMENT is about this one request; everything 401/403/429 is the key/project.
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        tripGoogleBreaker(`${status}: ${body?.error?.message ?? ""}`);
        throw new GoogleRefusedError(status);
      }
      throw new Error(status);
    }
    return body;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.("abort", onAbort);
  }
}

function googleComponent(components: GoogleComponent[], ...types: string[]): string {
  for (const t of types) {
    const hit = components.find((c) => c.types.includes(t))?.long_name;
    if (hit) return hit;
  }
  return "";
}

function locationFromGoogle(
  placeId: string | null,
  formattedAddress: string,
  lat: number | null,
  lng: number | null,
  components: GoogleComponent[],
): EventLocation {
  const resolved = resolveCity({
    latitude: lat,
    longitude: lng,
    cityNames: [
      googleComponent(components, "locality"),
      googleComponent(components, "administrative_area_level_3"),
      googleComponent(components, "postal_town"),
    ],
    districtNames: [googleComponent(components, "administrative_area_level_2")],
    stateNames: [googleComponent(components, "administrative_area_level_1")],
  });
  return {
    placeId,
    formattedAddress: formattedAddress.split(",").filter((p) => !isPlusCode(p)).join(",").trim(),
    latitude: lat,
    longitude: lng,
    city: resolved.city,
    district: resolved.district || googleComponent(components, "administrative_area_level_2"),
    state: resolved.state || googleComponent(components, "administrative_area_level_1"),
    pincode: googleComponent(components, "postal_code"),
    manuallyEdited: false,
  };
}

async function googleSuggestions(query: string, options: PlaceSearchOptions): Promise<PlaceSuggestion[]> {
  const body: Record<string, unknown> = {
    input: query,
    sessionToken: currentSessionToken(),
    includedRegionCodes: ["in"],
    languageCode: "en",
  };
  if (options.restrictToCities) body.includedPrimaryTypes = ["(cities)"];
  if (options.near) {
    body.locationBias = {
      circle: { center: { latitude: options.near.latitude, longitude: options.near.longitude }, radius: 50000 },
    };
  }
  const json = await googleFetch<{
    suggestions?: Array<{
      placePrediction?: {
        placeId: string;
        text?: { text?: string };
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
      };
    }>;
  }>(
    "https://places.googleapis.com/v1/places:autocomplete",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    options.signal,
  );
  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .map((p) => ({
      placeId: p.placeId,
      label: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondaryLabel: p.structuredFormat?.secondaryText?.text,
    }))
    .filter((p) => p.label);
}

async function googleDetails(placeId: string): Promise<EventLocation | null> {
  const token = sessionToken;
  sessionToken = null; // the details call ends the billing session
  const params = new URLSearchParams({ languageCode: "en" });
  if (token) params.set("sessionToken", token);
  const r = await googleFetch<{
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
  }>(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${params.toString()}`, {
    method: "GET",
    headers: { "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents" },
  });
  if (!r.formattedAddress && !r.location) return null;
  const components: GoogleComponent[] = (r.addressComponents ?? []).map((c) => ({
    long_name: c.longText ?? "",
    short_name: c.shortText,
    types: c.types ?? [],
  }));
  return locationFromGoogle(placeId, r.formattedAddress ?? "", r.location?.latitude ?? null, r.location?.longitude ?? null, components);
}

async function googleReverse(lat: number, lng: number): Promise<EventLocation | null> {
  const json = await fetchJson<{
    status?: string;
    error_message?: string;
    results?: Array<{ place_id: string; formatted_address: string; address_components: GoogleComponent[] }>;
  }>(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GOOGLE_PLACES_API_KEY}`);
  if (json.status === "REQUEST_DENIED" || json.status === "OVER_QUERY_LIMIT" || json.status === "OVER_DAILY_LIMIT") {
    tripGoogleBreaker(`${json.status}: ${json.error_message ?? ""}`);
    return null;
  }
  const best = json.results?.find((r) => !isPlusCode(r.formatted_address)) ?? json.results?.[0];
  if (!best) return null;
  return locationFromGoogle(best.place_id, best.formatted_address, lat, lng, best.address_components);
}

// ─── Photon (OpenStreetMap) ─────────────────────────────────────────────────

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
};

const PHOTON_CITY_TYPES = new Set(["city", "town", "village", "municipality"]);

function locationFromPhoton(f: PhotonFeature): { suggestion: PlaceSuggestion; location: EventLocation } | null {
  const p = f.properties ?? {};
  const [lng, lat] = f.geometry?.coordinates ?? [];
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (p.countrycode && p.countrycode.toUpperCase() !== "IN") return null;
  const isCityLevel = PHOTON_CITY_TYPES.has(p.type ?? "") || PHOTON_CITY_TYPES.has(p.osm_value ?? "");

  const resolved = resolveCity({
    latitude: lat,
    longitude: lng,
    cityNames: [p.city, isCityLevel ? p.name : null, p.locality],
    districtNames: [p.county],
    stateNames: [p.state],
  });
  const street = joinAddressParts([p.housenumber, p.street]);
  const label = p.name || street || resolved.city;
  if (!label) return null;
  const area = joinAddressParts([p.locality, p.district]);
  const formattedAddress = joinAddressParts([
    p.name,
    street,
    area,
    resolved.city,
    resolved.state || p.state,
    p.postcode,
  ]);
  const id = `osm:${p.osm_type ?? "x"}${p.osm_id ?? `${lat},${lng}`}`;
  return {
    suggestion: {
      placeId: id,
      label,
      secondaryLabel: joinAddressParts([label === street ? null : street, area, resolved.city, resolved.state || p.state]) || undefined,
    },
    location: {
      placeId: id,
      formattedAddress,
      latitude: lat,
      longitude: lng,
      city: resolved.city,
      district: resolved.district,
      state: resolved.state || p.state || "",
      pincode: p.postcode ?? "",
      manuallyEdited: false,
    },
  };
}

async function photonSuggestions(query: string, options: PlaceSearchOptions): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: "10", lang: "en", bbox: INDIA_BBOX });
  if (options.near) {
    params.set("lat", String(options.near.latitude));
    params.set("lon", String(options.near.longitude));
  }
  if (options.restrictToCities) {
    for (const tag of ["place:city", "place:town"]) params.append("osm_tag", tag);
  }
  const json = await fetchJson<{ features?: PhotonFeature[] }>(
    `https://photon.komoot.io/api/?${params.toString()}`,
    { headers: { "User-Agent": USER_AGENT } },
    options.signal,
  );
  const out: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  for (const f of json.features ?? []) {
    const hit = locationFromPhoton(f);
    if (!hit) continue;
    if (options.restrictToCities) {
      // One row per resolved city, labelled with the canonical city name.
      const key = hit.location.city.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      hit.suggestion.label = hit.location.city;
      hit.suggestion.secondaryLabel = joinAddressParts([hit.location.district, hit.location.state]);
    } else {
      const key = `${hit.suggestion.label}|${hit.suggestion.secondaryLabel ?? ""}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    rememberSuggestion(hit.suggestion.placeId, hit.location);
    out.push(hit.suggestion);
  }
  return out;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function searchPlaceSuggestions(query: string, options: PlaceSearchOptions = {}): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  // Known cities typed directly ("hyd", "vijayawada") always appear first.
  const cityHits = q.length >= 2 ? offlineCitySuggestions(q, options.restrictToCities ? 8 : 3) : [];
  const merge = (remote: PlaceSuggestion[]) => {
    if (options.restrictToCities) {
      const names = new Set(cityHits.map((c) => c.label.toLowerCase()));
      return [...cityHits, ...remote.filter((r) => !names.has(r.label.toLowerCase()))].slice(0, 10);
    }
    // For venue/area search, remote results lead; exact city matches follow.
    const labels = new Set(remote.map((r) => r.label.toLowerCase()));
    return [...remote, ...cityHits.filter((c) => !labels.has(c.label.toLowerCase()))].slice(0, 10);
  };

  if (q.length < 3 && !options.restrictToCities) return cityHits;

  if (googleAvailable()) {
    try {
      return merge(await googleSuggestions(q, options));
    } catch (err) {
      if (options.signal?.aborted) throw err;
      // fall through to Photon (breaker already tripped if Google refused us)
    }
  }
  try {
    return merge(await photonSuggestions(q, options));
  } catch (err) {
    if (options.signal?.aborted) throw err;
    return cityHits.length ? cityHits : offlineCitySuggestions(q);
  }
}

export async function getPlaceDetails(placeId: string): Promise<EventLocation> {
  const cached = resolvedSuggestions.get(placeId);
  if (cached) return cached;

  if (placeId.startsWith("city:")) {
    const name = placeId.slice("city:".length);
    const record = lookupCityByName(name) ?? findCity(name)[0];
    if (record) {
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
  } else if (!placeId.startsWith("osm:") && isGooglePlacesConfigured() && Platform.OS !== "web") {
    // A Google place id: only Google can resolve it. Never substitute a
    // default city - that silently sent requests to the wrong city before.
    const details = await googleDetails(placeId).catch(() => null);
    if (details?.city) {
      rememberSuggestion(placeId, details);
      return details;
    }
  }
  throw new Error("Couldn't load this place. Please pick it again or search for a nearby landmark.");
}

export type CurrentLocationResult = { location: EventLocation } | { error: string };

async function getFreshPosition(): Promise<Location.LocationObject | null> {
  const fresh = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000));
  const position = await Promise.race([fresh, timeout]);
  if (position) return position;
  // GPS slow (indoors): accept a recent cached fix rather than failing.
  return Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 500 }).catch(() => null);
}

async function nativeReverse(lat: number, lng: number): Promise<EventLocation | null> {
  const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
  if (!place) return null;
  // Android: city = municipality ("Kanuru"), district = sub-locality ("Sanath
  // Nagar"), subregion = district ("NTR"). iOS: city = city, district = area.
  const resolved = resolveCity({
    latitude: lat,
    longitude: lng,
    cityNames: [place.city, place.subregion],
    districtNames: [place.subregion],
    stateNames: [place.region],
  });
  if (!resolved.city) return null;
  const name = place.name && !isPlusCode(place.name) && place.name !== place.street ? place.name : null;
  return {
    placeId: null,
    formattedAddress: joinAddressParts([
      name,
      joinAddressParts([place.streetNumber, place.street]),
      place.district,
      place.city,
      resolved.city,
      resolved.state || place.region,
      place.postalCode,
    ]),
    latitude: lat,
    longitude: lng,
    city: resolved.city,
    district: resolved.district,
    state: resolved.state || place.region || "",
    pincode: place.postalCode ?? "",
    manuallyEdited: false,
  };
}

async function nominatimReverse(lat: number, lng: number): Promise<EventLocation | null> {
  const data = await fetchJson<{ address?: Record<string, string> }>(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
    { headers: { "User-Agent": USER_AGENT } },
  );
  const a = data.address;
  if (!a) return null;
  const resolved = resolveCity({
    latitude: lat,
    longitude: lng,
    cityNames: [a.city, a.town, a.municipality, a.village],
    districtNames: [a.state_district, a.county],
    stateNames: [a.state],
  });
  if (!resolved.city) return null;
  return {
    placeId: null,
    formattedAddress: joinAddressParts([
      a.amenity || a.building,
      joinAddressParts([a.house_number, a.road]),
      a.neighbourhood || a.quarter,
      a.suburb || a.village || a.town,
      resolved.city,
      resolved.state || a.state,
      a.postcode,
    ]),
    latitude: lat,
    longitude: lng,
    city: resolved.city,
    district: resolved.district,
    state: resolved.state || a.state || "",
    pincode: a.postcode ?? "",
    manuallyEdited: false,
  };
}

export async function getCurrentLocationDetails(): Promise<CurrentLocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { error: "Location permission is off. Allow location access, or search for your venue or area instead." };
    }
    const servicesOn = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!servicesOn) {
      return { error: "Your phone's location (GPS) is turned off. Turn it on, or search for your venue or area instead." };
    }

    const position = await getFreshPosition();
    if (!position) {
      return { error: "Couldn't get a GPS fix. Move near a window or search for your venue or area instead." };
    }
    const { latitude, longitude } = position.coords;

    const attempts: Array<() => Promise<EventLocation | null>> = [];
    if (googleAvailable()) attempts.push(() => googleReverse(latitude, longitude));
    attempts.push(() => nativeReverse(latitude, longitude));
    attempts.push(() => nominatimReverse(latitude, longitude));

    for (const attempt of attempts) {
      try {
        const loc = await attempt();
        if (loc?.city && loc.formattedAddress) return { location: loc };
      } catch {
        // try the next geocoder
      }
    }

    // Every geocoder failed (offline): still give the right city.
    const resolved = resolveCity({ latitude, longitude });
    const fallback = resolved.city ? resolved : nearestCity(latitude, longitude);
    if (!fallback) {
      return { error: "Couldn't identify this location. Search for your venue or area instead." };
    }
    return {
      location: {
        placeId: null,
        formattedAddress: `Near ${fallback.city}, ${fallback.state}`,
        latitude,
        longitude,
        city: fallback.city,
        district: fallback.district,
        state: fallback.state,
        pincode: "pincode" in fallback ? fallback.pincode : "",
        manuallyEdited: false,
      },
    };
  } catch {
    return { error: "Could not get your current location. Search for your venue or area instead." };
  }
}
