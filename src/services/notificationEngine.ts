/**
 * Derives notifications from booking state the client already has, so the
 * experience is fully accurate even though Camartes (the backend that would
 * otherwise push these) lives in a separate repo. Called on every bookings
 * refresh (see AppProvider's poll loop). Idempotent: safe to call repeatedly,
 * every fire is gated by a persisted "already notified for this" flag.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AssignedPhotographer, Booking, CustomerProfile } from "@/src/types/booking";
import { addNotification } from "@/src/services/notificationsStore";
import * as bookingApi from "@/src/services/bookingApi";
import { buildNotificationContent, categoryForType, type NotificationParams } from "@/src/domain/notificationContent";
import {
  ENQUIRY_STATUSES,
  TERMINAL_STATUSES,
  getBookingEventTitle,
  getEffectiveBookingStatus,
  isDraftBooking,
} from "@/src/domain/bookingFilters";
import { getDraftResumeRoute } from "@/src/domain/bookingRequest";
import { formatDateLong, formatTime12h } from "@/src/utils/format";
import { makeId } from "@/src/utils/id";
import { pushNotificationService } from "@/src/services/pushNotificationService";

const STATE_KEY = "camartes-customer:notif_engine_state:v1";
const DRAFT_NUDGE_AFTER_HOURS = 20;
const MARKETING_NUDGE_EVERY_DAYS = 3;
/** Firms are given 1 hour to accept/reject on the vendor side before Camartes
 * locks the lead — the client enforces this same window independently, since
 * whether the backend reflects a lock back to us at all isn't guaranteed. */
const FIRM_RESPONSE_WINDOW_HOURS = 1;
const MAX_ACTIVE_FIRMS = 6;
const REPLACEMENT_RETRY_COOLDOWN_HOURS = 1;

type BookingEngineState = {
  knownFirmIds: string[];
  acceptedFirmIds: string[];
  rejectedFirmIds: string[];
  firmNames: Record<string, string>;
  /** When this client first observed each firm assigned — the clock the
   * 1-hour response window counts down from. */
  firmFirstSeenAt: Record<string, string>;
  remindedKeys: string[];
  scheduledReminderKeys: string[];
  draftNudgedAt?: string;
  draftScheduled?: boolean;
  /** Set once an automatic replacement search comes back empty, so we don't
   * hammer the vendor catalog every tick while the pool is exhausted. */
  replacementExhaustedAt?: string;
};

type EngineState = {
  bookings: Record<string, BookingEngineState>;
  lastMarketingNudgeAt?: string;
};

function emptyBookingState(): BookingEngineState {
  return {
    knownFirmIds: [],
    acceptedFirmIds: [],
    rejectedFirmIds: [],
    firmNames: {},
    firmFirstSeenAt: {},
    remindedKeys: [],
    scheduledReminderKeys: [],
  };
}

/** 9am local time, one day before the given yyyy-MM-dd event date. */
function dayBeforeAt9am(dateYmd: string | null | undefined): Date | null {
  if (!dateYmd || !dateYmd.trim()) return null;
  const parts = dateYmd.trim().split("-").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d - 1, 9, 0, 0, 0);
  return target;
}

async function loadState(): Promise<EngineState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return { bookings: {} };
    const parsed = JSON.parse(raw) as Partial<EngineState>;
    return { bookings: parsed.bookings || {}, lastMarketingNudgeAt: parsed.lastMarketingNudgeAt };
  } catch {
    return { bookings: {} };
  }
}

async function saveState(state: EngineState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // best-effort persistence only
  }
}

function firmId(firm: AssignedPhotographer): string | undefined {
  return firm.provider_id || firm.id || (firm as any).firm_id || (firm as any).user_id || undefined;
}

function isFirmRejected(firm: AssignedPhotographer): boolean {
  if (firm.has_rejected || firm.is_rejected) return true;
  const status = String(firm.status || "").toUpperCase();
  return status === "REJECTED" || status === "TIMED_OUT" || status === "EXPIRED";
}

function isTomorrow(dateYmd: string | null | undefined): boolean {
  if (!dateYmd || !dateYmd.trim()) return false;
  const parts = dateYmd.trim().split("-").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return target.getTime() === tomorrow.getTime();
}

function nowIso(): string {
  return new Date(Date.now()).toISOString();
}

function hoursSince(iso: string | undefined): number {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / 3_600_000;
}

