import type { Booking, CustomerProfile, EventDay } from "@/src/types/booking";
import { durationMinutes } from "@/src/utils/dateTime";
import { bookingRequirementPayload, selectedAddOnLabels, selectedCoreServiceLabels } from "@/src/domain/dayServices";
import { eventTypeLabels } from "@/src/constants/eventCategories";
import { selectedPackageQuote } from "@/src/engine/pricing";
import { formatInrRange } from "@/src/utils/format";

/** Body for POST /api/bookings (Camartes BookingRequestModel). */
export type CamartesBookingRequest = {
  provider_id: string;
  provider_profile_id: string | null;
  service_type: string;
  event_date: string;
  event_time: string;
  end_date: string | null;
  duration_hours: number | null;
  message: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  budget: string | null;
};

export function primaryServiceType(days: EventDay[]): string {
  const wantsPhoto = days.some((d) => d.photography.traditional || d.photography.candid);
  const wantsVideo = days.some((d) => d.videography.traditional || d.videography.candid);
  if (wantsPhoto && wantsVideo) return "photography_firm";
  if (wantsVideo) return "videographer";
  return "photographer";
}

export function catalogServiceTypes(days: EventDay[]): string[] {
  const types = new Set<string>();
  const wantsPhoto = days.some((d) => d.photography.traditional || d.photography.candid);
  const wantsVideo = days.some((d) => d.videography.traditional || d.videography.candid);
  if (wantsPhoto) types.add("photographer");
  if (wantsVideo) types.add("videographer");
  if (days.some((d) => d.aerial.photographyDrones > 0 || d.aerial.videographyDrones > 0)) types.add("fly_cam");
  if (days.some((d) => d.ledWall.enabled)) types.add("led_wall");
  if (days.some((d) => d.webLive.enabled)) types.add("web_live_services");
  return [...types];
}

