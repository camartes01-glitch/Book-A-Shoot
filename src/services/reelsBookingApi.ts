/**
 * Sends a CamReels request. The Camartes backend picks up to 6 eligible
 * videographers in the city (freelance videographers + videography firms that
 * opted in to CamReels), re-computes the price, and rings them.
 */
import type { Booking } from "@/src/types/booking";
import * as bookingApi from "@/src/services/bookingApi";
import { buildReelsBooking, type ReelsBookingInput } from "@/src/domain/reelsRequest";
import { camartesFetch } from "@/src/services/camartesClient";
import { REELS_MONTHLY, REELS_PRICES, type ReelsPrices } from "@/src/constants/reels";

/**
 * Create (or, on retry, reuse) the local CamReels booking and send it.
 * Reusing `existingDraftId` keeps the client booking id stable, so a retry
 * after an ambiguous network error never creates a second request.
 */
export async function sendReelsRequest(
  customerId: string,
  input: ReelsBookingInput,
  existingDraftId?: string | null,
): Promise<Booking> {
  let bookingId = existingDraftId ?? null;
  if (!bookingId || !(await bookingApi.getBooking(bookingId))) {
    const saved = await bookingApi.saveBooking(buildReelsBooking(customerId, input));
    bookingId = saved.bookingId;
  }
  return bookingApi.submitVendorRequest(bookingId);
}

/** Remove a CamReels draft that was never sent (e.g. the customer left after an error). */
export async function discardReelsDraft(bookingId: string): Promise<void> {
  const booking = await bookingApi.getBooking(bookingId);
  if (booking && !booking.remoteBookingId) await bookingApi.deleteDraft(bookingId);
}

export type CamReelsPricing = { prices: ReelsPrices; monthlyPrice: number };

type RemotePrice = { per_reel?: number; three_reels?: number };

/**
 * Live prices from GET /api/camreels/pricing, falling back to the bundled
 * table on any error or malformed response.
 */
export async function fetchCamReelsPricing(): Promise<CamReelsPricing> {
  const fallback: CamReelsPricing = { prices: REELS_PRICES, monthlyPrice: REELS_MONTHLY.price };
  try {
    const res = await camartesFetch<{ reels?: { edited?: RemotePrice; raw?: RemotePrice }; monthly?: { price?: number } }>(
      "/api/camreels/pricing",
      {},
      { auth: false, requireAuth: false, timeoutMs: 8000 },
    );
    const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
    const pick = (r: RemotePrice | undefined, f: { single: number; pack3: number }) =>
      r && valid(r.per_reel) && valid(r.three_reels) ? { single: r.per_reel, pack3: r.three_reels } : f;
    return {
      prices: { edited: pick(res?.reels?.edited, REELS_PRICES.edited), raw: pick(res?.reels?.raw, REELS_PRICES.raw) },
      monthlyPrice: valid(res?.monthly?.price) ? res.monthly.price : fallback.monthlyPrice,
    };
  } catch {
    return fallback;
  }
}
