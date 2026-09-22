import { createEmptyBooking, createEmptyDay, duplicateDay, sanitizeEventDay } from "@/src/domain/defaults";
import {
  applyRemoteSnapshot,
  catalogServiceTypes,
  mapCamartesBookingStatus,
  parseRemoteBookingList,
  parseRemoteBookingRow,
  primaryServiceType,
  remoteBookingIdOf,
  selectActiveWizardDraft,
  toCamartesBookingRequest,
} from "@/src/domain/bookingRequest";
import { setAerialEnabled, setPhotographySelected, setVideographySelected } from "@/src/domain/dayServices";
import type { Booking, EventDay } from "@/src/types/booking";

function completeDay(order: number, patch: Partial<EventDay> = {}): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(order),
    eventDate: "2099-10-12",
    eventTypeIds: ["wedding"],
    location: {
      ...createEmptyDay(order).location,
      formattedAddress: "Banjara Hills, Hyderabad",
      city: "Hyderabad",
    },
    startTime: "10:00",
    endTime: "16:00",
    ...patch,
  });
}

function bookingWith(days: EventDay[], extra: Partial<Booking> = {}): Booking {
  const base = createEmptyBooking("cust-1");
  return {
    ...base,
    days,
    expectedDeliveryDate: "2099-11-01",
    budget: 80000,
    selectedPackage: "signature",
    selectedVendorId: "user_16eeb421bc07",
    ...extra,
  };
}

describe("toCamartesBookingRequest", () => {
  test("Photography only posts photographer with the selected provider id and budget", () => {
    const body = toCamartesBookingRequest(
      bookingWith([setPhotographySelected(completeDay(1), true)]),
      { customerId: "cust-1", name: "Asha", mobile: "9876543210", email: "asha@example.com", avatarInitials: "A", savedAddresses: [] },
    );
    expect(body.provider_id).toBe("user_16eeb421bc07");
    expect(body.service_type).toBe("photography_firm");
    expect(body.event_date).toBe("2099-10-12");
    expect(body.event_time).toBe("10:00 AM");
    expect(body.budget).toBe("80000");
    expect(body.client_name).toBe("Asha");
    expect(body.message).toContain("Photography");
    expect(body.message).not.toContain("Aerial: ");
  });

  test("Videography only posts photography_firm for shoot bookings", () => {
    const body = toCamartesBookingRequest(bookingWith([setVideographySelected(completeDay(1), true)]), null);
    expect(body.service_type).toBe("photography_firm");
    expect(body.message).toContain("Videography");
  });

  test("Photography + Videography posts photography_firm", () => {
    const day = setVideographySelected(setPhotographySelected(completeDay(1), true), true);
    const body = toCamartesBookingRequest(bookingWith([day]), null);
    expect(body.service_type).toBe("photography_firm");
  });

  test("Photography + Drone/Aerial serializes the drone count in the request message", () => {
    const day = setAerialEnabled(setPhotographySelected(completeDay(1), true), true);
    const body = toCamartesBookingRequest(bookingWith([day]), null);
    expect(body.message).toContain("Aerial:");
    expect(body.message).toContain("drone");
    expect(catalogServiceTypes([day])).toContain("photography_firm");
  });

  test("Videography + Drone/Aerial serializes the drone count", () => {
    const day = setAerialEnabled(setVideographySelected(completeDay(1), true), true);
    const body = toCamartesBookingRequest(bookingWith([day]), null);
    expect(body.message).toContain("drone");
    expect(catalogServiceTypes([day])).toContain("photography_firm");
  });

  test("Photography + LED Wall serializes the LED add-on", () => {
    const day = {
      ...setPhotographySelected(completeDay(1), true),
      ledWall: { enabled: true, size: "8 x 12", screenCount: 2 },
    };
    const body = toCamartesBookingRequest(bookingWith([day]), null);
    expect(body.message).toContain("LED Wall: 8 x 12 × 2");
    expect(catalogServiceTypes([day])).toContain("photography_firm");
  });

  test("Photography + Web Live serializes the Web Live add-on", () => {
    const day = {
      ...setPhotographySelected(completeDay(1), true),
      webLive: { enabled: true, quality: "HD" as const, cameraCount: 1, streamingPlatform: "youtube", accessType: "private" as const },
    };
    const body = toCamartesBookingRequest(bookingWith([day]), null);
    expect(body.message).toContain("Web Live: HD × 1");
    expect(catalogServiceTypes([day])).toContain("photography_firm");
  });

  test("Photography + Drone/Aerial + LED Wall + Web Live keeps the real provider id", () => {
    let day = setAerialEnabled(setPhotographySelected(completeDay(1), true), true);
    day = {
      ...day,
      ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
      webLive: { enabled: true, quality: "4K" as const, cameraCount: 2, streamingPlatform: "", accessType: "public" as const },
    };
    const body = toCamartesBookingRequest(bookingWith([day], { selectedVendorId: "user_25493cf5103e" }), null);
    expect(body.provider_id).toBe("user_25493cf5103e");
    expect(body.service_type).toBe("photography_firm");
    expect(body.message).toContain("Aerial:");
    expect(body.message).toContain("LED Wall");
    expect(body.message).toContain("Web Live");
    expect(catalogServiceTypes([day])).toContain("photography_firm");
  });

  test("overnight 20:00-02:00 is 6 hours and notes the next day", () => {
    const day = setPhotographySelected(completeDay(1, { startTime: "20:00", endTime: "02:00" }), true);
    const body = toCamartesBookingRequest(bookingWith([day]), null);
    expect(day.overnight).toBe(true);
    expect(body.duration_hours).toBe(6);
    expect(body.message).toContain("ends next day");
  });

  test("multi-day payload keeps independent days and uses the last date as end_date", () => {
    const day1 = setPhotographySelected(completeDay(1, { eventDate: "2099-10-12", startTime: "09:00", endTime: "13:00" }), true);
    const day2 = setVideographySelected(completeDay(2, { eventDate: "2099-10-13", startTime: "18:00", endTime: "22:00" }), true);
    const body = toCamartesBookingRequest(bookingWith([day1, day2]), null);
    expect(body.event_date).toBe("2099-10-12");
    expect(body.end_date).toBe("2099-10-13");
    expect(body.message).toContain("Day 1:");
    expect(body.message).toContain("Day 2:");
    expect(primaryServiceType([day1, day2])).toBe("photography_firm");
  });

  test("throws without a provider id — never invents one", () => {
    expect(() => toCamartesBookingRequest(bookingWith([setPhotographySelected(completeDay(1), true)], { selectedVendorId: null }), null)).toThrow(
      /Select a service provider/,
    );
  });
});

