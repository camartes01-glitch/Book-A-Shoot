/**
 * Universal Footer Component
 * Constant, professional footer used across all pages of Book A Shoot:
 * - Brand wordmark & tagline
 * - Official contact details: Phone (+91 96032 15551), Email (info@bookashoot.online), HeadQuarters (RTIH Vijayawada)
 * - Official social media channels: WhatsApp, Instagram (@bookashootonline), Facebook (@bookashootonline), LinkedIn
 * - Navigation links & copyright
 */

import React from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Mail, MapPin, Phone } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { colors, spacing } from "@/src/constants/theme";

const PHONE_NUMBER = "+91 96032 15551";
const EMAIL_ADDRESS = "info@bookashoot.online";
const LOCATION_HQ = "HeadQuarters: RTIH Vijayawada";

const SOCIAL_LINKS = {
  whatsapp: `https://wa.me/919603215551?text=${encodeURIComponent(
    "Hi Book A Shoot team! I'm interested in booking a photography shoot."
  )}`,
  instagram: "https://instagram.com/bookashootonline",
  facebook: "https://facebook.com/bookashootonline",
  linkedin: "https://linkedin.com/company/bookashootonline",
};

function WhatsAppIcon({ size = 26 }: { size?: number }) {
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

interface UniversalFooterProps {
  showHqLocation?: boolean;
}

export function UniversalFooter({ showHqLocation = true }: UniversalFooterProps = {}) {
  const { width: W } = useWindowDimensions();
  const isWide = W >= 768;

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleCall = () => {
    openUrl(`tel:${PHONE_NUMBER.replace(/\s+/g, "")}`);
  };

  const handleEmail = () => {
    openUrl(`mailto:${EMAIL_ADDRESS}?subject=${encodeURIComponent("Customer Inquiry — Book A Shoot")}`);
  };

  const goToHome = () => router.push("/landing");
  const goToServices = () => router.push("/services");
  const goToAbout = () => router.push("/about");
  const goToBlogs = () => router.push("/blogs");
  const goToContact = () => router.push("/contact");

  return (
    <View style={[styles.footer, isWide && styles.footerWide]}>
      {/* Brand & Tagline */}
      <View style={styles.footerBrand}>
        <Pressable onPress={goToHome}>
          <Image
            source={require("@/assets/images/book-a-shoot-wordmark.png")}
            style={styles.footerLogo}
            resizeMode="contain"
            accessibilityLabel="Book A Shoot"
          />
        </Pressable>
        <Text style={styles.footerTagline}>
          India's trusted platform for booking verified event & wedding photographers.
        </Text>
      </View>

      {/* Official Contact Details Row */}
      <View style={[styles.footerContactRow, isWide && styles.footerContactRowWide]}>
        <Pressable onPress={handleCall} style={styles.footerContactItem} accessibilityRole="button">
          <Phone size={14} color={colors.primary} />
          <Text style={styles.footerContactText}>{PHONE_NUMBER}</Text>
        </Pressable>

        <Text style={styles.footerDot}>•</Text>

        <Pressable onPress={handleEmail} style={styles.footerContactItem} accessibilityRole="button">
          <Mail size={14} color={colors.primary} />
          <Text style={styles.footerContactText}>{EMAIL_ADDRESS}</Text>
        </Pressable>

        {showHqLocation && (
          <>
            <Text style={styles.footerDot}>•</Text>
            <View style={styles.footerContactItem}>
              <MapPin size={14} color={colors.primary} />
              <Text style={styles.footerContactText}>{LOCATION_HQ}</Text>
            </View>
          </>
        )}
      </View>

      {/* Official Social Media Icons with Links */}
      <View style={styles.footerSocialIconsRow}>
        {/* WhatsApp */}
        <Pressable
          onPress={() => openUrl(SOCIAL_LINKS.whatsapp)}
          style={({ pressed }) => [styles.footerSocialIconBtn, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel="WhatsApp Support"
        >
          <WhatsAppIcon size={26} />
        </Pressable>

        {/* Instagram (@bookashootonline) */}
        <Pressable
          onPress={() => openUrl(SOCIAL_LINKS.instagram)}
          style={({ pressed }) => [styles.footerSocialIconBtn, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel="Instagram @bookashootonline"
        >
          <Image
            source={require("@/assets/images/instagram.png")}
            style={styles.footerSocialIconImg}
            resizeMode="contain"
          />
        </Pressable>

        {/* Facebook (@bookashootonline) */}
        <Pressable
          onPress={() => openUrl(SOCIAL_LINKS.facebook)}
          style={({ pressed }) => [styles.footerSocialIconBtn, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel="Facebook @bookashootonline"
        >
          <Image
            source={require("@/assets/images/facebook.png")}
            style={styles.footerSocialIconImg}
            resizeMode="contain"
          />
        </Pressable>

        {/* LinkedIn */}
        <Pressable
          onPress={() => openUrl(SOCIAL_LINKS.linkedin)}
          style={({ pressed }) => [styles.footerSocialIconBtn, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel="LinkedIn Book A Shoot"
        >
          <Image
            source={require("@/assets/images/linkedin.png")}
            style={styles.footerSocialIconImg}
            resizeMode="contain"
          />
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
        <Pressable onPress={goToContact}><Text style={styles.footerLinkText}>Contact Us</Text></Pressable>
        <Text style={styles.footerDot}>•</Text>
        <Pressable onPress={() => router.push("/careers")}><Text style={styles.footerLinkText}>Careers</Text></Pressable>
        <Text style={styles.footerDot}>•</Text>
        <Pressable onPress={() => router.push("/privacy")}><Text style={styles.footerLinkText}>Privacy</Text></Pressable>
        <Text style={styles.footerDot}>•</Text>
        <Pressable onPress={() => router.push("/terms")}><Text style={styles.footerLinkText}>Terms</Text></Pressable>
      </View>

      <View style={styles.footerDivider} />
      <Text style={styles.copyright}>© 2026 Book A Shoot · Powered by Camartes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 56,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 36,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    alignItems: "center",
    backgroundColor: colors.bg,
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
  pressed: {
    opacity: 0.75,
  },
});
