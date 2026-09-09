import {
  approvedRange,
  approvedServiceLines,
  overallApprovedRange,
  selectedServiceQuantities,
} from "@/src/config/approvedBudget";
import { setAerialEnabled, setPhotographySelected, setVideographySelected } from "@/src/domain/dayServices";
import { createEmptyDay, emptyDeliverables, sanitizeEventDay } from "@/src/domain/defaults";
import { toCamartesBookingRequest } from "@/src/domain/bookingRequest";
import {
  bookingPricingInputKey,
  generatePackageOptions,
  resolvePackageOptions,
  selectedPackageQuote,
} from "@/src/engine/pricing";
import { durationMinutes } from "@/src/utils/dateTime";
import { formatInrRange, formatPackageOverallLabel } from "@/src/utils/format";
import * as bookingApi from "@/src/services/bookingApi";
import type { EventDay } from "@/src/types/booking";

function day(patch: Partial<EventDay> = {}, order = 1): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(order),
    eventDate: "2026-10-12",
    eventTypeIds: ["ganesh_pooja"],
    location: {
      ...createEmptyDay(order).location,
      formattedAddress: "Hyderabad",
      city: "Hyderabad",
    },
    startTime: "20:00",
    endTime: "02:00",
    ...patch,
  });
}

function bookingShape(days: EventDay[], extra: { budget?: number; selectedPackage?: "essential" | "signature" | "elite" | null } = {}) {
  return {
    days,
    deliverables: emptyDeliverables(),
    budget: extra.budget ?? 80000,
    selectedPackage: extra.selectedPackage ?? null,
  };
}

function totals(days: EventDay[], budget = 80000) {
  const options = generatePackageOptions({ days, deliverables: emptyDeliverables() }, budget);
  return {
    essential: options.find((o) => o.id === "essential")!,
    signature: options.find((o) => o.id === "signature")!,
    elite: options.find((o) => o.id === "elite")!,
  };
}

function withPhotoVideoAddOns(base: EventDay): EventDay {
  let selected = setVideographySelected(setPhotographySelected(base, true), true);
  selected = setAerialEnabled(selected, true);
  return {
    ...selected,
    ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
    webLive: { enabled: true, quality: "HD" as const, cameraCount: 1, streamingPlatform: "", accessType: "private" as const },
  };
}

