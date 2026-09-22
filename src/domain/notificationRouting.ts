/**
 * Single source of truth for "where does tapping this notification go".
 * Replaces four previously-duplicated heuristics (native push tap, web
 * Notification.onclick, in-app toast press, notifications-list press) that
 * had each grown slightly different rules for the same decision.
 */
import type { AppNotification, Booking } from "@/src/types/booking";
import { getDraftResumeRoute } from "@/src/domain/bookingRequest";

export type ResolvedRoute = { pathname: string; params?: Record<string, string> };

const HOME_ROUTE: ResolvedRoute = { pathname: "/(tabs)" };
const NOTIFICATIONS_ROUTE: ResolvedRoute = { pathname: "/(tabs)/notifications" };
const BOOKINGS_ROUTE: ResolvedRoute = { pathname: "/(tabs)/bookings" };
const MESSAGES_ROUTE: ResolvedRoute = { pathname: "/(tabs)/messages" };

function str(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

function isChatType(n: AppNotification): boolean {
  if (n.type === "chat_message" || n.type === "message") return true;
  if (n.category === "message") return true;
  const title = (n.title || "").toLowerCase();
  const body = (n.body || "").toLowerCase();
  return (
    Boolean(n.userId || n.firmId) &&
    (title.includes("text") || title.includes("message") || title.includes("chat") || body.includes("texted") || body.includes("messaged"))
  );
}

function chatRoute(n: AppNotification): ResolvedRoute {
  const data = n.data || {};
  const userId =
    n.userId ||
    n.firmId ||
    str(data.sender_id) ||
    str(data.senderId) ||
    str(data.provider_id) ||
    str(data.providerId) ||
    str(data.firm_id) ||
    str(data.firmId);
  if (!userId) return MESSAGES_ROUTE;
  return {
    pathname: "/chat/[userId]",
    params: {
      userId,
      name: n.firmName || str(data.firm_name) || str(data.sender_name) || "Photography Partner",
      picture: str(data.picture) || str(data.profile_image) || "",
      accepted: "true",
    },
  };
}

function findBookingId(n: AppNotification): string | undefined {
  const data = n.data || {};
  return n.bookingId || str(data.booking_id) || str(data.bookingId) || str(data.request_id);
}

function bookingRoute(n: AppNotification, focusFirmId?: string): ResolvedRoute {
  const bookingId = findBookingId(n);
  if (!bookingId) return BOOKINGS_ROUTE;
  return {
    pathname: "/bookings/[bookingId]",
    params: focusFirmId ? { bookingId, focusFirmId } : { bookingId },
  };
}

function draftResumeRoute(n: AppNotification, bookings: Booking[]): ResolvedRoute {
  const data = n.data || {};
  const explicit = str(data.resumeRoute);
  if (explicit) return { pathname: explicit };

  const bookingId = findBookingId(n);
  const booking = bookingId ? bookings.find((b) => b.bookingId === bookingId || b.remoteBookingId === bookingId) : undefined;
  if (booking) return { pathname: getDraftResumeRoute(booking) };
  return BOOKINGS_ROUTE;
}

/**
 * Resolves the exact screen (and params) a tapped notification should open.
 * `bookings` is only needed to resolve draft-resume nudges without a
 * precomputed `data.resumeRoute`.
 */
export function resolveNotificationRoute(n: AppNotification, bookings: Booking[] = []): ResolvedRoute {
  if (isChatType(n)) return chatRoute(n);

  switch (n.type) {
    case "vendor_accepted": {
      const data = n.data || {};
      const focusFirmId = n.firmId || str(data.firm_id) || str(data.provider_id);
      return bookingRoute(n, focusFirmId);
    }
    case "vendor_rejected":
    case "request_sent":
    case "new_search_dispatched":
    case "booking":
    case "match":
    case "event_reminder":
    case "reminder":
      return bookingRoute(n);
    case "draft_resume_nudge":
      return draftResumeRoute(n, bookings);
    case "welcome":
    case "marketing_nudge":
      return HOME_ROUTE;
    default:
      break;
  }

  // Legacy/backend notifications with no strict type: fall back to booking if we have one.
  if (findBookingId(n)) return bookingRoute(n);
  return NOTIFICATIONS_ROUTE;
}
