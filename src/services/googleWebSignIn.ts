/**
 * Website "Continue with Google" without any third-party auth service.
 *
 * 1. startWebGoogleSignIn() sends the browser to Google, asking for an ID token for our web client,
 *    with a random `state` (CSRF) and `nonce` (replay) remembered in sessionStorage.
 * 2. Google returns to /auth/callback#id_token=...&state=...
 * 3. consumeWebGoogleRedirect() checks the state and hands the ID token + nonce to the backend
 *    (POST /api/auth/google), which verifies Google's signature, the audience and the nonce.
 */
import { CamartesApiError } from "@/src/services/camartesClient";
import { getGoogleWebClientId } from "@/src/services/googleSignIn";

const PENDING_KEY = "bookashoot:google_signin";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export type PendingGoogleSignIn = { state: string; nonce: string; returnTo: string };
export type WebGoogleResult = { idToken: string; nonce: string; returnTo: string };

export function randomToken(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function webCallbackUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/auth/callback`;
}

export function buildGoogleAuthUrl(input: { clientId: string; redirectUri: string; state: string; nonce: string }): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    state: input.state,
    nonce: input.nonce,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

/** Parse what Google put in the callback URL fragment, checked against the pending sign-in. */
export function parseGoogleRedirect(hash: string, pending: PendingGoogleSignIn | null): WebGoogleResult | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const error = params.get("error");
  if (error) {
    if (error === "access_denied") return null; // the user closed / declined the Google screen
    throw new CamartesApiError(params.get("error_description") || "Google sign-in was not completed.", 400);
  }
  const idToken = params.get("id_token");
  if (!idToken) return null;
  if (!pending || params.get("state") !== pending.state) {
    throw new CamartesApiError("Google sign-in expired. Please try again.", 400);
  }
  return { idToken, nonce: pending.nonce, returnTo: pending.returnTo };
}

export function startWebGoogleSignIn(returnTo: string): void {
  const clientId = getGoogleWebClientId();
  if (!clientId) throw new CamartesApiError("Google sign-in is not configured.", 500);
  const pending: PendingGoogleSignIn = { state: randomToken(), nonce: randomToken(), returnTo };
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  window.location.assign(
    buildGoogleAuthUrl({ clientId, redirectUri: webCallbackUri(window.location.origin), state: pending.state, nonce: pending.nonce }),
  );
}

/** Read and clear the Google result on /auth/callback. Returns null when there is nothing to complete. */
export function consumeWebGoogleRedirect(): WebGoogleResult | null {
  if (typeof window === "undefined") return null;
  let pending: PendingGoogleSignIn | null = null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    pending = raw ? (JSON.parse(raw) as PendingGoogleSignIn) : null;
  } catch {
    pending = null;
  }
  const hash = window.location.hash || "";
  // One-shot: the token must never stay in the address bar, history or storage
  window.sessionStorage.removeItem(PENDING_KEY);
  if (hash) window.history.replaceState(window.history.state, "", window.location.pathname);
  return parseGoogleRedirect(hash, pending);
}
