import * as bookingApi from "@/src/services/bookingApi";
import type { Booking, EventDay, AssignedPhotographer } from "@/src/types/booking";

function jsonResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => body,
    headers: new Headers(),
  } as Response;
}

function makeDay(): EventDay {
  return {
    dayId: "day_1",
    order: 0,
    eventDate: "2099-10-12",
    eventTypeIds: ["wedding"],
    location: {
      placeId: null,
      formattedAddress: "Banjara Hills, Hyderabad",
      latitude: null,
      longitude: null,
      city: "Hyderabad",
      district: "",
      state: "",
      pincode: "",
      manuallyEdited: false,
    },
    startTime: "10:00",
    endTime: "16:00",
    overnight: false,
    photography: { traditional: true, traditionalCount: 1, candid: false, candidCount: 0 },
    videography: { traditional: false, traditionalCount: 0, candid: false, candidCount: 0 },
    aerial: { drones: 0 },
    ledWall: { enabled: false, size: "", screenCount: 0 },
    webLive: { enabled: false, quality: "HD", cameraCount: 0, streamingPlatform: "", accessType: "private" },
  };
}

const VENDOR_1 = {
  user_id: "user_firm_1",
  provider_id: "user_firm_1",
  full_name: "Studio Pioneer",
  city: "Hyderabad",
  service_type: "photography_firm",
  shooting_style: ["Traditional"],
  is_available: true,
  avg_rating: 4.8,
  pricing: { price_full_day: 15000 },
  budget_preference: ["basic", "signature"],
};

const VENDOR_2 = {
  user_id: "user_firm_2",
  provider_id: "user_firm_2",
  full_name: "Studio Elegance",
  city: "Hyderabad",
  service_type: "photography_firm",
  shooting_style: ["Traditional"],
  is_available: true,
  avg_rating: 4.9,
  pricing: { price_full_day: 18000 },
  budget_preference: ["basic", "signature"],
};

function makeBooking(partial: Partial<Booking> = {}): Booking {
  return {
    bookingId: "bk_wave_test",
    customerId: "cust_1",
    remoteBookingId: "bk_wave_test",
    status: "REQUEST_SENT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [makeDay()],
    deliverables: {} as any,
    expectedDeliveryDate: null,
    budget: 80000,
    selectedPackage: "signature",
    packageOptions: null,
    matches: [],
    selectedVendorId: null,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 100,
    assigned_photographers: [],
    assignedProviderIds: [],
    ...partial,
  } as Booking;
}

describe("Replacement waves and auto-dispatch", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.clear();

    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/providers/service/photography_firm") || url.includes("/api/providers/service/")) {
        return jsonResponse(200, [VENDOR_1, VENDOR_2]);
      }
      if (url.includes("/api/bookings/wave_remote_1")) {
        return jsonResponse(200, {
          id: "wave_remote_1",
          status: "pending",
          assigned_photographers: [
            {
              id: "user_firm_1",
              provider_id: "user_firm_1",
              name: "Studio Pioneer",
              has_accepted: false,
              has_rejected: false,
            },
          ],
        });
      }
      if (url.includes("/api/bookings/wave_terminal")) {
        return jsonResponse(200, {
          id: "wave_terminal",
          status: "expired",
          assigned_photographers: [
            {
              id: "user_firm_2",
              provider_id: "user_firm_2",
              name: "Studio Elegance",
              has_accepted: false,
              has_rejected: false,
            },
          ],
        });
      }
      if (url.includes("/api/bookings/bk_wave_test")) {
        return jsonResponse(200, {
          id: "bk_wave_test",
          status: "pending",
          assigned_photographers: [
            {
              id: "orig_firm",
              provider_id: "orig_firm",
              name: "Original Studio",
              has_accepted: false,
              has_rejected: true,
            },
          ],
        });
      }
      if (url.includes("/api/bookings")) {
        return jsonResponse(200, { booking_id: "wave_remote_1" });
      }
      return jsonResponse(404, { detail: "Not found" });
    }) as typeof fetch;
  });

function makeFirm(partial: Partial<AssignedPhotographer>): AssignedPhotographer {
  return {
    id: "firm_default",
    provider_id: "firm_default",
    name: "Default Studio",
    rating: 4.8,
    city: "Hyderabad",
    has_accepted: false,
    has_rejected: false,
    is_confirmed: false,
    can_confirm: false,
    contact_unlocked: false,
    ...partial,
  };
}

  test("dispatchReplacementFirms returns immediately when count is 0", async () => {
    const booking = makeBooking();
    const result = await bookingApi.dispatchReplacementFirms(booking, 0);
    expect(result.addedFirmNames).toEqual([]);
    expect(result.booking).toBe(booking);
  });

  test("dispatchReplacementFirms excludes existing assigned firms and matches new candidate", async () => {
    const booking = makeBooking({
      assignedProviderIds: ["user_firm_1"],
      assigned_photographers: [
        makeFirm({
          id: "user_firm_1",
          provider_id: "user_firm_1",
          name: "Studio Pioneer",
          has_accepted: false,
          has_rejected: true,
        }),
      ],
    });

    const result = await bookingApi.dispatchReplacementFirms(booking, 1);
    expect(result.addedFirmNames).toEqual(["Studio Elegance"]);
    expect(result.booking.replacementWaveIds).toHaveLength(1);
    expect(result.booking.assigned_photographers).toHaveLength(2);
    expect(result.booking.assigned_photographers?.map((f) => f.id)).toContain("user_firm_2");
  });

  test("dispatchReplacementFirms sets firms_status_message when no eligible firms remain", async () => {
    const booking = makeBooking({
      assignedProviderIds: ["user_firm_1", "user_firm_2"],
      assigned_photographers: [
        makeFirm({ id: "user_firm_1", provider_id: "user_firm_1", name: "Studio Pioneer" }),
        makeFirm({ id: "user_firm_2", provider_id: "user_firm_2", name: "Studio Elegance" }),
      ],
    });

    const result = await bookingApi.dispatchReplacementFirms(booking, 1);
    expect(result.addedFirmNames).toEqual([]);
    expect(result.booking.firms_status_message).toContain("couldn't find any additional matches");
  });

  test("refreshRemoteBookingStatus merges replacement wave photographers and marks terminal wave non-accepted firms dead", async () => {
    const booking = makeBooking({
      bookingId: "bk_wave_test",
      remoteBookingId: "bk_wave_test",
      replacementWaveIds: ["wave_remote_1", "wave_terminal"],
    });
    await bookingApi.saveBooking(booking);

    const refreshed = await bookingApi.refreshRemoteBookingStatus(booking.bookingId);
    expect(refreshed).not.toBeNull();

    const firms = refreshed?.assigned_photographers || [];
    const firmIds = firms.map((f) => f.provider_id || f.id);
    expect(firmIds).toContain("orig_firm");
    expect(firmIds).toContain("user_firm_1");
    expect(firmIds).toContain("user_firm_2");

    // wave_terminal had status: 'expired', so user_firm_2 (which did not accept) should have has_rejected: true
    const termFirm = firms.find((f) => (f.provider_id || f.id) === "user_firm_2");
    expect(termFirm?.has_rejected).toBe(true);

    // wave_remote_1 was status: 'pending', so user_firm_1 is not marked dead
    const liveFirm = firms.find((f) => (f.provider_id || f.id) === "user_firm_1");
    expect(liveFirm?.has_rejected).toBe(false);
  });
});
