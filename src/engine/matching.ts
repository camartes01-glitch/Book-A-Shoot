/**
 * Vendor matching engine (spec sections 25–29, 37, 45, "Vendor Matching
 * Engine" / "Vendor Ranking").
 *
 * Vendor *capability, rating, experience and pricing* data comes from the
 * real Camartes Vendor Platform (`src/services/vendorApi.ts`). Calendar
 * availability uses the catalog `is_available` flag when present. Do not
 * invent per-date booking calendars here.
 */
import type { Booking, EventDay, PackageTierId, ProviderLocationPreference, VendorMatchResult } from "@/src/types/booking";
import type { CustomerVendor } from "@/src/types/vendor";

export const MAX_MATCHES = 6;
export const MAX_CONCURRENT_LEADS = 3;

/**
 * The "Fair-Queue" Gauge (The Hunger Score).
 * Studios with 0 leads today get highest priority (1.50x),
 * studios with 1 lead today get 1.00x, 2 leads get 0.75x, etc.
 * Idle wait bonus: if last dispatch was > 6 hours ago, adds +0.10.
 */
export function calculateFairQueueBoost(vendor: CustomerVendor): number {
  const leadsToday = Math.max(0, vendor.leadsToday ?? 0);
  const baseHunger = 1.5 / (1.0 + 0.5 * leadsToday);

  let idleBonus = 0;
  if (vendor.lastLeadDispatchedAt) {
    const elapsedMs = Date.now() - new Date(vendor.lastLeadDispatchedAt).getTime();
    if (!isNaN(elapsedMs) && elapsedMs > 6 * 3600 * 1000) {
      idleBonus = 0.1;
    }
  }

  return baseHunger + idleBonus;
}

export const MATCH_WEIGHTS = {
  availability: 0.3,
  requirementMatch: 0.25,
  budgetMatch: 0.15,
  rating: 0.1,
  experience: 0.1,
  portfolio: 0.05,
  location: 0.05,
};

export function simulateVendorCalendarAvailability(_vendorId: string, _dateIso: string): number {
  // Kept for existing tests that call this helper directly. Matching no longer
  // uses a hashed stand-in calendar — live catalog `listedAvailable` is the gate.
  return 1;
}

type AggregatedRequirement = {
  needsPhotographyTraditional: boolean;
  needsPhotographyCandid: boolean;
  needsVideographyTraditional: boolean;
  needsVideographyCandid: boolean;
  needsAerial: boolean;
  needsLedWall: boolean;
  needsWebLive: boolean;
  maxTraditionalPhotographers: number;
  maxCandidPhotographers: number;
  maxTraditionalVideographers: number;
  maxCandidVideographers: number;
  maxDrones: number;
  maxLedScreens: number;
  maxWebLiveCameras: number;
};

/** One vendor must be available across every event day (spec section 29's
 * recommended initial rule), so we take the *peak* requirement across days. */
export function aggregateRequirement(days: EventDay[]): AggregatedRequirement {
  return days.reduce<AggregatedRequirement>(
    (acc, day) => ({
      needsPhotographyTraditional: acc.needsPhotographyTraditional || day.photography.traditional,
      needsPhotographyCandid: acc.needsPhotographyCandid || day.photography.candid,
      needsVideographyTraditional: acc.needsVideographyTraditional || day.videography.traditional,
      needsVideographyCandid: acc.needsVideographyCandid || day.videography.candid,
      needsAerial: acc.needsAerial || day.aerial.drones > 0,
      needsLedWall: acc.needsLedWall || day.ledWall.enabled,
      needsWebLive: acc.needsWebLive || day.webLive.enabled,
      maxTraditionalPhotographers: Math.max(acc.maxTraditionalPhotographers, day.photography.traditional ? day.photography.traditionalCount : 0),
      maxCandidPhotographers: Math.max(acc.maxCandidPhotographers, day.photography.candid ? day.photography.candidCount : 0),
      maxTraditionalVideographers: Math.max(acc.maxTraditionalVideographers, day.videography.traditional ? day.videography.traditionalCount : 0),
      maxCandidVideographers: Math.max(acc.maxCandidVideographers, day.videography.candid ? day.videography.candidCount : 0),
      maxDrones: Math.max(acc.maxDrones, day.aerial.drones),
      maxLedScreens: Math.max(acc.maxLedScreens, day.ledWall.enabled ? day.ledWall.screenCount : 0),
      maxWebLiveCameras: Math.max(acc.maxWebLiveCameras, day.webLive.enabled ? day.webLive.cameraCount : 0),
    }),
    {
      needsPhotographyTraditional: false,
      needsPhotographyCandid: false,
      needsVideographyTraditional: false,
      needsVideographyCandid: false,
      needsAerial: false,
      needsLedWall: false,
      needsWebLive: false,
      maxTraditionalPhotographers: 0,
      maxCandidPhotographers: 0,
      maxTraditionalVideographers: 0,
      maxCandidVideographers: 0,
      maxDrones: 0,
      maxLedScreens: 0,
      maxWebLiveCameras: 0,
    },
  );
}

