/**
 * Comprehensive regression tests for the complete BOOK A SHOOT customer booking flow
 * and photography pricing sheet engine.
 */

import {
  DELIVERABLES_PRICING,
  OUTDOOR_APPROVED_SERVICES,
  OUTDOOR_EVENT_TYPE_IDS,
  PACKAGE_SOURCE_TO_TIER,
  PACKAGE_TIER_META,
  PACKAGE_TIER_ORDER,
  TIER_TO_PACKAGE_SOURCE,
  WEDDING_APPROVED_SERVICES,
  approvedRange,
  approvedServiceById,
  approvedServiceLines,
  detectDayOvertime,
  getApplicablePricingModel,
  overallApprovedRange,
} from "@/src/config/approvedBudget";
import { WIZARD_STEPS } from "@/src/constants/steps";
import { setAerialEnabled, setPhotographySelected, setVideographySelected } from "@/src/domain/dayServices";
import { createEmptyDay, emptyDeliverables, sanitizeEventDay } from "@/src/domain/defaults";
import { generatePackageOptions, resolvePackageOptions, selectedPackageQuote } from "@/src/engine/pricing";
import { durationMinutes } from "@/src/utils/dateTime";
import type { EventDay } from "@/src/types/booking";

function makeWeddingDay(patch: Partial<EventDay> = {}, order = 1): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(order),
    eventDate: "2026-11-20",
    eventTypeIds: ["wedding"],
    location: {
      ...createEmptyDay(order).location,
      formattedAddress: "Taj Krishna, Hyderabad",
      city: "Hyderabad",
    },
    startTime: "10:00",
    endTime: "18:00",
    ...patch,
  });
}

function makeOutdoorDay(eventId: string = "pre_wedding", patch: Partial<EventDay> = {}, order = 1): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(order),
    eventDate: "2026-11-21",
    eventTypeIds: [eventId],
    location: {
      ...createEmptyDay(order).location,
      formattedAddress: "Ramoji Film City, Hyderabad",
      city: "Hyderabad",
    },
    startTime: "09:00",
    endTime: "17:00",
    ...patch,
  });
}

describe("1. Customer Flow Progress Steps", () => {
  test("progress bar contains exactly the 9 required sequential wizard steps in order", () => {
    const labels = WIZARD_STEPS.map((s) => s.label);
    expect(labels).toEqual([
      "Event",
      "Photography",
      "Videography",
      "Add-ons",
      "Budget",
      "Packages",
      "Location",
      "Providers",
      "Review",
    ]);
  });

  test("package tiers correctly map BASIC, MEDIUM, HIGH to Essential, Signature, Elite", () => {
    expect(PACKAGE_SOURCE_TO_TIER.BASIC).toBe("essential");
    expect(PACKAGE_SOURCE_TO_TIER.MEDIUM).toBe("signature");
    expect(PACKAGE_SOURCE_TO_TIER.HIGH).toBe("elite");

    expect(TIER_TO_PACKAGE_SOURCE.essential).toBe("BASIC");
    expect(TIER_TO_PACKAGE_SOURCE.signature).toBe("MEDIUM");
    expect(TIER_TO_PACKAGE_SOURCE.elite).toBe("HIGH");

    expect(PACKAGE_TIER_META.essential.label).toBe("Essential");
    expect(PACKAGE_TIER_META.signature.label).toBe("Signature");
    expect(PACKAGE_TIER_META.elite.label).toBe("Elite");
  });
});

describe("2. Event Selection Rules", () => {
  test("selecting Wedding selects ONLY Wedding, not Engagement", () => {
    const day = makeWeddingDay({ eventTypeIds: ["wedding"] });
    expect(day.eventTypeIds).toEqual(["wedding"]);
    expect(day.eventTypeIds).not.toContain("engagement");
  });

  test("selecting Engagement selects ONLY Engagement, not Wedding", () => {
    const day = makeWeddingDay({ eventTypeIds: ["engagement"] });
    expect(day.eventTypeIds).toEqual(["engagement"]);
    expect(day.eventTypeIds).not.toContain("wedding");
  });

  test("Wedding + Engagement occurs only when both are explicitly chosen", () => {
    const day = makeWeddingDay({ eventTypeIds: ["wedding", "engagement"] });
    expect(day.eventTypeIds).toEqual(["wedding", "engagement"]);
  });
});

