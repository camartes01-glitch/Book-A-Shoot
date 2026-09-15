import type { Booking, BookingStatus } from "@/src/types/booking";
import { eventTypeLabel, eventTypeLabels } from "@/src/constants/eventCategories";

export type BookingFilterTab = "all" | "enquiries" | "upcoming" | "completed" | "drafts";

/**
 * ENQUIRIES / BOOKED REQUESTS (Pre-Customer Confirmation):
 * Booked requests where photographers are being matched,
 * requests are sent to candidate firms, or vendor responses are pending.
 */
export const ENQUIRY_STATUSES = new Set<BookingStatus>([
  "SUBMITTED",
  "MATCHING",
  "VENDOR_SELECTED",
  "REQUEST_SENT",
  "VENDOR_ACCEPTED",
]);

/**
 * UPCOMING SHOOTS (Post-Customer Confirmation):
 * After customer confirms the booking / photographer (CUSTOMER_CONFIRMED, PAYMENT_PENDING, CONFIRMED, IN_PROGRESS).
 */
export const UPCOMING_STATUSES = new Set<BookingStatus>([
  "CUSTOMER_CONFIRMED",
  "PAYMENT_PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
]);

/**
 * Terminal statuses:
 * Cancelled or rejected bookings that are no longer active.
 */
export const TERMINAL_STATUSES = new Set<BookingStatus>([
  "CUSTOMER_CANCELLED",
  "VENDOR_CANCELLED",
  "VENDOR_REJECTED",
  "EXPIRED",
]);

