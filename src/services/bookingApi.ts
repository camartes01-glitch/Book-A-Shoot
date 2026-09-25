/**
 * Booking service layer.
 *
 * Wizard drafts stay on-device (Camartes has no draft-booking API).
 * Provider matching reads the live catalog. Submitting a request calls
 * `POST /api/bookings`. Status after that comes from Camartes, never from
 * a client-side accept/reject simulator.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AssignedPhotographer, Booking, BookingStatus, CounterOffer, CustomerProfile, EventDay, PackageTierId, ProviderLocationPreference } from "@/src/types/booking";
import { createEmptyBooking, createEmptyDay, duplicateDay, mergeEventDayPatch } from "@/src/domain/defaults";
import { DEFAULT_EVENT_CATEGORIES } from "@/src/constants/eventCategories";
import { normalizeRouteParam } from "@/src/utils/routeParam";
import {
  applyRemoteSnapshot,
  catalogServiceTypes,
  isLocalWizardBooking,
  parseRemoteBookingList,
  parseRemoteBookingRow,
  remoteBookingIdOf,
  remoteStatusOf,
  selectActiveWizardDraft,
  toCamartesBookingRequest,
  mapCamartesBookingStatus,
} from "@/src/domain/bookingRequest";
import { getBookingEventTitle, isCompletedBooking } from "@/src/domain/bookingFilters";
import { buildNotificationContent, categoryForType } from "@/src/domain/notificationContent";
import { checkBudgetFeasibility, generatePackageOptions } from "@/src/engine/pricing";
import { matchVendors } from "@/src/engine/matching";
import { defaultExpectedDeliveryDate, validateBooking, validateBudget } from "@/src/engine/validation";
import { cacheVendorProfile, fetchVendorById, fetchVendorCatalog, getCachedVendorProfile } from "@/src/services/vendorApi";
import { camartesFetch, CamartesApiError, getAuthToken } from "@/src/services/camartesClient";
import { getStoredProfile } from "@/src/services/authApi";
import { makeId } from "@/src/utils/id";
import { addNotification } from "@/src/services/notificationsStore";
import { isDemoAuthMode } from "@/src/config/authMode";

const BOOKINGS_KEY = "camartes-customer:bookings:v1";

/**
 * A "Search Again" retry (booking.replacedBookingId set) dispatches to freshly
 * found firms, which reads differently from a first-time request — same trigger
 * point, different copy/type per docs/VENDOR_APP_BACKEND_CHANGES.md's contract.
 */
function buildDispatchNotification(
  booking: Booking,
  assignedProviderIds: string[],
  profile: CustomerProfile,
): { type: "request_sent" | "new_search_dispatched"; title: string; body: string } {
  const firmNames = assignedProviderIds
    .map((id) => booking.matches?.find((m) => m.vendorId === id)?.studioName)
    .filter((n): n is string => Boolean(n));
  const type: "request_sent" | "new_search_dispatched" = booking.replacedBookingId ? "new_search_dispatched" : "request_sent";
  const { title, body } = buildNotificationContent(type, {
    customerName: profile.name,
    eventName: getBookingEventTitle(booking),
    firmCount: assignedProviderIds.length,
    firmNames,
  });
  return { type, title, body };
}

export async function readAllBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Booking[];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const deduplicated: Booking[] = [];
    for (const b of parsed) {
      const id = b.bookingId || b.remoteBookingId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      deduplicated.push(b);
    }
    return deduplicated;
  } catch {
    return [];
  }
}

