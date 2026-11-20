/**
 * Building blocks for the local SEO landing pages: real <h1>/<h2>/<h3>
 * headings, crawlable <a href> links, breadcrumbs, FAQs and the booking CTA.
 */
import React, { useCallback, useRef } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { Link, router, usePathname, type Href } from "expo-router";
import { ArrowRight, ChevronRight, MapPin } from "lucide-react-native";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, radiusSm, spacing } from "@/src/constants/theme";
import type { Faq } from "@/src/seo/seoContent";

/* ─────────────────────────────── Analytics ─────────────────────────────── */

type Gtag = (...args: unknown[]) => void;

/** Sends a GA4 event on web. Never throws and never blocks navigation. */
export function trackSeoEvent(name: string, params: Record<string, string | undefined>): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag === "function") gtag("event", name, params);
  } catch {
    // Analytics must never break the page.
  }
}

/* ─────────────────────────────── Layout ────────────────────────────────── */

/** Phones get tighter spacing, smaller headings and swipeable card rows. */
export const PHONE_MAX_WIDTH = 600;
export function useIsPhone(): boolean {
  return useWindowDimensions().width < PHONE_MAX_WIDTH;
}

/* ───────────────────────────── Booking CTA ─────────────────────────────── */

/**
 * Starts a booking with the event type pre-selected. Visitors who are not
 * signed in go to login and come back to this page afterwards.
 */
export function useStartBooking() {
  const { profile, startNewBooking, updateDay } = useAppStore();
  const pathname = usePathname();
  const busy = useRef(false);

  return useCallback(
    async (opts: { eventTypeId?: string; city?: string; service?: string; placement: string }) => {
      trackSeoEvent("booking_cta_click", {
        placement: opts.placement,
        city: opts.city,
        service: opts.service,
        page_path: pathname,
      });
      if (!profile) {
        router.push({ pathname: "/(auth)/login", params: { returnTo: pathname } });
        return;
      }
      if (busy.current) return;
      busy.current = true;
      try {
        const booking = await startNewBooking();
        const day = booking.days[0];
        if (day && opts.eventTypeId) {
          await updateDay(day.dayId, { eventTypeIds: [opts.eventTypeId] });
        }
        router.push((day ? `/booking/day/${day.dayId}` : "/booking/new") as Href);
      } catch {
        router.push("/(tabs)");
      } finally {
        busy.current = false;
      }
    },
    [pathname, profile, startNewBooking, updateDay],
  );
}

export function BookingButton({
  label,
  onPress,
  variant = "solid",
  center = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  center?: boolean;
}) {
  const solid = variant === "solid";
  const phone = useIsPhone();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.cta,
        solid ? styles.ctaSolid : styles.ctaOutline,
        center && (phone ? styles.ctaFull : styles.ctaCenter),
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.ctaText, !solid && styles.ctaTextOutline]}>{label}</Text>
      <ArrowRight size={18} color={solid ? colors.white : colors.primaryDark} />
    </Pressable>
  );
}

/* ─────────────────────────────── Headings ──────────────────────────────── */

/**
 * Props that make a <Text> render as a real <h1>–<h3> on web.
 * react-native-web reads `aria-level`; React Native's types don't declare it.
 */
export function headingProps(level: 1 | 2 | 3): TextProps {
  return { role: "heading", "aria-level": level } as unknown as TextProps;
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text {...headingProps(1)} style={[styles.h1, style]}>
      {children}
    </Text>
  );
}

export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const phone = useIsPhone();
  return (
    <Text {...headingProps(2)} style={[styles.h2, phone && styles.h2Phone, style]}>
      {children}
    </Text>
  );
}

export function H3({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text {...headingProps(3)} style={[styles.h3, style]}>
      {children}
    </Text>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

/* ──────────────────────────────── Links ────────────────────────────────── */

/** Inline text link: renders a real <a href> on web. */
export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href as Href} style={styles.textLink}>
      {children}
    </Link>
  );
}