describe("remote booking snapshots", () => {
  test("reads the backend booking identifier from common response shapes", () => {
    expect(remoteBookingIdOf({ booking_id: "bk_123" })).toBe("bk_123");
    expect(remoteBookingIdOf({ booking: { id: "uuid-1" } })).toBe("uuid-1");
    expect(remoteBookingIdOf({})).toBeNull();
  });

  test("does not mark a booking confirmed unless Camartes status maps to confirmed", () => {
    const local = bookingWith([setPhotographySelected(completeDay(1), true)], { status: "REQUEST_SENT", remoteBookingId: "bk_1" });
    const pending = applyRemoteSnapshot(local, {
      id: "bk_1",
      status: "pending",
      providerId: "user_16eeb421bc07",
      eventDate: "2099-10-12",
      eventTime: "10:00",
      serviceType: "photographer",
      budget: "80000",
    });
    expect(pending.status).toBe("REQUEST_SENT");
    const confirmed = applyRemoteSnapshot(local, {
      id: "bk_1",
      status: "confirmed",
      providerId: "user_16eeb421bc07",
      eventDate: "2099-10-12",
      eventTime: "10:00",
      serviceType: "photographer",
      budget: "80000",
    });
    expect(confirmed.status).toBe("CONFIRMED");
  });

  test("parseRemoteBookingList does not invent rows", () => {
    expect(parseRemoteBookingList([])).toEqual([]);
    expect(parseRemoteBookingList({ bookings: [{ booking_id: "a", status: "pending" }] })).toEqual([
      expect.objectContaining({ id: "a", status: "pending" }),
    ]);
  });

  test("maps pending/requested to Request sent, accepted/rejected, and never treats unknown as Confirmed", () => {
    expect(mapCamartesBookingStatus("pending")).toBe("REQUEST_SENT");
    expect(mapCamartesBookingStatus("requested")).toBe("REQUEST_SENT");
    expect(mapCamartesBookingStatus("accepted")).toBe("VENDOR_ACCEPTED");
    expect(mapCamartesBookingStatus("rejected")).toBe("VENDOR_REJECTED");
    expect(mapCamartesBookingStatus("declined")).toBe("VENDOR_REJECTED");
    expect(mapCamartesBookingStatus("confirmed")).toBe("CONFIRMED");
    expect(mapCamartesBookingStatus("mystery-status")).toBeNull();
    const local = bookingWith([setPhotographySelected(completeDay(1), true)], { status: "REQUEST_SENT", remoteBookingId: "bk_1" });
    const unknown = applyRemoteSnapshot(local, {
      id: "bk_1",
      status: "mystery-status",
      providerId: "user_16eeb421bc07",
      eventDate: "2099-10-12",
      eventTime: "10:00",
      serviceType: "photographer",
      budget: "80000",
    });
    expect(unknown.status).toBe("REQUEST_SENT");
    expect(unknown.status).not.toBe("CONFIRMED");
  });

  test("selectActiveWizardDraft restores the newest in-progress draft after login", () => {
    const older = bookingWith([setPhotographySelected(completeDay(1), true)], {
      bookingId: "draft-old",
      status: "DRAFT",
      draftCompletionPct: 40,
      updatedAt: "2099-01-01T00:00:00.000Z",
    });
    const newer = bookingWith([setPhotographySelected(completeDay(1), true)], {
      bookingId: "draft-new",
      status: "MATCHING",
      draftCompletionPct: 70,
      updatedAt: "2099-06-01T00:00:00.000Z",
    });
    const emptyNewest = bookingWith([createEmptyDay(1)], {
      bookingId: "draft-empty",
      status: "DRAFT",
      draftCompletionPct: 0,
      updatedAt: "2099-08-01T00:00:00.000Z",
    });
    const submitted = bookingWith([setPhotographySelected(completeDay(1), true)], {
      bookingId: "bk_remote",
      remoteBookingId: "bk_remote",
      status: "REQUEST_SENT",
      updatedAt: "2099-07-01T00:00:00.000Z",
    });
    expect(selectActiveWizardDraft([submitted, newer, older])?.bookingId).toBe("draft-new");
    expect(selectActiveWizardDraft([emptyNewest, newer, older])?.bookingId).toBe("draft-new");
    expect(selectActiveWizardDraft([submitted])).toBeNull();
  });

  test("parseRemoteBookingRow and applyRemoteSnapshot extract and preserve user chosen package, deliverables, and delivery date", () => {
    const parsed = parseRemoteBookingRow({
      booking_id: "BK-EB42E6CC",
      status: "accepted",
      event_type: "Wedding",
      lead_details: {
        packageTier: "Essential",
        expectedDeliveryDate: "2026-10-15",
        deliverables: ["Printed Photo Album (20 pages)", "Raw Photos", "Edited Photos (50)"],
        addOns: ["Drone", "Printed Photo Album (20 pages)"],
        services: ["Traditional Photography", "Candid Photography"],
        budget: 50000,
      },
      message: "[Book A Shoot] Booking Request\n\nPackage: Essential\n\nDeliverables: Printed Photo Album (20 pages), Raw Photos, Edited Photos (50)\n\nExpected delivery: 2026-10-15",
    });

    expect(parsed?.packageTier).toBe("Essential");
    expect(parsed?.expectedDeliveryDate).toBe("2026-10-15");
    expect(parsed?.deliverables).toContain("Printed Photo Album (20 pages)");
    expect(parsed?.deliverables).toContain("Raw Photos");
    expect(parsed?.addOns).toContain("Drone");

    const local = bookingWith([setPhotographySelected(completeDay(1), true)], {
      bookingId: "BK-EB42E6CC",
      selectedPackage: null,
      expectedDeliveryDate: null,
    });
    const enriched = applyRemoteSnapshot(local, parsed!);
    expect(enriched.selectedPackage).toBe("essential");
    expect(enriched.expectedDeliveryDate).toBe("2026-10-15");
    expect(enriched.status).toBe("VENDOR_ACCEPTED");
  });
});

