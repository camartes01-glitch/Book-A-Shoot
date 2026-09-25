/**
 * Book A Shoot — Careers Page
 *
 * Dedicated professional careers page featuring:
 * - Full hero section with careers.png/careers.webp as background image (same for desktop & mobile)
 * - Light screen overlay like contact/about page for crisp text contrast
 * - Centered headline in brand orange with flirty line stating no open positions right now
 * - Culture & Values Pillars (creator-first ethos, high ownership, visionary craft)
 * - Talent Pool Pitch / Application form delivering directly to our talent team via Resend
 * - Constant UniversalFooter without HQ location
 */

import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  Image,
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
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Compass,
  Heart,
  Layers,
  Send,
  Sparkles,
  Users2,
} from "lucide-react-native";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import { colors, radius, spacing } from "@/src/constants/theme";
import { CAMARTES_API } from "@/src/services/camartesClient";

const DISCIPLINES = [
  "Engineering & Tech",
  "Cinematography & Video",
  "Growth & Marketing",
  "Client Concierge & Ops",
  "Creative Direction",
  "Other Superpower",
];

const CULTURE_PILLARS = [
  {
    icon: Sparkles,
    title: "Radical Craft & Obsession",
    desc: "We hold zero tolerance for mediocre code or lackluster photography. Everything we ship is refined to international standards.",
  },
  {
    icon: Users2,
    title: "Creator-First Ecosystem",
    desc: "We don't treat artists as freelancers. We build tech that respects cinematographers, secures their payments, and elevates their craft.",
  },
  {
    icon: Layers,
    title: "High Autonomy, Fast Velocity",
    desc: "No bureaucracy. You have full ownership of your domain. We make decisions in minutes, test in production, and iterate rapidly.",
  },
  {
    icon: Compass,
    title: "Creative Freedom & Vision",
    desc: "We foster an environment of continuous breakthrough, giving every creator the freedom to experiment and pioneer new creative benchmarks.",
  },
];

