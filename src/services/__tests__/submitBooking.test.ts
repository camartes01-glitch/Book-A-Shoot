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

const LIVE_PHOTOGRAPHER = {
  user_id: "user_25493cf5103e",
  provider_id: "user_25493cf5103e",
  full_name: "Pavan Kumar R",
  city: "Hyderabad",
  service_type: "photographer",
  shooting_style: ["Traditional"],
  is_available: true,
  avg_rating: 0,
  pricing: { price_full_day: 15000 },
};

describe("booking matching and submission against Camartes", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/providers/search")) {
        return jsonResponse(200, [LIVE_PHOTOGRAPHER]);
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
      if (url.includes("/api/providers/search")) return jsonResponse(200, [LIVE_PHOTOGRAPHER]);
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
      if (url.includes("/api/providers/search")) return jsonResponse(200, [LIVE_PHOTOGRAPHER]);
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
      if (url.includes("/api/providers/search")) return jsonResponse(200, [LIVE_PHOTOGRAPHER]);
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
      if (url.includes("/api/providers/search")) return jsonResponse(200, [LIVE_PHOTOGRAPHER]);
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
});
