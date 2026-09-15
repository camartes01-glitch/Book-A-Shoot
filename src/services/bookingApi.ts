/**
 * Booking service layer.
 *
 * Wizard drafts stay on-device (Camartes has no draft-booking API).
 * Provider matching reads the live catalog. Submitting a request calls
 * `POST /api/bookings`. Status after that comes from Camartes, never from
 * a client-side accept/reject simulator.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Booking, BookingStatus, CounterOffer, EventDay, PackageTierId, ProviderLocationPreference } from "@/src/types/booking";
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
import { isCompletedBooking } from "@/src/domain/bookingFilters";
import { checkBudgetFeasibility, generatePackageOptions } from "@/src/engine/pricing";
import { matchVendors } from "@/src/engine/matching";
import { defaultExpectedDeliveryDate, validateBooking, validateBudget } from "@/src/engine/validation";
import { fetchVendorById, fetchVendorCatalog } from "@/src/services/vendorApi";
import { camartesFetch, CamartesApiError, getAuthToken } from "@/src/services/camartesClient";
import { getStoredProfile } from "@/src/services/authApi";
import { makeId } from "@/src/utils/id";
import { addNotification } from "@/src/services/notificationsStore";
import { isDemoAuthMode } from "@/src/config/authMode";

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
  return local.bookingId === remoteId || local.remoteBookingId === remoteId;
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
  if (!booking?.remoteBookingId || isDemoAuthMode()) return booking;
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
  if (!booking.selectedPackage) throw new Error("Select a package before matching vendors.");

  const first = [...booking.days].sort((a, b) => a.order - b.order)[0];
  const queryCity = booking.providerLocationPreference?.city || first?.location?.city || null;
  const { vendors } = await fetchVendorCatalog({
    city: queryCity,
    eventDate: first?.eventDate || null,
    serviceTypes: catalogServiceTypes(booking.days),
    latitude: first?.location?.latitude,
    longitude: first?.location?.longitude,
  });
  const matches = matchVendors(booking, vendors, booking.selectedPackage, booking.budget ?? 0);
  const assigned = matches.slice(0, 6).map((m) => m.vendorId);
  return saveBooking({
    ...booking,
    matches,
    assignedProviderIds: assigned,
    selectedVendorId: booking.selectedVendorId || assigned[0] || null,
    contactMasked: true,
    status: "MATCHING",
  });
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

  const assigned = booking.assignedProviderIds?.length
    ? booking.assignedProviderIds
    : (booking.matches?.slice(0, 6).map((m) => m.vendorId) ?? []);

  if (!booking.selectedVendorId && assigned.length > 0) {
    booking.selectedVendorId = assigned[0];
  }
  if (!booking.selectedVendorId) throw new Error("Select a service provider first.");
  if (!booking.selectedPackage) throw new Error("Select a package before sending a request.");

  const profile = await getStoredProfile();

  if (isDemoAuthMode()) {
    if (!profile) {
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

    const assignedCountText = assignedCount > 0 ? `${assignedCount} verified photography firms` : "Camartes";
    const notificationBody = firmsStatusMessage
      ? `${firmsStatusMessage} Contact details remain masked until a firm accepts.`
      : `Your request ${submitted.bookingId} was dispatched to ${assignedCountText}. Contact details remain masked until accepted.`;

    await addNotification({
      id: makeId("ntf"),
      title: "Lead request dispatched",
      body: notificationBody,
      createdAt: new Date().toISOString(),
      read: false,
      bookingId: submitted.bookingId,
    });

    return submitted;
  }

  const token = await getAuthToken();
  if (!token) {
    throw new CamartesApiError("Sign in to your Book A Shoot account to send this booking request.", 401);
  }

  const body = toCamartesBookingRequest(booking, profile);
  const response = await camartesFetch<unknown>(
    "/api/bookings",
    { method: "POST", body: JSON.stringify(body) },
    { requireAuth: true },
  );

  const parsedSnapshot = parseRemoteBookingRow(response);
  const remoteId = remoteBookingIdOf(response);
  if (!remoteId) {
    throw new Error("Camartes did not return a booking identifier. The request was not treated as confirmed.");
  }

  const remoteStatus = remoteStatusOf(response);
  const mapped = mapCamartesBookingStatus(remoteStatus) ?? "REQUEST_SENT";

  const rawResp = response as Record<string, unknown> | null;
  const firmsStatusMessage =
    parsedSnapshot?.firmsStatusMessage ??
    (typeof rawResp?.firms_status_message === "string" ? rawResp.firms_status_message : null);
  const assignedCount =
    parsedSnapshot?.assignedCount ??
    (typeof rawResp?.assigned_count === "number" ? rawResp.assigned_count : assigned.length);
  const assignedPhotographers = parsedSnapshot?.assignedPhotographers;

  const previousId = booking.bookingId;
  const replacedId = booking.replacedBookingId;
  const submitted = await saveBooking({
    ...booking,
    bookingId: remoteId,
    remoteBookingId: remoteId,
    remoteStatus,
    status: mapped,
    assignedProviderIds: assigned,
    firms_status_message: firmsStatusMessage,
    assigned_count: assignedCount,
    assigned_photographers: assignedPhotographers,
    leadDistribution: {
      totalAssigned: assignedCount || assigned.length,
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

  const assignedCountText = (assignedCount ?? assigned.length) > 0 ? `${assignedCount ?? assigned.length} verified photography firms` : "Camartes";
  const notificationBody = firmsStatusMessage
    ? `${firmsStatusMessage} Contact details remain masked until a firm accepts.`
    : `Your request ${submitted.bookingId} was dispatched to ${assignedCountText}. Contact details remain masked until accepted.`;

  await addNotification({
    id: makeId("ntf"),
    title: "Lead request dispatched",
    body: notificationBody,
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
    await camartesFetch<{ status?: string; message?: string }>(
      `/api/bookings/${encodeURIComponent(targetId)}/confirm`,
      { method: "POST", body: JSON.stringify({ provider_id: providerId }) },
      { requireAuth: true },
    );
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cloned = await saveBooking(cloned);
  try {
    const matched = await getVendorMatches(cloned.bookingId);
    return matched;
  } catch (e) {
    return cloned;
  }
}