export default function CareersPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;
  const scrollRef = useRef<ScrollView>(null);
  const formLayoutRef = useRef<number>(0);

  // Form State
  const [selectedDiscipline, setSelectedDiscipline] = useState(DISCIPLINES[0]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [experience, setExperience] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [coverNote, setCoverNote] = useState("");

  // Submissions State
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const goToHome = () => router.push("/landing");
  const goToServices = () => router.push("/services");
  const goToAbout = () => router.push("/about");
  const goToContact = () => router.push("/contact");
  const goToLogin = () => router.push("/(auth)/login");

  const scrollToForm = () => {
    if (formLayoutRef.current > 0) {
      scrollRef.current?.scrollTo({ y: formLayoutRef.current - 90, animated: true });
    }
  };

  const handleSubmit = async () => {
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Please provide your full name.");
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMsg("Please provide a valid email address.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile / WhatsApp number.");
      return;
    }
    if (!portfolioLink.trim()) {
      setErrorMsg("Please provide your LinkedIn, GitHub, or portfolio link.");
      return;
    }
    if (!coverNote.trim()) {
      setErrorMsg("Please share a brief note about yourself and your talent pitch.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        selectedDiscipline,
        currentCity: currentCity.trim(),
        experience: experience.trim(),
        portfolioLink: portfolioLink.trim(),
        coverNote: coverNote.trim(),
      };

      let success = false;
      let lastError = "";

      const targetUrls = Array.from(
        new Set([
          "http://localhost:8001/api/careers/pitch",
          `${CAMARTES_API}/api/careers/pitch`,
          "/api/careers/pitch",
        ])
      );

      for (const url of targetUrls) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.success !== false) {
              success = true;
              break;
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            lastError = errData?.detail || errData?.message || "";
          }
        } catch (e: any) {
          lastError = e?.message || "";
        }
      }

      if (!success) {
        throw new Error(lastError || "Failed to submit talent pitch. Please try again or reach us via WhatsApp.");
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Career submission error:", err);
      setErrorMsg(err?.message || "Something went wrong while submitting your pitch. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setCurrentCity("");
    setExperience("");
    setPortfolioLink("");
    setCoverNote("");
    setSubmitted(false);
    setErrorMsg("");
  };

  return (
    <View style={styles.root}>
      {/* ── Universal Constant Navbar ──────────────────────────────────────── */}
      <UniversalNavbar activeRoute="careers" />

      {/* ── Scrollable Body ────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + (isWide ? 96 : 88),
          paddingBottom: Math.max(insets.bottom + 40, 60),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Full Hero Section with careers.png Background & Translucent Screen ── */}
        <View style={[styles.heroContainer, isWide ? styles.heroContainerDesktop : styles.heroContainerMobile]}>
          {/* Background Image: careers.webp/careers.png (same for desktop and phone) */}
          <Image
            source={
              Platform.OS === "web"
                ? { uri: "/careers.webp" }
                : require("@/assets/images/careers.webp")
            }
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel="Book A Shoot Creative Studio Team"
          />

          {/* Light translucent slate screen overlay like in contact/about page */}
          <View style={styles.heroScreenOverlay} pointerEvents="none" />

          {/* Centered Hero Content directly on the image */}
          <View style={[styles.heroContent, isWide && styles.heroContentWide]}>
            {/* Main Heading in PLAIN BRAND ORANGE */}
            <Text style={[styles.heroTitle, !isWide && styles.heroTitlePhone]}>
              Work With Us.
            </Text>

            {/* Simple flirty small subheading */}
            <Text style={[styles.heroSubtitle, !isWide && styles.heroSubtitlePhone]}>
              Playing hard to get with no open positions right now, but extraordinary talent always catches our eye.
            </Text>

            <View style={styles.heroCtaRow}>
              <Pressable
                onPress={scrollToForm}
                style={({ pressed }) => [styles.heroPrimaryBtn, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.heroPrimaryBtnText}>Drop Your Talent Pitch</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Culture & Values Pillars ─────────────────────────────────── */}
        <View style={[styles.sectionContainer, isWide && styles.sectionContainerWide]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, !isWide && styles.sectionTitlePhone]}>
              High Ownership. Uncompromising Craft.
            </Text>
            <Text style={styles.sectionDesc}>
              When roles do open up, we look for creators and builders who bring relentless obsession and real empathy to every celebration.
            </Text>
          </View>

          <View style={[styles.pillarsGrid, isWide ? styles.pillarsGridWide : styles.pillarsGridPhone]}>
            {CULTURE_PILLARS.map((p) => {
              const IconComp = p.icon;
              return (
                <View key={p.title} style={[styles.pillarCard, isWide && styles.pillarCardWide]}>
                  <View style={styles.pillarIconCircle}>
                    <IconComp size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.pillarTitle}>{p.title}</Text>
                  <Text style={styles.pillarDesc}>{p.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Interactive Future Talent Application Form ────────────────── */}
        <View
          onLayout={(e) => {
            formLayoutRef.current = e.nativeEvent.layout.y;
          }}
          style={[styles.formSectionWrapper, isWide && styles.formSectionWrapperWide]}
        >
          <View style={styles.formCard}>
            {submitted ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={30} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.successTitle}>Pitch Received</Text>
                <Text style={styles.successSub}>
                  Thank you, <Text style={{ fontWeight: "600", color: colors.text }}>{fullName.trim()}</Text>! Your profile and talent pitch have been successfully submitted to our creative leadership.
                </Text>

                {/* Submission Overview Docket */}
                <View style={styles.successSummaryBox}>
                  <View style={styles.successSummaryHeader}>
                    <Text style={styles.successSummaryHeaderText}>TALENT DOSSIER</Text>
                    <Text style={styles.successSummaryStatus}>Status: In Review</Text>
                  </View>
                  <View style={styles.successSummaryDivider} />
                  <View style={styles.successItemRow}>
                    <Text style={styles.successSummaryLabel}>Discipline</Text>
                    <Text style={styles.successSummaryVal}>{selectedDiscipline}</Text>
                  </View>
                  <View style={styles.successItemRow}>
                    <Text style={styles.successSummaryLabel}>Mobile / WhatsApp</Text>
                    <Text style={styles.successSummaryVal}>+91 {phone}</Text>
                  </View>
                  <View style={styles.successItemRow}>
                    <Text style={styles.successSummaryLabel}>Email Address</Text>
                    <Text style={[styles.successSummaryVal, { color: colors.primaryDark }]}>{email.trim()}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={resetForm}
                  style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.resetBtnText}>Submit Another Pitch</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Pitch Yourself to Our Team</Text>
                  <Text style={styles.formSubtitle}>
                    Even while positions are closed, exceptional builders and creative storytellers always stand out. Drop your details below to steal our hearts for future opportunities.
                  </Text>
                </View>

                {errorMsg ? (
                  <View style={styles.errorBanner}>
                    <AlertCircle size={16} color={colors.primary} />
                    <Text style={styles.errorBannerText}>{errorMsg}</Text>
                  </View>
                ) : null}

                {/* Discipline Selector Pills */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Your Primary Discipline / Superpower</Text>
                  <View style={styles.rolesPillsWrap}>
                    {DISCIPLINES.map((d) => {
                      const isSelected = selectedDiscipline === d;
                      return (
                        <Pressable
                          key={d}
                          onPress={() => setSelectedDiscipline(d)}
                          style={[styles.rolePill, isSelected && styles.rolePillSelected]}
                        >
                          <Text
                            style={[
                              styles.rolePillText,
                              isSelected && styles.rolePillTextSelected,
                            ]}
                          >
                            {d}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Full Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rohith Sharma"
                    placeholderTextColor="#94A3B8"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                {/* Email & Phone Grid */}
                <View style={[styles.fieldRow, isWide && styles.fieldRowWide]}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>
                      Email Address <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="you@domain.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>
                      WhatsApp / Mobile <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                    />
                  </View>
                </View>

                {/* City & Experience */}
                <View style={[styles.fieldRow, isWide && styles.fieldRowWide]}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Current City / Location</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Hyderabad, Bengaluru, Mumbai, Chennai..."
                      placeholderTextColor="#94A3B8"
                      value={currentCity}
                      onChangeText={setCurrentCity}
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Years of Experience</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 2 years, Student, Freelancer..."
                      placeholderTextColor="#94A3B8"
                      value={experience}
                      onChangeText={setExperience}
                    />
                  </View>
                </View>

                {/* Portfolio / LinkedIn / GitHub */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Portfolio, GitHub, or LinkedIn URL <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://linkedin.com/in/... or your portfolio website"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    value={portfolioLink}
                    onChangeText={setPortfolioLink}
                  />
                </View>

                {/* Pitch / Cover Note */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    How Would You Steal Our Attention? <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Tell us what you're exceptional at, your favorite creative or technical accomplishment, and why you want to build with Book A Shoot..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={coverNote}
                    onChangeText={setCoverNote}
                  />
                </View>

                {/* Submit Button */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    submitting && styles.submitBtnDisabled,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Submit Talent Pitch</Text>
                      <Send size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>

                <Text style={styles.formFooterDisclaimer}>
                  Your privacy is sacred. Submissions are reviewed exclusively by our talent team.
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ── Universal Footer without HQ Location ─────────────────────── */}
        <UniversalFooter showHqLocation={false} />
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
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  // ── Navbar ─────────────────────────────────────────────────────────────────
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
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  navInnerWide: {
    paddingHorizontal: 48,
    height: 76,
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
    fontWeight: "700",
    color: colors.primary,
  },
  navLogoContainer: {
    alignItems: "center",
  },
  navLogo: {
    width: 200,
    height: 52,
  },
  navLogoPhone: {
    width: 130,
    height: 34,
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navGhostBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius,
  },
  navGhostText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  navPrimaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius,
  },
  navPrimaryBtnPhone: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navPrimaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Full Hero Section with Image & Screen Overlay ─────────────────────────
  heroContainer: {
    position: "relative",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  heroContainerDesktop: {
    minHeight: 520,
    paddingVertical: 80,
  },
  heroContainerMobile: {
    minHeight: 460,
    paddingVertical: 60,
  },
  heroScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
  },
  heroContent: {
    position: "relative",
    zIndex: 2,
    paddingHorizontal: spacing.lg,
    maxWidth: 960,
    alignSelf: "center",
    alignItems: "center",
    width: "100%",
  },
  heroContentWide: {
    paddingHorizontal: 48,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    marginBottom: 16,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.primary,
    lineHeight: 52,
    letterSpacing: -1,
    marginBottom: 12,
    textAlign: "center",
  },
  heroTitlePhone: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16.5,
    color: "#FFFFFF",
    lineHeight: 25,
    textAlign: "center",
    maxWidth: 620,
    fontWeight: "500",
    marginBottom: 28,
  },
  heroSubtitlePhone: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  heroCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  heroPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Sections General ───────────────────────────────────────────────────────
  sectionContainer: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
  },
  sectionContainerWide: {
    paddingHorizontal: 48,
    paddingTop: 72,
  },
  sectionHeader: {
    alignItems: "center",
    marginBottom: 36,
  },
  sectionPre: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
    textAlign: "center",
    marginBottom: 10,
  },
  sectionTitlePhone: {
    fontSize: 23,
    letterSpacing: -0.4,
  },
  sectionDesc: {
    fontSize: 14.5,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 640,
    lineHeight: 22,
  },

  // ── Pillars Grid ───────────────────────────────────────────────────────────
  pillarsGrid: {
    gap: 16,
  },
  pillarsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  pillarsGridPhone: {
    flexDirection: "column",
  },
  pillarCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pillarCardWide: {
    width: "48.5%",
  },
  pillarIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.bgWarm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pillarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  pillarDesc: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },

  // ── Application Form ───────────────────────────────────────────────────────
  formSectionWrapper: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
  },
  formSectionWrapperWide: {
    paddingHorizontal: 32,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  formHeader: {
    marginBottom: 24,
  },
  formHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.bgWarm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  formHeaderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorBannerText: {
    fontSize: 13,
    color: "#BE123C",
    fontWeight: "600",
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldRow: {
    gap: 16,
  },
  fieldRowWide: {
    flexDirection: "row",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  requiredStar: {
    color: colors.primary,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },
  rolesPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rolePillSelected: {
    backgroundColor: colors.bgWarm,
    borderColor: colors.primary,
  },
  rolePillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
  },
  rolePillTextSelected: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
  },
  formFooterDisclaimer: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 18,
  },

  // ── Success State ──────────────────────────────────────────────────────────
  successContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 21,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 540,
    marginBottom: 18,
  },
  successSummaryBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    gap: 10,
  },
  successSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  successSummaryHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.6,
  },
  successSummaryStatus: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  successSummaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 2,
  },
  successItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  successSummaryLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  successSummaryVal: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  resetBtn: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
});
