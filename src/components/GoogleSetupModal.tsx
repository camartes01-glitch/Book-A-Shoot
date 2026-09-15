import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, Copy, ExternalLink, ShieldCheck, X } from "lucide-react-native";
import { GoogleGLogo } from "@/src/components/GoogleSignInButton";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";
import { selectionFeedback } from "@/src/utils/haptics";

const ENV_SNIPPET = `# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com`;

export interface GoogleSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onTestSandboxAccount: () => Promise<void>;
}

export function GoogleSetupModal({
  visible,
  onClose,
  onTestSandboxAccount,
}: GoogleSetupModalProps) {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleCopy = () => {
    void selectionFeedback();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(ENV_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSandboxClick = async () => {
    setTesting(true);
    void selectionFeedback();
    try {
      await onTestSandboxAccount();
      onClose();
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <View style={styles.logoCircle}>
                <GoogleGLogo size={22} />
              </View>
              <View>
                <Text style={styles.title}>Google Sign-In Setup</Text>
                <Text style={styles.subtitle}>Production setup & sandbox testing</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close setup dialog"
            >
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Explanatory Note */}
            <Text style={styles.description}>
              Google OAuth client IDs are required to authenticate live Google accounts in production.
            </Text>

            {/* Step by Step Guide */}
            <View style={styles.stepsCard}>
              <Text style={styles.stepsHeading}>How to get your Google Client IDs:</Text>
              
              <View style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={styles.stepText}>
                  Go to <Text style={styles.bold}>Google Cloud Console → Credentials</Text> and create an OAuth 2.0 Client ID.
                </Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={styles.stepText}>
                  Set platform to <Text style={styles.bold}>Web</Text> (and Android with package <Text style={styles.code}>com.camartes.customer</Text>).
                </Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={styles.stepText}>
                  Paste the generated Client ID into your <Text style={styles.code}>.env</Text> file.
                </Text>
              </View>
            </View>

            {/* Code Snippet Box */}
            <View style={styles.codeBox}>
              <View style={styles.codeBoxHeader}>
                <Text style={styles.codeBoxTitle}>.env configuration</Text>
                <Pressable
                  onPress={handleCopy}
                  style={styles.copyBtn}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Copy environment snippet"
                >
                  {copied ? (
                    <View style={styles.copiedRow}>
                      <Check size={14} color={colors.success} />
                      <Text style={styles.copiedText}>Copied</Text>
                    </View>
                  ) : (
                    <View style={styles.copiedRow}>
                      <Copy size={14} color={colors.primaryDark} />
                      <Text style={styles.copyBtnText}>Copy</Text>
                    </View>
                  )}
                </Pressable>
              </View>
              <Text style={styles.codeText}>{ENV_SNIPPET}</Text>
            </View>

            {/* Sandbox Testing Callout */}
            <View style={styles.sandboxCard}>
              <View style={styles.sandboxHeader}>
                <ShieldCheck size={18} color={colors.primaryDark} />
                <Text style={styles.sandboxTitle}>Test Right Now in Sandbox</Text>
              </View>
              <Text style={styles.sandboxDesc}>
                You can immediately test the full Google login experience against your live backend using a verified test user profile.
              </Text>
              <Pressable
                onPress={handleSandboxClick}
                disabled={testing}
                style={[styles.sandboxBtn, testing && styles.sandboxBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Test with Google Sandbox Account"
              >
                {testing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.sandboxBtnText}>
                    Sign in with Google Sandbox Account →
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  dismissArea: {
    ...StyleSheet.absoluteFill,
  },
  dialog: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: spacing.lg,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    gap: spacing.md,
  },
  description: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  stepsCard: {
    backgroundColor: colors.bg,
    borderRadius: radiusSm,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  stepsHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.peach,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
  },
  bold: {
    fontWeight: "700",
    color: colors.text,
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    backgroundColor: colors.card,
    color: colors.primaryDark,
    fontSize: 11,
  },
  codeBox: {
    backgroundColor: "#1F2937",
    borderRadius: radiusSm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  codeBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  codeBoxTitle: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  copyBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  copiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyBtnText: {
    color: colors.peach,
    fontSize: 12,
    fontWeight: "700",
  },
  copiedText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
  codeText: {
    color: "#F9FAFB",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    lineHeight: 16,
  },
  sandboxCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    borderRadius: radiusSm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  sandboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sandboxTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  sandboxDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 4,
  },
  sandboxBtn: {
    backgroundColor: colors.primary,
    borderRadius: radiusSm,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sandboxBtnDisabled: {
    opacity: 0.6,
  },
  sandboxBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
});
