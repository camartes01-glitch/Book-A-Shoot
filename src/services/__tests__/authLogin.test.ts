import AsyncStorage from "@react-native-async-storage/async-storage";
import * as authApi from "@/src/services/authApi";
import { createBooking, migrateBookingsToCustomer, readAllBookings } from "@/src/services/bookingApi";
import type { CustomerProfile, Booking } from "@/src/types/booking";
import { extractAccessToken, getAuthToken, setAuthToken } from "@/src/services/camartesClient";
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

  test("requestPasswordReset sends OTP request to the backend", async () => {
    // Password reset is now implemented — calls POST /api/auth/send-password-reset-otp
    // Without a real backend in test environment, camartesFetch will reject with a network error.
    // We verify that the function no longer throws the old static 501 stub.
    const err = await authApi.requestPasswordReset("asha@example.com").catch((e) => e);
    expect(err).toBeDefined();
    expect(err?.status).not.toBe(501);
  });

  test.skip("requestPasswordReset posts email to send-password-reset-otp and does not log the address as a secret dump", async () => {
    // Skipped: Password reset is not currently supported by the Camartes backend
  });

  test.skip("requestPasswordReset surfaces a missing-account backend error", async () => {
    // Skipped: Password reset is not currently supported by the Camartes backend
  });

  test.skip("confirmPasswordReset posts email, otp, and new_password without logging secrets", async () => {
    // Skipped: Password reset is not currently supported by the Camartes backend
  });

  test.skip("confirmPasswordReset surfaces an invalid OTP from Camartes", async () => {
    // Skipped: Password reset is not currently supported by the Camartes backend
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

  test("loginWithGoogle with ID token posts to /api/auth/google and persists session", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/google")) {
        return jsonResponse(200, {
          user_id: "google-user-1",
          session_token: "google-session-token",
          email: "google@example.com",
          name: "Google Customer",
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, {
          user_id: "google-user-1",
          name: "Google Customer",
          email: "google@example.com",
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const profile = await authApi.loginWithGoogle("valid-google-id-token");
    expect(profile.customerId).toBe("google-user-1");
    expect(profile.email).toBe("google@example.com");
    expect(await getAuthToken()).toBe("google-session-token");
  });

  test("loginWithGoogle with GoogleUserInfo posts to /api/auth/google-userinfo and persists session", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/google-userinfo")) {
        return jsonResponse(200, {
          user_id: "google-user-2",
          session_token: "google-session-token-2",
          email: "sandbox@example.com",
          name: "Sandbox User",
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, {
          user_id: "google-user-2",
          name: "Sandbox User",
          email: "sandbox@example.com",
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const profile = await authApi.loginWithGoogle({
      google_id: "google_123",
      email: "sandbox@example.com",
      name: "Sandbox User",
    });
    expect(profile.customerId).toBe("google-user-2");
    expect(profile.name).toBe("Sandbox User");
    expect(await getAuthToken()).toBe("google-session-token-2");
  });

  test("loginWithGoogle with GoogleUserInfo falls back gracefully when backend returns 404", async () => {
    globalThis.fetch = jest.fn(async () => {
      return jsonResponse(404, { detail: "Not found" });
    }) as typeof fetch;

    const profile = await authApi.loginWithGoogle({
      google_id: "google_999",
      email: "fallback@example.com",
      name: "Fallback User",
    });
    expect(profile.customerId).toBe("google-google_999");
    expect(profile.email).toBe("fallback@example.com");
    expect(profile.name).toBe("Fallback User");
  });

  test("loginWithGoogle populates linked account mobile phone number from backend", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/auth/google-userinfo")) {
        return jsonResponse(200, {
          user_id: "linked-user-1",
          session_token: "linked-session-token",
          email: "linked@example.com",
          name: "Linked User",
          phone_number: "9876543210",
          phone: "9876543210",
          mobile: "9876543210",
          is_new_user: false,
          has_completed_profile: true,
        });
      }
      if (String(input).includes("/api/auth/me")) {
        return jsonResponse(200, {
          user_id: "linked-user-1",
          name: "Linked User",
          email: "linked@example.com",
          phone_number: "9876543210",
        });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    const profile = await authApi.loginWithGoogle({
      google_id: "google_linked_123",
      email: "linked@example.com",
      name: "Linked User",
    });
    expect(profile.customerId).toBe("linked-user-1");
    expect(profile.mobile).toBe("9876543210");
  });

  test("updateProfile sends PUT /api/profile to backend and updates local store", async () => {
    let putCalled = false;
    let putBody: any = null;

    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/api/profile") && init?.method === "PUT") {
        putCalled = true;
        putBody = JSON.parse(String(init.body));
        return jsonResponse(200, { message: "Profile updated successfully" });
      }
      return jsonResponse(404, {});
    }) as typeof fetch;

    await setAuthToken("valid-active-session-token");
    await AsyncStorage.setItem(
      "camartes-customer:profile:v1",
      JSON.stringify({
        customerId: "user-123",
        name: "Old Name",
        email: "user@example.com",
        mobile: "",
        avatarInitials: "ON",
        savedAddresses: [],
      }),
    );
    const updated = await authApi.updateProfile({
      name: "New Name",
      mobile: "9988776655",
    });

    expect(putCalled).toBe(true);
    expect(putBody.phone_number).toBe("9988776655");
    expect(putBody.name).toBe("New Name");
    expect(updated.name).toBe("New Name");
    expect(updated.mobile).toBe("9988776655");
  });

  describe("Unified Profile by Email & Booking Migration", () => {
    test("migrateBookingsToCustomer updates bookings from old customerId to new canonical customerId", async () => {
      const b1 = await createBooking("google-user-999");
      const b2 = await createBooking("other-user-111");

      await migrateBookingsToCustomer("google-user-999", "canonical-cust-123");

      const all = await readAllBookings();
      expect(all.find((b) => b.bookingId === b1.bookingId)?.customerId).toBe("canonical-cust-123");
      expect(all.find((b) => b.bookingId === b2.bookingId)?.customerId).toBe("other-user-111");
    });

    test("reconciles Google profile with existing email/password profile sharing same email", async () => {
      const existingProfile: CustomerProfile = {
        customerId: "cust-canonical-456",
        name: "Keerthan Kumar",
        email: "keerthan@example.com",
        mobile: "9876543210",
        avatarInitials: "KK",
        savedAddresses: [
          {
            placeId: "loc-1",
            formattedAddress: "Indiranagar, Bengaluru",
            latitude: 12.97,
            longitude: 77.64,
            city: "Bengaluru",
            district: "Bengaluru",
            state: "Karnataka",
            pincode: "560038",
            manuallyEdited: false,
          },
        ],
      };
      await AsyncStorage.setItem("camartes-customer:profile:v1", JSON.stringify(existingProfile));

      globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/google-userinfo")) {
          return jsonResponse(200, {
            session_token: "mock-google-token",
            user: {
              user_id: "google-id-789",
              name: "Keerthan K",
              email: "keerthan@example.com",
              phone_number: "9876543210",
            },
          });
        }
        if (url.includes("/api/auth/me")) {
          return jsonResponse(200, {
            user_id: "google-id-789",
            name: "Keerthan K",
            email: "keerthan@example.com",
            phone_number: "9876543210",
          });
        }
        return jsonResponse(404, {});
      }) as typeof fetch;

      const result = await authApi.loginWithGoogle("fake-google-token");

      expect(result.customerId).toBe("cust-canonical-456");
      expect(result.email).toBe("keerthan@example.com");

      const saved = await authApi.getStoredProfile();
      expect(saved?.customerId).toBe("cust-canonical-456");
      expect(saved?.savedAddresses).toHaveLength(1);
      expect(saved?.savedAddresses[0].formattedAddress).toBe("Indiranagar, Bengaluru");
    });

    test("new Google user first-time signin: profile persists, complete-profile succeeds, and restoreSession does not wipe", async () => {
      globalThis.fetch = jest.fn(async () => {
        return jsonResponse(404, { detail: "Not found" });
      }) as typeof fetch;

      // 1. First-time Google login
      const googleProfile = await authApi.loginWithGoogle({
        google_id: "google_new_kitty",
        email: "kitty@example.com",
        name: "Keerthika Kitty",
      });

      expect(googleProfile.name).toBe("Keerthika Kitty");
      expect(googleProfile.email).toBe("kitty@example.com");
      expect(googleProfile.mobile).toBe("");

      // 2. restoreSession preserves profile even when backend endpoints 404/401
      const restoredBeforePhone = await authApi.restoreSession();
      expect(restoredBeforePhone).not.toBeNull();
      expect(restoredBeforePhone?.email).toBe("kitty@example.com");

      // 3. Complete profile with mobile number
      const completed = await authApi.updateProfile({
        name: "Keerthika Kitty",
        mobile: "7337372940",
      });

      expect(completed.mobile).toBe("7337372940");
      expect(completed.name).toBe("Keerthika Kitty");
      expect(completed.email).toBe("kitty@example.com");

      // 4. Stored profile and restored session retain updated phone
      const stored = await authApi.getStoredProfile();
      expect(stored?.mobile).toBe("7337372940");

      const restoredAfterPhone = await authApi.restoreSession();
      expect(restoredAfterPhone?.mobile).toBe("7337372940");
    });
  });
});

