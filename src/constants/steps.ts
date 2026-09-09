/**
 * Canonical booking flow steps.
 * Event -> Services -> Budget -> Packages -> Providers -> Review
 */

export const WIZARD_STEPS = [
  { id: "event", label: "Event" },
  { id: "services", label: "Services" },
  { id: "budget", label: "Budget" },
  { id: "packages", label: "Packages" },
  { id: "providers", label: "Providers" },
  { id: "review", label: "Review" },
] as const;

export type VisualStepId = (typeof WIZARD_STEPS)[number]["id"];

/** Includes legacy screen ids so existing routes keep compiling. */
export type WizardStepId = VisualStepId | "deliverables" | "matches" | "confirm";

export const VISUAL_INDEX: Record<WizardStepId, number> = {
  event: 0,
  services: 1,
  deliverables: 1,
  budget: 2,
  packages: 3,
  providers: 4,
  matches: 4,
  review: 5,
  confirm: 5,
};
