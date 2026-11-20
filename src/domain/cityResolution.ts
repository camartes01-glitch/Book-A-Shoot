/**
 * Turns noisy geocoder output into the one thing dispatch depends on: the
 * correct service CITY (plus its district).
 *
 * Geocoders disagree on what "city" means for Indian addresses — Android's
 * Geocoder reports the municipality ("Kanuru"), OSM may report a mandal or a
 * suburb, Google reports a locality — while photographers register under the
 * metro city ("Vijayawada"). Resolution order:
 *   1. Coordinates inside a known metro catchment → that metro (most reliable).
 *   2. A geocoder name that IS a known city or alias ("Bangalore", "Secunderabad").
 *   3. The geocoder's own city-level name (small towns outside every catchment).
 *   4. The nearest known metro within a wider radius.
 */
import type { Booking, EventLocation } from "@/src/types/booking";
import { cityContaining, distanceKm, lookupCityByName, nearestCity, type CityRecord } from "@/src/constants/cities";

type MaybeString = string | null | undefined;

export type CityResolutionInput = {
  latitude?: number | null;
  longitude?: number | null;
  /** City-level names from geocoders, most trusted first. */
  cityNames?: MaybeString[];
  /** District-level names (admin level 2), most trusted first. */
  districtNames?: MaybeString[];
  stateNames?: MaybeString[];
};

export type ResolvedCity = {
  city: string;
  district: string;
  state: string;
  /** True when the city came from the curated service-city dataset. */
  known: boolean;
};

const PLUS_CODE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{0,3}$/i;
/** Admin units that are never a city on their own. */
const NON_CITY_SUFFIX = /\b(mandal|taluk|taluka|tehsil|block|division|district|ward|zone|circle)\b/i;

export function isPlusCode(value: MaybeString): boolean {
  return Boolean(value && PLUS_CODE.test(value.trim().split(/[\s,]/)[0] ?? ""));
}

function clean(value: MaybeString): string {
  if (!value) return "";
  const v = value.trim();
  return isPlusCode(v) ? "" : v;
}

function hasCoords(input: CityResolutionInput): input is CityResolutionInput & { latitude: number; longitude: number } {
  return (
    typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude) &&
    !(input.latitude === 0 && input.longitude === 0)
  );
}

function fromRecord(rec: CityRecord): ResolvedCity {
  return { city: rec.city, district: rec.district, state: rec.state, known: true };
}

/** Strip " District"/" Mandal" etc. so "NTR District" → "NTR District" stays readable
 * but "Penamaluru mandal" is not mistaken for a city. */
function firstCityLike(names: MaybeString[] | undefined): string {
  for (const n of names ?? []) {
    const v = clean(n);
    if (v && !NON_CITY_SUFFIX.test(v)) return v;
  }
  return "";
}

function firstNonEmpty(names: MaybeString[] | undefined): string {
  for (const n of names ?? []) {
    const v = clean(n);
    if (v) return v;
  }
  return "";
}

export function resolveCity(input: CityResolutionInput): ResolvedCity {
  const state = firstNonEmpty(input.stateNames);
  const district = firstNonEmpty(input.districtNames);

  // 1. Inside a known metro catchment.
  if (hasCoords(input)) {
    const metro = cityContaining(input.latitude, input.longitude);
    if (metro) return fromRecord(metro);
  }

  // 2. A geocoder name that is itself a known city / alias. With coordinates,
  //    reject matches that are implausibly far away (homonyms).
  for (const name of [...(input.cityNames ?? []), ...(input.districtNames ?? [])]) {
    const rec = lookupCityByName(clean(name));
    if (!rec) continue;
    if (hasCoords(input) && distanceKm(input.latitude, input.longitude, rec.lat, rec.lng) > 80) continue;
    return fromRecord(rec);
  }

  // 3. The geocoder's own town/city name.
  const ownCity = firstCityLike(input.cityNames);
  if (ownCity) return { city: ownCity, district: district || ownCity, state, known: false };

  // 4. Nearest metro within a wider radius.
  if (hasCoords(input)) {
    const near = nearestCity(input.latitude, input.longitude, 60);
    if (near) return fromRecord(near);
  }

  return { city: firstCityLike(input.districtNames), district, state, known: false };
}

/** Joins address parts, dropping blanks, Plus Codes and case-insensitive duplicates. */
export function joinAddressParts(parts: MaybeString[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const v = clean(p);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out.join(", ");
}

/** Canonical spelling of a city typed or picked by a customer
 * ("bangalore" → "Bengaluru", "Secunderabad" → "Hyderabad"). */
export function canonicalCityName(name: MaybeString): string {
  const v = clean(name);
  if (!v) return "";
  return lookupCityByName(v)?.city ?? v;
}

/** Re-resolve a stored location's city (fixes drafts saved by older builds
 * with a suburb/municipality in the city field). */
export function normalizeEventLocationCity(location: EventLocation): EventLocation {
  if (location.manuallyEdited && location.city) return location;
  const resolved = resolveCity({
    latitude: location.latitude,
    longitude: location.longitude,
    cityNames: [location.city],
    districtNames: [location.district],
    stateNames: [location.state],
  });
  if (!resolved.city || resolved.city === location.city) return location;
  return {
    ...location,
    city: resolved.city,
    district: resolved.known ? resolved.district : location.district || resolved.district,
    state: location.state || resolved.state,
  };
}

/** Every common spelling of a city, original first: "Bangalore" →
 * ["Bangalore", "Bengaluru"]; "Hyderabad" → ["Hyderabad", "Secunderabad"].
 * Only the canonical name and the first alias (the historical/twin name) are
 * included — never neighbourhood aliases. */
export function citySpellings(name: MaybeString): string[] {
  const original = clean(name);
  if (!original) return [];
  const rec = lookupCityByName(original);
  const candidates = rec ? [original, rec.city, rec.aliases?.[0]] : [original];
  const seen = new Set<string>();
  return candidates.filter((c): c is string => {
    if (!c) return false;
    const key = c.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type ProviderSearchTarget = {
  /** The city whose photographers must receive the request. */
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  /** True when the customer explicitly chose a city other than the event's. */
  explicit: boolean;
};

/**
 * THE single rule for which city a booking is dispatched to. Used by matching,
 * the catalog search and the request payload so they can never disagree.
 *  - "Near my event location" → the event day's (live) city, not a copy saved
 *    earlier, so editing the venue later can't leave a stale dispatch city.
 *  - "Another city" / "Specific area" → exactly the city the customer chose.
 *    Never silently falls back to the event city.
 */
export function resolveProviderSearchTarget(
  booking: Pick<Booking, "days" | "providerLocationPreference">,
): ProviderSearchTarget {
  const first = [...(booking.days ?? [])].sort((a, b) => a.order - b.order)[0];
  const pref = booking.providerLocationPreference;
  // City strings are passed through as stored (not re-spelled): firms may be
  // registered as "Bangalore" or "Bengaluru". Comparisons canonicalize both
  // sides (see isCityMatch); queries use every spelling (see citySpellings).
  const eventCity = clean(first?.location?.city);

  if (!pref || pref.mode === "event_location") {
    return {
      city: eventCity || clean(pref?.city) || null,
      latitude: first?.location?.latitude ?? null,
      longitude: first?.location?.longitude ?? null,
      explicit: false,
    };
  }

  const chosen = clean(pref.city);
  const rec = lookupCityByName(chosen);
  return {
    city: chosen || null,
    latitude: rec?.lat ?? null,
    longitude: rec?.lng ?? null,
    explicit: true,
  };
}
