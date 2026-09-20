import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, Lock, Phone, ShieldCheck, User } from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import { BookAShootLogo } from "@/src/components/BookAShootLogo";
import { Button } from "@/src/components/Button";
import { Muted, ScreenTitle } from "@/src/components/ui";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, radius, radiusSm, spacing, touchTarget } from "@/src/constants/theme";
import { CamartesApiError } from "@/src/services/camartesClient";
import { updateSupabaseUserProfile } from "@/src/services/supabaseAuth";

function resolveAppRoute(target?: string | null): string {
  if (!target || target === "/(tabs)" || target === "/%28tabs%29" || target === "(tabs)" || target === "/(tabs)/index" || target === "/") {
    return "/(tabs)";
  }
  return target;
}

export default function CompleteProfileScreen() {
  const { profile, updateProfile } = useAppStore();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTarget = params.returnTo || "/";

  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.mobile || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.name && !name) {
      setName(profile.name);
    }
    if (profile?.mobile && !phone) {
      setPhone(profile.mobile);
    }
  }, [profile]);

  const cleanDigits = phone.replace(/\D/g, "").slice(-10);
  const isValidPhone = cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits);
  const isValidName = name.trim().length >= 2;

  const onSave = async () => {
    if (!isValidName) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!isValidPhone) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        mobile: cleanDigits,
      });

      try {
        await updateSupabaseUserProfile({
          name: name.trim(),
          mobile: cleanDigits,
        });
      } catch {
        // Non-fatal if Supabase update fails
      }

      const destination = resolveAppRoute(returnTarget);
      router.replace(destination as any);
    } catch (e) {
      setError(
        e instanceof CamartesApiError || e instanceof Error
          ? e.message
          : "Could not save your details. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer keyboardAvoiding includeBottomSafeArea>
      <View style={styles.brandRow}>
        <BookAShootLogo maxWidth={260} widthFraction={0.7} />
      </View>

      <View style={styles.headerBox}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(name.trim() || profile?.name || "U")[0]?.toUpperCase()}
          </Text>
        </View>
        <ScreenTitle style={styles.title}>Complete Your Profile</ScreenTitle>
        <Muted style={styles.subtitle}>
          One quick step to connect you with top verified photographers for your shoots.
        </Muted>
      </View>

      <View style={styles.formCard}>
        {/* Email - Verified Readonly */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.readonlyInput}>
            <Text style={styles.readonlyText} numberOfLines={1}>
              {profile?.email || "Signed in with Google"}
            </Text>
            <View style={styles.verifiedBadge}>
              <CheckCircle2 size={14} color="#16A34A" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <User size={18} color={colors.muted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError("");
              }}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>
        </View>

        {/* Mobile Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Mobile Number <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.phoneInputWrapper}>
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="10-digit mobile number"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "");
                setPhone(digits);
                if (error) setError("");
              }}
              editable={!loading}
            />
          </View>
          <Muted style={styles.helperText}>
            Required for shoot coordination, quotes, and photographer chat notifications.
          </Muted>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Save & Continue"
          onPress={onSave}
          loading={loading}
          disabled={loading || !isValidPhone || !isValidName}
          style={styles.saveButton}
        />

        <View style={styles.privacyNote}>
          <Lock size={13} color={colors.muted} />
          <Text style={styles.privacyText}>
            Your number is private and only shared with the photography team you choose to confirm.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerBox: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  requiredAsterisk: {
    color: colors.primary,
  },
  readonlyInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radiusSm,
    paddingHorizontal: spacing.sm,
    height: touchTarget,
  },
  readonlyText: {
    fontSize: 14,
    color: colors.muted,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: radiusSm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    height: touchTarget,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  phoneInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: radiusSm,
    backgroundColor: colors.white,
    overflow: "hidden",
    height: touchTarget,
  },
  countryCodeBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
    paddingHorizontal: spacing.sm,
    letterSpacing: 0.5,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: radiusSm,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  saveButton: {
    marginTop: spacing.xs,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  privacyText: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
    textAlign: "center",
    flex: 1,
  },
});
