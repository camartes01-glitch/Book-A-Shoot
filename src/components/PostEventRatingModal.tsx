import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  MapPin,
  ShieldCheck,
  Smartphone,
  Star,
  ThumbsUp,
  X,
} from "lucide-react-native";
import type { Booking, AssignedPhotographer } from "@/src/types/booking";
import { formatDateLong } from "@/src/utils/format";
import { colors, radius, spacing } from "@/src/constants/theme";
import { submitBookingReview, dismissReviewPrompt } from "@/src/services/reviewApi";

const COMPLIMENT_TAGS = [
  "Punctual ⏱️",
  "Polite & Professional 🤝",
  "Creative Poses 📸",
  "Great Editing & Quality 🌟",
  "Prompt Delivery ⚡",
  "Patient & Friendly 😊",
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Fair",
  3: "Good Experience",
  4: "Very Good!",
  5: "Exceptional / Loved It! 🌟",
};

interface PostEventRatingModalProps {
  visible: boolean;
  booking: Booking | null;
  customerName?: string;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export function PostEventRatingModal({
  visible,
  booking,
  customerName = "Customer",
  onClose,
  onSubmitSuccess,
}: PostEventRatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setRating(5);
      setComment("");
      setSelectedTags([]);
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [visible]);

  if (!booking) return null;

  // Identify confirmed photographer
  const firm: AssignedPhotographer | undefined =
    booking.assigned_photographers?.find((f) => f.is_confirmed || f.has_accepted) ||
    booking.assigned_photographers?.[0];

  const vendorName = firm?.name || "Your Photography Firm";
  const vendorCity = firm?.city || "Hyderabad";
  const vendorImage = firm?.profile_image;

  // Identify event details
  const eventDay = booking.days?.[0];
  const eventName =
    booking.eventName ||
    booking.eventType ||
    (booking as any).lead_details?.eventType ||
    "Photography Shoot";
  const eventDateFormatted = eventDay?.eventDate
    ? formatDateLong(eventDay.eventDate)
    : "Completed Shoot";
  const eventLocation =
    eventDay?.location?.city ||
    eventDay?.location?.formattedAddress ||
    vendorCity;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleDismiss = async () => {
    const bookingId = booking.remoteBookingId || booking.bookingId;
    if (bookingId) {
      await dismissReviewPrompt(bookingId);
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (rating <= 0) {
      Alert.alert("Rating Required", "Please tap the stars to choose a rating.");
      return;
    }

    const bookingId = booking.remoteBookingId || booking.bookingId;
    const providerId = firm?.provider_id || firm?.id || booking.confirmed_provider_id || "provider";

    if (!bookingId) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await submitBookingReview({
        bookingId,
        providerId,
        rating,
        comment,
        tags: selectedTags,
        reviewerName: customerName,
      });

      setSubmitted(true);
      setTimeout(() => {
        onSubmitSuccess?.();
        onClose();
      }, 1500);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to submit review. Please try again.");
      setSubmitting(false);
    }
  };