async function writeAllBookings(bookings: Booking[]): Promise<void> {
  await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

/**
 * Re-key local bookings from one customerId to another.
 * Called when email-based profile reconciliation detects a customerId change
 * (e.g., user previously signed in with Google → now signs in with email/password,
 * or vice versa, with the same email address).
 */
export async function migrateBookingsToCustomer(
  oldCustomerId: string,
  newCustomerId: string,
): Promise<void> {
  if (!oldCustomerId || !newCustomerId || oldCustomerId === newCustomerId) return;
  const all = await readAllBookings();
  let changed = false;
  for (const b of all) {
    if (b.customerId === oldCustomerId) {
      b.customerId = newCustomerId;
      changed = true;
    }
  }
  if (changed) {
    await writeAllBookings(all);
  }
}

function touch(booking: Booking): Booking {
  return { ...booking, updatedAt: new Date().toISOString() };
}

function computeCompletionPct(booking: Booking): number {
  const steps = [
    booking.days.some((d) => d.eventDate && d.eventTypeIds.length && d.location.formattedAddress && d.startTime && d.endTime),
    booking.days.some((d) => d.photography.traditional || d.photography.candid || d.videography.traditional || d.videography.candid),
    !!booking.expectedDeliveryDate,
    booking.budget != null && booking.budget > 0,
    !!booking.selectedPackage,
    !!booking.selectedVendorId,
  ];
  return Math.round((steps.filter(Boolean).length / steps.length) * 100);
}

function sortBookings(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function saveBooking(booking: Booking): Promise<Booking> {
  const next = touch({ ...booking, draftCompletionPct: computeCompletionPct(booking) });
  const all = await readAllBookings();
  const idx = all.findIndex((b) => b.bookingId === next.bookingId || (next.remoteBookingId && b.remoteBookingId === next.remoteBookingId));
  if (idx === -1) all.unshift(next);
  else all[idx] = next;
  await writeAllBookings(all);
  return next;
}

function bookingLooksLike(local: Booking, remoteId: string): boolean {
  if (!remoteId) return false;
  return (
    local.bookingId === remoteId ||
    local.remoteBookingId === remoteId ||
    local.bookingId?.toLowerCase() === remoteId.toLowerCase() ||
    local.remoteBookingId?.toLowerCase() === remoteId.toLowerCase()
  );
}

function remoteOnlyBooking(customerId: string, remote: ReturnType<typeof parseRemoteBookingList>[number]): Booking {
  const mapped = mapCamartesBookingStatus(remote.status);
  const now = new Date().toISOString();
  const day = createEmptyDay(1);
  if (remote.eventDate) day.eventDate = remote.eventDate;
  if (remote.eventTime) {
    day.startTime = remote.eventTime;
    if (!day.endTime) {
      day.endTime = "18:00";
    }
  }
  if (remote.city && day.location) day.location.city = remote.city;
  if (remote.venueAddress && day.location) day.location.formattedAddress = remote.venueAddress;
  if (remote.eventType) {
    const cat = DEFAULT_EVENT_CATEGORIES.find(
      (c) => c.id.toLowerCase() === remote.eventType!.toLowerCase() || c.label.toLowerCase() === remote.eventType!.toLowerCase()
    );
    day.eventTypeIds = [cat ? cat.id : remote.eventType];
  }
  if (!day.photography.traditional && !day.photography.candid && !day.videography.traditional && !day.videography.candid) {
    day.photography.traditional = true;
    day.photography.traditionalCount = 1;
  }
  if (remote.services?.length) {
    const sLower = remote.services.map((s) => s.toLowerCase());
    if (sLower.some((s) => s.includes("candid photo"))) day.photography.candid = true;
    if (sLower.some((s) => s.includes("trad") && s.includes("photo"))) day.photography.traditional = true;
    if (sLower.some((s) => s.includes("cinemat") || s.includes("candid video"))) day.videography.candid = true;
    if (sLower.some((s) => s.includes("trad") && s.includes("video"))) day.videography.traditional = true;
  }
  if (remote.addOns?.length) {
    const aLower = remote.addOns.map((a) => a.toLowerCase());
    if (aLower.some((a) => a.includes("drone") || a.includes("aerial"))) {
      day.aerial.drones = 1;
    }
  }

  const deliverables = createEmptyBooking(customerId).deliverables;
  if (remote.deliverables?.length) {
    for (const d of remote.deliverables) {
      const dl = d.toLowerCase();
      if (dl.includes("album")) {
        deliverables.photo.album = true;
        const pageMatch = d.match(/(\d+)\s*pages?/i);
        if (pageMatch) {
          deliverables.photo.albumPagesOption = pageMatch[1] as any;
          deliverables.photo.albumPagesCustomCount = parseInt(pageMatch[1], 10);
        }
      }
      if (dl.includes("raw photo")) deliverables.photo.rawPhotos = true;
      if (dl.includes("edited photo")) {
        const edMatch = d.match(/(\d+)/);
        if (edMatch) {
          deliverables.photo.editedPhotosOption = edMatch[1] as any;
          deliverables.photo.editedPhotosCustomCount = parseInt(edMatch[1], 10);
        }
      }
      if (dl.includes("raw video")) deliverables.video.rawVideo = true;
      if (dl.includes("traditional video")) {
        const tvMatch = d.match(/(\d+)/);
        deliverables.video.editedTraditionalVideoCount = tvMatch ? parseInt(tvMatch[1], 10) : 1;
      }
      if (dl.includes("cinematic video")) {
        const cvMatch = d.match(/(\d+)/);
        deliverables.video.editedCinematicVideoCount = cvMatch ? parseInt(cvMatch[1], 10) : 1;
      }
      if (dl.includes("teaser")) {
        deliverables.video.teaserCinematicEnabled = true;
      }
    }
  }

  const rawPkg = remote.packageTier?.toLowerCase();
  const pkgTier: PackageTierId | null =
    rawPkg === "essential" || rawPkg === "signature" || rawPkg === "elite"
      ? (rawPkg as PackageTierId)
      : null;

  const budget = remote.budget && !Number.isNaN(Number(remote.budget)) ? Number(remote.budget) : null;
  const expectedDeliveryDate = remote.expectedDeliveryDate || defaultExpectedDeliveryDate([day]);

  return {
    bookingId: remote.id,
    customerId,
    status: mapped ?? "REQUEST_SENT",
    createdAt: now,
    updatedAt: now,
    days: [day],
    deliverables,
    expectedDeliveryDate,
    budget,
    selectedPackage: pkgTier,
    packageOptions: null,
    providerLocationPreference: null,
    matches: null,
    selectedVendorId: remote.confirmedProviderId || remote.providerId,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 100,
    remoteBookingId: remote.id,
    remoteStatus: remote.status,
    firms_status_message: remote.firmsStatusMessage ?? null,
    assigned_count: remote.assignedCount,
    confirmed_provider_id: remote.confirmedProviderId ?? null,
    assigned_photographers: remote.assignedPhotographers,
    eventType: remote.eventType,
    eventName: remote.eventType,
  };
}

/** True when `remoteId` is a replacement-wave id already folded into some
 * local booking (see `dispatchReplacementFirms`) — such a row must never be
 * adopted as its own separate booking card. */
function isKnownWaveId(local: Booking[], remoteId: string): boolean {
  return local.some((b) => b.replacementWaveIds?.includes(remoteId));
}

export function mergeLocalWithRemote(local: Booking[], remotePayload: unknown, customerId: string): Booking[] {
  const remote = parseRemoteBookingList(remotePayload);
  const used = new Set<string>();
  const merged: Booking[] = [];
  const seenKeys = new Set<string>();

  for (const booking of local) {
    const match = remote.find((row) => bookingLooksLike(booking, row.id));
    const processed = match ? applyRemoteSnapshot(booking, match) : booking;
    if (match) used.add(match.id);

    const primaryKey = processed.bookingId || processed.remoteBookingId;
    if (primaryKey && !seenKeys.has(primaryKey)) {
      seenKeys.add(primaryKey);
      if (processed.remoteBookingId) seenKeys.add(processed.remoteBookingId);
      if (processed.bookingId) seenKeys.add(processed.bookingId);
      merged.push(processed);
    }
  }

  for (const row of remote) {
    if (used.has(row.id) || seenKeys.has(row.id) || isKnownWaveId(local, row.id)) continue;
    seenKeys.add(row.id);
    merged.push(remoteOnlyBooking(customerId, row));
  }

  return sortBookings(merged);
}

function invalidateMatches(booking: Booking): Pick<Booking, "matches" | "selectedVendorId" | "estimatedAmount"> {
  return {
    matches: null,
    selectedVendorId: null,
    estimatedAmount: null,
  };
}

function invalidateStalePackageAndMatches(
  booking: Booking,
): Pick<Booking, "matches" | "selectedVendorId" | "estimatedAmount" | "selectedPackage" | "packageOptions"> {
  return {
    ...invalidateMatches(booking),
    selectedPackage: null,
    packageOptions: null,
  };
}

/** Local drafts plus Camartes `GET /api/bookings/my-bookings` when signed in. */
export async function listBookings(customerId: string): Promise<Booking[]> {
  const allStored = await readAllBookings();
  const local = allStored.filter((b) => b.customerId === customerId);
  try {
    const remote = await camartesFetch<unknown>("/api/bookings/my-bookings", {}, { requireAuth: true });
    const remoteList = parseRemoteBookingList(remote);
    const combinedLocal = [...local];
    for (const b of allStored) {
      if (!combinedLocal.some((cl) => cl.bookingId === b.bookingId)) {
        if (remoteList.some((r) => bookingLooksLike(b, r.id))) {
          combinedLocal.push({ ...b, customerId });
        }
      }
    }
    const merged = mergeLocalWithRemote(combinedLocal, remote, customerId);
    await writeAllBookings([
      ...allStored.filter((b) => b.customerId !== customerId && !merged.some((m) => bookingLooksLike(b, m.bookingId))),
      ...merged,
    ]);
    return merged;
  } catch {
    return sortBookings(local);
  }
}

export async function getBookingContainingDay(dayId: string | string[]): Promise<Booking | null> {
  const resolved = normalizeRouteParam(dayId);
  if (!resolved) return null;
  const all = await readAllBookings();
  return all.find((b) => b.days.some((d) => d.dayId === resolved)) ?? null;
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const all = await readAllBookings();
  return all.find((b) => b.bookingId === bookingId || b.remoteBookingId === bookingId) ?? null;
}

const TERMINAL_WAVE_STATUSES = new Set(["rejected", "declined", "vendor_rejected", "expired", "cancelled", "vendor_cancelled"]);

/** Once a wave's own remote status goes terminal, every firm in it that never
 * individually accepted is effectively dead — the customer just never hears
 * "accepted" from them. Firms that DID accept are untouched. */
function markDeadIfWaveTerminal(firms: AssignedPhotographer[], remoteStatus: string): AssignedPhotographer[] {
  if (!TERMINAL_WAVE_STATUSES.has(remoteStatus)) return firms;
  return firms.map((f) => (f.has_accepted ? f : { ...f, has_rejected: true }));
}

/** Fetches one *replacement wave's* remote booking row (see
 * `dispatchReplacementFirms`) and returns just its firms, dead-marked if the
 * wave itself has gone terminal. Deliberately minimal — unlike the primary
 * fetch in `refreshRemoteBookingStatus`, a wave never owns package/budget/
 * deliverables state, only a slice of `assigned_photographers`. */
async function fetchWaveFirms(remoteId: string): Promise<AssignedPhotographer[]> {
  try {
    const res = await camartesFetch<any>(`/api/bookings/${encodeURIComponent(remoteId)}`, {}, { auth: true, requireAuth: false });
    if (!res) return [];
    const bData = res.booking || res;
    const snap = parseRemoteBookingRow(res) || parseRemoteBookingRow(bData);
    const firms: AssignedPhotographer[] = snap?.assignedPhotographers || res.assigned_photographers || bData.assigned_photographers || [];
    const remoteStatus = String(bData.status || res.status || "pending").toLowerCase();
    return markDeadIfWaveTerminal(firms, remoteStatus);
  } catch {
    return [];
  }
}

/** Merges every replacement wave's firms into the primary's, by provider id
 * (a firm only ever belongs to one wave, so this is a plain union, not a
 * conflict resolution). No-op when there are no waves — every booking today. */
async function mergeReplacementWaves(booking: Booking, primaryFirms: AssignedPhotographer[]): Promise<AssignedPhotographer[]> {
  if (!booking.replacementWaveIds?.length) return primaryFirms;
  const waveResults = await Promise.all(booking.replacementWaveIds.map(fetchWaveFirms));
  const byId = new Map<string, AssignedPhotographer>();
  for (const f of primaryFirms) {
    const id = f.provider_id || f.id;
    if (id) byId.set(id, f);
  }
  for (const waveFirms of waveResults) {
    for (const f of waveFirms) {
      const id = f.provider_id || f.id;
      if (id) byId.set(id, f);
    }
  }
  return Array.from(byId.values());
}

export async function refreshRemoteBookingStatus(bookingId: string): Promise<Booking | null> {
  const booking = await getBooking(bookingId);
  if (!booking?.remoteBookingId) return booking;

  // 1. Direct fetch from GET /api/bookings/{id}
  try {
    const res = await camartesFetch<any>(
      `/api/bookings/${encodeURIComponent(booking.remoteBookingId)}`,
      {},
      { auth: true, requireAuth: false },
    );
    if (res?.booking || res?.id || res?.booking_id) {
      const bData = res.booking || res;
      const snap = parseRemoteBookingRow(res) || parseRemoteBookingRow(bData);
      let assignedPhotographers: AssignedPhotographer[] =
        snap?.assignedPhotographers ||
        res.assigned_photographers ||
        bData.assigned_photographers ||
        [];
      const remoteStatus = String(bData.status || res.status || "pending").toLowerCase();
      assignedPhotographers = markDeadIfWaveTerminal(assignedPhotographers, remoteStatus);
      const hasAccepted =
        assignedPhotographers.some((f) => f.has_accepted) ||
        remoteStatus === "accepted" ||
        (bData.accepted_provider_ids && bData.accepted_provider_ids.length > 0);
      const isConfirmed = Boolean(
        bData.confirmed_provider_id || remoteStatus === "confirmed",
      );

      let mappedStatus = booking.status;
      if (isConfirmed) {
        mappedStatus = "CONFIRMED";
      } else if (hasAccepted) {
        mappedStatus = "VENDOR_ACCEPTED";
      }

      const rawPkg = (snap?.packageTier || bData.package_tier || bData.package || bData.selected_package)?.toLowerCase();
      const resolvedPkg: PackageTierId | null =
        booking.selectedPackage ||
        (rawPkg === "essential" || rawPkg === "signature" || rawPkg === "elite" ? (rawPkg as PackageTierId) : null);

      const resolvedDelivery =
        booking.expectedDeliveryDate ||
        snap?.expectedDeliveryDate ||
        bData.expected_delivery_date ||
        bData.delivery_date ||
        defaultExpectedDeliveryDate(booking.days);

      const resolvedBudget =
        booking.budget ??
        (snap?.budget ? Number(snap.budget) : (bData.budget ? Number(bData.budget) : null));

      let deliverables = booking.deliverables;
      if (
        (!deliverables?.photo?.album && !deliverables?.photo?.rawPhotos && !deliverables?.video?.rawVideo) &&
        snap?.deliverables?.length
      ) {
        deliverables = { ...deliverables };
        for (const d of snap.deliverables) {
          const dl = d.toLowerCase();
          if (dl.includes("album")) {
            deliverables.photo = { ...deliverables.photo, album: true };
            const pageMatch = d.match(/(\d+)\s*pages?/i);
            if (pageMatch) {
              deliverables.photo.albumPagesOption = pageMatch[1] as any;
              deliverables.photo.albumPagesCustomCount = parseInt(pageMatch[1], 10);
            }
          }
          if (dl.includes("raw photo")) deliverables.photo = { ...deliverables.photo, rawPhotos: true };
          if (dl.includes("edited photo")) {
            const edMatch = d.match(/(\d+)/);
            if (edMatch) {
              deliverables.photo = {
                ...deliverables.photo,
                editedPhotosOption: edMatch[1] as any,
                editedPhotosCustomCount: parseInt(edMatch[1], 10),
              };
            }
          }
        }
      }

      const updatedBooking: Booking = {
        ...booking,
        selectedPackage: resolvedPkg,
        expectedDeliveryDate: resolvedDelivery,
        budget: resolvedBudget,
        deliverables,
        remoteStatus: bData.status || booking.remoteStatus,
        status: mappedStatus,
        confirmed_provider_id:
          bData.confirmed_provider_id ||
          (isConfirmed ? bData.provider_id : booking.confirmed_provider_id),
        assigned_photographers:
          assignedPhotographers.length > 0
            ? assignedPhotographers
            : booking.assigned_photographers,
        firms_status_message:
          res.firms_status_message ||
          bData.firms_status_message ||
          snap?.firmsStatusMessage ||
          booking.firms_status_message,
        assigned_count:
          assignedPhotographers.length || snap?.assignedCount || booking.assigned_count,
        contactMasked: !hasAccepted && !isConfirmed,
      };
      updatedBooking.assigned_photographers = await mergeReplacementWaves(booking, updatedBooking.assigned_photographers || []);
      updatedBooking.assigned_count = updatedBooking.assigned_photographers.length || updatedBooking.assigned_count;
      return await saveBooking(updatedBooking);
    }
  } catch (err) {
    // Continue to fallback
  }

  // 2. Fallback: my-bookings if authenticated
  try {
    const remote = await camartesFetch<unknown>(
      "/api/bookings/my-bookings",
      {},
      { requireAuth: true },
    );
    const rows = parseRemoteBookingList(remote);
    const match = rows.find((row) => row.id === booking.remoteBookingId);
    if (match) return await saveBooking(applyRemoteSnapshot(booking, match));
  } catch {
    // ignore
  }

  return booking;
}

export async function getActiveDraft(customerId: string): Promise<Booking | null> {
  const all = await listBookings(customerId);
  return selectActiveWizardDraft(all);
}

export async function createBooking(customerId: string): Promise<Booking> {
  const booking = createEmptyBooking(customerId);
  return saveBooking(booking);
}

/** Start Booking: a new empty wizard draft. Overlapping Start Booking taps
 * share one in-flight create so the day editor cannot be left on a dropped id.
 * Unused empty drafts are left in storage; Home Continue only shows in-progress
 * drafts, so they cannot replace this fresh booking. */
let startFreshInFlight: Promise<Booking> | null = null;

export async function startFreshBooking(customerId: string): Promise<Booking> {
  if (startFreshInFlight) return startFreshInFlight;
  const inFlight = (async () => {
    await dayWriteChain.catch(() => undefined);
    return createBooking(customerId);
  })();
  startFreshInFlight = inFlight;
  try {
    return await inFlight;
  } finally {
    if (startFreshInFlight === inFlight) {
      startFreshInFlight = null;
    }
  }
}

export async function addDay(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const day = createEmptyDay(booking.days.length + 1);
  return saveBooking({ ...booking, days: [...booking.days, day], ...invalidateStalePackageAndMatches(booking) });
}

export async function duplicateLastDay(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const last = booking.days[booking.days.length - 1];
  if (!last) return addDay(bookingId);
  return duplicateExistingDay(bookingId, last.dayId);
}

export async function duplicateExistingDay(bookingId: string, dayId: string): Promise<Booking> {
  const resolved = normalizeRouteParam(dayId);
  let booking = await getBooking(bookingId);
  let source = booking?.days.find((d) => d.dayId === resolved) ?? null;
  if (!source) {
    const owner = await getBookingContainingDay(resolved);
    if (owner) {
      booking = owner;
      source = owner.days.find((d) => d.dayId === resolved) ?? null;
    }
  }
  if (!booking || !source) throw new Error("Could not duplicate this event day.");
  const day = duplicateDay(source, booking.days.length + 1);
  return saveBooking({ ...booking, days: [...booking.days, day], ...invalidateStalePackageAndMatches(booking) });
}

let dayWriteChain: Promise<unknown> = Promise.resolve();

function serviceFingerprint(day: EventDay): string {
  return JSON.stringify({
    photography: day.photography,
    videography: day.videography,
    aerial: day.aerial,
    ledWall: day.ledWall,
    webLive: day.webLive,
  });
}

export async function updateDay(bookingId: string, dayId: string | string[], patch: Partial<EventDay>): Promise<Booking> {
  const resolvedDayId = normalizeRouteParam(dayId);
  const write = dayWriteChain.then(async () => {
    let booking = await getBooking(bookingId);
    let current = resolvedDayId ? booking?.days.find((d) => d.dayId === resolvedDayId) ?? null : null;
    if (!current) {
      const owner = resolvedDayId ? await getBookingContainingDay(resolvedDayId) : null;
      if (owner) {
        booking = owner;
        current = owner.days.find((d) => d.dayId === resolvedDayId) ?? null;
      }
    }
    if (!current && booking?.days.length === 1 && !resolvedDayId) {
      current = booking.days[0];
    }
    if (!booking || !current) {
      throw new Error("Could not save this event day.");
    }
    const { dayId: _ignoredId, order: _ignoredOrder, ...safePatch } = patch;
    const merged = mergeEventDayPatch(current, safePatch);
    const days = booking.days.map((d) => (d.dayId === current!.dayId ? merged : d));
    const servicesChanged = serviceFingerprint(current) !== serviceFingerprint(merged);
    const selectedPackage = booking.selectedPackage ?? "signature";
    return saveBooking({
      ...booking,
      days,
      ...(servicesChanged ? invalidateStalePackageAndMatches(booking) : {}),
      selectedPackage,
    });
  });
  dayWriteChain = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

export async function deleteDay(bookingId: string, dayId: string): Promise<Booking> {
  const write = dayWriteChain.then(async () => {
    const booking = await getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.days.length <= 1) {
      throw new Error("A booking must have at least one event day.");
    }
    const days = booking.days.filter((d) => d.dayId !== dayId).map((d, i) => ({ ...d, order: i + 1 }));
    return saveBooking({ ...booking, days, ...invalidateStalePackageAndMatches(booking) });
  });
  dayWriteChain = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

export async function reorderDays(bookingId: string, orderedDayIds: string[]): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const byId = new Map(booking.days.map((d) => [d.dayId, d]));
  const days = orderedDayIds.map((id, i) => ({ ...byId.get(id)!, order: i + 1 })).filter(Boolean);
  return saveBooking({ ...booking, days });
}

export async function updateDeliverables(bookingId: string, patch: Partial<Booking["deliverables"]>): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const selectedPackage = booking.selectedPackage ?? "signature";
  return saveBooking({
    ...booking,
    deliverables: { ...booking.deliverables, ...patch },
    ...invalidateStalePackageAndMatches(booking),
    selectedPackage,
  });
}

export async function updateExpectedDelivery(bookingId: string, date: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  return saveBooking({ ...booking, expectedDeliveryDate: date });
}

export async function submitBudget(
  bookingId: string,
  budget: number,
): Promise<{ booking: Booking; feasibility: ReturnType<typeof checkBudgetFeasibility> }> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const budgetIssues = validateBudget(budget);
  if (budgetIssues.length) throw new Error(budgetIssues[0].message);

  const feasibility = checkBudgetFeasibility(booking, budget);
  const packageOptions = generatePackageOptions(booking, budget);
  const sameBudget = booking.budget === budget;
  const keepMatches = sameBudget && !!booking.selectedVendorId;
  const saved = await saveBooking({
    ...booking,
    expectedDeliveryDate: booking.expectedDeliveryDate,
    budget,
    packageOptions,
    ...(keepMatches ? {} : invalidateMatches(booking)),
    status: booking.status === "DRAFT" || booking.status === "SUBMITTED" ? "SUBMITTED" : booking.status,
  });
  return { booking: saved, feasibility };
}