export type BudgetTier = "basic" | "medium" | "elite";

export function getCustomerBudgetTier(budget: number): BudgetTier {
  if (budget < 200000) return "basic";
  if (budget <= 500000) return "medium";
  return "elite";
}

export function firmMatchesBudgetTier(firm: CustomerVendor, targetTier: BudgetTier): boolean {
  if (!firm.budgetPreference || firm.budgetPreference.length === 0) {
    return true;
  }
  return firm.budgetPreference.some((tier) => tier.toLowerCase().trim() === targetTier);
}

export function isPhotographyFirm(vendor: CustomerVendor): boolean {
  const serviceType = vendor.serviceType?.toLowerCase().trim();
  if (!serviceType) return true;
  const nonFirmTypes = [
    "photographer",
    "videographer",
    "drone_operator",
    "drone_pilot",
    "fly_cam",
    "editor",
    "album_designer",
    "solo_photographer",
    "solo_videographer",
  ];
  if (nonFirmTypes.includes(serviceType)) {
    return false;
  }
  return true;
}

function vendorHasCapabilities(vendor: CustomerVendor, req: AggregatedRequirement): boolean {
  if (req.needsPhotographyTraditional && !vendor.photography.traditional) return false;
  if (req.needsPhotographyCandid && !vendor.photography.candid) return false;
  if (req.needsVideographyTraditional && !vendor.videography.traditional) return false;
  if (req.needsVideographyCandid && !vendor.videography.candid) return false;
  if (
    vendor.photography.maxPhotographers !== undefined &&
    req.maxTraditionalPhotographers > vendor.photography.maxPhotographers
  ) {
    return false;
  }
  if (
    vendor.videography.maxVideographers !== undefined &&
    req.maxTraditionalVideographers > vendor.videography.maxVideographers
  ) {
    return false;
  }
  return true;
}

const HYD_METRO_KEYWORDS = [
  "hyderabad",
  "secunderabad",
  "hyd",
  "secunder",
  "cyberabad",
  "gachibowli",
  "madhapur",
  "kondapur",
  "hitec",
  "kukatpally",
  "banjara",
  "jubilee",
  "begumpet",
  "ameerpet",
  "somajiguda",
  "manikonda",
  "miyapur",
  "nanakramguda",
  "dilsukhnagar",
  "uppal",
  "alwal",
  "kompally",
  "ranga reddy",
  "rangareddy",
  "medchal",
  "shamshabad",
  "mehdipatnam",
  "tolichowki",
  "lingampally",
  "chandanagar",
];

export function isTwinCity(city: string): boolean {
  const c = (city || "").trim().toLowerCase();
  return HYD_METRO_KEYWORDS.some((kw) => c.includes(kw));
}

export function isCityMatch(targetCity: string, candidateCityOrArea: string): boolean {
  if (!targetCity || !targetCity.trim()) return true;
  const target = targetCity.trim().toLowerCase();
  const candidate = (candidateCityOrArea || "").trim().toLowerCase();
  if (!candidate) return false;

  if (target === candidate || target.includes(candidate) || candidate.includes(target)) {
    return true;
  }

  // Twin city equivalence: Hyderabad and Secunderabad are twin cities and serve both locations
  if (isTwinCity(target) && isTwinCity(candidate)) {
    return true;
  }

  return false;
}

