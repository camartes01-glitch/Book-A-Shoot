/**
 * Supabase Client configuration for BOOK A SHOOT.
 * Uses a server-safe AsyncStorage adapter that safely handles SSR and static pre-rendering (Node.js)
 * as well as client-side web and native environments.
 *
 * IMPORTANT: detectSessionInUrl is only active on the browser client so build-time static rendering
 * does not attempt to access window.location.
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

const isBrowser = typeof window !== "undefined";

// Safe cross-platform storage adapter (prevents "window is not defined" during SSG export)
const serverSafeStorage = {
  getItem: async (key: string) => {
    if (!isBrowser && Platform.OS === "web") {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (!isBrowser && Platform.OS === "web") {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore write errors during build
    }
  },
  removeItem: async (key: string) => {
    if (!isBrowser && Platform.OS === "web") {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: serverSafeStorage,
    autoRefreshToken: isBrowser,
    persistSession: isBrowser,
    detectSessionInUrl: isBrowser && Platform.OS === "web",
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
