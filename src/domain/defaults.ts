import type {
  Booking,
  Deliverables,
  EventDay,
  EventLocation,
} from "@/src/types/booking";
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

export function createEmptyDay(order: number): EventDay {
  return {
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
    ledWall: { enabled: false, size: "8 x 12", screenCount: 1 },
    webLive: { enabled: false, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
  };
}

export function duplicateDay(source: EventDay, order: number): EventDay {
  return {
    ...source,
    dayId: makeId("day"),
    order,
    eventDate: null,
  };
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
