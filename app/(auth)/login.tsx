import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { BrandMark, Button, Divider, Field, Muted, ScreenTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, spacing } from "@/src/constants/theme";

export default function LoginScreen() {
  const { requestOtp, loginWithEmail } = useAppStore();
  const [mobile, setMobile] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSendOtp = async () => {
    const digits = mobile.replace(/\D/g, "");
    if (digits.length !== 10) {
      Alert.alert("Enter a valid mobile number", "Mobile number must be 10 digits.");
      return;
    }
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
    <ScreenContainer>
      <View style={styles.brandRow}>
        <BrandMark size={56} />
        <ScreenTitle>Welcome to Camartes</ScreenTitle>
        <Muted>Book photographers & videographers for your event in minutes.</Muted>
      </View>

      {!emailMode ? (
        <View style={{ gap: spacing.md }}>
          <Field
            label="Mobile number"
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            value={mobile}
            onChangeText={setMobile}
          />
          <Button label="Send OTP" onPress={onSendOtp} loading={loading} />
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
  brandRow: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg, marginTop: spacing.xl },
});
