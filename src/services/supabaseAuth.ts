/**
 * Supabase Google OAuth integration for BOOK A SHOOT.
 * Works seamlessly on Android APK (via deep linking) and Web (via browser redirect).
 */
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/src/services/supabaseClient";
import { CamartesApiError } from "@/src/services/camartesClient";
import { GoogleSignInCancelledError, type GoogleUserInfo } from "@/src/services/googleSignIn";

WebBrowser.maybeCompleteAuthSession();

export function getRedirectUri(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.origin) {
      const pathname = window.location.pathname || "";
      if (pathname.includes("login")) {
        return `${window.location.origin}${pathname}`;
      }
      return `${window.location.origin}/(auth)/login`;
    }
    return "http://localhost:43158/(auth)/login";
  }
  return makeRedirectUri({
    scheme: "camartescustomer",
    path: "auth/callback",
  });
}

export function extractUserInfoFromSupabaseUser(user: User): GoogleUserInfo {
  const googleIdentity = user.identities?.find((i) => i.provider === "google");
  const metadata = user.user_metadata ?? {};

  const google_id =
    (googleIdentity?.id as string | undefined) ||
    (metadata.sub as string | undefined) ||
    user.id;

  const email = user.email || (metadata.email as string | undefined) || "";
  const name =
    (metadata.full_name as string | undefined) ||
    (metadata.name as string | undefined) ||
    (email ? email.split("@")[0] : "Google User");

  const rawMobile =
    (metadata.mobile as string | undefined) ||
    (metadata.phone_number as string | undefined) ||
    (metadata.phone as string | undefined) ||
    (user.phone as string | undefined) ||
    "";
  const mobile = rawMobile ? rawMobile.replace(/\D/g, "").slice(-10) : "";

  const picture =
    (metadata.avatar_url as string | undefined) ||
    (metadata.picture as string | undefined) ||
    null;

  return {
    google_id,
    email,
    name,
    mobile: mobile.length >= 10 ? mobile : undefined,
    picture,
    email_verified: Boolean(user.email_confirmed_at || metadata.email_verified),
  };
}

/**
 * Save updated profile details (name, phone) directly into Supabase User metadata.
 * Persists cloud-side so future Google OAuth sign-ins retain the phone number.
 */
export async function updateSupabaseUserProfile(patch: { name?: string; mobile?: string }): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      return;
    }

    const data: Record<string, unknown> = {};
    if (patch.name) {
      data.name = patch.name;
      data.full_name = patch.name;
    }
    if (patch.mobile) {
      data.mobile = patch.mobile;
      data.phone_number = patch.mobile;
      data.phone = patch.mobile;
    }
    if (Object.keys(data).length > 0) {
      const { error } = await supabase.auth.updateUser({ data });
      if (error) {
        console.warn("[Supabase] updateUser warning:", error.message);
      }
    }
  } catch (err) {
    console.warn("[Supabase] updateUser exception:", err);
  }
}

/**
 * Sign in with Google using Supabase Auth.
 *
 * On Native (Android / iOS):
 *   1. Calls signInWithOAuth to get the Google OAuth URL from Supabase.
 *   2. Opens a secure in-app browser (WebBrowser.openAuthSessionAsync).
 *   3. After user completes Google login, the browser deep-links back to
 *      camartescustomer://auth/callback with either:
 *      - A ?code= param (PKCE flow — Supabase v2 default), or
 *      - A #access_token= hash (implicit flow — legacy Supabase config).
 *   4. We parse the URL and exchange/set the session explicitly.
 *   5. If the URL contains no tokens (rare edge case), retry getSession()
 *      a few times to handle async session hydration by the Supabase client.
 *
 * On Web:
 *   Redirects the browser to Google OAuth. Result is handled by
 *   checkWebSupabaseSession() and onAuthStateChange when returning.
 */
export async function signInWithGoogleViaSupabase(): Promise<GoogleUserInfo | null> {
  const redirectUri = getRedirectUri();

  if (Platform.OS === "web" && typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.setItem("camartes:oauth_in_progress", "true");
    } catch {
      // Ignore
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUri,
      // skipBrowserRedirect=true on native so we control when to open the browser
      skipBrowserRedirect: Platform.OS !== "web",
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new CamartesApiError(error.message, 400);
  }

  // On Web: browser redirects to Google immediately; result handled on return
  if (Platform.OS === "web") {
    return null;
  }

  // On Native (Android / iOS)
  if (!data?.url) {
    throw new CamartesApiError("Supabase did not return an OAuth authorization URL.", 502);
  }

  const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (authResult.type === "cancel" || authResult.type === "dismiss" || authResult.type === "locked") {
    throw new GoogleSignInCancelledError();
  }

  if (authResult.type !== "success" || !authResult.url) {
    throw new GoogleSignInCancelledError();
  }

  const callbackUrl = authResult.url;
  const hashIndex = callbackUrl.indexOf("#");
  const queryIndex = callbackUrl.indexOf("?");

  // ── Path 1 (Primary): PKCE flow — ?code= in query string ──────────────────────
  if (queryIndex !== -1) {
    const queryStr = hashIndex !== -1
      ? callbackUrl.slice(queryIndex + 1, hashIndex)
      : callbackUrl.slice(queryIndex + 1);
    const code = new URLSearchParams(queryStr).get("code");
    if (code) {
      const { data: sd, error: se } = await supabase.auth.exchangeCodeForSession(code);
      if (se) throw new CamartesApiError(se.message, 401);
      if (sd.session?.user) return extractUserInfoFromSupabaseUser(sd.session.user);
    }
  }

  // ── Path 2 (Fallback): Implicit flow — #access_token in URL hash ─────────────
  if (hashIndex !== -1) {
    const hashParams = new URLSearchParams(callbackUrl.slice(hashIndex + 1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken) {
      const { data: sd, error: se } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      });
      if (se) throw new CamartesApiError(se.message, 401);
      if (sd.session?.user) return extractUserInfoFromSupabaseUser(sd.session.user);
    }
  }

  // ── Path 3 (Last resort): Retry getSession() ──────────────────────────────────
  for (let i = 0; i < 8; i++) {
    await new Promise<void>((r) => setTimeout(r, 250));
    const { data: sd } = await supabase.auth.getSession();
    if (sd?.session?.user) return extractUserInfoFromSupabaseUser(sd.session.user);
  }

  throw new CamartesApiError(
    "Google sign-in completed but the session could not be established. Please try again.",
    401,
  );
}

