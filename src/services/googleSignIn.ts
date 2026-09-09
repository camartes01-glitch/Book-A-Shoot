/**
 * Google Sign-In configuration and ID-token extraction.
 * Camartes is called separately with POST /api/auth/google { id_token }.
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
  error?: { message?: string } | null;
  errorCode?: string | null;
};

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
  return "Continue with Google needs Google OAuth client IDs. Create OAuth 2.0 clients in Google Cloud for Android package com.camartes.customer, iOS bundle com.camartes.customer, and a Web client. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and the iOS/Android client IDs) and configure Camartes to accept ID tokens issued to those clients.";
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
