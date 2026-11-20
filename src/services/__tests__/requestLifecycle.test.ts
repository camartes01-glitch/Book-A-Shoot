/**
 * Request lifecycle after sending: editing a sent request updates that same
 * request (no new booking, no new dispatch), "Search again" restarts the
 * search on the same request, and 24-hour search outcomes are announced once.
 */
jest.mock("@/src/services/pushNotificationService", () => ({
  pushNotificationService: {
    scheduleAt: jest.fn().mockResolvedValue(undefined),
    cancelScheduledNotification: jest.fn().mockResolvedValue(undefined),
    scheduleRepeatingEveryDays: jest.fn().mockResolvedValue(undefined),
    hasScheduled: jest.fn().mockResolvedValue(true),
    cancelScheduledWhere: jest.fn().mockResolvedValue(0),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Booking, CustomerProfile, EventDay } from "@/src/types/booking";
import * as bookingApi from "@/src/services/bookingApi";
import { setAuthToken } from "@/src/services/camartesClient";
import { createEmptyBooking, createEmptyDay, sanitizeEventDay } from "@/src/domain/defaults";
import { setPhotographySelected } from "@/src/domain/dayServices";
import { isSentRequest, parseRemoteBookingRow, applyRemoteSnapshot } from "@/src/domain/bookingRequest";
import { canSearchAgain } from "@/src/domain/bookingFilters";
import { buildNotificationContent } from "@/src/domain/notificationContent";
import { runEngineTick } from "@/src/services/notificationEngine";
import { getNotifications } from "@/src/services/notificationsStore";
import { readAllBookings } from "@/src/services/bookingApi";

const PROFILE: CustomerProfile = {
  customerId: "cust-1",
  name: "Ravi Kumar",
  mobile: "9876543210",
  email: "ravi@example.com",
  avatarInitials: "RK",
  savedAddresses: [],
};

function jsonResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text, json: async () => body, headers: new Headers() } as Response;
}

function day(extra: Partial<EventDay> = {}): EventDay {
  return setPhotographySelected(
    sanitizeEventDay({
      ...createEmptyDay(1),
      eventDate: "2099-10-12",
      eventTypeIds: ["wedding"],
      startTime: "10:00",
      endTime: "16:00",
      location: {
        placeId: null,
        formattedAddress: "Kanuru, Vijayawada",
        latitude: null,
        longitude: null,
        city: "Vijayawada",
        district: "",
        state: "",
        pincode: "",
        manuallyEdited: false,
      },
      ...extra,
    }),
    true,
  );
}

function sentBooking(extra: Partial<Booking> = {}): Booking {
  return {
    ...createEmptyBooking("cust-1"),
    bookingId: "BK-ABC123",
    remoteBookingId: "BK-ABC123",
    remoteStatus: "pending",
    status: "REQUEST_SENT",
    days: [day()],
    budget: 150000,
    selectedPackage: "signature",
    expectedDeliveryDate: "2099-11-30",
    assignedProviderIds: ["v1", "v2"],
    draftCompletionPct: 100,
    ...extra,
  };
}

type Call = { url: string; method: string; body: Record<string, unknown> | null };

function mockFetch(handler: (call: Call) => Response): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: String(init?.method || "GET"),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    };
    if (call.url.includes("/api/notifications")) return jsonResponse(200, []);
    calls.push(call);
    return handler(call);
  }) as unknown as typeof fetch;
  return calls;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await setAuthToken("t");
  await AsyncStorage.setItem("camartes-customer:profile:v1", JSON.stringify(PROFILE));
});

describe("isSentRequest", () => {
  test("a dispatched request is 'sent'; wizard drafts are not", () => {
    expect(isSentRequest(sentBooking())).toBe(true);
    expect(isSentRequest(sentBooking({ status: "VENDOR_ACCEPTED" }))).toBe(true);
    expect(isSentRequest({ ...sentBooking(), remoteBookingId: null, status: "DRAFT" })).toBe(false);
    expect(isSentRequest({ ...sentBooking(), bookingId: "draft_1", remoteBookingId: undefined })).toBe(false);
    expect(isSentRequest(null)).toBe(false);
  });
});