/**
 * Destroys any active Supabase Google OAuth session.
 */
export async function signOutSupabase(): Promise<void> {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem("camartes:oauth_in_progress");
    } catch {
      // Ignore
    }
  }
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // Ignore signout failures
  }
}

/**
 * Helper to clean OAuth parameters (?code=, error=, #hash) from the browser URL
 * without removing application routing params like ?returnTo=...
 */
export function cleanUrlOAuthParams(): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    url.searchParams.delete("error_code");
    url.hash = "";
    const cleanSearch = url.searchParams.toString();
    const cleanPath = url.pathname + (cleanSearch ? `?${cleanSearch}` : "");
    window.history.replaceState(window.history.state, "", cleanPath);
  } catch {
    // Non-fatal
  }
}

/**
 * For Web: Resolves the Supabase user session after returning from Google OAuth redirect.
 *
 * Professional handling:
 * 1. Checks for OAuth error params from provider and throws human-readable message.
 * 2. Does NOT destroy window.location prematurely so Supabase SDK can auto-process PKCE.
 * 3. Awaits session establishment with progressive polling (first click guarantee).
 * 4. Attempts explicit code exchange as fallback if auto-detection takes too long.
 * 5. Cleans URL params only after the session has been resolved.
 */
export async function checkWebSupabaseSession(): Promise<GoogleUserInfo | null> {
  if (Platform.OS !== "web") return null;

  try {
    const hash = typeof window !== "undefined" ? window.location?.hash || "" : "";
    const search = typeof window !== "undefined" ? window.location?.search || "" : "";

    const hasHashTokens = hash.includes("access_token=") || hash.includes("id_token=");
    const hasSearchCode = search.includes("code=");
    const hasError = search.includes("error=") || hash.includes("error=");

    let inProgress = false;
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        inProgress = window.sessionStorage.getItem("camartes:oauth_in_progress") === "true";
      } catch {
        inProgress = false;
      }
    }

    if (hasError) {
      try { window.sessionStorage?.removeItem("camartes:oauth_in_progress"); } catch {}
      const urlParams = new URLSearchParams(search || hash.replace(/^#/, "?"));
      const errorMsg = urlParams.get("error_description") || urlParams.get("error") || "Google sign-in was not completed.";
      cleanUrlOAuthParams();
      throw new CamartesApiError(errorMsg, 400);
    }

    if (!inProgress && !hasHashTokens && !hasSearchCode) {
      // Check if session is already present (e.g. persisted across tabs)
      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session?.user) {
        return extractUserInfoFromSupabaseUser(existing.session.user);
      }
      return null;
    }

    // Clear the progress flag
    try { window.sessionStorage?.removeItem("camartes:oauth_in_progress"); } catch {}

    const searchParams = new URLSearchParams(search);
    const code = searchParams.get("code");

    // Phase 1: Poll getSession() to give Supabase's built-in detectSessionInUrl time to complete
    for (let i = 0; i < 15; i++) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        cleanUrlOAuthParams();
        return extractUserInfoFromSupabaseUser(sessionData.session.user);
      }

      // If after 1 second (5 iterations) auto-detect hasn't completed and we have an auth code,
      // trigger manual PKCE code exchange directly as a fallback
      if (i === 5 && code) {
        try {
          const { data: exchanged, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeErr && exchanged.session?.user) {
            cleanUrlOAuthParams();
            return extractUserInfoFromSupabaseUser(exchanged.session.user);
          }
        } catch {
          // May throw if detectSessionInUrl consumed it simultaneously; next loop check will see it
        }
      }

      await new Promise<void>((r) => setTimeout(r, 200));
    }

    // Phase 2: Final fallback check
    const { data: finalData } = await supabase.auth.getSession();
    if (finalData?.session?.user) {
      cleanUrlOAuthParams();
      return extractUserInfoFromSupabaseUser(finalData.session.user);
    }

    cleanUrlOAuthParams();
    return null;
  } catch (err) {
    if (err instanceof CamartesApiError) throw err;
    return null;
  }
}