  const handleOpenAppStoreReview = () => {
    if (Platform.OS === "android") {
      const playStoreMarketUrl = "market://details?id=online.bookashoot.customer";
      const playStoreWebUrl = "https://play.google.com/store/apps/details?id=online.bookashoot.customer";
      Linking.canOpenURL(playStoreMarketUrl)
        .then((supported) => {
          if (supported) return Linking.openURL(playStoreMarketUrl);
          return Linking.openURL(playStoreWebUrl);
        })
        .catch(() => Linking.openURL(playStoreWebUrl));
    } else if (Platform.OS === "ios") {
      const appStoreUrl = "itms-apps://itunes.apple.com/app/id6470000000?action=write-review";
      const appStoreWebUrl = "https://apps.apple.com/app/book-a-shoot/id6470000000";
      Linking.canOpenURL(appStoreUrl)
        .then((supported) => {
          if (supported) return Linking.openURL(appStoreUrl);
          return Linking.openURL(appStoreWebUrl);
        })
        .catch(() => Linking.openURL(appStoreWebUrl));
    } else {
      // Web fallback
      Linking.openURL("https://play.google.com/store/apps/details?id=online.bookashoot.customer");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />

        <View style={styles.sheetContainer}>
          {/* Slider Drag Pill */}
          <View style={styles.dragPillWrapper}>
            <View style={styles.dragPill} />
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>How was your shoot experience? 🎉</Text>
              <Text style={styles.subtitle}>
                Your verified rating helps photographers grow & improves the platform.
              </Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Vendor & Event Card */}
            <View style={styles.eventCard}>
              <View style={styles.avatarWrapper}>
                {vendorImage ? (
                  <Image source={{ uri: vendorImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {vendorName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.shieldBadge}>
                  <ShieldCheck size={11} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.eventInfo}>
                <View style={styles.partnerRow}>
                  <Text style={styles.partnerName} numberOfLines={1}>
                    {vendorName}
                  </Text>
                  <View style={styles.verifiedTag}>
                    <Text style={styles.verifiedTagText}>Partner</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Calendar size={12} color="#64748B" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {eventName} · {eventDateFormatted}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <MapPin size={12} color="#64748B" />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {eventLocation}
                  </Text>
                </View>
              </View>
            </View>

            {/* 5-Star Interactive Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionLabel}>TAP TO RATE YOUR PHOTOGRAPHER</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = starValue <= rating;
                  return (
                    <Pressable
                      key={starValue}
                      onPress={() => setRating(starValue)}
                      style={({ pressed }) => [
                        styles.starBtn,
                        pressed && { transform: [{ scale: 1.18 }] },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
                    >
                      <Star
                        size={36}
                        color={isFilled ? "#EA580C" : "#CBD5E1"}
                        fill={isFilled ? "#EA580C" : "transparent"}
                        strokeWidth={2}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.ratingDescriptionText}>
                {RATING_DESCRIPTIONS[rating] || "Tap a star"}
              </Text>
            </View>

            {/* Compliment Tags */}
            <View style={styles.tagsSection}>
              <Text style={styles.sectionLabel}>WHAT WENT WELL? (TAP TO ADD)</Text>
              <View style={styles.tagsWrapper}>
                {COMPLIMENT_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[
                        styles.tagChip,
                        isSelected && styles.tagChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          isSelected && styles.tagChipTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Review Comment Box */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionLabel}>WRITE A REVIEW (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Share your experience with the photographer's punctuality, guidance, creativity, and deliverables..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
                maxLength={500}
              />
              <Text style={styles.charCounter}>{comment.length}/500</Text>
            </View>

            {/* Submit Review Button */}
            {submitted ? (
              <View style={styles.successBox}>
                <CheckCircle2 size={20} color="#15803D" />
                <Text style={styles.successText}>Review submitted successfully!</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && { opacity: 0.88 },
                  submitting && { opacity: 0.7 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Rating & Review</Text>
                )}
              </Pressable>
            )}

            {/* RATE OUR APP BUTTON (Bottom of Review Modal) */}
            <View style={styles.rateAppDividerWrapper}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>LOVE USING BOOK A SHOOT?</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={handleOpenAppStoreReview}
              style={({ pressed }) => [
                styles.rateAppBtn,
                pressed && { backgroundColor: "#FFF7ED" },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Rate our app on Play Store or App Store"
            >
              <View style={styles.rateAppIconBadge}>
                <Smartphone size={16} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateAppTitle}>Rate Our App</Text>
                <Text style={styles.rateAppSubtitle}>
                  Enjoying Book A Shoot? Leave a 5-star review on {Platform.OS === "ios" ? "App Store" : "Play Store"}!
                </Text>
              </View>
              <View style={styles.rateAppStarPill}>
                <Star size={12} color="#D97706" fill="#D97706" />
                <Text style={styles.rateAppStarText}>5.0 ★</Text>
              </View>
            </Pressable>

            {/* Maybe Later link */}
            <Pressable onPress={handleDismiss} style={styles.laterBtn}>
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  dragPillWrapper: {
    alignItems: "center",
    paddingVertical: 6,
  },
  dragPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 17,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  shieldBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  eventInfo: {
    flex: 1,
    gap: 3,
  },
  partnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  verifiedTag: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
  },
  ratingSection: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A3412",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  starBtn: {
    padding: 4,
  },
  ratingDescriptionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EA580C",
    marginTop: 6,
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tagChipSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: "#EA580C",
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  tagChipTextSelected: {
    color: "#EA580C",
    fontWeight: "700",
  },
  commentSection: {
    marginBottom: 18,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 80,
  },
  charCounter: {
    fontSize: 10.5,
    color: "#94A3B8",
    textAlign: "right",
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: "#EA580C",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#86EFAC",
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },
  rateAppDividerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  rateAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#FFEDD5",
    borderRadius: 16,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  rateAppIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  rateAppTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  rateAppSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  rateAppStarPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rateAppStarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  laterBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  laterBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
});
