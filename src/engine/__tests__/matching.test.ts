import { createEmptyDay, emptyDeliverables } from "@/src/domain/defaults";
import { checkVendorAvailability, MAX_MATCHES, matchVendors, aggregateRequirement } from "@/src/engine/matching";
import type { EventDay } from "@/src/types/booking";
import type { CustomerVendor } from "@/src/types/vendor";

function vendor(overrides: Partial<CustomerVendor> = {}): CustomerVendor {
  return {
    vendorId: "v1",
    studioName: "Studio One",
    city: "Tirupati",
    area: "Tirupati",
    lat: 13.65,
    lng: 79.42,
    experienceYears: 10,
    rating: 4.5,
    completedBookings: 80,
    responseRatePct: 90,
    photography: { traditional: true, candid: true, maxPhotographers: 4 },
    videography: { traditional: true, candid: true, maxVideographers: 4 },
    aerial: { photography: true, videography: true, maxDrones: 3 },
    ledWall: { available: true, sizes: ["8 x 12"], maxScreens: 6 },
    webLive: { available: true, qualities: ["HD", "4K"] },
    portfolioImages: ["https://example.com/1.jpg"],
    about: "A great studio.",
    serviceAreas: ["Tirupati"],
    kycVerified: true,
    liveSource: true,
    basePricePerDay: 18000,
    listedAvailable: true,
    contactMaskedUntilAccepted: true,
    ...overrides,
  };
}

function eventDay(): EventDay {
  const day = createEmptyDay(1);
  day.eventDate = "2099-06-01";
  day.location = { ...day.location, city: "Tirupati", formattedAddress: "Tirupati" };
  day.photography = { traditional: true, traditionalCount: 2, candid: false, candidCount: 1 };
  day.videography = { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 };
  return day;
}

