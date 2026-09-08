import { vendorsFromSearchHits } from "@/src/services/vendorApi";

describe("live catalog mapping", () => {
  test("does not invent a 4.3 rating or Hyderabad city when the catalog omitted them", () => {
    const [vendor] = vendorsFromSearchHits([
      {
        user_id: "user_16eeb421bc07",
        full_name: "Sai Amarnath",
        city: "",
        service_type: "photographer",
        shooting_style: ["Candid"],
        avg_rating: 0,
        is_available: true,
      },
    ]);
    expect(vendor.vendorId).toBe("user_16eeb421bc07");
    expect(vendor.rating).toBe(0);
    expect(vendor.city).toBe("");
    expect(vendor.kycVerified).toBe(false);
    expect(vendor.basePricePerDay).toBe(0);
    expect(vendor.photography.candid).toBe(true);
    expect(vendor.photography.traditional).toBe(false);
  });

  test("uses catalog full-day price when present and does not substitute 18000", () => {
    const [vendor] = vendorsFromSearchHits([
      {
        user_id: "user_25493cf5103e",
        full_name: "Pavan Kumar R",
        city: "Hyderabad",
        service_type: "photographer",
        shooting_style: ["Traditional"],
        avg_rating: 0,
        is_available: true,
        pricing: { price_full_day: 15000 },
      },
    ]);
    expect(vendor.basePricePerDay).toBe(15000);
    expect(vendor.city).toBe("Hyderabad");
    expect(vendor.listedAvailable).toBe(true);
  });

  test("empty photographer styles are treated as both styles; listed unavailable stays unavailable", () => {
    const [open, closed] = vendorsFromSearchHits([
      { user_id: "open", full_name: "Open Studio", city: "Tirupati", service_type: "photographer", is_available: true },
      { user_id: "closed", full_name: "Closed Studio", city: "Tirupati", service_type: "photographer", is_available: false },
    ]);
    expect(open.photography.traditional).toBe(true);
    expect(open.photography.candid).toBe(true);
    expect(closed.listedAvailable).toBe(false);
  });
});
