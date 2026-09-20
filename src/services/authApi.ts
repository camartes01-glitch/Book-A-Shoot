/**
 * Camartes authentication. Login and signup go to the live Vendor Platform
 * when AUTH_MODE is REAL. DEMO mode uses local accounts and never calls
 * Camartes auth APIs. Tokens are stored on-device and never logged.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomerProfile, EventLocation } from "@/src/types/booking";
import { isDemoAuthMode } from "@/src/config/authMode";
import { camartesFetch, CamartesApiError, extractAccessToken, getAuthToken, setAuthToken } from "@/src/services/camartesClient";
import {
  loginDemo,
  logoutDemo,
  rejectDemoGoogleSignIn,
  rejectDemoPasswordReset,
  restoreDemoSession,
  signupDemo,
} from "@/src/services/demoAuth";
import { makeId } from "@/src/utils/id";
import { signOutSupabase, updateSupabaseUserProfile } from "@/src/services/supabaseAuth";

const PROFILE_KEY = "camartes-customer:profile:v1";
const PROFILES_REGISTRY_KEY = "camartes-customer:registry-by-email:v1";
const BOOKINGS_KEY = "camartes-customer:bookings:v1";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let loginInFlight: Promise<CustomerProfile> | null = null;
let signupInFlight: Promise<CustomerProfile> | null = null;
let googleLoginInFlight: Promise<CustomerProfile> | null = null;

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

export async function getProfileFromRegistry(email: string): Promise<CustomerProfile | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  try {
    const raw = await AsyncStorage.getItem(PROFILES_REGISTRY_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, CustomerProfile>;
    return map[cleanEmail] ?? null;
  } catch {
    return null;
  }
}

export async function saveProfileToRegistry(profile: CustomerProfile): Promise<void> {
  const cleanEmail = profile.email.trim().toLowerCase();
  if (!cleanEmail) return;
  try {
    const raw = await AsyncStorage.getItem(PROFILES_REGISTRY_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, CustomerProfile>) : {};
    const prev = map[cleanEmail];
    map[cleanEmail] = {
      customerId: prev?.customerId || profile.customerId,
      name: profile.name || prev?.name || "",
      email: profile.email || prev?.email || cleanEmail,
      mobile: profile.mobile || prev?.mobile || "",
      avatarInitials: profile.avatarInitials || prev?.avatarInitials || initialsOf(profile.name || cleanEmail),
      savedAddresses: mergeAddresses(prev?.savedAddresses ?? [], profile.savedAddresses ?? []),
    };
    await AsyncStorage.setItem(PROFILES_REGISTRY_KEY, JSON.stringify(map));
  } catch {
    // Non-fatal
  }
}

async function persistProfile(profile: CustomerProfile): Promise<CustomerProfile> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  await saveProfileToRegistry(profile);
  try {
    await updateSupabaseUserProfile({ name: profile.name, mobile: profile.mobile });
  } catch {
    // Non-fatal
  }
  return profile;
}

export async function getStoredProfile(): Promise<CustomerProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as CustomerProfile) : null;
}

async function clearLocalSession(): Promise<void> {
  await setAuthToken(null);
  await AsyncStorage.removeItem(PROFILE_KEY);
}

async function migrateBookingsToCustomer(oldCustomerId: string, newCustomerId: string): Promise<void> {
  if (!oldCustomerId || !newCustomerId || oldCustomerId === newCustomerId) return;
  try {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    if (!raw) return;
    const bookings = JSON.parse(raw);
    if (!Array.isArray(bookings)) return;
    let changed = false;
    for (const b of bookings) {
      if (b && b.customerId === oldCustomerId) {
        b.customerId = newCustomerId;
        changed = true;
      }
    }
    if (changed) {
      await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Reconcile an incoming profile against the locally-stored profile or persistent registry by email.
 * If both share the same email address, reuse the existing customerId and saved mobile number so that
 * bookings and data stay unified regardless of sign-in method (Google vs email) and across logouts.
 * When the customerId changes, local bookings are migrated to the canonical ID.
 */
async function reconcileProfileByEmail(incoming: CustomerProfile): Promise<CustomerProfile> {
  if (!incoming.email) return incoming;

  const existing = (await getStoredProfile()) ?? (await getProfileFromRegistry(incoming.email));
  if (!existing || !existing.email) {
    await saveProfileToRegistry(incoming);
    return incoming;
  }

  if (existing.email.toLowerCase() !== incoming.email.toLowerCase()) return incoming;

  // Same email → same user. Merge fields, keeping the richer value.
  const canonicalId = existing.customerId;
  const oldId = incoming.customerId;

  const merged: CustomerProfile = {
    customerId: canonicalId,
    name: incoming.name || existing.name,
    email: incoming.email || existing.email,
    mobile: incoming.mobile || existing.mobile,
    avatarInitials: initialsOf(incoming.name || existing.name),
    savedAddresses: mergeAddresses(existing.savedAddresses, incoming.savedAddresses ?? []),
  };

  // Migrate bookings from the old customerId to the canonical one
  if (oldId && oldId !== canonicalId) {
    try {
      await migrateBookingsToCustomer(oldId, canonicalId);
    } catch {
      // Non-fatal: booking migration failure must not block sign-in
      console.warn("[Auth] Booking migration warning:", oldId, "→", canonicalId);
    }
  }

  await saveProfileToRegistry(merged);
  return merged;
}

