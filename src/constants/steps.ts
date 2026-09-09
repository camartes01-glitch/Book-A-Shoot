/**
 * Canonical booking flow steps.
 * Event -> Services -> Budget -> Packages -> Providers -> Review
 */

export const WIZARD_STEPS = [
  { id: "event", label: "Event" },
  { id: "photography", label: "Photography" },
  { id: "videography", label: "Videography" },
  { id: "addons", label: "Add-ons" },
  { id: "budget", label: "Budget" },
  { id: "packages", label: "Packages" },
  { id: "location", label: "Location" },
  { id: "providers", label: "Providers" },
  { id: "review", label: "Review" },
] as const;

export type VisualStepId = (typeof WIZARD_STEPS)[number]["id"];

/** Includes legacy screen ids so existing routes keep compiling. */
export type WizardStepId =
  | VisualStepId
  | "services"
  | "deliverables"
  | "matches"
  | "confirm"
  | "location-preference";

export const VISUAL_INDEX: Record<WizardStepId, number> = {
  event: 0,
  photography: 1,
  videography: 2,
  addons: 3,
  services: 1,
  deliverables: 1,
  budget: 4,
  packages: 5,
  location: 6,
  "location-preference": 6,
  providers: 7,
  matches: 7,
  review: 8,
  confirm: 8,
};
