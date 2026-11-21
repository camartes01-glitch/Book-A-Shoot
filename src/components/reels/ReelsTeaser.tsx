/**
 * Home-page section introducing CamReels to creators and influencers:
 * a plain orange band, one line of copy, the starting price circled like a
 * doodle, and a beige "Learn more" to /camreels.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { ArrowRight } from "lucide-react-native";
import { headingProps } from "@/src/components/seo/SeoBlocks";
import { colors, spacing } from "@/src/constants/theme";
import { REELS_PATH } from "@/src/constants/reels";

const BEIGE = "#F6E7D3";
const INK_ON_BEIGE = "#7A3A12";

/** Hand-drawn loop around the price (slightly open, overshooting stroke). */
function DoodleCircle() {
  return (
    <Svg viewBox="0 0 240 120" preserveAspectRatio="none" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        d="M168 14 C 214 18, 236 44, 228 70 C 218 104, 150 114, 98 110 C 44 106, 8 88, 10 60 C 12 30, 58 10, 120 9 C 152 8, 182 12, 206 24"
        stroke="#FFFFFF"
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function ReelsTeaser({ isWide }: { width?: number; isWide: boolean }) {
  return (
    <View style={[styles.band, isWide && styles.bandWide, !isWide && styles.bandPhone]}>
      <View style={[styles.inner, isWide && styles.innerWide]}>
        <View style={[styles.copy, isWide && styles.copyWide]}>
          <Text style={styles.eyebrow}>Introducing CamReels</Text>
          <Text {...headingProps(2)} style={[styles.headline, isWide && styles.headlineWide, !isWide && styles.headlinePhone]}>
            Your content is already good.{"\n"}Now make it unforgettable.
          </Text>
          <Text style={[styles.sub, !isWide && styles.subPhone]}>
            CamReels puts a verified videographer with a DSLR and gimbal behind your next reel. Sharper, smoother, scroll-stopping. The kind of reel brands notice.
          </Text>
        </View>

        <View style={[styles.side, isWide ? styles.sideWide : styles.sideCenter]}>
          <View style={styles.priceWrap}>
            <DoodleCircle />
            <Text style={styles.priceFrom}>starting from</Text>
            <Text style={styles.price}>₹4,000</Text>
            <Text style={styles.priceUnit}>per edited reel</Text>
          </View>
          <Link href={REELS_PATH} asChild>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
              accessibilityRole="link"
              accessibilityLabel="Learn more about CamReels"
            >
              <Text style={styles.btnText}>Learn more</Text>
              <ArrowRight size={18} color={INK_ON_BEIGE} />
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.primary, paddingVertical: 48, paddingHorizontal: spacing.lg },
  bandPhone: { paddingVertical: 44 },
  headlinePhone: { fontSize: 26, lineHeight: 34 },
  subPhone: { fontSize: 15, lineHeight: 23 },
  /** Phones and tablets: price doodle and button centred under the copy. */
  sideCenter: { alignItems: "center", alignSelf: "stretch", paddingTop: spacing.sm },
  bandWide: { paddingVertical: 72, paddingHorizontal: 56 },
  inner: { width: "100%", maxWidth: 1120, alignSelf: "center", gap: spacing.xl },
  innerWide: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 72 },
  copy: { gap: spacing.md },
  copyWide: { flex: 1, maxWidth: 680 },
  eyebrow: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: "#FFE4D2", letterSpacing: 0.8, textTransform: "uppercase" },
  headline: { fontSize: 28, lineHeight: 36, fontWeight: "600", color: colors.white, letterSpacing: -0.4 },
  headlineWide: { fontSize: 40, lineHeight: 50 },
  sub: { fontSize: 16, lineHeight: 24, color: "rgba(255,255,255,0.92)", maxWidth: 600 },
  side: { alignItems: "flex-start", gap: spacing.lg },
  sideWide: { alignItems: "center", marginRight: 48 },
  priceWrap: { width: 220, height: 112, alignItems: "center", justifyContent: "center" },
  priceFrom: { fontSize: 12, color: "rgba(255,255,255,0.9)", fontStyle: "italic" },
  price: { fontSize: 36, lineHeight: 42, fontWeight: "600", color: colors.white, letterSpacing: -0.5 },
  priceUnit: { fontSize: 12, color: "rgba(255,255,255,0.9)" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: BEIGE,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 999,
  },
  btnText: { color: INK_ON_BEIGE, fontSize: 16, fontWeight: "600" },
});
