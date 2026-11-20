/**
 * CamReels: main page of Book A Shoot's reels segment (/camreels).
 * No prices in the hero or closing CTA; exact prices live in the signed-in
 * booking flow. Copy comes from src/constants/reels.ts.
 */
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Link, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BadgeCheck, Camera, Check, Clapperboard, Layers, Sparkles, Users, Wallet, X } from "lucide-react-native";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { SEOHead } from "@/src/components/SEOHead";
import { PHONE_MAX_WIDTH, SwipeRow, headingProps } from "@/src/components/seo/SeoBlocks";
import { ReelsCtaButton, ReelsHero, ReelsStickyCta, camType } from "@/src/components/reels/ReelsBlocks";
import {
  REELS_AUDIENCES,
  REELS_COMPARISON,
  REELS_EDITING_OPTIONS,
  REELS_FAQS,
  REELS_PATH,
  REELS_PILLARS,
  REELS_STEPS,
  REELS_WAYS,
} from "@/src/constants/reels";
import { absoluteUrl, breadcrumbSchema, faqSchema } from "@/src/seo/structuredData";
import { SITE_URL } from "@/src/seo/seoContent";
import { colors, spacing } from "@/src/constants/theme";

const TITLE = "CamReels by Book A Shoot | Reels Shot on Camera, Not Phones";
const DESCRIPTION =
  "CamReels: Instagram Reels and Shorts shot on a DSLR with a gimbal by handpicked, verified videographers. Edited or raw, one reel, three, or 30 days of unlimited reels.";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "CamReels", path: REELS_PATH },
];

const camreelsSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "CamReels",
  alternateName: ["Cam Reels", "Reels videographer booking"],
  serviceType: "Instagram Reels and short-form video shooting",
  description: DESCRIPTION,
  url: absoluteUrl(REELS_PATH),
  brand: { "@type": "Brand", name: "CamReels" },
  provider: { "@id": `${SITE_URL}/#organization` },
  areaServed: { "@type": "Country", name: "India" },
};

const PILLAR_ICONS = [Camera, BadgeCheck, Wallet, Users];

