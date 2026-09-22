import { matchVendors } from "@/src/engine/matching";
import { maskEmail, maskPhoneNumber, toCamartesBookingRequest, applyRemoteSnapshot } from "@/src/domain/bookingRequest";
import type { Booking, EventDay, PackageTierId, ProviderLocationPreference } from "@/src/types/booking";
import type { CustomerVendor } from "@/src/types/vendor";

function makeVendor(id: string, name: string, city: string, area?: string): CustomerVendor {
  return {
    vendorId: id,
    studioName: name,
    city,
    area: area || "",
    lat: 17.41,
    lng: 78.47,
    experienceYears: 5,
    rating: 4.8,
    completedBookings: 20,
    responseRatePct: 98,
    photography: {
      traditional: true,
      candid: true,
      maxPhotographers: 3,
    },
    videography: {
      traditional: false,
      candid: false,
      maxVideographers: 0,
    },
    aerial: {
      photography: false,
      videography: false,
      maxDrones: 0,
    },
    ledWall: {
      available: false,
      sizes: [],
      maxScreens: 0,
    },
    webLive: {
      available: false,
      qualities: [],
    },
    portfolioImages: ["https://example.com/photo.jpg"],
    about: "Professional photographer",
    serviceAreas: [city, area || ""].filter(Boolean),
    kycVerified: true,
    liveSource: true,
    basePricePerDay: 15000,
    listedAvailable: true,
    contactMaskedUntilAccepted: true,
  };
}

function makeBooking(locationPref?: ProviderLocationPreference): Booking {
  const day: EventDay = {
    dayId: "day_1",
    order: 1,
    eventDate: "2026-10-15",
    eventTypeIds: ["wedding_reception"],
    location: {
      placeId: null,
      formattedAddress: "Banjara Hills, Hyderabad, Telangana",
      latitude: 17.4156,
      longitude: 78.475,
      city: "Hyderabad",
      district: "Hyderabad",
      state: "Telangana",
      pincode: "500034",
      manuallyEdited: false,
    },
    startTime: "10:00",
    endTime: "18:00",
    overnight: false,
    photography: {
      traditional: true,
      traditionalCount: 1,
      candid: true,
      candidCount: 1,
    },
    videography: {
      traditional: false,
      traditionalCount: 0,
      candid: false,
      candidCount: 0,
    },
    aerial: {
      drones: 0,
    },
    ledWall: {
      enabled: false,
      size: "8x12",
      screenCount: 0,
    },
    webLive: {
      enabled: false,
      quality: "HD",
      cameraCount: 0,
      streamingPlatform: "YouTube",
      accessType: "private",
    },
  };

  return {
    bookingId: "bk_test_123",
    customerId: "cust_1",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [day],
    deliverables: {
      photo: {
        rawPhotos: true,
        editedPhotosOption: "50",
        editedPhotosCustomCount: null,
        album: false,
        albumPagesOption: null,
        albumPagesCustomCount: null,
      },
      video: {
        rawVideo: false,
        editedTraditionalVideoCount: 0,
        editedCinematicVideoCount: 0,
      },
    },
    expectedDeliveryDate: "2026-10-25",
    budget: 30000,
    selectedPackage: "signature" as PackageTierId,
    packageOptions: null,
    providerLocationPreference: locationPref,
    matches: null,
    selectedVendorId: null,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 80,
  };
}

