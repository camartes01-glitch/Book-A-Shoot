/**
 * Regression tests for Wedding / Engagement independent selection.
 *
 * Bug context: selecting the Wedding event card was resulting in
 * "Wedding + Engagement" appearing in the day summary.  These tests lock
 * the contract so that:
 *
 *   - Tapping Wedding adds ONLY "wedding" to eventTypeIds.
 *   - Tapping Engagement adds ONLY "engagement" to eventTypeIds.
 *   - Selecting one never auto-selects the other.
 *   - Both can coexist when the customer explicitly selects both.
 *   - Pooja selection remains completely independent of Wedding/Engagement.
 *   - updateDay persists exactly what was passed — no expansion into sibling
 *     event types within the same category group.
 *   - mergeEventDayPatch does not smuggle stale eventTypeIds from a prior
 *     session when the incoming patch carries an explicit non-empty list.
 */

import {
  DEFAULT_EVENT_CATEGORIES,
  eventTypeLabel,
  getEnabledCategories,
} from "@/src/constants/eventCategories";
import {
  createEmptyBooking,
  createEmptyDay,
  mergeEventDayPatch,
  sanitizeEventDay,
} from "@/src/domain/defaults";
import * as bookingApi from "@/src/services/bookingApi";
import type { EventDay } from "@/src/types/booking";

// ---------------------------------------------------------------------------
// Helpers — mirror the exact logic used in [dayId]/index.tsx
// ---------------------------------------------------------------------------

/** Replicates the UI toggleEventType handler exactly. */
function toggleEventType(day: EventDay, id: string): EventDay {
  return {
    ...day,
    eventTypeIds: day.eventTypeIds.includes(id)
      ? day.eventTypeIds.filter((t) => t !== id)
      : [...day.eventTypeIds, id],
  };
}

function emptyDay(): EventDay {
  return createEmptyDay(1);
}

// ---------------------------------------------------------------------------
// Category catalogue assertions
// ---------------------------------------------------------------------------

