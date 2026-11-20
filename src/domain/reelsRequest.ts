/**
 * CamReels requests.
 *
 * A CamReels request is a normal Book A Shoot booking (one day, videography)
 * with a `reels` block, so it shares the request lifecycle (dispatch, 1-hour
 * replacement, search again, accept, confirm) with event bookings. What
 * differs:
 *  - fixed pricing (reels, or CamReels Monthly), re-computed by the backend;
 *  - the backend (not the app) picks who receives it: freelance videographers
 *    and videography firms that opted in to CamReels, never photographers;
 *  - videographers see a clean "CamReels Shoot" request, with the customer's
 *    contact details hidden until they accept.
 */
import type { Booking, CustomerProfile, EventLocation, ReelsRequest } from "@/src/types/booking";
import type { CamartesBookingRequest } from "@/src/domain/bookingRequest";
import { createEmptyBooking } from "@/src/domain/defaults";
import { citySpellings, resolveProviderSearchTarget } from "@/src/domain/cityResolution";
import { formatTime12h } from "@/src/utils/format";
import {
  REELS_EVENT_LABEL,
  REELS_EVENT_TYPE_ID,
  REELS_MAX_COUNT,
  REELS_MIN_COUNT,
  REELS_MONTHLY,
  REELS_SEGMENT,
  inr,
  normalizeReelsPlan,
  reelsContentLabel,
  reelsPrice,
  reelsSettingLabel,
  type ReelsEditing,
  type ReelsPlanId,
} from "@/src/constants/reels";

export type ReelsBookingInput = {
  plan: ReelsPlanId;
  contentType: string;
  reelCount: number;
  editing: ReelsEditing;
  setting: string;
  durationHours: number;
  notes: string;
  eventDate: string; // yyyy-MM-dd (first shoot date for Monthly)
  startTime: string; // HH:mm
  location: EventLocation;
};

export function isReelsBooking(booking: Pick<Booking, "reels"> | null | undefined): boolean {
  return Boolean(booking?.reels);
}

/** "HH:mm" + hours → end "HH:mm", and whether it passes midnight. */
export function addHours(startTime: string, hours: number): { endTime: string; overnight: boolean } {
  const [h, m] = startTime.split(":").map((n) => parseInt(n, 10) || 0);
  const total = h * 60 + m + Math.round(hours * 60);
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const mm = String(wrapped % 60).padStart(2, "0");
  return { endTime: `${hh}:${mm}`, overnight: total >= 1440 };
}

export type ReelsInputIssue = { field: keyof ReelsBookingInput; message: string };

export function validateReelsInput(input: Partial<ReelsBookingInput>, today: string): ReelsInputIssue[] {
  const issues: ReelsInputIssue[] = [];
  if (!input.contentType) issues.push({ field: "contentType", message: "Choose what the reels are for." });
  if (normalizeReelsPlan(input.plan) === "reels") {
    const count = input.reelCount ?? 0;
    if (count < REELS_MIN_COUNT || count > REELS_MAX_COUNT) {
      issues.push({ field: "reelCount", message: `Choose ${REELS_MIN_COUNT} to ${REELS_MAX_COUNT} reels.` });
    }
  }
  if (!input.eventDate) issues.push({ field: "eventDate", message: "Pick a shoot date." });
  else if (input.eventDate < today) issues.push({ field: "eventDate", message: "Pick a date that is today or later." });
  if (!input.startTime) issues.push({ field: "startTime", message: "Pick a start time." });
  if (!input.location?.formattedAddress?.trim()) issues.push({ field: "location", message: "Add the shoot location." });
  else if (!input.location.city?.trim()) issues.push({ field: "location", message: "Pick a location that includes the city." });
  if (!input.setting) issues.push({ field: "setting", message: "Choose where the shoot happens." });
  return issues;
}

/** Fixed price for a request. */
export function reelsTotal(plan: ReelsPlanId, count: number, editing: ReelsEditing): number {
  return plan === "monthly" ? REELS_MONTHLY.price : reelsPrice(count, editing);
}

