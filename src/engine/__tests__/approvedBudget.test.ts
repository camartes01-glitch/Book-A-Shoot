import {
  PACKAGE_SOURCE_TO_TIER,
  PACKAGE_TIER_META,
  TIER_TO_PACKAGE_SOURCE,
  approvedRange,
  approvedServiceById,
  approvedServiceLines,
  selectedServiceQuantities,
} from "@/src/config/approvedBudget";
import { setAerialEnabled, setPhotographySelected, setVideographySelected } from "@/src/domain/dayServices";
import { createEmptyDay, emptyDeliverables, sanitizeEventDay } from "@/src/domain/defaults";
import { toCamartesBookingRequest } from "@/src/domain/bookingRequest";
import { checkBudgetFeasibility, generatePackageOptions } from "@/src/engine/pricing";
import { hasCoreService } from "@/src/engine/validation";
import { estimateVendorPrice } from "@/src/engine/matching";
import * as bookingApi from "@/src/services/bookingApi";
import type { CustomerVendor } from "@/src/types/vendor";
import type { EventDay } from "@/src/types/booking";

function day(patch: Partial<EventDay> = {}): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(1),
    eventDate: "2099-10-12",
    eventTypeIds: ["ganesh_pooja"],
    location: { ...createEmptyDay(1).location, formattedAddress: "Hyderabad", city: "Hyderabad" },
    startTime: "10:00",
    endTime: "16:00",
    ...patch,
  });
}

describe("approved package source mapping", () => {
  test("BASIC maps to Essential", () => {
    expect(PACKAGE_SOURCE_TO_TIER.BASIC).toBe("essential");
    expect(PACKAGE_TIER_META.essential.label).toBe("Essential");
    expect(TIER_TO_PACKAGE_SOURCE.essential).toBe("BASIC");
  });

  test("MEDIUM maps to Signature", () => {
    expect(PACKAGE_SOURCE_TO_TIER.MEDIUM).toBe("signature");
    expect(PACKAGE_TIER_META.signature.label).toBe("Signature");
    expect(TIER_TO_PACKAGE_SOURCE.signature).toBe("MEDIUM");
  });

  test("HIGH maps to Elite", () => {
    expect(PACKAGE_SOURCE_TO_TIER.HIGH).toBe("elite");
    expect(PACKAGE_TIER_META.elite.label).toBe("Elite");
    expect(TIER_TO_PACKAGE_SOURCE.elite).toBe("HIGH");
  });
});

describe("approved service ranges", () => {
  test("Traditional Photographer pricing", () => {
    expect(approvedRange("traditional_photographer", "essential")).toEqual({ min: 3000, max: 4000 });
    expect(approvedRange("traditional_photographer", "signature")).toEqual({ min: 4000, max: 5000 });
    expect(approvedRange("traditional_photographer", "elite")).toEqual({ min: 6000, max: 8000 });
  });

  test("Traditional Videographer pricing and per schedule note", () => {
    expect(approvedRange("traditional_videographer", "essential")).toEqual({ min: 3000, max: 4000 });
    expect(approvedRange("traditional_videographer", "signature")).toEqual({ min: 4000, max: 5000 });
    expect(approvedRange("traditional_videographer", "elite")).toEqual({ min: 6000, max: 8000 });
    expect(approvedServiceById("traditional_videographer").note).toBe("per schedule");
    const lines = approvedServiceLines(
      [day({ videography: { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 } })],
      "essential",
    );
    expect(lines.find((l) => l.serviceId === "traditional_videographer")?.note).toBe("per schedule");
  });

  test("Candid Photographer pricing", () => {
    expect(approvedRange("candid_photographer", "essential")).toEqual({ min: 6000, max: 8000 });
    expect(approvedRange("candid_photographer", "signature")).toEqual({ min: 8000, max: 12000 });
    expect(approvedRange("candid_photographer", "elite")).toEqual({ min: 12000, max: 18000 });
  });

  test("Candid Videographer pricing", () => {
    expect(approvedRange("candid_videographer", "essential")).toEqual({ min: 8000, max: 10000 });
    expect(approvedRange("candid_videographer", "signature")).toEqual({ min: 10000, max: 15000 });
    expect(approvedRange("candid_videographer", "elite")).toEqual({ min: 15000, max: 20000 });
  });

  test("Drone operator pricing", () => {
    expect(approvedRange("drone_operators", "essential")).toEqual({ min: 6000, max: 8000 });
    expect(approvedRange("drone_operators", "signature")).toEqual({ min: 8000, max: 12000 });
    expect(approvedRange("drone_operators", "elite")).toEqual({ min: 12000, max: 16000 });
  });

  test("Web Live Link pricing", () => {
    expect(approvedRange("web_live_link", "essential")).toEqual({ min: 4000, max: 5000 });
    expect(approvedRange("web_live_link", "signature")).toEqual({ min: 5000, max: 7000 });
    expect(approvedRange("web_live_link", "elite")).toEqual({ min: 7000, max: 10000 });
  });

  test("LED Wall pricing", () => {
    expect(approvedRange("led_wall", "essential")).toEqual({ min: 8000, max: 12000 });
    expect(approvedRange("led_wall", "signature")).toEqual({ min: 10000, max: 15000 });
    expect(approvedRange("led_wall", "elite")).toEqual({ min: 12000, max: 20000 });
  });
});

