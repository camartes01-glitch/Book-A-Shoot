/**
 * Book A Shoot — Dedicated Blog & Insights
 *
 * Feature Article:
 * "Indian Wedding Photography Trends 2026: From Perfect Poses to Real Stories"
 *
 * Fully responsive for Desktop, Tablet, and Mobile.
 * Includes structured data (BlogPosting JSON-LD) and meta optimization for SEO & AI search.
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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import { SEOHead } from "@/src/components/SEOHead";
import { SEOImage } from "@/src/components/SEOImage";
import { createBreadcrumbSchema } from "@/src/constants/seoSchemas";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Film,
  Heart,
  HelpCircle,
  Layers,
  MapPin,
  MessageSquareQuote,
  Share2,
  Sparkles,
  Tv,
  Users,
  Video,
} from "lucide-react-native";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";

export default function BlogsPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 1024;
  const isTablet = W >= 768 && W < 1024;
  const isMobile = W < 768;

  const goToLogin = () => router.push("/(auth)/login");
  const goToHome = () => router.push("/landing");
  const goToServices = () => router.push("/services");

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline:
      "Indian Wedding Photography Trends 2026: From Perfect Poses to Real Stories",
    description:
      "Discover the biggest Indian wedding photography trends in 2026, from documentary photography and cinematic films to Reels, content creators, drones and same-day edits.",
    image: ["https://www.bookashoot.online/blog1.webp"],
    datePublished: "2026-09-25",
    dateModified: "2026-10-01",
    author: {
      "@type": "Organization",
      name: "Camartes Editorial Desk",
      url: "https://www.bookashoot.online/about",
    },
    publisher: {
      "@type": "Organization",
      name: "Camartes Book A Shoot",
      logo: {
        "@type": "ImageObject",
        url: "https://www.bookashoot.online/applogo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://www.bookashoot.online/blogs",
    },
  };

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Blogs & Insights", path: "/blogs" },
    {
      name: "Indian Wedding Photography Trends 2026",
      path: "/blogs",
    },
  ]);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: "Indian Wedding Photography Trends 2026",
          url:
            typeof window !== "undefined"
              ? window.location.href
              : "https://www.bookashoot.online/blogs",
        })
        .catch(() => {});
    }
  };

  return (
    <View style={styles.root}>
      <SEOHead
        title="Indian Wedding Photography Trends 2026: What's Changing? — Book A Shoot"
        description="Discover the biggest Indian wedding photography trends in 2026, from documentary photography and cinematic films to Reels, content creators, drones and same-day edits."
        canonicalPath="/blogs"
        ogImage="/blog1.webp"
        ogType="article"
        publishedTime="2026-09-25T00:00:00+05:30"
        modifiedTime="2026-10-01T00:00:00+05:30"
        author="Camartes Editorial Desk"
        keywords={[
          "wedding photography trends 2026 india",
          "indian wedding photography",
          "candid wedding photography",
          "wedding content creator india",
          "wedding reels",
          "cinematic wedding videography",
          "drone wedding photography",
          "same day wedding edit",
        ]}
        structuredData={[blogPostingSchema, breadcrumbSchema]}
      />

      {/* ── Universal Navbar ────────────────────────────────────────── */}
      <UniversalNavbar activeRoute="blogs" />

      {/* ── Main Content Scroll ────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + (isWide ? 96 : 84),
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Outer Responsive Wrapper ──────────────────────────────── */}
        <View style={styles.outerContainer}>
          <View
            style={[
              styles.articleWrapper,
              isWide && styles.articleWrapperWide,
              isTablet && styles.articleWrapperTablet,
            ]}
          >
            {/* Breadcrumb Navigation */}
            <View style={styles.breadcrumbRow}>
              <Pressable onPress={goToHome} style={styles.breadcrumbItem}>
                <Text style={styles.breadcrumbLink}>Home</Text>
              </Pressable>
              <Text style={styles.breadcrumbSep}>/</Text>
              <Text style={styles.breadcrumbCurrent}>Blogs & Insights</Text>
            </View>

            {/* Header Badge & Meta Row */}
            <View style={styles.articleHeader}>
              <View style={styles.categoryBadge}>
                <Sparkles size={13} color={colors.primaryDark} />
                <Text style={styles.categoryBadgeText}>Wedding Photography</Text>
              </View>

              <Text
                style={[
                  styles.mainTitle,
                  isWide && styles.mainTitleWide,
                  isTablet && styles.mainTitleTablet,
                ]}
              >
                Indian Wedding Photography Trends 2026: From Perfect Poses to Real Stories
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaAuthor}>Written by Camartes Editorial Desk</Text>
                  <View style={styles.metaChipsRow}>
                    <View style={styles.metaChip}>
                      <Calendar size={13} color={colors.muted} />
                      <Text style={styles.metaChipText}>September 2026</Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.metaChip}>
                      <Clock size={13} color={colors.muted} />
                      <Text style={styles.metaChipText}>8–10 min read</Text>
                    </View>
                  </View>
                </View>

                {Platform.OS === "web" && (
                  <Pressable
                    onPress={handleShare}
                    style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Share this article"
                  >
                    <Share2 size={16} color={colors.text} />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Featured Image */}
            <View style={styles.featuredImageWrapper}>
              <SEOImage
                src={
                  Platform.OS === "web"
                    ? "/blog1.webp"
                    : require("@/assets/images/blog1.webp")
                }
                alt="Indian Wedding Photography Trends 2026: Candid bride and groom moments captured by verified documentary photographer"
                priority={true}
                style={styles.featuredImage}
                resizeMode="cover"
              />
              <Text style={styles.imageCaption}>
                Candid wedding photography capturing authentic emotions, familial warmth, and unscripted celebration moments.
              </Text>
            </View>

            {/* Introduction Lead Paragraphs */}
            <View style={styles.introSection}>
              <Text style={styles.leadParagraph}>
                Indian wedding photography is changing in 2026.
              </Text>
              <Text style={styles.paragraph}>
                Couples are looking beyond traditional posed photographs and increasingly exploring{" "}
                <Text style={styles.boldText}>
                  candid photography, documentary-style storytelling, cinematic wedding films, wedding content creators, Instagram Reels, drone photography, same-day edits and personalised wedding coverage.
                </Text>
              </Text>
              <Text style={styles.paragraph}>
                But the biggest change is not a camera, editing style or social media trend.
              </Text>
              <Text style={[styles.paragraph, styles.highlightStatement]}>
                It is the expectation that wedding photography should capture the{" "}
                <Text style={styles.boldUnderline}>complete experience of the celebration.</Text>
              </Text>

              {/* Poetic Moment Cards */}
              <View style={styles.momentsCard}>
                <Text style={styles.momentsCardTitle}>The real moments that matter:</Text>
                <View style={styles.momentsList}>
                  {[
                    "The nervous smile before the ceremony.",
                    "The mother fixing the bride's jewellery.",
                    "The groom waiting for the baraat.",
                    "The grandparents watching from the side.",
                    "Friends dancing when nobody is posing.",
                    "The quiet moments between two ceremonies.",
                    "The chaos backstage.",
                    "The unexpected laugh that nobody planned.",
                  ].map((moment, idx) => (
                    <View key={idx} style={styles.momentRow}>
                      <View style={styles.momentDot} />
                      <Text style={styles.momentText}>{moment}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.momentsConclusion}>
                  These are the moments that turn a collection of photographs into a story.
                </Text>
              </View>
            </View>

            {/* ── Quick Answer Box (AI Search Grounding Block) ────── */}
            <View style={styles.quickAnswerBox}>
              <View style={styles.quickAnswerHeader}>
                <HelpCircle size={20} color={colors.primaryDark} />
                <Text style={styles.quickAnswerTitle}>
                  Quick Answer: What Are the Biggest Indian Wedding Photography Trends in 2026?
                </Text>
              </View>
              <Text style={styles.quickAnswerBody}>
                The major Indian wedding photography trends in 2026 include{" "}
                <Text style={styles.boldText}>
                  candid and documentary photography, cinematic wedding films, wedding content creators, short-form Reels, drone photography, same-day edits, natural colour grading and personalised visual storytelling.
                </Text>
              </Text>
              <Text style={styles.quickAnswerSub}>
                Each service serves a different purpose. A photographer focuses on photographs, a videographer captures motion and sound, a content creator focuses on fast social-media-ready content, and drone coverage can provide an aerial perspective of the celebration.
              </Text>
              <Text style={styles.quickAnswerAction}>
                For couples, choosing the right photography service therefore starts with understanding{" "}
                <Text style={styles.boldText}>what they want to remember and how they want to experience those memories.</Text>
              </Text>
            </View>

            {/* ── Key Takeaways Card ─────────────────────────────────── */}
            <View style={styles.takeawaysCard}>
              <View style={styles.takeawaysHeader}>
                <CheckCircle2 size={20} color={colors.primaryDark} />
                <Text style={styles.takeawaysTitle}>Key Takeaways for Couples</Text>
              </View>
              <View style={styles.takeawaysGrid}>
                {[
                  "Candid photography focuses on natural moments rather than only posed photographs.",
                  "Documentary wedding photography tells the story of the celebration as it unfolds.",
                  "Traditional photography remains important for family portraits and important ceremonies.",
                  "Cinematic videography captures movement, sound and emotion.",
                  "Wedding content creators focus on Reels, short videos and behind-the-scenes content.",
                  "Drone photography can capture the scale and setting of a wedding.",
                  "Same-day edits allow couples and guests to watch a short wedding film during the celebration.",
                  "Natural colours and realistic skin tones are becoming increasingly important.",
                  "Couples are looking for photography that reflects their personalities rather than following a fixed template.",
                  "The right combination of services depends on the event, location, schedule and priorities.",
                ].map((item, idx) => (
                  <View key={idx} style={styles.takeawayItem}>
                    <Text style={styles.takeawayCheck}>✓</Text>
                    <Text style={styles.takeawayText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* ── SECTION 1 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                1. The Shift From Posed Photography to Real Moments
              </Text>
              <Text style={styles.paragraph}>
                For many years, wedding photography followed a familiar pattern.
              </Text>
              <View style={styles.staccatoList}>
                <Text style={styles.staccatoLine}>• The bride and groom stood together.</Text>
                <Text style={styles.staccatoLine}>• Families lined up.</Text>
                <Text style={styles.staccatoLine}>• Friends gathered.</Text>
                <Text style={styles.staccatoLine}>• Everyone looked at the camera.</Text>
                <Text style={styles.staccatoLine}>• Someone said, "Smile please."</Text>
              </View>
              <Text style={styles.paragraph}>
                Those photographs still have an important place in Indian weddings. Family portraits, group photographs and traditional ceremony photographs remain memories that families often treasure for generations.
              </Text>
              <Text style={styles.paragraph}>
                But today's couples are also looking for something more. They want photographs that capture what actually happened.
              </Text>
              <View style={styles.staccatoList}>
                <Text style={styles.staccatoLine}>• The bride laughing with her sister.</Text>
                <Text style={styles.staccatoLine}>• The groom becoming emotional while seeing his parents.</Text>
                <Text style={styles.staccatoLine}>• Friends dancing before the photographer is ready.</Text>
                <Text style={styles.staccatoLine}>• A grandmother watching the ceremony.</Text>
                <Text style={styles.staccatoLine}>• A father quietly looking at his daughter.</Text>
              </View>
              <Text style={styles.paragraph}>
                These moments cannot always be planned. They have to be noticed. That is one reason documentary and candid approaches have become increasingly important in modern wedding photography.
              </Text>

              {/* Subsection: Documentary */}
              <View style={styles.subBlock}>
                <Text style={styles.subHeading}>What Is Documentary Wedding Photography?</Text>
                <Text style={styles.paragraph}>
                  Documentary wedding photography focuses on capturing genuine moments as they happen instead of directing every photograph.
                </Text>
                <Text style={styles.paragraph}>
                  The photographer observes the people, emotions, relationships and events and documents them naturally. The result is not simply a collection of beautiful photographs. It becomes a visual story of the wedding.
                </Text>
              </View>

              {/* Callout Quote Box */}
              <View style={styles.quoteCallout}>
                <MessageSquareQuote size={24} color={colors.primaryDark} />
                <View style={styles.quoteContent}>
                  <Text style={styles.quoteTitle}>A useful question to ask a photographer:</Text>
                  <Text style={styles.quoteBody}>
                    Instead of asking only: <Text style={styles.boldText}>"Can you take beautiful photographs?"</Text>
                    {"\n\n"}
                    Also ask: <Text style={styles.boldText}>"How do you capture moments that are not planned?"</Text>
                  </Text>
                  <Text style={styles.quoteNote}>
                    The answer can tell you a lot about the photographer's approach.
                  </Text>
                </View>
              </View>
            </View>

            {/* ── SECTION 2 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                2. Candid Wedding Photography Is Becoming More Personal
              </Text>
              <Text style={styles.paragraph}>
                Candid photography has been popular in India for years. But candid does not simply mean asking a couple to walk slowly while looking at each other.
              </Text>
              <Text style={styles.paragraph}>
                True candid photography is about capturing moments without making them feel artificial. A genuine laugh. An unexpected hug. A nervous expression. A friend's reaction. A parent's tears. A child running through the ceremony. The little moments between the major events.
              </Text>
              <Text style={[styles.paragraph, styles.boldText]}>
                The goal is not perfection. The goal is authenticity.
              </Text>

              {/* Comparison Grid */}
              <View style={styles.subBlock}>
                <Text style={styles.subHeading}>Candid vs Traditional Wedding Photography</Text>
                <View style={[styles.compareGrid, isWide && styles.compareGridWide]}>
                  <View style={styles.compareCard}>
                    <View style={styles.compareCardBadge}>
                      <Camera size={14} color={colors.primaryDark} />
                      <Text style={styles.compareCardBadgeText}>Traditional Photography</Text>
                    </View>
                    <Text style={styles.compareCardDesc}>Particularly useful for:</Text>
                    {["Family portraits", "Group photographs", "Important rituals", "Formal couple portraits", "Ceremony documentation"].map((t, i) => (
                      <View key={i} style={styles.compareRow}>
                        <Text style={styles.compareDot}>•</Text>
                        <Text style={styles.compareItemText}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.compareCard, styles.compareCardCandid]}>
                    <View style={styles.compareCardBadge}>
                      <Sparkles size={14} color={colors.primaryDark} />
                      <Text style={styles.compareCardBadgeText}>Candid Photography</Text>
                    </View>
                    <Text style={styles.compareCardDesc}>Particularly useful for:</Text>
                    {["Natural emotions", "Spontaneous interactions", "Behind-the-scenes moments", "Unplanned reactions", "Family relationships", "Atmosphere of celebration"].map((t, i) => (
                      <View key={i} style={styles.compareRow}>
                        <Text style={styles.compareDot}>•</Text>
                        <Text style={styles.compareItemText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={[styles.paragraph, { marginTop: 14 }]}>
                  For many Indian weddings, the two approaches can complement each other.
                </Text>
              </View>
            </View>

            {/* ── SECTION 3 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                3. Your Wedding Does Not Have to Look Like Everyone Else's
              </Text>
              <Text style={styles.paragraph}>
                Search for wedding photography on Instagram and you may notice something: many weddings can start looking similar. The same poses. The same couple portraits. The same dramatic entrances. The same cinematic transitions.
              </Text>
              <Text style={styles.paragraph}>
                But your wedding is not a template. Your family has its own personality. Your traditions are different. Your friends behave differently. Your venue has a different atmosphere. Your relationship has its own story.
              </Text>
              <Text style={styles.paragraph}>
                Modern wedding photography is increasingly about creating images that feel personal rather than making every wedding look identical.
              </Text>

              <View style={styles.highlightCard}>
                <Text style={styles.highlightCardLead}>
                  The best wedding photograph may not always be the most perfect photograph.
                </Text>
                <Text style={styles.highlightCardQuote}>
                  It may be the photograph that makes you say:{"\n"}
                  <Text style={styles.boldText}>"That is exactly what happened."</Text>
                </Text>
              </View>
            </View>

            {/* ── SECTION 4 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                4. Wedding Photography Is Becoming More Than Photography
              </Text>
              <Text style={styles.paragraph}>
                One of the biggest changes in the wedding industry is the number of visual services couples can now choose from. A modern wedding may include:
              </Text>

              <View style={styles.servicesPillGrid}>
                {[
                  "Traditional photography",
                  "Candid photography",
                  "Documentary photography",
                  "Cinematic videography",
                  "Wedding films",
                  "Wedding Reels",
                  "Content creation",
                  "Behind-the-scenes videos",
                  "Drone photography",
                  "Same-day edits",
                  "Live streaming",
                  "Albums",
                  "Pre-wedding photography",
                  "Post-wedding photography",
                ].map((srv, idx) => (
                  <View key={idx} style={styles.servicePill}>
                    <Text style={styles.servicePillText}>{srv}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.paragraph}>
                These services are different, but they can work together. The modern question is therefore not simply:{" "}
                <Text style={styles.boldText}>"Which photographer should I hire?"</Text>
                {"\n"}
                It is:{" "}
                <Text style={styles.boldText}>"What kind of visual story do we want from our wedding?"</Text>
              </Text>
            </View>

            {/* ── SECTION 5 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                5. The Rise of Wedding Content Creators in India
              </Text>
              <Text style={styles.paragraph}>
                A new category has become increasingly visible at weddings: the{" "}
                <Text style={styles.boldText}>wedding content creator</Text>.
              </Text>
              <Text style={styles.paragraph}>
                A wedding content creator is generally focused on creating quick, social-media-friendly content during the celebration. Their work may include:
              </Text>

              <View style={styles.featureCheckList}>
                {[
                  "Instagram Reels",
                  "Short-form vertical videos",
                  "Behind-the-scenes content",
                  "Bridal and groom preparation",
                  "Family candid reactions",
                  "Dance and entry moments",
                  "Same-day social content & quick edits",
                ].map((item, idx) => (
                  <View key={idx} style={styles.featureCheckRow}>
                    <CheckCircle2 size={16} color={colors.primaryDark} />
                    <Text style={styles.featureCheckText}>{item}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.paragraph}>
                The role is different from traditional wedding photography. A photographer is focused on high-resolution prints and wedding albums. A videographer focuses on the grand cinematic film. A content creator focuses on what the couple can watch and share on social media almost immediately.
              </Text>

              <View style={styles.subBlock}>
                <Text style={styles.subHeading}>Do You Need a Wedding Content Creator?</Text>
                <Text style={styles.paragraph}>
                  There is no single answer. If you want professional photographs and a cinematic wedding film, a photographer and videographer may be enough.
                </Text>
                <Text style={styles.paragraph}>
                  If you also want frequent Reels, behind-the-scenes moments and social-media-ready content during the wedding, a content creator can add another layer to the coverage. The decision should depend on how you want to experience and share your wedding.
                </Text>
              </View>
            </View>

            {/* ── SECTION 6 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                6. Wedding Reels Are Becoming Part of the Wedding Experience
              </Text>
              <Text style={styles.paragraph}>
                A wedding album may be opened years from now. A wedding Reel may be shared minutes after the event. Both have value.
              </Text>
              <Text style={styles.paragraph}>
                A Reel can capture:
              </Text>
              <View style={styles.staccatoList}>
                <Text style={styles.staccatoLine}>• A bridal entrance</Text>
                <Text style={styles.staccatoLine}>• A Haldi celebration</Text>
                <Text style={styles.staccatoLine}>• Friends dancing</Text>
                <Text style={styles.staccatoLine}>• A wedding outfit reveal</Text>
                <Text style={styles.staccatoLine}>• Behind-the-scenes preparation</Text>
                <Text style={styles.staccatoLine}>• A couple's reaction</Text>
                <Text style={styles.staccatoLine}>• A family celebration</Text>
              </View>
              <Text style={styles.paragraph}>
                This creates a new type of wedding memory. The photograph preserves a moment. The film tells a longer story. The Reel captures something quickly and makes it easy to share. Modern couples can choose the formats that matter most to them.
              </Text>
            </View>

            {/* ── SECTION 7 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                7. Cinematic Wedding Videography
              </Text>
              <Text style={styles.paragraph}>
                Wedding photography captures individual frames. Videography captures movement, sound and time. A cinematic wedding film can bring together wedding rituals, couple moments, family reactions, venue atmosphere, music, speeches, friends, dance performances, emotional moments, and important conversations.
              </Text>
              <Text style={[styles.paragraph, styles.boldText]}>
                A good wedding film should not simply show everything that happened. It should tell the story of what happened.
              </Text>

              <View style={styles.checklistCard}>
                <Text style={styles.checklistCardTitle}>
                  What Should You Ask a Wedding Videographer Before Booking?
                </Text>
                {[
                  "What type of wedding films do you create?",
                  "Do you provide a highlight film?",
                  "Do you provide full ceremony coverage?",
                  "How long is the final film?",
                  "Is audio recorded separately?",
                  "How many videographers will be present?",
                  "What is the expected delivery time?",
                  "Is editing included in the package?",
                ].map((q, idx) => (
                  <View key={idx} style={styles.checklistItem}>
                    <Text style={styles.checklistNum}>{idx + 1}.</Text>
                    <Text style={styles.checklistItemText}>{q}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── SECTION 8 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                8. Same-Day Wedding Edits
              </Text>
              <Text style={styles.paragraph}>
                Imagine watching your wedding morning again on the same evening.
              </Text>
              <Text style={styles.paragraph}>
                The ceremony has finished. Your family is preparing for the reception. The lights go down. A screen comes on. And suddenly everyone sees the morning again. The bride. The groom. The parents. The rituals. The laughter. The emotions.
              </Text>
              <Text style={styles.paragraph}>
                That is the idea behind a <Text style={styles.boldText}>same-day wedding edit</Text>. A short wedding film is filmed and edited during the event and presented to guests on the same day. It turns photography and videography into part of the celebration itself.
              </Text>

              <View style={styles.subBlock}>
                <Text style={styles.subHeading}>Is a Same-Day Edit Worth It?</Text>
                <Text style={styles.paragraph}>
                  It can be particularly meaningful for multi-event weddings where guests from different functions come together later in the day.
                </Text>
                <Text style={styles.paragraph}>
                  However, it requires a team capable of filming, transferring, editing and delivering the video within a very short period. If you want a same-day edit, discuss it with your photography or videography team before booking.
                </Text>
              </View>
            </View>

            {/* ── SECTION 9 ─────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                9. Drone Photography for Indian Weddings
              </Text>
              <Text style={styles.paragraph}>
                Indian weddings can be visually spectacular: large venues, resorts, palaces, beaches, outdoor ceremonies, temple locations, large baraats, and decorated mandaps.
              </Text>
              <Text style={styles.paragraph}>
                Drone photography provides a perspective that a ground camera cannot easily create. It can show the venue scale, outdoor gatherings, baraat entrances, and destination settings.
              </Text>
              <Text style={styles.paragraph}>
                But drone photography should not be included simply because it is popular. The important question is:{" "}
                <Text style={styles.boldText}>"Does the aerial view add something to the story?"</Text>
              </Text>
              <Text style={styles.smallNote}>
                *Note: Drone operations must always be planned according to venue permissions, safety guidelines, and applicable civil aviation rules.
              </Text>
            </View>

            {/* ── SECTION 10 & 11 ───────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                10. Natural Colours and Realistic Skin Tones
              </Text>
              <Text style={styles.paragraph}>
                Indian weddings are already full of colour: sarees, lehengas, flowers, jewellery, mehendi, mandaps, decorations, traditional fabrics, and vibrant lighting.
              </Text>
              <Text style={styles.paragraph}>
                Photography should preserve that personality. Heavy filters can make photographs look drastically disconnected from reality. A modern approach focuses on maintaining natural-looking skin tones and realistic colours while enhancing the photograph.
              </Text>
              <Text style={[styles.paragraph, styles.boldText]}>
                The bride should still look like herself. The groom should still look like himself. Good editing should enhance the memory rather than replace it.
              </Text>

              <Text style={[styles.sectionHeading, { marginTop: 28 }]}>
                11. Film-Inspired Wedding Photography
              </Text>
              <Text style={styles.paragraph}>
                Digital photography has made it possible to capture incredible detail. At the same time, many couples are attracted to photographs with a softer, more nostalgic visual character.
              </Text>
              <Text style={styles.paragraph}>
                Film-inspired photography features softer tones, natural colours, subtle grain, less aggressive editing, nostalgic compositions, and editorial-style portraits. The objective is not simply to make digital photos look old — it is to create imagery that continues to feel personal and timeless.
              </Text>
            </View>

            {/* ── SECTION 12 & 13 ───────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                12. Multi-Day Indian Weddings Need Multi-Day Photography Planning
              </Text>
              <Text style={styles.paragraph}>
                An Indian wedding is often much bigger than one ceremony. Depending on tradition, celebrations may include Engagement, Pre-wedding shoot, Haldi, Mehendi, Sangeet, Wedding ceremony, Reception, and Post-wedding events.
              </Text>
              <Text style={styles.paragraph}>
                These may happen on different days and at different locations. That means photography planning should begin with the <Text style={styles.boldText}>complete event schedule</Text>.
              </Text>
              <View style={styles.checklistRow}>
                {["Date", "Time", "Location", "Event Type", "Photo Needs", "Video Needs", "Add-on Services"].map((item, idx) => (
                  <View key={idx} style={styles.chipTag}>
                    <Text style={styles.chipTagText}>{item}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 28 }]}>
                13. How to Choose a Wedding Photographer in India
              </Text>
              <Text style={styles.paragraph}>
                Choosing a photographer should involve more than looking at ten curated photographs on Instagram. Always ask to see a <Text style={styles.boldText}>complete wedding gallery</Text>.
              </Text>
              <Text style={styles.paragraph}>
                Review family photographs, indoor and low-light ceremonies, outdoor portraits, crowd coverage, video samples, Reels, and final album print quality. You are trusting someone to document an entire milestone event, not just ten social media posts.
              </Text>
            </View>

            {/* ── SECTION 14 ────────────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                14. What Should You Ask Before Booking a Wedding Photographer?
              </Text>
              <Text style={styles.paragraph}>
                Clear answers before booking prevent misunderstandings later. Here are the 10 critical areas to confirm:
              </Text>

              <View style={styles.faqCardsGrid}>
                {[
                  { title: "Availability", desc: "Is the photographer and lead team confirmed for all required dates and times?" },
                  { title: "Team Size", desc: "Exactly how many photographers, videographers, and assistants will attend?" },
                  { title: "Coverage Hours", desc: "How many hours per session are included, and what are overtime rates?" },
                  { title: "Deliverables", desc: "How many edited photographs, cinematic videos, Reels, or albums are guaranteed?" },
                  { title: "Editing Style", desc: "What type of color grading and retouching is provided in the package?" },
                  { title: "Delivery Timeline", desc: "How long will the teaser, full gallery, and cinematic videos take to deliver?" },
                  { title: "Backup Equipment & Staff", desc: "What happens if a team member falls ill or camera gear fails?" },
                  { title: "Travel & Stay", desc: "Are crew travel, food, and accommodation included or billed separately?" },
                  { title: "Additional Services", desc: "Can you add drone, LED live wall, web streaming, or same-day edits later?" },
                  { title: "Written Contract", desc: "Are all deliverables, cancellation policies, and payment terms documented?" },
                ].map((item, idx) => (
                  <View key={idx} style={styles.faqCard}>
                    <Text style={styles.faqCardTitle}>
                      {idx + 1}. {item.title}
                    </Text>
                    <Text style={styles.faqCardDesc}>{item.desc}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── SECTION 15 & 16 ───────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                15. How Much Does Wedding Photography Cost in India?
              </Text>
              <Text style={styles.paragraph}>
                There is no single price for wedding photography across India. The final cost varies based on city, experience, team size, number of event days, deliverables, albums, drone coverage, and editing timelines.
              </Text>
              <View style={styles.formulaBox}>
                <Text style={styles.formulaTitle}>Compare What is Actually Included:</Text>
                <Text style={styles.formulaText}>
                  Coverage → Team Size → Deliverables → Editing → Delivery → Additional Services
                </Text>
              </View>

              <Text style={[styles.sectionHeading, { marginTop: 28 }]}>
                16. How Early Should You Book a Wedding Photographer?
              </Text>
              <Text style={styles.paragraph}>
                Popular photographers and specialized studios can receive bookings 6–12 months in advance, particularly during auspicious muhurtham windows. If your wedding involves multiple days or special services like drones and live streaming, planning early makes coordination seamless.
              </Text>
            </View>

            {/* ── SECTION 17: RESPONSIVE MULTI-DAY PLANNING TABLE ───── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                17. How to Plan Photography for a Multi-Day Wedding
              </Text>
              <Text style={styles.paragraph}>
                A simple planning table helps you map out services per event rather than paying for idle hours:
              </Text>

              {isMobile && (
                <Text style={styles.swipeHint}>← Swipe table horizontally to view all columns →</Text>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.tableScrollContainer}
              >
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableTh, { width: 75 }]}>Day</Text>
                    <Text style={[styles.tableTh, { width: 110 }]}>Event</Text>
                    <Text style={[styles.tableTh, { width: 115 }]}>Location</Text>
                    <Text style={[styles.tableTh, { width: 105 }]}>Photo</Text>
                    <Text style={[styles.tableTh, { width: 105 }]}>Video</Text>
                    <Text style={[styles.tableTh, { width: 135 }]}>Additional Services</Text>
                  </View>

                  {/* Table Body */}
                  {[
                    { day: "Day 1", event: "Engagement", loc: "Venue", photo: "Yes", video: "Yes", add: "Reels" },
                    { day: "Day 2", event: "Haldi", loc: "Home / Venue", photo: "Yes", video: "Optional", add: "Content Creator" },
                    { day: "Day 2", event: "Mehendi", loc: "Venue", photo: "Yes", video: "Yes", add: "Reels" },
                    { day: "Day 3", event: "Sangeet", loc: "Venue", photo: "Yes", video: "Yes", add: "LED / Live" },
                    { day: "Day 4", event: "Wedding", loc: "Venue", photo: "Yes", video: "Yes", add: "Drone" },
                    { day: "Day 4", event: "Reception", loc: "Venue", photo: "Yes", video: "Yes", add: "Same-Day Edit" },
                  ].map((row, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.tableRow,
                        idx % 2 === 1 && styles.tableRowAlt,
                      ]}
                    >
                      <Text style={[styles.tableTd, styles.boldText, { width: 75 }]}>{row.day}</Text>
                      <Text style={[styles.tableTd, { width: 110 }]}>{row.event}</Text>
                      <Text style={[styles.tableTd, { width: 115 }]}>{row.loc}</Text>
                      <Text style={[styles.tableTd, { width: 105 }]}>{row.photo}</Text>
                      <Text style={[styles.tableTd, { width: 105 }]}>{row.video}</Text>
                      <Text style={[styles.tableTd, styles.primaryTd, { width: 135 }]}>{row.add}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ── SECTION 18 & 19 ───────────────────────────────────── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>
                18. Photography Is About More Than the Couple
              </Text>
              <Text style={styles.paragraph}>
                One of the easiest mistakes to make is focusing only on the bride and groom. Years later, couples often value photographs of the people who were there with them: parents, grandparents, siblings, friends, relatives, and children.
              </Text>
              <Text style={styles.paragraph}>
                When planning your photography, make sure the team knows which people and relationships are particularly important to you.
              </Text>
              <Text style={[styles.paragraph, styles.highlightStatement]}>
                The wedding is about the couple. But the memories belong to the whole family.
              </Text>

              <Text style={[styles.sectionHeading, { marginTop: 28 }]}>
                19. The Future of Wedding Photography Is About Storytelling
              </Text>
              <Text style={styles.paragraph}>
                The Indian photography industry is evolving. The professional is no longer simply the person carrying a camera. Today's wedding visual team works across photography, videography, storytelling, reels, drone production, live streaming, and same-day editing.
              </Text>
              <Text style={styles.paragraph}>
                AI-assisted editing and other production tools are becoming part of the broader creative workflow. But technology cannot replace the most important part:
              </Text>
              <View style={styles.quoteCallout}>
                <Sparkles size={24} color={colors.primaryDark} />
                <View style={styles.quoteContent}>
                  <Text style={styles.quoteTitle}>Knowing when a moment matters.</Text>
                  <Text style={styles.quoteBody}>
                    A camera can record a wedding. A good visual storyteller can help you remember how it felt.
                  </Text>
                </View>
              </View>
            </View>

            {/* ── SECTION 20 & 21: HOW BOOK A SHOOT HELPS ──────────── */}
            <View style={[styles.sectionBlock, styles.ctaCardBlock]}>
              <Text style={styles.sectionHeading}>
                20. How Camartes Book A Shoot Can Help
              </Text>
              <Text style={styles.paragraph}>
                Planning photography for an event can become complicated quickly. You need to coordinate dates, times, locations, photographers, videographers, drone teams, LED walls, web streaming, and reels.
              </Text>
              <Text style={styles.paragraph}>
                That is where <Text style={styles.boldText}>Book A Shoot by Camartes</Text> simplifies the process. Instead of starting with a random list of studios, start with your exact event requirements:
              </Text>

              {/* 5-Step Visual Flow */}
              <View style={styles.flowRow}>
                {["Date", "Event", "Time", "Location", "Services"].map((step, idx) => (
                  <React.Fragment key={idx}>
                    <View style={styles.flowBadge}>
                      <Text style={styles.flowBadgeText}>{step}</Text>
                    </View>
                    {idx < 4 && <Text style={styles.flowArrow}>→</Text>}
                  </React.Fragment>
                ))}
              </View>

              <Text style={[styles.paragraph, { marginTop: 14 }]}>
                Then find the vetted professionals and services that match your exact requirements across Hyderabad, Bangalore, and Andhra Pradesh.
              </Text>

              <View style={styles.dividerLight} />

              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
                21. Planning a Wedding or Event Shoot?
              </Text>
              <Text style={styles.paragraph}>
                Your event is unique. Your photography should be planned around it. Start with five simple things:
              </Text>

              <View style={styles.planning5Grid}>
                {[
                  { label: "Date", desc: "When is the celebration happening?" },
                  { label: "Time", desc: "What time does coverage start and finish?" },
                  { label: "Location", desc: "Where will each ceremony take place?" },
                  { label: "Event", desc: "What ceremonies are you celebrating?" },
                  { label: "Services", desc: "Photography, Video, Drone, Reels, LED, Web Live?" },
                ].map((item, idx) => (
                  <View key={idx} style={styles.planning5Item}>
                    <Text style={styles.planning5Label}>{item.label}</Text>
                    <Text style={styles.planning5Desc}>{item.desc}</Text>
                  </View>
                ))}
              </View>

              {/* Action Banner inside Article */}
              <View style={styles.inlineCtaCard}>
                <Text style={styles.inlineCtaTitle}>Book A Shoot with Camartes</Text>
                <Text style={styles.inlineCtaSub}>
                  Plan your shoot around your date, time, location, event and services. Find photography and event-service professionals for the moments that matter.
                </Text>
                <Text style={styles.inlineCtaTagline}>
                  Your event happens once. Your memories stay.
                </Text>

                <Pressable
                  onPress={goToLogin}
                  style={({ pressed }) => [styles.inlineCtaBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.inlineCtaBtnText}>Start Your Booking Now</Text>
                  <ArrowRight size={18} color={colors.white} />
                </Pressable>
              </View>
            </View>

            {/* ── UNIFIED BOTTOM CTA BANNER ─────────────────────────── */}
            <View style={[styles.ctaBannerWrapper, !isWide && styles.ctaBannerWrapperPhone]}>
              <SEOImage
                src={
                  Platform.OS === "web"
                    ? "/cta.webp"
                    : require("@/assets/images/cta.webp")
                }
                alt="Book verified photography studios with milestone escrow on Book A Shoot"
                priority={false}
                style={styles.ctaBackgroundImage}
                resizeMode="cover"
              />

              <View
                style={[
                  styles.ctaLeftContainer,
                  isWide ? styles.ctaLeftContainerWide : styles.ctaLeftContainerPhone,
                ]}
              >
                <Text
                  style={[
                    styles.ctaTitleLeft,
                    isWide ? styles.ctaTitleLeftWide : styles.ctaTitleLeftPhone,
                  ]}
                >
                  Inspired by Our Stories?{"\n"}
                  <Text style={{ color: colors.primaryDark }}>Bring Your Vision to Life.</Text>
                </Text>

                <Text style={styles.ctaSubLeft}>
                  Connect with top-rated, KYC-audited visual storytellers across Hyderabad, Bangalore, and Andhra Pradesh.
                </Text>

                <Pressable
                  onPress={goToLogin}
                  style={({ pressed }) => [styles.ctaBtnOrange, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.ctaBtnTextWhite}>Book a Shoot Now</Text>
                  <ArrowRight size={18} color={colors.white} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* ── Universal Footer ──────────────────────────────────────── */}
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
  outerContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  articleWrapper: {
    width: "100%",
    maxWidth: 880,
  },
  articleWrapperWide: {
    maxWidth: 920,
    paddingHorizontal: 0,
  },
  articleWrapperTablet: {
    maxWidth: 720,
    paddingHorizontal: spacing.sm,
  },

  // Breadcrumbs
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  breadcrumbItem: {
    paddingVertical: 4,
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

  // Article Header
  articleHeader: {
    marginBottom: spacing.lg,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.bgWarm,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    marginBottom: spacing.md,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 34,
    marginBottom: spacing.md,
  },
  mainTitleWide: {
    fontSize: 38,
    lineHeight: 48,
  },
  mainTitleTablet: {
    fontSize: 32,
    lineHeight: 40,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
  },
  metaCol: {
    gap: 4,
  },
  metaAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  metaChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaChipText: {
    fontSize: 12,
    color: colors.muted,
  },
  metaDot: {
    color: colors.muted,
    fontSize: 12,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radiusSm,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },

  // Featured Image
  featuredImageWrapper: {
    marginBottom: spacing.xl,
    borderRadius: radius,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredImage: {
    width: "100%",
    height: 380,
    backgroundColor: colors.peach,
  },
  imageCaption: {
    padding: spacing.sm,
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
    textAlign: "center",
  },

  // Intro & Text
  introSection: {
    marginBottom: spacing.xl,
  },
  leadParagraph: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primaryDark,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.text,
    marginBottom: spacing.md,
  },
  boldText: {
    fontWeight: "700",
    color: colors.text,
  },
  boldUnderline: {
    fontWeight: "700",
    color: colors.primaryDark,
  },
  highlightStatement: {
    fontSize: 17,
    backgroundColor: colors.cream,
    padding: spacing.md,
    borderRadius: radiusSm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },

  // Moments Card
  momentsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.lg,
    marginVertical: spacing.md,
  },
  momentsCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryDark,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  momentsList: {
    gap: 8,
  },
  momentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  momentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  momentText: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  momentsConclusion: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
    fontStyle: "italic",
  },

  // Quick Answer Box (AI Search)
  quickAnswerBox: {
    backgroundColor: colors.bgWarm,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    borderRadius: radius,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  quickAnswerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  quickAnswerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 24,
  },
  quickAnswerBody: {
    fontSize: 16,
    lineHeight: 25,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quickAnswerSub: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  quickAnswerAction: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    fontStyle: "italic",
  },

  // Key Takeaways
  takeawaysCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  takeawaysHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  takeawaysTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  takeawaysGrid: {
    gap: 10,
  },
  takeawayItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  takeawayCheck: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
    lineHeight: 22,
  },
  takeawayText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.ink,
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  dividerLight: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // Sections
  sectionBlock: {
    marginBottom: spacing.xxl,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 30,
    marginBottom: spacing.md,
  },
  subBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  subHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  staccatoList: {
    paddingLeft: spacing.sm,
    gap: 4,
    marginBottom: spacing.md,
  },
  staccatoLine: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 24,
  },

  // Quote Callouts
  quoteCallout: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.cream,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    borderRadius: radiusSm,
    marginTop: spacing.md,
  },
  quoteContent: {
    flex: 1,
  },
  quoteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quoteBody: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },
  quoteNote: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 6,
    fontStyle: "italic",
  },

  // Comparison Grid
  compareGrid: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  compareGridWide: {
    flexDirection: "row",
  },
  compareCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusSm,
    padding: spacing.md,
  },
  compareCardCandid: {
    borderColor: colors.peachBorder,
    backgroundColor: colors.cream,
  },
  compareCardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  compareCardBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  compareCardDesc: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  compareDot: {
    color: colors.primary,
    fontSize: 14,
  },
  compareItemText: {
    fontSize: 13.5,
    color: colors.text,
  },

  // Highlight Card
  highlightCard: {
    backgroundColor: colors.bgWarm,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: radius,
    padding: spacing.lg,
    marginVertical: spacing.md,
    alignItems: "center",
  },
  highlightCardLead: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 6,
    textAlign: "center",
  },
  highlightCardQuote: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primaryDark,
    textAlign: "center",
    lineHeight: 26,
  },

  // Service Pill Grid
  servicesPillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: spacing.md,
  },
  servicePill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  servicePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },

  // Features check list
  featureCheckList: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusSm,
    padding: spacing.md,
    gap: 8,
    marginVertical: spacing.md,
  },
  featureCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureCheckText: {
    fontSize: 14.5,
    color: colors.ink,
  },

  // Checklist Card
  checklistCard: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: radius,
    padding: spacing.lg,
    marginVertical: spacing.md,
  },
  checklistCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primaryDark,
    marginBottom: spacing.md,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  checklistNum: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
    width: 20,
  },
  checklistItemText: {
    fontSize: 14.5,
    color: colors.text,
    flex: 1,
    lineHeight: 21,
  },

  smallNote: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },

  // Checklist row
  checklistRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: spacing.md,
  },
  chipTag: {
    backgroundColor: colors.bgWarm,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  chipTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
  },

  // FAQ Cards Grid
  faqCardsGrid: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  faqCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusSm,
    padding: spacing.md,
  },
  faqCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryDark,
    marginBottom: 4,
  },
  faqCardDesc: {
    fontSize: 13.5,
    color: colors.ink,
    lineHeight: 20,
  },

  // Formula box
  formulaBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radiusSm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  formulaTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },

  // Multi-day table
  swipeHint: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  tableScrollContainer: {
    marginVertical: spacing.sm,
  },
  table: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radiusSm,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.bgWarm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableTh: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowAlt: {
    backgroundColor: colors.cream,
  },
  tableTd: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.text,
  },
  primaryTd: {
    color: colors.primaryDark,
    fontWeight: "600",
  },

  // CTA Block
  ctaCardBlock: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: spacing.lg,
  },
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: spacing.md,
  },
  flowBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  flowBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  flowArrow: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },

  planning5Grid: {
    gap: 8,
    marginVertical: spacing.md,
  },
  planning5Item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    padding: 10,
    borderRadius: radiusSm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    gap: 12,
  },
  planning5Label: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primaryDark,
    width: 70,
  },
  planning5Desc: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },

  inlineCtaCard: {
    backgroundColor: colors.bgWarm,
    borderWidth: 1.5,
    borderColor: colors.peachBorder,
    borderRadius: radius,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  inlineCtaTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primaryDark,
    marginBottom: 6,
    textAlign: "center",
  },
  inlineCtaSub: {
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 8,
  },
  inlineCtaTagline: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
    fontStyle: "italic",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  inlineCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radiusSm,
  },
  inlineCtaBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },

  // Bottom CTA Banner (cta.png)
  ctaBannerWrapper: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    minHeight: 260,
    justifyContent: "center",
  },
  ctaBannerWrapperPhone: {
    borderRadius: 16,
    minHeight: 230,
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
    zIndex: 2,
    paddingHorizontal: 36,
    paddingVertical: 32,
    maxWidth: 580,
  },
  ctaLeftContainerWide: {
    paddingHorizontal: 48,
    paddingVertical: 40,
    maxWidth: 620,
  },
  ctaLeftContainerPhone: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxWidth: "100%",
  },
  ctaTitleLeft: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 28,
    marginBottom: 8,
  },
  ctaTitleLeftWide: {
    fontSize: 28,
    lineHeight: 36,
  },
  ctaTitleLeftPhone: {
    fontSize: 20,
    lineHeight: 26,
  },
  ctaSubLeft: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginBottom: 16,
    opacity: 0.9,
  },
  ctaBtnOrange: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radiusSm,
    alignSelf: "flex-start",
  },
  ctaBtnTextWhite: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
