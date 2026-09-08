import type {
  Booking,
  Deliverables,
  EventDay,
  EventLocation,
} from "@/src/types/booking";
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
  return {
    ...day,
    aerial: {
      photographyDrones: Math.max(0, day.aerial?.photographyDrones ?? 0),
      videographyDrones: Math.max(0, day.aerial?.videographyDrones ?? 0),
    },
    ledWall: ledEnabled ? { ...day.ledWall, enabled: true } : { ...DISABLED_LED_WALL },
    webLive: webEnabled ? { ...day.webLive, enabled: true } : { ...DISABLED_WEB_LIVE },
  };
}

/** Persist-time day cleanup: disabled add-ons stay inactive, and wrapping
 * clock times (8:00 PM → 2:00 AM) are marked overnight so the customer is
 * not blocked by same-day end-after-start validation. */
export function sanitizeEventDay(day: EventDay): EventDay {
  const sanitized = sanitizeDayAddOns(day);
  return {
    ...sanitized,
    overnight: inferOvernight(sanitized.startTime, sanitized.endTime) || sanitized.overnight === true,
  };
}

export function createEmptyDay(order: number): EventDay {
  return sanitizeDayAddOns({
    dayId: makeId("day"),
    order,
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
    matches: null,
    selectedVendorId: null,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 0,
  };
}
