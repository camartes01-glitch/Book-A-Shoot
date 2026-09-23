/**
 * Book A Shoot — Terms of Service
 * Real terms of service reflecting platform matching, 1-hour SLA,
 * KYC verified studios, auto-replacement guarantee, payments, and cancellations.
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
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react-native";
import { colors, radius, spacing } from "@/src/constants/theme";

export default function TermsPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;

  const goToHome = () => router.push("/landing");

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Terms of Service — Book A Shoot";
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
              style={styles.navLogo}
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
            <View style={styles.pill}>
              <FileText size={14} color={colors.primaryDark} />
              <Text style={styles.pillText}>Legal Agreement</Text>
            </View>
            <Text style={styles.title}>Terms of Service</Text>
            <Text style={styles.lastUpdated}>Effective Date: September 2025 · Camartes Technologies</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Introduction & Overview</Text>
            <Text style={styles.paragraph}>
              Welcome to <Text style={styles.bold}>Book A Shoot</Text>, a product platform owned and
              operated by Camartes Technologies ("Camartes", "we", "our", or "us"). These Terms of Service
              govern your access to and use of the Book A Shoot mobile applications, web application, and
              related services (collectively, the "Platform").
            </Text>
            <Text style={styles.paragraph}>
              By creating an account, submitting a booking request, or otherwise using the Platform, you
              agree to be bound by these Terms. If you do not agree, please do not use our services.
            </Text>

            <Text style={styles.sectionTitle}>2. Platform Service Model</Text>
            <Text style={styles.paragraph}>
              Book A Shoot functions as a premier matchmaking and workflow management ecosystem. We
              connect clients ("Customers" or "Hosts") seeking event photography and videography services
              with independent, professional photography firms and studios ("Production Partners" or "Vendors").
            </Text>
            <Text style={styles.paragraph}>
              While Camartes verifies vendor credentials, enforces SLAs, and guarantees deliverable schedules,
              the actual creative execution on the shoot day is performed by the assigned partner firm.
            </Text>

            <Text style={styles.sectionTitle}>3. 100% KYC Verification Standards</Text>
            <Text style={styles.paragraph}>
              All production firms on Book A Shoot undergo mandatory Know Your Customer (KYC) verification,
              including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Legal identity verification (PAN, Aadhaar, GSTIN)</Text>
              <Text style={styles.bulletItem}>• Verification of studio address and registered commercial premises</Text>
              <Text style={styles.bulletItem}>• Creative audit of raw portfolio files, color science, and past client deliverables</Text>
              <Text style={styles.bulletItem}>• Equipment audit ensuring dual-card redundancy and professional full-frame hardware</Text>
            </View>

            <Text style={styles.sectionTitle}>4. Matchmaking & Automated Replacement Guarantee</Text>
            <Text style={styles.paragraph}>
              Upon submitting a booking request, our algorithmic matching engine routes your event parameters
              to the most suitable verified partner studios. Studios have a strict 1-hour window to review and
              accept the assignment.
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Zero Cancellation Risk:</Text> If an assigned studio rejects the request,
              fails to respond within the 1-hour SLA, or encounters an emergency prior to your shoot date, our
              system automatically initiates an immediate backfill to match you with another equally qualified,
              KYC-verified firm at no additional surcharge.
            </Text>

            <Text style={styles.sectionTitle}>5. Pricing, Deposits & Payments</Text>
            <Text style={styles.paragraph}>
              All quotes generated on Book A Shoot are transparent, itemized, and all-inclusive of specified
              deliverables (e.g. edited photos, candid teaser, traditional video). An initial advance deposit
              is collected securely via the Platform to lock the studio's calendar. Subsequent milestone payments
              are held in escrow and released to the studio upon successful completion of milestones and raw rushes upload.
            </Text>

            <Text style={styles.sectionTitle}>6. Deliverables & Timelines</Text>
            <Text style={styles.paragraph}>
              Every booking contract stipulates strict delivery windows:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Raw photo rushes: Typically delivered via secure cloud link within 48 to 72 hours</Text>
              <Text style={styles.bulletItem}>• Selected color-graded edits: Delivered within 14 to 21 business days</Text>
              <Text style={styles.bulletItem}>• Cinematic 4K wedding films & teasers: Delivered within 30 to 45 business days</Text>
            </View>

            <Text style={styles.sectionTitle}>7. Cancellations & Rescheduling</Text>
            <Text style={styles.paragraph}>
              Events may be rescheduled up to 7 days before the shoot date without penalty, subject to studio
              availability. Cancellations made more than 14 days prior to the event are eligible for full or partial
              refunds in accordance with our cancellation tiers. In cases of sudden natural calamities or Force Majeure,
              Camartes works directly with clients to facilitate date transfers or credits.
            </Text>

            <Text style={styles.sectionTitle}>8. Intellectual Property & Privacy</Text>
            <Text style={styles.paragraph}>
              Customers receive perpetual, personal-use rights to all final delivered photographs and videos.
              Partners retain moral authorship rights for portfolio showcase, unless the Customer has explicitly
              requested private/NDA coverage during booking.
            </Text>

            <Text style={styles.sectionTitle}>9. Contact & Support</Text>
            <Text style={styles.paragraph}>
              For any questions regarding these terms, contact our support team at legal@camartes.com or reach out
              via our platform in-app support chat.
            </Text>
          </View>

          <View style={styles.footerRow}>
            <Pressable onPress={() => router.push("/landing")}>
              <Text style={styles.footerLink}>Home</Text>
            </Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/about")}>
              <Text style={styles.footerLink}>About Us</Text>
            </Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/services")}>
              <Text style={styles.footerLink}>Services</Text>
            </Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/blogs")}>
              <Text style={styles.footerLink}>Blogs</Text>
            </Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/privacy")}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>
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
