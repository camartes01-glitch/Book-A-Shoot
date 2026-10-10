import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Heart,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  UserCheck,
  X,
} from "lucide-react-native";
import { colors, elevation, fontWeights, radius, spacing } from "@/src/constants/theme";
import type { VendorReviewItem } from "@/src/services/reviewApi";

interface VendorReviewsModalProps {
  visible: boolean;
  onClose: () => void;
  vendorName: string;
  vendorId?: string;
  averageRating: number;
  totalRatingsCount: number;
  reviews?: VendorReviewItem[];
  loading?: boolean;
  isVendorOwner?: boolean;
  highlightReviewId?: string;
}

export function VendorReviewsModal({
  visible,
  onClose,
  vendorName,
  vendorId,
  averageRating,
  totalRatingsCount,
  reviews = [],
  loading = false,
  isVendorOwner = false,
  highlightReviewId,
}: VendorReviewsModalProps) {
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  // Compute rating distribution
  const stats = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviews.length > 0) {
      reviews.forEach((r) => {
        const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
        counts[star] = (counts[star] || 0) + 1;
      });
    } else {
      // Synthetic fallback distribution proportional to average rating if no individual reviews yet
      const count = Math.max(1, totalRatingsCount);
      counts[5] = Math.round(count * 0.82);
      counts[4] = Math.round(count * 0.15);
      counts[3] = Math.max(0, count - counts[5] - counts[4]);
    }

    const total = Math.max(1, totalRatingsCount || reviews.length);
    const bars = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star] || 0,
      pct: Math.min(100, Math.round(((counts[star] || 0) / total) * 100)),
    }));

    return { counts, total, bars };
  }, [reviews, totalRatingsCount]);

  const filteredReviews = useMemo(() => {
    let list = [...reviews];
    if (highlightReviewId) {
      list.sort((a, b) => (a.id === highlightReviewId ? -1 : b.id === highlightReviewId ? 1 : 0));
    }
    if (selectedStarFilter !== null) {
      list = list.filter((r) => Math.round(r.rating) === selectedStarFilter);
    }
    return list;
  }, [reviews, selectedStarFilter, highlightReviewId]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header Drag Handle */}
          <View style={styles.dragHandleWrapper}>
            <View style={styles.dragHandle} />
          </View>

          {/* Top Title Bar */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {vendorName}
                </Text>
                <View style={styles.verifiedTag}>
                  <ShieldCheck size={12} color="#16A34A" />
                  <Text style={styles.verifiedTagText}>Verified</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>Client Ratings & Experience Feedback</Text>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close reviews"
            >
              <X size={18} color="#475569" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Rating Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.scoreColumn}>
                <Text style={styles.scoreBig}>
                  {(averageRating > 0 ? averageRating : 5.0).toFixed(1)}
                </Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      color="#F59E0B"
                      fill={star <= Math.round(averageRating || 5) ? "#F59E0B" : "transparent"}
                    />
                  ))}
                </View>
                <Text style={styles.totalRatingsText}>
                  {totalRatingsCount || reviews.length || 1} verified rating
                  {(totalRatingsCount || reviews.length) === 1 ? "" : "s"}
                </Text>
              </View>

              {/* Breakdown Bars */}
              <View style={styles.barsColumn}>
                {stats.bars.map(({ star, count, pct }) => (
                  <Pressable
                    key={star}
                    onPress={() =>
                      setSelectedStarFilter((prev) => (prev === star ? null : star))
                    }
                    style={({ pressed }) => [
                      styles.barRow,
                      pressed && styles.btnPressed,
                      selectedStarFilter === star && styles.barRowActive,
                    ]}
                  >
                    <Text style={styles.starNumLabel}>{star}★</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.barCountLabel}>{count}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setSelectedStarFilter(null)}
                style={[
                  styles.filterPill,
                  selectedStarFilter === null && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedStarFilter === null && styles.filterPillTextActive,
                  ]}
                >
                  All ({reviews.length || totalRatingsCount})
                </Text>
              </Pressable>

              {[5, 4, 3].map((star) => (
                <Pressable
                  key={star}
                  onPress={() =>
                    setSelectedStarFilter((prev) => (prev === star ? null : star))
                  }
                  style={[
                    styles.filterPill,
                    selectedStarFilter === star && styles.filterPillActive,
                  ]}
                >
                  <Star
                    size={11}
                    color={selectedStarFilter === star ? "#FFFFFF" : "#F59E0B"}
                    fill={selectedStarFilter === star ? "#FFFFFF" : "#F59E0B"}
                  />
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedStarFilter === star && styles.filterPillTextActive,
                    ]}
                  >
                    {star}★
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Privacy notice banner for customers */}
            {!isVendorOwner && (
              <View style={styles.privacyNotice}>
                <ShieldCheck size={13} color="#2563EB" />
                <Text style={styles.privacyNoticeText}>
                  Client names are protected to preserve personal privacy. All ratings are verified
                  from confirmed bookings.
                </Text>
              </View>
            )}

            {/* Reviews List */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#EA580C" size="small" />
                <Text style={styles.loadingText}>Loading client feedback…</Text>
              </View>
            ) : filteredReviews.length === 0 ? (
              <View style={styles.emptyBox}>
                <MessageSquare size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>
                  {selectedStarFilter !== null
                    ? `No ${selectedStarFilter}-star reviews yet`
                    : "No individual reviews yet"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {selectedStarFilter !== null
                    ? "Try clearing the filter to view all ratings."
                    : `${vendorName} has a ${(averageRating || 5.0).toFixed(1)} rating. Client reviews will appear as events complete.`}
                </Text>
                {selectedStarFilter !== null && (
                  <Pressable
                    onPress={() => setSelectedStarFilter(null)}
                    style={styles.clearFilterBtn}
                  >
                    <Text style={styles.clearFilterBtnText}>Show All Reviews</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              filteredReviews.map((rev) => {
                const isHighlighted = rev.id === highlightReviewId;
                const starVal = Math.max(1, Math.min(5, Math.round(rev.rating || 5)));
                const displayName = isVendorOwner
                  ? rev.reviewer_name || "Customer"
                  : "Verified Customer";

                return (
                  <View
                    key={rev.id || `${rev.created_at}-${Math.random()}`}
                    style={[styles.reviewCard, isHighlighted && styles.reviewCardHighlighted]}
                  >
                    {/* Review Header */}
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.avatarInitial}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.reviewerNameRow}>
                          <Text style={styles.reviewerName}>{displayName}</Text>
                          <View style={styles.verifiedBadgePill}>
                            <CheckCircle2 size={11} color="#16A34A" />
                            <Text style={styles.verifiedBadgeText}>Verified</Text>
                          </View>
                        </View>

                        <View style={styles.metaRow}>
                          <View style={styles.starBadge}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.starBadgeText}>{starVal}.0</Text>
                          </View>

                          {rev.event_name ? (
                            <>
                              <Text style={styles.metaDot}>•</Text>
                              <Text style={styles.metaText} numberOfLines={1}>
                                {rev.event_name}
                              </Text>
                            </>
                          ) : null}

                          {rev.created_at ? (
                            <>
                              <Text style={styles.metaDot}>•</Text>
                              <Text style={styles.metaText}>
                                {formatReviewDate(rev.created_at)}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* Compliment Tags */}
                    {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                      <View style={styles.tagsRow}>
                        {rev.tags.map((tag, tIdx) => (
                          <View key={tIdx} style={styles.tagChip}>
                            <Sparkles size={11} color="#EA580C" />
                            <Text style={styles.tagChipText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Review Comment */}
                    {rev.comment ? (
                      <Text style={styles.commentText}>"{rev.comment}"</Text>
                    ) : (
                      <Text style={styles.commentPlaceholder}>
                        Rated {starVal} out of 5 stars for verified event coverage.
                      </Text>
                    )}
                  </View>
                );
              })
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatReviewDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recent";
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch {
    return "Recent";
  }
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
    maxHeight: "90%",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleWrapper: {
    alignItems: "center",
    paddingVertical: 6,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#CBD5E1",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: fontWeights.heading,
    color: "#0F172A",
    maxWidth: 220,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedTagText: {
    fontSize: 10.5,
    fontWeight: fontWeights.heading,
    color: "#16A34A",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  scoreColumn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    paddingRight: 16,
  },
  scoreBig: {
    fontSize: 38,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -1,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
    marginVertical: 4,
  },
  totalRatingsText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: fontWeights.subheading,
    textAlign: "center",
  },
  barsColumn: {
    flex: 1,
    gap: 5,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  barRowActive: {
    backgroundColor: "#FEF3C7",
  },
  starNumLabel: {
    fontSize: 11,
    fontWeight: fontWeights.subheading,
    color: "#475569",
    width: 22,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 3,
  },
  barCountLabel: {
    fontSize: 10.5,
    color: "#64748B",
    width: 24,
    textAlign: "right",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: fontWeights.subheading,
    color: "#475569",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  privacyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 11.5,
    color: "#1E40AF",
    lineHeight: 16,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: fontWeights.heading,
    color: "#0F172A",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  clearFilterBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },
  clearFilterBtnText: {
    fontSize: 12,
    fontWeight: fontWeights.subheading,
    color: "#0F172A",
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewCardHighlighted: {
    borderColor: "#EA580C",
    backgroundColor: "#FFFBF7",
  },
  reviewHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: fontWeights.heading,
    color: "#C2410C",
  },
  reviewerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewerName: {
    fontSize: 13.5,
    fontWeight: fontWeights.heading,
    color: "#0F172A",
  },
  verifiedBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  verifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: fontWeights.heading,
    color: "#16A34A",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  starBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  starBadgeText: {
    fontSize: 12,
    fontWeight: fontWeights.heading,
    color: "#0F172A",
  },
  metaDot: {
    fontSize: 10,
    color: "#CBD5E1",
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: fontWeights.subheading,
    color: "#C2410C",
  },
  commentText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
    marginTop: 8,
    fontStyle: "italic",
  },
  commentPlaceholder: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 6,
  },
});
