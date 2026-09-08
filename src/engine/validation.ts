/**
 * Business rule validation (spec section 38, "Important Validation Rules").
 *
 * Every rule here MUST also be enforced server-side once a real Camartes
 * booking API exists — see the warnings in `src/services/bookingApi.ts`.
 * These are pure functions so they can run identically on the client for
 * instant feedback and be ported 1:1 into a backend validator.
 */
import type { Booking, EventDay } from "@/src/types/booking";
import { ADMIN_LIMITS } from "@/src/constants/limits";
import { isBeforeDate, isEndAfterStart, isPastDate, latestDate } from "@/src/utils/dateTime";

export const CORE_SERVICE_REQUIRED_MESSAGE =
  "Photography or videography service is required. LED Wall, Web Live and Aerial services are available only as add-on services.";

export const START_TIME_REQUIRED_MESSAGE = "Please select a start time.";
export const END_TIME_REQUIRED_MESSAGE = "Please select an end time.";
export const END_BEFORE_START_MESSAGE = "End time must be after start time.";
export const OVERNIGHT_EVENT_MESSAGE = "This event continues into the next day.";

export type ValidationIssue = {
  code: string;
  message: string;
  dayId?: string;
};

export function hasCoreService(day: Pick<EventDay, "photography" | "videography">): boolean {
  return day.photography.traditional || day.photography.candid || day.videography.traditional || day.videography.candid;
}

function hasAnyAddOn(day: Pick<EventDay, "aerial" | "ledWall" | "webLive">): boolean {
  return (
    day.aerial.photographyDrones > 0 ||
    day.aerial.videographyDrones > 0 ||
    day.ledWall.enabled ||
    day.webLive.enabled
  );
}

function hasAnyServiceSelected(day: EventDay): boolean {
  return hasCoreService(day) || hasAnyAddOn(day);
}

/** Rule 1 / 7 / 8 / 9 combined: add-ons require a core service on the same day. */
export function validateCoreServiceRule(day: EventDay): ValidationIssue[] {
  if (hasAnyServiceSelected(day) && !hasCoreService(day)) {
    return [{ code: "CORE_SERVICE_REQUIRED", message: CORE_SERVICE_REQUIRED_MESSAGE, dayId: day.dayId }];
  }
  return [];
}

/** Day-editor banner: hide the core-service error on a fresh empty day until
 * Save/Continue, but show it immediately if an add-on is on without a core service. */
export function shouldShowCoreServiceError(day: EventDay, saveAttempted: boolean): boolean {
  if (hasCoreService(day)) return false;
  return saveAttempted || validateCoreServiceRule(day).length > 0;
}

export function validateDay(day: EventDay): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!day.eventDate) {
    issues.push({ code: "EVENT_DATE_REQUIRED", message: "Select an event date.", dayId: day.dayId });
  } else if (isPastDate(day.eventDate)) {
    // Rule 3
    issues.push({ code: "EVENT_DATE_PAST", message: "Event date cannot be in the past.", dayId: day.dayId });
  }

  if (!day.eventTypeIds.length) {
    issues.push({ code: "EVENT_TYPE_REQUIRED", message: "Select at least one event type.", dayId: day.dayId });
  }

  if (!day.location.formattedAddress) {
    issues.push({ code: "LOCATION_REQUIRED", message: "Select the event location.", dayId: day.dayId });
  }

  if (!day.startTime) {
    issues.push({ code: "START_TIME_REQUIRED", message: START_TIME_REQUIRED_MESSAGE, dayId: day.dayId });
  }
  if (!day.endTime) {
    issues.push({ code: "END_TIME_REQUIRED", message: END_TIME_REQUIRED_MESSAGE, dayId: day.dayId });
  }
  if (day.startTime && day.endTime && !isEndAfterStart(day.startTime, day.endTime, day.overnight)) {
    // Rule 2 — only after both times are actually selected
    issues.push({ code: "END_BEFORE_START", message: END_BEFORE_START_MESSAGE, dayId: day.dayId });
  }

  // Rule 5: photography count must be > 0 when photography type is selected.
  if (day.photography.traditional && day.photography.traditionalCount < ADMIN_LIMITS.minPhotographers) {
    issues.push({
      code: "PHOTOGRAPHY_COUNT_REQUIRED",
      message: "Number of traditional photographers must be at least 1.",
      dayId: day.dayId,
    });
  }
  if (day.photography.candid && day.photography.candidCount < ADMIN_LIMITS.minPhotographers) {
    issues.push({
      code: "PHOTOGRAPHY_COUNT_REQUIRED",
      message: "Number of candid photographers must be at least 1.",
      dayId: day.dayId,
    });
  }

  // Rule 6: videographer count must be > 0 when videography type is selected.
  if (day.videography.traditional && day.videography.traditionalCount < ADMIN_LIMITS.minVideographers) {
    issues.push({
      code: "VIDEOGRAPHY_COUNT_REQUIRED",
      message: "Number of traditional videographers must be at least 1.",
      dayId: day.dayId,
    });
  }
  if (day.videography.candid && day.videography.candidCount < ADMIN_LIMITS.minVideographers) {
    issues.push({
      code: "VIDEOGRAPHY_COUNT_REQUIRED",
      message: "Number of candid videographers must be at least 1.",
      dayId: day.dayId,
    });
  }

  // A day is incomplete until photography or videography is chosen.
  // Add-on-only days reuse the same required copy (rules 1 / 7 / 8 / 9).
  if (!hasCoreService(day)) {
    issues.push({ code: "CORE_SERVICE_REQUIRED", message: CORE_SERVICE_REQUIRED_MESSAGE, dayId: day.dayId });
  }

  return issues;
}

