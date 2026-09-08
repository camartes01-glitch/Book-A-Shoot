/**
 * Camartes authentication. Login and signup go to the live Vendor Platform.
 * Tokens are stored on-device and never logged.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomerProfile } from "@/src/types/booking";
import { camartesFetch, CamartesApiError, extractAccessToken, getAuthToken, setAuthToken } from "@/src/services/camartesClient";
import { makeId } from "@/src/utils/id";

const PROFILE_KEY = "camartes-customer:profile:v1";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function stringField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function profileFromCamartesUser(payload: unknown, fallback: Partial<CustomerProfile> = {}): CustomerProfile {
  const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const nested =
    row.user && typeof row.user === "object"
      ? (row.user as Record<string, unknown>)
      : row.profile && typeof row.profile === "object"
        ? (row.profile as Record<string, unknown>)
        : row;
  const name = stringField(nested, ["name", "full_name", "display_name"]) || fallback.name || "Camartes customer";
  const email = stringField(nested, ["email"]) || fallback.email || "";
  const mobile = (stringField(nested, ["phone_number", "phone", "mobile", "contact_number"]) || fallback.mobile || "").replace(/\D/g, "").slice(-10);
  const customerId =
    stringField(nested, ["user_id", "id", "auth_user_id", "customer_id"]) || fallback.customerId || makeId("cust");
  return {
    customerId,
    name,
    mobile,
    email,
    avatarInitials: initialsOf(name),
    savedAddresses: fallback.savedAddresses ?? [],
  };
}

async function persistProfile(profile: CustomerProfile): Promise<CustomerProfile> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function getStoredProfile(): Promise<CustomerProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as CustomerProfile) : null;
}

async function profileAfterAuth(payload: unknown, fallback: Partial<CustomerProfile> = {}): Promise<CustomerProfile> {
  const token = extractAccessToken(payload);
  if (token) await setAuthToken(token);
  if (!(await getAuthToken())) {
    throw new CamartesApiError("Camartes did not return a sign-in token.", 401);
  }
  try {
    const me = await camartesFetch<unknown>("/api/auth/me", {}, { requireAuth: true });
    const existing = await getStoredProfile();
    return persistProfile(profileFromCamartesUser(me, { ...existing, ...fallback }));
  } catch {
    return persistProfile(profileFromCamartesUser(payload, fallback));
  }
}

export async function login(emailOrPhone: string, password: string): Promise<CustomerProfile> {
  const identifier = emailOrPhone.trim();
  if (!identifier || !password) {
    throw new CamartesApiError("Enter your email or phone and password.", 400);
  }
  const payload = await camartesFetch<unknown>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email_or_phone: identifier, password }),
    },
    { auth: false },
  );
  return profileAfterAuth(payload, identifier.includes("@") ? { email: identifier } : { mobile: identifier.replace(/\D/g, "").slice(-10) });
}

export async function signup(input: { name: string; email: string; phone: string; password: string }): Promise<CustomerProfile> {
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.replace(/\D/g, "").slice(-10);
  if (!name || !email.includes("@") || phone.length !== 10 || input.password.length < 8) {
    throw new CamartesApiError("Enter your name, a valid email, a 10-digit mobile number, and a password of at least 8 characters.", 400);
  }
  const payload = await camartesFetch<unknown>(
    "/api/auth/signup",
    {
      method: "POST",
      body: JSON.stringify({ name, email, phone_number: phone, password: input.password }),
    },
    { auth: false },
  );
  const token = extractAccessToken(payload);
  if (token) {
    return profileAfterAuth(payload, { name, email, mobile: phone });
  }
  return login(email, input.password);
}

export async function restoreSession(): Promise<CustomerProfile | null> {
  const token = await getAuthToken();
  if (!token) {
    await AsyncStorage.removeItem(PROFILE_KEY);
    return null;
  }
  try {
    const me = await camartesFetch<unknown>("/api/auth/me", {}, { requireAuth: true });
    const existing = await getStoredProfile();
    return persistProfile(profileFromCamartesUser(me, existing ?? {}));
  } catch (error) {
    if (error instanceof CamartesApiError && error.status === 401) {
      await setAuthToken(null);
      await AsyncStorage.removeItem(PROFILE_KEY);
      return null;
    }
    return getStoredProfile();
  }
}

export async function updateProfile(patch: Partial<CustomerProfile>): Promise<CustomerProfile> {
  const existing = await getStoredProfile();
  if (!existing) throw new Error("No signed-in customer.");
  const next = { ...existing, ...patch };
  if (patch.name) next.avatarInitials = initialsOf(patch.name);
  return persistProfile(next);
}

export async function logout(): Promise<void> {
  try {
    await camartesFetch("/api/auth/logout", { method: "POST" }, { requireAuth: false });
  } catch {
    /* still clear the local session */
  }
  await setAuthToken(null);
  await AsyncStorage.removeItem(PROFILE_KEY);
}