describe("overall Essential / Signature / Elite calculation", () => {
  test("Photography only uses Traditional Photographer ranges for each package", () => {
    const photo = setPhotographySelected(day(), true);
    const pkg = totals([photo]);
    expect(pkg.essential.minPrice).toBe(3000);
    expect(pkg.essential.maxPrice).toBe(4000);
    expect(pkg.signature.minPrice).toBe(4000);
    expect(pkg.signature.maxPrice).toBe(5000);
    expect(pkg.elite.minPrice).toBe(6000);
    expect(pkg.elite.maxPrice).toBe(8000);
    expect(pkg.essential.serviceLines.map((l) => l.serviceId)).toEqual(["traditional_photographer"]);
  });

  test("Videography only uses Traditional Videographer per-schedule ranges", () => {
    const video = setVideographySelected(day(), true);
    const pkg = totals([video]);
    expect(pkg.essential.minPrice).toBe(3000);
    expect(pkg.essential.maxPrice).toBe(4000);
    expect(pkg.signature.minPrice).toBe(4000);
    expect(pkg.signature.maxPrice).toBe(5000);
    expect(pkg.elite.minPrice).toBe(6000);
    expect(pkg.elite.maxPrice).toBe(8000);
    expect(pkg.essential.serviceLines[0].note).toBe("per schedule");
  });

  test("Photography + Videography sums both selected core services", () => {
    const both = setVideographySelected(setPhotographySelected(day(), true), true);
    const pkg = totals([both]);
    expect(pkg.essential.minPrice).toBe(6000);
    expect(pkg.essential.maxPrice).toBe(8000);
    expect(pkg.signature.minPrice).toBe(8000);
    expect(pkg.signature.maxPrice).toBe(10000);
    expect(pkg.elite.minPrice).toBe(12000);
    expect(pkg.elite.maxPrice).toBe(16000);
  });

  test("Photography + Drone includes drone operators and omits unselected add-ons", () => {
    const selected = setAerialEnabled(setPhotographySelected(day(), true), true);
    const pkg = totals([selected]);
    expect(pkg.essential.minPrice).toBe(3000 + 6000);
    expect(pkg.essential.maxPrice).toBe(4000 + 8000);
    expect(pkg.signature.minPrice).toBe(4000 + 8000);
    expect(pkg.signature.maxPrice).toBe(5000 + 12000);
    expect(pkg.elite.minPrice).toBe(6000 + 12000);
    expect(pkg.elite.maxPrice).toBe(8000 + 16000);
    expect(pkg.essential.serviceLines.map((l) => l.serviceId)).toEqual(["traditional_photographer", "drone_operators"]);
  });

  test("Photography + LED Wall includes LED quantity and omits drone/web live", () => {
    const selected = {
      ...setPhotographySelected(day(), true),
      ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
    };
    const pkg = totals([selected]);
    expect(pkg.essential.minPrice).toBe(3000 + 8000);
    expect(pkg.essential.maxPrice).toBe(4000 + 12000);
    expect(pkg.signature.minPrice).toBe(4000 + 10000);
    expect(pkg.signature.maxPrice).toBe(5000 + 15000);
    expect(pkg.elite.minPrice).toBe(6000 + 12000);
    expect(pkg.elite.maxPrice).toBe(8000 + 20000);
    expect(pkg.essential.serviceLines.map((l) => l.serviceId)).toEqual(["traditional_photographer", "led_wall"]);
  });

  test("Photography + Web Live includes Web Live Link only when enabled", () => {
    const selected = {
      ...setPhotographySelected(day(), true),
      webLive: { enabled: true, quality: "HD" as const, cameraCount: 1, streamingPlatform: "", accessType: "private" as const },
    };
    const pkg = totals([selected]);
    expect(pkg.essential.minPrice).toBe(3000 + 4000);
    expect(pkg.essential.maxPrice).toBe(4000 + 5000);
    expect(pkg.signature.minPrice).toBe(4000 + 5000);
    expect(pkg.signature.maxPrice).toBe(5000 + 7000);
    expect(pkg.elite.minPrice).toBe(6000 + 7000);
    expect(pkg.elite.maxPrice).toBe(8000 + 10000);
  });

  test("Photography + Videography + all add-ons includes each selected line once", () => {
    const selected = withPhotoVideoAddOns(day());
    const pkg = totals([selected]);
    expect(pkg.essential.minPrice).toBe(3000 + 3000 + 6000 + 8000 + 4000);
    expect(pkg.essential.maxPrice).toBe(4000 + 4000 + 8000 + 12000 + 5000);
    expect(pkg.signature.minPrice).toBe(4000 + 4000 + 8000 + 10000 + 5000);
    expect(pkg.signature.maxPrice).toBe(5000 + 5000 + 12000 + 15000 + 7000);
    expect(pkg.elite.minPrice).toBe(6000 + 6000 + 12000 + 12000 + 7000);
    expect(pkg.elite.maxPrice).toBe(8000 + 8000 + 16000 + 20000 + 10000);
    expect(pkg.essential.serviceLines.map((l) => l.serviceId)).toEqual([
      "traditional_photographer",
      "traditional_videographer",
      "drone_operators",
      "web_live_link",
      "led_wall",
    ]);
  });
});

describe("Ganesh Pooja overnight photography booking", () => {
  test("20:00–02:00 is 6 hours overnight and prices Signature from the sheet, not hourly", () => {
    const photo = setPhotographySelected(day(), true);
    expect(photo.overnight).toBe(true);
    expect(durationMinutes(photo.startTime!, photo.endTime!, photo.overnight)).toBe(360);
    const pkg = totals([photo], 80000);
    expect(pkg.essential).toMatchObject({ minPrice: 3000, maxPrice: 4000, label: "Essential" });
    expect(pkg.signature).toMatchObject({ minPrice: 4000, maxPrice: 5000, label: "Signature" });
    expect(pkg.elite).toMatchObject({ minPrice: 6000, maxPrice: 8000, label: "Elite" });
    expect(pkg.signature.minPrice).not.toBe(4000 * 6);
    expect(formatPackageOverallLabel(pkg.signature.label, pkg.signature.minPrice, pkg.signature.maxPrice)).toBe(
      "Signature — ₹4,000–₹5,000",
    );
  });
});