describe("multi-day isolation", () => {
  test("duplicating day 1 copies that day and mutating the copy does not change day 1", () => {
    const day1 = setPhotographySelected(completeDay(1, { eventTypeIds: ["haldi"] }), true);
    const copy = duplicateDay(day1, 2);
    copy.photography = { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 };
    copy.eventTypeIds = ["reception"];
    expect(day1.eventTypeIds).toEqual(["haldi"]);
    expect(day1.photography.traditional).toBe(true);
    expect(copy.dayId).not.toBe(day1.dayId);
    expect(copy.eventDate).toBeNull();
  });

  test("toCamartesBookingRequest serializes deliverables, album pages, and delivery date clearly", () => {
    const day = setPhotographySelected(completeDay(1), true);
    const booking = bookingWith([day], {
      expectedDeliveryDate: "2099-11-15",
      deliverables: {
        photo: {
          rawPhotos: true,
          editedPhotosOption: "100",
          editedPhotosCustomCount: null,
          album: true,
          albumPagesOption: "custom",
          albumPagesCustomCount: 25,
        },
        video: {
          rawVideo: true,
          editedTraditionalVideoCount: 1,
          editedCinematicVideoCount: 1,
          teaserCinematicEnabled: true,
          teaserDurationMinutes: 2,
        },
      },
    });

    const body = toCamartesBookingRequest(booking, {
      customerId: "cust-1",
      name: "Asha",
      mobile: "9876543210",
      email: "asha@example.com",
      avatarInitials: "A",
      savedAddresses: [],
    });

    expect(body.message).toContain("Deliverables: Printed Photo Album (25 pages), Raw Photos, Edited Photos (100)");
    expect(body.message).toContain("Expected delivery: 2099-11-15");
    expect(body.deliverables).toContain("Printed Photo Album (25 pages)");
    expect(body.deliverables).toContain("Raw Photos");
    expect(body.deliverables).toContain("Edited Photos (100)");
    expect(body.deliverables).toContain("Teaser Cinematic Video (2 min)");
    expect(body.expected_delivery_date).toBe("2099-11-15");
    expect(body.lead_details?.album).toEqual({ enabled: true, pages: 25 });
    expect(body.lead_details?.expectedDeliveryDate).toBe("2099-11-15");
    expect(body.lead_details?.addOns).toContain("Printed Photo Album (25 pages)");
  });
});
