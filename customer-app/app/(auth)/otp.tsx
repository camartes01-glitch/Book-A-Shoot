import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Button, Field, Muted, ScreenTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { spacing } from "@/src/constants/theme";

export default function OtpScreen() {
  const { mobile, demoOtp } = useLocalSearchParams<{ mobile: string; demoOtp?: string }>();
  const { verifyOtp, requestOtp } = useAppStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    if (code.trim().length !== 4) {
      Alert.alert("Enter the 4-digit code");
      return;
    }
    setLoading(true);
    try {
      const ok = await verifyOtp(mobile, code.trim());
      if (!ok) {
        Alert.alert("Incorrect code", "That code is incorrect or has expired. Try resending.");
        return;
      }
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    await requestOtp(mobile);
    Alert.alert("OTP resent", "A new code has been sent.");
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <ScreenTitle>Verify your number</ScreenTitle>
        <Muted>Enter the 4-digit code sent to +91 {mobile}</Muted>
        {demoOtp ? <Muted style={{ fontWeight: "700" }}>Demo code: {demoOtp} (no SMS gateway connected yet)</Muted> : null}
      </View>
      <Field
        label="OTP code"
        placeholder="1234"
        keyboardType="number-pad"
        maxLength={4}
        value={code}
        onChangeText={setCode}
      />
      <Button label="Verify & Continue" onPress={onVerify} loading={loading} />
      <Button label="Resend code" variant="ghost" onPress={onResend} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginBottom: spacing.md, marginTop: spacing.lg },
});
