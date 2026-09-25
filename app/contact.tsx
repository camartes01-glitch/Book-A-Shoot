/**
 * Book A Shoot — Contact Us Page
 * Desktop & Mobile responsive contact page featuring:
 * - Full hero section background: contact.png on desktop, phonecontact.png on mobile (no black screen, no white box)
 * - All content in hero centered: Main heading in plain orange (colors.primary), remaining lines in crisp white
 * - Smart marketing headline weaving in "Book A Shoot" & emotional flirty line
 * - Compact social media section with official WhatsApp (exact brand icon), Instagram (original sunset colors), and Facebook
 * - Orange-only UI icons and buttons across the entire page (except official social icons)
 * - Complete shoot inquiry form with Resend email integration logic (no lock icon)
 * - Professional footer with social icons and contact details
 */

import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
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
import Svg, { Circle, Path } from "react-native-svg";
import { UniversalFooter } from "@/src/components/UniversalFooter";
import { UniversalNavbar } from "@/src/components/UniversalNavbar";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react-native";
import { colors, radius, spacing } from "@/src/constants/theme";
import { CAMARTES_API } from "@/src/services/camartesClient";

// ─────────────────────────────────────────────────────────────────────────────
// Official Social Media Icons
// ─────────────────────────────────────────────────────────────────────────────

function WhatsAppOfficialIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill="#25D366"
        d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z"
      />
      <Path
        fill="#FFFFFF"
        d="M17.5 14.33c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.65-.93-2.25-.25-.6-.5-.52-.68-.53h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5 0 1.48 1.08 2.9 1.23 3.1.15.2 2.13 3.25 5.15 4.56.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35z"
      />
    </Svg>
  );
}

function FacebookOfficialIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="11" fill="#1877F2" />
      <Path
        d="M13.5 21.6v-7.5h2.5l.38-2.9h-2.88V9.35c0-.85.24-1.43 1.46-1.43h1.56V5.37c-.27-.04-1.2-.12-2.28-.12-2.25 0-3.8 1.38-3.8 3.9v2.05H8v2.9h2.44v7.5h3.06z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Options
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_OPTIONS = [
  "Wedding Celebration",
  "Pre-Wedding / Engagement",
  "Baby Shower / Maternity",
  "Newborn / Toddler Shoot",
  "Birthday / Anniversary",
  "Housewarming / Pooja",
  "Fashion / Editorial",
  "Corporate & Brand Event",
  "Other Celebration",
];

