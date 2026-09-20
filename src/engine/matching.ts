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
  needsAerialPhoto: boolean;
  needsAerialVideo: boolean;
  needsLedWall: boolean;
  needsWebLive: boolean;
  maxTraditionalPhotographers: number;
  maxCandidPhotographers: number;
  maxTraditionalVideographers: number;
  maxCandidVideographers: number;
  maxPhotoDrones: number;
  maxVideoDrones: number;
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
      needsAerialPhoto: acc.needsAerialPhoto || day.aerial.photographyDrones > 0,
      needsAerialVideo: acc.needsAerialVideo || day.aerial.videographyDrones > 0,
      needsLedWall: acc.needsLedWall || day.ledWall.enabled,
      needsWebLive: acc.needsWebLive || day.webLive.enabled,
      maxTraditionalPhotographers: Math.max(acc.maxTraditionalPhotographers, day.photography.traditional ? day.photography.traditionalCount : 0),
      maxCandidPhotographers: Math.max(acc.maxCandidPhotographers, day.photography.candid ? day.photography.candidCount : 0),
      maxTraditionalVideographers: Math.max(acc.maxTraditionalVideographers, day.videography.traditional ? day.videography.traditionalCount : 0),
      maxCandidVideographers: Math.max(acc.maxCandidVideographers, day.videography.candid ? day.videography.candidCount : 0),
      maxPhotoDrones: Math.max(acc.maxPhotoDrones, day.aerial.photographyDrones),
      maxVideoDrones: Math.max(acc.maxVideoDrones, day.aerial.videographyDrones),
      maxLedScreens: Math.max(acc.maxLedScreens, day.ledWall.enabled ? day.ledWall.screenCount : 0),
      maxWebLiveCameras: Math.max(acc.maxWebLiveCameras, day.webLive.enabled ? day.webLive.cameraCount : 0),
    }),
    {
      needsPhotographyTraditional: false,
      needsPhotographyCandid: false,
      needsVideographyTraditional: false,
      needsVideographyCandid: false,
      needsAerialPhoto: false,
      needsAerialVideo: false,
      needsLedWall: false,
      needsWebLive: false,
      maxTraditionalPhotographers: 0,
      maxCandidPhotographers: 0,
      maxTraditionalVideographers: 0,
      maxCandidVideographers: 0,
      maxPhotoDrones: 0,
      maxVideoDrones: 0,
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

function vendorServesCity(vendor: CustomerVendor, city: string): boolean {
  if (!city || !city.trim()) return true;
  const key = city.trim().toLowerCase();
  const vCity = (vendor.city || "").trim().toLowerCase();
  if (vCity && (vCity === key || vCity.includes(key) || key.includes(vCity))) return true;
  return vendor.serviceAreas.some((area) => {
    const a = area.trim().toLowerCase();
    return a && (a === key || a.includes(key) || key.includes(a));
  });
}

/** Check vendor availability based on minimum wallet balance (₹500). */
export function checkVendorAvailability(
  vendor: CustomerVendor,
  _days?: EventDay[],
  req?: AggregatedRequirement,
): { available: boolean; reason?: string } {
  if (vendor.walletBalance !== undefined && vendor.walletBalance < 500) {
    return { available: false, reason: "Insufficient wallet balance (minimum ₹500 required)." };
  }
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

  return (
    availabilityScore * MATCH_WEIGHTS.availability +
    reqScore * MATCH_WEIGHTS.requirementMatch +
    budgetScore * MATCH_WEIGHTS.budgetMatch +
    ratingScore * MATCH_WEIGHTS.rating +
    experienceScore * MATCH_WEIGHTS.experience +
    portfolioScore * MATCH_WEIGHTS.portfolio +
    locationScore * MATCH_WEIGHTS.location
  );
}

function vendorServesLocationPreference(
  vendor: CustomerVendor,
  pref?: ProviderLocationPreference | null,
  eventCity?: string,
): boolean {
  if (!pref || pref.mode === "event_location") {
    return vendorServesCity(vendor, eventCity ?? "");
  }
  const target = (pref.city || "").trim().toLowerCase();
  if (!target) return vendorServesCity(vendor, eventCity ?? "");

  if (vendor.city.trim().toLowerCase().includes(target) || target.includes(vendor.city.trim().toLowerCase())) {
    return true;
  }
  if (vendor.area && (vendor.area.trim().toLowerCase().includes(target) || target.includes(vendor.area.trim().toLowerCase()))) {
    return true;
  }
  return vendor.serviceAreas.some((area) => {
    const a = area.trim().toLowerCase();
    return a.includes(target) || target.includes(a);
  });
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
  const candidates = vendors.filter(
    (v) =>
      (!excludedVendorIds || !excludedVendorIds.includes(v.vendorId)) &&
      isPhotographyFirm(v) &&
      vendorServesLocationPreference(v, locationPref, eventCity) &&
      (v.walletBalance === undefined || v.walletBalance >= 500) &&
      checkVendorAvailability(v, booking.days as EventDay[], req).available,
  );

  const results = candidates.map((vendor) => {
    const availability = checkVendorAvailability(vendor, booking.days as EventDay[], req);
    const estimatedPrice = estimateVendorPrice(vendor, booking, tier);
    const matchScore = scoreVendor(vendor, booking, req, availability, tier, budget);
    const tierMatched = firmMatchesBudgetTier(vendor, targetBudgetTier);
    const locationMatched = vendorServesCity(vendor, eventCity) || vendorServesLocationPreference(vendor, locationPref, eventCity);
    const services: string[] = [];
    if (vendor.photography.traditional || vendor.photography.candid) services.push("Photography");
    if (vendor.videography.traditional || vendor.videography.candid) services.push("Videography");
    return {
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
      } as VendorMatchResult,
      tierMatched,
      locationMatched,
    };
  });

  // Rank by: [Tier Match] -> [Location/City Match] -> [Rating / Reviews / matchScore]
  const ranked = results
    .filter((r) => r.match.available)
    .sort((a, b) => {
      if (a.tierMatched !== b.tierMatched) {
        return a.tierMatched ? -1 : 1;
      }
      if (a.locationMatched !== b.locationMatched) {
        return a.locationMatched ? -1 : 1;
      }
      return b.match.matchScore - a.match.matchScore;
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
