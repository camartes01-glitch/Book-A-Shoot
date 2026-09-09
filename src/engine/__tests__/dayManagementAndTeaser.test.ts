/**
 * Tests for Day Management, Wedding & Outdoor Teaser Cinematic Editing,
 * pricing accuracy, range preservation, and automatic progression validation.
 */
import {
  DELIVERABLES_PRICING,
  approvedDeliverablesLines,
  getBookingPricingModel,
} from "@/src/config/approvedBudget";
import { createEmptyDay, emptyDeliverables, sanitizeEventDay } from "@/src/domain/defaults";
import { generatePackageOptions } from "@/src/engine/pricing";
import { setAerialEnabled, setPhotographySelected, setVideographySelected } from "@/src/domain/dayServices";
import { hasCoreService } from "@/src/engine/validation";
import * as bookingApi from "@/src/services/bookingApi";
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

function makeOutdoorDay(eventId = "pre_wedding", patch: Partial<EventDay> = {}, order = 1): EventDay {
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

describe("Part 1 & 7: Day Management — Edit & Delete", () => {

  test("Edit existing Day 1 updates the same dayId and does not duplicate", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_123");
    const initialDayId = fresh.days[0].dayId;
    expect(fresh.days).toHaveLength(1);

    // Edit the day
    const updated = await bookingApi.updateDay(fresh.bookingId, initialDayId, {
      eventTypeIds: ["wedding"],
      eventDate: "2026-12-01",
    });

    expect(updated.days).toHaveLength(1);
    expect(updated.days[0].dayId).toBe(initialDayId);
    expect(updated.days[0].eventTypeIds).toEqual(["wedding"]);
    expect(updated.days[0].eventDate).toBe("2026-12-01");
  });

  test("Add another day creates distinct stable dayIds", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_123");
    const day1Id = fresh.days[0].dayId;

    const withDay2 = await bookingApi.addDay(fresh.bookingId);
    expect(withDay2.days).toHaveLength(2);
    expect(withDay2.days[0].dayId).toBe(day1Id);
    expect(withDay2.days[1].dayId).not.toBe(day1Id);
    expect(withDay2.days[0].order).toBe(1);
    expect(withDay2.days[1].order).toBe(2);
  });

  test("Delete Day 2 removes only Day 2 and leaves Day 1 intact", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_123");
    const day1Id = fresh.days[0].dayId;
    await bookingApi.updateDay(fresh.bookingId, day1Id, { eventTypeIds: ["wedding"] });

    const withDay2 = await bookingApi.addDay(fresh.bookingId);
    const day2Id = withDay2.days[1].dayId;
    await bookingApi.updateDay(fresh.bookingId, day2Id, { eventTypeIds: ["reception"] });

    // Delete Day 2
    const afterDelete = await bookingApi.deleteDay(fresh.bookingId, day2Id);
    expect(afterDelete.days).toHaveLength(1);
    expect(afterDelete.days[0].dayId).toBe(day1Id);
    expect(afterDelete.days[0].order).toBe(1);
    expect(afterDelete.days[0].eventTypeIds).toEqual(["wedding"]);
  });

  test("Delete Day 1 when Day 2 exists removes Day 1 and renumbers Day 2 as Day 1 while keeping stable dayId", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_123");
    const day1Id = fresh.days[0].dayId;
    const withDay2 = await bookingApi.addDay(fresh.bookingId);
    const day2Id = withDay2.days[1].dayId;
    await bookingApi.updateDay(fresh.bookingId, day2Id, { eventTypeIds: ["engagement"] });

    // Delete Day 1
    const afterDelete = await bookingApi.deleteDay(fresh.bookingId, day1Id);
    expect(afterDelete.days).toHaveLength(1);
    expect(afterDelete.days[0].dayId).toBe(day2Id); // Stable dayId preserved!
    expect(afterDelete.days[0].order).toBe(1); // Renumbered visually as Day 1
    expect(afterDelete.days[0].eventTypeIds).toEqual(["engagement"]);
  });

  test("Delete cannot leave booking with zero days", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_123");
    expect(fresh.days).toHaveLength(1);

    await expect(bookingApi.deleteDay(fresh.bookingId, fresh.days[0].dayId)).rejects.toThrow(
      /at least one event day/i,
    );
  });

  test("Stable dayIds survive reordering", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_123");
    const day1Id = fresh.days[0].dayId;
    const withDay2 = await bookingApi.addDay(fresh.bookingId);
    const day2Id = withDay2.days[1].dayId;

    const reordered = await bookingApi.reorderDays(fresh.bookingId, [day2Id, day1Id]);
    expect(reordered.days[0].dayId).toBe(day2Id);
    expect(reordered.days[0].order).toBe(1);
    expect(reordered.days[1].dayId).toBe(day1Id);
    expect(reordered.days[1].order).toBe(2);
  });
});