describe("editing a sent request", () => {
  test("updates the SAME request: one PUT, no new booking, no re-dispatch", async () => {
    await bookingApi.saveBooking(sentBooking());
    const calls = mockFetch(() =>
      jsonResponse(200, { success: true, updated: true, notified_count: 2, booking: { last_edited_at: "2099-01-01T10:00:00Z" } }),
    );
    await bookingApi.updateDay("BK-ABC123", (await bookingApi.getBooking("BK-ABC123"))!.days[0].dayId, { startTime: "11:00" });

    const result = await bookingApi.updateSentRequest("BK-ABC123");

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].url).toContain("/api/bookings/BK-ABC123/details");
    expect(calls[0].body).not.toHaveProperty("assigned_provider_ids");
    expect(calls[0].body).not.toHaveProperty("client_booking_id");
    expect(calls[0].body?.event_time).toBe("11:00 AM");
    expect(result).toMatchObject({ updated: true, notifiedCount: 2 });
    expect(result.booking.bookingId).toBe("BK-ABC123");
    expect(result.booking.status).toBe("REQUEST_SENT");

    const stored = (await readAllBookings()).filter((b) => b.customerId === "cust-1");
    expect(stored).toHaveLength(1); // no second booking appeared
    const notes = await getNotifications();
    expect(notes.map((n) => n.type)).toEqual(["request_updated"]);
    expect(notes[0].body).toContain("2 photographers");
  });

  test("an unchanged update is a quiet no-op", async () => {
    await bookingApi.saveBooking(sentBooking());
    mockFetch(() => jsonResponse(200, { success: true, updated: false, notified_count: 0 }));
    const result = await bookingApi.updateSentRequest("BK-ABC123");
    expect(result.updated).toBe(false);
    expect(await getNotifications()).toEqual([]);
  });

  test("server refusals are shown as-is and nothing is lost locally", async () => {
    await bookingApi.saveBooking(sentBooking());
    mockFetch(() => jsonResponse(409, { detail: "Photographers were chosen for the original city, so the city can't be changed on this request." }));
    await expect(bookingApi.updateSentRequest("BK-ABC123")).rejects.toThrow(/original city/);
    expect((await bookingApi.getBooking("BK-ABC123"))?.status).toBe("REQUEST_SENT");
  });

  test("offline: a clear retry message", async () => {
    await bookingApi.saveBooking(sentBooking());
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;
    await expect(bookingApi.updateSentRequest("BK-ABC123")).rejects.toThrow(/Update request again/);
  });

  test("wizard steps never reset a sent request back into matching", async () => {
    await bookingApi.saveBooking(sentBooking());
    const calls = mockFetch(() => jsonResponse(200, {}));
    const matched = await bookingApi.getVendorMatches("BK-ABC123");
    const pkg = await bookingApi.selectPackage("BK-ABC123", "elite");
    expect(matched.status).toBe("REQUEST_SENT");
    expect(pkg.status).toBe("REQUEST_SENT");
    expect(pkg.assignedProviderIds).toEqual(["v1", "v2"]);
    expect(calls).toHaveLength(0); // no catalog re-match for a sent request
  });

  test("a request that was never sent can't be 'updated'", async () => {
    await bookingApi.saveBooking({ ...sentBooking(), bookingId: "draft_9", remoteBookingId: undefined, status: "DRAFT" });
    await expect(bookingApi.updateSentRequest("draft_9")).rejects.toThrow(/hasn't been sent/);
  });
});

