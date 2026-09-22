/**
 * Single source of truth for notification copy.
 * Every notification the app fires (client-derived today, backend-derived once
 * Camartes adopts this contract — see docs/VENDOR_APP_BACKEND_CHANGES.md) should
 * come from a builder here so tone and accuracy stay consistent in one place.
 *
 * Deliberately absent: any "payment" notification type. Payments for Book A Shoot
 * are handled entirely outside the app, so isPaymentRelated() exists as a hard
 * filter to make sure one never reaches the UI even if a future backend change
 * accidentally sends one.
 */
import type { AppNotificationCategory, AppNotificationType } from "@/src/types/booking";

export type NotificationParams = {
  customerName?: string;
  firmName?: string;
  firmNames?: string[];
  firmCount?: number;
  eventName?: string;
  eventDate?: string;
  eventTime?: string;
  eventPlace?: string;
  messagePreview?: string;
  /** vendor_rejected only: why the slot went dead — an explicit decline vs. the
   * 1-hour accept window lapsing without a response. Defaults to "rejected". */
  reason?: "rejected" | "timed_out";
};

export type NotificationCopy = { title: string; body: string };

function firstName(name?: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

function joinNames(names: string[]): string {
  const clean = names.filter(Boolean);
  if (clean.length === 0) return "a few photography firms";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

function withPlace(eventDate?: string, eventPlace?: string): string {
  if (!eventDate) return "";
  return eventPlace ? `on ${eventDate} in ${eventPlace}` : `on ${eventDate}`;
}

function withDateTimePlace(eventDate?: string, eventTime?: string, eventPlace?: string): string {
  if (!eventDate) return "";
  const parts = [`on ${eventDate}`, eventTime ? `at ${eventTime}` : "", eventPlace ? `in ${eventPlace}` : ""].filter(Boolean);
  return parts.join(" ");
}

/** Deterministic-ish variant pick so the same event doesn't reshuffle copy on re-render. */
function pickVariant<T>(variants: T[], seed?: string): T {
  if (variants.length === 1) return variants[0];
  if (!seed) return variants[Math.floor(Math.random() * variants.length)];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return variants[hash % variants.length];
}

/** The list-screen tab ("All / Bookings & Matches / Messages / Reminders") a given type belongs under. */
export function categoryForType(type: AppNotificationType | undefined): AppNotificationCategory {
  if (type === "chat_message" || type === "message") return "message";
  if (type === "event_reminder" || type === "reminder") return "reminder";
  return "booking";
}

export function isPaymentRelated(input: { type?: string; title?: string; body?: string }): boolean {
  const haystack = `${input.type || ""} ${input.title || ""} ${input.body || ""}`.toLowerCase();
  return /\bpayment|razorpay|invoice|\bpaid\b|payout|refund/.test(haystack);
}

function buildWelcome(params: NotificationParams, seed?: string): NotificationCopy {
  const name = firstName(params.customerName);
  const variants: NotificationCopy[] = [
    {
      title: `Welcome, ${name}! 👋`,
      body: "Ready to book an event with the best photography & videography firms in the city?",
    },
    {
      title: `Hey ${name}, you made it! 🎬`,
      body: "Let's find you a photography firm that's almost as excited for your event as we are.",
    },
    {
      title: `${name}, the city's top firms are waiting 📸`,
      body: "Your perfect shoot is one tap away. Let's go firm-hunting!",
    },
  ];
  return pickVariant(variants, seed);
}

function buildRequestSent(params: NotificationParams): NotificationCopy {
  const who = params.firmCount === 1 && params.firmNames?.[0] ? params.firmNames[0] : `${params.firmCount ?? "a few"} photography firms`;
  return {
    title: "Request sent! 📮",
    body: `We've sent your ${params.eventName || "event"} request to ${who}. Tap to view their portfolios and see their work while you wait.`,
  };
}

function buildVendorAccepted(params: NotificationParams): NotificationCopy {
  const firm = params.firmName || "A photography firm";
  const when = withPlace(params.eventDate, params.eventPlace);
  return {
    title: `Yayy! ${firm} accepted your request! 🎉`,
    body: `${firm} accepted your request for ${params.eventName || "your event"}${when ? ` ${when}` : ""}. Tap to view their contact and social links — now you can chat with them to lock in your event.`,
  };
}

function buildVendorRejected(params: NotificationParams): NotificationCopy {
  const when = withPlace(params.eventDate, params.eventPlace);
  const didNotRespond = params.reason === "timed_out";

  if (params.firmName) {
    return didNotRespond
      ? {
          title: `${params.firmName} didn't respond in time`,
          body: `${params.firmName} didn't accept your request for ${params.eventName || "your event"}${when ? ` ${when}` : ""} within the response window, so we've moved on. Don't worry, we're on a mission to search new and better firms for you.`,
        }
      : {
          title: `${params.firmName} can't make it this time`,
          body: `${params.firmName} rejected your request for ${params.eventName || "your event"}${when ? ` ${when}` : ""}. Don't worry, we're on a mission to search new and better firms for you.`,
        };
  }
  return {
    title: "No luck with this batch of firms",
    body: `None of the firms could take your ${params.eventName || "event"}${when ? ` ${when}` : ""}. Don't worry, we're on a mission to search new and better firms for you.`,
  };
}

function buildNewSearchDispatched(params: NotificationParams): NotificationCopy {
  const name = firstName(params.customerName);

  // Manual "Search Again" retry (whole booking re-matched): names the firms.
  if (params.firmNames?.length) {
    const names = joinNames(params.firmNames);
    return {
      title: `Hey ${name}, we found more firms! 🔍`,
      body: `We sent a request to the newly searched firms: ${names}. Tap to view their portfolio and status.`,
    };
  }

  // Automatic per-slot replacement dispatch (a firm rejected or timed out).
  const when = withDateTimePlace(params.eventDate, params.eventTime, params.eventPlace);
  const count = params.firmCount ?? 1;
  const plural = count === 1 ? "firm" : "firms";
  return {
    title: `We found ${count} better ${plural} for you! ✨`,
    body: `Hey ${name}, we just found ${count} better-suited photography ${plural} for your ${params.eventName || "event"}${when ? ` ${when}` : ""} and sent them a request. Great photographers don't wait — and now, neither do you. Tap to view their portfolio and track the status of the request.`,
  };
}

function buildChatMessage(params: NotificationParams): NotificationCopy {
  const firm = params.firmName || "Your photography firm";
  const preview = (params.messagePreview || "").trim();
  return {
    title: `${firm} texted you 💬`,
    body: preview ? `"${preview}"` : `${firm} sent you a new message. Tap to reply.`,
  };
}

function buildEventReminder(params: NotificationParams): NotificationCopy {
  const name = firstName(params.customerName);
  const firm = params.firmName ? ` with ${params.firmName}` : "";
  const when = withPlace(params.eventDate, params.eventPlace);
  return {
    title: "Tomorrow's the big day! 📸",
    body: `Hey ${name}, get ready for your ${params.eventName || "event"}${when ? ` ${when}` : ""}${firm}. Time to shine!`,
  };
}

function buildDraftResumeNudge(params: NotificationParams): NotificationCopy {
  const name = firstName(params.customerName);
  return {
    title: `Still thinking it over, ${name}?`,
    body: `What's stopping you? The best photography firms are ready for your ${params.eventName || "event"}. Finish your booking to find them.`,
  };
}

function buildMarketingNudge(params: NotificationParams, seed?: string): NotificationCopy {
  const name = firstName(params.customerName);
  const variants: NotificationCopy[] = [
    {
      title: "Photography firms, assemble! 📷",
      body: "We found many best photography firms in the city near you. Book an event to lock them in before someone else does!",
    },
    {
      title: `Psst, ${name} 👀`,
      body: "The city's best photographers are just sitting here, waiting for your next event.",
    },
    {
      title: "No event booked yet?",
      body: `${name}, the photographers are getting restless. Let's fix that with a quick booking.`,
    },
  ];
  return pickVariant(variants, seed);
}

export function buildNotificationContent(
  type: AppNotificationType,
  params: NotificationParams = {},
  seed?: string,
): NotificationCopy {
  switch (type) {
    case "welcome":
      return buildWelcome(params, seed);
    case "request_sent":
      return buildRequestSent(params);
    case "vendor_accepted":
      return buildVendorAccepted(params);
    case "vendor_rejected":
      return buildVendorRejected(params);
    case "new_search_dispatched":
      return buildNewSearchDispatched(params);
    case "chat_message":
    case "message":
      return buildChatMessage(params);
    case "event_reminder":
    case "reminder":
      return buildEventReminder(params);
    case "draft_resume_nudge":
      return buildDraftResumeNudge(params);
    case "marketing_nudge":
      return buildMarketingNudge(params, seed);
    default:
      return { title: "Update on your booking", body: "Tap to see what's new." };
  }
}
