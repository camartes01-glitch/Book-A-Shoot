/**
 * Booking domain types.
 *
 * Mirrors the relational structure suggested in the spec (section 34/35):
 * bookings -> booking_days -> {photography,videography,aerial,led,web_live}
 * requirements, plus booking-level budget/package/deliverables/matches.
 * Kept as normalized nested objects here since the client persists a single
 * JSON document per booking; `src/services/bookingApi.ts` is the seam where
 * this would be split across real relational tables server-side.
 */

export type EventCategoryGroup = "wedding" | "personal" | "commercial" | "pooja";

export type EventCategory = {
  id: string;
  group: EventCategoryGroup;
  label: string;
  enabled: boolean;
  order: number;
};

export type EventLocation = {
  placeId: string | null;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  district: string;
  state: string;
  pincode: string;
  manuallyEdited: boolean;
};

export type PhotographyRequirement = {
  traditional: boolean;
  traditionalCount: number;
  candid: boolean;
  candidCount: number;
};

export type VideographyRequirement = {
  traditional: boolean;
  traditionalCount: number;
  candid: boolean;
  candidCount: number;
};

export type AerialRequirement = {
  photographyDrones: number;
  videographyDrones: number;
};

export type LedWallRequirement = {
  enabled: boolean;
  size: string;
  screenCount: number;
};

export type WebLiveRequirement = {
  enabled: boolean;
  quality: "HD" | "4K";
  cameraCount: number;
  streamingPlatform: string;
  accessType: "private" | "public";
};

export type EventDay = {
  dayId: string;
  order: number;
  /** Monotonic editor revision. Stale persists with a lower revision are ignored. */
  dayRevision?: number;
  eventDate: string | null; // ISO yyyy-MM-dd
  eventTypeIds: string[];
  location: EventLocation;
  startTime: string | null; // "HH:mm"
  endTime: string | null; // "HH:mm", may be "next day" (overnight)
  overnight: boolean;
  photography: PhotographyRequirement;
  videography: VideographyRequirement;
  aerial: AerialRequirement;
  ledWall: LedWallRequirement;
  webLive: WebLiveRequirement;
};

export type PhotoDeliverables = {
  rawPhotos: boolean;
  editedPhotosOption: "25" | "50" | "100" | "custom";
  editedPhotosCustomCount: number | null;
  album: boolean;
  albumPagesOption: "10" | "15" | "20" | "25" | "custom" | null;
  albumPagesCustomCount: number | null;
};

export type VideoDeliverables = {
  rawVideo: boolean;
  editedTraditionalVideoCount: number;
  editedCinematicVideoCount: number;
};

export type Deliverables = {
  photo: PhotoDeliverables;
  video: VideoDeliverables;
};

export type PackageTierId = "essential" | "signature" | "elite";

export type PackageServiceLine = {
  serviceId: string;
  label: string;
  quantity: number;
  minPrice: number;
  maxPrice: number;
  note?: string;
};

export type PackageOption = {
  id: PackageTierId;
  label: string;
  minPrice: number;
  maxPrice: number;
  headline: string;
  bullets: string[];
  serviceLines: PackageServiceLine[];
  recommended: boolean;
};

export type BudgetFeasibility = {
  estimatedCost: number;
  budget: number;
  isBelowEstimate: boolean;
  shortfall: number;
};

export type BookingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "MATCHING"
  | "VENDOR_SELECTED"
  | "REQUEST_SENT"
  | "VENDOR_ACCEPTED"
  | "CUSTOMER_CONFIRMED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VENDOR_REJECTED"
  | "CUSTOMER_CANCELLED"
  | "VENDOR_CANCELLED"
  | "EXPIRED";

export type CounterOffer = {
  amount: number;
  note: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
};

export type VendorMatchResult = {
  vendorId: string;
  studioName: string;
  city: string;
  rating: number;
  experienceYears: number;
  completedBookings: number;
  available: boolean;
  unavailableReason?: string;
  estimatedPrice: number;
  matchScore: number;
  /** First live portfolio image from the vendor catalog, when one exists. */
  imageUrl?: string;
  /** Studio neighbourhood / area from the vendor catalog, when present. */
  area?: string;
  /** Photography / Videography labels derived from the vendor's real capabilities. */
  serviceCategory?: string;
};

export type Booking = {
  bookingId: string;
  customerId: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  days: EventDay[];
  deliverables: Deliverables;
  expectedDeliveryDate: string | null;
  budget: number | null;
  selectedPackage: PackageTierId | null;
  packageOptions: PackageOption[] | null;
  matches: VendorMatchResult[] | null;
  selectedVendorId: string | null;
  estimatedAmount: number | null;
  counterOffer: CounterOffer | null;
  draftCompletionPct: number;
  /** Camartes `POST /api/bookings` identifier when the request was accepted by the backend. */
  remoteBookingId?: string | null;
  /** Raw Camartes status string, when the backend returned one. */
  remoteStatus?: string | null;
};

export type CustomerProfile = {
  customerId: string;
  name: string;
  mobile: string;
  email: string;
  avatarInitials: string;
  savedAddresses: EventLocation[];
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  bookingId?: string;
};
