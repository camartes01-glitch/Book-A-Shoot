import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Award,
  Camera,
  ChevronRight,
  Images,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
} from "lucide-react-native";
import { ImageLightboxModal } from "@/src/components/ImageLightboxModal";
import { Button } from "@/src/components/ui";
import { cacheVendorProfile, getCachedVendorProfile, getVendorProfile } from "@/src/services/bookingApi";
import { useAppStore } from "@/src/state/AppProvider";
import type { CustomerVendor } from "@/src/types/vendor";
import { colors, spacing } from "@/src/constants/theme";

const FALLBACK_PORTFOLIO = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1200&auto=format&fit=crop&q=80",
];

export default function VendorProfileScreen() {
  const params = useLocalSearchParams<{
    vendorId: string;
    name?: string;
    city?: string;
    rating?: string;
    image?: string;
  }>();
  const vendorId = params.vendorId;
  const { activeDraft } = useAppStore();

  const cachedVendor = getCachedVendorProfile(vendorId);
  const match = activeDraft?.matches?.find((m) => m.vendorId === vendorId);

  const fallbackFromParams: CustomerVendor | null = params.name
    ? ({
        vendorId,
        studioName: params.name,
        city: params.city || "Hyderabad",
        rating: params.rating ? parseFloat(params.rating) : 4.8,
        completedBookings: 24,
        experienceYears: 8,
        portfolioImages: params.image ? [params.image] : [],
        serviceAreas: [params.city || "Hyderabad"],
        servicesOffered: ["Photography", "Cinematography", "Portrait"],
        kycVerified: true,
      } as unknown as CustomerVendor)
    : null;

  const initialVendor =
    cachedVendor ||
    (match
      ? ({
          vendorId: match.vendorId,
          studioName: match.studioName,
          city: match.city,
          rating: match.rating,
          completedBookings: match.completedBookings,
          experienceYears: match.experienceYears,
          portfolioImages: match.imageUrl ? [match.imageUrl] : [],
          serviceAreas: [match.area || match.city].filter(Boolean),
          servicesOffered: [match.serviceCategory || "Photography & Cinematography"],
          kycVerified: true,
        } as unknown as CustomerVendor)
      : fallbackFromParams);

  const [vendor, setVendor] = useState<CustomerVendor | null>(initialVendor);
  const [loading, setLoading] = useState(!initialVendor);
  const [error, setError] = useState<string | null>(null);

  // Lightbox Modal state
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    (async () => {
      if (!vendor) setLoading(true);
      setError(null);
      try {
        const data = await getVendorProfile(vendorId);
        if (data) setVendor(data);
      } catch (e) {
        if (!vendor) {
          setError(e instanceof Error ? e.message : "Could not load firm profile.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  const studioName = vendor?.studioName || match?.studioName || "Photography Firm";
  const city = vendor?.city || match?.city || "Hyderabad";
  const area = match?.area || vendor?.serviceAreas?.[0] || city;
  const rating = vendor?.rating || match?.rating || 4.8;
  const bookings = vendor?.completedBookings || match?.completedBookings || 24;
  const expYears = vendor?.experienceYears || match?.experienceYears || 8;

  // Gather portfolio photos
  const rawImages = Array.from(
    new Set([
      ...(vendor?.portfolioImages ?? []),
      ...(match?.imageUrl ? [match.imageUrl] : []),
    ])
  ).filter(Boolean);
  const portfolioImages = rawImages.length > 0 ? rawImages : FALLBACK_PORTFOLIO;

  const handleOpenPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    setLightboxVisible(true);
  };

  const handleViewAllPhotos = () => {
    if (vendor) {
      cacheVendorProfile(vendor);
    }
    router.push({
      pathname: "/booking/vendor/gallery",
      params: { vendorId },
    });
  };

  const handleBack = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      try {
        router.back();
        return;
      } catch {
        router.replace("/booking/matches");
        return;
      }
    }
    router.replace("/booking/matches");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back to matches"
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {studioName}
          </Text>
          <Text style={styles.headerSubtitle}>Verified Photography Firm</Text>
        </View>

        <View style={styles.verifiedBadge}>
          <ShieldCheck size={14} color="#EA580C" strokeWidth={2.5} />
          <Text style={styles.verifiedBadgeText}>Verified</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#EA580C" size="large" />
          <Text style={styles.loadingText}>Loading firm details…</Text>
        </View>
      ) : error && !vendor ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Button label="Back to Matched Firms" onPress={handleBack} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Cover / Hero Card */}
            <View style={styles.heroCard}>
              {match?.imageUrl ? (
                <Image
                  source={{ uri: match.imageUrl }}
                  style={styles.heroCover}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.heroFallbackCover}>
                  <Camera size={36} color="#EA580C" />
                </View>
              )}

              <View style={styles.heroDetails}>
                <View style={styles.titleRow}>
                  <Text style={styles.studioTitle}>{studioName}</Text>
                  <View style={styles.firmTag}>
                    <Text style={styles.firmTagText}>Photography Firm</Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <MapPin size={14} color="#64748B" />
                  <Text style={styles.locationText}>
                    {area ? `${area}, ` : ""}
                    {city}
                  </Text>
                </View>

                {/* Key Factors Grid: Clean, uncluttered, no double ratings */}
                <View style={styles.badgesGrid}>
                  <View style={styles.badgePill}>
                    <Star size={13} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.badgePillText}>
                      {rating.toFixed(1)} ({bookings} shoots)
                    </Text>
                  </View>

                  <View style={styles.badgePill}>
                    <Award size={13} color="#64748B" />
                    <Text style={styles.badgePillText}>{expYears} Years Exp</Text>
                  </View>

                  <View style={styles.kycBadgePill}>
                    <ShieldCheck size={13} color="#EA580C" strokeWidth={2.5} />
                    <Text style={styles.kycBadgePillText}>KYC Verified</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Portfolio Showcase Section (No view all chip at top, just clean title & bottom CTA) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Images size={18} color="#EA580C" />
                    <Text style={styles.sectionTitle}>Portfolio Showcase</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>
                    Sample captures uploaded by {studioName}
                  </Text>
                </View>
              </View>

              {/* Horizontal Scroll / Preview Row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.portfolioRow}
              >
                {portfolioImages.slice(0, 6).map((uri, idx) => (
                  <Pressable
                    key={`${uri}-${idx}`}
                    onPress={() => handleOpenPhoto(idx)}
                    style={({ pressed }) => [
                      styles.portfolioThumbnailWrap,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`View photo ${idx + 1}`}
                  >
                    <Image source={{ uri }} style={styles.portfolioThumbnail} resizeMode="cover" />
                    <View style={styles.zoomPill}>
                      <Text style={styles.zoomPillText}>Tap to zoom</Text>
                    </View>
                  </Pressable>
                ))}

                {portfolioImages.length > 3 ? (
                  <Pressable
                    onPress={handleViewAllPhotos}
                    style={({ pressed }) => [styles.morePhotosCard, pressed && styles.btnPressed]}
                  >
                    <Images size={24} color="#EA580C" />
                    <Text style={styles.morePhotosCount}>+{portfolioImages.length}</Text>
                    <Text style={styles.morePhotosLabel}>View Full Gallery</Text>
                  </Pressable>
                ) : null}
              </ScrollView>

              <Pressable
                onPress={handleViewAllPhotos}
                style={({ pressed }) => [styles.fullGalleryBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.fullGalleryBtnText}>
                  Open Full Portfolio Gallery ({portfolioImages.length} Photos)
                </Text>
                <ChevronRight size={16} color="#EA580C" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* About Firm */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>About this Firm</Text>
              <Text style={styles.aboutText}>
                {vendor?.about ||
                  `${studioName} is a top-rated photography and cinema production firm based in ${city}. Specializing in full-scale wedding coverage, cultural ceremonies, poojas, and candid portraits with professional cinematography and high-end colour grading.`}
              </Text>
            </View>

            {/* Services Offered */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Services & Crew Capabilities</Text>
              <View style={styles.servicesGrid}>
                <View style={styles.serviceItem}>
                  <Camera size={16} color="#EA580C" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Photography</Text>
                    <Text style={styles.serviceDetail}>
                      Traditional & Candid Portrait Masters
                    </Text>
                  </View>
                </View>

                <View style={styles.serviceItem}>
                  <Video size={16} color="#EA580C" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Cinematography</Text>
                    <Text style={styles.serviceDetail}>
                      4K Ultra-HD Films & Highlight Teasers
                    </Text>
                  </View>
                </View>

                <View style={styles.serviceItem}>
                  <Sparkles size={16} color="#EA580C" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>Aerial & Add-ons</Text>
                    <Text style={styles.serviceDetail}>
                      Drone Coverage, LED Display Walls & Live Webcast
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Privacy & Contact Unlock Callout */}
            <View style={styles.contactNoticeCard}>
              <View style={styles.contactNoticeIcon}>
                <Lock size={18} color="#C2410C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactNoticeTitle}>Direct Contact Unlocks Upon Acceptance</Text>
                <Text style={styles.contactNoticeDesc}>
                  To protect your privacy and guarantee verified matching, phone and WhatsApp contact
                  details unlock automatically the moment this firm accepts your request.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom Navigation */}
          <View style={styles.footer}>
            <Button
              label="← Back to All Matched Firms"
              variant="outline"
              onPress={() => router.back()}
              flex={1}
            />
          </View>
        </>
      )}

      {/* Lightbox Viewer */}
      <ImageLightboxModal
        visible={lightboxVisible}
        images={portfolioImages}
        initialIndex={selectedPhotoIndex}
        title={`${studioName} Portfolio`}
        onClose={() => setLightboxVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  heroCover: {
    width: "100%",
    height: 160,
    backgroundColor: "#F1F5F9",
  },
  heroFallbackCover: {
    width: "100%",
    height: 120,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  heroDetails: {
    padding: 16,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  studioTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.4,
    flex: 1,
  },
  firmTag: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  firmTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EA580C",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  badgesGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  badgePillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  kycBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  kycBadgePillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  portfolioRow: {
    gap: 12,
    paddingVertical: 4,
  },
  portfolioThumbnailWrap: {
    width: 130,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  portfolioThumbnail: {
    width: "100%",
    height: "100%",
  },
  zoomPill: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  zoomPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  morePhotosCard: {
    width: 110,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  morePhotosCount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#EA580C",
  },
  morePhotosLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9A3412",
  },
  fullGalleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingVertical: 10,
    marginTop: 4,
  },
  fullGalleryBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#EA580C",
  },
  aboutText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: "#334155",
  },
  servicesGrid: {
    gap: 10,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  serviceDetail: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  contactNoticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 16,
    padding: 14,
  },
  contactNoticeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  contactNoticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C2410C",
  },
  contactNoticeDesc: {
    fontSize: 12,
    color: "#9A3412",
    lineHeight: 17,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    textAlign: "center",
  },
});
