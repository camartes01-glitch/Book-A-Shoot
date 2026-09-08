import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";
import { Button, Divider, Field, Muted } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { CamartesApiError } from "@/src/services/camartesClient";
import { colors, spacing } from "@/src/constants/theme";

export default function LoginScreen() {
  const { login, signup } = useAppStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await login(emailOrPhone, password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof CamartesApiError || e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  const onCreateAccount = async () => {
    setError("");
    setLoading(true);
    try {
      await signup({ name, email, phone, password: signupPassword });
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof CamartesApiError || e instanceof Error ? e.message : "Could not create the account.");
    } finally {
      setLoading(false);
    }
  };

  const oauthComingSoon = (provider: string) => {
    Alert.alert(
      `${provider} sign-in`,
      `${provider} sign-in needs OAuth credentials configured for Camartes. Use email or phone and password for now.`,
    );
  };

  return (
    <ScreenContainer keyboardAvoiding includeBottomSafeArea>
      <View style={styles.brandRow}>
        <BookAShootLogo maxWidth={320} widthFraction={0.84} />
        <Muted style={styles.tagline}>Find photographers and videographers for your event.</Muted>
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
          {error ? <Muted style={{ color: colors.danger, fontWeight: "700" }}>{error}</Muted> : null}
          <Button label="Sign in" onPress={onSignIn} loading={loading} disabled={!emailOrPhone.trim() || !password} />
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
            disabled={!name.trim() || !email.includes("@") || phone.replace(/\D/g, "").length !== 10 || signupPassword.length < 8}
          />
        </View>
      )}

      <Divider />

      <Button
        label={mode === "signin" ? "Create a Camartes account" : "Already have an account? Sign in"}
        variant="outline"
        onPress={() => {
          setError("");
          setMode((current) => (current === "signin" ? "signup" : "signin"));
        }}
      />
      <Button label="Continue with Google" variant="ghost" onPress={() => oauthComingSoon("Google")} />
      <Button label="Continue with Apple" variant="ghost" onPress={() => oauthComingSoon("Apple")} />

      <Muted style={{ textAlign: "center", marginTop: spacing.md }}>
        By continuing you agree to Camartes' Terms of Service and Privacy Policy.
      </Muted>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandRow: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm },
  tagline: { textAlign: "center", paddingHorizontal: spacing.md },
});
