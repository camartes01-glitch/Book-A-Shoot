/**
 * Book A Shoot — Dedicated Event Services Page
 *
 * Professional catalog of all event photography and cinematography services
 * including Bride Making, Groom Making, Sangeet, Weddings, Corporate, and Poojas.
 * Features real images from the application, real-time search, category filtering,
 * and custom event booking.
 */

import React, { useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Heart,
  Music,
  PartyPopper,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Video,
  Wand2,
  X,
} from "lucide-react-native";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";
import { categoryImageFor } from "@/src/constants/homeMedia";

interface ServiceItem {
  id: string;
  category: "wedding" | "personal" | "commercial" | "pooja";
  title: string;
  tagline: string;
  desc: string;
  icon: any;
  badges: string[];
}

function getServiceImage(id: string) {
  if (id === "bride_making") return categoryImageFor("mehendi");
  if (id === "groom_making") return categoryImageFor("wedding");
  if (id === "sangeet") return categoryImageFor("led_wall");
  if (id === "reception") return categoryImageFor("wedding");
  if (id === "engagement") return categoryImageFor("wedding");
  if (id === "haldi") return categoryImageFor("haldi");
  if (id === "mehendi") return categoryImageFor("mehendi");
  if (id === "anniversary") return categoryImageFor("birthday");
  if (id === "housewarming") return categoryImageFor("corporate_event");
  if (id === "fashion_shoot") return categoryImageFor("corporate_event");
  if (id === "sacred_pooja") return categoryImageFor("pooja");
  return categoryImageFor(id);
}

