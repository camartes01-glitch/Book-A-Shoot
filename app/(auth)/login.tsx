import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";
import { Button, Divider, Field, Muted } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, spacing } from "@/src/constants/theme";

export default function LoginScreen() {
  const { requestOtp, loginWithEmail } = useAppStore();
  const [mobile, setMobile] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const digits = mobile.replace(/\D/g, "");
  const phoneValid = digits.length === 10;

  const onSendOtp = async () => {
    if (!phoneValid) {
      setPhoneError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setPhoneError("");
    setLoading(true);
    try {
      const { demoOtp } = await requestOtp(digits);
      router.push({ pathname: "/(auth)/otp", params: { mobile: digits, demoOtp } });
    } finally {
      setLoading(false);
    }
  };

  const onEmailContinue = async () => {
    if (!email.includes("@")) {
      Alert.alert("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), name.trim());
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const oauthComingSoon = (provider: string) => {
    Alert.alert(
      `${provider} sign-in`,
      `${provider} sign-in needs OAuth credentials configured for Camartes. Add them as an app secret to enable this, or continue with mobile OTP or email for now.`,
    );
  };

  return (
    <ScreenContainer keyboardAvoiding includeBottomSafeArea>
      <View style={styles.brandRow}>
        <BookAShootLogo maxWidth={320} widthFraction={0.84} />
        <Muted style={styles.tagline}>Find photographers and videographers for your event.</Muted>
      </View>

      {!emailMode ? (
        <View style={{ gap: spacing.md }}>
          <Field
            label="Mobile number"
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            value={digits}
            onChangeText={(text) => {
              setMobile(text.replace(/\D/g, "").slice(0, 10));
              if (phoneError) setPhoneError("");
            }}
            error={phoneError}
            hint={digits.length && !phoneValid ? `${digits.length}/10 digits` : "+91 · 10 digits"}
          />
          <Button label="Send OTP" onPress={onSendOtp} loading={loading} disabled={!phoneValid} />
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Field label="Full name" placeholder="Your name" value={name} onChangeText={setName} />
          <Field label="Email address" placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Button label="Continue" onPress={onEmailContinue} loading={loading} />
        </View>
      )}

      <Divider />

      <Button
        label={emailMode ? "Use mobile number instead" : "Continue with email"}
        variant="outline"
        icon={<Mail size={16} color={colors.primaryDark} />}
        onPress={() => setEmailMode((v) => !v)}
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