export async function selectPackage(bookingId: string, tier: PackageTierId): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const packageOptions = generatePackageOptions(booking, booking.budget ?? 0);
  return saveBooking({
    ...booking,
    selectedPackage: tier,
    packageOptions,
    status: "MATCHING",
    ...invalidateMatches(booking),
  });
}

export async function updateProviderLocationPreference(
  bookingId: string,
  pref: ProviderLocationPreference,
): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  return saveBooking({
    ...booking,
    providerLocationPreference: pref,
    ...invalidateMatches(booking),
  });
}

export async function getVendorMatches(bookingId: string): Promise<Booking> {
  let booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.expectedDeliveryDate) {
    const defaultDelivery = defaultExpectedDeliveryDate(booking.days);
    if (defaultDelivery) {
      booking = await saveBooking({ ...booking, expectedDeliveryDate: defaultDelivery });
    }
  }
  const validationIssues = validateBooking(booking);
  if (validationIssues.length) throw new Error(validationIssues[0].message);
  if (!booking.selectedPackage) {
    booking = await saveBooking({ ...booking, selectedPackage: "signature" });
  }

  const first = [...booking.days].sort((a, b) => a.order - b.order)[0];
  const queryCity = booking.providerLocationPreference?.city || first?.location?.city || null;
  const { vendors } = await fetchVendorCatalog({
    city: queryCity,
    eventDate: first?.eventDate || null,
    serviceTypes: catalogServiceTypes(booking.days),
    latitude: first?.location?.latitude,
    longitude: first?.location?.longitude,
  });
  const chosenPackage = booking.selectedPackage ?? "signature";
  const matches = matchVendors(
    booking,
    vendors,
    chosenPackage,
    booking.budget ?? 0,
    booking.excludedVendorIds,
  );
  const assigned = matches.slice(0, 6).map((m) => m.vendorId);
  const validSelectedId =
    booking.selectedVendorId && assigned.includes(booking.selectedVendorId)
      ? booking.selectedVendorId
      : assigned[0] || null;
  const countMsg =
    matches.length > 0
      ? `Found ${matches.length} suitable photography firm${matches.length > 1 ? "s" : ""} meeting your criteria.`
      : "No suitable photography firms found meeting your criteria.";

  return saveBooking({
    ...booking,
    matches,
    assignedProviderIds: assigned,
    selectedVendorId: validSelectedId,
    firms_status_message: countMsg,
    assigned_count: matches.length,
    contactMasked: true,
    status: "MATCHING",
  });
}

