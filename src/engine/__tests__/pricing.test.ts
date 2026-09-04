import { createEmptyDay, emptyDeliverables } from "@/src/domain/defaults";
import { checkBudgetFeasibility, estimateBookingCost, generatePackageOptions } from "@/src/engine/pricing";
import type { EventDay } from "@/src/types/booking";

function weddingDay(): EventDay {
  const day = createEmptyDay(1);
  day.eventDate = "2099-01-01";
  day.eventTypeIds = ["wedding"];
  day.location = { ...day.location, city: "Hyderabad", formattedAddress: "Hyderabad" };
  day.startTime = "17:00";
  day.endTime = "23:00";
  day.photography = { traditional: true, traditionalCount: 1, candid: true, candidCount: 2 };
  day.videography = { traditional: true, traditionalCount: 1, candid: true, candidCount: 1 };
  return day;
}

describe("estimateBookingCost", () => {
  test("is zero for a booking with no services and zeroed-out deliverables", () => {
    const day = createEmptyDay(1);
    const deliverables = emptyDeliverables();
    deliverables.photo.editedPhotosOption = "custom";
    deliverables.photo.editedPhotosCustomCount = 0;
    expect(estimateBookingCost({ days: [day], deliverables })).toBe(0);
  });

  test("increases when more photographers/videographers are requested", () => {
    const smaller = weddingDay();
    const larger = weddingDay();
    larger.photography.candidCount = 5;
    const costSmall = estimateBookingCost({ days: [smaller], deliverables: emptyDeliverables() });
    const costLarge = estimateBookingCost({ days: [larger], deliverables: emptyDeliverables() });
    expect(costLarge).toBeGreaterThan(costSmall);
  });

  test("adds cost for add-ons (drones, LED wall, web live)", () => {
    const base = weddingDay();
    const withAddOns = weddingDay();
    withAddOns.aerial = { photographyDrones: 1, videographyDrones: 1 };
    withAddOns.ledWall = { enabled: true, size: "8 x 12", screenCount: 2 };
    withAddOns.webLive = { enabled: true, quality: "4K", cameraCount: 2, streamingPlatform: "", accessType: "private" };
    const costBase = estimateBookingCost({ days: [base], deliverables: emptyDeliverables() });
    const costWithAddOns = estimateBookingCost({ days: [withAddOns], deliverables: emptyDeliverables() });
    expect(costWithAddOns).toBeGreaterThan(costBase);
  });
});

describe("generatePackageOptions", () => {
  test("always returns exactly Essential, Signature and Elite, in ascending price order", () => {
    const options = generatePackageOptions({ days: [weddingDay()], deliverables: emptyDeliverables() }, 150000);
    expect(options.map((o) => o.id)).toEqual(["essential", "signature", "elite"]);
    expect(options[0].maxPrice).toBeLessThanOrEqual(options[1].minPrice + 1);
    expect(options[1].maxPrice).toBeLessThanOrEqual(options[2].minPrice + 1);
  });

  test("marks exactly one package as recommended", () => {
    const options = generatePackageOptions({ days: [weddingDay()], deliverables: emptyDeliverables() }, 150000);
    expect(options.filter((o) => o.recommended)).toHaveLength(1);
  });

  test("never hard-codes Silver/Gold/Platinum labels", () => {
    const options = generatePackageOptions({ days: [weddingDay()], deliverables: emptyDeliverables() }, 150000);
    const labels = options.map((o) => o.label.toLowerCase());
    expect(labels).not.toContain("silver");
    expect(labels).not.toContain("gold");
    expect(labels).not.toContain("platinum");
  });
});

describe("checkBudgetFeasibility (spec section 43)", () => {
  test("flags a budget that is clearly below the estimated requirement cost", () => {
    const heavyDay = weddingDay();
    heavyDay.photography.traditionalCount = 4;
    heavyDay.videography.traditionalCount = 3;
    heavyDay.aerial = { photographyDrones: 2, videographyDrones: 0 };
    heavyDay.ledWall = { enabled: true, size: "12 x 16", screenCount: 2 };
    heavyDay.webLive = { enabled: true, quality: "4K", cameraCount: 1, streamingPlatform: "", accessType: "private" };
    const deliverables = emptyDeliverables();
    deliverables.photo.editedPhotosOption = "100";
    deliverables.photo.album = true;
    deliverables.photo.albumPagesOption = "25";
    deliverables.video.editedCinematicVideoCount = 3;

    const result = checkBudgetFeasibility({ days: [heavyDay], deliverables }, 40000);
    expect(result.isBelowEstimate).toBe(true);
    expect(result.shortfall).toBeGreaterThan(0);
  });

  test("does not flag a generous budget", () => {
    const result = checkBudgetFeasibility({ days: [weddingDay()], deliverables: emptyDeliverables() }, 10000000);
    expect(result.isBelowEstimate).toBe(false);
    expect(result.shortfall).toBe(0);
  });
});
