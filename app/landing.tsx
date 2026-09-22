/**
 * Book A Shoot — Marketing Landing Page
 *
 * The unauthenticated entry experience shown before the Login screen.
 * Replaces the previous direct-to-login routing for users without a session.
 *
 * Design updates:
 *  - Eyebrows completely removed across all sections
 *  - Flowing river lines placed at the START (top) of each Why Us card
 *  - Multi-event section redesigned: left heading, right description & button (no 4 cards)
 *  - "Bundle Events" removed from navbar
 *  - Thinner font weight for headings (fontWeight: "600")
 *  - No color scrim on cta.png; text positioned on the left
 *  - Real images from post-login app on service cards
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import Svg, { Path } from "react-native-svg";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";
import { categoryImageFor } from "@/src/constants/homeMedia";

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    id: "1",
    headline: "Every Moment\nDeserves to Be\nRemembered",
    sub: "Book 100% KYC-verified photographers & cinematographers for your special day — in minutes.",
    image:
      Platform.OS === "web"
        ? { uri: "/hero1.png" }
        : require("@/assets/images/home/home_hero_wedding.jpg"),
  },
  {
    id: "2",
    headline: "Pre-Wedding\nStories That\nLast Forever",
    sub: "Cinematic shoots, aerial drone coverage, and candid moments — matched with top studios.",
    image:
      Platform.OS === "web"
        ? { uri: "/hero2.png" }
        : require("@/assets/images/home/category_pre_wedding.jpg"),
  },
  {
    id: "3",
    headline: "Weddings,\nBirthdays &\nEvery Celebration",
    sub: "From grand wedding mandaps to intimate rituals — our verified network covers every occasion.",
    image:
      Platform.OS === "web"
        ? { uri: "/hero3.png" }
        : require("@/assets/images/home/category_wedding.jpg"),
  },
] as const;

const STATS = [
  { value: "500+", label: "KYC-Verified\nStudios" },
  { value: "10K+", label: "Celebrations\nCaptured" },
  { value: "99.4%", label: "On-Time Delivery\nGuarantee" },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Tell Us About Your Event",
    desc: "Share your event type, date, city, and required deliverables (drone, candid, video). Takes under 2 minutes.",
  },
  {
    step: "02",
    title: "Instant Smart Matchmaking",
    desc: "Our engine pairs you with verified studios near you, ranked by style, past reviews, and real-time availability.",
  },
  {
    step: "03",
    title: "Confirm & Get Captured",
    desc: "Lock your booking with milestone protection and auto-replacement assurance. Arrive on your day, relax, and celebrate.",
  },
] as const;

// Helper to get authentic post-login images
function getHomepageServiceImage(id: string) {
  if (id === "bride_making") return categoryImageFor("mehendi");
  if (id === "groom_making") return categoryImageFor("wedding");
  if (id === "sangeet") return categoryImageFor("led_wall");
  if (id === "reception") return categoryImageFor("wedding");
  if (id === "haldi") return categoryImageFor("haldi");
  if (id === "mehendi") return categoryImageFor("mehendi");
  if (id === "pooja") return categoryImageFor("pooja");
  return categoryImageFor(id);
}

// Professional Services List with real app images
const SERVICES = [
  { id: "wedding",        label: "Wedding Ceremony", tagline: "Sacred vows & grand mandap moments" },
  { id: "pre_wedding",    label: "Pre-Wedding",      tagline: "Cinematic narratives & scenic visuals" },
  { id: "bride_making",   label: "Bride Making",     tagline: "Bridal getting-ready & candid jewelry" },
  { id: "groom_making",   label: "Groom Making",     tagline: "Regal safa tying & baraat prep" },
  { id: "sangeet",        label: "Sangeet Night",    tagline: "High-energy dances & stage celebration" },
  { id: "birthday",       label: "Birthday",         tagline: "Milestone birthdays & cake smashes" },
  { id: "baby_shoot",     label: "Baby Shoot",       tagline: "Tender newborn poses & toddler joy" },
  { id: "maternity_shoot",label: "Maternity",        tagline: "Motherhood elegance & glowing grace" },
  { id: "corporate_event",label: "Corporate Summit", tagline: "Conferences, galas & executive PR" },
  { id: "product_shoot",  label: "Product & Studio", tagline: "Clean e-commerce packshots & styling" },
  { id: "pooja",          label: "Sacred Pooja",     tagline: "Auspicious Vedic rituals & homams" },
] as const;

// Selected cities only
const CITIES = ["Hyderabad", "Bangalore", "Andhra Pradesh"] as const;

// Why Book A Shoot — KYC Verified emphasized
const WHY_US = [
  {
    icon: ShieldCheck,
    title: "100% KYC-Verified Firms",
    desc: "Every studio is vetted through government identity records, GSTIN certificates, professional camera hardware audits, and past client reviews.",
  },
  {
    icon: Zap,
    title: "Instant Smart Matching",
    desc: "Get paired in seconds with available studios tailored to your aesthetic style and budget — zero awkward negotiation calls.",
  },
  {
    icon: RotateCcw,
    title: "Auto-Replacement Guarantee",
    desc: "If an assigned firm ever has an emergency or rejects within 1 hour, our automated backfill instantly pairs an equally qualified replacement.",
  },
  {
    icon: Clock,
    title: "Strict Delivery Timelines",
    desc: "Contractually guaranteed deadlines for raw rushes, curated proofs, and 4K cinematic exports with live status tracking.",
  },
] as const;

// Blog posts for homepage preview
const HOMEPAGE_BLOGS = [
  {
    id: "pre-wedding-guide",
    image:
      Platform.OS === "web"
        ? { uri: "/blog1.png" }
        : require("@/assets/images/blog1.png"),
    tag: "Cinematography & Styling",
    readTime: "4 min read",
    title: "How to Look Effortlessly Natural on Camera: The Pre-Wedding Survival Guide",
    sub: "Ditch the stiff, robotic poses. Here are 7 director-approved secrets on framing, golden-hour lighting, and moving with real emotion.",
  },
  {
    id: "elite-photographers-timeline",
    image:
      Platform.OS === "web"
        ? { uri: "/blog2.png" }
        : require("@/assets/images/blog2.png"),
    tag: "Industry Secrets",
    readTime: "6 min read",
    title: "The Real Reason Elite Wedding Photographers Get Booked 6 Months in Advance",
    sub: "Inside the wedding season rush: why booking multi-event bundles early saves your sanity and locks your favorite team's calendar.",
  },
];

// Navbar without "Bundle Events"
const NAV_ITEMS = [
  { id: "services", label: "Services" },
  { id: "how-it-works", label: "How It Works" },
  { id: "blogs", label: "Blogs" },
  { id: "about", label: "About Us" },
  { id: "partner", label: "Partner with Us" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// River Flow Lines Subcomponent (At the TOP / START of the card)
// ─────────────────────────────────────────────────────────────────────────────

function RiverFlowLines() {
  return (
    <View style={styles.riverLinesContainer} pointerEvents="none">
      <Svg width="100%" height="70" viewBox="0 0 400 70" preserveAspectRatio="none">
        {/* Upper Stream */}
        <Path
          d="M0,25 C70,5 140,55 220,20 C300,-5 350,45 400,25"
          fill="none"
          stroke={colors.primary}
          strokeWidth="2.5"
          strokeOpacity="0.22"
        />
        {/* Main Flowing River */}
        <Path
          d="M0,40 C60,18 130,68 210,35 C290,8 340,58 400,38"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.8"
          strokeOpacity="0.28"
        />
        {/* Lower Current */}
        <Path
          d="M0,52 C80,30 150,72 230,45 C310,22 360,62 400,48"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.2"
          strokeOpacity="0.16"
        />
      </Svg>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Scroll-driven navbar
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<ScrollView>(null);
  const [howItWorksY, setHowItWorksY] = useState(650);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Book A Shoot — Hire KYC-Verified Photographers & Cinematographers";
    }
  }, []);

  const navBgOpacity = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const navTextColor = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: ["rgba(255,255,255,1)", "rgba(17,24,39,1)"],
    extrapolate: "clamp",
  });
  const navBorderOpacity = scrollY.interpolate({
    inputRange: [60, 90],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Hero carousel
  const carouselRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const heroH = Math.min(660, Math.round(W * 1.12));
  const isWide = W >= 720;

  const advanceSlide = useCallback(() => {
    setActiveSlide((prev) => {
      const next = (prev + 1) % HERO_SLIDES.length;
      carouselRef.current?.scrollTo({ x: W * next, animated: true });
      return next;
    });
  }, [W]);

  const resetAutoPlay = useCallback(() => {
    clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(advanceSlide, 4800);
  }, [advanceSlide]);

  useEffect(() => {
    resetAutoPlay();
    return () => clearInterval(autoPlayRef.current);
  }, [resetAutoPlay]);

  const onCarouselScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveSlide(idx);
    resetAutoPlay();
  };

  const goToLogin = () => router.push("/(auth)/login");
  const goToServices = () => router.push("/services");
  const goToAbout = () => router.push("/about");
  const goToBlogs = () => router.push("/blogs");
  const openPartner = () => Linking.openURL("https://camartes.com");

  const handleNavClick = (id: string) => {
    if (id === "services") {
      goToServices();
    } else if (id === "about") {
      goToAbout();
    } else if (id === "blogs") {
      goToBlogs();
    } else if (id === "partner") {
      openPartner();
    } else if (id === "how-it-works") {
      mainScrollRef.current?.scrollTo({ y: howItWorksY - 70, animated: true });
    }
  };

  const renderHeroSlide = (slide: (typeof HERO_SLIDES)[number], idx: number) => (
    <View key={slide.id} style={[styles.heroSlide, { width: W, height: heroH }]}>
      <Image source={slide.image} style={styles.heroImg} resizeMode="cover" />
      <View style={styles.heroScrim} />
      <View
        style={[
          styles.heroContent,
          {
            paddingTop: insets.top + 76,
            paddingHorizontal: isWide ? 56 : spacing.xl,
          },
        ]}
      >
        <Text style={[styles.heroHeadline, isWide && styles.heroHeadlineWide]}>
          {slide.headline}
        </Text>
        <Text style={[styles.heroSub, isWide && { maxWidth: 440 }]}>{slide.sub}</Text>
        <View style={styles.heroCtas}>
          <Pressable
            id={`hero-book-now-${idx}`}
            onPress={goToLogin}
            style={({ pressed }) => [styles.heroPrimaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Book a photographer now"
          >
            <Text style={styles.heroPrimaryText}>Book Now</Text>
            <ArrowRight size={18} color={colors.white} />
          </Pressable>
          <Pressable
            id={`hero-how-it-works-${idx}`}
            onPress={() => handleNavClick("how-it-works")}
            style={({ pressed }) => [styles.heroGhostBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Learn how it works"
          >
            <Text style={styles.heroGhostText}>How it works</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* ── Floating Navbar ─────────────────────────────────────────────── */}
      <View style={[styles.navbar, { paddingTop: insets.top }]}>
        <Animated.View
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
            styles.navBgLayer,
            { opacity: navBgOpacity },
          ]}
        />
        <Animated.View style={[styles.navBorder, { opacity: navBorderOpacity }]} />

        <View style={[styles.navInner, isWide && styles.navInnerWide]}>
          {/* Logo */}
          <Pressable
            id="nav-logo"
            onPress={() => mainScrollRef.current?.scrollTo({ y: 0, animated: true })}
            accessibilityRole="link"
            accessibilityLabel="Book A Shoot home"
          >
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={styles.navLogo}
              resizeMode="contain"
              accessibilityLabel="Book A Shoot"
            />
          </Pressable>

          {/* Wide nav links — "Bundle Events" removed */}
          {isWide && (
            <View style={styles.navLinks}>
              {NAV_ITEMS.map((item) => (
                <Pressable
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onPress={() => handleNavClick(item.id)}
                  style={styles.navLink}
                  accessibilityRole="link"
                >
                  <Animated.Text style={[styles.navLinkText, { color: navTextColor }]}>
                    {item.label}
                  </Animated.Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Auth CTAs */}
          <View style={styles.navActions}>
            <Pressable
              id="nav-login-btn"
              onPress={goToLogin}
              style={({ pressed }) => [styles.navLoginBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              <Animated.Text style={[styles.navLoginText, { color: navTextColor }]}>
                Log in
              </Animated.Text>
            </Pressable>
            <Pressable
              id="nav-book-btn"
              onPress={goToLogin}
              style={({ pressed }) => [styles.navBookBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Book Now"
            >
              <Text style={styles.navBookText}>Book Now</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Main Scroll ─────────────────────────────────────────────────── */}
      <Animated.ScrollView
        ref={mainScrollRef as any}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
      >
        {/* ── HERO CAROUSEL ─────────────────────────────────────────── */}
        <View style={{ height: heroH }}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onCarouselScrollEnd}
            style={{ width: W, height: heroH }}
            contentContainerStyle={{ width: W * HERO_SLIDES.length }}
          >
            {HERO_SLIDES.map((slide, idx) => renderHeroSlide(slide, idx))}
          </ScrollView>
          {/* Dot indicators */}
          <View style={styles.dotRow}>
            {HERO_SLIDES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  carouselRef.current?.scrollTo({ x: W * i, animated: true });
                  setActiveSlide(i);
                  resetAutoPlay();
                }}
                style={[styles.dot, i === activeSlide && styles.dotActive]}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${i + 1}`}
              />
            ))}
          </View>
        </View>

        {/* ── STATS STRIP ───────────────────────────────────────────── */}
        <View style={styles.statsStrip}>
          {STATS.map((s, i) => (
            <View
              key={s.label}
              style={[styles.statItem, i < STATS.length - 1 && styles.statDivider]}
            >
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── HOW IT WORKS (Eyebrow Removed) ────────────────────────── */}
        <View
          style={[styles.section, isWide && styles.sectionWide]}
          onLayout={(e) => setHowItWorksY(e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>How Book A Shoot Works</Text>
            <Text style={styles.sectionSub}>
              From event details to beautifully captured memories — in three simple steps.
            </Text>
          </View>

          <View style={[styles.stepsRow, isWide && styles.stepsRowWide]}>
            {HOW_IT_WORKS.map((s) => (
              <View key={s.step} style={[styles.stepCard, isWide && styles.stepCardWide]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{s.step}</Text>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── SERVICES (Eyebrow Removed, Real App Images) ───────────── */}
        <View style={styles.servicesSection}>
          <View style={[styles.sectionHead, { paddingHorizontal: isWide ? 56 : spacing.xl }]}>
            <Text style={[styles.sectionTitle, styles.titleLight]}>
              Every Occasion, Captured Professionally
            </Text>
            <Text style={[styles.sectionSub, styles.subLight]}>
              From intimate rituals like Bride Making to grand multi-day celebrations — our verified studios cover every event.
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.servicesScroll,
              { paddingHorizontal: isWide ? 56 : spacing.xl },
            ]}
          >
            {SERVICES.map((svc) => (
              <Pressable
                key={svc.id}
                id={`service-card-${svc.id}`}
                onPress={goToServices}
                style={({ pressed }) => [styles.serviceCardWithImage, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`View ${svc.label} photography details`}
              >
                {/* Real image from post-login app */}
                <View style={styles.serviceImageFrame}>
                  <Image
                    source={getHomepageServiceImage(svc.id)}
                    style={styles.serviceCoverImg}
                    resizeMode="cover"
                  />
                  <View style={styles.serviceImageScrim} />
                </View>

                <Text style={styles.serviceLabel}>{svc.label}</Text>
                <Text style={styles.serviceTagline}>{svc.tagline}</Text>
                <View style={styles.serviceArrowRow}>
                  <Text style={styles.serviceArrowText}>Details</Text>
                  <ArrowRight size={14} color="rgba(255,255,255,0.85)" />
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* View All Services Button */}
          <View style={styles.viewAllServicesWrap}>
            <Pressable
              id="view-all-services-btn"
              onPress={goToServices}
              style={({ pressed }) => [styles.viewAllServicesBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="View all event services"
            >
              <Text style={styles.viewAllServicesText}>View All Event Services</Text>
              <ArrowRight size={16} color={colors.primaryDark} />
            </Pressable>
          </View>
        </View>

        {/* ── MULTI-EVENT SECTION (Redesigned: Left Heading, Right Description & Button; No 4 Cards) ── */}
        <View style={[styles.multiEventSection, isWide && styles.multiEventSectionWide]}>
          <View style={[styles.multiEventCard, isWide && styles.multiEventCardWide]}>
            <View style={[styles.multiEventRow, isWide && styles.multiEventRowWide]}>
              {/* Left Column: Heading */}
              <View style={[styles.multiEventLeft, isWide && styles.multiEventLeftWide]}>
                <Text style={[styles.multiEventHeadline, isWide && styles.multiEventHeadlineWide]}>
                  Why Fall in Love for Just One Night?{"\n"}
                  <Text style={{ color: colors.primaryDark }}>Lock Us Down for the Whole Season.</Text>
                </Text>
              </View>

              {/* Right Column: Clear Description & Button */}
              <View style={[styles.multiEventRight, isWide && styles.multiEventRightWide]}>
                <Text style={styles.multiEventSub}>
                  Not just one event. From your secret sunset proposal and sun-drenched Haldi to the 3 AM Sangeet
                  dance battles and the grand wedding pheras — why play the field with different vendors?
                  {"\n\n"}
                  Bundle your celebrations together to lock the exact same elite photography and cinematography crew
                  across every event. Enjoy unified multi-event bundle pricing, consistent signature color science,
                  and guarantee that your favorite studio is exclusively yours in your city.
                </Text>

                <Pressable
                  id="bundle-events-cta-btn"
                  onPress={goToLogin}
                  style={({ pressed }) => [styles.multiEventBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.multiEventBtnText}>Bundle Your Events & Lock Your Crew</Text>
                  <ArrowRight size={18} color={colors.white} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* ── WHY CHOOSE US (Orange Heading, Eyebrow Removed, River Lines at TOP/START) ── */}
        <View style={[styles.section, isWide && styles.sectionWide]}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, styles.sectionTitleOrange]}>
              Why Book A Shoot
            </Text>
            <Text style={styles.sectionSub}>
              We've re-engineered event photography booking from the ground up with 100% KYC-verified firms and zero cancellation risk.
            </Text>
          </View>

          <View style={[styles.whyGrid, isWide && styles.whyGridWide]}>
            {WHY_US.map((w) => {
              const IconComp = w.icon;
              return (
                <View key={w.title} style={[styles.whyCard, isWide && styles.whyCardWide]}>
                  {/* River-like flowing lines placed at the START (top) of the card */}
                  <RiverFlowLines />

                  <View style={styles.whyIconWrap}>
                    <IconComp size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.whyTitle}>{w.title}</Text>
                  <Text style={styles.whyDesc}>{w.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── CITIES (Orange Section) ─────── */}
        <View style={styles.citiesSectionDistinct}>
          <View style={[styles.citiesInner, isWide && styles.sectionWide]}>
            <View style={styles.sectionHead}>
              <Text style={styles.citiesTitleOnOrange}>
                Available in Top Destinations
              </Text>
              <Text style={styles.citiesSubOnOrange}>
                Serving clients across premier wedding and celebration hubs with dedicated local studios.
              </Text>
            </View>

            <View style={styles.citiesGrid}>
              {CITIES.map((city) => (
                <Pressable
                  key={city}
                  id={`city-chip-${city.toLowerCase().replace(/ /g, "-")}`}
                  onPress={goToLogin}
                  style={({ pressed }) => [styles.cityChipOnOrange, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Book photographers in ${city}`}
                >
                  <MapPin size={18} color={colors.primaryDark} />
                  <Text style={styles.cityNameOnOrange}>{city}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── BLOG SECTION (Eyebrow Removed, blog1.png and blog2.png) ── */}
        <View style={[styles.blogSection, isWide && styles.sectionWide]}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, styles.sectionTitleOrange]}>
              Stories, Guides & Behind-the-Lens Insights
            </Text>
            <Text style={styles.sectionSub}>
              Insider planning secrets, camera techniques, and styling ideas straight from India's elite photographers.
            </Text>
          </View>

          <View style={[styles.blogCardsRow, isWide && styles.blogCardsRowWide]}>
            {HOMEPAGE_BLOGS.map((blog) => (
              <Pressable
                key={blog.id}
                onPress={goToBlogs}
                style={({ pressed }) => [styles.homepageBlogCard, isWide && styles.homepageBlogCardWide, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <View style={styles.homepageBlogImgFrame}>
                  <Image source={blog.image} style={styles.homepageBlogImg} resizeMode="cover" />
                  <View style={styles.blogTagOverlay}>
                    <Text style={styles.blogTagText}>{blog.tag}</Text>
                  </View>
                </View>
                <View style={styles.homepageBlogBody}>
                  <View style={styles.blogMetaRow}>
                    <Clock size={12} color={colors.muted} />
                    <Text style={styles.blogMetaText}>{blog.readTime}</Text>
                  </View>
                  <Text style={styles.homepageBlogTitle}>{blog.title}</Text>
                  <Text style={styles.homepageBlogSub}>{blog.sub}</Text>
                  <View style={styles.readArticleRow}>
                    <Text style={styles.readArticleText}>Read Story</Text>
                    <ArrowRight size={14} color={colors.primaryDark} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.viewAllBlogsWrap}>
            <Pressable
              id="view-all-blogs-btn"
              onPress={goToBlogs}
              style={({ pressed }) => [styles.viewAllBlogsBtn, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.viewAllBlogsText}>View All Blogs & Insights</Text>
              <ArrowRight size={16} color={colors.primaryDark} />
            </Pressable>
          </View>
        </View>

        {/* ── LAST SECTION: CTA BANNER (cta.png as Whole Background Image, NO COLOR COVER LAYER, Left-Aligned) ── */}
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

          {/* No color scrim or cover layer — image displayed as is */}
          <View style={[styles.ctaLeftContainer, isWide && styles.ctaLeftContainerWide]}>
            <Text style={[styles.ctaTitleLeft, isWide && styles.ctaTitleLeftWide]}>
              Ready to Book Your{"\n"}
              <Text style={{ color: colors.primaryDark }}>Verified Photographer?</Text>
            </Text>

            <Text style={styles.ctaSubLeft}>
              Join thousands of families and businesses who trust Book A Shoot for life's most precious celebrations.
            </Text>

            <Pressable
              id="cta-banner-get-started"
              onPress={goToLogin}
              style={({ pressed }) => [styles.ctaBtnOrange, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Get started with Book A Shoot"
            >
              <Text style={styles.ctaBtnTextWhite}>Get Started Free</Text>
              <ArrowRight size={18} color={colors.white} />
            </Pressable>

            <Text style={styles.ctaDisclaimerLeft}>
              100% KYC-Verified Studios · Automated Replacement Guarantee · Transparent Escrow
            </Text>
          </View>
        </View>

        {/* ── FOOTER (Partner takes to camartes.com, Real Links) ────────── */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + spacing.xl, 36) },
            isWide && styles.footerWide,
          ]}
        >
          <View style={styles.footerBrand}>
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={styles.footerLogo}
              resizeMode="contain"
              accessibilityLabel="Book A Shoot"
            />
            <Text style={styles.footerTagline}>
              India's trusted platform for booking{"\n"}verified photographers & videographers.
            </Text>
          </View>

          {/* Footer Navigation Links */}
          <View style={[styles.footerLinks, isWide && styles.footerLinksWide]}>
            <Pressable
              id="footer-about"
              onPress={goToAbout}
              style={styles.footerLink}
              accessibilityRole="link"
            >
              <Text style={styles.footerLinkText}>About Us</Text>
            </Pressable>

            <Pressable
              id="footer-services"
              onPress={goToServices}
              style={styles.footerLink}
              accessibilityRole="link"
            >
              <Text style={styles.footerLinkText}>Services</Text>
            </Pressable>

            <Pressable
              id="footer-blogs"
              onPress={goToBlogs}
              style={styles.footerLink}
              accessibilityRole="link"
            >
              <Text style={styles.footerLinkText}>Blogs</Text>
            </Pressable>

            <Pressable
              id="footer-partner"
              onPress={openPartner}
              style={styles.footerLink}
              accessibilityRole="link"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.footerLinkText}>Partner with Us</Text>
                <ExternalLink size={12} color={colors.primaryDark} />
              </View>
            </Pressable>

            <Pressable
              id="footer-privacy"
              onPress={() => router.push("/privacy")}
              style={styles.footerLink}
              accessibilityRole="link"
            >
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </Pressable>

            <Pressable
              id="footer-terms"
              onPress={() => router.push("/terms")}
              style={styles.footerLink}
              accessibilityRole="link"
            >
              <Text style={styles.footerLinkText}>Terms of Service</Text>
            </Pressable>
          </View>

          <View style={styles.footerDivider} />
          <Text style={styles.copyright}>© 2025 Book A Shoot · Powered by Camartes Technologies</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },

  // ── Navbar ─────────────────────────────────────────────────────────────

  navbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  navBgLayer: {
    backgroundColor: colors.bg,
  },
  navBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  navInner: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
  },
  navInnerWide: {
    paddingHorizontal: 56,
  },
  navLogo: {
    width: 154,
    height: 40,
  },
  navLinks: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  navLink: {
    paddingVertical: spacing.sm,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  navLoginBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navLoginText: {
    fontSize: 14,
    fontWeight: "600",
  },
  navBookBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius,
  },
  navBookText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Hero ───────────────────────────────────────────────────────────────

  heroSlide: {
    overflow: "hidden",
  },
  heroImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,5,0,0.46)",
  },
  heroContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
  },
  heroHeadline: {
    fontSize: 38,
    fontWeight: "600",
    color: colors.white,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  heroHeadlineWide: {
    fontSize: 54,
    lineHeight: 66,
  },
  heroSub: {
    fontSize: 16,
    color: "rgba(255,255,255,0.86)",
    marginTop: spacing.md,
    lineHeight: 25,
    maxWidth: 360,
  },
  heroCtas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  heroPrimaryBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius,
  },
  heroPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroGhostBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
  },
  heroGhostText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  dotRow: {
    position: "absolute",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.38)",
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 26,
    borderRadius: 4,
  },

  // ── Stats ──────────────────────────────────────────────────────────────

  statsStrip: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 17,
  },

  // ── Generic Section Chrome ─────────────────────────────────────────────

  section: {
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
  },
  sectionWide: {
    paddingHorizontal: 56,
  },
  sectionHead: {
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  sectionTitleOrange: {
    color: colors.primaryDark,
  },
  titleLight: {
    color: colors.white,
  },
  sectionSub: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 480,
  },
  subLight: {
    color: "rgba(255,255,255,0.85)",
  },

  // ── Steps ─────────────────────────────────────────────────────────────

  stepsRow: {
    gap: spacing.md,
  },
  stepsRowWide: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  stepCard: {
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  stepCardWide: {
    flex: 1,
  },
  stepBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  stepBadgeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 25,
  },
  stepDesc: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
  },

  // ── Services Section ──────────────────────────────────────────────────

  servicesSection: {
    paddingVertical: 60,
    backgroundColor: colors.primary,
  },
  servicesScroll: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  serviceCardWithImage: {
    width: 210,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  serviceImageFrame: {
    width: "100%",
    height: 120,
    borderRadius: radiusSm,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.2)",
    marginBottom: spacing.xs,
  },
  serviceCoverImg: {
    width: "100%",
    height: "100%",
  },
  serviceImageScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 5, 0, 0.22)",
  },
  serviceLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.white,
  },
  serviceTagline: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 17,
  },
  serviceArrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  serviceArrowText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  viewAllServicesWrap: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  viewAllServicesBtn: {
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  viewAllServicesText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Multi-Event Section (Redesigned: 2-Column Row without 4 cards) ─────

  multiEventSection: {
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
  },
  multiEventSectionWide: {
    paddingHorizontal: 56,
  },
  multiEventCard: {
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    maxWidth: 1040,
    alignSelf: "center",
    width: "100%",
  },
  multiEventCardWide: {
    padding: 40,
  },
  multiEventRow: {
    gap: spacing.xl,
  },
  multiEventRowWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  multiEventLeft: {
    width: "100%",
  },
  multiEventLeftWide: {
    width: "45%",
  },
  multiEventHeadline: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  multiEventHeadlineWide: {
    fontSize: 36,
    lineHeight: 46,
  },
  multiEventRight: {
    width: "100%",
    gap: spacing.lg,
  },
  multiEventRightWide: {
    width: "50%",
  },
  multiEventSub: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 24,
  },
  multiEventBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: radius,
    alignSelf: "flex-start",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  multiEventBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Why Us (River Flow Lines at Top) ──────────────────────────────────

  whyGrid: {
    gap: spacing.lg,
  },
  whyGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  whyCard: {
    position: "relative",
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: spacing.xl,
    paddingTop: 36,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  whyCardWide: {
    width: "48%",
    flexGrow: 1,
    minWidth: 260,
  },
  riverLinesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    overflow: "hidden",
  },
  whyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bgWarm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    zIndex: 2,
  },
  whyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 25,
    zIndex: 2,
  },
  whyDesc: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
    zIndex: 2,
  },

  // ── Cities (Orange Section) ──────────────────────────────────────────

  citiesSectionDistinct: {
    paddingVertical: 72,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primaryDark,
  },
  citiesInner: {
    alignSelf: "center",
    width: "100%",
  },
  citiesTitleOnOrange: {
    fontSize: 30,
    fontWeight: "600",
    color: colors.white,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  citiesSubOnOrange: {
    fontSize: 16,
    color: "#ffedd5",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 640,
    alignSelf: "center",
  },
  citiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: 32,
  },
  cityChipOnOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cityNameOnOrange: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  // ── Blog Section ──────────────────────────────────────────────────────

  blogSection: {
    paddingTop: 72,
    paddingBottom: 120, // Generous breathing space after blogs
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
  },
  blogCardsRow: {
    gap: spacing.xl,
    maxWidth: 1040,
    alignSelf: "center",
    width: "100%",
  },
  blogCardsRowWide: {
    flexDirection: "row",
  },
  homepageBlogCard: {
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  homepageBlogCardWide: {
    flex: 1,
  },
  homepageBlogImgFrame: {
    width: "100%",
    height: 200,
    position: "relative",
    backgroundColor: colors.bgWarm,
  },
  homepageBlogImg: {
    width: "100%",
    height: "100%",
  },
  blogTagOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  blogTagText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
  homepageBlogBody: {
    padding: spacing.lg,
    gap: 6,
  },
  blogMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  blogMetaText: {
    fontSize: 12,
    color: colors.muted,
  },
  homepageBlogTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 25,
  },
  homepageBlogSub: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
  readArticleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  readArticleText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  viewAllBlogsWrap: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  viewAllBlogsBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: radius,
  },
  viewAllBlogsText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Last Section: CTA Banner (cta.png as Whole Background, NO COVER LAYER, Left-Aligned) ──

  ctaBannerWrapper: {
    position: "relative",
    overflow: "hidden",
    minHeight: 460,
    justifyContent: "center",
    paddingVertical: 72,
    paddingHorizontal: spacing.xl,
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
    maxWidth: 580,
    alignItems: "flex-start",
    zIndex: 2,
    gap: spacing.md,
  },
  ctaLeftContainerWide: {
    paddingLeft: 48,
    maxWidth: 640,
  },
  ctaTitleLeft: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.text,
    textAlign: "left",
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  ctaTitleLeftWide: {
    fontSize: 44,
    lineHeight: 54,
  },
  ctaSubLeft: {
    fontSize: 16,
    color: colors.text,
    textAlign: "left",
    lineHeight: 24,
    maxWidth: 480,
  },
  ctaBtnOrange: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: radius,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaBtnTextWhite: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ctaDisclaimerLeft: {
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: "left",
  },

  // ── Footer ────────────────────────────────────────────────────────────

  footer: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 40,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    alignItems: "center",
  },
  footerWide: {
    paddingHorizontal: 56,
  },
  footerBrand: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  footerLogo: {
    width: 120,
    height: 32,
  },
  footerTagline: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  footerLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
  },
  footerLinksWide: {
    gap: spacing.xl,
  },
  footerLink: {
    paddingVertical: spacing.xs,
  },
  footerLinkText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "600",
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.border,
    alignSelf: "stretch",
    marginTop: spacing.sm,
  },
  copyright: {
    fontSize: 12,
    color: colors.disabledText,
    marginBottom: spacing.sm,
  },

  // ── Shared ────────────────────────────────────────────────────────────

  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.975 }],
  },
});
