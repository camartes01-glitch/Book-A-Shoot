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
  lastReadAt?: string;
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
const STORAGE_READ_PREFIX = "camartes:messages:last_read:v1:";

export async function getLastReadAt(userId: string): Promise<string | null> {
  if (!userId || userId === "undefined" || userId === "null") return null;
  try {
    return await AsyncStorage.getItem(`${STORAGE_READ_PREFIX}${String(userId).toLowerCase()}`);
  } catch {
    return null;
  }
}

export async function setLastReadAt(userId: string, timestamp?: string): Promise<void> {
  if (!userId || userId === "undefined" || userId === "null") return;
  try {
    const ts = timestamp || new Date().toISOString();
    await AsyncStorage.setItem(`${STORAGE_READ_PREFIX}${String(userId).toLowerCase()}`, ts);
  } catch {
    // Ignore storage failure
  }
}

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
  const allowRemote = true;

  let myUserId = "";
  try {
    const rawProf = await AsyncStorage.getItem("camartes-customer:profile:v1");
    if (rawProf) {
      const parsedProf = JSON.parse(rawProf);
      myUserId = String(parsedProf?.customerId || parsedProf?.id || "").trim();
    }
  } catch {}

  const mergedMap = new Map<string, Conversation>();

  // 1. Seed with local stored conversations first
  const local = await getLocalConversations();
  local.forEach((c) => {
    if (c && c.userId && c.userId !== "undefined" && c.userId !== "null" && c.lastMessage && c.lastMessage.trim().length > 0) {
      mergedMap.set(String(c.userId).toLowerCase(), c);
    }
  });

  if (allowRemote) {
    try {
      const data = await camartesFetch<any>("/api/messages", {}, { auth: true, requireAuth: false });
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.conversations)
        ? data.conversations
        : Array.isArray(data?.data)
        ? data.data
        : [];

      if (rawList.length > 0) {
        for (const c of rawList) {
          const rawId =
            c.user_id ||
            c.userId ||
            c.provider_id ||
            c.providerId ||
            c.vendor_id ||
            c.vendorId ||
            c.other_user_id ||
            c.otherUserId ||
            c.recipient_id ||
            c.recipientId ||
            c.sender_id ||
            c.senderId ||
            c.id ||
            c._id;

          if (!rawId || rawId === "undefined" || rawId === "null") continue;

          let peerId = String(rawId);
          if (myUserId && peerId.toLowerCase() === myUserId.toLowerCase()) {
            const altId =
              c.recipient_id ||
              c.recipientId ||
              c.provider_id ||
              c.providerId ||
              c.vendor_id ||
              c.vendorId ||
              c.other_user_id ||
              c.otherUserId ||
              c.user_id;
            if (altId && String(altId).toLowerCase() !== myUserId.toLowerCase()) {
              peerId = String(altId);
            }
          }

          if (!peerId || peerId === "undefined" || peerId === "null") continue;
          if (myUserId && peerId.toLowerCase() === myUserId.toLowerCase()) continue;

          const lastMsg =
            c.last_message ||
            c.lastMessage ||
            c.latest_message ||
            c.latestMessage ||
            c.message ||
            c.text ||
            "";

          const lastTime =
            c.last_message_at ||
            c.lastMessageAt ||
            c.updated_at ||
            c.updatedAt ||
            c.created_at ||
            c.createdAt ||
            new Date().toISOString();

          const name =
            c.name ||
            c.studioName ||
            c.studio_name ||
            c.business_name ||
            c.businessName ||
            c.provider_name ||
            (c.user && (c.user.name || c.user.business_name)) ||
            "Photographer";

          const picture =
            c.picture ||
            c.profile_image ||
            c.imageUrl ||
            c.avatar ||
            c.profile_picture ||
            (c.user && c.user.picture) ||
            null;

          const key = peerId.toLowerCase();
          const existing = mergedMap.get(key);

          const lastReadAt = await getLastReadAt(peerId);
          const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;
          const remoteTime = new Date(lastTime).getTime();
          const isRemoteAfterRead = !lastReadTime || remoteTime > lastReadTime;

          if (existing) {
            const localTime = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
            const finalUnread = isRemoteAfterRead ? Boolean(c.unread ?? existing.unread) : false;
            mergedMap.set(key, {
              userId: peerId,
              name: name !== "Photographer" ? name : existing.name,
              picture: picture || existing.picture,
              lastMessage: remoteTime >= localTime ? lastMsg : existing.lastMessage,
              lastMessageAt: remoteTime >= localTime ? lastTime : existing.lastMessageAt,
              unread: finalUnread,
              lastReadAt: lastReadAt || existing.lastReadAt,
            });
          } else if (lastMsg.trim().length > 0) {
            const finalUnread = isRemoteAfterRead ? Boolean(c.unread) : false;
            mergedMap.set(key, {
              userId: peerId,
              name,
              picture,
              lastMessage: lastMsg,
              lastMessageAt: lastTime,
              unread: finalUnread,
              lastReadAt: lastReadAt || undefined,
            });
          }
        }
      }
    } catch {
      // Fall through to local cache and thread reconciliation
    }
  }

  // 2. CRITICAL: Reconcile with local threads in AsyncStorage
  // Any thread with messages (even if not yet in backend /api/messages list) is reflected with true latest message
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const threadKeys = allKeys.filter((k) => k.startsWith(STORAGE_THREAD_PREFIX));
    for (const tk of threadKeys) {
      const threadUserId = tk.replace(STORAGE_THREAD_PREFIX, "");
      if (!threadUserId || threadUserId === "undefined" || threadUserId === "null") continue;
      const threadMsgs = await getLocalThread(threadUserId);
      if (threadMsgs.length > 0) {
        const lastMsg = threadMsgs[threadMsgs.length - 1];
        const key = threadUserId.toLowerCase();
        const existing = mergedMap.get(key);
        const threadTime = new Date(lastMsg.createdAt).getTime();

        const lastReadAt = await getLastReadAt(threadUserId);
        const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;
        const isMsgAfterRead = !lastReadTime || threadTime > lastReadTime;

        if (existing) {
          const convTime = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
          if (threadTime >= convTime || !existing.lastMessage) {
            existing.lastMessage = lastMsg.message;
            existing.lastMessageAt = lastMsg.createdAt;
            if (lastMsg.isMine) {
              existing.unread = false;
            } else if (!isMsgAfterRead) {
              existing.unread = false;
            } else {
              existing.unread = !lastMsg.read;
            }
            existing.lastReadAt = lastReadAt || existing.lastReadAt;
            mergedMap.set(key, existing);
          }
        } else {
          mergedMap.set(key, {
            userId: threadUserId,
            name: "Photographer",
            picture: null,
            lastMessage: lastMsg.message,
            lastMessageAt: lastMsg.createdAt,
            unread: !lastMsg.isMine && !lastMsg.read && isMsgAfterRead,
            lastReadAt: lastReadAt || undefined,
          });
        }
      }
    }
  } catch {
    // Non-blocking
  }

  const merged = Array.from(mergedMap.values())
    .filter((c) => Boolean(c.lastMessage && c.lastMessage.trim().length > 0))
    .sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));

  await setLocalConversations(merged);
  return merged;
}

