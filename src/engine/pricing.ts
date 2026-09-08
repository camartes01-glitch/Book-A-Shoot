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
  sumRange,
} from "@/src/config/approvedBudget";

export function estimateBookingCost(booking: Pick<Booking, "days" | "deliverables">): number {
  const lines = approvedServiceLines(booking.days, "essential");
  return sumRange(lines).min;
}

export function generatePackageOptions(
  booking: Pick<Booking, "days" | "deliverables">,
  budget: number,
): PackageOption[] {
  const options = PACKAGE_TIER_ORDER.map((tier) => {
    const serviceLines = approvedServiceLines(booking.days, tier);
    const total = sumRange(serviceLines);
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
