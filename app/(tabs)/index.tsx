import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import {
  ArrowRight,
  Camera,
  ChevronRight,
  Clock3,
  Search,
  Video,
} from "lucide-react-native";
import { ScreenContainer } from "@/src/components/ScreenContainer";
import {
  DEFAULT_EVENT_CATEGORIES,
  HOME_POOJA_DISCOVERY,
  HOME_QUICK_PICKS,
  categoryMatchesSearchQuery,
  getEnabledCategories,
} from "@/src/constants/eventCategories";
import { PORTFOLIO_STRIP, SEARCH_EXAMPLES, categoryImageFor } from "@/src/constants/homeMedia";
import { useAppStore } from "@/src/state/AppProvider";
import * as bookingApi from "@/src/services/bookingApi";
import { setPhotographySelected, setVideographySelected } from "@/src/domain/dayServices";
import { colors, radius, spacing } from "@/src/constants/theme";
import { formatDateLong } from "@/src/utils/format";
import { isLocalWizardBooking, getDraftResumeRoute } from "@/src/domain/bookingRequest";
import {
  isEnquiryBooking,
  isUpcomingBooking,
  isCompletedBooking,
  getBookingEventTitle,
} from "@/src/domain/bookingFilters";

// ─────────────────────────────────────────────────────────────────────────────
// Vector Outline Category Icons (Clean, Professional, No Emojis)
// ─────────────────────────────────────────────────────────────────────────────

function WeddingRingIcon({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="8.5" cy="13.5" r="5" stroke={color} strokeWidth="2" />
      <Circle cx="15.5" cy="11.5" r="5" stroke={color} strokeWidth="2" />
      <Path d="M15.5 5.5L16.5 4.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function CoupleIcon({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="8" cy="7" r="3" stroke={color} strokeWidth="1.8" />
      <Circle cx="16" cy="7.5" r="2.8" stroke={color} strokeWidth="1.8" />
      <Path
        d="M3.5 19c0-3 2.5-4.8 5-4.8s3.8 1.4 4.5 3M13.5 17c.5-2 2.2-3.8 4.5-3.8s3.5 1.5 3.5 4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BabyIcon({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12.5" r="7" stroke={color} strokeWidth="1.8" />
      <Circle cx="9.5" cy="12" r="0.9" fill={color} />
      <Circle cx="14.5" cy="12" r="0.9" fill={color} />
      <Path d="M10.2 15c.6.6 1.1.8 1.8.8s1.2-.2 1.8-.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M12 5.5c-.8-1.5-2-1.5-2-1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M4.5 12.5c-1 0-1.5-.6-1.5-1.2s.6-1.2 1.5-1.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M19.5 12.5c1 0 1.5-.6 1.5-1.2s-.6-1.2-1.5-1.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function BirthdayCakeIcon({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" stroke={color} strokeWidth="1.8" />
      <Path d="M7 13V9.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V13" stroke={color} strokeWidth="1.8" />
      <Path d="M9 7.5V4M12 7.5V4M15 7.5V4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M3 20h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function EventsPartyIcon({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20l3.5-9.5 8 8L4 20z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <Path d="M15.5 18.5l4-1.5M12.5 10.5l5.5-2.5M10.5 4.5l1.5 3M17 5l-.5 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="19.5" cy="11.5" r="1" fill={color} />
      <Circle cx="14.5" cy="3.5" r="1" fill={color} />
      <Circle cx="7.5" cy="5.5" r="1" fill={color} />
    </Svg>
  );
}