const ALL_SERVICES: ServiceItem[] = [
  {
    id: "bride_making",
    category: "wedding",
    title: "Bride Making",
    tagline: "Bridal getting-ready, jewelry & candid moments",
    desc: "Detailed close-ups of bridal attire, intricate jewelry, makeup artistry, and intimate emotional moments with family before stepping to the mandap.",
    icon: Sparkles,
    badges: ["Candid Specialists", "Detail Shots", "KYC Verified"],
  },
  {
    id: "groom_making",
    category: "wedding",
    title: "Groom Making",
    tagline: "Groom styling, safa tying & family traditions",
    desc: "Capturing the regal transformation of the groom — safa tying, sherwani styling, blessing rituals, and high-energy baraat preparation.",
    icon: Crown,
    badges: ["Editorial Portraits", "Baraat Ready", "KYC Verified"],
  },
  {
    id: "sangeet",
    category: "wedding",
    title: "Sangeet & Musical Night",
    tagline: "High-energy dance floors, stage performances & musical revelry",
    desc: "Dynamic low-light action photography, multi-camera stage coverage, live audio recording, and candid crowd celebration captures.",
    icon: Music,
    badges: ["Low-Light Optics", "Multi-Angle Video", "KYC Verified"],
  },
  {
    id: "wedding",
    category: "wedding",
    title: "Wedding Ceremony",
    tagline: "Sacred pheras, muhurtham & timeless matrimonial vows",
    desc: "Comprehensive coverage of your main ceremony: traditional rituals, candid guest tears and smiles, cinematic mandap compositions, and couple portraits.",
    icon: Heart,
    badges: ["Traditional + Candid", "4K Video", "Drone Available"],
  },
  {
    id: "pre_wedding",
    category: "wedding",
    title: "Pre-Wedding Shoot",
    tagline: "Cinematic love stories in picturesque scenic locations",
    desc: "Romantic storytelling with editorial direction, aerial drone vistas, cinematic slow-motion reels, and customized narrative concepts.",
    icon: Video,
    badges: ["Aerial Drone", "Cinematic Teaser", "Concept Styling"],
  },
  {
    id: "haldi",
    category: "wedding",
    title: "Haldi Ceremony",
    tagline: "Vibrant yellow splashes, laughter & festive showers",
    desc: "Fast-shutter candid coverage capturing genuine joy, turmeric flower showers, fun family banter, and vibrant color palettes.",
    icon: Sparkles,
    badges: ["Fast Shutter", "Color Grading", "KYC Verified"],
  },
  {
    id: "mehendi",
    category: "wedding",
    title: "Mehendi Ceremony",
    tagline: "Intricate henna artistry & joyful musical celebrations",
    desc: "Macro lens detail captures of bridal mehendi patterns, ambient decor, portraiture with bridesmaids, and festive candid joy.",
    icon: Wand2,
    badges: ["Macro Details", "Storyline Photos", "KYC Verified"],
  },
  {
    id: "reception",
    category: "wedding",
    title: "Wedding Reception",
    tagline: "Grand walk-ins, stage portraits & royal elegance",
    desc: "Red-carpet grand entrance, stage family portraits, elegant evening ambience, and guest interaction reels with synchronized flash photography.",
    icon: PartyPopper,
    badges: ["Stage Lighting", "Guest Portraits", "Instant Teasers"],
  },
  {
    id: "engagement",
    category: "wedding",
    title: "Engagement & Ring Ceremony",
    tagline: "Promise of a lifetime & formal celebration",
    desc: "Ring exchange macro photography, formal stage portraits, couple candid shots, and family celebration documentation.",
    icon: Sparkles,
    badges: ["Ring Macro", "Candid Moments", "KYC Verified"],
  },
  {
    id: "birthday",
    category: "personal",
    title: "Birthday Celebration",
    tagline: "Cake cutting, party themes & milestone ages",
    desc: "From 1st birthday cake smashes to milestone 25th, 50th, and 60th celebrations — capture the festive party vibe, theme decor, and happy faces.",
    icon: PartyPopper,
    badges: ["Theme Decor", "Kids & Family", "Quick Turnaround"],
  },
  {
    id: "baby_shoot",
    category: "personal",
    title: "Baby Shoot & Newborn",
    tagline: "Gentle newborn portraits & playful toddler milestones",
    desc: "Safe, sanitized, temperature-controlled studio or home setups with gentle lighting, cute themed props, and tender parent-child portraits.",
    icon: Sparkles,
    badges: ["Safe Studio Setups", "Patience-First", "High-Res Album"],
  },
  {
    id: "maternity_shoot",
    category: "personal",
    title: "Maternity Shoot",
    tagline: "The glowing elegance of motherhood & parenthood",
    desc: "Artistic, graceful maternity portraits in indoor luxury studios or golden-hour outdoor settings, celebrating the anticipation of new life.",
    icon: Heart,
    badges: ["Editorial Lighting", "Outdoor/Studio", "Couple Poses"],
  },
  {
    id: "housewarming",
    category: "personal",
    title: "Housewarming & Gruhapravesam",
    tagline: "Blessings, holy rituals & memories of your dream home",
    desc: "Vastu pooja rituals, milk boiling ceremony, architectural wide-angle captures of your new home, and family celebration portraits.",
    icon: Sparkles,
    badges: ["Architectural Renders", "Pooja Rituals", "KYC Verified"],
  },
  {
    id: "anniversary",
    category: "personal",
    title: "Anniversary Celebration",
    tagline: "Honoring years of love, companionship & memories",
    desc: "Milestone silver/golden jubilee portraits, vow renewals, multi-generational family group shots, and commemorative photo keepsakes.",
    icon: Heart,
    badges: ["Multi-Gen Portraits", "Family Heritage", "KYC Verified"],
  },
  {
    id: "corporate_event",
    category: "commercial",
    title: "Corporate Conferences & Summits",
    tagline: "Keynote speeches, networking sessions & annual summits",
    desc: "Professional unobtrusive coverage of corporate keynotes, panel discussions, awards ceremonies, leadership portraits, and brand signage.",
    icon: Briefcase,
    badges: ["Executive Headshots", "High Dynamic Range", "Same-Day PR Pics"],
  },
  {
    id: "product_shoot",
    category: "commercial",
    title: "Product & E-Commerce",
    tagline: "High-resolution packshots & stylized lifestyle visuals",
    desc: "Clean studio white-background packshots, flat-lays, and stylized commercial lifestyle photography optimized for Amazon, Shopify, and catalogs.",
    icon: ShoppingBag,
    badges: ["Color Accuracy", "Studio Strobes", "Commercial Rights"],
  },
  {
    id: "fashion_shoot",
    category: "commercial",
    title: "Fashion & Model Portfolios",
    tagline: "Editorial lookbooks, model composites & apparel launches",
    desc: "High-fashion lookbook shoots, model portfolio building, lookbook cataloging, and social media reels with high-end beauty retouching.",
    icon: Camera,
    badges: ["Beauty Retouching", "Stylized Concept", "Agency Specs"],
  },
  {
    id: "sacred_pooja",
    category: "pooja",
    title: "Traditional Pooja Ceremonies",
    tagline: "Satyanarayan, Ganesh, Varalakshmi & festival rituals",
    desc: "Auspicious ceremony documentation with respectful distance, capturing Vedic rituals, sacred fire homams, ornate deity decor, and prasad distribution.",
    icon: Flame,
    badges: ["Traditional Knowledge", "Non-Disruptive", "KYC Verified"],
  },
];

