import {
  isEnquiryBooking,
  isUpcomingBooking,
  isCompletedBooking,
  isDraftBooking,
  filterBookings,
  getBookingEventTitle,
} from "@/src/domain/bookingFilters";
import type { Booking } from "@/src/types/booking";

function makeTestBooking(partial: Partial<Booking>): Booking {
  return {
    bookingId: "test_1",
    remoteBookingId: "rem_1",
    status: "DRAFT",
    days: [],
    matches: [],
    activityLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  } as Booking;
}

describe("Booking Filters & Event Titles", () => {
  test("categorizes enquiries accurately", () => {
    expect(isEnquiryBooking(makeTestBooking({ status: "SUBMITTED" }))).toBe(true);
    expect(isEnquiryBooking(makeTestBooking({ status: "MATCHING" }))).toBe(true);
    expect(isEnquiryBooking(makeTestBooking({ status: "REQUEST_SENT" }))).toBe(true);
    expect(isEnquiryBooking(makeTestBooking({ status: "VENDOR_SELECTED" }))).toBe(true);
    expect(isEnquiryBooking(makeTestBooking({ status: "VENDOR_ACCEPTED" }))).toBe(true);

    expect(isEnquiryBooking(makeTestBooking({ status: "CONFIRMED" }))).toBe(false);
    expect(isEnquiryBooking(makeTestBooking({ status: "COMPLETED" }))).toBe(false);
    expect(isEnquiryBooking(makeTestBooking({ status: "DRAFT" }))).toBe(false);
  });

  test("categorizes upcoming shoots accurately", () => {
    expect(isUpcomingBooking(makeTestBooking({ status: "CONFIRMED", confirmed_provider_id: "firm_1" }))).toBe(true);
    expect(isUpcomingBooking(makeTestBooking({ status: "CUSTOMER_CONFIRMED", confirmed_provider_id: "firm_1" }))).toBe(true);
    expect(isUpcomingBooking(makeTestBooking({ status: "PAYMENT_PENDING", confirmed_provider_id: "firm_1" }))).toBe(true);
    expect(isUpcomingBooking(makeTestBooking({ status: "IN_PROGRESS", confirmed_provider_id: "firm_1" }))).toBe(true);

    // Booked requests awaiting customer confirmation are enquiries, not upcoming yet
    expect(isUpcomingBooking(makeTestBooking({ status: "REQUEST_SENT" }))).toBe(false);
    expect(isUpcomingBooking(makeTestBooking({ status: "SUBMITTED" }))).toBe(false);
    expect(isUpcomingBooking(makeTestBooking({ status: "MATCHING" }))).toBe(false);
    expect(isUpcomingBooking(makeTestBooking({ status: "VENDOR_ACCEPTED" }))).toBe(false);

    expect(isUpcomingBooking(makeTestBooking({ status: "COMPLETED", confirmed_provider_id: "firm_1" }))).toBe(false);
    expect(isUpcomingBooking(makeTestBooking({ status: "CUSTOMER_CANCELLED" }))).toBe(false);
    expect(isUpcomingBooking(makeTestBooking({ status: "VENDOR_REJECTED" }))).toBe(false);
    expect(isUpcomingBooking(makeTestBooking({ status: "DRAFT" }))).toBe(false);

    // Past event date should not be upcoming
    const pastBooking = makeTestBooking({
      status: "CONFIRMED",
      confirmed_provider_id: "firm_1",
      days: [{ dayId: "d1", eventDate: "2020-01-01" } as any],
    });
    expect(isUpcomingBooking(pastBooking)).toBe(false);

    // Confirmed future shoot is upcoming
    const futureConfirmedBooking = makeTestBooking({
      status: "CONFIRMED",
      confirmed_provider_id: "firm_1",
      days: [{ dayId: "d1", eventDate: "2099-01-01" } as any],
    });
    expect(isUpcomingBooking(futureConfirmedBooking)).toBe(true);
  });

  test("categorizes completed shoots accurately", () => {
    expect(isCompletedBooking(makeTestBooking({ status: "COMPLETED", confirmed_provider_id: "firm_1" }))).toBe(true);
    expect(isCompletedBooking(makeTestBooking({ status: "CONFIRMED", confirmed_provider_id: "firm_1" }))).toBe(false);
    expect(isCompletedBooking(makeTestBooking({ status: "REQUEST_SENT" }))).toBe(false);

    // Booked shoot in the past is treated as completed
    const pastBooking = makeTestBooking({
      status: "CONFIRMED",
      confirmed_provider_id: "firm_1",
      days: [{ dayId: "d1", eventDate: "2020-01-01" } as any],
    });
    expect(isCompletedBooking(pastBooking)).toBe(true);
  });

  test("resolves chosen event title from booking days", () => {
    const weddingBooking = makeTestBooking({
      days: [
        {
          dayId: "d1",
          eventDate: "2026-11-20",
          eventTypeIds: ["wedding"],
        } as any,
      ],
    });
    expect(getBookingEventTitle(weddingBooking)).toBe("Wedding");

    const poojaBooking = makeTestBooking({
      days: [
        {
          dayId: "d1",
          eventDate: "2026-10-15",
          eventTypeIds: ["ganesh_pooja"],
        } as any,
      ],
    });
    expect(getBookingEventTitle(poojaBooking)).toBe("Ganesh Pooja");

    const multiDayBooking = makeTestBooking({
      days: [
        {
          dayId: "d1",
          eventDate: "2026-12-01",
          eventTypeIds: ["haldi"],
        } as any,
        {
          dayId: "d2",
          eventDate: "2026-12-02",
          eventTypeIds: ["wedding"],
        } as any,
      ],
    });
    expect(getBookingEventTitle(multiDayBooking)).toBe("Haldi, Wedding");

    const remoteBookingWithEventType = makeTestBooking({
      remoteBookingId: "bkg_98248249",
      eventType: "baby_shoot",
      days: [],
    });
    expect(getBookingEventTitle(remoteBookingWithEventType)).toBe("Baby Shoot");

    const remoteBookingWithNoEventType = makeTestBooking({
      remoteBookingId: "bkg_98248249",
      bookingId: "bkg_98248249",
      days: [],
    });
    expect(getBookingEventTitle(remoteBookingWithNoEventType)).toBe("Shoot Booking");
    expect(getBookingEventTitle(remoteBookingWithNoEventType)).not.toContain("bkg_");
  });

  test("categorizes draft bookings accurately", () => {
    expect(isDraftBooking(makeTestBooking({ status: "DRAFT", remoteBookingId: null }))).toBe(true);
    expect(isDraftBooking(makeTestBooking({ bookingId: "draft_123", status: "DRAFT", remoteBookingId: null }))).toBe(true);
    expect(isDraftBooking(makeTestBooking({ remoteBookingId: "bkg_99", status: "CONFIRMED" }))).toBe(false);
    expect(isDraftBooking(makeTestBooking({ status: "REQUEST_SENT" }))).toBe(false);
  });

  test("filters list based on selected tab", () => {
    const list = [
      makeTestBooking({ bookingId: "b1", status: "REQUEST_SENT" }),
      makeTestBooking({ bookingId: "b2", status: "CONFIRMED" }),
      makeTestBooking({ bookingId: "b3", status: "COMPLETED" }),
      makeTestBooking({ bookingId: "b4", status: "DRAFT", remoteBookingId: null }),
    ];

    expect(filterBookings(list, "all")).toHaveLength(4);
    expect(filterBookings(list, "enquiries")).toEqual([list[0]]);
    expect(filterBookings(list, "upcoming")).toEqual([list[1]]);
    expect(filterBookings(list, "completed")).toEqual([list[2]]);
    expect(filterBookings(list, "drafts")).toEqual([list[3]]);
  });
});
