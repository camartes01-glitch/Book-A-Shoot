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
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react-native";
import { colors, radius, spacing } from "@/src/constants/theme";

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
  const SUPPORT_EMAIL = "support@camartes.com";

  // Official Social Backlinks
  const SOCIAL_LINKS = {
    instagram: "https://instagram.com/camartes_official",
    facebook: "https://facebook.com/camartes",
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
      const resendApiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY;
      const receiverEmail = process.env.EXPO_PUBLIC_CONTACT_RECEIVER_EMAIL || SUPPORT_EMAIL;

      const emailPayload = {
        from: "Book A Shoot <onboarding@resend.dev>",
        to: [receiverEmail],
        reply_to: cleanEmail,
        subject: `📸 New Shoot Inquiry from ${name.trim()} (${eventType})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFF8F0; padding: 32px; border-radius: 16px; border: 1px solid #FFEDD5;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #EA580C; margin: 0; font-size: 24px; font-weight: 800;">Book A Shoot</h1>
              <p style="color: #64748B; font-size: 14px; margin-top: 4px;">Powered by Camartes</p>
            </div>
            
            <div style="background: #FFFFFF; border-radius: 12px; padding: 24px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <h2 style="color: #0F172A; font-size: 18px; margin-top: 0; border-bottom: 2px solid #FFF8F0; padding-bottom: 12px;">
                🎉 New Client Shoot Inquiry
              </h2>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748B; font-weight: 600; width: 140px;">Client Name:</td>
                  <td style="padding: 8px 0; color: #0F172A; font-weight: 700;">${name.trim()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0; color: #0F172A;"><a href="mailto:${cleanEmail}" style="color: #EA580C;">${cleanEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748B; font-weight: 600;">WhatsApp / Phone:</td>
                  <td style="padding: 8px 0; color: #0F172A;"><a href="tel:+91${cleanPhone}" style="color: #EA580C;">+91 ${cleanPhone}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Event Type:</td>
                  <td style="padding: 8px 0; color: #0F172A; font-weight: 700;">${eventType}</td>
                </tr>
                ${location.trim()
            ? `<tr>
                        <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Location / City:</td>
                        <td style="padding: 8px 0; color: #0F172A;">${location.trim()}</td>
                      </tr>`
            : ""
          }
              </table>

              <div style="margin-top: 20px; padding: 16px; background: #FFF7ED; border-radius: 8px; border-left: 4px solid #EA580C;">
                <p style="margin: 0; font-size: 13px; font-weight: 700; color: #9A3412;">Client's Vision & Note:</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #94A3B8;">
              <p>Submitted via Book A Shoot Web Application • Received at ${new Date().toLocaleString("en-IN")}</p>
            </div>
          </div>
        `,
      };

      if (resendApiKey) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.warn("Resend API response error:", errData);
          throw new Error(errData?.message || "Failed to deliver email through Resend API.");
        }
      } else {
        console.log("Resend API Key is not set in environment yet. Email payload ready:", emailPayload);
        await new Promise((resolve) => setTimeout(resolve, 800));
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
      {/* ── Fixed / Floating Navbar ────────────────────────────────────── */}
      <View style={[styles.navbar, { paddingTop: insets.top }]}>
        <View style={[styles.navInner, isWide && styles.navInnerWide]}>
          <Pressable
            onPress={goToHome}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <ArrowLeft size={18} color={colors.primary} />
            <Text style={styles.backBtnText}>Home</Text>
          </Pressable>

          <Pressable onPress={goToHome} style={styles.navLogoContainer}>
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={[styles.navLogo, !isWide && styles.navLogoPhone]}
              resizeMode="contain"
              accessibilityLabel="Book A Shoot"
            />
          </Pressable>

          <View style={styles.navActions}>
            {isWide && (
              <Pressable
                onPress={goToServices}
                style={({ pressed }) => [styles.navGhostBtn, pressed && styles.pressed]}
                accessibilityRole="link"
              >
                <Text style={styles.navGhostText}>Services</Text>
              </Pressable>
            )}
            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [
                styles.navPrimaryBtn,
                !isWide && styles.navPrimaryBtnPhone,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.navPrimaryText}>Book Now</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Scrollable Content ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + (isWide ? 76 : 64),
          paddingBottom: Math.max(insets.bottom + 40, 60),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Full Hero Section with Responsive Background (No Black Screen, No White Box, Center of Page) ── */}
        <View style={[styles.heroContainer, isWide ? styles.heroContainerDesktop : styles.heroContainerMobile]}>
          {/* Background Image: contact.png on desktop, phonecontact.png on mobile */}
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

          {/* Light beige screen over the image */}
          <View style={styles.heroBeigeOverlay} pointerEvents="none" />

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
          {/* ── Compact Social Media Section (Simple Heading & Official Icons) ──── */}
          <View style={styles.socialSimpleSection}>
            <View style={styles.socialSimpleHeader}>
              <Text style={styles.socialSimpleTitle}>Connect With Us</Text>
              <Text style={styles.socialSimpleSub}>
                Chat directly with our team or explore our latest wedding films and client stories.
              </Text>
            </View>

            <View style={styles.socialIconsRow}>
              {/* WhatsApp: Official Green Icon (+91 96032 15551) */}
              <Pressable
                onPress={handleWhatsApp}
                style={({ pressed }) => [styles.socialIconItem, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel="WhatsApp support at +91 96032 15551"
              >
                <WhatsAppOfficialIcon size={34} />
                <View style={styles.socialIconTextCol}>
                  <Text style={styles.socialIconTitle}>WhatsApp</Text>
                  <Text style={styles.socialIconMeta}>{WHATSAPP_NUMBER}</Text>
                </View>
              </Pressable>

              {/* Instagram: Official Original Sunset Gradient Colors */}
              <Pressable
                onPress={() => openUrl(SOCIAL_LINKS.instagram)}
                style={({ pressed }) => [styles.socialIconItem, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel="Instagram @camartes_official"
              >
                <Image
                  source={require("@/assets/images/instagram.png")}
                  style={styles.socialIconImg}
                  resizeMode="contain"
                />
                <View style={styles.socialIconTextCol}>
                  <Text style={styles.socialIconTitle}>Instagram</Text>
                  <Text style={styles.socialIconMeta}>@camartes_official</Text>
                </View>
              </Pressable>

              {/* Facebook: Official Blue Icon */}
              <Pressable
                onPress={() => openUrl(SOCIAL_LINKS.facebook)}
                style={({ pressed }) => [styles.socialIconItem, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel="Facebook Book A Shoot"
              >
                <FacebookOfficialIcon size={34} />
                <View style={styles.socialIconTextCol}>
                  <Text style={styles.socialIconTitle}>Facebook</Text>
                  <Text style={styles.socialIconMeta}>Book A Shoot</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* ── Main Two-Column Row: Contact Form + Direct Info ───────────── */}
          <View style={[styles.mainRow, isWide && styles.mainRowWide]}>
            {/* Left Column: Direct Studio & Support Info (Orange Icons Only) */}
            <View style={[styles.infoCol, isWide && styles.infoColWide]}>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>Direct Concierge & Help</Text>
                <Text style={styles.infoBoxDesc}>
                  We're available every day from 9:00 AM to 9:00 PM IST to assist you with dates, bespoke
                  requirements, and custom packages.
                </Text>

                <View style={styles.contactList}>
                  {/* WhatsApp Support */}
                  <Pressable
                    onPress={handleWhatsApp}
                    style={({ pressed }) => [styles.contactListItem, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <View style={styles.contactListIcon}>
                      <MessageCircle size={18} color={colors.primary} />
                    </View>
                    <View style={styles.contactListTextCol}>
                      <Text style={styles.contactListLabel}>WhatsApp Concierge</Text>
                      <Text style={styles.contactListValue}>{WHATSAPP_NUMBER}</Text>
                    </View>
                  </Pressable>

                  {/* Phone Support */}
                  <Pressable
                    onPress={handleCall}
                    style={({ pressed }) => [styles.contactListItem, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <View style={styles.contactListIcon}>
                      <Phone size={18} color={colors.primary} />
                    </View>
                    <View style={styles.contactListTextCol}>
                      <Text style={styles.contactListLabel}>Direct Phone Call</Text>
                      <Text style={styles.contactListValue}>{WHATSAPP_NUMBER}</Text>
                    </View>
                  </Pressable>

                  {/* Email Support */}
                  <Pressable
                    onPress={handleEmailSupport}
                    style={({ pressed }) => [styles.contactListItem, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <View style={styles.contactListIcon}>
                      <Mail size={18} color={colors.primary} />
                    </View>
                    <View style={styles.contactListTextCol}>
                      <Text style={styles.contactListLabel}>Email Support</Text>
                      <Text style={styles.contactListValue}>{SUPPORT_EMAIL}</Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Physical Studio Hubs */}
              <View style={styles.studiosBox}>
                <Text style={styles.infoBoxTitle}>Studio Hubs & Presence</Text>
                <View style={styles.studioItem}>
                  <MapPin size={18} color={colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.studioCity}>Hyderabad (Headquarters)</Text>
                    <Text style={styles.studioAddr}>
                      Camartes, Hitech City & Jubilee Hills Studio, Hyderabad, Telangana 500081
                    </Text>
                  </View>
                </View>

                <View style={[styles.studioItem, { marginTop: 12 }]}>
                  <MapPin size={18} color={colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.studioCity}>Bengaluru (Regional Hub)</Text>
                    <Text style={styles.studioAddr}>
                      Indiranagar Creative Collective, 100 Feet Road, Bengaluru, Karnataka 560038
                    </Text>
                  </View>
                </View>
              </View>

              {/* Trust Badge Guarantee */}
              <View style={styles.guaranteeBox}>
                <ShieldCheck size={26} color={colors.primary} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.guaranteeTitle}>The Camartes Assurance</Text>
                  <Text style={styles.guaranteeDesc}>
                    Every studio on Book A Shoot is 100% KYC verified, audited for dual-card equipment
                    redundancy, and backed by our automated replacement guarantee.
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Column: Interactive Shoot Inquiry Form */}
            <View style={[styles.formCol, isWide && styles.formColWide]}>
              <View style={styles.formCard}>
                {submitted ? (
                  <View style={styles.successContainer}>
                    <View style={styles.successIconCircle}>
                      <CheckCircle2 size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.successTitle}>Inquiry Sent Beautifully!</Text>
                    <Text style={styles.successSub}>
                      Thank you, <Text style={{ fontWeight: "700", color: colors.text }}>{name}</Text>! We’ve
                      received your shoot details. Our creative team will review your date & vision and
                      reach out via WhatsApp or email within 2 hours.
                    </Text>

                    <View style={styles.successSummaryBox}>
                      <View style={styles.successSummaryRow}>
                        <Text style={styles.successSummaryLabel}>Event:</Text>
                        <Text style={styles.successSummaryVal}>{eventType}</Text>
                      </View>
                      <View style={styles.successSummaryRow}>
                        <Text style={styles.successSummaryLabel}>Contact:</Text>
                        <Text style={styles.successSummaryVal}>+91 {phone}</Text>
                      </View>
                      <View style={styles.successSummaryRow}>
                        <Text style={styles.successSummaryLabel}>Email:</Text>
                        <Text style={styles.successSummaryVal}>{email}</Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={resetForm}
                      style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.resetBtnText}>Send Another Message</Text>
                    </Pressable>
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
                        placeholder="e.g. Hyderabad, Bengaluru, Goa..."
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
        </View>

        {/* ── Professional Footer with Social Icons & Contact Details ────── */}
        <View style={[styles.footer, isWide && styles.footerWide]}>
          {/* Brand & Tagline */}
          <View style={styles.footerBrand}>
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={styles.footerLogo}
              resizeMode="contain"
              accessibilityLabel="Book A Shoot"
            />
            <Text style={styles.footerTagline}>
              India's trusted platform for booking verified event & wedding photographers.
            </Text>
          </View>

          {/* Contact Details Row in Footer */}
          <View style={[styles.footerContactRow, isWide && styles.footerContactRowWide]}>
            <Pressable onPress={handleWhatsApp} style={styles.footerContactItem}>
              <Phone size={14} color={colors.primary} />
              <Text style={styles.footerContactText}>{WHATSAPP_NUMBER}</Text>
            </Pressable>

            <Text style={styles.footerDot}>•</Text>

            <Pressable onPress={handleEmailSupport} style={styles.footerContactItem}>
              <Mail size={14} color={colors.primary} />
              <Text style={styles.footerContactText}>{SUPPORT_EMAIL}</Text>
            </Pressable>

            <Text style={styles.footerDot}>•</Text>

            <View style={styles.footerContactItem}>
              <MapPin size={14} color={colors.primary} />
              <Text style={styles.footerContactText}>Hyderabad & Bengaluru</Text>
            </View>
          </View>

          {/* Official Social Media Icons Row in Footer */}
          <View style={styles.footerSocialIconsRow}>
            <Pressable
              onPress={handleWhatsApp}
              style={({ pressed }) => [styles.footerSocialIconBtn, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel="WhatsApp support"
            >
              <WhatsAppOfficialIcon size={26} />
            </Pressable>

            <Pressable
              onPress={() => openUrl(SOCIAL_LINKS.instagram)}
              style={({ pressed }) => [styles.footerSocialIconBtn, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel="Instagram"
            >
              <Image
                source={require("@/assets/images/instagram.png")}
                style={styles.footerSocialIconImg}
                resizeMode="contain"
              />
            </Pressable>

            <Pressable
              onPress={() => openUrl(SOCIAL_LINKS.facebook)}
              style={({ pressed }) => [styles.footerSocialIconBtn, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel="Facebook"
            >
              <FacebookOfficialIcon size={26} />
            </Pressable>
          </View>

          {/* Navigation Links */}
          <View style={styles.footerLinksRow}>
            <Pressable onPress={goToHome}><Text style={styles.footerLinkText}>Home</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={goToServices}><Text style={styles.footerLinkText}>Services</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={goToAbout}><Text style={styles.footerLinkText}>About Us</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={goToBlogs}><Text style={styles.footerLinkText}>Blogs</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/privacy")}><Text style={styles.footerLinkText}>Privacy</Text></Pressable>
            <Text style={styles.footerDot}>•</Text>
            <Pressable onPress={() => router.push("/terms")}><Text style={styles.footerLinkText}>Terms</Text></Pressable>
          </View>

          <View style={styles.footerDivider} />
          <Text style={styles.copyright}>© 2025 Book A Shoot · Powered by Camartes</Text>
        </View>
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
  },
  heroContainerDesktop: {
    minHeight: 520,
    paddingVertical: 80,
  },
  heroContainerMobile: {
    minHeight: 460,
    paddingVertical: 60,
  },
  heroBeigeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 247, 237, 0.42)",
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
    fontWeight: "800",
    color: colors.primary,
    lineHeight: 48,
    letterSpacing: -0.8,
    marginBottom: 16,
    textAlign: "center",
  },
  heroTitlePhone: {
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  heroFlirtyLine: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 28,
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

  // ── Compact Social Media Section (Simple Heading & Icons) ──────────────────
  socialSimpleSection: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  socialSimpleHeader: {
    marginBottom: 16,
  },
  socialSimpleTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  socialSimpleSub: {
    fontSize: 13.5,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 19,
  },
  socialIconsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  socialIconItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 180,
    flex: 1,
  },
  socialIconImg: {
    width: 34,
    height: 34,
  },
  socialIconTextCol: {
    flex: 1,
  },
  socialIconTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.text,
  },
  socialIconMeta: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 1,
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
    gap: 20,
  },
  infoColWide: {
    maxWidth: 420,
  },
  formCol: {
    flex: 1.4,
  },
  formColWide: {},

  // Info Boxes (Only Orange Icons)
  infoBox: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoBoxTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  infoBoxDesc: {
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 18,
  },
  contactList: {
    gap: 12,
  },
  contactListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  contactListIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  contactListTextCol: {
    flex: 1,
  },
  contactListLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
  },
  contactListValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 1,
  },

  // Studios Box
  studiosBox: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  studioItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  studioCity: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.text,
  },
  studioAddr: {
    fontSize: 12.5,
    color: colors.muted,
    lineHeight: 18,
  },

  // Guarantee Box
  guaranteeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.bgWarm,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: 16,
    padding: 18,
  },
  guaranteeTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.primary,
  },
  guaranteeDesc: {
    fontSize: 12.5,
    color: colors.text,
    lineHeight: 18,
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
    fontWeight: "800",
    color: colors.text,
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
    fontWeight: "700",
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
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  successSub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 440,
    marginBottom: 20,
  },
  successSummaryBox: {
    width: "100%",
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    gap: 8,
  },
  successSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  successSummaryLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  successSummaryVal: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
  },
  resetBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius,
  },
  resetBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
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
