import * as authApi from "@/src/services/authApi";
import { extractAccessToken, getAuthToken } from "@/src/services/camartesClient";
import { extractGoogleIdToken, GoogleSignInCancelledError } from "@/src/services/googleSignIn";

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

describe("Camartes authentication contract", () => {
  test("login posts email_or_phone and does not log the password or token", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(200, { access_token: "secret-token", user: { user_id: "cust-1", name: "Asha", email: "asha@example.com", phone_number: "9876543210" } });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-1", name: "Asha", email: "asha@example.com", phone_number: "9876543210" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    try {
      const profile = await authApi.login("asha@example.com", "super-secret-password");
      expect(profile.email).toBe("asha@example.com");
      const loginCall = calls.find((c) => c.url.includes("/api/auth/login"));
      expect(loginCall?.init?.method).toBe("POST");
      const body = JSON.parse(String(loginCall?.init?.body));
      expect(body.email_or_phone).toBe("asha@example.com");
      expect(body.password).toBe("super-secret-password");
      expect(logs.join("\n")).not.toContain("super-secret-password");
      expect(logs.join("\n")).not.toContain("secret-token");
      expect(await authApi.getStoredProfile()).toEqual(expect.objectContaining({ email: "asha@example.com" }));
    } finally {
      console.log = originalLog;
    }
  });

  test("password reset validates empty, invalid, and phone identifiers without calling the API", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(500, { detail: "should not be called" })) as typeof fetch;
    await expect(authApi.requestPasswordReset("   ")).rejects.toMatchObject({
      message: "Enter the email on your Camartes account.",
      status: 400,
    });
    await expect(authApi.requestPasswordReset("not-an-email")).rejects.toMatchObject({
      message: "Enter a valid email address.",
      status: 400,
    });
    await expect(authApi.requestPasswordReset("9876543210")).rejects.toMatchObject({
      message: "Password reset is sent to the email on your Camartes account. Enter that email address.",
      status: 400,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("requestPasswordReset posts email to send-password-reset-otp and does not log the address as a secret dump", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return jsonResponse(200, { message: "A reset code has been sent to your email if an account exists.", sent: true });
    }) as typeof fetch;
    try {
      const result = await authApi.requestPasswordReset("asha@example.com");
      expect(result.sent).toBe(true);
      expect(result.message).toContain("reset code");
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("https://camartes-backend.onrender.com/api/auth/send-password-reset-otp");
      expect(calls[0].init?.method).toBe("POST");
      expect(JSON.parse(String(calls[0].init?.body))).toEqual({ email: "asha@example.com" });
      expect(logs.join("\n")).not.toContain("access_token");
    } finally {
      console.log = originalLog;
    }
  });

  test("requestPasswordReset surfaces a missing-account backend error", async () => {
    globalThis.fetch = jest.fn(async () =>
      jsonResponse(404, { detail: "Account not found. Please create an account to proceed." }),
    ) as typeof fetch;
    await expect(authApi.requestPasswordReset("missing@example.com")).rejects.toMatchObject({
      message: "Account not found. Please create an account to proceed.",
      status: 404,
    });
  });

  test("confirmPasswordReset posts email, otp, and new_password without logging secrets", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return jsonResponse(200, { message: "Password updated." });
    }) as typeof fetch;
    try {
      await expect(authApi.confirmPasswordReset({ email: "asha@example.com", otp: "", newPassword: "Newpass#12" })).rejects.toMatchObject({
        message: "Enter the reset code from your email.",
        status: 400,
      });
      await expect(
        authApi.confirmPasswordReset({ email: "asha@example.com", otp: "123456", newPassword: "short" }),
      ).rejects.toMatchObject({
        message: "Enter a new password of at least 8 characters.",
        status: 400,
      });
      expect(calls).toHaveLength(0);
      const result = await authApi.confirmPasswordReset({
        email: "asha@example.com",
        otp: "123456",
        newPassword: "Newpass#12",
      });
      expect(result.message).toBe("Password updated.");
      expect(calls[0].url).toBe("https://camartes-backend.onrender.com/api/auth/reset-password");
      expect(JSON.parse(String(calls[0].init?.body))).toEqual({
        email: "asha@example.com",
        otp: "123456",
        new_password: "Newpass#12",
      });
      expect(logs.join("\n")).not.toContain("123456");
      expect(logs.join("\n")).not.toContain("Newpass#12");
    } finally {
      console.log = originalLog;
    }
  });

  test("confirmPasswordReset surfaces an invalid OTP from Camartes", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(400, { detail: "Invalid or expired OTP code." })) as typeof fetch;
    await expect(
      authApi.confirmPasswordReset({ email: "asha@example.com", otp: "000000", newPassword: "Newpass#12" }),
    ).rejects.toMatchObject({
      message: "Invalid or expired OTP code.",
      status: 400,
    });
  });

  test("extractAccessToken reads login session_token and nested signup session.access_token", () => {
    expect(extractAccessToken({ session_token: "login-session" })).toBe("login-session");
    expect(extractAccessToken({ session: { access_token: "signup-access" } })).toBe("signup-access");
    expect(extractAccessToken({ success: true, user_id: "cust-1" })).toBeNull();
  });

  test("login persists session_token and restores the customer from GET /api/auth/me", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(200, {
          success: true,
          user_id: "cust-live",
          email: "asha@example.com",
          name: "Asha",
          session_token: "live-session-token",
          refresh_token: "refresh-token",
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-live", name: "Asha Rao", email: "asha@example.com", phone_number: "9876543210" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const profile = await authApi.login("asha@example.com", "correct-password");
    expect(profile).toEqual(
      expect.objectContaining({ customerId: "cust-live", name: "Asha Rao", email: "asha@example.com", mobile: "9876543210" }),
    );
    expect(await getAuthToken()).toBe("live-session-token");
    const meCall = calls.find((c) => c.url.includes("/api/auth/me"));
    expect(meCall).toBeTruthy();
    expect(new Headers(meCall?.init?.headers).get("Authorization")).toBe("Bearer live-session-token");
  });

  test("login keeps the Camartes name when GET /api/auth/me omits profile fields", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(200, {
          success: true,
          user_id: "user_99a7",
          email: "asha@example.com",
          name: "Asha Rao",
          session_token: "live-session-token",
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "user_99a7", email: "asha@example.com", role: "user" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const profile = await authApi.login("asha@example.com", "correct-password");
    expect(profile).toEqual(expect.objectContaining({ customerId: "user_99a7", name: "Asha Rao", email: "asha@example.com" }));
  });

  test("login with invalid credentials surfaces a 401 and does not persist a session", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(401, {
          detail: 'Invalid email/phone or password ({"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"})',
        });
      }
      return jsonResponse(500, { detail: "should not be called" });
    }) as typeof fetch;

    await expect(authApi.login("asha@example.com", "wrong-password")).rejects.toMatchObject({
      message: "Invalid email, phone, or password.",
      status: 401,
    });
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("login without an access token keeps the missing-token protection", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(200, { success: true, user_id: "cust-1", email: "asha@example.com" });
      }
      return jsonResponse(500, { detail: "should not be called" });
    }) as typeof fetch;

    await expect(authApi.login("asha@example.com", "password12")).rejects.toMatchObject({
      message: "Camartes did not return a sign-in token.",
      status: 401,
    });
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("login does not treat 403 or 500 as successful authentication", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(403, { detail: "Account pending approval." })) as typeof fetch;
    await expect(authApi.login("asha@example.com", "password12")).rejects.toMatchObject({
      message: "Account pending approval.",
      status: 403,
    });

    globalThis.fetch = jest.fn(async () => jsonResponse(500, { detail: "Internal error" })) as typeof fetch;
    await expect(authApi.login("asha@example.com", "password12")).rejects.toMatchObject({
      message: "Internal error",
      status: 500,
    });
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("login maps a network failure without treating it as success", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    await expect(authApi.login("asha@example.com", "password12")).rejects.toMatchObject({
      message: "Couldn't reach Camartes. Check your connection and try again.",
      status: 0,
    });
  });

  test("login does not persist a profile when GET /api/auth/me rejects the token", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(200, { session_token: "bad-session", user_id: "cust-1" });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(401, { detail: "Authentication required" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    await expect(authApi.login("asha@example.com", "password12")).rejects.toMatchObject({
      message: "Authentication required",
      status: 401,
    });
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("duplicate login taps share one in-flight request", async () => {
    let loginCalls = 0;
    let releaseLogin: ((value: Response) => void) | null = null;
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/login")) {
        loginCalls += 1;
        return await new Promise<Response>((resolve) => {
          releaseLogin = resolve;
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-1", name: "Asha", email: "asha@example.com", phone_number: "9876543210" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const first = authApi.login("asha@example.com", "password12");
    await Promise.resolve();
    await Promise.resolve();
    const second = authApi.login("asha@example.com", "password12");
    expect(releaseLogin).toBeTruthy();
    releaseLogin!(
      jsonResponse(200, {
        session_token: "shared-token",
        user: { user_id: "cust-1", name: "Asha", email: "asha@example.com", phone_number: "9876543210" },
      }),
    );
    const [a, b] = await Promise.all([first, second]);
    expect(loginCalls).toBe(1);
    expect(a.email).toBe("asha@example.com");
    expect(b.email).toBe("asha@example.com");
  });

  test("signup persists session.access_token and restores GET /api/auth/me without a follow-up login", async () => {
    const calls: string[] = [];
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/api/auth/signup")) {
        return jsonResponse(200, {
          success: true,
          message: "User registered successfully",
          user_id: "cust-new",
          session: { access_token: "signup-access-token" },
          has_completed_profile: false,
        });
      }
      if (url.includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-new", name: "Ravi Kumar", email: "ravi@example.com", phone_number: "9123456780" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const profile = await authApi.signup({
      name: "Ravi Kumar",
      email: "ravi@example.com",
      phone: "9123456780",
      password: "password12",
    });
    expect(profile).toEqual(
      expect.objectContaining({ customerId: "cust-new", name: "Ravi Kumar", email: "ravi@example.com", mobile: "9123456780" }),
    );
    expect(await getAuthToken()).toBe("signup-access-token");
    expect(calls.some((url) => url.includes("/api/auth/login"))).toBe(false);
    expect(calls.filter((url) => url.includes("/api/auth/me"))).toHaveLength(1);
  });

  test("duplicate signup is rejected with the Camartes validation message", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/signup")) {
        return jsonResponse(400, { detail: "An account with this email or phone already exists." });
      }
      return jsonResponse(500, { detail: "should not be called" });
    }) as typeof fetch;

    await expect(
      authApi.signup({ name: "Asha", email: "asha@example.com", phone: "9876543210", password: "password12" }),
    ).rejects.toMatchObject({
      message: "An account with this email or phone already exists.",
      status: 400,
    });
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("duplicate signup taps share one in-flight request", async () => {
    let signupCalls = 0;
    let releaseSignup: ((value: Response) => void) | null = null;
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/signup")) {
        signupCalls += 1;
        return await new Promise<Response>((resolve) => {
          releaseSignup = resolve;
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-new", name: "Ravi", email: "ravi@example.com", phone_number: "9123456780" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const input = { name: "Ravi", email: "ravi@example.com", phone: "9123456780", password: "password12" };
    const first = authApi.signup(input);
    await Promise.resolve();
    await Promise.resolve();
    const second = authApi.signup(input);
    expect(releaseSignup).toBeTruthy();
    releaseSignup!(
      jsonResponse(200, {
        session: { access_token: "signup-access-token" },
        user_id: "cust-new",
      }),
    );
    await Promise.all([first, second]);
    expect(signupCalls).toBe(1);
  });

  test("restoreSession hydrates the customer from GET /api/auth/me", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(200, { session_token: "stored-session", user: { user_id: "cust-1", name: "Asha", email: "asha@example.com" } });
      }
      if (String(input).includes("/api/auth/me")) {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer stored-session");
        return jsonResponse(200, { user_id: "cust-1", name: "Asha", email: "asha@example.com", phone_number: "9876543210" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    await authApi.login("asha@example.com", "password12");

    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-1", name: "Asha Restored", email: "asha@example.com", phone_number: "9876543210" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const restored = await authApi.restoreSession();
    expect(restored).toEqual(expect.objectContaining({ name: "Asha Restored", email: "asha@example.com", customerId: "cust-1" }));
  });

  test("restoreSession clears an expired or invalid token", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(200, { session_token: "expired-token", user: { user_id: "cust-1", name: "Asha", email: "asha@example.com" } });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-1", name: "Asha", email: "asha@example.com", phone_number: "9876543210" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    await authApi.login("asha@example.com", "password12");

    globalThis.fetch = jest.fn(async () => jsonResponse(401, { detail: "Authentication required" })) as typeof fetch;
    await expect(authApi.restoreSession()).resolves.toBeNull();
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("logout posts to Camartes and clears the local session", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      if (String(input).includes("/api/auth/login")) {
        return jsonResponse(200, { session_token: "logout-token", user: { user_id: "cust-1", name: "Asha", email: "asha@example.com" } });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-1", name: "Asha", email: "asha@example.com", phone_number: "9876543210" });
      }
      if (String(input).includes("/api/auth/logout")) {
        return jsonResponse(200, { message: "Logged out successfully" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    await authApi.login("asha@example.com", "password12");
    await authApi.logout();
    const logoutCall = calls.find((c) => c.url.includes("/api/auth/logout"));
    expect(logoutCall?.init?.method).toBe("POST");
    expect(new Headers(logoutCall?.init?.headers).get("Authorization")).toBe("Bearer logout-token");
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });
});

describe("Camartes Google authentication contract", () => {
  test("extractGoogleIdToken reads id_token and ignores a Google access token", () => {
    expect(extractGoogleIdToken({ type: "success", params: { id_token: "google-id-token" } })).toBe("google-id-token");
    expect(() => extractGoogleIdToken({ type: "success", params: { access_token: "google-access-token" } })).toThrow(
      "Google did not return an ID token.",
    );
  });

  test("extractGoogleIdToken treats cancel and dismiss as a silent cancellation", () => {
    expect(() => extractGoogleIdToken({ type: "cancel" })).toThrow(GoogleSignInCancelledError);
    expect(() => extractGoogleIdToken({ type: "dismiss" })).toThrow(GoogleSignInCancelledError);
    expect(() => extractGoogleIdToken(null)).toThrow(GoogleSignInCancelledError);
  });

  test("loginWithGoogle posts id_token and requires GET /api/auth/me", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      if (String(input).includes("/api/auth/google")) {
        return jsonResponse(200, {
          success: true,
          user_id: "cust-google",
          email: "asha@gmail.com",
          name: "Asha Google",
          session_token: "google-session-token",
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-google", email: "asha@gmail.com", role: "user" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    try {
      const profile = await authApi.loginWithGoogle("google-id-token");
      expect(profile).toEqual(expect.objectContaining({ customerId: "cust-google", email: "asha@gmail.com", name: "Asha Google" }));
      const googleCall = calls.find((c) => c.url.includes("/api/auth/google"));
      expect(googleCall?.init?.method).toBe("POST");
      expect(JSON.parse(String(googleCall?.init?.body))).toEqual({ id_token: "google-id-token" });
      expect(new Headers(calls.find((c) => c.url.includes("/api/auth/me"))?.init?.headers).get("Authorization")).toBe(
        "Bearer google-session-token",
      );
      expect(await getAuthToken()).toBe("google-session-token");
      expect(logs.join("\n")).not.toContain("google-id-token");
      expect(logs.join("\n")).not.toContain("google-session-token");
    } finally {
      console.log = originalLog;
    }
  });

  test("loginWithGoogle does not authenticate when Camartes omits a session token", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/google")) {
        return jsonResponse(200, { success: true, user_id: "cust-google", email: "asha@gmail.com" });
      }
      return jsonResponse(500, { detail: "should not be called" });
    }) as typeof fetch;
    await expect(authApi.loginWithGoogle("google-id-token")).rejects.toMatchObject({
      message: "Camartes did not return a sign-in token.",
      status: 401,
    });
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("loginWithGoogle does not persist a profile when GET /api/auth/me fails", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/google")) {
        return jsonResponse(200, { session_token: "bad-google-session" });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(401, { detail: "Authentication required" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    await expect(authApi.loginWithGoogle("google-id-token")).rejects.toMatchObject({
      message: "Authentication required",
      status: 401,
    });
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("loginWithGoogle surfaces a 401 Invalid Google token", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(401, { detail: "Invalid Google token" })) as typeof fetch;
    await expect(authApi.loginWithGoogle("google-id-token")).rejects.toMatchObject({
      message: "Invalid Google token",
      status: 401,
    });
    expect(await authApi.getStoredProfile()).toBeNull();
  });

  test("loginWithGoogle surfaces a 400 backend error", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(400, { detail: "id_token is malformed." })) as typeof fetch;
    await expect(authApi.loginWithGoogle("google-id-token")).rejects.toMatchObject({
      message: "id_token is malformed.",
      status: 400,
    });
  });

  test("loginWithGoogle reports when the Google route is missing", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(404, { detail: "Not Found" })) as typeof fetch;
    await expect(authApi.loginWithGoogle("google-id-token")).rejects.toMatchObject({
      message: "Not Found",
      status: 404,
    });
  });

  test("loginWithGoogle maps a network failure without creating a session", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    await expect(authApi.loginWithGoogle("google-id-token")).rejects.toMatchObject({
      message: "Couldn't reach Camartes. Check your connection and try again.",
      status: 0,
    });
    expect(await getAuthToken()).toBeNull();
  });

  test("loginWithGoogle does not call Camartes without an ID token", async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(500, { detail: "should not be called" })) as typeof fetch;
    await expect(authApi.loginWithGoogle("   ")).rejects.toMatchObject({
      message: "Google did not return an ID token.",
      status: 401,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("duplicate Google login taps share one in-flight request", async () => {
    let googleCalls = 0;
    let releaseGoogle: ((value: Response) => void) | null = null;
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/google")) {
        googleCalls += 1;
        return await new Promise<Response>((resolve) => {
          releaseGoogle = resolve;
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-google", email: "asha@gmail.com" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    const first = authApi.loginWithGoogle("google-id-token");
    await Promise.resolve();
    await Promise.resolve();
    const second = authApi.loginWithGoogle("google-id-token");
    expect(releaseGoogle).toBeTruthy();
    releaseGoogle!(jsonResponse(200, { session_token: "shared-google-session", email: "asha@gmail.com", name: "Asha" }));
    await Promise.all([first, second]);
    expect(googleCalls).toBe(1);
  });

  test("restoreSession and logout work after a Google session", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/google")) {
        return jsonResponse(200, { session_token: "google-session-token", email: "asha@gmail.com", name: "Asha", user_id: "cust-google" });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, { user_id: "cust-google", email: "asha@gmail.com" });
      }
      if (String(input).includes("/api/auth/logout")) {
        return jsonResponse(200, { message: "Logged out successfully" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;
    await authApi.loginWithGoogle("google-id-token");
    const restored = await authApi.restoreSession();
    expect(restored).toEqual(expect.objectContaining({ customerId: "cust-google", email: "asha@gmail.com" }));
    await authApi.logout();
    expect(await getAuthToken()).toBeNull();
    expect(await authApi.getStoredProfile()).toBeNull();
  });
});
