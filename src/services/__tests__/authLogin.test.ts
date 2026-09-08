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
});