async function fire(
  type: NonNullable<Parameters<typeof buildNotificationContent>[0]>,
  params: NotificationParams,
  extra: { bookingId?: string; firmId?: string; firmName?: string; data?: Record<string, unknown> },
): Promise<void> {
  const { title, body } = buildNotificationContent(type, params, extra.bookingId ? `${extra.bookingId}:${extra.firmId || ""}` : undefined);
  await addNotification({
    id: makeId("ntf"),
    title,
    body,
    type,
    category: categoryForType(type),
    createdAt: nowIso(),
    read: false,
    bookingId: extra.bookingId,
    firmId: extra.firmId,
    firmName: extra.firmName,
    data: extra.data,
  });
}

function eventPlaceOf(booking: Booking): string | undefined {
  const loc = booking.days?.[0]?.location;
  return loc?.formattedAddress || loc?.city || undefined;
}

async function processDraft(booking: Booking, profile: CustomerProfile, bstate: BookingEngineState): Promise<boolean> {
  if (bstate.draftNudgedAt) return false;

  const scheduleKey = `draft_resume:${booking.bookingId}`;
  const params: NotificationParams = { customerName: profile.name, eventName: getBookingEventTitle(booking) };
  const resumeRoute = getDraftResumeRoute(booking);

  if (hoursSince(booking.updatedAt) < DRAFT_NUDGE_AFTER_HOURS) {
    if (!bstate.draftScheduled) {
      const { title, body } = buildNotificationContent("draft_resume_nudge", params);
      const when = new Date(new Date(booking.updatedAt).getTime() + DRAFT_NUDGE_AFTER_HOURS * 3_600_000);
      await pushNotificationService.scheduleAt(scheduleKey, { title, body, data: { type: "draft_resume_nudge", resumeRoute } }, when);
      bstate.draftScheduled = true;
      return true;
    }
    return false;
  }

  await fire("draft_resume_nudge", params, { bookingId: booking.bookingId, data: { resumeRoute } });
  bstate.draftNudgedAt = nowIso();
  await pushNotificationService.cancelScheduledNotification(scheduleKey);
  return true;
}

async function processAcceptRejectDiff(booking: Booking, profile: CustomerProfile, bstate: BookingEngineState): Promise<boolean> {
  let changed = false;
  const firms = booking.assigned_photographers || [];
  const currentIds = new Set<string>();
  const eventName = getBookingEventTitle(booking);
  const eventDate = formatDateLong(booking.days?.[0]?.eventDate ?? null);
  const eventPlace = eventPlaceOf(booking);

  for (const f of firms) {
    const id = firmId(f);
    if (!id) continue;
    currentIds.add(id);
    bstate.firmNames[id] = f.name;
    if (!bstate.firmFirstSeenAt[id]) bstate.firmFirstSeenAt[id] = nowIso();

    if (f.has_accepted && !bstate.acceptedFirmIds.includes(id)) {
      await fire(
        "vendor_accepted",
        { firmName: f.name, eventName, eventDate, eventPlace },
        { bookingId: booking.bookingId, firmId: id, firmName: f.name, data: { firm_id: id } },
      );
      bstate.acceptedFirmIds.push(id);
      changed = true;
    }

    const explicitlyDead = isFirmRejected(f);
    const timedOut = !f.has_accepted && hoursSince(bstate.firmFirstSeenAt[id]) >= FIRM_RESPONSE_WINDOW_HOURS;
    if ((explicitlyDead || timedOut) && !bstate.rejectedFirmIds.includes(id) && !bstate.acceptedFirmIds.includes(id)) {
      await fire(
        "vendor_rejected",
        { firmName: f.name, eventName, eventDate, eventPlace, reason: explicitlyDead ? "rejected" : "timed_out" },
        { bookingId: booking.bookingId, firmId: id, firmName: f.name },
      );
      bstate.rejectedFirmIds.push(id);
      changed = true;
    }
  }

  // Firms that vanished from the assigned list entirely without an explicit
  // rejected flag (backend removes them once the lead moves on) still count
  // as a rejection the customer should hear about.
  for (const id of bstate.knownFirmIds) {
    if (!id || currentIds.has(id) || bstate.acceptedFirmIds.includes(id) || bstate.rejectedFirmIds.includes(id)) continue;
    await fire(
      "vendor_rejected",
      { firmName: bstate.firmNames[id], eventName, eventDate, eventPlace },
      { bookingId: booking.bookingId, firmId: id, firmName: bstate.firmNames[id] },
    );
    bstate.rejectedFirmIds.push(id);
    changed = true;
  }

  bstate.knownFirmIds = Array.from(currentIds);
  return changed;
}

