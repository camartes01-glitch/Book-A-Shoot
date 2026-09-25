/**
 * Book A Shoot — Privacy Policy
 * Real privacy policy reflecting personal data handling, event media protection,
 * KYC documentation security, and client rights.
 */

import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react-native";
import { colors, radius, spacing } from "@/src/constants/theme";

export default function PrivacyPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;

  const goToHome = () => router.push("/landing");

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Privacy Policy — Book A Shoot";
    }
  }, []);

  return (
    <View style={styles.root}>
      {/* ── Top Navbar ─────────────────────────────────────────────────── */}
      <View style={[styles.navbar, { paddingTop: insets.top }]}>
        <View style={[styles.navInner, isWide && styles.navInnerWide]}>
          <Pressable
            onPress={goToHome}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <ArrowLeft size={18} color={colors.text} />
            <Text style={styles.backBtnText}>Home</Text>
          </Pressable>

          <Pressable onPress={goToHome}>
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={[styles.navLogo, !isWide && styles.navLogoPhone]}
              resizeMode="contain"
              accessibilityLabel="Book A Shoot"
            />
          </Pressable>

          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 74, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, isWide && styles.containerWide]}>
          <View style={styles.header}>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.lastUpdated}>Effective Date: September 2025 · Camartes</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Privacy Commitment</Text>
            <Text style={styles.paragraph}>
              At <Text style={styles.bold}>Book A Shoot</Text> (a brand of Camartes), we hold
              the privacy of your personal life, family moments, and confidential event details in the
              highest regard. This Privacy Policy details how we collect, safeguard, process, and respect
              your information.
            </Text>

            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.paragraph}>
              To coordinate seamless photography assignments, we collect:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>
                • <Text style={styles.bold}>Account & Contact Data:</Text> Name, phone number, email address, and billing location.
              </Text>
              <Text style={styles.bulletItem}>
                • <Text style={styles.bold}>Event Details:</Text> Venue address, dates, ceremony timings, deliverable preferences, and customized instructions.
              </Text>
              <Text style={styles.bulletItem}>
                • <Text style={styles.bold}>Vendor KYC Verification:</Text> Government identity, GST certificates, studio registration documents, and portfolio archives (for studios).
              </Text>
              <Text style={styles.bulletItem}>
                • <Text style={styles.bold}>Transaction Records:</Text> Tokenized payment receipts and milestone escrow confirmations. We do not store raw card numbers.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>3. Media Confidentiality & Asset Protection</Text>
            <Text style={styles.paragraph}>
              Photographs, raw video rushes, and final cinematic edits uploaded to our platform for review
              are hosted in encrypted, access-controlled cloud storage buckets.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Private & NDA Option:</Text> Customers booking confidential personal
              or commercial events may choose our private shoot option. In such cases, partner studios are contractually
              forbidden from posting, sharing, or publishing any preview media on social media or personal portfolios.
            </Text>

            <Text style={styles.sectionTitle}>4. How We Share Information</Text>
            <Text style={styles.paragraph}>
              We share relevant event details strictly with the specific assigned and confirmed photography
              firm to allow them to arrive punctually and execute your shoot. We never sell, rent, or trade your
              personal information to third-party telemarketers or external advertising networks.
            </Text>

            <Text style={styles.sectionTitle}>5. Data Security & Storage</Text>
            <Text style={styles.paragraph}>
              We employ industry-standard TLS encryption for all data in transit, and AES-256 encryption for
              stored credentials and customer documents. Access is restricted to authorized personnel who require
              it to troubleshoot or facilitate bookings.
            </Text>

            <Text style={styles.sectionTitle}>6. Your Rights & Data Controls</Text>
            <Text style={styles.paragraph}>
              Under applicable Indian privacy and digital data regulations, you have the right to request access
              to your stored profile, update inaccurate records, download deliverables, or request permanent
              account and data deletion after your event deliverables have been fulfilled.
            </Text>

            <Text style={styles.sectionTitle}>7. Grievance Officer & Contact</Text>
            <Text style={styles.paragraph}>
              In accordance with Information Technology rules, if you have any questions or concerns regarding
              our privacy practices, please contact our Grievance Officer:
            </Text>
            <Text style={styles.paragraph}>
              Grievance Officer, Book A Shoot{"\n"}
              Email: info@bookashoot.online{"\n"}
              HeadQuarters: RTIH Vijayawada, Andhra Pradesh
            </Text>
          </View>

        </View>
        <UniversalFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  navbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navInner: {
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  navInnerWide: {
    paddingHorizontal: 48,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  navLogo: {
    width: 220,
    height: 56,
  },
  navLogoPhone: {
    width: 135,
    height: 34,
  },
  container: {
    paddingHorizontal: spacing.xl,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  containerWide: {
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgWarm,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    marginBottom: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.primaryDark,
    textAlign: "center",
  },
  lastUpdated: {
    fontSize: 13,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.primaryDark,
    marginTop: spacing.sm,
  },
  paragraph: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  bold: {
    fontWeight: "700",
    color: colors.primaryDark,
  },
  bulletList: {
    paddingLeft: spacing.sm,
    gap: 6,
  },
  bulletItem: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 21,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 40,
  },
  footerLink: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  footerDot: {
    color: colors.disabledText,
  },
  pressed: {
    opacity: 0.8,
  },
});
