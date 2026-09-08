/**
 * Vendor Platform integration (spec sections 1, 25, 36–37).
 *
 * The customer app never owns vendor data — it reads the *real, live*
 * Camartes Vendor Platform catalog at `CAMARTES_API` and adapts it into the
 * `CustomerVendor` shape the matching/pricing engines consume. There is
 * deliberately no synthetic/mock vendor list: if the platform has zero
 * onboarded providers for a service (e.g. LED Wall / Web Live today), this
 * returns zero vendors for that capability rather than inventing any —
 * matching spec section 47 ("Never fabricate providers").
 *
 * On network failure the matching screen surfaces the error. An empty live
 * result stays empty — cached catalogs are not substituted in as if they were
 * matches for the current event.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomerVendor } from "@/src/types/vendor";

export const CAMARTES_API = "https://camartes-backend.onrender.com";
const VENDOR_CACHE_KEY = "camartes-customer:vendor-cache:v1";

const SEARCH_SERVICE_TYPES = ["photographer", "videographer", "photography_firm", "fly_cam", "led_wall", "web_live_services"];

type RawPricing = Record<string, number | null | undefined>;

type RawSearchHit = {
  user_id?: string;
  provider_id?: string;
  id?: string;
  display_name?: string;
  full_name?: string;
  city?: string;
  location?: string;
  service_type?: string;
  contact_phone?: string;
  avg_rating?: number;
  average_rating?: number;
  rating?: number;
  review_count?: number;
  years_experience?: number;
  is_available?: boolean;
  shooting_style?: string[];
  filmmaking_style?: string[];
  equipment?: string[];
  equipment_owned?: string[];
  kyc_verified?: boolean;
  coverage_areas?: string[];
  coverage_area?: string;
  service_areas?: string[];
  tagline?: string;
  projects_completed?: string;
  portfolio_items?: Array<{ image?: string }>;
  pricing?: RawPricing;
};

export type CatalogQuery = {
  city?: string | null;
  eventDate?: string | null;
  serviceTypes?: string[];
  latitude?: number | null;
  longitude?: number | null;
};

async function fetchServiceType(serviceType: string, query: CatalogQuery = {}): Promise<RawSearchHit[]> {
  const body: Record<string, unknown> = { service_type: serviceType };
  if (query.city?.trim()) body.city = query.city.trim();
  if (query.eventDate?.trim()) body.event_date = query.eventDate.trim();
  if (typeof query.latitude === "number") body.latitude = query.latitude;
  if (typeof query.longitude === "number") body.longitude = query.longitude;
  const res = await fetch(`${CAMARTES_API}/api/providers/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Camartes provider search failed (${res.status}) for ${serviceType}.`);
  }
  const rows = (await res.json()) as RawSearchHit[];
  return Array.isArray(rows) ? rows : [];
}

function extractDayRate(pricing: RawPricing | undefined): number | null {
  if (!pricing) return null;
  const direct = pricing.price_full_day ?? pricing.full_day_price ?? pricing.price_standard ?? pricing.package_price;
  if (typeof direct === "number" && direct > 0) return direct;
  const hourly = pricing.price_per_hour ?? pricing.hourly_price;
  if (typeof hourly === "number" && hourly > 0) return hourly * 8;
  return null;
}

function parseProjectsCompleted(raw: string | undefined): number {
  if (!raw) return 0;
  const match = raw.match(/(\d+)\s*-\s*(\d+)/);
  if (match) return Math.round((parseInt(match[1], 10) + parseInt(match[2], 10)) / 2);
  const single = raw.match(/(\d+)\+?/);
  return single ? parseInt(single[1], 10) : 0;
}

function ratingOf(hit: RawSearchHit): number | null {
  const r = hit.avg_rating || hit.average_rating || hit.rating;
  return r && r > 0 ? Math.round(r * 10) / 10 : null;
}

function idOf(hit: RawSearchHit): string | null {
  return hit.user_id || hit.provider_id || hit.id || null;
}

type Aggregate = {
  vendorId: string;
  name: string;
  city: string;
  phone?: string;
  about: string;
  experienceYears: number;
  ratingSum: number;
  ratingCount: number;
  reviewCount: number;
  completedProjects: number;
  isAvailable: boolean;
  kycVerified: boolean;
  serviceAreas: Set<string>;
  portfolio: string[];
  dayRates: number[];
  photographyTraditional: boolean;
  photographyCandid: boolean;
  videographyTraditional: boolean;
  videographyCandid: boolean;
  aerialPhotography: boolean;
  aerialVideography: boolean;
  ledWallAvailable: boolean;
  ledWallSizes: Set<string>;
  webLiveAvailable: boolean;
  webLiveQualities: Set<"HD" | "4K">;
};

function newAggregate(vendorId: string): Aggregate {
  return {
    vendorId,
    name: "",
    city: "",
    about: "",
    experienceYears: 0,
    ratingSum: 0,
    ratingCount: 0,
    reviewCount: 0,
    completedProjects: 0,
    isAvailable: true,
    kycVerified: false,
    serviceAreas: new Set(),
    portfolio: [],
    dayRates: [],
    photographyTraditional: false,
    photographyCandid: false,
    videographyTraditional: false,
    videographyCandid: false,
    aerialPhotography: false,
    aerialVideography: false,
    ledWallAvailable: false,
    ledWallSizes: new Set(),
    webLiveAvailable: false,
    webLiveQualities: new Set(),
  };
}

function mergeHit(acc: Aggregate, hit: RawSearchHit) {
  acc.name = acc.name || hit.display_name || hit.full_name || "Studio";
  acc.city = acc.city || hit.city || hit.location || "";
  acc.phone = acc.phone || hit.contact_phone || undefined;
  acc.about = acc.about || hit.tagline || "";
  acc.experienceYears = Math.max(acc.experienceYears, hit.years_experience ?? 0);
  const rating = ratingOf(hit);
  if (rating != null) {
    acc.ratingSum += rating;
    acc.ratingCount += 1;
  }
  acc.reviewCount += hit.review_count ?? 0;
  acc.completedProjects = Math.max(acc.completedProjects, parseProjectsCompleted(hit.projects_completed));
  if (hit.is_available === false) acc.isAvailable = false;
  if (hit.kyc_verified === true) acc.kycVerified = true;
  for (const area of hit.coverage_areas ?? []) acc.serviceAreas.add(area);
  if (hit.coverage_area) acc.serviceAreas.add(hit.coverage_area);
  for (const item of hit.portfolio_items ?? []) if (item.image) acc.portfolio.push(item.image);
  const dayRate = extractDayRate(hit.pricing);
  if (dayRate) acc.dayRates.push(dayRate);

  const equipment = [...(hit.equipment ?? []), ...(hit.equipment_owned ?? [])];
  const hasDrone = equipment.some((e) => e.toLowerCase().includes("drone"));

  if (hit.service_type === "photographer") {
    const styles = (hit.shooting_style ?? []).map((s) => s.toLowerCase());
    if (!styles.length) {
      acc.photographyTraditional = true;
      acc.photographyCandid = true;
    } else {
      acc.photographyTraditional = acc.photographyTraditional || styles.includes("traditional");
      acc.photographyCandid = acc.photographyCandid || styles.includes("candid");
    }
    if (hasDrone) acc.aerialPhotography = true;
  }
  if (hit.service_type === "videographer") {
    const styles = (hit.filmmaking_style ?? []).map((s) => s.toLowerCase());
    if (!styles.length) {
      acc.videographyTraditional = true;
      acc.videographyCandid = true;
    } else {
      acc.videographyTraditional = acc.videographyTraditional || styles.includes("traditional");
      acc.videographyCandid = acc.videographyCandid || styles.some((s) => s === "cinematic" || s === "candid" || s === "documentary");
    }
    if (hasDrone) acc.aerialVideography = true;
  }
  if (hit.service_type === "photography_firm") {
    // A full-service firm is assumed to cover both core styles unless the
    // catalog later exposes a more granular breakdown.
    acc.photographyTraditional = true;
    acc.photographyCandid = true;
    acc.videographyTraditional = true;
    acc.videographyCandid = true;
  }
  if (hit.service_type === "fly_cam") {
    acc.aerialPhotography = true;
    acc.aerialVideography = true;
  }
  if (hit.service_type === "led_wall") {
    acc.ledWallAvailable = true;
  }
  if (hit.service_type === "web_live_services" || hit.service_type === "live_stream") {
    acc.webLiveAvailable = true;
    acc.webLiveQualities.add("HD");
    acc.webLiveQualities.add("4K");
  }
}

function toCustomerVendor(acc: Aggregate, fetchedLive: boolean): CustomerVendor {
  const rating = acc.ratingCount ? Math.round((acc.ratingSum / acc.ratingCount) * 10) / 10 : 0;
  const basePricePerDay = acc.dayRates.length
    ? Math.round(acc.dayRates.reduce((a, b) => a + b, 0) / acc.dayRates.length)
    : 0;
  const completedBookings = acc.completedProjects || acc.reviewCount;

  return {
    vendorId: acc.vendorId,
    studioName: acc.name || "Studio",
    city: acc.city,
    area: acc.city,
    lat: 0,
    lng: 0,
    experienceYears: acc.experienceYears,
    rating,
    completedBookings,
    responseRatePct: 0,
    photography: {
      traditional: acc.photographyTraditional,
      candid: acc.photographyCandid,
      maxPhotographers: acc.photographyTraditional || acc.photographyCandid ? 4 : 0,
    },
    videography: {
      traditional: acc.videographyTraditional,
      candid: acc.videographyCandid,
      maxVideographers: acc.videographyTraditional || acc.videographyCandid ? 3 : 0,
    },
    aerial: {
      photography: acc.aerialPhotography,
      videography: acc.aerialVideography,
      maxDrones: acc.aerialPhotography || acc.aerialVideography ? 2 : 0,
    },
    ledWall: {
      available: acc.ledWallAvailable,
      sizes: [...acc.ledWallSizes],
      maxScreens: acc.ledWallAvailable ? 6 : 0,
    },
    webLive: {
      available: acc.webLiveAvailable,
      qualities: [...acc.webLiveQualities],
    },
    portfolioImages: acc.portfolio.slice(0, 12),
    about: acc.about || "Listed on the Camartes Vendor Platform.",
    serviceAreas: [...acc.serviceAreas],
    kycVerified: acc.kycVerified,
    liveSource: fetchedLive,
    basePricePerDay,
    listedAvailable: acc.isAvailable,
    contactMaskedUntilAccepted: true,
    phone: acc.phone,
  };
}

async function readCache(): Promise<CustomerVendor[]> {
  try {
    const raw = await AsyncStorage.getItem(VENDOR_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CustomerVendor[]) : [];
  } catch {
    return [];
  }
}

async function writeCache(vendors: CustomerVendor[]): Promise<void> {
  try {
    await AsyncStorage.setItem(VENDOR_CACHE_KEY, JSON.stringify(vendors));
  } catch {
    /* best-effort cache */
  }
}