/** A card that is one crawlable link. */
export function LinkCard({ href, title, body }: { href: string; title: string; body?: string }) {
  const phone = useIsPhone();
  return (
    <Link href={href as Href} asChild>
      <Pressable style={({ pressed }) => [styles.card, styles.linkCard, phone && styles.linkCardPhone, pressed && styles.pressed]}>
        <View style={styles.linkCardRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          <ChevronRight size={18} color={colors.muted} />
        </View>
        {body ? <Text style={styles.cardBody}>{body}</Text> : null}
      </Pressable>
    </Link>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <View style={styles.breadcrumbs} accessibilityLabel="Breadcrumb">
      {items.map((item, i) => (
        <React.Fragment key={`${item.name}-${i}`}>
          {i > 0 ? <Text style={styles.breadcrumbSep}>/</Text> : null}
          {item.path ? (
            <Link href={item.path as Href} style={styles.breadcrumbLink}>
              {item.name}
            </Link>
          ) : (
            <Text style={styles.breadcrumbCurrent}>{item.name}</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/* ─────────────────────────────── Sections ──────────────────────────────── */

/** Every section below the hero: same heading, same spacing, same rhythm. */
export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const phone = useIsPhone();
  return (
    <View style={[styles.section, phone && styles.sectionPhone]}>
      <View style={[styles.sectionHead, phone && styles.sectionHeadPhone]}>
        <H2>{title}</H2>
        {subtitle ? <Text style={[styles.sectionSubtitle, phone && styles.sectionSubtitlePhone]}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.sectionBody, phone && styles.sectionBodyPhone]}>{children}</View>
    </View>
  );
}

export function LocalityChips({ localities }: { localities: string[] }) {
  return (
    <View style={styles.chips}>
      {localities.map((l) => (
        <View key={l} style={styles.chip}>
          <MapPin size={14} color={colors.muted} />
          <Text style={styles.chipText}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

/** One-tap booking pills (a different action from page links, so a different look). */
export function ActionChips({ items }: { items: { label: string; onPress: () => void }[] }) {
  return (
    <View style={styles.chips}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={`Book ${item.label}`}
          style={({ pressed }) => [styles.chip, styles.actionChip, pressed && styles.pressed]}
        >
          <Text style={styles.actionChipText}>{item.label}</Text>
          <ArrowRight size={14} color={colors.primaryDark} />
        </Pressable>
      ))}
    </View>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  const phone = useIsPhone();
  return (
    <View style={[styles.faqList, phone && styles.faqListPhone]}>
      {faqs.map((f, i) => (
        <View key={f.q} style={[styles.faqItem, phone && styles.faqItemPhone, i === faqs.length - 1 && styles.faqItemLast]}>
          <H3>{f.q}</H3>
          <Text style={styles.cardBody}>{f.a}</Text>
        </View>
      ))}
    </View>
  );
}

export function InfoCards({ items, numbered = false }: { items: { title: string; body: string }[]; numbered?: boolean }) {
  const phone = useIsPhone();
  const cards = items.map((item, i) => (
    <View key={item.title} style={[styles.card, phone ? styles.cardPhone : styles.gridCard]}>
      {numbered ? <Text style={styles.stepNumber}>{String(i + 1).padStart(2, "0")}</Text> : null}
      <H3>{item.title}</H3>
      <Text style={styles.cardBody}>{item.body}</Text>
    </View>
  ));
  if (phone && items.length > 1) return <SwipeRow>{cards}</SwipeRow>;
  return <View style={styles.grid}>{cards}</View>;
}

/**
 * Phone-only horizontal row of cards that snap into place, with the next card
 * peeking in so it reads as swipeable. Content stays in the DOM for crawlers.
 */
export function SwipeRow({ children, cardWidth }: { children: React.ReactNode; cardWidth?: number }) {
  const { width } = useWindowDimensions();
  const w = cardWidth ?? Math.round(Math.min((width || 375) * 0.8, 340)); // width is 0 during static render
  const gap = spacing.md;
  const webSnap = (Platform.OS === "web" ? { scrollSnapType: "x mandatory" } : null) as unknown as ViewStyle;
  const webItemSnap = (Platform.OS === "web" ? { scrollSnapAlign: "start", scrollMarginLeft: spacing.lg } : null) as unknown as ViewStyle;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={w + gap}
      snapToAlignment="start"
      style={[styles.swipe, webSnap]}
      contentContainerStyle={[styles.swipeContent, { gap }]}
    >
      {React.Children.map(children, (child) => (
        <View style={[{ width: w }, webItemSnap]}>{child}</View>
      ))}
    </ScrollView>
  );
}

/** Shared scale for everything below the hero. */
export const SECTION_GAP = 56;
const CARD = {
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 16,
  padding: spacing.xl,
  gap: spacing.sm,
} as const;

export const seoStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingHorizontal: spacing.lg },
  lead: { fontSize: 16, lineHeight: 25, color: colors.ink },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  trustPillText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  bullets: { gap: spacing.md },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  bulletText: { flex: 1, fontSize: 16, lineHeight: 24, color: colors.ink },
  /** Standalone blocks between sections use the same gap as sections. */
  block: { marginBottom: SECTION_GAP },
  callout: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: 16,
    padding: spacing.xl,
  },
  calloutBody: { flex: 1, gap: spacing.xs },
  calloutText: { fontSize: 15, lineHeight: 24, color: colors.muted },
  budgetGrid: { gap: spacing.lg },
  budgetGridWide: { flexDirection: "row" },
  budgetCard: { ...CARD, flex: 1 },
  budgetRange: { fontSize: 20, lineHeight: 28, fontWeight: "600", color: colors.primaryDark },
  budgetDesc: { fontSize: 15, lineHeight: 24, color: colors.muted },
  note: { fontSize: 13, lineHeight: 20, color: colors.muted },
  card: CARD,
  cardTitle: { fontSize: 16, lineHeight: 24, fontWeight: "600", color: colors.text },
  cardBody: { fontSize: 15, lineHeight: 24, color: colors.muted },
  ctaBanner: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: SECTION_GAP,
  },
  ctaBannerText: { fontSize: 16, lineHeight: 26, color: colors.muted, textAlign: "center", maxWidth: 620 },
  linkRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  /** Grid cell width shared by link cards and request cards. */
  gridItem: { flexGrow: 1, flexBasis: 260 },
});

const styles = StyleSheet.create({
  // Hero heading: unchanged.
  h1: { fontSize: 30, lineHeight: 38, fontWeight: "800", color: colors.text },
  // Below the hero: one calm scale.
  h2: { fontSize: 26, lineHeight: 34, fontWeight: "600", color: colors.text, letterSpacing: -0.3 },
  h2Phone: { fontSize: 22, lineHeight: 30, letterSpacing: -0.2 },
  h3: { fontSize: 16, lineHeight: 24, fontWeight: "600", color: colors.text },
  paragraph: { fontSize: 16, lineHeight: 26, color: colors.ink, maxWidth: 780 },
  section: { marginBottom: SECTION_GAP },
  sectionPhone: { marginBottom: 40 },
  sectionHead: { gap: spacing.sm, marginBottom: spacing.xl },
  sectionHeadPhone: { marginBottom: spacing.lg, gap: 6 },
  sectionSubtitlePhone: { fontSize: 15, lineHeight: 22 },
  sectionBodyPhone: { gap: spacing.md },
  sectionSubtitle: { fontSize: 16, lineHeight: 24, color: colors.muted, maxWidth: 720 },
  sectionBody: { gap: spacing.lg },
  textLink: { color: colors.primaryDark, fontWeight: "600", fontSize: 15, lineHeight: 24 },
  card: CARD,
  cardTitle: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: "600", color: colors.text },
  cardBody: { fontSize: 15, lineHeight: 24, color: colors.muted },
  linkCard: { flexGrow: 1, flexBasis: 260, paddingVertical: spacing.lg },
  linkCardPhone: { paddingVertical: 14, paddingHorizontal: spacing.lg, gap: 4 },
  cardPhone: { padding: 20, flex: 1 },
  swipe: { marginHorizontal: -spacing.lg, flexGrow: 0 },
  swipeContent: { paddingHorizontal: spacing.lg, paddingBottom: 2 },
  linkCardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  breadcrumbs: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  breadcrumbLink: { fontSize: 13, color: colors.primaryDark },
  breadcrumbSep: { fontSize: 13, color: colors.muted },
  breadcrumbCurrent: { fontSize: 13, color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipText: { fontSize: 14, lineHeight: 20, color: colors.text },
  actionChip: { borderColor: colors.peachBorder, backgroundColor: colors.cream },
  actionChipText: { fontSize: 14, lineHeight: 20, color: colors.primaryDark, fontWeight: "600" },
  faqList: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: spacing.xl },
  faqItem: { paddingVertical: spacing.xl, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  faqItemLast: { borderBottomWidth: 0 },
  faqListPhone: { paddingHorizontal: spacing.lg },
  faqItemPhone: { paddingVertical: 18, gap: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  gridCard: { flexGrow: 1, flexBasis: 220 },
  stepNumber: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.primaryDark },
  // Hero button: unchanged.
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radiusSm,
    alignSelf: "flex-start",
  },
  ctaCenter: { alignSelf: "center" },
  ctaFull: { alignSelf: "stretch" },
  ctaSolid: { backgroundColor: colors.primaryDark },
  ctaOutline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primaryDark },
  ctaText: { fontSize: 15, fontWeight: "700", color: colors.white },
  ctaTextOutline: { color: colors.primaryDark },
  pressed: { opacity: 0.85 },
});
