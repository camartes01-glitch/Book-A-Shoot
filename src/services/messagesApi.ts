/**
 * Messages / chat integration with Camartes backend:
 * - GET /api/messages
 * - GET /api/messages/{user_id}
 * - POST /api/messages
 * With AsyncStorage local caching, offline fallback, and reactive listeners.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { camartesFetch, getAuthToken } from "@/src/services/camartesClient";
import { isDemoAuthMode } from "@/src/config/authMode";

export type Conversation = {
  userId: string;
  name: string;
  picture: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
};

export type ChatMessage = {
  id: number;
  senderId: string;
  recipientId: string;
  message: string;
  read: boolean;
  createdAt: string;
  isMine: boolean;
};

type BackendConversation = {
  user_id: string;
  name: string;
  picture: string | null;
  last_message: string;
  last_message_at: string;
  unread: boolean;
};

type BackendMessage = {
  id: number;
  sender_id: string;
  recipient_id: string;
  message: string;
  read: boolean;
  created_at: string;
  is_mine: boolean;
};

const STORAGE_CONVERSATIONS_KEY = "camartes:messages:conversations:v2";
const STORAGE_THREAD_PREFIX = "camartes:messages:thread:";

type MessageListener = () => void;
const messageListeners = new Set<MessageListener>();

export function subscribeMessages(listener: MessageListener): () => void {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

function notifyMessageListeners(): void {
  messageListeners.forEach((l) => {
    try {
      l();
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Returns only conversations where an actual message was exchanged (strict real conversation filter).
 */
export async function fetchConversations(): Promise<Conversation[]> {
  const token = await getAuthToken();
  const allowRemote = token && !isDemoAuthMode();

  if (allowRemote) {
    try {
      const data = await camartesFetch<BackendConversation[]>("/api/messages", {}, { requireAuth: true });
      if (Array.isArray(data)) {
        // Strictly only include conversations that have valid userIds and actual messages exchanged
        const validRemote: Conversation[] = data
          .map((c: any) => {
            const rawId = c.user_id || c.userId || c.id || c.provider_id || c.vendor_id || c.vendorId;
            if (!rawId || rawId === "undefined" || rawId === "null") return null;
            return {
              userId: String(rawId),
              name: c.name || c.studioName || c.business_name || "Photographer",
              picture: c.picture || c.profile_image || c.imageUrl || null,
              lastMessage: c.last_message || c.lastMessage || "",
              lastMessageAt: c.last_message_at || c.lastMessageAt || new Date().toISOString(),
              unread: Boolean(c.unread),
            };
          })
          .filter((c): c is Conversation => c !== null && Boolean(c.lastMessage && c.lastMessage.trim().length > 0));

        // Merge with locally stored conversations to preserve local offline updates
        const local = await getLocalConversations();
        const mergedMap = new Map<string, Conversation>();

        // Add local first
        local.forEach((c) => {
          if (c && c.userId && c.userId !== "undefined" && c.userId !== "null" && c.lastMessage && c.lastMessage.trim().length > 0) {
            mergedMap.set(c.userId, c);
          }
        });

        // Remote overwrites local
        validRemote.forEach((c) => {
          mergedMap.set(c.userId, c);
        });

        const merged = Array.from(mergedMap.values()).sort((a, b) =>
          (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""),
        );

        await setLocalConversations(merged);
        return merged;
      }
    } catch {
      // Fall through to local cache
    }
  }

  // Fallback to local cache (demo mode or network error)
  const local = await getLocalConversations();
  return local.filter((c) => c && c.userId && c.userId !== "undefined" && c.userId !== "null" && Boolean(c.lastMessage && c.lastMessage.trim().length > 0));
}

export async function fetchMessagesWithUser(userId: string): Promise<ChatMessage[]> {
  if (!userId || userId === "undefined" || userId === "null") return [];

  const token = await getAuthToken();
  const allowRemote = token && !isDemoAuthMode();

  let remoteMessages: ChatMessage[] = [];

  if (allowRemote) {
    try {
      const data = await camartesFetch<any[]>(
        `/api/messages/${encodeURIComponent(userId)}`,
        {},
        { requireAuth: true },
      );
      if (Array.isArray(data)) {
        remoteMessages = data.map((m: any) => {
          const rawSender = m.sender_id || m.senderId;
          const rawRecipient = m.recipient_id || m.recipientId;

          // Determine isMine with 100% precision:
          let isMine = false;
          if (typeof m.is_mine === "boolean") {
            isMine = m.is_mine;
          } else if (typeof m.isMine === "boolean") {
            isMine = m.isMine;
          } else if (rawSender === "me" || (rawRecipient && String(rawRecipient) === String(userId))) {
            isMine = true;
          } else if (rawSender && String(rawSender) === String(userId)) {
            isMine = false;
          }

          return {
            id: m.id || Date.now(),
            senderId: isMine ? "me" : String(rawSender || userId),
            recipientId: isMine ? String(userId) : "me",
            message: String(m.message || ""),
            read: Boolean(m.read),
            createdAt: m.created_at || m.createdAt || new Date().toISOString(),
            isMine,
          };
        });
      }
    } catch {
      // Fallback to local cache
    }
  }

  // Get local thread
  const localMsgs = await getLocalThread(userId);

  // Combine and deduplicate:
  const combined: ChatMessage[] = [...remoteMessages];

  for (const local of localMsgs) {
    const isMine =
      local.senderId === "me" ||
      String(local.recipientId) === String(userId) ||
      (local.isMine === true);

    const normalizedLocal: ChatMessage = {
      ...local,
      senderId: isMine ? "me" : String(local.senderId || userId),
      recipientId: isMine ? String(userId) : "me",
      isMine,
    };

    const isDuplicate = remoteMessages.some((rem) => {
      if (rem.id === normalizedLocal.id) return true;
      if (rem.isMine === normalizedLocal.isMine && rem.message.trim() === normalizedLocal.message.trim()) {
        const tRem = new Date(rem.createdAt).getTime();
        const tLoc = new Date(normalizedLocal.createdAt).getTime();
        if (!isNaN(tRem) && !isNaN(tLoc) && Math.abs(tRem - tLoc) < 20000) {
          return true; // Match sent within 20s
        }
      }
      return false;
    });

    if (!isDuplicate) {
      combined.push(normalizedLocal);
    }
  }

  // Sort chronologically
  const sorted = combined.sort((a, b) =>
    (a.createdAt || "").localeCompare(b.createdAt || ""),
  );

  // Cache clean deduplicated thread
  await setLocalThread(userId, sorted);
  return sorted;
}

