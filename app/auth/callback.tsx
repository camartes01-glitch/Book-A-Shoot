import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/src/services/supabaseClient";
import { extractUserInfoFromSupabaseUser } from "@/src/services/supabaseAuth";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, fontWeights, spacing } from "@/src/constants/theme";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { loginWithGoogle } = useAppStore();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Immediately dismiss any open in-app auth browser
    try {
      void WebBrowser.dismissAuthSession();
    } catch {
      // Ignore
    }

    let isMounted = true;

    async function handleAuthCallback() {
      try {
        const code = Array.isArray(params.code) ? params.code[0] : params.code;

        // 1. If an authorization code is present in query parameters, exchange it
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch {
            // Might have already been exchanged by openAuthSessionAsync
          }
        }

        // 2. Fetch the active Supabase session
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (user) {
          const userInfo = extractUserInfoFromSupabaseUser(user);
          const authedProfile = await loginWithGoogle(userInfo);

          if (!isMounted) return;

          const hasMobile = Boolean(authedProfile?.mobile && authedProfile.mobile.length >= 10);
          if (!hasMobile) {
            router.replace("/(auth)/complete-profile");
          } else {
            router.replace("/(tabs)");
          }
          return;
        }

        // Fallback: Check if already signed in or return to login
        if (isMounted) {
          router.replace("/(tabs)");
        }
      } catch (err) {
        console.warn("[AuthCallback] Error completing session:", err);
        if (isMounted) {
          router.replace("/(tabs)");
        }
      }
    }

    void handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [params.code, loginWithGoogle]);

  return (
    <View style={styles.container}>
      <BookAShootLogo maxWidth={180} />
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>Signing you in…</Text>
        <Text style={styles.subtitle}>Setting up your Book A Shoot account</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingBox: {
    marginTop: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: fontWeights.heading,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
});
