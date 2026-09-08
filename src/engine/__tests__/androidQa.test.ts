/**
 * Encodes the Android QA booking flows as engine-level assertions so the
 * same rules the device must follow stay locked in CI. These do not replace
 * a device pass; they prevent the bugs this QA pass found from regressing.
 */
import { createEmptyBooking, createEmptyDay, duplicateDay, sanitizeEventDay } from "@/src/domain/defaults";
import { MAX_MATCHES, aggregateRequirement, matchVendors } from "@/src/engine/matching";
import { generatePackageOptions } from "@/src/engine/pricing";
import {
  CORE_SERVICE_REQUIRED_MESSAGE,
  END_TIME_REQUIRED_MESSAGE,
  START_TIME_REQUIRED_MESSAGE,
  isDayComplete,
  validateBudget,
  validateCoreServiceRule,
  validateDay,
  validateDays,
} from "@/src/engine/validation";
import { durationMinutes, formatDuration, inferOvernight } from "@/src/utils/dateTime";
import { makeBookingId } from "@/src/utils/id";
import type { EventDay } from "@/src/types/booking";
import type { CustomerVendor } from "@/src/types/vendor";

function completeDay(order: number, patch: Partial<EventDay> = {}): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(order),
    eventDate: "2099-02-01",
    eventTypeIds: ["wedding"],
    location: {
      ...createEmptyDay(order).location,
      formattedAddress: "Tirupati, AP",
      city: "Tirupati",
    },
    startTime: "10:00",
    endTime: "16:00",
    photography: { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 },
    ...patch,
  });
}

describe("Android QA — fresh booking / add-on defaults", () => {
  test("a brand-new day has LED, Web Live and Aerial off", () => {
    const day = createEmptyDay(1);
    expect(day.ledWall.enabled).toBe(false);
    expect(day.webLive.enabled).toBe(false);
    expect(day.aerial.photographyDrones).toBe(0);
    expect(day.aerial.videographyDrones).toBe(0);
    expect(isDayComplete(day)).toBe(false);
  });

  test("a brand-new booking starts with one independent incomplete day", () => {
    const booking = createEmptyBooking("cust-1");
    expect(booking.days).toHaveLength(1);
    expect(booking.days[0].ledWall.enabled).toBe(false);
    expect(booking.days[0].webLive.enabled).toBe(false);
    expect(validateDays(booking.days).length).toBeGreaterThan(0);
  });
});

describe("Android QA — time validation", () => {
  test("missing start time asks specifically for a start time", () => {
    const day = completeDay(1, { startTime: null, endTime: "16:00" });
    const issues = validateDay(day);
    expect(issues.some((i) => i.code === "START_TIME_REQUIRED" && i.message === START_TIME_REQUIRED_MESSAGE)).toBe(true);
    expect(issues.some((i) => i.code === "END_BEFORE_START")).toBe(false);
  });

  test("missing end time asks specifically for an end time", () => {
    const day = completeDay(1, { startTime: "10:00", endTime: null });
    const issues = validateDay(day);
    expect(issues.some((i) => i.code === "END_TIME_REQUIRED" && i.message === END_TIME_REQUIRED_MESSAGE)).toBe(true);
    expect(issues.some((i) => i.code === "END_BEFORE_START")).toBe(false);
  });

  test("8:00 PM to 2:00 AM is overnight, 6 hours, and not blocked", () => {
    const day = sanitizeEventDay(completeDay(1, { startTime: "20:00", endTime: "02:00", overnight: false }));
    expect(inferOvernight("20:00", "02:00")).toBe(true);
    expect(day.overnight).toBe(true);
    expect(validateDay(day).some((i) => i.code === "END_BEFORE_START")).toBe(false);
    expect(durationMinutes("20:00", "02:00", day.overnight)).toBe(360);
    expect(formatDuration(360)).toBe("6 hours");
  });
});