describe("Traditional Videographer stays per schedule", () => {
  test("overnight duration does not multiply Traditional Videographer by hours", () => {
    const video = setVideographySelected(day({ startTime: "20:00", endTime: "02:00" }), true);
    const lines = approvedServiceLines([video], "essential");
    const tv = lines.find((l) => l.serviceId === "traditional_videographer")!;
    expect(tv.note).toBe("per schedule");
    expect(tv.quantity).toBe(1);
    expect(tv.minPrice).toBe(approvedRange("traditional_videographer", "essential").min);
    expect(tv.maxPrice).toBe(approvedRange("traditional_videographer", "essential").max);
    expect(tv.minPrice).not.toBe(3000 * 6);
  });

  test("two traditional videographers on one schedule multiply the per-schedule range by count, not hours", () => {
    const video = setVideographySelected(day(), true);
    video.videography.traditionalCount = 2;
    const pkg = totals([video]);
    expect(pkg.essential.minPrice).toBe(6000);
    expect(pkg.essential.maxPrice).toBe(8000);
  });
});

describe("multiple event days are priced independently then summed", () => {
  test("two photography days sum Essential / Signature / Elite instead of using Day 1 peak only", () => {
    const day1 = setPhotographySelected(day({ eventDate: "2026-10-12", eventTypeIds: ["ganesh_pooja"] }, 1), true);
    const day2 = setPhotographySelected(day({ eventDate: "2026-10-13", eventTypeIds: ["lakshmi_pooja"] }, 2), true);
    const pkg = totals([day1, day2]);
    expect(overallApprovedRange([day1], "essential")).toEqual({ min: 3000, max: 4000 });
    expect(overallApprovedRange([day2], "essential")).toEqual({ min: 3000, max: 4000 });
    expect(pkg.essential.minPrice).toBe(6000);
    expect(pkg.essential.maxPrice).toBe(8000);
    expect(pkg.signature.minPrice).toBe(8000);
    expect(pkg.signature.maxPrice).toBe(10000);
    expect(pkg.elite.minPrice).toBe(12000);
    expect(pkg.elite.maxPrice).toBe(16000);
    expect(selectedServiceQuantities([day1, day2]).traditional_photographer).toBe(2);
  });

  test("Day 2 videography is not replaced by Day 1 photography pricing", () => {
    const day1 = setPhotographySelected(day({ eventDate: "2026-10-12" }, 1), true);
    const day2 = setVideographySelected(day({ eventDate: "2026-10-13", startTime: "10:00", endTime: "16:00" }, 2), true);
    const pkg = totals([day1, day2]);
    expect(pkg.essential.serviceLines.map((l) => l.serviceId).sort()).toEqual([
      "traditional_photographer",
      "traditional_videographer",
    ]);
    expect(pkg.essential.minPrice).toBe(6000);
    expect(pkg.signature.minPrice).toBe(8000);
    expect(pkg.elite.minPrice).toBe(12000);
  });

  test("does not invent a midpoint when summing day ranges", () => {
    const day1 = setPhotographySelected(day({}, 1), true);
    const day2 = setPhotographySelected(day({ eventDate: "2026-10-14" }, 2), true);
    const pkg = totals([day1, day2]);
    expect(pkg.essential.minPrice).not.toBe(pkg.essential.maxPrice);
    expect(pkg.essential.minPrice).not.toBe((pkg.essential.minPrice + pkg.essential.maxPrice) / 2);
  });
});

