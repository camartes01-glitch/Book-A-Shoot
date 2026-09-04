/**
 * Auth (spec section 4). Mobile + OTP is the primary, fully-working flow.
 * Google/Apple sign-in buttons are present in the UI per spec but require
 * OAuth client credentials that must be supplied as Cloud Agent / app
 * secrets before they can call the real providers — see
 * `src/state/AuthContext.tsx` for the explanatory message shown today.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomerProfile } from "@/src/types/booking";
import { makeId } from "@/src/utils/id";

const PROFILE_KEY = "camartes-customer:profile:v1";
const OTP_KEY = "camartes-customer:otp-pending:v1";
const OTP_TTL_MS = 5 * 60 * 1000;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export async function requestOtp(mobile: string): Promise<{ demoOtp: string }> {
  const code = String(1000 + Math.floor(Math.random() * 9000));
  await AsyncStorage.setItem(OTP_KEY, JSON.stringify({ mobile, code, sentAt: Date.now() }));
  // No SMS gateway is wired up yet, so the code is echoed back for the demo
  // (mirrors the in-app handover PIN pattern already used elsewhere in
  // Camartes apps rather than silently failing).
  return { demoOtp: code };
}

export async function verifyOtp(mobile: string, code: string): Promise<CustomerProfile | null> {
  const raw = await AsyncStorage.getItem(OTP_KEY);
  if (!raw) return null;
  const pending = JSON.parse(raw) as { mobile: string; code: string; sentAt: number };
  const expired = Date.now() - pending.sentAt > OTP_TTL_MS;
  if (expired || pending.mobile !== mobile || pending.code !== code.trim()) return null;

  const existing = await getStoredProfile();
  const profile: CustomerProfile =
    existing?.mobile === mobile
      ? existing
      : {
          customerId: makeId("cust"),
          name: "Guest Customer",
          mobile,
          email: "",
          avatarInitials: initialsOf("Guest Customer"),
          savedAddresses: [],
        };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  await AsyncStorage.removeItem(OTP_KEY);
  return profile;
}

export async function loginWithEmail(email: string, name: string): Promise<CustomerProfile> {
  const profile: CustomerProfile = {
    customerId: makeId("cust"),
    name: name || email.split("@")[0],
    mobile: "",
    email,
    avatarInitials: initialsOf(name || email),
    savedAddresses: [],
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function getStoredProfile(): Promise<CustomerProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as CustomerProfile) : null;
}

export async function updateProfile(patch: Partial<CustomerProfile>): Promise<CustomerProfile> {
  const existing = await getStoredProfile();
  if (!existing) throw new Error("No signed-in customer.");
  const next = { ...existing, ...patch };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
}
