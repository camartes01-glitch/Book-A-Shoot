import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Camera, Sparkles } from "lucide-react-native";
import { ImageLightboxModal } from "@/src/components/ImageLightboxModal";
import { getCachedVendorProfile, getVendorProfile } from "@/src/services/bookingApi";
import { useAppStore } from "@/src/state/AppProvider";
import type { CustomerVendor } from "@/src/types/vendor";
import { colors, spacing } from "@/src/constants/theme";

// Fallback high-quality photography firm showcase images if firm has minimal uploads
const FALLBACK_FIRM_PORTFOLIO = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1609151162377-794fa68b02f6?w=1200&auto=format&fit=crop&q=80",
];

export default function VendorGalleryScreen() {
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  const { activeDraft } = useAppStore();
  const { width } = useWindowDimensions();

  const cachedVendor = getCachedVendorProfile(vendorId);
  const match = activeDraft?.matches?.find((m) => m.vendorId === vendorId);
  const initialVendor =
    cachedVendor ||
    (match
      ? ({
          id: match.vendorId,
          studioName: match.studioName,
          city: match.city,
          portfolioImages: match.imageUrl ? [match.imageUrl] : [],
        } as unknown as CustomerVendor)
      : null);

  const [vendor, setVendor] = useState<CustomerVendor | null>(initialVendor);
  const [loading, setLoading] = useState(!initialVendor);
  const [error, setError] = useState<string | null>(null);

  // Lightbox viewer state
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
          setError(e instanceof Error ? e.message : "Could not load studio gallery.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  const studioName = vendor?.studioName || match?.studioName || "Photography Studio";

  // Gather all unique images
  const allImages = Array.from(
    new Set([
      ...(vendor?.portfolioImages ?? []),
      ...(match?.imageUrl ? [match.imageUrl] : []),
    ])
  ).filter(Boolean);

  const displayImages = allImages.length > 0 ? allImages : FALLBACK_FIRM_PORTFOLIO;

  // Responsive column count
  const numColumns = width >= 768 ? 3 : 2;
  const gap = 12;
  const containerPadding = 16;
  const availableWidth = Math.min(width, 700) - containerPadding * 2;
  const itemWidth = (availableWidth - (numColumns - 1) * gap) / numColumns;

  const handleOpenPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    setLightboxVisible(true);
  };

  const handleBack = () => {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      try {
        router.back();
        return;
      } catch {
        router.replace({ pathname: "/booking/vendor/[vendorId]", params: { vendorId } });
        return;
      }
    }
    router.replace({ pathname: "/booking/vendor/[vendorId]", params: { vendorId } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      {/* Gallery Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back to firm profile"
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {studioName}
          </Text>
          <Text style={styles.headerSubtitle}>
            Full Portfolio · {displayImages.length} Photographs
          </Text>
        </View>

        <View style={styles.photoCountBadge}>
          <Camera size={12} color="#EA580C" />
          <Text style={styles.photoCountText}>{displayImages.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading studio portfolio…</Text>
        </View>
      ) : error && displayImages.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={handleBack} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Back to Profile</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro description */}
          <View style={styles.introBanner}>
            <Sparkles size={14} color="#EA580C" />
            <Text style={styles.introBannerText}>
              Tap any photo to view full-screen with high-resolution details & controls.
            </Text>
          </View>

          {/* Gallery Grid */}
          <View style={[styles.grid, { gap }]}>
            {displayImages.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                onPress={() => handleOpenPhoto(index)}
                style={({ pressed }) => [
                  styles.imageCard,
                  { width: itemWidth, height: itemWidth * 1.25 },
                  pressed && styles.imageCardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`View photo ${index + 1} of ${displayImages.length}`}
              >
                <Image
                  source={{ uri }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlayBadge}>
                  <Text style={styles.imageOverlayNumber}>#{index + 1}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* End of Gallery Footer */}
          <View style={styles.galleryFooter}>
            <Text style={styles.galleryFooterTitle}>You've reached the end of the portfolio</Text>
            <Text style={styles.galleryFooterSubtitle}>
              All photos are verified work delivered by {studioName}.
            </Text>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backToProfileBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.backToProfileBtnText}>← Back to Firm Profile</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Lightbox Modal with Validated Left/Right arrows and thumbstrip */}
      <ImageLightboxModal
        visible={lightboxVisible}
        images={displayImages}
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
    transform: [{ scale: 0.96 }],
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
  photoCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  photoCountText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 40,
  },
  introBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  introBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C2410C",
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  imageCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: "relative",
  },
  imageCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlayBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  imageOverlayNumber: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  galleryFooter: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  galleryFooterTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  galleryFooterSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  backToProfileBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  backToProfileBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
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
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EA580C",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
