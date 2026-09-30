/**
 * Programmatic SEO (pSEO) Dataset for High-Intent City x Service Hubs.
 * Designed for Swiggy/Zomato style hyper-local discovery.
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
  "wedding-hyderabad": {
    slug: "wedding/hyderabad",
    serviceKey: "wedding",
    serviceName: "Wedding Photographers",
    cityKey: "hyderabad",
    cityName: "Hyderabad",
    metaTitle: "Best Wedding Photographers in Hyderabad (2026) — Verified KYC & Escrow",
    metaDescription: "Hire top-rated, KYC-verified wedding photographers across Jubilee Hills, Gachibowli, Banjara Hills & Secunderabad. Real portfolios, milestone escrow & 1-hour backfill.",
    h1Title: "Top-Rated Wedding Photographers in Hyderabad",
    subtitle: "From grand royal Telugu ceremonies to intimate modern celebrations in Jubilee Hills and Gachibowli. Book verified studios with guaranteed milestone escrow protection.",
    priceRange: { min: "35,000", max: "2,50,000", avg: "75,000" },
    heroImage: "/blog1.webp",
    neighborhoods: [
      "Jubilee Hills",
      "Banjara Hills",
      "Gachibowli",
      "Madhapur",
      "Kondapur",
      "Hitec City",
      "Secunderabad",
      "Kukatpally",
    ],
    serviceHighlights: [
      "Traditional Muhurtham & Ceremony photo coverage",
      "Candid emotional storytelling & authentic family portraits",
      "Cinematic 4K wedding films with separate multi-track audio",
      "Same-day wedding Reels by dedicated content creators",
      "Drone cinematography for grand resorts & convention centres",
    ],
    pricingTiers: [
      {
        name: "Intimate Ceremony Package",
        price: "₹35,000 - ₹55,000",
        description: "Ideal for 1-day weddings or small indoor receptions.",
        includes: ["1 Traditional Photographer", "1 Candid Photographer", "Full High-Res Digital Gallery", "Online Proofing"],
      },
      {
        name: "Signature 2-Day Bundle",
        price: "₹85,000 - ₹1,40,000",
        description: "Covers Haldi/Mehendi + Main Wedding & Reception.",
        includes: ["2 Photographers + 1 Cinematographer", "4K Teaser (60s) + Highlight Film (5-7 min)", "30-Page Premium Album", "Drone Establishing Shots"],
      },
      {
        name: "Grand Multi-Day Experience",
        price: "₹1,80,000 - ₹2,75,000+",
        description: "Comprehensive 3-4 day coverage with maximum production value.",
        includes: ["Lead Crew of 4-6 Specialists", "Dedicated Wedding Content Creator (Reels)", "Live Streaming / Webcast", "Luxury Flush-Mount Albums"],
      },
    ],
    faqs: [
      {
        q: "How much does a wedding photographer cost in Hyderabad?",
        a: "In Hyderabad, single-day wedding photography typically ranges from ₹35,000 to ₹75,000, while multi-day packages covering Haldi, Sangeet, Muhurtham, and Reception range from ₹90,000 to ₹2,50,000 depending on crew size, drone permits, and albums.",
      },
      {
        q: "How does Book A Shoot guarantee photographer attendance?",
        a: "Every studio on Book A Shoot is 100% KYC-verified and bonded under contract. Your deposit remains in a secure milestone escrow account until shoot completion, backed by our 1-hour emergency studio backfill guarantee.",
      },
      {
        q: "Do Hyderabad wedding photographers travel to Secunderabad and outer resorts?",
        a: "Yes. All studios on Book A Shoot service Greater Hyderabad including Shamshabad resort belts, Gandipet lake venues, and Medchal convention centers without hidden local travel surcharges.",
      },
    ],
    localAdvice: "Auspicious muhurtham dates in Hyderabad (especially November–February and May–June) get booked 6 to 9 months in advance. Booking your core team under a single unified milestone contract ensures priority crew availability.",
  },

  "pre-wedding-hyderabad": {
    slug: "pre-wedding/hyderabad",
    serviceKey: "pre-wedding",
    serviceName: "Pre-Wedding Photographers",
    cityKey: "hyderabad",
    cityName: "Hyderabad",
    metaTitle: "Pre-Wedding Shoot Photographers in Hyderabad — Forts, Lakes & Studios",
    metaDescription: "Book cinematic pre-wedding photography and video shoots in Hyderabad. Locations from Golconda, Chowmahalla Palace, Qutb Shahi Tombs to secret resort spots.",
    h1Title: "Cinematic Pre-Wedding Shoots in Hyderabad",
    subtitle: "Ditch robotic poses. Create romantic, magazine-style stories against Hyderabad's historic heritage and modern urban architecture.",
    priceRange: { min: "20,000", max: "80,000", avg: "40,000" },
    heroImage: "/hero1.webp",
    neighborhoods: [
      "Golconda Fort Area",
      "Old City & Charminar",
      "Durgam Cheruvu & Cable Bridge",
      "Taramati Baradari",
      "Gandipet & Osman Sagar",
      "Moinabad Farmstays",
    ],
    serviceHighlights: [
      "Director-assisted posture, styling & natural motion guidance",
      "Sunrise & golden-hour lighting schedules",
      "Outfit changes & prop styling coordination",
      "Cinematic music teaser video (60s Reel ready)",
      "High-resolution color-graded photo delivery within 7 days",
    ],
    pricingTiers: [
      {
        name: "Half-Day Golden Hour",
        price: "₹20,000 - ₹35,000",
        description: "1 location, 4 hours of dedicated couple photography.",
        includes: ["1 Candid Photographer", "2 Outfit Changes", "25 Retouched Master Photos", "Digital Delivery in 5 Days"],
      },
      {
        name: "Full-Day Heritage & Sunset",
        price: "₹45,000 - ₹75,000",
        description: "2-3 locations, 8-10 hours with drone & teaser video.",
        includes: ["1 Photographer + 1 Cinematographer", "Drone Aerial Shots", "1-Minute Instagram Reel / Teaser", "50 Retouched Photos"],
      },
    ],
    faqs: [
      {
        q: "Which are the best pre-wedding shoot locations in Hyderabad?",
        a: "Popular locations include Chowmahalla Palace, Golconda outskirts, Taramati Baradari, Durgam Cheruvu Cable Bridge at dusk, and curated private photography sets in Moinabad.",
      },
      {
        q: "What should we wear for a pre-wedding shoot?",
        a: "We recommend 1 traditional ensemble (saree/kurta) for heritage backdrops and 1 modern western or pastel outfit for golden-hour sunset captures.",
      },
    ],
    localAdvice: "Plan your shoot on a weekday morning starting at 6:00 AM to avoid crowds at historic sites and catch the softest golden light.",
  },

  "maternity-bengaluru": {
    slug: "maternity/bengaluru",
    serviceKey: "maternity",
    serviceName: "Maternity Photographers",
    cityKey: "bengaluru",
    cityName: "Bengaluru",
    metaTitle: "Best Maternity Photographers in Bengaluru — Outdoor & Studio Sessions",
    metaDescription: "Celebrate motherhood with gentle, elegant maternity photoshoots in Bengaluru. Indiranagar, Koramangala, Whitefield & garden venues. KYC-audited gentle crews.",
    h1Title: "Gentle & Elegant Maternity Photography in Bengaluru",
    subtitle: "Comfortable, serene portrait sessions capturing the beauty of new beginnings in Bengaluru's leafy parks and boutique private studios.",
    priceRange: { min: "15,000", max: "50,000", avg: "28,000" },
    heroImage: "/blog2.webp",
    neighborhoods: [
      "Indiranagar",
      "Koramangala",
      "Whitefield",
      "HSR Layout",
      "Jayanagar",
      "Hebbal & Sahakara Nagar",
    ],
    serviceHighlights: [
      "Low-stress, mother-first pacing with ample rest intervals",
      "Home-comfort, outdoor garden, or clean studio environments",
      "Spouse and sibling inclusion at no additional fee",
      "Wardrobe guidance and flowing fabrics",
      "Soft, natural light retouching",
    ],
    pricingTiers: [
      {
        name: "Serene Studio Session",
        price: "₹15,000 - ₹25,000",
        description: "Private temperature-controlled studio, 2 hours.",
        includes: ["1 Specialist Maternity Photographer", "2 Wardrobe Changes", "20 Retouched Fine Art Portraits"],
      },
      {
        name: "Garden & Golden Hour",
        price: "₹30,000 - ₹50,000",
        description: "Outdoor resort or botanical garden session with husband & family.",
        includes: ["Lead Photographer", "Family Portraits Included", "35 Fine Art Deliverables", "Mini Accordion Keepsake Album"],
      },
    ],
    faqs: [
      {
        q: "When is the best time for a maternity photoshoot?",
        a: "The ideal window is between the 28th and 34th week (7th to 8th month) of pregnancy, when your baby bump is prominently curved and you still feel energetic and comfortable moving.",
      },
      {
        q: "Can my partner and first child join the session?",
        a: "Absolutely. All Book A Shoot maternity packages warmly include your partner and children to capture whole-family bonding.",
      },
    ],
    localAdvice: "Bengaluru mornings between 7:00 AM and 9:00 AM at Cubbon Park or private farm venues near Sarjapur provide serene, cool, filtered morning sunlight.",
  },

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
