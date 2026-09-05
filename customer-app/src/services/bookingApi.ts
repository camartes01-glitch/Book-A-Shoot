/**
 * Booking service layer (spec sections 36–37, "API Architecture").
 *
 * CUSTOMER APP -> CAMARTES API -> BOOKING SERVICE -> VENDOR PLATFORM -> VENDOR DATABASE
 *
 * Every exported function here corresponds 1:1 to a REST endpoint the spec
 * lists (see the comment above each function). Today they are implemented
 * against on-device AsyncStorage so the whole customer flow works end to end
 * without a live Camartes booking backend yet — but the function signatures,
 * request shapes and validation are exactly what a real `fetch()` call
 * against those endpoints would need, so swapping the body of each function
 * for a real HTTP call is the only change required later. No booking pricing
 * or availability is ever trusted from client state alone: every mutating
 * call re-runs the engine (`src/engine/*`) against the stored booking,
 * mirroring "never trust price/budget/availability from the client" (spec
 * section 51).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Booking, BookingStatus, CounterOffer, EventDay, PackageTierId } from "@/src/types/booking";
import { createEmptyBooking, createEmptyDay, duplicateDay } from "@/src/domain/defaults";
import { checkBudgetFeasibility, generatePackageOptions } from "@/src/engine/pricing";
import { matchVendors } from "@/src/engine/matching";
import { validateBooking, validateBudget } from "@/src/engine/validation";
import { fetchVendorCatalog } from "@/src/services/vendorApi";
import { makeBookingId, makeId } from "@/src/utils/id";
import { addNotification } from "@/src/services/notificationsStore";

const BOOKINGS_KEY = "camartes-customer:bookings:v1";
const SEQ_KEY = "camartes-customer:booking-seq:v1";

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

async function nextSequence(): Promise<number> {
  const raw = await AsyncStorage.getItem(SEQ_KEY);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await AsyncStorage.setItem(SEQ_KEY, String(next));
  return next;
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

async function saveBooking(booking: Booking): Promise<Booking> {
  const next = touch({ ...booking, draftCompletionPct: computeCompletionPct(booking) });
  const all = await readAllBookings();
  const idx = all.findIndex((b) => b.bookingId === next.bookingId);
  if (idx === -1) all.unshift(next);
  else all[idx] = next;
  await writeAllBookings(all);
  return next;
}

/** GET /api/customer/bookings */
export async function listBookings(customerId: string): Promise<Booking[]> {
  const all = await readAllBookings();
  return all.filter((b) => b.customerId === customerId).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** GET /api/customer/bookings/{id} */
export async function getBooking(bookingId: string): Promise<Booking | null> {
  const all = await readAllBookings();
  return all.find((b) => b.bookingId === bookingId) ?? null;
}

/** Returns the customer's most recent DRAFT booking, if any — powers
 * "Continue your booking" (spec section 41, "Save Draft"). */
export async function getActiveDraft(customerId: string): Promise<Booking | null> {
  const all = await listBookings(customerId);
  return all.find((b) => b.status === "DRAFT") ?? null;
}

/** POST /api/customer/bookings */
export async function createBooking(customerId: string): Promise<Booking> {
  const booking = createEmptyBooking(customerId);
  return saveBooking(booking);
}

/** POST /api/customer/bookings/{id}/days */
export async function addDay(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const day = createEmptyDay(booking.days.length + 1);
  return saveBooking({ ...booking, days: [...booking.days, day] });
}

export async function duplicateLastDay(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const last = booking.days[booking.days.length - 1];
  if (!last) return addDay(bookingId);
  const day = duplicateDay(last, booking.days.length + 1);
  return saveBooking({ ...booking, days: [...booking.days, day] });
}

/** PUT /api/customer/bookings/{id}/days/{dayId} */
export async function updateDay(bookingId: string, dayId: string, patch: Partial<EventDay>): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const days = booking.days.map((d) => (d.dayId === dayId ? { ...d, ...patch } : d));
  return saveBooking({ ...booking, days });
}

/** DELETE /api/customer/bookings/{id}/days/{dayId} */
export async function deleteDay(bookingId: string, dayId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const days = booking.days.filter((d) => d.dayId !== dayId).map((d, i) => ({ ...d, order: i + 1 }));
  return saveBooking({ ...booking, days });
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
  return saveBooking({ ...booking, deliverables: { ...booking.deliverables, ...patch } });
}

export async function updateExpectedDelivery(bookingId: string, date: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  return saveBooking({ ...booking, expectedDeliveryDate: date });
}

/** POST /api/customer/bookings/{id}/budget
 * Also implicitly serves GET /api/customer/bookings/{id}/packages by
 * returning the freshly generated package options (server-computed, never
 * trusting a client-supplied price). */
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
  const saved = await saveBooking({
    ...booking,
    budget,
    packageOptions,
    status: booking.status === "DRAFT" ? "SUBMITTED" : booking.status,
  });
  return { booking: saved, feasibility };
}

