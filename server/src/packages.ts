export interface PackageSeed {
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  duration_min: number;
  emoji: string;
}

export const PACKAGE_SEEDS: PackageSeed[] = [
  {
    slug: "portrait",
    name: "Portrait Session",
    description:
      "A relaxed studio or outdoor portrait session, perfect for headshots, personal branding, or a fresh profile photo.",
    price_cents: 18000,
    duration_min: 60,
    emoji: "🧑‍🎤",
  },
  {
    slug: "wedding",
    name: "Wedding Day",
    description:
      "Full-day coverage of your big day — from getting ready to the last dance — with a second shooter and edited gallery.",
    price_cents: 240000,
    duration_min: 600,
    emoji: "💍",
  },
  {
    slug: "event",
    name: "Event Coverage",
    description:
      "Corporate events, birthdays, or launches captured with candid and posed shots delivered within 72 hours.",
    price_cents: 95000,
    duration_min: 180,
    emoji: "🎉",
  },
  {
    slug: "product",
    name: "Product & Brand",
    description:
      "Clean, e-commerce-ready product photography with styling and consistent lighting for your online store.",
    price_cents: 60000,
    duration_min: 120,
    emoji: "📦",
  },
];
