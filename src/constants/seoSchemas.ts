/**
 * Structured Data (Schema.org JSON-LD) Graph Definitions for Book A Shoot.
 * Production-ready for Google Search Rich Results & AI Crawlers (GEO).
 */

export const BASE_URL = "https://www.bookashoot.online";

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Book A Shoot",
  legalName: "Camartes Technologies Private Limited",
  alternateName: ["BookAShoot", "Book-A-Shoot", "Camartes", "bookashoot.online"],
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/book-a-shoot-wordmark.png`,
    width: 600,
    height: 160,
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+91-9494747732",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Telugu", "Hindi"],
    },
  ],
  sameAs: [
    "https://www.instagram.com/bookashootonline",
    "https://www.facebook.com/bookashootonline",
    "https://www.linkedin.com/company/camartes",
    "https://www.instagram.com/camartes_official",
  ],
};

export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  url: BASE_URL,
  name: "Book A Shoot",
  alternateName: ["BookAShoot", "Book-A-Shoot", "bookashoot.online"],
  description:
    "India's trusted marketplace to hire KYC-verified event photographers, cinematographers, drone operators, and wedding content creators.",
  publisher: {
    "@id": `${BASE_URL}/#organization`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/services?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const HOMEPAGE_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Book A Shoot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Book A Shoot by Camartes is India's first marketplace for hiring 100% KYC-verified event photographers and cinematographers with guaranteed milestone escrow protection and 1-hour auto-backfill support.",
      },
    },
    {
      "@type": "Question",
      name: "How does Book A Shoot guarantee verified photographers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every studio and freelance photographer on Book A Shoot is verified with government photo ID, business registration, physical studio verification, and authentic portfolio audits before receiving booking requests.",
      },
    },
    {
      "@type": "Question",
      name: "What is the 1-hour backfill guarantee?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If an emergency arises with any assigned photographer, Book A Shoot's automated dispatch engine assigns a verified replacement studio in your city within 60 active business minutes.",
      },
    },
    {
      "@type": "Question",
      name: "How does milestone escrow payment work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your advance payment is held securely in an escrow account. Funds are released to the photography firm only when milestones—shoot wrap, raw photos proofing, edited gallery, and album delivery—are completed to your satisfaction.",
      },
    },
    {
      "@type": "Question",
      name: "Which cities does Book A Shoot operate in?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Book A Shoot provides verified photography and cinematography services across Hyderabad, Bengaluru, Visakhapatnam, Vijayawada, and destination wedding locations pan-India.",
      },
    },
  ],
};

export const SERVICES_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Event Photography and Cinematography Marketplace",
  provider: {
    "@id": `${BASE_URL}/#organization`,
  },
  areaServed: [
    { "@type": "City", name: "Hyderabad" },
    { "@type": "City", name: "Bengaluru" },
    { "@type": "City", name: "Vijayawada" },
    { "@type": "City", name: "Visakhapatnam" },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Photography & Event Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Wedding & Candid Photography",
          description: "Full-day candid and traditional wedding ceremony photo coverage.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Cinematic Wedding Films & Videography",
          description: "4K cinematic wedding highlight films, audio recording, and full ceremony capture.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Wedding Content Creators & Instagram Reels",
          description: "Fast-turnaround vertical short videos, behind-the-scenes, and same-day social media edits.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Aerial Drone Photography & 4K Videography",
          description: "Certified drone cinematography capturing outdoor celebrations and grand venues.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Pre-Wedding & Post-Wedding Shoots",
          description: "Curated couple portraits and creative outdoor concepts.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Maternity & Baby Milestone Photography",
          description: "Gentle portrait sessions celebrating family beginnings.",
        },
      },
    ],
  },
};

export function createBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

export function createLocalBusinessSchema({
  city,
  serviceName,
  path,
  minPrice,
  maxPrice,
  neighborhoods,
}: {
  city: string;
  serviceName: string;
  path: string;
  minPrice: string;
  maxPrice: string;
  neighborhoods: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `${serviceName} in ${city} — Book A Shoot`,
    image: `${BASE_URL}/blog1.webp`,
    url: `${BASE_URL}${path}`,
    telephone: "+91-9494747732",
    priceRange: `₹${minPrice} - ₹${maxPrice}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressRegion: city === "Bengaluru" ? "Karnataka" : "Telangana & Andhra Pradesh",
      addressCountry: "IN",
    },
    areaServed: neighborhoods.map((n) => ({
      "@type": "AdministrativeArea",
      name: `${n}, ${city}`,
    })),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "148",
      bestRating: "5",
      worstRating: "1",
    },
  };
}
