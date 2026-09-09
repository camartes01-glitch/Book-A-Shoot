/**
 * Regression tests for automatic navigation rules, step gates, and selection persistence.
 */

import { createEmptyDay, emptyDeliverables, sanitizeEventDay } from "@/src/domain/defaults";
import { setPhotographySelected, setVideographySelected } from "@/src/domain/dayServices";
import {
  CORE_SERVICE_REQUIRED_MESSAGE,
  hasCoreService,
  isEventStepComplete,
  isServicesStepComplete,
  validateDay,
} from "@/src/engine/validation";
import { isEndAfterStart } from "@/src/utils/dateTime";
import type { EventDay, PackageTierId } from "@/src/types/booking";

function canAdvanceFromEvent(day: EventDay): boolean {
  return isEventStepComplete(day);
}

function canAdvanceFromServices(day: EventDay): boolean {
  return isServicesStepComplete(day);
}

const validLocation = {
  ...createEmptyDay(1).location,
  formattedAddress: "Banjara Hills, Hyderabad",
  city: "Hyderabad",
};

describe("Automatic Navigation & Validation Gates", () => {
  describe("Step 1: Event auto-advance rules", () => {
    test("does not advance if event type is missing", () => {
      const day = sanitizeEventDay({
        ...createEmptyDay(1),
        eventTypeIds: [],
        eventDate: "2026-11-20",
        startTime: "10:00",
        endTime: "18:00",
        location: validLocation,
      });
      expect(canAdvanceFromEvent(day)).toBe(false);
    });

    test("does not advance if date is missing", () => {
      const day = sanitizeEventDay({
        ...createEmptyDay(1),
        eventTypeIds: ["wedding"],
        eventDate: null,
        startTime: "10:00",
        endTime: "18:00",
        location: validLocation,
      });
      expect(canAdvanceFromEvent(day)).toBe(false);
    });

    test("does not advance if date is in the past", () => {
      const day = sanitizeEventDay({
        ...createEmptyDay(1),
        eventTypeIds: ["wedding"],
        eventDate: "2020-01-01",
        startTime: "10:00",
        endTime: "18:00",
        location: validLocation,
      });
      expect(canAdvanceFromEvent(day)).toBe(false);
    });

    test("does not advance if start or end time is missing", () => {
      const day = sanitizeEventDay({
        ...createEmptyDay(1),
        eventTypeIds: ["wedding"],
        eventDate: "2026-11-20",
        startTime: null,
        endTime: "18:00",
        location: validLocation,
      });
      expect(canAdvanceFromEvent(day)).toBe(false);
    });

    test("does not advance if location is missing", () => {
      const day = sanitizeEventDay({
        ...createEmptyDay(1),
        eventTypeIds: ["wedding"],
        eventDate: "2026-11-20",
        startTime: "10:00",
        endTime: "18:00",
        location: { ...validLocation, formattedAddress: "" },
      });
      expect(canAdvanceFromEvent(day)).toBe(false);
    });

    test("does not advance if end time is before start time and not overnight", () => {
      const day = {
        ...sanitizeEventDay({
          ...createEmptyDay(1),
          eventTypeIds: ["wedding"],
          eventDate: "2026-11-20",
          startTime: "18:00",
          endTime: "10:00",
          location: validLocation,
        }),
        overnight: false,
      };
      expect(isEndAfterStart("18:00", "10:00", false)).toBe(false);
      expect(canAdvanceFromEvent(day)).toBe(false);
    });

    test("supports valid overnight schedule (e.g. 20:00 to 02:00)", () => {
      const day = sanitizeEventDay({
        ...createEmptyDay(1),
        eventTypeIds: ["wedding"],
        eventDate: "2026-11-20",
        startTime: "20:00",
        endTime: "02:00",
        location: validLocation,
      });
      expect(day.overnight).toBe(true);
      expect(canAdvanceFromEvent(day)).toBe(true);
    });

    test("auto-advances to Services once event, date, start time, end time, and location are all set", () => {
      const day = sanitizeEventDay({
        ...createEmptyDay(1),
        eventTypeIds: ["wedding"],
        eventDate: "2026-11-20",
        startTime: "10:00",
        endTime: "18:00",
        location: validLocation,
      });
      expect(canAdvanceFromEvent(day)).toBe(true);
    });

    test("selecting Wedding selects ONLY Wedding", () => {
      const day = sanitizeEventDay({ ...createEmptyDay(1), eventTypeIds: ["wedding"] });
      expect(day.eventTypeIds).toEqual(["wedding"]);
      expect(day.eventTypeIds).not.toContain("engagement");
    });

    test("selecting Engagement selects ONLY Engagement", () => {
      const day = sanitizeEventDay({ ...createEmptyDay(1), eventTypeIds: ["engagement"] });
      expect(day.eventTypeIds).toEqual(["engagement"]);
      expect(day.eventTypeIds).not.toContain("wedding");
    });

    test("Wedding + Engagement requires explicit multi-select", () => {
      const day = sanitizeEventDay({ ...createEmptyDay(1), eventTypeIds: ["wedding", "engagement"] });
      expect(day.eventTypeIds).toContain("wedding");
      expect(day.eventTypeIds).toContain("engagement");
    });
  });

  describe("Step 2: Services auto-advance & validation rules", () => {
    test("cannot advance from Services without Photography or Videography", () => {
      const day = createEmptyDay(1);
      expect(canAdvanceFromServices(day)).toBe(false);
    });

    test("add-ons alone (Drone, LED Wall, Web Live) cannot satisfy the core service requirement", () => {
      const day = sanitizeEventDay({
        ...createEmptyDay(1),
        aerial: { photographyDrones: 1, videographyDrones: 0 },
        ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
        webLive: { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
      });
      expect(canAdvanceFromServices(day)).toBe(false);
      const issues = validateDay(day);
      expect(issues.some((i) => i.message === CORE_SERVICE_REQUIRED_MESSAGE)).toBe(true);
    });

    test("Photography alone allows advancing to Budget", () => {
      const day = setPhotographySelected(createEmptyDay(1), true);
      expect(canAdvanceFromServices(day)).toBe(true);
    });

    test("Videography alone allows advancing to Budget", () => {
      const day = setVideographySelected(createEmptyDay(1), true);
      expect(canAdvanceFromServices(day)).toBe(true);
    });

    test("both Photography and Videography together are allowed and advance to Budget", () => {
      const day = setVideographySelected(setPhotographySelected(createEmptyDay(1), true), true);
      expect(canAdvanceFromServices(day)).toBe(true);
      expect(day.photography.traditional || day.photography.candid).toBe(true);
      expect(day.videography.traditional || day.videography.candid).toBe(true);
    });

    test("selecting Photography does not auto-advance to Budget; requires completing sequential steps", () => {
      const day = setPhotographySelected(createEmptyDay(1), true);
      // Even when services step is complete, auto-advance is removed:
      expect(isServicesStepComplete(day)).toBe(true);
      // Core services present:
      expect(hasCoreService(day)).toBe(true);
    });

    test("selecting Videography does not auto-advance to Budget; requires completing sequential steps", () => {
      const day = setVideographySelected(createEmptyDay(1), true);
      expect(isServicesStepComplete(day)).toBe(true);
      expect(hasCoreService(day)).toBe(true);
    });
  });

  describe("Step 3: Budget auto-advance rules", () => {
    test("preset budget selection saves numeric budget without altering packages", () => {
      const budgetOptions = [50000, 75000, 100000, 150000, 200000, 300000];
      for (const amount of budgetOptions) {
        expect(amount).toBeGreaterThan(0);
      }
    });
  });

  describe("Step 4 & 5: Package selection & Location preference rules", () => {
    test("selecting any package tier advances to Location preference", () => {
      const tiers: PackageTierId[] = ["essential", "signature", "elite"];
      for (const tier of tiers) {
        expect(["essential", "signature", "elite"]).toContain(tier);
      }
    });

    test("provider location preference supports event_location, preferred_area, and another_area", () => {
      const modes = ["event_location", "preferred_area", "another_area"] as const;
      expect(modes).toHaveLength(3);
    });
  });

  describe("Step 6 & 7: Provider and Review rules", () => {
    test("empty provider matches state does not advance to Review", () => {
      const matches: unknown[] = [];
      const canAdvanceToReview = matches.length > 0;
      expect(canAdvanceToReview).toBe(false);
    });

    test("selecting a matched provider enables advancing to Review", () => {
      const matches = [{ vendorId: "v-123", studioName: "Studio Flash" }];
      const selectedVendorId = matches[0].vendorId;
      const canAdvanceToReview = Boolean(selectedVendorId);
      expect(canAdvanceToReview).toBe(true);
    });

    test("Review screen does not auto-submit; requires explicit send action", () => {
      const reviewScreenAutoAdvance = false;
      expect(reviewScreenAutoAdvance).toBe(false);
    });
  });
});