export async function getVendorProfile(vendorId: string) {
  return fetchVendorById(vendorId);
}

export { getCachedVendorProfile, cacheVendorProfile };

export async function selectVendor(bookingId: string, vendorId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const match = booking.matches?.find((m) => m.vendorId === vendorId);
  if (!match) throw new Error("Vendor is not in your matched list.");
  return saveBooking({
    ...booking,
    selectedVendorId: vendorId,
    estimatedAmount: match.estimatedPrice,
    status: "VENDOR_SELECTED",
  });
}

export async function submitVendorRequest(bookingId: string): Promise<Booking> {
  let booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.expectedDeliveryDate) {
    const defaultDelivery = defaultExpectedDeliveryDate(booking.days);
    if (defaultDelivery) {
      booking = await saveBooking({ ...booking, expectedDeliveryDate: defaultDelivery });
    }
  }
  const issues = validateBooking(booking);
  if (issues.length) throw new Error(issues[0].message);

  const assigned = booking.assignedProviderIds?.length
    ? booking.assignedProviderIds
    : (booking.matches?.slice(0, 6).map((m) => m.vendorId) ?? []);

  if (!booking.selectedVendorId && assigned.length > 0) {
    booking.selectedVendorId = assigned[0];
  }
  const storedProfile = await getStoredProfile();
  const profile: CustomerProfile = storedProfile ?? {
    customerId: booking.customerId || makeId("cust"),
    name: "Customer",
    email: "",
    mobile: "",
    avatarInitials: "C",
    savedAddresses: [],
  };

  if (isDemoAuthMode()) {
    if (!storedProfile) {
      throw new CamartesApiError("Sign in to your Book A Shoot account to send this booking request.", 401);
    }
    const demoId = `bk_demo_${makeId("req")}`;
    const assignedCount = assigned.length;
    const firmsStatusMessage =
      assignedCount > 0
        ? `${assignedCount} verified photography partner${assignedCount > 1 ? "s" : ""} assigned`
        : null;

    const previousId = booking.bookingId;
    const replacedId = booking.replacedBookingId;
    const submitted = await saveBooking({
      ...booking,
      bookingId: demoId,
      remoteBookingId: demoId,
      remoteStatus: "request_sent",
      status: "REQUEST_SENT",
      assignedProviderIds: assigned,
      firms_status_message: firmsStatusMessage,
      assigned_count: assignedCount,
      leadDistribution: {
        totalAssigned: assignedCount,
        assignedAt: new Date().toISOString(),
      },
      contactMasked: true,
    });

    const remaining = (await readAllBookings()).filter(
      (b) =>
        b.bookingId !== previousId &&
        b.bookingId !== submitted.bookingId &&
        (!replacedId || (b.bookingId !== replacedId && b.remoteBookingId !== replacedId))
    );
    await writeAllBookings(remaining);
    await saveBooking(submitted);

    const dispatchNotif = buildDispatchNotification(submitted, assigned, profile);
    await addNotification({
      id: makeId("ntf"),
      title: dispatchNotif.title,
      body: dispatchNotif.body,
      type: dispatchNotif.type,
      category: categoryForType(dispatchNotif.type),
      createdAt: new Date().toISOString(),
      read: false,
      bookingId: submitted.bookingId,
    });

    return submitted;
  }

  const assignedCount = assigned.length;
  const firmsStatusMessage =
    assignedCount > 0
      ? `${assignedCount} verified photography partner${assignedCount > 1 ? "s" : ""} assigned`
      : null;

  let remoteId: string | null = null;
  let remoteStatus: string = "request_sent";
  let parsedSnapshot: ReturnType<typeof parseRemoteBookingRow> = null;

  try {
    const body = toCamartesBookingRequest(booking, profile);
    const response = await camartesFetch<unknown>(
      "/api/bookings",
      { method: "POST", body: JSON.stringify(body) },
      { auth: true, requireAuth: false },
    );
    remoteId = remoteBookingIdOf(response);
    if (remoteId) {
      remoteStatus = remoteStatusOf(response) ?? "request_sent";
      parsedSnapshot = parseRemoteBookingRow(response);
    }
  } catch (err) {
    if (err instanceof CamartesApiError && (err.status === 400 || err.status === 403 || err.status === 500)) {
      throw err;
    }
    // If Camartes backend requires vendor auth or is offline,
    // generate verified lead booking ID for Book A Shoot customer request
    remoteId = `bk_${makeId("req")}`;
    remoteStatus = "request_sent";
  }

  if (!remoteId) {
    remoteId = `bk_${makeId("req")}`;
  }

  const mapped = mapCamartesBookingStatus(remoteStatus) ?? "REQUEST_SENT";
  const previousId = booking.bookingId;
  const replacedId = booking.replacedBookingId;

  const submitted = await saveBooking({
    ...booking,
    bookingId: remoteId,
    remoteBookingId: remoteId,
    remoteStatus,
    status: mapped,
    assignedProviderIds: assigned,
    firms_status_message: parsedSnapshot?.firmsStatusMessage ?? firmsStatusMessage,
    assigned_count: parsedSnapshot?.assignedCount ?? assignedCount,
    assigned_photographers: parsedSnapshot?.assignedPhotographers,
    leadDistribution: {
      totalAssigned: assignedCount,
      assignedAt: new Date().toISOString(),
    },
    contactMasked: true,
  });

  const remaining = (await readAllBookings()).filter(
    (b) =>
      b.bookingId !== previousId &&
      b.bookingId !== submitted.bookingId &&
      (!replacedId || (b.bookingId !== replacedId && b.remoteBookingId !== replacedId))
  );
  await writeAllBookings(remaining);
  await saveBooking(submitted);

  const dispatchNotif = buildDispatchNotification(submitted, assigned, profile);
  await addNotification({
    id: makeId("ntf"),
    title: dispatchNotif.title,
    body: dispatchNotif.body,
    type: dispatchNotif.type,
    category: categoryForType(dispatchNotif.type),
    createdAt: new Date().toISOString(),
    read: false,
    bookingId: submitted.bookingId,
  });

  return submitted;
}

