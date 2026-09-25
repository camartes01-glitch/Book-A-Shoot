import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  ChevronRight,
  Lock,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react-native";
import {
  fetchConversations,
  getLocalConversations,
  markConversationRead,
  subscribeMessages,
  type Conversation,
} from "@/src/services/messagesApi";
import { useAppStore } from "@/src/state/AppProvider";
import { colors, spacing } from "@/src/constants/theme";
import {
  ENQUIRY_STATUSES,
  TERMINAL_STATUSES,
  getBookingEventTitle,
  getEffectiveBookingStatus,
  isCompletedBooking,
} from "@/src/domain/bookingFilters";
import type { AssignedPhotographer, Booking } from "@/src/types/booking";

function isBookingInPast(booking: Booking): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const dates = (booking.days || []).map((d) => d?.eventDate).filter((d): d is string => Boolean(d));
  if (dates.length > 0) {
    return dates.every((d) => d < today);
  }
  return false;
}

function formatRelativeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d`;

    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
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

interface CandidateFirmItem {
  id: string;
  name: string;
  picture?: string;
  phone?: string;
  has_accepted: boolean;
  bookingTitle: string;
}

export default function MessagesScreen() {
  const { bookings, refreshBookings } = useAppStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const loadAll = useCallback(async () => {
    // 1. Instantly render local conversations (0ms latency!)
    try {
      const local = await getLocalConversations();
      const validLocal = local.filter((c) => Boolean(c.lastMessage && c.lastMessage.trim().length > 0));
      if (validLocal.length > 0) {
        setConversations(validLocal);
      }
    } catch {
      // Ignore
    }

    // 2. Fetch fresh background updates from backend API
    try {
      const list = await fetchConversations();
      setConversations(list.filter((c) => Boolean(c.lastMessage && c.lastMessage.trim().length > 0)));
    } catch {
      // Ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
      void refreshBookings();
    }, [loadAll, refreshBookings]),
  );

  useEffect(() => {
    void loadAll();
    const unsub = subscribeMessages(() => {
      void loadAll();
    });
    return unsub;
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAll(), refreshBookings()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAll, refreshBookings]);

  /**
   * Candidate firms for the latest still search-ongoing booking.
   * Always picks the most recent search-ongoing booking and reflects firm acceptance for that booking.
   */
  const candidateFirmsForRequest = useMemo(() => {
    const list: CandidateFirmItem[] = [];
    const seenIds = new Set<string>();

    const today = new Date().toISOString().slice(0, 10);

    const getBookingTimestamp = (b: Booking): number => {
      const d = b.updatedAt || b.createdAt;
      if (!d) return 0;
      const t = new Date(d).getTime();
      return isNaN(t) ? 0 : t;
    };

    // Find all still search-ongoing bookings (enquiries currently in matching/request_sent/accepted state)
    const searchOngoingBookings = bookings
      .filter((b) => {
        if (TERMINAL_STATUSES.has(b.status)) return false;
        if (b.status === "COMPLETED" || isCompletedBooking(b)) return false;
        if (b.status === "DRAFT" && !b.remoteBookingId) return false;
        const dates = (b.days || []).map((d) => d?.eventDate).filter((d): d is string => Boolean(d));
        if (dates.length > 0 && dates.every((d) => d < today)) return false;
        const effective = getEffectiveBookingStatus(b);
        return ENQUIRY_STATUSES.has(effective);
      })
      .sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));

    // Pick the most recent search-ongoing booking, or fallback to the most recent active booking
    const targetBooking =
      searchOngoingBookings[0] ||
      bookings
        .filter((b) => {
          if (TERMINAL_STATUSES.has(b.status)) return false;
          if (b.status === "COMPLETED" || isCompletedBooking(b)) return false;
          if (b.status === "DRAFT" && !b.remoteBookingId) return false;
          const dates = (b.days || []).map((d) => d?.eventDate).filter((d): d is string => Boolean(d));
          if (dates.length > 0 && dates.every((d) => d < today)) return false;
          return true;
        })
        .sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a))[0];

    if (!targetBooking) return [];

    const assigned = (targetBooking.assigned_photographers || []) as AssignedPhotographer[];
    const bookingTitle = getBookingEventTitle(targetBooking);

    for (const firm of assigned) {
      const id = firm.provider_id || firm.id;
      if (!id || seenIds.has(id)) continue;

      // Disappear if timed out or firm rejected
      const isRejectedOrTimedOut = Boolean(
        (firm as any).has_rejected ||
        (firm as any).is_rejected ||
        (firm as any).is_timed_out ||
        (firm as any).status === "REJECTED" ||
        (firm as any).status === "TIMED_OUT" ||
        (firm as any).status === "EXPIRED"
      );
      if (isRejectedOrTimedOut) continue;

      seenIds.add(id);
      list.push({
        id,
        name: firm.name,
        picture: firm.profile_image || undefined,
        phone: firm.contact_phone || undefined,
        has_accepted: Boolean(firm.has_accepted),
        bookingTitle,
      });
    }

    return list;
  }, [bookings]);

  const enrichedConversations = useMemo(() => {
    return conversations.map((c) => {
      let name = c.name;
      let picture = c.picture;

      if (!name || name === "Photographer" || !picture) {
        for (const b of bookings) {
          const assigned = (b.assigned_photographers || []) as any[];
          const assignedMatch = assigned.find(
            (f) =>
              f &&
              (f.provider_id === c.userId ||
                f.id === c.userId ||
                f.user_id === c.userId ||
                f.vendorId === c.userId ||
                String(f.id) === String(c.userId) ||
                String(f.provider_id) === String(c.userId))
          );
          if (assignedMatch) {
            if (!name || name === "Photographer") name = assignedMatch.name || assignedMatch.studioName || assignedMatch.business_name;
            if (!picture) picture = assignedMatch.profile_image || assignedMatch.picture || assignedMatch.imageUrl || null;
            break;
          }

          const matches = (b.matches || []) as any[];
          const matchesMatch = matches.find(
            (f) =>
              f &&
              (f.provider_id === c.userId ||
                f.id === c.userId ||
                f.user_id === c.userId ||
                f.vendorId === c.userId ||
                String(f.id) === String(c.userId) ||
                String(f.provider_id) === String(c.userId))
          );
          if (matchesMatch) {
            if (!name || name === "Photographer") name = matchesMatch.name || matchesMatch.studioName || matchesMatch.business_name;
            if (!picture) picture = matchesMatch.profile_image || matchesMatch.picture || matchesMatch.imageUrl || null;
            break;
          }
        }
      }

      return {
        ...c,
        name: name || "Photographer",
        picture: picture || null,
      };
    });
  }, [conversations, bookings]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return enrichedConversations;
    return enrichedConversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q),
    );
  }, [enrichedConversations, searchQuery]);

  const openExistingChat = (userId: string, name: string, picture?: string | null) => {
    if (!userId || userId === "undefined" || userId === "null") {
      Alert.alert("Chat Notice", "Could not locate provider ID for this conversation.");
      return;
    }
    void markConversationRead(userId);
    setConversations((prev) =>
      prev.map((c) =>
        c.userId === userId || String(c.userId).toLowerCase() === String(userId).toLowerCase()
          ? { ...c, unread: false }
          : c
      )
    );
    router.push({
      pathname: "/chat/[userId]",
      params: {
        userId,
        name,
        picture: picture || "",
        accepted: "true",
      },
    });
  };

  const handleCandidateFirmPress = (firm: CandidateFirmItem) => {
    if (!firm.has_accepted) {
      Alert.alert(
        "Request Pending",
        `${firm.name} hasn't accepted your request yet. Chat will unlock as soon as they accept your booking request.`,
        [{ text: "Got it" }]
      );
      return;
    }

    // Firm has accepted: chat is enabled!
    setComposeOpen(false);
    void markConversationRead(firm.id);
    router.push({
      pathname: "/chat/[userId]",
      params: {
        userId: firm.id,
        name: firm.name,
        picture: firm.picture || "",
        phone: firm.phone || "",
        accepted: "true",
      },
    });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    return (
      <Pressable
        style={({ pressed }) => [styles.convRow, pressed && styles.convRowPressed]}
        onPress={() => openExistingChat(item.userId, item.name, item.picture)}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${item.name}`}
      >
        <View style={styles.avatarContainer}>
          {item.picture ? (
            <Image source={{ uri: item.picture }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
          )}
          <View style={styles.onlineBadge} />
        </View>

        <View style={styles.convCenter}>
          <View style={styles.nameRow}>
            <Text style={[styles.convName, item.unread && styles.convNameUnread]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.timeLabel, item.unread && styles.timeLabelUnread]}>
              {formatRelativeTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.previewRow}>
            <Text
              style={[styles.convPreview, item.unread && styles.convPreviewUnread]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            {item.unread ? <View style={styles.unreadDot} /> : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header - Orange Brand Styling */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable
          style={styles.composeBtn}
          onPress={() => setComposeOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Start a new message"
        >
          <Plus size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item, index) => (item.userId ? `conv-${item.userId}` : `conv-idx-${index}`)}
        ListHeaderComponent={
          conversations.length > 0 ? (
            <View style={styles.searchWrap} key="search-bar-wrap">
              <View style={styles.searchBar}>
                <Search size={16} color={colors.primary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search messages..."
                  placeholderTextColor={colors.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                    <X size={15} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null
        }
        renderItem={renderConversationItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <MessageCircle size={44} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Your Messages</Text>
            <Text style={styles.emptyBody}>
              All conversations with service providers stay on Camartes. Direct chat unlocks once a firm accepts your booking request.
            </Text>
            {candidateFirmsForRequest.length > 0 ? (
              <Pressable
                style={styles.emptyActionBtn}
                onPress={() => setComposeOpen(true)}
                accessibilityRole="button"
              >
                <Text style={styles.emptyActionBtnText}>View active candidate firms</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.emptyActionBtn}
                onPress={() => router.push("/(tabs)")}
                accessibilityRole="button"
              >
                <Text style={styles.emptyActionBtnText}>Find photographers</Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* Plus (+) Option Modal: Shows the candidate firms sent requests */}
      <Modal visible={composeOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Active Candidate Firms</Text>
              <Pressable onPress={() => setComposeOpen(false)} hitSlop={10}>
                <X size={22} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalSub}>
              Firms receiving your booking requests. Chat is enabled only if the firm accepts your request:
            </Text>

            {candidateFirmsForRequest.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Sparkles size={32} color={colors.primary} />
                <Text style={styles.modalEmptyText}>
                  No active requests sent yet. Submit a booking request to send to candidate firms.
                </Text>
                <Pressable
                  style={styles.modalEmptyBtn}
                  onPress={() => {
                    setComposeOpen(false);
                    router.push("/(tabs)");
                  }}
                >
                  <Text style={styles.modalEmptyBtnText}>Plan a shoot</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={candidateFirmsForRequest}
                keyExtractor={(item, index) => (item.id ? `firm-${item.id}` : `firm-idx-${index}`)}
                style={{ maxHeight: 380 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.photographerRow, pressed && styles.photographerRowPressed]}
                    onPress={() => handleCandidateFirmPress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, ${item.has_accepted ? "accepted" : "awaiting acceptance"}`}
                  >
                    <View style={styles.avatarContainer}>
                      {item.picture ? (
                        <Image source={{ uri: item.picture }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.photographerName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.photographerBooking} numberOfLines={1}>
                        {item.bookingTitle}
                      </Text>
                    </View>

                    {item.has_accepted ? (
                      <View style={styles.acceptedBadge}>
                        <Text style={styles.acceptedBadgeText}>Accepted · Tap to chat</Text>
                        <ChevronRight size={14} color={colors.primaryDark} />
                      </View>
                    ) : (
                      <View style={styles.awaitingBadge}>
                        <Lock size={11} color={colors.muted} style={{ marginRight: 4 }} />
                        <Text style={styles.awaitingBadgeText}>Awaiting</Text>
                      </View>
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
  },
  composeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.peach,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 38,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 4,
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 14,
  },
  convRowPressed: {
    backgroundColor: colors.cream,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  convCenter: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convName: {
    fontSize: 15.5,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  convNameUnread: {
    fontWeight: "800",
  },
  timeLabel: {
    fontSize: 12,
    color: colors.muted,
    marginLeft: 8,
  },
  timeLabelUnread: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convPreview: {
    fontSize: 13.5,
    color: colors.muted,
    flex: 1,
  },
  convPreviewUnread: {
    color: colors.text,
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyActionBtnText: {
    color: colors.white,
    fontSize: 14.5,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 13.5,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
  },
  modalEmptyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 6,
  },
  modalEmptyBtnText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: "700",
  },
  photographerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  photographerRowPressed: {
    backgroundColor: colors.cream,
  },
  photographerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  photographerBooking: {
    fontSize: 12,
    color: colors.muted,
  },
  acceptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.peach,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  acceptedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  awaitingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  awaitingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
});
