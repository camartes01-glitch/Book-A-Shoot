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

  const picture =
    (metadata.avatar_url as string | undefined) ||
    (metadata.picture as string | undefined) ||
    null;

  return {
    google_id,
    email,
    name,
    picture,
    email_verified: Boolean(user.email_confirmed_at || metadata.email_verified),
  };
}

/**
 * Sign in with Google using Supabase Auth.
 * On Native (Android / iOS):
 * 1. Opens secure in-app browser with Supabase Google OAuth URL.
 * 2. Deep links back to camartescustomer://auth/callback.
 * 3. Extracts session tokens, sets Supabase session, and returns GoogleUserInfo.
 *
 * On Web:
 * Redirects the page to Google / Supabase OAuth.
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

  // On Web, browser redirects immediately to Google
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

  // 1. Try extracting #access_token and #refresh_token from hash
  const hashIndex = callbackUrl.indexOf("#");
  if (hashIndex !== -1) {
    const hashParams = new URLSearchParams(callbackUrl.slice(hashIndex + 1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken) {
      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      });

      if (sessionErr) {
        throw new CamartesApiError(sessionErr.message, 401);
      }

      if (sessionData.session?.user) {
        return extractUserInfoFromSupabaseUser(sessionData.session.user);
      }
    }
  }

  // 2. Try PKCE auth code exchange from query parameters
  const queryIndex = callbackUrl.indexOf("?");
  if (queryIndex !== -1) {
    const queryParams = new URLSearchParams(
      hashIndex !== -1 ? callbackUrl.slice(queryIndex + 1, hashIndex) : callbackUrl.slice(queryIndex + 1),
    );
    const code = queryParams.get("code");
    if (code) {
      const { data: sessionData, error: sessionErr } = await supabase.auth.exchangeCodeForSession(code);
      if (sessionErr) {
        throw new CamartesApiError(sessionErr.message, 401);
      }
      if (sessionData.session?.user) {
        return extractUserInfoFromSupabaseUser(sessionData.session.user);
      }
    }
  }

  // 3. Fallback: check current session on Supabase client
  const { data: currentSession } = await supabase.auth.getSession();
  if (currentSession.session?.user) {
    return extractUserInfoFromSupabaseUser(currentSession.session.user);
  }

  throw new CamartesApiError("Could not retrieve user credentials from Google sign-in.", 401);
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
 * For Web: Checks if the page was opened with explicit Supabase Google OAuth callback parameters in the URL
 * or after an active Google OAuth sign-in flow.
 */
export async function checkWebSupabaseSession(): Promise<GoogleUserInfo | null> {
  if (Platform.OS !== "web") return null;

  try {
    const hash = typeof window !== "undefined" ? window.location?.hash || "" : "";
    const search = typeof window !== "undefined" ? window.location?.search || "" : "";

    let inProgress = false;
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        inProgress = window.sessionStorage.getItem("camartes:oauth_in_progress") === "true";
      } catch {
        inProgress = false;
      }
    }

    const hasOAuthParams =
      hash.includes("access_token=") ||
      hash.includes("id_token=") ||
      search.includes("code=") ||
      search.includes("access_token=");

    if (!inProgress && !hasOAuthParams) {
      return null;
    }

    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem("camartes:oauth_in_progress");
      } catch {
        // Ignore
      }
    }

    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error || !sessionData?.session?.user) return null;

    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    return extractUserInfoFromSupabaseUser(sessionData.session.user);
  } catch {
    return null;
  }
}