describe("Part 2, 3, 4 & 5: Teaser Cinematic Pricing Accuracy & Range Preservation", () => {
  test("Wedding teaser rates match pricing sheet exactly", () => {
    const rates = DELIVERABLES_PRICING.wedding.teaserCinematicEditingPerMin;
    expect(rates.essential).toEqual({ min: 1500, max: 2500 });
    expect(rates.signature).toEqual({ min: 1500, max: 2500 });
    expect(rates.elite).toEqual({ min: 3500, max: 5000 });
  });

  test("Outdoor teaser rates match pricing sheet exactly", () => {
    const rates = DELIVERABLES_PRICING.outdoor.teaserCinematicEditingPerMin;
    expect(rates.essential).toEqual({ min: 1500, max: 2500 });
    expect(rates.signature).toEqual({ min: 1500, max: 2500 });
    expect(rates.elite).toEqual({ min: 3500, max: 5000 });
  });

  test("Wedding and Outdoor teaser configurations remain distinct objects", () => {
    expect(DELIVERABLES_PRICING.wedding.teaserCinematicEditingPerMin).not.toBe(
      DELIVERABLES_PRICING.outdoor.teaserCinematicEditingPerMin,
    );
  });

  test("Pricing model detection identifies Wedding vs Outdoor Shoot correctly", () => {
    expect(getBookingPricingModel([makeWeddingDay()])).toBe("wedding");
    expect(getBookingPricingModel([makeOutdoorDay("pre_wedding")])).toBe("outdoor");
    expect(getBookingPricingModel([makeOutdoorDay("post_wedding")])).toBe("outdoor");
    expect(getBookingPricingModel([makeOutdoorDay("baby_shoot")])).toBe("outdoor");
    expect(getBookingPricingModel([makeOutdoorDay("corporate_event")])).toBe("outdoor");
  });

  test("Wedding Teaser calculates accurate range based on duration (not midpoint)", () => {
    const days = [makeWeddingDay()];
    const deliverables = {
      ...emptyDeliverables(),
      video: {
        ...emptyDeliverables().video,
        teaserCinematicEnabled: true,
        teaserDurationMinutes: 2, // 2 minutes
      },
    };

    const essentialLines = approvedDeliverablesLines(deliverables, days, "essential");
    expect(essentialLines).toHaveLength(1);
    expect(essentialLines[0].label).toBe("Wedding Teaser Cinematic Editing");
    expect(essentialLines[0].quantity).toBe(2);
    // 2 min * 1500–2500 = 3000–5000
    expect(essentialLines[0].minPrice).toBe(3000);
    expect(essentialLines[0].maxPrice).toBe(5000);

    const eliteLines = approvedDeliverablesLines(deliverables, days, "elite");
    // 2 min * 3500–5000 = 7000–10000
    expect(eliteLines[0].minPrice).toBe(7000);
    expect(eliteLines[0].maxPrice).toBe(10000);
  });

  test("Outdoor Shoot Teaser displays Outdoor wording and accurate range for duration", () => {
    const days = [makeOutdoorDay("pre_wedding")];
    const deliverables = {
      ...emptyDeliverables(),
      video: {
        ...emptyDeliverables().video,
        teaserCinematicEnabled: true,
        teaserDurationMinutes: 3, // 3 minutes
      },
    };

    const sigLines = approvedDeliverablesLines(deliverables, days, "signature");
    expect(sigLines).toHaveLength(1);
    expect(sigLines[0].label).toBe("Outdoor Shoot Teaser Cinematic Editing");
    expect(sigLines[0].quantity).toBe(3);
    // 3 min * 1500–2500 = 4500–7500
    expect(sigLines[0].minPrice).toBe(4500);
    expect(sigLines[0].maxPrice).toBe(7500);
  });

  test("Package options include teaser range in overall total and line items", () => {
    const day = setPhotographySelected(makeWeddingDay(), true);
    const deliverablesWithTeaser = {
      ...emptyDeliverables(),
      video: {
        ...emptyDeliverables().video,
        teaserCinematicEnabled: true,
        teaserDurationMinutes: 2,
      },
    };

    const withoutTeaser = generatePackageOptions({ days: [day], deliverables: emptyDeliverables() }, 100000);
    const withTeaser = generatePackageOptions({ days: [day], deliverables: deliverablesWithTeaser }, 100000);

    const essWithout = withoutTeaser.find((o) => o.id === "essential")!;
    const essWith = withTeaser.find((o) => o.id === "essential")!;

    // 2 minutes teaser at essential is ₹3,000–₹5,000
    expect(essWith.minPrice).toBe(essWithout.minPrice + 3000);
    expect(essWith.maxPrice).toBe(essWithout.maxPrice + 5000);

    // Verify teaser appears in bullets / service lines
    const teaserLine = essWith.serviceLines.find((l) => l.label === "Wedding Teaser Cinematic Editing");
    expect(teaserLine).toBeDefined();
    expect(teaserLine?.minPrice).toBe(3000);
    expect(teaserLine?.maxPrice).toBe(5000);
  });

  test("Budget remains separate from calculated package price", () => {
    const day = setPhotographySelected(makeWeddingDay(), true);
    const optionsLowBudget = generatePackageOptions({ days: [day], deliverables: emptyDeliverables() }, 20000);
    const optionsHighBudget = generatePackageOptions({ days: [day], deliverables: emptyDeliverables() }, 500000);

    // Package prices do not change based on customer budget!
    expect(optionsLowBudget[0].minPrice).toBe(optionsHighBudget[0].minPrice);
    expect(optionsLowBudget[0].maxPrice).toBe(optionsHighBudget[0].maxPrice);
  });
});

