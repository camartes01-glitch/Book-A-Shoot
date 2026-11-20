import { addHours, buildReelsBooking, reelsTotal, validateReelsInput, type ReelsBookingInput } from "@/src/domain/reelsRequest";
import { selectActiveWizardDraft, toCamartesBookingRequest } from "@/src/domain/bookingRequest";
import { reelsPrice } from "@/src/constants/reels";
import { validateBooking } from "@/src/engine/validation";
import { eventTypeLabels, getEnabledCategories } from "@/src/constants/eventCategories";
import type { CustomerProfile } from "@/src/types/booking";

const location = {
  placeId: "p1",
  formattedAddress: "Road No. 36, Jubilee Hills, Hyderabad, Telangana",
  latitude: 17.43,
  longitude: 78.41,
  city: "Hyderabad",
  district: "Hyderabad",
  state: "Telangana",
  pincode: "500033",
  manuallyEdited: false,
};

const input: ReelsBookingInput = {
  plan: "reels",
  contentType: "fashion_lifestyle",
  reelCount: 3,
  editing: "edited",
  setting: "studio",
  durationHours: 2,
  notes: "  Two outfits, warm tones  ",
  eventDate: "2099-01-15",
  startTime: "10:00",
  location,
};

const profile = {
  customerId: "cust_1",
  name: "Asha",
  email: "asha@example.com",
  mobile: "9876543210",
  avatarInitials: "A",
  savedAddresses: [],
} as unknown as CustomerProfile;

describe("CamReels pricing (mirrors backend/camreels.py)", () => {
  it.each([
    [1, "edited", 4000],
    [2, "edited", 8000],
    [3, "edited", 10000],
    [4, "edited", 14000],
    [6, "edited", 20000],
    [1, "raw", 3000],
    [3, "raw", 7000],
    [5, "raw", 13000],
  ] as const)("%i %s reel(s) cost ₹%i", (count, editing, total) => {
    expect(reelsPrice(count, editing)).toBe(total);
  });

  it("prices CamReels Monthly at ₹50,000", () => {
    expect(reelsTotal("monthly", 0, "edited")).toBe(50000);
  });
});

describe("CamReels booking", () => {
  it("builds a valid single-day videography booking with a fixed price", () => {
    const b = buildReelsBooking("cust_1", input);
    expect(b.reels).toMatchObject({ plan: "reels", reelCount: 3, editing: "edited", quoteMin: 10000, quoteMax: 10000, notes: "Two outfits, warm tones" });
    expect(b.reels).not.toHaveProperty("tier");
    expect(b.budget).toBe(10000);
    expect(b.days[0]).toMatchObject({ eventTypeIds: ["camreels_shoot"], startTime: "10:00", endTime: "12:00", overnight: false });
    expect(b.days[0].videography.candid).toBe(true);
    expect(validateBooking(b)).toEqual([]);
    expect(eventTypeLabels(b.days[0].eventTypeIds)).toBe("CamReels Shoot");
  });

  it("makes Monthly unlimited, edited and ₹50,000", () => {
    const b = buildReelsBooking("cust_1", { ...input, plan: "monthly", reelCount: 999, editing: "raw" });
    expect(b.reels).toMatchObject({ plan: "monthly", reelCount: 0, editing: "edited", quoteMax: 50000 });
    expect(validateReelsInput({ ...input, plan: "monthly", reelCount: 0 }, "2026-11-19")).toEqual([]);
  });

  it("never shows CamReels in the event picker", () => {
    expect(getEnabledCategories().some((c) => c.id === "camreels_shoot")).toBe(false);
  });

  it("limits reels to 1-10 and validates required fields", () => {
    expect(validateReelsInput({ ...input, reelCount: 11 }, "2026-11-19").map((i) => i.field)).toEqual(["reelCount"]);
    const issues = validateReelsInput({ plan: "reels", reelCount: 0 }, "2026-11-19").map((i) => i.field);
    expect(issues).toEqual(expect.arrayContaining(["contentType", "reelCount", "eventDate", "startTime", "location", "setting"]));
  });

  it("computes end time across midnight", () => {
    expect(addHours("23:00", 2)).toEqual({ endTime: "01:00", overnight: true });
  });

  it("is never resumed as an event-wizard draft", () => {
    const reels = { ...buildReelsBooking("cust_1", input), status: "DRAFT" as const, draftCompletionPct: 50 };
    expect(selectActiveWizardDraft([reels])).toBeNull();
  });
});

describe("CamReels request sent to Camartes", () => {
  const body = toCamartesBookingRequest(buildReelsBooking("cust_1", input), profile);

  it("is marked CamReels so the backend routes it to videographers only", () => {
    expect(body.lead_details?.segment).toBe("camreels");
    expect(body.event_type).toBe("CamReels Shoot");
    expect(body.message.split("\n")[1]).toContain("CAMREELS REQUEST");
  });

  it("lets the backend choose providers", () => {
    expect(body.assigned_provider_ids).toEqual([]);
    expect(body.provider_id).toBeNull();
    expect(body.lead_details?.city).toBe("Hyderabad");
  });

  it("carries the machine fields the backend prices from, with no tiers", () => {
    expect(body.lead_details?.reels).toMatchObject({ planId: "reels", editingId: "edited", reelCount: 3, price: 10000 });
    // `packageTier` is the vendor app's field name; only tier *names* must be gone.
    expect(JSON.stringify(body)).not.toMatch(/Essential|Signature|Elite/);
  });

  it("gives videographers a clean brief", () => {
    expect(body.deliverables).toEqual(["3 Edited Reels"]);
    expect(body.lead_details?.packageTier).toBe("3 edited reels · ₹10,000");
    expect(body.message).toContain("Price: ₹10,000");
    expect(body.message).toContain("Creative Notes: Two outfits, warm tones");
    expect(body.message).toContain("no phones");
  });

  it("gives videographers a clear CamReels Monthly brief", () => {
    const monthly = toCamartesBookingRequest(buildReelsBooking("cust_1", { ...input, plan: "monthly", reelCount: 0 }), profile);
    expect(monthly.lead_details?.reels).toMatchObject({ planId: "monthly", price: 50000 });
    expect(monthly.deliverables).toEqual(["Unlimited Edited Reels for 30 Days (same videographer)"]);
    expect(monthly.lead_details?.packageTier).toBe("CamReels Monthly · ₹50,000");
  });

  it("keeps the customer's contact out of the brief (revealed only after accept)", () => {
    expect(body.lead_details?.clientContactMasked).toBe(true);
    expect(JSON.stringify(body.lead_details)).not.toContain("9876543210");
    expect(body.message).not.toContain("9876543210");
    expect(body.message).not.toContain("asha@example.com");
  });
});
