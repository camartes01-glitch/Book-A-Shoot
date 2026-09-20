import React, { useState } from "react";
import Svg, { Path, Rect } from "react-native-svg";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  PlayCircle,
  ExternalLink,
  Globe,
  Images,
  ShieldCheck,
  Star,
  X,
} from "lucide-react-native";
import { ImageLightboxModal } from "@/src/components/ImageLightboxModal";
import type { AssignedPhotographer, Booking } from "@/src/types/booking";
import { formatDateLong } from "@/src/utils/format";
import { parseDateTimeMs } from "@/src/domain/bookingFilters";

interface FirmDetailModalProps {
  visible: boolean;
  firm: AssignedPhotographer | null;
  booking: Booking;
  onClose: () => void;
  onConfirmFirm: (firm: AssignedPhotographer) => void;
  confirmLoading?: boolean;
  onChat: (firm: AssignedPhotographer) => void;
  onViewProfile?: (firm: AssignedPhotographer) => void;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PF"
  );
}


function InstagramIcon({ size = 16, color = "#E1306C" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <Path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <Path d="M17.5 6.5h.01" />
    </Svg>
  );
}

function YouTubeIcon({ size = 16, color = "#DC2626" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
      <Path d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54z" fill={color} />
    </Svg>
  );
}

function FacebookIcon({ size = 16, color = "#1877F2" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </Svg>
  );
}

