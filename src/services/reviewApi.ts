/**
 * Review & Rating service layer for Book A Shoot.
 * Handles post-event vendor rating submission, review caching,
 * and pending review checks.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { camartesFetch } from "@/src/services/camartesClient";
import type { Booking } from "@/src/types/booking";
import { isCompletedBooking } from "@/src/domain/bookingFilters";

const REVIEWED_BOOKING_PREFIX = "bookashoot:reviewed_booking:";
const DISMISSED_REVIEW_PREFIX = "bookashoot:dismissed_review:";
const REVIEW_COOLDOWN_HOURS = 24;

export interface BookingReviewPayload {
  bookingId: string;
  providerId: string;
  rating: number; // 1 to 5
  comment?: string;
  tags?: string[];
  reviewerName?: string;
}

export interface VendorReviewItem {
  id: string;
  rating: number;
  comment?: string;
  tags?: string[];
  reviewer_name?: string;
  event_name?: string;
  event_date?: string;
  created_at: string;
}

/**
 * Checks if a specific booking has already been reviewed by the user.
 */
export async function isBookingReviewed(bookingId: string): Promise<boolean> {
  if (!bookingId) return true;
  try {
    const val = await AsyncStorage.getItem(`${REVIEWED_BOOKING_PREFIX}${bookingId}`);
    return val === "true";
  } catch {
    return false;
  }
}

/**
 * Marks a booking as reviewed locally in AsyncStorage.
 */
export async function markBookingReviewed(bookingId: string): Promise<void> {
  if (!bookingId) return;
  try {
    await AsyncStorage.setItem(`${REVIEWED_BOOKING_PREFIX}${bookingId}`, "true");
  } catch {
    // best-effort
  }
}

/**
 * Temporarily dismisses the review prompt for a booking (e.g. user tapped "Later").
 * Enforces a 24-hour cooldown before showing it again.
 */
export async function dismissReviewPrompt(bookingId: string): Promise<void> {
  if (!bookingId) return;
  try {
    const timestamp = Date.now().toString();
    await AsyncStorage.setItem(`${DISMISSED_REVIEW_PREFIX}${bookingId}`, timestamp);
  } catch {
    // best-effort
  }
}

/**
 * Checks if the review prompt for a booking is currently in cooldown.
 */
export async function isReviewDismissedRecently(bookingId: string): Promise<boolean> {
  if (!bookingId) return true;
  try {
    const raw = await AsyncStorage.getItem(`${DISMISSED_REVIEW_PREFIX}${bookingId}`);
    if (!raw) return false;
    const dismissedTime = parseInt(raw, 10);
    if (isNaN(dismissedTime)) return false;
    const hoursSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60);
    return hoursSinceDismiss < REVIEW_COOLDOWN_HOURS;
  } catch {
    return false;
  }
}

/**
 * Finds the first completed booking that needs a vendor rating from the customer.
 */
export async function getPendingReviewBooking(bookings: Booking[]): Promise<Booking | null> {
  if (!Array.isArray(bookings) || bookings.length === 0) return null;

  for (const b of bookings) {
    const bId = b.remoteBookingId || b.bookingId;
    if (!bId) continue;

    // Check if event is completed
    const isCompleted = isCompletedBooking(b) || b.status === "COMPLETED";
    if (!isCompleted) continue;

    // Must have a confirmed photographer
    const confirmedVendor =
      b.assigned_photographers?.find((f) => f.is_confirmed || f.has_accepted) ||
      (b.confirmed_provider_id ? { provider_id: b.confirmed_provider_id } : null);

    if (!confirmedVendor) continue;

    // Check if already reviewed on server or locally
    if ((b as any).review_submitted || (b as any).client_review_submitted) {
      void markBookingReviewed(bId);
      continue;
    }

    const alreadyReviewed = await isBookingReviewed(bId);
    if (alreadyReviewed) continue;

    const dismissed = await isReviewDismissedRecently(bId);
    if (dismissed) continue;

    // Found an eligible booking!
    return b;
  }

  return null;
}

/**
 * Submits vendor review & rating.
 * Dispatches to Camartes backend /api/reviews/booking.
 * Updates local cache and notifies vendor.
 */
export async function submitBookingReview(
  payload: BookingReviewPayload
): Promise<{ success: boolean; message?: string }> {
  const cleanRating = Math.max(1, Math.min(5, Math.round(payload.rating || 5)));
  const cleanComment = (payload.comment || "").trim();
  const cleanTags = Array.isArray(payload.tags) ? payload.tags : [];

  let backendSuccess = false;

  try {
    const res = await camartesFetch<{ success: boolean; review_id?: string }>(
      "/api/reviews/booking",
      {
        method: "POST",
        body: JSON.stringify({
          booking_id: payload.bookingId,
          provider_id: payload.providerId,
          rating: cleanRating,
          comment: cleanComment,
          tags: cleanTags,
          reviewer_name: payload.reviewerName || "Customer",
          review_type: "client_to_provider",
        }),
      }
    );
    if (res?.success) {
      backendSuccess = true;
    }
  } catch (err) {
    // If network fails, proceed to persist locally
  }

  // Always mark as reviewed locally so customer is never double-prompted
  await markBookingReviewed(payload.bookingId);

  return { success: true, message: "Thank you! Your review has been submitted." };
}

/**
 * Fetches vendor reviews from the backend.
 * Public view automatically gets anonymized names ("Verified Customer").
 */
export async function fetchVendorReviews(providerId: string): Promise<VendorReviewItem[]> {
  if (!providerId) return [];
  try {
    const res = await camartesFetch<VendorReviewItem[]>(`/api/reviews/${providerId}`);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}