export default function ContactPage() {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState(EVENT_OPTIONS[0]);
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const WHATSAPP_NUMBER = "+91 96032 15551";
  const SUPPORT_EMAIL = "info@bookashoot.online";

  // Official Social Backlinks
  const SOCIAL_LINKS = {
    instagram: "https://instagram.com/bookashootonline",
    facebook: "https://facebook.com/bookashootonline",
    linkedin: "https://linkedin.com/company/bookashootonline",
    whatsapp: `https://wa.me/919603215551?text=${encodeURIComponent(
      "Hi Book A Shoot team! I'm interested in booking a photography shoot."
    )}`,
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Contact Us — Book A Shoot | You Bring The Sparks, We'll Book The Shoot";
    }
  }, []);

  const goToHome = () => router.push("/landing");
  const goToServices = () => router.push("/services");
  const goToAbout = () => router.push("/about");
  const goToBlogs = () => router.push("/blogs");
  const goToLogin = () => router.push("/(auth)/login");

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => { });
  };

  const handleCall = () => {
    openUrl(`tel:${WHATSAPP_NUMBER.replace(/\s+/g, "")}`);
  };

  const handleWhatsApp = () => {
    openUrl(SOCIAL_LINKS.whatsapp);
  };

  const handleEmailSupport = () => {
    openUrl(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Customer Inquiry — Book A Shoot")}`);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Resend Email Submission Logic
  // ───────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile / WhatsApp number.");
      return;
    }
    if (!message.trim()) {
      setErrorMsg("Please share a few words about your shoot vision.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        fullName: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        serviceType: eventType,
        city: location.trim(),
        message: message.trim(),
      };

      let success = false;
      let lastError = "";

      const targetUrls = Array.from(
        new Set([
          "http://localhost:8001/api/contact/submit",
          `${CAMARTES_API}/api/contact/submit`,
          "/api/contact/submit",
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
        throw new Error(lastError || "Failed to submit inquiry. Please try again or reach us via WhatsApp.");
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMsg(err?.message || "Something went wrong while sending your inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setLocation("");
    setMessage("");
    setSubmitted(false);
    setErrorMsg("");
  };

  return (
    <View style={styles.root}>
      {/* ── Universal Constant Navbar ──────────────────────────────────────── */}
      <UniversalNavbar activeRoute="contact" />

      {/* ── Scrollable Content ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + (isWide ? 96 : 88),
          paddingBottom: Math.max(insets.bottom + 40, 60),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Full Hero Section with Responsive Background (Increased Transparency) ── */}
        <View style={[styles.heroContainer, isWide ? styles.heroContainerDesktop : styles.heroContainerMobile]}>
          {/* Background Image: fully visible and vivid */}
          <Image
            source={
              isWide
                ? Platform.OS === "web"
                  ? { uri: "/contact.webp" }
                  : require("@/assets/images/contact.webp")
                : Platform.OS === "web"
                  ? { uri: "/phonecontact.webp" }
                  : require("@/assets/images/phonecontact.webp")
            }
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel="Book A Shoot Contact Background"
          />

          {/* Light screen overlay like in About page for crisp text visibility */}
          <View style={styles.heroScreenOverlay} pointerEvents="none" />

          {/* Centered Hero Content directly on the image */}
          <View style={[styles.heroContent, isWide && styles.heroContentWide]}>
            {/* Main Heading in PLAIN ORANGE (Theme Primary Shade) */}
            <Text style={[styles.heroTitle, !isWide && styles.heroTitlePhone]}>
              Fall In Love, Steal Glances.{"\n"}
              For Everything Else — Book A Shoot.
            </Text>

            {/* Emotional Flirty Line in CRISP WHITE */}
            <Text style={[styles.heroFlirtyLine, !isWide && styles.heroFlirtyLinePhone]}>
              You bring the sparks & butterflies; we’ll make sure the universe never forgets them.
            </Text>

            {/* Concise Subtitle in CRISP WHITE */}
            <Text style={[styles.heroSubtitle, !isWide && styles.heroSubtitlePhone]}>
              Whether it’s your wedding day, a sunset pre-wedding shoot, or an intimate milestone —
              reach out directly to our team to lock in your verified photography studio.
            </Text>
          </View>
        </View>

        {/* ── Main Body Container ──────────────────────────────────────── */}
        <View style={[styles.bodyContainer, isWide && styles.bodyContainerWide]}>
          {/* ── Main Two-Column Row: Single Info Card on Left + Inquiry Form on Right ──── */}
          <View style={[styles.mainRow, isWide && styles.mainRowWide]}>
            {/* Left Column: Single Unified Executive Card */}
            <View style={[styles.infoCol, isWide && styles.infoColWide]}>
              <View style={styles.singleUnifiedCard}>
                {/* 1. Direct Concierge & Help */}
                <View style={styles.cardSection}>
                  <Text style={styles.cardHeading}>Direct Concierge & Help</Text>
                  <Text style={styles.cardDesc}>
                    We're available every day from 9:00 AM to 9:00 PM IST to assist you with dates, bespoke requirements, and custom packages.
                  </Text>

                  <View style={styles.conciergeList}>
                    {/* WhatsApp Support */}
                    <Pressable
                      onPress={handleWhatsApp}
                      style={({ pressed }) => [styles.conciergeItem, pressed && styles.pressed]}
                      accessibilityRole="button"
                    >
                      <View style={styles.conciergeIconWrap}>
                        <MessageCircle size={18} color={colors.primary} />
                      </View>
                      <View style={styles.conciergeTextCol}>
                        <Text style={styles.conciergeLabel}>WhatsApp Concierge</Text>
                        <Text style={styles.conciergeValue}>{WHATSAPP_NUMBER}</Text>
                      </View>
                    </Pressable>

                    {/* Phone Support */}
                    <Pressable
                      onPress={handleCall}
                      style={({ pressed }) => [styles.conciergeItem, pressed && styles.pressed]}
                      accessibilityRole="button"
                    >
                      <View style={styles.conciergeIconWrap}>
                        <Phone size={18} color={colors.primary} />
                      </View>
                      <View style={styles.conciergeTextCol}>
                        <Text style={styles.conciergeLabel}>Direct Phone Call</Text>
                        <Text style={styles.conciergeValue}>{WHATSAPP_NUMBER}</Text>
                      </View>
                    </Pressable>

                    {/* Email Support */}
                    <Pressable
                      onPress={handleEmailSupport}
                      style={({ pressed }) => [styles.conciergeItem, pressed && styles.pressed]}
                      accessibilityRole="button"
                    >
                      <View style={styles.conciergeIconWrap}>
                        <Mail size={18} color={colors.primary} />
                      </View>
                      <View style={styles.conciergeTextCol}>
                        <Text style={styles.conciergeLabel}>Email Support</Text>
                        <Text style={styles.conciergeValue}>{SUPPORT_EMAIL}</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>

                {/* Subtle Divider */}
                <View style={styles.cardDivider} />

                {/* 2. Locations & HeadQuarters */}
                <View style={styles.cardSection}>
                  <Text style={styles.cardHeading}>Locations & HeadQuarters</Text>
                  <View style={styles.locationItem}>
                    <MapPin size={18} color={colors.primary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.locationTitle}>HeadQuarters — RTIH Vijayawada</Text>
                      <Text style={styles.locationDesc}>RTIH, Vijayawada, Andhra Pradesh</Text>
                    </View>
                  </View>
                </View>

                {/* Subtle Divider */}
                <View style={styles.cardDivider} />

                {/* 3. The Camartes Assurance */}
                <View style={styles.cardSection}>
                  <View style={styles.assuranceHeader}>
                    <ShieldCheck size={20} color={colors.primary} />
                    <Text style={styles.cardHeading}>The Camartes Assurance</Text>
                  </View>
                  <Text style={styles.assuranceDesc}>
                    Every studio on Book A Shoot is 100% KYC verified, audited for dual-card equipment redundancy, and backed by our automated replacement guarantee.
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Column: Interactive Shoot Inquiry Form */}
            <View style={[styles.formCol, isWide && styles.formColWide]}>
              <View style={styles.formCard}>
                {submitted ? (
                  <View style={styles.successContainer}>
                    {/* Refined Check Icon */}
                    <View style={styles.successIconCircle}>
                      <CheckCircle2 size={30} color={colors.primary} strokeWidth={2.2} />
                    </View>

                    {/* Clean, refined heading (not overly bold) */}
                    <Text style={styles.successTitle}>Inquiry Received</Text>

                    <Text style={styles.successSub}>
                      Thank you, <Text style={styles.successNameText}>{name.trim()}</Text>. Our dedicated studio concierge has received your details and is reviewing availability for your celebration.
                    </Text>

                    {/* Professional docket overview */}
                    <View style={styles.successSummaryBox}>
                      <View style={styles.successSummaryHeader}>
                        <Text style={styles.successSummaryHeaderText}>SUBMISSION OVERVIEW</Text>
                        <Text style={styles.successSummaryStatus}>Status: Dispatched</Text>
                      </View>

                      <View style={styles.successSummaryDivider} />

                      <View style={styles.successItemRow}>
                        <Text style={styles.successSummaryLabel}>Celebration</Text>
                        <Text style={styles.successSummaryVal}>{eventType}</Text>
                      </View>

                      <View style={styles.successItemRow}>
                        <Text style={styles.successSummaryLabel}>Mobile / WhatsApp</Text>
                        <Text style={styles.successSummaryVal}>+91 {phone}</Text>
                      </View>

                      <View style={styles.successItemRow}>
                        <Text style={styles.successSummaryLabel}>Email Address</Text>
                        <Text style={[styles.successSummaryVal, styles.successSummaryValEmail]}>
                          {email.trim()}
                        </Text>
                      </View>

                      {location.trim() ? (
                        <View style={styles.successItemRow}>
                          <Text style={styles.successSummaryLabel}>Location</Text>
                          <Text style={styles.successSummaryVal}>{location.trim()}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Quick WhatsApp Connect & Reset Button */}
                    <View style={styles.successActionsCol}>
                      <Pressable
                        onPress={handleWhatsApp}
                        style={({ pressed }) => [styles.successWhatsAppBtn, pressed && styles.pressed]}
                        accessibilityRole="button"
                      >
                        <WhatsAppOfficialIcon size={18} />
                        <Text style={styles.successWhatsAppBtnText}>Instant Chat on WhatsApp</Text>
                      </Pressable>

                      <Pressable
                        onPress={resetForm}
                        style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.resetBtnText}>Submit Another Inquiry</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.formHeader}>
                      <Text style={styles.formTitle}>Tell Us About Your Celebration</Text>
                      <Text style={styles.formSubtitle}>
                        Fill in your details and we’ll match you with the finest verified studios available
                        for your date.
                      </Text>
                    </View>

                    {errorMsg ? (
                      <View style={styles.errorBanner}>
                        <AlertCircle size={16} color={colors.primary} />
                        <Text style={styles.errorBannerText}>{errorMsg}</Text>
                      </View>
                    ) : null}

                    {/* Full Name */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Your Full Name <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Ananya & Arjun"
                        placeholderTextColor="#94A3B8"
                        value={name}
                        onChangeText={setName}
                      />
                    </View>

                    {/* Email and Phone Grid */}
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
                          WhatsApp / Phone <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.input}
                          placeholder="10-digit mobile"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={phone}
                          onChangeText={(txt) => setPhone(txt.replace(/\D/g, "").slice(0, 10))}
                        />
                      </View>
                    </View>

                    {/* Event Type Selector */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Event / Shoot Category</Text>
                      <View style={styles.eventPillsWrap}>
                        {EVENT_OPTIONS.map((opt) => {
                          const isSelected = eventType === opt;
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => setEventType(opt)}
                              style={[styles.eventPill, isSelected && styles.eventPillSelected]}
                            >
                              <Text
                                style={[
                                  styles.eventPillText,
                                  isSelected && styles.eventPillTextSelected,
                                ]}
                              >
                                {opt}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* City / Location */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Event City or Venue Location</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Vijayawada, Vizag, Guntur, Tirupati..."
                        placeholderTextColor="#94A3B8"
                        value={location}
                        onChangeText={setLocation}
                      />
                    </View>

                    {/* Message / Vision */}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        Tell Us Your Vision or Dates <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Approximate event dates, preferred photography styles (cinematic, candid, traditional), or any questions you have in mind..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={message}
                        onChangeText={setMessage}
                      />
                    </View>

                    {/* Submit Button (Orange Only) */}
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
                          <Text style={styles.submitBtnText}>Send Shoot Inquiry</Text>
                          <Send size={16} color="#FFFFFF" />
                        </>
                      )}
                    </Pressable>

                    {/* Form Disclaimer (No Lock Icon) */}
                    <Text style={styles.formFooterDisclaimer}>
                      We respect your privacy. No spam — your details are exclusively used to share
                      custom quotes & availability.
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* ── Official Social Media Channels (Executive Grid) ────── */}
          <View style={styles.socialProSection}>
            <View style={styles.socialProHeader}>
              <View style={styles.socialProBadge}>
                <Text style={styles.socialProBadgeText}>OFFICIAL CHANNELS</Text>
              </View>
              <Text style={styles.socialProTitle}>Connect Across Our Social Community</Text>
              <Text style={styles.socialProSubtitle}>
                Follow verified client celebrations, explore behind-the-scenes shoots, and connect directly with our creative desk.
              </Text>
            </View>

            <View style={styles.socialProGrid}>
              {/* WhatsApp Concierge */}
              <Pressable
                onPress={handleWhatsApp}
                style={({ pressed }) => [styles.socialProCard, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel="WhatsApp Concierge"
              >
                <View style={styles.socialProCardTop}>
                  <View style={[styles.socialProIconBadge, { backgroundColor: "rgba(37, 211, 102, 0.12)" }]}>
                    <WhatsAppOfficialIcon size={26} />
                  </View>
                  <View style={styles.socialProActionArrow}>
                    <ArrowUpRight size={17} color="#64748B" />
                  </View>
                </View>
                <View style={styles.socialProCardBody}>
                  <Text style={styles.socialProCardName}>WhatsApp Concierge</Text>
                  <Text style={styles.socialProCardHandle}>+91 96032 15551</Text>
                  <Text style={styles.socialProCardDesc}>
                    Direct instant chat for live shoot dates, custom packages, and fast pricing.
                  </Text>
                </View>
                <View style={styles.socialProCardFooter}>
                  <View style={styles.socialProOnlineDot} />
                  <Text style={styles.socialProFooterStatus}>Online · 9 AM – 9 PM IST</Text>
                </View>
              </Pressable>

              {/* Instagram */}
              <Pressable
                onPress={() => openUrl(SOCIAL_LINKS.instagram)}
                style={({ pressed }) => [styles.socialProCard, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel="Instagram @bookashootonline"
              >
                <View style={styles.socialProCardTop}>
                  <View style={[styles.socialProIconBadge, { backgroundColor: "rgba(225, 48, 108, 0.10)" }]}>
                    <Image
                      source={require("@/assets/images/instagram.png")}
                      style={styles.socialProBadgeImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.socialProActionArrow}>
                    <ArrowUpRight size={17} color="#64748B" />
                  </View>
                </View>
                <View style={styles.socialProCardBody}>
                  <Text style={styles.socialProCardName}>Instagram</Text>
                  <Text style={styles.socialProCardHandle}>@bookashootonline</Text>
                  <Text style={styles.socialProCardDesc}>
                    Cinematic reels, bride & groom portraits, baby shoots & daily behind-the-scenes stories.
                  </Text>
                </View>
                <View style={styles.socialProCardFooter}>
                  <Text style={styles.socialProFooterTag}>Visual Portfolio</Text>
                </View>
              </Pressable>

              {/* Facebook */}
              <Pressable
                onPress={() => openUrl(SOCIAL_LINKS.facebook)}
                style={({ pressed }) => [styles.socialProCard, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel="Facebook @bookashootonline"
              >
                <View style={styles.socialProCardTop}>
                  <View style={[styles.socialProIconBadge, { backgroundColor: "rgba(24, 119, 242, 0.10)" }]}>
                    <Image
                      source={require("@/assets/images/facebook.png")}
                      style={styles.socialProBadgeImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.socialProActionArrow}>
                    <ArrowUpRight size={17} color="#64748B" />
                  </View>
                </View>
                <View style={styles.socialProCardBody}>
                  <Text style={styles.socialProCardName}>Facebook</Text>
                  <Text style={styles.socialProCardHandle}>bookashootonline</Text>
                  <Text style={styles.socialProCardDesc}>
                    Verified client reviews, complete event photo albums, and festival coverage updates.
                  </Text>
                </View>
                <View style={styles.socialProCardFooter}>
                  <Text style={styles.socialProFooterTag}>Community & Reviews</Text>
                </View>
              </Pressable>

              {/* LinkedIn */}
              <Pressable
                onPress={() => openUrl(SOCIAL_LINKS.linkedin)}
                style={({ pressed }) => [styles.socialProCard, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel="LinkedIn Book A Shoot"
              >
                <View style={styles.socialProCardTop}>
                  <View style={[styles.socialProIconBadge, { backgroundColor: "rgba(10, 102, 194, 0.10)" }]}>
                    <Image
                      source={require("@/assets/images/linkedin.png")}
                      style={styles.socialProBadgeImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.socialProActionArrow}>
                    <ArrowUpRight size={17} color="#64748B" />
                  </View>
                </View>
                <View style={styles.socialProCardBody}>
                  <Text style={styles.socialProCardName}>LinkedIn</Text>
                  <Text style={styles.socialProCardHandle}>Book A Shoot</Text>
                  <Text style={styles.socialProCardDesc}>
                    Creative industry network, studio partnerships, company culture & announcements.
                  </Text>
                </View>
                <View style={styles.socialProCardFooter}>
                  <Text style={styles.socialProFooterTag}>Company & Network</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Universal Constant Footer ───────────────────────────────── */}
        <UniversalFooter />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stylesheet
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Full Hero Section (Centered, No White Box, No Black Screen) ───────────
  heroContainer: {
    position: "relative",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#0f172a",
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
  heroTitle: {
    fontSize: 38,
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 48,
    letterSpacing: -0.8,
    marginBottom: 14,
    textAlign: "center",
  },
  heroTitlePhone: {
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  heroFlirtyLine: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 26,
    marginBottom: 14,
    textAlign: "center",
    maxWidth: 820,
  },
  heroFlirtyLinePhone: {
    fontSize: 16,
    lineHeight: 24,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 720,
    fontWeight: "500",
    opacity: 0.95,
  },
  heroSubtitlePhone: {
    fontSize: 13.5,
    lineHeight: 21,
  },

  // ── Main Body Container ────────────────────────────────────────────────────
  bodyContainer: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 36,
  },
  bodyContainerWide: {
    paddingHorizontal: 48,
    paddingTop: 44,
  },

  // ── Executive Official Social Media Channels ──────────────────────────────
  socialProSection: {
    marginTop: 48,
    paddingTop: 36,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: "100%",
  },
  socialProHeader: {
    marginBottom: 22,
  },
  socialProBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 107, 53, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.20)",
  },
  socialProBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.8,
  },
  socialProTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  socialProSubtitle: {
    fontSize: 13.5,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 20,
    maxWidth: 620,
  },
  socialProGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  socialProCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  socialProCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  socialProIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  socialProBadgeImg: {
    width: 26,
    height: 26,
  },
  socialProActionArrow: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  socialProCardBody: {
    gap: 3,
  },
  socialProCardName: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  socialProCardHandle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  socialProCardDesc: {
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 4,
  },
  socialProCardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  socialProOnlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
  },
  socialProFooterStatus: {
    fontSize: 11.5,
    color: "#16A34A",
    fontWeight: "600",
  },
  socialProFooterTag: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // ── Main Two-Column Row ────────────────────────────────────────────────────
  mainRow: {
    flexDirection: "column",
    gap: 28,
  },
  mainRowWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoCol: {
    flex: 1,
  },
  infoColWide: {
    maxWidth: 420,
  },
  formCol: {
    flex: 1.4,
  },
  formColWide: {},

  // ── Single Unified Card on the Left ────────────────────────────────────────
  singleUnifiedCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardSection: {
    width: "100%",
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 13.5,
    color: "#64748B",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  conciergeList: {
    gap: 10,
  },
  conciergeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  conciergeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  conciergeTextCol: {
    flex: 1,
  },
  conciergeLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9A3412",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  conciergeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 20,
  },
  locationItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 12,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  locationDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  assuranceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  assuranceDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },

  // ── Contact Form Card ──────────────────────────────────────────────────────
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: 13.5,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.peach,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.peachBorder,
  },
  errorBannerText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: "column",
    gap: 16,
  },
  fieldRowWide: {
    flexDirection: "row",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 6,
  },
  requiredStar: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  textArea: {
    minHeight: 90,
  },
  eventPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  eventPill: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  eventPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  eventPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  eventPillTextSelected: {
    color: colors.white,
    fontWeight: "700",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  formFooterDisclaimer: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 17,
  },

  // Success State
  successContainer: {
    alignItems: "center",
    paddingVertical: 18,
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
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  successNameText: {
    fontWeight: "600",
    color: colors.text,
  },
  successSub: {
    fontSize: 13.5,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 420,
    marginBottom: 20,
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
  successSummaryValEmail: {
    color: colors.primaryDark,
  },
  successActionsCol: {
    width: "100%",
    gap: 10,
  },
  successWhatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  successWhatsAppBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  resetBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },

  // ── Professional Footer with Social Icons & Contact Details ───────────────
  footer: {
    marginTop: 56,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 36,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  footerWide: {
    paddingHorizontal: 48,
  },
  footerBrand: {
    alignItems: "center",
    marginBottom: 16,
  },
  footerLogo: {
    width: 170,
    height: 44,
    marginBottom: 8,
  },
  footerTagline: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 440,
  },
  footerContactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingVertical: 8,
  },
  footerContactRowWide: {
    gap: 16,
  },
  footerContactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerContactText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  footerSocialIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  footerSocialIconBtn: {
    padding: 4,
    borderRadius: 8,
  },
  footerSocialIconImg: {
    width: 26,
    height: 26,
  },
  footerLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  footerDot: {
    fontSize: 12,
    color: colors.muted,
  },
  footerDivider: {
    width: "100%",
    maxWidth: 600,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  copyright: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
});
