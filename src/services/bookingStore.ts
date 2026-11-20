/**
 * Single source of truth for the on-device bookings collection.
 *
 * Every booking (drafts + submitted requests) lives in ONE AsyncStorage key as
 * a JSON array. Before this module existed, each caller did its own
 * read → modify → write cycle. Two cycles overlapping (e.g. the 12-second
 * background `listBookings` poll, which reads, then awaits the network for up
 * to 20s, then writes) meant the slower writer silently overwrote the faster
 * one — a freshly created draft or a just-confirmed event location vanished
 * from storage, and the next save failed with "Could not save this event day".
 *
 * All mutations now go through `mutateBookings`, which runs mutators strictly
 * one at a time against the latest stored array. Network calls must happen
 * OUTSIDE a mutator; only the pure merge step runs inside the lock.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Booking } from "@/src/types/booking";

export const BOOKINGS_KEY = "camartes-customer:bookings:v1";

let writeQueue: Promise<unknown> = Promise.resolve();

function dedupe(list: Booking[]): Booking[] {
  const seen = new Set<string>();
  const out: Booking[] = [];
  for (const b of list) {
    const id = b?.bookingId || b?.remoteBookingId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(b);
  }
  return out;
}

async function readRaw(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) ? dedupe(parsed) : [];
  } catch {
    return [];
  }
}

/** Snapshot read. Safe to call anywhere EXCEPT inside a `mutateBookings`
 * mutator (mutators receive the current array as their argument instead). */
export function readAllBookings(): Promise<Booking[]> {
  return readRaw();
}

export type BookingsMutation<T> = { next: Booking[]; result: T } | { next?: undefined; result: T };

/**
 * Atomically transform the stored bookings. The mutator receives the latest
 * persisted array (never a stale copy) and returns the array to persist plus a
 * result value. Return `{ result }` without `next` to skip the write.
 * Mutators must be fast and must not await network calls or call back into
 * this module (that would deadlock the queue).
 */
export function mutateBookings<T>(mutator: (all: Booking[]) => BookingsMutation<T> | Promise<BookingsMutation<T>>): Promise<T> {
  const run = writeQueue.then(async () => {
    const current = await readRaw();
    const { next, result } = await mutator(current);
    if (next) {
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(dedupe(next)));
    }
    return result;
  });
  // Keep the queue alive even if this mutation fails.
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Wipes every stored booking (logout / account deletion), serialized with writes. */
export function clearAllBookings(): Promise<void> {
  const run = writeQueue.then(() => AsyncStorage.removeItem(BOOKINGS_KEY));
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Re-key bookings from one customerId to another (account reconciliation). */
export function migrateBookingsToCustomer(oldCustomerId: string, newCustomerId: string): Promise<void> {
  if (!oldCustomerId || !newCustomerId || oldCustomerId === newCustomerId) return Promise.resolve();
  return mutateBookings((all) => {
    let changed = false;
    const next = all.map((b) => {
      if (b.customerId !== oldCustomerId) return b;
      changed = true;
      return { ...b, customerId: newCustomerId };
    });
    return changed ? { next, result: undefined } : { result: undefined };
  });
}
