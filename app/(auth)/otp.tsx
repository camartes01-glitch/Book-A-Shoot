import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Button, Field, Muted, ScreenTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, spacing } from "@/src/constants/theme";

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const { mobile, demoOtp } = useLocalSearchParams<{ mobile: string; demoOtp?: string }>();
  const { verifyOtp, requestOtp } = useAppStore();
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestDemoOtp, setLatestDemoOtp] = useState(demoOtp ?? "");
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const otpReady = code.replace(/\D/g, "").length === OTP_LENGTH;

  const onVerify = async () => {
    if (!otpReady) {
      setOtpError("Enter the 4-digit code.");
      return;
    }
    setLoading(true);
    setOtpError("");
    try {
      const ok = await verifyOtp(mobile, code.replace(/\D/g, ""));
      if (!ok) {
        setOtpError("That code is incorrect or has expired. Try resending.");
        return;
      }
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resendIn > 0) return;
    const result = await requestOtp(mobile);
    setLatestDemoOtp(result.demoOtp);
    setResendIn(RESEND_SECONDS);
    setOtpError("");
    Alert.alert("Demo OTP resent", "A new development code is shown below. No SMS was sent.");
  };

  return (
    <ScreenContainer keyboardAvoiding includeBottomSafeArea>
      <View style={styles.header}>
        <ScreenTitle>Verify your number</ScreenTitle>
        <Muted>Enter the 4-digit code for +91 {mobile}</Muted>
        {latestDemoOtp ? (
          <Muted style={{ fontWeight: "700", color: colors.primaryDark }}>
            Development demo OTP: {latestDemoOtp} — no SMS gateway is connected yet.
          </Muted>
        ) : null}
      </View>
      <Field
        label="OTP code"
        placeholder="1234"
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        value={code.replace(/\D/g, "").slice(0, OTP_LENGTH)}
        onChangeText={(text) => {
          setCode(text.replace(/\D/g, "").slice(0, OTP_LENGTH));
          if (otpError) setOtpError("");
        }}
        error={otpError}
      />
      <Button label="Verify & Continue" onPress={onVerify} loading={loading} disabled={!otpReady} />
      <Button
        label={resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
        variant="ghost"
        onPress={onResend}
        disabled={resendIn > 0}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.md, marginTop: spacing.lg },
});
