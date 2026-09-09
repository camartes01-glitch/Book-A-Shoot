/**
 * Authenticated HTTP client for the live Camartes Vendor Platform.
 * Tokens are stored on-device and never logged.
 * DEMO auth sessions are local-only and are never attached as Bearer tokens.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isDemoAuthMode } from "@/src/config/authMode";

export const CAMARTES_API = "https://camartes-backend.onrender.com";
const TOKEN_KEY = "camartes-customer:auth-token:v1";

export class CamartesApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CamartesApiError";
    this.status = status;
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (!token) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

function tokenFrom(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

/** Login returns `session_token`; signup returns `session.access_token`. */
export function extractAccessToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const direct =
    tokenFrom(row.access_token) ??
    tokenFrom(row.accessToken) ??
    tokenFrom(row.session_token) ??
    tokenFrom(row.sessionToken) ??
    tokenFrom(row.token);
  if (direct) return direct;
  const session = row.session;
  if (session && typeof session === "object") {
    const nested = extractAccessToken(session);
    if (nested) return nested;
  }
  const data = row.data;
  if (data && typeof data === "object") return extractAccessToken(data);
  return null;
}

function friendlyDetail(detail: string): string {
  const trimmed = detail.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
  if (jsonMatch) {
    try {
      const inner = JSON.parse(jsonMatch[0]) as { msg?: unknown; error_code?: unknown };
      if (typeof inner.msg === "string" && inner.msg.trim()) {
        const prefix = trimmed.slice(0, jsonMatch.index).replace(/[(:\s]+$/, "").trim();
        if (prefix.toLowerCase().includes("invalid email/phone or password")) {
          return "Invalid email, phone, or password.";
        }
        return prefix ? `${prefix.replace(/[.:]$/, "")}. ${inner.msg}` : inner.msg;
      }
    } catch {
      /* keep original */
    }
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes("invalid email/phone or password") || lower.includes("invalid login credentials")) {
    return "Invalid email, phone, or password.";
  }
  if (lower.includes("invalid phone number or password")) {
    return "Invalid phone number or password.";
  }
  return trimmed;
}

function nestedDetailText(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return friendlyDetail(detail);
  if (Array.isArray(detail) && detail.length > 0) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string" && item.trim()) return item;
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const msg = rec.msg ?? rec.message;
          if (typeof msg === "string" && msg.trim()) return msg;
        }
        return "";
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join("; ") : null;
  }
  if (detail && typeof detail === "object") {
    const rec = detail as Record<string, unknown>;
    const msg = rec.message ?? rec.msg;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return null;
}

function detailMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const rec = body as Record<string, unknown>;
  const nested = nestedDetailText(rec.detail);
  if (nested) return nested;
  if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
  return fallback;
}

export async function camartesFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: { auth?: boolean; requireAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const needsAuth = opts.auth !== false;
  const token = isDemoAuthMode() ? null : needsAuth ? await getAuthToken() : null;
  if (opts.requireAuth && !token) {
    throw new CamartesApiError("Sign in to your Camartes account to continue.", 401);
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${CAMARTES_API}${path}`, { ...init, headers });
  } catch {
    throw new CamartesApiError("Couldn't reach Camartes. Check your connection and try again.", 0);
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const fallback =
      res.status === 401
        ? path.includes("/api/auth/login")
          ? "Invalid email, phone, or password."
          : path.includes("/api/auth/google")
            ? "Google sign-in was rejected by Camartes."
            : "Sign in to your Camartes account to continue."
        : res.status === 403
          ? "Camartes denied this request."
          : res.status === 404 && path.includes("/api/auth/google")
            ? "Camartes Google sign-in is not available."
            : `Camartes request failed (${res.status}).`;
    throw new CamartesApiError(detailMessage(parsed, fallback), res.status);
  }

  return parsed as T;
}
