/**
 * Package / pricing engine (spec sections 22–24, 43–44, "Budget Intelligence"
 * and "Package Generation Logic").
 *
 * IMPORTANT: `PRICING_CONFIG` below stands in for the Camartes Vendor
 * Platform's pricing rules. In production this must be fetched from the
 * backend (e.g. `GET /api/admin/pricing-rules`) — never hard-coded into the
 * mobile app, per the spec's explicit instruction. It is kept as a single
 * exported, swappable config object for exactly that reason: replacing this
 * module's data source does not require touching any call site.
 */
import type { Booking, Deliverables, EventDay, PackageOption, PackageTierId } from "@/src/types/booking";
import { durationMinutes } from "@/src/utils/dateTime";

export const PRICING_CONFIG = {
  standardDayMinutes: 8 * 60,
  photographer: { traditional: 12000, candid: 16000 },
  videographer: { traditional: 15000, candid: 19000 },
  extraHourRatePerPerson: 1200,
  drone: { photography: 8000, videography: 10000 },
  ledWall: {
    perScreenBase: { "6 x 8": 6000, "8 x 12": 9000, "12 x 16": 13000 } as Record<string, number>,
    defaultBase: 8000,
  },
  webLive: { HD: 12000, "4K": 20000, perExtraCamera: 3000 } as Record<string, number>,
  deliverables: {
    rawPhotosFee: 5000,
    editedPhoto: 60,
    albumPage: 800,
    rawVideoFee: 8000,
    editedTraditionalVideo: 6000,
    editedCinematicVideo: 15000,
  },
  metroCities: ["hyderabad", "bengaluru", "bangalore", "mumbai", "chennai", "pune", "delhi", "secunderabad"],
  metroMultiplier: 1.12,
  nonMetroMultiplier: 0.95,
  tierBands: {
    essential: { min: 0.78, max: 0.9 },
    signature: { min: 0.93, max: 1.08 },
    elite: { min: 1.15, max: 1.35 },
  },
};

function dayDurationCostFactor(day: EventDay): number {
  if (!day.startTime || !day.endTime) return 1;
  const minutes = durationMinutes(day.startTime, day.endTime, day.overnight);
  if (minutes <= PRICING_CONFIG.standardDayMinutes) return 1;
  return minutes / PRICING_CONFIG.standardDayMinutes;
}

function cityMultiplier(city: string): number {
  const key = city.trim().toLowerCase();
  return PRICING_CONFIG.metroCities.includes(key) ? PRICING_CONFIG.metroMultiplier : PRICING_CONFIG.nonMetroMultiplier;
}

export function estimateDayCost(day: EventDay): number {
  const factor = dayDurationCostFactor(day);
  let cost = 0;

  if (day.photography.traditional) {
    cost += PRICING_CONFIG.photographer.traditional * day.photography.traditionalCount * factor;
  }
  if (day.photography.candid) {
    cost += PRICING_CONFIG.photographer.candid * day.photography.candidCount * factor;
  }
  if (day.videography.traditional) {
    cost += PRICING_CONFIG.videographer.traditional * day.videography.traditionalCount * factor;
  }
  if (day.videography.candid) {
    cost += PRICING_CONFIG.videographer.candid * day.videography.candidCount * factor;
  }
  if (day.aerial.photographyDrones > 0) {
    cost += PRICING_CONFIG.drone.photography * day.aerial.photographyDrones;
  }
  if (day.aerial.videographyDrones > 0) {
    cost += PRICING_CONFIG.drone.videography * day.aerial.videographyDrones;
  }
  if (day.ledWall.enabled) {
    const base = PRICING_CONFIG.ledWall.perScreenBase[day.ledWall.size] ?? PRICING_CONFIG.ledWall.defaultBase;
    cost += base * day.ledWall.screenCount;
  }
  if (day.webLive.enabled) {
    const base = PRICING_CONFIG.webLive[day.webLive.quality] ?? PRICING_CONFIG.webLive.HD;
    const extraCameras = Math.max(0, day.webLive.cameraCount - 1);
    cost += base + extraCameras * PRICING_CONFIG.webLive.perExtraCamera;
  }

  return cost * cityMultiplier(day.location.city || "");
}

