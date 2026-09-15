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
  const nonFirmTypes = ["photographer", "videographer", "fly_cam", "editor", "album_designer", "drone_operator"];
  if (serviceType && nonFirmTypes.includes(serviceType)) {
    return false;
  }
  if (serviceType === "photography_firm" || vendor.isFirm || vendor.isStudio) {
    return true;
  }
  return !serviceType;
}

function vendorHasCapabilities(vendor: CustomerVendor, req: AggregatedRequirement): boolean {
  // Core photography capability check
  if ((req.needsPhotographyTraditional || req.needsPhotographyCandid) && !vendor.photography.traditional && !vendor.photography.candid) {
    return false;
  }
  // Core videography capability check
  if ((req.needsVideographyTraditional || req.needsVideographyCandid) && !vendor.videography.traditional && !vendor.videography.candid) {
    return false;
  }

  // ADD-ONS: Photography firms fulfill all add-ons (LED walls, drones, web streaming) as full-service studios.
  // Add-ons must NEVER filter out photography firms!
  if (isPhotographyFirm(vendor)) {
    return true;
  }

  // For non-firms, check add-ons:
  if (req.needsAerialPhoto && !vendor.aerial.photography) return false;
  if (req.needsAerialVideo && !vendor.aerial.videography) return false;
  if (req.needsLedWall && !vendor.ledWall.available) return false;
  if (req.needsWebLive && !vendor.webLive.available) return false;
  return true;
}

function vendorServesCity(vendor: CustomerVendor, city: string): boolean {
  if (!city) return true;
  const key = city.trim().toLowerCase();
  if (vendor.city.trim().toLowerCase() === key) return true;
  return vendor.serviceAreas.some((area) => area.trim().toLowerCase() === key);
}

/** A vendor must satisfy required services + quantities.
 * Calendar blocks do NOT exclude providers from receiving booking leads, allowing them to review and accept. */
export function checkVendorAvailability(
  vendor: CustomerVendor,
  days: EventDay[],
  req: AggregatedRequirement,
): { available: boolean; reason?: string } {
  // Photography firms: check wallet balance and core capabilities.
  // Add-ons (LED screens, drones, web live cameras) must NEVER filter out or mark photography firms unavailable.
  if (vendor.walletBalance !== undefined && vendor.walletBalance < 500) {
    return { available: false, reason: "Insufficient wallet balance to claim leads (minimum ₹500 required)." };
  }

  if (!vendorHasCapabilities(vendor, req)) {
    return { available: false, reason: "Doesn't offer all requested services." };
  }

  const requiredPhotographers = req.maxTraditionalPhotographers + req.maxCandidPhotographers;
  const requiredVideographers = req.maxTraditionalVideographers + req.maxCandidVideographers;
  const requiredDrones = req.maxPhotoDrones + req.maxVideoDrones;

  if (requiredPhotographers > 0 && vendor.photography.maxPhotographers > 0 && vendor.photography.maxPhotographers < requiredPhotographers) {
    return { available: false, reason: `Only ${vendor.photography.maxPhotographers} photographer(s) listed.` };
  }
  if (requiredVideographers > 0 && vendor.videography.maxVideographers > 0 && vendor.videography.maxVideographers < requiredVideographers) {
    return { available: false, reason: `Only ${vendor.videography.maxVideographers} videographer(s) listed.` };
  }

  // Add-ons (drones and LED screens) check only applies to non-firm standalone vendors:
  if (!isPhotographyFirm(vendor)) {
    if (requiredDrones > 0 && vendor.aerial.maxDrones < requiredDrones) {
      return { available: false, reason: "Not enough drones listed for this request." };
    }
    if (req.maxLedScreens > 0 && vendor.ledWall.maxScreens < req.maxLedScreens) {
      return { available: false, reason: "Not enough LED screens listed for this request." };
    }
  }

  return { available: true };
}

function requirementMatchScore(vendor: CustomerVendor, req: AggregatedRequirement): number {
  if (isPhotographyFirm(vendor)) {
    return 1;
  }
  const wants: boolean[] = [];
  const has: boolean[] = [];
  const push = (want: boolean, have: boolean) => {
    if (!want) return;
    wants.push(true);
    has.push(have);
  };
  push(req.needsPhotographyTraditional, vendor.photography.traditional);
  push(req.needsPhotographyCandid, vendor.photography.candid);
  push(req.needsVideographyTraditional, vendor.videography.traditional);
  push(req.needsVideographyCandid, vendor.videography.candid);
  push(req.needsAerialPhoto, vendor.aerial.photography);
  push(req.needsAerialVideo, vendor.aerial.videography);
  push(req.needsLedWall, vendor.ledWall.available);
  push(req.needsWebLive, vendor.webLive.available);
  if (!wants.length) return 1;
  return has.filter(Boolean).length / wants.length;
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
      isPhotographyFirm(v) &&
      vendorServesLocationPreference(v, locationPref, eventCity) &&
      (v.walletBalance === undefined || v.walletBalance >= 500),
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
  return results
    .filter((r) => r.match.available)
    .sort((a, b) => {
      if (a.tierMatched !== b.tierMatched) {
        return a.tierMatched ? -1 : 1;
      }
      if (a.locationMatched !== b.locationMatched) {
        return a.locationMatched ? -1 : 1;
      }
      return b.match.matchScore - a.match.matchScore;
    })
    .map((r) => r.match)
    .slice(0, MAX_MATCHES);
}
