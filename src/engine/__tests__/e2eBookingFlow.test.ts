import { setAerialEnabled, setPhotographySelected, setVideographySelected } from "@/src/domain/dayServices";
import { createEmptyDay, emptyDeliverables, hydrateEditorDay, sanitizeEventDay } from "@/src/domain/defaults";
import { durationMinutes } from "@/src/utils/dateTime";
import { LED_WALL_SIZES } from "@/src/constants/limits";
import { PACKAGE_SOURCE_TO_TIER, PACKAGE_TIER_META } from "@/src/config/approvedBudget";
import { generatePackageOptions } from "@/src/engine/pricing";
import { matchVendors } from "@/src/engine/matching";
import * as bookingApi from "@/src/services/bookingApi";
import { normalizeRouteParam } from "@/src/utils/routeParam";
import type { CustomerVendor } from "@/src/types/vendor";
import type { EventDay } from "@/src/types/booking";

function completeDay(patch: Partial<EventDay> = {}): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(1),
    eventDate: "2099-10-12",
    eventTypeIds: ["ganesh_pooja"],
    location: {
      ...createEmptyDay(1).location,
      formattedAddress: "Hyderabad",
      city: "Hyderabad",
    },
    startTime: "10:00",
    endTime: "16:00",
    ...patch,
  });
}

function vendor(overrides: Partial<CustomerVendor> = {}): CustomerVendor {
  return {
    vendorId: "v1",
    studioName: "Studio One",
    city: "Hyderabad",
    area: "Hyderabad",
    lat: 17.38,
    lng: 78.48,
    experienceYears: 8,
    rating: 4.2,
    completedBookings: 40,
    responseRatePct: 90,
    photography: { traditional: true, candid: false, maxPhotographers: 4 },
    videography: { traditional: true, candid: false, maxVideographers: 4 },
    aerial: { photography: true, videography: true, maxDrones: 3 },
    ledWall: { available: true, sizes: ["8 x 12"], maxScreens: 6 },
    webLive: { available: true, qualities: ["HD", "4K"] },
    portfolioImages: [],
    about: "",
    serviceAreas: ["Hyderabad"],
    kycVerified: true,
    liveSource: true,
    basePricePerDay: 15000,
    listedAvailable: true,
    contactMaskedUntilAccepted: true,
    ...overrides,
  };
}

