import React from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, CheckCircle2, X, XCircle, ChevronRight, Clock, Lock, MapPin, MessageCircle, MessageSquare, Phone, Star } from "lucide-react-native";
import type { AssignedPhotographer } from "@/src/types/booking";
import { maskPhoneNumber } from "@/src/domain/bookingRequest";

interface CandidateFirmCardProps {
  firm: AssignedPhotographer;
  onConfirm?: (firm: AssignedPhotographer) => void;
  confirmLoading?: boolean;
  onChat?: (firm: AssignedPhotographer) => void;
  onPress?: (firm: AssignedPhotographer) => void;
  testID?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "PF";
}

export function CandidateFirmCard({
  firm,
  onConfirm,
  confirmLoading = false,
  onChat,
  onPress,
  testID,
}: CandidateFirmCardProps) {
  const isConfirmed = Boolean(firm.is_confirmed);
  const isRejected = Boolean(firm.has_rejected || firm.is_rejected || firm.status === "rejected" || (firm as any).status === "timed_out");
  const hasAccepted = Boolean(firm.has_accepted) && !isRejected;
  const canConfirm = Boolean(firm.can_confirm) && !isConfirmed && !isRejected;

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
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    }).catch(() => {
      Linking.openURL(url);
    });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Hi ${firm.name}, I would like to discuss my shoot request.`);
    const url = `https://wa.me/91${cleanPhone}?text=${text}`;
    Linking.openURL(url).catch(() => undefined);
  };

  const displayMaskedPhone = rawPhone ? maskPhoneNumber(rawPhone) : "+91 ••••• ••210";

  return (
    <View
      style={[
        styles.card,
        isConfirmed && styles.cardConfirmed,
      ]}
      testID={testID || `candidate-firm-${firm.provider_id}`}
    >
      {/* Top Header Row: Firm Avatar, Name, Rating, City, Status Badge */}
      <Pressable
        style={({ pressed }) => [styles.headerRow, onPress && pressed && { opacity: 0.8 }]}
        onPress={() => onPress?.(firm)}
        accessibilityRole="button"
        accessibilityLabel={`View timeline and details for ${firm.name}`}
      >
        {firm.profile_image ? (
          <Image
            source={{ uri: firm.profile_image }}
            style={styles.avatar}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{getInitials(firm.name)}</Text>
          </View>
        )}

        <View style={styles.infoCol}>
          <Text style={styles.firmName} numberOfLines={1}>
            {firm.name}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Star size={12} color="#D97706" fill="#D97706" />
              <Text style={styles.ratingText}>
                {typeof firm.rating === "number" ? firm.rating.toFixed(1) : "4.9"}
              </Text>
            </View>

            <Text style={styles.dot}>•</Text>

            <View style={styles.locationRow}>
              <MapPin size={11} color="#64748B" />
              <Text style={styles.cityText} numberOfLines={1}>
                {firm.city || "Bangalore"}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Pill Badge */}
        {isConfirmed ? (
          <View style={styles.confirmedBadge}>
            <Check size={11} color="#EA580C" strokeWidth={3} />
            <Text style={styles.confirmedBadgeText}>Confirmed Partner</Text>
          </View>
        ) : isRejected ? (
          <View style={styles.rejectedBadge}>
            <XCircle size={11} color="#DC2626" />
            <Text style={styles.rejectedBadgeText}>Declined</Text>
          </View>
        ) : hasAccepted ? (
          <View style={styles.acceptedBadge}>
            <CheckCircle2 size={11} color="#EA580C" />
            <Text style={styles.acceptedBadgeText}>Accepted</Text>
          </View>
        ) : (
          <View style={styles.awaitingBadge}>
            <Clock size={11} color="#B45309" />
            <Text style={styles.awaitingBadgeText}>Awaiting</Text>
          </View>
        )}
      </Pressable>

            {/* Response Status Statement */}
      {isConfirmed ? (
        <View style={styles.confirmedBanner}>
          <Text style={styles.confirmedBannerText}>
            Confirmed Photography Partner ✓
          </Text>
        </View>
      ) : isRejected ? (
        <View style={styles.rejectedBanner}>
          <View style={styles.maskedRow}>
            <XCircle size={12} color="#DC2626" />
            <Text style={styles.rejectedBannerText}>
              Firm is unavailable for this date
            </Text>
          </View>
          <Text style={styles.rejectedHintText}>
            Declined · Exploring more verified partners in your area
          </Text>
        </View>
      ) : hasAccepted ? (
        <View style={styles.acceptedBanner}>
          <Text style={styles.acceptedBannerText}>
            Accepted · Contact Unlocked
          </Text>
        </View>
      ) : (
        <View style={styles.awaitingBanner}>
          <View style={styles.maskedRow}>
            <Lock size={12} color="#B45309" />
            <Text style={styles.maskedPhoneText}>{displayMaskedPhone}</Text>
          </View>
          <Text style={styles.maskedHintText}>
            Direct contact unlocks once firm accepts
          </Text>
        </View>
      )}

      {/* Action Buttons Row for Accepted / Confirmed Firms */}
      {hasAccepted && (
        <View style={styles.actionRow}>
          {firm.contact_phone ? (
            <Pressable
              style={({ pressed }) => [styles.contactBtn, styles.callBtn, pressed && styles.btnPressed]}
              onPress={handleCall}
              accessibilityRole="button"
              accessibilityLabel={`Call ${firm.name}`}
              testID={`call-photographer-btn-${firm.provider_id}`}
            >
              <Phone size={13} color="#EA580C" />
              <Text style={styles.callBtnText}>Call</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.contactBtn, styles.whatsappBtn, pressed && styles.btnPressed]}
            onPress={handleWhatsApp}
            accessibilityRole="button"
            accessibilityLabel={`WhatsApp ${firm.name}`}
            testID={`whatsapp-photographer-btn-${firm.provider_id}`}
          >
            <MessageCircle size={13} color="#EA580C" />
            <Text style={styles.whatsappBtnText}>WhatsApp</Text>
          </Pressable>

          {onChat ? (
            <Pressable
              style={({ pressed }) => [styles.contactBtn, styles.chatBtn, pressed && styles.btnPressed]}
              onPress={() => onChat(firm)}
              accessibilityRole="button"
              accessibilityLabel={`Chat with ${firm.name}`}
              testID={`chat-photographer-btn-${firm.provider_id}`}
            >
              <MessageSquare size={13} color="#FF6B35" />
              <Text style={styles.chatBtnText}>Chat</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Swiggy-Style Confirm Photographer Primary Action */}
      {canConfirm && onConfirm && (
        <Pressable
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && styles.btnPressed,
            confirmLoading && styles.btnDisabled,
          ]}
          onPress={() => onConfirm(firm)}
          disabled={confirmLoading}
          accessibilityRole="button"
          accessibilityLabel={`Confirm ${firm.name} as photographer`}
          testID={`confirm-photographer-btn-${firm.provider_id}`}
        >
          <Text style={styles.confirmBtnText}>Confirm Photographer</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 11,
    gap: 8,
  },
  cardConfirmed: {
    borderColor: "#FF6B35",
    borderWidth: 1.5,
    backgroundColor: "#FFF7ED",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#EA580C",
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  firmName: {
    fontSize: 14,
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
    flexShrink: 1,
  },
  cityText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  acceptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  acceptedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  rejectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rejectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  rejectedBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 2,
  },
  rejectedBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
  },
  rejectedHintText: {
    fontSize: 11,
    color: "#B91C1C",
    fontWeight: "500",
  },
  awaitingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  awaitingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  confirmedBanner: {
    backgroundColor: "#FFF7ED",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  confirmedBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  acceptedBanner: {
    backgroundColor: "#FFF7ED",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  acceptedBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  awaitingBanner: {
    backgroundColor: "#FFFBEB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    gap: 2,
  },
  maskedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  maskedPhoneText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    letterSpacing: 0.4,
  },
  maskedHintText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
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
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  confirmBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
