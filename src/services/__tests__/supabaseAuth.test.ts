import { Platform } from "react-native";
import type { User } from "@supabase/supabase-js";
import {
  extractUserInfoFromSupabaseUser,
  getRedirectUri,
} from "@/src/services/supabaseAuth";

describe("Supabase Google Auth integration", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  test("getRedirectUri returns camartescustomer deep link on native", () => {
    Platform.OS = "android";
    const uri = getRedirectUri();
    expect(uri).toContain("camartescustomer");
  });

  test("extractUserInfoFromSupabaseUser correctly parses user identities and metadata", () => {
    const mockUser: User = {
      id: "supa-user-123",
      app_metadata: {},
      user_metadata: {
        full_name: "Rahul Sharma",
        avatar_url: "https://example.com/avatar.jpg",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email: "rahul@example.com",
      email_confirmed_at: new Date().toISOString(),
      identities: [
        {
          id: "google-uid-789",
          identity_id: "google-ident-789",
          user_id: "supa-user-123",
          identity_data: {},
          provider: "google",
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };

    const info = extractUserInfoFromSupabaseUser(mockUser);
    expect(info.google_id).toBe("google-uid-789");
    expect(info.email).toBe("rahul@example.com");
    expect(info.name).toBe("Rahul Sharma");
    expect(info.picture).toBe("https://example.com/avatar.jpg");
    expect(info.email_verified).toBe(true);
  });

  test("extractUserInfoFromSupabaseUser falls back when identities array is empty", () => {
    const mockUser: User = {
      id: "supa-user-fallback",
      app_metadata: {},
      user_metadata: {
        name: "Priya",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email: "priya@example.com",
    };

    const info = extractUserInfoFromSupabaseUser(mockUser);
    expect(info.name).toBe("Priya");
    expect(info.picture).toBeNull();
  });

  test("extractUserInfoFromSupabaseUser extracts mobile number from metadata", () => {
    const mockUserWithMobile: User = {
      id: "supa-user-mobile",
      app_metadata: {},
      user_metadata: {
        name: "Vijay Kumar",
        mobile: "+91 98765 43210",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email: "vijay@example.com",
    };

    const info = extractUserInfoFromSupabaseUser(mockUserWithMobile);
    expect(info.mobile).toBe("9876543210");
  });

  test("cleanUrlOAuthParams removes code and OAuth error params while preserving app params", () => {
    const originalWindow = (globalThis as any).window;
    const replaceStateMock = jest.fn();
    // Mock browser window location
    (globalThis as any).window = {
      location: {
        href: "http://localhost:43158/login?code=test-code-123&state=state-xyz&returnTo=%2Fbooking%2Fconfirm",
        pathname: "/login",
      },
      history: {
        state: null,
        replaceState: replaceStateMock,
      },
    };

    const { cleanUrlOAuthParams } = require("@/src/services/supabaseAuth");
    cleanUrlOAuthParams();

    expect(replaceStateMock).toHaveBeenCalled();
    const cleanUrl = replaceStateMock.mock.calls[0][2];
    expect(cleanUrl).not.toContain("code=");
    expect(cleanUrl).not.toContain("state=");
    expect(cleanUrl).toContain("returnTo=");

    (globalThis as any).window = originalWindow;
  });
});
