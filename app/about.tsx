/**
 * Book A Shoot — About Us Page
 * Real About Us page featuring aboutus.png hero image, brand story,
 * 100% KYC verification standards, matching methodology, and team values.
 */

import React from "react";
import {
  Image,
  Linking,
  Platform,
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
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react-native";
import { colors, radius, spacing } from "@/src/constants/theme";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "100% KYC Verified Firms",
    desc: "Every photography studio on our network undergoes strict government ID checks, business registration audits, portfolio authenticity validation, and ongoing quality reviews.",
  },
  {
    icon: Zap,
    title: "Intelligent Smart Matching",
    desc: "Our proprietary algorithm analyzes your event scale, location, visual style, and deliverable needs to match you with top-rated, available studios in seconds.",
  },
  {
    icon: RefreshCw,
    title: "Automated Replacement Guarantee",
    desc: "Never worry about cancellations or emergencies. If a studio is unavailable or fails to confirm within the SLA window, our system automatically assigns an equally qualified, verified firm.",
  },
  {
    icon: Clock,
    title: "Strict Delivery Timelines",
    desc: "No more chasing photographers for albums. Every booking is backed by clear contractual deadlines for raw rushes, curated proofs, and finalized 4K cinematic edits.",
  },
];

const STATS = [
  { value: "500+", label: "KYC-Verified Studios" },
  { value: "10K+", label: "Celebrations Captured" },
  { value: "99.4%", label: "On-Time Delivery Rate" },
  { value: "4.9★", label: "Average Client Rating" },
];

const ONBOARDING_STEPS = [
  {
    num: "01",
    title: "Government & Business Verification",
    desc: "We verify GSTIN, business credentials, and owner identity documents through automated KYC checks before any firm can join the ecosystem.",
  },
  {
    num: "02",
    title: "Portfolio & Craft Audit",
    desc: "Our creative review committee inspects raw files, past client galleries, and full-length wedding films to ensure genuine artistic excellence.",
  },
  {
    num: "03",
    title: "Equipment & Backup Compliance",
    desc: "Studios must demonstrate professional gear compliance: dual-card slot full-frame bodies, prime lenses, redundant audio rigs, and secure cloud storage.",
  },
  {
    num: "04",
    title: "Service Level Agreement (SLA) Pledge",
    desc: "Firms sign strict commitments on arrival punctuality, client etiquette, and guaranteed delivery timelines for all final deliverables.",
  },
];

