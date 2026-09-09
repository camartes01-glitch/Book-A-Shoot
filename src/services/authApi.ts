/**
 * Camartes authentication. Login and signup go to the live Vendor Platform
 * when AUTH_MODE is REAL. DEMO mode uses local accounts and never calls
 * Camartes auth APIs. Tokens are stored on-device and never logged.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomerProfile } from "@/src/types/booking";
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

const PROFILE_KEY = "camartes-customer:profile:v1";
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

async function persistProfile(profile: CustomerProfile): Promise<CustomerProfile> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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
    return persistProfile(profileFromCamartesUser(me, { ...existing, ...fromAuth, ...fallback }));
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

export async function loginWithGoogle(idToken: string): Promise<CustomerProfile> {
  if (isDemoAuthMode()) {
    rejectDemoGoogleSignIn();
  }
  const token = idToken.trim();
  if (!token) {
    throw new CamartesApiError("A valid Google ID token is required.", 400);
  }
  const response = await camartesFetch<{ access_token: string; expires_at: string }>(
    "/api/auth/google",
    {
      method: "POST",
      body: JSON.stringify({ id_token: token }),
    },
    { requireAuth: false },
  );
  if (!response?.access_token) {
    throw new CamartesApiError("Camartes did not return a session token for Google sign-in.", 502);
  }
  await setAuthToken(response.access_token);
  const me = await camartesFetch<unknown>("/api/auth/me", {}, { requireAuth: true });
  return persistProfile(profileFromCamartesUser(me, {}));
}

export async function restoreSession(): Promise<CustomerProfile | null> {
  if (isDemoAuthMode()) {
    return restoreDemoSession();
  }
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
      await clearLocalSession();
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
