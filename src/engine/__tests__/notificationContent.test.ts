import { buildNotificationContent, isPaymentRelated } from "@/src/domain/notificationContent";

describe("Notification copy accuracy", () => {
  test("request_sent names the exact event and firm count", () => {
    const { title, body } = buildNotificationContent("request_sent", {
      eventName: "Wedding",
      firmCount: 4,
      firmNames: ["Studio A", "Studio B", "Studio C", "Studio D"],
    });
    expect(title).toMatch(/Request sent/i);
    expect(body).toContain("Wedding");
    expect(body).toContain("4 photography firms");
    expect(body.toLowerCase()).toContain("portfolio");
  });

  test("request_sent names the single firm when only one was assigned", () => {
    const { body } = buildNotificationContent("request_sent", {
      eventName: "Baby Shoot",
      firmCount: 1,
      firmNames: ["Studio Only"],
    });
    expect(body).toContain("Studio Only");
  });

  test("vendor_accepted mentions the firm, event and date, and invites contact/social", () => {
    const { title, body } = buildNotificationContent("vendor_accepted", {
      firmName: "Studio Lumen",
      eventName: "Wedding",
      eventDate: "22 Sep 2026",
    });
    expect(title).toContain("Studio Lumen");
    expect(title.toLowerCase()).toContain("accepted");
    expect(body).toContain("Studio Lumen");
    expect(body).toContain("Wedding");
    expect(body).toContain("22 Sep 2026");
    expect(body.toLowerCase()).toContain("contact");
    expect(body.toLowerCase()).toContain("social");
  });

  test("vendor_rejected names the firm and date when known", () => {
    const { title, body } = buildNotificationContent("vendor_rejected", {
      firmName: "Studio Lumen",
      eventName: "Wedding",
      eventDate: "22 Sep 2026",
    });
    expect(title).toContain("Studio Lumen");
    expect(body).toContain("Studio Lumen");
    expect(body).toContain("22 Sep 2026");
    expect(body.toLowerCase()).toContain("search new and better firms");
  });

  test("vendor_rejected falls back to booking-level copy without a firm name", () => {
    const { body } = buildNotificationContent("vendor_rejected", { eventName: "Wedding", eventDate: "22 Sep 2026" });
    expect(body.toLowerCase()).not.toContain("undefined");
    expect(body).toContain("Wedding");
  });

  test("new_search_dispatched lists the newly searched firm names", () => {
    const { body } = buildNotificationContent("new_search_dispatched", {
      customerName: "Ranjit Kumar",
      firmNames: ["Studio X", "Studio Y"],
    });
    expect(body).toContain("Studio X and Studio Y");
  });

  test("event_reminder includes customer, event, date and firm", () => {
    const { body } = buildNotificationContent("event_reminder", {
      customerName: "Ranjit Kumar",
      firmName: "Studio Lumen",
      eventName: "Wedding",
      eventDate: "23 Sep 2026",
    });
    expect(body).toContain("Ranjit");
    expect(body).toContain("Wedding");
    expect(body).toContain("23 Sep 2026");
    expect(body).toContain("Studio Lumen");
  });

  test("draft_resume_nudge references the event and encourages resuming", () => {
    const { body } = buildNotificationContent("draft_resume_nudge", {
      customerName: "Ranjit Kumar",
      eventName: "Wedding",
    });
    expect(body).toContain("Wedding");
    expect(body.toLowerCase()).toContain("finish your booking");
  });

  test("welcome and marketing_nudge copy never contains a payment reference", () => {
    for (let i = 0; i < 10; i += 1) {
      const welcome = buildNotificationContent("welcome", { customerName: "Ranjit" }, `seed-${i}`);
      const nudge = buildNotificationContent("marketing_nudge", { customerName: "Ranjit" }, `seed-${i}`);
      expect(isPaymentRelated({ title: welcome.title, body: welcome.body })).toBe(false);
      expect(isPaymentRelated({ title: nudge.title, body: nudge.body })).toBe(false);
    }
  });

  test("isPaymentRelated flags payment-shaped content", () => {
    expect(isPaymentRelated({ title: "Payment received", body: "Your payment was successful." })).toBe(true);
    expect(isPaymentRelated({ type: "payment", title: "Update", body: "..." })).toBe(true);
    expect(isPaymentRelated({ body: "Please complete your Razorpay payment." })).toBe(true);
    expect(isPaymentRelated({ title: "Studio Lumen accepted your request", body: "Tap to view contact details." })).toBe(false);
  });
});
