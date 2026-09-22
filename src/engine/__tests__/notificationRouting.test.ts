import { resolveNotificationRoute } from "@/src/domain/notificationRouting";
import type { AppNotification, Booking } from "@/src/types/booking";

function makeNotif(partial: Partial<AppNotification>): AppNotification {
  return {
    id: "n1",
    title: "Title",
    body: "Body",
    createdAt: new Date().toISOString(),
    read: false,
    ...partial,
  };
}

function makeBooking(partial: Partial<Booking>): Booking {
  return {
    bookingId: "bk_1",
    remoteBookingId: "bk_1",
    status: "DRAFT",
    days: [],
    deliverables: {} as any,
    expectedDeliveryDate: null,
    budget: null,
    selectedPackage: null,
    packageOptions: null,
    matches: null,
    selectedVendorId: null,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  } as Booking;
}

describe("Notification tap routing", () => {
  test("chat_message opens the chat screen with the right firm", () => {
    const route = resolveNotificationRoute(
      makeNotif({ type: "chat_message", firmId: "firm_9", firmName: "Studio Lumen" }),
    );
    expect(route.pathname).toBe("/chat/[userId]");
    expect(route.params).toMatchObject({ userId: "firm_9", name: "Studio Lumen", accepted: "true" });
  });

  test("vendor_accepted opens the booking with focusFirmId set", () => {
    const route = resolveNotificationRoute(
      makeNotif({ type: "vendor_accepted", bookingId: "bk_5", firmId: "firm_9" }),
    );
    expect(route.pathname).toBe("/bookings/[bookingId]");
    expect(route.params).toMatchObject({ bookingId: "bk_5", focusFirmId: "firm_9" });
  });

  test("vendor_rejected opens the plain booking details page", () => {
    const route = resolveNotificationRoute(makeNotif({ type: "vendor_rejected", bookingId: "bk_5" }));
    expect(route.pathname).toBe("/bookings/[bookingId]");
    expect(route.params).toEqual({ bookingId: "bk_5" });
  });

  test("request_sent and new_search_dispatched open the booking details page", () => {
    expect(resolveNotificationRoute(makeNotif({ type: "request_sent", bookingId: "bk_5" })).pathname).toBe(
      "/bookings/[bookingId]",
    );
    expect(resolveNotificationRoute(makeNotif({ type: "new_search_dispatched", bookingId: "bk_5" })).pathname).toBe(
      "/bookings/[bookingId]",
    );
  });

  test("event_reminder opens the booking (event details stand-in)", () => {
    const route = resolveNotificationRoute(makeNotif({ type: "event_reminder", bookingId: "bk_5" }));
    expect(route.pathname).toBe("/bookings/[bookingId]");
    expect(route.params).toEqual({ bookingId: "bk_5" });
  });

  test("draft_resume_nudge uses the precomputed resumeRoute when present", () => {
    const route = resolveNotificationRoute(
      makeNotif({ type: "draft_resume_nudge", bookingId: "bk_5", data: { resumeRoute: "/booking/budget" } }),
    );
    expect(route.pathname).toBe("/booking/budget");
  });

  test("draft_resume_nudge recomputes the route from the booking when resumeRoute is missing", () => {
    const draft = makeBooking({ bookingId: "bk_9", budget: null });
    const route = resolveNotificationRoute(makeNotif({ type: "draft_resume_nudge", bookingId: "bk_9" }), [draft]);
    expect(route.pathname).toBe("/booking/new");
  });

  test("welcome and marketing_nudge open the home tab", () => {
    expect(resolveNotificationRoute(makeNotif({ type: "welcome" })).pathname).toBe("/(tabs)");
    expect(resolveNotificationRoute(makeNotif({ type: "marketing_nudge" })).pathname).toBe("/(tabs)");
  });

  test("legacy backend 'message' type still routes to chat via userId", () => {
    const route = resolveNotificationRoute(makeNotif({ type: "message", userId: "firm_2", firmName: "Studio Z" }));
    expect(route.pathname).toBe("/chat/[userId]");
    expect(route.params?.userId).toBe("firm_2");
  });

  test("unresolvable notification without a bookingId falls back to the notifications tab", () => {
    const route = resolveNotificationRoute(makeNotif({ type: undefined, title: "Something", body: "Happened" }));
    expect(route.pathname).toBe("/(tabs)/notifications");
  });
});
