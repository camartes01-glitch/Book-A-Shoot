import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BadgeCheck, MapPin, Wallet } from "lucide-react-native";
import { SEOImage } from "@/src/components/SEOImage";
import { colors, spacing } from "@/src/constants/theme";
import { BookingButton, H1, seoStyles } from "@/src/components/seo/SeoBlocks";
import type { SeoImage } from "@/src/seo/seoContent";

/** Native builds can't load /public paths, so map them to bundled assets. */
const NATIVE_IMAGES: Record<string, number> = {
  "/blog1.webp": require("@/assets/images/blog1.webp"),
  "/blog2.webp": require("@/assets/images/blog2.webp"),
  "/hero1.webp": require("@/assets/images/hero1.webp"),
  "/hero2.webp": require("@/assets/images/hero2.webp"),
  "/hero3.webp": require("@/assets/images/hero3.webp"),
  "/hyderabad-charminar.webp": require("@/assets/images/hyderabad-charminar.webp"),
  "/vijayawada-krishna-river-indrakeeladri.webp": require("@/assets/images/vijayawada-krishna-river-indrakeeladri.webp"),
  "/bengaluru-vidhana-soudha.webp": require("@/assets/images/bengaluru-vidhana-soudha.webp"),
  "/visakhapatnam-rk-beach.webp": require("@/assets/images/visakhapatnam-rk-beach.webp"),
};

const TRUST = [
  { Icon: BadgeCheck, label: "KYC-verified studios" },
  { Icon: Wallet, label: "Matched to your budget" },
  { Icon: MapPin, label: "Book online" },
];

/**
 * Page hero with the city photo as a full-bleed background. The photo stays a
 * real <img> with alt text so it is still indexed and loaded as the LCP image.
 */
export function SeoHero({
  eyebrow,
  h1,
  lead,
  image,
  ctaLabel,
  onCta,
}: {
  eyebrow: string;
  h1: string;
  lead: string;
  image: SeoImage;
  ctaLabel: string;
  onCta: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  return (
    <View style={[styles.hero, wide && styles.heroWide]}>
      <SEOImage
        src={image.src}
        nativeSource={NATIVE_IMAGES[image.src]}
        alt={image.alt}
        priority
        resizeMode="cover"
        style={styles.fill}
      />
      <View style={styles.overlay} pointerEvents="none" />
      <View style={[styles.content, wide && styles.contentWide]}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <H1 style={styles.h1}>{h1}</H1>
        <Text style={styles.lead}>{lead}</Text>
        <View style={seoStyles.trustRow}>
          {TRUST.map(({ Icon, label }) => (
            <View key={label} style={seoStyles.trustPill}>
              <Icon size={14} color={colors.primaryDark} />
              <Text style={seoStyles.trustPillText}>{label}</Text>
            </View>
          ))}
        </View>
        <BookingButton label={ctaLabel} onPress={onCta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    marginBottom: spacing.xxl,
    minHeight: 420,
    justifyContent: "flex-end",
    backgroundColor: "#3a2414",
  },
  heroWide: { minHeight: 460, justifyContent: "center" },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20, 10, 4, 0.58)" },
  content: { padding: spacing.xl, gap: spacing.md },
  contentWide: { maxWidth: 660, paddingHorizontal: spacing.xxl },
  eyebrow: { fontSize: 12, fontWeight: "800", color: "#FFD9B8", letterSpacing: 1, textTransform: "uppercase" },
  h1: { color: "#FFFFFF" },
  lead: { fontSize: 16, lineHeight: 25, color: "rgba(255,255,255,0.92)" },
});