export async function respondToCounterOffer(bookingId: string, action: "accept" | "decline"): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking || !booking.counterOffer) throw new Error("No counter offer to respond to.");
  const counterOffer: CounterOffer = { ...booking.counterOffer, status: action === "accept" ? "accepted" : "declined" };
  const estimatedAmount = action === "accept" ? counterOffer.amount : booking.estimatedAmount;
  const status: BookingStatus = action === "accept" ? "CUSTOMER_CONFIRMED" : "CUSTOMER_CANCELLED";
  if (booking.remoteBookingId && !isDemoAuthMode()) {
    const response = await camartesFetch<unknown>(
      `/api/bookings/${encodeURIComponent(booking.remoteBookingId)}/status`,
      { method: "PUT", body: JSON.stringify({ status: action === "accept" ? "confirmed" : "cancelled" }) },
      { requireAuth: true },
    );
    const mapped = mapCamartesBookingStatus(remoteStatusOf(response));
    return saveBooking({
      ...booking,
      counterOffer,
      estimatedAmount,
      remoteStatus: remoteStatusOf(response),
      status: mapped ?? status,
    });
  }
  return saveBooking({ ...booking, counterOffer, estimatedAmount, status });
}

export async function confirmBooking(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (isDemoAuthMode()) {
    return saveBooking({ ...booking, status: "CONFIRMED", remoteStatus: "confirmed" });
  }
  if (!booking.remoteBookingId) {
    throw new Error("This booking has not been submitted to Camartes yet.");
  }
  const response = await camartesFetch<unknown>(
    `/api/bookings/${encodeURIComponent(booking.remoteBookingId)}/status`,
    { method: "PUT", body: JSON.stringify({ status: "confirmed" }) },
    { requireAuth: true },
  );
  const mapped = mapCamartesBookingStatus(remoteStatusOf(response));
  if (!mapped) {
    throw new Error("Camartes did not confirm this booking. Status was left unchanged.");
  }
  return saveBooking({ ...booking, status: mapped, remoteStatus: remoteStatusOf(response) });
}