export function toCamartesBookingRequest(booking: Booking, profile: CustomerProfile | null): CamartesBookingRequest {
  const days = [...booking.days].sort((a, b) => a.order - b.order);
  const first = days[0];
  if (!first?.eventDate || !first.startTime) {
    throw new Error("Event date and start time are required before sending a request.");
  }
  if (!booking.selectedVendorId) {
    throw new Error("Select a service provider first.");
  }

  const last = days[days.length - 1];
  const hours = days.reduce((sum, day) => {
    if (!day.startTime || !day.endTime) return sum;
    return sum + Math.max(1, Math.round(durationMinutes(day.startTime, day.endTime, day.overnight) / 60));
  }, 0);

  const lines = days.map((day) => {
    const payload = bookingRequirementPayload(day);
    const cores = selectedCoreServiceLabels(day).join(", ") || "None";
    const addOns = selectedAddOnLabels(day).join(", ") || "None";
    return [
      `Day ${day.order}: ${day.eventDate ?? "no date"} ${day.startTime ?? "--"}–${day.endTime ?? "--"}${day.overnight ? " (ends next day)" : ""}`,
      `Location: ${day.location.formattedAddress || day.location.city || "not set"}`,
      `Event type: ${eventTypeLabels(day.eventTypeIds) || "not set"}`,
      `Services: ${cores}`,
      `Add-ons: ${addOns}`,
      payload.photography.traditional ? `Traditional photographers: ${payload.photography.traditionalCount}` : null,
      payload.photography.candid ? `Candid photographers: ${payload.photography.candidCount}` : null,
      payload.videography.traditional ? `Traditional videographers: ${payload.videography.traditionalCount}` : null,
      payload.videography.candid ? `Candid videographers: ${payload.videography.candidCount}` : null,
      payload.aerial.enabled
        ? `Aerial: ${payload.aerial.photographyDrones} photo drone(s), ${payload.aerial.videographyDrones} video drone(s)`
        : null,
      payload.ledWall.enabled ? `LED Wall: ${payload.ledWall.size} × ${payload.ledWall.screenCount}` : null,
      payload.webLive.enabled ? `Web Live: ${payload.webLive.quality} × ${payload.webLive.cameraCount}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  const quoted = selectedPackageQuote(booking);
  const message = [
    `Camartes booking request`,
    `Package: ${booking.selectedPackage ?? "n/a"}`,
    quoted && quoted.maxPrice > 0
      ? `Package estimate: ${formatInrRange(quoted.minPrice, quoted.maxPrice)} (customer-side approved range, not a provider quote)`
      : null,
    booking.expectedDeliveryDate ? `Expected delivery: ${booking.expectedDeliveryDate}` : null,
    ...lines,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    provider_id: booking.selectedVendorId,
    provider_profile_id: booking.selectedVendorId,
    service_type: primaryServiceType(days),
    event_date: first.eventDate,
    event_time: first.startTime,
    end_date: last?.eventDate && last.eventDate !== first.eventDate ? last.eventDate : null,
    duration_hours: hours || null,
    message,
    client_name: profile?.name || null,
    client_email: profile?.email || null,
    client_phone: profile?.mobile || null,
    budget: booking.budget != null ? String(booking.budget) : null,
  };
}

export function mapCamartesBookingStatus(raw: string | null | undefined): Booking["status"] | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const table: Record<string, Booking["status"]> = {
    draft: "DRAFT",
    pending: "REQUEST_SENT",
    requested: "REQUEST_SENT",
    request_sent: "REQUEST_SENT",
    submitted: "REQUEST_SENT",
    matching: "MATCHING",
    vendor_selected: "VENDOR_SELECTED",
    accepted: "VENDOR_ACCEPTED",
    vendor_accepted: "VENDOR_ACCEPTED",
    rejected: "VENDOR_REJECTED",
    declined: "VENDOR_REJECTED",
    vendor_rejected: "VENDOR_REJECTED",
    confirmed: "CONFIRMED",
    customer_confirmed: "CUSTOMER_CONFIRMED",
    payment_pending: "PAYMENT_PENDING",
    in_progress: "IN_PROGRESS",
    completed: "COMPLETED",
    cancelled: "CUSTOMER_CANCELLED",
    customer_cancelled: "CUSTOMER_CANCELLED",
    vendor_cancelled: "VENDOR_CANCELLED",
    expired: "EXPIRED",
  };
  return table[key] ?? null;
}

export function remoteBookingIdOf(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const nested = row.booking;
  if (nested && typeof nested === "object") {
    const inner = remoteBookingIdOf(nested);
    if (inner) return inner;
  }
  for (const key of ["booking_id", "id", "bookingId"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function remoteStatusOf(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (typeof row.status === "string") return row.status;
  const nested = row.booking;
  if (nested && typeof nested === "object" && typeof (nested as { status?: string }).status === "string") {
    return (nested as { status: string }).status;
  }
  return null;
}

export type RemoteBookingSnapshot = {
  id: string;
  status: string | null;
  providerId: string | null;
  eventDate: string | null;
  eventTime: string | null;
  serviceType: string | null;
  budget: string | null;
};

function stringField(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function parseRemoteBookingRow(payload: unknown): RemoteBookingSnapshot | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const nested = row.booking;
  if (nested && typeof nested === "object") {
    const inner = parseRemoteBookingRow(nested);
    if (inner) return inner;
  }
  const id = remoteBookingIdOf(row);
  if (!id) return null;
  return {
    id,
    status: remoteStatusOf(row),
    providerId: stringField(row, ["provider_id", "providerId", "vendor_id", "vendorId"]),
    eventDate: stringField(row, ["event_date", "eventDate"]),
    eventTime: stringField(row, ["event_time", "eventTime"]),
    serviceType: stringField(row, ["service_type", "serviceType"]),
    budget: stringField(row, ["budget"]),
  };
}

export function parseRemoteBookingList(payload: unknown): RemoteBookingSnapshot[] {
  if (Array.isArray(payload)) {
    return payload.map(parseRemoteBookingRow).filter((row): row is RemoteBookingSnapshot => row != null);
  }
  if (payload && typeof payload === "object") {
    const row = payload as Record<string, unknown>;
    for (const key of ["bookings", "data", "results", "items"]) {
      if (Array.isArray(row[key])) return parseRemoteBookingList(row[key]);
    }
    const single = parseRemoteBookingRow(payload);
    return single ? [single] : [];
  }
  return [];
}

export function isLocalWizardBooking(booking: Pick<Booking, "status" | "remoteBookingId">): boolean {
  if (booking.remoteBookingId) return false;
  return booking.status === "DRAFT" || booking.status === "SUBMITTED" || booking.status === "MATCHING" || booking.status === "VENDOR_SELECTED";
}

/** Newest in-progress wizard draft, used after login and on cold start.
 * Empty 0% Start Booking drafts are ignored when a real in-progress draft exists. */
export function selectActiveWizardDraft<T extends Pick<Booking, "status" | "remoteBookingId" | "updatedAt" | "draftCompletionPct">>(
  bookings: T[],
): T | null {
  const wizards = bookings.filter(isLocalWizardBooking);
  if (!wizards.length) return null;
  const inProgress = wizards.filter((b) => (b.draftCompletionPct ?? 0) > 0);
  const pool = inProgress.length ? inProgress : wizards;
  return [...pool].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null;
}

export function applyRemoteSnapshot(local: Booking, remote: RemoteBookingSnapshot): Booking {
  const mapped = mapCamartesBookingStatus(remote.status);
  return {
    ...local,
    remoteBookingId: remote.id,
    remoteStatus: remote.status,
    status: mapped ?? local.status,
    selectedVendorId: remote.providerId || local.selectedVendorId,
  };
}
