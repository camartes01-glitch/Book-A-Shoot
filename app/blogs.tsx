/**
 * Book A Shoot — Dedicated Blogs & Insights Page
 *
 * Visual chronicles, wedding guides, and behind-the-lens editorial
 * featuring blog1.png and blog2.png with smart marketing commentary.
 */

import React from "react";
import {
  Image,
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
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Flame,
  Heart,
  Share2,
  Sparkles,
} from "lucide-react-native";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";

const BLOG_POSTS = [
  {
    id: "pre-wedding-guide",
    image:
      Platform.OS === "web"
        ? { uri: "/blog1.png" }
        : require("@/assets/images/blog1.png"),
    tag: "Cinematography & Styling",
    readTime: "4 min read",
    date: "September 2025",
    title: "How to Look Effortlessly Natural on Camera: The Pre-Wedding Survival Guide",
    sub: "Ditch the stiff, robotic poses. Here are 7 director-approved secrets from India's top wedding cinematographers on framing, golden-hour light, and moving with authentic romance.",
    bodyPreview:
      "Most couples walk onto their first pre-wedding shoot feeling self-conscious. The camera lens feels like an interrogation lamp. But here is the industry secret: the best candid photographs aren't captured when you try to 'pose' — they happen in the micro-moments of laughter, unscripted glances, and playful motion between the frames.",
  },
  {
    id: "elite-photographers-timeline",
    image:
      Platform.OS === "web"
        ? { uri: "/blog2.png" }
        : require("@/assets/images/blog2.png"),
    tag: "Industry Secrets & Booking Logic",
    readTime: "6 min read",
    date: "September 2025",
    title: "The Real Reason Elite Wedding Photographers Get Booked 6 Months in Advance",
    sub: "Inside the high-demand wedding calendar in Hyderabad and Bengaluru: why booking multi-event bundles early saves your sanity, locks signature color grading, and beats the auspicious date rush.",
    bodyPreview:
      "With auspicious muhurtham dates concentrated into tight seasonal windows, India's premier photography studios can accept only one anchor wedding per weekend. If you wait until 60 days before the Haldi, your top choices are guaranteed to be taken. Discover how smart couples are locking multi-day packages under unified contracts.",
  },
];

