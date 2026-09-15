import { setPhotographySelected } from "@/src/domain/dayServices";
import { createEmptyDay, sanitizeEventDay } from "@/src/domain/defaults";
import * as bookingApi from "@/src/services/bookingApi";
import { CamartesApiError } from "@/src/services/camartesClient";
import type { EventDay } from "@/src/types/booking";

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

function completeDay(): EventDay {
  return setPhotographySelected(
    sanitizeEventDay({
      ...createEmptyDay(1),
      eventDate: "2099-10-12",
      eventTypeIds: ["wedding"],
      location: {
        ...createEmptyDay(1).location,
        formattedAddress: "Banjara Hills, Hyderabad",
        city: "Hyderabad",
      },
      startTime: "10:00",
      endTime: "16:00",
    }),
    true,
  );
}

const LIVE_PHOTOGRAPHY_FIRM = {
  user_id: "user_25493cf5103e",
  provider_id: "user_25493cf5103e",
  full_name: "Pavan Kumar R",
  city: "Hyderabad",
  service_type: "photography_firm",
  shooting_style: ["Traditional"],
  is_available: true,
  avg_rating: 0,
  pricing: { price_full_day: 15000 },
  budget_preference: ["basic"],
};

describe("booking matching and submission against Camartes", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/providers/service/photography_firm") || url.includes("/api/providers/service/")) {
        return jsonResponse(200, [LIVE_PHOTOGRAPHY_FIRM]);
      }
      if (url.includes("/api/bookings")) {
        return jsonResponse(401, { detail: "Authentication required" });
      }
      return jsonResponse(404, { detail: "Not found" });
    }) as typeof fetch;
  });

  test("live matching returns the catalog provider id and never fabricates a booking", async () => {
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    expect(matched.matches).toHaveLength(1);
    expect(matched.matches?.[0].vendorId).toBe("user_25493cf5103e");
    expect(matched.matches?.[0].studioName).toBe("Pavan Kumar R");
    expect(matched.status).toBe("MATCHING");
    expect(matched.remoteBookingId ?? null).toBeNull();
  });

  test("empty catalog search yields no matches and does not create a booking id", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(200, [])) as typeof fetch;
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    expect(matched.matches).toEqual([]);
    expect(matched.remoteBookingId ?? null).toBeNull();
  });

  test("submit without a Camartes token does not mark the booking sent or confirmed", async () => {
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");
    await expect(bookingApi.submitVendorRequest(matched.bookingId)).rejects.toBeInstanceOf(CamartesApiError);
    const after = await bookingApi.getBooking(matched.bookingId);
    expect(after?.status).toBe("VENDOR_SELECTED");
    expect(after?.remoteBookingId ?? null).toBeNull();
  });

  test("failed POST /api/bookings does not show success or invent a booking id", async () => {
    const { setAuthToken } = await import("@/src/services/camartesClient");
    await setAuthToken("test-token");
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");
    await expect(bookingApi.submitVendorRequest(matched.bookingId)).rejects.toBeInstanceOf(CamartesApiError);
    const after = await bookingApi.getBooking(matched.bookingId);
    expect(after?.status).toBe("VENDOR_SELECTED");
    expect(after?.bookingId.startsWith("draft")).toBe(true);
  });

  test("failed POST /api/bookings 400 stays on review and does not invent a booking id", async () => {
    const { setAuthToken } = await import("@/src/services/camartesClient");
    await setAuthToken("test-token");
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/providers/service/")) return jsonResponse(200, [LIVE_PHOTOGRAPHY_FIRM]);
      if (url.includes("/api/bookings") && init?.method === "POST") {
        return jsonResponse(400, { detail: "event_date is required" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");
    await expect(bookingApi.submitVendorRequest(matched.bookingId)).rejects.toMatchObject({ status: 400 });
    const after = await bookingApi.getBooking(matched.bookingId);
    expect(after?.status).toBe("VENDOR_SELECTED");
    expect(after?.remoteBookingId ?? null).toBeNull();
  });

  test("failed POST /api/bookings 403 nested KYC detail stays on review and shows the backend message", async () => {
    const { setAuthToken } = await import("@/src/services/camartesClient");
    await setAuthToken("test-token");
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/providers/service/")) return jsonResponse(200, [LIVE_PHOTOGRAPHY_FIRM]);
      if (url.includes("/api/bookings") && init?.method === "POST") {
        return jsonResponse(403, {
          detail: {
            message: "Marketplace access denied. Admin approval and KYC verification are required.",
            status: "locked",
            admin_acceptance: "profile_incomplete",
            kyc_verified: false,
          },
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");
    await expect(bookingApi.submitVendorRequest(matched.bookingId)).rejects.toMatchObject({
      status: 403,
      message: "Marketplace access denied. Admin approval and KYC verification are required.",
    });
    const after = await bookingApi.getBooking(matched.bookingId);
    expect(after?.status).toBe("VENDOR_SELECTED");
    expect(after?.status).not.toBe("CONFIRMED");
    expect(after?.remoteBookingId ?? null).toBeNull();
  });

  test("failed POST /api/bookings 500 stays on review and does not mark confirmed", async () => {
    const { setAuthToken } = await import("@/src/services/camartesClient");
    await setAuthToken("test-token");
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/providers/service/")) return jsonResponse(200, [LIVE_PHOTOGRAPHY_FIRM]);
      if (url.includes("/api/bookings") && init?.method === "POST") {
        return jsonResponse(500, { detail: "Internal server error" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");
    await expect(bookingApi.submitVendorRequest(matched.bookingId)).rejects.toMatchObject({ status: 500 });
    const after = await bookingApi.getBooking(matched.bookingId);
    expect(after?.status).toBe("VENDOR_SELECTED");
    expect(after?.status).not.toBe("CONFIRMED");
    expect(after?.remoteBookingId ?? null).toBeNull();
  });

  test("successful POST persists the backend booking id and request-sent status", async () => {
    const { setAuthToken } = await import("@/src/services/camartesClient");
    await setAuthToken("test-token");
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/providers/service/")) return jsonResponse(200, [LIVE_PHOTOGRAPHY_FIRM]);
      if (url.includes("/api/bookings") && init?.method === "POST") {
        return jsonResponse(200, { booking_id: "bk_live_99", status: "pending" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");
    const submitted = await bookingApi.submitVendorRequest(matched.bookingId);
    expect(submitted.bookingId).toBe("bk_live_99");
    expect(submitted.remoteBookingId).toBe("bk_live_99");
    expect(submitted.status).toBe("REQUEST_SENT");
    expect(submitted.remoteStatus).toBe("pending");
  });

  test("failed POST /api/bookings 400 when no firms with active balance are available shows clean message", async () => {
    const { setAuthToken } = await import("@/src/services/camartesClient");
    await setAuthToken("test-token");
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/providers/service/")) return jsonResponse(200, [LIVE_PHOTOGRAPHY_FIRM]);
      if (url.includes("/api/bookings") && init?.method === "POST") {
        return jsonResponse(400, {
          detail: "No photography firms with active balance and availability found in your area right now.",
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");

    await expect(bookingApi.submitVendorRequest(matched.bookingId)).rejects.toMatchObject({
      status: 400,
      message: "No photography firms with active balance and availability found in your area right now. Please check back shortly.",
    });
  });

  test("successful POST /api/bookings captures firms_status_message and assigned_photographers", async () => {
    const { setAuthToken } = await import("@/src/services/camartesClient");
    await setAuthToken("test-token");
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/providers/service/")) return jsonResponse(200, [LIVE_PHOTOGRAPHY_FIRM]);
      if (url.includes("/api/bookings") && init?.method === "POST") {
        return jsonResponse(200, {
          booking_id: "bk_live_firms",
          status: "pending",
          assigned_count: 3,
          firms_status_message: "Found 3 suitable photography firms meeting your criteria.",
          assigned_photographers: [
            {
              provider_id: "user_firm_1",
              name: "Firm One",
              rating: 4.9,
              city: "Bangalore",
              has_accepted: false,
              is_confirmed: false,
              can_confirm: false,
              contact_unlocked: false,
            },
            {
              provider_id: "user_firm_2",
              name: "Firm Two",
              rating: 4.8,
              city: "Bangalore",
              has_accepted: true,
              is_confirmed: false,
              can_confirm: true,
              contact_unlocked: true,
              contact_phone: "+919876543210",
              contact_whatsapp: "9876543210",
            },
          ],
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");

    const submitted = await bookingApi.submitVendorRequest(matched.bookingId);
    expect(submitted.bookingId).toBe("bk_live_firms");
    expect(submitted.firms_status_message).toBe("Found 3 suitable photography firms meeting your criteria.");
    expect(submitted.assigned_count).toBe(3);
    expect(submitted.assigned_photographers).toHaveLength(2);
    expect(submitted.assigned_photographers?.[0].has_accepted).toBe(false);
    expect(submitted.assigned_photographers?.[1].has_accepted).toBe(true);
    expect(submitted.assigned_photographers?.[1].can_confirm).toBe(true);
  });

  test("confirmPhotographer locks partner via POST /api/bookings/{id}/confirm", async () => {
    const { setAuthToken } = await import("@/src/services/camartesClient");
    await setAuthToken("test-token");
    let confirmCallMade = false;
    let confirmBody: any = null;

    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/providers/service/")) return jsonResponse(200, [LIVE_PHOTOGRAPHY_FIRM]);
      if (url.includes("/api/bookings/bk_live_firms/confirm") && init?.method === "POST") {
        confirmCallMade = true;
        confirmBody = JSON.parse(init.body as string);
        return jsonResponse(200, {
          status: "confirmed",
          message: "Photography partner confirmed successfully!",
        });
      }
      if (url.includes("/api/bookings") && init?.method === "POST") {
        return jsonResponse(200, {
          booking_id: "bk_live_firms",
          status: "pending",
          assigned_count: 3,
          firms_status_message: "Found 3 suitable photography firms meeting your criteria.",
          assigned_photographers: [
            {
              provider_id: "user_firm_1",
              name: "Firm One",
              rating: 4.9,
              city: "Bangalore",
              has_accepted: false,
              is_confirmed: false,
              can_confirm: false,
              contact_unlocked: false,
            },
            {
              provider_id: "user_firm_2",
              name: "Firm Two",
              rating: 4.8,
              city: "Bangalore",
              has_accepted: true,
              is_confirmed: false,
              can_confirm: true,
              contact_unlocked: true,
              contact_phone: "+919876543210",
              contact_whatsapp: "9876543210",
            },
          ],
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const created = await bookingApi.createBooking("cust-1");
    await bookingApi.updateDay(created.bookingId, created.days[0].dayId, completeDay());
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    await bookingApi.selectPackage(created.bookingId, "signature");
    const matched = await bookingApi.getVendorMatches(created.bookingId);
    await bookingApi.selectVendor(matched.bookingId, "user_25493cf5103e");
    const submitted = await bookingApi.submitVendorRequest(matched.bookingId);

    const confirmed = await bookingApi.confirmPhotographer(submitted.bookingId, "user_firm_2");
    expect(confirmCallMade).toBe(true);
    expect(confirmBody).toEqual({ provider_id: "user_firm_2" });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.confirmed_provider_id).toBe("user_firm_2");
    const firm2 = confirmed.assigned_photographers?.find((f) => f.provider_id === "user_firm_2");
    expect(firm2?.is_confirmed).toBe(true);
    expect(firm2?.can_confirm).toBe(false);
  });

  test("canSearchAgain correctly identifies failed, expired, or 0-firm bookings", () => {
    const { canSearchAgain } = require("@/src/domain/bookingFilters");

    const activeBooking = {
      bookingId: "bk_1",
      remoteBookingId: "rem_1",
      status: "REQUEST_SENT",
      assigned_photographers: [{ provider_id: "firm1" }],
      days: [],
    };
    expect(canSearchAgain(activeBooking as any)).toBe(false);

    const noFirmsBooking = {
      bookingId: "bk_2",
      remoteBookingId: "rem_2",
      status: "REQUEST_SENT",
      firms_status_message: "No photography firms available in this location",
      assigned_photographers: [],
      days: [],
    };
    expect(canSearchAgain(noFirmsBooking as any)).toBe(true);

    const expiredBooking = {
      bookingId: "bk_3",
      remoteBookingId: "rem_3",
      status: "EXPIRED",
      assigned_photographers: [],
      days: [],
    };
    expect(canSearchAgain(expiredBooking as any)).toBe(true);
  });

  test("cloneBookingForSearchAgain creates a fresh draft pre-populated for retry", async () => {
    const failedBooking = {
      bookingId: "bk_old_123",
      remoteBookingId: "bk_old_remote",
      status: "EXPIRED",
      selectedPackage: "signature" as const,
      firms_status_message: "No photography firms available",
      assigned_photographers: [],
      days: [completeDay()],
      deliverables: {},
      budget: 50000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cloned = await bookingApi.cloneBookingForSearchAgain(failedBooking as any);
    expect(cloned.bookingId).not.toBe(failedBooking.bookingId);
    expect(cloned.bookingId.startsWith("draft_")).toBe(true);
    expect(cloned.remoteBookingId).toBeUndefined();
    expect(["DRAFT", "MATCHING"]).toContain(cloned.status);
    expect(cloned.selectedPackage).toBe("signature");
    expect(cloned.days).toHaveLength(1);
    expect(cloned.firms_status_message).toBeNull();
  });
});

