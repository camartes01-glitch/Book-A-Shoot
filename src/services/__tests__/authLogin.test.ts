import * as authApi from "@/src/services/authApi";

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
});