export default function CamReelsPage() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const phone = width < PHONE_MAX_WIDTH;
  const cols = isWide ? styles.gridWide : null;
  const card = [styles.card, phone && styles.cardPhone];
  // Phones: a "Book now" bar slides in once the hero's own button scrolls away.
  const [showSticky, setShowSticky] = useState(false);
  const heroH = Math.round(width * (887 / 756));

  return (
    <View style={styles.root}>
      <SEOHead
        title={TITLE}
        description={DESCRIPTION}
        canonicalPath={REELS_PATH}
        ogImage="/reels-videographer-desktop.webp"
        keywords={[
          "CamReels",
          "reels videographer",
          "instagram reels shoot",
          "reels shooting services",
          "book a videographer for reels",
          "DSLR reels",
          "professional reels videographer near me",
          "content creator videographer",
        ]}
        structuredData={[breadcrumbSchema(crumbs), camreelsSchema, faqSchema(REELS_FAQS)]}
      />
      <UniversalNavbar activeRoute="services" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + (width >= 1024 ? 80 : 68), paddingBottom: phone ? 72 + insets.bottom : 0 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={
          phone
            ? (e) => {
                const next = e.nativeEvent.contentOffset.y > heroH - 40;
                if (next !== showSticky) setShowSticky(next);
              }
            : undefined
        }
      >
        <ReelsHero width={width} isWide={isWide} />

        {/* Breadcrumb */}
        <View style={[styles.container, styles.crumbs]}>
          <Link href={"/" as Href}>
            <Text style={styles.crumbLink}>Home</Text>
          </Link>
          <Text style={styles.crumbSep}>/</Text>
          <Text style={styles.crumbHere}>CamReels</Text>
        </View>

        {/* What is CamReels */}
        <PageSection
          isWide={isWide} phone={phone}
          eyebrow="What is CamReels"
          title="Reels that look like they cost more than they did."
          lead="CamReels is Book A Shoot's reels service. Tell us what you want to post, and a handpicked, verified videographer shoots it on a real camera with a gimbal. Edited and ready to post, or raw if you like to edit yourself."
        >
          <Cards phone={phone} isWide={isWide} wideStyle={styles.cardQuarter}>
            {REELS_PILLARS.map((p, i) => {
              const Icon = PILLAR_ICONS[i] ?? Sparkles;
              return (
                <View key={p.title} style={[card, styles.fillCard]}>
                  <View style={styles.iconDot}>
                    <Icon size={20} color={colors.primaryDark} />
                  </View>
                  <Text style={camType.cardTitle}>{p.title}</Text>
                  <Text style={camType.body}>{p.body}</Text>
                </View>
              );
            })}
          </Cards>
        </PageSection>

        {/* Phone reels vs CamReels */}
        <PageSection
          isWide={isWide} phone={phone}
          tone="white"
          eyebrow="Why it's different"
          title="Same reel idea. Very different reel."
          lead="Plenty of apps will send someone to film on a phone. CamReels is built the other way round."
        >
          {phone ? (
            <View style={styles.table}>
              {REELS_COMPARISON.map((row, i) => (
                <View key={row.label} style={[styles.compareItem, i === REELS_COMPARISON.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.compareLabel}>{row.label}</Text>
                  <View style={styles.tableCellRow}>
                    <Check size={16} color={colors.success} style={{ marginTop: 3 }} />
                    <Text style={[styles.tableText, { color: colors.ink, fontWeight: "500" }]}>{row.cam}</Text>
                  </View>
                  <View style={styles.tableCellRow}>
                    <X size={16} color={colors.muted} style={{ marginTop: 3 }} />
                    <Text style={[styles.tableText, styles.compareOther]}>Phone-shot: {row.phone}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.tableCellLabel, styles.tableHeadText]} />
              <Text style={[styles.tableCell, styles.tableHeadText]}>Phone-shot reels</Text>
              <Text style={[styles.tableCell, styles.tableHeadText, { color: colors.primaryDark }]}>CamReels</Text>
            </View>
            {REELS_COMPARISON.map((row, i) => (
              <View key={row.label} style={[styles.tableRow, i === REELS_COMPARISON.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.tableCellLabel}>{row.label}</Text>
                <View style={[styles.tableCell, styles.tableCellRow]}>
                  <X size={16} color={colors.muted} />
                  <Text style={styles.tableText}>{row.phone}</Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellRow]}>
                  <Check size={16} color={colors.success} />
                  <Text style={[styles.tableText, { color: colors.ink }]}>{row.cam}</Text>
                </View>
              </View>
            ))}
          </View>
          )}
        </PageSection>

        {/* Edited or raw */}
        <PageSection
          isWide={isWide} phone={phone}
          eyebrow="Your call"
          title="Edited or raw. You decide."
          lead="Want reels you can post tonight? Go edited. Prefer your own edit? Take the raw camera clips for less."
        >
          <View style={[styles.grid, cols]}>
            {REELS_EDITING_OPTIONS.map((o, i) => (
              <View key={o.id} style={[card, isWide && styles.cardHalf]}>
                <View style={styles.iconDot}>{i === 0 ? <Clapperboard size={20} color={colors.primaryDark} /> : <Layers size={20} color={colors.primaryDark} />}</View>
                <Text style={camType.cardTitle}>{o.title}</Text>
                <Text style={camType.body}>{o.body}</Text>
              </View>
            ))}
          </View>
        </PageSection>

        {/* Ways to book (no prices; prices live in the app) */}
        <PageSection
          isWide={isWide} phone={phone}
          tone="white"
          eyebrow="Ways to book"
          title="One reel, three, or a whole month."
          lead="Every option is shot on a real camera. Fixed prices, shown in the app before you send."
        >
          <View style={[styles.grid, cols]}>
            {REELS_WAYS.map((w, i) => (
              <View key={w.title} style={[card, isWide && styles.cardThird, i === 2 && styles.cardFeatured]}>
                <Text style={camType.cardTitle}>{w.title}</Text>
                <Text style={camType.body}>{w.body}</Text>
              </View>
            ))}
          </View>
        </PageSection>

        {/* CamReels Monthly spotlight (no price; price lives in the app) */}
        <MonthlySpotlight width={width} isWide={isWide} phone={phone} />

        {/* Made for */}
        <PageSection isWide={isWide} phone={phone} tone="white" eyebrow="Made for" title="If you post, CamReels is for you.">
          <Cards phone={phone} isWide={isWide} wideStyle={styles.cardThird}>
            {REELS_AUDIENCES.map((a) => (
              <View key={a.title} style={[card, styles.fillCard]}>
                <Text style={camType.cardTitle}>{a.title}</Text>
                <Text style={camType.body}>{a.body}</Text>
              </View>
            ))}
          </Cards>
        </PageSection>

        {/* How it works */}
        <PageSection isWide={isWide} phone={phone} eyebrow="How it works" title="Brief once. Choose. Shoot. Post.">
          <Cards phone={phone} isWide={isWide} wideStyle={styles.cardQuarter}>
            {REELS_STEPS.map((s, i) => (
              <View key={s.title} style={[card, styles.fillCard]}>
                <Text style={styles.stepNum}>{String(i + 1).padStart(2, "0")}</Text>
                <Text style={camType.cardTitle}>{s.title}</Text>
                <Text style={camType.body}>{s.body}</Text>
              </View>
            ))}
          </Cards>
        </PageSection>

        {/* FAQ */}
        <PageSection isWide={isWide} phone={phone} tone="white" eyebrow="FAQ" title="Questions, answered.">
          <View style={[styles.faqList, phone && styles.faqListPhone]}>
            {REELS_FAQS.map((f, i) => (
              <View key={f.q} style={[styles.faqItem, phone && styles.faqItemPhone, i === REELS_FAQS.length - 1 && { borderBottomWidth: 0 }]}>
                <Text {...headingProps(3)} style={camType.cardTitle}>
                  {f.q}
                </Text>
                <Text style={camType.body}>{f.a}</Text>
              </View>
            ))}
          </View>
        </PageSection>

        {/* Closing CTA (no price) */}
        <View style={[styles.ctaBand, isWide && styles.ctaBandWide, phone && styles.ctaBandPhone]}>
          <View style={[styles.container, styles.ctaInner, isWide && styles.ctaInnerWide]}>
            <View style={{ gap: spacing.md, flex: isWide ? 1 : undefined }}>
              <Text {...headingProps(2)} style={[camType.h2, !isWide && camType.h2Phone, { color: colors.white }]}>
                Your next reel deserves a real camera.
              </Text>
              <Text style={[camType.lead, phone && camType.leadPhone, { color: "rgba(255,255,255,0.92)" }]}>
                Handpicked videographers. DSLR and gimbal. Edited or raw. Book in a few taps.
              </Text>
            </View>
            <ReelsCtaButton placement="camreels_footer" variant="light" full={phone} />
          </View>
        </View>

        <UniversalFooter />
      </ScrollView>
      {phone ? <ReelsStickyCta visible={showSticky} bottomInset={insets.bottom} /> : null}
    </View>
  );
}