async function processEventReminder(booking: Booking, profile: CustomerProfile, bstate: BookingEngineState): Promise<boolean> {
  const effective = getEffectiveBookingStatus(booking);
  const isConfirmed = effective === "CUSTOMER_CONFIRMED" || effective === "CONFIRMED" || effective === "IN_PROGRESS";
  if (!isConfirmed) {
    // Booking left the confirmed state (cancelled/rejected/completed) — any pending schedule is now stale.
    for (const day of booking.days || []) {
      await pushNotificationService.cancelScheduledNotification(`reminder:${booking.bookingId}:${day.dayId}`);
    }
    return false;
  }

  let changed = false;
  const firmName = booking.assigned_photographers?.find((f) => f.is_confirmed)?.name;
  const eventName = getBookingEventTitle(booking);
  const eventPlace = eventPlaceOf(booking);

  for (const day of booking.days || []) {
    const scheduleKey = `reminder:${booking.bookingId}:${day.dayId}`;
    const key = `reminder:${day.dayId}:${day.eventDate}`;
    const params: NotificationParams = {
      customerName: profile.name,
      firmName,
      eventName,
      eventDate: formatDateLong(day.eventDate),
      eventTime: formatTime12h(day.startTime),
      eventPlace,
    };

    if (isTomorrow(day.eventDate) && !bstate.remindedKeys.includes(key)) {
      await fire("event_reminder", params, { bookingId: booking.bookingId, firmName });
      bstate.remindedKeys.push(key);
      await pushNotificationService.cancelScheduledNotification(scheduleKey);
      changed = true;
      continue;
    }

    if (!bstate.scheduledReminderKeys.includes(scheduleKey)) {
      const when = dayBeforeAt9am(day.eventDate);
      if (when) {
        const { title, body } = buildNotificationContent("event_reminder", params);
        await pushNotificationService.scheduleAt(scheduleKey, { title, body, data: { type: "event_reminder", booking_id: booking.bookingId } }, when);
        bstate.scheduledReminderKeys.push(scheduleKey);
        changed = true;
      }
    }
  }
  return changed;
}

const MARKETING_NUDGE_SCHEDULE_KEY = "marketing_nudge";

async function processMarketingNudge(bookings: Booking[], profile: CustomerProfile, state: EngineState): Promise<boolean> {
  const hasActiveBooking = bookings.some((b) => {
    if (isDraftBooking(b)) return false;
    const effective = getEffectiveBookingStatus(b);
    return !TERMINAL_STATUSES.has(effective) && effective !== "COMPLETED";
  });

  if (hasActiveBooking) {
    await pushNotificationService.cancelScheduledNotification(MARKETING_NUDGE_SCHEDULE_KEY);
    return false;
  }

  if (!(await pushNotificationService.hasScheduled(MARKETING_NUDGE_SCHEDULE_KEY))) {
    const { title, body } = buildNotificationContent("marketing_nudge", { customerName: profile.name });
    await pushNotificationService.scheduleRepeatingEveryDays(
      MARKETING_NUDGE_SCHEDULE_KEY,
      { title, body, data: { type: "marketing_nudge" } },
      MARKETING_NUDGE_EVERY_DAYS,
    );
  }

  const daysSinceLast = state.lastMarketingNudgeAt ? hoursSince(state.lastMarketingNudgeAt) / 24 : Infinity;
  if (daysSinceLast < MARKETING_NUDGE_EVERY_DAYS) return false;

  await fire("marketing_nudge", { customerName: profile.name }, {});
  state.lastMarketingNudgeAt = nowIso();
  return true;
}

/**
 * Slower-cadence companion to `runEngineTick`: refreshes each pre-confirmation
 * booking (wave-aware, via `bookingApi.refreshRemoteBookingStatus`), re-runs
 * the same accept/reject/timeout detection against the freshest data, and — if
 * that leaves fewer than 6 active firms — automatically finds and dispatches
 * replacements via `bookingApi.dispatchReplacementFirms`, no customer action
 * required. Deliberately separate from and slower than `runEngineTick` (which
 * only diffs whatever bookings were already bulk-refreshed) since this one
 * makes its own network calls per booking — a per-booking cooldown keeps a
 * fully exhausted vendor pool from being retried every cycle.
 */