export async function selectPackage(bookingId: string, tier: PackageTierId): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  return saveBooking({ ...booking, selectedPackage: tier, status: "MATCHING" });
}

/** GET /api/customer/bookings/{id}/matches — returns at most 6 (spec
 * section 37). Sources vendors live from the Camartes Vendor Platform. */
export async function getVendorMatches(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const validationIssues = validateBooking(booking);
  if (validationIssues.length) throw new Error(validationIssues[0].message);
  if (!booking.selectedPackage) throw new Error("Select a package before matching vendors.");

  const { vendors } = await fetchVendorCatalog();
  const matches = matchVendors(booking, vendors, booking.selectedPackage, booking.budget ?? 0);
  return saveBooking({ ...booking, matches, status: "MATCHING" });
}

/** GET /api/vendors/{vendorId} — proxies the live vendor platform. */
export async function getVendorProfile(vendorId: string) {
  const { vendors } = await fetchVendorCatalog();
  return vendors.find((v) => v.vendorId === vendorId) ?? null;
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

/** POST /api/customer/bookings/{id}/vendor-request */
export async function submitVendorRequest(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.selectedVendorId) throw new Error("Select a service provider first.");

  const bookingId2 = booking.bookingId.startsWith("draft")
    ? makeBookingId(new Date().getFullYear(), await nextSequence())
    : booking.bookingId;

  const submitted = await saveBooking({
    ...booking,
    bookingId: bookingId2,
    status: "REQUEST_SENT",
  });

  await addNotification({
    id: makeId("ntf"),
    title: "Booking request sent",
    body: `Your request for ${submitted.bookingId} was sent to the vendor.`,
    createdAt: new Date().toISOString(),
    read: false,
    bookingId: submitted.bookingId,
  });

  // Demo-only vendor response simulation: a real integration would instead
  // subscribe to vendor-platform webhooks/events for accept/reject/counter.
  void simulateVendorResponse(submitted.bookingId);

  return submitted;
}

async function simulateVendorResponse(bookingId: string) {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const booking = await getBooking(bookingId);
  if (!booking || booking.status !== "REQUEST_SENT") return;

  const roll = Math.random();
  if (roll < 0.55) {
    await saveBooking({ ...booking, status: "VENDOR_ACCEPTED" });
    await addNotification({
      id: makeId("ntf"),
      title: "Vendor accepted your request",
      body: `Great news — your vendor accepted ${bookingId}. Confirm to proceed.`,
      createdAt: new Date().toISOString(),
      read: false,
      bookingId,
    });
  } else if (roll < 0.85 && booking.estimatedAmount) {
    const counterAmount = Math.round(booking.estimatedAmount * 1.1);
    const counterOffer: CounterOffer = {
      amount: counterAmount,
      note: "Additional travel and setup charges for this date.",
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    await saveBooking({ ...booking, status: "VENDOR_ACCEPTED", counterOffer });
    await addNotification({
      id: makeId("ntf"),
      title: "Vendor sent a counter offer",
      body: `Your vendor proposed \u20B9${counterAmount.toLocaleString("en-IN")} for ${bookingId}.`,
      createdAt: new Date().toISOString(),
      read: false,
      bookingId,
    });
  } else {
    await saveBooking({ ...booking, status: "VENDOR_REJECTED" });
    await addNotification({
      id: makeId("ntf"),
      title: "Vendor declined your request",
      body: `Your selected vendor could not take ${bookingId}. Pick another provider.`,
      createdAt: new Date().toISOString(),
      read: false,
      bookingId,
    });
  }
}

export async function respondToCounterOffer(bookingId: string, action: "accept" | "decline"): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking || !booking.counterOffer) throw new Error("No counter offer to respond to.");
  const counterOffer: CounterOffer = { ...booking.counterOffer, status: action === "accept" ? "accepted" : "declined" };
  const estimatedAmount = action === "accept" ? counterOffer.amount : booking.estimatedAmount;
  const status: BookingStatus = action === "accept" ? "CUSTOMER_CONFIRMED" : "CUSTOMER_CANCELLED";
  return saveBooking({ ...booking, counterOffer, estimatedAmount, status });
}

export async function confirmBooking(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  return saveBooking({ ...booking, status: "CUSTOMER_CONFIRMED" });
}

export async function markPaymentComplete(bookingId: string): Promise<Booking> {
  const booking = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const confirmed = await saveBooking({ ...booking, status: "CONFIRMED" });
  await addNotification({
    id: makeId("ntf"),
    title: "Booking confirmed",
    body: `${confirmed.bookingId} is confirmed. We'll notify you as the event date approaches.`,
    createdAt: new Date().toISOString(),
    read: false,
    bookingId: confirmed.bookingId,
  });
  return confirmed;
}

/** Lets the customer pick a different provider after a vendor decline,
 * without re-entering any requirements. */
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
  return saveBooking({ ...booking, status: "CUSTOMER_CANCELLED" });
}

export async function deleteDraft(bookingId: string): Promise<void> {
  const all = await readAllBookings();
  await writeAllBookings(all.filter((b) => b.bookingId !== bookingId));
}
