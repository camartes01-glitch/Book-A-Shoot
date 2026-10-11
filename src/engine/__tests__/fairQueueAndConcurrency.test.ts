import { matchVendors, MAX_CONCURRENT_LEADS, calculateFairQueueBoost } from "@/src/engine/matching";
import type { Booking, EventDay } from "@/src/types/booking";
import type { CustomerVendor } from "@/src/types/vendor";

function makeVendor(
  id: string,
  name: string,
  rating: number,
  leadsToday = 0,
  activePending = 0,
  lastDispatched?: string
): CustomerVendor {
  return {
    vendorId: id,
    studioName: name,
    city: "Hyderabad",
    area: "Banjara Hills",
    lat: 17.41,
    lng: 78.47,
    experienceYears: 6,
    rating,
    completedBookings: 25,
    responseRatePct: 95,
    photography: { traditional: true, candid: true, maxPhotographers: 5 },
    videography: { traditional: false, candid: false, maxVideographers: 0 },
    aerial: { photography: false, videography: false, maxDrones: 0 },
    ledWall: { available: false, sizes: [], maxScreens: 0 },
    webLive: { available: false, qualities: [] },
    portfolioImages: ["https://example.com/p.jpg"],
    about: "Studio in Hyderabad",
    serviceAreas: ["Hyderabad", "Banjara Hills"],
    kycVerified: true,
    liveSource: true,
    basePricePerDay: 20000,
    listedAvailable: true,
    contactMaskedUntilAccepted: true,
    leadsToday,
    activePendingLeads: activePending,
    lastLeadDispatchedAt: lastDispatched,
  };
}

function makeBooking(): Booking {
  const day: EventDay = {
    dayId: "day_1",
    order: 1,
    eventDate: "2026-11-20",
    eventTypeIds: ["wedding"],
    location: {
      placeId: null,
      formattedAddress: "Banjara Hills, Hyderabad",
      latitude: 17.41,
      longitude: 78.47,
      city: "Hyderabad",
      district: "Hyderabad",
      state: "Telangana",
      pincode: "500034",
      manuallyEdited: false,
    },
    startTime: "10:00",
    endTime: "18:00",
    overnight: false,
    photography: { traditional: true, traditionalCount: 1, candid: true, candidCount: 1 },
    videography: { traditional: false, traditionalCount: 0, candid: false, candidCount: 0 },
    aerial: { drones: 0 },
    ledWall: { enabled: false, size: "8x12", screenCount: 0 },
    webLive: { enabled: false, quality: "HD", cameraCount: 0, streamingPlatform: "YouTube", accessType: "private" },
  };

  return {
    bookingId: "bk_test_fair_queue",
    customerId: "cust_123",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [day],
    deliverables: { photo: { rawPhotos: true, editedPhotosOption: "50", editedPhotosCustomCount: null, album: false, albumPagesOption: null, albumPagesCustomCount: null }, video: { rawVideo: false, editedTraditionalVideoCount: 0, editedCinematicVideoCount: 0 } },
    expectedDeliveryDate: "2026-12-01",
    budget: 40000,
    selectedPackage: "signature",
    packageOptions: null,
    providerLocationPreference: { mode: "event_location", city: "Hyderabad" },
    matches: null,
    selectedVendorId: null,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 80,
  };
}