export async function runReplacementTick(bookings: Booking[], profile: CustomerProfile | null): Promise<void> {
  if (replacementTickInFlight) return;
  replacementTickInFlight = true;
  try {
    await runReplacementTickInner(bookings, profile);
  } finally {
    replacementTickInFlight = false;
  }
}

let replacementTickInFlight = false;

async function runReplacementTickInner(bookings: Booking[], profile: CustomerProfile | null): Promise<void> {
  if (!profile) return;
  const candidates = bookings.filter((b) => {
    if (isDraftBooking(b) || !b.remoteBookingId) return false;
    return ENQUIRY_STATUSES.has(getEffectiveBookingStatus(b));
  });
  if (!candidates.length) return;

  const state = await loadState();
  let persisted = false;

  for (const booking of candidates) {
    const bstate = state.bookings[booking.bookingId] || emptyBookingState();

    if (bstate.replacementExhaustedAt && hoursSince(bstate.replacementExhaustedAt) < REPLACEMENT_RETRY_COOLDOWN_HOURS) {
      state.bookings[booking.bookingId] = bstate;
      persisted = true;
      continue;
    }

    const refreshed = (await bookingApi.refreshRemoteBookingStatus(booking.bookingId)) || booking;
    await processAcceptRejectDiff(refreshed, profile, bstate);

    const aliveCount = (refreshed.assigned_photographers || []).filter((f) => {
      const id = firmId(f);
      return id ? !bstate.rejectedFirmIds.includes(id) : false;
    }).length;
    const openSlots = Math.max(0, MAX_ACTIVE_FIRMS - aliveCount);

    if (openSlots > 0) {
      const { booking: dispatched, addedFirmNames } = await bookingApi.dispatchReplacementFirms(refreshed, openSlots);
      if (addedFirmNames.length > 0) {
        bstate.replacementExhaustedAt = undefined;
        for (const f of dispatched.assigned_photographers || []) {
          const id = firmId(f);
          if (!id) continue;
          if (!bstate.knownFirmIds.includes(id)) bstate.knownFirmIds.push(id);
          bstate.firmNames[id] = f.name;
          if (!bstate.firmFirstSeenAt[id]) bstate.firmFirstSeenAt[id] = nowIso();
        }
        await fire(
          "new_search_dispatched",
          {
            customerName: profile.name,
            eventName: getBookingEventTitle(dispatched),
            eventDate: formatDateLong(dispatched.days?.[0]?.eventDate ?? null),
            eventTime: formatTime12h(dispatched.days?.[0]?.startTime ?? null),
            eventPlace: eventPlaceOf(dispatched),
            firmCount: addedFirmNames.length,
          },
          { bookingId: dispatched.bookingId },
        );
      } else {
        bstate.replacementExhaustedAt = nowIso();
      }
    }

    state.bookings[booking.bookingId] = bstate;
    persisted = true;
  }

  if (persisted) await saveState(state);
}

let tickInFlight = false;

export async function runEngineTick(bookings: Booking[], profile: CustomerProfile | null): Promise<void> {
  if (tickInFlight) return;
  tickInFlight = true;
  try {
    await runEngineTickInner(bookings, profile);
  } finally {
    tickInFlight = false;
  }
}

async function runEngineTickInner(bookings: Booking[], profile: CustomerProfile | null): Promise<void> {
  if (!profile || !bookings.length) {
    if (profile) {
      // Still worth an idle-nudge check even with zero bookings on record.
      const state = await loadState();
      await processMarketingNudge(bookings, profile, state);
      await saveState(state);
    }
    return;
  }

  const state = await loadState();

  for (const booking of bookings) {
    const bstate = state.bookings[booking.bookingId] || emptyBookingState();

    if (isDraftBooking(booking)) {
      await processDraft(booking, profile, bstate);
    } else {
      await processAcceptRejectDiff(booking, profile, bstate);
      await processEventReminder(booking, profile, bstate);
    }

    // Bookkeeping (knownFirmIds, scheduledReminderKeys, ...) is refreshed on
    // every tick regardless of whether a notification fired this time, so the
    // full state is always persisted below rather than gated on a "changed"
    // flag — otherwise a quiet tick would drop the diff baseline entirely.
    state.bookings[booking.bookingId] = bstate;
  }

  await processMarketingNudge(bookings, profile, state);
  await saveState(state);
}
