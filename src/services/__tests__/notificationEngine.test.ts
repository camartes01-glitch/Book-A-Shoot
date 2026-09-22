import type { Booking, CustomerProfile } from "@/src/types/booking";

jest.mock("@/src/services/pushNotificationService", () => ({
  pushNotificationService: {
    scheduleAt: jest.fn().mockResolvedValue(undefined),
    cancelScheduledNotification: jest.fn().mockResolvedValue(undefined),
    scheduleRepeatingEveryDays: jest.fn().mockResolvedValue(undefined),
    hasScheduled: jest.fn().mockResolvedValue(false),
  },
}));

import { runEngineTick, runReplacementTick } from "@/src/services/notificationEngine";
import { addNotification, getNotifications } from "@/src/services/notificationsStore";
import { pushNotificationService } from "@/src/services/pushNotificationService";
import * as bookingApi from "@/src/services/bookingApi";

const profile: CustomerProfile = {
  customerId: "cust_1",
  name: "Ranjit Kumar",
  mobile: "9999999999",
  email: "ranjit@example.com",
  avatarInitials: "RK",
  savedAddresses: [],
};

function makeDay(partial: Partial<Booking["days"][number]> = {}): Booking["days"][number] {
  return {
    dayId: "day_1",
    order: 0,
    eventDate: "2026-12-25",
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
    endTime: "18:00",
    overnight: false,
    photography: { traditional: true, traditionalCount: 1, candid: false, candidCount: 0 },
    videography: { traditional: false, traditionalCount: 0, candid: false, candidCount: 0 },
    aerial: { drones: 0 },
    ledWall: { enabled: false, size: "", screenCount: 0 },
    webLive: { enabled: false, quality: "HD", cameraCount: 0, streamingPlatform: "", accessType: "private" },
    ...partial,
  };
}

function makeBooking(partial: Partial<Booking>): Booking {
  return {
    bookingId: "bk_1",
    customerId: "cust_1",
    remoteBookingId: "bk_1",
    status: "REQUEST_SENT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [makeDay()],
    deliverables: {} as any,
    expectedDeliveryDate: null,
    budget: 50000,
    selectedPackage: "signature",
    packageOptions: null,
    matches: [],
    selectedVendorId: null,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 100,
    assigned_photographers: [],
    ...partial,
  } as Booking;
}