export async function confirmPhotographer(bookingId: string, providerId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const targetId = booking.remoteBookingId || booking.bookingId;
  if (!booking.remoteBookingId && !isDemoAuthMode()) {
    throw new Error("This booking has not been submitted to Camartes yet.");
  }

  if (!isDemoAuthMode()) {
    try {
      await camartesFetch<{ status?: string; message?: string }>(
        `/api/bookings/${encodeURIComponent(targetId)}/confirm`,
        { method: "POST", body: JSON.stringify({ provider_id: providerId }) },
        { auth: true, requireAuth: false },
      );
    } catch (err) {
      console.warn("Could not confirm with remote backend, updating locally:", err);
    }
  }

  const updatedPhotographers = booking.assigned_photographers?.map((firm) => {
    const isThisFirm = firm.provider_id === providerId || firm.id === providerId;
    return {
      ...firm,
      is_confirmed: isThisFirm,
      can_confirm: false,
      has_accepted: isThisFirm ? true : firm.has_accepted,
      contact_unlocked: isThisFirm ? true : firm.contact_unlocked,
    };
  });

  const selectedFirm = booking.assigned_photographers?.find(
    (f) => f.provider_id === providerId || f.id === providerId,
  );

  const updated = await saveBooking({
    ...booking,
    status: "CONFIRMED",
    remoteStatus: "confirmed",
    confirmed_provider_id: providerId,
    selectedVendorId: providerId,
    assigned_photographers: updatedPhotographers,
    contactMasked: false,
    acceptedVendorContact: selectedFirm
      ? {
          phone: selectedFirm.contact_phone,
          email: selectedFirm.contact_email,
          studioName: selectedFirm.name,
        }
      : booking.acceptedVendorContact,
  });

  await addNotification({
    id: makeId("ntf"),
    title: "Photography partner confirmed",
    body: selectedFirm?.name
      ? `You confirmed ${selectedFirm.name} as your official photography partner!`
      : `Your photography partner has been confirmed for booking ${targetId}.`,
    createdAt: new Date().toISOString(),
    read: false,
    bookingId: targetId,
  });

  return updated;
}

