/**
 * CamReels: Book A Shoot's reels segment. Instagram Reels and Shorts shot on a
 * real camera (DSLR / mirrorless + gimbal) by a professional videographer.
 * One source of truth for copy, options and prices used by the website, the
 * in-app booking flow and the request sent to videographers. Prices mirror
 * the Camartes backend (backend/camreels.py), which re-computes them on every
 * request; GET /api/camreels/pricing serves the live table.
 *
 * Pricing (fixed, no tiers):
 *   Edited: ₹4,000 a reel, or 3 for ₹10,000
 *   Raw:    ₹3,000 a reel, or 3 for ₹7,000
 *   CamReels Monthly: ₹50,000, unlimited edited reels for 30 days
 *
 * Naming rule: always "CamReels" (one word, capital C and R) and
 * "professional videographer". Never "photographer" for this service.
 */
import { Linking } from "react-native";

export const CAMREELS = "CamReels";

/* ─────────────────────────────── Routes ────────────────────────────────── */

export const REELS_PATH = "/camreels" as const;
export const REELS_BOOKING_PATH = "/booking/camreels" as const;

/* ─────────────────────────────── Marketing ─────────────────────────────── */

export const REELS_COPY = {
  eyebrow: "Introducing CamReels",
  headlineLead: "Reels shot on camera.",
  headlineAccent: "Not on phones.",
  sub: "Book a handpicked, verified videographer with a DSLR and gimbal for your Instagram Reels and Shorts.",
  cta: "Book CamReels",
} as const;

/* ─────────────────────────────── Booking ───────────────────────────────── */

/** Event type id used on the CamReels booking's single day. */
export const REELS_EVENT_TYPE_ID = "camreels_shoot";
/** Heading videographers see on Camartes for every CamReels request. */
export const REELS_EVENT_LABEL = "CamReels Shoot";
/** Marks the request as CamReels for the Camartes backend. */
export const REELS_SEGMENT = "camreels";

export const REELS_CONTENT_TYPES = [
  { id: "instagram_reels", label: "Instagram Reels" },
  { id: "personal_branding", label: "Personal Branding" },
  { id: "fashion_lifestyle", label: "Fashion & Lifestyle" },
  { id: "business_promo", label: "Business Promotion" },
  { id: "food_restaurant", label: "Food & Restaurant" },
  { id: "fitness", label: "Fitness & Workout" },
  { id: "youtube_shorts", label: "YouTube Shorts" },
  { id: "other", label: "Other Social Content" },
] as const;

export const REELS_SETTINGS = [
  { id: "home", label: "Home" },
  { id: "outdoor", label: "Outdoor" },
  { id: "studio", label: "Studio" },
  { id: "office", label: "Office / Business" },
  { id: "other", label: "Other location" },
] as const;

export const REELS_DURATIONS = [1, 2, 3, 4] as const;
export const REELS_MIN_COUNT = 1;
export const REELS_MAX_COUNT = 10;

export type ReelsEditing = "edited" | "raw";
export type ReelsPlanId = "reels" | "monthly";

/** Fixed prices (INR): per reel, and per pack of 3. */
export type ReelsPrices = Record<ReelsEditing, { single: number; pack3: number }>;
export const REELS_PRICES: ReelsPrices = {
  edited: { single: 4000, pack3: 10000 },
  raw: { single: 3000, pack3: 7000 },
};

/** CamReels Monthly: flat price, unlimited edited reels for 30 days, same videographer. */
export const REELS_MONTHLY = {
  name: "CamReels Monthly",
  price: 50000,
  days: 30,
  summary: "Unlimited edited reels for 30 days with the same videographer.",
  includes: [
    "Unlimited edited reels for 30 days",
    "The same videographer all month",
    "Shoot days planned around your calendar",
  ],
} as const;

export const REELS_EDITING_OPTIONS: Array<{ id: ReelsEditing; title: string; body: string }> = [
  { id: "edited", title: "Edited", body: "Cut, colour-graded and synced to music. Ready to post." },
  { id: "raw", title: "Raw footage", body: "Unedited camera clips, for creators who edit their own." },
];

export function normalizeReelsPlan(plan: string | undefined | null): ReelsPlanId {
  return plan === "monthly" ? "monthly" : "reels";
}

/** Total for `count` reels: packs of 3 plus single reels (4 edited = ₹14,000). */
export function reelsPrice(count: number, editing: ReelsEditing, prices: ReelsPrices = REELS_PRICES): number {
  const n = Math.max(REELS_MIN_COUNT, Math.min(REELS_MAX_COUNT, Math.round(count) || REELS_MIN_COUNT));
  const p = prices[editing];
  return Math.floor(n / 3) * p.pack3 + (n % 3) * p.single;
}

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** "₹4,000 a reel · 3 for ₹10,000" */
export function reelsPriceLine(editing: ReelsEditing, prices: ReelsPrices = REELS_PRICES): string {
  return `${inr(prices[editing].single)} a reel · 3 for ${inr(prices[editing].pack3)}`;
}