const CATEGORIES = [
  { key: "all", label: "All Events" },
  { key: "wedding", label: "Weddings & Celebrations" },
  { key: "personal", label: "Personal & Family" },
  { key: "commercial", label: "Commercial & Fashion" },
  { key: "pooja", label: "Sacred Poojas" },
] as const;

export default function ServicesPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const goToLogin = () => router.push("/(auth)/login");
  const goToHome = () => router.push("/landing");
  const goToAbout = () => router.push("/about");

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Event Photography Services & Cinematography — Book A Shoot";
    }
  }, []);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_SERVICES.filter((svc) => {
      const matchCat = selectedCategory === "all" || svc.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        svc.title.toLowerCase().includes(q) ||
        svc.tagline.toLowerCase().includes(q) ||
        svc.desc.toLowerCase().includes(q) ||
        svc.badges.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

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
              onPress={goToAbout}
              style={({ pressed }) => [styles.navGhostBtn, pressed && styles.pressed]}
              accessibilityRole="link"
            >
              <Text style={styles.navGhostText}>About</Text>
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
            <Sparkles size={14} color={colors.primaryDark} />
            <Text style={styles.pillText}>Complete Service Catalog</Text>
          </View>
          <Text style={[styles.heading, isWide && styles.headingWide]}>
            Dedicated Event Services
          </Text>
          <Text style={[styles.subheading, isWide && styles.subheadingWide]}>
            From intimate rituals like Bride & Groom making to high-energy Sangeets and grand
            multiday weddings, explore verified coverage tailored to your celebration.
          </Text>

          {/* ── Search Bar ────────────────────────────────────────────── */}
          <View style={[styles.searchBox, isWide && styles.searchBoxWide]}>
            <Search size={20} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search event type (e.g. Sangeet, Bride making, Wedding...)"
              placeholderTextColor={colors.disabledText}
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
                <X size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>

          {/* ── Category Tabs ─────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.resultsInfoRow}>
            <Text style={styles.resultsCount}>
              Showing <Text style={{ fontWeight: "700", color: colors.primaryDark }}>{filteredServices.length}</Text> event services
            </Text>
            {searchQuery.trim().length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Text style={styles.clearFiltersText}>Reset search</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Services Grid ─────────────────────────────────────────────── */}
        <View style={[styles.gridContainer, isWide && styles.gridContainerWide]}>
          {filteredServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Search size={36} color={colors.muted} />
              <Text style={styles.emptyTitle}>No Matching Event Found</Text>
              <Text style={styles.emptySub}>
                We couldn't find an exact match for "{searchQuery}". But don't worry — we customize shoots for any event! Check our Custom Event option below.
              </Text>
            </View>
          ) : (
            filteredServices.map((svc) => {
              const IconComp = svc.icon;
              return (
                <View key={svc.id} style={[styles.serviceCard, isWide && styles.serviceCardWide]}>
                  {/* Real Image from Application */}
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={getServiceImage(svc.id)}
                      style={styles.cardCoverImage}
                      resizeMode="cover"
                    />
                    <View style={styles.cardImageScrim} />
                    <View style={styles.cardIconFloating}>
                      <IconComp size={16} color={colors.white} />
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{svc.title}</Text>
                  <Text style={styles.cardTagline}>{svc.tagline}</Text>
                  <Text style={styles.cardDesc}>{svc.desc}</Text>

                  {/* Action CTA */}
                  <Pressable
                    onPress={goToLogin}
                    style={({ pressed }) => [styles.cardBookBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Book ${svc.title}`}
                  >
                    <Text style={styles.cardBookText}>Book This Event</Text>
                    <ChevronRight size={16} color={colors.primaryDark} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* ── SPECIAL MARKETING SECTION: CUSTOM EVENTS ───────────────────── */}
        <View style={[styles.customEventSection, isWide && styles.customEventSectionWide]}>
          <View style={styles.customEventCard}>
            <View style={styles.customEventPill}>
              <Sparkles size={14} color={colors.white} />
              <Text style={styles.customEventPillText}>Bespoke & Custom Celebrations</Text>
            </View>

            <Text style={styles.customEventTitle}>
              Your Event Not Listed? Don't Worry — We Do Custom Events!
            </Text>

            <Text style={styles.customEventDesc}>
              Whether you're planning an intimate destination vow exchange, an indie film set, a multi-day
              traditional ritual, an automotive rally, or a bespoke creative concept — we've got you covered.
              {"\n\n"}
              Simply log in, select <Text style={styles.customEventHighlight}>"Custom Event"</Text>, and tell us
              your specific schedule, dates, and deliverable needs. That's it! Our intelligent matching engine
              instantly matches you with the finest, 100% KYC-verified photography and cinematography studios
              tailored specifically to your vision.
            </Text>

            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [styles.customEventBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Book a custom event"
            >
              <Text style={styles.customEventBtnText}>Create Custom Event Booking</Text>
              <ArrowRight size={18} color={colors.primaryDark} />
            </Pressable>
          </View>
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
              Found Your Event?{"\n"}
              <Text style={{ color: colors.primaryDark }}>Lock Your Verified Studio.</Text>
            </Text>

            <Text style={styles.ctaSubLeft}>
              Reserve top KYC-verified cinematographers and photographers with guaranteed milestone escrow.
            </Text>

            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [styles.ctaBtnOrange, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaBtnTextWhite}>Start Your Booking</Text>
              <ArrowRight size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Image
            source={require("@/assets/images/book-a-shoot-wordmark.png")}
            style={styles.footerLogo}
            resizeMode="contain"
            accessibilityLabel="Book A Shoot"
          />
          <Text style={styles.footerBrand}>© 2025 Book A Shoot · Powered by Camartes</Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={goToHome}><Text style={styles.footerLinkText}>Home</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={goToAbout}><Text style={styles.footerLinkText}>About Us</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/blogs")}><Text style={styles.footerLinkText}>Blogs</Text></Pressable>
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
    paddingTop: spacing.xl,
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
    fontSize: 32,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  headingWide: {
    fontSize: 44,
  },
  subheading: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 23,
    maxWidth: 620,
  },
  subheadingWide: {
    fontSize: 16,
  },

  // ── Search & Filter ──────────────────────────────────────────────────
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === "ios" ? 12 : 6,
    marginTop: spacing.xl,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchBoxWide: {
    maxWidth: 680,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  categoryScroll: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  resultsInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 960,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  resultsCount: {
    fontSize: 13,
    color: colors.muted,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "600",
  },

  // ── Grid ─────────────────────────────────────────────────────────────
  gridContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  gridContainerWide: {
    paddingHorizontal: 56,
    flexDirection: "row",
    flexWrap: "wrap",
    maxWidth: 1040,
    alignSelf: "center",
    width: "100%",
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  serviceCardWide: {
    width: "48%",
    flexGrow: 1,
  },
  cardImageContainer: {
    width: "100%",
    height: 160,
    borderRadius: radiusSm,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.bgWarm,
  },
  cardCoverImage: {
    width: "100%",
    height: "100%",
  },
  cardImageScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 5, 0, 0.28)",
  },
  cardIconFloating: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardKycBadgeFloating: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(234, 88, 12, 0.88)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardKycTextFloating: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  cardTagline: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
    lineHeight: 18,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
  },
  cardBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: spacing.xs,
  },
  cardBadge: {
    backgroundColor: colors.bgWarm,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  cardBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgWarm,
    borderRadius: radiusSm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.xs,
  },
  cardBookText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },

  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radius,
    padding: 40,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.xs,
  },
  emptySub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 440,
    lineHeight: 21,
  },

  // ── Custom Events Section ────────────────────────────────────────────
  customEventSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: 50,
  },
  customEventSectionWide: {
    paddingHorizontal: 56,
  },
  customEventCard: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    maxWidth: 960,
    alignSelf: "center",
    width: "100%",
  },
  customEventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  customEventPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  customEventTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: colors.white,
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 640,
  },
  customEventDesc: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.92)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 720,
  },
  customEventHighlight: {
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  customEventBtn: {
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius,
    marginTop: spacing.sm,
  },
  customEventBtnText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
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