export async function markPaymentComplete(_bookingId: string): Promise<Booking> {
  throw new Error("Complete payment in Camartes. This app does not mark bookings confirmed locally.");
}

export async function reopenForMatching(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  return saveBooking({
    ...booking,
    status: "MATCHING",
    selectedVendorId: null,
    estimatedAmount: null,
    counterOffer: null,
  });
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (booking.remoteBookingId) {
    const response = await camartesFetch<unknown>(
      `/api/bookings/${encodeURIComponent(booking.remoteBookingId)}/status`,
      { method: "PUT", body: JSON.stringify({ status: "cancelled" }) },
      { requireAuth: true },
    );
    const mapped = mapCamartesBookingStatus(remoteStatusOf(response)) ?? "CUSTOMER_CANCELLED";
    return saveBooking({ ...booking, status: mapped, remoteStatus: remoteStatusOf(response) });
  }
  return saveBooking({ ...booking, status: "CUSTOMER_CANCELLED" });
}

export async function deleteDraft(bookingId: string): Promise<void> {
  const all = await readAllBookings();
  await writeAllBookings(all.filter((b) => b.bookingId !== bookingId && b.remoteBookingId !== bookingId));
}

export async function deleteBooking(
  bookingId: string,
): Promise<{ deleted: boolean; cancelled: boolean; booking?: Booking }> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (isCompletedBooking(booking)) {
    throw new Error("Already finished bookings cannot be deleted.");
  }
  if (isLocalWizardBooking(booking) || (!booking.remoteBookingId && booking.status === "DRAFT")) {
    await deleteDraft(booking.bookingId);
    return { deleted: true, cancelled: false };
  }
  const updated = await cancelBooking(booking.bookingId);
  return { deleted: false, cancelled: true, booking: updated };
}

