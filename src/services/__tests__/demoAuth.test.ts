import {
  AUTH_MODE,
  DEMO_CREDENTIALS,
  resolveAuthModeFrom,
  setAuthModeForTests,
} from "@/src/config/authMode";
import * as authApi from "@/src/services/authApi";
import { camartesFetch, getAuthToken, setAuthToken } from "@/src/services/camartesClient";
import {
  DEMO_GOOGLE_UNAVAILABLE_MESSAGE,
  DEMO_PASSWORD_RESET_UNAVAILABLE_MESSAGE,
  DEMO_SESSION_TYPE,
  getDemoSession,
} from "@/src/services/demoAuth";
import { googleSignInMissingConfigMessage, isGoogleSignInConfigured } from "@/src/services/googleSignIn";

function jsonResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => body,
    headers: new Headers(),
  } as Response;
}

function forbidCamartes(): typeof fetch {
  return jest.fn(async (input: RequestInfo | URL) => {
    throw new Error(`Camartes must not be called in DEMO mode: ${String(input)}`);
  }) as typeof fetch;
}

describe("AUTH_MODE configuration", () => {
  test("centralized AUTH_MODE is DEMO and production builds cannot enable DEMO", () => {
    expect(AUTH_MODE).toBe("DEMO");
    expect(
      resolveAuthModeFrom({
        configured: "DEMO",
        envMode: "DEMO",
        isDev: false,
      }),
    ).toBe("REAL");
    expect(
      resolveAuthModeFrom({
        configured: "DEMO",
        envMode: "DEMO",
        isDev: true,
      }),
    ).toBe("DEMO");
    expect(
      resolveAuthModeFrom({
        configured: "DEMO",
        envMode: "REAL",
        isDev: true,
      }),
    ).toBe("REAL");
    expect(
      resolveAuthModeFrom({
        configured: "REAL",
        envMode: "",
        isDev: true,
      }),
    ).toBe("REAL");
  });
});

