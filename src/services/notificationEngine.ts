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
  isCompletedBooking,
  isDraftBooking,
} from "@/src/domain/bookingFilters";
import { getDraftResumeRoute } from "@/src/domain/bookingRequest";
import { formatDateLong, formatTime12h } from "@/src/utils/format";
import { makeId } from "@/src/utils/id";
import { pushNotificationService } from "@/src/services/pushNotificationService";
import { hasFirmTimedOut, calculateBusinessSla } from "@/src/engine/businessHours";
import { isDemoAuthMode } from "@/src/config/authMode";

const STATE_KEY = "camartes-customer:notif_engine_state:v1";
/** Draft reminders: at most TWO per draft, ever — the first ~20h after the
 * customer stops editing, a different follow-up 3 days later — and never more
 * often than every 3 days across all drafts combined. */
const DRAFT_NUDGE_AFTER_HOURS = 20;
const DRAFT_FOLLOWUP_AFTER_DAYS = 3;
const DRAFT_MIN_GAP_DAYS = 3;
const DRAFT_MAX_AGE_DAYS = 14;
/** The single OS schedule slot shared by all drafts. */
const DRAFT_SCHEDULE_KEY = "draft_nudge";
const DAY_MS = 86_400_000;
const MARKETING_NUDGE_EVERY_DAYS = 3;
/**
 * Firms are given 60 active business minutes to accept/reject between 9:00 AM and 9:00 PM.
 * Requests placed overnight (after 9 PM) only count down starting from 9:00 AM the next morning.
 */
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
  firstSeenAt?: string;
  remindedKeys: string[];
  scheduledReminderKeys: string[];
  /** When the first draft reminder fired. */
  draftNudgedAt?: string;
  /** When the follow-up (second and last) draft reminder fired. */
  draftFollowupAt?: string;
  /** Legacy per-draft schedule flag from older app versions; ignored. */
  draftScheduled?: boolean;
  /** Set once an automatic replacement search comes back empty, so we don't
   * hammer the vendor catalog every tick while the pool is exhausted. */
  replacementExhaustedAt?: string;
  batchRejectionFired?: boolean;
  /** `${searchCycle}:${outcome}` already announced (one notice per 24h search). */
  searchOutcomeKeys?: string[];
  /** Last observed `${searchCycle}:${open | outcome}`; a notice needs a transition. */
  lastSearchState?: string;
};

type EngineState = {
  bookings: Record<string, BookingEngineState>;
  lastMarketingNudgeAt?: string;
  /** Last time ANY draft reminder fired (global spacing across drafts). */
  lastDraftNudgeAt?: string;
  /** `${bookingId}:${stage}:${dueIso}` currently scheduled in the OS slot. */
  draftScheduleSignature?: string;
  /** Per-draft OS schedules from older versions have been purged. */
  legacyDraftSchedulesPurged?: boolean;
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
    batchRejectionFired: false,
  };
}

function getBState(state: EngineState, booking: Booking): BookingEngineState {
  return (
    state.bookings[booking.bookingId] ||
    (booking.remoteBookingId ? state.bookings[booking.remoteBookingId] : undefined) ||
    emptyBookingState()
  );
}

function setBState(state: EngineState, booking: Booking, bstate: BookingEngineState): void {
  if (booking.bookingId) state.bookings[booking.bookingId] = bstate;
  if (booking.remoteBookingId) state.bookings[booking.remoteBookingId] = bstate;
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
    return {
      bookings: parsed.bookings || {},
      lastMarketingNudgeAt: parsed.lastMarketingNudgeAt,
      lastDraftNudgeAt: parsed.lastDraftNudgeAt,
      draftScheduleSignature: parsed.draftScheduleSignature,
      legacyDraftSchedulesPurged: parsed.legacyDraftSchedulesPurged,
    };
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

function isBookingInPast(booking: Booking): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const dates = (booking.days || []).map((d) => d?.eventDate).filter((d): d is string => Boolean(d));
  if (dates.length > 0) {
    return dates.every((d) => d < today);
  }
  return false;
}

/** A draft worth reminding about: the customer actually chose an event, it is
 * recent, and its dates are not already in the past. Empty "Book now"
 * placeholders are never nudged. */
function isNudgeableDraft(booking: Booking): boolean {
  if (isBookingInPast(booking)) return false;
  if (hoursSince(booking.updatedAt) > DRAFT_MAX_AGE_DAYS * 24) return false;
  return (booking.days || []).some((d) => (d.eventTypeIds || []).length > 0);
}