/** Swipeable row on phones, a grid everywhere else. */
function Cards({ phone, isWide, wideStyle, children }: { phone: boolean; isWide: boolean; wideStyle: object; children: React.ReactNode }) {
  if (phone) return <SwipeRow>{children}</SwipeRow>;
  return (
    <View style={[styles.grid, isWide && styles.gridWide]}>
      {React.Children.map(children, (c) => (
        <View style={isWide ? wideStyle : null}>{c}</View>
      ))}
    </View>
  );
}

function MonthlySpotlight({ isWide, phone }: { width: number; isWide: boolean; phone: boolean }) {
  return (
    <View style={[styles.ctaBand, isWide && styles.ctaBandWide, phone && styles.ctaBandPhone]}>
      <View style={[styles.container, styles.spotlightCopy]}>
        <Text style={[camType.eyebrow, { color: "#FFE4D2" }]}>CamReels Monthly</Text>
        <Text {...headingProps(2)} style={[camType.h2, !isWide && camType.h2Phone, { color: colors.white }]}>
          Unlimited reels.{"\n"}30 days.{"\n"}One videographer.
        </Text>
        <Text style={[camType.lead, phone && camType.leadPhone, { color: "rgba(255,255,255,0.92)", maxWidth: 520 }]}>
          Your content calendar gets its own videographer. Shoot as often as you post, with the same person and the same style all month.
        </Text>
        <ReelsCtaButton placement="camreels_monthly" label="See the price in the app" variant="light" full={phone} />
      </View>
    </View>
  );
}

