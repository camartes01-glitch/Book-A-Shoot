/**
 * Universal Navbar Component — Book A Shoot
 * Constant, executive header used across all platform pages:
 * - Brand wordmark logo (direct navigation to /landing)
 * - Navigation links: Services, Company (interactive hover slide-down dropdown), Contact Us, Partner with Us
 * - Company Dropdown contains:
 *     1. About Us (/about)
 *     2. Careers (/careers)
 *     3. Blogs (/blogs)
 * - Auth actions: Login / Dashboard & Primary "Book Now" CTA
 * - Fully responsive with desktop hover dropdown & mobile touch accordion
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  ChevronDown,
  ExternalLink,
  Heart,
  Menu,
  MessageSquare,
  Sparkles,
  Users2,
  X,
} from "lucide-react-native";
import { colors, radius, radiusSm, spacing } from "@/src/constants/theme";
import { useAppStore } from "@/src/state/AppProvider";

interface UniversalNavbarProps {
  activeRoute?: "home" | "services" | "about" | "careers" | "blogs" | "contact";
}

export function UniversalNavbar({ activeRoute }: UniversalNavbarProps) {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = W >= 768;
  const { profile } = useAppStore();
  const isLoggedIn = Boolean(profile);

  // Dropdown & Mobile Menu States
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [companyHovered, setCompanyHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const closeTimerRef = useRef<any>(null);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setCompanyHovered(true);
    setIsCompanyOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setCompanyHovered(false);
      setIsCompanyOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const goToHome = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    router.push("/landing");
  };

  const goToServices = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    router.push("/services");
  };

  const goToAbout = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    router.push("/about");
  };

  const goToCareers = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    router.push("/careers");
  };

  const goToBlogs = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    router.push("/blogs");
  };

  const goToContact = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    router.push("/contact");
  };

  const goToPartner = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    Linking.openURL("https://camartes.com").catch(() => {});
  };

  const goToLogin = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    if (isLoggedIn) {
      router.push("/(tabs)");
    } else {
      router.push("/(auth)/login");
    }
  };

  const goToBooking = () => {
    setIsMobileMenuOpen(false);
    setIsCompanyOpen(false);
    if (isLoggedIn) {
      router.push("/booking/new");
    } else {
      router.push("/(auth)/login");
    }
  };

  const isCompanyActive =
    activeRoute === "about" || activeRoute === "careers" || activeRoute === "blogs";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={[styles.navContainer, isWide && styles.navContainerWide]}>
        {/* Left: Brand Wordmark Logo */}
        <View style={styles.leftCol}>
          <Pressable
            id="nav-logo"
            onPress={goToHome}
            style={({ pressed }) => [styles.logoBtn, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel="Book A Shoot Home"
          >
            <Image
              source={require("@/assets/images/book-a-shoot-wordmark.png")}
              style={[styles.logoImg, !isWide && styles.logoImgPhone]}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        {/* Center: Desktop Navigation Links */}
        {isWide && (
          <View style={styles.centerNavLinks}>
            {/* Services Link */}
            <Pressable
              id="nav-link-services"
              onPress={goToServices}
              style={({ pressed }) => [
                styles.navLinkItem,
                activeRoute === "services" && styles.navLinkItemActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="link"
            >
              <Text
                style={[
                  styles.navLinkText,
                  activeRoute === "services" && styles.navLinkTextActive,
                ]}
              >
                Services
              </Text>
            </Pressable>

            {/* Company Link with Slide-Down Dropdown */}
            <View
              // @ts-ignore — React Native Web supports onMouseEnter / onMouseLeave
              onMouseEnter={handleMouseEnter}
              // @ts-ignore
              onMouseLeave={handleMouseLeave}
              style={styles.dropdownTriggerWrap}
            >
              <Pressable
                id="nav-link-company"
                onPress={() => setIsCompanyOpen((prev) => !prev)}
                style={({ pressed }) => [
                  styles.navLinkItem,
                  (isCompanyActive || isCompanyOpen) && styles.navLinkItemActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Company Menu"
                aria-expanded={isCompanyOpen}
              >
                <Text
                  style={[
                    styles.navLinkText,
                    (isCompanyActive || isCompanyOpen) && styles.navLinkTextActive,
                  ]}
                >
                  Company
                </Text>
                <View
                  style={[
                    styles.chevronWrap,
                    isCompanyOpen && styles.chevronWrapOpen,
                  ]}
                >
                  <ChevronDown
                    size={14}
                    color={
                      isCompanyActive || isCompanyOpen
                        ? colors.primary
                        : colors.text
                    }
                  />
                </View>
              </Pressable>

              {/* ── Slide-Down Dropdown Menu ────────────────────────────── */}
              {isCompanyOpen && (
                <View
                  // @ts-ignore
                  onMouseEnter={handleMouseEnter}
                  // @ts-ignore
                  onMouseLeave={handleMouseLeave}
                  style={[
                    styles.dropdownMenu,
                    // Web transition
                    Platform.OS === "web"
                      ? ({
                          animation: "dropdownSlideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        } as any)
                      : null,
                  ]}
                >
                  {/* Subtle top indicator notch */}
                  <View style={styles.dropdownNotch} />

                  {/* 1. About Us */}
                  <Pressable
                    id="nav-dropdown-about"
                    onPress={goToAbout}
                    // @ts-ignore
                    onMouseEnter={() => setHoveredItem("about")}
                    // @ts-ignore
                    onMouseLeave={() => setHoveredItem(null)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      hoveredItem === "about" && styles.dropdownItemHovered,
                      activeRoute === "about" && styles.dropdownItemActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="link"
                  >
                    <View
                      style={[
                        styles.dropdownItemIconCircle,
                        (hoveredItem === "about" || activeRoute === "about") &&
                          styles.dropdownItemIconCircleActive,
                      ]}
                    >
                      <Users2
                        size={17}
                        color={
                          hoveredItem === "about" || activeRoute === "about"
                            ? colors.primary
                            : "#64748B"
                        }
                      />
                    </View>
                    <View style={styles.dropdownItemTextCol}>
                      <Text
                        style={[
                          styles.dropdownItemTitle,
                          (hoveredItem === "about" || activeRoute === "about") &&
                            styles.dropdownItemTitleActive,
                        ]}
                      >
                        About Us
                      </Text>
                      <Text style={styles.dropdownItemDesc}>
                        Our mission, KYC verification & quality standards
                      </Text>
                    </View>
                  </Pressable>

                  {/* 2. Careers */}
                  <Pressable
                    id="nav-dropdown-careers"
                    onPress={goToCareers}
                    // @ts-ignore
                    onMouseEnter={() => setHoveredItem("careers")}
                    // @ts-ignore
                    onMouseLeave={() => setHoveredItem(null)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      hoveredItem === "careers" && styles.dropdownItemHovered,
                      activeRoute === "careers" && styles.dropdownItemActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="link"
                  >
                    <View
                      style={[
                        styles.dropdownItemIconCircle,
                        (hoveredItem === "careers" || activeRoute === "careers") &&
                          styles.dropdownItemIconCircleActive,
                      ]}
                    >
                      <Briefcase
                        size={17}
                        color={
                          hoveredItem === "careers" || activeRoute === "careers"
                            ? colors.primary
                            : "#64748B"
                        }
                      />
                    </View>
                    <View style={styles.dropdownItemTextCol}>
                      <Text
                        style={[
                          styles.dropdownItemTitle,
                          (hoveredItem === "careers" || activeRoute === "careers") &&
                            styles.dropdownItemTitleActive,
                        ]}
                      >
                        Careers
                      </Text>
                      <Text style={styles.dropdownItemDesc}>
                        Join our creative storytelling & tech team
                      </Text>
                    </View>
                  </Pressable>

                  {/* 3. Blogs */}
                  <Pressable
                    id="nav-dropdown-blogs"
                    onPress={goToBlogs}
                    // @ts-ignore
                    onMouseEnter={() => setHoveredItem("blogs")}
                    // @ts-ignore
                    onMouseLeave={() => setHoveredItem(null)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      hoveredItem === "blogs" && styles.dropdownItemHovered,
                      activeRoute === "blogs" && styles.dropdownItemActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="link"
                  >
                    <View
                      style={[
                        styles.dropdownItemIconCircle,
                        (hoveredItem === "blogs" || activeRoute === "blogs") &&
                          styles.dropdownItemIconCircleActive,
                      ]}
                    >
                      <BookOpen
                        size={17}
                        color={
                          hoveredItem === "blogs" || activeRoute === "blogs"
                            ? colors.primary
                            : "#64748B"
                        }
                      />
                    </View>
                    <View style={styles.dropdownItemTextCol}>
                      <Text
                        style={[
                          styles.dropdownItemTitle,
                          (hoveredItem === "blogs" || activeRoute === "blogs") &&
                            styles.dropdownItemTitleActive,
                        ]}
                      >
                        Blogs & Stories
                      </Text>
                      <Text style={styles.dropdownItemDesc}>
                        Style guides, wedding advice & production tips
                      </Text>
                    </View>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Contact Us */}
            <Pressable
              id="nav-link-contact"
              onPress={goToContact}
              style={({ pressed }) => [
                styles.navLinkItem,
                activeRoute === "contact" && styles.navLinkItemActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="link"
            >
              <Text
                style={[
                  styles.navLinkText,
                  activeRoute === "contact" && styles.navLinkTextActive,
                ]}
              >
                Contact Us
              </Text>
            </Pressable>

            {/* Partner with Us */}
            <Pressable
              id="nav-link-partner"
              onPress={goToPartner}
              style={({ pressed }) => [styles.navLinkItem, pressed && styles.pressed]}
              accessibilityRole="link"
            >
              <Text style={styles.navLinkText}>Partner with Us</Text>
              <ExternalLink size={12} color="#94A3B8" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        )}

        {/* Right: Auth & CTA Buttons */}
        <View style={styles.rightCol}>
          {isWide ? (
            <>
              <Pressable
                id="nav-login-btn"
                onPress={goToLogin}
                style={({ pressed }) => [styles.ghostLoginBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={isLoggedIn ? "Go to Dashboard" : "Log In"}
              >
                <Text style={styles.ghostLoginText}>
                  {isLoggedIn ? "Dashboard" : "Log In"}
                </Text>
              </Pressable>

              <Pressable
                id="nav-book-btn"
                onPress={goToBooking}
                style={({ pressed }) => [styles.primaryBookBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Book Now"
              >
                <Text style={styles.primaryBookText}>Book Now</Text>
                <ArrowRight size={15} color="#FFFFFF" />
              </Pressable>
            </>
          ) : (
            <View style={styles.phoneRightCluster}>
              <Pressable
                onPress={goToBooking}
                style={({ pressed }) => [
                  styles.primaryBookBtnPhone,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBookTextPhone}>Book Now</Text>
              </Pressable>

              <Pressable
                onPress={() => setIsMobileMenuOpen((prev) => !prev)}
                style={({ pressed }) => [
                  styles.mobileToggleBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? (
                  <X size={22} color={colors.primary} />
                ) : (
                  <Menu size={22} color={colors.primary} />
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* ── Mobile Accordion Drawer ────────────────────────────────────────── */}
      {!isWide && isMobileMenuOpen && (
        <View style={styles.mobileDrawer}>
          <Pressable
            onPress={goToServices}
            style={[styles.mobileMenuItem, activeRoute === "services" && styles.mobileMenuItemActive]}
          >
            <Text
              style={[
                styles.mobileMenuText,
                activeRoute === "services" && styles.mobileMenuTextActive,
              ]}
            >
              Services
            </Text>
          </Pressable>

          {/* Company Group Header */}
          <View style={styles.mobileCompanyGroup}>
            <View style={styles.mobileCompanyHeader}>
              <Text style={styles.mobileCompanyTitle}>COMPANY</Text>
            </View>

            <Pressable
              onPress={goToAbout}
              style={[
                styles.mobileSubMenuItem,
                activeRoute === "about" && styles.mobileMenuItemActive,
              ]}
            >
              <Users2 size={16} color={activeRoute === "about" ? colors.primary : "#64748B"} />
              <Text
                style={[
                  styles.mobileSubMenuText,
                  activeRoute === "about" && styles.mobileMenuTextActive,
                ]}
              >
                About Us
              </Text>
            </Pressable>

            <Pressable
              onPress={goToCareers}
              style={[
                styles.mobileSubMenuItem,
                activeRoute === "careers" && styles.mobileMenuItemActive,
              ]}
            >
              <Briefcase size={16} color={activeRoute === "careers" ? colors.primary : "#64748B"} />
              <Text
                style={[
                  styles.mobileSubMenuText,
                  activeRoute === "careers" && styles.mobileMenuTextActive,
                ]}
              >
                Careers
              </Text>
            </Pressable>

            <Pressable
              onPress={goToBlogs}
              style={[
                styles.mobileSubMenuItem,
                activeRoute === "blogs" && styles.mobileMenuItemActive,
              ]}
            >
              <BookOpen size={16} color={activeRoute === "blogs" ? colors.primary : "#64748B"} />
              <Text
                style={[
                  styles.mobileSubMenuText,
                  activeRoute === "blogs" && styles.mobileMenuTextActive,
                ]}
              >
                Blogs & Stories
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={goToContact}
            style={[styles.mobileMenuItem, activeRoute === "contact" && styles.mobileMenuItemActive]}
          >
            <Text
              style={[
                styles.mobileMenuText,
                activeRoute === "contact" && styles.mobileMenuTextActive,
              ]}
            >
              Contact Us
            </Text>
          </Pressable>

          <Pressable onPress={goToPartner} style={styles.mobileMenuItem}>
            <Text style={styles.mobileMenuText}>Partner with Us</Text>
            <ExternalLink size={14} color="#94A3B8" />
          </Pressable>

          <View style={styles.mobileDrawerFooter}>
            <Pressable
              onPress={goToLogin}
              style={({ pressed }) => [styles.mobileLoginBtn, pressed && styles.pressed]}
            >
              <Text style={styles.mobileLoginText}>{isLoggedIn ? "Dashboard" : "Log In"}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Global CSS keyframe animation for the dropdown on web */}
      {Platform.OS === "web" && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes dropdownSlideDown {
                from {
                  opacity: 0;
                  transform: translateY(-8px) scale(0.98);
                }
                to {
                  opacity: 1;
                  transform: translateY(0px) scale(1);
                }
              }
            `,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(254, 215, 170, 0.55)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    ...(Platform.OS === "web"
      ? ({
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        } as any)
      : null),
  },
  navContainer: {
    width: "100%",
    maxWidth: 1240,
    marginHorizontal: "auto",
    paddingHorizontal: 16,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navContainerWide: {
    paddingHorizontal: 28,
    height: 72,
  },

  // Left Column
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBtn: {
    paddingVertical: 4,
  },
  logoImg: {
    height: 38,
    width: 170,
  },
  logoImgPhone: {
    height: 30,
    width: 135,
  },

  // Center Navigation Links
  centerNavLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navLinkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    // @ts-ignore
    cursor: "pointer",
  },
  navLinkItemActive: {
    backgroundColor: "#FFF7ED",
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    letterSpacing: -0.2,
  },
  navLinkTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },

  // Company Dropdown Trigger
  dropdownTriggerWrap: {
    position: "relative",
    zIndex: 1000,
  },
  chevronWrap: {
    marginLeft: 4,
    // @ts-ignore
    transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  chevronWrapOpen: {
    transform: [{ rotate: "180deg" }],
  },

  // Dropdown Floating Menu
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: "50%",
    transform: [{ translateX: -140 }],
    width: 290,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    zIndex: 1001,
  },
  dropdownNotch: {
    position: "absolute",
    top: -6,
    left: 138,
    width: 12,
    height: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: "#FED7AA",
    borderLeftColor: "#FED7AA",
    transform: [{ rotate: "45deg" }],
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    // @ts-ignore
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  dropdownItemHovered: {
    backgroundColor: "#FFF7ED",
  },
  dropdownItemActive: {
    backgroundColor: "#FFF7ED",
  },
  dropdownItemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dropdownItemIconCircleActive: {
    backgroundColor: "#FFEDD5",
    borderColor: "#FED7AA",
  },
  dropdownItemTextCol: {
    flex: 1,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  dropdownItemTitleActive: {
    color: colors.primary,
  },
  dropdownItemDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 14,
  },

  // Right Column Auth & Actions
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ghostLoginBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radiusSm,
  },
  ghostLoginText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  primaryBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: radiusSm,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryBookText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  // Mobile Right Cluster
  phoneRightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBookBtnPhone: {
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryBookTextPhone: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  mobileToggleBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
  },

  // Mobile Drawer
  mobileDrawer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  mobileMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  mobileMenuItemActive: {
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  mobileMenuText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  mobileMenuTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  mobileCompanyGroup: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  mobileCompanyHeader: {
    paddingVertical: 6,
  },
  mobileCompanyTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.8,
  },
  mobileSubMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 8,
  },
  mobileSubMenuText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  mobileDrawerFooter: {
    paddingTop: 16,
  },
  mobileLoginBtn: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  mobileLoginText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },

  pressed: {
    opacity: 0.82,
  },
});
