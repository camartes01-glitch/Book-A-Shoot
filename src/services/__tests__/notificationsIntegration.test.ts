import { getNotifications, markAllRead, markNotificationRead, unreadCount, addNotification } from "@/src/services/notificationsStore";
import * as camartesClient from "@/src/services/camartesClient";
import * as authMode from "@/src/config/authMode";
import { fetchConversations, fetchMessagesWithUser, sendMessage } from "@/src/services/messagesApi";

jest.mock("@react-native-async-storage/async-storage", () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
  };
});

describe("Notifications & Messaging Backend Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches notifications from backend when signed in with real token", async () => {
    jest.spyOn(camartesClient, "getAuthToken").mockResolvedValue("test-token-123");
    jest.spyOn(authMode, "isDemoAuthMode").mockReturnValue(false);

    const mockBackendData = [
      {
        id: 42,
        type: "booking",
        title: "Booking Accepted",
        message: "Vendor has accepted your booking request.",
        data: { booking_id: "bk-12345" },
        read: false,
        created_at: "2026-09-09T12:00:00Z",
      },
    ];

    jest.spyOn(camartesClient, "camartesFetch").mockResolvedValueOnce(mockBackendData);

    const list = await getNotifications();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      id: "42",
      title: "Booking Accepted",
      body: "Vendor has accepted your booking request.",
      createdAt: "2026-09-09T12:00:00Z",
      read: false,
      bookingId: "bk-12345",
    });
  });

  it("marks all notifications as read via backend PUT /api/notifications/read", async () => {
    jest.spyOn(camartesClient, "getAuthToken").mockResolvedValue("test-token-123");
    jest.spyOn(authMode, "isDemoAuthMode").mockReturnValue(false);

    const fetchSpy = jest.spyOn(camartesClient, "camartesFetch").mockResolvedValue({ status: "success" });

    await markAllRead();
    expect(fetchSpy).toHaveBeenCalledWith("/api/notifications/read", { method: "PUT" }, { requireAuth: true });
  });

  it("retrieves unread count from backend GET /api/notifications/unread-count", async () => {
    jest.spyOn(camartesClient, "getAuthToken").mockResolvedValue("test-token-123");
    jest.spyOn(authMode, "isDemoAuthMode").mockReturnValue(false);

    jest.spyOn(camartesClient, "camartesFetch").mockResolvedValueOnce({ unread_count: 5 });

    const count = await unreadCount();
    expect(count).toBe(5);
  });

  it("marks single notification as read via backend PUT /api/notifications/{id}/read", async () => {
    jest.spyOn(camartesClient, "getAuthToken").mockResolvedValue("test-token-123");
    jest.spyOn(authMode, "isDemoAuthMode").mockReturnValue(false);

    const fetchSpy = jest.spyOn(camartesClient, "camartesFetch").mockResolvedValue({ status: "success" });

    await markNotificationRead("42");
    expect(fetchSpy).toHaveBeenCalledWith("/api/notifications/42/read", { method: "PUT" }, { requireAuth: true });
  });

  it("fetches conversations and messages from backend", async () => {
    jest.spyOn(camartesClient, "getAuthToken").mockResolvedValue("test-token-123");
    jest.spyOn(authMode, "isDemoAuthMode").mockReturnValue(false);

    jest.spyOn(camartesClient, "camartesFetch").mockResolvedValueOnce([
      {
        user_id: "vendor-1",
        name: "Studio Alpha",
        picture: null,
        last_message: "See you at the event!",
        last_message_at: "2026-09-09T13:00:00Z",
        unread: false,
      },
    ]);

    const convs = await fetchConversations();
    expect(convs).toHaveLength(1);
    expect(convs[0].name).toBe("Studio Alpha");
    expect(convs[0].userId).toBe("vendor-1");

    jest.spyOn(camartesClient, "camartesFetch").mockResolvedValueOnce([
      {
        id: 1,
        sender_id: "client-1",
        recipient_id: "vendor-1",
        message: "Hello!",
        read: true,
        created_at: "2026-09-09T12:30:00Z",
        is_mine: true,
      },
    ]);

    const msgs = await fetchMessagesWithUser("vendor-1");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].message).toBe("Hello!");
    expect(msgs[0].isMine).toBe(true);
  });

  it("sends message to backend POST /api/messages", async () => {
    jest.spyOn(camartesClient, "getAuthToken").mockResolvedValue("test-token-123");
    jest.spyOn(authMode, "isDemoAuthMode").mockReturnValue(false);

    const fetchSpy = jest.spyOn(camartesClient, "camartesFetch").mockResolvedValueOnce({
      id: 99,
      status: "sent",
      created_at: "2026-09-09T13:05:00Z",
    });

    const sent = await sendMessage("vendor-1", "Looking forward to working together");
    expect(sent).toEqual({
      id: 99,
      status: "sent",
      createdAt: "2026-09-09T13:05:00Z",
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/messages",
      {
        method: "POST",
        body: JSON.stringify({
          recipient_id: "vendor-1",
          message: "Looking forward to working together",
        }),
      },
      { requireAuth: true },
    );
  });
});