function PageSection({
  isWide,
  phone = false,
  tone = "cream",
  eyebrow,
  title,
  lead,
  children,
}: {
  isWide: boolean;
  phone?: boolean;
  tone?: "cream" | "white";
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, isWide && styles.sectionWide, phone && styles.sectionPhone, tone === "white" && { backgroundColor: colors.card }]}>
      <View style={styles.container}>
        <View style={[styles.sectionHead, phone && styles.sectionHeadPhone]}>
          <Text style={camType.eyebrow}>{eyebrow}</Text>
          <Text {...headingProps(2)} style={[camType.h2, !isWide && camType.h2Phone]}>
            {title}
          </Text>
          {lead ? <Text style={[camType.lead, phone && camType.leadPhone, { maxWidth: 720 }]}>{lead}</Text> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

const SECTION_GAP = 32;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { width: "100%", maxWidth: 1120, alignSelf: "center", paddingHorizontal: spacing.lg },
  crumbs: { flexDirection: "row", gap: spacing.sm, paddingTop: spacing.lg, alignItems: "center" },
  crumbLink: { fontSize: 13, color: colors.primaryDark },
  crumbSep: { fontSize: 13, color: colors.muted },
  crumbHere: { fontSize: 13, color: colors.muted },
  section: { paddingVertical: 48 },
  sectionPhone: { paddingVertical: 40 },
  sectionHeadPhone: { gap: spacing.sm, marginBottom: spacing.xl },
  cardPhone: { padding: 20 },
  fillCard: { flex: 1 },
  compareItem: { padding: spacing.lg, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  compareLabel: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: colors.primaryDark, letterSpacing: 0.6, textTransform: "uppercase" },
  compareOther: { fontSize: 14, lineHeight: 20 },
  faqListPhone: { paddingHorizontal: spacing.lg },
  faqItemPhone: { paddingVertical: 18, gap: 6 },
  ctaBandPhone: { paddingVertical: 44 },
  sectionWide: { paddingVertical: 72 },
  sectionHead: { gap: spacing.md, marginBottom: SECTION_GAP },
  grid: { gap: spacing.lg },
  gridWide: { flexDirection: "row", flexWrap: "wrap" },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cardHalf: { flexBasis: "48%", flexGrow: 1 },
  cardThird: { flexBasis: "31%", flexGrow: 1 },
  cardQuarter: { flexBasis: "22%", flexGrow: 1 },
  cardFeatured: { borderColor: colors.primary, borderWidth: 2 },
  iconDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  stepNum: { fontSize: 15, lineHeight: 22, color: colors.primaryDark, fontWeight: "600" },
  table: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: "hidden" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  tableHead: { backgroundColor: colors.cream },
  tableHeadText: { fontSize: 15, lineHeight: 22, fontWeight: "600", color: colors.ink },
  tableCellLabel: { width: 96, fontSize: 15, lineHeight: 22, fontWeight: "600", color: colors.ink },
  tableCell: { flex: 1 },
  tableCellRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  tableText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.muted },
  faqList: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: spacing.xl },
  faqItem: { paddingVertical: spacing.xl, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  spotlightCopy: { gap: spacing.lg },
  ctaBand: { backgroundColor: colors.primary, paddingVertical: 48 },
  ctaBandWide: { paddingVertical: 72 },
  ctaInner: { gap: spacing.xl },
  ctaInnerWide: { flexDirection: "row", alignItems: "center" },
});