/** A complete, ready-to-send CamReels booking. */
export function buildReelsBooking(customerId: string, input: ReelsBookingInput): Booking {
  const base = createEmptyBooking(customerId);
  const plan = normalizeReelsPlan(input.plan);
  const monthly = plan === "monthly";
  const { endTime, overnight } = addHours(input.startTime, input.durationHours);
  // Monthly is unlimited (count 0) and always edited.
  const count = monthly ? 0 : Math.max(REELS_MIN_COUNT, Math.min(REELS_MAX_COUNT, Math.round(input.reelCount)));
  const editing: ReelsEditing = monthly ? "edited" : input.editing;
  const total = reelsTotal(plan, count, editing);
  const reels: ReelsRequest = {
    plan,
    contentType: input.contentType,
    reelCount: count,
    editing,
    setting: input.setting,
    durationHours: input.durationHours,
    notes: input.notes.trim().slice(0, 600),
    quoteMin: total,
    quoteMax: total,
  };
  const day = {
    ...base.days[0],
    eventDate: input.eventDate,
    eventTypeIds: [REELS_EVENT_TYPE_ID],
    location: input.location,
    startTime: input.startTime,
    endTime,
    overnight,
    // One professional videographer shoots the reels.
    videography: { traditional: false, traditionalCount: 1, candid: true, candidCount: 1 },
  };
  return {
    ...base,
    days: [day],
    reels,
    budget: total,
    selectedPackage: null,
    estimatedAmount: total,
    status: "SUBMITTED",
    draftCompletionPct: 100,
  };
}

/** Customer-facing package name, e.g. "3 edited reels" or "CamReels Monthly". */
export function reelsPackageLabel(reels: ReelsRequest): string {
  if (normalizeReelsPlan(reels.plan) === "monthly") return REELS_MONTHLY.name;
  const kind = reels.editing === "edited" ? "edited" : "raw";
  return `${reels.reelCount} ${kind} reel${reels.reelCount > 1 ? "s" : ""}`;
}

/** Deliverables line videographers see, e.g. "3 Edited Reels". */
export function reelsDeliverableLine(reels: ReelsRequest): string {
  if (normalizeReelsPlan(reels.plan) === "monthly") return "Unlimited Edited Reels for 30 Days (same videographer)";
  const plural = reels.reelCount > 1 ? "s" : "";
  return reels.editing === "edited"
    ? `${reels.reelCount} Edited Reel${plural}`
    : `${reels.reelCount} Reel${plural}, Raw Footage Only (no editing)`;
}

/**
 * POST /api/bookings body for a CamReels request. The Camartes backend
 * recognises `segment: "camreels"`, re-computes the price from
 * planId / editingId / reelCount, sets the lead fee (₹200, or ₹500 for
 * Monthly), and picks up to 6 eligible videographers in the city itself.
 */