function MoreGridIcon({ size = 20, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="6.5" height="6.5" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="13.5" y="4" width="6.5" height="6.5" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="4" y="13.5" width="6.5" height="6.5" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Marketing Carousel Slides (Strictly compliant copy — No discount claims)
// ─────────────────────────────────────────────────────────────────────────────

interface MarketingSlide {
  id: string;
  image: any;
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
}

const MARKETING_SLIDES: MarketingSlide[] = [
  {
    id: "budget",
    image: require("@/assets/images/ads1.png"),
    badge: "CUSTOM BUDGETS",
    title: "Book photographers based on your budget",
    subtitle: "Find photography options that fit what you want to spend.",
    ctaText: "Explore Events →",
  },
  {
    id: "kyc",
    image: require("@/assets/images/ads2.png"),
    badge: "100% KYC VERIFIED",
    title: "Book KYC-verified photographers with us",
    subtitle: "Every studio is identity checked, portfolio audited and SLA assured.",
    ctaText: "Explore Events →",
  },
  {
    id: "nationwide",
    image: require("@/assets/images/ads3.png"),
    badge: "PAN-INDIA TEAMS",
    title: "Book photographers from any city in India",
    subtitle: "Destination shoots and verified local talent across all major hubs.",
    ctaText: "Explore Events →",
  },
];

// Price labels for popular event cards
const EVENT_STARTING_PRICES: Record<string, string> = {
  wedding: "From ₹4,999",
  pre_wedding: "From ₹4,999",
  baby_shoot: "From ₹2,999",
  birthday: "From ₹2,999",
  pooja: "From ₹2,499",
  corporate_event: "From ₹3,999",
};

export default function HomeScreen() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;
  const contentWidth = Math.min(W, 440);

  const { profile, bookings, activeDraft, startNewBooking, loadDraft } = useAppStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const startingRef = useRef(false);

  const enquiries = useMemo(() => bookings.filter(isEnquiryBooking), [bookings]);
  const upcoming = useMemo(() => bookings.filter(isUpcomingBooking), [bookings]);
  const completed = useMemo(() => bookings.filter(isCompletedBooking), [bookings]);

  // Marketing Carousel State
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const popularEventsRef = useRef<ScrollView>(null);

  // Auto slide carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % MARKETING_SLIDES.length;
        carouselRef.current?.scrollTo({ x: next * (contentWidth - 32), animated: true });
        return next;
      });
    }, 5200);
    return () => clearInterval(timer);
  }, [contentWidth]);

  const onCarouselScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slideWidth = contentWidth - 32;
      if (slideWidth > 0) {
        const index = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
        setActiveSlide(Math.max(0, Math.min(index, MARKETING_SLIDES.length - 1)));
      }
    },
    [contentWidth]
  );

  const onCreateBooking = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      await startNewBooking();
      router.push("/booking/new");
    } finally {
      startingRef.current = false;
    }
  };

  const openWizardDay = (dayId: string | undefined) => {
    if (!dayId) {
      router.push("/booking/new");
      return;
    }
    router.push("/booking/new");
    router.push(`/booking/day/${dayId}`);
  };

  const onQuickPick = async (categoryId: string) => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const booking = await startNewBooking();
      const firstDay = booking.days[0];
      if (firstDay) {
        if (categoryId !== HOME_POOJA_DISCOVERY.id) {
          await bookingApi.updateDay(booking.bookingId, firstDay.dayId, { eventTypeIds: [categoryId] });
          await loadDraft(booking.bookingId);
        }
      }
      openWizardDay(firstDay?.dayId);
    } finally {
      startingRef.current = false;
    }
  };

  const onStartService = async (kind: "photography" | "videography") => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const booking = await startNewBooking();
      const firstDay = booking.days[0];
      if (firstDay) {
        const next = kind === "photography" ? setPhotographySelected(firstDay, true) : setVideographySelected(firstDay, true);
        await bookingApi.updateDay(booking.bookingId, firstDay.dayId, next);
        await loadDraft(booking.bookingId);
        openWizardDay(firstDay.dayId);
        return;
      }
      router.push("/booking/new");
    } finally {
      startingRef.current = false;
    }
  };

  const onContinueDraft = async () => {
    if (!activeDraft) return;
    const booking = await loadDraft(activeDraft.bookingId);
    const target = getDraftResumeRoute(booking ?? activeDraft);
    router.push(target as any);
  };

  // Popular events catalog list
  const popularEventItems = useMemo(() => {
    const items = HOME_QUICK_PICKS.map((id) => DEFAULT_EVENT_CATEGORIES.find((c) => c.id === id)).filter(Boolean);
    return [...items, HOME_POOJA_DISCOVERY] as typeof DEFAULT_EVENT_CATEGORIES;
  }, []);

  return (
    <ScreenContainer contentStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 60, backgroundColor: "#FFFDF9" }}>
      <View style={[styles.mainWrapper, isWide && styles.mainWrapperWide]}>
        {/* ── 1. Top Header ───────────────────────────────────────────── */}
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.push("/(tabs)")} style={styles.logoPressable} accessibilityRole="image">
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={styles.logoWordmark}
              resizeMode="contain"
              accessibilityLabel="Book A Shoot"
            />
          </Pressable>

          <View style={styles.headerRightActions}>
            {/* User Avatar */}
            <Pressable
              style={styles.userAvatar}
              onPress={() => router.push("/(tabs)/profile")}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Text style={styles.userAvatarText}>{profile?.avatarInitials || "KN"}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 2. Hero Section (Covers Top, No Borders) ────────────────── */}
        <View style={styles.heroOuterWrap}>
          <View style={styles.heroFrame}>
            <Image
              source={require("@/assets/images/applicationhero.png")}
              style={styles.heroBgImage}
              resizeMode="cover"
            />
            {/* Very very light black screen overlay */}
            <View style={styles.heroLightBlackScrim} />

            <View style={styles.heroTextContent}>
              <Text style={styles.heroEyebrow}>YOUR MOMENTS. OUR LENS.</Text>
              <Text style={styles.heroHeadline}>
                Book Professional{"\n"}Photographers for{"\n"}
                <Text style={styles.heroHeadlineOrange}>Life’s Best Moments</Text>
              </Text>
            </View>
          </View>

          {/* ── Search Bar Overlapping Hero ────────────────────────────── */}
          <Pressable
            style={styles.floatingSearchBar}
            onPress={() => setSearchOpen(true)}
            accessibilityRole="search"
            accessibilityLabel="Search weddings, baby shoots, events..."
          >
            <Search size={18} color={colors.primary} />
            <Text style={styles.floatingSearchPlaceholder} numberOfLines={1}>
              Search weddings, baby shoots, events...
            </Text>
            <View style={styles.floatingSearchActionBtn}>
              <ArrowRight size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        {/* ── 3. Category Shortcuts ───────────────────────────────────── */}
        <View style={styles.categoryShortcutsSection}>
          <View style={styles.categoryShortcutsGrid}>
            {/* Wedding */}
            <Pressable
              style={styles.categoryItem}
              onPress={() => void onQuickPick("wedding")}
              accessibilityRole="button"
              accessibilityLabel="Wedding photography"
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: "#FFF7ED" }]}>
                <WeddingRingIcon size={22} color={colors.primary} />
              </View>
              <Text style={styles.categoryLabel}>Wedding</Text>
            </Pressable>

            {/* Pre-Wedding */}
            <Pressable
              style={styles.categoryItem}
              onPress={() => void onQuickPick("pre_wedding")}
              accessibilityRole="button"
              accessibilityLabel="Pre-Wedding shoot"
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: "#FFF7ED" }]}>
                <CoupleIcon size={22} color={colors.primary} />
              </View>
              <Text style={styles.categoryLabel}>Pre-Wedding</Text>
            </Pressable>

            {/* Baby Shoot */}
            <Pressable
              style={styles.categoryItem}
              onPress={() => void onQuickPick("baby_shoot")}
              accessibilityRole="button"
              accessibilityLabel="Baby shoot"
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: "#F0F9FF" }]}>
                <BabyIcon size={22} color={colors.primary} />
              </View>
              <Text style={styles.categoryLabel}>Baby Shoot</Text>
            </Pressable>

            {/* Birthday */}
            <Pressable
              style={styles.categoryItem}
              onPress={() => void onQuickPick("birthday")}
              accessibilityRole="button"
              accessibilityLabel="Birthday celebration"
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: "#FFFBEB" }]}>
                <BirthdayCakeIcon size={22} color={colors.primary} />
              </View>
              <Text style={styles.categoryLabel}>Birthday</Text>
            </Pressable>

            {/* Events */}
            <Pressable
              style={styles.categoryItem}
              onPress={() => void onQuickPick("corporate_event")}
              accessibilityRole="button"
              accessibilityLabel="Events coverage"
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: "#FAF5FF" }]}>
                <EventsPartyIcon size={22} color={colors.primary} />
              </View>
              <Text style={styles.categoryLabel}>Events</Text>
            </Pressable>

            {/* More */}
            <Pressable
              style={styles.categoryItem}
              onPress={() => router.push("/events")}
              accessibilityRole="button"
              accessibilityLabel="Explore all categories"
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: "#F8FAFC" }]}>
                <MoreGridIcon size={20} color={colors.primary} />
              </View>
              <Text style={styles.categoryLabel}>More</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 4. Marketing Carousel (3 Slides) ────────────────────────── */}
        <View style={styles.marketingSection}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onCarouselScrollEnd}
            contentContainerStyle={styles.marketingScrollContent}
          >
            {MARKETING_SLIDES.map((slide) => (
              <View key={slide.id} style={[styles.marketingCard, { width: contentWidth - 32 }]}>
                <Image source={slide.image} style={styles.marketingCardBg} resizeMode="cover" />
                <LinearGradient
                  colors={["rgba(15, 23, 42, 0.88)", "rgba(15, 23, 42, 0.40)", "rgba(15, 23, 42, 0.15)"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.marketingGradientOverlay}
                />
                <View style={styles.marketingCardContent}>
                  <View style={styles.marketingBadge}>
                    <Text style={styles.marketingBadgeText}>{slide.badge}</Text>
                  </View>
                  <Text style={styles.marketingTitle}>{slide.title}</Text>
                  <Text style={styles.marketingSubtitle}>{slide.subtitle}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.marketingCtaBtn, pressed && styles.pressed]}
                    onPress={() => router.push("/events")}
                    accessibilityRole="button"
                  >
                    <Text style={styles.marketingCtaText}>{slide.ctaText}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pagination Indicators */}
          <View style={styles.paginationDotsRow}>
            {MARKETING_SLIDES.map((slide, idx) => (
              <View
                key={slide.id}
                style={[
                  styles.paginationDot,
                  idx === activeSlide && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── 5. Popular Events ───────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Popular events</Text>
            <Pressable
              onPress={() => router.push("/events")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View all popular events"
            >
              <Text style={styles.sectionViewAll}>View all →</Text>
            </Pressable>
          </View>

          <View style={styles.horizontalScrollWrapper}>
            <ScrollView
              ref={popularEventsRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularEventsScroll}
            >
              {popularEventItems.map((cat) => {
                if (!cat) return null;
                const startingPrice = EVENT_STARTING_PRICES[cat.id] || "From ₹2,999";
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => void onQuickPick(cat.id)}
                    style={({ pressed }) => [styles.popularEventCard, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Book ${cat.label}`}
                  >
                    <Image source={categoryImageFor(cat.id)} style={styles.popularEventImg} resizeMode="cover" />
                    <LinearGradient
                      colors={["transparent", "rgba(15, 23, 42, 0.45)", "rgba(15, 23, 42, 0.90)"]}
                      style={styles.popularEventGradient}
                    />
                    <View style={styles.popularEventContent}>
                      <Text style={styles.popularEventTitle} numberOfLines={1}>
                        {cat.label}
                      </Text>
                      <Text style={styles.popularEventPrice}>{startingPrice}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Scroll Right Indicator Pill */}
            <Pressable
              style={styles.scrollRightAffordance}
              onPress={() => popularEventsRef.current?.scrollTo({ x: 280, animated: true })}
              accessibilityRole="button"
              accessibilityLabel="Scroll events right"
            >
              <ChevronRight size={16} color="#475569" />
            </Pressable>
          </View>
        </View>

        {/* ── 6. Book Coverage Section (coverage.png as whole background) ── */}
        <View style={styles.sectionContainer}>
          <View style={styles.bookCoverageCard}>
            <Image
              source={require("@/assets/images/coverage.png")}
              style={styles.bookCoverageBgImage}
              resizeMode="cover"
            />
            <View style={styles.bookCoverageContent}>
              <Text style={styles.bookCoverageTitle}>Book A Photographer</Text>
              <Text style={styles.bookCoverageSubtitle}>
                Tell us the event. We'll match real photographers and videographers.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.startBookingBtn, pressed && styles.pressed]}
                onPress={onCreateBooking}
                accessibilityRole="button"
                accessibilityLabel="Start booking"
              >
                <Text style={styles.startBookingBtnText}>Start booking →</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── 7. Popular Services ─────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Popular services</Text>
          </View>

          <View style={styles.servicesGridRow}>
            {/* Photography */}
            <Pressable
              style={({ pressed }) => [styles.serviceProCard, pressed && styles.pressed]}
              onPress={() => void onStartService("photography")}
              accessibilityRole="button"
              accessibilityLabel="Book photography"
            >
              <View style={styles.serviceIconContainer}>
                <Camera size={22} color={colors.primary} />
              </View>
              <Text style={styles.serviceProLabel}>Photography</Text>
            </Pressable>

            {/* Videography */}
            <Pressable
              style={({ pressed }) => [styles.serviceProCard, pressed && styles.pressed]}
              onPress={() => void onStartService("videography")}
              accessibilityRole="button"
              accessibilityLabel="Book videography"
            >
              <View style={styles.serviceIconContainer}>
                <Video size={22} color={colors.primary} />
              </View>
              <Text style={styles.serviceProLabel}>Videography</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 8. Upcoming Event & Draft Resume ────────────────────────── */}
        {upcoming[0] ? (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionHeading, { marginBottom: 12 }]}>Upcoming event</Text>
            <Pressable
              style={({ pressed }) => [styles.upcomingEventCard, pressed && styles.pressed]}
              onPress={() => router.push(`/bookings/${upcoming[0].bookingId}`)}
              accessibilityRole="button"
              accessibilityLabel="View upcoming shoot details"
            >
              <View style={styles.upcomingEventIconCircle}>
                <Clock3 size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.upcomingEventTitle} numberOfLines={1}>
                  {getBookingEventTitle(upcoming[0])}
                </Text>
                <Text style={styles.upcomingEventSubtitle} numberOfLines={1}>
                  Upcoming shoot · {formatDateLong(upcoming[0].days[0]?.eventDate ?? null)}
                  {upcoming[0].days[0]?.location.city ? ` · ${upcoming[0].days[0].location.city}` : ""}
                </Text>
              </View>
              <View style={styles.upcomingViewBadge}>
                <Text style={styles.upcomingViewText}>View →</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {activeDraft && isLocalWizardBooking(activeDraft) && activeDraft.draftCompletionPct > 0 ? (
          <View style={styles.sectionContainer}>
            <Pressable
              style={({ pressed }) => [styles.draftResumeCard, pressed && styles.pressed]}
              onPress={onContinueDraft}
              accessibilityRole="button"
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.draftResumeTitle}>Continue your booking</Text>
                <Text style={styles.draftResumeSubtitle}>
                  {activeDraft.draftCompletionPct}% complete · pick up where you left off
                </Text>
              </View>
              <View style={styles.draftResumeBadge}>
                <Text style={styles.draftResumeBadgeText}>Resume →</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* ── 9. Real Celebrations ────────────────────────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Real celebrations</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/events", params: { tab: "real_celebrations" } })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View all real celebrations"
            >
              <Text style={styles.sectionViewAll}>View all →</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.celebrationsScroll}
          >
            {PORTFOLIO_STRIP.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: "/events", params: { tab: "real_celebrations" } })}
                style={({ pressed }) => [styles.celebrationCard, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Image source={item.image} style={styles.celebrationImg} resizeMode="cover" />
                <LinearGradient
                  colors={["transparent", "rgba(15, 23, 42, 0.40)", "rgba(15, 23, 42, 0.85)"]}
                  style={styles.celebrationGradient}
                />
                <Text style={styles.celebrationLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── 10. Metric / Stats Cards (Attractive Orange Theme) ─────── */}
        <LinearGradient
          colors={["#FF6B35", "#ED5418"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsCardContainer}
        >
          <Pressable
            style={({ pressed }) => [styles.statCol, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: "/(tabs)/bookings", params: { filter: "enquiries" } })}
            accessibilityRole="button"
            accessibilityLabel={`View ${enquiries.length} enquiries`}
          >
            <Text style={styles.statNumber}>{enquiries.length}</Text>
            <Text style={styles.statLabel}>Enquiries</Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={({ pressed }) => [styles.statCol, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: "/(tabs)/bookings", params: { filter: "upcoming" } })}
            accessibilityRole="button"
            accessibilityLabel={`View ${upcoming.length} upcoming shoots`}
          >
            <Text style={styles.statNumber}>{upcoming.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={({ pressed }) => [styles.statCol, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: "/(tabs)/bookings", params: { filter: "completed" } })}
            accessibilityRole="button"
            accessibilityLabel={`View ${completed.length} completed shoots`}
          >
            <Text style={styles.statNumber}>{completed.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </Pressable>
        </LinearGradient>
      </View>

      {/* ── Existing Search Sheet Modal ─────────────────────────────── */}
      <SearchSheet
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={onQuickPick}
        onStart={onCreateBooking}
      />
    </ScreenContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Existing Search Sheet Modal (Preserving all original search functionality)
// ─────────────────────────────────────────────────────────────────────────────

function SearchSheet({
  visible,
  onClose,
  onPick,
  onStart,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
  onStart: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = getEnabledCategories().filter((c) => categoryMatchesSearchQuery(c, q));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.searchModal, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.searchHeader}>
          <View style={styles.searchInputWrap}>
            <Search size={18} color={colors.primary} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="What are you looking to shoot?"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        {!q ? (
          <View style={{ gap: 8, marginBottom: spacing.md }}>
            <Text style={styles.searchSectionLabel}>Popular searches</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SEARCH_EXAMPLES.map((ex) => (
                <Pressable key={ex} style={styles.exampleChip} onPress={() => setQuery(ex)}>
                  <Text style={styles.exampleText}>{ex}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <ScrollView keyboardShouldPersistTaps="handled">
          {matches.slice(0, 12).map((c) => (
            <Pressable
              key={c.id}
              style={styles.resultRow}
              onPress={() => {
                onClose();
                void onPick(c.id);
              }}
            >
              <ImageBackground
                source={categoryImageFor(c.id)}
                style={styles.resultThumb}
                imageStyle={{ borderRadius: 8 }}
              >
                <View />
              </ImageBackground>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>{c.label}</Text>
                <Text style={styles.resultSub}>Start a booking</Text>
              </View>
              <ArrowRight size={16} color={colors.primary} />
            </Pressable>
          ))}

          <Pressable
            style={styles.searchStartBtn}
            onPress={() => {
              onClose();
              void onStart();
            }}
          >
            <Text style={styles.searchStartBtnText}>Start custom booking</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Production-Grade Mobile Marketplace Stylesheet
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  mainWrapper: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: "#FFFDF9",
  },
  mainWrapperWide: {
    maxWidth: 520,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },

  // ── 1. Top Header ──────────────────────────────────────────────────────────
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFDF9",
  },
  logoPressable: {
    justifyContent: "center",
  },
  logoWordmark: {
    width: 195,
    height: 48,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  // ── 2. Hero Section (Covers Top, No Borders) ───────────────────────────────
  heroOuterWrap: {
    position: "relative",
    width: "100%",
    marginTop: 0,
    marginBottom: 20,
  },
  heroFrame: {
    width: "100%",
    height: 290,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#FCE7D6",
    borderWidth: 0,
  },
  heroBgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  heroGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroLightBlackScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },
  heroTextContent: {
    position: "relative",
    zIndex: 2,
    paddingTop: 28,
    paddingHorizontal: 20,
    maxWidth: "82%",
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.95)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroHeadline: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroHeadlineOrange: {
    color: colors.primary,
  },

  // ── Floating Search Bar Overlapping Hero ───────────────────────────────────
  floatingSearchBar: {
    position: "relative",
    marginTop: -26,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 7,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.20)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 10,
  },
  floatingSearchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginLeft: 8,
    marginRight: 6,
  },
  floatingSearchActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── 3. Category Shortcuts ──────────────────────────────────────────────────
  categoryShortcutsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  categoryShortcutsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  categoryItem: {
    alignItems: "center",
    flex: 1,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.12)",
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
  },

  // ── 4. Marketing Carousel ──────────────────────────────────────────────────
  marketingSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  marketingScrollContent: {
    gap: 16,
  },
  marketingCard: {
    height: 165,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0F172A",
    borderWidth: 0,
  },
  marketingCardBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  marketingGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  marketingCardContent: {
    position: "relative",
    zIndex: 2,
    padding: 16,
    justifyContent: "space-between",
    height: "100%",
    maxWidth: "76%",
  },
  marketingBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marketingBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  marketingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  marketingSubtitle: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.90)",
    lineHeight: 16,
  },
  marketingCtaBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  marketingCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  paginationDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  paginationDotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },

  // ── Sections Universal Layout ──────────────────────────────────────────────
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionViewAll: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },

  // ── 5. Popular Events ──────────────────────────────────────────────────────
  horizontalScrollWrapper: {
    position: "relative",
  },
  popularEventsScroll: {
    gap: 12,
    paddingRight: 24,
  },
  popularEventCard: {
    width: 136,
    height: 172,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
    borderWidth: 0,
  },
  popularEventImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  popularEventGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  popularEventContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  popularEventTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  popularEventPrice: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
    marginTop: 2,
  },
  scrollRightAffordance: {
    position: "absolute",
    right: 0,
    top: "38%",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── 6. Book Coverage Section (coverage.png as whole background) ───────────
  bookCoverageCard: {
    height: 172,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    backgroundColor: "#FCE7D6",
    borderWidth: 0,
  },
  bookCoverageBgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  bookCoverageContent: {
    position: "relative",
    zIndex: 2,
    padding: 16,
    maxWidth: "58%",
    height: "100%",
    justifyContent: "space-between",
  },
  cameraIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 107, 53, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  bookCoverageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  bookCoverageSubtitle: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 2,
  },
  startBookingBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  startBookingBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // ── 7. Popular Services ────────────────────────────────────────────────────
  servicesGridRow: {
    flexDirection: "row",
    gap: 12,
  },
  serviceProCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceProLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },

  // ── 8. Upcoming Event & Draft Resume ───────────────────────────────────────
  upcomingEventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  upcomingEventIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingEventTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  upcomingEventSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  upcomingViewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
  },
  upcomingViewText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  draftResumeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  draftResumeTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  draftResumeSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  draftResumeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  draftResumeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── 9. Real Celebrations ───────────────────────────────────────────────────
  celebrationsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  celebrationCard: {
    width: 148,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
    borderWidth: 0,
  },
  celebrationImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  celebrationGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  celebrationLabel: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── 10. Metric / Stats Cards (Orange Theme) ───────────────────────────────
  statsCardContainer: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 21,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.92)",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },

  // ── Search Sheet Modal Styles ──────────────────────────────────────────────
  searchModal: {
    flex: 1,
    backgroundColor: "#FFFDF9",
    paddingHorizontal: 16,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  cancelText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  searchSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exampleChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exampleText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#1E293B",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  resultThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#FED7AA",
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  resultSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  searchStartBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  searchStartBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
