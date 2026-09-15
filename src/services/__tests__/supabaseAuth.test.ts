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
    expect(info.google_id).toBe("supa-user-fallback");
    expect(info.email).toBe("priya@example.com");
    expect(info.name).toBe("Priya");
    expect(info.picture).toBeNull();
  });
});