function vendorServesCity(vendor: CustomerVendor, city: string): boolean {
  if (!city || !city.trim()) return true;
  const target = city.trim();
  const vCity = vendor.city || "";
  if (vCity && isCityMatch(target, vCity)) return true;
  return vendor.serviceAreas.some((area) => isCityMatch(target, area));
}

/** Check vendor availability based on required capabilities. */
export function checkVendorAvailability(
  vendor: CustomerVendor,
  _days?: EventDay[],
  req?: AggregatedRequirement,
): { available: boolean; reason?: string } {
  if (req && !vendorHasCapabilities(vendor, req)) {
    return { available: false, reason: "Doesn't offer all requested services." };
  }
  return { available: true };
}

function requirementMatchScore(_vendor: CustomerVendor, _req: AggregatedRequirement): number {
  return 1;
}

/** Catalog full-day price only. Never derived from package ranges. */
export function estimateVendorPrice(
  vendor: CustomerVendor,
  _booking?: Pick<Booking, "days" | "deliverables">,
  _tier?: PackageTierId,
): number {
  return vendor.basePricePerDay > 0 ? Math.round(vendor.basePricePerDay) : 0;
}

export function scoreVendor(
  vendor: CustomerVendor,
  booking: Pick<Booking, "days" | "deliverables">,
  req: AggregatedRequirement,
  availability: { available: boolean },
  tier: PackageTierId,
  budget: number,
): number {
  const availabilityScore = availability.available ? 1 : 0;
  const reqScore = requirementMatchScore(vendor, req);
  const estimatedPrice = estimateVendorPrice(vendor, booking, tier);
  const budgetScore = budget > 0 ? Math.max(0, 1 - Math.abs(estimatedPrice - budget) / budget) : 0.5;
  const ratingScore = vendor.rating / 5;
  const experienceScore = Math.min(1, vendor.experienceYears / 15);
  const portfolioScore = vendor.portfolioImages.length > 0 ? 1 : 0.4;
  const eventCity = booking.days[0]?.location.city ?? "";
  const locationScore = vendorServesCity(vendor, eventCity) ? 1 : 0.3;

  const baseScore =
    availabilityScore * MATCH_WEIGHTS.availability +
    reqScore * MATCH_WEIGHTS.requirementMatch +
    budgetScore * MATCH_WEIGHTS.budgetMatch +
    ratingScore * MATCH_WEIGHTS.rating +
    experienceScore * MATCH_WEIGHTS.experience +
    portfolioScore * MATCH_WEIGHTS.portfolio +
    locationScore * MATCH_WEIGHTS.location;

  const fairQueueBoost = calculateFairQueueBoost(vendor);
  return Math.round(baseScore * fairQueueBoost * 1000) / 1000;
}

function vendorServesLocationPreference(
  vendor: CustomerVendor,
  pref?: ProviderLocationPreference | null,
  eventCity?: string,
): boolean {
  if (!pref || pref.mode === "event_location") {
    return vendorServesCity(vendor, eventCity ?? "");
  }
  const target = (pref.city || "").trim();
  if (!target) return vendorServesCity(vendor, eventCity ?? "");

  if (isCityMatch(target, vendor.city)) {
    return true;
  }
  if (vendor.area && isCityMatch(target, vendor.area)) {
    return true;
  }
  return vendor.serviceAreas.some((area) => isCityMatch(target, area));
}

