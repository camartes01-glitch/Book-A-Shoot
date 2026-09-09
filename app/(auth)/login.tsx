import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";
import { Button, Divider, Field, Muted } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { isDemoAuthMode } from "@/src/config/authMode";
import { CamartesApiError } from "@/src/services/camartesClient";
import { DEMO_GOOGLE_UNAVAILABLE_MESSAGE } from "@/src/services/demoAuth";
import {
  extractGoogleIdToken,
  googleAuthRequestConfig,
  googleSignInMissingConfigMessage,
  GoogleSignInCancelledError,
  isGoogleSignInConfigured,
} from "@/src/services/googleSignIn";
import { colors, spacing, touchTarget } from "@/src/constants/theme";

WebBrowser.maybeCompleteAuthSession();

function ConfiguredGoogleButton({
  disabled,
  onAuthenticated,
  onError,
}: {
  disabled: boolean;
  onAuthenticated: () => void;
  onError: (message: string) => void;
}) {
  const { loginWithGoogle } = useAppStore();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [googleRequest, , promptGoogleAsync] = Google.useIdTokenAuthRequest(googleAuthRequestConfig());

  const onGoogle = async () => {
    if (inFlight.current || disabled || busy) return;
    inFlight.current = true;
    setBusy(true);
    onError("");
    try {
      const result = await promptGoogleAsync();
      const idToken = extractGoogleIdToken(result);
      await loginWithGoogle(idToken);
      onAuthenticated();
    } catch (e) {
      if (e instanceof GoogleSignInCancelledError) return;
      onError(e instanceof CamartesApiError || e instanceof Error ? e.message : "Could not sign in with Google.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Button
      label="Continue with Google"
      variant="ghost"
      onPress={onGoogle}
      loading={busy}
      disabled={disabled || busy || !googleRequest}
    />
  );
}

export default function LoginScreen() {
  const { login, signup, ready, profile } = useAppStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const signInInFlight = useRef(false);
  const signupInFlight = useRef(false);

  useEffect(() => {
    if (ready && profile) {
      router.replace("/(tabs)");
    }
  }, [ready, profile]);

  const onSignIn = async () => {
    if (signInInFlight.current || loading) return;
    signInInFlight.current = true;
    setError("");
    setLoading(true);
    try {
      await login(emailOrPhone, password);
      router.replace("/(tabs)");
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
      router.replace("/(tabs)");
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

  const onUnconfiguredGoogle = () => {
    setError(googleSignInMissingConfigMessage());
  };

  const onDemoGoogle = () => {
    setError(DEMO_GOOGLE_UNAVAILABLE_MESSAGE);
  };

  const onApple = () => {
    showNotice(
      "Apple sign-in",
      "Camartes does not currently expose an Apple sign-in API. Use email or phone and password.",
    );
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
      <View style={styles.brandRow}>
        <BookAShootLogo maxWidth={320} widthFraction={0.84} />
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
            placeholder="Your Camartes password"
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
            label="Mobile number"
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone.replace(/\D/g, "").slice(0, 10)}
            onChangeText={(text) => setPhone(text.replace(/\D/g, "").slice(0, 10))}
            hint="+91 · 10 digits"
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
        label={mode === "signin" ? "Create a Camartes account" : "Already have an account? Sign in"}
        variant="outline"
        disabled={loading}
        onPress={() => {
          setError("");
          setMode((current) => (current === "signin" ? "signup" : "signin"));
        }}
      />
      {isDemoAuthMode() ? (
        <Button label="Continue with Google" variant="ghost" onPress={onDemoGoogle} disabled={loading} />
      ) : isGoogleSignInConfigured(Platform.OS) ? (
        <ConfiguredGoogleButton
          disabled={loading}
          onAuthenticated={() => router.replace("/(tabs)")}
          onError={setError}
        />
      ) : (
        <Button label="Continue with Google" variant="ghost" onPress={onUnconfiguredGoogle} disabled={loading} />
      )}
      <Button label="Continue with Apple" variant="ghost" onPress={onApple} />

      <Muted style={{ textAlign: "center", marginTop: spacing.md }}>
        By continuing you agree to Camartes' Terms of Service and Privacy Policy.
      </Muted>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
});