describe("Wedding and Engagement are distinct, independent event type IDs", () => {
  test("'wedding' and 'engagement' are separate entries in DEFAULT_EVENT_CATEGORIES", () => {
    const wedding = DEFAULT_EVENT_CATEGORIES.find((c) => c.id === "wedding");
    const engagement = DEFAULT_EVENT_CATEGORIES.find((c) => c.id === "engagement");

    expect(wedding).toBeDefined();
    expect(engagement).toBeDefined();
    expect(wedding?.id).not.toBe(engagement?.id);
    expect(wedding?.group).toBe("wedding");
    expect(engagement?.group).toBe("wedding");
    expect(wedding?.label).toBe("Wedding");
    expect(engagement?.label).toBe("Engagement");
  });

  test("eventTypeLabel resolves 'wedding' to 'Wedding' and 'engagement' to 'Engagement'", () => {
    expect(eventTypeLabel("wedding")).toBe("Wedding");
    expect(eventTypeLabel("engagement")).toBe("Engagement");
  });

  test("getEnabledCategories contains both Wedding and Engagement as separate items", () => {
    const cats = getEnabledCategories();
    expect(cats.some((c) => c.id === "wedding")).toBe(true);
    expect(cats.some((c) => c.id === "engagement")).toBe(true);
    expect(cats.filter((c) => c.id === "wedding" || c.id === "engagement")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// toggleEventType — single-tap selection
// ---------------------------------------------------------------------------

describe("Tapping Wedding selects only Wedding", () => {
  test("starting from an empty day, selecting wedding produces exactly ['wedding']", () => {
    const result = toggleEventType(emptyDay(), "wedding");
    expect(result.eventTypeIds).toEqual(["wedding"]);
  });

  test("selecting wedding does NOT add engagement", () => {
    const result = toggleEventType(emptyDay(), "wedding");
    expect(result.eventTypeIds).not.toContain("engagement");
  });

  test("selecting wedding produces exactly one event type ID", () => {
    const result = toggleEventType(emptyDay(), "wedding");
    expect(result.eventTypeIds).toHaveLength(1);
    expect(result.eventTypeIds[0]).toBe("wedding");
  });
});

describe("Tapping Engagement selects only Engagement", () => {
  test("starting from an empty day, selecting engagement produces exactly ['engagement']", () => {
    const result = toggleEventType(emptyDay(), "engagement");
    expect(result.eventTypeIds).toEqual(["engagement"]);
  });

  test("selecting engagement does NOT add wedding", () => {
    const result = toggleEventType(emptyDay(), "engagement");
    expect(result.eventTypeIds).not.toContain("wedding");
  });

  test("selecting engagement produces exactly one event type ID", () => {
    const result = toggleEventType(emptyDay(), "engagement");
    expect(result.eventTypeIds).toHaveLength(1);
    expect(result.eventTypeIds[0]).toBe("engagement");
  });
});

// ---------------------------------------------------------------------------
// Explicit multi-selection — customer intentionally picks both
// ---------------------------------------------------------------------------

describe("Explicitly selecting both Wedding and Engagement", () => {
  test("tap Wedding then Engagement gives ['wedding', 'engagement']", () => {
    const afterWedding = toggleEventType(emptyDay(), "wedding");
    const afterBoth = toggleEventType(afterWedding, "engagement");
    expect(afterBoth.eventTypeIds).toEqual(["wedding", "engagement"]);
  });

  test("tap Engagement then Wedding gives ['engagement', 'wedding']", () => {
    const afterEngagement = toggleEventType(emptyDay(), "engagement");
    const afterBoth = toggleEventType(afterEngagement, "wedding");
    expect(afterBoth.eventTypeIds).toEqual(["engagement", "wedding"]);
  });

  test("de-selecting Wedding from both leaves only Engagement", () => {
    const withBoth = toggleEventType(toggleEventType(emptyDay(), "wedding"), "engagement");
    const afterRemove = toggleEventType(withBoth, "wedding");
    expect(afterRemove.eventTypeIds).toEqual(["engagement"]);
    expect(afterRemove.eventTypeIds).not.toContain("wedding");
  });

  test("de-selecting Engagement from both leaves only Wedding", () => {
    const withBoth = toggleEventType(toggleEventType(emptyDay(), "wedding"), "engagement");
    const afterRemove = toggleEventType(withBoth, "engagement");
    expect(afterRemove.eventTypeIds).toEqual(["wedding"]);
    expect(afterRemove.eventTypeIds).not.toContain("engagement");
  });
});

// ---------------------------------------------------------------------------
// Pooja remains independent
// ---------------------------------------------------------------------------

describe("Pooja selection is independent of Wedding and Engagement", () => {
  test("selecting ganesh_pooja from empty adds only ganesh_pooja", () => {
    const result = toggleEventType(emptyDay(), "ganesh_pooja");
    expect(result.eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(result.eventTypeIds).not.toContain("wedding");
    expect(result.eventTypeIds).not.toContain("engagement");
  });

  test("selecting Wedding then Ganesh Pooja produces ['wedding', 'ganesh_pooja']", () => {
    const afterWedding = toggleEventType(emptyDay(), "wedding");
    const afterPooja = toggleEventType(afterWedding, "ganesh_pooja");
    expect(afterPooja.eventTypeIds).toEqual(["wedding", "ganesh_pooja"]);
    expect(afterPooja.eventTypeIds).not.toContain("engagement");
  });

  test("adding Pooja to Wedding+Engagement does not remove either", () => {
    const start = toggleEventType(toggleEventType(emptyDay(), "wedding"), "engagement");
    const withPooja = toggleEventType(start, "durga_pooja");
    expect(withPooja.eventTypeIds).toContain("wedding");
    expect(withPooja.eventTypeIds).toContain("engagement");
    expect(withPooja.eventTypeIds).toContain("durga_pooja");
    expect(withPooja.eventTypeIds).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// mergeEventDayPatch — stale data must not smuggle Engagement into a Wedding selection
// ---------------------------------------------------------------------------

describe("mergeEventDayPatch does not merge stale Engagement into a Wedding patch", () => {
  test("patching eventTypeIds=['wedding'] on a day that had ['engagement'] replaces correctly", () => {
    const current = sanitizeEventDay({
      ...createEmptyDay(1),
      eventTypeIds: ["engagement"],
      dayRevision: 1,
    });
    const patch: Partial<EventDay> = { eventTypeIds: ["wedding"], dayRevision: 2 };
    const merged = mergeEventDayPatch(current, patch);
    expect(merged.eventTypeIds).toEqual(["wedding"]);
    expect(merged.eventTypeIds).not.toContain("engagement");
  });

  test("patching eventTypeIds=['engagement'] on a day that had ['wedding'] replaces correctly", () => {
    const current = sanitizeEventDay({
      ...createEmptyDay(1),
      eventTypeIds: ["wedding"],
      dayRevision: 1,
    });
    const patch: Partial<EventDay> = { eventTypeIds: ["engagement"], dayRevision: 2 };
    const merged = mergeEventDayPatch(current, patch);
    expect(merged.eventTypeIds).toEqual(["engagement"]);
    expect(merged.eventTypeIds).not.toContain("wedding");
  });

  test("stale lower-revision patch is discarded — current Wedding selection wins", () => {
    const current = sanitizeEventDay({
      ...createEmptyDay(1),
      eventTypeIds: ["wedding"],
      dayRevision: 5,
    });
    const stalePatch: Partial<EventDay> = { eventTypeIds: ["engagement"], dayRevision: 2 };
    const merged = mergeEventDayPatch(current, stalePatch);
    expect(merged.eventTypeIds).toEqual(["wedding"]);
    expect(merged.eventTypeIds).not.toContain("engagement");
  });
});

// ---------------------------------------------------------------------------
// bookingApi.updateDay — persistence does not expand or merge event types
// ---------------------------------------------------------------------------

describe("updateDay persists eventTypeIds exactly without expansion", () => {
  test("updateDay with ['wedding'] stores exactly ['wedding']", async () => {
    const booking = await bookingApi.createBooking("cust-wedding-sel");
    const dayId = booking.days[0].dayId;
    await bookingApi.updateDay(booking.bookingId, dayId, { eventTypeIds: ["wedding"] });
    const saved = await bookingApi.getBooking(booking.bookingId);
    expect(saved?.days[0].eventTypeIds).toEqual(["wedding"]);
    expect(saved?.days[0].eventTypeIds).not.toContain("engagement");
  });

  test("updateDay with ['engagement'] stores exactly ['engagement']", async () => {
    const booking = await bookingApi.createBooking("cust-engagement-sel");
    const dayId = booking.days[0].dayId;
    await bookingApi.updateDay(booking.bookingId, dayId, { eventTypeIds: ["engagement"] });
    const saved = await bookingApi.getBooking(booking.bookingId);
    expect(saved?.days[0].eventTypeIds).toEqual(["engagement"]);
    expect(saved?.days[0].eventTypeIds).not.toContain("wedding");
  });

  test("replacing Engagement with Wedding via updateDay does not merge them", async () => {
    const booking = await bookingApi.createBooking("cust-replace-sel");
    const dayId = booking.days[0].dayId;
    await bookingApi.updateDay(booking.bookingId, dayId, { eventTypeIds: ["engagement"] });
    await bookingApi.updateDay(booking.bookingId, dayId, { eventTypeIds: ["wedding"] });
    const saved = await bookingApi.getBooking(booking.bookingId);
    expect(saved?.days[0].eventTypeIds).toEqual(["wedding"]);
    expect(saved?.days[0].eventTypeIds).not.toContain("engagement");
  });

  test("updateDay with ['wedding', 'engagement'] stores both", async () => {
    const booking = await bookingApi.createBooking("cust-both-sel");
    const dayId = booking.days[0].dayId;
    await bookingApi.updateDay(booking.bookingId, dayId, { eventTypeIds: ["wedding", "engagement"] });
    const saved = await bookingApi.getBooking(booking.bookingId);
    expect(saved?.days[0].eventTypeIds).toEqual(["wedding", "engagement"]);
  });

  test("fresh booking day starts with empty eventTypeIds", async () => {
    const booking = await bookingApi.createBooking("cust-fresh-check");
    expect(booking.days[0].eventTypeIds).toEqual([]);
    expect(booking.days[0].eventTypeIds).not.toContain("engagement");
    expect(booking.days[0].eventTypeIds).not.toContain("wedding");
  });
});

// ---------------------------------------------------------------------------
// Multi-day independence
// ---------------------------------------------------------------------------

describe("Multi-day: Wedding on day 1 does not affect day 2", () => {
  test("two days with different event types remain independent", async () => {
    const booking = await bookingApi.createBooking("cust-multiday");
    const booking2 = await bookingApi.addDay(booking.bookingId);
    const day1Id = booking2.days[0].dayId;
    const day2Id = booking2.days[1].dayId;

    await bookingApi.updateDay(booking2.bookingId, day1Id, { eventTypeIds: ["wedding"] });
    await bookingApi.updateDay(booking2.bookingId, day2Id, { eventTypeIds: ["engagement"] });

    const saved = await bookingApi.getBooking(booking2.bookingId);
    const savedDay1 = saved?.days.find((d) => d.dayId === day1Id);
    const savedDay2 = saved?.days.find((d) => d.dayId === day2Id);

    expect(savedDay1?.eventTypeIds).toEqual(["wedding"]);
    expect(savedDay1?.eventTypeIds).not.toContain("engagement");
    expect(savedDay2?.eventTypeIds).toEqual(["engagement"]);
    expect(savedDay2?.eventTypeIds).not.toContain("wedding");
  });
});

// ---------------------------------------------------------------------------
// DayCard summary text is driven entirely by stored eventTypeIds
// ---------------------------------------------------------------------------

describe("Day summary label reflects actual eventTypeIds only", () => {
  function summaryLabel(eventTypeIds: string[]): string {
    return eventTypeIds.length
      ? eventTypeIds
          .map((id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)?.label ?? id)
          .join(" + ")
      : "Event type not set";
  }

  test("only Wedding selected gives 'Wedding'", () => {
    expect(summaryLabel(["wedding"])).toBe("Wedding");
  });

  test("only Engagement selected gives 'Engagement'", () => {
    expect(summaryLabel(["engagement"])).toBe("Engagement");
  });

  test("both Wedding and Engagement explicitly selected gives 'Wedding + Engagement'", () => {
    expect(summaryLabel(["wedding", "engagement"])).toBe("Wedding + Engagement");
  });

  test("empty gives fallback text", () => {
    expect(summaryLabel([])).toBe("Event type not set");
  });

  test("Ganesh Pooja gives 'Ganesh Pooja' with no Wedding or Engagement leakage", () => {
    const label = summaryLabel(["ganesh_pooja"]);
    expect(label).toBe("Ganesh Pooja");
    expect(label).not.toContain("Wedding");
    expect(label).not.toContain("Engagement");
  });
});

// ---------------------------------------------------------------------------
// Fresh booking isolation & multi-selection lifecycle contracts
// ---------------------------------------------------------------------------

describe("Fresh booking and event selection isolation contract", () => {
  test("a newly created fresh day strictly starts with empty eventTypeIds", () => {
    const day = createEmptyDay(1);
    expect(day.eventTypeIds).toEqual([]);
    expect(day.eventTypeIds).toHaveLength(0);
  });

  test("tapping Wedding on fresh day produces exactly ['wedding']", () => {
    const fresh = createEmptyDay(1);
    const selected = toggleEventType(fresh, "wedding");
    expect(selected.eventTypeIds).toEqual(["wedding"]);
    expect(selected.eventTypeIds).not.toContain("engagement");
  });

  test("tapping Engagement on fresh day produces exactly ['engagement']", () => {
    const fresh = createEmptyDay(1);
    const selected = toggleEventType(fresh, "engagement");
    expect(selected.eventTypeIds).toEqual(["engagement"]);
    expect(selected.eventTypeIds).not.toContain("wedding");
  });

  test("explicitly tapping Wedding then Engagement produces exactly ['wedding', 'engagement']", () => {
    const fresh = createEmptyDay(1);
    const withWedding = toggleEventType(fresh, "wedding");
    const withBoth = toggleEventType(withWedding, "engagement");
    expect(withBoth.eventTypeIds).toEqual(["wedding", "engagement"]);
  });

  test("starting a new booking after an old Engagement booking starts completely fresh", async () => {
    // 1. Create older booking and set Engagement on its Day 1
    const oldBooking = await bookingApi.createBooking("cust-iso-1");
    await bookingApi.updateDay(oldBooking.bookingId, oldBooking.days[0].dayId, {
      eventTypeIds: ["engagement"],
      eventDate: "2099-05-10",
      startTime: "10:00",
      endTime: "14:00",
    });

    // 2. Start a fresh new booking
    const freshBooking = await bookingApi.startFreshBooking("cust-iso-1");
    expect(freshBooking.bookingId).not.toBe(oldBooking.bookingId);
    expect(freshBooking.days[0].eventTypeIds).toEqual([]);

    // 3. Select Wedding on fresh booking
    const updatedFresh = await bookingApi.updateDay(freshBooking.bookingId, freshBooking.days[0].dayId, {
      eventTypeIds: ["wedding"],
    });
    expect(updatedFresh.days[0].eventTypeIds).toEqual(["wedding"]);
    expect(updatedFresh.days[0].eventTypeIds).not.toContain("engagement");

    // 4. Verify old booking still has only engagement (no cross-contamination)
    const oldSaved = await bookingApi.getBooking(oldBooking.bookingId);
    expect(oldSaved?.days[0].eventTypeIds).toEqual(["engagement"]);
  });

  test("Wedding selection survives navigation away, re-hydration, and return", async () => {
    const booking = await bookingApi.createBooking("cust-nav-ret");
    const dayId = booking.days[0].dayId;

    // Day 1: customer selects Wedding
    const afterSelect = await bookingApi.updateDay(booking.bookingId, dayId, {
      eventTypeIds: ["wedding"],
      eventDate: "2099-12-01",
      startTime: "09:00",
      endTime: "17:00",
    });
    expect(afterSelect.days[0].eventTypeIds).toEqual(["wedding"]);

    // Customer navigates away to Services and Budget (patches deliverables or budget)
    await bookingApi.updateDeliverables(booking.bookingId, { photo: { rawPhotos: true, editedPhotosOption: "100", editedPhotosCustomCount: null, album: false, albumPagesOption: null, albumPagesCustomCount: null } });

    // Customer returns to Day 1: rehydrated from storage
    const reloaded = await bookingApi.getBookingContainingDay(dayId);
    expect(reloaded).not.toBeNull();
    const day1 = reloaded!.days.find((d) => d.dayId === dayId);
    expect(day1?.eventTypeIds).toEqual(["wedding"]);
    expect(day1?.eventTypeIds).not.toContain("engagement");
  });

  test("multi-day event selections remain completely isolated across days", async () => {
    const booking = await bookingApi.createBooking("cust-multi-iso");
    const day1Id = booking.days[0].dayId;

    // Day 1: Wedding
    await bookingApi.updateDay(booking.bookingId, day1Id, { eventTypeIds: ["wedding"] });

    // Add Day 2
    const withDay2 = await bookingApi.addDay(booking.bookingId);
    const day2Id = withDay2.days[1].dayId;
    expect(withDay2.days[1].eventTypeIds).toEqual([]);

    // Day 2: Engagement
    const afterDay2 = await bookingApi.updateDay(booking.bookingId, day2Id, { eventTypeIds: ["engagement"] });

    // Day 1 must still have strictly Wedding, Day 2 must have strictly Engagement
    expect(afterDay2.days[0].eventTypeIds).toEqual(["wedding"]);
    expect(afterDay2.days[1].eventTypeIds).toEqual(["engagement"]);
  });
});
