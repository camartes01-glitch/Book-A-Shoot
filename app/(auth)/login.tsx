import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";
import { Button, Divider, Field, Muted } from "@/src/components/ui";
import { GoogleSignInButton } from "@/src/components/GoogleSignInButton";
import { useAppStore } from "@/src/state/AppProvider";
import { isDemoAuthMode } from "@/src/config/authMode";
import { getDraftResumeRoute } from "@/src/domain/bookingRequest";
import { CamartesApiError } from "@/src/services/camartesClient";
import { GoogleSignInCancelledError, isGoogleSignInConfigured } from "@/src/services/googleSignIn";
import { signInWithGoogleNative } from "@/src/services/googleNativeSignIn";
import { startWebGoogleSignIn } from "@/src/services/googleWebSignIn";
import { colors, spacing, touchTarget } from "@/src/constants/theme";
import { trackCompleteRegistration } from "@/src/utils/metaPixel";

function resolveAppRoute(target?: string | null): string {
  if (
    !target ||
    target === "/" ||
    target === "/landing" ||
    target === "/(tabs)" ||
    target === "/%28tabs%29" ||
    target === "(tabs)" ||
    target === "/(tabs)/index"
  ) {
    return "/(tabs)";
  }
  return target;
}

function OrangeLoadingAnimation({ message }: { message: string }) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spinAnim = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.18,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnim.start();
    pulseAnim.start();

    return () => {
      spinAnim.stop();
      pulseAnim.stop();
    };
  }, [spinValue, pulseValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingCard}>
        <View style={styles.animWrap}>
          {/* Pulsing outer halo */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseValue }],
              },
            ]}
          />
          {/* Rotating orange circle */}
          <Animated.View
            style={[
              styles.spinningRing,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          />
          {/* Center glowing orange badge */}
          <View style={styles.centerDot}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.loadingMessage}>{message}</Text>
        <Text style={styles.loadingSubMessage}>Please hold on a moment...</Text>
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const { login, signup, ready, profile, activeDraft, loginWithGoogle } = useAppStore();
  const params = useLocalSearchParams<{ returnTo?: string; reauth?: string }>();
  const explicitReturn = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const isReauth = (Array.isArray(params.reauth) ? params.reauth[0] : params.reauth) === "1";
  const returnTarget = explicitReturn || (activeDraft ? getDraftResumeRoute(activeDraft) : "/(tabs)");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth >= 720;
  const signInInFlight = useRef(false);
  const signupInFlight = useRef(false);
  const googleInFlight = useRef(false);

  useEffect(() => {
    if (ready && profile && !isReauth) {
      const hasMobile = Boolean(profile.mobile && profile.mobile.length >= 10);
      if (!hasMobile) {
        router.replace({
          pathname: "/(auth)/complete-profile",
          params: { returnTo: returnTarget },
        });
      } else {
        router.replace(resolveAppRoute(returnTarget) as any);
      }
    }
  }, [ready, profile, returnTarget, isReauth]);

  const onGoogleSignIn = async () => {
    if (googleInFlight.current || googleBusy || loading) return;
    googleInFlight.current = true;
    setGoogleBusy(true);
    setError("");
    let redirecting = false;

    try {
      if (!isGoogleSignInConfigured(Platform.OS)) {
        throw new CamartesApiError("Google sign-in is not available right now. Please sign in with email.", 503);
      }
      if (Platform.OS === "web") {
        // Leaves the page; Google sends the user back to /auth/callback, which finishes sign-in
        startWebGoogleSignIn(returnTarget);
        redirecting = true;
        return;
      }
      const idToken = await signInWithGoogleNative();
      const authedProfile = await loginWithGoogle(idToken);
      const hasMobile = Boolean(authedProfile?.mobile && authedProfile.mobile.length >= 10);
      if (!hasMobile) {
        router.replace({
          pathname: "/(auth)/complete-profile",
          params: { returnTo: returnTarget },
        });
      } else {
        router.replace(resolveAppRoute(returnTarget) as any);
      }
    } catch (e) {
      if (e instanceof GoogleSignInCancelledError) return;
      setError(
        e instanceof CamartesApiError || e instanceof Error
          ? e.message
          : "Could not sign in with Google.",
      );
    } finally {
      googleInFlight.current = false;
      if (!redirecting) setGoogleBusy(false);
    }
  };

  const onSignIn = async () => {
    if (signInInFlight.current || loading) return;
    signInInFlight.current = true;
    setError("");
    setLoading(true);
    try {
      await login(emailOrPhone, password);
      router.replace(resolveAppRoute(returnTarget) as any);
    } catch (e) {
      setError(e instanceof CamartesApiError || e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      signInInFlight.current = false;
      setLoading(false);
    }
  };

  const onCreateAccount = async () => {
    if (signupInFlight.current || loading) return;
    signupInFlight.current = true;
    setError("");
    setLoading(true);
    try {
      await signup({ name, email, phone, password: signupPassword });
      trackCompleteRegistration(email);
      router.replace(resolveAppRoute(returnTarget) as any);
    } catch (e) {
      setError(e instanceof CamartesApiError || e instanceof Error ? e.message : "Could not create the account.");
    } finally {
      signupInFlight.current = false;
      setLoading(false);
    }
  };

  const showNotice = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  if (!ready || profile) {
    return (
      <ScreenContainer>
        <View style={styles.brandRow}>
          <BookAShootLogo maxWidth={320} widthFraction={0.84} />
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboardAvoiding includeBottomSafeArea>
      <View style={[styles.shell, isWide && styles.shellWide]}>
      {params.returnTo ? (
        <Pressable
          onPress={() => router.push(returnTarget as any)}
          style={styles.backLink}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to booking review"
        >
          <ArrowLeft size={18} color={colors.primaryDark} />
          <Text style={styles.backLinkText}>Back to booking review</Text>
        </Pressable>
      ) : null}
      <View style={styles.brandRow}>
        <BookAShootLogo maxWidth={isWide ? 220 : 320} widthFraction={0.84} />
        <Text style={styles.formTitle}>{mode === "signin" ? "Welcome back" : "Create your account"}</Text>
        <Muted style={styles.tagline}>Find photographers and videographers for your event.</Muted>
        {isDemoAuthMode() ? <Muted style={styles.demoBadge}>Demo mode</Muted> : null}
      </View>

      {mode === "signin" ? (
        <View style={{ gap: spacing.md }}>
          <Field
            label="Email or phone"
            placeholder="you@email.com or 98765 43210"
            autoCapitalize="none"
            keyboardType="email-address"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
          />
          <Field
            label="Password"
            placeholder="Your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Forgot Password?"
            hitSlop={8}
            onPress={() => {
              const identifier = emailOrPhone.trim();
              router.push({
                pathname: "/(auth)/forgot-password",
                params: identifier.includes("@") ? { email: identifier } : {},
              });
            }}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotLinkText}>Forgot Password?</Text>
          </Pressable>
          {error ? <Muted style={{ color: colors.danger, fontWeight: "700" }}>{error}</Muted> : null}
          <Button
            label="Sign in"
            onPress={onSignIn}
            loading={loading}
            disabled={loading || !emailOrPhone.trim() || !password}
          />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Field label="Full name" placeholder="Your name" value={name} onChangeText={setName} />
          <Field
            label="Email address"
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Mobile number (For Venue Coordination)"
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone.replace(/\D/g, "").slice(0, 10)}
            onChangeText={(text) => setPhone(text.replace(/\D/g, "").slice(0, 10))}
            hint="Required for your photographer to coordinate on-location arrival and venue access"
          />
          <Field
            label="Password"
            placeholder="At least 8 characters"
            secureTextEntry
            value={signupPassword}
            onChangeText={setSignupPassword}
          />
          {error ? <Muted style={{ color: colors.danger, fontWeight: "700" }}>{error}</Muted> : null}
          <Button
            label="Create account"
            onPress={onCreateAccount}
            loading={loading}
            disabled={
              loading ||
              !name.trim() ||
              !email.includes("@") ||
              phone.replace(/\D/g, "").length !== 10 ||
              signupPassword.length < 8
            }
          />
        </View>
      )}

      <Divider />

      <Button
        label={mode === "signin" ? "New User?  Create an account" : "Already have an account?  Sign in"}
        variant="outline"
        disabled={loading}
        onPress={() => {
          setError("");
          setMode((current) => (current === "signin" ? "signup" : "signin"));
        }}
      />
      <GoogleSignInButton
        label="Continue with Google"
        disabled={loading || googleBusy}
        loading={googleBusy}
        onPress={onGoogleSignIn}
      />

      <Muted style={{ textAlign: "center", marginTop: spacing.md }}>
        By continuing you agree to the Terms of Service and Privacy Policy.
      </Muted>
      </View>

      {/* Orange loading animation overlay shown ONLY when login or Google sign-in is loading */}
      {loading || googleBusy ? (
        <OrangeLoadingAnimation
          message={
            googleBusy
              ? "Connecting with Google..."
              : mode === "signup"
              ? "Creating your account..."
              : "Signing in to Book A Shoot..."
          }
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    alignSelf: "flex-start",
  },
  backLinkText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
  },
  shell: { width: "100%", maxWidth: 420, alignSelf: "center", gap: spacing.md },
  shellWide: {
    marginTop: 48,
    marginBottom: 48,
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  formTitle: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center", marginTop: spacing.xs },
  brandRow: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm },
  tagline: { textAlign: "center", paddingHorizontal: spacing.md },
  demoBadge: { textAlign: "center", fontSize: 12, fontWeight: "700", color: colors.muted },
  forgotLink: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: touchTarget,
    marginTop: -spacing.sm,
  },
  forgotLinkText: { color: colors.primaryDark, fontSize: 14, fontWeight: "700" },

  // ── Orange Loading Animation Styles ─────────────────────────────────────────
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 253, 249, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
    maxWidth: 320,
    width: "88%",
  },
  animWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 16,
  },
  pulseRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 107, 53, 0.16)",
  },
  spinningRing: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3.5,
    borderColor: colors.primary,
    borderTopColor: "transparent",
    borderRightColor: colors.primary,
  },
  centerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  loadingMessage: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  loadingSubMessage: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
});
