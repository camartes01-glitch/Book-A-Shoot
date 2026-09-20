/**
 * Google Sign-In configuration, token extraction, and user info retrieval.
 * Supports both ID token flow (POST /api/auth/google) and UserInfo flow (POST /api/auth/google-userinfo).
 */
import { CamartesApiError } from "@/src/services/camartesClient";

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super("Google sign-in was cancelled.");
    this.name = "GoogleSignInCancelledError";
  }
}

export type GoogleAuthSessionResult = {
  type: string;
  params?: Record<string, string>;
  authentication?: {
    accessToken?: string;
    idToken?: string;
  } | null;
  error?: { message?: string } | null;
  errorCode?: string | null;
};

export interface GoogleUserInfo {
  google_id: string;
  email: string;
  name: string;
  mobile?: string;
  picture?: string | null;
  email_verified?: boolean;
}

export function getGoogleWebClientId(): string {
  return (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "").trim();
}

export function getGoogleIosClientId(): string {
  return (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "").trim();
}

export function getGoogleAndroidClientId(): string {
  return (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "").trim();
}

export function googleSignInMissingConfigMessage(): string {
  return "Google OAuth client IDs are not configured. To enable real Google Sign-In, create OAuth 2.0 client IDs in Google Cloud Console for Web and Android, and set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file.";
}

export function isGoogleSignInConfigured(platform: string): boolean {
  const web = getGoogleWebClientId();
  const ios = getGoogleIosClientId();
  const android = getGoogleAndroidClientId();
  if (platform === "ios") return Boolean(ios || web);
  if (platform === "android") return Boolean(android || web);
  return Boolean(web);
}

export function googleAuthRequestConfig(): {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
  selectAccount: true;
} {
  return {
    webClientId: getGoogleWebClientId() || undefined,
    iosClientId: getGoogleIosClientId() || undefined,
    androidClientId: getGoogleAndroidClientId() || undefined,
    selectAccount: true,
  };
}

/**
 * Fetch public Google user profile using an OAuth access token.
 * Used as a fallback when Google returns an access_token instead of an id_token.
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const clean = accessToken.trim();
  if (!clean) {
    throw new CamartesApiError("No Google access token provided.", 400);
  }
  const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: { Authorization: `Bearer ${clean}` },
  });
  if (!response.ok) {
    throw new CamartesApiError("Could not retrieve Google profile details.", 401);
  }
  const data = (await response.json()) as {
    id?: string;
    email?: string;
    name?: string;
    picture?: string;
    verified_email?: boolean;
  };
  if (!data.id || !data.email) {
    throw new CamartesApiError("Google profile did not include an email or user ID.", 400);
  }
  return {
    google_id: data.id,
    email: data.email,
    name: data.name || data.email.split("@")[0] || "Google User",
    picture: data.picture ?? null,
    email_verified: data.verified_email ?? true,
  };
}

/**
 * Extract auth token or userinfo credentials from an Expo AuthSession result.
 * Checks id_token first, then falls back to access_token + userinfo.
 */
export async function extractGoogleAuthData(
  result: GoogleAuthSessionResult | null,
): Promise<string | GoogleUserInfo> {
  if (!result || result.type === "cancel" || result.type === "dismiss" || result.type === "opened" || result.type === "locked") {
    throw new GoogleSignInCancelledError();
  }
  if (result.type === "error") {
    const message = result.error?.message || result.errorCode || "Google sign-in failed.";
    throw new CamartesApiError(message, 401);
  }
  if (result.type !== "success") {
    throw new GoogleSignInCancelledError();
  }

  // 1. Direct ID Token
  const idToken = result.params?.id_token?.trim() || result.authentication?.idToken?.trim();
  if (idToken) {
    return idToken;
  }

  // 2. Access Token -> Fetch Userinfo
  const accessToken = result.params?.access_token?.trim() || result.authentication?.accessToken?.trim();
  if (accessToken) {
    return await fetchGoogleUserInfo(accessToken);
  }

  throw new CamartesApiError("Google sign-in completed but did not return authentication tokens.", 401);
}

/** Read a Google ID token from an AuthSession result. Never treats an access token as an ID token. */
export function extractGoogleIdToken(result: GoogleAuthSessionResult | null): string {
  if (!result || result.type === "cancel" || result.type === "dismiss" || result.type === "opened" || result.type === "locked") {
    throw new GoogleSignInCancelledError();
  }
  if (result.type === "error") {
    const message = result.error?.message || result.errorCode || "Google sign-in failed.";
    throw new CamartesApiError(message, 401);
  }
  if (result.type !== "success") {
    throw new GoogleSignInCancelledError();
  }
  const idToken = result.params?.id_token?.trim() ?? "";
  if (!idToken) {
    throw new CamartesApiError("Google did not return an ID token.", 401);
  }
  return idToken;
}