export function FirmDetailModal({
  visible,
  firm,
  booking,
  onClose,
  onConfirmFirm,
  confirmLoading = false,
  onChat,
  onViewProfile,
}: FirmDetailModalProps) {
  if (!firm) return null;

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const portfolioItems = (firm.portfolio_items || []).filter(Boolean);
  const portfolioImages = portfolioItems
    .map((it: any) => (typeof it === "string" ? it : it.image || it.url || it.uri))
    .filter(Boolean);

  const instagramUrl = firm.instagram_url || firm.social_links?.instagram;
  const youtubeUrl = firm.youtube_url || firm.social_links?.youtube;
  const facebookUrl = firm.facebook_url || firm.social_links?.facebook;
  const websiteUrl = firm.website_url || firm.social_links?.website;
  const hasAnySocial = Boolean(instagramUrl || youtubeUrl || facebookUrl || websiteUrl);
  const isSocialUnlocked = Boolean(firm.has_accepted || firm.is_confirmed || firm.social_unlocked);

  const handleOpenPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    setLightboxVisible(true);
  };

  const handleOpenUrl = (url?: string) => {
    if (!url) return;
    let target = url.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
    }
    Linking.openURL(target).catch(() => undefined);
  };

  const handleViewProfile = () => {
    onClose();
    if (onViewProfile) {
      onViewProfile(firm);
    } else {
      const vendorId = firm.provider_id || firm.id;
      if (vendorId) {
        router.push({
          pathname: "/booking/vendor/[vendorId]",
          params: {
            vendorId,
            name: firm.name,
            city: firm.city,
            rating: String(firm.rating || 4.8),
            image: firm.profile_image || "",
          },
        });
      }
    }
  };

  const isConfirmed = Boolean(firm.is_confirmed);
  const hasAccepted = Boolean(firm.has_accepted);
  const canConfirm = Boolean(firm.can_confirm) && !isConfirmed;

  // Calculate event time status
  const now = Date.now();
  const firstDay = booking.days?.[0];
  const lastDay = booking.days?.[booking.days.length - 1];
  const startMs = firstDay?.eventDate
    ? parseDateTimeMs(firstDay.eventDate, firstDay.startTime, false)
    : null;
  const endMs = lastDay?.eventDate
    ? parseDateTimeMs(lastDay.eventDate, lastDay.endTime, true)
    : null;

  const isEventInProgress =
    isConfirmed &&
    startMs !== null &&
    endMs !== null &&
    now >= startMs &&
    now <= endMs;
  const isEventCompleted =
    isConfirmed && endMs !== null && now > endMs;

  const rawPhone = firm.contact_phone || "";
  const digitsOnly = (firm.contact_whatsapp || rawPhone).replace(/\D/g, "");
  const cleanPhone =
    digitsOnly.length === 12 && digitsOnly.startsWith("91")
      ? digitsOnly.slice(2)
      : digitsOnly.length >= 10
        ? digitsOnly.slice(-10)
        : digitsOnly;

  const handleCall = () => {
    if (!firm.contact_phone) return;
    const url = `tel:${firm.contact_phone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
      })
      .catch(() => undefined);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hi ${firm.name}, I would like to discuss my shoot request #${booking.remoteBookingId || booking.bookingId}.`,
    );
    const url = `https://wa.me/91${cleanPhone}?text=${text}`;
    Linking.openURL(url).catch(() => undefined);
  };

  const formattedDate = firstDay?.eventDate
    ? formatDateLong(firstDay.eventDate)
    : "Event Date";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.firmIdentity}>
                {firm.profile_image ? (
                  <Image
                    source={{ uri: firm.profile_image }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{getInitials(firm.name)}</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={styles.firmName} numberOfLines={1}>
                      {firm.name}
                    </Text>
                    <ShieldCheck size={15} color="#EA580C" />
                    <Pressable
                      onPress={handleViewProfile}
                      style={({ pressed }) => [
                        styles.viewProfileBtn,
                        pressed && styles.viewProfileBtnPressed,
                      ]}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`View full profile of ${firm.name}`}
                    >
                      <Text style={styles.viewProfileBtnText}>View Profile</Text>
                      <ChevronRight size={11} color="#EA580C" strokeWidth={2.5} />
                    </Pressable>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.ratingBadge}>
                      <Star size={12} color="#D97706" fill="#D97706" />
                      <Text style={styles.ratingText}>
                        {typeof firm.rating === "number" ? firm.rating.toFixed(1) : "4.9"}
                      </Text>
                    </View>
                    <Text style={styles.dot}>•</Text>
                    <View style={styles.locationRow}>
                      <MapPin size={12} color="#64748B" />
                      <Text style={styles.cityText}>{firm.city || "Verified Studio"}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close firm details"
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Quick Status Pill */}
            {isConfirmed ? (
              <View style={styles.confirmedPill}>
                <Check size={13} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.confirmedPillText}>Confirmed by You • Official Photographer</Text>
              </View>
            ) : hasAccepted ? (
              <View style={styles.acceptedPill}>
                <CheckCircle2 size={13} color="#FFFFFF" />
                <Text style={styles.acceptedPillText}>Firm Accepted • Ready for Confirmation</Text>
              </View>
            ) : (
              <View style={styles.awaitingPill}>
                <Clock size={13} color="#B45309" />
                <Text style={styles.awaitingPillText}>Request Sent • Awaiting Firm Review</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24, gap: 16 }}>
            {/* Timeline Section */}
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Shoot Timeline</Text>
              <View style={styles.timelineList}>
                {/* Stage 1: Req Sent */}
                <View style={styles.timelineItem}>
                  <View style={styles.iconCol}>
                    <View style={[styles.timelineIcon, styles.iconActive]}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                    <View style={[styles.timelineLine, hasAccepted || isConfirmed ? styles.lineActive : null]} />
                  </View>
                  <View style={styles.contentCol}>
                    <Text style={[styles.stageTitle, styles.stageTitleActive]}>Req Sent</Text>
                    <Text style={styles.stageDesc}>
                      Your shoot requirements and preferences were dispatched to this photography firm.
                    </Text>
                  </View>
                </View>

                {/* Stage 2: Firm Accepted */}
                <View style={styles.timelineItem}>
                  <View style={styles.iconCol}>
                    <View
                      style={[
                        styles.timelineIcon,
                        hasAccepted || isConfirmed ? styles.iconActive : styles.iconPending,
                      ]}
                    >
                      {hasAccepted || isConfirmed ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <Clock size={13} color="#B45309" />
                      )}
                    </View>
                    <View style={[styles.timelineLine, isConfirmed ? styles.lineActive : null]} />
                  </View>
                  <View style={styles.contentCol}>
                    <Text
                      style={[
                        styles.stageTitle,
                        hasAccepted || isConfirmed ? styles.stageTitleActive : styles.stageTitlePending,
                      ]}
                    >
                      Firm Accepted
                    </Text>
                    <Text style={styles.stageDesc}>
                      {hasAccepted || isConfirmed
                        ? "Firm reviewed and accepted your request. Contact details & direct chat are unlocked!"
                        : "The firm is reviewing your shoot schedule and event details."}
                    </Text>
                  </View>
                </View>

                {/* Stage 3: Confirmed by You */}
                <View style={styles.timelineItem}>
                  <View style={styles.iconCol}>
                    <View
                      style={[
                        styles.timelineIcon,
                        isConfirmed
                          ? styles.iconActive
                          : hasAccepted
                            ? styles.iconActionNeeded
                            : styles.iconInactive,
                      ]}
                    >
                      {isConfirmed ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <Lock size={12} color={hasAccepted ? "#EA580C" : "#94A3B8"} />
                      )}
                    </View>
                    <View style={[styles.timelineLine, isEventInProgress || isEventCompleted ? styles.lineActive : null]} />
                  </View>
                  <View style={styles.contentCol}>
                    <Text
                      style={[
                        styles.stageTitle,
                        isConfirmed
                          ? styles.stageTitleActive
                          : hasAccepted
                            ? styles.stageTitleAction
                            : styles.stageTitleInactive,
                      ]}
                    >
                      Confirmed by You
                    </Text>
                    <Text style={styles.stageDesc}>
                      {isConfirmed
                        ? "You confirmed this firm. Shoot date is locked."
                        : hasAccepted
                          ? "Review firm details and confirm them to lock your event date."
                          : "Unlocks once the firm accepts your request."}
                    </Text>

                    {/* Prominent Confirm Button when Firm Accepted */}
                    {hasAccepted && !isConfirmed && canConfirm && (
                      <View style={{ marginTop: 8 }}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.confirmActionBtn,
                            pressed && { opacity: 0.8 },
                            confirmLoading && { opacity: 0.5 },
                          ]}
                          onPress={() => onConfirmFirm(firm)}
                          disabled={confirmLoading}
                          accessibilityRole="button"
                          accessibilityLabel={`Confirm ${firm.name} as your photographer`}
                        >
                          <Check size={15} color="#FFFFFF" strokeWidth={3} />
                          <Text style={styles.confirmActionBtnText}>
                            {confirmLoading ? "Confirming..." : `Confirm ${firm.name}`}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>

                {/* Stage 4: In Progress */}
                <View style={styles.timelineItem}>
                  <View style={styles.iconCol}>
                    <View
                      style={[
                        styles.timelineIcon,
                        isEventCompleted
                          ? styles.iconActive
                          : isEventInProgress
                            ? styles.iconActionNeeded
                            : styles.iconInactive,
                      ]}
                    >
                      {isEventCompleted ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <PlayCircle size={13} color={isEventInProgress ? "#EA580C" : "#94A3B8"} />
                      )}
                    </View>
                    <View style={[styles.timelineLine, isEventCompleted ? styles.lineActive : null]} />
                  </View>
                  <View style={styles.contentCol}>
                    <Text
                      style={[
                        styles.stageTitle,
                        isEventInProgress
                          ? styles.stageTitleAction
                          : isEventCompleted
                            ? styles.stageTitleActive
                            : styles.stageTitleInactive,
                      ]}
                    >
                      In Progress
                    </Text>
                    <Text style={styles.stageDesc}>
                      {isEventInProgress
                        ? "Shoot is currently active! Photographers are on-site."
                        : `Scheduled for ${formattedDate}.`}
                    </Text>
                  </View>
                </View>

                {/* Stage 5: Completed */}
                <View style={styles.timelineItem}>
                  <View style={styles.iconCol}>
                    <View
                      style={[
                        styles.timelineIcon,
                        isEventCompleted ? styles.iconActive : styles.iconInactive,
                      ]}
                    >
                      <Check size={14} color={isEventCompleted ? "#FFFFFF" : "#94A3B8"} strokeWidth={3} />
                    </View>
                  </View>
                  <View style={styles.contentCol}>
                    <Text
                      style={[
                        styles.stageTitle,
                        isEventCompleted ? styles.stageTitleActive : styles.stageTitleInactive,
                      ]}
                    >
                      Completed
                    </Text>
                    <Text style={styles.stageDesc}>
                      {isEventCompleted
                        ? "Shoot event successfully completed."
                        : "Marks complete after the event duration concludes."}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Portfolio Showcase Section - ALWAYS visible to customer */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Images size={16} color="#EA580C" />
                  <Text style={styles.sectionTitle}>Portfolio Showcase</Text>
                </View>
                <View style={styles.publicBadge}>
                  <Text style={styles.publicBadgeText}>Public Showcase</Text>
                </View>
              </View>

              <Text style={styles.portfolioNotice}>
                Uploaded work samples are visible so you can review this firm's artistic quality.
              </Text>

              {portfolioImages.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.portfolioScroll}
                >
                  {portfolioImages.map((imgUri: string, idx: number) => {
                    const itemObj = typeof portfolioItems[idx] === "object" ? portfolioItems[idx] : null;
                    const itemTitle = itemObj?.title || itemObj?.category || `Photo ${idx + 1}`;
                    return (
                      <Pressable
                        key={`${imgUri}-${idx}`}
                        style={({ pressed }) => [styles.portfolioCard, pressed && { opacity: 0.85 }]}
                        onPress={() => handleOpenPhoto(idx)}
                        accessibilityRole="button"
                        accessibilityLabel={`View portfolio photo ${idx + 1}: ${itemTitle}`}
                      >
                        <Image source={{ uri: imgUri }} style={styles.portfolioThumb} resizeMode="cover" />
                        <View style={styles.portfolioOverlay}>
                          <Text style={styles.portfolioThumbTitle} numberOfLines={1}>
                            {itemTitle}
                          </Text>
                          <Text style={styles.portfolioZoomHint}>Tap to view</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyPortfolioBox}>
                  <Images size={20} color="#94A3B8" />
                  <Text style={styles.emptyPortfolioText}>
                    No portfolio sample photos uploaded yet by this firm.
                  </Text>
                </View>
              )}
            </View>

            {/* Social Media & Online Portfolio Section - Unlocks ONLY upon acceptance */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Globe size={16} color="#EA580C" />
                  <Text style={styles.sectionTitle}>Social Media & Online Portfolio</Text>
                </View>
                {isSocialUnlocked ? (
                  <View style={styles.unlockedBadge}>
                    <CheckCircle2 size={11} color="#15803D" />
                    <Text style={styles.unlockedBadgeText}>Unlocked</Text>
                  </View>
                ) : (
                  <View style={styles.lockedBadge}>
                    <Lock size={10} color="#B45309" />
                    <Text style={styles.lockedBadgeText}>Locked</Text>
                  </View>
                )}
              </View>

              {isSocialUnlocked ? (
                <View style={{ gap: 10 }}>
                  <Text style={styles.contactNotice}>
                    Direct social links and website are unlocked. Visit their profiles to explore full galleries and client reviews:
                  </Text>
                  {hasAnySocial ? (
                    <View style={styles.socialGrid}>
                      {instagramUrl ? (
                        <Pressable
                          style={({ pressed }) => [styles.socialBtn, styles.instagramBtn, pressed && { opacity: 0.8 }]}
                          onPress={() => handleOpenUrl(instagramUrl)}
                          accessibilityRole="button"
                          accessibilityLabel="Open Instagram Profile"
                        >
                          <InstagramIcon size={15} color="#E1306C" />
                          <Text style={styles.instagramBtnText} numberOfLines={1}>Instagram</Text>
                          <ExternalLink size={12} color="#E1306C" />
                        </Pressable>
                      ) : null}

                      {youtubeUrl ? (
                        <Pressable
                          style={({ pressed }) => [styles.socialBtn, styles.youtubeBtn, pressed && { opacity: 0.8 }]}
                          onPress={() => handleOpenUrl(youtubeUrl)}
                          accessibilityRole="button"
                          accessibilityLabel="Open YouTube Channel"
                        >
                          <YouTubeIcon size={15} color="#DC2626" />
                          <Text style={styles.youtubeBtnText} numberOfLines={1}>YouTube</Text>
                          <ExternalLink size={12} color="#DC2626" />
                        </Pressable>
                      ) : null}

                      {facebookUrl ? (
                        <Pressable
                          style={({ pressed }) => [styles.socialBtn, styles.facebookBtn, pressed && { opacity: 0.8 }]}
                          onPress={() => handleOpenUrl(facebookUrl)}
                          accessibilityRole="button"
                          accessibilityLabel="Open Facebook Page"
                        >
                          <FacebookIcon size={15} color="#1877F2" />
                          <Text style={styles.facebookBtnText} numberOfLines={1}>Facebook</Text>
                          <ExternalLink size={12} color="#1877F2" />
                        </Pressable>
                      ) : null}

                      {websiteUrl ? (
                        <Pressable
                          style={({ pressed }) => [styles.socialBtn, styles.websiteBtn, pressed && { opacity: 0.8 }]}
                          onPress={() => handleOpenUrl(websiteUrl)}
                          accessibilityRole="button"
                          accessibilityLabel="Open Website or Portfolio"
                        >
                          <Globe size={15} color="#0284C7" />
                          <Text style={styles.websiteBtnText} numberOfLines={1}>Website</Text>
                          <ExternalLink size={12} color="#0284C7" />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.emptyPortfolioBox}>
                      <Text style={styles.emptyPortfolioText}>
                        No external social links provided by this firm.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.lockedContactBox}>
                  <Lock size={18} color="#B45309" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.lockedContactTitle}>Social Media & Website Links Locked</Text>
                    <Text style={styles.lockedContactDesc}>
                      External social media channels (Instagram, YouTube, Facebook) and personal portfolio websites unlock along with contact numbers once this firm accepts your shoot request. Uploaded portfolio images above remain freely visible.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Firm Details & Contact Options Section */}
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Contact & Negotiation Options</Text>
              {hasAccepted || isConfirmed ? (
                <View style={{ gap: 10 }}>
                  <Text style={styles.contactNotice}>
                    Direct communication is unlocked. Call, WhatsApp, or Chat to finalize shoot details and pricing.
                  </Text>
                  <View style={styles.contactRow}>
                    {firm.contact_phone ? (
                      <Pressable
                        style={({ pressed }) => [styles.contactButton, styles.callBtn, pressed && { opacity: 0.8 }]}
                        onPress={handleCall}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${firm.name}`}
                      >
                        <Phone size={15} color="#EA580C" />
                        <Text style={styles.callBtnText}>Call</Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      style={({ pressed }) => [styles.contactButton, styles.whatsappBtn, pressed && { opacity: 0.8 }]}
                      onPress={handleWhatsApp}
                      accessibilityRole="button"
                      accessibilityLabel={`WhatsApp ${firm.name}`}
                    >
                      <MessageCircle size={15} color="#EA580C" />
                      <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.contactButton, styles.chatBtn, pressed && { opacity: 0.8 }]}
                      onPress={() => {
                        onClose();
                        onChat(firm);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Chat with ${firm.name}`}
                    >
                      <MessageSquare size={15} color="#FFFFFF" />
                      <Text style={styles.chatBtnText}>Chat</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.lockedContactBox}>
                  <Lock size={18} color="#B45309" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.lockedContactTitle}>Contact Options Locked</Text>
                    <Text style={styles.lockedContactDesc}>
                      Phone number, WhatsApp, and chat unlock immediately once this firm accepts your request.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      <ImageLightboxModal
        visible={lightboxVisible}
        images={portfolioImages}
        initialIndex={selectedPhotoIndex}
        title={`${firm.name} Portfolio`}
        onClose={() => setLightboxVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  firmIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#EA580C",
  },
  firmName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  dot: {
    fontSize: 10,
    color: "#94A3B8",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cityText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  confirmedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EA580C",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  confirmedPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  acceptedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FF6B35",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  acceptedPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  awaitingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  awaitingPillText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    padding: 16,
  },
  cardSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timelineList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 52,
  },
  iconCol: {
    width: 28,
    alignItems: "center",
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: {
    backgroundColor: "#16A34A",
  },
  iconActionNeeded: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1.5,
    borderColor: "#EA580C",
  },
  iconPending: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  iconInactive: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E2E8F0",
    marginVertical: 3,
  },
  lineActive: {
    backgroundColor: "#16A34A",
  },
  contentCol: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 14,
    gap: 2,
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  stageTitleActive: {
    color: "#15803D",
  },
  stageTitleAction: {
    color: "#EA580C",
  },
  stageTitlePending: {
    color: "#B45309",
  },
  stageTitleInactive: {
    color: "#94A3B8",
  },
  stageDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  confirmActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EA580C",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  confirmActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  contactNotice: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  callBtn: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  whatsappBtn: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  chatBtn: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  lockedContactBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
  },
  lockedContactTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
  },
  lockedContactDesc: {
    fontSize: 11,
    color: "#B45309",
    lineHeight: 15,
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  viewProfileBtnPressed: {
    opacity: 0.75,
    backgroundColor: "#FED7AA",
    transform: [{ scale: 0.96 }],
  },
  viewProfileBtnText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#EA580C",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  publicBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  publicBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  unlockedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
  },
  portfolioNotice: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 16,
  },
  portfolioScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  portfolioCard: {
    width: 140,
    height: 105,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  portfolioThumb: {
    width: "100%",
    height: "100%",
  },
  portfolioOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  portfolioThumbTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  portfolioZoomHint: {
    fontSize: 8.5,
    color: "#CBD5E1",
  },
  emptyPortfolioBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 10,
  },
  emptyPortfolioText: {
    fontSize: 12,
    color: "#64748B",
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  instagramBtn: {
    backgroundColor: "#FDF2F8",
    borderColor: "#FBCFE8",
  },
  instagramBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BE185D",
  },
  youtubeBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  youtubeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  facebookBtn: {
    backgroundColor: "#EFF6FF",
    borderColor: "#DBEAFE",
  },
  facebookBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  websiteBtn: {
    backgroundColor: "#F0F9FF",
    borderColor: "#E0F2FE",
  },
  websiteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369A1",
  },
});