describe("selected services drive which ranges appear", () => {
  test("irrelevant services are omitted", () => {
    const photo = setPhotographySelected(day(), true);
    const qty = selectedServiceQuantities([photo]);
    expect(qty.traditional_photographer).toBe(1);
    expect(qty.candid_videographer).toBe(0);
    expect(qty.drone_operators).toBe(0);
    expect(approvedServiceLines([photo], "essential").map((l) => l.serviceId)).toEqual(["traditional_photographer"]);
  });

  test("Drone, LED Wall and Web Live appear only when enabled", () => {
    let selected = setAerialEnabled(setPhotographySelected(day(), true), true);
    selected = {
      ...selected,
      ledWall: { enabled: true, size: "8 x 12", screenCount: 2 },
      webLive: { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
    };
    const ids = approvedServiceLines([selected], "signature").map((l) => l.serviceId);
    expect(ids).toEqual(expect.arrayContaining(["traditional_photographer", "drone_operators", "led_wall", "web_live_link"]));
    expect(selectedServiceQuantities([selected]).led_wall).toBe(2);
    expect(selectedServiceQuantities([selected]).drone_operators).toBe(1);
  });
});

describe("core services remain required; add-ons stay optional", () => {
  test("Photography remains a valid core service", () => {
    const selected = setPhotographySelected(day(), true);
    expect(hasCoreService(selected)).toBe(true);
  });

  test("Videography remains a valid core service", () => {
    const selected = setVideographySelected(day(), true);
    expect(hasCoreService(selected)).toBe(true);
  });

  test("Drone, LED Wall and Web Live do not satisfy the core-service rule", () => {
    const addOnsOnly = day({
      aerial: { photographyDrones: 1, videographyDrones: 0 },
      ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
      webLive: { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
    });
    expect(hasCoreService(addOnsOnly)).toBe(false);
  });
});

describe("package options use approved ranges without inventing a midpoint quote", () => {
  test("always returns Essential, Signature and Elite from the sheet", () => {
    const options = generatePackageOptions({ days: [setPhotographySelected(day(), true)], deliverables: emptyDeliverables() }, 80000);
    expect(options.map((o) => o.id)).toEqual(["essential", "signature", "elite"]);
    expect(options.map((o) => o.label)).toEqual(["Essential", "Signature", "Elite"]);
    expect(options[0].minPrice).toBe(3000);
    expect(options[0].maxPrice).toBe(4000);
    expect(options[1].minPrice).toBe(4000);
    expect(options[1].maxPrice).toBe(5000);
    expect(options[2].minPrice).toBe(6000);
    expect(options[2].maxPrice).toBe(8000);
  });

  test("does not convert a range into a single midpoint price", () => {
    const options = generatePackageOptions({ days: [setPhotographySelected(day(), true)], deliverables: emptyDeliverables() }, 3500);
    expect(options[0].minPrice).not.toBe(options[0].maxPrice);
    expect(options[0].minPrice).not.toBe(3500);
  });
});

describe("booking state and payload", () => {
  test("selected package persists until services change", async () => {
    const created = await bookingApi.createBooking("cust-budget");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, setPhotographySelected(created.days[0], true));
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    const withPackage = await bookingApi.selectPackage(created.bookingId, "signature");
    expect(withPackage.selectedPackage).toBe("signature");
    const reloaded = await bookingApi.getBooking(created.bookingId);
    expect(reloaded?.selectedPackage).toBe("signature");
    const afterTimePersist = await bookingApi.updateDay(created.bookingId, created.days[0].dayId, {
      startTime: "11:00",
      endTime: "17:00",
    });
    expect(afterTimePersist.selectedPackage).toBe("signature");
  });

  test("a later stale persist does not clear a confirmed location or end time", async () => {
    const created = await bookingApi.createBooking("cust-budget-loc");
    const dayId = created.days[0].dayId;
    await bookingApi.updateDay(created.bookingId, dayId, {
      startTime: "10:00",
      endTime: "16:00",
      location: { ...created.days[0].location, formattedAddress: "Hyderabad", city: "Hyderabad" },
    });
    const afterStale = await bookingApi.updateDay(created.bookingId, dayId, created.days[0]);
    expect(afterStale.days[0].location.city).toBe("Hyderabad");
    expect(afterStale.days[0].startTime).toBe("10:00");
    expect(afterStale.days[0].endTime).toBe("16:00");
  });

  test("changing services clears stale package and matching state", async () => {
    const created = await bookingApi.createBooking("cust-budget-2");
    const withPhoto = setPhotographySelected(created.days[0], true);
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, withPhoto);
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "elite");
    const afterChange = await bookingApi.updateDay(created.bookingId, created.days[0].dayId, {
      ...withPhoto,
      photography: { traditional: true, traditionalCount: 1, candid: true, candidCount: 1 },
    });
    expect(afterChange.selectedPackage).toBeNull();
    expect(afterChange.packageOptions).toBeNull();
    expect(afterChange.matches).toBeNull();
    expect(afterChange.days[0].photography.candid).toBe(true);
  });

  test("booking payload keeps the customer budget and does not invent pricing fields", () => {
    const body = toCamartesBookingRequest(
      {
        ...createdBookingShape(),
        budget: 80000,
        selectedPackage: "signature",
        selectedVendorId: "user_16eeb421bc07",
        days: [setPhotographySelected(day(), true)],
      },
      { customerId: "cust-1", name: "Asha", mobile: "9876543210", email: "asha@example.com", avatarInitials: "A", savedAddresses: [] },
    );
    expect(body.budget).toBe("80000");
    expect(body.provider_id).toBe("user_16eeb421bc07");
    expect(Object.keys(body).sort()).toEqual(
      [
        "budget",
        "client_email",
        "client_name",
        "client_phone",
        "duration_hours",
        "end_date",
        "event_date",
        "event_time",
        "message",
        "provider_id",
        "provider_profile_id",
        "service_type",
      ].sort(),
    );
    expect(body.message).toContain("Package: signature");
  });

  test("provider estimated price uses catalog full-day rate, not a package midpoint", () => {
    const vendor = {
      vendorId: "v1",
      studioName: "Studio",
      city: "Hyderabad",
      area: "",
      lat: 0,
      lng: 0,
      experienceYears: 5,
      rating: 4,
      completedBookings: 1,
      responseRatePct: 80,
      photography: { traditional: true, candid: false, maxPhotographers: 2 },
      videography: { traditional: false, candid: false, maxVideographers: 0 },
      aerial: { photography: false, videography: false, maxDrones: 0 },
      ledWall: { available: false, sizes: [], maxScreens: 0 },
      webLive: { available: false, qualities: [] },
      portfolioImages: [],
      about: "",
      serviceAreas: ["Hyderabad"],
      kycVerified: true,
      liveSource: true,
      basePricePerDay: 15000,
      listedAvailable: true,
      contactMaskedUntilAccepted: true,
    } satisfies CustomerVendor;
    expect(estimateVendorPrice(vendor, { days: [setPhotographySelected(day(), true)], deliverables: emptyDeliverables() }, "elite")).toBe(15000);
  });
});

describe("budget feasibility uses the Essential range floor", () => {
  test("flags a budget below the approved Essential minimum", () => {
    const result = checkBudgetFeasibility({ days: [setPhotographySelected(day(), true)], deliverables: emptyDeliverables() }, 1000);
    expect(result.isBelowEstimate).toBe(true);
    expect(result.estimatedCost).toBe(3000);
  });
});

function createdBookingShape() {
  return {
    bookingId: "draft-1",
    customerId: "cust-1",
    status: "VENDOR_SELECTED" as const,
    createdAt: "",
    updatedAt: "",
    deliverables: emptyDeliverables(),
    expectedDeliveryDate: "2099-11-01",
    packageOptions: null,
    matches: null,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 50,
  };
}
