/**
 * Package options from the approved Camartes budget sheet.
 *
 * Ranges are displayed as ranges. This module does not invent a midpoint quote
 * and does not call a backend pricing API — Camartes does not expose one.
 */
import type { Booking, PackageOption, PackageTierId } from "@/src/types/booking";
import {
  PACKAGE_TIER_META,
  PACKAGE_TIER_ORDER,
  approvedServiceLines,
  overallApprovedRange,
} from "@/src/config/approvedBudget";

export function estimateBookingCost(booking: Pick<Booking, "days" | "deliverables">): number {
  return overallApprovedRange(booking.days, "essential", booking.deliverables).min;
}

export function generatePackageOptions(
  booking: Pick<Booking, "days" | "deliverables">,
  budget: number,
): PackageOption[] {
  const options = PACKAGE_TIER_ORDER.map((tier) => {
    const serviceLines = approvedServiceLines(booking.days, tier, booking.deliverables);
    const total = overallApprovedRange(booking.days, tier, booking.deliverables);
    return {
      id: tier,
      label: PACKAGE_TIER_META[tier].label,
      minPrice: total.min,
      maxPrice: total.max,
      headline: PACKAGE_TIER_META[tier].headline,
      bullets: serviceLines.map((line) => {
        const qty = line.quantity > 1 ? ` × ${line.quantity}` : "";
        const note = line.note ? ` (${line.note})` : "";
        return `${line.label}${qty}${note}`;
      }),
      serviceLines,
      recommended: false,
    };
  });

  let recommended: PackageTierId = "signature";
  let best = Infinity;
  for (const option of options) {
    const distance =
      budget >= option.minPrice && budget <= option.maxPrice
        ? 0
        : budget < option.minPrice
          ? option.minPrice - budget
          : budget - option.maxPrice;
    if (distance < best) {
      best = distance;
      recommended = option.id;
    }
  }

  return options.map((option) => ({ ...option, recommended: option.id === recommended }));
}

/** Same generator Packages, Budget, and Review use — never a second pricing path. */
export function resolvePackageOptions(
  booking: Pick<Booking, "days" | "deliverables" | "budget">,
): PackageOption[] {
  return generatePackageOptions(booking, booking.budget ?? 0);
}

export function selectedPackageQuote(
  booking: Pick<Booking, "days" | "deliverables" | "budget" | "selectedPackage">,
): PackageOption | undefined {
  if (!booking.selectedPackage) return undefined;
  return resolvePackageOptions(booking).find((option) => option.id === booking.selectedPackage);
}

/** Inputs that must rebuild Essential / Signature / Elite overall totals. */
export function bookingPricingInputKey(booking: Pick<Booking, "days" | "budget"> & { deliverables?: Booking["deliverables"] }): string {
  return JSON.stringify({
    budget: booking.budget,
    deliverables: booking.deliverables,
    days: booking.days.map((day) => ({
      dayId: day.dayId,
      eventDate: day.eventDate,
      startTime: day.startTime,
      endTime: day.endTime,
      overnight: day.overnight,
      eventTypeIds: day.eventTypeIds,
      photography: day.photography,
      videography: day.videography,
      aerial: day.aerial,
      ledWall: day.ledWall,
      webLive: day.webLive,
    })),
  });
}

export type BudgetFeasibilityResult = {
  estimatedCost: number;
  isBelowEstimate: boolean;
  shortfall: number;
};

export function checkBudgetFeasibility(
  booking: Pick<Booking, "days" | "deliverables">,
  budget: number,
): BudgetFeasibilityResult {
  const essentialFloor = estimateBookingCost(booking);
  const isBelowEstimate = essentialFloor > 0 && budget < essentialFloor;
  return {
    estimatedCost: essentialFloor,
    isBelowEstimate,
    shortfall: isBelowEstimate ? essentialFloor - budget : 0,
  };
}
