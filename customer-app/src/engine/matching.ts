/**
 * Vendor matching engine (spec sections 25–29, 37, 45, "Vendor Matching
 * Engine" / "Vendor Ranking").
 *
 * Vendor *capability, rating, experience and pricing* data comes from the
 * real Camartes Vendor Platform (`src/services/vendorApi.ts`). The one piece
 * the public catalog API does not expose today is a per-date booking
 * calendar, so `simulateVendorCalendarAvailability` deterministically derives
 * a stand-in from the vendor id + date (same vendor + date always returns the
 * same result — nothing is re-randomized per render). It is isolated in one
 * function specifically so it can be replaced with a real
 * `GET /api/vendors/{id}/availability?date=...` call the moment that
 * endpoint exists, without touching any ranking logic below.
 */
import type { Booking, EventDay, PackageTierId, VendorMatchResult } from "@/src/types/booking";
import type { CustomerVendor } from "@/src/types/vendor";
import { estimateBookingCost, PRICING_CONFIG } from "@/src/engine/pricing";

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

function hashToUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export function simulateVendorCalendarAvailability(vendorId: string, dateIso: string): number {
  // Returns a remaining-capacity factor in [0.45, 1] for the given date.
  return 0.45 + hashToUnit(`${vendorId}:${dateIso}`) * 0.55;
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

function vendorHasCapabilities(vendor: CustomerVendor, req: AggregatedRequirement): boolean {
  if (req.needsPhotographyTraditional && !vendor.photography.traditional) return false;
  if (req.needsPhotographyCandid && !vendor.photography.candid) return false;
  if (req.needsVideographyTraditional && !vendor.videography.traditional) return false;
  if (req.needsVideographyCandid && !vendor.videography.candid) return false;
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

/** Rule 11: a vendor must satisfy required services + quantities + calendar
 * availability across every event day before it can be marked "Available". */
export function checkVendorAvailability(
  vendor: CustomerVendor,
  days: EventDay[],
  req: AggregatedRequirement,
): { available: boolean; reason?: string } {
  if (!vendorHasCapabilities(vendor, req)) {
    return { available: false, reason: "Doesn't offer all requested services." };
  }

  for (const day of days) {
    if (!day.eventDate) continue;
    const factor = simulateVendorCalendarAvailability(vendor.vendorId, day.eventDate);
    const availPhotographers = Math.floor(vendor.photography.maxPhotographers * factor);
    const availVideographers = Math.floor(vendor.videography.maxVideographers * factor);
    const availDrones = Math.floor(vendor.aerial.maxDrones * factor);
    const availScreens = Math.floor(vendor.ledWall.maxScreens * factor);

    const requiredPhotographers = req.maxTraditionalPhotographers + req.maxCandidPhotographers;
    const requiredVideographers = req.maxTraditionalVideographers + req.maxCandidVideographers;
    const requiredDrones = req.maxPhotoDrones + req.maxVideoDrones;

    if (requiredPhotographers > 0 && availPhotographers < requiredPhotographers) {
      return { available: false, reason: `Only ${availPhotographers} photographer(s) free on ${day.eventDate}.` };
    }
    if (requiredVideographers > 0 && availVideographers < requiredVideographers) {
      return { available: false, reason: `Only ${availVideographers} videographer(s) free on ${day.eventDate}.` };
    }
    if (requiredDrones > 0 && availDrones < requiredDrones) {
      return { available: false, reason: `Not enough drones free on ${day.eventDate}.` };
    }
    if (req.maxLedScreens > 0 && availScreens < req.maxLedScreens) {
      return { available: false, reason: `Not enough LED screens free on ${day.eventDate}.` };
    }
    if (factor < 0.5 && (requiredPhotographers > 0 || requiredVideographers > 0)) {
      return { available: false, reason: `Fully booked on ${day.eventDate}.` };
    }
  }

  return { available: true };
}

function requirementMatchScore(vendor: CustomerVendor, req: AggregatedRequirement): number {
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

const AVERAGE_BASE_PRICE_PER_DAY = 18000;

export function estimateVendorPrice(vendor: CustomerVendor, booking: Pick<Booking, "days" | "deliverables">, tier: PackageTierId): number {
  const baseline = estimateBookingCost(booking);
  const band = PRICING_CONFIG.tierBands[tier];
  const mid = baseline * ((band.min + band.max) / 2);
  const vendorFactor = Math.min(1.25, Math.max(0.85, vendor.basePricePerDay / AVERAGE_BASE_PRICE_PER_DAY));
  return Math.round(mid * vendorFactor);
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

export function matchVendors(
  booking: Pick<Booking, "days" | "deliverables">,
  vendors: CustomerVendor[],
  tier: PackageTierId,
  budget: number,
): VendorMatchResult[] {
  const req = aggregateRequirement(booking.days as EventDay[]);
  const eventCity = booking.days[0]?.location.city ?? "";

  const candidates = vendors.filter((v) => vendorHasCapabilities(v, req) && vendorServesCity(v, eventCity));

  const results: VendorMatchResult[] = candidates.map((vendor) => {
    const availability = checkVendorAvailability(vendor, booking.days as EventDay[], req);
    const estimatedPrice = estimateVendorPrice(vendor, booking, tier);
    const matchScore = scoreVendor(vendor, booking, req, availability, tier, budget);
    return {
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
    };
  });

  // Rule 11 / spec section 26: only truly available vendors are offered up.
  return results
    .filter((r) => r.available)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, MAX_MATCHES);
}
