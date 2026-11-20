/**
 * Sends user feedback to the team (info@bookashoot.online) through our server function
 * (api/feedback/submit.js), which holds the email key. The app itself never holds an email key:
 * anything bundled into the app can be extracted and abused to send mail as us.
 */
import { Platform } from "react-native";

export interface FeedbackPayload {
  name: string;
  email: string;
  phone?: string;
  category: string;
  message: string;
}

// Web runs on our own domain (relative path); the native app calls the same function by its full URL
const FEEDBACK_URL =
  Platform.OS === "web" ? "/api/feedback/submit" : "https://www.bookashoot.online/api/feedback/submit";

export async function submitUserFeedback(payload: FeedbackPayload): Promise<{ success: boolean; message?: string }> {
  const cleanMessage = String(payload.message || "").trim();
  if (!cleanMessage) {
    throw new Error("Please enter your feedback message.");
  }

  const resp = await fetch(FEEDBACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: String(payload.name || "Book A Shoot User").trim(),
      email: String(payload.email || "anonymous@bookashoot.online").trim(),
      phone: String(payload.phone || "").replace("+91", "").replace(/\s+/g, "").trim(),
      category: String(payload.category || "General Feedback").trim(),
      message: cleanMessage,
    }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || "Could not send your feedback. Please try again.");
  }
  return { success: true, message: "Feedback sent successfully" };
}