describe("DEMO authentication", () => {
  beforeEach(() => {
    setAuthModeForTests("DEMO");
    globalThis.fetch = forbidCamartes();
  });

  test("correct demo email and password create a local DEMO session without a Camartes JWT", async () => {
    const profile = await authApi.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    expect(profile).toEqual(
      expect.objectContaining({
        name: DEMO_CREDENTIALS.name,
        email: DEMO_CREDENTIALS.email,
        mobile: DEMO_CREDENTIALS.phone,
      }),
    );
    const session = await getDemoSession();
    expect(session?.type).toBe(DEMO_SESSION_TYPE);
    expect(session?.customerId).toBe(profile.customerId);
    expect(await getAuthToken()).toBeNull();
    expect(JSON.stringify(session)).not.toMatch(/eyJ|Bearer|session_token|access_token/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(await authApi.getStoredProfile()).toEqual(expect.objectContaining({ email: DEMO_CREDENTIALS.email }));
  });

  test("demo login accepts the configured phone number", async () => {
    const profile = await authApi.login(DEMO_CREDENTIALS.phone, DEMO_CREDENTIALS.password);
    expect(profile.email).toBe(DEMO_CREDENTIALS.email);
    expect(await getAuthToken()).toBeNull();
  });

  test("incorrect demo password is rejected and does not navigate state", async () => {
    await expect(authApi.login(DEMO_CREDENTIALS.email, "WrongPass#1")).rejects.toMatchObject({
      message: "Invalid email, phone, or password.",
      status: 401,
    });
    expect(await getDemoSession()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
    expect(await getAuthToken()).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("incorrect demo email is rejected", async () => {
    await expect(authApi.login("not-demo@bookashoot.com", DEMO_CREDENTIALS.password)).rejects.toMatchObject({
      message: "Invalid email, phone, or password.",
      status: 401,
    });
    expect(await getDemoSession()).toBeNull();
  });

  test("duplicate login taps share one in-flight demo session", async () => {
    const first = authApi.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    const second = authApi.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    const [a, b] = await Promise.all([first, second]);
    expect(a.customerId).toBe(b.customerId);
    expect(await getDemoSession()).toEqual(expect.objectContaining({ type: DEMO_SESSION_TYPE, customerId: a.customerId }));
  });

  test("demo session is restored after reload without calling GET /api/auth/me", async () => {
    await authApi.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    const restored = await authApi.restoreSession();
    expect(restored).toEqual(expect.objectContaining({ email: DEMO_CREDENTIALS.email, name: DEMO_CREDENTIALS.name }));
    expect(await getAuthToken()).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("demo logout clears the local session and does not call POST /api/auth/logout", async () => {
    await authApi.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    await authApi.logout();
    expect(await getDemoSession()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.restoreSession()).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("demo signup creates a local account, authenticates immediately, and can log in again", async () => {
    const created = await authApi.signup({
      name: "Asha Demo",
      email: "asha.demo@example.com",
      phone: "9123456780",
      password: "LocalPass#12",
    });
    expect(created).toEqual(expect.objectContaining({ name: "Asha Demo", email: "asha.demo@example.com", mobile: "9123456780" }));
    expect((await getDemoSession())?.type).toBe(DEMO_SESSION_TYPE);
    expect(await getAuthToken()).toBeNull();

    await authApi.logout();
    const again = await authApi.login("asha.demo@example.com", "LocalPass#12");
    expect(again.customerId).toBe(created.customerId);
    expect(again.name).toBe("Asha Demo");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("invalid signup fields are rejected without calling POST /api/auth/signup", async () => {
    await expect(authApi.signup({ name: "", email: "bad", phone: "123", password: "short" })).rejects.toMatchObject({
      message: "Enter your name, a valid email, a 10-digit mobile number, and a password of at least 8 characters.",
      status: 400,
    });
    expect(await getDemoSession()).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("DEMO mode never calls POST /api/auth/login, POST /api/auth/signup, or GET /api/auth/me", async () => {
    await authApi.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    await authApi.restoreSession();
    await authApi.signup({
      name: "Ravi Demo",
      email: "ravi.demo@example.com",
      phone: "9876501234",
      password: "Password12",
    });
    const urls = ((globalThis.fetch as jest.Mock).mock.calls as Array<[RequestInfo | URL]>).map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("/api/auth/login"))).toBe(false);
    expect(urls.some((url) => url.includes("/api/auth/signup"))).toBe(false);
    expect(urls.some((url) => url.includes("/api/auth/me"))).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("DEMO session data is never sent to Camartes as Authorization Bearer", async () => {
    await authApi.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    await setAuthToken("leftover-real-jwt");
    await expect(camartesFetch("/api/auth/me", {}, { requireAuth: true })).rejects.toMatchObject({ status: 401 });
    expect(globalThis.fetch).not.toHaveBeenCalled();

    globalThis.fetch = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBeNull();
      return jsonResponse(200, { vendors: [] });
    }) as typeof fetch;
    await camartesFetch("/api/providers/search", { method: "POST", body: "{}" }, { auth: false });
    expect(new Headers((globalThis.fetch as jest.Mock).mock.calls[0][1]?.headers).get("Authorization")).toBeNull();
  });

  test("demo auth mode does not send Authorization header on unauthenticated endpoints", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBeNull();
      return jsonResponse(200, { providers: [] });
    }) as typeof fetch;
    await camartesFetch("/api/providers/service/photographer", { method: "GET" }, { auth: false });
    expect(new Headers((globalThis.fetch as jest.Mock).mock.calls[0][1]?.headers).get("Authorization")).toBeNull();
  });

  test("Google and Forgot Password stay unavailable in DEMO without fake tokens or OTPs", async () => {
    await expect(authApi.loginWithGoogle("google-id-token")).rejects.toMatchObject({
      message: DEMO_GOOGLE_UNAVAILABLE_MESSAGE,
      status: 501,
    });
    await expect(authApi.requestPasswordReset(DEMO_CREDENTIALS.email)).rejects.toMatchObject({
      message: DEMO_PASSWORD_RESET_UNAVAILABLE_MESSAGE,
      status: 501,
    });
    await expect(
      authApi.confirmPasswordReset({ email: DEMO_CREDENTIALS.email, otp: "123456", newPassword: "Newpass#12" }),
    ).rejects.toMatchObject({
      message: DEMO_PASSWORD_RESET_UNAVAILABLE_MESSAGE,
      status: 501,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("duplicate demo signup is rejected locally", async () => {
    await expect(
      authApi.signup({
        name: "Copy",
        email: DEMO_CREDENTIALS.email,
        phone: "9111111111",
        password: "Password12",
      }),
    ).rejects.toMatchObject({
      message: "An account with this email or phone already exists.",
      status: 400,
    });
  });
});

describe("REAL Camartes authentication remains the existing implementation", () => {
  beforeEach(() => {
    setAuthModeForTests("REAL");
  });

  test("switching AUTH_MODE to REAL uses POST /api/auth/login and GET /api/auth/me", async () => {
    const calls: string[] = [];
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(input));
      if (String(input).includes("/api/auth/login")) {
        const body = JSON.parse(String(init?.body));
        expect(body).toEqual({ email_or_phone: "asha@example.com", password: "correct-password" });
        return jsonResponse(200, { session_token: "live-session-token", user: { user_id: "cust-1", name: "Asha", email: "asha@example.com" } });
      }
      if (String(input).includes("/api/auth/me")) {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer live-session-token");
        return jsonResponse(200, { user_id: "cust-1", name: "Asha", email: "asha@example.com", phone_number: "9876543210" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const profile = await authApi.login("asha@example.com", "correct-password");
    expect(profile.email).toBe("asha@example.com");
    expect(await getAuthToken()).toBe("live-session-token");
    expect(calls.some((url) => url.includes("/api/auth/login"))).toBe(true);
    expect(calls.some((url) => url.includes("/api/auth/me"))).toBe(true);
  });

  test("REAL signup still posts to POST /api/auth/signup", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/signup")) {
        return jsonResponse(200, {
          session: { access_token: "signup-access-token" },
          user: { user_id: "cust-new", name: "Ravi", email: "ravi@example.com", phone_number: "9123456780" },
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-new", name: "Ravi", email: "ravi@example.com", phone_number: "9123456780" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    const profile = await authApi.signup({
      name: "Ravi",
      email: "ravi@example.com",
      phone: "9123456780",
      password: "password12",
    });
    expect(profile.customerId).toBe("cust-new");
    expect(await getAuthToken()).toBe("signup-access-token");
  });

  test("Google, Apple, and Forgot Password real implementations remain callable", async () => {
    expect(typeof authApi.loginWithGoogle).toBe("function");
    expect(typeof authApi.requestPasswordReset).toBe("function");
    expect(typeof authApi.confirmPasswordReset).toBe("function");
    expect(typeof authApi.logout).toBe("function");
    expect(googleSignInMissingConfigMessage()).toContain("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
    expect(isGoogleSignInConfigured("web")).toBe(false);

    // Google auth and password reset are now implemented (real backend calls)
    // In test environment they reject with a network/fetch error, not a 501 stub.
    const resetErr = await authApi.requestPasswordReset("asha@example.com").catch((e) => e);
    expect(resetErr).toBeDefined();
    expect(resetErr?.status).not.toBe(501);
    const googleErr = await authApi.loginWithGoogle("google-id-token").catch((e) => e);
    expect(googleErr).toBeDefined();
    expect(googleErr?.status).not.toBe(501);
  });
});