export function getTodayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getBookingLatestEventDate(booking: Booking): string | null {
  const dates = (booking.days || [])
    .map((d) => d.eventDate)
    .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

export function parseDateTimeMs(dateStr: string | null | undefined, timeStr: string | null | undefined, isEnd = false): number | null {
  if (!dateStr || !dateStr.trim()) return null;
  const cleanDate = dateStr.trim();
  let hour = isEnd ? 23 : 0;
  let minute = isEnd ? 59 : 0;

  if (timeStr && timeStr.trim()) {
    const rawTime = timeStr.trim();
    const match = rawTime.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      hour = h;
      minute = m;
    }
  }

  const parts = cleanDate.split("-").map((num) => parseInt(num, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, hour, minute, isEnd ? 59 : 0).getTime();
}

/**
 * Returns the true effective status of a booking based on customer action and event date/time.
 */
export function getEffectiveBookingStatus(booking: Booking): BookingStatus {
  if (TERMINAL_STATUSES.has(booking.status)) return booking.status;
  if (booking.status === "DRAFT" || !booking.remoteBookingId || Boolean(booking.bookingId?.startsWith("draft"))) {
    return "DRAFT";
  }

  // Strict Rule: A booking is post-customer-confirmation if confirmed_provider_id is present or status is explicitly confirmed
  const isCustomerConfirmed = Boolean(
    booking.confirmed_provider_id ||
    booking.status === "CONFIRMED" ||
    booking.status === "CUSTOMER_CONFIRMED" ||
    booking.status === "COMPLETED"
  );

  if (!isCustomerConfirmed) {
    // Customer has NOT confirmed a photographer yet
    const hasFirmAccepted = (booking.assigned_photographers || []).some((f) => f.has_accepted);
    if (hasFirmAccepted || booking.status === "VENDOR_ACCEPTED") {
      return "VENDOR_ACCEPTED";
    }
    if (booking.status === "REQUEST_SENT" || booking.status === "VENDOR_SELECTED") {
      return booking.status;
    }
    if (booking.status === "MATCHING") return "MATCHING";
    return "SUBMITTED";
  }

  // Customer HAS confirmed a photographer
  if (booking.status === "COMPLETED") return "COMPLETED";

  const now = Date.now();
  const days = booking.days || [];

  let earliestStartMs: number | null = null;
  let latestEndMs: number | null = null;

  for (const day of days) {
    if (day.eventDate) {
      const start = parseDateTimeMs(day.eventDate, day.startTime, false);
      const end = parseDateTimeMs(day.eventDate, day.endTime, true);
      if (start !== null && (earliestStartMs === null || start < earliestStartMs)) {
        earliestStartMs = start;
      }
      if (end !== null && (latestEndMs === null || end > latestEndMs)) {
        latestEndMs = end;
      }
    }
  }

  if (latestEndMs !== null && now >= latestEndMs) {
    return "COMPLETED";
  }
  if (earliestStartMs !== null && now >= earliestStartMs) {
    return "IN_PROGRESS";
  }
  return "CUSTOMER_CONFIRMED";
}

/**
 * Booked requests awaiting customer confirmation:
 * SUBMITTED, MATCHING, REQUEST_SENT, VENDOR_SELECTED, VENDOR_ACCEPTED.
 * Excludes all draft bookings.
 */
export function isEnquiryBooking(booking: Booking): boolean {
  if (isDraftBooking(booking)) return false;
  const effective = getEffectiveBookingStatus(booking);
  return ENQUIRY_STATUSES.has(effective);
}

/**
 * COMPLETED SHOOTS:
 * 1. Explicitly marked COMPLETED by backend/vendor.
 * 2. Shoots whose event date & end time have already passed.
 */
export function isCompletedBooking(booking: Booking): boolean {
  if (isDraftBooking(booking)) return false;
  const effective = getEffectiveBookingStatus(booking);
  return effective === "COMPLETED";
}

/**
 * UPCOMING SHOOTS:
 * Once the customer confirms it (CUSTOMER_CONFIRMED, IN_PROGRESS).
 * Excludes drafts and completed shoots.
 */
export function isUpcomingBooking(booking: Booking): boolean {
  if (isDraftBooking(booking)) return false;
  const effective = getEffectiveBookingStatus(booking);
  return effective === "CUSTOMER_CONFIRMED" || effective === "IN_PROGRESS";
}

/**
 * DRAFT BOOKINGS:
 * Local wizard bookings or bookings with status DRAFT that have not been submitted to backend yet.
 */
export function isDraftBooking(booking: Booking): boolean {
  if (booking.status === "DRAFT") return true;
  if (Boolean(booking.bookingId?.startsWith("draft"))) return true;
  if (!booking.remoteBookingId && !booking.bookingId?.startsWith("bk_")) return true;
  return false;
}

export function filterBookings(bookings: Booking[], tab: BookingFilterTab): Booking[] {
  switch (tab) {
    case "enquiries":
      return bookings.filter(isEnquiryBooking);
    case "upcoming":
      return bookings.filter(isUpcomingBooking);
    case "completed":
      return bookings.filter(isCompletedBooking);
    case "drafts":
      return bookings.filter(isDraftBooking);
    case "all":
    default:
      return bookings;
  }
}

/**
 * Extracts and formats the user-chosen event name for a booking.
 * Resolves eventTypeIds (e.g. ['wedding'] -> 'Wedding', ['baby_shoot'] -> 'Baby Shoot').
 */
export function getBookingEventTitle(booking: Booking): string {
  // 1. Explicit event name or event type on booking
  if (booking.eventName && booking.eventName.trim()) {
    return eventTypeLabel(booking.eventName.trim());
  }
  if (booking.eventType && booking.eventType.trim()) {
    return eventTypeLabel(booking.eventType.trim());
  }

  // 2. Check eventTypeIds across days
  const ids = Array.from(
    new Set((booking.days || []).flatMap((d) => d.eventTypeIds || []))
  ).filter(Boolean);

  if (ids.length > 0) {
    const labels = eventTypeLabels(ids);
    if (labels && labels.trim().length > 0) {
      return labels;
    }
  }

  // 3. Fallback based on selected services
  const firstDay = booking.days?.[0];
  if (firstDay) {
    const hasPhoto = firstDay.photography?.traditional || firstDay.photography?.candid;
    const hasVideo = firstDay.videography?.traditional || firstDay.videography?.candid;
    if (hasPhoto && hasVideo) return "Photo & Video Shoot";
    if (hasVideo) return "Videography Shoot";
    if (hasPhoto) return "Photography Shoot";
  }

  // 4. Default clean fallback - never show an ID as the title
  return booking.bookingId?.startsWith("draft") ? "Draft Booking" : "Shoot Booking";
}

/**
 * Evaluates whether a booking qualifies for a "Search Again" retry option.
 * Applies when no photography firms were available, request expired, rejected, cancelled,
 * or no candidate firms could be matched.
 */
export function canSearchAgain(b: Booking): boolean {
  if (
    isCompletedBooking(b) ||
    isDraftBooking(b) ||
    b.status === "DRAFT" ||
    (typeof b.bookingId === "string" && b.bookingId.startsWith("draft"))
  ) {
    return false;
  }

  const status = getEffectiveBookingStatus(b);
  if (
    status === "EXPIRED" ||
    status === "VENDOR_REJECTED" ||
    status === "VENDOR_CANCELLED" ||
    status === "CUSTOMER_CANCELLED"
  ) {
    return true;
  }

  const msgLower = (b.firms_status_message || "").toLowerCase();
  if (
    msgLower.includes("no photography firms") ||
    msgLower.includes("no available") ||
    msgLower.includes("couldn't find") ||
    msgLower.includes("timed out") ||
    msgLower.includes("expired") ||
    msgLower.includes("rejected")
  ) {
    return true;
  }

  const assigned = b.assigned_photographers || [];
  if (
    assigned.length === 0 &&
    !["CUSTOMER_CONFIRMED", "CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(status)
  ) {
    return true;
  }

  return false;
}