export function estimateDeliverablesCost(deliverables: Deliverables): number {
  const { photo, video } = deliverables;
  let cost = 0;
  if (photo.rawPhotos) cost += PRICING_CONFIG.deliverables.rawPhotosFee;
  const editedCount =
    photo.editedPhotosOption === "custom" ? photo.editedPhotosCustomCount ?? 0 : parseInt(photo.editedPhotosOption, 10);
  cost += editedCount * PRICING_CONFIG.deliverables.editedPhoto;
  if (photo.album) {
    const pages =
      photo.albumPagesOption === "custom" ? photo.albumPagesCustomCount ?? 0 : parseInt(photo.albumPagesOption ?? "0", 10);
    cost += pages * PRICING_CONFIG.deliverables.albumPage;
  }
  if (video.rawVideo) cost += PRICING_CONFIG.deliverables.rawVideoFee;
  cost += video.editedTraditionalVideoCount * PRICING_CONFIG.deliverables.editedTraditionalVideo;
  cost += video.editedCinematicVideoCount * PRICING_CONFIG.deliverables.editedCinematicVideo;
  return cost;
}

export function estimateBookingCost(booking: Pick<Booking, "days" | "deliverables">): number {
  const daysCost = booking.days.reduce((sum, day) => sum + estimateDayCost(day), 0);
  return Math.round(daysCost + estimateDeliverablesCost(booking.deliverables));
}

const TIER_META: Record<PackageTierId, { label: string; headline: string }> = {
  essential: { label: "Essential", headline: "For customers focused on core coverage." },
  signature: { label: "Signature", headline: "Balanced package with stronger coverage and deliverables." },
  elite: { label: "Elite", headline: "Highest recommended coverage and production level." },
};

function bulletsFor(tier: PackageTierId, booking: Pick<Booking, "days" | "deliverables">): string[] {
  const bullets: string[] = [];
  const anyPhotography = booking.days.some((d) => d.photography.traditional || d.photography.candid);
  const anyVideography = booking.days.some((d) => d.videography.traditional || d.videography.candid);
  const addOns = booking.days.some(
    (d) => d.aerial.photographyDrones > 0 || d.aerial.videographyDrones > 0 || d.ledWall.enabled || d.webLive.enabled,
  );

  if (tier === "essential") {
    if (anyPhotography) bullets.push("Core photography coverage");
    if (anyVideography) bullets.push("Required videography coverage");
    bullets.push("Basic deliverables package");
    if (addOns) bullets.push("Selected add-ons at standard capacity");
  } else if (tier === "signature") {
    bullets.push("Photographers and videographers exactly as selected");
    bullets.push("More comprehensive coverage across all event days");
    bullets.push("Better deliverables turnaround");
    if (addOns) bullets.push("Selected add-ons included");
  } else {
    bullets.push("Maximum recommended coverage");
    bullets.push("Additional production support");
    bullets.push("Premium deliverables and priority editing");
    if (addOns) bullets.push("Selected add-ons at enhanced capacity");
  }
  return bullets;
}

export function generatePackageOptions(
  booking: Pick<Booking, "days" | "deliverables">,
  budget: number,
): PackageOption[] {
  const estimatedCost = estimateBookingCost(booking);
  const bands = PRICING_CONFIG.tierBands;

  const ranges: Record<PackageTierId, { min: number; max: number }> = {
    essential: { min: Math.round(estimatedCost * bands.essential.min), max: Math.round(estimatedCost * bands.essential.max) },
    signature: { min: Math.round(estimatedCost * bands.signature.min), max: Math.round(estimatedCost * bands.signature.max) },
    elite: { min: Math.round(estimatedCost * bands.elite.min), max: Math.round(estimatedCost * bands.elite.max) },
  };

  const tiers: PackageTierId[] = ["essential", "signature", "elite"];
  let closestTier: PackageTierId = "signature";
  let closestDistance = Infinity;
  for (const tier of tiers) {
    const mid = (ranges[tier].min + ranges[tier].max) / 2;
    const distance = Math.abs(mid - budget);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestTier = tier;
    }
  }

  return tiers.map((tier) => ({
    id: tier,
    label: TIER_META[tier].label,
    minPrice: ranges[tier].min,
    maxPrice: ranges[tier].max,
    headline: TIER_META[tier].headline,
    bullets: bulletsFor(tier, booking),
    recommended: tier === closestTier,
  }));
}

export type BudgetFeasibilityResult = {
  estimatedCost: number;
  isBelowEstimate: boolean;
  shortfall: number;
};

/** Section 43: recognise when the budget is clearly below the estimated
 * requirement cost instead of presenting unrealistic packages. */
export function checkBudgetFeasibility(
  booking: Pick<Booking, "days" | "deliverables">,
  budget: number,
): BudgetFeasibilityResult {
  const estimatedCost = estimateBookingCost(booking);
  const essentialFloor = Math.round(estimatedCost * PRICING_CONFIG.tierBands.essential.min);
  const isBelowEstimate = budget < essentialFloor;
  return {
    estimatedCost,
    isBelowEstimate,
    shortfall: isBelowEstimate ? essentialFloor - budget : 0,
  };
}