export default function AboutPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;

  const goToLogin = () => router.push("/(auth)/login");
  const goToHome = () => router.push("/landing");
  const goToServices = () => router.push("/services");
  const openPartner = () => Linking.openURL("https://camartes.com");

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "About Us — Book A Shoot | Powered by Camartes";
    }
  }, []);

  return (
    <View style={styles.root}>
      {/* ── Universal Constant Navbar ──────────────────────────────────────── */}
      <UniversalNavbar activeRoute="about" />

      {/* ── Scrollable Body ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + (isWide ? 96 : 88), paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Section ─────────────────────────────────────────────── */}
        {!isWide ? (
          <View style={styles.phoneHeroWrapper}>
            <Image
              source={
                Platform.OS === "web"
                  ? { uri: "/phoneabout.png" }
                  : require("@/assets/images/phoneabout.png")
              }
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityLabel="About Book A Shoot"
            />
            {/* Rich scrim overlay for crisp contrast */}
            <View style={styles.phoneHeroOverlay} />
            <View style={styles.phoneHeroContent}>
              <Text style={styles.phoneHeroHeading}>
                Transforming Event Photography Through Trust & Technology
              </Text>
              <Text style={styles.phoneHeroSub}>
                A premier product of Camartes, Book A Shoot is India's dedicated platform connecting
                families, couples, and enterprises with elite photography & cinematography studios.
              </Text>
              <View style={styles.phoneHeroCtaRow}>
                <Pressable
                  onPress={goToLogin}
                  style={({ pressed }) => [styles.phoneHeroPrimaryBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.phoneHeroPrimaryBtnText}>Book A Shoot</Text>
                  <ArrowRight size={15} color={colors.white} />
                </Pressable>
                <Pressable
                  onPress={goToServices}
                  style={({ pressed }) => [styles.phoneHeroGhostBtn, pressed && styles.pressed]}
                  accessibilityRole="link"
                >
                  <Text style={styles.phoneHeroGhostBtnText}>Explore Services</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.heroSection, styles.heroSectionWide]}>
            <Text style={[styles.heroHeading, styles.heroHeadingWide]}>
              Transforming Event Photography Through Trust & Technology
            </Text>

            <Text style={[styles.heroSub, styles.heroSubWide]}>
              A premier product of Camartes, Book A Shoot is India's dedicated platform connecting
              families, couples, and enterprises with elite, 100% KYC-verified photography and
              cinematography firms.
            </Text>

            {/* Hero Image Container */}
            <View style={[styles.heroImageFrame, styles.heroImageFrameWide]}>
              <Image
                source={
                  Platform.OS === "web"
                    ? { uri: "/aboutus.png" }
                    : require("@/assets/images/aboutus.png")
                }
                style={styles.heroImage}
                resizeMode="cover"
                accessibilityLabel="Book A Shoot Team and Professional Gear"
              />
              <View style={styles.imageOverlayBadge}>
                <ShieldCheck size={18} color={colors.white} />
                <Text style={styles.imageBadgeText}>100% Verified Production Partners</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Stats Section: 4 Cards on Mobile, Strip on Desktop ────────── */}
        {!isWide ? (
          <View style={styles.statsMobileGrid}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.statCardMobile}>
                <Text style={styles.statCardValueMobile}>{s.value}</Text>
                <Text style={styles.statCardLabelMobile}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.statsStrip, styles.statsStripWide]}>
            {STATS.map((s, idx) => (
              <View
                key={s.label}
                style={[
                  styles.statItem,
                  idx < STATS.length - 1 && styles.statDivider,
                ]}
              >
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Brand Narrative ─────────────────────────────────────────── */}
        <View style={styles.narrativeSection}>
          <View style={[styles.narrativeInner, isWide && styles.narrativeInnerWide]}>
            <Text style={styles.narrativeTitle}>Why We Built Book A Shoot</Text>
            <Text style={styles.narrativeLead}>
              For decades, hiring a wedding or event photographer in India was fraught with uncertainty.
              Clients faced opaque pricing, sudden vendor cancellations, unverified freelancers, and
              endless delays in receiving albums and cinematic films.
            </Text>
            <Text style={styles.bodyParagraph}>
              We created <Text style={styles.boldText}>Book A Shoot</Text> to bring institutional reliability
              and creative transparency to every celebration. By establishing stringent KYC verification,
              standardized deliverable contracts, and a real-time automated replacement guarantee, we
              ensure that your most cherished milestones are captured flawlessly — without stress.
            </Text>
          </View>
        </View>

        {/* ── Four Core Pillars ─────────────────────────────────────────── */}
        <View style={styles.pillarsSection}>
          <View style={[styles.pillarsInner, isWide && styles.pillarsInnerWide]}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeading}>How We Protect Your Moments</Text>
              <Text style={styles.sectionSub}>
                From booking confirmation to final 4K video export, our operating model ensures absolute peace of mind.
              </Text>
            </View>

            <View style={[styles.pillarsGrid, isWide && styles.pillarsGridWide]}>
              {PILLARS.map((p) => {
                const IconComp = p.icon;
                return (
                  <View key={p.title} style={[styles.pillarCard, isWide && styles.pillarCardWide]}>
                    <View style={styles.pillarIconWrap}>
                      <IconComp size={22} color={colors.primary} />
                    </View>
                    <Text style={styles.pillarTitle}>{p.title}</Text>
                    <Text style={styles.pillarDesc}>{p.desc}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Verification Process ─────────────────────────────────────── */}
        <View style={styles.verificationSection}>
          <View style={[styles.verificationInner, isWide && styles.verificationInnerWide]}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeading}>Our 4-Stage Studio Verification</Text>
              <Text style={styles.sectionSub}>
                Only the top 15% of applicant photography firms meet our quality, equipment, and reliability standards.
              </Text>
            </View>

            <View style={[styles.stepsContainer, isWide && styles.stepsContainerWide]}>
              {ONBOARDING_STEPS.map((step) => (
                <View key={step.num} style={[styles.stepItem, isWide && styles.stepItemWide]}>
                  <View style={styles.stepNumBadge}>
                    <Text style={styles.stepNumText}>{step.num}</Text>
                  </View>
                  <Text style={styles.stepItemTitle}>{step.title}</Text>
                  <Text style={styles.stepItemDesc}>{step.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Bottom CTA Banner (Consistently using cta.png) ───────────── */}
        <View style={[styles.ctaBannerWrapper, !isWide && styles.ctaBannerWrapperPhone]}>
          <Image
            source={
              Platform.OS === "web"
                ? { uri: "/cta.png?v=2" }
                : require("@/assets/images/cta.png")
            }
            style={styles.ctaBackgroundImage}
            resizeMode="cover"
            accessibilityLabel="Book A Shoot Call to Action Banner"
          />

          <View style={[styles.ctaLeftContainer, isWide ? styles.ctaLeftContainerWide : styles.ctaLeftContainerPhone]}>
            <Text style={[styles.ctaTitleLeft, isWide ? styles.ctaTitleLeftWide : styles.ctaTitleLeftPhone]}>
              Ready to Capture Your{"\n"}
              <Text style={{ color: colors.primaryDark }}>Next Big Celebration?</Text>
            </Text>

            <Text style={styles.ctaSubLeft}>
              Book a vetted, KYC-verified photography team today or partner your studio with Camartes.
            </Text>

            <View style={styles.ctaButtonRow}>
              <Pressable
                onPress={goToLogin}
                style={({ pressed }) => [styles.ctaBtnOrange, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.ctaBtnTextWhite}>Book a Shoot Now</Text>
                <ArrowRight size={18} color={colors.white} />
              </Pressable>

              <Pressable
                onPress={openPartner}
                style={({ pressed }) => [styles.ctaBtnGhost, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.ctaBtnTextGhost}>Partner with Us</Text>
                <ExternalLink size={16} color={colors.primaryDark} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Universal Footer ────────────────────────────────────────── */}
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
  navLogoContainer: {
    alignItems: "center",
  },
  navLogo: {
    width: 220,
    height: 56,
  },
  navLogoPhone: {
    width: 135,
    height: 34,
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  navGhostBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  navGhostText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  navPrimaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius,
  },
  navPrimaryBtnPhone: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  navPrimaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Hero ─────────────────────────────────────────────────────────────
  phoneHeroWrapper: {
    position: "relative",
    width: "100%",
    minHeight: 520,
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  phoneHeroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  phoneHeroContent: {
    position: "relative",
    zIndex: 2,
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 12,
  },
  phoneHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.4)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  phoneHeroBadgeText: {
    color: "#fb923c",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  phoneHeroHeading: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.white,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  phoneHeroSub: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 22,
  },
  phoneHeroCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 8,
  },
  phoneHeroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  phoneHeroPrimaryBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  phoneHeroGhostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  phoneHeroGhostBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  heroSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  heroSectionWide: {
    paddingHorizontal: 56,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgWarm,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    marginBottom: spacing.md,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroHeading: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.primaryDark,
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.6,
    maxWidth: 680,
  },
  heroHeadingWide: {
    fontSize: 46,
    lineHeight: 56,
  },
  heroSub: {
    fontSize: 16,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 25,
    marginTop: spacing.md,
    maxWidth: 620,
  },
  heroSubWide: {
    fontSize: 17,
  },
  heroImageFrame: {
    width: "100%",
    height: 280,
    borderRadius: radius,
    overflow: "hidden",
    marginTop: spacing.xl,
    backgroundColor: colors.bgWarm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    position: "relative",
  },
  heroImageFrameWide: {
    height: 440,
    maxWidth: 960,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlayBadge: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.lg,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imageBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Stats ────────────────────────────────────────────────────────────
  statsMobileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCardMobile: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCardValueMobile: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statCardLabelMobile: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
    lineHeight: 16,
  },
  statsStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.white,
    marginHorizontal: spacing.xl,
    marginVertical: 64,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 32,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statsStripWide: {
    marginHorizontal: 56,
  },
  statItem: {
    flex: 1,
    minWidth: 140,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },

  // ── Narrative Section ────────────────────────────────────────────────
  narrativeSection: {
    paddingVertical: 84,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  narrativeInner: {
    maxWidth: 960,
    alignSelf: "center",
    width: "100%",
    gap: spacing.md,
  },
  narrativeInnerWide: {
    paddingHorizontal: 24,
  },
  narrativeTitle: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.primaryDark,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  narrativeLead: {
    fontSize: 17,
    color: "#1f2937",
    lineHeight: 28,
    fontWeight: "500",
  },
  bodyParagraph: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 26,
  },
  boldText: {
    fontWeight: "700",
    color: colors.primaryDark,
  },

  // ── Pillars Section ──────────────────────────────────────────────────
  pillarsSection: {
    paddingVertical: 84,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
  },
  pillarsInner: {
    maxWidth: 960,
    alignSelf: "center",
    width: "100%",
  },
  pillarsInnerWide: {
    paddingHorizontal: 24,
  },
  sectionHead: {
    alignItems: "center",
    marginBottom: 44,
    gap: spacing.xs,
  },
  sectionHeading: {
    fontSize: 30,
    fontWeight: "600",
    color: colors.primaryDark,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  sectionSub: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 580,
    lineHeight: 23,
  },
  pillarsGrid: {
    gap: spacing.lg,
  },
  pillarsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    maxWidth: 960,
    alignSelf: "center",
  },
  pillarCard: {
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pillarCardWide: {
    width: "48%",
    flexGrow: 1,
  },
  pillarIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bgWarm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  pillarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  pillarDesc: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
  },

  // ── Verification Section ─────────────────────────────────────────────
  verificationSection: {
    paddingVertical: 84,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  verificationInner: {
    maxWidth: 960,
    alignSelf: "center",
    width: "100%",
  },
  verificationInnerWide: {
    paddingHorizontal: 24,
  },
  stepsContainer: {
    gap: spacing.md,
  },
  stepsContainerWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    maxWidth: 960,
    alignSelf: "center",
  },
  stepItem: {
    backgroundColor: colors.bgWarm,
    borderRadius: radius,
    padding: 26,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    gap: spacing.xs,
  },
  stepItemWide: {
    width: "48%",
    flexGrow: 1,
  },
  stepNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  stepNumText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  stepItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  stepItemDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },

  // ── Bottom CTA (cta.png Banner) ──────────────────────────────────────
  ctaBannerWrapper: {
    position: "relative",
    overflow: "hidden",
    minHeight: 460,
    justifyContent: "center",
    marginTop: 84,
    marginBottom: 40,
  },
  ctaBannerWrapperPhone: {
    minHeight: 380,
    marginTop: 40,
  },
  ctaBackgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  ctaLeftContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 64,
    maxWidth: 620,
    gap: 16,
    zIndex: 2,
  },
  ctaLeftContainerWide: {
    paddingLeft: 72,
  },
  ctaLeftContainerPhone: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 40,
  },
  ctaTitleLeft: {
    fontSize: 32,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  ctaTitleLeftWide: {
    fontSize: 40,
    lineHeight: 48,
  },
  ctaTitleLeftPhone: {
    fontSize: 24,
    lineHeight: 32,
  },
  ctaSubLeft: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 25,
    maxWidth: 480,
  },
  ctaButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: 8,
  },
  ctaBtnOrange: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingHorizontal: 28,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ctaBtnTextWhite: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  ctaBtnGhost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 22,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctaBtnTextGhost: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Footer ───────────────────────────────────────────────────────────
  footer: {
    marginTop: 64,
    marginBottom: 40,
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  footerLogo: {
    width: 220,
    height: 56,
    marginBottom: 8,
  },
  footerLogoPhone: {
    width: 140,
    height: 36,
  },
  footerBrand: {
    fontSize: 13,
    color: colors.muted,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerLinkText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  footerDot: {
    color: colors.disabledText,
  },

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