describe("occasion, date and time do not invent extra multipliers", () => {
  test("the same selected services keep the same overall totals across standard occasions", () => {
    const ganesh = setPhotographySelected(day({ eventTypeIds: ["ganesh_pooja"] }), true);
    const personal = setPhotographySelected(day({ eventTypeIds: ["birthday"] }), true);
    expect(totals([ganesh]).signature).toMatchObject({ minPrice: 4000, maxPrice: 5000 });
    expect(totals([personal]).signature).toMatchObject({ minPrice: 4000, maxPrice: 5000 });

    // Wedding uses the Wedding Package model (8,000–10,000 for Signature)
    const wedding = setPhotographySelected(day({ eventTypeIds: ["wedding"] }), true);
    expect(totals([wedding]).signature).toMatchObject({ minPrice: 8000, maxPrice: 10000 });
  });

  test("the same selected services keep the same overall totals across dates", () => {
    const oct = setPhotographySelected(day({ eventDate: "2026-10-12" }), true);
    const nov = setPhotographySelected(day({ eventDate: "2026-11-02" }), true);
    expect(totals([oct]).elite).toEqual(expect.objectContaining(totals([nov]).elite));
  });

  test("changing start/end time does not multiply per-schedule rates by duration", () => {
    const overnight = setPhotographySelected(day({ startTime: "20:00", endTime: "02:00" }), true);
    const daytime = setPhotographySelected(day({ startTime: "10:00", endTime: "16:00" }), true);
    expect(totals([overnight]).essential.minPrice).toBe(totals([daytime]).essential.minPrice);
    expect(durationMinutes("20:00", "02:00", true)).toBe(360);
    expect(durationMinutes("10:00", "16:00", false)).toBe(360);
  });
});

describe("recalculation and stale totals", () => {
  test("pricing key changes when photography, drone, LED, web live, date, time or another day change", () => {
    const photo = bookingShape([setPhotographySelected(day(), true)]);
    const base = bookingPricingInputKey(photo);
    expect(bookingPricingInputKey(bookingShape([setVideographySelected(day(), true)]))).not.toBe(base);
    expect(bookingPricingInputKey(bookingShape([setAerialEnabled(setPhotographySelected(day(), true), true)]))).not.toBe(base);
    expect(
      bookingPricingInputKey(
        bookingShape([
          {
            ...setPhotographySelected(day(), true),
            ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
          },
        ]),
      ),
    ).not.toBe(base);
    expect(
      bookingPricingInputKey(
        bookingShape([
          {
            ...setPhotographySelected(day(), true),
            webLive: { enabled: true, quality: "HD" as const, cameraCount: 1, streamingPlatform: "", accessType: "private" as const },
          },
        ]),
      ),
    ).not.toBe(base);
    expect(bookingPricingInputKey(bookingShape([setPhotographySelected(day({ eventDate: "2026-10-13" }), true)]))).not.toBe(
      base,
    );
    expect(
      bookingPricingInputKey(bookingShape([setPhotographySelected(day({ startTime: "18:00", endTime: "23:00" }), true)])),
    ).not.toBe(base);
    const twoDays = [
      setPhotographySelected(day({}, 1), true),
      setPhotographySelected(day({ eventDate: "2026-10-13" }, 2), true),
    ];
    expect(bookingPricingInputKey(bookingShape(twoDays))).not.toBe(base);
  });

  test("changing requirements produces new overall totals rather than keeping the previous photography-only range", () => {
    const photo = totals([setPhotographySelected(day(), true)]);
    const after = totals([withPhotoVideoAddOns(day())]);
    expect(after.essential.minPrice).toBeGreaterThan(photo.essential.minPrice);
    expect(after.signature.minPrice).toBeGreaterThan(photo.signature.minPrice);
    expect(after.elite.minPrice).toBeGreaterThan(photo.elite.minPrice);
    expect(after.essential.minPrice).not.toBe(3000);
  });

  test("customer budget stays separate from the calculated package totals", () => {
    const draft = bookingShape([setPhotographySelected(day(), true)], { budget: 80000 });
    const options = resolvePackageOptions(draft);
    expect(draft.budget).toBe(80000);
    expect(options[0].minPrice).toBe(3000);
    expect(options[1].minPrice).toBe(4000);
    expect(options[2].minPrice).toBe(6000);
    expect(options.find((o) => o.recommended)?.id).toBe("elite");
  });
});