describe("Android QA — add-on validation", () => {
  test.each([
    ["LED Wall only", (d: EventDay) => {
      d.photography = { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 };
      d.ledWall = { enabled: true, size: "8 x 12", screenCount: 1 };
    }],
    ["Web Live only", (d: EventDay) => {
      d.photography = { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 };
      d.webLive = { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" };
    }],
    ["Aerial only", (d: EventDay) => {
      d.photography = { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 };
      d.aerial = { photographyDrones: 1, videographyDrones: 0 };
    }],
  ])("%s is rejected with the core-service message", (_name, setup) => {
    const day = completeDay(1);
    setup(day);
    const issues = validateCoreServiceRule(day);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe(CORE_SERVICE_REQUIRED_MESSAGE);
  });

  test("disabled LED / Web Live are ignored by matching aggregation", () => {
    const day = completeDay(1);
    day.ledWall = { enabled: false, size: "12 x 16", screenCount: 4 };
    day.webLive = { enabled: false, quality: "4K", cameraCount: 3, streamingPlatform: "x", accessType: "public" };
    const sanitized = sanitizeEventDay(day);
    const req = aggregateRequirement([sanitized]);
    expect(req.needsLedWall).toBe(false);
    expect(req.needsWebLive).toBe(false);
    expect(req.maxLedScreens).toBe(0);
  });
});

describe("Android QA — multi-day independence", () => {
  test("Day 2 starts empty and duplicating Day 1 does not rewrite Day 2", () => {
    const day1 = completeDay(1, { eventTypeIds: ["haldi"], startTime: "09:00", endTime: "13:00" });
    const day2 = createEmptyDay(2);
    expect(day2.eventTypeIds).toEqual([]);
    expect(day2.startTime).toBeNull();
    expect(day2.ledWall.enabled).toBe(false);

    const copy = duplicateDay(day1, 3);
    expect(copy.eventTypeIds).toEqual(["haldi"]);
    expect(copy.startTime).toBe("09:00");
    expect(day2.eventTypeIds).toEqual([]);
    expect(day1.eventTypeIds).toEqual(["haldi"]);
  });
});

describe("Android QA — budget and vendor matching", () => {
  test("budget must be greater than zero and packages come from engine options", () => {
    expect(validateBudget(0).length).toBeGreaterThan(0);
    expect(validateBudget(75000)).toHaveLength(0);
    const options = generatePackageOptions({ days: [completeDay(1)], deliverables: createEmptyBooking("c").deliverables }, 75000);
    expect(options.map((o) => o.id)).toEqual(["essential", "signature", "elite"]);
    expect(options.every((o) => o.minPrice > 0 && o.maxPrice >= o.minPrice)).toBe(true);
  });

  test("matching never returns more than 6 providers", () => {
    const vendors: CustomerVendor[] = Array.from({ length: 12 }, (_, i) => ({
      vendorId: `v${i}`,
      studioName: `Studio ${i}`,
      city: "Tirupati",
      area: "Tirupati",
      lat: 13.65,
      lng: 79.42,
      experienceYears: 8,
      rating: 4.4,
      completedBookings: 40,
      responseRatePct: 80,
      photography: { traditional: true, candid: true, maxPhotographers: 4 },
      videography: { traditional: true, candid: true, maxVideographers: 4 },
      aerial: { photography: true, videography: true, maxDrones: 2 },
      ledWall: { available: true, sizes: ["8 x 12"], maxScreens: 4 },
      webLive: { available: true, qualities: ["HD", "4K"] },
      portfolioImages: ["https://example.com/1.jpg"],
      about: "Studio",
      serviceAreas: ["Tirupati"],
      kycVerified: true,
      liveSource: true,
      basePricePerDay: 15000,
      contactMaskedUntilAccepted: true,
    }));
    const results = matchVendors(
      { days: [completeDay(1)], deliverables: createEmptyBooking("c").deliverables },
      vendors,
      "signature",
      120000,
    );
    expect(results.length).toBeLessThanOrEqual(MAX_MATCHES);
  });

  test("submitted booking ids are generated as CAM-YEAR-sequence", () => {
    expect(makeBookingId(2026, 12)).toBe("CAM-2026-000012");
  });
});
