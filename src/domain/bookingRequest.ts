import type { AssignedPhotographer, Booking, CustomerProfile, EventDay } from "@/src/types/booking";
import { durationMinutes } from "@/src/utils/dateTime";
import { bookingRequirementPayload, selectedAddOnLabels, selectedCoreServiceLabels, selectedDetailedServiceLabels } from "@/src/domain/dayServices";
import { DEFAULT_EVENT_CATEGORIES, eventTypeLabels } from "@/src/constants/eventCategories";
import { selectedPackageQuote } from "@/src/engine/pricing";
import { formatInrRange, formatTime12h } from "@/src/utils/format";

/** Masking helper for phone numbers */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 5) return "••••••••••";
  if (cleaned.startsWith("+91") && cleaned.length >= 13) {
    return `+91 ••••• ••${cleaned.slice(-3)}`;
  }
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 2)}••••••${cleaned.slice(-2)}`;
  }
  return `${cleaned.slice(0, 1)}•••••${cleaned.slice(-1)}`;
}

/** Masking helper for email addresses */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}•••••@${domain}`;
}

/** Body for POST /api/bookings (Camartes BookingRequestModel). */
export type CamartesBookingRequest = {
  provider_id: string;
  provider_profile_id: string | null;
  assigned_provider_ids?: string[];
  lead_broadcast?: boolean;
  service_type: string;
  event_type?: string;
  event_date: string;
  event_time: string;
  end_date: string | null;
  duration_hours: number | null;
  venue_address?: string;
  message: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  budget: string | null;
  location_preference?: {
    type?: string;
    mode?: string;
    city?: string;
    formattedAddress?: string;
  } | null;
  lead_details?: {
    source?: string;
    eventType: string;
    city: string;
    venueAddress: string;
    packageTier: string | null;
    services: string[];
    addOns?: string[];
    budget?: number | null;
    clientName?: string | null;
    clientContactMasked?: boolean;
  };
};

export function primaryServiceType(_days?: EventDay[]): string {
  // Shoots are for Photography Firms ONLY: backend strictly enforces service_type: "photography_firm"
  return "photography_firm";
}

export function catalogServiceTypes(_days?: EventDay[]): string[] {
  // Customer shoot booking requests must ONLY match and reach registered Photography Firms
  return ["photography_firm"];
}

