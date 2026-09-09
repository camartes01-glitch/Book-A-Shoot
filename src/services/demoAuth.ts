/**
 * Local/demo authentication for development only.
 * Sessions are typed DEMO, stored on-device, and never sent to Camartes.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEMO_CREDENTIALS } from "@/src/config/authMode";
import { CamartesApiError, setAuthToken } from "@/src/services/camartesClient";
import type { CustomerProfile } from "@/src/types/booking";
import { makeId } from "@/src/utils/id";

export const DEMO_SESSION_TYPE = "DEMO" as const;
export const DEMO_SESSION_KEY = "camartes-customer:demo-session:v1";
export const DEMO_ACCOUNTS_KEY = "camartes-customer:demo-accounts:v1";
export const DEMO_PROFILE_KEY = "camartes-customer:profile:v1";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DemoSession = {
  type: typeof DEMO_SESSION_TYPE;
  customerId: string;
  email: string;
  establishedAt: string;
};

type DemoAccount = {
  customerId: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
};

export const DEMO_GOOGLE_UNAVAILABLE_MESSAGE =
  "Google sign-in is not used in demo mode. Sign in with a local demo account, or switch authentication to REAL to use Camartes Google login.";

export const DEMO_PASSWORD_RESET_UNAVAILABLE_MESSAGE =
  "Password reset is not available in demo mode. No email is sent. Sign in with a local demo account, or switch authentication to REAL to use Camartes password reset.";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "C";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function seededAccount(): DemoAccount {
  return {
    customerId: "demo-cust-bookashoot",
    name: DEMO_CREDENTIALS.name,
    email: normalizeEmail(DEMO_CREDENTIALS.email),
    mobile: DEMO_CREDENTIALS.phone,
    password: DEMO_CREDENTIALS.password,
  };
}

function profileFromAccount(account: DemoAccount): CustomerProfile {
  return {
    customerId: account.customerId,
    name: account.name,
    mobile: account.mobile,
    email: account.email,
    avatarInitials: initialsOf(account.name),
    savedAddresses: [],
  };
}

function isDemoSession(value: unknown): value is DemoSession {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    row.type === DEMO_SESSION_TYPE &&
    typeof row.customerId === "string" &&
    row.customerId.length > 0 &&
    typeof row.email === "string" &&
    row.email.length > 0
  );
}

async function readStoredAccounts(): Promise<DemoAccount[]> {
  const raw = await AsyncStorage.getItem(DEMO_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is DemoAccount => {
      return (
        !!row &&
        typeof row === "object" &&
        typeof row.customerId === "string" &&
        typeof row.name === "string" &&
        typeof row.email === "string" &&
        typeof row.mobile === "string" &&
        typeof row.password === "string"
      );
    });
  } catch {
    return [];
  }
}

export async function listDemoAccounts(): Promise<DemoAccount[]> {
  const stored = await readStoredAccounts();
  const seed = seededAccount();
  const extras = stored.filter((account) => normalizeEmail(account.email) !== seed.email);
  return [seed, ...extras];
}

async function persistAccounts(accounts: DemoAccount[]): Promise<void> {
  const seed = seededAccount();
  const extras = accounts.filter((account) => normalizeEmail(account.email) !== seed.email);
  await AsyncStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(extras));
}

async function persistDemoSession(account: DemoAccount): Promise<CustomerProfile> {
  const session: DemoSession = {
    type: DEMO_SESSION_TYPE,
    customerId: account.customerId,
    email: account.email,
    establishedAt: new Date().toISOString(),
  };
  await setAuthToken(null);
  await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  const profile = profileFromAccount(account);
  await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function getDemoSession(): Promise<DemoSession | null> {
  const raw = await AsyncStorage.getItem(DEMO_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isDemoSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function findAccount(accounts: DemoAccount[], identifier: string): DemoAccount | undefined {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  return accounts.find((account) => account.email === email || (phone.length === 10 && account.mobile === phone));
}

export async function loginDemo(emailOrPhone: string, password: string): Promise<CustomerProfile> {
  const identifier = emailOrPhone.trim();
  if (!identifier || !password) {
    throw new CamartesApiError("Enter your email or phone and password.", 400);
  }
  const account = findAccount(await listDemoAccounts(), identifier);
  if (!account || account.password !== password) {
    throw new CamartesApiError("Invalid email, phone, or password.", 401);
  }
  return persistDemoSession(account);
}

export async function signupDemo(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<CustomerProfile> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (!name || !EMAIL_PATTERN.test(email) || phone.length !== 10 || input.password.length < 8) {
    throw new CamartesApiError(
      "Enter your name, a valid email, a 10-digit mobile number, and a password of at least 8 characters.",
      400,
    );
  }
  const accounts = await listDemoAccounts();
  if (accounts.some((account) => account.email === email || account.mobile === phone)) {
    throw new CamartesApiError("An account with this email or phone already exists.", 400);
  }
  const account: DemoAccount = {
    customerId: makeId("demo-cust"),
    name,
    email,
    mobile: phone,
    password: input.password,
  };
  await persistAccounts([...accounts, account]);
  return persistDemoSession(account);
}

export async function restoreDemoSession(): Promise<CustomerProfile | null> {
  await setAuthToken(null);
  const session = await getDemoSession();
  if (!session) {
    await AsyncStorage.removeItem(DEMO_PROFILE_KEY);
    return null;
  }
  const account = (await listDemoAccounts()).find((row) => row.customerId === session.customerId);
  if (!account) {
    await AsyncStorage.removeItem(DEMO_SESSION_KEY);
    await AsyncStorage.removeItem(DEMO_PROFILE_KEY);
    return null;
  }
  return persistDemoSession(account);
}

export async function logoutDemo(): Promise<void> {
  await setAuthToken(null);
  await AsyncStorage.removeItem(DEMO_SESSION_KEY);
  await AsyncStorage.removeItem(DEMO_PROFILE_KEY);
}

export function rejectDemoGoogleSignIn(): never {
  throw new CamartesApiError(DEMO_GOOGLE_UNAVAILABLE_MESSAGE, 501);
}

export function rejectDemoPasswordReset(): never {
  throw new CamartesApiError(DEMO_PASSWORD_RESET_UNAVAILABLE_MESSAGE, 501);
}