type DraftStage = { type: "draft_resume_nudge" | "draft_followup_nudge"; dueAt: number };

function nextDraftStage(booking: Booking, bstate: BookingEngineState, lastGlobalNudgeAt?: string): DraftStage | null {
  if (bstate.draftFollowupAt) return null; // both reminders already sent
  const globalEarliest = lastGlobalNudgeAt ? new Date(lastGlobalNudgeAt).getTime() + DRAFT_MIN_GAP_DAYS * DAY_MS : 0;
  if (!bstate.draftNudgedAt) {
    const base = new Date(booking.updatedAt).getTime() + DRAFT_NUDGE_AFTER_HOURS * 3_600_000;
    return { type: "draft_resume_nudge", dueAt: Math.max(base, globalEarliest) };
  }
  const base = new Date(bstate.draftNudgedAt).getTime() + DRAFT_FOLLOWUP_AFTER_DAYS * DAY_MS;
  return { type: "draft_followup_nudge", dueAt: Math.max(base, globalEarliest) };
}

/**
 * Draft reminders for ALL drafts, decided together:
 *  - only the most recently edited nudgeable draft is ever considered;
 *  - stage 1 (`draft_resume_nudge`) then stage 2 (`draft_followup_nudge`, different copy), then never again;
 *  - future reminders live in ONE OS schedule slot (fires with the app closed);
 *    due reminders are recorded in-app exactly once (the OS already showed them).
 */
async function processDrafts(drafts: Booking[], profile: CustomerProfile, state: EngineState): Promise<void> {
  if (!state.legacyDraftSchedulesPurged) {
    // Older versions scheduled one OS notification PER draft — purge them so
    // already-queued reminders stop firing after this update.
    try {
      await pushNotificationService.cancelScheduledWhere(
        (data, identifier) => data.type === "draft_resume_nudge" && identifier !== DRAFT_SCHEDULE_KEY,
        (key) => key.startsWith("draft_resume:"),
      );
      state.legacyDraftSchedulesPurged = true;
    } catch {
      // Best effort; retried next tick. Never blocks other notifications.
    }
  }

  const target = drafts
    .filter(isNudgeableDraft)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const bstate = target ? getBState(state, target) : null;
  const stage = target && bstate ? nextDraftStage(target, bstate, state.lastDraftNudgeAt) : null;

  if (!target || !bstate || !stage) {
    if (state.draftScheduleSignature) {
      await pushNotificationService.cancelScheduledNotification(DRAFT_SCHEDULE_KEY);
      state.draftScheduleSignature = undefined;
    }
    return;
  }

  const params: NotificationParams = { customerName: profile.name, eventName: getBookingEventTitle(target) };
  const data = { type: stage.type, booking_id: target.bookingId, resumeRoute: getDraftResumeRoute(target) };

  if (stage.dueAt <= Date.now()) {
    await fire(stage.type, params, { bookingId: target.bookingId, data });
    const now = nowIso();
    if (stage.type === "draft_resume_nudge") bstate.draftNudgedAt = now;
    else bstate.draftFollowupAt = now;
    state.lastDraftNudgeAt = now;
    setBState(state, target, bstate);
    await pushNotificationService.cancelScheduledNotification(DRAFT_SCHEDULE_KEY);
    state.draftScheduleSignature = undefined;
    return;
  }

  const signature = `${target.bookingId}:${stage.type}:${new Date(stage.dueAt).toISOString()}`;
  if (state.draftScheduleSignature !== signature) {
    const { title, body } = buildNotificationContent(stage.type, params);
    await pushNotificationService.scheduleAt(DRAFT_SCHEDULE_KEY, { title, body, data }, new Date(stage.dueAt));
    state.draftScheduleSignature = signature;
  }
}

/**
 * In-app notice when a 24-hour photographer search ends: "It's not you, it's
 * us" when nobody accepted, or "your photographers are ready" when some did.
 * One notice per search cycle; nothing for searches that ended before this
 * device first saw the booking.
 */
