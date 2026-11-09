/**
 * Meta Pixel conversion events (web only). The base pixel and PageView are
 * loaded in app/+html.tsx; this file only sends conversion events on top.
 */
import { Platform } from "react-native";

type Fbq = (...args: unknown[]) => void;

const REGISTRATION_KEY_PREFIX = "bas:meta:complete-registration:";
const sentThisSession = new Set<string>();

/** Short non-reversible key so no email is stored in plain text. */
function hashKey(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Send CompleteRegistration once per new customer account on this browser.
 * Call only after the signup API has created the account.
 */
export function trackCompleteRegistration(email: string): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq !== "function") return;

  const key = REGISTRATION_KEY_PREFIX + hashKey(email.trim().toLowerCase());
  if (sentThisSession.has(key)) return;
  try {
    if (window.localStorage.getItem(key)) return;
  } catch {
    // Storage blocked: the in-memory guard still prevents repeats this session.
  }

  sentThisSession.add(key);
  try {
    window.localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Non-fatal
  }
  try {
    fbq("track", "CompleteRegistration");
  } catch {
    // Tracking must never break signup.
  }
}