describe("search again on the same request", () => {
  test("an expired search restarts on the same id", async () => {
    await bookingApi.saveBooking(sentBooking({ status: "EXPIRED", remoteStatus: "expired", canSearchAgainRemote: true, searchWindowClosed: true }));
    const calls = mockFetch(() =>
      jsonResponse(200, {
        success: true,
        restarted: true,
        assigned_count: 5,
        firms_status_message: "5 verified photography partners assigned",
        booking: { booking_id: "BK-ABC123", status: "pending", search_cycle: 2, search_window_closed: false, can_search_again: false },
      }),
    );
    const booking = (await bookingApi.getBooking("BK-ABC123"))!;
    expect(bookingApi.canRestartSearchRemotely(booking)).toBe(true);

    const { booking: next, restarted } = await bookingApi.restartSearch("BK-ABC123");

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toContain("/api/bookings/BK-ABC123/search-again");
    expect(restarted).toBe(true);
    expect(next.bookingId).toBe("BK-ABC123");
    expect(next.status).toBe("REQUEST_SENT");
    expect(next.searchCycle).toBe(2);
    expect(next.searchWindowClosed).toBe(false);
    expect((await readAllBookings()).filter((b) => b.customerId === "cust-1")).toHaveLength(1);
    expect((await getNotifications()).map((n) => n.type)).toEqual(["search_restarted"]);
  });

  test("cancelled requests still start a fresh request instead", () => {
    const cancelled = sentBooking({ status: "CUSTOMER_CANCELLED", remoteStatus: "cancelled", canSearchAgainRemote: false });
    expect(bookingApi.canRestartSearchRemotely(cancelled)).toBe(false);
    expect(canSearchAgain(cancelled)).toBe(true);
  });

  test("a finished search with some acceptances offers Search again", () => {
    const b = sentBooking({
      status: "VENDOR_ACCEPTED",
      searchWindowClosed: true,
      canSearchAgainRemote: true,
      assigned_photographers: [{ id: "v1", provider_id: "v1", name: "Studio One", has_accepted: true } as any],
    });
    expect(canSearchAgain(b)).toBe(true);
    expect(bookingApi.canRestartSearchRemotely(b)).toBe(true);
  });

  test("server search fields flow into the local booking", () => {
    const snap = parseRemoteBookingRow({
      booking_id: "BK-ABC123",
      status: "accepted",
      search_cycle: 3,
      search_ends_at: "2099-01-02T10:00:00Z",
      search_window_closed: true,
      can_search_again: true,
      last_edited_at: "2099-01-01T09:00:00Z",
    })!;
    const merged = applyRemoteSnapshot(sentBooking(), snap);
    expect(merged).toMatchObject({
      searchCycle: 3,
      searchEndsAt: "2099-01-02T10:00:00Z",
      searchWindowClosed: true,
      canSearchAgainRemote: true,
      lastEditedAt: "2099-01-01T09:00:00Z",
    });
  });
});

describe("24-hour search outcome notices", () => {
  test("'It's not you, it's us' once per search, never for history", async () => {
    const active = sentBooking();
    await runEngineTick([active], PROFILE); // device has now seen it while searching
    const expired = sentBooking({ status: "EXPIRED", remoteStatus: "expired", searchWindowClosed: true, searchCycle: 1 });
    await runEngineTick([expired], PROFILE);
    await runEngineTick([expired], PROFILE);
    const notes = (await getNotifications()).filter((n) => n.type === "search_expired");
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("It's not you, it's us");
    expect(notes[0].body).toContain("Search again");

    // A second search (cycle 2) that also ends gets its own notice.
    await runEngineTick([{ ...expired, searchCycle: 2 }], PROFILE);
    expect((await getNotifications()).filter((n) => n.type === "search_expired")).toHaveLength(2);
  });

  test("a booking first seen already expired is not announced", async () => {
    await runEngineTick([sentBooking({ bookingId: "BK-OLD", remoteBookingId: "BK-OLD", status: "EXPIRED", remoteStatus: "expired" })], PROFILE);
    expect((await getNotifications()).filter((n) => n.type === "search_expired")).toHaveLength(0);
  });

  test("copy is warm and actionable", () => {
    const closed = buildNotificationContent("search_window_closed", { eventName: "Wedding", firmCount: 2 });
    expect(closed.body).toBe("2 photographers accepted your request. Compare their profiles and confirm the one you love. Want more options? Tap Search again.");
    const full = buildNotificationContent("search_window_closed", { eventName: "Wedding", firmCount: 6 });
    expect(full.body).not.toContain("Search again");
  });
});