describe("3. Wedding Package Pricing Sheet Values & Reference Totals", () => {
  test("applicable pricing model for wedding is 'wedding'", () => {
    const day = makeWeddingDay();
    expect(getApplicablePricingModel(day)).toBe("wedding");
  });

  test("individual wedding line items match supplied pricing sheet exactly", () => {
    const items = [
      { id: "traditional_photographer", essential: { min: 6000, max: 7000 }, signature: { min: 8000, max: 10000 }, elite: { min: 10000, max: 11000 } },
      { id: "traditional_videographer", essential: { min: 6000, max: 7000 }, signature: { min: 8000, max: 10000 }, elite: { min: 10000, max: 11000 } },
      { id: "candid_photographer", essential: { min: 10000, max: 12000 }, signature: { min: 13000, max: 16000 }, elite: { min: 17000, max: 22000 } },
      { id: "candid_videographer", essential: { min: 12000, max: 14000 }, signature: { min: 15000, max: 18000 }, elite: { min: 19000, max: 24000 } },
      { id: "drone_operators", essential: { min: 8000, max: 10000 }, signature: { min: 11000, max: 14000 }, elite: { min: 15000, max: 18000 } },
      { id: "web_live_link", essential: { min: 5000, max: 8000 }, signature: { min: 9000, max: 12000 }, elite: { min: 13000, max: 15000 } },
      { id: "led_wall", essential: { min: 10000, max: 14000 }, signature: { min: 15000, max: 18000 }, elite: { min: 19000, max: 24000 } },
    ] as const;

    for (const item of items) {
      expect(approvedRange(item.id, "essential", "wedding")).toEqual(item.essential);
      expect(approvedRange(item.id, "signature", "wedding")).toEqual(item.signature);
      expect(approvedRange(item.id, "elite", "wedding")).toEqual(item.elite);
      const svc = approvedServiceById(item.id, "wedding");
      expect(svc.note).toBe("per schedule (8 hrs)");
    }
  });

  test("Wedding Reference Overall Totals: Essential ₹57,000–₹72,000 | Signature ₹79,000–₹98,000 | Elite ₹1,03,000–₹1,25,000", () => {
    let fullWeddingDay = makeWeddingDay({
      photography: { traditional: true, traditionalCount: 1, candid: true, candidCount: 1 },
      videography: { traditional: true, traditionalCount: 1, candid: true, candidCount: 1 },
      aerial: { photographyDrones: 1, videographyDrones: 0 },
      ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
      webLive: { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
    });

    const essentialRange = overallApprovedRange([fullWeddingDay], "essential");
    expect(essentialRange).toEqual({ min: 57000, max: 72000 });

    const signatureRange = overallApprovedRange([fullWeddingDay], "signature");
    expect(signatureRange).toEqual({ min: 79000, max: 98000 });

    const eliteRange = overallApprovedRange([fullWeddingDay], "elite");
    expect(eliteRange).toEqual({ min: 103000, max: 125000 });
  });

  test("Deliverables and editing pricing values in Wedding package", () => {
    const rates = DELIVERABLES_PRICING.wedding;
    expect(rates.videoEditingPerVideo).toEqual({ essential: 3000, signature: 4000, elite: 6000 });
    expect(rates.albumDesigningPerSheet).toEqual({
      essential: { min: 300, max: 400 },
      signature: { min: 400, max: 500 },
      elite: { min: 600, max: 700 },
    });
    expect(rates.eachPhotoEditing).toEqual({ essential: 50, signature: 100, elite: 150 });
    expect(rates.teaserCinematicEditingPerMin).toEqual({
      essential: { min: 1500, max: 2500 },
      signature: { min: 1500, max: 2500 },
      elite: { min: 3500, max: 5000 },
    });
  });
});

describe("4. Outdoor Shoot Package Rates", () => {
  test("Outdoor events map to 'outdoor' pricing model", () => {
    for (const eventId of OUTDOOR_EVENT_TYPE_IDS) {
      const day = makeOutdoorDay(eventId);
      expect(getApplicablePricingModel(day)).toBe("outdoor");
    }
  });

  test("Outdoor Shoot line items match supplied pricing sheet exactly", () => {
    expect(approvedRange("candid_photographer", "essential", "outdoor")).toEqual({ min: 15000, max: 15000 });
    expect(approvedRange("candid_photographer", "signature", "outdoor")).toEqual({ min: 22000, max: 22000 });
    expect(approvedRange("candid_photographer", "elite", "outdoor")).toEqual({ min: 27000, max: 27000 });

    expect(approvedRange("candid_videographer", "essential", "outdoor")).toEqual({ min: 16000, max: 16000 });
    expect(approvedRange("candid_videographer", "signature", "outdoor")).toEqual({ min: 24000, max: 24000 });
    expect(approvedRange("candid_videographer", "elite", "outdoor")).toEqual({ min: 30000, max: 30000 });

    expect(approvedRange("drone_operators", "essential", "outdoor")).toEqual({ min: 12000, max: 12000 });
    expect(approvedRange("drone_operators", "signature", "outdoor")).toEqual({ min: 15000, max: 15000 });
    expect(approvedRange("drone_operators", "elite", "outdoor")).toEqual({ min: 18000, max: 18000 });
  });

  test("Pre-Wedding with Candid Photo + Candid Video + Drone totals correctly", () => {
    const day = makeOutdoorDay("pre_wedding", {
      photography: { traditional: false, traditionalCount: 0, candid: true, candidCount: 1 },
      videography: { traditional: false, traditionalCount: 0, candid: true, candidCount: 1 },
      aerial: { photographyDrones: 1, videographyDrones: 0 },
    });

    const essential = overallApprovedRange([day], "essential");
    expect(essential).toEqual({ min: 15000 + 16000 + 12000, max: 15000 + 16000 + 12000 }); // ₹43,000

    const signature = overallApprovedRange([day], "signature");
    expect(signature).toEqual({ min: 22000 + 24000 + 15000, max: 22000 + 24000 + 15000 }); // ₹61,000

    const elite = overallApprovedRange([day], "elite");
    expect(elite).toEqual({ min: 27000 + 30000 + 18000, max: 27000 + 30000 + 18000 }); // ₹75,000
  });

  test("Deliverables and editing pricing values in Outdoor Shoot package", () => {
    const rates = DELIVERABLES_PRICING.outdoor;
    expect(rates.albumDesigningPerSheet).toEqual({
      essential: { min: 300, max: 400 },
      signature: { min: 400, max: 500 },
      elite: { min: 600, max: 700 },
    });
    expect(rates.eachPhotoEditing).toEqual({ essential: 100, signature: 150, elite: 200 });
    expect(rates.teaserCinematicEditingPerMin).toEqual({
      essential: { min: 1500, max: 2500 },
      signature: { min: 1500, max: 2500 },
      elite: { min: 3500, max: 5000 },
    });
  });
});

describe("5. Overtime & Extended Coverage Detection", () => {
  test("Scheduled 10:00–18:00 = 8 hours = no overtime", () => {
    const day = makeWeddingDay({ startTime: "10:00", endTime: "18:00", overnight: false });
    const overtime = detectDayOvertime(day, durationMinutes);
    expect(overtime.isExtended).toBe(false);
    expect(overtime.extendedHours).toBe(0);
    expect(overtime.note).toBeNull();
  });

  test("Scheduled 10:00–20:00 = 10 hours = 2 hours extended", () => {
    const day = makeWeddingDay({ startTime: "10:00", endTime: "20:00", overnight: false });
    const overtime = detectDayOvertime(day, durationMinutes);
    expect(overtime.isExtended).toBe(true);
    expect(overtime.extendedHours).toBe(2);
    expect(overtime.note).toBe("2 hours extended coverage");
  });

  test("Scheduled 20:00–04:00 (overnight) = 8 hours = no overtime", () => {
    const day = makeWeddingDay({ startTime: "20:00", endTime: "04:00", overnight: true });
    const overtime = detectDayOvertime(day, durationMinutes);
    expect(overtime.isExtended).toBe(false);
    expect(overtime.extendedHours).toBe(0);
    expect(overtime.note).toBeNull();
  });

  test("Scheduled 20:00–06:00 (overnight) = 10 hours = 2 hours extended", () => {
    const day = makeWeddingDay({ startTime: "20:00", endTime: "06:00", overnight: true });
    const overtime = detectDayOvertime(day, durationMinutes);
    expect(overtime.isExtended).toBe(true);
    expect(overtime.extendedHours).toBe(2);
    expect(overtime.note).toBe("2 hours extended coverage");
  });

  test("Overtime detection does not invent an arbitrary overtime price amount", () => {
    const day = makeWeddingDay({ startTime: "10:00", endTime: "20:00" });
    const overtime = detectDayOvertime(day, durationMinutes);
    expect(overtime).not.toHaveProperty("overtimePrice");
    expect(overtime).not.toHaveProperty("amount");
  });
});

describe("6. Multi-Day Pricing Isolation and Selection Persistence", () => {
  test("Day 1 Wedding and Day 2 Pre-Wedding calculate independently", () => {
    const day1 = makeWeddingDay(
      {
        photography: { traditional: true, traditionalCount: 1, candid: false, candidCount: 0 },
      },
      1,
    );
    const day2 = makeOutdoorDay(
      "pre_wedding",
      {
        photography: { traditional: false, traditionalCount: 0, candid: true, candidCount: 1 },
      },
      2,
    );

    const day1Cost = overallApprovedRange([day1], "essential");
    expect(day1Cost).toEqual({ min: 6000, max: 7000 });

    const day2Cost = overallApprovedRange([day2], "essential");
    expect(day2Cost).toEqual({ min: 15000, max: 15000 });

    const combined = overallApprovedRange([day1, day2], "essential");
    expect(combined).toEqual({ min: 21000, max: 22000 });

    const afterDelete = overallApprovedRange([day1], "essential");
    expect(afterDelete).toEqual({ min: 6000, max: 7000 });
  });

  test("Selected package and calculated price match between Packages and Review", () => {
    const day = makeWeddingDay({
      photography: { traditional: true, traditionalCount: 1, candid: true, candidCount: 1 },
    });
    const booking = {
      days: [day],
      deliverables: emptyDeliverables(),
      budget: 80000,
      selectedPackage: "signature" as const,
    };

    const packages = resolvePackageOptions(booking);
    const signatureOption = packages.find((p) => p.id === "signature")!;
    expect(signatureOption).toBeDefined();

    const reviewQuote = selectedPackageQuote(booking);
    expect(reviewQuote).toBeDefined();
    expect(reviewQuote?.minPrice).toBe(signatureOption.minPrice);
    expect(reviewQuote?.maxPrice).toBe(signatureOption.maxPrice);
    expect(reviewQuote?.label).toBe("Signature");
  });

  test("Customer budget does not overwrite or alter package price calculation", () => {
    const day = makeWeddingDay({
      photography: { traditional: true, traditionalCount: 1, candid: false, candidCount: 0 },
    });

    const optBudgetLow = generatePackageOptions({ days: [day], deliverables: emptyDeliverables() }, 20000);
    const optBudgetHigh = generatePackageOptions({ days: [day], deliverables: emptyDeliverables() }, 500000);

    const essentialLow = optBudgetLow.find((o) => o.id === "essential")!;
    const essentialHigh = optBudgetHigh.find((o) => o.id === "essential")!;

    expect(essentialLow.minPrice).toBe(essentialHigh.minPrice);
    expect(essentialLow.maxPrice).toBe(essentialHigh.maxPrice);
  });
});
