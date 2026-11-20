import { buildGoogleAuthUrl, parseGoogleRedirect, randomToken, webCallbackUri } from "@/src/services/googleWebSignIn";

const pending = { state: "s123", nonce: "n456", returnTo: "/booking/summary" };

describe("website Google sign-in (no Supabase)", () => {
  it("asks Google for an ID token for our web client, with state and nonce", () => {
    const url = new URL(
      buildGoogleAuthUrl({ clientId: "web-id.apps.googleusercontent.com", redirectUri: webCallbackUri("https://www.bookashoot.online/"), state: "s", nonce: "n" }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("web-id.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe("https://www.bookashoot.online/auth/callback");
    expect(url.searchParams.get("response_type")).toBe("id_token");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("s");
    expect(url.searchParams.get("nonce")).toBe("n");
  });

  it("returns the ID token and the nonce the backend must check", () => {
    expect(parseGoogleRedirect("#state=s123&id_token=abc.def.ghi", pending)).toEqual({
      idToken: "abc.def.ghi",
      nonce: "n456",
      returnTo: "/booking/summary",
    });
  });

  it("rejects a token whose state does not match (forged or stale redirect)", () => {
    expect(() => parseGoogleRedirect("#state=other&id_token=abc", pending)).toThrow(/expired/);
    expect(() => parseGoogleRedirect("#state=s123&id_token=abc", null)).toThrow(/expired/);
  });

  it("treats a declined Google screen as a quiet cancel, other errors as errors", () => {
    expect(parseGoogleRedirect("#error=access_denied&state=s123", pending)).toBeNull();
    expect(() => parseGoogleRedirect("#error=invalid_request&error_description=Bad%20redirect&state=s123", pending)).toThrow("Bad redirect");
  });

  it("has nothing to complete without a token", () => {
    expect(parseGoogleRedirect("", pending)).toBeNull();
  });

  it("makes unguessable state/nonce values", () => {
    const a = randomToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(randomToken()).not.toBe(a);
  });
});
