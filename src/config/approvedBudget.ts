/**
 * Approved Camartes photography / event-service budget sheet.
 *
 * BASIC → Essential, MEDIUM → Signature, HIGH → Elite.
 * These ranges are app configuration until Camartes exposes a real pricing
 * catalog. Do not call a non-existent /api/admin/pricing-rules endpoint.
 */
import type { Deliverables, EventDay, PackageTierId } from "@/src/types/booking";

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

export type PricingModel = "wedding" | "outdoor" | "standard";

export const OUTDOOR_EVENT_TYPE_IDS = [
  "pre_wedding",
  "post_wedding",
  "baby_shoot",
  "corporate_event",
];

export function getApplicablePricingModel(day: Pick<EventDay, "eventTypeIds">): PricingModel {
  if (day.eventTypeIds.includes("wedding")) {
    return "wedding";
  }
  if (day.eventTypeIds.some((id) => OUTDOOR_EVENT_TYPE_IDS.includes(id))) {
    return "outdoor";
  }
  return "standard";
}

/** Wedding Package rates from the supplied photography pricing sheet (8 hrs included schedule). */
export const WEDDING_APPROVED_SERVICES: ApprovedServiceConfig[] = [
  {
    id: "traditional_photographer",
    label: "Traditional Photographer",
    sourceLabel: "Traditional Photographer",
    note: "per schedule (8 hrs)",
    ranges: {
      essential: { min: 6000, max: 7000 },
      signature: { min: 8000, max: 10000 },
      elite: { min: 10000, max: 11000 },
    },
  },
  {
    id: "traditional_videographer",
    label: "Traditional Videographer",
    sourceLabel: "Traditional Videographer",
    note: "per schedule (8 hrs)",
    ranges: {
      essential: { min: 6000, max: 7000 },
      signature: { min: 8000, max: 10000 },
      elite: { min: 10000, max: 11000 },
    },
  },
  {
    id: "candid_photographer",
    label: "Candid Photographer",
    sourceLabel: "Candid Photographer",
    note: "per schedule (8 hrs)",
    ranges: {
      essential: { min: 10000, max: 12000 },
      signature: { min: 13000, max: 16000 },
      elite: { min: 17000, max: 22000 },
    },
  },
  {
    id: "candid_videographer",
    label: "Candid Videographer",
    sourceLabel: "Candid Videographer",
    note: "per schedule (8 hrs)",
    ranges: {
      essential: { min: 12000, max: 14000 },
      signature: { min: 15000, max: 18000 },
      elite: { min: 19000, max: 24000 },
    },
  },
  {
    id: "drone_operators",
    label: "Drone / Aerial",
    sourceLabel: "Drone",
    note: "per schedule (8 hrs)",
    ranges: {
      essential: { min: 8000, max: 10000 },
      signature: { min: 11000, max: 14000 },
      elite: { min: 15000, max: 18000 },
    },
  },
  {
    id: "web_live_link",
    label: "Web Live",
    sourceLabel: "Web Live Link",
    note: "per schedule (8 hrs)",
    ranges: {
      essential: { min: 5000, max: 8000 },
      signature: { min: 9000, max: 12000 },
      elite: { min: 13000, max: 15000 },
    },
  },
  {
    id: "led_wall",
    label: "LED Wall",
    sourceLabel: "LED Wall",
    note: "per schedule (8 hrs)",
    ranges: {
      essential: { min: 10000, max: 14000 },
      signature: { min: 15000, max: 18000 },
      elite: { min: 19000, max: 24000 },
    },
  },
];

