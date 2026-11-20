import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { consumeWebGoogleRedirect } from "@/src/services/googleWebSignIn";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, fontWeights, spacing } from "@/src/constants/theme";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";

function appRoute(target?: string | null): string {
  if (!target || target === "/" || target === "/landing" || target === "(tabs)" || target === "/(tabs)/index") return "/(tabs)";
  return target;
}

/**
 * Website return page for "Continue with Google": Google sends the user here with an ID token in the URL
 * fragment; the backend verifies it and returns a Camartes session (see googleWebSignIn.ts).
 * The apps sign in natively and never land here.
 */
export default function AuthCallbackScreen() {
  const { loginWithGoogle } = useAppStore();
  const processedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    let isMounted = true;

    async function finishSignIn() {
      if (Platform.OS !== "web") {
        router.replace("/(tabs)");
        return;
      }
      try {
        const result = consumeWebGoogleRedirect();
        if (!result) {
          router.replace("/(auth)/login");
          return;
        }
        const authedProfile = await loginWithGoogle(result.idToken, result.nonce);
        if (!isMounted) return;
        const hasMobile = Boolean(authedProfile?.mobile && authedProfile.mobile.length >= 10);
        if (!hasMobile) {
          router.replace({ pathname: "/(auth)/complete-profile", params: { returnTo: appRoute(result.returnTo) } });
        } else {
          router.replace(appRoute(result.returnTo) as any);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Could not complete Google sign-in.");
        setTimeout(() => router.replace("/(auth)/login"), 3500);
      }
    }

    void finishSignIn();
    return () => {
      isMounted = false;
    };
  }, [loginWithGoogle]);

  return (
    <View style={styles.container}>
      <BookAShootLogo maxWidth={180} />
      <View style={styles.loadingBox}>
        {error ? (
          <>
            <Text style={styles.title}>Google sign-in didn't complete</Text>
            <Text style={styles.subtitle}>{error}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Signing you in…</Text>
            <Text style={styles.subtitle}>Setting up your Book A Shoot account</Text>
          </>
        )}
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
    textAlign: "center",
  },
});
