/**
 * Supabase Client configuration for BOOK A SHOOT.
 * Uses AsyncStorage for cross-platform session persistence on Android, iOS, and Web.
 *
 * IMPORTANT: detectSessionInUrl=true on web means Supabase automatically processes
 * the ?code= PKCE callback from Google OAuth. Do NOT manually call
 * exchangeCodeForSession() on web — the code is single-use and Supabase already
 * consumed it. Use getSession() after the redirect instead.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

export function getSupabaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://vyjwezlkozajarwexirg.supabase.co"
  ).trim();
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_g6oALf4pkcwK82IRndmzkQ_4-9WbeAj"
  ).trim();
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web: Supabase auto-processes the OAuth callback URL (?code= or #access_token=).
    // On native: We manually parse the deep-link URL in signInWithGoogleViaSupabase().
    detectSessionInUrl: Platform.OS === "web",
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