/** Outdoor Shoot Package rates from the supplied photography pricing sheet (per day schedule). */
export const OUTDOOR_APPROVED_SERVICES: ApprovedServiceConfig[] = [
  {
    id: "traditional_photographer",
    label: "Candid Photo Full Day Segment",
    sourceLabel: "Candid Photo Full Day Segment",
    note: "per day",
    ranges: {
      essential: { min: 15000, max: 15000 },
      signature: { min: 22000, max: 22000 },
      elite: { min: 27000, max: 27000 },
    },
  },
  {
    id: "candid_photographer",
    label: "Candid Photo Full Day Segment",
    sourceLabel: "Candid Photo Full Day Segment",
    note: "per day",
    ranges: {
      essential: { min: 15000, max: 15000 },
      signature: { min: 22000, max: 22000 },
      elite: { min: 27000, max: 27000 },
    },
  },
  {
    id: "traditional_videographer",
    label: "Candid Videographer Full Segment",
    sourceLabel: "Candid Videographer Full Segment",
    note: "per day",
    ranges: {
      essential: { min: 16000, max: 16000 },
      signature: { min: 24000, max: 24000 },
      elite: { min: 30000, max: 30000 },
    },
  },
  {
    id: "candid_videographer",
    label: "Candid Videographer Full Segment",
    sourceLabel: "Candid Videographer Full Segment",
    note: "per day",
    ranges: {
      essential: { min: 16000, max: 16000 },
      signature: { min: 24000, max: 24000 },
      elite: { min: 30000, max: 30000 },
    },
  },
  {
    id: "drone_operators",
    label: "Drone",
    sourceLabel: "Drone",
    note: "per day",
    ranges: {
      essential: { min: 12000, max: 12000 },
      signature: { min: 15000, max: 15000 },
      elite: { min: 18000, max: 18000 },
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

/** Deliverables & Editing rates from the supplied photography pricing sheet. */
export const DELIVERABLES_PRICING = {
  wedding: {
    videoEditingPerVideo: { essential: 3000, signature: 4000, elite: 6000 },
    albumDesigningPerSheet: {
      essential: { min: 300, max: 400 },
      signature: { min: 400, max: 500 },
      elite: { min: 600, max: 700 },
    },
    eachPhotoEditing: { essential: 50, signature: 100, elite: 150 },
    teaserCinematicEditingPerMin: {
      essential: { min: 1500, max: 2500 },
      signature: { min: 1500, max: 2500 },
      elite: { min: 3500, max: 5000 },
    },
  },
  outdoor: {
    albumDesigningPerSheet: {
      essential: { min: 300, max: 400 },
      signature: { min: 400, max: 500 },
      elite: { min: 600, max: 700 },
    },
    eachPhotoEditing: { essential: 100, signature: 150, elite: 200 },
    teaserCinematicEditingPerMin: {
      essential: { min: 1500, max: 2500 },
      signature: { min: 1500, max: 2500 },
      elite: { min: 3500, max: 5000 },
    },
  },
} as const;

export function getApprovedServicesForModel(model: PricingModel): ApprovedServiceConfig[] {
  if (model === "wedding") return WEDDING_APPROVED_SERVICES;
  if (model === "outdoor") return OUTDOOR_APPROVED_SERVICES;
  return APPROVED_SERVICES;
}

export function approvedServiceById(id: ApprovedServiceId, model: PricingModel = "standard"): ApprovedServiceConfig {
  const list = getApprovedServicesForModel(model);
  const service = list.find((row) => row.id === id) ?? APPROVED_SERVICES.find((row) => row.id === id);
  if (!service) throw new Error(`Unknown approved service: ${id}`);
  return service;
}

export function approvedRange(id: ApprovedServiceId, tier: PackageTierId, model: PricingModel = "standard"): PriceRange {
  return approvedServiceById(id, model).ranges[tier];
}

/** Selected quantities for one event day. Traditional Videographer is per schedule, not per hour. */
export function selectedServiceQuantitiesForDay(day: EventDay): Record<ApprovedServiceId, number> {
  const qty: Record<ApprovedServiceId, number> = {
    traditional_photographer: 0,
    traditional_videographer: 0,
    candid_photographer: 0,
    candid_videographer: 0,
    drone_operators: 0,
    web_live_link: 0,
    led_wall: 0,
  };
  if (day.photography.traditional) {
    qty.traditional_photographer = Math.max(1, day.photography.traditionalCount);
  }
  if (day.photography.candid) {
    qty.candid_photographer = Math.max(1, day.photography.candidCount);
  }
  if (day.videography.traditional) {
    qty.traditional_videographer = Math.max(1, day.videography.traditionalCount);
  }
  if (day.videography.candid) {
    qty.candid_videographer = Math.max(1, day.videography.candidCount);
  }
  const drones = day.aerial.photographyDrones + day.aerial.videographyDrones;
  if (drones > 0) qty.drone_operators = drones;
  if (day.webLive.enabled) qty.web_live_link = 1;
  if (day.ledWall.enabled) qty.led_wall = Math.max(1, day.ledWall.screenCount);
  return qty;
}

/** Selected quantities summed independently across event days. */
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
    const dayQty = selectedServiceQuantitiesForDay(day);
    (Object.keys(qty) as ApprovedServiceId[]).forEach((id) => {
      qty[id] += dayQty[id];
    });
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

export function approvedServiceLinesFromQty(
  qty: Record<ApprovedServiceId, number>,
  tier: PackageTierId,
  model: PricingModel = "standard",
): ApprovedServiceLine[] {
  const serviceList = getApprovedServicesForModel(model);
  return serviceList.flatMap((service) => {
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

export function approvedServiceLinesForDay(day: EventDay, tier: PackageTierId): ApprovedServiceLine[] {
  const model = getApplicablePricingModel(day);
  return approvedServiceLinesFromQty(selectedServiceQuantitiesForDay(day), tier, model);
}

export function getBookingPricingModel(days: EventDay[]): PricingModel {
  if (days.some((d) => d.eventTypeIds.includes("wedding"))) return "wedding";
  if (days.some((d) => d.eventTypeIds.some((id) => OUTDOOR_EVENT_TYPE_IDS.includes(id)))) return "outdoor";
  return "wedding";
}

export function approvedDeliverablesLines(
  deliverables: Deliverables | undefined,
  days: EventDay[],
  tier: PackageTierId,
): ApprovedServiceLine[] {
  if (!deliverables) return [];
  const lines: ApprovedServiceLine[] = [];
  const model = getBookingPricingModel(days);
  const pricingGroup = model === "outdoor" ? DELIVERABLES_PRICING.outdoor : DELIVERABLES_PRICING.wedding;

  if (deliverables.video?.teaserCinematicEnabled) {
    const minutes = Math.max(1, deliverables.video.teaserDurationMinutes ?? 1);
    const range = pricingGroup.teaserCinematicEditingPerMin[tier];
    const label =
      model === "wedding"
        ? "Wedding Teaser Cinematic Editing"
        : model === "outdoor"
          ? "Outdoor Shoot Teaser Cinematic Editing"
          : "Teaser Cinematic Editing";
    lines.push({
      serviceId: "teaser_cinematic_editing" as any,
      label,
      quantity: minutes,
      minPrice: range.min * minutes,
      maxPrice: range.max * minutes,
      note: `${minutes} min${minutes > 1 ? "s" : ""}`,
    });
  }

  return lines;
}

/** Combined lines for the complete booking: each event day is priced according to its model, then deliverables are added and totals are summed. */
export function approvedServiceLines(
  days: EventDay[],
  tier: PackageTierId,
  deliverables?: Deliverables,
): ApprovedServiceLine[] {
  const combined = new Map<ApprovedServiceId, ApprovedServiceLine>();
  for (const day of days) {
    for (const line of approvedServiceLinesForDay(day, tier)) {
      const previous = combined.get(line.serviceId);
      if (!previous) {
        combined.set(line.serviceId, { ...line });
        continue;
      }
      combined.set(line.serviceId, {
        ...previous,
        quantity: previous.quantity + line.quantity,
        minPrice: previous.minPrice + line.minPrice,
        maxPrice: previous.maxPrice + line.maxPrice,
      });
    }
  }
  // Return in stable order
  const ids = Array.from(combined.keys());
  const serviceLines = ids.map((id) => combined.get(id)!);
  const deliverableLines = approvedDeliverablesLines(deliverables, days, tier);
  return [...serviceLines, ...deliverableLines];
}

export function sumRange(lines: ApprovedServiceLine[]): PriceRange {
  return lines.reduce((acc, line) => ({ min: acc.min + line.minPrice, max: acc.max + line.maxPrice }), { min: 0, max: 0 });
}

/** Overall Essential / Signature / Elite range for every selected service and deliverable. */
export function overallApprovedRange(
  days: EventDay[],
  tier: PackageTierId,
  deliverables?: Deliverables,
): PriceRange {
  return sumRange(approvedServiceLines(days, tier, deliverables));
}

export type OvertimeDetection = {
  isExtended: boolean;
  includedMinutes: number;
  actualMinutes: number;
  extendedMinutes: number;
  extendedHours: number;
  note: string | null;
};

/**
 * Detects if a day's coverage exceeds the included schedule (8 hrs for wedding).
 * Does not invent arbitrary overtime rates as the pricing sheet does not specify them.
 */
export function detectDayOvertime(
  day: Pick<EventDay, "startTime" | "endTime" | "overnight" | "eventTypeIds">,
  durationMinutesFn?: (start: string, end: string, overnight: boolean) => number,
): OvertimeDetection {
  const model = getApplicablePricingModel(day);
  const includedMinutes = 8 * 60; // 8 hours included schedule
  if (!day.startTime || !day.endTime) {
    return { isExtended: false, includedMinutes, actualMinutes: 0, extendedMinutes: 0, extendedHours: 0, note: null };
  }
  let actualMinutes = 0;
  if (durationMinutesFn) {
    actualMinutes = durationMinutesFn(day.startTime, day.endTime, day.overnight);
  } else {
    const [sh, sm] = day.startTime.split(":").map(Number);
    const [eh, em] = day.endTime.split(":").map(Number);
    let startM = sh * 60 + sm;
    let endM = eh * 60 + em;
    if (day.overnight || endM < startM) {
      endM += 24 * 60;
    }
    actualMinutes = endM - startM;
  }
  if (actualMinutes > includedMinutes) {
    const extendedMinutes = actualMinutes - includedMinutes;
    const extendedHours = Math.ceil(extendedMinutes / 60);
    return {
      isExtended: true,
      includedMinutes,
      actualMinutes,
      extendedMinutes,
      extendedHours,
      note: `${extendedHours} hour${extendedHours > 1 ? "s" : ""} extended coverage`,
    };
  }
  return {
    isExtended: false,
    includedMinutes,
    actualMinutes,
    extendedMinutes: 0,
    extendedHours: 0,
    note: null,
  };
}

