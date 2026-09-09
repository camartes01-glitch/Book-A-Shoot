import type {
  Booking,
  Deliverables,
  EventDay,
  EventLocation,
} from "@/src/types/booking";
import { applyAerialGate } from "@/src/domain/dayServices";
import { inferOvernight } from "@/src/utils/dateTime";
import { makeId } from "@/src/utils/id";

export function emptyLocation(): EventLocation {
  return {
    placeId: null,
    formattedAddress: "",
    latitude: null,
    longitude: null,
    city: "",
    district: "",
    state: "",
    pincode: "",
    manuallyEdited: false,
  };
}

const DISABLED_LED_WALL = { enabled: false as const, size: "8 x 12", screenCount: 1 };
const DISABLED_WEB_LIVE = {
  enabled: false as const,
  quality: "HD" as const,
  cameraCount: 1,
  streamingPlatform: "",
  accessType: "private" as const,
};

/** Normalize add-on fields so a disabled add-on is never treated as a
 * selected requirement (and so a brand-new EventDay never starts enabled). */
export function sanitizeDayAddOns(day: EventDay): EventDay {
  const ledEnabled = day.ledWall?.enabled === true;
  const webEnabled = day.webLive?.enabled === true;
  return applyAerialGate({
    ...day,
    aerial: {
      photographyDrones: Math.max(0, day.aerial?.photographyDrones ?? 0),
      videographyDrones: Math.max(0, day.aerial?.videographyDrones ?? 0),
    },
    ledWall: ledEnabled ? { ...day.ledWall, enabled: true } : { ...DISABLED_LED_WALL },
    webLive: webEnabled ? { ...day.webLive, enabled: true } : { ...DISABLED_WEB_LIVE },
  });
}

/** Persist-time day cleanup: disabled add-ons stay inactive, and wrapping
 * clock times (8:00 PM → 2:00 AM) are marked overnight so the customer is
 * not blocked by same-day end-after-start validation. */
export function sanitizeEventDay(day: EventDay): EventDay {
  const sanitized = sanitizeDayAddOns(day);
  return {
    ...sanitized,
    dayId: day.dayId,
    order: day.order,
    dayRevision: day.dayRevision ?? 0,
    overnight: inferOvernight(sanitized.startTime, sanitized.endTime) || sanitized.overnight === true,
  };
}

/** Merge a day persist without letting a stale empty snapshot wipe date, time,
 * location, or event types that were saved more recently.
 * dayId and order are immutable: they always come from the stored day. */
export function mergeEventDayPatch(current: EventDay, patch: Partial<EventDay>): EventDay {
  const currentRev = current.dayRevision ?? 0;
  const patchRev = patch.dayRevision;
  if (typeof patchRev === "number" && patchRev < currentRev) {
    const location =
      patch.location?.formattedAddress && !current.location.formattedAddress ? patch.location : current.location;
    return sanitizeEventDay({ ...current, location, dayId: current.dayId, order: current.order, dayRevision: currentRev });
  }
  const { dayId: _ignoredId, order: _ignoredOrder, ...rest } = patch;
  const merged = sanitizeEventDay({ ...current, ...rest, dayId: current.dayId, order: current.order });
  if (current.location.formattedAddress && !patch.location?.formattedAddress) {
    merged.location = current.location;
  }
  if (current.eventDate && !patch.eventDate) merged.eventDate = current.eventDate;
  if (current.startTime && !patch.startTime) merged.startTime = current.startTime;
  if (current.endTime && !patch.endTime) merged.endTime = current.endTime;
  if (current.eventTypeIds.length > 0 && (!patch.eventTypeIds || patch.eventTypeIds.length === 0)) {
    merged.eventTypeIds = current.eventTypeIds;
  }
  merged.dayRevision = Math.max(currentRev, typeof patchRev === "number" ? patchRev : currentRev);
  merged.dayId = current.dayId;
  merged.order = current.order;
  return merged;
}

/** Rehydrate the day editor from storage without discarding in-progress fields
 * that have not finished persisting yet. */
export function hydrateEditorDay(stored: EventDay, local: EventDay | null | undefined): EventDay {
  if (!local || local.dayId !== stored.dayId) return stored;
  return mergeEventDayPatch(stored, local);
}

export function createEmptyDay(order: number): EventDay {
  return sanitizeDayAddOns({
    dayId: makeId("day"),
    order,
    dayRevision: 0,
    eventDate: null,
    eventTypeIds: [],
    location: emptyLocation(),
    startTime: null,
    endTime: null,
    overnight: false,
    photography: { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 },
    videography: { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 },
    aerial: { photographyDrones: 0, videographyDrones: 0 },
    ledWall: { ...DISABLED_LED_WALL },
    webLive: { ...DISABLED_WEB_LIVE },
  });
}

export function duplicateDay(source: EventDay, order: number): EventDay {
  return sanitizeEventDay({
    ...source,
    dayId: makeId("day"),
    order,
    dayRevision: 0,
    eventDate: null,
  });
}

export function emptyDeliverables(): Deliverables {
  return {
    photo: {
      rawPhotos: false,
      editedPhotosOption: "50",
      editedPhotosCustomCount: null,
      album: false,
      albumPagesOption: null,
      albumPagesCustomCount: null,
    },
    video: {
      rawVideo: false,
      editedTraditionalVideoCount: 0,
      editedCinematicVideoCount: 0,
      teaserCinematicEnabled: false,
      teaserDurationMinutes: 1,
    },
  };
}

export function createEmptyBooking(customerId: string): Booking {
  const now = new Date().toISOString();
  return {
    bookingId: makeId("draft"),
    customerId,
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
    days: [createEmptyDay(1)],
    deliverables: emptyDeliverables(),
    expectedDeliveryDate: null,
    budget: null,
    selectedPackage: null,
    packageOptions: null,
    providerLocationPreference: null,
    matches: null,
    selectedVendorId: null,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 0,
    remoteBookingId: null,
    remoteStatus: null,
  };
}
