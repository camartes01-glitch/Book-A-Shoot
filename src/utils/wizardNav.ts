import { router, type Href } from "expo-router";

/**
 * Navigate BACK to an earlier wizard step without growing the stack.
 *
 * Back buttons used to `router.push()` the previous step, so every
 * Back → Continue cycle stacked another copy of the same screen (e.g. several
 * Budget screens on top of each other, revealed one by one by the Android back
 * button). `dismissTo` pops to the existing screen when it is in the history,
 * or replaces the current screen when it is not — never duplicates.
 */
export function goBackTo(path: string): void {
  try {
    router.dismissTo(path as Href);
  } catch {
    router.replace(path as Href);
  }
}