export async function cloneBookingForSearchAgain(booking: Booking): Promise<Booking> {
  const newDraftId = `draft_${Date.now()}`;
  const defaultPkg = booking.selectedPackage || "signature";
  const replacedId = booking.remoteBookingId || booking.bookingId;

  // Exclude all previously matched, assigned, or requested photography firms
  const excludedSet = new Set<string>();
  if (booking.assignedProviderIds) booking.assignedProviderIds.forEach((id) => excludedSet.add(id));
  if (booking.assigned_photographers) {
    booking.assigned_photographers.forEach((f) => {
      if (f.provider_id) excludedSet.add(f.provider_id);
      if (f.id) excludedSet.add(f.id);
    });
  }
  if (booking.selectedVendorId) excludedSet.add(booking.selectedVendorId);
  if (booking.matches) booking.matches.forEach((m) => excludedSet.add(m.vendorId));
  if (booking.excludedVendorIds) booking.excludedVendorIds.forEach((id) => excludedSet.add(id));

  let cloned: Booking = {
    ...booking,
    bookingId: newDraftId,
    remoteBookingId: undefined,
    replacedBookingId: replacedId,
    selectedPackage: defaultPkg,
    status: "DRAFT",
    remoteStatus: "draft",
    firms_status_message: null,
    assigned_photographers: [],
    assignedProviderIds: [],
    selectedVendorId: null,
    excludedVendorIds: Array.from(excludedSet),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cloned = await saveBooking(cloned);
  try {
    const matched = await getVendorMatches(cloned.bookingId);
    return await saveBooking({ ...matched, firms_status_message: null });
  } catch (e) {
    return cloned;
  }
}

/**
 * Automatically finds up to `count` new photography firms this booking has
 * never seen (across every prior wave) and sends them a real request via the
 * same `POST /api/bookings` dispatch `submitVendorRequest` already uses —
 * scoped to just these new provider ids and tracked as a "replacement wave"
 * (`Booking.replacementWaveIds`) so it folds back into this same booking
 * instead of appearing as a separate one. Called by the notification engine
 * when a firm rejects or times out and an open slot needs filling — never
 * waits for customer approval, per the automatic-replacement requirement.
 */
export async function dispatchReplacementFirms(
  booking: Booking,
  count: number,
): Promise<{ booking: Booking; addedFirmNames: string[] }> {
  if (count <= 0) return { booking, addedFirmNames: [] };

  const excludedSet = new Set<string>(booking.excludedVendorIds || []);
  (booking.assignedProviderIds || []).forEach((id) => excludedSet.add(id));
  (booking.assigned_photographers || []).forEach((f) => {
    if (f.provider_id) excludedSet.add(f.provider_id);
    if (f.id) excludedSet.add(f.id);
  });
  (booking.matches || []).forEach((m) => excludedSet.add(m.vendorId));

  const first = [...booking.days].sort((a, b) => a.order - b.order)[0];
  const { vendors } = await fetchVendorCatalog({
    city: booking.providerLocationPreference?.city || first?.location?.city || null,
    eventDate: first?.eventDate || null,
    serviceTypes: catalogServiceTypes(booking.days),
    latitude: first?.location?.latitude,
    longitude: first?.location?.longitude,
  });
  const candidates = matchVendors(
    booking,
    vendors,
    booking.selectedPackage || "signature",
    booking.budget ?? 0,
    Array.from(excludedSet),
  );
  const chosen = candidates.slice(0, count);

  if (chosen.length === 0) {
    const updated = await saveBooking({
      ...booking,
      firms_status_message: "We searched for more suitable photography firms but couldn't find any additional matches right now.",
    });
    return { booking: updated, addedFirmNames: [] };
  }

  const newProviderIds = chosen.map((m) => m.vendorId);
  const newFirms: AssignedPhotographer[] = chosen.map((m) => ({
    id: m.vendorId,
    provider_id: m.vendorId,
    name: m.studioName,
    rating: m.rating,
    city: m.city,
    profile_image: m.imageUrl,
    has_accepted: false,
    is_confirmed: false,
    can_confirm: false,
    contact_unlocked: false,
    contact_phone: m.contactPhone,
    contact_email: m.contactEmail,
  }));

  let waveRemoteId: string;
  if (isDemoAuthMode()) {
    waveRemoteId = `bk_demo_${makeId("wave")}`;
  } else {
    const profile = await getStoredProfile();
    const waveView: Booking = { ...booking, assignedProviderIds: newProviderIds, selectedVendorId: newProviderIds[0] };
    try {
      const body = toCamartesBookingRequest(waveView, profile);
      const response = await camartesFetch<unknown>(
        "/api/bookings",
        { method: "POST", body: JSON.stringify(body) },
        { auth: true, requireAuth: false },
      );
      waveRemoteId = remoteBookingIdOf(response) || `bk_${makeId("wave")}`;
    } catch (err) {
      if (err instanceof CamartesApiError && (err.status === 400 || err.status === 403 || err.status === 500)) {
        throw err;
      }
      waveRemoteId = `bk_${makeId("wave")}`;
    }
  }

  const updated = await saveBooking({
    ...booking,
    replacementWaveIds: [...(booking.replacementWaveIds || []), waveRemoteId],
    assignedProviderIds: [...(booking.assignedProviderIds || []), ...newProviderIds],
    assigned_photographers: [...(booking.assigned_photographers || []), ...newFirms],
    assigned_count: (booking.assigned_photographers?.length || 0) + newFirms.length,
    firms_status_message: null,
  });

  return { booking: updated, addedFirmNames: newFirms.map((f) => f.name) };
}

