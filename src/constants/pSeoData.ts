/**
 * Content for /cinematography/{service}/{city}. Photographer city and
 * service pages live in src/seo/seoContent.ts.
 */

export interface PSeoHubConfig {
  slug: string;
  serviceKey: string;
  serviceName: string;
  cityKey: string;
  cityName: string;
  metaTitle: string;
  metaDescription: string;
  h1Title: string;
  subtitle: string;
  priceRange: { min: string; max: string; avg: string };
  heroImage: string;
  neighborhoods: string[];
  serviceHighlights: string[];
  pricingTiers: Array<{
    name: string;
    price: string;
    description: string;
    includes: string[];
  }>;
  faqs: Array<{ q: string; a: string }>;
  localAdvice: string;
}

export const PSEO_HUBS: Record<string, PSeoHubConfig> = {
  "drone-hyderabad": {
    slug: "drone/hyderabad",
    serviceKey: "drone",
    serviceName: "Drone Cinematographers",
    cityKey: "hyderabad",
    cityName: "Hyderabad",
    metaTitle: "Professional Drone Photography & 4K Videography in Hyderabad — Book A Shoot",
    metaDescription: "Hire licensed, certified drone pilots for Indian weddings, corporate campuses & outdoor festivals in Hyderabad. 4K aerial cinematography with full safety compliance.",
    h1Title: "Professional Drone Cinematography in Hyderabad",
    subtitle: "Capture the immense scale of your celebration with cinematic 4K aerial views of your wedding venue, baraat, and outdoor decor.",
    priceRange: { min: "18,000", max: "60,000", avg: "30,000" },
    heroImage: "/hero2.webp",
    neighborhoods: [
      "Gachibowli Financial District",
      "Shamshabad Resort Belt",
      "Jubilee Hills",
      "Banjara Hills",
      "Kompally",
      "Gandipet & Shankarpalli",
    ],
    serviceHighlights: [
      "DGCA-compliant certified commercial drone pilots",
      "Crisp 4K/60fps and 10-bit D-Log color grading",
      "Spectacular aerial tracking of Baraat processions",
      "Full venue establishing shots and mandap landscape vistas",
      "Dual battery redundancy and safety gear",
    ],
    pricingTiers: [
      {
        name: "Baraat & Venue Aerial Session",
        price: "₹18,000 - ₹28,000",
        description: "Up to 4 hours covering guest arrival and grand entrance.",
        includes: ["1 Certified Pilot", "Raw 4K Aerial Footage", "Edited 60s Reel Video", "Safety & Pre-Flight Checks"],
      },
      {
        name: "Full-Day Drone Cinematography",
        price: "₹35,000 - ₹60,000",
        description: "Full event coverage from morning rituals to evening reception.",
        includes: ["Dedicated Aerial Cinematographer", "Multi-Battery Station", "Live HDMI Video Feed to LED Screens", "Color Graded Master Clips"],
      },
    ],
    faqs: [
      {
        q: "Is drone photography safe over large wedding crowds?",
        a: "Yes. Our drone pilots maintain safe standoff distances, use propeller guards where necessary, and conduct pre-flight wind and obstacle surveys to ensure 100% safety.",
      },
      {
        q: "Can the drone feed be displayed live on the venue LED wall?",
        a: "Yes, our cinema drones support zero-latency HDMI/SDI output feeds directly into your venue LED wall processor.",
      },
    ],
    localAdvice: "Always verify with your venue management in Shamshabad or Jubilee Hills if they require advance notification for aerial flights.",
  },
};
