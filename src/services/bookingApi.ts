/**
 * Booking service layer.
 *
 * Wizard drafts stay on-device (Camartes has no draft-booking API).
 * Provider matching reads the live catalog. Submitting a request calls
 * `POST /api/bookings`. Status after that comes from Camartes, never from
 * a client-side accept/reject simulator.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Booking, BookingStatus, CounterOffer, EventDay, PackageTierId } from "@/src/types/booking";
import { createEmptyBooking, createEmptyDay, duplicateDay, mergeEventDayPatch } from "@/src/domain/defaults";
import { normalizeRouteParam } from "@/src/utils/routeParam";
import {
  applyRemoteSnapshot,
  catalogServiceTypes,
  isLocalWizardBooking,
  parseRemoteBookingList,
  remoteBookingIdOf,
  remoteStatusOf,
  selectActiveWizardDraft,
  toCamartesBookingRequest,
  mapCamartesBookingStatus,
} from "@/src/domain/bookingRequest";
import { checkBudgetFeasibility, generatePackageOptions } from "@/src/engine/pricing";
import { matchVendors } from "@/src/engine/matching";
import { defaultExpectedDeliveryDate, validateBooking, validateBudget } from "@/src/engine/validation";
import { fetchVendorById, fetchVendorCatalog } from "@/src/services/vendorApi";
import { camartesFetch, CamartesApiError, getAuthToken } from "@/src/services/camartesClient";
import { getStoredProfile } from "@/src/services/authApi";
import { makeId } from "@/src/utils/id";
import { addNotification } from "@/src/services/notificationsStore";

const BOOKINGS_KEY = "camartes-customer:bookings:v1";

async function readAllBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

async function writeAllBookings(bookings: Booking[]): Promise<void> {
  await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
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

async function saveBooking(booking: Booking): Promise<Booking> {
  const next = touch({ ...booking, draftCompletionPct: computeCompletionPct(booking) });
  const all = await readAllBookings();
  const idx = all.findIndex((b) => b.bookingId === next.bookingId || (next.remoteBookingId && b.remoteBookingId === next.remoteBookingId));
  if (idx === -1) all.unshift(next);
  else all[idx] = next;
  await writeAllBookings(all);
  return next;
}

function bookingLooksLike(local: Booking, remoteId: string): boolean {
  return local.bookingId === remoteId || local.remoteBookingId === remoteId;
}

function remoteOnlyBooking(customerId: string, remote: ReturnType<typeof parseRemoteBookingList>[number]): Booking {
  const mapped = mapCamartesBookingStatus(remote.status);
  const now = new Date().toISOString();
  const day = createEmptyDay(1);
  if (remote.eventDate) day.eventDate = remote.eventDate;
  if (remote.eventTime) day.startTime = remote.eventTime;
  const budget = remote.budget && !Number.isNaN(Number(remote.budget)) ? Number(remote.budget) : null;
  return {
    bookingId: remote.id,
    customerId,
    status: mapped ?? "REQUEST_SENT",
    createdAt: now,
    updatedAt: now,
    days: [day],
    deliverables: createEmptyBooking(customerId).deliverables,
    expectedDeliveryDate: null,
    budget,
    selectedPackage: null,
    packageOptions: null,
    matches: null,
    selectedVendorId: remote.providerId,
    estimatedAmount: null,
    counterOffer: null,
    draftCompletionPct: 100,
    remoteBookingId: remote.id,
    remoteStatus: remote.status,
  };
}

export function mergeLocalWithRemote(local: Booking[], remotePayload: unknown, customerId: string): Booking[] {
  const remote = parseRemoteBookingList(remotePayload);
  const used = new Set<string>();
  const merged = local.map((booking) => {
    const match = remote.find((row) => bookingLooksLike(booking, row.id));
    if (!match) return booking;
    used.add(match.id);
    return applyRemoteSnapshot(booking, match);
  });
  for (const row of remote) {
    if (used.has(row.id)) continue;
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
  const local = (await readAllBookings()).filter((b) => b.customerId === customerId);
  const token = await getAuthToken();
  if (!token) return sortBookings(local);
  try {
    const remote = await camartesFetch<unknown>("/api/bookings/my-bookings", {}, { requireAuth: true });
    const merged = mergeLocalWithRemote(local, remote, customerId);
    await writeAllBookings([
      ...(await readAllBookings()).filter((b) => b.customerId !== customerId),
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

export async function refreshRemoteBookingStatus(bookingId: string): Promise<Booking | null> {
  const booking = await getBooking(bookingId);
  if (!booking?.remoteBookingId) return booking;
  const token = await getAuthToken();
  if (!token) return booking;
  const remote = await camartesFetch<unknown>("/api/bookings/my-bookings", {}, { requireAuth: true });
  const rows = parseRemoteBookingList(remote);
  const match = rows.find((row) => row.id === booking.remoteBookingId);
  if (!match) return booking;
  return saveBooking(applyRemoteSnapshot(booking, match));
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
    return saveBooking({
      ...booking,
      days,
      ...(servicesChanged ? invalidateStalePackageAndMatches(booking) : {}),
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
  return saveBooking({ ...booking, deliverables: { ...booking.deliverables, ...patch }, ...invalidateStalePackageAndMatches(booking) });
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
  const defaultDelivery = !booking.expectedDeliveryDate ? defaultExpectedDeliveryDate(booking.days) : null;
  const saved = await saveBooking({
    ...booking,
    expectedDeliveryDate: booking.expectedDeliveryDate ?? defaultDelivery,
    budget,
    packageOptions,
    ...invalidateMatches(booking),
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
  if (!booking.selectedPackage) throw new Error("Select a package before matching vendors.");

  const first = [...booking.days].sort((a, b) => a.order - b.order)[0];
  const { vendors } = await fetchVendorCatalog({
    city: first?.location.city || null,
    eventDate: first?.eventDate || null,
    serviceTypes: catalogServiceTypes(booking.days),
    latitude: first?.location.latitude,
    longitude: first?.location.longitude,
  });
  const matches = matchVendors(booking, vendors, booking.selectedPackage, booking.budget ?? 0);
  return saveBooking({ ...booking, matches, status: "MATCHING" });
}

export async function getVendorProfile(vendorId: string) {
  return fetchVendorById(vendorId);
}

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
  if (!booking.selectedVendorId) throw new Error("Select a service provider first.");
  if (!booking.selectedPackage) throw new Error("Select a package before sending a request.");

  const token = await getAuthToken();
  if (!token) {
    throw new CamartesApiError("Sign in to your Camartes account to send this booking request.", 401);
  }

  const profile = await getStoredProfile();
  const body = toCamartesBookingRequest(booking, profile);
  const response = await camartesFetch<unknown>(
    "/api/bookings",
    { method: "POST", body: JSON.stringify(body) },
    { requireAuth: true },
  );

  const remoteId = remoteBookingIdOf(response);
  if (!remoteId) {
    throw new Error("Camartes did not return a booking identifier. The request was not treated as confirmed.");
  }

  const remoteStatus = remoteStatusOf(response);
  const mapped = mapCamartesBookingStatus(remoteStatus) ?? "REQUEST_SENT";

  const previousId = booking.bookingId;
  const submitted = await saveBooking({
    ...booking,
    bookingId: remoteId,
    remoteBookingId: remoteId,
    remoteStatus,
    status: mapped,
  });

  if (previousId !== submitted.bookingId) {
    const remaining = (await readAllBookings()).filter((b) => b.bookingId !== previousId);
    await writeAllBookings(remaining);
    await saveBooking(submitted);
  }

  await addNotification({
    id: makeId("ntf"),
    title: "Booking request sent",
    body: `Your request ${submitted.bookingId} was sent to Camartes.`,
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
  if (booking.remoteBookingId) {
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
  if (isLocalWizardBooking(booking) || (!booking.remoteBookingId && booking.status === "DRAFT")) {
    await deleteDraft(booking.bookingId);
    return { deleted: true, cancelled: false };
  }
  const updated = await cancelBooking(booking.bookingId);
  return { deleted: false, cancelled: true, booking: updated };
}