export type VendorCatalogResult = {
  vendors: CustomerVendor[];
  live: boolean;
  fetchedAt: string;
};

/** Fetches every relevant service category from the live Camartes Vendor
 * Platform and returns one merged, deduped vendor per underlying provider. */
export async function fetchVendorCatalog(query: CatalogQuery = {}): Promise<VendorCatalogResult> {
  try {
    const types = query.serviceTypes?.length ? query.serviceTypes : SEARCH_SERVICE_TYPES;
    const results = await Promise.all(types.map((serviceType) => fetchServiceType(serviceType, query)));
    const byId = new Map<string, Aggregate>();

    results.forEach((hits) => {
      for (const hit of hits) {
        const id = idOf(hit);
        if (!id) continue;
        const acc = byId.get(id) ?? newAggregate(id);
        mergeHit(acc, hit);
        byId.set(id, acc);
      }
    });

    const vendors = [...byId.values()].map((acc) => toCustomerVendor(acc, true));

    if (vendors.length) {
      await writeCache(vendors);
    }
    return { vendors, live: true, fetchedAt: new Date().toISOString() };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Could not load providers from Camartes.");
  }
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length ? items : undefined;
}

function publicHitFromProfileRow(row: Record<string, unknown>, serviceType: string, fallbackId: string): RawSearchHit {
  const pricing = row.pricing && typeof row.pricing === "object" ? (row.pricing as RawPricing) : undefined;
  const portfolio = Array.isArray(row.portfolio_items)
    ? (row.portfolio_items as Array<{ image?: string }>).filter((item) => item && typeof item.image === "string")
    : undefined;
  return {
    user_id: typeof row.user_id === "string" ? row.user_id : fallbackId,
    provider_id: typeof row.provider_id === "string" ? row.provider_id : fallbackId,
    id: typeof row.id === "string" ? row.id : fallbackId,
    display_name: typeof row.display_name === "string" ? row.display_name : undefined,
    full_name: typeof row.full_name === "string" ? row.full_name : undefined,
    city: typeof row.city === "string" ? row.city : undefined,
    location: typeof row.location === "string" ? row.location : undefined,
    service_type: serviceType,
    avg_rating: typeof row.avg_rating === "number" ? row.avg_rating : undefined,
    average_rating: typeof row.average_rating === "number" ? row.average_rating : undefined,
    rating: typeof row.rating === "number" ? row.rating : undefined,
    review_count: typeof row.review_count === "number" ? row.review_count : undefined,
    years_experience: typeof row.years_experience === "number" ? row.years_experience : undefined,
    is_available: typeof row.is_available === "boolean" ? row.is_available : undefined,
    shooting_style: asStringArray(row.shooting_style),
    filmmaking_style: asStringArray(row.filmmaking_style),
    equipment: asStringArray(row.equipment),
    equipment_owned: asStringArray(row.equipment_owned),
    coverage_areas: asStringArray(row.coverage_areas),
    coverage_area: typeof row.coverage_area === "string" ? row.coverage_area : undefined,
    tagline: typeof row.tagline === "string" ? row.tagline : undefined,
    projects_completed: typeof row.projects_completed === "string" ? row.projects_completed : undefined,
    portfolio_items: portfolio,
    pricing,
  };
}

