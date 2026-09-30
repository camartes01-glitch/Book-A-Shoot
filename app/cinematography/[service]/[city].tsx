/**
 * Programmatic SEO (pSEO) Page: /cinematography/[service]/[city]
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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import { SEOHead } from "@/src/components/SEOHead";
import { SEOImage } from "@/src/components/SEOImage";
import { PSEO_HUBS, type PSeoHubConfig } from "@/src/constants/pSeoData";
import {
  createBreadcrumbSchema,
  createLocalBusinessSchema,
} from "@/src/constants/seoSchemas";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react-native";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";

export function generateStaticParams() {
  return [
    { service: "drone", city: "hyderabad" },
  ];
}

export default function CinematographyCityHubPage() {
  const { service, city } = useLocalSearchParams<{ service: string; city: string }>();
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 1024;

  const key = `${service || "drone"}-${city || "hyderabad"}`;
  const data: PSeoHubConfig = PSEO_HUBS[key] || PSEO_HUBS["drone-hyderabad"];

  const goToLogin = () => router.push("/(auth)/login");
  const goToHome = () => router.push("/landing");
  const goToServices = () => router.push("/services");

  const breadcrumbData = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: `${data.serviceName} in ${data.cityName}`, path: `/cinematography/${data.serviceKey}/${data.cityKey}` },
  ]);

  const localBusinessData = createLocalBusinessSchema({
    city: data.cityName,
    serviceName: data.serviceName,
    path: `/cinematography/${data.serviceKey}/${data.cityKey}`,
    minPrice: data.priceRange.min,
    maxPrice: data.priceRange.max,
    neighborhoods: data.neighborhoods,
  });

  return (
    <View style={styles.root}>
      <SEOHead
        title={data.metaTitle}
        description={data.metaDescription}
        canonicalPath={`/cinematography/${data.serviceKey}/${data.cityKey}`}
        ogImage={data.heroImage}
        keywords={[
          `${data.serviceName.toLowerCase()} ${data.cityName.toLowerCase()}`,
          `best ${data.serviceName.toLowerCase()} in ${data.cityName.toLowerCase()}`,
          `drone videography ${data.cityName.toLowerCase()}`,
          ...data.neighborhoods.map((n) => `drone shoot in ${n.toLowerCase()}`),
        ]}
        structuredData={[breadcrumbData, localBusinessData]}
      />

      <UniversalNavbar activeRoute="services" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + (isWide ? 96 : 84),
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.breadcrumbRow}>
            <Pressable onPress={goToHome}><Text style={styles.breadcrumbLink}>Home</Text></Pressable>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Pressable onPress={goToServices}><Text style={styles.breadcrumbLink}>Services</Text></Pressable>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Text style={styles.breadcrumbCurrent}>{data.cityName}</Text>
          </View>

          <View style={[styles.heroCard, isWide && styles.heroCardWide]}>
            <View style={styles.heroContent}>
              <View style={styles.badgeRow}>
                <View style={styles.cityBadge}>
                  <MapPin size={13} color={colors.primaryDark} />
                  <Text style={styles.cityBadgeText}>{data.cityName} Commercial Aerial Crew</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Star size={13} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>4.9/5 Certified Safe Flights</Text>
                </View>
              </View>

              <Text style={[styles.h1, isWide && styles.h1Wide]}>{data.h1Title}</Text>
              <Text style={styles.subtitle}>{data.subtitle}</Text>

              <View style={styles.priceEstimateBox}>
                <Text style={styles.priceEstimateLabel}>Verified Drone Package Range:</Text>
                <Text style={styles.priceEstimateValue}>
                  ₹{data.priceRange.min} – ₹{data.priceRange.max}{" "}
                  <Text style={styles.priceAvgText}>(Avg: ₹{data.priceRange.avg})</Text>
                </Text>
              </View>

              <Pressable
                onPress={goToLogin}
                style={({ pressed }) => [styles.primaryCtaBtn, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.primaryCtaBtnText}>Check Drone Pilot Availability</Text>
                <ArrowRight size={18} color={colors.white} />
              </Pressable>
            </View>

            <View style={[styles.heroImgFrame, isWide && styles.heroImgFrameWide]}>
              <SEOImage
                src={
                  Platform.OS === "web"
                    ? data.heroImage
                    : require("@/assets/images/hero2.webp")
                }
                alt={`${data.h1Title} — Licensed drone pilots and cinematic 4K aerial videography in ${data.cityName}`}
                priority={true}
                style={styles.heroImg}
                resizeMode="cover"
              />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Venues & Flight Zones Across {data.cityName}</Text>
            <View style={styles.neighborhoodGrid}>
              {data.neighborhoods.map((n, i) => (
                <View key={i} style={styles.neighborhoodChip}>
                  <MapPin size={12} color={colors.primaryDark} />
                  <Text style={styles.neighborhoodText}>{n}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.adviceBox}>
            <Sparkles size={20} color={colors.primaryDark} />
            <View style={styles.adviceContent}>
              <Text style={styles.adviceTitle}>DGCA Compliance & Venue Permissions in {data.cityName}</Text>
              <Text style={styles.adviceBody}>{data.localAdvice}</Text>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Curated Aerial Packages in {data.cityName}</Text>
            <View style={[styles.tiersGrid, isWide && styles.tiersGridWide]}>
              {data.pricingTiers.map((tier, idx) => (
                <View key={idx} style={[styles.tierCard, idx === 1 && styles.tierCardFeatured]}>
                  {idx === 1 && (
                    <View style={styles.tierPopularBadge}>
                      <Text style={styles.tierPopularBadgeText}>Most Popular</Text>
                    </View>
                  )}
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierPrice}>{tier.price}</Text>
                  <Text style={styles.tierDesc}>{tier.description}</Text>

                  <View style={styles.tierIncludesList}>
                    {tier.includes.map((inc, i) => (
                      <View key={i} style={styles.tierIncludeRow}>
                        <CheckCircle2 size={15} color={colors.primaryDark} />
                        <Text style={styles.tierIncludeText}>{inc}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={goToLogin}
                    style={({ pressed }) => [
                      styles.tierBtn,
                      idx === 1 ? styles.tierBtnPrimary : styles.tierBtnOutline,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tierBtnText,
                        idx === 1 ? styles.tierBtnTextWhite : styles.tierBtnTextDark,
                      ]}
                    >
                      Book This Tier
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Frequently Asked Drone Questions in {data.cityName}</Text>
            <View style={styles.faqList}>
              {data.faqs.map((faq, idx) => (
                <View key={idx} style={styles.faqCard}>
                  <View style={styles.faqHeader}>
                    <HelpCircle size={18} color={colors.primaryDark} />
                    <Text style={styles.faqQ}>{faq.q}</Text>
                  </View>
                  <Text style={styles.faqA}>{faq.a}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.ctaBanner}>
            <Text style={styles.ctaBannerTitle}>
              Book Certified Aerial Cinematography in {data.cityName}
            </Text>
            <Text style={styles.ctaBannerSub}>
              Milestone escrow protection. 4K delivery. Live LED feed support.
            </Text>
            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [styles.ctaBannerBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ctaBannerBtnText}>Check Pilot Availability</Text>
              <ArrowRight size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <UniversalFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingHorizontal: spacing.md },
  breadcrumbRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md },
  breadcrumbLink: { fontSize: 13, color: colors.primaryDark, fontWeight: "600" },
  breadcrumbSep: { fontSize: 13, color: colors.muted },
  breadcrumbCurrent: { fontSize: 13, color: colors.muted },
  heroCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius, overflow: "hidden", marginBottom: spacing.xl },
  heroCardWide: { flexDirection: "row", alignItems: "stretch" },
  heroContent: { flex: 1, padding: spacing.xl, justifyContent: "center" },
  heroImgFrame: { width: "100%", height: 240, backgroundColor: colors.bgWarm },
  heroImgFrameWide: { width: "44%", height: "100%", minHeight: 380 },
  heroImg: { width: "100%", height: "100%" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm },
  cityBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.bgWarm, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.peachBorder },
  cityBadgeText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14 },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  h1: { fontSize: 26, fontWeight: "800", color: colors.text, lineHeight: 34, marginBottom: 8 },
  h1Wide: { fontSize: 34, lineHeight: 42 },
  subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted, marginBottom: spacing.md },
  priceEstimateBox: { backgroundColor: colors.cream, borderLeftWidth: 3, borderLeftColor: colors.primary, padding: 10, borderRadius: radiusSm, marginBottom: spacing.lg },
  priceEstimateLabel: { fontSize: 12, fontWeight: "600", color: colors.muted },
  priceEstimateValue: { fontSize: 16, fontWeight: "800", color: colors.primaryDark, marginTop: 2 },
  priceAvgText: { fontSize: 13, fontWeight: "500", color: colors.ink },
  primaryCtaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primaryDark, paddingVertical: 14, paddingHorizontal: 22, borderRadius: radiusSm, alignSelf: "flex-start" },
  primaryCtaBtnText: { fontSize: 15, fontWeight: "700", color: colors.white },
  sectionBlock: { marginBottom: spacing.xxl },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 6 },
  neighborhoodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.sm },
  neighborhoodChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20 },
  neighborhoodText: { fontSize: 13, fontWeight: "600", color: colors.text },
  adviceBox: { flexDirection: "row", gap: 12, backgroundColor: colors.bgWarm, borderWidth: 1.5, borderColor: colors.peachBorder, borderRadius: radius, padding: spacing.lg, marginBottom: spacing.xxl },
  adviceContent: { flex: 1 },
  adviceTitle: { fontSize: 15, fontWeight: "800", color: colors.primaryDark, marginBottom: 4 },
  adviceBody: { fontSize: 14, lineHeight: 22, color: colors.text },
  tiersGrid: { gap: spacing.md, marginTop: spacing.sm },
  tiersGridWide: { flexDirection: "row" },
  tierCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: spacing.lg, position: "relative" },
  tierCardFeatured: { borderColor: colors.primary, backgroundColor: colors.cream },
  tierPopularBadge: { position: "absolute", top: -12, right: 16, backgroundColor: colors.primaryDark, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
  tierPopularBadgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  tierName: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 4 },
  tierPrice: { fontSize: 20, fontWeight: "800", color: colors.primaryDark, marginBottom: 6 },
  tierDesc: { fontSize: 13, color: colors.muted, marginBottom: spacing.md, lineHeight: 18 },
  tierIncludesList: { gap: 8, marginBottom: spacing.lg },
  tierIncludeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierIncludeText: { fontSize: 13, color: colors.ink, flex: 1 },
  tierBtn: { paddingVertical: 11, borderRadius: radiusSm, alignItems: "center", justifyContent: "center" },
  tierBtnPrimary: { backgroundColor: colors.primaryDark },
  tierBtnOutline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tierBtnText: { fontSize: 14, fontWeight: "700" },
  tierBtnTextWhite: { color: colors.white },
  tierBtnTextDark: { color: colors.text },
  faqList: { gap: spacing.sm },
  faqCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radiusSm, padding: spacing.md },
  faqHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  faqQ: { fontSize: 15, fontWeight: "700", color: colors.primaryDark, flex: 1 },
  faqA: { fontSize: 14, lineHeight: 22, color: colors.text, paddingLeft: 26 },
  ctaBanner: { backgroundColor: colors.bgWarm, borderWidth: 1.5, borderColor: colors.peachBorder, borderRadius: radius, padding: spacing.xl, alignItems: "center", marginBottom: spacing.xxl },
  ctaBannerTitle: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: 6 },
  ctaBannerSub: { fontSize: 14, color: colors.muted, textAlign: "center", maxWidth: 600, marginBottom: spacing.md },
  ctaBannerBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primaryDark, paddingVertical: 12, paddingHorizontal: 24, borderRadius: radiusSm },
  ctaBannerBtnText: { fontSize: 15, fontWeight: "700", color: colors.white },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
