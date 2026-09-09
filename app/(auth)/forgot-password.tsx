import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";
import { Button, Field, Muted, ScreenTitle } from "@/src/components/ui";
import { isDemoAuthMode } from "@/src/config/authMode";
import { confirmPasswordReset, requestPasswordReset } from "@/src/services/authApi";
import { DEMO_PASSWORD_RESET_UNAVAILABLE_MESSAGE } from "@/src/services/demoAuth";
import { CamartesApiError } from "@/src/services/camartesClient";
import { normalizeRouteParam } from "@/src/utils/routeParam";
import { colors, spacing, touchTarget } from "@/src/constants/theme";

type Step = "request" | "verify" | "success";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof CamartesApiError || error instanceof Error) return error.message;
  return fallback;
}

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const initialEmail = normalizeRouteParam(params.email);
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const heading = useMemo(() => {
    if (step === "success") return "Password updated";
    if (step === "verify") return "Enter reset code";
    return "Forgot Password";
  }, [step]);

  const goToSignIn = () => {
    router.replace("/(auth)/login");
  };

  const onSendCode = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      setEmail(email.trim());
      setInfo(result.message);
      setStep("verify");
    } catch (e) {
      setError(errorMessage(e, "Could not send a reset code."));
    } finally {
      setLoading(false);
    }
  };

  const onConfirmReset = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await confirmPasswordReset({ email, otp, newPassword });
      setInfo(result.message);
      setOtp("");
      setNewPassword("");
      setStep("success");
    } catch (e) {
      setError(errorMessage(e, "Could not update the password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer keyboardAvoiding includeBottomSafeArea>
      <View style={styles.brandRow}>
        <BookAShootLogo maxWidth={320} widthFraction={0.84} />
      </View>
      <ScreenTitle>{heading}</ScreenTitle>
      {step === "request" ? (
        <Muted>
          {isDemoAuthMode()
            ? DEMO_PASSWORD_RESET_UNAVAILABLE_MESSAGE
            : "Enter the email on your Camartes account. If it matches an account, Camartes will send a reset code."}
        </Muted>
      ) : null}
      {step === "verify" ? (
        <Muted>
          Enter the code sent to your email, then choose a new password. The code expires if it is not used promptly.
        </Muted>
      ) : null}
      {step === "success" ? <Muted>{info || "Your password has been updated. You can sign in with the new password."}</Muted> : null}

      {step === "request" ? (
        <View style={{ gap: spacing.md }}>
          <Field
            label="Email address"
            placeholder="you@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
          {error ? <Muted style={styles.error}>{error}</Muted> : null}
          <Button label="Send reset code" onPress={onSendCode} loading={loading} disabled={!email.trim()} />
        </View>
      ) : null}

      {step === "verify" ? (
        <View style={{ gap: spacing.md }}>
          {info ? <Muted>{info}</Muted> : null}
          <Field label="Email address" value={email} editable={false} />
          <Field
            label="Reset code"
            placeholder="6-digit code"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            value={otp}
            onChangeText={setOtp}
            editable={!loading}
          />
          <Field
            label="New password"
            placeholder="At least 8 characters"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!loading}
          />
          {error ? <Muted style={styles.error}>{error}</Muted> : null}
          <Button
            label="Reset password"
            onPress={onConfirmReset}
            loading={loading}
            disabled={!otp.trim() || newPassword.length < 8}
          />
          <Button label="Send code again" variant="ghost" onPress={onSendCode} disabled={loading} />
        </View>
      ) : null}

      {step === "success" ? (
        <View style={{ gap: spacing.md }}>
          <Muted style={styles.success}>You can now sign in with your new password.</Muted>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Back to Sign In"
        hitSlop={8}
        onPress={goToSignIn}
        style={styles.backLink}
      >
        <Text style={styles.backLinkText}>Back to Sign In</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandRow: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm, marginTop: spacing.sm },
  error: { color: colors.danger, fontWeight: "700" },
  success: { color: colors.success, fontWeight: "700" },
  backLink: {
    alignSelf: "center",
    justifyContent: "center",
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  backLinkText: { color: colors.primaryDark, fontSize: 14, fontWeight: "700", textAlign: "center" },
});