export function reelsContentLabel(id: string): string {
  return REELS_CONTENT_TYPES.find((c) => c.id === id)?.label ?? "Social Content";
}

export function reelsSettingLabel(id: string): string {
  return REELS_SETTINGS.find((s) => s.id === id)?.label ?? "Location";
}

/* ─────────────────────────────── Fallback ──────────────────────────────── */

const REELS_WHATSAPP_URL = `https://wa.me/919603215551?text=${encodeURIComponent(
  "Hi Book A Shoot team! I'd like to book CamReels.",
)}`;

/** WhatsApp the team (fallback when a request can't be sent). */
export function contactReelsTeam(): void {
  Linking.openURL(REELS_WHATSAPP_URL).catch(() => undefined);
}

/* ─────────────────────────────── Page copy ─────────────────────────────── */

export const REELS_PILLARS = [
  { title: "Real camera. Every time.", body: "DSLR or mirrorless with a gimbal. Never a phone. Reels that look like they cost more than they did." },
  { title: "Handpicked videographers", body: "Every videographer is KYC-verified and checked by our team before they see a request." },
  { title: "Fixed, fair pricing", body: "Clear prices shown before you send. No haggling, no surprise quotes." },
  { title: "One request, real choice", body: "Your brief goes to up to six suitable videographers. You see who accepts and pick one." },
];

export const REELS_COMPARISON = [
  { label: "Camera", phone: "Usually a smartphone", cam: "DSLR or mirrorless + gimbal, always" },
  { label: "Who shoots", phone: "Whoever is free", cam: "Handpicked, KYC-verified videographers" },
  { label: "Your choice", phone: "One person is assigned", cam: "Up to 6 respond. You choose" },
  { label: "Pricing", phone: "Varies by chat", cam: "Fixed prices, shown before you send" },
  { label: "Every month", phone: "A new face each time", cam: "Unlimited reels, one videographer, 30 days" },
];

export const REELS_WAYS = [
  { title: "One reel", body: "For a launch, an offer or a moment worth posting." },
  { title: "Three reels", body: "A week of content from one shoot. Better value per reel." },
  { title: "CamReels Monthly", body: "Unlimited reels for 30 days with the same videographer." },
];

export const REELS_AUDIENCES = [
  { title: "Creators & influencers", body: "Consistent, camera-quality Reels and Shorts." },
  { title: "Personal brands & coaches", body: "Talking-head videos that build trust." },
  { title: "Cafés & restaurants", body: "Food and ambience reels that fill tables." },
  { title: "Fashion & lifestyle", body: "Outfit and styling reels with smooth movement." },
  { title: "Fitness & wellness", body: "Workouts, classes and transformations." },
  { title: "Local businesses", body: "Shop, product and service promos." },
];

export const REELS_STEPS = [
  { title: "Brief it once", body: "What the reels are for, edited or raw, where and when." },
  { title: "See your price", body: "Fixed prices for reels or CamReels Monthly, before you send." },
  { title: "Videographers respond", body: "Up to six suitable CamReels videographers get your brief." },
  { title: "Shoot and post", body: "Confirm the one you like, shoot, and get your reels." },
];

export const REELS_FAQS = [
  {
    q: "What is CamReels?",
    a: "CamReels is Book A Shoot's reels service: Instagram Reels and Shorts shot on a real camera with a gimbal by a handpicked, verified professional videographer. Never on a phone.",
  },
  {
    q: "How much does CamReels cost?",
    a: "Prices are fixed and shown in the Book A Shoot app before you send a request. Log in and start a CamReels booking to see them.",
  },
  {
    q: "What is the difference between edited and raw?",
    a: "Edited reels are ready to post: cut, colour-graded and synced to music. Raw footage is the unedited camera clips, for creators who edit themselves, at a lower price.",
  },
  {
    q: "Can I book the same videographer every month?",
    a: "Yes. CamReels Monthly gives you unlimited reels for 30 days with the same videographer. You plan shoot days together.",
  },
  {
    q: "Who are the videographers?",
    a: "Freelance videographers and video studios on Camartes who have joined CamReels. Every one is KYC-verified and checked by our team.",
  },
  {
    q: "What if a videographer doesn't respond?",
    a: "Your request goes to up to six videographers. If one doesn't respond within the response window, another is contacted in their place.",
  },
];