export async function sendMessage(
  recipientId: string,
  message: string,
  recipientMeta?: { name?: string; picture?: string | null },
): Promise<{ id: number; status: string; createdAt: string } | null> {
  const text = message.trim();
  if (!text) {
    throw new Error("Message cannot be empty.");
  }

  const token = await getAuthToken();
  const allowRemote = token && !isDemoAuthMode();

  if (!token && !isDemoAuthMode()) {
    throw new Error("Sign in to send messages.");
  }

  let finalId = Date.now();
  let finalCreatedAt = new Date().toISOString();
  let finalStatus = "sent";

  if (allowRemote) {
    try {
      const result = await camartesFetch<{ id?: number; status?: string; created_at?: string }>(
        "/api/messages",
        {
          method: "POST",
          body: JSON.stringify({
            recipient_id: recipientId,
            message: text,
          }),
        },
        { requireAuth: true },
      );
      if (result) {
        finalId = result.id || finalId;
        finalCreatedAt = result.created_at || finalCreatedAt;
        finalStatus = result.status || "sent";
      }
    } catch {
      // Offline mode
    }
  }

  // Record in local thread
  const newMsg: ChatMessage = {
    id: finalId,
    senderId: "me",
    recipientId: recipientId,
    message: text,
    read: true,
    createdAt: finalCreatedAt,
    isMine: true,
  };

  const currentThread = await getLocalThread(recipientId);
  // Remove transient duplicates with same text within 10s
  const filtered = currentThread.filter(
    (m) => !(m.isMine && m.message.trim() === text && Math.abs(new Date().getTime() - new Date(m.createdAt).getTime()) < 10000)
  );
  filtered.push(newMsg);
  await setLocalThread(recipientId, filtered);

  // Update conversation record
  const conversations = await getLocalConversations();
  const existingIndex = conversations.findIndex((c) => c.userId === recipientId);
  const updatedConv: Conversation = {
    userId: recipientId,
    name: recipientMeta?.name || (existingIndex >= 0 ? conversations[existingIndex].name : "Photographer"),
    picture: recipientMeta?.picture !== undefined ? recipientMeta.picture : (existingIndex >= 0 ? conversations[existingIndex].picture : null),
    lastMessage: text,
    lastMessageAt: finalCreatedAt,
    unread: false,
  };

  if (existingIndex >= 0) {
    conversations.splice(existingIndex, 1);
  }
  conversations.unshift(updatedConv);
  await setLocalConversations(conversations);

  // Notify active screens
  notifyMessageListeners();

  return {
    id: finalId,
    status: finalStatus,
    createdAt: finalCreatedAt,
  };
}

export async function markConversationRead(userId: string): Promise<void> {
  const conversations = await getLocalConversations();
  let changed = false;
  conversations.forEach((c) => {
    if (c.userId === userId && c.unread) {
      c.unread = false;
      changed = true;
    }
  });
  if (changed) {
    await setLocalConversations(conversations);
    notifyMessageListeners();
  }
}

// Storage helpers
export async function getLocalConversations(): Promise<Conversation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return (parsed || []).filter(
      (c) => c && c.userId && c.userId !== "undefined" && c.userId !== "null"
    );
  } catch {
    return [];
  }
}

async function setLocalConversations(convs: Conversation[]): Promise<void> {
  try {
    const valid = convs.filter((c) => c && c.userId && c.userId !== "undefined" && c.userId !== "null");
    await AsyncStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(valid));
  } catch {
    // Ignore storage failure
  }
}

export async function getLocalThread(userId: string): Promise<ChatMessage[]> {
  if (!userId || userId === "undefined" || userId === "null") return [];
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_THREAD_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

async function setLocalThread(userId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${STORAGE_THREAD_PREFIX}${userId}`, JSON.stringify(messages));
  } catch {
    // Ignore storage failure
  }
}