async function processSearchOutcome(booking: Booking, bstate: BookingEngineState): Promise<void> {
  if (booking.confirmed_provider_id || isBookingInPast(booking)) return;
  const effective = getEffectiveBookingStatus(booking);
  const acceptedCount = (booking.assigned_photographers || []).filter((f) => f.has_accepted && !isFirmRejected(f)).length;
  let type: "search_expired" | "search_window_closed" | null = null;
  if (effective === "EXPIRED" && String(booking.remoteStatus || "").toLowerCase() === "expired") type = "search_expired";
  else if (booking.searchWindowClosed && effective === "VENDOR_ACCEPTED" && acceptedCount > 0) type = "search_window_closed";

  const key = `${booking.searchCycle ?? 1}:${type ?? "open"}`;
  const previous = bstate.lastSearchState;
  bstate.lastSearchState = key;
  if (!type) return;
  const seen = bstate.searchOutcomeKeys || [];
  if (seen.includes(key)) return;
  bstate.searchOutcomeKeys = [...seen, key].slice(-20);
  // Only announce a search this device watched end (never history, e.g. right after an app update).
  if (!previous || previous === key) return;

  await fire(
    type,
    {
      eventName: getBookingEventTitle(booking),
      eventDate: formatDateLong(booking.days?.[0]?.eventDate ?? null),
      firmCount: acceptedCount,
      searchCycle: booking.searchCycle ?? 1,
    },
    { bookingId: booking.bookingId, data: { action: "search_again", search_cycle: booking.searchCycle ?? 1 } },
  );
}

async function processAcceptRejectDiff(booking: Booking, profile: CustomerProfile, bstate: BookingEngineState): Promise<boolean> {
  const effective = getEffectiveBookingStatus(booking);
  if (
    TERMINAL_STATUSES.has(effective) ||
    effective === "COMPLETED" ||
    isCompletedBooking(booking) ||
    isBookingInPast(booking)
  ) {
    return false;
  }

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
  }

  // If this booking has not been tracked on this device yet,
  // quietly seed the baseline state without firing historical notifications
  if (!bstate.firstSeenAt) {
    bstate.firstSeenAt = nowIso();
    bstate.knownFirmIds = Array.from(currentIds);
    bstate.acceptedFirmIds = firms.filter((f) => f.has_accepted).map((f) => firmId(f)!).filter(Boolean);
    bstate.rejectedFirmIds = firms.filter((f) => isFirmRejected(f)).map((f) => firmId(f)!).filter(Boolean);
    return false;
  }

  const isMultiCandidateDispatch = (booking.assigned_count ?? firms.length) > 1 || firms.length > 1;

  for (const f of firms) {
    const id = firmId(f);
    if (!id) continue;

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
    const assignedTime = f.assigned_at || bstate.firmFirstSeenAt[id] || booking.createdAt;
    const timedOut = !f.has_accepted && hasFirmTimedOut(assignedTime);
    if ((explicitlyDead || timedOut) && !bstate.rejectedFirmIds.includes(id)) {
      bstate.rejectedFirmIds.push(id);
      changed = true;

      // In the Rapido multi-dispatch model:
      // While awaiting responses, candidate firms are anonymous (Verified Studio #1..6).
      // We ONLY notify the customer of an individual rejection if that specific firm
      // had ALREADY ACCEPTED earlier (and now cancelled/rejected).
      // For single-firm direct bookings, notify customer of decline/timeout.
      const previouslyAccepted = bstate.acceptedFirmIds.includes(id);
      const shouldNotify = previouslyAccepted || !isMultiCandidateDispatch;
      if (shouldNotify) {
        await fire(
          "vendor_rejected",
          { firmName: previouslyAccepted || !isMultiCandidateDispatch ? f.name : undefined, eventName, eventDate, eventPlace, reason: explicitlyDead ? "rejected" : "timed_out" },
          { bookingId: booking.bookingId, firmId: id, firmName: f.name },
        );
      }
    }
  }

  // Firms that vanished from the assigned list entirely (e.g. replaced or rotated out)
  for (const id of bstate.knownFirmIds) {
    if (!id || currentIds.has(id) || bstate.rejectedFirmIds.includes(id)) continue;
    bstate.rejectedFirmIds.push(id);
    changed = true;

    // Only notify if this vanished firm was one the customer had already seen accept,
    // or if the single assigned firm vanished leaving 0 firms.
    const previouslyAccepted = bstate.acceptedFirmIds.includes(id);
    const shouldNotify = previouslyAccepted || (bstate.knownFirmIds.length === 1 && currentIds.size === 0);
    if (shouldNotify) {
      await fire(
        "vendor_rejected",
        { firmName: bstate.firmNames[id], eventName, eventDate, eventPlace },
        { bookingId: booking.bookingId, firmId: id, firmName: bstate.firmNames[id] },
      );
    }
  }

  // If ALL candidate firms have been exhausted (0 active firms remain and no one accepted):
  const hasAnyActiveOrAccepted = firms.some((f) => !isFirmRejected(f) || f.has_accepted);
  if (!hasAnyActiveOrAccepted && firms.length > 0 && bstate.acceptedFirmIds.length === 0 && !bstate.batchRejectionFired) {
    await fire(
      "vendor_rejected",
      { eventName, eventDate, eventPlace },
      { bookingId: booking.bookingId },
    );
    bstate.batchRejectionFired = true;
    changed = true;
  }

  bstate.knownFirmIds = Array.from(currentIds);
  return changed;
}