function mergeAddresses(a: EventLocation[] = [], b: EventLocation[] = []): EventLocation[] {
  const seen = new Set<string>();
  const merged: EventLocation[] = [];
  for (const loc of [...a, ...b]) {
    if (!loc) continue;
    const key = loc.placeId || loc.formattedAddress || `${loc.latitude},${loc.longitude}`;
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(loc);
    }
  }
  return merged;
}

async function profileAfterAuth(payload: unknown, fallback: Partial<CustomerProfile> = {}): Promise<CustomerProfile> {
  const token = extractAccessToken(payload);
  if (!token) {
    throw new CamartesApiError("Camartes did not return a sign-in token.", 401);
  }
  await setAuthToken(token);
  try {
    const me = await camartesFetch<unknown>("/api/auth/me", {}, { requireAuth: true });
    const existing = await getStoredProfile();
    const fromAuth = profileFromCamartesUser(payload, fallback);
    const profile = profileFromCamartesUser(me, { ...existing, ...fromAuth, ...fallback });
    const reconciled = await reconcileProfileByEmail(profile);
    return persistProfile(reconciled);
  } catch (error) {
    await clearLocalSession();
    throw error;
  }
}

export async function login(emailOrPhone: string, password: string): Promise<CustomerProfile> {
  if (loginInFlight) return loginInFlight;
  const identifier = emailOrPhone.trim();
  if (!identifier || !password) {
    throw new CamartesApiError("Enter your email or phone and password.", 400);
  }
  loginInFlight = (async () => {
    if (isDemoAuthMode()) {
      return loginDemo(identifier, password);
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
  })().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

export async function signup(input: { name: string; email: string; phone: string; password: string }): Promise<CustomerProfile> {
  if (signupInFlight) return signupInFlight;
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.replace(/\D/g, "").slice(-10);
  if (!name || !EMAIL_PATTERN.test(email) || phone.length !== 10 || input.password.length < 8) {
    throw new CamartesApiError("Enter your name, a valid email, a 10-digit mobile number, and a password of at least 8 characters.", 400);
  }
  signupInFlight = (async () => {
    if (isDemoAuthMode()) {
      return signupDemo({ name, email, phone, password: input.password });
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
  })().finally(() => {
    signupInFlight = null;
  });
  return signupInFlight;
}

export async function loginWithGoogle(
  idTokenOrUserInfo: string | { google_id: string; email: string; name: string; mobile?: string; picture?: string | null },
): Promise<CustomerProfile> {
  if (isDemoAuthMode()) {
    rejectDemoGoogleSignIn();
  }

  let payload: unknown = null;
  let fallback: Partial<CustomerProfile> = {};

  if (typeof idTokenOrUserInfo === "string") {
    const token = idTokenOrUserInfo.trim();
    if (!token) {
      throw new CamartesApiError("A valid Google ID token is required.", 400);
    }
    try {
      payload = await camartesFetch<unknown>(
        "/api/auth/google",
        {
          method: "POST",
          body: JSON.stringify({ id_token: token }),
        },
        { auth: false, requireAuth: false },
      );
    } catch {
      try {
        payload = await camartesFetch<unknown>(
          "/api/auth/google-userinfo",
          {
            method: "POST",
            body: JSON.stringify({ id_token: token }),
          },
          { auth: false, requireAuth: false },
        );
      } catch {
        // Camartes Google endpoint unavailable; fall back to local Google user
      }
    }
  } else {
    fallback = {
      name: idTokenOrUserInfo.name,
      email: idTokenOrUserInfo.email,
      mobile: idTokenOrUserInfo.mobile,
    };
    try {
      payload = await camartesFetch<unknown>(
        "/api/auth/google-userinfo",
        {
          method: "POST",
          body: JSON.stringify(idTokenOrUserInfo),
        },
        { auth: false, requireAuth: false },
      );
    } catch {
      // Camartes Google endpoint unavailable; fall back to local Google user
    }
  }

  if (payload) {
    const sessionToken = extractAccessToken(payload);
    if (sessionToken) {
      await setAuthToken(sessionToken);
    }
    const fromPayload = profileFromCamartesUser(payload, fallback);
    try {
      const me = await camartesFetch<unknown>("/api/auth/me", {}, { auth: true, requireAuth: true });
      const profile = profileFromCamartesUser(me, { ...fromPayload, ...fallback });
      const reconciled = await reconcileProfileByEmail(profile);
      return persistProfile(reconciled);
    } catch {
      const reconciled = await reconcileProfileByEmail(fromPayload);
      return persistProfile(reconciled);
    }
  }

  const userInfo =
    typeof idTokenOrUserInfo === "string"
      ? { google_id: makeId("g"), email: "", name: "Customer", mobile: "" }
      : idTokenOrUserInfo;

  const remembered = userInfo.email ? await getProfileFromRegistry(userInfo.email) : null;
  const profile: CustomerProfile = {
    customerId: remembered?.customerId || (userInfo.google_id ? `google-${userInfo.google_id}` : makeId("cust")),
    name: userInfo.name || remembered?.name || userInfo.email.split("@")[0] || "Customer",
    email: userInfo.email || remembered?.email || "",
    mobile: userInfo.mobile || remembered?.mobile || "",
    avatarInitials: initialsOf(userInfo.name || remembered?.name || userInfo.email),
    savedAddresses: remembered?.savedAddresses ?? [],
  };

  const reconciled = await reconcileProfileByEmail(profile);
  return persistProfile(reconciled);
}

export async function restoreSession(): Promise<CustomerProfile | null> {
  if (isDemoAuthMode()) {
    return restoreDemoSession();
  }
  const token = await getAuthToken();
  if (token && !token.startsWith("google-session-")) {
    try {
      const me = await camartesFetch<unknown>("/api/auth/me", {}, { requireAuth: true });
      const existing = await getStoredProfile();
      return persistProfile(profileFromCamartesUser(me, existing ?? {}));
    } catch (error) {
      if (error instanceof CamartesApiError && error.status === 401) {
        await clearLocalSession();
        return null;
      }
    }
  }
  const stored = await getStoredProfile();
  if (stored) {
    return stored;
  }
  return null;
}

export async function updateProfile(patch: Partial<CustomerProfile>): Promise<CustomerProfile> {
  const existing = (await getStoredProfile()) ?? (patch.email ? await getProfileFromRegistry(patch.email) : null);
  if (!existing) throw new Error("No signed-in customer.");
  
  const token = await getAuthToken();
  if (token && !isDemoAuthMode() && !token.startsWith("google-session-")) {
    try {
      await camartesFetch(
        "/api/profile",
        {
          method: "PUT",
          body: JSON.stringify({
            name: patch.name ?? existing.name,
            phone_number: patch.mobile ?? existing.mobile,
            phone: patch.mobile ?? existing.mobile,
            mobile: patch.mobile ?? existing.mobile,
            has_completed_profile: true,
          }),
        },
        { requireAuth: true },
      );
    } catch (e) {
      // Non-fatal: local profile will still be saved
      console.warn("[Profile] Backend sync warning:", e);
    }
  }

  const next = { ...existing, ...patch };
  if (patch.name) next.avatarInitials = initialsOf(patch.name);
  return persistProfile(next);
}

export async function logout(): Promise<void> {
  try {
    await signOutSupabase();
  } catch {
    /* ignore */
  }

  if (isDemoAuthMode()) {
    await logoutDemo();
    return;
  }
  try {
    await camartesFetch("/api/auth/logout", { method: "POST" }, { requireAuth: false });
  } catch {
    /* still clear the local session */
  }
  await clearLocalSession();
}

/** Camartes password reset is email-OTP only (`POST /api/auth/send-password-reset-otp`). */
export function parsePasswordResetEmail(value: string): string {
  const identifier = value.trim();
  if (!identifier) {
    throw new CamartesApiError("Enter the email on your Camartes account.", 400);
  }
  const digits = identifier.replace(/\D/g, "");
  if (!identifier.includes("@") && digits.length >= 10) {
    throw new CamartesApiError("Password reset is sent to the email on your Camartes account. Enter that email address.", 400);
  }
  if (!EMAIL_PATTERN.test(identifier)) {
    throw new CamartesApiError("Enter a valid email address.", 400);
  }
  return identifier;
}

export function parsePasswordResetOtp(value: string): string {
  const otp = value.trim();
  if (!otp) {
    throw new CamartesApiError("Enter the reset code from your email.", 400);
  }
  if (!/^[0-9]{4,8}$/.test(otp)) {
    throw new CamartesApiError("Enter the 4 to 8 digit reset code from your email.", 400);
  }
  return otp;
}

export async function requestPasswordReset(emailOrPhone: string): Promise<{ message: string; sent: boolean }> {
  if (isDemoAuthMode()) {
    rejectDemoPasswordReset();
  }
  const email = parsePasswordResetEmail(emailOrPhone);
  const response = await camartesFetch<{ message?: string; sent?: boolean }>(
    "/api/auth/send-password-reset-otp",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    { requireAuth: false },
  );
  return {
    message: response?.message ?? "If this email is registered, a reset code has been sent.",
    sent: response?.sent ?? true,
  };
}

export async function confirmPasswordReset(input: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<{ message: string }> {
  if (isDemoAuthMode()) {
    rejectDemoPasswordReset();
  }
  const email = parsePasswordResetEmail(input.email);
  const otp = parsePasswordResetOtp(input.otp);
  if (!input.newPassword || input.newPassword.length < 6) {
    throw new CamartesApiError("Password must be at least 6 characters long.", 400);
  }
  const response = await camartesFetch<{ message?: string }>(
    "/api/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        otp,
        new_password: input.newPassword,
      }),
    },
    { requireAuth: false },
  );
  return {
    message: response?.message ?? "Password has been successfully reset.",
  };
}
