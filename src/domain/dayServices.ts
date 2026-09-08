import type { EventDay } from "@/src/types/booking";
import { hasCoreService } from "@/src/engine/validation";

const CLEARED_PHOTOGRAPHY = {
  traditional: false,
  traditionalCount: 1,
  candid: false,
  candidCount: 1,
} as const;

const CLEARED_VIDEOGRAPHY = {
  traditional: false,
  traditionalCount: 1,
  candid: false,
  candidCount: 1,
} as const;

const CLEARED_AERIAL = { photographyDrones: 0, videographyDrones: 0 } as const;

export function isPhotographySelected(day: Pick<EventDay, "photography">): boolean {
  return day.photography.traditional || day.photography.candid;
}

export function isVideographySelected(day: Pick<EventDay, "videography">): boolean {
  return day.videography.traditional || day.videography.candid;
}

/** Aerial is selectable only after Photography or Videography is on. */
export function isAerialSelectable(day: Pick<EventDay, "photography" | "videography">): boolean {
  return hasCoreService(day);
}

export function isAerialEnabled(day: Pick<EventDay, "aerial">): boolean {
  return day.aerial.photographyDrones > 0 || day.aerial.videographyDrones > 0;
}

/** If the last core service is removed, Aerial (and only Aerial config) turns off. */
export function applyAerialGate(day: EventDay): EventDay {
  if (hasCoreService(day) || !isAerialEnabled(day)) return day;
  return { ...day, aerial: { ...CLEARED_AERIAL } };
}

export function setPhotographySelected(day: EventDay, selected: boolean): EventDay {
  if (!selected) {
    return applyAerialGate({ ...day, photography: { ...CLEARED_PHOTOGRAPHY } });
  }
  return {
    ...day,
    photography: {
      ...day.photography,
      traditional: true,
      traditionalCount: Math.max(1, day.photography.traditionalCount),
    },
  };
}

export function setVideographySelected(day: EventDay, selected: boolean): EventDay {
  if (!selected) {
    return applyAerialGate({ ...day, videography: { ...CLEARED_VIDEOGRAPHY } });
  }
  return {
    ...day,
    videography: {
      ...day.videography,
      traditional: true,
      traditionalCount: Math.max(1, day.videography.traditionalCount),
    },
  };
}

export function setAerialEnabled(day: EventDay, enabled: boolean): EventDay {
  if (!enabled) {
    return { ...day, aerial: { ...CLEARED_AERIAL } };
  }
  if (!isAerialSelectable(day)) return day;
  if (isAerialEnabled(day)) return day;
  if (isPhotographySelected(day)) {
    return { ...day, aerial: { photographyDrones: 1, videographyDrones: 0 } };
  }
  return { ...day, aerial: { photographyDrones: 0, videographyDrones: 1 } };
}

export function selectedCoreServiceLabels(day: EventDay): string[] {
  const labels: string[] = [];
  if (isPhotographySelected(day)) labels.push("Photography");
  if (isVideographySelected(day)) labels.push("Videography");
  return labels;
}

export function selectedAddOnLabels(day: EventDay): string[] {
  const labels: string[] = [];
  if (isAerialEnabled(day)) labels.push("Drone / Aerial");
  if (day.ledWall.enabled) labels.push("LED Wall");
  if (day.webLive.enabled) labels.push("Web Live");
  return labels;
}

/** Same mapping the booking summary, confirm screen, and vendor matching read. */
export function bookingRequirementPayload(day: EventDay) {
  return {
    photography: {
      traditional: day.photography.traditional,
      traditionalCount: day.photography.traditional ? day.photography.traditionalCount : 0,
      candid: day.photography.candid,
      candidCount: day.photography.candid ? day.photography.candidCount : 0,
    },
    videography: {
      traditional: day.videography.traditional,
      traditionalCount: day.videography.traditional ? day.videography.traditionalCount : 0,
      candid: day.videography.candid,
      candidCount: day.videography.candid ? day.videography.candidCount : 0,
    },
    aerial: {
      photographyDrones: day.aerial.photographyDrones,
      videographyDrones: day.aerial.videographyDrones,
      enabled: isAerialEnabled(day),
    },
    ledWall: {
      enabled: day.ledWall.enabled === true,
      size: day.ledWall.size,
      screenCount: day.ledWall.enabled ? day.ledWall.screenCount : 0,
    },
    webLive: {
      enabled: day.webLive.enabled === true,
      quality: day.webLive.quality,
      cameraCount: day.webLive.enabled ? day.webLive.cameraCount : 0,
      accessType: day.webLive.accessType,
    },
  };
}
