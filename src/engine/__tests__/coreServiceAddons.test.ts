import { createEmptyDay, duplicateDay, sanitizeEventDay } from "@/src/domain/defaults";
import {
  applyAerialGate,
  bookingRequirementPayload,
  isAerialEnabled,
  isAerialSelectable,
  isPhotographySelected,
  isVideographySelected,
  selectedAddOnLabels,
  selectedCoreServiceLabels,
  setAerialEnabled,
  setPhotographySelected,
  setVideographySelected,
} from "@/src/domain/dayServices";
import { aggregateRequirement } from "@/src/engine/matching";
import {
  CORE_SERVICE_REQUIRED_MESSAGE,
  isDayComplete,
  shouldShowCoreServiceError,
  validateCoreServiceRule,
  validateDay,
} from "@/src/engine/validation";
import type { EventDay } from "@/src/types/booking";

function completeDay(patch: Partial<EventDay> = {}): EventDay {
  return sanitizeEventDay({
    ...createEmptyDay(1),
    eventDate: "2099-03-01",
    eventTypeIds: ["wedding"],
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

function persistLikeBookingApi(stored: EventDay, next: EventDay): EventDay {
  return sanitizeEventDay({ ...stored, ...next });
}

describe("core service + Drone/Aerial add-on transitions", () => {
  test("fresh day has Photography=false, Videography=false, and Aerial disabled", () => {
    const day = createEmptyDay(1);
    expect(isPhotographySelected(day)).toBe(false);
    expect(isVideographySelected(day)).toBe(false);
    expect(isAerialSelectable(day)).toBe(false);
    expect(isAerialEnabled(day)).toBe(false);
    expect(day.aerial).toEqual({ photographyDrones: 0, videographyDrones: 0 });
    expect(shouldShowCoreServiceError(day, false)).toBe(false);
  });

  test("selecting Photography enables Drone/Aerial immediately", () => {
    const day = setPhotographySelected(createEmptyDay(1), true);
    expect(isPhotographySelected(day)).toBe(true);
    expect(isAerialSelectable(day)).toBe(true);
    expect(isAerialEnabled(day)).toBe(false);
  });

  test("selecting Videography enables Drone/Aerial immediately", () => {
    const day = setVideographySelected(createEmptyDay(1), true);
    expect(isVideographySelected(day)).toBe(true);
    expect(isAerialSelectable(day)).toBe(true);
    expect(isAerialEnabled(day)).toBe(false);
  });

  test("selecting both core services keeps Drone/Aerial selectable", () => {
    const day = setVideographySelected(setPhotographySelected(createEmptyDay(1), true), true);
    expect(isPhotographySelected(day)).toBe(true);
    expect(isVideographySelected(day)).toBe(true);
    expect(isAerialSelectable(day)).toBe(true);
  });

  test("selecting Drone/Aerial after Photography succeeds and writes drone counts", () => {
    const day = setAerialEnabled(setPhotographySelected(createEmptyDay(1), true), true);
    expect(isAerialEnabled(day)).toBe(true);
    expect(day.aerial.photographyDrones).toBe(1);
    expect(day.aerial.videographyDrones).toBe(0);
  });

  test("selecting Drone/Aerial after Videography succeeds and writes drone counts", () => {
    const day = setAerialEnabled(setVideographySelected(createEmptyDay(1), true), true);
    expect(isAerialEnabled(day)).toBe(true);
    expect(day.aerial.videographyDrones).toBe(1);
    expect(day.aerial.photographyDrones).toBe(0);
  });

  test("Drone/Aerial cannot be turned on without a core service", () => {
    const day = setAerialEnabled(createEmptyDay(1), true);
    expect(isAerialEnabled(day)).toBe(false);
    expect(day.aerial).toEqual({ photographyDrones: 0, videographyDrones: 0 });
  });

  test("deselecting Photography while Videography remains keeps Drone/Aerial enabled", () => {
    let day = setAerialEnabled(setVideographySelected(setPhotographySelected(createEmptyDay(1), true), true), true);
    day = setPhotographySelected(day, false);
    expect(isVideographySelected(day)).toBe(true);
    expect(isAerialSelectable(day)).toBe(true);
    expect(isAerialEnabled(day)).toBe(true);
  });

  test("deselecting Videography while Photography remains keeps Drone/Aerial enabled", () => {
    let day = setAerialEnabled(setVideographySelected(setPhotographySelected(createEmptyDay(1), true), true), true);
    day = setVideographySelected(day, false);
    expect(isPhotographySelected(day)).toBe(true);
    expect(isAerialSelectable(day)).toBe(true);
    expect(isAerialEnabled(day)).toBe(true);
  });

  test("deselecting the last remaining core service disables Drone/Aerial and clears its config", () => {
    let day = setAerialEnabled(setPhotographySelected(createEmptyDay(1), true), true);
    day = { ...day, aerial: { photographyDrones: 2, videographyDrones: 1 } };
    day = setPhotographySelected(day, false);
    expect(isAerialSelectable(day)).toBe(false);
    expect(isAerialEnabled(day)).toBe(false);
    expect(day.aerial).toEqual({ photographyDrones: 0, videographyDrones: 0 });
  });

  test("turning off the last photography style via applyAerialGate clears Aerial", () => {
    let day = setAerialEnabled(setPhotographySelected(createEmptyDay(1), true), true);
    day = applyAerialGate({
      ...day,
      photography: { traditional: false, traditionalCount: 1, candid: false, candidCount: 1 },
    });
    expect(isAerialEnabled(day)).toBe(false);
    expect(day.aerial).toEqual({ photographyDrones: 0, videographyDrones: 0 });
  });

  test("LED Wall can still be selected independently", () => {
    const day = sanitizeEventDay({
      ...createEmptyDay(1),
      ledWall: { enabled: true, size: "8 x 12", screenCount: 1 },
    });
    expect(day.ledWall.enabled).toBe(true);
    expect(isAerialSelectable(day)).toBe(false);
    expect(isAerialEnabled(day)).toBe(false);
    expect(shouldShowCoreServiceError(day, false)).toBe(true);
  });

  test("Web Live can still be selected independently", () => {
    const day = sanitizeEventDay({
      ...createEmptyDay(1),
      webLive: { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
    });
    expect(day.webLive.enabled).toBe(true);
    expect(isAerialSelectable(day)).toBe(false);
    expect(isAerialEnabled(day)).toBe(false);
  });

  test("an add-on alone cannot satisfy the required Photography/Videography validation", () => {
    const aerialOnly = { ...createEmptyDay(1), aerial: { photographyDrones: 1, videographyDrones: 0 } };
    const ledOnly = { ...createEmptyDay(1), ledWall: { enabled: true, size: "8 x 12", screenCount: 1 } };
    const webOnly = {
      ...createEmptyDay(1),
      webLive: { enabled: true, quality: "HD" as const, cameraCount: 1, streamingPlatform: "", accessType: "private" as const },
    };
    for (const day of [aerialOnly, ledOnly, webOnly]) {
      const issues = validateCoreServiceRule(day);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toBe(CORE_SERVICE_REQUIRED_MESSAGE);
      expect(validateDay(day).some((i) => i.code === "CORE_SERVICE_REQUIRED")).toBe(true);
    }
  });

  test("Continue/Save is blocked when no core service is selected", () => {
    const day = completeDay();
    expect(isPhotographySelected(day)).toBe(false);
    expect(isVideographySelected(day)).toBe(false);
    expect(validateDay(day).some((i) => i.code === "CORE_SERVICE_REQUIRED")).toBe(true);
    expect(isDayComplete(day)).toBe(false);
    expect(shouldShowCoreServiceError(day, true)).toBe(true);
  });

  test("Continue/Save succeeds when Photography is selected", () => {
    const day = setPhotographySelected(completeDay(), true);
    expect(validateDay(day).some((i) => i.code === "CORE_SERVICE_REQUIRED")).toBe(false);
    expect(isDayComplete(day)).toBe(true);
  });

  test("Continue/Save succeeds when Videography is selected", () => {
    const day = setVideographySelected(completeDay(), true);
    expect(validateDay(day).some((i) => i.code === "CORE_SERVICE_REQUIRED")).toBe(false);
    expect(isDayComplete(day)).toBe(true);
  });

  test("Continue/Save succeeds when both core services are selected", () => {
    const day = setVideographySelected(setPhotographySelected(completeDay(), true), true);
    expect(validateDay(day).some((i) => i.code === "CORE_SERVICE_REQUIRED")).toBe(false);
    expect(isDayComplete(day)).toBe(true);
  });

  test("selected services remain correct across persist and step navigation snapshots", () => {
    const editor = setAerialEnabled(setPhotographySelected(completeDay(), true), true);
    const stored = persistLikeBookingApi(completeDay(), editor);
    const services = selectedCoreServiceLabels(stored);
    const addOns = selectedAddOnLabels(stored);
    expect(services).toEqual(["Photography"]);
    expect(addOns).toEqual(["Drone / Aerial"]);
    expect(isAerialEnabled(stored)).toBe(true);
    expect(isPhotographySelected(stored)).toBe(true);
  });

  test("booking payload contains the correct core and add-on service selections", () => {
    let day = setVideographySelected(setPhotographySelected(completeDay(), true), true);
    day = setAerialEnabled(day, true);
    day = {
      ...day,
      ledWall: { enabled: true, size: "8 x 12", screenCount: 2 },
      webLive: { enabled: true, quality: "HD", cameraCount: 1, streamingPlatform: "", accessType: "private" },
    };
    const persisted = persistLikeBookingApi(completeDay(), day);
    const payload = bookingRequirementPayload(persisted);
    expect(payload.photography.traditional).toBe(true);
    expect(payload.videography.traditional).toBe(true);
    expect(payload.aerial.enabled).toBe(true);
    expect(payload.aerial.photographyDrones).toBeGreaterThan(0);
    expect(payload.ledWall.enabled).toBe(true);
    expect(payload.webLive.enabled).toBe(true);

    const req = aggregateRequirement([persisted]);
    expect(req.needsPhotographyTraditional).toBe(true);
    expect(req.needsVideographyTraditional).toBe(true);
    expect(req.needsAerialPhoto).toBe(true);
    expect(req.needsLedWall).toBe(true);
    expect(req.needsWebLive).toBe(true);
  });

  test("Aerial is an add-on and never satisfies the core-service requirement for matching", () => {
    const day = setAerialEnabled(createEmptyDay(1), true);
    const req = aggregateRequirement([sanitizeEventDay(day)]);
    expect(req.needsPhotographyTraditional).toBe(false);
    expect(req.needsPhotographyCandid).toBe(false);
    expect(req.needsVideographyTraditional).toBe(false);
    expect(req.needsVideographyCandid).toBe(false);
    expect(req.needsAerialPhoto).toBe(false);
    expect(req.needsAerialVideo).toBe(false);
  });

  test("duplicate day keeps service selections and still clears the event date", () => {
    const source = setAerialEnabled(setPhotographySelected(completeDay({ eventDate: "2099-03-01" }), true), true);
    const copy = duplicateDay(source, 2);
    expect(copy.eventDate).toBeNull();
    expect(copy.dayId).not.toBe(source.dayId);
    expect(isPhotographySelected(copy)).toBe(true);
    expect(isAerialEnabled(copy)).toBe(true);
  });

  test("overnight sanitization is unchanged when toggling services", () => {
    const day = setPhotographySelected(
      completeDay({ startTime: "20:00", endTime: "02:00", overnight: false }),
      true,
    );
    expect(day.overnight).toBe(true);
    expect(validateDay(day).some((i) => i.code === "END_BEFORE_START")).toBe(false);
  });
});