export function validateExpectedDelivery(days: EventDay[], expectedDeliveryDate: string | null): ValidationIssue[] {
  if (!expectedDeliveryDate) {
    return [{ code: "DELIVERY_DATE_REQUIRED", message: "Select an expected delivery date." }];
  }
  const finalEventDate = latestDate(days.map((d) => d.eventDate ?? ""));
  // Rule 4
  if (finalEventDate && isBeforeDate(expectedDeliveryDate, finalEventDate)) {
    return [
      {
        code: "DELIVERY_BEFORE_EVENT",
        message: "Expected delivery date cannot be before the final event date.",
      },
    ];
  }
  return [];
}

/** Rule 10: budget must be greater than zero. */
export function validateBudget(budget: number | null): ValidationIssue[] {
  if (budget == null || budget <= 0) {
    return [{ code: "BUDGET_REQUIRED", message: "Enter a budget greater than zero." }];
  }
  return [];
}

/** Validates only the event days themselves (spec screens 6–12) — used by
 * the "Your event" days-overview screen's Continue button, which comes
 * *before* the deliverables/expected-delivery steps in the wizard. It must
 * not also demand an expected delivery date, or the customer would be
 * blocked from ever reaching the Deliverables screen where that date is
 * collected. */
export function validateDays(days: EventDay[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!days.length) {
    issues.push({ code: "NO_DAYS", message: "Add at least one event day." });
  }
  for (const day of days) {
    issues.push(...validateDay(day));
  }
  return issues;
}

/** Full booking validation (days + expected delivery) — used once the
 * customer has moved past the deliverables step, e.g. before vendor
 * matching, where an expected delivery date is expected to already exist. */
export function validateBooking(booking: Booking): ValidationIssue[] {
  return [...validateDays(booking.days), ...validateExpectedDelivery(booking.days, booking.expectedDeliveryDate)];
}

export function isDayComplete(day: EventDay): boolean {
  return validateDay(day).length === 0;
}

/** Customer-facing labels for incomplete day cards. Maps existing
 * validateDay codes — does not add or weaken any booking rules. */
const DAY_MISSING_LABELS: Record<string, string> = {
  EVENT_DATE_REQUIRED: "Date",
  EVENT_DATE_PAST: "Valid date",
  EVENT_TYPE_REQUIRED: "Event type",
  LOCATION_REQUIRED: "Location",
  START_TIME_REQUIRED: "Start time",
  END_TIME_REQUIRED: "End time",
  END_BEFORE_START: "End after start",
  CORE_SERVICE_REQUIRED: "Photography or Videography",
  PHOTOGRAPHY_COUNT_REQUIRED: "Photographers",
  VIDEOGRAPHY_COUNT_REQUIRED: "Videographers",
};

export function dayMissingLabels(day: EventDay): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const issue of validateDay(day)) {
    const label = DAY_MISSING_LABELS[issue.code];
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels;
}