export function toCamartesBookingRequest(booking: Booking, profile: CustomerProfile | null): CamartesBookingRequest {
  const days = [...booking.days].sort((a, b) => a.order - b.order);
  const first = days[0];
  if (!first?.eventDate || !first.startTime) {
    throw new Error("Event date and start time are required before sending a request.");
  }
  const assignedIds = booking.assignedProviderIds?.length
    ? booking.assignedProviderIds
    : (booking.matches?.slice(0, 6).map((m) => m.vendorId) ?? []);
  const primaryId = booking.selectedVendorId || assignedIds[0];
  if (!primaryId) {
    throw new Error("Select a service provider or match providers first.");
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

  const eventTypes = Array.from(new Set(days.flatMap((d) => d.eventTypeIds.map((id) => eventTypeLabels([id]) || id))));
  const cores = Array.from(new Set(days.flatMap((d) => selectedCoreServiceLabels(d))));
  const detailedServices = Array.from(new Set(days.flatMap((d) => selectedDetailedServiceLabels(d))));
  const addOns = Array.from(new Set(days.flatMap((d) => selectedAddOnLabels(d))));
  const eventType = eventTypes.join(" · ") || "Photography Shoot";
  const venueAddress = first?.location?.formattedAddress || first?.location?.city || "Event Location";
  const city = first?.location?.city || booking.providerLocationPreference?.city || "Bangalore";
  const packageTier = quoted?.label || (booking.selectedPackage ? booking.selectedPackage.toUpperCase() : "Premium");
  const formattedStartTime = first?.startTime ? (first.startTime.includes("M") ? first.startTime : formatTime12h(first.startTime)) : "10:00 AM";

  const locPref = booking.providerLocationPreference;
  const locationPrefObj = locPref
    ? {
        type: locPref.mode === "preferred_area" ? "specific_area" : locPref.mode === "another_area" ? "another_city" : "near_event",
        mode: locPref.mode,
        city: locPref.city || city,
        formattedAddress: locPref.formattedAddress || venueAddress,
      }
    : {
        type: "near_event",
        mode: "event_location",
        city,
        formattedAddress: venueAddress,
      };

  return {
    assigned_provider_ids: assignedIds,
    provider_id: primaryId,
    provider_profile_id: primaryId,
    lead_broadcast: true,
    service_type: primaryServiceType(days),
    event_type: eventType,
    event_date: first.eventDate,
    event_time: formattedStartTime,
    end_date: last?.eventDate || first.eventDate,
    duration_hours: hours || null,
    venue_address: venueAddress,
    message,
    client_name: profile?.name || null,
    client_phone: profile?.mobile || null,
    client_email: profile?.email || null,
    budget: booking.budget != null ? String(booking.budget) : null,
    location_preference: locationPrefObj,
    lead_details: {
      source: "bookashoot",
      eventType,
      city,
      venueAddress,
      packageTier,
      services: detailedServices.length ? detailedServices : (cores.length ? cores : ["Candid Photography"]),
      addOns,
      budget: booking.budget,
      clientName: profile?.name || "Customer",
      clientContactMasked: true,
    },
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
  eventType?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  firmsStatusMessage?: string | null;
  assignedCount?: number;
  confirmedProviderId?: string | null;
  assignedPhotographers?: AssignedPhotographer[];
};

function stringField(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseAssignedPhotographers(raw: unknown): AssignedPhotographer[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((item): AssignedPhotographer | null => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const providerId = stringField(r, ["provider_id", "providerId", "id", "userId", "user_id"]) || "";
      if (!providerId) return null;
      const name = stringField(r, ["name", "full_name", "fullName", "studioName", "studio_name"]) || "Photography Firm";
      const rating = typeof r.rating === "number" ? r.rating : (typeof r.avg_rating === "number" ? r.avg_rating : 4.8);
      const city = stringField(r, ["city", "location"]) || "Bangalore";
      const profileImage = stringField(r, ["profile_image", "profileImage", "image_url", "imageUrl", "avatar"]);
      const hasAccepted = Boolean(r.has_accepted ?? r.hasAccepted ?? r.accepted);
      const isConfirmed = Boolean(r.is_confirmed ?? r.isConfirmed ?? r.confirmed);
      const canConfirm = Boolean(r.can_confirm ?? r.canConfirm ?? (hasAccepted && !isConfirmed));
      const contactUnlocked = Boolean(r.contact_unlocked ?? r.contactUnlocked ?? hasAccepted);
      const contactPhone = stringField(r, ["contact_phone", "contactPhone", "phone", "mobile"]);
      const contactEmail = stringField(r, ["contact_email", "contactEmail", "email"]);
      const contactWhatsapp = stringField(r, ["contact_whatsapp", "contactWhatsapp", "whatsapp"]);

      return {
        id: providerId,
        provider_id: providerId,
        name,
        rating,
        city,
        profile_image: profileImage,
        has_accepted: hasAccepted,
        is_confirmed: isConfirmed,
        can_confirm: canConfirm,
        contact_unlocked: contactUnlocked,
        contact_phone: contactPhone ?? undefined,
        contact_email: contactEmail ?? undefined,
        contact_whatsapp: contactWhatsapp ?? undefined,
      };
    })
    .filter((p): p is AssignedPhotographer => p !== null);
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

  const firmsStatusMessage = stringField(row, ["firms_status_message", "firmsStatusMessage", "status_message", "statusMessage"]);
  const assignedCount = typeof row.assigned_count === "number" ? row.assigned_count : (typeof row.assignedCount === "number" ? row.assignedCount : undefined);
  const confirmedProviderId = stringField(row, ["confirmed_provider_id", "confirmedProviderId"]);
  const assignedPhotographers = parseAssignedPhotographers(row.assigned_photographers ?? row.assignedPhotographers);

  const leadDetails = row.lead_details && typeof row.lead_details === "object" ? (row.lead_details as Record<string, unknown>) : null;
  const eventType =
    stringField(row, ["event_type", "eventType", "event_name", "eventName", "title", "name", "category"]) ||
    (leadDetails ? stringField(leadDetails, ["eventType", "event_type", "eventName", "event_name"]) : null);
  const venueAddress = stringField(row, ["venue_address", "venueAddress", "address", "formatted_address"]);
  const city = stringField(row, ["city", "location"]) || (leadDetails ? stringField(leadDetails, ["city"]) : null);

  return {
    id,
    status: remoteStatusOf(row),
    providerId: stringField(row, ["provider_id", "providerId", "vendor_id", "vendorId"]),
    eventDate: stringField(row, ["event_date", "eventDate"]),
    eventTime: stringField(row, ["event_time", "eventTime"]),
    serviceType: stringField(row, ["service_type", "serviceType"]),
    budget: stringField(row, ["budget"]),
    eventType,
    venueAddress,
    city,
    firmsStatusMessage,
    assignedCount,
    confirmedProviderId,
    assignedPhotographers,
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
  const nextStatus = mapped ?? local.status;
  const isAccepted = nextStatus === "VENDOR_ACCEPTED" || nextStatus === "CONFIRMED" || nextStatus === "CUSTOMER_CONFIRMED";
  const confirmedProviderId = remote.confirmedProviderId || local.confirmed_provider_id;
  const assignedPhotographers = remote.assignedPhotographers ?? local.assigned_photographers;

  const localDays = [...(local.days || [])];
  if (remote.eventType && localDays[0] && (!localDays[0].eventTypeIds || localDays[0].eventTypeIds.length === 0)) {
    const cat = DEFAULT_EVENT_CATEGORIES.find(
      (c) => c.id.toLowerCase() === remote.eventType!.toLowerCase() || c.label.toLowerCase() === remote.eventType!.toLowerCase()
    );
    localDays[0] = {
      ...localDays[0],
      eventTypeIds: [cat ? cat.id : remote.eventType],
    };
  }

  return {
    ...local,
    remoteBookingId: remote.id,
    remoteStatus: remote.status,
    status: nextStatus,
    days: localDays,
    eventType: remote.eventType || local.eventType,
    eventName: remote.eventType || local.eventName,
    selectedVendorId: remote.providerId || local.selectedVendorId,
    contactMasked: !isAccepted,
    firms_status_message: remote.firmsStatusMessage ?? local.firms_status_message,
    assigned_count: remote.assignedCount ?? local.assigned_count,
    confirmed_provider_id: confirmedProviderId,
    assigned_photographers: assignedPhotographers,
    leadDistribution: local.leadDistribution
      ? {
          ...local.leadDistribution,
          acceptedByVendorId: isAccepted ? (remote.providerId || local.selectedVendorId) : local.leadDistribution.acceptedByVendorId,
        }
      : local.leadDistribution,
  };
}

/**
 * Resolves the exact step where an in-progress draft should resume.
 * Ensures the customer picks up exactly where they left off, rather than
 * being sent back to the initial step.
 */
export function getDraftResumeRoute(booking: Booking): string {
  const days = booking.days ?? [];
  const first = days[0];

  // 1. Basic event requirements: event type, date, times, location
  if (
    !first ||
    !first.eventDate ||
    !first.startTime ||
    !first.endTime ||
    !first.eventTypeIds?.length ||
    !(first.location?.formattedAddress || first.location?.city)
  ) {
    return first ? `/booking/day/${first.dayId}` : "/booking/new";
  }

  // 2. Core services: photography or videography
  const hasCoreServices = days.some(
    (d) =>
      d.photography?.traditional ||
      d.photography?.candid ||
      d.videography?.traditional ||
      d.videography?.candid,
  );
  if (!hasCoreServices) {
    return first ? `/booking/day/${first.dayId}?step=photography` : "/booking/new";
  }

  // 3. Budget
  if (booking.budget == null || booking.budget <= 0) {
    return "/booking/budget";
  }

  // 4. Package tier
  if (!booking.selectedPackage) {
    return "/booking/packages";
  }

  // 5. Matches & Provider selection
  if (!booking.matches?.length || !booking.selectedVendorId) {
    return "/booking/matches";
  }

  // 6. Everything configured -> Review & Send Request
  return "/booking/confirm";
}
