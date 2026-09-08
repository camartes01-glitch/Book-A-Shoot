import {
  DEFAULT_EVENT_CATEGORIES,
  EVENT_GROUP_LABEL,
  HOME_POOJA_DISCOVERY,
  HOME_QUICK_PICKS,
  POOJA_EVENT_TYPE_IDS,
  categoryMatchesSearchQuery,
  eventTypeLabel,
  eventTypeLabels,
  getEnabledCategories,
} from "@/src/constants/eventCategories";
import { createEmptyBooking, createEmptyDay, duplicateDay, sanitizeEventDay } from "@/src/domain/defaults";
import {
  isAerialEnabled,
  selectedAddOnLabels,
  setAerialEnabled,
  setPhotographySelected,
  setVideographySelected,
} from "@/src/domain/dayServices";
import { toCamartesBookingRequest } from "@/src/domain/bookingRequest";
import {
  CORE_SERVICE_REQUIRED_MESSAGE,
  hasCoreService,
  validateCoreServiceRule,
  validateDay,
} from "@/src/engine/validation";
import * as bookingApi from "@/src/services/bookingApi";
import type { Booking, EventDay } from "@/src/types/booking";

const POOJA_LABELS = [
  "Ganesh Pooja",
  "Satyanarayan Pooja",
  "Gruha Pravesh Pooja",
  "Lakshmi Pooja",
  "Saraswati Pooja",
  "Navratri Pooja",
  "Diwali Pooja",
  "Durga Pooja",
  "Varalakshmi Vratham",
  "Naming Ceremony Pooja",
  "Wedding Pooja",
  "Other Pooja",
] as const;

const BOOKING_REQUEST_KEYS = [
  "budget",
  "client_email",
  "client_name",
  "client_phone",
  "duration_hours",
  "end_date",
  "event_date",
  "event_time",
  "message",
  "provider_id",
  "provider_profile_id",
  "service_type",
];

function completeDay(patch: Partial<EventDay> = {}): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(1),
    eventDate: "2099-10-12",
    eventTypeIds: ["ganesh_pooja"],
    location: {
      ...createEmptyDay(1).location,
      formattedAddress: "Tirupati, AP",
      city: "Tirupati",
    },
    startTime: "10:00",
    endTime: "16:00",
    ...patch,
  });
}

function bookingWith(days: EventDay[], extra: Partial<Booking> = {}): Booking {
  const base = createEmptyBooking("cust-pooja");
  return {
    ...base,
    days,
    expectedDeliveryDate: "2099-11-01",
    budget: 80000,
    selectedPackage: "signature",
    selectedVendorId: "user_16eeb421bc07",
    ...extra,
  };
}

function toggleEventType(day: EventDay, id: string): EventDay {
  return {
    ...day,
    eventTypeIds: day.eventTypeIds.includes(id) ? day.eventTypeIds.filter((t) => t !== id) : [...day.eventTypeIds, id],
  };
}

describe("Pooja event category", () => {
  test("a dedicated POOJA group exists alongside Wedding, Personal Events, and Commercial", () => {
    expect(EVENT_GROUP_LABEL.pooja).toBe("Pooja");
    expect(EVENT_GROUP_LABEL.wedding).toBe("Wedding");
    expect(EVENT_GROUP_LABEL.personal).toBe("Personal Events");
    expect(EVENT_GROUP_LABEL.commercial).toBe("Commercial");
    expect(DEFAULT_EVENT_CATEGORIES.some((c) => c.group === "pooja")).toBe(true);
  });

  test("Pooja includes the twelve required event types and does not rename existing categories", () => {
    const pooja = DEFAULT_EVENT_CATEGORIES.filter((c) => c.group === "pooja");
    expect(pooja.map((c) => c.label)).toEqual([...POOJA_LABELS]);
    expect(POOJA_EVENT_TYPE_IDS).toEqual([
      "ganesh_pooja",
      "satyanarayan_pooja",
      "gruha_pravesh_pooja",
      "lakshmi_pooja",
      "saraswati_pooja",
      "navratri_pooja",
      "diwali_pooja",
      "durga_pooja",
      "varalakshmi_vratham",
      "naming_ceremony_pooja",
      "wedding_pooja",
      "other_pooja",
    ]);
    expect(DEFAULT_EVENT_CATEGORIES.find((c) => c.id === "wedding")?.label).toBe("Wedding");
    expect(DEFAULT_EVENT_CATEGORIES.find((c) => c.id === "birthday")?.label).toBe("Birthday");
    expect(DEFAULT_EVENT_CATEGORIES.find((c) => c.id === "corporate_event")?.label).toBe("Corporate Event");
    expect(DEFAULT_EVENT_CATEGORIES.filter((c) => c.group !== "pooja").map((c) => c.order)).toEqual(
      Array.from({ length: 23 }, (_, i) => i + 1),
    );
  });

  test.each(POOJA_EVENT_TYPE_IDS)("%s can be selected like any other event type", (id) => {
    const selected = toggleEventType(createEmptyDay(1), id);
    expect(selected.eventTypeIds).toEqual([id]);
    expect(eventTypeLabel(id)).not.toBe("Personal Event");
  });

  test("Ganesh, Satyanarayan, Gruha Pravesh, Lakshmi, and Other Pooja keep their specific labels", () => {
    expect(eventTypeLabel("ganesh_pooja")).toBe("Ganesh Pooja");
    expect(eventTypeLabel("satyanarayan_pooja")).toBe("Satyanarayan Pooja");
    expect(eventTypeLabel("gruha_pravesh_pooja")).toBe("Gruha Pravesh Pooja");
    expect(eventTypeLabel("lakshmi_pooja")).toBe("Lakshmi Pooja");
    expect(eventTypeLabel("other_pooja")).toBe("Other Pooja");
  });

  test("clearing the event type clears the Pooja selection", () => {
    const withPooja = toggleEventType(createEmptyDay(1), "ganesh_pooja");
    const cleared = toggleEventType(withPooja, "ganesh_pooja");
    expect(cleared.eventTypeIds).toEqual([]);
    expect(validateDay({ ...completeDay(), eventTypeIds: [] }).some((i) => i.code === "EVENT_TYPE_REQUIRED")).toBe(true);
  });
});