export function matchVendors(
  booking: Pick<Booking, "days" | "deliverables" | "providerLocationPreference">,
  vendors: CustomerVendor[],
  tier: PackageTierId,
  budget: number,
  excludedVendorIds?: string[],
): VendorMatchResult[] {
  const req = aggregateRequirement(booking.days as EventDay[]);
  const eventCity = booking.days[0]?.location.city ?? "";
  const locationPref = booking.providerLocationPreference;
  const targetBudgetTier = getCustomerBudgetTier(budget);

  // Filter for photography firms:
  // Strictly filter only by:
  // 1. Photography firm exclusivity
  // 2. Location preference / Event city
  // 3. Active wallet balance (balance >= 500)
  // Add-ons (LED walls, drones, etc.) NEVER filter out photography firms!
    // Filter for photography firms:
  // Strictly filter only by:
  // 1. Photography firm exclusivity
  // 2. Location preference / Event city
  // (Wallet balance is NOT filtered out - requests are dispatched to all qualified studios,
  // studios with < 500 balance receive it in a locked state).
  // Add-ons (LED walls, drones, etc.) NEVER filter out photography firms!
  // Active Concurrency Cap: Studios with >= MAX_CONCURRENT_LEADS (3) active pending leads
  // are temporarily skipped to prevent overloading and give other studios an equal opportunity.
  const candidates = vendors.filter(
    (v) =>
      (!excludedVendorIds || !excludedVendorIds.includes(v.vendorId)) &&
      isPhotographyFirm(v) &&
      vendorServesLocationPreference(v, locationPref, eventCity) &&
      ((v.activePendingLeads ?? 0) < MAX_CONCURRENT_LEADS) &&
      checkVendorAvailability(v, booking.days as EventDay[], req).available,
  );

  const results = candidates.map((vendor) => {
    const availability = checkVendorAvailability(vendor, booking.days as EventDay[], req);
    const isLocked = vendor.walletBalance !== undefined && vendor.walletBalance < 500;
    const hasMinBalance = !isLocked;
    const estimatedPrice = estimateVendorPrice(vendor, booking, tier);
    const matchScore = scoreVendor(vendor, booking, req, availability, tier, budget);
    const tierMatched = firmMatchesBudgetTier(vendor, targetBudgetTier);
    const locationMatched = vendorServesCity(vendor, eventCity) || vendorServesLocationPreference(vendor, locationPref, eventCity);
    const services: string[] = [];
    if (vendor.photography.traditional || vendor.photography.candid) services.push("Photography");
    if (vendor.videography.traditional || vendor.videography.candid) services.push("Videography");
    return {
      vendor,
      match: {
        vendorId: vendor.vendorId,
        studioName: vendor.studioName,
        city: vendor.city,
        rating: vendor.rating,
        experienceYears: vendor.experienceYears,
        completedBookings: vendor.completedBookings,
        available: availability.available,
        unavailableReason: availability.reason,
        estimatedPrice,
        matchScore,
        imageUrl: vendor.portfolioImages[0] || undefined,
        area: vendor.area || undefined,
        serviceCategory: services.join(" · ") || undefined,
        contactMasked: true,
        isStudio: true,
        isFirm: true,
        budgetPreference: vendor.budgetPreference,
        walletBalance: vendor.walletBalance,
        isLocked,
        hasMinBalance,
      } as VendorMatchResult,
      tierMatched,
      locationMatched,
    };
  });

  // Rank by: [Tier Match] -> [Location/City Match] -> [Fair-Queue matchScore] -> [Idle Time]
  const ranked = results
    .filter((r) => r.match.available)
    .sort((a, b) => {
      if (a.tierMatched !== b.tierMatched) {
        return a.tierMatched ? -1 : 1;
      }
      if (a.locationMatched !== b.locationMatched) {
        return a.locationMatched ? -1 : 1;
      }
      if (Math.abs(b.match.matchScore - a.match.matchScore) > 0.0001) {
        return b.match.matchScore - a.match.matchScore;
      }
      const aTime = a.vendor.lastLeadDispatchedAt ? new Date(a.vendor.lastLeadDispatchedAt).getTime() : 0;
      const bTime = b.vendor.lastLeadDispatchedAt ? new Date(b.vendor.lastLeadDispatchedAt).getTime() : 0;
      return aTime - bTime;
    });

  const seenIds = new Set<string>();
  const uniqueMatches: VendorMatchResult[] = [];
  for (const r of ranked) {
    if (!seenIds.has(r.match.vendorId)) {
      seenIds.add(r.match.vendorId);
      uniqueMatches.push(r.match);
      if (uniqueMatches.length >= MAX_MATCHES) break;
    }
  }

  return uniqueMatches;
}
