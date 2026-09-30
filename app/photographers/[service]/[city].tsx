/**
 * Programmatic SEO (pSEO) Page: /photographers/[service]/[city]
 * Generates Swiggy-tier pre-rendered landing pages for local search discovery.
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

// Tell Expo Router to pre-render these static paths during build
export function generateStaticParams() {
  return [
    { service: "wedding", city: "hyderabad" },
    { service: "pre-wedding", city: "hyderabad" },
    { service: "maternity", city: "bengaluru" },
  ];
}

export default function PhotographerCityHubPage() {
  const { service, city } = useLocalSearchParams<{ service: string; city: string }>();
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 1024;
  const isTablet = W >= 768 && W < 1024;

  const key = `${service || "wedding"}-${city || "hyderabad"}`;
  const data: PSeoHubConfig = PSEO_HUBS[key] || PSEO_HUBS["wedding-hyderabad"];

  const goToLogin = () => router.push("/(auth)/login");
  const goToHome = () => router.push("/landing");
  const goToServices = () => router.push("/services");

  // Structured Data
  const breadcrumbData = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: `${data.serviceName} in ${data.cityName}`, path: `/photographers/${data.serviceKey}/${data.cityKey}` },
  ]);

  const localBusinessData = createLocalBusinessSchema({
    city: data.cityName,
    serviceName: data.serviceName,
    path: `/photographers/${data.serviceKey}/${data.cityKey}`,
    minPrice: data.priceRange.min,
    maxPrice: data.priceRange.max,
    neighborhoods: data.neighborhoods,
  });

  return (
    <View style={styles.root}>
      <SEOHead
        title={data.metaTitle}
        description={data.metaDescription}
        canonicalPath={`/photographers/${data.serviceKey}/${data.cityKey}`}
        ogImage={data.heroImage}
        keywords={[
          `${data.serviceName.toLowerCase()} ${data.cityName.toLowerCase()}`,
          `best ${data.serviceName.toLowerCase()} in ${data.cityName.toLowerCase()}`,
          `hire ${data.serviceName.toLowerCase()} ${data.cityName.toLowerCase()}`,
          ...data.neighborhoods.map((n) => `${data.serviceName.toLowerCase()} in ${n.toLowerCase()}`),
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
          {/* Breadcrumbs */}
          <View style={styles.breadcrumbRow}>
            <Pressable onPress={goToHome}><Text style={styles.breadcrumbLink}>Home</Text></Pressable>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Pressable onPress={goToServices}><Text style={styles.breadcrumbLink}>Services</Text></Pressable>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Text style={styles.breadcrumbCurrent}>{data.cityName}</Text>
          </View>

          {/* Hero Banner */}
          <View style={[styles.heroCard, isWide && styles.heroCardWide]}>
            <View style={styles.heroContent}>
              <View style={styles.badgeRow}>
                <View style={styles.cityBadge}>
                  <MapPin size={13} color={colors.primaryDark} />
                  <Text style={styles.cityBadgeText}>{data.cityName} & Surrounding Hubs</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Star size={13} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>4.9/5 (148+ Audited Shoots)</Text>
                </View>
              </View>

              <Text style={[styles.h1, isWide && styles.h1Wide]}>{data.h1Title}</Text>
              <Text style={styles.subtitle}>{data.subtitle}</Text>

              <View style={styles.priceEstimateBox}>
                <Text style={styles.priceEstimateLabel}>Typical Verified Budget Range:</Text>
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
                <Text style={styles.primaryCtaBtnText}>Check Studio Availability in {data.cityName}</Text>
                <ArrowRight size={18} color={colors.white} />
              </Pressable>
            </View>

            <View style={[styles.heroImgFrame, isWide && styles.heroImgFrameWide]}>
              <SEOImage
                src={
                  Platform.OS === "web"
                    ? data.heroImage
                    : require("@/assets/images/blog1.webp")
                }
                alt={`${data.h1Title} — Verified photography and cinematic coverage across ${data.cityName}`}
                priority={true}
                style={styles.heroImg}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Neighborhood Badges (Hyperlocal pSEO) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Neighborhoods & Venues Served Across {data.cityName}</Text>
            <View style={styles.neighborhoodGrid}>
              {data.neighborhoods.map((n, i) => (
                <View key={i} style={styles.neighborhoodChip}>
                  <MapPin size={12} color={colors.primaryDark} />
                  <Text style={styles.neighborhoodText}>{n}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Localized Advice Callout */}
          <View style={styles.adviceBox}>
            <Sparkles size={20} color={colors.primaryDark} />
            <View style={styles.adviceContent}>
              <Text style={styles.adviceTitle}>Local Planning Insight for {data.cityName}</Text>
              <Text style={styles.adviceBody}>{data.localAdvice}</Text>
            </View>
          </View>

          {/* Verified Pricing Packages */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Curated Package Estimates in {data.cityName}</Text>
            <Text style={styles.sectionSubtitle}>
              Compare transparent deliverables. All bookings include escrow payment protection and free backup backfill.
            </Text>

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

          {/* Verified Protections (Swiggy Trust Factor) */}
          <View style={styles.trustGrid}>
            {[
              {
                icon: ShieldCheck,
                title: "100% KYC-Audited Studios",
                desc: "Every studio identity, GST credentials, and real gear are verified before onboarding.",
              },
              {
                icon: Clock,
                title: "1-Hour Backfill Guarantee",
                desc: "If an emergency arises, an equivalent backup crew is deployed automatically.",
              },
              {
                icon: Star,
                title: "Milestone Escrow Protection",
                desc: "Your funds stay protected in milestone escrow until deliverables meet agreed standards.",
              },
            ].map((trust, i) => {
              const IconComp = trust.icon;
              return (
                <View key={i} style={styles.trustCard}>
                  <IconComp size={24} color={colors.primaryDark} />
                  <Text style={styles.trustTitle}>{trust.title}</Text>
                  <Text style={styles.trustDesc}>{trust.desc}</Text>
                </View>
              );
            })}
          </View>

          {/* Frequently Asked Questions (GEO + SEO) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions in {data.cityName}</Text>
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

          {/* Bottom Unified CTA */}
          <View style={styles.ctaBanner}>
            <Text style={styles.ctaBannerTitle}>
              Ready to Book Your {data.serviceName} in {data.cityName}?
            </Text>
            <Text style={styles.ctaBannerSub}>
              Tell us your date and venue. We match you with verified local studios within minutes.
            </Text>
            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [styles.ctaBannerBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ctaBannerBtnText}>Get Free Instant Quotes</Text>
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
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  container: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
  },

  // Breadcrumbs
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  breadcrumbSep: {
    fontSize: 13,
    color: colors.muted,
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: colors.muted,
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  heroCardWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  heroContent: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
  },
  heroImgFrame: {
    width: "100%",
    height: 240,
    backgroundColor: colors.bgWarm,
  },
  heroImgFrameWide: {
    width: "44%",
    height: "100%",
    minHeight: 380,
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.sm,
  },
  cityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bgWarm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.peachBorder,
  },
  cityBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },

  h1: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 34,
    marginBottom: 8,
  },
  h1Wide: {
    fontSize: 34,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  priceEstimateBox: {
    backgroundColor: colors.cream,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 10,
    borderRadius: radiusSm,
    marginBottom: spacing.lg,
  },
  priceEstimateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  priceEstimateValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
    marginTop: 2,
  },
  priceAvgText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink,
  },
  primaryCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primaryDark,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radiusSm,
    alignSelf: "flex-start",
  },
  primaryCtaBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },

  // Sections
  sectionBlock: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.md,
  },

  // Neighborhoods
  neighborhoodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.sm,
  },
  neighborhoodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  neighborhoodText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },

  // Advice Box
  adviceBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.bgWarm,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    borderRadius: radius,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  adviceContent: {
    flex: 1,
  },
  adviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 4,
  },
  adviceBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },

  // Tiers Grid
  tiersGrid: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  tiersGridWide: {
    flexDirection: "row",
  },
  tierCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.lg,
    position: "relative",
  },
  tierCardFeatured: {
    borderColor: colors.primary,
    backgroundColor: colors.cream,
  },
  tierPopularBadge: {
    position: "absolute",
    top: -12,
    right: 16,
    backgroundColor: colors.primaryDark,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tierPopularBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  tierName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 6,
  },
  tierDesc: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  tierIncludesList: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  tierIncludeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierIncludeText: {
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  tierBtn: {
    paddingVertical: 11,
    borderRadius: radiusSm,
    alignItems: "center",
    justifyContent: "center",
  },
  tierBtnPrimary: {
    backgroundColor: colors.primaryDark,
  },
  tierBtnOutline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  tierBtnTextWhite: {
    color: colors.white,
  },
  tierBtnTextDark: {
    color: colors.text,
  },

  // Trust Grid
  trustGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  trustCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.lg,
    gap: 8,
  },
  trustTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  trustDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },

  // FAQ
  faqList: {
    gap: spacing.sm,
  },
  faqCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusSm,
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  faqQ: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryDark,
    flex: 1,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    paddingLeft: 26,
  },

  // CTA Banner
  ctaBanner: {
    backgroundColor: colors.bgWarm,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    borderRadius: radius,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  ctaBannerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  ctaBannerSub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 600,
    marginBottom: spacing.md,
  },
  ctaBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radiusSm,
  },
  ctaBannerBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
