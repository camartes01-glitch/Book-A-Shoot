/**
 * Regression tests for the booking reliability fixes:
 *  - lost-update race that erased drafts / event locations from storage
 *  - city resolution (Kanuru → Vijayawada, NTR District)
 *  - "Another city" dispatch must target exactly that city
 *  - landing bottom-nav visibility
 *  - draft reminders: max two, different copy, one OS slot, no spam
 */
jest.mock("@/src/services/pushNotificationService", () => ({
  pushNotificationService: {
    scheduleAt: jest.fn().mockResolvedValue(undefined),
    cancelScheduledNotification: jest.fn().mockResolvedValue(undefined),
    scheduleRepeatingEveryDays: jest.fn().mockResolvedValue(undefined),
    hasScheduled: jest.fn().mockResolvedValue(true),
    cancelScheduledWhere: jest.fn().mockResolvedValue(0),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Booking, CustomerProfile, EventDay } from "@/src/types/booking";
import * as bookingApi from "@/src/services/bookingApi";
import { setAuthToken } from "@/src/services/camartesClient";
import { createEmptyDay, sanitizeEventDay } from "@/src/domain/defaults";
import { setPhotographySelected } from "@/src/domain/dayServices";
import { citySpellings, isPlusCode, normalizeEventLocationCity, resolveCity, resolveProviderSearchTarget } from "@/src/domain/cityResolution";
import { toCamartesBookingRequest } from "@/src/domain/bookingRequest";
import { matchVendors, isCityMatch } from "@/src/engine/matching";
import { isMarketingRoute } from "@/src/utils/navRoutes";
import { runEngineTick } from "@/src/services/notificationEngine";
import { getNotifications } from "@/src/services/notificationsStore";
import { pushNotificationService } from "@/src/services/pushNotificationService";
import type { CustomerVendor } from "@/src/types/vendor";

function jsonResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text, json: async () => body, headers: new Headers() } as Response;
}

const loc = (city: string, lat: number | null = null, lng: number | null = null, district = "") => ({
  placeId: null,
  formattedAddress: `${city} venue`,
  latitude: lat,
  longitude: lng,
  city,
  district,
  state: "",
  pincode: "",
  manuallyEdited: false,
});

function day(city: string, extra: Partial<EventDay> = {}): EventDay {
  return setPhotographySelected(
    sanitizeEventDay({
      ...createEmptyDay(1),
      eventDate: "2099-10-12",
      eventTypeIds: ["wedding"],
      startTime: "10:00",
      endTime: "16:00",
      location: loc(city),
      ...extra,
    }),
    true,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ─── 1. Storage race ────────────────────────────────────────────────────────

describe("serialized booking storage", () => {
  test("a slow background refresh cannot erase a draft created / edited while it was in flight", async () => {
    await setAuthToken("t");
    await AsyncStorage.setItem("camartes-customer:profile:v1", JSON.stringify({ customerId: "cust-1" }));
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/bookings/my-bookings")) {
        await gate;
        return jsonResponse(200, []);
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    // 12s poll starts and is waiting on the network…
    const refresh = bookingApi.listBookings("cust-1");
    // …meanwhile the customer starts a booking and confirms the location.
    const draft = await bookingApi.startFreshBooking("cust-1");
    await bookingApi.updateDay(draft.bookingId, draft.days[0].dayId, { location: loc("Vijayawada", 16.5, 80.64) });
    release();
    const merged = await refresh;

    const stored = await bookingApi.getBooking(draft.bookingId);
    expect(stored).not.toBeNull();
    expect(stored?.days[0].location.city).toBe("Vijayawada");
    expect(merged.some((b) => b.bookingId === draft.bookingId)).toBe(true);
  });

  test("concurrent day writes are all kept (no lost update)", async () => {
    const b = await bookingApi.createBooking("cust-1");
    const id = b.days[0].dayId;
    await Promise.all([
      bookingApi.updateDay(b.bookingId, id, { eventTypeIds: ["wedding"] }),
      bookingApi.updateDay(b.bookingId, id, { location: loc("Hyderabad") }),
      bookingApi.updateDay(b.bookingId, id, { startTime: "09:00" }),
    ]);
    const stored = await bookingApi.getBooking(b.bookingId);
    expect(stored?.days[0].eventTypeIds).toEqual(["wedding"]);
    expect(stored?.days[0].location.city).toBe("Hyderabad");
    expect(stored?.days[0].startTime).toBe("09:00");
  });

  test("saving a location self-heals when storage lost the draft", async () => {
    const draft = await bookingApi.createBooking("cust-1");
    await AsyncStorage.removeItem("camartes-customer:bookings:v1");
    const saved = await bookingApi.updateDay(draft.bookingId, draft.days[0].dayId, { location: loc("Guntur") }, draft);
    expect(saved.days[0].location.city).toBe("Guntur");
    expect((await bookingApi.getBooking(draft.bookingId))?.days[0].location.city).toBe("Guntur");
  });
});

// ─── 2. City resolution ─────────────────────────────────────────────────────

describe("city resolution", () => {
  test("Kanuru (municipality reported by Android) resolves to Vijayawada, NTR District", () => {
    const r = resolveCity({ latitude: 16.487, longitude: 80.689, cityNames: ["Kanuru"], districtNames: ["Sanath Nagar"] });
    expect(r.city).toBe("Vijayawada");
    expect(r.district).toBe("NTR District");
  });

  test("Hyderabad suburbs resolve to Hyderabad", () => {
    expect(resolveCity({ latitude: 17.4401, longitude: 78.3489, cityNames: ["Gachibowli"] }).city).toBe("Hyderabad");
    expect(resolveCity({ latitude: 17.4948, longitude: 78.3996, cityNames: ["Kukatpally"] }).city).toBe("Hyderabad");
  });

  test("neighbouring cities stay distinct (nearest centre wins)", () => {
    expect(resolveCity({ latitude: 16.3067, longitude: 80.4365 }).city).toBe("Guntur");
    expect(resolveCity({ latitude: 16.51, longitude: 80.64 }).city).toBe("Vijayawada");
  });

  test("known names and aliases without coordinates", () => {
    expect(resolveCity({ cityNames: ["Bangalore"] }).city).toBe("Bengaluru");
    expect(resolveCity({ cityNames: ["Vizag"] }).city).toBe("Visakhapatnam");
  });

  test("small towns outside every metro keep their own name; mandals are never a city", () => {
    const r = resolveCity({ latitude: 15.0, longitude: 79.0, cityNames: ["Penamaluru mandal", "Somavaram"] });
    expect(r.city).toBe("Somavaram");
  });

  test("Plus Codes are never used as a city or address part", () => {
    expect(isPlusCode("FMVM+CF7")).toBe(true);
    expect(resolveCity({ cityNames: ["FMVM+CF7"], latitude: 16.5, longitude: 80.65 }).city).toBe("Vijayawada");
  });

  test("old drafts saved with the suburb in the city field are corrected", () => {
    const fixed = normalizeEventLocationCity(loc("Kanuru", 16.487, 80.689, "Sanath Nagar"));
    expect(fixed.city).toBe("Vijayawada");
    expect(fixed.district).toBe("NTR District");
  });

  test("spellings cover historical names for server-side matching", () => {
    expect(citySpellings("Bangalore")).toEqual(["Bangalore", "Bengaluru"]);
    expect(citySpellings("Hyderabad")).toEqual(["Hyderabad", "Secunderabad"]);
    expect(isCityMatch("Bengaluru", "Bangalore")).toBe(true);
  });
});

// ─── 3. Dispatch city ───────────────────────────────────────────────────────

describe("provider location preference → dispatch city", () => {
  const base = { days: [day("Vijayawada")], deliverables: createBookingDeliverables() };

  function createBookingDeliverables() {
    return bookingApiDeliverables();
  }

  test("'Another city: Hyderabad' for a Vijayawada event dispatches to Hyderabad only", () => {
    const booking = { ...base, providerLocationPreference: { mode: "another_area" as const, city: "Hyderabad" } };
    const target = resolveProviderSearchTarget(booking);
    expect(target).toMatchObject({ city: "Hyderabad", explicit: true });

    const vendors = [vendor("v-vja", "Vijayawada"), vendor("v-hyd", "Hyderabad"), vendor("v-sec", "Secunderabad")];
    const ids = matchVendors(booking, vendors, "signature", 80000).map((m) => m.vendorId);
    expect(ids).toEqual(expect.arrayContaining(["v-hyd", "v-sec"]));
    expect(ids).not.toContain("v-vja");
  });

  test("'Same city as event' follows the live event city, not a stale saved copy", () => {
    const booking = { ...base, providerLocationPreference: { mode: "event_location" as const, city: "Old City" } };
    expect(resolveProviderSearchTarget(booking).city).toBe("Vijayawada");
  });

  test("request payload carries the dispatch city and the event city separately", () => {
    const booking = {
      ...(bookingApiDraft() as Booking),
      days: [day("Vijayawada")],
      providerLocationPreference: { mode: "another_area" as const, city: "Hyderabad", formattedAddress: "Hyderabad, Telangana" },
      matches: [],
      assignedProviderIds: ["v-hyd"],
      selectedVendorId: "v-hyd",
    } as Booking;
    const body = toCamartesBookingRequest(booking, null);
    expect(body.location_preference?.city).toBe("Hyderabad");
    expect(body.location_preference?.type).toBe("another_city");
    expect(body.lead_details?.city).toBe("Hyderabad");
    expect(body.lead_details?.eventCity).toBe("Vijayawada");
    expect(body.lead_details?.dispatchCityAliases).toEqual(["Hyderabad", "Secunderabad"]);
    expect(body.venue_address).toContain("Vijayawada");
  });
});

function bookingApiDraft(): Partial<Booking> {
  return {
    bookingId: "draft-x",
    customerId: "cust-1",
    status: "VENDOR_SELECTED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deliverables: bookingApiDeliverables(),
    expectedDeliveryDate: "2099-11-01",
    budget: 80000,
    selectedPackage: "signature",
    packageOptions: null,
    estimatedAmount: null,
    counterOffer: null,
  };
}

function bookingApiDeliverables(): Booking["deliverables"] {
  return {
    photo: { album: false, rawPhotos: false, editedPhotosOption: "0" },
    video: { rawVideo: false, editedTraditionalVideoCount: 0, editedCinematicVideoCount: 0, teaserCinematicEnabled: false },
  } as unknown as Booking["deliverables"];
}

function vendor(id: string, city: string): CustomerVendor {
  return {
    vendorId: id,
    studioName: id,
    city,
    area: city,
    lat: 0,
    lng: 0,
    rating: 4.5,
    reviewCount: 3,
    experienceYears: 5,
    completedBookings: 10,
    isStudio: true,
    isFirm: true,
    serviceType: "photography_firm",
    photography: { traditional: true, candid: true, maxPhotographers: 4 },
    videography: { traditional: true, candid: true, maxVideographers: 4 },
    aerial: { photography: false, videography: false, maxDrones: 0 },
    ledWall: { available: false, sizes: [], maxScreens: 0 },
    webLive: { available: false, qualities: [] },
    portfolioImages: [],
    about: "",
    serviceAreas: [city],
    kycVerified: true,
    liveSource: true,
    basePricePerDay: 20000,
    listedAvailable: true,
    contactMaskedUntilAccepted: true,
  } as unknown as CustomerVendor;
}

// ─── 4. Landing bottom nav ──────────────────────────────────────────────────

describe("landing bottom nav visibility", () => {
  test("shows on every marketing page", () => {
    for (const p of ["/", "/landing", "/services", "/contact", "/about", "/blogs", "/photographers/wedding/hyderabad"]) {
      expect(isMarketingRoute(p, undefined)).toBe(true);
    }
  });
  test("never shows on authenticated screens", () => {
    expect(isMarketingRoute("/", "(tabs)")).toBe(false);
    for (const p of ["/booking/budget", "/bookings/bk_1", "/chat/u1", "/login", "/events"]) {
      expect(isMarketingRoute(p, undefined)).toBe(false);
    }
  });
});

// ─── 5. Draft reminders ─────────────────────────────────────────────────────

describe("draft reminders", () => {
  const profile: CustomerProfile = {
    customerId: "cust-1",
    name: "Keerthika Rao",
    mobile: "",
    email: "",
    avatarInitials: "KR",
    savedAddresses: [],
  };
  const HOUR = 3_600_000;
  let now = Date.UTC(2099, 0, 10, 10, 0, 0);

  beforeEach(() => {
    now = Date.UTC(2099, 0, 10, 10, 0, 0);
    jest.spyOn(Date, "now").mockImplementation(() => now);
    jest.clearAllMocks();
  });
  afterEach(() => jest.restoreAllMocks());

  function draft(id: string, title: string[] | [], updatedHoursAgo: number): Booking {
    return {
      ...(bookingApiDraft() as Booking),
      bookingId: id,
      status: "DRAFT",
      remoteBookingId: undefined,
      updatedAt: new Date(now - updatedHoursAgo * HOUR).toISOString(),
      days: [day("Hyderabad", { eventTypeIds: title as string[], eventDate: "2099-06-01" })],
      matches: null,
      selectedVendorId: null,
    } as Booking;
  }

  const draftNudges = async () => (await getNotifications()).filter((n) => n.type === "draft_resume_nudge" || n.type === "draft_followup_nudge");

  test("many drafts → one OS schedule slot, and empty drafts are ignored", async () => {
    const drafts = [draft("d1", ["wedding"], 1), draft("d2", ["baby_shoot"], 2), draft("d3", [], 0.5)];
    await runEngineTick(drafts, profile);
    const calls = (pushNotificationService.scheduleAt as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("draft_nudge");
    expect(calls[0][1].data.booking_id).toBe("d1"); // most recently edited, non-empty
  });

  test("exactly two reminders ever: first, then a different follow-up after 3 days", async () => {
    const drafts = [draft("d1", ["wedding"], 30), draft("d2", ["corporate_event"], 31)];

    await runEngineTick(drafts, profile);
    await runEngineTick(drafts, profile); // repeated ticks must not repeat it
    let nudges = await draftNudges();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].type).toBe("draft_resume_nudge");

    now += 24 * HOUR; // a day later: still nothing new
    await runEngineTick(drafts, profile);
    expect(await draftNudges()).toHaveLength(1);

    now += 3 * 24 * HOUR; // follow-up is due
    await runEngineTick(drafts, profile);
    nudges = await draftNudges();
    expect(nudges).toHaveLength(2);
    const followup = nudges.find((n) => n.type === "draft_followup_nudge")!;
    const first = nudges.find((n) => n.type === "draft_resume_nudge")!;
    expect(followup.title).not.toBe(first.title);

    now += 30 * 24 * HOUR; // and never again
    await runEngineTick(drafts, profile);
    expect(await draftNudges()).toHaveLength(2);
  });

  test("legacy per-draft OS reminders are purged on upgrade", async () => {
    await runEngineTick([draft("d1", ["wedding"], 1)], profile);
    expect(pushNotificationService.cancelScheduledWhere).toHaveBeenCalledTimes(1);
  });
});