export async function fetchMessagesWithUser(userId: string): Promise<ChatMessage[]> {
  if (!userId || userId === "undefined" || userId === "null") return [];

  let myUserId = "";
  try {
    const rawProf = await AsyncStorage.getItem("camartes-customer:profile:v1");
    if (rawProf) {
      const parsedProf = JSON.parse(rawProf);
      myUserId = String(parsedProf?.customerId || parsedProf?.id || "").trim();
    }
  } catch {}

  const allowRemote = true;
  let remoteMessages: ChatMessage[] = [];

  const lastReadAt = await getLastReadAt(userId);
  const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;

  if (allowRemote) {
    try {
      const data = await camartesFetch<any[]>(
        `/api/messages/${encodeURIComponent(userId)}`,
        {},
        { auth: true, requireAuth: false },
      );
      if (Array.isArray(data)) {
        remoteMessages = data.map((m: any) => {
          const rawSender = m.sender_id || m.senderId || m.sender;
          const rawRecipient = m.recipient_id || m.recipientId || m.recipient;

          // Determine isMine with 100% precision:
          let isMine = false;
          if (typeof m.is_mine === "boolean") {
            isMine = m.is_mine;
          } else if (typeof m.isMine === "boolean") {
            isMine = m.isMine;
          } else if (rawSender === "me" || (myUserId && String(rawSender).toLowerCase() === myUserId.toLowerCase())) {
            isMine = true;
          } else if (String(rawSender).toLowerCase() === String(userId).toLowerCase()) {
            isMine = false;
          } else if (String(rawRecipient).toLowerCase() === String(userId).toLowerCase()) {
            isMine = true;
          } else if (myUserId && String(rawRecipient).toLowerCase() === myUserId.toLowerCase()) {
            isMine = false;
          }

          const msgTime = new Date(m.created_at || m.createdAt || 0).getTime();
          const isRead = Boolean(m.read) || isMine || (lastReadTime > 0 && msgTime <= lastReadTime);

          return {
            id: m.id || Date.now(),
            senderId: isMine ? "me" : String(rawSender || userId),
            recipientId: isMine ? String(userId) : "me",
            message: String(m.message || m.text || ""),
            read: isRead,
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
      String(local.recipientId).toLowerCase() === String(userId).toLowerCase() ||
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

  // CRITICAL: Synchronize latest message into local conversations list so chat preview is always 100% current!
  if (sorted.length > 0) {
    const latestMsg = sorted[sorted.length - 1];
    try {
      const convs = await getLocalConversations();
      const existingIdx = convs.findIndex(
        (c) => c.userId === userId || String(c.userId).toLowerCase() === String(userId).toLowerCase()
      );
      const latestMsgTime = new Date(latestMsg.createdAt).getTime();
      const isLatestAfterRead = !lastReadTime || latestMsgTime > lastReadTime;

      if (existingIdx >= 0) {
        const existing = convs[existingIdx];
        const tNew = new Date(latestMsg.createdAt).getTime();
        const tOld = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
        if (tNew >= tOld || !existing.lastMessage) {
          existing.lastMessage = latestMsg.message;
          existing.lastMessageAt = latestMsg.createdAt;
          if (latestMsg.isMine) {
            existing.unread = false;
          } else if (!isLatestAfterRead) {
            existing.unread = false;
          } else {
            existing.unread = !latestMsg.read;
          }
          existing.lastReadAt = lastReadAt || existing.lastReadAt;
          convs[existingIdx] = existing;
          await setLocalConversations(convs);
          notifyMessageListeners();
        }
      } else {
        const newConv: Conversation = {
          userId,
          name: "Photographer",
          picture: null,
          lastMessage: latestMsg.message,
          lastMessageAt: latestMsg.createdAt,
          unread: !latestMsg.isMine && !latestMsg.read && isLatestAfterRead,
          lastReadAt: lastReadAt || undefined,
        };
        convs.unshift(newConv);
        await setLocalConversations(convs);
        notifyMessageListeners();
      }
    } catch {
      // Non-blocking
    }
  }

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

  let senderUid = "";
  try {
    const rawProf = await AsyncStorage.getItem("camartes-customer:profile:v1");
    if (rawProf) {
      const parsedProf = JSON.parse(rawProf);
      senderUid = parsedProf?.customerId || parsedProf?.id || "";
    }
  } catch {}

  let finalId = Date.now();
  let finalCreatedAt = new Date().toISOString();
  let finalStatus = "sent";

  try {
    const result = await camartesFetch<{ id?: number; status?: string; created_at?: string }>(
      "/api/messages",
      {
        method: "POST",
        body: JSON.stringify({
          recipient_id: recipientId,
          message: text,
          sender_id: senderUid || undefined,
        }),
      },
      { auth: true, requireAuth: false },
    );
    if (result) {
      finalId = result.id || finalId;
      finalCreatedAt = result.created_at || finalCreatedAt;
      finalStatus = result.status || "sent";
    }
  } catch (err) {
    console.error("[Chat] Error delivering message to Camartes:", err);
    throw err;
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
  const existingIndex = conversations.findIndex(
    (c) => c.userId === recipientId || String(c.userId).toLowerCase() === String(recipientId).toLowerCase()
  );
  const nowTs = new Date().toISOString();
  await setLastReadAt(recipientId, nowTs);

  const updatedConv: Conversation = {
    userId: recipientId,
    name: recipientMeta?.name || (existingIndex >= 0 ? conversations[existingIndex].name : "Photographer"),
    picture: recipientMeta?.picture !== undefined ? recipientMeta.picture : (existingIndex >= 0 ? conversations[existingIndex].picture : null),
    lastMessage: text,
    lastMessageAt: finalCreatedAt,
    unread: false,
    lastReadAt: nowTs,
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
  if (!userId || userId === "undefined" || userId === "null") return;
  const now = new Date().toISOString();
  await setLastReadAt(userId, now);

  // 1. Mark all messages in local thread as read
  try {
    const thread = await getLocalThread(userId);
    let threadChanged = false;
    thread.forEach((m) => {
      if (!m.read) {
        m.read = true;
        threadChanged = true;
      }
    });
    if (threadChanged) {
      await setLocalThread(userId, thread);
    }
  } catch {
    // Non-blocking
  }

  // 2. Mark conversation record unread = false
  const conversations = await getLocalConversations();
  let changed = false;
  conversations.forEach((c) => {
    if (
      c.userId === userId ||
      String(c.userId).toLowerCase() === String(userId).toLowerCase()
    ) {
      if (c.unread) {
        c.unread = false;
        changed = true;
      }
      c.lastReadAt = now;
    }
  });
  if (changed || true) {
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
