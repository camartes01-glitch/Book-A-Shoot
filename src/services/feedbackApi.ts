/**
 * Service to dispatch user feedback cleanly to info@bookashoot.online
 */

const RESEND_API_KEY =
  process.env.EXPO_PUBLIC_RESEND_API_KEY ||
  process.env.RESEND_API_KEY ||
  "";

const TARGET_EMAIL = "info@bookashoot.online";

export interface FeedbackPayload {
  name: string;
  email: string;
  phone?: string;
  category: string;
  message: string;
}

export async function submitUserFeedback(payload: FeedbackPayload): Promise<{ success: boolean; message?: string }> {
  const cleanName = String(payload.name || "Book A Shoot User").trim();
  const cleanEmail = String(payload.email || "anonymous@bookashoot.online").trim();
  const cleanPhone = String(payload.phone || "").replace("+91", "").replace(/\s+/g, "").trim();
  const cleanCategory = String(payload.category || "General Feedback").trim();
  const cleanMessage = String(payload.message || "").trim();

  if (!cleanMessage) {
    throw new Error("Please enter your feedback message.");
  }

  // 1. Try serverless / local backend endpoint first
  const endpoints = [
    "/api/feedback/submit",
    "http://localhost:8001/api/feedback/submit",
  ];

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          category: cleanCategory,
          message: cleanMessage,
        }),
      });

      if (resp.ok) {
        const json = await resp.json().catch(() => ({}));
        if (json.success !== false) {
          return { success: true, message: "Feedback sent successfully" };
        }
      }
    } catch {
      // Continue to next or fallback
    }
  }

  // 2. Direct Resend Dispatch Fallback (for client-side Expo web / native app)
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #FFFDF9; border: 1px solid #FED7AA; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);">
      <div style="background: linear-gradient(135deg, #FF6B35 0%, #EA580C 100%); padding: 30px 24px; text-align: center; color: #FFFFFF;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">Book A Shoot</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; color: #FFEDD5;">User Feedback & Suggestion Dossier</p>
      </div>
      <div style="padding: 26px 22px;">
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 14px 0; font-size: 15px; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #FFF7ED; padding-bottom: 6px;">
            Feedback Metadata
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-size: 13.5px; color: #64748B; font-weight: 600; width: 140px;">Category</td>
              <td style="padding: 8px 0; font-size: 14.5px; color: #EA580C; font-weight: 700;">${cleanCategory}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 13.5px; color: #64748B; font-weight: 600;">User Name</td>
              <td style="padding: 8px 0; font-size: 14.5px; color: #0F172A; font-weight: 700;">${cleanName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 13.5px; color: #64748B; font-weight: 600;">User Email</td>
              <td style="padding: 8px 0; font-size: 14.5px; color: #0F172A;">
                <a href="mailto:${cleanEmail}" style="color: #EA580C; text-decoration: none; font-weight: 600;">${cleanEmail}</a>
              </td>
            </tr>
            ${cleanPhone ? `
            <tr>
              <td style="padding: 8px 0; font-size: 13.5px; color: #64748B; font-weight: 600;">Phone / WhatsApp</td>
              <td style="padding: 8px 0; font-size: 14.5px; color: #0F172A; font-weight: 600;">
                <a href="tel:+91${cleanPhone}" style="color: #0F172A; text-decoration: none;">+91 ${cleanPhone}</a>
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding: 8px 0; font-size: 13.5px; color: #64748B; font-weight: 600;">Submitted At</td>
              <td style="padding: 8px 0; font-size: 13.5px; color: #64748B;">${timestamp} IST</td>
            </tr>
          </table>
        </div>
        <div style="background: #FFF7ED; border-left: 4px solid #EA580C; border-radius: 8px; padding: 18px 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #9A3412; text-transform: uppercase; letter-spacing: 0.5px;">User Message</h3>
          <p style="margin: 0; font-size: 14.5px; line-height: 1.6; color: #1E293B; white-space: pre-wrap;">${cleanMessage}</p>
        </div>
      </div>
      <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 12px 20px; text-align: center; font-size: 12px; color: #94A3B8;">
        <p style="margin: 0;">Captured via Book A Shoot Profile Feedback Section</p>
      </div>
    </div>
  `;

  const recipients = [TARGET_EMAIL, "camartes01@gmail.com"];

  for (const r of recipients) {
    const payloadBody = {
      from: "Book A Shoot <hello@camartes.com>",
      to: [r],
      reply_to: cleanEmail,
      subject: `💬 [Feedback] ${cleanCategory} from ${cleanName}`,
      html: htmlBody,
    };

    let res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadBody),
    });

    if (!res.ok) {
      payloadBody.from = "Book A Shoot <onboarding@resend.dev>";
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadBody),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || "Failed to dispatch feedback email.");
    }
  }

  return { success: true };
}
