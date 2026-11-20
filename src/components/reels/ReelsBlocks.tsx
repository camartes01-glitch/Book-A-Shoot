/**
 * CamReels building blocks: the image hero, the "Book CamReels" button and the
 * shared type/spacing scale every CamReels section uses, so headings, body
 * text and gaps stay consistent across the page.
 */
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { ArrowRight, BadgeCheck, Camera, Scissors } from "lucide-react-native";
import { SEOImage } from "@/src/components/SEOImage";
import { headingProps, trackSeoEvent } from "@/src/components/seo/SeoBlocks";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, spacing } from "@/src/constants/theme";
import { REELS_BOOKING_PATH, REELS_COPY } from "@/src/constants/reels";

const DESKTOP_IMAGE =
  Platform.OS === "web" ? "/reels-videographer-desktop.webp" : require("@/assets/images/reels-videographer-desktop.webp");
const PHONE_IMAGE =
  Platform.OS === "web" ? "/reels-videographer-mobile.webp" : require("@/assets/images/reels-videographer-mobile.webp");

/** One type scale for all CamReels surfaces. */
export const camType = StyleSheet.create({
  eyebrow: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.primaryDark, letterSpacing: 0.8, textTransform: "uppercase" },
  h1: { fontSize: 52, lineHeight: 62, fontWeight: "600", color: colors.ink, letterSpacing: -0.8 },
  h1Phone: { fontSize: 32, lineHeight: 40, letterSpacing: -0.4 },
  h1Small: { fontSize: 30, lineHeight: 37 },
  h2: { fontSize: 32, lineHeight: 40, fontWeight: "600", color: colors.ink, letterSpacing: -0.4 },
  h2Phone: { fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  lead: { fontSize: 17, lineHeight: 26, fontWeight: "400", color: colors.muted },
  leadPhone: { fontSize: 15, lineHeight: 23 },
  cardTitle: { fontSize: 17, lineHeight: 24, fontWeight: "600", color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400", color: colors.muted },
});

/** Signed in → CamReels booking. Signed out → login, then straight back to it. */
export function useStartReelsBooking() {
  const { profile } = useAppStore();
  return (placement: string) => {
    trackSeoEvent("camreels_cta_click", { placement, signed_in: profile ? "yes" : "no" });
    if (profile) router.push(REELS_BOOKING_PATH as Href);
    else router.push({ pathname: "/(auth)/login", params: { returnTo: REELS_BOOKING_PATH } });
  };
}

export function ReelsCtaButton({
  placement,
  label = REELS_COPY.cta,
  variant = "solid",
  center,
  full,
}: {
  placement: string;
  label?: string;
  variant?: "solid" | "light";
  center?: boolean;
  /** Stretch to the container width (phones). */
  full?: boolean;
}) {
  const start = useStartReelsBooking();
  const light = variant === "light";
  return (
    <Pressable
      onPress={() => start(placement)}
      style={({ pressed }) => [styles.cta, light && styles.ctaLight, center && { alignSelf: "center" }, full && styles.ctaFull, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.ctaText, light && styles.ctaTextLight]}>{label}</Text>
      <ArrowRight size={18} color={light ? colors.primaryDark : colors.white} />
    </Pressable>
  );
}

/** Full-width hero: artwork behind, short copy and one button on the left. */
export function ReelsHero({ width, isWide }: { width: number; isWide: boolean }) {
  const bannerH = isWide ? Math.max(520, Math.min(640, Math.round(width * 0.48))) : Math.round(width * (887 / 756));
  const small = width < 380;
  return (
    <View>
      <View style={[styles.banner, { height: bannerH }]}>
        <SEOImage
          src={isWide ? DESKTOP_IMAGE : PHONE_IMAGE}
          alt="CamReels: a professional videographer filming an Instagram Reel on a DSLR camera with a gimbal"
          width={width}
          height={bannerH}
          priority
          resizeMode="cover"
          style={styles.fill}
        />
        <View style={[styles.copy, isWide ? styles.copyWide : styles.copyPhone]}>
          <Text style={camType.eyebrow}>{REELS_COPY.eyebrow}</Text>
          <Text {...headingProps(1)} style={[camType.h1, !isWide && camType.h1Phone, small && camType.h1Small]}>
            {REELS_COPY.headlineLead}
            {"\n"}
            <Text style={{ color: colors.primaryDark }}>{REELS_COPY.headlineAccent}</Text>
          </Text>
          {isWide ? <Text style={[camType.lead, { color: colors.ink, maxWidth: 460 }]}>{REELS_COPY.sub}</Text> : null}
          <ReelsCtaButton placement={isWide ? "camreels_hero_desktop" : "camreels_hero_phone"} />
        </View>
      </View>
      {isWide ? null : (
        <View style={styles.phoneIntro}>
          <Text style={[camType.lead, camType.leadPhone, { color: colors.ink }]}>{REELS_COPY.sub}</Text>
          <View style={styles.trustRow}>
            {TRUST.map(({ label, Icon }) => (
              <View key={label} style={styles.trustPill}>
                <Icon size={14} color={colors.primaryDark} />
                <Text style={styles.trustText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const TRUST = [
  { label: "DSLR + gimbal", Icon: Camera },
  { label: "Verified videographers", Icon: BadgeCheck },
  { label: "Edited or raw", Icon: Scissors },
];

/** Phone-only bar pinned to the bottom of the screen once the hero scrolls away. */
export function ReelsStickyCta({ visible, bottomInset }: { visible: boolean; bottomInset: number }) {
  if (!visible) return null;
  return (
    <View style={[styles.sticky, { paddingBottom: Math.max(bottomInset, 12) }]} pointerEvents="box-none">
      <View style={{ flex: 1 }}>
        <Text style={styles.stickyTitle}>CamReels</Text>
        <Text style={styles.stickySub}>Shot on camera. Not on phones.</Text>
      </View>
      <ReelsCtaButton placement="camreels_sticky_phone" label="Book now" />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { width: "100%", position: "relative", overflow: "hidden", backgroundColor: colors.peach },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  copy: { position: "absolute", gap: spacing.lg },
  copyWide: { top: 0, bottom: 0, left: 0, width: "46%", maxWidth: 620, paddingLeft: 64, paddingRight: 16, justifyContent: "center" },
  copyPhone: { top: 0, left: 0, right: 0, paddingTop: 32, paddingHorizontal: spacing.lg, gap: spacing.md },
  phoneIntro: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  trustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  trustText: { fontSize: 13, lineHeight: 18, color: colors.ink, fontWeight: "500" },
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: 12,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  stickyTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.ink },
  stickySub: { fontSize: 12, lineHeight: 17, color: colors.muted },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  ctaLight: { backgroundColor: "#F6E7D3" },
  ctaFull: { alignSelf: "stretch", justifyContent: "center" },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  ctaTextLight: { color: "#7A3A12" },
});
