import { useEffect } from "react";
import { router } from "expo-router";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { Muted, ScreenTitle } from "@/src/components/ui";

/** Password login replaced the demo OTP flow. Keep this route so old links don't crash. */
export default function OtpScreen() {
  useEffect(() => {
    router.replace("/(auth)/login");
  }, []);

  return (
    <ScreenContainer>
      <ScreenTitle>Sign in</ScreenTitle>
      <Muted>Camartes accounts use email or phone and a password. Redirecting…</Muted>
    </ScreenContainer>
  );
}