describe("Pooja is an event type, not a service", () => {
  test("Pooja alone does not satisfy Photography/Videography validation", () => {
    const day = completeDay({
      photography: { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 },
      videography: { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 },
    });
    expect(hasCoreService(day)).toBe(false);
    expect(validateDay(day).some((i) => i.code === "CORE_SERVICE_REQUIRED")).toBe(true);
    expect(validateDay(day).find((i) => i.code === "CORE_SERVICE_REQUIRED")?.message).toBe(CORE_SERVICE_REQUIRED_MESSAGE);
  });

  test("Photography + Pooja is valid", () => {
    const day = setPhotographySelected(completeDay({ eventTypeIds: ["ganesh_pooja"] }), true);
    expect(hasCoreService(day)).toBe(true);
    expect(validateDay(day).filter((i) => i.code === "CORE_SERVICE_REQUIRED")).toEqual([]);
    expect(validateDay(day)).toEqual([]);
  });

  test("Videography + Pooja is valid", () => {
    const day = setVideographySelected(completeDay({ eventTypeIds: ["lakshmi_pooja"] }), true);
    expect(hasCoreService(day)).toBe(true);
    expect(validateDay(day)).toEqual([]);
  });

  test("Pooja + Drone follows existing add-on rules", () => {
    const poojaOnly = completeDay({
      photography: { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 },
      aerial: { photographyDrones: 1, videographyDrones: 0 },
    });
    expect(validateDay(poojaOnly).some((i) => i.code === "CORE_SERVICE_REQUIRED")).toBe(true);
    const withPhoto = setAerialEnabled(setPhotographySelected(completeDay(), true), true);
    expect(isAerialEnabled(withPhoto)).toBe(true);
    expect(validateCoreServiceRule(withPhoto)).toEqual([]);
    expect(validateDay(withPhoto)).toEqual([]);
  });

  test("Pooja + LED Wall follows existing add-on rules", () => {
    const ledOnly = completeDay({
      photography: { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 },
      ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
    });
    expect(validateCoreServiceRule(ledOnly).length).toBeGreaterThan(0);
    const allowed = {
      ...setPhotographySelected(completeDay(), true),
      ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
    };
    expect(validateCoreServiceRule(allowed)).toEqual([]);
    expect(validateDay(allowed)).toEqual([]);
  });

  test("Pooja + Photography + Videography + Aerial + LED Wall + Web Live is valid", () => {
    let day = setVideographySelected(setPhotographySelected(completeDay({ eventTypeIds: ["navratri_pooja"] }), true), true);
    day = setAerialEnabled(day, true);
    day = {
      ...day,
      ledWall: { enabled: true, size: "6 x 8", screenCount: 1 },
      webLive: { enabled: true, quality: "4K" as const, cameraCount: 1, streamingPlatform: "", accessType: "private" as const },
    };
    expect(validateDay(day)).toEqual([]);
    expect(selectedAddOnLabels(day).sort()).toEqual(["Drone / Aerial", "LED Wall", "Web Live"].sort());
  });

  test("Pooja + Web Live follows existing add-on rules", () => {
    const liveOnly = completeDay({
      photography: { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 },
      webLive: { enabled: true, quality: "HD" as const, cameraCount: 1, streamingPlatform: "", accessType: "private" as const },
    });
    expect(validateCoreServiceRule(liveOnly).length).toBeGreaterThan(0);
    const allowed = {
      ...setVideographySelected(completeDay({ eventTypeIds: ["other_pooja"] }), true),
      webLive: { enabled: true, quality: "HD" as const, cameraCount: 1, streamingPlatform: "", accessType: "private" as const },
    };
    expect(validateCoreServiceRule(allowed)).toEqual([]);
    expect(validateDay(allowed)).toEqual([]);
  });
});

