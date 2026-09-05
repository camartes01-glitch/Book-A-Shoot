import { createEmptyDay } from "@/src/domain/defaults";
import {
  CORE_SERVICE_REQUIRED_MESSAGE,
  validateBooking,
  validateBudget,
  validateCoreServiceRule,
  validateDay,
  validateDays,
  validateExpectedDelivery,
} from "@/src/engine/validation";
import type { EventDay } from "@/src/types/booking";

function baseValidDay(): EventDay {
  const day = createEmptyDay(1);
  day.eventDate = "2099-01-01";
  day.eventTypeIds = ["wedding"];
  day.location.formattedAddress = "Tirupati, AP";
  day.location.city = "Tirupati";
  day.startTime = "17:00";
  day.endTime = "21:00";
  return day;
}

describe("core photography/videography add-on rule (spec section 2 / rules 7-9)", () => {
  const table: Array<{ name: string; setup: (d: EventDay) => void; allowed: boolean }> = [
    { name: "Photography only", setup: (d) => { d.photography = { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 }; }, allowed: true },
    { name: "Videography only", setup: (d) => { d.videography = { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 }; }, allowed: true },
    {
      name: "Photography + Videography",
      setup: (d) => {
        d.photography = { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 };
        d.videography = { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 };
      },
      allowed: true,
    },
    {
      name: "Photography + Drone",
      setup: (d) => {
        d.photography = { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 };
        d.aerial = { photographyDrones: 1, videographyDrones: 0 };
      },
      allowed: true,
    },
    {
      name: "Videography + LED Wall",
      setup: (d) => {
        d.videography = { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 };
        d.ledWall = { enabled: true, size: "8 x 12", screenCount: 1 };
      },
      allowed: true,
    },
    {
      name: "Photography + Web Live",
      setup: (d) => {
        d.photography = { traditional: true, traditionalCount: 1, candid: false, candidCount: 1 };
        d.webLive = { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" };
      },
      allowed: true,
    },
    { name: "Drone only", setup: (d) => { d.aerial = { photographyDrones: 1, videographyDrones: 0 }; }, allowed: false },
    { name: "LED Wall only", setup: (d) => { d.ledWall = { enabled: true, size: "8 x 12", screenCount: 1 }; }, allowed: false },
    {
      name: "Web Live only",
      setup: (d) => { d.webLive = { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" }; },
      allowed: false,
    },
    {
      name: "Drone + LED Wall",
      setup: (d) => {
        d.aerial = { photographyDrones: 1, videographyDrones: 0 };
        d.ledWall = { enabled: true, size: "8 x 12", screenCount: 1 };
      },
      allowed: false,
    },
    {
      name: "LED Wall + Web Live",
      setup: (d) => {
        d.ledWall = { enabled: true, size: "8 x 12", screenCount: 1 };
        d.webLive = { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" };
      },
      allowed: false,
    },
  ];

  test.each(table)("$name -> allowed=$allowed", ({ setup, allowed }) => {
    const day = createEmptyDay(1);
    setup(day);
    const issues = validateCoreServiceRule(day);
    if (allowed) {
      expect(issues).toHaveLength(0);
    } else {
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe("CORE_SERVICE_REQUIRED");
      expect(issues[0].message).toBe(CORE_SERVICE_REQUIRED_MESSAGE);
    }
  });

  test("a day with nothing selected at all is not flagged by the core-service rule", () => {
    const day = createEmptyDay(1);
    expect(validateCoreServiceRule(day)).toHaveLength(0);
  });
});

describe("validateDay", () => {
  test("a fully filled-in valid day has no issues", () => {
    expect(validateDay(baseValidDay())).toHaveLength(0);
  });

  test("rejects a past event date (rule 3)", () => {
    const day = baseValidDay();
    day.eventDate = "2000-01-01";
    const issues = validateDay(day);
    expect(issues.some((i) => i.code === "EVENT_DATE_PAST")).toBe(true);
  });

  test("rejects end time before start time (rule 2)", () => {
    const day = baseValidDay();
    day.startTime = "21:00";
    day.endTime = "18:00";
    day.overnight = false;
    const issues = validateDay(day);
    expect(issues.some((i) => i.code === "END_BEFORE_START")).toBe(true);
  });

  test("allows an overnight event where end time is numerically before start time", () => {
    const day = baseValidDay();
    day.startTime = "20:00";
    day.endTime = "02:00";
    day.overnight = true;
    const issues = validateDay(day);
    expect(issues.some((i) => i.code === "END_BEFORE_START")).toBe(false);
  });

  test("requires photographer count > 0 when photography style selected (rule 5)", () => {
    const day = baseValidDay();
    day.photography = { traditional: true, traditionalCount: 0, candid: false, candidCount: 1 };
    const issues = validateDay(day);
    expect(issues.some((i) => i.code === "PHOTOGRAPHY_COUNT_REQUIRED")).toBe(true);
  });

  test("requires videographer count > 0 when videography style selected (rule 6)", () => {
    const day = baseValidDay();
    day.videography = { traditional: true, traditionalCount: 0, candid: false, candidCount: 1 };
    const issues = validateDay(day);
    expect(issues.some((i) => i.code === "VIDEOGRAPHY_COUNT_REQUIRED")).toBe(true);
  });
});

describe("validateExpectedDelivery (rule 4)", () => {
  test("rejects delivery date before the final event date across multiple days", () => {
    const days = [baseValidDay(), { ...baseValidDay(), eventDate: "2099-01-05" }];
    const issues = validateExpectedDelivery(days, "2099-01-03");
    expect(issues.some((i) => i.code === "DELIVERY_BEFORE_EVENT")).toBe(true);
  });

  test("accepts a delivery date on/after the final event date", () => {
    const days = [baseValidDay(), { ...baseValidDay(), eventDate: "2099-01-05" }];
    const issues = validateExpectedDelivery(days, "2099-01-06");
    expect(issues).toHaveLength(0);
  });
});

describe("validateBudget (rule 10)", () => {
  test("rejects zero or negative budget", () => {
    expect(validateBudget(0)).toHaveLength(1);
    expect(validateBudget(-100)).toHaveLength(1);
    expect(validateBudget(null)).toHaveLength(1);
  });

  test("accepts a positive budget", () => {
    expect(validateBudget(50000)).toHaveLength(0);
  });
});

describe("validateDays vs validateBooking (regression: days screen must not demand a delivery date)", () => {
  test("validateDays passes for well-formed days even with no expected delivery date set yet", () => {
    // This is exactly the state of a fresh booking when the customer taps
    // Continue on the days-overview screen — deliverables/expected delivery
    // haven't been visited yet, so expectedDeliveryDate is still null.
    const days = [baseValidDay()];
    expect(validateDays(days)).toHaveLength(0);
  });

  test("validateBooking still requires an expected delivery date once that step is reached", () => {
    const days = [baseValidDay()];
    const issues = validateBooking({
      bookingId: "b1",
      customerId: "c1",
      status: "DRAFT",
      createdAt: "",
      updatedAt: "",
      days,
      deliverables: {
        photo: { rawPhotos: false, editedPhotosOption: "50", editedPhotosCustomCount: null, album: false, albumPagesOption: null, albumPagesCustomCount: null },
        video: { rawVideo: false, editedTraditionalVideoCount: 0, editedCinematicVideoCount: 0 },
      },
      expectedDeliveryDate: null,
      budget: null,
      selectedPackage: null,
      packageOptions: null,
      matches: null,
      selectedVendorId: null,
      estimatedAmount: null,
      counterOffer: null,
      draftCompletionPct: 0,
    });
    expect(issues.some((i) => i.code === "DELIVERY_DATE_REQUIRED")).toBe(true);
  });
});