describe("Part 6: Automatic Booking Progression Logic", () => {
  test("Core service required: Photography or Videography must be selected", () => {
    const emptyDay = createEmptyDay(1);
    expect(hasCoreService(emptyDay)).toBe(false);

    // Add-on alone is NOT a core service
    const withAerialOnly = setAerialEnabled(emptyDay, true);
    expect(hasCoreService(withAerialOnly)).toBe(false);

    const withPhoto = setPhotographySelected(emptyDay, true);
    expect(hasCoreService(withPhoto)).toBe(true);

    const withVideo = setVideographySelected(emptyDay, true);
    expect(hasCoreService(withVideo)).toBe(true);

    // Both selected is valid
    const withBoth = setVideographySelected(withPhoto, true);
    expect(hasCoreService(withBoth)).toBe(true);
  });
});

describe("Part 8: Delete Day Behavior, Minimum-Day Protection & Data Integrity", () => {
  test("Deleting a day does not delete the entire booking", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_del_day");
    const day1Id = fresh.days[0].dayId;
    const withDay2 = await bookingApi.addDay(fresh.bookingId);
    const day2Id = withDay2.days[1].dayId;

    const after = await bookingApi.deleteDay(fresh.bookingId, day2Id);
    // Booking itself still exists!
    const inStore = await bookingApi.getBooking(fresh.bookingId);
    expect(inStore).not.toBeNull();
    expect(inStore?.bookingId).toBe(fresh.bookingId);
    expect(inStore?.days).toHaveLength(1);
    expect(inStore?.days[0].dayId).toBe(day1Id);
  });

  test("Deleting Day 1 from a 3-day booking preserves Day 2 and Day 3 and renumbers them 1, 2", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_del_day_3");
    const day1Id = fresh.days[0].dayId;
    const withDay2 = await bookingApi.addDay(fresh.bookingId);
    const day2Id = withDay2.days[1].dayId;
    const withDay3 = await bookingApi.addDay(fresh.bookingId);
    const day3Id = withDay3.days[2].dayId;

    await bookingApi.updateDay(fresh.bookingId, day2Id, { eventTypeIds: ["engagement"] });
    await bookingApi.updateDay(fresh.bookingId, day3Id, { eventTypeIds: ["reception"] });

    // Delete Day 1
    const after = await bookingApi.deleteDay(fresh.bookingId, day1Id);
    expect(after.days).toHaveLength(2);

    // Day 2 is now visual Day 1
    expect(after.days[0].dayId).toBe(day2Id);
    expect(after.days[0].order).toBe(1);
    expect(after.days[0].eventTypeIds).toEqual(["engagement"]);

    // Day 3 is now visual Day 2
    expect(after.days[1].dayId).toBe(day3Id);
    expect(after.days[1].order).toBe(2);
    expect(after.days[1].eventTypeIds).toEqual(["reception"]);
  });

  test("Deleting one booking's day does not affect another booking's days", async () => {
    const bookingA = await bookingApi.startFreshBooking("cust_iso_a");
    const aDay1 = bookingA.days[0].dayId;
    const aWithDay2 = await bookingApi.addDay(bookingA.bookingId);
    const aDay2 = aWithDay2.days[1].dayId;
    await bookingApi.updateDay(bookingA.bookingId, aDay2, { eventTypeIds: ["wedding"] });

    const bookingB = await bookingApi.startFreshBooking("cust_iso_b");
    const bDay1 = bookingB.days[0].dayId;
    const bWithDay2 = await bookingApi.addDay(bookingB.bookingId);
    const bDay2 = bWithDay2.days[1].dayId;
    await bookingApi.updateDay(bookingB.bookingId, bDay2, { eventTypeIds: ["pre_wedding"] });

    // Delete Day 2 from Booking A
    await bookingApi.deleteDay(bookingA.bookingId, aDay2);

    // Verify Booking A has only 1 day
    const aAfter = await bookingApi.getBooking(bookingA.bookingId);
    expect(aAfter?.days).toHaveLength(1);
    expect(aAfter?.days[0].dayId).toBe(aDay1);

    // Verify Booking B still has both Day 1 and Day 2 intact
    const bAfter = await bookingApi.getBooking(bookingB.bookingId);
    expect(bAfter?.days).toHaveLength(2);
    expect(bAfter?.days[0].dayId).toBe(bDay1);
    expect(bAfter?.days[1].dayId).toBe(bDay2);
    expect(bAfter?.days[1].eventTypeIds).toEqual(["pre_wedding"]);
  });

  test("Stale asynchronous write cannot resurrect a deleted day", async () => {
    const fresh = await bookingApi.startFreshBooking("cust_stale");
    const withDay2 = await bookingApi.addDay(fresh.bookingId);
    const day2Id = withDay2.days[1].dayId;

    // Delete Day 2
    await bookingApi.deleteDay(fresh.bookingId, day2Id);

    // Attempt to update the deleted day
    await expect(
      bookingApi.updateDay(fresh.bookingId, day2Id, { eventTypeIds: ["wedding"] }),
    ).rejects.toThrow(/Could not save this event day/i);

    // Ensure day2 was not resurrected in the booking
    const current = await bookingApi.getBooking(fresh.bookingId);
    expect(current?.days).toHaveLength(1);
    expect(current?.days.some((d) => d.dayId === day2Id)).toBe(false);
  });
});
