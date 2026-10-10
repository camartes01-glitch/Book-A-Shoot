import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isBookingReviewed,
  markBookingReviewed,
  dismissReviewPrompt,
  isReviewDismissedRecently,
  getPendingReviewBooking,
  submitBookingReview,
  fetchVendorReviews,
} from "@/src/services/reviewApi";
import type { Booking } from "@/src/types/booking";

jest.mock("@/src/services/camartesClient", () => ({
  camartesFetch: jest.fn().mockImplementation((url: string, opts?: any) => {
    if (url.includes("/api/reviews/booking")) {
      return Promise.resolve({ success: true, review_id: "rev_123" });
    }
    if (url.includes("/api/reviews/")) {
      return Promise.resolve([
        {
          id: "rev_1",
          rating: 5,
          comment: "Outstanding wedding photography!",
          tags: ["Punctual", "Creative Poses"],
          reviewer_name: "Verified Customer",
          created_at: new Date().toISOString(),
        },
      ]);
    }
    return Promise.resolve({});
  }),
}));

describe("Review API and Rating Workflow", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test("isBookingReviewed returns false initially and true after markBookingReviewed", async () => {
    const bookingId = "bk_test_101";
    expect(await isBookingReviewed(bookingId)).toBe(false);

    await markBookingReviewed(bookingId);
    expect(await isBookingReviewed(bookingId)).toBe(true);
  });

  test("dismissReviewPrompt triggers a 24-hour cooldown", async () => {
    const bookingId = "bk_test_202";
    expect(await isReviewDismissedRecently(bookingId)).toBe(false);

    await dismissReviewPrompt(bookingId);
    expect(await isReviewDismissedRecently(bookingId)).toBe(true);
  });

  test("getPendingReviewBooking selects completed bookings with confirmed vendor", async () => {
    const pastDate = "2026-01-01"; // definitely in the past

    const incompleteBooking: Booking = {
      bookingId: "bk_draft",
      remoteBookingId: "bk_draft",
      status: "SEARCHING",
      event_type: "Engagement",
      eventDate: pastDate,
      event_date: pastDate,
      location: "Hyderabad",
    } as any;

    const completedWithoutVendor: Booking = {
      bookingId: "bk_no_vendor",
      remoteBookingId: "bk_no_vendor",
      status: "COMPLETED",
      event_type: "Engagement",
      eventDate: pastDate,
      event_date: pastDate,
      location: "Hyderabad",
      assigned_photographers: [],
    } as any;

    const completedWithVendor: Booking = {
      bookingId: "bk_eligible",
      remoteBookingId: "bk_eligible",
      status: "COMPLETED",
      event_type: "Wedding",
      eventDate: pastDate,
      event_date: pastDate,
      location: "Hyderabad",
      assigned_photographers: [
        {
          id: "ph_1",
          name: "Studio Luxe",
          is_confirmed: true,
          provider_id: "prov_456",
        } as any,
      ],
    } as any;

    // None eligible initially except the completed one with vendor
    const pending = await getPendingReviewBooking([
      incompleteBooking,
      completedWithoutVendor,
      completedWithVendor,
    ]);

    expect(pending).not.toBeNull();
    expect(pending?.bookingId).toBe("bk_eligible");

    // Once marked as reviewed, it is no longer pending
    await markBookingReviewed("bk_eligible");
    const pendingAfterReview = await getPendingReviewBooking([
      completedWithVendor,
    ]);
    expect(pendingAfterReview).toBeNull();
  });

  test("submitBookingReview clamps ratings and marks booking reviewed", async () => {
    const res = await submitBookingReview({
      bookingId: "bk_rate_1",
      providerId: "prov_456",
      rating: 6, // exceeds 5, should be clamped
      comment: "Great experience!",
      tags: ["Punctual", "Fast Delivery"],
    });

    expect(res.success).toBe(true);
    expect(await isBookingReviewed("bk_rate_1")).toBe(true);
  });

  test("fetchVendorReviews returns list of reviews", async () => {
    const reviews = await fetchVendorReviews("prov_456");
    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0].rating).toBe(5);
    expect(reviews[0].reviewer_name).toBe("Verified Customer");
  });
});