export function toCamartesReelsRequest(
  booking: Booking,
  profile: CustomerProfile | null,
  assignedIds: string[],
  primaryId: string | null,
): CamartesBookingRequest {
  const reels = booking.reels as ReelsRequest;
  const day = booking.days[0];
  if (!day?.eventDate || !day.startTime) throw new Error("Pick a shoot date and start time before sending.");
  const target = resolveProviderSearchTarget(booking);
  const eventCity = (day.location.city || "").trim();
  const city = target.city || eventCity;
  if (!city) throw new Error("Add the shoot location (with a city) before sending.");

  const monthly = normalizeReelsPlan(reels.plan) === "monthly";
  const content = reelsContentLabel(reels.contentType);
  const setting = reelsSettingLabel(reels.setting);
  const venueAddress = day.location.formattedAddress || city;
  const start = formatTime12h(day.startTime);
  const end = day.endTime ? formatTime12h(day.endTime) : null;
  const deliverable = reelsDeliverableLine(reels);
  const price = inr(reels.quoteMax);
  const packageLabel = `${reelsPackageLabel(reels)} · ${price}`;
  const services = [
    `CamReels: ${content}`,
    monthly ? "CamReels Monthly: unlimited reels, 30 days, same videographer" : deliverable,
    "Professional Videographer × 1",
    "DSLR / Mirrorless Camera + Gimbal",
    `Shoot Setting: ${setting}`,
    monthly ? "Shoot Days: planned with the customer" : `Shoot Duration: ${reels.durationHours} hour${reels.durationHours > 1 ? "s" : ""}`,
  ];

  const message = [
    "========================================",
    "      BOOK A SHOOT — CAMREELS REQUEST",
    "========================================",
    `Package: ${monthly ? `${REELS_MONTHLY.name} (unlimited edited reels, 30 days, same videographer)` : deliverable}`,
    `Content: ${content}`,
    `Price: ${price}`,
    "Equipment: DSLR / mirrorless camera with gimbal (no phones)",
    monthly
      ? `First shoot: ${day.eventDate}, ${start} (30 days from this date)`
      : `Date & Time: ${day.eventDate}, ${start}${end ? ` – ${end}` : ""} (${reels.durationHours} hr)`,
    `Setting: ${setting}`,
    `Location: ${venueAddress}`,
    reels.notes ? `Creative Notes: ${reels.notes}` : null,
    "========================================",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    client_booking_id: booking.bookingId,
    booking_id: booking.bookingId,
    assigned_provider_ids: assignedIds,
    provider_id: primaryId,
    provider_profile_id: primaryId,
    lead_broadcast: true,
    service_type: "photography_firm",
    event_type: REELS_EVENT_LABEL,
    event_date: day.eventDate,
    event_time: start,
    end_date: day.overnight ? null : day.eventDate,
    duration_hours: reels.durationHours,
    venue_address: venueAddress,
    message,
    client_name: profile?.name || null,
    client_phone: profile?.mobile || null,
    client_email: profile?.email || null,
    budget: String(reels.quoteMax),
    deliverables: [deliverable],
    expected_delivery_date: null,
    location_preference: {
      type: "near_event",
      mode: "event_location",
      city,
      formattedAddress: venueAddress,
      cityAliases: citySpellings(city),
    },
    lead_details: {
      source: "book_a_shoot",
      channel: "book_a_shoot",
      header: "Book A Shoot",
      eventType: REELS_EVENT_LABEL,
      city,
      dispatchCity: city,
      dispatchCityAliases: citySpellings(city),
      eventCity: eventCity || city,
      providerLocationMode: "event_location",
      venueAddress,
      packageTier: packageLabel,
      services,
      addOns: [],
      deliverables: [deliverable],
      album: null,
      expectedDeliveryDate: null,
      budget: reels.quoteMax,
      clientName: profile?.name || "Customer",
      clientContactMasked: true,
      days: [
        {
          dayOrder: 1,
          eventType: `${REELS_EVENT_LABEL} · ${content}`,
          eventDate: day.eventDate,
          startTime: start,
          endTime: end,
          overnight: day.overnight,
          venueAddress,
          city: eventCity || city,
          services,
          photography: day.photography,
          videography: day.videography,
          aerial: day.aerial,
          ledWall: day.ledWall,
          webLive: day.webLive,
        },
      ],
      segment: REELS_SEGMENT,
      reels: {
        // Machine fields: the backend prices from these.
        planId: monthly ? "monthly" : "reels",
        editingId: reels.editing,
        reelCount: reels.reelCount,
        // Display fields for videographers.
        package: reelsPackageLabel(reels),
        contentType: content,
        editing: reels.editing === "edited" ? "Edited" : "Raw footage only",
        price: reels.quoteMax,
        setting,
        durationHours: reels.durationHours,
        equipment: "DSLR / mirrorless camera with gimbal",
        notes: reels.notes || null,
      },
    },
  };
}
