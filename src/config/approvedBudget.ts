/**
 * Approved Camartes photography / event-service budget sheet.
 *
 * BASIC → Essential, MEDIUM → Signature, HIGH → Elite.
 * These ranges are app configuration until Camartes exposes a real pricing
 * catalog. Do not call a non-existent /api/admin/pricing-rules endpoint.
 */
import type { EventDay, PackageTierId } from "@/src/types/booking";

export const PACKAGE_SOURCE_TO_TIER = {
  BASIC: "essential",
  MEDIUM: "signature",
  HIGH: "elite",
} as const satisfies Record<"BASIC" | "MEDIUM" | "HIGH", PackageTierId>;

export const TIER_TO_PACKAGE_SOURCE: Record<PackageTierId, "BASIC" | "MEDIUM" | "HIGH"> = {
  essential: "BASIC",
  signature: "MEDIUM",
  elite: "HIGH",
};

export type ApprovedServiceId =
  | "traditional_photographer"
  | "traditional_videographer"
  | "candid_photographer"
  | "candid_videographer"
  | "drone_operators"
  | "web_live_link"
  | "led_wall";

export type PriceRange = { min: number; max: number };

export type ApprovedServiceConfig = {
  id: ApprovedServiceId;
  label: string;
  sourceLabel: string;
  note?: string;
  ranges: Record<PackageTierId, PriceRange>;
};

export const APPROVED_SERVICES: ApprovedServiceConfig[] = [
  {
    id: "traditional_photographer",
    label: "Traditional Photographer",
    sourceLabel: "Traditional Photographer",
    ranges: {
      essential: { min: 3000, max: 4000 },
      signature: { min: 4000, max: 5000 },
      elite: { min: 6000, max: 8000 },
    },
  },
  {
    id: "traditional_videographer",
    label: "Traditional Videographer",
    sourceLabel: "Traditional Videographer",
    note: "per schedule",
    ranges: {
      essential: { min: 3000, max: 4000 },
      signature: { min: 4000, max: 5000 },
      elite: { min: 6000, max: 8000 },
    },
  },
  {
    id: "candid_photographer",
    label: "Candid Photographer",
    sourceLabel: "Candid Photographer",
    ranges: {
      essential: { min: 6000, max: 8000 },
      signature: { min: 8000, max: 12000 },
      elite: { min: 12000, max: 18000 },
    },
  },
  {
    id: "candid_videographer",
    label: "Candid Videographer",
    sourceLabel: "Candid Videographer",
    ranges: {
      essential: { min: 8000, max: 10000 },
      signature: { min: 10000, max: 15000 },
      elite: { min: 15000, max: 20000 },
    },
  },
  {
    id: "drone_operators",
    label: "Drone / Aerial",
    sourceLabel: "Drone operators",
    ranges: {
      essential: { min: 6000, max: 8000 },
      signature: { min: 8000, max: 12000 },
      elite: { min: 12000, max: 16000 },
    },
  },
  {
    id: "web_live_link",
    label: "Web Live",
    sourceLabel: "Web Live Link",
    ranges: {
      essential: { min: 4000, max: 5000 },
      signature: { min: 5000, max: 7000 },
      elite: { min: 7000, max: 10000 },
    },
  },
  {
    id: "led_wall",
    label: "LED Wall",
    sourceLabel: "LED Wall",
    ranges: {
      essential: { min: 8000, max: 12000 },
      signature: { min: 10000, max: 15000 },
      elite: { min: 12000, max: 20000 },
    },
  },
];

export const PACKAGE_TIER_META: Record<PackageTierId, { label: string; headline: string; position: number }> = {
  essential: { label: "Essential", headline: "Core coverage at the approved BASIC rates.", position: 1 },
  signature: { label: "Signature", headline: "Balanced coverage at the approved MEDIUM rates.", position: 2 },
  elite: { label: "Elite", headline: "Highest listed coverage at the approved HIGH rates.", position: 3 },
};

export const PACKAGE_TIER_ORDER: PackageTierId[] = ["essential", "signature", "elite"];

export function approvedServiceById(id: ApprovedServiceId): ApprovedServiceConfig {
  const service = APPROVED_SERVICES.find((row) => row.id === id);
  if (!service) throw new Error(`Unknown approved service: ${id}`);
  return service;
}

export function approvedRange(id: ApprovedServiceId, tier: PackageTierId): PriceRange {
  return approvedServiceById(id).ranges[tier];
}

/** Peak selected quantities across event days. Not multiplied by number of days. */
export function selectedServiceQuantities(days: EventDay[]): Record<ApprovedServiceId, number> {
  const qty: Record<ApprovedServiceId, number> = {
    traditional_photographer: 0,
    traditional_videographer: 0,
    candid_photographer: 0,
    candid_videographer: 0,
    drone_operators: 0,
    web_live_link: 0,
    led_wall: 0,
  };
  for (const day of days) {
    if (day.photography.traditional) {
      qty.traditional_photographer = Math.max(qty.traditional_photographer, Math.max(1, day.photography.traditionalCount));
    }
    if (day.photography.candid) {
      qty.candid_photographer = Math.max(qty.candid_photographer, Math.max(1, day.photography.candidCount));
    }
    if (day.videography.traditional) {
      qty.traditional_videographer = Math.max(qty.traditional_videographer, Math.max(1, day.videography.traditionalCount));
    }
    if (day.videography.candid) {
      qty.candid_videographer = Math.max(qty.candid_videographer, Math.max(1, day.videography.candidCount));
    }
    const drones = day.aerial.photographyDrones + day.aerial.videographyDrones;
    if (drones > 0) qty.drone_operators = Math.max(qty.drone_operators, drones);
    if (day.webLive.enabled) qty.web_live_link = Math.max(qty.web_live_link, 1);
    if (day.ledWall.enabled) qty.led_wall = Math.max(qty.led_wall, Math.max(1, day.ledWall.screenCount));
  }
  return qty;
}

export type ApprovedServiceLine = {
  serviceId: ApprovedServiceId;
  label: string;
  quantity: number;
  minPrice: number;
  maxPrice: number;
  note?: string;
};

export function approvedServiceLines(days: EventDay[], tier: PackageTierId): ApprovedServiceLine[] {
  const qty = selectedServiceQuantities(days);
  return APPROVED_SERVICES.flatMap((service) => {
    const quantity = qty[service.id];
    if (quantity <= 0) return [];
    const range = service.ranges[tier];
    return [
      {
        serviceId: service.id,
        label: service.label,
        quantity,
        minPrice: range.min * quantity,
        maxPrice: range.max * quantity,
        note: service.note,
      },
    ];
  });
}

export function sumRange(lines: ApprovedServiceLine[]): PriceRange {
  return lines.reduce((acc, line) => ({ min: acc.min + line.minPrice, max: acc.max + line.maxPrice }), { min: 0, max: 0 });
}