describe("Start Booking is a genuine fresh draft", () => {
  test("startFreshBooking has no stale event days, provider, budget, package, or add-ons", async () => {
    const previous = await bookingApi.createBooking("cust-fresh");
    await bookingApi.updateDay(previous.bookingId, previous.days[0].dayId, {
      ...setAerialEnabled(setPhotographySelected(completeDay({ eventTypeIds: ["ganesh_pooja"] }), true), true),
      ledWall: { enabled: true, size: "8 x 12", screenCount: 2 },
    });
    await bookingApi.submitBudget(previous.bookingId, 80000);
    await bookingApi.selectPackage(previous.bookingId, "elite");
    const fresh = await bookingApi.startFreshBooking("cust-fresh");
    expect(fresh.bookingId).not.toBe(previous.bookingId);
    expect(fresh.days).toHaveLength(1);
    expect(fresh.days[0].eventTypeIds).toEqual([]);
    expect(fresh.days[0].photography.traditional).toBe(false);
    expect(fresh.days[0].aerial).toEqual({ photographyDrones: 0, videographyDrones: 0 });
    expect(fresh.days[0].ledWall.enabled).toBe(false);
    expect(fresh.days[0].webLive.enabled).toBe(false);
    expect(fresh.budget).toBeNull();
    expect(fresh.selectedPackage).toBeNull();
    expect(fresh.selectedVendorId).toBeNull();
    expect(fresh.matches).toBeNull();
    const stillThere = await bookingApi.getBooking(previous.bookingId);
    expect(stillThere?.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(stillThere?.selectedPackage).toBe("elite");
  });

  test("overlapping startFreshBooking shares one draft so the day id stays valid", async () => {
    const [a, b] = await Promise.all([bookingApi.startFreshBooking("cust-race"), bookingApi.startFreshBooking("cust-race")]);
    expect(a.bookingId).toBe(b.bookingId);
    expect(await bookingApi.getBooking(a.bookingId)).not.toBeNull();
    expect(a.days[0].dayId).toBe(b.days[0].dayId);
    await bookingApi.updateDay(a.bookingId, a.days[0].dayId, { eventTypeIds: ["ganesh_pooja"] });
    const after = await bookingApi.getBooking(a.bookingId);
    expect(after?.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
  });

  test("updateDay with a different existing booking id still updates the day that owns that id", async () => {
    const first = await bookingApi.createBooking("cust-wrong-id");
    const second = await bookingApi.createBooking("cust-wrong-id");
    const after = await bookingApi.updateDay(second.bookingId, first.days[0].dayId, { eventTypeIds: ["ganesh_pooja"] });
    expect(after.bookingId).toBe(first.bookingId);
    expect(after.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect((await bookingApi.getBooking(second.bookingId))?.days[0].eventTypeIds).toEqual([]);
  });

  test("updateDay can recover the booking that owns a day id", async () => {
    const created = await bookingApi.createBooking("cust-recover");
    const dayId = created.days[0].dayId;
    const owner = await bookingApi.getBookingContainingDay(dayId);
    expect(owner?.bookingId).toBe(created.bookingId);
    const after = await bookingApi.updateDay("missing-booking", dayId, { eventTypeIds: ["diwali_pooja"] });
    expect(after.bookingId).toBe(created.bookingId);
    expect(after.days[0].eventTypeIds).toEqual(["diwali_pooja"]);
  });

  test("startFreshBooking does not reuse a previous draft and keeps in-progress bookings", async () => {
    const empty = await bookingApi.createBooking("cust-prune");
    const inProgress = await bookingApi.createBooking("cust-prune");
    await bookingApi.updateDay(inProgress.bookingId, inProgress.days[0].dayId, completeDay());
    const next = await bookingApi.startFreshBooking("cust-prune");
    expect(next.bookingId).not.toBe(empty.bookingId);
    expect(next.bookingId).not.toBe(inProgress.bookingId);
    expect(await bookingApi.getBooking(empty.bookingId)).not.toBeNull();
    expect(await bookingApi.getBooking(inProgress.bookingId)).not.toBeNull();
    expect(next.days[0].eventTypeIds).toEqual([]);
  });
});

describe("package and service mapping", () => {
  test("BASIC/MEDIUM/HIGH map to Essential/Signature/Elite", () => {
    expect(PACKAGE_SOURCE_TO_TIER.BASIC).toBe("essential");
    expect(PACKAGE_TIER_META.essential.label).toBe("Essential");
    expect(PACKAGE_SOURCE_TO_TIER.MEDIUM).toBe("signature");
    expect(PACKAGE_TIER_META.signature.label).toBe("Signature");
    expect(PACKAGE_SOURCE_TO_TIER.HIGH).toBe("elite");
    expect(PACKAGE_TIER_META.elite.label).toBe("Elite");
  });

  test("changing event type does not clear the selected package", async () => {
    const created = await bookingApi.createBooking("cust-pkg");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, setPhotographySelected(completeDay(), true));
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const afterType = await bookingApi.updateDay(created.bookingId, created.days[0].dayId, { eventTypeIds: ["diwali_pooja"] });
    expect(afterType.selectedPackage).toBe("signature");
    expect(afterType.days[0].eventTypeIds).toEqual(["diwali_pooja"]);
    expect(afterType.days[0].dayId).toBe(created.days[0].dayId);
  });

  test("a full empty-day persist does not overwrite the stored day identity", async () => {
    const created = await bookingApi.createBooking("cust-id");
    const originalId = created.days[0].dayId;
    const originalOrder = created.days[0].order;
    const stale = createEmptyDay(99);
    const after = await bookingApi.updateDay(created.bookingId, originalId, stale);
    expect(after.days).toHaveLength(1);
    expect(after.days[0].dayId).toBe(originalId);
    expect(after.days[0].order).toBe(originalOrder);
    expect(after.days[0].dayId).not.toBe(stale.dayId);
  });

  test("a stale empty persist cannot wipe Pooja, date, or overnight times", async () => {
    const created = await bookingApi.createBooking("cust-stale");
    const dayId = created.days[0].dayId;
    await bookingApi.updateDay(
      created.bookingId,
      dayId,
      setPhotographySelected(completeDay({ eventTypeIds: ["ganesh_pooja"], startTime: "20:00", endTime: "02:00" }), true),
    );
    const stale = createEmptyDay(1);
    const after = await bookingApi.updateDay(created.bookingId, dayId, stale);
    expect(after.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(after.days[0].eventDate).toBe("2099-10-12");
    expect(after.days[0].startTime).toBe("20:00");
    expect(after.days[0].endTime).toBe("02:00");
    expect(after.days[0].photography.traditional).toBe(false);
  });

  test("LED Wall sizes 6 x 8, 8 x 12 and 12 x 16 are the approved catalog", () => {
    expect(LED_WALL_SIZES).toEqual(["6 x 8", "8 x 12", "12 x 16"]);
  });

  test("Photography only and Videography only produce the matching service_type", () => {
    const photo = generatePackageOptions({ days: [setPhotographySelected(completeDay(), true)], deliverables: emptyDeliverables() }, 80000);
    const video = generatePackageOptions({ days: [setVideographySelected(completeDay(), true)], deliverables: emptyDeliverables() }, 80000);
    expect(photo.map((p) => p.id)).toEqual(["essential", "signature", "elite"]);
    expect(video.map((p) => p.id)).toEqual(["essential", "signature", "elite"]);
  });
});

describe("day editor hydrate after location", () => {
  test("local Ganesh Pooja, date and times survive an empty stored day", () => {
    const stored = createEmptyDay(1);
    const local = completeDay({ dayId: stored.dayId, order: stored.order, eventTypeIds: ["ganesh_pooja"] });
    const hydrated = hydrateEditorDay(stored, local);
    expect(hydrated.dayId).toBe(stored.dayId);
    expect(hydrated.eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(hydrated.eventDate).toBe("2099-10-12");
    expect(hydrated.startTime).toBe("10:00");
    expect(hydrated.endTime).toBe("16:00");
    expect(hydrated.location.city).toBe("Hyderabad");
  });

  test("stored location is kept when local still has Pooja and times but no address", () => {
    const stored = completeDay({ eventTypeIds: ["ganesh_pooja"] });
    const local = sanitizeEventDay({
      ...stored,
      location: createEmptyDay(1).location,
    });
    const hydrated = hydrateEditorDay(stored, local);
    expect(hydrated.eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(hydrated.location.formattedAddress).toBe("Hyderabad");
    expect(hydrated.startTime).toBe("10:00");
  });
});

describe("overnight duration", () => {
  test("20:00 to 02:00 is 6 hours", () => {
    expect(durationMinutes("20:00", "02:00", true)).toBe(360);
    expect(durationMinutes("20:00", "02:00", false)).toBe(360);
  });
});

describe("matching honesty", () => {
  test("traditional-only requirements do not match candid-only providers", () => {
    const candidOnly = vendor({
      vendorId: "candid-only",
      photography: { traditional: false, candid: true, maxPhotographers: 2 },
      videography: { traditional: false, candid: false, maxVideographers: 0 },
    });
    const day = setPhotographySelected(completeDay(), true);
    const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, [candidOnly], "signature", 80000);
    expect(results).toEqual([]);
  });

  test("empty live catalog stays empty", () => {
    const results = matchVendors({ days: [setPhotographySelected(completeDay(), true)], deliverables: emptyDeliverables() }, [], "signature", 80000);
    expect(results).toEqual([]);
  });
});

describe("day identity and location persist", () => {
  test("Expo Router array dayId still updates the original day", async () => {
    expect(normalizeRouteParam(["day-abc", "day-abc"])).toBe("day-abc");
    expect(normalizeRouteParam(["", "day-abc"])).toBe("day-abc");
    const created = await bookingApi.createBooking("cust-array-id");
    const dayId = created.days[0].dayId;
    const order = created.days[0].order;
    await bookingApi.updateDay(created.bookingId, dayId, {
      eventTypeIds: ["ganesh_pooja"],
      eventDate: "2099-10-12",
      startTime: "20:00",
      endTime: "02:00",
    });
    const withPhoto = await bookingApi.updateDay(created.bookingId, dayId, setPhotographySelected(created.days[0], true));
    const afterLocation = await bookingApi.updateDay(created.bookingId, [dayId], {
      location: { ...created.days[0].location, formattedAddress: "Hyderabad", city: "Hyderabad" },
    });
    expect(afterLocation.days).toHaveLength(1);
    expect(afterLocation.days[0].dayId).toBe(dayId);
    expect(afterLocation.days[0].order).toBe(order);
    expect(afterLocation.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(afterLocation.days[0].eventDate).toBe("2099-10-12");
    expect(afterLocation.days[0].startTime).toBe("20:00");
    expect(afterLocation.days[0].endTime).toBe("02:00");
    expect(afterLocation.days[0].photography.traditional).toBe(true);
    expect(afterLocation.days[0].location.city).toBe("Hyderabad");
    expect(withPhoto.days[0].dayId).toBe(dayId);
  });

  test("updateDay never lets a patch replace dayId or order", async () => {
    const created = await bookingApi.createBooking("cust-id-lock");
    const dayId = created.days[0].dayId;
    const after = await bookingApi.updateDay(created.bookingId, dayId, {
      dayId: "forged-day",
      order: 99,
      eventTypeIds: ["ganesh_pooja"],
    });
    expect(after.days[0].dayId).toBe(dayId);
    expect(after.days[0].order).toBe(1);
    expect(after.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
  });

  test("a lower dayRevision snapshot cannot wipe a newer Pooja or photography persist", async () => {
    const created = await bookingApi.createBooking("cust-rev");
    const dayId = created.days[0].dayId;
    await bookingApi.updateDay(
      created.bookingId,
      dayId,
      setPhotographySelected(completeDay({ eventTypeIds: ["ganesh_pooja"], dayRevision: 4 }), true),
    );
    const stale = { ...createEmptyDay(1), dayRevision: 1 };
    const after = await bookingApi.updateDay(created.bookingId, dayId, stale);
    expect(after.days[0].dayId).toBe(dayId);
    expect(after.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(after.days[0].photography.traditional).toBe(true);
    expect(after.days[0].eventDate).toBe("2099-10-12");
  });

  test("location-only save preserves Pooja, date, times and services on the same dayId", async () => {
    const created = await bookingApi.createBooking("cust-loc-only");
    const dayId = created.days[0].dayId;
    await bookingApi.updateDay(
      created.bookingId,
      dayId,
      {
        ...setAerialEnabled(setPhotographySelected(completeDay({ eventTypeIds: ["ganesh_pooja"], startTime: "20:00", endTime: "02:00" }), true), true),
        ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
        webLive: { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
      },
    );
    const after = await bookingApi.updateDay(created.bookingId, dayId, {
      location: { ...created.days[0].location, formattedAddress: "Hyderabad, Telangana", city: "Hyderabad" },
    });
    expect(after.days[0].dayId).toBe(dayId);
    expect(after.days[0].order).toBe(1);
    expect(after.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(after.days[0].eventDate).toBe("2099-10-12");
    expect(after.days[0].startTime).toBe("20:00");
    expect(after.days[0].endTime).toBe("02:00");
    expect(after.days[0].photography.traditional).toBe(true);
    expect(after.days[0].aerial.photographyDrones).toBe(1);
    expect(after.days[0].ledWall.enabled).toBe(true);
    expect(after.days[0].webLive.enabled).toBe(true);
    expect(after.days[0].location.formattedAddress).toBe("Hyderabad, Telangana");
  });

  test("concurrent location and Pooja writes both land on the same day", async () => {
    const created = await bookingApi.createBooking("cust-concurrent");
    const dayId = created.days[0].dayId;
    await Promise.all([
      bookingApi.updateDay(created.bookingId, dayId, { eventTypeIds: ["ganesh_pooja"], eventDate: "2099-10-12", startTime: "10:00", endTime: "16:00" }),
      bookingApi.updateDay(created.bookingId, dayId, {
        location: { ...created.days[0].location, formattedAddress: "Hyderabad", city: "Hyderabad" },
      }),
    ]);
    const after = await bookingApi.getBooking(created.bookingId);
    expect(after?.days[0].dayId).toBe(dayId);
    expect(after?.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(after?.days[0].location.city).toBe("Hyderabad");
    expect(after?.days[0].eventDate).toBe("2099-10-12");
  });

  test("budget and package writes do not change dayId or Pooja", async () => {
    const created = await bookingApi.createBooking("cust-budget-id");
    const dayId = created.days[0].dayId;
    await bookingApi.updateDay(created.bookingId, dayId, setPhotographySelected(completeDay(), true));
    await bookingApi.submitBudget(created.bookingId, 80000);
    const afterPkg = await bookingApi.selectPackage(created.bookingId, "signature");
    expect(afterPkg.days[0].dayId).toBe(dayId);
    expect(afterPkg.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(afterPkg.selectedPackage).toBe("signature");
    expect(afterPkg.budget).toBe(80000);
  });

  test("reorder and duplicate preserve source dayId and create a new one", async () => {
    const created = await bookingApi.createBooking("cust-reorder");
    const firstId = created.days[0].dayId;
    const withSecond = await bookingApi.addDay(created.bookingId);
    const secondId = withSecond.days[1].dayId;
    expect(secondId).not.toBe(firstId);
    const reordered = await bookingApi.reorderDays(created.bookingId, [secondId, firstId]);
    expect(reordered.days.map((d) => d.dayId).sort()).toEqual([firstId, secondId].sort());
    expect(reordered.days.find((d) => d.dayId === firstId)?.order).toBe(2);
    const duplicated = await bookingApi.duplicateExistingDay(created.bookingId, firstId);
    const copy = duplicated.days[duplicated.days.length - 1];
    expect(copy.dayId).not.toBe(firstId);
    expect(copy.dayId).not.toBe(secondId);
    expect(duplicated.days.find((d) => d.dayId === firstId)).toBeTruthy();
  });

  test("deleting day 2 does not change day 1 identity", async () => {
    const created = await bookingApi.createBooking("cust-delete");
    const firstId = created.days[0].dayId;
    await bookingApi.updateDay(created.bookingId, firstId, { eventTypeIds: ["ganesh_pooja"] });
    const withSecond = await bookingApi.addDay(created.bookingId);
    const secondId = withSecond.days[1].dayId;
    const after = await bookingApi.deleteDay(created.bookingId, secondId);
    expect(after.days).toHaveLength(1);
    expect(after.days[0].dayId).toBe(firstId);
    expect(after.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(await bookingApi.getBookingContainingDay(secondId)).toBeNull();
  });

  test("Start Booking still creates exactly one Day 1 with a unique dayId", async () => {
    const fresh = await bookingApi.startFreshBooking("cust-one-day");
    expect(fresh.days).toHaveLength(1);
    expect(fresh.days[0].order).toBe(1);
    expect(fresh.days[0].dayId.startsWith("day-")).toBe(true);
    expect(fresh.days[0].dayId).not.toBe(fresh.bookingId);
  });
});