describe("package selection persistence and Review use the same quote", () => {
  test("Review quote matches the Packages overall price for the selected Signature package", () => {
    const draft = bookingShape([setPhotographySelected(day(), true)], { budget: 80000, selectedPackage: "signature" });
    const packages = resolvePackageOptions(draft);
    const review = selectedPackageQuote(draft);
    expect(review?.label).toBe("Signature");
    expect(review?.minPrice).toBe(packages.find((p) => p.id === "signature")?.minPrice);
    expect(review?.maxPrice).toBe(packages.find((p) => p.id === "signature")?.maxPrice);
    expect(review?.minPrice).toBe(4000);
    expect(review?.maxPrice).toBe(5000);
  });

  test("selectPackage stores the live overall options and keeps them after a time-only edit", async () => {
    const created = await bookingApi.createBooking("cust-overall-price");
    const withPhoto = setPhotographySelected(
      {
        ...created.days[0],
        eventDate: "2026-10-12",
        eventTypeIds: ["ganesh_pooja"],
        startTime: "20:00",
        endTime: "02:00",
      },
      true,
    );
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, withPhoto);
    await bookingApi.updateExpectedDelivery(created.bookingId, "2026-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    const withPackage = await bookingApi.selectPackage(created.bookingId, "signature");
    expect(withPackage.selectedPackage).toBe("signature");
    expect(withPackage.packageOptions?.find((p) => p.id === "signature")).toMatchObject({ minPrice: 4000, maxPrice: 5000 });
    const afterEdit = await bookingApi.updateDay(created.bookingId, created.days[0].dayId, {
      startTime: "20:00",
      endTime: "02:00",
      eventDate: "2026-10-12",
    });
    expect(afterEdit.selectedPackage).toBe("signature");
    const quote = selectedPackageQuote(afterEdit);
    expect(quote?.minPrice).toBe(4000);
    expect(quote?.maxPrice).toBe(5000);
    expect(afterEdit.budget).toBe(80000);
  });

  test("changing services clears the stored package so stale totals cannot be shown", async () => {
    const created = await bookingApi.createBooking("cust-overall-stale");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, setPhotographySelected(created.days[0], true));
    await bookingApi.updateExpectedDelivery(created.bookingId, "2026-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const after = await bookingApi.updateDay(created.bookingId, created.days[0].dayId, {
      videography: { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 },
    });
    expect(after.selectedPackage).toBeNull();
    expect(after.packageOptions).toBeNull();
    const live = resolvePackageOptions({ ...after, budget: 80000 });
    expect(live.find((p) => p.id === "signature")?.minPrice).toBeGreaterThan(4000);
  });
});

describe("booking payload keeps the estimate on-device", () => {
  test("POST body still has no dedicated pricing field and keeps the customer budget", () => {
    const photo = setPhotographySelected(day(), true);
    const body = toCamartesBookingRequest(
      {
        bookingId: "draft-1",
        customerId: "cust-1",
        status: "VENDOR_SELECTED",
        createdAt: "",
        updatedAt: "",
        days: [photo],
        deliverables: emptyDeliverables(),
        expectedDeliveryDate: "2026-11-01",
        budget: 80000,
        selectedPackage: "signature",
        packageOptions: null,
        matches: null,
        selectedVendorId: "user_16eeb421bc07",
        estimatedAmount: null,
        counterOffer: null,
        draftCompletionPct: 50,
      },
      { customerId: "cust-1", name: "Asha", mobile: "9876543210", email: "asha@example.com", avatarInitials: "A", savedAddresses: [] },
    );
    expect(body.budget).toBe("80000");
    expect(body.message).toContain("Package: signature");
    expect(body.message).toContain(`Package estimate: ${formatInrRange(4000, 5000)}`);
    expect(Object.keys(body)).not.toContain("package_price");
    expect(Object.keys(body)).not.toContain("estimated_amount");
  });
});