async function processEventReminder(booking: Booking, profile: CustomerProfile, bstate: BookingEngineState): Promise<boolean> {
  if (isBookingInPast(booking)) {
    return false;
  }
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
  const today = new Date().toISOString().slice(0, 10);

  for (const day of booking.days || []) {
    if (!day.eventDate || day.eventDate < today) {
      continue;
    }
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
      await fire("event_reminder", params, { bookingId: booking.bookingId, firmName, data: { dayId: day.dayId, eventDate: day.eventDate } });
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

  // When first evaluated (fresh login / newly joined), start the cooldown clock from NOW.
  // Never fire an idle marketing nudge immediately alongside the welcome notification!
  if (!state.lastMarketingNudgeAt) {
    state.lastMarketingNudgeAt = nowIso();
    return true;
  }

  const daysSinceLast = hoursSince(state.lastMarketingNudgeAt) / 24;
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
    if (isBookingInPast(b)) return false;
    return ENQUIRY_STATUSES.has(getEffectiveBookingStatus(b));
  });
  if (!candidates.length) return;

  const state = await loadState();
  let persisted = false;

  for (const booking of candidates) {
    const bstate = getBState(state, booking);

    if (bstate.replacementExhaustedAt && hoursSince(bstate.replacementExhaustedAt) < REPLACEMENT_RETRY_COOLDOWN_HOURS) {
      setBState(state, booking, bstate);
      persisted = true;
      continue;
    }

    const refreshed = (await bookingApi.refreshRemoteBookingStatus(booking.bookingId)) || booking;
    const effectiveStatus = getEffectiveBookingStatus(refreshed);
    if (TERMINAL_STATUSES.has(effectiveStatus) || !ENQUIRY_STATUSES.has(effectiveStatus)) {
      setBState(state, refreshed, bstate);
      setBState(state, booking, bstate);
      persisted = true;
      continue;
    }
    await processAcceptRejectDiff(refreshed, profile, bstate);

    const aliveCount = (refreshed.assigned_photographers || []).filter((f) => {
      const id = firmId(f);
      return id ? !bstate.rejectedFirmIds.includes(id) : false;
    }).length;
    const openSlots = Math.max(0, MAX_ACTIVE_FIRMS - aliveCount);

    if (openSlots > 0 && isDemoAuthMode()) {
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

    setBState(state, refreshed, bstate);
    setBState(state, booking, bstate);
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
      // Still worth an idle-nudge check even with zero bookings on record,
      // and any pending draft reminder must be cancelled (no drafts left).
      const state = await loadState();
      await processDrafts([], profile, state);
      await processMarketingNudge(bookings, profile, state);
      await saveState(state);
    }
    return;
  }

  const state = await loadState();

  // Separate drafts and non-drafts so we can throttle draft nudges globally
  const drafts: Booking[] = [];
  const nonDrafts: Booking[] = [];

  for (const booking of bookings) {
    if (isDraftBooking(booking)) {
      drafts.push(booking);
    } else {
      nonDrafts.push(booking);
    }
  }

  // Process non-draft bookings normally (accept/reject diffs, reminders)
  for (const booking of nonDrafts) {
    const bstate = getBState(state, booking);
    await processSearchOutcome(booking, bstate);
    await processAcceptRejectDiff(booking, profile, bstate);
    await processEventReminder(booking, profile, bstate);
    setBState(state, booking, bstate);
  }

  await processDrafts(drafts, profile, state);

  await processMarketingNudge(bookings, profile, state);
  await saveState(state);
}
