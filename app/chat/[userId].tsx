import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CheckCheck, Lock, Phone, Send, Sparkles } from "lucide-react-native";
import {
  fetchMessagesWithUser,
  fetchConversations,
  getLocalConversations,
  getLocalThread,
  sendMessage,
  markConversationRead,
  subscribeMessages,
  type ChatMessage,
} from "@/src/services/messagesApi";
import { colors } from "@/src/constants/theme";
import { normalizeRouteParam } from "@/src/utils/routeParam";
import { useAppStore } from "@/src/state/AppProvider";

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateHeader(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return "Today";

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return "Yesterday";

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
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

const QUICK_PROMPTS = [
  "👋 Hi! Are you available for my shoot date?",
  "📸 Can you share package details & deliverables?",
  "📍 Let's finalize the shoot timing & location",
];

class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ChatScreen Error Boundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorBoundaryContainer}>
          <View style={styles.errorIconWrap}>
            <Sparkles size={28} color={colors.primary} />
          </View>
          <Text style={styles.errorTitle}>Chat View Notice</Text>
          <Text style={styles.errorSub}>
            An unexpected error occurred. Tap below to refresh your chat.
          </Text>
          <Pressable
            style={styles.errorReloadBtn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.errorReloadText}>Reload Chat</Text>
          </Pressable>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function ChatScreenInternal() {
  const { bookings } = useAppStore();

  const params = useLocalSearchParams<{
    userId?: string | string[];
    name?: string | string[];
    picture?: string | string[];
    phone?: string | string[];
    accepted?: string | string[];
  }>();

  const rawUserId = normalizeRouteParam(params.userId);
  const paramName = normalizeRouteParam(params.name);
  const paramPicture = normalizeRouteParam(params.picture);
  const paramPhone = normalizeRouteParam(params.phone);
  const isAccepted = normalizeRouteParam(params.accepted) !== "false";

  const userId = useMemo(() => {
    if (rawUserId && rawUserId !== "undefined" && rawUserId !== "null") {
      return rawUserId;
    }
    if (paramName && paramName !== "Photographer") {
      for (const b of bookings) {
        const assigned = (b.assigned_photographers || []) as any[];
        const matchAssigned = assigned.find(
          (f) => f && (f.name === paramName || f.studioName === paramName || f.business_name === paramName)
        );
        if (matchAssigned) return matchAssigned.provider_id || matchAssigned.id || matchAssigned.user_id;

        const matches = (b.matches || []) as any[];
        const matchMatches = matches.find(
          (f) => f && (f.name === paramName || f.studioName === paramName || f.business_name === paramName)
        );
        if (matchMatches) return matchMatches.provider_id || matchMatches.id || matchMatches.user_id;
      }
    }
    return "";
  }, [rawUserId, paramName, bookings]);

  const [conversationMeta, setConversationMeta] = useState<{
    name?: string;
    picture?: string | null;
    phone?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!userId || userId === "undefined" || userId === "null") return;
    void (async () => {
      try {
        const convs = await getLocalConversations();
        const match = convs.find(
          (c) => c.userId === userId || String(c.userId) === String(userId)
        );
        if (match && match.name && match.name !== "Photographer") {
          setConversationMeta({
            name: match.name,
            picture: match.picture,
          });
        }
      } catch {
        // Ignore
      }
    })();
  }, [userId]);

  const firmMatch = useMemo(() => {
    if (!userId || userId === "undefined" || userId === "null") return null;
    for (const b of bookings) {
      const assigned = (b.assigned_photographers || []) as any[];
      for (const f of assigned) {
        if (
          f &&
          (f.provider_id === userId ||
            f.id === userId ||
            f.user_id === userId ||
            f.vendorId === userId ||
            String(f.id) === String(userId) ||
            String(f.provider_id) === String(userId))
        ) {
          return {
            name: f.name || f.studioName || f.business_name,
            profile_image: f.profile_image || f.picture || f.imageUrl || f.avatar,
            contact_phone: f.contact_phone || f.phone || f.mobile,
          };
        }
      }

      const matches = (b.matches || []) as any[];
      for (const f of matches) {
        if (
          f &&
          (f.provider_id === userId ||
            f.id === userId ||
            f.user_id === userId ||
            f.vendorId === userId ||
            String(f.id) === String(userId) ||
            String(f.provider_id) === String(userId))
        ) {
          return {
            name: f.name || f.studioName || f.business_name,
            profile_image: f.profile_image || f.picture || f.imageUrl || f.avatar,
            contact_phone: f.contact_phone || f.phone || f.mobile,
          };
        }
      }
    }
    return null;
  }, [bookings, userId]);

  const recipientName =
    (paramName && paramName !== "Photographer" && paramName.trim().length > 0
      ? paramName
      : null) ||
    firmMatch?.name ||
    conversationMeta?.name ||
    "Photographer";

  const recipientPicture =
    (paramPicture && paramPicture.trim().length > 0 ? paramPicture : null) ||
    firmMatch?.profile_image ||
    conversationMeta?.picture ||
    null;

  const recipientPhone =
    (paramPhone && paramPhone.trim().length > 0 ? paramPhone : null) ||
    firmMatch?.contact_phone ||
    conversationMeta?.phone ||
    null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const safeScrollToEnd = useCallback((animated = false) => {
    try {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated });
      }
    } catch {
      // Catch scroll errors on web
    }
  }, [messages.length]);

  const loadMessages = useCallback(async (isInitial = false) => {
    if (!userId || userId === "undefined" || userId === "null") {
      setLoading(false);
      return;
    }

    // 1. Instantly read local thread from AsyncStorage (0ms latency!)
    try {
      const cached = await getLocalThread(userId);
      if (Array.isArray(cached)) {
        setMessages(cached);
        setLoading(false); // Unblock UI immediately!
      }
    } catch {
      setLoading(false);
    }

    // 2. Fetch fresh background updates from backend
    try {
      const msgs = await fetchMessagesWithUser(userId);
      if (Array.isArray(msgs)) {
        setMessages(msgs);
      }
      void markConversationRead(userId);
    } catch {
      // Ignore network error
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadMessages(true);
    const unsub = subscribeMessages(() => {
      void loadMessages(false);
    });

    const timer = setInterval(() => {
      void loadMessages(false);
    }, 4000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [loadMessages]);

  const handleSend = async (customText?: string) => {
    if (!isAccepted) return;
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !userId || sending) return;

    setInputText("");
    setSending(true);

    try {
      await sendMessage(userId, textToSend, {
        name: recipientName,
        picture: recipientPicture,
      });
      await loadMessages(false);
      setTimeout(() => {
        safeScrollToEnd(true);
      }, 80);
    } catch {
      // Failed to send
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    if (!recipientPhone) return;
    const url = `tel:${recipientPhone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
      })
      .catch(() => undefined);
  };

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const isSameSenderAsPrev = prevMsg && prevMsg.isMine === item.isMine;
    const showDateHeader =
      !prevMsg || formatDateHeader(prevMsg.createdAt) !== formatDateHeader(item.createdAt);

    return (
      <View>
        {showDateHeader ? (
          <View style={styles.dateHeaderWrap}>
            <Text style={styles.dateHeaderText}>{formatDateHeader(item.createdAt)}</Text>
          </View>
        ) : null}

        <View
          style={[
            styles.messageRow,
            item.isMine ? styles.messageRowMine : styles.messageRowOther,
            isSameSenderAsPrev ? { marginTop: 3 } : { marginTop: 10 },
          ]}
        >
          {!item.isMine ? (
            <View style={styles.messageAvatarCol}>
              {!isSameSenderAsPrev ? (
                recipientPicture ? (
                  <Image source={{ uri: recipientPicture }} style={styles.msgAvatar} />
                ) : (
                  <View style={styles.msgAvatarFallback}>
                    <Text style={styles.msgAvatarText}>{getInitials(recipientName)}</Text>
                  </View>
                )
              ) : (
                <View style={{ width: 28 }} />
              )}
            </View>
          ) : null}

          <View
            style={[
              styles.bubble,
              item.isMine ? styles.bubbleMine : styles.bubbleOther,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.isMine ? styles.messageTextMine : styles.messageTextOther,
              ]}
            >
              {item.message}
            </Text>
            <View style={styles.bubbleFooter}>
              <Text
                style={[
                  styles.timeText,
                  item.isMine ? styles.timeTextMine : styles.timeTextOther,
                ]}
              >
                {formatTime(item.createdAt)}
              </Text>
              {item.isMine ? (
                <CheckCheck size={13} color="rgba(255,255,255,0.85)" style={{ marginLeft: 3 }} />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header - Strict Brand Orange Styling */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back to messages"
        >
          <ArrowLeft size={22} color={colors.primary} />
        </Pressable>

        <View style={styles.headerProfile}>
          <View style={styles.headerAvatarWrap}>
            {recipientPicture ? (
              <Image source={{ uri: recipientPicture }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarText}>{getInitials(recipientName)}</Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {recipientName}
            </Text>
            <Text style={styles.headerStatus}>
              {isAccepted ? "Verified Provider · Active now" : "Request Pending · Awaiting acceptance"}
            </Text>
          </View>
        </View>

        {recipientPhone && isAccepted ? (
          <Pressable
            style={styles.callBtn}
            onPress={handleCall}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Call ${recipientName}`}
          >
            <Phone size={18} color={colors.primaryDark} />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {!isAccepted ? (
        <View style={styles.lockedBanner}>
          <Lock size={14} color={colors.warning} />
          <Text style={styles.lockedBannerText}>
            This firm hasn't accepted your request yet. Chat will unlock as soon as they accept.
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => `${item.id}_${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => {
              if (messages.length > 0) safeScrollToEnd(false);
            }}
            onLayout={() => {
              if (messages.length > 0) safeScrollToEnd(false);
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyAvatarLarge}>
                  {recipientPicture ? (
                    <Image source={{ uri: recipientPicture }} style={styles.emptyAvatarLargeImg} />
                  ) : (
                    <Text style={styles.emptyAvatarLargeText}>{getInitials(recipientName)}</Text>
                  )}
                </View>
                <Text style={styles.emptyName}>{recipientName}</Text>
                <Text style={styles.emptyBadge}>Camartes Verified Studio</Text>
                <Text style={styles.emptySub}>
                  {isAccepted
                    ? `This is the start of your direct conversation with ${recipientName}. Discuss shoot dates, requirements, and deliverables.`
                    : `${recipientName} has not accepted your shoot request yet. You will be able to message once the firm accepts.`}
                </Text>

                {isAccepted ? (
                  <View style={styles.promptsContainer}>
                    <View style={styles.promptsHeader}>
                      <Sparkles size={14} color={colors.primary} />
                      <Text style={styles.promptsTitle}>Suggested inquiries</Text>
                    </View>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <Pressable
                        key={idx}
                        style={({ pressed }) => [styles.promptPill, pressed && styles.promptPillPressed]}
                        onPress={() => void handleSend(prompt)}
                      >
                        <Text style={styles.promptPillText}>{prompt}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            }
          />
        )}

        {/* Bottom Input Bar - Orange Send Button & Disabled State */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputPill, !isAccepted && styles.inputPillDisabled]}>
            <TextInput
              style={styles.textInput}
              placeholder={isAccepted ? "Message..." : "Chat locked until firm accepts request"}
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={isAccepted}
            />
            <Pressable
              style={[
                styles.sendBtn,
                Boolean(inputText.trim()) && isAccepted ? styles.sendBtnActive : styles.sendBtnDisabled,
              ]}
              onPress={() => void handleSend()}
              disabled={!inputText.trim() || sending || !isAccepted}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Send size={16} color={Boolean(inputText.trim()) && isAccepted ? colors.white : colors.disabledText} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ChatScreen() {
  return (
    <ChatErrorBoundary>
      <ChatScreenInternal />
    </ChatErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  errorBoundaryContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  errorReloadBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  errorReloadText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: {
    padding: 4,
    marginRight: 10,
  },
  headerProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatarWrap: {
    position: "relative",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  headerStatus: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: "500",
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warningBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexGrow: 1,
  },
  dateHeaderWrap: {
    alignItems: "center",
    marginVertical: 14,
  },
  dateHeaderText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageAvatarCol: {
    marginRight: 6,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  msgAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  bubble: {
    maxWidth: "76%",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  messageTextMine: {
    color: colors.white,
  },
  messageTextOther: {
    color: colors.text,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 3,
  },
  timeText: {
    fontSize: 10,
  },
  timeTextMine: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  timeTextOther: {
    color: colors.muted,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyAvatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyAvatarLargeImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  emptyAvatarLargeText: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  emptyName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  emptyBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 290,
    marginBottom: 24,
  },
  promptsContainer: {
    width: "100%",
    gap: 8,
  },
  promptsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  promptsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  promptPill: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  promptPillPressed: {
    backgroundColor: colors.peach,
    borderColor: colors.primary,
  },
  promptPillText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 44,
  },
  inputPillDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: "transparent",
  },
});
