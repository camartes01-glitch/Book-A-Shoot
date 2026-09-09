/**
 * Messages / chat integration with Camartes backend:
 * - GET /api/messages
 * - GET /api/messages/{user_id}
 * - POST /api/messages
 */
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

export async function fetchConversations(): Promise<Conversation[]> {
  const token = await getAuthToken();
  if (!token || isDemoAuthMode()) {
    return [];
  }
  try {
    const data = await camartesFetch<BackendConversation[]>("/api/messages", {}, { requireAuth: true });
    if (!Array.isArray(data)) return [];
    return data.map((c) => ({
      userId: c.user_id,
      name: c.name,
      picture: c.picture,
      lastMessage: c.last_message,
      lastMessageAt: c.last_message_at,
      unread: Boolean(c.unread),
    }));
  } catch {
    return [];
  }
}

export async function fetchMessagesWithUser(userId: string): Promise<ChatMessage[]> {
  const token = await getAuthToken();
  if (!token || isDemoAuthMode()) {
    return [];
  }
  try {
    const data = await camartesFetch<BackendMessage[]>(
      `/api/messages/${encodeURIComponent(userId)}`,
      {},
      { requireAuth: true },
    );
    if (!Array.isArray(data)) return [];
    return data.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      message: m.message,
      read: Boolean(m.read),
      createdAt: m.created_at,
      isMine: Boolean(m.is_mine),
    }));
  } catch {
    return [];
  }
}

export async function sendMessage(recipientId: string, message: string): Promise<{ id: number; status: string; createdAt: string } | null> {
  const token = await getAuthToken();
  if (!token || isDemoAuthMode()) {
    throw new Error("Sign in to send messages.");
  }
  const text = message.trim();
  if (!text) {
    throw new Error("Message cannot be empty.");
  }
  const result = await camartesFetch<{ id: number; status: string; created_at: string }>(
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
  return {
    id: result.id,
    status: result.status,
    createdAt: result.created_at,
  };
}