function hitsFromProviderProfile(raw: Record<string, unknown>): RawSearchHit[] {
  const id = String(raw.provider_id ?? raw.user_id ?? raw.id ?? "");
  const profiles = raw.service_profiles;
  const hits: RawSearchHit[] = [];
  if (profiles && typeof profiles === "object" && !Array.isArray(profiles)) {
    const entries = Object.entries(profiles as Record<string, unknown>);
    const hasCore = entries.some(([key]) => key === "photographer" || key === "videographer");
    for (const [key, value] of entries) {
      if (!value || typeof value !== "object") continue;
      if (key === "photography_firm" && hasCore) continue;
      const row = value as Record<string, unknown>;
      const serviceType = typeof row.service_type === "string" ? row.service_type : key;
      hits.push(publicHitFromProfileRow(row, serviceType, id));
    }
  }
  return hits;
}

export async function fetchVendorById(vendorId: string): Promise<CustomerVendor | null> {
  const res = await fetch(`${CAMARTES_API}/api/providers/${encodeURIComponent(vendorId)}`);
  if (!res.ok) {
    throw new Error(`Provider ${vendorId} could not be loaded (${res.status}).`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const hits = hitsFromProviderProfile(raw);
  const acc = newAggregate(vendorId);
  acc.name = String(raw.full_name ?? raw.name ?? "Studio");
  acc.city = typeof raw.city === "string" ? raw.city : "";
  acc.kycVerified = raw.kyc_verified === true;
  acc.isAvailable = raw.is_available !== false;
  const ratingRaw = raw.avg_rating ?? raw.average_rating ?? raw.rating;
  if (typeof ratingRaw === "number" && ratingRaw > 0) {
    acc.ratingSum += ratingRaw;
    acc.ratingCount += 1;
  }
  for (const hit of hits) mergeHit(acc, hit);
  return toCustomerVendor(acc, true);
}

/** Test helper: map raw catalog search hits with the same rules the live client uses. */
export function vendorsFromSearchHits(hits: RawSearchHit[], live = true): CustomerVendor[] {
  const byId = new Map<string, Aggregate>();
  for (const hit of hits) {
    const id = idOf(hit);
    if (!id) continue;
    const acc = byId.get(id) ?? newAggregate(id);
    mergeHit(acc, hit);
    byId.set(id, acc);
  }
  return [...byId.values()].map((acc) => toCustomerVendor(acc, live));
}
