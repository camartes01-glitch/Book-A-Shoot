import {
  DEFAULT_EVENT_CATEGORIES,
  REAL_CELEBRATION_ITEMS,
  HOME_QUICK_PICKS,
  EVENT_TAGLINES,
  eventTypeLabel,
  eventTypeLabels,
  categoryMatchesSearchQuery,
} from "@/src/constants/eventCategories";
import { categoryImageFor, CATEGORY_IMAGES } from "@/src/constants/homeMedia";
import { getBookingEventTitle } from "@/src/domain/bookingFilters";
import { createEmptyBooking } from "@/src/domain/defaults";

describe("All Events Catalog & Custom Event Resolution", () => {
  it("contains all database event categories across wedding, personal, commercial, and pooja", () => {
    expect(DEFAULT_EVENT_CATEGORIES.length).toBeGreaterThanOrEqual(35);
    const groups = new Set(DEFAULT_EVENT_CATEGORIES.map((c) => c.group));
    expect(groups).toContain("wedding");
    expect(groups).toContain("personal");
    expect(groups).toContain("commercial");
    expect(groups).toContain("pooja");
  });

  it("includes real celebration portfolio items with labels and taglines", () => {
    expect(REAL_CELEBRATION_ITEMS.length).toBe(3);
    const ids = REAL_CELEBRATION_ITEMS.map((item) => item.id);
    expect(ids).toContain("mehndi");
    expect(ids).toContain("drone");
    expect(ids).toContain("led_wall");
  });

  it("ensures every database event and real celebration has a valid display image", () => {
    for (const cat of DEFAULT_EVENT_CATEGORIES) {
      const img = categoryImageFor(cat.id);
      expect(img).toBeDefined();
    }

    for (const item of REAL_CELEBRATION_ITEMS) {
      const img = categoryImageFor(item.id);
      expect(img).toBeDefined();
    }
  });

  it("correctly resolves custom event names in eventTypeLabel", () => {
    expect(eventTypeLabel("Silver Jubilee")).toBe("Silver Jubilee");
    expect(eventTypeLabel("College Fest 2026")).toBe("College Fest 2026");
    expect(eventTypeLabel("convocation_day")).toBe("Convocation Day");
  });

  it("formats custom event name as the title in getBookingEventTitle", () => {
    const booking = createEmptyBooking("cust_test");
    booking.days[0].eventTypeIds = ["Silver Jubilee"];
    booking.eventName = "Silver Jubilee";

    const title = getBookingEventTitle(booking);
    expect(title).toBe("Silver Jubilee");
  });

  it("matches search queries against labels, groups, and tags", () => {
    const haldi = DEFAULT_EVENT_CATEGORIES.find((c) => c.id === "haldi")!;
    expect(categoryMatchesSearchQuery(haldi, "haldi")).toBe(true);
    expect(categoryMatchesSearchQuery(haldi, "wedding")).toBe(true);

    const pooja = DEFAULT_EVENT_CATEGORIES.find((c) => c.id === "ganesh_pooja")!;
    expect(categoryMatchesSearchQuery(pooja, "ganesh")).toBe(true);
    expect(categoryMatchesSearchQuery(pooja, "pooja")).toBe(true);
    expect(categoryMatchesSearchQuery(pooja, "puja")).toBe(true);
  });
});