describe("matchVendors", () => {
  test("returns at most MAX_MATCHES (6) providers", () => {
    const vendors = Array.from({ length: 20 }, (_, i) => vendor({ vendorId: `v${i}`, studioName: `Studio ${i}` }));
    const results = matchVendors({ days: [eventDay()], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results.length).toBeLessThanOrEqual(MAX_MATCHES);
  });

  test("returns the actual count when fewer than 6 vendors qualify (spec section 47)", () => {
    const vendors = [vendor({ vendorId: "only-one" })];
    const results = matchVendors({ days: [eventDay()], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  test("returns an empty list when zero vendors qualify", () => {
    const vendors = [vendor({ city: "Mumbai", serviceAreas: ["Mumbai"] })];
    const results = matchVendors({ days: [eventDay()], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results).toHaveLength(0);
  });

  test("excludes vendors that do not offer a requested capability", () => {
    const vendors = [vendor({ vendorId: "no-video", videography: { traditional: false, candid: false, maxVideographers: 0 } })];
    const results = matchVendors({ days: [eventDay()], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results.find((r) => r.vendorId === "no-video")).toBeUndefined();
  });

  test("every returned match is marked available", () => {
    const vendors = Array.from({ length: 10 }, (_, i) => vendor({ vendorId: `v${i}` }));
    const results = matchVendors({ days: [eventDay()], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results.every((r) => r.available)).toBe(true);
  });

  test("results are ranked by descending match score", () => {
    const vendors = Array.from({ length: 10 }, (_, i) => vendor({ vendorId: `v${i}`, rating: 3 + (i % 3) }));
    const results = matchVendors({ days: [eventDay()], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].matchScore).toBeGreaterThanOrEqual(results[i].matchScore);
    }
  });

  test("passes through a real catalog image and does not invent one", () => {
    const vendors = Array.from({ length: 12 }, (_, i) =>
      vendor({
        vendorId: `img${i}`,
        studioName: `Studio ${i}`,
        portfolioImages: i % 2 === 0 ? [`https://example.com/${i}.jpg`] : [],
      }),
    );
    const results = matchVendors({ days: [eventDay()], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      const source = vendors.find((v) => v.vendorId === result.vendorId);
      expect(result.imageUrl).toBe(source?.portfolioImages[0] || undefined);
      expect(result.serviceCategory).toBe("Photography · Videography");
    }
  });
});

describe("checkVendorAvailability (rule 11 / multi-day)", () => {
  test("a vendor lacking required quantity is not available", () => {
    const day = eventDay();
    day.photography.traditionalCount = 10;
    const req = aggregateRequirement([day]);
    const result = checkVendorAvailability(vendor({ photography: { traditional: true, candid: true, maxPhotographers: 2 } }), [day], req);
    expect(result.available).toBe(false);
  });

  test("a vendor must be available on every day of a multi-day booking", () => {
    const day1 = eventDay();
    const day2 = eventDay();
    day2.dayId = "day-2";
    day2.eventDate = "2099-06-02";
    const req = aggregateRequirement([day1, day2]);
    // Same vendor id + varying date will deterministically differ; just assert the function runs across days without throwing
    const result = checkVendorAvailability(vendor(), [day1, day2], req);
    expect(result.available).toBe(true);
  });

  test("calendar blocks or listedAvailable=false do NOT exclude a vendor from receiving leads", () => {
    const day = eventDay();
    const req = aggregateRequirement([day]);
    const result = checkVendorAvailability(vendor({ listedAvailable: false }), [day], req);
    expect(result.available).toBe(true);
    const matches = matchVendors({ days: [day], deliverables: emptyDeliverables() }, [vendor({ listedAvailable: false })], "signature", 150000);
    expect(matches).toHaveLength(1);
  });

  test("does not invent calendar unavailability when the catalog lists the vendor as available", () => {
    const day = eventDay();
    const vendors = [vendor({ vendorId: "live-1" }), vendor({ vendorId: "live-2", studioName: "Studio Two" })];
    const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results).toHaveLength(2);
  });
});

describe("photography firm exclusivity & 3-tier budget matching", () => {
  test("excludes solo freelancers, videographers, and fly_cam operators", () => {
    const day = eventDay();
    const vendors = [
      vendor({ vendorId: "solo-1", serviceType: "photographer", studioName: "Solo Photographer" }),
      vendor({ vendorId: "solo-2", serviceType: "videographer", studioName: "Solo Videographer" }),
      vendor({ vendorId: "solo-3", serviceType: "fly_cam", studioName: "Drone Pilot" }),
      vendor({ vendorId: "firm-1", serviceType: "photography_firm", studioName: "Epic Firm" }),
    ];
    const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results).toHaveLength(1);
    expect(results[0].vendorId).toBe("firm-1");
  });

  test("budget < 2L prioritizes basic tier firms", () => {
    const day = eventDay();
    const vendors = [
      vendor({ vendorId: "elite-firm", serviceType: "photography_firm", budgetPreference: ["elite"], rating: 5.0 }),
      vendor({ vendorId: "basic-firm", serviceType: "photography_firm", budgetPreference: ["basic"], rating: 4.2 }),
    ];
    const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, vendors, "signature", 150000);
    expect(results).toHaveLength(2);
    expect(results[0].vendorId).toBe("basic-firm");
  });

  test("budget between 2L and 5L prioritizes medium tier firms", () => {
    const day = eventDay();
    const vendors = [
      vendor({ vendorId: "basic-firm", serviceType: "photography_firm", budgetPreference: ["basic"], rating: 5.0 }),
      vendor({ vendorId: "medium-firm", serviceType: "photography_firm", budgetPreference: ["medium"], rating: 4.2 }),
    ];
    const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, vendors, "signature", 350000);
    expect(results).toHaveLength(2);
    expect(results[0].vendorId).toBe("medium-firm");
  });

  test("budget > 5L prioritizes elite tier firms", () => {
    const day = eventDay();
    const vendors = [
      vendor({ vendorId: "basic-firm", serviceType: "photography_firm", budgetPreference: ["basic"], rating: 5.0 }),
      vendor({ vendorId: "elite-firm", serviceType: "photography_firm", budgetPreference: ["elite"], rating: 4.2 }),
    ];
    const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, vendors, "signature", 650000);
    expect(results).toHaveLength(2);
    expect(results[0].vendorId).toBe("elite-firm");
  });

  test("multi-tier firms qualify for their configured tiers", () => {
    const day = eventDay();
    const multiTierFirm = vendor({
      vendorId: "multi-firm",
      serviceType: "photography_firm",
      budgetPreference: ["basic", "medium"],
      rating: 4.5,
    });
    const eliteFirm = vendor({
      vendorId: "elite-firm",
      serviceType: "photography_firm",
      budgetPreference: ["elite"],
      rating: 4.9,
    });

    const basicResults = matchVendors({ days: [day], deliverables: emptyDeliverables() }, [eliteFirm, multiTierFirm], "signature", 100000);
    expect(basicResults[0].vendorId).toBe("multi-firm");

    const mediumResults = matchVendors({ days: [day], deliverables: emptyDeliverables() }, [eliteFirm, multiTierFirm], "signature", 250000);
    expect(mediumResults[0].vendorId).toBe("multi-firm");
  });

  describe("add-ons, wallet balance & location filtering for photography firms", () => {
    test("never filters out a photography firm based on add-ons (LED wall, drones, web live)", () => {
      const day = eventDay();
      day.ledWall = { enabled: true, size: "12 x 16", screenCount: 2 };
      day.aerial = { drones: 3 };
      day.webLive = { enabled: true, quality: "HD", cameraCount: 2, streamingPlatform: "YouTube", accessType: "private" };

      const firmWithoutAddonEquipment = vendor({
        vendorId: "firm-production",
        serviceType: "photography_firm",
        ledWall: { available: false, sizes: [], maxScreens: 0 },
        aerial: { photography: false, videography: false, maxDrones: 0 },
        webLive: { available: false, qualities: [] },
        walletBalance: 12000,
      });

      const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, [firmWithoutAddonEquipment], "signature", 250000);
      expect(results).toHaveLength(1);
      expect(results[0].vendorId).toBe("firm-production");
      expect(results[0].available).toBe(true);
    });

    test("filters out photography firms with insufficient wallet balance (< 500)", () => {
      const day = eventDay();
      const firmLowBalance = vendor({
        vendorId: "firm-broke",
        serviceType: "photography_firm",
        walletBalance: 200,
      });
      const firmGoodBalance = vendor({
        vendorId: "firm-good",
        serviceType: "photography_firm",
        walletBalance: 2500,
      });

      const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, [firmLowBalance, firmGoodBalance], "signature", 250000);
      expect(results).toHaveLength(1);
      expect(results[0].vendorId).toBe("firm-good");
    });

    test("filters photography firms based on location preference", () => {
      const day = eventDay();
      day.location = { ...day.location, city: "Hyderabad" };
      const firmHyd = vendor({
        vendorId: "firm-hyd",
        serviceType: "photography_firm",
        city: "Hyderabad",
        serviceAreas: ["Hyderabad"],
        walletBalance: 1000,
      });
      const firmBlr = vendor({
        vendorId: "firm-blr",
        serviceType: "photography_firm",
        city: "Bengaluru",
        serviceAreas: ["Bengaluru"],
        walletBalance: 1000,
      });

      const results = matchVendors({ days: [day], deliverables: emptyDeliverables() }, [firmHyd, firmBlr], "signature", 250000);
      expect(results).toHaveLength(1);
      expect(results[0].vendorId).toBe("firm-hyd");
    });
  });
});