describe("The Fair-Queue Gauge & Active Concurrency Cap", () => {
  describe("calculateFairQueueBoost (Hunger Score)", () => {
    it("gives 0-lead studios the highest priority boost (1.50x)", () => {
      const v0 = makeVendor("v0", "Hungry Studio", 4.8, 0);
      expect(calculateFairQueueBoost(v0)).toBe(1.5);
    });

    it("scales down boost smoothly as leads increase today", () => {
      const v1 = makeVendor("v1", "Studio 1", 4.8, 1);
      const v2 = makeVendor("v2", "Studio 2", 4.8, 2);
      const v3 = makeVendor("v3", "Studio 3", 4.8, 3);

      expect(calculateFairQueueBoost(v1)).toBe(1.0);
      expect(calculateFairQueueBoost(v2)).toBe(0.75);
      expect(calculateFairQueueBoost(v3)).toBe(0.6);
    });

    it("gives an idle wait bonus when last lead was dispatched > 6 hours ago", () => {
      const sevenHoursAgo = new Date(Date.now() - 7 * 3600 * 1000).toISOString();
      const vOld = makeVendor("vOld", "Old Lead Studio", 4.8, 1, 0, sevenHoursAgo);
      const boost = calculateFairQueueBoost(vOld);
      expect(boost).toBeCloseTo(1.1); // 1.0 + 0.1 bonus
    });
  });

  describe("Fair-Queue Lead Cycling Across Multiple Customers", () => {
    it("rotates leads to the next batch of studios when first batch received leads", () => {
      const booking = makeBooking();

      // Create 12 identical studios in Hyderabad
      const pool: CustomerVendor[] = Array.from({ length: 12 }, (_, i) =>
        makeVendor(`studio_${i + 1}`, `Studio ${i + 1}`, 4.8, 0, 0)
      );

      // Customer 1 searches
      const customer1Matches = matchVendors(booking, pool, "signature", 40000);
      expect(customer1Matches.length).toBe(6);
      const matchedIdsCust1 = customer1Matches.map((m) => m.vendorId);
      expect(matchedIdsCust1).toEqual(["studio_1", "studio_2", "studio_3", "studio_4", "studio_5", "studio_6"]);

      // Now Studios 1-6 received 1 lead each today
      pool.forEach((v) => {
        if (matchedIdsCust1.includes(v.vendorId)) {
          v.leadsToday = 1;
        }
      });

      // Customer 2 searches with the exact same budget and location!
      const customer2Matches = matchVendors(booking, pool, "signature", 40000);
      expect(customer2Matches.length).toBe(6);
      const matchedIdsCust2 = customer2Matches.map((m) => m.vendorId);

      // Customer 2 receives Studios 7 to 12 because they have 0 leads today!
      expect(matchedIdsCust2).toEqual(["studio_7", "studio_8", "studio_9", "studio_10", "studio_11", "studio_12"]);
      expect(matchedIdsCust2.some((id) => matchedIdsCust1.includes(id))).toBe(false);
    });
  });

  describe("Active Concurrency Cap (No Overloading)", () => {
    it("skips studios with 3 or more active pending leads", () => {
      const booking = makeBooking();

      const studioA = makeVendor("studio_a", "Busy Studio A", 5.0, 0, 3); // 3 active leads!
      const studioB = makeVendor("studio_b", "Busy Studio B", 5.0, 0, 4); // 4 active leads!
      const studioC = makeVendor("studio_c", "Available Studio C", 4.7, 0, 1);
      const studioD = makeVendor("studio_d", "Available Studio D", 4.6, 0, 0);

      const matches = matchVendors(booking, [studioA, studioB, studioC, studioD], "signature", 40000);

      // Busy studios are excluded by concurrency cap (MAX_CONCURRENT_LEADS = 3)
      expect(matches.some((m) => m.vendorId === "studio_a")).toBe(false);
      expect(matches.some((m) => m.vendorId === "studio_b")).toBe(false);
      // Available studios receive the leads
      expect(matches.some((m) => m.vendorId === "studio_c")).toBe(true);
      expect(matches.some((m) => m.vendorId === "studio_d")).toBe(true);
    });

    it("re-admits a studio once an active pending lead is resolved", () => {
      const booking = makeBooking();
      const studio = makeVendor("studio_capped", "Capped Studio", 4.9, 0, 3);

      expect(matchVendors(booking, [studio], "signature", 40000).length).toBe(0);

      // Studio resolves one request (accepts/rejects) -> active count drops to 2
      studio.activePendingLeads = 2;
      expect(matchVendors(booking, [studio], "signature", 40000).length).toBe(1);
    });
  });
});