describe("Notification engine diffing", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.clear();
  });

  test("fires vendor_accepted exactly once when a firm's has_accepted flips true", async () => {
    const pending = makeBooking({
      assigned_photographers: [
        {
          id: "p1",
          provider_id: "p1",
          name: "Studio Lumen",
          rating: 4.8,
          city: "Hyderabad",
          has_accepted: false,
          is_confirmed: false,
          can_confirm: false,
          contact_unlocked: false,
        },
      ],
    });
    await runEngineTick([pending], profile);
    let list = await getNotifications();
    expect(list.filter((n) => n.type === "vendor_accepted")).toHaveLength(0);

    const accepted = makeBooking({
      assigned_photographers: [
        {
          id: "p1",
          provider_id: "p1",
          name: "Studio Lumen",
          rating: 4.8,
          city: "Hyderabad",
          has_accepted: true,
          is_confirmed: false,
          can_confirm: true,
          contact_unlocked: true,
        },
      ],
    });
    await runEngineTick([accepted], profile);
    list = await getNotifications();
    const accepts = list.filter((n) => n.type === "vendor_accepted");
    expect(accepts).toHaveLength(1);
    expect(accepts[0].body).toContain("Studio Lumen");
    expect(accepts[0].bookingId).toBe("bk_1");

    // Re-running with the same accepted state must not fire a duplicate.
    await runEngineTick([accepted], profile);
    list = await getNotifications();
    expect(list.filter((n) => n.type === "vendor_accepted")).toHaveLength(1);
  });

  test("fires vendor_rejected once when a firm disappears from the assigned list, naming it", async () => {
    const withFirm = makeBooking({
      bookingId: "bk_2",
      remoteBookingId: "bk_2",
      assigned_photographers: [
        {
          id: "p2",
          provider_id: "p2",
          name: "Studio Reject",
          rating: 4.2,
          city: "Hyderabad",
          has_accepted: false,
          is_confirmed: false,
          can_confirm: false,
          contact_unlocked: false,
        },
      ],
    });
    await runEngineTick([withFirm], profile);

    const firmGone = makeBooking({ bookingId: "bk_2", remoteBookingId: "bk_2", assigned_photographers: [] });
    await runEngineTick([firmGone], profile);

    let list = await getNotifications();
    const rejects = list.filter((n) => n.type === "vendor_rejected");
    expect(rejects).toHaveLength(1);
    expect(rejects[0].body).toContain("Studio Reject");

    await runEngineTick([firmGone], profile);
    list = await getNotifications();
    expect(list.filter((n) => n.type === "vendor_rejected")).toHaveLength(1);
  });

  test("schedules (but doesn't yet fire) a draft nudge for a fresh draft, and fires immediately once stale", async () => {
    const freshDraft = makeBooking({
      bookingId: "draft_1",
      remoteBookingId: undefined,
      status: "DRAFT",
      updatedAt: new Date().toISOString(),
    });
    await runEngineTick([freshDraft], profile);
    let list = await getNotifications();
    expect(list.filter((n) => n.type === "draft_resume_nudge")).toHaveLength(0);
    expect(pushNotificationService.scheduleAt).toHaveBeenCalled();

    const staleDraft = makeBooking({
      bookingId: "draft_2",
      remoteBookingId: undefined,
      status: "DRAFT",
      updatedAt: new Date(Date.now() - 25 * 3_600_000).toISOString(),
    });
    await runEngineTick([staleDraft], profile);
    list = await getNotifications();
    const nudges = list.filter((n) => n.type === "draft_resume_nudge" && n.bookingId === "draft_2");
    expect(nudges).toHaveLength(1);
  });

  test("never surfaces a payment-shaped notification even if something tried to add one", async () => {
    await addNotification({
      id: "bad_1",
      title: "Payment received",
      body: "Your payment of ₹5000 was successful.",
      createdAt: new Date().toISOString(),
      read: false,
    });
    const list = await getNotifications();
    expect(list.find((n) => n.id === "bad_1")).toBeUndefined();
  });

  test("fires vendor_rejected with timed_out reason when a firm exceeds the 1-hour response window without accepting", async () => {
    const baseTime = 1700000000000;
    jest.spyOn(Date, "now").mockReturnValue(baseTime);

    const pendingFirm = makeBooking({
      bookingId: "bk_timeout",
      remoteBookingId: "bk_timeout",
      assigned_photographers: [
        {
          id: "p_time",
          provider_id: "p_time",
          name: "Slow Studio",
          rating: 4.5,
          city: "Hyderabad",
          has_accepted: false,
          is_confirmed: false,
          can_confirm: false,
          contact_unlocked: false,
        },
      ],
    });

    // First tick: records firmFirstSeenAt at baseTime
    await runEngineTick([pendingFirm], profile);
    let list = await getNotifications();
    expect(list.filter((n) => n.type === "vendor_rejected")).toHaveLength(0);

    // 30 minutes later: still pending, no timeout
    (Date.now as jest.Mock).mockReturnValue(baseTime + 30 * 60 * 1000);
    await runEngineTick([pendingFirm], profile);
    list = await getNotifications();
    expect(list.filter((n) => n.type === "vendor_rejected")).toHaveLength(0);

    // 65 minutes later: exceeds 1-hour window -> fires vendor_rejected with timed_out copy
    (Date.now as jest.Mock).mockReturnValue(baseTime + 65 * 60 * 1000);
    await runEngineTick([pendingFirm], profile);
    list = await getNotifications();
    const rejects = list.filter((n) => n.type === "vendor_rejected");
    expect(rejects).toHaveLength(1);
    expect(rejects[0].title).toContain("didn't respond in time");
    expect(rejects[0].body).toContain("Slow Studio");
    expect(rejects[0].body).toContain("response window");

    // Idempotent: another tick does not duplicate the notification
    await runEngineTick([pendingFirm], profile);
    list = await getNotifications();
    expect(list.filter((n) => n.type === "vendor_rejected")).toHaveLength(1);
  });

  test("fires vendor_rejected immediately when a firm is explicitly rejected", async () => {
    const rejectedBooking = makeBooking({
      bookingId: "bk_rejected",
      remoteBookingId: "bk_rejected",
      assigned_photographers: [
        {
          id: "p_rej",
          provider_id: "p_rej",
          name: "Busy Studio",
          rating: 4.7,
          city: "Hyderabad",
          has_accepted: false,
          has_rejected: true,
          is_confirmed: false,
          can_confirm: false,
          contact_unlocked: false,
        },
      ],
    });

    await runEngineTick([rejectedBooking], profile);
    const list = await getNotifications();
    const rejects = list.filter((n) => n.type === "vendor_rejected");
    expect(rejects).toHaveLength(1);
    expect(rejects[0].title).toContain("Busy Studio can't make it this time");
    expect(rejects[0].body).toContain("rejected your request");
    expect(rejects[0].body).toContain("search new and better firms");
  });

  test("runReplacementTick dispatches replacement firms when dead/timed-out slots occur and fires new_search_dispatched", async () => {
    const booking = makeBooking({
      bookingId: "bk_replace",
      remoteBookingId: "bk_replace",
      status: "REQUEST_SENT",
      assigned_photographers: [
        {
          id: "p_dead",
          provider_id: "p_dead",
          name: "Declined Studio",
          rating: 4.1,
          city: "Hyderabad",
          has_accepted: false,
          has_rejected: true,
          is_confirmed: false,
          can_confirm: false,
          contact_unlocked: false,
        },
      ],
    });

    jest.spyOn(bookingApi, "refreshRemoteBookingStatus").mockResolvedValue(booking);
    const dispatchSpy = jest.spyOn(bookingApi, "dispatchReplacementFirms").mockResolvedValue({
      booking: {
        ...booking,
        assigned_photographers: [
          ...booking.assigned_photographers!,
          {
            id: "p_new_1",
            provider_id: "p_new_1",
            name: "Fresh Studio Alpha",
            rating: 4.9,
            city: "Hyderabad",
            has_accepted: false,
            is_confirmed: false,
            can_confirm: false,
            contact_unlocked: false,
          },
        ],
      },
      addedFirmNames: ["Fresh Studio Alpha"],
    });

    await runReplacementTick([booking], profile);

    // 6 max active firms, 0 alive (1 is dead) -> asks for 6 open slots
    expect(dispatchSpy).toHaveBeenCalledWith(booking, 6);

    const list = await getNotifications();
    const dispatched = list.filter((n) => n.type === "new_search_dispatched");
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].bookingId).toBe("bk_replace");
    expect(dispatched[0].title).toContain("We found 1 better firm for you!");
    expect(dispatched[0].body).toContain("better-suited photography firm");
  });

  test("runReplacementTick records replacementExhaustedAt and respects cooldown when pool is exhausted", async () => {
    const baseTime = 1700000000000;
    jest.spyOn(Date, "now").mockReturnValue(baseTime);

    const booking = makeBooking({
      bookingId: "bk_exhausted",
      remoteBookingId: "bk_exhausted",
      status: "REQUEST_SENT",
      assigned_photographers: [
        {
          id: "p_dead2",
          provider_id: "p_dead2",
          name: "Declined Studio 2",
          rating: 4.1,
          city: "Hyderabad",
          has_accepted: false,
          has_rejected: true,
          is_confirmed: false,
          can_confirm: false,
          contact_unlocked: false,
        },
      ],
    });

    jest.spyOn(bookingApi, "refreshRemoteBookingStatus").mockResolvedValue(booking);
    const dispatchSpy = jest.spyOn(bookingApi, "dispatchReplacementFirms").mockResolvedValue({
      booking,
      addedFirmNames: [],
    });

    // First run: attempts dispatch, finds nothing, marks replacementExhaustedAt
    await runReplacementTick([booking], profile);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    // Run 10 minutes later: within 1-hour cooldown -> skips refresh & dispatch
    (Date.now as jest.Mock).mockReturnValue(baseTime + 10 * 60 * 1000);
    await runReplacementTick([booking], profile);
    expect(dispatchSpy).toHaveBeenCalledTimes(1); // Still 1, did not call again

    // Run 65 minutes later: cooldown expired -> retries
    (Date.now as jest.Mock).mockReturnValue(baseTime + 65 * 60 * 1000);
    await runReplacementTick([booking], profile);
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
  });
});