describe("6-Photographer Lead Distribution & Privacy Engine", () => {
  describe("Contact Masking Utilities", () => {
    it("masks phone numbers correctly protecting customer and vendor privacy", () => {
      expect(maskPhoneNumber("+919876543210")).toBe("+91 ••••• ••210");
      expect(maskPhoneNumber("9876543210")).toBe("98••••••10");
      expect(maskPhoneNumber("123")).toBe("••••••••••");
      expect(maskPhoneNumber(null)).toBe("");
    });

    it("masks email addresses correctly", () => {
      expect(maskEmail("keerthan@gmail.com")).toBe("ke•••••@gmail.com");
      expect(maskEmail("photographer@camartes.com")).toBe("ph•••••@camartes.com");
      expect(maskEmail("invalid-email")).toBe("");
      expect(maskEmail(null)).toBe("");
    });
  });

  describe("Matching up to 6 Photographers by Location Preference", () => {
    const vendors = [
      makeVendor("v1", "Studio 1", "Hyderabad", "Banjara Hills"),
      makeVendor("v2", "Studio 2", "Hyderabad", "Jubilee Hills"),
      makeVendor("v3", "Studio 3", "Hyderabad", "Gachibowli"),
      makeVendor("v4", "Studio 4", "Hyderabad", "Madhapur"),
      makeVendor("v5", "Studio 5", "Hyderabad", "Hitec City"),
      makeVendor("v6", "Studio 6", "Hyderabad", "Secunderabad"),
      makeVendor("v7", "Studio 7", "Hyderabad", "Kondapur"),
      makeVendor("v8", "Studio 8", "Bengaluru", "Koramangala"),
    ];

    it("caps matches at exactly 6 providers and applies contactMasked", () => {
      const booking = makeBooking({ mode: "event_location", city: "Hyderabad" });
      const matches = matchVendors(booking, vendors, "signature", 30000);

      expect(matches.length).toBe(6);
      expect(matches.every((m) => m.contactMasked === true)).toBe(true);
    });

    it("matches vendors in a specific preferred neighborhood", () => {
      const booking = makeBooking({
        mode: "preferred_area",
        city: "Banjara Hills",
        formattedAddress: "Banjara Hills",
      });
      const matches = matchVendors(booking, vendors, "signature", 30000);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.some((m) => m.vendorId === "v1")).toBe(true);
    });

    it("matches vendors when another city is selected", () => {
      const booking = makeBooking({
        mode: "another_area",
        city: "Bengaluru",
      });
      const matches = matchVendors(booking, vendors, "signature", 30000);

      expect(matches.length).toBe(1);
      expect(matches[0].vendorId).toBe("v8");
      expect(matches[0].city).toBe("Bengaluru");
    });

    it("matches across both freelance photographers and photo studios, keeping calendar-blocked providers in the lead pool", () => {
      const mixedVendors: CustomerVendor[] = [
        { ...makeVendor("user_photog_1", "Freelance Pro", "Bengaluru"), isStudio: false, listedAvailable: true },
        { ...makeVendor("user_studio_2", "Grand Photo Studio", "Bengaluru"), isStudio: true, listedAvailable: false }, // Calendar blocked
        { ...makeVendor("user_photog_3", "Candid Lens", "Bengaluru"), isStudio: false, listedAvailable: false }, // Calendar blocked
        { ...makeVendor("user_studio_4", "Elite Photography Firm", "Bengaluru"), isStudio: true, listedAvailable: true },
      ];

      const booking = makeBooking({ mode: "event_location", city: "Bengaluru" });
      booking.days[0].location.city = "Bengaluru";
      const matches = matchVendors(booking, mixedVendors, "signature", 30000);

      expect(matches.length).toBe(4);
      // Verify both photographers and studios are included
      expect(matches.map((m) => m.vendorId)).toEqual(
        expect.arrayContaining(["user_photog_1", "user_studio_2", "user_photog_3", "user_studio_4"]),
      );
      // Calendar blocked providers remain available to receive leads
      const blockedMatch = matches.find((m) => m.vendorId === "user_studio_2");
      expect(blockedMatch?.available).toBe(true);
      expect(blockedMatch?.isStudio).toBe(true);
    });
  });

  describe("Booking Request Payload Generation", () => {
    it("creates multi-photographer lead broadcast payload with contactMasked flag", () => {
      const booking = makeBooking();
      booking.assignedProviderIds = ["v1", "v2", "v3", "v4", "v5", "v6"];
      booking.selectedVendorId = "v1";

      const payload = toCamartesBookingRequest(booking, {
        customerId: "cust_1",
        name: "Test Customer",
        email: "customer@test.com",
        mobile: "+919876543210",
        avatarInitials: "TC",
        savedAddresses: [],
      });

      expect(payload.assigned_provider_ids).toEqual(["v1", "v2", "v3", "v4", "v5", "v6"]);
      expect(payload.lead_broadcast).toBe(true);
      expect(payload.event_time).toBe("10:00 AM");
      expect(payload.lead_details?.clientContactMasked).toBe(true);
      expect(payload.lead_details?.budget).toBe(30000);
      expect(payload.lead_details?.packageTier).toBe("Signature");
      expect(payload.lead_details?.clientName).toBe("Test Customer");
    });

    it("generates exact payload structure required by POST /api/bookings for studios + photographers", () => {
      const booking = makeBooking({ mode: "event_location", city: "Bangalore", formattedAddress: "Palace Grounds, Bangalore" });
      booking.assignedProviderIds = ["user_photog_1", "user_studio_2", "user_photog_3", "user_studio_4"];
      booking.selectedVendorId = "user_photog_1";
      booking.budget = 45000;
      booking.days[0].eventDate = "2026-11-20";
      booking.days[0].startTime = "10:00";
      booking.days[0].endTime = "18:00";
      booking.days[0].location.formattedAddress = "Palace Grounds, Bangalore";
      booking.days[0].location.city = "Bangalore";
      booking.days[0].photography.candid = true;
      booking.days[0].videography.traditional = true;

      const payload = toCamartesBookingRequest(booking, {
        customerId: "cust_1",
        name: "Customer Name",
        email: "customer@gmail.com",
        mobile: "+919876543210",
        avatarInitials: "CN",
        savedAddresses: [],
      });

      expect(payload.assigned_provider_ids).toEqual(["user_photog_1", "user_studio_2", "user_photog_3", "user_studio_4"]);
      expect(payload.provider_id).toBe("user_photog_1");
      expect(payload.lead_broadcast).toBe(true);
      expect(payload.service_type).toBe("photography_firm");
      expect(payload.event_date).toBe("2026-11-20");
      expect(payload.event_time).toBe("10:00 AM");
      expect(payload.end_date).toBe("2026-11-20");
      expect(payload.duration_hours).toBe(8);
      expect(payload.venue_address).toBe("Palace Grounds, Bangalore");
      expect(payload.budget).toBe("45000");
      expect(payload.client_name).toBe("Customer Name");
      expect(payload.client_phone).toBe("+919876543210");
      expect(payload.client_email).toBe("customer@gmail.com");
      expect(payload.location_preference?.type).toBe("near_event");
      expect(payload.location_preference?.city).toBe("Bangalore");
      expect(payload.location_preference?.formattedAddress).toBe("Palace Grounds, Bangalore");
      expect(payload.lead_details?.city).toBe("Bangalore");
      expect(payload.lead_details?.venueAddress).toBe("Palace Grounds, Bangalore");
      expect(payload.lead_details?.services).toEqual(
        expect.arrayContaining(["Candid Photography", "Traditional Videography"]),
      );
    });

    it("unmasks contact when booking status transitions to accepted", () => {
      const booking = makeBooking();
      booking.contactMasked = true;
      booking.assignedProviderIds = ["v1", "v2", "v3"];

      const accepted = applyRemoteSnapshot(booking, {
        id: "remote_123",
        status: "accepted",
        providerId: "v2",
        eventDate: "2026-10-15",
        eventTime: "10:00 AM",
        serviceType: "photographer",
        budget: "30000",
      });

      expect(accepted.status).toBe("VENDOR_ACCEPTED");
      expect(accepted.contactMasked).toBe(false);
      expect(accepted.selectedVendorId).toBe("v2");
    });

    it("parses and applies assigned_photographers and firms_status_message from Camartes snapshot", () => {
      const booking = makeBooking();
      const snapshot = applyRemoteSnapshot(booking, {
        id: "bk_cand_123",
        status: "request_sent",
        providerId: "user_firm_1",
        eventDate: "2026-10-15",
        eventTime: "10:00 AM",
        serviceType: "photography_firm",
        budget: "50000",
        firmsStatusMessage: "Dispatched to 6 suitable photography firms.",
        assignedCount: 6,
        assignedPhotographers: [
          {
            id: "user_firm_1",
            provider_id: "user_firm_1",
            name: "Lens & Light Studios",
            rating: 4.9,
            city: "Bangalore",
            profile_image: "https://example.com/img1.jpg",
            has_accepted: true,
            is_confirmed: false,
            can_confirm: true,
            contact_unlocked: true,
            contact_phone: "+919876543210",
            contact_email: "firm@example.com",
            contact_whatsapp: "9876543210",
          },
          {
            id: "user_firm_2",
            provider_id: "user_firm_2",
            name: "Focus Motion Films",
            rating: 4.8,
            city: "Bangalore",
            has_accepted: false,
            is_confirmed: false,
            can_confirm: false,
            contact_unlocked: false,
          },
        ],
      });

      expect(snapshot.firms_status_message).toBe("Dispatched to 6 suitable photography firms.");
      expect(snapshot.assigned_count).toBe(6);
      expect(snapshot.assigned_photographers).toHaveLength(2);

      const firm1 = snapshot.assigned_photographers?.[0];
      expect(firm1?.has_accepted).toBe(true);
      expect(firm1?.can_confirm).toBe(true);
      expect(firm1?.contact_unlocked).toBe(true);
      expect(firm1?.contact_phone).toBe("+919876543210");

      const firm2 = snapshot.assigned_photographers?.[1];
      expect(firm2?.has_accepted).toBe(false);
      expect(firm2?.can_confirm).toBe(false);
      expect(firm2?.contact_unlocked).toBe(false);
    });
  });
});