export default function BlogsPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;

  const goToHome = () => router.push("/landing");
  const goToServices = () => router.push("/services");
  const goToAbout = () => router.push("/about");
  const goToLogin = () => router.push("/(auth)/login");

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Stories, Guides & Insights — Book A Shoot";
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

          <Pressable onPress={goToHome} style={styles.navLogoContainer}>
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={styles.navLogo}
              resizeMode="contain"
              accessibilityLabel="Book A Shoot"
            />
          </Pressable>

          <View style={styles.navActions}>
            <Pressable
              onPress={goToServices}
              style={({ pressed }) => [styles.navGhostBtn, pressed && styles.pressed]}
              accessibilityRole="link"
            >
              <Text style={styles.navGhostText}>Services</Text>
            </Pressable>
            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [styles.navPrimaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.navPrimaryText}>Book Now</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Main Content Scroll ────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 70, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Banner ─────────────────────────────────────────────── */}
        <View style={[styles.headerSection, isWide && styles.headerSectionWide]}>
          <View style={styles.pill}>
            <BookOpen size={14} color={colors.primaryDark} />
            <Text style={styles.pillText}>Stories & Perspectives</Text>
          </View>
          <Text style={[styles.heading, isWide && styles.headingWide]}>
            Visual Chronicles & Industry Insights
          </Text>
          <Text style={[styles.subheading, isWide && styles.subheadingWide]}>
            Where Indian celebration culture meets modern editorial cinematography. Unfiltered advice,
            creative style guides, and production stories curated by the Camartes editorial desk.
          </Text>
        </View>

        {/* ── Featured Blog Articles ────────────────────────────────────── */}
        <View style={[styles.blogsGrid, isWide && styles.blogsGridWide]}>
          {BLOG_POSTS.map((post) => (
            <View key={post.id} style={[styles.blogCard, isWide && styles.blogCardWide]}>
              <View style={styles.cardImageFrame}>
                <Image source={post.image} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.cardTagBadge}>
                  <Text style={styles.cardTagText}>{post.tag}</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardMetaRow}>
                  <View style={styles.cardMetaItem}>
                    <Clock size={13} color={colors.muted} />
                    <Text style={styles.cardMetaText}>{post.readTime}</Text>
                  </View>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.cardMetaText}>{post.date}</Text>
                </View>

                <Text style={styles.cardTitle}>{post.title}</Text>
                <Text style={styles.cardSub}>{post.sub}</Text>
                <Text style={styles.cardBodyPreview}>{post.bodyPreview}</Text>

                <Pressable
                  onPress={goToLogin}
                  style={({ pressed }) => [styles.readMoreBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.readMoreText}>Book Shoot for This Experience</Text>
                  <ArrowRight size={16} color={colors.primaryDark} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* ── Marketing Editorial Note ──────────────────────────────────── */}
        <View style={[styles.noteCard, isWide && styles.noteCardWide]}>
          <View style={styles.noteBadge}>
            <Sparkles size={14} color={colors.primaryDark} />
            <Text style={styles.noteBadgeText}>Creative Community</Text>
          </View>
          <Text style={styles.noteTitle}>Have a Wedding or Visual Story to Tell?</Text>
          <Text style={styles.noteDesc}>
            We regularly publish real celebration galleries, cinematographer gear breakdowns, and client
            planning playbooks. Full-length deep-dives, video retrospectives, and guest editorial features
            are rolling out weekly.
          </Text>
        </View>

        {/* ── UNIFIED CTA BANNER (cta.png as Whole Background) ─────────── */}
        <View style={styles.ctaBannerWrapper}>
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

          <View style={[styles.ctaLeftContainer, isWide && styles.ctaLeftContainerWide]}>
            <Text style={[styles.ctaTitleLeft, isWide && styles.ctaTitleLeftWide]}>
              Inspired by Our Stories?{"\n"}
              <Text style={{ color: colors.primaryDark }}>Bring Your Vision to Life.</Text>
            </Text>

            <Text style={styles.ctaSubLeft}>
              Connect with top-rated, KYC-audited visual storytellers across Hyderabad, Bangalore, and Andhra Pradesh.
            </Text>

            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [styles.ctaBtnOrange, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaBtnTextWhite}>Book a Shoot Now</Text>
              <ArrowRight size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>© 2025 Book A Shoot · Powered by Camartes Technologies</Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={goToHome}><Text style={styles.footerLinkText}>Home</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={goToAbout}><Text style={styles.footerLinkText}>About Us</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={goToServices}><Text style={styles.footerLinkText}>Services</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/privacy")}><Text style={styles.footerLinkText}>Privacy</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/terms")}><Text style={styles.footerLinkText}>Terms</Text></Pressable>
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
    height: 66,
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
    width: 154,
    height: 40,
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
  navPrimaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Header Section ───────────────────────────────────────────────────
  headerSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  headerSectionWide: {
    paddingHorizontal: 56,
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
    marginBottom: spacing.sm,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 34,
    fontWeight: "600",
    color: colors.primaryDark,
    textAlign: "center",
    letterSpacing: -0.5,
    maxWidth: 720,
  },
  headingWide: {
    fontSize: 44,
  },
  subheading: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 24,
    maxWidth: 640,
  },
  subheadingWide: {
    fontSize: 16,
  },

  // ── Blogs Grid ───────────────────────────────────────────────────────
  blogsGrid: {
    paddingHorizontal: spacing.xl,
    paddingTop: 40,
    gap: spacing.xxl,
    maxWidth: 1040,
    alignSelf: "center",
    width: "100%",
  },
  blogsGridWide: {
    paddingHorizontal: 56,
    flexDirection: "row",
    alignItems: "stretch",
  },
  blogCard: {
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  blogCardWide: {
    flex: 1,
  },
  cardImageFrame: {
    width: "100%",
    height: 220,
    position: "relative",
    backgroundColor: colors.bgWarm,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardTagBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  cardTagText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  cardContent: {
    padding: spacing.xl,
    gap: spacing.sm,
    flex: 1,
    justifyContent: "space-between",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: colors.muted,
  },
  metaDot: {
    color: colors.disabledText,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  cardSub: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
  },
  cardBodyPreview: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 21,
    borderLeftWidth: 2,
    borderLeftColor: colors.peachBorder,
    paddingLeft: spacing.md,
    marginTop: spacing.xs,
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },

  // ── Note Card ────────────────────────────────────────────────────────
  noteCard: {
    marginHorizontal: spacing.xl,
    marginTop: 50,
    backgroundColor: colors.bgWarm,
    borderRadius: radius,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.peachBorder,
    gap: spacing.sm,
    maxWidth: 800,
    alignSelf: "center",
  },
  noteCardWide: {
    marginHorizontal: 56,
  },
  noteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.peachBorder,
  },
  noteBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  noteTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.primaryDark,
    textAlign: "center",
  },
  noteDesc: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 600,
  },

  // ── Unified CTA Banner ───────────────────────────────────────────────
  ctaBannerWrapper: {
    position: "relative",
    overflow: "hidden",
    minHeight: 460,
    justifyContent: "center",
    marginTop: 64,
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
  ctaSubLeft: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 25,
    maxWidth: 480,
  },
  ctaBtnOrange: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingHorizontal: 28,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
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

  // ── Footer ───────────────────────────────────────────────────────────
  footer: {
    marginTop: 50,
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
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
