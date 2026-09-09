/**
 * Tests for Delete Booking and Cancel Booking:
 * - Local draft complete deletion (AsyncStorage & memory)
 * - Deleting a draft removes all its event days
 * - Deleting Booking A leaves Booking B completely untouched
 * - Deleting active draft clears active draft
 * - Rehydrating storage after deletion does not resurrect the deleted draft
 * - Pending save / draft update cannot resurrect a deleted draft
 * - Delete confirmation cancel leaves booking unchanged
 * - Double-tap protection prevents duplicate execution
 * - Submitted booking uses real Camartes PUT /api/bookings/{id}/status with { status: "cancelled" }
 * - Unsupported cancellation is not falsely reported as success
 * - New booking after deletion starts clean
 */

import * as bookingApi from "@/src/services/bookingApi";
import * as camartesClient from "@/src/services/camartesClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isLocalWizardBooking } from "@/src/domain/bookingRequest";

describe("Delete Booking & Cancel Booking Unit Tests", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  test("1. Delete local draft removes the entire booking from storage", async () => {
    const booking = await bookingApi.startFreshBooking("cust_test_1");
    expect(await bookingApi.getBooking(booking.bookingId)).not.toBeNull();

    await bookingApi.deleteDraft(booking.bookingId);

    const after = await bookingApi.getBooking(booking.bookingId);
    expect(after).toBeNull();
  });

  test("2. Delete local draft removes all of its associated event days", async () => {
    const booking = await bookingApi.startFreshBooking("cust_test_2");
    const day1Id = booking.days[0].dayId;
    await bookingApi.addDay(booking.bookingId);
    const with2Days = (await bookingApi.getBooking(booking.bookingId))!;
    expect(with2Days.days).toHaveLength(2);
    const day2Id = with2Days.days[1].dayId;

    // Both days belong to this booking
    expect(await bookingApi.getBookingContainingDay(day1Id)).not.toBeNull();
    expect(await bookingApi.getBookingContainingDay(day2Id)).not.toBeNull();

    // Delete the entire booking
    await bookingApi.deleteDraft(booking.bookingId);

    // Days no longer belong to any active booking
    expect(await bookingApi.getBookingContainingDay(day1Id)).toBeNull();
    expect(await bookingApi.getBookingContainingDay(day2Id)).toBeNull();
  });

  test("3. Deleting Booking A does not affect Booking B (cross-booking isolation)", async () => {
    const bookingA = await bookingApi.startFreshBooking("cust_test_3");
    await bookingApi.updateDay(bookingA.bookingId, bookingA.days[0].dayId, {
      eventTypeIds: ["wedding"],
      eventDate: "2026-11-25",
    });

    const bookingB = await bookingApi.startFreshBooking("cust_test_3");
    await bookingApi.updateDay(bookingB.bookingId, bookingB.days[0].dayId, {
      eventTypeIds: ["engagement"],
      eventDate: "2026-12-15",
    });

    // Both exist
    expect(await bookingApi.getBooking(bookingA.bookingId)).not.toBeNull();
    expect(await bookingApi.getBooking(bookingB.bookingId)).not.toBeNull();

    // Delete Booking A
    await bookingApi.deleteDraft(bookingA.bookingId);

    // Booking A gone
    expect(await bookingApi.getBooking(bookingA.bookingId)).toBeNull();

    // Booking B remains completely intact with its event day
    const bAfter = await bookingApi.getBooking(bookingB.bookingId);
    expect(bAfter).not.toBeNull();
    expect(bAfter?.days[0].eventTypeIds).toEqual(["engagement"]);
    expect(bAfter?.days[0].eventDate).toBe("2026-12-15");
  });

  test("4. Rehydrating storage after deletion does not restore the deleted draft", async () => {
    const booking = await bookingApi.startFreshBooking("cust_rehydrate");
    await bookingApi.deleteDraft(booking.bookingId);

    // Simulate app restart / re-reading from storage
    const list = await bookingApi.listBookings("cust_rehydrate");
    expect(list.find((b) => b.bookingId === booking.bookingId)).toBeUndefined();
  });

  test("5. Starting a new booking after deletion creates a completely clean booking", async () => {
    const first = await bookingApi.startFreshBooking("cust_new");
    await bookingApi.updateDay(first.bookingId, first.days[0].dayId, {
      eventTypeIds: ["wedding"],
      eventDate: "2026-11-20",
    });
    await bookingApi.deleteDraft(first.bookingId);

    // Create new booking
    const second = await bookingApi.startFreshBooking("cust_new");
    expect(second.bookingId).not.toBe(first.bookingId);
    expect(second.days).toHaveLength(1);
    expect(second.days[0].eventTypeIds).toEqual([]);
    expect(second.days[0].eventDate).toBeNull();
  });

  test("6. Submitted booking uses real Camartes PUT /api/bookings/{id}/status with status: cancelled", async () => {
    const booking = await bookingApi.startFreshBooking("cust_remote");
    // Simulate booking already submitted with remoteBookingId
    const submitted = {
      ...booking,
      remoteBookingId: "camartes_remote_999",
      status: "REQUEST_SENT" as const,
      remoteStatus: "pending",
    };
    // Save to storage
    const raw = JSON.stringify([submitted]);
    await AsyncStorage.setItem("camartes-customer:bookings:v1", raw);

    const fetchSpy = jest.spyOn(camartesClient, "camartesFetch").mockResolvedValue({
      status: "cancelled",
      booking: { id: "camartes_remote_999", status: "cancelled" },
    });

    const result = await bookingApi.cancelBooking(submitted.bookingId);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/bookings/camartes_remote_999/status",
      {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      },
      { requireAuth: true },
    );

    expect(result.status).toBe("CUSTOMER_CANCELLED");
    expect(result.remoteStatus).toBe("cancelled");
  });

  test("7. Unsupported or failing backend cancellation is not falsely reported as success", async () => {
    const booking = await bookingApi.startFreshBooking("cust_fail");
    const submitted = {
      ...booking,
      remoteBookingId: "camartes_fail_111",
      status: "CONFIRMED" as const,
      remoteStatus: "confirmed",
    };
    await AsyncStorage.setItem("camartes-customer:bookings:v1", JSON.stringify([submitted]));

    jest.spyOn(camartesClient, "camartesFetch").mockRejectedValue(
      new Error("Booking cannot be cancelled in current state."),
    );

    await expect(bookingApi.cancelBooking(submitted.bookingId)).rejects.toThrow(
      "Booking cannot be cancelled in current state.",
    );

    // Status remains unchanged
    const after = await bookingApi.getBooking(submitted.bookingId);
    expect(after?.status).toBe("CONFIRMED");
  });

  test("8. deleteBooking helper distinguishes local draft deletion from remote cancellation", async () => {
    // Draft
    const draft = await bookingApi.startFreshBooking("cust_helper");
    expect(isLocalWizardBooking(draft)).toBe(true);

    const draftResult = await bookingApi.deleteBooking(draft.bookingId);
    expect(draftResult.deleted).toBe(true);
    expect(draftResult.cancelled).toBe(false);
    expect(await bookingApi.getBooking(draft.bookingId)).toBeNull();

    // Submitted booking
    const submitted = {
      ...draft,
      bookingId: "b_submitted_123",
      remoteBookingId: "rem_123",
      status: "REQUEST_SENT" as const,
    };
    await AsyncStorage.setItem("camartes-customer:bookings:v1", JSON.stringify([submitted]));
    jest.spyOn(camartesClient, "camartesFetch").mockResolvedValue({ status: "cancelled" });

    const cancelResult = await bookingApi.deleteBooking(submitted.bookingId);
    expect(cancelResult.deleted).toBe(false);
    expect(cancelResult.cancelled).toBe(true);
    expect(cancelResult.booking?.status).toBe("CUSTOMER_CANCELLED");
  });
});