describe("Pooja persistence and multi-day isolation", () => {
  test("selected Pooja event type persists on the event-day model", async () => {
    const created = await bookingApi.createBooking("cust-pooja-persist");
    const dayId = created.days[0].dayId;
    await bookingApi.updateDay(created.bookingId, dayId, { eventTypeIds: ["ganesh_pooja"] });
    const reloaded = await bookingApi.getBooking(created.bookingId);
    expect(reloaded?.days[0].eventTypeIds).toEqual(["ganesh_pooja"]);
  });

  test("changing budget, package, or services does not remove Pooja", async () => {
    const created = await bookingApi.createBooking("cust-pooja-flow");
    const dayId = created.days[0].dayId;
    await bookingApi.updateDay(created.bookingId, dayId, {
      ...setPhotographySelected(created.days[0], true),
      eventTypeIds: ["satyanarayan_pooja"],
      eventDate: "2099-10-12",
      startTime: "10:00",
      endTime: "16:00",
      location: { ...created.days[0].location, formattedAddress: "Hyderabad", city: "Hyderabad" },
    });
    await bookingApi.updateExpectedDelivery(created.bookingId, "2099-11-01");
    await bookingApi.submitBudget(created.bookingId, 80000);
    const withPackage = await bookingApi.selectPackage(created.bookingId, "signature");
    expect(withPackage.days[0].eventTypeIds).toEqual(["satyanarayan_pooja"]);
    const afterServices = await bookingApi.updateDay(created.bookingId, dayId, {
      ...setVideographySelected(setPhotographySelected(withPackage.days[0], true), true),
      eventTypeIds: ["satyanarayan_pooja"],
    });
    expect(afterServices.days[0].eventTypeIds).toEqual(["satyanarayan_pooja"]);
  });

  test("Pooja remains isolated between multiple event days", () => {
    const day1 = setPhotographySelected(completeDay({ eventTypeIds: ["ganesh_pooja"] }), true);
    const day2 = setVideographySelected(completeDay({ order: 2, eventTypeIds: ["lakshmi_pooja"] }), true);
    day2.dayId = "day-2";
    expect(day1.eventTypeIds).toEqual(["ganesh_pooja"]);
    expect(day2.eventTypeIds).toEqual(["lakshmi_pooja"]);
    day2.eventTypeIds = ["diwali_pooja"];
    expect(day1.eventTypeIds).toEqual(["ganesh_pooja"]);
  });

  test("duplicating a Pooja day copies event types without changing the source day", () => {
    const day1 = setPhotographySelected(completeDay({ eventTypeIds: ["gruha_pravesh_pooja"] }), true);
    const copy = duplicateDay(day1, 2);
    copy.eventTypeIds = ["wedding_pooja"];
    expect(day1.eventTypeIds).toEqual(["gruha_pravesh_pooja"]);
    expect(copy.eventTypeIds).toEqual(["wedding_pooja"]);
    expect(copy.eventDate).toBeNull();
  });
});

describe("Pooja summary, search, and booking payload", () => {
  test("Pooja appears in booking summary labels, never as Personal Event", () => {
    const summary = eventTypeLabels(["ganesh_pooja"]);
    expect(summary).toBe("Ganesh Pooja");
    expect(summary).not.toContain("Personal Event");
    expect(eventTypeLabels(["satyanarayan_pooja", "lakshmi_pooja"])).toBe("Satyanarayan Pooja, Lakshmi Pooja");
  });

  test("search finds Pooja types through the existing event-type filter", () => {
    const enabled = getEnabledCategories();
    const byQuery = (q: string) => enabled.filter((c) => categoryMatchesSearchQuery(c, q)).map((c) => c.id);
    expect(byQuery("Pooja")).toEqual(expect.arrayContaining(POOJA_EVENT_TYPE_IDS));
    expect(byQuery("Ganesh Pooja")).toContain("ganesh_pooja");
    expect(byQuery("Satyanarayan Pooja")).toContain("satyanarayan_pooja");
    expect(byQuery("Gruha Pravesh")).toContain("gruha_pravesh_pooja");
    expect(byQuery("Lakshmi Pooja")).toContain("lakshmi_pooja");
    expect(HOME_QUICK_PICKS).not.toContain("pooja");
    expect(HOME_POOJA_DISCOVERY.label).toBe("Pooja");
  });

  test("Pooja flows through the existing booking request mapping without inventing unsupported fields", () => {
    const body = toCamartesBookingRequest(
      bookingWith([setPhotographySelected(completeDay({ eventTypeIds: ["ganesh_pooja"] }), true)]),
      { customerId: "cust-1", name: "Asha", mobile: "9876543210", email: "asha@example.com", avatarInitials: "A", savedAddresses: [] },
    );
    expect(Object.keys(body).sort()).toEqual([...BOOKING_REQUEST_KEYS].sort());
    expect(body).not.toHaveProperty("event_type");
    expect(body).not.toHaveProperty("event_types");
    expect(body.provider_id).toBe("user_16eeb421bc07");
    expect(body.service_type).toBe("photographer");
    expect(body.budget).toBe("80000");
    expect(body.message).toContain("Event type: Ganesh Pooja");
    expect(body.message).not.toContain("Personal Event");
  });
});
